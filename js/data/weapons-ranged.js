// ============================================================================
// WEAPONS - RANGED (Polearms, Bows, Daggers)
// Exactly 15 weapons: 5 Polearms, 5 Bows, 5 Daggers
// ============================================================================

const RANGED_WEAPONS = {

// === POLEARMS (5) === [Pierce: Balanced STR (50%) / AGI (50%)]
'wooden_spear': {
    id: 'wooden_spear',
    name: 'Wooden Spear',
    type: 'polearm',
    damageType: 'pierce',
    rarity: 'common',
    damage: 7,
    speed: 0.95,
    range: 2,
    stats: { str: 1, agi: 2, int: 0, pDef: 0, mDef: 0 },
    special: {},
    slot: 'MAIN',
    goldValue: 15
},
'steel_halberd': {
    id: 'steel_halberd',
    name: 'Steel Halberd',
    type: 'polearm',
    damageType: 'pierce',
    rarity: 'uncommon',
    damage: 13,
    speed: 0.9,
    range: 2,
    stats: { str: 3, agi: 3, int: 0, pDef: 0, mDef: 0 },
    special: { reach: 1 },
    slot: 'MAIN',
    goldValue: 80
},
'serrated_pike': {
    id: 'serrated_pike',
    name: 'Serrated Pike',
    type: 'polearm',
    damageType: 'pierce',
    rarity: 'rare',
    damage: 17,
    speed: 0.85,
    range: 2,
    stats: { str: 5, agi: 6, int: 0, pDef: 0, mDef: 0 },
    special: { reach: 1, bleed: 0.10 },
    slot: 'MAIN',
    goldValue: 165
},
'warlords_glaive': {
    id: 'warlords_glaive',
    name: "Warlord's Glaive",
    type: 'polearm',
    damageType: 'pierce',
    rarity: 'epic',
    damage: 22,
    speed: 0.8,
    range: 2,
    stats: { str: 9, agi: 9, int: 0, pDef: 0, mDef: 0 },
    special: { reach: 1, bleed: 0.15, armorPen: 0.10 },
    slot: 'MAIN',
    goldValue: 375
},
'worldpiercer': {
    id: 'worldpiercer',
    name: 'Worldpiercer',
    type: 'polearm',
    damageType: 'pierce',
    rarity: 'legendary',
    damage: 27,
    speed: 0.8,
    range: 2,
    stats: { str: 12, agi: 12, int: 0, pDef: 0, mDef: 0 },
    special: { reach: 2, bleed: 0.20, armorPen: 0.15 },
    slot: 'MAIN',
    goldValue: 1200
},

// === BOWS (5) === [Pierce: Primary AGI (60%), Secondary INT (40%)]
'shortbow': {
    id: 'shortbow',
    name: 'Shortbow',
    type: 'bow',
    damageType: 'pierce',
    rarity: 'common',
    damage: 6,
    speed: 1.1,
    range: 5,
    stats: { str: 0, agi: 2, int: 1, pDef: 0, mDef: 0 },
    special: {},
    slot: 'MAIN',
    goldValue: 20
},
'hunting_bow': {
    id: 'hunting_bow',
    name: 'Hunting Bow',
    type: 'bow',
    damageType: 'pierce',
    rarity: 'uncommon',
    damage: 11,
    speed: 1.0,
    range: 5,
    stats: { str: 0, agi: 4, int: 2, pDef: 0, mDef: 0 },
    special: { critBonus: 0.10 },
    slot: 'MAIN',
    goldValue: 75
},
'stalkers_bow': {
    id: 'stalkers_bow',
    name: "Stalker's Bow",
    type: 'bow',
    damageType: 'pierce',
    rarity: 'rare',
    damage: 15,
    speed: 1.1,
    range: 5,
    stats: { str: 0, agi: 7, int: 4, pDef: 0, mDef: 0 },
    special: { critBonus: 0.15, noiseReduction: 0.30 },
    slot: 'MAIN',
    goldValue: 160
},
'deadeye_longbow': {
    id: 'deadeye_longbow',
    name: 'Deadeye Longbow',
    type: 'bow',
    damageType: 'pierce',
    rarity: 'epic',
    damage: 20,
    speed: 0.95,
    range: 6,
    stats: { str: 0, agi: 11, int: 7, pDef: 0, mDef: 0 },
    special: { critBonus: 0.20, critDmg: 0.15 },
    slot: 'MAIN',
    goldValue: 350
},
'voidstring': {
    id: 'voidstring',
    name: 'Voidstring',
    type: 'bow',
    damageType: 'pierce',
    rarity: 'legendary',
    damage: 25,
    speed: 1.15,
    range: 7,
    stats: { str: 0, agi: 15, int: 10, pDef: 0, mDef: 0 },
    special: { critBonus: 0.25, critDmg: 0.20, silent: true },
    slot: 'MAIN',
    goldValue: 1250
},

// === DAGGERS (5) === [Blade: Primary AGI (60%), Secondary STR (40%)] - Main Hand weapons
'rusty_knife': {
    id: 'rusty_knife',
    name: 'Rusty Knife',
    type: 'dagger',
    damageType: 'blade',
    rarity: 'common',
    damage: 4,
    speed: 1.4,
    range: 1.25,
    stats: { str: 1, agi: 2, int: 0, pDef: 0, mDef: 0 },
    special: {},
    slot: 'MAIN',
    goldValue: 10
},
'steel_stiletto': {
    id: 'steel_stiletto',
    name: 'Steel Stiletto',
    type: 'dagger',
    damageType: 'blade',
    rarity: 'uncommon',
    damage: 8,
    speed: 1.4,
    range: 1.25,
    stats: { str: 2, agi: 4, int: 0, pDef: 0, mDef: 0 },
    special: { critBonus: 0.10 },
    slot: 'MAIN',
    goldValue: 65
},
'shadow_knife': {
    id: 'shadow_knife',
    name: 'Shadow Knife',
    type: 'dagger',
    damageType: 'blade',
    rarity: 'rare',
    damage: 11,
    speed: 1.5,
    range: 1.25,
    stats: { str: 4, agi: 7, int: 0, pDef: 0, mDef: 0 },
    special: { critBonus: 0.15, noiseReduction: 0.40 },
    slot: 'MAIN',
    goldValue: 140
},
'assassins_fang': {
    id: 'assassins_fang',
    name: "Assassin's Fang",
    type: 'dagger',
    damageType: 'blade',
    rarity: 'epic',
    damage: 14,
    speed: 1.5,
    range: 1.25,
    stats: { str: 7, agi: 11, int: 0, pDef: 0, mDef: 0 },
    special: { critBonus: 0.20, doubleStrike: 0.10, noiseReduction: 0.50 },
    slot: 'MAIN',
    goldValue: 300
},
'whisper': {
    id: 'whisper',
    name: 'Whisper',
    type: 'dagger',
    damageType: 'blade',
    rarity: 'legendary',
    damage: 17,
    speed: 1.5,
    range: 1.25,
    stats: { str: 10, agi: 15, int: 0, pDef: 0, mDef: 0 },
    special: { critBonus: 0.25, doubleStrike: 0.15, silent: true },
    slot: 'MAIN',
    goldValue: 1200
}

};

window.RANGED_WEAPONS = RANGED_WEAPONS;
console.log('[RangedWeapons] Loaded', Object.keys(RANGED_WEAPONS).length, 'weapons');
