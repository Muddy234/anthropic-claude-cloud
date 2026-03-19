// ============================================================
// ENEMY AI SYSTEM - The Shifting Chasm
// ============================================================
// Simplified 5-state machine:
// - IDLE: Patrol, wander, or stationary
// - ALERT: Investigating noise/sighting, includes reaction delay
// - COMBAT: Engaged with target (melee, ranged, circling, windup)
// - SEARCHING: Lost sight of target, looking for them
// - FOLLOWING: Following a leader or commanded target
// ============================================================

const AI_STATES = {
    IDLE: 'idle',
    ALERT: 'alert',
    COMBAT: 'combat',
    SEARCHING: 'searching',
    FOLLOWING: 'following'
};

const BEHAVIOR_TYPES = {
    aggressive: { hasTerritoryRange: false, territorySize: Infinity },
    territorial: { hasTerritoryRange: true, territorySize: 'room' },
    passive: { hasTerritoryRange: true, territorySize: 5 },
    defensive: { hasTerritoryRange: true, territorySize: 10 },
    patrol: { hasTerritoryRange: true, territorySize: 'room' }
};

class EnemyAI {
    constructor(enemy) {
        this.enemy = enemy;
        this.currentState = AI_STATES.IDLE;
        this.previousState = null;
        this.stateTimer = 0;
        this.stateData = {};

        // Target tracking
        this.target = null;
        this.lastKnownTargetPos = null;
        this.followTarget = null;
        this.commandedTarget = null;
        this.alertSource = null;

        // Spawn and territory
        this.spawnPosition = { x: enemy.gridX, y: enemy.gridY };
        this.territorySize = this._getTerritorySize();

        // Timers
        this.attackCooldown = 0;
        this.specialCooldown = 0;
        this.thinkInterval = 200;
        this.thinkTimer = Math.random() * this.thinkInterval;
        this.reactionTimer = 0;
        this.strafeTimer = 0;
        this.tokenRequestTimer = 0;
        this.stuckCheckTimer = 0;
        this.idleSubtimer = 0;
        this.searchSweepTimer = 0;

        // Combat substep: Windup (not a separate state)
        this.windupActive = false;
        this.windupTimer = 0;
        this.windupTargetPos = null;

        // Slot-based combat
        this.hasAttackToken = false;
        this.circleAngle = null;

        // Movement
        this.wanderTarget = null;
        this.isWandering = false;
        this.idlePauseDuration = 1500;
        this.lastPosition = { x: enemy.gridX, y: enemy.gridY };
        this.frustrationCounter = 0;
        this.strafeDirection = Math.random() < 0.5 ? 1 : -1;

        // Retreat
        this.retreatAlly = null;

        // Social system position override
        this.targetPosition = null;

        // Chase mode hysteresis - prevents jittering between chase/position modes
        this.isInChaseMode = false;
        this.chaseModeHysteresis = 0.5; // Buffer distance to prevent rapid mode switching

        // Load config from comprehensive tier system
        this._loadTierConfig(enemy);
    }

    /**
     * Load all AI configuration from the comprehensive tier system
     */
    _loadTierConfig(enemy) {
        // Get merged config (tier + overrides)
        const config = typeof getMonsterAIConfig === 'function'
            ? getMonsterAIConfig(enemy.name)
            : null;

        if (config) {
            // Perception
            this.sightRange = config.perception.sightRange;
            this.hearingRange = config.perception.hearingRange;
            this.reactionDelay = config.perception.reactionDelay;
            this.memoryDuration = config.perception.memoryDuration * 1000; // Convert to ms
            this.canSeeInDark = config.perception.canSeeInDark;

            // Movement
            this.baseSpeed = config.movement.baseSpeed;
            this.chaseSpeed = config.movement.chaseSpeed;
            this.fleeSpeed = config.movement.fleeSpeed;
            this.combatSpeed = config.movement.combatSpeed;
            this.wanderPattern = config.movement.wanderPattern;
            this.wanderRadius = config.movement.wanderRadius;
            this.pauseChance = config.movement.pauseChance;
            this.pauseDurationMin = config.movement.pauseDurationMin;
            this.pauseDurationMax = config.movement.pauseDurationMax;

            // Combat
            this.windupDuration = config.combat.windupDuration;
            this.attackCooldownBase = config.combat.attackCooldown * 1000; // Convert to ms
            this.tracksDuringWindup = config.combat.tracksDuringWindup;
            this.trackingCutoff = config.combat.trackingCutoff;
            this.canInterruptAttack = config.combat.canInterruptAttack;
            this.telegraphColor = config.combat.telegraphColor;
            this.circlingSpeed = config.combat.circlingSpeed;
            this.attackArcAngle = config.combat.attackArc;
            this.knockbackOnHit = config.combat.knockbackOnHit;

            // Defense
            this.fleeThreshold = config.defense.fleeThreshold;
            this.evasionChance = config.defense.evasionChance;

            // Social
            this.canLead = config.social.canLead;
            this.commandRange = config.social.commandRange;
            this.packCourage = config.social.packCourage;
            this.packCourageThreshold = config.social.packCourageThreshold;
            this.isSacrificial = config.social.isSacrificial;
            this.canSacrificeMinions = config.social.canSacrificeMinions;
            this.sacrificeThreshold = config.social.sacrificeThreshold;
            this.sacrificeHeal = config.social.sacrificeHeal;
            this.sacrificeDamageBuff = config.social.sacrificeDamageBuff;
            this.retreatHierarchy = config.social.retreatHierarchy;
            this.shoutRange = config.social.shoutRange;

            // Positioning
            this.optimalRange = config.positioning.preferredRange;
            this.rangeTolerance = Math.max(config.positioning.rangeTolerance, 1.0);
            this.canKite = config.positioning.kitesBehavior;
            this.circlingEnabled = config.positioning.circlingEnabled;
            this.circlingRadius = config.positioning.circlingRadius;

            // Intelligence
            this.searchBehavior = config.intelligence.searchBehavior;
            this.searchDuration = config.intelligence.searchDuration * 1000;
            this.frustrationThreshold = config.intelligence.frustrationThreshold;
            this.frustrationBehavior = config.intelligence.frustrationBehavior;

            // Special attack
            this.specialAttack = config.specialAttack;
        } else {
            // Fallback defaults
            this._loadFallbackConfig(enemy);
        }

        // Sacrifice state
        this.sacrificeTarget = null;
        this.hasSacrificeBuff = false;
    }

    /**
     * Fallback config if tier system not available
     */
    _loadFallbackConfig(enemy) {
        const tierConfig = enemy.tierConfig || MONSTER_TIERS?.[enemy.tier] || null;

        this.sightRange = enemy.perception?.sightRange || 6;
        this.hearingRange = tierConfig?.perception?.hearingRange || 8;
        this.reactionDelay = tierConfig?.perception?.reactionDelay || 150;
        this.memoryDuration = (tierConfig?.perception?.memoryDuration || 3) * 1000;
        this.canSeeInDark = tierConfig?.perception?.canSeeInDark || false;

        this.baseSpeed = 3.0;
        this.chaseSpeed = 3.5;
        this.fleeSpeed = 4.0;
        this.combatSpeed = 2.5;
        this.wanderPattern = 'random';
        this.wanderRadius = 4;
        this.pauseChance = 0.25;
        this.pauseDurationMin = 1000;
        this.pauseDurationMax = 3000;

        // IMPROVED: Longer windups for better readability - was 300ms default
        this.windupDuration = tierConfig?.combat?.windupDuration || 600;
        // IMPROVED: Longer cooldowns for better pacing - was 2.0s default
        this.attackCooldownBase = (tierConfig?.combat?.attackCooldown || 2.5) * 1000;
        this.tracksDuringWindup = false;
        this.trackingCutoff = 100;
        this.canInterruptAttack = true;
        // IMPROVED: More visible telegraph color
        this.telegraphColor = '#ff4444';
        this.circlingSpeed = 2.0;
        this.attackArcAngle = null;
        this.knockbackOnHit = 0;

        this.fleeThreshold = enemy.behavior?.fleeThreshold || 0.25;
        this.evasionChance = 0;

        this.canLead = tierConfig?.social?.canLead || false;
        this.commandRange = tierConfig?.social?.commandRange || 0;
        this.packCourage = tierConfig?.social?.packCourage || false;
        this.packCourageThreshold = tierConfig?.social?.packCourageThreshold || 4;
        this.isSacrificial = tierConfig?.social?.isSacrificial || false;
        this.canSacrificeMinions = tierConfig?.social?.canSacrificeMinions || false;
        this.sacrificeThreshold = tierConfig?.social?.sacrificeThreshold || 0.3;
        this.sacrificeHeal = tierConfig?.social?.sacrificeHeal || 0.25;
        this.sacrificeDamageBuff = tierConfig?.social?.sacrificeDamageBuff || 0.2;
        this.retreatHierarchy = tierConfig?.social?.retreatHierarchy || [];
        this.shoutRange = tierConfig?.social?.shoutRange || 5;

        // Use preferredRange for positioning. For ranged enemies without explicit preference,
        // fall back to attackRange so they maintain their attack distance
        const attackRange = enemy.combat?.attackRange || 1;
        const isRangedEnemy = attackRange > 1.5;
        this.optimalRange = enemy.behavior?.preferredRange || (isRangedEnemy ? attackRange : 1);
        this.rangeTolerance = Math.max(tierConfig?.positioning?.rangeTolerance || 1.0, 1.0);
        this.canKite = enemy.behavior?.kitesBehavior || false;
        this.circlingEnabled = true;
        this.circlingRadius = 1.5;

        this.searchBehavior = tierConfig?.intelligence?.searchBehavior || 'none';
        this.searchDuration = (tierConfig?.intelligence?.searchDuration || 5) * 1000;
        this.frustrationThreshold = 5;
        this.frustrationBehavior = 'giveUp';

        this.specialAttack = null;
    }

    _getTerritorySize() {
        const def = BEHAVIOR_TYPES[this.enemy.behavior?.type];
        if (!def?.hasTerritoryRange) return Infinity;
        return def.territorySize === 'room' ? 20 : (def.territorySize || 4);
    }

    /**
     * Get the authoritative attack range for this enemy
     * Uses combat.attackRange as the single source of truth
     */
    _getEffectiveAttackRange() {
        return this.enemy.combat?.attackRange || this.enemy.stats?.range || 1;
    }

    /**
     * Calculate chase threshold with hysteresis to prevent mode jittering
     * @param {number} atkRange - The attack range of the enemy
     * @returns {number} The threshold distance for chase mode
     */
    _getChaseThreshold(atkRange) {
        // Base threshold: attack range + buffer for positioning
        // Increased from +3 to +5 for more aggressive chasing
        // Melee: threshold = 6, Ranged (range 4): threshold = 9
        const baseThreshold = Math.max(atkRange + 5, 6);

        // Apply hysteresis: if currently chasing, use a lower threshold to exit chase mode
        // This prevents rapid switching between chase and position modes
        if (this.isInChaseMode) {
            return baseThreshold - this.chaseModeHysteresis;
        }
        return baseThreshold;
    }

    /**
     * Update chase mode state with hysteresis
     * @param {number} dist - Current distance to target
     * @param {number} atkRange - Attack range
     */
    _updateChaseModeState(dist, atkRange) {
        const enterThreshold = Math.max(atkRange + 5, 6);
        const exitThreshold = enterThreshold - this.chaseModeHysteresis;

        if (!this.isInChaseMode && dist > enterThreshold) {
            this.isInChaseMode = true;
        } else if (this.isInChaseMode && dist < exitThreshold) {
            this.isInChaseMode = false;
        }
    }

    // ========================================================================
    // MAIN UPDATE LOOP
    // ========================================================================

    update(dt, game) {
        if (this.enemy.hp <= 0) return;

        // Update timers
        this.stateTimer += dt;
        this.thinkTimer += dt;
        this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        this.specialCooldown = Math.max(0, this.specialCooldown - dt);

        // Get status effect modifiers
        const modifiers = this._getStatusModifiers();

        // Panicked modifier takes over behavior
        if (modifiers.panicked) {
            this._executePanicFlee(dt, game);
            return;
        }

        // DISABLED: Windup system removed - attacks now happen immediately
        // if (this.windupActive) {
        //     this._processWindup(dt, game);
        //     return;
        // }

        // Think (state transitions)
        if (this.thinkTimer >= this.thinkInterval) {
            this.thinkTimer = 0;
            this._think(game, modifiers);
        }

        // Execute current state behavior
        this._executeStateBehavior(dt, game, modifiers);
    }

    // ========================================================================
    // STATUS EFFECT MODIFIERS (replaces PANICKED/ENRAGED states)
    // ========================================================================

    _getStatusModifiers() {
        return {
            panicked: this.enemy.isFeared ||
                (typeof BoonCombatIntegration !== 'undefined' && BoonCombatIntegration.shouldFlee(this.enemy)),
            enraged: this.enemy.isEnraged || this.enemy.statusEffects?.includes('enraged'),
            stunned: this.enemy.isStunned,
            frozen: this.enemy.isFrozen
        };
    }

    _getEffectiveSpeed(baseSpeedMult, modifiers) {
        let mult = baseSpeedMult;
        if (modifiers.panicked) mult *= 1.2;
        if (modifiers.enraged) mult *= 1.3;
        if (modifiers.stunned || modifiers.frozen) mult = 0;
        return mult;
    }

    _getEffectiveFleeThreshold(modifiers) {
        if (modifiers.enraged) return 0; // Never flee when enraged
        if (modifiers.panicked) return 1; // Always flee when panicked

        let threshold = this.fleeThreshold;

        // Pack courage: with allies nearby, reduce flee threshold
        if (this.packCourage) {
            const nearbyAllies = this._countNearbyAllies(4);
            if (nearbyAllies >= this.packCourageThreshold) {
                threshold = 0; // Fearless
            }
        }

        return threshold;
    }

    _executePanicFlee(dt, game) {
        // Run away from player if visible
        const player = game.player;
        if (player) {
            const dist = this._dist(player.gridX, player.gridY);
            if (dist < 8) {
                this._moveAwayFrom(player.gridX, player.gridY, game, 1.2);
                return;
            }
        }

        // Flee in random direction
        if (!this.stateData.panicDir || this.stateTimer % 500 < 50) {
            this.stateData.panicDir = {
                x: this.enemy.gridX + (Math.random() - 0.5) * 6,
                y: this.enemy.gridY + (Math.random() - 0.5) * 6
            };
        }
        this._moveToward(this.stateData.panicDir.x, this.stateData.panicDir.y, game, 1.2);
    }

    // ========================================================================
    // THINK (STATE TRANSITIONS)
    // ========================================================================

    _think(game, modifiers) {
        const player = game.player;
        if (!player) return;

        // Run perception check
        const canSee = this._canSeeTarget(player, game);
        const dist = this._dist(player.gridX, player.gridY);

        if (canSee) {
            this.target = player;
            this.lastKnownTargetPos = { x: player.gridX, y: player.gridY };
        }

        // Handle commanded target
        if (this.commandedTarget && !this.target) {
            this.target = this.commandedTarget;
            this.lastKnownTargetPos = { x: this.commandedTarget.gridX, y: this.commandedTarget.gridY };
            this.commandedTarget = null;
        }

        // Calculate ranges and states
        const aggroRange = this.sightRange;
        const deaggroRange = aggroRange * 1.5;
        const atkRange = this._getEffectiveAttackRange();

        // State transitions
        this._checkStateTransitions(canSee, dist, aggroRange, deaggroRange, atkRange, modifiers, game);
    }

    _checkStateTransitions(canSee, dist, aggroRange, deaggroRange, atkRange, modifiers, game) {
        const S = AI_STATES;
        const state = this.currentState;

        switch (state) {
            case S.IDLE:
                if (canSee && dist <= aggroRange) {
                    this.alertSource = { x: this.target.gridX, y: this.target.gridY };
                    this._changeState(S.ALERT);
                } else if (this.followTarget && this.followTarget.hp > 0) {
                    this._changeState(S.FOLLOWING);
                }
                break;

            case S.ALERT:
                // Reaction delay timer
                if (canSee) {
                    this.reactionTimer += this.thinkInterval;
                    if (this.reactionTimer >= this.reactionDelay) {
                        this._changeState(S.COMBAT);
                    }
                } else if (this.stateTimer > 5000) {
                    this._changeState(S.IDLE);
                }
                break;

            case S.COMBAT:
                if (!this.target || this.target.hp <= 0) {
                    this._changeState(S.IDLE);
                } else if (this.enemy.behavior?.type === 'territorial' && !this._inTerritory()) {
                    this._changeState(S.IDLE);
                } else if (dist > deaggroRange * 1.5) {
                    // Only leave combat if player is very far away (50% beyond deaggro range)
                    // Don't use vision cone for combat - enemies in combat have 360° awareness
                    if (this.memoryDuration > 0 && this.lastKnownTargetPos) {
                        this._changeState(S.SEARCHING);
                    } else {
                        this._changeState(S.IDLE);
                    }
                }
                // Note: Removed vision cone check (!canSee) for combat state
                // Enemies actively in combat should maintain awareness of their target
                // regardless of facing direction (they're fighting, not patrolling)
                break;

            case S.SEARCHING:
                if (canSee) {
                    this._changeState(S.COMBAT);
                } else if (this.stateTimer > this.searchDuration) {
                    this._changeState(S.IDLE);
                }
                break;

            case S.FOLLOWING:
                if (canSee && dist <= aggroRange) {
                    this._changeState(S.COMBAT);
                } else if (!this.followTarget || this.followTarget.hp <= 0) {
                    this.followTarget = null;
                    this._changeState(S.IDLE);
                }
                break;
        }
    }

    // ========================================================================
    // STATE BEHAVIORS
    // ========================================================================

    _executeStateBehavior(dt, game, modifiers) {
        const S = AI_STATES;

        switch (this.currentState) {
            case S.IDLE:
                this._updateIdle(dt, game);
                break;
            case S.ALERT:
                this._updateAlert(dt, game);
                break;
            case S.COMBAT:
                this._updateCombat(dt, game, modifiers);
                break;
            case S.SEARCHING:
                this._updateSearching(dt, game);
                break;
            case S.FOLLOWING:
                this._updateFollowing(dt, game);
                break;
        }
    }

    // -------------------------------------------------------------------------
    // IDLE STATE
    // -------------------------------------------------------------------------
    _updateIdle(dt, game) {
        this.idleSubtimer += dt;

        // Territorial enemies: return to spawn if too far
        const distFromSpawn = this._dist(this.spawnPosition.x, this.spawnPosition.y);
        if (distFromSpawn > this.territorySize) {
            this._moveToward(this.spawnPosition.x, this.spawnPosition.y, game, 0.7);
            return;
        }

        // Handle wander pattern
        if (this.wanderPattern === 'stationary') return;

        // Alternate between standing and wandering
        if (this.idleSubtimer > this.idlePauseDuration) {
            this.idleSubtimer = 0;

            if (this.isWandering) {
                // Stop wandering, pause
                this.isWandering = false;
                this.idlePauseDuration = this.pauseDurationMin +
                    Math.random() * (this.pauseDurationMax - this.pauseDurationMin);
            } else if (Math.random() < (1 - this.pauseChance)) {
                // Start wandering
                this.isWandering = true;
                this.wanderTarget = this._getRandomNearbyTile(this.wanderRadius);
                this.idlePauseDuration = 2000 + Math.random() * 3000;
            }
        }

        // Execute wandering movement
        if (this.isWandering && this.wanderTarget) {
            if (this._dist(this.wanderTarget.x, this.wanderTarget.y) < 1) {
                this.wanderTarget = this._getRandomNearbyTile(this.wanderRadius);
            }
            if (this.wanderTarget) {
                this._moveToward(this.wanderTarget.x, this.wanderTarget.y, game, 0.5);
            }
        }
    }

    // -------------------------------------------------------------------------
    // ALERT STATE
    // -------------------------------------------------------------------------
    _updateAlert(dt, game) {
        const source = this.alertSource;
        if (!source) return;

        // Face the alert source
        this._face(source.x, source.y);

        // If close to source, look around
        if (this._dist(source.x, source.y) < 2) {
            // Sweep vision
            this.searchSweepTimer += dt;
            if (this.searchSweepTimer > 1500) {
                this.searchSweepTimer = 0;
                this._rotateFacing();
            }
        } else {
            // Move toward alert source cautiously
            this._moveToward(source.x, source.y, game, 0.6);
        }
    }

    // -------------------------------------------------------------------------
    // COMBAT STATE (unified: chase, melee, ranged, circling, flee)
    // -------------------------------------------------------------------------
    _updateCombat(dt, game, modifiers) {
        if (!this.target || this.target.hp <= 0) {
            this._changeState(AI_STATES.IDLE);
            return;
        }

        // During ability lockout: no movement or new attacks, but CAN still face target
        if (this.enemy.abilityLockout) {
            // Enemy is locked into ability animation — no movement,
            // no target switching, no new attacks
            // EXCEPTION: enemy can still face target and be knocked back by external forces

            // Still face the target during lockout (recovery) so vision cone stays valid
            if (this.target && this.target.gridX !== undefined) {
                this._face(this.target.gridX, this.target.gridY);
            }
            return;
        }

        // Check flee behavior (replaces DEFENSIVE state)
        if (this._shouldFlee(modifiers)) {
            this._executeFleeBehavior(dt, game, modifiers);
            return;
        }

        // Check sacrifice mechanic (Elites)
        if (this._shouldSacrifice()) {
            this._executeSacrificeBehavior(dt, game);
            return;
        }

        // Frustration check (stuck detection)
        if (this._checkFrustration(dt, game)) return;

        // Face target
        this._face(this.target.gridX, this.target.gridY);

        // Determine combat sub-behavior
        const dist = this._dist(this.target.gridX, this.target.gridY);
        const atkRange = this._getEffectiveAttackRange();
        const isRanged = this.optimalRange > 1.5;

        // Social system position override (swarm coordination)
        if (this.enemy.swarmId && this.targetPosition) {
            this._executeSwarmPosition(dt, game, atkRange);
            return;
        }

        // Combat behavior based on range
        if (dist <= atkRange && this.attackCooldown <= 0) {
            // In attack range - try to attack
            // console.log(`[EnemyAI] ${this.enemy.name} in range (${dist.toFixed(1)} <= ${atkRange}), cooldown: ${this.attackCooldown.toFixed(0)}, hasToken: ${this.hasAttackToken}`);
            if (this.hasAttackToken || this._requestAttackToken()) {
                // SIMPLIFIED: Attack directly without windup
                this._attackDirect(game);
            } else {
                // No token - use appropriate positioning while waiting
                if (isRanged) {
                    this._executeRangedPositioning(dt, game, modifiers);
                } else {
                    this._executeMeleePositioning(dt, game, modifiers);
                }
            }
        } else if (isRanged) {
            // Ranged enemies: always use positioning behavior to maintain preferred range
            // This handles closing distance when too far AND backing up when too close
            this._executeRangedPositioning(dt, game, modifiers);
        } else {
            // Melee: Use positioning behavior for stable approach
            this._executeMeleePositioning(dt, game, modifiers);
        }
    }

    _executeChase(dt, game, modifiers) {
        if (this.enemy.isMoving) return;

        const speedMult = this._getEffectiveSpeed(1.0, modifiers);
        this._moveToward(this.target.gridX, this.target.gridY, game, speedMult);
    }

    /**
     * Melee enemy positioning - stable approach and engagement
     * Uses angle-based positioning to avoid jitter and spread enemies around the target
     */
    _executeMeleePositioning(dt, game, modifiers) {
        if (!this.target) return;

        const dist = this._dist(this.target.gridX, this.target.gridY);
        const atkRange = this._getEffectiveAttackRange();

        // Engagement distance - AT attack range for proper spacing
        const engagementDistance = Math.max(1.0, atkRange);

        this._face(this.target.gridX, this.target.gridY);

        // Attack if within range and ready
        if (dist <= atkRange && this.attackCooldown <= 0) {
            if (this.hasAttackToken || this._requestAttackToken()) {
                this._attackDirect(game);
                return;
            }
        }

        if (this.enemy.isMoving) return;

        // RELENTLESS CHASE: If not in attack range, always chase directly
        // This eliminates circling behavior - enemies always close the distance
        if (dist > atkRange) {
            const speedMult = this._getEffectiveSpeed(1.0, modifiers);
            const wasMoving = this.enemy.isMoving;
            this._moveToward(this.target.gridX, this.target.gridY, game, speedMult);

            // If normal move failed, try forced move toward target
            if (!wasMoving && !this.enemy.isMoving) {
                this._moveTowardForced(this.target.gridX, this.target.gridY, game, speedMult);
            }
            return;
        }

        // IN ATTACK RANGE: Only now use angle-based positioning to spread out
        // This prevents enemies from stacking on top of each other
        if (this.circleAngle === null) {
            this.circleAngle = AIManager.assignCircleAngle(this.enemy);
        }

        const idealX = this.target.gridX + Math.cos(this.circleAngle) * engagementDistance;
        const idealY = this.target.gridY + Math.sin(this.circleAngle) * engagementDistance;
        const distToIdeal = this._distXY(this.enemy.gridX, this.enemy.gridY, idealX, idealY);

        if (distToIdeal > 0.4) {
            this._moveToward(idealX, idealY, game, 0.8);
        }

        // Request attack token while in range
        this.tokenRequestTimer += dt;
        if (this.tokenRequestTimer > 200) {
            this.tokenRequestTimer = 0;
            this._requestAttackToken();
        }
    }

    _executeCircling(dt, game) {
        if (!this.target) return;

        // Assign circle angle if not set
        if (this.circleAngle === null) {
            this.circleAngle = AIManager.assignCircleAngle(this.enemy);
        }

        // Stay within attack range (not outside it)
        const hoverDistance = Math.max(0.8, this._getEffectiveAttackRange() - 0.2);
        const targetX = this.target.gridX + Math.cos(this.circleAngle) * hoverDistance;
        const targetY = this.target.gridY + Math.sin(this.circleAngle) * hoverDistance;

        this._face(this.target.gridX, this.target.gridY);

        if (this._dist(targetX, targetY) > 0.5 && !this.enemy.isMoving) {
            this._moveToward(targetX, targetY, game, 0.8);
        }

        // Slowly orbit
        this.circleAngle += 0.001 * dt * this.strafeDirection;

        // Periodically try to get token (reduced from 500ms to 200ms for faster attacks)
        this.tokenRequestTimer += dt;
        if (this.tokenRequestTimer > 200) {
            this.tokenRequestTimer = 0;
            this._requestAttackToken();
        }
    }

    _executeSkirmish(dt, game, modifiers) {
        if (!this.target) return;

        const dist = this._dist(this.target.gridX, this.target.gridY);
        const atkRange = this._getEffectiveAttackRange();
        this._face(this.target.gridX, this.target.gridY);

        // Attack if in attack range and ready (use attackRange, not optimalRange)
        if (dist <= atkRange && this.attackCooldown <= 0) {
            if (this.hasAttackToken || this._requestAttackToken()) {
                this._attackDirect(game);
            }
        }

        if (this.enemy.isMoving) return;

        const tooClose = dist < this.optimalRange - this.rangeTolerance;
        const tooFar = dist > this.optimalRange + this.rangeTolerance;

        if (tooClose) {
            // Back up
            this._moveAwayFrom(this.target.gridX, this.target.gridY, game, 0.9);
        } else if (tooFar) {
            // Close distance
            this._moveToward(this.target.gridX, this.target.gridY, game, 0.9);
        } else {
            // In sweet spot - strafe
            this.strafeTimer += dt;
            if (this.strafeTimer > 500 && Math.random() < 0.2) {
                this.strafeTimer = 0;
                this.strafeDirection *= -1;
            }
            this._strafe(this.target.gridX, this.target.gridY, game);
        }
    }

    /**
     * Ranged enemy positioning - maintains preferred attack range
     * Unlike melee chase, ranged enemies stop at their optimal range instead of closing to melee
     */
    _executeRangedPositioning(dt, game, modifiers) {
        if (!this.target) return;

        const dist = this._dist(this.target.gridX, this.target.gridY);
        const atkRange = this._getEffectiveAttackRange();

        this._face(this.target.gridX, this.target.gridY);

        // Attack if within attack range and ready
        if (dist <= atkRange && this.attackCooldown <= 0) {
            if (this.hasAttackToken || this._requestAttackToken()) {
                this._attackDirect(game);
                return;
            }
        }

        if (this.enemy.isMoving) return;

        // RELENTLESS PURSUIT: If beyond attack range, always chase directly
        // This eliminates passive ranged behavior - ranged enemies actively close distance
        if (dist > atkRange) {
            const speedMult = this._getEffectiveSpeed(0.9, modifiers);
            const wasMoving = this.enemy.isMoving;
            this._moveToward(this.target.gridX, this.target.gridY, game, speedMult);

            // If normal move failed, try forced move toward target
            if (!wasMoving && !this.enemy.isMoving) {
                this._moveTowardForced(this.target.gridX, this.target.gridY, game, speedMult);
            }
            return;
        }

        // IN ATTACK RANGE: Only kite if configured and player is too close
        const tooClose = dist < this.optimalRange - this.rangeTolerance;
        if (tooClose && this.canKite) {
            this._moveAwayFrom(this.target.gridX, this.target.gridY, game, 0.9);
        }
        // Otherwise, stand ground and attack when ready
    }

    _executeSwarmPosition(dt, game, atkRange) {
        const distToPos = this._distXY(this.enemy.gridX, this.enemy.gridY,
            this.targetPosition.x, this.targetPosition.y);

        if (distToPos > 0.5 && !this.enemy.isMoving) {
            this._moveToward(this.targetPosition.x, this.targetPosition.y, game, 1.0);
        }

        this._face(this.target.gridX, this.target.gridY);

        // Attack if in range
        if (this._dist(this.target.gridX, this.target.gridY) <= atkRange && this.attackCooldown <= 0) {
            if (this.hasAttackToken || this._requestAttackToken()) {
                this._attackDirect(game);
            }
        }
    }

    // -------------------------------------------------------------------------
    // FLEE BEHAVIOR (inside COMBAT, replaces DEFENSIVE state)
    // -------------------------------------------------------------------------
    _shouldFlee(modifiers) {
        if (modifiers.enraged) return false;
        if (!this.enemy.behavior?.fleesBehavior) return false;

        const hpPct = this.enemy.hp / this.enemy.maxHp;
        const threshold = this._getEffectiveFleeThreshold(modifiers);

        return hpPct <= threshold;
    }

    _executeFleeBehavior(dt, game, modifiers) {
        const player = game.player;
        if (!player) return;

        this._face(player.gridX, player.gridY);

        // Periodically search for ally to retreat toward
        if (!this.retreatAlly || this.retreatAlly.hp <= 0 || this.stateTimer % 2000 < 50) {
            this.retreatAlly = this._findRetreatAlly(game);
        }

        if (this.retreatAlly) {
            // Retreat toward higher-tier ally
            const dx = this.retreatAlly.gridX - player.gridX;
            const dy = this.retreatAlly.gridY - player.gridY;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetX = this.retreatAlly.gridX + (dx / len) * 1.5;
            const targetY = this.retreatAlly.gridY + (dy / len) * 1.5;

            if (this._dist(targetX, targetY) > 0.5 && !this.enemy.isMoving) {
                this._moveToward(targetX, targetY, game, 0.9);
            }
        } else {
            // No ally - fight defensively (attack if in range)
            const atkRange = this._getEffectiveAttackRange();
            if (this._dist(player.gridX, player.gridY) <= atkRange && this.attackCooldown <= 0) {
                if (this.hasAttackToken || this._requestAttackToken()) {
                    this._attackDirect(game);
                }
            }
        }
    }

    _findRetreatAlly(game) {
        if (this.retreatHierarchy.length === 0) return null;

        let bestAlly = null, bestScore = -Infinity;

        for (const other of game.enemies) {
            if (other === this.enemy || other.hp <= 0) continue;

            const allyTier = other.tier || 'TIER_2';
            if (!this.retreatHierarchy.includes(allyTier)) continue;

            const dist = this._dist(other.gridX, other.gridY);
            if (dist > 6) continue;

            const allyHpPct = other.hp / other.maxHp;
            if (allyHpPct < 0.5) continue;

            const tierOrder = { 'TIER_3': 0, 'TIER_2': 1, 'TIER_1': 2, 'ELITE': 3, 'BOSS': 4 };
            const tierBonus = (tierOrder[allyTier] || 0) * 5;

            const score = allyHpPct * 10 - dist + tierBonus;
            if (score > bestScore) {
                bestScore = score;
                bestAlly = other;
            }
        }

        return bestAlly;
    }

    // -------------------------------------------------------------------------
    // SACRIFICE BEHAVIOR (inside COMBAT)
    // -------------------------------------------------------------------------
    _shouldSacrifice() {
        if (!this.canSacrificeMinions || this.hasSacrificeBuff) return false;

        const hpPct = this.enemy.hp / this.enemy.maxHp;
        if (hpPct > this.sacrificeThreshold) return false;

        const victim = this._findSacrificialVictim();
        if (victim) {
            this.sacrificeTarget = victim;
            return true;
        }

        return false;
    }

    _executeSacrificeBehavior(dt, game) {
        if (!this.sacrificeTarget || this.sacrificeTarget.hp <= 0) {
            this.sacrificeTarget = null;
            return;
        }

        const victim = this.sacrificeTarget;
        const dist = this._dist(victim.gridX, victim.gridY);

        // Move toward victim if not close enough
        if (dist > 1.5) {
            this._moveToward(victim.gridX, victim.gridY, game, 1.2);
            return;
        }

        // Close enough - consume the minion
        this._face(victim.gridX, victim.gridY);

        // Kill the victim
        victim.hp = 0;
        if (typeof handleDeath === 'function') {
            handleDeath(victim, this.enemy);
        }

        // Visual feedback
        if (typeof showStatusText === 'function') {
            showStatusText(victim, 'CONSUMED!', '#8B0000');
            showStatusText(this.enemy, 'HEALED!', '#00FF00');
        }

        // Heal the Elite
        const healAmount = Math.floor(this.enemy.maxHp * this.sacrificeHeal);
        this.enemy.hp = Math.min(this.enemy.maxHp, this.enemy.hp + healAmount);

        // Apply damage buff
        this.hasSacrificeBuff = true;
        this.enemy.sacrificeDamageMult = 1.0 + this.sacrificeDamageBuff;

        this.sacrificeTarget = null;
    }

    _findSacrificialVictim() {
        if (!AIManager.game?.enemies) return null;
        let best = null, bestDist = Infinity;

        for (const other of AIManager.game.enemies) {
            if (other === this.enemy || other.hp <= 0) continue;

            const tierConfig = other.tierConfig || MONSTER_TIERS?.[other.tier];
            const isSacrificial = tierConfig?.social?.isSacrificial || false;

            if (!isSacrificial) continue;

            const dist = this._dist(other.gridX, other.gridY);
            if (dist < bestDist && dist <= 3) {
                bestDist = dist;
                best = other;
            }
        }

        return best;
    }

    // -------------------------------------------------------------------------
    // SEARCHING STATE
    // -------------------------------------------------------------------------
    _updateSearching(dt, game) {
        // Tier-specific search patterns
        if (this.searchBehavior === 'none') {
            this._changeState(AI_STATES.IDLE);
            return;
        }

        if (!this.lastKnownTargetPos) {
            this._changeState(AI_STATES.IDLE);
            return;
        }

        // Aggressive (Elite): Command minions to search
        if (this.searchBehavior === 'aggressive' && !this.stateData.commandedSearch) {
            this.stateData.commandedSearch = true;
            this._commandMinionSearch(game);
        }

        // Tactical (Tier 1): Visual feedback
        if (this.searchBehavior === 'tactical' && !this.stateData.threwProjectile) {
            this.stateData.threwProjectile = true;
            if (typeof showStatusText === 'function') {
                showStatusText(this.enemy, 'Checking...', '#FFAA00');
            }
        }

        // Move to last known position
        if (this._dist(this.lastKnownTargetPos.x, this.lastKnownTargetPos.y) < 1) {
            // Arrived - sweep search
            this.searchSweepTimer += dt;
            if (this.searchSweepTimer > 1200) {
                this.searchSweepTimer = 0;
                this._rotateFacing();
            }
        } else {
            this._moveToward(this.lastKnownTargetPos.x, this.lastKnownTargetPos.y, game, 0.8);
        }
    }

    _commandMinionSearch(game) {
        for (const other of game.enemies) {
            if (other === this.enemy || other.hp <= 0) continue;
            if (this._dist(other.gridX, other.gridY) > this.commandRange) continue;

            const tierConfig = other.tierConfig || MONSTER_TIERS?.[other.tier];
            const isTier3 = tierConfig?.social?.isSacrificial || false;

            if (isTier3 && other.ai) {
                other.ai.lastKnownTargetPos = { ...this.lastKnownTargetPos };
                other.ai._changeState(AI_STATES.SEARCHING);
                if (typeof showStatusText === 'function') {
                    showStatusText(other, 'Yes sir!', '#FFFF00');
                }
            }
        }
    }

    // -------------------------------------------------------------------------
    // FOLLOWING STATE
    // -------------------------------------------------------------------------
    _updateFollowing(dt, game) {
        if (!this.followTarget || this.followTarget.hp <= 0) {
            this.followTarget = null;
            this._changeState(AI_STATES.IDLE);
            return;
        }

        const dist = this._dist(this.followTarget.gridX, this.followTarget.gridY);

        if (dist > 4) {
            // Too far - catch up
            this._moveToward(this.followTarget.gridX, this.followTarget.gridY, game, 1.0);
        } else if (dist < 1.5) {
            // Too close - back off
            this._moveAwayFrom(this.followTarget.gridX, this.followTarget.gridY, game, 0.3);
        } else {
            // Good distance - face same direction as leader
            this.enemy.facing = this.followTarget.facing || this.enemy.facing;
        }

        // If leader has target, we should too
        if (this.followTarget.ai?.target) {
            this.target = this.followTarget.ai.target;
            this.lastKnownTargetPos = { x: this.target.gridX, y: this.target.gridY };
            this._changeState(AI_STATES.COMBAT);
        }
    }

    // ========================================================================
    // WINDUP SUBSTEP (inside COMBAT, not a separate state)
    // ========================================================================

    _startWindup() {
        this.windupActive = true;
        this.windupTimer = 0;

        // Lock in target position
        this.windupTargetPos = {
            x: this.target.gridX,
            y: this.target.gridY
        };

        // Visual telegraph
        this.enemy.isWindingUp = true;
        this.enemy.windupProgress = 0;
        this.enemy.telegraphColor = this.telegraphColor;
    }

    _processWindup(dt, game) {
        if (!this.target) {
            this._clearWindup();
            return;
        }

        this.windupTimer += dt;

        // Update visual progress
        this.enemy.windupProgress = Math.min(1, this.windupTimer / this.windupDuration);

        // Heavy enemies: track target during windup (except final moments)
        if (this.tracksDuringWindup) {
            const timeRemaining = this.windupDuration - this.windupTimer;
            if (timeRemaining > this.trackingCutoff) {
                this.windupTargetPos = { x: this.target.gridX, y: this.target.gridY };
                this._face(this.target.gridX, this.target.gridY);
            }
        }

        // Windup complete - execute attack
        if (this.windupTimer >= this.windupDuration) {
            this._executeAttack(game);
            this._clearWindup();
        }
    }

    _executeAttack(game) {
        // Check if target dodged (vision cone check)
        if (!this._inVisionCone(this.target.gridX, this.target.gridY)) {
            if (typeof showDamageNumber === 'function') {
                showDamageNumber(this.target, 'DODGED', '#00FF00');
            }
        } else {
            this._attack(game);
        }

        this.attackCooldown = this.attackCooldownBase;
        this._releaseAttackToken();
    }

    _clearWindup() {
        this.windupActive = false;
        this.windupTimer = 0;
        this.enemy.isWindingUp = false;
        this.enemy.windupProgress = 0;
        this.enemy.telegraphColor = null;
    }

    canInterruptWindup() {
        return this.canInterruptAttack !== false;
    }

    interruptWindup() {
        if (this.windupActive && this.canInterruptWindup()) {
            this._clearWindup();
            this._releaseAttackToken();
            return true;
        }
        return false;
    }

    // ========================================================================
    // ATTACK TOKEN SYSTEM
    // ========================================================================

    _requestAttackToken() {
        this.hasAttackToken = AIManager.requestAttackToken(this.enemy);
        return this.hasAttackToken;
    }

    _releaseAttackToken() {
        AIManager.releaseAttackToken(this.enemy);
        this.hasAttackToken = false;
        this.circleAngle = null;
    }

    // ========================================================================
    // FRUSTRATION SYSTEM
    // ========================================================================

    _checkFrustration(dt, game) {
        this.stuckCheckTimer += dt;
        if (this.stuckCheckTimer < 500) return false;

        this.stuckCheckTimer = 0;

        // Don't count as stuck during ability lockout (enemy is attacking/recovering, not stuck)
        if (this.enemy.abilityLockout || this.enemy.inRecovery) {
            this.lastPosition = { x: this.enemy.gridX, y: this.enemy.gridY };
            return false;
        }

        const moved = Math.abs(this.enemy.gridX - this.lastPosition.x) > 0.1 ||
                      Math.abs(this.enemy.gridY - this.lastPosition.y) > 0.1;

        if (!moved && !this.enemy.isMoving) {
            this.frustrationCounter++;
            return this._handleFrustration(game);
        } else {
            this.frustrationCounter = Math.max(0, this.frustrationCounter - 1);
        }

        this.lastPosition = { x: this.enemy.gridX, y: this.enemy.gridY };
        return false;
    }

    _handleFrustration(game) {
        // Tier 3 (fodder): Give up after threshold
        if (this.isSacrificial && this.frustrationCounter >= this.frustrationThreshold) {
            this.frustrationCounter = 0;
            this.target = null;
            this.lastKnownTargetPos = null;
            if (typeof showStatusText === 'function') {
                showStatusText(this.enemy, '...', '#888888');
            }
            this._changeState(AI_STATES.IDLE);
            return true;
        }

        // Tier 2+: Try flanking
        if (this.frustrationBehavior === 'flank' &&
            this.frustrationCounter >= this.frustrationThreshold &&
            this.frustrationCounter < this.frustrationThreshold * 2) {
            const player = game.player;
            if (player) {
                const angle = Math.random() * Math.PI * 2;
                // Stay within attack range when flanking, not way outside
                const flankDist = Math.max(0.8, this._getEffectiveAttackRange() - 0.2);
                const flankX = player.gridX + Math.cos(angle) * flankDist;
                const flankY = player.gridY + Math.sin(angle) * flankDist;

                if (!this.enemy.isMoving) {
                    this._moveToward(flankX, flankY, game, 0.9);
                }
            }
            return false;
        }

        // After double threshold: enter SEARCHING
        if (this.frustrationCounter >= this.frustrationThreshold * 2) {
            this.frustrationCounter = 0;
            if (this.target) {
                this.lastKnownTargetPos = { x: this.target.gridX, y: this.target.gridY };
            }
            if (typeof showStatusText === 'function') {
                showStatusText(this.enemy, 'Where...?', '#FFAA00');
            }
            this._changeState(AI_STATES.SEARCHING);
            return true;
        }

        return false;
    }

    // ========================================================================
    // MOVEMENT
    // ========================================================================

    _moveToward(tx, ty, game, speedMult = 1.0) {
        if (this.enemy.isMoving) return;
        const dx = tx - this.enemy.gridX, dy = ty - this.enemy.gridY;
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;

        let mx = dx > 0.1 ? 1 : dx < -0.1 ? -1 : 0;
        let my = dy > 0.1 ? 1 : dy < -0.1 ? -1 : 0;

        this._face(this.enemy.gridX + mx, this.enemy.gridY + my);
        const nx = this.enemy.gridX + mx, ny = this.enemy.gridY + my;

        if (this._shouldAvoidHazard(nx, ny, game) || !this._canMove(nx, ny, mx, my, game)) {
            this._tryAltMove(tx, ty, game, speedMult);
        } else {
            this._startMove(nx, ny, speedMult);
        }
    }

    _moveAwayFrom(tx, ty, game, speedMult = 1.0) {
        if (this.enemy.isMoving) return;
        const dx = this.enemy.gridX - tx, dy = this.enemy.gridY - ty;

        let mx = dx > 0.1 ? 1 : dx < -0.1 ? -1 : 0;
        let my = dy > 0.1 ? 1 : dy < -0.1 ? -1 : 0;

        const nx = this.enemy.gridX + mx, ny = this.enemy.gridY + my;
        if (this._canMove(nx, ny, mx, my, game)) {
            this._face(nx, ny);
            this._startMove(nx, ny, speedMult);
        }
    }

    _strafe(tx, ty, game) {
        if (this.enemy.isMoving) return;
        const dx = tx - this.enemy.gridX, dy = ty - this.enemy.gridY;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;

        const strafeX = this.strafeDirection > 0 ? -dy / len : dy / len;
        const strafeY = this.strafeDirection > 0 ? dx / len : -dx / len;

        this._moveToward(this.enemy.gridX + strafeX, this.enemy.gridY + strafeY, game, 0.7);
    }

    _startMove(nx, ny, speedMult) {
        this.enemy.targetGridX = nx;
        this.enemy.targetGridY = ny;
        this.enemy.isMoving = true;
        this.enemy.moveProgress = 0;
        this.enemy.moveSpeedMult = speedMult;
    }

    _tryAltMove(tx, ty, game, speedMult) {
        const dirs = [
            {x:0,y:-1}, {x:1,y:0}, {x:0,y:1}, {x:-1,y:0},
            {x:1,y:-1}, {x:1,y:1}, {x:-1,y:1}, {x:-1,y:-1}
        ];

        // Shuffle
        for (let i = 7; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }

        const curDist = this._dist(tx, ty);
        for (const d of dirs) {
            const nx = this.enemy.gridX + d.x, ny = this.enemy.gridY + d.y;
            if (this._shouldAvoidHazard(nx, ny, game) || !this._canMove(nx, ny, d.x, d.y, game)) continue;
            if (this._distXY(nx, ny, tx, ty) < curDist) {
                this._face(nx, ny);
                this._startMove(nx, ny, speedMult);
                return;
            }
        }
    }

    /**
     * Forced movement toward target - tries ANY direction that gets closer
     * Used as fallback when normal movement fails to ensure relentless pursuit
     */
    _moveTowardForced(tx, ty, game, speedMult = 1.0) {
        if (this.enemy.isMoving) return;

        const dirs = [
            {x:0,y:-1}, {x:1,y:0}, {x:0,y:1}, {x:-1,y:0},
            {x:1,y:-1}, {x:1,y:1}, {x:-1,y:1}, {x:-1,y:-1}
        ];

        const curDist = this._dist(tx, ty);
        let bestDir = null;
        let bestDist = curDist;

        // Find ANY direction that gets us closer to target
        for (const d of dirs) {
            const nx = this.enemy.gridX + d.x;
            const ny = this.enemy.gridY + d.y;

            if (!this._canMove(nx, ny, d.x, d.y, game)) continue;
            if (this._shouldAvoidHazard(nx, ny, game)) continue;

            const newDist = this._distXY(nx, ny, tx, ty);
            if (newDist < bestDist) {
                bestDist = newDist;
                bestDir = d;
            }
        }

        if (bestDir) {
            const nx = this.enemy.gridX + bestDir.x;
            const ny = this.enemy.gridY + bestDir.y;
            this._face(nx, ny);
            this._startMove(nx, ny, speedMult);
        }
    }

    _face(x, y) {
        const dx = x - this.enemy.gridX, dy = y - this.enemy.gridY;
        if (Math.abs(dx) > 0.1 && Math.abs(dy) > 0.1) {
            this.enemy.facing = dx > 0 ? 'right' : 'left';
        } else if (Math.abs(dx) > Math.abs(dy)) {
            this.enemy.facing = dx > 0 ? 'right' : 'left';
        } else if (Math.abs(dy) > 0.1) {
            this.enemy.facing = dy > 0 ? 'down' : 'up';
        }
    }

    _rotateFacing() {
        const dirs = ['up', 'right', 'down', 'left'];
        const i = dirs.indexOf(this.enemy.facing);
        this.enemy.facing = dirs[(i + 1) % 4];
    }

    _shouldAvoidHazard(x, y, game) {
        const tile = game.map?.[y]?.[x];
        return tile?.hazard && typeof HazardSystem !== 'undefined' && HazardSystem.shouldAvoid(this.enemy, tile.hazard);
    }

    _canMove(x, y, mx, my, game) {
        const tile = game.map?.[y]?.[x];
        if (!tile || tile.type === 'wall' || tile.type === 'void' || tile.type === 'interior_wall') return false;
        if (typeof hasBlockingDecorationAt === 'function' && hasBlockingDecorationAt(x, y)) return false;

        // Diagonal corner-cutting check
        if (mx !== 0 && my !== 0) {
            const hTile = game.map?.[this.enemy.gridY]?.[this.enemy.gridX + mx];
            const vTile = game.map?.[this.enemy.gridY + my]?.[this.enemy.gridX];
            if (!hTile || hTile.type === 'wall' || hTile.type === 'void' || hTile.type === 'interior_wall') return false;
            if (!vTile || vTile.type === 'wall' || vTile.type === 'void' || vTile.type === 'interior_wall') return false;
            if (typeof hasBlockingDecorationAt === 'function') {
                if (hasBlockingDecorationAt(this.enemy.gridX + mx, this.enemy.gridY)) return false;
                if (hasBlockingDecorationAt(this.enemy.gridX, this.enemy.gridY + my)) return false;
            }
        }

        // Entity collision checks
        const ex = this.enemy.gridX, ey = this.enemy.gridY;
        for (const o of game.enemies) {
            if (o === this.enemy) continue;
            const ox = Math.floor(o.gridX), oy = Math.floor(o.gridY);
            if (ox === x && oy === y) return false;
            if (typeof MonsterSocialSystem !== 'undefined' &&
                MonsterSocialSystem.shouldAvoid(this.enemy, o) &&
                this._distXY(o.gridX, o.gridY, x, y) < 2) return false;
            if (mx !== 0 && my !== 0) {
                if ((ox === ex + mx && oy === ey) || (ox === ex && oy === ey + my)) return false;
            }
        }

        const p = game.player;
        if (p) {
            if (p.gridX === x && p.gridY === y) return false;
            if (mx !== 0 && my !== 0) {
                if ((p.gridX === ex + mx && p.gridY === ey) || (p.gridX === ex && p.gridY === ey + my)) return false;
            }
        }

        return true;
    }

    _getRandomNearbyTile(radius = 3) {
        const game = AIManager.game;
        if (!game) return null;

        for (let i = 0; i < 10; i++) {
            const x = this.spawnPosition.x + Math.floor(Math.random() * (radius * 2 + 1)) - radius;
            const y = this.spawnPosition.y + Math.floor(Math.random() * (radius * 2 + 1)) - radius;
            if (game.map?.[y]?.[x]?.type === 'floor') return { x, y };
        }
        return null;
    }

    // ========================================================================
    // VISION
    // ========================================================================

    _canSeeTarget(target, game) {
        const d = this._dist(target.gridX, target.gridY);
        let range = this.sightRange;

        // Torch stealth
        if (target === game.player) {
            const playerTorchOn = game.player.isTorchOn !== false;
            const playerInLightSource = typeof LightSourceSystem !== 'undefined' &&
                LightSourceSystem.isNearLightSource(game.player.gridX, game.player.gridY);

            if (!playerTorchOn && !playerInLightSource && !this.canSeeInDark) {
                range *= 0.25;
            }
        }

        if (d > range) return false;
        if (!this._inVisionCone(target.gridX, target.gridY)) return false;
        return this._hasLOS(target.gridX, target.gridY, game);
    }

    _inVisionCone(tx, ty) {
        const dx = tx - this.enemy.gridX, dy = ty - this.enemy.gridY;
        const angleToTarget = Math.atan2(dy, dx) * (180 / Math.PI);
        const facingAngles = { right: 0, down: 90, left: 180, up: -90 };
        let diff = Math.abs(angleToTarget - (facingAngles[this.enemy.facing] || 0));
        if (diff > 180) diff = 360 - diff;
        return diff <= 60;
    }

    _hasLOS(tx, ty, game) {
        const dx = tx - this.enemy.gridX, dy = ty - this.enemy.gridY;
        const steps = Math.max(Math.abs(dx), Math.abs(dy));
        if (steps === 0) return true;
        const xs = dx / steps, ys = dy / steps;

        for (let i = 1; i < steps; i++) {
            const cx = Math.floor(this.enemy.gridX + xs * i);
            const cy = Math.floor(this.enemy.gridY + ys * i);
            const tile = game.map?.[cy]?.[cx];
            if (!tile || tile.type === 'wall' || tile.type === 'void' || tile.type === 'interior_wall') return false;
            if (typeof hasVisionBlockingDecorationAt === 'function' && hasVisionBlockingDecorationAt(cx, cy)) return false;
        }
        return true;
    }

    // ========================================================================
    // COMBAT
    // ========================================================================

    /**
     * SIMPLIFIED ATTACK: Attack immediately without windup
     * Now integrates with the signature ability system for mapped monsters.
     * Falls back to basic attack with telegraph for unmapped monsters.
     */
    _attackDirect(game) {
        // DIAGNOSTIC: Log every attack attempt
        // console.log(`[EnemyAI] _attackDirect called for ${this.enemy.name}`);

        if (!this.target) {
            // console.log(`[EnemyAI] _attackDirect: No target, releasing token`);
            this._releaseAttackToken();
            return;
        }

        // If ability system has control, release token and wait
        if (this.enemy.abilityLockout) {
            // console.log(`[EnemyAI] _attackDirect: ${this.enemy.name} is locked out by ability system`);
            this._releaseAttackToken();
            return;
        }

        this._face(this.target.gridX, this.target.gridY);

        // PRIMARY: Use signature ability
        // console.log(`[EnemyAI] Checking EnemyAbilitySystem: ${typeof EnemyAbilitySystem !== 'undefined'}`);
        if (typeof EnemyAbilitySystem !== 'undefined') {
            const usedAbility = EnemyAbilitySystem.tryUseAbility(this.enemy, this.target);
            // console.log(`[EnemyAI] tryUseAbility returned: ${usedAbility ? usedAbility.name : 'null'}`);
            if (usedAbility) {
                this._releaseAttackToken();
                this.enemy.lastAttackTime = Date.now();
                // BUGFIX: Set attack cooldown to prevent immediate re-attack
                // Use the ability's cooldown or a minimum of 2000ms
                this.attackCooldown = usedAbility.cooldown || 2000;
                return;
            }
        }

        // FALLBACK: Basic attack with forced telegraph (unmapped monsters only)
        // BUGFIX: Don't fall through if enemy has a signature ability (just on cooldown)
        const abilitySet = typeof EnemyAbilitySystem !== 'undefined'
            ? EnemyAbilitySystem.enemyAbilities?.get(this.enemy.id)
            : null;
        if (abilitySet?.signatureAbility) {
            // Enemy has a signature ability but it's on cooldown - release token and wait
            // CRITICAL FIX: Set a short cooldown so we don't busy-wait trying every frame
            // Check remaining cooldown on the ability and use that, or default to 500ms
            const ability = abilitySet.signatureAbility;
            const remainingCooldown = abilitySet.cooldowns[ability.id] || 0;
            const globalCooldown = abilitySet.globalCooldown || 0;
            // Wait for whichever cooldown is blocking us, minimum 200ms to prevent spam
            this.attackCooldown = Math.max(200, Math.min(remainingCooldown, globalCooldown || remainingCooldown));
            this._releaseAttackToken();
            return;
        }
        console.error(`[FALLBACK ATTACK] ${this.enemy.name} — missing ability mapping`);
        this._performBasicAttackWithTelegraph(game);
    }

    /**
     * Fallback attack method for monsters without ability mappings.
     * Performs a basic attack with visual telegraph effect.
     */
    _performBasicAttackWithTelegraph(game) {
        if (!this.target) {
            this._releaseAttackToken();
            return;
        }

        // Face the target
        this._face(this.target.gridX, this.target.gridY);

        // Perform the attack
        this._attack(game);

        // Create visual attack effect (monster slash/claw)
        if (typeof createMonsterAttackEffect === 'function') {
            createMonsterAttackEffect(this.enemy, this.target);
        }

        // Set attack cooldown - use a reasonable minimum to prevent spam attacks
        // BUGFIX: attackCooldownBase could be very low (600ms), ensure at least 1500ms between attacks
        this.attackCooldown = Math.max(1500, this.attackCooldownBase);

        // Release attack token
        this._releaseAttackToken();

        // Track last attack time for animation system
        this.enemy.lastAttackTime = Date.now();
    }

    _attack(game) {
        if (!this.target) return;
        // Use consistent attack range via helper method
        const range = this._getEffectiveAttackRange();
        if (this._dist(this.target.gridX, this.target.gridY) > range) return;

        // NOTE: Special attacks are now handled by EnemyAbilitySystem via _attackDirect()
        // The old special attack chance has been removed in favor of the new signature ability system

        const room = this._getCurrentRoom(game);
        const result = DamageCalculator.calculateDamage(this.enemy, this.target, room);

        if (!result.isHit) {
            if (typeof showDamageNumber === 'function') showDamageNumber(this.target, 0, '#888888');
            return;
        }

        applyDamage(this.target, result.finalDamage, this.enemy);
        if (typeof NoiseSystem !== 'undefined') NoiseSystem.makeNoise(this.enemy, 50);

        if (typeof showDamageNumber === 'function') {
            showDamageNumber(this.target, result.finalDamage, result.isCrit ? '#ffff00' : '#ff4444');
        }

        if (!this.enemy.combat?.isInCombat && typeof engageCombat === 'function') {
            engageCombat(this.enemy, this.target);
        }

        if (this.target.hp <= 0 && typeof handleDeath === 'function') {
            handleDeath(this.target, this.enemy);
        }
    }

    // DEPRECATED: Special attacks are now handled by the EnemyAbilitySystem
    // This method is kept for backwards compatibility with legacy monster definitions
    // that may still reference it, but new monsters should use signature abilities.
    /*
    _specialAttack(game) {
        const s = this.enemy.special;
        if (!s || s.deathExplosion) return;

        if (s.radius) {
            const ex = this.enemy.gridX, ey = this.enemy.gridY;
            if (game.player && this._distXY(game.player.gridX, game.player.gridY, ex, ey) <= s.radius) {
                applyDamage(game.player, s.damage || 10, this.enemy);
                if (s.element && typeof getElementStatusEffect === 'function') {
                    const status = getElementStatusEffect(s.element);
                    if (status && typeof StatusEffectSystem !== 'undefined') {
                        StatusEffectSystem.applyEffect(game.player, status, this.enemy);
                    }
                }
            }
        }
        this.specialCooldown = 5000;
    }
    */

    _getCurrentRoom(game) {
        if (typeof RoomUtils !== 'undefined') {
            return RoomUtils.getCurrentRoom(this.enemy, game);
        }
        if (!game.rooms) return null;
        for (const r of game.rooms) {
            if (this.enemy.gridX >= r.floorX && this.enemy.gridX < r.floorX + r.floorWidth &&
                this.enemy.gridY >= r.floorY && this.enemy.gridY < r.floorY + r.floorHeight) return r;
        }
        return null;
    }

    // ========================================================================
    // COMMUNICATION
    // ========================================================================

    onAllyShout(shouter, target) {
        if (this.currentState === AI_STATES.COMBAT) return;
        this.target = target;
        this.lastKnownTargetPos = target ? { x: target.gridX, y: target.gridY } : null;
        this.alertSource = this.lastKnownTargetPos;
        this._changeState(AI_STATES.ALERT);
    }

    onNoiseHeard(data) {
        if (this.currentState === AI_STATES.COMBAT) return;
        this.alertSource = { x: data.sourceX, y: data.sourceY };
        this._changeState(AI_STATES.ALERT);
    }

    /**
     * Force immediate combat entry - bypasses ALERT reaction delay.
     * Called when enemy takes damage from player.
     */
    forceEnterCombat(attacker) {
        // Skip if already in combat
        if (this.currentState === AI_STATES.COMBAT) return;

        // Set target to attacker
        if (attacker) {
            this.target = attacker;
            this.lastKnownTargetPos = { x: attacker.gridX, y: attacker.gridY };
        }

        // Immediately enter combat - no reaction delay
        this._changeState(AI_STATES.COMBAT);

        // Reset attack cooldown to allow quick response
        this.attackCooldown = Math.min(this.attackCooldown, 200);
    }

    // ========================================================================
    // UTILITY
    // ========================================================================

    _changeState(newState) {
        if (newState === this.currentState) return;

        // Release attack token when leaving combat
        if (this.currentState === AI_STATES.COMBAT) {
            this._releaseAttackToken();
            this._clearWindup();
        }

        this.previousState = this.currentState;
        this.currentState = newState;
        this.stateTimer = 0;
        this.stateData = {};
        this.frustrationCounter = 0;
        this.stuckCheckTimer = 0;

        // State-specific initialization
        if (newState === AI_STATES.ALERT) {
            this.reactionTimer = 0;
            this.searchSweepTimer = 0;
        }
        if (newState === AI_STATES.SEARCHING) {
            this.searchSweepTimer = 0;
        }
        if (newState === AI_STATES.IDLE) {
            this.retreatAlly = null;
            this.isWandering = false;
            this.idleSubtimer = 0;
        }
        // === ENEMY ABILITY SYSTEM: Combat start hook (ambusher, pack_hunter, call_for_help) ===
        if (newState === AI_STATES.COMBAT && this.previousState !== AI_STATES.COMBAT) {
            if (typeof EnemyAbilitySystem !== 'undefined') {
                EnemyAbilitySystem.onEnemyCombatStart(this.enemy, this.target);
            }
        }
    }

    _inTerritory() {
        return this._dist(this.spawnPosition.x, this.spawnPosition.y) <= this.territorySize;
    }

    _countNearbyAllies(range) {
        if (!AIManager.game?.enemies) return 0;
        let count = 0;
        for (const other of AIManager.game.enemies) {
            if (other === this.enemy || other.hp <= 0) continue;
            if (this._dist(other.gridX, other.gridY) <= range) count++;
        }
        return count;
    }

    _dist(x, y) {
        return Math.sqrt((x - this.enemy.gridX) ** 2 + (y - this.enemy.gridY) ** 2);
    }

    _distXY(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
    }

    setDebugLog(enabled) { this.debugLog = enabled; }
}

// ============================================================
// ENCIRCLEMENT WARNING SYSTEM
// ============================================================

const EncirclementSystem = {
    STATES: {
        CLEAR: 'clear',
        FLANKED: 'flanked',
        SURROUNDED: 'surrounded'
    },

    currentState: 'clear',
    lastState: 'clear',
    checkInterval: 250,
    checkTimer: 0,
    threatRange: 6,
    minFlankEnemies: 2,
    minQuadrants: 3,

    checkEncirclement(player, enemies) {
        if (!player || !enemies || enemies.length === 0) {
            return this._updateState(this.STATES.CLEAR, 0, []);
        }

        const px = player.gridX ?? player.x;
        const py = player.gridY ?? player.y;
        const facing = player.facing || 'down';

        const facingAngles = { right: 0, down: 90, left: 180, up: 270 };
        const playerFacingAngle = facingAngles[facing] ?? 0;

        const quadrants = { front: 0, right: 0, back: 0, left: 0 };
        let rearArcCount = 0;
        let threatCount = 0;
        const flankingEnemies = [];

        for (const enemy of enemies) {
            if (enemy.hp <= 0) continue;

            const ex = enemy.gridX ?? enemy.x;
            const ey = enemy.gridY ?? enemy.y;
            const dist = Math.sqrt((ex - px) ** 2 + (ey - py) ** 2);

            if (dist > this.threatRange) continue;

            threatCount++;

            const angleToEnemy = Math.atan2(ey - py, ex - px) * (180 / Math.PI);
            const normalizedAngle = ((angleToEnemy % 360) + 360) % 360;

            let relativeAngle = normalizedAngle - playerFacingAngle;
            if (relativeAngle < 0) relativeAngle += 360;
            if (relativeAngle > 360) relativeAngle -= 360;

            if (relativeAngle >= 315 || relativeAngle < 45) {
                quadrants.front++;
            } else if (relativeAngle >= 45 && relativeAngle < 135) {
                quadrants.right++;
            } else if (relativeAngle >= 135 && relativeAngle < 225) {
                quadrants.back++;
                rearArcCount++;
                flankingEnemies.push(enemy);
            } else {
                quadrants.left++;
            }

            if (relativeAngle >= 90 && relativeAngle < 270) {
                if (!flankingEnemies.includes(enemy)) {
                    rearArcCount++;
                    flankingEnemies.push(enemy);
                }
            }
        }

        const occupiedQuadrants = Object.values(quadrants).filter(c => c > 0).length;

        let newState = this.STATES.CLEAR;
        if (occupiedQuadrants >= this.minQuadrants) {
            newState = this.STATES.SURROUNDED;
        } else if (rearArcCount >= this.minFlankEnemies) {
            newState = this.STATES.FLANKED;
        }

        return this._updateState(newState, threatCount, flankingEnemies, quadrants);
    },

    _updateState(newState, threatCount, flankingEnemies, quadrants = {}) {
        const result = {
            state: newState,
            threatCount: threatCount,
            flanking: flankingEnemies || [],
            quadrants: quadrants,
            changed: newState !== this.currentState
        };

        if (result.changed) {
            this.lastState = this.currentState;
            this.currentState = newState;

            if (typeof EventBus !== 'undefined') {
                EventBus.emit('encirclement:changed', {
                    oldState: this.lastState,
                    newState: newState,
                    threatCount: threatCount,
                    flanking: flankingEnemies
                });

                if (newState === this.STATES.FLANKED) {
                    EventBus.emit('encirclement:flanked', { enemies: flankingEnemies, count: flankingEnemies.length });
                } else if (newState === this.STATES.SURROUNDED) {
                    EventBus.emit('encirclement:surrounded', { quadrants: quadrants, threatCount: threatCount });
                } else if (newState === this.STATES.CLEAR) {
                    EventBus.emit('encirclement:clear', {});
                }
            }

            if (typeof showStatusText === 'function' && typeof game !== 'undefined' && game.player) {
                if (newState === this.STATES.SURROUNDED) {
                    showStatusText(game.player, 'SURROUNDED!', '#FF0000');
                } else if (newState === this.STATES.FLANKED) {
                    showStatusText(game.player, 'FLANKED!', '#FF8800');
                }
            }
        }

        return result;
    },

    getState() { return this.currentState; },
    isInDanger() { return this.currentState !== this.STATES.CLEAR; },
    reset() {
        this.currentState = this.STATES.CLEAR;
        this.lastState = this.STATES.CLEAR;
        this.checkTimer = 0;
    }
};

// ============================================================
// AI MANAGER
// ============================================================

const AIManager = {
    ais: new Map(),
    game: null,
    maxAttackers: 3,
    currentAttackers: new Set(),
    circleAngles: new Map(),
    AI_CULL_DISTANCE: 25,
    AI_SLEEP_DISTANCE: 40,

    init(gameRef) {
        this.game = gameRef;
        this.ais.clear();
        this.currentAttackers.clear();
        this.circleAngles.clear();

        const packConfig = this.getPackTacticsConfig();
        this.maxAttackers = packConfig.maxSimultaneousAttackers;

        console.log('[AIManager] Initialized with max attackers:', this.maxAttackers);
    },

    getPackTacticsConfig() {
        if (typeof ENEMY_PATTERN_CONFIG !== 'undefined' && ENEMY_PATTERN_CONFIG.packTactics) {
            return ENEMY_PATTERN_CONFIG.packTactics;
        }
        return {
            coordinationRange: 6,
            maxSimultaneousAttackers: 2,
            flankingEnabled: true,
            flankAngle: 45,
            flankDamageBonus: 1.25,
            backstabDamageBonus: 1.50,
            backstabAngle: 135,
            surroundThreshold: 3,
            surroundedDebuff: { dodgePenalty: 0.5, movePenalty: 0.8, staminaRegenPenalty: 0.7 }
        };
    },

    calculateFlankingBonus(attacker, defender) {
        const config = this.getPackTacticsConfig();
        if (!config.flankingEnabled) return { multiplier: 1.0, position: 'front' };

        const dx = defender.gridX - attacker.gridX;
        const dy = defender.gridY - attacker.gridY;
        const attackAngle = Math.atan2(dy, dx) * (180 / Math.PI);

        const facingAngles = { right: 0, down: 90, left: 180, up: 270 };
        const defenderFacing = facingAngles[defender.facing || 'down'] || 0;

        let relativeAngle = Math.abs(attackAngle - defenderFacing);
        if (relativeAngle > 180) relativeAngle = 360 - relativeAngle;

        if (relativeAngle >= config.backstabAngle) {
            return { multiplier: config.backstabDamageBonus, position: 'behind' };
        } else if (relativeAngle >= config.flankAngle) {
            return { multiplier: config.flankDamageBonus, position: 'flank' };
        }
        return { multiplier: 1.0, position: 'front' };
    },

    checkSurroundedStatus() {
        const config = this.getPackTacticsConfig();
        if (!this.game || !this.game.player) return { isSurrounded: false, debuffs: null };

        const player = this.game.player;
        const px = player.gridX;
        const py = player.gridY;

        let nearbyEnemies = 0;
        this.ais.forEach(ai => {
            const enemy = ai.enemy;
            if (enemy.hp <= 0) return;

            const dist = Math.sqrt((enemy.gridX - px) ** 2 + (enemy.gridY - py) ** 2);
            if (dist <= config.coordinationRange && enemy.combat?.isInCombat) {
                nearbyEnemies++;
            }
        });

        const isSurrounded = nearbyEnemies >= config.surroundThreshold;
        player.isSurrounded = isSurrounded;

        if (isSurrounded) {
            return { isSurrounded: true, debuffs: config.surroundedDebuff };
        }
        return { isSurrounded: false, debuffs: null };
    },

    registerEnemy(enemy) {
        const ai = new EnemyAI(enemy);
        this.ais.set(enemy.id, ai);
        enemy.ai = ai;
        return ai;
    },

    unregisterEnemy(enemy) {
        this.ais.delete(enemy.id);
        this.releaseAttackToken(enemy);
        this.circleAngles.delete(enemy.id);
        enemy.ai = null;
    },

    requestAttackToken(enemy) {
        if (!enemy?.id) return false;
        if (this.currentAttackers.has(enemy.id)) {
            if (enemy.ai) enemy.ai.hasAttackToken = true;
            return true;
        }
        if (this.currentAttackers.size < this.maxAttackers) {
            this.currentAttackers.add(enemy.id);
            if (enemy.ai) enemy.ai.hasAttackToken = true;
            return true;
        }
        return false;
    },

    releaseAttackToken(enemy) {
        if (!enemy?.id) return;
        this.currentAttackers.delete(enemy.id);
        if (enemy.ai) enemy.ai.hasAttackToken = false;
    },

    assignCircleAngle(enemy) {
        if (!enemy?.id) return Math.random() * Math.PI * 2;
        if (this.circleAngles.has(enemy.id)) return this.circleAngles.get(enemy.id);

        const usedAngles = Array.from(this.circleAngles.values());
        let bestAngle = Math.random() * Math.PI * 2, bestMinDist = 0;

        for (let i = 0; i < 8; i++) {
            const testAngle = (i / 8) * Math.PI * 2;
            let minDist = Math.PI * 2;
            for (const used of usedAngles) {
                let diff = Math.abs(testAngle - used);
                if (diff > Math.PI) diff = Math.PI * 2 - diff;
                minDist = Math.min(minDist, diff);
            }
            if (minDist > bestMinDist) {
                bestMinDist = minDist;
                bestAngle = testAngle;
            }
        }

        this.circleAngles.set(enemy.id, bestAngle);
        return bestAngle;
    },

    getAttackerCount() { return this.currentAttackers.size; },

    update(dt) {
        if (!this.game) return;

        const player = this.game.player;
        const px = player?.gridX || 0, py = player?.gridY || 0;

        // Shift (aggro all)
        if (this.game.shiftActive) {
            this.ais.forEach(ai => {
                if (ai.currentState === AI_STATES.IDLE) {
                    ai.alertSource = { x: px, y: py };
                    ai.target = this.game.player;
                    ai.lastKnownTargetPos = { x: px, y: py };
                    ai._changeState(AI_STATES.ALERT);
                }
            });
        }

        const cullDistSq = this.AI_CULL_DISTANCE * this.AI_CULL_DISTANCE;
        const sleepDistSq = this.AI_SLEEP_DISTANCE * this.AI_SLEEP_DISTANCE;

        this.ais.forEach(ai => {
            const e = ai.enemy;
            const distSq = (e.gridX - px) ** 2 + (e.gridY - py) ** 2;

            if (distSq <= cullDistSq) {
                ai.update(dt, this.game);

                // === ENEMY ABILITY SYSTEM: Timer-based passive updates ===
                // Update ethereal cycle and regeneration for enemies with these passives
                if (typeof EnemyAbilitySystem !== 'undefined' && e.hp > 0) {
                    // Ethereal phase cycling (immune/vulnerable phases)
                    if (e.ethereal || e.passives?.includes('ethereal')) {
                        EnemyAbilitySystem.updateEtherealCycle(e, dt);
                    }
                    // Regeneration (heals when out of combat for 3+ seconds)
                    if (e.hasRegeneration || e.passives?.includes('regeneration')) {
                        EnemyAbilitySystem.updateRegeneration(e, dt);
                    }
                }
            } else if (distSq <= sleepDistSq) {
                ai.thinkTimer += dt;
                if (ai.thinkTimer >= 500) {
                    ai.thinkTimer = 0;
                    ai.update(dt, this.game);
                }
            }
        });

        // Encirclement check
        EncirclementSystem.checkTimer += dt;
        if (EncirclementSystem.checkTimer >= EncirclementSystem.checkInterval) {
            EncirclementSystem.checkTimer = 0;
            if (player && this.game.enemies) {
                EncirclementSystem.checkEncirclement(player, this.game.enemies);
            }
        }

        // Pack tactics surround status
        const surroundedStatus = this.checkSurroundedStatus();
        if (surroundedStatus.isSurrounded && surroundedStatus.debuffs) {
            if (typeof StaminaSystem !== 'undefined' && surroundedStatus.debuffs.staminaRegenPenalty) {
                StaminaSystem.surroundedRegenPenalty = surroundedStatus.debuffs.staminaRegenPenalty;
            }
        } else {
            if (typeof StaminaSystem !== 'undefined') {
                StaminaSystem.surroundedRegenPenalty = 1.0;
            }
        }
    },

    getAI(enemy) { return this.ais.get(enemy.id); }
};

// ============================================================
// EXPORTS
// ============================================================

if (typeof window !== 'undefined') {
    window.AIManager = AIManager;
    window.EnemyAI = EnemyAI;
    window.AI_STATES = AI_STATES;
    window.EncirclementSystem = EncirclementSystem;
}

// ============================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================

const EnemyAISystem = {
    name: 'enemy-ai',

    init(game) {
        AIManager.init(game);
        if (typeof MonsterSocialSystem !== 'undefined') {
            MonsterSocialSystem.initialize();
        }
        let count = 0;
        for (const e of game.enemies) {
            if (AIManager.registerEnemy(e)) count++;
        }
        // console.log(`   [EnemyAI] Registered ${count} enemies with simplified 5-state AI`);
    },

    update(dt) {
        AIManager.update(dt);

        const g = AIManager.game;
        if (!g?.enemies) return;

        for (const e of g.enemies) {
            if (!e.isMoving) continue;
            if (typeof e.moveProgress !== 'number') e.moveProgress = 0;

            const dx = e.targetGridX - e.gridX, dy = e.targetGridY - e.gridY;
            const moveDistance = Math.sqrt(dx * dx + dy * dy) || 1;
            const speed = 4 * (e.moveSpeedMult || 1.0);
            e.moveProgress += (speed / moveDistance) * (dt / 1000);

            const t = Math.min(e.moveProgress, 1);
            e.displayX = e.gridX + dx * t;
            e.displayY = e.gridY + dy * t;
            e.x = e.displayX;
            e.y = e.displayY;

            if (e.moveProgress >= 1.0) {
                e.gridX = e.targetGridX;
                e.gridY = e.targetGridY;
                e.displayX = e.gridX;
                e.displayY = e.gridY;
                e.x = e.gridX;
                e.y = e.gridY;
                e.isMoving = false;
                e.moveProgress = 0;
                e.moveSpeedMult = 1.0;
                if (typeof HazardSystem !== 'undefined') HazardSystem.checkCollision(e);
            }
        }
    },

    cleanup() { AIManager.ais.clear(); }
};

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('enemy-ai', EnemyAISystem, 40);
}

// console.log('[EnemyAI] Simplified 5-state AI system loaded');
