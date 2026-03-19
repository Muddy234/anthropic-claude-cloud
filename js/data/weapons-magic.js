// ============================================================================
// WEAPONS - MAGIC (Staffs only)
// Exactly 5 weapons: 5 Staffs
// ============================================================================

const MAGIC_WEAPONS = {

// === STAFFS (5) === [Magic: Primary INT (70%), Secondary mDef (30%)]
'gnarled_staff': {
    id: 'gnarled_staff',
    name: 'Gnarled Staff',
    type: 'staff',
    damageType: 'magic',
    rarity: 'common',
    damage: 6,
    speed: 0.9,
    range: 2,
    stats: { str: 0, agi: 0, int: 2, pDef: 0, mDef: 1 },
    special: {},
    slot: 'MAIN',
    goldValue: 15
},
'carved_staff': {
    id: 'carved_staff',
    name: 'Carved Staff',
    type: 'staff',
    damageType: 'magic',
    rarity: 'uncommon',
    damage: 11,
    speed: 0.9,
    range: 2,
    stats: { str: 0, agi: 0, int: 5, pDef: 0, mDef: 2 },
    special: { spellEcho: 0.05 },
    slot: 'MAIN',
    goldValue: 75
},
'channelers_staff': {
    id: 'channelers_staff',
    name: "Channeler's Staff",
    type: 'staff',
    damageType: 'magic',
    rarity: 'rare',
    damage: 15,
    speed: 0.9,
    range: 2,
    stats: { str: 0, agi: 0, int: 8, pDef: 0, mDef: 3 },
    special: { spellEcho: 0.10, magicPen: 0.10 },
    slot: 'MAIN',
    goldValue: 165
},
'archmage_staff': {
    id: 'archmage_staff',
    name: 'Archmage Staff',
    type: 'staff',
    damageType: 'magic',
    rarity: 'epic',
    damage: 20,
    speed: 0.9,
    range: 2,
    stats: { str: 0, agi: 0, int: 12, pDef: 0, mDef: 5 },
    special: { spellEcho: 0.15, magicPen: 0.20 },
    slot: 'MAIN',
    goldValue: 360
},
'conduit_of_ruin': {
    id: 'conduit_of_ruin',
    name: 'Conduit of Ruin',
    type: 'staff',
    damageType: 'magic',
    rarity: 'legendary',
    damage: 25,
    speed: 0.95,
    range: 2,
    stats: { str: 0, agi: 0, int: 18, pDef: 0, mDef: 8 },
    special: { spellEcho: 0.20, magicPen: 0.25, manaRegen: 0.15 },
    slot: 'MAIN',
    goldValue: 1350
}

};

window.MAGIC_WEAPONS = MAGIC_WEAPONS;
console.log('[MagicWeapons] Loaded', Object.keys(MAGIC_WEAPONS).length, 'weapons');
