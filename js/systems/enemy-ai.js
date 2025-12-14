// ============================================================
// ENEMY AI SYSTEM - The Shifting Chasm
// Dependencies: monsters-data.js, monster-behaviors.js, monster-social-system.js,
//               hazard-system.js, damage-calculator.js, status-effect-system.js
// ============================================================

const AI_STATES = {
    IDLE: 'idle', WANDERING: 'wandering', ALERT: 'alert', CHASING: 'chasing',
    COMBAT: 'combat', SEARCHING: 'searching', RETURNING: 'returning',
    SHOUTING: 'shouting', FOLLOWING: 'following', COMMANDED: 'commanded',
    // New states for smart positioning
    CIRCLING: 'circling',      // Waiting for attack token, surrounding player
    DEFENSIVE: 'defensive',    // Low HP, holding position or seeking cover
    SKIRMISHING: 'skirmishing' // Maintaining optimal range (for ranged enemies)
};

const BEHAVIOR_TYPES = {
    aggressive: {
        hasTerritoryRange: false,
        territorySize: Infinity,
        chaseRange: 15,
        searchDuration: 10
    },
    territorial: {
        hasTerritoryRange: true,
        territorySize: 'room',
        chaseRange: 20,
        searchDuration: 5
    },
    passive: {
        hasTerritoryRange: true,
        territorySize: 5,
        chaseRange: 0,
        searchDuration: 0
    },
    defensive: {
        hasTerritoryRange: true,
        territorySize: 10,
        chaseRange: 10,
        searchDuration: 3
    },
    patrol: {
        hasTerritoryRange: true,
        territorySize: 'room',
        chaseRange: 12,
        searchDuration: 8
    }
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
        this.lastSeenTime = 0;
        
        this.memory = {
            duration: enemy.perception?.memoryDuration || 0,
            positions: [],
            searchedSpots: []
        };
        
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

        // Slot-based combat (Kung Fu Circle)
        this.hasAttackToken = false;
        this.assignedCircleAngle = null;  // Angle around player for CIRCLING state

        // Range-aware positioning (Skirmishing)
        this.optimalRange = enemy.stats?.optimalRange || enemy.stats?.range || 1;
        this.rangeTolerance = enemy.stats?.rangeTolerance || 0.5;
        this.strafeDirection = Math.random() < 0.5 ? 1 : -1;  // Clockwise or counter-clockwise
        this.strafeTimer = 0;

        // Ally-anchored retreat
        this.retreatAlly = null;
    }
    
    _getTerritorySize() {
        const def = BEHAVIOR_TYPES?.[this.enemy.behavior?.type];
        if (!def?.hasTerritoryRange) return Infinity;
        return def.territorySize === 'room' ? 20 : (def.territorySize || 4);
    }
    
    update(dt, game) {
        // Dead enemies should not update AI
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
            this.lastSeenTime = Date.now();
            if (this.memory.duration > 0) this._remember(player.gridX, player.gridY);
        }
        
        if (this.commandedTarget && !this.target) {
            this.target = this.commandedTarget;
            this.lastKnownTargetPos = { x: this.commandedTarget.gridX, y: this.commandedTarget.gridY };
            this.commandedTarget = null;
        }
        
        const hpPct = this.enemy.hp / this.enemy.maxHp;
        const fleeThreshold = this.enemy.behavior?.fleeThreshold || 0.25;
        const isLowHP = hpPct <= fleeThreshold;

        const aggroRange = this.enemy.perception?.sightRange || 6;
        const deaggroRange = aggroRange * 1.5;
        const atkRange = this.enemy.combat?.attackRange || 1;

        // Check if enemy is ranged (optimal range > 1.5)
        const isRanged = this.optimalRange > 1.5;

        this._stateTransitions(canSee, dist, isLowHP, hpPct, aggroRange, deaggroRange, atkRange, isRanged);
    }

    _stateTransitions(canSee, dist, isLowHP, hpPct, aggroRange, deaggroRange, atkRange, isRanged) {
        const S = AI_STATES;
        switch (this.currentState) {
            case S.IDLE:
            case S.WANDERING:
                if (canSee && dist <= aggroRange) {
                    this._changeState(this._shouldShout() ? S.SHOUTING : S.CHASING);
                } else if (this.followTarget) this._changeState(S.FOLLOWING);
                break;

            case S.ALERT:
                if (canSee) this._changeState(S.CHASING);
                else if (this.stateTimer > 3000) this._changeState(S.WANDERING);
                break;

            case S.CHASING:
                // Low HP: Enter DEFENSIVE state (ally-anchored retreat)
                if (isLowHP && this.enemy.behavior?.fleesBehavior) {
                    this._changeState(S.DEFENSIVE);
                    break;
                }
                // Ranged enemy: Switch to SKIRMISHING when in range
                if (isRanged && canSee && dist <= this.optimalRange + this.rangeTolerance + 1) {
                    this._changeState(S.SKIRMISHING);
                    break;
                }
                // Close enough to attack: Try to get attack token
                if (canSee && dist <= atkRange) {
                    if (AIManager.requestAttackToken(this.enemy)) {
                        this._changeState(S.COMBAT);
                    } else {
                        this._changeState(S.CIRCLING);
                    }
                    break;
                }
                // Lost sight
                if (!canSee) {
                    if (this.memory.duration > 0 && this.lastKnownTargetPos) this._changeState(S.SEARCHING);
                    else if (dist > deaggroRange) this._changeState(S.RETURNING);
                }
                // Territorial check
                if (this.enemy.behavior?.type === 'territorial' && !this._inTerritory())
                    this._changeState(S.RETURNING);
                break;

            case S.COMBAT:
                // Low HP: Enter DEFENSIVE (release token handled in _changeState)
                if (isLowHP && this.enemy.behavior?.fleesBehavior) {
                    this._changeState(S.DEFENSIVE);
                    break;
                }
                // Out of range or lost sight
                if (!canSee || dist > atkRange + 1) {
                    this._changeState(S.CHASING);
                }
                break;

            case S.CIRCLING:
                // Got attack token: Enter COMBAT
                if (this.hasAttackToken && dist <= atkRange) {
                    this._changeState(S.COMBAT);
                    break;
                }
                // Try to get token periodically
                if (dist <= atkRange && AIManager.requestAttackToken(this.enemy)) {
                    this._changeState(S.COMBAT);
                    break;
                }
                // Lost sight or target too far
                if (!canSee || dist > atkRange + 3) {
                    this._changeState(S.CHASING);
                }
                // Low HP
                if (isLowHP && this.enemy.behavior?.fleesBehavior) {
                    this._changeState(S.DEFENSIVE);
                }
                break;

            case S.SKIRMISHING:
                // Low HP: Enter DEFENSIVE
                if (isLowHP && this.enemy.behavior?.fleesBehavior) {
                    this._changeState(S.DEFENSIVE);
                    break;
                }
                // Lost sight or out of aggro range
                if (!canSee) {
                    if (this.memory.duration > 0 && this.lastKnownTargetPos) this._changeState(S.SEARCHING);
                    else this._changeState(S.RETURNING);
                    break;
                }
                // If no longer ranged situation, go back to chasing
                if (dist > this.optimalRange + this.rangeTolerance + 2) {
                    this._changeState(S.CHASING);
                }
                break;

            case S.DEFENSIVE:
                // HP recovered: Return to combat
                if (hpPct > (this.enemy.behavior?.fleeThreshold || 0.25) + 0.15) {
                    this._changeState(S.CHASING);
                    break;
                }
                // Lost sight of player
                if (!canSee && dist > deaggroRange) {
                    this._changeState(S.RETURNING);
                }
                break;

            case S.SEARCHING:
                if (canSee) this._changeState(S.CHASING);
                else if (this.stateTimer > this.memory.duration) this._changeState(S.RETURNING);
                break;

            case S.RETURNING:
                if (canSee && dist <= aggroRange) this._changeState(S.CHASING);
                else if (this._dist(this.spawnPosition.x, this.spawnPosition.y) < 1)
                    this._changeState(S.WANDERING);
                break;

            case S.FOLLOWING:
                if (canSee && dist <= aggroRange) this._changeState(S.CHASING);
                else if (!this.followTarget || this.followTarget.hp <= 0) {
                    this.followTarget = null;
                    this._changeState(S.WANDERING);
                }
                break;

            case S.COMMANDED:
                if (this.commandedTarget) {
                    this.target = this.commandedTarget;
                    this._changeState(S.CHASING);
                } else this._changeState(S.WANDERING);
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
        if (pack?.leader && pack.leader !== this.enemy && !this.target) 
            this.followTarget = pack.leader;
    }
    
    _solitaryLogic(game) {
        this.avoidTargets = game.enemies.filter(o => 
            o !== this.enemy && o.hp > 0 && this._dist(o.gridX, o.gridY) < 4
        );
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
    // ============================================================
    // STATE BEHAVIORS
    // ============================================================
    
    _executeBehavior(dt, game) {
        const S = AI_STATES;
        const handlers = {
            [S.IDLE]: () => this.stateTimer > 1500 && this._changeState(S.WANDERING),
            [S.WANDERING]: () => this._wander(dt, game),
            [S.ALERT]: () => this._alert(dt, game),
            [S.CHASING]: () => this._chase(dt, game),
            [S.COMBAT]: () => this._combat(dt, game),
            [S.CIRCLING]: () => this._circle(dt, game),
            [S.SKIRMISHING]: () => this._skirmish(dt, game),
            [S.DEFENSIVE]: () => this._defensive(dt, game),
            [S.SEARCHING]: () => this._search(dt, game),
            [S.RETURNING]: () => this._moveToward(this.spawnPosition.x, this.spawnPosition.y, game, 0.7),
            [S.SHOUTING]: () => this._shout(dt, game),
            [S.FOLLOWING]: () => this._follow(dt, game),
            [S.COMMANDED]: () => {
                if (this.commandedTarget) {
                    this.target = this.commandedTarget;
                    this.commandedTarget = null;
                    this._changeState(S.CHASING);
                } else this._changeState(S.WANDERING);
            }
        };
        handlers[this.currentState]?.();
    }
    
    _wander(dt, game) {
        if (this.wanderPauseTimer > 0) { this.wanderPauseTimer -= dt; return; }
        
        if (this.enemy.behavior?.type === 'solitary' && this.avoidTargets.length > 0) {
            const n = this.avoidTargets[0];
            this._moveAwayFrom(n.gridX, n.gridY, game);
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
        if (this.stateTimer > 500) 
            this._moveToward(this.stateData.noiseSource.x, this.stateData.noiseSource.y, game, 0.5);
    }
    
    _chase(dt, game) {
        if (!this.target) return;

        const distToTarget = this._dist(this.target.gridX, this.target.gridY);
        const atkRange = this.enemy.combat?.attackRange || 1;

        // If already within attack range, just face target (state will transition to COMBAT)
        if (distToTarget <= atkRange) {
            this._face(this.target.gridX, this.target.gridY);
            return;
        }

        if (this.enemy.behavior?.type === 'territorial') {
            const dSpawn = this._dist(this.spawnPosition.x, this.spawnPosition.y);
            if (dSpawn >= this.territorySize - 1 && distToTarget > 2) {
                this._face(this.target.gridX, this.target.gridY);
                return;
            }
        }
        if (!this.enemy.isMoving) this._moveToward(this.target.gridX, this.target.gridY, game, 1.0);
    }
    
    _combat(dt, game) {
        if (!this.target) return;
        this._face(this.target.gridX, this.target.gridY);
        if (this.attackCooldown <= 0) this._attack(game);
    }

    // ============================================================
    // CIRCLING STATE - Surround player while waiting for attack token
    // ============================================================
    _circle(dt, game) {
        if (!this.target) return;

        // Assign a circle angle if not set
        if (this.assignedCircleAngle === null) {
            this.assignedCircleAngle = AIManager.assignCircleAngle(this.enemy);
        }

        const player = this.target;
        const hoverDistance = (this.enemy.combat?.attackRange || 1) + 0.5;

        // Calculate target position around the player
        const targetX = player.gridX + Math.cos(this.assignedCircleAngle) * hoverDistance;
        const targetY = player.gridY + Math.sin(this.assignedCircleAngle) * hoverDistance;

        // Face the player
        this._face(player.gridX, player.gridY);

        // Move toward our circling position
        const distToCirclePos = Math.sqrt(
            (targetX - this.enemy.gridX) ** 2 +
            (targetY - this.enemy.gridY) ** 2
        );

        if (distToCirclePos > 0.5 && !this.enemy.isMoving) {
            this._moveToward(targetX, targetY, game, 0.8);
        }

        // Slowly rotate our assigned angle to create circling motion
        this.assignedCircleAngle += 0.001 * dt * this.strafeDirection;
    }

    // ============================================================
    // SKIRMISHING STATE - Maintain optimal range (for ranged enemies)
    // ============================================================
    _skirmish(dt, game) {
        if (!this.target) return;

        const player = this.target;
        const dist = this._dist(player.gridX, player.gridY);

        // Always face the player
        this._face(player.gridX, player.gridY);

        // Attack if in optimal range and cooldown ready
        if (dist <= this.optimalRange + this.rangeTolerance && this.attackCooldown <= 0) {
            this._attack(game);
        }

        // Zone-based movement
        const tooClose = dist < this.optimalRange - this.rangeTolerance;
        const tooFar = dist > this.optimalRange + this.rangeTolerance;

        if (this.enemy.isMoving) return;

        if (tooClose) {
            // Zone 2: Retreat - move away from player
            this._moveAwayFrom(player.gridX, player.gridY, game, 0.9);
        } else if (tooFar) {
            // Zone 1: Approach - move toward player
            this._moveToward(player.gridX, player.gridY, game, 0.9);
        } else {
            // Zone 3: Sweet Spot - strafe perpendicular to player
            this.strafeTimer += dt;
            if (this.strafeTimer > 500) {
                this.strafeTimer = 0;
                // Occasionally change strafe direction
                if (Math.random() < 0.2) {
                    this.strafeDirection *= -1;
                }
            }
            this._strafe(player.gridX, player.gridY, game);
        }
    }

    /**
     * Move perpendicular to the target (strafing)
     */
    _strafe(tx, ty, game) {
        if (this.enemy.isMoving) return;

        const dx = tx - this.enemy.gridX;
        const dy = ty - this.enemy.gridY;

        // Perpendicular direction (rotate 90 degrees)
        // If direction is (dx, dy), perpendicular is (-dy, dx) or (dy, -dx)
        let strafeX, strafeY;
        if (this.strafeDirection > 0) {
            strafeX = -dy;
            strafeY = dx;
        } else {
            strafeX = dy;
            strafeY = -dx;
        }

        // Normalize and get target position
        const len = Math.sqrt(strafeX * strafeX + strafeY * strafeY);
        if (len > 0) {
            strafeX /= len;
            strafeY /= len;
        }

        const targetX = this.enemy.gridX + strafeX;
        const targetY = this.enemy.gridY + strafeY;

        this._moveToward(targetX, targetY, game, 0.7);
    }

    // ============================================================
    // DEFENSIVE STATE - Ally-anchored retreat or hold position
    // ============================================================
    _defensive(dt, game) {
        const player = game.player;
        if (!player) return;

        // Always face the player
        this._face(player.gridX, player.gridY);

        // Try to find a healthy ally to hide behind
        if (!this.retreatAlly || this.retreatAlly.hp <= 0 || this.stateTimer % 2000 < 50) {
            this.retreatAlly = this._findRetreatAlly(game);
        }

        if (this.retreatAlly) {
            // Move to position behind ally (relative to player)
            const allyX = this.retreatAlly.gridX;
            const allyY = this.retreatAlly.gridY;

            // Vector from player to ally
            const dx = allyX - player.gridX;
            const dy = allyY - player.gridY;
            const len = Math.sqrt(dx * dx + dy * dy) || 1;

            // Target is 1.5 tiles behind the ally
            const targetX = allyX + (dx / len) * 1.5;
            const targetY = allyY + (dy / len) * 1.5;

            const distToTarget = Math.sqrt(
                (targetX - this.enemy.gridX) ** 2 +
                (targetY - this.enemy.gridY) ** 2
            );

            if (distToTarget > 0.5 && !this.enemy.isMoving) {
                this._moveToward(targetX, targetY, game, 0.9);
            }
        } else {
            // No ally found: Hold position, face player
            // Can still attack if player gets close
            const dist = this._dist(player.gridX, player.gridY);
            const atkRange = this.enemy.combat?.attackRange || 1;

            if (dist <= atkRange && this.attackCooldown <= 0) {
                this._attack(game);
            }
        }
    }

    /**
     * Find a healthy ally to retreat behind
     */
    _findRetreatAlly(game) {
        const scanRange = 6;
        let bestAlly = null;
        let bestScore = -Infinity;

        for (const other of game.enemies) {
            if (other === this.enemy || other.hp <= 0) continue;

            const dist = this._dist(other.gridX, other.gridY);
            if (dist > scanRange) continue;

            // Must be healthier than us (at least 50% HP)
            const allyHpPct = other.hp / other.maxHp;
            if (allyHpPct < 0.5) continue;

            // Score: prefer closer allies with higher HP
            const score = allyHpPct * 10 - dist;

            if (score > bestScore) {
                bestScore = score;
                bestAlly = other;
            }
        }

        return bestAlly;
    }

    _search(dt, game) {
        if (!this.lastKnownTargetPos) return;
        if (this._dist(this.lastKnownTargetPos.x, this.lastKnownTargetPos.y) < 1) {
            this._searchSweep(dt);
        } else {
            this._moveToward(this.lastKnownTargetPos.x, this.lastKnownTargetPos.y, game);
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
    
    // ============================================================
    // MOVEMENT
    // ============================================================
    
    _moveToward(tx, ty, game, speedMult = 1.0) {
        if (this.enemy.isMoving) return;
        const dx = tx - this.enemy.gridX, dy = ty - this.enemy.gridY;
        if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;

        // Calculate 8-directional movement
        let mx = 0, my = 0;
        if (dx > 0.1) mx = 1;
        else if (dx < -0.1) mx = -1;
        if (dy > 0.1) my = 1;
        else if (dy < -0.1) my = -1;

        this._updateFacing(mx, my);
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

        // Calculate 8-directional movement away from target
        let mx = 0, my = 0;
        if (dx > 0.1) mx = 1;
        else if (dx < -0.1) mx = -1;
        if (dy > 0.1) my = 1;
        else if (dy < -0.1) my = -1;

        const nx = this.enemy.gridX + mx, ny = this.enemy.gridY + my;
        if (this._canMove(nx, ny, mx, my, game)) {
            this._updateFacing(mx, my);
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
        // 8-directional alternatives: cardinals + diagonals
        const dirs = [
            {x:0,y:-1}, {x:1,y:0}, {x:0,y:1}, {x:-1,y:0},  // cardinals
            {x:1,y:-1}, {x:1,y:1}, {x:-1,y:1}, {x:-1,y:-1}  // diagonals
        ];
        for (let i = dirs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }
        const curDist = this._dist(tx, ty);
        for (const d of dirs) {
            const nx = this.enemy.gridX + d.x, ny = this.enemy.gridY + d.y;
            if (this._shouldAvoidHazard(nx, ny, game) || !this._canMove(nx, ny, d.x, d.y, game)) continue;
            if (Math.sqrt((nx-tx)**2 + (ny-ty)**2) < curDist) {
                this._updateFacing(d.x, d.y);
                this._startMove(nx, ny, speedMult);
                return;
            }
        }
    }
    
    _updateFacing(mx, my) {
        // For diagonal movement, use horizontal priority (matches player behavior)
        if (mx !== 0 && my !== 0) {
            // Diagonal - prioritize horizontal
            this.enemy.facing = mx > 0 ? 'right' : 'left';
        } else if (mx !== 0) {
            this.enemy.facing = mx > 0 ? 'right' : 'left';
        } else if (my !== 0) {
            this.enemy.facing = my > 0 ? 'down' : 'up';
        }
    }

    _face(x, y) {
        const dx = x - this.enemy.gridX, dy = y - this.enemy.gridY;
        // For diagonal facing, use horizontal priority (matches player behavior)
        if (Math.abs(dx) > 0.1 && Math.abs(dy) > 0.1) {
            // Diagonal - prioritize horizontal
            this.enemy.facing = dx > 0 ? 'right' : 'left';
        } else if (Math.abs(dx) > Math.abs(dy)) {
            this.enemy.facing = dx > 0 ? 'right' : 'left';
        } else {
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

        // For diagonal moves, check adjacent tiles to prevent corner-cutting
        if (mx !== 0 && my !== 0) {
            // Check horizontal adjacent tile
            const hTile = game.map?.[this.enemy.gridY]?.[this.enemy.gridX + mx];
            if (!hTile || hTile.type === 'wall' || hTile.type === 'void' || hTile.type === 'interior_wall') return false;
            if (hasBlockingDecorationAt(this.enemy.gridX + mx, this.enemy.gridY)) return false;

            // Check vertical adjacent tile
            const vTile = game.map?.[this.enemy.gridY + my]?.[this.enemy.gridX];
            if (!vTile || vTile.type === 'wall' || vTile.type === 'void' || vTile.type === 'interior_wall') return false;
            if (hasBlockingDecorationAt(this.enemy.gridX, this.enemy.gridY + my)) return false;
        }

        for (const o of game.enemies) {
            if (o === this.enemy) continue;
            if (Math.floor(o.gridX) === x && Math.floor(o.gridY) === y) return false;
            if (MonsterSocialSystem.shouldAvoid(this.enemy, o)) {
                if (Math.sqrt((o.gridX-x)**2 + (o.gridY-y)**2) < 2) return false;
            }
            // For diagonal moves, also check adjacent tiles for enemy collision
            if (mx !== 0 && my !== 0) {
                if (Math.floor(o.gridX) === this.enemy.gridX + mx && Math.floor(o.gridY) === this.enemy.gridY) return false;
                if (Math.floor(o.gridX) === this.enemy.gridX && Math.floor(o.gridY) === this.enemy.gridY + my) return false;
            }
        }
        if (game.player?.gridX === x && game.player?.gridY === y) return false;
        // For diagonal moves, check player in adjacent tiles too
        if (mx !== 0 && my !== 0) {
            if (game.player?.gridX === this.enemy.gridX + mx && game.player?.gridY === this.enemy.gridY) return false;
            if (game.player?.gridX === this.enemy.gridX && game.player?.gridY === this.enemy.gridY + my) return false;
        }
        return true;
    }
    
    _randomTile(game, radius = 3) {
        for (let i = 0; i < 10; i++) {
            const x = this.enemy.gridX + Math.floor(Math.random() * (radius*2+1)) - radius;
            const y = this.enemy.gridY + Math.floor(Math.random() * (radius*2+1)) - radius;
            if (game.map?.[y]?.[x]?.type === 'floor') return { x, y };
        }
        return null;
    }
    // ============================================================
    // VISION
    // ============================================================
    
    _canSeeTarget(target, game) {
        const d = this._dist(target.gridX, target.gridY);
        const range = this.enemy.perception?.sightRange || 6;
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
    
    // ============================================================
    // COMBAT
    // ============================================================
    
    _attack(game) {
        if (!this.target) return;
        const d = this._dist(this.target.gridX, this.target.gridY);
        const range = this.enemy.stats?.range || 1;
        if (d > range) return;

        if (this.enemy.special && this.specialCooldown <= 0 && Math.random() < 0.2) {
            this._specialAttack(game);
            return;
        }

        const room = this._getCurrentRoom(game);
        const result = DamageCalculator.calculateDamage(this.enemy, this.target, room);

        // Handle miss
        if (!result.isHit) {
            if (typeof showDamageNumber === 'function') {
                showDamageNumber(this.target, 0, '#888888');
            }
            this.attackCooldown = 700 / (this.enemy.stats?.speed || 1);
            if (this.debugLog) console.log(`[AI] ${this.enemy.name} missed!`);
            return;
        }

        applyDamage(this.target, result.finalDamage, this.enemy);
        NoiseSystem.makeNoise(this.enemy, 50);

        // Show damage number
        if (typeof showDamageNumber === 'function') {
            const color = result.isCrit ? '#ffff00' : '#ff4444';
            showDamageNumber(this.target, result.finalDamage, color);
        }

        this.attackCooldown = 700 / (this.enemy.stats?.speed || 1);
        if (!this.enemy.combat?.isInCombat) engageCombat(this.enemy, this.target);

        // Check for target death
        if (this.target.hp <= 0) {
            if (typeof handleDeath === 'function') {
                handleDeath(this.target, this.enemy);
            }
        }

        if (this.debugLog) console.log(`[AI] ${this.enemy.name} attacks for ${result.finalDamage}${result.isCrit ? ' (CRIT!)' : ''}`);
    }
    
    _specialAttack(game) {
        const s = this.enemy.special;
        if (!s || s.deathExplosion) return;
        
        if (s.radius) {
            const entities = this._entitiesInRadius(this.enemy.gridX, this.enemy.gridY, s.radius, game);
            for (const e of entities) {
                if (e === this.enemy) continue;
                applyDamage(e, s.damage || 10, this.enemy);
                if (s.element) {
                    const status = getElementStatusEffect(s.element);
                    if (status) StatusEffectSystem.applyEffect(e, status, this.enemy);
                }
            }
        }
        this.specialCooldown = 5000;
        this.attackCooldown = 700 / (this.enemy.stats?.speed || 1);
    }
    
    _entitiesInRadius(x, y, r, game) {
        const result = [];
        if (game.player && Math.sqrt((game.player.gridX-x)**2 + (game.player.gridY-y)**2) <= r) 
            result.push(game.player);
        for (const e of game.enemies) {
            if (Math.sqrt((e.gridX-x)**2 + (e.gridY-y)**2) <= r) result.push(e);
        }
        return result;
    }
    
    _getCurrentRoom(game) {
        if (!game.rooms) return null;
        for (const r of game.rooms) {
            if (this.enemy.gridX >= r.floorX && this.enemy.gridX < r.floorX + r.floorWidth &&
                this.enemy.gridY >= r.floorY && this.enemy.gridY < r.floorY + r.floorHeight) return r;
        }
        return null;
    }
    
    // ============================================================
    // COMMUNICATION
    // ============================================================
    
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
            if (Math.sqrt((o.gridX-this.enemy.gridX)**2 + (o.gridY-this.enemy.gridY)**2) <= range && o.ai) {
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
    
    // ============================================================
    // UTILITY
    // ============================================================
    
    _remember(x, y) {
        if (this.memory.duration <= 0) return;
        this.memory.positions.push({ x, y, time: Date.now() });
        if (this.memory.positions.length > 10) this.memory.positions.shift();
    }
    
    _searchSweep(dt) {
        const dirs = ['up', 'right', 'down', 'left'];
        const i = dirs.indexOf(this.enemy.facing);
        if (Math.floor(this.stateTimer / 1500) !== Math.floor((this.stateTimer - dt) / 1500)) {
            this.enemy.facing = dirs[(i + 1) % 4];
        }
    }
    
    _changeState(newState) {
        if (newState === this.currentState) return;

        // Release attack token when leaving COMBAT or CIRCLING
        if ((this.previousState === AI_STATES.COMBAT || this.currentState === AI_STATES.COMBAT ||
             this.previousState === AI_STATES.CIRCLING || this.currentState === AI_STATES.CIRCLING) &&
            newState !== AI_STATES.COMBAT && newState !== AI_STATES.CIRCLING) {
            AIManager.releaseAttackToken(this.enemy);
            this.hasAttackToken = false;
            this.assignedCircleAngle = null;
        }

        this.previousState = this.currentState;
        this.currentState = newState;
        this.stateTimer = 0;
        this.stateData = {};

        if (newState === AI_STATES.SHOUTING) { this.shoutTimer = 0; this.isShoutInterrupted = false; }
        if (newState === AI_STATES.SEARCHING) this.memory.searchedSpots = [];
        if (newState === AI_STATES.DEFENSIVE) this.retreatAlly = null;
        if (newState === AI_STATES.SKIRMISHING) this.strafeTimer = 0;

        if (this.debugLog) console.log(`[AI] ${this.enemy.name}: ${this.previousState} → ${newState}`);
    }
    
    _dist(x, y) {
        return Math.sqrt((x - this.enemy.gridX) ** 2 + (y - this.enemy.gridY) ** 2);
    }
    
    setDebugLog(enabled) { this.debugLog = enabled; }
}
// ============================================================
// AI MANAGER
// ============================================================

const AIManager = {
    ais: new Map(),
    game: null,

    // Slot-based combat system (Kung Fu Circle)
    maxAttackers: 3,           // Maximum enemies that can attack simultaneously
    currentAttackers: new Set(), // Set of enemy IDs currently attacking
    circleAngles: new Map(),   // Map of enemy ID to assigned circle angle

    init(gameRef) {
        this.game = gameRef;
        this.ais.clear();
        this.currentAttackers.clear();
        this.circleAngles.clear();
        console.log('[AIManager] Initialized (with slot-based combat)');
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

    // ============================================================
    // SLOT-BASED COMBAT (Attack Token System)
    // ============================================================

    /**
     * Request an attack token. Returns true if granted.
     * @param {Object} enemy - The enemy requesting to attack
     * @returns {boolean} Whether the token was granted
     */
    requestAttackToken(enemy) {
        if (!enemy?.id) return false;

        // Already has a token
        if (this.currentAttackers.has(enemy.id)) {
            if (enemy.ai) enemy.ai.hasAttackToken = true;
            return true;
        }

        // Check if slots available
        if (this.currentAttackers.size < this.maxAttackers) {
            this.currentAttackers.add(enemy.id);
            if (enemy.ai) enemy.ai.hasAttackToken = true;
            return true;
        }

        return false;
    },

    /**
     * Release an attack token when enemy leaves combat
     * @param {Object} enemy - The enemy releasing its token
     */
    releaseAttackToken(enemy) {
        if (!enemy?.id) return;
        this.currentAttackers.delete(enemy.id);
        if (enemy.ai) enemy.ai.hasAttackToken = false;
    },

    /**
     * Assign a unique angle for circling around the player
     * @param {Object} enemy - The enemy to assign an angle to
     * @returns {number} Angle in radians
     */
    assignCircleAngle(enemy) {
        if (!enemy?.id) return Math.random() * Math.PI * 2;

        // If already assigned, return existing
        if (this.circleAngles.has(enemy.id)) {
            return this.circleAngles.get(enemy.id);
        }

        // Find used angles
        const usedAngles = Array.from(this.circleAngles.values());

        // Try to find an angle that's well-separated from existing ones
        let bestAngle = Math.random() * Math.PI * 2;
        let bestMinDist = 0;

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

    /**
     * Get count of enemies currently in attack slots
     * @returns {number}
     */
    getAttackerCount() {
        return this.currentAttackers.size;
    },

    // Configuration for distance-based AI culling
    AI_CULL_DISTANCE: 25,      // Full AI updates within this range
    AI_SLEEP_DISTANCE: 40,     // Minimal updates beyond this range

    update(dt) {
        if (!this.game) return;

        const player = this.game.player;
        const px = player?.gridX || 0;
        const py = player?.gridY || 0;

        // Force all enemies to alert/aggressive when shift is active
        if (this.game.shiftActive) {
            this.ais.forEach(ai => {
                // Only change state if not already in combat-related states
                if (ai.currentState === AI_STATES.IDLE ||
                    ai.currentState === AI_STATES.WANDERING ||
                    ai.currentState === AI_STATES.RETURNING) {
                    ai._changeState(AI_STATES.ALERT);
                    ai.target = this.game.player;
                    ai.lastKnownTargetPos = {
                        x: this.game.player.gridX,
                        y: this.game.player.gridY
                    };
                }
            });
        }

        // Distance-based AI culling for performance
        this.ais.forEach(ai => {
            const enemy = ai.enemy;
            const dx = enemy.gridX - px;
            const dy = enemy.gridY - py;
            const distSq = dx * dx + dy * dy;

            // Full AI updates for nearby enemies
            if (distSq <= this.AI_CULL_DISTANCE * this.AI_CULL_DISTANCE) {
                ai.update(dt, this.game);
            }
            // Reduced updates for mid-range enemies (every 500ms)
            else if (distSq <= this.AI_SLEEP_DISTANCE * this.AI_SLEEP_DISTANCE) {
                ai.thinkTimer += dt;
                if (ai.thinkTimer >= 500) {
                    ai.thinkTimer = 0;
                    ai.update(dt, this.game);
                }
            }
            // Sleeping enemies beyond sleep distance - no AI updates
            // They'll wake up when player gets closer
        });
    },
    
    getAI(enemy) { return this.ais.get(enemy.id); }
};

// ============================================================
// DEBUG
// ============================================================

function debugSetEnemyState(idx, state) {
    const e = AIManager.game?.enemies?.[idx];
    if (e?.ai) { e.ai._changeState(state); console.log(`Set enemy ${idx} to ${state}`); }
}

function debugToggleAILogs(enabled = true) {
    AIManager.ais.forEach(ai => ai.setDebugLog(enabled));
    console.log(`AI logging: ${enabled ? 'ON' : 'OFF'}`);
}

function debugLogEnemyStates() {
    console.log('=== ENEMY AI STATES ===');
    AIManager.ais.forEach(ai => {
        const e = ai.enemy;
        console.log(`${e.name}: ${ai.currentState} | ${e.behavior?.type} | ${e.hp}/${e.maxHp}`);
    });
}

function debugLogSocialInfo() {
    console.log('=== SOCIAL INFO ===');
    AIManager.ais.forEach(ai => {
        const e = ai.enemy;
        let s = `${e.name}: ${e.behavior?.type}`;
        if (e.pack) s += ` pack(${e.pack.members.length})`;
        if (ai.followTarget) s += ` following:${ai.followTarget.name}`;
        console.log(s);
    });
}

// ============================================================
// EXPORTS
// ============================================================

if (typeof window !== 'undefined') {
    window.AIManager = AIManager;
    window.EnemyAI = EnemyAI;
    window.AI_STATES = AI_STATES;
    window.setEnemyState = debugSetEnemyState;
    window.toggleAILogs = debugToggleAILogs;
    window.logEnemyStates = debugLogEnemyStates;
    window.logSocialInfo = debugLogSocialInfo;
}

// ============================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================

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

            // Calculate actual distance for this move (1.0 for cardinal, ~1.414 for diagonal)
            const dx = e.targetGridX - e.gridX;
            const dy = e.targetGridY - e.gridY;
            const moveDistance = Math.sqrt(dx * dx + dy * dy) || 1;

            // Normalize speed so diagonal moves don't go faster
            // Speed is in tiles/second, divide by actual distance so progress reaches 1.0
            // at the same real-world speed regardless of direction
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