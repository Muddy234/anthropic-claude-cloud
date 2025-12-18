// ============================================================================
// DUNGEON GENERATOR - Blob-based BSP System
// ============================================================================
// Uses BSP to partition 180×180 space, grows organic blobs in each leaf,
// connects with dogleg corridors. Themes transition at corridor midpoints.
// ============================================================================

const DUNGEON_CONFIG = {
    // Map dimensions
    mapWidth: 180,
    mapHeight: 180,

    // BSP settings
    minLeafSize: 20,        // Minimum 20×20 leaves
    leafPadding: 4,         // Keep blobs away from leaf edges

    // Blob settings
    blobFillRatio: 0.5,     // Fill 50% of leaf area
    minBlobSize: 100,       // Minimum 100 tiles per blob
    maxGrowthAttempts: 2000,

    // Corridor settings
    corridorWidth: 2,
    corridorWobble: 0.10,   // 10% chance to widen
    doglegThreshold: 15,    // Use dogleg for distances > 15
    doglegOffset: 5,        // Max chaotic offset for waypoints

    // Blob type distribution
    treasureBlobRatio: 0.15, // 15% of blobs are treasure (reduced to make room for shrines)

    // Shrine settings
    minShrines: 2,          // Minimum shrines per floor
    maxShrines: 4,          // Maximum shrines per floor
    shrineMinDistance: 0.3, // Shrines must be at least 30% distance from entrance
    maxRegenAttempts: 3,    // Max regeneration attempts if shrine requirements not met

    // Debug
    debugLogging: false,
    validateConnectivity: true
};

// Global dungeon state
const DUNGEON_STATE = {
    root: null,
    blobs: [],
    corridors: [],
    grid: null,
    entranceBlob: null
};

// ============================================================================
// BSP TREE
// ============================================================================

class Leaf {
    constructor(x, y, w, h, depth = 0) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.depth = depth;

        this.child1 = null;
        this.child2 = null;

        this.blob = null;  // Will store blob data
    }

    split() {
        if (this.child1 || this.child2) return false;

        // Determine split direction based on aspect ratio
        let splitHorizontal = Math.random() < 0.5;
        if (this.w > this.h && this.w / this.h >= 1.25) {
            splitHorizontal = false;  // Split vertically
        } else if (this.h > this.w && this.h / this.w >= 1.25) {
            splitHorizontal = true;   // Split horizontally
        }

        const maxSize = (splitHorizontal ? this.h : this.w) - DUNGEON_CONFIG.minLeafSize;
        if (maxSize <= DUNGEON_CONFIG.minLeafSize) return false;

        const splitLoc = DUNGEON_CONFIG.minLeafSize +
            Math.floor(Math.random() * (maxSize - DUNGEON_CONFIG.minLeafSize));

        if (splitHorizontal) {
            this.child1 = new Leaf(this.x, this.y, this.w, splitLoc, this.depth + 1);
            this.child2 = new Leaf(this.x, this.y + splitLoc, this.w, this.h - splitLoc, this.depth + 1);
        } else {
            this.child1 = new Leaf(this.x, this.y, splitLoc, this.h, this.depth + 1);
            this.child2 = new Leaf(this.x + splitLoc, this.y, this.w - splitLoc, this.h, this.depth + 1);
        }

        return true;
    }

    getLeaves() {
        if (this.child1 || this.child2) {
            const leaves = [];
            if (this.child1) leaves.push(...this.child1.getLeaves());
            if (this.child2) leaves.push(...this.child2.getLeaves());
            return leaves;
        }
        return [this];
    }

    getConnectionPoint() {
        if (this.blob) {
            return this.blob.connectionPoint;
        } else if (this.child1 && this.child2) {
            return this.child1.getConnectionPoint();
        } else if (this.child1) {
            return this.child1.getConnectionPoint();
        } else if (this.child2) {
            return this.child2.getConnectionPoint();
        }
        return null;
    }
}

// ============================================================================
// BLOB GROWTH ALGORITHM
// ============================================================================

function growBlob(leaf) {
    const padding = DUNGEON_CONFIG.leafPadding;

    // Pick seed point with padding from edges
    const cx = leaf.x + padding + Math.floor(Math.random() * (leaf.w - padding * 2));
    const cy = leaf.y + padding + Math.floor(Math.random() * (leaf.h - padding * 2));

    const tiles = new Set();
    tiles.add(`${cx},${cy}`);

    // Target size: 50% of leaf area
    const targetArea = Math.max(
        Math.floor(leaf.w * leaf.h * DUNGEON_CONFIG.blobFillRatio),
        DUNGEON_CONFIG.minBlobSize
    );

    // Grow the blob randomly
    let attempts = 0;
    const tilesList = [`${cx},${cy}`];

    while (tiles.size < targetArea && attempts < DUNGEON_CONFIG.maxGrowthAttempts) {
        attempts++;

        // Pick random existing tile
        const tileKey = tilesList[Math.floor(Math.random() * tilesList.length)];
        const [currX, currY] = tileKey.split(',').map(Number);

        // Try to expand in random direction
        const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];
        const [dx, dy] = directions[Math.floor(Math.random() * directions.length)];
        const nx = currX + dx;
        const ny = currY + dy;

        // Check boundaries (stay inside leaf with padding)
        if (nx > leaf.x + padding && nx < leaf.x + leaf.w - padding - 1 &&
            ny > leaf.y + padding && ny < leaf.y + leaf.h - padding - 1) {
            const newKey = `${nx},${ny}`;
            if (!tiles.has(newKey)) {
                tiles.add(newKey);
                tilesList.push(newKey);
            }
        }
    }

    return {
        tiles: tiles,
        connectionPoint: { x: cx, y: cy },
        leaf: leaf,
        element: null,  // Assigned later
        theme: null,    // Assigned later
        blobType: null, // entrance | combat | treasure
        difficulty: 1   // 1-10 based on distance from entrance
    };
}

// ============================================================================
// CORRIDOR GENERATION (DOGLEG PATHS)
// ============================================================================

function createCorridorPath(grid, blob1, blob2) {
    const p1 = blob1.connectionPoint;
    const p2 = blob2.connectionPoint;

    const distance = Math.abs(p2.x - p1.x) + Math.abs(p2.y - p1.y);
    const corridorTiles = new Set();
    const path = [];

    // Use dogleg for long distances
    if (distance > DUNGEON_CONFIG.doglegThreshold) {
        const midX = Math.floor((p1.x + p2.x) / 2);
        const midY = Math.floor((p1.y + p2.y) / 2);

        // Add chaotic offset
        const offset = Math.floor(Math.random() * DUNGEON_CONFIG.doglegOffset * 2) - DUNGEON_CONFIG.doglegOffset;
        const waypoint = {
            x: Math.abs(p2.x - p1.x) > Math.abs(p2.y - p1.y)
                ? midX
                : Math.max(2, Math.min(DUNGEON_CONFIG.mapWidth - 3, midX + offset)),
            y: Math.abs(p2.x - p1.x) > Math.abs(p2.y - p1.y)
                ? Math.max(2, Math.min(DUNGEON_CONFIG.mapHeight - 3, midY + offset))
                : midY
        };

        digBiasedWalk(grid, p1, waypoint, corridorTiles, path);
        digBiasedWalk(grid, waypoint, p2, corridorTiles, path);
    } else {
        digBiasedWalk(grid, p1, p2, corridorTiles, path);
    }

    // Calculate midpoint (for theme transitions)
    const midIndex = Math.floor(path.length / 2);
    const midpoint = path[midIndex] || p1;

    return {
        tiles: corridorTiles,
        startBlob: blob1,
        endBlob: blob2,
        midpoint: midpoint,
        path: path
    };
}

function digBiasedWalk(grid, p1, p2, corridorTiles, path) {
    let x = p1.x;
    let y = p1.y;
    const tx = p2.x;
    const ty = p2.y;

    const corridorWidth = 4; // 4 tiles wide minimum

    // Dig starting position (4 tiles wide)
    digWideCorridorTile(grid, x, y, corridorWidth, corridorTiles);
    path.push({ x, y });

    while (x !== tx || y !== ty) {
        const candidates = [];
        if (x < tx) candidates.push([1, 0]);
        if (x > tx) candidates.push([-1, 0]);
        if (y < ty) candidates.push([0, 1]);
        if (y > ty) candidates.push([0, -1]);

        if (candidates.length === 0) break;

        const [dx, dy] = candidates[Math.floor(Math.random() * candidates.length)];

        x += dx;
        y += dy;

        // Dig 4-tile wide corridor at this position
        digWideCorridorTile(grid, x, y, corridorWidth, corridorTiles);
        path.push({ x, y });
    }
}

/**
 * Dig a wide corridor tile (4x4 area centered on x,y)
 */
function digWideCorridorTile(grid, cx, cy, width, corridorTiles) {
    const halfWidth = Math.floor(width / 2);

    for (let dy = -halfWidth; dy <= halfWidth; dy++) {
        for (let dx = -halfWidth; dx <= halfWidth; dx++) {
            const x = cx + dx;
            const y = cy + dy;

            if (x > 1 && x < DUNGEON_CONFIG.mapWidth - 2 &&
                y > 1 && y < DUNGEON_CONFIG.mapHeight - 2) {
                grid[y][x] = 0;
                corridorTiles.add(`${x},${y}`);
            }
        }
    }
}

// ============================================================================
// BLOB ASSIGNMENT (Priority-based with Shrine Support)
// ============================================================================

/**
 * Count corridor connections for each blob
 * Dead-end blobs have exactly 1 connection
 */
function countBlobConnections(blobs, corridors) {
    const connections = new Map();

    // Initialize all blobs with 0 connections
    for (const blob of blobs) {
        connections.set(blob, 0);
    }

    // Count connections from corridors
    for (const corridor of corridors) {
        if (corridor.startBlob) {
            connections.set(corridor.startBlob, connections.get(corridor.startBlob) + 1);
        }
        if (corridor.endBlob) {
            connections.set(corridor.endBlob, connections.get(corridor.endBlob) + 1);
        }
    }

    return connections;
}

/**
 * Calculate median blob size
 */
function getMedianBlobSize(blobs) {
    const sizes = blobs.map(b => b.tiles.size).sort((a, b) => a - b);
    const mid = Math.floor(sizes.length / 2);
    return sizes.length % 2 !== 0 ? sizes[mid] : (sizes[mid - 1] + sizes[mid]) / 2;
}

/**
 * Score a blob for shrine suitability (higher = better candidate)
 * Prefers: dead ends (1 connection), smaller size, not too close to entrance
 */
function scoreBlobForShrine(blob, connections, medianSize, normalizedDist) {
    let score = 0;

    // Dead end bonus (1 connection = ideal)
    const connectionCount = connections.get(blob) || 0;
    if (connectionCount === 1) {
        score += 100;  // Strong preference for dead ends
    } else if (connectionCount === 2) {
        score += 20;   // Acceptable but not ideal
    }
    // 3+ connections = not suitable (score stays low)

    // Size bonus (smaller is better)
    const sizeRatio = blob.tiles.size / medianSize;
    if (sizeRatio < 0.8) {
        score += 50;   // Below median = good
    } else if (sizeRatio < 1.0) {
        score += 25;   // Near median = okay
    }
    // Above median = no bonus

    // Distance bonus (not too close, not too far)
    if (normalizedDist >= 0.3 && normalizedDist <= 0.8) {
        score += 30;   // Mid-range distance is ideal
    } else if (normalizedDist > 0.8) {
        score += 10;   // Far is okay but treasure is better there
    }
    // Too close (< 0.3) = no bonus

    return score;
}

/**
 * Assign element and theme to a blob
 */
function assignBlobElementAndTheme(blob) {
    const elements = ['fire', 'ice', 'water', 'earth', 'nature', 'death', 'arcane', 'dark', 'holy', 'physical'];
    blob.element = elements[Math.floor(Math.random() * elements.length)];

    const elementThemes = {
        fire: ['magma_chamber', 'ember_crypts'],
        ice: ['frozen_abyss', 'glacial_tombs'],
        water: ['drowned_halls', 'weeping_caverns'],
        earth: ['crystal_caverns', 'stone_sanctum'],
        nature: ['fungal_grotto', 'overgrown_ruins'],
        death: ['bone_ossuary', 'shadow_crypt'],
        arcane: ['runic_vaults', 'shattered_observatory'],
        dark: ['void_chamber', 'lightless_depths'],
        holy: ['sacred_shrine', 'radiant_halls'],
        physical: ['ancient_arena', 'gladiator_pits']
    };

    const themes = elementThemes[blob.element] || ['ancient_arena'];
    blob.theme = themes[Math.floor(Math.random() * themes.length)];
}

/**
 * Main blob property assignment with priority-based hierarchy:
 * 1. ENTRANCE (1) - center-most blob
 * 2. SHRINE (2-4) - dead ends, smaller, mid-distance
 * 3. TREASURE (15%) - far from entrance
 * 4. COMBAT (remainder) - default
 */
function assignBlobProperties(blobs) {
    if (blobs.length === 0) return { shrineCount: 0 };

    const corridors = DUNGEON_STATE.corridors;
    const connections = countBlobConnections(blobs, corridors);
    const medianSize = getMedianBlobSize(blobs);

    // ========================================
    // STEP 1: Assign ENTRANCE (center-most blob)
    // ========================================
    const centerX = DUNGEON_CONFIG.mapWidth / 2;
    const centerY = DUNGEON_CONFIG.mapHeight / 2;

    let entranceBlob = blobs[0];
    let minDist = Infinity;

    for (const blob of blobs) {
        const dist = Math.abs(blob.connectionPoint.x - centerX) +
                     Math.abs(blob.connectionPoint.y - centerY);
        if (dist < minDist) {
            minDist = dist;
            entranceBlob = blob;
        }
    }

    entranceBlob.blobType = 'entrance';
    entranceBlob.element = 'physical';
    entranceBlob.theme = 'ancient_arena';
    entranceBlob.difficulty = 1;
    entranceBlob.corridorConnections = connections.get(entranceBlob) || 0;

    DUNGEON_STATE.entranceBlob = entranceBlob;

    // ========================================
    // Calculate distances and difficulties
    // ========================================
    const distances = new Map();
    const normalizedDistances = new Map();

    for (const blob of blobs) {
        const dist = Math.abs(blob.connectionPoint.x - entranceBlob.connectionPoint.x) +
                     Math.abs(blob.connectionPoint.y - entranceBlob.connectionPoint.y);
        distances.set(blob, dist);
    }

    const maxDist = Math.max(...distances.values());

    for (const blob of blobs) {
        const normalizedDist = maxDist > 0 ? distances.get(blob) / maxDist : 0;
        normalizedDistances.set(blob, normalizedDist);

        // Set difficulty 1-10 based on distance
        blob.difficulty = Math.max(1, Math.min(10, Math.floor(normalizedDist * 10) + 1));
        blob.corridorConnections = connections.get(blob) || 0;
    }

    // ========================================
    // STEP 2: Assign SHRINES (priority selection)
    // ========================================
    const unassignedBlobs = blobs.filter(b => b !== entranceBlob);

    // Score all blobs for shrine suitability
    const shrineScores = [];
    for (const blob of unassignedBlobs) {
        const normalizedDist = normalizedDistances.get(blob);

        // Skip blobs too close to entrance
        if (normalizedDist < DUNGEON_CONFIG.shrineMinDistance) continue;

        const score = scoreBlobForShrine(blob, connections, medianSize, normalizedDist);
        shrineScores.push({ blob, score, normalizedDist });
    }

    // Sort by score (highest first)
    shrineScores.sort((a, b) => b.score - a.score);

    // Select shrines (2-4 based on config)
    const targetShrines = Math.min(
        DUNGEON_CONFIG.maxShrines,
        Math.max(DUNGEON_CONFIG.minShrines, Math.floor(shrineScores.length / 3))
    );

    let shrinesAssigned = 0;
    const shrineBlobs = new Set();

    // First pass: assign ideal candidates (score >= 100, meaning dead ends)
    for (const { blob, score } of shrineScores) {
        if (shrinesAssigned >= DUNGEON_CONFIG.maxShrines) break;
        if (score >= 100) {  // Dead end threshold
            blob.blobType = 'shrine';
            blob.element = 'holy';  // Shrines are always holy element
            blob.theme = 'sacred_shrine';
            shrineBlobs.add(blob);
            shrinesAssigned++;
        }
    }

    // Second pass: if we don't have enough, relax criteria
    if (shrinesAssigned < DUNGEON_CONFIG.minShrines) {
        for (const { blob, score } of shrineScores) {
            if (shrinesAssigned >= DUNGEON_CONFIG.minShrines) break;
            if (shrineBlobs.has(blob)) continue;
            if (score >= 20) {  // Relaxed threshold
                blob.blobType = 'shrine';
                blob.element = 'holy';
                blob.theme = 'sacred_shrine';
                shrineBlobs.add(blob);
                shrinesAssigned++;
            }
        }
    }

    // Third pass: force smallest blobs if still not enough
    if (shrinesAssigned < DUNGEON_CONFIG.minShrines) {
        const remainingBySize = unassignedBlobs
            .filter(b => !shrineBlobs.has(b) && normalizedDistances.get(b) >= DUNGEON_CONFIG.shrineMinDistance)
            .sort((a, b) => a.tiles.size - b.tiles.size);

        for (const blob of remainingBySize) {
            if (shrinesAssigned >= DUNGEON_CONFIG.minShrines) break;
            blob.blobType = 'shrine';
            blob.element = 'holy';
            blob.theme = 'sacred_shrine';
            shrineBlobs.add(blob);
            shrinesAssigned++;
        }
    }

    if (DUNGEON_CONFIG.debugLogging) {
        console.log(`\n⛩️ SHRINE ASSIGNMENT:`);
        console.log(`  Target: ${DUNGEON_CONFIG.minShrines}-${DUNGEON_CONFIG.maxShrines}`);
        console.log(`  Assigned: ${shrinesAssigned}`);
        console.log(`  Dead-end shrines: ${[...shrineBlobs].filter(b => connections.get(b) === 1).length}`);
    }

    // ========================================
    // STEP 3: Assign TREASURE (far blobs)
    // ========================================
    const remainingBlobs = unassignedBlobs.filter(b => !shrineBlobs.has(b));
    const sortedByDistance = [...remainingBlobs].sort(
        (a, b) => normalizedDistances.get(b) - normalizedDistances.get(a)
    );

    const treasureCount = Math.floor(remainingBlobs.length * DUNGEON_CONFIG.treasureBlobRatio);
    let treasureAssigned = 0;
    const treasureBlobs = new Set();

    for (const blob of sortedByDistance) {
        if (treasureAssigned >= treasureCount) break;

        const normalizedDist = normalizedDistances.get(blob);
        if (normalizedDist > 0.5) {  // Treasure should be in far half of dungeon
            blob.blobType = 'treasure';
            assignBlobElementAndTheme(blob);
            treasureBlobs.add(blob);
            treasureAssigned++;
        }
    }

    // ========================================
    // STEP 4: Assign COMBAT (everything else)
    // ========================================
    for (const blob of remainingBlobs) {
        if (treasureBlobs.has(blob)) continue;

        blob.blobType = 'combat';
        assignBlobElementAndTheme(blob);
    }

    return { shrineCount: shrinesAssigned };
}

// ============================================================================
// FLOOD FILL VALIDATION
// ============================================================================

function validateConnectivity(grid) {
    if (!DUNGEON_CONFIG.validateConnectivity) return true;

    const entrance = DUNGEON_STATE.entranceBlob.connectionPoint;
    const reachable = new Set();
    const stack = [{ x: entrance.x, y: entrance.y }];

    while (stack.length > 0) {
        const { x, y } = stack.pop();
        const key = `${x},${y}`;

        if (reachable.has(key)) continue;
        if (x < 0 || x >= DUNGEON_CONFIG.mapWidth || y < 0 || y >= DUNGEON_CONFIG.mapHeight) continue;
        if (grid[y][x] === 1) continue; // Wall

        reachable.add(key);

        stack.push({ x: x + 1, y: y });
        stack.push({ x: x - 1, y: y });
        stack.push({ x: x, y: y + 1 });
        stack.push({ x: x, y: y - 1 });
    }

    // Count total floor tiles
    let totalFloors = 0;
    for (let y = 0; y < DUNGEON_CONFIG.mapHeight; y++) {
        for (let x = 0; x < DUNGEON_CONFIG.mapWidth; x++) {
            if (grid[y][x] === 0) totalFloors++;
        }
    }

    const reachableCount = reachable.size;
    const unreachableCount = totalFloors - reachableCount;
    const connectivityPercent = ((reachableCount / totalFloors) * 100).toFixed(2);

    if (DUNGEON_CONFIG.debugLogging) {
        console.log(`\n🔍 CONNECTIVITY VALIDATION:`);
        console.log(`  Total floor tiles: ${totalFloors}`);
        console.log(`  Reachable from entrance: ${reachableCount} (${connectivityPercent}%)`);
        console.log(`  Unreachable pockets: ${unreachableCount}`);

        if (unreachableCount > 0) {
            console.warn(`  ⚠️  Warning: ${unreachableCount} unreachable tiles detected!`);
        } else {
            console.log(`  ✅ All floor tiles are reachable!`);
        }
    }

    return unreachableCount === 0;
}

// ============================================================================
// MAIN GENERATION
// ============================================================================

/**
 * Internal function to generate a single dungeon attempt
 * @returns {Object} { state, shrineCount }
 */
function generateDungeonAttempt() {
    // 1. Initialize BSP tree
    DUNGEON_STATE.root = new Leaf(0, 0, DUNGEON_CONFIG.mapWidth, DUNGEON_CONFIG.mapHeight);
    const leaves = [DUNGEON_STATE.root];

    // 2. Split leaves
    let didSplit = true;
    while (didSplit) {
        didSplit = false;
        for (const leaf of leaves) {
            if (!leaf.child1 && !leaf.child2) {
                if (leaf.w > DUNGEON_CONFIG.minLeafSize * 2 ||
                    leaf.h > DUNGEON_CONFIG.minLeafSize * 2) {
                    if (leaf.split()) {
                        leaves.push(leaf.child1);
                        leaves.push(leaf.child2);
                        didSplit = true;
                    }
                }
            }
        }
    }

    const finalLeaves = DUNGEON_STATE.root.getLeaves();

    // 3. Grow blobs in each leaf
    DUNGEON_STATE.blobs = [];
    for (const leaf of finalLeaves) {
        const blob = growBlob(leaf);
        leaf.blob = blob;
        DUNGEON_STATE.blobs.push(blob);
    }

    // 4. Create grid
    DUNGEON_STATE.grid = [];
    for (let y = 0; y < DUNGEON_CONFIG.mapHeight; y++) {
        DUNGEON_STATE.grid[y] = [];
        for (let x = 0; x < DUNGEON_CONFIG.mapWidth; x++) {
            DUNGEON_STATE.grid[y][x] = 1; // Wall
        }
    }

    // 5. Paint blobs
    for (const blob of DUNGEON_STATE.blobs) {
        for (const tileKey of blob.tiles) {
            const [x, y] = tileKey.split(',').map(Number);
            DUNGEON_STATE.grid[y][x] = 0; // Floor
        }
    }

    // 6. Create corridors
    DUNGEON_STATE.corridors = [];
    createCorridors(DUNGEON_STATE.root, DUNGEON_STATE.grid);

    // 7. Assign blob properties (returns shrine count for validation)
    const { shrineCount } = assignBlobProperties(DUNGEON_STATE.blobs);

    // 8. Validate connectivity
    validateConnectivity(DUNGEON_STATE.grid);

    return { state: DUNGEON_STATE, shrineCount, blobCount: DUNGEON_STATE.blobs.length };
}

/**
 * Main dungeon generation with shrine validation and regeneration
 */
function generateBlobDungeonMap() {
    if (DUNGEON_CONFIG.debugLogging) {
        console.log(`\n🗺️  GENERATING BLOB-BASED DUNGEON (${DUNGEON_CONFIG.mapWidth}×${DUNGEON_CONFIG.mapHeight})`);
        console.log(`========================================`);
    }

    let attempt = 0;
    let result;

    // Try to generate a valid dungeon with enough shrines
    while (attempt < DUNGEON_CONFIG.maxRegenAttempts) {
        attempt++;

        result = generateDungeonAttempt();

        // Check if we have enough shrines
        if (result.shrineCount >= DUNGEON_CONFIG.minShrines) {
            if (DUNGEON_CONFIG.debugLogging && attempt > 1) {
                console.log(`\n✅ Valid dungeon generated on attempt ${attempt}`);
            }
            break;
        }

        // Check if we have enough blobs at all (if not, regen won't help much)
        if (result.blobCount < 6) {
            console.warn(`[DungeonGen] Only ${result.blobCount} blobs generated, shrine requirements may not be met`);
            break;  // Don't regenerate if blob count is too low
        }

        if (DUNGEON_CONFIG.debugLogging) {
            console.log(`\n⚠️ Attempt ${attempt}: Only ${result.shrineCount} shrines (need ${DUNGEON_CONFIG.minShrines}), regenerating...`);
        }
    }

    // Log final statistics
    if (DUNGEON_CONFIG.debugLogging) {
        const blobSizes = DUNGEON_STATE.blobs.map(b => b.tiles.size);
        console.log(`\n📐 BSP TREE:`);
        console.log(`  Total leaves: ${DUNGEON_STATE.blobs.length}`);

        console.log(`\n🫧 BLOBS:`);
        console.log(`  Total blobs: ${DUNGEON_STATE.blobs.length}`);
        console.log(`  Avg size: ${(blobSizes.reduce((a, b) => a + b, 0) / blobSizes.length).toFixed(0)} tiles`);
        console.log(`  Min size: ${Math.min(...blobSizes)} tiles`);
        console.log(`  Max size: ${Math.max(...blobSizes)} tiles`);

        if (DUNGEON_STATE.corridors.length > 0) {
            const corridorLengths = DUNGEON_STATE.corridors.map(c => c.tiles.size);
            console.log(`\n🚪 CORRIDORS:`);
            console.log(`  Total corridors: ${DUNGEON_STATE.corridors.length}`);
            console.log(`  Avg length: ${(corridorLengths.reduce((a, b) => a + b, 0) / corridorLengths.length).toFixed(0)} tiles`);
        }

        const entranceCount = DUNGEON_STATE.blobs.filter(b => b.blobType === 'entrance').length;
        const shrineCount = DUNGEON_STATE.blobs.filter(b => b.blobType === 'shrine').length;
        const combatCount = DUNGEON_STATE.blobs.filter(b => b.blobType === 'combat').length;
        const treasureCount = DUNGEON_STATE.blobs.filter(b => b.blobType === 'treasure').length;

        const deadEndShrines = DUNGEON_STATE.blobs.filter(
            b => b.blobType === 'shrine' && b.corridorConnections === 1
        ).length;

        console.log(`\n🎯 BLOB TYPES:`);
        console.log(`  Entrance: ${entranceCount}`);
        console.log(`  Shrine: ${shrineCount} (${deadEndShrines} dead-ends)`);
        console.log(`  Combat: ${combatCount}`);
        console.log(`  Treasure: ${treasureCount}`);

        console.log(`\n========================================`);
        console.log(`✅ DUNGEON GENERATION COMPLETE (${attempt} attempt${attempt > 1 ? 's' : ''})\n`);
    }

    return DUNGEON_STATE;
}

function createCorridors(leaf, grid) {
    if (leaf.child1 && leaf.child2) {
        // Get the first blob from each child's subtree
        const blob1 = getFirstBlob(leaf.child1);
        const blob2 = getFirstBlob(leaf.child2);

        if (blob1 && blob2 && blob1.connectionPoint && blob2.connectionPoint) {
            const corridor = createCorridorPath(grid, blob1, blob2);
            DUNGEON_STATE.corridors.push(corridor);
        }
    }

    if (leaf.child1) createCorridors(leaf.child1, grid);
    if (leaf.child2) createCorridors(leaf.child2, grid);
}

/**
 * Get the first blob in a leaf's subtree
 */
function getFirstBlob(leaf) {
    if (leaf.blob) {
        return leaf.blob;
    } else if (leaf.child1) {
        return getFirstBlob(leaf.child1);
    } else if (leaf.child2) {
        return getFirstBlob(leaf.child2);
    }
    return null;
}

// ============================================================================
// HELPER: Get current theme at position
// ============================================================================

function getThemeAtPosition(x, y) {
    // Check if in a blob
    for (const blob of DUNGEON_STATE.blobs) {
        if (blob.tiles.has(`${x},${y}`)) {
            return blob.theme;
        }
    }

    // Check if in a corridor
    for (const corridor of DUNGEON_STATE.corridors) {
        if (corridor.tiles.has(`${x},${y}`)) {
            // Find position along corridor path
            const pathIndex = corridor.path.findIndex(p => p.x === x && p.y === y);
            if (pathIndex >= 0) {
                const midIndex = Math.floor(corridor.path.length / 2);
                return pathIndex < midIndex ? corridor.startBlob.theme : corridor.endBlob.theme;
            }
            // Fallback to start theme if not in path
            return corridor.startBlob.theme;
        }
    }

    return null;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.DUNGEON_CONFIG = DUNGEON_CONFIG;
    window.DUNGEON_STATE = DUNGEON_STATE;
    window.generateBlobDungeonMap = generateBlobDungeonMap;
    window.getThemeAtPosition = getThemeAtPosition;
}

// Dungeon generator loaded (Blob-based BSP)
