// ============================================================================
// THE SHIFTING CHASM - ARMOR SYSTEM
// ============================================================================
// 80 Armor Pieces: 5 player types x 4 slots x 4 rarities
// 5 Shields: Common through Legendary
// 4 Legendary Armor Pieces: One per slot
// ============================================================================

// ============================================================================
// BASE STATS CONFIGURATION
// ============================================================================

const BASE_DEFENSE_BY_SLOT = {
    HEAD: { common: 4, uncommon: 8, rare: 14, epic: 20 },
    CHEST: { common: 6, uncommon: 12, rare: 20, epic: 28 },
    LEGS: { common: 4, uncommon: 10, rare: 16, epic: 24 },
    FEET: { common: 3, uncommon: 6, rare: 12, epic: 18 }
};

const BASE_HP_BY_SLOT = {
    HEAD: { common: 3, uncommon: 6, rare: 10, epic: 15 },
    CHEST: { common: 5, uncommon: 10, rare: 16, epic: 25 },
    LEGS: { common: 3, uncommon: 8, rare: 12, epic: 20 },
    FEET: { common: 2, uncommon: 5, rare: 8, epic: 15 }
};

const STATS_BY_RARITY = {
    common: { primary: 2, secondary: 0 },
    uncommon: { primary: 4, secondary: 2 },
    rare: { primary: 7, secondary: 4 },
    epic: { primary: 11, secondary: 6 }
};

const ARMOR_TYPE_MODIFIERS = {
    cloth: { defenseModifier: 0.5, hpTierModifier: 0.3, primary: 'int', secondary: 'agi' },
    ethereal: { defenseModifier: 0.6, hpTierModifier: 0.3, primary: 'int', secondary: 'agi' },
    hide: { defenseModifier: 0.8, hpTierModifier: 0.6, primary: 'agi', secondary: 'str' },
    armored: { defenseModifier: 1.0, hpTierModifier: 1.0, primary: 'str', secondary: 'agi' },
    stone: { defenseModifier: 1.1, hpTierModifier: 1.0, primary: 'str', secondary: 'str' }
};

const ADJECTIVES = {
    common: 'Crude',
    uncommon: 'Sturdy',
    rare: 'Reinforced',
    epic: 'Masterwork'
};

const SLOT_NAMES = {
    HEAD: { cloth: 'Hood', ethereal: 'Circlet', hide: 'Cap', armored: 'Helm', stone: 'Crown' },
    CHEST: { cloth: 'Robe', ethereal: 'Mantle', hide: 'Vest', armored: 'Cuirass', stone: 'Breastplate' },
    LEGS: { cloth: 'Pants', ethereal: 'Legwraps', hide: 'Leggings', armored: 'Greaves', stone: 'Legguards' },
    FEET: { cloth: 'Slippers', ethereal: 'Treads', hide: 'Boots', armored: 'Sabatons', stone: 'Stompers' }
};

const GOLD_VALUES = {
    common: { HEAD: 25, CHEST: 35, LEGS: 25, FEET: 20 },
    uncommon: { HEAD: 75, CHEST: 100, LEGS: 75, FEET: 60 },
    rare: { HEAD: 175, CHEST: 225, LEGS: 175, FEET: 150 },
    epic: { HEAD: 350, CHEST: 450, LEGS: 350, FEET: 300 }
};

// ============================================================================
// ARMOR GENERATION FUNCTION
// ============================================================================

function generateArmorPiece(armorType, slot, rarity) {
    const typeConfig = ARMOR_TYPE_MODIFIERS[armorType];
    const adjective = ADJECTIVES[rarity];
    const slotName = SLOT_NAMES[slot][armorType];
    const typeName = armorType.charAt(0).toUpperCase() + armorType.slice(1);

    const baseDef = BASE_DEFENSE_BY_SLOT[slot][rarity];
    const baseHp = BASE_HP_BY_SLOT[slot][rarity];
    const stats = STATS_BY_RARITY[rarity];

    const finalDef = Math.round(baseDef * typeConfig.defenseModifier);
    const finalHp = Math.round(baseHp * typeConfig.hpTierModifier);

    const id = `${armorType}_${rarity}_${slot.toLowerCase()}`;
    const name = `${typeName} ${adjective} ${slotName}`;

    const statBlock = {
        defense: finalDef,
        hp: finalHp,
        str: 0,
        agi: 0,
        int: 0
    };

    // Apply primary stat
    statBlock[typeConfig.primary] += stats.primary;
    // Apply secondary stat (stone doubles primary instead)
    statBlock[typeConfig.secondary] += stats.secondary;

    return {
        id,
        name,
        slot,
        armorType,
        rarity,
        stats: statBlock,
        goldValue: GOLD_VALUES[rarity][slot]
    };
}

// ============================================================================
// GENERATE ALL 80 ARMOR PIECES
// ============================================================================

const ARMOR_PIECES = {};

const PLAYER_ARMOR_TYPES = ['cloth', 'ethereal', 'hide', 'armored', 'stone'];
const SLOTS = ['HEAD', 'CHEST', 'LEGS', 'FEET'];
const RARITIES = ['common', 'uncommon', 'rare', 'epic'];

for (const armorType of PLAYER_ARMOR_TYPES) {
    for (const slot of SLOTS) {
        for (const rarity of RARITIES) {
            const piece = generateArmorPiece(armorType, slot, rarity);
            ARMOR_PIECES[piece.id] = piece;
        }
    }
}

// ============================================================================
// SHIELDS (5 total - pure defense, no armor type)
// ============================================================================

const SHIELDS = {
    'wooden_buckler': {
        id: 'wooden_buckler',
        name: 'Wooden Buckler',
        slot: 'OFF',
        armorType: null,
        rarity: 'common',
        stats: {
            defense: 5,
            hp: 0,
            str: 2,
            agi: 0,
            int: 0
        },
        goldValue: 30
    },
    'iron_kite_shield': {
        id: 'iron_kite_shield',
        name: 'Iron Kite Shield',
        slot: 'OFF',
        armorType: null,
        rarity: 'uncommon',
        stats: {
            defense: 12,
            hp: 0,
            str: 4,
            agi: 0,
            int: 0,
            pDef: 2
        },
        goldValue: 85
    },
    'reinforced_greatshield': {
        id: 'reinforced_greatshield',
        name: 'Reinforced Greatshield',
        slot: 'OFF',
        armorType: null,
        rarity: 'rare',
        stats: {
            defense: 20,
            hp: 0,
            str: 7,
            agi: 0,
            int: 0,
            pDef: 4
        },
        goldValue: 200
    },
    'fortress_shield': {
        id: 'fortress_shield',
        name: 'Fortress Shield',
        slot: 'OFF',
        armorType: null,
        rarity: 'epic',
        stats: {
            defense: 25,
            hp: 0,
            str: 11,
            agi: 0,
            int: 0,
            pDef: 6
        },
        goldValue: 400
    },
    'worldstone_barrier': {
        id: 'worldstone_barrier',
        name: 'Worldstone Barrier',
        slot: 'OFF',
        armorType: null,
        rarity: 'legendary',
        stats: {
            defense: 30,
            hp: 10,
            str: 15,
            agi: 0,
            int: 0,
            pDef: 8
        },
        goldValue: 800
    }
};

// ============================================================================
// LEGENDARY ARMOR (4 total - one per slot)
// ============================================================================

const LEGENDARY_ARMOR = {
    'crown_of_embers': {
        id: 'crown_of_embers',
        name: 'Crown of Embers',
        slot: 'HEAD',
        armorType: 'stone',
        rarity: 'legendary',
        stats: {
            defense: 24,
            hp: 18,
            str: 14,
            agi: 0,
            int: 0
        },
        special: {
            fireResist: 0.10
        },
        element: 'fire',
        goldValue: 750
    },
    'voidheart_mantle': {
        id: 'voidheart_mantle',
        name: 'Voidheart Mantle',
        slot: 'CHEST',
        armorType: 'ethereal',
        rarity: 'legendary',
        stats: {
            defense: 18,
            hp: 8,
            str: 0,
            agi: 0,
            int: 18
        },
        special: {
            spellEcho: 0.20
        },
        element: 'dark',
        goldValue: 850
    },
    'ironhide_greaves': {
        id: 'ironhide_greaves',
        name: 'Ironhide Greaves',
        slot: 'LEGS',
        armorType: 'armored',
        rarity: 'legendary',
        stats: {
            defense: 26,
            hp: 22,
            str: 14,
            agi: 8,
            int: 0
        },
        goldValue: 800
    },
    'windstrider_boots': {
        id: 'windstrider_boots',
        name: 'Windstrider Boots',
        slot: 'FEET',
        armorType: 'hide',
        rarity: 'legendary',
        stats: {
            defense: 16,
            hp: 12,
            str: 0,
            agi: 14,
            int: 0
        },
        special: {
            movementSpeed: 0.15
        },
        goldValue: 700
    }
};

// ============================================================================
// COMBINED ARMOR DATA
// ============================================================================

const ALL_ARMOR = {
    ...ARMOR_PIECES,
    ...SHIELDS,
    ...LEGENDARY_ARMOR
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get armor piece by ID
 * @param {string} id - Armor piece ID
 * @returns {Object|null} Armor data or null
 */
function getArmorById(id) {
    return ALL_ARMOR[id] || null;
}

/**
 * Get all armor pieces by slot
 * @param {string} slot - Slot name (HEAD, CHEST, LEGS, FEET, OFF)
 * @returns {Object[]} Array of armor pieces
 */
function getArmorBySlot(slot) {
    return Object.values(ALL_ARMOR).filter(armor => armor.slot === slot);
}

/**
 * Get all armor pieces by rarity
 * @param {string} rarity - Rarity level
 * @returns {Object[]} Array of armor pieces
 */
function getArmorByRarity(rarity) {
    return Object.values(ALL_ARMOR).filter(armor => armor.rarity === rarity);
}

/**
 * Get all armor pieces by armor type
 * @param {string} armorType - Armor type (cloth, hide, etc.)
 * @returns {Object[]} Array of armor pieces
 */
function getArmorByType(armorType) {
    return Object.values(ALL_ARMOR).filter(armor => armor.armorType === armorType);
}

/**
 * Get all shields
 * @returns {Object[]} Array of shield items
 */
function getAllShields() {
    return Object.values(SHIELDS);
}

/**
 * Get all legendary armor
 * @returns {Object[]} Array of legendary armor pieces
 */
function getAllLegendaryArmor() {
    return Object.values(LEGENDARY_ARMOR);
}

/**
 * Get armor for a specific slot and rarity
 * @param {string} slot - Equipment slot
 * @param {string} rarity - Rarity level
 * @returns {Object[]} Array of matching armor pieces
 */
function getArmorBySlotAndRarity(slot, rarity) {
    return Object.values(ALL_ARMOR).filter(
        armor => armor.slot === slot && armor.rarity === rarity
    );
}

/**
 * Get random armor piece matching criteria
 * @param {Object} criteria - Filter criteria {slot, rarity, armorType}
 * @returns {Object|null} Random matching armor or null
 */
function getRandomArmor(criteria = {}) {
    let pool = Object.values(ALL_ARMOR);

    if (criteria.slot) {
        pool = pool.filter(a => a.slot === criteria.slot);
    }
    if (criteria.rarity) {
        pool = pool.filter(a => a.rarity === criteria.rarity);
    }
    if (criteria.armorType) {
        pool = pool.filter(a => a.armorType === criteria.armorType);
    }

    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Calculate total stats from equipped armor
 * @param {Object[]} equippedArmor - Array of armor piece objects
 * @returns {Object} Combined stats
 */
function calculateArmorStats(equippedArmor) {
    const totals = {
        defense: 0,
        hp: 0,
        str: 0,
        agi: 0,
        int: 0,
        pDef: 0,
        mDef: 0
    };

    for (const armor of equippedArmor) {
        if (!armor || !armor.stats) continue;

        for (const [stat, value] of Object.entries(armor.stats)) {
            if (totals.hasOwnProperty(stat)) {
                totals[stat] += value;
            }
        }
    }

    return totals;
}

// ============================================================================
// EXPORTS
// ============================================================================

window.ALL_ARMOR = ALL_ARMOR;
window.ARMOR_PIECES = ARMOR_PIECES;
window.SHIELDS = SHIELDS;
window.LEGENDARY_ARMOR = LEGENDARY_ARMOR;
window.BASE_DEFENSE_BY_SLOT = BASE_DEFENSE_BY_SLOT;
window.BASE_HP_BY_SLOT = BASE_HP_BY_SLOT;
window.STATS_BY_RARITY = STATS_BY_RARITY;
window.ARMOR_TYPE_MODIFIERS = ARMOR_TYPE_MODIFIERS;

window.getArmorById = getArmorById;
window.getArmorBySlot = getArmorBySlot;
window.getArmorByRarity = getArmorByRarity;
window.getArmorByType = getArmorByType;
window.getAllShields = getAllShields;
window.getAllLegendaryArmor = getAllLegendaryArmor;
window.getArmorBySlotAndRarity = getArmorBySlotAndRarity;
window.getRandomArmor = getRandomArmor;
window.calculateArmorStats = calculateArmorStats;

// Legacy compatibility - export as DEFENSE_ARMOR for existing code
window.DEFENSE_ARMOR = ALL_ARMOR;

const armorCount = Object.keys(ARMOR_PIECES).length;
const shieldCount = Object.keys(SHIELDS).length;
const legendaryCount = Object.keys(LEGENDARY_ARMOR).length;
console.log(`[ArmorDefense] Loaded ${armorCount} armor pieces, ${shieldCount} shields, ${legendaryCount} legendaries (${armorCount + shieldCount + legendaryCount} total)`);
