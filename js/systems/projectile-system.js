// ============================================================================
// PROJECTILE SYSTEM - Arrows, bolts, and magic projectiles
// ============================================================================
// Handles projectile travel time, collision detection, and damage application
// ============================================================================

// Active projectiles
const projectiles = [];

// ============================================================================
// PROJECTILE CREATION
// ============================================================================

/**
 * Create a projectile
 * @param {Object} config - Projectile configuration
 * @param {number} config.x - Starting X position (grid)
 * @param {number} config.y - Starting Y position (grid)
 * @param {number} config.targetX - Target X position (grid) - optional if using dirX/dirY
 * @param {number} config.targetY - Target Y position (grid) - optional if using dirX/dirY
 * @param {number} config.dirX - Direction X (normalized) - for mouse-aimed projectiles
 * @param {number} config.dirY - Direction Y (normalized) - for mouse-aimed projectiles
 * @param {number} config.maxDistance - Maximum travel distance (for direction-based)
 * @param {number} config.fadeAfter - Start fading after this distance
 * @param {number} config.speed - Speed in tiles per second
 * @param {number} config.damage - Pre-calculated damage
 * @param {string} config.element - Visual element type
 * @param {Object} config.attacker - Attacking entity
 * @param {Object} config.owner - Owner entity (alias for attacker)
 * @param {Object} config.target - Target entity (optional for direction-based)
 * @param {boolean} config.isMagic - Is this a magic projectile?
 * @param {boolean} config.isSkill - Is this a skill attack?
 * @param {boolean} config.isSpecial - Is this a special attack?
 * @param {Object} config.elementConfig - Magic element configuration
 */
function createProjectile(config) {
    let dx, dy, distance;

    // Support direction-based projectiles (for mouse-aimed attacks)
    if (config.dirX !== undefined && config.dirY !== undefined) {
        dx = config.dirX;
        dy = config.dirY;
        distance = config.maxDistance || 10;
    } else {
        // Traditional target-based
        dx = config.targetX - config.x;
        dy = config.targetY - config.y;
        distance = Math.sqrt(dx * dx + dy * dy);

        if (distance === 0) {
            // Already at target, apply damage immediately
            applyProjectileDamage(config);
            return null;
        }

        // Normalize
        dx = dx / distance;
        dy = dy / distance;
    }

    const projectile = {
        // Position
        x: config.x,
        y: config.y,
        displayX: config.x,
        displayY: config.y,

        // Target (optional)
        targetX: config.targetX,
        targetY: config.targetY,
        target: config.target,

        // Direction (normalized)
        dirX: dx,
        dirY: dy,

        // Movement
        velocityX: dx * config.speed,
        velocityY: dy * config.speed,
        speed: config.speed,
        distanceToTravel: config.maxDistance || distance,
        distanceTraveled: 0,

        // Fade effect
        fadeStart: config.fadeAfter || config.maxDistance || distance,
        alpha: 1.0,

        // Combat
        damage: config.damage,
        element: config.element || 'physical',
        attacker: config.attacker || config.owner,
        isMagic: config.isMagic || false,
        isSkill: config.isSkill || false,
        isSpecial: config.isSpecial || false,
        elementConfig: config.elementConfig || null,

        // Hit detection mode
        isDirectionBased: config.dirX !== undefined,

        // State
        active: true,
        hasHit: false
    };

    projectiles.push(projectile);
    return projectile;
}

// ============================================================================
// PROJECTILE UPDATE
// ============================================================================

/**
 * Update all projectiles
 * @param {number} deltaTime - Time since last frame in milliseconds
 */
function updateProjectiles(deltaTime) {
    const dt = deltaTime / 1000; // Convert to seconds

    for (let i = projectiles.length - 1; i >= 0; i--) {
        const proj = projectiles[i];

        if (!proj.active) {
            projectiles.splice(i, 1);
            continue;
        }

        // Update position
        proj.displayX += proj.velocityX * dt;
        proj.displayY += proj.velocityY * dt;
        proj.distanceTraveled += proj.speed * dt;

        // Update fade alpha for direction-based projectiles
        if (proj.isDirectionBased && proj.distanceTraveled > proj.fadeStart) {
            const fadeProgress = (proj.distanceTraveled - proj.fadeStart) / (proj.distanceToTravel - proj.fadeStart);
            proj.alpha = Math.max(0, 1 - fadeProgress);
        }

        // For direction-based projectiles, check enemy collision
        if (proj.isDirectionBased && !proj.hasHit) {
            const hitEnemy = checkProjectileEnemyCollision(proj);
            if (hitEnemy) {
                // Hit an enemy
                applyProjectileDamage({
                    damage: proj.damage,
                    element: proj.element,
                    attacker: proj.attacker,
                    target: hitEnemy,
                    isMagic: proj.isMagic,
                    isSkill: proj.isSkill,
                    isSpecial: proj.isSpecial,
                    elementConfig: proj.elementConfig
                });

                // Combat enhancements hook
                if (typeof onCombatHit === 'function') {
                    onCombatHit(proj.attacker, hitEnemy, { finalDamage: proj.damage, isCrit: false });
                }

                proj.hasHit = true;
                proj.active = false;
                projectiles.splice(i, 1);
                continue;
            }
        }

        // Check if reached target or max distance
        if (proj.distanceTraveled >= proj.distanceToTravel) {
            // For target-based projectiles, apply damage to target
            if (!proj.isDirectionBased && proj.target) {
                applyProjectileDamage({
                    damage: proj.damage,
                    element: proj.element,
                    attacker: proj.attacker,
                    target: proj.target,
                    isMagic: proj.isMagic,
                    isSkill: proj.isSkill,
                    elementConfig: proj.elementConfig
                });
            }

            proj.active = false;
            projectiles.splice(i, 1);
            continue;
        }

        // Check collision with walls/obstacles
        const gridX = Math.floor(proj.displayX);
        const gridY = Math.floor(proj.displayY);

        if (checkProjectileWallCollision(gridX, gridY)) {
            // Hit wall
            proj.active = false;
            projectiles.splice(i, 1);
            continue;
        }
    }
}

/**
 * Check if projectile hits any enemy
 * @param {Object} proj - The projectile
 * @returns {Object|null} Hit enemy or null
 */
function checkProjectileEnemyCollision(proj) {
    if (!game.enemies) return null;

    const hitRadius = 0.4; // Collision radius

    for (const enemy of game.enemies) {
        // Skip dead enemies or enemies with invalid HP
        if (!enemy || enemy.hp <= 0 || isNaN(enemy.hp)) continue;

        const dx = proj.displayX - enemy.gridX;
        const dy = proj.displayY - enemy.gridY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < hitRadius) {
            return enemy;
        }
    }

    return null;
}

/**
 * Check if projectile hits a wall or obstacle (renamed for clarity)
 */
function checkProjectileWallCollision(x, y) {
    return checkProjectileCollision(x, y);
}

// ============================================================================
// COLLISION DETECTION
// ============================================================================

/**
 * Check if projectile hits a wall or obstacle
 * @param {number} x - Grid X position
 * @param {number} y - Grid Y position
 * @returns {boolean} True if collision detected
 */
function checkProjectileCollision(x, y) {
    // Check bounds - use global grid dimensions
    const gridWidth = typeof GRID_WIDTH !== 'undefined' ? GRID_WIDTH : 100;
    const gridHeight = typeof GRID_HEIGHT !== 'undefined' ? GRID_HEIGHT : 100;

    if (x < 0 || x >= gridWidth || y < 0 || y >= gridHeight) {
        return true;
    }

    // Check tile directly from game.map (same as movement system)
    if (!game.map) return true;

    const tile = game.map[Math.floor(y)]?.[Math.floor(x)];
    if (!tile) return true;

    // Walls and void block projectiles
    if (tile.type === 'wall' || tile.type === 'void' || tile.type === 'interior_wall') {
        return true;
    }

    // Pillars block projectiles
    if (tile.decoration?.name === 'pillar') return true;

    // Check decoration entity layer (same as movement)
    if (typeof hasBlockingDecorationAt === 'function' && hasBlockingDecorationAt(Math.floor(x), Math.floor(y))) {
        return true;
    }

    // Closed doors block projectiles
    if (tile.type === 'door' && !tile.open) return true;

    return false;
}

// ============================================================================
// DAMAGE APPLICATION
// ============================================================================

/**
 * Apply projectile damage to target
 * @param {Object} config - Damage configuration
 */
function applyProjectileDamage(config) {
    const target = config.target;

    // Skip dead targets or targets with invalid HP
    if (!target || target.hp <= 0 || isNaN(target.hp)) {
        return; // Target already dead or invalid
    }

    // Ensure damage is valid
    let damage = config.damage;
    if (isNaN(damage) || damage === undefined) {
        console.warn('[Projectile] Invalid damage value, using default');
        damage = 5;
    }

    // Apply damage
    if (typeof applyDamage === 'function') {
        applyDamage(target, damage, config.attacker);
    } else {
        target.hp -= damage;
    }

    // Ensure HP doesn't become NaN
    if (isNaN(target.hp)) {
        console.warn('[Projectile] Target HP became NaN, setting to 0');
        target.hp = 0;
    }

    // Trigger aggro - enemy should chase when hit by ranged attacks
    if (config.attacker === game.player && target !== game.player) {
        // Make enemy aware and start chasing
        target.state = 'chasing';

        // Initialize combat object if it doesn't exist
        if (!target.combat) {
            target.combat = {
                isInCombat: false,
                currentTarget: null,
                attackCooldown: 0,
                attackSpeed: target.attackSpeed || 1.0,
                autoRetaliate: true,
                attackRange: target.attackRange || 1
            };
        }

        // Engage combat
        if (typeof engageCombat === 'function') {
            engageCombat(target, config.attacker);
        }
    }

    // Show damage number
    const color = config.isMagic ? '#00ffff' : '#ff4444';
    if (typeof showDamageNumber === 'function') {
        showDamageNumber(target, damage, color);
    }

    // Message
    if (typeof addMessage === 'function' && config.attacker === game.player) {
        const attackType = config.isSkill ? 'skill shot' : config.isMagic ? 'spell' : 'shot';
        addMessage(`Your ${attackType} hits ${target.name} for ${damage} damage!`);
    }

    // Apply magic effects (burn, freeze, lifesteal)
    if (config.isMagic && config.elementConfig) {
        applyMagicProjectileEffects(config);
    }

    // Check death
    if (target.hp <= 0) {
        if (typeof handleDeath === 'function') {
            handleDeath(target, config.attacker);
        } else {
            // Fallback: remove enemy directly if handleDeath is unavailable
            console.warn('[Projectile] handleDeath not available, removing enemy directly');
            const index = game.enemies.indexOf(target);
            if (index > -1) {
                game.enemies.splice(index, 1);
            }
        }
    }
}

/**
 * Apply magic effects from projectile hit
 */
function applyMagicProjectileEffects(config) {
    const { element, elementConfig, attacker, target, damage } = config;

    // Burn (Fire)
    if (element === 'fire' && elementConfig.burnChance) {
        if (Math.random() < elementConfig.burnChance) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(target, {
                    type: 'burn',
                    duration: elementConfig.burnDuration,
                    damage: elementConfig.burnDamage,
                    interval: 1000
                });
            }
            if (typeof addMessage === 'function') {
                addMessage(`${target.name} is burning!`);
            }
        }
    }

    // Freeze (Ice)
    if (element === 'ice' && elementConfig.freezeChance) {
        if (Math.random() < elementConfig.freezeChance) {
            if (typeof applyStatusEffect === 'function') {
                applyStatusEffect(target, {
                    type: 'freeze',
                    duration: elementConfig.freezeDuration
                });
            }
            target.isFrozen = true;
            setTimeout(() => {
                target.isFrozen = false;
            }, elementConfig.freezeDuration * 1000);

            if (typeof addMessage === 'function') {
                addMessage(`${target.name} is frozen!`);
            }
        }
    }

    // Lifesteal (Necromancy)
    if (element === 'necromancy' && elementConfig.lifestealPercent) {
        const heal = Math.floor(damage * elementConfig.lifestealPercent);
        attacker.hp = Math.min(attacker.maxHp, attacker.hp + heal);
        if (typeof addMessage === 'function') {
            addMessage(`Drained ${heal} HP!`);
        }
    }
}

// ============================================================================
// LINE OF SIGHT CHECKING
// ============================================================================

/**
 * Check if there's line of sight between two points
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y
 * @param {number} x2 - End X
 * @param {number} y2 - End Y
 * @returns {boolean} True if LOS is clear
 */
function checkLineOfSight(x1, y1, x2, y2) {
    // Bresenham's line algorithm
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;

    let x = x1;
    let y = y1;

    while (true) {
        // Check if this tile blocks LOS
        if (checkProjectileCollision(x, y)) {
            return false;
        }

        // Reached target
        if (x === x2 && y === y2) {
            return true;
        }

        // Step
        const e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x += sx;
        }
        if (e2 < dx) {
            err += dx;
            y += sy;
        }
    }
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Render all active projectiles
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} camX - Camera X
 * @param {number} camY - Camera Y
 * @param {number} tileSize - Tile size in pixels
 * @param {number} offsetX - Tracker width offset
 */
function renderProjectiles(ctx, camX, camY, tileSize, offsetX) {
    const trackerWidth = offsetX || 0;

    for (const proj of projectiles) {
        if (!proj.active) continue;

        const screenX = (proj.displayX - camX) * tileSize + trackerWidth + tileSize / 2;
        const screenY = (proj.displayY - camY) * tileSize + tileSize / 2;
        const angle = Math.atan2(proj.dirY || 0, proj.dirX || 1);

        ctx.save();

        // Apply fade alpha
        const alpha = proj.alpha !== undefined ? proj.alpha : 1.0;
        ctx.globalAlpha = alpha;

        // Draw projectile based on type
        if (proj.isMagic) {
            // Magic projectile - glowing bolt with trail
            const color = getElementColor(proj.element);

            ctx.translate(screenX, screenY);
            ctx.rotate(angle);

            // Trail effect (elongated glow behind)
            const gradient = ctx.createLinearGradient(-20, 0, 6, 0);
            gradient.addColorStop(0, 'transparent');
            gradient.addColorStop(0.5, color + '44');
            gradient.addColorStop(1, color);

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(-20, 0);
            ctx.lineTo(6, -4);
            ctx.lineTo(6, 4);
            ctx.closePath();
            ctx.fill();

            // Core bolt (bright white center)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.ellipse(0, 0, 6, 3, 0, 0, Math.PI * 2);
            ctx.fill();

            // Outer glow
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha * 0.7;
            ctx.beginPath();
            ctx.ellipse(0, 0, 10, 5, 0, 0, Math.PI * 2);
            ctx.fill();

            // Bright tip
            ctx.globalAlpha = alpha;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(4, 0, 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Physical projectile (arrow/bolt) - white bolt with trail
            ctx.translate(screenX, screenY);
            ctx.rotate(angle);

            // Trail effect
            const trailGradient = ctx.createLinearGradient(-16, 0, 0, 0);
            trailGradient.addColorStop(0, 'transparent');
            trailGradient.addColorStop(1, 'rgba(255, 255, 255, 0.5)');

            ctx.fillStyle = trailGradient;
            ctx.beginPath();
            ctx.moveTo(-16, 0);
            ctx.lineTo(0, -2);
            ctx.lineTo(0, 2);
            ctx.closePath();
            ctx.fill();

            // Arrow body (white/silver)
            ctx.fillStyle = '#dddddd';
            ctx.fillRect(-6, -1, 14, 2);

            // Arrow head (bright white)
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(10, 0);
            ctx.lineTo(6, -3);
            ctx.lineTo(6, 3);
            ctx.closePath();
            ctx.fill();

            // Fletching
            ctx.fillStyle = '#aaaaaa';
            ctx.beginPath();
            ctx.moveTo(-6, 0);
            ctx.lineTo(-4, -3);
            ctx.lineTo(-4, 3);
            ctx.closePath();
            ctx.fill();

            // Bright glow around arrow
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(-6, 0);
            ctx.lineTo(10, 0);
            ctx.stroke();
        }

        ctx.restore();
    }
}

/**
 * Get color for magic element
 */
function getElementColor(element) {
    const colors = {
        fire: '#ff4400',
        ice: '#00aaff',
        lightning: '#ffff00',
        necromancy: '#aa00ff',
        arcane: '#ff00ff',
        holy: '#ffffaa',
        dark: '#440088',
        death: '#884488',
        physical: '#888888'
    };
    return colors[element] || colors.physical;
}

// ============================================================================
// CLEANUP
// ============================================================================

/**
 * Clear all projectiles (e.g., on room change)
 */
function clearProjectiles() {
    projectiles.length = 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.createProjectile = createProjectile;
    window.updateProjectiles = updateProjectiles;
    window.renderProjectiles = renderProjectiles;
    window.checkLineOfSight = checkLineOfSight;
    window.clearProjectiles = clearProjectiles;
    window.projectiles = projectiles;
}

console.log('✅ Projectile system loaded');
