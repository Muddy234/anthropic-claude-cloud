// === js/systems/player-animation.js ===
// Player animation system with pixel sprite support
// Uses layered pixel sprites (warrior design) with equipment rendering
// Falls back to spritesheet system if pixel sprites unavailable

// Flag to track which system to use
let usePixelSprites = false;

// Spritesheet configuration (fallback)
const PLAYER_SPRITESHEET_CONFIG = {
    // Frame layout: 4 columns × 5 rows = 20 frames per direction
    columns: 4,
    rows: 5,
    totalFrames: 20,

    // Frame dimensions (will be calculated from loaded image)
    frameWidth: 0,
    frameHeight: 0,

    // Animation settings
    walkFrameStart: 0,
    walkFrameCount: 20,
    idleFrame: 0,

    // Timing
    framesPerSecond: 6,

    // Track if sprites are loaded
    loaded: false
};

// Spritesheet images (one per direction)
const playerSpritesheets = {
    down: new Image(),
    up: new Image(),
    left: new Image(),
    right: new Image()
};

// Check for pixel sprite system availability
function initPlayerSpriteSystem() {
    // Check if pixel sprite system is loaded
    if (typeof PLAYER_SPRITES !== 'undefined' &&
        typeof PlayerSpriteRenderer !== 'undefined' &&
        typeof PLAYER_SPRITE_CONFIG !== 'undefined') {
        usePixelSprites = true;
        window.usePixelSprites = true;  // Update global export
        console.log('✅ Using pixel sprite system for player');
    } else {
        usePixelSprites = false;
        window.usePixelSprites = false;
        console.log('⚠️ Pixel sprites not available, loading spritesheets as fallback');
        loadPlayerSpritesheets();
    }
}

// Load spritesheets (fallback system)
function loadPlayerSpritesheets() {
    let loadedCount = 0;
    const totalSheets = 4;

    const onLoad = function() {
        loadedCount++;
        console.log(`✓ Loaded player spritesheet (${loadedCount}/${totalSheets})`);

        if (loadedCount === totalSheets) {
            const img = playerSpritesheets.down;
            PLAYER_SPRITESHEET_CONFIG.frameWidth = Math.floor(img.width / PLAYER_SPRITESHEET_CONFIG.columns);
            PLAYER_SPRITESHEET_CONFIG.frameHeight = Math.floor(img.height / PLAYER_SPRITESHEET_CONFIG.rows);
            PLAYER_SPRITESHEET_CONFIG.loaded = true;

            console.log(`✓ All player spritesheets loaded!`);
            console.log(`  Frame size: ${PLAYER_SPRITESHEET_CONFIG.frameWidth} × ${PLAYER_SPRITESHEET_CONFIG.frameHeight}`);
        }
    };

    const onError = function(e) {
        console.error('❌ Failed to load player spritesheet:', e.target.src);
    };

    // Set up load handlers
    playerSpritesheets.down.onload = onLoad;
    playerSpritesheets.up.onload = onLoad;
    playerSpritesheets.left.onload = onLoad;
    playerSpritesheets.right.onload = onLoad;

    playerSpritesheets.down.onerror = onError;
    playerSpritesheets.up.onerror = onError;
    playerSpritesheets.left.onerror = onError;
    playerSpritesheets.right.onerror = onError;

    // Load the images
    playerSpritesheets.down.src = 'assets/spritesheet/player_caveman/walking/front_walking.png';
    playerSpritesheets.up.src = 'assets/spritesheet/player_caveman/walking/back_walking.png';
    playerSpritesheets.left.src = 'assets/spritesheet/player_caveman/walking/left_walking.png';
    playerSpritesheets.right.src = 'assets/spritesheet/player_caveman/walking/right_walking.png';
}

/**
 * Update player animation state
 */
function updatePlayerAnimation(deltaTime) {
    if (!game.player) return;

    const player = game.player;

    // Use pixel sprite system if available
    if (usePixelSprites && typeof PlayerSpriteRenderer !== 'undefined') {
        PlayerSpriteRenderer.update(deltaTime, player);
        return;
    }

    // Fallback to spritesheet animation
    if (player.isMoving) {
        player.animTimer += deltaTime / 1000;

        const frameDuration = 1 / PLAYER_SPRITESHEET_CONFIG.framesPerSecond;

        if (player.animTimer >= frameDuration) {
            player.animTimer -= frameDuration;
            player.currentFrame++;

            if (player.currentFrame >= PLAYER_SPRITESHEET_CONFIG.walkFrameCount) {
                player.currentFrame = PLAYER_SPRITESHEET_CONFIG.walkFrameStart;
            }
        }
    } else {
        player.currentFrame = PLAYER_SPRITESHEET_CONFIG.idleFrame;
        player.animTimer = 0;
    }
}

/**
 * Draw the player sprite (with dash effects support)
 * Uses pixel sprite system when available, falls back to spritesheets
 */
function drawPlayerSprite(ctx, screenX, screenY, tileSize) {
    if (!game.player) return;

    const player = game.player;

    // Check for dash state
    const isDashing = typeof playerIsDashing === 'function' && playerIsDashing();
    const hasIframes = typeof playerHasIframes === 'function' && playerHasIframes();

    // Draw ghost trail first (behind player) - works with both systems
    if (typeof dashState !== 'undefined' && dashState.ghosts && dashState.ghosts.length > 0) {
        const camX = game.camera ? game.camera.x : 0;
        const camY = game.camera ? game.camera.y : 0;
        const trackerWidth = typeof TRACKER_WIDTH !== 'undefined' ? TRACKER_WIDTH : 250;

        for (const ghost of dashState.ghosts) {
            const ghostScreenX = (ghost.x - camX) * tileSize + trackerWidth;
            const ghostScreenY = (ghost.y - camY) * tileSize;

            ctx.save();
            ctx.globalAlpha = ghost.alpha;
            ctx.filter = 'hue-rotate(200deg) brightness(1.2)';

            // Use pixel sprites for ghosts if available
            if (usePixelSprites && typeof PlayerSpriteRenderer !== 'undefined') {
                const ghostPlayer = { ...player, facing: ghost.facing || 'down' };
                PlayerSpriteRenderer.draw(ctx, ghostPlayer, ghostScreenX, ghostScreenY, tileSize);
            } else {
                const config = PLAYER_SPRITESHEET_CONFIG;
                const ghostSheet = playerSpritesheets[ghost.facing || 'down'];
                if (ghostSheet && ghostSheet.complete && config.loaded) {
                    const frame = player.currentFrame || 0;
                    const col = frame % config.columns;
                    const row = Math.floor(frame / config.columns);
                    const srcX = col * config.frameWidth;
                    const srcY = row * config.frameHeight;

                    const scale = 1.25;
                    const drawSize = tileSize * scale;
                    const offsetX = (tileSize - drawSize) / 2;
                    const offsetY = (tileSize - drawSize) / 2;

                    ctx.drawImage(
                        ghostSheet,
                        srcX, srcY,
                        config.frameWidth, config.frameHeight,
                        ghostScreenX + offsetX, ghostScreenY + offsetY,
                        drawSize, drawSize
                    );
                } else {
                    ctx.fillStyle = 'rgba(100, 150, 255, 0.5)';
                    ctx.fillRect(ghostScreenX + 10, ghostScreenY + 10, tileSize - 20, tileSize - 20);
                }
            }

            ctx.filter = 'none';
            ctx.restore();
        }
    }

    // Apply transparency during dash/i-frames
    if (isDashing || hasIframes) {
        ctx.save();
        ctx.globalAlpha = 0.5;
    }

    // Use pixel sprite system if available
    if (usePixelSprites && typeof PlayerSpriteRenderer !== 'undefined') {
        PlayerSpriteRenderer.draw(ctx, player, screenX, screenY, tileSize);
        if (isDashing || hasIframes) ctx.restore();
        return;
    }

    // Fallback to spritesheet system
    const config = PLAYER_SPRITESHEET_CONFIG;
    const spritesheet = playerSpritesheets[player.facing || 'down'];

    // Fallback if sprites not loaded
    if (!spritesheet || !spritesheet.complete || !config.loaded) {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(screenX + 10, screenY + 10, tileSize - 20, tileSize - 20);
        if (isDashing || hasIframes) ctx.restore();
        return;
    }

    const frame = player.currentFrame || 0;
    const col = frame % config.columns;
    const row = Math.floor(frame / config.columns);

    const srcX = col * config.frameWidth;
    const srcY = row * config.frameHeight;

    // Scale and center
    const scale = 1.25;
    const drawSize = tileSize * scale;
    const offsetX = (tileSize - drawSize) / 2;
    const offsetY = (tileSize - drawSize) / 2;

    ctx.drawImage(
        spritesheet,
        srcX, srcY,
        config.frameWidth, config.frameHeight,
        screenX + offsetX, screenY + offsetY,
        drawSize, drawSize
    );

    // Restore alpha if was dashing
    if (isDashing || hasIframes) {
        ctx.restore();
    }
}

// Initialize on load - defer to allow pixel sprite files to load first
setTimeout(initPlayerSpriteSystem, 0);

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const PlayerAnimationSystem = {
    name: 'player-animation',

    update(dt) {
        updatePlayerAnimation(dt);
    },

    // Called when equipment changes to invalidate cache
    onEquipmentChange() {
        if (typeof PlayerSpriteRenderer !== 'undefined') {
            PlayerSpriteRenderer.clearCache();
        }
    }
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('player-animation', PlayerAnimationSystem, 25);
} else {
    console.warn('⚠️ SystemManager not found - player-animation running standalone');
}

// ============================================================================
// EXPORTS
// ============================================================================

window.updatePlayerAnimation = updatePlayerAnimation;
window.drawPlayerSprite = drawPlayerSprite;
window.playerSpritesheets = playerSpritesheets;
window.PLAYER_SPRITESHEET_CONFIG = PLAYER_SPRITESHEET_CONFIG;
window.usePixelSprites = usePixelSprites;
window.initPlayerSpriteSystem = initPlayerSpriteSystem;

console.log('✅ Player animation system loaded');
