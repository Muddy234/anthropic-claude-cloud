// === js/generation/village-generator.js ===
// SURVIVAL EXTRACTION UPDATE: Village hub map generation

// ============================================================================
// VILLAGE GENERATOR
// ============================================================================

const VillageGenerator = {

    // Village dimensions
    WIDTH: 50,
    HEIGHT: 40,

    // Building definitions
    BUILDINGS: {
        TOWN_SQUARE: {
            id: 'town_square',
            name: 'Town Square',
            width: 8,
            height: 8,
            type: 'open',
            color: '#8B7355',
            npcs: ['elder']
        },
        BANK: {
            id: 'bank',
            name: 'The Vault',
            width: 6,
            height: 5,
            type: 'building',
            color: '#4A4A4A',
            npcs: ['banker']
        },
        MARKET: {
            id: 'market',
            name: 'Village Market',
            width: 14,
            height: 8,
            type: 'open',
            color: '#A0522D',
            npcs: ['blacksmith', 'general_store', 'alchemist'],
            stalls: ['smithy_stall', 'general_stall', 'alchemist_stall']
        },
        TAVERN: {
            id: 'tavern',
            name: 'The Weary Delver',
            width: 8,
            height: 6,
            type: 'building',
            color: '#654321',
            npcs: ['innkeeper', 'patron']
        },
        PLAYER_HOUSE: {
            id: 'player_house',
            name: 'Your Quarters',
            width: 5,
            height: 4,
            type: 'building',
            color: '#5D4E37',
            npcs: []
        },
        EXPEDITION_HALL: {
            id: 'expedition_hall',
            name: 'Expedition Hall',
            width: 7,
            height: 6,
            type: 'building',
            color: '#4B3621',
            npcs: ['expedition_master']
        },
        SHRINE: {
            id: 'shrine',
            name: 'Shrine of Light',
            width: 4,
            height: 4,
            type: 'open',
            color: '#E6E6FA',
            npcs: ['priestess']
        },
        CHASM_ENTRANCE: {
            id: 'chasm_entrance',
            name: 'The Chasm',
            width: 6,
            height: 4,
            type: 'entrance',
            color: '#2F1810',
            npcs: []
        }
    },

    // ========================================================================
    // GENERATION
    // ========================================================================

    /**
     * Generate the village map
     * @param {number} degradationLevel - Legacy param (ignored if WorldStateSystem available)
     * @returns {Object} { map, buildings, spawnPoint, worldState }
     */
    generate(degradationLevel = 0) {
        // Use WorldStateSystem if available, otherwise fall back to degradation
        const worldState = typeof WorldStateSystem !== 'undefined' ?
            WorldStateSystem.getState() : Math.min(degradationLevel + 1, 4);

        // Initialize empty map
        const map = this._createBaseMap();

        // Place buildings (applies building state transformations)
        const buildings = this._placeBuildings(map, worldState);

        // Add paths between buildings
        this._addPaths(map, buildings);

        // Add decorations
        this._addDecorations(map, buildings, worldState);

        // Apply world state effects (tile transformations, damage)
        this._applyWorldState(map, buildings, worldState);

        // Find spawn point (in front of player house or town square)
        const spawnPoint = this._findSpawnPoint(buildings);

        return {
            map,
            buildings,
            spawnPoint,
            width: this.WIDTH,
            height: this.HEIGHT,
            worldState: worldState
        };
    },

    /**
     * Create base map with grass
     * @returns {Array} 2D map array
     * @private
     */
    _createBaseMap() {
        const map = [];

        for (let y = 0; y < this.HEIGHT; y++) {
            const row = [];
            for (let x = 0; x < this.WIDTH; x++) {
                row.push({
                    type: 'grass',
                    walkable: true,
                    buildingId: null,
                    decoration: null,
                    npcId: null
                });
            }
            map.push(row);
        }

        // Add border (fence/wall)
        for (let x = 0; x < this.WIDTH; x++) {
            map[0][x] = { type: 'fence', walkable: false, buildingId: null };
            map[this.HEIGHT - 1][x] = { type: 'fence', walkable: false, buildingId: null };
        }
        for (let y = 0; y < this.HEIGHT; y++) {
            map[y][0] = { type: 'fence', walkable: false, buildingId: null };
            map[y][this.WIDTH - 1] = { type: 'fence', walkable: false, buildingId: null };
        }

        return map;
    },

    /**
     * Place all buildings on the map
     * @param {Array} map
     * @param {number} degradationLevel
     * @returns {Array} Building objects with positions
     * @private
     */
    _placeBuildings(map, degradationLevel) {
        const buildings = [];

        // Fixed layout for consistent village feel
        const layout = [
            { def: this.BUILDINGS.TOWN_SQUARE, x: 21, y: 16 },
            { def: this.BUILDINGS.BANK, x: 5, y: 5 },
            { def: this.BUILDINGS.MARKET, x: 32, y: 4 },
            { def: this.BUILDINGS.TAVERN, x: 5, y: 25 },
            { def: this.BUILDINGS.PLAYER_HOUSE, x: 40, y: 30 },
            { def: this.BUILDINGS.EXPEDITION_HALL, x: 20, y: 5 },
            { def: this.BUILDINGS.SHRINE, x: 40, y: 18 },
            { def: this.BUILDINGS.CHASM_ENTRANCE, x: 22, y: 32 }
        ];

        layout.forEach(({ def, x, y }) => {
            const building = this._createBuilding(def, x, y);
            this._placeBuilding(map, building);
            buildings.push(building);
        });

        return buildings;
    },

    /**
     * Create a building object
     * @param {Object} def - Building definition
     * @param {number} x
     * @param {number} y
     * @returns {Object}
     * @private
     */
    _createBuilding(def, x, y) {
        return {
            id: def.id,
            name: def.name,
            type: def.type,
            x: x,
            y: y,
            width: def.width,
            height: def.height,
            color: def.color,
            npcs: [...def.npcs],
            entranceX: x + Math.floor(def.width / 2),
            entranceY: y + def.height,  // Entrance at bottom
            interiorTiles: [],
            isOpen: def.type === 'open' || def.type === 'entrance'
        };
    },

    /**
     * Place a building on the map
     * @param {Array} map
     * @param {Object} building
     * @private
     */
    _placeBuilding(map, building) {
        for (let dy = 0; dy < building.height; dy++) {
            for (let dx = 0; dx < building.width; dx++) {
                const x = building.x + dx;
                const y = building.y + dy;

                if (y >= 0 && y < this.HEIGHT && x >= 0 && x < this.WIDTH) {
                    const isEdge = dx === 0 || dx === building.width - 1 ||
                                   dy === 0 || dy === building.height - 1;
                    const isEntrance = dx === Math.floor(building.width / 2) &&
                                       dy === building.height - 1;

                    if (building.type === 'building') {
                        if (isEntrance) {
                            map[y][x] = {
                                type: 'door',
                                walkable: true,
                                buildingId: building.id,
                                isEntrance: true
                            };
                        } else if (isEdge) {
                            map[y][x] = {
                                type: 'wall',
                                walkable: false,
                                buildingId: building.id
                            };
                        } else {
                            map[y][x] = {
                                type: 'floor',
                                walkable: true,
                                buildingId: building.id,
                                isInterior: true
                            };
                            building.interiorTiles.push({ x, y });
                        }
                    } else if (building.type === 'open') {
                        // Open areas like town square and market
                        let tileType = isEdge ? 'stone_border' : 'cobblestone';
                        let isStall = false;
                        let stallId = null;

                        // Special handling for market stalls
                        if (building.id === 'market' && !isEdge) {
                            // Place 3 stalls across the market
                            // Stall 1 (Blacksmith): left side
                            // Stall 2 (General Store): center
                            // Stall 3 (Alchemist): right side
                            const stallWidth = 3;
                            const stallHeight = 3;
                            const stallY = 2; // 2 tiles from top

                            // Stall positions (local coords)
                            const stalls = [
                                { id: 'smithy_stall', startX: 2, npcId: 'blacksmith' },
                                { id: 'general_stall', startX: 6, npcId: 'general_store' },
                                { id: 'alchemist_stall', startX: 10, npcId: 'alchemist' }
                            ];

                            for (const stall of stalls) {
                                if (dx >= stall.startX && dx < stall.startX + stallWidth &&
                                    dy >= stallY && dy < stallY + stallHeight) {
                                    // This tile is part of a stall
                                    const isStallBack = dy === stallY;
                                    tileType = isStallBack ? 'stall_counter' : 'stall_floor';
                                    isStall = true;
                                    stallId = stall.id;

                                    // Mark NPC position (center-front of stall)
                                    if (dx === stall.startX + 1 && dy === stallY + 1) {
                                        building.stallNPCs = building.stallNPCs || [];
                                        building.stallNPCs.push({
                                            npcId: stall.npcId,
                                            x: x,
                                            y: y,
                                            stallId: stall.id
                                        });
                                    }
                                }
                            }
                        }

                        map[y][x] = {
                            type: tileType,
                            walkable: true,
                            buildingId: building.id,
                            stallId: stallId
                        };
                        building.interiorTiles.push({ x, y });
                    } else if (building.type === 'entrance') {
                        // Chasm entrance - cave with accessible entry
                        const isEntranceGap = dx === Math.floor(building.width / 2) &&
                                              dy === building.height - 1;

                        if (isEntranceGap) {
                            // Create walkable entrance to the chasm
                            map[y][x] = {
                                type: 'cave_entrance',
                                walkable: true,
                                buildingId: building.id,
                                isExitPoint: true
                            };
                            building.interiorTiles.push({ x, y });
                        } else if (isEdge) {
                            map[y][x] = {
                                type: 'cave_wall',
                                walkable: false,
                                buildingId: building.id
                            };
                        } else {
                            map[y][x] = {
                                type: 'cave_floor',
                                walkable: true,
                                buildingId: building.id,
                                isExitPoint: true
                            };
                            building.interiorTiles.push({ x, y });
                        }
                    }
                }
            }
        }
    },

    /**
     * Add paths connecting buildings
     * @param {Array} map
     * @param {Array} buildings
     * @private
     */
    _addPaths(map, buildings) {
        // Get key connection points
        const townSquare = buildings.find(b => b.id === 'town_square');
        if (!townSquare) return;

        const centerX = townSquare.x + Math.floor(townSquare.width / 2);
        const centerY = townSquare.y + Math.floor(townSquare.height / 2);

        // Connect each building to town square
        buildings.forEach(building => {
            if (building.id === 'town_square') return;

            const buildingCenterX = building.entranceX;
            const buildingCenterY = building.entranceY;

            // Create L-shaped path
            this._createPath(map, buildingCenterX, buildingCenterY, centerX, centerY);
        });
    },

    /**
     * Create a path between two points
     * @param {Array} map
     * @param {number} x1
     * @param {number} y1
     * @param {number} x2
     * @param {number} y2
     * @private
     */
    _createPath(map, x1, y1, x2, y2) {
        // Horizontal first, then vertical
        const dx = x2 > x1 ? 1 : -1;
        const dy = y2 > y1 ? 1 : -1;

        let x = x1;
        let y = y1;

        // Horizontal segment
        while (x !== x2) {
            if (y >= 0 && y < this.HEIGHT && x >= 0 && x < this.WIDTH) {
                if (map[y][x].type === 'grass') {
                    map[y][x] = {
                        type: 'path',
                        walkable: true,
                        buildingId: null
                    };
                }
            }
            x += dx;
        }

        // Vertical segment
        while (y !== y2) {
            if (y >= 0 && y < this.HEIGHT && x >= 0 && x < this.WIDTH) {
                if (map[y][x].type === 'grass') {
                    map[y][x] = {
                        type: 'path',
                        walkable: true,
                        buildingId: null
                    };
                }
            }
            y += dy;
        }
    },

    /**
     * Add decorative elements
     * @param {Array} map
     * @param {Array} buildings
     * @param {number} degradationLevel
     * @private
     */
    _addDecorations(map, buildings, degradationLevel) {
        const decorations = ['tree', 'bush', 'flowers', 'barrel', 'crate', 'well', 'bench'];

        // Add some trees around the edges
        for (let i = 0; i < 15; i++) {
            const x = 2 + Math.floor(Math.random() * (this.WIDTH - 4));
            const y = 2 + Math.floor(Math.random() * (this.HEIGHT - 4));

            if (map[y][x].type === 'grass' && !map[y][x].decoration) {
                map[y][x].decoration = 'tree';
                map[y][x].walkable = false;
            }
        }

        // Add bushes and flowers
        for (let i = 0; i < 20; i++) {
            const x = 2 + Math.floor(Math.random() * (this.WIDTH - 4));
            const y = 2 + Math.floor(Math.random() * (this.HEIGHT - 4));

            if (map[y][x].type === 'grass' && !map[y][x].decoration) {
                map[y][x].decoration = Math.random() > 0.5 ? 'bush' : 'flowers';
                // Flowers are walkable, bushes are not
                if (map[y][x].decoration === 'bush') {
                    map[y][x].walkable = false;
                }
            }
        }

        // Add well near town square
        const townSquare = buildings.find(b => b.id === 'town_square');
        if (townSquare) {
            const wellX = townSquare.x + Math.floor(townSquare.width / 2);
            const wellY = townSquare.y + Math.floor(townSquare.height / 2);
            if (map[wellY][wellX].type === 'cobblestone') {
                map[wellY][wellX].decoration = 'well';
                map[wellY][wellX].walkable = false;
            }
        }

        // Add benches near buildings
        buildings.forEach(building => {
            if (building.type === 'building') {
                const benchX = building.entranceX + 1;
                const benchY = building.entranceY + 1;
                if (benchY < this.HEIGHT && benchX < this.WIDTH) {
                    if (map[benchY][benchX].type === 'grass' || map[benchY][benchX].type === 'path') {
                        map[benchY][benchX].decoration = 'bench';
                    }
                }
            }
        });
    },

    /**
     * Apply world state effects to village tiles and buildings
     * THE BLEEDING EARTH: Transforms village based on narrative progression
     * @param {Array} map
     * @param {Array} buildings
     * @param {number} worldState - 1=NORMAL, 2=ASH, 3=BURNING, 4=ENDGAME
     * @private
     */
    _applyWorldState(map, buildings, worldState) {
        // Get damage configuration for this world state
        const damageConfig = typeof getDamageConfig === 'function' ?
            getDamageConfig(worldState) : { crackChance: 0, rubbleChance: 0, fireChance: 0 };

        // Transform tiles based on world state
        for (let y = 0; y < this.HEIGHT; y++) {
            for (let x = 0; x < this.WIDTH; x++) {
                const tile = map[y][x];
                const baseType = tile.baseType || tile.type;

                // Apply tile transformation if available
                if (typeof getTransformedTile === 'function') {
                    const transformed = getTransformedTile(baseType, worldState);
                    if (transformed.type !== baseType) {
                        tile.baseType = baseType;  // Remember original
                        tile.type = transformed.type;
                        if (transformed.color) {
                            tile.stateColor = transformed.color;
                        }
                    }
                }

                // Apply random damage effects
                if (damageConfig.crackChance > 0 && Math.random() < damageConfig.crackChance) {
                    if (tile.type.includes('path') || tile.type.includes('cobble')) {
                        tile.cracked = true;
                    }
                }

                if (damageConfig.rubbleChance > 0 && Math.random() < damageConfig.rubbleChance) {
                    if (tile.type === 'wall' || tile.type === 'wall_cracked') {
                        tile.type = 'rubble';
                        tile.walkable = false;
                    }
                }

                if (damageConfig.fireChance > 0 && Math.random() < damageConfig.fireChance) {
                    if (tile.type.includes('grass') || tile.type.includes('floor')) {
                        tile.onFire = true;
                    }
                }
            }
        }

        // Apply building state transformations
        buildings.forEach(building => {
            if (typeof getBuildingState === 'function') {
                const buildingState = getBuildingState(building.id, worldState);

                building.status = buildingState.status;
                building.usable = buildingState.usable !== false;

                if (buildingState.name) {
                    building.displayName = buildingState.name;
                }
                if (buildingState.color) {
                    building.stateColor = buildingState.color;
                }
                if (buildingState.description) {
                    building.stateDescription = buildingState.description;
                }
                if (buildingState.replacementInteraction) {
                    building.replacementInteraction = buildingState.replacementInteraction;
                }
                if (buildingState.npc === null) {
                    building.npcs = [];  // NPC is dead/gone
                    building.npcDead = true;
                }

                // Special case: Bank is crushed in BURNING state
                if (building.id === 'bank' && buildingState.status === 'crushed') {
                    this._crushBuilding(map, building);
                }

            }
        });
    },

    /**
     * Apply crushed building effect (rubble, collapsed walls)
     * @param {Array} map
     * @param {Object} building
     * @private
     */
    _crushBuilding(map, building) {
        for (let dy = 0; dy < building.height; dy++) {
            for (let dx = 0; dx < building.width; dx++) {
                const x = building.x + dx;
                const y = building.y + dy;

                if (y >= 0 && y < this.HEIGHT && x >= 0 && x < this.WIDTH) {
                    const tile = map[y][x];
                    const isEdge = dx === 0 || dx === building.width - 1 ||
                                   dy === 0 || dy === building.height - 1;

                    // Mostly rubble with some walls still standing
                    if (Math.random() < 0.7) {
                        tile.type = 'rubble';
                        tile.walkable = false;
                    } else if (isEdge) {
                        tile.type = 'wall_cracked';
                        tile.walkable = false;
                    }
                }
            }
        }

        // Place a large boulder in the center
        const centerX = building.x + Math.floor(building.width / 2);
        const centerY = building.y + Math.floor(building.height / 2);
        if (map[centerY] && map[centerY][centerX]) {
            map[centerY][centerX].type = 'boulder';
            map[centerY][centerX].walkable = false;
            map[centerY][centerX].interactable = true;
            map[centerY][centerX].interactionType = 'emergency_safe';
        }

        building.crushed = true;
    },

    /**
     * Legacy method - redirects to _applyWorldState
     * @deprecated Use _applyWorldState instead
     */
    _applyDegradation(map, buildings, level) {
        // Convert old degradation level to world state (0->1, 1->2, 2->3)
        this._applyWorldState(map, buildings, Math.min(level + 1, 4));
    },

    /**
     * Find player spawn point
     * @param {Array} buildings
     * @returns {Object} { x, y }
     * @private
     */
    _findSpawnPoint(buildings) {
        // Spawn in front of player house
        const playerHouse = buildings.find(b => b.id === 'player_house');
        if (playerHouse) {
            return {
                x: playerHouse.entranceX,
                y: playerHouse.entranceY + 1
            };
        }

        // Fallback: center of town square
        const townSquare = buildings.find(b => b.id === 'town_square');
        if (townSquare) {
            return {
                x: townSquare.x + Math.floor(townSquare.width / 2),
                y: townSquare.y + Math.floor(townSquare.height / 2)
            };
        }

        // Ultimate fallback
        return { x: Math.floor(this.WIDTH / 2), y: Math.floor(this.HEIGHT / 2) };
    },

    // ========================================================================
    // QUERIES
    // ========================================================================

    /**
     * Get building at position
     * @param {Array} map
     * @param {number} x
     * @param {number} y
     * @returns {string|null} Building ID or null
     */
    getBuildingAt(map, x, y) {
        if (y >= 0 && y < this.HEIGHT && x >= 0 && x < this.WIDTH) {
            return map[y][x].buildingId;
        }
        return null;
    },

    /**
     * Check if position is chasm entrance
     * @param {Array} map
     * @param {number} x
     * @param {number} y
     * @returns {boolean}
     */
    isChasmEntrance(map, x, y) {
        if (y >= 0 && y < this.HEIGHT && x >= 0 && x < this.WIDTH) {
            return map[y][x].isExitPoint === true;
        }
        return false;
    },

    /**
     * Get building by ID
     * @param {Array} buildings
     * @param {string} id
     * @returns {Object|null}
     */
    getBuildingById(buildings, id) {
        return buildings.find(b => b.id === id) || null;
    },

    /**
     * Get NPC positions for a generated village
     * @param {Array} buildings
     * @returns {Array} Array of { npcId, x, y, buildingId }
     */
    getNPCPositions(buildings) {
        const positions = [];

        buildings.forEach(building => {
            if (!building.npcs || building.npcs.length === 0) return;
            if (building.damaged && !building.usable) return;

            // Special handling for market - use stall positions
            if (building.id === 'market' && building.stallNPCs) {
                building.stallNPCs.forEach(stallNPC => {
                    positions.push({
                        npcId: stallNPC.npcId,
                        x: stallNPC.x,
                        y: stallNPC.y,
                        buildingId: building.id,
                        stallId: stallNPC.stallId
                    });
                });
                return;
            }

            building.npcs.forEach((npcId, index) => {
                // Place NPC inside building or at entrance
                let x, y;

                if (building.interiorTiles.length > 0) {
                    // Place inside
                    const tile = building.interiorTiles[
                        Math.min(index, building.interiorTiles.length - 1)
                    ];
                    x = tile.x;
                    y = tile.y;
                } else {
                    // Place at entrance
                    x = building.entranceX;
                    y = building.entranceY - 1;
                }

                positions.push({
                    npcId,
                    x,
                    y,
                    buildingId: building.id
                });
            });
        });

        return positions;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.VillageGenerator = VillageGenerator;

// Village generator loaded
