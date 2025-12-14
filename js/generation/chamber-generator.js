// ============================================================================
// CHAMBER GENERATOR - The Shifting Chasm
// ============================================================================
// Uses BSP (Binary Space Partitioning) + Cellular Automata
// - BSP creates 5-7 distinct chambers (guaranteed subdivision)
// - CA adds organic interior detail within each chamber
// ============================================================================

// ============================================================================
// CONFIGURATION
// ============================================================================

const CHAMBER_CONFIG = {
    // BSP Settings
    targetSections: 4,             // Target 4 sections (realistic for 36x36 rooms)
    minSectionSize: 12,            // Minimum 12x12 for CA to work
    splitVariance: 0.2,            // Split at 40-60% (0.5 ± 0.2)

    // CA Settings (very light, for interior detail only)
    initialWallChance: 0.20,       // Very light interior texture (reduced from 0.30)
    smoothingPasses: 3,            // Moderate smoothing
    wallThreshold: 4,              // B4: floors become walls on 4+ neighbors
    floorThreshold: 4,             // S4: walls survive on 4+ neighbors

    // Corridor Settings
    corridorWidth: 2,              // 2-tile wide corridors
    corridorsPerBoundary: 1,       // Fixed 1 corridor per boundary (was 1-3 random)

    // Doorway Settings
    doorwayClearance: 2,           // 2 tiles clear in all directions
    maxRegenAttempts: 5,           // Max room regeneration attempts

    // Dead End Settings
    deadEndRatio: 0.25,            // 25% of sections as dead ends

    // System
    debugLogging: false,
    trackStats: false
};

// Statistics tracking
const CHAMBER_STATS = {
    enabled: false,
    data: {
        bspSections: [],           // Section count per room
        sectionSizes: [],          // Individual section sizes
        corridorCounts: [],        // Corridor count per room
        deadEndCounts: [],         // Dead end count per room
        wallDensities: [],         // Final wall density per room
        regenAttempts: [],         // Regeneration attempts per room
        splitDepths: []            // BSP tree depths
    },

    reset() {
        for (const key in this.data) {
            this.data[key] = [];
        }
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
// MAIN CHAMBER GENERATION (BSP + CA)
// ============================================================================

/**
 * Generate chambers within a room using BSP + CA
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
        console.log(`[ChamberGen] Generating BSP+CA chambers for ${room.type} room`);
        console.log(`[ChamberGen] Floor size: ${width}x${height}`);
    }

    let attempts = 0;
    let success = false;
    let grid, sections, corridors;

    // Try to generate valid layout (with doorway connectivity)
    while (!success && attempts < CHAMBER_CONFIG.maxRegenAttempts) {
        attempts++;

        // 1. BSP Subdivision
        sections = binarySpacePartition(width, height);

        // 2. Apply CA to each section
        grid = Array(height).fill(null).map(() => Array(width).fill(1)); // Start with walls
        for (const section of sections) {
            applyCellularAutomataToSection(grid, section, width, height);
        }

        // 3. Carve corridors between sections
        corridors = carveCorridorsBetweenSections(grid, sections, width, height);

        // 4. Validate doorway connectivity
        success = validateDoorwayConnectivity(grid, room, width, height);

        if (!success && CHAMBER_CONFIG.debugLogging) {
            console.log(`[ChamberGen] Attempt ${attempts} failed connectivity test, regenerating...`);
        }
    }

    if (!success) {
        console.warn(`[ChamberGen] Failed to generate valid layout after ${attempts} attempts, using last attempt`);
    }

    CHAMBER_STATS.record('regenAttempts', attempts);

    // Apply grid to game map
    applyChamberGridToRoom(grid, room);

    // Identify chambers (connected floor regions)
    const chambers = identifyChambers(grid, width, height);

    // Store data on room
    room.chambers = chambers;
    room.chamberGrid = grid;
    room.bspSections = sections;
    room.corridors = corridors;

    // Mark safe chamber
    if (chambers.length > 0) {
        const doorwayTiles = findDoorwayTiles(room);
        room.safeChamber = findSafestChamber(chambers, doorwayTiles, room);
        if (room.safeChamber) {
            room.safeChamber.isSafe = true;
        }
    }

    // Track statistics
    trackRoomStatistics(room, sections, corridors, grid, width, height);

    if (CHAMBER_CONFIG.debugLogging) {
        console.log(`[ChamberGen] Created ${sections.length} BSP sections, ${chambers.length} chambers`);
        console.log(`[ChamberGen] Regeneration attempts: ${attempts}`);
        console.log(`[ChamberGen] ========================================`);
    }
}

// ============================================================================
// BSP (BINARY SPACE PARTITIONING)
// ============================================================================

/**
 * Subdivide space using recursive BSP
 * @returns {Array} Array of section objects
 */
function binarySpacePartition(width, height) {
    const sections = [];
    const targetCount = CHAMBER_CONFIG.targetSections;
    const minSize = CHAMBER_CONFIG.minSectionSize;

    // Start with full area
    const root = {
        x: 0,
        y: 0,
        width: width,
        height: height,
        id: 0,
        depth: 0
    };

    const toSplit = [root];
    let nextId = 1;

    // Keep splitting until we have enough sections
    while (toSplit.length + sections.length < targetCount && toSplit.length > 0) {
        // Pick a random section to split
        const index = Math.floor(Math.random() * toSplit.length);
        const section = toSplit.splice(index, 1)[0];

        // Determine split direction (prefer alternating, but allow random)
        const preferHorizontal = section.depth % 2 === 0;
        const canSplitH = section.height >= minSize * 2;
        const canSplitV = section.width >= minSize * 2;

        let splitHorizontal;
        if (canSplitH && !canSplitV) {
            splitHorizontal = true;
        } else if (!canSplitH && canSplitV) {
            splitHorizontal = false;
        } else if (canSplitH && canSplitV) {
            // Both possible, prefer based on depth but randomize
            splitHorizontal = Math.random() < (preferHorizontal ? 0.7 : 0.3);
        } else {
            // Can't split, add as final section
            sections.push(section);
            continue;
        }

        // Calculate split position (40-60% with variance)
        const variance = CHAMBER_CONFIG.splitVariance;
        const splitRatio = 0.5 + (Math.random() - 0.5) * variance * 2;

        if (splitHorizontal) {
            const splitY = Math.floor(section.y + section.height * splitRatio);
            const height1 = splitY - section.y;
            const height2 = section.y + section.height - splitY;

            if (height1 >= minSize && height2 >= minSize) {
                const child1 = {
                    x: section.x,
                    y: section.y,
                    width: section.width,
                    height: height1,
                    id: nextId++,
                    depth: section.depth + 1,
                    parent: section
                };
                const child2 = {
                    x: section.x,
                    y: splitY,
                    width: section.width,
                    height: height2,
                    id: nextId++,
                    depth: section.depth + 1,
                    parent: section
                };
                toSplit.push(child1, child2);
            } else {
                sections.push(section);
            }
        } else {
            const splitX = Math.floor(section.x + section.width * splitRatio);
            const width1 = splitX - section.x;
            const width2 = section.x + section.width - splitX;

            if (width1 >= minSize && width2 >= minSize) {
                const child1 = {
                    x: section.x,
                    y: section.y,
                    width: width1,
                    height: section.height,
                    id: nextId++,
                    depth: section.depth + 1,
                    parent: section
                };
                const child2 = {
                    x: splitX,
                    y: section.y,
                    width: width2,
                    height: section.height,
                    id: nextId++,
                    depth: section.depth + 1,
                    parent: section
                };
                toSplit.push(child1, child2);
            } else {
                sections.push(section);
            }
        }
    }

    // Add any remaining unsplit sections
    sections.push(...toSplit);

    // Add neighbor tracking for corridor generation
    for (const section of sections) {
        section.neighbors = findNeighboringSections(section, sections);
    }

    return sections;
}

/**
 * Find neighboring sections (share a boundary)
 */
function findNeighboringSections(section, allSections) {
    const neighbors = [];

    for (const other of allSections) {
        if (other === section) continue;

        // Check if sections share a boundary
        const shareVertical = (
            section.x + section.width === other.x ||
            other.x + other.width === section.x
        ) && !(
            section.y >= other.y + other.height ||
            section.y + section.height <= other.y
        );

        const shareHorizontal = (
            section.y + section.height === other.y ||
            other.y + other.height === section.y
        ) && !(
            section.x >= other.x + other.width ||
            section.x + section.width <= other.x
        );

        if (shareVertical || shareHorizontal) {
            neighbors.push({
                section: other,
                vertical: shareVertical,
                horizontal: shareHorizontal
            });
        }
    }

    return neighbors;
}

// ============================================================================
// CELLULAR AUTOMATA (APPLIED PER SECTION)
// ============================================================================

/**
 * Apply light CA to a single section for organic interior
 */
function applyCellularAutomataToSection(grid, section, gridWidth, gridHeight) {
    const { x, y, width, height } = section;

    // Initialize section with random walls
    for (let sy = 0; sy < height; sy++) {
        for (let sx = 0; sx < width; sx++) {
            const gx = x + sx;
            const gy = y + sy;
            if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
                grid[gy][gx] = Math.random() < CHAMBER_CONFIG.initialWallChance ? 1 : 0;
            }
        }
    }

    // Run CA smoothing passes
    for (let pass = 0; pass < CHAMBER_CONFIG.smoothingPasses; pass++) {
        const newGrid = grid.map(row => [...row]);

        for (let sy = 0; sy < height; sy++) {
            for (let sx = 0; sx < width; sx++) {
                const gx = x + sx;
                const gy = y + sy;
                if (gx < 0 || gx >= gridWidth || gy < 0 || gy >= gridHeight) continue;

                // Count wall neighbors
                let wallCount = 0;
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (dx === 0 && dy === 0) continue;
                        const nx = gx + dx;
                        const ny = gy + dy;

                        // Out of bounds or out of section = wall
                        if (nx < x || nx >= x + width || ny < y || ny >= y + height) {
                            wallCount++;
                        } else if (nx >= 0 && nx < gridWidth && ny >= 0 && ny < gridHeight) {
                            if (grid[ny][nx] === 1) wallCount++;
                        }
                    }
                }

                // Apply B4/S4 rules
                if (grid[gy][gx] === 1) {
                    // Wall survives if 4+ neighbors
                    newGrid[gy][gx] = wallCount >= CHAMBER_CONFIG.floorThreshold ? 1 : 0;
                } else {
                    // Floor becomes wall if 4+ neighbors
                    newGrid[gy][gx] = wallCount >= CHAMBER_CONFIG.wallThreshold ? 1 : 0;
                }
            }
        }

        // Copy new grid to grid (only within section bounds)
        for (let sy = 0; sy < height; sy++) {
            for (let sx = 0; sx < width; sx++) {
                const gx = x + sx;
                const gy = y + sy;
                if (gx >= 0 && gx < gridWidth && gy >= 0 && gy < gridHeight) {
                    grid[gy][gx] = newGrid[gy][gx];
                }
            }
        }
    }
}

// ============================================================================
// CORRIDOR CARVING
// ============================================================================

/**
 * Carve corridors between BSP sections
 * FIXED: Avoid duplicates, enforce dead ends
 */
function carveCorridorsBetweenSections(grid, sections, width, height) {
    const corridors = [];
    const sectionConnections = sections.map(() => 0);
    const connectedPairs = new Set(); // Track which pairs already have corridors

    // First pass: Connect all sections with at least 1 corridor
    // This ensures connectivity before enforcing dead ends
    for (const section of sections) {
        // Ensure each section has at least 1 connection
        if (sectionConnections[section.id] > 0) continue;

        // Find first available neighbor to connect to
        for (const neighbor of section.neighbors) {
            const pairKey = [section.id, neighbor.section.id].sort((a, b) => a - b).join('-');
            if (connectedPairs.has(pairKey)) continue;

            const corridor = carveCorridorBetweenSections(
                grid, section, neighbor.section, neighbor.vertical, width, height
            );

            if (corridor) {
                corridors.push(corridor);
                connectedPairs.add(pairKey);
                sectionConnections[section.id]++;
                sectionConnections[neighbor.section.id]++;
                break; // Only need 1 connection per section for now
            }
        }
    }

    // Second pass: Add additional connections (non-dead-end sections get 2+ connections)
    const deadEndTarget = Math.max(1, Math.round(sections.length * CHAMBER_CONFIG.deadEndRatio));
    let currentDeadEnds = sectionConnections.filter(count => count === 1).length;

    // Shuffle sections to randomize which ones get extra connections
    const shuffledSections = [...sections].sort(() => Math.random() - 0.5);

    for (const section of shuffledSections) {
        // Count current dead ends
        currentDeadEnds = sectionConnections.filter(count => count === 1).length;

        // If we have too many dead ends, add connections to this section
        // If we're at or below target, only add if this section already has 2+ connections
        if (currentDeadEnds > deadEndTarget || sectionConnections[section.id] >= 2) {
            // Try to add more connections
            for (const neighbor of section.neighbors) {
                // Skip if we have enough connections (limit to 2-3 per section)
                if (sectionConnections[section.id] >= 3) break;

                const pairKey = [section.id, neighbor.section.id].sort((a, b) => a - b).join('-');
                if (connectedPairs.has(pairKey)) continue;

                const corridor = carveCorridorBetweenSections(
                    grid, section, neighbor.section, neighbor.vertical, width, height
                );

                if (corridor) {
                    corridors.push(corridor);
                    connectedPairs.add(pairKey);

                    // Update connection counts
                    sectionConnections[section.id]++;
                    sectionConnections[neighbor.section.id]++;

                    // Check if we've reached target dead ends
                    currentDeadEnds = sectionConnections.filter(count => count === 1).length;
                    if (currentDeadEnds <= deadEndTarget && sectionConnections[section.id] >= 2) {
                        break; // This section is good enough
                    }
                }
            }
        }
    }

    return corridors;
}

/**
 * Carve a single corridor between two sections
 */
function carveCorridorBetweenSections(grid, section1, section2, isVertical, gridWidth, gridHeight) {
    const corridorWidth = CHAMBER_CONFIG.corridorWidth;
    let corridor = null;

    if (isVertical) {
        // Sections are side-by-side (vertical boundary)
        const boundaryX = section1.x + section1.width === section2.x ? section1.x + section1.width : section2.x + section2.width;
        const overlapStart = Math.max(section1.y, section2.y);
        const overlapEnd = Math.min(section1.y + section1.height, section2.y + section2.height);
        const overlapSize = overlapEnd - overlapStart;

        if (overlapSize > corridorWidth) {
            // Random position along overlap
            const corridorY = overlapStart + Math.floor(Math.random() * (overlapSize - corridorWidth));

            // Carve corridor
            for (let y = corridorY; y < corridorY + corridorWidth; y++) {
                // Carve left of boundary (in section1)
                for (let x = boundaryX - corridorWidth; x < boundaryX; x++) {
                    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                        grid[y][x] = 0;
                    }
                }
                // Carve right of boundary (in section2)
                for (let x = boundaryX; x < boundaryX + corridorWidth; x++) {
                    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                        grid[y][x] = 0;
                    }
                }
            }

            corridor = {
                x: boundaryX - corridorWidth,
                y: corridorY,
                width: corridorWidth * 2,
                height: corridorWidth,
                orientation: 'vertical'
            };
        }
    } else {
        // Sections are above/below (horizontal boundary)
        const boundaryY = section1.y + section1.height === section2.y ? section1.y + section1.height : section2.y + section2.height;
        const overlapStart = Math.max(section1.x, section2.x);
        const overlapEnd = Math.min(section1.x + section1.width, section2.x + section2.width);
        const overlapSize = overlapEnd - overlapStart;

        if (overlapSize > corridorWidth) {
            // Random position along overlap
            const corridorX = overlapStart + Math.floor(Math.random() * (overlapSize - corridorWidth));

            // Carve corridor
            for (let x = corridorX; x < corridorX + corridorWidth; x++) {
                // Carve above boundary (in section1)
                for (let y = boundaryY - corridorWidth; y < boundaryY; y++) {
                    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                        grid[y][x] = 0;
                    }
                }
                // Carve below boundary (in section2)
                for (let y = boundaryY; y < boundaryY + corridorWidth; y++) {
                    if (x >= 0 && x < gridWidth && y >= 0 && y < gridHeight) {
                        grid[y][x] = 0;
                    }
                }
            }

            corridor = {
                x: corridorX,
                y: boundaryY - corridorWidth,
                width: corridorWidth,
                height: corridorWidth * 2,
                orientation: 'horizontal'
            };
        }
    }

    return corridor;
}

// ============================================================================
// DOORWAY VALIDATION
// ============================================================================

/**
 * Validate that doorways connect to playable space
 * Also ensures 2-tile clearance around doorways
 */
function validateDoorwayConnectivity(grid, room, width, height) {
    const doorwayTiles = findDoorwayTiles(room);

    if (doorwayTiles.length === 0) {
        return true; // No doorways to validate
    }

    // Ensure doorway clearance - be MORE aggressive
    for (const doorTile of doorwayTiles) {
        const clearance = CHAMBER_CONFIG.doorwayClearance;

        // Clear area around doorway
        for (let dy = -clearance; dy <= clearance; dy++) {
            for (let dx = -clearance; dx <= clearance; dx++) {
                const x = doorTile.x + dx;
                const y = doorTile.y + dy;
                if (x >= 0 && x < width && y >= 0 && y < height) {
                    grid[y][x] = 0; // Force floor
                }
            }
        }

        // EXTRA: Clear a path into the room from doorway edges
        if (doorTile.y === 0) {
            // North doorway - clear path downward
            for (let i = 0; i < 4; i++) {
                if (doorTile.y + i < height) {
                    grid[doorTile.y + i][doorTile.x] = 0;
                    if (doorTile.x > 0) grid[doorTile.y + i][doorTile.x - 1] = 0;
                    if (doorTile.x < width - 1) grid[doorTile.y + i][doorTile.x + 1] = 0;
                }
            }
        } else if (doorTile.y === height - 1) {
            // South doorway - clear path upward
            for (let i = 0; i < 4; i++) {
                if (doorTile.y - i >= 0) {
                    grid[doorTile.y - i][doorTile.x] = 0;
                    if (doorTile.x > 0) grid[doorTile.y - i][doorTile.x - 1] = 0;
                    if (doorTile.x < width - 1) grid[doorTile.y - i][doorTile.x + 1] = 0;
                }
            }
        }
        if (doorTile.x === 0) {
            // West doorway - clear path rightward
            for (let i = 0; i < 4; i++) {
                if (doorTile.x + i < width) {
                    grid[doorTile.y][doorTile.x + i] = 0;
                    if (doorTile.y > 0) grid[doorTile.y - 1][doorTile.x + i] = 0;
                    if (doorTile.y < height - 1) grid[doorTile.y + 1][doorTile.x + i] = 0;
                }
            }
        } else if (doorTile.x === width - 1) {
            // East doorway - clear path leftward
            for (let i = 0; i < 4; i++) {
                if (doorTile.x - i >= 0) {
                    grid[doorTile.y][doorTile.x - i] = 0;
                    if (doorTile.y > 0) grid[doorTile.y - 1][doorTile.x - i] = 0;
                    if (doorTile.y < height - 1) grid[doorTile.y + 1][doorTile.x - i] = 0;
                }
            }
        }
    }

    // Flood fill from first doorway
    const start = doorwayTiles[0];
    const reachable = floodFill(grid, width, height, start.x, start.y);

    // Check if all doorways are reachable from first one
    for (let i = 1; i < doorwayTiles.length; i++) {
        const door = doorwayTiles[i];
        if (!reachable.has(`${door.x},${door.y}`)) {
            if (CHAMBER_CONFIG.debugLogging) {
                console.warn(`[ChamberGen] Doorway at (${door.x}, ${door.y}) not reachable!`);
            }
            return false; // Doorway not connected
        }
    }

    return true;
}

/**
 * Find floor tiles that connect to doorways (relative to room floor)
 */
function findDoorwayTiles(room) {
    const tiles = [];
    const tileSet = new Set();

    if (!room.doorways || room.doorways.length === 0) {
        return tiles;
    }

    const addTile = (localX, localY) => {
        if (localX < 0 || localX >= room.floorWidth ||
            localY < 0 || localY >= room.floorHeight) {
            return;
        }
        const key = `${localX},${localY}`;
        if (!tileSet.has(key)) {
            tileSet.add(key);
            tiles.push({ x: localX, y: localY });
        }
    };

    for (const doorway of room.doorways) {
        const side = doorway.side;

        for (let i = 0; i < (doorway.orientation === 'horizontal' ? doorway.width : doorway.height); i++) {
            let entryX, entryY;

            if (side === 'north') {
                entryX = doorway.x + i - room.floorX;
                entryY = 0;
            } else if (side === 'south') {
                entryX = doorway.x + i - room.floorX;
                entryY = room.floorHeight - 1;
            } else if (side === 'west') {
                entryX = 0;
                entryY = doorway.y + i - room.floorY;
            } else if (side === 'east') {
                entryX = room.floorWidth - 1;
                entryY = doorway.y + i - room.floorY;
            }

            addTile(entryX, entryY);
        }
    }

    return tiles;
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

        stack.push({ x: x + 1, y: y });
        stack.push({ x: x - 1, y: y });
        stack.push({ x: x, y: y + 1 });
        stack.push({ x: x, y: y - 1 });
    }

    return reachable;
}

// ============================================================================
// CHAMBER IDENTIFICATION
// ============================================================================

/**
 * Identify distinct chambers using flood fill (same as before)
 */
function identifyChambers(grid, width, height) {
    const chambers = [];
    const visited = new Set();

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x] === 1) continue; // Wall
            if (visited.has(`${x},${y}`)) continue;

            // Found new chamber
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

            // All chambers are valid (no minimum size for BSP-based generation)
            if (chamberTiles.length > 0) {
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
 * Find the chamber furthest from all doorways
 */
function findSafestChamber(chambers, doorwayTiles, room) {
    if (!chambers || chambers.length === 0) return null;
    if (!doorwayTiles || doorwayTiles.length === 0) return chambers[0];

    let safestChamber = null;
    let maxMinDistance = -1;

    for (const chamber of chambers) {
        let minDistToDoor = Infinity;

        for (const doorTile of doorwayTiles) {
            const dist = Math.abs(chamber.center.x - doorTile.x) +
                        Math.abs(chamber.center.y - doorTile.y);
            if (dist < minDistToDoor) {
                minDistToDoor = dist;
            }
        }

        if (minDistToDoor > maxMinDistance) {
            maxMinDistance = minDistToDoor;
            safestChamber = chamber;
        }
    }

    return safestChamber;
}

// ============================================================================
// APPLY TO GAME MAP
// ============================================================================

/**
 * Apply chamber grid to game map
 */
function applyChamberGridToRoom(grid, room) {
    // First, identify doorway edge tiles that must stay as floors
    const doorwayEdgeTiles = new Set();
    const doorwayTiles = findDoorwayTiles(room);
    const clearance = CHAMBER_CONFIG.doorwayClearance;

    for (const doorTile of doorwayTiles) {
        // Mark tiles around doorway as protected
        for (let dy = -clearance; dy <= clearance; dy++) {
            for (let dx = -clearance; dx <= clearance; dx++) {
                const x = doorTile.x + dx;
                const y = doorTile.y + dy;
                if (x >= 0 && x < room.floorWidth && y >= 0 && y < room.floorHeight) {
                    doorwayEdgeTiles.add(`${x},${y}`);
                }
            }
        }
    }

    // Apply grid to map, but protect doorway edges
    for (let y = 0; y < room.floorHeight; y++) {
        for (let x = 0; x < room.floorWidth; x++) {
            const worldX = room.floorX + x;
            const worldY = room.floorY + y;

            if (!game.map[worldY] || !game.map[worldY][worldX]) continue;

            // CRITICAL: Never place walls at doorway edges
            const isProtected = doorwayEdgeTiles.has(`${x},${y}`);

            if (grid[y][x] === 1 && !isProtected) {
                // Interior wall (only if not protecting a doorway)
                game.map[worldY][worldX] = {
                    type: 'interior_wall',
                    room: room,
                    element: room.element,
                    blocked: true
                };
            } else if (isProtected) {
                // Force floor at doorway edges
                if (game.map[worldY][worldX].type !== 'floor') {
                    game.map[worldY][worldX] = {
                        type: 'floor',
                        room: room,
                        element: room.element,
                        floorColor: room.floorColor,
                        accentColor: room.accentColor
                    };
                }
            }
            // Floor tiles already placed by placeRoomFloorTiles()
        }
    }
}

// ============================================================================
// STATISTICS TRACKING
// ============================================================================

function trackRoomStatistics(room, sections, corridors, grid, width, height) {
    if (!CHAMBER_STATS.enabled) return;

    // Section count
    CHAMBER_STATS.record('bspSections', sections.length);

    // Section sizes
    const sizes = sections.map(s => s.width * s.height);
    CHAMBER_STATS.record('sectionSizes', sizes);

    // Corridor count
    CHAMBER_STATS.record('corridorCounts', corridors.length);

    // Wall density
    let wallCount = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (grid[y][x] === 1) wallCount++;
        }
    }
    CHAMBER_STATS.record('wallDensities', wallCount / (width * height));

    // Dead ends (sections with only 1 connection)
    let deadEnds = 0;
    for (const section of sections) {
        const connections = corridors.filter(c =>
            (c.x >= section.x && c.x < section.x + section.width &&
             c.y >= section.y && c.y < section.y + section.height)
        ).length;
        if (connections <= 1) deadEnds++;
    }
    CHAMBER_STATS.record('deadEndCounts', deadEnds);

    // Max split depth
    const maxDepth = Math.max(...sections.map(s => s.depth || 0));
    CHAMBER_STATS.record('splitDepths', maxDepth);
}

// ============================================================================
// SAFE SPAWN UTILITY
// ============================================================================

function getSafeSpawnChamber(room) {
    if (room.safeChamber && room.safeChamber.tiles && room.safeChamber.tiles.length > 0) {
        // Use center of safe chamber
        const tile = room.safeChamber.tiles[Math.floor(room.safeChamber.tiles.length / 2)];
        return {
            x: room.floorX + tile.x,
            y: room.floorY + tile.y
        };
    }

    // Fallback: room center
    return {
        x: room.floorX + Math.floor(room.floorWidth / 2),
        y: room.floorY + Math.floor(room.floorHeight / 2)
    };
}

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
}

// Chamber generator loaded (BSP + Cellular Automata)
