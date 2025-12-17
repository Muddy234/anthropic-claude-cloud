// === js/systems/shortcut-system.js ===
// SURVIVAL EXTRACTION UPDATE: Floor shortcuts management

// ============================================================================
// SHORTCUT SYSTEM
// ============================================================================

const ShortcutSystem = {

    // Shortcut definitions
    SHORTCUTS: [
        { id: 'shortcut_f2', fromFloor: 1, toFloor: 2, guardianFloor: 1, cost: 0 },
        { id: 'shortcut_f3', fromFloor: 2, toFloor: 3, guardianFloor: 2, cost: 0 },
        { id: 'shortcut_f4', fromFloor: 3, toFloor: 4, guardianFloor: 3, cost: 0 },
        { id: 'shortcut_f5', fromFloor: 4, toFloor: 5, guardianFloor: 4, cost: 0 },
        { id: 'shortcut_f6', fromFloor: 5, toFloor: 6, guardianFloor: 5, cost: 0 }
    ],

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize shortcuts in persistent state
     */
    init() {
        if (typeof persistentState !== 'undefined' && !persistentState.shortcuts) {
            persistentState.shortcuts = this.SHORTCUTS.map(s => ({
                ...s,
                unlocked: false,
                unlockDate: null,
                timesUsed: 0
            }));
        }

        console.log('[ShortcutSystem] Initialized');
    },

    // ========================================================================
    // SHORTCUT MANAGEMENT
    // ========================================================================

    /**
     * Unlock a shortcut by defeating its guardian
     * @param {number} guardianFloor - Floor of defeated guardian
     * @returns {Object|null} Unlocked shortcut or null
     */
    unlockByGuardian(guardianFloor) {
        if (!persistentState?.shortcuts) return null;

        const shortcut = persistentState.shortcuts.find(
            s => s.guardianFloor === guardianFloor && !s.unlocked
        );

        if (shortcut) {
            shortcut.unlocked = true;
            shortcut.unlockDate = Date.now();

            console.log(`[ShortcutSystem] Unlocked shortcut to Floor ${shortcut.toFloor}`);

            if (typeof addMessage === 'function') {
                addMessage(`Shortcut to Floor ${shortcut.toFloor} unlocked!`, 'success');
            }

            // Track in stats
            if (persistentState.stats) {
                persistentState.stats.shortcutsUnlocked =
                    (persistentState.stats.shortcutsUnlocked || 0) + 1;
            }

            return shortcut;
        }

        return null;
    },

    /**
     * Use a shortcut (track usage)
     * @param {string} shortcutId
     * @returns {boolean} Success
     */
    useShortcut(shortcutId) {
        if (!persistentState?.shortcuts) return false;

        const shortcut = persistentState.shortcuts.find(s => s.id === shortcutId);
        if (shortcut && shortcut.unlocked) {
            shortcut.timesUsed++;
            console.log(`[ShortcutSystem] Used shortcut to Floor ${shortcut.toFloor}`);
            return true;
        }

        return false;
    },

    // ========================================================================
    // QUERIES
    // ========================================================================

    /**
     * Get all unlocked shortcuts
     * @returns {Array}
     */
    getUnlocked() {
        return (persistentState?.shortcuts || []).filter(s => s.unlocked);
    },

    /**
     * Get available starting floors
     * @returns {Array} Array of floor numbers
     */
    getAvailableStartingFloors() {
        const floors = [1];  // Floor 1 always available

        const unlocked = this.getUnlocked();
        unlocked.forEach(s => {
            if (!floors.includes(s.toFloor)) {
                floors.push(s.toFloor);
            }
        });

        return floors.sort((a, b) => a - b);
    },

    /**
     * Check if shortcut to floor is unlocked
     * @param {number} floor
     * @returns {boolean}
     */
    isFloorUnlocked(floor) {
        if (floor === 1) return true;
        return (persistentState?.shortcuts || []).some(
            s => s.toFloor === floor && s.unlocked
        );
    },

    /**
     * Get shortcut by target floor
     * @param {number} toFloor
     * @returns {Object|null}
     */
    getShortcutToFloor(toFloor) {
        return (persistentState?.shortcuts || []).find(s => s.toFloor === toFloor) || null;
    },

    /**
     * Get next shortcut to unlock
     * @returns {Object|null}
     */
    getNextToUnlock() {
        return (persistentState?.shortcuts || []).find(s => !s.unlocked) || null;
    },

    /**
     * Get shortcut status summary
     * @returns {Object}
     */
    getStatus() {
        const shortcuts = persistentState?.shortcuts || [];
        const unlocked = shortcuts.filter(s => s.unlocked);

        return {
            total: shortcuts.length,
            unlocked: unlocked.length,
            locked: shortcuts.length - unlocked.length,
            maxFloor: unlocked.length > 0 ?
                Math.max(...unlocked.map(s => s.toFloor)) : 1,
            nextGuardian: this.getNextToUnlock()?.guardianFloor || null
        };
    },

    /**
     * Calculate loot penalty for using shortcut
     * @param {number} startFloor - Starting floor
     * @returns {Object} { skippedFloors, lootPenalty }
     */
    calculateLootPenalty(startFloor) {
        const skippedFloors = startFloor - 1;
        // Each skipped floor means missing that floor's loot
        // This is a natural penalty - no artificial reduction
        return {
            skippedFloors,
            lootPenalty: `Missing loot from floors 1-${skippedFloors}`,
            recommendation: skippedFloors > 2 ?
                'Consider starting lower for more materials' : null
        };
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.ShortcutSystem = ShortcutSystem;

console.log('[ShortcutSystem] Shortcut system loaded');
