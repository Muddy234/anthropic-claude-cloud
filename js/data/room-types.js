// ============================================================================
// ROOM TYPES - Special Room Definitions
// ============================================================================
// Defines all special room types, their properties, and spawn criteria
// ============================================================================

const ROOM_TYPES = {
    // ========================================================================
    // ENTRANCE - Player spawn point with bonfire
    // ========================================================================
    entrance: {
        id: 'entrance',
        name: 'Entrance',
        description: 'The starting point of the floor with a healing bonfire',

        // Spawn criteria
        criteria: {
            required: true,              // Always spawns
            maxPerFloor: 1,
            minRoomSize: 20,
            maxRoomSize: 36,
            canBeDeadEnd: false,         // Must have connections
            mustBeFirst: true            // Always room index 0
        },

        // Room properties
        properties: {
            hasEnemies: false,
            hasBonfire: true,            // Healing fire in entrance
            isLocked: false,
            isSafeZone: true,
            elementPower: 1
        },

        // Features to spawn
        features: ['bonfire'],

        // Visual
        decorationDensity: 0.5           // 50% normal decorations
    },

    // ========================================================================
    // HEALING FIRE - Small room with reusable full heal
    // ========================================================================
    healing_fire: {
        id: 'healing_fire',
        name: 'Sanctuary',
        description: 'A small chamber with a healing bonfire',

        criteria: {
            required: false,
            maxPerFloor: 3,              // Up to 3 per floor
            minRoomSize: 20,
            maxRoomSize: 24,             // Very small rooms only
            canBeDeadEnd: true,
            preferDeadEnd: true,         // Prefers tucked-away locations
            minRoomIndex: 1              // Not the first room
        },

        properties: {
            hasEnemies: false,
            hasBonfire: true,
            isLocked: false,
            isSafeZone: true,
            elementPower: 1
        },

        features: ['bonfire'],

        decorationDensity: 0.3           // Sparse, discrete
    },

    // ========================================================================
    // MIRROR CHAMBER - Fight your doppelganger
    // ========================================================================
    mirror_chamber: {
        id: 'mirror_chamber',
        name: 'Mirror Chamber',
        description: 'A reflective chamber where shadows take form',

        criteria: {
            required: false,
            maxPerFloor: 1,
            minRoomSize: 26,
            maxRoomSize: 30,             // Medium rooms
            canBeDeadEnd: true,
            minRoomIndex: 2,             // Not too early
            minFloor: 2                  // Not on floor 1
        },

        properties: {
            hasEnemies: false,           // Doppelganger spawns on entry
            hasDoppelganger: true,
            isLocked: false,
            lockOnEntry: true,           // Locks when player enters
            unlockOnClear: true,
            elementPower: 3,
            preferredElements: ['dark', 'arcane', 'death']
        },

        features: ['mirror', 'doppelganger_spawn'],

        decorationDensity: 0.4,

        // Doppelganger config
        doppelganger: {
            copiesPlayerStats: true,
            copiesPlayerWeapon: true,
            copiesPlayerAbilities: true,
            hasFullHP: true,             // Full max HP, not current HP
            huntsOnEscape: true,         // Will hunt player if they flee
            reward: 'upgraded_item'      // Drops upgraded copy of best item
        }
    },

    // ========================================================================
    // SACRIFICE ALTAR - Trade items for health
    // ========================================================================
    sacrifice_altar: {
        id: 'sacrifice_altar',
        name: 'Altar of Exchange',
        description: 'An ancient altar that accepts offerings',

        criteria: {
            required: false,
            maxPerFloor: 1,
            minRoomSize: 20,
            maxRoomSize: 26,             // Small to medium
            canBeDeadEnd: true,
            preferDeadEnd: true,
            minRoomIndex: 1
        },

        properties: {
            hasEnemies: false,
            hasAltar: true,
            isLocked: false,
            isSafeZone: true,
            elementPower: 2,
            preferredElements: ['death', 'dark', 'holy']
        },

        features: ['sacrifice_altar'],

        decorationDensity: 0.6,

        // Sacrifice config
        sacrifice: {
            acceptsAnyItem: true,
            healCalculation: 'tier_and_rarity',  // Based on item quality
            // Healing values by tier (percentage of max HP)
            healByTier: {
                common: 0.10,            // 10% max HP
                uncommon: 0.20,          // 20% max HP
                rare: 0.35,              // 35% max HP
                epic: 0.55,              // 55% max HP
                legendary: 0.80          // 80% max HP
            },
            // Multipliers for equipment slots (weapons worth more)
            slotMultipliers: {
                weapon: 1.5,
                armor: 1.3,
                accessory: 1.0,
                consumable: 0.5
            }
        }
    },

    // ========================================================================
    // FORGOTTEN VAULT - Puzzle-locked treasure room
    // ========================================================================
    forgotten_vault: {
        id: 'forgotten_vault',
        name: 'Forgotten Vault',
        description: 'An ancient vault sealed by mysterious mechanisms',

        criteria: {
            required: false,
            maxPerFloor: 1,
            minRoomSize: 22,
            maxRoomSize: 26,             // Small fortified room
            canBeDeadEnd: true,
            mustBeDeadEnd: true,         // Always a dead end
            minRoomIndex: 2,
            minFloor: 1
        },

        properties: {
            hasEnemies: false,           // Enemies spawn on puzzle failure
            hasPuzzle: true,
            isLocked: true,              // Starts locked
            unlockMethod: 'puzzle',      // Must solve puzzle
            elementPower: 2,
            preferredElements: ['arcane', 'earth', 'holy']
        },

        features: ['vault_puzzle', 'legendary_chest'],

        decorationDensity: 0.8,          // Ornate

        // Puzzle config
        puzzle: {
            types: ['pressure_plates', 'torch_sequence', 'symbol_matching'],
            difficulty: 'medium',
            maxAttempts: 3,              // Enemies spawn after 3 failures
            failureSpawnsGuardians: true,
            guardianCount: 2,
            guardianTier: 'ELITE'
        },

        // Reward config
        reward: {
            guaranteedLegendary: true,
            loreScroll: true,
            goldMultiplier: 2.0
        }
    },

    // ========================================================================
    // BOSS ROOM - Floor boss encounter
    // ========================================================================
    boss_room: {
        id: 'boss_room',
        name: 'Boss Lair',
        description: 'The lair of a powerful creature',

        criteria: {
            required: true,              // Every floor has one
            maxPerFloor: 1,
            minRoomSize: 32,
            maxRoomSize: 36,             // Large rooms
            canBeDeadEnd: true,
            preferDeadEnd: true,         // Optional path, dead end preferred
            minRoomIndex: 3              // Not early in floor
        },

        properties: {
            hasEnemies: false,           // Boss spawns separately
            hasBoss: true,
            isLocked: false,             // Can enter freely
            lockOnEntry: true,           // But locks once entered
            unlockOnClear: true,         // Opens when boss defeated
            isOptional: true,            // Player doesn't have to fight
            elementPower: 4,
            matchFloorElement: true      // Boss matches floor's dominant element
        },

        features: ['boss_spawn', 'exit_stairs'],

        decorationDensity: 0.3,          // Open arena

        // Boss config
        boss: {
            scaleToFloor: true,
            hasUniqueAbilities: true,
            dropsUniqueItem: true,
            unlocksNextFloor: true       // Stairs appear after defeat
        }
    },

    // ========================================================================
    // STANDARD - Normal room with enemies (fallback)
    // ========================================================================
    standard: {
        id: 'standard',
        name: 'Chamber',
        description: 'A standard dungeon chamber',

        criteria: {
            required: false,
            maxPerFloor: Infinity,       // No limit
            minRoomSize: 20,
            maxRoomSize: 36,
            canBeDeadEnd: true
        },

        properties: {
            hasEnemies: true,
            isLocked: false,
            elementPower: 2
        },

        features: [],

        decorationDensity: 1.0           // Normal decorations
    }
};

// ============================================================================
// ROOM TYPE PRIORITIES
// ============================================================================
// Order in which room types are assigned (higher priority first)

const ROOM_TYPE_PRIORITY = [
    'entrance',           // Must be first
    'boss_room',          // One per floor, needs large room
    'forgotten_vault',    // Needs dead end
    'mirror_chamber',     // Medium room, special
    'sacrifice_altar',    // Small room
    'healing_fire',       // Multiple allowed, small rooms
    'standard'            // Fallback for remaining rooms
];

// ============================================================================
// FEATURE DEFINITIONS
// ============================================================================
// What each feature means for room setup

const ROOM_FEATURES = {
    bonfire: {
        id: 'bonfire',
        name: 'Healing Bonfire',
        interactable: true,
        interaction: 'heal_full',
        reusable: true,
        visualType: 'fire',
        lightRadius: 5,
        description: 'Rest at the bonfire to restore health'
    },

    mirror: {
        id: 'mirror',
        name: 'Dark Mirror',
        interactable: false,           // Triggers automatically
        visualType: 'mirror',
        lightRadius: 2,
        description: 'A mirror that reflects more than light'
    },

    doppelganger_spawn: {
        id: 'doppelganger_spawn',
        name: 'Shadow Spawn Point',
        triggeredOnEntry: true,
        spawnType: 'doppelganger'
    },

    sacrifice_altar: {
        id: 'sacrifice_altar',
        name: 'Altar of Exchange',
        interactable: true,
        interaction: 'sacrifice_item',
        reusable: true,
        visualType: 'altar',
        lightRadius: 3,
        description: 'Sacrifice items to restore health'
    },

    vault_puzzle: {
        id: 'vault_puzzle',
        name: 'Ancient Mechanism',
        interactable: true,
        interaction: 'solve_puzzle',
        reusable: false,               // Once solved, stays solved
        blocksAccess: true,            // Must solve to access reward
        visualType: 'puzzle'
    },

    legendary_chest: {
        id: 'legendary_chest',
        name: 'Ancient Chest',
        interactable: true,
        interaction: 'open_chest',
        reusable: false,
        guaranteedRarity: 'legendary',
        visualType: 'ornate_chest',
        lightRadius: 2
    },

    boss_spawn: {
        id: 'boss_spawn',
        name: 'Boss Arena Center',
        triggeredOnEntry: true,
        spawnType: 'boss'
    },

    exit_stairs: {
        id: 'exit_stairs',
        name: 'Stairs Down',
        interactable: true,
        interaction: 'descend_floor',
        requiresBossDefeated: true,
        visualType: 'stairs_down',
        description: 'Descend to the next floor'
    }
};

// ============================================================================
// PUZZLE DEFINITIONS
// ============================================================================

const PUZZLE_TYPES = {
    pressure_plates: {
        id: 'pressure_plates',
        name: 'Pressure Plate Sequence',
        description: 'Step on the plates in the correct order',
        minPlates: 3,
        maxPlates: 5,
        showHint: true,                // Shows brief hint at start
        hintDuration: 3000,            // 3 seconds
        visualType: 'floor_plates'
    },

    torch_sequence: {
        id: 'torch_sequence',
        name: 'Torch Lighting',
        description: 'Light the torches in the correct sequence',
        minTorches: 4,
        maxTorches: 6,
        showHint: true,
        hintDuration: 2000,
        torchesExtinguishOnFail: true,
        visualType: 'wall_torches'
    },

    symbol_matching: {
        id: 'symbol_matching',
        name: 'Runic Matching',
        description: 'Activate the matching rune pairs',
        minPairs: 3,
        maxPairs: 4,
        symbolSets: ['elemental', 'ancient', 'celestial'],
        showSymbolsBriefly: true,
        briefShowDuration: 2000,
        visualType: 'rune_stones'
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get room type definition by ID
 */
function getRoomTypeDefinition(typeId) {
    return ROOM_TYPES[typeId] || ROOM_TYPES.standard;
}

/**
 * Get feature definition by ID
 */
function getFeatureDefinition(featureId) {
    return ROOM_FEATURES[featureId] || null;
}

/**
 * Get puzzle definition by ID
 */
function getPuzzleDefinition(puzzleId) {
    return PUZZLE_TYPES[puzzleId] || null;
}

/**
 * Check if a room meets criteria for a room type
 */
function roomMeetsCriteria(room, roomType, context) {
    const def = ROOM_TYPES[roomType];
    if (!def) return false;

    const criteria = def.criteria;
    const roomIndex = context.roomIndex;
    const totalRooms = context.totalRooms;
    const floorNumber = context.floorNumber;
    const assignedTypes = context.assignedTypes || {};
    const isDeadEnd = (room.connectedRooms?.length || 0) <= 1;

    // Check max per floor
    const currentCount = assignedTypes[roomType] || 0;
    if (currentCount >= criteria.maxPerFloor) {
        return false;
    }

    // Check room size
    const roomSize = Math.min(room.floorWidth || 36, room.floorHeight || 36);
    if (roomSize < criteria.minRoomSize || roomSize > criteria.maxRoomSize) {
        return false;
    }

    // Check dead end requirements
    if (criteria.mustBeDeadEnd && !isDeadEnd) {
        return false;
    }
    if (!criteria.canBeDeadEnd && isDeadEnd) {
        return false;
    }

    // Check room index requirements
    if (criteria.mustBeFirst && roomIndex !== 0) {
        return false;
    }
    if (criteria.minRoomIndex !== undefined && roomIndex < criteria.minRoomIndex) {
        return false;
    }

    // Check floor requirements
    if (criteria.minFloor !== undefined && floorNumber < criteria.minFloor) {
        return false;
    }

    return true;
}

/**
 * Calculate sacrifice heal amount for an item
 */
function calculateSacrificeHeal(item, playerMaxHp) {
    const config = ROOM_TYPES.sacrifice_altar.sacrifice;

    // Get base heal from rarity
    const rarity = item.rarity || 'common';
    const baseHealPercent = config.healByTier[rarity] || 0.10;

    // Apply slot multiplier
    let slotMultiplier = 1.0;
    if (item.slot === 'MAIN' || item.weaponType) {
        slotMultiplier = config.slotMultipliers.weapon;
    } else if (item.slot === 'BODY' || item.slot === 'HEAD') {
        slotMultiplier = config.slotMultipliers.armor;
    } else if (item.slot === 'RING' || item.slot === 'AMULET') {
        slotMultiplier = config.slotMultipliers.accessory;
    } else if (item.consumable) {
        slotMultiplier = config.slotMultipliers.consumable;
    }

    // Calculate final heal
    const healPercent = baseHealPercent * slotMultiplier;
    const healAmount = Math.floor(playerMaxHp * healPercent);

    return Math.max(1, healAmount);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.ROOM_TYPES = ROOM_TYPES;
    window.ROOM_TYPE_PRIORITY = ROOM_TYPE_PRIORITY;
    window.ROOM_FEATURES = ROOM_FEATURES;
    window.PUZZLE_TYPES = PUZZLE_TYPES;
    window.getRoomTypeDefinition = getRoomTypeDefinition;
    window.getFeatureDefinition = getFeatureDefinition;
    window.getPuzzleDefinition = getPuzzleDefinition;
    window.roomMeetsCriteria = roomMeetsCriteria;
    window.calculateSacrificeHeal = calculateSacrificeHeal;
}

console.log('✅ Room types loaded (6 special types + standard)');
