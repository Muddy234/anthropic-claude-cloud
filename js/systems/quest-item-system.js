// ============================================================================
// QUEST ITEM SYSTEM - Collectible objectives during shifts
// ============================================================================
// Handles special items that must be collected and/or delivered during shift
// scenarios (e.g., seal fragments for BREACH, keycards for LOCKDOWN).
// ============================================================================

const QuestItemSystem = {
    // ========================================================================
    // CONFIGURATION
    // ========================================================================
    config: {
        debugLogging: false,
        pickupRange: 1.5,          // Tiles from item center
        deliveryRange: 2.0,        // Tiles from delivery point
        autoPickup: true           // Automatically pick up when in range
    },

    // ========================================================================
    // STATE
    // ========================================================================
    items: new Map(),              // itemId -> quest item object
    deliveryPoints: new Map(),     // deliveryId -> delivery point object
    carriedItems: [],              // Items currently carried by player
    deliveredItems: [],            // Items that have been delivered
    questActive: false,
    questConfig: null,             // Current quest configuration

    // ========================================================================
    // PREDEFINED QUEST ITEM TYPES
    // ========================================================================
    ITEM_TYPES: {
        SEAL_FRAGMENT: 'seal_fragment',
        KEYCARD: 'keycard',
        CRYSTAL_SHARD: 'crystal_shard',
        HOLY_RELIC: 'holy_relic',
        ARTIFACT_PIECE: 'artifact_piece',
        ENERGY_CELL: 'energy_cell'
    },

    // Item configurations
    ITEM_CONFIGS: {
        'seal_fragment': {
            name: 'Seal Fragment',
            description: 'A piece of the dimensional seal',
            icon: '🔮',
            glowColor: '#8800ff',
            carryEffects: {
                moveSpeedMod: 0.85,
                glowing: true,
                attracts: ['void']
            },
            stackable: false,
            maxCarry: 5
        },
        'keycard': {
            name: 'Security Keycard',
            description: 'Unlocks secured doors',
            icon: '🔑',
            glowColor: '#ffcc00',
            carryEffects: {
                moveSpeedMod: 1.0,
                glowing: false,
                attracts: []
            },
            stackable: true,
            maxCarry: 10
        },
        'crystal_shard': {
            name: 'Resonance Crystal',
            description: 'Vibrates with unstable energy',
            icon: '💎',
            glowColor: '#00ffff',
            carryEffects: {
                moveSpeedMod: 0.9,
                glowing: true,
                attracts: ['crystal_guardian'],
                damageOverTime: 1  // Takes 1 damage per second while carrying
            },
            stackable: false,
            maxCarry: 1
        },
        'holy_relic': {
            name: 'Holy Relic',
            description: 'Blessed artifact that repels darkness',
            icon: '✝️',
            glowColor: '#ffffaa',
            carryEffects: {
                moveSpeedMod: 1.0,
                glowing: true,
                attracts: [],
                lightRadius: 3,
                damageToUndead: 5
            },
            stackable: false,
            maxCarry: 1
        },
        'artifact_piece': {
            name: 'Artifact Piece',
            description: 'Part of an ancient artifact',
            icon: '⚱️',
            glowColor: '#cc8844',
            carryEffects: {
                moveSpeedMod: 0.95,
                glowing: false,
                attracts: []
            },
            stackable: true,
            maxCarry: 4
        },
        'energy_cell': {
            name: 'Energy Cell',
            description: 'Volatile power source',
            icon: '🔋',
            glowColor: '#44ff44',
            carryEffects: {
                moveSpeedMod: 0.9,
                glowing: true,
                attracts: [],
                explodeOnDeath: true,
                explosionDamage: 50,
                explosionRadius: 3
            },
            stackable: false,
            maxCarry: 2
        }
    },

    // ========================================================================
    // QUEST MANAGEMENT
    // ========================================================================

    /**
     * Start a collection quest
     * @param {object} questConfig - Quest configuration
     */
    startQuest(questConfig) {
        this.questConfig = {
            itemType: questConfig.itemType || 'seal_fragment',
            totalRequired: questConfig.totalRequired || 5,
            deliveryRequired: questConfig.deliveryRequired ?? true,
            deliveryPointId: questConfig.deliveryPointId || null,
            onItemCollected: questConfig.onItemCollected || null,
            onItemDelivered: questConfig.onItemDelivered || null,
            onQuestComplete: questConfig.onQuestComplete || null,
            ...questConfig
        };

        this.questActive = true;
        this.carriedItems = [];
        this.deliveredItems = [];

        if (this.config.debugLogging) {
            console.log('[QuestItem] Quest started:', this.questConfig);
        }
    },

    /**
     * End the current quest
     * @param {boolean} success - Whether quest was completed successfully
     */
    endQuest(success = false) {
        if (success && this.questConfig?.onQuestComplete) {
            this.questConfig.onQuestComplete();
        }

        this.questActive = false;
        this.questConfig = null;
        this.carriedItems = [];
        this.deliveredItems = [];

        // Clear carry effects from player
        this.updatePlayerCarryEffects();

        if (this.config.debugLogging) {
            console.log(`[QuestItem] Quest ended: ${success ? 'SUCCESS' : 'FAILED'}`);
        }
    },

    // ========================================================================
    // ITEM MANAGEMENT
    // ========================================================================

    /**
     * Spawn a quest item at a position
     * @param {object} config - Item configuration
     * @returns {string} - The item ID
     */
    spawnItem(config) {
        const type = config.type || 'seal_fragment';
        const defaults = this.ITEM_CONFIGS[type] || this.ITEM_CONFIGS['seal_fragment'];

        const item = {
            id: config.id || `qitem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: type,

            // Position
            gridX: config.gridX ?? config.x ?? 0,
            gridY: config.gridY ?? config.y ?? 0,

            // Properties
            name: config.name ?? defaults.name,
            description: config.description ?? defaults.description,
            icon: config.icon ?? defaults.icon,
            glowColor: config.glowColor ?? defaults.glowColor,
            carryEffects: config.carryEffects ?? defaults.carryEffects,

            // State
            collected: false,
            delivered: false,
            visible: true,

            // Animation
            bobTimer: Math.random() * Math.PI * 2,
            glowTimer: 0
        };

        this.items.set(item.id, item);

        // Mark on map
        if (game.map[item.gridY]?.[item.gridX]) {
            game.map[item.gridY][item.gridX].questItem = item.id;
        }

        if (this.config.debugLogging) {
            console.log(`[QuestItem] Spawned ${type} at (${item.gridX}, ${item.gridY})`);
        }

        return item.id;
    },

    /**
     * Spawn multiple items in different rooms
     * @param {string} type - Item type
     * @param {number} count - Number to spawn
     * @returns {Array} - Array of item IDs
     */
    spawnItemsInRooms(type, count) {
        const ids = [];
        if (!game.rooms || game.rooms.length === 0) return ids;

        // Get available rooms (not entrance)
        const rooms = game.rooms.filter(r => r.type !== 'entrance');
        const shuffled = [...rooms].sort(() => Math.random() - 0.5);

        for (let i = 0; i < count; i++) {
            const room = shuffled[i % shuffled.length];
            const x = room.floorX + Math.floor(Math.random() * room.floorWidth);
            const y = room.floorY + Math.floor(Math.random() * room.floorHeight);

            // Verify position is valid
            if (game.map[y]?.[x]?.type === 'floor') {
                const id = this.spawnItem({ type, gridX: x, gridY: y });
                ids.push(id);
            }
        }

        return ids;
    },

    /**
     * Collect an item
     * @param {string} itemId - The item to collect
     * @returns {boolean} - Success
     */
    collectItem(itemId) {
        const item = this.items.get(itemId);
        if (!item || item.collected) return false;

        const itemConfig = this.ITEM_CONFIGS[item.type];

        // Check carry limit
        const currentCarryCount = this.carriedItems.filter(i => i.type === item.type).length;
        if (itemConfig?.maxCarry && currentCarryCount >= itemConfig.maxCarry) {
            addMessage(`Cannot carry more ${item.name}!`);
            return false;
        }

        // Mark as collected
        item.collected = true;
        this.carriedItems.push(item);

        // Clear from map
        if (game.map[item.gridY]?.[item.gridX]) {
            delete game.map[item.gridY][item.gridX].questItem;
        }

        // Update player effects
        this.updatePlayerCarryEffects();

        // Callback
        if (this.questConfig?.onItemCollected) {
            this.questConfig.onItemCollected(item);
        }

        addMessage(`Collected ${item.name}!`);

        if (this.config.debugLogging) {
            console.log(`[QuestItem] Collected: ${itemId}`);
        }

        // Check if quest complete (no delivery required)
        if (!this.questConfig?.deliveryRequired) {
            this.checkQuestCompletion();
        }

        return true;
    },

    /**
     * Drop an item (if carrying)
     * @param {string} itemId - The item to drop
     * @param {number} x - Grid X (default: player position)
     * @param {number} y - Grid Y (default: player position)
     * @returns {boolean} - Success
     */
    dropItem(itemId, x = null, y = null) {
        const itemIndex = this.carriedItems.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return false;

        const item = this.carriedItems[itemIndex];
        this.carriedItems.splice(itemIndex, 1);

        // Set new position
        item.gridX = x ?? Math.floor(game.player?.gridX ?? 0);
        item.gridY = y ?? Math.floor(game.player?.gridY ?? 0);
        item.collected = false;

        // Mark on map
        if (game.map[item.gridY]?.[item.gridX]) {
            game.map[item.gridY][item.gridX].questItem = item.id;
        }

        // Update player effects
        this.updatePlayerCarryEffects();

        addMessage(`Dropped ${item.name}`);

        return true;
    },

    /**
     * Remove an item completely
     * @param {string} itemId - The item to remove
     */
    removeItem(itemId) {
        const item = this.items.get(itemId);
        if (!item) return;

        // Remove from carried if applicable
        const carriedIndex = this.carriedItems.findIndex(i => i.id === itemId);
        if (carriedIndex !== -1) {
            this.carriedItems.splice(carriedIndex, 1);
            this.updatePlayerCarryEffects();
        }

        // Clear from map
        if (game.map[item.gridY]?.[item.gridX]?.questItem === itemId) {
            delete game.map[item.gridY][item.gridX].questItem;
        }

        this.items.delete(itemId);
    },

    // ========================================================================
    // DELIVERY POINTS
    // ========================================================================

    /**
     * Create a delivery point
     * @param {object} config - Delivery point configuration
     * @returns {string} - Delivery point ID
     */
    createDeliveryPoint(config) {
        const deliveryPoint = {
            id: config.id || `delivery_${Date.now()}`,
            gridX: config.gridX ?? config.x ?? 0,
            gridY: config.gridY ?? config.y ?? 0,
            size: config.size ?? { width: 2, height: 2 },
            name: config.name ?? 'Delivery Point',
            acceptedTypes: config.acceptedTypes ?? null,  // null = accept all
            icon: config.icon ?? '📍',
            color: config.color ?? '#ffff00',
            active: true,
            onDelivery: config.onDelivery ?? null
        };

        this.deliveryPoints.set(deliveryPoint.id, deliveryPoint);

        // Mark on map
        for (let dy = 0; dy < deliveryPoint.size.height; dy++) {
            for (let dx = 0; dx < deliveryPoint.size.width; dx++) {
                const x = deliveryPoint.gridX + dx;
                const y = deliveryPoint.gridY + dy;
                if (game.map[y]?.[x]) {
                    game.map[y][x].deliveryPoint = deliveryPoint.id;
                }
            }
        }

        if (this.config.debugLogging) {
            console.log(`[QuestItem] Created delivery point: ${deliveryPoint.id}`);
        }

        return deliveryPoint.id;
    },

    /**
     * Deliver all carried items to a delivery point
     * @param {string} deliveryPointId - The delivery point
     * @returns {number} - Number of items delivered
     */
    deliverItems(deliveryPointId) {
        const deliveryPoint = this.deliveryPoints.get(deliveryPointId);
        if (!deliveryPoint || !deliveryPoint.active) return 0;

        let delivered = 0;

        // Deliver each carried item
        for (let i = this.carriedItems.length - 1; i >= 0; i--) {
            const item = this.carriedItems[i];

            // Check if delivery point accepts this type
            if (deliveryPoint.acceptedTypes &&
                !deliveryPoint.acceptedTypes.includes(item.type)) {
                continue;
            }

            // Deliver
            item.delivered = true;
            this.deliveredItems.push(item);
            this.carriedItems.splice(i, 1);
            delivered++;

            // Callback
            if (deliveryPoint.onDelivery) {
                deliveryPoint.onDelivery(item, deliveryPoint);
            }

            if (this.questConfig?.onItemDelivered) {
                this.questConfig.onItemDelivered(item);
            }
        }

        if (delivered > 0) {
            addMessage(`Delivered ${delivered} item(s)!`);
            this.updatePlayerCarryEffects();
            this.checkQuestCompletion();
        }

        return delivered;
    },

    /**
     * Remove a delivery point
     * @param {string} deliveryPointId - The delivery point to remove
     */
    removeDeliveryPoint(deliveryPointId) {
        const deliveryPoint = this.deliveryPoints.get(deliveryPointId);
        if (!deliveryPoint) return;

        // Clear from map
        for (let dy = 0; dy < deliveryPoint.size.height; dy++) {
            for (let dx = 0; dx < deliveryPoint.size.width; dx++) {
                const x = deliveryPoint.gridX + dx;
                const y = deliveryPoint.gridY + dy;
                if (game.map[y]?.[x]?.deliveryPoint === deliveryPointId) {
                    delete game.map[y][x].deliveryPoint;
                }
            }
        }

        this.deliveryPoints.delete(deliveryPointId);
    },

    // ========================================================================
    // PLAYER EFFECTS
    // ========================================================================

    /**
     * Update player effects based on carried items
     */
    updatePlayerCarryEffects() {
        if (!game.player) return;

        // Reset effects
        game.player.questSpeedMod = 1.0;
        game.player.questGlowing = false;
        game.player.questLightRadius = 0;
        game.player.questAttracts = [];

        if (this.carriedItems.length === 0) return;

        // Combine effects from all carried items
        let totalSpeedMod = 1.0;
        let isGlowing = false;
        let maxLightRadius = 0;
        const attracts = new Set();

        for (const item of this.carriedItems) {
            const effects = item.carryEffects || {};

            if (effects.moveSpeedMod) {
                totalSpeedMod *= effects.moveSpeedMod;
            }

            if (effects.glowing) {
                isGlowing = true;
            }

            if (effects.lightRadius) {
                maxLightRadius = Math.max(maxLightRadius, effects.lightRadius);
            }

            if (effects.attracts) {
                effects.attracts.forEach(type => attracts.add(type));
            }
        }

        game.player.questSpeedMod = totalSpeedMod;
        game.player.questGlowing = isGlowing;
        game.player.questLightRadius = maxLightRadius;
        game.player.questAttracts = Array.from(attracts);
    },

    // ========================================================================
    // QUEST PROGRESS
    // ========================================================================

    /**
     * Check if quest is complete
     */
    checkQuestCompletion() {
        if (!this.questActive || !this.questConfig) return;

        const requiredCount = this.questConfig.totalRequired;

        if (this.questConfig.deliveryRequired) {
            // Need to deliver items
            if (this.deliveredItems.length >= requiredCount) {
                this.endQuest(true);
            }
        } else {
            // Just need to collect
            if (this.carriedItems.length >= requiredCount) {
                this.endQuest(true);
            }
        }
    },

    /**
     * Get quest progress
     * @returns {object} - Progress info
     */
    getProgress() {
        return {
            collected: this.carriedItems.length,
            delivered: this.deliveredItems.length,
            required: this.questConfig?.totalRequired ?? 0,
            deliveryRequired: this.questConfig?.deliveryRequired ?? false,
            remaining: Math.max(0,
                (this.questConfig?.totalRequired ?? 0) -
                (this.questConfig?.deliveryRequired ? this.deliveredItems.length : this.carriedItems.length)
            )
        };
    },

    // ========================================================================
    // UPDATE & LIFECYCLE
    // ========================================================================

    /**
     * Update quest item system
     * @param {number} dt - Delta time in ms
     */
    update(dt) {
        if (!this.questActive) return;

        // Update item animations
        this.items.forEach(item => {
            if (!item.collected) {
                item.bobTimer += dt / 500;
                item.glowTimer += dt / 200;
            }
        });

        // Check for auto-pickup
        if (this.config.autoPickup && game.player) {
            const px = game.player.gridX;
            const py = game.player.gridY;

            this.items.forEach((item, itemId) => {
                if (item.collected) return;

                const dist = Math.sqrt((px - item.gridX) ** 2 + (py - item.gridY) ** 2);
                if (dist <= this.config.pickupRange) {
                    this.collectItem(itemId);
                }
            });
        }

        // Check for delivery proximity
        if (game.player && this.carriedItems.length > 0) {
            const px = game.player.gridX;
            const py = game.player.gridY;

            this.deliveryPoints.forEach((dp, dpId) => {
                if (!dp.active) return;

                const centerX = dp.gridX + dp.size.width / 2;
                const centerY = dp.gridY + dp.size.height / 2;
                const dist = Math.sqrt((px - centerX) ** 2 + (py - centerY) ** 2);

                if (dist <= this.config.deliveryRange) {
                    // Auto-deliver or show prompt
                    this.deliverItems(dpId);
                }
            });
        }

        // Apply carry damage over time
        const dtSeconds = dt / 1000;
        for (const item of this.carriedItems) {
            if (item.carryEffects?.damageOverTime && game.player) {
                game.player.hp -= item.carryEffects.damageOverTime * dtSeconds;
                if (game.player.hp <= 0) {
                    game.state = 'gameover';
                }
            }
        }
    },

    /**
     * Cleanup all quest items
     */
    cleanup() {
        // Clear map markers
        this.items.forEach(item => {
            if (game.map[item.gridY]?.[item.gridX]?.questItem) {
                delete game.map[item.gridY][item.gridX].questItem;
            }
        });

        this.deliveryPoints.forEach(dp => {
            for (let dy = 0; dy < dp.size.height; dy++) {
                for (let dx = 0; dx < dp.size.width; dx++) {
                    const x = dp.gridX + dx;
                    const y = dp.gridY + dy;
                    if (game.map[y]?.[x]?.deliveryPoint) {
                        delete game.map[y][x].deliveryPoint;
                    }
                }
            }
        });

        this.items.clear();
        this.deliveryPoints.clear();
        this.carriedItems = [];
        this.deliveredItems = [];
        this.questActive = false;
        this.questConfig = null;

        // Clear player effects
        if (game.player) {
            game.player.questSpeedMod = 1.0;
            game.player.questGlowing = false;
            game.player.questLightRadius = 0;
            game.player.questAttracts = [];
        }

        if (this.config.debugLogging) {
            console.log('[QuestItem] System cleaned up');
        }
    },

    // ========================================================================
    // QUERY METHODS
    // ========================================================================

    /**
     * Get all uncollected items
     * @returns {Array}
     */
    getUncollectedItems() {
        const result = [];
        this.items.forEach(item => {
            if (!item.collected) result.push(item);
        });
        return result;
    },

    /**
     * Get item at position
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {object|null}
     */
    getItemAt(x, y) {
        for (const [id, item] of this.items) {
            if (!item.collected && item.gridX === x && item.gridY === y) {
                return item;
            }
        }
        return null;
    },

    /**
     * Get delivery point at position
     * @param {number} x - Grid X
     * @param {number} y - Grid Y
     * @returns {object|null}
     */
    getDeliveryPointAt(x, y) {
        for (const [id, dp] of this.deliveryPoints) {
            if (x >= dp.gridX && x < dp.gridX + dp.size.width &&
                y >= dp.gridY && y < dp.gridY + dp.size.height) {
                return dp;
            }
        }
        return null;
    },

    // ========================================================================
    // DEBUG
    // ========================================================================

    getStatus() {
        return {
            questActive: this.questActive,
            totalItems: this.items.size,
            uncollected: this.getUncollectedItems().length,
            carried: this.carriedItems.length,
            delivered: this.deliveredItems.length,
            deliveryPoints: this.deliveryPoints.size,
            progress: this.getProgress()
        };
    }
};

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const QuestItemSystemDef = {
    name: 'quest-item-system',

    init() {
        if (QuestItemSystem.config.debugLogging) {
            console.log('[QuestItem] System initialized');
        }
    },

    update(dt) {
        QuestItemSystem.update(dt);
    },

    cleanup() {
        QuestItemSystem.cleanup();
    }
};

// Register with SystemManager (priority 66 - after inventory)
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('quest-item-system', QuestItemSystemDef, 66);
} else {
    console.warn('[QuestItem] SystemManager not found - running standalone');
}

// ============================================================================
// EXPORTS
// ============================================================================
window.QuestItemSystem = QuestItemSystem;

console.log('✅ Quest Item System loaded');
