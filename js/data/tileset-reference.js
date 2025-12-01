// ============================================================================
// TILESET REFERENCE - Sprite coordinate mappings
// ============================================================================
// File: walls_floor.png
// Tile Size: 16x16 pixels
// Grid: 8 columns × 16 rows
// ============================================================================

const TILESET = {
    // ========================================================================
    // DARK STONE THEME (Rows 0-1)
    // ========================================================================
    DARK_STONE: {
        // Floor Tiles (Row 0)
        floor_solid: { row: 0, col: 0 },
        floor_cracked_1: { row: 0, col: 1 },
        floor_cracked_2: { row: 0, col: 2 },
        floor_detailed: { row: 0, col: 3 },
        
        // Wall Tops (Row 0, right side)
        wall_top_left: { row: 0, col: 4 },
        wall_top_center: { row: 0, col: 5 },
        wall_top_right: { row: 0, col: 6 },
        wall_top_single: { row: 0, col: 7 },
        
        // Wall Sides (Row 1)
        wall_left: { row: 1, col: 0 },
        wall_center: { row: 1, col: 1 },
        wall_right: { row: 1, col: 2 },
        wall_decorated: { row: 1, col: 3 },
        
        // Inner Corners & Details (Row 1, right)
        inner_corner_tl: { row: 1, col: 4 },
        inner_corner_tr: { row: 1, col: 5 },
        inner_corner_bl: { row: 1, col: 6 },
        inner_corner_br: { row: 1, col: 7 }
    },
    
    // ========================================================================
    // LIGHT STONE THEME (Rows 2-3)
    // ========================================================================
    LIGHT_STONE: {
        // Floor Tiles (Row 2)
        floor_clean: { row: 2, col: 0 },
        floor_worn_1: { row: 2, col: 1 },
        floor_worn_2: { row: 2, col: 2 },
        floor_checkered: { row: 2, col: 3 },
        
        // Wall Components (Row 2, right)
        wall_top_left: { row: 2, col: 4 },
        wall_top_center: { row: 2, col: 5 },
        wall_top_right: { row: 2, col: 6 },
        wall_segment: { row: 2, col: 7 },
        
        // Wall Sides (Row 3)
        wall_left: { row: 3, col: 0 },
        wall_center_plain: { row: 3, col: 1 },
        wall_center_brick: { row: 3, col: 2 },
        wall_right: { row: 3, col: 3 },
        
        // Additional (Row 3, right)
        inner_corner_tl: { row: 3, col: 4 },
        inner_corner_tr: { row: 3, col: 5 },
        inner_corner_bl: { row: 3, col: 6 },
        inner_corner_br: { row: 3, col: 7 }
    },
    
    // ========================================================================
    // BLUE/GRAY STONE (Rows 4-5)
    // ========================================================================
    BLUE_STONE: {
        // Large floor tiles (Row 4)
        floor_large_1: { row: 4, col: 0 },
        floor_large_2: { row: 4, col: 1 },
        floor_large_3: { row: 4, col: 2 },
        floor_large_4: { row: 4, col: 3 },
        
        // Wall pieces (Row 4-5)
        wall_top_left: { row: 4, col: 4 },
        wall_top_center: { row: 4, col: 5 },
        wall_top_right: { row: 4, col: 6 },
        wall_top_single: { row: 4, col: 7 },
        
        wall_left: { row: 5, col: 0 },
        wall_center: { row: 5, col: 1 },
        wall_right: { row: 5, col: 2 },
        wall_bottom: { row: 5, col: 3 }
    },
    
    // ========================================================================
    // DARK GRAY THEME (Rows 6-7)
    // ========================================================================
    DARK_GRAY: {
        // Floor variations (Row 6)
        floor_smooth: { row: 6, col: 0 },
        floor_rough: { row: 6, col: 1 },
        floor_mossy: { row: 6, col: 2 },
        floor_cracked: { row: 6, col: 3 },
        
        // Wall components (Row 6-7)
        wall_block_1: { row: 6, col: 4 },
        wall_block_2: { row: 6, col: 5 },
        wall_block_3: { row: 6, col: 6 },
        wall_pillar: { row: 6, col: 7 },
        
        wall_left: { row: 7, col: 0 },
        wall_center: { row: 7, col: 1 },
        wall_right: { row: 7, col: 2 },
        wall_decorated: { row: 7, col: 3 }
    },
    
    // ========================================================================
    // PURPLE/DARK STONE (Rows 8-9)
    // ========================================================================
    PURPLE_STONE: {
        // Floor tiles (Row 8)
        floor_dark_1: { row: 8, col: 0 },
        floor_dark_2: { row: 8, col: 1 },
        floor_dark_3: { row: 8, col: 2 },
        floor_dark_4: { row: 8, col: 3 },
        
        // Wall pieces (Row 8-9)
        wall_top_ornate: { row: 8, col: 4 },
        wall_top_plain: { row: 8, col: 5 },
        wall_top_detailed: { row: 8, col: 6 },
        wall_top_corner: { row: 8, col: 7 },
        
        wall_mid_ornate: { row: 9, col: 0 },
        wall_mid_plain: { row: 9, col: 1 },
        wall_mid_detailed: { row: 9, col: 2 },
        wall_mid_corner: { row: 9, col: 3 }
    },
    
    // ========================================================================
    // BRICK PATTERNS (Rows 10-11)
    // ========================================================================
    BRICK: {
        // Various brick patterns
        brick_dark_1: { row: 10, col: 0 },
        brick_dark_2: { row: 10, col: 1 },
        brick_light_1: { row: 10, col: 2 },
        brick_light_2: { row: 10, col: 3 },
        brick_red_1: { row: 10, col: 4 },
        brick_red_2: { row: 10, col: 5 },
        brick_worn: { row: 10, col: 6 },
        brick_cracked: { row: 10, col: 7 },
        
        brick_damaged: { row: 11, col: 0 },
        brick_mossy: { row: 11, col: 1 },
        brick_wet: { row: 11, col: 2 },
        brick_burnt: { row: 11, col: 3 }
    },
    
    // ========================================================================
    // DECORATIVE ELEMENTS (Rows 12-15)
    // ========================================================================
    DECORATIVE: {
        // Arches (Row 12)
        arch_top_left: { row: 12, col: 0 },
        arch_top_center: { row: 12, col: 1 },
        arch_top_right: { row: 12, col: 2 },
        arch_bottom: { row: 12, col: 3 },
        
        // Doors (Row 12-13)
        door_wooden_closed: { row: 12, col: 4 },
        door_wooden_open: { row: 12, col: 5 },
        door_metal_closed: { row: 12, col: 6 },
        door_metal_open: { row: 12, col: 7 },
        
        door_ornate_closed: { row: 13, col: 0 },
        door_ornate_open: { row: 13, col: 1 },
        door_secret: { row: 13, col: 2 },
        door_broken: { row: 13, col: 3 },
        
        // Door frames (Row 13-14)
        doorframe_top: { row: 13, col: 4 },
        doorframe_left: { row: 13, col: 5 },
        doorframe_right: { row: 13, col: 6 },
        doorframe_bottom: { row: 13, col: 7 },
        
        // Stone arches (Row 14)
        arch_stone_left: { row: 14, col: 0 },
        arch_stone_center: { row: 14, col: 1 },
        arch_stone_right: { row: 14, col: 2 },
        arch_stone_pillar: { row: 14, col: 3 },
        
        // Misc decorations (Row 14-15)
        pillar_top: { row: 14, col: 4 },
        pillar_mid: { row: 14, col: 5 },
        pillar_bottom: { row: 14, col: 6 },
        pillar_broken: { row: 14, col: 7 },
        
        torch_lit: { row: 15, col: 0 },
        torch_unlit: { row: 15, col: 1 },
        brazier_lit: { row: 15, col: 2 },
        brazier_unlit: { row: 15, col: 3 },
        
        chest_closed: { row: 15, col: 4 },
        chest_open: { row: 15, col: 5 },
        barrel: { row: 15, col: 6 },
        crate: { row: 15, col: 7 }
    },
    
    // ========================================================================
    // SPECIAL TILES
    // ========================================================================
    SPECIAL: {
        void: { row: 0, col: 0 },           // Black/empty
        stairs_down: { row: 15, col: 0 },
        stairs_up: { row: 15, col: 1 },
        trap_inactive: { row: 15, col: 2 },
        trap_active: { row: 15, col: 3 },
        portal: { row: 15, col: 4 },
        shrine: { row: 15, col: 5 },
        altar: { row: 15, col: 6 },
        fountain: { row: 15, col: 7 }
    }
};

// ============================================================================
// THEME TO TILESET MAPPING
// ============================================================================

const THEME_TILESET_MAP = {
    'volcanic_chamber': 'DARK_STONE',
    'ancient_crypt': 'PURPLE_STONE',
    'ruined_temple': 'LIGHT_STONE',
    'fungal_cavern': 'DARK_GRAY',
    'obsidian_halls': 'DARK_STONE',
    'ashen_wastes': 'DARK_GRAY',
    'molten_forge': 'BRICK',
    'flooded_depths': 'BLUE_STONE',
    'shadow_realm': 'PURPLE_STONE',
    'crystal_caves': 'BLUE_STONE',
    'bone_pit': 'DARK_GRAY'
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Draw a tile from the spritesheet
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Image} tileset - The loaded tileset image
 * @param {Object} tile - Tile object with {row, col}
 * @param {number} x - Screen X position
 * @param {number} y - Screen Y position
 * @param {number} size - Size to draw the tile (scales from 16x16)
 */
function drawTile(ctx, tileset, tile, x, y, size = 16) {
    if (!tile || tile.row === undefined || tile.col === undefined) {
        console.warn('Invalid tile:', tile);
        return;
    }
    
    ctx.drawImage(
        tileset,
        tile.col * 16,  // Source X
        tile.row * 16,  // Source Y
        16,             // Source Width
        16,             // Source Height
        x,              // Destination X
        y,              // Destination Y
        size,           // Destination Width
        size            // Destination Height
    );
}

/**
 * Get tileset for a room theme
 * @param {string} themeName - Theme name from ROOM_THEMES
 * @returns {Object} Tileset object
 */
function getTilesetForTheme(themeName) {
    const tilesetName = THEME_TILESET_MAP[themeName] || 'DARK_STONE';
    return TILESET[tilesetName];
}

/**
 * Get random floor tile for a theme
 * @param {string} themeName - Theme name
 * @returns {Object} Tile object with {row, col}
 */
function getRandomFloorTile(themeName) {
    const tilesetName = THEME_TILESET_MAP[themeName] || 'DARK_STONE';
    const tileset = TILESET[tilesetName];
    
    // Get all floor tiles from the tileset
    const floorTiles = Object.entries(tileset)
        .filter(([key]) => key.startsWith('floor'))
        .map(([, value]) => value);
    
    if (floorTiles.length === 0) {
        return tileset.floor_solid || { row: 0, col: 0 };
    }
    
    return floorTiles[Math.floor(Math.random() * floorTiles.length)];
}

/**
 * Get wall tile based on position context
 * @param {string} themeName - Theme name
 * @param {string} position - 'top', 'left', 'right', 'center', 'corner_tl', etc.
 * @returns {Object} Tile object with {row, col}
 */
function getWallTile(themeName, position) {
    const tilesetName = THEME_TILESET_MAP[themeName] || 'DARK_STONE';
    const tileset = TILESET[tilesetName];
    
    const positionMap = {
        'top': tileset.wall_top_center || tileset.wall_center,
        'top_left': tileset.wall_top_left,
        'top_right': tileset.wall_top_right,
        'left': tileset.wall_left,
        'right': tileset.wall_right,
        'center': tileset.wall_center,
        'corner_tl': tileset.inner_corner_tl,
        'corner_tr': tileset.inner_corner_tr,
        'corner_bl': tileset.inner_corner_bl,
        'corner_br': tileset.inner_corner_br
    };
    
    return positionMap[position] || tileset.wall_center || { row: 1, col: 1 };
}

// ============================================================================
// WALL BUILDING PATTERNS
// ============================================================================

const WALL_PATTERNS = {
    // Horizontal wall (left to right)
    horizontal: ['wall_top_left', 'wall_top_center', 'wall_top_right'],
    
    // Vertical wall (top to bottom)
    vertical: ['wall_top_left', 'wall_left', 'wall_left'],
    
    // Complete room walls
    room: {
        topLeft: 'wall_top_left',
        top: 'wall_top_center',
        topRight: 'wall_top_right',
        left: 'wall_left',
        center: 'floor_solid',
        right: 'wall_right',
        bottomLeft: 'inner_corner_bl',
        bottom: 'wall_center',
        bottomRight: 'inner_corner_br'
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.TILESET = TILESET;
window.THEME_TILESET_MAP = THEME_TILESET_MAP;
window.drawTile = drawTile;
window.getTilesetForTheme = getTilesetForTheme;
window.getRandomFloorTile = getRandomFloorTile;
window.getWallTile = getWallTile;
window.WALL_PATTERNS = WALL_PATTERNS;

console.log('[Tileset] Reference loaded with', Object.keys(TILESET).length, 'tile themes');