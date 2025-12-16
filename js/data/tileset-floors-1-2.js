// ============================================================================
// TILESET REFERENCE - Floors 1-2: Stone Dungeon & Upper Depths
// ============================================================================
// File: dungeon_upper.png
// Tile Size: 32x32 pixels
// Image Size: 2816 x 1536 pixels (88 cols x 48 rows)
// Based on reference image with stone dungeon, props, and decorations
// ============================================================================

const TILESET_FLOORS_1_2 = {
    // Spritesheet file path
    spritesheet: 'assets/spritesheet/dungeon_upper.png',
    tileSize: 32,

    // ========================================================================
    // STONE DUNGEON WALLS (Row 0)
    // Grey brick walls with various textures and doorways
    // ========================================================================
    STONE_WALLS: {
        // Basic wall variations
        wall_brick_clean1: { row: 0, col: 5 },
        wall_brick_clean2: { row: 0, col: 13 },
        wall_brick_clean3: { row: 0, col: 16 },
        wall_brick_clean4: { row: 0, col: 20 },
        wall_brick_clean5: { row: 0, col: 21 },
        wall_brick_clean6: { row: 0, col: 22 },
        wall_brick_clean7: { row: 8, col: 4 },
        wall_brick_clean8: { row: 8, col: 13 },
	wall_brick_rock: { row: 0, col: 4},
        wall_brick_cracked1: { row: 8, col: 9 },
        wall_brick_cracked2: { row: 8, col: 14 },
        wall_brick_cracked3: { row: 4, col: 21 },
        wall_brick_cracked4: { row: 8, col: 5 },
        wall_brick_decorative: { row: 9, col: 14 },

        // Wall tops and edges
        wall_top_left: { row: 2, col: 2 },
        wall_bottom_left: { row: 3, col: 2 },
        wall_top_center: { row: 6, col: 21 },
        wall_bottom_center: { row: 2, col: 8 },
        wall_top_right: { row: 2, col: 3 },
        wall_bottom_right: { row: 3, col: 3 },
    },

    // ========================================================================
    // FLOOR TILES - STONE (Row 2)
    // Various stone floor patterns
    // ========================================================================
    STONE_FLOORS: {
        floor_dirt1: { row: 5, col: 0 },
        floor_dirt2: { row: 5, col: 1 },
        floor_dirt3: { row: 10, col: 0 },
        floor_dirt4: { row: 10, col: 1 },
        floor_dirt5: { row: 9, col: 0 },
        floor_dirt6: { row: 9, col: 1 },
        floor_stone1: { row: 3, col: 0 },
        floor_stone2: { row: 3, col: 1 },
        floor_stone3: { row: 2, col: 1 },
        floor_stone4: { row: 2, col: 0 },
    },

    },

    // ========================================================================
    // CRYSTAL DECORATIONS (Row 5)
    // Blue and purple crystal formations
    // ========================================================================
    CRYSTALS: {
        crystal_blue_medium: { row: 4, col: 2 },
        crystal_blue_small: { row: 4, col: 9 },

        crystal_purple_small: { row: 4, col: 17 },
        crystal_purple_medium: { row: 4, col: 3 },

        // Mixed crystal formations
        crystal_mixed_1: { row: 4, col: 11 },
    },

    // ========================================================================
    // LAVA CRACK OVERLAYS (Row 6)
    // Progressive damage/corruption patterns
    // ========================================================================
    LAVA_CRACKS: {
        crack_lava_light: { row: 6, col: 17 },
        crack_lava_medium: { row: 5, col: 18 },

    },

    // ========================================================================
    // PROPS - LIGHTING (Row 8)
    // Lanterns and light sources
    // ========================================================================
    PROPS_LIGHTING: {
        torch_wall_lit: { row: 8, col: 6 },

    },

    // ========================================================================
    // PROPS - STRUCTURAL (Row 9)
    // Pillars, supports, chains
    // ========================================================================
    PROPS_STRUCTURAL: {
        rope_coiled: { row: 8, col: 8 }
    },

// ============================================================================
// FLOOR 1-2 ROOM THEMES
// ============================================================================

const FLOOR_1_2_THEMES = {
    // Floor 1 themes (easier, more lit areas)
    'abandoned_mine': {
        name: 'Abandoned Mine',
        walls: 'STONE_WALLS',
        floors: ['STONE_FLOORS', 'EARTH_FLOORS'],
        props: ['PROPS_MINING', 'PROPS_STORAGE', 'PROPS_LIGHTING'],
        floorVariants: ['floor_stone_worn', 'floor_dirt_1', 'floor_dirt_2'],
        wallVariants: ['wall_brick_clean', 'wall_brick_cracked'],
        monsters: ['Cave Bat', 'Stone Lurker', 'Giant Rat']
    },

    'dungeon_entrance': {
        name: 'Dungeon Entrance',
        walls: 'STONE_WALLS',
        floors: ['STONE_FLOORS'],
        props: ['PROPS_STORAGE', 'PROPS_LIGHTING', 'PROPS_REMAINS'],
        floorVariants: ['floor_stone_clean', 'floor_stone_cracked', 'floor_large_tile_1'],
        wallVariants: ['wall_brick_clean', 'wall_brick_mossy'],
        monsters: ['Skeletal Warrior', 'Giant Rat', 'Cave Bat']
    },

    'storage_chamber': {
        name: 'Storage Chamber',
        walls: 'STONE_WALLS',
        floors: ['STONE_FLOORS'],
        props: ['PROPS_STORAGE', 'PROPS_LIGHTING'],
        floorVariants: ['floor_stone_clean', 'floor_detailed_1'],
        wallVariants: ['wall_brick_clean'],
        monsters: ['Giant Rat', 'Cave Spider']
    },

    // Floor 2 themes (darker, more dangerous)
    'prison_block': {
        name: 'Prison Block',
        walls: 'STONE_WALLS',
        floors: ['STONE_FLOORS'],
        props: ['PROPS_PRISON', 'PROPS_REMAINS', 'PROPS_LIGHTING'],
        floorVariants: ['floor_stone_worn', 'floor_stone_cracked'],
        wallVariants: ['wall_brick_damaged', 'wall_brick_mossy'],
        monsters: ['Skeletal Warrior', 'Phantom', 'Tortured Spirit']
    },

    'crystal_vein': {
        name: 'Crystal Vein',
        walls: 'STONE_WALLS',
        floors: ['STONE_FLOORS', 'EARTH_FLOORS'],
        props: ['PROPS_MINING', 'PROPS_LIGHTING'],
        decorations: ['CRYSTALS'],
        floorVariants: ['floor_stone_clean', 'floor_earth_rocky'],
        wallVariants: ['wall_brick_clean', 'wall_brick_cracked'],
        monsters: ['Crystal Spider', 'Stone Lurker', 'Cave Bat']
    },

    'collapsed_tunnel': {
        name: 'Collapsed Tunnel',
        walls: 'STONE_WALLS',
        floors: ['EARTH_FLOORS'],
        props: ['PROPS_REMAINS', 'PROPS_STRUCTURAL'],
        hazards: ['PITS'],
        floorVariants: ['floor_dirt_1', 'floor_earth_rocky', 'floor_mud'],
        wallVariants: ['wall_brick_damaged', 'wall_brick_cracked'],
        monsters: ['Giant Rat', 'Cave Spider', 'Stone Lurker']
    },

    'corrupted_chamber': {
        name: 'Corrupted Chamber',
        walls: 'STONE_WALLS',
        floors: ['STONE_FLOORS'],
        props: ['PROPS_REMAINS', 'PROPS_LIGHTING'],
        decorations: ['LAVA_CRACKS'],
        floorVariants: ['floor_stone_cracked', 'floor_stone_worn'],
        wallVariants: ['wall_brick_damaged', 'wall_brick_cracked'],
        monsters: ['Ash Walker', 'Corrupted Rat', 'Void Touched']
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a random floor tile for a Floor 1-2 theme
 */
function getFloor12FloorTile(themeName, x, y) {
    const theme = FLOOR_1_2_THEMES[themeName];
    if (!theme) return TILESET_FLOORS_1_2.STONE_FLOORS.floor_stone_clean;

    const variants = theme.floorVariants || ['floor_stone_clean'];
    const seed = (x * 7 + y * 13) % variants.length;
    const tileName = variants[seed];

    // Find the tile in the appropriate category
    for (const category of theme.floors || ['STONE_FLOORS']) {
        const tiles = TILESET_FLOORS_1_2[category];
        if (tiles && tiles[tileName]) {
            return tiles[tileName];
        }
    }

    return TILESET_FLOORS_1_2.STONE_FLOORS.floor_stone_clean;
}

/**
 * Get a wall tile for a Floor 1-2 theme
 */
function getFloor12WallTile(themeName, position) {
    const walls = TILESET_FLOORS_1_2.STONE_WALLS;
    const wallsLower = TILESET_FLOORS_1_2.STONE_WALLS_LOWER;

    const positionMap = {
        'top_left': walls.wall_top_left,
        'top': walls.wall_top_center,
        'top_right': walls.wall_top_right,
        'left': wallsLower.wall_left,
        'center': wallsLower.wall_center,
        'right': wallsLower.wall_right,
        'bottom': wallsLower.wall_bottom,
        'corner_tl': wallsLower.inner_corner_tl,
        'corner_tr': wallsLower.inner_corner_tr,
        'corner_bl': wallsLower.inner_corner_bl,
        'corner_br': wallsLower.inner_corner_br
    };

    return positionMap[position] || wallsLower.wall_center;
}

/**
 * Check if a theme is a Floor 1-2 theme
 */
function isFloor12Theme(themeName) {
    return FLOOR_1_2_THEMES.hasOwnProperty(themeName);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.TILESET_FLOORS_1_2 = TILESET_FLOORS_1_2;
    window.FLOOR_1_2_THEMES = FLOOR_1_2_THEMES;
    window.getFloor12FloorTile = getFloor12FloorTile;
    window.getFloor12WallTile = getFloor12WallTile;
    window.isFloor12Theme = isFloor12Theme;
}

console.log('[Tileset] Floors 1-2 reference loaded:', Object.keys(FLOOR_1_2_THEMES).length, 'themes');
