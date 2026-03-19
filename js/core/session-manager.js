// === js/core/session-manager.js ===
// PERMADEATH MODEL: Manages run lifecycle with true permadeath

/**
 * SESSION MANAGER - Run Lifecycle Management
 *
 * PERMADEATH: Death wipes ALL persistent state. No death drops,
 * no rescue runs, no extraction. You die, you start over completely.
 *
 * INVENTORY AUTHORITY: game.player.inventory is the authoritative source
 * during active gameplay. This manager syncs from game.player.inventory
 * when needed for saves.
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
     * @param {number} startFloor - Floor to start on (default 1)
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

        // Update stats
        persistentState.stats.totalRuns++;
        persistentState.lastPlayed = Date.now();

        console.log(`[SessionManager] Starting run #${persistentState.stats.totalRuns} from floor ${startFloor}`);
        console.log(`[SessionManager] Carrying ${items.length} items and ${sessionState.gold} gold`);

        return {
            runId: sessionState.runId,
            floor: startFloor
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
        }

        // THE BLEEDING EARTH: Check floor descent progression (triggers state changes at milestone floors)
        if (typeof WorldStateSystem !== 'undefined') {
            WorldStateSystem.checkFloorDescentProgression(sessionState.currentFloor);
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
     * Handle player death - TRUE PERMADEATH
     * All progress is wiped. No death drops, no rescue runs.
     * @param {number} deathX - X position of death
     * @param {number} deathY - Y position of death
     * @returns {Object} Death result
     */
    playerDeath(deathX, deathY) {
        const floor = sessionState.currentFloor || 1;

        console.log(`[SessionManager] PERMADEATH on floor ${floor} at (${deathX}, ${deathY})`);

        // End the active session
        sessionState.active = false;

        // Wipe ALL persistent state - true permadeath
        const fresh = createNewPersistentState();
        Object.keys(fresh).forEach(key => {
            persistentState[key] = fresh[key];
        });

        // Reset session state
        resetSessionState();

        // Clear saved data entirely
        if (typeof SaveManager !== 'undefined') {
            SaveManager.deleteSave();
        }

        return {
            success: true,
            floor,
            permadeath: true
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

        console.log('[SessionManager] THE CORE HAS BEEN DEFEATED! VICTORY!');

        // Mark game as completed
        persistentState.stats.coreDefeated = true;
        persistentState.stats.victories = (persistentState.stats.victories || 0) + 1;

        // End session
        sessionState.active = false;

        // Trigger victory state
        game.state = 'victory';

        return {
            success: true,
            victory: true
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

        // Track gold earned in runStats
        if (amount > 0 && typeof game !== 'undefined' && game.runStats) {
            game.runStats.goldEarned = (game.runStats.goldEarned || 0) + amount;
        }
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

};

// ============================================================================
// EXPORTS
// ============================================================================

window.SessionManager = SessionManager;

console.log('[SessionManager] Session management initialized');
