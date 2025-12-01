// ============================================================
// ENEMY AI SYSTEM - The Shifting Chasm
// Dependencies: monsters-data.js, monster-behaviors.js, monster-social-system.js,
//               hazard-system.js, damage-calculator.js, status-effect-system.js
// ============================================================

const AI_STATES = {
    IDLE: 'idle', WANDERING: 'wandering', ALERT: 'alert', CHASING: 'chasing',
    COMBAT: 'combat', FLEEING: 'fleeing', SEARCHING: 'searching', 
    RETURNING: 'returning', SHOUTING: 'shouting', FOLLOWING: 'following', 
    COMMANDED: 'commanded'
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
    }
    
    _getTerritorySize() {
        const def = BEHAVIOR_TYPES?.[this.enemy.behavior?.type];
        if (!def?.hasTerritoryRange) return Infinity;
        return def.territorySize === 'room' ? 20 : (def.territorySize || 4);
    }
    
    update(dt, game) {
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
        const shouldFlee = this.enemy.behavior?.fleesBehavior && 
                          this.enemy.behavior?.fleeThreshold > 0 && 
                          hpPct <= this.enemy.behavior.fleeThreshold;
        
        const aggroRange = this.enemy.perception?.sightRange || 6;
        const deaggroRange = aggroRange * 1.5;
        const atkRange = this.enemy.stats?.range || 1;
        
        this._stateTransitions(canSee, dist, shouldFlee, hpPct, aggroRange, deaggroRange, atkRange);
    }
    
    _stateTransitions(canSee, dist, shouldFlee, hpPct, aggroRange, deaggroRange, atkRange) {
        const S = AI_STATES;
        switch (this.currentState) {
            case S.IDLE:
            case S.WANDERING:
                if (shouldFlee && canSee) this._changeState(S.FLEEING);
                else if (canSee && dist <= aggroRange) {
                    this._changeState(this._shouldShout() ? S.SHOUTING : S.CHASING);
                } else if (this.followTarget) this._changeState(S.FOLLOWING);
                break;
            case S.ALERT:
                if (shouldFlee) this._changeState(S.FLEEING);
                else if (canSee) this._changeState(S.CHASING);
                else if (this.stateTimer > 3000) this._changeState(S.WANDERING);
                break;
            case S.CHASING:
                if (shouldFlee) this._changeState(S.FLEEING);
                else if (canSee && dist <= atkRange) this._changeState(S.COMBAT);
                else if (!canSee) {
                    if (this.memory.duration > 0 && this.lastKnownTargetPos) this._changeState(S.SEARCHING);
                    else if (dist > deaggroRange) this._changeState(S.RETURNING);
                }
                if (this.enemy.behavior?.type === 'territorial' && !this._inTerritory()) 
                    this._changeState(S.RETURNING);
                break;
            case S.COMBAT:
                if (shouldFlee) this._changeState(S.FLEEING);
                else if (!canSee || dist > atkRange + 1) this._changeState(S.CHASING);
                break;
            case S.FLEEING:
                if (dist > deaggroRange) this._changeState(S.RETURNING);
                if (hpPct > (this.enemy.behavior?.fleeThreshold || 0) + 0.2) this._changeState(S.CHASING);
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
            [S.FLEEING]: () => this._flee(dt, game),
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
        if (this.enemy.behavior?.type === 'territorial') {
            const dTarget = this._dist(this.target.gridX, this.target.gridY);
            const dSpawn = this._dist(this.spawnPosition.x, this.spawnPosition.y);
            if (dSpawn >= this.territorySize - 1 && dTarget > 2) {
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
    
    _flee(dt, game) {
        if (game.player) this._moveAwayFrom(game.player.gridX, game.player.gridY, game, 1.2);
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
        
        let mx = 0, my = 0;
        if (Math.abs(dx) > Math.abs(dy)) mx = dx > 0 ? 1 : -1;
        else my = dy > 0 ? 1 : -1;
        
        this._updateFacing(mx, my);
        const nx = this.enemy.gridX + mx, ny = this.enemy.gridY + my;
        
        if (this._shouldAvoidHazard(nx, ny, game) || !this._canMove(nx, ny, game)) {
            this._tryAltMove(tx, ty, game, speedMult);
        } else {
            this._startMove(nx, ny, speedMult);
        }
    }
    
    _moveAwayFrom(tx, ty, game, speedMult = 1.0) {
        if (this.enemy.isMoving) return;
        const dx = this.enemy.gridX - tx, dy = this.enemy.gridY - ty;
        let mx = 0, my = 0;
        if (Math.abs(dx) > Math.abs(dy)) mx = dx > 0 ? 1 : -1;
        else my = dy > 0 ? 1 : -1;
        
        const nx = this.enemy.gridX + mx, ny = this.enemy.gridY + my;
        if (this._canMove(nx, ny, game)) {
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
        const dirs = [{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
        for (let i = dirs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
        }
        const curDist = this._dist(tx, ty);
        for (const d of dirs) {
            const nx = this.enemy.gridX + d.x, ny = this.enemy.gridY + d.y;
            if (this._shouldAvoidHazard(nx, ny, game) || !this._canMove(nx, ny, game)) continue;
            if (Math.sqrt((nx-tx)**2 + (ny-ty)**2) < curDist) {
                this._updateFacing(d.x, d.y);
                this._startMove(nx, ny, speedMult);
                return;
            }
        }
    }
    
    _updateFacing(mx, my) {
        if (Math.abs(mx) > Math.abs(my)) this.enemy.facing = mx > 0 ? 'right' : 'left';
        else if (my !== 0) this.enemy.facing = my > 0 ? 'down' : 'up';
    }
    
    _face(x, y) {
        const dx = x - this.enemy.gridX, dy = y - this.enemy.gridY;
        if (Math.abs(dx) > Math.abs(dy)) this.enemy.facing = dx > 0 ? 'right' : 'left';
        else this.enemy.facing = dy > 0 ? 'down' : 'up';
    }
    
    _shouldAvoidHazard(x, y, game) {
        const tile = game.map?.[y]?.[x];
        return tile?.hazard && HazardSystem.shouldAvoid(this.enemy, tile.hazard);
    }
    
    _canMove(x, y, game) {
        const tile = game.map?.[y]?.[x];
        if (!tile || tile.type === 'wall' || tile.type === 'void') return false;
        if (hasBlockingDecorationAt(x, y)) return false;
        
        for (const o of game.enemies) {
            if (o === this.enemy) continue;
            if (Math.floor(o.gridX) === x && Math.floor(o.gridY) === y) return false;
            if (MonsterSocialSystem.shouldAvoid(this.enemy, o)) {
                if (Math.sqrt((o.gridX-x)**2 + (o.gridY-y)**2) < 2) return false;
            }
        }
        if (game.player?.gridX === x && game.player?.gridY === y) return false;
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
            if (!tile || tile.type === 'wall' || tile.type === 'void') return false;
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
        const damage = DamageCalculator.calculateDamage(this.enemy, this.target, room);
        applyDamage(this.target, damage, this.enemy);
        NoiseSystem.makeNoise(this.enemy, 50);
        
        this.attackCooldown = 700 / (this.enemy.stats?.speed || 1);
        if (!this.enemy.combat?.isInCombat) engageCombat(this.enemy, this.target);
        
        if (this.debugLog) console.log(`[AI] ${this.enemy.name} attacks for ${damage}`);
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
        this.previousState = this.currentState;
        this.currentState = newState;
        this.stateTimer = 0;
        this.stateData = {};
        if (newState === AI_STATES.SHOUTING) { this.shoutTimer = 0; this.isShoutInterrupted = false; }
        if (newState === AI_STATES.SEARCHING) this.memory.searchedSpots = [];
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
    
    init(gameRef) {
        this.game = gameRef;
        this.ais.clear();
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
        enemy.ai = null;
    },
    
    update(dt) {
        if (!this.game) return;
        this.ais.forEach(ai => ai.update(dt, this.game));
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
            
            const speed = 4 * (e.moveSpeedMult || 1.0);
            e.moveProgress += speed * (dt / 1000);
            
            const t = Math.min(e.moveProgress, 1);
            e.displayX = e.gridX + (e.targetGridX - e.gridX) * t;
            e.displayY = e.gridY + (e.targetGridY - e.gridY) * t;
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