// === js/data/materials.js ===
// SURVIVAL EXTRACTION UPDATE: Crafting materials and resources

// ============================================================================
// MATERIAL DATA
// ============================================================================

const MATERIAL_DATA = {

    // ========================================================================
    // TIER 1 MATERIALS (Floors 1-2)
    // ========================================================================

    chasm_iron: {
        id: 'chasm_iron',
        name: 'Chasm Iron',
        type: 'material',
        tier: 1,
        rarity: 'common',
        stackable: true,
        maxStack: 99,
        sellValue: 5,
        description: 'Raw iron ore found in the upper chasm. Used for basic crafting.',
        dropFloors: [1, 2],
        dropChance: 0.15,
        uses: ['basic_weapons', 'basic_armor', 'repairs']
    },

    rough_leather: {
        id: 'rough_leather',
        name: 'Rough Leather',
        type: 'material',
        tier: 1,
        rarity: 'common',
        stackable: true,
        maxStack: 99,
        sellValue: 4,
        description: 'Tough hide from chasm creatures. Good for light armor.',
        dropFloors: [1, 2],
        dropChance: 0.12,
        uses: ['light_armor', 'accessories']
    },

    crystal_shard: {
        id: 'crystal_shard',
        name: 'Crystal Shard',
        type: 'material',
        tier: 1,
        rarity: 'uncommon',
        stackable: true,
        maxStack: 50,
        sellValue: 10,
        description: 'A glowing fragment. Contains faint magical energy.',
        dropFloors: [1, 2],
        dropChance: 0.08,
        uses: ['enchanting', 'magic_weapons']
    },

    // ========================================================================
    // TIER 2 MATERIALS (Floors 2-3)
    // ========================================================================

    dense_stone: {
        id: 'dense_stone',
        name: 'Dense Stone',
        type: 'material',
        tier: 2,
        rarity: 'common',
        stackable: true,
        maxStack: 99,
        sellValue: 8,
        description: 'Unusually heavy stone from the mid-depths. Very durable.',
        dropFloors: [2, 3],
        dropChance: 0.12,
        uses: ['heavy_armor', 'shields']
    },

    emberstone: {
        id: 'emberstone',
        name: 'Emberstone',
        type: 'material',
        tier: 2,
        rarity: 'uncommon',
        stackable: true,
        maxStack: 50,
        sellValue: 20,
        description: 'Stone that eternally smolders. Used for fire enchantments.',
        dropFloors: [2, 3],
        dropChance: 0.08,
        uses: ['fire_weapons', 'fire_enchanting']
    },

    shadow_thread: {
        id: 'shadow_thread',
        name: 'Shadow Thread',
        type: 'material',
        tier: 2,
        rarity: 'uncommon',
        stackable: true,
        maxStack: 50,
        sellValue: 18,
        description: 'Dark fibers harvested from shadow creatures.',
        dropFloors: [2, 3],
        dropChance: 0.06,
        uses: ['magic_robes', 'enchanting']
    },

    // ========================================================================
    // TIER 3 MATERIALS (Floors 3-4)
    // ========================================================================

    corrupted_bone: {
        id: 'corrupted_bone',
        name: 'Corrupted Bone',
        type: 'material',
        tier: 3,
        rarity: 'uncommon',
        stackable: true,
        maxStack: 50,
        sellValue: 25,
        description: 'Bones warped by chasm energy. Disturbing but useful.',
        dropFloors: [3, 4],
        dropChance: 0.10,
        uses: ['dark_weapons', 'necromancy']
    },

    living_crystal: {
        id: 'living_crystal',
        name: 'Living Crystal',
        type: 'material',
        tier: 3,
        rarity: 'rare',
        stackable: true,
        maxStack: 30,
        sellValue: 40,
        description: 'A crystal that pulses with inner light. Highly magical.',
        dropFloors: [3, 4],
        dropChance: 0.05,
        uses: ['magic_weapons', 'powerful_enchanting']
    },

    frost_essence: {
        id: 'frost_essence',
        name: 'Frost Essence',
        type: 'material',
        tier: 3,
        rarity: 'rare',
        stackable: true,
        maxStack: 30,
        sellValue: 35,
        description: 'Frozen energy that never melts. Radiates cold.',
        dropFloors: [3, 4],
        dropChance: 0.06,
        uses: ['ice_weapons', 'ice_enchanting']
    },

    // ========================================================================
    // TIER 4 MATERIALS (Floors 4-5)
    // ========================================================================

    void_metal: {
        id: 'void_metal',
        name: 'Void Metal',
        type: 'material',
        tier: 4,
        rarity: 'rare',
        stackable: true,
        maxStack: 30,
        sellValue: 60,
        description: 'Metal that absorbs light. Impossibly sharp when forged.',
        dropFloors: [4, 5],
        dropChance: 0.06,
        uses: ['elite_weapons']
    },

    arcane_dust: {
        id: 'arcane_dust',
        name: 'Arcane Dust',
        type: 'material',
        tier: 4,
        rarity: 'rare',
        stackable: true,
        maxStack: 50,
        sellValue: 50,
        description: 'Crystallized magical energy. Essential for high enchanting.',
        dropFloors: [4, 5],
        dropChance: 0.07,
        uses: ['enchanting', 'powerful_magic']
    },

    dragon_scale: {
        id: 'dragon_scale',
        name: 'Dragon Scale',
        type: 'material',
        tier: 4,
        rarity: 'epic',
        stackable: true,
        maxStack: 20,
        sellValue: 100,
        description: 'Scale from a deep chasm drake. Nearly indestructible.',
        dropFloors: [4, 5],
        dropChance: 0.03,
        uses: ['elite_armor', 'shields']
    },

    // ========================================================================
    // TIER 5 MATERIALS (Floors 5-6)
    // ========================================================================

    abyssal_ore: {
        id: 'abyssal_ore',
        name: 'Abyssal Ore',
        type: 'material',
        tier: 5,
        rarity: 'epic',
        stackable: true,
        maxStack: 20,
        sellValue: 150,
        description: 'Ore from the deepest depths. Radiates dark power.',
        dropFloors: [5, 6],
        dropChance: 0.04,
        uses: ['legendary_weapons']
    },

    soul_fragment: {
        id: 'soul_fragment',
        name: 'Soul Fragment',
        type: 'material',
        tier: 5,
        rarity: 'epic',
        stackable: true,
        maxStack: 10,
        sellValue: 200,
        description: 'A piece of concentrated life force. Handle with care.',
        dropFloors: [5, 6],
        dropChance: 0.02,
        uses: ['legendary_enchanting', 'revival']
    },

    primordial_essence: {
        id: 'primordial_essence',
        name: 'Primordial Essence',
        type: 'material',
        tier: 5,
        rarity: 'legendary',
        stackable: true,
        maxStack: 5,
        sellValue: 500,
        description: 'Raw essence from before time. Reality bends around it.',
        dropFloors: [6],
        dropChance: 0.01,
        uses: ['legendary_items', 'core_crafting']
    },

    // ========================================================================
    // SPECIAL MATERIALS (Boss drops, rare finds)
    // ========================================================================

    guardian_heart: {
        id: 'guardian_heart',
        name: 'Guardian Heart',
        type: 'material',
        tier: 5,
        rarity: 'legendary',
        stackable: true,
        maxStack: 3,
        sellValue: 1000,
        description: 'The core of a floor guardian. Unlocks shortcuts.',
        dropFloors: [],  // Boss drop only
        dropChance: 0,
        uses: ['shortcuts', 'legendary_crafting'],
        bossOnly: true
    },

    core_shard: {
        id: 'core_shard',
        name: 'Core Shard',
        type: 'material',
        tier: 6,
        rarity: 'legendary',
        stackable: true,
        maxStack: 1,
        sellValue: 5000,
        description: 'A fragment of the Core itself. Ultimate power.',
        dropFloors: [],  // Core boss only
        dropChance: 0,
        uses: ['ultimate_crafting', 'victory'],
        bossOnly: true
    }
};

// ============================================================================
// MATERIAL TIER COLORS
// ============================================================================

const MATERIAL_TIER_COLORS = {
    1: '#AAAAAA',  // Grey
    2: '#4CAF50',  // Green
    3: '#2196F3',  // Blue
    4: '#9C27B0',  // Purple
    5: '#FF9800',  // Orange
    6: '#FFD700'   // Gold
};

// ============================================================================
// MATERIAL HELPER FUNCTIONS
// ============================================================================

/**
 * Get material data by ID
 * @param {string} materialId
 * @returns {Object|null}
 */
function getMaterial(materialId) {
    return MATERIAL_DATA[materialId] || null;
}

/**
 * Get all materials for a specific floor
 * @param {number} floor
 * @returns {Array}
 */
function getMaterialsForFloor(floor) {
    return Object.values(MATERIAL_DATA).filter(mat =>
        mat.dropFloors.includes(floor)
    );
}

/**
 * Get random material drop for a floor
 * @param {number} floor
 * @returns {Object|null} Material data or null
 */
function rollMaterialDrop(floor) {
    const materials = getMaterialsForFloor(floor);

    for (const mat of materials) {
        if (Math.random() < mat.dropChance) {
            return {
                ...mat,
                count: 1
            };
        }
    }

    return null;
}

/**
 * Create a material item instance
 * @param {string} materialId
 * @param {number} count
 * @returns {Object}
 */
function createMaterialItem(materialId, count = 1) {
    const mat = MATERIAL_DATA[materialId];
    if (!mat) return null;

    return {
        id: mat.id,
        name: mat.name,
        type: 'material',
        tier: mat.tier,
        rarity: mat.rarity,
        stackable: mat.stackable,
        maxStack: mat.maxStack,
        sellValue: mat.sellValue,
        description: mat.description,
        count: Math.min(count, mat.maxStack)
    };
}

/**
 * Get material tier color
 * @param {number} tier
 * @returns {string}
 */
function getMaterialTierColor(tier) {
    return MATERIAL_TIER_COLORS[tier] || '#FFFFFF';
}

// ============================================================================
// EXPORTS
// ============================================================================

window.MATERIAL_DATA = MATERIAL_DATA;
window.MATERIAL_TIER_COLORS = MATERIAL_TIER_COLORS;
window.getMaterial = getMaterial;
window.getMaterialsForFloor = getMaterialsForFloor;
window.rollMaterialDrop = rollMaterialDrop;
window.createMaterialItem = createMaterialItem;
window.getMaterialTierColor = getMaterialTierColor;

console.log('[Materials] Material data loaded');
