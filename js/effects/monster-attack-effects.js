// ============================================================================
// MONSTER ATTACK EFFECTS - Visual effects for monster magic and ranged attacks
// ============================================================================
// Features:
// - Magic effect: Element-colored burst at impact point
// - Ranged effect: Projectile trail from monster to target
// - Particle systems for both
// ============================================================================

// ============================================================================
// MONSTER MAGIC EFFECT - Burst/explosion at target location
// ============================================================================

const MonsterMagicEffect = {
    activeEffects: [],

    // Element color configurations
    elementColors: {
        fire: { primary: '#FF6B35', secondary: '#FFAA00', glow: '#FF4400' },
        ice: { primary: '#74B9FF', secondary: '#A8E6CF', glow: '#0984E3' },
        water: { primary: '#0984E3', secondary: '#74B9FF', glow: '#0056B3' },
        earth: { primary: '#C4A35A', secondary: '#8B7355', glow: '#6B4423' },
        nature: { primary: '#2ECC71', secondary: '#A8E6CF', glow: '#27AE60' },
        death: { primary: '#6C5CE7', secondary: '#A29BFE', glow: '#5B4FCF' },
        void: { primary: '#1E1E2E', secondary: '#4A4A6A', glow: '#2D2D4D' },
        arcane: { primary: '#A29BFE', secondary: '#DDA0DD', glow: '#9B59B6' },
        holy: { primary: '#FFEAA7', secondary: '#FFFFFF', glow: '#F9CA24' }
    },

    /**
     * Create a magic attack effect
     * @param {number} originX - Monster X (tile coords)
     * @param {number} originY - Monster Y (tile coords)
     * @param {number} targetX - Target X (tile coords)
     * @param {number} targetY - Target Y (tile coords)
     * @param {Object} options - Effect options
     */
    create(originX, originY, targetX, targetY, options = {}) {
        const element = options.element || 'arcane';
        const colors = this.elementColors[element] || this.elementColors.arcane;

        const effect = {
            // Impact point (where the magic hits)
            targetX,
            targetY,
            originX,
            originY,

            // Timing
            currentFrame: 0,
            travelDuration: 8,    // Frames to travel
            burstDuration: 12,    // Frames for burst animation
            isFinished: false,

            // State
            state: 'travel',      // 'travel' -> 'burst' -> finished

            // Visual
            colors: colors,
            element: element,
            isCrit: options.isCrit || false,
            radius: options.isCrit ? 0.6 : 0.4,  // Burst radius in tiles

            // Particles
            particles: []
        };

        this.activeEffects.push(effect);
        return effect;
    },

    update(dt) {
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            this.updateEffect(effect);

            if (effect.isFinished) {
                this.activeEffects.splice(i, 1);
            }
        }
    },

    updateEffect(effect) {
        effect.currentFrame++;

        switch (effect.state) {
            case 'travel':
                // Spawn trail particles during travel
                this.spawnTravelParticle(effect);
                if (effect.currentFrame >= effect.travelDuration) {
                    effect.state = 'burst';
                    effect.currentFrame = 0;
                    // Spawn burst particles
                    this.spawnBurstParticles(effect);
                }
                break;

            case 'burst':
                if (effect.currentFrame >= effect.burstDuration && effect.particles.length === 0) {
                    effect.isFinished = true;
                }
                break;
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
    },

    spawnTravelParticle(effect) {
        const progress = effect.currentFrame / effect.travelDuration;
        // Current position along the travel path
        const cx = effect.originX + (effect.targetX - effect.originX) * progress;
        const cy = effect.originY + (effect.targetY - effect.originY) * progress;

        // Spawn 2-3 particles at current position
        const count = 2 + Math.floor(Math.random() * 2);
        for (let i = 0; i < count; i++) {
            effect.particles.push({
                x: cx + (Math.random() - 0.5) * 0.2,
                y: cy + (Math.random() - 0.5) * 0.2,
                vx: (Math.random() - 0.5) * 0.02,
                vy: (Math.random() - 0.5) * 0.02,
                alpha: 0.8,
                decay: 0.08 + Math.random() * 0.04,
                size: 3 + Math.floor(Math.random() * 3),
                isTrail: true
            });
        }
    },

    spawnBurstParticles(effect) {
        // Spawn many particles in all directions
        const count = effect.isCrit ? 20 : 12;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
            const speed = 0.04 + Math.random() * 0.06;

            effect.particles.push({
                x: effect.targetX,
                y: effect.targetY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                alpha: 1.0,
                decay: 0.06 + Math.random() * 0.04,
                size: 3 + Math.floor(Math.random() * 4),
                isTrail: false
            });
        }
    },

    render(ctx, camX = 0, camY = 0, tileSize = 32, offsetX = 0) {
        for (const effect of this.activeEffects) {
            this.renderEffect(ctx, effect, camX, camY, tileSize, offsetX);
        }
    },

    renderEffect(ctx, effect, camX, camY, tileSize, offsetX) {
        const colors = effect.colors;

        // Draw travel orb
        if (effect.state === 'travel') {
            const progress = effect.currentFrame / effect.travelDuration;
            const cx = effect.originX + (effect.targetX - effect.originX) * progress;
            const cy = effect.originY + (effect.targetY - effect.originY) * progress;

            const screenX = (cx - camX) * tileSize + offsetX;
            const screenY = (cy - camY) * tileSize;

            // Glowing orb
            ctx.save();
            ctx.beginPath();
            const orbRadius = 8 + Math.sin(effect.currentFrame * 0.5) * 2;

            // Glow
            const gradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, orbRadius * 2);
            gradient.addColorStop(0, colors.primary);
            gradient.addColorStop(0.5, colors.glow + '80');
            gradient.addColorStop(1, 'transparent');
            ctx.fillStyle = gradient;
            ctx.arc(screenX, screenY, orbRadius * 2, 0, Math.PI * 2);
            ctx.fill();

            // Core
            ctx.beginPath();
            ctx.fillStyle = colors.secondary;
            ctx.arc(screenX, screenY, orbRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }

        // Draw burst
        if (effect.state === 'burst') {
            const progress = effect.currentFrame / effect.burstDuration;
            const screenX = (effect.targetX - camX) * tileSize + offsetX;
            const screenY = (effect.targetY - camY) * tileSize;

            // Expanding ring
            ctx.save();
            ctx.globalAlpha = 1 - progress;
            ctx.strokeStyle = colors.primary;
            ctx.lineWidth = 3 * (1 - progress);
            ctx.beginPath();
            const ringRadius = effect.radius * tileSize * progress;
            ctx.arc(screenX, screenY, ringRadius, 0, Math.PI * 2);
            ctx.stroke();

            // Inner glow
            if (progress < 0.5) {
                const glowGradient = ctx.createRadialGradient(screenX, screenY, 0, screenX, screenY, ringRadius);
                glowGradient.addColorStop(0, colors.glow + '60');
                glowGradient.addColorStop(1, 'transparent');
                ctx.fillStyle = glowGradient;
                ctx.beginPath();
                ctx.arc(screenX, screenY, ringRadius, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.restore();
        }

        // Draw particles
        for (const p of effect.particles) {
            if (p.alpha <= 0) continue;

            const px = (p.x - camX) * tileSize + offsetX;
            const py = (p.y - camY) * tileSize;

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.isTrail ? colors.glow : colors.primary;
            ctx.fillRect(px - p.size / 2, py - p.size / 2, p.size, p.size);
            ctx.restore();
        }
    },

    clear() {
        this.activeEffects = [];
    },

    hasActiveEffects() {
        return this.activeEffects.length > 0;
    }
};

// ============================================================================
// MONSTER RANGED EFFECT - Arrow/projectile trail
// ============================================================================

const MonsterRangedEffect = {
    activeEffects: [],

    /**
     * Create a ranged attack effect
     */
    create(originX, originY, targetX, targetY, options = {}) {
        const effect = {
            originX,
            originY,
            targetX,
            targetY,

            // Timing
            currentFrame: 0,
            travelDuration: 10,
            trailDuration: 6,
            isFinished: false,

            // State
            state: 'travel',

            // Visual
            color: options.color || '#AA6633',
            trailColor: options.trailColor || '#DDAA66',
            element: options.element,
            isCrit: options.isCrit || false,

            // Trail particles
            trail: []
        };

        // Override colors if element
        if (options.element) {
            const elementColors = MonsterMagicEffect.elementColors[options.element];
            if (elementColors) {
                effect.color = elementColors.primary;
                effect.trailColor = elementColors.secondary;
            }
        }

        this.activeEffects.push(effect);
        return effect;
    },

    update(dt) {
        for (let i = this.activeEffects.length - 1; i >= 0; i--) {
            const effect = this.activeEffects[i];
            this.updateEffect(effect);

            if (effect.isFinished) {
                this.activeEffects.splice(i, 1);
            }
        }
    },

    updateEffect(effect) {
        effect.currentFrame++;

        switch (effect.state) {
            case 'travel':
                // Add trail point
                const progress = effect.currentFrame / effect.travelDuration;
                effect.trail.push({
                    x: effect.originX + (effect.targetX - effect.originX) * progress,
                    y: effect.originY + (effect.targetY - effect.originY) * progress,
                    alpha: 1.0
                });

                if (effect.currentFrame >= effect.travelDuration) {
                    effect.state = 'fade';
                    effect.currentFrame = 0;
                }
                break;

            case 'fade':
                if (effect.currentFrame >= effect.trailDuration) {
                    effect.isFinished = true;
                }
                break;
        }

        // Fade trail points
        for (let i = effect.trail.length - 1; i >= 0; i--) {
            effect.trail[i].alpha -= 0.1;
            if (effect.trail[i].alpha <= 0) {
                effect.trail.splice(i, 1);
            }
        }
    },

    render(ctx, camX = 0, camY = 0, tileSize = 32, offsetX = 0) {
        for (const effect of this.activeEffects) {
            this.renderEffect(ctx, effect, camX, camY, tileSize, offsetX);
        }
    },

    renderEffect(ctx, effect, camX, camY, tileSize, offsetX) {
        // Draw trail
        if (effect.trail.length > 1) {
            ctx.save();
            ctx.strokeStyle = effect.trailColor;
            ctx.lineWidth = 2;
            ctx.lineCap = 'round';

            for (let i = 1; i < effect.trail.length; i++) {
                const p1 = effect.trail[i - 1];
                const p2 = effect.trail[i];

                ctx.globalAlpha = p2.alpha * 0.6;
                ctx.beginPath();
                ctx.moveTo(
                    (p1.x - camX) * tileSize + offsetX,
                    (p1.y - camY) * tileSize
                );
                ctx.lineTo(
                    (p2.x - camX) * tileSize + offsetX,
                    (p2.y - camY) * tileSize
                );
                ctx.stroke();
            }
            ctx.restore();
        }

        // Draw projectile head (only during travel)
        if (effect.state === 'travel') {
            const progress = effect.currentFrame / effect.travelDuration;
            const cx = effect.originX + (effect.targetX - effect.originX) * progress;
            const cy = effect.originY + (effect.targetY - effect.originY) * progress;

            const screenX = (cx - camX) * tileSize + offsetX;
            const screenY = (cy - camY) * tileSize;

            // Calculate angle for arrow shape
            const angle = Math.atan2(
                effect.targetY - effect.originY,
                effect.targetX - effect.originX
            );

            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(angle);

            // Arrow/projectile shape
            ctx.fillStyle = effect.color;
            ctx.beginPath();
            ctx.moveTo(8, 0);        // Tip
            ctx.lineTo(-4, -4);      // Top back
            ctx.lineTo(-2, 0);       // Center notch
            ctx.lineTo(-4, 4);       // Bottom back
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }

        // Impact spark at end
        if (effect.state === 'fade' && effect.currentFrame < 4) {
            const screenX = (effect.targetX - camX) * tileSize + offsetX;
            const screenY = (effect.targetY - camY) * tileSize;

            ctx.save();
            ctx.globalAlpha = 1 - (effect.currentFrame / 4);
            ctx.fillStyle = effect.color;
            const sparkSize = 6 + (effect.isCrit ? 4 : 0);
            ctx.fillRect(screenX - sparkSize / 2, screenY - sparkSize / 2, sparkSize, sparkSize);
            ctx.restore();
        }
    },

    clear() {
        this.activeEffects = [];
    },

    hasActiveEffects() {
        return this.activeEffects.length > 0;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.MonsterMagicEffect = MonsterMagicEffect;
window.MonsterRangedEffect = MonsterRangedEffect;

console.log('[MonsterAttackEffects] Magic and ranged attack effects loaded');
