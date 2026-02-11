// ============================================================================
// ANIMATION CONTROLLER - The Shifting Chasm
// ============================================================================
// Issue #11: Shared animation controller for player and monster animations
// Provides common functionality for spritesheet-based animations
// ============================================================================

const AnimationController = {
    // ========================================================================
    // ANIMATION STATE MANAGEMENT
    // ========================================================================

    /**
     * Create a new animation state object
     * @param {Object} config - Animation configuration
     * @param {number} config.fps - Frames per second
     * @param {number} config.frameCount - Total number of frames
     * @param {boolean} config.loop - Whether animation loops
     * @param {number} config.startFrame - Starting frame index (default: 0)
     * @returns {Object} Animation state object
     */
    createState(config) {
        return {
            currentFrame: config.startFrame || 0,
            frameCount: config.frameCount || 1,
            fps: config.fps || 8,
            loop: config.loop !== undefined ? config.loop : true,
            timer: 0,
            isPlaying: true,
            isComplete: false,
            direction: 'down',
            // Callback for animation events
            onComplete: null,
            onFrameChange: null
        };
    },

    /**
     * Update animation state
     * @param {Object} state - Animation state object
     * @param {number} deltaTime - Time elapsed in milliseconds
     * @returns {boolean} True if frame changed
     */
    update(state, deltaTime) {
        if (!state.isPlaying || state.isComplete) return false;

        const frameDuration = 1000 / state.fps;
        state.timer += deltaTime;

        if (state.timer >= frameDuration) {
            state.timer -= frameDuration;
            const oldFrame = state.currentFrame;
            state.currentFrame++;

            // Check for animation end
            if (state.currentFrame >= state.frameCount) {
                if (state.loop) {
                    state.currentFrame = 0;
                } else {
                    state.currentFrame = state.frameCount - 1;
                    state.isComplete = true;
                    state.isPlaying = false;

                    if (state.onComplete) {
                        state.onComplete();
                    }
                }
            }

            // Notify of frame change
            if (state.currentFrame !== oldFrame && state.onFrameChange) {
                state.onFrameChange(state.currentFrame);
            }

            return true;
        }

        return false;
    },

    /**
     * Play animation from beginning
     * @param {Object} state - Animation state object
     */
    play(state) {
        state.currentFrame = 0;
        state.timer = 0;
        state.isPlaying = true;
        state.isComplete = false;
    },

    /**
     * Pause animation
     * @param {Object} state - Animation state object
     */
    pause(state) {
        state.isPlaying = false;
    },

    /**
     * Resume paused animation
     * @param {Object} state - Animation state object
     */
    resume(state) {
        if (!state.isComplete) {
            state.isPlaying = true;
        }
    },

    /**
     * Reset animation to first frame
     * @param {Object} state - Animation state object
     */
    reset(state) {
        state.currentFrame = 0;
        state.timer = 0;
        state.isComplete = false;
    },

    /**
     * Set animation direction
     * @param {Object} state - Animation state object
     * @param {string|Object} facing - Direction ('up', 'down', 'left', 'right') or {x, y}
     */
    setDirection(state, facing) {
        if (typeof facing === 'string') {
            state.direction = facing;
        } else if (facing && typeof facing === 'object') {
            // Convert object to string direction
            if (facing.y === -1) state.direction = 'up';
            else if (facing.y === 1) state.direction = 'down';
            else if (facing.x === -1) state.direction = 'left';
            else if (facing.x === 1) state.direction = 'right';
        }
    },

    // ========================================================================
    // SPRITESHEET UTILITIES
    // ========================================================================

    /**
     * Calculate source rectangle for a frame in a spritesheet
     * @param {Object} config - Spritesheet configuration
     * @param {number} config.frameWidth - Width of each frame
     * @param {number} config.frameHeight - Height of each frame
     * @param {number} config.columns - Number of columns in spritesheet
     * @param {number} frame - Frame index
     * @param {number} row - Row index (for directional sprites)
     * @returns {Object} {x, y, width, height}
     */
    getFrameRect(config, frame, row = 0) {
        const col = frame % config.columns;
        const frameRow = row + Math.floor(frame / config.columns);

        return {
            x: col * config.frameWidth,
            y: frameRow * config.frameHeight,
            width: config.frameWidth,
            height: config.frameHeight
        };
    },

    /**
     * Get row index for a direction (standard 4-direction spritesheet layout)
     * @param {string} direction - Direction string
     * @returns {number} Row index
     */
    getDirectionRow(direction) {
        switch (direction) {
            case 'down': return 0;
            case 'up': return 1;
            case 'left': return 2;
            case 'right': return 3;
            default: return 0;
        }
    },

    /**
     * Draw a frame from a spritesheet
     * @param {CanvasRenderingContext2D} ctx
     * @param {HTMLImageElement|HTMLCanvasElement} image - Spritesheet image
     * @param {Object} srcRect - Source rectangle {x, y, width, height}
     * @param {number} destX - Destination X
     * @param {number} destY - Destination Y
     * @param {number} destWidth - Destination width
     * @param {number} destHeight - Destination height
     * @param {Object} options - Optional drawing options
     */
    drawFrame(ctx, image, srcRect, destX, destY, destWidth, destHeight, options = {}) {
        ctx.save();

        // Apply flip transforms
        if (options.flipX || options.flipY) {
            ctx.translate(destX + destWidth / 2, destY + destHeight / 2);
            ctx.scale(options.flipX ? -1 : 1, options.flipY ? -1 : 1);
            ctx.translate(-(destX + destWidth / 2), -(destY + destHeight / 2));
        }

        // Apply alpha
        if (options.alpha !== undefined) {
            ctx.globalAlpha = options.alpha;
        }

        // Apply tint filter
        if (options.tint) {
            ctx.filter = options.tint;
        }

        // Pixel art rendering
        if (options.pixelArt !== false) {
            ctx.imageSmoothingEnabled = false;
        }

        ctx.drawImage(
            image,
            srcRect.x, srcRect.y, srcRect.width, srcRect.height,
            destX, destY, destWidth, destHeight
        );

        ctx.restore();
    },

    // ========================================================================
    // ANIMATION TYPE TRANSITIONS
    // ========================================================================

    /**
     * Manage animation type transitions (e.g., idle -> run -> attack)
     * @param {Object} entity - Entity with animation state
     * @param {string} newType - New animation type
     * @param {Object} animConfig - Animation configuration for the type
     */
    transitionTo(entity, newType, animConfig) {
        if (!entity._animState) {
            entity._animState = this.createState(animConfig);
        }

        // Don't restart if already playing this animation
        if (entity._currentAnimType === newType && !entity._animState.isComplete) {
            return;
        }

        entity._currentAnimType = newType;
        entity._animState.frameCount = animConfig.frameCount || 1;
        entity._animState.fps = animConfig.fps || 8;
        entity._animState.loop = animConfig.loop !== undefined ? animConfig.loop : true;

        this.play(entity._animState);
    },

    /**
     * Get the current animation type for an entity
     * @param {Object} entity - Entity with animation state
     * @returns {string} Current animation type
     */
    getCurrentType(entity) {
        return entity._currentAnimType || 'idle';
    },

    /**
     * Check if an animation is complete
     * @param {Object} entity - Entity with animation state
     * @returns {boolean} True if animation is complete
     */
    isComplete(entity) {
        return entity._animState ? entity._animState.isComplete : false;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.AnimationController = AnimationController;

console.log('[AnimationController] Shared animation controller loaded');
