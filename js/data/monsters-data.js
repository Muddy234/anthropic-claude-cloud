// ============================================================================
// MONSTER DATA - The Shifting Chasm
// ============================================================================

const MONSTER_DATA = {
    // === VOLCANIC MONSTERS ===
    'Magma Slime': {
        hp: 60, str: 12, agi: 5, int: 8, pDef: 15, mDef: 8,
        xp: 25,
        element: 'fire', attack: 'Slam', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 2.5,  // Slow melee attacker
        elite: false, moveInterval: 3, aggression: 2, spawnWeight: 30,
        loot: [
            { name: 'Magma Core', dropChance: 0.03, rarity: 'rare', favorValue: 45 },
            { name: 'ite', dropChance: 0.25, rarity: 'common', favorValue: 3 },
            { name: 'Hardened Slime', dropChance: 0.25, rarity: 'common', favorValue: 3 }
        ],
        description: 'A slow, gelatinous blob of living lava.'
    },
    'Obsidian Golem': {
        hp: 105, str: 18, agi: 3, int: 4, pDef: 20, mDef: 5,
        xp: 45,
        element: 'physical', attack: 'Boulder Smash', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 3.0,  // Very slow but powerful melee
        elite: false, moveInterval: 3, aggression: 2, spawnWeight: 3,
        loot: [
            { name: 'Obsidian Shard', dropChance: 0.03, rarity: 'rare', favorValue: 45 },
            { name: 'Heavy Stone', dropChance: 0.25, rarity: 'common', favorValue: 3 },
            { name: 'Geode', dropChance: 0.25, rarity: 'common', favorValue: 3 }
        ],
        description: 'A towering construct of jagged black rock. Extremely durable but very slow.'
    },
    'Cinder Wisp': {
        hp: 30, str: 3, agi: 16, int: 18, pDef: 2, mDef: 15,
        xp: 35,
        element: 'fire', attack: 'Flare', attackType: 'magic', damageType: 'magic',
        attackRange: 4, attackSpeed: 1.5,  // Fast ranged caster
        elite: false, moveInterval: 1, aggression: 4, spawnWeight: 7,
        loot: [
            { name: 'Fire Mote', dropChance: 0.03, rarity: 'rare', favorValue: 45 },
            { name: 'Ember', dropChance: 0.25, rarity: 'common', favorValue: 3 },
            { name: 'Spirit Dust', dropChance: 0.25, rarity: 'common', favorValue: 3 }
        ],
        description: 'A floating ball of fire. Fast and deadly with magic, but dies in one hit.'
    },
    'Flame Bat': {
        hp: 40, str: 10, agi: 20, int: 2, pDef: 4, mDef: 4,
        xp: 30,
        element: 'fire', attack: 'Singe Bite', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 1.2,  // Very fast melee attacker
        elite: false, moveInterval: 1, aggression: 5, spawnWeight: 8,
        loot: [
            { name: 'Bat Wing', dropChance: 0.03, rarity: 'rare', favorValue: 45 },
            { name: 'Guano', dropChance: 0.25, rarity: 'common', favorValue: 3 },
            { name: 'Small Fang', dropChance: 0.25, rarity: 'common', favorValue: 3 }
        ],
        description: 'A frantic flying pest. Moves twice per second, making it hard to escape.'
    },
    'Ash Walker': {
        hp: 75, str: 14, agi: 6, int: 5, pDef: 8, mDef: 12,
        xp: 30,
        element: 'shadow', attack: 'Choke', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 2.2,  // Medium-slow melee
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 6,
        loot: [
            { name: 'Tattered Cloth', dropChance: 0.03, rarity: 'rare', favorValue: 45 },
            { name: 'Bone Fragment', dropChance: 0.25, rarity: 'common', favorValue: 3 },
            { name: 'Cursed Ring', dropChance: 0.25, rarity: 'uncommon', favorValue: 15 }
        ],
        description: 'A reanimated corpse covered in volcanic ash. Resistant to magic.'
    },
    'Salamander': {
        hp: 55, str: 12, agi: 12, int: 10, pDef: 10, mDef: 10,
        xp: 35,
        element: 'nature', attack: 'Tail Whip', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 1.8,  // Balanced melee
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 5,
        loot: [
            { name: 'Lizard Scale', dropChance: 0.03, rarity: 'rare', favorValue: 45 },
            { name: 'Reptile Eye', dropChance: 0.25, rarity: 'common', favorValue: 3 },
            { name: 'Raw Meat', dropChance: 0.25, rarity: 'common', favorValue: 3 }
        ],
        description: 'A four-legged reptile with glowing red scales. Balanced stats.'
    },
    'Pyro Cultist': {
        hp: 50, str: 6, agi: 10, int: 16, pDef: 5, mDef: 8,
        xp: 40,
        element: 'fire', attack: 'Ember Bolt', attackType: 'magic', damageType: 'magic',
        attackRange: 5, attackSpeed: 2.0,  // Long range caster
        elite: false, moveInterval: 2, aggression: 4, spawnWeight: 3,
        loot: [
            { name: 'Spell Scroll', dropChance: 0.03, rarity: 'rare', favorValue: 45 },
            { name: 'Cultist Hood', dropChance: 0.25, rarity: 'uncommon', favorValue: 15 },
            { name: 'Strange Amulet', dropChance: 0.25, rarity: 'uncommon', favorValue: 15 }
        ],
        description: 'A deranged mage worshipping the volcano. Casts ranged fire spells.'
    },

    // === CAVE MONSTERS ===
    'Cave Bat': {
        hp: 25, str: 6, agi: 18, int: 2, pDef: 2, mDef: 2,
        xp: 15,
        element: 'physical', attack: 'Bite', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 1.0,  // Very fast weak melee
        elite: false, moveInterval: 1, aggression: 4, spawnWeight: 12,
        loot: [
            { name: 'Bat Wing', dropChance: 0.05, rarity: 'uncommon', favorValue: 12 },
            { name: 'Guano', dropChance: 0.30, rarity: 'common', favorValue: 2 }
        ],
        description: 'A common cave pest. Weak but fast and annoying.'
    },
    'Stone Lurker': {
        hp: 80, str: 14, agi: 4, int: 3, pDef: 18, mDef: 5,
        xp: 35,
        element: 'earth', attack: 'Rock Slam', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 2.8,  // Slow heavy melee
        elite: false, moveInterval: 3, aggression: 2, spawnWeight: 5,
        loot: [
            { name: 'Stone Heart', dropChance: 0.03, rarity: 'rare', favorValue: 50 },
            { name: 'Granite Chunk', dropChance: 0.25, rarity: 'common', favorValue: 4 }
        ],
        description: 'A rock-like creature that ambushes prey. High defense, low speed.'
    },
    'Mushroom Sprite': {
        hp: 35, str: 5, agi: 8, int: 14, pDef: 4, mDef: 12,
        xp: 28,
        element: 'nature', attack: 'Spore Cloud', attackType: 'magic', damageType: 'magic',
        attackRange: 3, attackSpeed: 2.2,  // Medium range AOE caster
        elite: false, moveInterval: 2, aggression: 2, spawnWeight: 30,
        loot: [
            { name: 'Glowing Spore', dropChance: 0.04, rarity: 'rare', favorValue: 40 },
            { name: 'Mushroom Cap', dropChance: 0.30, rarity: 'common', favorValue: 3 }
        ],
        description: 'A sentient fungus that releases toxic spores.'
    },
    'Crystal Spider': {
        hp: 45, str: 11, agi: 14, int: 6, pDef: 8, mDef: 10,
        xp: 32,
        element: 'physical', attack: 'Venomous Bite', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 1.3,  // Fast melee with venom
        elite: false, moveInterval: 1, aggression: 4, spawnWeight: 5,
        loot: [
            { name: 'Crystal Fang', dropChance: 0.04, rarity: 'rare', favorValue: 42 },
            { name: 'Spider Silk', dropChance: 0.25, rarity: 'common', favorValue: 4 },
            { name: 'Venom Sac', dropChance: 0.20, rarity: 'uncommon', favorValue: 12 }
        ],
        description: 'A spider with crystalline legs. Fast and venomous.'
    },

    // === UNDEAD MONSTERS ===
    'Skeletal Warrior': {
        hp: 50, str: 13, agi: 8, int: 3, pDef: 10, mDef: 3,
        xp: 28,
        element: 'death', attack: 'Bone Slash', attackType: 'physical', damageType: 'blade',
        attackRange: 1, attackSpeed: 1.8,  // Standard melee fighter
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 8,
        loot: [
            { name: 'Ancient Bone', dropChance: 0.04, rarity: 'uncommon', favorValue: 18 },
            { name: 'Bone Fragment', dropChance: 0.30, rarity: 'common', favorValue: 2 },
            { name: 'Rusted Sword', dropChance: 0.15, rarity: 'common', favorValue: 5 }
        ],
        description: 'An undead warrior animated by dark magic.'
    },
    'Phantom': {
        hp: 40, str: 4, agi: 12, int: 16, pDef: 2, mDef: 18,
        xp: 38,
        element: 'death', attack: 'Soul Drain', attackType: 'magic', damageType: 'magic',
        attackRange: 3, attackSpeed: 2.0,  // Medium range life drainer
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 30,
        loot: [
            { name: 'Ectoplasm', dropChance: 0.05, rarity: 'rare', favorValue: 45 },
            { name: 'Spirit Dust', dropChance: 0.25, rarity: 'common', favorValue: 4 }
        ],
        description: 'A ghostly apparition that drains life force.'
    },
    'Bone Golem': {
        hp: 120, str: 20, agi: 3, int: 2, pDef: 16, mDef: 8,
        xp: 55,
        element: 'death', attack: 'Crushing Blow', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 3.2,  // Very slow devastating melee
        elite: false, moveInterval: 3, aggression: 2, spawnWeight: 2,
        loot: [
            { name: 'Bone Core', dropChance: 0.03, rarity: 'epic', favorValue: 110 },
            { name: 'Ancient Bone', dropChance: 0.25, rarity: 'uncommon', favorValue: 15 },
            { name: 'Bone Fragment', dropChance: 0.35, rarity: 'common', favorValue: 3 }
        ],
        description: 'A massive construct of fused bones. Slow but devastating.'
    },

    // === AQUATIC MONSTERS ===
    'Deep Crawler': {
        hp: 55, str: 12, agi: 10, int: 4, pDef: 12, mDef: 6,
        xp: 30,
        element: 'water', attack: 'Pincer Strike', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 1.6,  // Medium-fast melee
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 6,
        loot: [
            { name: 'Crustacean Shell', dropChance: 0.04, rarity: 'rare', favorValue: 38 },
            { name: 'Pincer', dropChance: 0.25, rarity: 'common', favorValue: 4 }
        ],
        description: 'A large crustacean adapted to dark caves.'
    },
    'Tide Serpent': {
        hp: 65, str: 14, agi: 14, int: 8, pDef: 8, mDef: 10,
        xp: 40,
        element: 'water', attack: 'Aqua Fang', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 1.4,  // Fast melee striker
        elite: false, moveInterval: 1, aggression: 4, spawnWeight: 4,
        loot: [
            { name: 'Serpent Scale', dropChance: 0.04, rarity: 'rare', favorValue: 42 },
            { name: 'Aqua Fang', dropChance: 0.20, rarity: 'uncommon', favorValue: 12 }
        ],
        description: 'A swift water snake with venomous fangs.'
    },

    // === SHADOW MONSTERS ===
    'Shadow Stalker': {
        hp: 45, str: 15, agi: 16, int: 8, pDef: 6, mDef: 10,
        xp: 42,
        element: 'shadow', attack: 'Shadow Strike', attackType: 'physical', damageType: 'blade',
        attackRange: 1, attackSpeed: 1.0,  // Extremely fast assassin
        elite: false, moveInterval: 1, aggression: 5, spawnWeight: 4,
        loot: [
            { name: 'Shadow Essence', dropChance: 0.04, rarity: 'rare', favorValue: 48 },
            { name: 'Dark Cloth', dropChance: 0.25, rarity: 'uncommon', favorValue: 12 }
        ],
        description: 'A predator that hunts from the darkness. Extremely fast.'
    },
    'Void Touched': {
        hp: 70, str: 10, agi: 8, int: 18, pDef: 8, mDef: 16,
        xp: 48,
        element: 'shadow', attack: 'Void Bolt', attackType: 'magic', damageType: 'magic',
        attackRange: 4, attackSpeed: 1.8,  // Ranged void caster
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 30,
        loot: [
            { name: 'Void Crystal', dropChance: 0.03, rarity: 'epic', favorValue: 120 },
            { name: 'Shadow Essence', dropChance: 0.20, rarity: 'uncommon', favorValue: 15 }
        ],
        description: 'A being corrupted by void energy. Powerful magic attacks.'
    }
};

// Helper function to get a random monster based on spawn weights
function getRandomMonster() {
    const totalWeight = Object.values(MONSTER_DATA).reduce((sum, m) => sum + m.spawnWeight, 0);
    let roll = Math.random() * totalWeight;

    for (const [name, data] of Object.entries(MONSTER_DATA)) {
        roll -= data.spawnWeight;
        if (roll <= 0) {
            return name;
        }
    }
    return Object.keys(MONSTER_DATA)[0];
}

// Helper function to roll for monster-specific loot (max 1 item)
function rollMonsterLoot(monsterName) {
    const monster = MONSTER_DATA[monsterName];
    if (!monster || !monster.loot) return null;

    const shuffledLoot = [...monster.loot].sort(() => Math.random() - 0.5);

    for (const lootItem of shuffledLoot) {
        if (Math.random() <= lootItem.dropChance) {
            return {
                name: lootItem.name,
                type: 'material',
                rarity: lootItem.rarity || 'common',
                favorValue: lootItem.favorValue || 3,
                count: 1
            };
        }
    }
    return null;
}

// Get monsters by element
function getMonstersByElement(element) {
    return Object.entries(MONSTER_DATA)
        .filter(([name, data]) => data.element === element)
        .map(([name]) => name);
}

// Get monsters by attack type
function getMonstersByAttackType(attackType) {
    return Object.entries(MONSTER_DATA)
        .filter(([name, data]) => data.attackType === attackType)
        .map(([name]) => name);
}

// Export
window.MONSTER_DATA = MONSTER_DATA;
window.getRandomMonster = getRandomMonster;
window.rollMonsterLoot = rollMonsterLoot;
window.getMonstersByElement = getMonstersByElement;
window.getMonstersByAttackType = getMonstersByAttackType;

console.log('[Monsters] Loaded', Object.keys(MONSTER_DATA).length, 'monsters');
