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
    initialWallChance: 0.45,       // 45% walls initially
    smoothingPasses: 4,            // Number of cellular automata passes
    wallThreshold: 5,              // Neighbors needed to become/stay wall
    floorThreshold: 4,             // Neighbors needed to become floor
    minChambers: 4,                // Minimum chambers per room
    maxChambers: 10,               // Maximum chambers per room
    targetChambers: 7,             // Target ~6-8 chambers
    minChamberSize: 16,            // Minimum tiles for a valid chamber
    corridorWidth: 2,              // Width of connecting corridors
    edgeBuffer: 2,                 // Keep edges clear for doorways
    debugLogging: true
};

// ============================================================================
// MAIN CHAMBER GENERATION
// ============================================================================

/**
 * Generate chambers within a room using cellular automata
 * @param {Object} room - Room to generate chambers in
 */
function generateChambers(room) {
    if (!room) return;

    // Skip entrance rooms - keep them open for safe spawning
    if (room.type === 'entrance') {
        if (CHAMBER_CONFIG.debugLogging) {
            console.log('[ChamberGen] Skipping entrance room');
        }
        return;
    }

    const width = room.floorWidth;
    const height = room.floorHeight;

    if (CHAMBER_CONFIG.debugLogging) {
        console.log(`[ChamberGen] Generating chambers for ${room.type} room (${width}x${height})`);
    }

    // Find doorway positions relative to room floor
    const doorwayTiles = findDoorwayTiles(room);

    // Initialize chamber grid
    let grid = initializeChamberGrid(width, height, doorwayTiles);

    // Run cellular automata smoothing
    for (let i = 0; i < CHAMBER_CONFIG.smoothingPasses; i++) {
        grid = smoothChamberGrid(grid, width, height, doorwayTiles);
    }

    // Ensure doorway connectivity
    ensureDoorwayConnectivity(grid, width, height, doorwayTiles);

    // Identify distinct chambers
    const chambers = identifyChambers(grid, width, height);

    // Connect isolated chambers
    connectIsolatedChambers(grid, width, height, chambers, doorwayTiles);

    // Apply grid to game map
    applyChamberGridToRoom(grid, room);

    // Store chamber data on room
    room.chambers = chambers;
    room.chamberGrid = grid;

    if (CHAMBER_CONFIG.debugLogging) {
        console.log(`[ChamberGen] Created ${chambers.length} chambers`);
    }
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
 * Find tiles that are part of doorways (relative to room floor)
 */
function findDoorwayTiles(room) {
    const tiles = [];

    if (!room.doorways) return tiles;

    for (const doorway of room.doorways) {
        // Convert doorway world coords to room-relative coords
        for (let dy = 0; dy < doorway.height; dy++) {
            for (let dx = 0; dx < doorway.width; dx++) {
                const worldX = doorway.x + dx;
                const worldY = doorway.y + dy;

                // Check if this doorway tile is within room floor
                if (worldX >= room.floorX && worldX < room.floorX + room.floorWidth &&
                    worldY >= room.floorY && worldY < room.floorY + room.floorHeight) {
                    tiles.push({
                        x: worldX - room.floorX,
                        y: worldY - room.floorY,
                        worldX: worldX,
                        worldY: worldY
                    });
                }
            }
        }

        // Also mark the cells adjacent to doorways (ensure access path)
        const adjacentOffsets = [
            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
            { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
            { dx: 0, dy: -2 }, { dx: 0, dy: 2 },
            { dx: -2, dy: 0 }, { dx: 2, dy: 0 }
        ];

        for (let dy = 0; dy < doorway.height; dy++) {
            for (let dx = 0; dx < doorway.width; dx++) {
                const baseX = doorway.x + dx - room.floorX;
                const baseY = doorway.y + dy - room.floorY;

                for (const offset of adjacentOffsets) {
                    const adjX = baseX + offset.dx;
                    const adjY = baseY + offset.dy;

                    if (adjX >= 0 && adjX < room.floorWidth &&
                        adjY >= 0 && adjY < room.floorHeight) {
                        // Check not already in tiles
                        if (!tiles.some(t => t.x === adjX && t.y === adjY)) {
                            tiles.push({
                                x: adjX,
                                y: adjY,
                                worldX: room.floorX + adjX,
                                worldY: room.floorY + adjY
                            });
                        }
                    }
                }
            }
        }
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
    for (let y = 0; y < room.floorHeight; y++) {
        for (let x = 0; x < room.floorWidth; x++) {
            const worldX = room.floorX + x;
            const worldY = room.floorY + y;

            if (!game.map[worldY] || !game.map[worldY][worldX]) continue;

            if (grid[y][x] === 1) {
                // Interior wall
                game.map[worldY][worldX] = {
                    type: 'interior_wall',
                    room: room,
                    element: room.element,
                    blocked: true
                };
            }
            // Floor tiles were already placed by placeRoomFloorTiles()
        }
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a safe spawn position within a room (furthest from doorways)
 */
function getSafeSpawnChamber(room) {
    if (!room.chambers || room.chambers.length === 0) {
        // No chambers, return room center
        return {
            x: room.floorX + Math.floor(room.floorWidth / 2),
            y: room.floorY + Math.floor(room.floorHeight / 2)
        };
    }

    // Find chamber furthest from all doorways
    let bestChamber = room.chambers[0];
    let maxMinDist = 0;

    for (const chamber of room.chambers) {
        let minDistToDoor = Infinity;

        for (const doorway of room.doorways || []) {
            const doorCenter = {
                x: doorway.x + doorway.width / 2 - room.floorX,
                y: doorway.y + doorway.height / 2 - room.floorY
            };

            const dist = Math.abs(chamber.center.x - doorCenter.x) +
                        Math.abs(chamber.center.y - doorCenter.y);

            if (dist < minDistToDoor) {
                minDistToDoor = dist;
            }
        }

        if (minDistToDoor > maxMinDist) {
            maxMinDist = minDistToDoor;
            bestChamber = chamber;
        }
    }

    // Return world coordinates of safe chamber center
    return {
        x: room.floorX + bestChamber.center.x,
        y: room.floorY + bestChamber.center.y
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.CHAMBER_CONFIG = CHAMBER_CONFIG;
    window.generateChambers = generateChambers;
    window.getSafeSpawnChamber = getSafeSpawnChamber;
}

console.log('✅ Chamber generator loaded (cellular automata)');
