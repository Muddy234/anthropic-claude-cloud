// ============================================================================
// PARTICLE SYSTEM - Dedicated canvas layer for all particle effects
// ============================================================================
// Creates a separate canvas overlay for particles (fire, sparks, magic, etc.)
// Renders on top of the game world but below UI elements.
// ============================================================================

// ============================================================================
// PARTICLE CANVAS - Dedicated rendering layer
// ============================================================================

const ParticleCanvas = {
    canvas: null,
    ctx: null,
    initialized: false,

    /**
     * Initialize the particle canvas overlay
     */
    init() {
        if (this.initialized) return;

        // Get the main game canvas for dimensions
        const gameCanvas = document.getElementById('gameCanvas');
        if (!gameCanvas) {
            console.warn('[ParticleCanvas] Game canvas not found, deferring init');
            return;
        }

        // Create particle canvas
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'particleCanvas';
        this.canvas.width = gameCanvas.width;
        this.canvas.height = gameCanvas.height;
        this.canvas.style.position = 'absolute';
        this.canvas.style.left = gameCanvas.offsetLeft + 'px';
        this.canvas.style.top = gameCanvas.offsetTop + 'px';
        this.canvas.style.pointerEvents = 'none'; // Click-through
        this.canvas.style.zIndex = '5'; // Above game canvas, below UI

        // Insert after game canvas
        gameCanvas.parentNode.insertBefore(this.canvas, gameCanvas.nextSibling);

        this.ctx = this.canvas.getContext('2d');
        this.initialized = true;

        console.log('[ParticleCanvas] Initialized');
    },

    /**
     * Resize canvas to match game canvas
     */
    resize() {
        const gameCanvas = document.getElementById('gameCanvas');
        if (!gameCanvas || !this.canvas) return;

        this.canvas.width = gameCanvas.width;
        this.canvas.height = gameCanvas.height;
        this.canvas.style.left = gameCanvas.offsetLeft + 'px';
        this.canvas.style.top = gameCanvas.offsetTop + 'px';
    },

    /**
     * Clear the particle canvas
     */
    clear() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    },

    /**
     * Get the canvas context
     * @returns {CanvasRenderingContext2D|null}
     */
    getContext() {
        return this.ctx;
    }
};

// ============================================================================
// FIRE PARTICLE SYSTEM - Visual layer for fire-based light sources
// ============================================================================

const FireParticleSystem = {
    particles: [],

    // Configuration
    config: {
        maxParticles: 500,
        // Map source types to visual styles
        styles: {
            'torch':    { count: 1, speed: 1.0, life: 0.6, color: [255, 150, 50],  size: 2, spread: 4 },
            'brazier':  { count: 2, speed: 1.2, life: 0.8, color: [255, 100, 20],  size: 3, spread: 6 },
            'campfire': { count: 3, speed: 1.5, life: 1.2, color: [255, 80, 10],   size: 4, spread: 8 },
            'lantern':  { count: 0, speed: 0,   life: 0,   color: [0, 0, 0],       size: 0, spread: 0 },
            'thermal_vent': { count: 4, speed: 2.0, life: 1.5, color: [255, 60, 0], size: 5, spread: 12 }
        }
    },

    init() {
        this.particles = [];
        console.log('[FireParticleSystem] Initialized');
    },

    /**
     * Update particles - spawn new ones and update existing
     * @param {number} dt - Delta time in milliseconds
     */
    update(dt) {
        if (typeof LightSourceSystem === 'undefined') return;

        const tileSize = (typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 16) *
                         (typeof ZOOM_LEVEL !== 'undefined' ? ZOOM_LEVEL : 2);

        // 1. SPAWN NEW PARTICLES from active light sources
        LightSourceSystem.sources.forEach(source => {
            if (!source.active) return;

            // Only spawn if this light type has a particle style
            const style = this.config.styles[source.type];
            if (!style || style.count === 0) return;

            // Get emission position in grid coordinates
            let emitGridX = source.gridX;
            let emitGridY = source.gridY;

            // Handle attached lights (e.g., player holding torch)
            if (source.attachedTo) {
                const entity = source.attachedTo;
                emitGridX = entity.displayX ?? entity.gridX ?? emitGridX;
                emitGridY = entity.displayY ?? entity.gridY ?? emitGridY;
            }

            // Scale emission based on fuel (if applicable)
            let spawnChance = 0.3; // Base chance per frame
            if (source.maxFuel && source.fuel < source.maxFuel * 0.2) {
                spawnChance *= 0.5; // Reduce particles when fuel is low
            }

            // Spawn particles based on style count
            if (Math.random() < spawnChance * style.count) {
                this._spawnParticle(emitGridX, emitGridY, style, tileSize);
            }
        });

        // 2. UPDATE EXISTING PARTICLES
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.update(dt);
            if (!p.alive) {
                this.particles.splice(i, 1);
            }
        }
    },

    /**
     * Spawn a new fire particle
     * @param {number} gridX - Grid X position
     * @param {number} gridY - Grid Y position
     * @param {Object} style - Particle style configuration
     * @param {number} tileSize - Effective tile size in pixels
     */
    _spawnParticle(gridX, gridY, style, tileSize) {
        if (this.particles.length >= this.config.maxParticles) return;

        // Store grid position - will convert to screen coords during draw
        const spreadGrid = style.spread / tileSize;
        const px = gridX + (Math.random() - 0.5) * spreadGrid;
        const py = gridY + (Math.random() - 0.5) * spreadGrid;

        // Velocity in grid units per second
        const vx = (Math.random() - 0.5) * 0.5; // Slight side drift
        const vy = -(1.5 + Math.random() * 2) * style.speed; // Upward speed

        this.particles.push(new FireSpark(px, py, vx, vy, style.life, style.color, style.size));
    },

    /**
     * Draw all particles to the particle canvas
     * @param {number} camX - Camera X offset in grid units
     * @param {number} camY - Camera Y offset in grid units
     * @param {number} tileSize - Effective tile size in pixels
     * @param {number} offsetX - Left panel offset (TRACKER_WIDTH)
     */
    draw(camX, camY, tileSize, offsetX) {
        const ctx = ParticleCanvas.getContext();
        if (!ctx) return;

        // Set additive blending for glowing fire effect
        const prevComposite = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'lighter';

        for (const p of this.particles) {
            p.draw(ctx, camX, camY, tileSize, offsetX);
        }

        ctx.globalCompositeOperation = prevComposite;
    },

    /**
     * Clear all particles
     */
    clear() {
        this.particles = [];
    }
};

// ============================================================================
// FIRE SPARK PARTICLE CLASS
// ============================================================================

class FireSpark {
    constructor(gridX, gridY, vx, vy, life, colorRgb, baseSize) {
        // Position in grid coordinates
        this.gridX = gridX;
        this.gridY = gridY;

        // Velocity in grid units per second
        this.vx = vx;
        this.vy = vy;

        this.life = life;       // Total lifetime in seconds
        this.age = 0;           // Current age
        this.alive = true;

        this.color = colorRgb;  // [255, 100, 50]
        this.baseSize = baseSize;

        // Random turbulence offset for unique wiggle
        this.turbulence = Math.random() * 100;
    }

    /**
     * Update particle physics
     * @param {number} dt - Delta time in milliseconds
     */
    update(dt) {
        const dtSec = dt / 1000;
        this.age += dtSec;

        if (this.age >= this.life) {
            this.alive = false;
            return;
        }

        // Apply physics (in grid units)
        this.gridX += this.vx * dtSec;
        this.gridY += this.vy * dtSec;

        // "Wiggle" effect - simulates heat turbulence
        this.gridX += Math.sin(this.age * 10 + this.turbulence) * 0.02;

        // Slow down upward velocity (air resistance)
        this.vy += 0.5 * dtSec;
    }

    /**
     * Draw the particle
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} camX - Camera X in grid units
     * @param {number} camY - Camera Y in grid units
     * @param {number} tileSize - Pixels per tile
     * @param {number} offsetX - Left panel offset
     */
    draw(ctx, camX, camY, tileSize, offsetX) {
        // Convert grid position to screen position
        const screenX = (this.gridX - camX) * tileSize + offsetX + tileSize / 2;
        const screenY = (this.gridY - camY) * tileSize + tileSize / 2;

        // Skip if off-screen
        if (screenX < offsetX - 20 || screenX > ctx.canvas.width + 20 ||
            screenY < -20 || screenY > ctx.canvas.height + 20) {
            return;
        }

        const progress = this.age / this.life;
        const alpha = 1 - progress; // Fade out

        // Particles shrink as they die
        const size = this.baseSize * (1 - (progress * 0.5));

        // Color shift: Yellow/Orange -> Red as it dies
        const r = this.color[0];
        const g = Math.floor(this.color[1] * (1 - progress)); // Green fades (turns red)
        const b = this.color[2];

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(Math.floor(screenX - size / 2), Math.floor(screenY - size / 2), size, size);
    }
}

// ============================================================================
// PARTICLE SYSTEM MANAGER - Coordinates all particle subsystems
// ============================================================================

const ParticleSystemManager = {
    systems: [],

    init() {
        ParticleCanvas.init();
        FireParticleSystem.init();

        // Register subsystems
        this.systems = [FireParticleSystem];

        console.log('[ParticleSystemManager] Initialized');
    },

    update(dt) {
        for (const system of this.systems) {
            if (system.update) system.update(dt);
        }
    },

    /**
     * Render all particle systems
     * @param {number} camX - Camera X in grid units
     * @param {number} camY - Camera Y in grid units
     * @param {number} tileSize - Effective tile size
     * @param {number} offsetX - Left panel offset
     */
    render(camX, camY, tileSize, offsetX) {
        // Clear the particle canvas
        ParticleCanvas.clear();

        // Draw each subsystem
        for (const system of this.systems) {
            if (system.draw) system.draw(camX, camY, tileSize, offsetX);
        }
    },

    cleanup() {
        for (const system of this.systems) {
            if (system.clear) system.clear();
        }
        ParticleCanvas.clear();
    },

    /**
     * Register a new particle subsystem
     * @param {Object} system - System with init(), update(dt), draw(), clear()
     */
    registerSystem(system) {
        if (!this.systems.includes(system)) {
            this.systems.push(system);
            if (system.init) system.init();
        }
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const ParticleSystemDef = {
    name: 'particle-system',

    init(gameRef) {
        ParticleSystemManager.init();
    },

    update(dt) {
        ParticleSystemManager.update(dt);
    },

    cleanup() {
        ParticleSystemManager.cleanup();
    }
};

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('particle-system', ParticleSystemDef, 90); // After most systems
}

// ============================================================================
// EXPORTS
// ============================================================================

window.ParticleCanvas = ParticleCanvas;
window.FireParticleSystem = FireParticleSystem;
window.FireSpark = FireSpark;
window.ParticleSystemManager = ParticleSystemManager;

console.log('[ParticleSystem] Particle system loaded');
