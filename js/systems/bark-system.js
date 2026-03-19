// === js/systems/bark-system.js ===
// NPC ambient dialogue (barks) - speech bubbles when player passes by

// ============================================================================
// BARK SYSTEM
// ============================================================================

const BarkSystem = {

    // Configuration
    TRIGGER_DISTANCE: 2,      // Tiles from NPC to trigger bark
    COOLDOWN: 30000,          // 30 seconds between barks per NPC
    DISPLAY_DURATION: 4000,   // 4 seconds display time
    FADE_DURATION: 500,       // 500ms fade out

    // State
    initialized: false,
    npcCooldowns: {},         // { npcId: lastBarkTime }
    activeBark: null,         // { npcId, text, startTime, x, y }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize the bark system
     */
    init() {
        this.npcCooldowns = {};
        this.activeBark = null;
        this.initialized = true;
        console.log('[BarkSystem] Initialized');
    },

    /**
     * Reset the system (e.g., when leaving village)
     */
    reset() {
        this.activeBark = null;
        // Don't reset cooldowns - they persist during village visit
    },

    // ========================================================================
    // UPDATE
    // ========================================================================

    /**
     * Update bark system
     * @param {number} dt - Delta time in ms
     * @param {Object} player - Player object with x, y position
     * @param {Array} npcs - Array of NPC objects with x, y, id
     */
    update(dt, player, npcs) {
        if (!this.initialized || !player || !npcs) return;

        const now = Date.now();

        // Check if active bark should expire
        if (this.activeBark) {
            const elapsed = now - this.activeBark.startTime;
            if (elapsed > this.DISPLAY_DURATION + this.FADE_DURATION) {
                this.activeBark = null;
            }
        }

        // Don't check for new barks if one is active
        if (this.activeBark) return;

        // Check proximity to each NPC
        for (const npc of npcs) {
            if (!npc || !npc.id) continue;

            const distance = this._getDistance(player.x, player.y, npc.x, npc.y);

            if (distance <= this.TRIGGER_DISTANCE) {
                // Check cooldown
                const lastBark = this.npcCooldowns[npc.id] || 0;
                if (now - lastBark >= this.COOLDOWN) {
                    this._triggerBark(npc, now);
                    break;  // Only one bark at a time
                }
            }
        }
    },

    /**
     * Calculate distance between two points
     * @private
     */
    _getDistance(x1, y1, x2, y2) {
        return Math.abs(x1 - x2) + Math.abs(y1 - y2);  // Manhattan distance
    },

    /**
     * Trigger a bark for an NPC
     * @param {Object} npc
     * @param {number} now - Current timestamp
     * @private
     */
    _triggerBark(npc, now) {
        const bark = this._selectBark(npc);
        if (!bark) return;

        this.npcCooldowns[npc.id] = now;
        this.activeBark = {
            npcId: npc.id,
            npcName: npc.name,
            text: bark,
            startTime: now,
            x: npc.x,
            y: npc.y
        };

        console.log(`[BarkSystem] ${npc.name}: "${bark}"`);
    },

    /**
     * Select appropriate bark for NPC
     * @param {Object} npc
     * @returns {string|null}
     * @private
     */
    _selectBark(npc) {
        // Get barks from NPC data
        const npcData = this._getNpcData(npc.id);
        if (!npcData || !npcData.barks || npcData.barks.length === 0) {
            return null;
        }

        // Check for context-specific barks first
        const contextBark = this._getContextBark(npc, npcData);
        if (contextBark) return contextBark;

        // Fall back to random generic bark
        const genericBarks = npcData.barks.filter(b => !b.condition);
        if (genericBarks.length === 0) return null;

        const selected = genericBarks[Math.floor(Math.random() * genericBarks.length)];
        return typeof selected === 'string' ? selected : selected.text;
    },

    /**
     * Get context-aware bark based on game state
     * @param {Object} npc
     * @param {Object} npcData
     * @returns {string|null}
     * @private
     */
    _getContextBark(npc, npcData) {
        const conditionalBarks = npcData.barks.filter(b => b.condition);
        if (conditionalBarks.length === 0) return null;

        // Check each conditional bark
        for (const bark of conditionalBarks) {
            if (this._checkCondition(bark.condition)) {
                return bark.text;
            }
        }

        return null;
    },

    /**
     * Check if a bark condition is met
     * @param {string} condition
     * @returns {boolean}
     * @private
     */
    _checkCondition(condition) {
        const stats = typeof persistentState !== 'undefined' ? persistentState.stats : {};
        const player = typeof game !== 'undefined' ? game.player : {};

        switch (condition) {
            case 'low_health':
                return player.hp && player.maxHp && (player.hp / player.maxHp) < 0.3;

            case 'high_gold':
                return player.gold && player.gold > 500;

            case 'low_gold':
                return player.gold !== undefined && player.gold < 20;

            case 'many_runs':
                return stats.totalRuns && stats.totalRuns > 10;

            case 'first_run':
                return !stats.totalRuns || stats.totalRuns === 0;

            case 'recent_death':
                return stats.lastRunDied === true;

            case 'deep_diver':
                return stats.deepestFloor && stats.deepestFloor >= 5;

            case 'bounty_active':
                return typeof persistentState !== 'undefined' &&
                       persistentState.activeBounties &&
                       persistentState.activeBounties.length > 0;

            default:
                return false;
        }
    },

    /**
     * Get NPC data from global NPC_DATA
     * @param {string} npcId
     * @returns {Object|null}
     * @private
     */
    _getNpcData(npcId) {
        if (typeof NPC_DATA !== 'undefined' && NPC_DATA[npcId]) {
            return NPC_DATA[npcId];
        }
        return null;
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Get current active bark for rendering
     * @returns {Object|null} { npcId, text, x, y, opacity }
     */
    getActiveBark() {
        if (!this.activeBark) return null;

        const now = Date.now();
        const elapsed = now - this.activeBark.startTime;

        // Calculate opacity for fade
        let opacity = 1.0;
        if (elapsed > this.DISPLAY_DURATION) {
            // Fading out
            const fadeElapsed = elapsed - this.DISPLAY_DURATION;
            opacity = 1.0 - (fadeElapsed / this.FADE_DURATION);
            opacity = Math.max(0, opacity);
        }

        return {
            npcId: this.activeBark.npcId,
            npcName: this.activeBark.npcName,
            text: this.activeBark.text,
            x: this.activeBark.x,
            y: this.activeBark.y,
            opacity: opacity
        };
    },

    /**
     * Render speech bubble
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} tileSize
     * @param {number} offsetX - Camera offset
     * @param {number} offsetY - Camera offset
     */
    render(ctx, tileSize, offsetX, offsetY) {
        const bark = this.getActiveBark();
        if (!bark) return;

        ctx.save();

        // Calculate screen position (above NPC)
        const screenX = bark.x * tileSize + offsetX + tileSize / 2;
        const screenY = bark.y * tileSize + offsetY - 20;

        // Apply opacity
        ctx.globalAlpha = bark.opacity;

        // Measure text
        ctx.font = '12px Georgia, serif';
        const textWidth = ctx.measureText(bark.text).width;
        const padding = 8;
        const bubbleWidth = textWidth + padding * 2;
        const bubbleHeight = 24;

        // Bubble background
        const bubbleX = screenX - bubbleWidth / 2;
        const bubbleY = screenY - bubbleHeight;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(bubbleX + 2, bubbleY + 2, bubbleWidth, bubbleHeight);

        // Background
        ctx.fillStyle = '#f5f5dc';
        ctx.fillRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);

        // Border
        ctx.strokeStyle = '#8b6914';
        ctx.lineWidth = 1;
        ctx.strokeRect(bubbleX, bubbleY, bubbleWidth, bubbleHeight);

        // Pointer triangle
        ctx.fillStyle = '#f5f5dc';
        ctx.beginPath();
        ctx.moveTo(screenX - 5, bubbleY + bubbleHeight);
        ctx.lineTo(screenX + 5, bubbleY + bubbleHeight);
        ctx.lineTo(screenX, bubbleY + bubbleHeight + 8);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#8b6914';
        ctx.beginPath();
        ctx.moveTo(screenX - 5, bubbleY + bubbleHeight);
        ctx.lineTo(screenX, bubbleY + bubbleHeight + 8);
        ctx.lineTo(screenX + 5, bubbleY + bubbleHeight);
        ctx.stroke();

        // Text
        ctx.fillStyle = '#1a1a1a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(bark.text, screenX, bubbleY + bubbleHeight / 2);

        ctx.restore();
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.BarkSystem = BarkSystem;

console.log('[BarkSystem] Bark system loaded');
