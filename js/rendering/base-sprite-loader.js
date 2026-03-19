// ============================================================================
// BASE SPRITE LOADER - Assembles individual body parts into BODY_PART_SPRITES
// ============================================================================
// Expects these globals to already be loaded (18 files, 6 parts x 3 directions):
//   BASE_DOWN_HEAD, BASE_DOWN_BODY, BASE_DOWN_LEFT_ARM, BASE_DOWN_RIGHT_ARM, BASE_DOWN_LEFT_LEG, BASE_DOWN_RIGHT_LEG
//   BASE_UP_HEAD, BASE_UP_BODY, BASE_UP_LEFT_ARM, BASE_UP_RIGHT_ARM, BASE_UP_LEFT_LEG, BASE_UP_RIGHT_LEG
//   BASE_MIRROR_HEAD, BASE_MIRROR_BODY, BASE_MIRROR_LEFT_ARM, BASE_MIRROR_RIGHT_ARM, BASE_MIRROR_LEFT_LEG, BASE_MIRROR_RIGHT_LEG
// ============================================================================

const BODY_PART_SPRITES = {
    name: 'humanoid_base',
    width: 32,
    height: 32,

    directions: {
        down: {
            head: BASE_DOWN_HEAD,
            body: BASE_DOWN_BODY,
            leftArm: BASE_DOWN_LEFT_ARM,
            rightArm: BASE_DOWN_RIGHT_ARM,
            leftLeg: BASE_DOWN_LEFT_LEG,
            rightLeg: BASE_DOWN_RIGHT_LEG,
        },
        up: {
            head: BASE_UP_HEAD,
            body: BASE_UP_BODY,
            leftArm: BASE_UP_LEFT_ARM,
            rightArm: BASE_UP_RIGHT_ARM,
            leftLeg: BASE_UP_LEFT_LEG,
            rightLeg: BASE_UP_RIGHT_LEG,
        },
        left: {
            head: BASE_MIRROR_HEAD,
            body: BASE_MIRROR_BODY,
            leftArm: BASE_MIRROR_LEFT_ARM,
            rightArm: BASE_MIRROR_RIGHT_ARM,
            leftLeg: BASE_MIRROR_LEFT_LEG,
            rightLeg: BASE_MIRROR_RIGHT_LEG,
        }
        // right: derived at runtime by flipping 'left' with flipX
    }
};

// Register with sprite registry if available
if (typeof BodypartSpriteRegistry !== 'undefined') {
    BodypartSpriteRegistry.register('humanoid_base', BODY_PART_SPRITES);
}

// Export
if (typeof window !== 'undefined') window.BODY_PART_SPRITES = BODY_PART_SPRITES;
if (typeof module !== 'undefined' && module.exports) module.exports = { BODY_PART_SPRITES };
