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
 * FIXED: Validates logical position and prevents infinite collision spam
 */
function updateEntityMovement(entity, dt) {
    if (!entity) return;

    // CRITICAL FIX: If the entity's logical position is invalid, snap it to display position
    // This prevents the interpolation system from trying to reach an unreachable target
    if (typeof canMoveTo === 'function') {
        // Skip if we already tried to fix this entity
        if (entity._positionFixAttempted) {
            return; // Don't keep trying every frame
        }
        
        const logicalPositionValid = canMoveTo(entity.x, entity.y, false, 0.15);
        
        if (!logicalPositionValid) {
            console.warn(`⚠️ Entity at invalid logical position (${entity.x}, ${entity.y}). Snapping to last valid display position.`);
            entity._positionFixAttempted = true; // Mark so we don't try again
            
            // Try to find nearest valid position using canMoveTo validation
            let fixed = false;
            const searchRadius = 5;
            
            // Silence logs during search
            const originalLog = console.log;
            console.log = function() {};
            
            for (let dy = -searchRadius; dy <= searchRadius && !fixed; dy++) {
                for (let dx = -searchRadius; dx <= searchRadius && !fixed; dx++) {
                    const testX = Math.floor(entity.displayX) + dx;
                    const testY = Math.floor(entity.displayY) + dy;
                    
                    if (testX >= 0 && testX < GRID_WIDTH && testY >= 0 && testY < GRID_HEIGHT) {
                        // Use canMoveTo to validate - same check as movement system
                        if (canMoveTo(testX, testY, false, 0.15)) {
                            // Found valid position - use INTEGER positions for enemies
                            entity.x = testX;
                            entity.y = testY;
                            entity.gridX = testX;
                            entity.gridY = testY;
                            entity.displayX = testX;
                            entity.displayY = testY;
                            console.log = originalLog; // Restore logging
                            console.log(`✅ Fixed entity position to (${testX}, ${testY})`);
                            fixed = true;
                        }
                    }
                }
            }
            
            console.log = originalLog; // Restore logging even if not fixed
            
            if (!fixed) {
                // Couldn't find valid position - remove entity if it's an enemy
                if (entity !== game.player && game.enemies) {
                    const idx = game.enemies.indexOf(entity);
                    if (idx > -1) {
                        game.enemies.splice(idx, 1);
                        console.log('🗑️ Removed stuck entity from game');
                    }
                }
            }
            return; // Don't interpolate this frame
        }
    }

    const moveSpeed = entity.moveSpeed || 0.08;

    // Calculate new interpolated positions
    const newDisplayX = lerp(entity.displayX, entity.x, moveSpeed);
    const newDisplayY = lerp(entity.displayY, entity.y, moveSpeed);

    // SAFETY CHECK: Only update display position if it's valid
    // Use a smaller radius for interpolation checks to avoid false positives
    const interpolationRadius = 0.15;

    // Check if new position is valid (but don't spam logs)
    let canMoveToNew = true;
    if (typeof canMoveTo === 'function') {
        // Temporarily disable logging for interpolation checks
        const originalLog = console.log;
        console.log = function() {}; // Silence logs
        canMoveToNew = canMoveTo(newDisplayX, newDisplayY, false, interpolationRadius);
        console.log = originalLog; // Restore logging
    }

    if (canMoveToNew) {
        entity.displayX = newDisplayX;
        entity.displayY = newDisplayY;
    }
    // If we can't move, just stay at current display position (don't spam checks)

    // Snap when very close (prevents jitter)
    if (Math.abs(entity.displayX - entity.x) < 0.01) {
        entity.displayX = entity.x;
    }
    if (Math.abs(entity.displayY - entity.y) < 0.01) {
        entity.displayY = entity.y;
    }
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