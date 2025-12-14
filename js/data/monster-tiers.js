// ============================================================================
// MONSTER TIERS SYSTEM - The Shifting Chasm
// ============================================================================
// Tiers define AI behavior patterns only
// Combat properties derived from existing MONSTER_DATA
// ============================================================================

const MONSTER_TIERS = {
    TIER_3: {
        tierId: 'TIER_3',
        name: 'Tier 3',
        indicator: 'III',
        color: '#888888',
        description: 'Cowardly conscripts who find courage in numbers',

        senses: {
            visionRange: 3,
            visionConeAngle: 90,
            hearingRange: 6,
            canSeeInDark: false,
            reactionDelay: 600  // Slow reaction - player can step back or strike first
        },

        communication: {
            shoutRange: 5,
            shoutDelay: 1.5,
            canShout: true,
            shoutInterruptable: true,
            respondsToAllies: true
        },

        behavior: {
            fleeThreshold: 0.3,
            fleeSpeed: 1.2,
            fightsToDeath: false,
            hasMemory: false,
            memoryDuration: 0,
            searchBehavior: 'none',  // "Must have been the wind" - returns to IDLE immediately
            aggroRange: 4,
            deaggroRange: 10,
            attackCooldown: 2.5,
            kitesBehavior: false,
            preferredRange: 1,
            checkHidingSpots: false
        },

        social: {
            isSacrificial: true,      // Can be consumed by Elites
            packCourage: true,        // Mob mentality - braver in groups of 4+
            packCourageThreshold: 4,  // Need 4+ to activate courage
            retreatHierarchy: ['TIER_2', 'TIER_1', 'ELITE'],  // Retreats to any higher tier
            canCommand: false
        },

        wandering: {
            defaultPattern: 'random',
            pauseChance: 0.3,
            pauseDuration: [1, 3],
            turnChance: 0.4
        }
    },

    TIER_2: {
        tierId: 'TIER_2',
        name: 'Tier 2',
        indicator: 'II',
        color: '#CCAA44',
        description: 'Disciplined soldiers who follow orders',

        senses: {
            visionRange: 3,
            visionConeAngle: 75,
            hearingRange: 8,
            canSeeInDark: false,
            reactionDelay: 300  // Moderate reaction
        },

        communication: {
            shoutRange: 7,
            shoutDelay: 1.2,
            canShout: true,
            shoutInterruptable: true,
            respondsToAllies: true
        },

        behavior: {
            fleeThreshold: 0.2,
            fleeSpeed: 1.1,
            fightsToDeath: false,
            hasMemory: false,
            memoryDuration: 0,
            searchBehavior: 'lastKnown',  // Checks last known position
            aggroRange: 5,
            deaggroRange: 12,
            attackCooldown: 2.0,
            kitesBehavior: false,
            preferredRange: 1,
            checkHidingSpots: false
        },

        social: {
            isSacrificial: false,
            packCourage: false,
            retreatHierarchy: ['ELITE'],  // Only retreats to Elites
            canCommand: false
        },

        wandering: {
            defaultPattern: 'random',
            pauseChance: 0.25,
            pauseDuration: [1, 2.5],
            turnChance: 0.35
        }
    },

    TIER_1: {
        tierId: 'TIER_1',
        name: 'Tier 1',
        indicator: 'I',
        color: '#CC4444',
        description: 'Veterans who use tactics and check corners',

        senses: {
            visionRange: 4,
            visionConeAngle: 60,
            hearingRange: 10,
            canSeeInDark: false,
            reactionDelay: 100  // Near-instant reaction
        },

        communication: {
            shoutRange: 10,
            shoutDelay: 0.8,
            canShout: true,
            shoutInterruptable: true,
            respondsToAllies: true
        },

        behavior: {
            fleeThreshold: 0,
            fleeSpeed: 1.0,
            fightsToDeath: true,
            hasMemory: true,
            memoryDuration: 10,
            searchBehavior: 'tactical',  // Throws projectile at last known spot, then checks
            aggroRange: 6,
            deaggroRange: 15,
            attackCooldown: 1.8,
            kitesBehavior: false,
            preferredRange: 1,
            checkHidingSpots: true
        },

        social: {
            isSacrificial: false,
            packCourage: false,
            retreatHierarchy: [],  // Never retreats - fights to death
            canCommand: true,      // Can command Tier 3s
            commandRange: 8
        },

        wandering: {
            defaultPattern: 'patrol',
            pauseChance: 0.2,
            pauseDuration: [0.5, 1.5],
            turnChance: 0.25
        }
    },

    ELITE: {
        tierId: 'ELITE',
        name: 'Elite',
        indicator: '★',
        color: '#FFD700',
        description: 'Cruel commanders who spend the lives of underlings to survive',

        senses: {
            visionRange: 5,
            visionConeAngle: 45,
            hearingRange: 12,
            canSeeInDark: true,
            reactionDelay: 50  // Instant reaction
        },

        communication: {
            shoutRange: 15,
            shoutDelay: 0.5,
            canShout: true,
            shoutInterruptable: false,
            respondsToAllies: true
        },

        behavior: {
            fleeThreshold: 0,
            fleeSpeed: 1.0,
            fightsToDeath: true,
            hasMemory: true,
            memoryDuration: 20,
            searchBehavior: 'aggressive',  // Commands nearby Tier 3s to check spots
            checkHidingSpots: true,
            aggroRange: 8,
            deaggroRange: 20,
            attackCooldown: 1.5,
            kitesBehavior: false,
            preferredRange: 2
        },

        social: {
            isSacrificial: false,
            packCourage: false,
            retreatHierarchy: [],       // Never retreats - holds the line
            canCommand: true,
            commandRange: 12,
            canSacrificeMinions: true,  // Can consume Tier 3s to heal
            sacrificeThreshold: 0.3,    // Triggers at 30% HP
            sacrificeHeal: 0.25,        // Heals 25% of max HP
            sacrificeDamageBuff: 0.2    // +20% damage after sacrifice
        },

        wandering: {
            defaultPattern: 'patrol',
            pauseChance: 0.15,
            pauseDuration: [0.5, 1],
            turnChance: 0.2
        }
    },

    BOSS: {
        tierId: 'BOSS',
        name: 'Boss',
        indicator: '☆',
        color: '#FF4444',
        description: 'Ancient horrors that command absolute fear',

        senses: {
            visionRange: 10,
            visionConeAngle: 360,
            hearingRange: 15,
            canSeeInDark: true,
            reactionDelay: 0  // Perfect awareness
        },

        communication: {
            shoutRange: 20,
            shoutDelay: 0.3,
            canShout: true,
            shoutInterruptable: false,
            respondsToAllies: false
        },

        behavior: {
            fleeThreshold: 0,
            fleeSpeed: 1.0,
            fightsToDeath: true,
            hasMemory: true,
            memoryDuration: 60,
            searchBehavior: 'aggressive',
            checkHidingSpots: true,
            aggroRange: 10,
            deaggroRange: 999,
            attackCooldown: 1.2,
            kitesBehavior: false,
            preferredRange: 2
        },

        social: {
            isSacrificial: false,
            packCourage: false,
            retreatHierarchy: [],
            canCommand: true,
            commandRange: 20,
            canSacrificeMinions: true,
            sacrificeThreshold: 0.4,
            sacrificeHeal: 0.30,
            sacrificeDamageBuff: 0.3
        },

        wandering: {
            defaultPattern: 'stationary',
            pauseChance: 0,
            pauseDuration: [0, 0],
            turnChance: 0
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
        behavior: { 
            fleeThreshold: 0.4, 
            fleeSpeed: 1.5,
            attackCooldown: 1.5
        }
    },
    'Cave Bat': {
        behavior: { 
            fleeThreshold: 0.5, 
            fleeSpeed: 1.6,
            attackCooldown: 1.2
        }
    },
    'Cinder Wisp': {
        behavior: { 
            preferredRange: 4, 
            kitesBehavior: true
        }
    },
    'Ash Walker': {
        senses: { canSeeInDark: true }
    },
    'Pyro Cultist': {
        behavior: { 
            preferredRange: 5, 
            kitesBehavior: true
        }
    },
    'Shadow Stalker': {
        senses: { canSeeInDark: true },
        behavior: { 
            attackCooldown: 1.0
        }
    },
    'Phantom': {
        senses: { canSeeInDark: true },
        behavior: { 
            preferredRange: 3, 
            kitesBehavior: true
        }
    },
    'Crystal Spider': {
        behavior: {
            attackCooldown: 1.3
        }
    },
    'Obsidian Golem': {
        wandering: { 
            pauseChance: 0.4, 
            pauseDuration: [2, 4] 
        },
        specialAttack: {
            name: 'Earthquake',
            baseDamage: 35,
            scalingStat: 'str',
            scalingMultiplier: 2.5,
            cooldown: 10.0,
            triggerChance: 0.25,
            aoeRadius: 3,
            effect: 'stun',
            effectDuration: 1.5
        }
    },
    'Bone Golem': {
        wandering: { 
            pauseChance: 0.35, 
            pauseDuration: [2, 3] 
        },
        specialAttack: {
            name: 'Bone Shatter',
            baseDamage: 30,
            scalingStat: 'str',
            scalingMultiplier: 2.0,
            cooldown: 8.0,
            triggerChance: 0.20,
            aoeRadius: 2,
            effect: 'bleed',
            effectDuration: 3.0
        }
    },
    'Void Touched': {
        senses: { canSeeInDark: true },
        behavior: { 
            preferredRange: 4, 
            kitesBehavior: true
        },
        specialAttack: {
            name: 'Void Blast',
            baseDamage: 25,
            scalingStat: 'int',
            scalingMultiplier: 2.0,
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

function getMonsterTierId(monsterName) {
    return MONSTER_TIER_MAP[monsterName] || 'TIER_2';
}

function getMonsterTierConfig(monsterName) {
    const tierId = getMonsterTierId(monsterName);
    return MONSTER_TIERS[tierId];
}

function buildCombatConfig(monsterName) {
    const monsterData = MONSTER_DATA[monsterName];
    if (!monsterData) {
        console.error(`[Tiers] Unknown monster: ${monsterName}`);
        return null;
    }

    const overrides = MONSTER_AI_OVERRIDES[monsterName];
    const scalingStat = monsterData.attackType === 'magic' ? 'int' : 'str';
    const primaryStat = monsterData.attackType === 'magic' ? monsterData.int : monsterData.str;
    const baseDamage = Math.floor(8 + (primaryStat * 0.5));

    // Use individual monster attack properties from MONSTER_DATA
    const attackRange = monsterData.attackRange || (monsterData.attackType === 'magic' ? 5 : 1);
    const attackSpeed = monsterData.attackSpeed || 2.0;

    return {
        attackRange: attackRange,
        attackSpeed: attackSpeed,
        baseDamage: baseDamage,
        scalingStat: scalingStat,
        scalingMultiplier: 1.0,
        attackName: monsterData.attack,
        special: overrides?.specialAttack || null
    };
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
        tierId: tierId,
        tierConfig: tierConfig,
        senses: { ...tierConfig.senses, ...(overrides.senses || {}) },
        behavior: { ...tierConfig.behavior, ...(overrides.behavior || {}) },
        communication: { ...tierConfig.communication, ...(overrides.communication || {}) },
        wandering: { ...tierConfig.wandering, ...(overrides.wandering || {}) },
        combat: combat
    };
}

function getMonsterConfig(monsterTypeId) {
    return getMonsterAIConfig(monsterTypeId);
}

// ============================================================
// FLOOR-BASED STAT SCALING (Compound/Exponential)
// ============================================================
// Monsters grow stronger as players descend deeper into the dungeon
// Uses compound scaling: multiplier = (1 + rate) ^ (floor - 1)
// This matches exponential player power growth from gear + skills
//
// Split HP/Damage scaling prevents "bullet sponge" syndrome:
// - HP scales faster so monsters survive player burst damage
// - Damage scales slower to prevent one-shot frustration

const FLOOR_SCALING = {
    // Compound rate per floor: multiplier = (1 + rate) ^ (floor - 1)
    // Floor 1 = 1.0x, Floor 5 = ~1.52x, Floor 10 = ~2.37x

    // HP scales faster to survive player bursts
    hp: 0.10,        // +10% compound per floor (1.10^9 = 2.36x at floor 10)

    // Damage scales slower to prevent one-shot kills
    str: 0.07,       // +7% compound per floor (1.07^9 = 1.84x at floor 10)
    int: 0.07,       // +7% compound per floor

    // Defense scales moderately
    agi: 0.06,       // +6% compound per floor
    pDef: 0.08,      // +8% compound per floor
    mDef: 0.08,      // +8% compound per floor

    // Rewards scale with challenge
    xp: 0.08,        // +8% compound per floor
    gold: 0.08,      // +8% compound per floor

    // Cap to prevent infinite scaling
    maxMultiplier: 4.0,  // Stats can't exceed 4x base

    // Minimum floor (floors below this don't scale)
    minScalingFloor: 1
};

/**
 * Apply floor-based COMPOUND scaling to monster stats
 * Uses exponential formula: base * (1 + rate) ^ (floor - 1)
 * @param {object} baseStats - Base stats from MONSTER_DATA
 * @param {string} monsterName - Monster type name
 * @param {number} floor - Current dungeon floor (1-based)
 * @returns {object} Scaled stats
 */
function applyTierMultipliers(baseStats, monsterName, floor = 1) {
    const cfg = FLOOR_SCALING;

    // No scaling below minimum floor
    if (floor < cfg.minScalingFloor) {
        floor = cfg.minScalingFloor;
    }

    // Helper to calculate COMPOUND scaled stat
    // Formula: base * (1 + rate) ^ (floor - 1)
    const scale = (base, rate) => {
        if (typeof base !== 'number' || isNaN(base)) return base;
        const mult = Math.min(cfg.maxMultiplier, Math.pow(1 + rate, floor - 1));
        return Math.floor(base * mult);
    };

    return {
        // HP scales faster (survival)
        hp: scale(baseStats.hp, cfg.hp),

        // Damage stats scale slower (prevent one-shots)
        str: scale(baseStats.str, cfg.str),
        int: scale(baseStats.int, cfg.int),

        // Utility stats
        agi: scale(baseStats.agi, cfg.agi),
        pDef: scale(baseStats.pDef, cfg.pDef),
        mDef: scale(baseStats.mDef, cfg.mDef),

        // Rewards - scale proportionally
        xp: scale(baseStats.xp, cfg.xp),
        goldMin: scale(baseStats.goldMin, cfg.gold),
        goldMax: scale(baseStats.goldMax, cfg.gold),

        // Track the monster's level for UI display
        level: floor
    };
}

function getTierIndicator(monsterName) {
    const tierConfig = getMonsterTierConfig(monsterName);
    return { 
        indicator: tierConfig.indicator, 
        color: tierConfig.color 
    };
}

function getMonstersByTier(tierId) {
    return Object.entries(MONSTER_TIER_MAP)
        .filter(([name, tier]) => tier === tierId)
        .map(([name]) => name);
}

function isEliteMonster(monsterName) {
    const tier = getMonsterTierId(monsterName);
    return tier === 'ELITE' || tier === 'BOSS';
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
window.getMonsterConfig = getMonsterConfig;
window.applyTierMultipliers = applyTierMultipliers;
window.getTierIndicator = getTierIndicator;
window.getMonstersByTier = getMonstersByTier;
window.isEliteMonster = isEliteMonster;

console.log('[MonsterTiers] Loaded', Object.keys(MONSTER_TIERS).length, 'tiers');