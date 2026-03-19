// ============================================================================
// TILE THEME CONFIGURATION
// ============================================================================
// Maps room themes to procedural tile sets for consistent visual theming.
// Each room theme is associated with specific floor, wall, and hazard tiles.
// ============================================================================

const TILE_THEME_CONFIG = {
    // ========================================================================
    // VOLCANIC / FIRE THEMES
    // ========================================================================

    'volcanic_chamber': {
        tileTheme: 'volcanic',
        floor: 'volcanic_floor',
        floorVariants: ['volcanic_floor', 'volcanic_floor_v2', 'volcanic_floor_cracked', 'volcanic_floor_cracked_v2'],
        wall: 'obsidian_wall',
        wallVariants: ['obsidian_wall'],
        corners: {
            nw: 'wall_corner_nw',
            ne: 'wall_corner_ne',
            sw: 'wall_corner_sw',
            se: 'wall_corner_se'
        },
        hazard: 'lava_pool',
        ambient: 'warm'
    },

    'obsidian_halls': {
        tileTheme: 'volcanic',
        floor: 'volcanic_floor',
        floorVariants: ['volcanic_floor', 'volcanic_floor_v2'],
        wall: 'obsidian_wall',
        wallVariants: ['obsidian_wall'],
        corners: {
            nw: 'wall_corner_nw',
            ne: 'wall_corner_ne',
            sw: 'wall_corner_sw',
            se: 'wall_corner_se'
        },
        hazard: 'lava_pool',
        ambient: 'dark'
    },

    'ashen_wastes': {
        tileTheme: 'volcanic',
        floor: 'volcanic_floor',
        floorVariants: ['volcanic_floor', 'volcanic_floor_v2', 'volcanic_floor_cracked'],
        wall: 'obsidian_wall',
        wallVariants: ['obsidian_wall'],
        corners: {
            nw: 'wall_corner_nw',
            ne: 'wall_corner_ne',
            sw: 'wall_corner_sw',
            se: 'wall_corner_se'
        },
        hazard: null,
        ambient: 'smoky'
    },

    'molten_forge': {
        tileTheme: 'volcanic',
        floor: 'volcanic_floor_cracked',
        floorVariants: ['volcanic_floor_cracked', 'volcanic_floor_cracked_v2', 'volcanic_floor', 'volcanic_floor_v2'],
        wall: 'obsidian_wall',
        wallVariants: ['obsidian_wall'],
        corners: {
            nw: 'wall_corner_nw',
            ne: 'wall_corner_ne',
            sw: 'wall_corner_sw',
            se: 'wall_corner_se'
        },
        hazard: 'lava_pool',
        ambient: 'hot'
    },

    // ========================================================================
    // ICE / FROZEN THEMES
    // ========================================================================

    'ice_cave': {
        tileTheme: 'frozen',
        floor: 'frozen_floor',
        floorVariants: ['frozen_floor', 'frozen_floor_v2', 'ice_floor', 'ice_floor_v2'],
        wall: 'ice_wall',
        wallVariants: ['ice_wall'],
        corners: {
            nw: 'wall_corner_nw',
            ne: 'wall_corner_ne',
            sw: 'wall_corner_sw',
            se: 'wall_corner_se'
        },
        hazard: 'shallow_water',
        ambient: 'cold'
    },

    // ========================================================================
    // DEATH / UNDEAD THEMES
    // ========================================================================

    'ancient_crypt': {
        tileTheme: 'catacombs',
        floor: 'tomb_floor',
        floorVariants: ['tomb_floor', 'tomb_floor_v2', 'tomb_floor_bones', 'tomb_floor_bones_v2'],
        wall: 'crypt_wall',
        wallVariants: ['crypt_wall'],
        corners: {
            nw: 'wall_corner_nw',
            ne: 'wall_corner_ne',
            sw: 'wall_corner_sw',
            se: 'wall_corner_se'
        },
        hazard: null,
        ambient: 'musty'
    },

    'bone_pit': {
        tileTheme: 'catacombs',
        floor: 'tomb_floor_bones',
        floorVariants: ['tomb_floor_bones', 'tomb_floor_bones_v2', 'tomb_floor', 'tomb_floor_v2'],
        wall: 'crypt_wall',
        wallVariants: ['crypt_wall'],
        corners: {
            nw: 'wall_corner_nw',
            ne: 'wall_corner_ne',
            sw: 'wall_corner_sw',
            se: 'wall_corner_se'
        },
        hazard: null,
        ambient: 'deathly'
    },

    // ========================================================================
    // EARTH / CAVE THEMES
    // ========================================================================

    'crystal_caves': {
        tileTheme: 'crystal',
        floor: 'cave_floor',
        floorVariants: ['cave_floor', 'cave_floor_v2'],
        wall: 'crystal_wall',
        wallVariants: ['crystal_wall'],
        corners: {
            nw: 'wall_corner_nw',
            ne: 'wall_corner_ne',
            sw: 'wall_corner_sw',
            se: 'wall_corner_se'
        },
        decoration: 'crystal_formation',
        hazard: null,
        ambient: 'glowing'
    },

    'fungal_cavern': {
        tileTheme: 'crystal',
        floor: 'cave_floor',
        floorVariants: ['cave_floor', 'cave_floor_v2'],
        wall: 'crystal_wall',
        wallVariants: ['crystal_wall'],
        corners: {
            nw: 'wall_corner_nw',
            ne: 'wall_corner_ne',
            sw: 'wall_corner_sw',
            se: 'wall_corner_se'
        },
        hazard: null,
        ambient: 'spore'
    },

    // ========================================================================
    // SHADOW / VOID THEMES
    // ========================================================================

    'shadow_realm': {
        tileTheme: 'shadow',
        floor: 'void_floor',
        floorVariants: ['void_floor', 'void_floor_v2'],
        wall: 'shadow_wall',
        wallVariants: ['shadow_wall'],
        corners: {
            nw: 'wall_corner_nw',
            ne: 'wall_corner_ne',
            sw: 'wall_corner_sw',
            se: 'wall_corner_se'
        },
        hazard: 'void_rift',
        ambient: 'eldritch'
    },

    // ========================================================================
    // HOLY / TEMPLE THEMES
    // ========================================================================

    'ruined_temple': {
        tileTheme: 'temple',
        floor: 'marble_floor',
        floorVariants: ['marble_floor', 'marble_floor_v2', 'marble_floor_gold', 'marble_floor_gold_v2'],
        wall: 'temple_wall',
        wallVariants: ['temple_wall'],
        corners: {
            nw: 'wall_corner_nw',
            ne: 'wall_corner_ne',
            sw: 'wall_corner_sw',
            se: 'wall_corner_se'
        },
        hazard: null,
        ambient: 'sacred'
    },

    // ========================================================================
    // WATER / FLOODED THEMES
    // ========================================================================

    'flooded_depths': {
        tileTheme: 'sunken',
        floor: 'stone_floor',
        floorVariants: ['stone_floor', 'stone_floor_v2', 'stone_floor_v3', 'stone_floor_v4', 'stone_floor_worn', 'stone_floor_worn_v2'],
        wall: 'brick_wall_mossy',
        wallVariants: ['brick_wall_mossy'],
        corners: {
            nw: 'wall_corner_nw',
            ne: 'wall_corner_ne',
            sw: 'wall_corner_sw',
            se: 'wall_corner_se'
        },
        hazard: 'shallow_water',
        ambient: 'damp'
    },

    // ========================================================================
    // DEFAULT / NEUTRAL THEME
    // ========================================================================

    'default': {
        tileTheme: 'dungeon',
        floor: 'stone_floor',
        floorVariants: ['stone_floor', 'stone_floor_v2', 'stone_floor_v3', 'stone_floor_v4', 'stone_floor_worn', 'stone_floor_worn_v2', 'stone_floor_dirty', 'stone_floor_dirty_v2'],
        wall: 'brick_wall',
        wallVariants: ['brick_wall', 'brick_wall_mossy'],
        corners: {
            nw: 'wall_corner_nw',
            ne: 'wall_corner_ne',
            sw: 'wall_corner_sw',
            se: 'wall_corner_se'
        },
        hazard: null,
        ambient: 'neutral'
    }
};

// ============================================================================
// CORRIDOR THEME (Always neutral to blend between rooms)
// ============================================================================

const CORRIDOR_TILE_THEME = {
    tileTheme: 'dungeon',
    floor: 'stone_floor',
    floorVariants: ['stone_floor', 'stone_floor_v2', 'stone_floor_v3', 'stone_floor_v4', 'stone_floor_worn', 'stone_floor_worn_v2'],
    wall: 'stone_wall',
    wallVariants: ['stone_wall'],
    corners: {
        nw: 'wall_corner_nw',
        ne: 'wall_corner_ne',
        sw: 'wall_corner_sw',
        se: 'wall_corner_se'
    }
};

// ============================================================================
// SPECIAL TILES (Doors, Stairs, Interactive)
// ============================================================================

const SPECIAL_TILES = {
    door: {
        closed: 'door_closed',
        open: 'door_open'
    },
    stairs: {
        up: 'stairs_up',
        down: 'stairs_down'
    },
    interactive: {
        pressure_plate: 'pressure_plate',
        chest: 'chest_closed'
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get the tile theme configuration for a room theme
 * @param {string} roomTheme - The room's theme name
 * @returns {Object} Tile theme configuration
 */
function getTileThemeConfig(roomTheme) {
    return TILE_THEME_CONFIG[roomTheme] || TILE_THEME_CONFIG.default;
}

/**
 * Simple hash function for better pseudo-random distribution
 * @param {number} x - X position
 * @param {number} y - Y position
 * @returns {number} Hash value
 */
function positionHash(x, y) {
    // Use prime multipliers for better distribution
    let h = x * 374761393 + y * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    h = h ^ (h >> 16);
    return Math.abs(h);
}

/**
 * Get a floor tile name for a given theme and position
 * Uses position-based hash for natural-looking variation
 * @param {string} roomTheme - The room's theme name
 * @param {number} x - Grid X position
 * @param {number} y - Grid Y position
 * @returns {string} Tile sprite name
 */
function getFloorTileNameForTheme(roomTheme, x, y) {
    const config = getTileThemeConfig(roomTheme);
    const variants = config.floorVariants || [config.floor];

    // Use hash for better pseudo-random distribution
    const hash = positionHash(x, y);
    const index = hash % variants.length;
    return variants[index];
}

/**
 * Get a wall tile name for a given theme
 * @param {string} roomTheme - The room's theme name
 * @param {number} x - Grid X position (for variation)
 * @param {number} y - Grid Y position (for variation)
 * @returns {string} Tile sprite name
 */
function getWallTileNameForTheme(roomTheme, x, y) {
    const config = getTileThemeConfig(roomTheme);
    const variants = config.wallVariants || [config.wall];

    // Use hash for wall variation (still less variation than floors)
    const hash = positionHash(x + 1000, y + 1000);  // Offset to differ from floor pattern
    const index = hash % variants.length;
    return variants[index];
}

/**
 * Get the corner tile name for a specific corner position
 * @param {string} roomTheme - The room's theme name
 * @param {string} cornerPosition - 'nw', 'ne', 'sw', or 'se'
 * @returns {string} Corner tile sprite name
 */
function getCornerTileNameForTheme(roomTheme, cornerPosition) {
    const config = getTileThemeConfig(roomTheme);
    if (config.corners && config.corners[cornerPosition]) {
        return config.corners[cornerPosition];
    }
    // Fallback to default corners
    return TILE_THEME_CONFIG.default.corners[cornerPosition];
}

/**
 * Check if a theme has a hazard tile
 * @param {string} roomTheme - The room's theme name
 * @returns {string|null} Hazard tile name or null
 */
function getHazardTileForTheme(roomTheme) {
    const config = getTileThemeConfig(roomTheme);
    return config.hazard || null;
}

/**
 * Get corridor tile configuration
 * @returns {Object} Corridor tile theme config
 */
function getCorridorTileTheme() {
    return CORRIDOR_TILE_THEME;
}

// ============================================================================
// EXPORTS
// ============================================================================

window.TILE_THEME_CONFIG = TILE_THEME_CONFIG;
window.CORRIDOR_TILE_THEME = CORRIDOR_TILE_THEME;
window.SPECIAL_TILES = SPECIAL_TILES;
window.getTileThemeConfig = getTileThemeConfig;
window.getFloorTileNameForTheme = getFloorTileNameForTheme;
window.getWallTileNameForTheme = getWallTileNameForTheme;
window.getCornerTileNameForTheme = getCornerTileNameForTheme;
window.getHazardTileForTheme = getHazardTileForTheme;
window.getCorridorTileTheme = getCorridorTileTheme;
window.positionHash = positionHash;  // Expose for tile variation

console.log('[TileThemeConfig] Loaded with', Object.keys(TILE_THEME_CONFIG).length, 'theme mappings');
