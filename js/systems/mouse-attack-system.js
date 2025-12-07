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
    // Blade weapons (ranges increased by 30%)
    sword: {
        arcAngle: 90,       // degrees
        arcRange: 1.56,     // tiles (was 1.2)
        isRanged: false,
        slashStyle: 'sweep' // Horizontal sweeping arc
    },
    knife: {
        arcAngle: 60,
        arcRange: 1.04,     // was 0.8
        isRanged: false,
        slashStyle: 'sweep'
    },
    axe: {
        arcAngle: 100,
        arcRange: 1.69,     // was 1.3
        isRanged: false,
        slashStyle: 'sweep'
    },

    // Blunt weapons (ranges increased by 30%)
    mace: {
        arcAngle: 120,
        arcRange: 1.95,     // was 1.5
        isRanged: false,
        slashStyle: 'sweep'
    },
    unarmed: {
        arcAngle: 60,
        arcRange: 0.78,     // was 0.6
        isRanged: false,
        slashStyle: 'jab'   // Quick punch/jab
    },
    shield: {
        arcAngle: 90,
        arcRange: 1.04,     // was 0.8
        isRanged: false,
        slashStyle: 'sweep'
    },

    // Magic weapons - all shoot projectiles
    staff: {
        arcAngle: 0,
        arcRange: 0,
        isRanged: true,
        isMagic: true,
        projectileSpeed: 7
    },
    wand: {
        arcAngle: 0,
        arcRange: 0,
        isRanged: true,
        isMagic: true,
        projectileSpeed: 9  // Wands are faster
    },
    tome: {
        arcAngle: 0,
        arcRange: 0,
        isRanged: true,
        isMagic: true,
        projectileSpeed: 6  // Tomes are slower but more powerful
    },

    // Pierce melee (ranges increased by 30%)
    polearm: {
        arcAngle: 45,       // Narrow thrust
        arcRange: 2.6,      // Long reach (was 2.0)
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

// Default config for unknown weapon types (range increased by 30%)
const DEFAULT_ARC_CONFIG = {
    arcAngle: 90,
    arcRange: 1.3,      // was 1.0
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
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get scaled mouse position
    const scaledX = (e.clientX - rect.left) * scaleX;
    const scaledY = (e.clientY - rect.top) * scaleY;

    const trackerWidth = typeof TRACKER_WIDTH !== 'undefined' ? TRACKER_WIDTH : 70;
    const tileSize = (typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 32) *
                     (typeof ZOOM_LEVEL !== 'undefined' ? ZOOM_LEVEL : 2);

    mouseWorldX = (scaledX - trackerWidth) / tileSize + game.camera.x;
    mouseWorldY = scaledY / tileSize + game.camera.y;
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
    if (mouseAttackState.cooldown > 0) return false;

    // Check if already swinging
    if (mouseAttackState.isSwinging) return false;

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
    createSlashEffect(player, direction, arcConfig, isSpecial);

    // Check for hits immediately and during swing
    checkMeleeHits(player, direction, arcConfig, isSpecial);
}

/**
 * Perform a ranged attack (projectile)
 */
function performRangedAttack(player, direction, isSpecial) {
    const weapon = player.equipped?.MAIN;
    const weaponType = weapon?.weaponType;
    const arcConfig = getWeaponArcConfig(player);
    const isMagic = arcConfig.isMagic || false;

    // Check for ammo if bow/crossbow (magic weapons don't use ammo)
    if (!isMagic) {
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
    }

    // Get player vision range for projectile distance
    const visionRange = typeof VISION_RADIUS !== 'undefined' ? VISION_RADIUS : 8;

    // Calculate direction vector
    const dirX = Math.cos(direction);
    const dirY = Math.sin(direction);

    // Determine element for magic weapons
    const element = weapon?.element || (isMagic ? 'arcane' : 'physical');

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
            element: element,
            fadeAfter: visionRange,  // Start fading after vision range
            isSpecial: isSpecial,
            isMagic: isMagic
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
            element: element,
            fadeStart: visionRange,
            isSpecial: isSpecial,
            isMagic: isMagic
        });
    }
}

/**
 * Calculate projectile damage
 */
function calculateProjectileDamage(player, isSpecial) {
    const weapon = player.equipped?.MAIN;
    const weaponType = weapon?.weaponType;
    let baseDamage = weapon?.stats?.damage || 5;

    // Add stat scaling based on weapon type
    const stats = player.stats || {};
    if (weaponType === 'bow' || weaponType === 'crossbow') {
        // Ranged physical: AGI scaling
        baseDamage += Math.floor((stats.AGI || 10) / 5);
    } else if (weaponType === 'staff' || weaponType === 'wand' || weaponType === 'tome') {
        // Magic weapons: INT scaling (higher ratio for magic)
        baseDamage += Math.floor((stats.INT || 10) / 3);
    } else {
        // Default: STR scaling
        baseDamage += Math.floor((stats.STR || 10) / 5);
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
}

// ============================================================================
// VISUAL SLASH EFFECT
// ============================================================================

/**
 * Create a visual slash effect
 */
function createSlashEffect(player, direction, arcConfig, isSpecial = false) {
    const slashStyle = arcConfig.slashStyle || 'sweep';

    mouseAttackState.slashEffects.push({
        x: player.gridX,
        y: player.gridY,
        angle: direction,
        progress: 0,
        duration: 0.2,  // 200ms trail duration
        arcAngle: arcConfig.arcAngle * (Math.PI / 180),
        range: arcConfig.arcRange,
        color: '#ffffff',  // White slash
        slashStyle: slashStyle,
        isSpecial: isSpecial
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
 * Draw slash effects - renders different visuals based on slashStyle
 */
function drawSlashEffects(ctx, camX, camY, tileSize, offsetX) {
    for (const slash of mouseAttackState.slashEffects) {
        const screenX = (slash.x - camX) * tileSize + offsetX + tileSize / 2;
        const screenY = (slash.y - camY) * tileSize + tileSize / 2;

        // Fade out as effect progresses
        const alpha = 1 - slash.progress;

        ctx.save();

        if (slash.slashStyle === 'jab') {
            // JAB STYLE - Quick linear thrust (unarmed punch)
            drawJabEffect(ctx, screenX, screenY, slash, tileSize, alpha);
        } else {
            // SWEEP STYLE - Horizontal arc sweep (sword, axe, etc.)
            drawSweepEffect(ctx, screenX, screenY, slash, tileSize, alpha);
        }

        ctx.restore();
    }
}

/**
 * Draw jab/punch effect - linear thrust toward target
 */
function drawJabEffect(ctx, screenX, screenY, slash, tileSize, alpha) {
    const direction = slash.angle;
    const progress = slash.progress;
    const isSpecial = slash.isSpecial;

    // Jab size - larger for special attack
    const baseLength = isSpecial ? tileSize * 0.9 : tileSize * 0.5;
    const baseWidth = isSpecial ? 12 : 6;

    // Animation: quick extend then retract
    // Extend fast (0-0.3), hold (0.3-0.5), retract (0.5-1.0)
    let extensionFactor;
    if (progress < 0.3) {
        // Quick extend
        extensionFactor = progress / 0.3;
    } else if (progress < 0.5) {
        // Hold at full extension
        extensionFactor = 1;
    } else {
        // Retract with fade
        extensionFactor = 1 - ((progress - 0.5) / 0.5);
    }

    const length = baseLength * extensionFactor;
    const startOffset = tileSize * 0.2;  // Start slightly away from center

    // Calculate jab line endpoints
    const startX = screenX + Math.cos(direction) * startOffset;
    const startY = screenY + Math.sin(direction) * startOffset;
    const endX = screenX + Math.cos(direction) * (startOffset + length);
    const endY = screenY + Math.sin(direction) * (startOffset + length);

    // Draw smear effect (multiple lines for thickness)
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Main jab line
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = baseWidth;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Bright core
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 1.3})`;
    ctx.lineWidth = baseWidth * 0.5;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Impact burst for special attack
    if (isSpecial && progress < 0.4) {
        const burstAlpha = alpha * (1 - progress / 0.4);
        const burstSize = tileSize * 0.3 * (1 + progress);

        ctx.fillStyle = `rgba(255, 255, 255, ${burstAlpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(endX, endY, burstSize, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Draw sweep effect - horizontal arc that animates from start to end
 */
function drawSweepEffect(ctx, screenX, screenY, slash, tileSize, alpha) {
    const range = slash.range * tileSize;
    const halfArc = slash.arcAngle / 2;
    const startAngle = slash.angle - halfArc;
    const endAngle = slash.angle + halfArc;
    const progress = slash.progress;

    // Sweep animation: arc grows from start to end
    // The leading edge sweeps across, leaving a fading trail
    const sweepSpeed = 2.5;  // Complete sweep in first 40% of duration
    const sweepProgress = Math.min(progress * sweepSpeed, 1);

    // Current leading edge angle
    const currentAngle = startAngle + (endAngle - startAngle) * sweepProgress;

    // Trail start (fades behind the leading edge)
    const trailLength = 0.7;  // How much of the arc shows as trail
    const trailStart = Math.max(startAngle, currentAngle - (endAngle - startAngle) * trailLength);

    // Thick arc sweep effect
    ctx.lineCap = 'round';

    // Draw the swept trail (multiple arcs for thickness)
    const arcThickness = 6;
    const numArcs = 4;

    for (let i = 0; i < numArcs; i++) {
        const r = range * (0.5 + i * 0.15);
        const arcAlpha = alpha * (1 - i * 0.15);

        ctx.strokeStyle = `rgba(255, 255, 255, ${arcAlpha})`;
        ctx.lineWidth = arcThickness - i;

        ctx.beginPath();
        ctx.arc(screenX, screenY, r, trailStart, currentAngle);
        ctx.stroke();
    }

    // Draw bright leading edge line
    if (sweepProgress < 1) {
        const edgeAlpha = alpha * 1.2;
        ctx.strokeStyle = `rgba(255, 255, 255, ${edgeAlpha})`;
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(
            screenX + Math.cos(currentAngle) * range * 0.3,
            screenY + Math.sin(currentAngle) * range * 0.3
        );
        ctx.lineTo(
            screenX + Math.cos(currentAngle) * range,
            screenY + Math.sin(currentAngle) * range
        );
        ctx.stroke();

        // Glow at tip
        ctx.fillStyle = `rgba(255, 255, 255, ${edgeAlpha * 0.6})`;
        ctx.beginPath();
        ctx.arc(
            screenX + Math.cos(currentAngle) * range,
            screenY + Math.sin(currentAngle) * range,
            6, 0, Math.PI * 2
        );
        ctx.fill();
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
