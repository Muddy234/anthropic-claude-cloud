/**
 * Kill Streak System
 * Tracks consecutive kills without taking damage.
 * Provides visual feedback, tier announcements, and mechanical rewards.
 * Kill streaks grant gold/XP multiplier bonuses at higher tiers.
 */

const KillStreakSystem = {
    // ==========================================================================
    // STATE
    // ==========================================================================
    state: {
        currentStreak: 0,        // Current consecutive kills
        highestStreak: 0,        // Highest streak this run
        highestTier: 0,          // Highest tier index reached this run
        totalStreaks: 0,         // Total streaks of 3+ kills this run
        decayTimer: 0,           // Time until streak starts decaying
        currentTier: null,       // Current tier object from config
        totalKillsThisRun: 0,    // Total kills in current run
        lastKillTime: 0,         // Timestamp of last kill
    },

    // Visual feedback state
    feedback: {
        tierChangeActive: false,  // Currently showing tier announcement
        tierChangeTier: null,     // Which tier to announce
        tierChangeTimer: 0,       // Remaining time for announcement
        streakLostActive: false,  // Currently showing "streak lost"
        streakLostTimer: 0,       // Remaining time for lost message
        streakLostCount: 0,       // How many kills were lost
    },

    // ==========================================================================
    // INITIALIZATION
    // ==========================================================================
    init() {
        this.reset();
        console.log('[KillStreakSystem] Initialized');
    },

    /**
     * Reset all streak state (e.g., on new run)
     */
    reset() {
        this.state.currentStreak = 0;
        this.state.highestStreak = 0;
        this.state.highestTier = 0;
        this.state.totalStreaks = 0;
        this.state.decayTimer = 0;
        this.state.currentTier = null;
        this.state.totalKillsThisRun = 0;
        this.state.lastKillTime = 0;

        this.feedback.tierChangeActive = false;
        this.feedback.tierChangeTier = null;
        this.feedback.tierChangeTimer = 0;
        this.feedback.streakLostActive = false;
        this.feedback.streakLostTimer = 0;
        this.feedback.streakLostCount = 0;
    },

    // ==========================================================================
    // CORE METHODS
    // ==========================================================================

    /**
     * Called when player kills an enemy
     * @param {Object} enemy - The killed enemy
     */
    onKill(enemy) {
        const config = this.getConfig();

        // Increment counters
        this.state.currentStreak++;
        this.state.totalKillsThisRun++;
        this.state.lastKillTime = performance.now();

        // Reset decay timer
        this.state.decayTimer = config.decayTime;

        // Update highest streak
        if (this.state.currentStreak > this.state.highestStreak) {
            this.state.highestStreak = this.state.currentStreak;
        }

        // Check for tier upgrade
        const newTier = this.getCurrentTier();
        if (newTier !== this.state.currentTier) {
            const previousTier = this.state.currentTier;
            this.state.currentTier = newTier;

            // Only announce upgrades (not same tier or downgrades from decay)
            if (newTier && (!previousTier || newTier.kills > (previousTier?.kills || 0))) {
                this.onTierChange(newTier);
            }
        }

        // Track highest tier index reached
        if (newTier) {
            const tiers = config.tiers || [];
            const tierIndex = tiers.indexOf(newTier);
            if (tierIndex >= 0 && (tierIndex + 1) > this.state.highestTier) {
                this.state.highestTier = tierIndex + 1;
            }
        }

        // Sync streak data to runStats
        this._syncRunStats();

        // console.log(`[KillStreakSystem] Kill! Streak: ${this.state.currentStreak}`);
    },

    /**
     * Called when player takes damage
     * @param {number} damage - Damage amount
     * @param {Object} source - Damage source
     */
    onDamageTaken(damage, source) {
        const config = this.getConfig();

        if (!config.resetOnDamage) return;
        if (this.state.currentStreak <= 0) return;

        this.resetStreak('damage');
    },

    /**
     * Get the current tier based on streak count
     * @returns {Object|null} - Tier object or null if below minimum
     */
    getCurrentTier() {
        const config = this.getConfig();
        const tiers = config.tiers || [];

        // Find highest tier that matches current streak
        for (let i = tiers.length - 1; i >= 0; i--) {
            if (this.state.currentStreak >= tiers[i].kills) {
                return tiers[i];
            }
        }
        return null;
    },

    /**
     * Reset the current streak
     * @param {string} reason - Why the streak was reset ('damage', 'decay', 'floor')
     */
    resetStreak(reason) {
        if (this.state.currentStreak >= 2) {
            // Show "streak lost" feedback
            this.onStreakLost(this.state.currentStreak, reason);
        }

        // Track completed streaks of 3+ kills
        if (this.state.currentStreak >= 3) {
            this.state.totalStreaks++;
        }

        this.state.currentStreak = 0;
        this.state.currentTier = null;
        this.state.decayTimer = 0;

        // Sync to runStats after reset
        this._syncRunStats();
    },

    // ==========================================================================
    // UPDATE
    // ==========================================================================

    /**
     * Update decay timer
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        const config = this.getConfig();

        // Update feedback timers
        if (this.feedback.tierChangeTimer > 0) {
            this.feedback.tierChangeTimer -= dt;
            if (this.feedback.tierChangeTimer <= 0) {
                this.feedback.tierChangeActive = false;
            }
        }

        if (this.feedback.streakLostTimer > 0) {
            this.feedback.streakLostTimer -= dt;
            if (this.feedback.streakLostTimer <= 0) {
                this.feedback.streakLostActive = false;
            }
        }

        // Handle streak decay
        if (this.state.currentStreak > 0 && this.state.decayTimer > 0) {
            this.state.decayTimer -= dt;

            if (this.state.decayTimer <= 0) {
                // Decay one kill
                this.state.currentStreak = Math.max(0, this.state.currentStreak - (config.decayPerTick || 1));
                this.state.decayTimer = config.decayTime;

                // Update tier if decayed below threshold
                this.state.currentTier = this.getCurrentTier();

                // If decayed to 0, fully reset
                if (this.state.currentStreak <= 0) {
                    this.state.decayTimer = 0;
                }
            }
        }
    },

    // ==========================================================================
    // VISUAL CALLBACKS
    // ==========================================================================

    /**
     * Called when tier changes (for UI announcement)
     * @param {Object} tier - New tier object
     */
    onTierChange(tier) {
        const config = this.getConfig();

        this.feedback.tierChangeActive = true;
        this.feedback.tierChangeTier = tier;
        this.feedback.tierChangeTimer = config.announcementDuration || 2.0;

        // Notify UI system
        if (typeof KillStreakUI !== 'undefined' && typeof KillStreakUI.showTierAnnouncement === 'function') {
            KillStreakUI.showTierAnnouncement(tier);
        }

        // Play sound if available
        if (typeof AudioManager !== 'undefined' && tier.sound) {
            AudioManager.playSfx(tier.sound, 0.7);
        }

        console.log(`[KillStreakSystem] TIER UP: ${tier.name}!`);
    },

    /**
     * Called when streak is lost
     * @param {number} streak - Streak count that was lost
     * @param {string} reason - Why it was lost
     */
    onStreakLost(streak, reason) {
        const config = this.getConfig();

        this.feedback.streakLostActive = true;
        this.feedback.streakLostTimer = config.streakLostFlashDuration || 0.5;
        this.feedback.streakLostCount = streak;

        // Notify UI system
        if (typeof KillStreakUI !== 'undefined' && typeof KillStreakUI.showStreakLost === 'function') {
            KillStreakUI.showStreakLost(streak, reason);
        }

        console.log(`[KillStreakSystem] Streak lost (${streak} kills) - reason: ${reason}`);
    },

    // ==========================================================================
    // GETTERS
    // ==========================================================================

    /**
     * Get current streak count
     */
    getStreak() {
        return this.state.currentStreak;
    },

    /**
     * Get highest streak this run
     */
    getHighestStreak() {
        return this.state.highestStreak;
    },

    /**
     * Get total kills this run
     */
    getTotalKills() {
        return this.state.totalKillsThisRun;
    },

    /**
     * Get run statistics for game over screen
     */
    getRunStats() {
        return {
            highestStreak: this.state.highestStreak,
            totalKills: this.state.totalKillsThisRun
        };
    },

    /**
     * Get decay progress (0-1, 1 = about to decay)
     */
    getDecayProgress() {
        const config = this.getConfig();
        if (this.state.decayTimer <= 0 || config.decayTime <= 0) return 0;
        return 1 - (this.state.decayTimer / config.decayTime);
    },

    /**
     * Check if at a specific tier or higher
     * @param {number} tierKills - Kill threshold to check
     */
    isAtTier(tierKills) {
        return this.state.currentStreak >= tierKills;
    },

    /**
     * Get the configuration (with fallbacks)
     */
    getConfig() {
        return typeof KILL_STREAK_CONFIG !== 'undefined' ? KILL_STREAK_CONFIG : {
            tiers: [
                { kills: 2,  name: 'Double Kill',     color: '#c0c0c0' },
                { kills: 4,  name: 'Killing Spree',   color: '#4a9eff' },
                { kills: 6,  name: 'Rampage',         color: '#9b4dca' },
                { kills: 8,  name: 'Unstoppable',     color: '#ff6b35' },
                { kills: 10, name: 'Godlike',         color: '#ffd700' },
            ],
            decayTime: 5.0,
            decayPerTick: 1,
            resetOnDamage: true,
            resetOnFloorChange: false,
            announcementDuration: 2.0,
            streakLostFlashDuration: 0.5
        };
    },

    /**
     * Get feedback state for UI rendering
     */
    getFeedback() {
        return {
            tierChangeActive: this.feedback.tierChangeActive,
            tierChangeTier: this.feedback.tierChangeTier,
            tierChangeTimer: this.feedback.tierChangeTimer,
            streakLostActive: this.feedback.streakLostActive,
            streakLostCount: this.feedback.streakLostCount
        };
    },

    // ==========================================================================
    // MECHANICAL REWARDS
    // ==========================================================================

    /**
     * Returns gold/XP multiplier based on current streak tier.
     * Higher tiers grant larger bonuses to reward sustained aggression.
     * @returns {number} Multiplier (1.0 = no bonus)
     */
    getCurrentBonusMultiplier() {
        const tierBonuses = {
            0: 1.0,    // No streak
            1: 1.1,    // Double Kill (2) - 10% bonus
            2: 1.25,   // Killing Spree (4) - 25% bonus
            3: 1.5,    // Rampage (6) - 50% bonus
            4: 2.0,    // Unstoppable (8) - 100% bonus
            5: 3.0     // Godlike (10) - 200% bonus
        };

        // Determine current tier index (0 = no tier)
        const config = this.getConfig();
        const tiers = config.tiers || [];
        let tierIndex = 0;
        for (let i = 0; i < tiers.length; i++) {
            if (this.state.currentStreak >= tiers[i].kills) {
                tierIndex = i + 1;
            }
        }

        return tierBonuses[tierIndex] || 1.0;
    },

    /**
     * Get comprehensive streak data for death screen summary.
     * @returns {Object} Streak statistics for the current run
     */
    getStreakData() {
        return {
            currentStreak: this.state.currentStreak || 0,
            currentTier: this.state.currentTier ? this.state.currentTier.name : 'None',
            highestStreak: this.state.highestStreak || 0,
            highestTier: this.state.highestTier || 0,
            totalStreaks: this.state.totalStreaks || 0,
            totalKills: this.state.totalKillsThisRun || 0
        };
    },

    /**
     * Sync streak data to game.runStats for death screen persistence.
     * Called after each kill and streak reset.
     * @private
     */
    _syncRunStats() {
        if (typeof game !== 'undefined' && game.runStats) {
            game.runStats.highestStreak = this.state.highestStreak;
            game.runStats.totalStreaks = this.state.totalStreaks;

            // Store tier name for display
            const config = this.getConfig();
            const tiers = config.tiers || [];
            if (this.state.highestTier > 0 && this.state.highestTier <= tiers.length) {
                game.runStats.highestStreakTier = tiers[this.state.highestTier - 1].name;
            }
        }
    }
};

// =============================================================================
// EXPORTS
// =============================================================================

if (typeof window !== 'undefined') {
    window.KillStreakSystem = KillStreakSystem;

    // Wire EventBus listeners for decoupled communication
    if (typeof EventBus !== 'undefined') {
        EventBus.on('enemy:death', (data) => {
            KillStreakSystem.onKill(data ? data.enemy : null);
        });
        EventBus.on('player:damage_taken', (data) => {
            // Only reset on actual HP loss, not shielded damage
            if (data && data.amount > 0) {
                KillStreakSystem.resetStreak('damage');
            }
        });
    }
}
