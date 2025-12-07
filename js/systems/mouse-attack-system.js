// ============================================================================
// MOUSE-DRIVEN ATTACK SYSTEM - The Shifting Chasm
// ============================================================================
// Left-click to attack toward mouse cursor
// Shift + Left-click for special attack
// Melee weapons have swing arcs, ranged weapons shoot projectiles
// ============================================================================

// ============================================================================
// WEAPON ARC CONFIGURATION
// ============================================================================
// Arc properties by weapon type (weaponType field from weapon data)

const WEAPON_ARC_CONFIG = {
    // Blade weapons
    sword: {
        arcAngle: 90,       // degrees
        arcRange: 1.2,      // tiles
        isRanged: false
    },
    knife: {
        arcAngle: 60,
        arcRange: 0.8,
        isRanged: false
    },
    axe: {
        arcAngle: 100,
        arcRange: 1.3,
        isRanged: false
    },

    // Blunt weapons
    mace: {
        arcAngle: 120,
        arcRange: 1.5,
        isRanged: false
    },
    staff: {
        arcAngle: 90,
        arcRange: 1.5,
        isRanged: false
    },
    unarmed: {
        arcAngle: 60,
        arcRange: 0.6,
        isRanged: false
    },
    shield: {
        arcAngle: 90,
        arcRange: 0.8,
        isRanged: false
    },

    // Pierce melee
    polearm: {
        arcAngle: 45,       // Narrow thrust
        arcRange: 2.0,      // Long reach
        isRanged: false
    },

    // Ranged weapons
    bow: {
        arcAngle: 0,
        arcRange: 0,
        isRanged: true,
        projectileSpeed: 8  // tiles per second
    },
    crossbow: {
        arcAngle: 0,
        arcRange: 0,
        isRanged: true,
        projectileSpeed: 10
    },
    throwing: {
        arcAngle: 0,
        arcRange: 0,
        isRanged: true,
        projectileSpeed: 7
    }
};

// Default config for unknown weapon types
const DEFAULT_ARC_CONFIG = {
    arcAngle: 90,
    arcRange: 1.0,
    isRanged: false
};

// ============================================================================
// ATTACK STATE
// ============================================================================

const mouseAttackState = {
    // Attack cooldown
    cooldown: 0,

    // Active swing state
    isSwinging: false,
    swingProgress: 0,
    swingDuration: 0.15,    // Duration of swing animation
    swingDirection: 0,      // Angle in radians toward mouse
    swingArcAngle: 90,      // Current weapon arc angle
    swingRange: 1.0,        // Current weapon range
    swingStartTime: 0,

    // Enemies hit this swing (prevent multi-hit same enemy)
    hitEnemies: new Set(),

    // Visual slash effect
    slashEffects: []  // { x, y, angle, progress, arcAngle, range }
};

// Track mouse position
let mouseWorldX = 0;
let mouseWorldY = 0;
let mouseScreenX = 0;
let mouseScreenY = 0;

// ============================================================================
// MOUSE TRACKING
// ============================================================================

window.addEventListener('mousemove', (e) => {
    mouseScreenX = e.clientX;
    mouseScreenY = e.clientY;

    // Convert to world coordinates
    const canvas = document.getElementById('gameCanvas');
    if (!canvas || !game.camera) return;

    const rect = canvas.getBoundingClientRect();
    const trackerWidth = typeof TRACKER_WIDTH !== 'undefined' ? TRACKER_WIDTH : 250;
    const tileSize = (typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 32) *
                     (typeof ZOOM_LEVEL !== 'undefined' ? ZOOM_LEVEL : 2);

    mouseWorldX = (e.clientX - rect.left - trackerWidth) / tileSize + game.camera.x;
    mouseWorldY = (e.clientY - rect.top) / tileSize + game.camera.y;
});

/**
 * Get current mouse position in world coordinates
 */
function getMouseWorldPosition() {
    return { x: mouseWorldX, y: mouseWorldY };
}

/**
 * Get direction from player to mouse in radians
 */
function getDirectionToMouse() {
    if (!game.player) return 0;

    const dx = mouseWorldX - game.player.gridX;
    const dy = mouseWorldY - game.player.gridY;

    return Math.atan2(dy, dx);
}

// ============================================================================
// WEAPON CONFIG HELPERS
// ============================================================================

/**
 * Get arc configuration for equipped weapon
 */
function getWeaponArcConfig(player) {
    const weapon = player?.equipped?.MAIN;
    if (!weapon) {
        // Unarmed
        return WEAPON_ARC_CONFIG.unarmed || DEFAULT_ARC_CONFIG;
    }

    const weaponType = weapon.weaponType;
    return WEAPON_ARC_CONFIG[weaponType] || DEFAULT_ARC_CONFIG;
}

/**
 * Check if equipped weapon is ranged
 */
function isWeaponRanged(player) {
    const config = getWeaponArcConfig(player);
    return config.isRanged || false;
}

/**
 * Get attack cooldown based on weapon speed
 */
function getAttackCooldown(player) {
    const weapon = player?.equipped?.MAIN;
    const baseSpeed = weapon?.stats?.speed || 1.0;

    // Base attack time is 700ms, modified by weapon speed
    // Higher speed = faster attacks = lower cooldown
    const cooldown = 0.7 / baseSpeed;

    return cooldown;
}

// ============================================================================
// ATTACK EXECUTION
// ============================================================================

/**
 * Perform a base attack toward mouse cursor
 * @param {Object} player - The player object
 * @param {boolean} isSpecial - Whether this is a special attack (Shift+click)
 */
function performMouseAttack(player, isSpecial = false) {
    if (!player) return false;
    if (game.state !== 'playing') return false;

    // Check cooldown
    if (mouseAttackState.cooldown > 0) {
        return false;
    }

    // Check if already swinging
    if (mouseAttackState.isSwinging) {
        return false;
    }

    // Get weapon config
    const arcConfig = getWeaponArcConfig(player);
    const direction = getDirectionToMouse();

    // Update player facing based on attack direction
    updatePlayerFacingFromAngle(player, direction);

    if (arcConfig.isRanged) {
        // Ranged attack - fire projectile
        performRangedAttack(player, direction, isSpecial);
    } else {
        // Melee attack - swing arc
        performMeleeSwing(player, direction, arcConfig, isSpecial);
    }

    // Set cooldown
    mouseAttackState.cooldown = getAttackCooldown(player);

    // Trigger GCD if available
    if (player.gcd) {
        player.gcd.active = true;
        player.gcd.remaining = player.gcd.duration || 0.5;
    }

    return true;
}

/**
 * Perform a melee swing attack
 */
function performMeleeSwing(player, direction, arcConfig, isSpecial) {
    mouseAttackState.isSwinging = true;
    mouseAttackState.swingProgress = 0;
    mouseAttackState.swingDirection = direction;
    mouseAttackState.swingArcAngle = arcConfig.arcAngle * (Math.PI / 180);
    mouseAttackState.swingRange = arcConfig.arcRange;
    mouseAttackState.swingStartTime = performance.now();
    mouseAttackState.hitEnemies.clear();

    // Create visual slash effect
    createSlashEffect(player, direction, arcConfig);

    // Check for hits immediately and during swing
    checkMeleeHits(player, direction, arcConfig, isSpecial);

    console.log(`[MouseAttack] Melee swing: angle=${arcConfig.arcAngle}°, range=${arcConfig.arcRange}`);
}

/**
 * Perform a ranged attack (projectile)
 */
function performRangedAttack(player, direction, isSpecial) {
    // Check for ammo if bow/crossbow
    const weapon = player.equipped?.MAIN;
    const weaponType = weapon?.weaponType;

    if (weaponType === 'bow' && player.ammo?.arrows <= 0) {
        if (typeof addMessage === 'function') {
            addMessage('No arrows!');
        }
        return;
    }
    if (weaponType === 'crossbow' && player.ammo?.bolts <= 0) {
        if (typeof addMessage === 'function') {
            addMessage('No bolts!');
        }
        return;
    }

    // Consume ammo
    if (weaponType === 'bow') player.ammo.arrows--;
    if (weaponType === 'crossbow') player.ammo.bolts--;

    // Get player vision range for projectile distance
    const visionRange = typeof VISION_RADIUS !== 'undefined' ? VISION_RADIUS : 8;
    const arcConfig = getWeaponArcConfig(player);

    // Calculate direction vector
    const dirX = Math.cos(direction);
    const dirY = Math.sin(direction);

    // Create projectile using projectile system
    if (typeof createProjectile === 'function') {
        createProjectile({
            x: player.gridX,
            y: player.gridY,
            dirX: dirX,
            dirY: dirY,
            speed: arcConfig.projectileSpeed || 8,
            maxDistance: visionRange + 2,
            damage: calculateProjectileDamage(player, isSpecial),
            owner: player,
            element: weapon?.element || 'physical',
            fadeAfter: visionRange,  // Start fading after vision range
            isSpecial: isSpecial
        });
    } else {
        // Fallback: create simple projectile in game state
        if (!game.projectiles) game.projectiles = [];
        game.projectiles.push({
            x: player.gridX,
            y: player.gridY,
            dirX: dirX,
            dirY: dirY,
            speed: arcConfig.projectileSpeed || 8,
            maxDistance: visionRange + 2,
            distanceTraveled: 0,
            damage: calculateProjectileDamage(player, isSpecial),
            owner: player,
            element: weapon?.element || 'physical',
            fadeStart: visionRange,
            isSpecial: isSpecial
        });
    }

    console.log(`[MouseAttack] Ranged attack fired in direction ${(direction * 180 / Math.PI).toFixed(1)}°`);
}

/**
 * Calculate projectile damage
 */
function calculateProjectileDamage(player, isSpecial) {
    const weapon = player.equipped?.MAIN;
    let baseDamage = weapon?.stats?.damage || 5;

    // Add STR/AGI/INT scaling
    const stats = player.stats || {};
    if (weapon?.weaponType === 'bow' || weapon?.weaponType === 'crossbow') {
        baseDamage += Math.floor(stats.AGI / 5);
    } else {
        baseDamage += Math.floor(stats.STR / 5);
    }

    // Special attack bonus
    if (isSpecial) {
        baseDamage = Math.floor(baseDamage * 1.5);
    }

    return baseDamage;
}

/**
 * Update player facing direction based on attack angle
 */
function updatePlayerFacingFromAngle(player, angle) {
    // Convert angle to cardinal direction
    const degrees = angle * (180 / Math.PI);

    if (degrees >= -45 && degrees < 45) {
        player.facing = 'right';
    } else if (degrees >= 45 && degrees < 135) {
        player.facing = 'down';
    } else if (degrees >= -135 && degrees < -45) {
        player.facing = 'up';
    } else {
        player.facing = 'left';
    }
}

// ============================================================================
// MELEE HIT DETECTION
// ============================================================================

/**
 * Check for melee hits in the swing arc
 */
function checkMeleeHits(player, direction, arcConfig, isSpecial) {
    if (!game.enemies) return;

    const halfArc = (arcConfig.arcAngle * (Math.PI / 180)) / 2;
    const range = arcConfig.arcRange;

    for (const enemy of game.enemies) {
        // Skip dead enemies or already hit
        if (enemy.hp <= 0) continue;
        if (mouseAttackState.hitEnemies.has(enemy)) continue;

        // Calculate distance and angle to enemy
        const dx = enemy.gridX - player.gridX;
        const dy = enemy.gridY - player.gridY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Check range
        if (distance > range) continue;

        // Check angle
        const enemyAngle = Math.atan2(dy, dx);
        let angleDiff = enemyAngle - direction;

        // Normalize to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        // Check if within arc
        if (Math.abs(angleDiff) <= halfArc) {
            // HIT!
            mouseAttackState.hitEnemies.add(enemy);
            applyMeleeDamage(player, enemy, isSpecial);
        }
    }
}

/**
 * Apply melee damage to an enemy
 */
function applyMeleeDamage(player, enemy, isSpecial) {
    const weapon = player.equipped?.MAIN;
    let baseDamage = weapon?.stats?.damage || 5;

    // Add STR scaling
    baseDamage += Math.floor((player.stats?.STR || 10) / 5);

    // Special attack bonus
    if (isSpecial) {
        baseDamage = Math.floor(baseDamage * 1.5);
    }

    // Use damage calculator if available
    let damageResult = { finalDamage: baseDamage, isCrit: false };

    if (typeof DamageCalculator !== 'undefined') {
        // Get room for attunement
        const room = game.rooms?.find(r =>
            enemy.gridX >= r.x && enemy.gridX < r.x + r.width &&
            enemy.gridY >= r.y && enemy.gridY < r.y + r.height
        );
        damageResult = DamageCalculator.calculateDamage(player, enemy, room);
    } else {
        // Simple crit calculation
        const critChance = player.critChance || 5;
        if (Math.random() * 100 < critChance) {
            damageResult.finalDamage = Math.floor(baseDamage * 1.5);
            damageResult.isCrit = true;
        }
    }

    // Apply damage
    enemy.hp -= damageResult.finalDamage;

    // Show damage number
    if (typeof showDamageNumber === 'function') {
        const color = damageResult.isCrit ? '#ffff00' : '#ffffff';
        showDamageNumber(enemy, damageResult.finalDamage, color);
    }

    // Combat enhancements hook (knockback, screen shake, stagger)
    if (typeof onCombatHit === 'function') {
        onCombatHit(player, enemy, damageResult);
    }

    // Check for death
    if (enemy.hp <= 0) {
        if (typeof handleDeath === 'function') {
            handleDeath(enemy, player);
        }
    }

    // Message
    if (typeof addMessage === 'function') {
        const critText = damageResult.isCrit ? ' CRITICAL!' : '';
        addMessage(`You hit ${enemy.name} for ${damageResult.finalDamage} damage!${critText}`);
    }

    console.log(`[MouseAttack] Hit ${enemy.name} for ${damageResult.finalDamage} damage`);
}

// ============================================================================
// VISUAL SLASH EFFECT
// ============================================================================

/**
 * Create a visual slash effect
 */
function createSlashEffect(player, direction, arcConfig) {
    mouseAttackState.slashEffects.push({
        x: player.gridX,
        y: player.gridY,
        angle: direction,
        progress: 0,
        duration: 0.15,
        arcAngle: arcConfig.arcAngle * (Math.PI / 180),
        range: arcConfig.arcRange,
        color: '#ffffff'  // White slash
    });
}

/**
 * Update slash effects
 */
function updateSlashEffects(deltaTime) {
    const dt = deltaTime / 1000;

    for (let i = mouseAttackState.slashEffects.length - 1; i >= 0; i--) {
        const slash = mouseAttackState.slashEffects[i];
        slash.progress += dt / slash.duration;

        if (slash.progress >= 1) {
            mouseAttackState.slashEffects.splice(i, 1);
        }
    }
}

/**
 * Draw slash effects
 */
function drawSlashEffects(ctx, camX, camY, tileSize, offsetX) {
    for (const slash of mouseAttackState.slashEffects) {
        const screenX = (slash.x - camX) * tileSize + offsetX + tileSize / 2;
        const screenY = (slash.y - camY) * tileSize + tileSize / 2;

        const range = slash.range * tileSize;
        const startAngle = slash.angle - slash.arcAngle / 2;
        const endAngle = slash.angle + slash.arcAngle / 2;

        // Animated sweep effect
        const sweepProgress = slash.progress;
        const currentEndAngle = startAngle + (endAngle - startAngle) * Math.min(sweepProgress * 2, 1);

        // Fade out
        const alpha = 1 - slash.progress;

        ctx.save();

        // Draw arc
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';

        // Draw multiple arcs for thicker effect
        for (let r = range * 0.6; r <= range; r += range * 0.15) {
            ctx.beginPath();
            ctx.arc(screenX, screenY, r, startAngle, currentEndAngle);
            ctx.stroke();
        }

        // Draw slash line at the leading edge
        if (sweepProgress < 0.5) {
            const lineAngle = currentEndAngle;
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 1.5})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(screenX + Math.cos(lineAngle) * range * 0.3, screenY + Math.sin(lineAngle) * range * 0.3);
            ctx.lineTo(screenX + Math.cos(lineAngle) * range, screenY + Math.sin(lineAngle) * range);
            ctx.stroke();
        }

        ctx.restore();
    }
}

// ============================================================================
// UPDATE LOOP
// ============================================================================

/**
 * Update mouse attack system each frame
 */
function updateMouseAttackSystem(deltaTime) {
    const dt = deltaTime / 1000;

    // Update cooldown
    if (mouseAttackState.cooldown > 0) {
        mouseAttackState.cooldown = Math.max(0, mouseAttackState.cooldown - dt);
    }

    // Update swing state
    if (mouseAttackState.isSwinging) {
        mouseAttackState.swingProgress += dt / mouseAttackState.swingDuration;

        if (mouseAttackState.swingProgress >= 1) {
            mouseAttackState.isSwinging = false;
            mouseAttackState.hitEnemies.clear();
        }
    }

    // Update slash effects
    updateSlashEffects(deltaTime);
}

// ============================================================================
// SYSTEM MANAGER INTEGRATION
// ============================================================================

const MouseAttackSystem = {
    name: 'mouse-attack',

    init(game) {
        console.log('[MouseAttack] Mouse-driven attack system initialized');
    },

    update(dt) {
        updateMouseAttackSystem(dt);
    },

    cleanup() {
        mouseAttackState.cooldown = 0;
        mouseAttackState.isSwinging = false;
        mouseAttackState.hitEnemies.clear();
        mouseAttackState.slashEffects = [];
    }
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('mouse-attack', MouseAttackSystem, 48);
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    // Config
    window.WEAPON_ARC_CONFIG = WEAPON_ARC_CONFIG;

    // State
    window.mouseAttackState = mouseAttackState;

    // Functions
    window.getMouseWorldPosition = getMouseWorldPosition;
    window.getDirectionToMouse = getDirectionToMouse;
    window.getWeaponArcConfig = getWeaponArcConfig;
    window.isWeaponRanged = isWeaponRanged;
    window.getAttackCooldown = getAttackCooldown;
    window.performMouseAttack = performMouseAttack;
    window.updateMouseAttackSystem = updateMouseAttackSystem;
    window.drawSlashEffects = drawSlashEffects;
    window.checkMeleeHits = checkMeleeHits;
}

console.log('✅ Mouse-driven attack system loaded');
