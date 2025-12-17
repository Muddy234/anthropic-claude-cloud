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
// FLOOR-BASED STAT SCALING (Tiered System)
// ============================================================
// Floor 1: Base stats
// Floor 2: HP/XP +15%, Other stats +5%
// Floor 3: HP/XP +15%, Other stats +10%
// Floor 4: All stats +12%
// Floor 5+: All stats increase by +1% per floor (13%, 14%, 15%, etc.)
// No cap - difficulty scales indefinitely

const FLOOR_SCALING = {
    // Tiered scaling rates per floor
    tiers: {
        2: { hpXp: 0.15, other: 0.05 },   // Floor 2: HP/XP +15%, other +5%
        3: { hpXp: 0.15, other: 0.10 },   // Floor 3: HP/XP +15%, other +10%
        4: { hpXp: 0.12, other: 0.12 }    // Floor 4: All +12%
    },
    // Floor 5+ base rate (increases by 1% each floor)
    baseRateFloor5Plus: 0.12,  // 12% + (floor - 4)% = 13% at floor 5, 14% at floor 6, etc.
    rateIncreasePerFloor: 0.01
};

function applyTierMultipliers(baseStats, monsterName, floor = 1) {
    // Floor 1 = base stats, no scaling
    if (floor <= 1) {
        return {
            hp: baseStats.hp,
            str: baseStats.str,
            int: baseStats.int,
            agi: baseStats.agi,
            pDef: baseStats.pDef,
            mDef: baseStats.mDef,
            xp: baseStats.xp,
            goldMin: baseStats.goldMin,
            goldMax: baseStats.goldMax,
            level: floor
        };
    }

    // Calculate cumulative multipliers
    let hpXpMult = 1.0;
    let otherMult = 1.0;

    for (let f = 2; f <= floor; f++) {
        let hpXpRate, otherRate;

        if (f <= 4) {
            // Use tiered rates for floors 2-4
            const tier = FLOOR_SCALING.tiers[f];
            hpXpRate = tier.hpXp;
            otherRate = tier.other;
        } else {
            // Floor 5+: base rate + 1% per floor above 4
            const dynamicRate = FLOOR_SCALING.baseRateFloor5Plus +
                                (f - 4) * FLOOR_SCALING.rateIncreasePerFloor;
            hpXpRate = dynamicRate;
            otherRate = dynamicRate;
        }

        hpXpMult *= (1 + hpXpRate);
        otherMult *= (1 + otherRate);
    }

    const scaleHpXp = (base) => {
        if (typeof base !== 'number' || isNaN(base)) return base;
        return Math.floor(base * hpXpMult);
    };

    const scaleOther = (base) => {
        if (typeof base !== 'number' || isNaN(base)) return base;
        return Math.floor(base * otherMult);
    };

    return {
        hp: scaleHpXp(baseStats.hp),
        str: scaleOther(baseStats.str),
        int: scaleOther(baseStats.int),
        agi: scaleOther(baseStats.agi),
        pDef: scaleOther(baseStats.pDef),
        mDef: scaleOther(baseStats.mDef),
        xp: scaleHpXp(baseStats.xp),
        goldMin: scaleOther(baseStats.goldMin),
        goldMax: scaleOther(baseStats.goldMax),
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
