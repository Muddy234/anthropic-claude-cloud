/**
 * Equipment Visual Mappings
 * Maps equipment IDs from equipment-loader.js to sprite keys
 * Includes palette overrides and special effects
 */

const EQUIPMENT_VISUAL_MAP = {
    // ============================================
    // SWORDS (Blade type)
    // ============================================
    'rusty_sword':        { sprite: 'sword_basic', palette: { 'W': '#8B7355' } },
    'iron_longsword':     { sprite: 'sword_basic', palette: { 'W': '#AAAAAA' } },
    'steel_longsword':    { sprite: 'sword_basic', palette: { 'W': '#C0C0C0' } },
    'silver_blade':       { sprite: 'sword_basic', palette: { 'W': '#E8E8E8' } },
    'ember_edge':         { sprite: 'sword_basic', palette: { 'W': '#FF6B35' }, glow: '#FF4400' },
    'frostbite_blade':    { sprite: 'sword_basic', palette: { 'W': '#88CCFF' }, glow: '#44AAFF' },
    'venom_fang':         { sprite: 'sword_basic', palette: { 'W': '#44AA44' }, glow: '#22FF22' },
    'shadow_blade':       { sprite: 'sword_basic', palette: { 'W': '#444466' }, glow: '#6644AA' },

    // ============================================
    // MACES (Blunt type)
    // ============================================
    'wooden_club':        { sprite: 'mace_basic',  palette: { 'M': '#8B4513', 'S': '#6B3503' } },
    'iron_mace':          { sprite: 'mace_basic',  palette: { 'M': '#666666' } },
    'steel_mace':         { sprite: 'mace_basic',  palette: { 'M': '#888888' } },
    'thunder_hammer':     { sprite: 'mace_basic',  palette: { 'M': '#FFDD44' }, glow: '#FFFF88' },
    'holy_mace':          { sprite: 'mace_basic',  palette: { 'M': '#FFD700' }, glow: '#FFFFAA' },

    // ============================================
    // AXES (Blade type)
    // ============================================
    'woodcutter_axe':     { sprite: 'axe_basic',   palette: { 'A': '#666666' } },
    'iron_battleaxe':     { sprite: 'axe_basic',   palette: { 'A': '#777777' } },
    'steel_battleaxe':    { sprite: 'axe_basic',   palette: { 'A': '#999999' } },
    'berserker_axe':      { sprite: 'axe_basic',   palette: { 'A': '#AA4444' }, glow: '#FF4444' },

    // ============================================
    // STAFFS (Magic type)
    // ============================================
    'wooden_staff':       { sprite: 'staff_basic', palette: { 'C': '#88CCFF' } },
    'apprentice_staff':   { sprite: 'staff_basic', palette: { 'C': '#AA88FF' } },
    'fire_staff':         { sprite: 'staff_basic', palette: { 'C': '#FF6644', 'O': '#FF4400' }, glow: '#FF4400' },
    'ice_staff':          { sprite: 'staff_basic', palette: { 'C': '#44CCFF', 'O': '#88DDFF' }, glow: '#44CCFF' },
    'nature_staff':       { sprite: 'staff_basic', palette: { 'C': '#44FF44', 'O': '#88FF88' }, glow: '#44FF44' },
    'arcane_staff':       { sprite: 'staff_basic', palette: { 'C': '#AA44FF', 'O': '#CC88FF' }, glow: '#AA44FF' },

    // ============================================
    // BOWS (Ranged type)
    // ============================================
    'hunting_bow':        { sprite: 'bow_basic',   palette: { 'W': '#8B4513' } },
    'longbow':            { sprite: 'bow_basic',   palette: { 'W': '#6B3503' } },
    'composite_bow':      { sprite: 'bow_basic',   palette: { 'W': '#444444' } },
    'elven_bow':          { sprite: 'bow_basic',   palette: { 'W': '#88AA88' }, glow: '#AAFFAA' },

    // ============================================
    // DAGGERS (Pierce type)
    // ============================================
    'rusty_dagger':       { sprite: 'dagger_basic', palette: { 'W': '#8B7355' } },
    'iron_dagger':        { sprite: 'dagger_basic', palette: { 'W': '#AAAAAA' } },
    'assassin_blade':     { sprite: 'dagger_basic', palette: { 'W': '#444444' } },
    'poison_dagger':      { sprite: 'dagger_basic', palette: { 'W': '#44AA44' }, glow: '#44FF44' },

    // ============================================
    // SHIELDS (Off-hand)
    // ============================================
    'wooden_shield':      { sprite: 'shield_wood', palette: { 'S': '#8B4513' } },
    'iron_shield':        { sprite: 'shield_wood', palette: { 'S': '#666666', 'M': '#888888' } },
    'steel_shield':       { sprite: 'shield_wood', palette: { 'S': '#888888', 'M': '#AAAAAA' } },
    'tower_shield':       { sprite: 'shield_wood', palette: { 'S': '#555555', 'M': '#777777' } },

    // ============================================
    // HELMS (Head armor)
    // ============================================
    'leather_cap':        { sprite: 'helm_iron',   palette: { 'M': '#8B4513', 'D': '#6B3503', 'V': '#442200' } },
    'iron_helm':          { sprite: 'helm_iron',   palette: { 'M': '#666666' } },
    'steel_helm':         { sprite: 'helm_iron',   palette: { 'M': '#888888' } },
    'knight_helm':        { sprite: 'helm_iron',   palette: { 'M': '#AAAAAA' } },
    'dark_helm':          { sprite: 'helm_iron',   palette: { 'M': '#333344' }, glow: '#4444AA' },

    // ============================================
    // CHEST ARMOR
    // ============================================
    'cloth_shirt':        { sprite: 'chest_leather', palette: { 'A': '#666688', 'D': '#555577' } },
    'leather_vest':       { sprite: 'chest_leather', palette: { 'A': '#8B4513' } },
    'studded_leather':    { sprite: 'chest_leather', palette: { 'A': '#7B3503', 'D': '#888888' } },
    'chainmail':          { sprite: 'chest_leather', palette: { 'A': '#777777', 'D': '#666666' } },
    'plate_armor':        { sprite: 'chest_leather', palette: { 'A': '#999999', 'D': '#777777' } },

    // ============================================
    // LEG ARMOR
    // ============================================
    'cloth_pants':        { sprite: 'legs_leather', palette: { 'L': '#555566' } },
    'leather_pants':      { sprite: 'legs_leather', palette: { 'L': '#704214' } },
    'chainmail_leggings': { sprite: 'legs_leather', palette: { 'L': '#666666' } },
    'plate_greaves':      { sprite: 'legs_leather', palette: { 'L': '#888888' } },

    // ============================================
    // BOOTS (Foot armor)
    // ============================================
    'cloth_shoes':        { sprite: 'boots_leather', palette: { 'B': '#444455' } },
    'leather_boots':      { sprite: 'boots_leather', palette: { 'B': '#5C3317' } },
    'iron_boots':         { sprite: 'boots_leather', palette: { 'B': '#555555' } },
    'plate_boots':        { sprite: 'boots_leather', palette: { 'B': '#777777' } }
};

// Rarity accent colors (applied to 'G' palette key if present, adds glow)
const RARITY_PALETTE_MODIFIERS = {
    common:    { accentColor: null, glowIntensity: 0 },
    uncommon:  { accentColor: '#2ECC71', glowIntensity: 2 },
    rare:      { accentColor: '#3498DB', glowIntensity: 3 },
    epic:      { accentColor: '#9B59B6', glowIntensity: 4 },
    legendary: { accentColor: '#E91E63', glowIntensity: 6 }
};

// Element colors for weapons
const ELEMENT_COLORS = {
    fire:    { color: '#FF6B35', glow: '#FF4400' },
    ice:     { color: '#88CCFF', glow: '#44AAFF' },
    water:   { color: '#4488FF', glow: '#2266FF' },
    earth:   { color: '#8B7355', glow: '#AA9966' },
    nature:  { color: '#44AA44', glow: '#22FF22' },
    poison:  { color: '#88AA44', glow: '#AAFF44' },
    death:   { color: '#664488', glow: '#8866AA' },
    holy:    { color: '#FFD700', glow: '#FFFFAA' },
    arcane:  { color: '#AA44FF', glow: '#CC88FF' },
    dark:    { color: '#444466', glow: '#6644AA' }
};

// Helper to get visual data for equipment
function getEquipmentVisual(equipmentId) {
    return EQUIPMENT_VISUAL_MAP[equipmentId] || null;
}

// Helper to apply rarity modifier
function applyRarityModifier(palette, rarity) {
    const modifier = RARITY_PALETTE_MODIFIERS[rarity];
    if (!modifier || !modifier.accentColor) return palette;

    const result = { ...palette };
    if (result['G']) {
        result['G'] = modifier.accentColor;
    }
    return result;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.EQUIPMENT_VISUAL_MAP = EQUIPMENT_VISUAL_MAP;
    window.RARITY_PALETTE_MODIFIERS = RARITY_PALETTE_MODIFIERS;
    window.ELEMENT_COLORS = ELEMENT_COLORS;
    window.getEquipmentVisual = getEquipmentVisual;
    window.applyRarityModifier = applyRarityModifier;
}
