// === js/entities/extraction-point.js ===
// SURVIVAL EXTRACTION UPDATE: Extraction shaft entity

// ============================================================================
// EXTRACTION POINT FACTORY
// ============================================================================

/**
 * Create an extraction point (shaft) entity
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {string} id - Unique identifier
 * @returns {Object} Extraction point entity
 */
function createExtractionPoint(x, y, id) {
    return {
        // Identity
        id: id || `shaft_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type: 'extraction_point',

        // Position
        x: x,
        y: y,
        gridX: Math.floor(x),
        gridY: Math.floor(y),

        // State
        status: 'active',  // 'active', 'warning', 'collapsing', 'collapsed'

        // Timing
        collapseTime: null,      // Timestamp when it will collapse
        warningStartTime: null,  // Timestamp when warning started

        // Visual
        sprite: 'extraction_shaft',
        animationFrame: 0,
        animationTimer: 0,
        glowIntensity: 1.0,

        // Discovery (only shown if player has seen it)
        discovered: false,
        lastSeenTime: null,

        // ====================================================================
        // METHODS
        // ====================================================================

        /**
         * Check if shaft is usable
         * @returns {boolean}
         */
        isActive() {
            return this.status === 'active' || this.status === 'warning';
        },

        /**
         * Check if shaft is in warning state
         * @returns {boolean}
         */
        isWarning() {
            return this.status === 'warning' || this.status === 'collapsing';
        },

        /**
         * Start the warning sequence
         * @param {number} collapseAt - Timestamp when collapse occurs
         */
        startWarning(collapseAt) {
            this.status = 'warning';
            this.collapseTime = collapseAt;
            this.warningStartTime = Date.now();
            console.log(`[ExtractionPoint] Shaft ${this.id} entering warning state`);
        },

        /**
         * Transition to collapsing state (final countdown)
         */
        startCollapsing() {
            this.status = 'collapsing';
            console.log(`[ExtractionPoint] Shaft ${this.id} is collapsing!`);
        },

        /**
         * Mark as collapsed (unusable)
         */
        collapse() {
            this.status = 'collapsed';
            this.glowIntensity = 0;
            console.log(`[ExtractionPoint] Shaft ${this.id} has collapsed`);
        },

        /**
         * Get time remaining until collapse (ms)
         * @returns {number|null}
         */
        getTimeRemaining() {
            if (!this.collapseTime) return null;
            return Math.max(0, this.collapseTime - Date.now());
        },

        /**
         * Get current warning stage
         * @returns {string|null} 'rumble', 'debris', 'critical', or null
         */
        getWarningStage() {
            if (this.status !== 'warning' && this.status !== 'collapsing') {
                return null;
            }

            const timeRemaining = this.getTimeRemaining();
            if (timeRemaining === null) return null;

            const stages = EXTRACTION_CONFIG ? EXTRACTION_CONFIG.warningStages : {
                rumble: 20000,
                debris: 10000,
                critical: 5000
            };

            if (timeRemaining <= stages.critical) return 'critical';
            if (timeRemaining <= stages.debris) return 'debris';
            if (timeRemaining <= stages.rumble) return 'rumble';

            return null;
        },

        /**
         * Get warning intensity (0-1) for visual effects
         * @returns {number}
         */
        getWarningIntensity() {
            if (!this.isWarning()) return 0;

            const timeRemaining = this.getTimeRemaining();
            const warningDuration = EXTRACTION_CONFIG ?
                EXTRACTION_CONFIG.warningDuration : 20000;

            if (timeRemaining === null) return 0;

            // Intensity increases as time runs out
            return 1 - (timeRemaining / warningDuration);
        },

        /**
         * Check if player is within interaction range
         * @param {number} playerX
         * @param {number} playerY
         * @returns {boolean}
         */
        isPlayerInRange(playerX, playerY) {
            const radius = EXTRACTION_CONFIG ?
                EXTRACTION_CONFIG.interactionRadius : 1.5;

            const dx = this.x - playerX;
            const dy = this.y - playerY;
            return Math.sqrt(dx * dx + dy * dy) <= radius;
        },

        /**
         * Get distance to player
         * @param {number} playerX
         * @param {number} playerY
         * @returns {number}
         */
        getDistanceToPlayer(playerX, playerY) {
            const dx = this.x - playerX;
            const dy = this.y - playerY;
            return Math.sqrt(dx * dx + dy * dy);
        },

        /**
         * Mark as discovered (player has seen it)
         */
        discover() {
            if (!this.discovered) {
                this.discovered = true;
                this.lastSeenTime = Date.now();
                console.log(`[ExtractionPoint] Shaft ${this.id} discovered`);
            }
        },

        /**
         * Update animation
         * @param {number} dt - Delta time in ms
         */
        updateAnimation(dt) {
            this.animationTimer += dt;

            // Animate based on status
            if (this.status === 'active') {
                // Gentle pulsing glow
                this.glowIntensity = 0.8 + Math.sin(this.animationTimer / 500) * 0.2;
                if (this.animationTimer >= 500) {
                    this.animationFrame = (this.animationFrame + 1) % 4;
                    this.animationTimer = 0;
                }
            } else if (this.status === 'warning') {
                // Faster pulsing, increasing with urgency
                const intensity = this.getWarningIntensity();
                const pulseSpeed = 200 - (intensity * 150); // Faster as collapse nears
                this.glowIntensity = 0.5 + Math.sin(this.animationTimer / pulseSpeed) * 0.5;

                if (this.animationTimer >= pulseSpeed) {
                    this.animationFrame = (this.animationFrame + 1) % 4;
                    this.animationTimer = 0;
                }
            } else if (this.status === 'collapsing') {
                // Rapid flashing
                this.glowIntensity = Math.random() > 0.5 ? 1 : 0.3;
                this.animationFrame = Math.floor(Math.random() * 4);
            }
        },

        /**
         * Get serializable state for saving
         * @returns {Object}
         */
        serialize() {
            return {
                id: this.id,
                x: this.x,
                y: this.y,
                status: this.status,
                collapseTime: this.collapseTime,
                warningStartTime: this.warningStartTime,
                discovered: this.discovered
            };
        }
    };
}

/**
 * Restore extraction point from saved data
 * @param {Object} data - Serialized data
 * @returns {Object} Extraction point entity
 */
function restoreExtractionPoint(data) {
    const point = createExtractionPoint(data.x, data.y, data.id);
    point.status = data.status;
    point.collapseTime = data.collapseTime;
    point.warningStartTime = data.warningStartTime;
    point.discovered = data.discovered;
    return point;
}

// ============================================================================
// EXPORTS
// ============================================================================

window.createExtractionPoint = createExtractionPoint;
window.restoreExtractionPoint = restoreExtractionPoint;

console.log('[ExtractionPoint] Extraction point entity loaded');
