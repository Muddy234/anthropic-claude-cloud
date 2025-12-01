// === js/utils/pokemon-movement.js ===
// Pokemon-style grid-locked movement system
// UPDATED: Registers with SystemManager

/**
 * Start a move in the given direction
 * Called when player presses a direction key
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
    }

    // Check if target tile is walkable
    if (!canMoveToTile(targetX, targetY)) {
        // Just turn to face that direction, don't move
        player.facing = direction;
        return;
    }

    // Start the move!
    player.isMoving = true;
    player.moveProgress = 0;
    player.targetGridX = targetX;
    player.targetGridY = targetY;
    player.facing = direction;
    player.bufferedDirection = null;
}

/**
 * Simple tile-based collision check
 */
function canMoveToTile(gridX, gridY) {
    // Bounds check
    if (gridX < 0 || gridX >= GRID_WIDTH || gridY < 0 || gridY >= GRID_HEIGHT) {
        return false;
    }

    // Get tile
    const tile = game.map[gridY][gridX];

    // Check tile type
    if (!tile || tile.type === 'void' || tile.type === 'wall') {
        return false;
    }

    // Check decoration entity layer
    if (typeof hasBlockingDecorationAt === 'function' && hasBlockingDecorationAt(gridX, gridY)) {
        return false;
    }

    // Check for enemies
    const hasEnemy = game.enemies.some(e =>
        e.gridX === gridX && e.gridY === gridY
    );
    if (hasEnemy) {
        return false;
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
window.updatePlayerMovement = updatePlayerMovement;
window.updateCameraForPokemon = updateCameraForPokemon;
window.easeOutQuad = easeOutQuad;

console.log('✅ Pokemon movement system loaded');
