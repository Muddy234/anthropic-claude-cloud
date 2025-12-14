// === js/entities/malphas-boss.js ===
// THE BLEEDING EARTH: Malphas, The Heart of the World - Final Boss

// ============================================================================
// MALPHAS CONFIGURATION
// ============================================================================

const MALPHAS_CONFIG = {
    // Core stats
    name: 'Malphas, Heart of the World',
    title: 'The Bound Titan',
    floor: 10,

    // Health scaling
    baseHealth: 5000,
    healthPerPlayerLevel: 200,

    // Not a humanoid - a massive stationary heart
    isStationary: true,
    size: { width: 5, height: 5 },  // 5x5 tile entity
    color: '#8B0000',
    glowColor: '#FF4500',

    // Combat
    baseDamage: 40,
    attackCooldown: 2.0,  // seconds

    // Phases
    phases: [
        { threshold: 1.0, name: 'Dormant Awakening' },
        { threshold: 0.75, name: 'Raging Pulse' },
        { threshold: 0.50, name: 'Desperate Thrashing' },
        { threshold: 0.25, name: 'Final Heartbeat' }
    ],

    // Lava Vents (healing mechanic)
    vents: {
        count: 4,
        healPerSecond: 50,
        health: 500,
        respawnTime: 30  // seconds after destroyed
    },

    // Minion spawning
    minions: {
        spawnInterval: 15,  // seconds
        maxActive: 6,
        types: ['magma_elemental', 'obsidian_golem', 'ember_sprite']
    },

    // Environmental hazards
    hazards: {
        lavaSurge: { damage: 30, interval: 10, warning: 2 },
        groundSlam: { damage: 50, interval: 20, radius: 3 },
        fireRain: { damage: 15, interval: 5, duration: 3 }
    }
};

// ============================================================================
// MALPHAS BOSS ENTITY
// ============================================================================

const MalphasBoss = {

    // State
    active: false,
    entity: null,
    vents: [],
    minions: [],
    currentPhase: 0,
    timers: {
        attack: 0,
        minionSpawn: 0,
        lavaSurge: 0,
        groundSlam: 0,
        fireRain: 0
    },

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Create and spawn Malphas
     * @param {number} playerLevel
     * @returns {Object} The boss entity
     */
    spawn(playerLevel = 10) {
        const config = MALPHAS_CONFIG;

        // Calculate scaled health
        const scaledHealth = config.baseHealth + (playerLevel * config.healthPerPlayerLevel);

        // Create boss entity
        this.entity = {
            id: 'malphas',
            name: config.name,
            title: config.title,
            type: 'boss',
            subtype: 'titan',

            // Position (center of arena)
            gridX: 25,
            gridY: 20,
            displayX: 25,
            displayY: 20,

            // Size
            width: config.size.width,
            height: config.size.height,

            // Stats
            hp: scaledHealth,
            maxHp: scaledHealth,
            damage: config.baseDamage,
            defense: 20,

            // Flags
            isStationary: true,
            isBoss: true,
            isFinalBoss: true,
            invulnerable: false,  // Becomes true when vents are active

            // Visuals
            color: config.color,
            glowColor: config.glowColor,
            glowIntensity: 0.5,
            pulseRate: 1.0,  // Heartbeat pulse

            // Phase tracking
            phase: 0,
            phaseTransitioning: false,

            // Combat state
            lastAttackTime: 0,
            attackPattern: 'pulse',
            enraged: false
        };

        // Spawn lava vents
        this._spawnVents();

        // Initialize timers
        this.timers = {
            attack: 0,
            minionSpawn: 5,  // First spawn after 5 seconds
            lavaSurge: 10,
            groundSlam: 20,
            fireRain: 15
        };

        this.active = true;
        this.currentPhase = 0;
        this.minions = [];

        console.log(`[Malphas] Spawned with ${scaledHealth} HP`);

        // Trigger ENDGAME state if not already
        if (typeof WorldStateSystem !== 'undefined') {
            WorldStateSystem.checkFloorEntryProgression(10);
        }

        return this.entity;
    },

    /**
     * Spawn lava vents around the boss
     * @private
     */
    _spawnVents() {
        const config = MALPHAS_CONFIG.vents;
        const bossX = this.entity.gridX;
        const bossY = this.entity.gridY;

        // Place vents in cardinal directions
        const ventPositions = [
            { x: bossX - 6, y: bossY },      // West
            { x: bossX + 6, y: bossY },      // East
            { x: bossX, y: bossY - 6 },      // North
            { x: bossX, y: bossY + 6 }       // South
        ];

        this.vents = ventPositions.map((pos, i) => ({
            id: `vent_${i}`,
            gridX: pos.x,
            gridY: pos.y,
            hp: config.health,
            maxHp: config.health,
            active: true,
            healPerSecond: config.healPerSecond,
            respawnTimer: 0,
            color: '#FF6347',
            glowColor: '#FF4500'
        }));

        console.log(`[Malphas] Spawned ${this.vents.length} lava vents`);
    },

    // ========================================================================
    // UPDATE LOOP
    // ========================================================================

    /**
     * Update Malphas each frame
     * @param {number} deltaTime - Time since last frame (ms)
     */
    update(deltaTime) {
        if (!this.active || !this.entity) return;

        const dt = deltaTime / 1000;  // Convert to seconds

        // Update heartbeat pulse
        this._updatePulse(dt);

        // Check phase transitions
        this._checkPhaseTransition();

        // Update vent healing
        this._updateVents(dt);

        // Update attack timers
        this._updateAttacks(dt);

        // Update minion spawning
        this._updateMinions(dt);

        // Update environmental hazards
        this._updateHazards(dt);
    },

    /**
     * Update heartbeat visual pulse
     * @private
     */
    _updatePulse(dt) {
        const phase = this.currentPhase;
        const pulseSpeed = 1.0 + (phase * 0.5);  // Faster heartbeat as health decreases

        this.entity.pulsePhase = (this.entity.pulsePhase || 0) + dt * pulseSpeed * Math.PI * 2;
        this.entity.glowIntensity = 0.3 + Math.sin(this.entity.pulsePhase) * 0.2;

        // Change color in later phases
        if (phase >= 3) {
            this.entity.glowColor = '#FFFFFF';  // White-hot in final phase
        } else if (phase >= 2) {
            this.entity.glowColor = '#FFD700';  // Gold
        }
    },

    /**
     * Check for phase transitions
     * @private
     */
    _checkPhaseTransition() {
        const healthPercent = this.entity.hp / this.entity.maxHp;
        const phases = MALPHAS_CONFIG.phases;

        for (let i = phases.length - 1; i >= 0; i--) {
            if (healthPercent <= phases[i].threshold && this.currentPhase < i) {
                this._enterPhase(i);
                break;
            }
        }
    },

    /**
     * Enter a new combat phase
     * @param {number} phase
     * @private
     */
    _enterPhase(phase) {
        const phases = MALPHAS_CONFIG.phases;
        const phaseName = phases[phase].name;

        console.log(`[Malphas] Entering phase ${phase}: ${phaseName}`);
        this.currentPhase = phase;
        this.entity.phase = phase;
        this.entity.phaseTransitioning = true;

        // Phase-specific effects
        if (typeof addMessage === 'function') {
            addMessage(`Malphas: ${phaseName}`, 'boss');
        }

        // Increase aggression
        this.entity.damage = MALPHAS_CONFIG.baseDamage * (1 + phase * 0.25);

        // Screen shake on phase transition
        if (typeof CombatEnhancements !== 'undefined') {
            CombatEnhancements.applyScreenShake(0.5 + phase * 0.2, 500);
        }

        // Spawn extra minions on phase change
        if (phase >= 2) {
            this._spawnMinion();
            this._spawnMinion();
        }

        setTimeout(() => {
            this.entity.phaseTransitioning = false;
        }, 1000);
    },

    /**
     * Update lava vent healing
     * @private
     */
    _updateVents(dt) {
        const config = MALPHAS_CONFIG.vents;
        let activeVents = 0;

        this.vents.forEach(vent => {
            if (vent.active && vent.hp > 0) {
                activeVents++;

                // Heal Malphas
                const healAmount = vent.healPerSecond * dt;
                this.entity.hp = Math.min(this.entity.maxHp, this.entity.hp + healAmount);
            } else if (!vent.active && vent.respawnTimer > 0) {
                // Vent is respawning
                vent.respawnTimer -= dt;
                if (vent.respawnTimer <= 0) {
                    vent.hp = config.health;
                    vent.active = true;
                    if (typeof addMessage === 'function') {
                        addMessage('A lava vent erupts back to life!', 'warning');
                    }
                }
            }
        });

        // Malphas is invulnerable while vents are active
        this.entity.invulnerable = activeVents > 0;

        if (activeVents > 0 && this.entity.hp < this.entity.maxHp) {
            // Visual feedback that boss is healing
            this.entity.isHealing = true;
        } else {
            this.entity.isHealing = false;
        }
    },

    /**
     * Update attack patterns
     * @private
     */
    _updateAttacks(dt) {
        this.timers.attack -= dt;

        if (this.timers.attack <= 0) {
            this._performAttack();
            this.timers.attack = MALPHAS_CONFIG.attackCooldown / (1 + this.currentPhase * 0.2);
        }
    },

    /**
     * Perform an attack
     * @private
     */
    _performAttack() {
        if (!game?.player) return;

        const phase = this.currentPhase;
        const attacks = ['pulse', 'lava_burst', 'summon_wave'];

        // Choose attack based on phase
        let attack = attacks[0];
        if (phase >= 2) {
            attack = attacks[Math.floor(Math.random() * attacks.length)];
        } else if (phase >= 1) {
            attack = attacks[Math.floor(Math.random() * 2)];
        }

        switch (attack) {
            case 'pulse':
                this._attackPulse();
                break;
            case 'lava_burst':
                this._attackLavaBurst();
                break;
            case 'summon_wave':
                this._spawnMinion();
                break;
        }
    },

    /**
     * Pulse attack - damages nearby players
     * @private
     */
    _attackPulse() {
        if (!game?.player) return;

        const bossX = this.entity.gridX + this.entity.width / 2;
        const bossY = this.entity.gridY + this.entity.height / 2;
        const playerX = game.player.gridX;
        const playerY = game.player.gridY;

        const dist = Math.sqrt((bossX - playerX) ** 2 + (bossY - playerY) ** 2);
        const range = 8 + this.currentPhase * 2;

        if (dist <= range) {
            const damage = Math.floor(this.entity.damage * (1 - dist / range * 0.5));
            if (typeof game.player.takeDamage === 'function') {
                game.player.takeDamage(damage, 'fire');
            } else {
                game.player.hp -= damage;
            }

            if (typeof addMessage === 'function') {
                addMessage(`Malphas pulses with heat! ${damage} fire damage!`, 'combat');
            }
        }
    },

    /**
     * Lava burst - creates lava tiles
     * @private
     */
    _attackLavaBurst() {
        if (!game?.map) return;

        const burstCount = 3 + this.currentPhase;
        const mapWidth = game.map[0]?.length || 50;
        const mapHeight = game.map.length || 40;

        for (let i = 0; i < burstCount; i++) {
            const x = Math.floor(Math.random() * (mapWidth - 4)) + 2;
            const y = Math.floor(Math.random() * (mapHeight - 4)) + 2;

            if (game.map[y]?.[x] && game.map[y][x].type === 'floor') {
                game.map[y][x].type = 'lava';
                game.map[y][x].lavaTimer = 5;  // Lava lasts 5 seconds

                // Create lava in small area
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        if (game.map[y + dy]?.[x + dx]?.type === 'floor') {
                            game.map[y + dy][x + dx].type = 'lava';
                            game.map[y + dy][x + dx].lavaTimer = 5;
                        }
                    }
                }
            }
        }

        if (typeof addMessage === 'function') {
            addMessage('Lava erupts from the ground!', 'warning');
        }
    },

    /**
     * Update minion spawning
     * @private
     */
    _updateMinions(dt) {
        this.timers.minionSpawn -= dt;

        // Clean up dead minions
        this.minions = this.minions.filter(m => m.hp > 0);

        if (this.timers.minionSpawn <= 0 && this.minions.length < MALPHAS_CONFIG.minions.maxActive) {
            this._spawnMinion();
            this.timers.minionSpawn = MALPHAS_CONFIG.minions.spawnInterval / (1 + this.currentPhase * 0.3);
        }
    },

    /**
     * Spawn a minion
     * @private
     */
    _spawnMinion() {
        const types = MALPHAS_CONFIG.minions.types;
        const type = types[Math.floor(Math.random() * types.length)];

        const angle = Math.random() * Math.PI * 2;
        const dist = 8 + Math.random() * 4;
        const x = Math.floor(this.entity.gridX + Math.cos(angle) * dist);
        const y = Math.floor(this.entity.gridY + Math.sin(angle) * dist);

        const minion = {
            id: `minion_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            type: type,
            name: this._getMinionName(type),
            gridX: x,
            gridY: y,
            hp: 100 + this.currentPhase * 50,
            maxHp: 100 + this.currentPhase * 50,
            damage: 15 + this.currentPhase * 5,
            isBossMinion: true,
            color: this._getMinionColor(type)
        };

        this.minions.push(minion);

        // Add to game enemies
        if (game?.enemies) {
            game.enemies.push(minion);
        }

        console.log(`[Malphas] Spawned minion: ${minion.name}`);
    },

    _getMinionName(type) {
        const names = {
            'magma_elemental': 'Magma Elemental',
            'obsidian_golem': 'Obsidian Golem',
            'ember_sprite': 'Ember Sprite'
        };
        return names[type] || 'Fire Minion';
    },

    _getMinionColor(type) {
        const colors = {
            'magma_elemental': '#FF4500',
            'obsidian_golem': '#2F2F2F',
            'ember_sprite': '#FFD700'
        };
        return colors[type] || '#FF6347';
    },

    /**
     * Update environmental hazards
     * @private
     */
    _updateHazards(dt) {
        // Ground slam
        this.timers.groundSlam -= dt;
        if (this.timers.groundSlam <= 0 && this.currentPhase >= 1) {
            this._hazardGroundSlam();
            this.timers.groundSlam = MALPHAS_CONFIG.hazards.groundSlam.interval;
        }

        // Fire rain (later phases)
        this.timers.fireRain -= dt;
        if (this.timers.fireRain <= 0 && this.currentPhase >= 2) {
            this._hazardFireRain();
            this.timers.fireRain = MALPHAS_CONFIG.hazards.fireRain.interval;
        }
    },

    _hazardGroundSlam() {
        if (typeof addMessage === 'function') {
            addMessage('The ground shakes violently!', 'warning');
        }

        if (typeof CombatEnhancements !== 'undefined') {
            CombatEnhancements.applyScreenShake(0.8, 800);
        }

        // Damage all in range
        if (game?.player) {
            const dist = Math.sqrt(
                (this.entity.gridX - game.player.gridX) ** 2 +
                (this.entity.gridY - game.player.gridY) ** 2
            );

            if (dist <= MALPHAS_CONFIG.hazards.groundSlam.radius + 5) {
                const damage = MALPHAS_CONFIG.hazards.groundSlam.damage;
                game.player.hp -= damage;
                if (typeof addMessage === 'function') {
                    addMessage(`Ground slam hits for ${damage} damage!`, 'combat');
                }
            }
        }
    },

    _hazardFireRain() {
        if (typeof addMessage === 'function') {
            addMessage('Fire rains from above!', 'warning');
        }

        // This would trigger particle effects and periodic damage
        // For now, just deal damage
        if (game?.player) {
            const damage = MALPHAS_CONFIG.hazards.fireRain.damage;
            game.player.hp -= damage;
        }
    },

    // ========================================================================
    // DAMAGE & DEATH
    // ========================================================================

    /**
     * Handle damage to a vent
     * @param {string} ventId
     * @param {number} damage
     */
    damageVent(ventId, damage) {
        const vent = this.vents.find(v => v.id === ventId);
        if (!vent || !vent.active) return;

        vent.hp -= damage;

        if (vent.hp <= 0) {
            vent.active = false;
            vent.respawnTimer = MALPHAS_CONFIG.vents.respawnTime;

            if (typeof addMessage === 'function') {
                addMessage('A lava vent collapses!', 'success');
            }

            // Check if all vents destroyed
            const activeVents = this.vents.filter(v => v.active).length;
            if (activeVents === 0) {
                if (typeof addMessage === 'function') {
                    addMessage('All vents destroyed! Malphas is vulnerable!', 'success');
                }
            }
        }
    },

    /**
     * Handle damage to Malphas
     * @param {number} damage
     * @returns {Object} Damage result
     */
    takeDamage(damage) {
        if (this.entity.invulnerable) {
            return {
                damage: 0,
                blocked: true,
                message: 'Malphas is protected by the lava vents!'
            };
        }

        this.entity.hp -= damage;

        if (this.entity.hp <= 0) {
            this.entity.hp = 0;
            this._onDefeat();
        }

        return {
            damage: damage,
            blocked: false,
            remainingHp: this.entity.hp
        };
    },

    /**
     * Handle Malphas defeat
     * @private
     */
    _onDefeat() {
        console.log('[Malphas] DEFEATED!');
        this.active = false;

        // Clear minions
        this.minions.forEach(m => {
            m.hp = 0;
        });

        // Trigger victory
        if (typeof WorldStateSystem !== 'undefined') {
            WorldStateSystem.onMalphasDefeated();
        }

        // Victory messages
        if (typeof addMessage === 'function') {
            addMessage('MALPHAS HAS FALLEN!', 'boss');
            setTimeout(() => addMessage('The Heart of the World grows still.', 'story'), 2000);
            setTimeout(() => addMessage('The volcano shudders... and sleeps.', 'story'), 4000);
            setTimeout(() => addMessage('Oakhaven is saved.', 'story'), 6000);
        }
    },

    // ========================================================================
    // QUERIES
    // ========================================================================

    isActive() {
        return this.active && this.entity?.hp > 0;
    },

    getHealthPercent() {
        if (!this.entity) return 0;
        return this.entity.hp / this.entity.maxHp;
    },

    getActiveVentCount() {
        return this.vents.filter(v => v.active).length;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.MALPHAS_CONFIG = MALPHAS_CONFIG;
window.MalphasBoss = MalphasBoss;

console.log('[Malphas] The Heart of the World boss loaded');
