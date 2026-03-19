// ============================================================================
// BODYPART RENDERER - Layered Sprite Compositing Engine
// ============================================================================
// Composites 6 body parts with per-frame offset animation.
// Handles z-order per direction, flipX for right, state machine.
// ============================================================================

class BodypartRenderer {
    constructor(spriteDataOrName, config, animationData) {
        // Accept a sprite set name (string) or direct sprite data (object)
        if (typeof spriteDataOrName === 'string') {
            this.spriteSetName = spriteDataOrName;
            this.spriteData = (typeof BodypartSpriteRegistry !== 'undefined') ?
                BodypartSpriteRegistry.get(spriteDataOrName) : null;
        } else {
            this.spriteSetName = null;
            this.spriteData = spriteDataOrName || (typeof BODY_PART_SPRITES !== 'undefined' ? BODY_PART_SPRITES : null);
        }
        this.config = config || (typeof BODYPART_SPRITE_CONFIG !== 'undefined' ? BODYPART_SPRITE_CONFIG : null);
        this.animData = animationData || (typeof BODYPART_WALK_ANIMATION !== 'undefined' ? BODYPART_WALK_ANIMATION : null);

        // Animation state
        this.state = {
            current: 'idle',
            direction: 'down',
            frameIndex: 0,
            elapsed: 0,
            moveSpeed: 1.0,
            onComplete: null
        };

        // Cache for resolved right-direction frames
        this._rightFrameCache = {};
    }

    // =========================================================================
    // State Machine
    // =========================================================================

    setState(newState) {
        if (this.state.current === newState) return;
        if (this.state.current === 'dying') return; // Terminal state

        const allowed = this.config.transitions[this.state.current];
        if (allowed && !allowed.includes(newState)) return;

        this.state.current = newState;
        this.state.frameIndex = 0;
        this.state.elapsed = 0;
    }

    setDirection(direction) {
        if (this.state.direction === direction) return;
        this.state.direction = direction;
        // Snap immediately — don't reset frame index (continue walk cycle)
    }

    reset() {
        this.state.current = 'idle';
        this.state.direction = 'down';
        this.state.frameIndex = 0;
        this.state.elapsed = 0;
        this.state.moveSpeed = 1.0;
        this.state.onComplete = null;
    }

    setSpriteSet(name) {
        if (typeof BodypartSpriteRegistry !== 'undefined' && BodypartSpriteRegistry.has(name)) {
            this.spriteSetName = name;
            this.spriteData = BodypartSpriteRegistry.get(name);
        }
    }

    // =========================================================================
    // Animation Update
    // =========================================================================

    update(deltaTime) {
        const stateConfig = this.config.states[this.state.current];
        if (!stateConfig || stateConfig.frameCount <= 1) return; // idle is static

        const baseFPS = this.config.walkFPS;
        const speedMult = Math.max(this.config.minSpeedMult, Math.min(this.config.maxSpeedMult, this.state.moveSpeed));
        const effectiveFPS = Math.max(this.config.minFPS, Math.min(this.config.maxFPS, baseFPS * speedMult));
        const frameDuration = 1000 / effectiveFPS;

        this.state.elapsed += deltaTime;
        if (this.state.elapsed >= frameDuration) {
            this.state.elapsed -= frameDuration;
            this.state.frameIndex++;

            if (this.state.frameIndex >= stateConfig.frameCount) {
                if (stateConfig.looping) {
                    this.state.frameIndex = 0;
                } else {
                    this.state.frameIndex = stateConfig.frameCount - 1;
                    if (this.state.onComplete) {
                        this.state.onComplete();
                    }
                }
            }
        }
    }

    // =========================================================================
    // Drawing
    // =========================================================================

    draw(ctx, x, y, scale, directionOverride, frameOverride) {
        if (!this.spriteData || !this.config || !this.animData) return;

        const direction = directionOverride || this.state.direction;
        const frameIdx = (frameOverride !== undefined) ? frameOverride : this.state.frameIndex;
        const isRight = (direction === 'right');
        const spriteDir = isRight ? 'left' : direction;

        // Get sprite data for this direction
        const dirSprites = this.spriteData.directions[spriteDir];
        if (!dirSprites) return;

        // Get z-order for this direction
        const layerOrder = this.config.layerOrder[direction];
        if (!layerOrder) return;

        // Get offsets for current frame
        const offsets = this._getOffsets(direction, frameIdx);

        // Render each part in z-order (back to front)
        for (const partName of layerOrder) {
            // For right direction, swap part names to get the correct sprite
            const spritePart = isRight ? (this.config.mirrorSwaps[partName] || partName) : partName;
            const partSprite = dirSprites[spritePart];
            if (!partSprite) continue;

            const offset = offsets[partName] || [0, 0];
            this._renderPart(ctx, partSprite, offset, x, y, scale, isRight);
        }
    }

    _getOffsets(direction, frameIdx) {
        const stateName = this.state.current;

        // Idle: all offsets zero
        if (stateName === 'idle') {
            const idleDir = (direction === 'right') ? 'left' : direction;
            const idleOffsets = this.animData.idle[idleDir];
            if (direction === 'right' && idleOffsets) {
                return this._deriveRightOffsets(idleOffsets);
            }
            return idleOffsets || {};
        }

        // Walking: use walk cycle data
        if (stateName === 'walking') {
            const walkDir = (direction === 'right') ? 'left' : direction;
            const walkFrames = this.animData.walk[walkDir];
            if (!walkFrames) return {};

            const frame = walkFrames[frameIdx] || walkFrames[0];
            if (direction === 'right') {
                return this._deriveRightOffsets(frame);
            }
            return frame;
        }

        // Other states: return zeros for now (attack, hit, dying data not yet defined)
        return {};
    }

    _deriveRightOffsets(leftFrame) {
        // Derive right direction offsets from left:
        // 1. Swap leftArm↔rightArm and leftLeg↔rightLeg
        // 2. Negate all dx values
        const result = {};
        const swaps = this.config.mirrorSwaps;

        for (const [partName, offset] of Object.entries(leftFrame)) {
            const targetPart = swaps[partName] || partName;
            result[targetPart] = [-offset[0], offset[1]]; // negate dx, keep dy
        }

        return result;
    }

    _renderPart(ctx, partSprite, offset, x, y, scale, flipX) {
        const pixels = partSprite.pixels;
        const palette = partSprite.palette;
        const dx = offset[0];
        const dy = offset[1];

        for (let py = 0; py < pixels.length; py++) {
            const row = pixels[py];
            for (let px = 0; px < row.length; px++) {
                const char = row[px];
                if (char === '.') continue; // transparent

                const color = palette[char];
                if (!color) continue;

                // Apply offset and optional flipX
                let finalX = px + dx;
                let finalY = py + dy;

                if (flipX) {
                    finalX = 31 - (px + dx);
                }

                ctx.fillStyle = color;
                ctx.fillRect(
                    x + finalX * scale,
                    y + finalY * scale,
                    scale,
                    scale
                );
            }
        }
    }

    // =========================================================================
    // Utility
    // =========================================================================

    getState() {
        return { ...this.state };
    }

    getCurrentOffsets() {
        return this._getOffsets(this.state.direction, this.state.frameIndex);
    }

    getLayerOrder(direction) {
        return this.config.layerOrder[direction || this.state.direction] || [];
    }
}

// Export for browser and Node.js
if (typeof window !== 'undefined') {
    window.BodypartRenderer = BodypartRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BodypartRenderer };
}
