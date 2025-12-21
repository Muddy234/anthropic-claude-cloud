// === js/data/quests.js ===
// SURVIVAL EXTRACTION UPDATE: Quest definitions
// SIMPLIFIED: All quests from Elder Mira, main story only, 1 active at a time

// ============================================================================
// QUEST DATA
// ============================================================================

const QUEST_DATA = {

    // ========================================================================
    // MAIN STORY QUESTS (All from Elder Mira in Town Square)
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
            items: [{ id: 'health_potion', count: 3 }]
        },
        dialogue: {
            start: 'The Chasm awaits, young delver. Enter, gather what you can, and return alive. That is all I ask for now.',
            progress: 'You have not yet returned from the depths. The extraction shafts are your lifeline - use them.',
            complete: 'You survived! The Chasm has claimed many who did not return. You show promise, delver.'
        },
        prerequisite: null,
        repeatable: false
    },

    intro_deeper: {
        id: 'intro_deeper',
        name: 'Deeper Into the Abyss',
        type: 'main',
        giver: 'elder',
        description: 'Venture deeper into the Chasm. Reach Floor 3 and extract successfully.',
        objectives: [
            { type: 'reach_floor', floor: 3, current: 0, description: 'Reach Floor 3' },
            { type: 'extract', minFloor: 3, count: 1, current: 0, description: 'Extract from Floor 3 or deeper' }
        ],
        rewards: {
            gold: 150,
            items: [{ id: 'emberstone', count: 5 }]
        },
        dialogue: {
            start: 'The upper floors are but a taste of what lies below. True riches - and true danger - await deeper. Reach the third floor and return to me.',
            progress: 'The third floor holds secrets that few have seen. Do not give up now.',
            complete: 'Impressive. You have ventured further than many ever dare. The Chasm respects your courage.'
        },
        prerequisite: 'intro_first_dive',
        repeatable: false
    },

    guardian_hunt: {
        id: 'guardian_hunt',
        name: 'The First Guardian',
        type: 'main',
        giver: 'elder',
        description: 'A powerful Guardian blocks the path to deeper floors. Defeat the Floor 1 Guardian.',
        objectives: [
            { type: 'defeat_guardian', floor: 1, count: 1, current: 0, description: 'Defeat the Floor 1 Guardian' }
        ],
        rewards: {
            gold: 200,
            items: [{ id: 'guardian_heart', count: 1 }],
            unlocks: ['shortcut_floor_2']
        },
        dialogue: {
            start: 'Each floor of the Chasm is protected by a Guardian - ancient creatures of terrible power. The first Guardian bars the way. Defeat it, and Captain Valdris can establish a shortcut for future expeditions.',
            progress: 'The Guardian still lives. It emerges when you venture deep enough into the first floor. Be prepared.',
            complete: 'The Guardian has fallen! You have done what many could not. Valdris will prepare the shortcut. You grow stronger, delver.'
        },
        prerequisite: 'intro_deeper',
        repeatable: false
    },

    core_preparation: {
        id: 'core_preparation',
        name: 'Preparing for the Core',
        type: 'main',
        giver: 'elder',
        description: 'The Core awaits. Gather the materials and strength needed to survive the journey.',
        objectives: [
            { type: 'collect', itemId: 'void_metal', count: 10, current: 0, description: 'Collect Void Metal x10' },
            { type: 'collect', itemId: 'soul_fragment', count: 5, current: 0, description: 'Collect Soul Fragments x5' },
            { type: 'defeat_guardian', floor: 5, count: 1, current: 0, description: 'Defeat the Floor 5 Guardian' }
        ],
        rewards: {
            gold: 1000,
            items: [{ id: 'core_key', count: 1 }],
            unlocks: ['the_core']
        },
        dialogue: {
            start: 'You have proven yourself worthy. But the Core... the Core is something else entirely. Gather these materials, defeat the guardian of the fifth floor, and I will give you the key to what lies below.',
            progress: 'The Core demands sacrifice. Continue your preparations - you are not yet ready.',
            complete: 'At last. You have done everything I asked and more. The Core Key is yours. What awaits below... none truly know. May the Light guide you, delver.'
        },
        prerequisite: 'guardian_hunt',
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
 * Get available quests for player (respects single-quest limit)
 * @param {Object} playerQuests - Player's quest progress
 * @returns {Array}
 */
function getAvailableQuests(playerQuests) {
    const completed = playerQuests.completed || [];
    const active = playerQuests.active || [];

    // If player already has an active quest, no new quests available
    if (active.length > 0) {
        return [];
    }

    return Object.values(QUEST_DATA).filter(quest => {
        // Already completed (main quests are not repeatable)
        if (completed.includes(quest.id)) return false;

        // Check prerequisite
        if (quest.prerequisite && !completed.includes(quest.prerequisite)) {
            return false;
        }

        return true;
    });
}

/**
 * Get the next available quest in the story chain
 * @param {Object} playerQuests - Player's quest progress
 * @returns {Object|null}
 */
function getNextStoryQuest(playerQuests) {
    const available = getAvailableQuests(playerQuests);
    return available.length > 0 ? available[0] : null;
}

/**
 * Check if player can accept a new quest
 * @param {Object} playerQuests - Player's quest progress
 * @returns {boolean}
 */
function canAcceptQuest(playerQuests) {
    const active = playerQuests.active || [];
    return active.length === 0;
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

/**
 * Get total quest count
 * @returns {number}
 */
function getTotalQuestCount() {
    return Object.keys(QUEST_DATA).length;
}

/**
 * Get story progress as percentage
 * @param {Object} playerQuests - Player's quest progress
 * @returns {number} 0-100
 */
function getStoryProgress(playerQuests) {
    const completed = playerQuests.completed || [];
    const total = getTotalQuestCount();
    return Math.floor((completed.length / total) * 100);
}

// ============================================================================
// EXPORTS
// ============================================================================

window.QUEST_DATA = QUEST_DATA;
window.QUEST_OBJECTIVE_TYPES = QUEST_OBJECTIVE_TYPES;
window.getQuest = getQuest;
window.getQuestsByGiver = getQuestsByGiver;
window.getAvailableQuests = getAvailableQuests;
window.getNextStoryQuest = getNextStoryQuest;
window.canAcceptQuest = canAcceptQuest;
window.isObjectiveComplete = isObjectiveComplete;
window.areAllObjectivesComplete = areAllObjectivesComplete;
window.getTotalQuestCount = getTotalQuestCount;
window.getStoryProgress = getStoryProgress;

console.log('[Quests] Quest data loaded (4 main story quests, Elder Mira only)');
