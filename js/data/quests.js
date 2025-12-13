// === js/data/quests.js ===
// SURVIVAL EXTRACTION UPDATE: Quest definitions

// ============================================================================
// QUEST DATA
// ============================================================================

const QUEST_DATA = {

    // ========================================================================
    // MAIN STORY QUESTS
    // ========================================================================

    intro_first_dive: {
        id: 'intro_first_dive',
        name: 'First Steps Into Darkness',
        type: 'main',
        giver: 'elder',
        description: 'The Elder has asked you to prove yourself by completing your first successful extraction from Floor 1.',
        objectives: [
            { type: 'extract', floor: 1, count: 1, current: 0, description: 'Extract from Floor 1' }
        ],
        rewards: {
            gold: 50,
            items: [{ id: 'health_potion', count: 3 }],
            unlocks: ['intro_deeper']
        },
        dialogue: {
            start: 'The Chasm awaits, young delver. Enter, gather what you can, and return alive. That is all I ask for now.',
            progress: 'You have not yet returned from the depths. The extraction shafts are your lifeline.',
            complete: 'You survived! The Chasm has claimed many who did not return. You show promise.'
        },
        prerequisite: null,
        repeatable: false
    },

    intro_deeper: {
        id: 'intro_deeper',
        name: 'Deeper Into the Abyss',
        type: 'main',
        giver: 'elder',
        description: 'Reach Floor 3 of the Chasm and extract successfully.',
        objectives: [
            { type: 'reach_floor', floor: 3, current: 0, description: 'Reach Floor 3' },
            { type: 'extract', minFloor: 3, count: 1, current: 0, description: 'Extract from Floor 3 or deeper' }
        ],
        rewards: {
            gold: 150,
            items: [{ id: 'emberstone', count: 5 }],
            unlocks: ['guardian_hunt']
        },
        dialogue: {
            start: 'The upper floors are but a taste. True riches lie deeper. Reach the third floor and return.',
            progress: 'The third floor holds secrets. Do not give up.',
            complete: 'Impressive. You have ventured further than many ever dare.'
        },
        prerequisite: 'intro_first_dive',
        repeatable: false
    },

    guardian_hunt: {
        id: 'guardian_hunt',
        name: 'The First Guardian',
        type: 'main',
        giver: 'expedition_master',
        description: 'Defeat the Floor 1 Guardian to unlock the first shortcut.',
        objectives: [
            { type: 'defeat_guardian', floor: 1, count: 1, current: 0, description: 'Defeat Floor 1 Guardian' }
        ],
        rewards: {
            gold: 200,
            items: [{ id: 'guardian_heart', count: 1 }],
            unlocks: ['shortcut_floor_2']
        },
        dialogue: {
            start: 'Each floor has a Guardian - a powerful creature that protects the way down. Defeat the first, and I can establish a shortcut.',
            progress: 'The Guardian still lives. It will appear when you delve deep enough.',
            complete: 'The Guardian has fallen! I\'ll prepare the shortcut immediately.'
        },
        prerequisite: 'intro_deeper',
        repeatable: false
    },

    core_preparation: {
        id: 'core_preparation',
        name: 'Preparing for the Core',
        type: 'main',
        giver: 'elder',
        description: 'Gather the materials needed to survive the journey to the Core.',
        objectives: [
            { type: 'collect', itemId: 'void_metal', count: 10, current: 0, description: 'Collect Void Metal x10' },
            { type: 'collect', itemId: 'soul_fragment', count: 5, current: 0, description: 'Collect Soul Fragments x5' },
            { type: 'defeat_guardian', floor: 5, count: 1, current: 0, description: 'Defeat Floor 5 Guardian' }
        ],
        rewards: {
            gold: 1000,
            items: [{ id: 'core_key', count: 1 }],
            unlocks: ['the_core']
        },
        dialogue: {
            start: 'The Core beckons, but you are not ready. Gather these materials, defeat the final guardian, and I will give you the key.',
            progress: 'The Core demands sacrifice. Continue your preparations.',
            complete: 'At last. The Core Key is yours. What awaits below... none truly know.'
        },
        prerequisite: 'guardian_hunt',
        repeatable: false
    },

    // ========================================================================
    // SIDE QUESTS - COLLECTION
    // ========================================================================

    smith_iron_order: {
        id: 'smith_iron_order',
        name: 'Iron for the Forge',
        type: 'side',
        giver: 'blacksmith',
        description: 'Tormund needs Chasm Iron to fulfill his orders.',
        objectives: [
            { type: 'collect', itemId: 'chasm_iron', count: 20, current: 0, description: 'Collect Chasm Iron x20' }
        ],
        rewards: {
            gold: 100,
            items: [{ id: 'iron_sword', count: 1 }]
        },
        dialogue: {
            start: 'My forge runs cold without materials! Bring me 20 Chasm Iron and I\'ll make it worth your while.',
            progress: 'Still need that iron, delver. The forge waits for no one.',
            complete: 'Ha! Fine iron indeed. Here - take this blade as thanks.'
        },
        prerequisite: 'intro_first_dive',
        repeatable: true,
        cooldown: 3  // Runs before available again
    },

    smith_ember_request: {
        id: 'smith_ember_request',
        name: 'Flames of the Deep',
        type: 'side',
        giver: 'blacksmith',
        description: 'Tormund wants Emberstone to forge fire-enchanted weapons.',
        objectives: [
            { type: 'collect', itemId: 'emberstone', count: 10, current: 0, description: 'Collect Emberstone x10' }
        ],
        rewards: {
            gold: 200,
            items: [{ id: 'flame_sword', count: 1 }]
        },
        dialogue: {
            start: 'I\'ve had a vision of a blade wreathed in eternal flame. Bring me Emberstone!',
            progress: 'The flame calls to me. Find that Emberstone!',
            complete: 'Yes! Feel the heat! This blade will serve you well.'
        },
        prerequisite: 'smith_iron_order',
        repeatable: true,
        cooldown: 5
    },

    // ========================================================================
    // SIDE QUESTS - HUNTING
    // ========================================================================

    innkeeper_pest_control: {
        id: 'innkeeper_pest_control',
        name: 'Pest Control',
        type: 'side',
        giver: 'innkeeper',
        description: 'Clear out the creatures on Floor 1 that have been scaring off travelers.',
        objectives: [
            { type: 'kill', monsterType: 'any', floor: 1, count: 15, current: 0, description: 'Defeat 15 enemies on Floor 1' }
        ],
        rewards: {
            gold: 75,
            items: [{ id: 'health_potion', count: 2 }]
        },
        dialogue: {
            start: 'The creatures on the first floor are getting bold! Thin their numbers for me, would you?',
            progress: 'Keep at it! Every beast you slay is one less to worry about.',
            complete: 'Much better! Here\'s your payment, hero.'
        },
        prerequisite: null,
        repeatable: true,
        cooldown: 2
    },

    patron_revenge: {
        id: 'patron_revenge',
        name: 'Old Debts',
        type: 'side',
        giver: 'patron',
        description: 'Old Garrett wants revenge on the shadow beasts that took his leg.',
        objectives: [
            { type: 'kill', monsterType: 'shadow', count: 10, current: 0, description: 'Defeat 10 shadow creatures' }
        ],
        rewards: {
            gold: 150,
            items: [{ id: 'shadow_thread', count: 3 }]
        },
        dialogue: {
            start: '*slams mug* Those shadow things took my leg! Kill ten of them for me. I\'ll pay well.',
            progress: 'More! Kill more of those cursed shadows!',
            complete: '*nods slowly* That\'ll do. Won\'t bring back my leg, but... thanks.'
        },
        prerequisite: 'intro_deeper',
        repeatable: true,
        cooldown: 4
    },

    // ========================================================================
    // SIDE QUESTS - EXPLORATION
    // ========================================================================

    scout_mapping: {
        id: 'scout_mapping',
        name: 'Cartographer\'s Request',
        type: 'side',
        giver: 'scout',
        description: 'Explore all rooms on Floor 2 in a single run.',
        objectives: [
            { type: 'explore_floor', floor: 2, percentage: 100, current: 0, description: 'Explore 100% of Floor 2' }
        ],
        rewards: {
            gold: 125,
            items: [{ id: 'map_fragment', count: 1 }]
        },
        dialogue: {
            start: 'My maps are incomplete. Explore every corner of Floor 2 and I\'ll reward you.',
            progress: 'Keep exploring. Leave no room unseen.',
            complete: 'Excellent! This data is invaluable. Here\'s your reward.'
        },
        prerequisite: 'intro_deeper',
        repeatable: true,
        cooldown: 3
    },

    // ========================================================================
    // SIDE QUESTS - SPECIAL
    // ========================================================================

    priestess_cleansing: {
        id: 'priestess_cleansing',
        name: 'Purification Ritual',
        type: 'side',
        giver: 'priestess',
        description: 'Collect holy crystals from the shrine rooms of the Chasm.',
        objectives: [
            { type: 'collect', itemId: 'holy_crystal', count: 5, current: 0, description: 'Collect Holy Crystals x5' }
        ],
        rewards: {
            gold: 100,
            blessing: 'protection'  // Special reward
        },
        dialogue: {
            start: 'The Light fades in the depths. Find the holy crystals in shrine rooms - they will help me maintain the barrier.',
            progress: 'The crystals... I can sense them calling to you. Find them.',
            complete: 'The Light grows stronger! Accept this blessing as thanks.'
        },
        prerequisite: 'intro_first_dive',
        repeatable: true,
        cooldown: 5
    },

    banker_investment: {
        id: 'banker_investment',
        name: 'A Sound Investment',
        type: 'side',
        giver: 'banker',
        description: 'Deposit a large sum of gold to prove your worth as a client.',
        objectives: [
            { type: 'deposit_gold', amount: 500, current: 0, description: 'Deposit 500 gold' }
        ],
        rewards: {
            bankExpansion: 10,  // Extra bank slots
            interestRate: 0.01  // 1% interest on deposits
        },
        dialogue: {
            start: 'I offer premium services to serious clients. Deposit 500 gold and I\'ll expand your vault.',
            progress: 'Gold talks, delver. Show me you\'re serious.',
            complete: 'A wise investment. Your vault is now larger, and I\'ll pay interest on your balance.'
        },
        prerequisite: 'intro_first_dive',
        repeatable: false
    }
};

// ============================================================================
// QUEST OBJECTIVE TYPES
// ============================================================================

const QUEST_OBJECTIVE_TYPES = {
    extract: 'Successfully extract from the dungeon',
    reach_floor: 'Reach a specific floor',
    defeat_guardian: 'Defeat a floor guardian',
    collect: 'Collect specific items',
    kill: 'Defeat specific enemies',
    explore_floor: 'Explore percentage of a floor',
    deposit_gold: 'Deposit gold in the bank'
};

// ============================================================================
// QUEST HELPER FUNCTIONS
// ============================================================================

/**
 * Get quest by ID
 * @param {string} questId
 * @returns {Object|null}
 */
function getQuest(questId) {
    return QUEST_DATA[questId] || null;
}

/**
 * Get all quests from a specific NPC
 * @param {string} npcId
 * @returns {Array}
 */
function getQuestsByGiver(npcId) {
    return Object.values(QUEST_DATA).filter(q => q.giver === npcId);
}

/**
 * Get available quests for player
 * @param {Object} playerQuests - Player's quest progress
 * @returns {Array}
 */
function getAvailableQuests(playerQuests) {
    const completed = playerQuests.completed || [];
    const active = playerQuests.active || [];

    return Object.values(QUEST_DATA).filter(quest => {
        // Already active
        if (active.some(a => a.id === quest.id)) return false;

        // Already completed (unless repeatable)
        if (completed.includes(quest.id) && !quest.repeatable) return false;

        // Check cooldown for repeatable quests
        if (quest.repeatable && completed.includes(quest.id)) {
            const lastCompletion = playerQuests.lastCompletion?.[quest.id] || 0;
            const runsSince = (persistentState?.stats?.totalRuns || 0) - lastCompletion;
            if (runsSince < quest.cooldown) return false;
        }

        // Check prerequisite
        if (quest.prerequisite && !completed.includes(quest.prerequisite)) {
            return false;
        }

        return true;
    });
}

/**
 * Check if quest objective is complete
 * @param {Object} objective
 * @returns {boolean}
 */
function isObjectiveComplete(objective) {
    if (objective.count !== undefined) {
        return objective.current >= objective.count;
    }
    if (objective.percentage !== undefined) {
        return objective.current >= objective.percentage;
    }
    if (objective.amount !== undefined) {
        return objective.current >= objective.amount;
    }
    return false;
}

/**
 * Check if all objectives are complete
 * @param {Array} objectives
 * @returns {boolean}
 */
function areAllObjectivesComplete(objectives) {
    return objectives.every(obj => isObjectiveComplete(obj));
}

// ============================================================================
// EXPORTS
// ============================================================================

window.QUEST_DATA = QUEST_DATA;
window.QUEST_OBJECTIVE_TYPES = QUEST_OBJECTIVE_TYPES;
window.getQuest = getQuest;
window.getQuestsByGiver = getQuestsByGiver;
window.getAvailableQuests = getAvailableQuests;
window.isObjectiveComplete = isObjectiveComplete;
window.areAllObjectivesComplete = areAllObjectivesComplete;

console.log('[Quests] Quest data loaded');
