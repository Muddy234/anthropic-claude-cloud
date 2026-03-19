// ============================================================================
// BODYPART SPRITE CONFIG - Z-Order, State Machine, Animation Settings
// ============================================================================

const BODYPART_SPRITE_CONFIG = {

    // Z-order per direction (rendered back → front, last item draws on top)
    layerOrder: {
        down:  ['body', 'leftLeg', 'rightLeg', 'leftArm', 'rightArm', 'head'],
        up:    ['head', 'body', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg'],
        left:  ['rightArm', 'rightLeg', 'body', 'leftLeg', 'leftArm', 'head'],
        right: ['leftArm', 'leftLeg', 'body', 'rightLeg', 'rightArm', 'head']
    },

    // Animation state machine
    states: {
        idle:      { looping: true,  frameCount: 1 },
        walking:   { looping: true,  frameCount: 6 },
        attacking: { looping: false, frameCount: 6 },
        hit:       { looping: false, frameCount: 3 },
        dying:     { looping: false, frameCount: 6 }
    },

    // Valid state transitions: from → [allowed targets]
    transitions: {
        idle:      ['walking', 'attacking', 'hit', 'dying'],
        walking:   ['idle', 'attacking', 'hit', 'dying'],
        attacking: ['idle', 'walking', 'hit', 'dying'],
        hit:       ['idle', 'walking', 'attacking', 'dying'],
        dying:     []  // Terminal state
    },

    // Animation speed
    walkFPS: 8,          // Base FPS for walk cycle (750ms per 6-frame loop)
    minFPS: 2,           // Minimum clamp (prevent frozen-looking animation)
    maxFPS: 16,          // Maximum clamp (prevent strobing)

    // Speed scaling: effectiveFPS = walkFPS * clamp(moveSpeed, minSpeedMult, maxSpeedMult)
    minSpeedMult: 0.25,
    maxSpeedMult: 2.0,

    // Canvas dimensions (must match sprite data)
    spriteWidth: 32,
    spriteHeight: 32,

    // Right direction derivation
    // Right is derived from left by: flipX on sprites, swap left/right parts, negate dx
    deriveRight: true,

    // Parts that get swapped when deriving right from left
    mirrorSwaps: {
        leftArm:  'rightArm',
        rightArm: 'leftArm',
        leftLeg:  'rightLeg',
        rightLeg: 'leftLeg',
        head:     'head',
        body:     'body'
    }
};

// Export for browser and Node.js
if (typeof window !== 'undefined') {
    window.BODYPART_SPRITE_CONFIG = BODYPART_SPRITE_CONFIG;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BODYPART_SPRITE_CONFIG };
}
