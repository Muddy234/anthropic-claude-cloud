// === js/utils/pokemon-movement.js ===
// Continuous sub-tile movement system with .125 precision
// UPDATED: Registers with SystemManager

/**
 * Move player incrementally based on held direction
 * Called each frame from input handler
 * @param {string} direction - Direction to move (up, down, left, right, up-left, etc.)
 * @param {number} deltaTime - Time since last frame in milliseconds
 */
function movePlayerContinuous(direction, deltaTime) {
    const player = game.player;
    if (!player) return;

    // Calculate movement delta based on speed and time
    const moveSpeed = player.moveSpeed || 4; // tiles per second
    const moveDelta = (moveSpeed * deltaTime) / 1000; // tiles to move this frame

    // Calculate direction vector
    let dx = 0, dy = 0;

    switch (direction) {
        case 'up': dy = -moveDelta; break;
        case 'down': dy = moveDelta; break;
        case 'left': dx = -moveDelta; break;
        case 'right': dx = moveDelta; break;
        case 'up-left': dx = -moveDelta * 0.707; dy = -moveDelta * 0.707; break;
        case 'up-right': dx = moveDelta * 0.707; dy = -moveDelta * 0.707; break;
        case 'down-left': dx = -moveDelta * 0.707; dy = moveDelta * 0.707; break;
        case 'down-right': dx = moveDelta * 0.707; dy = moveDelta * 0.707; break;
    }

    // Calculate new position
    const newX = player.gridX + dx;
    const newY = player.gridY + dy;

    // Check if new position is valid
    if (canMoveToPosition(newX, newY, player.gridX, player.gridY)) {
        // Update position
        player.gridX = newX;
        player.gridY = newY;
        player.displayX = newX;
        player.displayY = newY;
        player.x = newX;
        player.y = newY;

        // Update facing direction
        player.facing = getCardinalFacing(direction);
        player.isMoving = true;

        // Check for tile interactions (only on whole tile boundaries)
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
 * Check if a direction is diagonal
 */
function isDiagonalDirection(direction) {
    return ['up-left', 'up-right', 'down-left', 'down-right'].includes(direction);
}

/**
 * Convert any direction (including diagonal) to nearest cardinal for sprite display
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
            return direction; // Already cardinal
    }
}

/**
 * Check if a single tile is walkable (no diagonal logic)
 */
function isTileWalkable(gridX, gridY) {
    // Bounds check
    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) {
        return false;
    }

    // Get tile
    const tile = game.map[gridY]?.[gridX];

    // Check tile type (includes interior_wall from chamber generation)
    if (!tile || tile.type === 'void' || tile.type === 'wall' || tile.type === 'interior_wall') {
        return false;
    }

    // Check decoration entity layer
    if (typeof hasBlockingDecorationAt === 'function' && hasBlockingDecorationAt(gridX, gridY)) {
        return false;
    }

    return true;
}

/**
 * Position-based collision check with sub-tile precision
 * Supports diagonal movement with proper wall collision
 * @param {number} newX - New X position (sub-tile like 10.375)
 * @param {number} newY - New Y position (sub-tile like 5.625)
 * @param {number} oldX - Current X position
 * @param {number} oldY - Current Y position
 */
function canMoveToPosition(newX, newY, oldX, oldY) {
    const WALL_MARGIN = 0.125;

    // Get the tile coordinates
    const newTileX = Math.floor(newX);
    const newTileY = Math.floor(newY);

    // Check if the tile we're in is walkable
    if (!isTileWalkable(newTileX, newTileY)) {
        return false;
    }

    // Calculate fractional position within tile (0 to 1)
    const fracX = newX - newTileX;
    const fracY = newY - newTileY;

    // Only check adjacent walls if we're close to the edge AND have a wall there
    // Left edge - check if there's a wall to the left
    if (fracX < WALL_MARGIN && !isTileWalkable(newTileX - 1, newTileY)) {
        return false;
    }
    // Right edge - check if there's a wall to the right
    if (fracX > (1 - WALL_MARGIN) && !isTileWalkable(newTileX + 1, newTileY)) {
        return false;
    }
    // Top edge - check if there's a wall above
    if (fracY < WALL_MARGIN && !isTileWalkable(newTileX, newTileY - 1)) {
        return false;
    }
    // Bottom edge - check if there's a wall below
    if (fracY > (1 - WALL_MARGIN) && !isTileWalkable(newTileX, newTileY + 1)) {
        return false;
    }

    // For diagonal movement, check corners to prevent wall clipping
    const dx = newX - oldX;
    const dy = newY - oldY;

    if (Math.abs(dx) > 0.001 && Math.abs(dy) > 0.001) {
        // Moving diagonally - check the corner tile
        const moveRight = dx > 0;
        const moveDown = dy > 0;

        const cornerX = moveRight ? newTileX + 1 : newTileX - 1;
        const cornerY = moveDown ? newTileY + 1 : newTileY - 1;

        // Check if moving into a diagonal corner with walls on both sides
        const hasWallX = !isTileWalkable(cornerX, newTileY);
        const hasWallY = !isTileWalkable(newTileX, cornerY);

        // Block if both adjacent tiles are walls (corner cutting)
        if (hasWallX && hasWallY) {
            return false;
        }
    }

    // Check for enemy collision - use small core radius to prevent overlap only
    // This allows player to move freely when adjacent to enemies (no more trap bug)
    const COLLISION_RADIUS = 0.3; // Small radius - prevents literal overlap, not proximity
    for (const enemy of game.enemies) {
        if (enemy.hp <= 0) continue; // Skip dead enemies

        const dx = newX - enemy.gridX;
        const dy = newY - enemy.gridY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only block if player would literally overlap with enemy core
        if (distance < COLLISION_RADIUS) {
            return false;
        }
    }

    return true;
}

/**
 * Legacy function for compatibility - redirects to canMoveToPosition
 */
function canMoveToTile(targetX, targetY, fromX, fromY) {
    return canMoveToPosition(targetX, targetY, fromX || targetX, fromY || targetY);
}

/**
 * Update player movement state
 * Called every frame from main update loop
 * Now just ensures isMoving flag is properly managed
 */
function updatePlayerMovement(deltaTime) {
    // Movement is handled by movePlayerContinuous called from input handler
    // This function is kept for compatibility but does minimal work
    const player = game.player;
    if (!player) return;

    // Player positions are updated directly by movePlayerContinuous
    // No interpolation needed anymore
}

/**
 * Cancel current movement and snap player to nearest .125 tile increment
 */
function cancelPlayerMove() {
    const player = game.player;
    if (!player || !player.isMoving) return;

    // Snap to nearest .125 increment
    const snapIncrement = 0.125;
    const snappedX = Math.round(player.displayX / snapIncrement) * snapIncrement;
    const snappedY = Math.round(player.displayY / snapIncrement) * snapIncrement;

    // Update all position values
    player.gridX = snappedX;
    player.gridY = snappedY;
    player.displayX = snappedX;
    player.displayY = snappedY;
    player.x = snappedX;
    player.y = snappedY;
    player.targetGridX = snappedX;
    player.targetGridY = snappedY;

    // Stop movement
    player.isMoving = false;
    player.moveProgress = 0;

    // Check for tile interactions at new position
    if (typeof checkTileInteractions === 'function') {
        checkTileInteractions(player);
    }
}

/**
 * Ease-out quadratic - starts fast, ends slow (feels natural)
 */
function easeOutQuad(t) {
    return t * (2 - t);
}

/**
 * Update camera to smoothly follow player (Pokemon-style)
 */
function updateCameraForPokemon(deltaTime) {
    if (!game.player) return;

    const viewW = canvas.width - TRACKER_WIDTH;

    // Calculate target camera position (center on player)
    const targetCamX = game.player.displayX - viewW / (2 * TILE_SIZE * ZOOM_LEVEL);
    const targetCamY = game.player.displayY - canvas.height / (2 * TILE_SIZE * ZOOM_LEVEL);

    // Initialize camera if needed
    if (!game.camera) {
        game.camera = { x: targetCamX, y: targetCamY, targetX: targetCamX, targetY: targetCamY };
        return;
    }

    // Smooth camera follow
    const cameraSpeed = 8;
    const smoothing = Math.min(cameraSpeed * (deltaTime / 1000), 1);

    game.camera.x = lerp(game.camera.x, targetCamX, smoothing);
    game.camera.y = lerp(game.camera.y, targetCamY, smoothing);

    // Snap when very close
    if (Math.abs(game.camera.x - targetCamX) < 0.01) {
        game.camera.x = targetCamX;
    }
    if (Math.abs(game.camera.y - targetCamY) < 0.01) {
        game.camera.y = targetCamY;
    }
}

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const PokemonMovementSystem = {
    name: 'pokemon-movement',
    
    update(dt) {
        // Update player movement animation
        if (game.player) {
            updatePlayerMovement(dt);
        }
    }
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('pokemon-movement', PokemonMovementSystem, 20);
} else {
    console.warn('⚠️ SystemManager not found - pokemon-movement running standalone');
}

// ============================================================================
// EXPORTS
// ============================================================================

window.movePlayerContinuous = movePlayerContinuous;
window.cancelPlayerMove = cancelPlayerMove;
window.canMoveToPosition = canMoveToPosition;
window.canMoveToTile = canMoveToTile; // Legacy compatibility
window.isTileWalkable = isTileWalkable;
window.updatePlayerMovement = updatePlayerMovement;
window.updateCameraForPokemon = updateCameraForPokemon;
window.isDiagonalDirection = isDiagonalDirection;
window.getCardinalFacing = getCardinalFacing;

console.log('✅ Continuous movement system loaded');
