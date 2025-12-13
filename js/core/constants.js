// ============================================================================
// GAME CONSTANTS - Configuration and global settings
// ============================================================================

// ============================================================================
// GRID & DISPLAY
// ============================================================================

const GRID_WIDTH = 200;
const GRID_HEIGHT = 200;
const TILE_SIZE = 16;
const ZOOM_LEVEL = 2.5;  // Increased from 2.0 for better sprite visibility (25% zoom in)
const TRACKER_WIDTH = 70;  // Icon sidebar width (reduced from 350 for new UI)
const CAMERA_DEADZONE_WIDTH = 200;
const CAMERA_DEADZONE_HEIGHT = 150;
const CAMERA_SMOOTHING = 0.1;
const DISPLAY_WIDTH = GRID_WIDTH * TILE_SIZE;
const DISPLAY_HEIGHT = GRID_HEIGHT * TILE_SIZE;

// ============================================================================
// PLAYER DEFAULTS
// ============================================================================

const PLAYER_DEFAULTS = {
    hp: 100,
    maxHp: 100,
    mp: 50,
    maxMp: 50,
    str: 10,
    agi: 10,
    int: 10,
    pDef: 5,
    mDef: 5,
    level: 1,
    xp: 0,
    xpToLevel: 100,
    gold: 0,
    visionRange: 8,
    moveSpeed: 1.0,
    attackSpeed: 1.0
};

// ============================================================================
// MOVEMENT & PHYSICS
// ============================================================================

const MOVEMENT_CONFIG = {
    baseSpeed: 4.0,           // Tiles per second
    diagonalMultiplier: 0.707, // 1/sqrt(2)
    inputBufferTime: 0.1,     // Seconds to buffer input
    snapThreshold: 0.1,       // Distance to snap to tile center
    collisionPadding: 0.1     // Buffer for collision detection
};

// ============================================================================
// NOISE SYSTEM
// ============================================================================

const NOISE_CONFIG = {
    // Base noise levels
    silent: 0,
    quiet: 20,
    normal: 40,
    loud: 60,
    veryLoud: 80,
    deafening: 100,
    
    // Action noise levels
    walking: 30,
    running: 50,
    sneaking: 10,
    combat: 60,
    ability: 45,
    
    // Decay
    noiseDecayRate: 10,       // Units per second
    noiseMemoryDuration: 5,   // Seconds
    
    // Propagation
    noiseFalloffPerTile: 5,
    wallNoiseReduction: 20,
    doorNoiseReduction: 10
};

// ============================================================================
// VISION & FOG OF WAR
// ============================================================================

const VISION_CONFIG = {
    playerBaseVision: 8,
    torchBonus: 3,
    lanternBonus: 4,
    darknessReduction: 3,
    fogOfWarEnabled: true,
    rememberExplored: true,
    exploredAlpha: 0.5,
    hiddenAlpha: 0.0
};

// ============================================================================
// INVENTORY
// ============================================================================

const INVENTORY_CONFIG = {
    // Maximum inventory slots (not counting equipped items)
    maxSlots: 15,
    maxStackSize: 99,  // Legacy - use maxStacks instead
    quickSlots: 5,

    // Equipment slots
    equipmentSlots: {
        MAIN: 'Main Hand',
        OFF: 'Off Hand',
        HEAD: 'Head',
        CHEST: 'Chest',
        LEGS: 'Legs',
        FEET: 'Feet'
    },

    // Maximum stack sizes by item type
    maxStacks: {
        consumable: 99,
        material: 99,
        weapon: 1,
        armor: 1,
        quest: 1,
        default: 1
    },

    // Items that can't be dropped/sold
    soulbound: ['quest']
};

// ============================================================================
// MAP GENERATION
// ============================================================================

const MAP_CONFIG = {
    minRoomSize: 5,
    maxRoomSize: 12,
    minRooms: 8,
    maxRooms: 15,
    corridorWidth: 2,
    roomPadding: 2,
    doorwayWidth: 2,
    
    // Room types
    roomTypes: ['standard', 'treasure', 'enemy', 'boss', 'shop', 'shrine'],
    
    // Special room chances
    treasureRoomChance: 0.15,
    shopRoomChance: 0.10,
    shrineRoomChance: 0.08
};

// ============================================================================
// ENEMY AI
// ============================================================================

const AI_CONFIG = {
    updateRate: 0.1,            // Seconds between AI updates
    pathfindingTimeout: 100,    // Max pathfinding iterations
    maxChaseDuration: 30,       // Seconds before giving up chase
    wanderPauseMin: 1.0,
    wanderPauseMax: 3.0,
    alertDuration: 5.0,         // Seconds in alert state
    searchDuration: 10.0,       // Seconds searching for player
    
    // Behavior thresholds
    aggroHysteresis: 2,         // Extra range before de-aggro
    flankingAngle: 45,          // Degrees for flanking consideration
    groupRadius: 8              // Tiles for group behavior
};

// ============================================================================
// RENDERING
// ============================================================================

const RENDER_CONFIG = {
    targetFPS: 60,
    maxDeltaTime: 0.1,          // Cap delta time to prevent physics issues
    particlePoolSize: 500,
    maxVisibleEnemies: 50,
    animationFrameTime: 0.15,   // Seconds per animation frame
    
    // Colors
    colors: {
        background: '#0a0a0a',
        floor: '#2c2c2c',
        wall: '#1a1a1a',
        player: '#4fc3f7',
        enemy: '#ef5350',
        loot: '#ffd54f',
        damage: '#ff1744',
        heal: '#69f0ae',
        xp: '#7c4dff',
        gold: '#ffc107'
    },
    
    // UI
    healthBarHeight: 4,
    healthBarWidth: 24,
    damageNumberDuration: 1.0,
    damageNumberRiseSpeed: 30
};

// ============================================================================
// AUDIO (placeholder for future)
// ============================================================================

const AUDIO_CONFIG = {
    masterVolume: 1.0,
    musicVolume: 0.7,
    sfxVolume: 1.0,
    ambientVolume: 0.5
};

// ============================================================================
// DEBUG
// ============================================================================

const DEBUG_CONFIG = {
    showFPS: false,
    showGrid: false,
    showColliders: false,
    showPaths: false,
    showNoise: false,
    showVision: false,
    logAI: false,
    logCombat: false,
    logLoot: false,
    invincible: false,
    infiniteGold: false
};

// ============================================================================
// RARITY SYSTEM
// ============================================================================

const RARITY_CONFIG = {
    common: { color: '#9e9e9e', multiplier: 1.0 },
    uncommon: { color: '#4caf50', multiplier: 1.15 },
    rare: { color: '#2196f3', multiplier: 1.35 },
    epic: { color: '#9c27b0', multiplier: 1.6 },
    legendary: { color: '#ff9800', multiplier: 2.0 }
};

// ============================================================================
// EXTRACTION SYSTEM (Survival Extraction Update)
// ============================================================================

const EXTRACTION_CONFIG = {
    // Shafts per floor (scales slightly with floor)
    shaftsPerFloor: {
        1: 3, 2: 3, 3: 3,
        4: 4, 5: 4, 6: 4
    },

    // Floor duration before all shafts collapse (12 minutes)
    floorDuration: 720000,

    // Collapse schedule as percentage of floor duration
    // First at 40%, second at 65%, third at 83%, fourth at 92%
    collapseSchedule: [0.40, 0.65, 0.83, 0.92],

    // Warning timing (milliseconds before collapse)
    warningDuration: 20000,
    warningStages: {
        rumble: 20000,    // First warning at 20s
        debris: 10000,    // Visual debris at 10s
        critical: 5000    // Critical shake at 5s
    },

    // Interaction
    interactionRadius: 1.5  // Tiles from shaft to interact
};

// ============================================================================
// VILLAGE HUB
// ============================================================================

const VILLAGE_CONFIG = {
    mapWidth: 50,
    mapHeight: 40,

    // Building definitions
    buildings: {
        home: { width: 8, height: 6, interior: true, name: 'Home' },
        shop: { width: 6, height: 5, interior: true, name: 'Shop' },
        smithy: { width: 7, height: 5, interior: true, name: 'Smithy' },
        bank: { width: 5, height: 4, interior: false, name: 'Bank' },
        farm: { width: 10, height: 8, interior: false, name: 'Farm' },
        stable: { width: 6, height: 6, interior: false, name: 'Stable' }
    },

    // Player spawn position
    spawnX: 25,
    spawnY: 20,

    // Movement speed in village (tiles per second)
    moveSpeed: 5.0
};

// ============================================================================
// BANKING SYSTEM
// ============================================================================

const BANKING_CONFIG = {
    maxSlots: 100,
    startingGold: 50,

    // Starting kit for new players
    startingKit: {
        weapon: {
            id: 'worn_sword',
            name: 'Worn Sword',
            type: 'weapon',
            subtype: 'sword',
            rarity: 'common',
            damage: 8,
            description: 'A weathered but serviceable blade.'
        },
        armor: {
            id: 'cloth_armor',
            name: 'Cloth Armor',
            type: 'armor',
            slot: 'CHEST',
            rarity: 'common',
            pDef: 2,
            mDef: 1,
            description: 'Basic protection.'
        },
        consumables: [
            { id: 'health_potion_small', name: 'Small Health Potion', type: 'consumable', count: 2 }
        ]
    }
};

// ============================================================================
// FLOOR DEGRADATION
// ============================================================================

const DEGRADATION_CONFIG = {
    // Village degradation stages based on deepest floor reached
    stages: {
        1: { floors: [1, 2], description: 'Peaceful' },
        2: { floors: [3, 4], description: 'Smoke on Horizon' },
        3: { floors: [5, 6], description: 'Ash Falling' },
        4: { floors: ['core'], description: 'Final Hour' }
    },

    // Drop rate reduction per extraction from a floor
    stepReduction: 0.15,

    // Minimum drop rate (floor never goes below 40%)
    minimum: 0.40,

    // Initial drop rate
    baseRate: 1.0
};

// ============================================================================
// FLOOR TIERS
// ============================================================================

const FLOOR_TIER_CONFIG = {
    tier1: {
        floors: [1, 2, 3],
        gearLevel: 'shop',
        description: 'Outer Depths',
        enemyScaling: 1.0
    },
    tier2: {
        floors: [4, 5, 6],
        gearLevel: 'crafted_t1',
        description: 'Inner Depths',
        enemyScaling: 1.5
    },
    core: {
        floors: ['core'],
        gearLevel: 'crafted_t2',
        description: 'The Core',
        enemyScaling: 2.0
    }
};

// ============================================================================
// QUEST SYSTEM
// ============================================================================

const QUEST_CONFIG = {
    maxActive: 5,
    types: ['fetch', 'improvement', 'rescue', 'lore'],

    // Quest availability check interval (ms)
    checkInterval: 5000
};

// ============================================================================
// SAVE SYSTEM
// ============================================================================

const SAVE_CONFIG = {
    maxSlots: 3,
    autoSaveInterval: 30000,  // 30 seconds
    storageKey: 'shifting_chasm_save',
    version: 1
};

// ============================================================================
// GAME STATES
// ============================================================================

const GAME_STATES = {
    MENU: 'menu',
    VILLAGE: 'village',
    LOADING: 'loading',
    PLAYING: 'playing',
    PAUSED: 'paused',
    CHEST: 'chest',
    DIALOGUE: 'dialogue',
    SHOP: 'shop',
    BANK: 'bank',
    CRAFTING: 'crafting',
    LOADOUT: 'loadout',
    EXTRACTION: 'extraction',
    GAMEOVER: 'gameover',
    VICTORY: 'victory'
};

// ============================================================================
// MINI-BOSS CONFIG
// ============================================================================

const MINIBOSS_CONFIG = {
    // One mini-boss per floor
    perFloor: 1,

    // Room type for mini-boss
    roomType: 'miniboss',

    // Stat multipliers vs normal enemies
    hpMultiplier: 5.0,
    damageMultiplier: 1.5,

    // Rewards
    guaranteedMapFragment: true,
    bonusDrops: 2
};

// ============================================================================
// PATH DOWN (Hidden Path to Next Floor)
// ============================================================================

const PATH_DOWN_CONFIG = {
    // Always spawns in a "deep" room (far from entrance)
    minDistanceFromSpawn: 10,

    // Visual hints
    hints: {
        heatShimmer: true,
        distinctSound: true,
        enemyAvoidance: true
    },

    // Revealed on mini-boss kill
    revealOnMiniBossKill: true
};

// ============================================================================
// RESCUE RUN
// ============================================================================

const RESCUE_CONFIG = {
    // Death drop persists for one run only
    persistsForRuns: 1,

    // Visual marker on minimap
    showOnMinimap: true,

    // Interaction radius to collect
    collectRadius: 1.0
};

// ============================================================================
// EXPORTS
// ============================================================================

// Grid & Display
window.GRID_WIDTH = GRID_WIDTH;
window.GRID_HEIGHT = GRID_HEIGHT;
window.TILE_SIZE = TILE_SIZE;
window.ZOOM_LEVEL = ZOOM_LEVEL;
window.TRACKER_WIDTH = TRACKER_WIDTH;
window.CAMERA_DEADZONE_WIDTH = CAMERA_DEADZONE_WIDTH;
window.CAMERA_DEADZONE_HEIGHT = CAMERA_DEADZONE_HEIGHT;
window.CAMERA_SMOOTHING = CAMERA_SMOOTHING;
window.DISPLAY_WIDTH = DISPLAY_WIDTH;
window.DISPLAY_HEIGHT = DISPLAY_HEIGHT;

// Config objects
window.PLAYER_DEFAULTS = PLAYER_DEFAULTS;
window.MOVEMENT_CONFIG = MOVEMENT_CONFIG;
window.NOISE_CONFIG = NOISE_CONFIG;
window.VISION_CONFIG = VISION_CONFIG;
window.INVENTORY_CONFIG = INVENTORY_CONFIG;
window.MAP_CONFIG = MAP_CONFIG;
window.AI_CONFIG = AI_CONFIG;
window.RENDER_CONFIG = RENDER_CONFIG;
window.AUDIO_CONFIG = AUDIO_CONFIG;
window.DEBUG_CONFIG = DEBUG_CONFIG;
window.RARITY_CONFIG = RARITY_CONFIG;

// Survival Extraction Update configs
window.EXTRACTION_CONFIG = EXTRACTION_CONFIG;
window.VILLAGE_CONFIG = VILLAGE_CONFIG;
window.BANKING_CONFIG = BANKING_CONFIG;
window.DEGRADATION_CONFIG = DEGRADATION_CONFIG;
window.FLOOR_TIER_CONFIG = FLOOR_TIER_CONFIG;
window.QUEST_CONFIG = QUEST_CONFIG;
window.SAVE_CONFIG = SAVE_CONFIG;
window.GAME_STATES = GAME_STATES;
window.MINIBOSS_CONFIG = MINIBOSS_CONFIG;
window.PATH_DOWN_CONFIG = PATH_DOWN_CONFIG;
window.RESCUE_CONFIG = RESCUE_CONFIG;

console.log('[Constants] Game configuration loaded (Survival Extraction v1)');