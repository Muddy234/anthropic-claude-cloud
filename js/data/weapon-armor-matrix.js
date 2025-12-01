// ============================================================================
// THE SHIFTING CHASM - WEAPON VS ARMOR MATRIX
// ============================================================================
// Damage modifiers based on weapon damage type vs armor type
// Row = Weapon Damage Type (blade/blunt/pierce)
// Column = Armor Type (7 types)
// Values: -0.30 (weak), 0 (neutral), +0.30 (strong)
// ============================================================================

const WEAPON_ARMOR_MATRIX = {
    blade: {
        unarmored: 0.30,   // Blades excel vs unprotected flesh
        hide: 0,           // Neutral vs tough skin
        scaled: 0,         // Neutral vs natural plates
        armored: -0.30,    // Poor vs metal plate
        stone: -0.30,      // Poor vs rock
        bone: 0,           // Neutral vs skeletal
        ethereal: 0        // Neutral vs incorporeal
    },
    blunt: {
        unarmored: 0,      // Neutral vs flesh
        hide: 0,           // Neutral vs tough skin
        scaled: 0,         // Neutral vs natural plates
        armored: 0.30,     // Excellent vs metal (dents/crushes)
        stone: 0.30,       // Excellent vs rock (shatters)
        bone: 0.30,        // Excellent vs skeletal (breaks)
        ethereal: -0.30    // Poor vs incorporeal (passes through)
    },
    pierce: {
        unarmored: 0,      // Neutral vs flesh
        hide: 0.30,        // Excellent vs tough skin (penetrates)
        scaled: 0.30,      // Excellent vs plates (finds gaps)
        armored: -0.30,    // Poor vs solid metal
        stone: -0.30,      // Poor vs solid rock
        bone: 0,           // Neutral vs skeletal
        ethereal: 0.30     // Excellent vs spirits (anchors)
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get damage modifier for weapon vs armor matchup
 * @param {string} weaponType - Weapon damage type (blade/blunt/pierce)
 * @param {string} armorType - Defender's armor type
 * @returns {number} Modifier (-0.30 to +0.30)
 */
function getWeaponArmorModifier(weaponType, armorType) {
    if (!weaponType || !armorType) return 0;
    
    const modifier = WEAPON_ARMOR_MATRIX[weaponType]?.[armorType];
    
    if (modifier === undefined) {
        console.warn(`[WeaponArmor] Unknown matchup: ${weaponType} vs ${armorType}`);
        return 0;
    }
    
    return modifier;
}

/**
 * Get armor types that weapon is strong against
 * @param {string} weaponType - Weapon damage type
 * @returns {string[]} Array of armor types that take +30% damage
 */
function getWeaponStrongAgainst(weaponType) {
    const row = WEAPON_ARMOR_MATRIX[weaponType];
    if (!row) return [];
    
    return Object.entries(row)
        .filter(([armor, mod]) => mod > 0)
        .map(([armor]) => armor);
}

/**
 * Get armor types that weapon is weak against
 * @param {string} weaponType - Weapon damage type
 * @returns {string[]} Array of armor types that take -30% damage
 */
function getWeaponWeakAgainst(weaponType) {
    const row = WEAPON_ARMOR_MATRIX[weaponType];
    if (!row) return [];
    
    return Object.entries(row)
        .filter(([armor, mod]) => mod < 0)
        .map(([armor]) => armor);
}

/**
 * Get weapon types that armor is weak to
 * @param {string} armorType - Armor type
 * @returns {string[]} Array of weapon types that deal +30% damage
 */
function getArmorWeakTo(armorType) {
    const weakTo = [];
    for (const [weapon, matchups] of Object.entries(WEAPON_ARMOR_MATRIX)) {
        if (matchups[armorType] > 0) {
            weakTo.push(weapon);
        }
    }
    return weakTo;
}

/**
 * Get weapon types that armor is resistant to
 * @param {string} armorType - Armor type
 * @returns {string[]} Array of weapon types that deal -30% damage
 */
function getArmorResistantTo(armorType) {
    const resistantTo = [];
    for (const [weapon, matchups] of Object.entries(WEAPON_ARMOR_MATRIX)) {
        if (matchups[armorType] < 0) {
            resistantTo.push(weapon);
        }
    }
    return resistantTo;
}

/**
 * Format weapon/armor modifier for display
 * @param {number} modifier - The modifier value
 * @returns {string} Formatted string like "+30%" or "-30%"
 */
function formatWeaponArmorModifier(modifier) {
    if (modifier === 0) return '0%';
    const sign = modifier > 0 ? '+' : '';
    return `${sign}${Math.round(modifier * 100)}%`;
}

/**
 * Get effectiveness description
 * @param {number} modifier - The modifier value
 * @returns {string} Description: 'effective', 'normal', or 'ineffective'
 */
function getEffectivenessDescription(modifier) {
    if (modifier > 0) return 'effective';
    if (modifier < 0) return 'ineffective';
    return 'normal';
}

// ============================================================================
// EXPORTS
// ============================================================================

window.WEAPON_ARMOR_MATRIX = WEAPON_ARMOR_MATRIX;
window.getWeaponArmorModifier = getWeaponArmorModifier;
window.getWeaponStrongAgainst = getWeaponStrongAgainst;
window.getWeaponWeakAgainst = getWeaponWeakAgainst;
window.getArmorWeakTo = getArmorWeakTo;
window.getArmorResistantTo = getArmorResistantTo;
window.formatWeaponArmorModifier = formatWeaponArmorModifier;
window.getEffectivenessDescription = getEffectivenessDescription;

console.log('[WeaponArmor] Loaded weapon vs armor damage matrix');