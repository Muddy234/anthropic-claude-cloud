// === js/core/save-manager.js ===
// SURVIVAL EXTRACTION UPDATE: Save/Load system with 3 slots

// ============================================================================
// SAVE MANAGER
// ============================================================================

const SaveManager = {
    storageKey: 'shifting_chasm_save',

    // ========================================================================
    // SAVE SLOT MANAGEMENT
    // ========================================================================

    /**
     * Get metadata for all save slots
     * @returns {Array} Array of save slot info objects
     */
    getSaveSlots() {
        const saves = [];
        const maxSlots = SAVE_CONFIG ? SAVE_CONFIG.maxSlots : 3;

        for (let i = 0; i < maxSlots; i++) {
            const data = localStorage.getItem(`${this.storageKey}_${i}`);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    saves.push({
                        slot: i,
                        exists: true,
                        lastPlayed: parsed.persistent.lastPlayed,
                        playtime: parsed.persistent.stats.playtime,
                        deepestFloor: parsed.persistent.stats.deepestFloor,
                        gold: parsed.persistent.bank.gold,
                        deaths: parsed.persistent.stats.deaths,
                        extractions: parsed.persistent.stats.successfulExtractions,
                        hasActiveRun: parsed.session && parsed.session.active,
                        version: parsed.version || 1
                    });
                } catch (e) {
                    console.error(`[SaveManager] Corrupted save in slot ${i}:`, e);
                    saves.push({ slot: i, exists: true, corrupted: true });
                }
            } else {
                saves.push({ slot: i, exists: false });
            }
        }

        return saves;
    },

    /**
     * Check if a save slot has data
     * @param {number} slot - Slot index (0-2)
     * @returns {boolean}
     */
    slotExists(slot) {
        return localStorage.getItem(`${this.storageKey}_${slot}`) !== null;
    },

    // ========================================================================
    // SAVE OPERATIONS
    // ========================================================================

    /**
     * Save current game state to a slot
     * @param {number} slot - Slot index (0-2)
     * @returns {boolean} Success
     */
    save(slot) {
        const maxSlots = SAVE_CONFIG ? SAVE_CONFIG.maxSlots : 3;

        if (slot < 0 || slot >= maxSlots) {
            console.error('[SaveManager] Invalid save slot:', slot);
            return false;
        }

        // Update last played timestamp
        persistentState.lastPlayed = Date.now();

        const saveData = {
            version: SAVE_CONFIG ? SAVE_CONFIG.version : 1,
            timestamp: Date.now(),
            persistent: this._cloneState(persistentState),
            session: sessionState.active ? this._cloneState(sessionState) : null,
            village: this._cloneState(villageState)
        };

        try {
            const serialized = JSON.stringify(saveData);
            localStorage.setItem(`${this.storageKey}_${slot}`, serialized);

            console.log(`[SaveManager] Saved to slot ${slot} (${(serialized.length / 1024).toFixed(1)}KB)`);
            return true;
        } catch (e) {
            console.error('[SaveManager] Save failed:', e);

            // Check if it's a quota error
            if (e.name === 'QuotaExceededError') {
                console.error('[SaveManager] Storage quota exceeded!');
            }

            return false;
        }
    },

    /**
     * Auto-save current run (called periodically)
     */
    autoSave() {
        if (!sessionState.active) {
            return false;
        }

        const currentSlot = persistentState.saveSlot;
        const success = this.save(currentSlot);

        if (success) {
            sessionState.lastSaveTime = Date.now();
        }

        return success;
    },

    /**
     * Quick save for room transitions
     * @param {string} roomId - Current room identifier
     */
    roomTransitionSave(roomId) {
        sessionState.savedRoomId = roomId;
        this.autoSave();
    },

    // ========================================================================
    // LOAD OPERATIONS
    // ========================================================================

    /**
     * Load game state from a slot
     * @param {number} slot - Slot index (0-2)
     * @returns {Object|null} Save data or null if not found
     */
    load(slot) {
        const maxSlots = SAVE_CONFIG ? SAVE_CONFIG.maxSlots : 3;

        if (slot < 0 || slot >= maxSlots) {
            console.error('[SaveManager] Invalid load slot:', slot);
            return null;
        }

        const data = localStorage.getItem(`${this.storageKey}_${slot}`);
        if (!data) {
            console.log(`[SaveManager] No save in slot ${slot}`);
            return null;
        }

        try {
            const parsed = JSON.parse(data);

            // Version migration
            const migrated = this._migrateVersion(parsed);

            console.log(`[SaveManager] Loaded from slot ${slot}`);
            return migrated;
        } catch (e) {
            console.error('[SaveManager] Load failed:', e);
            return null;
        }
    },

    /**
     * Apply loaded save data to game state
     * @param {number} slot - Slot to load from
     * @returns {boolean} Success
     */
    applyLoad(slot) {
        const saveData = this.load(slot);
        if (!saveData) return false;

        // Apply persistent state
        if (saveData.persistent) {
            Object.assign(persistentState, saveData.persistent);
            persistentState.saveSlot = slot;
        }

        // Apply village state
        if (saveData.village) {
            Object.assign(villageState, saveData.village);
        }

        // Apply session state if there was an active run
        if (saveData.session && saveData.session.active) {
            Object.assign(sessionState, saveData.session);
            return { success: true, hasActiveRun: true };
        }

        return { success: true, hasActiveRun: false };
    },

    // ========================================================================
    // DELETE OPERATIONS
    // ========================================================================

    /**
     * Delete a save slot
     * @param {number} slot - Slot index (0-2)
     */
    deleteSave(slot) {
        localStorage.removeItem(`${this.storageKey}_${slot}`);
        console.log(`[SaveManager] Deleted save slot ${slot}`);
    },

    /**
     * Delete all saves (use with caution!)
     */
    deleteAllSaves() {
        const maxSlots = SAVE_CONFIG ? SAVE_CONFIG.maxSlots : 3;
        for (let i = 0; i < maxSlots; i++) {
            localStorage.removeItem(`${this.storageKey}_${i}`);
        }
        console.log('[SaveManager] All saves deleted');
    },

    // ========================================================================
    // EXPORT/IMPORT (Backup)
    // ========================================================================

    /**
     * Export save as base64 string (for backup)
     * @param {number} slot - Slot index
     * @returns {string|null} Base64 encoded save data
     */
    exportSave(slot) {
        const data = localStorage.getItem(`${this.storageKey}_${slot}`);
        if (!data) return null;

        try {
            return btoa(unescape(encodeURIComponent(data)));
        } catch (e) {
            console.error('[SaveManager] Export failed:', e);
            return null;
        }
    },

    /**
     * Import save from base64 string
     * @param {number} slot - Slot to import to
     * @param {string} encodedData - Base64 encoded save data
     * @returns {boolean} Success
     */
    importSave(slot, encodedData) {
        try {
            const data = decodeURIComponent(escape(atob(encodedData)));

            // Validate JSON
            const parsed = JSON.parse(data);
            if (!parsed.persistent || !parsed.version) {
                throw new Error('Invalid save format');
            }

            localStorage.setItem(`${this.storageKey}_${slot}`, data);
            console.log(`[SaveManager] Imported save to slot ${slot}`);
            return true;
        } catch (e) {
            console.error('[SaveManager] Import failed:', e);
            return false;
        }
    },

    /**
     * Download save as file
     * @param {number} slot - Slot index
     */
    downloadSave(slot) {
        const data = localStorage.getItem(`${this.storageKey}_${slot}`);
        if (!data) {
            console.error('[SaveManager] No save to download');
            return;
        }

        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `shifting_chasm_save_${slot}_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    },

    // ========================================================================
    // NEW GAME
    // ========================================================================

    /**
     * Create a new game in a slot
     * @param {number} slot - Slot index
     * @returns {boolean} Success
     */
    createNewGame(slot) {
        // Create fresh states
        const freshPersistent = createNewPersistentState();
        freshPersistent.saveSlot = slot;

        // Apply to global state
        Object.assign(persistentState, freshPersistent);

        // Reset session and village
        resetSessionState();
        resetVillageState();

        // Add starting kit
        initializeStartingKit();

        // Save immediately
        return this.save(slot);
    },

    // ========================================================================
    // VERSION MIGRATION
    // ========================================================================

    /**
     * Migrate save data from older versions
     * @param {Object} saveData - Raw save data
     * @returns {Object} Migrated save data
     */
    _migrateVersion(saveData) {
        const currentVersion = SAVE_CONFIG ? SAVE_CONFIG.version : 1;
        const saveVersion = saveData.version || 1;

        if (saveVersion >= currentVersion) {
            return saveData;
        }

        console.log(`[SaveManager] Migrating save from v${saveVersion} to v${currentVersion}`);

        // Version migration logic will go here as we add versions
        // Example:
        // if (saveVersion < 2) {
        //     saveData.persistent.newField = defaultValue;
        // }

        saveData.version = currentVersion;
        return saveData;
    },

    // ========================================================================
    // UTILITIES
    // ========================================================================

    /**
     * Deep clone state object (handles Sets and other special types)
     * @param {Object} state - State object to clone
     * @returns {Object} Cloned state
     */
    _cloneState(state) {
        return JSON.parse(JSON.stringify(state, (key, value) => {
            // Convert Sets to arrays for JSON serialization
            if (value instanceof Set) {
                return { __type: 'Set', values: Array.from(value) };
            }
            return value;
        }));
    },

    /**
     * Restore special types after JSON parse
     * @param {Object} obj - Parsed object
     * @returns {Object} Object with restored types
     */
    _restoreTypes(obj) {
        if (obj && typeof obj === 'object') {
            if (obj.__type === 'Set') {
                return new Set(obj.values);
            }
            for (const key in obj) {
                obj[key] = this._restoreTypes(obj[key]);
            }
        }
        return obj;
    },

    /**
     * Get storage usage info
     * @returns {Object} Storage stats
     */
    getStorageInfo() {
        let totalSize = 0;
        const maxSlots = SAVE_CONFIG ? SAVE_CONFIG.maxSlots : 3;

        for (let i = 0; i < maxSlots; i++) {
            const data = localStorage.getItem(`${this.storageKey}_${i}`);
            if (data) {
                totalSize += data.length * 2; // UTF-16 = 2 bytes per char
            }
        }

        return {
            usedBytes: totalSize,
            usedKB: (totalSize / 1024).toFixed(2),
            estimatedMaxKB: 5120 // ~5MB typical localStorage limit
        };
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.SaveManager = SaveManager;

console.log('[SaveManager] Save system initialized');
