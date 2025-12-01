// ============================================================================
// GAME CONSTANTS - Configuration and global settings
// ============================================================================

// ============================================================================
// GRID & DISPLAY
// ============================================================================

const GRID_WIDTH = 80;
const GRID_HEIGHT = 60;
const TILE_SIZE = 16;
const ZOOM_LEVEL = 2;
const TRACKER_WIDTH = 350;
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
    maxSlots: 30,
    maxStackSize: 99,
    equipmentSlots: ['MAIN', 'OFF', 'HEAD', 'CHEST', 'LEGS', 'FEET'],
    quickSlots: 5
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

console.log('[Constants] Game configuration loaded');