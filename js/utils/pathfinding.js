// === A* PATHFINDING MODULE ===
// Grid-based pathfinding for 4-directional movement
// REFACTORED: Checks decoration entity layer instead of tile properties

/**
 * Find optimal path from start to goal using A* algorithm
 * 
 * @param {number} startX - Starting grid X
 * @param {number} startY - Starting grid Y
 * @param {number} goalX - Target grid X
 * @param {number} goalY - Target grid Y
 * @param {Object} options - Pathfinding options
 * @param {boolean} options.ignoreEnemies - Don't treat enemies as obstacles
 * @param {boolean} options.ignoreNPCs - Don't treat NPCs as obstacles
 * @param {number} options.maxIterations - Safety limit (default 1000)
 * @returns {Array} Array of {x, y, direction} steps, or empty array if no path
 */
function findPath(startX, startY, goalX, goalY, options = {}) {
    const {
        ignoreEnemies = false,
        ignoreNPCs = false,
        maxIterations = 1000
    } = options;

    // Quick validation
    startX = Math.floor(startX);
    startY = Math.floor(startY);
    goalX = Math.floor(goalX);
    goalY = Math.floor(goalY);

    // Already at goal?
    if (startX === goalX && startY === goalY) {
        return [];
    }

    // Check if goal is even theoretically reachable
    if (!isValidTile(goalX, goalY)) {
        // Goal is a wall/void - find adjacent tile instead
        const adjacent = getAdjacentWalkableTile(goalX, goalY, ignoreEnemies, ignoreNPCs);
        if (adjacent) {
            goalX = adjacent.x;
            goalY = adjacent.y;
        } else {
            console.log('⚠️ Pathfinding: Goal and surroundings are blocked');
            return [];
        }
    }

    // A* data structures
    const openSet = new PriorityQueue();
    const closedSet = new Set();
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    // Helper to create position key
    const posKey = (x, y) => `${x},${y}`;

    // Initialize start node
    const startKey = posKey(startX, startY);
    gScore.set(startKey, 0);
    fScore.set(startKey, heuristic(startX, startY, goalX, goalY));
    openSet.enqueue({ x: startX, y: startY }, fScore.get(startKey));

    // 4-directional neighbors (no diagonals)
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

        // Reached goal?
        if (current.x === goalX && current.y === goalY) {
            const path = reconstructPath(cameFrom, current, startX, startY);
            console.log(`✓ Path found in ${iterations} iterations, ${path.length} steps`);
            return path;
        }

        closedSet.add(currentKey);

        // Check all neighbors
        for (const { dx, dy, dir } of directions) {
            const neighborX = current.x + dx;
            const neighborY = current.y + dy;
            const neighborKey = posKey(neighborX, neighborY);

            // Skip if already evaluated
            if (closedSet.has(neighborKey)) continue;

            // Skip if not walkable
            if (!isWalkable(neighborX, neighborY, ignoreEnemies, ignoreNPCs)) continue;

            // Calculate tentative g score (cost to reach this neighbor)
            const tentativeG = gScore.get(currentKey) + 1;

            // Is this a better path to this neighbor?
            const previousG = gScore.get(neighborKey) ?? Infinity;

            if (tentativeG < previousG) {
                // This is a better path - record it
                cameFrom.set(neighborKey, { x: current.x, y: current.y, dir: dir });
                gScore.set(neighborKey, tentativeG);
                const f = tentativeG + heuristic(neighborX, neighborY, goalX, goalY);
                fScore.set(neighborKey, f);

                // Add to open set if not already there
                if (!openSet.contains(neighborKey)) {
                    openSet.enqueue({ x: neighborX, y: neighborY }, f);
                }
            }
        }
    }

    // No path found
    if (iterations >= maxIterations) {
        console.warn(`⚠️ Pathfinding: Max iterations (${maxIterations}) reached`);
    } else {
        console.log('⚠️ Pathfinding: No path exists');
    }

    return [];
}

/**
 * Manhattan distance heuristic (admissible for 4-directional movement)
 */
function heuristic(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Check if a tile is valid (within bounds and not void/wall/interior_wall)
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
 * Check if a tile is walkable (valid + no blocking decoration + optionally no entities)
 * REFACTORED: Uses hasBlockingDecorationAt() helper
 */
function isWalkable(x, y, ignoreEnemies = false, ignoreNPCs = false) {
    // Basic validity
    if (!isValidTile(x, y)) {
        return false;
    }

    // REFACTORED: Check decoration entity layer (not tile property)
    if (typeof hasBlockingDecorationAt === 'function' && hasBlockingDecorationAt(x, y)) {
        return false;
    }

    // Enemy check
    if (!ignoreEnemies && game.enemies) {
        const hasEnemy = game.enemies.some(e =>
            Math.floor(e.gridX) === x && Math.floor(e.gridY) === y
        );
        if (hasEnemy) {
            return false;
        }
    }

    // NPC check (merchant, etc.)
    if (!ignoreNPCs && game.merchant) {
        const mx = game.merchant.x !== undefined ? game.merchant.x : game.merchant.gridX;
        const my = game.merchant.y !== undefined ? game.merchant.y : game.merchant.gridY;
        if (Math.floor(mx) === x && Math.floor(my) === y) {
            return false;
        }
    }

    return true;
}

/**
 * Find a walkable tile adjacent to the given position
 * Used when the goal itself is blocked (enemy, NPC, etc.)
 */
function getAdjacentWalkableTile(x, y, ignoreEnemies = false, ignoreNPCs = false) {
    const directions = [
        { dx: 0, dy: -1 },  // up
        { dx: 0, dy: 1 },   // down
        { dx: -1, dy: 0 },  // left
        { dx: 1, dy: 0 }    // right
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
 * Reconstruct path from A* came-from map
 */
function reconstructPath(cameFrom, current, startX, startY) {
    const path = [];
    const posKey = (x, y) => `${x},${y}`;

    let currentKey = posKey(current.x, current.y);

    // Walk backwards through the came-from chain
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


// ==================== PRIORITY QUEUE ====================
// Simple min-heap implementation for A*

class PriorityQueue {
    constructor() {
        this.heap = [];
        this.positions = new Map(); // Track positions for contains() check
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


// ==================== EXPORTS ====================

// Make functions globally available
window.findPath = findPath;
window.isWalkable = isWalkable;
window.isValidTile = isValidTile;
window.getAdjacentWalkableTile = getAdjacentWalkableTile;

console.log('✓ A* Pathfinding system loaded');