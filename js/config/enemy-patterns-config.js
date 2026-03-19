/**
 * Enemy Attack Patterns Configuration
 * Defines timing profiles, telegraph colors, and special behaviors
 * for different enemy types to create combat variety.
 */

const ENEMY_PATTERN_CONFIG = {
    // ==========================================================================
    // ATTACK TIMING PROFILES
    // ==========================================================================
    // These define how quickly enemies telegraph and execute their attacks.
    // windupPercent: portion of totalDuration spent winding up (visible tell)
    // totalDuration: full attack animation time in milliseconds
    // telegraphColor: color flash during windup

    timingProfiles: {
        // Very fast enemies - minimal warning, requires quick reactions
        swift: {
            windupPercent: 0.15,           // 15% windup = 45ms warning on 300ms attack
            totalDuration: 300,            // 300ms total attack
            telegraphColor: '#ffff00',     // Yellow flash
            canInterrupt: true,            // Can be interrupted by damage
            trackingDuringWindup: false    // Does NOT track player during windup
        },

        // Standard enemies - balanced warning and execution
        standard: {
            windupPercent: 0.35,           // 35% windup = 140ms warning on 400ms attack
            totalDuration: 400,            // 400ms total
            telegraphColor: '#ffffff',     // White flash
            canInterrupt: true,
            trackingDuringWindup: false
        },

        // Heavy enemies - long telegraph but devastating damage
        heavy: {
            windupPercent: 0.60,           // 60% windup = 480ms warning on 800ms attack
            totalDuration: 800,            // 800ms total
            telegraphColor: '#ff4400',     // Orange flash
            canInterrupt: false,           // Cannot be interrupted (super armor)
            trackingDuringWindup: true,    // Follows player during windup (but not last 100ms)
            trackingCutoff: 100            // Stop tracking 100ms before strike
        },

        // Sweeping attacks - wide arc, medium telegraph
        sweeping: {
            windupPercent: 0.50,           // 50% windup = 300ms warning on 600ms attack
            totalDuration: 600,            // 600ms total
            telegraphColor: '#ff00ff',     // Magenta flash
            canInterrupt: true,
            trackingDuringWindup: false,
            arcAngle: 180                  // 180° sweep arc
        },

        // Charging attacks - builds up then rushes
        charging: {
            windupPercent: 0.70,           // 70% windup = 700ms warning on 1000ms attack
            totalDuration: 1000,           // 1000ms total
            telegraphColor: '#ff2222',     // Red flash
            canInterrupt: false,
            trackingDuringWindup: true,
            chargeDistance: 3,             // Tiles charged forward
            knockbackOnHit: 2              // Tiles knocked back on hit
        },

        // Ranged/caster - quick cast after brief windup
        caster: {
            windupPercent: 0.40,           // 40% windup = 200ms warning on 500ms attack
            totalDuration: 500,            // 500ms total
            telegraphColor: '#9b59b6',     // Purple flash
            canInterrupt: true,
            trackingDuringWindup: true,    // Can adjust aim during cast
            projectileSpeed: 8             // Tiles per second for projectile
        }
    },

    // ==========================================================================
    // ENEMY TYPE TO TIMING PROFILE MAPPING
    // ==========================================================================
    // Maps specific enemy names to their timing profile.
    // Enemies not listed will use the 'standard' profile.

    enemyTimings: {
        // === SWIFT ENEMIES (fast, minimal warning) ===
        'Cave Bat': 'swift',
        'Flame Bat': 'swift',
        'Shadow Imp': 'swift',
        'Cinder Wisp': 'caster',
        'Crystal Spider': 'swift',

        // === STANDARD ENEMIES (balanced) ===
        'Magma Slime': 'standard',
        'Salamander': 'standard',
        'Ash Walker': 'standard',
        'Mushroom Sprite': 'caster',
        'Skeleton': 'standard',
        'Undead Husk': 'standard',
        'Lesser Demon': 'standard',

        // === HEAVY ENEMIES (slow but powerful) ===
        'Obsidian Golem': 'heavy',
        'Stone Lurker': 'heavy',
        'Magma Brute': 'heavy',
        'Stone Guardian': 'heavy',
        'Bone Colossus': 'heavy',
        'Lava Elemental': 'heavy',

        // === SWEEPING ENEMIES (wide arc attacks) ===
        'Flame Elemental': 'sweeping',
        'Giant Spider': 'sweeping',

        // === CHARGING ENEMIES (rush attacks) ===
        'Demon Knight': 'charging',
        'Enraged Bull': 'charging',

        // === CASTER ENEMIES (ranged magic) ===
        'Pyro Cultist': 'caster',
        'Necromancer': 'caster',
        'Fire Mage': 'caster',

        // === ADDED: Previously missing timing profiles ===
        'Frozen Husk': 'heavy',
        'Blizzard Spirit': 'caster',
        'Frost Elemental': 'caster',
        'Deep Crawler': 'standard',
        'Tide Serpent': 'heavy',
        'Void Touched': 'caster',
        'Flame Sprite': 'swift',
        'Ice Golem': 'heavy'
    },

    // ==========================================================================
    // SHIELD BEHAVIOR CONFIGURATION
    // ==========================================================================
    // Defines how shield-bearing enemies block attacks.

    shieldBehavior: {
        blockArc: 90,                      // 90° frontal block cone
        blockDamageReduction: 0.9,         // 90% damage blocked when facing attacker
        shieldBreakThreshold: 3,           // Consecutive hits to break guard
        shieldRecoverTime: 3.0,            // Seconds to recover guard after break
        vulnerableFromBehind: true,        // Attacks from behind bypass shield
        staggerOnBreak: true,              // Stagger enemy when shield breaks
        staggerDuration: 1.0,              // Stagger duration in seconds

        // Visual feedback
        blockSparkColor: '#ffff88',
        breakEffectColor: '#ff8844'
    },

    // List of enemies that have shields
    shieldedEnemies: [
        'Temple Sentinel',
        'Shield Bearer'
    ],

    // ==========================================================================
    // RANGED BEHAVIOR CONFIGURATION
    // ==========================================================================
    // Defines how ranged enemies position and attack.

    rangedBehavior: {
        preferredRange: 4,                 // Ideal distance in tiles
        retreatRange: 2,                   // Back up if player gets this close
        minRange: 3,                       // Never get closer than this
        maxRange: 6,                       // Don't attack beyond this

        // Aiming
        aimTime: 0.5,                      // Seconds of aiming before fire
        leadTarget: true,                  // Predict player movement
        leadFactor: 0.3,                   // How much to lead (0-1)

        // Projectile defaults (can be overridden per enemy)
        projectileSpeed: 8,                // Tiles per second
        projectileSpread: 5,               // Accuracy spread in degrees

        // Positioning
        strafeChance: 0.3,                 // Chance to strafe after shooting
        strafeDuration: 500                // How long to strafe in ms
    },

    // List of ranged enemy types (for AI behavior detection)
    rangedEnemies: [
        'Cinder Wisp',
        'Pyro Cultist',
        'Mushroom Sprite',
        'Necromancer',
        'Fire Mage',
        'Cultist Archer',
        'Dark Caster'
    ],

    // ==========================================================================
    // PACK TACTICS CONFIGURATION
    // ==========================================================================
    // Controls how enemies coordinate their attacks.

    packTactics: {
        // Coordination
        coordinationRange: 6,              // Tiles for pack awareness
        maxSimultaneousAttackers: 2,       // At most 2 enemies attack at once
        attackTokenRefreshRate: 1.5,       // Seconds between attack opportunities

        // Flanking bonuses
        flankingEnabled: true,
        flankAngle: 45,                    // Degrees from front to count as front
        flankDamageBonus: 1.25,            // 25% more damage from sides
        backstabDamageBonus: 1.50,         // 50% more damage from behind
        backstabAngle: 135,                // Degrees from front to count as behind

        // Surrounded mechanic
        surroundThreshold: 3,              // 3+ enemies = surrounded
        surroundedDebuff: {
            dodgePenalty: 0.5,             // 50% less effective dodge
            movePenalty: 0.8,              // 20% slower movement
            staminaRegenPenalty: 0.7       // 30% less stamina regen
        },

        // Morale system
        moraleEnabled: true,
        moraleDropOnAllyDeath: 15,         // Morale lost when ally dies nearby
        moralePanicThreshold: 20,          // Below this, enemies may flee
        moraleCriticalThreshold: 10,       // Below this, guaranteed flee
        moraleRecoveryRate: 5              // Morale recovered per second when safe
    },

    // ==========================================================================
    // TELEGRAPH VISUAL CONFIGURATION
    // ==========================================================================
    // Controls how attack windups are visualized.

    telegraphVisuals: {
        // Ground indicator
        showGroundIndicator: true,
        groundIndicatorAlpha: 0.3,
        groundIndicatorPulse: true,
        pulseSpeed: 0.01,                  // Pulse frequency

        // Enemy tint
        enemyTintEnabled: true,
        enemyTintIntensity: 0.5,

        // Screen shake warning for heavy attacks
        heavyAttackScreenShake: true,
        shakeIntensity: 2,
        shakeDuration: 100,

        // Sound cues
        windupSounds: {
            swift: 'sfx_enemy_windup_quick',
            standard: 'sfx_enemy_windup',
            heavy: 'sfx_enemy_windup_heavy',
            sweeping: 'sfx_enemy_windup_sweep',
            charging: 'sfx_enemy_charge',
            caster: 'sfx_enemy_cast'
        }
    }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the timing profile for an enemy
 * @param {string} enemyName - Name of the enemy
 * @returns {Object} - Timing profile object
 */
function getEnemyTimingProfile(enemyName) {
    const profileName = ENEMY_PATTERN_CONFIG.enemyTimings[enemyName] || 'standard';
    return ENEMY_PATTERN_CONFIG.timingProfiles[profileName];
}

/**
 * Check if an enemy is a ranged type
 * @param {string} enemyName - Name of the enemy
 * @returns {boolean}
 */
function isRangedEnemy(enemyName) {
    return ENEMY_PATTERN_CONFIG.rangedEnemies.includes(enemyName);
}

/**
 * Check if an enemy has a shield
 * @param {string} enemyName - Name of the enemy
 * @returns {boolean}
 */
function isShieldedEnemy(enemyName) {
    return ENEMY_PATTERN_CONFIG.shieldedEnemies.includes(enemyName);
}

/**
 * Calculate flanking damage multiplier
 * @param {number} attackAngle - Angle of attack relative to defender's facing
 * @returns {number} - Damage multiplier (1.0, 1.25, or 1.5)
 */
function getFlankingMultiplier(attackAngle) {
    const config = ENEMY_PATTERN_CONFIG.packTactics;
    if (!config.flankingEnabled) return 1.0;

    const absAngle = Math.abs(attackAngle);

    if (absAngle >= config.backstabAngle) {
        return config.backstabDamageBonus;
    } else if (absAngle >= config.flankAngle) {
        return config.flankDamageBonus;
    }
    return 1.0;
}

/**
 * Get flanking position name
 * @param {number} attackAngle - Angle of attack relative to defender's facing
 * @returns {string} - 'front', 'flank', or 'behind'
 */
function getFlankingPosition(attackAngle) {
    const config = ENEMY_PATTERN_CONFIG.packTactics;
    const absAngle = Math.abs(attackAngle);

    if (absAngle >= config.backstabAngle) {
        return 'behind';
    } else if (absAngle >= config.flankAngle) {
        return 'flank';
    }
    return 'front';
}

// =============================================================================
// EXPORTS
// =============================================================================

if (typeof window !== 'undefined') {
    window.ENEMY_PATTERN_CONFIG = ENEMY_PATTERN_CONFIG;
    window.getEnemyTimingProfile = getEnemyTimingProfile;
    window.isRangedEnemy = isRangedEnemy;
    window.isShieldedEnemy = isShieldedEnemy;
    window.getFlankingMultiplier = getFlankingMultiplier;
    window.getFlankingPosition = getFlankingPosition;
}

console.log('✅ Enemy Patterns Config loaded');
