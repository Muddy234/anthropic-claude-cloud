/**
 * Stamina System
 * Manages player stamina resource for attacks and dodges.
 * Stamina regenerates when idle, is consumed by actions, and refunded on kills.
 */

const StaminaSystem = {
    // ==========================================================================
    // STATE
    // ==========================================================================
    state: {
        current: 100,
        max: 100,
        regenDelayTimer: 0,      // Countdown until regen starts
        isExhausted: false,      // Below threshold
        lastActionTime: 0,       // Timestamp of last stamina-consuming action
        regenPaused: false,      // Temporarily pause regen (e.g., during attack animation)
    },

    // Visual feedback state
    feedback: {
        refundFlash: false,      // Flash gold on stamina refund
        refundFlashTimer: 0,
        exhaustedFlash: false,   // Flash red when action blocked by low stamina
        exhaustedFlashTimer: 0,
        recentChange: 0,         // +/- for UI animation
    },

    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================
    init() {
        const maxStamina = this.getMaxStamina();
        const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : {
            startingStamina: 100,
        };

        this.state.max = maxStamina;
        this.state.current = Math.min(config.startingStamina || maxStamina, maxStamina);
        this.state.regenDelayTimer = 0;
        this.state.isExhausted = false;
        this.state.regenPaused = false;
        this.feedback.refundFlash = false;
        this.feedback.exhaustedFlash = false;
        this.feedback.recentChange = 0;
    },

    reset() {
        this.init();
    },

    // ==========================================================================
    // CORE METHODS
    // ==========================================================================

    /**
     * Check if player can afford an action without consuming stamina
     * @param {string} actionType - 'lightAttack', 'heavyAttack', 'dodge', 'dash', 'block'
     * @returns {boolean}
     */
    canAfford(actionType) {
        const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : { costs: {} };
        const cost = config.costs[actionType] || 0;
        return this.state.current >= cost;
    },

    /**
     * Consume stamina for an action
     * @param {number} amount - Amount to consume (or use actionType)
     * @param {string} actionType - Type of action for logging/feedback
     * @returns {boolean} - True if stamina was consumed, false if not enough
     */
    consume(amount, actionType = 'unknown') {
        const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : {
            costs: {},
            regenDelay: 0.8,
            exhaustedThreshold: 20,
        };

        // If amount is 0 or undefined, look up by action type
        let cost = amount;
        if (cost === undefined || cost === null) {
            cost = config.costs[actionType] || 0;
        }

        // Free action
        if (cost <= 0) {
            return true;
        }

        // Check affordability
        if (this.state.current < cost) {
            // Trigger exhausted feedback
            this.triggerExhaustedFeedback();
            return false;
        }

        // Consume stamina
        const wasExhausted = this.state.isExhausted;
        this.state.current = Math.max(0, this.state.current - cost);
        this.state.regenDelayTimer = config.regenDelay;
        this.state.lastActionTime = performance.now();
        this.feedback.recentChange = -cost;

        // Update exhausted state
        this.state.isExhausted = this.state.current < config.exhaustedThreshold;

        // Emit exhaustion event when stamina hits 0
        if (this.state.current <= 0) {
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('stamina:exhausted', { current: 0 });
            }
        }

        return true;
    },

    /**
     * Consume stamina by action type (convenience method)
     * @param {string} actionType - 'lightAttack', 'heavyAttack', 'dodge', 'dash'
     * @returns {boolean}
     */
    consumeAction(actionType) {
        const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : { costs: {} };
        const cost = config.costs?.[actionType] ?? 0;
        // console.log(`[StaminaSystem] consumeAction: ${actionType}, cost: ${cost}, current: ${this.state.current}`);
        const result = this.consume(cost, actionType);
        // console.log(`[StaminaSystem] after consume: ${this.state.current}, result: ${result}`);
        return result;
    },

    /**
     * Refund stamina (e.g., on kill, perfect dodge)
     * @param {number} amount - Amount to refund
     * @param {string} reason - Reason for refund (for logging)
     */
    refund(amount, reason = 'unknown') {
        if (amount <= 0) return;

        const maxStamina = this.getMaxStamina();
        const previousCurrent = this.state.current;
        const wasExhausted = this.state.isExhausted;
        this.state.current = Math.min(maxStamina, this.state.current + amount);
        this.state.max = maxStamina; // Keep max in sync with boon changes
        const actualRefund = this.state.current - previousCurrent;

        if (actualRefund > 0) {
            this.feedback.recentChange = actualRefund;
            this.triggerRefundFeedback();

            // Update exhausted state
            const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : { exhaustedThreshold: 20 };
            this.state.isExhausted = this.state.current < config.exhaustedThreshold;

            // Emit recovery event when crossing out of exhaustion
            if (wasExhausted && !this.state.isExhausted) {
                if (typeof EventBus !== 'undefined') {
                    EventBus.emit('stamina:recovered', { current: this.state.current, max: maxStamina });
                }
            }
        }
    },

    /**
     * Get exhaustion speed modifier
     * @returns {number} - 1.0 if not exhausted, penalty value if exhausted
     */
    getExhaustionModifier() {
        if (!this.state.isExhausted) return 1.0;
        const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : { exhaustedSpeedPenalty: 0.7 };
        return config.exhaustedSpeedPenalty;
    },

    // ==========================================================================
    // EVENT HANDLERS
    // ==========================================================================

    /**
     * Called when player kills an enemy
     */
    onKill() {
        this.refund(this.getKillRefund(), 'kill');
    },

    /**
     * Called when player performs a perfect dodge
     */
    onPerfectDodge() {
        const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : { perfectDodgeRefund: 15 };
        this.refund(config.perfectDodgeRefund, 'perfectDodge');
    },

    /**
     * Called when player takes damage (optional stamina drain)
     * Currently not implemented - can be enabled in config
     */
    onDamageTaken(damage) {
        // Optional: drain stamina on hit
        // const drainAmount = Math.floor(damage * 0.1);
        // this.state.current = Math.max(0, this.state.current - drainAmount);
    },

    // ==========================================================================
    // UPDATE
    // ==========================================================================

    /**
     * Update stamina regeneration
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : {
            regenDelay: 0.8,
            inCombatRegenMultiplier: 0.5,
            exhaustedThreshold: 20,
        };

        // Sync max stamina with boon changes each frame
        const maxStamina = this.getMaxStamina();
        this.state.max = maxStamina;

        // Update feedback timers
        if (this.feedback.refundFlashTimer > 0) {
            this.feedback.refundFlashTimer -= dt;
            if (this.feedback.refundFlashTimer <= 0) {
                this.feedback.refundFlash = false;
            }
        }

        if (this.feedback.exhaustedFlashTimer > 0) {
            this.feedback.exhaustedFlashTimer -= dt;
            if (this.feedback.exhaustedFlashTimer <= 0) {
                this.feedback.exhaustedFlash = false;
            }
        }

        // Decay recent change indicator
        if (this.feedback.recentChange !== 0) {
            this.feedback.recentChange *= 0.9;
            if (Math.abs(this.feedback.recentChange) < 0.5) {
                this.feedback.recentChange = 0;
            }
        }

        // Don't regen if paused
        if (this.state.regenPaused) return;

        // Don't regen if at max
        if (this.state.current >= maxStamina) return;

        // Handle regen delay
        if (this.state.regenDelayTimer > 0) {
            this.state.regenDelayTimer -= dt;
            return;
        }

        // Calculate regen rate from boon-aware getter
        let regenRate = this.getRegenRate();

        // Reduce regen in combat
        const isInCombat = typeof game !== 'undefined' && game.player?.combat?.isInCombat;
        if (isInCombat) {
            regenRate *= config.inCombatRegenMultiplier;
        }

        // PACK TACTICS: Apply surrounded regen penalty
        if (this.surroundedRegenPenalty && this.surroundedRegenPenalty < 1.0) {
            regenRate *= this.surroundedRegenPenalty;
        }

        // Apply regeneration
        const wasExhausted = this.state.isExhausted;
        this.state.current = Math.min(maxStamina, this.state.current + regenRate * dt);

        // Update exhausted state
        this.state.isExhausted = this.state.current < config.exhaustedThreshold;

        // Emit recovery event when crossing out of exhaustion via regen
        if (wasExhausted && !this.state.isExhausted) {
            if (typeof EventBus !== 'undefined') {
                EventBus.emit('stamina:recovered', { current: this.state.current, max: maxStamina });
            }
        }
    },

    // ==========================================================================
    // VISUAL FEEDBACK
    // ==========================================================================

    triggerRefundFeedback() {
        this.feedback.refundFlash = true;
        this.feedback.refundFlashTimer = 0.3; // 300ms flash
    },

    triggerExhaustedFeedback() {
        this.feedback.exhaustedFlash = true;
        this.feedback.exhaustedFlashTimer = 0.2; // 200ms flash
    },

    // ==========================================================================
    // BOON-AWARE GETTERS (check statStacks first, fallback to static config)
    // ==========================================================================

    /**
     * Get max stamina, checking player statStacks for boon modifiers first
     * @returns {number} Effective max stamina
     */
    getMaxStamina() {
        if (typeof game !== 'undefined' && game.player?.statStacks?.maxStamina) {
            return game.player.statStacks.maxStamina.compute();
        }
        return (typeof STAMINA_CONFIG !== 'undefined' && STAMINA_CONFIG.maxStamina) || 100;
    },

    /**
     * Get stamina regen rate, checking player statStacks for boon modifiers first
     * @returns {number} Effective stamina regen rate per second
     */
    getRegenRate() {
        if (typeof game !== 'undefined' && game.player?.statStacks?.staminaRegenRate) {
            return game.player.statStacks.staminaRegenRate.compute();
        }
        return (typeof STAMINA_CONFIG !== 'undefined' && STAMINA_CONFIG.regenRate) || 15;
    },

    /**
     * Get stamina kill refund amount, checking player statStacks for boon modifiers first
     * @returns {number} Effective stamina refunded per kill
     */
    getKillRefund() {
        if (typeof game !== 'undefined' && game.player?.statStacks?.staminaKillRefund) {
            return game.player.statStacks.staminaKillRefund.compute();
        }
        return (typeof STAMINA_CONFIG !== 'undefined' && STAMINA_CONFIG.killRefund) || 25;
    },

    // ==========================================================================
    // GETTERS
    // ==========================================================================

    /**
     * Get current stamina value
     */
    getCurrent() {
        return this.state.current;
    },

    /**
     * Get max stamina value (uses boon-aware getMaxStamina)
     */
    getMax() {
        return this.getMaxStamina();
    },

    /**
     * Get stamina as percentage (0-1)
     */
    getPercent() {
        return this.state.current / this.getMaxStamina();
    },

    /**
     * Get number of filled segments for UI
     */
    getFilledSegments() {
        const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : { segmentValue: 20 };
        const segmentValue = config.segmentValue || 20;
        return Math.floor(this.state.current / segmentValue);
    },

    /**
     * Get partial fill of current segment (0-1)
     */
    getSegmentPartial() {
        const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : { segmentValue: 20 };
        const segmentValue = config.segmentValue || 20;
        return (this.state.current % segmentValue) / segmentValue;
    },

    /**
     * Get total number of segments based on current max stamina
     */
    getTotalSegments() {
        const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : { segmentValue: 20 };
        const segmentValue = config.segmentValue || 20;
        return Math.ceil(this.getMaxStamina() / segmentValue);
    },

    /**
     * Check if currently exhausted
     */
    isExhausted() {
        return this.state.isExhausted;
    },

    /**
     * Check if regenerating
     */
    isRegenerating() {
        return this.state.regenDelayTimer <= 0 && this.state.current < this.getMaxStamina() && !this.state.regenPaused;
    },

    // ==========================================================================
    // SETTERS
    // ==========================================================================

    /**
     * Pause/resume stamina regeneration
     */
    pauseRegen(paused = true) {
        this.state.regenPaused = paused;
    },

    /**
     * Set current stamina directly (for loading saves, etc.)
     */
    setCurrent(value) {
        const config = typeof STAMINA_CONFIG !== 'undefined' ? STAMINA_CONFIG : { exhaustedThreshold: 20 };
        const maxStamina = this.getMaxStamina();
        this.state.max = maxStamina; // Keep max in sync
        this.state.current = Math.max(0, Math.min(maxStamina, value));
        this.state.isExhausted = this.state.current < config.exhaustedThreshold;
    },
};

// Initialize on load
if (typeof window !== 'undefined') {
    window.StaminaSystem = StaminaSystem;

    // Verify config is loaded and initialize
    if (typeof STAMINA_CONFIG !== 'undefined') {
        // console.log('[StaminaSystem] Config loaded:', STAMINA_CONFIG.costs);
        StaminaSystem.init();
    } else {
        console.warn('[StaminaSystem] STAMINA_CONFIG not found! Using defaults.');
    }

    // Wire EventBus listeners for decoupled communication
    if (typeof EventBus !== 'undefined') {
        EventBus.on('enemy:death', (data) => {
            StaminaSystem.onKill();
        });
    }
}
