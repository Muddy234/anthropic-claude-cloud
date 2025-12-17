// === js/systems/rescue-system.js ===
// SURVIVAL EXTRACTION UPDATE: Death drop and rescue run mechanics

// ============================================================================
// RESCUE SYSTEM
// ============================================================================

const RescueSystem = {

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize rescue system
     */
    init() {
        if (typeof persistentState !== 'undefined' && !persistentState.rescue) {
            persistentState.rescue = {
                hasDroppedItems: false,
                droppedItems: [],
                droppedGold: 0,
                deathFloor: null,
                deathRoom: null,
                deathTimestamp: null,
                rescueAttempts: 0,
                totalItemsLost: 0,
                totalItemsRecovered: 0
            };
        }

        console.log('[RescueSystem] Initialized');
    },

    // ========================================================================
    // DEATH HANDLING
    // ========================================================================

    /**
     * Process player death - create rescue opportunity
     * @param {Object} deathData - { floor, room, inventory, gold }
     * @returns {Object} Drop summary
     */
    onPlayerDeath(deathData) {
        if (!persistentState?.rescue) this.init();

        const { floor, room, inventory, gold } = deathData;

        // Calculate what gets dropped vs lost forever
        const dropResult = this._calculateDrop(inventory, gold, floor);

        // Store dropped items for rescue
        persistentState.rescue = {
            hasDroppedItems: true,
            droppedItems: dropResult.dropped,
            droppedGold: dropResult.droppedGold,
            deathFloor: floor,
            deathRoom: room,
            deathTimestamp: Date.now(),
            rescueAttempts: 0,
            totalItemsLost: persistentState.rescue.totalItemsLost + dropResult.lost.length,
            totalItemsRecovered: persistentState.rescue.totalItemsRecovered
        };

        console.log(`[RescueSystem] Death on Floor ${floor}. Items dropped: ${dropResult.dropped.length}, Lost: ${dropResult.lost.length}`);

        // Notify degradation system
        if (typeof DegradationSystem !== 'undefined') {
            DegradationSystem.onRunFailed();
        }

        return {
            dropped: dropResult.dropped,
            lost: dropResult.lost,
            droppedGold: dropResult.droppedGold,
            lostGold: dropResult.lostGold,
            canRescue: dropResult.dropped.length > 0 || dropResult.droppedGold > 0,
            rescueFloor: floor
        };
    },

    /**
     * Calculate what items are dropped vs permanently lost
     * @param {Array} inventory - Player's inventory
     * @param {number} gold - Gold on hand
     * @param {number} floor - Death floor
     * @returns {Object} { dropped, lost, droppedGold, lostGold }
     * @private
     */
    _calculateDrop(inventory, gold, floor) {
        const config = typeof RESCUE_CONFIG !== 'undefined' ?
            RESCUE_CONFIG : {
                baseDropRate: 0.7,      // 70% of items dropped (recoverable)
                floorPenalty: 0.05,     // 5% fewer drops per floor deeper
                goldDropRate: 0.5,      // 50% of gold dropped
                rareItemProtection: 0.8 // 80% chance rare+ items are dropped not lost
            };

        const dropped = [];
        const lost = [];

        // Calculate drop rate based on floor depth
        const dropRate = Math.max(0.3, config.baseDropRate - (floor - 1) * config.floorPenalty);

        // Process each item
        inventory.forEach(item => {
            // Rare items have better protection
            const isRare = ['rare', 'epic', 'legendary'].includes(item.rarity);
            const itemDropChance = isRare ?
                Math.max(dropRate, config.rareItemProtection) :
                dropRate;

            if (Math.random() < itemDropChance) {
                dropped.push({ ...item });
            } else {
                lost.push({ ...item });
            }
        });

        // Calculate gold drop
        const droppedGold = Math.floor(gold * config.goldDropRate);
        const lostGold = gold - droppedGold;

        return { dropped, lost, droppedGold, lostGold };
    },

    // ========================================================================
    // RESCUE RUN
    // ========================================================================

    /**
     * Check if rescue run is available
     * @returns {boolean}
     */
    canAttemptRescue() {
        return persistentState?.rescue?.hasDroppedItems || false;
    },

    /**
     * Get rescue run info
     * @returns {Object|null}
     */
    getRescueInfo() {
        if (!this.canAttemptRescue()) return null;

        const rescue = persistentState.rescue;
        const config = typeof RESCUE_CONFIG !== 'undefined' ?
            RESCUE_CONFIG : {
                maxRescueAttempts: 3,
                rescueDecayRate: 0.1  // 10% items lost per attempt
            };

        // Calculate time since death
        const hoursSinceDeath = (Date.now() - rescue.deathTimestamp) / (1000 * 60 * 60);

        return {
            floor: rescue.deathFloor,
            room: rescue.deathRoom,
            items: rescue.droppedItems,
            gold: rescue.droppedGold,
            attempts: rescue.rescueAttempts,
            maxAttempts: config.maxRescueAttempts,
            attemptsRemaining: config.maxRescueAttempts - rescue.rescueAttempts,
            hoursSinceDeath,
            decayWarning: hoursSinceDeath > 24 ? 'Items are decaying!' : null
        };
    },

    /**
     * Start a rescue run
     * @returns {Object} Run setup data
     */
    startRescueRun() {
        if (!this.canAttemptRescue()) {
            return { success: false, reason: 'No items to rescue' };
        }

        const rescue = persistentState.rescue;
        rescue.rescueAttempts++;

        console.log(`[RescueSystem] Starting rescue run #${rescue.rescueAttempts} to Floor ${rescue.deathFloor}`);

        return {
            success: true,
            targetFloor: rescue.deathFloor,
            targetRoom: rescue.deathRoom,
            isRescueRun: true,
            attempt: rescue.rescueAttempts
        };
    },

    /**
     * Check if current room contains rescue items
     * @param {number} floor
     * @param {Object} room
     * @returns {boolean}
     */
    isRescueLocation(floor, room) {
        if (!this.canAttemptRescue()) return false;

        const rescue = persistentState.rescue;
        return rescue.deathFloor === floor &&
               rescue.deathRoom?.x === room?.x &&
               rescue.deathRoom?.y === room?.y;
    },

    /**
     * Collect rescued items
     * @returns {Object} { items, gold, success }
     */
    collectRescuedItems() {
        if (!this.canAttemptRescue()) {
            return { success: false, items: [], gold: 0 };
        }

        const rescue = persistentState.rescue;
        const items = [...rescue.droppedItems];
        const gold = rescue.droppedGold;

        // Update stats
        rescue.totalItemsRecovered += items.length;

        // Clear rescue data
        this._clearRescue();

        console.log(`[RescueSystem] Rescued ${items.length} items and ${gold} gold!`);

        if (typeof addMessage === 'function') {
            addMessage(`Recovered ${items.length} items and ${gold} gold!`, 'success');
        }

        return { success: true, items, gold };
    },

    /**
     * Handle failed rescue attempt (death during rescue)
     * @returns {Object} Updated rescue status
     */
    onRescueRunFailed() {
        if (!persistentState?.rescue?.hasDroppedItems) return null;

        const config = typeof RESCUE_CONFIG !== 'undefined' ?
            RESCUE_CONFIG : {
                maxRescueAttempts: 3,
                rescueDecayRate: 0.1
            };

        const rescue = persistentState.rescue;

        // Check if out of attempts
        if (rescue.rescueAttempts >= config.maxRescueAttempts) {
            // Items permanently lost
            const lostCount = rescue.droppedItems.length;
            this._clearRescue();

            console.log(`[RescueSystem] All rescue attempts failed. ${lostCount} items permanently lost.`);

            if (typeof addMessage === 'function') {
                addMessage('Your dropped items have been lost forever...', 'danger');
            }

            return {
                itemsLost: true,
                permanentLoss: true,
                lostCount
            };
        }

        // Decay some items
        const decayCount = Math.ceil(rescue.droppedItems.length * config.rescueDecayRate);
        for (let i = 0; i < decayCount && rescue.droppedItems.length > 0; i++) {
            // Remove random item (prefer common items)
            const commonIdx = rescue.droppedItems.findIndex(item =>
                item.rarity === 'common' || item.rarity === 'uncommon'
            );
            const removeIdx = commonIdx >= 0 ? commonIdx : 0;
            rescue.droppedItems.splice(removeIdx, 1);
        }

        // Decay some gold
        rescue.droppedGold = Math.floor(rescue.droppedGold * (1 - config.rescueDecayRate));

        console.log(`[RescueSystem] Rescue failed. ${decayCount} items decayed. ${rescue.rescueAttempts}/${config.maxRescueAttempts} attempts used.`);

        return {
            itemsLost: true,
            permanentLoss: false,
            decayedCount: decayCount,
            remainingItems: rescue.droppedItems.length,
            remainingGold: rescue.droppedGold,
            attemptsRemaining: config.maxRescueAttempts - rescue.rescueAttempts
        };
    },

    /**
     * Clear rescue data
     * @private
     */
    _clearRescue() {
        if (!persistentState?.rescue) return;

        persistentState.rescue.hasDroppedItems = false;
        persistentState.rescue.droppedItems = [];
        persistentState.rescue.droppedGold = 0;
        persistentState.rescue.deathFloor = null;
        persistentState.rescue.deathRoom = null;
        persistentState.rescue.deathTimestamp = null;
        persistentState.rescue.rescueAttempts = 0;
    },

    // ========================================================================
    // RESCUE MARKER RENDERING
    // ========================================================================

    /**
     * Get rescue marker for minimap
     * @returns {Object|null} { floor, x, y, type }
     */
    getRescueMarker() {
        if (!this.canAttemptRescue()) return null;

        const rescue = persistentState.rescue;
        return {
            floor: rescue.deathFloor,
            x: rescue.deathRoom?.x,
            y: rescue.deathRoom?.y,
            type: 'rescue',
            pulsing: true
        };
    },

    /**
     * Create corpse entity for rescue location
     * @returns {Object|null} Entity data
     */
    createCorpseEntity() {
        if (!this.canAttemptRescue()) return null;

        const rescue = persistentState.rescue;
        const itemCount = rescue.droppedItems.length;

        return {
            type: 'corpse',
            name: 'Your Corpse',
            description: `Contains ${itemCount} items and ${rescue.droppedGold} gold`,
            floor: rescue.deathFloor,
            position: rescue.deathRoom,
            interactive: true,
            sprite: 'corpse',
            glow: true,
            onInteract: () => this.collectRescuedItems()
        };
    },

    // ========================================================================
    // QUERIES
    // ========================================================================

    /**
     * Get rescue statistics
     * @returns {Object}
     */
    getStats() {
        const rescue = persistentState?.rescue || {};
        return {
            totalItemsLost: rescue.totalItemsLost || 0,
            totalItemsRecovered: rescue.totalItemsRecovered || 0,
            recoveryRate: rescue.totalItemsLost > 0 ?
                (rescue.totalItemsRecovered / (rescue.totalItemsRecovered + rescue.totalItemsLost)) : 1,
            currentRescuePending: rescue.hasDroppedItems || false
        };
    },

    /**
     * Abandon rescue (give up on items)
     * @returns {Object} What was lost
     */
    abandonRescue() {
        if (!this.canAttemptRescue()) {
            return { success: false };
        }

        const rescue = persistentState.rescue;
        const lostItems = [...rescue.droppedItems];
        const lostGold = rescue.droppedGold;

        this._clearRescue();

        console.log(`[RescueSystem] Rescue abandoned. Lost ${lostItems.length} items and ${lostGold} gold.`);

        return {
            success: true,
            lostItems,
            lostGold
        };
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.RescueSystem = RescueSystem;
// Note: RESCUE_CONFIG is defined in constants.js

console.log('[RescueSystem] Rescue system loaded');
