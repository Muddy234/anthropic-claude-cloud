// ============================================================================
// RAW MATERIALS - Overworld Crafting Materials for Economy System
// ============================================================================
//
// Economy Design: Gold buys materials. Loot enables upgrades. Risk creates value.
//
// - Only COMMON materials can be purchased from vendors
// - UNCOMMON materials must be crafted from common materials
// - RARE materials require crafted uncommon + dungeon drops
// ============================================================================

// ============================================================================
// MATERIAL LINE DEFINITIONS
// ============================================================================

const MATERIAL_LINES = {
    METAL: 'metal',       // Melee weapons, heavy armor, shields
    LEATHER: 'leather',   // Light armor, accessories
    CLOTH: 'cloth',       // Robes, staves, wands
    HERB: 'herb',         // Potions, consumables
    WOOD: 'wood',         // Bows, crossbows
    ALCHEMICAL: 'alchemical' // Bombs, coatings, fire kits
};

const MATERIAL_TIERS = {
    COMMON: 'common',       // Buyable from vendors
    UNCOMMON: 'uncommon',   // Crafted from common
    RARE: 'rare'            // Crafted from uncommon + dungeon drops
};

// ============================================================================
// RAW MATERIALS DATA
// ============================================================================

const RAW_MATERIALS = {

    // ========================================================================
    // METAL LINE - Melee Weapons, Heavy Armor, Shields
    // ========================================================================

    iron_ore: {
        id: 'iron_ore',
        name: 'Iron Ore',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.METAL,
        tier: MATERIAL_TIERS.COMMON,
        stackable: true,
        maxStack: 99,
        buyPrice: 15,
        sellPrice: 8,
        soldBy: ['blacksmith'],
        description: 'Raw iron ore. Used in basic metal crafting and upgrades.',
        icon: 'iron_ore'
    },

    steel_ingot: {
        id: 'steel_ingot',
        name: 'Steel Ingot',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.METAL,
        tier: MATERIAL_TIERS.UNCOMMON,
        stackable: true,
        maxStack: 50,
        buyPrice: null, // Cannot buy - must craft
        sellPrice: 28,
        soldBy: [],
        description: 'Refined steel. Required for advanced weapon upgrades.',
        icon: 'steel_ingot',
        craftRecipe: {
            iron_ore: 3,
            coal: 2
        }
    },

    mithril_bar: {
        id: 'mithril_bar',
        name: 'Mithril Bar',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.METAL,
        tier: MATERIAL_TIERS.RARE,
        stackable: true,
        maxStack: 30,
        buyPrice: null,
        sellPrice: 55,
        soldBy: [],
        description: 'Legendary mithril. Essential for master-tier upgrades.',
        icon: 'mithril_bar',
        craftRecipe: {
            steel_ingot: 2,
            crystal_shard: 1 // T2 dungeon drop
        },
        requiresDungeonDrop: 'crystal_shard'
    },

    // ========================================================================
    // LEATHER LINE - Light Armor, Accessories
    // ========================================================================

    leather_scraps: {
        id: 'leather_scraps',
        name: 'Leather Scraps',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.LEATHER,
        tier: MATERIAL_TIERS.COMMON,
        stackable: true,
        maxStack: 99,
        buyPrice: 12,
        sellPrice: 6,
        soldBy: ['general_store'],
        description: 'Raw leather pieces. Used for light armor crafting.',
        icon: 'leather_scraps'
    },

    cured_leather: {
        id: 'cured_leather',
        name: 'Cured Leather',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.LEATHER,
        tier: MATERIAL_TIERS.UNCOMMON,
        stackable: true,
        maxStack: 50,
        buyPrice: null,
        sellPrice: 21,
        soldBy: [],
        description: 'Treated leather. Superior for armor upgrades.',
        icon: 'cured_leather',
        craftRecipe: {
            leather_scraps: 3,
            binding_thread: 1
        }
    },

    hardened_hide: {
        id: 'hardened_hide',
        name: 'Hardened Hide',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.LEATHER,
        tier: MATERIAL_TIERS.RARE,
        stackable: true,
        maxStack: 30,
        buyPrice: null,
        sellPrice: 42,
        soldBy: [],
        description: 'Demon-infused hide. Nearly impenetrable.',
        icon: 'hardened_hide',
        craftRecipe: {
            cured_leather: 2,
            demon_essence: 1 // T2 dungeon drop
        },
        requiresDungeonDrop: 'demon_essence'
    },

    // ========================================================================
    // CLOTH LINE - Robes, Staves, Wands
    // ========================================================================

    cloth_bolts: {
        id: 'cloth_bolts',
        name: 'Cloth Bolts',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.CLOTH,
        tier: MATERIAL_TIERS.COMMON,
        stackable: true,
        maxStack: 99,
        buyPrice: 10,
        sellPrice: 5,
        soldBy: ['general_store'],
        description: 'Basic fabric. Used for robes and magical equipment.',
        icon: 'cloth_bolts'
    },

    woven_fabric: {
        id: 'woven_fabric',
        name: 'Woven Fabric',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.CLOTH,
        tier: MATERIAL_TIERS.UNCOMMON,
        stackable: true,
        maxStack: 50,
        buyPrice: null,
        sellPrice: 18,
        soldBy: [],
        description: 'Fine woven cloth. Accepts magical enchantments well.',
        icon: 'woven_fabric',
        craftRecipe: {
            cloth_bolts: 3,
            binding_thread: 1
        }
    },

    enchanted_silk: {
        id: 'enchanted_silk',
        name: 'Enchanted Silk',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.CLOTH,
        tier: MATERIAL_TIERS.RARE,
        stackable: true,
        maxStack: 30,
        buyPrice: null,
        sellPrice: 36,
        soldBy: [],
        description: 'Spider silk imbued with magic. Ideal for powerful robes.',
        icon: 'enchanted_silk',
        craftRecipe: {
            woven_fabric: 2,
            spider_silk: 1 // T2 dungeon drop
        },
        requiresDungeonDrop: 'spider_silk'
    },

    // ========================================================================
    // HERB LINE - Potions, Consumables
    // ========================================================================

    herb_bundle: {
        id: 'herb_bundle',
        name: 'Herb Bundle',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.HERB,
        tier: MATERIAL_TIERS.COMMON,
        stackable: true,
        maxStack: 99,
        buyPrice: 12,
        sellPrice: 6,
        soldBy: ['alchemist'],
        description: 'Mixed healing herbs. Base ingredient for potions.',
        icon: 'herb_bundle'
    },

    refined_extract: {
        id: 'refined_extract',
        name: 'Refined Extract',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.HERB,
        tier: MATERIAL_TIERS.UNCOMMON,
        stackable: true,
        maxStack: 50,
        buyPrice: null,
        sellPrice: 21,
        soldBy: [],
        description: 'Concentrated herbal essence. For stronger potions.',
        icon: 'refined_extract',
        craftRecipe: {
            herb_bundle: 3,
            empty_vial: 2
        }
    },

    pure_essence: {
        id: 'pure_essence',
        name: 'Pure Essence',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.HERB,
        tier: MATERIAL_TIERS.RARE,
        stackable: true,
        maxStack: 30,
        buyPrice: null,
        sellPrice: 42,
        soldBy: [],
        description: 'The purest healing concentrate. For master potions.',
        icon: 'pure_essence',
        craftRecipe: {
            refined_extract: 2,
            demon_essence: 1 // T2 dungeon drop
        },
        requiresDungeonDrop: 'demon_essence'
    },

    // ========================================================================
    // WOOD LINE - Bows, Crossbows
    // ========================================================================

    timber: {
        id: 'timber',
        name: 'Timber',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.WOOD,
        tier: MATERIAL_TIERS.COMMON,
        stackable: true,
        maxStack: 99,
        buyPrice: 10,
        sellPrice: 5,
        soldBy: ['general_store'],
        description: 'Quality wood for crafting bows and crossbows.',
        icon: 'timber'
    },

    treated_wood: {
        id: 'treated_wood',
        name: 'Treated Wood',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.WOOD,
        tier: MATERIAL_TIERS.UNCOMMON,
        stackable: true,
        maxStack: 50,
        buyPrice: null,
        sellPrice: 17,
        soldBy: [],
        description: 'Wax-sealed wood. Flexible and durable.',
        icon: 'treated_wood',
        craftRecipe: {
            timber: 3,
            wax: 1
        }
    },

    ironwood: {
        id: 'ironwood',
        name: 'Ironwood',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.WOOD,
        tier: MATERIAL_TIERS.RARE,
        stackable: true,
        maxStack: 30,
        buyPrice: null,
        sellPrice: 34,
        soldBy: [],
        description: 'Crystal-infused wood. Hard as metal, light as air.',
        icon: 'ironwood',
        craftRecipe: {
            treated_wood: 2,
            crystal_shard: 1 // T2 dungeon drop
        },
        requiresDungeonDrop: 'crystal_shard'
    },

    // ========================================================================
    // ALCHEMICAL LINE - Bombs, Coatings, Fire Kits
    // ========================================================================

    oil_flask: {
        id: 'oil_flask',
        name: 'Oil Flask',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.ALCHEMICAL,
        tier: MATERIAL_TIERS.COMMON,
        stackable: true,
        maxStack: 99,
        buyPrice: 8,
        sellPrice: 4,
        soldBy: ['alchemist'],
        description: 'Flammable oil. Used for fire-based creations.',
        icon: 'oil_flask'
    },

    alchemical_base: {
        id: 'alchemical_base',
        name: 'Alchemical Base',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.ALCHEMICAL,
        tier: MATERIAL_TIERS.UNCOMMON,
        stackable: true,
        maxStack: 50,
        buyPrice: null,
        sellPrice: 14,
        soldBy: [],
        description: 'Refined alchemical compound. Highly reactive.',
        icon: 'alchemical_base',
        craftRecipe: {
            oil_flask: 3,
            empty_vial: 1
        }
    },

    volatile_compound: {
        id: 'volatile_compound',
        name: 'Volatile Compound',
        type: 'raw_material',
        materialLine: MATERIAL_LINES.ALCHEMICAL,
        tier: MATERIAL_TIERS.RARE,
        stackable: true,
        maxStack: 30,
        buyPrice: null,
        sellPrice: 27,
        soldBy: [],
        description: 'Unstable mixture. Handle with extreme care.',
        icon: 'volatile_compound',
        craftRecipe: {
            alchemical_base: 2,
            fire_mote: 1 // T2 dungeon drop
        },
        requiresDungeonDrop: 'fire_mote'
    }
};

// ============================================================================
// UTILITY MATERIALS (No Tiers - All Buyable)
// ============================================================================

const UTILITY_MATERIALS = {

    coal: {
        id: 'coal',
        name: 'Coal',
        type: 'utility_material',
        stackable: true,
        maxStack: 99,
        buyPrice: 5,
        sellPrice: 2,
        soldBy: ['blacksmith'],
        description: 'Fuel for metalworking. Essential for smithing.',
        icon: 'coal'
    },

    binding_thread: {
        id: 'binding_thread',
        name: 'Binding Thread',
        type: 'utility_material',
        stackable: true,
        maxStack: 99,
        buyPrice: 6,
        sellPrice: 3,
        soldBy: ['general_store'],
        description: 'Strong thread for leather and cloth crafting.',
        icon: 'binding_thread'
    },

    empty_vial: {
        id: 'empty_vial',
        name: 'Empty Vial',
        type: 'utility_material',
        stackable: true,
        maxStack: 99,
        buyPrice: 3,
        sellPrice: 1,
        soldBy: ['alchemist'],
        description: 'Glass container for potions and compounds.',
        icon: 'empty_vial'
    },

    wax: {
        id: 'wax',
        name: 'Wax',
        type: 'utility_material',
        stackable: true,
        maxStack: 99,
        buyPrice: 4,
        sellPrice: 2,
        soldBy: ['general_store'],
        description: 'Sealing wax. Used for wood treatment.',
        icon: 'wax'
    }
};

// ============================================================================
// DUNGEON CRAFTING DROPS - Required for Rare Materials and Upgrades
// ============================================================================

const DUNGEON_CRAFT_DROPS = {

    // T1 Drops (Floors 1-2) - Used for +1 upgrades
    monster_fang: {
        id: 'monster_fang',
        name: 'Monster Fang',
        type: 'dungeon_craft_drop',
        tier: 1,
        dropFloors: [1, 2],
        dropChance: 0.30,
        stackable: true,
        maxStack: 99,
        sellPrice: 5,
        description: 'Sharp fang from chasm creatures. Used for +1 upgrades.',
        icon: 'monster_fang'
    },

    bone_fragment: {
        id: 'bone_fragment',
        name: 'Bone Fragment',
        type: 'dungeon_craft_drop',
        tier: 1,
        dropFloors: [1, 2],
        dropChance: 0.30,
        stackable: true,
        maxStack: 99,
        sellPrice: 4,
        description: 'Sturdy bone piece. Used for +1 upgrades.',
        icon: 'bone_fragment'
    },

    rat_tail: {
        id: 'rat_tail',
        name: 'Rat Tail',
        type: 'dungeon_craft_drop',
        tier: 1,
        dropFloors: [1, 2],
        dropChance: 0.30,
        stackable: true,
        maxStack: 99,
        sellPrice: 3,
        description: 'Tough rat tail. Used for +1 upgrades.',
        icon: 'rat_tail'
    },

    // T2 Drops (Floors 3-4) - Used for +2 upgrades and rare material crafting
    spider_silk: {
        id: 'spider_silk',
        name: 'Spider Silk',
        type: 'dungeon_craft_drop',
        tier: 2,
        dropFloors: [3, 4],
        dropChance: 0.30,
        stackable: true,
        maxStack: 50,
        sellPrice: 15,
        description: 'Strong silk from giant spiders. Used for +2 upgrades.',
        icon: 'spider_silk'
    },

    demon_essence: {
        id: 'demon_essence',
        name: 'Demon Essence',
        type: 'dungeon_craft_drop',
        tier: 2,
        dropFloors: [3, 4],
        dropChance: 0.30,
        stackable: true,
        maxStack: 50,
        sellPrice: 18,
        description: 'Dark energy from demons. Used for +2 upgrades.',
        icon: 'demon_essence'
    },

    crystal_shard: {
        id: 'crystal_shard',
        name: 'Crystal Shard',
        type: 'dungeon_craft_drop',
        tier: 2,
        dropFloors: [3, 4],
        dropChance: 0.30,
        stackable: true,
        maxStack: 50,
        sellPrice: 20,
        description: 'Glowing crystal fragment. Used for +2 upgrades.',
        icon: 'crystal_shard'
    },

    fire_mote: {
        id: 'fire_mote',
        name: 'Fire Mote',
        type: 'dungeon_craft_drop',
        tier: 2,
        dropFloors: [3, 4],
        dropChance: 0.30,
        stackable: true,
        maxStack: 50,
        sellPrice: 16,
        description: 'Condensed fire energy. Used for +2 upgrades.',
        icon: 'fire_mote'
    },

    // Elite Drops (Bosses) - Used for +3 upgrades
    ancient_core: {
        id: 'ancient_core',
        name: 'Ancient Core',
        type: 'dungeon_craft_drop',
        tier: 3,
        dropFloors: [],
        bossOnly: true,
        dropChance: 1.0, // Guaranteed from bosses
        stackable: true,
        maxStack: 10,
        sellPrice: 100,
        description: 'Power core from a boss. Required for +3 upgrades.',
        icon: 'ancient_core'
    },

    void_fragment: {
        id: 'void_fragment',
        name: 'Void Fragment',
        type: 'dungeon_craft_drop',
        tier: 3,
        dropFloors: [],
        bossOnly: true,
        dropChance: 1.0,
        stackable: true,
        maxStack: 10,
        sellPrice: 120,
        description: 'Fragment of the void. Required for +3 upgrades.',
        icon: 'void_fragment'
    },

    dragon_heart: {
        id: 'dragon_heart',
        name: 'Dragon Heart',
        type: 'dungeon_craft_drop',
        tier: 3,
        dropFloors: [],
        bossOnly: true,
        dropChance: 1.0,
        stackable: true,
        maxStack: 10,
        sellPrice: 150,
        description: 'Heart of a dragon. Required for +3 upgrades.',
        icon: 'dragon_heart'
    }
};

// ============================================================================
// SELLABLE LOOT - Dungeon drops for selling only (not for crafting)
// ============================================================================

const SELLABLE_LOOT = {

    // T1 Sellables (Floors 1-2)
    old_coins: {
        id: 'old_coins',
        name: 'Old Coins',
        type: 'sellable_loot',
        tier: 1,
        dropFloors: [1, 2],
        dropChance: 0.50,
        stackable: true,
        maxStack: 99,
        sellPrice: 5,
        description: 'Tarnished coins. Worth a bit of gold.'
    },

    cracked_gem: {
        id: 'cracked_gem',
        name: 'Cracked Gem',
        type: 'sellable_loot',
        tier: 1,
        dropFloors: [1, 2],
        dropChance: 0.50,
        stackable: true,
        maxStack: 99,
        sellPrice: 8,
        description: 'Flawed gemstone. Still has some value.'
    },

    dusty_trinket: {
        id: 'dusty_trinket',
        name: 'Dusty Trinket',
        type: 'sellable_loot',
        tier: 1,
        dropFloors: [1, 2],
        dropChance: 0.50,
        stackable: true,
        maxStack: 99,
        sellPrice: 12,
        description: 'Old jewelry piece. A collector might want it.'
    },

    // T2 Sellables (Floors 3-4)
    silver_coins: {
        id: 'silver_coins',
        name: 'Silver Coins',
        type: 'sellable_loot',
        tier: 2,
        dropFloors: [3, 4],
        dropChance: 0.50,
        stackable: true,
        maxStack: 99,
        sellPrice: 15,
        description: 'Shiny silver coins. Worth a decent sum.'
    },

    ruby_chip: {
        id: 'ruby_chip',
        name: 'Ruby Chip',
        type: 'sellable_loot',
        tier: 2,
        dropFloors: [3, 4],
        dropChance: 0.50,
        stackable: true,
        maxStack: 99,
        sellPrice: 22,
        description: 'Fragment of a ruby. Quite valuable.'
    },

    ancient_medallion: {
        id: 'ancient_medallion',
        name: 'Ancient Medallion',
        type: 'sellable_loot',
        tier: 2,
        dropFloors: [3, 4],
        dropChance: 0.50,
        stackable: true,
        maxStack: 99,
        sellPrice: 30,
        description: 'Medallion from a lost civilization.'
    },

    // T3 Sellables (Floors 5-6)
    gold_coins: {
        id: 'gold_coins',
        name: 'Gold Coins',
        type: 'sellable_loot',
        tier: 3,
        dropFloors: [5, 6],
        dropChance: 0.50,
        stackable: true,
        maxStack: 99,
        sellPrice: 35,
        description: 'Pure gold coins. Worth a fortune.'
    },

    flawless_gem: {
        id: 'flawless_gem',
        name: 'Flawless Gem',
        type: 'sellable_loot',
        tier: 3,
        dropFloors: [5, 6],
        dropChance: 0.50,
        stackable: true,
        maxStack: 50,
        sellPrice: 55,
        description: 'A perfect gemstone. Extremely valuable.'
    },

    royal_signet: {
        id: 'royal_signet',
        name: 'Royal Signet',
        type: 'sellable_loot',
        tier: 3,
        dropFloors: [5, 6],
        dropChance: 0.50,
        stackable: true,
        maxStack: 50,
        sellPrice: 75,
        description: 'Ring of royalty. A rare treasure.'
    },

    // Elite Sellables (Boss/Treasure)
    treasure_hoard: {
        id: 'treasure_hoard',
        name: 'Treasure Hoard',
        type: 'sellable_loot',
        tier: 4,
        dropFloors: [],
        bossOnly: true,
        dropChance: 1.0,
        stackable: true,
        maxStack: 10,
        sellPrice: 125,
        description: 'Collection of riches. Worth a small fortune.'
    },

    ancient_artifact: {
        id: 'ancient_artifact',
        name: 'Ancient Artifact',
        type: 'sellable_loot',
        tier: 4,
        dropFloors: [],
        bossOnly: true,
        dropChance: 1.0,
        stackable: true,
        maxStack: 10,
        sellPrice: 150,
        description: 'Relic of immense historical value.'
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get raw material by ID
 */
function getRawMaterial(id) {
    return RAW_MATERIALS[id] || UTILITY_MATERIALS[id] || null;
}

/**
 * Get all materials in a specific line
 */
function getMaterialsByLine(line) {
    return Object.values(RAW_MATERIALS).filter(m => m.materialLine === line);
}

/**
 * Get all buyable materials (common tier only)
 */
function getBuyableMaterials() {
    const buyable = [];

    Object.values(RAW_MATERIALS).forEach(m => {
        if (m.tier === MATERIAL_TIERS.COMMON && m.buyPrice) {
            buyable.push(m);
        }
    });

    Object.values(UTILITY_MATERIALS).forEach(m => {
        buyable.push(m);
    });

    return buyable;
}

/**
 * Get materials sold by a specific vendor
 */
function getMaterialsByVendor(vendorId) {
    const materials = [];

    Object.values(RAW_MATERIALS).forEach(m => {
        if (m.soldBy && m.soldBy.includes(vendorId)) {
            materials.push(m);
        }
    });

    Object.values(UTILITY_MATERIALS).forEach(m => {
        if (m.soldBy && m.soldBy.includes(vendorId)) {
            materials.push(m);
        }
    });

    return materials;
}

/**
 * Get crafting recipe for a material
 */
function getMaterialCraftRecipe(materialId) {
    const mat = RAW_MATERIALS[materialId];
    return mat && mat.craftRecipe ? mat.craftRecipe : null;
}

/**
 * Check if player can craft a material
 */
function canCraftMaterial(materialId, inventory) {
    const recipe = getMaterialCraftRecipe(materialId);
    if (!recipe) return false;

    for (const [ingredientId, amount] of Object.entries(recipe)) {
        const count = getInventoryCount(inventory, ingredientId);
        if (count < amount) return false;
    }

    return true;
}

/**
 * Helper to count items in inventory
 */
function getInventoryCount(inventory, itemId) {
    if (!inventory) return 0;

    let count = 0;
    for (const item of inventory) {
        if (item && item.id === itemId) {
            count += item.count || 1;
        }
    }
    return count;
}

/**
 * Get dungeon crafting drop by ID
 */
function getDungeonCraftDrop(id) {
    return DUNGEON_CRAFT_DROPS[id] || null;
}

/**
 * Get sellable loot by ID
 */
function getSellableLoot(id) {
    return SELLABLE_LOOT[id] || null;
}

/**
 * Get all dungeon drops for a floor
 */
function getDungeonDropsForFloor(floor) {
    const drops = [];

    // Crafting drops (30% chance)
    Object.values(DUNGEON_CRAFT_DROPS).forEach(drop => {
        if (drop.dropFloors && drop.dropFloors.includes(floor)) {
            drops.push({ ...drop, category: 'craft' });
        }
    });

    // Sellable loot (50% chance)
    Object.values(SELLABLE_LOOT).forEach(loot => {
        if (loot.dropFloors && loot.dropFloors.includes(floor)) {
            drops.push({ ...loot, category: 'sell' });
        }
    });

    return drops;
}

/**
 * Roll for dungeon loot drop
 * Returns null, a craft drop, or sellable loot
 */
function rollDungeonLoot(floor, isBoss = false) {
    if (isBoss) {
        // Bosses drop both a craft drop AND sellable loot
        const craftDrops = Object.values(DUNGEON_CRAFT_DROPS).filter(d => d.bossOnly);
        const sellables = Object.values(SELLABLE_LOOT).filter(l => l.bossOnly);

        const results = [];

        if (craftDrops.length > 0) {
            const craftDrop = craftDrops[Math.floor(Math.random() * craftDrops.length)];
            results.push({ ...craftDrop, count: 1 });
        }

        if (sellables.length > 0) {
            const sellable = sellables[Math.floor(Math.random() * sellables.length)];
            results.push({ ...sellable, count: 1 });
        }

        return results;
    }

    // Regular enemies
    const roll = Math.random();

    // 30% chance for crafting materials
    if (roll < 0.30) {
        const craftDrops = Object.values(DUNGEON_CRAFT_DROPS).filter(
            d => d.dropFloors && d.dropFloors.includes(floor)
        );
        if (craftDrops.length > 0) {
            const drop = craftDrops[Math.floor(Math.random() * craftDrops.length)];
            return [{ ...drop, count: 1 }];
        }
    }
    // 50% chance for sellable loot (30-80% range)
    else if (roll < 0.80) {
        const loot = Object.values(SELLABLE_LOOT).filter(
            l => l.dropFloors && l.dropFloors.includes(floor)
        );
        if (loot.length > 0) {
            const item = loot[Math.floor(Math.random() * loot.length)];
            return [{ ...item, count: 1 }];
        }
    }

    // 20% chance for nothing
    return null;
}

/**
 * Create a material item instance
 */
function createRawMaterialItem(materialId, count = 1) {
    const mat = getRawMaterial(materialId) ||
                getDungeonCraftDrop(materialId) ||
                getSellableLoot(materialId);

    if (!mat) return null;

    return {
        ...mat,
        count: Math.min(count, mat.maxStack || 99)
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

window.MATERIAL_LINES = MATERIAL_LINES;
window.MATERIAL_TIERS = MATERIAL_TIERS;
window.RAW_MATERIALS = RAW_MATERIALS;
window.UTILITY_MATERIALS = UTILITY_MATERIALS;
window.DUNGEON_CRAFT_DROPS = DUNGEON_CRAFT_DROPS;
window.SELLABLE_LOOT = SELLABLE_LOOT;

window.getRawMaterial = getRawMaterial;
window.getMaterialsByLine = getMaterialsByLine;
window.getBuyableMaterials = getBuyableMaterials;
window.getMaterialsByVendor = getMaterialsByVendor;
window.getMaterialCraftRecipe = getMaterialCraftRecipe;
window.canCraftMaterial = canCraftMaterial;
window.getDungeonCraftDrop = getDungeonCraftDrop;
window.getSellableLoot = getSellableLoot;
window.getDungeonDropsForFloor = getDungeonDropsForFloor;
window.rollDungeonLoot = rollDungeonLoot;
window.createRawMaterialItem = createRawMaterialItem;

console.log('[Raw Materials] Economy material system loaded');
console.log(`  - ${Object.keys(RAW_MATERIALS).length} raw materials (6 lines × 3 tiers)`);
console.log(`  - ${Object.keys(UTILITY_MATERIALS).length} utility materials`);
console.log(`  - ${Object.keys(DUNGEON_CRAFT_DROPS).length} dungeon craft drops`);
console.log(`  - ${Object.keys(SELLABLE_LOOT).length} sellable loot items`);
