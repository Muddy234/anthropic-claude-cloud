// ============================================================================
// EFFECT ANIMATIONS - Frame Sequences for Attack Effects
// ============================================================================
// Defines animation frame sequences using delta-based modifications.
// Each animation has phases (windup, active, recovery) with frame arrays.
// Based on signature-ability-implementation-plan-v2.md
// ============================================================================

const EffectAnimations = {
    // ========================================================================
    // MELEE ATTACK ANIMATIONS (12)
    // ========================================================================

    claw_swipe: {
        name: 'claw_swipe',
        sprite: 'claw_swipe',
        totalDuration: 300,
        phases: {
            active: [
                { duration: 30, scaleX: 0.8, scaleY: 0.9, alpha: 0.8, rotation: -20 },
                { duration: 40, scaleX: 0.95, scaleY: 1.0, alpha: 0.95, rotation: -5 },
                { duration: 50, scaleX: 1.1, scaleY: 1.0, alpha: 1.0, rotation: 10, paletteMod: { brightness: 1.2 } },
                { duration: 60, scaleX: 1.15, scaleY: 1.0, alpha: 1.0, rotation: 25 },
                { duration: 50, scaleX: 1.1, scaleY: 0.95, alpha: 0.8, rotation: 35 },
                { duration: 40, scaleX: 1.0, scaleY: 0.9, alpha: 0.5, rotation: 42 },
                { duration: 30, scaleX: 0.9, scaleY: 0.85, alpha: 0.2, rotation: 48 }
            ]
        }
    },

    bite: {
        name: 'bite',
        sprite: 'bite',
        totalDuration: 300,
        phases: {
            active: [
                { duration: 30, scaleX: 1.2, scaleY: 0.6, alpha: 0.7 },
                { duration: 30, scaleX: 1.1, scaleY: 0.7, alpha: 0.85 },
                { duration: 40, scaleX: 1.0, scaleY: 1.0, alpha: 1.0 },
                { duration: 60, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.2 } },
                { duration: 70, scaleX: 1.1, scaleY: 1.1, alpha: 0.6 },
                { duration: 70, scaleX: 1.2, scaleY: 1.2, alpha: 0.2 }
            ]
        }
    },

    melee_swing: {
        name: 'melee_swing',
        sprite: 'melee_swing',
        totalDuration: 400,
        phases: {
            windup: [
                { duration: 50, scaleX: 0.8, scaleY: 0.9, alpha: 0.8, rotation: -45 },
                { duration: 50, scaleX: 0.9, scaleY: 1.0, alpha: 0.9, rotation: -30 }
            ],
            active: [
                { duration: 50, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, rotation: -15 },
                { duration: 50, scaleX: 1.1, scaleY: 1.0, alpha: 1.0, rotation: 15 },
                { duration: 60, scaleX: 1.2, scaleY: 1.0, alpha: 1.0, rotation: 40, paletteMod: { brightness: 1.2 } },
                { duration: 60, scaleX: 1.1, scaleY: 1.0, alpha: 0.9, rotation: 55 }
            ],
            recovery: [
                { duration: 40, scaleX: 1.0, scaleY: 0.95, alpha: 0.6, rotation: 65 },
                { duration: 40, scaleX: 0.9, scaleY: 0.9, alpha: 0.3, rotation: 70 }
            ]
        }
    },

    pounce: {
        name: 'pounce',
        sprite: 'pounce',
        totalDuration: 400,
        phases: {
            windup: [
                { duration: 60, scaleX: 0.85, scaleY: 0.9, alpha: 0.8, verticalOffset: 5 }
            ],
            active: [
                { duration: 50, scaleX: 0.95, scaleY: 1.0, alpha: 0.95, verticalOffset: 2 },
                { duration: 50, scaleX: 1.05, scaleY: 1.0, alpha: 1.0, verticalOffset: 0 },
                { duration: 70, scaleX: 1.15, scaleY: 1.0, alpha: 1.0, verticalOffset: -3, paletteMod: { brightness: 1.3 } },
                { duration: 60, scaleX: 1.2, scaleY: 0.95, alpha: 1.0, verticalOffset: 0 }
            ],
            recovery: [
                { duration: 55, scaleX: 1.15, scaleY: 1.1, alpha: 0.6 },
                { duration: 55, scaleX: 1.1, scaleY: 1.1, alpha: 0.25 }
            ]
        }
    },

    charge: {
        name: 'charge',
        sprite: 'charge',
        totalDuration: 600,
        phases: {
            windup: [
                { duration: 100, scaleX: 0.85, scaleY: 0.95, alpha: 0.8 },
                { duration: 100, scaleX: 0.95, scaleY: 1.0, alpha: 0.9 }
            ],
            active: [
                { duration: 60, scaleX: 1.05, scaleY: 1.0, alpha: 1.0, horizontalOffset: -15 },
                { duration: 60, scaleX: 1.15, scaleY: 0.95, alpha: 1.0, horizontalOffset: -5 },
                { duration: 80, scaleX: 1.25, scaleY: 0.9, alpha: 1.0, horizontalOffset: 0, paletteMod: { brightness: 1.3 } },
                { duration: 60, scaleX: 1.15, scaleY: 0.95, alpha: 1.0, horizontalOffset: 5 }
            ],
            recovery: [
                { duration: 70, scaleX: 1.05, scaleY: 1.0, alpha: 0.6, horizontalOffset: 10 },
                { duration: 70, scaleX: 1.0, scaleY: 1.0, alpha: 0.25, horizontalOffset: 15 }
            ]
        }
    },

    heavy_slam: {
        name: 'heavy_slam',
        sprite: 'heavy_slam',
        totalDuration: 800,
        phases: {
            windup: [
                { duration: 120, scaleX: 0.8, scaleY: 0.85, alpha: 0.7, verticalOffset: -20 },
                { duration: 120, scaleX: 0.9, scaleY: 0.9, alpha: 0.85, verticalOffset: -12 },
                { duration: 100, scaleX: 0.95, scaleY: 0.95, alpha: 0.95, verticalOffset: -5 }
            ],
            active: [
                { duration: 100, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, verticalOffset: 0 },
                { duration: 150, scaleX: 1.2, scaleY: 0.8, alpha: 1.0, verticalOffset: 5, paletteMod: { brightness: 1.4 } },
                { duration: 150, scaleX: 1.4, scaleY: 1.4, alpha: 1.0, paletteMod: { brightness: 1.2 } }
            ],
            recovery: [
                { duration: 100, scaleX: 1.5, scaleY: 1.5, alpha: 0.6 },
                { duration: 100, scaleX: 1.6, scaleY: 1.6, alpha: 0.2 }
            ]
        }
    },

    ground_slam: {
        name: 'ground_slam',
        sprite: 'ground_slam',
        totalDuration: 1000,
        phases: {
            windup: [
                { duration: 200, scaleX: 0.3, scaleY: 0.3, alpha: 0.3 },
                { duration: 200, scaleX: 0.5, scaleY: 0.5, alpha: 0.5 }
            ],
            active: [
                { duration: 100, scaleX: 0.7, scaleY: 0.7, alpha: 0.8, paletteMod: { brightness: 1.2 } },
                { duration: 100, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.5 } },
                { duration: 150, scaleX: 1.3, scaleY: 1.3, alpha: 1.0, paletteMod: { brightness: 1.3 } }
            ],
            recovery: [
                { duration: 125, scaleX: 1.5, scaleY: 1.5, alpha: 0.6 },
                { duration: 125, scaleX: 1.7, scaleY: 1.7, alpha: 0.2 }
            ]
        }
    },

    sweep: {
        name: 'sweep',
        sprite: 'sweep',
        totalDuration: 1000,
        phases: {
            windup: [
                { duration: 150, scaleX: 0.3, scaleY: 0.8, alpha: 0.4, rotation: -90 },
                { duration: 150, scaleX: 0.5, scaleY: 0.9, alpha: 0.6, rotation: -60 }
            ],
            active: [
                { duration: 100, scaleX: 0.7, scaleY: 1.0, alpha: 0.9, rotation: -30 },
                { duration: 100, scaleX: 0.9, scaleY: 1.0, alpha: 1.0, rotation: 0 },
                { duration: 150, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, rotation: 45 },
                { duration: 100, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, rotation: 90 }
            ],
            recovery: [
                { duration: 125, scaleX: 0.9, scaleY: 0.9, alpha: 0.5, rotation: 120 },
                { duration: 125, scaleX: 0.7, scaleY: 0.7, alpha: 0.2, rotation: 135 }
            ]
        }
    },

    stomp: {
        name: 'stomp',
        sprite: 'stomp',
        totalDuration: 600,
        phases: {
            windup: [
                { duration: 100, scaleX: 0.3, scaleY: 0.3, alpha: 0.3 }
            ],
            active: [
                { duration: 80, scaleX: 0.6, scaleY: 0.6, alpha: 0.7 },
                { duration: 80, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.4 } },
                { duration: 120, scaleX: 1.3, scaleY: 1.3, alpha: 1.0, paletteMod: { brightness: 1.2 } }
            ],
            recovery: [
                { duration: 110, scaleX: 1.5, scaleY: 1.5, alpha: 0.5 },
                { duration: 110, scaleX: 1.7, scaleY: 1.7, alpha: 0.2 }
            ]
        }
    },

    lunge: {
        name: 'lunge',
        sprite: 'lunge',
        totalDuration: 400,
        phases: {
            active: [
                { duration: 60, scaleX: 0.5, scaleY: 0.8, alpha: 0.6, horizontalOffset: -15 },
                { duration: 60, scaleX: 0.8, scaleY: 0.9, alpha: 0.9, horizontalOffset: -8 },
                { duration: 80, scaleX: 1.2, scaleY: 1.0, alpha: 1.0, horizontalOffset: 0 },
                { duration: 80, scaleX: 1.3, scaleY: 0.9, alpha: 1.0, horizontalOffset: 8, paletteMod: { brightness: 1.2 } },
                { duration: 60, scaleX: 1.2, scaleY: 0.9, alpha: 0.6, horizontalOffset: 15 },
                { duration: 60, scaleX: 1.0, scaleY: 0.8, alpha: 0.2, horizontalOffset: 20 }
            ]
        }
    },

    double_strike: {
        name: 'double_strike',
        sprite: 'double_strike',
        totalDuration: 500,
        phases: {
            active: [
                // First strike
                { duration: 50, scaleX: 0.5, scaleY: 0.5, alpha: 0.7 },
                { duration: 60, scaleX: 1.0, scaleY: 1.0, alpha: 1.0 },
                { duration: 60, scaleX: 1.1, scaleY: 1.1, alpha: 0.8, paletteMod: { brightness: 1.3 } },
                // Brief pause
                { duration: 40, scaleX: 0.8, scaleY: 0.8, alpha: 0.4 },
                // Second strike
                { duration: 50, scaleX: 0.6, scaleY: 0.6, alpha: 0.8 },
                { duration: 60, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.2 } },
                { duration: 60, scaleX: 1.2, scaleY: 1.2, alpha: 1.0, paletteMod: { brightness: 1.5 } },
                { duration: 60, scaleX: 1.3, scaleY: 1.3, alpha: 0.3 },
                { duration: 60, scaleX: 1.4, scaleY: 1.4, alpha: 0.1 }
            ]
        }
    },

    tail_whip: {
        name: 'tail_whip',
        sprite: 'tail_whip',
        totalDuration: 500,
        phases: {
            windup: [
                { duration: 80, scaleX: 0.5, scaleY: 0.8, alpha: 0.5, rotation: -60 }
            ],
            active: [
                { duration: 60, scaleX: 0.7, scaleY: 0.9, alpha: 0.8, rotation: -30 },
                { duration: 80, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, rotation: 0, paletteMod: { brightness: 1.2 } },
                { duration: 80, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, rotation: 30 },
                { duration: 60, scaleX: 0.9, scaleY: 0.9, alpha: 0.9, rotation: 60 }
            ],
            recovery: [
                { duration: 70, scaleX: 0.7, scaleY: 0.7, alpha: 0.5, rotation: 80 },
                { duration: 70, scaleX: 0.5, scaleY: 0.5, alpha: 0.2, rotation: 90 }
            ]
        }
    },

    // ========================================================================
    // ASSASSIN / TELEPORT ANIMATIONS (2)
    // ========================================================================

    shadow_step: {
        name: 'shadow_step',
        sprite: 'shadow_step',
        totalDuration: 200,
        phases: {
            active: [
                { duration: 30, scaleX: 1.0, scaleY: 1.0, alpha: 0.9 },
                { duration: 40, scaleX: 1.2, scaleY: 1.2, alpha: 1.0, paletteMod: { brightness: 1.3 } },
                { duration: 40, scaleX: 1.4, scaleY: 1.4, alpha: 0.8 },
                { duration: 40, scaleX: 1.6, scaleY: 1.6, alpha: 0.5 },
                { duration: 50, scaleX: 2.0, scaleY: 2.0, alpha: 0.2 }
            ]
        }
    },

    teleport_strike: {
        name: 'teleport_strike',
        sprite: 'teleport_strike',
        totalDuration: 500,
        phases: {
            windup: [
                { duration: 80, scaleX: 0.3, scaleY: 0.3, alpha: 0.4 },
                { duration: 80, scaleX: 0.6, scaleY: 0.6, alpha: 0.7 }
            ],
            active: [
                { duration: 60, scaleX: 0.9, scaleY: 0.9, alpha: 1.0 },
                { duration: 80, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.4 } },
                { duration: 80, scaleX: 1.1, scaleY: 1.1, alpha: 1.0, paletteMod: { brightness: 1.2 } }
            ],
            recovery: [
                { duration: 60, scaleX: 1.2, scaleY: 1.2, alpha: 0.5 },
                { duration: 60, scaleX: 1.4, scaleY: 1.4, alpha: 0.2 }
            ]
        }
    },

    // ========================================================================
    // RANGED PROJECTILE ANIMATIONS (4)
    // ========================================================================

    web_shot: {
        name: 'web_shot',
        sprite: 'web_shot',
        totalDuration: 300,
        looping: true,  // Loops during travel
        phases: {
            travel: [
                { duration: 75, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, rotation: 0 },
                { duration: 75, scaleX: 1.05, scaleY: 0.95, alpha: 1.0, rotation: 45 },
                { duration: 75, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, rotation: 90 },
                { duration: 75, scaleX: 0.95, scaleY: 1.05, alpha: 1.0, rotation: 135 }
            ],
            impact: [
                { duration: 40, scaleX: 1.2, scaleY: 1.2, alpha: 1.0 },
                { duration: 60, scaleX: 1.5, scaleY: 1.5, alpha: 0.8 },
                { duration: 60, scaleX: 1.8, scaleY: 1.8, alpha: 0.4 },
                { duration: 40, scaleX: 2.0, scaleY: 2.0, alpha: 0.1 }
            ]
        }
    },

    projectile_single: {
        name: 'projectile_single',
        sprite: 'projectile_single',
        totalDuration: 200,
        looping: true,
        phases: {
            travel: [
                { duration: 50, scaleX: 1.0, scaleY: 1.0, alpha: 1.0 },
                { duration: 50, scaleX: 1.1, scaleY: 0.9, alpha: 1.0, paletteMod: { brightness: 1.1 } },
                { duration: 50, scaleX: 1.0, scaleY: 1.0, alpha: 1.0 },
                { duration: 50, scaleX: 0.9, scaleY: 1.1, alpha: 1.0, paletteMod: { brightness: 0.9 } }
            ],
            impact: [
                { duration: 30, scaleX: 1.3, scaleY: 1.3, alpha: 1.0, paletteMod: { brightness: 1.5 } },
                { duration: 40, scaleX: 1.0, scaleY: 1.0, alpha: 0.5 },
                { duration: 30, scaleX: 0.5, scaleY: 0.5, alpha: 0.1 }
            ]
        }
    },

    projectile_burst: {
        name: 'projectile_burst',
        sprite: 'projectile_burst',
        totalDuration: 250,
        looping: true,
        phases: {
            travel: [
                { duration: 40, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.0 } },
                { duration: 40, scaleX: 1.1, scaleY: 0.9, alpha: 1.0, paletteMod: { brightness: 1.2 } },
                { duration: 45, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.0 } },
                { duration: 40, scaleX: 0.9, scaleY: 1.1, alpha: 1.0, paletteMod: { brightness: 1.3 } },
                { duration: 45, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.1 } }
            ],
            impact: [
                { duration: 40, scaleX: 1.5, scaleY: 1.5, alpha: 1.0, paletteMod: { brightness: 1.5 } },
                { duration: 50, scaleX: 2.0, scaleY: 2.0, alpha: 0.6 },
                { duration: 50, scaleX: 2.5, scaleY: 2.5, alpha: 0.2 }
            ]
        }
    },

    homing_orb: {
        name: 'homing_orb',
        sprite: 'homing_orb',
        totalDuration: 400,
        looping: true,
        phases: {
            travel: [
                { duration: 80, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.0 } },
                { duration: 80, scaleX: 1.1, scaleY: 1.1, alpha: 1.0, paletteMod: { brightness: 1.2 } },
                { duration: 80, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.0 } },
                { duration: 80, scaleX: 0.9, scaleY: 0.9, alpha: 1.0, paletteMod: { brightness: 1.3 } },
                { duration: 80, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.1 } }
            ],
            impact: [
                { duration: 60, scaleX: 1.5, scaleY: 1.5, alpha: 1.0, paletteMod: { brightness: 1.6 } },
                { duration: 80, scaleX: 2.0, scaleY: 2.0, alpha: 0.7 },
                { duration: 80, scaleX: 2.5, scaleY: 2.5, alpha: 0.3 },
                { duration: 60, scaleX: 3.0, scaleY: 3.0, alpha: 0.1 }
            ]
        }
    },

    // ========================================================================
    // BREATH / CONE ANIMATIONS (3)
    // ========================================================================

    fire_breath: {
        name: 'fire_breath',
        sprite: 'fire_breath',
        totalDuration: 1000,
        phases: {
            windup: [
                { duration: 150, scaleX: 0.2, scaleY: 0.3, alpha: 0.3 },
                { duration: 150, scaleX: 0.4, scaleY: 0.5, alpha: 0.5 }
            ],
            active: [
                { duration: 100, scaleX: 0.6, scaleY: 0.7, alpha: 0.8, paletteMod: { brightness: 1.1 } },
                { duration: 100, scaleX: 0.8, scaleY: 0.9, alpha: 1.0, paletteMod: { brightness: 1.3 } },
                { duration: 150, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.5 } },
                { duration: 150, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.3 } }
            ],
            recovery: [
                { duration: 100, scaleX: 0.9, scaleY: 0.9, alpha: 0.7, paletteMod: { brightness: 1.1 } },
                { duration: 100, scaleX: 0.7, scaleY: 0.7, alpha: 0.4 }
            ]
        }
    },

    frost_breath: {
        name: 'frost_breath',
        sprite: 'frost_breath',
        totalDuration: 1000,
        phases: {
            windup: [
                { duration: 150, scaleX: 0.2, scaleY: 0.3, alpha: 0.3 },
                { duration: 150, scaleX: 0.4, scaleY: 0.5, alpha: 0.5 }
            ],
            active: [
                { duration: 100, scaleX: 0.6, scaleY: 0.7, alpha: 0.8, paletteMod: { brightness: 1.1 } },
                { duration: 100, scaleX: 0.8, scaleY: 0.9, alpha: 1.0, paletteMod: { brightness: 1.2 } },
                { duration: 150, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.3 } },
                { duration: 150, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.1 } }
            ],
            recovery: [
                { duration: 100, scaleX: 0.9, scaleY: 0.9, alpha: 0.7 },
                { duration: 100, scaleX: 0.7, scaleY: 0.7, alpha: 0.4 }
            ]
        }
    },

    poison_cloud: {
        name: 'poison_cloud',
        sprite: 'poison_cloud',
        totalDuration: 700,
        phases: {
            windup: [
                { duration: 100, scaleX: 0.3, scaleY: 0.4, alpha: 0.4 }
            ],
            active: [
                { duration: 80, scaleX: 0.5, scaleY: 0.6, alpha: 0.7 },
                { duration: 80, scaleX: 0.7, scaleY: 0.8, alpha: 0.9 },
                { duration: 100, scaleX: 0.9, scaleY: 0.95, alpha: 1.0, paletteMod: { brightness: 1.2 } },
                { duration: 120, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.1 } }
            ],
            linger: [
                { duration: 110, scaleX: 1.0, scaleY: 1.0, alpha: 0.9 },
                { duration: 110, scaleX: 1.05, scaleY: 1.05, alpha: 0.7 }
            ]
        }
    },

    // ========================================================================
    // BEAM / DRAIN ANIMATIONS (2)
    // ========================================================================

    void_beam: {
        name: 'void_beam',
        sprite: 'void_beam',
        totalDuration: 1500,
        sustainedDuration: 2000,  // 2s sweep after telegraph
        phases: {
            windup: [
                { duration: 300, scaleX: 0.2, scaleY: 0.3, alpha: 0.3 },
                { duration: 300, scaleX: 0.4, scaleY: 0.5, alpha: 0.5 },
                { duration: 300, scaleX: 0.6, scaleY: 0.7, alpha: 0.7 },
                { duration: 300, scaleX: 0.8, scaleY: 0.9, alpha: 0.9 }
            ],
            active: [
                { duration: 150, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.5 } },
                { duration: 200, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.3 } },
                { duration: 200, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.5 } },
                { duration: 200, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.2 } }
            ]
        }
    },

    life_drain: {
        name: 'life_drain',
        sprite: 'life_drain',
        totalDuration: 600,
        phases: {
            windup: [
                { duration: 100, scaleX: 0.3, scaleY: 0.5, alpha: 0.4 }
            ],
            active: [
                { duration: 80, scaleX: 0.6, scaleY: 0.8, alpha: 0.7 },
                { duration: 80, scaleX: 0.9, scaleY: 1.0, alpha: 1.0 },
                { duration: 100, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.3 } },
                { duration: 100, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.1 } }
            ],
            recovery: [
                { duration: 70, scaleX: 0.8, scaleY: 0.9, alpha: 0.6 },
                { duration: 70, scaleX: 0.5, scaleY: 0.6, alpha: 0.3 }
            ]
        }
    },

    // ========================================================================
    // IMPACT ANIMATIONS
    // ========================================================================

    impact_spark: {
        name: 'impact_spark',
        sprite: 'impact_spark',
        totalDuration: 150,
        phases: {
            active: [
                { duration: 30, scaleX: 0.5, scaleY: 0.5, alpha: 1.0, paletteMod: { brightness: 1.5 } },
                { duration: 40, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.3 } },
                { duration: 40, scaleX: 1.3, scaleY: 1.3, alpha: 0.6 },
                { duration: 40, scaleX: 1.5, scaleY: 1.5, alpha: 0.2 }
            ]
        }
    },

    hit_slash: {
        name: 'hit_slash',
        sprite: 'hit_slash',
        totalDuration: 120,
        phases: {
            active: [
                { duration: 20, scaleX: 0.6, scaleY: 0.6, alpha: 0.8 },
                { duration: 30, scaleX: 1.0, scaleY: 1.0, alpha: 1.0, paletteMod: { brightness: 1.4 } },
                { duration: 30, scaleX: 1.2, scaleY: 1.2, alpha: 0.7 },
                { duration: 40, scaleX: 1.4, scaleY: 1.4, alpha: 0.2 }
            ]
        }
    },

    // ========================================================================
    // HELPER METHODS
    // ========================================================================

    /**
     * Get animation by name
     */
    get(animationName) {
        return this[animationName] || null;
    },

    /**
     * Get all frames for an animation (flattened across all phases)
     */
    getAllFrames(animationName) {
        const anim = this[animationName];
        if (!anim || !anim.phases) return [];

        const frames = [];
        for (const phase of Object.values(anim.phases)) {
            frames.push(...phase);
        }
        return frames;
    },

    /**
     * Get total frame count for an animation
     */
    getFrameCount(animationName) {
        return this.getAllFrames(animationName).length;
    },

    /**
     * Calculate actual duration from frames
     */
    calculateDuration(animationName) {
        const frames = this.getAllFrames(animationName);
        return frames.reduce((sum, frame) => sum + frame.duration, 0);
    },

    /**
     * List all animation names
     */
    listAnimations() {
        return Object.keys(this).filter(key =>
            typeof this[key] === 'object' && this[key].phases
        );
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.EffectAnimations = EffectAnimations;
}
