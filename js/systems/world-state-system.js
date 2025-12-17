// === js/systems/world-state-system.js ===
// THE BLEEDING EARTH: World State Progression System

// ============================================================================
// WORLD STATE ENUM
// ============================================================================

/**
 * World states representing the narrative progression of Oakhaven's decline
 * State changes are ONE-WAY and triggered by extraction milestones
 */
const WORLD_STATE = {
    NORMAL: 1,    // Lush green, peaceful village
    ASH: 2,       // Grey skies, ash falling, some NPCs flee
    BURNING: 3,   // Fissures, embers, banker dies, buildings crack
    ENDGAME: 4    // Final state - entered Floor 10, no return until victory
};

// Human-readable state names
const WORLD_STATE_NAMES = {
    [WORLD_STATE.NORMAL]: 'The Green Summer',
    [WORLD_STATE.ASH]: 'The Ash Fall',
    [WORLD_STATE.BURNING]: 'The Bleeding Earth',
    [WORLD_STATE.ENDGAME]: 'The Final Descent'
};

// ============================================================================
// CONFIGURATION
// ============================================================================

const WORLD_STATE_CONFIG = {
    // Floor extraction thresholds that trigger state changes
    progressionTriggers: {
        [WORLD_STATE.ASH]: 3,      // Extract from Floor 3 -> ASH
        [WORLD_STATE.BURNING]: 6,  // Extract from Floor 6 -> BURNING
        [WORLD_STATE.ENDGAME]: 10  // Enter Floor 10 -> ENDGAME (special trigger)
    },

    // NPC presence by state (which NPCs are present in each state)
    npcPresence: {
        // Core NPCs that stay until specific states
        elder_mira: { presentUntil: WORLD_STATE.ENDGAME },
        elder_thorne: { presentUntil: WORLD_STATE.ENDGAME },
        elder_vallus: { presentUntil: WORLD_STATE.ENDGAME },
        banker: { presentUntil: WORLD_STATE.BURNING, deathState: WORLD_STATE.BURNING },
        blacksmith: { presentUntil: WORLD_STATE.ENDGAME },
        innkeeper: { presentUntil: WORLD_STATE.ENDGAME },
        expedition_master: { presentUntil: WORLD_STATE.ENDGAME },
        priestess: { presentUntil: WORLD_STATE.ENDGAME },
        patron: { presentUntil: WORLD_STATE.BURNING },

        // NPCs that flee earlier
        merchant_wife: { presentUntil: WORLD_STATE.ASH, fleeState: WORLD_STATE.ASH },
        alchemist: { presentUntil: WORLD_STATE.BURNING, fleeState: WORLD_STATE.BURNING },
        villager_1: { presentUntil: WORLD_STATE.ASH, fleeState: WORLD_STATE.ASH },
        villager_2: { presentUntil: WORLD_STATE.ASH, fleeState: WORLD_STATE.ASH },
        villager_3: { presentUntil: WORLD_STATE.ASH, fleeState: WORLD_STATE.ASH }
    },

    // Visual atmosphere settings per state
    atmosphere: {
        [WORLD_STATE.NORMAL]: {
            screenTint: null,
            particleSystem: null,
            skyColor: '#87CEEB',
            ambientLight: 1.0
        },
        [WORLD_STATE.ASH]: {
            screenTint: { r: 0.9, g: 0.9, b: 0.95, a: 0.15 },
            particleSystem: 'ashfall',
            skyColor: '#8B8989',
            ambientLight: 0.85
        },
        [WORLD_STATE.BURNING]: {
            screenTint: { r: 1.0, g: 0.6, b: 0.4, a: 0.25 },
            particleSystem: 'ember_rain',
            skyColor: '#4A3728',
            ambientLight: 0.7,
            smokeOverlay: true
        },
        [WORLD_STATE.ENDGAME]: {
            screenTint: { r: 1.0, g: 0.4, b: 0.2, a: 0.35 },
            particleSystem: 'ember_rain',
            skyColor: '#2A1A10',
            ambientLight: 0.5,
            smokeOverlay: true,
            groundShake: true
        }
    }
};

// ============================================================================
// WORLD STATE SYSTEM
// ============================================================================

const WorldStateSystem = {

    // ========================================================================
    // INITIALIZATION
    // ========================================================================

    /**
     * Initialize the world state system
     */
    init() {
        // Ensure persistent state has world state tracking
        if (typeof persistentState !== 'undefined') {
            if (persistentState.worldState === undefined) {
                persistentState.worldState = WORLD_STATE.NORMAL;
            }
            if (persistentState.worldStateHistory === undefined) {
                persistentState.worldStateHistory = [{
                    state: WORLD_STATE.NORMAL,
                    timestamp: Date.now(),
                    trigger: 'game_start'
                }];
            }
            if (persistentState.loreCollected === undefined) {
                persistentState.loreCollected = [];
            }
            if (persistentState.questItems === undefined) {
                persistentState.questItems = {
                    dagger: false,
                    wardsCollected: 0,
                    wardsDelivered: 0
                };
            }
            if (persistentState.npcStates === undefined) {
                persistentState.npcStates = {};
            }
        }

        console.log(`[WorldState] Initialized - Current state: ${this.getStateName()}`);
    },

    // ========================================================================
    // STATE QUERIES
    // ========================================================================

    /**
     * Get the current world state
     * @returns {number} Current WORLD_STATE value
     */
    getState() {
        return persistentState?.worldState || WORLD_STATE.NORMAL;
    },

    /**
     * Get human-readable state name
     * @returns {string}
     */
    getStateName() {
        return WORLD_STATE_NAMES[this.getState()] || 'Unknown';
    },

    /**
     * Check if world is at or past a certain state
     * @param {number} state - WORLD_STATE to check against
     * @returns {boolean}
     */
    isAtLeast(state) {
        return this.getState() >= state;
    },

    /**
     * Check if world is exactly at a state
     * @param {number} state - WORLD_STATE to check
     * @returns {boolean}
     */
    isExactly(state) {
        return this.getState() === state;
    },

    /**
     * Get atmosphere settings for current state
     * @returns {Object}
     */
    getAtmosphere() {
        return WORLD_STATE_CONFIG.atmosphere[this.getState()] ||
               WORLD_STATE_CONFIG.atmosphere[WORLD_STATE.NORMAL];
    },

    // ========================================================================
    // STATE PROGRESSION
    // ========================================================================

    /**
     * Check if extraction from a floor should trigger state progression
     * Called from survival-integration.js onExtraction()
     * @param {number} floor - Floor extracted from
     */
    checkExtractionProgression(floor) {
        const currentState = this.getState();
        const triggers = WORLD_STATE_CONFIG.progressionTriggers;

        // Check each possible state transition
        if (currentState < WORLD_STATE.ASH && floor >= triggers[WORLD_STATE.ASH]) {
            this._transitionTo(WORLD_STATE.ASH, `extraction_floor_${floor}`);
        } else if (currentState < WORLD_STATE.BURNING && floor >= triggers[WORLD_STATE.BURNING]) {
            this._transitionTo(WORLD_STATE.BURNING, `extraction_floor_${floor}`);
        }
    },

    /**
     * Check if entering a floor should trigger state progression
     * Called when player enters Floor 10
     * @param {number} floor - Floor being entered
     */
    checkFloorEntryProgression(floor) {
        const currentState = this.getState();
        const triggers = WORLD_STATE_CONFIG.progressionTriggers;

        // Floor 10 entry triggers ENDGAME
        if (currentState < WORLD_STATE.ENDGAME && floor >= triggers[WORLD_STATE.ENDGAME]) {
            this._transitionTo(WORLD_STATE.ENDGAME, `entered_floor_${floor}`);
        }
    },

    /**
     * Transition to a new world state
     * @param {number} newState - Target WORLD_STATE
     * @param {string} trigger - What caused this transition
     * @private
     */
    _transitionTo(newState, trigger) {
        const oldState = this.getState();

        if (newState <= oldState) {
            console.log(`[WorldState] Ignoring transition to ${newState} - already at ${oldState}`);
            return;
        }

        console.log(`[WorldState] TRANSITION: ${WORLD_STATE_NAMES[oldState]} -> ${WORLD_STATE_NAMES[newState]}`);

        // Update persistent state
        persistentState.worldState = newState;
        persistentState.worldStateHistory.push({
            state: newState,
            timestamp: Date.now(),
            trigger: trigger,
            previousState: oldState
        });

        // Process NPC changes
        this._processNPCChanges(newState);

        // Show narrative message
        this._showTransitionMessage(newState);

        // Trigger village regeneration if in village
        if (game.state === 'village' && typeof VillageSystem !== 'undefined') {
            VillageSystem.init();
        }

        // Fire custom event for other systems
        window.dispatchEvent(new CustomEvent('worldStateChange', {
            detail: { oldState, newState, trigger }
        }));
    },

    /**
     * Process NPC state changes for a world state transition
     * @param {number} newState
     * @private
     */
    _processNPCChanges(newState) {
        const npcConfig = WORLD_STATE_CONFIG.npcPresence;

        for (const [npcId, config] of Object.entries(npcConfig)) {
            // Check if NPC should flee
            if (config.fleeState === newState) {
                this._setNPCState(npcId, 'fled');
                console.log(`[WorldState] ${npcId} has fled the village`);
            }
            // Check if NPC should die
            else if (config.deathState === newState) {
                this._setNPCState(npcId, 'dead');
                console.log(`[WorldState] ${npcId} has died`);
            }
        }
    },

    /**
     * Set an NPC's persistent state
     * @param {string} npcId
     * @param {string} state - 'present', 'fled', 'dead'
     * @private
     */
    _setNPCState(npcId, state) {
        if (!persistentState.npcStates) {
            persistentState.npcStates = {};
        }
        persistentState.npcStates[npcId] = {
            state: state,
            changedAt: Date.now(),
            worldState: this.getState()
        };
    },

    /**
     * Get an NPC's current state
     * @param {string} npcId
     * @returns {string} 'present', 'fled', or 'dead'
     */
    getNPCState(npcId) {
        return persistentState?.npcStates?.[npcId]?.state || 'present';
    },

    /**
     * Check if an NPC is currently present in the village
     * @param {string} npcId
     * @returns {boolean}
     */
    isNPCPresent(npcId) {
        const state = this.getNPCState(npcId);
        return state === 'present';
    },

    /**
     * Show narrative message for state transition
     * @param {number} newState
     * @private
     */
    _showTransitionMessage(newState) {
        const messages = {
            [WORLD_STATE.ASH]: [
                'You emerge from the Chasm to find the sky grey with ash.',
                'The air tastes of sulfur. Something has changed.',
                'Villagers are packing their belongings. Fear fills the streets.'
            ],
            [WORLD_STATE.BURNING]: [
                'The ground trembles beneath your feet. Cracks split the cobblestones.',
                'Fire glows on the horizon. The volcano awakens.',
                'Screams echo through the village. The bank has collapsed!'
            ],
            [WORLD_STATE.ENDGAME]: [
                'There is no turning back now. The Heart awaits.',
                'The world above burns. Only victory can save them.',
                'Malphas stirs in the depths. This ends here.'
            ]
        };

        const stateMessages = messages[newState];
        if (stateMessages && typeof addMessage === 'function') {
            stateMessages.forEach((msg, i) => {
                setTimeout(() => addMessage(msg, 'story'), i * 2000);
            });
        }
    },

    // ========================================================================
    // LORE & QUEST ITEMS
    // ========================================================================

    /**
     * Collect a lore fragment
     * @param {string} loreId - Unique ID of the lore fragment
     * @returns {boolean} True if newly collected
     */
    collectLore(loreId) {
        if (!persistentState.loreCollected) {
            persistentState.loreCollected = [];
        }

        if (persistentState.loreCollected.includes(loreId)) {
            return false; // Already collected
        }

        persistentState.loreCollected.push(loreId);
        console.log(`[WorldState] Lore collected: ${loreId}`);

        // Special handling for the betrayal dagger
        if (loreId === 'bloodied_letter') {
            this.grantQuestItem('dagger');
        }

        return true;
    },

    /**
     * Check if lore has been collected
     * @param {string} loreId
     * @returns {boolean}
     */
    hasLore(loreId) {
        return persistentState?.loreCollected?.includes(loreId) || false;
    },

    /**
     * Get all collected lore IDs
     * @returns {string[]}
     */
    getCollectedLore() {
        return persistentState?.loreCollected || [];
    },

    /**
     * Grant a quest item to the player
     * @param {string} itemId - 'dagger' or 'ward'
     */
    grantQuestItem(itemId) {
        if (!persistentState.questItems) {
            persistentState.questItems = { dagger: false, wardsCollected: 0, wardsDelivered: 0 };
        }

        if (itemId === 'dagger') {
            if (!persistentState.questItems.dagger) {
                persistentState.questItems.dagger = true;
                if (typeof addMessage === 'function') {
                    addMessage('You found a bloodied ceremonial dagger. The Elders have questions to answer.', 'quest');
                }
                console.log('[WorldState] Quest item granted: Betrayal Dagger');
            }
        } else if (itemId === 'ward') {
            persistentState.questItems.wardsCollected++;
            if (typeof addMessage === 'function') {
                addMessage(`Aether-Ward collected. (${persistentState.questItems.wardsCollected} total)`, 'loot');
            }
            console.log(`[WorldState] Ward collected. Total: ${persistentState.questItems.wardsCollected}`);
        }
    },

    /**
     * Check if player has the betrayal dagger
     * @returns {boolean}
     */
    hasDagger() {
        return persistentState?.questItems?.dagger || false;
    },

    /**
     * Get ward counts
     * @returns {Object} { collected, delivered }
     */
    getWardCounts() {
        const qi = persistentState?.questItems || {};
        return {
            collected: qi.wardsCollected || 0,
            delivered: qi.wardsDelivered || 0
        };
    },

    /**
     * Deliver wards to stabilize the volcano (narrative action)
     * @returns {boolean} True if successful
     */
    deliverWards() {
        const qi = persistentState?.questItems;
        if (!qi || qi.wardsCollected <= qi.wardsDelivered) {
            return false;
        }

        const toDeliver = qi.wardsCollected - qi.wardsDelivered;
        qi.wardsDelivered = qi.wardsCollected;

        if (typeof addMessage === 'function') {
            addMessage(`${toDeliver} Aether-Ward(s) delivered. The volcano calms... for now.`, 'story');
        }

        console.log(`[WorldState] Delivered ${toDeliver} wards. Total delivered: ${qi.wardsDelivered}`);
        return true;
    },

    // ========================================================================
    // ENDGAME
    // ========================================================================

    /**
     * Called when Malphas is defeated
     */
    onMalphasDefeated() {
        console.log('[WorldState] MALPHAS DEFEATED - Game Victory!');

        persistentState.stats.coreDefeated = true;
        persistentState.victoryAchieved = true;
        persistentState.victoryTimestamp = Date.now();

        // Fire victory event
        window.dispatchEvent(new CustomEvent('gameVictory', {
            detail: {
                worldState: this.getState(),
                loreCollected: this.getCollectedLore().length,
                wardsDelivered: this.getWardCounts().delivered
            }
        }));

        if (typeof addMessage === 'function') {
            addMessage('The Heart of the World falls silent. Malphas is no more.', 'story');
            setTimeout(() => addMessage('The volcano grows still. The town is saved.', 'story'), 3000);
            setTimeout(() => addMessage('But at what cost? The lush green will not return.', 'story'), 6000);
        }
    },

    /**
     * Check if the game has been won
     * @returns {boolean}
     */
    hasAchievedVictory() {
        return persistentState?.victoryAchieved || false;
    }
};

// ============================================================================
// EXPORTS
// ============================================================================

window.WORLD_STATE = WORLD_STATE;
window.WORLD_STATE_NAMES = WORLD_STATE_NAMES;
window.WORLD_STATE_CONFIG = WORLD_STATE_CONFIG;
window.WorldStateSystem = WorldStateSystem;

console.log('[WorldStateSystem] The Bleeding Earth narrative system loaded');
