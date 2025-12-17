// === js/effects/village-atmosphere.js ===
// THE BLEEDING EARTH: Village atmosphere and particle effects

// ============================================================================
// PARTICLE SYSTEMS
// ============================================================================

/**
 * Ashfall particle system for World State 2 (ASH)
 */
const AshfallEffect = {
    particles: [],
    maxParticles: 100,
    active: false,

    init() {
        this.particles = [];
        this.active = false;
    },

    start(density = 0.3) {
        this.active = true;
        this.targetCount = Math.floor(this.maxParticles * density);

        // Spawn initial particles
        for (let i = 0; i < this.targetCount / 2; i++) {
            this._spawnParticle();
        }
    },

    stop() {
        this.active = false;
        this.particles = [];
    },

    _spawnParticle() {
        if (!this.active || this.particles.length >= this.targetCount) return;

        this.particles.push({
            x: Math.random() * (canvas?.width || 800),
            y: -10 - Math.random() * 50,
            size: 1 + Math.random() * 2,
            speedY: 15 + Math.random() * 25,     // Falling speed
            speedX: -10 + Math.random() * 20,    // Drift
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 2,
            opacity: 0.3 + Math.random() * 0.4,
            color: Math.random() > 0.5 ? '#9B9B9B' : '#8B8B8B'
        });
    },

    update(deltaTime) {
        if (!this.active) return;

        const dt = deltaTime / 1000;  // Convert to seconds
        const canvasHeight = canvas?.height || 600;
        const canvasWidth = canvas?.width || 800;

        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.y += p.speedY * dt;
            p.x += p.speedX * dt;
            p.rotation += p.rotationSpeed * dt;

            // Gentle swaying
            p.x += Math.sin(Date.now() / 1000 + p.y / 50) * 0.5;

            // Remove if off screen
            if (p.y > canvasHeight + 20 || p.x < -20 || p.x > canvasWidth + 20) {
                this.particles.splice(i, 1);
            }
        }

        // Spawn new particles
        if (this.particles.length < this.targetCount && Math.random() < 0.3) {
            this._spawnParticle();
        }
    },

    render(ctx) {
        if (!this.active || !ctx) return;

        ctx.save();

        this.particles.forEach(p => {
            ctx.globalAlpha = p.opacity;
            ctx.fillStyle = p.color;

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.rotation);

            // Draw ash flake (small irregular shape)
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        });

        ctx.restore();
    }
};

/**
 * Ember rain particle system for World State 3+ (BURNING)
 */
const EmberRainEffect = {
    particles: [],
    maxParticles: 150,
    active: false,

    init() {
        this.particles = [];
        this.active = false;
    },

    start(density = 0.6) {
        this.active = true;
        this.targetCount = Math.floor(this.maxParticles * density);

        // Spawn initial particles
        for (let i = 0; i < this.targetCount / 2; i++) {
            this._spawnParticle();
        }
    },

    stop() {
        this.active = false;
        this.particles = [];
    },

    _spawnParticle() {
        if (!this.active || this.particles.length >= this.targetCount) return;

        const canvasHeight = canvas?.height || 600;

        this.particles.push({
            x: Math.random() * (canvas?.width || 800),
            y: canvasHeight + 10 + Math.random() * 50,  // Start from bottom
            size: 1 + Math.random() * 3,
            speedY: -(20 + Math.random() * 40),  // Rising speed (negative = up)
            speedX: -15 + Math.random() * 30,    // Drift
            life: 1.0,
            decay: 0.2 + Math.random() * 0.3,    // How fast it fades
            glow: 0.5 + Math.random() * 0.5,
            color: this._getEmberColor()
        });
    },

    _getEmberColor() {
        const colors = [
            '#FF4500',  // Orange red
            '#FF6347',  // Tomato
            '#FF8C00',  // Dark orange
            '#FFA500',  // Orange
            '#FFD700'   // Gold (bright ember)
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    update(deltaTime) {
        if (!this.active) return;

        const dt = deltaTime / 1000;

        // Update existing particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            p.y += p.speedY * dt;
            p.x += p.speedX * dt;
            p.life -= p.decay * dt;

            // Gentle flickering
            p.glow = 0.5 + Math.sin(Date.now() / 100 + i) * 0.3;

            // Slow down as they rise
            p.speedY *= 0.99;

            // Remove if dead or off screen
            if (p.life <= 0 || p.y < -30) {
                this.particles.splice(i, 1);
            }
        }

        // Spawn new particles
        if (this.particles.length < this.targetCount && Math.random() < 0.4) {
            this._spawnParticle();
        }
    },

    render(ctx) {
        if (!this.active || !ctx) return;

        ctx.save();

        this.particles.forEach(p => {
            const alpha = p.life * p.glow;
            ctx.globalAlpha = alpha;

            // Draw glow
            const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
            gradient.addColorStop(0, p.color);
            gradient.addColorStop(0.5, p.color + '80');
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
            ctx.fill();

            // Draw core
            ctx.fillStyle = '#FFFFFF';
            ctx.globalAlpha = alpha * 0.8;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore();
    }
};

// ============================================================================
// SCREEN OVERLAYS
// ============================================================================

/**
 * Smoke overlay effect for BURNING state
 */
const SmokeOverlay = {
    active: false,
    opacity: 0.15,
    scrollOffset: 0,

    start(opacity = 0.15) {
        this.active = true;
        this.opacity = opacity;
    },

    stop() {
        this.active = false;
    },

    update(deltaTime) {
        if (!this.active) return;

        // Slow scroll for smoke movement
        this.scrollOffset += deltaTime * 0.01;
        if (this.scrollOffset > 1000) this.scrollOffset = 0;
    },

    render(ctx) {
        if (!this.active || !ctx) return;

        const width = canvas?.width || 800;
        const height = canvas?.height || 600;

        ctx.save();

        // Dark smoke gradient from edges
        const gradient = ctx.createRadialGradient(
            width / 2, height / 2, 0,
            width / 2, height / 2, Math.max(width, height) * 0.7
        );
        gradient.addColorStop(0, 'transparent');
        gradient.addColorStop(0.6, `rgba(40, 30, 20, ${this.opacity * 0.3})`);
        gradient.addColorStop(1, `rgba(30, 20, 10, ${this.opacity})`);

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);

        ctx.restore();
    }
};

/**
 * Screen tint overlay
 */
const ScreenTint = {
    active: false,
    color: { r: 255, g: 100, b: 50, a: 0.2 },

    start(color) {
        this.active = true;
        if (color) {
            this.color = color;
        }
    },

    stop() {
        this.active = false;
    },

    render(ctx) {
        if (!this.active || !ctx) return;

        const width = canvas?.width || 800;
        const height = canvas?.height || 600;

        ctx.save();
        ctx.globalAlpha = this.color.a;
        ctx.fillStyle = `rgb(${this.color.r}, ${this.color.g}, ${this.color.b})`;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
    }
};

/**
 * Ground shake effect
 */
const GroundShake = {
    active: false,
    intensity: 0.3,
    offset: { x: 0, y: 0 },
    timer: 0,
    interval: 2000,  // ms between shakes

    start(intensity = 0.3) {
        this.active = true;
        this.intensity = intensity;
    },

    stop() {
        this.active = false;
        this.offset = { x: 0, y: 0 };
    },

    update(deltaTime) {
        if (!this.active) return;

        this.timer += deltaTime;

        // Periodic rumbles
        if (this.timer > this.interval) {
            this.timer = 0;
            this._triggerShake();
        }

        // Decay shake offset
        this.offset.x *= 0.9;
        this.offset.y *= 0.9;
    },

    _triggerShake() {
        const strength = this.intensity * 5;
        this.offset.x = (Math.random() - 0.5) * strength;
        this.offset.y = (Math.random() - 0.5) * strength;
    },

    getOffset() {
        return this.offset;
    }
};

// ============================================================================
// ATMOSPHERE MANAGER
// ============================================================================

const VillageAtmosphere = {

    currentState: 1,
    initialized: false,

    init() {
        AshfallEffect.init();
        EmberRainEffect.init();
        this.initialized = true;
        console.log('[VillageAtmosphere] Atmosphere effects initialized');
    },

    /**
     * Set atmosphere based on world state
     * @param {number} worldState - 1=NORMAL, 2=ASH, 3=BURNING, 4=ENDGAME
     */
    setWorldState(worldState) {
        if (!this.initialized) this.init();

        this.currentState = worldState;

        // Stop all effects first
        AshfallEffect.stop();
        EmberRainEffect.stop();
        SmokeOverlay.stop();
        ScreenTint.stop();
        GroundShake.stop();

        // Get atmosphere settings
        const settings = typeof getAtmosphereSettings === 'function' ?
            getAtmosphereSettings(worldState) :
            VILLAGE_ATMOSPHERE?.[worldState];

        if (!settings) return;

        // Apply particle effects
        if (settings.particles === 'ashfall') {
            AshfallEffect.start(settings.particleDensity || 0.3);
        } else if (settings.particles === 'ember_rain') {
            EmberRainEffect.start(settings.particleDensity || 0.6);
        }

        // Apply overlays
        if (settings.smokeOverlay) {
            SmokeOverlay.start(settings.smokeOpacity || 0.15);
        }

        if (settings.screenTint) {
            ScreenTint.start(settings.screenTint);
        }

        if (settings.groundShake) {
            GroundShake.start(settings.shakeIntensity || 0.3);
        }

        console.log(`[VillageAtmosphere] Set to world state ${worldState}`);
    },

    update(deltaTime) {
        AshfallEffect.update(deltaTime);
        EmberRainEffect.update(deltaTime);
        SmokeOverlay.update(deltaTime);
        GroundShake.update(deltaTime);
    },

    /**
     * Render all atmosphere effects (call after village render)
     */
    render(ctx) {
        AshfallEffect.render(ctx);
        EmberRainEffect.render(ctx);
        SmokeOverlay.render(ctx);
        ScreenTint.render(ctx);
    },

    /**
     * Get current shake offset for camera
     */
    getShakeOffset() {
        return GroundShake.getOffset();
    },

    /**
     * Get current ambient light multiplier
     */
    getAmbientLight() {
        const settings = typeof getAtmosphereSettings === 'function' ?
            getAtmosphereSettings(this.currentState) : null;
        return settings?.ambientLight || 1.0;
    }
};

// ============================================================================
// WORLD STATE CHANGE LISTENER
// ============================================================================

// Listen for world state changes and update atmosphere
window.addEventListener('worldStateChange', (event) => {
    const { newState } = event.detail;
    VillageAtmosphere.setWorldState(newState);
});

// ============================================================================
// EXPORTS
// ============================================================================

window.AshfallEffect = AshfallEffect;
window.EmberRainEffect = EmberRainEffect;
window.SmokeOverlay = SmokeOverlay;
window.ScreenTint = ScreenTint;
window.GroundShake = GroundShake;
window.VillageAtmosphere = VillageAtmosphere;

console.log('[VillageAtmosphere] Atmosphere effects loaded');
