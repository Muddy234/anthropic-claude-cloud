// ============================================================================
// VISION SYSTEM - Fog of War with Shadowcasting
// ============================================================================
// Implements recursive shadowcasting for efficient line-of-sight calculation
// Three visibility states: unexplored, remembered, visible
// ============================================================================

const VisionSystem = {
    name: 'vision',

    // Configuration - Dynamic Line-of-Sight System
    config: {
        // Core vision ranges (in tiles)
        baseSightRange: 2,        // Player's natural eyesight (torch OFF)
        torchBonus: 4,            // Added to clear range when torch ON
        fadeBuffer: 2,            // Distance over which vision fades to darkness

        // Effective radii:
        // Torch ON:  6 clear + 2 fade = 8 total (baseSightRange + torchBonus + fadeBuffer)
        // Torch OFF: 2 clear + 2 fade = 4 total (baseSightRange + fadeBuffer)

        // Darkness overlay
        darkOverlayColor: { r: 26, g: 26, b: 45 },  // Grayish blue
        maxOpacity: 0.90,         // 90% opacity - walls remain faintly visible

        updateEveryFrame: true,
        debugLogging: false
    },

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    init(gameRef) {
        console.log('[Vision] Initializing fog of war system...');

        // Clear visibility tracking array
        this._visibleTiles = [];

        // Initialize all tiles as unexplored
        if (gameRef.map) {
            for (let y = 0; y < gameRef.map.length; y++) {
                for (let x = 0; x < gameRef.map[y].length; x++) {
                    const tile = gameRef.map[y][x];
                    if (tile) {
                        tile.explored = false;
                        tile.visible = false;
                        tile.visibility = 0; // 0 = not visible, 1 = fully visible
                    }
                }
            }
        }

        console.log('[Vision] Fog of war initialized');
    },

    // ========================================================================
    // UPDATE (Called every frame)
    // ========================================================================

    update(dt) {
        if (!game.player || !game.map) return;
        if (game.state !== 'playing') return;

        // Clear previous visibility
        this.clearVisibility();

        // Calculate player vision range (base + equipment bonuses)
        const fullVisionRange = this.getPlayerVisionRange();
        const totalRange = fullVisionRange + this.config.fadeDistance;

        // Run shadowcasting from player position
        const playerX = Math.floor(game.player.gridX);
        const playerY = Math.floor(game.player.gridY);

        this.computeFOV(playerX, playerY, fullVisionRange, totalRange);

        // Update enemy visibility flags
        this.updateEnemyVisibility();
    },

    // ========================================================================
    // VISION RANGE CALCULATION
    // ========================================================================

    /**
     * Get player's current CLEAR vision range (not including fade)
     * Torch ON:  baseSightRange + torchBonus = 6 tiles
     * Torch OFF: baseSightRange = 2 tiles
     */
    getPlayerVisionRange() {
        const torchOn = game.player?.isTorchOn !== false;
        let range = torchOn
            ? this.config.baseSightRange + this.config.torchBonus
            : this.config.baseSightRange;

        // Equipment bonuses only apply when torch is ON
        if (torchOn && game.player?.equipped) {
            for (const slot in game.player.equipped) {
                const item = game.player.equipped[slot];
                if (item?.visionBonus) range += item.visionBonus;
                if (item?.stats?.visionBonus) range += item.stats.visionBonus;
            }
        }

        return range;
    },

    /**
     * Get the total vision range including fade buffer
     */
    getTotalVisionRange() {
        return this.getPlayerVisionRange() + this.config.fadeBuffer;
    },

    /**
     * Get the fade buffer distance
     */
    getFadeBuffer() {
        return this.config.fadeBuffer;
    },

    /**
     * Get an enemy's vision range based on their tier
     */
    getEnemyVisionRange(enemy) {
        // Check for direct sightRange property
        if (enemy.sightRange !== undefined) {
            return enemy.sightRange;
        }

        // Check tier data
        if (enemy.tier && typeof MONSTER_TIERS !== 'undefined') {
            const tierData = MONSTER_TIERS[enemy.tier];
            if (tierData && tierData.senses) {
                return tierData.senses.visionRange || 4;
            }
        }

        // Check perception property
        if (enemy.perception && enemy.perception.sightRange) {
            return enemy.perception.sightRange;
        }

        // Default fallback
        return 4;
    },

    // ========================================================================
    // VISIBILITY MANAGEMENT
    // ========================================================================

    // Track visible tiles for efficient clearing
    _visibleTiles: [],

    /**
     * Clear current visibility (keep explored state)
     * Optimized: only clears tiles that were previously visible
     */
    clearVisibility() {
        // Only clear tiles that were marked visible last frame
        for (const coords of this._visibleTiles) {
            const tile = game.map[coords.y]?.[coords.x];
            if (tile) {
                tile.visible = false;
                tile.visibility = 0;
            }
        }
        // Reset the tracking array
        this._visibleTiles = [];
    },

    /**
     * Mark a tile as visible
     * Only marks tiles as EXPLORED if they're in the clear zone (visibility = 1.0)
     * Fade zone tiles are visible but not permanently mapped
     */
    setVisible(x, y, visibility = 1) {
        if (x < 0 || y < 0 || y >= game.map.length || x >= game.map[0].length) return;

        const tile = game.map[y][x];
        if (tile) {
            // Track this tile if it's newly visible
            if (!tile.visible) {
                this._visibleTiles.push({ x, y });
            }
            tile.visible = true;

            // EXPLORATION: Only mark as explored if in CLEAR zone (full visibility)
            // Tiles in the fade zone are visible but not permanently mapped
            // This prevents players from mapping entire rooms from the doorway
            if (visibility >= 1.0) {
                tile.explored = true;
            }

            tile.visibility = Math.max(tile.visibility, visibility);
        }
    },

    /**
     * Check if a tile blocks vision
     */
    blocksVision(x, y) {
        if (x < 0 || y < 0 || y >= game.map.length || x >= game.map[0].length) return true;

        const tile = game.map[y][x];
        if (!tile) return true;

        // Walls and interior walls block vision
        if (tile.type === 'wall' || tile.type === 'interior_wall' || tile.type === 'void') {
            return true;
        }

        // Check for vision-blocking decorations
        if (typeof hasVisionBlockingDecorationAt === 'function') {
            return hasVisionBlockingDecorationAt(x, y);
        }

        return false;
    },

    /**
     * Update which enemies are visible to the player
     * Now uses the new entity visibility system
     */
    updateEnemyVisibility() {
        if (!game.enemies) return;

        for (const enemy of game.enemies) {
            const visibility = this.getEntityVisibility(enemy.gridX, enemy.gridY);
            enemy.isVisible = visibility > 0;
            enemy.visibilityAlpha = visibility; // Store for rendering
        }
    },

    // ========================================================================
    // ENTITY VISIBILITY SYSTEM
    // ========================================================================
    // Entities (enemies, loot, traps) are hidden outside light source ranges
    // Uses distance from ALL light sources (player torch + campfires, etc.)

    /**
     * Calculate visibility alpha for an entity at a given position
     * Checks distance to player (if torch on) and all other light sources
     * @param {number} entityX - Entity grid X position
     * @param {number} entityY - Entity grid Y position
     * @returns {number} - Alpha value: 1.0 (fully visible), 0.0 (hidden), or fade value
     */
    getEntityVisibility(entityX, entityY) {
        let maxVisibility = 0;
        const fadeBuffer = this.config.fadeBuffer;

        // Check player's torch light
        if (game.player) {
            const torchOn = game.player.isTorchOn !== false;

            if (torchOn) {
                const playerClearRange = this.getPlayerVisionRange();
                const playerMaxRange = playerClearRange + fadeBuffer;

                const dx = entityX - game.player.gridX;
                const dy = entityY - game.player.gridY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const visibility = this._calculateVisibilityAtDistance(distance, playerClearRange, playerMaxRange);
                maxVisibility = Math.max(maxVisibility, visibility);
            } else {
                // Torch OFF: player still has base sight range
                const baseClearRange = this.config.baseSightRange;
                const baseMaxRange = baseClearRange + fadeBuffer;

                const dx = entityX - game.player.gridX;
                const dy = entityY - game.player.gridY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const visibility = this._calculateVisibilityAtDistance(distance, baseClearRange, baseMaxRange);
                maxVisibility = Math.max(maxVisibility, visibility);
            }
        }

        // Check all other light sources (campfires, braziers, etc.)
        if (typeof LightSourceSystem !== 'undefined') {
            LightSourceSystem.sources.forEach(source => {
                if (!source.active) return;
                // Skip player-attached sources (already handled above)
                if (source.type === 'player' || source.attachedTo === game.player) return;

                const sourceX = source.gridX;
                const sourceY = source.gridY;
                const sourceClearRange = source.radius || 5;
                const sourceMaxRange = sourceClearRange + fadeBuffer;

                const dx = entityX - sourceX;
                const dy = entityY - sourceY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                const visibility = this._calculateVisibilityAtDistance(distance, sourceClearRange, sourceMaxRange);
                maxVisibility = Math.max(maxVisibility, visibility);
            });
        }

        return maxVisibility;
    },

    /**
     * Calculate visibility based on distance from a light source
     * @param {number} distance - Distance from light source
     * @param {number} clearRange - Full visibility range
     * @param {number} maxRange - Maximum range (clear + fade)
     * @returns {number} - Visibility alpha (0-1)
     */
    _calculateVisibilityAtDistance(distance, clearRange, maxRange) {
        // Inside clear zone - fully visible
        if (distance <= clearRange) {
            return 1.0;
        }
        // Outside max range - hidden
        if (distance >= maxRange) {
            return 0.0;
        }
        // In fade zone - gradual transition
        const fadeProgress = (distance - clearRange) / (maxRange - clearRange);
        return 1.0 - fadeProgress;
    },

    /**
     * Check if an entity at a position is visible at all
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {boolean}
     */
    isPositionVisible(x, y) {
        return this.getEntityVisibility(x, y) > 0;
    },

    // ========================================================================
    // SHADOWCASTING ALGORITHM
    // ========================================================================

    /**
     * Compute field of view using recursive shadowcasting
     * Based on the algorithm described by Bjorn Bergstrom
     * @param {number} originX - Player X position
     * @param {number} originY - Player Y position
     * @param {number} fullVisionRange - Range of full visibility (no fade)
     * @param {number} totalRange - Total range including fade zone
     */
    computeFOV(originX, originY, fullVisionRange, totalRange) {
        // Mark origin as visible
        this.setVisible(originX, originY, 1);

        // Process all 8 octants
        for (let octant = 0; octant < 8; octant++) {
            this.scanOctant(originX, originY, fullVisionRange, totalRange, 1, 1.0, 0.0, octant);
        }
    },

    /**
     * Transform coordinates based on octant
     * This allows us to use the same scanning logic for all 8 directions
     */
    transformOctant(row, col, octant) {
        switch (octant) {
            case 0: return { x: col, y: -row };
            case 1: return { x: row, y: -col };
            case 2: return { x: row, y: col };
            case 3: return { x: col, y: row };
            case 4: return { x: -col, y: row };
            case 5: return { x: -row, y: col };
            case 6: return { x: -row, y: -col };
            case 7: return { x: -col, y: -row };
            default: return { x: 0, y: 0 };
        }
    },

    /**
     * Scan a single octant recursively
     * @param {number} fullVisionRange - Range of full visibility
     * @param {number} totalRange - Total range including fade zone
     */
    scanOctant(originX, originY, fullVisionRange, totalRange, row, startSlope, endSlope, octant) {
        if (startSlope < endSlope) return;

        const fadeDistance = this.config.fadeDistance;

        for (let currentRow = row; currentRow <= totalRange; currentRow++) {
            let blocked = false;
            let newStart = startSlope;

            for (let col = Math.floor(currentRow * startSlope + 0.5); col >= Math.ceil(currentRow * endSlope - 0.5); col--) {
                const delta = this.transformOctant(currentRow, col, octant);
                const mapX = originX + delta.x;
                const mapY = originY + delta.y;

                // Calculate distance for visibility falloff using sub-pixel accuracy
                // Use player's exact fractional position for smooth gradient
                const exactPlayerX = game.player.gridX || originX;
                const exactPlayerY = game.player.gridY || originY;

                // Calculate distance from player's exact position to tile center
                const dx = (mapX + 0.5) - exactPlayerX;
                const dy = (mapY + 0.5) - exactPlayerY;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance > totalRange) continue;

                // Calculate visibility based on distance
                // Full visibility within fullVisionRange, smooth fade over fadeDistance
                let visibility = 1;
                if (distance > fullVisionRange) {
                    // In the fade zone - calculate smooth falloff
                    // Smoothstep interpolation from 1.0 at fullVisionRange to 0 at totalRange
                    const fadeProgress = (distance - fullVisionRange) / fadeDistance;
                    const clampedProgress = Math.max(0, Math.min(1, fadeProgress));

                    // Apply smoothstep function for natural ease-in-ease-out
                    const smoothProgress = clampedProgress * clampedProgress * (3 - 2 * clampedProgress);
                    visibility = 1 - smoothProgress;
                }

                const leftSlope = (col + 0.5) / (currentRow - 0.5);
                const rightSlope = (col - 0.5) / (currentRow + 0.5);

                if (rightSlope > startSlope) continue;
                if (leftSlope < endSlope) break;

                // Mark tile as visible
                this.setVisible(mapX, mapY, visibility);

                // Check if this tile blocks vision
                if (blocked) {
                    if (this.blocksVision(mapX, mapY)) {
                        newStart = rightSlope;
                        continue;
                    } else {
                        blocked = false;
                        startSlope = newStart;
                    }
                } else {
                    if (this.blocksVision(mapX, mapY) && currentRow < totalRange) {
                        blocked = true;
                        // Recursive scan for the unblocked area
                        this.scanOctant(originX, originY, fullVisionRange, totalRange, currentRow + 1, startSlope, leftSlope, octant);
                        newStart = rightSlope;
                    }
                }
            }

            if (blocked) break;
        }
    },

    // ========================================================================
    // UTILITY FUNCTIONS
    // ========================================================================

    /**
     * Check if a specific tile is currently visible to the player
     */
    isTileVisible(x, y) {
        if (x < 0 || y < 0 || y >= game.map.length || x >= game.map[0].length) return false;
        const tile = game.map[y][x];
        return tile && tile.visible;
    },

    /**
     * Check if a specific tile has been explored
     */
    isTileExplored(x, y) {
        if (x < 0 || y < 0 || y >= game.map.length || x >= game.map[0].length) return false;
        const tile = game.map[y][x];
        return tile && tile.explored;
    },

    /**
     * Get the visibility level of a tile (0-1)
     */
    getTileVisibility(x, y) {
        if (x < 0 || y < 0 || y >= game.map.length || x >= game.map[0].length) return 0;
        const tile = game.map[y][x];
        return tile ? tile.visibility : 0;
    },

    /**
     * Check if an enemy is visible to the player
     */
    isEnemyVisible(enemy) {
        return enemy && enemy.isVisible;
    },

    /**
     * Check if a position is within player's vision range (for targeting)
     */
    canPlayerSee(x, y) {
        return this.isTileVisible(Math.floor(x), Math.floor(y));
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('vision', VisionSystem, 5); // High priority - run early
} else {
    console.warn('[Vision] SystemManager not found - running standalone');
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.VisionSystem = VisionSystem;
    window.isTileVisible = (x, y) => VisionSystem.isTileVisible(x, y);
    window.isTileExplored = (x, y) => VisionSystem.isTileExplored(x, y);
    window.isEnemyVisible = (enemy) => VisionSystem.isEnemyVisible(enemy);
    window.canPlayerSee = (x, y) => VisionSystem.canPlayerSee(x, y);
    window.getPlayerVisionRange = () => VisionSystem.getPlayerVisionRange();
    window.getEntityVisibility = (x, y) => VisionSystem.getEntityVisibility(x, y);
    window.isPositionVisible = (x, y) => VisionSystem.isPositionVisible(x, y);
}

console.log('✅ Vision system loaded (dynamic line-of-sight)');
