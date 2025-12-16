// ============================================================================
// TILESET REFERENCE - Floors 1-2: Stone Dungeon & Upper Depths
// ============================================================================
// File: dungeon_upper.png (to be provided by design team)
// Tile Size: 16x16 pixels
// Based on reference image with stone dungeon, props, and decorations
// ============================================================================

const TILESET_FLOORS_1_2 = {
    // Spritesheet file path
    spritesheet: 'assets/spritesheet/dungeon_upper.png',
    tileSize: 16,

    // ========================================================================
    // STONE DUNGEON WALLS (Row 0)
    // Grey brick walls with various textures and doorways
    // ========================================================================
    STONE_WALLS: {
        // Basic wall variations
        wall_brick_clean: { row: 0, col: 0 },
        wall_brick_cracked: { row: 0, col: 1 },
        wall_brick_mossy: { row: 0, col: 2 },
        wall_brick_damaged: { row: 0, col: 3 },

        // Arched doorways
        door_arch_stone: { row: 0, col: 4 },
        door_arch_wood: { row: 0, col: 5 },

        // Mine/cave entrances
        entrance_mine: { row: 0, col: 6 },
        entrance_cave: { row: 0, col: 7 },

        // Wall tops and edges
        wall_top_left: { row: 0, col: 8 },
        wall_top_center: { row: 0, col: 9 },
        wall_top_right: { row: 0, col: 10 },
        wall_corner_outer: { row: 0, col: 11 }
    },

    // ========================================================================
    // STONE DUNGEON WALLS - LOWER SECTIONS (Row 1)
    // Wall bottoms, sides, and inner corners
    // ========================================================================
    STONE_WALLS_LOWER: {
        wall_left: { row: 1, col: 0 },
        wall_center: { row: 1, col: 1 },
        wall_right: { row: 1, col: 2 },
        wall_bottom: { row: 1, col: 3 },

        // Inner corners for room construction
        inner_corner_tl: { row: 1, col: 4 },
        inner_corner_tr: { row: 1, col: 5 },
        inner_corner_bl: { row: 1, col: 6 },
        inner_corner_br: { row: 1, col: 7 },

        // Pillar/column walls
        wall_pillar_top: { row: 1, col: 8 },
        wall_pillar_mid: { row: 1, col: 9 },
        wall_pillar_base: { row: 1, col: 10 }
    },

    // ========================================================================
    // FLOOR TILES - STONE (Row 2)
    // Various stone floor patterns
    // ========================================================================
    STONE_FLOORS: {
        floor_stone_clean: { row: 2, col: 0 },
        floor_stone_cracked: { row: 2, col: 1 },
        floor_stone_worn: { row: 2, col: 2 },
        floor_stone_mossy: { row: 2, col: 3 },

        // Large tile patterns
        floor_large_tile_1: { row: 2, col: 4 },
        floor_large_tile_2: { row: 2, col: 5 },
        floor_large_tile_3: { row: 2, col: 6 },
        floor_large_tile_4: { row: 2, col: 7 },

        // Detailed/decorated floors
        floor_detailed_1: { row: 2, col: 8 },
        floor_detailed_2: { row: 2, col: 9 }
    },

    // ========================================================================
    // FLOOR TILES - DIRT/EARTH (Row 3)
    // Natural ground and transitions
    // ========================================================================
    EARTH_FLOORS: {
        floor_dirt_1: { row: 3, col: 0 },
        floor_dirt_2: { row: 3, col: 1 },
        floor_earth_rocky: { row: 3, col: 2 },
        floor_mud: { row: 3, col: 3 },

        // Stone-to-dirt transitions
        transition_stone_dirt_n: { row: 3, col: 4 },
        transition_stone_dirt_s: { row: 3, col: 5 },
        transition_stone_dirt_e: { row: 3, col: 6 },
        transition_stone_dirt_w: { row: 3, col: 7 }
    },

    // ========================================================================
    // PIT/VOID TILES (Row 4)
    // Cave openings and bottomless pits
    // ========================================================================
    PITS: {
        pit_center: { row: 4, col: 0 },
        pit_edge_n: { row: 4, col: 1 },
        pit_edge_s: { row: 4, col: 2 },
        pit_edge_e: { row: 4, col: 3 },
        pit_edge_w: { row: 4, col: 4 },
        pit_corner_nw: { row: 4, col: 5 },
        pit_corner_ne: { row: 4, col: 6 },
        pit_corner_sw: { row: 4, col: 7 },
        pit_corner_se: { row: 4, col: 8 }
    },

    // ========================================================================
    // CRYSTAL DECORATIONS (Row 5)
    // Blue and purple crystal formations
    // ========================================================================
    CRYSTALS: {
        crystal_blue_small: { row: 5, col: 0 },
        crystal_blue_medium: { row: 5, col: 1 },
        crystal_blue_large: { row: 5, col: 2 },
        crystal_blue_cluster: { row: 5, col: 3 },

        crystal_purple_small: { row: 5, col: 4 },
        crystal_purple_medium: { row: 5, col: 5 },
        crystal_purple_large: { row: 5, col: 6 },
        crystal_purple_cluster: { row: 5, col: 7 },

        // Mixed crystal formations
        crystal_mixed_1: { row: 5, col: 8 },
        crystal_mixed_2: { row: 5, col: 9 }
    },

    // ========================================================================
    // LAVA CRACK OVERLAYS (Row 6)
    // Progressive damage/corruption patterns
    // ========================================================================
    LAVA_CRACKS: {
        crack_lava_light: { row: 6, col: 0 },
        crack_lava_medium: { row: 6, col: 1 },
        crack_lava_heavy: { row: 6, col: 2 },
        crack_lava_severe: { row: 6, col: 3 },

        // Spreading patterns
        crack_spread_n: { row: 6, col: 4 },
        crack_spread_s: { row: 6, col: 5 },
        crack_spread_e: { row: 6, col: 6 },
        crack_spread_w: { row: 6, col: 7 },
        crack_spread_center: { row: 6, col: 8 }
    },

    // ========================================================================
    // PROPS - STORAGE (Row 7)
    // Crates, barrels, and containers
    // ========================================================================
    PROPS_STORAGE: {
        crate_wood_1: { row: 7, col: 0 },
        crate_wood_2: { row: 7, col: 1 },
        crate_metal: { row: 7, col: 2 },
        crate_broken: { row: 7, col: 3 },

        barrel_wood_1: { row: 7, col: 4 },
        barrel_wood_2: { row: 7, col: 5 },
        barrel_metal: { row: 7, col: 6 },
        barrel_broken: { row: 7, col: 7 },

        // Stacked variations
        crates_stacked: { row: 7, col: 8 },
        barrels_stacked: { row: 7, col: 9 }
    },

    // ========================================================================
    // PROPS - LIGHTING (Row 8)
    // Lanterns and light sources
    // ========================================================================
    PROPS_LIGHTING: {
        lantern_hanging_lit: { row: 8, col: 0 },
        lantern_hanging_unlit: { row: 8, col: 1 },
        lantern_standing_lit: { row: 8, col: 2 },
        lantern_standing_unlit: { row: 8, col: 3 },

        torch_wall_lit: { row: 8, col: 4 },
        torch_wall_unlit: { row: 8, col: 5 },
        torch_floor_lit: { row: 8, col: 6 },
        torch_floor_unlit: { row: 8, col: 7 },

        // Brazier
        brazier_lit: { row: 8, col: 8 },
        brazier_unlit: { row: 8, col: 9 }
    },

    // ========================================================================
    // PROPS - STRUCTURAL (Row 9)
    // Pillars, supports, chains
    // ========================================================================
    PROPS_STRUCTURAL: {
        pillar_stone_top: { row: 9, col: 0 },
        pillar_stone_mid: { row: 9, col: 1 },
        pillar_stone_base: { row: 9, col: 2 },
        pillar_stone_broken: { row: 9, col: 3 },

        pillar_wood_top: { row: 9, col: 4 },
        pillar_wood_mid: { row: 9, col: 5 },
        pillar_wood_base: { row: 9, col: 6 },
        pillar_wood_broken: { row: 9, col: 7 },

        chain_vertical: { row: 9, col: 8 },
        rope_coiled: { row: 9, col: 9 }
    },

    // ========================================================================
    // PROPS - REMAINS (Row 10)
    // Skeletons, bones, and debris
    // ========================================================================
    PROPS_REMAINS: {
        skeleton_sitting: { row: 10, col: 0 },
        skeleton_lying: { row: 10, col: 1 },
        skeleton_chained: { row: 10, col: 2 },
        bones_pile_small: { row: 10, col: 3 },
        bones_pile_large: { row: 10, col: 4 },
        skull_single: { row: 10, col: 5 },
        skulls_pile: { row: 10, col: 6 },

        // Debris
        rubble_stone: { row: 10, col: 7 },
        rubble_wood: { row: 10, col: 8 }
    },

    // ========================================================================
    // PROPS - MINING (Row 11)
    // Mining equipment and tools
    // ========================================================================
    PROPS_MINING: {
        pickaxe_wall: { row: 11, col: 0 },
        pickaxe_floor: { row: 11, col: 1 },
        shovel: { row: 11, col: 2 },
        mining_cart: { row: 11, col: 3 },
        mining_cart_full: { row: 11, col: 4 },
        lantern_mining: { row: 11, col: 5 },
        rail_track_h: { row: 11, col: 6 },
        rail_track_v: { row: 11, col: 7 }
    },

    // ========================================================================
    // PROPS - PRISON (Row 12)
    // Cages, bars, and restraints
    // ========================================================================
    PROPS_PRISON: {
        bars_vertical: { row: 12, col: 0 },
        bars_horizontal: { row: 12, col: 1 },
        cage_small: { row: 12, col: 2 },
        cage_large_tl: { row: 12, col: 3 },
        cage_large_tr: { row: 12, col: 4 },
        cage_large_bl: { row: 12, col: 5 },
        cage_large_br: { row: 12, col: 6 },
        shackles: { row: 12, col: 7 }
    }
};

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
