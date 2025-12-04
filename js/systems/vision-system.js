// ============================================================================
// VISION SYSTEM - Fog of War with Shadowcasting
// ============================================================================
// Implements recursive shadowcasting for efficient line-of-sight calculation
// Three visibility states: unexplored, remembered, visible
// ============================================================================

const VisionSystem = {
    name: 'vision',

    // Configuration
    config: {
        basePlayerVision: 4,      // Player base vision range (full visibility)
        fadeDistance: 2,          // Additional tiles where vision fades to darkness
        updateEveryFrame: true,   // Recalculate visibility every frame
        debugLogging: false
    },

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    init(gameRef) {
        console.log('[Vision] Initializing fog of war system...');

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
     * Get player's current vision range including equipment bonuses
     */
    getPlayerVisionRange() {
        let range = this.config.basePlayerVision;

        // Check equipped items for vision bonuses
        if (game.player.equipped) {
            for (const slot in game.player.equipped) {
                const item = game.player.equipped[slot];
                if (item && item.visionBonus) {
                    range += item.visionBonus;
                }
                // Also check stats.visionBonus for alternative format
                if (item && item.stats && item.stats.visionBonus) {
                    range += item.stats.visionBonus;
                }
            }
        }

        return range;
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

    /**
     * Clear current visibility (keep explored state)
     */
    clearVisibility() {
        for (let y = 0; y < game.map.length; y++) {
            for (let x = 0; x < game.map[y].length; x++) {
                const tile = game.map[y][x];
                if (tile) {
                    tile.visible = false;
                    tile.visibility = 0;
                }
            }
        }
    },

    /**
     * Mark a tile as visible
     */
    setVisible(x, y, visibility = 1) {
        if (x < 0 || y < 0 || y >= game.map.length || x >= game.map[0].length) return;

        const tile = game.map[y][x];
        if (tile) {
            tile.visible = true;
            tile.explored = true;
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
     */
    updateEnemyVisibility() {
        if (!game.enemies) return;

        for (const enemy of game.enemies) {
            const ex = Math.floor(enemy.gridX);
            const ey = Math.floor(enemy.gridY);

            if (ex >= 0 && ey >= 0 && ey < game.map.length && ex < game.map[0].length) {
                const tile = game.map[ey][ex];
                enemy.isVisible = tile && tile.visible;
            } else {
                enemy.isVisible = false;
            }
        }
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
}

console.log('✅ Vision system loaded (shadowcasting fog of war)');
