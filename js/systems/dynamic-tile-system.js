// ============================================================================
// DYNAMIC TILE SYSTEM - Handles tiles that change state during gameplay
// ============================================================================
// Manages tiles that can transform (corruption, ice, darkness, etc.) and
// provides spread/retraction mechanics for shift scenarios.
// ============================================================================

const DynamicTileSystem = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    config: {
        debugLogging: false,
        maxSpreadPerFrame: 50  // Limit tiles processed per frame for performance
    },

    // ========================================================================
    // STATE
    // ========================================================================
    dynamicTiles: new Map(),  // key: "x,y" -> tile state object
    spreadQueue: [],          // Tiles queued for spread processing
    activeEffects: new Map(), // Tracked spread effects by ID

    // ========================================================================
    // TILE TYPES
    // ========================================================================
    TILE_TYPES: {
        LAVA: 'lava',
        FROZEN_FLOOR: 'frozen_floor',
        ICE_WALL: 'ice_wall',
        CORRUPTED: 'corrupted',
        DARKNESS: 'darkness',
        UNSTABLE: 'unstable',
        VOID: 'void',
        SANCTIFIED: 'sanctified'
    },

    // Tile type configurations
    TILE_CONFIG: {
        'lava': {
            damagePerTick: 20,
            tickRate: 500,        // ms between damage ticks
            blocksMovement: false,
            element: 'fire',
            canSpreadTo: ['floor', 'doorway'],
            visual: { color: '#ff4400', animated: true }
        },
        'frozen_floor': {
            damagePerTick: 0,
            slowAmount: 0.5,      // 50% movement slow
            drainType: 'warmth',  // Drains warmth meter
            drainRate: 5,         // Per second
            blocksMovement: false,
            element: 'ice',
            canSpreadTo: ['floor', 'doorway'],
            visual: { color: '#88ccff', animated: true }
        },
        'ice_wall': {
            blocksMovement: true,
            health: 50,           // Can be destroyed
            element: 'ice',
            canSpreadTo: ['wall'],
            visual: { color: '#aaddff', animated: false }
        },
        'corrupted': {
            damagePerTick: 3,
            tickRate: 1000,
            damageType: 'void',
            blocksMovement: false,
            element: 'void',
            canSpreadTo: ['floor', 'doorway'],
            buffEnemyTypes: ['void'],  // Void enemies get buffed
            visual: { color: '#8800ff', animated: true }
        },
        'darkness': {
            reducesVisibility: true,
            visibilityRadius: 2,
            blocksMovement: false,
            canSpreadTo: ['floor', 'doorway', 'wall'],
            visual: { color: '#000000', opacity: 0.8, animated: false }
        },
        'unstable': {
            collapseChance: 0.1,  // Per second
            warningTime: 2000,    // ms of warning before collapse
            blocksMovement: false,
            canSpreadTo: ['floor'],
            visual: { color: '#aa6600', animated: true }
        },
        'sanctified': {
            healPerTick: 5,
            tickRate: 1000,
            damageToUndead: 10,
            blocksMovement: false,
            element: 'holy',
            canSpreadTo: ['floor', 'doorway', 'corrupted'],
            visual: { color: '#ffdd88', animated: true }
        }
    },

    // ========================================================================
    // CORE METHODS
    // ========================================================================

    /**
     * Convert a tile to a new dynamic type
     * @param {number} x - Grid X position
     * @param {number} y - Grid Y position
     * @param {string} newType - The new tile type
     * @param {object} options - Additional options
     * @returns {boolean} - Success
     */
    convertTile(x, y, newType, options = {}) {
        if (!game.map[y] || !game.map[y][x]) return false;

        const tile = game.map[y][x];
        const config = this.TILE_CONFIG[newType];
        const key = `${x},${y}`;

        // Check if we can convert this tile type
        if (config?.canSpreadTo && !config.canSpreadTo.includes(tile.type)) {
            if (this.config.debugLogging) {
                console.log(`[DynamicTile] Cannot convert ${tile.type} to ${newType}`);
            }
            return false;
        }

        // Store original state
        const previousType = tile.type;
        const previousState = tile.dynamicState ? { ...tile.dynamicState } : null;

        // Update tile
        tile.type = newType;
        tile.dynamicState = {
            active: true,
            previousType: previousType,
            previousState: previousState,
            timer: 0,
            tickTimer: 0,
            intensity: options.intensity || 1.0,
            source: options.source || 'unknown',
            effectId: options.effectId || null,
            duration: options.duration || Infinity,
            createdAt: Date.now()
        };

        // Track in our system
        this.dynamicTiles.set(key, {
            x, y,
            type: newType,
            state: tile.dynamicState
        });

        if (this.config.debugLogging) {
            console.log(`[DynamicTile] Converted (${x},${y}) from ${previousType} to ${newType}`);
        }

        return true;
    },

    /**
     * Revert a dynamic tile to its previous state
     * @param {number} x - Grid X position
     * @param {number} y - Grid Y position
     * @returns {boolean} - Success
     */
    revertTile(x, y) {
        const key = `${x},${y}`;
        const tracked = this.dynamicTiles.get(key);

        if (!tracked) return false;

        const tile = game.map[y]?.[x];
        if (!tile || !tile.dynamicState) return false;

        // Restore previous type
        tile.type = tile.dynamicState.previousType || 'floor';
        tile.dynamicState = tile.dynamicState.previousState || null;

        // Remove from tracking
        this.dynamicTiles.delete(key);

        if (this.config.debugLogging) {
            console.log(`[DynamicTile] Reverted (${x},${y}) to ${tile.type}`);
        }

        return true;
    },

    /**
     * Revert all tiles of a specific type
     * @param {string} tileType - The tile type to revert
     * @returns {number} - Number of tiles reverted
     */
    revertAllOfType(tileType) {
        let count = 0;
        const toRevert = [];

        this.dynamicTiles.forEach((data, key) => {
            if (data.type === tileType) {
                toRevert.push(key);
            }
        });

        toRevert.forEach(key => {
            const [x, y] = key.split(',').map(Number);
            if (this.revertTile(x, y)) count++;
        });

        if (this.config.debugLogging) {
            console.log(`[DynamicTile] Reverted ${count} tiles of type ${tileType}`);
        }

        return count;
    },

    // ========================================================================
    // SPREAD MECHANICS
    // ========================================================================

    /**
     * Start a spread effect from a center point outward
     * @param {string} effectId - Unique identifier for this spread effect
     * @param {number} centerX - Center X position
     * @param {number} centerY - Center Y position
     * @param {string} tileType - Type of tile to spread
     * @param {object} options - Spread options
     * @returns {string} - The effect ID
     */
    startSpreadFrom(effectId, centerX, centerY, tileType, options = {}) {
        const effect = {
            id: effectId,
            type: 'outward',
            centerX,
            centerY,
            tileType,
            currentRadius: options.startRadius || 0,
            maxRadius: options.maxRadius || 100,
            spreadRate: options.spreadRate || 1,  // Tiles per second
            spreadTimer: 0,
            active: true,
            source: options.source || 'shift'
        };

        this.activeEffects.set(effectId, effect);

        if (this.config.debugLogging) {
            console.log(`[DynamicTile] Started outward spread "${effectId}" from (${centerX},${centerY})`);
        }

        return effectId;
    },

    /**
     * Start a spread effect toward a center point (shrinking)
     * @param {string} effectId - Unique identifier for this spread effect
     * @param {number} centerX - Center X position
     * @param {number} centerY - Center Y position
     * @param {string} tileType - Type of tile to spread
     * @param {object} options - Spread options
     * @returns {string} - The effect ID
     */
    startSpreadToward(effectId, centerX, centerY, tileType, options = {}) {
        const effect = {
            id: effectId,
            type: 'inward',
            centerX,
            centerY,
            tileType,
            currentRadius: options.startRadius || 100,
            minRadius: options.minRadius || 0,
            spreadRate: options.spreadRate || 1,  // Tiles per second (radius shrink)
            spreadTimer: 0,
            active: true,
            source: options.source || 'shift'
        };

        this.activeEffects.set(effectId, effect);

        if (this.config.debugLogging) {
            console.log(`[DynamicTile] Started inward spread "${effectId}" toward (${centerX},${centerY})`);
        }

        return effectId;
    },

    /**
     * Stop a spread effect
     * @param {string} effectId - The effect to stop
     * @param {boolean} revert - Whether to revert affected tiles
     */
    stopSpread(effectId, revert = false) {
        const effect = this.activeEffects.get(effectId);
        if (!effect) return;

        effect.active = false;
        this.activeEffects.delete(effectId);

        if (revert) {
            // Revert all tiles created by this effect
            this.dynamicTiles.forEach((data, key) => {
                if (data.state?.effectId === effectId) {
                    const [x, y] = key.split(',').map(Number);
                    this.revertTile(x, y);
                }
            });
        }

        if (this.config.debugLogging) {
            console.log(`[DynamicTile] Stopped spread "${effectId}"${revert ? ' and reverted tiles' : ''}`);
        }
    },

    /**
     * Process spread effects (called from update)
     * @param {number} dt - Delta time in ms
     */
    processSpreadEffects(dt) {
        this.activeEffects.forEach((effect, effectId) => {
            if (!effect.active) return;

            effect.spreadTimer += dt / 1000;
            const tilesToSpread = Math.floor(effect.spreadTimer * effect.spreadRate);

            if (tilesToSpread < 1) return;

            effect.spreadTimer -= tilesToSpread / effect.spreadRate;

            if (effect.type === 'outward') {
                // Expand outward
                const newRadius = effect.currentRadius + tilesToSpread;
                this.applyRadialSpread(
                    effect.centerX,
                    effect.centerY,
                    effect.tileType,
                    effect.currentRadius,
                    newRadius,
                    { effectId, source: effect.source }
                );
                effect.currentRadius = newRadius;

                if (effect.currentRadius >= effect.maxRadius) {
                    effect.active = false;
                    this.activeEffects.delete(effectId);
                }
            } else if (effect.type === 'inward') {
                // Shrink inward (convert tiles OUTSIDE new radius)
                const newRadius = Math.max(effect.minRadius, effect.currentRadius - tilesToSpread);
                this.applyRadialSpread(
                    effect.centerX,
                    effect.centerY,
                    effect.tileType,
                    newRadius,
                    effect.currentRadius,
                    { effectId, source: effect.source, inward: true }
                );
                effect.currentRadius = newRadius;

                if (effect.currentRadius <= effect.minRadius) {
                    effect.active = false;
                    this.activeEffects.delete(effectId);
                }
            }
        });
    },

    /**
     * Apply spread to tiles in a radial ring
     * @param {number} cx - Center X
     * @param {number} cy - Center Y
     * @param {string} tileType - Tile type to apply
     * @param {number} innerRadius - Inner radius (exclusive for outward, inclusive for inward)
     * @param {number} outerRadius - Outer radius (inclusive for outward, exclusive for inward)
     * @param {object} options - Options including effectId, source, inward flag
     */
    applyRadialSpread(cx, cy, tileType, innerRadius, outerRadius, options = {}) {
        const innerSq = innerRadius * innerRadius;
        const outerSq = outerRadius * outerRadius;
        let converted = 0;

        // Only check tiles within the bounding box
        const minX = Math.max(0, Math.floor(cx - outerRadius));
        const maxX = Math.min(GRID_WIDTH - 1, Math.ceil(cx + outerRadius));
        const minY = Math.max(0, Math.floor(cy - outerRadius));
        const maxY = Math.min(GRID_HEIGHT - 1, Math.ceil(cy + outerRadius));

        for (let y = minY; y <= maxY && converted < this.config.maxSpreadPerFrame; y++) {
            for (let x = minX; x <= maxX && converted < this.config.maxSpreadPerFrame; x++) {
                const distSq = (x - cx) ** 2 + (y - cy) ** 2;

                // For outward: convert tiles in the ring between inner and outer
                // For inward: convert tiles outside the new radius (between new outer and old outer)
                if (options.inward) {
                    // Inward spread: convert tiles outside innerRadius but inside outerRadius
                    if (distSq > innerSq && distSq <= outerSq) {
                        if (this.convertTile(x, y, tileType, options)) {
                            converted++;
                        }
                    }
                } else {
                    // Outward spread: convert tiles in ring
                    if (distSq > innerSq && distSq <= outerSq) {
                        if (this.convertTile(x, y, tileType, options)) {
                            converted++;
                        }
                    }
                }
            }
        }

        return converted;
    },

    // ========================================================================
    // TILE EFFECTS PROCESSING
    // ========================================================================

    /**
     * Process dynamic tile effects on entities
     * @param {number} dt - Delta time in ms
     */
    processTileEffects(dt) {
        // Process player tile effects
        if (game.player) {
            this.applyTileEffectToEntity(game.player, dt);
        }

        // Process enemy tile effects
        if (game.enemies) {
            game.enemies.forEach(enemy => {
                this.applyTileEffectToEntity(enemy, dt);
            });
        }
    },

    /**
     * Apply tile effects to a specific entity
     * @param {object} entity - The entity to affect
     * @param {number} dt - Delta time in ms
     */
    applyTileEffectToEntity(entity, dt) {
        const x = Math.floor(entity.gridX ?? entity.x);
        const y = Math.floor(entity.gridY ?? entity.y);
        const key = `${x},${y}`;

        const tracked = this.dynamicTiles.get(key);
        if (!tracked) return;

        const config = this.TILE_CONFIG[tracked.type];
        if (!config) return;

        const tile = game.map[y]?.[x];
        if (!tile?.dynamicState) return;

        // Update tick timer
        tile.dynamicState.tickTimer = (tile.dynamicState.tickTimer || 0) + dt;

        // Apply damage over time
        if (config.damagePerTick && config.tickRate) {
            if (tile.dynamicState.tickTimer >= config.tickRate) {
                tile.dynamicState.tickTimer -= config.tickRate;

                // Don't damage entities immune to this element
                const isImmune = entity.immunities?.includes(config.element);
                if (!isImmune) {
                    entity.hp = (entity.hp || 0) - config.damagePerTick;

                    if (entity === game.player) {
                        addMessage(`Standing in ${tracked.type} deals ${config.damagePerTick} damage!`);
                        if (entity.hp <= 0) {
                            game.state = 'gameover';
                        }
                    }
                }
            }
        }

        // Apply healing over time (sanctified tiles)
        if (config.healPerTick && config.tickRate) {
            if (tile.dynamicState.tickTimer >= config.tickRate) {
                tile.dynamicState.tickTimer -= config.tickRate;

                // Only heal non-undead
                const isUndead = entity.traits?.includes('undead') || entity.type === 'undead';
                if (isUndead && config.damageToUndead) {
                    entity.hp = (entity.hp || 0) - config.damageToUndead;
                } else if (!isUndead && entity === game.player) {
                    entity.hp = Math.min(entity.maxHp, entity.hp + config.healPerTick);
                }
            }
        }

        // Apply environmental meter drain (for warmth, etc.)
        if (config.drainType && config.drainRate && typeof EnvironmentalMeterSystem !== 'undefined') {
            EnvironmentalMeterSystem.modifyValue(config.drainType, -config.drainRate * (dt / 1000));
        }
    },

    // ========================================================================
    // QUERY METHODS
    // ========================================================================

    /**
     * Get the dynamic tile at a position
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {object|null}
     */
    getTileAt(x, y) {
        return this.dynamicTiles.get(`${x},${y}`) || null;
    },

    /**
     * Check if a position has a specific dynamic tile type
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @param {string} tileType - Type to check
     * @returns {boolean}
     */
    isTileType(x, y, tileType) {
        const tracked = this.dynamicTiles.get(`${x},${y}`);
        return tracked?.type === tileType;
    },

    /**
     * Get all tiles of a specific type
     * @param {string} tileType - Type to find
     * @returns {Array} - Array of {x, y, state} objects
     */
    getTilesOfType(tileType) {
        const result = [];
        this.dynamicTiles.forEach((data, key) => {
            if (data.type === tileType) {
                result.push(data);
            }
        });
        return result;
    },

    /**
     * Get count of dynamic tiles
     * @param {string} tileType - Optional type filter
     * @returns {number}
     */
    getCount(tileType = null) {
        if (!tileType) return this.dynamicTiles.size;

        let count = 0;
        this.dynamicTiles.forEach(data => {
            if (data.type === tileType) count++;
        });
        return count;
    },

    /**
     * Check if movement is blocked at a position
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {boolean}
     */
    isMovementBlocked(x, y) {
        const tracked = this.dynamicTiles.get(`${x},${y}`);
        if (!tracked) return false;

        const config = this.TILE_CONFIG[tracked.type];
        return config?.blocksMovement || false;
    },

    /**
     * Get movement slow amount at a position
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {number} - Multiplier (1.0 = no slow, 0.5 = 50% speed)
     */
    getMovementSlow(x, y) {
        const tracked = this.dynamicTiles.get(`${x},${y}`);
        if (!tracked) return 1.0;

        const config = this.TILE_CONFIG[tracked.type];
        return config?.slowAmount || 1.0;
    },

    // ========================================================================
    // SYSTEM LIFECYCLE
    // ========================================================================

    /**
     * Update - called every frame
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        // Process spread effects
        this.processSpreadEffects(dt);

        // Process tile effects on entities
        this.processTileEffects(dt);

        // Process duration-based tiles
        this.dynamicTiles.forEach((data, key) => {
            const tile = game.map[data.y]?.[data.x];
            if (!tile?.dynamicState) return;

            if (tile.dynamicState.duration !== Infinity) {
                tile.dynamicState.timer += dt;
                if (tile.dynamicState.timer >= tile.dynamicState.duration) {
                    this.revertTile(data.x, data.y);
                }
            }
        });
    },

    /**
     * Cleanup - reset all state
     */
    cleanup() {
        // Revert all dynamic tiles
        this.dynamicTiles.forEach((data, key) => {
            const [x, y] = key.split(',').map(Number);
            const tile = game.map[y]?.[x];
            if (tile?.dynamicState?.previousType) {
                tile.type = tile.dynamicState.previousType;
                tile.dynamicState = null;
            }
        });

        this.dynamicTiles.clear();
        this.spreadQueue = [];
        this.activeEffects.clear();

        if (this.config.debugLogging) {
            console.log('[DynamicTile] System cleaned up');
        }
    },

    // ========================================================================
    // DEBUG
    // ========================================================================

    getStatus() {
        return {
            totalDynamicTiles: this.dynamicTiles.size,
            activeEffects: Array.from(this.activeEffects.keys()),
            tilesByType: (() => {
                const counts = {};
                this.dynamicTiles.forEach(data => {
                    counts[data.type] = (counts[data.type] || 0) + 1;
                });
                return counts;
            })()
        };
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const DynamicTileSystemDef = {
    name: 'dynamic-tile-system',

    init() {
        if (DynamicTileSystem.config.debugLogging) {
            console.log('[DynamicTile] System initialized');
        }
    },

    update(dt) {
        DynamicTileSystem.update(dt);
    },

    cleanup() {
        DynamicTileSystem.cleanup();
    }
};

// Register with SystemManager (priority 36 - after hazards, before AI)
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('dynamic-tile-system', DynamicTileSystemDef, 36);
} else {
    console.warn('[DynamicTile] SystemManager not found - running standalone');
}

// ============================================================================
// EXPORTS
// ============================================================================
window.DynamicTileSystem = DynamicTileSystem;

console.log('✅ Dynamic Tile System loaded');
