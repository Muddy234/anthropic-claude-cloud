// ============================================================================
// MONSTER ANIMATION SYSTEM - The Shifting Chasm
// ============================================================================
// Manages monster sprite animations
// Updates animation frames, handles state transitions
// ============================================================================

/**
 * Initialize animation state for an enemy
 * Called when enemy is spawned
 */
function initEnemyAnimation(enemy) {
    if (!enemy.name || !hasMonsterAnimation(enemy.name)) {
        return; // No animation config for this monster
    }

    enemy.animation = {
        currentType: 'run',           // Current animation type
        currentFrame: 0,               // Current frame index within animation
        frameTimer: 0,                 // Time accumulator for frame advancement
        direction: 'down',             // Current facing direction
        isPlaying: true,               // Whether animation is playing
        pendingAnimation: null         // Queued animation to play after current
    };
}

/**
 * Update all enemy animations
 * Called each frame by SystemManager
 */
function updateMonsterAnimations(deltaTime) {
    if (!game.enemies || game.enemies.length === 0) return;

    const dt = deltaTime / 1000; // Convert to seconds

    for (const enemy of game.enemies) {
        if (!enemy.animation) {
            // Try to initialize animation if enemy doesn't have it yet
            initEnemyAnimation(enemy);
            continue;
        }

        // Update animation state based on enemy state
        updateEnemyAnimationState(enemy);

        // Update frame timing
        updateEnemyAnimationFrame(enemy, dt);
    }
}

/**
 * Update animation type based on enemy state
 */
function updateEnemyAnimationState(enemy) {
    if (!enemy.animation) return;

    // Determine what animation should be playing
    let targetAnimation = 'run';

    // Check for death
    if (enemy.hp <= 0) {
        targetAnimation = 'death';
    }
    // Check for hurt (recently damaged)
    else if (enemy.lastHitTime && (Date.now() - enemy.lastHitTime) < 300) {
        targetAnimation = 'hurt';
    }
    // Check for attack (in combat and on cooldown means just attacked)
    else if (enemy.combat?.isInCombat && enemy.lastAttackTime && (Date.now() - enemy.lastAttackTime) < 500) {
        targetAnimation = 'attack';
    }
    // Default: run/idle
    else {
        targetAnimation = 'run';
    }

    // Update facing direction
    const newDirection = facingToAnimationDirection(enemy.facing);
    if (enemy.animation.direction !== newDirection) {
        enemy.animation.direction = newDirection;
        enemy.animation.currentFrame = 0; // Reset frame when direction changes
    }

    // Change animation if needed
    if (enemy.animation.currentType !== targetAnimation) {
        setEnemyAnimation(enemy, targetAnimation);
    }
}

/**
 * Update animation frame based on time
 */
function updateEnemyAnimationFrame(enemy, dt) {
    if (!enemy.animation || !enemy.animation.isPlaying) return;

    const frameData = getMonsterAnimationFrames(
        enemy.name,
        enemy.animation.currentType,
        enemy.animation.direction
    );

    if (!frameData) return;

    // Accumulate time
    enemy.animation.frameTimer += dt;

    // Time per frame based on FPS
    const frameTime = 1.0 / frameData.fps;

    // Advance frame if enough time has passed
    if (enemy.animation.frameTimer >= frameTime) {
        enemy.animation.frameTimer -= frameTime;

        // Advance to next frame
        enemy.animation.currentFrame++;

        // Check if animation finished
        if (enemy.animation.currentFrame > frameData.frameCount - 1) {
            if (frameData.loop) {
                // Loop back to start
                enemy.animation.currentFrame = 0;
            } else {
                // Hold on last frame
                enemy.animation.currentFrame = frameData.frameCount - 1;
                enemy.animation.isPlaying = false;

                // If there's a pending animation, play it
                if (enemy.animation.pendingAnimation) {
                    setEnemyAnimation(enemy, enemy.animation.pendingAnimation);
                    enemy.animation.pendingAnimation = null;
                }
                // If death animation finished, mark as finished
                else if (enemy.animation.currentType === 'death') {
                    enemy.deathAnimationComplete = true;
                }
            }
        }
    }
}

/**
 * Set enemy animation to a specific type
 */
function setEnemyAnimation(enemy, animationType, interrupt = true) {
    if (!enemy.animation) return;

    // If not interrupting, queue the animation
    if (!interrupt && enemy.animation.isPlaying) {
        enemy.animation.pendingAnimation = animationType;
        return;
    }

    enemy.animation.currentType = animationType;
    enemy.animation.currentFrame = 0;
    enemy.animation.frameTimer = 0;
    enemy.animation.isPlaying = true;
}

/**
 * Get the current sprite frame data for drawing
 * Returns null if no sprite should be drawn (use fallback rendering)
 */
function getEnemySpriteFrame(enemy) {
    if (!enemy.animation || !areSpritesReady()) return null;

    const sprite = getMonsterSprite(enemy.name, enemy.animation.currentType);
    if (!sprite) return null;

    const frameData = getMonsterAnimationFrames(
        enemy.name,
        enemy.animation.currentType,
        enemy.animation.direction
    );

    if (!frameData) return null;

    // Calculate sprite sheet coordinates
    const col = frameData.startCol + enemy.animation.currentFrame;
    const row = frameData.row;

    return {
        sprite: sprite,
        sourceX: col * frameData.frameWidth,
        sourceY: row * frameData.frameHeight,
        sourceWidth: frameData.frameWidth,
        sourceHeight: frameData.frameHeight,
        frameWidth: frameData.frameWidth,
        frameHeight: frameData.frameHeight
    };
}

// ============================================================================
// SYSTEM REGISTRATION
// ============================================================================

if (typeof SystemManager !== 'undefined') {
    SystemManager.register({
        name: 'MonsterAnimationSystem',
        priority: 43,
        update: updateMonsterAnimations,
        init: () => {
            console.log('✅ Monster Animation System initialized');
        }
    });
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.initEnemyAnimation = initEnemyAnimation;
    window.updateMonsterAnimations = updateMonsterAnimations;
    window.updateEnemyAnimationState = updateEnemyAnimationState;
    window.updateEnemyAnimationFrame = updateEnemyAnimationFrame;
    window.setEnemyAnimation = setEnemyAnimation;
    window.getEnemySpriteFrame = getEnemySpriteFrame;
}

console.log('✅ Monster Animation System loaded');
