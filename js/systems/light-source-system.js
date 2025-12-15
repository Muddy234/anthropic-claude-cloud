// ============================================================================
// LIGHT SOURCE SYSTEM - Dynamic lighting for darkness-based shifts
// ============================================================================
// Manages light sources (torches, braziers, spells) and calculates visibility
// in darkness scenarios. Integrates with vision system for safe zones.
// ============================================================================

// ============================================================================
// PERLIN NOISE IMPLEMENTATION
// ============================================================================
// Used for organic torchlight flicker - creates smooth, natural variations
// Based on Ken Perlin's improved noise algorithm
// ============================================================================

const PerlinNoise = {
    // Permutation table for noise generation
    p: [],

    // Initialize with seed
    init(seed = 0) {
        const perm = [];
        for (let i = 0; i < 256; i++) perm[i] = i;

        // Fisher-Yates shuffle with seed
        let s = seed;
        for (let i = 255; i > 0; i--) {
            s = (s * 16807) % 2147483647;
            const j = s % (i + 1);
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }

        // Duplicate for overflow handling
        this.p = new Array(512);
        for (let i = 0; i < 512; i++) {
            this.p[i] = perm[i & 255];
        }
    },

    // Fade function for smooth interpolation: 6t^5 - 15t^4 + 10t^3
    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    },

    // Linear interpolation
    lerp(a, b, t) {
        return a + t * (b - a);
    },

    // Gradient function
    grad(hash, x, y) {
        const h = hash & 3;
        const u = h < 2 ? x : y;
        const v = h < 2 ? y : x;
        return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
    },

    // 2D Perlin noise at coordinates (x, y)
    // Returns value in range [-1, 1]
    noise2D(x, y) {
        // Find unit square containing point
        const X = Math.floor(x) & 255;
        const Y = Math.floor(y) & 255;

        // Find relative x, y in square
        x -= Math.floor(x);
        y -= Math.floor(y);

        // Compute fade curves
        const u = this.fade(x);
        const v = this.fade(y);

        // Hash coordinates of 4 square corners
        const A = this.p[X] + Y;
        const B = this.p[X + 1] + Y;

        // Blend results from 4 corners
        return this.lerp(
            this.lerp(this.grad(this.p[A], x, y), this.grad(this.p[B], x - 1, y), u),
            this.lerp(this.grad(this.p[A + 1], x, y - 1), this.grad(this.p[B + 1], x - 1, y - 1), u),
            v
        );
    },

    // Fractal Brownian Motion - layered noise for more organic feel
    // Combines multiple octaves of noise at different frequencies
    fbm(x, y, octaves = 3, persistence = 0.5) {
        let total = 0;
        let frequency = 1;
        let amplitude = 1;
        let maxValue = 0;

        for (let i = 0; i < octaves; i++) {
            total += this.noise2D(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= 2;
        }

        return total / maxValue;
    }
};

// Initialize Perlin noise with random seed
PerlinNoise.init(Date.now());

// ============================================================================
// COOKIE TEXTURE GENERATOR
// ============================================================================
// Creates irregular light shapes like real torches cast
// ============================================================================

const LightCookieSystem = {
    cookies: new Map(), // Cache generated cookie textures

    /**
     * Generate a cookie texture for a light source
     * @param {string} id - Unique identifier for caching
     * @param {number} size - Size of texture in pixels
     * @param {number} irregularity - How irregular the shape is (0-1)
     * @returns {HTMLCanvasElement} - Cookie texture canvas
     */
    generateCookie(id, size = 128, irregularity = 0.3) {
        // Check cache first
        if (this.cookies.has(id)) {
            return this.cookies.get(id);
        }

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        const centerX = size / 2;
        const centerY = size / 2;
        const baseRadius = size / 2 - 4;

        // Generate irregular shape using noise
        const points = 64; // Number of points around the circumference
        const angleStep = (Math.PI * 2) / points;

        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
            const angle = i * angleStep;

            // Use Perlin noise to vary the radius
            // Use the ID as part of the noise coordinate for unique shapes
            const noiseX = Math.cos(angle) * 2 + (id.charCodeAt(0) || 0);
            const noiseY = Math.sin(angle) * 2 + (id.charCodeAt(1) || 0);
            const noiseValue = PerlinNoise.noise2D(noiseX, noiseY);

            // Apply irregularity to radius
            const radiusVariation = 1 + noiseValue * irregularity;
            const radius = baseRadius * radiusVariation;

            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        }
        ctx.closePath();

        // Create radial gradient for soft edges
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, baseRadius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
        gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.8, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

        ctx.fillStyle = gradient;
        ctx.fill();

        // Cache the cookie
        this.cookies.set(id, canvas);

        return canvas;
    },

    /**
     * Clear cached cookies (call when light sources are removed)
     */
    clearCache() {
        this.cookies.clear();
    }
};

const LightSourceSystem = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    config: {
        debugLogging: false,
        defaultPlayerLightRadius: 3,
        flickerIntensity: 0.25,      // Increased from 0.1 - more dramatic flicker
        flickerSpeed: 12,            // Slightly faster for more lively feel
        flickerOctaves: 3,           // More octaves for complex organic movement
        flickerPersistence: 0.6,     // How much each octave contributes
        useCookieTextures: true,     // Enable irregular light shapes
        cookieIrregularity: 0.3      // Slightly more irregular shapes
    },

    // ========================================================================
    // STATE
    // ========================================================================
    sources: new Map(),      // sourceId -> light source object
    globalDarkness: 0,       // 0 = full light, 1 = full dark
    targetDarkness: 0,       // For smooth transitions
    darknessTransitionSpeed: 0.5,  // Per second
    visibilityCache: null,   // Cached visibility grid
    cacheValid: false,
    noiseTime: 0,            // Time accumulator for Perlin noise
    flickerOffset: 0,        // Current global flicker offset (legacy compat)
    sourceFlickers: new Map(), // Per-source flicker values for organic variation

    // ========================================================================
    // LIGHT SOURCE TYPES
    // ========================================================================
    SOURCE_TYPES: {
        TORCH: 'torch',
        BRAZIER: 'brazier',
        LANTERN: 'lantern',
        CAMPFIRE: 'campfire',
        SPELL: 'spell',
        PLAYER: 'player',
        THERMAL_VENT: 'thermal_vent',
        HOLY_LIGHT: 'holy_light'
    },

    // Default configurations for each type
    SOURCE_CONFIGS: {
        'torch': {
            radius: 4,
            intensity: 0.8,
            color: '#ff8844',
            flicker: true,
            fuel: 120,       // seconds
            burnRate: 1,
            permanent: false
        },
        'brazier': {
            radius: 5,
            intensity: 1.0,
            color: '#ff8844',
            flicker: true,
            fuel: 60,
            burnRate: 1,
            permanent: false,
            warmthBonus: 8   // For FROSTBITE
        },
        'lantern': {
            radius: 3,
            intensity: 0.7,
            color: '#ff8844',
            flicker: true,
            fuel: 300,
            burnRate: 1,
            permanent: false,
            attachable: true  // Can attach to player
        },
        'campfire': {
            radius: 5,
            intensity: 1,
            color: '#ff8844',
            flicker: true,
            fuel: Infinity,
            burnRate: 0,
            permanent: true,
            warmthBonus: 12,
            // Healing properties (only when player is out of combat)
            heals: true,
            healRadius: 2,
            healRate: 0.01  // 1% of max HP per second
        },
        'spell': {
            radius: 4,
            intensity: 0.9,
            color: '#88ccff',
            flicker: false,
            fuel: 30,
            burnRate: 1,
            permanent: false
        },
        'player': {
            radius: 3,
            intensity: 0.6,
            color: '#ffffff',
            flicker: false,
            fuel: Infinity,
            burnRate: 0,
            permanent: true
        },
        'thermal_vent': {
            radius: 7,
            intensity: 1.0,
            color: '#ff4400',
            flicker: true,
            fuel: Infinity,
            burnRate: 0,
            permanent: true,
            warmthBonus: 15
        },
        'holy_light': {
            radius: 5,
            intensity: 1.0,
            color: '#ffffcc',
            flicker: false,
            fuel: Infinity,
            burnRate: 0,
            permanent: true,
            damageToUndead: true
        }
    },

    // ========================================================================
    // CORE METHODS
    // ========================================================================

    /**
     * Add a light source
     * @param {object} config - Light source configuration
     * @returns {string} - The source ID
     */
    addSource(config) {
        const type = config.type || 'torch';
        const defaults = this.SOURCE_CONFIGS[type] || this.SOURCE_CONFIGS['torch'];

        const source = {
            id: config.id || `light_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,

            // Position (static or attached)
            gridX: config.gridX ?? config.x ?? 0,
            gridY: config.gridY ?? config.y ?? 0,
            attachedTo: config.attachedTo || null,  // Entity reference

            // Light properties
            radius: config.radius ?? defaults.radius,
            baseRadius: config.radius ?? defaults.radius,
            intensity: config.intensity ?? defaults.intensity,
            baseIntensity: config.intensity ?? defaults.intensity,
            color: config.color ?? defaults.color,
            flicker: config.flicker ?? defaults.flicker,

            // Fuel system
            fuel: config.fuel ?? defaults.fuel,
            maxFuel: config.fuel ?? defaults.fuel,
            burnRate: config.burnRate ?? defaults.burnRate,
            permanent: config.permanent ?? defaults.permanent,

            // State
            active: true,
            visible: true,

            // Special properties
            warmthBonus: config.warmthBonus ?? defaults.warmthBonus ?? 0,
            damageToUndead: config.damageToUndead ?? defaults.damageToUndead ?? false,

            // Healing properties (for campfires, bonfires, etc.)
            heals: config.heals ?? defaults.heals ?? false,
            healRadius: config.healRadius ?? defaults.healRadius ?? 0,
            healRate: config.healRate ?? defaults.healRate ?? 0,

            // Rendering
            flickerPhase: Math.random() * Math.PI * 2,

            // Perlin noise offset for unique flicker pattern per source
            noiseOffsetX: Math.random() * 1000,
            noiseOffsetY: Math.random() * 1000,

            // Cookie texture for irregular light shape
            cookieId: config.id || `cookie_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        };

        this.sources.set(source.id, source);
        this.invalidateCache();

        if (this.config.debugLogging) {
            console.log(`[LightSource] Added source: ${source.id} at (${source.gridX}, ${source.gridY})`);
        }

        return source.id;
    },

    /**
     * Remove a light source
     * @param {string} sourceId - The source to remove
     */
    removeSource(sourceId) {
        this.sources.delete(sourceId);
        this.invalidateCache();

        if (this.config.debugLogging) {
            console.log(`[LightSource] Removed source: ${sourceId}`);
        }
    },

    /**
     * Get a light source by ID
     * @param {string} sourceId - The source ID
     * @returns {object|null}
     */
    getSource(sourceId) {
        return this.sources.get(sourceId) || null;
    },

    /**
     * Set global darkness level
     * @param {number} level - 0 (full light) to 1 (full dark)
     * @param {boolean} immediate - Skip transition
     */
    setGlobalDarkness(level, immediate = false) {
        this.targetDarkness = Math.max(0, Math.min(1, level));
        if (immediate) {
            this.globalDarkness = this.targetDarkness;
        }
        this.invalidateCache();

        if (this.config.debugLogging) {
            console.log(`[LightSource] Global darkness set to ${level}${immediate ? ' (immediate)' : ''}`);
        }
    },

    /**
     * Activate/deactivate a light source
     * @param {string} sourceId - The source ID
     * @param {boolean} active - New active state
     */
    setActive(sourceId, active) {
        const source = this.sources.get(sourceId);
        if (source) {
            source.active = active;
            this.invalidateCache();
        }
    },

    /**
     * Refuel a light source
     * @param {string} sourceId - The source ID
     * @param {number} amount - Fuel to add (null = full)
     */
    refuel(sourceId, amount = null) {
        const source = this.sources.get(sourceId);
        if (!source || source.permanent) return;

        if (amount === null) {
            source.fuel = source.maxFuel;
        } else {
            source.fuel = Math.min(source.maxFuel, source.fuel + amount);
        }

        if (!source.active && source.fuel > 0) {
            source.active = true;
        }

        this.invalidateCache();
    },

    // ========================================================================
    // VISIBILITY CALCULATION
    // ========================================================================

    /**
     * Get Perlin noise flicker value for a specific light source
     * Each source has unique noise offset for organic variation
     * @param {object} source - Light source object
     * @returns {number} - Flicker multiplier (0.9 to 1.1 range approximately)
     */
    getSourceFlicker(source) {
        if (!source.flicker) return 1.0;

        // Use Perlin noise for smooth, organic flicker
        // Each source uses its unique noise offset for variation
        const noiseX = this.noiseTime * this.config.flickerSpeed / 1000 + source.noiseOffsetX;
        const noiseY = source.noiseOffsetY;

        // Use FBM for more complex, layered flicker
        // More octaves and persistence creates more organic, lively movement
        const noiseValue = PerlinNoise.fbm(
            noiseX,
            noiseY,
            this.config.flickerOctaves,
            this.config.flickerPersistence || 0.5
        );

        // Add a secondary faster flicker for more "alive" feel
        const fastFlicker = PerlinNoise.noise2D(
            noiseX * 3, // Faster
            noiseY + 100
        ) * 0.1; // Subtle high-frequency variation

        // Convert noise (-1 to 1) to flicker multiplier
        // Apply configured intensity
        const combinedNoise = noiseValue + fastFlicker;
        return 1 + combinedNoise * this.config.flickerIntensity;
    },

    /**
     * Calculate visibility at a specific point
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {number} - 0 (no visibility) to 1 (full visibility)
     */
    getVisibilityAt(x, y) {
        // No darkness = full visibility
        if (this.globalDarkness <= 0) return 1;

        // Start with darkness-based visibility
        let visibility = 1 - this.globalDarkness;

        // Add light from each source
        this.sources.forEach(source => {
            if (!source.active) return;

            // Get source position (handle attached sources)
            let srcX = source.gridX;
            let srcY = source.gridY;
            if (source.attachedTo) {
                srcX = source.attachedTo.gridX ?? source.attachedTo.x ?? srcX;
                srcY = source.attachedTo.gridY ?? source.attachedTo.y ?? srcY;
            }

            // Calculate distance
            const dist = Math.sqrt((x - srcX) ** 2 + (y - srcY) ** 2);

            // Apply Perlin noise flicker to radius for organic effect
            const flickerMultiplier = this.getSourceFlicker(source);
            let effectiveRadius = source.radius * flickerMultiplier;

            // If within light radius
            if (dist <= effectiveRadius) {
                // SmoothStep falloff for soft penumbra (instead of linear)
                // Creates a more natural light edge
                const t = dist / effectiveRadius;
                const smoothFalloff = 1 - (t * t * (3 - 2 * t)); // Smoothstep
                const lightContribution = smoothFalloff * source.intensity * flickerMultiplier;
                visibility = Math.min(1, visibility + lightContribution);
            }
        });

        return visibility;
    },

    /**
     * Check if a point is in a "safe zone" (well-lit area)
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @param {number} threshold - Visibility threshold (default 0.7)
     * @returns {boolean}
     */
    isInSafeZone(x, y, threshold = 0.7) {
        return this.getVisibilityAt(x, y) >= threshold;
    },

    /**
     * Check if a point is near any light source
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {boolean}
     */
    isNearLightSource(x, y) {
        for (const [id, source] of this.sources) {
            if (!source.active) continue;

            let srcX = source.gridX;
            let srcY = source.gridY;
            if (source.attachedTo) {
                srcX = source.attachedTo.gridX ?? source.attachedTo.x ?? srcX;
                srcY = source.attachedTo.gridY ?? source.attachedTo.y ?? srcY;
            }

            const dist = Math.sqrt((x - srcX) ** 2 + (y - srcY) ** 2);
            if (dist <= source.radius) return true;
        }
        return false;
    },

    /**
     * Get warmth bonus at a position (for FROSTBITE)
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {number} - Warmth bonus per second
     */
    getWarmthBonusAt(x, y) {
        let bonus = 0;

        this.sources.forEach(source => {
            if (!source.active || !source.warmthBonus) return;

            let srcX = source.gridX;
            let srcY = source.gridY;
            if (source.attachedTo) {
                srcX = source.attachedTo.gridX ?? source.attachedTo.x ?? srcX;
                srcY = source.attachedTo.gridY ?? source.attachedTo.y ?? srcY;
            }

            const dist = Math.sqrt((x - srcX) ** 2 + (y - srcY) ** 2);
            if (dist <= source.radius) {
                // Bonus decreases with distance
                const factor = 1 - (dist / source.radius);
                bonus += source.warmthBonus * factor;
            }
        });

        return bonus;
    },

    /**
     * Get the nearest light source to a position
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {object|null} - {source, distance} or null
     */
    getNearestSource(x, y) {
        let nearest = null;
        let nearestDist = Infinity;

        this.sources.forEach(source => {
            if (!source.active) return;

            let srcX = source.gridX;
            let srcY = source.gridY;
            if (source.attachedTo) {
                srcX = source.attachedTo.gridX ?? source.attachedTo.x ?? srcX;
                srcY = source.attachedTo.gridY ?? source.attachedTo.y ?? srcY;
            }

            const dist = Math.sqrt((x - srcX) ** 2 + (y - srcY) ** 2);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = { source, distance: dist };
            }
        });

        return nearest;
    },

    // ========================================================================
    // CACHE MANAGEMENT
    // ========================================================================

    invalidateCache() {
        this.cacheValid = false;
        this.visibilityCache = null;
    },

    /**
     * Build visibility cache (call sparingly, expensive)
     */
    buildVisibilityCache() {
        if (this.cacheValid) return;

        this.visibilityCache = [];
        for (let y = 0; y < GRID_HEIGHT; y++) {
            this.visibilityCache[y] = [];
            for (let x = 0; x < GRID_WIDTH; x++) {
                this.visibilityCache[y][x] = this.getVisibilityAt(x, y);
            }
        }

        this.cacheValid = true;
    },

    /**
     * Get cached visibility (builds cache if needed)
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {number}
     */
    getCachedVisibility(x, y) {
        if (!this.cacheValid) {
            // Just calculate on-demand instead of full cache
            return this.getVisibilityAt(x, y);
        }
        return this.visibilityCache[y]?.[x] ?? 0;
    },

    // ========================================================================
    // UPDATE & LIFECYCLE
    // ========================================================================

    /**
     * Update light sources
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        const dtSeconds = dt / 1000;

        // Update darkness transition
        if (this.globalDarkness !== this.targetDarkness) {
            const diff = this.targetDarkness - this.globalDarkness;
            const change = this.darknessTransitionSpeed * dtSeconds;
            if (Math.abs(diff) <= change) {
                this.globalDarkness = this.targetDarkness;
            } else {
                this.globalDarkness += Math.sign(diff) * change;
            }
            this.invalidateCache();
        }

        // Advance Perlin noise time for organic flicker
        this.noiseTime += dt;

        // Update global flickerOffset for player torchlight
        // Uses FBM with fast flicker overlay for lively feel
        const baseFlicker = PerlinNoise.fbm(
            this.noiseTime * this.config.flickerSpeed / 1000,
            0,
            this.config.flickerOctaves,
            this.config.flickerPersistence || 0.5
        );
        const fastFlicker = PerlinNoise.noise2D(
            this.noiseTime * this.config.flickerSpeed / 1000 * 3,
            50
        ) * 0.12;
        this.flickerOffset = baseFlicker + fastFlicker;

        // Update each source
        this.sources.forEach((source, id) => {
            // Update attached position
            if (source.attachedTo) {
                source.gridX = source.attachedTo.gridX ?? source.attachedTo.x ?? source.gridX;
                source.gridY = source.attachedTo.gridY ?? source.attachedTo.y ?? source.gridY;
            }

            // Consume fuel
            if (source.active && !source.permanent && source.fuel !== Infinity) {
                source.fuel -= source.burnRate * dtSeconds;

                if (source.fuel <= 0) {
                    source.fuel = 0;
                    source.active = false;
                    this.invalidateCache();

                    if (this.config.debugLogging) {
                        console.log(`[LightSource] Source ${id} burned out`);
                    }
                }
            }
        });

        // Apply undead damage from holy lights
        if (this.globalDarkness > 0 && game.enemies) {
            game.enemies.forEach(enemy => {
                if (!enemy.traits?.includes('undead') && enemy.type !== 'undead') return;

                this.sources.forEach(source => {
                    if (!source.active || !source.damageToUndead) return;

                    let srcX = source.gridX;
                    let srcY = source.gridY;
                    const dist = Math.sqrt((enemy.gridX - srcX) ** 2 + (enemy.gridY - srcY) ** 2);

                    if (dist <= source.radius) {
                        enemy.hp -= 5 * dtSeconds;  // 5 DPS to undead in holy light
                    }
                });
            });
        }

        // Apply healing from light sources (campfires, bonfires, etc.)
        this._updateHealing(dtSeconds);
    },

    /**
     * Update healing for light sources that provide healing
     * @param {number} dtSeconds - Delta time in seconds
     */
    _updateHealing(dtSeconds) {
        const player = game?.player;
        if (!player || player.hp <= 0) return;

        // Check if player is in combat - no healing during combat
        if (player.inCombat === true || player.combat?.isInCombat === true) return;

        // Check if player is already at full HP
        if (player.hp >= player.maxHp) return;

        // Track if we need to show healing (accumulate from multiple sources)
        let totalHeal = 0;

        // Check each active source for healing
        this.sources.forEach(source => {
            if (!source.active || !source.heals) return;

            const srcX = source.gridX;
            const srcY = source.gridY;
            const dist = Math.sqrt((player.gridX - srcX) ** 2 + (player.gridY - srcY) ** 2);

            // Check if player is within healing radius
            if (dist <= source.healRadius) {
                // Calculate heal amount: healRate is % of max HP per second
                const healAmount = player.maxHp * source.healRate * dtSeconds;
                totalHeal += healAmount;
            }
        });

        // Apply accumulated healing
        if (totalHeal > 0) {
            const actualHeal = Math.min(totalHeal, player.maxHp - player.hp);
            player.hp += actualHeal;

            // Track partial HP for smooth healing display
            if (!this._healAccumulator) this._healAccumulator = 0;
            this._healAccumulator += actualHeal;

            // Show heal number when we've accumulated at least 1 HP
            if (this._healAccumulator >= 1) {
                const displayHeal = Math.floor(this._healAccumulator);
                this._healAccumulator -= displayHeal;
                if (typeof showDamageNumber === 'function' && displayHeal > 0) {
                    showDamageNumber(player, displayHeal, '#88FF88');
                }
            }
        }
    },

    /**
     * Cleanup all light sources
     */
    cleanup() {
        this.sources.clear();
        this.globalDarkness = 0;
        this.targetDarkness = 0;
        this.noiseTime = 0;
        this.sourceFlickers.clear();
        this.invalidateCache();

        // Clear cookie texture cache
        LightCookieSystem.clearCache();

        if (this.config.debugLogging) {
            console.log('[LightSource] System cleaned up');
        }
    },

    /**
     * Get cookie texture for a light source (for rendering)
     * @param {object} source - Light source object
     * @param {number} size - Texture size in pixels
     * @returns {HTMLCanvasElement|null} - Cookie texture or null if disabled
     */
    getCookieTexture(source, size = 128) {
        if (!this.config.useCookieTextures) return null;
        if (!source.flicker) return null; // Only flickering sources get cookies

        return LightCookieSystem.generateCookie(
            source.cookieId,
            size,
            this.config.cookieIrregularity
        );
    },

    // ========================================================================
    // QUERY METHODS
    // ========================================================================

    /**
     * Get all active sources
     * @returns {Array}
     */
    getActiveSources() {
        const result = [];
        this.sources.forEach(source => {
            if (source.active) result.push(source);
        });
        return result;
    },

    /**
     * Get sources by type
     * @param {string} type - Source type
     * @returns {Array}
     */
    getSourcesByType(type) {
        const result = [];
        this.sources.forEach(source => {
            if (source.type === type) result.push(source);
        });
        return result;
    },

    /**
     * Count active sources
     * @returns {number}
     */
    getActiveCount() {
        let count = 0;
        this.sources.forEach(source => {
            if (source.active) count++;
        });
        return count;
    },

    // ========================================================================
    // HELPER METHODS FOR SHIFTS
    // ========================================================================

    /**
     * Create player light (for ECLIPSE)
     * @param {number} radius - Optional custom radius
     */
    createPlayerLight(radius = null) {
        if (this.sources.has('player_light')) return;

        this.addSource({
            id: 'player_light',
            type: 'player',
            attachedTo: game.player,
            radius: radius || this.config.defaultPlayerLightRadius,
            permanent: true
        });
    },

    /**
     * Remove player light
     */
    removePlayerLight() {
        this.removeSource('player_light');
    },

    /**
     * Spawn braziers in rooms for ECLIPSE/FROSTBITE
     * @param {number} count - Number of braziers to spawn
     */
    spawnBraziersInRooms(count = 1) {
        if (!game.rooms) return [];

        const ids = [];
        const rooms = game.rooms.filter(r => r.type !== 'entrance');

        for (let i = 0; i < count && i < rooms.length; i++) {
            const room = rooms[i % rooms.length];
            const x = room.floorX + Math.floor(room.floorWidth / 2);
            const y = room.floorY + Math.floor(room.floorHeight / 2);

            const id = this.addSource({
                type: 'brazier',
                gridX: x,
                gridY: y
            });
            ids.push(id);
        }

        return ids;
    },

    // ========================================================================
    // DEBUG
    // ========================================================================

    getStatus() {
        const sourcesByType = {};
        this.sources.forEach(source => {
            const type = source.type;
            if (!sourcesByType[type]) sourcesByType[type] = { active: 0, inactive: 0 };
            if (source.active) sourcesByType[type].active++;
            else sourcesByType[type].inactive++;
        });

        return {
            globalDarkness: this.globalDarkness.toFixed(2),
            targetDarkness: this.targetDarkness.toFixed(2),
            totalSources: this.sources.size,
            activeSources: this.getActiveCount(),
            sourcesByType
        };
    },

    // ========================================================================
    // UNIFIED RENDERING SYSTEM
    // ========================================================================
    // All light rendering now goes through these methods for consistent behavior

    // Rendering configuration
    renderConfig: {
        glowColor: { r: 255, g: 147, b: 41 },  // Warm orange #ff9329
        playerGlowIntensity: 0.2,               // Base glow intensity for player
        sourceGlowIntensity: 0.25,              // Base glow intensity for placed sources
        fadeDistance: 2                          // Tiles of gradient fade
    },

    /**
     * Get the unified flicker multiplier
     * All light sources use this same value for consistent animation
     * @returns {number} - Flicker multiplier (typically 0.9 to 1.1)
     */
    getFlicker() {
        return 1 + this.flickerOffset * 0.2;
    },

    /**
     * Render warm glow for a single light source
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} sourceX - Screen X position of light center
     * @param {number} sourceY - Screen Y position of light center
     * @param {number} radius - Light radius in tiles
     * @param {number} tileSize - Pixel size of tiles
     * @param {object} options - Optional overrides { color, intensity }
     */
    renderLightGlow(ctx, sourceX, sourceY, radius, tileSize, options = {}) {
        const flickerMultiplier = this.getFlicker();
        const fadeDistance = this.renderConfig.fadeDistance;

        // Calculate glow radius with flicker
        const glowRadius = (radius + fadeDistance) * tileSize * flickerMultiplier;

        // Get color (default to warm orange)
        const color = options.color || this.renderConfig.glowColor;
        const baseIntensity = options.intensity || this.renderConfig.sourceGlowIntensity;
        const intensity = baseIntensity * flickerMultiplier;

        // Calculate gradient stops
        const innerEdge = radius / (radius + fadeDistance);

        // Create radial gradient
        const gradient = ctx.createRadialGradient(
            sourceX, sourceY, 0,
            sourceX, sourceY, glowRadius
        );

        gradient.addColorStop(0, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity})`);
        gradient.addColorStop(innerEdge * 0.5, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.8})`);
        gradient.addColorStop(innerEdge, `rgba(${color.r}, ${color.g}, ${color.b}, ${intensity * 0.5})`);
        gradient.addColorStop(1, `rgba(${color.r}, ${color.g}, ${color.b}, 0)`);

        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = gradient;
        ctx.fillRect(sourceX - glowRadius, sourceY - glowRadius, glowRadius * 2, glowRadius * 2);
        ctx.restore();
    },

    /**
     * Render glows for all active light sources including player
     * @param {CanvasRenderingContext2D} ctx - Canvas context
     * @param {number} camX - Camera X offset
     * @param {number} camY - Camera Y offset
     * @param {number} tileSize - Effective tile size (with zoom)
     * @param {number} offsetX - X offset (e.g., sidebar width)
     */
    renderAllLightGlows(ctx, camX, camY, tileSize, offsetX) {
        // Render player's torch glow first
        if (game.player) {
            const playerScreenX = (game.player.displayX - camX) * tileSize + offsetX;
            const playerScreenY = (game.player.displayY - camY) * tileSize;

            const torchRadius = typeof VisionSystem !== 'undefined'
                ? VisionSystem.getPlayerVisionRange()
                : 4;

            this.renderLightGlow(ctx, playerScreenX, playerScreenY, torchRadius, tileSize, {
                intensity: this.renderConfig.playerGlowIntensity
            });
        }

        // Render all other active light sources
        this.sources.forEach(source => {
            // Skip inactive sources and player-attached sources (handled above)
            if (!source.active) return;
            if (source.type === 'player' || source.attachedTo === game.player) return;

            // Get source position
            let sourceGridX = source.gridX;
            let sourceGridY = source.gridY;
            if (source.attachedTo) {
                sourceGridX = source.attachedTo.displayX ?? source.attachedTo.gridX ?? sourceGridX;
                sourceGridY = source.attachedTo.displayY ?? source.attachedTo.gridY ?? sourceGridY;
            }

            // Convert to screen coordinates
            const sourceScreenX = (sourceGridX - camX) * tileSize + offsetX;
            const sourceScreenY = (sourceGridY - camY) * tileSize;

            // Parse color from hex string if needed
            let glowColor = this.renderConfig.glowColor;
            if (source.color && source.color.startsWith('#')) {
                const hex = source.color.slice(1);
                glowColor = {
                    r: parseInt(hex.substr(0, 2), 16),
                    g: parseInt(hex.substr(2, 2), 16),
                    b: parseInt(hex.substr(4, 2), 16)
                };
            }

            // Render glow with source's properties
            this.renderLightGlow(ctx, sourceScreenX, sourceScreenY, source.radius, tileSize, {
                color: glowColor,
                intensity: this.renderConfig.sourceGlowIntensity * (source.intensity || 1.0)
            });
        });
    },

    /**
     * Get brightness contribution from all light sources at a tile
     * Uses unified flicker for consistent animation
     * @param {number} tileX - Tile X position
     * @param {number} tileY - Tile Y position
     * @param {number} minBrightness - Minimum brightness floor
     * @returns {number} - Brightness value
     */
    getTileBrightnessAt(tileX, tileY, minBrightness = 0.55) {
        let maxBrightness = minBrightness;
        const flickerMultiplier = this.getFlicker();
        const fadeDistance = this.renderConfig.fadeDistance;

        // Check player's torch
        if (game.player) {
            const playerX = game.player.gridX;
            const playerY = game.player.gridY;
            const torchRadius = typeof VisionSystem !== 'undefined'
                ? VisionSystem.getPlayerVisionRange()
                : 4;

            const dx = tileX - playerX;
            const dy = tileY - playerY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const effectiveRadius = torchRadius * flickerMultiplier;
            const playerIntensity = 0.75; // Player torch dimmer than placed sources

            if (distance <= effectiveRadius) {
                maxBrightness = Math.max(maxBrightness, playerIntensity);
            } else {
                const fadeEnd = effectiveRadius + fadeDistance;
                if (distance < fadeEnd) {
                    const fadeProgress = (distance - effectiveRadius) / fadeDistance;
                    const smoothProgress = fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
                    const brightness = playerIntensity - (smoothProgress * (playerIntensity - minBrightness));
                    maxBrightness = Math.max(maxBrightness, brightness);
                }
            }
        }

        // Check all light sources
        this.sources.forEach(source => {
            if (!source.active) return;
            if (source.type === 'player' || source.attachedTo === game.player) return;

            let sourceX = source.gridX;
            let sourceY = source.gridY;
            if (source.attachedTo) {
                sourceX = source.attachedTo.displayX ?? source.attachedTo.gridX ?? sourceX;
                sourceY = source.attachedTo.displayY ?? source.attachedTo.gridY ?? sourceY;
            }

            const dx = tileX - sourceX;
            const dy = tileY - sourceY;
            const distance = Math.sqrt(dx * dx + dy * dy);

            const effectiveRadius = (source.radius || 5) * flickerMultiplier;
            const sourceIntensity = source.intensity || 1.0;

            if (distance <= effectiveRadius) {
                // Smooth falloff from center
                const t = distance / effectiveRadius;
                const smoothFalloff = 1 - (t * t * (3 - 2 * t));
                const brightness = minBrightness + (sourceIntensity - minBrightness) * smoothFalloff;
                maxBrightness = Math.max(maxBrightness, brightness);
            } else {
                const fadeEnd = effectiveRadius + fadeDistance;
                if (distance < fadeEnd) {
                    const fadeProgress = (distance - effectiveRadius) / fadeDistance;
                    const smoothProgress = fadeProgress * fadeProgress * (3 - 2 * fadeProgress);
                    const brightness = sourceIntensity - (smoothProgress * (sourceIntensity - minBrightness));
                    maxBrightness = Math.max(maxBrightness, brightness);
                }
            }
        });

        return Math.min(1.0, maxBrightness);
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const LightSourceSystemDef = {
    name: 'light-source-system',

    init() {
        if (LightSourceSystem.config.debugLogging) {
            console.log('[LightSource] System initialized');
        }
    },

    update(dt) {
        LightSourceSystem.update(dt);
    },

    cleanup() {
        LightSourceSystem.cleanup();
    }
};

// Register with SystemManager (priority 4 - before vision system)
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('light-source-system', LightSourceSystemDef, 4);
} else {
    console.warn('[LightSource] SystemManager not found - running standalone');
}

// ============================================================================
// EXPORTS
// ============================================================================
window.LightSourceSystem = LightSourceSystem;
window.PerlinNoise = PerlinNoise;
window.LightCookieSystem = LightCookieSystem;

console.log('✅ Light Source System loaded (with Perlin noise flicker & cookie textures)');

