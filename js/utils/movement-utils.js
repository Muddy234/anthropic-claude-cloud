// === js/utils/movement-utils.js ===
// Core movement utilities - smooth interpolation, distance calculations

/**
 * Linear interpolation (LERP)
 * Smoothly moves a value from start toward end
 */
function lerp(start, end, t) {
    return start + (end - start) * t;
}

/**
 * Update entity's display position toward its logical position
 * This creates smooth movement between grid tiles
 */
function updateEntityMovement(entity, dt) {
    if (!entity) return;

    // Skip entities that already had position fix attempted
    if (entity._positionFixAttempted) return;

    // Validate logical position if canMoveTo is available
    if (typeof canMoveTo === 'function') {
        if (!canMoveTo(entity.x, entity.y, false, 0.15)) {
            entity._positionFixAttempted = true;

            // Try to find nearest valid position
            for (let r = 1; r <= 5; r++) {
                for (let dy = -r; dy <= r; dy++) {
                    for (let dx = -r; dx <= r; dx++) {
                        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue; // Only check perimeter
                        const testX = Math.floor(entity.displayX) + dx;
                        const testY = Math.floor(entity.displayY) + dy;

                        if (testX >= 0 && testX < GRID_WIDTH &&
                            testY >= 0 && testY < GRID_HEIGHT &&
                            canMoveTo(testX, testY, false, 0.15)) {
                            // Found valid position
                            entity.x = entity.gridX = entity.displayX = testX;
                            entity.y = entity.gridY = entity.displayY = testY;
                            return;
                        }
                    }
                }
            }

            // Couldn't fix - remove if enemy
            if (entity !== game.player && game.enemies) {
                const idx = game.enemies.indexOf(entity);
                if (idx > -1) game.enemies.splice(idx, 1);
            }
            return;
        }
    }

    const moveSpeed = entity.moveSpeed || 0.08;
    const newDisplayX = lerp(entity.displayX, entity.x, moveSpeed);
    const newDisplayY = lerp(entity.displayY, entity.y, moveSpeed);

    // Only update if valid position
    if (typeof canMoveTo !== 'function' || canMoveTo(newDisplayX, newDisplayY, false, 0.15)) {
        entity.displayX = newDisplayX;
        entity.displayY = newDisplayY;
    }

    // Snap when very close (prevents jitter)
    if (Math.abs(entity.displayX - entity.x) < 0.01) entity.displayX = entity.x;
    if (Math.abs(entity.displayY - entity.y) < 0.01) entity.displayY = entity.y;
}

/**
 * Check if entity is currently moving
 */
function isEntityMoving(entity) {
    if (!entity) return false;
    return Math.abs(entity.displayX - entity.x) > 0.01 ||
        Math.abs(entity.displayY - entity.y) > 0.01;
}

/**
 * Instantly snap display position to logical position
 * Use for: teleports, spawns, instant repositioning
 */
function snapEntityPosition(entity) {
    if (!entity) return;
    entity.displayX = entity.x;
    entity.displayY = entity.y;
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
 * Calculate Manhattan distance (grid-based)
 */
function getManhattanDistance(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Normalize a direction vector for diagonal movement
 * Prevents moving faster diagonally
 */
function normalizeDirection(dx, dy) {
    if (dx !== 0 && dy !== 0) {
        const factor = 0.707; // sqrt(2) / 2
        return { dx: dx * factor, dy: dy * factor };
    }
    return { dx, dy };
}

// ============================================================================
// EASING FUNCTIONS
// ============================================================================

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

// ============================================================================
// OPTIMIZED DISTANCE CALCULATIONS
// ============================================================================

/**
 * Calculate squared distance (faster than getDistance - avoids sqrt)
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
 * Calculate distance between two coordinate pairs
 */
function getDistanceXY(x1, y1, x2, y2) {
    const dx = x1 - x2;
    const dy = y1 - y2;
    return Math.sqrt(dx * dx + dy * dy);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    // Movement
    window.lerp = lerp;
    window.updateEntityMovement = updateEntityMovement;
    window.isEntityMoving = isEntityMoving;
    window.snapEntityPosition = snapEntityPosition;
    window.normalizeDirection = normalizeDirection;

    // Distance
    window.getDistance = getDistance;
    window.getManhattanDistance = getManhattanDistance;
    window.getDistanceSquared = getDistanceSquared;
    window.getDistanceXY = getDistanceXY;
    window.isWithinRange = isWithinRange;

    // Easing
    window.easeOutQuad = easeOutQuad;
    window.easeInQuad = easeInQuad;
    window.easeInOutQuad = easeInOutQuad;
}

// Movement utilities loaded