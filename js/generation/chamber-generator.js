// ============================================================================
// CHAMBER GENERATOR - The Shifting Chasm
// ============================================================================
// Uses cellular automata to subdivide rooms into interconnected chambers
// Creates maze-like structures with guaranteed connectivity
// ============================================================================

// ============================================================================
// CONFIGURATION
// ============================================================================

const CHAMBER_CONFIG = {
    initialWallChance: 0.52,       // 52% walls initially (increased from 0.45)
    smoothingPasses: 5,            // Number of cellular automata passes (increased from 4)
    wallThreshold: 4,              // Floor needs 4+ neighbors to become wall (decreased from 5)
    floorThreshold: 5,             // Wall needs 5+ neighbors to survive (increased from 4)
    minChambers: 4,                // Minimum chambers per room
    maxChambers: 10,               // Maximum chambers per room
    targetChambers: 7,             // Target ~6-8 chambers
    minChamberSize: 25,            // Minimum tiles for a valid chamber (increased from 16)
    corridorWidth: 2,              // Width of connecting corridors
    edgeBuffer: 2,                 // Keep edges clear for doorways
    debugLogging: true,
    trackStats: false              // Enable statistics tracking for analysis
};

// Statistics tracking (optional)
const CHAMBER_STATS = {
    enabled: false,
    data: {
        initialDensities: [],
        smoothedDensities: [],
        finalDensities: [],
        chamberCounts: [],
        chamberSizes: []
    },

    reset() {
        this.data = {
            initialDensities: [],
            smoothedDensities: [],
            finalDensities: [],
            chamberCounts: [],
            chamberSizes: []
        };
    },

    record(type, value) {
        if (!this.enabled) return;
        if (this.data[type]) {
            if (Array.isArray(value)) {
                this.data[type].push(...value);
            } else {
                this.data[type].push(value);
            }
        }
    }
};

// ============================================================================
// MAIN CHAMBER GENERATION
// ============================================================================

/**
 * Generate chambers within a room using cellular automata
 * @param {Object} room - Room to generate chambers in
 */
function generateChambers(room) {
    if (!room) {
        console.error('[ChamberGen] Room is undefined');
        return;
    }

    const width = room.floorWidth;
    const height = room.floorHeight;

    if (CHAMBER_CONFIG.debugLogging) {
        console.log(`[ChamberGen] ========================================`);
        console.log(`[ChamberGen] Generating chambers for ${room.type} room`);
        console.log(`[ChamberGen] Room pos: (${room.x}, ${room.y}), Floor: (${room.floorX}, ${room.floorY})`);
        console.log(`[ChamberGen] Floor size: ${width}x${height}`);
        console.log(`[ChamberGen] Doorways on room: ${room.doorways ? room.doorways.length : 0}`);
    }

    // Find doorway positions relative to room floor
    const doorwayTiles = findDoorwayTiles(room);

    if (CHAMBER_CONFIG.debugLogging) {
        console.log(`[ChamberGen] Doorway tiles found: ${doorwayTiles.length}`);
    }

    // Initialize chamber grid
    let grid = initializeChamberGrid(width, height, doorwayTiles);

    // Count initial walls
    let initialWalls = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x] === 1) initialWalls++;
        }
    }
    const initialDensity = initialWalls / (width * height);
    CHAMBER_STATS.record('initialDensities', initialDensity);
    if (CHAMBER_CONFIG.debugLogging) {
        console.log(`[ChamberGen] Initial walls: ${initialWalls} / ${width * height} (${(initialDensity * 100).toFixed(1)}%)`);
    }

    // Run cellular automata smoothing
    for (let i = 0; i < CHAMBER_CONFIG.smoothingPasses; i++) {
        grid = smoothChamberGrid(grid, width, height, doorwayTiles);
    }

    // Count walls after smoothing
    let smoothedWalls = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x] === 1) smoothedWalls++;
        }
    }
    const smoothedDensity = smoothedWalls / (width * height);
    CHAMBER_STATS.record('smoothedDensities', smoothedDensity);
    if (CHAMBER_CONFIG.debugLogging) {
        console.log(`[ChamberGen] After smoothing: ${smoothedWalls} walls (${(smoothedDensity * 100).toFixed(1)}%)`);
    }

    // Ensure doorway connectivity
    ensureDoorwayConnectivity(grid, width, height, doorwayTiles);

    // Identify distinct chambers
    const chambers = identifyChambers(grid, width, height);

    // Connect isolated chambers
    connectIsolatedChambers(grid, width, height, chambers, doorwayTiles);

    // Count final walls
    let finalWalls = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x] === 1) finalWalls++;
        }
    }
    const finalDensity = finalWalls / (width * height);
    CHAMBER_STATS.record('finalDensities', finalDensity);
    if (CHAMBER_CONFIG.debugLogging) {
        console.log(`[ChamberGen] Final walls: ${finalWalls} (${(finalDensity * 100).toFixed(1)}%)`);
    }

    // Track chamber statistics
    CHAMBER_STATS.record('chamberCounts', chambers.length);
    CHAMBER_STATS.record('chamberSizes', chambers.map(c => c.size));

    // Apply grid to game map
    applyChamberGridToRoom(grid, room);

    // Store chamber data on room
    room.chambers = chambers;
    room.chamberGrid = grid;

    // Mark safe chamber (furthest from doorways) - used for player spawn in entrance
    if (chambers.length > 0) {
        const safeChamber = findSafestChamber(chambers, doorwayTiles, room);
        room.safeChamber = safeChamber;
        if (safeChamber) {
            safeChamber.isSafe = true;
        }
        if (CHAMBER_CONFIG.debugLogging && room.type === 'entrance') {
            console.log(`[ChamberGen] Safe chamber marked: ID ${safeChamber?.id}, ${safeChamber?.tiles?.length} tiles`);
        }
    }

    if (CHAMBER_CONFIG.debugLogging) {
        console.log(`[ChamberGen] Created ${chambers.length} chambers`);
        console.log(`[ChamberGen] ========================================`);
    }
}

/**
 * Find the chamber furthest from all doorways (safest for player spawn)
 */
function findSafestChamber(chambers, doorwayTiles, room) {
    if (!chambers || chambers.length === 0) return null;
    if (!doorwayTiles || doorwayTiles.length === 0) return chambers[0];

    let safestChamber = null;
    let maxMinDistance = -1;

    for (const chamber of chambers) {
        // Find minimum distance from this chamber's center to any doorway
        let minDistToDoor = Infinity;

        for (const doorTile of doorwayTiles) {
            const dist = Math.abs(chamber.center.x - doorTile.x) +
                        Math.abs(chamber.center.y - doorTile.y);
            if (dist < minDistToDoor) {
                minDistToDoor = dist;
            }
        }

        // Chamber with the largest minimum distance is safest
        if (minDistToDoor > maxMinDistance) {
            maxMinDistance = minDistToDoor;
            safestChamber = chamber;
        }
    }

    return safestChamber;
}

// ============================================================================
// GRID INITIALIZATION
// ============================================================================

/**
 * Initialize chamber grid with random walls
 */
function initializeChamberGrid(width, height, doorwayTiles) {
    const grid = [];
    const doorwaySet = new Set(doorwayTiles.map(t => `${t.x},${t.y}`));

    for (let y = 0; y < height; y++) {
        grid[y] = [];
        for (let x = 0; x < width; x++) {
            // Keep edges clear for doorways
            const isEdge = x < CHAMBER_CONFIG.edgeBuffer ||
                          x >= width - CHAMBER_CONFIG.edgeBuffer ||
                          y < CHAMBER_CONFIG.edgeBuffer ||
                          y >= height - CHAMBER_CONFIG.edgeBuffer;

            // Keep doorway tiles as floor
            const isDoorway = doorwaySet.has(`${x},${y}`);

            if (isDoorway || isEdge) {
                grid[y][x] = 0; // Floor
            } else {
                // Random wall based on initial chance
                grid[y][x] = Math.random() < CHAMBER_CONFIG.initialWallChance ? 1 : 0;
            }
        }
    }

    return grid;
}

/**
 * Find floor tiles that connect to doorways (relative to room floor)
 * Doorways are on walls, so we find the floor tiles adjacent to them
 */
function findDoorwayTiles(room) {
    const tiles = [];
    const tileSet = new Set();

    if (!room.doorways || room.doorways.length === 0) {
        if (CHAMBER_CONFIG.debugLogging) {
            console.log(`[ChamberGen] No doorways found for room at (${room.x}, ${room.y})`);
        }
        return tiles;
    }

    const addTile = (localX, localY) => {
        // Ensure within floor bounds
        if (localX < 0 || localX >= room.floorWidth ||
            localY < 0 || localY >= room.floorHeight) {
            return;
        }
        const key = `${localX},${localY}`;
        if (!tileSet.has(key)) {
            tileSet.add(key);
            tiles.push({
                x: localX,
                y: localY,
                worldX: room.floorX + localX,
                worldY: room.floorY + localY
            });
        }
    };

    for (const doorway of room.doorways) {
        // Doorways are on walls - find where they connect to floor
        // Based on doorway side, calculate floor entry point
        const side = doorway.side;

        if (CHAMBER_CONFIG.debugLogging) {
            console.log(`[ChamberGen] Processing ${side} doorway at (${doorway.x}, ${doorway.y}), size: ${doorway.width}x${doorway.height}`);
        }

        // Calculate floor entry tiles based on doorway side
        for (let i = 0; i < (doorway.orientation === 'horizontal' ? doorway.width : doorway.height); i++) {
            let entryX, entryY;

            if (side === 'north') {
                // Doorway on north wall, entry is at top of floor (y=0)
                entryX = doorway.x + i - room.floorX;
                entryY = 0;
            } else if (side === 'south') {
                // Doorway on south wall, entry is at bottom of floor
                entryX = doorway.x + i - room.floorX;
                entryY = room.floorHeight - 1;
            } else if (side === 'west') {
                // Doorway on west wall, entry is at left of floor (x=0)
                entryX = 0;
                entryY = doorway.y + i - room.floorY;
            } else if (side === 'east') {
                // Doorway on east wall, entry is at right of floor
                entryX = room.floorWidth - 1;
                entryY = doorway.y + i - room.floorY;
            }

            // Add entry tile and surrounding tiles to ensure path
            addTile(entryX, entryY);
            addTile(entryX + 1, entryY);
            addTile(entryX - 1, entryY);
            addTile(entryX, entryY + 1);
            addTile(entryX, entryY - 1);
            addTile(entryX + 1, entryY + 1);
            addTile(entryX - 1, entryY - 1);
            addTile(entryX + 1, entryY - 1);
            addTile(entryX - 1, entryY + 1);
            // Extended path into room
            addTile(entryX + 2, entryY);
            addTile(entryX - 2, entryY);
            addTile(entryX, entryY + 2);
            addTile(entryX, entryY - 2);
        }
    }

    if (CHAMBER_CONFIG.debugLogging) {
        console.log(`[ChamberGen] Found ${tiles.length} doorway entry tiles`);
    }

    return tiles;
}

// ============================================================================
// CELLULAR AUTOMATA
// ============================================================================

/**
 * Run one pass of cellular automata smoothing
 */
function smoothChamberGrid(grid, width, height, doorwayTiles) {
    const newGrid = [];
    const doorwaySet = new Set(doorwayTiles.map(t => `${t.x},${t.y}`));

    for (let y = 0; y < height; y++) {
        newGrid[y] = [];
        for (let x = 0; x < width; x++) {
            // Doorways always stay floor
            if (doorwaySet.has(`${x},${y}`)) {
                newGrid[y][x] = 0;
                continue;
            }

            // Count wall neighbors (including diagonals)
            let wallCount = 0;
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;

                    const nx = x + dx;
                    const ny = y + dy;

                    // Out of bounds counts as wall
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                        wallCount++;
                    } else if (grid[ny][nx] === 1) {
                        wallCount++;
                    }
                }
            }

            // Apply cellular automata rules
            if (grid[y][x] === 1) {
                // Wall stays wall if enough neighbors
                newGrid[y][x] = wallCount >= CHAMBER_CONFIG.floorThreshold ? 1 : 0;
            } else {
                // Floor becomes wall if many neighbors
                newGrid[y][x] = wallCount >= CHAMBER_CONFIG.wallThreshold ? 1 : 0;
            }
        }
    }

    return newGrid;
}

// ============================================================================
// CONNECTIVITY
// ============================================================================

/**
 * Ensure all doorways can reach each other
 */
function ensureDoorwayConnectivity(grid, width, height, doorwayTiles) {
    if (doorwayTiles.length < 2) return;

    // Get first doorway as starting point
    const start = doorwayTiles[0];

    // Find all reachable tiles from start
    const reachable = floodFill(grid, width, height, start.x, start.y);

    // Check if all other doorways are reachable
    for (let i = 1; i < doorwayTiles.length; i++) {
        const door = doorwayTiles[i];
        if (!reachable.has(`${door.x},${door.y}`)) {
            // This doorway is not reachable, carve a path
            carvePath(grid, width, height, start, door);
        }
    }
}

/**
 * Flood fill to find all reachable floor tiles
 */
function floodFill(grid, width, height, startX, startY) {
    const reachable = new Set();
    const stack = [{ x: startX, y: startY }];

    while (stack.length > 0) {
        const { x, y } = stack.pop();
        const key = `${x},${y}`;

        if (reachable.has(key)) continue;
        if (x < 0 || x >= width || y < 0 || y >= height) continue;
        if (grid[y][x] === 1) continue; // Wall

        reachable.add(key);

        // Add neighbors (4-directional)
        stack.push({ x: x + 1, y: y });
        stack.push({ x: x - 1, y: y });
        stack.push({ x: x, y: y + 1 });
        stack.push({ x: x, y: y - 1 });
    }

    return reachable;
}

/**
 * Carve a corridor between two points
 */
function carvePath(grid, width, height, from, to) {
    let x = from.x;
    let y = from.y;

    const corridorWidth = CHAMBER_CONFIG.corridorWidth;

    while (x !== to.x || y !== to.y) {
        // Carve corridor width tiles
        for (let w = 0; w < corridorWidth; w++) {
            if (y + w >= 0 && y + w < height && x >= 0 && x < width) {
                grid[y + w][x] = 0;
            }
            if (x + w >= 0 && x + w < width && y >= 0 && y < height) {
                grid[y][x + w] = 0;
            }
        }

        // Move toward target (prefer horizontal, then vertical)
        if (x !== to.x) {
            x += x < to.x ? 1 : -1;
        } else if (y !== to.y) {
            y += y < to.y ? 1 : -1;
        }
    }

    // Carve destination
    for (let w = 0; w < corridorWidth; w++) {
        if (to.y + w >= 0 && to.y + w < height && to.x >= 0 && to.x < width) {
            grid[to.y + w][to.x] = 0;
        }
    }
}

// ============================================================================
// CHAMBER IDENTIFICATION
// ============================================================================

/**
 * Identify distinct chambers using flood fill
 */
function identifyChambers(grid, width, height) {
    const chambers = [];
    const visited = new Set();

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x] === 1) continue; // Wall
            if (visited.has(`${x},${y}`)) continue;

            // Found new chamber, flood fill it
            const chamberTiles = [];
            const stack = [{ x, y }];

            while (stack.length > 0) {
                const tile = stack.pop();
                const key = `${tile.x},${tile.y}`;

                if (visited.has(key)) continue;
                if (tile.x < 0 || tile.x >= width || tile.y < 0 || tile.y >= height) continue;
                if (grid[tile.y][tile.x] === 1) continue;

                visited.add(key);
                chamberTiles.push(tile);

                stack.push({ x: tile.x + 1, y: tile.y });
                stack.push({ x: tile.x - 1, y: tile.y });
                stack.push({ x: tile.x, y: tile.y + 1 });
                stack.push({ x: tile.x, y: tile.y - 1 });
            }

            // Only count as chamber if large enough
            if (chamberTiles.length >= CHAMBER_CONFIG.minChamberSize) {
                chambers.push({
                    id: chambers.length,
                    tiles: chamberTiles,
                    size: chamberTiles.length,
                    center: calculateChamberCenter(chamberTiles)
                });
            }
        }
    }

    return chambers;
}

/**
 * Calculate center of a chamber
 */
function calculateChamberCenter(tiles) {
    let sumX = 0, sumY = 0;
    for (const tile of tiles) {
        sumX += tile.x;
        sumY += tile.y;
    }
    return {
        x: Math.floor(sumX / tiles.length),
        y: Math.floor(sumY / tiles.length)
    };
}

/**
 * Connect isolated chambers
 */
function connectIsolatedChambers(grid, width, height, chambers, doorwayTiles) {
    if (chambers.length <= 1) return;

    // Find main chamber (one connected to doorways)
    let mainChamber = null;
    const doorwaySet = new Set(doorwayTiles.map(t => `${t.x},${t.y}`));

    for (const chamber of chambers) {
        for (const tile of chamber.tiles) {
            if (doorwaySet.has(`${tile.x},${tile.y}`)) {
                mainChamber = chamber;
                break;
            }
        }
        if (mainChamber) break;
    }

    if (!mainChamber) {
        mainChamber = chambers[0]; // Fallback to largest
    }

    // Connect all other chambers to main
    for (const chamber of chambers) {
        if (chamber === mainChamber) continue;

        // Find closest tiles between chambers
        let minDist = Infinity;
        let fromTile = null;
        let toTile = null;

        for (const t1 of mainChamber.tiles) {
            for (const t2 of chamber.tiles) {
                const dist = Math.abs(t1.x - t2.x) + Math.abs(t1.y - t2.y);
                if (dist < minDist) {
                    minDist = dist;
                    fromTile = t1;
                    toTile = t2;
                }
            }
        }

        if (fromTile && toTile) {
            carvePath(grid, width, height, fromTile, toTile);
        }
    }
}

// ============================================================================
// APPLY TO GAME MAP
// ============================================================================

/**
 * Apply chamber grid to game map
 */
function applyChamberGridToRoom(grid, room) {
    let wallsPlaced = 0;
    let skipped = 0;

    for (let y = 0; y < room.floorHeight; y++) {
        for (let x = 0; x < room.floorWidth; x++) {
            const worldX = room.floorX + x;
            const worldY = room.floorY + y;

            if (!game.map[worldY] || !game.map[worldY][worldX]) {
                skipped++;
                continue;
            }

            if (grid[y][x] === 1) {
                // Interior wall
                game.map[worldY][worldX] = {
                    type: 'interior_wall',
                    room: room,
                    element: room.element,
                    blocked: true
                };
                wallsPlaced++;
            }
            // Floor tiles were already placed by placeRoomFloorTiles()
        }
    }

    if (CHAMBER_CONFIG.debugLogging) {
        console.log(`[ChamberGen] Applied ${wallsPlaced} interior walls to map (${skipped} tiles skipped)`);
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Check if a world position is a valid floor tile (not a wall)
 */
function isValidFloorTile(worldX, worldY) {
    if (!game.map[worldY] || !game.map[worldY][worldX]) return false;
    const tile = game.map[worldY][worldX];
    return tile.type === 'floor' || tile.type === 'doorway';
}

/**
 * Get a safe spawn position within a room (uses pre-marked safe chamber)
 * FIXED: Validates that spawn position is actually a floor tile, not a wall
 * @param {Object} room - Room to get safe spawn in
 * @returns {Object} {x, y} world coordinates
 */
function getSafeSpawnChamber(room) {
    // Helper to find a valid floor tile from chamber tiles
    const findValidTileInChamber = (chamber) => {
        if (!chamber || !chamber.tiles || chamber.tiles.length === 0) return null;

        // First try the center
        const centerWorldX = room.floorX + chamber.center.x;
        const centerWorldY = room.floorY + chamber.center.y;
        if (isValidFloorTile(centerWorldX, centerWorldY)) {
            return { x: centerWorldX, y: centerWorldY };
        }

        // Center is a wall - find the closest valid floor tile from chamber tiles
        // Sort tiles by distance to center and pick the first valid one
        const sortedTiles = [...chamber.tiles].sort((a, b) => {
            const distA = Math.abs(a.x - chamber.center.x) + Math.abs(a.y - chamber.center.y);
            const distB = Math.abs(b.x - chamber.center.x) + Math.abs(b.y - chamber.center.y);
            return distA - distB;
        });

        for (const tile of sortedTiles) {
            const worldX = room.floorX + tile.x;
            const worldY = room.floorY + tile.y;
            if (isValidFloorTile(worldX, worldY)) {
                return { x: worldX, y: worldY };
            }
        }

        return null;
    };

    // Use the pre-marked safe chamber if available
    if (room.safeChamber) {
        const validPos = findValidTileInChamber(room.safeChamber);
        if (validPos) return validPos;
    }

    // Fallback: try first chamber
    if (room.chambers && room.chambers.length > 0) {
        const validPos = findValidTileInChamber(room.chambers[0]);
        if (validPos) return validPos;
    }

    // Final fallback: search for any valid floor tile near room center
    const centerX = room.floorX + Math.floor(room.floorWidth / 2);
    const centerY = room.floorY + Math.floor(room.floorHeight / 2);

    // Spiral search outward from center to find a floor tile
    for (let radius = 0; radius < Math.max(room.floorWidth, room.floorHeight); radius++) {
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue; // Only check perimeter
                const testX = centerX + dx;
                const testY = centerY + dy;
                if (isValidFloorTile(testX, testY)) {
                    return { x: testX, y: testY };
                }
            }
        }
    }

    // Absolute fallback (shouldn't happen)
    console.warn('[ChamberGen] Could not find valid floor tile for spawn!');
    return { x: centerX, y: centerY };
}

/**
 * Check if a position is within the safe chamber
 * @param {Object} room - Room to check
 * @param {number} x - World X coordinate
 * @param {number} y - World Y coordinate
 * @returns {boolean} True if in safe chamber
 */
function isInSafeChamber(room, x, y) {
    if (!room.safeChamber || !room.safeChamber.tiles) return false;

    const localX = x - room.floorX;
    const localY = y - room.floorY;

    return room.safeChamber.tiles.some(t => t.x === localX && t.y === localY);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.CHAMBER_CONFIG = CHAMBER_CONFIG;
    window.CHAMBER_STATS = CHAMBER_STATS;
    window.generateChambers = generateChambers;
    window.getSafeSpawnChamber = getSafeSpawnChamber;
    window.isInSafeChamber = isInSafeChamber;
    window.findSafestChamber = findSafestChamber;
}

console.log('✅ Chamber generator loaded (cellular automata)');
