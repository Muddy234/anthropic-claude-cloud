// === js/data/core-data.js ===
// SURVIVAL EXTRACTION UPDATE: The Core - Final challenge data

// ============================================================================
// THE CORE CONFIGURATION
// ============================================================================

const CORE_CONFIG = {
    // Access requirements
    requirements: {
        keyItem: 'core_key',
        minLevel: 1,  // No level requirement, just need the key
        guardiansDefeated: 5  // All floor guardians
    },

    // Arena properties
    arena: {
        width: 40,
        height: 40,
        tileType: 'void',
        ambientLight: 0.3,
        fogColor: '#1a0a2a'
    },

    // Phases
    phases: 3,

    // Rewards
    rewards: {
        gold: 10000,
        materials: [
            { id: 'core_shard', count: 5 },
            { id: 'primordial_essence', count: 10 }
        ],
        unlocks: ['primordial_blade', 'new_game_plus']
    }
};

// ============================================================================
// THE CORE BOSS - THE PRIMORDIAL
// ============================================================================

const CORE_BOSS_DATA = {
    id: 'the_primordial',
    name: 'The Primordial',
    title: 'Heart of the Chasm',
    description: 'An ancient entity that has slumbered at the heart of the Chasm since time immemorial. It is both the creator and destroyer of all that exists within these depths.',

    // Base stats (scaled by phase)
    baseStats: {
        health: 5000,
        damage: 40,
        defense: 30,
        speed: 1.5,
        attackSpeed: 1.0
    },

    // Visual
    sprite: 'primordial',
    size: 4,  // 4x4 tiles
    color: '#9a4aff',
    glowColor: '#ff4a9a',
    glowIntensity: 0.8,

    // Phase configurations
    phases: {
        1: {
            name: 'Awakening',
            healthThreshold: 1.0,  // Full health
            statMultiplier: 1.0,
            abilities: ['void_pulse', 'shadow_tendrils', 'summon_echoes'],
            attackPattern: 'standard',
            musicTrack: 'boss_phase1',
            dialogue: [
                'You dare disturb my slumber...',
                'Countless delvers have fed my power...',
                'You shall join them.'
            ]
        },
        2: {
            name: 'Fury',
            healthThreshold: 0.6,  // 60% health
            statMultiplier: 1.3,
            abilities: ['void_pulse', 'shadow_tendrils', 'summon_echoes', 'reality_tear', 'chaos_orbs'],
            attackPattern: 'aggressive',
            musicTrack: 'boss_phase2',
            dialogue: [
                'Impressive... but futile!',
                'I am eternal! I AM the Chasm!'
            ]
        },
        3: {
            name: 'Desperation',
            healthThreshold: 0.25,  // 25% health
            statMultiplier: 1.6,
            abilities: ['void_pulse', 'shadow_tendrils', 'summon_echoes', 'reality_tear', 'chaos_orbs', 'primordial_wrath', 'void_collapse'],
            attackPattern: 'berserk',
            musicTrack: 'boss_phase3',
            dialogue: [
                'NO! This cannot be!',
                'If I fall, I take this world with me!'
            ]
        }
    }
};

// ============================================================================
// BOSS ABILITIES
// ============================================================================

const CORE_BOSS_ABILITIES = {

    // Phase 1 Abilities
    void_pulse: {
        id: 'void_pulse',
        name: 'Void Pulse',
        type: 'area',
        damage: 25,
        radius: 6,
        castTime: 1.5,
        cooldown: 5,
        description: 'Releases a pulse of void energy from the center',
        telegraph: {
            type: 'expanding_circle',
            color: '#9a4aff',
            duration: 1.5
        },
        onHit: {
            effect: 'knockback',
            force: 3
        }
    },

    shadow_tendrils: {
        id: 'shadow_tendrils',
        name: 'Shadow Tendrils',
        type: 'targeted',
        damage: 20,
        count: 4,
        castTime: 1.0,
        cooldown: 4,
        description: 'Summons tendrils that chase the player',
        telegraph: {
            type: 'line',
            color: '#4a0a6a',
            duration: 0.8
        },
        projectile: {
            speed: 4,
            duration: 3,
            piercing: true
        },
        onHit: {
            effect: 'slow',
            duration: 2,
            amount: 0.5
        }
    },

    summon_echoes: {
        id: 'summon_echoes',
        name: 'Summon Echoes',
        type: 'summon',
        summonType: 'void_echo',
        count: 3,
        castTime: 2.0,
        cooldown: 15,
        description: 'Summons shadow copies of fallen delvers',
        telegraph: {
            type: 'spawn_markers',
            color: '#2a1a4a',
            duration: 1.5
        }
    },

    // Phase 2 Abilities
    reality_tear: {
        id: 'reality_tear',
        name: 'Reality Tear',
        type: 'zone',
        damage: 15,
        tickRate: 0.5,
        duration: 6,
        castTime: 1.2,
        cooldown: 8,
        description: 'Creates a tear in reality that damages anything inside',
        telegraph: {
            type: 'zone',
            color: '#ff00ff',
            duration: 1.0
        },
        zone: {
            width: 5,
            height: 5,
            effect: 'damage_over_time'
        }
    },

    chaos_orbs: {
        id: 'chaos_orbs',
        name: 'Chaos Orbs',
        type: 'projectile',
        damage: 30,
        count: 8,
        castTime: 0.8,
        cooldown: 6,
        description: 'Fires orbs in all directions',
        telegraph: {
            type: 'warning_flash',
            duration: 0.5
        },
        projectile: {
            speed: 5,
            pattern: 'radial',
            bounces: 1
        }
    },

    // Phase 3 Abilities
    primordial_wrath: {
        id: 'primordial_wrath',
        name: 'Primordial Wrath',
        type: 'area',
        damage: 50,
        radius: 15,
        castTime: 3.0,
        cooldown: 20,
        description: 'Massive explosion that covers most of the arena',
        telegraph: {
            type: 'full_arena_warning',
            color: '#ff0000',
            duration: 2.5,
            safeZones: 4  // 4 safe spots in corners
        },
        onHit: {
            effect: 'burn',
            duration: 5,
            dps: 10
        }
    },

    void_collapse: {
        id: 'void_collapse',
        name: 'Void Collapse',
        type: 'environmental',
        damage: 100,  // Instant kill
        castTime: 4.0,
        cooldown: 30,
        description: 'The arena begins to collapse into the void',
        telegraph: {
            type: 'arena_shrink',
            color: '#000000',
            duration: 3.5,
            shrinkPercent: 0.25
        },
        effect: {
            type: 'arena_shrink',
            duration: 15
        }
    }
};

// ============================================================================
// SUMMONS
// ============================================================================

const CORE_SUMMON_DATA = {
    void_echo: {
        id: 'void_echo',
        name: 'Void Echo',
        description: 'A shadow of a fallen delver',
        health: 150,
        damage: 20,
        speed: 3,
        attackSpeed: 1.2,
        sprite: 'void_echo',
        size: 1,
        color: '#4a2a6a',
        abilities: ['shadow_strike'],
        loot: null,  // No loot from echoes
        ai: {
            type: 'aggressive',
            range: 8,
            leashRange: 20
        }
    }
};

// ============================================================================
// ARENA HAZARDS
// ============================================================================

const CORE_HAZARDS = {
    void_rift: {
        id: 'void_rift',
        name: 'Void Rift',
        damage: 25,
        tickRate: 1.0,
        duration: 10,
        sprite: 'void_rift',
        color: '#2a0a4a',
        size: 3
    },

    chaos_pool: {
        id: 'chaos_pool',
        name: 'Chaos Pool',
        damage: 15,
        tickRate: 0.5,
        duration: 8,
        sprite: 'chaos_pool',
        color: '#6a0aaa',
        size: 2,
        effect: 'confusion'  // Random movement inputs
    },

    collapsing_tile: {
        id: 'collapsing_tile',
        name: 'Collapsing Floor',
        warningTime: 2.0,
        fallDamage: 50,
        respawnTime: 10,
        sprite: 'cracked_tile',
        color: '#3a2a2a'
    }
};

// ============================================================================
// VICTORY/DEFEAT
// ============================================================================

const CORE_ENDINGS = {
    victory: {
        title: 'The Chasm is Freed',
        description: 'With the Primordial defeated, the Chasm begins to stabilize. The endless cycle of death and rebirth has been broken.',
        dialogue: [
            'The Primordial lets out a final, earth-shaking roar...',
            'Its form begins to dissolve into pure energy...',
            'The darkness that has plagued the Chasm for eons begins to lift...',
            'You have done what no delver has ever achieved.',
            'The Heart of the Chasm beats for you now.'
        ],
        credits: true,
        newGamePlusUnlock: true
    },

    defeat: {
        title: 'Consumed by the Void',
        description: 'The Primordial\'s power was too great. Your essence joins the countless others that fuel its existence.',
        dialogue: [
            'As darkness claims you, you hear the Primordial\'s laughter...',
            '"Another soul to add to my collection..."',
            'But somewhere, a spark of defiance remains...'
        ],
        respawnAtVillage: true,
        keepProgress: true  // Keep items/gold on core death
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get boss phase based on health percentage
 * @param {number} healthPercent - Current health as percentage (0-1)
 * @returns {number} Phase number (1-3)
 */
function getCoreBossPhase(healthPercent) {
    const phases = CORE_BOSS_DATA.phases;

    if (healthPercent <= phases[3].healthThreshold) return 3;
    if (healthPercent <= phases[2].healthThreshold) return 2;
    return 1;
}

/**
 * Get boss stats for current phase
 * @param {number} phase
 * @returns {Object}
 */
function getCoreBossStats(phase) {
    const base = CORE_BOSS_DATA.baseStats;
    const phaseData = CORE_BOSS_DATA.phases[phase];
    const mult = phaseData.statMultiplier;

    return {
        health: base.health,  // Health doesn't scale with phase
        damage: Math.floor(base.damage * mult),
        defense: Math.floor(base.defense * mult),
        speed: base.speed * mult,
        attackSpeed: base.attackSpeed * mult,
        abilities: phaseData.abilities
    };
}

/**
 * Get ability data
 * @param {string} abilityId
 * @returns {Object|null}
 */
function getCoreBossAbility(abilityId) {
    return CORE_BOSS_ABILITIES[abilityId] || null;
}

/**
 * Check if player can access The Core
 * @returns {Object} { canAccess, reason }
 */
function canAccessCore() {
    const reqs = CORE_CONFIG.requirements;

    // Check for key
    const hasKey = typeof BankingSystem !== 'undefined' ?
        BankingSystem.getItemCount(reqs.keyItem) > 0 :
        persistentState?.bank?.items?.some(i => i.id === reqs.keyItem);

    if (!hasKey) {
        return { canAccess: false, reason: 'Requires Core Key' };
    }

    // Check guardians defeated
    const guardiansDefeated = persistentState?.guardiansDefeated?.length || 0;
    if (guardiansDefeated < reqs.guardiansDefeated) {
        return {
            canAccess: false,
            reason: `Defeat all ${reqs.guardiansDefeated} floor guardians first (${guardiansDefeated}/${reqs.guardiansDefeated})`
        };
    }

    return { canAccess: true };
}

// ============================================================================
// EXPORTS
// ============================================================================

window.CORE_CONFIG = CORE_CONFIG;
window.CORE_BOSS_DATA = CORE_BOSS_DATA;
window.CORE_BOSS_ABILITIES = CORE_BOSS_ABILITIES;
window.CORE_SUMMON_DATA = CORE_SUMMON_DATA;
window.CORE_HAZARDS = CORE_HAZARDS;
window.CORE_ENDINGS = CORE_ENDINGS;
window.getCoreBossPhase = getCoreBossPhase;
window.getCoreBossStats = getCoreBossStats;
window.getCoreBossAbility = getCoreBossAbility;
window.canAccessCore = canAccessCore;

console.log('[CoreData] The Core data loaded');
