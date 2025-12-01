// === AUTO-WALK WITH A* PATHFINDING ===
// Pokemon-style grid movement with intelligent pathfinding

window.autoWalk = {
    active: false,
    targetX: null,
    targetY: null,
    updateInterval: null,
    path: [],
    currentPathIndex: 0,
    recalculateCount: 0,
    maxRecalculations: 3,
    debugMode: false,  // Set to true for detailed logs
    
    // Pathfinding options (set by caller)
    ignoreEnemies: false,
    ignoreNPCs: false
};

/**
 * Start auto-walking to a target grid position
 * 
 * @param {number} targetX - Target grid X
 * @param {number} targetY - Target grid Y
 * @param {Object} options - Pathfinding options
 * @param {boolean} options.ignoreEnemies - Path through enemy tiles
 * @param {boolean} options.ignoreNPCs - Path through NPC tiles
 */
function startAutoWalk(targetX, targetY, options = {}) {
    console.log('=== STARTING AUTO-WALK (A*) ===');
    console.log('Target:', targetX, targetY);

    if (!game || !game.player) {
        console.error('Game or player not found!');
        return;
    }

    const startX = Math.floor(game.player.gridX);
    const startY = Math.floor(game.player.gridY);

    console.log('Current position:', startX, startY);

    // Already there?
    if (startX === targetX && startY === targetY) {
        console.log('✓ Already at destination!');
        return;
    }

    // Stop any existing auto-walk
    stopAutoWalk();

    // Store options
    window.autoWalk.ignoreEnemies = options.ignoreEnemies || false;
    window.autoWalk.ignoreNPCs = options.ignoreNPCs || false;

    // Calculate path using A* (or fallback to simple)
    let path;
    if (typeof findPath === 'function') {
        path = findPath(startX, startY, targetX, targetY, {
            ignoreEnemies: window.autoWalk.ignoreEnemies,
            ignoreNPCs: window.autoWalk.ignoreNPCs
        });
    } else {
        console.warn('⚠️ A* pathfinding not loaded, using simple path');
        path = calculateSimplePath(startX, startY, targetX, targetY);
    }

    if (path.length === 0) {
        console.log('⚠️ No path to target');
        return;
    }

    console.log('📍 Path calculated:', path.length, 'steps');
    if (window.autoWalk.debugMode) {
        console.log('Path:', path.map(p => `(${p.x},${p.y})`).join(' → '));
    }

    // Activate auto-walk
    window.autoWalk.active = true;
    window.autoWalk.targetX = targetX;
    window.autoWalk.targetY = targetY;
    window.autoWalk.path = path;
    window.autoWalk.currentPathIndex = 0;
    window.autoWalk.recalculateCount = 0;

    // Store on player for reference
    if (game.player) {
        game.player.manualMoveTarget = { x: targetX, y: targetY };
    }

    // Start checking for movement opportunities
    window.autoWalk.updateInterval = setInterval(updateAutoWalk, 50);

    console.log('✓ Auto-walk initialized');
}

/**
 * Fallback simple path calculator (greedy approach)
 * Used only if A* pathfinding module isn't loaded
 */
function calculateSimplePath(startX, startY, targetX, targetY) {
    const path = [];
    let currentX = startX;
    let currentY = startY;

    const checkMove = (typeof canMoveToTile === 'function') ? canMoveToTile :
                      (typeof canMoveTo === 'function') ? canMoveTo :
                      (x, y) => true;

    while (currentX !== targetX || currentY !== targetY) {
        let direction = null;
        let nextX = currentX;
        let nextY = currentY;

        const dx = targetX - currentX;
        const dy = targetY - currentY;

        if (Math.abs(dx) >= Math.abs(dy)) {
            if (dx > 0) { direction = 'right'; nextX++; }
            else if (dx < 0) { direction = 'left'; nextX--; }
        } else {
            if (dy > 0) { direction = 'down'; nextY++; }
            else if (dy < 0) { direction = 'up'; nextY--; }
        }

        if (direction && checkMove(nextX, nextY)) {
            path.push({ x: nextX, y: nextY, direction: direction });
            currentX = nextX;
            currentY = nextY;
        } else {
            break; // Blocked
        }

        if (path.length > 100) break;
    }

    return path;
}

/**
 * Update auto-walk - execute next move when ready
 */
function updateAutoWalk() {
    if (!window.autoWalk.active) return;

    // Debug logging
    if (window.autoWalk.debugMode) {
        console.log('[TICK] isMoving:', game?.player?.isMoving,
            'progress:', game?.player?.moveProgress?.toFixed(2),
            'step:', window.autoWalk.currentPathIndex + '/' + window.autoWalk.path.length);
    }

    if (!game || !game.player) {
        console.error('Game/player lost during auto-walk');
        stopAutoWalk();
        return;
    }

    // Stop if game state changed
    if (game.state !== 'playing') {
        console.log('Game state changed, stopping auto-walk');
        stopAutoWalk();
        return;
    }

    // Wait for current movement to complete
    if (game.player.isMoving === true) {
        return;
    }

    if (game.player.moveProgress > 0 && game.player.moveProgress < 1) {
        return;
    }

    // Current position
    const currentX = Math.floor(game.player.gridX);
    const currentY = Math.floor(game.player.gridY);

    // Check if we've reached the target
    if (currentX === window.autoWalk.targetX && currentY === window.autoWalk.targetY) {
        console.log('✓ Reached destination:', window.autoWalk.targetX, window.autoWalk.targetY);
        stopAutoWalk();
        return;
    }

    // Get next step
    if (window.autoWalk.currentPathIndex >= window.autoWalk.path.length) {
        // Path exhausted but not at target - try recalculating
        if (!tryRecalculatePath(currentX, currentY)) {
            console.log('⚠️ Cannot reach target, stopping');
            stopAutoWalk();
        }
        return;
    }

    const nextStep = window.autoWalk.path[window.autoWalk.currentPathIndex];

    // Verify the next step is still valid (enemy might have moved there)
    const checkFn = (typeof canMoveToTile === 'function') ? canMoveToTile :
                    (typeof isWalkable === 'function') ? isWalkable :
                    () => true;

    // When checking, respect the ignoreEnemies setting
    let canMove;
    if (typeof isWalkable === 'function') {
        canMove = isWalkable(nextStep.x, nextStep.y, window.autoWalk.ignoreEnemies, window.autoWalk.ignoreNPCs);
    } else {
        canMove = checkFn(nextStep.x, nextStep.y);
    }

    if (!canMove) {
        console.log('⚠️ Next step blocked at', nextStep.x, nextStep.y, '- recalculating...');
        if (!tryRecalculatePath(currentX, currentY)) {
            console.log('⚠️ Path blocked, cannot continue');
            stopAutoWalk();
        }
        return;
    }

    // Execute the move
    if (typeof startPlayerMove === 'function') {
        if (window.autoWalk.debugMode) {
            console.log(`→ Step ${window.autoWalk.currentPathIndex + 1}/${window.autoWalk.path.length}: Moving ${nextStep.direction}`);
        }
        startPlayerMove(nextStep.direction);
        window.autoWalk.currentPathIndex++;
    } else {
        console.error('❌ startPlayerMove not found!');
        stopAutoWalk();
    }
}

/**
 * Try to recalculate path to target
 * Returns true if new path found, false if we should give up
 */
function tryRecalculatePath(currentX, currentY) {
    window.autoWalk.recalculateCount++;

    if (window.autoWalk.recalculateCount > window.autoWalk.maxRecalculations) {
        console.log(`⚠️ Max recalculations (${window.autoWalk.maxRecalculations}) exceeded`);
        return false;
    }

    console.log(`🔄 Recalculating path (attempt ${window.autoWalk.recalculateCount}/${window.autoWalk.maxRecalculations})...`);

    let newPath;
    if (typeof findPath === 'function') {
        newPath = findPath(currentX, currentY, window.autoWalk.targetX, window.autoWalk.targetY, {
            ignoreEnemies: window.autoWalk.ignoreEnemies,
            ignoreNPCs: window.autoWalk.ignoreNPCs
        });
    } else {
        newPath = calculateSimplePath(currentX, currentY, window.autoWalk.targetX, window.autoWalk.targetY);
    }

    if (newPath.length === 0) {
        console.log('⚠️ No alternative path found');
        return false;
    }

    console.log('✓ New path found:', newPath.length, 'steps');
    window.autoWalk.path = newPath;
    window.autoWalk.currentPathIndex = 0;
    return true;
}

/**
 * Stop auto-walking
 */
function stopAutoWalk() {
    if (window.autoWalk.updateInterval) {
        clearInterval(window.autoWalk.updateInterval);
        window.autoWalk.updateInterval = null;
    }

    window.autoWalk.active = false;
    window.autoWalk.targetX = null;
    window.autoWalk.targetY = null;
    window.autoWalk.path = [];
    window.autoWalk.currentPathIndex = 0;
    window.autoWalk.recalculateCount = 0;
    window.autoWalk.ignoreEnemies = false;
    window.autoWalk.ignoreNPCs = false;

    if (game && game.player) {
        game.player.manualMoveTarget = null;
    }

    console.log('✓ Auto-walk stopped');
}

/**
 * Check if auto-walk is currently active
 */
function isAutoWalking() {
    return window.autoWalk.active;
}

/**
 * Get remaining steps in current path
 */
function getRemainingSteps() {
    if (!window.autoWalk.active) return 0;
    return window.autoWalk.path.length - window.autoWalk.currentPathIndex;
}

// Make functions globally accessible
window.startAutoWalk = startAutoWalk;
window.stopAutoWalk = stopAutoWalk;
window.updateAutoWalk = updateAutoWalk;
window.isAutoWalking = isAutoWalking;
window.getRemainingSteps = getRemainingSteps;

// Hook into combat to stop auto-walk
function hookCombat() {
    if (typeof engageCombat !== 'undefined' && !window.combatHooked) {
        const originalEngageCombat = engageCombat;
        window.engageCombat = function (...args) {
            // Don't stop auto-walk when engaging combat
            // This allows walking toward enemy while combat is queued
            // Combat system handles range checking
            return originalEngageCombat.apply(this, args);
        };
        window.combatHooked = true;
        console.log('✓ Combat hooked for auto-walk');
    }
}

hookCombat();
window.addEventListener('load', hookCombat);

console.log('✓ Auto-walk system (A* Pathfinding) loaded');