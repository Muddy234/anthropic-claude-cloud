// ============================================================================
// MOVEMENT MASTER - The Shifting Chasm
// ============================================================================
console.log('[MovementMaster] File starting to load...');
// Consolidated movement system containing:
// - Math utilities (lerp, easing, distance calculations)
// - Collision detection (tile walkability, bounding box, circle)
// - Line of sight & raycasting (Bresenham's algorithm)
// - A* pathfinding (priority queue, path reconstruction)
// - Player movement (continuous sub-tile with .125 precision)
// - Entity movement updates (smooth interpolation)
// - Direction utilities (cardinal facing, diagonal detection)
// ============================================================================

// ############################################################################
// SECTION 1: CONFIGURATION
// ############################################################################

// Extend the MOVEMENT_CONFIG from constants.js with movement-master specific settings
Object.assign(MOVEMENT_CONFIG, {
    // Player movement
    playerMoveSpeed: 4,           // Tiles per second (used as max speed now)

    // Sub-tile precision
    tileIncrement: 0.125,         // .125 tile precision for player
    wallMargin: 0.05,             // TIGHTENED: Margin from walls (was 0.125, now ~1-2px at 32px tiles)

    // Entity collision
    playerRadius: 0.15,           // TIGHTENED: Player bounding radius (was 0.2)
    enemyCollisionRadius: 0.25,   // TIGHTENED: Radius for player-enemy collision (was 0.3)

    // Enemy movement
    enemyBaseMoveSpeed: 0.06,     // Base enemy move speed

    // Interpolation
    entityMoveSpeed: 0.08,        // Lerp speed for entity display positions
    snapThreshold: 0.01,          // Distance at which to snap (prevents jitter)

    // Pathfinding
    maxPathIterations: 1000,      // A* iteration limit
    repathThrottleMin: 500,       // Min ms between repathing (0.5s)
    repathThrottleMax: 1000,      // Max ms between repathing (1.0s)
    stuckThreshold: 1.0,          // Seconds before enemy is considered stuck
    stuckDistanceThreshold: 0.5,  // If enemy moves less than this in stuckThreshold, it's stuck

    // Enemy separation (soft collision)
    separationRadius: 1.2,        // Radius to check for nearby enemies
    separationStrength: 2.5,      // Force multiplier for separation
    separationEnabled: true,      // Toggle soft collision

    // Diagonal movement
    diagonalFactor: 0.707,        // sqrt(2) / 2 for normalized diagonal speed

    // === VELOCITY-BASED MOVEMENT (Inertia) ===
    acceleration: 25,             // Tiles per second squared (snappy acceleration)
    friction: 12,                 // Friction coefficient (higher = more responsive stops)
    maxVelocity: 5,               // Maximum velocity cap (tiles/sec)
    velocityDeadzone: 0.01,       // Below this velocity, snap to zero

    // === CORNER NUDGE SYSTEM ===
    nudgeDistance: 0.15,          // How far to check for nudge opportunities (tiles)
    nudgeStrength: 0.08,          // Perpendicular correction impulse per frame
    nudgeEnabled: true            // Toggle corner sliding
});

console.log('[MovementMaster] MOVEMENT_CONFIG defined');

// ############################################################################
// SECTION 2: MATH UTILITIES
// ############################################################################

/**
 * Linear interpolation (LERP)
 * Smoothly moves a value from start toward end
 */
function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Ease-out quadratic - starts fast, slows down
 * Use for: dash movement, lunge, deceleration effects
 */
function easeOutQuad(t) {
    return t * (2 - t);
}

/**
 * Ease-in quadratic - starts slow, speeds up
 * Use for: acceleration effects
 */
function easeInQuad(t) {
    return t * t;
}

/**
 * Ease-in-out quadratic - smooth start and end
 * Use for: smooth camera movements, UI animations
 */
function easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * Calculate distance between two entities
 */
function getDistance(entity1, entity2) {
    const dx = entity1.x - entity2.x;
    const dy = entity1.y - entity2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance between two coordinate pairs
 */
function getDistanceXY(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate Manhattan distance (grid-based)
 */
function getManhattanDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Calculate squared distance (faster - avoids sqrt)
 * Use when comparing distances: distSq <= range*range
 */
function getDistanceSquared(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return dx * dx + dy * dy;
}

/**
 * Check if two points are within range (optimized, no sqrt)
 */
function isWithinRange(x1, y1, x2, y2, range) {
    return getDistanceSquared(x1, y1, x2, y2) <= range * range;
}

/**
 * Normalize a direction vector for diagonal movement
 * Prevents moving faster diagonally
 */
function normalizeDirection(dx, dy) {
    if (dx !== 0 && dy !== 0) {
        const factor = MOVEMENT_CONFIG.diagonalFactor;
        return { dx: dx * factor, dy: dy * factor };
    }
    return { dx, dy };
}

// ############################################################################
// SECTION 3: COLLISION DETECTION
console.log('[MovementMaster] Section 3: Collision');
// ############################################################################

/**
 * Safely get a tile from the map, returning null if out of bounds
 */
function safeGetTile(x, y) {
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);

    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) {
        return null;
    }

    if (!game.map[gridY]) return null;

    return game.map[gridY][gridX] || null;
}

/**
 * Check if a single tile is walkable (no diagonal logic)
 */
function isTileWalkable(gridX, gridY) {
    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) {
        return false;
    }

    const tile = game.map[gridY]?.[gridX];

    if (!tile || tile.type === 'void' || tile.type === 'wall' || tile.type === 'interior_wall') {
        return false;
    }

    if (typeof hasBlockingDecorationAt === 'function' && hasBlockingDecorationAt(gridX, gridY)) {
        return false;
    }

    return true;
}

/**
 * Check if a tile is valid (within bounds and walkable type)
 */
function isValidTile(x, y) {
    if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) {
        return false;
    }

    const tile = game.map[y][x];
    if (!tile || tile.type === 'void' || tile.type === 'wall' || tile.type === 'interior_wall') {
        return false;
    }

    return true;
}

/**
 * Check if a tile is walkable (for pathfinding - includes entity checks)
 */
function isWalkable(x, y, ignoreEnemies = false, ignoreNPCs = false) {
    if (!isValidTile(x, y)) {
        return false;
    }

    if (typeof hasBlockingDecorationAt === 'function' && hasBlockingDecorationAt(x, y)) {
        return false;
    }

    if (!ignoreEnemies && game.enemies) {
        const hasEnemy = game.enemies.some(e =>
            Math.floor(e.gridX) === x && Math.floor(e.gridY) === y
        );
        if (hasEnemy) return false;
    }

    if (!ignoreNPCs && game.merchant) {
        const mx = game.merchant.x !== undefined ? game.merchant.x : game.merchant.gridX;
        const my = game.merchant.y !== undefined ? game.merchant.y : game.merchant.gridY;
        if (Math.floor(mx) === x && Math.floor(my) === y) return false;
    }

    return true;
}

/**
 * Check if a position is valid for movement (9-point bounding box)
 */
function canMoveTo(x, y, checkEnemies = false, entityRadius = 0.2) {
    if (x - entityRadius < 0 || x + entityRadius >= GRID_WIDTH ||
        y - entityRadius < 0 || y + entityRadius >= GRID_HEIGHT) {
        return false;
    }

    const checkPoints = [
        { x: x, y: y },                                    // Center
        { x: x - entityRadius, y: y - entityRadius },      // Top-left
        { x: x + entityRadius, y: y - entityRadius },      // Top-right
        { x: x - entityRadius, y: y + entityRadius },      // Bottom-left
        { x: x + entityRadius, y: y + entityRadius },      // Bottom-right
        { x: x - entityRadius, y: y },                     // Left
        { x: x + entityRadius, y: y },                     // Right
        { x: x, y: y - entityRadius },                     // Top
        { x: x, y: y + entityRadius }                      // Bottom
    ];

    for (const point of checkPoints) {
        const gridX = Math.floor(point.x);
        const gridY = Math.floor(point.y);

        if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) {
            return false;
        }

        const tile = safeGetTile(gridX, gridY);
        if (!tile || tile.type === 'void' || tile.type === 'wall' || tile.type === 'interior_wall') {
            return false;
        }

        if (typeof hasBlockingDecorationAt === 'function' && hasBlockingDecorationAt(gridX, gridY)) {
            return false;
        }
    }

    if (checkEnemies && game.enemies) {
        const centerGridX = Math.floor(x);
        const centerGridY = Math.floor(y);
        const hasEnemy = game.enemies.some(e =>
            Math.floor(e.x) === centerGridX && Math.floor(e.y) === centerGridY
        );
        if (hasEnemy) return false;
    }

    return true;
}

/**
 * Safe movement check - prevents corner cutting
 */
function canMoveToSafe(fromX, fromY, toX, toY, entityRadius = 0.2) {
    if (!canMoveTo(toX, toY, false, entityRadius)) {
        return false;
    }

    const dx = toX - fromX;
    const dy = toY - fromY;

    if (Math.abs(dx) > 0.01 && Math.abs(dy) > 0.01) {
        if (!canMoveTo(toX, fromY, false, entityRadius)) return false;
        if (!canMoveTo(fromX, toY, false, entityRadius)) return false;

        const midX = fromX + dx * 0.5;
        const midY = fromY + dy * 0.5;
        if (!canMoveTo(midX, midY, false, entityRadius)) return false;
    }

    return true;
}

/**
 * Position-based collision check with sub-tile precision
 */
function canMoveToPosition(newX, newY, oldX, oldY) {
    const WALL_MARGIN = MOVEMENT_CONFIG.wallMargin;

    const newTileX = Math.floor(newX);
    const newTileY = Math.floor(newY);

    if (!isTileWalkable(newTileX, newTileY)) {
        return false;
    }

    const fracX = newX - newTileX;
    const fracY = newY - newTileY;

    if (fracX < WALL_MARGIN && !isTileWalkable(newTileX - 1, newTileY)) return false;
    if (fracX > (1 - WALL_MARGIN) && !isTileWalkable(newTileX + 1, newTileY)) return false;
    if (fracY < WALL_MARGIN && !isTileWalkable(newTileX, newTileY - 1)) return false;
    if (fracY > (1 - WALL_MARGIN) && !isTileWalkable(newTileX, newTileY + 1)) return false;

    const dx = newX - oldX;
    const dy = newY - oldY;

    if (Math.abs(dx) > 0.001 && Math.abs(dy) > 0.001) {
        const moveRight = dx > 0;
        const moveDown = dy > 0;
        const cornerX = moveRight ? newTileX + 1 : newTileX - 1;
        const cornerY = moveDown ? newTileY + 1 : newTileY - 1;
        const hasWallX = !isTileWalkable(cornerX, newTileY);
        const hasWallY = !isTileWalkable(newTileX, cornerY);

        if (hasWallX && hasWallY) return false;
    }

    const COLLISION_RADIUS = MOVEMENT_CONFIG.enemyCollisionRadius;
    if (game.enemies && Array.isArray(game.enemies)) {
        for (const enemy of game.enemies) {
            if (enemy.hp <= 0) continue;
            const edx = newX - enemy.gridX;
            const edy = newY - enemy.gridY;
            const distance = Math.sqrt(edx * edx + edy * edy);
            if (distance < COLLISION_RADIUS) return false;
        }
    }

    return true;
}

/**
 * Legacy compatibility wrapper
 */
function canMoveToTile(targetX, targetY, fromX, fromY) {
    return canMoveToPosition(targetX, targetY, fromX || targetX, fromY || targetY);
}

/**
 * Circle-based collision between two entities
 */
function checkCircleCollision(entity1, entity2, radius1 = 0.4, radius2 = 0.4) {
    const dx = entity1.displayX - entity2.displayX;
    const dy = entity1.displayY - entity2.displayY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (radius1 + radius2);
}

/**
 * Get all enemies within range of an entity
 */
function getEnemiesInRange(entity, range) {
    if (!game.enemies) return [];

    return game.enemies.filter(enemy => {
        const dx = entity.displayX - enemy.displayX;
        const dy = entity.displayY - enemy.displayY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= range;
    });
}

/**
 * Find the closest enemy to an entity
 */
function getClosestEnemy(entity) {
    if (!game.enemies || game.enemies.length === 0) return null;

    let closest = null;
    let minDist = Infinity;

    for (const enemy of game.enemies) {
        const dx = entity.displayX - enemy.displayX;
        const dy = entity.displayY - enemy.displayY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
            minDist = dist;
            closest = enemy;
        }
    }

    return closest;
}

// ############################################################################
// SECTION 4: LINE OF SIGHT & RAYCASTING
// ############################################################################

/**
 * Check line of sight between two entities
 */
function hasLineOfSight(fromEntity, toEntity) {
    const x1 = Math.floor(fromEntity.displayX);
    const y1 = Math.floor(fromEntity.displayY);
    const x2 = Math.floor(toEntity.displayX);
    const y2 = Math.floor(toEntity.displayY);

    return raycast(x1, y1, x2, y2);
}

/**
 * Raycast between two points (Bresenham's algorithm)
 * Checks walls and vision-blocking decorations
 * @returns {boolean} True if line of sight is clear
 */
function raycast(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let x = x1;
    let y = y1;

    while (true) {
        const tile = safeGetTile(x, y);
        if (!tile || tile.type === 'wall' || tile.type === 'void' || tile.type === 'interior_wall') {
            return false;
        }

        if (typeof hasVisionBlockingDecorationAt === 'function' && hasVisionBlockingDecorationAt(x, y)) {
            return false;
        }

        if (x === x2 && y === y2) {
            return true;
        }

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }
}

/**
 * Extended raycast that returns hit information
 * @returns {Object} { hit: boolean, x: number, y: number, type: string }
 */
function raycastDetailed(x1, y1, x2, y2) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let x = x1;
    let y = y1;

    while (true) {
        const tile = safeGetTile(x, y);

        if (!tile || tile.type === 'wall' || tile.type === 'void' || tile.type === 'interior_wall') {
            return { hit: true, x: x, y: y, type: tile ? tile.type : 'out_of_bounds' };
        }

        if (typeof hasVisionBlockingDecorationAt === 'function' && hasVisionBlockingDecorationAt(x, y)) {
            return { hit: true, x: x, y: y, type: 'decoration' };
        }

        if (x === x2 && y === y2) {
            return { hit: false, x: x2, y: y2, type: 'clear' };
        }

        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }
}

// ############################################################################
// SECTION 5: PATHFINDING (A*)
console.log('[MovementMaster] Section 5: Pathfinding');
// ############################################################################

/**
 * Priority Queue (min-heap) for A* pathfinding
 */
class PriorityQueue {
    constructor() {
        this.heap = [];
        this.positions = new Map();
    }

    enqueue(item, priority) {
        const node = { item, priority };
        this.heap.push(node);
        this.positions.set(`${item.x},${item.y}`, true);
        this._bubbleUp(this.heap.length - 1);
    }

    dequeue() {
        if (this.heap.length === 0) return null;

        const min = this.heap[0];
        const end = this.heap.pop();

        if (this.heap.length > 0) {
            this.heap[0] = end;
            this._sinkDown(0);
        }

        this.positions.delete(`${min.item.x},${min.item.y}`);
        return min.item;
    }

    isEmpty() {
        return this.heap.length === 0;
    }

    contains(key) {
        return this.positions.has(key);
    }

    _bubbleUp(index) {
        const node = this.heap[index];

        while (index > 0) {
            const parentIndex = Math.floor((index - 1) / 2);
            const parent = this.heap[parentIndex];

            if (node.priority >= parent.priority) break;

            this.heap[index] = parent;
            index = parentIndex;
        }

        this.heap[index] = node;
    }

    _sinkDown(index) {
        const length = this.heap.length;
        const node = this.heap[index];

        while (true) {
            const leftIndex = 2 * index + 1;
            const rightIndex = 2 * index + 2;
            let smallest = index;

            if (leftIndex < length && this.heap[leftIndex].priority < this.heap[smallest].priority) {
                smallest = leftIndex;
            }

            if (rightIndex < length && this.heap[rightIndex].priority < this.heap[smallest].priority) {
                smallest = rightIndex;
            }

            if (smallest === index) break;

            this.heap[index] = this.heap[smallest];
            this.heap[smallest] = node;
            index = smallest;
        }
    }
}

/**
 * Manhattan distance heuristic with Euclidean tie-breaking
 * Tie-breaking produces straighter paths by preferring nodes closer to the goal
 * h = Manhattan + 0.001 * Euclidean
 */
function heuristic(x1, y1, x2, y2) {
    const manhattan = Math.abs(x1 - x2) + Math.abs(y1 - y2);
    const dx = x1 - x2;
    const dy = y1 - y2;
    const euclidean = Math.sqrt(dx * dx + dy * dy);
    return manhattan + (0.001 * euclidean);
}

/**
 * Find optimal path from start to goal using A* algorithm
 * @param {number} startX - Starting grid X
 * @param {number} startY - Starting grid Y
 * @param {number} goalX - Target grid X
 * @param {number} goalY - Target grid Y
 * @param {Object} options - Pathfinding options
 * @returns {Array} Array of {x, y, direction} steps, or partial path to closest node if no full path
 */
function findPath(startX, startY, goalX, goalY, options = {}) {
    const {
        ignoreEnemies = false,
        ignoreNPCs = false,
        maxIterations = MOVEMENT_CONFIG.maxPathIterations,
        returnClosestOnFail = true  // Return path to closest explored node if goal unreachable
    } = options;

    startX = Math.floor(startX);
    startY = Math.floor(startY);
    goalX = Math.floor(goalX);
    goalY = Math.floor(goalY);

    if (startX === goalX && startY === goalY) {
        return [];
    }

    if (!isValidTile(goalX, goalY)) {
        const adjacent = getAdjacentWalkableTile(goalX, goalY, ignoreEnemies, ignoreNPCs);
        if (adjacent) {
            goalX = adjacent.x;
            goalY = adjacent.y;
        } else if (!returnClosestOnFail) {
            return [];
        }
        // If returnClosestOnFail is true, continue anyway to find closest reachable node
    }

    const openSet = new PriorityQueue();
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const posKey = (x, y) => `${x},${y}`;

    const startKey = posKey(startX, startY);
    gScore.set(startKey, 0);
    fScore.set(startKey, heuristic(startX, startY, goalX, goalY));
    openSet.enqueue({ x: startX, y: startY }, fScore.get(startKey));

    const directions = [
        { dx: 0, dy: -1, dir: 'up' },
        { dx: 0, dy: 1, dir: 'down' },
        { dx: -1, dy: 0, dir: 'left' },
        { dx: 1, dy: 0, dir: 'right' }
    ];

    let iterations = 0;

    // Track closest node to goal (for fallback path)
    let closestNode = { x: startX, y: startY };
    let closestDistance = heuristic(startX, startY, goalX, goalY);

    while (!openSet.isEmpty() && iterations < maxIterations) {
        iterations++;

        const current = openSet.dequeue();
        const currentKey = posKey(current.x, current.y);

        // Track closest node to goal
        const currentDist = heuristic(current.x, current.y, goalX, goalY);
        if (currentDist < closestDistance) {
            closestDistance = currentDist;
            closestNode = { x: current.x, y: current.y };
        }

        if (current.x === goalX && current.y === goalY) {
            return reconstructPath(cameFrom, current, startX, startY);
        }

        closedSet.add(currentKey);

        for (const { dx, dy, dir } of directions) {
            const neighborX = current.x + dx;
            const neighborY = current.y + dy;
            const neighborKey = posKey(neighborX, neighborY);

            if (closedSet.has(neighborKey)) continue;
            if (!isWalkable(neighborX, neighborY, ignoreEnemies, ignoreNPCs)) continue;

            const tentativeG = gScore.get(currentKey) + 1;
            const previousG = gScore.get(neighborKey) ?? Infinity;

            if (tentativeG < previousG) {
                cameFrom.set(neighborKey, { x: current.x, y: current.y, dir: dir });
                gScore.set(neighborKey, tentativeG);
                const f = tentativeG + heuristic(neighborX, neighborY, goalX, goalY);
                fScore.set(neighborKey, f);

                if (!openSet.contains(neighborKey)) {
                    openSet.enqueue({ x: neighborX, y: neighborY }, f);
                }
            }
        }
    }

    // No full path found - return path to closest explored node if enabled
    if (returnClosestOnFail && (closestNode.x !== startX || closestNode.y !== startY)) {
        return reconstructPath(cameFrom, closestNode, startX, startY);
    }

    return [];
}

/**
 * Reconstruct path from A* came-from map
 */
function reconstructPath(cameFrom, current, startX, startY) {
    const path = [];
    const posKey = (x, y) => `${x},${y}`;

    let currentKey = posKey(current.x, current.y);

    while (cameFrom.has(currentKey)) {
        const prev = cameFrom.get(currentKey);
        path.unshift({
            x: current.x,
            y: current.y,
            direction: prev.dir
        });
        current = { x: prev.x, y: prev.y };
        currentKey = posKey(current.x, current.y);
    }

    return path;
}

/**
 * Find a walkable tile adjacent to the given position
 */
function getAdjacentWalkableTile(x, y, ignoreEnemies = false, ignoreNPCs = false) {
    const directions = [
        { dx: 0, dy: -1 },
        { dx: 0, dy: 1 },
        { dx: -1, dy: 0 },
        { dx: 1, dy: 0 }
    ];

    for (const { dx, dy } of directions) {
        const adjX = x + dx;
        const adjY = y + dy;
        if (isWalkable(adjX, adjY, ignoreEnemies, ignoreNPCs)) {
            return { x: adjX, y: adjY };
        }
    }

    return null;
}

/**
 * Path smoothing using string-pulling algorithm
 * Removes unnecessary waypoints by checking direct line of sight
 * @param {Array} path - Original A* path [{x, y, direction}, ...]
 * @returns {Array} Smoothed path with fewer waypoints
 */
function smoothPath(path) {
    if (!path || path.length <= 2) {
        return path;
    }

    const smoothed = [path[0]];
    let currentIndex = 0;

    while (currentIndex < path.length - 1) {
        // Look ahead as far as possible with clear line of sight
        let furthestVisible = currentIndex + 1;

        for (let i = currentIndex + 2; i < path.length; i++) {
            const from = path[currentIndex];
            const to = path[i];

            // Use raycast to check if direct line of sight exists
            if (raycast(from.x, from.y, to.x, to.y)) {
                furthestVisible = i;
            } else {
                // Can't see past this point, stop looking
                break;
            }
        }

        // Add the furthest visible waypoint
        smoothed.push(path[furthestVisible]);
        currentIndex = furthestVisible;
    }

    return smoothed;
}

/**
 * Find path with automatic smoothing
 * Combines A* pathfinding with string-pulling optimization
 * @param {number} startX - Starting grid X
 * @param {number} startY - Starting grid Y
 * @param {number} goalX - Target grid X
 * @param {number} goalY - Target grid Y
 * @param {Object} options - Pathfinding options (same as findPath, plus smoothing)
 * @returns {Array} Smoothed path
 */
function findPathSmooth(startX, startY, goalX, goalY, options = {}) {
    const { smooth = true, ...pathOptions } = options;

    const path = findPath(startX, startY, goalX, goalY, pathOptions);

    if (smooth && path.length > 2) {
        return smoothPath(path);
    }

    return path;
}

// ############################################################################
// SECTION 5B: ENEMY AI MOVEMENT UTILITIES
// ############################################################################

/**
 * Check if an enemy is stuck (hasn't moved significantly in stuckThreshold time)
 * Call this from enemy AI update loop
 * @param {Object} enemy - Enemy entity
 * @param {number} deltaTime - Time since last frame in milliseconds
 * @returns {boolean} True if enemy is stuck
 */
function checkEnemyStuck(enemy, deltaTime) {
    if (!enemy) return false;

    // Initialize stuck tracking state
    if (enemy._stuckTimer === undefined) {
        enemy._stuckTimer = 0;
        enemy._lastStuckCheckX = enemy.gridX;
        enemy._lastStuckCheckY = enemy.gridY;
    }

    // Accumulate time
    enemy._stuckTimer += deltaTime / 1000;

    // Check if enough time has passed
    if (enemy._stuckTimer >= MOVEMENT_CONFIG.stuckThreshold) {
        const dx = enemy.gridX - enemy._lastStuckCheckX;
        const dy = enemy.gridY - enemy._lastStuckCheckY;
        const distMoved = Math.sqrt(dx * dx + dy * dy);

        // Reset tracking
        enemy._stuckTimer = 0;
        enemy._lastStuckCheckX = enemy.gridX;
        enemy._lastStuckCheckY = enemy.gridY;

        // Stuck if moved less than threshold distance
        if (distMoved < MOVEMENT_CONFIG.stuckDistanceThreshold) {
            enemy._isStuck = true;
            return true;
        }
    }

    enemy._isStuck = false;
    return false;
}

/**
 * Check if enemy can request a new path (throttled)
 * Prevents pathfinding spam when stuck or frequently repathing
 * @param {Object} enemy - Enemy entity
 * @returns {boolean} True if enough time has passed since last path request
 */
function canRequestRepath(enemy) {
    if (!enemy) return true;

    const now = performance.now();

    // Initialize repath tracking
    if (enemy._lastRepathTime === undefined) {
        enemy._lastRepathTime = 0;
        enemy._repathThrottle = MOVEMENT_CONFIG.repathThrottleMin;
    }

    // Check throttle
    if (now - enemy._lastRepathTime < enemy._repathThrottle) {
        return false;
    }

    return true;
}

/**
 * Mark that enemy has requested a new path
 * Adjusts throttle based on stuck state (longer throttle if stuck)
 * @param {Object} enemy - Enemy entity
 */
function markRepathRequested(enemy) {
    if (!enemy) return;

    enemy._lastRepathTime = performance.now();

    // Increase throttle if stuck (prevents rapid repathing when truly blocked)
    if (enemy._isStuck) {
        enemy._repathThrottle = Math.min(
            enemy._repathThrottle * 1.5,
            MOVEMENT_CONFIG.repathThrottleMax
        );
    } else {
        // Decay throttle back to minimum when moving normally
        enemy._repathThrottle = Math.max(
            enemy._repathThrottle * 0.8,
            MOVEMENT_CONFIG.repathThrottleMin
        );
    }
}

/**
 * Calculate separation force from nearby enemies (soft collision)
 * Apply this steering force to prevent enemy clumping
 * @param {Object} enemy - Enemy to calculate separation for
 * @param {Array} allEnemies - Array of all enemies
 * @returns {Object} { fx, fy } separation force vector
 */
function calculateSeparationForce(enemy, allEnemies) {
    if (!MOVEMENT_CONFIG.separationEnabled || !enemy || !allEnemies) {
        return { fx: 0, fy: 0 };
    }

    let fx = 0;
    let fy = 0;
    let neighborCount = 0;

    const radius = MOVEMENT_CONFIG.separationRadius;
    const radiusSq = radius * radius;

    for (const other of allEnemies) {
        // Skip self and dead enemies
        if (other === enemy || other.hp <= 0) continue;

        const dx = enemy.gridX - other.gridX;
        const dy = enemy.gridY - other.gridY;
        const distSq = dx * dx + dy * dy;

        // Skip if outside separation radius
        if (distSq >= radiusSq || distSq < 0.0001) continue;

        // Calculate repulsion force (inverse distance weighted)
        const dist = Math.sqrt(distSq);
        const strength = (radius - dist) / radius; // 1.0 at center, 0.0 at edge

        // Normalize direction and scale by strength
        fx += (dx / dist) * strength;
        fy += (dy / dist) * strength;
        neighborCount++;
    }

    // Average and scale the force
    if (neighborCount > 0) {
        fx = (fx / neighborCount) * MOVEMENT_CONFIG.separationStrength;
        fy = (fy / neighborCount) * MOVEMENT_CONFIG.separationStrength;
    }

    return { fx, fy };
}

/**
 * Apply separation force to enemy movement
 * Call this after calculating intended movement but before collision check
 * @param {Object} enemy - Enemy entity
 * @param {number} intendedX - X position enemy wants to move to
 * @param {number} intendedY - Y position enemy wants to move to
 * @param {number} deltaTime - Time since last frame in milliseconds
 * @returns {Object} { x, y } adjusted target position
 */
function applySeparationToMovement(enemy, intendedX, intendedY, deltaTime) {
    if (!game.enemies) {
        return { x: intendedX, y: intendedY };
    }

    const separation = calculateSeparationForce(enemy, game.enemies);
    const dt = deltaTime / 1000;

    // Apply separation as offset to intended position
    const adjustedX = intendedX + separation.fx * dt;
    const adjustedY = intendedY + separation.fy * dt;

    // Validate adjusted position is walkable
    const tileX = Math.floor(adjustedX);
    const tileY = Math.floor(adjustedY);

    if (isTileWalkable(tileX, tileY)) {
        return { x: adjustedX, y: adjustedY };
    }

    // Fallback to original position if separation pushes into wall
    return { x: intendedX, y: intendedY };
}

// ############################################################################
// SECTION 6: PLAYER MOVEMENT (Velocity-Based with Wall Sliding)
console.log('[MovementMaster] Section 6: Player Movement');
// ############################################################################

// Player velocity state (persistent across frames)
const playerVelocity = { x: 0, y: 0 };

/**
 * Get input vector from direction string
 */
function getInputVector(direction) {
    let ix = 0, iy = 0;

    switch (direction) {
        case 'up': iy = -1; break;
        case 'down': iy = 1; break;
        case 'left': ix = -1; break;
        case 'right': ix = 1; break;
        case 'up-left': ix = -1; iy = -1; break;
        case 'up-right': ix = 1; iy = -1; break;
        case 'down-left': ix = -1; iy = 1; break;
        case 'down-right': ix = 1; iy = 1; break;
    }

    // Normalize diagonal input
    if (ix !== 0 && iy !== 0) {
        const factor = MOVEMENT_CONFIG.diagonalFactor;
        ix *= factor;
        iy *= factor;
    }

    return { x: ix, y: iy };
}

/**
 * Check if position is valid for single-axis movement
 * Used for wall sliding collision resolution
 */
function canMoveToAxis(x, y, checkEnemies = true) {
    const margin = MOVEMENT_CONFIG.wallMargin;

    // Boundary check
    if (x - margin < 0 || x + margin >= GRID_WIDTH ||
        y - margin < 0 || y + margin >= GRID_HEIGHT) {
        return false;
    }

    // Check tile at position
    const tileX = Math.floor(x);
    const tileY = Math.floor(y);

    if (!isTileWalkable(tileX, tileY)) {
        return false;
    }

    // Check fractional edge collisions
    const fracX = x - tileX;
    const fracY = y - tileY;

    if (fracX < margin && !isTileWalkable(tileX - 1, tileY)) return false;
    if (fracX > (1 - margin) && !isTileWalkable(tileX + 1, tileY)) return false;
    if (fracY < margin && !isTileWalkable(tileX, tileY - 1)) return false;
    if (fracY > (1 - margin) && !isTileWalkable(tileX, tileY + 1)) return false;

    // Enemy collision (optional)
    if (checkEnemies && game.enemies) {
        const radius = MOVEMENT_CONFIG.enemyCollisionRadius;
        for (const enemy of game.enemies) {
            if (enemy.hp <= 0) continue;
            const dx = x - enemy.gridX;
            const dy = y - enemy.gridY;
            if (dx * dx + dy * dy < radius * radius) return false;
        }
    }

    return true;
}

/**
 * Try to nudge player around a corner obstruction
 * Returns adjusted position if nudge succeeds, null otherwise
 */
function tryCornerNudge(currentX, currentY, targetX, targetY, velocityX, velocityY) {
    if (!MOVEMENT_CONFIG.nudgeEnabled) return null;

    const nudgeDist = MOVEMENT_CONFIG.nudgeDistance;

    // Determine primary movement direction
    const movingX = Math.abs(velocityX) > Math.abs(velocityY);

    if (movingX) {
        // Moving primarily horizontally, try vertical nudges
        // Check if nudging up helps
        if (canMoveToAxis(targetX, currentY - nudgeDist, true)) {
            return { x: targetX, y: currentY - nudgeDist, nudgeY: -MOVEMENT_CONFIG.nudgeStrength };
        }
        // Check if nudging down helps
        if (canMoveToAxis(targetX, currentY + nudgeDist, true)) {
            return { x: targetX, y: currentY + nudgeDist, nudgeY: MOVEMENT_CONFIG.nudgeStrength };
        }
    } else {
        // Moving primarily vertically, try horizontal nudges
        // Check if nudging left helps
        if (canMoveToAxis(currentX - nudgeDist, targetY, true)) {
            return { x: currentX - nudgeDist, y: targetY, nudgeX: -MOVEMENT_CONFIG.nudgeStrength };
        }
        // Check if nudging right helps
        if (canMoveToAxis(currentX + nudgeDist, targetY, true)) {
            return { x: currentX + nudgeDist, y: targetY, nudgeX: MOVEMENT_CONFIG.nudgeStrength };
        }
    }

    return null;
}

/**
 * Move player with velocity-based physics and wall sliding
 * @param {string} direction - Direction to move (up, down, left, right, up-left, etc.)
 * @param {number} deltaTime - Time since last frame in milliseconds
 */
function movePlayerContinuous(direction, deltaTime) {
    const player = game.player;
    if (!player) return;

    const dt = deltaTime / 1000; // Convert to seconds

    // Get input vector
    const input = getInputVector(direction);
    const hasInput = input.x !== 0 || input.y !== 0;

    // === VELOCITY ACCUMULATION (Inertia) ===
    if (hasInput) {
        // Accelerate toward input direction
        const accel = MOVEMENT_CONFIG.acceleration;
        playerVelocity.x += input.x * accel * dt;
        playerVelocity.y += input.y * accel * dt;
    }

    // Apply friction/damping (always, creates natural deceleration)
    const friction = MOVEMENT_CONFIG.friction;
    playerVelocity.x *= Math.max(0, 1.0 - friction * dt);
    playerVelocity.y *= Math.max(0, 1.0 - friction * dt);

    // Clamp to max velocity
    const maxVel = MOVEMENT_CONFIG.maxVelocity;
    const velMag = Math.sqrt(playerVelocity.x * playerVelocity.x + playerVelocity.y * playerVelocity.y);
    if (velMag > maxVel) {
        const scale = maxVel / velMag;
        playerVelocity.x *= scale;
        playerVelocity.y *= scale;
    }

    // Deadzone - snap tiny velocities to zero
    const deadzone = MOVEMENT_CONFIG.velocityDeadzone;
    if (Math.abs(playerVelocity.x) < deadzone) playerVelocity.x = 0;
    if (Math.abs(playerVelocity.y) < deadzone) playerVelocity.y = 0;

    // Calculate movement delta
    const deltaX = playerVelocity.x * dt;
    const deltaY = playerVelocity.y * dt;

    if (deltaX === 0 && deltaY === 0) {
        player.isMoving = false;
        return;
    }

    // Store previous position for tile interaction checks
    const prevTileX = Math.floor(player.gridX);
    const prevTileY = Math.floor(player.gridY);

    // === AXIS-DECOUPLED COLLISION (Wall Sliding) ===
    let newX = player.gridX;
    let newY = player.gridY;
    let collidedX = false;
    let collidedY = false;

    // Step 1: Integrate X axis
    const testX = player.gridX + deltaX;
    if (canMoveToAxis(testX, player.gridY, true)) {
        newX = testX;
    } else {
        // X blocked - try corner nudge
        const nudge = tryCornerNudge(player.gridX, player.gridY, testX, player.gridY, playerVelocity.x, playerVelocity.y);
        if (nudge && nudge.nudgeY) {
            // Apply perpendicular nudge
            const nudgeTestY = player.gridY + nudge.nudgeY;
            if (canMoveToAxis(testX, nudgeTestY, true)) {
                newX = testX;
                newY = nudgeTestY;
            } else {
                collidedX = true;
                playerVelocity.x = 0; // Project velocity onto collision normal
            }
        } else {
            collidedX = true;
            playerVelocity.x = 0;
        }
    }

    // Step 2: Integrate Y axis
    const testY = newY + deltaY;
    if (canMoveToAxis(newX, testY, true)) {
        newY = testY;
    } else {
        // Y blocked - try corner nudge
        const nudge = tryCornerNudge(newX, player.gridY, newX, testY, playerVelocity.x, playerVelocity.y);
        if (nudge && nudge.nudgeX) {
            // Apply perpendicular nudge
            const nudgeTestX = newX + nudge.nudgeX;
            if (canMoveToAxis(nudgeTestX, testY, true)) {
                newX = nudgeTestX;
                newY = testY;
            } else {
                collidedY = true;
                playerVelocity.y = 0;
            }
        } else {
            collidedY = true;
            playerVelocity.y = 0;
        }
    }

    // === POSITION UPDATE ===
    player.gridX = newX;
    player.gridY = newY;
    player.displayX = newX;
    player.displayY = newY;
    player.x = newX;
    player.y = newY;

    // Update facing direction based on velocity (not input)
    if (Math.abs(playerVelocity.x) > deadzone || Math.abs(playerVelocity.y) > deadzone) {
        player.facing = getCardinalFacing(direction);
        player.isMoving = true;
    } else {
        player.isMoving = false;
    }

    // Check for tile interactions on tile boundary crossings
    const newTileX = Math.floor(newX);
    const newTileY = Math.floor(newY);
    if (newTileX !== prevTileX || newTileY !== prevTileY) {
        if (typeof checkTileInteractions === 'function') {
            checkTileInteractions(player);
        }
    }
}

/**
 * Update player physics without input (for momentum decay)
 * Call this when no movement keys are pressed
 */
function updatePlayerPhysics(deltaTime) {
    const player = game.player;
    if (!player) return;

    // Only update if player has velocity
    if (playerVelocity.x === 0 && playerVelocity.y === 0) {
        player.isMoving = false;
        return;
    }

    // Call movement with no direction to apply friction and integrate position
    movePlayerContinuous(null, deltaTime);
}

/**
 * Get current player velocity (for external systems)
 */
function getPlayerVelocity() {
    return { x: playerVelocity.x, y: playerVelocity.y };
}

/**
 * Set player velocity directly (for knockback, dashes, etc.)
 */
function setPlayerVelocity(vx, vy) {
    playerVelocity.x = vx;
    playerVelocity.y = vy;
}

/**
 * Add impulse to player velocity (for bumps, bounces)
 */
function addPlayerImpulse(ix, iy) {
    playerVelocity.x += ix;
    playerVelocity.y += iy;
}

/**
 * Cancel current movement, reset velocity, and snap player to nearest tile increment
 */
function cancelPlayerMove() {
    const player = game.player;
    if (!player) return;

    // Reset velocity (kill all momentum)
    playerVelocity.x = 0;
    playerVelocity.y = 0;

    const snapIncrement = MOVEMENT_CONFIG.tileIncrement;
    const snappedX = Math.round(player.displayX / snapIncrement) * snapIncrement;
    const snappedY = Math.round(player.displayY / snapIncrement) * snapIncrement;

    player.gridX = snappedX;
    player.gridY = snappedY;
    player.displayX = snappedX;
    player.displayY = snappedY;
    player.x = snappedX;
    player.y = snappedY;
    player.targetGridX = snappedX;
    player.targetGridY = snappedY;

    player.isMoving = false;
    player.moveProgress = 0;

    if (typeof checkTileInteractions === 'function') {
        checkTileInteractions(player);
    }
}

// ############################################################################
// SECTION 7: ENTITY MOVEMENT UPDATES
// ############################################################################

/**
 * Update entity's display position toward its logical position
 * Creates smooth movement between grid tiles
 */
function updateEntityMovement(entity, dt) {
    if (!entity) return;

    if (entity._positionFixAttempted) return;

    if (typeof canMoveTo === 'function') {
        if (!canMoveTo(entity.x, entity.y, false, 0.15)) {
            entity._positionFixAttempted = true;

            for (let r = 1; r <= 5; r++) {
                for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
                        const testX = Math.floor(entity.displayX) + dx;
                        const testY = Math.floor(entity.displayY) + dy;

                        if (testX >= 0 && testX < GRID_WIDTH &&
                            testY >= 0 && testY < GRID_HEIGHT &&
                            canMoveTo(testX, testY, false, 0.15)) {
                            entity.x = entity.gridX = entity.displayX = testX;
                            entity.y = entity.gridY = entity.displayY = testY;
                            return;
                        }
                    }
                }
            }

            if (entity !== game.player && game.enemies) {
                const idx = game.enemies.indexOf(entity);
                if (idx > -1) game.enemies.splice(idx, 1);
            }
            return;
        }
    }

    const moveSpeed = entity.moveSpeed || MOVEMENT_CONFIG.entityMoveSpeed;
    const newDisplayX = lerp(entity.displayX, entity.x, moveSpeed);
    const newDisplayY = lerp(entity.displayY, entity.y, moveSpeed);

    if (typeof canMoveTo !== 'function' || canMoveTo(newDisplayX, newDisplayY, false, 0.15)) {
        entity.displayX = newDisplayX;
        entity.displayY = newDisplayY;
    }

    const snapThreshold = MOVEMENT_CONFIG.snapThreshold;
    if (Math.abs(entity.displayX - entity.x) < snapThreshold) entity.displayX = entity.x;
    if (Math.abs(entity.displayY - entity.y) < snapThreshold) entity.displayY = entity.y;
}

/**
 * Check if entity is currently moving
 */
function isEntityMoving(entity) {
    if (!entity) return false;
    const threshold = MOVEMENT_CONFIG.snapThreshold;
    return Math.abs(entity.displayX - entity.x) > threshold ||
           Math.abs(entity.displayY - entity.y) > threshold;
}

/**
 * Instantly snap display position to logical position
 */
function snapEntityPosition(entity) {
    if (!entity) return;
    entity.displayX = entity.x;
    entity.displayY = entity.y;
}

/**
 * Update a single enemy's movement progress
 * @param {Object} enemy - The enemy to update
 * @param {number} deltaTime - Time since last frame in milliseconds
 */
function updateEnemyMovement(enemy, deltaTime) {
    if (!enemy || !enemy.isMoving) return;

    if (enemy.moveProgress === undefined) {
        enemy.moveProgress = 0;
    }

    const baseSpeed = enemy.moveSpeed || MOVEMENT_CONFIG.enemyBaseMoveSpeed;
    const speedMult = enemy.moveSpeedMult || 1.0;
    const actualSpeed = baseSpeed * speedMult;

    enemy.moveProgress += actualSpeed * (deltaTime / 16.67);
    enemy.moveProgress = Math.min(enemy.moveProgress, 1.0);

    const easeProgress = easeOutQuad(enemy.moveProgress);

    enemy.displayX = lerp(enemy.gridX, enemy.targetGridX, easeProgress);
    enemy.displayY = lerp(enemy.gridY, enemy.targetGridY, easeProgress);

    enemy.x = enemy.displayX;
    enemy.y = enemy.displayY;

    if (enemy.moveProgress >= 1.0) {
        enemy.gridX = enemy.targetGridX;
        enemy.gridY = enemy.targetGridY;
        enemy.displayX = enemy.gridX;
        enemy.displayY = enemy.gridY;
        enemy.x = enemy.gridX;
        enemy.y = enemy.gridY;
        enemy.isMoving = false;
        enemy.moveProgress = 0;
        enemy.moveSpeedMult = 1.0;
    }
}

/**
 * Update all enemies' movement
 * @param {Array} enemies - Array of enemy objects
 * @param {number} deltaTime - Time since last frame in milliseconds
 */
function updateAllEnemyMovement(enemies, deltaTime) {
    if (!enemies) return;

    for (const enemy of enemies) {
        updateEnemyMovement(enemy, deltaTime);
    }
}

// ############################################################################
// SECTION 8: DIRECTION UTILITIES
// ############################################################################

/**
 * Check if a direction is diagonal
 */
function isDiagonalDirection(direction) {
    return ['up-left', 'up-right', 'down-left', 'down-right'].includes(direction);
}

/**
 * Convert any direction to nearest cardinal for sprite display
 * Horizontal priority: diagonals use left/right sprites
 */
function getCardinalFacing(direction) {
    switch (direction) {
        case 'up-left':
        case 'down-left':
            return 'left';
        case 'up-right':
        case 'down-right':
            return 'right';
        default:
            return direction;
    }
}

/**
 * Get direction from delta movement
 */
function getDirectionFromDelta(dx, dy) {
    if (dx === 0 && dy === 0) return null;

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // Check for diagonal
    if (absDx > 0.01 && absDy > 0.01) {
        if (dx < 0 && dy < 0) return 'up-left';
        if (dx > 0 && dy < 0) return 'up-right';
        if (dx < 0 && dy > 0) return 'down-left';
        if (dx > 0 && dy > 0) return 'down-right';
    }

    // Cardinal direction
    if (absDx > absDy) {
        return dx > 0 ? 'right' : 'left';
    } else {
        return dy > 0 ? 'down' : 'up';
    }
}

// ############################################################################
// SECTION 9: EXPORTS
console.log('[MovementMaster] Section 9: Starting exports');
// ############################################################################

if (typeof window !== 'undefined') {
    // Configuration
    window.MOVEMENT_CONFIG = MOVEMENT_CONFIG;

    // Math utilities
    window.lerp = lerp;
    window.easeOutQuad = easeOutQuad;
    window.easeInQuad = easeInQuad;
    window.easeInOutQuad = easeInOutQuad;
    window.getDistance = getDistance;
    window.getDistanceXY = getDistanceXY;
    window.getManhattanDistance = getManhattanDistance;
    window.getDistanceSquared = getDistanceSquared;
    window.isWithinRange = isWithinRange;
    window.normalizeDirection = normalizeDirection;

    // Collision detection
    window.safeGetTile = safeGetTile;
    window.isTileWalkable = isTileWalkable;
    window.isValidTile = isValidTile;
    window.isWalkable = isWalkable;
    window.canMoveTo = canMoveTo;
    window.canMoveToSafe = canMoveToSafe;
    window.canMoveToPosition = canMoveToPosition;
    window.canMoveToTile = canMoveToTile;
    window.canMoveToAxis = canMoveToAxis;
    window.checkCircleCollision = checkCircleCollision;
    window.getEnemiesInRange = getEnemiesInRange;
    window.getClosestEnemy = getClosestEnemy;

    // Line of sight & raycasting
    window.hasLineOfSight = hasLineOfSight;
    window.raycast = raycast;
    window.raycastDetailed = raycastDetailed;

    // Pathfinding
    window.PriorityQueue = PriorityQueue;
    window.heuristic = heuristic;
    window.findPath = findPath;
    window.findPathSmooth = findPathSmooth;
    window.smoothPath = smoothPath;
    window.getAdjacentWalkableTile = getAdjacentWalkableTile;

    // Enemy AI movement utilities
    window.checkEnemyStuck = checkEnemyStuck;
    window.canRequestRepath = canRequestRepath;
    window.markRepathRequested = markRepathRequested;
    window.calculateSeparationForce = calculateSeparationForce;
    window.applySeparationToMovement = applySeparationToMovement;

    // Player movement (velocity-based with wall sliding)
    window.playerVelocity = playerVelocity;
    window.movePlayerContinuous = movePlayerContinuous;
    window.updatePlayerPhysics = updatePlayerPhysics;
    window.cancelPlayerMove = cancelPlayerMove;
    window.getPlayerVelocity = getPlayerVelocity;
    window.setPlayerVelocity = setPlayerVelocity;
    window.addPlayerImpulse = addPlayerImpulse;
    window.getInputVector = getInputVector;
    window.tryCornerNudge = tryCornerNudge;

    // Entity movement updates
    window.updateEntityMovement = updateEntityMovement;
    window.isEntityMoving = isEntityMoving;
    window.snapEntityPosition = snapEntityPosition;
    window.updateEnemyMovement = updateEnemyMovement;
    window.updateAllEnemyMovement = updateAllEnemyMovement;

    // Direction utilities
    window.isDiagonalDirection = isDiagonalDirection;
    window.getCardinalFacing = getCardinalFacing;
    window.getDirectionFromDelta = getDirectionFromDelta;
}

console.log('Movement Master v3 loaded - Pathfinding: tie-break heuristic, path smoothing, stuck detection, separation forces, closest-node fallback');
