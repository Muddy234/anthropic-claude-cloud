// ============================================================================
// ABILITY PROJECTILE SYSTEM - Manages homing and tracking projectiles
// ============================================================================
//
// This system manages projectiles spawned by enemy abilities like homing_orb.
// Unlike regular projectiles (arrows, etc.), these can:
// - Home toward the player with configurable turn rates
// - Persist after the caster dies (if configured)
// - Have custom visual trails and colors
//
// INTEGRATION POINTS:
// 1. index.html: Script loaded after enemy-ability-system.js
// 2. main.js: AbilityProjectileSystem.update(dt) called in updateDungeon()
// 3. renderer.js: AbilityProjectileSystem.render() called after EffectRenderer.drawOverlay()
// 4. enemy-ability-system.js:
//    - resolveAbility() spawns projectiles for homing abilities
//    - onEnemyDeath() calls cancelByEnemy() to clean up on enemy death
//    - cleanup() calls clear() on floor/state transitions
//
// PROJECTILE LIFECYCLE:
// 1. Caster telegraph phase (glow effect via EffectAnimator)
// 2. resolveAbility() spawns projectile via AbilityProjectileSystem.spawn()
// 3. Projectile homes toward player at configurable turn rate
// 4. Ends when: hits player (damage), hits wall (no damage), or timeout (no damage)
// 5. If caster dies: projectile persists if persistsAfterCasterDeath is true
//
// ============================================================================

const AbilityProjectileSystem = {
    projectiles: [],
    nextId: 1,

    /**
     * Spawn a new ability projectile
     * @param {object} config - Projectile configuration
     * @param {number} config.x - Starting X position (grid coords)
     * @param {number} config.y - Starting Y position (grid coords)
     * @param {number} config.targetX - Target X position (grid coords)
     * @param {number} config.targetY - Target Y position (grid coords)
     * @param {number} [config.direction] - Override direction in radians (instead of calculating from target)
     * @param {number} [config.speed=180] - Speed in pixels/sec
     * @param {boolean} [config.homing=false] - Whether projectile homes toward target
     * @param {number} [config.turnRate=90] - Turn rate in degrees/sec (for homing)
     * @param {string} [config.color='#FF4400'] - Projectile color
     * @param {string} [config.trailColor='#FF8800'] - Trail color
     * @param {number} [config.radius=8] - Projectile radius in pixels
     * @param {number} [config.damage=10] - Damage on hit
     * @param {number} [config.enemyId] - ID of enemy that fired this
     * @param {string} [config.abilityId] - ID of ability for status effect lookup in ABILITY_EFFECTS
     * @param {boolean} [config.persistsAfterCasterDeath=false] - Whether projectile survives caster death
     * @param {number} [config.maxLifetime=5000] - Maximum lifetime in ms
     * @returns {number} Projectile ID
     */
    spawn(config) {
        // Allow explicit direction override, otherwise calculate from target
        const direction = config.direction !== undefined
            ? config.direction
            : Math.atan2(config.targetY - config.y, config.targetX - config.x);

        const projectile = {
            id: this.nextId++,
            x: config.x,
            y: config.y,
            targetX: config.targetX,
            targetY: config.targetY,
            direction: direction,
            speed: config.speed || 180,  // pixels/sec
            homing: config.homing || false,
            turnRate: (config.turnRate || 90) * Math.PI / 180,  // Convert to radians/sec
            color: config.color || '#FF4400',
            trailColor: config.trailColor || '#FF8800',
            radius: config.radius || 8,
            damage: config.damage || 10,
            enemyId: config.enemyId,
            abilityId: config.abilityId || null,  // For status effect lookup
            persistsAfterCasterDeath: config.persistsAfterCasterDeath || false,
            maxLifetime: config.maxLifetime || 5000,  // 5 second timeout
            lifetime: 0,
            trailPositions: [],
            alive: true
        };

        this.projectiles.push(projectile);
        return projectile.id;
    },

    /**
     * Spawn a burst of projectiles with spread pattern
     * @param {object} config - Base projectile configuration (same as spawn())
     * @param {number} config.count - Number of projectiles to spawn (default 3)
     * @param {number} config.spreadDegrees - Total spread angle in degrees (default 30)
     * @returns {Array<number>} Array of projectile IDs
     */
    spawnBurst(config) {
        const count = config.count || 3;
        const spreadDegrees = config.spreadDegrees || 30;
        const spreadRad = spreadDegrees * Math.PI / 180;

        // Calculate base direction toward target
        const baseDir = Math.atan2(
            config.targetY - config.y,
            config.targetX - config.x
        );

        const projectileIds = [];

        // For odd count: center projectile at 0, others spread symmetrically
        // For even count: projectiles spread symmetrically around center
        for (let i = 0; i < count; i++) {
            // Calculate offset from center (-0.5 to 0.5 for normalized position)
            const normalizedPos = count === 1 ? 0 : (i / (count - 1)) - 0.5;
            // Convert to angle offset (half spread on each side)
            const angleOffset = normalizedPos * spreadRad;

            const id = this.spawn({
                ...config,
                direction: baseDir + angleOffset
            });
            projectileIds.push(id);
        }

        return projectileIds;
    },

    /**
     * Update all projectiles
     */
    update(deltaTime) {
        const player = typeof game !== 'undefined' ? game.player : null;
        const tileSize = typeof game !== 'undefined' ? (game.tileSize || 48) : 48;

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            if (!proj.alive) {
                this.projectiles.splice(i, 1);
                continue;
            }

            // Update lifetime
            proj.lifetime += deltaTime;
            if (proj.lifetime >= proj.maxLifetime) {
                proj.alive = false;
                continue;
            }

            // Store trail position
            proj.trailPositions.unshift({ x: proj.x, y: proj.y });
            if (proj.trailPositions.length > 10) {
                proj.trailPositions.pop();
            }

            // Homing behavior
            if (proj.homing && player) {
                const targetAngle = Math.atan2(
                    player.gridY - proj.y,
                    player.gridX - proj.x
                );

                let angleDiff = targetAngle - proj.direction;
                // Normalize to -PI to PI
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

                // Turn toward target (limited by turn rate)
                const maxTurn = proj.turnRate * deltaTime / 1000;
                if (Math.abs(angleDiff) <= maxTurn) {
                    proj.direction = targetAngle;
                } else {
                    proj.direction += Math.sign(angleDiff) * maxTurn;
                }
            }

            // Move projectile
            const moveSpeed = proj.speed * deltaTime / 1000 / tileSize;  // Convert to tiles
            proj.x += Math.cos(proj.direction) * moveSpeed;
            proj.y += Math.sin(proj.direction) * moveSpeed;

            // Check collision with player
            if (player) {
                const distToPlayer = Math.sqrt(
                    (proj.x - player.gridX) ** 2 +
                    (proj.y - player.gridY) ** 2
                );
                if (distToPlayer < 0.5) {
                    // Hit player - apply damage
                    if (typeof applyDamage === 'function') {
                        applyDamage(player, proj.damage, null, 'projectile');
                    }
                    if (typeof showDamageNumber === 'function') {
                        showDamageNumber(player, proj.damage, proj.color);
                    }

                    // Apply status effects from ABILITY_EFFECTS config if abilityId is set
                    if (proj.abilityId) {
                        this.applyProjectileStatusEffect(player, proj.abilityId, proj.enemyId);
                    }

                    proj.alive = false;
                    continue;
                }
            }

            // Check collision with walls
            if (typeof game !== 'undefined' && game.map) {
                const tileX = Math.floor(proj.x);
                const tileY = Math.floor(proj.y);
                const tile = game.map[tileY]?.[tileX];
                if (tile && tile.solid) {
                    proj.alive = false;
                    continue;
                }
            }
        }
    },

    /**
     * Render all projectiles
     */
    render(ctx, camX, camY, tileSize, offsetX) {
        for (const proj of this.projectiles) {
            if (!proj.alive) continue;

            const px = (proj.x - camX) * tileSize + offsetX + tileSize / 2;
            const py = (proj.y - camY) * tileSize + tileSize / 2;

            // Validate coordinates to prevent NaN errors
            if (!isFinite(px) || !isFinite(py) || !isFinite(proj.radius) || proj.radius <= 0) {
                continue;
            }

            // Draw trail
            ctx.save();
            for (let i = 0; i < proj.trailPositions.length; i++) {
                const pos = proj.trailPositions[i];
                const trailX = (pos.x - camX) * tileSize + offsetX + tileSize / 2;
                const trailY = (pos.y - camY) * tileSize + tileSize / 2;

                // Skip invalid trail positions
                if (!isFinite(trailX) || !isFinite(trailY)) continue;

                const alpha = (1 - i / proj.trailPositions.length) * 0.5;

                ctx.beginPath();
                ctx.arc(trailX, trailY, proj.radius * 0.5, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 136, 0, ${alpha})`;
                ctx.fill();
            }

            // Draw projectile core
            ctx.beginPath();
            ctx.arc(px, py, proj.radius, 0, Math.PI * 2);
            const gradient = ctx.createRadialGradient(px, py, 0, px, py, proj.radius);
            gradient.addColorStop(0, '#FFFFFF');
            gradient.addColorStop(0.3, proj.color);
            gradient.addColorStop(1, 'rgba(255, 68, 0, 0)');
            ctx.fillStyle = gradient;
            ctx.fill();

            ctx.restore();
        }
    },

    /**
     * Apply status effects from ABILITY_EFFECTS config when projectile hits
     * @param {object} target - The target entity (usually player)
     * @param {string} abilityId - The ability ID to look up in ABILITY_EFFECTS
     * @param {string|null} enemyId - The enemy ID that fired the projectile (may be null if caster died)
     */
    applyProjectileStatusEffect(target, abilityId, enemyId) {
        // Check if ABILITY_EFFECTS exists and has config for this ability
        if (typeof ABILITY_EFFECTS === 'undefined') return;

        const abilityConfig = ABILITY_EFFECTS[abilityId];
        if (!abilityConfig || !abilityConfig.statusEffect) return;

        const effect = abilityConfig.statusEffect;

        // Map effect types to StatusEffectSystem effect IDs
        const effectTypeMap = {
            'burn': 'burning',
            'burning': 'burning',
            'slow': 'slow',
            'slowed': 'slow',
            'poison': 'poisoned',
            'poisoned': 'poisoned',
            'root': 'rooted',
            'rooted': 'rooted',
            'stun': 'stunned',
            'stunned': 'stunned',
            'freeze': 'frozen',
            'frozen': 'frozen',
            'chill': 'chilled',
            'chilled': 'chilled',
            'bleed': 'bleeding',
            'bleeding': 'bleeding'
        };

        const effectId = effectTypeMap[effect.type] || effect.type;

        // Find the source enemy if it still exists
        let source = null;
        if (enemyId && typeof game !== 'undefined' && game.enemies) {
            source = game.enemies.find(e => e.id === enemyId);
        }

        // Apply using StatusEffectSystem if available
        if (typeof StatusEffectSystem !== 'undefined') {
            const options = {};

            // Pass duration from config
            if (effect.duration) {
                options.duration = effect.duration;
            }

            // Pass damage per tick for DoT effects
            if (effect.damagePerTick) {
                options.damagePerTick = effect.damagePerTick;
            }

            // Pass tick interval
            if (effect.tickInterval) {
                options.tickInterval = effect.tickInterval;
            }

            // Pass slow amount
            if (effect.amount) {
                options.slowPercent = effect.amount;
            }

            StatusEffectSystem.applyEffect(target, effectId, source, options);

            // Log for debugging
            if (typeof addMessage === 'function') {
                const effectName = effectId.charAt(0).toUpperCase() + effectId.slice(1);
                addMessage(`${target.name || 'Player'} is ${effectName}!`);
            }
        } else if (typeof applyStatusEffect === 'function') {
            // Fallback to global helper
            applyStatusEffect(target, effectId, source);
        }
    },

    /**
     * Remove all projectiles from a specific enemy
     * Exception: projectiles with persistsAfterCasterDeath survive
     */
    cancelByEnemy(enemyId) {
        this.projectiles = this.projectiles.filter(proj => {
            if (proj.enemyId === enemyId) {
                if (proj.persistsAfterCasterDeath) {
                    proj.enemyId = null;  // Detach from enemy
                    return true;
                }
                return false;
            }
            return true;
        });
    },

    /**
     * Clear all projectiles
     */
    clear() {
        this.projectiles = [];
    },

    /**
     * Get count of active projectiles (for debugging)
     */
    getActiveCount() {
        return this.projectiles.filter(p => p.alive).length;
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.AbilityProjectileSystem = AbilityProjectileSystem;
}
