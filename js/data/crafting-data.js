// === js/data/crafting-data.js ===
// SURVIVAL EXTRACTION UPDATE: Crafting recipes and requirements

// ============================================================================
// CRAFTING CATEGORIES
// ============================================================================

const CRAFT_CATEGORIES = {
    weapons: {
        id: 'weapons',
        name: 'Weapons',
        icon: '⚔️',
        description: 'Forge powerful weapons'
    },
    armor: {
        id: 'armor',
        name: 'Armor',
        icon: '🛡️',
        description: 'Craft protective gear'
    },
    consumables: {
        id: 'consumables',
        name: 'Consumables',
        icon: '🧪',
        description: 'Brew potions and create tools'
    },
    upgrades: {
        id: 'upgrades',
        name: 'Upgrades',
        icon: '⬆️',
        description: 'Enhance existing equipment'
    },
    special: {
        id: 'special',
        name: 'Special',
        icon: '✨',
        description: 'Unique and powerful items'
    }
};

// ============================================================================
// CRAFTING RECIPES
// ============================================================================

const CRAFTING_RECIPES = {

    // ========================================================================
    // WEAPONS - TIER 1 (Floor 1-2 materials)
    // ========================================================================

    iron_sword: {
        id: 'iron_sword',
        name: 'Iron Sword',
        category: 'weapons',
        tier: 1,
        description: 'A sturdy blade forged from Chasm Iron',
        materials: [
            { id: 'chasm_iron', count: 10 },
            { id: 'rough_leather', count: 3 }
        ],
        goldCost: 50,
        craftTime: 2, // seconds
        result: {
            type: 'weapon',
            weaponType: 'sword',
            name: 'Iron Sword',
            damage: 15,
            attackSpeed: 1.0,
            rarity: 'uncommon'
        },
        unlocked: true
    },

    iron_axe: {
        id: 'iron_axe',
        name: 'Iron Battleaxe',
        category: 'weapons',
        tier: 1,
        description: 'A heavy axe that cleaves through enemies',
        materials: [
            { id: 'chasm_iron', count: 15 },
            { id: 'dense_stone', count: 5 }
        ],
        goldCost: 75,
        craftTime: 3,
        result: {
            type: 'weapon',
            weaponType: 'axe',
            name: 'Iron Battleaxe',
            damage: 22,
            attackSpeed: 0.7,
            rarity: 'uncommon'
        },
        unlocked: true
    },

    crystal_staff: {
        id: 'crystal_staff',
        name: 'Crystal Staff',
        category: 'weapons',
        tier: 1,
        description: 'A staff imbued with crystal energy',
        materials: [
            { id: 'crystal_shard', count: 8 },
            { id: 'chasm_iron', count: 5 }
        ],
        goldCost: 80,
        craftTime: 3,
        result: {
            type: 'weapon',
            weaponType: 'staff',
            name: 'Crystal Staff',
            damage: 12,
            attackSpeed: 1.2,
            magicDamage: 18,
            rarity: 'uncommon'
        },
        unlocked: true
    },

    // ========================================================================
    // WEAPONS - TIER 2 (Floor 2-3 materials)
    // ========================================================================

    ember_blade: {
        id: 'ember_blade',
        name: 'Ember Blade',
        category: 'weapons',
        tier: 2,
        description: 'A sword wreathed in eternal flame',
        materials: [
            { id: 'emberstone', count: 8 },
            { id: 'chasm_iron', count: 12 }
        ],
        goldCost: 150,
        craftTime: 4,
        result: {
            type: 'weapon',
            weaponType: 'sword',
            name: 'Ember Blade',
            damage: 20,
            attackSpeed: 1.0,
            fireDamage: 10,
            rarity: 'rare'
        },
        prerequisite: 'guardian_floor_1'
    },

    shadow_dagger: {
        id: 'shadow_dagger',
        name: 'Shadow Dagger',
        category: 'weapons',
        tier: 2,
        description: 'A blade that strikes from the shadows',
        materials: [
            { id: 'shadow_thread', count: 10 },
            { id: 'corrupted_bone', count: 5 }
        ],
        goldCost: 175,
        craftTime: 4,
        result: {
            type: 'weapon',
            weaponType: 'dagger',
            name: 'Shadow Dagger',
            damage: 12,
            attackSpeed: 1.8,
            critChance: 0.15,
            rarity: 'rare'
        },
        prerequisite: 'guardian_floor_1'
    },

    // ========================================================================
    // WEAPONS - TIER 3 (Floor 3-4 materials)
    // ========================================================================

    living_bow: {
        id: 'living_bow',
        name: 'Living Bow',
        category: 'weapons',
        tier: 3,
        description: 'A bow that grows stronger with use',
        materials: [
            { id: 'living_crystal', count: 6 },
            { id: 'shadow_thread', count: 8 }
        ],
        goldCost: 300,
        craftTime: 5,
        result: {
            type: 'weapon',
            weaponType: 'bow',
            name: 'Living Bow',
            damage: 18,
            attackSpeed: 1.3,
            range: 8,
            lifesteal: 0.05,
            rarity: 'rare'
        },
        prerequisite: 'guardian_floor_2'
    },

    frost_maul: {
        id: 'frost_maul',
        name: 'Frost Maul',
        category: 'weapons',
        tier: 3,
        description: 'A massive hammer that freezes on impact',
        materials: [
            { id: 'frost_essence', count: 10 },
            { id: 'dense_stone', count: 15 }
        ],
        goldCost: 350,
        craftTime: 6,
        result: {
            type: 'weapon',
            weaponType: 'hammer',
            name: 'Frost Maul',
            damage: 35,
            attackSpeed: 0.5,
            slowOnHit: 0.3,
            rarity: 'rare'
        },
        prerequisite: 'guardian_floor_2'
    },

    // ========================================================================
    // WEAPONS - TIER 4 (Floor 4-5 materials)
    // ========================================================================

    void_blade: {
        id: 'void_blade',
        name: 'Void Blade',
        category: 'weapons',
        tier: 4,
        description: 'A blade that cuts through reality itself',
        materials: [
            { id: 'void_metal', count: 12 },
            { id: 'arcane_dust', count: 8 }
        ],
        goldCost: 500,
        craftTime: 8,
        result: {
            type: 'weapon',
            weaponType: 'sword',
            name: 'Void Blade',
            damage: 30,
            attackSpeed: 1.1,
            armorPenetration: 0.25,
            rarity: 'epic'
        },
        prerequisite: 'guardian_floor_3'
    },

    arcane_staff: {
        id: 'arcane_staff',
        name: 'Arcane Staff',
        category: 'weapons',
        tier: 4,
        description: 'Channels pure arcane energy',
        materials: [
            { id: 'arcane_dust', count: 15 },
            { id: 'living_crystal', count: 8 }
        ],
        goldCost: 550,
        craftTime: 8,
        result: {
            type: 'weapon',
            weaponType: 'staff',
            name: 'Arcane Staff',
            damage: 15,
            attackSpeed: 1.0,
            magicDamage: 40,
            manaRegen: 2,
            rarity: 'epic'
        },
        prerequisite: 'guardian_floor_3'
    },

    // ========================================================================
    // WEAPONS - TIER 5 (Floor 5-6 materials)
    // ========================================================================

    dragon_slayer: {
        id: 'dragon_slayer',
        name: 'Dragon Slayer',
        category: 'weapons',
        tier: 5,
        description: 'A legendary blade forged from dragon scales',
        materials: [
            { id: 'dragon_scale', count: 10 },
            { id: 'abyssal_ore', count: 8 },
            { id: 'void_metal', count: 5 }
        ],
        goldCost: 1000,
        craftTime: 12,
        result: {
            type: 'weapon',
            weaponType: 'greatsword',
            name: 'Dragon Slayer',
            damage: 50,
            attackSpeed: 0.8,
            bossBonus: 0.25,
            rarity: 'epic'
        },
        prerequisite: 'guardian_floor_4'
    },

    soul_reaper: {
        id: 'soul_reaper',
        name: 'Soul Reaper',
        category: 'weapons',
        tier: 5,
        description: 'Harvests the souls of fallen enemies',
        materials: [
            { id: 'soul_fragment', count: 8 },
            { id: 'corrupted_bone', count: 15 },
            { id: 'shadow_thread', count: 10 }
        ],
        goldCost: 1200,
        craftTime: 12,
        result: {
            type: 'weapon',
            weaponType: 'scythe',
            name: 'Soul Reaper',
            damage: 40,
            attackSpeed: 0.9,
            lifesteal: 0.15,
            soulHarvest: true,
            rarity: 'epic'
        },
        prerequisite: 'guardian_floor_4'
    },

    // ========================================================================
    // ARMOR - TIER 1-2
    // ========================================================================

    iron_armor: {
        id: 'iron_armor',
        name: 'Iron Armor',
        category: 'armor',
        tier: 1,
        description: 'Basic protective gear',
        materials: [
            { id: 'chasm_iron', count: 20 },
            { id: 'rough_leather', count: 5 }
        ],
        goldCost: 100,
        craftTime: 4,
        result: {
            type: 'armor',
            armorType: 'heavy',
            name: 'Iron Armor',
            defense: 15,
            rarity: 'uncommon'
        },
        unlocked: true
    },

    leather_armor: {
        id: 'leather_armor',
        name: 'Reinforced Leather',
        category: 'armor',
        tier: 1,
        description: 'Light armor for mobile fighters',
        materials: [
            { id: 'rough_leather', count: 15 },
            { id: 'crystal_shard', count: 3 }
        ],
        goldCost: 80,
        craftTime: 3,
        result: {
            type: 'armor',
            armorType: 'light',
            name: 'Reinforced Leather',
            defense: 8,
            evasion: 0.1,
            rarity: 'uncommon'
        },
        unlocked: true
    },

    ember_guard: {
        id: 'ember_guard',
        name: 'Ember Guard',
        category: 'armor',
        tier: 2,
        description: 'Armor infused with fire resistance',
        materials: [
            { id: 'emberstone', count: 12 },
            { id: 'chasm_iron', count: 15 }
        ],
        goldCost: 200,
        craftTime: 5,
        result: {
            type: 'armor',
            armorType: 'heavy',
            name: 'Ember Guard',
            defense: 20,
            fireResist: 0.3,
            rarity: 'rare'
        },
        prerequisite: 'guardian_floor_1'
    },

    shadow_cloak: {
        id: 'shadow_cloak',
        name: 'Shadow Cloak',
        category: 'armor',
        tier: 2,
        description: 'A cloak woven from shadow threads',
        materials: [
            { id: 'shadow_thread', count: 15 },
            { id: 'corrupted_bone', count: 5 }
        ],
        goldCost: 180,
        craftTime: 4,
        result: {
            type: 'armor',
            armorType: 'light',
            name: 'Shadow Cloak',
            defense: 10,
            evasion: 0.2,
            stealth: true,
            rarity: 'rare'
        },
        prerequisite: 'guardian_floor_1'
    },

    // ========================================================================
    // ARMOR - TIER 3-4
    // ========================================================================

    crystal_plate: {
        id: 'crystal_plate',
        name: 'Crystal Plate',
        category: 'armor',
        tier: 3,
        description: 'Armor that reflects magical attacks',
        materials: [
            { id: 'living_crystal', count: 10 },
            { id: 'chasm_iron', count: 20 }
        ],
        goldCost: 400,
        craftTime: 7,
        result: {
            type: 'armor',
            armorType: 'heavy',
            name: 'Crystal Plate',
            defense: 30,
            magicResist: 0.25,
            spellReflect: 0.1,
            rarity: 'rare'
        },
        prerequisite: 'guardian_floor_2'
    },

    void_armor: {
        id: 'void_armor',
        name: 'Void Armor',
        category: 'armor',
        tier: 4,
        description: 'Armor forged in the void between worlds',
        materials: [
            { id: 'void_metal', count: 15 },
            { id: 'arcane_dust', count: 10 }
        ],
        goldCost: 700,
        craftTime: 10,
        result: {
            type: 'armor',
            armorType: 'heavy',
            name: 'Void Armor',
            defense: 40,
            allResist: 0.15,
            rarity: 'epic'
        },
        prerequisite: 'guardian_floor_3'
    },

    // ========================================================================
    // CONSUMABLES
    // ========================================================================

    health_potion: {
        id: 'health_potion',
        name: 'Health Potion',
        category: 'consumables',
        tier: 1,
        description: 'Restores 50 health',
        materials: [
            { id: 'crystal_shard', count: 2 }
        ],
        goldCost: 15,
        craftTime: 1,
        result: {
            type: 'consumable',
            name: 'Health Potion',
            effect: 'heal',
            value: 50,
            stackable: true,
            maxStack: 10
        },
        unlocked: true,
        batchCraft: true,
        maxBatch: 10
    },

    mana_potion: {
        id: 'mana_potion',
        name: 'Mana Potion',
        category: 'consumables',
        tier: 1,
        description: 'Restores 30 mana',
        materials: [
            { id: 'crystal_shard', count: 3 }
        ],
        goldCost: 20,
        craftTime: 1,
        result: {
            type: 'consumable',
            name: 'Mana Potion',
            effect: 'mana',
            value: 30,
            stackable: true,
            maxStack: 10
        },
        unlocked: true,
        batchCraft: true,
        maxBatch: 10
    },

    fire_bomb: {
        id: 'fire_bomb',
        name: 'Fire Bomb',
        category: 'consumables',
        tier: 2,
        description: 'Explodes in a burst of flame',
        materials: [
            { id: 'emberstone', count: 3 },
            { id: 'dense_stone', count: 2 }
        ],
        goldCost: 40,
        craftTime: 2,
        result: {
            type: 'consumable',
            name: 'Fire Bomb',
            effect: 'aoe_damage',
            damageType: 'fire',
            value: 40,
            radius: 3,
            stackable: true,
            maxStack: 5
        },
        prerequisite: 'guardian_floor_1',
        batchCraft: true,
        maxBatch: 5
    },

    escape_rope: {
        id: 'escape_rope',
        name: 'Escape Rope',
        category: 'consumables',
        tier: 2,
        description: 'Instantly teleport to the nearest extraction point',
        materials: [
            { id: 'shadow_thread', count: 5 },
            { id: 'crystal_shard', count: 3 }
        ],
        goldCost: 100,
        craftTime: 3,
        result: {
            type: 'consumable',
            name: 'Escape Rope',
            effect: 'teleport_extraction',
            stackable: true,
            maxStack: 3
        },
        prerequisite: 'guardian_floor_1',
        batchCraft: true,
        maxBatch: 3
    },

    revival_crystal: {
        id: 'revival_crystal',
        name: 'Revival Crystal',
        category: 'consumables',
        tier: 4,
        description: 'Automatically revive once upon death',
        materials: [
            { id: 'soul_fragment', count: 3 },
            { id: 'living_crystal', count: 5 }
        ],
        goldCost: 500,
        craftTime: 8,
        result: {
            type: 'consumable',
            name: 'Revival Crystal',
            effect: 'auto_revive',
            healthPercent: 0.5,
            stackable: false
        },
        prerequisite: 'guardian_floor_4'
    },

    // ========================================================================
    // UPGRADES
    // ========================================================================

    weapon_upgrade_1: {
        id: 'weapon_upgrade_1',
        name: 'Weapon Enhancement I',
        category: 'upgrades',
        tier: 1,
        description: 'Increase weapon damage by 10%',
        materials: [
            { id: 'chasm_iron', count: 5 },
            { id: 'crystal_shard', count: 3 }
        ],
        goldCost: 50,
        craftTime: 2,
        result: {
            type: 'upgrade',
            upgradeType: 'weapon',
            effect: 'damage_percent',
            value: 0.1
        },
        unlocked: true,
        consumedOnUse: true
    },

    armor_upgrade_1: {
        id: 'armor_upgrade_1',
        name: 'Armor Reinforcement I',
        category: 'upgrades',
        tier: 1,
        description: 'Increase armor defense by 10%',
        materials: [
            { id: 'dense_stone', count: 5 },
            { id: 'rough_leather', count: 3 }
        ],
        goldCost: 50,
        craftTime: 2,
        result: {
            type: 'upgrade',
            upgradeType: 'armor',
            effect: 'defense_percent',
            value: 0.1
        },
        unlocked: true,
        consumedOnUse: true
    },

    elemental_infusion: {
        id: 'elemental_infusion',
        name: 'Elemental Infusion',
        category: 'upgrades',
        tier: 3,
        description: 'Add elemental damage to a weapon',
        materials: [
            { id: 'emberstone', count: 5 },
            { id: 'frost_essence', count: 5 },
            { id: 'arcane_dust', count: 5 }
        ],
        goldCost: 200,
        craftTime: 5,
        result: {
            type: 'upgrade',
            upgradeType: 'weapon',
            effect: 'elemental_random',
            value: 15
        },
        prerequisite: 'guardian_floor_2',
        consumedOnUse: true
    },

    // ========================================================================
    // SPECIAL ITEMS
    // ========================================================================

    core_key: {
        id: 'core_key',
        name: 'Core Key',
        category: 'special',
        tier: 5,
        description: 'Unlocks passage to The Core',
        materials: [
            { id: 'primordial_essence', count: 5 },
            { id: 'soul_fragment', count: 10 },
            { id: 'guardian_heart', count: 1 }
        ],
        goldCost: 0,
        craftTime: 15,
        result: {
            type: 'key',
            name: 'Core Key',
            description: 'Opens the path to The Core',
            rarity: 'legendary'
        },
        prerequisite: 'guardian_floor_5',
        unique: true
    },

    primordial_blade: {
        id: 'primordial_blade',
        name: 'Primordial Blade',
        category: 'special',
        tier: 6,
        description: 'A weapon forged from the essence of creation itself',
        materials: [
            { id: 'primordial_essence', count: 10 },
            { id: 'core_shard', count: 3 },
            { id: 'dragon_scale', count: 10 }
        ],
        goldCost: 5000,
        craftTime: 30,
        result: {
            type: 'weapon',
            weaponType: 'sword',
            name: 'Primordial Blade',
            damage: 75,
            attackSpeed: 1.0,
            allDamage: 20,
            lifesteal: 0.1,
            rarity: 'legendary'
        },
        prerequisite: 'core_defeated',
        unique: true
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get recipe by ID
 * @param {string} recipeId
 * @returns {Object|null}
 */
function getRecipe(recipeId) {
    return CRAFTING_RECIPES[recipeId] || null;
}

/**
 * Get all recipes in a category
 * @param {string} category
 * @returns {Array}
 */
function getRecipesByCategory(category) {
    return Object.values(CRAFTING_RECIPES).filter(r => r.category === category);
}

/**
 * Get available recipes for player
 * @param {Object} playerData - Player's unlocks and progression
 * @returns {Array}
 */
function getAvailableRecipes(playerData) {
    const defeated = playerData.guardiansDefeated || [];
    const coreDefeated = playerData.coreDefeated || false;
    const craftedUniques = playerData.craftedUniques || [];

    return Object.values(CRAFTING_RECIPES).filter(recipe => {
        // Check if already crafted unique
        if (recipe.unique && craftedUniques.includes(recipe.id)) {
            return false;
        }

        // Check if unlocked by default
        if (recipe.unlocked) return true;

        // Check prerequisite
        if (recipe.prerequisite) {
            if (recipe.prerequisite === 'core_defeated' && !coreDefeated) {
                return false;
            }
            if (recipe.prerequisite.startsWith('guardian_floor_')) {
                const floor = parseInt(recipe.prerequisite.split('_')[2]);
                if (!defeated.includes(floor)) {
                    return false;
                }
            }
        }

        return true;
    });
}

/**
 * Check if player can craft recipe
 * @param {string} recipeId
 * @param {Object} inventory - Player's materials
 * @param {number} gold - Player's gold
 * @returns {Object} { canCraft, missingMaterials, missingGold }
 */
function canCraftRecipe(recipeId, inventory, gold) {
    const recipe = getRecipe(recipeId);
    if (!recipe) return { canCraft: false, reason: 'Unknown recipe' };

    const missingMaterials = [];
    let missingGold = 0;

    // Check materials
    recipe.materials.forEach(mat => {
        const have = inventory[mat.id] || 0;
        if (have < mat.count) {
            missingMaterials.push({
                id: mat.id,
                need: mat.count,
                have: have,
                missing: mat.count - have
            });
        }
    });

    // Check gold
    if (gold < recipe.goldCost) {
        missingGold = recipe.goldCost - gold;
    }

    return {
        canCraft: missingMaterials.length === 0 && missingGold === 0,
        missingMaterials,
        missingGold
    };
}

/**
 * Get recipe material costs formatted for display
 * @param {string} recipeId
 * @returns {Array}
 */
function getRecipeCostDisplay(recipeId) {
    const recipe = getRecipe(recipeId);
    if (!recipe) return [];

    return recipe.materials.map(mat => {
        const material = typeof getMaterial === 'function' ? getMaterial(mat.id) : null;
        return {
            id: mat.id,
            name: material?.name || mat.id,
            count: mat.count,
            icon: material?.icon || '?'
        };
    });
}

// ============================================================================
// EXPORTS
// ============================================================================

window.CRAFT_CATEGORIES = CRAFT_CATEGORIES;
window.CRAFTING_RECIPES = CRAFTING_RECIPES;
window.getRecipe = getRecipe;
window.getRecipesByCategory = getRecipesByCategory;
window.getAvailableRecipes = getAvailableRecipes;
window.canCraftRecipe = canCraftRecipe;
window.getRecipeCostDisplay = getRecipeCostDisplay;

console.log('[CraftingData] Crafting recipes loaded');
