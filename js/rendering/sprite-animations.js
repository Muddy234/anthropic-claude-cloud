// ============================================================================
// SPRITE ANIMATIONS - Delta-Based Animation System for Monster Sprites
// ============================================================================
// Defines animation frames using pixel deltas from base sprites.
// Monsters share animations by attack type for consistency and maintainability.
// ============================================================================

// ============================================================================
// ANIMATION TYPE CONSTANTS
// ============================================================================
// Categories of attack animations shared by monsters with similar attack styles

const ANIMATION_TYPES = {
    MELEE_SLAM: 'MELEE_SLAM',       // Slimes, golems - body contracts then expands
    MELEE_SLASH: 'MELEE_SLASH',     // Humanoids with weapons - arm/weapon swing arc
    MELEE_BITE: 'MELEE_BITE',       // Beasts - lunging forward bite
    RANGED_MAGIC: 'RANGED_MAGIC',   // Casters - gather energy, release projectile
    RANGED_PROJECTILE: 'RANGED_PROJECTILE'  // Archers - draw, hold, release (future)
};

// ============================================================================
// ANIMATION PHASE CONSTANTS
// ============================================================================
// Standard phases for all combat animations

const ANIMATION_PHASES = {
    IDLE: 'IDLE',           // Resting state, looping
    WINDUP: 'WINDUP',       // Preparing attack (dodge window)
    STRIKE: 'STRIKE',       // Active damage frame
    RECOVERY: 'RECOVERY',   // Returning to idle
    DEATH: 'DEATH'          // Death animation (non-looping)
};

// ============================================================================
// MONSTER ANIMATION CONFIG
// ============================================================================
// Maps each monster sprite to their animation types

const MONSTER_ANIMATION_CONFIG = {
    // === VOLCANIC MONSTERS ===
    'magma_slime': {
        attack: ANIMATION_TYPES.MELEE_SLAM,
        idle: 'breathing',
        death: 'dissolve'
    },
    'obsidian_golem': {
        attack: ANIMATION_TYPES.MELEE_SLAM,
        idle: 'breathing',
        death: 'crumble'
    },
    'cinder_wisp': {
        attack: ANIMATION_TYPES.RANGED_MAGIC,
        idle: 'floating',
        death: 'fade'
    },
    'flame_bat': {
        attack: ANIMATION_TYPES.MELEE_BITE,
        idle: 'floating',
        death: 'fade'
    },
    'ash_walker': {
        attack: ANIMATION_TYPES.MELEE_SLASH,
        idle: 'breathing',
        death: 'collapse'
    },
    'salamander': {
        attack: ANIMATION_TYPES.MELEE_BITE,
        idle: 'breathing',
        death: 'collapse'
    },
    'pyro_cultist': {
        attack: ANIMATION_TYPES.RANGED_MAGIC,
        idle: 'breathing',
        death: 'collapse'
    },
    'flame_sprite': {
        attack: ANIMATION_TYPES.MELEE_SLAM,
        idle: 'pulsing',
        death: 'fade'
    },

    // === CAVE MONSTERS ===
    'cave_bat': {
        attack: ANIMATION_TYPES.MELEE_BITE,
        idle: 'floating',
        death: 'collapse'
    },
    'stone_lurker': {
        attack: ANIMATION_TYPES.MELEE_SLAM,
        idle: 'breathing',
        death: 'crumble'
    },
    'mushroom_sprite': {
        attack: ANIMATION_TYPES.RANGED_MAGIC,
        idle: 'breathing',
        death: 'dissolve'
    },
    'crystal_spider': {
        attack: ANIMATION_TYPES.MELEE_BITE,
        idle: 'breathing',
        death: 'crumble'
    },

    // === UNDEAD MONSTERS ===
    'skeletal_warrior': {
        attack: ANIMATION_TYPES.MELEE_SLASH,
        idle: 'breathing',
        death: 'collapse'
    },
    'phantom': {
        attack: ANIMATION_TYPES.RANGED_MAGIC,
        idle: 'floating',
        death: 'fade'
    },
    'bone_golem': {
        attack: ANIMATION_TYPES.MELEE_SLAM,
        idle: 'breathing',
        death: 'crumble'
    },
    'frozen_husk': {
        attack: ANIMATION_TYPES.MELEE_SLASH,
        idle: 'breathing',
        death: 'crumble'
    },

    // === AQUATIC MONSTERS ===
    'deep_crawler': {
        attack: ANIMATION_TYPES.MELEE_BITE,
        idle: 'breathing',
        death: 'collapse'
    },
    'tide_serpent': {
        attack: ANIMATION_TYPES.MELEE_BITE,
        idle: 'breathing',
        death: 'collapse'
    },

    // === SHADOW MONSTERS ===
    'shadow_stalker': {
        attack: ANIMATION_TYPES.MELEE_SLASH,
        idle: 'breathing',
        death: 'fade'
    },
    'void_touched': {
        attack: ANIMATION_TYPES.RANGED_MAGIC,
        idle: 'pulsing',
        death: 'fade'
    },
    'shadow_imp': {
        attack: ANIMATION_TYPES.MELEE_SLASH,
        idle: 'floating',
        death: 'fade'
    },

    // === ICE MONSTERS ===
    'ice_slime': {
        attack: ANIMATION_TYPES.MELEE_SLAM,
        idle: 'breathing',
        death: 'dissolve'
    },
    'frost_elemental': {
        attack: ANIMATION_TYPES.RANGED_MAGIC,
        idle: 'floating',
        death: 'fade'
    },
    'ice_golem': {
        attack: ANIMATION_TYPES.MELEE_SLAM,
        idle: 'breathing',
        death: 'crumble'
    },
    'blizzard_spirit': {
        attack: ANIMATION_TYPES.RANGED_MAGIC,
        idle: 'floating',
        death: 'fade'
    },

    // === COMBAT VARIETY ENEMIES ===
    'temple_sentinel': {
        attack: ANIMATION_TYPES.MELEE_SLAM,
        idle: 'breathing',
        death: 'crumble'
    },
    'stone_guardian': {
        attack: ANIMATION_TYPES.MELEE_SLAM,
        idle: 'breathing',
        death: 'crumble'
    },
    'demon_knight': {
        attack: ANIMATION_TYPES.MELEE_SLASH,
        idle: 'breathing',
        death: 'collapse'
    },
    'giant_spider': {
        attack: ANIMATION_TYPES.MELEE_BITE,
        idle: 'breathing',
        death: 'collapse'
    },
    'shield_bearer': {
        attack: ANIMATION_TYPES.MELEE_SLASH,
        idle: 'breathing',
        death: 'collapse'
    }
};

// ============================================================================
// ATTACK ANIMATIONS
// ============================================================================
// Frame definitions using delta-based pixel modifications
// Total windup: ~300-400ms, Strike: ~100ms, Recovery: ~200ms

const ATTACK_ANIMATIONS = {

    // ========================================================================
    // MELEE_SLAM - Body contracts upward, then rapidly expands/slams down
    // Used by: slimes, golems, large creatures
    // ========================================================================
    [ANIMATION_TYPES.MELEE_SLAM]: {
        windup: [
            // Frame 1: Body begins contracting upward
            {
                duration: 65,
                verticalOffset: -1,
                scaleY: 0.95,
                deltas: {
                    // Bottom rows pull up (for 16px sprites)
                    10: { 3: '.', 4: '.', 11: '.', 12: '.' },
                    11: { 2: '.', 3: '.', 12: '.', 13: '.' }
                },
                description: 'Body begins contracting upward'
            },
            // Frame 2: Further contraction, gathering energy
            {
                duration: 65,
                verticalOffset: -2,
                scaleY: 0.90,
                deltas: {
                    9: { 2: '.', 13: '.' },
                    10: { 2: '.', 3: '.', 4: '.', 11: '.', 12: '.', 13: '.' },
                    11: { 1: '.', 2: '.', 3: '.', 12: '.', 13: '.', 14: '.' },
                    12: { 3: '.', 4: '.', 10: '.', 11: '.' }
                },
                description: 'Further contraction, body compressed'
            },
            // Frame 3: Maximum contraction, about to release
            {
                duration: 65,
                verticalOffset: -3,
                scaleY: 0.85,
                paletteMod: { brightness: 1.1 },
                deltas: {
                    8: { 2: '.', 13: '.' },
                    9: { 1: '.', 2: '.', 13: '.', 14: '.' },
                    10: { 1: '.', 2: '.', 3: '.', 4: '.', 11: '.', 12: '.', 13: '.', 14: '.' },
                    11: { 0: '.', 1: '.', 2: '.', 13: '.', 14: '.', 15: '.' },
                    12: { 2: '.', 3: '.', 4: '.', 5: '.', 10: '.', 11: '.', 12: '.', 13: '.' }
                },
                description: 'Maximum contraction, energy gathered'
            },
            // Frame 4: Tension peak - slight tremor
            {
                duration: 65,
                verticalOffset: -3,
                scaleY: 0.85,
                scaleX: 1.02,
                paletteMod: { brightness: 1.15 },
                deltas: {
                    8: { 2: '.', 13: '.' },
                    9: { 1: '.', 2: '.', 13: '.', 14: '.' },
                    10: { 1: '.', 2: '.', 3: '.', 4: '.', 11: '.', 12: '.', 13: '.', 14: '.' },
                    11: { 0: '.', 1: '.', 2: '.', 13: '.', 14: '.', 15: '.' },
                    12: { 2: '.', 3: '.', 4: '.', 5: '.', 10: '.', 11: '.', 12: '.', 13: '.' }
                },
                description: 'Tension peak with tremor'
            },
            // Frame 5: Beginning descent
            {
                duration: 40,
                verticalOffset: -2,
                scaleY: 0.92,
                paletteMod: { brightness: 1.2 },
                deltas: {
                    9: { 2: '.', 13: '.' },
                    10: { 2: '.', 3: '.', 12: '.', 13: '.' }
                },
                description: 'Beginning rapid descent'
            },
            // Frame 6: Accelerating
            {
                duration: 30,
                verticalOffset: -1,
                scaleY: 0.98,
                paletteMod: { brightness: 1.25 },
                deltas: {},
                description: 'Accelerating toward impact'
            }
        ],
        strike: [
            // Frame 1: Impact - maximum extension
            {
                duration: 35,
                verticalOffset: 2,
                scaleY: 1.15,
                scaleX: 1.2,
                paletteMod: { brightness: 1.3 },
                deltas: {
                    // Body spreads out on impact
                    9: { 1: 'O', 14: 'O' },
                    10: { 0: 'O', 15: 'O' },
                    11: { 0: 'R', 15: 'R' },
                    12: { 0: 'R', 1: 'R', 14: 'R', 15: 'R' }
                },
                description: 'Impact - body fully extended'
            },
            // Frame 2: Shockwave ripple
            {
                duration: 35,
                verticalOffset: 1,
                scaleY: 1.12,
                scaleX: 1.15,
                paletteMod: { brightness: 1.2 },
                deltas: {
                    10: { 0: 'O', 1: 'O', 14: 'O', 15: 'O' },
                    11: { 0: 'R', 15: 'R' },
                    12: { 1: 'R', 14: 'R' }
                },
                description: 'Shockwave ripple'
            },
            // Frame 3: Impact settling
            {
                duration: 30,
                verticalOffset: 1,
                scaleY: 1.08,
                scaleX: 1.08,
                deltas: {
                    11: { 1: 'R', 14: 'R' }
                },
                description: 'Impact settling'
            }
        ],
        recovery: [
            // Frame 1: Beginning to return
            {
                duration: 50,
                verticalOffset: 0,
                scaleY: 1.04,
                scaleX: 1.04,
                deltas: {},
                description: 'Beginning recovery'
            },
            // Frame 2: Slight bounce back
            {
                duration: 50,
                verticalOffset: -1,
                scaleY: 0.98,
                deltas: {},
                description: 'Slight bounce back'
            },
            // Frame 3: Nearly returned
            {
                duration: 50,
                verticalOffset: 0,
                scaleY: 1.02,
                deltas: {},
                description: 'Nearly returned'
            },
            // Frame 4: Settling
            {
                duration: 30,
                verticalOffset: 0,
                scaleY: 1.01,
                deltas: {},
                description: 'Settling to rest'
            },
            // Frame 5: Final settle
            {
                duration: 20,
                verticalOffset: 0,
                scaleY: 1.0,
                deltas: {},
                description: 'Return to base position'
            }
        ]
    },

    // ========================================================================
    // MELEE_SLASH - Arm/weapon swings in arc from back to front
    // Used by: skeletal warriors, humanoids, cultists
    // ========================================================================
    [ANIMATION_TYPES.MELEE_SLASH]: {
        windup: [
            // Frame 1: Weapon arm pulls back
            {
                duration: 55,
                deltas: {
                    // Weapon moves back (assuming weapon on left side)
                    8: { 2: '.', 1: 'W' },
                    9: { 2: '.', 1: 'W', 0: 'W' }
                },
                description: 'Weapon arm pulls back'
            },
            // Frame 2: Wind up continues, body rotates
            {
                duration: 55,
                deltas: {
                    7: { 0: 'W', 1: 'W' },
                    8: { 0: 'W', 1: 'W', 2: '.' },
                    9: { 1: '.', 2: '.' }
                },
                description: 'Full wind up, weapon raised'
            },
            // Frame 3: Peak of backswing
            {
                duration: 50,
                paletteMod: { brightness: 1.05 },
                deltas: {
                    6: { 0: 'W', 1: 'W' },
                    7: { 0: 'W', 1: 'W' },
                    8: { 0: 'W', 1: '.', 2: '.' },
                    9: { 0: '.', 1: '.', 2: '.' }
                },
                description: 'Peak of backswing'
            },
            // Frame 4: Tension before swing
            {
                duration: 45,
                paletteMod: { brightness: 1.1 },
                deltas: {
                    5: { 0: 'W' },
                    6: { 0: 'W', 1: 'W' },
                    7: { 0: 'W', 1: 'W' },
                    8: { 0: '.', 1: '.', 2: '.' },
                    9: { 0: '.', 1: '.', 2: '.' }
                },
                description: 'Tension before swing'
            },
            // Frame 5: Starting forward motion
            {
                duration: 35,
                paletteMod: { brightness: 1.15 },
                deltas: {
                    5: { 1: 'W' },
                    6: { 0: 'W', 1: 'W', 2: 'W' },
                    7: { 1: 'W', 2: 'W' },
                    8: { 2: '.', 3: '.' }
                },
                description: 'Starting forward swing'
            },
            // Frame 6: Accelerating
            {
                duration: 25,
                paletteMod: { brightness: 1.2 },
                deltas: {
                    6: { 2: 'W', 3: 'W' },
                    7: { 2: 'W', 3: 'W', 4: 'W' },
                    8: { 3: 'W', 4: 'W' }
                },
                description: 'Accelerating swing'
            }
        ],
        strike: [
            // Frame 1: Weapon at mid-swing (damage frame)
            {
                duration: 35,
                paletteMod: { brightness: 1.3 },
                deltas: {
                    7: { 6: 'W', 7: 'W', 8: 'W', 9: 'W' },
                    8: { 7: 'W', 8: 'W', 9: 'W', 10: 'W' },
                    9: { 8: 'W', 9: 'W', 10: 'W', 11: 'W' }
                },
                description: 'Weapon slashing through'
            },
            // Frame 2: Follow through
            {
                duration: 35,
                paletteMod: { brightness: 1.2 },
                deltas: {
                    8: { 10: 'W', 11: 'W', 12: 'W' },
                    9: { 11: 'W', 12: 'W', 13: 'W' },
                    10: { 12: 'W', 13: 'W', 14: 'W' }
                },
                description: 'Slash follow-through'
            },
            // Frame 3: End of swing arc
            {
                duration: 30,
                deltas: {
                    9: { 13: 'W', 14: 'W' },
                    10: { 14: 'W', 15: 'W' },
                    11: { 14: 'W', 15: 'W' }
                },
                description: 'End of swing arc'
            }
        ],
        recovery: [
            // Frame 1: Weapon extended, beginning return
            {
                duration: 40,
                deltas: {
                    10: { 13: 'W', 14: 'W' },
                    11: { 12: 'W', 13: 'W' }
                },
                description: 'Beginning weapon return'
            },
            // Frame 2: Weapon coming back
            {
                duration: 40,
                deltas: {
                    9: { 10: 'W', 11: 'W' },
                    10: { 9: 'W', 10: 'W' }
                },
                description: 'Weapon returning'
            },
            // Frame 3: Weapon mid-return
            {
                duration: 40,
                deltas: {
                    8: { 5: 'W', 6: 'W' },
                    9: { 4: 'W', 5: 'W' }
                },
                description: 'Weapon mid-return'
            },
            // Frame 4: Weapon nearly reset
            {
                duration: 40,
                deltas: {
                    8: { 2: 'W', 3: 'W' },
                    9: { 2: 'W', 3: 'W' }
                },
                description: 'Weapon nearly reset'
            },
            // Frame 5: Return to idle
            {
                duration: 40,
                deltas: {},
                description: 'Return to idle stance'
            }
        ]
    },

    // ========================================================================
    // MELEE_BITE - Lunges forward with open jaws, snaps shut
    // Used by: beasts, bats, spiders, serpents
    // ========================================================================
    [ANIMATION_TYPES.MELEE_BITE]: {
        windup: [
            // Frame 1: Coiling back
            {
                duration: 50,
                horizontalOffset: -1,
                deltas: {
                    // Body shifts back slightly
                },
                description: 'Coiling back'
            },
            // Frame 2: Jaw opening
            {
                duration: 50,
                horizontalOffset: -2,
                deltas: {
                    // Jaw opens (top row moves up, bottom row moves down)
                    3: { 4: 'T', 5: 'T', 6: 'T' },  // T = teeth/jaw top
                    4: { 4: '.', 5: '.', 6: '.' },
                    6: { 4: '.', 5: '.', 6: '.' },
                    7: { 4: 'J', 5: 'J', 6: 'J' }   // J = jaw bottom
                },
                description: 'Jaw opening wide'
            },
            // Frame 3: Maximum coil
            {
                duration: 50,
                horizontalOffset: -3,
                paletteMod: { brightness: 1.05 },
                deltas: {
                    2: { 4: 'T', 5: 'T', 6: 'T' },
                    3: { 3: 'T', 4: '.', 5: '.', 6: '.', 7: 'T' },
                    4: { 3: '.', 4: '.', 5: '.', 6: '.', 7: '.' },
                    6: { 3: '.', 4: '.', 5: '.', 6: '.', 7: '.' },
                    7: { 3: 'J', 4: '.', 5: '.', 6: '.', 7: 'J' },
                    8: { 4: 'J', 5: 'J', 6: 'J' }
                },
                description: 'Maximum coil, jaw fully open'
            },
            // Frame 4: About to strike
            {
                duration: 45,
                horizontalOffset: -2,
                paletteMod: { brightness: 1.1 },
                deltas: {
                    2: { 4: 'T', 5: 'T', 6: 'T' },
                    3: { 3: 'T', 7: 'T' },
                    7: { 3: 'J', 7: 'J' },
                    8: { 4: 'J', 5: 'J', 6: 'J' }
                },
                description: 'Coiled tension'
            },
            // Frame 5: Launching
            {
                duration: 35,
                horizontalOffset: 0,
                paletteMod: { brightness: 1.15 },
                deltas: {
                    3: { 3: 'T', 7: 'T' },
                    7: { 3: 'J', 7: 'J' }
                },
                description: 'Launching forward'
            },
            // Frame 6: Full lunge
            {
                duration: 30,
                horizontalOffset: 2,
                paletteMod: { brightness: 1.2 },
                deltas: {
                    3: { 8: 'T', 9: 'T' },
                    7: { 8: 'J', 9: 'J' }
                },
                description: 'Full lunge forward'
            }
        ],
        strike: [
            // Frame 1: Jaw snapping - contact
            {
                duration: 35,
                horizontalOffset: 4,
                paletteMod: { brightness: 1.3 },
                deltas: {
                    4: { 9: 'T', 10: 'T', 11: 'T' },
                    5: { 10: 'X', 11: 'X' },  // X = bite impact
                    6: { 9: 'J', 10: 'J', 11: 'J' }
                },
                description: 'Jaw snapping shut - BITE'
            },
            // Frame 2: Jaw clamped
            {
                duration: 35,
                horizontalOffset: 3,
                paletteMod: { brightness: 1.15 },
                deltas: {
                    5: { 9: 'X', 10: 'X' }
                },
                description: 'Jaw clamped on target'
            },
            // Frame 3: Beginning release
            {
                duration: 30,
                horizontalOffset: 2,
                deltas: {},
                description: 'Beginning to release'
            }
        ],
        recovery: [
            // Frame 1: Recoiling
            {
                duration: 40,
                horizontalOffset: 1,
                deltas: {},
                description: 'Recoiling from bite'
            },
            // Frame 2: Moving back
            {
                duration: 40,
                horizontalOffset: 0,
                deltas: {},
                description: 'Moving back to position'
            },
            // Frame 3: Nearly reset
            {
                duration: 40,
                horizontalOffset: -1,
                deltas: {},
                description: 'Nearly reset'
            },
            // Frame 4: Final settle
            {
                duration: 40,
                horizontalOffset: 0,
                deltas: {},
                description: 'Settling to idle'
            },
            // Frame 5: Idle
            {
                duration: 40,
                horizontalOffset: 0,
                deltas: {},
                description: 'Return to idle stance'
            }
        ]
    },

    // ========================================================================
    // RANGED_MAGIC - Gathers energy, releases magical projectile
    // Used by: wisps, phantoms, cultists, elementals
    // ========================================================================
    [ANIMATION_TYPES.RANGED_MAGIC]: {
        windup: [
            // Frame 1: Energy begins gathering
            {
                duration: 55,
                paletteMod: { brightness: 1.05 },
                deltas: {
                    // Energy particles appear around body
                    3: { 2: 'E' },
                    5: { 12: 'E' }
                },
                description: 'Energy begins gathering'
            },
            // Frame 2: More energy coalescing
            {
                duration: 55,
                paletteMod: { brightness: 1.1 },
                deltas: {
                    2: { 4: 'E', 5: 'E' },
                    3: { 2: 'E', 3: 'E', 11: 'E', 12: 'E' },
                    4: { 1: 'E', 13: 'E' },
                    6: { 1: 'E', 13: 'E' },
                    7: { 3: 'E', 11: 'E' }
                },
                description: 'Energy coalescing around caster'
            },
            // Frame 3: Energy concentrating toward center
            {
                duration: 50,
                paletteMod: { brightness: 1.15 },
                deltas: {
                    3: { 5: 'E', 6: 'E', 8: 'E', 9: 'E' },
                    4: { 4: 'E', 10: 'E' },
                    5: { 3: 'E', 4: 'E', 10: 'E', 11: 'E' },
                    6: { 4: 'E', 10: 'E' }
                },
                description: 'Energy concentrating'
            },
            // Frame 4: Power building
            {
                duration: 50,
                paletteMod: { brightness: 1.2 },
                scaleY: 1.02,
                deltas: {
                    4: { 6: 'E', 7: 'E', 8: 'E' },
                    5: { 5: 'E', 6: 'M', 7: 'M', 8: 'M', 9: 'E' },  // M = magic orb forming
                    6: { 6: 'E', 7: 'E', 8: 'E' }
                },
                description: 'Power building at focus point'
            },
            // Frame 5: About to release
            {
                duration: 45,
                paletteMod: { brightness: 1.3 },
                scaleY: 1.03,
                deltas: {
                    4: { 5: 'E', 6: 'M', 7: 'M', 8: 'M', 9: 'E' },
                    5: { 4: 'E', 5: 'M', 6: 'M', 7: 'M', 8: 'M', 9: 'M', 10: 'E' },
                    6: { 5: 'E', 6: 'M', 7: 'M', 8: 'M', 9: 'E' }
                },
                description: 'Magic orb fully formed'
            },
            // Frame 6: Release initiation
            {
                duration: 30,
                paletteMod: { brightness: 1.35 },
                deltas: {
                    5: { 8: 'M', 9: 'M', 10: 'M', 11: 'E' }
                },
                description: 'Releasing projectile'
            }
        ],
        strike: [
            // Frame 1: Projectile launched
            {
                duration: 35,
                paletteMod: { brightness: 1.4 },
                deltas: {
                    5: { 10: 'M', 11: 'M', 12: 'M', 13: 'E', 14: 'E' }
                },
                description: 'Projectile launching'
            },
            // Frame 2: Projectile in flight
            {
                duration: 35,
                paletteMod: { brightness: 1.25 },
                deltas: {
                    5: { 12: 'E', 13: 'M', 14: 'M', 15: 'M' }
                },
                description: 'Projectile in flight'
            },
            // Frame 3: Impact (projectile leaves sprite area)
            {
                duration: 30,
                paletteMod: { brightness: 1.1 },
                deltas: {},
                description: 'Projectile released'
            }
        ],
        recovery: [
            // Frame 1: Recoil from cast
            {
                duration: 45,
                paletteMod: { brightness: 1.05 },
                deltas: {
                    4: { 2: 'E', 3: 'E' },  // Residual energy
                    6: { 2: 'E', 3: 'E' }
                },
                description: 'Recoil from casting'
            },
            // Frame 2: Energy dissipating
            {
                duration: 45,
                deltas: {
                    3: { 3: 'E' },
                    7: { 3: 'E' }
                },
                description: 'Residual energy dissipating'
            },
            // Frame 3: Nearly recovered
            {
                duration: 40,
                deltas: {},
                description: 'Nearly recovered'
            },
            // Frame 4: Final recovery
            {
                duration: 35,
                deltas: {},
                description: 'Recovering mana'
            },
            // Frame 5: Return to idle
            {
                duration: 35,
                deltas: {},
                description: 'Return to idle stance'
            }
        ]
    },

    // ========================================================================
    // RANGED_PROJECTILE - Draw bow, hold, release arrow (future implementation)
    // Used by: archers
    // ========================================================================
    [ANIMATION_TYPES.RANGED_PROJECTILE]: {
        windup: [
            // Frame 1: Reaching for arrow
            {
                duration: 50,
                deltas: {
                    6: { 12: 'A' }  // A = arrow
                },
                description: 'Reaching for arrow'
            },
            // Frame 2: Nocking arrow
            {
                duration: 55,
                deltas: {
                    6: { 8: 'A', 9: 'A' },
                    7: { 9: 'B', 10: 'B' }  // B = bow
                },
                description: 'Nocking arrow to bow'
            },
            // Frame 3: Drawing back
            {
                duration: 60,
                deltas: {
                    5: { 5: 'A', 6: 'A', 7: 'A' },
                    6: { 4: 'A', 5: 'A' },
                    7: { 9: 'B', 10: 'B', 11: 'B' }
                },
                description: 'Drawing bow back'
            },
            // Frame 4: Full draw
            {
                duration: 55,
                paletteMod: { brightness: 1.05 },
                deltas: {
                    4: { 3: 'A', 4: 'A', 5: 'A' },
                    5: { 2: 'A', 3: 'A', 4: 'A' },
                    7: { 10: 'B', 11: 'B', 12: 'B' }
                },
                description: 'Full draw, aiming'
            },
            // Frame 5: Holding aim
            {
                duration: 50,
                paletteMod: { brightness: 1.1 },
                deltas: {
                    4: { 2: 'A', 3: 'A', 4: 'A', 5: 'A' },
                    5: { 2: 'A', 3: 'A' },
                    7: { 10: 'B', 11: 'B', 12: 'B' }
                },
                description: 'Holding aim steady'
            },
            // Frame 6: About to release
            {
                duration: 30,
                paletteMod: { brightness: 1.15 },
                deltas: {
                    4: { 2: 'A', 3: 'A', 4: 'A', 5: 'A' },
                    5: { 2: 'A' },
                    7: { 10: 'B', 11: 'B', 12: 'B' }
                },
                description: 'Releasing arrow'
            }
        ],
        strike: [
            // Frame 1: Arrow released
            {
                duration: 30,
                paletteMod: { brightness: 1.2 },
                deltas: {
                    5: { 6: 'A', 7: 'A', 8: 'A', 9: 'A', 10: 'A' },
                    7: { 10: 'B', 11: 'B' }
                },
                description: 'Arrow flying'
            },
            // Frame 2: Arrow in flight
            {
                duration: 35,
                deltas: {
                    5: { 10: 'A', 11: 'A', 12: 'A', 13: 'A', 14: 'A' }
                },
                description: 'Arrow in flight'
            },
            // Frame 3: Arrow leaving frame
            {
                duration: 35,
                deltas: {},
                description: 'Arrow released'
            }
        ],
        recovery: [
            // Frame 1: Bow returning
            {
                duration: 40,
                deltas: {
                    7: { 8: 'B', 9: 'B' }
                },
                description: 'Bow returning to rest'
            },
            // Frame 2: Bow at rest
            {
                duration: 40,
                deltas: {
                    7: { 7: 'B', 8: 'B' }
                },
                description: 'Bow at rest position'
            },
            // Frame 3: Arm relaxing
            {
                duration: 40,
                deltas: {},
                description: 'Arm relaxing'
            },
            // Frame 4: Return to ready
            {
                duration: 40,
                deltas: {},
                description: 'Return to ready stance'
            },
            // Frame 5: Idle
            {
                duration: 40,
                deltas: {},
                description: 'Return to idle'
            }
        ]
    }
};

// ============================================================================
// IDLE ANIMATIONS
// ============================================================================
// Looping idle animations for different creature types

const IDLE_ANIMATIONS = {

    // Subtle breathing - body rises and falls slightly
    breathing: {
        loop: true,
        frames: [
            // Frame 1: Inhale (body slightly raised)
            {
                duration: 1500,
                verticalOffset: -1,
                scaleY: 1.02,
                deltas: {},
                description: 'Inhale - body rises slightly'
            },
            // Frame 2: Exhale (body settles)
            {
                duration: 1500,
                verticalOffset: 0,
                scaleY: 1.0,
                deltas: {},
                description: 'Exhale - body settles'
            }
        ]
    },

    // Floating bob - for wisps, ghosts, flying creatures
    floating: {
        loop: true,
        frames: [
            // Frame 1: Float up
            {
                duration: 800,
                verticalOffset: -2,
                deltas: {},
                description: 'Float upward'
            },
            // Frame 2: Peak
            {
                duration: 800,
                verticalOffset: -3,
                deltas: {},
                description: 'Float at peak'
            },
            // Frame 3: Float down
            {
                duration: 800,
                verticalOffset: -2,
                deltas: {},
                description: 'Float downward'
            },
            // Frame 4: Bottom
            {
                duration: 800,
                verticalOffset: -1,
                deltas: {},
                description: 'Float at bottom'
            }
        ]
    },

    // Pulsing glow - for magical/glowing creatures
    pulsing: {
        loop: true,
        frames: [
            // Frame 1: Bright
            {
                duration: 600,
                paletteMod: { brightness: 1.2 },
                deltas: {},
                description: 'Glow bright'
            },
            // Frame 2: Dim
            {
                duration: 600,
                paletteMod: { brightness: 0.9 },
                deltas: {},
                description: 'Glow dim'
            }
        ]
    },

    // Swaying - for plant-like creatures
    swaying: {
        loop: true,
        frames: [
            {
                duration: 1200,
                horizontalOffset: -1,
                deltas: {},
                description: 'Sway left'
            },
            {
                duration: 1200,
                horizontalOffset: 0,
                deltas: {},
                description: 'Center'
            },
            {
                duration: 1200,
                horizontalOffset: 1,
                deltas: {},
                description: 'Sway right'
            },
            {
                duration: 1200,
                horizontalOffset: 0,
                deltas: {},
                description: 'Return to center'
            }
        ]
    }
};

// ============================================================================
// DEATH ANIMATIONS
// ============================================================================
// Non-looping death animations for different death styles

const DEATH_ANIMATIONS = {

    // Dissolve - for slimes, oozes (melts downward)
    dissolve: {
        loop: false,
        frames: [
            // Frame 1: Starting to melt
            {
                duration: 100,
                scaleY: 0.95,
                paletteMod: { brightness: 0.9 },
                deltas: {
                    2: { 6: '.', 7: '.', 8: '.', 9: '.' },
                    3: { 5: '.', 10: '.' }
                },
                description: 'Beginning to dissolve'
            },
            // Frame 2: Upper body dissolving
            {
                duration: 100,
                verticalOffset: 1,
                scaleY: 0.85,
                paletteMod: { brightness: 0.8 },
                deltas: {
                    2: { 4: '.', 5: '.', 6: '.', 7: '.', 8: '.', 9: '.', 10: '.', 11: '.' },
                    3: { 3: '.', 4: '.', 5: '.', 10: '.', 11: '.', 12: '.' },
                    4: { 2: '.', 3: '.', 12: '.', 13: '.' }
                },
                description: 'Upper body dissolving'
            },
            // Frame 3: Mostly dissolved
            {
                duration: 100,
                verticalOffset: 2,
                scaleY: 0.7,
                paletteMod: { brightness: 0.7, saturation: 0.8 },
                deltas: {
                    2: { 2: '.', 3: '.', 4: '.', 5: '.', 6: '.', 7: '.', 8: '.', 9: '.', 10: '.', 11: '.', 12: '.', 13: '.' },
                    3: { 2: '.', 3: '.', 4: '.', 5: '.', 10: '.', 11: '.', 12: '.', 13: '.' },
                    4: { 2: '.', 3: '.', 4: '.', 11: '.', 12: '.', 13: '.' },
                    5: { 2: '.', 3: '.', 12: '.', 13: '.' }
                },
                description: 'Mostly dissolved'
            },
            // Frame 4: Just puddle remaining
            {
                duration: 120,
                verticalOffset: 4,
                scaleY: 0.5,
                scaleX: 1.3,
                paletteMod: { brightness: 0.6, saturation: 0.6 },
                deltas: {},
                description: 'Puddle forming'
            },
            // Frame 5: Puddle spreading
            {
                duration: 130,
                verticalOffset: 5,
                scaleY: 0.3,
                scaleX: 1.5,
                paletteMod: { brightness: 0.5, saturation: 0.5 },
                deltas: {},
                description: 'Puddle spreading'
            },
            // Frame 6: Final fade
            {
                duration: 150,
                verticalOffset: 6,
                scaleY: 0.15,
                scaleX: 1.6,
                paletteMod: { brightness: 0.3, saturation: 0.3, alpha: 0.5 },
                deltas: {},
                description: 'Fading away'
            }
        ]
    },

    // Crumble - for golems, stone creatures (breaks apart)
    crumble: {
        loop: false,
        frames: [
            // Frame 1: Cracks appear
            {
                duration: 80,
                paletteMod: { brightness: 0.95 },
                deltas: {
                    4: { 7: 'C' },   // C = crack
                    6: { 5: 'C', 10: 'C' },
                    8: { 8: 'C' },
                    10: { 6: 'C', 11: 'C' }
                },
                description: 'Cracks appearing'
            },
            // Frame 2: Cracks spreading
            {
                duration: 80,
                paletteMod: { brightness: 0.9 },
                deltas: {
                    3: { 6: 'C', 9: 'C' },
                    4: { 5: 'C', 7: 'C', 10: 'C' },
                    6: { 4: 'C', 5: 'C', 10: 'C', 11: 'C' },
                    8: { 6: 'C', 8: 'C', 10: 'C' },
                    10: { 5: 'C', 6: 'C', 10: 'C', 11: 'C' }
                },
                description: 'Cracks spreading'
            },
            // Frame 3: Pieces separating
            {
                duration: 100,
                paletteMod: { brightness: 0.85 },
                deltas: {
                    // Upper pieces floating up
                    2: { 5: 'P', 6: 'P', 9: 'P', 10: 'P' },  // P = pieces
                    3: { 4: 'P', 11: 'P' }
                },
                description: 'Pieces separating'
            },
            // Frame 4: Collapsing
            {
                duration: 100,
                verticalOffset: 1,
                scaleY: 0.9,
                paletteMod: { brightness: 0.75 },
                deltas: {
                    0: { 3: 'P', 12: 'P' },
                    1: { 5: 'P', 10: 'P' },
                    // Middle crumbling
                    5: { 4: '.', 5: '.', 10: '.', 11: '.' },
                    6: { 3: '.', 12: '.' }
                },
                description: 'Structure collapsing'
            },
            // Frame 5: Pile forming
            {
                duration: 120,
                verticalOffset: 3,
                scaleY: 0.6,
                scaleX: 1.2,
                paletteMod: { brightness: 0.65 },
                deltas: {},
                description: 'Rubble pile forming'
            },
            // Frame 6: Dust settling
            {
                duration: 140,
                verticalOffset: 4,
                scaleY: 0.4,
                scaleX: 1.4,
                paletteMod: { brightness: 0.5, alpha: 0.8 },
                deltas: {},
                description: 'Dust settling'
            }
        ]
    },

    // Collapse - for humanoids, skeletons (falls apart)
    collapse: {
        loop: false,
        frames: [
            // Frame 1: Stagger
            {
                duration: 80,
                horizontalOffset: 1,
                deltas: {},
                description: 'Staggering'
            },
            // Frame 2: Starting to fall
            {
                duration: 80,
                horizontalOffset: 2,
                verticalOffset: 1,
                deltas: {
                    // Head tilting
                    2: { 6: '.', 7: '.', 8: '.', 9: '.' },
                    3: { 8: 'H', 9: 'H', 10: 'H', 11: 'H' }  // H = head pieces
                },
                description: 'Beginning to fall'
            },
            // Frame 3: Falling
            {
                duration: 100,
                horizontalOffset: 3,
                verticalOffset: 2,
                paletteMod: { brightness: 0.9 },
                deltas: {
                    1: { 10: 'H', 11: 'H', 12: 'H' },
                    // Arms separating
                    7: { 2: 'A', 3: 'A' },  // A = arm pieces
                    8: { 12: 'A', 13: 'A' }
                },
                description: 'Falling apart'
            },
            // Frame 4: Hitting ground
            {
                duration: 100,
                horizontalOffset: 2,
                verticalOffset: 4,
                scaleY: 0.7,
                paletteMod: { brightness: 0.8 },
                deltas: {
                    0: { 12: 'H', 13: 'H' },
                    // Bones scattering
                    10: { 3: 'B', 4: 'B', 11: 'B', 12: 'B' }  // B = bone pieces
                },
                description: 'Impact with ground'
            },
            // Frame 5: Scattered remains
            {
                duration: 120,
                verticalOffset: 5,
                scaleY: 0.5,
                scaleX: 1.3,
                paletteMod: { brightness: 0.7 },
                deltas: {},
                description: 'Scattered on ground'
            },
            // Frame 6: Final settle
            {
                duration: 140,
                verticalOffset: 6,
                scaleY: 0.35,
                scaleX: 1.5,
                paletteMod: { brightness: 0.6, alpha: 0.9 },
                deltas: {},
                description: 'Remains settling'
            }
        ]
    },

    // Fade - for ghosts, spirits, wisps (becomes transparent)
    fade: {
        loop: false,
        frames: [
            // Frame 1: Flickering
            {
                duration: 80,
                paletteMod: { brightness: 1.2, alpha: 0.9 },
                deltas: {},
                description: 'Flickering'
            },
            // Frame 2: Starting to fade
            {
                duration: 80,
                paletteMod: { brightness: 1.1, alpha: 0.75 },
                verticalOffset: -1,
                deltas: {},
                description: 'Beginning to fade'
            },
            // Frame 3: Becoming translucent
            {
                duration: 100,
                paletteMod: { brightness: 1.0, alpha: 0.6 },
                verticalOffset: -2,
                scaleY: 1.05,
                deltas: {
                    // Edges dissolving
                    3: { 2: '.', 13: '.' },
                    4: { 1: '.', 14: '.' },
                    10: { 1: '.', 14: '.' },
                    11: { 2: '.', 13: '.' }
                },
                description: 'Becoming translucent'
            },
            // Frame 4: Nearly transparent
            {
                duration: 100,
                paletteMod: { brightness: 0.9, alpha: 0.4 },
                verticalOffset: -3,
                scaleY: 1.1,
                scaleX: 1.05,
                deltas: {
                    2: { 4: '.', 5: '.', 10: '.', 11: '.' },
                    3: { 3: '.', 4: '.', 11: '.', 12: '.' },
                    10: { 3: '.', 4: '.', 11: '.', 12: '.' },
                    11: { 4: '.', 5: '.', 10: '.', 11: '.' }
                },
                description: 'Nearly transparent'
            },
            // Frame 5: Almost gone
            {
                duration: 120,
                paletteMod: { brightness: 0.7, alpha: 0.2 },
                verticalOffset: -4,
                scaleY: 1.15,
                scaleX: 1.1,
                deltas: {},
                description: 'Almost gone'
            },
            // Frame 6: Vanished
            {
                duration: 140,
                paletteMod: { brightness: 0.5, alpha: 0.05 },
                verticalOffset: -5,
                scaleY: 1.2,
                scaleX: 1.15,
                deltas: {},
                description: 'Vanished'
            }
        ]
    },

    // Explode - for volatile creatures (bursts outward)
    explode: {
        loop: false,
        frames: [
            // Frame 1: Bulging
            {
                duration: 60,
                scaleX: 1.1,
                scaleY: 1.1,
                paletteMod: { brightness: 1.2 },
                deltas: {},
                description: 'Bulging outward'
            },
            // Frame 2: Maximum expansion
            {
                duration: 50,
                scaleX: 1.2,
                scaleY: 1.2,
                paletteMod: { brightness: 1.4 },
                deltas: {},
                description: 'Maximum expansion'
            },
            // Frame 3: EXPLOSION
            {
                duration: 40,
                scaleX: 1.8,
                scaleY: 1.8,
                paletteMod: { brightness: 1.8 },
                deltas: {
                    // Explosion particles
                    0: { 3: 'X', 7: 'X', 12: 'X' },
                    2: { 1: 'X', 14: 'X' },
                    7: { 0: 'X', 15: 'X' },
                    12: { 1: 'X', 14: 'X' },
                    14: { 3: 'X', 7: 'X', 12: 'X' }
                },
                description: 'EXPLOSION'
            },
            // Frame 4: Particles flying
            {
                duration: 80,
                scaleX: 2.2,
                scaleY: 2.2,
                paletteMod: { brightness: 1.3, alpha: 0.7 },
                deltas: {},
                description: 'Particles flying outward'
            },
            // Frame 5: Dissipating
            {
                duration: 100,
                scaleX: 2.5,
                scaleY: 2.5,
                paletteMod: { brightness: 0.8, alpha: 0.4 },
                deltas: {},
                description: 'Explosion dissipating'
            },
            // Frame 6: Gone
            {
                duration: 120,
                scaleX: 3.0,
                scaleY: 3.0,
                paletteMod: { brightness: 0.4, alpha: 0.1 },
                deltas: {},
                description: 'Fading completely'
            }
        ]
    }
};

// ============================================================================
// ANIMATION HELPER FUNCTIONS
// ============================================================================

/**
 * Get the animation configuration for a monster
 * @param {string} spriteKey - The sprite key (e.g., 'magma_slime')
 * @returns {Object} Animation configuration
 */
function getMonsterAnimationConfig(spriteKey) {
    return MONSTER_ANIMATION_CONFIG[spriteKey] || {
        attack: ANIMATION_TYPES.MELEE_SLAM,
        idle: 'breathing',
        death: 'collapse'
    };
}

/**
 * Get attack animation frames for a monster
 * @param {string} spriteKey - The sprite key
 * @returns {Object} Attack animation with windup, strike, recovery phases
 */
function getAttackAnimation(spriteKey) {
    const config = getMonsterAnimationConfig(spriteKey);
    return ATTACK_ANIMATIONS[config.attack] || ATTACK_ANIMATIONS[ANIMATION_TYPES.MELEE_SLAM];
}

/**
 * Get idle animation frames for a monster
 * @param {string} spriteKey - The sprite key
 * @returns {Object} Idle animation frames
 */
function getIdleAnimation(spriteKey) {
    const config = getMonsterAnimationConfig(spriteKey);
    return IDLE_ANIMATIONS[config.idle] || IDLE_ANIMATIONS.breathing;
}

/**
 * Get death animation frames for a monster
 * @param {string} spriteKey - The sprite key
 * @returns {Object} Death animation frames
 */
function getDeathAnimation(spriteKey) {
    const config = getMonsterAnimationConfig(spriteKey);
    return DEATH_ANIMATIONS[config.death] || DEATH_ANIMATIONS.collapse;
}

/**
 * Calculate total duration of an animation phase
 * @param {Array} frames - Array of frame objects
 * @returns {number} Total duration in milliseconds
 */
function getAnimationPhaseDuration(frames) {
    return frames.reduce((total, frame) => total + frame.duration, 0);
}

/**
 * Get timing breakdown for attack animation
 * @param {string} spriteKey - The sprite key
 * @returns {Object} Timing breakdown { windup, strike, recovery, total }
 */
function getAttackTiming(spriteKey) {
    const anim = getAttackAnimation(spriteKey);
    const windup = getAnimationPhaseDuration(anim.windup);
    const strike = getAnimationPhaseDuration(anim.strike);
    const recovery = getAnimationPhaseDuration(anim.recovery);

    return {
        windup,
        strike,
        recovery,
        total: windup + strike + recovery
    };
}

// ============================================================================
// DELTA FORMAT DOCUMENTATION
// ============================================================================
/*
Delta format specifies pixel changes from base sprite:

deltas: {
    // Row index -> { column index -> new character or '.' for transparent }
    5: { 3: '.', 4: 'O', 5: 'O', 6: '.' },  // Row 5: clear cols 3,6; set cols 4,5 to 'O'
    6: { 4: 'O', 5: 'O' },  // Row 6: set cols 4,5 to 'O'
}

Transform properties:
- verticalOffset: Pixels to shift sprite up (negative) or down (positive)
- horizontalOffset: Pixels to shift sprite left (negative) or right (positive)
- scaleX: Horizontal scale multiplier (1.0 = normal)
- scaleY: Vertical scale multiplier (1.0 = normal)

Palette modifications:
- paletteMod.brightness: 0.0-2.0, multiply all color brightness
- paletteMod.saturation: 0.0-2.0, multiply color saturation
- paletteMod.alpha: 0.0-1.0, overall transparency

Special delta characters:
- '.': Transparent (remove pixel)
- 'E': Energy particle
- 'M': Magic effect
- 'C': Crack line
- 'P': Debris piece
- 'X': Explosion particle
- Other characters use base sprite palette
*/

// ============================================================================
// EXPORTS
// ============================================================================

window.ANIMATION_TYPES = ANIMATION_TYPES;
window.ANIMATION_PHASES = ANIMATION_PHASES;
window.MONSTER_ANIMATION_CONFIG = MONSTER_ANIMATION_CONFIG;
window.ATTACK_ANIMATIONS = ATTACK_ANIMATIONS;
window.IDLE_ANIMATIONS = IDLE_ANIMATIONS;
window.DEATH_ANIMATIONS = DEATH_ANIMATIONS;

// Helper functions
window.getMonsterAnimationConfig = getMonsterAnimationConfig;
window.getAttackAnimation = getAttackAnimation;
window.getIdleAnimation = getIdleAnimation;
window.getDeathAnimation = getDeathAnimation;
window.getAnimationPhaseDuration = getAnimationPhaseDuration;
window.getAttackTiming = getAttackTiming;

console.log('[SpriteAnimations] Loaded animation system');
console.log('[SpriteAnimations] Attack types:', Object.keys(ANIMATION_TYPES).length);
console.log('[SpriteAnimations] Monsters configured:', Object.keys(MONSTER_ANIMATION_CONFIG).length);
console.log('[SpriteAnimations] Idle animations:', Object.keys(IDLE_ANIMATIONS).length);
console.log('[SpriteAnimations] Death animations:', Object.keys(DEATH_ANIMATIONS).length);
