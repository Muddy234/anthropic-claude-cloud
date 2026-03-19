/**
 * Player Sprite Renderer
 * Handles layered compositing and rendering of player + equipment
 */

const PlayerSpriteRenderer = {
    // Composite sprite cache
    compositeCache: new Map(),

    // Animation state
    animationState: {
        type: 'idle',      // 'idle', 'walk', 'attack'
        frameIndex: 0,
        elapsed: 0
    },

    /**
     * Main render function - draws player with all equipment layers
     */
    draw(ctx, player, screenX, screenY, tileSize, options = {}) {
        const direction = player.facing || 'down';
        const frameData = this._getCurrentFrameData(player);

        // Get or build composite sprite
        const composite = this._getCompositeSprite(player, direction, frameData);

        // Calculate draw position with animation offsets
        const config = typeof PLAYER_SPRITE_CONFIG !== 'undefined' ? PLAYER_SPRITE_CONFIG : { width: 32, pixelScale: 2 };
        const scale = config.pixelScale;
        const spriteSize = config.width * scale;
        const drawScale = tileSize / spriteSize * 1.3;  // Slightly larger than tile
        const drawSize = spriteSize * drawScale;

        let drawX = screenX + (tileSize - drawSize) / 2;
        let drawY = screenY + (tileSize - drawSize) / 2;

        // Apply animation offsets
        if (frameData.verticalOffset) {
            drawY -= frameData.verticalOffset * drawScale;
        }
        if (frameData.horizontalOffset) {
            drawX += frameData.horizontalOffset * drawScale;
        }

        // Apply scale transforms
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        const scaleX = frameData.scaleX || 1.0;
        const scaleY = frameData.scaleY || 1.0;

        if (scaleX !== 1.0 || scaleY !== 1.0) {
            const centerX = drawX + drawSize / 2;
            const centerY = drawY + drawSize;  // Anchor at feet
            ctx.translate(centerX, centerY);
            ctx.scale(scaleX, scaleY);
            ctx.translate(-centerX, -centerY);
        }

        ctx.drawImage(composite, drawX, drawY, drawSize, drawSize);
        ctx.restore();
    },

    /**
     * Get or build composite sprite from cache
     */
    _getCompositeSprite(player, direction, frameData) {
        const cacheKey = this._getCacheKey(player, direction, frameData.frameIndex);

        if (this.compositeCache.has(cacheKey)) {
            return this.compositeCache.get(cacheKey);
        }

        const composite = this._buildComposite(player, direction, frameData);
        this._addToCache(cacheKey, composite);
        return composite;
    },

    /**
     * Build composite sprite with all layers
     */
    _buildComposite(player, direction, frameData) {
        const config = typeof PLAYER_SPRITE_CONFIG !== 'undefined' ? PLAYER_SPRITE_CONFIG : { width: 32, height: 32, pixelScale: 2, layerOrder: ['BODY', 'LEGS', 'FEET', 'CHEST', 'HEAD', 'OFF', 'MAIN'] };
        const scale = config.pixelScale;
        const size = config.width * scale;

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Layer 1: Base body
        const bodySprite = this._getAnimatedBodySprite(player, direction, frameData);
        const bodyPalette = this._buildBodyPalette(player);
        this._renderPixelSprite(ctx, bodySprite, bodyPalette, 0, 0, scale);

        // Layers 2-7: Equipment
        for (const slot of config.layerOrder) {
            if (slot === 'BODY') continue;  // Already rendered

            const equipped = player.equipped?.[slot];
            if (!equipped) continue;

            // Get visual mapping (or use ID directly as sprite key)
            const visual = typeof EQUIPMENT_VISUAL_MAP !== 'undefined' ? EQUIPMENT_VISUAL_MAP[equipped.id] : null;

            // Determine sprite key: from visual mapping, or use equipped.id directly
            const spriteKey = visual?.sprite || equipped.id;

            // Get sprite data
            const spriteData = typeof EQUIPMENT_SPRITES !== 'undefined' ? EQUIPMENT_SPRITES[spriteKey] : null;
            if (!spriteData?.directions?.[direction]) continue;

            const dirData = spriteData.directions[direction];

            // Build palette: base sprite palette + visual overrides + rarity
            const basePalette = spriteData.palette;
            const overridePalette = visual?.palette || null;
            const palette = this._buildEquipmentPalette(basePalette, overridePalette, equipped.rarity);

            // Get direction-specific offset
            const dirOffset = config.directionOffsets?.[direction]?.[slot] || { x: 0, y: 0 };

            // Apply glow effect for magic items
            if (visual?.glow) {
                ctx.shadowColor = visual.glow;
                ctx.shadowBlur = 4;
            }

            this._renderPixelSprite(
                ctx,
                dirData,
                palette,
                (dirData.offsetX || 0) + dirOffset.x,
                (dirData.offsetY || 0) + dirOffset.y,
                scale
            );

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }

        return canvas;
    },

    /**
     * Get body sprite with animation deltas applied
     */
    _getAnimatedBodySprite(player, direction, frameData) {
        const sprites = typeof PLAYER_SPRITES !== 'undefined' ? PLAYER_SPRITES : null;
        if (!sprites?.player_base?.directions?.[direction]) {
            // Return empty sprite if not available (32x32)
            return { pixels: Array(32).fill('................................') };
        }

        const baseSprite = sprites.player_base.directions[direction];

        if (!frameData.deltas || Object.keys(frameData.deltas).length === 0) {
            return baseSprite;
        }

        // Apply deltas to create animated frame
        const animatedPixels = baseSprite.pixels.map((row, rowIndex) => {
            if (!frameData.deltas[rowIndex]) return row;

            let newRow = row.split('');
            for (const [col, char] of Object.entries(frameData.deltas[rowIndex])) {
                newRow[parseInt(col)] = char;
            }
            return newRow.join('');
        });

        return { ...baseSprite, pixels: animatedPixels };
    },

    /**
     * Render pixel sprite to canvas
     */
    _renderPixelSprite(ctx, spriteData, palette, offsetX, offsetY, scale) {
        const pixels = spriteData.pixels;
        if (!pixels) return;

        for (let py = 0; py < pixels.length; py++) {
            const row = pixels[py];
            for (let px = 0; px < row.length; px++) {
                const char = row[px];
                if (char === '.' || char === ' ') continue;

                const color = palette[char];
                if (!color) continue;

                ctx.fillStyle = color;
                ctx.fillRect(
                    (px + offsetX) * scale,
                    (py + offsetY) * scale,
                    scale,
                    scale
                );
            }
        }
    },

    /**
     * Build body palette with player customization
     */
    _buildBodyPalette(player) {
        const config = typeof PLAYER_SPRITE_CONFIG !== 'undefined' ? PLAYER_SPRITE_CONFIG : {};
        const defaultPalette = config.defaultPalette || {
            // Hair
            'H': '#3D2817',
            'h': '#2A1A0F',
            // Skin
            'S': '#D4A574',
            's': '#B8896A',
            'X': '#8B5A5A',
            // Eyes
            'E': '#7A8B5A',
            'e': '#4A5A3A',
            // Mouth
            'M': '#9A6B5A',
            // Leather armor
            'L': '#6B4423',
            'l': '#4A2F18',
            // Body/tunic
            'B': '#4A4A3A',
            'b': '#3A3A2A',
            // Arm wraps
            'W': '#C4B59A',
            'w': '#9A8B6A',
            // Pants
            'P': '#4A3A2A',
            'p': '#3A2A1A',
            // Boots
            'F': '#3A2A1A',
            'f': '#2A1A0A',
            'R': '#6B5A4A',
            'r': '#5A4A3A'
        };

        // Apply player customization if available
        if (player.palette) {
            return { ...defaultPalette, ...player.palette };
        }

        return defaultPalette;
    },

    /**
     * Build equipment palette with overrides and rarity
     */
    _buildEquipmentPalette(basePalette, overridePalette, rarity) {
        let palette = { ...basePalette };

        // Apply item-specific overrides
        if (overridePalette) {
            Object.assign(palette, overridePalette);
        }

        // Apply rarity modifier
        if (typeof applyRarityModifier === 'function') {
            palette = applyRarityModifier(palette, rarity);
        }

        return palette;
    },

    /**
     * Update animation state
     */
    update(deltaTime, player) {
        const isMoving = player.isMoving;
        const isAttacking = player.isAttacking;

        // Determine animation type
        let targetType = 'idle';
        if (isAttacking) targetType = 'attack';
        else if (isMoving) targetType = 'walk';

        // Reset if type changed
        if (this.animationState.type !== targetType) {
            this.animationState = {
                type: targetType,
                frameIndex: 0,
                elapsed: 0
            };
        }

        // Get animation data
        const anims = typeof PLAYER_ANIMATIONS !== 'undefined' ? PLAYER_ANIMATIONS : null;
        const anim = anims?.[targetType];
        if (!anim) return;

        // Update frame timing
        this.animationState.elapsed += deltaTime;
        const frameDuration = 1000 / anim.framesPerSecond;

        if (this.animationState.elapsed >= frameDuration) {
            this.animationState.elapsed -= frameDuration;
            this.animationState.frameIndex++;

            const frameCount = Object.keys(anim.frames).length;
            if (this.animationState.frameIndex >= frameCount) {
                if (anim.loop) {
                    this.animationState.frameIndex = 0;
                } else {
                    this.animationState.frameIndex = frameCount - 1;
                }
            }
        }
    },

    /**
     * Get current frame data for animation
     */
    _getCurrentFrameData(player) {
        const anims = typeof PLAYER_ANIMATIONS !== 'undefined' ? PLAYER_ANIMATIONS : null;
        const anim = anims?.[this.animationState.type];

        if (!anim) {
            return {
                frameIndex: 0,
                deltas: {},
                verticalOffset: 0,
                horizontalOffset: 0,
                scaleX: 1.0,
                scaleY: 1.0
            };
        }

        const frame = anim.frames[this.animationState.frameIndex] || anim.frames[0];
        const direction = player.facing || 'down';

        // Get direction-specific deltas
        let deltas = {};
        if (frame.deltas) {
            if (frame.deltas[direction]) {
                deltas = frame.deltas[direction];
            } else if (!frame.deltas.down && !frame.deltas.up && !frame.deltas.left && !frame.deltas.right) {
                deltas = frame.deltas;
            }
        }

        return {
            frameIndex: this.animationState.frameIndex,
            deltas: deltas,
            verticalOffset: frame.verticalOffset || 0,
            horizontalOffset: frame.horizontalOffset || 0,
            scaleX: frame.scaleX || 1.0,
            scaleY: frame.scaleY || 1.0
        };
    },

    /**
     * Generate cache key from player state
     */
    _getCacheKey(player, direction, frameIndex) {
        const config = typeof PLAYER_SPRITE_CONFIG !== 'undefined' ? PLAYER_SPRITE_CONFIG : { layerOrder: ['BODY', 'LEGS', 'FEET', 'CHEST', 'HEAD', 'OFF', 'MAIN'] };

        const equipped = config.layerOrder
            .filter(s => s !== 'BODY')
            .map(slot => player.equipped?.[slot]?.id || 'none')
            .join('|');

        const customization = `${player.palette?.H || 'default'}_${player.palette?.S || 'default'}`;

        return `${customization}_${equipped}_${direction}_${frameIndex}`;
    },

    /**
     * Clear the composite cache
     */
    clearCache() {
        this.compositeCache.clear();
    },

    /**
     * Add to cache with size limit
     */
    _addToCache(key, value) {
        const config = typeof PLAYER_SPRITE_CONFIG !== 'undefined' ? PLAYER_SPRITE_CONFIG : { maxCacheSize: 200 };

        if (this.compositeCache.size >= config.maxCacheSize) {
            const firstKey = this.compositeCache.keys().next().value;
            this.compositeCache.delete(firstKey);
        }
        this.compositeCache.set(key, value);
    },

    /**
     * Render a single sprite (for demo/preview purposes)
     */
    renderSingleSprite(ctx, spriteData, palette, x, y, scale) {
        this._renderPixelSprite(ctx, spriteData, palette, x / scale, y / scale, scale);
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.PlayerSpriteRenderer = PlayerSpriteRenderer;
}
