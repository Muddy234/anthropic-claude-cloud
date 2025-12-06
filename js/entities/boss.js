// ============================================================================
// BOSS FRAMEWORK - Large, multi-phase boss enemies
// ============================================================================
// Handles boss entities with phases, special attacks, telegraphs, and
// unique mechanics for shift scenarios.
// ============================================================================

const BossSystem = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    config: {
        debugLogging: false,
        telegraphDisplayTime: 1000,  // Default warning time
        healthBarWidth: 300,
        healthBarHeight: 25
    },

    // ========================================================================
    // STATE
    // ========================================================================
    activeBosses: new Map(),     // bossId -> boss object
    telegraphs: [],              // Active attack telegraphs

    // ========================================================================
    // BOSS TEMPLATES
    // ========================================================================
    BOSS_TEMPLATES: {
        'warden': {
            name: "The Warden",
            title: "Guardian of the Sealed Vault",
            size: { width: 3, height: 3 },
            baseHealth: 500,
            healthPerFloor: 100,
            baseDamage: 25,
            armor: 20,
            moveSpeed: 1.5,
            element: 'physical',

            phases: [
                {
                    name: "Awakening",
                    healthThreshold: 1.0,
                    attackPattern: 'basic',
                    moveSpeedMod: 1.0,
                    damageMod: 1.0,
                    description: "The Warden stirs to life."
                },
                {
                    name: "Aggression",
                    healthThreshold: 0.6,
                    attackPattern: 'aggressive',
                    moveSpeedMod: 1.3,
                    damageMod: 1.2,
                    description: "The Warden enters a frenzy!"
                },
                {
                    name: "Desperation",
                    healthThreshold: 0.3,
                    attackPattern: 'berserk',
                    moveSpeedMod: 1.5,
                    damageMod: 1.5,
                    description: "The Warden fights with desperate fury!"
                }
            ],

            attacks: {
                'ground_slam': {
                    damage: 30,
                    range: 3,
                    aoe: { shape: 'circle', radius: 2 },
                    telegraphTime: 1000,
                    cooldown: 4000,
                    pattern: 'basic'
                },
                'charge': {
                    damage: 40,
                    range: 8,
                    aoe: { shape: 'line', width: 2 },
                    telegraphTime: 800,
                    cooldown: 6000,
                    stunOnHit: true,
                    pattern: 'aggressive'
                },
                'security_pulse': {
                    damage: 15,
                    range: 10,
                    aoe: { shape: 'ring', innerRadius: 2, outerRadius: 6 },
                    telegraphTime: 1200,
                    cooldown: 10000,
                    effect: 'activate_traps',
                    pattern: 'berserk'
                }
            },

            immunities: ['stun', 'knockback'],
            resistances: { physical: 0.2 },

            loot: {
                guaranteed: ['warden_key'],
                bonus: { gold: 500, xp: 1000 }
            }
        },

        'blood_altar': {
            name: "Blood Altar",
            title: "Heart of Darkness",
            size: { width: 2, height: 2 },
            baseHealth: 200,
            healthPerFloor: 50,
            baseDamage: 0,
            armor: 0,
            moveSpeed: 0,        // Stationary
            element: 'void',
            isStationary: true,

            phases: [
                {
                    name: "Dormant",
                    healthThreshold: 1.0,
                    spawnRate: 10000,
                    healRate: 5
                },
                {
                    name: "Pulsing",
                    healthThreshold: 0.5,
                    spawnRate: 5000,
                    healRate: 10
                }
            ],

            attacks: {
                'spawn_vampire': {
                    cooldown: 10000,
                    effect: 'spawn_guard',
                    pattern: 'all'
                },
                'healing_pulse': {
                    cooldown: 5000,
                    range: 5,
                    healAmount: 10,
                    pattern: 'all'
                }
            },

            immunities: ['poison', 'bleed'],
            resistances: { void: 0.5 },
            weaknesses: { holy: 0.5, fire: 0.3 }
        },

        'void_horror': {
            name: "Void Horror",
            title: "The Unmaker",
            size: { width: 2, height: 2 },
            baseHealth: 400,
            healthPerFloor: 80,
            baseDamage: 35,
            armor: 10,
            moveSpeed: 2,
            element: 'void',

            phases: [
                {
                    name: "Manifest",
                    healthThreshold: 1.0,
                    attackPattern: 'ranged',
                    corruptionRadius: 3
                },
                {
                    name: "Unleashed",
                    healthThreshold: 0.4,
                    attackPattern: 'all',
                    corruptionRadius: 6,
                    description: "The Void Horror tears reality asunder!"
                }
            ],

            attacks: {
                'void_bolt': {
                    damage: 20,
                    range: 8,
                    projectile: true,
                    telegraphTime: 500,
                    cooldown: 2000,
                    pattern: 'ranged'
                },
                'corruption_wave': {
                    damage: 25,
                    aoe: { shape: 'cone', angle: 90, range: 5 },
                    telegraphTime: 1000,
                    cooldown: 6000,
                    effect: 'spread_corruption',
                    pattern: 'all'
                },
                'phase_shift': {
                    cooldown: 8000,
                    effect: 'teleport',
                    pattern: 'all'
                }
            },

            immunities: ['void'],
            resistances: {},
            weaknesses: { holy: 0.5 }
        }
    },

    // ========================================================================
    // CORE METHODS
    // ========================================================================

    /**
     * Spawn a boss
     * @param {string} templateId - Boss template ID
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @param {object} overrides - Optional property overrides
     * @returns {string} - Boss ID
     */
    spawn(templateId, x, y, overrides = {}) {
        const template = this.BOSS_TEMPLATES[templateId];
        if (!template) {
            console.error(`[Boss] Unknown template: ${templateId}`);
            return null;
        }

        // Calculate floor-scaled stats
        const floorBonus = 1 + (game.floor - 1) * 0.1;
        const healthBonus = (game.floor - 1) * template.healthPerFloor;

        const boss = {
            id: `boss_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            templateId: templateId,
            isBoss: true,

            // Display
            name: overrides.name ?? template.name,
            title: overrides.title ?? template.title,

            // Position
            gridX: x,
            gridY: y,
            displayX: x,
            displayY: y,
            size: template.size,

            // Stats
            hp: Math.floor((template.baseHealth + healthBonus) * (overrides.healthMod ?? 1)),
            maxHp: Math.floor((template.baseHealth + healthBonus) * (overrides.healthMod ?? 1)),
            damage: Math.floor(template.baseDamage * floorBonus),
            armor: template.armor,
            baseMoveSpeed: template.moveSpeed,
            moveSpeed: template.moveSpeed,
            element: template.element,
            isStationary: template.isStationary ?? false,

            // Combat
            immunities: [...(template.immunities || [])],
            resistances: { ...(template.resistances || {}) },
            weaknesses: { ...(template.weaknesses || {}) },

            // Phases
            phases: JSON.parse(JSON.stringify(template.phases)),
            currentPhase: 0,
            phaseTransitioning: false,

            // Attacks
            attacks: JSON.parse(JSON.stringify(template.attacks)),
            attackCooldowns: {},
            currentAttack: null,
            attackTimer: 0,
            globalCooldown: 0,

            // State
            state: 'idle',       // idle, attacking, transitioning, stunned, dead
            target: null,
            aggro: new Map(),    // playerId -> threat

            // Visual
            visible: true,
            facingDirection: 'down',
            animationState: 'idle',

            // Loot
            loot: template.loot,

            // Callbacks
            onPhaseChange: overrides.onPhaseChange ?? null,
            onDeath: overrides.onDeath ?? null,
            onAttack: overrides.onAttack ?? null,

            // AI state
            lastPlayerPos: null,
            decisionTimer: 0
        };

        // Initialize attack cooldowns
        Object.keys(boss.attacks).forEach(attackId => {
            boss.attackCooldowns[attackId] = 0;
        });

        this.activeBosses.set(boss.id, boss);

        // Add to game enemies list
        game.enemies.push(boss);

        // Mark tiles on map
        this.markBossTiles(boss);

        // Register with AI if available
        if (typeof AIManager !== 'undefined') {
            // Boss uses custom AI, but register for tracking
            AIManager.registerEnemy(boss);
        }

        if (this.config.debugLogging) {
            console.log(`[Boss] Spawned ${template.name} at (${x}, ${y}) with ${boss.hp} HP`);
        }

        addMessage(`${boss.title} appears!`);

        return boss.id;
    },

    /**
     * Mark boss tiles on the map
     * @param {object} boss - The boss
     */
    markBossTiles(boss) {
        for (let dy = 0; dy < boss.size.height; dy++) {
            for (let dx = 0; dx < boss.size.width; dx++) {
                const x = Math.floor(boss.gridX) + dx;
                const y = Math.floor(boss.gridY) + dy;
                if (game.map[y]?.[x]) {
                    game.map[y][x].boss = boss.id;
                    game.map[y][x].blocked = true;
                }
            }
        }
    },

    /**
     * Clear boss tiles from map
     * @param {object} boss - The boss
     */
    clearBossTiles(boss) {
        for (let dy = 0; dy < boss.size.height; dy++) {
            for (let dx = 0; dx < boss.size.width; dx++) {
                const x = Math.floor(boss.gridX) + dx;
                const y = Math.floor(boss.gridY) + dy;
                if (game.map[y]?.[x]) {
                    delete game.map[y][x].boss;
                    game.map[y][x].blocked = false;
                }
            }
        }
    },

    /**
     * Get a boss by ID
     * @param {string} bossId - The boss ID
     * @returns {object|null}
     */
    get(bossId) {
        return this.activeBosses.get(bossId) || null;
    },

    // ========================================================================
    // PHASE MANAGEMENT
    // ========================================================================

    /**
     * Check and handle phase transitions
     * @param {object} boss - The boss
     */
    checkPhaseTransition(boss) {
        if (boss.phaseTransitioning || boss.state === 'dead') return;

        const healthPercent = boss.hp / boss.maxHp;
        const currentPhase = boss.phases[boss.currentPhase];
        const nextPhaseIndex = boss.currentPhase + 1;

        if (nextPhaseIndex >= boss.phases.length) return;

        const nextPhase = boss.phases[nextPhaseIndex];
        if (healthPercent <= nextPhase.healthThreshold) {
            this.transitionToPhase(boss, nextPhaseIndex);
        }
    },

    /**
     * Transition boss to a new phase
     * @param {object} boss - The boss
     * @param {number} phaseIndex - New phase index
     */
    transitionToPhase(boss, phaseIndex) {
        boss.phaseTransitioning = true;
        boss.state = 'transitioning';

        const oldPhase = boss.phases[boss.currentPhase];
        const newPhase = boss.phases[phaseIndex];
        boss.currentPhase = phaseIndex;

        // Apply phase modifiers
        if (newPhase.moveSpeedMod) {
            boss.moveSpeed = boss.baseMoveSpeed * newPhase.moveSpeedMod;
        }

        // Display phase change message
        if (newPhase.description) {
            addMessage(newPhase.description);
        } else {
            addMessage(`${boss.name} enters ${newPhase.name} phase!`);
        }

        // Callback
        if (boss.onPhaseChange) {
            boss.onPhaseChange(boss, oldPhase, newPhase);
        }

        // Brief invulnerability during transition
        setTimeout(() => {
            boss.phaseTransitioning = false;
            boss.state = 'idle';
        }, 1000);

        if (this.config.debugLogging) {
            console.log(`[Boss] ${boss.name} transitioned to ${newPhase.name}`);
        }
    },

    // ========================================================================
    // ATTACK SYSTEM
    // ========================================================================

    /**
     * Select and execute an attack
     * @param {object} boss - The boss
     * @param {number} dt - Delta time
     */
    processAttacks(boss, dt) {
        if (boss.state === 'transitioning' || boss.state === 'dead') return;

        // Update cooldowns
        boss.globalCooldown = Math.max(0, boss.globalCooldown - dt);
        Object.keys(boss.attackCooldowns).forEach(attackId => {
            boss.attackCooldowns[attackId] = Math.max(0, boss.attackCooldowns[attackId] - dt);
        });

        // If currently attacking, process attack timer
        if (boss.currentAttack) {
            boss.attackTimer -= dt;
            if (boss.attackTimer <= 0) {
                this.executeAttack(boss, boss.currentAttack);
                boss.currentAttack = null;
                boss.state = 'idle';
            }
            return;
        }

        // Don't start new attack if on global cooldown
        if (boss.globalCooldown > 0) return;

        // Select attack based on current phase pattern
        const attack = this.selectAttack(boss);
        if (attack) {
            this.startAttack(boss, attack);
        }
    },

    /**
     * Select an attack for the boss
     * @param {object} boss - The boss
     * @returns {object|null} - Attack to use
     */
    selectAttack(boss) {
        if (!game.player) return null;

        const currentPhase = boss.phases[boss.currentPhase];
        const pattern = currentPhase.attackPattern || 'all';

        // Filter available attacks
        const available = Object.entries(boss.attacks).filter(([id, attack]) => {
            // Check cooldown
            if (boss.attackCooldowns[id] > 0) return false;

            // Check pattern
            if (attack.pattern !== 'all' && attack.pattern !== pattern) return false;

            // Check range if applicable
            if (attack.range) {
                const dist = this.getDistanceToPlayer(boss);
                if (dist > attack.range) return false;
            }

            return true;
        });

        if (available.length === 0) return null;

        // Random selection (could be weighted)
        const [attackId, attack] = available[Math.floor(Math.random() * available.length)];
        return { id: attackId, ...attack };
    },

    /**
     * Start an attack (show telegraph)
     * @param {object} boss - The boss
     * @param {object} attack - Attack to start
     */
    startAttack(boss, attack) {
        boss.state = 'attacking';
        boss.currentAttack = attack;
        boss.attackTimer = attack.telegraphTime || this.config.telegraphDisplayTime;

        // Create telegraph
        if (attack.aoe) {
            this.createTelegraph(boss, attack);
        }

        // Set cooldown
        boss.attackCooldowns[attack.id] = attack.cooldown;
        boss.globalCooldown = 1000;  // Brief global cooldown

        // Callback
        if (boss.onAttack) {
            boss.onAttack(boss, attack, 'start');
        }

        if (this.config.debugLogging) {
            console.log(`[Boss] ${boss.name} starting ${attack.id}`);
        }
    },

    /**
     * Execute an attack (deal damage)
     * @param {object} boss - The boss
     * @param {object} attack - Attack to execute
     */
    executeAttack(boss, attack) {
        if (!game.player) return;

        // Remove telegraph
        this.removeTelegraph(boss.id);

        const currentPhase = boss.phases[boss.currentPhase];
        const damageMod = currentPhase.damageMod || 1.0;
        const damage = Math.floor((attack.damage || boss.damage) * damageMod);

        // Check if player is in AOE
        const inAoe = this.isInAttackArea(boss, attack, game.player.gridX, game.player.gridY);

        if (inAoe) {
            game.player.hp -= damage;
            addMessage(`${boss.name} hits you with ${attack.id} for ${damage} damage!`);

            if (attack.stunOnHit) {
                game.player.stunned = true;
                game.player.stunnedTimer = 1000;
            }

            if (game.player.hp <= 0) {
                game.state = 'gameover';
            }
        }

        // Execute special effects
        if (attack.effect) {
            this.executeAttackEffect(boss, attack);
        }

        // Callback
        if (boss.onAttack) {
            boss.onAttack(boss, attack, 'execute');
        }

        if (this.config.debugLogging) {
            console.log(`[Boss] ${boss.name} executed ${attack.id}, hit: ${inAoe}`);
        }
    },

    /**
     * Execute special attack effects
     * @param {object} boss - The boss
     * @param {object} attack - The attack
     */
    executeAttackEffect(boss, attack) {
        switch (attack.effect) {
            case 'activate_traps':
                // Activate traps in range (for LOCKDOWN Warden)
                if (typeof TrapSystem !== 'undefined') {
                    TrapSystem.activateInRadius(boss.gridX, boss.gridY, attack.range || 10);
                }
                break;

            case 'spawn_guard':
                // Spawn vampire guards (for ECLIPSE Blood Altar)
                if (typeof SpawnPointSystem !== 'undefined') {
                    // Spawn logic here
                }
                break;

            case 'spread_corruption':
                // Spread corruption tiles (for BREACH Void Horror)
                if (typeof DynamicTileSystem !== 'undefined') {
                    DynamicTileSystem.applyRadialSpread(
                        boss.gridX, boss.gridY,
                        'corrupted',
                        0, 5,
                        { source: boss.id }
                    );
                }
                break;

            case 'teleport':
                // Teleport to random location
                this.teleportBoss(boss);
                break;
        }
    },

    /**
     * Teleport boss to a new location
     * @param {object} boss - The boss
     */
    teleportBoss(boss) {
        if (boss.isStationary) return;

        // Find valid teleport location
        const attempts = 20;
        for (let i = 0; i < attempts; i++) {
            const room = game.rooms[Math.floor(Math.random() * game.rooms.length)];
            const x = room.floorX + Math.floor(Math.random() * (room.floorWidth - boss.size.width));
            const y = room.floorY + Math.floor(Math.random() * (room.floorHeight - boss.size.height));

            if (this.canPlaceBoss(boss, x, y)) {
                this.clearBossTiles(boss);
                boss.gridX = x;
                boss.gridY = y;
                boss.displayX = x;
                boss.displayY = y;
                this.markBossTiles(boss);
                addMessage(`${boss.name} shifts through the void!`);
                return;
            }
        }
    },

    /**
     * Check if boss can be placed at position
     * @param {object} boss - The boss
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {boolean}
     */
    canPlaceBoss(boss, x, y) {
        for (let dy = 0; dy < boss.size.height; dy++) {
            for (let dx = 0; dx < boss.size.width; dx++) {
                const checkX = x + dx;
                const checkY = y + dy;
                const tile = game.map[checkY]?.[checkX];
                if (!tile || tile.type !== 'floor' || tile.blocked) {
                    return false;
                }
            }
        }
        return true;
    },

    // ========================================================================
    // TELEGRAPH SYSTEM
    // ========================================================================

    /**
     * Create attack telegraph
     * @param {object} boss - The boss
     * @param {object} attack - The attack
     */
    createTelegraph(boss, attack) {
        const telegraph = {
            bossId: boss.id,
            attackId: attack.id,
            aoe: attack.aoe,
            centerX: boss.gridX + boss.size.width / 2,
            centerY: boss.gridY + boss.size.height / 2,
            targetX: game.player?.gridX ?? boss.gridX,
            targetY: game.player?.gridY ?? boss.gridY,
            timer: attack.telegraphTime,
            maxTimer: attack.telegraphTime
        };

        this.telegraphs.push(telegraph);
    },

    /**
     * Remove telegraph for a boss
     * @param {string} bossId - The boss ID
     */
    removeTelegraph(bossId) {
        this.telegraphs = this.telegraphs.filter(t => t.bossId !== bossId);
    },

    /**
     * Check if position is in attack area
     * @param {object} boss - The boss
     * @param {object} attack - The attack
     * @param {number} x - Position X
     * @param {number} y - Position Y
     * @returns {boolean}
     */
    isInAttackArea(boss, attack, x, y) {
        if (!attack.aoe) return false;

        const centerX = boss.gridX + boss.size.width / 2;
        const centerY = boss.gridY + boss.size.height / 2;
        const dist = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

        switch (attack.aoe.shape) {
            case 'circle':
                return dist <= attack.aoe.radius;

            case 'ring':
                return dist >= attack.aoe.innerRadius && dist <= attack.aoe.outerRadius;

            case 'line':
                // Check if point is along the line to target
                const targetX = game.player?.gridX ?? centerX;
                const targetY = game.player?.gridY ?? centerY;
                const lineLen = Math.sqrt((targetX - centerX) ** 2 + (targetY - centerY) ** 2);
                if (lineLen === 0) return false;

                const lineDirX = (targetX - centerX) / lineLen;
                const lineDirY = (targetY - centerY) / lineLen;

                // Project point onto line
                const projection = (x - centerX) * lineDirX + (y - centerY) * lineDirY;
                if (projection < 0 || projection > lineLen) return false;

                // Check perpendicular distance
                const perpDist = Math.abs((x - centerX) * lineDirY - (y - centerY) * lineDirX);
                return perpDist <= (attack.aoe.width / 2);

            case 'cone':
                // Check angle and distance
                if (dist > attack.aoe.range) return false;
                const angle = Math.atan2(y - centerY, x - centerX) * (180 / Math.PI);
                const targetAngle = Math.atan2(
                    (game.player?.gridY ?? centerY) - centerY,
                    (game.player?.gridX ?? centerX) - centerX
                ) * (180 / Math.PI);
                let angleDiff = Math.abs(angle - targetAngle);
                if (angleDiff > 180) angleDiff = 360 - angleDiff;
                return angleDiff <= attack.aoe.angle / 2;

            default:
                return false;
        }
    },

    // ========================================================================
    // DAMAGE & DEATH
    // ========================================================================

    /**
     * Damage a boss
     * @param {string} bossId - The boss ID
     * @param {number} amount - Damage amount
     * @param {object} source - Damage source
     * @returns {boolean} - True if boss died
     */
    damage(bossId, amount, source = null) {
        const boss = this.activeBosses.get(bossId);
        if (!boss || boss.state === 'dead') return false;

        // Apply armor reduction
        const armorReduction = boss.armor / (boss.armor + 100);
        const actualDamage = Math.floor(amount * (1 - armorReduction));

        // Apply resistances/weaknesses
        let finalDamage = actualDamage;
        if (source?.element) {
            if (boss.resistances[source.element]) {
                finalDamage = Math.floor(actualDamage * (1 - boss.resistances[source.element]));
            }
            if (boss.weaknesses[source.element]) {
                finalDamage = Math.floor(actualDamage * (1 + boss.weaknesses[source.element]));
            }
        }

        // Don't damage during phase transition
        if (boss.phaseTransitioning) {
            finalDamage = 0;
        }

        boss.hp -= finalDamage;

        // Check phase transition
        this.checkPhaseTransition(boss);

        // Check death
        if (boss.hp <= 0) {
            this.kill(bossId);
            return true;
        }

        return false;
    },

    /**
     * Kill a boss
     * @param {string} bossId - The boss ID
     */
    kill(bossId) {
        const boss = this.activeBosses.get(bossId);
        if (!boss) return;

        boss.state = 'dead';
        boss.hp = 0;
        boss.visible = false;

        // Clear tiles
        this.clearBossTiles(boss);

        // Remove telegraphs
        this.removeTelegraph(bossId);

        // Drop loot
        if (boss.loot) {
            if (boss.loot.bonus?.gold) {
                game.gold += boss.loot.bonus.gold;
            }
            if (boss.loot.bonus?.xp && game.player) {
                // Apply XP
            }
        }

        // Callback
        if (boss.onDeath) {
            boss.onDeath(boss);
        }

        // Remove from game enemies
        const enemyIndex = game.enemies.indexOf(boss);
        if (enemyIndex !== -1) {
            game.enemies.splice(enemyIndex, 1);
        }

        addMessage(`${boss.title} has been defeated!`);

        if (this.config.debugLogging) {
            console.log(`[Boss] ${boss.name} killed`);
        }
    },

    // ========================================================================
    // MOVEMENT
    // ========================================================================

    /**
     * Move boss toward target
     * @param {object} boss - The boss
     * @param {number} dt - Delta time
     */
    processMovement(boss, dt) {
        if (boss.isStationary || boss.state !== 'idle') return;
        if (!game.player) return;

        const dist = this.getDistanceToPlayer(boss);

        // Move toward player if too far
        if (dist > 3) {
            const dx = game.player.gridX - boss.gridX;
            const dy = game.player.gridY - boss.gridY;
            const len = Math.sqrt(dx * dx + dy * dy);

            const moveX = (dx / len) * boss.moveSpeed * (dt / 1000);
            const moveY = (dy / len) * boss.moveSpeed * (dt / 1000);

            const newX = boss.gridX + moveX;
            const newY = boss.gridY + moveY;

            if (this.canPlaceBoss(boss, Math.floor(newX), Math.floor(newY))) {
                this.clearBossTiles(boss);
                boss.gridX = newX;
                boss.gridY = newY;
                boss.displayX = newX;
                boss.displayY = newY;
                this.markBossTiles(boss);

                // Update facing
                if (Math.abs(dx) > Math.abs(dy)) {
                    boss.facingDirection = dx > 0 ? 'right' : 'left';
                } else {
                    boss.facingDirection = dy > 0 ? 'down' : 'up';
                }
            }
        }
    },

    /**
     * Get distance from boss center to player
     * @param {object} boss - The boss
     * @returns {number}
     */
    getDistanceToPlayer(boss) {
        if (!game.player) return Infinity;

        const bossX = boss.gridX + boss.size.width / 2;
        const bossY = boss.gridY + boss.size.height / 2;

        return Math.sqrt(
            (game.player.gridX - bossX) ** 2 +
            (game.player.gridY - bossY) ** 2
        );
    },

    // ========================================================================
    // UPDATE & LIFECYCLE
    // ========================================================================

    /**
     * Update all bosses
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        this.activeBosses.forEach((boss, id) => {
            if (boss.state === 'dead') return;

            // Process movement
            this.processMovement(boss, dt);

            // Process attacks
            this.processAttacks(boss, dt);
        });

        // Update telegraphs
        for (let i = this.telegraphs.length - 1; i >= 0; i--) {
            this.telegraphs[i].timer -= dt;
        }
    },

    /**
     * Cleanup all bosses
     */
    cleanup() {
        this.activeBosses.forEach((boss, id) => {
            this.clearBossTiles(boss);

            // Remove from game enemies
            const enemyIndex = game.enemies.indexOf(boss);
            if (enemyIndex !== -1) {
                game.enemies.splice(enemyIndex, 1);
            }
        });

        this.activeBosses.clear();
        this.telegraphs = [];

        if (this.config.debugLogging) {
            console.log('[Boss] System cleaned up');
        }
    },

    // ========================================================================
    // QUERY METHODS
    // ========================================================================

    /**
     * Get all active bosses
     * @returns {Array}
     */
    getAll() {
        return Array.from(this.activeBosses.values());
    },

    /**
     * Get boss at position
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {object|null}
     */
    getAtPosition(x, y) {
        for (const [id, boss] of this.activeBosses) {
            if (x >= boss.gridX && x < boss.gridX + boss.size.width &&
                y >= boss.gridY && y < boss.gridY + boss.size.height) {
                return boss;
            }
        }
        return null;
    },

    /**
     * Check if any boss is alive
     * @returns {boolean}
     */
    hasAliveBoss() {
        for (const [id, boss] of this.activeBosses) {
            if (boss.state !== 'dead') return true;
        }
        return false;
    },

    // ========================================================================
    // DEBUG
    // ========================================================================

    getStatus() {
        const status = {
            activeBosses: this.activeBosses.size,
            telegraphs: this.telegraphs.length,
            bosses: []
        };

        this.activeBosses.forEach(boss => {
            status.bosses.push({
                name: boss.name,
                hp: `${boss.hp}/${boss.maxHp}`,
                phase: boss.phases[boss.currentPhase]?.name,
                state: boss.state
            });
        });

        return status;
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const BossSystemDef = {
    name: 'boss-system',

    init() {
        if (BossSystem.config.debugLogging) {
            console.log('[Boss] System initialized');
        }
    },

    update(dt) {
        BossSystem.update(dt);
    },

    cleanup() {
        BossSystem.cleanup();
    }
};

// Register with SystemManager (priority 39 - with enemy AI)
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('boss-system', BossSystemDef, 39);
} else {
    console.warn('[Boss] SystemManager not found - running standalone');
}

// ============================================================================
// EXPORTS
// ============================================================================
window.BossSystem = BossSystem;

console.log('✅ Boss System loaded');
