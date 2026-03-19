// ============================================================================
// THE SHIFTING CHASM - WEAPON VS ARMOR MATRIX
// ============================================================================
// Damage multipliers based on weapon damage type vs armor type
// Row = Weapon Damage Type (blade/blunt/pierce/magic)
// Column = Armor Type (8 types including cloth)
// Values: 0.7 (weak), 1.0 (neutral), 1.3 (strong)
// ============================================================================

const WEAPON_ARMOR_MATRIX = {
    blade:  { unarmored: 1.3, cloth: 1.3, hide: 1.0, scaled: 1.0, armored: 0.7, stone: 0.7, bone: 1.0, ethereal: 1.0 },
    blunt:  { unarmored: 1.0, cloth: 1.0, hide: 1.0, scaled: 1.0, armored: 1.3, stone: 1.3, bone: 1.3, ethereal: 0.7 },
    pierce: { unarmored: 1.0, cloth: 1.3, hide: 1.3, scaled: 1.3, armored: 0.7, stone: 0.7, bone: 1.0, ethereal: 1.3 },
    magic:  { unarmored: 1.3, cloth: 1.0, hide: 1.0, scaled: 1.0, armored: 1.3, stone: 1.3, bone: 1.0, ethereal: 0.7 },
};

// ============================================================================
// WEAPON TO DAMAGE TYPE MAPPING
// ============================================================================
// Maps weapon types to their damage types for the weapon/armor matrix
// ============================================================================

const WEAPON_DAMAGE_TYPE = {
    sword:   'blade',
    mace:    'blunt',
    polearm: 'pierce',
    bow:     'pierce',
    dagger:  'pierce',  // Changed from blade to pierce!
    staff:   'magic',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get damage type for a weapon type
 * @param {string} weaponType - Weapon type (sword/mace/polearm/bow/dagger/staff)
 * @returns {string} Damage type (blade/blunt/pierce/magic)
 */
function getWeaponDamageType(weaponType) {
    return WEAPON_DAMAGE_TYPE[weaponType] || 'blunt'; // Default to blunt (unarmed)
}

/**
 * Get damage multiplier for weapon vs armor matchup
 * @param {string} weaponType - Weapon damage type (blade/blunt/pierce/magic)
 * @param {string} armorType - Defender's armor type
 * @returns {number} Multiplier (0.7 to 1.3)
 */
function getWeaponArmorModifier(weaponType, armorType) {
    if (!weaponType || !armorType) return 1.0;

    const multiplier = WEAPON_ARMOR_MATRIX[weaponType]?.[armorType];

    if (multiplier === undefined) {
        console.warn(`[WeaponArmor] Unknown matchup: ${weaponType} vs ${armorType}`);
        return 1.0;
    }

    return multiplier;
}

/**
 * Get armor types that weapon is strong against
 * @param {string} weaponType - Weapon damage type
 * @returns {string[]} Array of armor types that take 1.3x damage
 */
function getWeaponStrongAgainst(weaponType) {
    const row = WEAPON_ARMOR_MATRIX[weaponType];
    if (!row) return [];

    return Object.entries(row)
        .filter(([armor, mod]) => mod > 1.0)
        .map(([armor]) => armor);
}

/**
 * Get armor types that weapon is weak against
 * @param {string} weaponType - Weapon damage type
 * @returns {string[]} Array of armor types that take 0.7x damage
 */
function getWeaponWeakAgainst(weaponType) {
    const row = WEAPON_ARMOR_MATRIX[weaponType];
    if (!row) return [];

    return Object.entries(row)
        .filter(([armor, mod]) => mod < 1.0)
        .map(([armor]) => armor);
}

/**
 * Get weapon types that armor is weak to
 * @param {string} armorType - Armor type
 * @returns {string[]} Array of weapon types that deal 1.3x damage
 */
function getArmorWeakTo(armorType) {
    const weakTo = [];
    for (const [weapon, matchups] of Object.entries(WEAPON_ARMOR_MATRIX)) {
        if (matchups[armorType] > 1.0) {
            weakTo.push(weapon);
        }
    }
    return weakTo;
}

/**
 * Get weapon types that armor is resistant to
 * @param {string} armorType - Armor type
 * @returns {string[]} Array of weapon types that deal 0.7x damage
 */
function getArmorResistantTo(armorType) {
    const resistantTo = [];
    for (const [weapon, matchups] of Object.entries(WEAPON_ARMOR_MATRIX)) {
        if (matchups[armorType] < 1.0) {
            resistantTo.push(weapon);
        }
    }
    return resistantTo;
}

/**
 * Format weapon/armor multiplier for display
 * @param {number} multiplier - The multiplier value (0.7, 1.0, or 1.3)
 * @returns {string} Formatted string like "+30%", "0%", or "-30%"
 */
function formatWeaponArmorModifier(multiplier) {
    if (multiplier === 1.0) return '0%';
    const percent = Math.round((multiplier - 1.0) * 100);
    const sign = percent > 0 ? '+' : '';
    return `${sign}${percent}%`;
}

/**
 * Get effectiveness description
 * @param {number} multiplier - The multiplier value (0.7, 1.0, or 1.3)
 * @returns {string} Description: 'effective', 'normal', or 'ineffective'
 */
function getEffectivenessDescription(multiplier) {
    if (multiplier > 1.0) return 'effective';
    if (multiplier < 1.0) return 'ineffective';
    return 'normal';
}

// ============================================================================
// EXPORTS
// ============================================================================

window.WEAPON_ARMOR_MATRIX = WEAPON_ARMOR_MATRIX;
window.WEAPON_DAMAGE_TYPE = WEAPON_DAMAGE_TYPE;
window.getWeaponDamageType = getWeaponDamageType;
window.getWeaponArmorModifier = getWeaponArmorModifier;
window.getWeaponStrongAgainst = getWeaponStrongAgainst;
window.getWeaponWeakAgainst = getWeaponWeakAgainst;
window.getArmorWeakTo = getArmorWeakTo;
window.getArmorResistantTo = getArmorResistantTo;
window.formatWeaponArmorModifier = formatWeaponArmorModifier;
window.getEffectivenessDescription = getEffectivenessDescription;

console.log('[WeaponArmor] Loaded weapon vs armor damage matrix (multiplier-based)');