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
        debugLogging: true,
        verboseLogging: true,     // Extra detailed logging for diagnostics
        defaultTelegraphTime: 500,
        globalCooldownBase: 1000,  // Minimum time between any abilities
        abilityUseChance: 0.25,   // Chance to use ability instead of basic attack
        eliteAbilityChance: 0.4   // Higher chance for elites
    },

    // ========================================================================
    // ACTIVE AUDIO LOOPS - Track looping sounds for cleanup
    // ========================================================================
    activeAudioLoops: new Map(),  // enemyId -> { voiceHandle, abilityId }

    // ========================================================================
    // DIAGNOSTICS - Track ability system health
    // ========================================================================
    diagnostics: {
        initialized: false,
        lastUpdateTime: 0,
        updateCallCount: 0,
        initializeEnemyCalls: 0,
        tryUseAbilityCalls: 0,
        abilitiesExecuted: 0,
        failureReasons: {
            noAbilitySet: 0,
            abilityLockout: 0,
            globalCooldown: 0,
            abilityCooldown: 0,
            outOfRange: 0,
            noSignatureAbility: 0,
            noLegacyAbilities: 0
        },
        recentAttempts: [],  // Last 20 ability attempts for debugging
        maxRecentAttempts: 20
    },

    /**
     * Log a diagnostic event with timestamp
     */
    _logDiagnostic(category, message, data = null) {
        const timestamp = Date.now();
        const timeStr = new Date(timestamp).toLocaleTimeString();
        const prefix = `[EnemyAbility:${category}] [${timeStr}]`;

        if (data) {
            console.log(`${prefix} ${message}`, data);
        } else {
            console.log(`${prefix} ${message}`);
        }
    },

    /**
     * Record an ability attempt for diagnostics
     */
    _recordAttempt(enemy, result, reason, ability = null) {
        const attempt = {
            timestamp: Date.now(),
            enemyName: enemy?.name || 'unknown',
            enemyId: enemy?.id || 'none',
            result: result,  // 'success', 'failure'
            reason: reason,
            abilityName: ability?.name || null,
            abilityId: ability?.id || null
        };

        this.diagnostics.recentAttempts.push(attempt);
        if (this.diagnostics.recentAttempts.length > this.diagnostics.maxRecentAttempts) {
            this.diagnostics.recentAttempts.shift();
        }
    },

    /**
     * Generate a full diagnostic report - call from browser console
     * Usage: EnemyAbilitySystem.diagnose()
     */
    diagnose() {
        console.log('\n' + '='.repeat(70));
        console.log('  ENEMY ABILITY SYSTEM DIAGNOSTIC REPORT');
        console.log('='.repeat(70));

        // System Status
        console.log('\n📊 SYSTEM STATUS:');
        console.log(`   Initialized: ${this.diagnostics.initialized}`);
        console.log(`   Update calls: ${this.diagnostics.updateCallCount}`);
        console.log(`   Last update: ${this.diagnostics.lastUpdateTime > 0 ? new Date(this.diagnostics.lastUpdateTime).toLocaleTimeString() : 'NEVER'}`);
        console.log(`   Debug logging: ${this.config.debugLogging}`);
        console.log(`   Verbose logging: ${this.config.verboseLogging}`);

        // Registration Status
        console.log('\n📝 REGISTRATION STATUS:');
        console.log(`   Registered enemies: ${this.enemyAbilities.size}`);
        console.log(`   initializeEnemy calls: ${this.diagnostics.initializeEnemyCalls}`);

        if (this.enemyAbilities.size > 0) {
            console.log('\n   Registered Enemy Details:');
            for (const [enemyId, abilitySet] of this.enemyAbilities) {
                const sigAbility = abilitySet.signatureAbility;
                console.log(`   - ID: ${enemyId}`);
                console.log(`     Signature: ${sigAbility ? sigAbility.name : 'NONE ⚠️'}`);
                console.log(`     Cooldown: ${sigAbility ? abilitySet.cooldowns[sigAbility.id]?.toFixed(0) || 0 : 'N/A'}ms`);
                console.log(`     Global CD: ${abilitySet.globalCooldown?.toFixed(0) || 0}ms`);
                console.log(`     Lockout: ${abilitySet.abilityLockout}`);
            }
        }

        // Ability Usage Stats
        console.log('\n⚔️ ABILITY USAGE STATS:');
        console.log(`   tryUseAbility calls: ${this.diagnostics.tryUseAbilityCalls}`);
        console.log(`   Abilities executed: ${this.diagnostics.abilitiesExecuted}`);
        const successRate = this.diagnostics.tryUseAbilityCalls > 0
            ? ((this.diagnostics.abilitiesExecuted / this.diagnostics.tryUseAbilityCalls) * 100).toFixed(1)
            : 0;
        console.log(`   Success rate: ${successRate}%`);

        // Failure Breakdown
        console.log('\n❌ FAILURE REASONS:');
        const fr = this.diagnostics.failureReasons;
        console.log(`   No ability set registered: ${fr.noAbilitySet}`);
        console.log(`   Ability lockout (in recovery): ${fr.abilityLockout}`);
        console.log(`   Global cooldown active: ${fr.globalCooldown}`);
        console.log(`   Ability on cooldown: ${fr.abilityCooldown}`);
        console.log(`   Out of range: ${fr.outOfRange}`);
        console.log(`   No signature ability: ${fr.noSignatureAbility}`);
        console.log(`   No legacy abilities: ${fr.noLegacyAbilities}`);

        // Recent Attempts
        console.log('\n📜 RECENT ABILITY ATTEMPTS (last 20):');
        if (this.diagnostics.recentAttempts.length === 0) {
            console.log('   No attempts recorded yet');
        } else {
            for (const attempt of this.diagnostics.recentAttempts.slice(-10)) {
                const time = new Date(attempt.timestamp).toLocaleTimeString();
                const icon = attempt.result === 'success' ? '✅' : '❌';
                console.log(`   ${icon} [${time}] ${attempt.enemyName}: ${attempt.reason}${attempt.abilityName ? ` (${attempt.abilityName})` : ''}`);
            }
        }

        // Missing Monsters
        if (this.missingAbilityMonsters.size > 0) {
            console.log('\n⚠️ MONSTERS WITHOUT SIGNATURE ABILITIES:');
            for (const name of this.missingAbilityMonsters) {
                console.log(`   - ${name}`);
            }
        }

        // Active Game Enemies Check
        console.log('\n🎮 CURRENT GAME STATE:');
        if (typeof game !== 'undefined' && game.enemies) {
            console.log(`   Active enemies in game: ${game.enemies.length}`);
            for (const enemy of game.enemies.slice(0, 5)) {
                const hasAbilitySet = this.enemyAbilities.has(enemy.id);
                const abilitySet = this.enemyAbilities.get(enemy.id);
                console.log(`   - ${enemy.name} (${enemy.id})`);
                console.log(`     Has ability set: ${hasAbilitySet ? '✅' : '❌'}`);
                if (hasAbilitySet && abilitySet.signatureAbility) {
                    console.log(`     Signature: ${abilitySet.signatureAbility.name}`);
                }
            }
            if (game.enemies.length > 5) {
                console.log(`   ... and ${game.enemies.length - 5} more`);
            }
        } else {
            console.log('   Game state not available');
        }

        // AbilityRepository Check
        console.log('\n📚 ABILITY REPOSITORY STATUS:');
        if (typeof AbilityRepository !== 'undefined') {
            const counts = AbilityRepository.getCounts();
            console.log(`   ✅ AbilityRepository loaded`);
            console.log(`   Attacks: ${counts.attacks}`);
            console.log(`   Passives: ${counts.passives}`);
            console.log(`   Mechanics: ${counts.mechanics}`);
            console.log(`   Behaviors: ${counts.behaviors}`);
        } else {
            console.log('   ❌ AbilityRepository NOT LOADED');
        }

        // SystemManager Registration Check
        console.log('\n🔧 SYSTEM MANAGER STATUS:');
        if (typeof SystemManager !== 'undefined') {
            const isRegistered = SystemManager.has('enemy-ability-system');
            const isEnabled = SystemManager.isEnabled('enemy-ability-system');
            console.log(`   Registered: ${isRegistered ? '✅' : '❌'}`);
            console.log(`   Enabled: ${isEnabled ? '✅' : '❌'}`);
        } else {
            console.log('   ❌ SystemManager NOT LOADED');
        }

        console.log('\n' + '='.repeat(70));
        console.log('  END DIAGNOSTIC REPORT');
        console.log('  Run EnemyAbilitySystem.testAbility(enemyIndex) to force-fire an ability');
        console.log('='.repeat(70) + '\n');

        return this.diagnostics;
    },

    /**
     * Force-fire an ability for testing - call from browser console
     * Usage: EnemyAbilitySystem.testAbility(0) // Tests first enemy
     */
    testAbility(enemyIndex = 0) {
        console.log('\n🧪 ABILITY TEST MODE');

        if (typeof game === 'undefined' || !game.enemies || game.enemies.length === 0) {
            console.error('❌ No enemies in game');
            return false;
        }

        const enemy = game.enemies[enemyIndex];
        if (!enemy) {
            console.error(`❌ No enemy at index ${enemyIndex}`);
            return false;
        }

        console.log(`Testing ability for: ${enemy.name} (${enemy.id})`);

        // Check if initialized
        let abilitySet = this.enemyAbilities.get(enemy.id);
        if (!abilitySet) {
            console.log('⚠️ Enemy not initialized, initializing now...');
            this.initializeEnemy(enemy);
            abilitySet = this.enemyAbilities.get(enemy.id);
        }

        if (!abilitySet) {
            console.error('❌ Failed to create ability set');
            return false;
        }

        console.log('Ability Set:', abilitySet);

        if (!abilitySet.signatureAbility) {
            console.error('❌ No signature ability assigned');
            console.log('Checking mapping...');
            const mapping = this.MONSTER_SIGNATURE_ABILITIES[enemy.name];
            console.log('Mapping found:', mapping);
            return false;
        }

        const ability = abilitySet.signatureAbility;
        console.log(`✅ Found ability: ${ability.name}`);
        console.log('   Damage:', ability.damage);
        console.log('   Range:', ability.range);
        console.log('   Cooldown:', ability.cooldown);
        console.log('   Telegraph:', ability.telegraphTime);

        // Force reset cooldowns
        console.log('🔄 Resetting cooldowns...');
        abilitySet.globalCooldown = 0;
        abilitySet.cooldowns[ability.id] = 0;
        abilitySet.abilityLockout = false;

        // Get target
        const target = typeof game !== 'undefined' ? game.player : null;
        if (!target) {
            console.error('❌ No player target found');
            return false;
        }

        console.log('🎯 Executing ability...');
        this.executeAbility(enemy, target, ability, abilitySet);
        console.log('✅ Ability executed! Check game for visual feedback.');

        return true;
    },

    /**
     * Reset all diagnostics counters
     */
    resetDiagnostics() {
        this.diagnostics.updateCallCount = 0;
        this.diagnostics.initializeEnemyCalls = 0;
        this.diagnostics.tryUseAbilityCalls = 0;
        this.diagnostics.abilitiesExecuted = 0;
        this.diagnostics.failureReasons = {
            noAbilitySet: 0,
            abilityLockout: 0,
            globalCooldown: 0,
            abilityCooldown: 0,
            outOfRange: 0,
            noSignatureAbility: 0,
            noLegacyAbilities: 0
        };
        this.diagnostics.recentAttempts = [];
        console.log('🔄 Diagnostics reset');
    },

    // ========================================================================
    // MONSTER SIGNATURE ABILITIES MAPPING
    // ========================================================================
    // Each monster type maps to ONE signature ability + passive(s)
    // Note: recoveryTime is now defined on the ability itself, not per-monster
    MONSTER_SIGNATURE_ABILITIES: {
        // ─── VOLCANIC ───
        'Magma Slime': { signatureAbility: 'fire_breath', signaturePassive: 'death_explosion' },
        'Obsidian Golem': { signatureAbility: 'ground_slam', signaturePassive: ['thorns', 'death_explosion'] },
        'Cinder Wisp': { signatureAbility: 'projectile_burst', signaturePassive: 'teleport_when_hurt' },
        'Flame Bat': { signatureAbility: 'bite', signaturePassive: 'evasion' },
        'Ash Walker': { signatureAbility: 'life_drain', signaturePassive: 'regeneration' },
        'Salamander': { signatureAbility: 'tail_whip', signaturePassive: 'berserk' },
        'Pyro Cultist': { signatureAbility: 'homing_orb', signaturePassive: 'regeneration' },

        // ─── CAVE ───
        'Cave Bat': { signatureAbility: 'claw_swipe', signaturePassive: 'pack_hunter' },
        'Stone Lurker': { signatureAbility: 'ground_slam', signaturePassive: ['ambusher', 'armored'] },
        'Mushroom Sprite': { signatureAbility: 'poison_cloud', signaturePassive: 'regeneration' },
        'Crystal Spider': { signatureAbility: 'web_shot', signaturePassive: 'poison_touch' },

        // ─── UNDEAD ───
        'Skeletal Warrior': { signatureAbility: 'melee_swing', signaturePassive: 'call_for_help' },
        'Phantom': { signatureAbility: 'life_drain', signaturePassive: 'ethereal' },
        'Bone Golem': { signatureAbility: 'heavy_slam', signaturePassive: ['split', 'berserk'] },

        // ─── AQUATIC ───
        'Deep Crawler': { signatureAbility: 'double_strike', signaturePassive: 'armored' },
        'Tide Serpent': { signatureAbility: 'lunge', signaturePassive: 'berserk' },

        // ─── SHADOW ───
        'Shadow Stalker': { signatureAbility: 'shadow_step', signaturePassive: ['ambusher', 'ethereal'] },
        'Void Touched': { signatureAbility: 'void_beam', signaturePassive: ['adaptive_resistance', 'teleport_when_hurt'] },

        // ─── ICE ───
        'Frost Elemental': { signatureAbility: 'frost_breath', signaturePassive: 'frost_aura' },
        'Ice Golem': { signatureAbility: 'stomp', signaturePassive: ['thorns', 'undying'] },
        'Frozen Husk': { signatureAbility: 'lunge', signaturePassive: 'berserk' },
        'Blizzard Spirit': { signatureAbility: 'projectile_single', signaturePassive: 'evasion' },

        // ─── COMBAT VARIETY ───
        'Shadow Imp': { signatureAbility: 'teleport_strike', signaturePassive: 'evasion' },
        'Temple Sentinel': { signatureAbility: 'heavy_slam', signaturePassive: 'shield_barrier' },
        'Stone Guardian': { signatureAbility: 'ground_slam', signaturePassive: ['thorns', 'armored'] },
        'Demon Knight': { signatureAbility: 'charge', signaturePassive: 'enrage' },
        'Giant Spider': { signatureAbility: 'sweep', signaturePassive: 'ambusher' },
        'Shield Bearer': { signatureAbility: 'stomp', signaturePassive: 'shield_barrier' },
        'Flame Sprite': { signatureAbility: 'pounce', signaturePassive: 'fire_aura' }
    },

    // Abilities that should use fast telegraph (not affected by minimum telegraph time)
    FAST_TELEGRAPH_EXCEPTIONS: ['shadow_step'],

    // Track monsters without ability mappings for debugging
    missingAbilityMonsters: new Set(),

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
     * Initialize abilities for an enemy using signature ability system
     * Each monster gets ONE signature ability from MONSTER_SIGNATURE_ABILITIES
     * @param {object} enemy - The enemy entity
     */
    initializeEnemy(enemy) {
        // Track diagnostic calls
        this.diagnostics.initializeEnemyCalls++;
        this.diagnostics.initialized = true;

        // DIAGNOSTIC: Always log initialization attempts
        this._logDiagnostic('INIT', `initializeEnemy called for: ${enemy?.name || 'unknown'} (id: ${enemy?.id || 'none'})`);

        if (!enemy) {
            this._logDiagnostic('INIT', '❌ FAILED: enemy is null/undefined');
            return;
        }

        if (this.enemyAbilities.has(enemy.id || enemy)) {
            this._logDiagnostic('INIT', `⏭️ SKIPPED: ${enemy.name} already initialized`);
            return;
        }

        const enemyId = enemy.id || `enemy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        if (!enemy.id) {
            enemy.id = enemyId;
            this._logDiagnostic('INIT', `🔧 Generated new ID for ${enemy.name}: ${enemyId}`);
        }

        const tier = enemy.tier || 'TIER_2';
        this._logDiagnostic('INIT', `📊 Enemy tier: ${tier}`);

        // Build ability set
        // Note: recoveryTime is now defined on each ability, not on the abilitySet
        const abilitySet = {
            signatureAbility: null,  // Single signature ability
            attacks: [],             // Legacy: still used for fallback
            passives: [],
            mechanics: [],
            behavior: null,
            cooldowns: {},
            globalCooldown: 0,
            activeEffects: [],
            abilityLockout: false,   // Prevent ability use during recovery
            lastAbilityTime: 0       // Track when ability was last used
        };

        // Try to get signature ability from mapping
        const signatureMapping = this.MONSTER_SIGNATURE_ABILITIES[enemy.name];

        if (signatureMapping) {
            this._logDiagnostic('INIT', `✅ Found signature mapping for ${enemy.name}: ${signatureMapping.signatureAbility}`);

            // Load the signature ability
            const abilityId = signatureMapping.signatureAbility;

            if (typeof AbilityRepository !== 'undefined') {
                // BUGFIX: Pass enemy to getScaledAttack so named exceptions work
                // (e.g., Void Touched can use void_beam, Giant Spider can use sweep)
                const scaled = AbilityRepository.getScaledAttack(abilityId, tier, enemy);

                if (scaled) {
                    abilitySet.signatureAbility = scaled;
                    abilitySet.cooldowns[abilityId] = 0;
                    // Also add to attacks array for compatibility
                    abilitySet.attacks.push(scaled);
                    this._logDiagnostic('INIT', `✅ Loaded ability: ${scaled.name} (dmg: ${scaled.damage}, range: ${scaled.range}, cd: ${scaled.cooldown}ms)`);
                } else {
                    // Log error if ability couldn't be loaded
                    this._logDiagnostic('INIT', `❌ FAILED to load ability '${abilityId}' for ${enemy.name} (tier: ${tier})`);
                    console.error(`[EnemyAbility] getScaledAttack returned NULL. Check if ability exists and forEnemy=true`);
                }
            } else {
                this._logDiagnostic('INIT', `❌ CRITICAL: AbilityRepository is NOT defined!`);
            }

            // Initialize passives from mapping
            const passiveList = Array.isArray(signatureMapping.signaturePassive)
                ? signatureMapping.signaturePassive
                : [signatureMapping.signaturePassive];

            // BUGFIX: Populate enemy.passives array for runtime passive checks
            if (!enemy.passives) enemy.passives = [];

            for (const passiveId of passiveList) {
                if (!passiveId) continue;

                // Add passive ID to enemy.passives for runtime checks
                if (!enemy.passives.includes(passiveId)) {
                    enemy.passives.push(passiveId);
                }

                // Get passive from repository if available
                if (typeof AbilityRepository !== 'undefined') {
                    const passive = AbilityRepository.getPassive(passiveId, tier);
                    if (passive) {
                        abilitySet.passives.push(passive);
                        // Initialize passive effects on enemy
                        this.initializePassiveOnEnemy(enemy, passive);
                    }
                } else {
                    // Fallback: create basic passive entry
                    abilitySet.passives.push({ id: passiveId, tier: tier });
                }

                // Also add mechanics that are listed as passives (death_explosion, etc.)
                if (['death_explosion', 'teleport_when_hurt', 'call_for_help', 'enrage', 'split'].includes(passiveId)) {
                    if (typeof AbilityRepository !== 'undefined') {
                        const mechanic = AbilityRepository.getMechanic(passiveId, tier);
                        if (mechanic) {
                            abilitySet.mechanics.push(mechanic);
                        }
                    }
                }
            }
        } else {
            // Fallback to legacy preset system if no signature mapping
            if (!this.missingAbilityMonsters.has(enemy.name)) {
                this.missingAbilityMonsters.add(enemy.name);
                if (this.config.debugLogging) {
                    console.warn(`[EnemyAbility] No signature ability mapping for: ${enemy.name}`);
                }
            }

            // Use legacy preset system
            const preset = this.getPresetForEnemy(enemy);
            const maxAttacks = this.getMaxAttacksForTier(tier);
            const attackIds = preset.attacks.slice(0, maxAttacks);

            for (const attackId of attackIds) {
                if (typeof AbilityRepository !== 'undefined') {
                    // BUGFIX: Pass enemy to getScaledAttack for named exceptions
                    const scaled = AbilityRepository.getScaledAttack(attackId, tier, enemy);
                    if (scaled) {
                        abilitySet.attacks.push(scaled);
                        abilitySet.cooldowns[attackId] = 0;
                        // Use first attack as signature if none set
                        if (!abilitySet.signatureAbility) {
                            abilitySet.signatureAbility = scaled;
                        }
                    }
                }
            }

            // Legacy passive assignment
            // BUGFIX: Ensure enemy.passives is populated for legacy enemies too
            if (!enemy.passives) enemy.passives = [];

            const maxPassives = tier === 'ELITE' ? 2 : (tier === 'TIER_1' ? 1 : 0);
            for (let i = 0; i < Math.min(maxPassives, preset.passives.length); i++) {
                const passiveId = preset.passives[i];
                if (typeof AbilityRepository !== 'undefined') {
                    const passive = AbilityRepository.getPassive(passiveId, tier);
                    if (passive) {
                        abilitySet.passives.push(passive);
                        // BUGFIX: Add passive ID to enemy.passives for runtime checks
                        if (!enemy.passives.includes(passiveId)) {
                            enemy.passives.push(passiveId);
                        }
                        this.initializePassiveOnEnemy(enemy, passive);
                    }
                }
            }

            // Legacy mechanics (elites and tier 1)
            if (tier === 'ELITE' || tier === 'TIER_1') {
                for (const mechanicId of preset.mechanics.slice(0, 1)) {
                    if (typeof AbilityRepository !== 'undefined') {
                        const mechanic = AbilityRepository.getMechanic(mechanicId, tier);
                        if (mechanic) {
                            abilitySet.mechanics.push(mechanic);
                        }
                    }
                }
            }

            // Legacy behavior
            if (preset.behavior && typeof AbilityRepository !== 'undefined') {
                abilitySet.behavior = AbilityRepository.getBehavior(preset.behavior, tier);
            }
        }

        this.enemyAbilities.set(enemyId, abilitySet);

        if (this.config.debugLogging) {
            const abilityName = abilitySet.signatureAbility?.name || 'none';
            // console.log(`[EnemyAbility] Initialized ${enemy.name} (${tier}): signature=${abilityName}, passives=${abilitySet.passives.length}`);
        }
    },

    /**
     * Initialize a passive effect on an enemy (called during initialization)
     * @param {object} enemy - The enemy entity
     * @param {object} passive - The passive ability data
     */
    initializePassiveOnEnemy(enemy, passive) {
        if (!enemy || !passive) return;

        switch (passive.id) {
            case 'armored':
                enemy.armored = true;
                enemy.damageReduction = passive.damageReduction || 0.2;
                break;

            case 'evasion':
                enemy.evasive = true;
                enemy.evasionChance = passive.evasionChance || 0.15;
                break;

            case 'ethereal':
                enemy.ethereal = true;
                enemy.physicalResist = passive.physicalResist || 0.5;
                break;

            case 'thorns':
                enemy.thorns = true;
                enemy.thornsDamage = passive.damage || 5;
                enemy.thornsPercent = passive.percent || 0.1;
                break;

            case 'undying':
                enemy.undying = true;
                enemy.undyingTriggered = false;
                break;

            case 'shield_barrier':
                enemy.hasShieldBarrier = true;
                enemy.shieldActive = false;
                enemy.shieldCooldown = 0;
                break;

            case 'fire_aura':
            case 'frost_aura':
                enemy.hasAura = true;
                enemy.auraType = passive.id;
                enemy.auraTimer = 0;
                break;

            case 'regeneration':
                enemy.hasRegeneration = true;
                enemy.regenRate = passive.healRate || 0.01;
                break;

            case 'berserk':
                enemy.canBerserk = true;
                enemy.berserkThreshold = passive.healthThreshold || 0.3;
                enemy.berserkActive = false;
                break;

            case 'ambusher':
                enemy.isAmbusher = true;
                enemy.ambushBonus = passive.damageBonus || 1.5;
                break;

            case 'pack_hunter':
                enemy.isPackHunter = true;
                enemy.packBonus = passive.damageBonus || 0.15;
                break;

            case 'poison_touch':
                enemy.hasPoisonTouch = true;
                enemy.poisonDamage = passive.damage || 3;
                break;

            case 'adaptive_resistance':
                enemy.hasAdaptiveResistance = true;
                enemy.lastDamageType = null;
                enemy.adaptiveResist = {};
                break;
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
     * Uses signature ability system - always uses ability when ready and in range
     * @param {object} enemy - The enemy
     * @param {object} target - The target (player)
     * @returns {object|null} The ability used (with cooldown), or null if none used
     */
    tryUseAbility(enemy, target) {
        // Track diagnostic calls
        this.diagnostics.tryUseAbilityCalls++;

        // DIAGNOSTIC: Verbose logging
        if (this.config.verboseLogging) {
            this._logDiagnostic('TRY', `tryUseAbility called for ${enemy.name} (id: ${enemy.id})`);
        }

        const abilitySet = this.enemyAbilities.get(enemy.id);
        if (!abilitySet) {
            // CRITICAL FAILURE: Enemy not registered
            this.diagnostics.failureReasons.noAbilitySet++;
            this._recordAttempt(enemy, 'failure', 'No ability set registered');
            this._logDiagnostic('TRY', `❌ FAILURE: No ability set for ${enemy.name} (id: ${enemy.id})`);
            console.error(`[EnemyAbility] enemyAbilities.size: ${this.enemyAbilities.size}`);
            console.error(`[EnemyAbility] Registered IDs:`, Array.from(this.enemyAbilities.keys()).slice(0, 5));
            return null;
        }

        // Check for ability lockout (during recovery)
        if (abilitySet.abilityLockout) {
            this.diagnostics.failureReasons.abilityLockout++;
            this._recordAttempt(enemy, 'failure', 'Ability lockout (in recovery)');
            if (this.config.verboseLogging) {
                this._logDiagnostic('TRY', `⏸️ ${enemy.name} is locked out (in recovery)`);
            }
            return null;
        }

        // Check global cooldown
        if (abilitySet.globalCooldown > 0) {
            this.diagnostics.failureReasons.globalCooldown++;
            this._recordAttempt(enemy, 'failure', `Global CD: ${abilitySet.globalCooldown.toFixed(0)}ms`);
            if (this.config.verboseLogging) {
                this._logDiagnostic('TRY', `⏱️ ${enemy.name} on global CD (${abilitySet.globalCooldown.toFixed(0)}ms remaining)`);
            }
            return null;
        }

        // Get the signature ability (primary system)
        const ability = abilitySet.signatureAbility;

        if (ability) {
            // Check ability cooldown
            if (abilitySet.cooldowns[ability.id] > 0) {
                this.diagnostics.failureReasons.abilityCooldown++;
                this._recordAttempt(enemy, 'failure', `Ability CD: ${abilitySet.cooldowns[ability.id].toFixed(0)}ms`, ability);
                if (this.config.verboseLogging) {
                    this._logDiagnostic('TRY', `⏱️ ${enemy.name}'s ${ability.name} on CD (${abilitySet.cooldowns[ability.id].toFixed(0)}ms remaining)`);
                }
                return null;
            }

            // Check range - BUGFIX: Account for AOE abilities that store range differently
            const dist = this.getDistance(enemy, target);
            let abilityRange = ability.range;

            // For AOE abilities, get range from AOE shape
            // - circle/arc shapes use 'radius'
            // - cone shapes use 'range'
            // - line shapes use 'length'
            if (!abilityRange && ability.aoe) {
                abilityRange = ability.aoe.range || ability.aoe.radius || ability.aoe.length || 2;
            }

            // Default fallback
            if (!abilityRange) abilityRange = 2;

            if (dist > abilityRange) {
                this.diagnostics.failureReasons.outOfRange++;
                this._recordAttempt(enemy, 'failure', `Out of range (dist: ${dist.toFixed(1)}, need: ${abilityRange})`, ability);
                if (this.config.verboseLogging) {
                    this._logDiagnostic('TRY', `📏 ${enemy.name} out of range (dist: ${dist.toFixed(1)}, ability range: ${abilityRange})`);
                }
                return null;
            }

            // SUCCESS: Execute the signature ability
            this.diagnostics.abilitiesExecuted++;
            this._recordAttempt(enemy, 'success', 'Ability executed', ability);
            this._logDiagnostic('EXECUTE', `✅ ${enemy.name} EXECUTING ${ability.name} (range: ${abilityRange}, dist: ${dist.toFixed(1)})`);

            this.executeAbility(enemy, target, ability, abilitySet);
            // BUGFIX: Return ability object so caller can access cooldown
            return ability;
        } else {
            this.diagnostics.failureReasons.noSignatureAbility++;
            this._recordAttempt(enemy, 'failure', 'No signature ability assigned');
            this._logDiagnostic('TRY', `⚠️ ${enemy.name} has no signature ability!`);
        }

        // Fallback: try legacy attack array if no signature ability
        if (abilitySet.attacks.length === 0) {
            this.diagnostics.failureReasons.noLegacyAbilities++;
            this._recordAttempt(enemy, 'failure', 'No legacy abilities available');
            return null;
        }

        // Find available abilities from legacy array
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

        if (available.length === 0) return null;

        // Select and execute ability from legacy pool
        const selectedAbility = this.selectAbility(enemy, target, available);
        if (!selectedAbility) return null;

        this.diagnostics.abilitiesExecuted++;
        this._recordAttempt(enemy, 'success', 'Legacy ability executed', selectedAbility);
        this._logDiagnostic('EXECUTE', `✅ ${enemy.name} EXECUTING (legacy) ${selectedAbility.name}`);

        this.executeAbility(enemy, target, selectedAbility, abilitySet);
        // BUGFIX: Return ability object so caller can access cooldown
        return selectedAbility;
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
     * Execute an ability with full lifecycle: telegraph -> resolve -> recovery -> idle
     * Implements abilityLockout flag to prevent ability spam during recovery
     */
    executeAbility(enemy, target, ability, abilitySet) {
        // Set ability lockout immediately
        // BUGFIX: Set on both abilitySet AND enemy so AI can check enemy.abilityLockout
        abilitySet.abilityLockout = true;
        enemy.abilityLockout = true;
        abilitySet.lastAbilityTime = Date.now();

        // Set cooldowns
        abilitySet.cooldowns[ability.id] = ability.cooldown || 2000;
        abilitySet.globalCooldown = this.config.globalCooldownBase;

        // BUGFIX: Sync combat system's attackCooldown to prevent combat-master/combat-system
        // from falling through to basic attacks while ability is on cooldown.
        // Combat systems use seconds, ability system uses ms.
        if (enemy.combat) {
            enemy.combat.attackCooldown = (ability.cooldown || 2000) / 1000;
        }

        // Determine attack type from ability category for visual rendering
        const attackType = this.getAttackTypeFromAbility(ability);

        // Calculate telegraph time
        // Check if this ability is in the fast telegraph exceptions
        const isFastException = this.FAST_TELEGRAPH_EXCEPTIONS.includes(ability.id);

        let telegraphTime;
        if (isFastException) {
            // Fast exceptions use ability's native telegraph time (or minimal)
            telegraphTime = ability.telegraphTime || 100;
        } else {
            // Use minimum telegraph time based on combat config
            const minWindupTime = typeof COMBAT_CONFIG !== 'undefined'
                ? COMBAT_CONFIG.enemyAttackDuration * COMBAT_CONFIG.enemyWindupPercent
                : 140;  // 140ms default (35% of 400ms)

            telegraphTime = Math.max(ability.telegraphTime || 0, minWindupTime);
        }

        // Get recovery time from the ability itself (not abilitySet)
        const recoveryTime = ability.recoveryTime || 500;

        // Set up attack animation state for visual rendering
        if (enemy.combat) {
            enemy.combat.attackAnimation = {
                state: 'windup',
                timer: telegraphTime,
                maxTimer: telegraphTime,
                totalDuration: telegraphTime + recoveryTime,
                type: attackType,
                targetLocked: {
                    x: target.gridX,
                    y: target.gridY,
                    entity: target
                },
                abilityBased: true,  // Flag to indicate ability-based attack
                abilityId: ability.id
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

        // Create telegraph if ability has AOE (for ground indicators)
        if (telegraphTime > 0 && ability.aoe) {
            this.createTelegraph(enemy, target, ability);
        }

        // Start visual effect via EffectAnimator (event-driven telegraph system)
        let effectId = null;
        let abilityConfigForAudio = null;  // Store for audio playback
        if (typeof EffectAnimator !== 'undefined' && typeof ABILITY_EFFECTS !== 'undefined') {
            const abilityConfig = ABILITY_EFFECTS[ability.id];
            abilityConfigForAudio = abilityConfig;  // Save for audio
            if (abilityConfig) {
                // Calculate base direction toward target
                let direction = Math.atan2(target.gridY - enemy.gridY, target.gridX - enemy.gridX);

                // Apply direction offset from config (e.g., tail_whip attacks behind the caster)
                // directionOffset is in radians (e.g., Math.PI for 180 degrees)
                if (abilityConfig.telegraph?.directionOffset) {
                    direction += abilityConfig.telegraph.directionOffset;
                }

                // Check if this is a sequence ability (like double_strike)
                if (abilityConfig.sequence && Array.isArray(abilityConfig.sequence)) {
                    // For sequence abilities, start only the telegraph effect initially
                    // The individual impact effects will be spawned during resolution
                    effectId = EffectAnimator.startEffect(ability.id, {
                        x: enemy.gridX,
                        y: enemy.gridY,
                        targetX: target.gridX,
                        targetY: target.gridY,
                        rotation: direction * 180 / Math.PI,
                        enemyId: enemy.id,
                        config: abilityConfig,
                        isSequenceTelegraph: true  // Flag to indicate this is the sequence telegraph
                    });

                    // Store sequence info for resolution phase
                    const telegraph = this.activeTelegraphs.find(t => t.enemyId === enemy.id && t.abilityId === ability.id);
                    if (telegraph) {
                        telegraph.effectId = effectId;
                        telegraph.lockedDirection = direction;
                        telegraph.isSequence = true;
                        telegraph.sequenceConfig = abilityConfig.sequence;
                    }
                } else {
                    // Normal single-effect ability
                    effectId = EffectAnimator.startEffect(ability.id, {
                        x: enemy.gridX,
                        y: enemy.gridY,
                        targetX: target.gridX,
                        targetY: target.gridY,
                        rotation: direction * 180 / Math.PI,
                        enemyId: enemy.id,
                        config: abilityConfig,
                        // Store tracking flag for beams that track during channel
                        tracking: abilityConfig.channel?.trackingSpeed > 0
                    });

                    // Store effectId on telegraph for resolution
                    const telegraph = this.activeTelegraphs.find(t => t.enemyId === enemy.id && t.abilityId === ability.id);
                    if (telegraph) {
                        telegraph.effectId = effectId;
                        telegraph.lockedDirection = direction;  // Lock direction at creation
                    }
                }

                // ================================================================
                // AUDIO: Play telegraph (buildup) sound when ability starts
                // ================================================================
                this.playAbilityTelegraphSound(ability.id, abilityConfig);
            }
        }

        // Fallback: If no ABILITY_EFFECTS config, try to play default telegraph sound based on ability category
        if (!abilityConfigForAudio && ability.category && typeof ABILITY_AUDIO_DEFAULTS !== 'undefined') {
            const categoryDefaults = ABILITY_AUDIO_DEFAULTS[ability.category];
            if (categoryDefaults?.telegraph) {
                this._playSfx(categoryDefaults.telegraph);
            }
        }

        // ====================================================================
        // CASTER MOVEMENT - Handle leap/pounce movement during telegraph
        // ====================================================================
        const leapAbilityConfig = typeof ABILITY_EFFECTS !== 'undefined' ? ABILITY_EFFECTS[ability.id] : null;
        if (leapAbilityConfig?.casterMovement && leapAbilityConfig.casterMovement.type === 'leap') {
            const movementConfig = leapAbilityConfig.casterMovement;
            const startDelay = telegraphTime * (movementConfig.startTime || 0.3);
            const leapDuration = telegraphTime * (1 - (movementConfig.startTime || 0.3));

            // Calculate target position based on landAt configuration
            let targetX = target.gridX;
            let targetY = target.gridY;
            if (movementConfig.landAt === 'center') {
                // Find the telegraph for this ability to get center position
                const telegraph = this.activeTelegraphs.find(t => t.enemyId === enemy.id && t.abilityId === ability.id);
                if (telegraph) {
                    targetX = telegraph.targetX;
                    targetY = telegraph.targetY;
                }
            }

            // Store original position for lerp calculation
            const startX = enemy.gridX;
            const startY = enemy.gridY;

            // Mark enemy as leaping (for AI and collision handling)
            if (movementConfig.disableAI) {
                enemy.leaping = true;
            }

            // Store leap interval reference on enemy for cleanup
            const enemyLeapRef = enemy;

            // Start leap after startDelay
            setTimeout(() => {
                // Check if enemy is still alive before starting leap
                if (enemyLeapRef.hp <= 0 || enemyLeapRef.dead) {
                    enemyLeapRef.leaping = false;
                    enemyLeapRef.leapHeight = 0;
                    return;
                }

                // Animate the leap using interval for smooth movement
                const leapStartTime = Date.now();
                const leapInterval = setInterval(() => {
                    // Check if enemy died during leap
                    if (enemyLeapRef.hp <= 0 || enemyLeapRef.dead) {
                        clearInterval(leapInterval);
                        enemyLeapRef.leaping = false;
                        enemyLeapRef.leapHeight = 0;
                        return;
                    }

                    const elapsed = Date.now() - leapStartTime;
                    const progress = Math.min(1, elapsed / leapDuration);

                    // Lerp position from start to target
                    if (movementConfig.updatePosition !== false) {
                        enemyLeapRef.gridX = startX + (targetX - startX) * progress;
                        enemyLeapRef.gridY = startY + (targetY - startY) * progress;
                    }

                    // Calculate arc height using parabola: 4h * t * (1-t)
                    // This creates a smooth arc peaking at t=0.5
                    const arcHeight = movementConfig.arcHeight || 2.0;
                    enemyLeapRef.leapHeight = 4 * arcHeight * progress * (1 - progress);

                    // Update display position for rendering (smooth movement)
                    enemyLeapRef.displayX = enemyLeapRef.gridX;
                    enemyLeapRef.displayY = enemyLeapRef.gridY;

                    // Leap complete
                    if (progress >= 1) {
                        clearInterval(leapInterval);
                        enemyLeapRef.leaping = false;
                        enemyLeapRef.leapHeight = 0;

                        // Ensure final position is exact
                        if (movementConfig.updatePosition !== false) {
                            enemyLeapRef.gridX = targetX;
                            enemyLeapRef.gridY = targetY;
                            enemyLeapRef.displayX = targetX;
                            enemyLeapRef.displayY = targetY;
                        }

                        if (this.config.debugLogging) {
                            console.log(`[EnemyAbility] ${enemyLeapRef.name} leap complete at (${targetX.toFixed(1)}, ${targetY.toFixed(1)})`);
                        }
                    }
                }, 16); // ~60fps update rate

                // Store interval reference for potential cleanup
                enemyLeapRef._leapInterval = leapInterval;

            }, startDelay);

            if (this.config.debugLogging) {
                console.log(`[EnemyAbility] ${enemy.name} starting leap: delay=${startDelay.toFixed(0)}ms, duration=${leapDuration.toFixed(0)}ms, target=(${targetX.toFixed(1)}, ${targetY.toFixed(1)})`);
            }
        }

        // ====================================================================
        // CASTER MOVEMENT - Handle charge/lunge dash movement during telegraph
        // Linear movement along a direction (different from parabolic leap)
        // ====================================================================
        const dashAbilityConfig = typeof ABILITY_EFFECTS !== 'undefined' ? ABILITY_EFFECTS[ability.id] : null;
        const isDashAbility = dashAbilityConfig?.dash ||
            ability.effect === 'dash_to_target' ||
            ability.moveDuringAttack ||
            ability.category === 'charge';

        if (isDashAbility && !leapAbilityConfig?.casterMovement) {
            // Get dash configuration from ABILITY_EFFECTS or ability data
            const dashConfig = dashAbilityConfig?.dash || {};

            // Calculate dash direction and distance
            const dx = target.gridX - enemy.gridX;
            const dy = target.gridY - enemy.gridY;
            const direction = Math.atan2(dy, dx);

            // Determine dash distance from ability config
            let dashDistance = ability.dashDistance || ability.range ||
                dashAbilityConfig?.telegraph?.length || 6;

            // Calculate start and end positions
            const dashStartX = enemy.gridX;
            const dashStartY = enemy.gridY;
            const dashEndX = enemy.gridX + Math.cos(direction) * dashDistance;
            const dashEndY = enemy.gridY + Math.sin(direction) * dashDistance;

            // Store dash state on enemy
            enemy.isDashing = true;
            enemy.dashStartPos = { x: dashStartX, y: dashStartY };
            enemy.dashEndPos = { x: dashEndX, y: dashEndY };
            enemy.dashDirection = direction;
            enemy.dashProgress = 0;
            enemy.dashSpeed = dashConfig.speed || 400; // pixels per second
            enemy.dashTrail = dashConfig.trail || false;
            enemy.dashAfterimages = dashConfig.afterimages || 0;
            enemy.dashAfterimagePositions = [];
            enemy.dashHitPlayer = false;
            enemy.dashHitWall = false;
            enemy.dashAbility = ability;
            enemy.dashDamageDealt = false; // Track if damage was already dealt

            // Store reference for self-stun on wall collision
            enemy.dashWallStun = dashAbilityConfig?.impact?.stunStars || ability.stunOnWall || false;
            enemy.dashWallCrack = dashAbilityConfig?.impact?.wallCrack || false;

            // Calculate dash duration based on speed and distance
            // Speed is in pixels/sec, distance is in tiles
            const tileSize = typeof game !== 'undefined' ? (game.tileSize || 48) : 48;
            enemy.dashDuration = (dashDistance * tileSize) / enemy.dashSpeed * 1000; // Convert to ms
            enemy.dashStartTime = Date.now() + telegraphTime * 0.3; // Start dash 30% into telegraph

            if (this.config.debugLogging) {
                console.log(`[EnemyAbility] ${enemy.name} preparing dash: distance=${dashDistance.toFixed(1)}, direction=${(direction * 180 / Math.PI).toFixed(0)}deg, duration=${enemy.dashDuration.toFixed(0)}ms`);
            }
        }

        // ====================================================================
        // CASTER MOVEMENT - Handle lunge movement (small forward snap + return)
        // Used for bite attacks - quick snap forward and back
        // ====================================================================
        const lungeAbilityConfig = typeof ABILITY_EFFECTS !== 'undefined' ? ABILITY_EFFECTS[ability.id] : null;
        if (lungeAbilityConfig?.lunge && !enemy.isDashing && !enemy.leaping) {
            const lungeConfig = lungeAbilityConfig.lunge;

            // Calculate direction toward target
            const dx = target.gridX - enemy.gridX;
            const dy = target.gridY - enemy.gridY;
            const direction = Math.atan2(dy, dx);

            // Store lunge state on enemy
            enemy.isLunging = true;
            enemy.lungeStartX = enemy.gridX;
            enemy.lungeStartY = enemy.gridY;
            enemy.lungeDirection = direction;
            enemy.lungeDistance = lungeConfig.distance || 0.5;
            enemy.lungeDuration = lungeConfig.duration || 150;
            enemy.lungeProgress = 0;
            enemy.lungeStartTime = Date.now() + telegraphTime * 0.5; // Start lunge halfway through telegraph
            enemy.lungeReturnAfter = true; // Always return to start position after bite

            if (this.config.debugLogging) {
                console.log(`[EnemyAbility] ${enemy.name} preparing lunge: distance=${enemy.lungeDistance}, duration=${enemy.lungeDuration}ms`);
            }
        }

        // Store references for cleanup
        const enemyRef = enemy;
        const abilitySetRef = abilitySet;

        // Delayed execution after telegraph/windup
        setTimeout(() => {
            // Check if enemy is still alive
            if (enemyRef.hp <= 0) {
                this.cleanupAbilityState(enemyRef, abilitySetRef);
                return;
            }

            // Resolve the ability (deal damage, apply effects)
            this.resolveAbility(enemyRef, target, ability);

            // Enter recovery phase
            this.enterRecovery(enemyRef, abilitySetRef, recoveryTime);

        }, telegraphTime);

        if (this.config.debugLogging) {
            // console.log(`[EnemyAbility] ${enemy.name} using ${ability.name} (type: ${attackType}, telegraph: ${telegraphTime}ms, recovery: ${recoveryTime}ms)`);
        }
    },

    /**
     * Enter recovery phase after ability resolves
     * During recovery, enemy takes bonus damage and cannot use abilities
     * @param {object} enemy - The enemy entity
     * @param {object} abilitySet - The enemy's ability set
     * @param {number} recoveryTime - Duration of recovery in ms
     */
    enterRecovery(enemy, abilitySet, recoveryTime) {
        // Set recovery state on attack animation
        if (enemy.combat?.attackAnimation) {
            enemy.combat.attackAnimation.state = 'recovery';
            enemy.combat.attackAnimation.timer = recoveryTime;
        }

        // Mark enemy as in recovery (for damage bonus from player)
        enemy.inRecovery = true;
        enemy.recoveryBonusDamage = 1.25;  // 25% bonus damage during recovery

        // Store reference for timeout
        const enemyRef = enemy;
        const abilitySetRef = abilitySet;

        // Exit recovery after duration
        setTimeout(() => {
            this.cleanupAbilityState(enemyRef, abilitySetRef);
        }, recoveryTime);
    },

    /**
     * Clean up all ability state flags after recovery completes
     * Resets enemy to idle state ready for next ability
     * @param {object} enemy - The enemy entity
     * @param {object} abilitySet - The enemy's ability set
     */
    cleanupAbilityState(enemy, abilitySet) {
        // Clear ability lockout
        // BUGFIX: Clear on both abilitySet AND enemy
        if (abilitySet) {
            abilitySet.abilityLockout = false;
        }
        if (enemy) {
            enemy.abilityLockout = false;
        }

        // Clear recovery state
        if (enemy) {
            enemy.inRecovery = false;
            enemy.recoveryBonusDamage = 1.0;
        }

        // Clear leap state (from pounce ability)
        if (enemy) {
            enemy.leaping = false;
            enemy.leapHeight = 0;
            // Clear any active leap interval
            if (enemy._leapInterval) {
                clearInterval(enemy._leapInterval);
                enemy._leapInterval = null;
            }
        }

        // Clear dash state (from charge/lunge abilities)
        if (enemy) {
            enemy.isDashing = false;
            enemy.dashStartPos = null;
            enemy.dashEndPos = null;
            enemy.dashDirection = null;
            enemy.dashProgress = 0;
            enemy.dashSpeed = 0;
            enemy.dashTrail = false;
            enemy.dashAfterimages = 0;
            enemy.dashAfterimagePositions = [];
            enemy.dashHitPlayer = false;
            enemy.dashHitWall = false;
            enemy.dashAbility = null;
            enemy.dashDamageDealt = false;
            enemy.dashWallStun = false;
            enemy.dashWallCrack = false;
            enemy.dashDuration = 0;
            enemy.dashStartTime = 0;
        }

        // Clear lunge state (from bite ability)
        if (enemy) {
            if (enemy.isLunging) {
                // Return to original position if still lunging
                enemy.gridX = enemy.lungeStartX || enemy.gridX;
                enemy.gridY = enemy.lungeStartY || enemy.gridY;
                enemy.displayX = enemy.gridX;
                enemy.displayY = enemy.gridY;
            }
            enemy.isLunging = false;
            enemy.lungeStartX = null;
            enemy.lungeStartY = null;
            enemy.lungeDirection = null;
            enemy.lungeDistance = 0;
            enemy.lungeDuration = 0;
            enemy.lungeProgress = 0;
            enemy.lungeStartTime = 0;
            enemy.lungeReturnAfter = false;
        }

        // Stop any active audio loops for this enemy
        if (enemy) {
            this.stopAbilityAudioLoop(enemy.id);
        }

        // Reset attack animation to idle
        if (enemy.combat?.attackAnimation) {
            enemy.combat.attackAnimation.state = 'idle';
            enemy.combat.attackAnimation.timer = 0;
        }

        if (this.config.debugLogging) {
            // console.log(`[EnemyAbility] ${enemy.name} ability cleanup complete, ready for next ability`);
        }
    },

    // ========================================================================
    // ABILITY AUDIO SYSTEM
    // ========================================================================

    /**
     * Play telegraph (buildup) sound for an ability
     * @param {string} abilityId - The ability ID
     * @param {object} abilityConfig - The ABILITY_EFFECTS config for the ability
     */
    playAbilityTelegraphSound(abilityId, abilityConfig) {
        // Get audio config from ability definition
        const audioConfig = abilityConfig?.audio;
        if (!audioConfig) {
            // Try to use default based on baseRef
            const baseRef = abilityConfig?.baseRef;
            if (baseRef && typeof ABILITY_AUDIO_DEFAULTS !== 'undefined') {
                const defaultAudio = ABILITY_AUDIO_DEFAULTS[baseRef];
                if (defaultAudio?.telegraph) {
                    this._playSfx(defaultAudio.telegraph);
                }
            }
            return;
        }

        // Play telegraph sound
        if (audioConfig.telegraph) {
            this._playSfx(audioConfig.telegraph);
        }
    },

    /**
     * Play impact sound for an ability
     * @param {string} abilityId - The ability ID
     * @param {object} abilityConfig - The ABILITY_EFFECTS config for the ability
     */
    playAbilityImpactSound(abilityId, abilityConfig) {
        // Get audio config from ability definition
        const audioConfig = abilityConfig?.audio;
        if (!audioConfig) {
            // Try to use default based on baseRef
            const baseRef = abilityConfig?.baseRef;
            if (baseRef && typeof ABILITY_AUDIO_DEFAULTS !== 'undefined') {
                const defaultAudio = ABILITY_AUDIO_DEFAULTS[baseRef];
                if (defaultAudio?.impact) {
                    this._playSfx(defaultAudio.impact, { priority: 'HIGH' });
                }
            }
            return;
        }

        // Play impact sound (if not null - breath/beam abilities don't have impact sounds)
        if (audioConfig.impact) {
            this._playSfx(audioConfig.impact, { priority: 'HIGH' });
        }
    },

    /**
     * Start a looping channel sound for breath/beam abilities
     * @param {number} enemyId - Enemy ID for tracking
     * @param {string} abilityId - The ability ID
     * @param {object} abilityConfig - The ABILITY_EFFECTS config
     * @returns {object|null} Voice handle for stopping later
     */
    startAbilityChannelSound(enemyId, abilityId, abilityConfig) {
        const audioConfig = abilityConfig?.audio;
        let channelSoundId = audioConfig?.channel;

        // Try default if not specified
        if (!channelSoundId) {
            const baseRef = abilityConfig?.baseRef;
            if (baseRef && typeof ABILITY_AUDIO_DEFAULTS !== 'undefined') {
                channelSoundId = ABILITY_AUDIO_DEFAULTS[baseRef]?.channel;
            }
        }

        if (!channelSoundId) return null;

        // Stop any existing loop for this enemy
        this.stopAbilityAudioLoop(enemyId);

        // Start the loop
        const voice = this._playSfx(channelSoundId, {
            priority: 'HIGH',
            ignoreCooldown: true
        });

        if (voice) {
            this.activeAudioLoops.set(enemyId, {
                voiceHandle: voice,
                abilityId: abilityId,
                soundId: channelSoundId
            });
        }

        return voice;
    },

    /**
     * Stop a looping channel sound for an enemy
     * @param {number} enemyId - Enemy ID
     */
    stopAbilityAudioLoop(enemyId) {
        const loopData = this.activeAudioLoops.get(enemyId);
        if (loopData && loopData.voiceHandle) {
            if (typeof SFXSystem !== 'undefined' && typeof SFXSystem.stopVoice === 'function') {
                SFXSystem.stopVoice(loopData.voiceHandle);
            }
        }
        this.activeAudioLoops.delete(enemyId);
    },

    /**
     * Internal helper to play SFX through available audio systems
     * @param {string} soundId - Sound ID to play
     * @param {object} options - Playback options
     * @returns {object|null} Voice handle or null
     */
    _playSfx(soundId, options = {}) {
        if (!soundId) return null;

        try {
            // Try SFXSystem first (preferred)
            if (typeof SFXSystem !== 'undefined' && typeof SFXSystem.play === 'function') {
                return SFXSystem.play(soundId, {
                    category: 'combat',
                    priority: options.priority || 'HIGH',
                    volume: options.volume || 1.0,
                    ignoreCooldown: options.ignoreCooldown || false
                });
            }

            // Fallback to AudioManager
            if (typeof AudioManager !== 'undefined' && typeof AudioManager.playSfx === 'function') {
                return AudioManager.playSfx(soundId, options.volume || 1.0);
            }

            // Fallback to CombatAudio
            if (typeof CombatAudio !== 'undefined' && typeof CombatAudio._safePlaySound === 'function') {
                return CombatAudio._safePlaySound('play', soundId, options);
            }
        } catch (e) {
            // Audio is optional, silently fail
            if (this.config.debugLogging) {
                console.warn(`[EnemyAbility] Audio playback failed for ${soundId}:`, e.message);
            }
        }

        return null;
    },

    // ========================================================================
    // RUNTIME PASSIVE HANDLERS
    // ========================================================================
    // These handle passives that trigger during gameplay rather than at initialization

    /**
     * Called when enemy takes damage
     * Handles reactive passives like thorns, teleport_when_hurt, adaptive_resistance
     * @param {object} enemy - The enemy that took damage
     * @param {number} damage - Amount of damage taken
     * @param {string} damageType - Type of damage (physical, fire, etc.)
     * @param {object} attacker - The entity that dealt the damage
     */
    onEnemyDamaged(enemy, damage, damageType, attacker) {
        if (!enemy) return;

        // Track last damage time for regeneration
        enemy._lastDamagedTime = Date.now();
        enemy._lastAttacker = attacker;

        // Thorns: reflect damage to attacker
        // BUGFIX: Use enemy.thorns flag (set in initializePassiveOnEnemy)
        if (enemy.thorns && attacker) {
            const reflectDamage = Math.floor(damage * (enemy.thornsPercent || 0.15));
            if (reflectDamage > 0) {
                // Apply reflected damage to attacker
                if (typeof applyDamage === 'function') {
                    applyDamage(attacker, reflectDamage, enemy, null);
                } else if (attacker.hp !== undefined) {
                    attacker.hp -= reflectDamage;
                }
                // Show thorns feedback
                if (typeof showDamageNumber === 'function') {
                    showDamageNumber(attacker, reflectDamage, '#FF6600');
                }
            }
        }

        // Teleport when hurt
        // BUGFIX: Check abilitySet for this passive via enemy.passives array
        if (enemy.passives?.includes('teleport_when_hurt')) {
            if (Math.random() < 0.25 && !enemy._teleportCooldown) {
                // BUGFIX: Pass both minDist and maxDist
                this.teleportEnemy(enemy, 4, 8);
                enemy._teleportCooldown = true;
                setTimeout(() => { enemy._teleportCooldown = false; }, 5000);
            }
        }

        // Adaptive resistance
        if (enemy.hasAdaptiveResistance) {
            if (!enemy._resistances) enemy._resistances = {};
            const current = enemy._resistances[damageType] || 0;
            enemy._resistances[damageType] = Math.min(current + 0.10, 0.50);
        }

        // Check enrage/berserk threshold
        if (enemy.canBerserk || enemy.passives?.includes('enrage')) {
            this.checkEnrageThreshold(enemy);
        }
    },

    /**
     * Called BEFORE damage is applied, returns modified damage
     * Handles defensive passives like evasion, shield_barrier, ethereal
     * @param {object} enemy - The enemy being attacked
     * @param {number} incomingDamage - Original damage amount
     * @param {object} attacker - The entity dealing the damage
     * @returns {number} Modified damage amount (0 if dodged/blocked)
     */
    onEnemyAttacked(enemy, incomingDamage, attacker) {
        if (!enemy) return incomingDamage;

        // Evasion: chance to dodge
        // BUGFIX: Use enemy.evasionChance (set in initializePassiveOnEnemy) instead of _evasionChance
        if (enemy.evasive && enemy.evasionChance) {
            if (Math.random() < enemy.evasionChance) {
                this.triggerDodgeVisual(enemy);
                return 0; // No damage dealt
            }
        }

        // Shield: block frontal attacks
        // BUGFIX: Use enemy.shieldActive (set in initializePassiveOnEnemy) instead of _shieldActive
        if (enemy.hasShieldBarrier && enemy.shieldActive) {
            const attackAngle = this.getAttackAngle(enemy, attacker);
            if (Math.abs(attackAngle) <= (enemy.shieldArc || 90) / 2) {
                this.triggerShieldBlockVisual(enemy);
                return 0; // Blocked
            }
        }

        // Ethereal: immune during ethereal phase
        if (enemy.ethereal && enemy._etherealImmune) {
            return 0; // Immune
        }

        // Adaptive resistance reduction
        if (enemy._resistances) {
            const damageType = attacker?.attackType || 'physical';
            const resistance = enemy._resistances[damageType] || 0;
            if (resistance > 0) {
                incomingDamage = Math.floor(incomingDamage * (1 - resistance));
            }
        }

        // Recovery bonus damage
        if (enemy.inRecovery && enemy.recoveryBonusDamage) {
            incomingDamage = Math.floor(incomingDamage * enemy.recoveryBonusDamage);
        }

        return incomingDamage;
    },

    /**
     * Called when enemy dies
     * Handles death-triggered passives like death_explosion, split, undying
     * @param {object} enemy - The enemy that died
     * @returns {boolean} True if enemy survived (undying triggered)
     */
    onEnemyDeath(enemy) {
        if (!enemy) return false;

        // BUGFIX: Check passives using both enemy.passives array and flags
        const hasPassives = enemy.passives && enemy.passives.length > 0;

        // Death explosion
        if (hasPassives && enemy.passives.includes('death_explosion')) {
            this.scheduleDeathExplosion(enemy, {
                delay: 1000,
                damage: 25,
                radius: 3,
                chainDepth: enemy._chainDepth || 0
            });
        }

        // Split into copies
        if (hasPassives && enemy.passives.includes('split')) {
            this.spawnSplitCopies(enemy, {
                count: 2,
                hpPercent: 0.30,
                sizePercent: 0.60
            });
        }

        // Undying: chance to survive
        if (enemy.undying && !enemy.undyingTriggered) {
            if (Math.random() < 0.20) {
                enemy.undyingTriggered = true;
                enemy.hp = 1;
                this.triggerUndyingVisual(enemy);
                return true; // Survived
            }
        }

        // BUGFIX: Get abilitySet for cleanup
        const abilitySet = this.enemyAbilities.get(enemy.id);
        this.cleanupAbilityState(enemy, abilitySet);

        // Cancel ability projectiles from this enemy
        // Note: Projectiles with persistsAfterCasterDeath (like homing_orb) will survive
        if (enemy.id && typeof AbilityProjectileSystem !== 'undefined') {
            AbilityProjectileSystem.cancelByEnemy(enemy.id);
        }

        // Cancel ability visual effects from this enemy
        if (enemy.id && typeof EffectAnimator !== 'undefined') {
            EffectAnimator.cancelByEnemy(enemy.id);
        }

        // Remove enemy from tracking
        if (enemy.id) {
            this.removeEnemy(enemy.id);
        }

        return false; // Did not survive
    },

    /**
     * Called when enemy first enters combat
     * Handles combat-start passives like call_for_help, ambusher
     * @param {object} enemy - The enemy entering combat
     * @param {object} target - The combat target (usually player)
     */
    onEnemyCombatStart(enemy, target) {
        if (!enemy || !enemy.passives) return;

        // Call for help
        if (enemy.passives.includes('call_for_help')) {
            this.alertNearbyEnemies(enemy, 8);
        }

        // Ambusher bonus for first attack
        if (enemy.passives.includes('ambusher')) {
            enemy._ambushBonus = 1.5; // +50% on first attack
        }
    },

    /**
     * Helper for enrage/berserk threshold checking
     * @param {object} enemy - The enemy to check
     */
    checkEnrageThreshold(enemy) {
        if (enemy._enraged) return; // Already enraged

        const threshold = 0.30;
        const hpPercent = enemy.hp / enemy.maxHp;

        if (hpPercent <= threshold) {
            enemy._enraged = true;
            enemy.damageMultiplier = (enemy.damageMultiplier || 1.0) * 1.5;
            enemy.speedMultiplier = (enemy.speedMultiplier || 1.0) * 1.3;
            this.triggerEnrageVisual(enemy);
        }
    },

    /**
     * Timer-based ethereal cycling
     * Call this in update loop for enemies with ethereal passive
     * @param {object} enemy - The enemy to update
     * @param {number} deltaTime - Time since last update in ms
     */
    updateEtherealCycle(enemy, deltaTime) {
        if (!enemy.passives?.includes('ethereal')) return;

        if (!enemy._etherealTimer) {
            enemy._etherealTimer = 0;
            enemy._etherealImmune = false;
        }

        enemy._etherealTimer += deltaTime;

        if (enemy._etherealImmune && enemy._etherealTimer >= 2000) {
            // Transition: immune -> vulnerable (5 seconds)
            enemy._etherealImmune = false;
            enemy._etherealTimer = 0;
            this.triggerEtherealVisual(enemy, false);
        } else if (!enemy._etherealImmune && enemy._etherealTimer >= 5000) {
            // Transition: vulnerable -> immune (2 seconds)
            enemy._etherealImmune = true;
            enemy._etherealTimer = 0;
            this.triggerEtherealVisual(enemy, true);
        }
    },

    /**
     * Timer-based regeneration
     * Call this in update loop for enemies with regeneration passive
     * @param {object} enemy - The enemy to update
     * @param {number} deltaTime - Time since last update in ms
     */
    updateRegeneration(enemy, deltaTime) {
        if (!enemy.passives?.includes('regeneration')) return;
        if (!enemy._lastDamagedTime) enemy._lastDamagedTime = 0;

        const timeSinceDamage = Date.now() - enemy._lastDamagedTime;

        // Only regen after 3 seconds of no damage
        if (timeSinceDamage >= 3000 && enemy.hp < enemy.maxHp) {
            const healAmount = enemy.maxHp * 0.02 * (deltaTime / 1000);
            enemy.hp = Math.min(enemy.hp + healAmount, enemy.maxHp);
        }
    },

    // ========================================================================
    // VISUAL EFFECT HELPERS (stubs for expansion)
    // ========================================================================

    /**
     * Show dodge visual effect
     * @param {object} enemy - The enemy that dodged
     */
    triggerDodgeVisual(enemy) {
        // Show "DODGE" text above enemy
        if (typeof FloatingTextManager !== 'undefined') {
            FloatingTextManager.spawn(enemy.gridX, enemy.gridY, 'DODGE', '#FFFFFF');
        }
    },

    /**
     * Show shield block visual effect
     * @param {object} enemy - The enemy that blocked
     */
    triggerShieldBlockVisual(enemy) {
        // Show shield block effect
        if (typeof FloatingTextManager !== 'undefined') {
            FloatingTextManager.spawn(enemy.gridX, enemy.gridY, 'BLOCKED', '#4488FF');
        }
    },

    /**
     * Show enrage visual effect
     * @param {object} enemy - The enemy that enraged
     */
    triggerEnrageVisual(enemy) {
        // Enemy glows red
        enemy._enrageGlow = true;
        if (typeof FloatingTextManager !== 'undefined') {
            FloatingTextManager.spawn(enemy.gridX, enemy.gridY, 'ENRAGED!', '#FF4444');
        }
    },

    /**
     * Show ethereal phase transition visual
     * @param {object} enemy - The enemy transitioning
     * @param {boolean} isImmune - Whether entering immune phase
     */
    triggerEtherealVisual(enemy, isImmune) {
        enemy._etherealShimmer = isImmune;
    },

    /**
     * Show undying trigger visual
     * @param {object} enemy - The enemy that triggered undying
     */
    triggerUndyingVisual(enemy) {
        if (typeof FloatingTextManager !== 'undefined') {
            FloatingTextManager.spawn(enemy.gridX, enemy.gridY, 'UNDYING!', '#FFAA00');
        }
    },

    /**
     * Teleport enemy a random distance away
     * @param {object} enemy - The enemy to teleport
     * @param {number} distance - Distance to teleport
     */
    teleportEnemyByDistance(enemy, distance) {
        // Find valid position at distance
        const angle = Math.random() * Math.PI * 2;
        const newX = enemy.gridX + Math.cos(angle) * distance;
        const newY = enemy.gridY + Math.sin(angle) * distance;
        // TODO: Validate position is walkable
        enemy.gridX = Math.round(newX);
        enemy.gridY = Math.round(newY);
    },

    /**
     * Alert nearby enemies to a target
     * @param {object} enemy - The enemy calling for help
     * @param {number} radius - Radius to alert within
     */
    alertNearbyEnemies(enemy, radius) {
        // Alert all enemies within radius
        if (typeof AIManager !== 'undefined' && AIManager.enemies) {
            AIManager.enemies.forEach(ai => {
                if (ai.enemy !== enemy) {
                    const dist = Math.hypot(ai.enemy.gridX - enemy.gridX, ai.enemy.gridY - enemy.gridY);
                    if (dist <= radius) {
                        ai.alertToTarget(enemy.combat?.currentTarget);
                    }
                }
            });
        }
    },

    /**
     * Get attack angle relative to enemy facing
     * @param {object} enemy - The enemy being attacked
     * @param {object} attacker - The attacker
     * @returns {number} Angle in degrees (-180 to 180)
     */
    getAttackAngle(enemy, attacker) {
        if (!attacker) return 180; // Assume from behind if no attacker
        const dx = attacker.gridX - enemy.gridX;
        const dy = attacker.gridY - enemy.gridY;
        const attackAngle = Math.atan2(dy, dx) * 180 / Math.PI;
        const facingAngle = this.getFacingAngle(enemy);
        return ((attackAngle - facingAngle + 180) % 360) - 180;
    },

    /**
     * Get enemy facing angle in degrees
     * @param {object} enemy - The enemy
     * @returns {number} Facing angle in degrees
     */
    getFacingAngle(enemy) {
        const facing = enemy.facing || 'down';
        const angles = { up: -90, down: 90, left: 180, right: 0 };
        return angles[facing] || 90;
    },

    /**
     * Schedule a death explosion effect
     * @param {object} enemy - The enemy that died
     * @param {object} config - Explosion configuration
     */
    scheduleDeathExplosion(enemy, config) {
        const chainDepth = config.chainDepth || 0;
        if (chainDepth >= 3) return; // Max chain depth

        const totalDelay = config.delay + (chainDepth * 500);
        const position = { x: enemy.gridX, y: enemy.gridY };

        setTimeout(() => {
            // Create explosion visual
            // Apply damage to all entities in radius
            if (typeof DamageCalculator !== 'undefined') {
                // Get all entities in radius and damage them
                // This would need integration with the game's entity system
            }
        }, totalDelay);
    },

    /**
     * Spawn split copies of an enemy
     * @param {object} enemy - The enemy that died
     * @param {object} config - Split configuration
     */
    spawnSplitCopies(enemy, config) {
        // Spawn smaller copies of the enemy
        // This would need integration with the enemy spawning system
        console.log(`[Split] ${enemy.name} would spawn ${config.count} copies at ${config.hpPercent * 100}% HP`);
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
        // Get telegraph effectId before removal (for EffectAnimator.resolve)
        const telegraph = this.activeTelegraphs.find(t => t.enemyId === enemy.id);
        const effectId = telegraph?.effectId;
        const isSequence = telegraph?.isSequence;
        const sequenceConfig = telegraph?.sequenceConfig;
        const lockedDirection = telegraph?.lockedDirection;

        // Remove telegraph
        this.removeTelegraph(enemy.id);

        // Resolve visual effect (telegraph -> impact/channel transition)
        if (effectId && typeof EffectAnimator !== 'undefined') {
            EffectAnimator.resolve(effectId);
        }

        // ========================================================================
        // AUDIO: Play impact sound when ability resolves
        // ========================================================================
        const abilityConfig = typeof ABILITY_EFFECTS !== 'undefined' ? ABILITY_EFFECTS[ability.id] : null;

        // Check if this is a channeled ability (breath/beam) that needs loop audio
        if (abilityConfig?.channel) {
            // Start looping channel sound for breath/beam abilities
            this.startAbilityChannelSound(enemy.id, ability.id, abilityConfig);

            // Schedule stopping the channel sound when channel ends
            const channelDuration = abilityConfig.channel.duration || 1500;
            const enemyRef = enemy;
            setTimeout(() => {
                this.stopAbilityAudioLoop(enemyRef.id);
            }, channelDuration);
        } else {
            // Play impact sound for non-channeled abilities
            this.playAbilityImpactSound(ability.id, abilityConfig);
        }

        // ========================================================================
        // SEQUENCE ABILITIES (e.g., double_strike)
        // For sequence abilities, we spawn multiple impact effects with delays
        // Each step in the sequence deals damage independently
        // ========================================================================
        if (isSequence && sequenceConfig && typeof EffectAnimator !== 'undefined') {
            const seqAbilityConfig = typeof ABILITY_EFFECTS !== 'undefined' ? ABILITY_EFFECTS[ability.id] : null;
            const selfRef = this;  // Store reference for setTimeout callback

            for (let i = 0; i < sequenceConfig.length; i++) {
                const step = sequenceConfig[i];

                // Schedule each step's impact effect and damage
                setTimeout(() => {
                    // Check if enemy is still alive
                    if (enemy.hp <= 0) return;

                    // Create step-specific config for the impact effect
                    const stepConfig = {
                        ...seqAbilityConfig,
                        telegraph: {
                            ...seqAbilityConfig?.telegraph,
                            arcAngle: step.arcAngle || seqAbilityConfig?.telegraph?.arcAngle || Math.PI / 2
                        },
                        impact: {
                            ...seqAbilityConfig?.impact,
                            sweepDirection: step.direction || 'cw'
                        }
                    };

                    // Spawn the impact effect for this step
                    const stepEffectId = EffectAnimator.startEffect(ability.id, {
                        x: enemy.gridX,
                        y: enemy.gridY,
                        targetX: target.gridX,
                        targetY: target.gridY,
                        rotation: (lockedDirection || 0) * 180 / Math.PI,
                        enemyId: enemy.id,
                        config: stepConfig,
                        sequenceIndex: i,
                        skipTelegraph: true  // Skip telegraph, go straight to impact
                    });

                    // Immediately resolve to trigger impact phase
                    if (stepEffectId) {
                        EffectAnimator.resolve(stepEffectId);
                    }

                    // AUDIO: Play impact sound for each sequence step
                    selfRef.playAbilityImpactSound(ability.id, seqAbilityConfig);

                    // Deal damage for this step
                    this.resolveSequenceStepDamage(enemy, target, ability, i, sequenceConfig.length);

                }, step.delay);
            }

            // Trigger camera effects (screen shake) from ability configuration
            if (seqAbilityConfig?.camera && typeof triggerAbilityScreenShake === 'function') {
                triggerAbilityScreenShake(seqAbilityConfig.camera);
            }

            return;  // Don't proceed to normal damage resolution
        }

        // ========================================================================
        // HOMING PROJECTILE ABILITIES
        // For homing abilities like homing_orb, spawn a projectile instead of
        // dealing direct damage. The projectile will track the player.
        // ========================================================================
        if (ability.homing && ability.projectile && typeof AbilityProjectileSystem !== 'undefined') {
            // Calculate damage for the projectile
            const damageResult = this.calculateAbilityDamage(enemy, ability, target);

            // Determine projectile color based on element or ability
            let color = '#FF4400';  // Default orange
            let trailColor = '#FF8800';
            if (ability.element) {
                const elementColors = {
                    fire: { color: '#FF4400', trail: '#FF8800' },
                    ice: { color: '#44AAFF', trail: '#88CCFF' },
                    dark: { color: '#8844AA', trail: '#AA66CC' },
                    arcane: { color: '#AA44FF', trail: '#CC88FF' },
                    holy: { color: '#FFDD44', trail: '#FFEE88' },
                    poison: { color: '#44FF44', trail: '#88FF88' }
                };
                const elColors = elementColors[ability.element];
                if (elColors) {
                    color = elColors.color;
                    trailColor = elColors.trail;
                }
            }

            // Convert tiles/sec to pixels/sec (projectileSpeed is typically tiles/sec)
            const tileSize = typeof game !== 'undefined' ? (game.tileSize || 48) : 48;
            const speed = (ability.projectileSpeed || 4) * tileSize;

            // Homing turn rate: homingStrength 0.5 = 90 deg/sec, 1.0 = 180 deg/sec
            const turnRate = (ability.homingStrength || 0.5) * 180;

            AbilityProjectileSystem.spawn({
                x: enemy.gridX,
                y: enemy.gridY,
                targetX: target.gridX,
                targetY: target.gridY,
                speed: speed,
                homing: true,
                turnRate: turnRate,
                color: color,
                trailColor: trailColor,
                radius: 10,
                damage: damageResult.damage,
                enemyId: enemy.id,
                abilityId: ability.id,  // For status effect lookup on hit
                persistsAfterCasterDeath: true,  // Homing orbs persist after caster death
                maxLifetime: 5000  // 5 second timeout
            });

            // Show message
            if (typeof addMessage === 'function') {
                addMessage(`${enemy.name} launches a ${ability.name}!`);
            }

            // Trigger camera effects (screen shake) from ability configuration
            if (typeof ABILITY_EFFECTS !== 'undefined' && typeof triggerAbilityScreenShake === 'function') {
                const abilityConfig = ABILITY_EFFECTS[ability.id];
                if (abilityConfig?.camera) {
                    triggerAbilityScreenShake(abilityConfig.camera);
                }
            }

            return;  // Don't proceed to normal damage resolution
        }

        // ========================================================================
        // NON-HOMING PROJECTILE ABILITIES (including burst patterns)
        // For projectile abilities without homing (projectile_burst, projectile_single, etc.)
        // ========================================================================
        if (ability.projectile && !ability.homing && typeof AbilityProjectileSystem !== 'undefined') {
            // Calculate damage for the projectile(s)
            const damageResult = this.calculateAbilityDamage(enemy, ability, target);

            // Determine projectile color based on element or ability effect config
            let color = '#FF6600';  // Default orange for non-homing
            let trailColor = '#FFAA00';

            // Check ABILITY_EFFECTS for visual configuration
            if (typeof ABILITY_EFFECTS !== 'undefined') {
                const abilityConfig = ABILITY_EFFECTS[ability.id];
                if (abilityConfig?.projectile?.color) {
                    color = abilityConfig.projectile.color;
                }
                if (abilityConfig?.trail?.color) {
                    trailColor = abilityConfig.trail.color;
                }
            }

            // Override with element colors if specified
            if (ability.element) {
                const elementColors = {
                    fire: { color: '#FF4400', trail: '#FF8800' },
                    ice: { color: '#44AAFF', trail: '#88CCFF' },
                    dark: { color: '#8844AA', trail: '#AA66CC' },
                    arcane: { color: '#AA44FF', trail: '#CC88FF' },
                    holy: { color: '#FFDD44', trail: '#FFEE88' },
                    poison: { color: '#44FF44', trail: '#88FF88' }
                };
                const elColors = elementColors[ability.element];
                if (elColors) {
                    color = elColors.color;
                    trailColor = elColors.trail;
                }
            }

            // Convert tiles/sec to pixels/sec
            const tileSize = typeof game !== 'undefined' ? (game.tileSize || 48) : 48;
            const speed = (ability.projectileSpeed || 6) * tileSize;

            // Base projectile config
            const projectileConfig = {
                x: enemy.gridX,
                y: enemy.gridY,
                targetX: target.gridX,
                targetY: target.gridY,
                speed: speed,
                homing: false,
                color: color,
                trailColor: trailColor,
                radius: 8,
                damage: damageResult.damage,
                enemyId: enemy.id,
                abilityId: ability.id,  // For status effect lookup on hit
                persistsAfterCasterDeath: true,
                maxLifetime: 4000  // 4 second timeout for non-homing
            };

            // Check for burst pattern (multiple projectiles with spread)
            const projectileCount = ability.projectileCount || 1;
            const spreadDegrees = ability.projectileSpread || 30;

            if (projectileCount > 1) {
                // Spawn burst of projectiles
                AbilityProjectileSystem.spawnBurst({
                    ...projectileConfig,
                    count: projectileCount,
                    spreadDegrees: spreadDegrees
                });

                // Show message
                if (typeof addMessage === 'function') {
                    addMessage(`${enemy.name} fires a burst of ${ability.name}!`);
                }
            } else {
                // Single non-homing projectile
                AbilityProjectileSystem.spawn(projectileConfig);

                // Show message
                if (typeof addMessage === 'function') {
                    addMessage(`${enemy.name} fires ${ability.name}!`);
                }
            }

            // Trigger camera effects from ability configuration
            if (typeof ABILITY_EFFECTS !== 'undefined' && typeof triggerAbilityScreenShake === 'function') {
                const abilityConfig = ABILITY_EFFECTS[ability.id];
                if (abilityConfig?.camera) {
                    triggerAbilityScreenShake(abilityConfig.camera);
                }
            }

            return;  // Don't proceed to normal damage resolution
        }

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

                // Apply effects from ability definition
                this.applyAbilityEffects(enemy, target, ability);

                // Apply status effects from ABILITY_EFFECTS config (ability-effects-data.js)
                // This handles effects like burn, slow, poison, root defined in visual configs
                this.applyAbilityEffectsFromConfig(target, ability.id, enemy);

                // Apply knockback from ability config if player was hit
                this.applyAbilityKnockback(enemy, target, ability);

                // Apply caster feedback effects (e.g., heal pulse for life_drain)
                this.applyCasterFeedback(enemy, ability.id, damage);

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
            // Also check ABILITY_EFFECTS for status effects on non-damaging abilities
            this.applyAbilityEffectsFromConfig(target, ability.id, enemy);
            // Also apply knockback for non-damaging abilities (some might only knockback)
            this.applyAbilityKnockback(enemy, target, ability);
        }

        // Create visual effect
        this.createAbilityEffect(enemy, target, ability);

        // Trigger camera effects (screen shake) from ability configuration
        if (typeof ABILITY_EFFECTS !== 'undefined' && typeof triggerAbilityScreenShake === 'function') {
            const abilityConfig = ABILITY_EFFECTS[ability.id];
            if (abilityConfig?.camera) {
                triggerAbilityScreenShake(abilityConfig.camera);
            }
        }
    },

    /**
     * Resolve damage for a single step in a sequence ability (e.g., double_strike)
     * Each step deals a portion of the total damage
     * @param {object} enemy - The enemy using the ability
     * @param {object} target - The target being hit
     * @param {object} ability - The ability being used
     * @param {number} stepIndex - Index of the current step (0-based)
     * @param {number} totalSteps - Total number of steps in the sequence
     */
    resolveSequenceStepDamage(enemy, target, ability, stepIndex, totalSteps) {
        // Check if target is still in range/AOE
        const inRange = this.isTargetInAbilityArea(enemy, target, ability);

        if (!inRange) {
            if (typeof addMessage === 'function') {
                addMessage(`${enemy.name}'s ${ability.name} (hit ${stepIndex + 1}) missed!`);
            }
            return;
        }

        // Calculate damage for this step
        // Each step deals a portion of the total damage (e.g., 2 hits = 50% each)
        const damageResult = this.calculateAbilityDamage(enemy, ability, target);

        // Divide damage among steps (with slight bonus for later hits)
        // First hit: 45%, Second hit: 55% for 2-hit combos
        let stepMultiplier;
        if (totalSteps === 2) {
            stepMultiplier = stepIndex === 0 ? 0.45 : 0.55;
        } else {
            stepMultiplier = 1.0 / totalSteps;
        }

        const damage = Math.max(1, Math.floor(damageResult.damage * stepMultiplier));

        // Check for miss
        if (!damageResult.isHit) {
            if (typeof addMessage === 'function') {
                addMessage(`${enemy.name}'s ${ability.name} (hit ${stepIndex + 1}) missed!`);
            }
            if (typeof showDamageNumber === 'function') {
                showDamageNumber(target, 0, '#888888');
            }
            return;
        }

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

            // Show message for the hit
            if (typeof addMessage === 'function') {
                const hitNum = stepIndex + 1;
                const critText = damageResult.isCrit ? ' CRITICAL!' : '';
                addMessage(`${enemy.name}'s ${ability.name} (hit ${hitNum}/${totalSteps}) deals ${damage}!${critText}`);
            }

            // Apply effects only on last hit
            if (stepIndex === totalSteps - 1) {
                this.applyAbilityEffects(enemy, target, ability);
                // Also apply status effects from ABILITY_EFFECTS config
                this.applyAbilityEffectsFromConfig(target, ability.id, enemy);
            }

            // Check death using centralized handleDeath
            if (target.hp <= 0) {
                if (typeof handleDeath === 'function') {
                    handleDeath(target, enemy);
                } else if (typeof game !== 'undefined' && game) {
                    // Fallback for player death
                    game.state = 'gameover';
                }
            }
        }
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
                // BUGFIX: applyStatusEffect expects (entity, effectId, source), not an object
                // Use StatusEffectSystem.applyEffect for options support
                if (typeof StatusEffectSystem !== 'undefined') {
                    StatusEffectSystem.applyEffect(target, 'stunned', enemy, {
                        duration: ability.stunDuration || 1000
                    });
                } else if (useStatusEffect) {
                    applyStatusEffect(target, 'stunned', enemy);
                } else {
                    target.stunned = true;
                    target.stunnedTimer = ability.stunDuration || 1000;
                }
                break;

            case 'slow':
                // BUGFIX: Use string effectId, not object
                // Note: effect ID is 'slow' (not 'slowed')
                if (typeof StatusEffectSystem !== 'undefined') {
                    StatusEffectSystem.applyEffect(target, 'slow', enemy, {
                        duration: ability.slowDuration || 2000,
                        slowPercent: ability.slowPercent || 0.5
                    });
                } else if (useStatusEffect) {
                    applyStatusEffect(target, 'slow', enemy);
                } else {
                    target.slowed = true;
                    target.slowedTimer = ability.slowDuration || 2000;
                    target.slowPercent = ability.slowPercent || 0.5;
                }
                break;

            case 'bleed':
                // BUGFIX: Use string effectId, not object
                if (typeof StatusEffectSystem !== 'undefined') {
                    StatusEffectSystem.applyEffect(target, 'bleeding', enemy, {
                        damage: ability.bleedDamage || 3,
                        ticks: Math.ceil((ability.bleedDuration || 3000) / 1000),
                        interval: 1000
                    });
                } else if (useStatusEffect) {
                    applyStatusEffect(target, 'bleeding', enemy);
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
                // BUGFIX: Use string effectId, not object
                if (typeof StatusEffectSystem !== 'undefined') {
                    StatusEffectSystem.applyEffect(target, 'poisoned', enemy, {
                        damage: ability.poisonDamage || 2,
                        ticks: Math.ceil((ability.poisonDuration || 3000) / 1000),
                        interval: 1000
                    });
                } else if (useStatusEffect) {
                    applyStatusEffect(target, 'poisoned', enemy);
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
                // BUGFIX: Use string effectId, not object
                if (typeof StatusEffectSystem !== 'undefined') {
                    StatusEffectSystem.applyEffect(target, 'rooted', enemy, {
                        duration: ability.rootDuration || 2000
                    });
                } else if (useStatusEffect) {
                    applyStatusEffect(target, 'rooted', enemy);
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

    /**
     * Apply status effects from ABILITY_EFFECTS configuration
     * This handles statusEffect configs defined in ability-effects-data.js
     * @param {object} target - The target entity to apply effects to
     * @param {string} abilityId - The ability ID to look up in ABILITY_EFFECTS
     * @param {object} source - The source entity (enemy) applying the effect
     */
    applyAbilityEffectsFromConfig(target, abilityId, source) {
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
     * Apply knockback to target based on ability configuration
     * Reads knockback settings from ABILITY_EFFECTS and applies to player
     * @param {object} enemy - The enemy using the ability
     * @param {object} target - The target (usually player)
     * @param {object} ability - The ability being used
     */
    applyAbilityKnockback(enemy, target, ability) {
        // Only apply knockback to player (not enemies)
        if (target !== game.player) return;

        // Check if ABILITY_EFFECTS has knockback config for this ability
        if (typeof ABILITY_EFFECTS === 'undefined') return;

        const abilityConfig = ABILITY_EFFECTS[ability.id];
        if (!abilityConfig || !abilityConfig.knockback) return;

        const kb = abilityConfig.knockback;
        const force = kb.force || 2;
        const duration = kb.duration || 200;

        // Use the centralized player knockback system if available
        if (typeof applyPlayerKnockback === 'function') {
            applyPlayerKnockback(enemy.gridX, enemy.gridY, force, duration, enemy);

            if (this.config.debugLogging) {
                console.log(`[EnemyAbility] Applied knockback to player: force=${force}, duration=${duration}ms`);
            }
        } else {
            // Fallback: apply direct velocity impulse
            if (typeof addPlayerImpulse === 'function') {
                const dx = target.gridX - enemy.gridX;
                const dy = target.gridY - enemy.gridY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > 0.01) {
                    const dirX = dx / dist;
                    const dirY = dy / dist;
                    addPlayerImpulse(dirX * force, dirY * force);
                }
            }
        }
    },

    /**
     * Apply caster feedback effects (e.g., heal pulse for life_drain)
     * Checks ABILITY_EFFECTS config for casterFeedback and applies it
     * @param {object} enemy - The enemy that used the ability
     * @param {string} abilityId - The ability ID
     * @param {number} damage - The damage dealt (used to calculate healing)
     */
    applyCasterFeedback(enemy, abilityId, damage) {
        // Check if ABILITY_EFFECTS has casterFeedback config for this ability
        if (typeof ABILITY_EFFECTS === 'undefined') return;

        const abilityConfig = ABILITY_EFFECTS[abilityId];
        if (!abilityConfig || !abilityConfig.casterFeedback) return;

        const feedback = abilityConfig.casterFeedback;

        // Handle heal_pulse type (life drain visual)
        if (feedback.type === 'heal_pulse') {
            const color = feedback.color || '#88FF88';

            // Spawn the visual heal pulse effect on the caster
            if (typeof HealPulseEffects !== 'undefined') {
                HealPulseEffects.spawn(enemy.gridX, enemy.gridY, color);

                if (this.config.debugLogging) {
                    console.log(`[EnemyAbility] Spawned heal pulse at (${enemy.gridX}, ${enemy.gridY}) for ${enemy.name}`);
                }
            }

            // Apply actual healing to the enemy (life drain heals for portion of damage dealt)
            const healAmount = Math.max(1, Math.floor(damage * (feedback.healPercent || 0.5)));
            const maxHp = enemy.maxHp || enemy.stats?.maxHp || 100;
            const previousHp = enemy.hp;
            enemy.hp = Math.min(maxHp, enemy.hp + healAmount);
            const actualHeal = enemy.hp - previousHp;

            if (actualHeal > 0) {
                // Show heal number on the enemy (green)
                if (typeof showDamageNumber === 'function') {
                    showDamageNumber(enemy, actualHeal, '#88FF88');
                }

                // Log the healing
                if (typeof addMessage === 'function') {
                    addMessage(`${enemy.name} drains ${actualHeal} health!`, 'heal');
                }

                if (this.config.debugLogging) {
                    console.log(`[EnemyAbility] ${enemy.name} healed for ${actualHeal} (${enemy.hp}/${maxHp})`);
                }
            }
        }
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
     * Supports directionOffset for abilities like tail_whip that attack in a different direction
     */
    isTargetInAbilityArea(enemy, target, ability) {
        const dist = this.getDistance(enemy, target);

        if (!ability.aoe) {
            return dist <= (ability.range || 2);
        }

        // Get direction offset from ability config if available (e.g., tail_whip attacks behind)
        let directionOffset = 0;
        if (typeof ABILITY_EFFECTS !== 'undefined') {
            const abilityConfig = ABILITY_EFFECTS[ability.id];
            if (abilityConfig?.telegraph?.directionOffset) {
                directionOffset = abilityConfig.telegraph.directionOffset;
            }
        }

        switch (ability.aoe.shape) {
            case 'circle':
                return dist <= (ability.aoe.radius || ability.range || 2);

            case 'arc':
                if (dist > (ability.aoe.radius || ability.range || 2)) return false;
                // Calculate the attack direction (toward original target + offset)
                // For tail_whip, target is the player, but offset is Math.PI so attack goes AWAY from player
                const baseDir = Math.atan2(target.gridY - enemy.gridY, target.gridX - enemy.gridX);
                const attackDir = baseDir + directionOffset;
                // Calculate angle from enemy to where we're checking (the target position)
                const angleToTarget = Math.atan2(target.gridY - enemy.gridY, target.gridX - enemy.gridX);
                let angleDiff = Math.abs(angleToTarget - attackDir);
                // Normalize to 0 to PI
                if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;
                return angleDiff <= (ability.aoe.angle / 2) * Math.PI / 180;

            case 'line':
                // Simplified line check - line shapes use aoe.length
                return dist <= (ability.aoe.length || ability.range || 5);

            case 'cone':
                if (dist > (ability.aoe.range || ability.range || 5)) return false;
                const coneBaseDir = Math.atan2(target.gridY - enemy.gridY, target.gridX - enemy.gridX);
                const coneAttackDir = coneBaseDir + directionOffset;
                const coneAngleToTarget = Math.atan2(target.gridY - enemy.gridY, target.gridX - enemy.gridX);
                let coneDiff = Math.abs(coneAngleToTarget - coneAttackDir);
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
        // Track that update is being called
        this.diagnostics.updateCallCount++;
        this.diagnostics.lastUpdateTime = Date.now();

        // Log first few update calls to confirm system is running
        if (this.diagnostics.updateCallCount <= 3 || this.diagnostics.updateCallCount % 600 === 0) {
            this._logDiagnostic('UPDATE', `Update #${this.diagnostics.updateCallCount}, dt=${dt.toFixed(1)}ms, registered enemies: ${this.enemyAbilities.size}`);
        }

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

        // Process passives for all enemies and update dashes
        if (game.enemies) {
            for (const enemy of game.enemies) {
                if (enemy.hp > 0) {
                    this.processPassives(enemy, dt);

                    // Check health-based mechanics
                    this.checkMechanics(enemy, 'health_threshold');

                    // Update enemy dash movement with wall collision
                    this.updateEnemyDash(enemy, dt);

                    // Update enemy lunge movement (bite forward snap)
                    this.updateEnemyLunge(enemy, dt);
                }
            }
        }
    },

    /**
     * Update enemy lunge movement (small forward snap and return)
     * Used for bite attacks - quick snap forward and back like an animal lunging to bite
     * @param {object} enemy - The enemy entity
     * @param {number} dt - Delta time in milliseconds
     */
    updateEnemyLunge(enemy, dt) {
        if (!enemy.isLunging) return;

        const now = Date.now();

        // Wait for lunge to start (after telegraph delay)
        if (now < enemy.lungeStartTime) return;

        // Calculate time since lunge started
        const lungeElapsed = now - enemy.lungeStartTime;
        const lungeDuration = enemy.lungeDuration || 150;

        // Calculate progress (0 to 1)
        const progress = Math.min(1, lungeElapsed / lungeDuration);
        enemy.lungeProgress = progress;

        // Use sine curve for smooth out-and-back motion
        // sin(progress * PI) goes: 0 -> 1 (at 0.5) -> 0
        // This creates a smooth snap forward and return
        const t = Math.sin(progress * Math.PI);

        // Calculate current offset from start position
        const offsetX = Math.cos(enemy.lungeDirection) * enemy.lungeDistance * t;
        const offsetY = Math.sin(enemy.lungeDirection) * enemy.lungeDistance * t;

        // Update position
        enemy.gridX = enemy.lungeStartX + offsetX;
        enemy.gridY = enemy.lungeStartY + offsetY;
        enemy.displayX = enemy.gridX;
        enemy.displayY = enemy.gridY;

        // Lunge complete - snap back to original position
        if (progress >= 1) {
            enemy.isLunging = false;
            enemy.gridX = enemy.lungeStartX;
            enemy.gridY = enemy.lungeStartY;
            enemy.displayX = enemy.lungeStartX;
            enemy.displayY = enemy.lungeStartY;

            if (this.config.debugLogging) {
                console.log(`[EnemyAbility] ${enemy.name} lunge complete, returned to start position`);
            }
        }
    },

    /**
     * Update enemy dash movement and handle wall collisions
     * @param {object} enemy - The enemy entity
     * @param {number} dt - Delta time in milliseconds
     */
    updateEnemyDash(enemy, dt) {
        if (!enemy.isDashing) return;

        const now = Date.now();

        // Wait for dash to start (after telegraph delay)
        if (now < enemy.dashStartTime) return;

        // Calculate time since dash started
        const dashElapsed = now - enemy.dashStartTime;
        const dashDuration = enemy.dashDuration || 500;

        // Calculate progress (0 to 1)
        const progress = Math.min(1, dashElapsed / dashDuration);
        enemy.dashProgress = progress;

        // Calculate current position along dash path
        const startPos = enemy.dashStartPos;
        const endPos = enemy.dashEndPos;
        const direction = enemy.dashDirection;

        // Use easeOutQuad for deceleration at end of dash
        const easedProgress = typeof easeOutQuad === 'function' ? easeOutQuad(progress) : progress;

        // Calculate next position
        const nextX = startPos.x + (endPos.x - startPos.x) * easedProgress;
        const nextY = startPos.y + (endPos.y - startPos.y) * easedProgress;

        // Check for wall collision before moving
        const tileX = Math.floor(nextX);
        const tileY = Math.floor(nextY);

        // Use isTileWalkable if available, fall back to canMoveTo, then direct map check
        let hitWall = false;
        if (typeof isTileWalkable === 'function') {
            hitWall = !isTileWalkable(tileX, tileY);
        } else if (typeof canMoveTo === 'function') {
            hitWall = !canMoveTo(nextX, nextY, false, 0.3);
        } else if (typeof game !== 'undefined' && game.map && game.map[tileY]) {
            const tile = game.map[tileY][tileX];
            hitWall = !tile || tile.type === 'wall' || tile.type === 'void' || tile.type === 'interior_wall';
        }

        if (hitWall && !enemy.dashHitWall) {
            // Wall collision detected - stop the dash
            enemy.dashHitWall = true;
            enemy.isDashing = false;

            // Get wall collision config from ability effects
            const abilityConfig = typeof ABILITY_EFFECTS !== 'undefined' ? ABILITY_EFFECTS[enemy.dashAbility?.id] : null;
            const wallConfig = abilityConfig?.wallCollision || {};

            // Apply self-stun
            const stunDuration = wallConfig.selfStunDuration || 1500;
            enemy.stunned = true;
            enemy.stunDuration = stunDuration;
            enemy.stunTimer = stunDuration;

            // Apply self-damage
            const selfDamagePercent = wallConfig.selfDamagePercent || 0.1;
            const selfDamage = Math.floor((enemy.maxHp || enemy.hp) * selfDamagePercent);
            if (selfDamage > 0) {
                enemy.hp -= selfDamage;
                if (typeof showDamageNumber === 'function') {
                    showDamageNumber(enemy, selfDamage, '#FF8800');
                }
                if (typeof addMessage === 'function') {
                    addMessage(`${enemy.name} slams into wall for ${selfDamage} damage!`);
                }
            }

            // Create wall impact effect
            this.createWallImpactEffect(enemy, tileX, tileY, direction);

            // Trigger screen shake if configured
            if (abilityConfig?.camera?.onWallHit && typeof triggerScreenShake === 'function') {
                triggerScreenShake(false);
            }

            // Check if enemy died from wall impact
            if (enemy.hp <= 0 && typeof handleDeath === 'function') {
                handleDeath(enemy, null);
            }

            if (this.config.debugLogging) {
                console.log(`[EnemyAbility] ${enemy.name} hit wall during dash! Stunned for ${stunDuration}ms, took ${selfDamage} damage.`);
            }

            return;
        }

        // No wall collision - update position
        if (!hitWall) {
            enemy.gridX = nextX;
            enemy.gridY = nextY;
            enemy.displayX = nextX;
            enemy.displayY = nextY;

            // Store afterimage position if trail is enabled
            if (enemy.dashTrail && enemy.dashAfterimages > 0) {
                const interval = 1 / (enemy.dashAfterimages + 1);
                const lastAfterimageProgress = enemy.dashAfterimagePositions.length * interval;
                if (progress - lastAfterimageProgress >= interval) {
                    enemy.dashAfterimagePositions.push({
                        x: enemy.gridX,
                        y: enemy.gridY,
                        alpha: 0.6,
                        time: now
                    });
                }
            }

            // Check for player collision during dash (deal damage immediately)
            if (!enemy.dashHitPlayer && !enemy.dashDamageDealt && game.player) {
                const player = game.player;
                const dx = player.gridX - nextX;
                const dy = player.gridY - nextY;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 0.8) { // Close enough to hit
                    enemy.dashHitPlayer = true;
                    enemy.dashDamageDealt = true;

                    // Apply damage immediately during dash
                    const ability = enemy.dashAbility;
                    if (ability) {
                        const damageResult = this.calculateAbilityDamage(enemy, ability, player);

                        if (damageResult.isHit && damageResult.damage > 0) {
                            // Apply damage
                            if (typeof applyDamage === 'function') {
                                applyDamage(player, damageResult.damage, enemy, damageResult.result);
                            } else {
                                player.hp -= damageResult.damage;
                            }

                            // Show damage number
                            if (typeof showDamageNumber === 'function') {
                                const color = damageResult.isCrit ? '#ffff00' : '#ff4444';
                                showDamageNumber(player, damageResult.damage, color);
                            }

                            // Show message
                            if (typeof addMessage === 'function') {
                                const critText = damageResult.isCrit ? ' CRITICAL!' : '';
                                addMessage(`${enemy.name} charges into you for ${damageResult.damage}!${critText}`);
                            }

                            // Apply stun if ability has stunOnHit
                            if (ability.stunOnHit) {
                                this.applyAbilityEffects(enemy, player, {
                                    ...ability,
                                    effect: 'stun',
                                    stunDuration: ability.stunDuration || 1000
                                });
                            }

                            // Check player death
                            if (player.hp <= 0) {
                                if (typeof handleDeath === 'function') {
                                    handleDeath(player, enemy);
                                } else if (typeof game !== 'undefined' && game) {
                                    game.state = 'gameover';
                                }
                            }
                        }
                    }

                    // For charge/bull_rush, stop on player hit
                    // For lunge, continue through
                    if (ability && (ability.id === 'charge' || ability.id === 'bull_rush')) {
                        this.finishDash(enemy);
                        return;
                    }
                }
            }
        }

        // Check if dash completed
        if (progress >= 1 || enemy.dashHitWall) {
            this.finishDash(enemy);
        }
    },

    /**
     * Finish a dash and clean up state
     * @param {object} enemy - The enemy entity
     */
    finishDash(enemy) {
        enemy.isDashing = false;
        enemy.dashProgress = 0;

        // Fade out afterimages
        if (enemy.dashAfterimagePositions && enemy.dashAfterimagePositions.length > 0) {
            const fadeTime = 300;
            const fadeInterval = setInterval(() => {
                let allFaded = true;
                for (const img of enemy.dashAfterimagePositions) {
                    img.alpha -= 0.1;
                    if (img.alpha > 0) allFaded = false;
                }
                if (allFaded) {
                    clearInterval(fadeInterval);
                    enemy.dashAfterimagePositions = [];
                }
            }, fadeTime / 6);
        }

        if (this.config.debugLogging) {
            console.log(`[EnemyAbility] ${enemy.name} dash complete at (${enemy.gridX.toFixed(1)}, ${enemy.gridY.toFixed(1)})`);
        }
    },

    /**
     * Create visual effect for wall impact
     * @param {object} enemy - The enemy that hit the wall
     * @param {number} wallX - Wall tile X
     * @param {number} wallY - Wall tile Y
     * @param {number} direction - Dash direction in radians
     */
    createWallImpactEffect(enemy, wallX, wallY, direction) {
        // Create stun stars visual
        if (enemy.dashWallStun) {
            enemy.stunStarsTimer = 1500;
            enemy.stunStarsCount = 3;
        }

        // Create wall crack visual if configured
        if (enemy.dashWallCrack) {
            // Store wall crack position for rendering
            if (!game.wallCracks) game.wallCracks = [];
            game.wallCracks.push({
                x: wallX,
                y: wallY,
                direction: direction,
                time: Date.now(),
                fadeTime: 3000
            });
        }

        // Spawn debris particles
        if (typeof ParticleSystem !== 'undefined') {
            const particleCount = 8;
            for (let i = 0; i < particleCount; i++) {
                const angle = direction + Math.PI + (Math.random() - 0.5) * Math.PI / 2;
                const speed = 50 + Math.random() * 100;
                ParticleSystem.spawn({
                    x: enemy.gridX,
                    y: enemy.gridY,
                    velX: Math.cos(angle) * speed,
                    velY: Math.sin(angle) * speed,
                    color: '#AA8866',
                    size: 3 + Math.random() * 4,
                    lifetime: 500 + Math.random() * 300,
                    gravity: 200
                });
            }
        }
    },

    /**
     * Clean up enemy ability data
     */
    removeEnemy(enemyId) {
        this.enemyAbilities.delete(enemyId);
        this.removeTelegraph(enemyId);

        // Cancel any active visual effects for this enemy
        // Exception: Projectiles with persistsAfterCasterDeath will survive
        if (typeof EffectAnimator !== 'undefined' && EffectAnimator.cancelByEnemy) {
            EffectAnimator.cancelByEnemy(enemyId);
        }
    },

    /**
     * Clear all data
     */
    cleanup() {
        this.enemyAbilities.clear();
        this.activeTelegraphs = [];
        this.activeEffects = [];

        // Clear EffectAnimator state
        if (typeof EffectAnimator !== 'undefined' && EffectAnimator.clearAll) {
            EffectAnimator.clearAll();
        }

        // Clear ability projectiles (homing orbs, etc.)
        if (typeof AbilityProjectileSystem !== 'undefined') {
            AbilityProjectileSystem.clear();
        }
    },

    // ========================================================================
    // DEBUG
    // ========================================================================

    getStatus() {
        return {
            trackedEnemies: this.enemyAbilities.size,
            activeTelegraphs: this.activeTelegraphs.length,
            activeEffects: this.activeEffects.length,
            missingMappings: Array.from(this.missingAbilityMonsters)
        };
    },

    /**
     * Get ability info for an enemy
     */
    getEnemyAbilities(enemyId) {
        return this.enemyAbilities.get(enemyId);
    },

    /**
     * Validate all monster mappings against known monster types
     * Checks MONSTER_SIGNATURE_ABILITIES against monsters-data.js
     * @returns {object} Validation results with missing and unmapped monsters
     */
    validateAllMappings() {
        const results = {
            mapped: [],
            missing: [],
            unmapped: [],
            invalidAbilities: [],
            invalidPassives: []
        };

        // Get all mapped monster names
        const mappedMonsters = Object.keys(this.MONSTER_SIGNATURE_ABILITIES);

        // Check if MONSTER_TIERS is available (from monsters-data.js)
        if (typeof MONSTER_TIERS !== 'undefined') {
            const allMonsterNames = new Set();

            // Collect all monster names from all tiers
            for (const tierKey in MONSTER_TIERS) {
                const tier = MONSTER_TIERS[tierKey];
                if (tier.monsters) {
                    for (const monster of tier.monsters) {
                        if (monster.name) {
                            allMonsterNames.add(monster.name);
                        }
                    }
                }
            }

            // Find monsters without mappings
            for (const name of allMonsterNames) {
                if (this.MONSTER_SIGNATURE_ABILITIES[name]) {
                    results.mapped.push(name);
                } else {
                    results.missing.push(name);
                }
            }

            // Find mappings for non-existent monsters
            for (const name of mappedMonsters) {
                if (!allMonsterNames.has(name)) {
                    results.unmapped.push(name);
                }
            }
        }

        // Validate ability IDs exist in AbilityRepository
        if (typeof AbilityRepository !== 'undefined') {
            for (const [monsterName, mapping] of Object.entries(this.MONSTER_SIGNATURE_ABILITIES)) {
                // Validate signature ability
                const abilityId = mapping.signatureAbility;
                if (abilityId && !AbilityRepository.ATTACKS[abilityId]) {
                    results.invalidAbilities.push({
                        monster: monsterName,
                        ability: abilityId
                    });
                }

                // Validate passives
                const passives = Array.isArray(mapping.signaturePassive)
                    ? mapping.signaturePassive
                    : [mapping.signaturePassive];

                for (const passiveId of passives) {
                    if (passiveId && !AbilityRepository.PASSIVES[passiveId] && !AbilityRepository.MECHANICS[passiveId]) {
                        results.invalidPassives.push({
                            monster: monsterName,
                            passive: passiveId
                        });
                    }
                }
            }
        }

        // Log results
        // console.log('[EnemyAbility] Mapping Validation Results:');
        console.log(`  Mapped: ${results.mapped.length} monsters`);
        console.log(`  Missing mappings: ${results.missing.length} monsters`);
        if (results.missing.length > 0) {
            console.log(`    ${results.missing.join(', ')}`);
        }
        console.log(`  Unmapped (obsolete): ${results.unmapped.length} monsters`);
        if (results.unmapped.length > 0) {
            console.log(`    ${results.unmapped.join(', ')}`);
        }
        console.log(`  Invalid abilities: ${results.invalidAbilities.length}`);
        if (results.invalidAbilities.length > 0) {
            for (const inv of results.invalidAbilities) {
                console.log(`    ${inv.monster}: ${inv.ability}`);
            }
        }
        console.log(`  Invalid passives: ${results.invalidPassives.length}`);
        if (results.invalidPassives.length > 0) {
            for (const inv of results.invalidPassives) {
                console.log(`    ${inv.monster}: ${inv.passive}`);
            }
        }

        return results;
    },

    /**
     * Get list of monsters without signature ability mappings
     * @returns {string[]} Array of monster names without mappings
     */
    getMissingMappings() {
        return Array.from(this.missingAbilityMonsters);
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const EnemyAbilitySystemDef = {
    name: 'enemy-ability-system',

    init() {
        if (EnemyAbilitySystem.config.debugLogging) {
            // console.log('[EnemyAbility] System initialized');
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

    // Convenience shortcuts for debugging from console
    window.abilityDiagnose = () => EnemyAbilitySystem.diagnose();
    window.abilityTest = (idx) => EnemyAbilitySystem.testAbility(idx);
    window.abilityReset = () => EnemyAbilitySystem.resetDiagnostics();
}

console.log('✅ Enemy Ability System loaded');
console.log('   📊 Diagnostics available:');
console.log('   - abilityDiagnose() or EnemyAbilitySystem.diagnose() - Full system report');
console.log('   - abilityTest(enemyIndex) - Force-fire ability on enemy');
console.log('   - abilityReset() - Reset diagnostic counters');
