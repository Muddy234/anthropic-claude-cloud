// ============================================================================
// ARMOR - DEFENSE (Shields + Head + Chest)
// ============================================================================

const DEFENSE_ARMOR = {

// === SHIELDS (24) ===
'wooden_shield': { id: 'wooden_shield', name: 'Wooden Shield', slot: 'OFF', armorType: 'hide', rarity: 'common', stats: { defense: 2, block: 0.15 }, element: null, elementPower: 0, noise: { onMove: 5 }, goldValue: 15 },
'iron_shield': { id: 'iron_shield', name: 'Iron Shield', slot: 'OFF', armorType: 'armored', rarity: 'common', stats: { defense: 3, block: 0.20 }, element: null, elementPower: 0, noise: { onMove: 10 }, goldValue: 35 },
'steel_shield': { id: 'steel_shield', name: 'Steel Shield', slot: 'OFF', armorType: 'armored', rarity: 'uncommon', stats: { defense: 4, block: 0.25 }, element: null, elementPower: 0, noise: { onMove: 10 }, goldValue: 80 },
'tower_shield': { id: 'tower_shield', name: 'Tower Shield', slot: 'OFF', armorType: 'armored', rarity: 'uncommon', stats: { defense: 6, block: 0.35 }, element: null, elementPower: 0, special: { speedPenalty: -0.10 }, noise: { onMove: 15 }, goldValue: 100 },
'hide_shield': { id: 'hide_shield', name: 'Hide Shield', slot: 'OFF', armorType: 'hide', rarity: 'uncommon', stats: { defense: 3, block: 0.20 }, element: null, elementPower: 0, noise: { onMove: 5 }, goldValue: 70 },
'bone_buckler': { id: 'bone_buckler', name: 'Bone Buckler', slot: 'OFF', armorType: 'bone', rarity: 'uncommon', stats: { defense: 2, block: 0.18 }, element: 'death', elementPower: 2, noise: { onMove: 5 }, goldValue: 75 },
'spiked_shield': { id: 'spiked_shield', name: 'Spiked Shield', slot: 'OFF', armorType: 'armored', rarity: 'uncommon', stats: { defense: 3, block: 0.20 }, element: null, elementPower: 0, special: { reflectDmg: 3 }, noise: { onMove: 10 }, goldValue: 85 },
'ember_buckler': { id: 'ember_buckler', name: 'Ember Buckler', slot: 'OFF', armorType: 'scaled', rarity: 'uncommon', stats: { defense: 3, block: 0.20 }, element: 'fire', elementPower: 2, noise: { onMove: 5 }, goldValue: 85 },
'frost_guard': { id: 'frost_guard', name: 'Frost Guard', slot: 'OFF', armorType: 'scaled', rarity: 'uncommon', stats: { defense: 4, block: 0.22 }, element: 'ice', elementPower: 2, noise: { onMove: 5 }, goldValue: 90 },
'coral_shield': { id: 'coral_shield', name: 'Coral Shield', slot: 'OFF', armorType: 'scaled', rarity: 'uncommon', stats: { defense: 3, block: 0.22 }, element: 'water', elementPower: 2, noise: { onMove: 5 }, goldValue: 85 },
'stone_bulwark': { id: 'stone_bulwark', name: 'Stone Bulwark', slot: 'OFF', armorType: 'stone', rarity: 'uncommon', stats: { defense: 5, block: 0.25 }, element: 'earth', elementPower: 2, special: { speedPenalty: -0.05 }, noise: { onMove: 10 }, goldValue: 95 },
'templar_shield': { id: 'templar_shield', name: 'Templar Shield', slot: 'OFF', armorType: 'armored', rarity: 'rare', stats: { defense: 5, block: 0.25 }, element: 'holy', elementPower: 3, noise: { onMove: 10 }, goldValue: 165 },
'volcanic_aegis': { id: 'volcanic_aegis', name: 'Volcanic Aegis', slot: 'OFF', armorType: 'scaled', rarity: 'rare', stats: { defense: 4, block: 0.22 }, element: 'fire', elementPower: 3, noise: { onMove: 5 }, goldValue: 160 },
'glacial_ward': { id: 'glacial_ward', name: 'Glacial Ward', slot: 'OFF', armorType: 'scaled', rarity: 'rare', stats: { defense: 5, block: 0.24 }, element: 'ice', elementPower: 3, noise: { onMove: 5 }, goldValue: 165 },
'tidal_barrier': { id: 'tidal_barrier', name: 'Tidal Barrier', slot: 'OFF', armorType: 'scaled', rarity: 'rare', stats: { defense: 4, block: 0.23 }, element: 'water', elementPower: 3, noise: { onMove: 5 }, goldValue: 155 },
'crystal_barrier': { id: 'crystal_barrier', name: 'Crystal Barrier', slot: 'OFF', armorType: 'stone', rarity: 'rare', stats: { defense: 5, block: 0.28 }, element: 'earth', elementPower: 3, noise: { onMove: 10 }, goldValue: 175 },
'spell_ward': { id: 'spell_ward', name: 'Spell Ward', slot: 'OFF', armorType: 'ethereal', rarity: 'rare', stats: { defense: 3, block: 0.20 }, element: 'arcane', elementPower: 3, noise: { onMove: 0 }, goldValue: 160 },
'shadow_buckler': { id: 'shadow_buckler', name: 'Shadow Buckler', slot: 'OFF', armorType: 'hide', rarity: 'rare', stats: { defense: 3, block: 0.18 }, element: 'dark', elementPower: 3, special: { noiseReduction: 0.20 }, noise: { onMove: 0 }, goldValue: 155 },
'fortress_shield': { id: 'fortress_shield', name: 'Fortress Shield', slot: 'OFF', armorType: 'armored', rarity: 'epic', stats: { defense: 8, block: 0.40 }, element: null, elementPower: 0, special: { speedPenalty: -0.20 }, noise: { onMove: 20 }, goldValue: 350 },
'infernal_bulwark': { id: 'infernal_bulwark', name: 'Infernal Bulwark', slot: 'OFF', armorType: 'scaled', rarity: 'epic', stats: { defense: 6, block: 0.30 }, element: 'fire', elementPower: 5, noise: { onMove: 10 }, goldValue: 340 },
'sanctified_aegis': { id: 'sanctified_aegis', name: 'Sanctified Aegis', slot: 'OFF', armorType: 'armored', rarity: 'epic', stats: { defense: 7, block: 0.32 }, element: 'holy', elementPower: 5, noise: { onMove: 10 }, goldValue: 360 },
'abyssal_shield': { id: 'abyssal_shield', name: 'Abyssal Shield', slot: 'OFF', armorType: 'ethereal', rarity: 'epic', stats: { defense: 5, block: 0.28 }, element: 'dark', elementPower: 5, special: { noiseReduction: 0.25 }, noise: { onMove: 0 }, goldValue: 345 },
'worldstone_shield': { id: 'worldstone_shield', name: 'Worldstone Shield', slot: 'OFF', armorType: 'stone', rarity: 'epic', stats: { defense: 8, block: 0.35 }, element: 'earth', elementPower: 5, special: { speedPenalty: -0.15 }, noise: { onMove: 15 }, goldValue: 380 },
'voidwall': { id: 'voidwall', name: 'Voidwall', slot: 'OFF', armorType: 'ethereal', rarity: 'epic', stats: { defense: 4, block: 0.25 }, element: 'dark', elementPower: 5, noise: { onMove: 0 }, goldValue: 330 },

// === HEAD (18) ===
'cloth_hood': { id: 'cloth_hood', name: 'Cloth Hood', slot: 'HEAD', armorType: 'unarmored', rarity: 'common', stats: { defense: 1 }, element: null, elementPower: 0, noise: { onMove: 0 }, goldValue: 10 },
'leather_cap': { id: 'leather_cap', name: 'Leather Cap', slot: 'HEAD', armorType: 'hide', rarity: 'common', stats: { defense: 2 }, element: null, elementPower: 0, noise: { onMove: 0 }, goldValue: 25 },
'iron_helm': { id: 'iron_helm', name: 'Iron Helm', slot: 'HEAD', armorType: 'armored', rarity: 'uncommon', stats: { defense: 4 }, element: null, elementPower: 0, noise: { onMove: 5 }, goldValue: 70 },
'steel_helm': { id: 'steel_helm', name: 'Steel Helm', slot: 'HEAD', armorType: 'armored', rarity: 'uncommon', stats: { defense: 5 }, element: null, elementPower: 0, special: { staggerResist: 0.10 }, noise: { onMove: 5 }, goldValue: 85 },
'bone_helm': { id: 'bone_helm', name: 'Bone Helm', slot: 'HEAD', armorType: 'bone', rarity: 'uncommon', stats: { defense: 3 }, element: 'death', elementPower: 2, noise: { onMove: 0 }, goldValue: 75 },
'ember_cowl': { id: 'ember_cowl', name: 'Ember Cowl', slot: 'HEAD', armorType: 'hide', rarity: 'uncommon', stats: { defense: 3 }, element: 'fire', elementPower: 2, noise: { onMove: 0 }, goldValue: 80 },
'frost_hood': { id: 'frost_hood', name: 'Frost Hood', slot: 'HEAD', armorType: 'hide', rarity: 'uncommon', stats: { defense: 3 }, element: 'ice', elementPower: 2, noise: { onMove: 0 }, goldValue: 80 },
'coral_helm': { id: 'coral_helm', name: 'Coral Helm', slot: 'HEAD', armorType: 'scaled', rarity: 'uncommon', stats: { defense: 3 }, element: 'water', elementPower: 2, noise: { onMove: 0 }, goldValue: 80 },
'stone_cap': { id: 'stone_cap', name: 'Stone Cap', slot: 'HEAD', armorType: 'stone', rarity: 'uncommon', stats: { defense: 4 }, element: 'earth', elementPower: 2, noise: { onMove: 5 }, goldValue: 85 },
'shadow_mask': { id: 'shadow_mask', name: 'Shadow Mask', slot: 'HEAD', armorType: 'hide', rarity: 'uncommon', stats: { defense: 2 }, element: 'dark', elementPower: 2, special: { noiseReduction: 0.20 }, noise: { onMove: 0 }, goldValue: 85 },
'blessed_coif': { id: 'blessed_coif', name: 'Blessed Coif', slot: 'HEAD', armorType: 'hide', rarity: 'rare', stats: { defense: 4 }, element: 'holy', elementPower: 3, noise: { onMove: 0 }, goldValue: 150 },
'volcanic_helm': { id: 'volcanic_helm', name: 'Volcanic Helm', slot: 'HEAD', armorType: 'scaled', rarity: 'rare', stats: { defense: 5 }, element: 'fire', elementPower: 3, noise: { onMove: 5 }, goldValue: 160 },
'glacial_crown': { id: 'glacial_crown', name: 'Glacial Crown', slot: 'HEAD', armorType: 'scaled', rarity: 'rare', stats: { defense: 5 }, element: 'ice', elementPower: 3, noise: { onMove: 5 }, goldValue: 160 },
'earthen_helm': { id: 'earthen_helm', name: 'Earthen Helm', slot: 'HEAD', armorType: 'stone', rarity: 'rare', stats: { defense: 6 }, element: 'earth', elementPower: 3, noise: { onMove: 10 }, goldValue: 170 },
'heavy_greathelm': { id: 'heavy_greathelm', name: 'Heavy Greathelm', slot: 'HEAD', armorType: 'armored', rarity: 'epic', stats: { defense: 8 }, element: null, elementPower: 0, special: { staggerResist: 0.25, visionPenalty: -1 }, noise: { onMove: 15 }, goldValue: 320 },
'infernal_visage': { id: 'infernal_visage', name: 'Infernal Visage', slot: 'HEAD', armorType: 'scaled', rarity: 'epic', stats: { defense: 6 }, element: 'fire', elementPower: 5, noise: { onMove: 5 }, goldValue: 340 },
'voidgaze_helm': { id: 'voidgaze_helm', name: 'Voidgaze Helm', slot: 'HEAD', armorType: 'ethereal', rarity: 'epic', stats: { defense: 5 }, element: 'dark', elementPower: 5, special: { darkVision: 3 }, noise: { onMove: 0 }, goldValue: 345 },
'worldstone_crown': { id: 'worldstone_crown', name: 'Worldstone Crown', slot: 'HEAD', armorType: 'stone', rarity: 'epic', stats: { defense: 7 }, element: 'earth', elementPower: 5, noise: { onMove: 10 }, goldValue: 360 },

// === CHEST (18) ===
'tattered_shirt': { id: 'tattered_shirt', name: 'Tattered Shirt', slot: 'CHEST', armorType: 'unarmored', rarity: 'common', stats: { defense: 2 }, element: null, elementPower: 0, noise: { onMove: 0 }, goldValue: 10 },
'leather_vest': { id: 'leather_vest', name: 'Leather Vest', slot: 'CHEST', armorType: 'hide', rarity: 'common', stats: { defense: 4 }, element: null, elementPower: 0, noise: { onMove: 0 }, goldValue: 30 },
'chainmail': { id: 'chainmail', name: 'Chainmail', slot: 'CHEST', armorType: 'armored', rarity: 'uncommon', stats: { defense: 7 }, element: null, elementPower: 0, special: { noiseIncrease: 0.15 }, noise: { onMove: 10 }, goldValue: 90 },
'brigandine': { id: 'brigandine', name: 'Brigandine', slot: 'CHEST', armorType: 'armored', rarity: 'uncommon', stats: { defense: 6 }, element: null, elementPower: 0, noise: { onMove: 5 }, goldValue: 85 },
'bone_harness': { id: 'bone_harness', name: 'Bone Harness', slot: 'CHEST', armorType: 'bone', rarity: 'uncommon', stats: { defense: 5 }, element: 'death', elementPower: 2, noise: { onMove: 0 }, goldValue: 80 },
'ember_mail': { id: 'ember_mail', name: 'Ember Mail', slot: 'CHEST', armorType: 'scaled', rarity: 'uncommon', stats: { defense: 5 }, element: 'fire', elementPower: 2, noise: { onMove: 5 }, goldValue: 85 },
'frost_jacket': { id: 'frost_jacket', name: 'Frost Jacket', slot: 'CHEST', armorType: 'hide', rarity: 'uncommon', stats: { defense: 5 }, element: 'ice', elementPower: 2, noise: { onMove: 0 }, goldValue: 85 },
'coral_cuirass': { id: 'coral_cuirass', name: 'Coral Cuirass', slot: 'CHEST', armorType: 'scaled', rarity: 'uncommon', stats: { defense: 5 }, element: 'water', elementPower: 2, noise: { onMove: 5 }, goldValue: 85 },
'stone_plate': { id: 'stone_plate', name: 'Stone Plate', slot: 'CHEST', armorType: 'stone', rarity: 'uncommon', stats: { defense: 7 }, element: 'earth', elementPower: 2, special: { speedPenalty: -0.10 }, noise: { onMove: 10 }, goldValue: 95 },
'shadow_vest': { id: 'shadow_vest', name: 'Shadow Vest', slot: 'CHEST', armorType: 'hide', rarity: 'uncommon', stats: { defense: 4 }, element: 'dark', elementPower: 2, special: { noiseReduction: 0.25 }, noise: { onMove: 0 }, goldValue: 90 },
'blessed_vestments': { id: 'blessed_vestments', name: 'Blessed Vestments', slot: 'CHEST', armorType: 'hide', rarity: 'rare', stats: { defense: 6 }, element: 'holy', elementPower: 3, noise: { onMove: 0 }, goldValue: 160 },
'volcanic_plate': { id: 'volcanic_plate', name: 'Volcanic Plate', slot: 'CHEST', armorType: 'scaled', rarity: 'rare', stats: { defense: 8 }, element: 'fire', elementPower: 3, noise: { onMove: 10 }, goldValue: 175 },
'glacial_mail': { id: 'glacial_mail', name: 'Glacial Mail', slot: 'CHEST', armorType: 'scaled', rarity: 'rare', stats: { defense: 7 }, element: 'ice', elementPower: 3, noise: { onMove: 5 }, goldValue: 170 },
'earthen_plate': { id: 'earthen_plate', name: 'Earthen Plate', slot: 'CHEST', armorType: 'stone', rarity: 'rare', stats: { defense: 9 }, element: 'earth', elementPower: 3, special: { speedPenalty: -0.15 }, noise: { onMove: 15 }, goldValue: 180 },
'fortress_plate': { id: 'fortress_plate', name: 'Fortress Plate', slot: 'CHEST', armorType: 'armored', rarity: 'epic', stats: { defense: 12 }, element: null, elementPower: 0, special: { speedPenalty: -0.20 }, noise: { onMove: 20 }, goldValue: 380 },
'infernal_cuirass': { id: 'infernal_cuirass', name: 'Infernal Cuirass', slot: 'CHEST', armorType: 'scaled', rarity: 'epic', stats: { defense: 10 }, element: 'fire', elementPower: 5, noise: { onMove: 10 }, goldValue: 360 },
'voidweave_robe': { id: 'voidweave_robe', name: 'Voidweave Robe', slot: 'CHEST', armorType: 'ethereal', rarity: 'epic', stats: { defense: 7 }, element: 'dark', elementPower: 5, special: { noiseReduction: 0.35 }, noise: { onMove: 0 }, goldValue: 355 },
'worldstone_plate': { id: 'worldstone_plate', name: 'Worldstone Plate', slot: 'CHEST', armorType: 'stone', rarity: 'epic', stats: { defense: 11 }, element: 'earth', elementPower: 5, special: { speedPenalty: -0.15 }, noise: { onMove: 15 }, goldValue: 375 }

};

window.DEFENSE_ARMOR = DEFENSE_ARMOR;
console.log('[DefenseArmor] Loaded', Object.keys(DEFENSE_ARMOR).length, 'items');