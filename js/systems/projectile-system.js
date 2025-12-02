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
 * @param {number} config.targetX - Target X position (grid)
 * @param {number} config.targetY - Target Y position (grid)
 * @param {number} config.speed - Speed in tiles per second
 * @param {number} config.damage - Pre-calculated damage
 * @param {string} config.element - Visual element type
 * @param {Object} config.attacker - Attacking entity
 * @param {Object} config.target - Target entity
 * @param {boolean} config.isMagic - Is this a magic projectile?
 * @param {boolean} config.isSkill - Is this a skill attack?
 * @param {Object} config.elementConfig - Magic element configuration
 */
function createProjectile(config) {
    const dx = config.targetX - config.x;
    const dy = config.targetY - config.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) {
        // Already at target, apply damage immediately
        applyProjectileDamage(config);
        return null;
    }

    const projectile = {
        // Position
        x: config.x,
        y: config.y,
        displayX: config.x,
        displayY: config.y,

        // Target
        targetX: config.targetX,
        targetY: config.targetY,
        target: config.target,

        // Movement
        velocityX: (dx / distance) * config.speed,
        velocityY: (dy / distance) * config.speed,
        speed: config.speed,
        distanceToTravel: distance,
        distanceTraveled: 0,

        // Combat
        damage: config.damage,
        element: config.element || 'physical',
        attacker: config.attacker,
        isMagic: config.isMagic || false,
        isSkill: config.isSkill || false,
        elementConfig: config.elementConfig || null,

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

        // Check if reached target or max distance
        if (proj.distanceTraveled >= proj.distanceToTravel) {
            // Hit target
            applyProjectileDamage({
                damage: proj.damage,
                element: proj.element,
                attacker: proj.attacker,
                target: proj.target,
                isMagic: proj.isMagic,
                isSkill: proj.isSkill,
                elementConfig: proj.elementConfig
            });

            proj.active = false;
            projectiles.splice(i, 1);
            continue;
        }

        // Check collision with walls/obstacles
        const gridX = Math.floor(proj.displayX);
        const gridY = Math.floor(proj.displayY);

        if (checkProjectileCollision(gridX, gridY)) {
            // Hit wall
            if (typeof addMessage === 'function') {
                addMessage('Shot blocked by obstacle!');
            }
            proj.active = false;
            projectiles.splice(i, 1);
            continue;
        }
    }
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
    // Check bounds
    if (!game.map || !game.currentRoom) return true;

    const room = game.currentRoom;
    const localX = x - room.x;
    const localY = y - room.y;

    // Out of bounds
    if (localX < 0 || localY < 0 || localX >= room.width || localY >= room.height) {
        return true;
    }

    // Check tile type
    const tile = room.tiles[localY]?.[localX];
    if (!tile) return true;

    // Walls block projectiles
    if (tile.type === 'wall') return true;

    // Pillars block projectiles
    if (tile.decoration?.name === 'pillar') return true;

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

    if (!target || target.hp <= 0) {
        return; // Target already dead
    }

    // Apply damage
    if (typeof applyDamage === 'function') {
        applyDamage(target, config.damage, config.attacker);
    } else {
        target.hp -= config.damage;
    }

    // Show damage number
    const color = config.isMagic ? '#00ffff' : '#ff4444';
    if (typeof showDamageNumber === 'function') {
        showDamageNumber(target, config.damage, color);
    }

    // Message
    if (typeof addMessage === 'function' && config.attacker === game.player) {
        const attackType = config.isSkill ? 'skill shot' : config.isMagic ? 'spell' : 'shot';
        addMessage(`Your ${attackType} hits ${target.name} for ${config.damage} damage!`);
    }

    // Apply magic effects (burn, freeze, lifesteal)
    if (config.isMagic && config.elementConfig) {
        applyMagicProjectileEffects(config);
    }

    // Check death
    if (target.hp <= 0 && typeof handleDeath === 'function') {
        handleDeath(target, config.attacker);
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
 */
function renderProjectiles(ctx, camX, camY, tileSize) {
    for (const proj of projectiles) {
        if (!proj.active) continue;

        const screenX = (proj.displayX - camX) * tileSize + tileSize / 2;
        const screenY = (proj.displayY - camY) * tileSize + tileSize / 2;

        // Draw projectile based on type
        if (proj.isMagic) {
            // Magic projectile (colored orb)
            const color = getElementColor(proj.element);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
            ctx.fill();

            // Glow effect
            ctx.fillStyle = color + '44';
            ctx.beginPath();
            ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
            ctx.fill();
        } else {
            // Physical projectile (arrow/bolt)
            ctx.fillStyle = '#888888';
            ctx.fillRect(screenX - 2, screenY - 2, 4, 4);
        }
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
