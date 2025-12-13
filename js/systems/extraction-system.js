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
     * @param {number} floor - Floor number
     * @param {Array} rooms - Room array
     * @param {Object} spawnRoom - Player spawn room
     */
    init(floor, rooms, spawnRoom) {
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
                const dist = point.getDistanceToPlayer(game.player.x, game.player.y);
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

        // Check range
        if (!point.isPlayerInRange(game.player.x, game.player.y)) {
            console.log('[ExtractionSystem] Too far from extraction shaft');
            if (typeof addMessage === 'function') {
                addMessage('Move closer to the extraction shaft.', 'info');
            }
            return false;
        }

        // Set game state to extraction UI
        game.state = GAME_STATES ? GAME_STATES.EXTRACTION : 'extraction';
        game.activeExtractionPoint = point;

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
            // Transition to village
            game.state = GAME_STATES ? GAME_STATES.VILLAGE : 'village';
            game.activeExtractionPoint = null;

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

        return this.points.find(point =>
            point.isActive() &&
            point.isPlayerInRange(game.player.x, game.player.y)
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
// REGISTER WITH SYSTEM MANAGER
// ============================================================================

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('ExtractionSystem', ExtractionSystem, 75);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.ExtractionSystem = ExtractionSystem;

console.log('[ExtractionSystem] Extraction system loaded');
