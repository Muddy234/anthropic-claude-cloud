// ============================================================================
// BOON SYSTEM (Soul & Body Model)
// ============================================================================
// Session-based power-ups acquired at shrines
// Boons are LOST on death - they provide temporary run bonuses
//
// Formula: Power = (Gear_Base × Skill_Mult) × (1 + Boon_Bonus)
// Boons stack multiplicatively: (1 + Boon1) × (1 + Boon2) × ...
// ============================================================================

// ============================================================================
// CONFIGURATION
// ============================================================================

const BOON_CONFIG = {
    // Max number of boons player can hold
    maxBoons: 6,

    // Shrine interaction settings
    shrineBoonsOffered: 3,  // How many boons shrine offers to choose from

    // Session reset
    clearOnDeath: true,     // Boons are lost on death
};

// ============================================================================
// BOON DEFINITIONS (MVP: 4 Starter Boons)
// ============================================================================

const BOONS = {
    // === DEFENSIVE BOONS ===
    vitality_surge: {
        id: 'vitality_surge',
        name: 'Vitality Surge',
        description: '+20% Max HP',
        icon: 'V',
        color: '#e74c3c',
        tier: 1,
        stackable: true,
        maxStacks: 3,
        effect: {
            type: 'stat_percent',
            stat: 'maxHp',
            value: 0.20  // +20%
        },
        // Returns the bonus for a given stack count
        getBonus: (stacks = 1) => ({
            maxHpPercent: 0.20 * stacks
        })
    },

    iron_will: {
        id: 'iron_will',
        name: 'Iron Will',
        description: '+15% Damage Reduction',
        icon: 'I',
        color: '#3498db',
        tier: 1,
        stackable: true,
        maxStacks: 3,
        effect: {
            type: 'stat_percent',
            stat: 'damageReduction',
            value: 0.15  // +15%
        },
        getBonus: (stacks = 1) => ({
            damageReduction: 0.15 * stacks
        })
    },

    // === OFFENSIVE BOONS ===
    quick_reflexes: {
        id: 'quick_reflexes',
        name: 'Quick Reflexes',
        description: '+10% Attack Speed',
        icon: 'Q',
        color: '#f1c40f',
        tier: 1,
        stackable: true,
        maxStacks: 3,
        effect: {
            type: 'stat_percent',
            stat: 'attackSpeed',
            value: 0.10  // +10%
        },
        getBonus: (stacks = 1) => ({
            attackSpeed: 0.10 * stacks
        })
    },

    fortunes_favor: {
        id: 'fortunes_favor',
        name: "Fortune's Favor",
        description: '+25% Gold & Skill XP',
        icon: 'F',
        color: '#9b59b6',
        tier: 1,
        stackable: true,
        maxStacks: 2,
        effect: {
            type: 'stat_percent',
            stat: 'goldXpBonus',
            value: 0.25  // +25%
        },
        getBonus: (stacks = 1) => ({
            goldBonus: 0.25 * stacks,
            xpBonus: 0.25 * stacks
        })
    }
};

// ============================================================================
// BOON SYSTEM STATE
// ============================================================================

const BoonSystem = {
    // Currently active boons: { boonId: stackCount }
    activeBoons: {},

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize boon system for a new session
     */
    init() {
        this.activeBoons = {};
        console.log('[BoonSystem] Initialized (no active boons)');
    },

    /**
     * Clear all boons (on death or new game)
     */
    clearBoons() {
        this.activeBoons = {};
        console.log('[BoonSystem] All boons cleared');
    },

    // ========================================================================
    // BOON MANAGEMENT
    // ========================================================================

    /**
     * Grant a boon to the player
     * @param {string} boonId - ID of the boon to grant
     * @returns {boolean} Success
     */
    grantBoon(boonId) {
        const boon = BOONS[boonId];
        if (!boon) {
            console.warn(`[BoonSystem] Unknown boon: ${boonId}`);
            return false;
        }

        // Check max boons (count unique boons)
        const uniqueBoons = Object.keys(this.activeBoons).length;
        if (!this.activeBoons[boonId] && uniqueBoons >= BOON_CONFIG.maxBoons) {
            console.warn(`[BoonSystem] Max boons reached (${BOON_CONFIG.maxBoons})`);
            if (typeof addMessage === 'function') {
                addMessage('Cannot accept more boons!', 'warning');
            }
            return false;
        }

        // Add or stack the boon
        if (this.activeBoons[boonId]) {
            // Already have this boon - try to stack
            if (!boon.stackable) {
                console.log(`[BoonSystem] ${boon.name} is not stackable`);
                if (typeof addMessage === 'function') {
                    addMessage(`${boon.name} cannot stack!`, 'info');
                }
                return false;
            }

            if (this.activeBoons[boonId] >= boon.maxStacks) {
                console.log(`[BoonSystem] ${boon.name} at max stacks (${boon.maxStacks})`);
                if (typeof addMessage === 'function') {
                    addMessage(`${boon.name} at maximum stacks!`, 'info');
                }
                return false;
            }

            this.activeBoons[boonId]++;
            console.log(`[BoonSystem] ${boon.name} stacked to ${this.activeBoons[boonId]}`);
        } else {
            // New boon
            this.activeBoons[boonId] = 1;
            console.log(`[BoonSystem] Granted ${boon.name}`);
        }

        // Notify player
        if (typeof addMessage === 'function') {
            const stacks = this.activeBoons[boonId];
            const stackText = stacks > 1 ? ` (x${stacks})` : '';
            addMessage(`Boon acquired: ${boon.name}${stackText}`, 'reward');
        }

        // Recalculate player stats with new boon
        if (typeof recalculatePlayerStats === 'function' && game.player) {
            recalculatePlayerStats(game.player);
        }

        return true;
    },

    /**
     * Remove a boon from the player
     * @param {string} boonId - ID of the boon to remove
     * @param {boolean} removeAllStacks - Remove all stacks or just one
     */
    removeBoon(boonId, removeAllStacks = true) {
        if (!this.activeBoons[boonId]) return;

        const boon = BOONS[boonId];
        if (removeAllStacks) {
            delete this.activeBoons[boonId];
        } else {
            this.activeBoons[boonId]--;
            if (this.activeBoons[boonId] <= 0) {
                delete this.activeBoons[boonId];
            }
        }

        console.log(`[BoonSystem] Removed ${boon?.name || boonId}`);

        // Recalculate stats
        if (typeof recalculatePlayerStats === 'function' && game.player) {
            recalculatePlayerStats(game.player);
        }
    },

    // ========================================================================
    // BONUS CALCULATION
    // ========================================================================

    /**
     * Get total bonus from all active boons for a specific stat
     * Boons stack multiplicatively: (1 + boon1) × (1 + boon2) × ...
     * @param {string} statName - The stat to get bonus for
     * @returns {number} Total multiplier (1.0 = no bonus)
     */
    getTotalBonus(statName) {
        let multiplier = 1.0;

        for (const [boonId, stacks] of Object.entries(this.activeBoons)) {
            const boon = BOONS[boonId];
            if (!boon) continue;

            const bonuses = boon.getBonus(stacks);

            // Check various stat mappings
            switch (statName) {
                case 'maxHp':
                case 'maxHpPercent':
                    if (bonuses.maxHpPercent) {
                        multiplier *= (1 + bonuses.maxHpPercent);
                    }
                    break;

                case 'damageReduction':
                    if (bonuses.damageReduction) {
                        // Damage reduction is additive then applied
                        multiplier += bonuses.damageReduction;
                    }
                    break;

                case 'attackSpeed':
                    if (bonuses.attackSpeed) {
                        multiplier *= (1 + bonuses.attackSpeed);
                    }
                    break;

                case 'gold':
                case 'goldBonus':
                    if (bonuses.goldBonus) {
                        multiplier *= (1 + bonuses.goldBonus);
                    }
                    break;

                case 'xp':
                case 'skillXp':
                case 'xpBonus':
                    if (bonuses.xpBonus) {
                        multiplier *= (1 + bonuses.xpBonus);
                    }
                    break;

                case 'damage':
                    // Future boons could add damage bonuses
                    if (bonuses.damage) {
                        multiplier *= (1 + bonuses.damage);
                    }
                    break;
            }
        }

        return multiplier;
    },

    /**
     * Get all bonuses as an object
     * @returns {Object} All stat bonuses
     */
    getAllBonuses() {
        return {
            maxHp: this.getTotalBonus('maxHp'),
            damageReduction: this.getTotalBonus('damageReduction'),
            attackSpeed: this.getTotalBonus('attackSpeed'),
            gold: this.getTotalBonus('gold'),
            xp: this.getTotalBonus('xp'),
            damage: this.getTotalBonus('damage')
        };
    },

    // ========================================================================
    // SHRINE INTERACTION
    // ========================================================================

    /**
     * Get random boons for a shrine offering
     * @param {number} count - Number of boons to offer
     * @returns {Array} Array of boon IDs
     */
    getShrineBoons(count = BOON_CONFIG.shrineBoonsOffered) {
        const availableBoons = Object.keys(BOONS).filter(boonId => {
            const boon = BOONS[boonId];
            const currentStacks = this.activeBoons[boonId] || 0;

            // Exclude boons at max stacks
            if (boon.stackable && currentStacks >= boon.maxStacks) {
                return false;
            }
            if (!boon.stackable && currentStacks > 0) {
                return false;
            }

            return true;
        });

        // Shuffle and pick
        const shuffled = [...availableBoons].sort(() => Math.random() - 0.5);
        return shuffled.slice(0, Math.min(count, shuffled.length));
    },

    // ========================================================================
    // STATE QUERY
    // ========================================================================

    /**
     * Check if player has a specific boon
     * @param {string} boonId - Boon ID to check
     * @returns {number} Stack count (0 if not owned)
     */
    hasBoon(boonId) {
        return this.activeBoons[boonId] || 0;
    },

    /**
     * Get list of active boons for UI
     * @returns {Array} Array of { boon, stacks }
     */
    getActiveBoonList() {
        return Object.entries(this.activeBoons).map(([boonId, stacks]) => ({
            boon: BOONS[boonId],
            stacks
        })).filter(entry => entry.boon);
    }
};

// ============================================================================
// INTEGRATION WITH PLAYER STATS
// ============================================================================

/**
 * Apply boon bonuses to player HP calculation
 * Called by recalculatePlayerStats in player.js
 */
function applyBoonHpBonus(baseHp) {
    const hpMultiplier = BoonSystem.getTotalBonus('maxHp');
    return Math.floor(baseHp * hpMultiplier);
}

/**
 * Apply boon damage reduction to incoming damage
 * Called by applyDamage in combat-system.js
 */
function applyBoonDamageReduction(damage) {
    const reductionBonus = BoonSystem.getTotalBonus('damageReduction');
    // reductionBonus is additive, so 1.15 = 15% reduction
    const reduction = Math.max(0, reductionBonus - 1.0);
    return Math.floor(damage * (1 - reduction));
}

/**
 * Apply boon attack speed bonus
 * Called by getAttackCooldown functions
 */
function applyBoonAttackSpeed(baseCooldown) {
    const speedMultiplier = BoonSystem.getTotalBonus('attackSpeed');
    // Higher multiplier = faster attacks = lower cooldown
    return baseCooldown / speedMultiplier;
}

/**
 * Apply boon gold bonus
 * Called when picking up gold
 */
function applyBoonGoldBonus(baseGold) {
    const goldMultiplier = BoonSystem.getTotalBonus('gold');
    return Math.floor(baseGold * goldMultiplier);
}

/**
 * Apply boon XP bonus to skill XP
 * Called by awardMeleeXp, awardRangedXp, etc.
 */
function applyBoonXpBonus(baseXp) {
    const xpMultiplier = BoonSystem.getTotalBonus('xp');
    return Math.floor(baseXp * xpMultiplier);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.BOON_CONFIG = BOON_CONFIG;
window.BOONS = BOONS;
window.BoonSystem = BoonSystem;

window.applyBoonHpBonus = applyBoonHpBonus;
window.applyBoonDamageReduction = applyBoonDamageReduction;
window.applyBoonAttackSpeed = applyBoonAttackSpeed;
window.applyBoonGoldBonus = applyBoonGoldBonus;
window.applyBoonXpBonus = applyBoonXpBonus;

console.log('✓ Boon system loaded (Soul & Body Model)');
console.log(`  ${Object.keys(BOONS).length} boons available`);
