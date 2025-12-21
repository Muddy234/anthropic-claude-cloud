// === js/systems/quest-system.js ===
// SURVIVAL EXTRACTION UPDATE: Quest tracking and progression
// SIMPLIFIED: Single active quest, Elder Mira only, main story

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
                completed: []
            };
        }

        console.log('[QuestSystem] Initialized (single quest mode)');
    },

    // ========================================================================
    // QUEST MANAGEMENT
    // ========================================================================

    /**
     * Accept a quest (only 1 can be active at a time)
     * @param {string} questId
     * @returns {boolean} Success
     */
    acceptQuest(questId) {
        const quest = getQuest(questId);
        if (!quest) {
            console.warn(`[QuestSystem] Unknown quest: ${questId}`);
            return false;
        }

        // SINGLE QUEST RESTRICTION: Check if already have active quest
        if (this.hasActiveQuest()) {
            console.log(`[QuestSystem] Cannot accept - already have active quest`);
            if (typeof addMessage === 'function') {
                addMessage('You must complete your current quest first.', 'warning');
            }
            return false;
        }

        // Check if already completed
        if (this.isQuestCompleted(questId)) {
            console.log(`[QuestSystem] Quest already completed: ${questId}`);
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

        persistentState.quests.active = [activeQuest];  // Replace, not push (single quest)

        console.log(`[QuestSystem] Accepted quest: ${quest.name}`);

        if (typeof addMessage === 'function') {
            addMessage(`Quest accepted: ${quest.name}`, 'quest');
        }

        return true;
    },

    /**
     * Abandon the current quest
     * @returns {boolean} Success
     */
    abandonQuest() {
        if (!this.hasActiveQuest()) return false;

        const activeQuest = this.getCurrentQuest();
        persistentState.quests.active = [];

        console.log(`[QuestSystem] Abandoned quest: ${activeQuest.id}`);

        if (typeof addMessage === 'function') {
            addMessage('Quest abandoned.', 'warning');
        }

        return true;
    },

    /**
     * Complete the current quest (must talk to Elder Mira)
     * @returns {Object|null} Rewards or null
     */
    completeQuest() {
        if (!this.hasActiveQuest()) return null;

        const activeQuest = this.getCurrentQuest();
        const questData = getQuest(activeQuest.id);

        // Check if all objectives complete
        if (!areAllObjectivesComplete(activeQuest.objectives)) {
            console.log(`[QuestSystem] Quest not complete: ${activeQuest.id}`);
            return null;
        }

        // Clear active quest
        persistentState.quests.active = [];

        // Add to completed
        if (!persistentState.quests.completed.includes(activeQuest.id)) {
            persistentState.quests.completed.push(activeQuest.id);
        }

        // Grant rewards
        const rewards = this._grantRewards(questData.rewards);

        console.log(`[QuestSystem] Completed quest: ${questData.name}`);

        if (typeof addMessage === 'function') {
            addMessage(`Quest complete: ${questData.name}!`, 'success');
            if (rewards.gold > 0) {
                addMessage(`Received ${rewards.gold} gold!`, 'loot');
            }
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
    // QUERIES (Simplified for single quest)
    // ========================================================================

    /**
     * Check if player has an active quest
     * @returns {boolean}
     */
    hasActiveQuest() {
        return (persistentState?.quests?.active?.length || 0) > 0;
    },

    /**
     * Get the current active quest (single quest mode)
     * @returns {Object|null}
     */
    getCurrentQuest() {
        if (!this.hasActiveQuest()) return null;
        return persistentState.quests.active[0];
    },

    /**
     * Get current quest with full data
     * @returns {Object|null}
     */
    getCurrentQuestFull() {
        const activeQuest = this.getCurrentQuest();
        if (!activeQuest) return null;

        const questData = getQuest(activeQuest.id);
        if (!questData) return null;

        return {
            ...questData,
            progress: activeQuest,
            isReadyToTurnIn: areAllObjectivesComplete(activeQuest.objectives)
        };
    },

    /**
     * Check if current quest is ready to turn in
     * @returns {boolean}
     */
    isQuestReadyToTurnIn() {
        const activeQuest = this.getCurrentQuest();
        if (!activeQuest) return false;
        return areAllObjectivesComplete(activeQuest.objectives);
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
     * Get the next available quest
     * @returns {Object|null}
     */
    getNextAvailableQuest() {
        if (this.hasActiveQuest()) return null;
        return getNextStoryQuest(persistentState?.quests || {});
    },

    /**
     * Get quest status for Elder Mira dialogue
     * @returns {Object} { status, quest, nextQuest }
     */
    getElderQuestStatus() {
        // Check if current quest ready to turn in
        if (this.isQuestReadyToTurnIn()) {
            return {
                status: 'ready_to_complete',
                quest: this.getCurrentQuestFull()
            };
        }

        // Check if has active quest in progress
        if (this.hasActiveQuest()) {
            return {
                status: 'in_progress',
                quest: this.getCurrentQuestFull()
            };
        }

        // Check if new quest available
        const nextQuest = this.getNextAvailableQuest();
        if (nextQuest) {
            return {
                status: 'quest_available',
                quest: nextQuest
            };
        }

        // All quests completed
        return {
            status: 'all_complete',
            quest: null
        };
    },

    /**
     * Get story progress
     * @returns {Object} { completed, total, percentage }
     */
    getStoryProgress() {
        const completed = persistentState?.quests?.completed?.length || 0;
        const total = getTotalQuestCount();
        return {
            completed,
            total,
            percentage: Math.floor((completed / total) * 100)
        };
    },

    /**
     * Get current quest progress summary
     * @returns {Object|null}
     */
    getQuestProgress() {
        const activeQuest = this.getCurrentQuest();
        if (!activeQuest) return null;

        const questData = getQuest(activeQuest.id);
        if (!questData) return null;

        const totalObjectives = activeQuest.objectives.length;
        const completedObjectives = activeQuest.objectives.filter(obj =>
            isObjectiveComplete(obj)
        ).length;

        return {
            id: activeQuest.id,
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
