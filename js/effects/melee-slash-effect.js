// ============================================================================
// MELEE SLASH EFFECT - Code-based sword/weapon slash visualization
// ============================================================================
// Replaces sprite-based attack animations with procedural effects
// Features:
// - Arc-shaped slash geometry (tapered, curved)
// - Particle system for sparks/impact
// - Configurable per weapon type
// ============================================================================

const MeleeSlashEffect = {
    // Active effects being rendered
    activeEffects: [],

    // Default configuration
    defaults: {
        slashDuration: 8,        // Frames for the white arc (fast)
        particlesPerFrame: 4,    // Sparks spawned per frame
        particleFadeRate: 0.08,  // How fast particles fade
        baseThickness: 12,       // Base arc thickness
        segments: 16             // Arc smoothness
    },

    // ========================================================================
    // EFFECT CREATION
    // ========================================================================

    /**
     * Create a new slash effect
     * @param {number} originX - Player center X in TILE coordinates
     * @param {number} originY - Player center Y in TILE coordinates
     * @param {number} facingAngle - Direction in radians (0 = right, PI/2 = down)
     * @param {Object} options - Weapon-specific options
     * @returns {Object} The created effect
     */
    create(originX, originY, facingAngle, options = {}) {
        const effect = {
            // Position in TILE coordinates (will be converted to screen in render)
            originX,
            originY,
            facingAngle,

            // Timing
            currentFrame: 0,
            slashDuration: options.slashDuration || this.defaults.slashDuration,
            isFinished: false,

            // Geometry (in tile units, will be scaled by tileSize in render)
            radius: options.range || 1.25,
            arcAngle: Math.PI * (options.arcDegrees || 90) / 180,
            maxThickness: this.defaults.baseThickness + ((options.range || 1.25) * 6),

            // Colors
            slashColor: options.color || '#FFFFFF',
            particleColor: options.particleColor || options.color || '#FFFFFF',
            glowColor: options.glowColor || null,

            // Particles (positions relative to origin in tile units)
            particles: [],
            particlesPerFrame: options.particlesPerFrame || this.defaults.particlesPerFrame,

            // Pre-calculated angles
            startAngle: facingAngle - (Math.PI * (options.arcDegrees || 90) / 180) / 2,
            endAngle: facingAngle + (Math.PI * (options.arcDegrees || 90) / 180) / 2
        };

        console.log(`[MeleeSlashEffect] Created effect at (${originX.toFixed(2)}, ${originY.toFixed(2)}) angle=${(facingAngle * 180 / Math.PI).toFixed(0)}°`);

        this.activeEffects.push(effect);
        return effect;
    },

    /**
     * Create slash effect from attack direction
     * @param {Object} attacker - Entity attacking (has x, y or gridX, gridY)
     * @param {Object} target - Target position or entity
     * @param {Object} weapon - Weapon data (optional)
     */
    createFromAttack(attacker, target, weapon = null) {
        // Get attacker position in tile coordinates (center of tile)
        const ax = (attacker.gridX ?? attacker.x) + 0.5;
        const ay = (attacker.gridY ?? attacker.y) + 0.5;

        // Get target position in tile coordinates
        const tx = (target.gridX ?? target.x) + 0.5;
        const ty = (target.gridY ?? target.y) + 0.5;

        // Calculate facing angle
        const facingAngle = Math.atan2(ty - ay, tx - ax);

        // Get weapon-specific options
        const options = this.getWeaponOptions(weapon);

        return this.create(ax, ay, facingAngle, options);
    },

    /**
     * Get visual options based on weapon type
     * @param {Object} weapon - Weapon data
     * @returns {Object} Visual options
     */
    getWeaponOptions(weapon) {
        if (!weapon) {
            // Unarmed/default
            return {
                range: 1.0,
                arcDegrees: 60,
                color: '#AAAAAA',
                slashDuration: 6
            };
        }

        const damageType = weapon.damageType || 'blade';
        const weaponType = weapon.weaponType || 'sword';
        const range = weapon.stats?.range || 1.25;
        const element = weapon.element;

        // Base options by damage type
        let options = {
            range: range,
            arcDegrees: 90,
            slashDuration: 8,
            color: '#FFFFFF'
        };

        // Customize by weapon type
        switch (weaponType) {
            case 'sword':
            case 'knife':
                options.arcDegrees = 100;
                options.color = '#FFFFFF';
                break;

            case 'mace':
            case 'hammer':
                options.arcDegrees = 70;
                options.color = '#CCCCCC';
                options.slashDuration = 10;
                options.particlesPerFrame = 6;
                break;

            case 'spear':
            case 'polearm':
                options.arcDegrees = 45;
                options.color = '#DDDDDD';
                options.range = range * 1.2;
                break;

            case 'axe':
                options.arcDegrees = 80;
                options.color = '#EEEEEE';
                options.slashDuration = 9;
                break;

            case 'dagger':
                options.arcDegrees = 50;
                options.slashDuration = 5;
                options.particlesPerFrame = 2;
                break;
        }

        // Add element colors
        if (element) {
            const elementColors = {
                fire: { color: '#FF6B35', particleColor: '#FFAA00', glowColor: '#FF4400' },
                ice: { color: '#74B9FF', particleColor: '#A8E6CF', glowColor: '#0984E3' },
                water: { color: '#0984E3', particleColor: '#74B9FF', glowColor: '#0056B3' },
                earth: { color: '#C4A35A', particleColor: '#8B7355', glowColor: '#6B4423' },
                nature: { color: '#2ECC71', particleColor: '#A8E6CF', glowColor: '#27AE60' },
                death: { color: '#6C5CE7', particleColor: '#A29BFE', glowColor: '#5B4FCF' },
                holy: { color: '#FFEAA7', particleColor: '#FFFFFF', glowColor: '#F9CA24' },
                dark: { color: '#636E72', particleColor: '#2D3436', glowColor: '#1E272E' },
                arcane: { color: '#A29BFE', particleColor: '#DDA0DD', glowColor: '#9B59B6' }
            };

            if (elementColors[element]) {
                Object.assign(options, elementColors[element]);
            }
        }

        return options;
    },

    // ========================================================================
    // UPDATE
    // ========================================================================

    /**
     * Update all active effects
     * @param {number} dt - Delta time in ms (unused, frame-based)
     */
    update(dt) {
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            this.updateEffect(effect);

            if (effect.isFinished) {
                this.activeEffects.splice(i, 1);
            }
        }
    },

    /**
     * Update a single effect
     * @param {Object} effect
     */
    updateEffect(effect) {
        effect.currentFrame++;

        // Spawn particles while slash is active
        if (effect.currentFrame <= effect.slashDuration) {
            this.spawnParticles(effect);
        }

        // Update particles
        for (let i = effect.particles.length - 1; i >= 0; i--) {
            const p = effect.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                effect.particles.splice(i, 1);
            }
        }

        // Check if finished
        if (effect.currentFrame > effect.slashDuration && effect.particles.length === 0) {
            effect.isFinished = true;
        }
    },

    /**
     * Spawn particles along the slash arc
     * @param {Object} effect
     */
    spawnParticles(effect) {
        const count = effect.particlesPerFrame;

        for (let i = 0; i < count; i++) {
            // Random position along the arc
            const progress = Math.random();
            const angle = effect.startAngle + progress * (effect.endAngle - effect.startAngle);

            // Spawn near the tip (80% to 110% of radius) - radius is in tile units
            const dist = effect.radius * (0.8 + Math.random() * 0.3);

            // Position relative to origin (in tile units)
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;

            // Velocity: fly outward (in tile units per frame)
            const speed = 0.05 + Math.random() * 0.08;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;

            effect.particles.push({
                x: px,
                y: py,
                vx: vx,
                vy: vy,
                alpha: 1.0,
                decay: this.defaults.particleFadeRate + Math.random() * 0.04,
                size: 2 + Math.floor(Math.random() * 3)
            });
        }
    },

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render all active effects
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} camX - Camera X in tile coordinates
     * @param {number} camY - Camera Y in tile coordinates
     * @param {number} tileSize - Effective tile size (with zoom)
     * @param {number} offsetX - X offset (TRACKER_WIDTH)
     */
    render(ctx, camX = 0, camY = 0, tileSize = 32, offsetX = 0) {
        for (const effect of this.activeEffects) {
            this.renderEffect(ctx, effect, camX, camY, tileSize, offsetX);
        }
    },

    /**
     * Render a single effect
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} effect
     * @param {number} camX - Camera X in tile coordinates
     * @param {number} camY - Camera Y in tile coordinates
     * @param {number} tileSize - Effective tile size (with zoom)
     * @param {number} offsetX - X offset (TRACKER_WIDTH)
     */
    renderEffect(ctx, effect, camX, camY, tileSize, offsetX) {
        // Convert tile coordinates to screen coordinates
        const screenX = (effect.originX - camX) * tileSize + offsetX;
        const screenY = (effect.originY - camY) * tileSize;

        // Scale radius to screen pixels
        const screenRadius = effect.radius * tileSize;

        // Draw glow layer (if element)
        if (effect.glowColor && effect.currentFrame <= effect.slashDuration) {
            ctx.save();
            ctx.globalAlpha = 0.3 * (1 - effect.currentFrame / effect.slashDuration);
            ctx.fillStyle = effect.glowColor;
            this.drawSlashArc(ctx, screenX, screenY, effect, effect.maxThickness * 1.5, screenRadius);
            ctx.restore();
        }

        // Draw main slash arc (only while active)
        if (effect.currentFrame <= effect.slashDuration) {
            const fadeProgress = effect.currentFrame / effect.slashDuration;
            ctx.save();
            ctx.globalAlpha = 1 - (fadeProgress * 0.5); // Slight fade
            ctx.fillStyle = effect.slashColor;
            this.drawSlashArc(ctx, screenX, screenY, effect, effect.maxThickness, screenRadius);
            ctx.restore();
        }

        // Draw particles
        this.renderParticles(ctx, effect, screenX, screenY, tileSize);
    },

    /**
     * Draw the arc-shaped slash
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} px - Player screen X
     * @param {number} py - Player screen Y
     * @param {Object} effect
     * @param {number} thickness
     * @param {number} screenRadius - Radius in screen pixels
     */
    drawSlashArc(ctx, px, py, effect, thickness, screenRadius) {
        const segments = this.defaults.segments;

        ctx.beginPath();

        // Outer edge
        for (let i = 0; i <= segments; i++) {
            const progress = i / segments;
            const angle = effect.startAngle + progress * (effect.endAngle - effect.startAngle);

            // Thickness varies - thickest in middle, thin at edges
            const thicknessMod = Math.sin(progress * Math.PI);
            const currentThickness = thicknessMod * thickness;

            const r = screenRadius + currentThickness / 2;
            const x = px + Math.cos(angle) * r;
            const y = py + Math.sin(angle) * r;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        // Inner edge (reverse)
        for (let i = segments; i >= 0; i--) {
            const progress = i / segments;
            const angle = effect.startAngle + progress * (effect.endAngle - effect.startAngle);

            const thicknessMod = Math.sin(progress * Math.PI);
            const currentThickness = thicknessMod * thickness;

            const r = screenRadius - currentThickness / 2;
            const x = px + Math.cos(angle) * r;
            const y = py + Math.sin(angle) * r;

            ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.fill();
    },

    /**
     * Render particles for an effect
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} effect
     * @param {number} screenX
     * @param {number} screenY
     * @param {number} tileSize
     */
    renderParticles(ctx, effect, screenX, screenY, tileSize) {
        for (const p of effect.particles) {
            if (p.alpha <= 0) continue;

            // Convert particle position from tile units to screen pixels
            const particleScreenX = screenX + p.x * tileSize;
            const particleScreenY = screenY + p.y * tileSize;

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = effect.particleColor;
            ctx.fillRect(
                particleScreenX - p.size / 2,
                particleScreenY - p.size / 2,
                p.size,
                p.size
            );
            ctx.restore();
        }
    },

    // ========================================================================
    // UTILITY
    // ========================================================================

    /**
     * Clear all active effects
     */
    clear() {
        this.activeEffects = [];
    },

    /**
     * Check if any effects are active
     * @returns {boolean}
     */
    hasActiveEffects() {
        return this.activeEffects.length > 0;
    }
};

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Create a slash effect when player attacks
 * @param {Object} target - Target entity or position
 * @param {Object} weapon - Player's weapon (optional)
 */
function createPlayerSlash(target, weapon = null) {
    if (!game || !game.player) return null;
    return MeleeSlashEffect.createFromAttack(game.player, target, weapon);
}

/**
 * Create a slash effect when enemy attacks
 * @param {Object} enemy - Attacking enemy
 * @param {Object} target - Target (usually player)
 */
function createEnemySlash(enemy, target) {
    // Enemies get simpler, less flashy effects
    const options = {
        range: enemy.attackRange || 1,
        arcDegrees: 60,
        color: '#CC4444',
        particleColor: '#FF6666',
        slashDuration: 6,
        particlesPerFrame: 2
    };

    const tileSize = typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 32;
    const ex = (enemy.gridX ?? enemy.x) * tileSize + tileSize / 2;
    const ey = (enemy.gridY ?? enemy.y) * tileSize + tileSize / 2;
    const tx = (target.gridX ?? target.x) * tileSize + tileSize / 2;
    const ty = (target.gridY ?? target.y) * tileSize + tileSize / 2;
    const angle = Math.atan2(ty - ey, tx - ex);

    return MeleeSlashEffect.create(ex, ey, angle, options);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.MeleeSlashEffect = MeleeSlashEffect;
window.createPlayerSlash = createPlayerSlash;
window.createEnemySlash = createEnemySlash;

console.log('[MeleeSlashEffect] Code-based melee attack effects loaded');
