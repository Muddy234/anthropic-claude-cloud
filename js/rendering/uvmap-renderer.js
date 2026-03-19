// ============================================================================
// UVMAP RENDERER - Drop-in replacement for BodypartRenderer
// ============================================================================
// Two-tier cache architecture:
//   AnimationTemplate (shared per generatorType+skinName):
//     - Pre-computed UV frames from the generator (shared across all skins)
//     - Identity texture for this specific skin
//     - Lazily-built offscreen canvas cache per (direction, animType, frameIdx)
//
//   UVMapRenderer (per-entity instance):
//     - References a shared AnimationTemplate
//     - Owns its own animation state (current state, direction, frame, etc.)
//     - Lightweight: just state + pointer to template
//
// Usage:
//   var renderer = new UVMapRenderer('humanoid', 'default');
//   renderer.setDirection('down');
//   renderer.setState('walking');
//   renderer.update(deltaTime);
//   renderer.draw(ctx, screenX, screenY, tileSize);
// ============================================================================

(function() {
    'use strict';

    // How much larger than a tile the sprite renders.
    // 1.0 = exactly one tile. 1.3 = 30% overflow (matches existing convention).
    var UV_RENDER_SCALE = 1.3;

    // Animation FPS by state
    var ANIM_FPS = {
        idle: 1,
        walking: 8,
        attacking: 10,
        hit: 8,
        dying: 8,
    };

    // Death fade duration
    var DEATH_FADE_FRAMES = 12; // at 8 FPS = 1.5 seconds

    // ========================================================================
    // TEMPLATE CACHE (shared per generatorType + skinName)
    // ========================================================================

    var _templateCache = {};

    function getTemplate(generatorType, skinName) {
        var key = generatorType + ':' + skinName;
        if (!_templateCache[key]) {
            var gen = AnimationGeneratorRegistry.get(generatorType);
            if (!gen) return null;

            var skinDef = (typeof HUMANOID_SKINS !== 'undefined') ? HUMANOID_SKINS[skinName] : null;
            if (!skinDef) return null;

            _templateCache[key] = {
                generator: gen,
                identityData: gen.buildSkin(skinDef),
                frameCanvases: {},  // lazily populated: "dir:anim:frameIdx" -> canvas
                dirty: false,
            };
        }
        return _templateCache[key];
    }

    // ========================================================================
    // UVMAP RENDERER CLASS
    // ========================================================================

    function UVMapRenderer(generatorType, skinName) {
        this._generatorType = generatorType;
        this._skinName = skinName;
        this._template = getTemplate(generatorType, skinName);

        // Animation state
        this._state = 'idle';
        this._direction = 'down';
        this._frameIndex = 0;
        this._elapsed = 0;
        this._attackComplete = false;
        this._dyingFrameCount = 0;
        this._deathComplete = false;
        this._onComplete = null;
    }

    UVMapRenderer.prototype.setState = function(state) {
        // Attack guard: if already attacking and not complete, ignore re-entry
        if (state === 'attacking' && this._state === 'attacking' && !this._attackComplete) {
            return;
        }

        if (state === this._state) return;

        this._state = state;
        this._frameIndex = 0;
        this._elapsed = 0;
        this._attackComplete = false;

        if (state === 'dying') {
            this._dyingFrameCount = 0;
            this._deathComplete = false;
        }
    };

    UVMapRenderer.prototype.setDirection = function(direction) {
        this._direction = direction;
    };

    UVMapRenderer.prototype.update = function(deltaTime) {
        if (!this._template) return;

        var gen = this._template.generator;
        var animType = this._stateToAnimType();
        var fps = ANIM_FPS[this._state] || 8;
        var frameDuration = 1000 / fps;

        this._elapsed += deltaTime;

        if (this._elapsed >= frameDuration) {
            this._elapsed -= frameDuration;

            if (this._state === 'dying') {
                this._dyingFrameCount++;
                if (this._dyingFrameCount >= DEATH_FADE_FRAMES) {
                    this._deathComplete = true;
                }
                return;
            }

            var frameCount = gen.getFrameCount(animType);
            if (frameCount <= 0) return;

            if (gen.isLooping(animType)) {
                this._frameIndex = (this._frameIndex + 1) % frameCount;
            } else {
                // Non-looping (attack)
                if (this._frameIndex < frameCount - 1) {
                    this._frameIndex++;
                } else {
                    // Attack finished
                    this._attackComplete = true;
                    this._state = 'idle';
                    this._frameIndex = 0;
                }
            }
        }
    };

    UVMapRenderer.prototype.draw = function(ctx, screenX, screenY, tileSize, directionOverride) {
        if (!this._template) return;

        var gen = this._template.generator;
        var nativeSize = gen.getSize(); // 32
        var drawSize = tileSize * UV_RENDER_SCALE;
        var pixelScale = drawSize / nativeSize;
        var offsetX = (tileSize - drawSize) / 2;
        var offsetY = (tileSize - drawSize) / 2;

        var dir = directionOverride || this._direction;
        var flipX = (dir === 'right');
        var lookupDir = flipX ? 'left' : dir;
        var animType = this._stateToAnimType();

        // Get the pre-rendered canvas for this frame
        var frameCanvas = this._getFrameCanvas(lookupDir, animType, this._frameIndex);
        if (!frameCanvas) return;

        ctx.save();

        // Apply death fade
        if (this._state === 'dying') {
            var fadeProgress = Math.min(this._dyingFrameCount / DEATH_FADE_FRAMES, 1);
            ctx.globalAlpha = (ctx.globalAlpha || 1) * (1 - fadeProgress);
        }

        if (flipX) {
            // Flip horizontally: translate to right edge, scale -1 on X
            ctx.translate(screenX + tileSize, screenY);
            ctx.scale(-1, 1);
            ctx.drawImage(frameCanvas, -offsetX, offsetY, drawSize, drawSize);
        } else {
            ctx.drawImage(frameCanvas, screenX + offsetX, screenY + offsetY, drawSize, drawSize);
        }

        ctx.restore();
    };

    UVMapRenderer.prototype.isComplete = function() {
        if (this._state === 'dying') return this._deathComplete;
        return false;
    };

    UVMapRenderer.prototype.setSkin = function(skinName) {
        this._skinName = skinName;
        // Invalidate the template (will rebuild on next getTemplate call)
        var key = this._generatorType + ':' + skinName;
        if (_templateCache[key]) {
            // Rebuild identity texture
            var gen = _templateCache[key].generator;
            var skinDef = (typeof HUMANOID_SKINS !== 'undefined') ? HUMANOID_SKINS[skinName] : null;
            if (skinDef) {
                _templateCache[key].identityData = gen.buildSkin(skinDef);
                _templateCache[key].frameCanvases = {}; // clear cached frames
            }
        } else {
            // Different skin, get new template
            this._template = getTemplate(this._generatorType, skinName);
        }
    };

    UVMapRenderer.prototype.reset = function() {
        this._state = 'idle';
        this._direction = 'down';
        this._frameIndex = 0;
        this._elapsed = 0;
        this._attackComplete = false;
        this._dyingFrameCount = 0;
        this._deathComplete = false;
        this._onComplete = null;
    };

    UVMapRenderer.prototype.clearCache = function() {
        if (this._template) {
            this._template.frameCanvases = {};
        }
    };

    UVMapRenderer.prototype.getSize = function() {
        if (this._template && this._template.generator) {
            return this._template.generator.getSize();
        }
        return 32;
    };

    // --- Internal helpers ---

    UVMapRenderer.prototype._stateToAnimType = function() {
        switch (this._state) {
            case 'walking': return 'walk';
            case 'attacking': return 'attack';
            case 'idle':
            case 'hit':
            case 'dying':
            default:
                return 'idle';
        }
    };

    UVMapRenderer.prototype._getFrameCanvas = function(direction, animType, frameIdx) {
        if (!this._template) return null;

        var cacheKey = direction + ':' + animType + ':' + frameIdx;
        var cached = this._template.frameCanvases[cacheKey];
        if (cached) return cached;

        // Build the frame canvas
        var gen = this._template.generator;
        var uvFrames = gen.getUVFrames(direction, animType);
        if (!uvFrames || !uvFrames[frameIdx]) return null;

        var canvas = gen.renderFrameToCanvas(uvFrames[frameIdx], this._template.identityData);
        this._template.frameCanvases[cacheKey] = canvas;
        return canvas;
    };

    // ========================================================================
    // EXPORTS
    // ========================================================================

    window.UVMapRenderer = UVMapRenderer;
    window.UV_RENDER_SCALE = UV_RENDER_SCALE;

    console.log('[UVMapRenderer] Loaded (scale=' + UV_RENDER_SCALE + ', deathFrames=' + DEATH_FADE_FRAMES + ')');
})();
