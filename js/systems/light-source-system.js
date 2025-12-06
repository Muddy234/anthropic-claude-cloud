// ============================================================================
// LIGHT SOURCE SYSTEM - Dynamic lighting for darkness-based shifts
// ============================================================================
// Manages light sources (torches, braziers, spells) and calculates visibility
// in darkness scenarios. Integrates with vision system for safe zones.
// ============================================================================

const LightSourceSystem = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    config: {
        debugLogging: false,
        defaultPlayerLightRadius: 3,
        flickerIntensity: 0.1,
        flickerSpeed: 200  // ms
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
    lastFlickerTime: 0,
    flickerOffset: 0,

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
            color: '#ffaa44',
            flicker: true,
            fuel: 60,
            burnRate: 1,
            permanent: false,
            warmthBonus: 8   // For FROSTBITE
        },
        'lantern': {
            radius: 3,
            intensity: 0.7,
            color: '#ffdd88',
            flicker: true,
            fuel: 300,
            burnRate: 1,
            permanent: false,
            attachable: true  // Can attach to player
        },
        'campfire': {
            radius: 6,
            intensity: 1.0,
            color: '#ff6622',
            flicker: true,
            fuel: 180,
            burnRate: 1,
            permanent: false,
            warmthBonus: 12
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

            // Rendering
            flickerPhase: Math.random() * Math.PI * 2
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

            // Apply flicker to radius
            let effectiveRadius = source.radius;
            if (source.flicker) {
                effectiveRadius *= (1 + this.flickerOffset * this.config.flickerIntensity);
            }

            // If within light radius
            if (dist <= effectiveRadius) {
                // Light falloff (linear)
                const falloff = 1 - (dist / effectiveRadius);
                const lightContribution = falloff * source.intensity;
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

        // Update flicker
        this.lastFlickerTime += dt;
        if (this.lastFlickerTime >= this.config.flickerSpeed) {
            this.lastFlickerTime = 0;
            this.flickerOffset = Math.sin(Date.now() / 100) * 0.5 + Math.sin(Date.now() / 73) * 0.3;
        }

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
    },

    /**
     * Cleanup all light sources
     */
    cleanup() {
        this.sources.clear();
        this.globalDarkness = 0;
        this.targetDarkness = 0;
        this.invalidateCache();

        if (this.config.debugLogging) {
            console.log('[LightSource] System cleaned up');
        }
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

console.log('✅ Light Source System loaded');
