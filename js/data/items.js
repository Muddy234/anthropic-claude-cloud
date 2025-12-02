// ============================================================================
// ITEMS DATA - Consumables, Materials, Quest Items
// ============================================================================

// ============================================================================
// CONSUMABLES - Usable items with immediate effects
// ============================================================================

const CONSUMABLES = {
    // === HEALING ===
    'health_potion_small': {
        id: 'health_potion_small', name: 'Small Health Potion', type: 'consumable', subtype: 'healing',
        rarity: 'common', stackable: true, maxStack: 10,
        effect: { type: 'heal', value: 30 },
        description: 'Restores 30 HP.',
        goldValue: 25
    },
    'health_potion': {
        id: 'health_potion', name: 'Health Potion', type: 'consumable', subtype: 'healing',
        rarity: 'uncommon', stackable: true, maxStack: 10,
        effect: { type: 'heal', value: 60 },
        description: 'Restores 60 HP.',
        goldValue: 50
    },
    'health_potion_large': {
        id: 'health_potion_large', name: 'Large Health Potion', type: 'consumable', subtype: 'healing',
        rarity: 'rare', stackable: true, maxStack: 10,
        effect: { type: 'heal', value: 120 },
        description: 'Restores 120 HP.',
        goldValue: 100
    },
    'health_elixir': {
        id: 'health_elixir', name: 'Health Elixir', type: 'consumable', subtype: 'healing',
        rarity: 'epic', stackable: true, maxStack: 5,
        effect: { type: 'healPercent', value: 0.5 },
        description: 'Restores 50% of max HP.',
        goldValue: 200
    },

    // === MANA/ENERGY ===
    'mana_potion_small': {
        id: 'mana_potion_small', name: 'Small Mana Potion', type: 'consumable', subtype: 'mana',
        rarity: 'common', stackable: true, maxStack: 10,
        effect: { type: 'restoreMana', value: 20 },
        description: 'Restores 20 MP.',
        goldValue: 20
    },
    'mana_potion': {
        id: 'mana_potion', name: 'Mana Potion', type: 'consumable', subtype: 'mana',
        rarity: 'uncommon', stackable: true, maxStack: 10,
        effect: { type: 'restoreMana', value: 40 },
        description: 'Restores 40 MP.',
        goldValue: 45
    },
    'mana_potion_large': {
        id: 'mana_potion_large', name: 'Large Mana Potion', type: 'consumable', subtype: 'mana',
        rarity: 'rare', stackable: true, maxStack: 10,
        effect: { type: 'restoreMana', value: 80 },
        description: 'Restores 80 MP.',
        goldValue: 90
    },

    // === BUFF POTIONS ===
    'strength_potion': {
        id: 'strength_potion', name: 'Strength Potion', type: 'consumable', subtype: 'buff',
        rarity: 'uncommon', stackable: true, maxStack: 5,
        effect: { type: 'buff', stat: 'str', value: 5, duration: 60 },
        description: '+5 STR for 60 seconds.',
        goldValue: 75
    },
    'agility_potion': {
        id: 'agility_potion', name: 'Agility Potion', type: 'consumable', subtype: 'buff',
        rarity: 'uncommon', stackable: true, maxStack: 5,
        effect: { type: 'buff', stat: 'agi', value: 5, duration: 60 },
        description: '+5 AGI for 60 seconds.',
        goldValue: 75
    },
    'intelligence_potion': {
        id: 'intelligence_potion', name: 'Intelligence Potion', type: 'consumable', subtype: 'buff',
        rarity: 'uncommon', stackable: true, maxStack: 5,
        effect: { type: 'buff', stat: 'int', value: 5, duration: 60 },
        description: '+5 INT for 60 seconds.',
        goldValue: 75
    },
    'iron_skin_potion': {
        id: 'iron_skin_potion', name: 'Iron Skin Potion', type: 'consumable', subtype: 'buff',
        rarity: 'rare', stackable: true, maxStack: 5,
        effect: { type: 'buff', stat: 'pDef', value: 10, duration: 60 },
        description: '+10 Physical Defense for 60 seconds.',
        goldValue: 100
    },
    'arcane_ward_potion': {
        id: 'arcane_ward_potion', name: 'Arcane Ward Potion', type: 'consumable', subtype: 'buff',
        rarity: 'rare', stackable: true, maxStack: 5,
        effect: { type: 'buff', stat: 'mDef', value: 10, duration: 60 },
        description: '+10 Magic Defense for 60 seconds.',
        goldValue: 100
    },
    'haste_potion': {
        id: 'haste_potion', name: 'Haste Potion', type: 'consumable', subtype: 'buff',
        rarity: 'rare', stackable: true, maxStack: 5,
        effect: { type: 'buff', stat: 'speed', value: 0.25, duration: 30 },
        description: '+25% movement speed for 30 seconds.',
        goldValue: 120
    },
    'invisibility_potion': {
        id: 'invisibility_potion', name: 'Invisibility Potion', type: 'consumable', subtype: 'buff',
        rarity: 'epic', stackable: true, maxStack: 3,
        effect: { type: 'stealth', duration: 15 },
        description: 'Become invisible for 15 seconds. Attacking breaks stealth.',
        goldValue: 250
    },

    // === UTILITY ===
    'antidote': {
        id: 'antidote', name: 'Antidote', type: 'consumable', subtype: 'utility',
        rarity: 'common', stackable: true, maxStack: 10,
        effect: { type: 'cure', status: 'poison' },
        description: 'Cures poison.',
        goldValue: 30
    },
    'warming_salve': {
        id: 'warming_salve', name: 'Warming Salve', type: 'consumable', subtype: 'utility',
        rarity: 'common', stackable: true, maxStack: 10,
        effect: { type: 'cure', status: 'frozen' },
        description: 'Cures frozen status.',
        goldValue: 30
    },
    'scroll_of_recall': {
        id: 'scroll_of_recall', name: 'Scroll of Recall', type: 'consumable', subtype: 'utility',
        rarity: 'uncommon', stackable: true, maxStack: 5,
        effect: { type: 'teleport', target: 'entrance' },
        description: 'Teleport to the dungeon entrance.',
        goldValue: 100
    },
    'scroll_of_mapping': {
        id: 'scroll_of_mapping', name: 'Scroll of Mapping', type: 'consumable', subtype: 'utility',
        rarity: 'uncommon', stackable: true, maxStack: 5,
        effect: { type: 'revealMap', radius: 20 },
        description: 'Reveals nearby areas on the map.',
        goldValue: 80
    },
    'smoke_bomb': {
        id: 'smoke_bomb', name: 'Smoke Bomb', type: 'consumable', subtype: 'utility',
        rarity: 'uncommon', stackable: true, maxStack: 5,
        effect: { type: 'escape', breakAggro: true },
        description: 'Creates a smoke cloud, allowing escape from combat.',
        goldValue: 60
    },

    // === FOOD ===
    'bread': {
        id: 'bread', name: 'Bread', type: 'consumable', subtype: 'food',
        rarity: 'common', stackable: true, maxStack: 20,
        effect: { type: 'heal', value: 10 },
        description: 'Restores 10 HP. Simple but filling.',
        goldValue: 5
    },
    'cooked_meat': {
        id: 'cooked_meat', name: 'Cooked Meat', type: 'consumable', subtype: 'food',
        rarity: 'common', stackable: true, maxStack: 20,
        effect: { type: 'heal', value: 20 },
        description: 'Restores 20 HP.',
        goldValue: 15
    },
    'mushroom_stew': {
        id: 'mushroom_stew', name: 'Mushroom Stew', type: 'consumable', subtype: 'food',
        rarity: 'uncommon', stackable: true, maxStack: 10,
        effect: { type: 'healOverTime', value: 5, duration: 10 },
        description: 'Restores 5 HP per second for 10 seconds.',
        goldValue: 35
    }
};

// ============================================================================
// AMMO - Arrows and Bolts for ranged weapons
// ============================================================================

const AMMO = {
    // === ARROWS (for bows) ===
    'arrows': {
        id: 'arrows', name: 'Arrows', type: 'ammo', subtype: 'arrow',
        rarity: 'common', stackable: true, maxStack: 99,
        description: 'Standard metal-tipped arrows for bows.',
        goldValue: 1
    },
    'fire_arrows': {
        id: 'fire_arrows', name: 'Fire Arrows', type: 'ammo', subtype: 'arrow',
        rarity: 'uncommon', stackable: true, maxStack: 99,
        element: 'fire', elementPower: 2,
        description: 'Arrows tipped with flaming oil.',
        goldValue: 5
    },
    'ice_arrows': {
        id: 'ice_arrows', name: 'Ice Arrows', type: 'ammo', subtype: 'arrow',
        rarity: 'uncommon', stackable: true, maxStack: 99,
        element: 'ice', elementPower: 2,
        description: 'Arrows infused with freezing magic.',
        goldValue: 5
    },
    'poison_arrows': {
        id: 'poison_arrows', name: 'Poison Arrows', type: 'ammo', subtype: 'arrow',
        rarity: 'uncommon', stackable: true, maxStack: 99,
        element: 'nature', elementPower: 2,
        special: { poisonChance: 0.30 },
        description: 'Arrows coated with deadly poison.',
        goldValue: 5
    },

    // === BOLTS (for crossbows) ===
    'bolts': {
        id: 'bolts', name: 'Bolts', type: 'ammo', subtype: 'bolt',
        rarity: 'common', stackable: true, maxStack: 99,
        description: 'Standard metal bolts for crossbows.',
        goldValue: 2
    },
    'fire_bolts': {
        id: 'fire_bolts', name: 'Fire Bolts', type: 'ammo', subtype: 'bolt',
        rarity: 'uncommon', stackable: true, maxStack: 99,
        element: 'fire', elementPower: 2,
        description: 'Bolts tipped with flaming oil.',
        goldValue: 6
    },
    'ice_bolts': {
        id: 'ice_bolts', name: 'Ice Bolts', type: 'ammo', subtype: 'bolt',
        rarity: 'uncommon', stackable: true, maxStack: 99,
        element: 'ice', elementPower: 2,
        description: 'Bolts infused with freezing magic.',
        goldValue: 6
    },
    'poison_bolts': {
        id: 'poison_bolts', name: 'Poison Bolts', type: 'ammo', subtype: 'bolt',
        rarity: 'uncommon', stackable: true, maxStack: 99,
        element: 'nature', elementPower: 2,
        special: { poisonChance: 0.30 },
        description: 'Bolts coated with deadly poison.',
        goldValue: 6
    }
};

// ============================================================================
// MATERIALS - Crafting and selling items
// ============================================================================

const MATERIALS = {
    // === MONSTER DROPS ===
    'magma_core': { id: 'magma_core', name: 'Magma Core', type: 'material', subtype: 'monster', rarity: 'rare', stackable: true, maxStack: 99, goldValue: 100, description: 'A burning core from a Magma Slime.' },
    'ashes': { id: 'ashes', name: 'Ashes', type: 'material', subtype: 'monster', rarity: 'common', stackable: true, maxStack: 99, goldValue: 2, description: 'Common volcanic ash.' },
    'hardened_slime': { id: 'hardened_slime', name: 'Hardened Slime', type: 'material', subtype: 'monster', rarity: 'common', stackable: true, maxStack: 99, goldValue: 2, description: 'Solidified slime residue.' },
    'obsidian_shard': { id: 'obsidian_shard', name: 'Obsidian Shard', type: 'material', subtype: 'monster', rarity: 'rare', stackable: true, maxStack: 99, goldValue: 100, description: 'A sharp piece of volcanic glass.' },
    'heavy_stone': { id: 'heavy_stone', name: 'Heavy Stone', type: 'material', subtype: 'monster', rarity: 'common', stackable: true, maxStack: 99, goldValue: 2, description: 'A dense rock fragment.' },
    'geode': { id: 'geode', name: 'Geode', type: 'material', subtype: 'monster', rarity: 'common', stackable: true, maxStack: 99, goldValue: 2, description: 'A crystal-lined rock.' },
    'fire_mote': { id: 'fire_mote', name: 'Fire Mote', type: 'material', subtype: 'elemental', rarity: 'rare', stackable: true, maxStack: 99, goldValue: 100, description: 'Pure fire essence.' },
    'ember': { id: 'ember', name: 'Ember', type: 'material', subtype: 'monster', rarity: 'common', stackable: true, maxStack: 99, goldValue: 2, description: 'A glowing coal.' },
    'spirit_dust': { id: 'spirit_dust', name: 'Spirit Dust', type: 'material', subtype: 'monster', rarity: 'common', stackable: true, maxStack: 99, goldValue: 2, description: 'Ethereal particles.' },
    'bat_wing': { id: 'bat_wing', name: 'Bat Wing', type: 'material', subtype: 'monster', rarity: 'uncommon', stackable: true, maxStack: 99, goldValue: 50, description: 'A leathery wing membrane.' },
    'guano': { id: 'guano', name: 'Guano', type: 'material', subtype: 'monster', rarity: 'common', stackable: true, maxStack: 99, goldValue: 1, description: 'Bat droppings. Useful as fertilizer.' },
    'small_fang': { id: 'small_fang', name: 'Small Fang', type: 'material', subtype: 'monster', rarity: 'common', stackable: true, maxStack: 99, goldValue: 2, description: 'A tiny sharp tooth.' },
    'tattered_cloth': { id: 'tattered_cloth', name: 'Tattered Cloth', type: 'material', subtype: 'monster', rarity: 'uncommon', stackable: true, maxStack: 99, goldValue: 50, description: 'Worn fabric from the undead.' },
    'bone_fragment': { id: 'bone_fragment', name: 'Bone Fragment', type: 'material', subtype: 'monster', rarity: 'common', stackable: true, maxStack: 99, goldValue: 2, description: 'A piece of old bone.' },
    'cursed_ring': { id: 'cursed_ring', name: 'Cursed Ring', type: 'material', subtype: 'monster', rarity: 'common', stackable: true, maxStack: 99, goldValue: 5, description: 'A ring with dark energy.' },
    'lizard_scale': { id: 'lizard_scale', name: 'Lizard Scale', type: 'material', subtype: 'monster', rarity: 'uncommon', stackable: true, maxStack: 99, goldValue: 50, description: 'A heat-resistant scale.' },
    'reptile_eye': { id: 'reptile_eye', name: 'Reptile Eye', type: 'material', subtype: 'monster', rarity: 'common', stackable: true, maxStack: 99, goldValue: 2, description: 'A preserved eye.' },
    'raw_meat': { id: 'raw_meat', name: 'Raw Meat', type: 'material', subtype: 'monster', rarity: 'common', stackable: true, maxStack: 99, goldValue: 2, description: 'Uncooked meat. Can be cooked.' },
    'spell_scroll': { id: 'spell_scroll', name: 'Spell Scroll', type: 'material', subtype: 'monster', rarity: 'rare', stackable: true, maxStack: 99, goldValue: 100, description: 'A scroll with magical writing.' },
    'cultist_hood': { id: 'cultist_hood', name: 'Cultist Hood', type: 'material', subtype: 'monster', rarity: 'common', stackable: true, maxStack: 99, goldValue: 3, description: 'A sinister hood.' },
    'strange_amulet': { id: 'strange_amulet', name: 'Strange Amulet', type: 'material', subtype: 'monster', rarity: 'common', stackable: true, maxStack: 99, goldValue: 5, description: 'An amulet with unknown symbols.' },

    // === ELEMENTAL ESSENCES ===
    'ice_mote': { id: 'ice_mote', name: 'Ice Mote', type: 'material', subtype: 'elemental', rarity: 'rare', stackable: true, maxStack: 99, goldValue: 100, description: 'Pure ice essence.' },
    'water_mote': { id: 'water_mote', name: 'Water Mote', type: 'material', subtype: 'elemental', rarity: 'rare', stackable: true, maxStack: 99, goldValue: 100, description: 'Pure water essence.' },
    'earth_mote': { id: 'earth_mote', name: 'Earth Mote', type: 'material', subtype: 'elemental', rarity: 'rare', stackable: true, maxStack: 99, goldValue: 100, description: 'Pure earth essence.' },
    'nature_mote': { id: 'nature_mote', name: 'Nature Mote', type: 'material', subtype: 'elemental', rarity: 'rare', stackable: true, maxStack: 99, goldValue: 100, description: 'Pure nature essence.' },
    'shadow_mote': { id: 'shadow_mote', name: 'Shadow Mote', type: 'material', subtype: 'elemental', rarity: 'rare', stackable: true, maxStack: 99, goldValue: 100, description: 'Pure shadow essence.' },
    'holy_mote': { id: 'holy_mote', name: 'Holy Mote', type: 'material', subtype: 'elemental', rarity: 'rare', stackable: true, maxStack: 99, goldValue: 100, description: 'Pure holy essence.' },
    'death_mote': { id: 'death_mote', name: 'Death Mote', type: 'material', subtype: 'elemental', rarity: 'rare', stackable: true, maxStack: 99, goldValue: 100, description: 'Pure death essence.' },
    'arcane_mote': { id: 'arcane_mote', name: 'Arcane Mote', type: 'material', subtype: 'elemental', rarity: 'rare', stackable: true, maxStack: 99, goldValue: 100, description: 'Pure arcane essence.' },

    // === CRAFTING MATERIALS ===
    'iron_ore': { id: 'iron_ore', name: 'Iron Ore', type: 'material', subtype: 'ore', rarity: 'common', stackable: true, maxStack: 99, goldValue: 10, description: 'Raw iron ore.' },
    'steel_ingot': { id: 'steel_ingot', name: 'Steel Ingot', type: 'material', subtype: 'ore', rarity: 'uncommon', stackable: true, maxStack: 99, goldValue: 30, description: 'Refined steel.' },
    'leather_scrap': { id: 'leather_scrap', name: 'Leather Scrap', type: 'material', subtype: 'crafting', rarity: 'common', stackable: true, maxStack: 99, goldValue: 5, description: 'Scraps of leather.' },
    'cloth_scrap': { id: 'cloth_scrap', name: 'Cloth Scrap', type: 'material', subtype: 'crafting', rarity: 'common', stackable: true, maxStack: 99, goldValue: 3, description: 'Scraps of cloth.' }
};

// ============================================================================
// QUEST ITEMS - Special non-consumable items
// ============================================================================

const QUEST_ITEMS = {
    'ancient_key': { id: 'ancient_key', name: 'Ancient Key', type: 'quest', rarity: 'rare', stackable: false, description: 'An ornate key of unknown origin.' },
    'mysterious_orb': { id: 'mysterious_orb', name: 'Mysterious Orb', type: 'quest', rarity: 'epic', stackable: false, description: 'A glowing orb pulsing with energy.' },
    'forgotten_tome': { id: 'forgotten_tome', name: 'Forgotten Tome', type: 'quest', rarity: 'rare', stackable: false, description: 'An ancient book written in a dead language.' },
    'cultist_orders': { id: 'cultist_orders', name: 'Cultist Orders', type: 'quest', rarity: 'uncommon', stackable: false, description: 'Documents detailing cultist activities.' }
};

// ============================================================================
// COMBINED ITEMS DATA
// ============================================================================

const ITEMS_DATA = {
    ...CONSUMABLES,
    ...AMMO,
    ...MATERIALS,
    ...QUEST_ITEMS
};

// ============================================================================
// ITEM EFFECTS SYSTEM
// ============================================================================

const itemEffects = {
    // Healing
    'heal': (player, value) => {
        const healed = Math.min(value, player.maxHp - player.hp);
        player.hp += healed;
        return `Restored ${healed} HP`;
    },
    'healPercent': (player, value) => {
        const healAmount = Math.floor(player.maxHp * value);
        const healed = Math.min(healAmount, player.maxHp - player.hp);
        player.hp += healed;
        return `Restored ${healed} HP (${Math.floor(value * 100)}%)`;
    },
    'healOverTime': (player, value, duration) => {
        // Apply HoT buff
        if (!player.buffs) player.buffs = [];
        player.buffs.push({
            type: 'healOverTime',
            value: value,
            duration: duration,
            remaining: duration
        });
        return `Healing ${value} HP/sec for ${duration}s`;
    },

    // Mana
    'restoreMana': (player, value) => {
        if (!player.maxMp) return 'No mana pool';
        const restored = Math.min(value, player.maxMp - player.mp);
        player.mp += restored;
        return `Restored ${restored} MP`;
    },

    // Buffs
    'buff': (player, stat, value, duration) => {
        if (!player.buffs) player.buffs = [];
        player.buffs.push({
            type: 'stat',
            stat: stat,
            value: value,
            duration: duration,
            remaining: duration
        });
        return `+${value} ${stat.toUpperCase()} for ${duration}s`;
    },

    // Utility
    'cure': (player, status) => {
        if (player.statusEffects && player.statusEffects[status]) {
            delete player.statusEffects[status];
            return `Cured ${status}`;
        }
        return `Not affected by ${status}`;
    },
    'stealth': (player, duration) => {
        player.isStealthed = true;
        player.stealthDuration = duration;
        return `Invisible for ${duration}s`;
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getItem(id) {
    return ITEMS_DATA[id] || null;
}

function getItemsByType(type) {
    return Object.values(ITEMS_DATA).filter(item => item.type === type);
}

function getItemsBySubtype(subtype) {
    return Object.values(ITEMS_DATA).filter(item => item.subtype === subtype);
}

function getItemsByRarity(rarity) {
    return Object.values(ITEMS_DATA).filter(item => item.rarity === rarity);
}

function useItem(player, itemId) {
    const item = ITEMS_DATA[itemId];
    if (!item || item.type !== 'consumable') {
        return { success: false, message: 'Cannot use this item' };
    }

    const effect = item.effect;
    let message = '';

    switch (effect.type) {
        case 'heal':
            message = itemEffects.heal(player, effect.value);
            break;
        case 'healPercent':
            message = itemEffects.healPercent(player, effect.value);
            break;
        case 'healOverTime':
            message = itemEffects.healOverTime(player, effect.value, effect.duration);
            break;
        case 'restoreMana':
            message = itemEffects.restoreMana(player, effect.value);
            break;
        case 'buff':
            message = itemEffects.buff(player, effect.stat, effect.value, effect.duration);
            break;
        case 'cure':
            message = itemEffects.cure(player, effect.status);
            break;
        case 'stealth':
            message = itemEffects.stealth(player, effect.duration);
            break;
        default:
            message = 'Unknown effect';
    }

    return { success: true, message: message };
}

// ============================================================================
// EXPORTS
// ============================================================================

window.CONSUMABLES = CONSUMABLES;
window.AMMO = AMMO;
window.MATERIALS = MATERIALS;
window.QUEST_ITEMS = QUEST_ITEMS;
window.ITEMS_DATA = ITEMS_DATA;
window.itemEffects = itemEffects;
window.getItem = getItem;
window.getItemsByType = getItemsByType;
window.getItemsBySubtype = getItemsBySubtype;
window.getItemsByRarity = getItemsByRarity;
window.useItem = useItem;

console.log('[Items] Loaded', Object.keys(ITEMS_DATA).length, 'items');