// === js/utils/collision.js ===
// Collision detection with minimal logging
// UPDATED: raycast() now checks decoration blocking for LOS

/**
 * Safely get a tile from the map, returning null if out of bounds
 * This prevents crashes from accessing undefined map indices
 */
function safeGetTile(x, y) {
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);
    
    // Bounds check
    if (gridX < 0 || gridX >= GRID_WIDTH || 
        gridY < 0 || gridY >= GRID_HEIGHT) {
        return null;
    }
    
    // Double-check row exists (defensive programming)
    if (!game.map[gridY]) return null;
    
    return game.map[gridY][gridX] || null;
}

/**
 * Check if a position is valid for movement
 * Uses hasBlockingDecorationAt() helper from room-themes.js
 */
function canMoveTo(x, y, checkEnemies = false, entityRadius = 0.2) {
    // STRICT: Enforce map boundaries with padding
    if (x - entityRadius < 0 || x + entityRadius >= GRID_WIDTH ||
        y - entityRadius < 0 || y + entityRadius >= GRID_HEIGHT) {
        return false;
    }

    // Define the player's bounding box corners
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

    // Check ALL points - if ANY point is in void/wall, reject movement
    for (const point of checkPoints) {
        const gridX = Math.floor(point.x);
        const gridY = Math.floor(point.y);

        // Paranoid bounds check
        if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) {
            return false;
        }

        // Use safe tile accessor
        const tile = safeGetTile(gridX, gridY);
        if (!tile || tile.type === 'void' || tile.type === 'wall') {
            return false;
        }

        // Check decoration entity layer
        if (typeof hasBlockingDecorationAt === 'function' && hasBlockingDecorationAt(gridX, gridY)) {
            return false;
        }
    }

    // Check for enemy collision (optional)
    if (checkEnemies && game.enemies) {
        const centerGridX = Math.floor(x);
        const centerGridY = Math.floor(y);
        const hasEnemy = game.enemies.some(e =>
            Math.floor(e.x) === centerGridX && Math.floor(e.y) === centerGridY
        );
        if (hasEnemy) {
            return false;
        }
    }

    // Movement allowed
    return true;
}

/**
 * Safe movement check - prevents corner cutting
 */
function canMoveToSafe(fromX, fromY, toX, toY, entityRadius = 0.2) {
    // Check destination
    if (!canMoveTo(toX, toY, false, entityRadius)) {
        return false;
    }

    // For diagonal movement, check intermediate positions
    const dx = toX - fromX;
    const dy = toY - fromY;

    if (Math.abs(dx) > 0.01 && Math.abs(dy) > 0.01) {
        // Check the two intermediate cardinal directions
        if (!canMoveTo(toX, fromY, false, entityRadius)) {
            return false;
        }
        if (!canMoveTo(fromX, toY, false, entityRadius)) {
            return false;
        }

        // Also check a couple points along the diagonal path
        const midX = fromX + dx * 0.5;
        const midY = fromY + dy * 0.5;
        if (!canMoveTo(midX, midY, false, entityRadius)) {
            return false;
        }
    }

    return true;
}

function checkCircleCollision(entity1, entity2, radius1 = 0.4, radius2 = 0.4) {
    const dx = entity1.displayX - entity2.displayX;
    const dy = entity1.displayY - entity2.displayY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    return distance < (radius1 + radius2);
}

function getEnemiesInRange(entity, range) {
    if (!game.enemies) return [];

    return game.enemies.filter(enemy => {
        const dx = entity.displayX - enemy.displayX;
        const dy = entity.displayY - enemy.displayY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= range;
    });
}

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

function hasLineOfSight(fromEntity, toEntity) {
    const x1 = Math.floor(fromEntity.displayX);
    const y1 = Math.floor(fromEntity.displayY);
    const x2 = Math.floor(toEntity.displayX);
    const y2 = Math.floor(toEntity.displayY);

    return raycast(x1, y1, x2, y2);
}

/**
 * Raycast between two points
 * UPDATED: Now checks for vision-blocking decorations
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y
 * @param {number} x2 - End X
 * @param {number} y2 - End Y
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
        // Use safe tile accessor to prevent crashes
        const tile = safeGetTile(x, y);
        if (!tile || tile.type === 'wall' || tile.type === 'void') {
            return false; // Vision blocked by wall or out of bounds
        }

        // === NEW: Check for vision-blocking decorations ===
        if (typeof hasVisionBlockingDecorationAt === 'function' && hasVisionBlockingDecorationAt(x, y)) {
            return false; // Vision blocked by decoration
        }

        // Reached target
        if (x === x2 && y === y2) {
            return true;
        }

        // Step along line (Bresenham's algorithm)
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
 * Useful for debugging and advanced AI
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y
 * @param {number} x2 - End X
 * @param {number} y2 - End Y
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
        
        // Check walls/void
        if (!tile || tile.type === 'wall' || tile.type === 'void') {
            return { hit: true, x: x, y: y, type: tile ? tile.type : 'out_of_bounds' };
        }

        // Check vision-blocking decorations
        if (typeof hasVisionBlockingDecorationAt === 'function' && hasVisionBlockingDecorationAt(x, y)) {
            return { hit: true, x: x, y: y, type: 'decoration' };
        }

        // Reached target
        if (x === x2 && y === y2) {
            return { hit: false, x: x2, y: y2, type: 'clear' };
        }

        // Step along line
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


// ============================================================
// GLOBAL EXPORTS
// ============================================================

if (typeof window !== 'undefined') {
    window.safeGetTile = safeGetTile;
    window.canMoveTo = canMoveTo;
    window.canMoveToSafe = canMoveToSafe;
    window.checkCircleCollision = checkCircleCollision;
    window.getEnemiesInRange = getEnemiesInRange;
    window.getClosestEnemy = getClosestEnemy;
    window.hasLineOfSight = hasLineOfSight;
    window.raycast = raycast;
    window.raycastDetailed = raycastDetailed;
}

console.log('✅ Collision system loaded (with decoration LOS blocking)');