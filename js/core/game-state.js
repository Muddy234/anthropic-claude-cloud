// === js/core/game-state.js ===

/**
 * ============================================================================
 * STATE AUTHORITY DOCUMENTATION
 * ============================================================================
 *
 * This file defines four state objects. To avoid confusion about which object
 * is authoritative for each piece of data, refer to this guide:
 *
 * ## State Objects Overview:
 *
 * 1. `game` - Legacy dungeon runtime state (during active gameplay)
 *    - Authoritative during dungeon gameplay
 *    - Contains live player data, map data, enemies, etc.
 *    - NOT saved directly - synchronized to session/persistent on save
 *
 * 2. `persistentState` - Permanent progress (survives death)
 *    - Bank storage, stats, quest progress
 *    - SAVED to localStorage
 *
 * 3. `sessionState` - Current run data (lost on death)
 *    - Run tracking, floor info
 *    - SAVED to localStorage (for crash recovery)
 *
 * 4. `villageState` - Village instance (reset on village load)
 *    - Player position in village, NPC interaction, map data
 *    - SAVED to localStorage
 *
 * ## AUTHORITATIVE DATA SOURCES:
 *
 * | Data Type         | Authoritative Source        | Notes                           |
 * |-------------------|-----------------------------|---------------------------------|
 * | Player inventory  | `game.player.inventory`     | Use during dungeon gameplay     |
 * | Player gold       | `game.player.gold`          | @deprecated Use bank for safety |
 * | Player stats      | `game.player.stats`         | Derived from base + equipment   |
 * | Current floor     | `sessionState.currentFloor` | Synced to game.floor on init    |
 * | Bank items        | `persistentState.bank`      | Safe storage between runs       |
 * | Run active status | `sessionState.active`       | True during dungeon run         |
 * | Map/tiles         | `game.map`                  | Generated per floor             |
 *
 * ## DUPLICATE FIELDS (for compatibility):
 *
 * - `game.floor` mirrors `sessionState.currentFloor`
 *   -> sessionState.currentFloor is authoritative
 *
 * - `game.gold` should NOT be used - use `game.player.gold` during run
 *   -> @deprecated Will be removed
 *
 * - `sessionState.inventory` is synced FROM `game.player.inventory`
 *   -> game.player.inventory is authoritative during gameplay
 *   -> sessionState.inventory used for save/load
 *
 * - `sessionState.gold` is synced FROM `game.player.gold`
 *   -> game.player.gold is authoritative during gameplay
 *
 * ## SYNCHRONIZATION POINTS:
 *
 * 1. Run Start: loadout -> sessionState.inventory -> game.player.inventory
 * 2. During Gameplay: Items added directly to game.player.inventory
 * 3. Save/AutoSave: game.player.inventory -> sessionState.inventory (sync)
 *
 * ============================================================================
 */

// ============================================================================
// LEGACY GAME STATE (maintained for compatibility during transition)
// ============================================================================

let game = {
    state: 'menu',
    floor: 1,  // @sync mirrors sessionState.currentFloor
    player: null,
    map: [],
    enemies: [],
    decorations: [],
    merchant: null,
    camera: { x: 0, y: 0, targetX: 0, targetY: 0 },
    exploredTiles: new Set(),
    inventoryTab: 0,
    skillsTab: 0,
    inspectIndex: 0,
    shiftMeter: 0,
    shiftActive: false,
    activeShift: null,
    shiftState: null,
    exitPosition: null,
    shiftCountdown: 600,
    shiftLootMultiplier: 2.0,
    eruption: { timer: 180, lastDamage: 0 },
    keys: {},
    lastMoveTime: 0,
    moveDelay: 150,
    gold: 50,  // @deprecated Use game.player.gold during gameplay
    merchantVisited: false,
    doorways: [],
    lavaVents: [],
    lavaTiles: new Set(),
    rooms: [],
    timeAccumulator: 0,
    roomCount: 0,
    messageLog: [],
    lastMessageTime: 0,
    merchantMsg: "",
    levelUpData: null,
    groundLoot: [],

    pathDown: null,
    miniBoss: null,

    // Main Menu State
    menuState: {
        selectedIndex: 0,
        currentScreen: 'main',  // 'main', 'settings', 'credits'
        hasSaveData: false,
        musicVolume: 70,
        sfxVolume: 80,
        // Ember particle system for atmospheric effects
        embers: []
    }
};

// Load saved menu settings on startup
(function loadMenuSettings() {
    if (typeof localStorage !== 'undefined') {
        try {
            const savedSettings = localStorage.getItem('shiftingChasm_settings');
            if (savedSettings) {
                const settings = JSON.parse(savedSettings);
                if (settings.musicVolume !== undefined) {
                    game.menuState.musicVolume = settings.musicVolume;
                }
                if (settings.sfxVolume !== undefined) {
                    game.menuState.sfxVolume = settings.sfxVolume;
                }
            }
            // Check for save data
            const savedData = localStorage.getItem('shiftingChasm_persistent');
            game.menuState.hasSaveData = savedData !== null;
        } catch (e) {
            console.warn('[GameState] Failed to load menu settings:', e);
        }
    }
})();

// ============================================================================
// PERSISTENT STATE (survives death, saved to localStorage)
// ============================================================================

let persistentState = {
    // Meta information
    saveSlot: 0,
    createdAt: null,
    lastPlayed: null,
    version: 1,

    // Bank storage (safe between runs)
    bank: {
        gold: 0,
        items: [],
        usedSlots: 0,
        capacity: 30
    },

    // Player statistics
    stats: {
        totalRuns: 0,
        deaths: 0,
        totalKills: 0,
        totalGoldEarned: 0,
        victories: 0,
        deepestFloor: 1,
        miniBossesDefeated: 0,
        playtime: 0,
        coreDefeated: false,
        // Tavern game stats
        tavernGamesPlayed: 0,
        tavernGamesWon: 0,
        tavernGoldWon: 0,
        tavernGoldLost: 0,
        // Run outcome tracking for barks
        lastRunDied: false
    },

    // Quest tracking
    quests: {
        available: [],
        active: [],
        completed: []
    },

    // Bounty board system
    bounties: {
        available: [],      // Current bounties on the board
        active: [],         // Bounties the player has accepted
        completed: [],      // IDs of completed bounties
        lastRefresh: null   // Timestamp of last bounty refresh
    },
    rumorsHeard: [],        // IDs of rumors already seen

    // Crafting recipes
    recipes: {
        known: [],
        discovered: []
    },

    // Village state
    village: {
        improvements: [],
        npcStates: {}
    },

    // THE BLEEDING EARTH: World state progression
    worldState: 1,  // 1=NORMAL, 2=ASH, 3=BURNING, 4=ENDGAME
    worldStateHistory: [],

    // Lore collection tracking
    loreCollected: [],

    // Bestiary tracking
    monstersDiscovered: [],
    monsterKillCounts: {},

    // Quest items for main storyline
    questItems: {
        dagger: false,          // Betrayal dagger (unlocks Elder confrontation)
        wardsCollected: 0,      // Aether-Wards found in dungeon
        wardsDelivered: 0       // Wards turned in at Town Hall
    },

    // NPC states (fled, dead, etc.)
    npcStates: {},

    // Victory tracking
    victoryAchieved: false,
    victoryTimestamp: null,

    // Soul & Body: Permanent skill progression (NEVER lost on death)
    skills: null  // Populated by skill-system.js when player is created
};

// ============================================================================
// SESSION STATE (current run, lost on death)
// ============================================================================

let sessionState = {
    // Run status
    active: false,
    runId: null,
    startTime: null,

    // Floor information
    startFloor: 1,
    currentFloor: 1,  // @authoritative - synced to game.floor
    floorTime: 0,
    floorStartTime: null,

    // Carried items (at risk) - @sync from game.player.inventory on save
    inventory: [],
    gold: 0,  // @sync from game.player.gold on save

    // Path to next floor
    pathDown: {
        x: null,
        y: null,
        discovered: false,
        revealed: false
    },

    // Mini-boss status
    miniBossDefeated: false,
    miniBossPosition: null,

    // Auto-save tracking
    lastSaveTime: null,
    savedRoomId: null
};

// ============================================================================
// VILLAGE STATE (current village instance)
// ============================================================================

let villageState = {
    // Player position in village
    playerPosition: {
        x: 25,
        y: 20
    },

    // Current location
    currentBuilding: null,
    insideBuilding: false,

    // NPC interaction
    activeNpc: null,
    dialogueState: null,
    dialogueIndex: 0,

    // Village map data
    map: null,
    buildings: [],
    npcs: [],

    // UI state
    activeMenu: null
};

// ============================================================================
// STATE FACTORY FUNCTIONS
// ============================================================================

/**
 * Create a fresh persistent state for new games
 */
function createNewPersistentState() {
    return {
        saveSlot: 0,
        createdAt: Date.now(),
        lastPlayed: Date.now(),
        version: 1,

        bank: {
            gold: BANKING_CONFIG ? BANKING_CONFIG.startingGold : 50,
            items: [],
            usedSlots: 0,
            capacity: 30
        },

        stats: {
            totalRuns: 0,
            deaths: 0,
            totalKills: 0,
            totalGoldEarned: 0,
            victories: 0,
            deepestFloor: 1,
            miniBossesDefeated: 0,
            playtime: 0,
            coreDefeated: false
        },

        quests: {
            available: [],
            active: [],
            completed: []
        },

        recipes: {
            known: [],
            discovered: []
        },

        village: {
            improvements: [],
            npcStates: {}
        },

        // THE BLEEDING EARTH: World state progression
        worldState: 1,
        worldStateHistory: [{
            state: 1,
            timestamp: Date.now(),
            trigger: 'game_start'
        }],

        loreCollected: [],

        // Bestiary tracking
        monstersDiscovered: [],
        monsterKillCounts: {},

        questItems: {
            dagger: false,
            wardsCollected: 0,
            wardsDelivered: 0
        },

        npcStates: {},

        victoryAchieved: false,
        victoryTimestamp: null,

        // Soul & Body: Permanent skill progression
        skills: null  // Initialized by skill-system.js
    };
}

/**
 * Create a fresh session state for new runs
 */
function createNewSessionState() {
    return {
        active: false,
        runId: null,
        startTime: null,

        startFloor: 1,
        currentFloor: 1,
        floorTime: 0,
        floorStartTime: null,

        inventory: [],
        gold: 0,

        pathDown: {
            x: null,
            y: null,
            discovered: false,
            revealed: false
        },

        miniBossDefeated: false,
        miniBossPosition: null,

        lastSaveTime: null,
        savedRoomId: null
    };
}

/**
 * Create a fresh village state
 */
function createNewVillageState() {
    return {
        playerPosition: {
            x: VILLAGE_CONFIG ? VILLAGE_CONFIG.spawnX : 25,
            y: VILLAGE_CONFIG ? VILLAGE_CONFIG.spawnY : 20
        },

        currentBuilding: null,
        insideBuilding: false,

        activeNpc: null,
        dialogueState: null,
        dialogueIndex: 0,

        map: null,
        buildings: [],
        npcs: [],

        activeMenu: null
    };
}

/**
 * Reset session state (for new runs or after death)
 */
function resetSessionState() {
    const fresh = createNewSessionState();
    Object.keys(fresh).forEach(key => {
        sessionState[key] = fresh[key];
    });
}

/**
 * Reset village state
 */
function resetVillageState() {
    const fresh = createNewVillageState();
    Object.keys(fresh).forEach(key => {
        villageState[key] = fresh[key];
    });
}

/**
 * Load persistent state from save data
 */
function loadPersistentState(saveData) {
    if (!saveData) return false;

    Object.keys(saveData).forEach(key => {
        if (persistentState.hasOwnProperty(key)) {
            persistentState[key] = saveData[key];
        }
    });

    return true;
}

/**
 * Synchronize session state from game state
 * Call this before saving to ensure session reflects current gameplay
 */
function syncSessionFromGame() {
    if (!game.player) return;

    // Sync inventory from game.player (authoritative during gameplay)
    sessionState.inventory = (game.player.inventory || []).map(item => ({ ...item }));

    // Sync gold from game.player
    sessionState.gold = game.player.gold || 0;

    // Sync floor
    sessionState.currentFloor = game.floor || sessionState.currentFloor;
}

/**
 * Initialize starting kit in bank for new players
 */
function initializeStartingKit() {
    if (!BANKING_CONFIG || !BANKING_CONFIG.startingKit) return;

    const kit = BANKING_CONFIG.startingKit;

    // Add weapon
    if (kit.weapon) {
        persistentState.bank.items.push({ ...kit.weapon });
        persistentState.bank.usedSlots++;
    }

    // Add armor
    if (kit.armor) {
        persistentState.bank.items.push({ ...kit.armor });
        persistentState.bank.usedSlots++;
    }

    // Add consumables
    if (kit.consumables) {
        kit.consumables.forEach(item => {
            persistentState.bank.items.push({ ...item });
            persistentState.bank.usedSlots++;
        });
    }

    console.log('[GameState] Starting kit added to bank');
}

// ============================================================================
// BESTIARY TRACKING
// ============================================================================

/**
 * Discover a monster type for the bestiary
 * Called when player first sees/encounters a monster
 * @param {string} monsterName - The monster type name
 */
function discoverMonster(monsterName) {
    if (!monsterName) return;

    // Ensure arrays exist
    if (!persistentState.monstersDiscovered) {
        persistentState.monstersDiscovered = [];
    }

    // Only add if not already discovered
    if (!persistentState.monstersDiscovered.includes(monsterName)) {
        persistentState.monstersDiscovered.push(monsterName);
        console.log(`[Bestiary] Discovered: ${monsterName}`);
    }
}

/**
 * Track a monster kill for the bestiary
 * Called when player defeats a monster
 * @param {string} monsterName - The monster type name
 */
function trackMonsterKill(monsterName) {
    if (!monsterName) return;

    // Ensure object exists
    if (!persistentState.monsterKillCounts) {
        persistentState.monsterKillCounts = {};
    }

    // Increment kill count
    persistentState.monsterKillCounts[monsterName] =
        (persistentState.monsterKillCounts[monsterName] || 0) + 1;

    // Also ensure monster is discovered
    discoverMonster(monsterName);
}

// ============================================================================
// EXPORTS
// ============================================================================

// Make states globally available
window.game = game;
window.persistentState = persistentState;
window.sessionState = sessionState;
window.villageState = villageState;

// Make factory functions globally available
window.createNewPersistentState = createNewPersistentState;
window.createNewSessionState = createNewSessionState;
window.createNewVillageState = createNewVillageState;
window.resetSessionState = resetSessionState;
window.resetVillageState = resetVillageState;
window.loadPersistentState = loadPersistentState;
window.initializeStartingKit = initializeStartingKit;
window.syncSessionFromGame = syncSessionFromGame;

// Bestiary tracking functions
window.discoverMonster = discoverMonster;
window.trackMonsterKill = trackMonsterKill;

console.log('[GameState] State management initialized');
