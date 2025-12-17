// ============================================================================
// MONSTER TIERS SYSTEM - The Shifting Chasm
// ============================================================================
// Tiers define AI behavior patterns. Combat properties from MONSTER_DATA.
// ============================================================================

const MONSTER_TIERS = {
    TIER_3: {
        name: 'Tier 3',
        indicator: 'III',
        color: '#888888',
        description: 'Cowardly conscripts who find courage in numbers',

        senses: {
            visionRange: 3,
            hearingRange: 6,
            canSeeInDark: false,
            reactionDelay: 600
        },

        communication: {
            shoutRange: 5,
            shoutDelay: 1.5,
            canShout: true,
            shoutInterruptable: true
        },

        behavior: {
            fleeThreshold: 0.3,
            memoryDuration: 0,
            searchBehavior: 'none',
            aggroRange: 4,
            deaggroRange: 10,
            attackCooldown: 2.5,
            kitesBehavior: false,
            preferredRange: 1
        },

        social: {
            isSacrificial: true,
            packCourage: true,
            packCourageThreshold: 4,
            retreatHierarchy: ['TIER_2', 'TIER_1', 'ELITE']
        },

        wandering: {
            defaultPattern: 'random',
            pauseChance: 0.3
        }
    },

    TIER_2: {
        name: 'Tier 2',
        indicator: 'II',
        color: '#CCAA44',
        description: 'Disciplined soldiers who follow orders',

        senses: {
            visionRange: 3,
            hearingRange: 8,
            canSeeInDark: false,
            reactionDelay: 300
        },

        communication: {
            shoutRange: 7,
            shoutDelay: 1.2,
            canShout: true,
            shoutInterruptable: true
        },

        behavior: {
            fleeThreshold: 0.2,
            memoryDuration: 0,
            searchBehavior: 'lastKnown',
            aggroRange: 5,
            deaggroRange: 12,
            attackCooldown: 2.0,
            kitesBehavior: false,
            preferredRange: 1
        },

        social: {
            retreatHierarchy: ['ELITE']
        },

        wandering: {
            defaultPattern: 'random',
            pauseChance: 0.25
        }
    },

    TIER_1: {
        name: 'Tier 1',
        indicator: 'I',
        color: '#CC4444',
        description: 'Veterans who use tactics and check corners',

        senses: {
            visionRange: 4,
            hearingRange: 10,
            canSeeInDark: false,
            reactionDelay: 100
        },

        communication: {
            shoutRange: 10,
            shoutDelay: 0.8,
            canShout: true,
            shoutInterruptable: true
        },

        behavior: {
            fleeThreshold: 0,
            memoryDuration: 10,
            searchBehavior: 'tactical',
            aggroRange: 6,
            deaggroRange: 15,
            attackCooldown: 1.8,
            kitesBehavior: false,
            preferredRange: 1
        },

        social: {
            canCommand: true,
            commandRange: 8
        },

        wandering: {
            defaultPattern: 'patrol',
            pauseChance: 0.2
        }
    },

    ELITE: {
        name: 'Elite',
        indicator: '★',
        color: '#FFD700',
        description: 'Cruel commanders who spend the lives of underlings to survive',

        senses: {
            visionRange: 5,
            hearingRange: 12,
            canSeeInDark: true,
            reactionDelay: 50
        },

        communication: {
            shoutRange: 15,
            shoutDelay: 0.5,
            canShout: true,
            shoutInterruptable: false
        },

        behavior: {
            fleeThreshold: 0,
            memoryDuration: 20,
            searchBehavior: 'aggressive',
            aggroRange: 8,
            deaggroRange: 20,
            attackCooldown: 1.5,
            kitesBehavior: false,
            preferredRange: 2
        },

        social: {
            canCommand: true,
            commandRange: 12,
            canSacrificeMinions: true,
            sacrificeThreshold: 0.3,
            sacrificeHeal: 0.25,
            sacrificeDamageBuff: 0.2
        },

        wandering: {
            defaultPattern: 'patrol',
            pauseChance: 0.15
        }
    },

    BOSS: {
        name: 'Boss',
        indicator: '☆',
        color: '#FF4444',
        description: 'Ancient horrors that command absolute fear',

        senses: {
            visionRange: 10,
            hearingRange: 15,
            canSeeInDark: true,
            reactionDelay: 0
        },

        communication: {
            shoutRange: 20,
            shoutDelay: 0.3,
            canShout: true,
            shoutInterruptable: false
        },

        behavior: {
            fleeThreshold: 0,
            memoryDuration: 60,
            searchBehavior: 'aggressive',
            aggroRange: 10,
            deaggroRange: 999,
            attackCooldown: 1.2,
            kitesBehavior: false,
            preferredRange: 2
        },

        social: {
            canCommand: true,
            commandRange: 20,
            canSacrificeMinions: true,
            sacrificeThreshold: 0.4,
            sacrificeHeal: 0.30,
            sacrificeDamageBuff: 0.3
        },

        wandering: {
            defaultPattern: 'stationary',
            pauseChance: 0
        }
    }
};

// ============================================================
// MONSTER TO TIER MAPPING
// ============================================================

const MONSTER_TIER_MAP = {
    // Volcanic
    'Magma Slime': 'TIER_3',
    'Flame Bat': 'TIER_3',
    'Salamander': 'TIER_2',
    'Ash Walker': 'TIER_2',
    'Cinder Wisp': 'TIER_2',
    'Pyro Cultist': 'TIER_1',
    'Obsidian Golem': 'ELITE',
    // Cave
    'Cave Bat': 'TIER_3',
    'Stone Lurker': 'TIER_2',
    'Mushroom Sprite': 'TIER_2',
    'Crystal Spider': 'TIER_1',
    // Undead
    'Skeletal Warrior': 'TIER_2',
    'Phantom': 'TIER_1',
    'Bone Golem': 'ELITE',
    // Aquatic
    'Deep Crawler': 'TIER_2',
    'Tide Serpent': 'TIER_1',
    // Shadow
    'Shadow Stalker': 'TIER_1',
    'Void Touched': 'ELITE'
};

// ============================================================
// MONSTER-SPECIFIC AI OVERRIDES
// ============================================================

const MONSTER_AI_OVERRIDES = {
    'Magma Slime': {
        wandering: { turnChance: 0.5 }
    },
    'Flame Bat': {
        behavior: { fleeThreshold: 0.4, attackCooldown: 1.5 }
    },
    'Cave Bat': {
        behavior: { fleeThreshold: 0.5, attackCooldown: 1.2 }
    },
    'Cinder Wisp': {
        behavior: { preferredRange: 4, kitesBehavior: true }
    },
    'Ash Walker': {
        senses: { canSeeInDark: true }
    },
    'Pyro Cultist': {
        behavior: { preferredRange: 5, kitesBehavior: true }
    },
    'Shadow Stalker': {
        senses: { canSeeInDark: true },
        behavior: { attackCooldown: 1.0 }
    },
    'Phantom': {
        senses: { canSeeInDark: true },
        behavior: { preferredRange: 3, kitesBehavior: true }
    },
    'Crystal Spider': {
        behavior: { attackCooldown: 1.3 }
    },
    'Obsidian Golem': {
        wandering: { pauseChance: 0.4 },
        specialAttack: {
            name: 'Earthquake',
            baseDamage: 35,
            scalingStat: 'str',
            cooldown: 10.0,
            triggerChance: 0.25,
            aoeRadius: 3,
            effect: 'stun',
            effectDuration: 1.5
        }
    },
    'Bone Golem': {
        wandering: { pauseChance: 0.35 },
        specialAttack: {
            name: 'Bone Shatter',
            baseDamage: 30,
            scalingStat: 'str',
            cooldown: 8.0,
            triggerChance: 0.20,
            aoeRadius: 2,
            effect: 'bleed',
            effectDuration: 3.0
        }
    },
    'Void Touched': {
        senses: { canSeeInDark: true },
        behavior: { preferredRange: 4, kitesBehavior: true },
        specialAttack: {
            name: 'Void Blast',
            baseDamage: 25,
            scalingStat: 'int',
            cooldown: 6.0,
            triggerChance: 0.30,
            aoeRadius: 2,
            effect: 'slow',
            effectDuration: 2.0
        }
    }
};

// ============================================================
// HELPER FUNCTIONS
// ============================================================

// Cache for combat configs (monsters don't change at runtime)
const _combatConfigCache = new Map();

function getMonsterTierId(monsterName) {
    return MONSTER_TIER_MAP[monsterName] || 'TIER_2';
}

function getMonsterTierConfig(monsterName) {
    const tierId = getMonsterTierId(monsterName);
    return MONSTER_TIERS[tierId];
}

function buildCombatConfig(monsterName) {
    // Return cached if available
    if (_combatConfigCache.has(monsterName)) {
        return _combatConfigCache.get(monsterName);
    }

    const monsterData = MONSTER_DATA[monsterName];
    if (!monsterData) {
        console.error(`[Tiers] Unknown monster: ${monsterName}`);
        return null;
    }

    const overrides = MONSTER_AI_OVERRIDES[monsterName];
    const scalingStat = monsterData.attackType === 'magic' ? 'int' : 'str';
    const primaryStat = monsterData.attackType === 'magic' ? monsterData.int : monsterData.str;
    const baseDamage = Math.floor(8 + (primaryStat * 0.5));
    const attackRange = monsterData.attackRange || (monsterData.attackType === 'magic' ? 5 : 1);

    const config = {
        attackRange,
        attackSpeed: monsterData.attackSpeed || 2.0,
        baseDamage,
        scalingStat,
        attackName: monsterData.attack,
        special: overrides?.specialAttack || null
    };

    _combatConfigCache.set(monsterName, config);
    return config;
}

function getMonsterAIConfig(monsterName) {
    const tierId = getMonsterTierId(monsterName);
    const tierConfig = MONSTER_TIERS[tierId];
    const overrides = MONSTER_AI_OVERRIDES[monsterName] || {};
    const combat = buildCombatConfig(monsterName);

    if (!combat) {
        console.warn(`[Tiers] Could not build combat config for: ${monsterName}`);
        return null;
    }

    return {
        tierId,
        tierConfig,
        senses: { ...tierConfig.senses, ...(overrides.senses || {}) },
        behavior: { ...tierConfig.behavior, ...(overrides.behavior || {}) },
        communication: tierConfig.communication,
        wandering: { ...tierConfig.wandering, ...(overrides.wandering || {}) },
        combat
    };
}

// ============================================================
// FLOOR-BASED STAT SCALING (Compound/Exponential)
// ============================================================
// HP scales faster (survival), damage scales slower (prevent one-shots)

const FLOOR_SCALING = {
    hp: 0.10,    // +10% compound per floor
    str: 0.07,   // +7% compound per floor
    int: 0.07,
    agi: 0.06,
    pDef: 0.08,
    mDef: 0.08,
    xp: 0.08,
    gold: 0.08,
    maxMultiplier: 4.0
};

function applyTierMultipliers(baseStats, monsterName, floor = 1) {
    const cfg = FLOOR_SCALING;

    const scale = (base, rate) => {
        if (typeof base !== 'number' || isNaN(base)) return base;
        const mult = Math.min(cfg.maxMultiplier, Math.pow(1 + rate, floor - 1));
        return Math.floor(base * mult);
    };

    return {
        hp: scale(baseStats.hp, cfg.hp),
        str: scale(baseStats.str, cfg.str),
        int: scale(baseStats.int, cfg.int),
        agi: scale(baseStats.agi, cfg.agi),
        pDef: scale(baseStats.pDef, cfg.pDef),
        mDef: scale(baseStats.mDef, cfg.mDef),
        xp: scale(baseStats.xp, cfg.xp),
        goldMin: scale(baseStats.goldMin, cfg.gold),
        goldMax: scale(baseStats.goldMax, cfg.gold),
        level: floor
    };
}

// ============================================================
// GLOBAL EXPORTS
// ============================================================

window.MONSTER_TIERS = MONSTER_TIERS;
window.MONSTER_TIER_MAP = MONSTER_TIER_MAP;
window.MONSTER_AI_OVERRIDES = MONSTER_AI_OVERRIDES;
window.FLOOR_SCALING = FLOOR_SCALING;
window.getMonsterTierId = getMonsterTierId;
window.getMonsterTierConfig = getMonsterTierConfig;
window.getMonsterAIConfig = getMonsterAIConfig;
window.applyTierMultipliers = applyTierMultipliers;

console.log('[MonsterTiers] Loaded', Object.keys(MONSTER_TIERS).length, 'tiers');
