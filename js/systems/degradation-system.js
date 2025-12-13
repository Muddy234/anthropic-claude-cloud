// === js/systems/degradation-system.js ===
// SURVIVAL EXTRACTION UPDATE: Village and floor degradation

// ============================================================================
// DEGRADATION SYSTEM
// ============================================================================

const DegradationSystem = {

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize degradation tracking
     */
    init() {
        if (typeof persistentState !== 'undefined') {
            // Village degradation
            if (!persistentState.village) {
                persistentState.village = {
                    degradationLevel: 0,  // 0, 1, or 2
                    degradationProgress: 0,  // Progress toward next level
                    lastRestoration: null
                };
            }

            // Floor degradation
            if (!persistentState.floorDegradation) {
                persistentState.floorDegradation = {};
                for (let i = 1; i <= 6; i++) {
                    persistentState.floorDegradation[i] = {
                        extractionCount: 0,
                        qualityMultiplier: 1.0  // Starts at 100%
                    };
                }
            }
        }

        console.log('[DegradationSystem] Initialized');
    },

    // ========================================================================
    // VILLAGE DEGRADATION
    // ========================================================================

    /**
     * Process a failed run (death without extraction)
     * Increases village degradation
     */
    onRunFailed() {
        if (!persistentState?.village) return;

        const config = typeof DEGRADATION_CONFIG !== 'undefined' ?
            DEGRADATION_CONFIG : {
                failedRunPenalty: 10,
                degradationThresholds: [30, 60]  // Progress to reach level 1, 2
            };

        // Add degradation progress
        persistentState.village.degradationProgress += config.failedRunPenalty;

        // Check for level increase
        const thresholds = config.degradationThresholds;
        let newLevel = 0;

        if (persistentState.village.degradationProgress >= thresholds[1]) {
            newLevel = 2;
        } else if (persistentState.village.degradationProgress >= thresholds[0]) {
            newLevel = 1;
        }

        if (newLevel > persistentState.village.degradationLevel) {
            this._onDegradationLevelUp(newLevel);
        }

        console.log(`[DegradationSystem] Run failed. Progress: ${persistentState.village.degradationProgress}`);
    },

    /**
     * Process a successful extraction
     * Reduces village degradation
     * @param {number} floor - Floor extracted from
     */
    onExtractionSuccess(floor) {
        if (!persistentState?.village) return;

        const config = typeof DEGRADATION_CONFIG !== 'undefined' ?
            DEGRADATION_CONFIG : {
                extractionRecovery: 5,
                deepExtractionBonus: 2  // Extra per floor deeper than 1
            };

        // Calculate recovery
        const baseRecovery = config.extractionRecovery;
        const depthBonus = (floor - 1) * config.deepExtractionBonus;
        const totalRecovery = baseRecovery + depthBonus;

        // Reduce degradation progress
        persistentState.village.degradationProgress = Math.max(
            0,
            persistentState.village.degradationProgress - totalRecovery
        );

        // Check for level decrease
        const thresholds = [30, 60];
        let newLevel = 0;

        if (persistentState.village.degradationProgress >= thresholds[1]) {
            newLevel = 2;
        } else if (persistentState.village.degradationProgress >= thresholds[0]) {
            newLevel = 1;
        }

        if (newLevel < persistentState.village.degradationLevel) {
            this._onDegradationLevelDown(newLevel);
        }

        console.log(`[DegradationSystem] Extraction success. Progress: ${persistentState.village.degradationProgress}`);
    },

    /**
     * Handle degradation level increase
     * @param {number} newLevel
     * @private
     */
    _onDegradationLevelUp(newLevel) {
        persistentState.village.degradationLevel = newLevel;

        console.log(`[DegradationSystem] Village degradation increased to level ${newLevel}`);

        if (typeof addMessage === 'function') {
            if (newLevel === 1) {
                addMessage('The village shows signs of damage...', 'warning');
            } else if (newLevel === 2) {
                addMessage('The village is in serious disrepair!', 'danger');
            }
        }

        // Notify village system to regenerate
        if (typeof VillageSystem !== 'undefined') {
            VillageSystem.init(newLevel);
        }
    },

    /**
     * Handle degradation level decrease
     * @param {number} newLevel
     * @private
     */
    _onDegradationLevelDown(newLevel) {
        persistentState.village.degradationLevel = newLevel;
        persistentState.village.lastRestoration = Date.now();

        console.log(`[DegradationSystem] Village restored to level ${newLevel}`);

        if (typeof addMessage === 'function') {
            addMessage('The village has been restored!', 'success');
        }

        // Notify village system to regenerate
        if (typeof VillageSystem !== 'undefined') {
            VillageSystem.init(newLevel);
        }
    },

    // ========================================================================
    // FLOOR DEGRADATION
    // ========================================================================

    /**
     * Track extraction from a floor
     * Reduces future loot quality on that floor
     * @param {number} floor
     */
    onFloorExtracted(floor) {
        if (!persistentState?.floorDegradation?.[floor]) return;

        const config = typeof DEGRADATION_CONFIG !== 'undefined' ?
            DEGRADATION_CONFIG : {
                floorDegradationRate: 0.15,
                floorMinQuality: 0.40
            };

        const floorData = persistentState.floorDegradation[floor];
        floorData.extractionCount++;

        // Reduce quality multiplier
        const reduction = config.floorDegradationRate;
        floorData.qualityMultiplier = Math.max(
            config.floorMinQuality,
            floorData.qualityMultiplier - reduction
        );

        console.log(`[DegradationSystem] Floor ${floor} extracted. Quality: ${Math.floor(floorData.qualityMultiplier * 100)}%`);
    },

    /**
     * Get floor quality multiplier
     * @param {number} floor
     * @returns {number} 0.4-1.0
     */
    getFloorQuality(floor) {
        return persistentState?.floorDegradation?.[floor]?.qualityMultiplier || 1.0;
    },

    /**
     * Apply quality multiplier to loot
     * @param {Object} loot - Loot item
     * @param {number} floor
     * @returns {Object} Modified loot
     */
    applyFloorQuality(loot, floor) {
        const quality = this.getFloorQuality(floor);

        // Reduce stack counts
        if (loot.count) {
            loot.count = Math.max(1, Math.floor(loot.count * quality));
        }

        // Chance to downgrade rarity
        if (quality < 0.7 && Math.random() > quality) {
            const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
            const currentIdx = rarities.indexOf(loot.rarity);
            if (currentIdx > 0) {
                loot.rarity = rarities[currentIdx - 1];
            }
        }

        return loot;
    },

    // ========================================================================
    // RESTORATION
    // ========================================================================

    /**
     * Restore village degradation with materials
     * @param {string} materialId - Material to use
     * @param {number} count - Amount to use
     * @returns {Object} { success, restorationAmount }
     */
    restoreWithMaterials(materialId, count) {
        if (!persistentState?.village) return { success: false };

        // Material restoration values
        const restorationValues = {
            'chasm_iron': 1,
            'emberstone': 2,
            'living_crystal': 5,
            'void_metal': 10,
            'primordial_essence': 25
        };

        const valuePerUnit = restorationValues[materialId] || 0;
        if (valuePerUnit === 0) {
            return { success: false, reason: 'Material cannot be used for restoration' };
        }

        // Check if player has materials
        if (typeof BankingSystem !== 'undefined') {
            const available = BankingSystem.getItemCount(materialId);
            if (available < count) {
                return { success: false, reason: 'Not enough materials' };
            }

            // Remove materials
            BankingSystem.removeItem(materialId, count);
        }

        const totalRestoration = valuePerUnit * count;
        persistentState.village.degradationProgress = Math.max(
            0,
            persistentState.village.degradationProgress - totalRestoration
        );

        // Check for level change
        this.onExtractionSuccess(1);  // Trigger level check

        console.log(`[DegradationSystem] Restored ${totalRestoration} with ${count} ${materialId}`);

        return {
            success: true,
            restorationAmount: totalRestoration,
            newProgress: persistentState.village.degradationProgress
        };
    },

    // ========================================================================
    // QUERIES
    // ========================================================================

    /**
     * Get village degradation status
     * @returns {Object}
     */
    getVillageStatus() {
        const village = persistentState?.village || {
            degradationLevel: 0,
            degradationProgress: 0
        };

        const thresholds = [30, 60];
        const currentThreshold = village.degradationLevel < 2 ?
            thresholds[village.degradationLevel] : 100;
        const previousThreshold = village.degradationLevel > 0 ?
            thresholds[village.degradationLevel - 1] : 0;

        return {
            level: village.degradationLevel,
            progress: village.degradationProgress,
            progressToNext: currentThreshold - village.degradationProgress,
            progressPercent: Math.min(100, (village.degradationProgress / currentThreshold) * 100),
            levelName: ['Thriving', 'Damaged', 'Ruined'][village.degradationLevel],
            canRestore: village.degradationLevel > 0
        };
    },

    /**
     * Get all floor degradation status
     * @returns {Object}
     */
    getAllFloorStatus() {
        const status = {};

        for (let floor = 1; floor <= 6; floor++) {
            const data = persistentState?.floorDegradation?.[floor] || {
                extractionCount: 0,
                qualityMultiplier: 1.0
            };

            status[floor] = {
                extractions: data.extractionCount,
                quality: data.qualityMultiplier,
                qualityPercent: Math.floor(data.qualityMultiplier * 100),
                depleted: data.qualityMultiplier <= 0.4
            };
        }

        return status;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.DegradationSystem = DegradationSystem;

console.log('[DegradationSystem] Degradation system loaded');
