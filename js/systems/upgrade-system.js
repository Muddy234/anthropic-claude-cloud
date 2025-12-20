// ============================================================================
// UPGRADE SYSTEM - Equipment Enhancement
// ============================================================================
//
// Economy Design: Equipment found in dungeons can be upgraded up to 3 times
// - +1: Common materials + T1 dungeon drops (15% stat boost)
// - +2: Uncommon materials + T2 dungeon drops (35% stat boost)
// - +3: Rare materials + Elite drops (60% stat boost)
//
// IMPORTANT: Upgraded gear is LOST FOREVER on death!
// ============================================================================

const UpgradeSystem = {

    // ========================================================================
    // CONSTANTS
    // ========================================================================

    MAX_UPGRADE_LEVEL: 3,

    // Stat multipliers for each upgrade level
    UPGRADE_MULTIPLIERS: {
        0: 1.00,  // Base
        1: 1.15,  // +1: 15% boost
        2: 1.35,  // +2: 35% boost
        3: 1.60   // +3: 60% boost
    },

    // ========================================================================
    // UPGRADE RECIPES BY MATERIAL LINE
    // ========================================================================

    UPGRADE_RECIPES: {
        // Metal weapons (swords, axes, maces, daggers) and armor (plate, chain, shields)
        metal: {
            1: {
                overworldMaterials: { iron_ore: 2, coal: 1 },
                dungeonDrops: { tier: 1, count: 3 }
            },
            2: {
                overworldMaterials: { steel_ingot: 2, coal: 1 },
                dungeonDrops: { tier: 2, count: 2 }
            },
            3: {
                overworldMaterials: { mithril_bar: 1, coal: 2 },
                dungeonDrops: { tier: 3, count: 1, bossOnly: true }
            }
        },

        // Wood weapons (bows, crossbows)
        wood: {
            1: {
                overworldMaterials: { timber: 2, wax: 1 },
                dungeonDrops: { tier: 1, count: 3 }
            },
            2: {
                overworldMaterials: { treated_wood: 2, wax: 1 },
                dungeonDrops: { tier: 2, count: 2 }
            },
            3: {
                overworldMaterials: { ironwood: 1, wax: 2 },
                dungeonDrops: { tier: 3, count: 1, bossOnly: true }
            }
        },

        // Cloth weapons (staves, wands) and armor (robes)
        cloth: {
            1: {
                overworldMaterials: { cloth_bolts: 2, binding_thread: 1 },
                dungeonDrops: { tier: 1, count: 3 }
            },
            2: {
                overworldMaterials: { woven_fabric: 2, binding_thread: 1 },
                dungeonDrops: { tier: 2, count: 2 }
            },
            3: {
                overworldMaterials: { enchanted_silk: 1, binding_thread: 2 },
                dungeonDrops: { tier: 3, count: 1, bossOnly: true }
            }
        },

        // Leather armor (light armor, accessories)
        leather: {
            1: {
                overworldMaterials: { leather_scraps: 2, binding_thread: 1 },
                dungeonDrops: { tier: 1, count: 3 }
            },
            2: {
                overworldMaterials: { cured_leather: 2, binding_thread: 1 },
                dungeonDrops: { tier: 2, count: 2 }
            },
            3: {
                overworldMaterials: { hardened_hide: 1, binding_thread: 2 },
                dungeonDrops: { tier: 3, count: 1, bossOnly: true }
            }
        }
    },

    // Equipment type to material line mapping
    EQUIPMENT_MATERIAL_LINES: {
        // Weapons
        sword: 'metal',
        axe: 'metal',
        mace: 'metal',
        dagger: 'metal',
        bow: 'wood',
        crossbow: 'wood',
        staff: 'cloth',
        wand: 'cloth',

        // Armor
        plate: 'metal',
        chainmail: 'metal',
        shield: 'metal',
        leather: 'leather',
        light_armor: 'leather',
        robe: 'cloth',
        cloth_armor: 'cloth'
    },

    // ========================================================================
    // CORE METHODS
    // ========================================================================

    /**
     * Get the material line for an equipment item
     * @param {Object} item - The equipment item
     * @returns {string|null} - Material line or null
     */
    getMaterialLine(item) {
        if (!item) return null;

        // Check by weaponType or armorType
        const type = item.weaponType || item.armorType || item.subtype;
        if (type && this.EQUIPMENT_MATERIAL_LINES[type]) {
            return this.EQUIPMENT_MATERIAL_LINES[type];
        }

        // Fallback: check item type
        if (item.type === 'weapon') {
            // Default melee weapons to metal
            return 'metal';
        }

        if (item.type === 'armor') {
            // Try to infer from slot
            if (item.slot === 'CHEST' || item.slot === 'HEAD' || item.slot === 'FEET') {
                return 'metal';  // Default to metal armor
            }
        }

        return null;
    },

    /**
     * Get the current upgrade level of an item
     * @param {Object} item
     * @returns {number}
     */
    getUpgradeLevel(item) {
        return item?.upgradeLevel || 0;
    },

    /**
     * Get the upgrade recipe for an item at the next level
     * @param {Object} item
     * @returns {Object|null}
     */
    getUpgradeRecipe(item) {
        const currentLevel = this.getUpgradeLevel(item);
        const nextLevel = currentLevel + 1;

        if (nextLevel > this.MAX_UPGRADE_LEVEL) {
            return null;  // Already at max
        }

        const materialLine = this.getMaterialLine(item);
        if (!materialLine) {
            console.warn('[UpgradeSystem] Could not determine material line for item:', item);
            return null;
        }

        const recipes = this.UPGRADE_RECIPES[materialLine];
        if (!recipes || !recipes[nextLevel]) {
            console.warn(`[UpgradeSystem] No recipe for ${materialLine} +${nextLevel}`);
            return null;
        }

        return {
            ...recipes[nextLevel],
            materialLine,
            targetLevel: nextLevel
        };
    },

    /**
     * Check if player has the required materials for an upgrade
     * @param {Object} item - The item to upgrade
     * @param {Array} inventory - Player's inventory
     * @returns {Object} - { canUpgrade: bool, missing: [], dungeonDropCount: number }
     */
    checkUpgradeRequirements(item, inventory) {
        const recipe = this.getUpgradeRecipe(item);
        if (!recipe) {
            return { canUpgrade: false, missing: ['Already at max level or invalid item'] };
        }

        const missing = [];
        const have = {};

        // Check overworld materials
        for (const [materialId, required] of Object.entries(recipe.overworldMaterials)) {
            const count = this._countInInventory(inventory, materialId);
            have[materialId] = count;

            if (count < required) {
                const mat = getRawMaterial ? getRawMaterial(materialId) : { name: materialId };
                missing.push(`${mat?.name || materialId}: ${count}/${required}`);
            }
        }

        // Check dungeon drops (any T1/T2/Elite drop counts)
        const dungeonDropCount = this._countDungeonDrops(inventory, recipe.dungeonDrops.tier);
        if (dungeonDropCount < recipe.dungeonDrops.count) {
            const tierName = recipe.dungeonDrops.tier === 3 ? 'Elite Boss' :
                           `Tier ${recipe.dungeonDrops.tier}`;
            missing.push(`${tierName} drops: ${dungeonDropCount}/${recipe.dungeonDrops.count}`);
        }

        return {
            canUpgrade: missing.length === 0,
            missing,
            recipe,
            have,
            dungeonDropCount
        };
    },

    /**
     * Perform the upgrade on an item
     * @param {Object} item - The item to upgrade
     * @param {Array} inventory - Player's inventory (will be modified)
     * @returns {Object} - { success: bool, item: Object, message: string }
     */
    upgradeItem(item, inventory) {
        const check = this.checkUpgradeRequirements(item, inventory);
        if (!check.canUpgrade) {
            return {
                success: false,
                item: null,
                message: `Missing materials: ${check.missing.join(', ')}`
            };
        }

        const recipe = check.recipe;

        // Consume overworld materials
        for (const [materialId, required] of Object.entries(recipe.overworldMaterials)) {
            this._removeFromInventory(inventory, materialId, required);
        }

        // Consume dungeon drops
        this._removeDungeonDrops(inventory, recipe.dungeonDrops.tier, recipe.dungeonDrops.count);

        // Apply the upgrade
        const oldLevel = this.getUpgradeLevel(item);
        const newLevel = oldLevel + 1;

        item.upgradeLevel = newLevel;

        // Apply stat multipliers
        this._applyUpgradeStats(item, newLevel);

        // Update item name to show upgrade level
        if (!item.baseName) {
            item.baseName = item.name;
        }
        item.name = `${item.baseName} +${newLevel}`;

        console.log(`[UpgradeSystem] Upgraded ${item.baseName} to +${newLevel}`);

        return {
            success: true,
            item,
            message: `Upgraded to ${item.name}!`
        };
    },

    /**
     * Apply stat multipliers based on upgrade level
     * @private
     */
    _applyUpgradeStats(item, level) {
        const multiplier = this.UPGRADE_MULTIPLIERS[level];

        // Store base stats if not already stored
        if (!item.baseStats) {
            item.baseStats = {};

            // Weapons
            if (item.damage !== undefined) item.baseStats.damage = item.damage;
            if (item.minDamage !== undefined) item.baseStats.minDamage = item.minDamage;
            if (item.maxDamage !== undefined) item.baseStats.maxDamage = item.maxDamage;

            // Armor
            if (item.pDef !== undefined) item.baseStats.pDef = item.pDef;
            if (item.mDef !== undefined) item.baseStats.mDef = item.mDef;
            if (item.defense !== undefined) item.baseStats.defense = item.defense;

            // Other stats
            if (item.attackSpeed !== undefined) item.baseStats.attackSpeed = item.attackSpeed;
            if (item.critChance !== undefined) item.baseStats.critChance = item.critChance;
            if (item.critDamage !== undefined) item.baseStats.critDamage = item.critDamage;
        }

        // Apply multiplier to all base stats
        const baseStats = item.baseStats;

        if (baseStats.damage !== undefined) {
            item.damage = Math.round(baseStats.damage * multiplier);
        }
        if (baseStats.minDamage !== undefined) {
            item.minDamage = Math.round(baseStats.minDamage * multiplier);
        }
        if (baseStats.maxDamage !== undefined) {
            item.maxDamage = Math.round(baseStats.maxDamage * multiplier);
        }
        if (baseStats.pDef !== undefined) {
            item.pDef = Math.round(baseStats.pDef * multiplier);
        }
        if (baseStats.mDef !== undefined) {
            item.mDef = Math.round(baseStats.mDef * multiplier);
        }
        if (baseStats.defense !== undefined) {
            item.defense = Math.round(baseStats.defense * multiplier);
        }

        // Smaller multiplier for speed/crit (avoid balance issues)
        const smallMultiplier = 1 + ((multiplier - 1) * 0.5);
        if (baseStats.attackSpeed !== undefined) {
            item.attackSpeed = baseStats.attackSpeed * smallMultiplier;
        }
        if (baseStats.critChance !== undefined) {
            item.critChance = Math.min(1, baseStats.critChance * smallMultiplier);
        }
        if (baseStats.critDamage !== undefined) {
            item.critDamage = baseStats.critDamage * smallMultiplier;
        }
    },

    /**
     * Get display info for an upgrade
     * @param {Object} item
     * @returns {Object}
     */
    getUpgradePreview(item) {
        const currentLevel = this.getUpgradeLevel(item);
        const nextLevel = currentLevel + 1;

        if (nextLevel > this.MAX_UPGRADE_LEVEL) {
            return { maxed: true, message: 'Maximum upgrade level reached' };
        }

        const currentMultiplier = this.UPGRADE_MULTIPLIERS[currentLevel];
        const nextMultiplier = this.UPGRADE_MULTIPLIERS[nextLevel];
        const recipe = this.getUpgradeRecipe(item);

        const statChanges = [];
        const baseStats = item.baseStats || item;

        // Calculate stat previews
        if (baseStats.damage !== undefined) {
            const current = Math.round(baseStats.damage * currentMultiplier);
            const next = Math.round(baseStats.damage * nextMultiplier);
            statChanges.push({ stat: 'Damage', current, next });
        }
        if (baseStats.pDef !== undefined) {
            const current = Math.round(baseStats.pDef * currentMultiplier);
            const next = Math.round(baseStats.pDef * nextMultiplier);
            statChanges.push({ stat: 'Physical Def', current, next });
        }
        if (baseStats.mDef !== undefined) {
            const current = Math.round(baseStats.mDef * currentMultiplier);
            const next = Math.round(baseStats.mDef * nextMultiplier);
            statChanges.push({ stat: 'Magic Def', current, next });
        }

        return {
            maxed: false,
            currentLevel,
            nextLevel,
            recipe,
            statChanges,
            multiplierChange: `${Math.round(currentMultiplier * 100)}% → ${Math.round(nextMultiplier * 100)}%`
        };
    },

    // ========================================================================
    // INVENTORY HELPERS
    // ========================================================================

    /**
     * Count items in inventory
     * @private
     */
    _countInInventory(inventory, itemId) {
        if (!inventory) return 0;

        let count = 0;
        for (const item of inventory) {
            if (item && item.id === itemId) {
                count += item.count || 1;
            }
        }
        return count;
    },

    /**
     * Count dungeon drops of a specific tier
     * @private
     */
    _countDungeonDrops(inventory, tier) {
        if (!inventory) return 0;

        let count = 0;
        for (const item of inventory) {
            if (item && item.type === 'dungeon_craft_drop' && item.tier === tier) {
                count += item.count || 1;
            }
        }
        return count;
    },

    /**
     * Remove items from inventory
     * @private
     */
    _removeFromInventory(inventory, itemId, amount) {
        let remaining = amount;

        for (let i = inventory.length - 1; i >= 0 && remaining > 0; i--) {
            const item = inventory[i];
            if (item && item.id === itemId) {
                const itemCount = item.count || 1;

                if (itemCount <= remaining) {
                    remaining -= itemCount;
                    inventory.splice(i, 1);
                } else {
                    item.count = itemCount - remaining;
                    remaining = 0;
                }
            }
        }

        return remaining === 0;
    },

    /**
     * Remove dungeon drops from inventory
     * @private
     */
    _removeDungeonDrops(inventory, tier, amount) {
        let remaining = amount;

        for (let i = inventory.length - 1; i >= 0 && remaining > 0; i--) {
            const item = inventory[i];
            if (item && item.type === 'dungeon_craft_drop' && item.tier === tier) {
                const itemCount = item.count || 1;

                if (itemCount <= remaining) {
                    remaining -= itemCount;
                    inventory.splice(i, 1);
                } else {
                    item.count = itemCount - remaining;
                    remaining = 0;
                }
            }
        }

        return remaining === 0;
    },

    // ========================================================================
    // EQUIPMENT LISTING
    // ========================================================================

    /**
     * Get all upgradeable items from inventory
     * @param {Array} inventory
     * @returns {Array}
     */
    getUpgradeableItems(inventory) {
        if (!inventory) return [];

        return inventory.filter(item => {
            if (!item) return false;
            if (item.type !== 'weapon' && item.type !== 'armor') return false;

            const level = this.getUpgradeLevel(item);
            return level < this.MAX_UPGRADE_LEVEL;
        });
    },

    /**
     * Get all fully upgraded items
     * @param {Array} inventory
     * @returns {Array}
     */
    getMaxUpgradedItems(inventory) {
        if (!inventory) return [];

        return inventory.filter(item => {
            if (!item) return false;
            return this.getUpgradeLevel(item) >= this.MAX_UPGRADE_LEVEL;
        });
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.UpgradeSystem = UpgradeSystem;

console.log('[UpgradeSystem] Equipment upgrade system loaded');
console.log('  - Max upgrade level: +3');
console.log('  - Multipliers: +1 (15%), +2 (35%), +3 (60%)');
