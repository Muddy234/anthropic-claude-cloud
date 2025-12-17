// === js/systems/survival-integration.js ===
// SURVIVAL EXTRACTION UPDATE: Integration layer connecting all survival systems

// ============================================================================
// SURVIVAL INTEGRATION SYSTEM
// ============================================================================

const SurvivalIntegration = {
    name: 'SurvivalIntegration',
    priority: 1,  // Runs first to set up state

    initialized: false,

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize all survival systems
     */
    init() {
        console.log('[SurvivalIntegration] Initializing survival systems...');

        // Initialize persistent state if needed
        this._initPersistentState();

        // Initialize session state
        this._initSessionState();

        // Initialize all survival sub-systems
        this._initSubSystems();

        this.initialized = true;
        console.log('[SurvivalIntegration] All survival systems initialized');
    },

    /**
     * Initialize persistent state structure
     * @private
     */
    _initPersistentState() {
        if (typeof persistentState === 'undefined') {
            window.persistentState = {};
        }

        // Ensure all required fields exist
        const defaults = {
            bank: {
                gold: 100,  // Starting gold
                items: [],
                maxItems: 50
            },
            stats: {
                totalRuns: 0,
                successfulExtractions: 0,
                totalDeaths: 0,
                deepestFloor: 1,
                totalGoldEarned: 0,
                totalItemsCollected: 0,
                guardiansDefeated: 0,
                playTime: 0
            },
            village: {
                degradationLevel: 0,
                degradationProgress: 0
            },
            shortcuts: [],
            quests: {
                active: [],
                completed: [],
                lastCompletion: {}
            },
            crafting: {
                unlockedRecipes: [],
                craftedItems: {},
                craftedUniques: [],
                totalCrafted: 0,
                favoriteRecipes: []
            },
            guardiansDefeated: [],
            floorDegradation: {},
            rescue: {
                hasDroppedItems: false,
                droppedItems: [],
                droppedGold: 0,
                deathFloor: null
            },
            coreDefeated: false,
            newGamePlusUnlocked: false,
            firstTimePlayed: Date.now()
        };

        // Merge with existing state
        Object.keys(defaults).forEach(key => {
            if (!persistentState[key]) {
                persistentState[key] = defaults[key];
            }
        });

        // Initialize floor degradation for floors 1-6
        for (let i = 1; i <= 6; i++) {
            if (!persistentState.floorDegradation[i]) {
                persistentState.floorDegradation[i] = {
                    extractionCount: 0,
                    qualityMultiplier: 1.0
                };
            }
        }
    },

    /**
     * Initialize session state
     * @private
     */
    _initSessionState() {
        if (typeof sessionState === 'undefined') {
            window.sessionState = {};
        }

        // Session defaults
        const sessionDefaults = {
            runActive: false,
            currentFloor: 1,
            startingFloor: 1,
            inventory: [],
            goldCollected: 0,
            floorsVisited: [],
            enemiesKilled: 0,
            bossesKilled: 0,
            runStartTime: null,
            loadout: {
                weapon: null,
                armor: null,
                consumables: []
            },
            isRescueRun: false
        };

        Object.keys(sessionDefaults).forEach(key => {
            if (sessionState[key] === undefined) {
                sessionState[key] = sessionDefaults[key];
            }
        });
    },

    /**
     * Initialize sub-systems
     * @private
     */
    _initSubSystems() {
        // Initialize systems that don't require game state
        // Note: ExtractionSystem is initialized per-floor in startRun()
        const systems = [
            'BankingSystem',
            'ShortcutSystem',
            'DegradationSystem',
            'RescueSystem',
            'QuestSystem',
            'CraftingSystem',
            'CoreSystem'
            // ExtractionSystem - initialized when floor is generated
            // LoadoutSystem - initialized when UI opens
        ];

        systems.forEach(systemName => {
            if (typeof window[systemName] !== 'undefined' && typeof window[systemName].init === 'function') {
                try {
                    window[systemName].init();
                } catch (e) {
                    console.error(`[SurvivalIntegration] Failed to init ${systemName}:`, e);
                }
            }
        });
    },

    // ========================================================================
    // GAME FLOW
    // ========================================================================

    /**
     * Start a new run from village
     * @param {Object} options - { startingFloor, loadout, isRescueRun }
     * @returns {boolean} Success
     */
    startRun(options = {}) {
        const { startingFloor = 1, loadout = null, isRescueRun = false } = options;

        // Validate starting floor
        if (!ShortcutSystem.isFloorUnlocked(startingFloor)) {
            console.warn(`[SurvivalIntegration] Floor ${startingFloor} not unlocked`);
            return false;
        }

        // Set up session state - ensure both flags are set for compatibility
        sessionState.active = true;  // Used by SessionManager/ExtractionSystem
        sessionState.runActive = true;  // Legacy flag
        sessionState.currentFloor = startingFloor;
        sessionState.startFloor = startingFloor;
        sessionState.floorStartTime = Date.now();
        sessionState.inventory = [];
        sessionState.gold = 0;
        sessionState.floorsVisited = [startingFloor];
        sessionState.enemiesKilled = 0;
        sessionState.bossesKilled = 0;
        sessionState.runStartTime = Date.now();
        sessionState.isRescueRun = isRescueRun;

        // Apply loadout
        if (loadout) {
            sessionState.loadout = loadout;
            this._applyLoadout(loadout);
        }

        // Update stats
        persistentState.stats.totalRuns++;

        // Start rescue run if applicable
        if (isRescueRun && typeof RescueSystem !== 'undefined') {
            const rescueInfo = RescueSystem.startRescueRun();
            if (!rescueInfo.success) {
                sessionState.isRescueRun = false;
            }
        }

        console.log(`[SurvivalIntegration] Starting run on Floor ${startingFloor}`);

        // Generate floor
        if (typeof generateFloor === 'function') {
            generateFloor(startingFloor);
        }

        // Change game state
        if (typeof gameState !== 'undefined') {
            gameState.currentState = 'playing';
            gameState.currentFloor = startingFloor;
        }

        return true;
    },

    /**
     * Apply loadout to player
     * @param {Object} loadout
     * @private
     */
    _applyLoadout(loadout) {
        if (!gameState?.player) return;

        // Apply weapon
        if (loadout.weapon) {
            gameState.player.weapon = { ...loadout.weapon };
        }

        // Apply armor
        if (loadout.armor) {
            gameState.player.armor = { ...loadout.armor };
        }

        // Add consumables to inventory
        if (loadout.consumables) {
            loadout.consumables.forEach(item => {
                if (item) {
                    sessionState.inventory.push({ ...item });
                }
            });
        }
    },

    /**
     * Handle successful extraction
     * @param {number} floor - Floor extracted from
     */
    onExtraction(floor) {
        console.log(`[SurvivalIntegration] Extraction from Floor ${floor}`);

        // Update stats
        persistentState.stats.successfulExtractions++;
        if (floor > persistentState.stats.deepestFloor) {
            persistentState.stats.deepestFloor = floor;
        }

        // Deposit inventory to bank
        sessionState.inventory.forEach(item => {
            if (typeof BankingSystem !== 'undefined') {
                BankingSystem.deposit(item);
            }
        });

        // Deposit gold
        if (sessionState.goldCollected > 0) {
            if (typeof BankingSystem !== 'undefined') {
                BankingSystem.depositGold(sessionState.goldCollected);
            }
            persistentState.stats.totalGoldEarned += sessionState.goldCollected;
        }

        // Handle rescue item collection
        if (sessionState.isRescueRun && typeof RescueSystem !== 'undefined') {
            RescueSystem.collectRescuedItems();
        }

        // Update degradation
        if (typeof DegradationSystem !== 'undefined') {
            DegradationSystem.onExtractionSuccess(floor);
            DegradationSystem.onFloorExtracted(floor);
        }

        // Track quest progress
        if (typeof QuestSystem !== 'undefined') {
            QuestSystem.onExtraction(floor);
        }

        // THE BLEEDING EARTH: Check world state progression
        if (typeof WorldStateSystem !== 'undefined') {
            WorldStateSystem.checkExtractionProgression(floor);
        }

        // End run
        this._endRun(true);

        // Return to village
        this.returnToVillage();
    },

    /**
     * Handle player death
     * @param {number} floor - Floor died on
     * @param {Object} room - Room died in
     */
    onDeath(floor, room) {
        console.log(`[SurvivalIntegration] Death on Floor ${floor}`);

        // Update stats
        persistentState.stats.totalDeaths++;

        // Handle rescue system
        if (typeof RescueSystem !== 'undefined') {
            const deathData = {
                floor: floor,
                room: room,
                inventory: [...sessionState.inventory],
                gold: sessionState.goldCollected
            };

            if (sessionState.isRescueRun) {
                // Failed rescue attempt
                RescueSystem.onRescueRunFailed();
            } else {
                // Create rescue opportunity
                RescueSystem.onPlayerDeath(deathData);
            }
        }

        // Update degradation
        if (typeof DegradationSystem !== 'undefined') {
            DegradationSystem.onRunFailed();
        }

        // End run
        this._endRun(false);

        // Return to village after delay
        setTimeout(() => {
            this.returnToVillage();
        }, 3000);
    },

    /**
     * Handle floor guardian defeat
     * @param {number} floor
     */
    onGuardianDefeated(floor) {
        console.log(`[SurvivalIntegration] Guardian defeated on Floor ${floor}`);

        // Track in persistent state
        if (!persistentState.guardiansDefeated.includes(floor)) {
            persistentState.guardiansDefeated.push(floor);
            persistentState.stats.guardiansDefeated++;
        }

        // Unlock shortcut
        if (typeof ShortcutSystem !== 'undefined') {
            ShortcutSystem.unlockByGuardian(floor);
        }

        // Quest tracking
        if (typeof QuestSystem !== 'undefined') {
            QuestSystem.onGuardianDefeated(floor);
        }

        sessionState.bossesKilled++;
    },

    /**
     * Handle enemy killed
     * @param {Object} enemy
     * @param {number} floor
     */
    onEnemyKilled(enemy, floor) {
        sessionState.enemiesKilled++;

        // Quest tracking
        if (typeof QuestSystem !== 'undefined') {
            QuestSystem.onEnemyKilled(enemy.type || 'any', floor);
        }
    },

    /**
     * Handle item collected
     * @param {Object} item
     */
    onItemCollected(item) {
        sessionState.inventory.push(item);
        persistentState.stats.totalItemsCollected++;

        // Quest tracking
        if (typeof QuestSystem !== 'undefined') {
            QuestSystem.onItemCollected(item.id, item.count || 1);
        }
    },

    /**
     * Handle gold collected
     * @param {number} amount
     */
    onGoldCollected(amount) {
        sessionState.gold = (sessionState.gold || 0) + amount;  // Used by SessionManager
        sessionState.goldCollected = (sessionState.goldCollected || 0) + amount;  // Legacy
    },

    /**
     * Handle floor reached
     * @param {number} floor
     */
    onFloorReached(floor) {
        if (!sessionState.floorsVisited.includes(floor)) {
            sessionState.floorsVisited.push(floor);
        }

        sessionState.currentFloor = floor;

        // Quest tracking
        if (typeof QuestSystem !== 'undefined') {
            QuestSystem.onFloorReached(floor);
        }

        if (floor > persistentState.stats.deepestFloor) {
            persistentState.stats.deepestFloor = floor;
        }
    },

    /**
     * End current run
     * @param {boolean} success
     * @private
     */
    _endRun(success) {
        const runDuration = Date.now() - sessionState.runStartTime;
        persistentState.stats.playTime += runDuration;

        sessionState.active = false;  // Used by SessionManager/ExtractionSystem
        sessionState.runActive = false;  // Legacy flag

        // Clear session inventory (already deposited if success)
        if (!success) {
            sessionState.inventory = [];
            sessionState.gold = 0;
        }

        // Auto-save
        if (typeof SaveManager !== 'undefined') {
            SaveManager.autoSave();
        }
    },

    /**
     * Return to village hub
     */
    returnToVillage() {
        console.log('[SurvivalIntegration] Returning to village');

        if (typeof gameState !== 'undefined') {
            gameState.currentState = 'village';
        }

        if (typeof VillageSystem !== 'undefined') {
            VillageSystem.init();
        }
    },

    // ========================================================================
    // CORE ACCESS
    // ========================================================================

    /**
     * Enter The Core
     * @returns {boolean} Success
     */
    enterCore() {
        if (typeof CoreSystem !== 'undefined') {
            return CoreSystem.startEncounter();
        }
        return false;
    },

    // ========================================================================
    // QUERIES
    // ========================================================================

    /**
     * Get current run status
     * @returns {Object}
     */
    getRunStatus() {
        return {
            active: sessionState.runActive,
            floor: sessionState.currentFloor,
            startingFloor: sessionState.startingFloor,
            inventoryCount: sessionState.inventory.length,
            goldCollected: sessionState.goldCollected,
            floorsVisited: sessionState.floorsVisited.length,
            enemiesKilled: sessionState.enemiesKilled,
            bossesKilled: sessionState.bossesKilled,
            isRescueRun: sessionState.isRescueRun,
            duration: sessionState.runStartTime ?
                Date.now() - sessionState.runStartTime : 0
        };
    },

    /**
     * Get overall progress
     * @returns {Object}
     */
    getProgress() {
        return {
            totalRuns: persistentState.stats.totalRuns,
            successRate: persistentState.stats.totalRuns > 0 ?
                (persistentState.stats.successfulExtractions / persistentState.stats.totalRuns * 100).toFixed(1) : 0,
            deepestFloor: persistentState.stats.deepestFloor,
            guardiansDefeated: persistentState.guardiansDefeated.length,
            shortcutsUnlocked: ShortcutSystem?.getUnlocked?.().length || 0,
            questsCompleted: persistentState.quests.completed.length,
            coreDefeated: persistentState.coreDefeated,
            playTime: this._formatPlayTime(persistentState.stats.playTime)
        };
    },

    /**
     * Format play time
     * @param {number} ms
     * @returns {string}
     * @private
     */
    _formatPlayTime(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    },

    // ========================================================================
    // SYSTEM UPDATE
    // ========================================================================

    /**
     * Update integration system
     * @param {number} dt
     */
    update(dt) {
        // Track play time during active runs
        if (sessionState.runActive) {
            persistentState.stats.playTime += dt * 1000;
        }
    }
};

// ============================================================================
// REGISTER WITH SYSTEM MANAGER
// ============================================================================

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('SurvivalIntegration', SurvivalIntegration, 1);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.SurvivalIntegration = SurvivalIntegration;

console.log('[SurvivalIntegration] Survival integration system loaded');
