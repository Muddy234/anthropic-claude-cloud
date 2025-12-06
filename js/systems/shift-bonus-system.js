// ============================================================================
// SHIFT BONUS SYSTEM - Generic bonus application for shift mechanics
// ============================================================================
// Provides multipliers and bonuses that can be applied during any shift scenario.
// Systems query this for active multipliers instead of hardcoding shift checks.
// ============================================================================

const ShiftBonusSystem = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    config: {
        debugLogging: false
    },

    // ========================================================================
    // SUPPORTED BONUS TYPES
    // ========================================================================
    // These are the identifiers that can be used in shift scenario bonuses
    BONUS_TYPES: {
        // Loot modifiers
        EPIC_DROPS: 'epic_drops',
        RARE_DROPS: 'rare_drops',
        GOLD_DROPS: 'gold_drops',
        POTION_DROPS: 'potion_drops',
        FROZEN_ENEMY_LOOT: 'frozen_enemy_loot',

        // Combat modifiers
        XP_GAIN: 'xp_gain',
        DAMAGE_DEALT: 'damage_dealt',
        DAMAGE_TAKEN: 'damage_taken',

        // Movement modifiers
        MOVE_SPEED: 'move_speed',

        // Resource modifiers
        HEALTH_REGEN: 'health_regen',
        MANA_REGEN: 'mana_regen',
        STAMINA_REGEN: 'stamina_regen',

        // Special modifiers
        LIFESTEAL: 'lifesteal',
        SPECIAL_VISION: 'special_vision',
        BANISH_CHANCE: 'banish_chance'
    },

    // ========================================================================
    // CORE METHODS
    // ========================================================================

    /**
     * Get the current multiplier for a specific bonus type
     * @param {string} bonusType - The bonus identifier (e.g., 'epic_drops', 'gold_drops')
     * @returns {number} - Multiplier value (1.0 = no bonus, 2.0 = double, etc.)
     */
    getMultiplier(bonusType) {
        // No bonus if shift isn't active or no bonuses defined
        if (!game.shiftActive || !game.activeShift?.bonuses) {
            return 1.0;
        }

        // Find matching bonus in active shift
        const bonus = game.activeShift.bonuses.find(b => b.appliesTo === bonusType);

        if (bonus && this.config.debugLogging) {
            console.log(`[ShiftBonus] ${bonusType}: ${bonus.multiplier}x`);
        }

        return bonus?.multiplier || 1.0;
    },

    /**
     * Get an additive bonus value (for flat bonuses like lifesteal percentage)
     * @param {string} bonusType - The bonus identifier
     * @returns {number} - Additive value (0 = no bonus)
     */
    getAdditiveBonus(bonusType) {
        if (!game.shiftActive || !game.activeShift?.bonuses) {
            return 0;
        }

        const bonus = game.activeShift.bonuses.find(b => b.appliesTo === bonusType);
        return bonus?.additive || 0;
    },

    /**
     * Check if a specific bonus is currently active
     * @param {string} bonusType - The bonus identifier
     * @returns {boolean}
     */
    isActive(bonusType) {
        if (!game.shiftActive || !game.activeShift?.bonuses) {
            return false;
        }
        return game.activeShift.bonuses.some(b => b.appliesTo === bonusType);
    },

    /**
     * Check if any bonuses are currently active
     * @returns {boolean}
     */
    hasActiveBonuses() {
        return game.shiftActive && game.activeShift?.bonuses?.length > 0;
    },

    /**
     * Get all active bonuses for UI display
     * @returns {Array} - Array of active bonus objects
     */
    getActiveBonuses() {
        if (!game.shiftActive || !game.activeShift?.bonuses) {
            return [];
        }
        return game.activeShift.bonuses;
    },

    /**
     * Get a specific active bonus by type
     * @param {string} bonusType - The bonus identifier
     * @returns {object|null} - The bonus object or null
     */
    getBonus(bonusType) {
        if (!game.shiftActive || !game.activeShift?.bonuses) {
            return null;
        }
        return game.activeShift.bonuses.find(b => b.appliesTo === bonusType) || null;
    },

    // ========================================================================
    // UTILITY METHODS FOR COMMON OPERATIONS
    // ========================================================================

    /**
     * Apply multiplier to a base value
     * @param {number} baseValue - The original value
     * @param {string} bonusType - The bonus type to apply
     * @returns {number} - The modified value
     */
    applyMultiplier(baseValue, bonusType) {
        return baseValue * this.getMultiplier(bonusType);
    },

    /**
     * Apply multiplier to rarity weights object
     * Used by loot systems to modify drop chances
     * @param {object} weights - Object with rarity: weight pairs
     * @param {object} bonusMapping - Object mapping rarity to bonus type
     * @returns {object} - Modified weights object
     */
    applyToRarityWeights(weights, bonusMapping = {}) {
        const defaultMapping = {
            'epic': this.BONUS_TYPES.EPIC_DROPS,
            'rare': this.BONUS_TYPES.RARE_DROPS
        };

        const mapping = { ...defaultMapping, ...bonusMapping };
        const modifiedWeights = { ...weights };

        for (const [rarity, bonusType] of Object.entries(mapping)) {
            if (modifiedWeights[rarity] !== undefined) {
                modifiedWeights[rarity] *= this.getMultiplier(bonusType);
            }
        }

        return modifiedWeights;
    },

    // ========================================================================
    // DEBUG METHODS
    // ========================================================================

    /**
     * Log all currently active bonuses
     */
    logActiveBonuses() {
        const bonuses = this.getActiveBonuses();
        if (bonuses.length === 0) {
            console.log('[ShiftBonus] No active bonuses');
            return;
        }

        console.log('[ShiftBonus] Active bonuses:');
        bonuses.forEach(b => {
            console.log(`  ${b.name}: ${b.multiplier}x ${b.appliesTo} - ${b.description}`);
        });
    },

    /**
     * Get status summary for debugging
     * @returns {object}
     */
    getStatus() {
        return {
            shiftActive: game.shiftActive,
            shiftName: game.activeShift?.name || 'none',
            activeBonuses: this.getActiveBonuses().map(b => ({
                name: b.name,
                type: b.appliesTo,
                multiplier: b.multiplier
            }))
        };
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================
// ShiftBonusSystem is primarily a query interface, but we register it
// for consistency and potential future update needs

const ShiftBonusSystemDef = {
    name: 'shift-bonus-system',

    init() {
        if (ShiftBonusSystem.config.debugLogging) {
            console.log('[ShiftBonus] System initialized');
        }
    },

    update(dt) {
        // Currently no per-frame updates needed
        // Future: could add time-based bonus decay or scaling
    },

    cleanup() {
        // Nothing to clean up - bonuses are tied to shift state
    }
};

// Register with SystemManager (low priority - just provides data)
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('shift-bonus-system', ShiftBonusSystemDef, 5);
} else {
    console.warn('[ShiftBonus] SystemManager not found - running standalone');
}

// ============================================================================
// EXPORTS
// ============================================================================
window.ShiftBonusSystem = ShiftBonusSystem;

console.log('✅ Shift Bonus System loaded');
