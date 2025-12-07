// ============================================================================
// BOSS FRAMEWORK - Large, multi-phase boss enemies
// ============================================================================
// Handles boss entities with phases, special attacks, telegraphs, and
// unique mechanics for shift scenarios.
//
// MODULAR COMPONENT SYSTEM:
// Bosses can be composed from reusable components:
//   - ATTACK_COMPONENTS: Reusable attack patterns (slam, charge, projectile, etc.)
//   - BEHAVIOR_COMPONENTS: AI behaviors (aggressive, defensive, hit_and_run, etc.)
//   - MECHANIC_COMPONENTS: Special mechanics (enrage, immunity, summon, etc.)
//   - PHASE_PRESETS: Common phase configurations
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
    activeComponents: new Map(), // bossId -> Map of active component states

    // ========================================================================
    // ATTACK COMPONENT LIBRARY
    // ========================================================================
    // Reusable attack patterns that can be assigned to any boss
    ATTACK_COMPONENTS: {
        // === MELEE ATTACKS ===
        'melee_swing': {
            name: 'Melee Swing',
            damage: 20,
            range: 2,
            aoe: { shape: 'arc', angle: 120, radius: 2 },
            telegraphTime: 600,
            cooldown: 2000,
            category: 'melee',
            execute: (boss, attack, target) => {
                // Standard melee damage in arc
            }
        },

        'heavy_slam': {
            name: 'Heavy Slam',
            damage: 40,
            range: 3,
            aoe: { shape: 'circle', radius: 2.5 },
            telegraphTime: 1200,
            cooldown: 5000,
            category: 'melee',
            effect: 'knockback',
            knockbackForce: 3
        },

        'double_strike': {
            name: 'Double Strike',
            damage: 15,
            range: 2,
            hitCount: 2,
            hitDelay: 300,
            aoe: { shape: 'arc', angle: 90, radius: 2 },
            telegraphTime: 500,
            cooldown: 3000,
            category: 'melee'
        },

        'sweep': {
            name: 'Sweeping Attack',
            damage: 25,
            range: 3,
            aoe: { shape: 'arc', angle: 270, radius: 3 },
            telegraphTime: 1000,
            cooldown: 6000,
            category: 'melee'
        },

        // === CHARGE ATTACKS ===
        'charge': {
            name: 'Charge',
            damage: 35,
            range: 10,
            aoe: { shape: 'line', width: 2 },
            telegraphTime: 800,
            cooldown: 6000,
            category: 'charge',
            stunOnHit: true,
            stunDuration: 1000,
            moveDuringAttack: true
        },

        'leaping_strike': {
            name: 'Leaping Strike',
            damage: 45,
            range: 8,
            aoe: { shape: 'circle', radius: 2 },
            telegraphTime: 1000,
            cooldown: 8000,
            category: 'charge',
            effect: 'leap_to_target'
        },

        'bull_rush': {
            name: 'Bull Rush',
            damage: 30,
            range: 12,
            aoe: { shape: 'line', width: 3 },
            telegraphTime: 1200,
            cooldown: 10000,
            category: 'charge',
            wallCollisionDamage: 20,
            stunOnWall: true
        },

        // === RANGED ATTACKS ===
        'projectile_single': {
            name: 'Projectile',
            damage: 15,
            range: 12,
            projectile: true,
            projectileSpeed: 8,
            telegraphTime: 400,
            cooldown: 2000,
            category: 'ranged'
        },

        'projectile_burst': {
            name: 'Projectile Burst',
            damage: 12,
            range: 10,
            projectile: true,
            projectileCount: 3,
            projectileSpread: 30,
            projectileSpeed: 6,
            telegraphTime: 600,
            cooldown: 4000,
            category: 'ranged'
        },

        'projectile_volley': {
            name: 'Projectile Volley',
            damage: 10,
            range: 15,
            projectile: true,
            projectileCount: 8,
            projectileSpread: 360,
            projectileSpeed: 5,
            telegraphTime: 1000,
            cooldown: 8000,
            category: 'ranged'
        },

        'homing_orb': {
            name: 'Homing Orb',
            damage: 25,
            range: 20,
            projectile: true,
            homing: true,
            projectileSpeed: 4,
            homingStrength: 0.5,
            telegraphTime: 800,
            cooldown: 6000,
            category: 'ranged'
        },

        // === AOE ATTACKS ===
        'ground_slam': {
            name: 'Ground Slam',
            damage: 30,
            range: 4,
            aoe: { shape: 'circle', radius: 3 },
            telegraphTime: 1000,
            cooldown: 5000,
            category: 'aoe',
            effect: 'screen_shake'
        },

        'shockwave': {
            name: 'Shockwave',
            damage: 20,
            aoe: { shape: 'ring', innerRadius: 1, outerRadius: 6 },
            telegraphTime: 800,
            cooldown: 7000,
            category: 'aoe',
            knockback: true
        },

        'meteor': {
            name: 'Meteor Strike',
            damage: 50,
            aoe: { shape: 'circle', radius: 3 },
            telegraphTime: 2000,
            cooldown: 12000,
            category: 'aoe',
            targetLocation: 'player',
            effect: 'spawn_fire_pool'
        },

        'quake': {
            name: 'Quake',
            damage: 15,
            aoe: { shape: 'full_room' },
            telegraphTime: 1500,
            cooldown: 15000,
            category: 'aoe',
            avoidableBy: 'jumping'
        },

        // === BREATH/CONE ATTACKS ===
        'fire_breath': {
            name: 'Fire Breath',
            damage: 25,
            aoe: { shape: 'cone', angle: 60, range: 6 },
            telegraphTime: 1000,
            cooldown: 6000,
            category: 'breath',
            element: 'fire',
            lingering: true,
            lingerDuration: 3000
        },

        'frost_breath': {
            name: 'Frost Breath',
            damage: 20,
            aoe: { shape: 'cone', angle: 75, range: 5 },
            telegraphTime: 1000,
            cooldown: 6000,
            category: 'breath',
            element: 'ice',
            effect: 'slow',
            slowDuration: 3000,
            slowPercent: 0.5
        },

        'void_beam': {
            name: 'Void Beam',
            damage: 35,
            aoe: { shape: 'line', width: 1, range: 15 },
            telegraphTime: 1500,
            duration: 2000,
            cooldown: 10000,
            category: 'breath',
            element: 'void',
            continuous: true
        },

        // === SPECIAL ATTACKS ===
        'summon_minions': {
            name: 'Summon Minions',
            damage: 0,
            cooldown: 12000,
            category: 'summon',
            effect: 'spawn_enemies',
            spawnCount: 3,
            spawnType: 'basic'
        },

        'heal_pulse': {
            name: 'Healing Pulse',
            damage: 0,
            cooldown: 15000,
            category: 'support',
            effect: 'heal_self',
            healPercent: 0.1
        },

        'shield_barrier': {
            name: 'Shield Barrier',
            damage: 0,
            cooldown: 20000,
            category: 'defensive',
            effect: 'create_shield',
            shieldAmount: 100,
            shieldDuration: 5000
        },

        'berserk_roar': {
            name: 'Berserk Roar',
            damage: 0,
            aoe: { shape: 'circle', radius: 8 },
            cooldown: 25000,
            category: 'buff',
            effect: 'buff_self',
            buffDamageMod: 1.5,
            buffSpeedMod: 1.3,
            buffDuration: 10000
        },

        'trap_spawn': {
            name: 'Deploy Traps',
            damage: 0,
            cooldown: 10000,
            category: 'tactical',
            effect: 'spawn_traps',
            trapCount: 4,
            trapType: 'spike'
        },

        'teleport_strike': {
            name: 'Teleport Strike',
            damage: 40,
            aoe: { shape: 'circle', radius: 2 },
            telegraphTime: 500,
            cooldown: 8000,
            category: 'special',
            effect: 'teleport_behind_player'
        },

        'grab_throw': {
            name: 'Grab & Throw',
            damage: 30,
            range: 2,
            telegraphTime: 800,
            cooldown: 10000,
            category: 'special',
            effect: 'grab_and_throw',
            throwDistance: 5
        }
    },

    // ========================================================================
    // BEHAVIOR COMPONENT LIBRARY
    // ========================================================================
    // AI behavior patterns that control how bosses approach combat
    BEHAVIOR_COMPONENTS: {
        'aggressive': {
            name: 'Aggressive',
            description: 'Constantly pursues player, prefers melee',
            preferredRange: 2,
            chaseSpeed: 1.3,
            attackPriority: ['melee', 'charge', 'aoe'],
            retreatThreshold: 0,  // Never retreats
            update: (boss, dt, ctx) => {
                // Always move toward player
                const dist = ctx.distanceToPlayer;
                if (dist > 2) {
                    ctx.moveTowardPlayer(boss, dt, 1.3);
                }
                // Prefer close-range attacks
                return { preferClose: true };
            }
        },

        'defensive': {
            name: 'Defensive',
            description: 'Maintains distance, prefers ranged attacks',
            preferredRange: 8,
            chaseSpeed: 0.8,
            attackPriority: ['ranged', 'aoe', 'defensive'],
            retreatThreshold: 4,  // Retreat if player gets too close
            update: (boss, dt, ctx) => {
                const dist = ctx.distanceToPlayer;
                if (dist < 4) {
                    ctx.moveAwayFromPlayer(boss, dt, 1.0);
                    return { retreating: true };
                } else if (dist > 10) {
                    ctx.moveTowardPlayer(boss, dt, 0.8);
                }
                return { preferRanged: true };
            }
        },

        'hit_and_run': {
            name: 'Hit and Run',
            description: 'Attacks then retreats, uses charges',
            preferredRange: 6,
            chaseSpeed: 1.5,
            attackPriority: ['charge', 'melee', 'ranged'],
            retreatAfterAttack: true,
            update: (boss, dt, ctx) => {
                // State machine: approach -> attack -> retreat
                if (!boss.hitRunState) boss.hitRunState = 'approach';

                if (boss.hitRunState === 'approach') {
                    if (ctx.distanceToPlayer > 4) {
                        ctx.moveTowardPlayer(boss, dt, 1.5);
                    } else {
                        boss.hitRunState = 'attack';
                        return { shouldAttack: true };
                    }
                } else if (boss.hitRunState === 'retreat') {
                    ctx.moveAwayFromPlayer(boss, dt, 1.2);
                    boss.hitRunTimer = (boss.hitRunTimer || 0) + dt;
                    if (boss.hitRunTimer > 2000) {
                        boss.hitRunState = 'approach';
                        boss.hitRunTimer = 0;
                    }
                }
                return {};
            },
            onAttackComplete: (boss) => {
                boss.hitRunState = 'retreat';
            }
        },

        'berserker': {
            name: 'Berserker',
            description: 'More aggressive as health decreases',
            preferredRange: 2,
            attackPriority: ['melee', 'charge'],
            update: (boss, dt, ctx) => {
                const healthPercent = boss.hp / boss.maxHp;
                const speedMod = 1 + (1 - healthPercent) * 0.5;  // Up to 50% faster at low HP
                const damageMod = 1 + (1 - healthPercent) * 0.3; // Up to 30% more damage

                ctx.moveTowardPlayer(boss, dt, speedMod);
                return { damageMod, speedMod, preferClose: true };
            }
        },

        'tactical': {
            name: 'Tactical',
            description: 'Uses traps and positioning strategically',
            preferredRange: 5,
            attackPriority: ['tactical', 'ranged', 'aoe'],
            update: (boss, dt, ctx) => {
                // Try to keep medium distance
                const dist = ctx.distanceToPlayer;
                if (dist < 3) {
                    ctx.moveAwayFromPlayer(boss, dt, 1.0);
                } else if (dist > 7) {
                    ctx.moveTowardPlayer(boss, dt, 0.8);
                }

                // Strafe around player
                boss.strafeTimer = (boss.strafeTimer || 0) + dt;
                if (boss.strafeTimer > 1500) {
                    ctx.strafeAroundPlayer(boss, dt);
                    boss.strafeTimer = 0;
                }

                return { useTactical: true };
            }
        },

        'ambusher': {
            name: 'Ambusher',
            description: 'Waits in hiding, strikes suddenly',
            preferredRange: 0,
            attackPriority: ['special', 'melee'],
            stealthMode: true,
            update: (boss, dt, ctx) => {
                if (!boss.ambushState) boss.ambushState = 'hiding';

                if (boss.ambushState === 'hiding') {
                    // Wait until player is close
                    if (ctx.distanceToPlayer < 4) {
                        boss.ambushState = 'striking';
                        return { shouldAttack: true, ambushBonus: 1.5 };
                    }
                    return { invisible: true };
                } else if (boss.ambushState === 'striking') {
                    ctx.moveTowardPlayer(boss, dt, 2.0);
                    boss.ambushTimer = (boss.ambushTimer || 0) + dt;
                    if (boss.ambushTimer > 5000) {
                        boss.ambushState = 'hiding';
                        boss.ambushTimer = 0;
                    }
                }
                return {};
            }
        },

        'guardian': {
            name: 'Guardian',
            description: 'Protects a location, more dangerous near it',
            preferredRange: 0,
            attackPriority: ['aoe', 'melee', 'defensive'],
            guardRadius: 5,
            update: (boss, dt, ctx) => {
                if (!boss.guardPoint) {
                    boss.guardPoint = { x: boss.gridX, y: boss.gridY };
                }

                const distFromGuard = Math.sqrt(
                    (boss.gridX - boss.guardPoint.x) ** 2 +
                    (boss.gridY - boss.guardPoint.y) ** 2
                );

                // If player is near guard point, be aggressive
                const playerDistFromGuard = Math.sqrt(
                    (ctx.player.gridX - boss.guardPoint.x) ** 2 +
                    (ctx.player.gridY - boss.guardPoint.y) ** 2
                );

                if (playerDistFromGuard < 6) {
                    ctx.moveTowardPlayer(boss, dt, 1.2);
                    return { damageMod: 1.3, defending: true };
                }

                // Return to guard point if too far
                if (distFromGuard > 3) {
                    ctx.moveToward(boss, boss.guardPoint.x, boss.guardPoint.y, dt, 1.0);
                }

                return {};
            }
        },

        'duelist': {
            name: 'Duelist',
            description: 'Focuses on 1v1 combat, dodges attacks',
            preferredRange: 3,
            attackPriority: ['melee', 'special'],
            dodgeChance: 0.3,
            update: (boss, dt, ctx) => {
                // Circle strafe around player
                ctx.strafeAroundPlayer(boss, dt);

                // Occasionally dash toward or away
                boss.duelDashTimer = (boss.duelDashTimer || 0) + dt;
                if (boss.duelDashTimer > 3000) {
                    if (Math.random() < 0.5) {
                        ctx.dashToward(boss, ctx.player);
                    } else {
                        ctx.dashAway(boss, ctx.player);
                    }
                    boss.duelDashTimer = 0;
                }

                return { canDodge: true };
            }
        },

        'swarm_commander': {
            name: 'Swarm Commander',
            description: 'Stays back, commands minions to fight',
            preferredRange: 12,
            attackPriority: ['summon', 'ranged', 'support'],
            update: (boss, dt, ctx) => {
                // Stay very far from player
                if (ctx.distanceToPlayer < 10) {
                    ctx.moveAwayFromPlayer(boss, dt, 1.0);
                }

                // Prioritize summoning if no minions
                const minionCount = ctx.getMinionCount(boss);
                if (minionCount < 3) {
                    return { prioritizeSummon: true };
                }

                return { preferRanged: true };
            }
        },

        'elemental': {
            name: 'Elemental',
            description: 'Uses elemental attacks, changes element',
            preferredRange: 6,
            attackPriority: ['breath', 'aoe', 'ranged'],
            elements: ['fire', 'ice', 'void'],
            update: (boss, dt, ctx) => {
                // Change element periodically
                boss.elementTimer = (boss.elementTimer || 0) + dt;
                if (boss.elementTimer > 15000) {
                    const elements = ['fire', 'ice', 'void'];
                    boss.currentElement = elements[Math.floor(Math.random() * elements.length)];
                    boss.elementTimer = 0;
                }

                return { element: boss.currentElement || 'fire' };
            }
        }
    },

    // ========================================================================
    // MECHANIC COMPONENT LIBRARY
    // ========================================================================
    // Special mechanics that modify boss behavior at certain triggers
    MECHANIC_COMPONENTS: {
        'enrage': {
            name: 'Enrage',
            description: 'Becomes stronger at low health',
            trigger: 'health_threshold',
            threshold: 0.3,
            onTrigger: (boss) => {
                boss.enraged = true;
                boss.damage *= 1.5;
                boss.moveSpeed *= 1.3;
                addMessage(`${boss.name} becomes ENRAGED!`);
                return { visual: 'red_glow' };
            },
            update: (boss, dt) => {
                if (boss.enraged) {
                    return { damageMod: 1.5, speedMod: 1.3 };
                }
                return {};
            }
        },

        'immunity_phase': {
            name: 'Immunity Phase',
            description: 'Becomes immune, spawns adds to kill',
            trigger: 'health_threshold',
            threshold: 0.5,
            onTrigger: (boss) => {
                boss.immunityActive = true;
                boss.state = 'immune';
                addMessage(`${boss.name} becomes invulnerable! Kill the guardians!`);

                // Spawn guardian adds
                if (typeof SpawnPointSystem !== 'undefined') {
                    for (let i = 0; i < 4; i++) {
                        const angle = (i / 4) * Math.PI * 2;
                        const x = boss.gridX + Math.cos(angle) * 5;
                        const y = boss.gridY + Math.sin(angle) * 5;
                        // SpawnPointSystem spawn logic
                    }
                }
                boss.guardiansRemaining = 4;
                return { visual: 'shield_barrier' };
            },
            onGuardianKilled: (boss) => {
                boss.guardiansRemaining--;
                if (boss.guardiansRemaining <= 0) {
                    boss.immunityActive = false;
                    boss.state = 'idle';
                    addMessage(`${boss.name}'s shield shatters!`);
                }
            },
            update: (boss, dt) => {
                return { immune: boss.immunityActive };
            }
        },

        'regeneration': {
            name: 'Regeneration',
            description: 'Slowly heals when not taking damage',
            healRate: 0.02,  // 2% max HP per second
            damageWindow: 3000,  // Must not take damage for 3s
            update: (boss, dt) => {
                boss.lastDamageTime = boss.lastDamageTime || 0;
                const timeSinceDamage = Date.now() - boss.lastDamageTime;

                if (timeSinceDamage > 3000) {
                    const heal = boss.maxHp * 0.02 * (dt / 1000);
                    boss.hp = Math.min(boss.maxHp, boss.hp + heal);
                }
                return {};
            },
            onDamage: (boss) => {
                boss.lastDamageTime = Date.now();
            }
        },

        'split': {
            name: 'Split',
            description: 'Splits into smaller versions when killed',
            trigger: 'death',
            splitCount: 2,
            onTrigger: (boss) => {
                // Spawn smaller versions
                for (let i = 0; i < 2; i++) {
                    const offsetX = (i - 0.5) * 3;
                    BossSystem.spawn(boss.templateId + '_split',
                        boss.gridX + offsetX,
                        boss.gridY,
                        { healthMod: 0.3, sizeMod: 0.6 }
                    );
                }
                return { preventDeath: false };
            }
        },

        'berserk_timer': {
            name: 'Berserk Timer',
            description: 'Enrages after time limit, wipes party',
            timeLimit: 180000,  // 3 minutes
            warningTime: 30000,  // 30 second warning
            update: (boss, dt) => {
                boss.fightTimer = (boss.fightTimer || 0) + dt;

                if (boss.fightTimer > 180000) {
                    // Hard enrage - massive damage
                    boss.hardEnrage = true;
                    boss.damage *= 5;
                    addMessage(`${boss.name} has gone BERSERK!`);
                } else if (boss.fightTimer > 150000 && !boss.enrageWarned) {
                    addMessage(`${boss.name} grows impatient... 30 seconds remain!`);
                    boss.enrageWarned = true;
                }

                return {};
            }
        },

        'damage_reflection': {
            name: 'Damage Reflection',
            description: 'Reflects portion of damage taken',
            reflectPercent: 0.2,
            onDamage: (boss, damage, source) => {
                if (source && source.hp) {
                    const reflected = Math.floor(damage * 0.2);
                    source.hp -= reflected;
                    addMessage(`${boss.name} reflects ${reflected} damage!`);
                }
            }
        },

        'phase_immunity': {
            name: 'Phase Immunity',
            description: 'Immune to certain damage types per phase',
            immunities: {
                1: ['physical'],
                2: ['magic'],
                3: []
            },
            update: (boss, dt) => {
                const phaseImmunities = this.immunities[boss.currentPhase + 1] || [];
                return { phaseImmunities };
            }
        },

        'minion_shield': {
            name: 'Minion Shield',
            description: 'Takes reduced damage while minions alive',
            damageReduction: 0.5,
            update: (boss, dt, ctx) => {
                const minionCount = ctx.getMinionCount ? ctx.getMinionCount(boss) : 0;
                if (minionCount > 0) {
                    return { damageReduction: 0.5 };
                }
                return {};
            }
        },

        'mark_target': {
            name: 'Mark Target',
            description: 'Marks player for delayed heavy attack',
            markCooldown: 20000,
            markDuration: 5000,
            update: (boss, dt, ctx) => {
                boss.markTimer = (boss.markTimer || 20000) - dt;

                if (boss.markTimer <= 0 && ctx.player) {
                    ctx.player.marked = true;
                    ctx.player.markTimer = 5000;
                    addMessage(`You have been MARKED by ${boss.name}!`);
                    boss.markTimer = 20000;

                    // After mark duration, heavy attack
                    setTimeout(() => {
                        if (ctx.player.marked) {
                            ctx.player.hp -= 75;
                            ctx.player.marked = false;
                            addMessage(`${boss.name}'s mark detonates!`);
                        }
                    }, 5000);
                }
                return {};
            }
        },

        'arena_hazards': {
            name: 'Arena Hazards',
            description: 'Periodically spawns environmental hazards',
            hazardInterval: 10000,
            hazardTypes: ['fire_pool', 'spike_trap', 'void_zone'],
            update: (boss, dt) => {
                boss.hazardTimer = (boss.hazardTimer || 0) + dt;

                if (boss.hazardTimer > 10000) {
                    // Spawn random hazard
                    if (typeof DynamicTileSystem !== 'undefined') {
                        const types = ['lava', 'corrupted', 'ice'];
                        const type = types[Math.floor(Math.random() * types.length)];
                        const x = boss.gridX + (Math.random() - 0.5) * 10;
                        const y = boss.gridY + (Math.random() - 0.5) * 10;
                        DynamicTileSystem.convertTile(Math.floor(x), Math.floor(y), type);
                    }
                    boss.hazardTimer = 0;
                }
                return {};
            }
        },

        'adaptive': {
            name: 'Adaptive',
            description: 'Gains resistance to repeated damage types',
            resistanceGain: 0.1,
            maxResistance: 0.5,
            onDamage: (boss, damage, source) => {
                if (source?.element) {
                    boss.adaptiveResistances = boss.adaptiveResistances || {};
                    boss.adaptiveResistances[source.element] =
                        Math.min(0.5, (boss.adaptiveResistances[source.element] || 0) + 0.1);
                }
            },
            update: (boss, dt) => {
                return { additionalResistances: boss.adaptiveResistances || {} };
            }
        }
    },

    // ========================================================================
    // PHASE PRESETS
    // ========================================================================
    // Common phase configurations that can be reused
    PHASE_PRESETS: {
        'standard_3phase': [
            { name: "Phase 1", healthThreshold: 1.0, attackPattern: 'basic', moveSpeedMod: 1.0, damageMod: 1.0 },
            { name: "Phase 2", healthThreshold: 0.6, attackPattern: 'aggressive', moveSpeedMod: 1.2, damageMod: 1.2 },
            { name: "Phase 3", healthThreshold: 0.3, attackPattern: 'berserk', moveSpeedMod: 1.4, damageMod: 1.4 }
        ],

        'two_phase_split': [
            { name: "United", healthThreshold: 1.0, attackPattern: 'all', moveSpeedMod: 1.0 },
            { name: "Divided", healthThreshold: 0.5, attackPattern: 'all', effect: 'split' }
        ],

        'immunity_phases': [
            { name: "Vulnerable", healthThreshold: 1.0, attackPattern: 'basic' },
            { name: "Shielded", healthThreshold: 0.7, attackPattern: 'summon', effect: 'immunity_phase' },
            { name: "Weakened", healthThreshold: 0.5, attackPattern: 'aggressive' },
            { name: "Final Stand", healthThreshold: 0.2, attackPattern: 'berserk' }
        ],

        'elemental_rotation': [
            { name: "Fire", healthThreshold: 1.0, element: 'fire', attackPattern: 'fire' },
            { name: "Ice", healthThreshold: 0.66, element: 'ice', attackPattern: 'ice' },
            { name: "Void", healthThreshold: 0.33, element: 'void', attackPattern: 'void' }
        ],

        'crescendo': [
            { name: "Calm", healthThreshold: 1.0, moveSpeedMod: 0.8, damageMod: 0.8 },
            { name: "Rising", healthThreshold: 0.75, moveSpeedMod: 1.0, damageMod: 1.0 },
            { name: "Intense", healthThreshold: 0.5, moveSpeedMod: 1.2, damageMod: 1.2 },
            { name: "Climax", healthThreshold: 0.25, moveSpeedMod: 1.5, damageMod: 1.5 }
        ]
    },

    // ========================================================================
    // COMPONENT BUILDER - Create bosses from components
    // ========================================================================

    /**
     * Build a complete boss definition from components
     * @param {object} config - Boss configuration
     * @returns {object} - Complete boss template
     */
    buildFromComponents(config) {
        const template = {
            name: config.name || "Unknown Boss",
            title: config.title || "The Unnamed",
            size: config.size || { width: 2, height: 2 },
            baseHealth: config.baseHealth || 300,
            healthPerFloor: config.healthPerFloor || 50,
            baseDamage: config.baseDamage || 20,
            armor: config.armor || 10,
            moveSpeed: config.moveSpeed || 2,
            element: config.element || 'physical',
            isStationary: config.isStationary || false,

            // Assemble attacks from components
            attacks: {},

            // Phase configuration
            phases: [],

            // Combat modifiers
            immunities: config.immunities || [],
            resistances: config.resistances || {},
            weaknesses: config.weaknesses || {},

            // Loot
            loot: config.loot || { bonus: { gold: 200, xp: 500 } },

            // Component references for runtime
            _components: {
                attacks: config.attacks || [],
                behavior: config.behavior || 'aggressive',
                mechanics: config.mechanics || [],
                phasePreset: config.phasePreset || null
            }
        };

        // Assemble attacks from component library
        if (config.attacks && Array.isArray(config.attacks)) {
            config.attacks.forEach((attackId, index) => {
                const attackComponent = this.ATTACK_COMPONENTS[attackId];
                if (attackComponent) {
                    // Clone the attack and add pattern info
                    template.attacks[attackId] = {
                        ...attackComponent,
                        pattern: this.getAttackPattern(index, config.attacks.length)
                    };
                } else {
                    console.warn(`[Boss] Unknown attack component: ${attackId}`);
                }
            });
        }

        // Apply phase preset or custom phases
        if (config.phasePreset && this.PHASE_PRESETS[config.phasePreset]) {
            template.phases = JSON.parse(JSON.stringify(this.PHASE_PRESETS[config.phasePreset]));
        } else if (config.phases) {
            template.phases = config.phases;
        } else {
            // Default 3-phase setup
            template.phases = JSON.parse(JSON.stringify(this.PHASE_PRESETS['standard_3phase']));
        }

        // Apply custom phase names if provided
        if (config.phaseNames) {
            config.phaseNames.forEach((name, i) => {
                if (template.phases[i]) {
                    template.phases[i].name = name;
                }
            });
        }

        return template;
    },

    /**
     * Get attack pattern based on position in attack list
     * Earlier attacks are basic, later attacks are aggressive/berserk
     */
    getAttackPattern(index, total) {
        const ratio = index / total;
        if (ratio < 0.33) return 'basic';
        if (ratio < 0.66) return 'aggressive';
        return 'berserk';
    },

    /**
     * Register a new boss template built from components
     * @param {string} id - Template ID
     * @param {object} config - Component configuration
     */
    registerBoss(id, config) {
        const template = this.buildFromComponents(config);
        this.BOSS_TEMPLATES[id] = template;
        if (this.config.debugLogging) {
            console.log(`[Boss] Registered boss template: ${id}`);
        }
        return template;
    },

    /**
     * Create behavior context for component updates
     */
    createBehaviorContext(boss) {
        return {
            player: game.player,
            distanceToPlayer: this.getDistanceToPlayer(boss),

            moveTowardPlayer: (boss, dt, speedMod = 1.0) => {
                if (!game.player || boss.isStationary) return;
                const dx = game.player.gridX - boss.gridX;
                const dy = game.player.gridY - boss.gridY;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len > 0) {
                    const move = boss.moveSpeed * speedMod * (dt / 1000);
                    const newX = boss.gridX + (dx / len) * move;
                    const newY = boss.gridY + (dy / len) * move;
                    if (this.canPlaceBoss(boss, Math.floor(newX), Math.floor(newY))) {
                        this.clearBossTiles(boss);
                        boss.gridX = newX;
                        boss.gridY = newY;
                        this.markBossTiles(boss);
                    }
                }
            },

            moveAwayFromPlayer: (boss, dt, speedMod = 1.0) => {
                if (!game.player || boss.isStationary) return;
                const dx = boss.gridX - game.player.gridX;
                const dy = boss.gridY - game.player.gridY;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len > 0) {
                    const move = boss.moveSpeed * speedMod * (dt / 1000);
                    const newX = boss.gridX + (dx / len) * move;
                    const newY = boss.gridY + (dy / len) * move;
                    if (this.canPlaceBoss(boss, Math.floor(newX), Math.floor(newY))) {
                        this.clearBossTiles(boss);
                        boss.gridX = newX;
                        boss.gridY = newY;
                        this.markBossTiles(boss);
                    }
                }
            },

            moveToward: (boss, targetX, targetY, dt, speedMod = 1.0) => {
                if (boss.isStationary) return;
                const dx = targetX - boss.gridX;
                const dy = targetY - boss.gridY;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len > 0) {
                    const move = boss.moveSpeed * speedMod * (dt / 1000);
                    const newX = boss.gridX + (dx / len) * move;
                    const newY = boss.gridY + (dy / len) * move;
                    if (this.canPlaceBoss(boss, Math.floor(newX), Math.floor(newY))) {
                        this.clearBossTiles(boss);
                        boss.gridX = newX;
                        boss.gridY = newY;
                        this.markBossTiles(boss);
                    }
                }
            },

            strafeAroundPlayer: (boss, dt) => {
                if (!game.player || boss.isStationary) return;
                const dx = boss.gridX - game.player.gridX;
                const dy = boss.gridY - game.player.gridY;
                // Perpendicular direction
                const perpX = -dy;
                const perpY = dx;
                const len = Math.sqrt(perpX * perpX + perpY * perpY);
                if (len > 0) {
                    const move = boss.moveSpeed * (dt / 1000);
                    const newX = boss.gridX + (perpX / len) * move;
                    const newY = boss.gridY + (perpY / len) * move;
                    if (this.canPlaceBoss(boss, Math.floor(newX), Math.floor(newY))) {
                        this.clearBossTiles(boss);
                        boss.gridX = newX;
                        boss.gridY = newY;
                        this.markBossTiles(boss);
                    }
                }
            },

            dashToward: (boss, target) => {
                // Quick dash implementation
                const dx = target.gridX - boss.gridX;
                const dy = target.gridY - boss.gridY;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len > 0 && len > 2) {
                    const dashDist = 3;
                    const newX = boss.gridX + (dx / len) * dashDist;
                    const newY = boss.gridY + (dy / len) * dashDist;
                    if (this.canPlaceBoss(boss, Math.floor(newX), Math.floor(newY))) {
                        this.clearBossTiles(boss);
                        boss.gridX = newX;
                        boss.gridY = newY;
                        this.markBossTiles(boss);
                    }
                }
            },

            dashAway: (boss, target) => {
                const dx = boss.gridX - target.gridX;
                const dy = boss.gridY - target.gridY;
                const len = Math.sqrt(dx * dx + dy * dy);
                if (len > 0) {
                    const dashDist = 3;
                    const newX = boss.gridX + (dx / len) * dashDist;
                    const newY = boss.gridY + (dy / len) * dashDist;
                    if (this.canPlaceBoss(boss, Math.floor(newX), Math.floor(newY))) {
                        this.clearBossTiles(boss);
                        boss.gridX = newX;
                        boss.gridY = newY;
                        this.markBossTiles(boss);
                    }
                }
            },

            getMinionCount: (boss) => {
                // Count enemies spawned by this boss
                return game.enemies.filter(e =>
                    e.spawnedBy === boss.id && e.hp > 0
                ).length;
            }
        };
    },

    /**
     * Process behavior component for a boss
     */
    processBehavior(boss, dt) {
        if (boss.state !== 'idle' || boss.isStationary) return {};

        const template = this.BOSS_TEMPLATES[boss.templateId];
        if (!template?._components?.behavior) return {};

        const behaviorId = template._components.behavior;
        const behavior = this.BEHAVIOR_COMPONENTS[behaviorId];
        if (!behavior?.update) return {};

        const ctx = this.createBehaviorContext(boss);
        return behavior.update(boss, dt, ctx);
    },

    /**
     * Process mechanic components for a boss
     */
    processMechanics(boss, dt) {
        const template = this.BOSS_TEMPLATES[boss.templateId];
        if (!template?._components?.mechanics) return {};

        const results = {};
        const ctx = this.createBehaviorContext(boss);

        template._components.mechanics.forEach(mechanicId => {
            const mechanic = this.MECHANIC_COMPONENTS[mechanicId];
            if (!mechanic) return;

            // Check health threshold triggers
            if (mechanic.trigger === 'health_threshold') {
                const healthPercent = boss.hp / boss.maxHp;
                const triggered = boss._triggeredMechanics?.[mechanicId];

                if (!triggered && healthPercent <= mechanic.threshold) {
                    boss._triggeredMechanics = boss._triggeredMechanics || {};
                    boss._triggeredMechanics[mechanicId] = true;
                    if (mechanic.onTrigger) {
                        Object.assign(results, mechanic.onTrigger(boss));
                    }
                }
            }

            // Run update if available
            if (mechanic.update) {
                Object.assign(results, mechanic.update(boss, dt, ctx));
            }
        });

        return results;
    },

    /**
     * Notify mechanics of damage taken
     */
    notifyMechanicsDamage(boss, damage, source) {
        const template = this.BOSS_TEMPLATES[boss.templateId];
        if (!template?._components?.mechanics) return;

        template._components.mechanics.forEach(mechanicId => {
            const mechanic = this.MECHANIC_COMPONENTS[mechanicId];
            if (mechanic?.onDamage) {
                mechanic.onDamage(boss, damage, source);
            }
        });
    },

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

        // Check immunity from mechanics
        if (boss.immunityActive) {
            addMessage(`${boss.name} is immune!`);
            return false;
        }

        // Apply armor reduction
        const armorReduction = boss.armor / (boss.armor + 100);
        let actualDamage = Math.floor(amount * (1 - armorReduction));

        // Apply resistances/weaknesses
        let finalDamage = actualDamage;
        if (source?.element) {
            if (boss.resistances[source.element]) {
                finalDamage = Math.floor(actualDamage * (1 - boss.resistances[source.element]));
            }
            if (boss.weaknesses[source.element]) {
                finalDamage = Math.floor(actualDamage * (1 + boss.weaknesses[source.element]));
            }
            // Check adaptive resistances from mechanics
            if (boss.adaptiveResistances?.[source.element]) {
                finalDamage = Math.floor(finalDamage * (1 - boss.adaptiveResistances[source.element]));
            }
        }

        // Apply mechanic damage reductions (e.g., minion_shield)
        if (boss._mechanicModifiers?.damageReduction) {
            finalDamage = Math.floor(finalDamage * (1 - boss._mechanicModifiers.damageReduction));
        }

        // Don't damage during phase transition
        if (boss.phaseTransitioning) {
            finalDamage = 0;
        }

        boss.hp -= finalDamage;

        // Notify mechanics of damage taken
        this.notifyMechanicsDamage(boss, finalDamage, source);

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

            // Process behavior component (handles movement based on AI behavior)
            const behaviorResult = this.processBehavior(boss, dt);

            // Process mechanic components (enrage, immunity, regeneration, etc.)
            const mechanicResult = this.processMechanics(boss, dt);

            // Store mechanic modifiers for use in damage calculation
            boss._mechanicModifiers = mechanicResult;

            // Apply behavior modifiers if any
            if (behaviorResult.damageMod) {
                boss._behaviorDamageMod = behaviorResult.damageMod;
            }
            if (behaviorResult.invisible) {
                boss.visible = false;
            } else {
                boss.visible = true;
            }

            // Fallback to basic movement if no behavior component or behavior doesn't handle movement
            if (!behaviorResult.preferClose && !behaviorResult.preferRanged &&
                !behaviorResult.retreating && !mechanicResult.immune) {
                this.processMovement(boss, dt);
            }

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
            registeredTemplates: Object.keys(this.BOSS_TEMPLATES).length,
            attackComponents: Object.keys(this.ATTACK_COMPONENTS).length,
            behaviorComponents: Object.keys(this.BEHAVIOR_COMPONENTS).length,
            mechanicComponents: Object.keys(this.MECHANIC_COMPONENTS).length,
            bosses: []
        };

        this.activeBosses.forEach(boss => {
            const template = this.BOSS_TEMPLATES[boss.templateId];
            status.bosses.push({
                name: boss.name,
                hp: `${boss.hp}/${boss.maxHp}`,
                phase: boss.phases[boss.currentPhase]?.name,
                state: boss.state,
                behavior: template?._components?.behavior || 'none',
                mechanics: template?._components?.mechanics || []
            });
        });

        return status;
    },

    /**
     * List all available components for boss building
     */
    listComponents() {
        return {
            attacks: Object.keys(this.ATTACK_COMPONENTS),
            behaviors: Object.keys(this.BEHAVIOR_COMPONENTS),
            mechanics: Object.keys(this.MECHANIC_COMPONENTS),
            phasePresets: Object.keys(this.PHASE_PRESETS)
        };
    },

    /**
     * Get detailed info about a component
     */
    getComponentInfo(type, id) {
        const libraries = {
            attack: this.ATTACK_COMPONENTS,
            behavior: this.BEHAVIOR_COMPONENTS,
            mechanic: this.MECHANIC_COMPONENTS,
            phase: this.PHASE_PRESETS
        };

        const lib = libraries[type];
        if (!lib) return null;
        return lib[id] || null;
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

// ============================================================================
// EXAMPLE COMPONENT-BASED BOSS DEFINITIONS
// ============================================================================
// These demonstrate how to create new bosses using the component system.
// Each boss is a unique combination of attacks, behavior, and mechanics.

// SHIFT: LOCKDOWN - The Warden (component version)
BossSystem.registerBoss('warden_v2', {
    name: "The Warden",
    title: "Guardian of the Sealed Vault",
    size: { width: 3, height: 3 },
    baseHealth: 500,
    healthPerFloor: 100,
    baseDamage: 25,
    armor: 25,
    moveSpeed: 1.5,
    element: 'physical',

    // Mix attacks from the component library
    attacks: ['heavy_slam', 'charge', 'shockwave', 'trap_spawn'],

    // Guardian behavior - protects a location
    behavior: 'guardian',

    // Mechanics: enrages at low HP, arena hazards
    mechanics: ['enrage', 'arena_hazards'],

    // Use standard 3-phase preset
    phasePreset: 'standard_3phase',
    phaseNames: ["Awakening", "Aggression", "Desperation"],

    immunities: ['stun', 'knockback'],
    resistances: { physical: 0.2 },

    loot: { guaranteed: ['warden_key'], bonus: { gold: 500, xp: 1000 } }
});

// SHIFT: ECLIPSE - Blood Altar (component version)
BossSystem.registerBoss('blood_altar_v2', {
    name: "Blood Altar",
    title: "Heart of Darkness",
    size: { width: 2, height: 2 },
    baseHealth: 200,
    healthPerFloor: 50,
    baseDamage: 0,
    armor: 0,
    moveSpeed: 0,
    element: 'void',
    isStationary: true,

    attacks: ['summon_minions', 'heal_pulse', 'projectile_volley'],

    behavior: 'swarm_commander',

    mechanics: ['minion_shield', 'regeneration'],

    phasePreset: 'immunity_phases',

    immunities: ['poison', 'bleed'],
    resistances: { void: 0.5 },
    weaknesses: { holy: 0.5, fire: 0.3 }
});

// SHIFT: BREACH - Void Horror (component version)
BossSystem.registerBoss('void_horror_v2', {
    name: "Void Horror",
    title: "The Unmaker",
    size: { width: 2, height: 2 },
    baseHealth: 400,
    healthPerFloor: 80,
    baseDamage: 35,
    armor: 10,
    moveSpeed: 2.5,
    element: 'void',

    attacks: ['void_beam', 'teleport_strike', 'projectile_burst', 'meteor'],

    behavior: 'hit_and_run',

    mechanics: ['adaptive', 'arena_hazards', 'berserk_timer'],

    phasePreset: 'crescendo',
    phaseNames: ["Manifest", "Growing", "Unleashed", "Annihilation"],

    immunities: ['void'],
    weaknesses: { holy: 0.5 }
});

// SHIFT: FROSTBITE - Frost Titan
BossSystem.registerBoss('frost_titan', {
    name: "Frost Titan",
    title: "Lord of Eternal Winter",
    size: { width: 3, height: 3 },
    baseHealth: 450,
    healthPerFloor: 90,
    baseDamage: 30,
    armor: 20,
    moveSpeed: 1.2,
    element: 'ice',

    attacks: ['frost_breath', 'ground_slam', 'bull_rush', 'shockwave'],

    behavior: 'berserker',

    mechanics: ['enrage', 'damage_reflection'],

    phasePreset: 'standard_3phase',
    phaseNames: ["Cold Awakening", "Bitter Fury", "Absolute Zero"],

    immunities: ['freeze', 'slow'],
    resistances: { ice: 0.8, physical: 0.1 },
    weaknesses: { fire: 0.5 }
});

// SHIFT: RESONANCE - Crystal Guardian
BossSystem.registerBoss('crystal_guardian', {
    name: "Crystal Guardian",
    title: "Echo of the Fallen",
    size: { width: 2, height: 2 },
    baseHealth: 350,
    healthPerFloor: 70,
    baseDamage: 20,
    armor: 30,
    moveSpeed: 1.8,
    element: 'magic',

    attacks: ['projectile_volley', 'homing_orb', 'shield_barrier', 'leaping_strike'],

    behavior: 'duelist',

    mechanics: ['immunity_phase', 'regeneration'],

    phasePreset: 'immunity_phases',
    phaseNames: ["Whole", "Shattered", "Reforming", "Resonant"],

    immunities: ['magic'],
    resistances: { magic: 0.5 },
    weaknesses: { physical: 0.3 }
});

// Generic Floor Bosses - Easy to create variations
BossSystem.registerBoss('brute_champion', {
    name: "Brute Champion",
    title: "Arena Champion",
    size: { width: 2, height: 2 },
    baseHealth: 300,
    healthPerFloor: 60,
    baseDamage: 35,
    armor: 15,
    moveSpeed: 2,
    element: 'physical',

    attacks: ['melee_swing', 'heavy_slam', 'charge', 'berserk_roar'],
    behavior: 'aggressive',
    mechanics: ['enrage'],
    phasePreset: 'standard_3phase'
});

BossSystem.registerBoss('shadow_stalker', {
    name: "Shadow Stalker",
    title: "The Unseen",
    size: { width: 1, height: 1 },
    baseHealth: 200,
    healthPerFloor: 40,
    baseDamage: 50,
    armor: 5,
    moveSpeed: 3,
    element: 'void',

    attacks: ['double_strike', 'teleport_strike', 'grab_throw'],
    behavior: 'ambusher',
    mechanics: ['adaptive'],
    phasePreset: 'crescendo'
});

BossSystem.registerBoss('necromancer_lord', {
    name: "Necromancer Lord",
    title: "Master of the Undead",
    size: { width: 2, height: 2 },
    baseHealth: 250,
    healthPerFloor: 50,
    baseDamage: 15,
    armor: 5,
    moveSpeed: 1,
    element: 'void',

    attacks: ['summon_minions', 'projectile_single', 'heal_pulse', 'void_beam'],
    behavior: 'swarm_commander',
    mechanics: ['minion_shield', 'berserk_timer'],
    phasePreset: 'immunity_phases'
});

BossSystem.registerBoss('flame_wyrm', {
    name: "Flame Wyrm",
    title: "Scourge of the Deep",
    size: { width: 3, height: 2 },
    baseHealth: 400,
    healthPerFloor: 80,
    baseDamage: 30,
    armor: 15,
    moveSpeed: 2,
    element: 'fire',

    attacks: ['fire_breath', 'meteor', 'sweep', 'leaping_strike'],
    behavior: 'elemental',
    mechanics: ['arena_hazards', 'enrage'],
    phasePreset: 'elemental_rotation'
});

console.log('✅ Boss System loaded');
console.log(`   - ${Object.keys(BossSystem.ATTACK_COMPONENTS).length} attack components`);
console.log(`   - ${Object.keys(BossSystem.BEHAVIOR_COMPONENTS).length} behavior components`);
console.log(`   - ${Object.keys(BossSystem.MECHANIC_COMPONENTS).length} mechanic components`);
console.log(`   - ${Object.keys(BossSystem.BOSS_TEMPLATES).length} boss templates registered`);
