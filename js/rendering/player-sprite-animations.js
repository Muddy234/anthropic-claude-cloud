/**
 * Player Sprite Animations
 * Delta-based animation definitions for walk, idle, and attack states
 * Updated for 32x32 warrior sprites
 *
 * Uses offset-based animation for robustness across sprite changes
 */

const PLAYER_ANIMATIONS = {
    // Walk animation - 4 frames with bob effect
    walk: {
        framesPerSecond: 8,
        loop: true,
        frames: {
            // Frame 0: Neutral stance (base sprite)
            0: {
                duration: 125,
                deltas: {},
                verticalOffset: 0,
                horizontalOffset: 0,
                scaleX: 1.0,
                scaleY: 1.0
            },
            // Frame 1: Bob up, slight lean forward
            1: {
                duration: 125,
                deltas: {},
                verticalOffset: -2,  // Bob up
                horizontalOffset: 1,
                scaleX: 1.0,
                scaleY: 1.02  // Slight stretch
            },
            // Frame 2: Neutral (passing through)
            2: {
                duration: 125,
                deltas: {},
                verticalOffset: 0,
                horizontalOffset: 0,
                scaleX: 1.0,
                scaleY: 1.0
            },
            // Frame 3: Bob up, slight lean other direction
            3: {
                duration: 125,
                deltas: {},
                verticalOffset: -2,  // Bob up
                horizontalOffset: -1,
                scaleX: 1.0,
                scaleY: 1.02  // Slight stretch
            }
        }
    },

    // Idle animation - warrior breathing/readiness
    idle: {
        framesPerSecond: 2,
        loop: true,
        frames: {
            0: {
                duration: 600,
                deltas: {},
                verticalOffset: 0,
                horizontalOffset: 0,
                scaleX: 1.0,
                scaleY: 1.0
            },
            1: {
                duration: 400,
                deltas: {},
                verticalOffset: 0,
                horizontalOffset: 0,
                scaleX: 1.0,
                scaleY: 0.98  // Breathe in - slight compress
            },
            2: {
                duration: 600,
                deltas: {},
                verticalOffset: 0,
                horizontalOffset: 0,
                scaleX: 1.0,
                scaleY: 1.0
            },
            3: {
                duration: 400,
                deltas: {},
                verticalOffset: -1,
                horizontalOffset: 0,
                scaleX: 1.01,
                scaleY: 1.01  // Breathe out - slight expand
            }
        }
    },

    // Attack animation - aggressive weapon swing
    attack: {
        framesPerSecond: 12,
        loop: false,
        frames: {
            // Windup - pull back
            0: {
                duration: 100,
                deltas: {},
                verticalOffset: 1,
                horizontalOffset: -3,
                scaleX: 0.95,
                scaleY: 1.02,
                phase: 'windup'
            },
            // Strike - lunge forward
            1: {
                duration: 60,
                deltas: {},
                verticalOffset: -1,
                horizontalOffset: 5,
                scaleX: 1.12,
                scaleY: 0.98,
                phase: 'strike'
            },
            // Impact
            2: {
                duration: 50,
                deltas: {},
                verticalOffset: 0,
                horizontalOffset: 3,
                scaleX: 1.06,
                scaleY: 1.0,
                phase: 'strike'
            },
            // Recovery - return to stance
            3: {
                duration: 100,
                deltas: {},
                verticalOffset: 0,
                horizontalOffset: 0,
                scaleX: 1.0,
                scaleY: 1.0,
                phase: 'recovery'
            }
        }
    },

    // Dodge animation - quick sidestep
    dodge: {
        framesPerSecond: 16,
        loop: false,
        frames: {
            0: {
                duration: 60,
                deltas: {},
                verticalOffset: -2,
                horizontalOffset: 4,
                scaleX: 0.9,
                scaleY: 1.1,
                phase: 'dodge'
            },
            1: {
                duration: 80,
                deltas: {},
                verticalOffset: -3,
                horizontalOffset: 8,
                scaleX: 0.85,
                scaleY: 1.15,
                phase: 'dodge'
            },
            2: {
                duration: 60,
                deltas: {},
                verticalOffset: -1,
                horizontalOffset: 4,
                scaleX: 0.95,
                scaleY: 1.05,
                phase: 'recovery'
            },
            3: {
                duration: 50,
                deltas: {},
                verticalOffset: 0,
                horizontalOffset: 0,
                scaleX: 1.0,
                scaleY: 1.0,
                phase: 'recovery'
            }
        }
    },

    // Hit/damage taken animation
    hit: {
        framesPerSecond: 10,
        loop: false,
        frames: {
            0: {
                duration: 80,
                deltas: {},
                verticalOffset: 0,
                horizontalOffset: -3,
                scaleX: 0.95,
                scaleY: 1.0,
                phase: 'recoil'
            },
            1: {
                duration: 100,
                deltas: {},
                verticalOffset: 1,
                horizontalOffset: -2,
                scaleX: 0.98,
                scaleY: 0.98,
                phase: 'recoil'
            },
            2: {
                duration: 80,
                deltas: {},
                verticalOffset: 0,
                horizontalOffset: 0,
                scaleX: 1.0,
                scaleY: 1.0,
                phase: 'recovery'
            }
        }
    }
};

// Helper to get frame data
function getPlayerAnimationFrame(animationType, frameIndex, direction) {
    const anim = PLAYER_ANIMATIONS[animationType];
    if (!anim) return null;

    const frame = anim.frames[frameIndex] || anim.frames[0];
    let deltas = {};

    // Get direction-specific deltas if available
    if (frame.deltas && frame.deltas[direction]) {
        deltas = frame.deltas[direction];
    } else if (frame.deltas && typeof frame.deltas === 'object' && !frame.deltas.down) {
        // Generic deltas (not direction-specific)
        deltas = frame.deltas;
    }

    return {
        ...frame,
        deltas: deltas
    };
}

// Make available globally
if (typeof window !== 'undefined') {
    window.PLAYER_ANIMATIONS = PLAYER_ANIMATIONS;
    window.getPlayerAnimationFrame = getPlayerAnimationFrame;
}
