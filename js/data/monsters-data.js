// ============================================================================
// MONSTER DATA - The Shifting Chasm
// ============================================================================

const MONSTER_DATA = {
    // === VOLCANIC MONSTERS ===
    'Magma Slime': {
        hp: 30, str: 6, agi: 5, int: 8, pDef: 15, mDef: 8,  // FODDER: HP 60→30, STR 12→6
        xp: 15,
        element: 'fire', attack: 'Slam', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 2.5,  // Slow melee attacker
        armorType: 'unarmored',  // Gelatinous, weak to blades
        elite: false, moveInterval: 3, aggression: 2, spawnWeight: 30,
        loot: [
            { name: 'Magma Core', dropChance: 0.03, rarity: 'rare', favorValue: 45 },
            { name: 'Magma Residue', dropChance: 0.25, rarity: 'common', favorValue: 3 },
            { name: 'Hardened Slime', dropChance: 0.25, rarity: 'common', favorValue: 3 }
        ],
        description: 'A slow, gelatinous blob of living lava. Easy to kill but watch for groups.'
    },
    'Obsidian Golem': {
        hp: 105, str: 18, agi: 3, int: 4, pDef: 20, mDef: 5,
        xp: 45,
        element: 'physical', attack: 'Boulder Smash', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 3.0,  // Very slow but powerful melee
        armorType: 'stone',  // Rock construct, weak to blunt
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
        armorType: 'ethereal',  // Incorporeal flame spirit
        elite: false, moveInterval: 1, aggression: 4, spawnWeight: 7,
        loot: [
            { name: 'Fire Mote', dropChance: 0.03, rarity: 'rare', favorValue: 45 },
            { name: 'Ember', dropChance: 0.25, rarity: 'common', favorValue: 3 },
            { name: 'Spirit Dust', dropChance: 0.25, rarity: 'common', favorValue: 3 }
        ],
        description: 'A floating ball of fire. Fast and deadly with magic, but dies in one hit.'
    },
    'Flame Bat': {
        hp: 25, str: 12, agi: 20, int: 2, pDef: 4, mDef: 4,  // GLASS CANNON: HP 40→25, STR 10→12
        xp: 35,
        element: 'fire', attack: 'Singe Bite', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 1.2,  // Very fast melee attacker
        armorType: 'hide',  // Leathery bat skin
        elite: false, moveInterval: 1, aggression: 5, spawnWeight: 8,
        loot: [
            { name: 'Bat Wing', dropChance: 0.03, rarity: 'rare', favorValue: 45 },
            { name: 'Guano', dropChance: 0.25, rarity: 'common', favorValue: 3 },
            { name: 'Small Fang', dropChance: 0.25, rarity: 'common', favorValue: 3 }
        ],
        description: 'A frantic flying menace. Fragile but attacks relentlessly - prioritize it!'
    },
    'Ash Walker': {
        hp: 90, str: 12, agi: 6, int: 5, pDef: 8, mDef: 12,  // TANK: HP 75→90, STR 14→12
        xp: 35,
        element: 'dark', attack: 'Choke', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 2.2,  // Medium-slow melee
        armorType: 'bone',  // Reanimated corpse with skeletal structure
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 6,
        loot: [
            { name: 'Tattered Cloth', dropChance: 0.03, rarity: 'rare', favorValue: 45 },
            { name: 'Bone Fragment', dropChance: 0.25, rarity: 'common', favorValue: 3 },
            { name: 'Cursed Ring', dropChance: 0.25, rarity: 'uncommon', favorValue: 15 }
        ],
        description: 'A durable undead covered in volcanic ash. Soaks damage but lacks punch.'
    },
    'Salamander': {
        hp: 30, str: 6, agi: 12, int: 10, pDef: 10, mDef: 10,  // FODDER: HP 55→30, STR 12→6
        xp: 18,
        element: 'nature', attack: 'Tail Whip', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 1.8,  // Balanced melee
        armorType: 'scaled',  // Reptilian scales
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 5,
        loot: [
            { name: 'Lizard Scale', dropChance: 0.03, rarity: 'rare', favorValue: 45 },
            { name: 'Reptile Eye', dropChance: 0.25, rarity: 'common', favorValue: 3 },
            { name: 'Raw Meat', dropChance: 0.25, rarity: 'common', favorValue: 3 }
        ],
        description: 'A small reptile with glowing red scales. Common and easily dispatched.'
    },
    'Pyro Cultist': {
        hp: 50, str: 6, agi: 10, int: 16, pDef: 5, mDef: 8,
        xp: 40,
        element: 'fire', attack: 'Ember Bolt', attackType: 'magic', damageType: 'magic',
        attackRange: 5, attackSpeed: 2.0,  // Long range caster
        armorType: 'unarmored',  // Cloth-wearing mage
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
        armorType: 'hide',  // Leathery bat skin
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
        armorType: 'stone',  // Rock creature
        elite: false, moveInterval: 3, aggression: 2, spawnWeight: 5,
        loot: [
            { name: 'Stone Heart', dropChance: 0.03, rarity: 'rare', favorValue: 50 },
            { name: 'Granite Chunk', dropChance: 0.25, rarity: 'common', favorValue: 4 }
        ],
        description: 'A rock-like creature that ambushes prey. High defense, low speed.'
    },
    'Mushroom Sprite': {
        hp: 20, str: 5, agi: 8, int: 8, pDef: 4, mDef: 12,  // FODDER: HP 35→20, INT 14→8
        xp: 12,
        element: 'nature', attack: 'Spore Cloud', attackType: 'magic', damageType: 'magic',
        attackRange: 3, attackSpeed: 2.2,  // Medium range AOE caster
        armorType: 'unarmored',  // Soft fungal body
        elite: false, moveInterval: 2, aggression: 2, spawnWeight: 30,
        loot: [
            { name: 'Glowing Spore', dropChance: 0.04, rarity: 'rare', favorValue: 40 },
            { name: 'Mushroom Cap', dropChance: 0.30, rarity: 'common', favorValue: 3 }
        ],
        description: 'A small sentient fungus. Weak but can be annoying in groups.'
    },
    'Crystal Spider': {
        hp: 45, str: 11, agi: 14, int: 6, pDef: 8, mDef: 10,
        xp: 32,
        element: 'physical', attack: 'Venomous Bite', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 1.3,  // Fast melee with venom
        armorType: 'scaled',  // Crystalline exoskeleton
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
        armorType: 'bone',  // Skeletal frame
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 8,
        loot: [
            { name: 'Ancient Bone', dropChance: 0.04, rarity: 'uncommon', favorValue: 18 },
            { name: 'Bone Fragment', dropChance: 0.30, rarity: 'common', favorValue: 2 },
            { name: 'Rusted Sword', dropChance: 0.15, rarity: 'common', favorValue: 5 }
        ],
        description: 'An undead warrior animated by dark magic.'
    },
    'Phantom': {
        hp: 25, str: 4, agi: 12, int: 20, pDef: 2, mDef: 18,  // GLASS CANNON: HP 40→25, INT 16→20
        xp: 42,
        element: 'death', attack: 'Soul Drain', attackType: 'magic', damageType: 'magic',
        attackRange: 3, attackSpeed: 2.0,  // Medium range life drainer
        armorType: 'ethereal',  // Incorporeal ghost
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 30,
        loot: [
            { name: 'Ectoplasm', dropChance: 0.05, rarity: 'rare', favorValue: 45 },
            { name: 'Spirit Dust', dropChance: 0.25, rarity: 'common', favorValue: 4 }
        ],
        description: 'A deadly apparition that rapidly drains life. Kill it before it kills you.'
    },
    'Bone Golem': {
        hp: 120, str: 20, agi: 3, int: 2, pDef: 16, mDef: 8,
        xp: 55,
        element: 'death', attack: 'Crushing Blow', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 3.2,  // Very slow devastating melee
        armorType: 'bone',  // Massive bone construct
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
        hp: 85, str: 18, agi: 10, int: 4, pDef: 12, mDef: 6,  // BRUISER: HP 55→85, STR 12→18
        xp: 48,
        element: 'water', attack: 'Pincer Strike', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 1.6,  // Medium-fast melee
        armorType: 'scaled',  // Crustacean shell/exoskeleton
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 6,
        loot: [
            { name: 'Crustacean Shell', dropChance: 0.04, rarity: 'rare', favorValue: 38 },
            { name: 'Pincer', dropChance: 0.25, rarity: 'common', favorValue: 4 }
        ],
        description: 'A massive armored crustacean. Powerful pincers and thick shell.'
    },
    'Tide Serpent': {
        hp: 90, str: 16, agi: 14, int: 8, pDef: 8, mDef: 10,  // BRUISER: HP 65→90, STR 14→16
        xp: 50,
        element: 'water', attack: 'Aqua Fang', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 1.4,  // Fast melee striker
        armorType: 'scaled',  // Snake scales
        elite: false, moveInterval: 1, aggression: 4, spawnWeight: 4,
        loot: [
            { name: 'Serpent Scale', dropChance: 0.04, rarity: 'rare', favorValue: 42 },
            { name: 'Aqua Fang', dropChance: 0.20, rarity: 'uncommon', favorValue: 12 }
        ],
        description: 'A large, aggressive water serpent. Fast, tough, and hits hard.'
    },

    // === SHADOW MONSTERS ===
    'Shadow Stalker': {
        hp: 45, str: 15, agi: 16, int: 8, pDef: 6, mDef: 10,
        xp: 42,
        element: 'dark', attack: 'Shadow Strike', attackType: 'physical', damageType: 'blade',
        attackRange: 1, attackSpeed: 1.0,  // Extremely fast assassin
        armorType: 'hide',  // Shadowy hide
        elite: false, moveInterval: 1, aggression: 5, spawnWeight: 4,
        loot: [
            { name: 'Shadow Essence', dropChance: 0.04, rarity: 'rare', favorValue: 48 },
            { name: 'Dark Cloth', dropChance: 0.25, rarity: 'uncommon', favorValue: 12 }
        ],
        description: 'A predator that hunts from the darkness. Extremely fast.'
    },
    'Void Touched': {
        hp: 95, str: 10, agi: 8, int: 18, pDef: 8, mDef: 16,  // BRUISER: HP 70→95
        xp: 55,
        element: 'dark', attack: 'Void Bolt', attackType: 'magic', damageType: 'magic',
        attackRange: 4, attackSpeed: 1.8,  // Ranged void caster
        armorType: 'ethereal',  // Void-corrupted being
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 30,
        loot: [
            { name: 'Void Crystal', dropChance: 0.03, rarity: 'epic', favorValue: 120 },
            { name: 'Shadow Essence', dropChance: 0.20, rarity: 'uncommon', favorValue: 15 }
        ],
        description: 'A powerful void-corrupted being. Durable and deals heavy magic damage.'
    },

    // === ICE MONSTERS ===
    'Frost Elemental': {
        hp: 30, str: 6, agi: 10, int: 18, pDef: 4, mDef: 18,  // GLASS CANNON: HP 55→30
        xp: 45,
        element: 'ice', attack: 'Frost Bolt', attackType: 'magic', damageType: 'magic',
        attackRange: 4, attackSpeed: 1.6,  // Ethereal caster
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 5,
        armorType: 'ethereal',
        loot: [
            { name: 'Frozen Core', dropChance: 0.04, rarity: 'rare', favorValue: 50 },
            { name: 'Ice Shard', dropChance: 0.25, rarity: 'common', favorValue: 4 },
            { name: 'Frost Essence', dropChance: 0.20, rarity: 'uncommon', favorValue: 12 }
        ],
        description: 'A fragile manifestation of pure cold. Devastating magic but shatters easily.'
    },
    'Ice Golem': {
        hp: 130, str: 20, agi: 3, int: 4, pDef: 22, mDef: 12,
        xp: 55,
        element: 'ice', attack: 'Frozen Slam', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 3.2,  // Very slow but devastating melee
        elite: false, moveInterval: 3, aggression: 2, spawnWeight: 3,
        armorType: 'stone',
        loot: [
            { name: 'Permafrost Core', dropChance: 0.03, rarity: 'epic', favorValue: 100 },
            { name: 'Glacial Stone', dropChance: 0.25, rarity: 'uncommon', favorValue: 15 },
            { name: 'Ice Shard', dropChance: 0.30, rarity: 'common', favorValue: 3 }
        ],
        description: 'A massive construct of ancient ice. Incredibly durable and slow.'
    },
    'Frozen Husk': {
        hp: 85, str: 11, agi: 6, int: 4, pDef: 10, mDef: 8,  // TANK: HP 60→85, STR 14→11
        xp: 38,
        element: 'ice', attack: 'Chilling Grasp', attackType: 'physical', damageType: 'blade',
        attackRange: 1, attackSpeed: 2.0,  // Undead melee attacker
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 6,
        armorType: 'bone',
        loot: [
            { name: 'Frozen Bone', dropChance: 0.04, rarity: 'uncommon', favorValue: 18 },
            { name: 'Bone Fragment', dropChance: 0.30, rarity: 'common', favorValue: 2 },
            { name: 'Ice Shard', dropChance: 0.20, rarity: 'common', favorValue: 3 }
        ],
        description: 'A resilient frozen corpse. Takes a beating but hits softly.'
    },
    'Blizzard Spirit': {
        hp: 35, str: 4, agi: 20, int: 14, pDef: 2, mDef: 14,
        xp: 38,
        element: 'ice', attack: 'Frost Wind', attackType: 'magic', damageType: 'magic',
        attackRange: 3, attackSpeed: 1.2,  // Fast ethereal attacker
        elite: false, moveInterval: 1, aggression: 4, spawnWeight: 5,
        armorType: 'ethereal',
        loot: [
            { name: 'Spirit Ice', dropChance: 0.04, rarity: 'rare', favorValue: 45 },
            { name: 'Frost Essence', dropChance: 0.25, rarity: 'uncommon', favorValue: 12 },
            { name: 'Spirit Dust', dropChance: 0.25, rarity: 'common', favorValue: 4 }
        ],
        description: 'A swift winter spirit. Moves like the wind and freezes all it touches.'
    },

    // === NEW: COMBAT VARIETY ENEMIES ===
    // These enemies showcase the new timing profiles and special mechanics

    'Shadow Imp': {
        hp: 30, str: 10, agi: 20, int: 6, pDef: 3, mDef: 6,
        xp: 28,
        element: 'dark', attack: 'Quick Slash', attackType: 'physical', damageType: 'blade',
        attackRange: 1, attackSpeed: 0.8,  // Very fast attacks - SWIFT timing profile
        armorType: 'hide',
        elite: false, moveInterval: 1, aggression: 5, spawnWeight: 5,
        loot: [
            { name: 'Shadow Essence', dropChance: 0.04, rarity: 'rare', favorValue: 40 },
            { name: 'Dark Cloth', dropChance: 0.25, rarity: 'common', favorValue: 4 }
        ],
        description: 'A swift demonic pest. Attacks with minimal warning - requires quick reflexes!'
    },

    'Temple Sentinel': {
        hp: 90, str: 16, agi: 6, int: 8, pDef: 16, mDef: 12,
        xp: 50,
        element: 'holy', attack: 'Shield Bash', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 2.2,
        armorType: 'plate',
        hasShield: true,  // SHIELD MECHANIC - blocks frontal attacks
        elite: false, moveInterval: 2, aggression: 2, spawnWeight: 3,
        loot: [
            { name: 'Temple Shield Fragment', dropChance: 0.04, rarity: 'rare', favorValue: 55 },
            { name: 'Holy Metal', dropChance: 0.20, rarity: 'uncommon', favorValue: 18 },
            { name: 'Stone Chunk', dropChance: 0.25, rarity: 'common', favorValue: 3 }
        ],
        description: 'An ancient temple guardian with a shield. Flanking or shield-breaking required!'
    },

    'Stone Guardian': {
        hp: 150, str: 35, agi: 2, int: 4, pDef: 25, mDef: 8,  // BRUISER: STR 28→35
        xp: 75,
        element: 'earth', attack: 'Crushing Blow', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 3.5,  // Very slow - HEAVY timing profile (long telegraph)
        armorType: 'stone',
        elite: false, moveInterval: 4, aggression: 2, spawnWeight: 2,
        loot: [
            { name: 'Guardian Core', dropChance: 0.03, rarity: 'epic', favorValue: 90 },
            { name: 'Enchanted Stone', dropChance: 0.20, rarity: 'uncommon', favorValue: 20 },
            { name: 'Stone Chunk', dropChance: 0.30, rarity: 'common', favorValue: 4 }
        ],
        description: 'A massive stone construct. Slow but devastating - every hit counts!'
    },

    'Demon Knight': {
        hp: 120, str: 27, agi: 10, int: 10, pDef: 18, mDef: 14,  // BRUISER: STR 22→27
        xp: 80,
        element: 'dark', attack: 'Charge Strike', attackType: 'physical', damageType: 'blade',
        attackRange: 1, attackSpeed: 2.5,  // CHARGING timing profile - rushes at player
        armorType: 'plate',
        elite: false, moveInterval: 2, aggression: 4, spawnWeight: 2,
        loot: [
            { name: 'Demon Steel', dropChance: 0.04, rarity: 'epic', favorValue: 85 },
            { name: 'Infernal Blade Fragment', dropChance: 0.15, rarity: 'rare', favorValue: 45 },
            { name: 'Dark Cloth', dropChance: 0.25, rarity: 'uncommon', favorValue: 12 }
        ],
        description: 'A brutal demonic warrior. Tough, hard-hitting, and relentless.'
    },

    'Giant Spider': {
        hp: 85, str: 18, agi: 12, int: 6, pDef: 10, mDef: 8,
        xp: 48,
        element: 'nature', attack: 'Sweeping Legs', attackType: 'physical', damageType: 'pierce',
        attackRange: 1, attackSpeed: 2.0,  // SWEEPING timing profile - wide arc attack
        armorType: 'hide',
        elite: false, moveInterval: 2, aggression: 3, spawnWeight: 4,
        loot: [
            { name: 'Spider Silk', dropChance: 0.05, rarity: 'rare', favorValue: 50 },
            { name: 'Venom Gland', dropChance: 0.20, rarity: 'uncommon', favorValue: 15 },
            { name: 'Chitin Plate', dropChance: 0.25, rarity: 'common', favorValue: 5 }
        ],
        description: 'A massive spider with sweeping leg attacks. Wide attack arc - hard to dodge!'
    },

    'Shield Bearer': {
        hp: 90, str: 12, agi: 8, int: 6, pDef: 14, mDef: 10,  // TANK: HP 70→90
        xp: 42,
        element: 'physical', attack: 'Shield Thrust', attackType: 'physical', damageType: 'blunt',
        attackRange: 1, attackSpeed: 2.0,
        armorType: 'mail',
        hasShield: true,  // SHIELD MECHANIC
        elite: false, moveInterval: 2, aggression: 2, spawnWeight: 5,
        loot: [
            { name: 'Battered Shield', dropChance: 0.04, rarity: 'uncommon', favorValue: 25 },
            { name: 'Iron Scrap', dropChance: 0.25, rarity: 'common', favorValue: 4 }
        ],
        description: 'A heavily armored soldier. Durable but slow - flank or outlast it.'
    },

    'Flame Sprite': {
        hp: 25, str: 8, agi: 22, int: 10, pDef: 2, mDef: 8,
        xp: 25,
        element: 'fire', attack: 'Ember Touch', attackType: 'magic', damageType: 'fire',
        attackRange: 1, attackSpeed: 0.6,  // Extremely fast - SWIFT timing
        armorType: 'ethereal',
        elite: false, moveInterval: 1, aggression: 5, spawnWeight: 6,
        loot: [
            { name: 'Fire Mote', dropChance: 0.04, rarity: 'rare', favorValue: 35 },
            { name: 'Ember', dropChance: 0.30, rarity: 'common', favorValue: 3 }
        ],
        description: 'A tiny fire spirit. Incredibly fast attacks but very fragile!'
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

// Export
window.MONSTER_DATA = MONSTER_DATA;
window.getRandomMonster = getRandomMonster;
window.rollMonsterLoot = rollMonsterLoot;

console.log('[Monsters] Loaded', Object.keys(MONSTER_DATA).length, 'monsters');
