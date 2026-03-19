/**
 * Combat Configuration
 * Centralized configuration for combat mechanics including stamina, hitstop, and kill streaks.
 */

// =============================================================================
// STAMINA CONFIGURATION
// =============================================================================
const STAMINA_CONFIG = {
    // Resource pool
    maxStamina: 100,
    startingStamina: 100,

    // Costs (stamina consumed per action)
    costs: {
        lightAttack: 10,       // Standard attacks cost stamina
        heavyAttack: 10,       // Combo finisher (3rd hit)
        dodge: 25,             // Dodge roll
        dash: 15,              // Quick dash
        block: 5,              // Per second while blocking (future)
    },

    // Regeneration
    regenRate: 4,              // Stamina per second (continuous)
    regenDelay: 0,             // No delay - regen starts immediately
    inCombatRegenMultiplier: 1.0,  // Full regen rate during combat

    // Refunds (stamina gained)
    killRefund: 25,            // Stamina restored per kill
    perfectDodgeRefund: 15,    // Bonus for dodging at last moment

    // Thresholds
    exhaustedThreshold: 20,    // Below this, attacks are slower
    exhaustedSpeedPenalty: 0.7, // 30% slower attacks when exhausted

    // UI
    segmentCount: 5,           // Number of segments to display (100/5 = 20 per segment)
    segmentValue: 20,          // Stamina per segment
};

// =============================================================================
// HITSTOP CONFIGURATION
// =============================================================================
const HITSTOP_CONFIG = {
    // Base durations by weapon weight class (in milliseconds)
    weaponClass: {
        light: 30,       // Knives, daggers - snappy
        medium: 50,      // Swords, spears - balanced
        heavy: 100,      // Axes, maces, hammers - chunky
    },

    // Weapon type to weight class mapping
    weaponWeights: {
        knife: 'light',
        dagger: 'light',
        sword: 'medium',
        spear: 'medium',
        polearm: 'medium',
        axe: 'heavy',
        mace: 'heavy',
        hammer: 'heavy',
        unarmed: 'light',
        // Fallback for unknown weapons
        default: 'medium',
    },

    // Multipliers (stack multiplicatively)
    multipliers: {
        comboFinisher: 1.5,    // 3rd hit in combo
        critical: 2.0,         // Critical hit
        ambush: 1.3,           // Surprise attack
        killing: 2.5,          // Killing blow
    },

    // Caps
    maxHitstop: 250,           // Never exceed 250ms

    // Additional effects at high hitstop
    screenShakeThreshold: 80,  // Add screen shake above this (ms)
    screenShakeIntensity: 0.02, // Intensity multiplier (duration / 50)

    timeSlowThreshold: 150,    // Brief time slow above this (ms)
    timeSlowDuration: 100,     // How long time slow lasts (ms)
    timeSlowFactor: 0.5,       // 50% speed during time slow
};

// =============================================================================
// KILL STREAK CONFIGURATION
// =============================================================================
const KILL_STREAK_CONFIG = {
    // Streak tiers (visual/feedback only, no rewards yet)
    tiers: [
        { kills: 2,  name: 'Double Kill',     color: '#c0c0c0', sound: 'streak_2' },
        { kills: 4,  name: 'Killing Spree',   color: '#4a9eff', sound: 'streak_4' },
        { kills: 6,  name: 'Rampage',         color: '#9b4dca', sound: 'streak_6' },
        { kills: 8,  name: 'Unstoppable',     color: '#ff6b35', sound: 'streak_8' },
        { kills: 10, name: 'Godlike',         color: '#ffd700', sound: 'streak_10' },
    ],

    // Decay mechanics
    decayTime: 5.0,             // Seconds without kill before streak decays
    decayPerTick: 1,            // Kills lost per decay tick

    // Reset conditions
    resetOnDamage: true,        // Any damage resets streak
    resetOnFloorChange: false,  // Keep streak between floors

    // UI settings
    announcementDuration: 2.0,  // Seconds to show tier announcement
    counterFadeDelay: 3.0,      // Seconds before counter starts fading
    streakLostFlashDuration: 0.5, // Duration of red flash on streak loss

    // Future: Add rewards here when ready
    // milestoneRewards: {
    //     4: { type: 'healthDrop', chance: 0.5 },
    //     8: { type: 'briefInvuln', duration: 1.5 },
    //     10: { type: 'screenEffect', name: 'godlike' }
    // }
};

// =============================================================================
// EXPORTS
// =============================================================================
// Make configs globally accessible
if (typeof window !== 'undefined') {
    window.STAMINA_CONFIG = STAMINA_CONFIG;
    window.HITSTOP_CONFIG = HITSTOP_CONFIG;
    window.KILL_STREAK_CONFIG = KILL_STREAK_CONFIG;
}
