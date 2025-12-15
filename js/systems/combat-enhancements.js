// ============================================================================
// COMBAT ENHANCEMENTS - The Shifting Chasm
// ============================================================================
// Adds: Dash with i-frames, Knockback, Screen Shake, Enemy Stagger
// ============================================================================

// ============================================================================
// CONFIGURATION
// ============================================================================

const COMBAT_ENHANCEMENTS_CONFIG = {
    // Dash settings
    dash: {
        enabled: true,
        distance: 1.5,           // Tiles to dash
        cooldown: 1.0,           // Seconds
        iframeDuration: 0.2,     // Seconds of invincibility
        ghostCount: 4,           // Number of ghost images in trail
        ghostFadeDuration: 0.3,  // Seconds for ghost to fade
        playerTransparency: 0.5  // Alpha during dash
    },

    // Knockback settings (tiles)
    knockback: {
        enabled: true,
        wallDamagePercent: 0.10, // 10% of enemy max HP
        // Knockback distance by weapon specialty
        distances: {
            // Blunt weapons (heavy knockback)
            mace: 1.5,
            staff: 0.8,
            shield: 1.2,
            unarmed: 0.3,

            // Blade weapons (medium knockback)
            sword: 0.7,
            axe: 1.0,
            knife: 0.3,

            // Pierce weapons (low knockback)
            polearm: 0.5,
            bow: 0.2,
            crossbow: 0.3,
            throwing: 0.2
        },
        defaultDistance: 0.5
    },

    // Screen shake settings
    screenShake: {
        enabled: true,
        normalIntensity: 3,      // Pixels for normal attacks
        critIntensity: 8,        // Pixels for critical hits
        duration: 0.1            // Seconds
    },

    // Stagger settings
    stagger: {
        enabled: false,          // Disabled - no ministun on hit
        duration: 0.1,           // 100ms freeze
        flashCount: 2,           // Number of flashes
        flashDuration: 0.05      // Duration of each flash
    }
};

// ============================================================================
// DASH STATE
// ============================================================================

const dashState = {
    // Cooldown tracking
    cooldown: 0,

    // Active dash state
    isDashing: false,
    dashProgress: 0,
    dashDuration: 0.15,  // Duration of dash animation
    dashStartX: 0,
    dashStartY: 0,
    dashTargetX: 0,
    dashTargetY: 0,

    // I-frames
    hasIframes: false,
    iframeTimer: 0,

    // Ghost trail
    ghosts: []  // { x, y, facing, alpha, timer }
};

// ============================================================================
// SCREEN SHAKE STATE
// ============================================================================

const screenShakeState = {
    active: false,
    intensity: 0,
    timer: 0,
    offsetX: 0,
    offsetY: 0
};

// ============================================================================
// STAGGER STATE (per-enemy, stored on enemy object)
// ============================================================================
// enemy.stagger = { active: false, timer: 0, flashTimer: 0, flashVisible: true }

// ============================================================================
// DASH SYSTEM
// ============================================================================

/**
 * Attempt to perform a dash toward the mouse cursor
 * @param {Object} player - The player object
 * @param {number} mouseX - Mouse X position in screen coordinates
 * @param {number} mouseY - Mouse Y position in screen coordinates
 */
function performDash(player, mouseX, mouseY) {
    if (!COMBAT_ENHANCEMENTS_CONFIG.dash.enabled) return false;
    if (!player) return false;

    // Check cooldown
    if (dashState.cooldown > 0) {
        if (typeof addMessage === 'function') {
            addMessage('Dash on cooldown!');
        }
        return false;
    }

    // Already dashing
    if (dashState.isDashing) return false;

    // Calculate direction toward mouse
    const trackerWidth = typeof TRACKER_WIDTH !== 'undefined' ? TRACKER_WIDTH : 250;
    const tileSize = (typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 32) *
                     (window.currentZoom || ZOOM_LEVEL || 2);
    const camX = game.camera ? game.camera.x : 0;
    const camY = game.camera ? game.camera.y : 0;

    // Convert mouse screen position to world position
    const worldMouseX = (mouseX - trackerWidth) / tileSize + camX;
    const worldMouseY = mouseY / tileSize + camY;

    // Calculate direction vector from player to mouse
    const dx = worldMouseX - player.gridX;
    const dy = worldMouseY - player.gridY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) return false; // Too close to player

    // Normalize direction
    const dirX = dx / dist;
    const dirY = dy / dist;

    // Calculate target position (1.5 tiles in direction)
    const dashDist = COMBAT_ENHANCEMENTS_CONFIG.dash.distance;
    let targetX = player.gridX + dirX * dashDist;
    let targetY = player.gridY + dirY * dashDist;

    // Check for wall collision along dash path
    // Sample multiple points along the path
    const steps = Math.ceil(dashDist / 0.25);
    let validX = player.gridX;
    let validY = player.gridY;

    for (let i = 1; i <= steps; i++) {
        const checkX = player.gridX + (dirX * dashDist * i / steps);
        const checkY = player.gridY + (dirY * dashDist * i / steps);

        // Check if tile is walkable (but ignore enemies - we dash through them)
        if (typeof isTileWalkable === 'function' && isTileWalkable(Math.floor(checkX), Math.floor(checkY))) {
            validX = checkX;
            validY = checkY;
        } else {
            // Hit a wall, stop here
            break;
        }
    }

    // If no valid movement possible, fail
    if (validX === player.gridX && validY === player.gridY) {
        if (typeof addMessage === 'function') {
            addMessage('Cannot dash there!');
        }
        return false;
    }

    // Start dash
    dashState.isDashing = true;
    dashState.dashProgress = 0;
    dashState.dashStartX = player.gridX;
    dashState.dashStartY = player.gridY;
    dashState.dashTargetX = validX;
    dashState.dashTargetY = validY;

    // Activate i-frames
    dashState.hasIframes = true;
    dashState.iframeTimer = COMBAT_ENHANCEMENTS_CONFIG.dash.iframeDuration;

    // Start cooldown
    dashState.cooldown = COMBAT_ENHANCEMENTS_CONFIG.dash.cooldown;

    // Create ghost trail
    createDashGhosts(player);

    // Update player facing
    if (Math.abs(dirX) > Math.abs(dirY)) {
        player.facing = dirX > 0 ? 'right' : 'left';
    } else {
        player.facing = dirY > 0 ? 'down' : 'up';
    }

    console.log(`[Dash] Started from (${player.gridX.toFixed(2)}, ${player.gridY.toFixed(2)}) to (${validX.toFixed(2)}, ${validY.toFixed(2)})`);

    return true;
}

/**
 * Create ghost images along the dash path
 */
function createDashGhosts(player) {
    dashState.ghosts = [];

    const ghostCount = COMBAT_ENHANCEMENTS_CONFIG.dash.ghostCount;
    const startX = dashState.dashStartX;
    const startY = dashState.dashStartY;
    const endX = dashState.dashTargetX;
    const endY = dashState.dashTargetY;

    for (let i = 0; i < ghostCount; i++) {
        const t = i / ghostCount;
        dashState.ghosts.push({
            x: startX + (endX - startX) * t,
            y: startY + (endY - startY) * t,
            facing: player.facing,
            alpha: 0.6 - (t * 0.4), // Fade from 0.6 to 0.2
            timer: COMBAT_ENHANCEMENTS_CONFIG.dash.ghostFadeDuration
        });
    }
}

/**
 * Update dash state each frame
 */
function updateDash(deltaTime) {
    const dt = deltaTime / 1000;
    const player = game.player;

    // Update cooldown
    if (dashState.cooldown > 0) {
        dashState.cooldown = Math.max(0, dashState.cooldown - dt);
    }

    // Update i-frames
    if (dashState.hasIframes) {
        dashState.iframeTimer -= dt;
        if (dashState.iframeTimer <= 0) {
            dashState.hasIframes = false;
        }
    }

    // Update dash movement
    if (dashState.isDashing && player) {
        dashState.dashProgress += dt / dashState.dashDuration;

        if (dashState.dashProgress >= 1) {
            // Dash complete
            dashState.dashProgress = 1;
            dashState.isDashing = false;

            // Set final position
            player.gridX = dashState.dashTargetX;
            player.gridY = dashState.dashTargetY;
            player.displayX = dashState.dashTargetX;
            player.displayY = dashState.dashTargetY;
            player.x = dashState.dashTargetX;
            player.y = dashState.dashTargetY;

            // Check tile interactions at destination
            if (typeof checkTileInteractions === 'function') {
                checkTileInteractions(player);
            }
        } else {
            // Interpolate position with easing
            const t = easeOutQuad(dashState.dashProgress);
            const newX = dashState.dashStartX + (dashState.dashTargetX - dashState.dashStartX) * t;
            const newY = dashState.dashStartY + (dashState.dashTargetY - dashState.dashStartY) * t;

            player.gridX = newX;
            player.gridY = newY;
            player.displayX = newX;
            player.displayY = newY;
            player.x = newX;
            player.y = newY;
        }
    }

    // Update ghost trail
    for (let i = dashState.ghosts.length - 1; i >= 0; i--) {
        const ghost = dashState.ghosts[i];
        ghost.timer -= dt;
        ghost.alpha = Math.max(0, ghost.alpha * (ghost.timer / COMBAT_ENHANCEMENTS_CONFIG.dash.ghostFadeDuration));

        if (ghost.timer <= 0) {
            dashState.ghosts.splice(i, 1);
        }
    }
}

// NOTE: easeOutQuad is now provided by movement-utils.js

/**
 * Check if player currently has i-frames
 */
function playerHasIframes() {
    return dashState.hasIframes;
}

/**
 * Check if player is currently dashing
 */
function playerIsDashing() {
    return dashState.isDashing;
}

/**
 * Get dash cooldown remaining
 */
function getDashCooldown() {
    return dashState.cooldown;
}

/**
 * Get dash cooldown max
 */
function getDashCooldownMax() {
    return COMBAT_ENHANCEMENTS_CONFIG.dash.cooldown;
}

// ============================================================================
// KNOCKBACK SYSTEM
// ============================================================================

/**
 * Apply knockback to an enemy
 * @param {Object} enemy - The enemy to knock back
 * @param {Object} source - The source of the knockback (usually player)
 * @param {Object} weapon - The weapon used (optional)
 */
function applyKnockback(enemy, source, weapon) {
    if (!COMBAT_ENHANCEMENTS_CONFIG.knockback.enabled) return;
    if (!enemy || !source) return;

    // Bosses and elites are immune
    if (enemy.tier === 'ELITE' || enemy.tier === 'BOSS') {
        return;
    }

    // Get knockback distance based on weapon
    let knockbackDist = COMBAT_ENHANCEMENTS_CONFIG.knockback.defaultDistance;

    if (weapon) {
        const specialty = weapon.weaponType || weapon.specialty;
        if (specialty && COMBAT_ENHANCEMENTS_CONFIG.knockback.distances[specialty]) {
            knockbackDist = COMBAT_ENHANCEMENTS_CONFIG.knockback.distances[specialty];
        }
    }

    // Calculate direction from source to enemy
    const dx = enemy.gridX - source.gridX;
    const dy = enemy.gridY - source.gridY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 0.1) return; // Too close

    // Normalize
    const dirX = dx / dist;
    const dirY = dy / dist;

    // Calculate target position
    let targetX = enemy.gridX + dirX * knockbackDist;
    let targetY = enemy.gridY + dirY * knockbackDist;

    // Check for wall collision along knockback path
    const steps = Math.ceil(knockbackDist / 0.25);
    let validX = enemy.gridX;
    let validY = enemy.gridY;
    let hitWall = false;

    for (let i = 1; i <= steps; i++) {
        const checkX = enemy.gridX + (dirX * knockbackDist * i / steps);
        const checkY = enemy.gridY + (dirY * knockbackDist * i / steps);

        if (typeof isTileWalkable === 'function' && isTileWalkable(Math.floor(checkX), Math.floor(checkY))) {
            validX = checkX;
            validY = checkY;
        } else {
            // Hit a wall
            hitWall = true;
            break;
        }
    }

    // Apply wall damage if hit wall
    if (hitWall) {
        const wallDamage = Math.floor(enemy.maxHp * COMBAT_ENHANCEMENTS_CONFIG.knockback.wallDamagePercent);
        if (wallDamage > 0) {
            enemy.hp -= wallDamage;

            if (typeof addMessage === 'function') {
                addMessage(`${enemy.name} slammed into wall for ${wallDamage} damage!`);
            }

            if (typeof showDamageNumber === 'function') {
                showDamageNumber(enemy, wallDamage, '#ff8800');
            }

            // Check for death from wall damage
            if (enemy.hp <= 0) {
                if (typeof handleDeath === 'function') {
                    handleDeath(enemy, source);
                }
            }
        }
    }

    // Move enemy to valid position
    if (validX !== enemy.gridX || validY !== enemy.gridY) {
        enemy.gridX = validX;
        enemy.gridY = validY;
        enemy.displayX = validX;
        enemy.displayY = validY;
        enemy.x = validX;
        enemy.y = validY;
    }
}

/**
 * Get knockback distance for a weapon
 */
function getKnockbackDistance(weapon) {
    if (!weapon) return COMBAT_ENHANCEMENTS_CONFIG.knockback.defaultDistance;

    const specialty = weapon.weaponType || weapon.specialty;
    if (specialty && COMBAT_ENHANCEMENTS_CONFIG.knockback.distances[specialty]) {
        return COMBAT_ENHANCEMENTS_CONFIG.knockback.distances[specialty];
    }

    return COMBAT_ENHANCEMENTS_CONFIG.knockback.defaultDistance;
}

// ============================================================================
// SCREEN SHAKE SYSTEM
// ============================================================================

/**
 * Trigger screen shake
 * @param {boolean} isCrit - Whether this was a critical hit
 */
function triggerScreenShake(isCrit = false) {
    if (!COMBAT_ENHANCEMENTS_CONFIG.screenShake.enabled) return;

    screenShakeState.active = true;
    screenShakeState.intensity = isCrit
        ? COMBAT_ENHANCEMENTS_CONFIG.screenShake.critIntensity
        : COMBAT_ENHANCEMENTS_CONFIG.screenShake.normalIntensity;
    screenShakeState.timer = COMBAT_ENHANCEMENTS_CONFIG.screenShake.duration;
}

/**
 * Update screen shake each frame
 * Supports both random shake and directional shake
 */
function updateScreenShake(deltaTime) {
    const dt = deltaTime / 1000;

    if (screenShakeState.active) {
        screenShakeState.timer -= dt;

        if (screenShakeState.timer <= 0) {
            screenShakeState.active = false;
            screenShakeState.offsetX = 0;
            screenShakeState.offsetY = 0;
            // Clear directional components
            screenShakeState.directionalX = 0;
            screenShakeState.directionalY = 0;
        } else {
            // Calculate shake offset with decay
            const duration = COMBAT_ENHANCEMENTS_CONFIG.screenShake.duration;
            const decay = screenShakeState.timer / duration;
            const intensity = screenShakeState.intensity * decay;

            // Check for directional shake (from mouse-attack-system)
            if (screenShakeState.directionalX || screenShakeState.directionalY) {
                // DIRECTIONAL SHAKE: Primary movement along attack direction + minor perpendicular jitter
                const dirX = screenShakeState.directionalX;
                const dirY = screenShakeState.directionalY;

                // Oscillate along direction (impact feel)
                const phase = (1 - decay) * Math.PI * 4; // Fast oscillation
                const dirMag = Math.sin(phase) * decay;

                // Add minor perpendicular jitter
                const perpJitter = (Math.random() - 0.5) * intensity * 0.3;

                screenShakeState.offsetX = dirX * dirMag + perpJitter;
                screenShakeState.offsetY = dirY * dirMag + perpJitter;
            } else {
                // RANDOM SHAKE: Standard shake in all directions
                screenShakeState.offsetX = (Math.random() - 0.5) * 2 * intensity;
                screenShakeState.offsetY = (Math.random() - 0.5) * 2 * intensity;
            }
        }
    }
}

/**
 * Get current screen shake offset
 */
function getScreenShakeOffset() {
    return {
        x: screenShakeState.offsetX,
        y: screenShakeState.offsetY
    };
}

// ============================================================================
// ENEMY STAGGER SYSTEM
// ============================================================================

/**
 * Apply stagger to an enemy
 * @param {Object} enemy - The enemy to stagger
 */
function applyStagger(enemy) {
    if (!COMBAT_ENHANCEMENTS_CONFIG.stagger.enabled) return;
    if (!enemy) return;

    // Bosses and elites are immune
    if (enemy.tier === 'ELITE' || enemy.tier === 'BOSS') {
        return;
    }

    // Initialize stagger state if needed
    if (!enemy.stagger) {
        enemy.stagger = {
            active: false,
            timer: 0,
            flashTimer: 0,
            flashVisible: true
        };
    }

    // Apply stagger
    enemy.stagger.active = true;
    enemy.stagger.timer = COMBAT_ENHANCEMENTS_CONFIG.stagger.duration;
    enemy.stagger.flashTimer = COMBAT_ENHANCEMENTS_CONFIG.stagger.flashDuration;
    enemy.stagger.flashVisible = false; // Start with flash (white)

    // Cancel enemy's current attack
    if (enemy.combat) {
        enemy.combat.attackCooldown = Math.max(enemy.combat.attackCooldown, 0.3); // Delay next attack
    }

    // Interrupt AI state (cancel shout, etc.)
    if (enemy.ai) {
        if (enemy.ai.currentState === 'shouting' && typeof enemy.ai.interruptShout === 'function') {
            enemy.ai.interruptShout();
        }
    }
}

/**
 * Update stagger state for all enemies
 */
function updateStagger(deltaTime) {
    const dt = deltaTime / 1000;

    if (!game.enemies) return;

    for (const enemy of game.enemies) {
        if (!enemy.stagger || !enemy.stagger.active) continue;

        // Update stagger timer
        enemy.stagger.timer -= dt;

        if (enemy.stagger.timer <= 0) {
            enemy.stagger.active = false;
            enemy.stagger.flashVisible = true; // Reset to visible
        } else {
            // Update flash timer
            enemy.stagger.flashTimer -= dt;

            if (enemy.stagger.flashTimer <= 0) {
                enemy.stagger.flashVisible = !enemy.stagger.flashVisible;
                enemy.stagger.flashTimer = COMBAT_ENHANCEMENTS_CONFIG.stagger.flashDuration;
            }
        }
    }
}

/**
 * Check if an enemy is staggered (frozen)
 */
function isEnemyStaggered(enemy) {
    return enemy?.stagger?.active || false;
}

/**
 * Check if enemy should be rendered with stagger flash
 */
function getEnemyStaggerFlash(enemy) {
    if (!enemy?.stagger?.active) return false;
    return !enemy.stagger.flashVisible; // Return true when flashing (white overlay)
}

// ============================================================================
// COMBAT INTEGRATION HOOKS
// ============================================================================

/**
 * Hook into combat system - called when damage is dealt
 * Applies knockback and stagger to enemies, screen shake for all
 */
function onCombatHit(attacker, defender, damageResult) {
    // Apply screen shake when player hits or gets hit
    // Skip if already handled by mouse-attack-system (directional shake)
    if (!damageResult?.skipScreenShake) {
        if (attacker === game.player || defender === game.player) {
            triggerScreenShake(damageResult?.isCrit || false);
        }
    }

    // Apply knockback and stagger when player hits enemy
    if (attacker === game.player && defender !== game.player) {
        const weapon = attacker.equipped?.MAIN;
        applyKnockback(defender, attacker, weapon);
        applyStagger(defender);
    }
}

// ============================================================================
// INPUT HANDLING - Spacebar for Dash
// ============================================================================

// Track mouse position for dash direction
let lastMouseX = 0;
let lastMouseY = 0;

// Mouse move handler
window.addEventListener('mousemove', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
});

// Spacebar handler for dash
window.addEventListener('keydown', (e) => {
    // Spacebar for dash (only in playing state, not in menus)
    if (e.key === ' ' && game.state === 'playing') {
        e.preventDefault();

        // Get canvas bounds for proper mouse coordinate translation
        const canvas = document.getElementById('gameCanvas');
        if (canvas) {
            const rect = canvas.getBoundingClientRect();
            const mouseX = lastMouseX - rect.left;
            const mouseY = lastMouseY - rect.top;

            performDash(game.player, mouseX, mouseY);
        }
    }
});

// ============================================================================
// SYSTEM MANAGER INTEGRATION
// ============================================================================

const CombatEnhancementsSystem = {
    name: 'combat-enhancements',

    init(game) {
        console.log('[CombatEnhancements] Initialized with dash, knockback, screen shake, stagger');
    },

    update(dt) {
        updateDash(dt);
        updateScreenShake(dt);
        updateStagger(dt);
    },

    cleanup() {
        dashState.isDashing = false;
        dashState.hasIframes = false;
        dashState.cooldown = 0;
        dashState.ghosts = [];
        screenShakeState.active = false;
        screenShakeState.offsetX = 0;
        screenShakeState.offsetY = 0;
    }
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('combat-enhancements', CombatEnhancementsSystem, 45);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    // Config
    window.COMBAT_ENHANCEMENTS_CONFIG = COMBAT_ENHANCEMENTS_CONFIG;

    // Dash
    window.dashState = dashState;
    window.performDash = performDash;
    window.updateDash = updateDash;
    window.playerHasIframes = playerHasIframes;
    window.playerIsDashing = playerIsDashing;
    window.getDashCooldown = getDashCooldown;
    window.getDashCooldownMax = getDashCooldownMax;

    // Knockback
    window.applyKnockback = applyKnockback;
    window.getKnockbackDistance = getKnockbackDistance;

    // Screen shake
    window.screenShakeState = screenShakeState;
    window.triggerScreenShake = triggerScreenShake;
    window.updateScreenShake = updateScreenShake;
    window.getScreenShakeOffset = getScreenShakeOffset;

    // Stagger
    window.applyStagger = applyStagger;
    window.updateStagger = updateStagger;
    window.isEnemyStaggered = isEnemyStaggered;
    window.getEnemyStaggerFlash = getEnemyStaggerFlash;

    // Combat hook
    window.onCombatHit = onCombatHit;
}

console.log('✅ Combat enhancements loaded (dash, knockback, screen shake, stagger)');
