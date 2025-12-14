// ============================================================================
// ENEMY ABILITY SYSTEM - Special abilities for regular enemies
// ============================================================================
// Manages ability assignment, cooldowns, execution, and visual feedback
// for regular enemies (non-boss). Uses AbilityRepository for definitions.
// ============================================================================

const EnemyAbilitySystem = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    config: {
        debugLogging: false,
        defaultTelegraphTime: 500,
        globalCooldownBase: 1000,  // Minimum time between any abilities
        abilityUseChance: 0.25,   // Chance to use ability instead of basic attack
        eliteAbilityChance: 0.4   // Higher chance for elites
    },

    // ========================================================================
    // STATE
    // ========================================================================
    enemyAbilities: new Map(),     // enemyId -> { abilities, cooldowns, passives, mechanics }
    activeTelegraphs: [],          // Active attack telegraphs
    activeEffects: [],             // Active visual effects

    // ========================================================================
    // MONSTER TYPE -> ABILITY MAPPING
    // ========================================================================
    // Default ability assignments based on monster characteristics
    MONSTER_ABILITY_PRESETS: {
        // === VOLCANIC MONSTERS ===
        'Magma Slime': {
            attacks: ['ground_slam'],
            passives: ['fire_aura'],
            mechanics: ['death_explosion'],
            behavior: 'aggressive'
        },
        'Obsidian Golem': {
            attacks: ['heavy_slam', 'ground_slam', 'stomp'],
            passives: ['armored', 'thorns'],
            mechanics: ['enrage'],
            behavior: 'aggressive'
        },
        'Cinder Wisp': {
            attacks: ['projectile_single', 'fire_breath'],
            passives: ['flying', 'fire_aura'],
            mechanics: ['death_explosion'],
            behavior: 'kiter'
        },
        'Flame Bat': {
            attacks: ['bite', 'pounce'],
            passives: ['flying', 'evasion'],
            mechanics: [],
            behavior: 'hit_and_run'
        },
        'Ash Walker': {
            attacks: ['claw_swipe', 'lunge'],
            passives: ['undying'],
            mechanics: ['enrage'],
            behavior: 'aggressive'
        },
        'Salamander': {
            attacks: ['tail_whip', 'bite', 'fire_breath'],
            passives: ['regeneration'],
            mechanics: [],
            behavior: 'aggressive'
        },
        'Pyro Cultist': {
            attacks: ['projectile_burst', 'fire_breath'],
            passives: ['magic_resist'],
            mechanics: ['call_for_help'],
            behavior: 'defensive'
        },

        // === CAVE MONSTERS ===
        'Cave Bat': {
            attacks: ['bite'],
            passives: ['flying', 'evasion'],
            mechanics: [],
            behavior: 'swarm'
        },
        'Stone Lurker': {
            attacks: ['heavy_slam', 'stomp'],
            passives: ['armored', 'thorns'],
            mechanics: ['enrage'],
            behavior: 'guardian'
        },
        'Mushroom Sprite': {
            attacks: ['poison_cloud', 'spit'],
            passives: ['poison_touch'],
            mechanics: ['death_explosion'],
            behavior: 'defensive'
        },
        'Crystal Spider': {
            attacks: ['bite', 'web_shot', 'pounce'],
            passives: ['evasion', 'ambusher'],
            mechanics: [],
            behavior: 'ambusher'
        },

        // === UNDEAD MONSTERS ===
        'Skeletal Warrior': {
            attacks: ['melee_swing', 'double_strike', 'bone_throw'],
            passives: ['undying'],
            mechanics: ['call_for_help'],
            behavior: 'aggressive'
        },
        'Phantom': {
            attacks: ['life_drain', 'projectile_single', 'shadow_step'],
            passives: ['ethereal', 'evasion'],
            mechanics: ['teleport_when_hurt'],
            behavior: 'hit_and_run'
        },
        'Bone Golem': {
            attacks: ['heavy_slam', 'ground_slam', 'bone_throw'],
            passives: ['armored', 'undying'],
            mechanics: ['enrage', 'split'],
            behavior: 'aggressive'
        },

        // === AQUATIC MONSTERS ===
        'Deep Crawler': {
            attacks: ['claw_swipe', 'lunge'],
            passives: ['armored'],
            mechanics: [],
            behavior: 'aggressive'
        },
        'Tide Serpent': {
            attacks: ['bite', 'tail_whip', 'frost_breath'],
            passives: ['evasion', 'regeneration'],
            mechanics: [],
            behavior: 'hit_and_run'
        },

        // === SHADOW MONSTERS ===
        'Shadow Stalker': {
            attacks: ['double_strike', 'shadow_step', 'teleport_strike'],
            passives: ['ambusher', 'evasion'],
            mechanics: ['teleport_when_hurt'],
            behavior: 'ambusher'
        },
        'Void Touched': {
            attacks: ['projectile_burst', 'life_drain', 'homing_orb'],
            passives: ['magic_resist', 'ethereal'],
            mechanics: ['adaptive_resistance'],
            behavior: 'defensive'
        }
    },

    // Fallback presets by element if monster name not found
    ELEMENT_PRESETS: {
        'fire': {
            attacks: ['projectile_single', 'fire_breath'],
            passives: ['fire_aura'],
            mechanics: ['death_explosion'],
            behavior: 'aggressive'
        },
        'ice': {
            attacks: ['projectile_single', 'frost_breath'],
            passives: ['frost_aura'],
            mechanics: [],
            behavior: 'defensive'
        },
        'death': {
            attacks: ['life_drain', 'bone_throw'],
            passives: ['undying'],
            mechanics: ['enrage'],
            behavior: 'aggressive'
        },
        'shadow': {
            attacks: ['shadow_step', 'projectile_single'],
            passives: ['evasion', 'ambusher'],
            mechanics: ['teleport_when_hurt'],
            behavior: 'ambusher'
        },
        'earth': {
            attacks: ['ground_slam', 'stomp'],
            passives: ['armored', 'thorns'],
            mechanics: ['enrage'],
            behavior: 'guardian'
        },
        'poison': {
            attacks: ['spit', 'poison_cloud'],
            passives: ['poison_touch'],
            mechanics: ['death_explosion'],
            behavior: 'defensive'
        },
        'physical': {
            attacks: ['melee_swing', 'lunge'],
            passives: [],
            mechanics: [],
            behavior: 'aggressive'
        }
    },

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize abilities for an enemy
     * @param {object} enemy - The enemy entity
     */
    initializeEnemy(enemy) {
        if (!enemy || this.enemyAbilities.has(enemy.id || enemy)) return;

        const enemyId = enemy.id || `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        if (!enemy.id) enemy.id = enemyId;

        const tier = enemy.tier || 'TIER_2';
        const preset = this.getPresetForEnemy(enemy);

        // Build ability set
        const abilitySet = {
            attacks: [],
            passives: [],
            mechanics: [],
            behavior: null,
            cooldowns: {},
            globalCooldown: 0,
            activeEffects: []
        };

        // Assign attacks based on tier (fewer for weaker enemies)
        const maxAttacks = this.getMaxAttacksForTier(tier);
        const attackIds = preset.attacks.slice(0, maxAttacks);

        for (const attackId of attackIds) {
            const scaled = AbilityRepository.getScaledAttack(attackId, tier);
            if (scaled) {
                abilitySet.attacks.push(scaled);
                abilitySet.cooldowns[attackId] = 0;
            }
        }

        // Assign passives (elites get more)
        const maxPassives = tier === 'ELITE' ? 2 : (tier === 'TIER_1' ? 1 : 0);
        for (let i = 0; i < Math.min(maxPassives, preset.passives.length); i++) {
            const passive = AbilityRepository.getPassive(preset.passives[i], tier);
            if (passive) {
                abilitySet.passives.push(passive);
            }
        }

        // Assign mechanics (mainly for elites and tier 1)
        if (tier === 'ELITE' || tier === 'TIER_1') {
            for (const mechanicId of preset.mechanics.slice(0, 1)) {
                const mechanic = AbilityRepository.getMechanic(mechanicId, tier);
                if (mechanic) {
                    abilitySet.mechanics.push(mechanic);
                }
            }
        }

        // Assign behavior
        if (preset.behavior) {
            abilitySet.behavior = AbilityRepository.getBehavior(preset.behavior, tier);
        }

        this.enemyAbilities.set(enemyId, abilitySet);

        if (this.config.debugLogging) {
            console.log(`[EnemyAbility] Initialized ${enemy.name} (${tier}): ${abilitySet.attacks.length} attacks, ${abilitySet.passives.length} passives`);
        }
    },

    /**
     * Get preset for an enemy based on name or element
     */
    getPresetForEnemy(enemy) {
        // Try by name first
        if (this.MONSTER_ABILITY_PRESETS[enemy.name]) {
            return this.MONSTER_ABILITY_PRESETS[enemy.name];
        }

        // Try by element
        const element = enemy.element || 'physical';
        if (this.ELEMENT_PRESETS[element]) {
            return this.ELEMENT_PRESETS[element];
        }

        // Default fallback
        return this.ELEMENT_PRESETS['physical'];
    },

    /**
     * Get max attacks for tier
     */
    getMaxAttacksForTier(tier) {
        switch (tier) {
            case 'TIER_3': return 1;
            case 'TIER_2': return 2;
            case 'TIER_1': return 3;
            case 'ELITE': return 4;
            default: return 2;
        }
    },

    // ========================================================================
    // ABILITY EXECUTION
    // ========================================================================

    /**
     * Try to use an ability (called during enemy attack phase)
     * @param {object} enemy - The enemy
     * @param {object} target - The target (player)
     * @returns {boolean} True if ability was used
     */
    tryUseAbility(enemy, target) {
        const abilitySet = this.enemyAbilities.get(enemy.id);
        if (!abilitySet || abilitySet.attacks.length === 0) return false;

        // Check global cooldown
        if (abilitySet.globalCooldown > 0) return false;

        // Check if we should use ability vs basic attack
        const useChance = enemy.tier === 'ELITE'
            ? this.config.eliteAbilityChance
            : this.config.abilityUseChance;

        if (Math.random() > useChance) return false;

        // Find available abilities
        const available = abilitySet.attacks.filter(attack => {
            // Check cooldown
            if (abilitySet.cooldowns[attack.id] > 0) return false;

            // Check range if applicable
            if (attack.range) {
                const dist = this.getDistance(enemy, target);
                if (dist > attack.range) return false;
            }

            return true;
        });

        if (available.length === 0) return false;

        // Select ability (weighted by category matching situation)
        const ability = this.selectAbility(enemy, target, available);
        if (!ability) return false;

        // Execute the ability
        this.executeAbility(enemy, target, ability, abilitySet);
        return true;
    },

    /**
     * Select best ability for situation
     */
    selectAbility(enemy, target, available) {
        const dist = this.getDistance(enemy, target);

        // Weight abilities based on distance
        const weighted = available.map(a => {
            let weight = 1;

            // Prefer ranged at distance
            if (dist > 4 && (a.category === 'ranged' || a.category === 'breath')) {
                weight *= 2;
            }

            // Prefer melee when close
            if (dist <= 2 && a.category === 'melee') {
                weight *= 2;
            }

            // Prefer charges at medium distance
            if (dist >= 3 && dist <= 8 && a.category === 'charge') {
                weight *= 2;
            }

            return { ability: a, weight };
        });

        // Weighted random selection
        const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
        let roll = Math.random() * totalWeight;

        for (const w of weighted) {
            roll -= w.weight;
            if (roll <= 0) return w.ability;
        }

        return available[0];
    },

    /**
     * Execute an ability
     */
    executeAbility(enemy, target, ability, abilitySet) {
        // Set cooldowns
        abilitySet.cooldowns[ability.id] = ability.cooldown;
        abilitySet.globalCooldown = this.config.globalCooldownBase;

        // Determine attack type from ability category for visual rendering
        const attackType = this.getAttackTypeFromAbility(ability);

        // Use minimum telegraph time based on combat config
        const minWindupTime = typeof COMBAT_CONFIG !== 'undefined'
            ? COMBAT_CONFIG.enemyAttackDuration * COMBAT_CONFIG.enemyWindupPercent
            : 140;  // 140ms default (35% of 400ms)

        const telegraphTime = Math.max(ability.telegraphTime || 0, minWindupTime);

        // Set up attack animation state for visual rendering
        if (enemy.combat) {
            enemy.combat.attackAnimation = {
                state: 'windup',
                timer: telegraphTime,
                maxTimer: telegraphTime,
                totalDuration: telegraphTime / 0.35,  // Estimate total based on windup
                type: attackType,
                targetLocked: {
                    x: target.gridX,
                    y: target.gridY,
                    entity: target
                },
                abilityBased: true  // Flag to indicate ability-based attack
            };
        }

        // Face the target
        const dx = target.gridX - enemy.gridX;
        const dy = target.gridY - enemy.gridY;
        if (Math.abs(dx) > Math.abs(dy)) {
            enemy.facing = dx > 0 ? 'right' : 'left';
        } else {
            enemy.facing = dy > 0 ? 'down' : 'up';
        }

        // Create telegraph if ability has one (for ground indicators)
        if (ability.telegraphTime > 0 && ability.aoe) {
            this.createTelegraph(enemy, target, ability);
        }

        // Delayed execution after telegraph/windup
        setTimeout(() => {
            this.resolveAbility(enemy, target, ability);

            // Clear attack animation after resolve
            if (enemy.combat?.attackAnimation) {
                enemy.combat.attackAnimation.state = 'recovery';
                enemy.combat.attackAnimation.timer = 200;  // Brief recovery

                // Reset to idle after recovery
                setTimeout(() => {
                    if (enemy.combat?.attackAnimation) {
                        enemy.combat.attackAnimation.state = 'idle';
                    }
                }, 200);
            }
        }, telegraphTime);

        if (this.config.debugLogging) {
            console.log(`[EnemyAbility] ${enemy.name} using ${ability.name} (type: ${attackType})`);
        }
    },

    /**
     * Get visual attack type from ability category
     */
    getAttackTypeFromAbility(ability) {
        const category = ability.category || 'melee';

        switch (category) {
            case 'melee':
            case 'charge':
                return 'melee';

            case 'ranged':
                return 'ranged';

            case 'breath':
            case 'aoe':
            case 'special':
                // Determine based on element
                if (ability.element && ['fire', 'ice', 'arcane', 'void', 'death', 'magic', 'poison'].includes(ability.element)) {
                    return 'magic';
                }
                return ability.category === 'ranged' ? 'ranged' : 'melee';

            default:
                return 'melee';
        }
    },

    /**
     * Resolve ability effect (deal damage, apply effects)
     * Uses centralized applyDamage() and handleDeath() when available
     */
    resolveAbility(enemy, target, ability) {
        // Remove telegraph
        this.removeTelegraph(enemy.id);

        // Check if target is still in range/AOE
        const inRange = this.isTargetInAbilityArea(enemy, target, ability);

        if (inRange && ability.damage > 0) {
            // Calculate damage using centralized system
            const damageResult = this.calculateAbilityDamage(enemy, ability, target);

            // Check for miss
            if (!damageResult.isHit) {
                if (typeof addMessage === 'function') {
                    addMessage(`${enemy.name}'s ${ability.name} missed!`);
                }
                if (typeof showDamageNumber === 'function') {
                    showDamageNumber(target, 0, '#888888');
                }
                return;
            }

            const damage = damageResult.damage;

            if (target.hp !== undefined) {
                // Use centralized applyDamage if available
                if (typeof applyDamage === 'function') {
                    applyDamage(target, damage, enemy, damageResult.result);
                } else {
                    target.hp -= damage;
                }

                // Show damage number with crit coloring
                if (typeof showDamageNumber === 'function') {
                    const color = damageResult.isCrit ? '#ffff00' : this.getAbilityColor(ability);
                    showDamageNumber(target, damage, color);
                }

                // Show message
                if (typeof addMessage === 'function') {
                    const critText = damageResult.isCrit ? ' CRITICAL!' : '';
                    addMessage(`${enemy.name} hits with ${ability.name} for ${damage}!${critText}`);
                }

                // Apply effects
                this.applyAbilityEffects(enemy, target, ability);

                // Check death using centralized handleDeath
                if (target.hp <= 0) {
                    if (typeof handleDeath === 'function') {
                        handleDeath(target, enemy);
                    } else if (game) {
                        // Fallback for player death
                        game.state = 'gameover';
                    }
                }
            }
        } else if (inRange && ability.damage === 0 && ability.effect) {
            // Non-damaging abilities (buffs, summons, etc.)
            this.applyAbilityEffects(enemy, target, ability);
        }

        // Create visual effect
        this.createAbilityEffect(enemy, target, ability);
    },

    /**
     * Calculate ability damage using centralized DamageCalculator
     * Falls back to simple formula if DamageCalculator not available
     */
    calculateAbilityDamage(enemy, ability, target) {
        // Use centralized DamageCalculator if available
        if (typeof DamageCalculator !== 'undefined' && target) {
            const result = DamageCalculator.calculateDamage(enemy, target, null);

            // Scale by ability damage ratio (ability.damage is usually base damage)
            // Use ability damage as a multiplier on the calculated result
            const abilityMultiplier = ability.damage ? (ability.damage / 10) : 1.0;
            let damage = Math.floor(result.finalDamage * abilityMultiplier);

            // Apply combo finisher bonus if applicable
            if (enemy.combat?.comboCount === 3) {
                damage = Math.floor(damage * 1.5);
            }

            return {
                damage: Math.max(1, damage),
                isCrit: result.isCrit,
                isHit: result.isHit,
                result: result
            };
        }

        // Fallback: simple damage formula
        let damage = ability.damage || 10;

        // Apply enemy stats if available
        if (enemy.stats) {
            if (ability.element === 'magic' || ability.category === 'breath') {
                damage += Math.floor((enemy.stats.INT || 0) * 0.3);
            } else {
                damage += Math.floor((enemy.stats.STR || 0) * 0.3);
            }
        }

        // Apply combo finisher bonus if applicable
        if (enemy.combat?.comboCount === 3) {
            damage = Math.floor(damage * 1.5);
        }

        return {
            damage: Math.max(1, damage),
            isCrit: false,
            isHit: true,
            result: null
        };
    },

    /**
     * Apply ability effects (stun, slow, bleed, etc.)
     * Uses centralized applyStatusEffect() from skills-combat-integration when available
     */
    applyAbilityEffects(enemy, target, ability) {
        if (!ability.effect) return;

        // Helper to use centralized status effect system
        const useStatusEffect = typeof applyStatusEffect === 'function';

        switch (ability.effect) {
            case 'knockback':
                if (typeof applyKnockback === 'function') {
                    const dx = target.gridX - enemy.gridX;
                    const dy = target.gridY - enemy.gridY;
                    applyKnockback(target, dx, dy, ability.knockbackForce || 2);
                }
                break;

            case 'stun':
                if (useStatusEffect) {
                    applyStatusEffect(target, {
                        type: 'stun',
                        duration: ability.stunDuration || 1000,
                        source: enemy
                    });
                } else {
                    target.stunned = true;
                    target.stunnedTimer = ability.stunDuration || 1000;
                }
                break;

            case 'slow':
                if (useStatusEffect) {
                    applyStatusEffect(target, {
                        type: 'slow',
                        duration: ability.slowDuration || 2000,
                        slowPercent: ability.slowPercent || 0.5,
                        source: enemy
                    });
                } else {
                    target.slowed = true;
                    target.slowedTimer = ability.slowDuration || 2000;
                    target.slowPercent = ability.slowPercent || 0.5;
                }
                break;

            case 'bleed':
                if (useStatusEffect) {
                    applyStatusEffect(target, {
                        type: 'bleed',
                        damage: ability.bleedDamage || 3,
                        ticks: Math.ceil((ability.bleedDuration || 3000) / 1000),
                        interval: 1000,
                        source: enemy
                    });
                } else {
                    if (!target.statusEffects) target.statusEffects = [];
                    target.statusEffects.push({
                        type: 'bleed',
                        damage: ability.bleedDamage || 3,
                        duration: ability.bleedDuration || 3000,
                        tickInterval: 1000,
                        source: enemy
                    });
                }
                break;

            case 'poison':
                if (useStatusEffect) {
                    applyStatusEffect(target, {
                        type: 'poison',
                        damage: ability.poisonDamage || 2,
                        ticks: Math.ceil((ability.poisonDuration || 3000) / 1000),
                        interval: 1000,
                        source: enemy
                    });
                } else {
                    if (!target.statusEffects) target.statusEffects = [];
                    target.statusEffects.push({
                        type: 'poison',
                        damage: ability.poisonDamage || 2,
                        duration: ability.poisonDuration || 3000,
                        tickInterval: 1000,
                        source: enemy
                    });
                }
                break;

            case 'root':
                if (useStatusEffect) {
                    applyStatusEffect(target, {
                        type: 'root',
                        duration: ability.rootDuration || 2000,
                        source: enemy
                    });
                } else {
                    target.rooted = true;
                    target.rootedTimer = ability.rootDuration || 2000;
                }
                break;

            case 'heal_self':
                const healAmount = Math.floor(enemy.maxHp * (ability.healPercent || 0.1));
                enemy.hp = Math.min(enemy.maxHp, enemy.hp + healAmount);
                if (typeof addMessage === 'function') {
                    addMessage(`${enemy.name} heals for ${healAmount}!`);
                }
                break;

            case 'heal_on_hit':
                const lifeSteal = Math.floor(ability.damage * (ability.healPercent || 0.5));
                enemy.hp = Math.min(enemy.maxHp, enemy.hp + lifeSteal);
                break;

            case 'buff_self':
                enemy.buffed = true;
                enemy.buffTimer = ability.buffDuration || 10000;
                enemy.buffDamageMod = ability.buffDamageMod || 1.5;
                enemy.buffSpeedMod = ability.buffSpeedMod || 1.3;
                if (typeof addMessage === 'function') {
                    addMessage(`${enemy.name} powers up!`);
                }
                break;
        }
    },

    /**
     * Get color for ability damage numbers
     */
    getAbilityColor(ability) {
        const elementColors = {
            'fire': '#ff6600',
            'ice': '#00ccff',
            'poison': '#00ff00',
            'void': '#9900ff',
            'magic': '#ff00ff'
        };

        return elementColors[ability.element] || '#ff4444';
    },

    // ========================================================================
    // TELEGRAPH SYSTEM
    // ========================================================================

    /**
     * Create attack telegraph
     */
    createTelegraph(enemy, target, ability) {
        const telegraph = {
            enemyId: enemy.id,
            abilityId: ability.id,
            ability: ability,
            centerX: enemy.gridX,
            centerY: enemy.gridY,
            targetX: target.gridX,
            targetY: target.gridY,
            timer: ability.telegraphTime,
            maxTimer: ability.telegraphTime,
            aoe: ability.aoe
        };

        this.activeTelegraphs.push(telegraph);
    },

    /**
     * Remove telegraph for enemy
     */
    removeTelegraph(enemyId) {
        this.activeTelegraphs = this.activeTelegraphs.filter(t => t.enemyId !== enemyId);
    },

    /**
     * Render all active telegraphs
     */
    renderTelegraphs(ctx, camX, camY, tileSize, offsetX) {
        for (const telegraph of this.activeTelegraphs) {
            this.renderTelegraph(ctx, telegraph, camX, camY, tileSize, offsetX);
        }
    },

    /**
     * Render a single telegraph
     */
    renderTelegraph(ctx, telegraph, camX, camY, tileSize, offsetX) {
        const progress = 1 - (telegraph.timer / telegraph.maxTimer);
        const alpha = 0.3 + progress * 0.4;

        ctx.save();

        const cx = (telegraph.centerX - camX) * tileSize + offsetX + tileSize / 2;
        const cy = (telegraph.centerY - camY) * tileSize + tileSize / 2;
        const tx = (telegraph.targetX - camX) * tileSize + offsetX + tileSize / 2;
        const ty = (telegraph.targetY - camY) * tileSize + tileSize / 2;

        ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
        ctx.strokeStyle = `rgba(255, 255, 0, ${alpha + 0.2})`;
        ctx.lineWidth = 2;

        if (telegraph.aoe) {
            switch (telegraph.aoe.shape) {
                case 'circle':
                    const radius = telegraph.aoe.radius * tileSize;
                    ctx.beginPath();
                    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'arc':
                    const arcRadius = telegraph.aoe.radius * tileSize;
                    const angle = Math.atan2(ty - cy, tx - cx);
                    const halfArc = (telegraph.aoe.angle / 2) * Math.PI / 180;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.arc(cx, cy, arcRadius, angle - halfArc, angle + halfArc);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    break;

                case 'line':
                    const lineAngle = Math.atan2(ty - cy, tx - cx);
                    const lineLength = (telegraph.ability.range || 5) * tileSize;
                    const lineWidth = (telegraph.aoe.width || 1) * tileSize / 2;

                    ctx.save();
                    ctx.translate(cx, cy);
                    ctx.rotate(lineAngle);
                    ctx.fillRect(0, -lineWidth, lineLength, lineWidth * 2);
                    ctx.strokeRect(0, -lineWidth, lineLength, lineWidth * 2);
                    ctx.restore();
                    break;

                case 'cone':
                    const coneRange = telegraph.aoe.range * tileSize;
                    const coneAngle = Math.atan2(ty - cy, tx - cx);
                    const coneHalf = (telegraph.aoe.angle / 2) * Math.PI / 180;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.arc(cx, cy, coneRange, coneAngle - coneHalf, coneAngle + coneHalf);
                    ctx.closePath();
                    ctx.fill();
                    ctx.stroke();
                    break;
            }
        } else {
            // Default: target indicator
            ctx.beginPath();
            ctx.arc(tx, ty, tileSize / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }

        // Pulsing border
        if (progress > 0.7) {
            ctx.strokeStyle = `rgba(255, 255, 255, ${(progress - 0.7) * 3})`;
            ctx.lineWidth = 4;
            ctx.stroke();
        }

        ctx.restore();
    },

    // ========================================================================
    // VISUAL EFFECTS
    // ========================================================================

    /**
     * Create visual effect for ability
     */
    createAbilityEffect(enemy, target, ability) {
        const effect = {
            enemyId: enemy.id,
            abilityId: ability.id,
            ability: ability,
            x: enemy.gridX,
            y: enemy.gridY,
            targetX: target.gridX,
            targetY: target.gridY,
            timer: 500,
            maxTimer: 500
        };

        this.activeEffects.push(effect);
    },

    /**
     * Render active ability effects
     */
    renderEffects(ctx, camX, camY, tileSize, offsetX) {
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            this.renderEffect(ctx, effect, camX, camY, tileSize, offsetX);

            effect.timer -= 16;  // Approximate frame time
            if (effect.timer <= 0) {
                this.activeEffects.splice(i, 1);
            }
        }
    },

    /**
     * Render a single effect
     */
    renderEffect(ctx, effect, camX, camY, tileSize, offsetX) {
        const progress = 1 - (effect.timer / effect.maxTimer);
        const alpha = 1 - progress;

        ctx.save();

        const ex = (effect.x - camX) * tileSize + offsetX + tileSize / 2;
        const ey = (effect.y - camY) * tileSize + tileSize / 2;
        const tx = (effect.targetX - camX) * tileSize + offsetX + tileSize / 2;
        const ty = (effect.targetY - camY) * tileSize + tileSize / 2;

        ctx.globalAlpha = alpha;

        // Draw based on ability category
        switch (effect.ability.category) {
            case 'melee':
            case 'charge':
                // Arc slash effect
                ctx.strokeStyle = this.getAbilityColor(effect.ability);
                ctx.lineWidth = 4;
                const slashAngle = Math.atan2(ty - ey, tx - ex);
                ctx.beginPath();
                ctx.arc(ex, ey, tileSize * (1 + progress), slashAngle - 0.5, slashAngle + 0.5);
                ctx.stroke();
                break;

            case 'ranged':
                // Projectile trail
                ctx.fillStyle = this.getAbilityColor(effect.ability);
                const projX = ex + (tx - ex) * progress;
                const projY = ey + (ty - ey) * progress;
                ctx.beginPath();
                ctx.arc(projX, projY, 6, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'breath':
                // Cone effect
                ctx.fillStyle = this.getAbilityColor(effect.ability);
                ctx.globalAlpha = alpha * 0.5;
                const breathAngle = Math.atan2(ty - ey, tx - ex);
                ctx.beginPath();
                ctx.moveTo(ex, ey);
                ctx.arc(ex, ey, tileSize * 3 * progress, breathAngle - 0.5, breathAngle + 0.5);
                ctx.closePath();
                ctx.fill();
                break;

            case 'aoe':
                // Expanding ring
                ctx.strokeStyle = this.getAbilityColor(effect.ability);
                ctx.lineWidth = 3;
                ctx.beginPath();
                ctx.arc(ex, ey, tileSize * 2 * progress, 0, Math.PI * 2);
                ctx.stroke();
                break;
        }

        ctx.restore();
    },

    // ========================================================================
    // PASSIVE & MECHANIC PROCESSING
    // ========================================================================

    /**
     * Process passives for an enemy (called each update)
     */
    processPassives(enemy, dt) {
        const abilitySet = this.enemyAbilities.get(enemy.id);
        if (!abilitySet) return;

        for (const passive of abilitySet.passives) {
            this.applyPassive(enemy, passive, dt);
        }
    },

    /**
     * Apply a passive effect
     */
    applyPassive(enemy, passive, dt) {
        switch (passive.id) {
            case 'regeneration':
                enemy.lastDamageTime = enemy.lastDamageTime || 0;
                const timeSinceDamage = Date.now() - enemy.lastDamageTime;
                if (timeSinceDamage > passive.damageWindow) {
                    const heal = enemy.maxHp * passive.healRate * (dt / 1000);
                    enemy.hp = Math.min(enemy.maxHp, enemy.hp + heal);
                }
                break;

            case 'fire_aura':
                if (game.player) {
                    const dist = this.getDistance(enemy, game.player);
                    if (dist <= passive.range) {
                        enemy.auraTimer = (enemy.auraTimer || 0) + dt;
                        if (enemy.auraTimer >= passive.interval) {
                            // Use centralized applyDamage if available
                            if (typeof applyDamage === 'function') {
                                applyDamage(game.player, passive.damage, enemy, null);
                            } else {
                                game.player.hp -= passive.damage;
                            }
                            enemy.auraTimer = 0;
                            if (typeof showDamageNumber === 'function') {
                                showDamageNumber(game.player, passive.damage, '#ff6600');
                            }
                        }
                    }
                }
                break;

            case 'frost_aura':
                if (game.player) {
                    const dist = this.getDistance(enemy, game.player);
                    if (dist <= passive.range) {
                        // Use centralized applyStatusEffect if available
                        if (typeof applyStatusEffect === 'function') {
                            applyStatusEffect(game.player, {
                                type: 'slow',
                                duration: 500,
                                slowPercent: passive.slowPercent,
                                source: enemy
                            });
                        } else {
                            game.player.slowed = true;
                            game.player.slowPercent = passive.slowPercent;
                            game.player.slowedTimer = 500;
                        }
                    }
                }
                break;

            case 'berserk':
                if (enemy.hp / enemy.maxHp <= passive.healthThreshold) {
                    enemy.berserkActive = true;
                }
                break;
        }
    },

    /**
     * Check and trigger mechanics (called on events)
     */
    checkMechanics(enemy, event, data = {}) {
        const abilitySet = this.enemyAbilities.get(enemy.id);
        if (!abilitySet) return;

        for (const mechanic of abilitySet.mechanics) {
            if (mechanic.trigger === event) {
                this.triggerMechanic(enemy, mechanic, data);
            }
        }
    },

    /**
     * Trigger a mechanic effect
     */
    triggerMechanic(enemy, mechanic, data) {
        switch (mechanic.id) {
            case 'enrage':
                if (!enemy.enraged && enemy.hp / enemy.maxHp <= mechanic.threshold) {
                    enemy.enraged = true;
                    if (typeof addMessage === 'function') {
                        addMessage(`${enemy.name} becomes ENRAGED!`);
                    }
                }
                break;

            case 'death_explosion':
                // Create explosion effect and damage
                if (game.player) {
                    const dist = this.getDistance(enemy, game.player);
                    if (dist <= mechanic.radius) {
                        // Use centralized applyDamage if available
                        if (typeof applyDamage === 'function') {
                            applyDamage(game.player, mechanic.damage, enemy, null);
                        } else {
                            game.player.hp -= mechanic.damage;
                        }
                        if (typeof showDamageNumber === 'function') {
                            showDamageNumber(game.player, mechanic.damage, '#ff6600');
                        }
                        if (typeof addMessage === 'function') {
                            addMessage(`${enemy.name} explodes for ${mechanic.damage} damage!`);
                        }
                    }
                }
                break;

            case 'teleport_when_hurt':
                if (Math.random() < mechanic.chance) {
                    enemy.mechanicCooldowns = enemy.mechanicCooldowns || {};
                    if (!enemy.mechanicCooldowns[mechanic.id] ||
                        Date.now() - enemy.mechanicCooldowns[mechanic.id] > mechanic.cooldown) {
                        this.teleportEnemy(enemy, mechanic.minDistance, mechanic.maxDistance);
                        enemy.mechanicCooldowns[mechanic.id] = Date.now();
                    }
                }
                break;

            case 'call_for_help':
                // Alert nearby enemies
                if (game.enemies) {
                    for (const other of game.enemies) {
                        if (other === enemy || other.hp <= 0) continue;
                        // Optimized: uses squared distance to avoid sqrt
                        if (this.isWithinRange(enemy, other, mechanic.alertRadius)) {
                            other.state = 'chasing';
                            if (other.ai) {
                                other.ai.currentState = 'chasing';
                            }
                        }
                    }
                }
                break;
        }
    },

    /**
     * Teleport enemy to random location
     */
    teleportEnemy(enemy, minDist, maxDist) {
        if (!game.player) return;

        const attempts = 20;
        for (let i = 0; i < attempts; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = minDist + Math.random() * (maxDist - minDist);
            const newX = Math.floor(game.player.gridX + Math.cos(angle) * dist);
            const newY = Math.floor(game.player.gridY + Math.sin(angle) * dist);

            if (game.map[newY]?.[newX]?.type === 'floor' && !game.map[newY][newX].blocked) {
                enemy.gridX = newX;
                enemy.gridY = newY;
                enemy.displayX = newX;
                enemy.displayY = newY;
                return;
            }
        }
    },

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    /**
     * Get distance between two entities
     * Uses CombatSystem.getDistance if available (Chebyshev), otherwise Euclidean fallback
     */
    getDistance(a, b) {
        if (typeof CombatSystem !== 'undefined' && CombatSystem.getDistance) {
            return CombatSystem.getDistance(a, b);
        }
        // Fallback to Euclidean if CombatSystem not loaded
        const dx = (a.gridX || a.x) - (b.gridX || b.x);
        const dy = (a.gridY || a.y) - (b.gridY || b.y);
        return Math.sqrt(dx * dx + dy * dy);
    },

    // Optimized: avoids sqrt() for range comparisons
    getDistanceSquared(a, b) {
        const dx = (a.gridX || a.x) - (b.gridX || b.x);
        const dy = (a.gridY || a.y) - (b.gridY || b.y);
        return dx * dx + dy * dy;
    },

    isWithinRange(a, b, range) {
        return this.getDistanceSquared(a, b) <= range * range;
    },

    /**
     * Check if target is in ability area
     */
    isTargetInAbilityArea(enemy, target, ability) {
        const dist = this.getDistance(enemy, target);

        if (!ability.aoe) {
            return dist <= (ability.range || 2);
        }

        switch (ability.aoe.shape) {
            case 'circle':
                return dist <= ability.aoe.radius;

            case 'arc':
                if (dist > ability.aoe.radius) return false;
                // Check angle
                const angle = Math.atan2(target.gridY - enemy.gridY, target.gridX - enemy.gridX);
                const facing = enemy.facing || { x: 0, y: 1 };
                const facingAngle = Math.atan2(facing.y, facing.x);
                let angleDiff = Math.abs(angle - facingAngle);
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                return angleDiff <= (ability.aoe.angle / 2) * Math.PI / 180;

            case 'line':
                // Simplified line check
                return dist <= (ability.range || 5);

            case 'cone':
                if (dist > ability.aoe.range) return false;
                const coneAngle = Math.atan2(target.gridY - enemy.gridY, target.gridX - enemy.gridX);
                const coneFacing = enemy.facing || { x: 0, y: 1 };
                const coneFacingAngle = Math.atan2(coneFacing.y, coneFacing.x);
                let coneDiff = Math.abs(coneAngle - coneFacingAngle);
                if (coneDiff > Math.PI) coneDiff = 2 * Math.PI - coneDiff;
                return coneDiff <= (ability.aoe.angle / 2) * Math.PI / 180;

            default:
                return dist <= (ability.range || 2);
        }
    },

    // ========================================================================
    // UPDATE LOOP
    // ========================================================================

    /**
     * Update all enemy abilities (cooldowns, passives)
     */
    update(dt) {
        // Update cooldowns
        for (const [enemyId, abilitySet] of this.enemyAbilities) {
            // Global cooldown
            abilitySet.globalCooldown = Math.max(0, abilitySet.globalCooldown - dt);

            // Individual ability cooldowns
            for (const attackId in abilitySet.cooldowns) {
                abilitySet.cooldowns[attackId] = Math.max(0, abilitySet.cooldowns[attackId] - dt);
            }
        }

        // Update telegraphs
        for (let i = this.activeTelegraphs.length - 1; i >= 0; i--) {
            this.activeTelegraphs[i].timer -= dt;
            if (this.activeTelegraphs[i].timer <= 0) {
                this.activeTelegraphs.splice(i, 1);
            }
        }

        // Process passives for all enemies
        if (game.enemies) {
            for (const enemy of game.enemies) {
                if (enemy.hp > 0) {
                    this.processPassives(enemy, dt);

                    // Check health-based mechanics
                    this.checkMechanics(enemy, 'health_threshold');
                }
            }
        }
    },

    /**
     * Clean up enemy ability data
     */
    removeEnemy(enemyId) {
        this.enemyAbilities.delete(enemyId);
        this.removeTelegraph(enemyId);
    },

    /**
     * Clear all data
     */
    cleanup() {
        this.enemyAbilities.clear();
        this.activeTelegraphs = [];
        this.activeEffects = [];
    },

    // ========================================================================
    // DEBUG
    // ========================================================================

    getStatus() {
        return {
            trackedEnemies: this.enemyAbilities.size,
            activeTelegraphs: this.activeTelegraphs.length,
            activeEffects: this.activeEffects.length
        };
    },

    /**
     * Get ability info for an enemy
     */
    getEnemyAbilities(enemyId) {
        return this.enemyAbilities.get(enemyId);
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const EnemyAbilitySystemDef = {
    name: 'enemy-ability-system',

    init() {
        if (EnemyAbilitySystem.config.debugLogging) {
            console.log('[EnemyAbility] System initialized');
        }
    },

    update(dt) {
        EnemyAbilitySystem.update(dt);
    },

    cleanup() {
        EnemyAbilitySystem.cleanup();
    }
};

// Register with SystemManager (priority 38 - before enemy AI at 40)
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('enemy-ability-system', EnemyAbilitySystemDef, 38);
}

// ============================================================================
// EXPORTS
// ============================================================================
if (typeof window !== 'undefined') {
    window.EnemyAbilitySystem = EnemyAbilitySystem;
}

console.log('✅ Enemy Ability System loaded');
