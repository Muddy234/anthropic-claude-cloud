// ============================================================================
// ABILITY EFFECTS DATA - Configuration for all enemy ability animations
// ============================================================================
// This file defines visual configurations for enemy abilities.
// Renderers read from this data - colors and parameters should NOT be hardcoded elsewhere.
// ============================================================================

const ABILITY_EFFECTS = {
    // ========================================================================
    // MELEE ARC ABILITIES (Base: melee-swing)
    // ========================================================================

    melee_swing: {
        baseRef: 'melee',
        telegraph: {
            type: 'arc_fill',
            arcAngle: Math.PI / 2,  // 90 degrees
            radius: 1.5,            // tiles
            color: '#FF6464',
            borderColor: '#FFAAAA',
            directed: true,
            lockDirection: true
        },
        impact: { type: 'slash_arc', sweepDirection: 'cw', duration: 150, color: '#FFFFFF' },
        particles: { spawnMode: 'arc_edge', color: '#FFCCCC', count: 4 },
        camera: { type: 'screenNudge', intensity: 2 },
        audio: { telegraph: 'ability_melee_charge', impact: 'ability_melee_hit' }
    },

    claw_swipe: {
        baseRef: 'melee',
        telegraph: {
            type: 'arc_fill',
            arcAngle: Math.PI * 2/3,  // 120 degrees
            radius: 1.5,
            color: '#FF4444',
            borderColor: '#FF8888',
            multiLine: 3,
            directed: true,
            lockDirection: true
        },
        impact: { type: 'slash_arc', sweepDirection: 'cw', duration: 150, color: '#FF6666' },
        particles: { spawnMode: 'arc_edge', color: '#FF8888', count: 6 },
        audio: { telegraph: 'ability_claw_charge', impact: 'ability_claw_hit' }
    },

    bite: {
        baseRef: 'melee',
        telegraph: {
            type: 'arc_fill',
            arcAngle: Math.PI / 3,  // 60 degrees
            radius: 1.0,
            color: '#CC4444',
            borderColor: '#FF6666',
            directed: true,
            lockDirection: true
        },
        impact: { type: 'chomp', duration: 100, color: '#FFFFFF' },
        lunge: {
            distance: 0.5,  // tiles - small forward snap
            duration: 150   // ms - quick snap forward
        },
        audio: { telegraph: 'ability_bite_charge', impact: 'ability_bite_hit' }
    },

    double_strike: {
        baseRef: 'melee',
        sequence: [
            { delay: 0, direction: 'cw', arcAngle: Math.PI / 2 },
            { delay: 350, direction: 'ccw', arcAngle: Math.PI / 2 }
        ],
        telegraph: {
            type: 'arc_fill',
            arcAngle: Math.PI / 2,
            radius: 1.5,
            color: '#FF6464',
            borderColor: '#FFAAAA',
            lockDirection: true
        },
        impact: { type: 'slash_arc', duration: 150, color: '#FFFFFF' },
        audio: { telegraph: 'ability_melee_charge', impact: 'ability_melee_hit' }
    },

    tail_whip: {
        baseRef: 'melee',
        telegraph: {
            type: 'arc_fill',
            arcAngle: Math.PI * 140/180,  // 140 degrees
            radius: 2.0,
            color: '#AA8866',
            borderColor: '#CCAA88',
            directionOffset: Math.PI,  // Face opposite direction
            lockDirection: true
        },
        impact: { type: 'slash_arc', duration: 150, color: '#CCAA88' },
        knockback: { force: 1.5, duration: 150 },
        particles: { type: 'dust', count: 6, color: '#AA9977' },
        audio: { telegraph: 'ability_whoosh_charge', impact: 'ability_whoosh_hit' }
    },

    sweep: {
        baseRef: 'melee',
        telegraph: {
            type: 'arc_fill',
            arcAngle: Math.PI,  // 180 degrees
            radius: 2.0,
            color: '#FF6464',
            borderColor: '#FFAAAA',
            lockDirection: true
        },
        impact: { type: 'slash_arc', duration: 200, color: '#FFFFFF' },
        camera: {
            type: 'screenShake',
            intensity: 4,
            duration: 150,
            flash: { color: '#FFFFFF', intensity: 0.2, duration: 50 }  // Quick white flash for sweeping attacks
        },
        audio: { telegraph: 'ability_heavy_charge', impact: 'ability_heavy_hit' }
    },

    // ========================================================================
    // CIRCLE AOE ABILITIES (Base: ground-slam)
    // ========================================================================

    ground_slam: {
        baseRef: 'ground',
        telegraph: {
            type: 'circle_grow',
            radius: 3.0,
            color: '#FFAA00',
            borderColor: '#FFDD00',
            growDuration: 'match',
            fillOpacity: 0.25
        },
        impact: { type: 'ring_burst', ringCount: 2, duration: 300, color: '#FFAA00' },
        knockback: { force: 1.5, duration: 120 },
        particles: { type: 'debris', count: 8, spawnMode: 'radial', color: '#AA7744' },
        camera: {
            type: 'screenShake',
            intensity: 4,
            duration: 150,
            flash: { color: '#FFBB66', intensity: 0.2, duration: 60 }  // Subtle orange flash for ground impact
        },
        audio: { telegraph: 'ability_slam_charge', impact: 'ability_slam_impact' }
    },

    heavy_slam: {
        baseRef: 'ground',
        telegraph: {
            type: 'circle_grow',
            radius: 4.0,
            color: '#FF8800',
            borderColor: '#FFAA00',
            growDuration: 'match',
            fillOpacity: 0.3
        },
        impact: { type: 'ring_burst', ringCount: 3, duration: 400, color: '#FF8800', groundCrack: true },
        knockback: { force: 2, duration: 150 },
        particles: { type: 'debris', count: 12, spawnMode: 'radial', color: '#886644' },
        camera: {
            type: 'screenShake',
            intensity: 6,
            duration: 200,
            flash: { color: '#FFFFFF', intensity: 0.35, duration: 80 }  // White flash for heavy impact
        },
        audio: { telegraph: 'ability_heavy_slam_charge', impact: 'ability_heavy_slam_impact' }
    },

    stomp: {
        baseRef: 'ground',
        telegraph: {
            type: 'circle_grow',
            radius: 1.5,
            color: '#FFCC00',
            borderColor: '#FFEE00',
            growDuration: 'match',
            fillOpacity: 0.2
        },
        impact: { type: 'ring_burst', ringCount: 1, duration: 150, color: '#FFCC00' },
        particles: { type: 'dust', count: 4, spawnMode: 'radial', color: '#AA9966' },
        camera: { type: 'screenShake', intensity: 2, duration: 100 },
        audio: { telegraph: 'ability_stomp_charge', impact: 'ability_stomp_impact' }
    },

    pounce: {
        baseRef: 'ground',
        telegraph: {
            type: 'circle_grow',
            radius: 2.0,
            color: '#FFAA00',
            borderColor: '#FFCC00',
            growDuration: 'match',
            fillOpacity: 0.25
        },
        casterMovement: {
            type: 'leap',
            startTime: 0.3,
            arcHeight: 2.0,
            landAt: 'center',
            disableAI: true,
            disableCollision: false,
            updatePosition: true
        },
        impact: { type: 'ring_burst', ringCount: 1, duration: 200, color: '#FFAA00' },
        camera: {
            type: 'screenShake',
            intensity: 3,
            duration: 100,
            flash: { color: '#FFDD88', intensity: 0.15, duration: 50 }  // Subtle warm flash on pounce landing
        },
        audio: { telegraph: 'ability_pounce_charge', impact: 'ability_pounce_land' }
    },

    // ========================================================================
    // LINE/CHARGE ABILITIES (Base: charge)
    // ========================================================================

    charge: {
        baseRef: 'charge',
        telegraph: {
            type: 'line_fixed',
            width: 1.0,
            length: 6.0,
            color: '#FF4444',
            borderColor: '#FF8888',
            lockDirection: true
        },
        dash: { speed: 400, trail: true, afterimages: 3 },
        impact: { wallCrack: true, stunStars: true, duration: 200 },
        knockback: { force: 3, duration: 200 },
        wallCollision: { selfStunDuration: 1500, selfDamagePercent: 0.1 },
        camera: {
            type: 'screenShake',
            intensity: 3,
            onWallHit: true,
            flash: { color: '#FFFFFF', intensity: 0.25, duration: 60 }  // White flash on wall collision
        },
        audio: { telegraph: 'ability_charge_windup', impact: 'ability_charge_hit' }
    },

    bull_rush: {
        baseRef: 'charge',
        telegraph: {
            type: 'line_fixed',
            width: 1.5,
            length: 8.0,
            color: '#AA4444',
            borderColor: '#CC6666',
            lockDirection: true
        },
        dash: { speed: 350, trail: true, afterimages: 4 },
        impact: { wallCrack: true, stunStars: true, duration: 300 },
        knockback: { force: 4, duration: 300 },
        wallCollision: { selfStunDuration: 2000, selfDamagePercent: 0.15 },
        camera: {
            type: 'screenShake',
            intensity: 5,
            onWallHit: true,
            flash: { color: '#FFFFFF', intensity: 0.4, duration: 100 }  // Strong white flash for bull rush impact
        },
        audio: { telegraph: 'ability_charge_windup', impact: 'ability_charge_heavy_hit' }
    },

    lunge: {
        baseRef: 'charge',
        telegraph: {
            type: 'line_fixed',
            width: 0.8,
            length: 3.0,
            color: '#FF6666',
            borderColor: '#FFAAAA',
            lockDirection: true
        },
        dash: { speed: 600, trail: true, afterimages: 1 },
        impact: { wallCrack: false, stunStars: false, duration: 150 },
        audio: { telegraph: 'ability_lunge_charge', impact: 'ability_lunge_hit' }
    },

    // ========================================================================
    // CONE/BREATH ABILITIES (Base: fire-breath)
    // ========================================================================

    fire_breath: {
        baseRef: 'breath',
        telegraph: {
            type: 'cone_fixed',
            angle: Math.PI / 3,  // 60 degrees
            radius: 4.0,
            color: '#FF6600',
            borderColor: '#FFAA00',
            lockDirection: true
        },
        channel: {
            duration: 1500,
            tickInterval: 300,
            streaming: true
        },
        particles: { type: 'flame', spawnMode: 'cone_fill', flowDirection: 'outward', color: '#FF4400' },
        statusEffect: { type: 'burn', duration: 3000 },
        hitDetection: 'isInsideCone',
        audio: { telegraph: 'ability_breath_inhale', channel: 'ability_fire_breath_loop', impact: null }
    },

    frost_breath: {
        baseRef: 'breath',
        telegraph: {
            type: 'cone_fixed',
            angle: Math.PI / 3,
            radius: 4.0,
            color: '#4488FF',
            borderColor: '#88CCFF',
            lockDirection: true
        },
        channel: {
            duration: 1500,
            tickInterval: 300,
            streaming: true
        },
        particles: { type: 'ice', spawnMode: 'cone_fill', flowDirection: 'outward', color: '#AADDFF' },
        statusEffect: { type: 'slow', amount: 0.4, duration: 2000 },
        hitDetection: 'isInsideCone',
        audio: { telegraph: 'ability_breath_inhale', channel: 'ability_frost_breath_loop', impact: null }
    },

    poison_cloud: {
        baseRef: 'breath',
        telegraph: {
            type: 'cone_fixed',
            angle: Math.PI / 2,  // 90 degrees
            radius: 3.0,
            color: '#44AA44',
            borderColor: '#66CC66',
            lockDirection: true
        },
        channel: {
            duration: 2000,
            tickInterval: 400,
            streaming: true,
            linger: 1000  // Cloud persists 1s after channel
        },
        particles: { type: 'poison', spawnMode: 'cone_fill', flowDirection: 'outward', color: '#66CC66' },
        statusEffect: { type: 'poison', duration: 4000 },
        hitDetection: 'isInsideCone',
        audio: { telegraph: 'ability_breath_inhale', channel: 'ability_poison_cloud_loop', impact: null }
    },

    // ========================================================================
    // PROJECTILE ABILITIES (Base: homing-orb)
    // ========================================================================

    homing_orb: {
        baseRef: 'projectile',
        telegraph: {
            type: 'caster_charge',
            duration: 500,
            glowColor: '#FF6600',
            pulseRate: 200
        },
        projectile: {
            speed: 180,
            homing: true,
            turnRate: 90,
            sprite: 'orb',
            color: '#FF4400',
            persistsAfterCasterDeath: true
        },
        trail: { type: 'ember', spawnRate: 30, fadeTime: 300, color: '#FF8800' },
        impact: { type: 'burst', radius: 0.5, duration: 200, particles: 6, color: '#FFAA00' },
        audio: { telegraph: 'ability_projectile_charge', impact: 'ability_projectile_impact' }
    },

    projectile_burst: {
        baseRef: 'projectile',
        telegraph: {
            type: 'caster_charge',
            duration: 400,
            glowColor: '#FF8800',
            pulseRate: 150
        },
        projectile: {
            count: 3,
            spread: 30,  // degrees
            speed: 200,
            homing: false,
            sprite: 'bolt',
            color: '#FF6600',
            persistsAfterCasterDeath: true
        },
        trail: { type: 'spark', spawnRate: 20, fadeTime: 200, color: '#FFAA00' },
        impact: { type: 'spark', radius: 0.3, duration: 150, color: '#FFCC00' },
        audio: { telegraph: 'ability_projectile_charge', impact: 'ability_projectile_impact' }
    },

    projectile_single: {
        baseRef: 'projectile',
        telegraph: {
            type: 'caster_charge',
            duration: 300,
            glowColor: '#AAAAAA',
            pulseRate: 100
        },
        projectile: {
            speed: 220,
            homing: false,
            sprite: 'arrow',
            color: '#CCCCCC',
            persistsAfterCasterDeath: true
        },
        trail: { type: 'minimal', spawnRate: 10, fadeTime: 150, color: '#888888' },
        impact: { type: 'spark', radius: 0.2, duration: 100, color: '#FFFFFF' },
        audio: { telegraph: 'ability_projectile_charge', impact: 'ability_projectile_impact' }
    },

    web_shot: {
        baseRef: 'projectile',
        telegraph: {
            type: 'caster_charge',
            duration: 400,
            glowColor: '#CCCCCC',
            pulseRate: 250
        },
        projectile: {
            speed: 120,
            homing: true,
            turnRate: 30,  // Weak homing
            sprite: 'web',
            color: '#EEEEEE',
            persistsAfterCasterDeath: true
        },
        trail: { type: 'strand', spawnRate: 15, fadeTime: 500, color: '#DDDDDD' },
        impact: { type: 'splat', radius: 0.4, duration: 200, color: '#FFFFFF' },
        statusEffect: { type: 'root', duration: 1500 },
        audio: { telegraph: 'ability_web_charge', impact: 'ability_web_hit' }
    },

    // ========================================================================
    // BEAM ABILITIES (Base: beam)
    // ========================================================================

    life_drain: {
        baseRef: 'beam',
        telegraph: {
            type: 'beam_telegraph',
            style: 'dashed',
            width: 0.3,
            maxRange: 4,
            color: '#88FF88',
            lockDirection: true
        },
        channel: {
            type: 'beam_channel',
            duration: 200,
            trackingSpeed: 0,  // No tracking
            particleFlow: 'reverse'  // Particles flow toward caster
        },
        particles: { spawnMode: 'along_beam', flowDirection: 'reverse', color: '#44FF44' },
        casterFeedback: { type: 'heal_pulse', color: '#88FF88' },
        hitDetection: 'isInsideBeam',
        audio: { telegraph: 'ability_drain_charge', channel: 'ability_drain_loop', impact: null }
    },

    void_beam: {
        baseRef: 'beam',
        telegraph: {
            type: 'beam_telegraph',
            style: 'solid',
            width: 1.0,
            maxRange: 15,
            color: '#8844FF',
            lockDirection: true
        },
        channel: {
            type: 'beam_channel',
            duration: 2000,
            trackingSpeed: 30,  // Degrees/sec - beam slowly tracks target
            particleFlow: 'outward'
        },
        particles: { spawnMode: 'along_beam', flowDirection: 'outward', color: '#AA66FF' },
        hitDetection: 'isInsideBeam',
        audio: { telegraph: 'ability_beam_charge', channel: 'ability_beam_loop', impact: null }
    }
};

// ============================================================================
// DEFAULT AUDIO CONFIG - Fallback sounds by ability category
// ============================================================================
const ABILITY_AUDIO_DEFAULTS = {
    melee: { telegraph: 'ability_melee_charge', impact: 'ability_melee_hit' },
    ground: { telegraph: 'ability_slam_charge', impact: 'ability_slam_impact' },
    charge: { telegraph: 'ability_charge_windup', impact: 'ability_charge_hit' },
    breath: { telegraph: 'ability_breath_inhale', channel: 'ability_breath_loop', impact: null },
    projectile: { telegraph: 'ability_projectile_charge', impact: 'ability_projectile_impact' },
    beam: { telegraph: 'ability_beam_charge', channel: 'ability_beam_loop', impact: null }
};

if (typeof window !== 'undefined') {
    window.ABILITY_AUDIO_DEFAULTS = ABILITY_AUDIO_DEFAULTS;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.ABILITY_EFFECTS = ABILITY_EFFECTS;
}
