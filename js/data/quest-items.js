// === js/data/quest-items.js ===
// THE BLEEDING EARTH: Quest items for main storyline

// ============================================================================
// QUEST ITEM DEFINITIONS
// ============================================================================

const QUEST_ITEMS = {

    // ========================================================================
    // AETHER-WARDS (Collectible, deliverable)
    // ========================================================================

    aether_ward: {
        id: 'aether_ward',
        name: 'Aether-Ward',
        type: 'quest',
        category: 'story',
        rarity: 'rare',
        stackable: true,
        maxStack: 10,
        icon: 'ward',
        color: '#00CED1',
        description: 'An ancient seal pulsing with cooling energy. Warm to the touch, like a sleeping heartbeat.',
        loreDescription: 'These seals were placed by the First Settlers to keep the Titan dormant. They regulate the volcano\'s heat—or so the Elders claim.',

        // Spawn configuration
        spawnFloors: [2, 3, 4, 5, 6, 7, 8, 9],
        spawnChance: 0.15,  // 15% per eligible room
        spawnLocations: ['treasure_room', 'altar', 'ward_chamber', 'boss_drop'],

        // Gameplay effects
        value: 100,  // Gold value if sold (discouraged)
        canSell: true,
        sellWarning: 'Are you sure? The village needs these Wards.',

        // Turn-in
        turnInNpc: 'elder_mira',
        turnInLocation: 'town_square',
        turnInReward: {
            gold: 50,
            reputation: 10,
            dialogue: 'ward_delivered'
        }
    },

    // ========================================================================
    // BETRAYAL DAGGER (Unique quest item)
    // ========================================================================

    betrayal_dagger: {
        id: 'betrayal_dagger',
        name: 'Ceremonial Dagger',
        type: 'quest',
        category: 'evidence',
        rarity: 'legendary',
        stackable: false,
        icon: 'dagger_bloodied',
        color: '#8B0000',
        description: 'A ceremonial dagger stained with century-old blood. Its handle bears the Elder seal.',
        loreDescription: 'Found embedded in the back of a hero\'s corpse. Someone wanted to make sure he never returned. The blood has long dried, but the guilt remains fresh.',

        // This item is granted by collecting the "bloodied_letter" lore
        grantedByLore: 'bloodied_letter',

        // Cannot be sold or dropped
        canSell: false,
        canDrop: false,

        // Unlocks special dialogue
        unlocksDialogue: ['elder_mira_confrontation', 'elder_thorne_confrontation', 'elder_vallus_confrontation'],

        // Special display
        glowEffect: true,
        glowColor: '#8B0000'
    },

    // ========================================================================
    // HERO'S JOURNAL (Optional collectible)
    // ========================================================================

    heros_journal: {
        id: 'heros_journal',
        name: 'Aldric\'s Journal',
        type: 'quest',
        category: 'lore',
        rarity: 'epic',
        stackable: false,
        icon: 'journal',
        color: '#8B7355',
        description: 'The personal journal of the hero Aldric. Water-damaged but still legible.',
        loreDescription: 'Contains the last thoughts of a man who discovered the truth too late. His final entry speaks of betrayal.',

        // Found near The Corpse on Floor 7
        spawnFloors: [7],
        spawnChance: 1.0,
        spawnLocations: ['the_corpse'],

        // Cannot be sold
        canSell: false,

        // Adds journal entries to lore
        grantsLore: ['hero_journal']
    },

    // ========================================================================
    // TITAN'S TEAR (Optional powerful item)
    // ========================================================================

    titans_tear: {
        id: 'titans_tear',
        name: 'Titan\'s Tear',
        type: 'quest',
        category: 'artifact',
        rarity: 'legendary',
        stackable: false,
        icon: 'crystal_tear',
        color: '#FF6347',
        description: 'A crystallized tear from the Titan Malphas. It radiates immense heat and sorrow.',
        loreDescription: 'The Titan has wept for ten thousand years. Each tear crystallizes into pure elemental essence. To hold one is to feel its ancient pain.',

        // Only spawns in Floor 9-10
        spawnFloors: [9, 10],
        spawnChance: 0.25,
        spawnLocations: ['lava_shrine', 'titan_altar'],

        // Combat bonus
        equipEffect: {
            fireDamage: 25,
            fireResist: 50,
            description: '+25 Fire Damage, +50% Fire Resistance'
        },

        // Very valuable
        value: 500,
        canSell: true
    }
};

// ============================================================================
// QUEST ITEM SPAWNING
// ============================================================================

/**
 * Check if a quest item should spawn on the current floor
 * @param {string} itemId - Quest item ID
 * @param {number} floor - Current floor
 * @returns {boolean}
 */
function shouldSpawnQuestItem(itemId, floor) {
    const item = QUEST_ITEMS[itemId];
    if (!item || !item.spawnFloors) return false;

    // Check if floor is valid
    if (!item.spawnFloors.includes(floor)) return false;

    // Check spawn chance
    return Math.random() <= item.spawnChance;
}

/**
 * Get all possible quest item spawns for a floor
 * @param {number} floor
 * @returns {Array} Array of item IDs that could spawn
 */
function getPossibleQuestItems(floor) {
    return Object.values(QUEST_ITEMS)
        .filter(item => item.spawnFloors?.includes(floor))
        .map(item => item.id);
}

/**
 * Try to spawn quest items for a room
 * @param {number} floor
 * @param {string} roomType
 * @returns {Array} Array of spawned item objects
 */
function spawnQuestItemsForRoom(floor, roomType) {
    const spawned = [];

    for (const item of Object.values(QUEST_ITEMS)) {
        if (!item.spawnFloors?.includes(floor)) continue;
        if (!item.spawnLocations?.includes(roomType)) continue;

        // Special case: Dagger is granted by lore, not spawned
        if (item.grantedByLore) continue;

        if (Math.random() <= item.spawnChance) {
            spawned.push(createQuestItem(item.id));
        }
    }

    return spawned;
}

/**
 * Create a quest item instance
 * @param {string} itemId
 * @returns {Object} Item instance
 */
function createQuestItem(itemId) {
    const template = QUEST_ITEMS[itemId];
    if (!template) return null;

    return {
        ...template,
        instanceId: `${itemId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        count: 1,
        collected: false,
        collectedAt: null,
        collectedFloor: null
    };
}

// ============================================================================
// QUEST ITEM COLLECTION
// ============================================================================

/**
 * Collect a quest item
 * @param {string} itemId
 * @param {number} floor
 * @returns {Object} Result with messages
 */
function collectQuestItem(itemId, floor) {
    const item = QUEST_ITEMS[itemId];
    if (!item) return { success: false, reason: 'Unknown item' };

    const result = {
        success: true,
        item: item,
        messages: [`Found: ${item.name}`]
    };

    // Handle Aether-Wards
    if (itemId === 'aether_ward') {
        if (!persistentState.questItems) {
            persistentState.questItems = { dagger: false, wardsCollected: 0, wardsDelivered: 0 };
        }
        persistentState.questItems.wardsCollected++;
        result.messages.push(`Aether-Wards: ${persistentState.questItems.wardsCollected}`);
    }

    // Handle items that grant lore
    if (item.grantsLore && typeof collectLoreFragment === 'function') {
        item.grantsLore.forEach(loreId => {
            collectLoreFragment(loreId);
        });
    }

    // Handle items with special effects
    if (item.unlocksDialogue) {
        result.unlockedDialogue = item.unlocksDialogue;
    }

    console.log(`[QuestItems] Collected: ${item.name}`);
    return result;
}

// ============================================================================
// WARD DELIVERY SYSTEM
// ============================================================================

/**
 * Deliver collected Wards to the Elders
 * @returns {Object} Delivery result
 */
function deliverWards() {
    const qi = persistentState?.questItems;
    if (!qi) return { success: false, reason: 'No quest state' };

    const available = qi.wardsCollected - qi.wardsDelivered;
    if (available <= 0) {
        return { success: false, reason: 'No Wards to deliver' };
    }

    // Calculate reward
    const goldReward = available * 50;
    const wardItem = QUEST_ITEMS.aether_ward;

    // Update state
    qi.wardsDelivered = qi.wardsCollected;

    // Add gold to bank
    if (typeof BankingSystem !== 'undefined') {
        BankingSystem.depositGold(goldReward);
    } else if (persistentState.bank) {
        persistentState.bank.gold += goldReward;
    }

    const result = {
        success: true,
        wardsDelivered: available,
        goldReward: goldReward,
        messages: [
            `Delivered ${available} Aether-Ward(s)`,
            `Received ${goldReward} gold`,
            'The volcano calms... for now.'
        ]
    };

    // Check world state - delivering wards doesn't stop progression
    // but it does give the player a sense of contribution
    if (typeof addMessage === 'function') {
        result.messages.forEach(msg => addMessage(msg, 'story'));
    }

    console.log(`[QuestItems] Delivered ${available} Wards for ${goldReward} gold`);
    return result;
}

/**
 * Get current Ward status
 * @returns {Object} { collected, delivered, available }
 */
function getWardStatus() {
    const qi = persistentState?.questItems || { wardsCollected: 0, wardsDelivered: 0 };
    return {
        collected: qi.wardsCollected,
        delivered: qi.wardsDelivered,
        available: qi.wardsCollected - qi.wardsDelivered
    };
}

// ============================================================================
// DAGGER SYSTEM
// ============================================================================

/**
 * Check if player has the Betrayal Dagger
 * @returns {boolean}
 */
function hasBetrayalDagger() {
    return persistentState?.questItems?.dagger === true;
}

/**
 * Grant the Betrayal Dagger (called when finding bloodied_letter)
 */
function grantBetrayalDagger() {
    if (!persistentState.questItems) {
        persistentState.questItems = { dagger: false, wardsCollected: 0, wardsDelivered: 0 };
    }

    if (!persistentState.questItems.dagger) {
        persistentState.questItems.dagger = true;

        if (typeof addMessage === 'function') {
            addMessage('You take the Ceremonial Dagger from the corpse\'s back.', 'quest');
            addMessage('The Elders will answer for this.', 'story');
        }

        console.log('[QuestItems] Betrayal Dagger granted');
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

window.QUEST_ITEMS = QUEST_ITEMS;

window.shouldSpawnQuestItem = shouldSpawnQuestItem;
window.getPossibleQuestItems = getPossibleQuestItems;
window.spawnQuestItemsForRoom = spawnQuestItemsForRoom;
window.createQuestItem = createQuestItem;
window.collectQuestItem = collectQuestItem;

window.deliverWards = deliverWards;
window.getWardStatus = getWardStatus;
window.hasBetrayalDagger = hasBetrayalDagger;
window.grantBetrayalDagger = grantBetrayalDagger;

// Quest item system loaded
