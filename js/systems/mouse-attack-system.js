// ============================================================================
// MOUSE-DRIVEN ATTACK SYSTEM - The Shifting Chasm
// ============================================================================
// Left-click to attack toward mouse cursor
// Combo system: Attack 1 (left) -> Attack 2 (right) -> Attack 3 (special)
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
        slashStyle: 'alternate'  // Alternates left/right on each attack
    },
    axe: {
        arcAngle: 80,       // Wider arc for chopping swing
        arcRange: 1.69,     // was 1.3
        isRanged: false,
        slashStyle: 'chop'  // Angled swing ending in sharp cut mark
    },

    // Blunt weapons (ranges increased by 30%)
    mace: {
        arcAngle: 60,       // Narrow arc for overhead/angled slam
        arcRange: 1.56,     // was 1.5, slightly reduced for slam feel
        isRanged: false,
        slashStyle: 'slam'  // Angled swing ending in impact burst
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
        isRanged: false,
        slashStyle: 'thrust'  // Pull back then thrust forward
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
    swingDuration: 0.2,     // Duration of swing animation (200ms)
    swingDirection: 0,      // Angle in radians toward mouse
    swingArcAngle: 90,      // Current weapon arc angle
    swingRange: 1.0,        // Current weapon range
    swingStartTime: 0,

    // Enemies hit this swing (prevent multi-hit same enemy)
    hitEnemies: new Set(),

    // Visual slash effect
    slashEffects: [],  // { x, y, angle, progress, arcAngle, range }

    // Combo system: 1 (left) -> 2 (right) -> 3 (special/combo)
    comboCount: 1,  // Current attack in combo (1, 2, or 3)

    // Pending damage (delayed until after windup)
    pendingDamage: null  // { player, direction, arcConfig, isSpecial, triggered: false }
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
 * Uses displayX/displayY for accurate visual alignment during movement
 */
function getDirectionToMouse() {
    if (!game.player) return 0;

    // Use display position for visual accuracy (gridX/gridY can lag behind during movement)
    const playerX = game.player.displayX !== undefined ? game.player.displayX : game.player.gridX;
    const playerY = game.player.displayY !== undefined ? game.player.displayY : game.player.gridY;

    const dx = mouseWorldX - playerX;
    const dy = mouseWorldY - playerY;

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
 * Uses combo system: Attack 1 (left) -> Attack 2 (right) -> Attack 3 (special)
 * @param {Object} player - The player object
 */
function performMouseAttack(player) {
    if (!player) return false;
    if (game.state !== 'playing') return false;

    // Check cooldown
    if (mouseAttackState.cooldown > 0) return false;

    // Check if already swinging
    if (mouseAttackState.isSwinging) return false;

    // Get weapon config
    const arcConfig = getWeaponArcConfig(player);
    const direction = getDirectionToMouse();

    // Combo system: determine attack properties based on combo count
    // 1 = left side attack, 2 = right side attack, 3 = special/combo finisher
    const comboCount = mouseAttackState.comboCount;
    const isSpecial = (comboCount === 3);
    const attackFromLeft = (comboCount === 1);  // 1 = left, 2 = right, 3 = center/special

    // Update player facing based on attack direction
    updatePlayerFacingFromAngle(player, direction);

    if (arcConfig.isRanged) {
        // Ranged attack - fire projectile
        performRangedAttack(player, direction, isSpecial, comboCount);
    } else {
        // Melee attack - swing arc
        performMeleeSwing(player, direction, arcConfig, isSpecial, attackFromLeft, comboCount);
    }

    // Advance combo counter (1 -> 2 -> 3 -> 1)
    mouseAttackState.comboCount = (comboCount % 3) + 1;

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
function performMeleeSwing(player, direction, arcConfig, isSpecial, attackFromLeft, comboCount) {
    mouseAttackState.isSwinging = true;
    mouseAttackState.swingProgress = 0;
    mouseAttackState.swingDirection = direction;
    mouseAttackState.swingArcAngle = arcConfig.arcAngle * (Math.PI / 180);
    mouseAttackState.swingRange = arcConfig.arcRange;
    mouseAttackState.swingStartTime = performance.now();
    mouseAttackState.hitEnemies.clear();

    // Create visual slash effect with combo info
    createSlashEffect(player, direction, arcConfig, isSpecial, attackFromLeft, comboCount);

    // Store pending damage - will be triggered after windup (15% of animation)
    mouseAttackState.pendingDamage = {
        player: player,
        direction: direction,
        arcConfig: arcConfig,
        isSpecial: isSpecial,
        triggered: false
    };
}

/**
 * Perform a ranged attack (projectile)
 * Uses combo system for visual variety
 */
function performRangedAttack(player, direction, isSpecial, comboCount) {
    const weapon = player.equipped?.MAIN;
    const weaponType = weapon?.weaponType;
    const arcConfig = getWeaponArcConfig(player);
    const isMagic = arcConfig.isMagic || false;

    // Add slight angle offset based on combo for visual variety
    // Attack 1: slight left offset, Attack 2: slight right offset, Attack 3: straight
    let angleOffset = 0;
    if (comboCount === 1) {
        angleOffset = -0.1;  // ~-6 degrees
    } else if (comboCount === 2) {
        angleOffset = 0.1;   // ~+6 degrees
    }
    const adjustedDirection = direction + angleOffset;

    // Note: Ammo requirement removed - bows and crossbows have unlimited arrows/bolts

    // Get player vision range for projectile distance
    const visionRange = typeof VISION_RADIUS !== 'undefined' ? VISION_RADIUS : 8;

    // Calculate direction vector using adjusted direction for combo variety
    const dirX = Math.cos(adjustedDirection);
    const dirY = Math.sin(adjustedDirection);

    // Determine element for magic weapons
    const element = weapon?.element || (isMagic ? 'arcane' : 'physical');

    // Use display position for visual accuracy
    const originX = player.displayX !== undefined ? player.displayX : player.gridX;
    const originY = player.displayY !== undefined ? player.displayY : player.gridY;

    // Create projectile using projectile system
    if (typeof createProjectile === 'function') {
        createProjectile({
            x: originX,
            y: originY,
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
            x: originX,
            y: originY,
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

    // Use a copy of the array to avoid issues with splicing during iteration
    const enemiesCopy = [...game.enemies];

    for (const enemy of enemiesCopy) {
        // Skip dead enemies, already hit, or enemies with invalid HP
        if (!enemy || enemy.hp <= 0 || isNaN(enemy.hp)) continue;
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
        // Get room for context
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

    // Ensure damage is a valid number (defensive check)
    if (isNaN(damageResult.finalDamage) || damageResult.finalDamage === undefined) {
        console.warn('[MouseAttack] Invalid damage calculated, using base damage');
        damageResult.finalDamage = Math.max(1, baseDamage);
    }

    // Apply damage
    enemy.hp -= damageResult.finalDamage;

    // Ensure HP doesn't become NaN
    if (isNaN(enemy.hp)) {
        console.warn('[MouseAttack] Enemy HP became NaN, setting to 0');
        enemy.hp = 0;
    }

    // Show damage number
    if (typeof showDamageNumber === 'function') {
        const color = damageResult.isCrit ? '#ffff00' : '#ffffff';
        showDamageNumber(enemy, damageResult.finalDamage, color);
    }

    // Combat enhancements hook (knockback, screen shake, stagger)
    if (typeof onCombatHit === 'function') {
        onCombatHit(player, enemy, damageResult);
    }

    // Trigger aggro - enemy should chase when hit
    if (enemy.hp > 0) {
        enemy.state = 'chasing';

        // Initialize combat object if it doesn't exist
        if (!enemy.combat) {
            enemy.combat = {
                isInCombat: false,
                currentTarget: null,
                attackCooldown: 0,
                attackSpeed: enemy.attackSpeed || 1.0,
                autoRetaliate: true,
                attackRange: enemy.attackRange || 1
            };
        }

        // Engage combat
        if (typeof engageCombat === 'function') {
            engageCombat(enemy, player);
        }
    }

    // Check for death
    if (enemy.hp <= 0) {
        if (typeof handleDeath === 'function') {
            handleDeath(enemy, player);
        } else {
            // Fallback: remove enemy directly if handleDeath is unavailable
            console.warn('[MouseAttack] handleDeath not available, removing enemy directly');
            const index = game.enemies.indexOf(enemy);
            if (index > -1) {
                game.enemies.splice(index, 1);
            }
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
 * Uses code-based MeleeSlashEffect system (arc + particles)
 */
function createSlashEffect(player, direction, arcConfig, isSpecial = false, attackFromLeft = true, comboCount = 1) {
    const slashStyle = arcConfig.slashStyle || 'sweep';

    // Use display position for visual accuracy - in TILE coordinates (center of tile = +0.5)
    const originX = (player.displayX !== undefined ? player.displayX : player.gridX) + 0.5;
    const originY = (player.displayY !== undefined ? player.displayY : player.gridY) + 0.5;

    // Use MeleeSlashEffect system if available (code-based arc + particles)
    if (typeof MeleeSlashEffect !== 'undefined') {
        const weapon = player.equipped?.MAIN;
        MeleeSlashEffect.create(originX, originY, direction, {
            range: arcConfig.arcRange || 1.25,
            arcDegrees: arcConfig.arcAngle || 90,
            slashDuration: isSpecial ? 10 : 8,
            particlesPerFrame: isSpecial ? 6 : 4,
            ...MeleeSlashEffect.getWeaponOptions(weapon)
        });
        return;
    }

    // Fallback: Add to local slashEffects array for legacy rendering
    mouseAttackState.slashEffects.push({
        x: player.displayX !== undefined ? player.displayX : player.gridX,
        y: player.displayY !== undefined ? player.displayY : player.gridY,
        angle: direction,
        arcAngle: arcConfig.arcAngle * (Math.PI / 180),
        range: arcConfig.arcRange,
        progress: 0,
        duration: 0.2,
        slashStyle: slashStyle,
        isSpecial: isSpecial,
        fromLeft: attackFromLeft,
        comboCount: comboCount
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
        } else if (slash.slashStyle === 'alternate') {
            // ALTERNATE STYLE - Smaller arc that alternates left/right (knife)
            drawAlternateEffect(ctx, screenX, screenY, slash, tileSize, alpha);
        } else if (slash.slashStyle === 'thrust') {
            // THRUST STYLE - Pull back then long thrust (polearm)
            drawThrustEffect(ctx, screenX, screenY, slash, tileSize, alpha);
        } else if (slash.slashStyle === 'slam') {
            // SLAM STYLE - Angled swing ending in impact burst (mace/hammer)
            drawSlamEffect(ctx, screenX, screenY, slash, tileSize, alpha);
        } else if (slash.slashStyle === 'chop') {
            // CHOP STYLE - Angled swing ending in sharp cut mark (axe)
            drawChopEffect(ctx, screenX, screenY, slash, tileSize, alpha);
        } else {
            // SWEEP STYLE - Horizontal arc sweep (sword, axe, etc.)
            drawSweepEffect(ctx, screenX, screenY, slash, tileSize, alpha);
        }

        ctx.restore();
    }
}

/**
 * Draw jab/punch effect - linear thrust toward target with windup
 * Respects fromLeft flag for combo system (slight angle offset for variety)
 */
function drawJabEffect(ctx, screenX, screenY, slash, tileSize, alpha) {
    const baseDirection = slash.angle;
    const progress = slash.progress;
    const isSpecial = slash.isSpecial;
    const fromLeft = slash.fromLeft;

    // Add slight angle offset based on combo direction for visual variety
    // Left attack: slight offset to the left (-15°), Right attack: slight offset to the right (+15°)
    // Special (combo 3): straight ahead (no offset)
    const comboCount = slash.comboCount || 1;
    let angleOffset = 0;
    if (comboCount === 1) {
        angleOffset = -0.26;  // ~-15 degrees (from left)
    } else if (comboCount === 2) {
        angleOffset = 0.26;   // ~+15 degrees (from right)
    }
    const direction = baseDirection + angleOffset;

    // Jab size - larger for special attack
    const baseLength = isSpecial ? tileSize * 0.9 : tileSize * 0.5;
    const baseWidth = isSpecial ? 12 : 6;

    // Animation phases with windup:
    // Windup/pullback (0-0.15): Pull fist back
    // Extend fast (0.15-0.4): Quick punch forward
    // Hold (0.4-0.55): Stay at full extension
    // Retract (0.55-1.0): Pull back with fade
    let extensionFactor;
    let pullbackOffset = 0;

    if (progress < 0.15) {
        // Windup - pull back fist
        const windupProgress = progress / 0.15;
        pullbackOffset = tileSize * 0.25 * windupProgress;
        extensionFactor = 0;
    } else if (progress < 0.4) {
        // Quick extend
        const extendProgress = (progress - 0.15) / 0.25;
        extensionFactor = extendProgress;
        pullbackOffset = tileSize * 0.25 * (1 - extendProgress);
    } else if (progress < 0.55) {
        // Hold at full extension
        extensionFactor = 1;
        pullbackOffset = 0;
    } else {
        // Retract with fade
        extensionFactor = 1 - ((progress - 0.55) / 0.45);
        pullbackOffset = 0;
    }

    const length = baseLength * extensionFactor;
    const startOffset = tileSize * 0.2 - pullbackOffset;

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

    // Impact burst for special attack (after windup)
    if (isSpecial && progress >= 0.4 && progress < 0.6) {
        const burstProgress = (progress - 0.4) / 0.2;
        const burstAlpha = alpha * (1 - burstProgress);
        const burstSize = tileSize * 0.3 * (1 + burstProgress);

        ctx.fillStyle = `rgba(255, 255, 255, ${burstAlpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(endX, endY, burstSize, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Draw alternate effect - smaller arc that alternates left/right (knife) with windup
 */
function drawAlternateEffect(ctx, screenX, screenY, slash, tileSize, alpha) {
    const range = slash.range * tileSize;
    const halfArc = slash.arcAngle / 2;
    const progress = slash.progress;
    const fromLeft = slash.fromLeft;

    // Determine sweep direction based on fromLeft flag
    // If fromLeft: sweep from left side to right side of the attack direction
    // If !fromLeft: sweep from right side to left side
    let startAngle, endAngle;
    if (fromLeft) {
        startAngle = slash.angle - halfArc;
        endAngle = slash.angle + halfArc;
    } else {
        startAngle = slash.angle + halfArc;
        endAngle = slash.angle - halfArc;
    }

    // Animation phases with windup:
    // Windup (0-0.15): Pull back to starting side
    // Sweep (0.15-0.55): Fast sweep across
    // Fade (0.55-1.0): Trail fades out
    let sweepProgress;
    let windupOffset = 0;

    if (progress < 0.15) {
        // Windup - pull back to starting position
        const windupProgress = progress / 0.15;
        windupOffset = halfArc * 0.3 * windupProgress;  // Pull back past start
        sweepProgress = 0;
    } else if (progress < 0.55) {
        // Fast sweep animation
        sweepProgress = (progress - 0.15) / 0.4;
        windupOffset = halfArc * 0.3 * (1 - Math.min(sweepProgress * 2, 1));  // Release windup
    } else {
        // Fade phase - sweep complete
        sweepProgress = 1;
        windupOffset = 0;
    }

    // Apply windup offset to start angle
    const windupStartAngle = fromLeft
        ? startAngle - windupOffset
        : startAngle + windupOffset;

    // Current leading edge angle
    const currentAngle = windupStartAngle + (endAngle - windupStartAngle) * sweepProgress;

    // Shorter trail for knife (quicker, snappier feel)
    const trailLength = 0.5;
    const trailStart = fromLeft
        ? Math.max(windupStartAngle, currentAngle - (endAngle - windupStartAngle) * trailLength)
        : Math.min(windupStartAngle, currentAngle - (endAngle - windupStartAngle) * trailLength);

    // Thinner arc for knife
    ctx.lineCap = 'round';
    const arcThickness = 4;
    const numArcs = 3;

    // Draw the swept trail (only after windup)
    if (sweepProgress > 0) {
        for (let i = 0; i < numArcs; i++) {
            const r = range * (0.6 + i * 0.15);
            const arcAlpha = alpha * (1 - i * 0.2);

            ctx.strokeStyle = `rgba(255, 255, 255, ${arcAlpha})`;
            ctx.lineWidth = arcThickness - i;

            ctx.beginPath();
            // Draw arc in correct direction
            if (fromLeft) {
                ctx.arc(screenX, screenY, r, trailStart, currentAngle);
            } else {
                ctx.arc(screenX, screenY, r, currentAngle, trailStart);
            }
            ctx.stroke();
        }
    }

    // Draw bright leading edge line
    if (sweepProgress < 1) {
        const edgeAlpha = alpha * 1.3;
        ctx.strokeStyle = `rgba(255, 255, 255, ${edgeAlpha})`;
        ctx.lineWidth = 3;

        ctx.beginPath();
        ctx.moveTo(
            screenX + Math.cos(currentAngle) * range * 0.4,
            screenY + Math.sin(currentAngle) * range * 0.4
        );
        ctx.lineTo(
            screenX + Math.cos(currentAngle) * range,
            screenY + Math.sin(currentAngle) * range
        );
        ctx.stroke();

        // Small glow at tip
        ctx.fillStyle = `rgba(255, 255, 255, ${edgeAlpha * 0.5})`;
        ctx.beginPath();
        ctx.arc(
            screenX + Math.cos(currentAngle) * range,
            screenY + Math.sin(currentAngle) * range,
            4, 0, Math.PI * 2
        );
        ctx.fill();
    }
}

/**
 * Draw thrust effect - pull back then long thrust forward (polearm/spear)
 * Respects fromLeft flag for combo system (slight angle offset for variety)
 */
function drawThrustEffect(ctx, screenX, screenY, slash, tileSize, alpha) {
    const baseDirection = slash.angle;
    const progress = slash.progress;
    const isSpecial = slash.isSpecial;
    const maxRange = slash.range * tileSize;
    const fromLeft = slash.fromLeft;

    // Add slight angle offset based on combo direction for visual variety
    // Left attack: slight offset to the left (-10°), Right attack: slight offset to the right (+10°)
    // Special (combo 3): straight ahead (no offset)
    const comboCount = slash.comboCount || 1;
    let angleOffset = 0;
    if (comboCount === 1) {
        angleOffset = -0.17;  // ~-10 degrees (from left)
    } else if (comboCount === 2) {
        angleOffset = 0.17;   // ~+10 degrees (from right)
    }
    const direction = baseDirection + angleOffset;

    // Thrust animation phases:
    // Pull back (0-0.15): Retract slightly
    // Thrust forward (0.15-0.45): Quick extension to full range
    // Hold (0.45-0.65): Stay at full extension
    // Retract (0.65-1.0): Pull back with fade

    let extensionFactor;
    let pullbackOffset = 0;

    if (progress < 0.15) {
        // Pull back phase - retract slightly
        const pullbackProgress = progress / 0.15;
        pullbackOffset = tileSize * 0.3 * pullbackProgress;
        extensionFactor = 0;
    } else if (progress < 0.45) {
        // Thrust forward phase - quick extension
        const thrustProgress = (progress - 0.15) / 0.3;
        extensionFactor = thrustProgress;
        pullbackOffset = tileSize * 0.3 * (1 - thrustProgress);  // Release pullback
    } else if (progress < 0.65) {
        // Hold at full extension
        extensionFactor = 1;
        pullbackOffset = 0;
    } else {
        // Retract with fade
        extensionFactor = 1 - ((progress - 0.65) / 0.35);
        pullbackOffset = 0;
    }

    // Calculate thrust line - starts closer to player, extends far out
    const startOffset = tileSize * 0.15 - pullbackOffset;
    const length = maxRange * extensionFactor;

    const startX = screenX + Math.cos(direction) * startOffset;
    const startY = screenY + Math.sin(direction) * startOffset;
    const endX = screenX + Math.cos(direction) * (startOffset + length);
    const endY = screenY + Math.sin(direction) * (startOffset + length);

    // Polearm is thinner than sword but longer
    const baseWidth = isSpecial ? 6 : 4;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw the shaft (slightly darker/thinner line behind)
    if (extensionFactor > 0) {
        ctx.strokeStyle = `rgba(200, 200, 200, ${alpha * 0.6})`;
        ctx.lineWidth = baseWidth - 1;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
    }

    // Main thrust line
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.lineWidth = baseWidth;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Bright core
    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 1.2})`;
    ctx.lineWidth = baseWidth * 0.4;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Spear tip effect at the end (triangular point)
    if (extensionFactor > 0.5) {
        const tipAlpha = alpha * Math.min(1, (extensionFactor - 0.5) * 2);
        const tipSize = isSpecial ? 8 : 6;

        // Draw pointed tip
        ctx.fillStyle = `rgba(255, 255, 255, ${tipAlpha})`;
        ctx.beginPath();

        // Triangle pointing in direction of thrust
        const tipX = endX;
        const tipY = endY;
        const perpAngle = direction + Math.PI / 2;

        ctx.moveTo(
            tipX + Math.cos(direction) * tipSize,
            tipY + Math.sin(direction) * tipSize
        );
        ctx.lineTo(
            tipX + Math.cos(perpAngle) * tipSize * 0.5,
            tipY + Math.sin(perpAngle) * tipSize * 0.5
        );
        ctx.lineTo(
            tipX - Math.cos(perpAngle) * tipSize * 0.5,
            tipY - Math.sin(perpAngle) * tipSize * 0.5
        );
        ctx.closePath();
        ctx.fill();
    }

    // Impact burst for special attack at full extension
    if (isSpecial && progress >= 0.45 && progress < 0.7) {
        const burstProgress = (progress - 0.45) / 0.25;
        const burstAlpha = alpha * (1 - burstProgress);
        const burstSize = tileSize * 0.25 * (1 + burstProgress * 0.5);

        ctx.fillStyle = `rgba(255, 255, 255, ${burstAlpha * 0.4})`;
        ctx.beginPath();
        ctx.arc(endX, endY, burstSize, 0, Math.PI * 2);
        ctx.fill();
    }
}

/**
 * Draw slam effect - angled swing ending in impact burst (mace/hammer)
 * Respects fromLeft flag for combo system
 */
function drawSlamEffect(ctx, screenX, screenY, slash, tileSize, alpha) {
    const direction = slash.angle;
    const progress = slash.progress;
    const isSpecial = slash.isSpecial;
    const range = slash.range * tileSize;
    const halfArc = slash.arcAngle / 2;
    const fromLeft = slash.fromLeft;

    // Animation phases with windup:
    // Windup (0-0.15): Pull back/raise weapon
    // Swing down (0.15-0.4): Fast angled swing
    // Impact (0.4-0.55): Hit with shockwave burst
    // Fade (0.55-1.0): Effect fades out

    let swingProgress = 0;
    let pullbackOffset = 0;
    let impactPhase = false;

    if (progress < 0.15) {
        // Windup - pull back
        const windupProgress = progress / 0.15;
        pullbackOffset = range * 0.3 * windupProgress;
        swingProgress = 0;
    } else if (progress < 0.4) {
        // Swing phase - fast arc swing
        swingProgress = (progress - 0.15) / 0.25;
        pullbackOffset = range * 0.3 * (1 - swingProgress);
    } else if (progress < 0.55) {
        // Impact phase - shockwave
        swingProgress = 1;
        pullbackOffset = 0;
        impactPhase = true;
    } else {
        // Fade phase
        swingProgress = 1;
        pullbackOffset = 0;
    }

    // Calculate swing arc - starts from side, ends at target (center)
    // fromLeft: swing from left side, !fromLeft: swing from right side
    const startAngle = fromLeft ? direction - halfArc : direction + halfArc;
    const endAngle = direction;  // Slam ends at center/target

    // Apply pullback to start position
    const windupStartAngle = fromLeft
        ? startAngle - (halfArc * 0.3 * (1 - swingProgress))
        : startAngle + (halfArc * 0.3 * (1 - swingProgress));

    // Current swing position
    const currentAngle = windupStartAngle + (endAngle - windupStartAngle) * swingProgress;

    // Calculate impact point (where the slam lands)
    const impactX = screenX + Math.cos(direction) * range;
    const impactY = screenY + Math.sin(direction) * range;

    ctx.lineCap = 'round';

    // Draw the swing arc trail (only during and after swing)
    if (swingProgress > 0) {
        const arcThickness = 5;
        const numArcs = 3;

        // Shorter trail for slam
        const trailLength = 0.6;
        const trailStart = fromLeft
            ? Math.max(windupStartAngle, currentAngle - (endAngle - windupStartAngle) * trailLength)
            : Math.min(windupStartAngle, currentAngle - (endAngle - windupStartAngle) * trailLength);

        for (let i = 0; i < numArcs; i++) {
            const r = range * (0.5 + i * 0.2);
            const arcAlpha = alpha * (1 - i * 0.25);

            ctx.strokeStyle = `rgba(255, 255, 255, ${arcAlpha})`;
            ctx.lineWidth = arcThickness - i;

            ctx.beginPath();
            // Draw arc in correct direction
            if (fromLeft) {
                ctx.arc(screenX, screenY, r, trailStart, currentAngle);
            } else {
                ctx.arc(screenX, screenY, r, currentAngle, trailStart);
            }
            ctx.stroke();
        }

        // Draw leading edge (hammer head)
        if (swingProgress < 1) {
            const edgeAlpha = alpha * 1.3;
            ctx.strokeStyle = `rgba(255, 255, 255, ${edgeAlpha})`;
            ctx.lineWidth = 5;

            ctx.beginPath();
            ctx.moveTo(
                screenX + Math.cos(currentAngle) * range * 0.5,
                screenY + Math.sin(currentAngle) * range * 0.5
            );
            ctx.lineTo(
                screenX + Math.cos(currentAngle) * range,
                screenY + Math.sin(currentAngle) * range
            );
            ctx.stroke();

            // Hammer head glow
            ctx.fillStyle = `rgba(255, 255, 255, ${edgeAlpha * 0.7})`;
            ctx.beginPath();
            ctx.arc(
                screenX + Math.cos(currentAngle) * range,
                screenY + Math.sin(currentAngle) * range,
                8, 0, Math.PI * 2
            );
            ctx.fill();
        }
    }

    // Impact shockwave effect
    if (progress >= 0.4) {
        const impactProgress = Math.min((progress - 0.4) / 0.3, 1);
        const shockwaveAlpha = alpha * (1 - impactProgress * 0.7);

        // Expanding shockwave ring
        const baseShockSize = isSpecial ? tileSize * 0.6 : tileSize * 0.4;
        const shockwaveSize = baseShockSize * (1 + impactProgress * 0.8);

        ctx.strokeStyle = `rgba(255, 255, 255, ${shockwaveAlpha})`;
        ctx.lineWidth = 3 * (1 - impactProgress * 0.5);
        ctx.beginPath();
        ctx.arc(impactX, impactY, shockwaveSize, 0, Math.PI * 2);
        ctx.stroke();

        // Inner burst
        if (impactProgress < 0.5) {
            const burstAlpha = shockwaveAlpha * (1 - impactProgress * 2);
            const burstSize = baseShockSize * 0.6 * (1 + impactProgress);

            ctx.fillStyle = `rgba(255, 255, 255, ${burstAlpha * 0.6})`;
            ctx.beginPath();
            ctx.arc(impactX, impactY, burstSize, 0, Math.PI * 2);
            ctx.fill();
        }

        // Impact lines radiating outward (special attack only)
        if (isSpecial && impactProgress < 0.6) {
            const lineAlpha = shockwaveAlpha * (1 - impactProgress / 0.6);
            const lineLength = tileSize * 0.4 * (1 + impactProgress);

            ctx.strokeStyle = `rgba(255, 255, 255, ${lineAlpha})`;
            ctx.lineWidth = 2;

            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(
                    impactX + Math.cos(angle) * shockwaveSize * 0.5,
                    impactY + Math.sin(angle) * shockwaveSize * 0.5
                );
                ctx.lineTo(
                    impactX + Math.cos(angle) * (shockwaveSize * 0.5 + lineLength),
                    impactY + Math.sin(angle) * (shockwaveSize * 0.5 + lineLength)
                );
                ctx.stroke();
            }
        }
    }
}

/**
 * Draw chop effect - angled swing ending in sharp cut mark (axe)
 * Respects fromLeft flag for combo system
 */
function drawChopEffect(ctx, screenX, screenY, slash, tileSize, alpha) {
    const direction = slash.angle;
    const progress = slash.progress;
    const isSpecial = slash.isSpecial;
    const range = slash.range * tileSize;
    const halfArc = slash.arcAngle / 2;
    const fromLeft = slash.fromLeft;

    // Animation phases with windup (similar to slam):
    // Windup (0-0.15): Pull back/raise weapon
    // Swing down (0.15-0.4): Fast angled swing
    // Impact (0.4-0.55): Sharp cut effect
    // Fade (0.55-1.0): Effect fades out

    let swingProgress = 0;
    let pullbackOffset = 0;

    if (progress < 0.15) {
        // Windup - pull back
        const windupProgress = progress / 0.15;
        pullbackOffset = range * 0.25 * windupProgress;
        swingProgress = 0;
    } else if (progress < 0.4) {
        // Swing phase - fast arc swing
        swingProgress = (progress - 0.15) / 0.25;
        pullbackOffset = range * 0.25 * (1 - swingProgress);
    } else {
        // Impact and fade phase
        swingProgress = 1;
        pullbackOffset = 0;
    }

    // Calculate swing arc - starts from side, ends at target
    // fromLeft: swing from left side, !fromLeft: swing from right side
    const startAngle = fromLeft ? direction - halfArc : direction + halfArc;
    const endAngle = direction;  // Chop ends at center/target

    // Apply pullback to start position
    const windupStartAngle = fromLeft
        ? startAngle - (halfArc * 0.25 * (1 - swingProgress))
        : startAngle + (halfArc * 0.25 * (1 - swingProgress));

    // Current swing position
    const currentAngle = windupStartAngle + (endAngle - windupStartAngle) * swingProgress;

    // Calculate impact point (where the chop lands)
    const impactX = screenX + Math.cos(direction) * range;
    const impactY = screenY + Math.sin(direction) * range;

    ctx.lineCap = 'round';

    // Draw the swing arc trail (only during and after swing)
    if (swingProgress > 0) {
        const arcThickness = 5;
        const numArcs = 3;

        // Trail for chop
        const trailLength = 0.5;
        const trailStart = fromLeft
            ? Math.max(windupStartAngle, currentAngle - (endAngle - windupStartAngle) * trailLength)
            : Math.min(windupStartAngle, currentAngle - (endAngle - windupStartAngle) * trailLength);

        for (let i = 0; i < numArcs; i++) {
            const r = range * (0.5 + i * 0.2);
            const arcAlpha = alpha * (1 - i * 0.25);

            ctx.strokeStyle = `rgba(255, 255, 255, ${arcAlpha})`;
            ctx.lineWidth = arcThickness - i;

            ctx.beginPath();
            // Draw arc in correct direction
            if (fromLeft) {
                ctx.arc(screenX, screenY, r, trailStart, currentAngle);
            } else {
                ctx.arc(screenX, screenY, r, currentAngle, trailStart);
            }
            ctx.stroke();
        }

        // Draw leading edge (axe blade)
        if (swingProgress < 1) {
            const edgeAlpha = alpha * 1.3;
            ctx.strokeStyle = `rgba(255, 255, 255, ${edgeAlpha})`;
            ctx.lineWidth = 4;

            ctx.beginPath();
            ctx.moveTo(
                screenX + Math.cos(currentAngle) * range * 0.4,
                screenY + Math.sin(currentAngle) * range * 0.4
            );
            ctx.lineTo(
                screenX + Math.cos(currentAngle) * range,
                screenY + Math.sin(currentAngle) * range
            );
            ctx.stroke();

            // Axe blade glow (slightly smaller than hammer)
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

    // Impact effect - sharp cut mark instead of shockwave
    if (progress >= 0.4) {
        const impactProgress = Math.min((progress - 0.4) / 0.25, 1);
        const cutAlpha = alpha * (1 - impactProgress * 0.6);

        // Sharp impact burst (smaller, sharper than slam)
        const burstSize = isSpecial ? tileSize * 0.35 : tileSize * 0.25;

        if (impactProgress < 0.4) {
            const burstAlpha = cutAlpha * (1 - impactProgress / 0.4);
            ctx.fillStyle = `rgba(255, 255, 255, ${burstAlpha * 0.7})`;
            ctx.beginPath();
            ctx.arc(impactX, impactY, burstSize * (0.8 + impactProgress * 0.5), 0, Math.PI * 2);
            ctx.fill();
        }

        // Cut/slash mark - diagonal line at impact point
        const cutLength = isSpecial ? tileSize * 0.5 : tileSize * 0.35;
        const cutAngle = direction + Math.PI / 4;  // 45° offset for diagonal cut

        ctx.strokeStyle = `rgba(255, 255, 255, ${cutAlpha})`;
        ctx.lineWidth = isSpecial ? 4 : 3;
        ctx.beginPath();
        ctx.moveTo(
            impactX - Math.cos(cutAngle) * cutLength * 0.5,
            impactY - Math.sin(cutAngle) * cutLength * 0.5
        );
        ctx.lineTo(
            impactX + Math.cos(cutAngle) * cutLength * 0.5,
            impactY + Math.sin(cutAngle) * cutLength * 0.5
        );
        ctx.stroke();

        // Secondary cut line for special attack (X mark)
        if (isSpecial) {
            const cutAngle2 = direction - Math.PI / 4;
            ctx.strokeStyle = `rgba(255, 255, 255, ${cutAlpha * 0.8})`;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(
                impactX - Math.cos(cutAngle2) * cutLength * 0.4,
                impactY - Math.sin(cutAngle2) * cutLength * 0.4
            );
            ctx.lineTo(
                impactX + Math.cos(cutAngle2) * cutLength * 0.4,
                impactY + Math.sin(cutAngle2) * cutLength * 0.4
            );
            ctx.stroke();
        }

        // Small debris/spark particles
        if (impactProgress < 0.5) {
            const sparkAlpha = cutAlpha * (1 - impactProgress * 2);
            const sparkCount = isSpecial ? 4 : 3;
            const sparkSpread = tileSize * 0.3 * (1 + impactProgress);

            ctx.fillStyle = `rgba(255, 255, 255, ${sparkAlpha})`;
            for (let i = 0; i < sparkCount; i++) {
                const sparkAngle = direction + (i / sparkCount) * Math.PI - Math.PI / 2;
                const sparkDist = sparkSpread * (0.5 + Math.random() * 0.5);
                const sparkSize = 2 + Math.random() * 2;

                ctx.beginPath();
                ctx.arc(
                    impactX + Math.cos(sparkAngle) * sparkDist,
                    impactY + Math.sin(sparkAngle) * sparkDist,
                    sparkSize, 0, Math.PI * 2
                );
                ctx.fill();
            }
        }
    }
}

/**
 * Draw sweep effect - horizontal arc that animates from start to end with windup
 * Respects fromLeft flag for combo system (attack 1 = left, attack 2 = right)
 */
function drawSweepEffect(ctx, screenX, screenY, slash, tileSize, alpha) {
    const range = slash.range * tileSize;
    const halfArc = slash.arcAngle / 2;
    const progress = slash.progress;
    const fromLeft = slash.fromLeft;

    // Determine sweep direction based on fromLeft (combo system)
    // fromLeft true: sweep from left to right
    // fromLeft false: sweep from right to left
    let baseStartAngle, baseEndAngle;
    if (fromLeft) {
        baseStartAngle = slash.angle - halfArc;
        baseEndAngle = slash.angle + halfArc;
    } else {
        baseStartAngle = slash.angle + halfArc;
        baseEndAngle = slash.angle - halfArc;
    }

    // Animation phases with windup:
    // Windup (0-0.15): Pull back to starting angle
    // Sweep (0.15-0.5): Fast sweep across
    // Fade (0.5-1.0): Trail fades out
    let sweepProgress;
    let windupOffset = 0;

    if (progress < 0.15) {
        // Windup - pull back past starting angle
        const windupProgress = progress / 0.15;
        windupOffset = halfArc * 0.25 * windupProgress;
        sweepProgress = 0;
    } else if (progress < 0.5) {
        // Sweep animation
        sweepProgress = (progress - 0.15) / 0.35;
        windupOffset = halfArc * 0.25 * (1 - Math.min(sweepProgress * 2, 1));
    } else {
        // Fade phase - sweep complete
        sweepProgress = 1;
        windupOffset = 0;
    }

    // Apply windup offset to start angle (pull back further in sweep direction)
    const startAngle = fromLeft
        ? baseStartAngle - windupOffset
        : baseStartAngle + windupOffset;
    const endAngle = baseEndAngle;

    // Current leading edge angle
    const currentAngle = startAngle + (endAngle - startAngle) * sweepProgress;

    // Trail start (fades behind the leading edge)
    const trailLength = 0.7;  // How much of the arc shows as trail
    const trailStart = fromLeft
        ? Math.max(startAngle, currentAngle - (endAngle - startAngle) * trailLength)
        : Math.min(startAngle, currentAngle - (endAngle - startAngle) * trailLength);

    // Thick arc sweep effect
    ctx.lineCap = 'round';

    // Draw the swept trail (multiple arcs for thickness) - only after windup
    if (sweepProgress > 0) {
        const arcThickness = 6;
        const numArcs = 4;

        for (let i = 0; i < numArcs; i++) {
            const r = range * (0.5 + i * 0.15);
            const arcAlpha = alpha * (1 - i * 0.15);

            ctx.strokeStyle = `rgba(255, 255, 255, ${arcAlpha})`;
            ctx.lineWidth = arcThickness - i;

            ctx.beginPath();
            // Draw arc in correct direction based on fromLeft
            if (fromLeft) {
                ctx.arc(screenX, screenY, r, trailStart, currentAngle);
            } else {
                ctx.arc(screenX, screenY, r, currentAngle, trailStart);
            }
            ctx.stroke();
        }
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

        // Check for pending damage after windup phase (15% of animation)
        if (mouseAttackState.pendingDamage && !mouseAttackState.pendingDamage.triggered) {
            if (mouseAttackState.swingProgress >= 0.15) {
                const pd = mouseAttackState.pendingDamage;
                checkMeleeHits(pd.player, pd.direction, pd.arcConfig, pd.isSpecial);
                mouseAttackState.pendingDamage.triggered = true;
            }
        }

        if (mouseAttackState.swingProgress >= 1) {
            mouseAttackState.isSwinging = false;
            mouseAttackState.hitEnemies.clear();
            mouseAttackState.pendingDamage = null;
        }
    }

    // Update legacy slash effects
    updateSlashEffects(deltaTime);

    // Update new code-based MeleeSlashEffect system
    if (typeof MeleeSlashEffect !== 'undefined') {
        MeleeSlashEffect.update(deltaTime);
    }

    // Update monster magic/ranged attack effects
    if (typeof MonsterMagicEffect !== 'undefined') {
        MonsterMagicEffect.update(deltaTime);
    }
    if (typeof MonsterRangedEffect !== 'undefined') {
        MonsterRangedEffect.update(deltaTime);
    }
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
        mouseAttackState.pendingDamage = null;
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
