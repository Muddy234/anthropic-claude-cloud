// ============================================================================
// EFFECT RENDERER - Specialized Renderer for Attack Effects
// ============================================================================
// Extends SpriteRenderer concepts with effect-specific features:
// - Rotation support (for directional attacks)
// - Alpha/opacity blending
// - Additive blending for glows
// - Scale transforms
// - Palette modifications (brightness, element colors)
// ============================================================================

const EffectRenderer = {
    // Cache for rendered effect frames
    cache: new Map(),

    // Default pixel scale
    defaultScale: 2,

    // Maximum cache size to prevent memory issues
    maxCacheSize: 500,

    // ========================================================================
    // CORE RENDERING
    // ========================================================================

    /**
     * Draw an effect sprite with transforms
     * @param {CanvasRenderingContext2D} ctx - Target context
     * @param {Object} sprite - Sprite definition from EffectSprites
     * @param {number} x - Screen X position (center)
     * @param {number} y - Screen Y position (center)
     * @param {number} scale - Pixel scale multiplier
     * @param {Object} options - Transform options
     */
    draw(ctx, sprite, x, y, scale = this.defaultScale, options = {}) {
        if (!sprite || !sprite.pixels) {
            return;
        }

        const {
            rotation = 0,           // Degrees
            alpha = 1.0,            // 0.0 - 1.0
            scaleX = 1.0,           // Horizontal scale
            scaleY = 1.0,           // Vertical scale
            flipX = false,          // Horizontal flip
            flipY = false,          // Vertical flip
            blendMode = 'source-over',  // Canvas blend mode
            paletteMod = null,      // { brightness, saturation, hue }
            palette = null,         // Override palette
            offsetX = 0,            // Additional X offset
            offsetY = 0,            // Additional Y offset
            glow = false,           // Add glow effect
            glowColor = '#FFFFFF',  // Glow color
            glowSize = 3            // Glow radius
        } = options;

        // Get or create cached sprite image
        const cacheKey = this._getCacheKey(sprite, scale, { paletteMod, palette, flipX, flipY });
        let spriteCanvas = this.cache.get(cacheKey);

        if (!spriteCanvas) {
            spriteCanvas = this._renderToCanvas(sprite, scale, { paletteMod, palette, flipX, flipY });
            this._addToCache(cacheKey, spriteCanvas);
        }

        // Calculate dimensions with scale transforms
        const finalWidth = spriteCanvas.width * scaleX;
        const finalHeight = spriteCanvas.height * scaleY;

        // Save context state
        ctx.save();

        // Apply alpha
        ctx.globalAlpha = alpha;

        // Apply blend mode
        ctx.globalCompositeOperation = blendMode;

        // Move to draw position (center of effect)
        ctx.translate(x + offsetX, y + offsetY);

        // Apply rotation (in radians)
        if (rotation !== 0) {
            ctx.rotate(rotation * Math.PI / 180);
        }

        // Apply glow if enabled
        if (glow) {
            ctx.shadowColor = glowColor;
            ctx.shadowBlur = glowSize * scale;
        }

        // Draw centered on position
        ctx.drawImage(
            spriteCanvas,
            -finalWidth / 2,
            -finalHeight / 2,
            finalWidth,
            finalHeight
        );

        // Restore context state
        ctx.restore();
    },

    /**
     * Draw a projectile effect with automatic rotation toward target
     */
    drawProjectile(ctx, sprite, x, y, targetX, targetY, scale = this.defaultScale, options = {}) {
        // Calculate angle to target
        const angle = Math.atan2(targetY - y, targetX - x) * 180 / Math.PI;

        this.draw(ctx, sprite, x, y, scale, {
            ...options,
            rotation: angle
        });
    },

    /**
     * Draw a cone/breath effect aimed at a direction
     */
    drawCone(ctx, sprite, originX, originY, targetX, targetY, scale = this.defaultScale, options = {}) {
        // Calculate angle from origin to target
        const angle = Math.atan2(targetY - originY, targetX - originX) * 180 / Math.PI;

        // Offset the cone so it originates from the source
        const offsetX = Math.cos(angle * Math.PI / 180) * (sprite.width * scale / 4);
        const offsetY = Math.sin(angle * Math.PI / 180) * (sprite.height * scale / 4);

        this.draw(ctx, sprite, originX + offsetX, originY + offsetY, scale, {
            ...options,
            rotation: angle,
            offsetX: offsetX,
            offsetY: offsetY
        });
    },

    /**
     * Draw a beam effect between two points
     */
    drawBeam(ctx, sprite, startX, startY, endX, endY, scale = this.defaultScale, options = {}) {
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        // Calculate scale to stretch beam to distance
        const beamWidth = sprite.width * scale;
        const scaleX = distance / beamWidth;

        const centerX = (startX + endX) / 2;
        const centerY = (startY + endY) / 2;

        this.draw(ctx, sprite, centerX, centerY, scale, {
            ...options,
            rotation: angle,
            scaleX: scaleX
        });
    },

    /**
     * Draw using EffectAnimator frame data
     * Convenience method for rendering effects from the animator
     * @param {CanvasRenderingContext2D} ctx - Target context
     * @param {Object} frameData - Output from EffectAnimator.getCurrentFrame()
     * @param {number} scale - Pixel scale multiplier
     */
    drawFromAnimator(ctx, frameData, scale = this.defaultScale) {
        if (!frameData || !frameData.sprite) return;

        const { sprite, transforms, position } = frameData;

        this.draw(ctx, sprite, position.x, position.y, scale, {
            rotation: transforms.rotation,
            alpha: transforms.alpha,
            scaleX: transforms.scaleX,
            scaleY: transforms.scaleY,
            flipX: transforms.flipX,
            flipY: transforms.flipY,
            paletteMod: transforms.paletteMod,
            offsetX: transforms.horizontalOffset || 0,
            offsetY: transforms.verticalOffset || 0
        });
    },

    /**
     * Draw all active effects from EffectAnimator
     * @param {CanvasRenderingContext2D} ctx - Target context
     * @param {number} scale - Pixel scale multiplier
     */
    drawAllActiveEffects(ctx, scale = this.defaultScale) {
        if (!EffectAnimator) return;

        const effects = EffectAnimator.getAllActiveEffects();
        for (const effect of effects) {
            this.drawFromAnimator(ctx, effect, scale);
        }
    },

    // ========================================================================
    // RENDERING TO CANVAS
    // ========================================================================

    /**
     * Render sprite to offscreen canvas with palette modifications
     */
    _renderToCanvas(sprite, scale, options = {}) {
        const { paletteMod, palette, flipX, flipY } = options;

        const width = sprite.width * scale;
        const height = sprite.height * scale;

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        ctx.imageSmoothingEnabled = false;

        // Get final palette (with modifications applied)
        let finalPalette = palette || sprite.palette;
        if (paletteMod) {
            finalPalette = this._applyPaletteMod(finalPalette, paletteMod);
        }

        // Draw each pixel
        for (let py = 0; py < sprite.height; py++) {
            const row = sprite.pixels[py];
            if (!row) continue;

            for (let px = 0; px < sprite.width; px++) {
                const char = row[px];
                if (char === '.' || char === ' ') continue;

                const color = finalPalette[char];
                if (!color) continue;

                ctx.fillStyle = color;

                // Calculate draw position with flip support
                let drawX = flipX ? (sprite.width - 1 - px) * scale : px * scale;
                let drawY = flipY ? (sprite.height - 1 - py) * scale : py * scale;

                ctx.fillRect(drawX, drawY, scale, scale);
            }
        }

        return canvas;
    },

    /**
     * Apply palette modifications (brightness, saturation, etc.)
     */
    _applyPaletteMod(palette, mod) {
        const newPalette = {};

        for (const [char, color] of Object.entries(palette)) {
            newPalette[char] = this._modifyColor(color, mod);
        }

        return newPalette;
    },

    /**
     * Modify a single color based on palette mod settings
     */
    _modifyColor(hexColor, mod) {
        const { brightness = 1.0, saturation = 1.0, alpha = 1.0 } = mod;

        // Parse hex color
        let r = parseInt(hexColor.slice(1, 3), 16);
        let g = parseInt(hexColor.slice(3, 5), 16);
        let b = parseInt(hexColor.slice(5, 7), 16);

        // Apply brightness
        r = Math.round(Math.min(255, r * brightness));
        g = Math.round(Math.min(255, g * brightness));
        b = Math.round(Math.min(255, b * brightness));

        // Apply saturation (simple implementation)
        if (saturation !== 1.0) {
            const gray = 0.299 * r + 0.587 * g + 0.114 * b;
            r = Math.round(gray + saturation * (r - gray));
            g = Math.round(gray + saturation * (g - gray));
            b = Math.round(gray + saturation * (b - gray));
        }

        // Clamp values
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));

        // Return as rgba if alpha modified, else hex
        if (alpha !== 1.0) {
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }

        return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
    },

    // ========================================================================
    // ELEMENT COLOR VARIANTS
    // ========================================================================

    /**
     * Element color palettes for automatic palette swapping
     */
    elementPalettes: {
        fire: {
            primary: '#FF6B35',
            secondary: '#FFAA00',
            glow: '#FF4400',
            dark: '#AA3300'
        },
        ice: {
            primary: '#74B9FF',
            secondary: '#A8E6CF',
            glow: '#FFFFFF',
            dark: '#4A90D9'
        },
        water: {
            primary: '#0984E3',
            secondary: '#74B9FF',
            glow: '#A8E6CF',
            dark: '#0056B3'
        },
        poison: {
            primary: '#7D8B3B',
            secondary: '#AACC44',
            glow: '#CCFF66',
            dark: '#445522'
        },
        shadow: {
            primary: '#6C5CE7',
            secondary: '#A29BFE',
            glow: '#CC44CC',
            dark: '#333344'
        },
        earth: {
            primary: '#C4A35A',
            secondary: '#AA8866',
            glow: '#FFCC00',
            dark: '#6B4423'
        },
        holy: {
            primary: '#FFEAA7',
            secondary: '#FFFFFF',
            glow: '#FFFFCC',
            dark: '#CCAA44'
        },
        dark: {
            primary: '#636E72',
            secondary: '#2D3436',
            glow: '#444444',
            dark: '#1E272E'
        },
        arcane: {
            primary: '#A29BFE',
            secondary: '#DDA0DD',
            glow: '#CC66FF',
            dark: '#6C5CE7'
        }
    },

    /**
     * Create an element-colored variant of a sprite
     */
    createElementVariant(sprite, element) {
        const elementColors = this.elementPalettes[element];
        if (!elementColors) return sprite;

        // Map generic color positions to element colors
        const newPalette = {};
        const entries = Object.entries(sprite.palette);

        for (let i = 0; i < entries.length; i++) {
            const [char] = entries[i];
            // Map first colors to primary/secondary, later to glow/dark
            if (i === 0) newPalette[char] = elementColors.primary;
            else if (i === 1) newPalette[char] = elementColors.secondary;
            else if (i === 2) newPalette[char] = elementColors.glow;
            else newPalette[char] = elementColors.dark;
        }

        return {
            ...sprite,
            name: `${sprite.name}_${element}`,
            palette: newPalette
        };
    },

    // ========================================================================
    // CACHE MANAGEMENT
    // ========================================================================

    /**
     * Generate cache key for sprite variant
     */
    _getCacheKey(sprite, scale, options) {
        const name = sprite.name || 'unnamed';
        const paletteKey = options.palette ? JSON.stringify(options.palette) : 'default';
        const modKey = options.paletteMod ? JSON.stringify(options.paletteMod) : 'nomod';
        const flipKey = `${options.flipX ? 'fx' : ''}${options.flipY ? 'fy' : ''}`;
        return `effect_${name}_${scale}_${paletteKey}_${modKey}_${flipKey}`;
    },

    /**
     * Add to cache with size limit
     */
    _addToCache(key, canvas) {
        // Remove oldest entries if at max
        if (this.cache.size >= this.maxCacheSize) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, canvas);
    },

    /**
     * Clear the effect cache
     */
    clearCache() {
        this.cache.clear();
    },

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxCacheSize
        };
    },

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /**
     * Convert world coordinates to screen coordinates
     */
    worldToScreen(worldX, worldY, camera, tileSize) {
        return {
            x: (worldX - camera.x) * tileSize + camera.offsetX,
            y: (worldY - camera.y) * tileSize + camera.offsetY
        };
    },

    /**
     * Check if effect is on screen
     */
    isOnScreen(x, y, width, height, canvasWidth, canvasHeight, margin = 50) {
        return x + width + margin > 0 &&
               x - margin < canvasWidth &&
               y + height + margin > 0 &&
               y - margin < canvasHeight;
    },

    // ========================================================================
    // TWO-PASS RENDERING SYSTEM
    // ========================================================================

    /**
     * Draw ground-layer effects (telegraphs - render BELOW entities)
     */
    drawGround(ctx, camX, camY, tileSize, offsetX) {
        // Get telegraphs from EffectAnimator or EnemyAbilitySystem
        if (typeof EnemyAbilitySystem !== 'undefined') {
            for (const telegraph of EnemyAbilitySystem.activeTelegraphs || []) {
                this.drawTelegraph(ctx, telegraph, camX, camY, tileSize, offsetX);
            }
        }
    },

    /**
     * Draw overlay-layer effects (impacts, particles - render ABOVE entities)
     */
    drawOverlay(ctx, camX, camY, tileSize, offsetX) {
        // Draw active impact/channel effects from EffectAnimator
        if (typeof EffectAnimator !== 'undefined') {
            for (const [id, state] of EffectAnimator.activeEffects) {
                if (state.phase === 'impact') {
                    this.drawImpactEffect(ctx, state, camX, camY, tileSize, offsetX);
                } else if (state.phase === 'channel') {
                    // Draw channel-specific effects
                    if (state.config?.channel?.type === 'beam_channel') {
                        this.drawBeamChannel(ctx, state, camX, camY, tileSize, offsetX);
                    }
                    // Cone/breath channels use streaming particles (handled by particle system)
                } else if (state.phase === 'fading') {
                    // Draw fading lingering cloud for poison_cloud
                    if (state.config?.particles?.type === 'poison' && state.config?.channel?.linger) {
                        this.drawLingeringCloud(ctx, state, camX, camY, tileSize, offsetX);
                    } else {
                        this.drawImpactEffect(ctx, state, camX, camY, tileSize, offsetX);
                    }
                }

                // Draw dash trail if applicable
                if (state.config?.dash?.trail && state.trailPositions) {
                    this.drawDashTrail(ctx, state, camX, camY, tileSize, offsetX);
                }
            }
        }

        // Draw lingering hazard zones (poison clouds, etc.)
        if (typeof LingeringHazards !== 'undefined') {
            LingeringHazards.render(ctx, camX, camY, tileSize, offsetX);
        }
    },

    /**
     * Draw a lingering poison cloud during fading phase
     * Semi-transparent green cloud with slowly rising particles
     */
    drawLingeringCloud(ctx, effect, camX, camY, tileSize, offsetX) {
        const config = effect.config?.telegraph || {};
        const coneAngle = config.angle || Math.PI / 2;
        const radius = (config.radius || 3.0) * tileSize;

        // Calculate screen position
        const cx = (effect.x - camX) * tileSize + offsetX + tileSize / 2;
        const cy = (effect.y - camY) * tileSize + tileSize / 2;

        // Calculate direction
        const direction = effect.rotation * Math.PI / 180;
        const startAngle = direction - coneAngle / 2;
        const endAngle = direction + coneAngle / 2;

        // Calculate fade based on remaining time
        const fadeProgress = effect.phaseTimer / effect.maxTimer;
        const baseAlpha = 0.25 * fadeProgress;

        ctx.save();

        // Main cloud fill with gradient
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        gradient.addColorStop(0, `rgba(68, 170, 68, ${baseAlpha * 1.2})`);
        gradient.addColorStop(0.5, `rgba(68, 170, 68, ${baseAlpha})`);
        gradient.addColorStop(1, `rgba(68, 170, 68, 0)`);

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        // Pulsing edge effect
        const pulse = Math.sin(Date.now() / 300) * 0.1 + 0.9;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius * pulse, startAngle, endAngle);
        ctx.closePath();
        ctx.strokeStyle = `rgba(102, 204, 102, ${baseAlpha * 1.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    },

    // ========================================================================
    // IMPACT RENDERERS (Overlay Pass - render ABOVE entities)
    // ========================================================================

    /**
     * Draw impact effect based on type
     */
    drawImpactEffect(ctx, effect, camX, camY, tileSize, offsetX) {
        const config = effect.config?.impact || {};
        const type = config.type || 'burst';
        const progress = effect.phaseTimer / effect.maxTimer;  // 1 -> 0 as effect fades

        // Convert to screen coordinates
        const cx = (effect.x - camX) * tileSize + offsetX + tileSize / 2;
        const cy = (effect.y - camY) * tileSize + tileSize / 2;

        switch (type) {
            case 'slash_arc':
                this.drawSlashArc(ctx, cx, cy, effect, config, progress, tileSize);
                break;
            case 'ring_burst':
                this.drawRingBurst(ctx, cx, cy, config, progress, tileSize);
                break;
            case 'burst':
                this.drawBurst(ctx, cx, cy, config, progress, tileSize);
                break;
            case 'spark':
                this.drawSpark(ctx, cx, cy, config, progress, tileSize);
                break;
            case 'chomp':
                this.drawChomp(ctx, cx, cy, effect, config, progress, tileSize);
                break;
            case 'splat':
                this.drawSplat(ctx, cx, cy, config, progress, tileSize);
                break;
            default:
                this.drawBurst(ctx, cx, cy, config, progress, tileSize);
        }
    },

    /**
     * Slash arc for melee attacks - sweeping arc that fades
     */
    drawSlashArc(ctx, cx, cy, effect, config, progress, tileSize) {
        const radius = (effect.config?.telegraph?.radius || 1.5) * tileSize;
        const arcAngle = effect.config?.telegraph?.arcAngle || Math.PI / 2;
        const direction = effect.direction || 0;
        const color = config.color || '#FFFFFF';
        const sweepDir = config.sweepDirection === 'ccw' ? -1 : 1;

        // Arc sweeps during impact
        const sweepProgress = 1 - progress;  // 0 -> 1 as time passes
        const currentAngle = arcAngle * sweepProgress * sweepDir;
        const startAngle = direction - arcAngle / 2;
        const endAngle = startAngle + currentAngle;

        ctx.save();

        // Main slash arc
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, startAngle, endAngle, sweepDir < 0);
        ctx.closePath();
        ctx.fillStyle = this.hexToRgba(color, 0.6 * progress);
        ctx.fill();

        // Bright edge
        ctx.strokeStyle = this.hexToRgba(color, 0.9 * progress);
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, startAngle, endAngle, sweepDir < 0);
        ctx.stroke();

        ctx.restore();
    },

    /**
     * Ring burst for ground slam - expanding concentric rings
     */
    drawRingBurst(ctx, cx, cy, config, progress, tileSize) {
        const maxRadius = (config.radius || 3) * tileSize;
        const ringCount = config.ringCount || 2;
        const color = config.color || '#FFAA00';

        ctx.save();

        for (let i = 0; i < ringCount; i++) {
            // Each ring starts at different time
            const ringDelay = i * 0.15;
            const ringProgress = Math.max(0, (1 - progress) - ringDelay) / (1 - ringDelay);

            if (ringProgress > 0 && ringProgress <= 1) {
                const radius = maxRadius * ringProgress;
                const alpha = (1 - ringProgress) * 0.8;

                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, Math.PI * 2);
                ctx.strokeStyle = this.hexToRgba(color, alpha);
                ctx.lineWidth = 4 * (1 - ringProgress) + 2;
                ctx.stroke();
            }
        }

        // Ground crack effect if enabled
        if (config.groundCrack) {
            this.drawGroundCrack(ctx, cx, cy, maxRadius * 0.8, progress, color);
        }

        ctx.restore();
    },

    /**
     * Ground crack lines radiating from center
     */
    drawGroundCrack(ctx, cx, cy, radius, progress, color) {
        const crackCount = 6;
        const crackAlpha = progress * 0.5;

        ctx.save();
        ctx.strokeStyle = this.hexToRgba(color, crackAlpha);
        ctx.lineWidth = 2;

        for (let i = 0; i < crackCount; i++) {
            const angle = (i / crackCount) * Math.PI * 2;
            const length = radius * (0.5 + Math.random() * 0.5);

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(
                cx + Math.cos(angle) * length,
                cy + Math.sin(angle) * length
            );
            ctx.stroke();
        }

        ctx.restore();
    },

    /**
     * Simple burst for projectile impacts
     */
    drawBurst(ctx, cx, cy, config, progress, tileSize) {
        // Validate inputs to prevent NaN errors
        if (!isFinite(cx) || !isFinite(cy) || !isFinite(progress) || !isFinite(tileSize)) {
            return; // Skip rendering if values are invalid
        }

        const radius = (config.radius || 0.5) * tileSize;
        const color = config.color || '#FFAA00';
        const expandedRadius = radius * (1 + (1 - progress) * 0.5);

        // Additional validation for radius
        if (!isFinite(expandedRadius) || expandedRadius <= 0) {
            return;
        }

        ctx.save();

        // Glow
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, expandedRadius);
        gradient.addColorStop(0, this.hexToRgba(color, 0.8 * progress));
        gradient.addColorStop(0.5, this.hexToRgba(color, 0.4 * progress));
        gradient.addColorStop(1, this.hexToRgba(color, 0));

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, expandedRadius, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.3 * progress, 0, Math.PI * 2);
        ctx.fillStyle = this.hexToRgba('#FFFFFF', 0.9 * progress);
        ctx.fill();

        ctx.restore();
    },

    /**
     * Spark effect for arrows/small projectiles
     */
    drawSpark(ctx, cx, cy, config, progress, tileSize) {
        const radius = (config.radius || 0.2) * tileSize;
        const color = config.color || '#FFCC00';
        const sparkCount = 4;

        ctx.save();

        for (let i = 0; i < sparkCount; i++) {
            const angle = (i / sparkCount) * Math.PI * 2;
            const dist = radius * (1 - progress) * 2;
            const sparkX = cx + Math.cos(angle) * dist;
            const sparkY = cy + Math.sin(angle) * dist;

            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 3 * progress, 0, Math.PI * 2);
            ctx.fillStyle = this.hexToRgba(color, progress);
            ctx.fill();
        }

        ctx.restore();
    },

    /**
     * Chomp effect for bite attacks
     */
    drawChomp(ctx, cx, cy, effect, config, progress, tileSize) {
        const color = config.color || '#FFFFFF';
        const direction = effect.direction || 0;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(direction);

        // Two arcs closing like jaws
        const jawAngle = Math.PI / 4 * progress;  // Jaws close as progress decreases
        const radius = tileSize * 0.6;

        ctx.strokeStyle = this.hexToRgba(color, 0.8 * progress);
        ctx.lineWidth = 4;

        // Top jaw
        ctx.beginPath();
        ctx.arc(0, 0, radius, -Math.PI/2 - jawAngle, -Math.PI/2 + jawAngle);
        ctx.stroke();

        // Bottom jaw
        ctx.beginPath();
        ctx.arc(0, 0, radius, Math.PI/2 - jawAngle, Math.PI/2 + jawAngle);
        ctx.stroke();

        ctx.restore();
    },

    /**
     * Splat effect for web/poison projectiles
     */
    drawSplat(ctx, cx, cy, config, progress, tileSize) {
        const radius = (config.radius || 0.4) * tileSize;
        const color = config.color || '#FFFFFF';
        const blobCount = 5;

        ctx.save();
        ctx.fillStyle = this.hexToRgba(color, 0.6 * progress);

        // Central blob
        ctx.beginPath();
        ctx.arc(cx, cy, radius * progress, 0, Math.PI * 2);
        ctx.fill();

        // Surrounding smaller blobs
        for (let i = 0; i < blobCount; i++) {
            const angle = (i / blobCount) * Math.PI * 2;
            const dist = radius * (1 - progress) * 1.5;
            const blobX = cx + Math.cos(angle) * dist;
            const blobY = cy + Math.sin(angle) * dist;
            const blobRadius = radius * 0.3 * progress;

            ctx.beginPath();
            ctx.arc(blobX, blobY, blobRadius, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    },

    /**
     * Draw beam channel effect (sustained beam during channel phase)
     */
    drawBeamChannel(ctx, effect, camX, camY, tileSize, offsetX) {
        const config = effect.config?.channel || {};
        const telegraphConfig = effect.config?.telegraph || {};
        const width = (telegraphConfig.width || 0.3) * tileSize;
        const color = telegraphConfig.color || '#88FF88';
        const progress = effect.phaseTimer / effect.maxTimer;

        // Calculate screen positions
        const sx = (effect.x - camX) * tileSize + offsetX + tileSize / 2;
        const sy = (effect.y - camY) * tileSize + tileSize / 2;
        const tx = (effect.targetX - camX) * tileSize + offsetX + tileSize / 2;
        const ty = (effect.targetY - camY) * tileSize + tileSize / 2;

        ctx.save();

        // Main beam
        ctx.strokeStyle = this.hexToRgba(color, 0.8);
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // Core (brighter, thinner)
        ctx.strokeStyle = this.hexToRgba('#FFFFFF', 0.6);
        ctx.lineWidth = width * 0.3;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        // Glow effect
        ctx.strokeStyle = this.hexToRgba(color, 0.3);
        ctx.lineWidth = width * 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        ctx.restore();
    },

    /**
     * Draw dash trail for charge attacks
     */
    drawDashTrail(ctx, effect, camX, camY, tileSize, offsetX) {
        const config = effect.config?.dash || {};
        const afterimages = config.afterimages || 3;
        const color = effect.config?.telegraph?.color || '#FF4444';

        if (!effect.trailPositions || effect.trailPositions.length === 0) return;

        ctx.save();

        for (let i = 0; i < effect.trailPositions.length && i < afterimages; i++) {
            const pos = effect.trailPositions[i];
            const alpha = (1 - i / afterimages) * 0.5;

            const px = (pos.x - camX) * tileSize + offsetX + tileSize / 2;
            const py = (pos.y - camY) * tileSize + tileSize / 2;

            ctx.beginPath();
            ctx.arc(px, py, tileSize * 0.4, 0, Math.PI * 2);
            ctx.fillStyle = this.hexToRgba(color, alpha);
            ctx.fill();
        }

        ctx.restore();
    },

    // ========================================================================
    // TELEGRAPH RENDERING
    // ========================================================================

    /**
     * Draw a telegraph based on its type
     */
    drawTelegraph(ctx, telegraph, camX, camY, tileSize, offsetX) {
        const config = (typeof ABILITY_EFFECTS !== 'undefined' ? ABILITY_EFFECTS[telegraph.abilityId]?.telegraph : null) || {};
        const type = config.type || 'circle';
        const progress = 1 - (telegraph.timer / telegraph.maxTimer);

        // Convert to screen coordinates
        const cx = (telegraph.centerX - camX) * tileSize + offsetX + tileSize / 2;
        const cy = (telegraph.centerY - camY) * tileSize + tileSize / 2;
        const tx = (telegraph.targetX - camX) * tileSize + offsetX + tileSize / 2;
        const ty = (telegraph.targetY - camY) * tileSize + tileSize / 2;

        // Direction (locked from config or calculated)
        const direction = telegraph.lockedDirection ?? Math.atan2(ty - cy, tx - cx);

        switch (type) {
            case 'circle_grow':
                this.drawCircleGrow(ctx, cx, cy, config, progress, tileSize);
                break;
            case 'arc_fill':
                this.drawArcFill(ctx, cx, cy, direction, config, progress, tileSize);
                break;
            case 'line_fixed':
                this.drawLineFixed(ctx, cx, cy, direction, config, progress, tileSize);
                break;
            case 'cone_fixed':
                this.drawConeFixed(ctx, cx, cy, direction, config, progress, tileSize);
                break;
            case 'caster_charge':
                this.drawCasterCharge(ctx, cx, cy, config, progress, tileSize);
                break;
            case 'beam_telegraph':
                this.drawBeamTelegraph(ctx, cx, cy, tx, ty, config, progress, tileSize);
                break;
            default:
                this.drawBasicCircle(ctx, cx, cy, telegraph, progress, tileSize);
        }
    },

    // ========================================================================
    // TELEGRAPH SHAPE RENDERERS
    // ========================================================================

    /**
     * Circle that grows from 30% to 100% size
     */
    drawCircleGrow(ctx, cx, cy, config, progress, tileSize) {
        const maxRadius = (config.radius || 2) * tileSize;
        const currentRadius = maxRadius * (0.3 + progress * 0.7);

        const fillColor = config.color || '#FFAA00';
        const borderColor = config.borderColor || '#FFDD00';
        const fillAlpha = config.fillOpacity || 0.25;
        const pulse = Math.sin(Date.now() * 0.008) * 0.15;

        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = this.hexToRgba(fillColor, fillAlpha + progress * 0.15);
        ctx.fill();
        ctx.strokeStyle = this.hexToRgba(borderColor, 0.5 + pulse);
        ctx.lineWidth = 2 + progress * 2;
        ctx.stroke();
        ctx.restore();
    },

    /**
     * Arc/pie-slice for melee attacks
     */
    drawArcFill(ctx, cx, cy, direction, config, progress, tileSize) {
        const radius = (config.radius || 1.5) * tileSize;
        const arcAngle = config.arcAngle || Math.PI / 2;
        const startAngle = direction - arcAngle / 2;
        const endAngle = direction + arcAngle / 2;

        const fillColor = config.color || '#FF6464';
        const borderColor = config.borderColor || '#FFAAAA';
        const pulse = Math.sin(Date.now() * 0.008) * 0.15;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius * (0.5 + progress * 0.5), startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = this.hexToRgba(fillColor, 0.3 + progress * 0.3);
        ctx.fill();
        ctx.strokeStyle = this.hexToRgba(borderColor, 0.5 + pulse);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    },

    /**
     * Fixed-direction line for charge attacks
     */
    drawLineFixed(ctx, cx, cy, direction, config, progress, tileSize) {
        const length = (config.length || 5) * tileSize;
        const width = (config.width || 1) * tileSize;

        const fillColor = config.color || '#FF4444';
        const borderColor = config.borderColor || '#FF8888';
        const pulse = Math.sin(Date.now() * 0.008) * 0.15;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(direction);

        // Draw rectangle
        ctx.beginPath();
        ctx.rect(0, -width / 2, length * progress, width);
        ctx.fillStyle = this.hexToRgba(fillColor, 0.3 + progress * 0.2);
        ctx.fill();
        ctx.strokeStyle = this.hexToRgba(borderColor, 0.5 + pulse);
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.restore();
    },

    /**
     * Fixed-direction cone for breath attacks
     */
    drawConeFixed(ctx, cx, cy, direction, config, progress, tileSize) {
        const radius = (config.radius || 4) * tileSize;
        const coneAngle = config.angle || Math.PI / 3;
        const startAngle = direction - coneAngle / 2;
        const endAngle = direction + coneAngle / 2;

        const fillColor = config.color || '#FF6600';
        const borderColor = config.borderColor || '#FFAA00';
        const pulse = Math.sin(Date.now() * 0.008) * 0.15;

        ctx.save();
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius * (0.4 + progress * 0.6), startAngle, endAngle);
        ctx.closePath();
        ctx.fillStyle = this.hexToRgba(fillColor, 0.25 + progress * 0.2);
        ctx.fill();
        ctx.strokeStyle = this.hexToRgba(borderColor, 0.5 + pulse);
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    },

    /**
     * Caster glow for projectile wind-up
     */
    drawCasterCharge(ctx, cx, cy, config, progress, tileSize) {
        const glowColor = config.glowColor || '#FF6600';
        const pulseRate = config.pulseRate || 200;
        const pulse = Math.sin(Date.now() / pulseRate * Math.PI * 2) * 0.3 + 0.7;
        const size = tileSize * 0.4 * (0.5 + progress * 0.5) * pulse;

        ctx.save();

        // Outer glow
        const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 2);
        gradient.addColorStop(0, this.hexToRgba(glowColor, 0.6 * progress));
        gradient.addColorStop(0.5, this.hexToRgba(glowColor, 0.3 * progress));
        gradient.addColorStop(1, this.hexToRgba(glowColor, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Inner core
        ctx.beginPath();
        ctx.arc(cx, cy, size * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = this.hexToRgba('#FFFFFF', 0.8 * progress * pulse);
        ctx.fill();

        ctx.restore();
    },

    /**
     * Beam telegraph (dashed line to target)
     */
    drawBeamTelegraph(ctx, cx, cy, tx, ty, config, progress, tileSize) {
        const width = (config.width || 0.3) * tileSize;
        const color = config.color || '#88FF88';
        const isDashed = config.style === 'dashed';

        ctx.save();
        ctx.strokeStyle = this.hexToRgba(color, 0.3 + progress * 0.4);
        ctx.lineWidth = width;

        if (isDashed) {
            ctx.setLineDash([10, 10]);
        }

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(tx, ty);
        ctx.stroke();

        ctx.restore();
    },

    /**
     * Fallback basic circle
     */
    drawBasicCircle(ctx, cx, cy, telegraph, progress, tileSize) {
        const radius = (telegraph.aoe?.radius || 1) * tileSize;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 0, 0, ${0.3 + progress * 0.3})`;
        ctx.fill();
        ctx.strokeStyle = `rgba(255, 255, 0, ${0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    },

    // ========================================================================
    // COLOR UTILITIES
    // ========================================================================

    /**
     * Convert hex color to rgba string
     */
    hexToRgba(hex, alpha) {
        // Handle shorthand hex
        if (hex.length === 4) {
            hex = '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
        }
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    },

    // ========================================================================
    // HEAL PULSE EFFECT (Life Drain visual)
    // ========================================================================

    /**
     * Draw a heal pulse effect - expanding green ring that fades out
     * Used for life drain caster feedback
     * @param {CanvasRenderingContext2D} ctx - Target context
     * @param {number} x - Screen X position (center)
     * @param {number} y - Screen Y position (center)
     * @param {number} progress - Animation progress 0.0 - 1.0
     * @param {string} color - Hex color for the pulse
     * @param {number} tileSize - Current tile size for scaling
     */
    drawHealPulse(ctx, x, y, progress, color, tileSize) {
        // Expanding ring that fades out
        const maxRadius = tileSize * 0.8;
        const currentRadius = maxRadius * progress;
        const alpha = 1 - progress;

        ctx.save();

        // Main ring stroke
        ctx.beginPath();
        ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
        ctx.strokeStyle = this.hexToRgba(color, alpha * 0.9);
        ctx.lineWidth = 3 * (1 - progress * 0.5);  // Thinner as it expands
        ctx.stroke();

        // Inner glow fill
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, currentRadius);
        gradient.addColorStop(0, this.hexToRgba(color, alpha * 0.4));
        gradient.addColorStop(0.5, this.hexToRgba(color, alpha * 0.2));
        gradient.addColorStop(1, this.hexToRgba(color, 0));
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, currentRadius, 0, Math.PI * 2);
        ctx.fill();

        // Bright center core (healing indicator)
        if (progress < 0.5) {
            const coreAlpha = (1 - progress * 2) * 0.8;
            ctx.beginPath();
            ctx.arc(x, y, tileSize * 0.15 * (1 - progress), 0, Math.PI * 2);
            ctx.fillStyle = this.hexToRgba('#FFFFFF', coreAlpha);
            ctx.fill();
        }

        ctx.restore();
    }
};

// ============================================================================
// HEAL PULSE EFFECTS - Tracking system for life drain heal visuals
// ============================================================================
// Manages active heal pulse effects that play on enemies when they drain health
// ============================================================================

const HealPulseEffects = {
    // Active heal pulse effects
    pulses: [],

    /**
     * Spawn a new heal pulse effect at a position
     * @param {number} x - World X position (tile coordinates)
     * @param {number} y - World Y position (tile coordinates)
     * @param {string} color - Hex color for the pulse (default green)
     */
    spawn(x, y, color = '#88FF88') {
        this.pulses.push({
            x: x,
            y: y,
            color: color,
            progress: 0,
            duration: 400  // 400ms duration
        });
    },

    /**
     * Update all active heal pulses
     * @param {number} deltaTime - Time since last update in milliseconds
     */
    update(deltaTime) {
        for (const pulse of this.pulses) {
            pulse.progress += deltaTime / pulse.duration;
        }
        // Remove completed pulses
        this.pulses = this.pulses.filter(p => p.progress < 1);
    },

    /**
     * Render all active heal pulses
     * @param {CanvasRenderingContext2D} ctx - Target context
     * @param {number} camX - Camera X position
     * @param {number} camY - Camera Y position
     * @param {number} tileSize - Current tile size
     * @param {number} offsetX - X offset (sidebar width)
     */
    render(ctx, camX, camY, tileSize, offsetX) {
        for (const pulse of this.pulses) {
            // Convert world coordinates to screen coordinates
            const screenX = (pulse.x - camX) * tileSize + offsetX + tileSize / 2;
            const screenY = (pulse.y - camY) * tileSize + tileSize / 2;

            // Use EffectRenderer's drawHealPulse
            EffectRenderer.drawHealPulse(ctx, screenX, screenY, pulse.progress, pulse.color, tileSize);
        }
    },

    /**
     * Clear all active heal pulses
     */
    clear() {
        this.pulses = [];
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.EffectRenderer = EffectRenderer;
    window.HealPulseEffects = HealPulseEffects;
}
