// ============================================================================
// BODYPART WALK ANIMATION - Idle + 6-Frame Walk Cycle Offset Data
// ============================================================================
// Offset-only animation: each body part shifts by (dx, dy) pixels per frame.
// No rotation. Right direction derived at runtime from left.
// ============================================================================

const BODYPART_WALK_ANIMATION = {

    // Idle state: all offsets 0,0 — true neutral standing pose
    idle: {
        down:  { body: [0,0], head: [0,0], leftArm: [0,0], rightArm: [0,0], leftLeg: [0,0], rightLeg: [0,0] },
        up:    { body: [0,0], head: [0,0], leftArm: [0,0], rightArm: [0,0], leftLeg: [0,0], rightLeg: [0,0] },
        left:  { body: [0,0], head: [0,0], leftArm: [0,0], rightArm: [0,0], leftLeg: [0,0], rightLeg: [0,0] }
        // right: derived from left at runtime
    },

    // 6-frame walk cycle at 8 FPS (750ms loop)
    //
    // Walk Cycle Pattern:
    //   Frame 0: Right foot contact  (neutral body, legs split)
    //   Frame 1: Weight settling     (body dips dy:+1, legs planted)
    //   Frame 2: Legs passing        (head anticipates dy:-1, limbs returning center)
    //   Frame 3: Left foot contact   (neutral, arms/legs mirror of frame 0)
    //   Frame 4: Weight settling     (body dips dy:+1, legs planted)
    //   Frame 5: Legs passing        (head anticipates dy:-1, limbs returning center)

    walk: {
        // DOWN direction (front-facing, toward camera)
        // Arms: ±1 dy vertical swing (forward toward camera = +1, back = -1)
        // Legs: ±1 dy vertical stride
        down: [
            // Frame 0: Right foot contact — left arm forward(+1), right arm back(-1)
            { body: [0,0],  head: [0,0],  leftArm: [0,1],  rightArm: [0,-1],  leftLeg: [0,1],   rightLeg: [0,-1] },
            // Frame 1: Weight settling
            { body: [0,1],  head: [0,1],  leftArm: [0,1],  rightArm: [0,-1],  leftLeg: [0,1],   rightLeg: [0,0] },
            // Frame 2: Legs passing
            { body: [0,0],  head: [0,-1], leftArm: [0,0],  rightArm: [0,0],   leftLeg: [0,0],   rightLeg: [0,0] },
            // Frame 3: Left foot contact — arms swap
            { body: [0,0],  head: [0,0],  leftArm: [0,-1], rightArm: [0,1],   leftLeg: [0,-1],  rightLeg: [0,1] },
            // Frame 4: Weight settling
            { body: [0,1],  head: [0,1],  leftArm: [0,-1], rightArm: [0,1],   leftLeg: [0,0],   rightLeg: [0,1] },
            // Frame 5: Legs passing
            { body: [0,0],  head: [0,-1], leftArm: [0,0],  rightArm: [0,0],   leftLeg: [0,0],   rightLeg: [0,0] }
        ],

        // UP direction (back-facing, walking away)
        // Arms: ±1 dy vertical swing (forward away from camera = -1, back = +1)
        up: [
            // Frame 0: Right foot contact — left arm forward(-1), right arm back(+1)
            { body: [0,0],  head: [0,0],  leftArm: [0,-1], rightArm: [0,1],   leftLeg: [0,1],   rightLeg: [0,-1] },
            // Frame 1: Weight settling
            { body: [0,1],  head: [0,1],  leftArm: [0,-1], rightArm: [0,1],   leftLeg: [0,1],   rightLeg: [0,0] },
            // Frame 2: Legs passing
            { body: [0,0],  head: [0,-1], leftArm: [0,0],  rightArm: [0,0],   leftLeg: [0,0],   rightLeg: [0,0] },
            // Frame 3: Left foot contact — arms swap
            { body: [0,0],  head: [0,0],  leftArm: [0,1],  rightArm: [0,-1],  leftLeg: [0,-1],  rightLeg: [0,1] },
            // Frame 4: Weight settling
            { body: [0,1],  head: [0,1],  leftArm: [0,1],  rightArm: [0,-1],  leftLeg: [0,0],   rightLeg: [0,1] },
            // Frame 5: Legs passing
            { body: [0,0],  head: [0,-1], leftArm: [0,0],  rightArm: [0,0],   leftLeg: [0,0],   rightLeg: [0,0] }
        ],

        // LEFT direction (side-facing)
        // Arms: ±1 dx horizontal swing
        // Legs: ±1 dx stride + dy:-1 lift on the stepping foot at contact
        left: [
            // Frame 0: Right foot contact — left leg forward with lift
            { body: [0,0],  head: [0,0],  leftArm: [1,0],  rightArm: [-1,0],  leftLeg: [1,-1],  rightLeg: [-1,0] },
            // Frame 1: Weight settling — foot plants
            { body: [0,1],  head: [0,1],  leftArm: [1,0],  rightArm: [-1,0],  leftLeg: [1,0],   rightLeg: [-1,0] },
            // Frame 2: Legs passing
            { body: [0,0],  head: [0,-1], leftArm: [0,0],  rightArm: [0,0],   leftLeg: [0,0],   rightLeg: [0,0] },
            // Frame 3: Left foot contact — right leg forward with lift
            { body: [0,0],  head: [0,0],  leftArm: [-1,0], rightArm: [1,0],   leftLeg: [-1,0],  rightLeg: [1,-1] },
            // Frame 4: Weight settling — foot plants
            { body: [0,1],  head: [0,1],  leftArm: [-1,0], rightArm: [1,0],   leftLeg: [-1,0],  rightLeg: [1,0] },
            // Frame 5: Legs passing
            { body: [0,0],  head: [0,-1], leftArm: [0,0],  rightArm: [0,0],   leftLeg: [0,0],   rightLeg: [0,0] }
        ]

        // right: derived at runtime from left by:
        //   1. Using left sprites with flipX = true
        //   2. Swapping leftArm↔rightArm and leftLeg↔rightLeg offset assignments
        //   3. Negating all dx values
    }
};

// Export for browser and Node.js
if (typeof window !== 'undefined') {
    window.BODYPART_WALK_ANIMATION = BODYPART_WALK_ANIMATION;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BODYPART_WALK_ANIMATION };
}
