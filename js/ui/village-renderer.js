// === js/ui/village-renderer.js ===
// SURVIVAL EXTRACTION UPDATE: Village rendering

// ============================================================================
// VILLAGE RENDERER
// ============================================================================

const VillageRenderer = {

    // Tile colors
    TILE_COLORS: {
        grass: '#4A7C23',
        path: '#B8A088',
        cobblestone: '#808080',
        stone_border: '#606060',
        cracked_stone: '#707070',
        floor: '#8B7355',
        wall: '#4A4A4A',
        door: '#8B4513',
        fence: '#654321',
        cave_wall: '#2F2F2F',
        cave_floor: '#1A1A1A',
        cave_entrance: '#3D1F1F',  // Reddish dark - inviting entrance
        rubble: '#555555'
    },

    // Decoration colors
    DECORATION_COLORS: {
        tree: '#228B22',
        bush: '#2E8B57',
        flowers: '#FF69B4',
        barrel: '#8B4513',
        crate: '#A0522D',
        well: '#696969',
        bench: '#8B7355'
    },

    // Cached values
    tileSize: 32,
    offsetX: 0,
    offsetY: 0,

    // ========================================================================
    // RENDERING
    // ========================================================================

    /**
     * Render the entire village
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} villageData - { map, buildings, npcs }
     * @param {Object} player - Player position
     * @param {Object} camera - Camera offset
     */
    render(ctx, villageData, player, camera) {
        if (!villageData || !villageData.map) return;

        const { map, buildings } = villageData;

        // Calculate camera offset to center on player
        this._calculateCamera(ctx, player, map);

        // Render layers
        this._renderTiles(ctx, map);
        this._renderDecorations(ctx, map);
        this._renderBuildings(ctx, buildings);
        this._renderNPCs(ctx, villageData.npcs);
        this._renderPlayer(ctx, player);
        this._renderBuildingLabels(ctx, buildings);
    },

    /**
     * Calculate camera offset
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} player
     * @param {Array} map
     * @private
     */
    _calculateCamera(ctx, player, map) {
        const canvas = ctx.canvas;
        const mapWidth = map[0].length * this.tileSize;
        const mapHeight = map.length * this.tileSize;

        // Center camera on player
        let targetX = (canvas.width / 2) - (player.x * this.tileSize);
        let targetY = (canvas.height / 2) - (player.y * this.tileSize);

        // Clamp to map bounds
        targetX = Math.min(0, Math.max(canvas.width - mapWidth, targetX));
        targetY = Math.min(0, Math.max(canvas.height - mapHeight, targetY));

        this.offsetX = targetX;
        this.offsetY = targetY;
    },

    /**
     * Render base tiles
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array} map
     * @private
     */
    _renderTiles(ctx, map) {
        const canvas = ctx.canvas;
        const startX = Math.max(0, Math.floor(-this.offsetX / this.tileSize));
        const startY = Math.max(0, Math.floor(-this.offsetY / this.tileSize));
        const endX = Math.min(map[0].length, startX + Math.ceil(canvas.width / this.tileSize) + 2);
        const endY = Math.min(map.length, startY + Math.ceil(canvas.height / this.tileSize) + 2);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = map[y][x];
                const screenX = x * this.tileSize + this.offsetX;
                const screenY = y * this.tileSize + this.offsetY;

                // Base tile color
                const color = this.TILE_COLORS[tile.type] || '#333333';
                ctx.fillStyle = color;
                ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);

                // Add texture/variation
                if (tile.type === 'grass') {
                    this._renderGrassTexture(ctx, screenX, screenY, x, y);
                } else if (tile.type === 'cobblestone' || tile.type === 'path') {
                    this._renderStoneTexture(ctx, screenX, screenY, x, y);
                } else if (tile.type === 'cave_floor') {
                    this._renderCaveTexture(ctx, screenX, screenY);
                } else if (tile.type === 'cave_entrance') {
                    this._renderCaveEntranceEffect(ctx, screenX, screenY);
                }

                // Damage overlay
                if (tile.damaged) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
                    ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
                }
            }
        }
    },

    /**
     * Render grass texture
     * @private
     */
    _renderGrassTexture(ctx, screenX, screenY, tileX, tileY) {
        // Subtle variation based on position
        const seed = (tileX * 7 + tileY * 13) % 17;
        if (seed < 5) {
            ctx.fillStyle = 'rgba(0, 100, 0, 0.15)';
            ctx.fillRect(screenX + 4, screenY + 4, 4, 4);
        }
        if (seed > 12) {
            ctx.fillStyle = 'rgba(100, 150, 0, 0.15)';
            ctx.fillRect(screenX + 20, screenY + 16, 6, 6);
        }
    },

    /**
     * Render stone texture
     * @private
     */
    _renderStoneTexture(ctx, screenX, screenY, tileX, tileY) {
        // Grid pattern for cobblestone
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(screenX + 1, screenY + 1, this.tileSize - 2, this.tileSize - 2);

        // Some stones have darker patches
        if ((tileX + tileY) % 3 === 0) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            ctx.fillRect(screenX + 8, screenY + 8, 16, 16);
        }
    },

    /**
     * Render cave texture
     * @private
     */
    _renderCaveTexture(ctx, screenX, screenY) {
        // Dark, ominous glow
        const gradient = ctx.createRadialGradient(
            screenX + this.tileSize / 2, screenY + this.tileSize / 2, 0,
            screenX + this.tileSize / 2, screenY + this.tileSize / 2, this.tileSize
        );
        gradient.addColorStop(0, 'rgba(100, 0, 0, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);
    },

    /**
     * Render cave entrance effect - pulsing glow to draw attention
     * @private
     */
    _renderCaveEntranceEffect(ctx, screenX, screenY) {
        // Pulsing orange/red glow to indicate entrance
        const pulse = (Math.sin(Date.now() / 500) + 1) / 2;  // 0 to 1

        // Inner glow
        const gradient = ctx.createRadialGradient(
            screenX + this.tileSize / 2, screenY + this.tileSize / 2, 0,
            screenX + this.tileSize / 2, screenY + this.tileSize / 2, this.tileSize
        );
        gradient.addColorStop(0, `rgba(255, 100, 50, ${0.4 + pulse * 0.3})`);
        gradient.addColorStop(0.5, `rgba(200, 50, 0, ${0.2 + pulse * 0.2})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(screenX, screenY, this.tileSize, this.tileSize);

        // Arrow indicator pointing down (into chasm)
        ctx.fillStyle = `rgba(255, 200, 100, ${0.6 + pulse * 0.4})`;
        ctx.beginPath();
        ctx.moveTo(screenX + this.tileSize / 2, screenY + this.tileSize - 4);
        ctx.lineTo(screenX + this.tileSize / 2 - 6, screenY + this.tileSize - 12);
        ctx.lineTo(screenX + this.tileSize / 2 + 6, screenY + this.tileSize - 12);
        ctx.closePath();
        ctx.fill();
    },

    /**
     * Render decorations
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array} map
     * @private
     */
    _renderDecorations(ctx, map) {
        const canvas = ctx.canvas;
        const startX = Math.max(0, Math.floor(-this.offsetX / this.tileSize));
        const startY = Math.max(0, Math.floor(-this.offsetY / this.tileSize));
        const endX = Math.min(map[0].length, startX + Math.ceil(canvas.width / this.tileSize) + 2);
        const endY = Math.min(map.length, startY + Math.ceil(canvas.height / this.tileSize) + 2);

        for (let y = startY; y < endY; y++) {
            for (let x = startX; x < endX; x++) {
                const tile = map[y][x];
                if (!tile.decoration) continue;

                const screenX = x * this.tileSize + this.offsetX;
                const screenY = y * this.tileSize + this.offsetY;

                this._renderDecoration(ctx, tile.decoration, screenX, screenY);
            }
        }
    },

    /**
     * Render a single decoration
     * @private
     */
    _renderDecoration(ctx, type, screenX, screenY) {
        const centerX = screenX + this.tileSize / 2;
        const centerY = screenY + this.tileSize / 2;

        switch (type) {
            case 'tree':
                // Trunk
                ctx.fillStyle = '#4A3000';
                ctx.fillRect(centerX - 4, centerY, 8, 16);
                // Foliage
                ctx.fillStyle = '#228B22';
                ctx.beginPath();
                ctx.arc(centerX, centerY - 4, 14, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'bush':
                ctx.fillStyle = '#2E8B57';
                ctx.beginPath();
                ctx.arc(centerX, centerY + 4, 10, 0, Math.PI * 2);
                ctx.fill();
                break;

            case 'flowers':
                const flowerColors = ['#FF69B4', '#FFD700', '#FF6347', '#9370DB'];
                for (let i = 0; i < 4; i++) {
                    ctx.fillStyle = flowerColors[i];
                    ctx.beginPath();
                    ctx.arc(
                        centerX + (i % 2) * 12 - 6,
                        centerY + Math.floor(i / 2) * 12 - 6,
                        4, 0, Math.PI * 2
                    );
                    ctx.fill();
                }
                break;

            case 'well':
                // Stone base
                ctx.fillStyle = '#696969';
                ctx.fillRect(screenX + 4, screenY + 4, 24, 24);
                // Water
                ctx.fillStyle = '#4169E1';
                ctx.fillRect(screenX + 8, screenY + 8, 16, 16);
                // Roof supports
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(screenX + 6, screenY + 2, 4, 28);
                ctx.fillRect(screenX + 22, screenY + 2, 4, 28);
                break;

            case 'bench':
                ctx.fillStyle = '#8B7355';
                ctx.fillRect(screenX + 4, screenY + 12, 24, 8);
                ctx.fillRect(screenX + 6, screenY + 20, 4, 8);
                ctx.fillRect(screenX + 22, screenY + 20, 4, 8);
                break;

            case 'barrel':
                ctx.fillStyle = '#8B4513';
                ctx.fillRect(screenX + 8, screenY + 6, 16, 20);
                ctx.fillStyle = '#4A3000';
                ctx.fillRect(screenX + 8, screenY + 10, 16, 3);
                ctx.fillRect(screenX + 8, screenY + 18, 16, 3);
                break;

            case 'crate':
                ctx.fillStyle = '#A0522D';
                ctx.fillRect(screenX + 6, screenY + 6, 20, 20);
                ctx.strokeStyle = '#4A3000';
                ctx.lineWidth = 2;
                ctx.strokeRect(screenX + 6, screenY + 6, 20, 20);
                break;
        }
    },

    /**
     * Render building structures
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array} buildings
     * @private
     */
    _renderBuildings(ctx, buildings) {
        buildings.forEach(building => {
            const screenX = building.x * this.tileSize + this.offsetX;
            const screenY = building.y * this.tileSize + this.offsetY;
            const width = building.width * this.tileSize;
            const height = building.height * this.tileSize;

            // Building roof (extends slightly beyond walls)
            if (building.type === 'building') {
                // Roof
                ctx.fillStyle = this._darken(building.color, 0.3);
                ctx.fillRect(screenX - 4, screenY - 8, width + 8, 12);

                // Roof peak/ridge
                ctx.fillStyle = this._darken(building.color, 0.4);
                ctx.beginPath();
                ctx.moveTo(screenX - 4, screenY - 8);
                ctx.lineTo(screenX + width / 2, screenY - 16);
                ctx.lineTo(screenX + width + 4, screenY - 8);
                ctx.closePath();
                ctx.fill();
            }

            // Building damage overlay
            if (building.damaged) {
                ctx.fillStyle = 'rgba(50, 50, 50, 0.4)';
                ctx.fillRect(screenX, screenY, width, height);

                // Crack lines
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(screenX + width * 0.3, screenY);
                ctx.lineTo(screenX + width * 0.5, screenY + height * 0.6);
                ctx.lineTo(screenX + width * 0.7, screenY + height);
                ctx.stroke();
            }
        });
    },

    /**
     * Render building labels
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array} buildings
     * @private
     */
    _renderBuildingLabels(ctx, buildings) {
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';

        buildings.forEach(building => {
            const screenX = (building.x + building.width / 2) * this.tileSize + this.offsetX;
            const screenY = building.y * this.tileSize + this.offsetY - 20;

            // Background
            const textWidth = ctx.measureText(building.name).width;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(screenX - textWidth / 2 - 4, screenY - 12, textWidth + 8, 16);

            // Text
            ctx.fillStyle = building.damaged ? '#888' : '#FFF';
            ctx.fillText(building.name, screenX, screenY);

            // Damaged indicator
            if (building.damaged) {
                ctx.fillStyle = '#FF4444';
                ctx.fillText('(Damaged)', screenX, screenY + 14);
            }
        });
    },

    /**
     * Render NPCs
     * @param {CanvasRenderingContext2D} ctx
     * @param {Array} npcs
     * @private
     */
    _renderNPCs(ctx, npcs) {
        if (!npcs || npcs.length === 0) return;

        npcs.forEach(npc => {
            const screenX = npc.x * this.tileSize + this.offsetX;
            const screenY = npc.y * this.tileSize + this.offsetY;

            // NPC body
            ctx.fillStyle = npc.color || '#8888FF';
            ctx.beginPath();
            ctx.arc(
                screenX + this.tileSize / 2,
                screenY + this.tileSize / 2,
                12, 0, Math.PI * 2
            );
            ctx.fill();

            // NPC outline
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Name above
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#FFF';
            ctx.fillText(
                npc.name || npc.id,
                screenX + this.tileSize / 2,
                screenY - 4
            );

            // Interaction indicator (if player nearby)
            if (npc.showInteraction) {
                ctx.fillStyle = '#FFD700';
                ctx.font = 'bold 14px Arial';
                ctx.fillText('!', screenX + this.tileSize / 2, screenY - 16);
            }
        });
    },

    /**
     * Render player using the same sprite as dungeon
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} player
     * @private
     */
    _renderPlayer(ctx, player) {
        // Use displayX/displayY for smooth movement, fallback to x/y
        const posX = player.displayX !== undefined ? player.displayX : player.x;
        const posY = player.displayY !== undefined ? player.displayY : player.y;

        const screenX = posX * this.tileSize + this.offsetX;
        const screenY = posY * this.tileSize + this.offsetY;

        // Player shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.ellipse(
            screenX + this.tileSize / 2,
            screenY + this.tileSize - 4,
            10, 5, 0, 0, Math.PI * 2
        );
        ctx.fill();

        // Use drawPlayerSprite if available and sprites are loaded
        if (typeof drawPlayerSprite === 'function' &&
            typeof PLAYER_SPRITE_CONFIG !== 'undefined' &&
            PLAYER_SPRITE_CONFIG.loaded) {

            // Set up temporary game.player reference for the sprite function
            const originalPlayer = game.player;
            game.player = {
                facing: this._getFacingDirection(player),
                currentFrame: player.currentFrame || 0,
                isMoving: player.isMoving || false
            };

            drawPlayerSprite(ctx, screenX, screenY, this.tileSize);

            // Restore original player
            game.player = originalPlayer;
        } else {
            // Fallback: draw a rectangle (similar to dungeon fallback)
            ctx.fillStyle = '#3498db';
            ctx.fillRect(screenX + 8, screenY + 8, this.tileSize - 16, this.tileSize - 16);

            // White outline
            ctx.strokeStyle = '#FFF';
            ctx.lineWidth = 2;
            ctx.strokeRect(screenX + 8, screenY + 8, this.tileSize - 16, this.tileSize - 16);
        }
    },

    /**
     * Convert facingX/facingY to direction string
     * @private
     */
    _getFacingDirection(player) {
        const fx = player.facingX || 0;
        const fy = player.facingY || 0;

        if (fy < 0) return 'up';
        if (fy > 0) return 'down';
        if (fx < 0) return 'left';
        if (fx > 0) return 'right';
        return 'down'; // Default
    },

    // ========================================================================
    // UI OVERLAYS
    // ========================================================================

    /**
     * Render village UI overlay
     * @param {CanvasRenderingContext2D} ctx
     * @param {Object} villageData
     */
    renderUI(ctx, villageData) {
        const canvas = ctx.canvas;

        // Location indicator (top center)
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvas.width / 2 - 80, 10, 160, 30);
        ctx.fillStyle = '#FFF';
        ctx.fillText('📍 Surface Village', canvas.width / 2, 30);

        // Controls hint (bottom)
        ctx.font = '12px Arial';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(canvas.width / 2 - 150, canvas.height - 35, 300, 25);
        ctx.fillStyle = '#AAA';
        ctx.fillText('WASD/Arrows: Move | E: Interact | ESC: Menu', canvas.width / 2, canvas.height - 18);

        // Stats (top left)
        this._renderStats(ctx);
    },

    /**
     * Render player stats
     * @param {CanvasRenderingContext2D} ctx
     * @private
     */
    _renderStats(ctx) {
        const x = 10;
        const y = 10;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x, y, 150, 80);

        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#FFD700';
        ctx.fillText(`Gold: ${persistentState?.bank?.gold || 0}`, x + 10, y + 20);

        ctx.fillStyle = '#AAA';
        ctx.fillText(`Bank Items: ${persistentState?.bank?.items?.length || 0}`, x + 10, y + 40);

        ctx.fillStyle = '#88FF88';
        ctx.fillText(`Runs: ${persistentState?.stats?.totalRuns || 0}`, x + 10, y + 60);
    },

    // ========================================================================
    // UTILITIES
    // ========================================================================

    /**
     * Darken a color
     * @param {string} color - Hex color
     * @param {number} amount - 0-1
     * @returns {string}
     * @private
     */
    _darken(color, amount) {
        const hex = color.replace('#', '');
        const r = Math.max(0, parseInt(hex.substr(0, 2), 16) * (1 - amount));
        const g = Math.max(0, parseInt(hex.substr(2, 2), 16) * (1 - amount));
        const b = Math.max(0, parseInt(hex.substr(4, 2), 16) * (1 - amount));
        return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
    },

    /**
     * Convert world position to screen position
     * @param {number} worldX
     * @param {number} worldY
     * @returns {Object} { x, y }
     */
    worldToScreen(worldX, worldY) {
        return {
            x: worldX * this.tileSize + this.offsetX,
            y: worldY * this.tileSize + this.offsetY
        };
    },

    /**
     * Convert screen position to world position
     * @param {number} screenX
     * @param {number} screenY
     * @returns {Object} { x, y }
     */
    screenToWorld(screenX, screenY) {
        return {
            x: Math.floor((screenX - this.offsetX) / this.tileSize),
            y: Math.floor((screenY - this.offsetY) / this.tileSize)
        };
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.VillageRenderer = VillageRenderer;

console.log('[VillageRenderer] Village renderer loaded');
