// ============================================================================
// THE SHIFTING CHASM - ARMOR TYPES
// ============================================================================
// Seven armor types for damage calculation
// Each monster and piece of player armor has one armor type
// ============================================================================

const ARMOR_TYPES = {
    unarmored: {
        id: 'unarmored',
        name: 'Unarmored',
        description: 'No significant protection. Fast and evasive, but vulnerable to cutting attacks.',
        weakTo: ['blade'],
        resistantTo: [],
        examples: ['Cinder Wisp', 'Spore Drone', 'Gutter Rat'],
        defensiveRole: 'Fast/evasive, vulnerable to blades'
    },
    hide: {
        id: 'hide',
        name: 'Hide',
        description: 'Tough skin or natural leather. Balanced protection, but vulnerable to piercing.',
        weakTo: ['pierce'],
        resistantTo: [],
        examples: ['Magma Hound', 'Frost Stalker'],
        defensiveRole: 'Balanced, weak to pierce'
    },
    scaled: {
        id: 'scaled',
        name: 'Scaled',
        description: 'Overlapping natural plates. Good natural armor, but gaps are vulnerable to piercing.',
        weakTo: ['pierce'],
        resistantTo: [],
        examples: ['Drowned Revenant', 'Blighted Treant'],
        defensiveRole: 'Natural armor, weak to pierce'
    },
    armored: {
        id: 'armored',
        name: 'Armored',
        description: 'Metal plate or constructed protection. Heavy defense, but vulnerable to crushing impacts.',
        weakTo: ['blunt'],
        resistantTo: ['blade'],
        examples: ['Grave Knight', 'Templar Remnant'],
        defensiveRole: 'Heavy protection, weak to blunt'
    },
    stone: {
        id: 'stone',
        name: 'Stone',
        description: 'Rock or mineral composition. Extreme resistance, but brittle against crushing force.',
        weakTo: ['blunt'],
        resistantTo: ['blade', 'pierce'],
        examples: ['Crystal Golem', 'Mud Shambler'],
        defensiveRole: 'Extreme resistance, weak to blunt'
    },
    bone: {
        id: 'bone',
        name: 'Bone',
        description: 'Skeletal structure. Undead resilience, but brittle against impact.',
        weakTo: ['blunt'],
        resistantTo: [],
        examples: ['Husk', 'Lich Acolyte'],
        defensiveRole: 'Undead, weak to blunt'
    },
    ethereal: {
        id: 'ethereal',
        name: 'Ethereal',
        description: 'Incorporeal or magical form. Magic-based, but vulnerable to anchoring attacks.',
        weakTo: ['pierce'],
        resistantTo: ['blunt'],
        examples: ['Void Touched', 'Shadow Creeper'],
        defensiveRole: 'Magic-based, weak to pierce'
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get armor type definition
 * @param {string} id - Armor type ID
 * @returns {Object|null} Armor type definition or null
 */
function getArmorType(id) {
    return ARMOR_TYPES[id] || null;
}

/**
 * Get all armor type IDs
 * @returns {string[]} Array of armor type IDs
 */
function getAllArmorTypeIds() {
    return Object.keys(ARMOR_TYPES);
}

/**
 * Get armor type display name
 * @param {string} id - Armor type ID
 * @returns {string} Display name
 */
function getArmorTypeName(id) {
    return ARMOR_TYPES[id]?.name || 'Unknown';
}

/**
 * Check if armor type is weak to weapon type
 * @param {string} armorType - Armor type ID
 * @param {string} weaponType - Weapon type ID
 * @returns {boolean} True if armor is weak to weapon
 */
function isArmorWeakToWeapon(armorType, weaponType) {
    const armor = ARMOR_TYPES[armorType];
    return armor?.weakTo?.includes(weaponType) || false;
}

/**
 * Check if armor type resists weapon type
 * @param {string} armorType - Armor type ID
 * @param {string} weaponType - Weapon type ID
 * @returns {boolean} True if armor resists weapon
 */
function isArmorResistantToWeapon(armorType, weaponType) {
    const armor = ARMOR_TYPES[armorType];
    return armor?.resistantTo?.includes(weaponType) || false;
}

/**
 * Get armor effectiveness description against weapon
 * @param {string} armorType - Armor type ID
 * @param {string} weaponType - Weapon type ID
 * @returns {string} 'weak', 'resistant', or 'neutral'
 */
function getArmorEffectiveness(armorType, weaponType) {
    if (isArmorWeakToWeapon(armorType, weaponType)) return 'weak';
    if (isArmorResistantToWeapon(armorType, weaponType)) return 'resistant';
    return 'neutral';
}

/**
 * Get recommended weapon types against armor
 * @param {string} armorType - Armor type ID
 * @returns {string[]} Array of effective weapon types
 */
function getRecommendedWeaponsForArmor(armorType) {
    const armor = ARMOR_TYPES[armorType];
    return armor?.weakTo || [];
}

/**
 * Get all armor types with specific weakness
 * @param {string} weaponType - Weapon type that armor is weak to
 * @returns {string[]} Array of armor type IDs
 */
function getArmorTypesWeakTo(weaponType) {
    return Object.entries(ARMOR_TYPES)
        .filter(([id, armor]) => armor.weakTo.includes(weaponType))
        .map(([id]) => id);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.ARMOR_TYPES = ARMOR_TYPES;
window.getArmorType = getArmorType;
window.getAllArmorTypeIds = getAllArmorTypeIds;
window.getArmorTypeName = getArmorTypeName;
window.isArmorWeakToWeapon = isArmorWeakToWeapon;
window.isArmorResistantToWeapon = isArmorResistantToWeapon;
window.getArmorEffectiveness = getArmorEffectiveness;
window.getRecommendedWeaponsForArmor = getRecommendedWeaponsForArmor;
window.getArmorTypesWeakTo = getArmorTypesWeakTo;

console.log('[ArmorTypes] Loaded 7 armor types');