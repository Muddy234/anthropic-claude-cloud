// ============================================================================
// MONSTER TIERS SYSTEM - The Shifting Chasm
// ============================================================================
// Comprehensive tier system with 7 categories:
// 1. perception - vision, hearing, reaction, memory
// 2. movement - speeds, wander patterns
// 3. combat - attack timing, windup, cooldowns
// 4. defense - flee, evasion, resistances
// 5. social - leadership, commands, pack behavior
// 6. positioning - range preferences, kiting, circling
// 7. intelligence - search, commands, frustration
// ============================================================================

const MONSTER_TIERS = {
    // =========================================================================
    // TIER 3: FODDER - Cowardly conscripts, cannon fodder
    // "Must have been the wind" - Low perception, easy to scare
    // =========================================================================
    TIER_3: {
        name: 'Tier 3',
        indicator: 'III',
        color: '#888888',
        description: 'Cowardly conscripts who find courage in numbers',

        // PERCEPTION - How monsters sense the world
        perception: {
            sightRange: 3,              // Base vision range in tiles
            sightConeAngle: 50,         // Vision cone half-angle in degrees
            canSeeInDark: false,        // Immune to player torch stealth
            peripheralRange: 0,         // Detection range behind enemy (0 = none)
            hearingRange: 6,            // Audio detection range in tiles
            hearingMultiplier: 0.8,     // Multiplier for noise volume
            deafDuringCombat: true,     // Ignores sounds while attacking
            reactionDelay: 600,         // ms delay before aggro (0 = instant)
            alertnessFalloff: 2.0,      // Rate alertness decays
            memoryDuration: 0,          // Seconds to remember last known position
            memoryAccuracy: 0           // 0-1, how precise the remembered position
        },

        // MOVEMENT - How monsters move
        movement: {
            baseSpeed: 2.5,             // Tiles per second (wandering)
            chaseSpeed: 3.0,            // Pursuing a target
            fleeSpeed: 4.0,             // Running away
            combatSpeed: 2.0,           // During active combat
            strafeMult: 0.6,            // While strafing
            retreatMult: 0.8,           // While backing up
            injuredMult: 1.2,           // When below fleeThreshold HP
            wanderPattern: 'random',    // 'random', 'patrol', 'stationary', 'pacing'
            wanderRadius: 4,            // Max tiles from spawn while wandering
            pauseChance: 0.3,           // 0-1, chance to pause while wandering
            pauseDurationMin: 1000,     // ms minimum pause
            pauseDurationMax: 3000,     // ms maximum pause
            turnChance: 0.5             // 0-1, chance to change direction randomly
        },

        // COMBAT - Attack timing and behavior
        combat: {
            windupDuration: 500,        // Telegraph duration before attack lands
            attackDuration: 700,        // Total attack animation time
            recoveryDuration: 400,      // Vulnerability window after attack
            attackCooldown: 2.5,        // Base seconds between attacks
            tracksDuringWindup: false,  // Does enemy track player during telegraph?
            trackingCutoff: 0,          // ms before strike to stop tracking
            canInterruptAttack: true,   // Can attack be interrupted by damage?
            attackArc: null,            // Degrees of attack sweep (null = single target)
            chargeDistance: 0,          // Tiles traveled during charge attacks
            knockbackOnHit: 0,          // Tiles target is pushed back
            telegraphColor: '#ffffff',  // Hex color for windup indicator
            telegraphIntensity: 0.3,    // 0-1, brightness of telegraph
            maxAttackersContribution: 0.5, // Contribution to max attackers limit
            circlingSpeed: 1.5,         // Speed when circling waiting for turn
            maintainsFormation: false   // Tries to stay in formation
        },

        // DEFENSE - Defensive behaviors and mitigation
        defense: {
            fleeThreshold: 0.3,         // HP% that triggers flee (0 = never)
            fleeToAlly: true,           // Retreats toward stronger allies
            fleeDistance: 6,            // How far to run before stopping
            evasionChance: 0,           // 0-1, base chance to dodge attacks
            evasionCooldown: 0,         // ms between dodge attempts
            canDodgeAOE: false,         // Can dodge area attacks
            dodgeDistance: 0,           // Tiles moved when dodging
            baseDamageReduction: 0,     // Flat % reduction before defenses
            resistances: {
                fire: 0, ice: 0, nature: 0, death: 0,
                holy: 0, dark: 0, physical: 0
            },
            statusResistance: {
                stun: 0, slow: 0, burn: 0,
                poison: 0, fear: 0, silence: 0
            }
        },

        // SOCIAL - Pack behavior, commands, hierarchy
        social: {
            canLead: false,             // Can command lower-tier enemies
            commandRange: 0,            // Tiles for command radius
            commandableBy: ['TIER_2', 'TIER_1', 'ELITE', 'BOSS'],
            followDistance: 3,          // Ideal tiles from leader
            followFormation: 'cluster', // 'line', 'cluster', 'spread', 'none'
            packCourage: true,          // Gets braver with allies nearby
            packCourageThreshold: 4,    // Allies needed for courage bonus
            packCourageBonus: 0.1,      // % reduction to fleeThreshold per ally
            isSacrificial: true,        // Can be consumed by higher tiers
            canSacrificeMinions: false, // Can consume lower tiers
            sacrificeThreshold: 0,      // HP% to trigger sacrifice
            sacrificeHeal: 0,           // % of max HP healed
            sacrificeDamageBuff: 0,     // % damage increase after sacrifice
            retreatHierarchy: ['TIER_2', 'TIER_1', 'ELITE'],
            shoutRange: 5,              // Alert radius in tiles
            shoutDelay: 1.5,            // Seconds to complete shout
            shoutInterruptable: true,   // Can shout be interrupted by damage
            alertOnDamage: true,        // Alerts allies when damaged
            alertOnDeath: true,         // Alerts allies when killed
            baseMorale: 40,             // Starting morale (0-100)
            moralePerAllyDeath: 15,     // Morale lost when ally dies
            moralePanicThreshold: 20,   // Below this, may flee
            moraleRecoveryRate: 5       // Per second when safe
        },

        // POSITIONING - Combat range and tactical positioning
        positioning: {
            preferredRange: 1,          // Ideal distance from target in tiles
            minRange: 0,                // Won't get closer than this
            maxRange: 2,                // Won't attack beyond this
            rangeTolerance: 1.0,        // Dead zone to prevent jitter
            kitesBehavior: false,       // Maintains distance (ranged enemies)
            kiteRetreatRange: 0,        // Distance that triggers retreat
            circlingEnabled: true,      // Circles target when waiting
            circlingRadius: 1.5,        // Distance from target while circling
            circlingDirection: 'random', // 'clockwise', 'counter', 'random'
            prefersFlank: false,        // Tries to attack from sides
            prefersBackstab: false,     // Tries to attack from behind
            avoidsAOE: false,           // Moves away from area hazards
            maintainsLOS: false,        // Keeps line of sight to target
            spreadDistance: 1,          // Min tiles between allies in combat
            encirclementParticipant: true // Contributes to surrounding player
        },

        // INTELLIGENCE - Search behavior, tactics, frustration
        intelligence: {
            searchBehavior: 'none',     // 'none', 'lastKnown', 'tactical', 'aggressive'
            searchDuration: 0,          // Seconds to search before giving up
            searchPattern: 'direct',    // 'direct', 'sweep', 'spiral', 'random'
            investigatesNoise: false,   // Checks out sounds
            investigatesCorpses: false, // Checks dead allies
            investigationDuration: 0,   // Seconds spent investigating
            canCommand: false,          // Can issue orders to lower tiers
            commandTypes: [],           // ['attack', 'defend', 'retreat', 'hold']
            commandCooldown: 0,         // Seconds between commands
            usesAmbush: false,          // Waits for player to pass
            usesTraps: false,           // Can activate environmental hazards
            callsReinforcements: false, // Can summon additional enemies
            reinforcementCooldown: 0,   // Seconds between calls
            learnsPlayerPatterns: false, // Adapts to player behavior
            adaptationRate: 0,          // 0-1, how quickly adapts
            frustrationThreshold: 5,    // Failures before alternate behavior
            frustrationBehavior: 'giveUp' // 'giveUp', 'flank', 'callHelp', 'berserk'
        }
    },

    // =========================================================================
    // TIER 2: REGULAR - Disciplined soldiers, follow orders
    // Competent but predictable
    // =========================================================================
    TIER_2: {
        name: 'Tier 2',
        indicator: 'II',
        color: '#CCAA44',
        description: 'Disciplined soldiers who follow orders',

        perception: {
            sightRange: 4,
            sightConeAngle: 60,
            canSeeInDark: false,
            peripheralRange: 1,
            hearingRange: 8,
            hearingMultiplier: 1.0,
            deafDuringCombat: false,
            reactionDelay: 300,
            alertnessFalloff: 1.0,
            memoryDuration: 3,
            memoryAccuracy: 0.5
        },

        movement: {
            baseSpeed: 3.0,
            chaseSpeed: 3.5,
            fleeSpeed: 3.5,
            combatSpeed: 2.5,
            strafeMult: 0.7,
            retreatMult: 0.8,
            injuredMult: 1.0,
            wanderPattern: 'patrol',
            wanderRadius: 6,
            pauseChance: 0.25,
            pauseDurationMin: 1500,
            pauseDurationMax: 4000,
            turnChance: 0.3
        },

        combat: {
            windupDuration: 400,
            attackDuration: 600,
            recoveryDuration: 300,
            attackCooldown: 2.0,
            tracksDuringWindup: false,
            trackingCutoff: 0,
            canInterruptAttack: true,
            attackArc: null,
            chargeDistance: 0,
            knockbackOnHit: 0.5,
            telegraphColor: '#ffffff',
            telegraphIntensity: 0.5,
            maxAttackersContribution: 1,
            circlingSpeed: 2.0,
            maintainsFormation: true
        },

        defense: {
            fleeThreshold: 0.2,
            fleeToAlly: true,
            fleeDistance: 5,
            evasionChance: 0.05,
            evasionCooldown: 3000,
            canDodgeAOE: false,
            dodgeDistance: 1,
            baseDamageReduction: 0.05,
            resistances: {
                fire: 0, ice: 0, nature: 0, death: 0,
                holy: 0, dark: 0, physical: 0
            },
            statusResistance: {
                stun: 0.1, slow: 0.1, burn: 0,
                poison: 0, fear: 0.2, silence: 0
            }
        },

        social: {
            canLead: false,
            commandRange: 0,
            commandableBy: ['TIER_1', 'ELITE', 'BOSS'],
            followDistance: 2.5,
            followFormation: 'spread',
            packCourage: false,
            packCourageThreshold: 0,
            packCourageBonus: 0,
            isSacrificial: false,
            canSacrificeMinions: false,
            sacrificeThreshold: 0,
            sacrificeHeal: 0,
            sacrificeDamageBuff: 0,
            retreatHierarchy: ['ELITE'],
            shoutRange: 7,
            shoutDelay: 1.2,
            shoutInterruptable: true,
            alertOnDamage: true,
            alertOnDeath: true,
            baseMorale: 60,
            moralePerAllyDeath: 10,
            moralePanicThreshold: 15,
            moraleRecoveryRate: 3
        },

        positioning: {
            preferredRange: 1,
            minRange: 0,
            maxRange: 2,
            rangeTolerance: 1.0,
            kitesBehavior: false,
            kiteRetreatRange: 0,
            circlingEnabled: true,
            circlingRadius: 2.0,
            circlingDirection: 'clockwise',
            prefersFlank: true,
            prefersBackstab: false,
            avoidsAOE: true,
            maintainsLOS: true,
            spreadDistance: 1.5,
            encirclementParticipant: true
        },

        intelligence: {
            searchBehavior: 'lastKnown',
            searchDuration: 5,
            searchPattern: 'direct',
            investigatesNoise: true,
            investigatesCorpses: false,
            investigationDuration: 3,
            canCommand: false,
            commandTypes: [],
            commandCooldown: 0,
            usesAmbush: false,
            usesTraps: false,
            callsReinforcements: false,
            reinforcementCooldown: 0,
            learnsPlayerPatterns: false,
            adaptationRate: 0,
            frustrationThreshold: 8,
            frustrationBehavior: 'flank'
        }
    },

    // =========================================================================
    // TIER 1: ELITE SOLDIER - Veterans who use tactics
    // Checks corners, coordinates attacks
    // =========================================================================
    TIER_1: {
        name: 'Tier 1',
        indicator: 'I',
        color: '#CC4444',
        description: 'Veterans who use tactics and check corners',

        perception: {
            sightRange: 5,
            sightConeAngle: 70,
            canSeeInDark: false,
            peripheralRange: 2,
            hearingRange: 10,
            hearingMultiplier: 1.2,
            deafDuringCombat: false,
            reactionDelay: 100,
            alertnessFalloff: 0.5,
            memoryDuration: 10,
            memoryAccuracy: 0.8
        },

        movement: {
            baseSpeed: 3.5,
            chaseSpeed: 4.0,
            fleeSpeed: 3.0,
            combatSpeed: 3.0,
            strafeMult: 0.8,
            retreatMult: 0.9,
            injuredMult: 0.9,
            wanderPattern: 'patrol',
            wanderRadius: 8,
            pauseChance: 0.2,
            pauseDurationMin: 2000,
            pauseDurationMax: 5000,
            turnChance: 0.2
        },

        combat: {
            windupDuration: 350,
            attackDuration: 500,
            recoveryDuration: 250,
            attackCooldown: 1.8,
            tracksDuringWindup: true,
            trackingCutoff: 80,
            canInterruptAttack: true,
            attackArc: 90,
            chargeDistance: 0,
            knockbackOnHit: 1,
            telegraphColor: '#ff4400',
            telegraphIntensity: 0.7,
            maxAttackersContribution: 1,
            circlingSpeed: 2.5,
            maintainsFormation: true
        },

        defense: {
            fleeThreshold: 0,
            fleeToAlly: false,
            fleeDistance: 0,
            evasionChance: 0.15,
            evasionCooldown: 2000,
            canDodgeAOE: true,
            dodgeDistance: 2,
            baseDamageReduction: 0.1,
            resistances: {
                fire: 0.1, ice: 0.1, nature: 0, death: 0,
                holy: 0, dark: 0, physical: 0.1
            },
            statusResistance: {
                stun: 0.3, slow: 0.2, burn: 0.1,
                poison: 0.1, fear: 0.5, silence: 0.2
            }
        },

        social: {
            canLead: true,
            commandRange: 8,
            commandableBy: ['ELITE', 'BOSS'],
            followDistance: 4,
            followFormation: 'spread',
            packCourage: false,
            packCourageThreshold: 0,
            packCourageBonus: 0,
            isSacrificial: false,
            canSacrificeMinions: false,
            sacrificeThreshold: 0,
            sacrificeHeal: 0,
            sacrificeDamageBuff: 0,
            retreatHierarchy: [],
            shoutRange: 10,
            shoutDelay: 0.8,
            shoutInterruptable: true,
            alertOnDamage: true,
            alertOnDeath: true,
            baseMorale: 80,
            moralePerAllyDeath: 5,
            moralePanicThreshold: 10,
            moraleRecoveryRate: 2
        },

        positioning: {
            preferredRange: 1.5,
            minRange: 0,
            maxRange: 3,
            rangeTolerance: 1.5,
            kitesBehavior: false,
            kiteRetreatRange: 0,
            circlingEnabled: true,
            circlingRadius: 2.5,
            circlingDirection: 'counter',
            prefersFlank: true,
            prefersBackstab: true,
            avoidsAOE: true,
            maintainsLOS: true,
            spreadDistance: 2,
            encirclementParticipant: true
        },

        intelligence: {
            searchBehavior: 'tactical',
            searchDuration: 10,
            searchPattern: 'sweep',
            investigatesNoise: true,
            investigatesCorpses: true,
            investigationDuration: 5,
            canCommand: true,
            commandTypes: ['attack', 'defend', 'hold'],
            commandCooldown: 5,
            usesAmbush: true,
            usesTraps: true,
            callsReinforcements: false,
            reinforcementCooldown: 0,
            learnsPlayerPatterns: false,
            adaptationRate: 0,
            frustrationThreshold: 10,
            frustrationBehavior: 'flank'
        }
    },

    // =========================================================================
    // ELITE: BOSS LIEUTENANT - Cruel commanders
    // Sacrifices minions, commands lower tiers
    // =========================================================================
    ELITE: {
        name: 'Elite',
        indicator: '\u2605', // ★
        color: '#FFD700',
        description: 'Cruel commanders who spend the lives of underlings to survive',

        perception: {
            sightRange: 6,
            sightConeAngle: 80,
            canSeeInDark: true,
            peripheralRange: 3,
            hearingRange: 12,
            hearingMultiplier: 1.5,
            deafDuringCombat: false,
            reactionDelay: 50,
            alertnessFalloff: 0.25,
            memoryDuration: 20,
            memoryAccuracy: 0.95
        },

        movement: {
            baseSpeed: 3.0,
            chaseSpeed: 3.5,
            fleeSpeed: 2.5,
            combatSpeed: 3.0,
            strafeMult: 0.8,
            retreatMult: 0.7,
            injuredMult: 0.8,
            wanderPattern: 'patrol',
            wanderRadius: 10,
            pauseChance: 0.15,
            pauseDurationMin: 3000,
            pauseDurationMax: 6000,
            turnChance: 0.1
        },

        combat: {
            windupDuration: 600,
            attackDuration: 800,
            recoveryDuration: 300,
            attackCooldown: 1.5,
            tracksDuringWindup: true,
            trackingCutoff: 100,
            canInterruptAttack: false,
            attackArc: 120,
            chargeDistance: 2,
            knockbackOnHit: 2,
            telegraphColor: '#ff2222',
            telegraphIntensity: 0.9,
            maxAttackersContribution: 1,
            circlingSpeed: 2.0,
            maintainsFormation: false
        },

        defense: {
            fleeThreshold: 0,
            fleeToAlly: false,
            fleeDistance: 0,
            evasionChance: 0.2,
            evasionCooldown: 1500,
            canDodgeAOE: true,
            dodgeDistance: 2,
            baseDamageReduction: 0.15,
            resistances: {
                fire: 0.2, ice: 0.2, nature: 0.1, death: 0.3,
                holy: -0.1, dark: 0.3, physical: 0.15
            },
            statusResistance: {
                stun: 0.5, slow: 0.4, burn: 0.3,
                poison: 0.3, fear: 0.8, silence: 0.5
            }
        },

        social: {
            canLead: true,
            commandRange: 12,
            commandableBy: ['BOSS'],
            followDistance: 5,
            followFormation: 'none',
            packCourage: false,
            packCourageThreshold: 0,
            packCourageBonus: 0,
            isSacrificial: false,
            canSacrificeMinions: true,
            sacrificeThreshold: 0.3,
            sacrificeHeal: 0.25,
            sacrificeDamageBuff: 0.2,
            retreatHierarchy: [],
            shoutRange: 15,
            shoutDelay: 0.5,
            shoutInterruptable: false,
            alertOnDamage: false,
            alertOnDeath: true,
            baseMorale: 100,
            moralePerAllyDeath: 0,
            moralePanicThreshold: 0,
            moraleRecoveryRate: 0
        },

        positioning: {
            preferredRange: 2,
            minRange: 1,
            maxRange: 4,
            rangeTolerance: 2.0,
            kitesBehavior: false,
            kiteRetreatRange: 0,
            circlingEnabled: false,
            circlingRadius: 0,
            circlingDirection: 'random',
            prefersFlank: false,
            prefersBackstab: false,
            avoidsAOE: true,
            maintainsLOS: true,
            spreadDistance: 3,
            encirclementParticipant: false
        },

        intelligence: {
            searchBehavior: 'aggressive',
            searchDuration: 20,
            searchPattern: 'spiral',
            investigatesNoise: true,
            investigatesCorpses: true,
            investigationDuration: 2,
            canCommand: true,
            commandTypes: ['attack', 'defend', 'retreat', 'hold'],
            commandCooldown: 3,
            usesAmbush: true,
            usesTraps: true,
            callsReinforcements: true,
            reinforcementCooldown: 30,
            learnsPlayerPatterns: true,
            adaptationRate: 0.3,
            frustrationThreshold: 15,
            frustrationBehavior: 'callHelp'
        }
    },

    // =========================================================================
    // BOSS: FLOOR BOSS - Ancient horrors
    // Phase-based, special mechanics
    // =========================================================================
    BOSS: {
        name: 'Boss',
        indicator: '\u2606', // ☆
        color: '#FF4444',
        description: 'Ancient horrors that command absolute fear',

        perception: {
            sightRange: 10,
            sightConeAngle: 120,
            canSeeInDark: true,
            peripheralRange: 5,
            hearingRange: 15,
            hearingMultiplier: 2.0,
            deafDuringCombat: false,
            reactionDelay: 0,
            alertnessFalloff: 0,
            memoryDuration: 60,
            memoryAccuracy: 1.0
        },

        movement: {
            baseSpeed: 2.5,
            chaseSpeed: 3.5,
            fleeSpeed: 0,
            combatSpeed: 3.0,
            strafeMult: 0.7,
            retreatMult: 0,
            injuredMult: 1.2,
            wanderPattern: 'stationary',
            wanderRadius: 0,
            pauseChance: 0,
            pauseDurationMin: 0,
            pauseDurationMax: 0,
            turnChance: 0
        },

        combat: {
            windupDuration: 800,
            attackDuration: 1000,
            recoveryDuration: 500,
            attackCooldown: 1.2,
            tracksDuringWindup: true,
            trackingCutoff: 150,
            canInterruptAttack: false,
            attackArc: 180,
            chargeDistance: 4,
            knockbackOnHit: 3,
            telegraphColor: '#ff0000',
            telegraphIntensity: 1.0,
            maxAttackersContribution: 1,
            circlingSpeed: 0,
            maintainsFormation: false
        },

        defense: {
            fleeThreshold: 0,
            fleeToAlly: false,
            fleeDistance: 0,
            evasionChance: 0.1,
            evasionCooldown: 2000,
            canDodgeAOE: false,
            dodgeDistance: 2,
            baseDamageReduction: 0.25,
            resistances: {
                fire: 0.3, ice: 0.3, nature: 0.2, death: 0.5,
                holy: -0.2, dark: 0.5, physical: 0.25
            },
            statusResistance: {
                stun: 0.8, slow: 0.6, burn: 0.5,
                poison: 0.5, fear: 1.0, silence: 0.8
            }
        },

        social: {
            canLead: true,
            commandRange: 20,
            commandableBy: [],
            followDistance: 0,
            followFormation: 'none',
            packCourage: false,
            packCourageThreshold: 0,
            packCourageBonus: 0,
            isSacrificial: false,
            canSacrificeMinions: true,
            sacrificeThreshold: 0.4,
            sacrificeHeal: 0.30,
            sacrificeDamageBuff: 0.3,
            retreatHierarchy: [],
            shoutRange: 20,
            shoutDelay: 0.3,
            shoutInterruptable: false,
            alertOnDamage: false,
            alertOnDeath: false,
            baseMorale: 100,
            moralePerAllyDeath: 0,
            moralePanicThreshold: 0,
            moraleRecoveryRate: 0
        },

        positioning: {
            preferredRange: 2,
            minRange: 0,
            maxRange: 5,
            rangeTolerance: 2.5,
            kitesBehavior: false,
            kiteRetreatRange: 0,
            circlingEnabled: false,
            circlingRadius: 0,
            circlingDirection: 'random',
            prefersFlank: false,
            prefersBackstab: false,
            avoidsAOE: false,
            maintainsLOS: true,
            spreadDistance: 0,
            encirclementParticipant: false
        },

        intelligence: {
            searchBehavior: 'aggressive',
            searchDuration: 60,
            searchPattern: 'spiral',
            investigatesNoise: true,
            investigatesCorpses: false,
            investigationDuration: 1,
            canCommand: true,
            commandTypes: ['attack', 'defend', 'retreat', 'hold'],
            commandCooldown: 2,
            usesAmbush: false,
            usesTraps: true,
            callsReinforcements: true,
            reinforcementCooldown: 20,
            learnsPlayerPatterns: true,
            adaptationRate: 0.5,
            frustrationThreshold: 20,
            frustrationBehavior: 'berserk'
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
    'Void Touched': 'ELITE',
    // Ice/Frost (added - previously missing)
    'Frozen Husk': 'TIER_3',
    'Blizzard Spirit': 'ELITE',
    'Frost Elemental': 'TIER_3',
    'Ice Golem': 'TIER_3',
    // Fire (added - previously missing)
    'Flame Sprite': 'TIER_2'
};

// ============================================================
// MONSTER-SPECIFIC AI OVERRIDES
// ============================================================

const MONSTER_AI_OVERRIDES = {
    'Magma Slime': {
        movement: { turnChance: 0.5 }
    },
    'Flame Bat': {
        defense: { fleeThreshold: 0.4 },
        combat: { attackCooldown: 1.5 }
    },
    'Cave Bat': {
        defense: { fleeThreshold: 0.5 },
        combat: { attackCooldown: 1.2 }
    },
    'Cinder Wisp': {
        positioning: { preferredRange: 4, kitesBehavior: true }
    },
    'Ash Walker': {
        perception: { canSeeInDark: true }
    },
    'Pyro Cultist': {
        positioning: { preferredRange: 5, kitesBehavior: true }
    },
    'Shadow Stalker': {
        perception: { canSeeInDark: true },
        combat: { attackCooldown: 1.0 }
    },
    'Phantom': {
        perception: { canSeeInDark: true },
        positioning: { preferredRange: 3, kitesBehavior: true }
    },
    'Crystal Spider': {
        combat: { attackCooldown: 1.3 }
    },
    'Obsidian Golem': {
        movement: { pauseChance: 0.4 },
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
        movement: { pauseChance: 0.35 },
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
        perception: { canSeeInDark: true },
        positioning: { preferredRange: 4, kitesBehavior: true },
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

// Cache for merged configs
const _aiConfigCache = new Map();

function getMonsterTierId(monsterName) {
    return MONSTER_TIER_MAP[monsterName] || 'TIER_2';
}

function getMonsterTierConfig(monsterName) {
    const tierId = getMonsterTierId(monsterName);
    return MONSTER_TIERS[tierId];
}

/**
 * Deep merge helper - merges override into base
 */
function deepMerge(base, override) {
    if (!override) return { ...base };
    const result = { ...base };
    for (const key of Object.keys(override)) {
        if (override[key] !== undefined && override[key] !== null) {
            if (typeof override[key] === 'object' && !Array.isArray(override[key])) {
                result[key] = deepMerge(base[key] || {}, override[key]);
            } else {
                result[key] = override[key];
            }
        }
    }
    return result;
}

/**
 * Get fully merged AI config for a monster
 * Combines tier defaults with monster-specific overrides
 */
function getMonsterAIConfig(monsterName) {
    // Return cached if available
    if (_aiConfigCache.has(monsterName)) {
        return _aiConfigCache.get(monsterName);
    }

    const tierId = getMonsterTierId(monsterName);
    const tierConfig = MONSTER_TIERS[tierId];
    const overrides = MONSTER_AI_OVERRIDES[monsterName] || {};

    // Build merged config
    const config = {
        tierId,
        tierName: tierConfig.name,
        tierIndicator: tierConfig.indicator,
        tierColor: tierConfig.color,

        // Merge each category
        perception: deepMerge(tierConfig.perception, overrides.perception),
        movement: deepMerge(tierConfig.movement, overrides.movement),
        combat: deepMerge(tierConfig.combat, overrides.combat),
        defense: deepMerge(tierConfig.defense, overrides.defense),
        social: deepMerge(tierConfig.social, overrides.social),
        positioning: deepMerge(tierConfig.positioning, overrides.positioning),
        intelligence: deepMerge(tierConfig.intelligence, overrides.intelligence),

        // Special attack if defined
        specialAttack: overrides.specialAttack || null
    };

    _aiConfigCache.set(monsterName, config);
    return config;
}

/**
 * Build combat-specific config (for damage calculations)
 */
function buildCombatConfig(monsterName) {
    const monsterData = typeof MONSTER_DATA !== 'undefined' ? MONSTER_DATA[monsterName] : null;
    if (!monsterData) {
        console.warn(`[Tiers] Unknown monster for combat config: ${monsterName}`);
        return null;
    }

    const aiConfig = getMonsterAIConfig(monsterName);
    const scalingStat = monsterData.attackType === 'magic' ? 'int' : 'str';
    const primaryStat = monsterData.attackType === 'magic' ? monsterData.int : monsterData.str;
    const baseDamage = Math.floor(8 + (primaryStat * 0.5));
    const attackRange = monsterData.attackRange || (monsterData.attackType === 'magic' ? 5 : 1);

    return {
        attackRange,
        attackSpeed: monsterData.attackSpeed || 2.0,
        baseDamage,
        scalingStat,
        attackName: monsterData.attack,
        windupDuration: aiConfig.combat.windupDuration,
        attackCooldown: aiConfig.combat.attackCooldown,
        tracksDuringWindup: aiConfig.combat.tracksDuringWindup,
        trackingCutoff: aiConfig.combat.trackingCutoff,
        canInterruptAttack: aiConfig.combat.canInterruptAttack,
        attackArc: aiConfig.combat.attackArc,
        telegraphColor: aiConfig.combat.telegraphColor,
        special: aiConfig.specialAttack
    };
}

/**
 * Clear config cache (call when tiers are modified at runtime)
 */
function clearTierCache() {
    _aiConfigCache.clear();
}

// ============================================================
// FLOOR-BASED STAT SCALING - DISABLED
// ============================================================
// Per equipment-loot-implementation.md spec:
// Monster stats are now fixed per-tier and NOT modified by floor number.
// The spawn composition tables (which tiers appear at which depth) are preserved.
// Only the stat SCALING is removed.

const FLOOR_SCALING = null; // DISABLED - stats are fixed per-tier

/**
 * applyTierMultipliers - DISABLED
 * Previously scaled monster stats based on floor number.
 * Now returns base stats unchanged (stats are fixed per-tier).
 * Function signature preserved for backwards compatibility.
 */
function applyTierMultipliers(baseStats, monsterName, floor = 1) {
    // Return base stats unchanged - no floor-based scaling
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
        level: floor  // Still track floor as level for display purposes
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
window.buildCombatConfig = buildCombatConfig;
window.clearTierCache = clearTierCache;
window.applyTierMultipliers = applyTierMultipliers;
window.deepMerge = deepMerge;

console.log('[MonsterTiers] Loaded', Object.keys(MONSTER_TIERS).length, 'tiers with 7-category system');
