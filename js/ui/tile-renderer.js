// === js/ui/tile-renderer.js ===
// REFACTORED: Multi-tileset support with floor-based theme selection
// Renders rectangular rooms with full 4-sided walls
// Supports multiple tilesets for different dungeon floors

// ============================================================================
// TILESET MANAGEMENT
// ============================================================================

// Tileset images container
const tilesets = {
    default: null,      // Original tileset (fallback)
    floors_1_2: null    // Stone dungeon tileset for floors 1-2
};

// Loading state
const tilesetState = {
    defaultLoaded: false,
    floors12Loaded: false
};

/**
 * Initialize all tilesets - call this on game start
 */
function initTileset() {
    // Load default/fallback tileset
    tilesets.default = new Image();
    tilesets.default.src = 'assets/spritesheet/walls_floors/walls_floor.png';

    tilesets.default.onload = () => {
        tilesetState.defaultLoaded = true;
        console.log('[Tileset] Default tileset loaded');
        console.log('   Dimensions:', tilesets.default.width, 'x', tilesets.default.height);
    };

    tilesets.default.onerror = () => {
        console.error('[Tileset] Failed to load default tileset');
        tilesetState.defaultLoaded = false;
    };

    // Load floors 1-2 tileset (stone dungeon)
    tilesets.floors_1_2 = new Image();
    tilesets.floors_1_2.src = 'assets/spritesheet/dungeon_upper.png';

    tilesets.floors_1_2.onload = () => {
        tilesetState.floors12Loaded = true;
        console.log('[Tileset] Floors 1-2 tileset loaded');
        console.log('   Dimensions:', tilesets.floors_1_2.width, 'x', tilesets.floors_1_2.height);
    };

    tilesets.floors_1_2.onerror = () => {
        console.warn('[Tileset] Floors 1-2 tileset not found, using default');
        tilesetState.floors12Loaded = false;
    };
}

/**
 * Get the appropriate tileset for the current floor
 * @returns {Image} The tileset image to use
 */
function getTilesetForFloor() {
    const currentFloor = game.currentFloor || 1;

    // Floors 1-2: Use stone dungeon tileset if loaded
    if (currentFloor <= 2 && tilesetState.floors12Loaded) {
        return tilesets.floors_1_2;
    }

    // Fallback to default tileset
    return tilesets.default;
}

/**
 * Check if any tileset is loaded
 */
function isTilesetLoaded() {
    return tilesetState.defaultLoaded || tilesetState.floors12Loaded;
}

// Backward compatibility
let tilesetImage = null;
let tilesetLoaded = false;

// Update legacy variables when tilesets load
Object.defineProperty(window, 'tilesetLoaded', {
    get: () => isTilesetLoaded()
});

// ============================================================================
// TILE DRAWING FUNCTIONS
// ============================================================================

/**
 * Draw a single tile from the spritesheet with CRISP pixel-perfect rendering
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} tile - Tile with {row, col} coordinates
 * @param {number} screenX - Screen X position
 * @param {number} screenY - Screen Y position
 * @param {number} size - Rendered tile size
 * @param {Image} [tileset] - Optional specific tileset to use
 */
function drawTile(ctx, tile, screenX, screenY, size, tileset = null) {
    // Get tileset - use provided one or get based on floor
    const img = tileset || getTilesetForFloor() || tilesets.default;

    if (!img || !img.complete) {
        // Fallback to solid color if tileset not loaded
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(screenX, screenY, size, size);
        return;
    }

    // CRITICAL: Disable image smoothing for pixel-perfect rendering
    const originalSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;

    ctx.drawImage(
        img,
        tile.col * 16,  // Source X (16px tiles)
        tile.row * 16,  // Source Y
        16,             // Source Width
        16,             // Source Height
        Math.floor(screenX),  // Snap to pixel
        Math.floor(screenY),  // Snap to pixel
        size,           // Destination Width (scaled)
        size            // Destination Height (scaled)
    );

    // Restore smoothing setting
    ctx.imageSmoothingEnabled = originalSmoothing;
}

/**
 * Draw a tile from a specific tileset by name
 */
function drawTileFromSet(ctx, tilesetName, tile, screenX, screenY, size) {
    const img = tilesets[tilesetName];
    drawTile(ctx, tile, screenX, screenY, size, img);
}

// ============================================================================
// FLOOR TILE RENDERING
// ============================================================================

/**
 * Get floor tile based on theme and position
 * Uses Floor 1-2 themes when appropriate
 */
function getFloorTileForTheme(theme, x, y) {
    const currentFloor = game.currentFloor || 1;

    // Check if this is a Floor 1-2 theme
    if (currentFloor <= 2 && typeof isFloor12Theme === 'function' && isFloor12Theme(theme)) {
        return getFloor12FloorTile(theme, x, y);
    }

    // Original floor tile logic for other floors
    const rand = (x * 7 + y * 11) % 10;  // 0-9

    if (rand < 5) {
        // 50% chance - use base tile
        return { row: 10, col: 1 };
    } else {
        // 50% chance - pick from variants
        const variants = [
            { row: 21, col: 0 },
            { row: 21, col: 1 },
            { row: 22, col: 0 },
            { row: 22, col: 1 }
        ];
        return variants[rand % 4];
    }
}

/**
 * Draw a floor tile with graphics
 */
function drawFloorTile(ctx, tile, x, y, screenX, screenY, size) {
    const room = tile.room;
    const theme = room ? room.theme : null;
    const floorTile = getFloorTileForTheme(theme, x, y);
    drawTile(ctx, floorTile, screenX, screenY, size);
}

/**
 * Draw void tiles (unexplored areas at map edges)
 */
function drawVoidTile(ctx, screenX, screenY, size) {
    ctx.fillStyle = '#000000';
    ctx.fillRect(Math.floor(screenX), Math.floor(screenY), size, size);
}

/**
 * Draw doorway tiles
 */
function drawDoorwayTile(ctx, screenX, screenY, size) {
    const currentFloor = game.currentFloor || 1;

    if (currentFloor <= 2 && tilesetState.floors12Loaded && typeof TILESET_FLOORS_1_2 !== 'undefined') {
        // Use Floor 1-2 door tile
        drawTile(ctx, TILESET_FLOORS_1_2.STONE_WALLS.door_arch_stone, screenX, screenY, size, tilesets.floors_1_2);
    } else if (isTilesetLoaded() && typeof TILESET !== 'undefined') {
        // Use default door tile
        drawTile(ctx, TILESET.DECORATIVE.door_wooden_closed, screenX, screenY, size, tilesets.default);
    } else {
        // Fallback color
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(screenX, screenY, size, size);
    }
}

// ============================================================================
// WALL RENDERING
// ============================================================================

/**
 * Get the wall tileset for the current floor
 */
function getWallSet() {
    const currentFloor = game.currentFloor || 1;

    if (currentFloor <= 2 && tilesetState.floors12Loaded && typeof TILESET_FLOORS_1_2 !== 'undefined') {
        // Return combined wall data for floors 1-2
        return {
            tileset: tilesets.floors_1_2,
            wall_top_left: TILESET_FLOORS_1_2.STONE_WALLS.wall_top_left,
            wall_top_center: TILESET_FLOORS_1_2.STONE_WALLS.wall_top_center,
            wall_top_right: TILESET_FLOORS_1_2.STONE_WALLS.wall_top_right,
            wall_left: TILESET_FLOORS_1_2.STONE_WALLS_LOWER.wall_left,
            wall_center: TILESET_FLOORS_1_2.STONE_WALLS_LOWER.wall_center,
            wall_right: TILESET_FLOORS_1_2.STONE_WALLS_LOWER.wall_right,
            wall_bottom_left: TILESET_FLOORS_1_2.STONE_WALLS_LOWER.inner_corner_bl,
            wall_bottom_center: TILESET_FLOORS_1_2.STONE_WALLS_LOWER.wall_bottom,
            wall_bottom_right: TILESET_FLOORS_1_2.STONE_WALLS_LOWER.inner_corner_br
        };
    }

    // Default tileset walls
    if (typeof TILESET !== 'undefined') {
        return {
            tileset: tilesets.default,
            ...TILESET.DARK_STONE
        };
    }

    return null;
}

/**
 * Render all walls for rooms with proper corners, edges, and centers
 */
function renderAllWalls(ctx, camX, camY, effectiveTileSize, offset) {
    if (!isTilesetLoaded()) return;

    const wallSet = getWallSet();
    if (!wallSet) return;

    // Render walls for each room
    for (const room of game.rooms) {
        renderRoomWalls(ctx, room, wallSet, camX, camY, effectiveTileSize, offset);
    }
}

/**
 * Render walls for a single room (all 4 sides with proper corners)
 */
function renderRoomWalls(ctx, room, wallSet, camX, camY, effectiveTileSize, offset) {
    const roomX = room.x;
    const roomY = room.y;
    const roomWidth = room.width;
    const roomHeight = room.height;

    // Check if room is in view (rough culling)
    const roomScreenX = (roomX - camX) * effectiveTileSize + offset;
    const roomScreenY = (roomY - camY) * effectiveTileSize;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    if (roomScreenX + roomWidth * effectiveTileSize < 0 || roomScreenX > canvasWidth) return;
    if (roomScreenY + roomHeight * effectiveTileSize < 0 || roomScreenY > canvasHeight) return;

    // Draw all 4 sides
    renderTopWall(ctx, room, wallSet, camX, camY, effectiveTileSize, offset);
    renderBottomWall(ctx, room, wallSet, camX, camY, effectiveTileSize, offset);
    renderLeftWall(ctx, room, wallSet, camX, camY, effectiveTileSize, offset);
    renderRightWall(ctx, room, wallSet, camX, camY, effectiveTileSize, offset);
}

/**
 * Render top wall (north side)
 */
function renderTopWall(ctx, room, wallSet, camX, camY, effectiveTileSize, offset) {
    const wallY = room.y;
    const tileset = wallSet.tileset;

    for (let x = room.x; x < room.x + room.width; x++) {
        const tile = game.map[wallY] && game.map[wallY][x];
        if (tile && tile.type === 'doorway') continue;

        const screenX = (x - camX) * effectiveTileSize + offset;
        const screenY = (wallY - camY) * effectiveTileSize;

        let wallTile;
        if (x === room.x) {
            wallTile = wallSet.wall_top_left;
        } else if (x === room.x + room.width - 1) {
            wallTile = wallSet.wall_top_right;
        } else {
            wallTile = wallSet.wall_top_center;
        }

        drawTile(ctx, wallTile, screenX, screenY, effectiveTileSize, tileset);
    }
}

/**
 * Render bottom wall (south side)
 */
function renderBottomWall(ctx, room, wallSet, camX, camY, effectiveTileSize, offset) {
    const wallY = room.y + room.height - 1;
    const tileset = wallSet.tileset;

    for (let x = room.x; x < room.x + room.width; x++) {
        const tile = game.map[wallY] && game.map[wallY][x];
        if (tile && tile.type === 'doorway') continue;

        const screenX = (x - camX) * effectiveTileSize + offset;
        const screenY = (wallY - camY) * effectiveTileSize;

        let wallTile;
        if (x === room.x) {
            wallTile = wallSet.wall_bottom_left || wallSet.wall_left;
        } else if (x === room.x + room.width - 1) {
            wallTile = wallSet.wall_bottom_right || wallSet.wall_right;
        } else {
            wallTile = wallSet.wall_bottom_center || wallSet.wall_top_center;
        }

        drawTile(ctx, wallTile, screenX, screenY, effectiveTileSize, tileset);
    }
}

/**
 * Render left wall (west side)
 */
function renderLeftWall(ctx, room, wallSet, camX, camY, effectiveTileSize, offset) {
    const wallX = room.x;
    const tileset = wallSet.tileset;

    for (let y = room.y + 1; y < room.y + room.height - 1; y++) {
        const tile = game.map[y] && game.map[y][wallX];
        if (tile && tile.type === 'doorway') continue;

        const screenX = (wallX - camX) * effectiveTileSize + offset;
        const screenY = (y - camY) * effectiveTileSize;

        drawTile(ctx, wallSet.wall_left, screenX, screenY, effectiveTileSize, tileset);
    }
}

/**
 * Render right wall (east side)
 */
function renderRightWall(ctx, room, wallSet, camX, camY, effectiveTileSize, offset) {
    const wallX = room.x + room.width - 1;
    const tileset = wallSet.tileset;

    for (let y = room.y + 1; y < room.y + room.height - 1; y++) {
        const tile = game.map[y] && game.map[y][wallX];
        if (tile && tile.type === 'doorway') continue;

        const screenX = (wallX - camX) * effectiveTileSize + offset;
        const screenY = (y - camY) * effectiveTileSize;

        drawTile(ctx, wallSet.wall_right, screenX, screenY, effectiveTileSize, tileset);
    }
}

/**
 * Draw wall tile (for gap fill between rooms)
 */
function drawWallTile(ctx, screenX, screenY, size) {
    const wallSet = getWallSet();

    if (wallSet && wallSet.wall_center) {
        drawTile(ctx, wallSet.wall_center, screenX, screenY, size, wallSet.tileset);
    } else {
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(screenX, screenY, size, size);
    }
}

// ============================================================================
// PROP RENDERING (for floors 1-2)
// ============================================================================

/**
 * Draw a prop from the Floor 1-2 tileset
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} category - Prop category (e.g., 'PROPS_STORAGE')
 * @param {string} propName - Prop name (e.g., 'barrel_wood_1')
 * @param {number} screenX
 * @param {number} screenY
 * @param {number} size
 */
function drawProp(ctx, category, propName, screenX, screenY, size) {
    if (!tilesetState.floors12Loaded || typeof TILESET_FLOORS_1_2 === 'undefined') {
        return false;
    }

    const categoryData = TILESET_FLOORS_1_2[category];
    if (!categoryData || !categoryData[propName]) {
        console.warn(`[TileRenderer] Prop not found: ${category}.${propName}`);
        return false;
    }

    drawTile(ctx, categoryData[propName], screenX, screenY, size, tilesets.floors_1_2);
    return true;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    // Core functions
    window.initTileset = initTileset;
    window.drawTile = drawTile;
    window.drawTileFromSet = drawTileFromSet;
    window.isTilesetLoaded = isTilesetLoaded;
    window.getTilesetForFloor = getTilesetForFloor;

    // Tile drawing
    window.drawFloorTile = drawFloorTile;
    window.drawVoidTile = drawVoidTile;
    window.drawDoorwayTile = drawDoorwayTile;
    window.drawWallTile = drawWallTile;

    // Wall rendering
    window.renderAllWalls = renderAllWalls;
    window.getWallSet = getWallSet;

    // Props
    window.drawProp = drawProp;

    // Tileset state (for debugging)
    window.tilesets = tilesets;
    window.tilesetState = tilesetState;
}

console.log('[TileRenderer] Multi-tileset renderer loaded');
