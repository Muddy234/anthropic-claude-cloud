// === js/data/bounties.js ===
// VILLAGE LIFE UPDATE: Bounty board system for repeatable side content

// ============================================================================
// BOUNTY TYPES
// ============================================================================

const BOUNTY_TYPES = {
    KILL: 'kill',           // Kill X monsters of type Y
    COLLECT: 'collect',     // Collect X materials
    REACH: 'reach',         // Reach floor X
    SURVIVE: 'survive',     // Survive for X minutes
    ELITE: 'elite'          // Kill an elite/rare monster
};

// ============================================================================
// BOUNTY DEFINITIONS
// ============================================================================

const BOUNTY_POOL = {

    // ========================================================================
    // KILL BOUNTIES (Common)
    // ========================================================================

    cull_the_weak: {
        id: 'cull_the_weak',
        name: 'Cull the Weak',
        type: BOUNTY_TYPES.KILL,
        description: 'The tunnels are overrun. Thin their numbers.',
        tier: 'common',
        objective: {
            type: 'kill',
            target: 'any',
            count: 10,
            floor: null
        },
        reward: { gold: 50 },
        expiresAfter: 3  // Failed attempts before expiration
    },

    rat_extermination: {
        id: 'rat_extermination',
        name: 'Rat Extermination',
        type: BOUNTY_TYPES.KILL,
        description: 'Giant rats have infested the upper levels.',
        tier: 'common',
        objective: {
            type: 'kill',
            target: 'rat',
            count: 8,
            floor: 1
        },
        reward: { gold: 40 },
        expiresAfter: 3
    },

    skeleton_smashing: {
        id: 'skeleton_smashing',
        name: 'Bone Collector',
        type: BOUNTY_TYPES.KILL,
        description: 'The restless dead walk Floor 2. Put them down.',
        tier: 'common',
        objective: {
            type: 'kill',
            target: 'skeleton',
            count: 12,
            floor: 2
        },
        reward: { gold: 75 },
        expiresAfter: 3
    },

    goblin_menace: {
        id: 'goblin_menace',
        name: 'Goblin Menace',
        type: BOUNTY_TYPES.KILL,
        description: 'A goblin warband has set up camp. Clear them out.',
        tier: 'uncommon',
        objective: {
            type: 'kill',
            target: 'goblin',
            count: 15,
            floor: null
        },
        reward: { gold: 100 },
        expiresAfter: 3
    },

    shadow_hunter: {
        id: 'shadow_hunter',
        name: 'Shadow Hunter',
        type: BOUNTY_TYPES.KILL,
        description: 'Hunt the shadow creatures that lurk in darkness.',
        tier: 'uncommon',
        objective: {
            type: 'kill',
            target: 'shadow',
            count: 8,
            floor: null
        },
        reward: { gold: 125 },
        expiresAfter: 3
    },

    orc_slayer: {
        id: 'orc_slayer',
        name: 'Orc Slayer',
        type: BOUNTY_TYPES.KILL,
        description: 'The orcs grow bold. Show them fear.',
        tier: 'rare',
        objective: {
            type: 'kill',
            target: 'orc',
            count: 6,
            floor: null
        },
        reward: { gold: 200 },
        expiresAfter: 3
    },

    // ========================================================================
    // COLLECTION BOUNTIES
    // ========================================================================

    iron_rush: {
        id: 'iron_rush',
        name: 'Iron Rush',
        type: BOUNTY_TYPES.COLLECT,
        description: 'Tormund needs Chasm Iron for a rush order.',
        tier: 'common',
        objective: {
            type: 'collect',
            target: 'chasm_iron',
            count: 10
        },
        reward: { gold: 60 },
        expiresAfter: 3
    },

    ember_collection: {
        id: 'ember_collection',
        name: 'Ember Collection',
        type: BOUNTY_TYPES.COLLECT,
        description: 'Emberstone is in high demand. Gather what you can.',
        tier: 'uncommon',
        objective: {
            type: 'collect',
            target: 'emberstone',
            count: 5
        },
        reward: { gold: 100 },
        expiresAfter: 3
    },

    crystal_harvest: {
        id: 'crystal_harvest',
        name: 'Crystal Harvest',
        type: BOUNTY_TYPES.COLLECT,
        description: 'Sister Celeste needs holy crystals for the shrine.',
        tier: 'uncommon',
        objective: {
            type: 'collect',
            target: 'holy_crystal',
            count: 3
        },
        reward: { gold: 80, blessing: true },
        expiresAfter: 3
    },

    shadow_essence: {
        id: 'shadow_essence',
        name: 'Shadow Essence',
        type: BOUNTY_TYPES.COLLECT,
        description: 'Dark materials for dark purposes. No questions asked.',
        tier: 'rare',
        objective: {
            type: 'collect',
            target: 'shadow_ore',
            count: 3
        },
        reward: { gold: 175 },
        expiresAfter: 3
    },

    void_metal_quest: {
        id: 'void_metal_quest',
        name: 'Void Metal Acquisition',
        type: BOUNTY_TYPES.COLLECT,
        description: 'The rarest metal in the Chasm. Worth a fortune.',
        tier: 'epic',
        objective: {
            type: 'collect',
            target: 'void_metal',
            count: 2
        },
        reward: { gold: 300 },
        expiresAfter: 5
    },

    // ========================================================================
    // EXPLORATION BOUNTIES
    // ========================================================================

    floor_two_recon: {
        id: 'floor_two_recon',
        name: 'Floor 2 Reconnaissance',
        type: BOUNTY_TYPES.REACH,
        description: 'Scout reports needed from Floor 2.',
        tier: 'common',
        objective: {
            type: 'reach',
            floor: 2
        },
        reward: { gold: 50 },
        expiresAfter: 3
    },

    deep_dive: {
        id: 'deep_dive',
        name: 'Deep Dive',
        type: BOUNTY_TYPES.REACH,
        description: 'Reach Floor 4 and return with intelligence.',
        tier: 'uncommon',
        objective: {
            type: 'reach',
            floor: 4
        },
        reward: { gold: 125 },
        expiresAfter: 3
    },

    abyss_explorer: {
        id: 'abyss_explorer',
        name: 'Abyss Explorer',
        type: BOUNTY_TYPES.REACH,
        description: 'Few have seen Floor 5. Be among them.',
        tier: 'rare',
        objective: {
            type: 'reach',
            floor: 5
        },
        reward: { gold: 200 },
        expiresAfter: 3
    },

    // ========================================================================
    // ELITE/WANTED BOUNTIES
    // ========================================================================

    wanted_goblin_chief: {
        id: 'wanted_goblin_chief',
        name: 'WANTED: Goblin Chieftain',
        type: BOUNTY_TYPES.ELITE,
        description: 'A goblin chieftain leads raids from Floor 2. Eliminate.',
        tier: 'rare',
        objective: {
            type: 'kill',
            target: 'goblin_chief',
            count: 1,
            isElite: true
        },
        reward: { gold: 300 },
        expiresAfter: 5,
        isWanted: true
    },

    wanted_shadow_lord: {
        id: 'wanted_shadow_lord',
        name: 'WANTED: Shadow Wraith',
        type: BOUNTY_TYPES.ELITE,
        description: 'A particularly dangerous shadow creature stalks Floor 4.',
        tier: 'epic',
        objective: {
            type: 'kill',
            target: 'shadow_wraith',
            count: 1,
            isElite: true
        },
        reward: { gold: 500 },
        expiresAfter: 5,
        isWanted: true
    },

    wanted_bone_giant: {
        id: 'wanted_bone_giant',
        name: 'WANTED: Bone Colossus',
        type: BOUNTY_TYPES.ELITE,
        description: 'An animated giant skeleton terrorizes the deep floors.',
        tier: 'epic',
        objective: {
            type: 'kill',
            target: 'bone_colossus',
            count: 1,
            isElite: true
        },
        reward: { gold: 450 },
        expiresAfter: 5,
        isWanted: true
    }
};

// ============================================================================
// RUMOR POOL
// ============================================================================

const RUMOR_POOL = [
    // Floor hints
    {
        id: 'rumor_floor1_secret',
        text: 'Old Garrett swears he found a hidden alcove on Floor 1. Says there\'s always good loot behind cracked walls.',
        hint: 'hidden_rooms',
        floor: 1
    },
    {
        id: 'rumor_floor2_ambush',
        text: 'Watch your step on Floor 2. The skeletons like to play dead until you walk past.',
        hint: 'enemy_behavior',
        floor: 2
    },
    {
        id: 'rumor_floor3_lava',
        text: 'Floor 3 gets hot. Real hot. Bring fire resistance if you can, or know where the cool paths are.',
        hint: 'hazard_warning',
        floor: 3
    },
    {
        id: 'rumor_floor4_shadows',
        text: 'The shadows on Floor 4 hate light. A good torch can save your life down there.',
        hint: 'enemy_weakness',
        floor: 4
    },
    {
        id: 'rumor_floor5_boss',
        text: 'The guardian of Floor 5 has a pattern. Three swings, then it pauses. That\'s your window.',
        hint: 'boss_strategy',
        floor: 5
    },

    // General tips
    {
        id: 'rumor_elite_drops',
        text: 'Elites always drop something good. Risk versus reward, you know?',
        hint: 'elite_rewards'
    },
    {
        id: 'rumor_shift_bonus',
        text: 'During the Shift, everything gets dangerous... but the loot quality doubles.',
        hint: 'shift_mechanics'
    },

    // Lore rumors
    {
        id: 'rumor_core_mystery',
        text: 'Nobody\'s ever come back from the Core. But sometimes... you can hear something down there. Breathing.',
        hint: 'core_lore'
    },
    {
        id: 'rumor_elder_secret',
        text: 'The Elders know more than they let on. Have you noticed how they never go near the Chasm?',
        hint: 'narrative_hint'
    },
    {
        id: 'rumor_shrine_power',
        text: 'Sister Celeste says the shrine\'s light is what keeps the Chasm from swallowing us all. I believe her.',
        hint: 'world_lore'
    }
];

// ============================================================================
// NOTICE POOL (Flavor text)
// ============================================================================

const NOTICE_POOL = [
    {
        id: 'notice_lost_item',
        title: 'LOST',
        text: 'Silver locket with portrait inside. Lost somewhere on Floor 1. Sentimental value only. - Helena',
        type: 'lost'
    },
    {
        id: 'notice_warning',
        title: 'CAUTION',
        text: 'Increased monster activity reported on Floor 3. Travel in groups if possible.',
        type: 'warning'
    },
    {
        id: 'notice_thanks',
        title: 'GRATITUDE',
        text: 'To the delver who saved my husband on Floor 2 last week - we owe you everything. - The Millers',
        type: 'thanks'
    },
    {
        id: 'notice_hiring',
        title: 'HELP WANTED',
        text: 'Experienced delver needed for escort mission. Good pay. See Valdris at Expedition Hall.',
        type: 'job'
    },
    {
        id: 'notice_festival',
        title: 'ANNOUNCEMENT',
        text: 'Village festival next full moon. All delvers welcome. Free ale at The Weary Delver.',
        type: 'event'
    },
    {
        id: 'notice_memorial',
        title: 'IN MEMORIAM',
        text: 'For those lost to the Chasm this season. May the Light guide them home.',
        type: 'memorial'
    },
    {
        id: 'notice_trade',
        title: 'TRADING',
        text: 'Looking to trade Emberstone for Chasm Iron. Fair rates. Ask for Jeb at the tavern.',
        type: 'trade'
    },
    {
        id: 'notice_recipe',
        title: 'RECIPE WANTED',
        text: 'Will pay 100 gold for the fire resistance tonic recipe. Serious inquiries only.',
        type: 'wanted'
    }
];

// ============================================================================
// BOUNTY GENERATION
// ============================================================================

/**
 * Generate a set of bounties for the bulletin board
 * @param {number} count - Number of bounties to generate
 * @param {Object} playerStats - Player's current stats for difficulty scaling
 * @returns {Array} Array of bounty objects
 */
function generateBounties(count = 3, playerStats = {}) {
    const maxFloor = playerStats.maxFloorReached || 1;
    const totalRuns = playerStats.totalRuns || 0;

    // Filter bounties by accessibility
    const availableBounties = Object.values(BOUNTY_POOL).filter(bounty => {
        // Check floor requirements
        if (bounty.objective.floor && bounty.objective.floor > maxFloor + 1) {
            return false;
        }
        if (bounty.objective.minFloor && bounty.objective.minFloor > maxFloor + 1) {
            return false;
        }
        return true;
    });

    // Weight by tier (prefer appropriate difficulty)
    const tierWeights = {
        common: totalRuns < 5 ? 3 : 2,
        uncommon: totalRuns >= 3 ? 2 : 1,
        rare: totalRuns >= 10 ? 2 : (totalRuns >= 5 ? 1 : 0),
        epic: totalRuns >= 20 ? 1 : 0
    };

    // Build weighted pool
    const weightedPool = [];
    availableBounties.forEach(bounty => {
        const weight = tierWeights[bounty.tier] || 1;
        for (let i = 0; i < weight; i++) {
            weightedPool.push(bounty);
        }
    });

    // Select random bounties (no duplicates)
    const selected = [];
    const usedIds = new Set();

    while (selected.length < count && weightedPool.length > 0) {
        const index = Math.floor(Math.random() * weightedPool.length);
        const bounty = weightedPool[index];

        if (!usedIds.has(bounty.id)) {
            usedIds.add(bounty.id);
            selected.push({
                ...bounty,
                progress: 0,
                failedAttempts: 0,
                acceptedAt: null
            });
        }

        // Remove all instances of this bounty from pool
        for (let i = weightedPool.length - 1; i >= 0; i--) {
            if (weightedPool[i].id === bounty.id) {
                weightedPool.splice(i, 1);
            }
        }
    }

    return selected;
}

/**
 * Get a random rumor
 * @param {Array} heardRumors - IDs of rumors already heard
 * @returns {Object|null} Rumor object or null if all heard
 */
function getRandomRumor(heardRumors = []) {
    const unheard = RUMOR_POOL.filter(r => !heardRumors.includes(r.id));

    if (unheard.length === 0) {
        // All heard - return random from full pool
        return RUMOR_POOL[Math.floor(Math.random() * RUMOR_POOL.length)];
    }

    return unheard[Math.floor(Math.random() * unheard.length)];
}

/**
 * Get random notices for the board
 * @param {number} count - Number of notices
 * @returns {Array} Array of notice objects
 */
function getRandomNotices(count = 2) {
    const shuffled = [...NOTICE_POOL].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

/**
 * Check if bounty objective is complete
 * @param {Object} bounty - Active bounty
 * @param {Object} sessionData - Current session data
 * @returns {boolean}
 */
function isBountyComplete(bounty, sessionData = {}) {
    const obj = bounty.objective;

    switch (obj.type) {
        case 'kill':
            return bounty.progress >= obj.count;

        case 'collect':
            return bounty.progress >= obj.count;

        case 'reach':
            return sessionData.maxFloorThisRun >= obj.floor;

        default:
            return false;
    }
}

/**
 * Update bounty progress based on game event
 * @param {Object} bounty - Active bounty
 * @param {string} eventType - Type of event
 * @param {Object} eventData - Event details
 * @returns {number} Progress increment
 */
function updateBountyProgress(bounty, eventType, eventData = {}) {
    const obj = bounty.objective;
    let increment = 0;

    switch (obj.type) {
        case 'kill':
            if (eventType === 'enemy_killed') {
                // Check if target matches
                if (obj.target === 'any' || eventData.enemyType === obj.target) {
                    // Check floor requirement
                    if (!obj.floor || eventData.floor === obj.floor) {
                        // Check elite requirement
                        if (!obj.isElite || eventData.isElite) {
                            increment = 1;
                        }
                    }
                }
            }
            break;

        case 'collect':
            if (eventType === 'item_collected') {
                if (eventData.itemId === obj.target) {
                    increment = eventData.count || 1;
                }
            }
            break;
    }

    bounty.progress += increment;
    return increment;
}

// ============================================================================
// EXPORTS
// ============================================================================

window.BOUNTY_TYPES = BOUNTY_TYPES;
window.BOUNTY_POOL = BOUNTY_POOL;
window.RUMOR_POOL = RUMOR_POOL;
window.NOTICE_POOL = NOTICE_POOL;

window.generateBounties = generateBounties;
window.getRandomRumor = getRandomRumor;
window.getRandomNotices = getRandomNotices;
window.isBountyComplete = isBountyComplete;
window.updateBountyProgress = updateBountyProgress;

console.log('[Bounties] Bulletin board data loaded');
