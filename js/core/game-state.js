// === js/core/game-state.js ===
// SURVIVAL EXTRACTION UPDATE: Added persistent, session, and village state

// ============================================================================
// LEGACY GAME STATE (maintained for compatibility during transition)
// ============================================================================

let game = {
    state: 'menu',
    floor: 1,
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
    gold: 50,
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

    // NEW: Extraction system additions
    extractionPoints: [],
    pathDown: null,
    miniBoss: null,
    activeExtractionPoint: null
};

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
        usedSlots: 0
    },

    // Floor progression
    shortcuts: {
        unlockedFloors: [1],
        extractedFrom: {}
    },

    // Floor degradation tracking
    degradation: {
        stage: 1,
        floorMultipliers: {}
    },

    // Player statistics
    stats: {
        totalRuns: 0,
        successfulExtractions: 0,
        deaths: 0,
        deepestFloor: 1,
        totalGoldExtracted: 0,
        totalMaterialsExtracted: 0,
        miniBossesDefeated: 0,
        playtime: 0,
        coreDefeated: false
    },

    // Quest tracking
    quests: {
        available: [],
        active: [],
        completed: []
    },

    // Crafting recipes
    recipes: {
        known: [],
        discovered: []
    },

    // Village state
    village: {
        degradationStage: 1,
        improvements: [],
        npcStates: {}
    },

    // Death drop (for rescue runs)
    deathDrop: null
};

// ============================================================================
// SESSION STATE (current run, lost on death unless rescued)
// ============================================================================

let sessionState = {
    // Run status
    active: false,
    runId: null,
    startTime: null,

    // Floor information
    startFloor: 1,
    currentFloor: 1,
    floorTime: 0,
    floorStartTime: null,

    // Carried items (at risk)
    inventory: [],
    gold: 0,

    // Extraction points for current floor
    extractionPoints: [],
    collapseQueue: [],

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

    // Rescue run tracking
    isRescueRun: false,
    deathDropCollected: false,

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
    activeMenu: null,
    selectedShortcutFloor: 1
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
            usedSlots: 0
        },

        shortcuts: {
            unlockedFloors: [1],
            extractedFrom: {}
        },

        degradation: {
            stage: 1,
            floorMultipliers: {}
        },

        stats: {
            totalRuns: 0,
            successfulExtractions: 0,
            deaths: 0,
            deepestFloor: 1,
            totalGoldExtracted: 0,
            totalMaterialsExtracted: 0,
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
            degradationStage: 1,
            improvements: [],
            npcStates: {}
        },

        deathDrop: null
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

        extractionPoints: [],
        collapseQueue: [],

        pathDown: {
            x: null,
            y: null,
            discovered: false,
            revealed: false
        },

        miniBossDefeated: false,
        miniBossPosition: null,

        isRescueRun: false,
        deathDropCollected: false,

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

        activeMenu: null,
        selectedShortcutFloor: 1
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

console.log('[GameState] State management initialized (Survival Extraction v1)');