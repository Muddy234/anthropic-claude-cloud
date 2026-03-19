// === js/systems/training-system.js ===
// Training dummies system for practice combat

// ============================================================================
// TRAINING SYSTEM
// ============================================================================

const TrainingSystem = {

    // Configuration
    DPS_WINDOW: 10000,  // 10 seconds for DPS calculation
    DUMMY_RESET_DELAY: 2000,  // 2 seconds after no damage to reset

    // Dummy types with different defense values
    DUMMY_TYPES: {
        straw: {
            name: 'Straw Dummy',
            defense: 0,
            color: '#d4a574',
            description: 'No defense - raw damage test'
        },
        wood: {
            name: 'Wooden Dummy',
            defense: 5,
            color: '#8b6914',
            description: 'Medium defense - standard test'
        },
        iron: {
            name: 'Iron Dummy',
            defense: 15,
            color: '#708090',
            description: 'High defense - armor test'
        }
    },

    // State
    initialized: false,
    dummies: [],  // { type, x, y, totalDamage, hits, lastHitTime, damageHistory }
    activeDummy: null,

    // Stats tracking
    sessionStats: {
        totalDamage: 0,
        totalHits: 0,
        maxHit: 0,
        currentDPS: 0
    },

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize training system
     */
    init() {
        this.dummies = [];
        this.activeDummy = null;
        this.sessionStats = {
            totalDamage: 0,
            totalHits: 0,
            maxHit: 0,
            currentDPS: 0
        };
        this.initialized = true;
        console.log('[TrainingSystem] Initialized');
    },

    /**
     * Add a training dummy at a position
     * @param {string} type - 'straw', 'wood', or 'iron'
     * @param {number} x
     * @param {number} y
     */
    addDummy(type, x, y) {
        const dummyType = this.DUMMY_TYPES[type];
        if (!dummyType) {
            console.warn(`[TrainingSystem] Unknown dummy type: ${type}`);
            return;
        }

        this.dummies.push({
            type: type,
            config: dummyType,
            x: x,
            y: y,
            totalDamage: 0,
            hits: 0,
            lastHitTime: 0,
            damageHistory: []  // { damage, timestamp }
        });

        console.log(`[TrainingSystem] Added ${dummyType.name} at (${x}, ${y})`);
    },

    // ========================================================================
    // DUMMY INTERACTION
    // ========================================================================

    /**
     * Check if position has a training dummy
     * @param {number} x
     * @param {number} y
     * @returns {Object|null}
     */
    getDummyAt(x, y) {
        return this.dummies.find(d => d.x === x && d.y === y) || null;
    },

    /**
     * Attack a training dummy
     * @param {Object} dummy
     * @param {Object} player - Player with attack stats
     * @returns {Object} { damage, isCrit }
     */
    attackDummy(dummy, player) {
        if (!dummy || !player) return null;

        // Calculate damage using game's damage formula if available
        let damage = 0;
        let isCrit = false;

        if (typeof DamageCalculator !== 'undefined') {
            // Use the game's damage calculator
            const result = DamageCalculator.calculate({
                attacker: player,
                defender: { defense: dummy.config.defense, armor: 0 },
                weapon: player.weapon || player.equippedWeapon
            });
            damage = result.damage;
            isCrit = result.isCrit;
        } else {
            // Fallback calculation
            const baseDamage = player.attack || player.damage || 10;
            const weaponDamage = player.weapon ? (player.weapon.damage || 0) : 0;
            const totalDamage = baseDamage + weaponDamage;

            // Apply defense
            damage = Math.max(1, totalDamage - dummy.config.defense);

            // Critical chance
            const critChance = player.critChance || 0.1;
            const critMultiplier = player.critMultiplier || 1.5;
            if (Math.random() < critChance) {
                damage = Math.floor(damage * critMultiplier);
                isCrit = true;
            }
        }

        // Record hit
        const now = Date.now();
        dummy.totalDamage += damage;
        dummy.hits += 1;
        dummy.lastHitTime = now;
        dummy.damageHistory.push({ damage, timestamp: now });

        // Update session stats
        this.sessionStats.totalDamage += damage;
        this.sessionStats.totalHits += 1;
        if (damage > this.sessionStats.maxHit) {
            this.sessionStats.maxHit = damage;
        }

        // Set as active dummy
        this.activeDummy = dummy;

        console.log(`[TrainingSystem] Hit ${dummy.config.name} for ${damage}${isCrit ? ' (CRIT!)' : ''}`);

        return { damage, isCrit };
    },

    /**
     * Calculate current DPS for a dummy
     * @param {Object} dummy
     * @returns {number}
     */
    calculateDPS(dummy) {
        if (!dummy || dummy.damageHistory.length === 0) return 0;

        const now = Date.now();
        const windowStart = now - this.DPS_WINDOW;

        // Filter to recent hits
        const recentHits = dummy.damageHistory.filter(h => h.timestamp >= windowStart);

        if (recentHits.length === 0) return 0;

        // Sum damage in window
        const windowDamage = recentHits.reduce((sum, h) => sum + h.damage, 0);

        // Calculate time span (at least 1 second)
        const firstHit = recentHits[0].timestamp;
        const timeSpan = Math.max(1000, now - firstHit);

        // DPS = damage / seconds
        return windowDamage / (timeSpan / 1000);
    },

    // ========================================================================
    // UPDATE
    // ========================================================================

    /**
     * Update training system
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        if (!this.initialized) return;

        const now = Date.now();

        // Clean up old damage history entries
        this.dummies.forEach(dummy => {
            dummy.damageHistory = dummy.damageHistory.filter(
                h => now - h.timestamp < this.DPS_WINDOW * 2
            );

            // Reset dummy if no recent hits
            if (dummy.lastHitTime > 0 && now - dummy.lastHitTime > this.DUMMY_RESET_DELAY) {
                // Keep stats but clear "active" state
                if (this.activeDummy === dummy) {
                    this.activeDummy = null;
                }
            }
        });

        // Update current DPS
        if (this.activeDummy) {
            this.sessionStats.currentDPS = this.calculateDPS(this.activeDummy);
        }
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render a training dummy
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} dummy
     * @param {number} screenX
     * @param {number} screenY
     * @param {number} tileSize
     */
    renderDummy(ctx, dummy, screenX, screenY, tileSize) {
        const centerX = screenX + tileSize / 2;
        const centerY = screenY + tileSize / 2;

        ctx.save();

        // Body (rectangle)
        ctx.fillStyle = dummy.config.color;
        ctx.fillRect(centerX - 8, centerY - 4, 16, 24);

        // Head (circle)
        ctx.beginPath();
        ctx.arc(centerX, centerY - 10, 8, 0, Math.PI * 2);
        ctx.fill();

        // Cross support (straw/wood only)
        if (dummy.type !== 'iron') {
            ctx.fillStyle = '#4a3000';
            ctx.fillRect(centerX - 12, centerY + 2, 24, 4);
        }

        // Pole
        ctx.fillStyle = '#4a3000';
        ctx.fillRect(centerX - 2, centerY + 16, 4, 16);

        // Type indicator border
        ctx.strokeStyle = dummy === this.activeDummy ? '#ffd700' : '#333';
        ctx.lineWidth = dummy === this.activeDummy ? 2 : 1;
        ctx.strokeRect(centerX - 10, centerY - 18, 20, 40);

        ctx.restore();
    },

    /**
     * Render training stats overlay
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     */
    renderStats(ctx, x, y) {
        if (!this.activeDummy) return;

        const colors = typeof UI_COLORS !== 'undefined' ? UI_COLORS : {
            bgDark: '#141414',
            frameGold: '#b8860b',
            textPrimary: '#efe4b0',
            textSecondary: '#b8a878'
        };

        const panelWidth = 180;
        const panelHeight = 100;

        ctx.save();

        // Background
        ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
        ctx.fillRect(x, y, panelWidth, panelHeight);

        // Border
        ctx.strokeStyle = colors.frameGold;
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, panelWidth, panelHeight);

        // Title
        ctx.font = 'bold 12px Georgia, serif';
        ctx.fillStyle = colors.frameGold;
        ctx.textAlign = 'left';
        ctx.fillText('TRAINING STATS', x + 10, y + 18);

        // Stats
        ctx.font = '11px Georgia, serif';
        ctx.fillStyle = colors.textPrimary;

        const dummy = this.activeDummy;
        const dps = this.calculateDPS(dummy);

        ctx.fillText(`Target: ${dummy.config.name}`, x + 10, y + 38);
        ctx.fillText(`DPS: ${dps.toFixed(1)}`, x + 10, y + 54);
        ctx.fillText(`Total Hits: ${dummy.hits}`, x + 10, y + 70);
        ctx.fillText(`Max Hit: ${this.sessionStats.maxHit}`, x + 10, y + 86);

        ctx.restore();
    },

    // ========================================================================
    // QUERIES
    // ========================================================================

    /**
     * Get stats for session
     * @returns {Object}
     */
    getStats() {
        return {
            ...this.sessionStats,
            avgDamage: this.sessionStats.totalHits > 0
                ? Math.round(this.sessionStats.totalDamage / this.sessionStats.totalHits)
                : 0
        };
    },

    /**
     * Reset session stats
     */
    resetStats() {
        this.sessionStats = {
            totalDamage: 0,
            totalHits: 0,
            maxHit: 0,
            currentDPS: 0
        };

        this.dummies.forEach(dummy => {
            dummy.totalDamage = 0;
            dummy.hits = 0;
            dummy.damageHistory = [];
        });

        this.activeDummy = null;
        console.log('[TrainingSystem] Stats reset');
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.TrainingSystem = TrainingSystem;

console.log('[TrainingSystem] Training system loaded');
