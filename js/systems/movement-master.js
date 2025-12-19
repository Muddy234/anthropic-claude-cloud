// ============================================================================
// MOVEMENT MASTER - The Shifting Chasm
// ============================================================================
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

const MOVEMENT_CONFIG = {
    // Player movement
    playerMoveSpeed: 4,           // Tiles per second

    // Sub-tile precision
    tileIncrement: 0.125,         // .125 tile precision for player
    wallMargin: 0.125,            // Margin from walls

    // Entity collision
    playerRadius: 0.2,            // Player bounding radius for collision
    enemyCollisionRadius: 0.3,    // Radius for player-enemy collision

    // Enemy movement
    enemyBaseMoveSpeed: 0.06,     // Base enemy move speed

    // Interpolation
    entityMoveSpeed: 0.08,        // Lerp speed for entity display positions
    snapThreshold: 0.01,          // Distance at which to snap (prevents jitter)

    // Pathfinding
    maxPathIterations: 1000,      // A* iteration limit

    // Diagonal movement
    diagonalFactor: 0.707         // sqrt(2) / 2 for normalized diagonal speed
};

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
 * Manhattan distance heuristic (admissible for 4-directional movement)
 */
function heuristic(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Find optimal path from start to goal using A* algorithm
 * @param {number} startX - Starting grid X
 * @param {number} startY - Starting grid Y
 * @param {number} goalX - Target grid X
 * @param {number} goalY - Target grid Y
 * @param {Object} options - Pathfinding options
 * @returns {Array} Array of {x, y, direction} steps, or empty array if no path
 */
function findPath(startX, startY, goalX, goalY, options = {}) {
    const {
        ignoreEnemies = false,
        ignoreNPCs = false,
        maxIterations = MOVEMENT_CONFIG.maxPathIterations
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
        } else {
            return [];
        }
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

    while (!openSet.isEmpty() && iterations < maxIterations) {
        iterations++;

        const current = openSet.dequeue();
        const currentKey = posKey(current.x, current.y);

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

// ############################################################################
// SECTION 6: PLAYER MOVEMENT
// ############################################################################

/**
 * Move player incrementally based on held direction
 * @param {string} direction - Direction to move (up, down, left, right, up-left, etc.)
 * @param {number} deltaTime - Time since last frame in milliseconds
 */
function movePlayerContinuous(direction, deltaTime) {
    const player = game.player;
    if (!player) return;

    const moveSpeed = player.moveSpeed || MOVEMENT_CONFIG.playerMoveSpeed;
    const moveDelta = (moveSpeed * deltaTime) / 1000;

    let dx = 0, dy = 0;

    switch (direction) {
        case 'up': dy = -moveDelta; break;
        case 'down': dy = moveDelta; break;
        case 'left': dx = -moveDelta; break;
        case 'right': dx = moveDelta; break;
        case 'up-left': dx = -moveDelta * MOVEMENT_CONFIG.diagonalFactor; dy = -moveDelta * MOVEMENT_CONFIG.diagonalFactor; break;
        case 'up-right': dx = moveDelta * MOVEMENT_CONFIG.diagonalFactor; dy = -moveDelta * MOVEMENT_CONFIG.diagonalFactor; break;
        case 'down-left': dx = -moveDelta * MOVEMENT_CONFIG.diagonalFactor; dy = moveDelta * MOVEMENT_CONFIG.diagonalFactor; break;
        case 'down-right': dx = moveDelta * MOVEMENT_CONFIG.diagonalFactor; dy = moveDelta * MOVEMENT_CONFIG.diagonalFactor; break;
    }

    const newX = player.gridX + dx;
    const newY = player.gridY + dy;

    if (canMoveToPosition(newX, newY, player.gridX, player.gridY)) {
        player.gridX = newX;
        player.gridY = newY;
        player.displayX = newX;
        player.displayY = newY;
        player.x = newX;
        player.y = newY;

        player.facing = getCardinalFacing(direction);
        player.isMoving = true;

        const tileX = Math.floor(newX);
        const tileY = Math.floor(newY);
        const prevTileX = Math.floor(player.gridX - dx);
        const prevTileY = Math.floor(player.gridY - dy);

        if (tileX !== prevTileX || tileY !== prevTileY) {
            if (typeof checkTileInteractions === 'function') {
                checkTileInteractions(player);
            }
        }
    }
}

/**
 * Cancel current movement and snap player to nearest tile increment
 */
function cancelPlayerMove() {
    const player = game.player;
    if (!player || !player.isMoving) return;

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
    window.getAdjacentWalkableTile = getAdjacentWalkableTile;

    // Player movement
    window.movePlayerContinuous = movePlayerContinuous;
    window.cancelPlayerMove = cancelPlayerMove;

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

console.log('Movement Master loaded (9 sections: math, collision, LOS, pathfinding, player, entity, directions)');
