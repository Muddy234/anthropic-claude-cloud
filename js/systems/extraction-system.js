// === js/systems/extraction-system.js ===
// SURVIVAL EXTRACTION UPDATE: Core extraction mechanic

// ============================================================================
// EXTRACTION SYSTEM
// ============================================================================

const ExtractionSystem = {
    name: 'ExtractionSystem',
    priority: 75,  // After combat, before UI updates

    // State
    initialized: false,
    points: [],
    collapseQueue: [],
    floorStartTime: 0,
    allCollapsed: false,

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize extraction system for a floor
     * @param {number} floor - Floor number (optional - skips spawn if not provided)
     * @param {Array} rooms - Room array
     * @param {Object} spawnRoom - Player spawn room
     */
    init(floor, rooms, spawnRoom) {
        // If called without parameters (e.g., from SystemManager.initAll), just reset state
        if (floor === undefined || !rooms) {
            this.points = [];
            this.collapseQueue = [];
            this.initialized = false;
            this.allCollapsed = false;
            console.log('[ExtractionSystem] Reset (awaiting floor initialization)');
            return;
        }

        // Spawn extraction points
        this.points = ExtractionSpawner.spawnExtractionPoints(floor, rooms, spawnRoom);

        // Copy to session state
        sessionState.extractionPoints = this.points.map(p => p.serialize());

        // Setup timing
        this.floorStartTime = Date.now();
        this.allCollapsed = false;

        // Schedule collapses
        this.scheduleCollapses();

        this.initialized = true;
        console.log(`[ExtractionSystem] Initialized for floor ${floor} with ${this.points.length} extraction points`);
    },

    /**
     * Restore from saved session state
     */
    restore() {
        if (!sessionState.extractionPoints || sessionState.extractionPoints.length === 0) {
            return;
        }

        this.points = sessionState.extractionPoints.map(data =>
            restoreExtractionPoint(data)
        );

        this.floorStartTime = sessionState.floorStartTime || Date.now();
        this.collapseQueue = sessionState.collapseQueue || [];
        this.allCollapsed = this.points.every(p => p.status === 'collapsed');

        this.initialized = true;
        console.log(`[ExtractionSystem] Restored ${this.points.length} extraction points`);
    },

    /**
     * Schedule collapse events for all extraction points
     */
    scheduleCollapses() {
        const config = EXTRACTION_CONFIG || {
            floorDuration: 720000,
            collapseSchedule: [0.40, 0.65, 0.83, 0.92],
            warningDuration: 20000
        };

        const duration = config.floorDuration;
        const schedule = config.collapseSchedule;
        const warningDuration = config.warningDuration;

        this.collapseQueue = [];

        // Shuffle points for random collapse order
        const shuffled = [...this.points].sort(() => Math.random() - 0.5);

        shuffled.forEach((point, index) => {
            if (index < schedule.length) {
                const collapseTime = this.floorStartTime + (duration * schedule[index]);
                const warningTime = collapseTime - warningDuration;

                this.collapseQueue.push({
                    pointId: point.id,
                    warningTime,
                    collapseTime,
                    warningTriggered: false,
                    collapseTriggered: false
                });
            }
        });

        // Sort by collapse time
        this.collapseQueue.sort((a, b) => a.collapseTime - b.collapseTime);

        // Store in session
        sessionState.collapseQueue = this.collapseQueue;

        console.log(`[ExtractionSystem] Scheduled ${this.collapseQueue.length} collapses`);
    },

    // ========================================================================
    // UPDATE LOOP
    // ========================================================================

    /**
     * System update (called every frame)
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        if (!this.initialized || game.state !== 'playing') return;

        const now = Date.now();

        // Update floor time
        sessionState.floorTime = now - this.floorStartTime;

        // Process collapse queue
        this.collapseQueue.forEach(entry => {
            const point = this.points.find(p => p.id === entry.pointId);
            if (!point || point.status === 'collapsed') return;

            // Trigger warning
            if (!entry.warningTriggered && now >= entry.warningTime) {
                entry.warningTriggered = true;
                point.startWarning(entry.collapseTime);
                this._onWarningStart(point);
            }

            // Trigger collapse
            if (!entry.collapseTriggered && now >= entry.collapseTime) {
                entry.collapseTriggered = true;
                point.collapse();
                this._onCollapse(point);
            }
        });

        // Update point animations
        this.points.forEach(point => {
            point.updateAnimation(dt);

            // Auto-discover nearby points
            if (!point.discovered && game.player) {
                const playerX = game.player.gridX ?? game.player.x;
                const playerY = game.player.gridY ?? game.player.y;
                const dist = point.getDistanceToPlayer(playerX, playerY);
                if (dist < 10) {  // Discovery range
                    point.discover();
                }
            }
        });

        // Sync to session state
        sessionState.extractionPoints = this.points.map(p => p.serialize());
    },

    // ========================================================================
    // EVENT HANDLERS
    // ========================================================================

    /**
     * Called when a shaft starts warning
     * @param {Object} point
     * @private
     */
    _onWarningStart(point) {
        console.log(`[ExtractionSystem] Shaft ${point.id} is becoming unstable!`);

        // Add message to log
        if (typeof addMessage === 'function') {
            addMessage(`An extraction shaft is becoming unstable!`, 'warning');
        }

        // TODO: Play warning sound
        // TODO: Add screen effect
    },

    /**
     * Called when a shaft collapses
     * @param {Object} point
     * @private
     */
    _onCollapse(point) {
        console.log(`[ExtractionSystem] Shaft ${point.id} has collapsed!`);

        // Add message
        if (typeof addMessage === 'function') {
            addMessage(`An extraction shaft has collapsed!`, 'danger');
        }

        // TODO: Play collapse sound
        // TODO: Screen shake

        // Check if all collapsed
        const activePoints = this.points.filter(p => p.isActive());
        if (activePoints.length === 0 && !this.allCollapsed) {
            this.allCollapsed = true;
            this._onAllCollapsed();
        }
    },

    /**
     * Called when all shafts have collapsed
     * @private
     */
    _onAllCollapsed() {
        console.log('[ExtractionSystem] ALL EXTRACTION SHAFTS HAVE COLLAPSED!');

        if (typeof addMessage === 'function') {
            addMessage('All extraction shafts have collapsed! Find the path down!', 'critical');
        }

        // TODO: Dramatic effect
        // The player must now find the path down or die when shift occurs
    },

    // ========================================================================
    // PLAYER INTERACTIONS
    // ========================================================================

    /**
     * Try to extract at a point
     * @param {Object} point - Extraction point
     * @returns {boolean} Success
     */
    tryExtract(point) {
        if (!point || !point.isActive()) {
            console.log('[ExtractionSystem] Cannot extract - shaft inactive');
            return false;
        }

        if (!game.player) return false;

        // Use gridX/gridY for consistent coordinate system
        const playerX = game.player.gridX ?? game.player.x;
        const playerY = game.player.gridY ?? game.player.y;

        // Check range
        if (!point.isPlayerInRange(playerX, playerY)) {
            console.log(`[ExtractionSystem] Too far from extraction shaft. Player at (${playerX}, ${playerY}), shaft at (${point.x}, ${point.y})`);
            if (typeof addMessage === 'function') {
                addMessage('Move closer to the extraction shaft.', 'info');
            }
            return false;
        }

        // Set game state to extraction UI
        game.state = GAME_STATES ? GAME_STATES.EXTRACTION : 'extraction';
        game.activeExtractionPoint = point;

        // Open the extraction UI
        if (typeof ExtractionUI !== 'undefined') {
            ExtractionUI.open();
        }

        console.log('[ExtractionSystem] Opening extraction UI');
        return true;
    },

    /**
     * Confirm extraction (from UI)
     */
    confirmExtraction() {
        if (game.state !== 'extraction' && game.state !== GAME_STATES?.EXTRACTION) {
            return false;
        }

        // Call session manager
        const result = SessionManager.extractionSuccess();

        if (result.success) {
            // Clear extraction state
            game.activeExtractionPoint = null;

            // Properly return to village (this initializes VillageSystem and positions player correctly)
            if (typeof returnToVillage === 'function') {
                returnToVillage();
            } else {
                // Fallback: manually set up village
                game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
                if (typeof VillageSystem !== 'undefined') {
                    VillageSystem.init();
                }
            }

            console.log('[ExtractionSystem] Extraction successful!');
            return true;
        }

        return false;
    },

    /**
     * Cancel extraction (from UI)
     */
    cancelExtraction() {
        if (game.state === 'extraction' || game.state === GAME_STATES?.EXTRACTION) {
            game.state = GAME_STATES ? GAME_STATES.PLAYING : 'playing';
            game.activeExtractionPoint = null;
        }
    },

    /**
     * Get nearest active extraction point
     * @param {number} x
     * @param {number} y
     * @returns {Object} { point, distance }
     */
    getNearestActivePoint(x, y) {
        let nearest = null;
        let nearestDist = Infinity;

        this.points.forEach(point => {
            if (point.isActive()) {
                const dist = point.getDistanceToPlayer(x, y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = point;
                }
            }
        });

        return { point: nearest, distance: nearestDist };
    },

    /**
     * Get point player is standing on (if any)
     * @returns {Object|null}
     */
    getPointAtPlayer() {
        if (!game.player) return null;

        // Use gridX/gridY for consistent coordinate system
        const playerX = game.player.gridX ?? game.player.x;
        const playerY = game.player.gridY ?? game.player.y;

        return this.points.find(point =>
            point.isActive() &&
            point.isPlayerInRange(playerX, playerY)
        );
    },

    // ========================================================================
    // QUERIES
    // ========================================================================

    /**
     * Get all extraction points
     * @returns {Array}
     */
    getAllPoints() {
        return [...this.points];
    },

    /**
     * Get active extraction points
     * @returns {Array}
     */
    getActivePoints() {
        return this.points.filter(p => p.isActive());
    },

    /**
     * Get discovered points (for minimap)
     * @returns {Array}
     */
    getDiscoveredPoints() {
        return this.points.filter(p => p.discovered);
    },

    /**
     * Get status summary
     * @returns {Object}
     */
    getStatus() {
        const total = this.points.length;
        const active = this.points.filter(p => p.status === 'active').length;
        const warning = this.points.filter(p => p.status === 'warning').length;
        const collapsed = this.points.filter(p => p.status === 'collapsed').length;

        // Time until next collapse
        const now = Date.now();
        const nextCollapse = this.collapseQueue.find(
            entry => !entry.collapseTriggered
        );
        const timeToNextCollapse = nextCollapse ?
            Math.max(0, nextCollapse.collapseTime - now) : null;

        return {
            total,
            active,
            warning,
            collapsed,
            allCollapsed: this.allCollapsed,
            timeToNextCollapse,
            floorTime: sessionState.floorTime
        };
    },

    /**
     * Get floor time remaining (before final collapse)
     * @returns {number} Milliseconds
     */
    getFloorTimeRemaining() {
        const config = EXTRACTION_CONFIG || { floorDuration: 720000 };
        const elapsed = Date.now() - this.floorStartTime;
        return Math.max(0, config.floorDuration - elapsed);
    },

    // ========================================================================
    // CLEANUP
    // ========================================================================

    /**
     * Reset system
     */
    reset() {
        this.points = [];
        this.collapseQueue = [];
        this.floorStartTime = 0;
        this.allCollapsed = false;
        this.initialized = false;
    }
};

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Render extraction points in main game view
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} camX - Camera X offset
 * @param {number} camY - Camera Y offset
 * @param {number} tileSize - Tile size in pixels
 * @param {number} offsetX - UI offset (tracker width)
 */
function renderExtractionPoints(ctx, camX, camY, tileSize, offsetX) {
    const points = ExtractionSystem.points || [];
    if (points.length === 0) return;

    const time = Date.now();

    points.forEach(point => {
        // Skip collapsed points
        if (point.status === 'collapsed') return;

        const screenX = (point.x - camX) * tileSize + offsetX;
        const screenY = (point.y - camY) * tileSize;

        // Check if on screen
        if (screenX < -tileSize * 2 || screenX > ctx.canvas.width + tileSize * 2) return;
        if (screenY < -tileSize * 2 || screenY > ctx.canvas.height + tileSize * 2) return;

        // Check if tile is visible
        const tileX = Math.floor(point.x);
        const tileY = Math.floor(point.y);
        const tile = game?.map?.[tileY]?.[tileX];
        if (tile && !tile.visible && !tile.explored) return;

        // Determine colors and effects based on status
        let baseColor = '#00ffff';
        let glowColor = 'rgba(0, 255, 255, 0.6)';
        let pulseSpeed = 1500;
        let particleCount = 6;

        if (point.status === 'warning' || point.isWarning?.()) {
            baseColor = '#ffaa00';
            glowColor = 'rgba(255, 170, 0, 0.6)';
            pulseSpeed = 800;
            particleCount = 10;
        } else if (point.status === 'collapsing') {
            baseColor = '#ff3333';
            glowColor = 'rgba(255, 50, 50, 0.8)';
            pulseSpeed = 200;
            particleCount = 15;
        }

        const pulse = Math.sin(time / pulseSpeed * Math.PI) * 0.3 + 0.7;
        const size = tileSize * 0.8;
        const centerX = screenX + tileSize / 2;
        const centerY = screenY + tileSize / 2;

        ctx.save();

        // Draw large glow underneath
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, tileSize * 1.5
        );
        gradient.addColorStop(0, glowColor);
        gradient.addColorStop(0.5, glowColor.replace('0.6', '0.2').replace('0.8', '0.3'));
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.globalAlpha = pulse;
        ctx.fillRect(centerX - tileSize * 1.5, centerY - tileSize * 1.5, tileSize * 3, tileSize * 3);

        // Draw rotating particles
        ctx.globalAlpha = pulse * 0.8;
        for (let i = 0; i < particleCount; i++) {
            const angle = (time / 2000 + i / particleCount) * Math.PI * 2;
            const radius = tileSize * 0.6;
            const px = centerX + Math.cos(angle) * radius;
            const py = centerY + Math.sin(angle) * radius;

            ctx.fillStyle = baseColor;
            ctx.beginPath();
            ctx.arc(px, py, 3, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw main shaft symbol (upward arrow/triangle)
        ctx.globalAlpha = 1;
        ctx.fillStyle = baseColor;
        ctx.shadowColor = baseColor;
        ctx.shadowBlur = 15;

        // Outer ring
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.7, 0, Math.PI * 2);
        ctx.stroke();

        // Inner filled circle
        ctx.beginPath();
        ctx.arc(centerX, centerY, size * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Upward arrow above
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size * 1.2);
        ctx.lineTo(centerX - size * 0.4, centerY - size * 0.6);
        ctx.lineTo(centerX + size * 0.4, centerY - size * 0.6);
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('EXTRACT', centerX, centerY + size * 0.9);

        // Time remaining if warning
        if (point.status === 'warning' || point.status === 'collapsing') {
            const timeRemaining = point.getTimeRemaining?.() || 0;
            const seconds = Math.ceil(timeRemaining / 1000);
            ctx.fillStyle = point.status === 'collapsing' ? '#ff3333' : '#ffaa00';
            ctx.font = 'bold 12px monospace';
            ctx.fillText(`${seconds}s`, centerX, centerY + size * 1.2);
        }

        ctx.restore();
    });
}

// ============================================================================
// REGISTER WITH SYSTEM MANAGER
// ============================================================================

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('ExtractionSystem', ExtractionSystem, 75);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.ExtractionSystem = ExtractionSystem;
window.renderExtractionPoints = renderExtractionPoints;

console.log('[ExtractionSystem] Extraction system loaded');
