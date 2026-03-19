// ============================================================================
// COMBAT AUDIO INTEGRATION - The Shifting Chasm
// ============================================================================
// Hooks into combat events to trigger appropriate audio
// Designed to work alongside existing combat-master.js without modification
// ============================================================================

const CombatAudio = {
    name: 'CombatAudio',

    // ========================================================================
    // STATE
    // ========================================================================

    /** Whether system is enabled */
    enabled: true,

    /** Track last player attack for variety */
    lastPlayerAttackSound: null,

    /** Track weapon type for sound selection */
    currentWeaponType: 'sword',

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize combat audio integration
     */
    init() {
        // Hook into existing combat events by wrapping functions
        this._hookCombatEvents();
        console.log('[CombatAudio] Combat audio integration initialized');
    },

    /**
     * Hook into existing combat functions
     * @private
     */
    _hookCombatEvents() {
        // Store original functions for chaining
        const self = this;

        // Hook handleDeath for death sounds
        if (typeof window.handleDeath === 'function') {
            const originalHandleDeath = window.handleDeath;
            window.handleDeath = function(entity, killer) {
                self.onDeath(entity, killer);
                return originalHandleDeath.apply(this, arguments);
            };
        }

        // Hook onCombatHit for hit sounds
        if (typeof window.onCombatHit === 'function') {
            const originalOnCombatHit = window.onCombatHit;
            window.onCombatHit = function(attacker, defender, damageResult) {
                self.onHit(attacker, defender, damageResult);
                return originalOnCombatHit.apply(this, arguments);
            };
        }

        // Hook performMouseAttack for swing sounds
        if (typeof window.performMouseAttack === 'function') {
            const originalPerformMouseAttack = window.performMouseAttack;
            window.performMouseAttack = function(player, isBuffered) {
                self.onPlayerSwing(player);
                return originalPerformMouseAttack.apply(this, arguments);
            };
        }

        // Hook engageCombat for combat start sound
        if (typeof window.engageCombat === 'function') {
            const originalEngageCombat = window.engageCombat;
            window.engageCombat = function(entity, target) {
                self.onCombatEngage(entity, target);
                return originalEngageCombat.apply(this, arguments);
            };
        }
    },

    // ========================================================================
    // COMBAT EVENT HANDLERS
    // ========================================================================

    /**
     * Called when player swings their weapon
     * @param {object} player
     */
    onPlayerSwing(player) {
        if (!this.enabled || !this._canPlaySound()) return;

        try {
            const weapon = player?.equipped?.MAIN;
            const weaponType = this._getWeaponType(weapon);

            // Play swing sound based on weapon type
            const swingSounds = this._getSwingSounds(weaponType);
            if (swingSounds && swingSounds.length > 0) {
                // Pick a sound different from the last one for variety
                let soundId = swingSounds[Math.floor(Math.random() * swingSounds.length)];
                if (swingSounds.length > 1 && soundId === this.lastPlayerAttackSound) {
                    const otherSounds = swingSounds.filter(s => s !== soundId);
                    soundId = otherSounds[Math.floor(Math.random() * otherSounds.length)];
                }
                this.lastPlayerAttackSound = soundId;

                if (typeof SFXSystem !== 'undefined' && typeof SFXSystem.playCombat === 'function') {
                    SFXSystem.playCombat(soundId, { volume: 0.7 });
                }
            }
        } catch (e) {
            // Silently fail - audio is optional
        }
    },

    /**
     * Called when damage is dealt (hit lands)
     * @param {object} attacker
     * @param {object} defender
     * @param {object} damageResult
     */
    onHit(attacker, defender, damageResult) {
        if (!this.enabled || !this._canPlaySound()) return;

        try {
            const isPlayerAttacking = attacker === game?.player;
            const isPlayerDefending = defender === game?.player;

            // Play appropriate hit sound
            if (damageResult?.isCrit) {
                // Critical hit sound
                this._playCriticalHit();
            } else if (damageResult?.isHit !== false) {
                // Normal hit sound
                this._playHitSound(attacker, defender);
            } else {
                // Miss/blocked sound
                this._playBlockSound();
            }

            // Play hurt sound for the defender
            if (isPlayerDefending && damageResult?.finalDamage > 0 && game?.player?.maxHp) {
                this._playPlayerHurt(damageResult.finalDamage, game.player.maxHp);
            } else if (!isPlayerDefending && damageResult?.finalDamage > 0) {
                this._playMonsterHurt(defender, damageResult);
            }
        } catch (e) {
            // Silently fail - audio is optional
        }
    },

    /**
     * Called when an entity dies
     * @param {object} entity
     * @param {object} killer
     */
    onDeath(entity, killer) {
        if (!this.enabled || !this._canPlaySound()) return;

        try {
            const isPlayer = entity === game?.player;

            if (isPlayer) {
                this._playPlayerDeath();
            } else {
                this._playMonsterDeath(entity);
            }
        } catch (e) {
            // Silently fail - audio is optional
        }
    },

    /**
     * Called when combat is engaged
     * @param {object} entity
     * @param {object} target
     */
    onCombatEngage(entity, target) {
        if (!this.enabled || !this._canPlaySound()) return;

        try {
            // Only play alert sound when enemy notices player
            if (entity !== game?.player && target === game?.player) {
                this._playMonsterAlert(entity);
            }
        } catch (e) {
            // Silently fail - audio is optional
        }
    },

    // ========================================================================
    // SOUND PLAYBACK HELPERS
    // ========================================================================

    /**
     * Get weapon type from equipped weapon
     * @private
     */
    _getWeaponType(weapon) {
        if (!weapon) return 'unarmed';

        const type = weapon.weaponType || weapon.type || weapon.subtype;
        if (!type) return 'sword';

        // Map weapon types to sound categories
        if (['sword', 'longsword', 'shortsword', 'broadsword'].includes(type)) return 'sword';
        if (['axe', 'greataxe', 'hatchet'].includes(type)) return 'axe';
        if (['mace', 'hammer', 'warhammer', 'club'].includes(type)) return 'blunt';
        if (['dagger', 'knife'].includes(type)) return 'dagger';
        if (['spear', 'lance', 'polearm'].includes(type)) return 'spear';
        if (['bow', 'crossbow', 'shortbow', 'longbow'].includes(type)) return 'bow';
        if (['staff', 'wand', 'tome'].includes(type)) return 'magic';

        return 'sword';  // Default
    },

    /**
     * Get swing sounds for weapon type
     * @private
     */
    _getSwingSounds(weaponType) {
        // Use combat variations from AUDIO_DEFINITIONS if available
        if (typeof AUDIO_DEFINITIONS !== 'undefined' &&
            AUDIO_DEFINITIONS.combatVariations) {
            const variations = AUDIO_DEFINITIONS.combatVariations;

            switch (weaponType) {
                case 'sword':
                case 'axe':
                case 'dagger':
                    return variations.sword_swing || ['sword_swing_1', 'sword_swing_2'];
                case 'bow':
                    return ['bow_release'];
                case 'magic':
                    return ['spell_fire', 'spell_ice', 'spell_lightning'];
                default:
                    return variations.sword_swing || ['sword_swing_1'];
            }
        }

        return ['sword_swing_1', 'sword_swing_2', 'sword_swing_3'];
    },

    /**
     * Safely call SFXSystem method
     * @private
     */
    _safePlaySound(method, ...args) {
        if (typeof SFXSystem === 'undefined') return null;
        if (typeof SFXSystem[method] !== 'function') return null;

        try {
            return SFXSystem[method](...args);
        } catch (e) {
            // Silently fail - audio is optional
            return null;
        }
    },

    /**
     * Play hit sound based on attacker/defender
     * @private
     */
    _playHitSound(attacker, defender) {
        const hitSounds = ['hit_melee_1', 'hit_melee_2', 'hit_melee_3'];
        const soundId = hitSounds[Math.floor(Math.random() * hitSounds.length)];
        this._safePlaySound('playCombat', soundId, { volume: 0.8 });
    },

    /**
     * Play critical hit sound
     * @private
     */
    _playCriticalHit() {
        this._safePlaySound('playCombat', 'hit_critical', { volume: 0.9, priority: 'HIGH' });
    },

    /**
     * Play block/parry sound
     * @private
     */
    _playBlockSound() {
        this._safePlaySound('playCombat', 'hit_blocked', { volume: 0.7 });
    },

    /**
     * Play player hurt sound
     * @private
     */
    _playPlayerHurt(damage, maxHp) {
        // Louder hurt sound for bigger hits
        const damagePercent = maxHp > 0 ? damage / maxHp : 0;
        const volume = Math.min(1.0, 0.6 + damagePercent * 0.4);

        this._safePlaySound('play', 'player_hurt', {
            volume,
            priority: 'CRITICAL',
            category: 'combat'
        });
    },

    /**
     * Play monster hurt sound
     * @private
     */
    _playMonsterHurt(monster, damageResult) {
        const monsterType = this._getMonsterSoundType(monster);

        // Try to play monster-specific hit sound
        this._safePlaySound('playMonsterSound', monsterType, 'hit', {
            volume: 0.6,
            priority: 'MEDIUM'
        });
    },

    /**
     * Play player death sound
     * @private
     */
    _playPlayerDeath() {
        this._safePlaySound('play', 'player_death', {
            volume: 1.0,
            priority: 'CRITICAL',
            category: 'combat'
        });
    },

    /**
     * Play monster death sound
     * @private
     */
    _playMonsterDeath(monster) {
        const monsterType = this._getMonsterSoundType(monster);

        this._safePlaySound('playMonsterSound', monsterType, 'death', {
            volume: 0.8,
            priority: 'HIGH'
        });
    },

    /**
     * Play monster alert sound
     * @private
     */
    _playMonsterAlert(monster) {
        const monsterType = this._getMonsterSoundType(monster);

        this._safePlaySound('playMonsterSound', monsterType, 'alert', {
            volume: 0.6,
            priority: 'MEDIUM'
        });
    },

    /**
     * Get monster type for sound selection
     * @private
     */
    _getMonsterSoundType(monster) {
        if (!monster) return 'generic';

        // Try various properties to determine monster type
        const type = monster.monsterType ||
                    monster.type ||
                    monster.id ||
                    monster.name?.toLowerCase();

        if (!type) return 'generic';

        // Map to known sound types
        const typeStr = String(type).toLowerCase();

        if (typeStr.includes('rat')) return 'rat';
        if (typeStr.includes('skeleton') || typeStr.includes('bone')) return 'skeleton';
        if (typeStr.includes('goblin')) return 'goblin';
        if (typeStr.includes('slime') || typeStr.includes('ooze')) return 'slime';
        if (typeStr.includes('orc') || typeStr.includes('brute')) return 'orc';
        if (typeStr.includes('malphas')) return 'malphas';
        if (typeStr.includes('core')) return 'core_boss';

        return 'generic';
    },

    /**
     * Check if audio system is ready
     * @private
     */
    _canPlaySound() {
        // Check AudioManager exists and is ready (with safe method call)
        if (typeof AudioManager === 'undefined') {
            return false;
        }

        // Safely check isReady - it may not exist or may throw
        try {
            if (typeof AudioManager.isReady === 'function' && !AudioManager.isReady()) {
                return false;
            }
        } catch (e) {
            return false;
        }

        // Check SFXSystem exists and is ready
        if (typeof SFXSystem === 'undefined' || !SFXSystem.ready) {
            return false;
        }

        return true;
    },

    // ========================================================================
    // PUBLIC API FOR MANUAL TRIGGERS
    // ========================================================================

    /**
     * Play a spell cast sound
     * @param {string} element - Fire, ice, lightning, etc.
     */
    playSpellCast(element) {
        if (!this.enabled || !this._canPlaySound()) return;

        try {
            const elementLower = String(element || 'fire').toLowerCase();
            let soundId = 'spell_fire';

            if (elementLower.includes('ice') || elementLower.includes('frost')) {
                soundId = 'spell_ice';
            } else if (elementLower.includes('lightning') || elementLower.includes('shock')) {
                soundId = 'spell_lightning';
            } else if (elementLower.includes('heal')) {
                soundId = 'spell_heal';
            }

            this._safePlaySound('playCombat', soundId, { volume: 0.8 });
        } catch (e) {
            // Silently fail - audio is optional
        }
    },

    /**
     * Play skill activation sound
     * @param {object} skill
     */
    playSkillActivate(skill) {
        if (!this.enabled || !this._canPlaySound()) return;

        this._safePlaySound('play', 'skill_activate', {
            volume: 0.7,
            priority: 'HIGH',
            category: 'combat'
        });
    },

    /**
     * Play potion use sound
     */
    playPotionUse() {
        if (!this.enabled || !this._canPlaySound()) return;

        this._safePlaySound('play', 'use_potion', {
            volume: 0.6,
            priority: 'MEDIUM',
            category: 'combat'
        });
    },

    /**
     * Play buff application sound
     */
    playBuffApply() {
        if (!this.enabled || !this._canPlaySound()) return;

        this._safePlaySound('play', 'buff_apply', {
            volume: 0.6,
            priority: 'MEDIUM',
            category: 'combat'
        });
    },

    /**
     * Play debuff application sound
     */
    playDebuffApply() {
        if (!this.enabled || !this._canPlaySound()) return;

        this._safePlaySound('play', 'debuff_apply', {
            volume: 0.6,
            priority: 'MEDIUM',
            category: 'combat'
        });
    }
};

// ============================================================================
// AUTO-INITIALIZE
// ============================================================================

// Initialize when document is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        CombatAudio.init();
    } else {
        document.addEventListener('DOMContentLoaded', () => CombatAudio.init());
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.CombatAudio = CombatAudio;
}

console.log('[CombatAudio] Combat audio integration loaded');
