// === js/ui/tile-renderer.js ===
// REFACTORED: Proper wall rendering with corners, edges, and centers
// Renders rectangular rooms with full 4-sided walls

// Tileset image (loaded on initialization)
let tilesetImage = null;
let tilesetLoaded = false;

/**
 * Initialize the tileset - call this on game start
 */
function initTileset() {
    tilesetImage = new Image();
    tilesetImage.src = 'assets/spritesheet/walls_floors/walls_floor.png';
    
    tilesetImage.onload = () => {
        tilesetLoaded = true;
        console.log('✅ Tileset loaded successfully');
        console.log('   Dimensions:', tilesetImage.width, 'x', tilesetImage.height);
    };
    
    tilesetImage.onerror = () => {
        console.error('❌ Failed to load tileset. Using fallback colors.');
        tilesetLoaded = false;
    };
}

/**
 * Draw a single tile from the spritesheet with CRISP pixel-perfect rendering
 */
function drawTile(ctx, tile, screenX, screenY, size) {
    if (!tilesetLoaded || !tilesetImage) {
        // Fallback to solid color if tileset not loaded
        ctx.fillStyle = '#4a5568';
        ctx.fillRect(screenX, screenY, size, size);
        return;
    }
    
    // CRITICAL: Disable image smoothing for pixel-perfect rendering
    const originalSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    
    ctx.drawImage(
        tilesetImage,
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


function getFloorTileForTheme(theme, x, y) {
// Example: 50% base, 50% split among variants
const rand = (x * 7 + y * 11) % 10  // 0-9

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
    
    // Use purple stone for all floors
    return purpleStoneFloors[seed];
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
    if (tilesetLoaded) {
        drawTile(ctx, TILESET.DECORATIVE.door_wooden, screenX, screenY, size);
    } else {
        ctx.fillStyle = '#5a4a3a';
        ctx.fillRect(screenX, screenY, size, size);
    }
}

/**
 * NEW: Render all walls for rooms with proper corners, edges, and centers
 * This is called during the main render loop
 */
function renderAllWalls(ctx, camX, camY, effectiveTileSize, offset) {
    if (!tilesetLoaded) return;
    
    // Use dark stone for all walls
    const wallSet = TILESET.DARK_STONE;
    
    // Render walls for each room
    for (const room of game.rooms) {
        renderRoomWalls(ctx, room, wallSet, camX, camY, effectiveTileSize, offset);
    }
}

/**
 * Render walls for a single room (all 4 sides with proper corners)
 */
function renderRoomWalls(ctx, room, wallSet, camX, camY, effectiveTileSize, offset) {
    // Room boundaries (including walls)
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
    
    for (let x = room.x; x < room.x + room.width; x++) {
        // Check if this tile is a doorway (skip if so)
        const tile = game.map[wallY] && game.map[wallY][x];
        if (tile && tile.type === 'doorway') continue;
        
        const screenX = (x - camX) * effectiveTileSize + offset;
        const screenY = (wallY - camY) * effectiveTileSize;
        
        // Determine which wall tile to use
        let wallTile;
        if (x === room.x) {
            wallTile = wallSet.wall_top_left; // Top-left corner
        } else if (x === room.x + room.width - 1) {
            wallTile = wallSet.wall_top_right; // Top-right corner
        } else {
            wallTile = wallSet.wall_top_center; // Top edge
        }
        
        drawTile(ctx, wallTile, screenX, screenY, effectiveTileSize);
    }
}

/**
 * Render bottom wall (south side)
 */
function renderBottomWall(ctx, room, wallSet, camX, camY, effectiveTileSize, offset) {
    const wallY = room.y + room.height - 1;
    
    for (let x = room.x; x < room.x + room.width; x++) {
        // Check if this tile is a doorway (skip if so)
        const tile = game.map[wallY] && game.map[wallY][x];
        if (tile && tile.type === 'doorway') continue;
        
        const screenX = (x - camX) * effectiveTileSize + offset;
        const screenY = (wallY - camY) * effectiveTileSize;
        
        // Determine which wall tile to use
        let wallTile;
        if (x === room.x) {
            wallTile = wallSet.wall_bottom_left || wallSet.wall_left; // Bottom-left corner
        } else if (x === room.x + room.width - 1) {
            wallTile = wallSet.wall_bottom_right || wallSet.wall_right; // Bottom-right corner
        } else {
            wallTile = wallSet.wall_bottom_center || wallSet.wall_top_center; // Bottom edge
        }
        
        drawTile(ctx, wallTile, screenX, screenY, effectiveTileSize);
    }
}

/**
 * Render left wall (west side)
 */
function renderLeftWall(ctx, room, wallSet, camX, camY, effectiveTileSize, offset) {
    const wallX = room.x;
    
    // Skip corners (already drawn by top/bottom walls)
    for (let y = room.y + 1; y < room.y + room.height - 1; y++) {
        // Check if this tile is a doorway (skip if so)
        const tile = game.map[y] && game.map[y][wallX];
        if (tile && tile.type === 'doorway') continue;
        
        const screenX = (wallX - camX) * effectiveTileSize + offset;
        const screenY = (y - camY) * effectiveTileSize;
        
        const wallTile = wallSet.wall_left; // Left edge
        drawTile(ctx, wallTile, screenX, screenY, effectiveTileSize);
    }
}

/**
 * Render right wall (east side)
 */
function renderRightWall(ctx, room, wallSet, camX, camY, effectiveTileSize, offset) {
    const wallX = room.x + room.width - 1;
    
    // Skip corners (already drawn by top/bottom walls)
    for (let y = room.y + 1; y < room.y + room.height - 1; y++) {
        // Check if this tile is a doorway (skip if so)
        const tile = game.map[y] && game.map[y][wallX];
        if (tile && tile.type === 'doorway') continue;
        
        const screenX = (wallX - camX) * effectiveTileSize + offset;
        const screenY = (y - camY) * effectiveTileSize;
        
        const wallTile = wallSet.wall_right; // Right edge
        drawTile(ctx, wallTile, screenX, screenY, effectiveTileSize);
    }
}

/**
 * Render wall tiles (for gap fill between rooms)
 */
function drawWallTile(ctx, screenX, screenY, size) {
    if (tilesetLoaded) {
        // Use center wall tile for fill
        drawTile(ctx, TILESET.DARK_STONE.wall_center || TILESET.DARK_STONE.wall_top_center, screenX, screenY, size);
    } else {
        // Fallback
        ctx.fillStyle = '#2d3748';
        ctx.fillRect(screenX, screenY, size, size);
    }
}

// Export functions
if (typeof window !== 'undefined') {
    window.initTileset = initTileset;
    window.drawTile = drawTile;
    window.drawFloorTile = drawFloorTile;
    window.drawVoidTile = drawVoidTile;
    window.drawDoorwayTile = drawDoorwayTile;
    window.drawWallTile = drawWallTile;
    window.renderAllWalls = renderAllWalls;
}

console.log('✅ Tile renderer loaded (4-sided wall rendering)');