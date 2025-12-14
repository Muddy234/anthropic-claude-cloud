// ============================================================================
// MELEE SLASH EFFECT - Code-based sword/weapon slash visualization
// ============================================================================
// Features:
// - State machine: WINDUP → SLASH → FADE
// - Windup telegraph (expanding circle)
// - "Cleave" shape: Fixed outer edge, dynamic inner edge (thin→thick→thin)
// - Particle system for sparks along the blade
// ============================================================================

const MeleeSlashEffect = {
    // Active effects being rendered
    activeEffects: [],

    // State constants
    State: {
        WINDUP: 'windup',
        SLASH: 'slash',
        FADE: 'fade'
    },

    // Default configuration
    defaults: {
        windupDuration: 5,       // Frames for telegraph
        slashDuration: 8,        // Frames for the slash arc
        particlesPerFrame: 6,    // Sparks spawned per frame during slash
        particleFadeRate: 0.08,  // How fast particles fade
        hiltOffset: 0.3,         // Minimum distance from player (in tiles)
        segments: 20             // Arc smoothness
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
        const arcDegrees = options.arcDegrees || 90;
        const totalSwingArc = Math.PI * arcDegrees / 180;

        const effect = {
            // Position in TILE coordinates
            originX,
            originY,
            facingAngle,

            // State machine
            state: this.State.WINDUP,
            stateTimer: 0,
            isFinished: false,

            // Timing
            windupDuration: options.windupDuration || this.defaults.windupDuration,
            slashDuration: options.slashDuration || this.defaults.slashDuration,

            // Geometry (in tile units)
            maxRange: options.range || 1.25,           // Outer edge (fixed at max range)
            hiltOffset: options.hiltOffset || this.defaults.hiltOffset, // Inner edge minimum
            totalSwingArc: totalSwingArc,

            // Pre-calculated angles (swing goes from startAngle to endAngle)
            startAngle: facingAngle + (totalSwingArc / 2),
            endAngle: facingAngle - (totalSwingArc / 2),

            // Colors
            slashColor: options.color || '#FFFFFF',
            particleColor: options.particleColor || options.color || '#FFFFFF',
            glowColor: options.glowColor || null,

            // Particles (positions relative to origin in tile units)
            particles: [],
            particlesPerFrame: options.particlesPerFrame || this.defaults.particlesPerFrame
        };

        console.log(`[MeleeSlashEffect] Created effect at (${originX.toFixed(2)}, ${originY.toFixed(2)}) angle=${(facingAngle * 180 / Math.PI).toFixed(0)}°`);

        this.activeEffects.push(effect);
        return effect;
    },

    /**
     * Create slash effect from attack direction
     */
    createFromAttack(attacker, target, weapon = null) {
        const ax = (attacker.gridX ?? attacker.x) + 0.5;
        const ay = (attacker.gridY ?? attacker.y) + 0.5;
        const tx = (target.gridX ?? target.x) + 0.5;
        const ty = (target.gridY ?? target.y) + 0.5;
        const facingAngle = Math.atan2(ty - ay, tx - ax);
        const options = this.getWeaponOptions(weapon);
        return this.create(ax, ay, facingAngle, options);
    },

    /**
     * Get visual options based on weapon type
     */
    getWeaponOptions(weapon) {
        if (!weapon) {
            return {
                range: 1.0,
                arcDegrees: 60,
                color: '#AAAAAA',
                slashDuration: 6
            };
        }

        const weaponType = weapon.weaponType || 'sword';
        const range = weapon.stats?.range || 1.25;
        const element = weapon.element;

        let options = {
            range: range,
            arcDegrees: 90,
            slashDuration: 8,
            color: '#FFFFFF'
        };

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
                options.particlesPerFrame = 8;
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
                options.windupDuration = 3;
                options.particlesPerFrame = 3;
                break;
        }

        // Element colors
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
     * Update a single effect using state machine
     */
    updateEffect(effect) {
        effect.stateTimer++;

        switch (effect.state) {
            case this.State.WINDUP:
                if (effect.stateTimer >= effect.windupDuration) {
                    effect.state = this.State.SLASH;
                    effect.stateTimer = 0;
                }
                break;

            case this.State.SLASH:
                this.spawnSparks(effect);
                if (effect.stateTimer >= effect.slashDuration) {
                    effect.state = this.State.FADE;
                    effect.stateTimer = 0;
                }
                break;

            case this.State.FADE:
                if (effect.particles.length === 0) {
                    effect.isFinished = true;
                }
                break;
        }

        // Always update particles
        this.updateParticles(effect);
    },

    /**
     * Update particles for an effect
     */
    updateParticles(effect) {
        for (let i = effect.particles.length - 1; i >= 0; i--) {
            const p = effect.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                effect.particles.splice(i, 1);
            }
        }
    },

    /**
     * Spawn sparks along the entire blade (hilt to tip)
     */
    spawnSparks(effect) {
        const count = effect.particlesPerFrame + Math.floor(Math.random() * 4);

        for (let i = 0; i < count; i++) {
            // Random position along the swing arc
            const arcProgress = Math.random();
            const angle = effect.startAngle + arcProgress * (effect.endAngle - effect.startAngle);

            // Random distance between hilt and tip (favor the tip slightly)
            const dist = effect.hiltOffset + (Math.random() * (effect.maxRange - effect.hiltOffset));

            // Position relative to origin (in tile units)
            const px = Math.cos(angle) * dist;
            const py = Math.sin(angle) * dist;

            // Velocity: fly outward along the angle
            const speed = 0.03 + Math.random() * 0.06;
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
     */
    render(ctx, camX = 0, camY = 0, tileSize = 32, offsetX = 0) {
        for (const effect of this.activeEffects) {
            this.renderEffect(ctx, effect, camX, camY, tileSize, offsetX);
        }
    },

    /**
     * Render a single effect based on its state
     */
    renderEffect(ctx, effect, camX, camY, tileSize, offsetX) {
        // Convert tile coordinates to screen coordinates
        const screenX = (effect.originX - camX) * tileSize + offsetX;
        const screenY = (effect.originY - camY) * tileSize;

        ctx.fillStyle = effect.slashColor;

        switch (effect.state) {
            case this.State.WINDUP:
                this.drawWindupTelegraph(ctx, screenX, screenY, effect, tileSize);
                break;

            case this.State.SLASH:
                this.drawCleaveShape(ctx, screenX, screenY, effect, tileSize);
                break;

            // FADE state: just show particles, no shape
        }

        // Always draw particles
        this.renderParticles(ctx, effect, screenX, screenY, tileSize);
    },

    /**
     * Draw the windup telegraph - small expanding circle
     */
    drawWindupTelegraph(ctx, px, py, effect, tileSize) {
        const progress = effect.stateTimer / effect.windupDuration;

        // Position: slightly in front of player in facing direction
        const offsetDist = 0.4 * tileSize; // ~0.4 tiles in front
        const centerX = px + Math.cos(effect.facingAngle) * offsetDist;
        const centerY = py + Math.sin(effect.facingAngle) * offsetDist;

        // Size: starts small, grows
        const minSize = 5;
        const maxSize = 20;
        const size = minSize + (progress * (maxSize - minSize));

        ctx.save();
        ctx.globalAlpha = 0.7 + (progress * 0.3); // Gets more opaque
        ctx.fillStyle = effect.slashColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    },

    /**
     * Draw the "cleave" slash shape
     * - Outer edge: Fixed at max range (smooth circular arc)
     * - Inner edge: Dynamic "thin → thick → thin" using sine wave
     */
    drawCleaveShape(ctx, px, py, effect, tileSize) {
        const segments = this.defaults.segments;
        const maxRangePixels = effect.maxRange * tileSize;
        const hiltOffsetPixels = effect.hiltOffset * tileSize;

        ctx.beginPath();

        // 1. OUTER EDGE - Always at max range (go from start to end)
        for (let i = 0; i <= segments; i++) {
            const progress = i / segments;
            const currentAngle = effect.startAngle + progress * (effect.endAngle - effect.startAngle);

            // Outer point is fixed at max range
            const x = px + Math.cos(currentAngle) * maxRangePixels;
            const y = py + Math.sin(currentAngle) * maxRangePixels;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }

        // 2. INNER EDGE - Dynamic "cleave" (go backwards from end to start)
        // Creates "thin → thick → thin" effect using sine wave
        for (let i = segments; i >= 0; i--) {
            const progress = i / segments;
            const currentAngle = effect.startAngle + progress * (effect.endAngle - effect.startAngle);

            // Calculate sine wave expansion (0 → 1 → 0)
            const expansion = Math.sin(progress * Math.PI);

            // When expansion = 0 (at ends): innerRadius = maxRange (thin line at tip)
            // When expansion = 1 (at center): innerRadius = hiltOffset (full cleave)
            const currentInnerRadius = maxRangePixels - (expansion * (maxRangePixels - hiltOffsetPixels));

            const x = px + Math.cos(currentAngle) * currentInnerRadius;
            const y = py + Math.sin(currentAngle) * currentInnerRadius;

            ctx.lineTo(x, y);
        }

        ctx.closePath();

        // Draw glow layer first (if element)
        if (effect.glowColor) {
            ctx.save();
            ctx.globalAlpha = 0.4;
            ctx.fillStyle = effect.glowColor;
            ctx.shadowColor = effect.glowColor;
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.restore();
        }

        // Draw main fill
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = effect.slashColor;
        ctx.fill();
        ctx.restore();
    },

    /**
     * Render particles for an effect
     */
    renderParticles(ctx, effect, screenX, screenY, tileSize) {
        for (const p of effect.particles) {
            if (p.alpha <= 0) continue;

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

    clear() {
        this.activeEffects = [];
    },

    hasActiveEffects() {
        return this.activeEffects.length > 0;
    },

    /**
     * Check if any effect is currently dealing damage (in SLASH state)
     */
    isDealingDamage() {
        return this.activeEffects.some(e => e.state === this.State.SLASH);
    }
};

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

function createPlayerSlash(target, weapon = null) {
    if (!game || !game.player) return null;
    return MeleeSlashEffect.createFromAttack(game.player, target, weapon);
}

function createEnemySlash(enemy, target) {
    const options = {
        range: enemy.attackRange || 1,
        arcDegrees: 60,
        color: '#CC4444',
        particleColor: '#FF6666',
        slashDuration: 6,
        windupDuration: 3,
        particlesPerFrame: 3
    };

    const ex = (enemy.gridX ?? enemy.x) + 0.5;
    const ey = (enemy.gridY ?? enemy.y) + 0.5;
    const tx = (target.gridX ?? target.x) + 0.5;
    const ty = (target.gridY ?? target.y) + 0.5;
    const angle = Math.atan2(ty - ey, tx - ex);

    return MeleeSlashEffect.create(ex, ey, angle, options);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.MeleeSlashEffect = MeleeSlashEffect;
window.createPlayerSlash = createPlayerSlash;
window.createEnemySlash = createEnemySlash;

console.log('[MeleeSlashEffect] Code-based melee attack effects loaded (v2 - cleave style)');
