// ============================================================================
// WEAPONS - MELEE (Swords + Maces)
// Exactly 10 weapons: 5 Swords, 5 Maces
// ============================================================================

const MELEE_WEAPONS = {

// === SWORDS (5) === [Blade: Primary STR (60%), Secondary AGI (40%)]
'rusty_sword': {
    id: 'rusty_sword',
    name: 'Rusty Sword',
    type: 'sword',
    damageType: 'blade',
    rarity: 'common',
    damage: 7,
    speed: 1.0,
    range: 1.25,
    stats: { str: 2, agi: 1, int: 0, pDef: 0, mDef: 0 },
    special: {},
    slot: 'MAIN',
    goldValue: 15
},
'steel_longsword': {
    id: 'steel_longsword',
    name: 'Steel Longsword',
    type: 'sword',
    damageType: 'blade',
    rarity: 'uncommon',
    damage: 13,
    speed: 1.0,
    range: 1.25,
    stats: { str: 4, agi: 2, int: 0, pDef: 0, mDef: 0 },
    special: {},
    slot: 'MAIN',
    goldValue: 75
},
'volcanic_scimitar': {
    id: 'volcanic_scimitar',
    name: 'Volcanic Scimitar',
    type: 'sword',
    damageType: 'blade',
    rarity: 'rare',
    damage: 17,
    speed: 0.95,
    range: 1.25,
    stats: { str: 7, agi: 4, int: 0, pDef: 0, mDef: 0 },
    special: { critBonus: 0.10 },
    slot: 'MAIN',
    goldValue: 160
},
'executioners_blade': {
    id: 'executioners_blade',
    name: "Executioner's Blade",
    type: 'sword',
    damageType: 'blade',
    rarity: 'epic',
    damage: 22,
    speed: 0.85,
    range: 1.25,
    stats: { str: 11, agi: 7, int: 0, pDef: 0, mDef: 0 },
    special: { critBonus: 0.15, executeBonus: 0.15 },
    slot: 'MAIN',
    goldValue: 300
},
'primordial_edge': {
    id: 'primordial_edge',
    name: 'Primordial Edge',
    type: 'sword',
    damageType: 'blade',
    rarity: 'legendary',
    damage: 27,
    speed: 1.05,
    range: 1.25,
    stats: { str: 15, agi: 10, int: 0, pDef: 0, mDef: 0 },
    special: { critBonus: 0.20, lifeSteal: 0.15 },
    slot: 'MAIN',
    goldValue: 1200
},

// === MACES (5) === [Blunt: Primary STR (60%), Secondary pDef (40%)]
'wooden_club': {
    id: 'wooden_club',
    name: 'Wooden Club',
    type: 'mace',
    damageType: 'blunt',
    rarity: 'common',
    damage: 8,
    speed: 0.9,
    range: 1.25,
    stats: { str: 2, agi: 0, int: 0, pDef: 1, mDef: 0 },
    special: {},
    slot: 'MAIN',
    goldValue: 10
},
'steel_mace': {
    id: 'steel_mace',
    name: 'Steel Mace',
    type: 'mace',
    damageType: 'blunt',
    rarity: 'uncommon',
    damage: 14,
    speed: 0.9,
    range: 1.25,
    stats: { str: 4, agi: 0, int: 0, pDef: 2, mDef: 0 },
    special: { stagger: 0.10 },
    slot: 'MAIN',
    goldValue: 80
},
'molten_crusher': {
    id: 'molten_crusher',
    name: 'Molten Crusher',
    type: 'mace',
    damageType: 'blunt',
    rarity: 'rare',
    damage: 19,
    speed: 0.8,
    range: 1.25,
    stats: { str: 7, agi: 0, int: 0, pDef: 4, mDef: 0 },
    special: { armorPen: 0.20 },
    slot: 'MAIN',
    goldValue: 175
},
'worldsplitter': {
    id: 'worldsplitter',
    name: 'Worldsplitter',
    type: 'mace',
    damageType: 'blunt',
    rarity: 'epic',
    damage: 25,
    speed: 0.7,
    range: 1.25,
    stats: { str: 11, agi: 0, int: 0, pDef: 7, mDef: 0 },
    special: { armorPen: 0.25, stagger: 0.15 },
    slot: 'MAIN',
    goldValue: 400
},
'titans_grasp': {
    id: 'titans_grasp',
    name: "Titan's Grasp",
    type: 'mace',
    damageType: 'blunt',
    rarity: 'legendary',
    damage: 30,
    speed: 0.7,
    range: 1.25,
    stats: { str: 15, agi: 0, int: 0, pDef: 10, mDef: 0 },
    special: { armorPen: 0.30, stagger: 0.20 },
    slot: 'MAIN',
    goldValue: 1300
}

};

window.MELEE_WEAPONS = MELEE_WEAPONS;
console.log('[MeleeWeapons] Loaded', Object.keys(MELEE_WEAPONS).length, 'weapons');
