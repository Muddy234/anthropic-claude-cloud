// === js/systems/quest-system.js ===
// SURVIVAL EXTRACTION UPDATE: Quest tracking and progression

// ============================================================================
// QUEST SYSTEM
// ============================================================================

const QuestSystem = {
    name: 'QuestSystem',
    priority: 85,  // After most gameplay systems

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize quest system
     */
    init() {
        // Ensure quest tracking exists in persistent state
        if (typeof persistentState !== 'undefined' && !persistentState.quests) {
            persistentState.quests = {
                active: [],
                completed: [],
                lastCompletion: {}
            };
        }

        console.log('[QuestSystem] Initialized');
    },

    // ========================================================================
    // QUEST MANAGEMENT
    // ========================================================================

    /**
     * Accept a quest
     * @param {string} questId
     * @returns {boolean} Success
     */
    acceptQuest(questId) {
        const quest = getQuest(questId);
        if (!quest) {
            console.warn(`[QuestSystem] Unknown quest: ${questId}`);
            return false;
        }

        // Check if already active
        if (this.isQuestActive(questId)) {
            console.log(`[QuestSystem] Quest already active: ${questId}`);
            return false;
        }

        // Check prerequisites
        if (quest.prerequisite && !this.isQuestCompleted(quest.prerequisite)) {
            console.log(`[QuestSystem] Prerequisite not met: ${quest.prerequisite}`);
            return false;
        }

        // Create active quest instance
        const activeQuest = {
            id: questId,
            acceptedAt: Date.now(),
            acceptedRun: persistentState?.stats?.totalRuns || 0,
            objectives: quest.objectives.map(obj => ({
                ...obj,
                current: 0
            }))
        };

        persistentState.quests.active.push(activeQuest);

        console.log(`[QuestSystem] Accepted quest: ${quest.name}`);

        // Add message
        if (typeof addMessage === 'function') {
            addMessage(`Quest accepted: ${quest.name}`, 'quest');
        }

        return true;
    },

    /**
     * Abandon a quest
     * @param {string} questId
     * @returns {boolean} Success
     */
    abandonQuest(questId) {
        const index = persistentState.quests.active.findIndex(q => q.id === questId);
        if (index === -1) return false;

        persistentState.quests.active.splice(index, 1);
        console.log(`[QuestSystem] Abandoned quest: ${questId}`);

        return true;
    },

    /**
     * Complete a quest
     * @param {string} questId
     * @returns {Object|null} Rewards or null
     */
    completeQuest(questId) {
        const activeIndex = persistentState.quests.active.findIndex(q => q.id === questId);
        if (activeIndex === -1) return null;

        const activeQuest = persistentState.quests.active[activeIndex];
        const questData = getQuest(questId);

        // Check if all objectives complete
        if (!areAllObjectivesComplete(activeQuest.objectives)) {
            console.log(`[QuestSystem] Quest not complete: ${questId}`);
            return null;
        }

        // Remove from active
        persistentState.quests.active.splice(activeIndex, 1);

        // Add to completed
        if (!persistentState.quests.completed.includes(questId)) {
            persistentState.quests.completed.push(questId);
        }

        // Track completion time for repeatable quests
        persistentState.quests.lastCompletion[questId] = persistentState.stats?.totalRuns || 0;

        // Grant rewards
        const rewards = this._grantRewards(questData.rewards);

        console.log(`[QuestSystem] Completed quest: ${questData.name}`);

        if (typeof addMessage === 'function') {
            addMessage(`Quest complete: ${questData.name}!`, 'success');
        }

        return rewards;
    },

    /**
     * Grant quest rewards
     * @param {Object} rewards
     * @returns {Object} Granted rewards
     * @private
     */
    _grantRewards(rewards) {
        const granted = { gold: 0, items: [], special: [] };

        if (!rewards) return granted;

        // Gold
        if (rewards.gold) {
            if (typeof BankingSystem !== 'undefined') {
                BankingSystem.depositGold(rewards.gold);
            } else if (persistentState?.bank) {
                persistentState.bank.gold += rewards.gold;
            }
            granted.gold = rewards.gold;
        }

        // Items
        if (rewards.items) {
            rewards.items.forEach(item => {
                // Create item and deposit to bank
                const newItem = createMaterialItem(item.id, item.count) ||
                               { id: item.id, name: item.id, count: item.count, type: 'item' };

                if (typeof BankingSystem !== 'undefined') {
                    BankingSystem.deposit(newItem);
                } else if (persistentState?.bank) {
                    persistentState.bank.items.push(newItem);
                }
                granted.items.push(newItem);
            });
        }

        // Unlocks
        if (rewards.unlocks) {
            rewards.unlocks.forEach(unlock => {
                granted.special.push({ type: 'unlock', id: unlock });
            });
        }

        // Bank expansion
        if (rewards.bankExpansion) {
            if (typeof BANKING_CONFIG !== 'undefined') {
                BANKING_CONFIG.maxItems += rewards.bankExpansion;
            }
            granted.special.push({ type: 'bank_expansion', amount: rewards.bankExpansion });
        }

        // Blessing
        if (rewards.blessing) {
            granted.special.push({ type: 'blessing', id: rewards.blessing });
        }

        return granted;
    },

    // ========================================================================
    // PROGRESS TRACKING
    // ========================================================================

    /**
     * Update quest progress for an event
     * @param {string} eventType - Type of event
     * @param {Object} eventData - Event data
     */
    trackProgress(eventType, eventData) {
        if (!persistentState?.quests?.active) return;

        let questsUpdated = false;

        persistentState.quests.active.forEach(activeQuest => {
            activeQuest.objectives.forEach(objective => {
                if (this._matchesObjective(objective, eventType, eventData)) {
                    objective.current = Math.min(
                        objective.current + (eventData.count || 1),
                        objective.count || objective.amount || objective.percentage || Infinity
                    );
                    questsUpdated = true;

                    // Check if objective just completed
                    if (isObjectiveComplete(objective)) {
                        console.log(`[QuestSystem] Objective complete: ${objective.description}`);
                    }
                }
            });

            // Check if quest is now complete
            if (areAllObjectivesComplete(activeQuest.objectives)) {
                console.log(`[QuestSystem] Quest ready to turn in: ${activeQuest.id}`);
            }
        });

        if (questsUpdated) {
            // Save progress
            if (typeof SaveManager !== 'undefined') {
                SaveManager.autoSave();
            }
        }
    },

    /**
     * Check if objective matches event
     * @param {Object} objective
     * @param {string} eventType
     * @param {Object} eventData
     * @returns {boolean}
     * @private
     */
    _matchesObjective(objective, eventType, eventData) {
        switch (objective.type) {
            case 'extract':
                if (eventType !== 'extraction') return false;
                if (objective.floor && eventData.floor !== objective.floor) return false;
                if (objective.minFloor && eventData.floor < objective.minFloor) return false;
                return true;

            case 'reach_floor':
                if (eventType !== 'floor_reached') return false;
                return eventData.floor >= objective.floor;

            case 'defeat_guardian':
                if (eventType !== 'guardian_defeated') return false;
                return eventData.floor === objective.floor;

            case 'collect':
                if (eventType !== 'item_collected') return false;
                return eventData.itemId === objective.itemId;

            case 'kill':
                if (eventType !== 'enemy_killed') return false;
                if (objective.monsterType !== 'any' && eventData.monsterType !== objective.monsterType) {
                    return false;
                }
                if (objective.floor && eventData.floor !== objective.floor) return false;
                return true;

            case 'explore_floor':
                if (eventType !== 'exploration_update') return false;
                if (eventData.floor !== objective.floor) return false;
                objective.current = Math.max(objective.current, eventData.percentage);
                return false;  // We update directly above

            case 'deposit_gold':
                if (eventType !== 'gold_deposited') return false;
                objective.current += eventData.amount;
                return false;  // We update directly above

            default:
                return false;
        }
    },

    // ========================================================================
    // QUERIES
    // ========================================================================

    /**
     * Check if quest is active
     * @param {string} questId
     * @returns {boolean}
     */
    isQuestActive(questId) {
        return persistentState?.quests?.active?.some(q => q.id === questId) || false;
    },

    /**
     * Check if quest is completed
     * @param {string} questId
     * @returns {boolean}
     */
    isQuestCompleted(questId) {
        return persistentState?.quests?.completed?.includes(questId) || false;
    },

    /**
     * Get active quest by ID
     * @param {string} questId
     * @returns {Object|null}
     */
    getActiveQuest(questId) {
        return persistentState?.quests?.active?.find(q => q.id === questId) || null;
    },

    /**
     * Get all active quests
     * @returns {Array}
     */
    getActiveQuests() {
        return persistentState?.quests?.active || [];
    },

    /**
     * Get quests available from an NPC
     * @param {string} npcId
     * @returns {Object} { available: [], active: [], completable: [] }
     */
    getQuestsForNPC(npcId) {
        const result = {
            available: [],
            active: [],
            completable: []
        };

        // Get all quests from this NPC
        const npcQuests = getQuestsByGiver(npcId);

        npcQuests.forEach(quest => {
            const activeQuest = this.getActiveQuest(quest.id);

            if (activeQuest) {
                // Quest is active
                if (areAllObjectivesComplete(activeQuest.objectives)) {
                    result.completable.push({ quest, progress: activeQuest });
                } else {
                    result.active.push({ quest, progress: activeQuest });
                }
            } else {
                // Check if available
                const available = getAvailableQuests(persistentState?.quests || {});
                if (available.some(q => q.id === quest.id)) {
                    result.available.push(quest);
                }
            }
        });

        return result;
    },

    /**
     * Get quest progress summary
     * @param {string} questId
     * @returns {Object|null}
     */
    getQuestProgress(questId) {
        const activeQuest = this.getActiveQuest(questId);
        if (!activeQuest) return null;

        const questData = getQuest(questId);
        if (!questData) return null;

        const totalObjectives = activeQuest.objectives.length;
        const completedObjectives = activeQuest.objectives.filter(obj =>
            isObjectiveComplete(obj)
        ).length;

        return {
            id: questId,
            name: questData.name,
            objectives: activeQuest.objectives,
            progress: completedObjectives / totalObjectives,
            isComplete: completedObjectives === totalObjectives
        };
    },

    // ========================================================================
    // EVENT HOOKS
    // ========================================================================

    /**
     * Called when player extracts
     */
    onExtraction(floor) {
        this.trackProgress('extraction', { floor });
    },

    /**
     * Called when player reaches a floor
     */
    onFloorReached(floor) {
        this.trackProgress('floor_reached', { floor });
    },

    /**
     * Called when guardian is defeated
     */
    onGuardianDefeated(floor) {
        this.trackProgress('guardian_defeated', { floor });
    },

    /**
     * Called when item is collected
     */
    onItemCollected(itemId, count = 1) {
        this.trackProgress('item_collected', { itemId, count });
    },

    /**
     * Called when enemy is killed
     */
    onEnemyKilled(monsterType, floor) {
        this.trackProgress('enemy_killed', { monsterType, floor });
    },

    /**
     * Called when floor exploration updates
     */
    onExplorationUpdate(floor, percentage) {
        this.trackProgress('exploration_update', { floor, percentage });
    },

    /**
     * Called when gold is deposited
     */
    onGoldDeposited(amount) {
        this.trackProgress('gold_deposited', { amount });
    },

    // ========================================================================
    // SYSTEM UPDATE
    // ========================================================================

    /**
     * System update (called each frame)
     */
    update(dt) {
        // Quest system doesn't need per-frame updates
        // Progress is tracked via event hooks
    }
};

// ============================================================================
// REGISTER WITH SYSTEM MANAGER
// ============================================================================

if (typeof SystemManager !== 'undefined') {
    SystemManager.register('QuestSystem', QuestSystem, 85);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.QuestSystem = QuestSystem;

console.log('[QuestSystem] Quest system loaded');
