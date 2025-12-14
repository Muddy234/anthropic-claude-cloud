// === js/data/lore-fragments.js ===
// THE BLEEDING EARTH: Lore fragments and collectible story pieces

// ============================================================================
// LORE FRAGMENT DEFINITIONS
// ============================================================================

/**
 * The 5 main lore fragments that reveal the story of the betrayal
 * Found at specific floors, building the narrative toward the twist
 */
const LORE_FRAGMENTS = {

    // ========================================================================
    // FLOOR 1 & 3: FORESHADOWING - "The Great Harvest"
    // ========================================================================

    harvest_record: {
        id: 'harvest_record',
        title: 'Faded Harvest Record',
        floor: 1,
        category: 'history',
        rarity: 'uncommon',
        spawnChance: 0.8,  // High chance on first run
        description: 'A crumbling ledger page from 100 years ago.',
        content: `
            [The text is faded but legible]

            Year of the Great Harvest - 47th Season

            The crops grow three times their usual size. The orchards
            overflow with fruit. Elder Thorne says it is a blessing
            from the mountain. Elder Mira seems troubled.

            The ground is warmer now. Some say they hear whispers
            from the Peak at night. I tell them it is just the wind.

            Note: 15 bushels of wheat sent to the Capital as tribute.
            We have never been so prosperous.
        `,
        hint: 'The village once thrived on heat from below...'
    },

    mira_journal_1: {
        id: 'mira_journal_1',
        title: 'Elder Mira\'s Private Journal (Vol. I)',
        floor: 3,
        category: 'journal',
        rarity: 'rare',
        spawnChance: 0.6,
        description: 'A water-stained journal with familiar handwriting.',
        content: `
            I cannot sleep.

            Thorne speaks of the "Blessing" as if it were a gift.
            But I remember what the Shrine-Keeper said before she died:
            "The warmth is not a gift. It is a heartbeat."

            The old texts speak of Aether-Wards—seals placed by our
            ancestors to keep something dormant. Thorne says they are
            merely temperature regulators. I am not so certain.

            The children have stopped playing near the Peak.
            They say the rocks whisper.
        `,
        hint: 'Elder Mira had doubts from the beginning...'
    },

    // ========================================================================
    // FLOOR 5: THE HERO'S PERSPECTIVE
    // ========================================================================

    hero_journal: {
        id: 'hero_journal',
        title: 'The Last Delver\'s Journal',
        floor: 5,
        category: 'journal',
        rarity: 'rare',
        spawnChance: 0.7,
        description: 'A weathered journal bearing the insignia of a hero.',
        content: `
            Day 15 in the Chasm.

            The Elders sent me to "retrieve fresh Wards" from below.
            But something is wrong. The deeper I go, the more I feel
            watched. Not by monsters—by something vast.

            I found one of the original Wards today. It was... cracked.
            Not from age. The fracture patterns are deliberate.
            Someone broke it intentionally.

            Elder Vallus has been following me. He claims it is for
            "protection." But his hands shake when he speaks. He avoids
            my eyes.

            I confronted Elder Thorne before I descended. He smiled
            and said: "Some sacrifices are necessary for prosperity."

            I don't think they want me to return.
        `,
        hint: 'The hero before you suspected the truth...'
    },

    // ========================================================================
    // FLOOR 7: THE BETRAYAL REVEALED (With The Corpse)
    // ========================================================================

    bloodied_letter: {
        id: 'bloodied_letter',
        title: 'The Bloodied Letter',
        floor: 7,
        category: 'evidence',
        rarity: 'legendary',
        spawnChance: 1.0,  // Always spawns - critical story item
        isQuestItem: true,
        grantsDagger: true,  // Finding this grants the Betrayal Dagger
        description: 'A blood-soaked letter found on a century-old corpse.',
        content: `
            [The letter is stained with old blood]

            To whoever finds this:

            I am Aldric, the one they called "The Hero." I was sent to
            save the village. Instead, I discovered their sin.

            The Elders—Thorne, Mira, and Vallus—cracked the Titan's
            prison 100 years ago. The "Great Harvest" was no blessing.
            They were STEALING the Titan's life force for profit.

            I confronted them. I told them I would expose everything.

            Vallus followed me into the depths. He begged me to stay
            silent. When I refused, he

            [The writing ends abruptly. A ceremonial dagger is embedded
            in the skeleton's back.]

            ---

            Scrawled in different handwriting on the back:
            "Forgive me. Forgive me. Forgive me."
        `,
        hint: 'The hero was murdered. The Elders know why.',
        onCollect: {
            message: 'You found a bloodied letter on a century-old corpse. A ceremonial dagger is embedded in its back.',
            grantItem: 'betrayal_dagger',
            unlockDialogue: 'elder_confrontation'
        }
    },

    // ========================================================================
    // FLOOR 9: THE TRUTH OF MALPHAS
    // ========================================================================

    ancient_tablet: {
        id: 'ancient_tablet',
        title: 'The Binding Tablet',
        floor: 9,
        category: 'ancient',
        rarity: 'legendary',
        spawnChance: 0.9,
        description: 'An obsidian tablet older than the village itself.',
        content: `
            [Carved in an ancient script, miraculously translated]

            MALPHAS, THE HEART OF THE WORLD

            Not a god. Not a demon. A Titan—one of the First Ones
            who shaped the mountains and lit the fires beneath.

            Malphas was not born evil. It was MADE to slumber by
            those who feared its power. The Aether-Wards were not
            protection—they were chains.

            For ten thousand years, it dreamed beneath the Peak.

            The tablet continues:

            "When the seals crack, the Titan wakes. Not in rage,
            but in confusion. It will lash out as a child wakes
            from a nightmare—destroying everything above."

            "There is only one way to end its torment:
            a blade to the Heart, a mercy to the prisoner."

            Malphas does not want to destroy. It wants to be free.
        `,
        hint: 'Malphas is not a god to be worshipped. It is a prisoner to be freed.'
    }
};

// ============================================================================
// LORE PLACEMENT CONFIGURATION
// ============================================================================

/**
 * Defines where and how lore fragments spawn in the dungeon
 */
const LORE_SPAWN_CONFIG = {
    // Lore fragments appear as glowing objects
    visualType: 'glowing_scroll',
    glowColor: '#FFD700',
    interactionRadius: 1,

    // Floor-specific spawn locations
    spawnLocations: {
        1: ['treasure_room', 'altar', 'bookshelf'],
        3: ['hidden_room', 'elder_statue', 'library'],
        5: ['campsite', 'corpse_pile', 'cave_painting'],
        7: ['the_corpse'],  // Special location
        9: ['ancient_shrine', 'obsidian_altar', 'titan_mural']
    },

    // The Corpse - special encounter on Floor 7
    theCorpse: {
        spawnFloor: 7,
        roomType: 'special',
        description: 'A skeletal figure in hero\'s armor, slumped against the wall.',
        interactionText: 'Examine the corpse',
        loreId: 'bloodied_letter',
        visualElements: [
            'skeleton_in_armor',
            'ceremonial_dagger_in_back',
            'scattered_coins',
            'rusted_sword_nearby'
        ]
    }
};

// ============================================================================
// LORE CATEGORY DESCRIPTIONS
// ============================================================================

const LORE_CATEGORIES = {
    history: {
        name: 'Historical Records',
        icon: 'scroll',
        color: '#C4A484',
        description: 'Official records and documents from the village archives.'
    },
    journal: {
        name: 'Personal Journals',
        icon: 'book',
        color: '#8B7355',
        description: 'Private writings that reveal hidden truths.'
    },
    evidence: {
        name: 'Evidence',
        icon: 'magnifying_glass',
        color: '#8B0000',
        description: 'Proof of crimes committed in darkness.'
    },
    ancient: {
        name: 'Ancient Texts',
        icon: 'tablet',
        color: '#4A4A4A',
        description: 'Knowledge from before the village existed.'
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get lore fragment by ID
 * @param {string} loreId
 * @returns {Object|null}
 */
function getLoreFragment(loreId) {
    return LORE_FRAGMENTS[loreId] || null;
}

/**
 * Get all lore fragments for a specific floor
 * @param {number} floor
 * @returns {Array}
 */
function getLoreForFloor(floor) {
    return Object.values(LORE_FRAGMENTS).filter(lore => lore.floor === floor);
}

/**
 * Get all collected lore fragments
 * @returns {Array}
 */
function getCollectedLore() {
    const collected = persistentState?.loreCollected || [];
    return collected.map(id => LORE_FRAGMENTS[id]).filter(Boolean);
}

/**
 * Check if specific lore has been collected
 * @param {string} loreId
 * @returns {boolean}
 */
function hasCollectedLore(loreId) {
    return persistentState?.loreCollected?.includes(loreId) || false;
}

/**
 * Attempt to spawn lore on current floor
 * @param {number} floor
 * @returns {Object|null} Lore to spawn, or null
 */
function trySpawnLore(floor) {
    const floorLore = getLoreForFloor(floor);

    for (const lore of floorLore) {
        // Skip if already collected
        if (hasCollectedLore(lore.id)) continue;

        // Roll for spawn chance
        if (Math.random() <= lore.spawnChance) {
            return lore;
        }
    }

    return null;
}

/**
 * Collect a lore fragment
 * @param {string} loreId
 * @returns {Object} Result with success status and messages
 */
function collectLoreFragment(loreId) {
    const lore = LORE_FRAGMENTS[loreId];
    if (!lore) return { success: false, reason: 'Invalid lore ID' };

    if (hasCollectedLore(loreId)) {
        return { success: false, reason: 'Already collected' };
    }

    // Add to persistent state
    if (!persistentState.loreCollected) {
        persistentState.loreCollected = [];
    }
    persistentState.loreCollected.push(loreId);

    // Handle special lore effects
    const result = {
        success: true,
        lore: lore,
        messages: [`Found: ${lore.title}`]
    };

    // Grant quest item if applicable
    if (lore.grantsDagger && typeof WorldStateSystem !== 'undefined') {
        WorldStateSystem.grantQuestItem('dagger');
        result.messages.push('Obtained: Betrayal Dagger');
        result.grantedItem = 'betrayal_dagger';
    }

    // Special message for The Corpse
    if (lore.onCollect?.message) {
        result.messages.push(lore.onCollect.message);
    }

    console.log(`[Lore] Collected: ${lore.title}`);

    return result;
}

/**
 * Get lore collection progress
 * @returns {Object} { collected, total, percentage }
 */
function getLoreProgress() {
    const total = Object.keys(LORE_FRAGMENTS).length;
    const collected = persistentState?.loreCollected?.length || 0;
    return {
        collected,
        total,
        percentage: Math.floor((collected / total) * 100)
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

window.LORE_FRAGMENTS = LORE_FRAGMENTS;
window.LORE_SPAWN_CONFIG = LORE_SPAWN_CONFIG;
window.LORE_CATEGORIES = LORE_CATEGORIES;

window.getLoreFragment = getLoreFragment;
window.getLoreForFloor = getLoreForFloor;
window.getCollectedLore = getCollectedLore;
window.hasCollectedLore = hasCollectedLore;
window.trySpawnLore = trySpawnLore;
window.collectLoreFragment = collectLoreFragment;
window.getLoreProgress = getLoreProgress;

console.log('[Lore] Lore fragments loaded (5 story pieces)');
