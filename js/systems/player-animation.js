// === js/ui/player-animation.js ===
// Spritesheet-based player animation system
// UPDATED: Registers with SystemManager

// Spritesheet configuration
const PLAYER_SPRITE_CONFIG = {
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

// Load spritesheets
function loadPlayerSpritesheets() {
    let loadedCount = 0;
    const totalSheets = 4;
    
    const onLoad = function() {
        loadedCount++;
        console.log(`✓ Loaded player spritesheet (${loadedCount}/${totalSheets})`);
        
        if (loadedCount === totalSheets) {
            const img = playerSpritesheets.down;
            PLAYER_SPRITE_CONFIG.frameWidth = Math.floor(img.width / PLAYER_SPRITE_CONFIG.columns);
            PLAYER_SPRITE_CONFIG.frameHeight = Math.floor(img.height / PLAYER_SPRITE_CONFIG.rows);
            PLAYER_SPRITE_CONFIG.loaded = true;
            
            console.log(`✓ All player spritesheets loaded!`);
            console.log(`  Frame size: ${PLAYER_SPRITE_CONFIG.frameWidth} × ${PLAYER_SPRITE_CONFIG.frameHeight}`);
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
    
    // Only animate while moving
    if (player.isMoving) {
        player.animTimer += deltaTime / 1000;
        
        const frameDuration = 1 / PLAYER_SPRITE_CONFIG.framesPerSecond;
        
        if (player.animTimer >= frameDuration) {
            player.animTimer -= frameDuration;
            player.currentFrame++;
            
            if (player.currentFrame >= PLAYER_SPRITE_CONFIG.walkFrameCount) {
                player.currentFrame = PLAYER_SPRITE_CONFIG.walkFrameStart;
            }
        }
    } else {
        player.currentFrame = PLAYER_SPRITE_CONFIG.idleFrame;
        player.animTimer = 0;
    }
}

/**
 * Draw the player sprite
 */
function drawPlayerSprite(ctx, screenX, screenY, tileSize) {
    if (!game.player) return;
    
    const player = game.player;
    const config = PLAYER_SPRITE_CONFIG;
    
    const spritesheet = playerSpritesheets[player.facing || 'down'];
    
    // Fallback if sprites not loaded
    if (!spritesheet || !spritesheet.complete || !config.loaded) {
        ctx.fillStyle = '#3498db';
        ctx.fillRect(screenX + 10, screenY + 10, tileSize - 20, tileSize - 20);
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
}

// Initialize on load
loadPlayerSpritesheets();

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const PlayerAnimationSystem = {
    name: 'player-animation',
    
    update(dt) {
        updatePlayerAnimation(dt);
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
window.PLAYER_SPRITE_CONFIG = PLAYER_SPRITE_CONFIG;

console.log('✅ Player animation system loaded');
