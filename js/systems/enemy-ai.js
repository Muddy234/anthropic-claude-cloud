// ============================================================
// ENEMY AI SYSTEM - The Shifting Chasm
// ============================================================

const AI_STATES = {
    IDLE: 'idle', WANDERING: 'wandering', ALERT: 'alert', CHASING: 'chasing',
    COMBAT: 'combat', SEARCHING: 'searching', RETURNING: 'returning',
    SHOUTING: 'shouting', FOLLOWING: 'following', COMMANDED: 'commanded',
    CIRCLING: 'circling', DEFENSIVE: 'defensive', SKIRMISHING: 'skirmishing',
    PANICKED: 'panicked', ENRAGED: 'enraged',
    REACTING: 'reacting',      // Delay before aggro (reaction time)
    SACRIFICING: 'sacrificing', // Elite consuming a minion
    WINDUP: 'windup'           // Telegraph delay before attack (allows dodging)
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

        this.target = null;
        this.lastKnownTargetPos = null;
        this.memoryDuration = enemy.perception?.memoryDuration || 0;

        this.spawnPosition = { x: enemy.gridX, y: enemy.gridY };
        this.territorySize = this._getTerritorySize();

        this.wanderTarget = null;
        this.wanderPauseTimer = 0;
        this.shoutTimer = 0;
        this.isShoutInterrupted = false;
        this.lastShoutTime = 0;
        this.attackCooldown = 0;
        this.specialCooldown = 0;
        this.thinkInterval = 200;
        this.thinkTimer = Math.random() * this.thinkInterval;

        this.followTarget = null;
        this.commandedTarget = null;
        this.avoidTargets = [];
        this.debugLog = false;

        // Slot-based combat
        this.hasAttackToken = false;
        this.assignedCircleAngle = null;

        // Range-aware positioning - LINK TO TIER DATA
        // Priority: Behavior Config (Tier) -> Stats (Weapon) -> Default 1
        this.optimalRange = enemy.behavior?.preferredRange || enemy.stats?.optimalRange || enemy.stats?.range || 1;
        // Defines if the enemy is allowed to enter SKIRMISHING state (kiting behavior)
        this.canKite = enemy.behavior?.kitesBehavior || false;
        // Anti-jitter: ensure tolerance is wide enough (>= 1.0) to prevent vibration
        this.rangeTolerance = enemy.stats?.rangeTolerance || 1.0;
        this.strafeDirection = Math.random() < 0.5 ? 1 : -1;
        this.strafeTimer = 0;

        // Ally-anchored retreat
        this.retreatAlly = null;

        // Social system position override
        this.targetPosition = null;

        // Tier-based behavior (from MONSTER_TIERS)
        const tierConfig = enemy.tierConfig || MONSTER_TIERS?.[enemy.tier] || null;
        this.reactionDelay = tierConfig?.senses?.reactionDelay || enemy.perception?.reactionDelay || 0;

        // Windup duration before attack (allows player to dodge)
        // Higher tiers have shorter windups, making them more dangerous
        this.windupDuration = enemy.combat?.windupDuration || tierConfig?.combat?.windupDuration || 300;
        this.searchBehavior = enemy.behavior?.searchBehavior || tierConfig?.behavior?.searchBehavior || 'none';
        this.retreatHierarchy = tierConfig?.social?.retreatHierarchy || [];
        this.packCourage = tierConfig?.social?.packCourage || false;
        this.packCourageThreshold = tierConfig?.social?.packCourageThreshold || 4;
        this.isSacrificial = tierConfig?.social?.isSacrificial || false;
        this.canSacrificeMinions = tierConfig?.social?.canSacrificeMinions || false;
        this.sacrificeThreshold = tierConfig?.social?.sacrificeThreshold || 0.3;
        this.sacrificeHeal = tierConfig?.social?.sacrificeHeal || 0.25;
        this.sacrificeDamageBuff = tierConfig?.social?.sacrificeDamageBuff || 0.2;
        this.sacrificeTarget = null;
        this.hasSacrificeBuff = false;
    }

    _getTerritorySize() {
        const def = BEHAVIOR_TYPES[this.enemy.behavior?.type];
        if (!def?.hasTerritoryRange) return Infinity;
        return def.territorySize === 'room' ? 20 : (def.territorySize || 4);
    }

    update(dt, game) {
        if (this.enemy.hp <= 0) return;

        this.stateTimer += dt;
        this.thinkTimer += dt;
        this.attackCooldown = Math.max(0, this.attackCooldown - dt);
        this.specialCooldown = Math.max(0, this.specialCooldown - dt);

        if (this.thinkTimer >= this.thinkInterval) {
            this.thinkTimer = 0;
            this._think(game);
        }
        this._executeBehavior(dt, game);
    }

    _think(game) {
        const player = game.player;
        if (!player) return;

        this._processBehaviorLogic(game);

        const canSee = this._canSeeTarget(player, game);
        const dist = this._dist(player.gridX, player.gridY);

        if (canSee) {
            this.target = player;
            this.lastKnownTargetPos = { x: player.gridX, y: player.gridY };
        }

        if (this.commandedTarget && !this.target) {
            this.target = this.commandedTarget;
            this.lastKnownTargetPos = { x: this.commandedTarget.gridX, y: this.commandedTarget.gridY };
            this.commandedTarget = null;
        }

        const hpPct = this.enemy.hp / this.enemy.maxHp;
        const fleeThreshold = this.enemy.behavior?.fleeThreshold || 0.25;
        const isLowHP = hpPct <= fleeThreshold;
        const canFlee = this.enemy.behavior?.fleesBehavior;

        const aggroRange = this.enemy.perception?.sightRange || 6;
        const deaggroRange = aggroRange * 1.5;
        const atkRange = this.enemy.combat?.attackRange || 1;
        const isRanged = this.optimalRange > 1.5;

        this._stateTransitions(canSee, dist, isLowHP, canFlee, hpPct, aggroRange, deaggroRange, atkRange, isRanged);
    }

    _stateTransitions(canSee, dist, isLowHP, canFlee, hpPct, aggroRange, deaggroRange, atkRange, isRanged) {
        const S = AI_STATES;
        const state = this.currentState;
        const fleeThreshold = this.enemy.behavior?.fleeThreshold || 0.25;

        // PACK COURAGE: Tier 3s with 4+ allies nearby become fearless
        let effectiveFleeThreshold = fleeThreshold;
        if (this.packCourage && canFlee) {
            const nearbyAllies = this._countNearbyAllies(4);
            if (nearbyAllies >= this.packCourageThreshold) {
                effectiveFleeThreshold = 0; // Mob mentality - no fear!
            }
        }
        const adjustedLowHP = hpPct <= effectiveFleeThreshold;

        // SACRIFICE CHECK: Elites at low HP can sacrifice minions
        if (this.canSacrificeMinions && hpPct <= this.sacrificeThreshold && !this.hasSacrificeBuff) {
            const victim = this._findSacrificialVictim();
            if (victim) {
                this.sacrificeTarget = victim;
                this._changeState(S.SACRIFICING);
                return;
            }
        }

        // Common low HP check for combat states (uses adjusted threshold for pack courage)
        if (adjustedLowHP && canFlee && (state === S.CHASING || state === S.COMBAT || state === S.CIRCLING || state === S.SKIRMISHING)) {
            this._changeState(S.DEFENSIVE);
            return;
        }

        switch (state) {
            case S.IDLE:
            case S.WANDERING:
                if (canSee && dist <= aggroRange) {
                    // REACTION DELAY: Dumb enemies hesitate before aggro
                    if (this.reactionDelay > 0) {
                        this._changeState(S.REACTING);
                    } else {
                        this._changeState(this._shouldShout() ? S.SHOUTING : S.CHASING);
                    }
                } else if (this.followTarget) {
                    this._changeState(S.FOLLOWING);
                }
                break;

            case S.REACTING:
                // Wait for reaction delay, then engage
                if (this.stateTimer >= this.reactionDelay) {
                    if (canSee) {
                        this._changeState(this._shouldShout() ? S.SHOUTING : S.CHASING);
                    } else {
                        // Lost sight during reaction - back to wandering
                        this._changeState(S.WANDERING);
                    }
                }
                break;

            case S.ALERT:
                if (canSee) this._changeState(S.CHASING);
                else if (this.stateTimer > 3000) this._changeState(S.WANDERING);
                break;

            case S.CHASING:
                // Only enter SKIRMISHING if canKite is true (prevents tanky ranged units from retreating)
                if (this.canKite && isRanged && canSee && dist <= this.optimalRange + this.rangeTolerance + 1) {
                    this._changeState(S.SKIRMISHING);
                } else if (canSee && dist <= atkRange) {
                    this._changeState(AIManager.requestAttackToken(this.enemy) ? S.COMBAT : S.CIRCLING);
                } else if (!canSee) {
                    this._changeState(this.memoryDuration > 0 && this.lastKnownTargetPos ? S.SEARCHING :
                                     dist > deaggroRange ? S.RETURNING : state);
                } else if (this.enemy.behavior?.type === 'territorial' && !this._inTerritory()) {
                    this._changeState(S.RETURNING);
                }
                break;

            case S.COMBAT:
                if (!canSee || dist > atkRange + 1) this._changeState(S.CHASING);
                break;

            case S.CIRCLING:
                if ((this.hasAttackToken || AIManager.requestAttackToken(this.enemy)) && dist <= atkRange) {
                    this._changeState(S.COMBAT);
                } else if (!canSee || dist > atkRange + 3) {
                    this._changeState(S.CHASING);
                }
                break;

            case S.SKIRMISHING:
                if (!canSee) {
                    this._changeState(this.memoryDuration > 0 && this.lastKnownTargetPos ? S.SEARCHING : S.RETURNING);
                } else if (dist > this.optimalRange + this.rangeTolerance + 2) {
                    this._changeState(S.CHASING);
                }
                break;

            case S.DEFENSIVE:
                if (hpPct > fleeThreshold + 0.15) {
                    this._changeState(S.CHASING);
                } else if (!canSee && dist > deaggroRange) {
                    this._changeState(S.RETURNING);
                }
                break;

            case S.SEARCHING:
                if (canSee) this._changeState(S.CHASING);
                else if (this.stateTimer > this.memoryDuration) this._changeState(S.RETURNING);
                break;

            case S.RETURNING:
                if (canSee && dist <= aggroRange) this._changeState(S.CHASING);
                else if (this._dist(this.spawnPosition.x, this.spawnPosition.y) < 1) this._changeState(S.WANDERING);
                break;

            case S.FOLLOWING:
                if (canSee && dist <= aggroRange) {
                    this._changeState(S.CHASING);
                } else if (!this.followTarget || this.followTarget.hp <= 0) {
                    this.followTarget = null;
                    this._changeState(S.WANDERING);
                }
                break;

            case S.COMMANDED:
                if (this.commandedTarget) {
                    this.target = this.commandedTarget;
                    this._changeState(S.CHASING);
                } else {
                    this._changeState(S.WANDERING);
                }
                break;
        }
    }

    _processBehaviorLogic(game) {
        const type = this.enemy.behavior?.type;
        if (type === 'swarm') this._swarmLogic(game);
        else if (type === 'pack') this._packLogic(game);
        else if (type === 'solitary') this._solitaryLogic(game);
        else if (type === 'pack_leader') this._leaderLogic(game);
        else if (type === 'dominant') this._dominantLogic(game);
    }

    _swarmLogic(game) {
        // Use MonsterSocialSystem for swarm coordination
        if (this.enemy.swarmId && typeof MonsterSocialSystem !== 'undefined') {
            // If we have a target, get our swarm attack position
            if (this.target) {
                const pos = MonsterSocialSystem.getSwarmAttackPosition(this.enemy, this.target);
                if (pos) {
                    this.targetPosition = pos;
                }
            }
        }

        // Legacy pack logic fallback
        const pack = this.enemy.pack;
        if (!pack) return;
        const leader = pack.members[0];
        if (leader && leader !== this.enemy && !this.target) this.followTarget = leader;
        if (leader?.ai?.target && !this.target) {
            this.target = leader.ai.target;
            this.lastKnownTargetPos = { x: this.target.gridX, y: this.target.gridY };
        }
    }

    _packLogic(game) {
        const pack = this.enemy.pack;
        if (pack?.leader && pack.leader !== this.enemy && !this.target) this.followTarget = pack.leader;
    }

    _solitaryLogic(game) {
        // Only compute if actually solitary behavior
        if (this.avoidTargets.length === 0 || this.stateTimer % 500 < 50) {
            this.avoidTargets = [];
            for (const o of game.enemies) {
                if (o !== this.enemy && o.hp > 0 && this._dist(o.gridX, o.gridY) < 4) {
                    this.avoidTargets.push(o);
                    if (this.avoidTargets.length >= 3) break; // Limit search
                }
            }
        }
    }

    _leaderLogic(game) {
        if (!this.enemy.pack || !this.target) return;
        for (const m of this.enemy.pack.members) {
            if (m !== this.enemy && m.ai) m.ai.commandedTarget = this.target;
        }
    }

    _dominantLogic(game) {
        if (!this.enemy.commanded || !this.target) return;
        for (const m of this.enemy.commanded) {
            if (m.ai) m.ai.commandedTarget = this.target;
        }
    }

    _inTerritory() {
        return this._dist(this.spawnPosition.x, this.spawnPosition.y) <= this.territorySize;
    }

    // STATE BEHAVIORS
    _executeBehavior(dt, game) {
        const S = AI_STATES;
        switch (this.currentState) {
            case S.IDLE: if (this.stateTimer > 1500) this._changeState(S.WANDERING); break;
            case S.WANDERING: this._wander(dt, game); break;
            case S.REACTING: this._react(dt, game); break;
            case S.SACRIFICING: this._sacrifice(dt, game); break;
            case S.WINDUP: this._windup(dt, game); break;
            case S.ALERT: this._alert(dt, game); break;
            case S.CHASING: this._chase(dt, game); break;
            case S.COMBAT: this._combat(dt, game); break;
            case S.CIRCLING: this._circle(dt, game); break;
            case S.SKIRMISHING: this._skirmish(dt, game); break;
            case S.DEFENSIVE: this._defensive(dt, game); break;
            case S.SEARCHING: this._search(dt, game); break;
            case S.RETURNING: this._moveToward(this.spawnPosition.x, this.spawnPosition.y, game, 0.7); break;
            case S.SHOUTING: this._shout(dt, game); break;
            case S.FOLLOWING: this._follow(dt, game); break;
            case S.COMMANDED:
                if (this.commandedTarget) {
                    this.target = this.commandedTarget;
                    this.commandedTarget = null;
                    this._changeState(S.CHASING);
                } else this._changeState(S.WANDERING);
                break;
            case S.PANICKED: this._panicked(dt, game); break;
            case S.ENRAGED: this._enraged(dt, game); break;
        }
    }

    _wander(dt, game) {
        if (this.wanderPauseTimer > 0) { this.wanderPauseTimer -= dt; return; }

        if (this.enemy.behavior?.type === 'solitary' && this.avoidTargets.length > 0) {
            this._moveAwayFrom(this.avoidTargets[0].gridX, this.avoidTargets[0].gridY, game);
            return;
        }

        if (Math.random() < 0.002 * dt) { this.wanderPauseTimer = 1000 + Math.random() * 2000; return; }

        if (!this.wanderTarget || this._dist(this.wanderTarget.x, this.wanderTarget.y) < 1) {
            if (Math.random() < 0.3) this.wanderTarget = this._randomTile(game, 3);
        }
        if (this.wanderTarget) this._moveToward(this.wanderTarget.x, this.wanderTarget.y, game, 0.5);
    }

    _alert(dt, game) {
        if (!this.stateData.noiseSource) return;
        this._face(this.stateData.noiseSource.x, this.stateData.noiseSource.y);
        if (this.stateTimer > 500) this._moveToward(this.stateData.noiseSource.x, this.stateData.noiseSource.y, game, 0.5);
    }

    _chase(dt, game) {
        if (!this.target) return;

        // HIGH PRIORITY: Social/Swarm position override
        // If this enemy has a swarm-assigned position, go there first
        if (this.enemy.swarmId && this.targetPosition) {
            const distToPos = this._distXY(this.enemy.gridX, this.enemy.gridY,
                                           this.targetPosition.x, this.targetPosition.y);
            if (distToPos > 0.5) {
                // Move to assigned encirclement position
                if (!this.enemy.isMoving) {
                    this._moveToward(this.targetPosition.x, this.targetPosition.y, game, 1.0);
                }
                this._face(this.target.gridX, this.target.gridY);
                return;
            }
            // Arrived at position - face player and attack if in range
            this._face(this.target.gridX, this.target.gridY);
            const atkRange = this.enemy.combat?.attackRange || 1;
            if (this._dist(this.target.gridX, this.target.gridY) <= atkRange && this.attackCooldown <= 0) {
                this._startWindup(AI_STATES.CHASING);
            }
            return;
        }

        // LOW PRIORITY: Default chase behavior
        const atkRange = this.enemy.combat?.attackRange || 1;
        if (this._dist(this.target.gridX, this.target.gridY) <= atkRange) {
            this._face(this.target.gridX, this.target.gridY);
            return;
        }
        if (this.enemy.behavior?.type === 'territorial') {
            const dSpawn = this._dist(this.spawnPosition.x, this.spawnPosition.y);
            if (dSpawn >= this.territorySize - 1 && this._dist(this.target.gridX, this.target.gridY) > 2) {
                this._face(this.target.gridX, this.target.gridY);
                return;
            }
        }
        if (!this.enemy.isMoving) this._moveToward(this.target.gridX, this.target.gridY, game, 1.0);
    }

    _combat(dt, game) {
        if (!this.target) return;
        this._face(this.target.gridX, this.target.gridY);
        if (this.attackCooldown <= 0) {
            this._startWindup(AI_STATES.COMBAT);
        }
    }

    // Helper to start windup state from any attack-capable state
    _startWindup(returnState) {
        // Store target position for windup lock-in (enemy commits to this direction)
        this.stateData.windupTargetPos = { x: this.target.gridX, y: this.target.gridY };
        this.stateData.returnState = returnState;
        this._changeState(AI_STATES.WINDUP);
    }

    _windup(dt, game) {
        // WINDUP STATE: Enemy is telegraphing their attack
        // CRITICAL: Do NOT call _face() - enemy is locked to their facing direction
        // This allows players to dodge by stepping out of the attack cone

        if (!this.target) {
            this._changeState(AI_STATES.CHASING);
            return;
        }

        // Check if windup duration has elapsed
        if (this.stateTimer >= this.windupDuration) {
            // Execute the attack with forceAttack=true (uses vision cone check)
            this._attack(game, true);
            // Return to previous state (could be COMBAT, SKIRMISHING, ENRAGED, etc.)
            const returnState = this.stateData.returnState || AI_STATES.COMBAT;
            this._changeState(returnState);
        }
        // Otherwise, just wait (enemy is "winding up" their attack)
    }

    _circle(dt, game) {
        if (!this.target) return;
        if (this.assignedCircleAngle === null) {
            this.assignedCircleAngle = AIManager.assignCircleAngle(this.enemy);
        }

        const player = this.target;
        const hoverDistance = (this.enemy.combat?.attackRange || 1) + 0.5;
        const targetX = player.gridX + Math.cos(this.assignedCircleAngle) * hoverDistance;
        const targetY = player.gridY + Math.sin(this.assignedCircleAngle) * hoverDistance;

        this._face(player.gridX, player.gridY);

        if (this._dist(targetX, targetY) > 0.5 && !this.enemy.isMoving) {
            this._moveToward(targetX, targetY, game, 0.8);
        }
        this.assignedCircleAngle += 0.001 * dt * this.strafeDirection;
    }

    _skirmish(dt, game) {
        if (!this.target) return;

        const player = this.target;
        const dist = this._dist(player.gridX, player.gridY);

        this._face(player.gridX, player.gridY);

        // Anti-jitter: ensure the "Dead Zone" (where they stand still and shoot) is at least 1 tile wide
        const effectiveTolerance = Math.max(this.rangeTolerance, 1.0);

        if (dist <= this.optimalRange + effectiveTolerance && this.attackCooldown <= 0) {
            this._startWindup(AI_STATES.SKIRMISHING);
        }

        if (this.enemy.isMoving) return;

        const tooClose = dist < this.optimalRange - effectiveTolerance;
        const tooFar = dist > this.optimalRange + effectiveTolerance;

        if (tooClose) {
            this._moveAwayFrom(player.gridX, player.gridY, game, 0.9);
        } else if (tooFar) {
            this._moveToward(player.gridX, player.gridY, game, 0.9);
        } else {
            // In sweet spot - strafe and shoot
            this.strafeTimer += dt;
            if (this.strafeTimer > 500) {
                this.strafeTimer = 0;
                if (Math.random() < 0.2) this.strafeDirection *= -1;
            }
            this._strafe(player.gridX, player.gridY, game);
        }
    }

    _strafe(tx, ty, game) {
        if (this.enemy.isMoving) return;
        const dx = tx - this.enemy.gridX, dy = ty - this.enemy.gridY;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;

        // Perpendicular direction
        const strafeX = this.strafeDirection > 0 ? -dy / len : dy / len;
        const strafeY = this.strafeDirection > 0 ? dx / len : -dx / len;

        this._moveToward(this.enemy.gridX + strafeX, this.enemy.gridY + strafeY, game, 0.7);
    }

    _defensive(dt, game) {
        const player = game.player;
        if (!player) return;

        this._face(player.gridX, player.gridY);

        // Periodically search for ally
        if (!this.retreatAlly || this.retreatAlly.hp <= 0 || this.stateTimer % 2000 < 50) {
            this.retreatAlly = this._findRetreatAlly(game);
        }

        if (this.retreatAlly) {
            const dx = this.retreatAlly.gridX - player.gridX;
            const dy = this.retreatAlly.gridY - player.gridY;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;
            const targetX = this.retreatAlly.gridX + (dx / len) * 1.5;
            const targetY = this.retreatAlly.gridY + (dy / len) * 1.5;

            if (this._dist(targetX, targetY) > 0.5 && !this.enemy.isMoving) {
                this._moveToward(targetX, targetY, game, 0.9);
            }
        } else {
            // Hold position, attack if close
            const atkRange = this.enemy.combat?.attackRange || 1;
            if (this._dist(player.gridX, player.gridY) <= atkRange && this.attackCooldown <= 0) {
                this._startWindup(AI_STATES.DEFENSIVE);
            }
        }
    }

    _findRetreatAlly(game) {
        // CHAIN OF COMMAND RETREATS: Respect tier hierarchy
        // Tier 3 → retreats to Tier 2, Tier 1, or Elite
        // Tier 2 → retreats to Elite only
        // Tier 1/Elite → never retreats (retreatHierarchy is empty)

        if (this.retreatHierarchy.length === 0) {
            return null; // This tier doesn't retreat to allies
        }

        let bestAlly = null, bestScore = -Infinity;
        for (const other of game.enemies) {
            if (other === this.enemy || other.hp <= 0) continue;

            // Check if this ally's tier is in our retreat hierarchy
            const allyTier = other.tier || 'TIER_2';
            if (!this.retreatHierarchy.includes(allyTier)) continue;

            const dist = this._dist(other.gridX, other.gridY);
            if (dist > 6) continue;

            const allyHpPct = other.hp / other.maxHp;
            if (allyHpPct < 0.5) continue;

            // Prefer higher tier allies (Elite > Tier 1 > Tier 2)
            const tierOrder = { 'TIER_3': 0, 'TIER_2': 1, 'TIER_1': 2, 'ELITE': 3, 'BOSS': 4 };
            const tierBonus = (tierOrder[allyTier] || 0) * 5;

            const score = allyHpPct * 10 - dist + tierBonus;
            if (score > bestScore) { bestScore = score; bestAlly = other; }
        }
        return bestAlly;
    }

    _search(dt, game) {
        // TIER-SPECIFIC SEARCH PATTERNS:
        // 'none' (Tier 3): "Must have been the wind" - immediately return to IDLE
        // 'lastKnown' (Tier 2): Check last known position, then give up
        // 'tactical' (Tier 1): Throw projectile at last known spot before checking
        // 'aggressive' (Elite): Command nearby Tier 3s to check the spot

        if (this.searchBehavior === 'none') {
            // Tier 3: Immediately give up
            this._changeState(AI_STATES.WANDERING);
            return;
        }

        if (!this.lastKnownTargetPos) {
            this._changeState(AI_STATES.WANDERING);
            return;
        }

        // 'aggressive' (Elite): Command minions to search
        if (this.searchBehavior === 'aggressive' && !this.stateData.commandedSearch) {
            this.stateData.commandedSearch = true;
            this._commandMinionSearch(game);
        }

        // 'tactical' (Tier 1): Throw projectile at last known spot (once)
        if (this.searchBehavior === 'tactical' && !this.stateData.threwProjectile) {
            this.stateData.threwProjectile = true;
            // Visual feedback - checking the brush
            if (typeof showStatusText === 'function') {
                showStatusText(this.enemy, 'Checking...', '#FFAA00');
            }
        }

        if (this._dist(this.lastKnownTargetPos.x, this.lastKnownTargetPos.y) < 1) {
            // Arrived at last known position - sweep search
            const dirs = ['up', 'right', 'down', 'left'];
            const i = dirs.indexOf(this.enemy.facing);
            if (Math.floor(this.stateTimer / 1500) !== Math.floor((this.stateTimer - dt) / 1500)) {
                this.enemy.facing = dirs[(i + 1) % 4];
            }
        } else {
            this._moveToward(this.lastKnownTargetPos.x, this.lastKnownTargetPos.y, game);
        }
    }

    // HELPER: Elite commands nearby Tier 3s to search
    _commandMinionSearch(game) {
        for (const other of game.enemies) {
            if (other === this.enemy || other.hp <= 0) continue;
            if (this._dist(other.gridX, other.gridY) > 8) continue;

            // Only command Tier 3s (sacrificial = Tier 3)
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

    _shout(dt, game) {
        this.shoutTimer += dt;
        if (this.shoutTimer >= 1000) {
            if (!this.isShoutInterrupted) this._emitShout(game);
            this._changeState(AI_STATES.CHASING);
        }
    }

    _follow(dt, game) {
        if (!this.followTarget || this.followTarget.hp <= 0) {
            this.followTarget = null;
            this._changeState(AI_STATES.WANDERING);
            return;
        }
        const d = this._dist(this.followTarget.gridX, this.followTarget.gridY);
        if (d > 3) this._moveToward(this.followTarget.gridX, this.followTarget.gridY, game, 0.8);
        else if (d < 1.5) this._moveAwayFrom(this.followTarget.gridX, this.followTarget.gridY, game, 0.3);
    }

    _panicked(dt, game) {
        // Panicked enemies flee randomly, recover after 3 seconds
        if (this.stateTimer > 3000) {
            this._changeState(AI_STATES.WANDERING);
            return;
        }

        // Run away from player if visible
        const player = game.player;
        if (player) {
            const dist = this._dist(player.gridX, player.gridY);
            if (dist < 8) {
                this._moveAwayFrom(player.gridX, player.gridY, game, 1.2);
                return;
            }
        }

        // Otherwise flee in random direction
        if (!this.stateData.panicDir || this.stateTimer % 500 < 50) {
            this.stateData.panicDir = {
                x: this.enemy.gridX + (Math.random() - 0.5) * 6,
                y: this.enemy.gridY + (Math.random() - 0.5) * 6
            };
        }
        this._moveToward(this.stateData.panicDir.x, this.stateData.panicDir.y, game, 1.2);
    }

    _enraged(dt, game) {
        // Enraged enemies chase player aggressively, attack with bonus damage
        const player = game.player;
        if (!player) {
            this._changeState(AI_STATES.WANDERING);
            return;
        }

        // Enrage lasts 5 seconds then reverts to normal chase
        if (this.stateTimer > 5000) {
            this.target = player;
            this._changeState(AI_STATES.CHASING);
            return;
        }

        this.target = player;
        const dist = this._dist(player.gridX, player.gridY);
        const atkRange = this.enemy.combat?.attackRange || 1;

        if (dist <= atkRange) {
            this._face(player.gridX, player.gridY);
            if (this.attackCooldown <= 0) this._startWindup(AI_STATES.ENRAGED);
        } else {
            this._moveToward(player.gridX, player.gridY, game, 1.3); // Faster pursuit
        }
    }

    _react(dt, game) {
        // REACTION DELAY: Enemy spotted player but is slow to react
        // Stand still, look surprised (the "Huh?" moment)
        const player = game.player;
        if (player) {
            this._face(player.gridX, player.gridY);
        }
        // State timer handles the transition in _stateTransitions
    }

    _sacrifice(dt, game) {
        // SACRIFICE MECHANIC: Elite consuming a Tier 3 minion
        if (!this.sacrificeTarget || this.sacrificeTarget.hp <= 0) {
            this.sacrificeTarget = null;
            this._changeState(AI_STATES.CHASING);
            return;
        }

        const victim = this.sacrificeTarget;
        const dist = this._dist(victim.gridX, victim.gridY);

        // Move toward victim if not close enough
        if (dist > 1.5) {
            this._moveToward(victim.gridX, victim.gridY, game, 1.2);
            return;
        }

        // Close enough - consume the minion!
        this._face(victim.gridX, victim.gridY);

        // Kill the victim
        victim.hp = 0;
        if (typeof handleDeath === 'function') {
            handleDeath(victim, this.enemy);
        }

        // Show visual feedback
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

        // Clear and return to combat
        this.sacrificeTarget = null;
        this._changeState(AI_STATES.CHASING);
    }

    // HELPER: Count nearby allies for pack courage
    _countNearbyAllies(range) {
        if (!AIManager.game?.enemies) return 0;
        let count = 0;
        for (const other of AIManager.game.enemies) {
            if (other === this.enemy || other.hp <= 0) continue;
            if (this._dist(other.gridX, other.gridY) <= range) count++;
        }
        return count;
    }

    // HELPER: Find a sacrificial victim (nearest Tier 3)
    _findSacrificialVictim() {
        if (!AIManager.game?.enemies) return null;
        let best = null, bestDist = Infinity;

        for (const other of AIManager.game.enemies) {
            if (other === this.enemy || other.hp <= 0) continue;

            // Check if this enemy is sacrificial (Tier 3)
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

    // MOVEMENT
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

    _startMove(nx, ny, speedMult) {
        this.enemy.targetGridX = nx;
        this.enemy.targetGridY = ny;
        this.enemy.isMoving = true;
        this.enemy.moveProgress = 0;
        this.enemy.moveSpeedMult = speedMult;
    }

    _tryAltMove(tx, ty, game, speedMult) {
        const dirs = [{x:0,y:-1}, {x:1,y:0}, {x:0,y:1}, {x:-1,y:0}, {x:1,y:-1}, {x:1,y:1}, {x:-1,y:1}, {x:-1,y:-1}];
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

    _shouldAvoidHazard(x, y, game) {
        const tile = game.map?.[y]?.[x];
        return tile?.hazard && HazardSystem.shouldAvoid(this.enemy, tile.hazard);
    }

    _canMove(x, y, mx, my, game) {
        const tile = game.map?.[y]?.[x];
        if (!tile || tile.type === 'wall' || tile.type === 'void' || tile.type === 'interior_wall') return false;
        if (hasBlockingDecorationAt(x, y)) return false;

        // Diagonal corner-cutting check
        if (mx !== 0 && my !== 0) {
            const hTile = game.map?.[this.enemy.gridY]?.[this.enemy.gridX + mx];
            const vTile = game.map?.[this.enemy.gridY + my]?.[this.enemy.gridX];
            if (!hTile || hTile.type === 'wall' || hTile.type === 'void' || hTile.type === 'interior_wall') return false;
            if (!vTile || vTile.type === 'wall' || vTile.type === 'void' || vTile.type === 'interior_wall') return false;
            if (hasBlockingDecorationAt(this.enemy.gridX + mx, this.enemy.gridY)) return false;
            if (hasBlockingDecorationAt(this.enemy.gridX, this.enemy.gridY + my)) return false;
        }

        // Entity collision checks
        const ex = this.enemy.gridX, ey = this.enemy.gridY;
        for (const o of game.enemies) {
            if (o === this.enemy) continue;
            const ox = Math.floor(o.gridX), oy = Math.floor(o.gridY);
            if (ox === x && oy === y) return false;
            if (MonsterSocialSystem.shouldAvoid(this.enemy, o) && this._distXY(o.gridX, o.gridY, x, y) < 2) return false;
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

    _randomTile(game, radius = 3) {
        for (let i = 0; i < 10; i++) {
            const x = this.enemy.gridX + Math.floor(Math.random() * (radius * 2 + 1)) - radius;
            const y = this.enemy.gridY + Math.floor(Math.random() * (radius * 2 + 1)) - radius;
            if (game.map?.[y]?.[x]?.type === 'floor') return { x, y };
        }
        return null;
    }

    // VISION
    _canSeeTarget(target, game) {
        const d = this._dist(target.gridX, target.gridY);
        let range = this.enemy.perception?.sightRange || 6;

        // TORCH STEALTH: Reduce enemy vision when player torch is OFF
        // Unless player is standing in another light source
        if (target === game.player) {
            const playerTorchOn = game.player.isTorchOn !== false;
            const playerInLightSource = typeof LightSourceSystem !== 'undefined' &&
                LightSourceSystem.isNearLightSource(game.player.gridX, game.player.gridY);

            if (!playerTorchOn && !playerInLightSource) {
                range *= 0.25; // 25% vision range when player is in darkness
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
            if (hasVisionBlockingDecorationAt(cx, cy)) return false;
        }
        return true;
    }

    // COMBAT
    _attack(game, forceAttack = false) {
        if (!this.target) return;
        const range = this.enemy.stats?.range || 1;
        if (this._dist(this.target.gridX, this.target.gridY) > range) return;

        const cooldown = 700 / (this.enemy.stats?.speed || 1);

        // WINDUP LOCK-IN CHECK: If this is a forced attack (from windup),
        // check if target is still in our vision cone. If player dodged, miss!
        if (forceAttack) {
            const inCone = this._inVisionCone(this.target.gridX, this.target.gridY);
            if (!inCone) {
                // Player dodged! Attack whiffs
                if (typeof showDamageNumber === 'function') {
                    showDamageNumber(this.target, 'DODGED', '#00FF00');
                }
                this.attackCooldown = cooldown;
                return;
            }
        }

        if (this.enemy.special && this.specialCooldown <= 0 && Math.random() < 0.2) {
            this._specialAttack(game);
            return;
        }

        const room = this._getCurrentRoom(game);
        const result = DamageCalculator.calculateDamage(this.enemy, this.target, room);

        if (!result.isHit) {
            if (typeof showDamageNumber === 'function') showDamageNumber(this.target, 0, '#888888');
            this.attackCooldown = cooldown;
            return;
        }

        applyDamage(this.target, result.finalDamage, this.enemy);
        NoiseSystem.makeNoise(this.enemy, 50);

        if (typeof showDamageNumber === 'function') {
            showDamageNumber(this.target, result.finalDamage, result.isCrit ? '#ffff00' : '#ff4444');
        }

        this.attackCooldown = cooldown;
        if (!this.enemy.combat?.isInCombat) engageCombat(this.enemy, this.target);
        if (this.target.hp <= 0 && typeof handleDeath === 'function') handleDeath(this.target, this.enemy);
    }

    _specialAttack(game) {
        const s = this.enemy.special;
        if (!s || s.deathExplosion) return;

        if (s.radius) {
            const ex = this.enemy.gridX, ey = this.enemy.gridY;
            if (game.player && this._distXY(game.player.gridX, game.player.gridY, ex, ey) <= s.radius) {
                applyDamage(game.player, s.damage || 10, this.enemy);
                if (s.element) {
                    const status = getElementStatusEffect(s.element);
                    if (status) StatusEffectSystem.applyEffect(game.player, status, this.enemy);
                }
            }
            for (const e of game.enemies) {
                if (e !== this.enemy && this._distXY(e.gridX, e.gridY, ex, ey) <= s.radius) {
                    applyDamage(e, s.damage || 10, this.enemy);
                    if (s.element) {
                        const status = getElementStatusEffect(s.element);
                        if (status) StatusEffectSystem.applyEffect(e, status, this.enemy);
                    }
                }
            }
        }
        this.specialCooldown = 5000;
        this.attackCooldown = 700 / (this.enemy.stats?.speed || 1);
    }

    _getCurrentRoom(game) {
        if (!game.rooms) return null;
        for (const r of game.rooms) {
            if (this.enemy.gridX >= r.floorX && this.enemy.gridX < r.floorX + r.floorWidth &&
                this.enemy.gridY >= r.floorY && this.enemy.gridY < r.floorY + r.floorHeight) return r;
        }
        return null;
    }

    // COMMUNICATION
    _shouldShout() {
        const c = this.enemy.communication;
        if (!c?.type) return false;
        return !(this.lastShoutTime && Date.now() - this.lastShoutTime < 10000);
    }

    _emitShout(game) {
        const range = this.enemy.communication?.range || 5;
        NoiseSystem.makeNoise(this.enemy, 80, this.enemy.gridX, this.enemy.gridY);

        for (const o of game.enemies) {
            if (o === this.enemy || o.hp <= 0) continue;
            if (this._dist(o.gridX, o.gridY) <= range && o.ai) {
                o.ai.onAllyShout(this.enemy, this.target);
            }
        }
        this.lastShoutTime = Date.now();
    }

    onAllyShout(shouter, target) {
        if (this.currentState === AI_STATES.COMBAT || this.currentState === AI_STATES.CHASING) return;
        this.target = target;
        this.lastKnownTargetPos = target ? { x: target.gridX, y: target.gridY } : null;
        this._changeState(AI_STATES.ALERT);
    }

    interruptShout() {
        if (this.currentState === AI_STATES.SHOUTING) {
            const t = this.enemy.tier;
            if (t !== 'elite' && t !== 1) this.isShoutInterrupted = true;
        }
    }

    onNoiseHeard(data) {
        if (this.currentState === AI_STATES.COMBAT || this.currentState === AI_STATES.CHASING) return;
        this.stateData.noiseSource = { x: data.sourceX, y: data.sourceY };
        this._changeState(AI_STATES.ALERT);
    }

    // UTILITY
    _changeState(newState) {
        if (newState === this.currentState) return;

        // Release attack token when leaving combat states
        const combatStates = [AI_STATES.COMBAT, AI_STATES.CIRCLING];
        if (combatStates.includes(this.currentState) && !combatStates.includes(newState)) {
            AIManager.releaseAttackToken(this.enemy);
            this.hasAttackToken = false;
            this.assignedCircleAngle = null;
        }

        this.previousState = this.currentState;
        this.currentState = newState;
        this.stateTimer = 0;
        this.stateData = {};

        if (newState === AI_STATES.SHOUTING) { this.shoutTimer = 0; this.isShoutInterrupted = false; }
        if (newState === AI_STATES.DEFENSIVE) this.retreatAlly = null;
        if (newState === AI_STATES.SKIRMISHING) this.strafeTimer = 0;
    }

    _dist(x, y) {
        return Math.sqrt((x - this.enemy.gridX) ** 2 + (y - this.enemy.gridY) ** 2);
    }

    _distXY(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
    }

    setDebugLog(enabled) { this.debugLog = enabled; }
}

// AI MANAGER
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
        console.log('[AIManager] Initialized');
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
            if (minDist > bestMinDist) { bestMinDist = minDist; bestAngle = testAngle; }
        }

        this.circleAngles.set(enemy.id, bestAngle);
        return bestAngle;
    },

    getAttackerCount() { return this.currentAttackers.size; },

    update(dt) {
        if (!this.game) return;

        const player = this.game.player;
        const px = player?.gridX || 0, py = player?.gridY || 0;

        if (this.game.shiftActive) {
            this.ais.forEach(ai => {
                if (ai.currentState === AI_STATES.IDLE || ai.currentState === AI_STATES.WANDERING || ai.currentState === AI_STATES.RETURNING) {
                    ai._changeState(AI_STATES.ALERT);
                    ai.target = this.game.player;
                    ai.lastKnownTargetPos = { x: px, y: py };
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
            } else if (distSq <= sleepDistSq) {
                ai.thinkTimer += dt;
                if (ai.thinkTimer >= 500) { ai.thinkTimer = 0; ai.update(dt, this.game); }
            }
        });
    },

    getAI(enemy) { return this.ais.get(enemy.id); }
};

// EXPORTS
if (typeof window !== 'undefined') {
    window.AIManager = AIManager;
    window.EnemyAI = EnemyAI;
    window.AI_STATES = AI_STATES;
}

// SYSTEM MANAGER REGISTRATION
const EnemyAISystem = {
    name: 'enemy-ai',

    init(game) {
        AIManager.init(game);
        MonsterSocialSystem.initialize();
        let count = 0;
        for (const e of game.enemies) { if (AIManager.registerEnemy(e)) count++; }
        console.log(`   ✅ Registered ${count} enemies with AI`);
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
                HazardSystem.checkCollision(e);
            }
        }
    },

    cleanup() { AIManager.ais.clear(); }
};

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('enemy-ai', EnemyAISystem, 40);
}

console.log('✅ Enemy AI system loaded');
