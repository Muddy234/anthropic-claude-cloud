// ============================================================================
// SPRITE RENDERER - Pixel Art Defined in Code
// ============================================================================
// Renders monster sprites from pixel data arrays without external image files.
// Achieves Desktop Dungeons-style chunky pixel art through Canvas drawing.
// ============================================================================

const SpriteRenderer = {
    // Cache for rendered sprites (avoid re-drawing every frame)
    cache: new Map(),

    // Sprite dimensions (standard sprite size)
    SPRITE_WIDTH: 32,
    SPRITE_HEIGHT: 32,

    // Default pixel scale (each "pixel" becomes NxN screen pixels)
    // Sprites are 32x32: scale 1 = 32px on screen, scale 2 = 64px on screen
    // With TILE_SIZE=16 and zoom=2, effective tile is 32px, so scale 1 is ideal
    defaultScale: 1,

    // ========================================================================
    // CORE RENDERING
    // ========================================================================

    /**
     * Render a sprite definition to a canvas/context
     * @param {CanvasRenderingContext2D} ctx - Target context
     * @param {Object} sprite - Sprite definition with pixels and palette
     * @param {number} x - Screen X position
     * @param {number} y - Screen Y position
     * @param {number} scale - Pixel scale multiplier
     * @param {Object} options - Optional overrides (palette, flip, etc.)
     */
    draw(ctx, sprite, x, y, scale = this.defaultScale, options = {}) {
        if (!sprite || !sprite.pixels) return;

        const cacheKey = this._getCacheKey(sprite, scale, options);

        // Check cache first
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            ctx.drawImage(cached, Math.floor(x), Math.floor(y));
            return;
        }

        // Render to cache
        const rendered = this._renderToCanvas(sprite, scale, options);
        this.cache.set(cacheKey, rendered);
        ctx.drawImage(rendered, Math.floor(x), Math.floor(y));
    },

    /**
     * Render sprite to an offscreen canvas
     */
    _renderToCanvas(sprite, scale, options) {
        const width = sprite.width * scale;
        const height = sprite.height * scale;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Disable smoothing for crisp pixels
        ctx.imageSmoothingEnabled = false;

        const palette = options.palette || sprite.palette;
        const pixels = sprite.pixels;

        // Draw each pixel
        for (let py = 0; py < sprite.height; py++) {
            const row = pixels[py];
            if (!row) continue;

            for (let px = 0; px < sprite.width; px++) {
                const char = row[px];
                if (char === '.' || char === ' ') continue; // Transparent

                const color = palette[char];
                if (!color) continue;

                ctx.fillStyle = color;

                const drawX = options.flipX ? (sprite.width - 1 - px) * scale : px * scale;
                ctx.fillRect(drawX, py * scale, scale, scale);
            }
        }

        // Apply optional effects
        if (options.outline) {
            this._addOutline(ctx, width, height, options.outlineColor || '#000000');
        }

        if (options.glow) {
            this._addGlow(ctx, canvas, options.glowColor || '#FFFFFF', options.glowSize || 2);
        }

        return canvas;
    },

    /**
     * Add outline effect to rendered sprite
     */
    _addOutline(ctx, width, height, color) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        const outline = [];

        // Find edge pixels
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = (y * width + x) * 4;
                if (data[idx + 3] > 0) continue; // Not transparent

                // Check neighbors
                const neighbors = [
                    [x-1, y], [x+1, y], [x, y-1], [x, y+1]
                ];

                for (const [nx, ny] of neighbors) {
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    const nidx = (ny * width + nx) * 4;
                    if (data[nidx + 3] > 0) {
                        outline.push([x, y]);
                        break;
                    }
                }
            }
        }

        // Draw outline
        ctx.fillStyle = color;
        for (const [x, y] of outline) {
            ctx.fillRect(x, y, 1, 1);
        }
    },

    /**
     * Generate cache key for sprite variant
     */
    _getCacheKey(sprite, scale, options) {
        const name = sprite.name || 'unnamed';
        const paletteKey = options.palette ? JSON.stringify(options.palette) : 'default';
        const flipKey = options.flipX ? 'flipped' : 'normal';
        return `${name}_${scale}_${paletteKey}_${flipKey}`;
    },

    /**
     * Clear the sprite cache (also clears animation cache)
     */
    clearCache() {
        this.cache.clear();
        // Also clear animation frame cache if SpriteAnimator exists
        if (window.SpriteAnimator && window.SpriteAnimator.frameCache) {
            window.SpriteAnimator.clearAnimationCache();
        }
    },

    // ========================================================================
    // PALETTE UTILITIES
    // ========================================================================

    /**
     * Create a palette-swapped version of a sprite
     */
    swapPalette(sprite, newPalette) {
        return {
            ...sprite,
            palette: { ...sprite.palette, ...newPalette }
        };
    },

    /**
     * Shift all colors in palette by hue amount
     */
    hueShiftPalette(palette, degrees) {
        const shifted = {};
        for (const [key, color] of Object.entries(palette)) {
            shifted[key] = this._hueShift(color, degrees);
        }
        return shifted;
    },

    _hueShift(hex, degrees) {
        // Convert hex to HSL, shift hue, convert back
        const rgb = this._hexToRgb(hex);
        const hsl = this._rgbToHsl(rgb.r, rgb.g, rgb.b);
        hsl.h = (hsl.h + degrees) % 360;
        const newRgb = this._hslToRgb(hsl.h, hsl.s, hsl.l);
        return this._rgbToHex(newRgb.r, newRgb.g, newRgb.b);
    },

    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    },

    _rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    },

    _rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
            h *= 360;
        }
        return { h, s, l };
    },

    _hslToRgb(h, s, l) {
        h /= 360;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return { r: r * 255, g: g * 255, b: b * 255 };
    }
};

// ============================================================================
// MONSTER SPRITE DEFINITIONS
// ============================================================================
// Sprite pixel definitions are loaded from: assets/sprites/monster-sprites.js
// This keeps art assets separate from rendering code for easier editing.
// MONSTER_SPRITES is available via window.MONSTER_SPRITES after that file loads.
// ============================================================================

// ============================================================================
// SPRITE ANIMATION SYSTEM
// ============================================================================
// Full animation engine supporting:
// - Frame building with delta-based sprite modifications
// - Frame caching for composed animations
// - Attack/idle/death animation state management
// - Integration with combat timing system
// - Vertical offset and palette modification effects
// ============================================================================

const SpriteAnimator = {
    // ========================================================================
    // CACHES
    // ========================================================================

    // Cache for composed animation frames
    // Key format: {spriteName}_{phase}_{frameIndex}
    frameCache: new Map(),

    // ========================================================================
    // ANIMATION STATE MAPS
    // ========================================================================

    // Active attack/death animations: entityId -> animation state
    active: new Map(),

    // Idle animations: entityId -> idle animation state
    idleStates: new Map(),

    // ========================================================================
    // PHASE TIMING CONSTANTS
    // ========================================================================

    // Maps combat progress (0-1) to animation phases
    PHASE_THRESHOLDS: {
        WINDUP_END: 0.6,      // 0-0.6 = windup phase
        LATE_WINDUP_END: 0.85, // 0.6-0.85 = late windup (still windup frames)
        STRIKE_END: 1.0       // 0.85-1.0 = strike phase
    },

    // ========================================================================
    // FRAME BUILDING SYSTEM
    // ========================================================================

    /**
     * Build an animated frame by applying deltas to a base sprite
     * @param {Object} baseSprite - The base sprite definition with pixels and palette
     * @param {Object|Array} deltas - Delta modifications to apply
     *   Object format: { rowNum: { colNum: char, ... }, ... }
     *   Array format: [{ row, col, char }, ...] or [{ row, pixels }, ...]
     * @returns {Object} New sprite object with modified pixels
     */
    buildAnimatedFrame(baseSprite, deltas) {
        // Handle empty or missing deltas - return base sprite unchanged
        if (!deltas) {
            return baseSprite;
        }

        // Check for empty object or array
        if (Array.isArray(deltas) && deltas.length === 0) {
            return baseSprite;
        }
        if (typeof deltas === 'object' && !Array.isArray(deltas) && Object.keys(deltas).length === 0) {
            return baseSprite;
        }

        if (!baseSprite || !baseSprite.pixels) {
            console.warn('[SpriteAnimator] buildAnimatedFrame: Invalid base sprite');
            return baseSprite;
        }

        // Clone the pixel array (deep copy of rows)
        const newPixels = baseSprite.pixels.map(row => row);

        // Handle object format: { rowNum: { colNum: char, ... }, ... }
        if (typeof deltas === 'object' && !Array.isArray(deltas)) {
            for (const [rowKey, colChanges] of Object.entries(deltas)) {
                const rowNum = parseInt(rowKey, 10);
                if (isNaN(rowNum) || rowNum < 0 || rowNum >= newPixels.length) {
                    continue;
                }

                // colChanges is an object like { 3: '.', 4: 'O', ... }
                if (typeof colChanges === 'object') {
                    let rowChars = newPixels[rowNum].split('');
                    for (const [colKey, char] of Object.entries(colChanges)) {
                        const colNum = parseInt(colKey, 10);
                        if (!isNaN(colNum) && colNum >= 0 && colNum < rowChars.length) {
                            rowChars[colNum] = char;
                        }
                    }
                    newPixels[rowNum] = rowChars.join('');
                }
            }
        }
        // Handle array format: [{ row, col, char }, ...] or [{ row, pixels }, ...]
        else if (Array.isArray(deltas)) {
            for (const delta of deltas) {
                if (delta.row === undefined || delta.row < 0 || delta.row >= newPixels.length) {
                    continue;
                }

                if (delta.pixels !== undefined) {
                    // Full row replacement
                    newPixels[delta.row] = delta.pixels;
                } else if (delta.col !== undefined && delta.char !== undefined) {
                    // Single pixel replacement
                    const row = newPixels[delta.row];
                    if (delta.col >= 0 && delta.col < row.length) {
                        const chars = row.split('');
                        chars[delta.col] = delta.char;
                        newPixels[delta.row] = chars.join('');
                    }
                }
            }
        }

        // Return new sprite object with modified pixels
        return {
            ...baseSprite,
            pixels: newPixels,
            name: baseSprite.name + '_animated'
        };
    },

    // ========================================================================
    // FRAME CACHING
    // ========================================================================

    /**
     * Get a cached composed frame or build and cache it
     * @param {string} spriteName - Base sprite name
     * @param {string} phase - Animation phase (windup/strike/recovery)
     * @param {number} frameIndex - Frame index within the phase
     * @param {Object} baseSprite - Base sprite definition
     * @param {Array} deltas - Delta modifications for this frame
     * @returns {Object} Composed sprite object
     */
    getCachedFrame(spriteName, phase, frameIndex, baseSprite, deltas) {
        const cacheKey = `${spriteName}_${phase}_${frameIndex}`;

        if (this.frameCache.has(cacheKey)) {
            return this.frameCache.get(cacheKey);
        }

        // Build the frame and cache it
        const composedFrame = this.buildAnimatedFrame(baseSprite, deltas);
        this.frameCache.set(cacheKey, composedFrame);

        return composedFrame;
    },

    /**
     * Clear the animation frame cache
     */
    clearAnimationCache() {
        this.frameCache.clear();
    },

    /**
     * Clear all caches (call this when sprites change significantly)
     */
    clearCache() {
        this.frameCache.clear();
        // Also clear SpriteRenderer cache if it exists
        if (window.SpriteRenderer && window.SpriteRenderer.cache) {
            window.SpriteRenderer.clearCache();
        }
    },

    // ========================================================================
    // ANIMATION STATE MANAGEMENT
    // ========================================================================

    /**
     * Create a new animation state object
     * @param {string} type - Animation type (attack/idle/death)
     * @param {string} phase - Current phase (windup/strike/recovery/idle)
     * @param {boolean} loop - Whether animation should loop
     * @returns {Object} Animation state object
     */
    _createAnimationState(type, phase, loop = false) {
        return {
            type: type,
            phase: phase,
            frameIndex: 0,
            timer: 0,
            startTime: performance.now(),
            loop: loop,
            totalDuration: 0,
            progress: 0
        };
    },

    /**
     * Start an attack animation for an entity
     * @param {string} entityId - Unique entity identifier
     * @param {string} animationType - Type of attack animation (e.g., 'slash', 'thrust')
     * @param {number} totalDuration - Total attack duration in milliseconds
     */
    startAttackAnimation(entityId, animationType, totalDuration) {
        // Stop any idle animation when attack starts
        this.stopIdleAnimation(entityId);

        const state = this._createAnimationState('attack', 'windup', false);
        state.animationType = animationType;
        state.totalDuration = totalDuration;

        this.active.set(entityId, state);
    },

    /**
     * Update animation progress based on combat system state
     * @param {string} entityId - Entity identifier
     * @param {string} phase - Current combat phase (windup/strike/recovery)
     * @param {number} progress - Progress within phase (0-1)
     */
    updateFromCombatState(entityId, phase, progress) {
        const state = this.active.get(entityId);
        if (!state || state.type !== 'attack') return;

        state.phase = phase;
        state.progress = progress;

        // Update frame index based on progress will be done in getCurrentFrame
    },

    /**
     * Get the appropriate frame index for a given progress value
     * @param {number} progress - Progress value (0-1)
     * @param {number} frameCount - Number of frames in the current phase
     * @returns {number} Frame index
     */
    _getFrameIndexFromProgress(progress, frameCount) {
        if (frameCount <= 0) return 0;
        if (frameCount === 1) return 0;

        // Map progress to frame index
        // progress 0 -> frame 0
        // progress 1 -> last frame
        const frameIndex = Math.floor(progress * frameCount);
        return Math.min(frameIndex, frameCount - 1);
    },

    /**
     * Get the current composed frame for rendering
     * @param {string} entityId - Entity identifier
     * @param {Object} baseSprite - Base sprite definition
     * @param {Object} animationData - Animation data from sprite-animations.js
     *   Expected format: { windup: [...frames...], strike: [...frames...], etc. }
     *   OR: { windup: { frames: [...] }, strike: { frames: [...] }, etc. }
     * @returns {Object} Composed sprite with deltas applied, or baseSprite if no animation
     */
    getCurrentFrame(entityId, baseSprite, animationData) {
        // Check for active attack/death animation first
        let state = this.active.get(entityId);

        // If no active animation, check for idle
        if (!state) {
            state = this.idleStates.get(entityId);
        }

        // No animation active - return base sprite (wrapped for consistent format)
        if (!state || !animationData) {
            return { sprite: baseSprite, transforms: null };
        }

        // Get phase data - handle both array and object formats
        const phaseData = animationData[state.phase];
        if (!phaseData) {
            return { sprite: baseSprite, transforms: null };
        }

        // Support both formats: direct array OR object with .frames property
        const frames = Array.isArray(phaseData) ? phaseData : phaseData.frames;
        if (!frames || frames.length === 0) {
            return { sprite: baseSprite, transforms: null };
        }

        // Calculate frame index based on progress
        const frameIndex = this._getFrameIndexFromProgress(state.progress, frames.length);
        const frameData = frames[frameIndex];

        // Get the deltas from the frame (frames may have {deltas: {...}, duration: ...} structure)
        const frameDeltas = frameData?.deltas || {};

        // Get or build the composed frame
        const animatedSprite = this.getCachedFrame(
            baseSprite.name,
            state.phase,
            frameIndex,
            baseSprite,
            frameDeltas
        );

        // Extract transform properties from frame data
        const transforms = {
            verticalOffset: frameData?.verticalOffset || 0,
            horizontalOffset: frameData?.horizontalOffset || 0,
            scaleX: frameData?.scaleX || 1.0,
            scaleY: frameData?.scaleY || 1.0,
            paletteMod: frameData?.paletteMod || null
        };

        return { sprite: animatedSprite, transforms };
    },

    // ========================================================================
    // IDLE ANIMATION MANAGEMENT
    // ========================================================================

    /**
     * Start an idle animation for an entity
     * @param {string} entityId - Entity identifier
     * @param {string} idleType - Type of idle animation (e.g., 'breathe', 'float', 'pulse')
     */
    startIdleAnimation(entityId, idleType) {
        // Don't start idle if attack animation is active
        if (this.active.has(entityId)) {
            return;
        }

        const state = this._createAnimationState('idle', 'idle', true);
        state.idleType = idleType;

        this.idleStates.set(entityId, state);
    },

    /**
     * Stop idle animation for an entity
     * @param {string} entityId - Entity identifier
     */
    stopIdleAnimation(entityId) {
        this.idleStates.delete(entityId);
    },

    /**
     * Check if entity has an active idle animation
     * @param {string} entityId - Entity identifier
     * @returns {boolean}
     */
    hasIdleAnimation(entityId) {
        return this.idleStates.has(entityId);
    },

    // ========================================================================
    // DEATH ANIMATION MANAGEMENT
    // ========================================================================

    /**
     * Start a death animation for an entity
     * @param {string} entityId - Entity identifier
     * @param {string} deathType - Type of death animation (e.g., 'collapse', 'dissolve', 'explode')
     */
    startDeathAnimation(entityId, deathType) {
        // Stop any existing animations
        this.stopIdleAnimation(entityId);

        const state = this._createAnimationState('death', 'death', false);
        state.deathType = deathType;
        state.complete = false;

        this.active.set(entityId, state);
    },

    /**
     * Check if a death animation has completed
     * @param {string} entityId - Entity identifier
     * @returns {boolean} True if death animation is complete
     */
    isDeathAnimationComplete(entityId) {
        const state = this.active.get(entityId);
        if (!state || state.type !== 'death') {
            return false;
        }
        return state.complete === true;
    },

    /**
     * Clean up completed death animation
     * @param {string} entityId - Entity identifier
     */
    cleanupDeathAnimation(entityId) {
        const state = this.active.get(entityId);
        if (state && state.type === 'death') {
            this.active.delete(entityId);
        }
    },

    // ========================================================================
    // MAIN UPDATE LOOP
    // ========================================================================

    /**
     * Update all active animations
     * Call this each frame with deltaTime in milliseconds
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        // Update active animations (attack/death)
        for (const [entityId, state] of this.active) {
            state.timer += deltaTime;

            if (state.type === 'death') {
                // Death animations progress based on timer
                // Assume 1000ms total duration for death by default
                const deathDuration = state.duration || 1000;
                state.progress = Math.min(state.timer / deathDuration, 1.0);

                if (state.progress >= 1.0) {
                    state.complete = true;
                }
            }
            // Attack animations are updated via updateFromCombatState
        }

        // Update idle animations
        for (const [entityId, state] of this.idleStates) {
            state.timer += deltaTime;

            // Idle animations cycle continuously
            // Use a base cycle of 2000ms for idle breathing/floating
            const idleCycle = state.cycleDuration || 2000;
            state.progress = (state.timer % idleCycle) / idleCycle;
        }
    },

    /**
     * Remove completed non-looping animations
     * Call this periodically or after combat resolution
     */
    cleanupCompletedAnimations() {
        for (const [entityId, state] of this.active) {
            if (!state.loop && state.progress >= 1.0) {
                if (state.type !== 'death') {
                    // Auto-cleanup non-death completed animations
                    this.active.delete(entityId);
                }
            }
        }
    },

    // ========================================================================
    // VISUAL EFFECTS FOR IDLE ANIMATIONS
    // ========================================================================

    /**
     * Get vertical offset for floating idle animations
     * @param {string} entityId - Entity identifier
     * @returns {number} Pixel offset (positive = up, negative = down)
     */
    getVerticalOffset(entityId) {
        const state = this.idleStates.get(entityId);
        if (!state) return 0;

        // Only apply to floating-type idle animations
        if (state.idleType !== 'float' && state.idleType !== 'hover') {
            return 0;
        }

        // Sine wave oscillation: -amplitude to +amplitude
        const amplitude = state.floatAmplitude || 3; // pixels
        const offset = Math.sin(state.progress * Math.PI * 2) * amplitude;

        return Math.round(offset);
    },

    /**
     * Get palette brightness modifier for pulsing animations
     * @param {string} entityId - Entity identifier
     * @returns {number} Brightness multiplier (1.0 = normal, >1 = brighter, <1 = darker)
     */
    getPaletteModifier(entityId) {
        const state = this.idleStates.get(entityId);
        if (!state) return 1.0;

        // Only apply to pulsing-type idle animations
        if (state.idleType !== 'pulse' && state.idleType !== 'glow') {
            return 1.0;
        }

        // Sine wave oscillation between minBrightness and maxBrightness
        const minBrightness = state.minBrightness || 0.8;
        const maxBrightness = state.maxBrightness || 1.2;
        const range = maxBrightness - minBrightness;

        // Use sin to oscillate smoothly
        const sineValue = (Math.sin(state.progress * Math.PI * 2) + 1) / 2; // 0 to 1
        return minBrightness + (sineValue * range);
    },

    /**
     * Get scale modifier for breathing animations
     * @param {string} entityId - Entity identifier
     * @returns {number} Scale multiplier (1.0 = normal)
     */
    getScaleModifier(entityId) {
        const state = this.idleStates.get(entityId);
        if (!state) return 1.0;

        // Only apply to breathing-type idle animations
        if (state.idleType !== 'breathe') {
            return 1.0;
        }

        // Subtle scaling effect
        const minScale = state.minScale || 0.98;
        const maxScale = state.maxScale || 1.02;
        const range = maxScale - minScale;

        const sineValue = (Math.sin(state.progress * Math.PI * 2) + 1) / 2;
        return minScale + (sineValue * range);
    },

    // ========================================================================
    // COMBAT PHASE MAPPING
    // ========================================================================

    /**
     * Map overall attack progress to specific phase and phase progress
     * @param {number} attackProgress - Overall attack progress (0-1)
     * @returns {Object} { phase: string, phaseProgress: number }
     */
    mapProgressToPhase(attackProgress) {
        const thresholds = this.PHASE_THRESHOLDS;

        if (attackProgress < thresholds.WINDUP_END) {
            // Windup phase: 0 to 0.6
            return {
                phase: 'windup',
                phaseProgress: attackProgress / thresholds.WINDUP_END
            };
        } else if (attackProgress < thresholds.LATE_WINDUP_END) {
            // Late windup (still uses windup frames): 0.6 to 0.85
            const lateWindupDuration = thresholds.LATE_WINDUP_END - thresholds.WINDUP_END;
            return {
                phase: 'windup',
                phaseProgress: 0.5 + ((attackProgress - thresholds.WINDUP_END) / lateWindupDuration) * 0.5
            };
        } else {
            // Strike phase: 0.85 to 1.0
            const strikeDuration = thresholds.STRIKE_END - thresholds.LATE_WINDUP_END;
            return {
                phase: 'strike',
                phaseProgress: (attackProgress - thresholds.LATE_WINDUP_END) / strikeDuration
            };
        }
    },

    /**
     * Helper to get animation state for an entity
     * @param {string} entityId - Entity identifier
     * @returns {Object|null} Current animation state or null
     */
    getAnimationState(entityId) {
        return this.active.get(entityId) || this.idleStates.get(entityId) || null;
    },

    /**
     * Check if entity has any active animation
     * @param {string} entityId - Entity identifier
     * @returns {boolean}
     */
    hasActiveAnimation(entityId) {
        return this.active.has(entityId) || this.idleStates.has(entityId);
    },

    /**
     * Stop all animations for an entity
     * @param {string} entityId - Entity identifier
     */
    stopAllAnimations(entityId) {
        this.active.delete(entityId);
        this.idleStates.delete(entityId);
    },

    /**
     * Clear all animation states (useful for scene transitions)
     */
    clearAllAnimations() {
        this.active.clear();
        this.idleStates.clear();
    },

    // ========================================================================
    // LEGACY COMPATIBILITY
    // ========================================================================
    // These methods maintain compatibility with the old simple animation system

    /**
     * Simple play method for basic animations (legacy support)
     * @param {string} entityId - Entity identifier
     * @param {string} spriteName - Sprite name
     * @param {string} animationName - Animation name (idle/attack/death)
     */
    play(entityId, spriteName, animationName) {
        if (animationName === 'idle') {
            this.startIdleAnimation(entityId, 'breathe');
        } else if (animationName === 'attack') {
            this.startAttackAnimation(entityId, 'basic', 1000);
        } else if (animationName === 'death') {
            this.startDeathAnimation(entityId, 'collapse');
        }
    },

    /**
     * Get current frame index (legacy support)
     * @param {string} entityId - Entity identifier
     * @returns {number} Frame index
     */
    getFrame(entityId) {
        const state = this.active.get(entityId) || this.idleStates.get(entityId);
        if (!state) return 0;
        return state.frameIndex || 0;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.SpriteRenderer = SpriteRenderer;
// MONSTER_SPRITES is loaded from assets/sprites/monster-sprites.js
// It's already exported to window.MONSTER_SPRITES by that file
window.SpriteAnimator = SpriteAnimator;

console.log('[SpriteRenderer] Loaded - sprites from assets/sprites/monster-sprites.js');
