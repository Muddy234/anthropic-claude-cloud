// === js/utils/enemy-movement-updater.js ===
// Updates enemy grid-based movement with smooth interpolation
// This is the MISSING PIECE that makes enemies actually move!

/**
 * Update a single enemy's movement progress
 * Call this for each enemy in the main update loop
 * @param {Object} enemy - The enemy to update
 * @param {number} deltaTime - Time since last frame in milliseconds
 */
function updateEnemyMovement(enemy, deltaTime) {
    if (!enemy || !enemy.isMoving) return;
    
    // Initialize moveProgress if it doesn't exist
    if (enemy.moveProgress === undefined) {
        enemy.moveProgress = 0;
    }
    
    // Get move speed (with optional multiplier for fleeing/chasing)
    const baseSpeed = enemy.moveSpeed || 0.06;  // Same as spawn default
    const speedMult = enemy.moveSpeedMult || 1.0;
    const actualSpeed = baseSpeed * speedMult;
    
    // Update move progress
    enemy.moveProgress += actualSpeed * (deltaTime / 16.67);  // Normalize to ~60fps
    
    // Clamp progress
    enemy.moveProgress = Math.min(enemy.moveProgress, 1.0);
    
    // Smooth easing
    const easeProgress = easeOutQuad(enemy.moveProgress);
    
    // Interpolate display position toward target
    enemy.displayX = lerp(enemy.gridX, enemy.targetGridX, easeProgress);
    enemy.displayY = lerp(enemy.gridY, enemy.targetGridY, easeProgress);
    
    // Update legacy x/y for compatibility
    enemy.x = enemy.displayX;
    enemy.y = enemy.displayY;
    
    // Check if move is complete
    if (enemy.moveProgress >= 1.0) {
        // Snap to target tile
        enemy.gridX = enemy.targetGridX;
        enemy.gridY = enemy.targetGridY;
        enemy.displayX = enemy.gridX;
        enemy.displayY = enemy.gridY;
        enemy.x = enemy.gridX;
        enemy.y = enemy.gridY;
        enemy.isMoving = false;
        enemy.moveProgress = 0;
        enemy.moveSpeedMult = 1.0;  // Reset multiplier
    }
}

/**
 * Update all enemies' movement
 * Call this once per frame from main update loop
 * @param {Array} enemies - Array of enemy objects
 * @param {number} deltaTime - Time since last frame in milliseconds
 */
function updateAllEnemyMovement(enemies, deltaTime) {
    if (!enemies) return;
    
    for (const enemy of enemies) {
        updateEnemyMovement(enemy, deltaTime);
    }
}

// NOTE: easeOutQuad and lerp are now provided by movement-utils.js

// ============================================================
// GLOBAL EXPORTS
// ============================================================

if (typeof window !== 'undefined') {
    window.updateEnemyMovement = updateEnemyMovement;
    window.updateAllEnemyMovement = updateAllEnemyMovement;
}

console.log('✅ Enemy movement updater loaded');