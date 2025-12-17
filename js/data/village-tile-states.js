// === js/data/village-tile-states.js ===
// THE BLEEDING EARTH: Village tile transformations per World State

// ============================================================================
// TILE STATE MAPPINGS
// ============================================================================

/**
 * Defines how village tiles transform based on World State
 * Each entry maps the base tile type to its appearance in each state
 */
const VILLAGE_TILE_STATES = {
    // Base tiles -> transformed versions
    grass: {
        1: { type: 'grass', color: '#228B22' },           // NORMAL: Lush green
        2: { type: 'grass_dead', color: '#8B8B7A' },      // ASH: Grey-green
        3: { type: 'grass_scorched', color: '#4A3B2A' },  // BURNING: Burnt brown
        4: { type: 'grass_scorched', color: '#3A2B1A' }   // ENDGAME: Darker
    },

    path: {
        1: { type: 'path', color: '#8B7355' },            // NORMAL: Dirt path
        2: { type: 'path_dusty', color: '#9B8B7B' },      // ASH: Ash-covered
        3: { type: 'path_cracked', color: '#6B5B4B' },    // BURNING: Cracked
        4: { type: 'path_cracked', color: '#5B4B3B' }
    },

    cobblestone: {
        1: { type: 'cobblestone', color: '#696969' },
        2: { type: 'cobblestone_dusty', color: '#7B7B7B' },
        3: { type: 'cobblestone_cracked', color: '#5B5B5B' },
        4: { type: 'cobblestone_cracked', color: '#4B4B4B' }
    },

    // Water features
    water: {
        1: { type: 'water', color: '#4169E1' },           // NORMAL: Blue
        2: { type: 'water_murky', color: '#5B5B6B' },     // ASH: Murky grey
        3: { type: 'water_heated', color: '#8B4513' },    // BURNING: Reddish-brown
        4: { type: 'water_lava', color: '#FF4500' }       // ENDGAME: Lava
    },

    // Fences deteriorate
    fence: {
        1: { type: 'fence', color: '#8B4513' },
        2: { type: 'fence_weathered', color: '#6B5B4B' },
        3: { type: 'fence_broken', color: '#5B4B3B' },
        4: { type: 'fence_broken', color: '#4B3B2B' }
    },

    // Walls can crack and crumble
    wall: {
        1: { type: 'wall', color: '#696969' },
        2: { type: 'wall', color: '#5B5B5B' },
        3: { type: 'wall_cracked', color: '#4B4B4B' },
        4: { type: 'wall_cracked', color: '#3B3B3B' }
    },

    // Floor tiles inside buildings
    floor: {
        1: { type: 'floor', color: '#DEB887' },
        2: { type: 'floor_dusty', color: '#C9A87B' },
        3: { type: 'floor_damaged', color: '#A98B6B' },
        4: { type: 'floor_damaged', color: '#8B7B5B' }
    }
};

// ============================================================================
// BUILDING STATE MAPPINGS
// ============================================================================

/**
 * Defines building appearance and functionality per World State
 */
const VILLAGE_BUILDING_STATES = {
    bank: {
        1: {
            status: 'intact',
            name: 'The Vault',
            color: '#4A4A4A',
            usable: true,
            npc: 'banker'
        },
        2: {
            status: 'dusty',
            name: 'The Vault',
            color: '#5A5A5A',
            usable: true,
            npc: 'banker'
        },
        3: {
            status: 'crushed',
            name: 'The Ruined Vault',
            color: '#3A3A3A',
            usable: false,        // Can't enter - crushed!
            npc: null,            // Grimwald is dead
            replacementInteraction: 'emergency_safe',
            description: 'A massive boulder has crushed the vault. Grimwald lies beneath the rubble.'
        },
        4: {
            status: 'crushed',
            name: 'The Ruined Vault',
            color: '#2A2A2A',
            usable: false,
            npc: null,
            replacementInteraction: 'emergency_safe'
        }
    },

    tavern: {
        1: { status: 'intact', name: 'The Weary Delver', color: '#654321', usable: true },
        2: { status: 'dusty', name: 'The Weary Delver', color: '#5A4321', usable: true },
        3: { status: 'damaged', name: 'The Weary Delver', color: '#4A3321', usable: true },
        4: { status: 'damaged', name: 'The Weary Delver', color: '#3A2321', usable: true }
    },

    smithy: {
        1: { status: 'intact', name: 'Ironforge Smithy', color: '#8B4513', usable: true },
        2: { status: 'intact', name: 'Ironforge Smithy', color: '#7B4513', usable: true },
        3: { status: 'working', name: 'Ironforge Smithy', color: '#6B3513', usable: true },
        4: { status: 'working', name: 'Ironforge Smithy', color: '#5B2513', usable: true }
    },

    shrine: {
        1: { status: 'intact', name: 'Shrine of Light', color: '#E6E6FA', usable: true },
        2: { status: 'dimmed', name: 'Shrine of Light', color: '#C6C6DA', usable: true },
        3: { status: 'flickering', name: 'Shrine of Fading Light', color: '#A6A6BA', usable: true },
        4: { status: 'dark', name: 'Shrine of Shadows', color: '#86869A', usable: true }
    },

    expedition_hall: {
        1: { status: 'intact', name: 'Expedition Hall', color: '#4B3621', usable: true },
        2: { status: 'busy', name: 'Expedition Hall', color: '#3B2621', usable: true },
        3: { status: 'frantic', name: 'Expedition Hall', color: '#2B1621', usable: true },
        4: { status: 'abandoned', name: 'Expedition Hall', color: '#1B0621', usable: true }
    },

    town_square: {
        1: { status: 'intact', name: 'Town Square', color: '#8B7355', usable: true },
        2: { status: 'tense', name: 'Town Square', color: '#7B6355', usable: true },
        3: { status: 'panicked', name: 'Town Square', color: '#6B5355', usable: true },
        4: { status: 'empty', name: 'Abandoned Square', color: '#5B4355', usable: true }
    },

    player_house: {
        1: { status: 'intact', name: 'Your Quarters', color: '#5D4E37', usable: true },
        2: { status: 'intact', name: 'Your Quarters', color: '#4D3E37', usable: true },
        3: { status: 'damaged', name: 'Your Quarters', color: '#3D2E37', usable: true },
        4: { status: 'damaged', name: 'Your Quarters', color: '#2D1E37', usable: true }
    },

    chasm_entrance: {
        1: { status: 'dormant', name: 'The Shifting Chasm', color: '#2F1810' },
        2: { status: 'smoking', name: 'The Shifting Chasm', color: '#3F2820' },
        3: { status: 'glowing', name: 'The Bleeding Chasm', color: '#4F3830' },
        4: { status: 'erupting', name: 'The Maw of Malphas', color: '#5F4840' }
    }
};

// ============================================================================
// ATMOSPHERE SETTINGS
// ============================================================================

/**
 * Atmosphere and visual overlay settings per World State
 */
const VILLAGE_ATMOSPHERE = {
    1: {  // NORMAL
        skyGradient: ['#87CEEB', '#E0F0FF'],  // Clear blue sky
        ambientLight: 1.0,
        screenTint: null,
        particles: null,
        groundShake: false
    },
    2: {  // ASH
        skyGradient: ['#8B8989', '#A9A9A9'],  // Grey overcast
        ambientLight: 0.85,
        screenTint: { r: 180, g: 180, b: 190, a: 0.12 },  // Slight grey
        particles: 'ashfall',
        particleDensity: 0.3,
        groundShake: false
    },
    3: {  // BURNING
        skyGradient: ['#4A3728', '#8B4513'],  // Orange-brown
        ambientLight: 0.7,
        screenTint: { r: 255, g: 140, b: 80, a: 0.2 },   // Orange tint
        particles: 'ember_rain',
        particleDensity: 0.6,
        smokeOverlay: true,
        smokeOpacity: 0.15,
        groundShake: true,
        shakeIntensity: 0.3
    },
    4: {  // ENDGAME
        skyGradient: ['#2A1A10', '#5B2B1B'],  // Dark red-brown
        ambientLight: 0.5,
        screenTint: { r: 255, g: 100, b: 50, a: 0.3 },   // Strong red-orange
        particles: 'ember_rain',
        particleDensity: 1.0,
        smokeOverlay: true,
        smokeOpacity: 0.25,
        groundShake: true,
        shakeIntensity: 0.6
    }
};

// ============================================================================
// RANDOM DAMAGE PATTERNS
// ============================================================================

/**
 * Chance of tiles showing damage effects per World State
 */
const VILLAGE_DAMAGE_CONFIG = {
    1: {
        crackChance: 0,
        rubbleChance: 0,
        fireChance: 0
    },
    2: {
        crackChance: 0.05,
        rubbleChance: 0,
        fireChance: 0
    },
    3: {
        crackChance: 0.15,
        rubbleChance: 0.05,
        fireChance: 0.02
    },
    4: {
        crackChance: 0.25,
        rubbleChance: 0.10,
        fireChance: 0.05
    }
};

// ============================================================================
// NPC BARKS (Floating text)
// ============================================================================

/**
 * Random phrases NPCs might say based on World State
 */
const VILLAGE_NPC_BARKS = {
    1: [
        "Fine day for delving!",
        "The Chasm provides.",
        "May your extraction be swift.",
        "Careful down there.",
        "The volcano sleeps..."
    ],
    2: [
        "The sky... it's grey again.",
        "I can taste the ash.",
        "The ground trembled last night.",
        "Something's wrong with the Peak.",
        "My children are frightened.",
        "The crops are wilting."
    ],
    3: [
        "The ground is shaking again!",
        "I can't breathe this ash!",
        "We should flee while we can!",
        "The Elders knew... they knew!",
        "Grimwald... the vault...",
        "The shrine's light is fading!",
        "It's getting hotter...",
        "FIRE! FIRE IN THE EAST!"
    ],
    4: [
        "It's too late for us...",
        "The hero has descended.",
        "May the Light protect them.",
        "This is the end...",
        "Only Malphas remains."
    ]
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get transformed tile data for a base tile type and world state
 * @param {string} baseTileType - Original tile type
 * @param {number} worldState - Current world state (1-4)
 * @returns {Object} Transformed tile properties
 */
function getTransformedTile(baseTileType, worldState) {
    const stateData = VILLAGE_TILE_STATES[baseTileType];
    if (stateData && stateData[worldState]) {
        return { ...stateData[worldState] };
    }
    // Return original if no transformation defined
    return { type: baseTileType };
}

/**
 * Get building state for a building ID and world state
 * @param {string} buildingId
 * @param {number} worldState
 * @returns {Object} Building state properties
 */
function getBuildingState(buildingId, worldState) {
    const stateData = VILLAGE_BUILDING_STATES[buildingId];
    if (stateData && stateData[worldState]) {
        return { ...stateData[worldState] };
    }
    return { status: 'intact', usable: true };
}

/**
 * Get random NPC bark for current world state
 * @param {number} worldState
 * @returns {string}
 */
function getRandomBark(worldState) {
    const barks = VILLAGE_NPC_BARKS[worldState] || VILLAGE_NPC_BARKS[1];
    return barks[Math.floor(Math.random() * barks.length)];
}

/**
 * Get atmosphere settings for current world state
 * @param {number} worldState
 * @returns {Object}
 */
function getAtmosphereSettings(worldState) {
    return VILLAGE_ATMOSPHERE[worldState] || VILLAGE_ATMOSPHERE[1];
}

/**
 * Get damage configuration for current world state
 * @param {number} worldState
 * @returns {Object}
 */
function getDamageConfig(worldState) {
    return VILLAGE_DAMAGE_CONFIG[worldState] || VILLAGE_DAMAGE_CONFIG[1];
}

// ============================================================================
// EXPORTS
// ============================================================================

window.VILLAGE_TILE_STATES = VILLAGE_TILE_STATES;
window.VILLAGE_BUILDING_STATES = VILLAGE_BUILDING_STATES;
window.VILLAGE_ATMOSPHERE = VILLAGE_ATMOSPHERE;
window.VILLAGE_DAMAGE_CONFIG = VILLAGE_DAMAGE_CONFIG;
window.VILLAGE_NPC_BARKS = VILLAGE_NPC_BARKS;

window.getTransformedTile = getTransformedTile;
window.getBuildingState = getBuildingState;
window.getRandomBark = getRandomBark;
window.getAtmosphereSettings = getAtmosphereSettings;
window.getDamageConfig = getDamageConfig;

console.log('[VillageTileStates] Village state data loaded');
