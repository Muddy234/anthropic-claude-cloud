// === js/utils/pokemon-movement.js ===
// Pokemon-style grid-locked movement system
// UPDATED: Registers with SystemManager

/**
 * Start a move in the given direction
 * Called when player presses a direction key
 * Supports 8 directions: up, down, left, right, up-left, up-right, down-left, down-right
 */
function startPlayerMove(direction) {
    const player = game.player;

    // Calculate target grid position
    let targetX = player.gridX;
    let targetY = player.gridY;

    switch (direction) {
        case 'up': targetY -= 1; break;
        case 'down': targetY += 1; break;
        case 'left': targetX -= 1; break;
        case 'right': targetX += 1; break;
        case 'up-left': targetX -= 1; targetY -= 1; break;
        case 'up-right': targetX += 1; targetY -= 1; break;
        case 'down-left': targetX -= 1; targetY += 1; break;
        case 'down-right': targetX += 1; targetY += 1; break;
    }

    // Check if target tile is walkable (includes diagonal collision check)
    if (!canMoveToTile(targetX, targetY, player.gridX, player.gridY)) {
        // Just turn to face that direction, don't move
        player.facing = getCardinalFacing(direction);
        return;
    }

    // Start the move!
    player.isMoving = true;
    player.moveProgress = 0;
    player.targetGridX = targetX;
    player.targetGridY = targetY;
    player.facing = getCardinalFacing(direction);
    player.diagonalDirection = isDiagonalDirection(direction) ? direction : null;
    player.bufferedDirection = null;
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
 * Tile-based collision check with diagonal support
 * For diagonal moves, checks destination AND both adjacent tiles to prevent corner-cutting
 * @param {number} targetX - Target grid X
 * @param {number} targetY - Target grid Y
 * @param {number} fromX - Current grid X (optional, needed for diagonal check)
 * @param {number} fromY - Current grid Y (optional, needed for diagonal check)
 */
function canMoveToTile(targetX, targetY, fromX, fromY) {
    // Check destination tile is walkable
    if (!isTileWalkable(targetX, targetY)) {
        return false;
    }

    // Check for enemies at destination
    const hasEnemy = game.enemies.some(e =>
        Math.floor(e.gridX) === targetX && Math.floor(e.gridY) === targetY
    );
    if (hasEnemy) {
        return false;
    }

    // If fromX/fromY provided, check for diagonal movement
    if (fromX !== undefined && fromY !== undefined) {
        const dx = targetX - fromX;
        const dy = targetY - fromY;

        // Diagonal move - must check both adjacent tiles to prevent corner-cutting
        if (dx !== 0 && dy !== 0) {
            // Check horizontal adjacent tile (same row, target column)
            if (!isTileWalkable(fromX + dx, fromY)) {
                return false;
            }
            // Check vertical adjacent tile (target row, same column)
            if (!isTileWalkable(fromX, fromY + dy)) {
                return false;
            }

            // Also check for enemies in adjacent tiles (prevent squeezing between enemies)
            const hasEnemyHorizontal = game.enemies.some(e =>
                Math.floor(e.gridX) === fromX + dx && Math.floor(e.gridY) === fromY
            );
            const hasEnemyVertical = game.enemies.some(e =>
                Math.floor(e.gridX) === fromX && Math.floor(e.gridY) === fromY + dy
            );
            if (hasEnemyHorizontal || hasEnemyVertical) {
                return false;
            }
        }
    }

    return true;
}

/**
 * Update player movement animation
 * Called every frame from main update loop
 */
function updatePlayerMovement(deltaTime) {
    const player = game.player;

    if (!player.isMoving) return;

    // Update move progress based on speed
    player.moveProgress += player.moveSpeed * (deltaTime / 1000);

    // Smooth easing for natural feel
    const easeProgress = easeOutQuad(Math.min(player.moveProgress, 1));

    // Interpolate display position
    player.displayX = lerp(player.gridX, player.targetGridX, easeProgress);
    player.displayY = lerp(player.gridY, player.targetGridY, easeProgress);

    // Update legacy x/y for compatibility
    player.x = player.displayX;
    player.y = player.displayY;

    // Check if move is complete
    if (player.moveProgress >= 1.0) {
        // Snap to target tile
        player.gridX = player.targetGridX;
        player.gridY = player.targetGridY;
        player.displayX = player.gridX;
        player.displayY = player.gridY;
        player.x = player.gridX;
        player.y = player.gridY;
        player.isMoving = false;
        player.moveProgress = 0;

        // Check for tile interactions
        checkTileInteractions(player);

        // If there's a buffered direction, start moving that way
        if (player.bufferedDirection) {
            const nextDir = player.bufferedDirection;
            player.bufferedDirection = null;
            startPlayerMove(nextDir);
        }
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

window.startPlayerMove = startPlayerMove;
window.canMoveToTile = canMoveToTile;
window.isTileWalkable = isTileWalkable;
window.updatePlayerMovement = updatePlayerMovement;
window.updateCameraForPokemon = updateCameraForPokemon;
window.easeOutQuad = easeOutQuad;
window.isDiagonalDirection = isDiagonalDirection;
window.getCardinalFacing = getCardinalFacing;

console.log('✅ Pokemon movement system loaded');
