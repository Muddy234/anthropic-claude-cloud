// ============================================================================
// THE SHIFTING CHASM - WEAPON TYPES
// ============================================================================
// Three weapon damage types: Blade, Blunt, Pierce
// Each weapon in the game has one damage type (independent of weapon category)
// ============================================================================

const WEAPON_TYPES = {
    blade: {
        id: 'blade',
        name: 'Blade',
        description: 'Cutting weapons that excel against unprotected flesh but struggle against hard surfaces.',
        specialties: ['sword', 'knife', 'axe'],
        strongAgainst: ['unarmored'],
        weakAgainst: ['armored', 'stone'],
        combatRole: 'Anti-flesh, fast attacks'
    },
    blunt: {
        id: 'blunt',
        name: 'Blunt',
        description: 'Impact weapons that crush through armor and bone but pass through ethereal forms.',
        specialties: ['mace', 'staff', 'unarmed', 'shield'],
        strongAgainst: ['armored', 'stone', 'bone'],
        weakAgainst: ['ethereal'],
        combatRole: 'Anti-armor, stagger potential'
    },
    pierce: {
        id: 'pierce',
        name: 'Pierce',
        description: 'Penetrating weapons that find gaps in natural armor and anchor into spirits.',
        specialties: ['polearm', 'bow', 'crossbow', 'throwing'],
        strongAgainst: ['hide', 'scaled', 'ethereal'],
        weakAgainst: ['armored', 'stone'],
        combatRole: 'Reach, anti-hide, anti-ethereal'
    }
};

// ============================================================================
// WEAPON SPECIALTY TO DAMAGE TYPE MAPPING
// ============================================================================
// Maps weapon categories (specialties) to their damage types
// Note: This is the DEFAULT mapping. Individual weapons can override.

const SPECIALTY_DAMAGE_TYPE = {
    // Blade weapons
    sword: 'blade',
    knife: 'blade',
    axe: 'blade',
    
    // Blunt weapons
    mace: 'blunt',
    staff: 'blunt',
    unarmed: 'blunt',
    shield: 'blunt',
    
    // Pierce weapons
    polearm: 'pierce',
    bow: 'pierce',
    crossbow: 'pierce',
    throwing: 'pierce'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get weapon type definition
 * @param {string} id - Weapon type ID (blade/blunt/pierce)
 * @returns {Object|null} Weapon type definition or null
 */
function getWeaponType(id) {
    return WEAPON_TYPES[id] || null;
}

/**
 * Get damage type for a weapon specialty (category)
 * @param {string} specialty - Weapon specialty (sword, mace, bow, etc.)
 * @returns {string} Damage type (blade/blunt/pierce), defaults to 'blunt'
 */
function getDamageTypeForSpecialty(specialty) {
    return SPECIALTY_DAMAGE_TYPE[specialty] || 'blunt';
}

/**
 * Get all specialties for a damage type
 * @param {string} damageType - Damage type (blade/blunt/pierce)
 * @returns {string[]} Array of weapon specialties
 */
function getSpecialtiesForDamageType(damageType) {
    return WEAPON_TYPES[damageType]?.specialties || [];
}

/**
 * Check if specialty belongs to damage type
 * @param {string} specialty - Weapon specialty
 * @param {string} damageType - Damage type
 * @returns {boolean} True if specialty uses that damage type
 */
function isSpecialtyOfType(specialty, damageType) {
    return SPECIALTY_DAMAGE_TYPE[specialty] === damageType;
}

/**
 * Get all weapon type IDs
 * @returns {string[]} Array of weapon type IDs
 */
function getAllWeaponTypeIds() {
    return Object.keys(WEAPON_TYPES);
}

/**
 * Get all weapon specialties
 * @returns {string[]} Array of all weapon specialties
 */
function getAllWeaponSpecialties() {
    return Object.keys(SPECIALTY_DAMAGE_TYPE);
}

/**
 * Get weapon type display name
 * @param {string} id - Weapon type ID
 * @returns {string} Display name
 */
function getWeaponTypeName(id) {
    return WEAPON_TYPES[id]?.name || 'Unknown';
}

// ============================================================================
// EXPORTS
// ============================================================================

window.WEAPON_TYPES = WEAPON_TYPES;
window.SPECIALTY_DAMAGE_TYPE = SPECIALTY_DAMAGE_TYPE;
window.getWeaponType = getWeaponType;
window.getDamageTypeForSpecialty = getDamageTypeForSpecialty;
window.getSpecialtiesForDamageType = getSpecialtiesForDamageType;
window.isSpecialtyOfType = isSpecialtyOfType;
window.getAllWeaponTypeIds = getAllWeaponTypeIds;
window.getAllWeaponSpecialties = getAllWeaponSpecialties;
window.getWeaponTypeName = getWeaponTypeName;

console.log('[WeaponTypes] Loaded 3 weapon damage types with', Object.keys(SPECIALTY_DAMAGE_TYPE).length, 'specialties');