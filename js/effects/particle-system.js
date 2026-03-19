// ============================================================================
// PARTICLE SYSTEM - Dedicated canvas layer for all particle effects
// ============================================================================
// Creates a separate canvas overlay for particles (fire, sparks, magic, etc.)
// Renders on top of the game world but below UI elements.
// ============================================================================

// Global particle budget cap - enforced via FIFO eviction
const MAX_PARTICLES = 250;

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
// PARTICLE POOL - Object pooling to avoid GC pressure
// ============================================================================
// Pre-allocates particle objects and reuses them instead of new/delete
// ============================================================================

class ParticlePool {
    /**
     * Create a particle pool
     * @param {Function} ParticleClass - Constructor function for particles
     * @param {number} initialSize - Number of particles to pre-allocate
     */
    constructor(ParticleClass, initialSize = 500) {
        this.ParticleClass = ParticleClass;
        this.pool = [];
        this.active = [];
        this.initialSize = initialSize;

        // Pre-allocate particles
        this._preallocate(initialSize);
    }

    /**
     * Pre-allocate particle objects
     * @param {number} count - Number to pre-allocate
     */
    _preallocate(count) {
        for (let i = 0; i < count; i++) {
            // Create particle with dummy values - will be reset on acquire
            const particle = new this.ParticleClass(0, 0, 0, 0, 1, [255, 255, 255], 1);
            particle.alive = false;
            this.pool.push(particle);
        }
    }

    /**
     * Acquire a particle from the pool
     * @returns {Object|null} - Particle object or null if pool exhausted
     */
    acquire() {
        // Enforce particle budget cap with FIFO eviction
        if (this.active.length >= MAX_PARTICLES) {
            // Remove oldest particles (FIFO) to make room
            const toRemove = this.active.length - MAX_PARTICLES + 1;
            for (let i = 0; i < toRemove; i++) {
                const oldest = this.active[i];
                oldest.alive = false;
                this.pool.push(oldest);
            }
            this.active.splice(0, toRemove);
        }

        let particle;

        if (this.pool.length > 0) {
            particle = this.pool.pop();
        } else {
            // Pool exhausted - create new particle (will be reused later)
            particle = new this.ParticleClass(0, 0, 0, 0, 1, [255, 255, 255], 1);
        }

        particle.alive = true;
        this.active.push(particle);
        return particle;
    }

    /**
     * Release all dead particles back to pool
     * More efficient than individual release - single array pass
     */
    releaseInactive() {
        // Partition active array: alive particles stay, dead go to pool
        let writeIndex = 0;

        for (let i = 0; i < this.active.length; i++) {
            const particle = this.active[i];
            if (particle.alive) {
                // Keep in active array
                this.active[writeIndex] = particle;
                writeIndex++;
            } else {
                // Return to pool
                this.pool.push(particle);
            }
        }

        // Truncate active array to only live particles
        this.active.length = writeIndex;
    }

    /**
     * Get all active particles for iteration
     * @returns {Array} - Active particles array
     */
    getActive() {
        return this.active;
    }

    /**
     * Get count of active particles
     * @returns {number}
     */
    getActiveCount() {
        return this.active.length;
    }

    /**
     * Get count of pooled (inactive) particles
     * @returns {number}
     */
    getPooledCount() {
        return this.pool.length;
    }

    /**
     * Clear all particles - return active to pool
     */
    clear() {
        for (let i = 0; i < this.active.length; i++) {
            this.active[i].alive = false;
            this.pool.push(this.active[i]);
        }
        this.active.length = 0;
    }

    /**
     * Get pool statistics
     * @returns {Object} - {active, pooled, total}
     */
    getStats() {
        return {
            active: this.active.length,
            pooled: this.pool.length,
            total: this.active.length + this.pool.length
        };
    }
}

// ============================================================================
// FIRE SPARK PARTICLE CLASS
// ============================================================================
// Now supports reset() for object pooling reuse
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
     * Reset particle for reuse from pool
     * @param {number} gridX - Grid X position
     * @param {number} gridY - Grid Y position
     * @param {number} vx - X velocity in grid units/sec
     * @param {number} vy - Y velocity in grid units/sec
     * @param {number} life - Lifetime in seconds
     * @param {Array} colorRgb - [r, g, b] color array
     * @param {number} baseSize - Base size in pixels
     */
    reset(gridX, gridY, vx, vy, life, colorRgb, baseSize) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.age = 0;
        this.alive = true;
        this.color = colorRgb;
        this.baseSize = baseSize;
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
// FIRE PARTICLE SYSTEM - Visual layer for fire-based light sources
// ============================================================================
// Now uses ParticlePool for efficient object reuse
// ============================================================================

const FireParticleSystem = {
    particlePool: null,

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
        // Create particle pool with pre-allocated particles
        this.particlePool = new ParticlePool(FireSpark, this.config.maxParticles);
        console.log('[FireParticleSystem] Initialized with object pooling');
    },

    /**
     * Update particles - spawn new ones and update existing
     * @param {number} dt - Delta time in milliseconds
     */
    update(dt) {
        if (typeof LightSourceSystem === 'undefined') return;
        if (!this.particlePool) return;

        const tileSize = (typeof TILE_SIZE !== 'undefined' ? TILE_SIZE : 16) *
                         (window.currentZoom || ZOOM_LEVEL || 2);

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
        const activeParticles = this.particlePool.getActive();
        for (let i = 0; i < activeParticles.length; i++) {
            activeParticles[i].update(dt);
        }

        // 3. RELEASE DEAD PARTICLES back to pool (efficient single pass)
        this.particlePool.releaseInactive();
    },

    /**
     * Spawn a new fire particle using object pool
     * @param {number} gridX - Grid X position
     * @param {number} gridY - Grid Y position
     * @param {Object} style - Particle style configuration
     * @param {number} tileSize - Effective tile size in pixels
     */
    _spawnParticle(gridX, gridY, style, tileSize) {
        // Check if we're at capacity
        if (this.particlePool.getActiveCount() >= this.config.maxParticles) return;

        // Acquire particle from pool
        const particle = this.particlePool.acquire();
        if (!particle) return;

        // Calculate spawn parameters
        const spreadGrid = style.spread / tileSize;
        const px = gridX + (Math.random() - 0.5) * spreadGrid;
        const py = gridY + (Math.random() - 0.5) * spreadGrid;

        // Velocity in grid units per second
        const vx = (Math.random() - 0.5) * 0.5; // Slight side drift
        const vy = -(1.5 + Math.random() * 2) * style.speed; // Upward speed

        // Reset the particle with new values
        particle.reset(px, py, vx, vy, style.life, style.color, style.size);
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
        if (!ctx || !this.particlePool) return;

        // Set additive blending for glowing fire effect
        const prevComposite = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'lighter';

        const activeParticles = this.particlePool.getActive();
        for (let i = 0; i < activeParticles.length; i++) {
            activeParticles[i].draw(ctx, camX, camY, tileSize, offsetX);
        }

        ctx.globalCompositeOperation = prevComposite;
    },

    /**
     * Clear all particles
     */
    clear() {
        if (this.particlePool) {
            this.particlePool.clear();
        }
    },

    /**
     * Get pool statistics for debugging
     * @returns {Object} - Pool stats
     */
    getStats() {
        if (!this.particlePool) return { active: 0, pooled: 0, total: 0 };
        return this.particlePool.getStats();
    }
};

// ============================================================================
// CONE PARTICLE CLASS - For breath/cone attack streaming effects
// ============================================================================

class ConeParticle {
    constructor(gridX, gridY, vx, vy, life, colorRgb, baseSize) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.age = 0;
        this.alive = true;
        this.color = colorRgb;
        this.baseSize = baseSize;
        this.type = 'flame';  // Can be 'flame', 'ice', 'poison'
        this.turbulence = Math.random() * 100;
    }

    reset(gridX, gridY, vx, vy, life, colorRgb, baseSize, type) {
        this.gridX = gridX;
        this.gridY = gridY;
        this.vx = vx;
        this.vy = vy;
        this.life = life;
        this.age = 0;
        this.alive = true;
        this.color = colorRgb;
        this.baseSize = baseSize;
        this.type = type || 'flame';
        this.turbulence = Math.random() * 100;
    }

    update(dt) {
        const dtSec = dt / 1000;
        this.age += dtSec;

        if (this.age >= this.life) {
            this.alive = false;
            return;
        }

        // Apply velocity
        this.gridX += this.vx * dtSec;
        this.gridY += this.vy * dtSec;

        // Type-specific behavior
        switch (this.type) {
            case 'flame':
                // Fire rises and flickers
                this.vy -= 0.3 * dtSec;  // Slight upward drift
                this.gridX += Math.sin(this.age * 12 + this.turbulence) * 0.03;
                break;
            case 'ice':
                // Ice drifts down slightly and sparkles
                this.vy += 0.2 * dtSec;  // Slight downward drift
                this.gridX += Math.sin(this.age * 8 + this.turbulence) * 0.02;
                break;
            case 'poison':
                // Poison swirls
                this.gridX += Math.sin(this.age * 6 + this.turbulence) * 0.04;
                this.gridY += Math.cos(this.age * 6 + this.turbulence) * 0.04;
                break;
        }
    }

    draw(ctx, camX, camY, tileSize, offsetX) {
        const screenX = (this.gridX - camX) * tileSize + offsetX + tileSize / 2;
        const screenY = (this.gridY - camY) * tileSize + tileSize / 2;

        // Skip if off-screen
        if (screenX < offsetX - 20 || screenX > ctx.canvas.width + 20 ||
            screenY < -20 || screenY > ctx.canvas.height + 20) {
            return;
        }

        const progress = this.age / this.life;
        const alpha = 1 - progress;
        const size = this.baseSize * (1 - (progress * 0.4));

        const r = this.color[0];
        let g = this.color[1];
        let b = this.color[2];

        // Type-specific color shifts
        switch (this.type) {
            case 'flame':
                g = Math.floor(g * (1 - progress * 0.7));  // Yellow -> Red
                break;
            case 'ice':
                // Stays blue-white
                break;
            case 'poison':
                g = Math.floor(g * (0.8 + progress * 0.2));  // Gets slightly brighter
                break;
        }

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.fillRect(Math.floor(screenX - size / 2), Math.floor(screenY - size / 2), size, size);
    }
}

// ============================================================================
// CONE PARTICLE SYSTEM - For breath/cone attack streaming
// ============================================================================

const ConeParticleSystem = {
    particlePool: null,
    config: {
        maxParticles: 300
    },

    // Particle type configurations
    typeConfigs: {
        'flame': { color: [255, 150, 50], life: 0.5, size: 4, speed: 80 },
        'ice': { color: [170, 221, 255], life: 0.6, size: 3, speed: 70 },
        'poison': { color: [102, 204, 102], life: 0.8, size: 4, speed: 50 }
    },

    init() {
        this.particlePool = new ParticlePool(ConeParticle, this.config.maxParticles);
        console.log('[ConeParticleSystem] Initialized');
    },

    /**
     * Spawn streaming particles in a cone shape
     * Used for breath attacks during channel phase
     * @param {number} originX - Cone origin X (tiles)
     * @param {number} originY - Cone origin Y (tiles)
     * @param {number} direction - Direction cone faces (radians)
     * @param {number} coneAngle - Total cone angle (radians)
     * @param {number} radius - Cone radius (tiles)
     * @param {object} config - Particle config { type, color, count }
     */
    spawnConeParticles(originX, originY, direction, coneAngle, radius, config) {
        if (!this.particlePool) return;

        const count = config.count || 3;
        const type = config.type || 'flame';
        const typeConfig = this.typeConfigs[type] || this.typeConfigs['flame'];

        // Parse color if provided as hex string
        let color = typeConfig.color;
        if (config.color && typeof config.color === 'string') {
            color = this._hexToRgb(config.color) || typeConfig.color;
        } else if (config.color && Array.isArray(config.color)) {
            color = config.color;
        }

        for (let i = 0; i < count; i++) {
            // Check capacity
            if (this.particlePool.getActiveCount() >= this.config.maxParticles) break;

            // Random angle within cone
            const angle = direction + (Math.random() - 0.5) * coneAngle;
            // Random distance along cone (bias toward middle/outer)
            const dist = Math.random() * Math.random() * radius * 0.3;  // Start near origin

            const particleX = originX + Math.cos(angle) * dist;
            const particleY = originY + Math.sin(angle) * dist;

            // Velocity outward from origin
            const speed = typeConfig.speed + Math.random() * 30;  // pixels/sec in grid units
            const vx = Math.cos(angle) * speed / 32;  // Convert to grid units/sec (assuming 32px tiles)
            const vy = Math.sin(angle) * speed / 32;

            // Acquire particle from pool
            const particle = this.particlePool.acquire();
            if (!particle) continue;

            // Random life within range
            const life = typeConfig.life * (0.8 + Math.random() * 0.4);
            // Random size within range
            const size = typeConfig.size + Math.random() * 2;

            particle.reset(particleX, particleY, vx, vy, life, color, size, type);
        }
    },

    /**
     * Convert hex color to RGB array
     */
    _hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16)
        ] : null;
    },

    update(dt) {
        if (!this.particlePool) return;

        // Update existing particles
        const activeParticles = this.particlePool.getActive();
        for (let i = 0; i < activeParticles.length; i++) {
            activeParticles[i].update(dt);
        }

        // Release dead particles back to pool
        this.particlePool.releaseInactive();
    },

    draw(camX, camY, tileSize, offsetX) {
        const ctx = ParticleCanvas.getContext();
        if (!ctx || !this.particlePool) return;

        // Set additive blending for glowing effect
        const prevComposite = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'lighter';

        const activeParticles = this.particlePool.getActive();
        for (let i = 0; i < activeParticles.length; i++) {
            activeParticles[i].draw(ctx, camX, camY, tileSize, offsetX);
        }

        ctx.globalCompositeOperation = prevComposite;
    },

    clear() {
        if (this.particlePool) {
            this.particlePool.clear();
        }
    },

    getStats() {
        if (!this.particlePool) return { active: 0, pooled: 0, total: 0 };
        return this.particlePool.getStats();
    }
};

// ============================================================================
// GLOBAL CONE PARTICLE SPAWNER FUNCTION
// ============================================================================
// Convenience function for external callers (e.g., EffectAnimator)
// ============================================================================

/**
 * Spawn streaming particles in a cone shape
 * Used for breath attacks during channel phase
 * @param {number} originX - Cone origin X (tiles)
 * @param {number} originY - Cone origin Y (tiles)
 * @param {number} direction - Direction cone faces (radians)
 * @param {number} coneAngle - Total cone angle (radians)
 * @param {number} radius - Cone radius (tiles)
 * @param {object} config - Particle config { type, color, count }
 */
function spawnConeParticles(originX, originY, direction, coneAngle, radius, config) {
    if (typeof ConeParticleSystem !== 'undefined' && ConeParticleSystem.particlePool) {
        ConeParticleSystem.spawnConeParticles(originX, originY, direction, coneAngle, radius, config);
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
        ConeParticleSystem.init();

        // Register subsystems
        this.systems = [FireParticleSystem, ConeParticleSystem];

        console.log('[ParticleSystemManager] Initialized');
    },

    update(dt) {
        for (const system of this.systems) {
            if (system.update) system.update(dt);
        }

        // Update status effect visual system animation time
        if (typeof StatusEffectVisualSystem !== 'undefined') {
            StatusEffectVisualSystem.update(dt);
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
    },

    /**
     * Spawn a burst of particles at a location
     * @param {Object} config - Burst configuration
     * @param {number} config.x - X position in grid units
     * @param {number} config.y - Y position in grid units
     * @param {number} config.count - Number of particles
     * @param {string} config.color - Particle color (hex)
     * @param {number} config.speed - Particle speed
     * @param {number} config.lifetime - Particle lifetime in seconds
     * @param {number} config.size - Particle size in pixels
     */
    burst(config) {
        const { x, y, count = 10, color = '#FFAA00', speed = 3, lifetime = 0.5, size = 4 } = config;

        // Use FireParticleSystem to spawn burst particles
        if (FireParticleSystem && FireParticleSystem.particles) {
            for (let i = 0; i < count; i++) {
                const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
                const spd = speed * (0.5 + Math.random() * 0.5);

                FireParticleSystem.particles.push({
                    x: x,
                    y: y,
                    vx: Math.cos(angle) * spd,
                    vy: Math.sin(angle) * spd - 1, // Slight upward bias
                    life: lifetime,
                    maxLife: lifetime,
                    size: size * (0.5 + Math.random() * 0.5),
                    color: color,
                    alpha: 1
                });
            }
        }
    },

    /**
     * Get combined stats from all particle systems
     * @returns {Object} - Combined statistics
     */
    getStats() {
        let totalActive = 0;
        let totalPooled = 0;

        for (const system of this.systems) {
            if (system.getStats) {
                const stats = system.getStats();
                totalActive += stats.active || 0;
                totalPooled += stats.pooled || 0;
            }
        }

        return {
            active: totalActive,
            pooled: totalPooled,
            total: totalActive + totalPooled
        };
    }
};

// ============================================================================
// STATUS EFFECT VISUAL SYSTEM - Visual indicators for active status effects
// ============================================================================
// Renders particle/visual effects on entities when they have active status effects
// Each effect type has a distinct visual style for clear player feedback
// ============================================================================

const StatusEffectVisualSystem = {
    // Animation time tracking
    _time: 0,

    /**
     * Update animation time
     * @param {number} dt - Delta time in milliseconds
     */
    update(dt) {
        this._time += dt / 1000; // Convert to seconds
    },

    /**
     * Render all status effect visuals for an entity
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {Object} entity - Entity to render effects for
     * @param {number} screenX - Screen X position (top-left of entity)
     * @param {number} screenY - Screen Y position (top-left of entity)
     * @param {number} tileSize - Size of tile in pixels
     */
    renderForEntity(ctx, entity, screenX, screenY, tileSize) {
        if (!entity) return;

        // Get active effects from StatusEffectSystem
        let effects = [];
        if (typeof StatusEffectSystem !== 'undefined' && StatusEffectSystem.getEffects) {
            effects = StatusEffectSystem.getEffects(entity);
        } else if (typeof getStatusEffects === 'function') {
            effects = getStatusEffects(entity);
        }

        if (!effects || effects.length === 0) return;

        const cx = screenX + tileSize / 2;
        const cy = screenY + tileSize / 2;
        const time = this._time;

        ctx.save();

        for (const effect of effects) {
            const effectId = effect.id || effect.type;
            const remainingRatio = effect.remainingDuration / (effect.definition?.duration || 1);

            // Fade out when effect is about to expire (last 20%)
            const fadeAlpha = remainingRatio < 0.2 ? remainingRatio / 0.2 : 1.0;

            switch (effectId) {
                case 'burning':
                case 'ignite':
                    this._drawBurningEffect(ctx, cx, cy, tileSize, time, fadeAlpha, effect.stacks || 1);
                    break;
                case 'poisoned':
                case 'rot':
                    this._drawPoisonEffect(ctx, cx, cy, tileSize, time, fadeAlpha, effect.stacks || 1);
                    break;
                case 'bleeding':
                    this._drawBleedingEffect(ctx, cx, cy, tileSize, time, fadeAlpha, effect.stacks || 1);
                    break;
                case 'chilled':
                case 'slow':
                    this._drawChilledEffect(ctx, cx, cy, tileSize, time, fadeAlpha, effect.stacks || 1);
                    break;
                case 'frozen':
                    this._drawFrozenEffect(ctx, cx, cy, tileSize, time, fadeAlpha);
                    break;
                case 'stunned':
                    this._drawStunnedEffect(ctx, cx, cy, tileSize, time, fadeAlpha);
                    break;
                case 'rooted':
                    this._drawRootedEffect(ctx, screenX, screenY, tileSize, time, fadeAlpha);
                    break;
                case 'fear':
                    this._drawFearEffect(ctx, cx, cy, tileSize, time, fadeAlpha);
                    break;
                case 'silenced':
                    this._drawSilencedEffect(ctx, cx, cy, tileSize, time, fadeAlpha);
                    break;
                case 'weakened':
                    this._drawWeakenedEffect(ctx, cx, cy, tileSize, time, fadeAlpha);
                    break;
                case 'vulnerable':
                    this._drawVulnerableEffect(ctx, cx, cy, tileSize, time, fadeAlpha);
                    break;
                case 'blinded':
                    this._drawBlindedEffect(ctx, cx, cy, tileSize, time, fadeAlpha);
                    break;
                // Buffs
                case 'regenerating':
                    this._drawRegeneratingEffect(ctx, cx, cy, tileSize, time, fadeAlpha);
                    break;
                case 'strengthened':
                    this._drawStrengthenedEffect(ctx, cx, cy, tileSize, time, fadeAlpha);
                    break;
                case 'hastened':
                    this._drawHastenedEffect(ctx, cx, cy, tileSize, time, fadeAlpha);
                    break;
                case 'shielded':
                    this._drawShieldedEffect(ctx, cx, cy, tileSize, time, fadeAlpha);
                    break;
                case 'invisible':
                    this._drawInvisibleEffect(ctx, cx, cy, tileSize, time, fadeAlpha);
                    break;
                case 'sanctified':
                    this._drawSanctifiedEffect(ctx, cx, cy, tileSize, time, fadeAlpha);
                    break;
            }
        }

        ctx.restore();
    },

    // ========================================================================
    // DAMAGE OVER TIME EFFECTS
    // ========================================================================

    /**
     * Burning effect - Small orbiting flame particles (orange/yellow)
     */
    _drawBurningEffect(ctx, cx, cy, tileSize, time, alpha, stacks) {
        const particleCount = 3 + Math.min(stacks, 3); // 3-6 particles based on stacks
        const orbitRadius = tileSize * 0.35;

        for (let i = 0; i < particleCount; i++) {
            const angle = (time * 3 + (i / particleCount) * Math.PI * 2);
            const wobble = Math.sin(time * 8 + i) * 3;
            const rise = Math.sin(time * 4 + i * 0.5) * 4 - 2;

            const px = cx + Math.cos(angle) * (orbitRadius + wobble);
            const py = cy + Math.sin(angle) * orbitRadius * 0.5 + rise - tileSize * 0.1;

            // Flame gradient: yellow core, orange middle, red outer
            const flicker = 0.7 + Math.sin(time * 12 + i * 2) * 0.3;
            const size = (3 + Math.random() * 2) * flicker;

            // Draw flame particle
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, ${150 + Math.floor(Math.random() * 50)}, 50, ${alpha * 0.8 * flicker})`;
            ctx.fill();

            // Inner bright core
            ctx.beginPath();
            ctx.arc(px, py - 1, size * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 150, ${alpha * 0.9 * flicker})`;
            ctx.fill();
        }
    },

    /**
     * Poison effect - Green bubbles rising (green)
     */
    _drawPoisonEffect(ctx, cx, cy, tileSize, time, alpha, stacks) {
        const particleCount = 3 + Math.min(stacks, 4);

        for (let i = 0; i < particleCount; i++) {
            const phase = (time * 1.5 + i * 0.7) % 2;
            const xOffset = Math.sin(time * 2 + i * 1.3) * (tileSize * 0.25);
            const yOffset = -phase * tileSize * 0.4;

            const px = cx + xOffset;
            const py = cy + yOffset + tileSize * 0.1;

            const bubbleAlpha = (1 - phase / 2) * alpha * 0.7;
            const size = 2 + phase * 2;

            // Poison bubble
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 184, 148, ${bubbleAlpha})`;
            ctx.fill();

            // Bubble highlight
            ctx.beginPath();
            ctx.arc(px - size * 0.3, py - size * 0.3, size * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(150, 255, 200, ${bubbleAlpha * 0.6})`;
            ctx.fill();
        }
    },

    /**
     * Bleeding effect - Red droplets dripping down
     */
    _drawBleedingEffect(ctx, cx, cy, tileSize, time, alpha, stacks) {
        const particleCount = 2 + Math.min(stacks, 2);

        for (let i = 0; i < particleCount; i++) {
            const phase = (time * 2 + i * 0.5) % 1.5;
            const xOffset = (i - particleCount / 2) * 8 + Math.sin(i * 2.5) * 4;
            const yOffset = phase * tileSize * 0.5;

            const px = cx + xOffset;
            const py = cy + yOffset + tileSize * 0.15;

            const dropAlpha = (1 - phase / 1.5) * alpha * 0.8;
            const size = 2 + (1 - phase / 1.5) * 2;

            // Blood droplet (teardrop shape approximation)
            ctx.beginPath();
            ctx.arc(px, py, size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(231, 76, 60, ${dropAlpha})`;
            ctx.fill();

            // Darker core
            ctx.beginPath();
            ctx.arc(px, py + size * 0.2, size * 0.5, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(150, 40, 30, ${dropAlpha * 0.7})`;
            ctx.fill();
        }
    },

    // ========================================================================
    // CROWD CONTROL EFFECTS
    // ========================================================================

    /**
     * Chilled/Slow effect - Ice crystal particles floating (blue/white)
     */
    _drawChilledEffect(ctx, cx, cy, tileSize, time, alpha, stacks) {
        const particleCount = 3 + Math.min(stacks, 3);
        const orbitRadius = tileSize * 0.3;

        for (let i = 0; i < particleCount; i++) {
            const angle = (time * 1.5 + (i / particleCount) * Math.PI * 2);
            const drift = Math.sin(time * 2 + i) * 3;

            const px = cx + Math.cos(angle) * (orbitRadius + drift);
            const py = cy + Math.sin(angle) * orbitRadius * 0.6 + drift * 0.5;

            const sparkle = 0.6 + Math.sin(time * 6 + i * 3) * 0.4;
            const size = 2 + sparkle * 2;

            // Ice crystal (diamond shape)
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(time * 2 + i);

            ctx.beginPath();
            ctx.moveTo(0, -size);
            ctx.lineTo(size * 0.6, 0);
            ctx.lineTo(0, size);
            ctx.lineTo(-size * 0.6, 0);
            ctx.closePath();
            ctx.fillStyle = `rgba(116, 185, 255, ${alpha * 0.7 * sparkle})`;
            ctx.fill();

            // Inner sparkle
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.9 * sparkle})`;
            ctx.fill();

            ctx.restore();
        }
    },

    /**
     * Frozen effect - Ice encasement (blue tint + sparkles)
     */
    _drawFrozenEffect(ctx, cx, cy, tileSize, time, alpha) {
        // Ice encasement overlay
        ctx.fillStyle = `rgba(116, 185, 255, ${alpha * 0.25})`;
        ctx.fillRect(cx - tileSize * 0.45, cy - tileSize * 0.45, tileSize * 0.9, tileSize * 0.9);

        // Ice border
        ctx.strokeStyle = `rgba(150, 220, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 2;
        ctx.strokeRect(cx - tileSize * 0.45, cy - tileSize * 0.45, tileSize * 0.9, tileSize * 0.9);

        // Sparkles
        for (let i = 0; i < 4; i++) {
            const sparkleTime = (time * 3 + i * 0.8) % 2;
            const sparkleAlpha = sparkleTime < 0.3 ? sparkleTime / 0.3 : (sparkleTime < 0.6 ? 1 : 1 - (sparkleTime - 0.6) / 1.4);

            const sx = cx + (Math.cos(i * 1.57) * tileSize * 0.35);
            const sy = cy + (Math.sin(i * 1.57) * tileSize * 0.35);

            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * sparkleAlpha * 0.9})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    /**
     * Stunned effect - Yellow stars circling above head
     */
    _drawStunnedEffect(ctx, cx, cy, tileSize, time, alpha) {
        const starCount = 3;
        const orbitRadius = tileSize * 0.3;
        const orbitY = cy - tileSize * 0.5;

        for (let i = 0; i < starCount; i++) {
            const angle = time * 4 + (i / starCount) * Math.PI * 2;
            const px = cx + Math.cos(angle) * orbitRadius;
            const py = orbitY + Math.sin(angle) * 4;

            const twinkle = 0.7 + Math.sin(time * 8 + i * 2) * 0.3;

            // Draw 4-point star
            ctx.save();
            ctx.translate(px, py);
            ctx.rotate(time * 2 + i);

            ctx.fillStyle = `rgba(241, 196, 15, ${alpha * twinkle})`;
            ctx.beginPath();
            const starSize = 4;
            for (let j = 0; j < 4; j++) {
                const a = (j / 4) * Math.PI * 2;
                const r = j % 2 === 0 ? starSize : starSize * 0.4;
                if (j === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
                else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        }
    },

    /**
     * Rooted effect - Brown vines/roots at feet
     */
    _drawRootedEffect(ctx, screenX, screenY, tileSize, time, alpha) {
        const baseY = screenY + tileSize * 0.85;
        const cx = screenX + tileSize / 2;

        // Ground tint
        ctx.fillStyle = `rgba(39, 174, 96, ${alpha * 0.3})`;
        ctx.fillRect(screenX + tileSize * 0.1, baseY - 5, tileSize * 0.8, tileSize * 0.2);

        // Vine tendrils
        ctx.strokeStyle = `rgba(139, 90, 43, ${alpha * 0.8})`;
        ctx.lineWidth = 2;

        for (let i = 0; i < 3; i++) {
            const offset = (i - 1) * tileSize * 0.25;
            const wave = Math.sin(time * 2 + i) * 3;

            ctx.beginPath();
            ctx.moveTo(cx + offset, baseY);
            ctx.quadraticCurveTo(
                cx + offset + wave, baseY - tileSize * 0.15,
                cx + offset + wave * 0.5, baseY - tileSize * 0.25
            );
            ctx.stroke();
        }

        // Small leaves
        ctx.fillStyle = `rgba(39, 174, 96, ${alpha * 0.7})`;
        for (let i = 0; i < 2; i++) {
            const lx = cx + (i - 0.5) * tileSize * 0.3;
            const ly = baseY - tileSize * 0.15 + Math.sin(time * 3 + i) * 2;

            ctx.beginPath();
            ctx.ellipse(lx, ly, 3, 5, Math.sin(time + i) * 0.3, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    /**
     * Fear effect - Purple/dark aura with fleeing particles
     */
    _drawFearEffect(ctx, cx, cy, tileSize, time, alpha) {
        // Dark aura pulse
        const pulse = 0.5 + Math.sin(time * 4) * 0.2;
        ctx.fillStyle = `rgba(155, 89, 182, ${alpha * 0.15 * pulse})`;
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.5 * pulse, 0, Math.PI * 2);
        ctx.fill();

        // Fleeing particles (moving outward)
        for (let i = 0; i < 4; i++) {
            const angle = time * 2 + (i / 4) * Math.PI * 2;
            const dist = (time * 30 + i * 10) % (tileSize * 0.4);
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist;

            const fadeOut = 1 - dist / (tileSize * 0.4);
            ctx.fillStyle = `rgba(155, 89, 182, ${alpha * fadeOut * 0.6})`;
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    },

    /**
     * Silenced effect - Purple X or mute symbol
     */
    _drawSilencedEffect(ctx, cx, cy, tileSize, time, alpha) {
        const iconY = cy - tileSize * 0.4;
        const pulse = 0.8 + Math.sin(time * 3) * 0.2;

        ctx.strokeStyle = `rgba(155, 89, 182, ${alpha * pulse})`;
        ctx.lineWidth = 2;

        // Draw X over mouth area
        const size = 6;
        ctx.beginPath();
        ctx.moveTo(cx - size, iconY - size);
        ctx.lineTo(cx + size, iconY + size);
        ctx.moveTo(cx + size, iconY - size);
        ctx.lineTo(cx - size, iconY + size);
        ctx.stroke();

        // Circle around it
        ctx.beginPath();
        ctx.arc(cx, iconY, size + 3, 0, Math.PI * 2);
        ctx.stroke();
    },

    // ========================================================================
    // DEBUFF EFFECTS
    // ========================================================================

    /**
     * Weakened effect - Downward arrows
     */
    _drawWeakenedEffect(ctx, cx, cy, tileSize, time, alpha) {
        const arrowY = cy + tileSize * 0.3;
        const drift = Math.sin(time * 3) * 2;

        ctx.fillStyle = `rgba(149, 165, 166, ${alpha * 0.7})`;

        for (let i = 0; i < 2; i++) {
            const ax = cx + (i - 0.5) * 12;
            const ay = arrowY + drift + i * 3;

            // Down arrow
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(ax - 4, ay - 6);
            ctx.lineTo(ax + 4, ay - 6);
            ctx.closePath();
            ctx.fill();
        }
    },

    /**
     * Vulnerable effect - Target/crosshair
     */
    _drawVulnerableEffect(ctx, cx, cy, tileSize, time, alpha) {
        const pulse = 0.8 + Math.sin(time * 4) * 0.2;

        ctx.strokeStyle = `rgba(231, 76, 60, ${alpha * 0.6 * pulse})`;
        ctx.lineWidth = 2;

        // Crosshair
        const size = tileSize * 0.35;
        ctx.beginPath();
        ctx.arc(cx, cy, size, 0, Math.PI * 2);
        ctx.stroke();

        // Cross lines
        ctx.beginPath();
        ctx.moveTo(cx - size - 4, cy);
        ctx.lineTo(cx - size + 8, cy);
        ctx.moveTo(cx + size + 4, cy);
        ctx.lineTo(cx + size - 8, cy);
        ctx.moveTo(cx, cy - size - 4);
        ctx.lineTo(cx, cy - size + 8);
        ctx.moveTo(cx, cy + size + 4);
        ctx.lineTo(cx, cy + size - 8);
        ctx.stroke();
    },

    /**
     * Blinded effect - Dark overlay with reduced vision symbol
     */
    _drawBlindedEffect(ctx, cx, cy, tileSize, time, alpha) {
        const iconY = cy - tileSize * 0.35;
        const blink = Math.sin(time * 2) > 0.5 ? 0.3 : 1;

        // Eye with X
        ctx.strokeStyle = `rgba(45, 52, 54, ${alpha * 0.8 * blink})`;
        ctx.lineWidth = 2;

        // Eye outline
        ctx.beginPath();
        ctx.ellipse(cx, iconY, 8, 5, 0, 0, Math.PI * 2);
        ctx.stroke();

        // X through eye
        ctx.beginPath();
        ctx.moveTo(cx - 6, iconY - 4);
        ctx.lineTo(cx + 6, iconY + 4);
        ctx.moveTo(cx + 6, iconY - 4);
        ctx.lineTo(cx - 6, iconY + 4);
        ctx.stroke();
    },

    // ========================================================================
    // BUFF EFFECTS
    // ========================================================================

    /**
     * Regenerating effect - Green healing particles rising
     */
    _drawRegeneratingEffect(ctx, cx, cy, tileSize, time, alpha) {
        for (let i = 0; i < 3; i++) {
            const phase = (time * 1.5 + i * 0.6) % 2;
            const px = cx + Math.sin(time * 2 + i * 2) * tileSize * 0.2;
            const py = cy + tileSize * 0.2 - phase * tileSize * 0.4;

            const fadeAlpha = (1 - phase / 2) * alpha * 0.7;

            // Plus sign
            ctx.fillStyle = `rgba(46, 204, 113, ${fadeAlpha})`;
            ctx.fillRect(px - 1, py - 4, 2, 8);
            ctx.fillRect(px - 4, py - 1, 8, 2);
        }
    },

    /**
     * Strengthened effect - Red/orange upward power lines
     */
    _drawStrengthenedEffect(ctx, cx, cy, tileSize, time, alpha) {
        const pulse = 0.7 + Math.sin(time * 4) * 0.3;

        ctx.strokeStyle = `rgba(231, 76, 60, ${alpha * 0.6 * pulse})`;
        ctx.lineWidth = 2;

        // Upward power lines
        for (let i = 0; i < 3; i++) {
            const lx = cx + (i - 1) * 10;
            const offset = Math.sin(time * 5 + i) * 3;

            ctx.beginPath();
            ctx.moveTo(lx, cy + tileSize * 0.3);
            ctx.lineTo(lx + offset, cy - tileSize * 0.2);
            ctx.stroke();

            // Arrow head
            ctx.beginPath();
            ctx.moveTo(lx + offset, cy - tileSize * 0.2);
            ctx.lineTo(lx + offset - 3, cy - tileSize * 0.1);
            ctx.moveTo(lx + offset, cy - tileSize * 0.2);
            ctx.lineTo(lx + offset + 3, cy - tileSize * 0.1);
            ctx.stroke();
        }
    },

    /**
     * Hastened effect - Speed lines / motion blur
     */
    _drawHastenedEffect(ctx, cx, cy, tileSize, time, alpha) {
        ctx.strokeStyle = `rgba(243, 156, 18, ${alpha * 0.5})`;
        ctx.lineWidth = 1;

        // Speed lines trailing behind
        for (let i = 0; i < 4; i++) {
            const ly = cy - tileSize * 0.3 + i * tileSize * 0.2;
            const lineLen = 10 + Math.sin(time * 8 + i) * 5;
            const offset = Math.sin(time * 6 + i * 0.5) * 3;

            ctx.beginPath();
            ctx.moveTo(cx - tileSize * 0.4 + offset, ly);
            ctx.lineTo(cx - tileSize * 0.4 - lineLen + offset, ly);
            ctx.stroke();
        }
    },

    /**
     * Shielded effect - Blue protective aura
     */
    _drawShieldedEffect(ctx, cx, cy, tileSize, time, alpha) {
        const pulse = 0.8 + Math.sin(time * 3) * 0.2;

        // Shield aura
        ctx.strokeStyle = `rgba(52, 152, 219, ${alpha * 0.6 * pulse})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.45, 0, Math.PI * 2);
        ctx.stroke();

        // Inner glow
        ctx.fillStyle = `rgba(52, 152, 219, ${alpha * 0.1 * pulse})`;
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Shield sparkle
        const sparkleAngle = time * 2;
        const sx = cx + Math.cos(sparkleAngle) * tileSize * 0.4;
        const sy = cy + Math.sin(sparkleAngle) * tileSize * 0.4;

        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
    },

    /**
     * Invisible effect - Fading/ghost-like particles
     */
    _drawInvisibleEffect(ctx, cx, cy, tileSize, time, alpha) {
        // Shimmering outline
        const shimmer = 0.3 + Math.sin(time * 5) * 0.2;

        ctx.strokeStyle = `rgba(189, 195, 199, ${alpha * shimmer})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(cx, cy, tileSize * 0.4, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // Fading particles
        for (let i = 0; i < 3; i++) {
            const angle = time * 2 + (i / 3) * Math.PI * 2;
            const dist = tileSize * 0.3;
            const px = cx + Math.cos(angle) * dist;
            const py = cy + Math.sin(angle) * dist;

            const fadePhase = (time + i * 0.3) % 1;
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha * (1 - fadePhase) * 0.4})`;
            ctx.beginPath();
            ctx.arc(px, py, 2 * (1 - fadePhase), 0, Math.PI * 2);
            ctx.fill();
        }
    },

    /**
     * Sanctified effect - Golden holy glow
     */
    _drawSanctifiedEffect(ctx, cx, cy, tileSize, time, alpha) {
        const pulse = 0.7 + Math.sin(time * 2) * 0.3;

        // Golden halo above head
        const haloY = cy - tileSize * 0.5;

        ctx.strokeStyle = `rgba(253, 203, 110, ${alpha * 0.7 * pulse})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(cx, haloY, tileSize * 0.25, tileSize * 0.08, 0, 0, Math.PI * 2);
        ctx.stroke();

        // Sparkles
        for (let i = 0; i < 4; i++) {
            const sparklePhase = (time * 2 + i * 0.5) % 1.5;
            const sparkleAlpha = sparklePhase < 0.5 ? sparklePhase * 2 : Math.max(0, 1 - (sparklePhase - 0.5));

            const angle = (i / 4) * Math.PI * 2 + time;
            const dist = tileSize * 0.35;
            const sx = cx + Math.cos(angle) * dist;
            const sy = cy + Math.sin(angle) * dist * 0.6 - tileSize * 0.1;

            ctx.fillStyle = `rgba(255, 255, 200, ${alpha * sparkleAlpha * 0.8})`;
            ctx.beginPath();
            ctx.arc(sx, sy, 2, 0, Math.PI * 2);
            ctx.fill();
        }
    }
};

// ============================================================================
// GLOBAL STATUS EFFECT VISUAL RENDERER
// ============================================================================
// Convenience function for rendering status effects on any entity

/**
 * Render status effect visuals for an entity
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} entity - Entity with status effects
 * @param {number} camX - Camera X position (grid units)
 * @param {number} camY - Camera Y position (grid units)
 * @param {number} tileSize - Tile size in pixels
 * @param {number} offsetX - X offset (e.g., tracker width)
 */
function renderStatusEffectVisuals(ctx, entity, camX, camY, tileSize, offsetX) {
    if (!entity) return;

    const displayX = entity.displayX ?? entity.gridX ?? entity.x;
    const displayY = entity.displayY ?? entity.gridY ?? entity.y;

    const screenX = (displayX - camX) * tileSize + offsetX;
    const screenY = (displayY - camY) * tileSize;

    StatusEffectVisualSystem.renderForEntity(ctx, entity, screenX, screenY, tileSize);
}

/**
 * Render status effect visuals for all entities (player + enemies)
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} camX - Camera X position
 * @param {number} camY - Camera Y position
 * @param {number} tileSize - Tile size in pixels
 * @param {number} offsetX - X offset
 */
function renderAllStatusEffectVisuals(ctx, camX, camY, tileSize, offsetX) {
    // Render for player
    if (typeof game !== 'undefined' && game.player) {
        renderStatusEffectVisuals(ctx, game.player, camX, camY, tileSize, offsetX);
    }

    // Render for all enemies
    if (typeof game !== 'undefined' && game.enemies) {
        for (const enemy of game.enemies) {
            if (enemy.hp > 0 && !enemy.dead) {
                renderStatusEffectVisuals(ctx, enemy, camX, camY, tileSize, offsetX);
            }
        }
    }
}

// Export to window
window.StatusEffectVisualSystem = StatusEffectVisualSystem;
window.renderStatusEffectVisuals = renderStatusEffectVisuals;
window.renderAllStatusEffectVisuals = renderAllStatusEffectVisuals;

console.log('[StatusEffectVisualSystem] Status effect visual system loaded');

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
window.ParticlePool = ParticlePool;
window.FireParticleSystem = FireParticleSystem;
window.FireSpark = FireSpark;
window.ConeParticleSystem = ConeParticleSystem;
window.ConeParticle = ConeParticle;
window.spawnConeParticles = spawnConeParticles;
window.ParticleSystemManager = ParticleSystemManager;

console.log('[ParticleSystem] Particle system loaded (with object pooling and cone streaming)');
