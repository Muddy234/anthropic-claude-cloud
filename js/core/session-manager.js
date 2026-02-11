// === js/core/session-manager.js ===
// SURVIVAL EXTRACTION UPDATE: Manages run lifecycle

/**
 * SESSION MANAGER - Run Lifecycle Management
 *
 * INVENTORY AUTHORITY: game.player.inventory is the authoritative source
 * during active gameplay. This manager syncs from game.player.inventory
 * when needed for saves, extraction, and death drops.
 *
 * See game-state.js for full state authority documentation.
 */

// ============================================================================
// SESSION MANAGER
// ============================================================================

const SessionManager = {

    // ========================================================================
    // RUN LIFECYCLE
    // ========================================================================

    /**
     * Start a new dungeon run
     * @param {number} startFloor - Floor to start on (default 1, or shortcut)
     * @param {Array} loadout - Items to bring (from bank selection)
     * @param {number} gold - Gold to bring
     * @returns {Object} Run info
     */
    startRun(startFloor = 1, loadout = [], gold = 0) {
        // Reset session state
        resetSessionState();

        // Configure run
        sessionState.active = true;
        sessionState.runId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        sessionState.startTime = Date.now();
        sessionState.startFloor = startFloor;
        sessionState.currentFloor = startFloor;
        sessionState.floorStartTime = Date.now();

        // Apply loadout - ensure it's an array
        const items = Array.isArray(loadout) ? loadout : [];
        sessionState.inventory = items.map(item => ({ ...item }));
        sessionState.gold = gold || 0;

        // Check for rescue run
        if (persistentState.deathDrop && persistentState.deathDrop.floor) {
            sessionState.isRescueRun = true;
            console.log('[SessionManager] This is a rescue run - death drop awaits!');
        }

        // Update stats
        persistentState.stats.totalRuns++;
        persistentState.lastPlayed = Date.now();

        console.log(`[SessionManager] Starting run #${persistentState.stats.totalRuns} from floor ${startFloor}`);
        console.log(`[SessionManager] Carrying ${items.length} items and ${sessionState.gold} gold`);

        return {
            runId: sessionState.runId,
            floor: startFloor,
            isRescueRun: sessionState.isRescueRun
        };
    },

    /**
     * Successfully extract from dungeon
     * @returns {Object} Extraction result
     */
    extractionSuccess() {
        // Check for active session - be forgiving if game is clearly in dungeon
        if (!sessionState.active) {
            // Fallback: if we're in playing state with a player, assume session is active
            if (game.state === 'playing' || game.state === 'extraction' ||
                game.state === GAME_STATES?.PLAYING || game.state === GAME_STATES?.EXTRACTION) {
                console.log('[SessionManager] Session flag not set, but game is active - proceeding with extraction');
                sessionState.active = true;  // Fix the state
            } else {
                console.warn('[SessionManager] No active session to extract from');
                console.warn('[SessionManager] sessionState:', JSON.stringify({
                    active: sessionState.active,
                    currentFloor: sessionState.currentFloor,
                    inventory: sessionState.inventory?.length
                }));
                console.warn('[SessionManager] game.state:', game.state);
                return { success: false, reason: 'No active session' };
            }
        }

        const floor = sessionState.currentFloor;

        // Use game.player.inventory as the authoritative source (items are added there during gameplay)
        const playerInventory = game.player?.inventory || [];
        const itemCount = playerInventory.length;
        const goldAmount = game.player?.gold || sessionState.gold || 0;

        console.log(`[SessionManager] Extraction from floor ${floor}!`);
        console.log(`[SessionManager] Extracting ${itemCount} items and ${goldAmount} gold`);

        // Transfer player inventory to bank (this is where items actually are)
        playerInventory.forEach(item => {
            if (typeof BankingSystem !== 'undefined') {
                BankingSystem.deposit(item);
            } else {
                // Fallback if BankingSystem not loaded yet
                persistentState.bank.items.push(item);
                persistentState.bank.usedSlots++;
            }
        });

        // Transfer gold to bank
        if (typeof BankingSystem !== 'undefined') {
            BankingSystem.depositGold(goldAmount);
        } else {
            persistentState.bank.gold += goldAmount;
        }

        // Update extraction stats
        persistentState.stats.successfulExtractions++;
        persistentState.stats.totalGoldExtracted += goldAmount;

        // Count materials extracted (from authoritative source)
        const materialCount = playerInventory.filter(i => i.type === 'material').length;
        persistentState.stats.totalMaterialsExtracted += materialCount;

        // Unlock shortcut if first extraction from this floor
        if (!persistentState.shortcuts.unlockedFloors.includes(floor)) {
            persistentState.shortcuts.unlockedFloors.push(floor);
            persistentState.shortcuts.unlockedFloors.sort((a, b) => a - b);
            console.log(`[SessionManager] Shortcut to floor ${floor} unlocked!`);
        }

        // Track extractions for degradation
        if (!persistentState.shortcuts.extractedFrom[floor]) {
            persistentState.shortcuts.extractedFrom[floor] = 0;
        }
        persistentState.shortcuts.extractedFrom[floor]++;

        // Apply floor degradation
        this._applyDegradation(floor);

        // Update deepest floor
        if (floor > persistentState.stats.deepestFloor) {
            persistentState.stats.deepestFloor = floor;
            this._checkVillageDegradation(floor);
        }

        // Clear death drop if this was a rescue run
        if (sessionState.isRescueRun && sessionState.deathDropCollected) {
            persistentState.deathDrop = null;
            console.log('[SessionManager] Death drop recovered via rescue run!');
        }

        // End session
        sessionState.active = false;

        // Save game
        if (typeof SaveManager !== 'undefined') {
            SaveManager.save(persistentState.saveSlot);
        }

        return {
            success: true,
            floor,
            itemsExtracted: itemCount,
            goldExtracted: goldAmount,
            shortcutUnlocked: !persistentState.shortcuts.unlockedFloors.includes(floor)
        };
    },

    /**
     * Descend to the next floor
     * @returns {Object} Descent result
     */
    descendToNextFloor() {
        if (!sessionState.active) {
            console.warn('[SessionManager] No active session');
            return { success: false, reason: 'No active session' };
        }

        const currentFloor = sessionState.currentFloor;
        const nextFloor = currentFloor + 1;

        // Check if Core/Malphas (Floor 10 - end of game)
        if (nextFloor > 9) {
            console.log('[SessionManager] Descending to The Heart of the World!');
            sessionState.currentFloor = 10;  // Floor 10 = Malphas
        } else {
            sessionState.currentFloor = nextFloor;
        }

        // Update deepest floor stat
        if (typeof nextFloor === 'number' && nextFloor > persistentState.stats.deepestFloor) {
            persistentState.stats.deepestFloor = nextFloor;
            this._checkVillageDegradation(nextFloor);
        }

        // THE BLEEDING EARTH: Check floor entry progression (triggers ENDGAME on Floor 10)
        if (typeof WorldStateSystem !== 'undefined') {
            WorldStateSystem.checkFloorEntryProgression(sessionState.currentFloor);
        }

        // Reset floor-specific session data
        sessionState.floorTime = 0;
        sessionState.floorStartTime = Date.now();
        sessionState.miniBossDefeated = false;
        sessionState.miniBossPosition = null;
        sessionState.pathDown = {
            x: null,
            y: null,
            discovered: false,
            revealed: false
        };
        sessionState.extractionPoints = [];
        sessionState.collapseQueue = [];

        // Auto-save
        if (typeof SaveManager !== 'undefined') {
            SaveManager.autoSave();
        }

        console.log(`[SessionManager] Descended to floor ${sessionState.currentFloor}`);

        return {
            success: true,
            previousFloor: currentFloor,
            currentFloor: sessionState.currentFloor
        };
    },

    /**
     * Handle player death
     * @param {number} deathX - X position of death
     * @param {number} deathY - Y position of death
     * @returns {Object} Death result
     */
    playerDeath(deathX, deathY) {
        if (!sessionState.active) {
            console.warn('[SessionManager] No active session');
            return { success: false };
        }

        const floor = sessionState.currentFloor;

        // Use game.player.inventory as authoritative source (fix for Issue #3)
        // Fall back to sessionState.inventory only if game.player doesn't exist
        const playerInventory = game.player?.inventory || sessionState.inventory || [];
        const playerGold = game.player?.gold ?? sessionState.gold ?? 0;

        const hadItems = playerInventory.length > 0;
        const hadGold = playerGold > 0;
        const wasRescueRun = sessionState.isRescueRun;

        console.log(`[SessionManager] Player died on floor ${floor}`);
        console.log(`[SessionManager] Had ${playerInventory.length} items and ${playerGold} gold`);

        // Create death drop if carrying anything AND not already a rescue run
        if ((hadItems || hadGold) && !wasRescueRun) {
            persistentState.deathDrop = {
                floor: floor,
                x: deathX,
                y: deathY,
                items: playerInventory.map(i => ({ ...i })),
                gold: playerGold,
                timestamp: Date.now()
            };
            console.log('[SessionManager] Death drop created. Next run can recover items.');
        } else if (wasRescueRun && (hadItems || hadGold)) {
            // Failed rescue run - items lost forever
            persistentState.deathDrop = null;
            console.log('[SessionManager] Rescue run failed! Items lost permanently.');
        }

        // Update stats
        persistentState.stats.deaths++;

        // End session
        sessionState.active = false;

        // Save game
        if (typeof SaveManager !== 'undefined') {
            SaveManager.save(persistentState.saveSlot);
        }

        return {
            success: true,
            floor,
            itemsDropped: hadItems || hadGold,
            rescuePossible: !wasRescueRun && (hadItems || hadGold),
            wasRescueRun,
            itemsLostPermanently: wasRescueRun && (hadItems || hadGold)
        };
    },

    // ========================================================================
    // DEATH DROP RECOVERY
    // ========================================================================

    /**
     * Check if there's a death drop to recover
     * @returns {boolean}
     */
    hasDeathDrop() {
        return persistentState.deathDrop !== null;
    },

    /**
     * Get death drop information
     * @returns {Object|null}
     */
    getDeathDropInfo() {
        if (!persistentState.deathDrop) return null;

        return {
            floor: persistentState.deathDrop.floor,
            x: persistentState.deathDrop.x,
            y: persistentState.deathDrop.y,
            itemCount: persistentState.deathDrop.items.length,
            gold: persistentState.deathDrop.gold,
            timestamp: persistentState.deathDrop.timestamp
        };
    },

    /**
     * Recover death drop (player reached the drop location)
     * @returns {Object} Recovery result
     */
    recoverDeathDrop() {
        if (!persistentState.deathDrop) {
            return { success: false, reason: 'No death drop' };
        }

        if (!sessionState.active || !sessionState.isRescueRun) {
            return { success: false, reason: 'Not in rescue run' };
        }

        // Add items to game.player.inventory (authoritative) if available, else sessionState
        const targetInventory = game.player?.inventory || sessionState.inventory;

        persistentState.deathDrop.items.forEach(item => {
            if (game.player?.inventory) {
                game.player.inventory.push({ ...item });
            }
            // Also sync to sessionState for save compatibility
            sessionState.inventory.push({ ...item });
        });

        // Add gold to game.player (authoritative) and sync to sessionState
        const recoveredGold = persistentState.deathDrop.gold;
        if (game.player) {
            game.player.gold = (game.player.gold || 0) + recoveredGold;
        }
        sessionState.gold += recoveredGold;

        const recovered = {
            items: persistentState.deathDrop.items.length,
            gold: recoveredGold
        };

        // Mark as collected (cleared on successful extraction)
        sessionState.deathDropCollected = true;

        console.log(`[SessionManager] Recovered death drop: ${recovered.items} items, ${recovered.gold} gold`);

        return {
            success: true,
            ...recovered
        };
    },

    // ========================================================================
    // MINI-BOSS
    // ========================================================================

    /**
     * Record mini-boss defeat
     */
    miniBossDefeated() {
        sessionState.miniBossDefeated = true;
        persistentState.stats.miniBossesDefeated++;

        // Reveal path down on map
        if (sessionState.pathDown.x !== null) {
            sessionState.pathDown.revealed = true;
            console.log('[SessionManager] Mini-boss defeated! Path down revealed on map.');
        }
    },

    /**
     * Discover the path down (player walked over it)
     * @param {number} x
     * @param {number} y
     */
    discoverPathDown(x, y) {
        sessionState.pathDown.x = x;
        sessionState.pathDown.y = y;
        sessionState.pathDown.discovered = true;

        // If mini-boss already defeated, also reveal on map
        if (sessionState.miniBossDefeated) {
            sessionState.pathDown.revealed = true;
        }

        console.log(`[SessionManager] Path down discovered at (${x}, ${y})`);
    },

    // ========================================================================
    // CORE (Final Boss)
    // ========================================================================

    /**
     * Handle Core completion (game victory)
     * @returns {Object} Victory result
     */
    coreCompleted() {
        if (!sessionState.active) {
            return { success: false };
        }

        console.log('[SessionManager] THE CORE HAS BEEN DEFEATED!');

        // Mark game as completed
        persistentState.stats.coreDefeated = true;

        // Use game.player.inventory as authoritative source
        const playerInventory = game.player?.inventory || sessionState.inventory || [];
        const playerGold = game.player?.gold ?? sessionState.gold ?? 0;

        // Transfer all items to bank
        playerInventory.forEach(item => {
            if (typeof BankingSystem !== 'undefined') {
                BankingSystem.deposit(item);
            } else {
                persistentState.bank.items.push(item);
            }
        });

        if (typeof BankingSystem !== 'undefined') {
            BankingSystem.depositGold(playerGold);
        } else {
            persistentState.bank.gold += playerGold;
        }

        // Reset village degradation (the world is saved!)
        persistentState.village.degradationStage = 1;

        // End session
        sessionState.active = false;

        // Save
        if (typeof SaveManager !== 'undefined') {
            SaveManager.save(persistentState.saveSlot);
        }

        return {
            success: true,
            totalRuns: persistentState.stats.totalRuns,
            totalDeaths: persistentState.stats.deaths,
            playtime: persistentState.stats.playtime
        };
    },

    // ========================================================================
    // UTILITY METHODS
    // ========================================================================

    /**
     * Get current run status
     * @returns {Object}
     */
    getRunStatus() {
        // Use authoritative source for inventory/gold counts
        const playerInventory = game.player?.inventory || sessionState.inventory || [];
        const playerGold = game.player?.gold ?? sessionState.gold ?? 0;

        return {
            active: sessionState.active,
            runId: sessionState.runId,
            floor: sessionState.currentFloor,
            floorTime: sessionState.floorTime,
            inventoryCount: playerInventory.length,
            gold: playerGold,
            isRescueRun: sessionState.isRescueRun,
            miniBossDefeated: sessionState.miniBossDefeated,
            pathDownDiscovered: sessionState.pathDown.discovered
        };
    },

    /**
     * Add item to player inventory (authoritative: game.player.inventory)
     * @param {Object} item
     */
    addToInventory(item) {
        if (!sessionState.active) return false;

        // Prefer game.player.inventory as authoritative
        const targetInventory = game.player?.inventory || sessionState.inventory;

        // Check for stackable
        if (item.stackable || item.type === 'material') {
            const existing = targetInventory.find(i => i.id === item.id);
            if (existing) {
                existing.count = (existing.count || 1) + (item.count || 1);
                return true;
            }
        }

        targetInventory.push({ ...item });

        // Also sync to sessionState if we used game.player.inventory
        if (game.player?.inventory && targetInventory !== sessionState.inventory) {
            if (item.stackable || item.type === 'material') {
                const existing = sessionState.inventory.find(i => i.id === item.id);
                if (existing) {
                    existing.count = (existing.count || 1) + (item.count || 1);
                } else {
                    sessionState.inventory.push({ ...item });
                }
            } else {
                sessionState.inventory.push({ ...item });
            }
        }

        return true;
    },

    /**
     * Add gold to player (authoritative: game.player.gold)
     * @param {number} amount
     */
    addGold(amount) {
        if (!sessionState.active) return;

        // Update authoritative source
        if (game.player) {
            game.player.gold = (game.player.gold || 0) + amount;
        }

        // Also sync to sessionState
        sessionState.gold += amount;
    },

    /**
     * Sync session state from game state
     * Call before saves to ensure sessionState reflects current gameplay
     */
    syncFromGame() {
        if (typeof syncSessionFromGame === 'function') {
            syncSessionFromGame();
        } else if (game.player) {
            // Fallback sync
            sessionState.inventory = (game.player.inventory || []).map(item => ({ ...item }));
            sessionState.gold = game.player.gold || 0;
            sessionState.currentFloor = game.floor || sessionState.currentFloor;
        }
    },

    // ========================================================================
    // PRIVATE METHODS
    // ========================================================================

    /**
     * Apply degradation after extraction
     * @param {number} floor
     * @private
     */
    _applyDegradation(floor) {
        // Degrade this floor and all below
        for (let f = 1; f <= floor; f++) {
            if (!persistentState.degradation.floorMultipliers[f]) {
                persistentState.degradation.floorMultipliers[f] = 1.0;
            }

            const current = persistentState.degradation.floorMultipliers[f];
            const reduction = DEGRADATION_CONFIG ? DEGRADATION_CONFIG.stepReduction : 0.15;
            const minimum = DEGRADATION_CONFIG ? DEGRADATION_CONFIG.minimum : 0.40;

            persistentState.degradation.floorMultipliers[f] = Math.max(minimum, current - reduction);
        }

        console.log('[SessionManager] Floor degradation applied');
    },

    /**
     * Check and update village degradation based on deepest floor
     * @param {number} floor
     * @private
     */
    _checkVillageDegradation(floor) {
        let newStage = 1;

        if (DEGRADATION_CONFIG && DEGRADATION_CONFIG.stages) {
            for (const [stage, config] of Object.entries(DEGRADATION_CONFIG.stages)) {
                if (config.floors.includes(floor) ||
                    (floor >= Math.min(...config.floors.filter(f => typeof f === 'number')))) {
                    newStage = Math.max(newStage, parseInt(stage));
                }
            }
        } else {
            // Fallback logic
            if (floor >= 5) newStage = 3;
            else if (floor >= 3) newStage = 2;
        }

        if (newStage > persistentState.village.degradationStage) {
            persistentState.village.degradationStage = newStage;
            console.log(`[SessionManager] Village degradation advanced to stage ${newStage}`);
        }
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.SessionManager = SessionManager;

console.log('[SessionManager] Session management initialized');
