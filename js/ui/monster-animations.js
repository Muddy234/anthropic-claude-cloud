// ============================================================================
// MONSTER ANIMATIONS - The Shifting Chasm
// ============================================================================
// Animation configuration for monster sprites
// Maps game monsters to their spritesheet animations
// ============================================================================

/**
 * Monster animation configuration
 *
 * Structure:
 * - spriteDir: Directory name in assets/spritesheet/Monsters/ (null for legacy single-file sprites)
 * - frameWidth: Width of each frame in pixels
 * - frameHeight: Height of each frame in pixels
 * - animations: Object containing animation types (run, attack, hurt, death)
 *   - fps: Frames per second for the animation
 *   - loop: Whether animation should loop (false for death/hurt usually)
 *   - directions: Object with down/up/left/right direction data
 *     - row: Spritesheet row index (0-based)
 *     - startCol: Starting column index (0-based)
 *     - endCol: Ending column index (inclusive)
 */
const MONSTER_ANIMATIONS = {
    // ========================================================================
    // ORGANIZED FORMAT (Ghost, Vampire)
    // Separate files for each animation type
    // ========================================================================

    'Phantom': {
        spriteDir: 'Ghost',  // Maps to Ghost spritesheet folder
        frameWidth: 32,
        frameHeight: 32,
        animations: {
            run: {
                fileName: 'ghost-run.png',
                fps: 8,
                loop: true,
                directions: {
                    down:  { row: 0, startCol: 0, endCol: 5 },  // 6 frames
                    up:    { row: 1, startCol: 0, endCol: 5 },
                    left:  { row: 2, startCol: 0, endCol: 5 },
                    right: { row: 3, startCol: 0, endCol: 5 }
                }
            },
            attack: {
                fileName: 'ghost-attack.png',
                fps: 12,
                loop: false,
                directions: {
                    down:  { row: 0, startCol: 0, endCol: 11 }, // 12 frames (transformation sequence)
                    up:    { row: 1, startCol: 0, endCol: 11 },
                    left:  { row: 2, startCol: 0, endCol: 11 },
                    right: { row: 3, startCol: 0, endCol: 11 }
                }
            },
            hurt: {
                fileName: 'ghost-hurt.png',
                fps: 10,
                loop: false,
                directions: {
                    down:  { row: 0, startCol: 0, endCol: 3 },  // 4 frames (flash effect)
                    up:    { row: 1, startCol: 0, endCol: 3 },
                    left:  { row: 2, startCol: 0, endCol: 3 },
                    right: { row: 3, startCol: 0, endCol: 3 }
                }
            },
            death: {
                fileName: 'ghost-death.png',
                fps: 10,
                loop: false,
                directions: {
                    down:  { row: 0, startCol: 0, endCol: 8 },  // 9 frames (dissipation)
                    up:    { row: 1, startCol: 0, endCol: 8 },
                    left:  { row: 2, startCol: 0, endCol: 8 },
                    right: { row: 3, startCol: 0, endCol: 8 }
                }
            }
        }
    },

    'Void Touched': {
        spriteDir: 'Vampire',  // Maps to Vampire spritesheet folder
        frameWidth: 64,
        frameHeight: 64,
        animations: {
            run: {
                fileName: 'vampire-run.png',
                fps: 8,
                loop: true,
                directions: {
                    down:  { row: 0, startCol: 0, endCol: 7 },  // 8 frames
                    up:    { row: 1, startCol: 0, endCol: 7 },
                    left:  { row: 2, startCol: 0, endCol: 7 },
                    right: { row: 3, startCol: 0, endCol: 7 }
                }
            },
            attack: {
                fileName: 'vampire-attack.png',
                fps: 12,
                loop: false,
                directions: {
                    down:  { row: 0, startCol: 0, endCol: 11 }, // 12 frames (with energy burst)
                    up:    { row: 1, startCol: 0, endCol: 11 },
                    left:  { row: 2, startCol: 0, endCol: 11 },
                    right: { row: 3, startCol: 0, endCol: 11 }
                }
            },
            hurt: {
                fileName: 'vampire-hurt.png',
                fps: 10,
                loop: false,
                directions: {
                    down:  { row: 0, startCol: 0, endCol: 3 },  // 4 frames (recoil)
                    up:    { row: 1, startCol: 0, endCol: 3 },
                    left:  { row: 2, startCol: 0, endCol: 3 },
                    right: { row: 3, startCol: 0, endCol: 3 }
                }
            },
            death: {
                fileName: 'vampire-death.png',
                fps: 10,
                loop: false,
                directions: {
                    down:  { row: 0, startCol: 0, endCol: 10 }, // 11 frames (disintegration)
                    up:    { row: 1, startCol: 0, endCol: 10 },
                    left:  { row: 2, startCol: 0, endCol: 10 },
                    right: { row: 3, startCol: 0, endCol: 10 }
                }
            }
        }
    },

    // ========================================================================
    // LEGACY FORMAT (PlantRun, Magmaslime)
    // Single file with all animations combined
    // For now, uses same animation for all actions until proper sprites added
    // ========================================================================

    'Mushroom Sprite': {
        spriteDir: null,  // Legacy: single file in root Monsters folder
        legacyFile: 'PlantRun.png',
        frameWidth: 64,
        frameHeight: 64,
        animations: {
            // NOTE: All animations use the same frames until separate sprites are created
            run: {
                fileName: 'PlantRun.png',
                fps: 8,
                loop: true,
                directions: {
                    down:  { row: 0, startCol: 0, endCol: 7 },  // 8 frames
                    up:    { row: 1, startCol: 0, endCol: 7 },
                    left:  { row: 2, startCol: 0, endCol: 7 },
                    right: { row: 3, startCol: 0, endCol: 7 }
                }
            },
            attack: {
                fileName: 'PlantRun.png',
                fps: 10,
                loop: false,
                directions: {
                    // Use first 4 frames for attack until proper sprite added
                    down:  { row: 0, startCol: 0, endCol: 3 },
                    up:    { row: 1, startCol: 0, endCol: 3 },
                    left:  { row: 2, startCol: 0, endCol: 3 },
                    right: { row: 3, startCol: 0, endCol: 3 }
                }
            },
            hurt: {
                fileName: 'PlantRun.png',
                fps: 12,
                loop: false,
                directions: {
                    // Use middle frames for hurt until proper sprite added
                    down:  { row: 0, startCol: 2, endCol: 3 },
                    up:    { row: 1, startCol: 2, endCol: 3 },
                    left:  { row: 2, startCol: 2, endCol: 3 },
                    right: { row: 3, startCol: 2, endCol: 3 }
                }
            },
            death: {
                fileName: 'PlantRun.png',
                fps: 8,
                loop: false,
                directions: {
                    // Use last 4 frames for death until proper sprite added
                    down:  { row: 0, startCol: 4, endCol: 7 },
                    up:    { row: 1, startCol: 4, endCol: 7 },
                    left:  { row: 2, startCol: 4, endCol: 7 },
                    right: { row: 3, startCol: 4, endCol: 7 }
                }
            }
        }
    },

    'Magma Slime': {
        spriteDir: null,  // Legacy: single file in root Monsters folder
        legacyFile: 'Magmaslime.png',
        frameWidth: 48,
        frameHeight: 48,
        animations: {
            // NOTE: All animations use the same frames until separate sprites are created
            run: {
                fileName: 'Magmaslime.png',
                fps: 6,
                loop: true,
                directions: {
                    down:  { row: 0, startCol: 0, endCol: 7 },  // 8 frames (bouncing animation)
                    up:    { row: 1, startCol: 0, endCol: 7 },
                    left:  { row: 2, startCol: 0, endCol: 7 },
                    right: { row: 3, startCol: 0, endCol: 7 }
                }
            },
            attack: {
                fileName: 'Magmaslime.png',
                fps: 8,
                loop: false,
                directions: {
                    // Use frames 0-4 for attack (includes expansion)
                    down:  { row: 0, startCol: 0, endCol: 4 },
                    up:    { row: 1, startCol: 0, endCol: 4 },
                    left:  { row: 2, startCol: 0, endCol: 4 },
                    right: { row: 3, startCol: 0, endCol: 4 }
                }
            },
            hurt: {
                fileName: 'Magmaslime.png',
                fps: 10,
                loop: false,
                directions: {
                    // Use middle frames for hurt (squish effect)
                    down:  { row: 0, startCol: 3, endCol: 5 },
                    up:    { row: 1, startCol: 3, endCol: 5 },
                    left:  { row: 2, startCol: 3, endCol: 5 },
                    right: { row: 3, startCol: 3, endCol: 5 }
                }
            },
            death: {
                fileName: 'Magmaslime.png',
                fps: 6,
                loop: false,
                directions: {
                    // Use frames 4-7 for death (dissolving)
                    down:  { row: 0, startCol: 4, endCol: 7 },
                    up:    { row: 1, startCol: 4, endCol: 7 },
                    left:  { row: 2, startCol: 4, endCol: 7 },
                    right: { row: 3, startCol: 4, endCol: 7 }
                }
            }
        }
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get animation data for a monster
 * @param {string} monsterName - Name of the monster (e.g., 'Phantom')
 * @returns {Object|null} Animation configuration object or null if not found
 */
function getMonsterAnimation(monsterName) {
    return MONSTER_ANIMATIONS[monsterName] || null;
}

/**
 * Get sprite path for a monster animation
 * @param {string} monsterName - Name of the monster
 * @param {string} animationType - Animation type ('run', 'attack', 'hurt', 'death')
 * @returns {string|null} Path to the sprite file
 */
function getMonsterSpritePath(monsterName, animationType) {
    const config = MONSTER_ANIMATIONS[monsterName];
    if (!config) return null;

    const anim = config.animations[animationType];
    if (!anim) return null;

    // Organized format (subdirectory)
    if (config.spriteDir) {
        return `assets/spritesheet/Monsters/${config.spriteDir}/${anim.fileName}`;
    }

    // Legacy format (root folder)
    return `assets/spritesheet/Monsters/${anim.fileName}`;
}

/**
 * Get frame data for a specific monster animation and direction
 * @param {string} monsterName - Name of the monster
 * @param {string} animationType - Animation type ('run', 'attack', 'hurt', 'death')
 * @param {string} direction - Direction ('down', 'up', 'left', 'right')
 * @returns {Object|null} Frame data {row, startCol, endCol, fps, loop} or null
 */
function getMonsterAnimationFrames(monsterName, animationType, direction) {
    const config = MONSTER_ANIMATIONS[monsterName];
    if (!config) return null;

    const anim = config.animations[animationType];
    if (!anim) return null;

    const directionData = anim.directions[direction];
    if (!directionData) return null;

    return {
        row: directionData.row,
        startCol: directionData.startCol,
        endCol: directionData.endCol,
        frameCount: directionData.endCol - directionData.startCol + 1,
        fps: anim.fps,
        loop: anim.loop,
        frameWidth: config.frameWidth,
        frameHeight: config.frameHeight
    };
}

/**
 * Check if a monster has animation data configured
 * @param {string} monsterName - Name of the monster
 * @returns {boolean} True if monster has animation config
 */
function hasMonsterAnimation(monsterName) {
    return monsterName in MONSTER_ANIMATIONS;
}

/**
 * Get list of all configured animated monsters
 * @returns {Array<string>} Array of monster names
 */
function getAnimatedMonsters() {
    return Object.keys(MONSTER_ANIMATIONS);
}

/**
 * Convert facing direction string to animation direction key
 * Handles both string format ('up', 'down', 'left', 'right') and object format ({x, y})
 * @param {string|Object} facing - Facing direction
 * @returns {string} Direction key for animation lookup
 */
function facingToAnimationDirection(facing) {
    if (typeof facing === 'string') {
        // Already in correct format
        return facing;
    } else if (facing && typeof facing === 'object') {
        // Convert object format to string
        if (facing.y === -1) return 'up';
        if (facing.y === 1) return 'down';
        if (facing.x === -1) return 'left';
        if (facing.x === 1) return 'right';
    }
    // Default fallback
    return 'down';
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.MONSTER_ANIMATIONS = MONSTER_ANIMATIONS;
    window.getMonsterAnimation = getMonsterAnimation;
    window.getMonsterSpritePath = getMonsterSpritePath;
    window.getMonsterAnimationFrames = getMonsterAnimationFrames;
    window.hasMonsterAnimation = hasMonsterAnimation;
    window.getAnimatedMonsters = getAnimatedMonsters;
    window.facingToAnimationDirection = facingToAnimationDirection;
}

console.log('✅ Monster animations loaded:', Object.keys(MONSTER_ANIMATIONS).length, 'monsters configured');
