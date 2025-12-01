// ============================================================================
// ARMOR - MOBILITY (Legs + Feet + Utility)
// ============================================================================

const MOBILITY_ARMOR = {

// === LEGS (18) ===
'tattered_pants': { id: 'tattered_pants', name: 'Tattered Pants', slot: 'LEGS', armorType: 'unarmored', rarity: 'common', stats: { defense: 1 }, element: null, elementPower: 0, noise: { onMove: 0 }, goldValue: 10 },
'leather_leggings': { id: 'leather_leggings', name: 'Leather Leggings', slot: 'LEGS', armorType: 'hide', rarity: 'common', stats: { defense: 3 }, element: null, elementPower: 0, noise: { onMove: 0 }, goldValue: 25 },
'chain_leggings': { id: 'chain_leggings', name: 'Chain Leggings', slot: 'LEGS', armorType: 'armored', rarity: 'uncommon', stats: { defense: 5 }, element: null, elementPower: 0, special: { noiseIncrease: 0.10 }, noise: { onMove: 5 }, goldValue: 75 },
'plate_greaves': { id: 'plate_greaves', name: 'Plate Greaves', slot: 'LEGS', armorType: 'armored', rarity: 'uncommon', stats: { defense: 6 }, element: null, elementPower: 0, special: { speedPenalty: -0.05 }, noise: { onMove: 10 }, goldValue: 85 },
'bone_greaves': { id: 'bone_greaves', name: 'Bone Greaves', slot: 'LEGS', armorType: 'bone', rarity: 'uncommon', stats: { defense: 4 }, element: 'death', elementPower: 2, noise: { onMove: 0 }, goldValue: 75 },
'ember_leggings': { id: 'ember_leggings', name: 'Ember Leggings', slot: 'LEGS', armorType: 'scaled', rarity: 'uncommon', stats: { defense: 4 }, element: 'fire', elementPower: 2, noise: { onMove: 5 }, goldValue: 80 },
'frost_leggings': { id: 'frost_leggings', name: 'Frost Leggings', slot: 'LEGS', armorType: 'hide', rarity: 'uncommon', stats: { defense: 4 }, element: 'ice', elementPower: 2, noise: { onMove: 0 }, goldValue: 80 },
'coral_greaves': { id: 'coral_greaves', name: 'Coral Greaves', slot: 'LEGS', armorType: 'scaled', rarity: 'uncommon', stats: { defense: 4 }, element: 'water', elementPower: 2, noise: { onMove: 5 }, goldValue: 80 },
'stone_greaves': { id: 'stone_greaves', name: 'Stone Greaves', slot: 'LEGS', armorType: 'stone', rarity: 'uncommon', stats: { defense: 5 }, element: 'earth', elementPower: 2, special: { speedPenalty: -0.05 }, noise: { onMove: 10 }, goldValue: 85 },
'shadow_leggings': { id: 'shadow_leggings', name: 'Shadow Leggings', slot: 'LEGS', armorType: 'hide', rarity: 'uncommon', stats: { defense: 3 }, element: 'dark', elementPower: 2, special: { noiseReduction: 0.20 }, noise: { onMove: 0 }, goldValue: 85 },
'blessed_greaves': { id: 'blessed_greaves', name: 'Blessed Greaves', slot: 'LEGS', armorType: 'hide', rarity: 'rare', stats: { defense: 5 }, element: 'holy', elementPower: 3, noise: { onMove: 0 }, goldValue: 150 },
'volcanic_greaves': { id: 'volcanic_greaves', name: 'Volcanic Greaves', slot: 'LEGS', armorType: 'scaled', rarity: 'rare', stats: { defense: 6 }, element: 'fire', elementPower: 3, noise: { onMove: 5 }, goldValue: 165 },
'glacial_greaves': { id: 'glacial_greaves', name: 'Glacial Greaves', slot: 'LEGS', armorType: 'scaled', rarity: 'rare', stats: { defense: 6 }, element: 'ice', elementPower: 3, noise: { onMove: 5 }, goldValue: 165 },
'earthen_greaves': { id: 'earthen_greaves', name: 'Earthen Greaves', slot: 'LEGS', armorType: 'stone', rarity: 'rare', stats: { defense: 7 }, element: 'earth', elementPower: 3, special: { speedPenalty: -0.10 }, noise: { onMove: 10 }, goldValue: 170 },
'fortress_greaves': { id: 'fortress_greaves', name: 'Fortress Greaves', slot: 'LEGS', armorType: 'armored', rarity: 'epic', stats: { defense: 9 }, element: null, elementPower: 0, special: { speedPenalty: -0.15 }, noise: { onMove: 15 }, goldValue: 330 },
'infernal_greaves': { id: 'infernal_greaves', name: 'Infernal Greaves', slot: 'LEGS', armorType: 'scaled', rarity: 'epic', stats: { defense: 8 }, element: 'fire', elementPower: 5, noise: { onMove: 10 }, goldValue: 350 },
'voidweave_leggings': { id: 'voidweave_leggings', name: 'Voidweave Leggings', slot: 'LEGS', armorType: 'ethereal', rarity: 'epic', stats: { defense: 6 }, element: 'dark', elementPower: 5, special: { noiseReduction: 0.30 }, noise: { onMove: 0 }, goldValue: 340 },
'worldstone_greaves': { id: 'worldstone_greaves', name: 'Worldstone Greaves', slot: 'LEGS', armorType: 'stone', rarity: 'epic', stats: { defense: 9 }, element: 'earth', elementPower: 5, special: { speedPenalty: -0.10 }, noise: { onMove: 10 }, goldValue: 360 },

// === FEET (18) ===
'worn_sandals': { id: 'worn_sandals', name: 'Worn Sandals', slot: 'FEET', armorType: 'unarmored', rarity: 'common', stats: { defense: 1 }, element: null, elementPower: 0, noise: { onMove: 0 }, goldValue: 10 },
'leather_boots': { id: 'leather_boots', name: 'Leather Boots', slot: 'FEET', armorType: 'hide', rarity: 'common', stats: { defense: 2 }, element: null, elementPower: 0, noise: { onMove: 0 }, goldValue: 25 },
'iron_boots': { id: 'iron_boots', name: 'Iron Boots', slot: 'FEET', armorType: 'armored', rarity: 'uncommon', stats: { defense: 4 }, element: null, elementPower: 0, noise: { onMove: 5 }, goldValue: 70 },
'steel_boots': { id: 'steel_boots', name: 'Steel Boots', slot: 'FEET', armorType: 'armored', rarity: 'uncommon', stats: { defense: 5 }, element: null, elementPower: 0, noise: { onMove: 5 }, goldValue: 80 },
'bone_treads': { id: 'bone_treads', name: 'Bone Treads', slot: 'FEET', armorType: 'bone', rarity: 'uncommon', stats: { defense: 3 }, element: 'death', elementPower: 2, noise: { onMove: 0 }, goldValue: 70 },
'ember_boots': { id: 'ember_boots', name: 'Ember Boots', slot: 'FEET', armorType: 'scaled', rarity: 'uncommon', stats: { defense: 3 }, element: 'fire', elementPower: 2, noise: { onMove: 0 }, goldValue: 75 },
'frost_boots': { id: 'frost_boots', name: 'Frost Boots', slot: 'FEET', armorType: 'hide', rarity: 'uncommon', stats: { defense: 3 }, element: 'ice', elementPower: 2, noise: { onMove: 0 }, goldValue: 75 },
'coral_treads': { id: 'coral_treads', name: 'Coral Treads', slot: 'FEET', armorType: 'scaled', rarity: 'uncommon', stats: { defense: 3 }, element: 'water', elementPower: 2, noise: { onMove: 0 }, goldValue: 75 },
'stone_boots': { id: 'stone_boots', name: 'Stone Boots', slot: 'FEET', armorType: 'stone', rarity: 'uncommon', stats: { defense: 4 }, element: 'earth', elementPower: 2, special: { speedPenalty: -0.05 }, noise: { onMove: 5 }, goldValue: 80 },
'shadow_boots': { id: 'shadow_boots', name: 'Shadow Boots', slot: 'FEET', armorType: 'hide', rarity: 'uncommon', stats: { defense: 2 }, element: 'dark', elementPower: 2, special: { noiseReduction: 0.25 }, noise: { onMove: 0 }, goldValue: 85 },
'blessed_boots': { id: 'blessed_boots', name: 'Blessed Boots', slot: 'FEET', armorType: 'hide', rarity: 'rare', stats: { defense: 4 }, element: 'holy', elementPower: 3, noise: { onMove: 0 }, goldValue: 145 },
'volcanic_boots': { id: 'volcanic_boots', name: 'Volcanic Boots', slot: 'FEET', armorType: 'scaled', rarity: 'rare', stats: { defense: 5 }, element: 'fire', elementPower: 3, noise: { onMove: 5 }, goldValue: 155 },
'glacial_boots': { id: 'glacial_boots', name: 'Glacial Boots', slot: 'FEET', armorType: 'scaled', rarity: 'rare', stats: { defense: 5 }, element: 'ice', elementPower: 3, noise: { onMove: 0 }, goldValue: 155 },
'earthen_boots': { id: 'earthen_boots', name: 'Earthen Boots', slot: 'FEET', armorType: 'stone', rarity: 'rare', stats: { defense: 6 }, element: 'earth', elementPower: 3, special: { speedPenalty: -0.05 }, noise: { onMove: 5 }, goldValue: 165 },
'fortress_boots': { id: 'fortress_boots', name: 'Fortress Boots', slot: 'FEET', armorType: 'armored', rarity: 'epic', stats: { defense: 8 }, element: null, elementPower: 0, special: { speedPenalty: -0.10 }, noise: { onMove: 10 }, goldValue: 310 },
'infernal_boots': { id: 'infernal_boots', name: 'Infernal Boots', slot: 'FEET', armorType: 'scaled', rarity: 'epic', stats: { defense: 6 }, element: 'fire', elementPower: 5, noise: { onMove: 5 }, goldValue: 330 },
'voidweave_boots': { id: 'voidweave_boots', name: 'Voidweave Boots', slot: 'FEET', armorType: 'ethereal', rarity: 'epic', stats: { defense: 5 }, element: 'dark', elementPower: 5, special: { noiseReduction: 0.35 }, noise: { onMove: 0 }, goldValue: 325 },
'worldstone_boots': { id: 'worldstone_boots', name: 'Worldstone Boots', slot: 'FEET', armorType: 'stone', rarity: 'epic', stats: { defense: 7 }, element: 'earth', elementPower: 5, special: { speedPenalty: -0.05 }, noise: { onMove: 5 }, goldValue: 345 },

// === UTILITY (16) ===
'torch': { id: 'torch', name: 'Torch', slot: 'OFF', rarity: 'common', stats: {}, element: 'fire', elementPower: 0, special: { visionBonus: 3, noiseIncrease: 0.15 }, noise: { onMove: 10 }, goldValue: 5 },
'lantern': { id: 'lantern', name: 'Lantern', slot: 'OFF', rarity: 'uncommon', stats: {}, element: null, elementPower: 0, special: { visionBonus: 4 }, noise: { onMove: 5 }, goldValue: 40 },
'tome_of_flames': { id: 'tome_of_flames', name: 'Tome of Flames', slot: 'OFF', rarity: 'uncommon', stats: {}, element: 'fire', elementPower: 2, noise: { onMove: 0 }, goldValue: 60 },
'tome_of_frost': { id: 'tome_of_frost', name: 'Tome of Frost', slot: 'OFF', rarity: 'uncommon', stats: {}, element: 'ice', elementPower: 2, noise: { onMove: 0 }, goldValue: 60 },
'tome_of_tides': { id: 'tome_of_tides', name: 'Tome of Tides', slot: 'OFF', rarity: 'uncommon', stats: {}, element: 'water', elementPower: 2, noise: { onMove: 0 }, goldValue: 60 },
'tome_of_stone': { id: 'tome_of_stone', name: 'Tome of Stone', slot: 'OFF', rarity: 'uncommon', stats: {}, element: 'earth', elementPower: 2, noise: { onMove: 0 }, goldValue: 60 },
'tome_of_growth': { id: 'tome_of_growth', name: 'Tome of Growth', slot: 'OFF', rarity: 'uncommon', stats: {}, element: 'nature', elementPower: 2, noise: { onMove: 0 }, goldValue: 60 },
'tome_of_shadows': { id: 'tome_of_shadows', name: 'Tome of Shadows', slot: 'OFF', rarity: 'uncommon', stats: {}, element: 'dark', elementPower: 2, noise: { onMove: 0 }, goldValue: 60 },
'tome_of_light': { id: 'tome_of_light', name: 'Tome of Light', slot: 'OFF', rarity: 'uncommon', stats: {}, element: 'holy', elementPower: 2, noise: { onMove: 0 }, goldValue: 60 },
'tome_of_death': { id: 'tome_of_death', name: 'Tome of Death', slot: 'OFF', rarity: 'uncommon', stats: {}, element: 'death', elementPower: 2, noise: { onMove: 0 }, goldValue: 60 },
'tome_of_secrets': { id: 'tome_of_secrets', name: 'Tome of Secrets', slot: 'OFF', rarity: 'uncommon', stats: {}, element: 'arcane', elementPower: 2, noise: { onMove: 0 }, goldValue: 60 },
'blessed_talisman': { id: 'blessed_talisman', name: 'Blessed Talisman', slot: 'OFF', rarity: 'rare', stats: {}, element: 'holy', elementPower: 3, noise: { onMove: 0 }, goldValue: 120 },
'occult_focus': { id: 'occult_focus', name: 'Occult Focus', slot: 'OFF', rarity: 'rare', stats: {}, element: 'death', elementPower: 3, noise: { onMove: 0 }, goldValue: 120 },
'arcane_prism': { id: 'arcane_prism', name: 'Arcane Prism', slot: 'OFF', rarity: 'rare', stats: {}, element: 'arcane', elementPower: 3, noise: { onMove: 0 }, goldValue: 120 },
'shadow_cloak': { id: 'shadow_cloak', name: 'Shadow Cloak', slot: 'OFF', rarity: 'rare', stats: {}, element: 'dark', elementPower: 3, special: { noiseReduction: 0.30 }, noise: { onMove: 0 }, goldValue: 130 },
'elemental_core': { id: 'elemental_core', name: 'Elemental Core', slot: 'OFF', rarity: 'epic', stats: {}, element: null, elementPower: 5, special: { elementMatch: true }, noise: { onMove: 0 }, goldValue: 250 }

};

window.MOBILITY_ARMOR = MOBILITY_ARMOR;
console.log('[MobilityArmor] Loaded', Object.keys(MOBILITY_ARMOR).length, 'items');