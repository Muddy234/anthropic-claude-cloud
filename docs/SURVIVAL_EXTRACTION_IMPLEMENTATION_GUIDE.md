# The Shifting Chasm — Survival Extraction Implementation Guide

**Version:** 1.0
**Date:** December 2025
**Target:** MVP (6 Floors + Core)

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase 0: Foundation](#phase-0-foundation)
4. [Phase 1: Save System](#phase-1-save-system)
5. [Phase 2: Persistent State](#phase-2-persistent-state)
6. [Phase 3: Banking System](#phase-3-banking-system)
7. [Phase 4: Extraction System](#phase-4-extraction-system)
8. [Phase 5: Village Hub](#phase-5-village-hub)
9. [Phase 6: Materials & Economy](#phase-6-materials--economy)
10. [Phase 7: Quest System](#phase-7-quest-system)
11. [Phase 8: Progression Systems](#phase-8-progression-systems)
12. [Phase 9: Crafting System](#phase-9-crafting-system)
13. [Phase 10: The Core](#phase-10-the-core)
14. [Phase 11: Polish & Integration](#phase-11-polish--integration)
15. [Testing Checkpoints](#testing-checkpoints)
16. [Risk Register](#risk-register)

---

## Overview

### What We're Building

Transforming the current single-run roguelike into a survival extraction game with:
- Surface village hub (the "breather" between runs)
- Risk/reward extraction mechanic (keep loot or push deeper)
- Persistent progression across runs (banking, shortcuts, upgrades)
- 40-60 run journey to reach The Core and save the village

### MVP Scope

| Element | MVP Target |
|---------|------------|
| Floors | 6 + Core |
| Village NPCs | 6 (3 functional, 3 personal) |
| Quests | 5-8 hand-crafted |
| Degradation Stages | 2 |
| Save Slots | 3 |
| Crafting Recipes | 20-30 |

### Key Architecture Changes

```
CURRENT                          NEW
───────                          ───
Single game state         →      Persistent + Session + Village states
Shift = lava destruction  →      Extraction = shaft collapse pressure
Death = restart           →      Death = drop inventory, rescue run
No meta-progression       →      Banking, shortcuts, upgrades
Menu start                →      Village hub start
```

---

## Prerequisites

Before starting implementation:

- [ ] Back up current codebase (create `pre-extraction-backup` branch)
- [ ] Ensure all current tests pass
- [ ] Review current `game-state.js` structure
- [ ] Review current `shift-system.js` for reusable logic
- [ ] Confirm asset pipeline for new sprites

---

## Phase 0: Foundation

**Goal:** Establish new state structures without breaking existing game.

**Duration Estimate:** Foundation work

### Step 0.1: Create Constants for New Systems

**File:** `js/core/constants.js`

Add the following configuration blocks:

```javascript
// === EXTRACTION CONFIG ===
const EXTRACTION_CONFIG = {
    shaftsPerFloor: {
        1: 3, 2: 3, 3: 3,
        4: 4, 5: 4, 6: 4
    },
    floorDuration: 720000,           // 12 minutes in ms
    collapseSchedule: [0.4, 0.65, 0.83, 0.92], // % of duration
    warningDuration: 20000,          // 20 seconds warning
    warningStages: {
        rumble: 20000,    // 20s before
        debris: 10000,    // 10s before
        critical: 5000    // 5s before
    }
};

// === VILLAGE CONFIG ===
const VILLAGE_CONFIG = {
    mapWidth: 50,
    mapHeight: 40,
    buildings: {
        home: { width: 8, height: 6, interior: true },
        shop: { width: 6, height: 5, interior: true },
        smithy: { width: 7, height: 5, interior: true },
        bank: { width: 5, height: 4, interior: false },
        farm: { width: 10, height: 8, interior: false },
        stable: { width: 6, height: 6, interior: false }
    }
};

// === BANKING CONFIG ===
const BANKING_CONFIG = {
    maxSlots: 100,
    startingGold: 50,
    startingKit: {
        weapon: 'worn_sword',
        armor: 'cloth_armor',
        consumables: [
            { id: 'health_potion_small', count: 2 }
        ]
    }
};

// === DEGRADATION CONFIG ===
const DEGRADATION_CONFIG = {
    stages: {
        1: { floors: [1, 2], dropMultiplier: 1.0 },
        2: { floors: [3, 4], dropMultiplier: 0.85 },
        3: { floors: [5, 6], dropMultiplier: 0.70 },
        4: { floors: ['core'], dropMultiplier: 0.55 }
    },
    minimum: 0.40,   // Floor never goes below 40%
    stepReduction: 0.15  // Each extraction reduces by 15%
};

// === FLOOR TIER CONFIG ===
const FLOOR_TIER_CONFIG = {
    tier1: { floors: [1, 2, 3], gearLevel: 'shop' },
    tier2: { floors: [4, 5, 6], gearLevel: 'crafted_t1' },
    core: { floors: ['core'], gearLevel: 'crafted_t2' }
};

// === QUEST CONFIG ===
const QUEST_CONFIG = {
    maxActive: 5,
    types: ['fetch', 'improvement', 'rescue', 'lore']
};

// === SAVE CONFIG ===
const SAVE_CONFIG = {
    maxSlots: 3,
    autoSaveInterval: 30000,  // 30 seconds
    storageKey: 'shifting_chasm_save'
};
```

### Step 0.2: Extend Game State Structure

**File:** `js/core/game-state.js`

Add new state objects alongside existing `game` object:

```javascript
// Persistent state (survives death, saved to localStorage)
const persistentState = {
    // Meta
    saveSlot: 0,
    createdAt: null,
    lastPlayed: null,

    // Bank
    bank: {
        gold: BANKING_CONFIG.startingGold,
        items: [],      // Array of item objects
        usedSlots: 0
    },

    // Progression
    shortcuts: {
        unlockedFloors: [1],  // Always start with floor 1
        extractedFrom: {}      // { floorNum: extractionCount }
    },

    // Degradation
    degradation: {
        stage: 1,
        floorMultipliers: {}  // { floorNum: multiplier }
    },

    // Stats
    stats: {
        totalRuns: 0,
        successfulExtractions: 0,
        deaths: 0,
        deepestFloor: 1,
        totalGoldExtracted: 0,
        totalMaterialsExtracted: 0,
        bossesDefeated: 0,
        playtime: 0
    },

    // Quests
    quests: {
        available: [],
        active: [],
        completed: []
    },

    // Recipes
    recipes: {
        known: [],       // Recipe IDs player knows
        discovered: []   // Recipes found but not yet learned
    },

    // Village
    village: {
        degradationStage: 1,
        improvements: [],
        npcStates: {}    // { npcId: { flags... } }
    }
};

// Session state (current run, lost on death unless rescued)
const sessionState = {
    active: false,

    // Run info
    runId: null,
    startTime: null,
    startFloor: 1,
    currentFloor: 1,

    // Carried items (at risk)
    inventory: [],
    gold: 0,

    // Extraction
    extractionPoints: [],  // { id, x, y, status, collapseTime }
    pathDown: null,        // { x, y, discovered }

    // Death recovery
    deathDrop: null,       // { floor, x, y, items, gold } or null
    isRescueRun: false,

    // Floor state
    floorTime: 0,
    miniBossDefeated: false,

    // Auto-save data
    lastSaveTime: null,
    savedRoomId: null
};

// Village state (current village instance)
const villageState = {
    playerPosition: { x: 25, y: 20 },
    currentBuilding: null,  // null or building ID if inside
    activeNpc: null,        // NPC currently talking to
    dialogueState: null     // Current dialogue node
};
```

### Step 0.3: Add New Game States

**File:** `js/core/game-state.js`

Extend the valid game states:

```javascript
// Valid game.state values
const GAME_STATES = {
    MENU: 'menu',
    VILLAGE: 'village',           // NEW: Surface hub
    LOADING: 'loading',           // NEW: Transition state
    PLAYING: 'playing',           // In dungeon
    PAUSED: 'paused',
    CHEST: 'chest',
    DIALOGUE: 'dialogue',         // NEW: Talking to NPC
    SHOP: 'shop',
    BANK: 'bank',                 // NEW: Bank interface
    CRAFTING: 'crafting',         // NEW: Crafting interface
    LOADOUT: 'loadout',           // NEW: Pre-run loadout
    EXTRACTION: 'extraction',     // NEW: At extraction shaft
    GAMEOVER: 'gameover',
    VICTORY: 'victory'
};
```

### Step 0.4: Create State Initialization Functions

**File:** `js/core/game-state.js`

```javascript
function createNewPersistentState() {
    return JSON.parse(JSON.stringify(persistentState));
}

function createNewSessionState() {
    return JSON.parse(JSON.stringify(sessionState));
}

function createNewVillageState() {
    return JSON.parse(JSON.stringify(villageState));
}

function resetSessionState() {
    Object.assign(sessionState, createNewSessionState());
}
```

### Acceptance Criteria — Phase 0

- [ ] New constants defined and accessible globally
- [ ] State structures defined but not yet used
- [ ] Existing game still runs unchanged
- [ ] No console errors on load

---

## Phase 1: Save System

**Goal:** Implement localStorage save/load with 3 slots.

**Dependencies:** Phase 0 complete

### Step 1.1: Create Save Manager

**File:** `js/core/save-manager.js` (NEW)

```javascript
const SaveManager = {
    storageKey: SAVE_CONFIG.storageKey,

    // Get all saves metadata
    getSaveSlots() {
        const saves = [];
        for (let i = 0; i < SAVE_CONFIG.maxSlots; i++) {
            const data = localStorage.getItem(`${this.storageKey}_${i}`);
            if (data) {
                const parsed = JSON.parse(data);
                saves.push({
                    slot: i,
                    exists: true,
                    lastPlayed: parsed.persistent.lastPlayed,
                    playtime: parsed.persistent.stats.playtime,
                    deepestFloor: parsed.persistent.stats.deepestFloor,
                    gold: parsed.persistent.bank.gold
                });
            } else {
                saves.push({ slot: i, exists: false });
            }
        }
        return saves;
    },

    // Save current state to slot
    save(slot) {
        if (slot < 0 || slot >= SAVE_CONFIG.maxSlots) {
            console.error('Invalid save slot:', slot);
            return false;
        }

        const saveData = {
            version: 1,
            timestamp: Date.now(),
            persistent: persistentState,
            session: sessionState.active ? sessionState : null,
            village: villageState
        };

        try {
            localStorage.setItem(
                `${this.storageKey}_${slot}`,
                JSON.stringify(saveData)
            );
            console.log(`Game saved to slot ${slot}`);
            return true;
        } catch (e) {
            console.error('Save failed:', e);
            return false;
        }
    },

    // Load from slot
    load(slot) {
        if (slot < 0 || slot >= SAVE_CONFIG.maxSlots) {
            console.error('Invalid save slot:', slot);
            return null;
        }

        const data = localStorage.getItem(`${this.storageKey}_${slot}`);
        if (!data) {
            console.log(`No save in slot ${slot}`);
            return null;
        }

        try {
            const parsed = JSON.parse(data);
            // Version migration would go here
            return parsed;
        } catch (e) {
            console.error('Load failed:', e);
            return null;
        }
    },

    // Delete save slot
    deleteSave(slot) {
        localStorage.removeItem(`${this.storageKey}_${slot}`);
        console.log(`Deleted save slot ${slot}`);
    },

    // Auto-save (called periodically during runs)
    autoSave() {
        if (!sessionState.active) return;

        const currentSlot = persistentState.saveSlot;
        this.save(currentSlot);
        sessionState.lastSaveTime = Date.now();
    },

    // Export save (for backup)
    exportSave(slot) {
        const data = localStorage.getItem(`${this.storageKey}_${slot}`);
        return data ? btoa(data) : null;
    },

    // Import save
    importSave(slot, encodedData) {
        try {
            const data = atob(encodedData);
            JSON.parse(data);  // Validate JSON
            localStorage.setItem(`${this.storageKey}_${slot}`, data);
            return true;
        } catch (e) {
            console.error('Import failed:', e);
            return false;
        }
    }
};

// Make globally available
window.SaveManager = SaveManager;
```

### Step 1.2: Add Auto-Save Trigger

**File:** `js/core/main.js`

Add to game loop:

```javascript
// Auto-save timer
let lastAutoSave = 0;

function update(dt) {
    // ... existing update code ...

    // Auto-save during runs
    if (sessionState.active && game.state === 'playing') {
        lastAutoSave += dt;
        if (lastAutoSave >= SAVE_CONFIG.autoSaveInterval) {
            SaveManager.autoSave();
            lastAutoSave = 0;
        }
    }
}
```

### Step 1.3: Add Save on Key Events

Trigger saves on:
- Room transitions
- Extraction success
- Returning to village
- Opening pause menu

### Acceptance Criteria — Phase 1

- [ ] Can create new save in any of 3 slots
- [ ] Can load existing save
- [ ] Can delete save
- [ ] Auto-save triggers every 30 seconds during runs
- [ ] Save persists after browser refresh
- [ ] Export/import functions work

---

## Phase 2: Persistent State

**Goal:** Wire persistent state into game flow.

**Dependencies:** Phase 1 complete

### Step 2.1: Create Session Manager

**File:** `js/core/session-manager.js` (NEW)

```javascript
const SessionManager = {
    // Start a new run
    startRun(startFloor = 1) {
        resetSessionState();

        sessionState.active = true;
        sessionState.runId = Date.now().toString(36);
        sessionState.startTime = Date.now();
        sessionState.startFloor = startFloor;
        sessionState.currentFloor = startFloor;

        // Copy loadout from bank selection (set elsewhere)
        // sessionState.inventory = [...selectedLoadout];
        // sessionState.gold = selectedGold;

        // Check for rescue run
        if (persistentState.deathDrop) {
            sessionState.isRescueRun = true;
        }

        persistentState.stats.totalRuns++;

        console.log(`Starting run #${persistentState.stats.totalRuns} from floor ${startFloor}`);
    },

    // End run via extraction
    extractionSuccess() {
        if (!sessionState.active) return;

        const floor = sessionState.currentFloor;

        // Transfer inventory to bank
        sessionState.inventory.forEach(item => {
            BankingSystem.deposit(item);
        });
        BankingSystem.depositGold(sessionState.gold);

        // Update stats
        persistentState.stats.successfulExtractions++;
        persistentState.stats.totalGoldExtracted += sessionState.gold;

        // Unlock shortcut if new floor
        if (!persistentState.shortcuts.unlockedFloors.includes(floor)) {
            persistentState.shortcuts.unlockedFloors.push(floor);
            console.log(`Unlocked shortcut to floor ${floor}!`);
        }

        // Track extraction for degradation
        if (!persistentState.shortcuts.extractedFrom[floor]) {
            persistentState.shortcuts.extractedFrom[floor] = 0;
        }
        persistentState.shortcuts.extractedFrom[floor]++;

        // Apply degradation
        DegradationSystem.applyExtraction(floor);

        // Clear death drop if this was rescue run
        if (sessionState.isRescueRun) {
            persistentState.deathDrop = null;
        }

        // Update deepest floor
        if (floor > persistentState.stats.deepestFloor) {
            persistentState.stats.deepestFloor = floor;
            VillageDegradation.checkStageAdvance(floor);
        }

        // End session
        sessionState.active = false;

        // Save and return to village
        SaveManager.save(persistentState.saveSlot);

        return { success: true, floor };
    },

    // End run via descent
    descendToNextFloor() {
        if (!sessionState.active) return;

        const nextFloor = sessionState.currentFloor + 1;

        // Update deepest floor
        if (nextFloor > persistentState.stats.deepestFloor) {
            persistentState.stats.deepestFloor = nextFloor;
            VillageDegradation.checkStageAdvance(nextFloor);
        }

        sessionState.currentFloor = nextFloor;
        sessionState.floorTime = 0;
        sessionState.miniBossDefeated = false;

        // Generate new floor
        // ... dungeon generation ...

        SaveManager.autoSave();

        return { success: true, floor: nextFloor };
    },

    // End run via death
    playerDeath(deathX, deathY) {
        if (!sessionState.active) return;

        const hadItems = sessionState.inventory.length > 0 || sessionState.gold > 0;

        // Create death drop if carrying anything
        if (hadItems && !sessionState.isRescueRun) {
            persistentState.deathDrop = {
                floor: sessionState.currentFloor,
                x: deathX,
                y: deathY,
                items: [...sessionState.inventory],
                gold: sessionState.gold,
                timestamp: Date.now()
            };
            console.log('Death drop created. Next run is rescue run.');
        } else if (sessionState.isRescueRun && hadItems) {
            // Died during rescue run - items lost forever
            persistentState.deathDrop = null;
            console.log('Rescue failed. Items lost permanently.');
        }

        persistentState.stats.deaths++;
        sessionState.active = false;

        SaveManager.save(persistentState.saveSlot);

        return {
            success: false,
            itemsDropped: hadItems,
            rescuePossible: !sessionState.isRescueRun && hadItems
        };
    },

    // Recover death drop
    recoverDeathDrop() {
        if (!persistentState.deathDrop) return false;

        // Add items back to inventory
        persistentState.deathDrop.items.forEach(item => {
            sessionState.inventory.push(item);
        });
        sessionState.gold += persistentState.deathDrop.gold;

        // Clear death drop
        persistentState.deathDrop = null;
        sessionState.isRescueRun = false;

        console.log('Death drop recovered!');
        return true;
    }
};

window.SessionManager = SessionManager;
```

### Step 2.2: Integrate with Game Init

**File:** `js/core/game-init.js`

Modify `startNewGame` to use session manager:

```javascript
function startNewGame(saveSlot, startFloor = 1) {
    // Load or create persistent state
    const saveData = SaveManager.load(saveSlot);

    if (saveData) {
        Object.assign(persistentState, saveData.persistent);
        Object.assign(villageState, saveData.village);

        // Resume session if one was active
        if (saveData.session && saveData.session.active) {
            Object.assign(sessionState, saveData.session);
            // Resume in dungeon
            resumeDungeonRun();
            return;
        }
    } else {
        // New game
        Object.assign(persistentState, createNewPersistentState());
        Object.assign(villageState, createNewVillageState());
        persistentState.saveSlot = saveSlot;
        persistentState.createdAt = Date.now();
    }

    // Go to village
    enterVillage();
}

function enterVillage() {
    game.state = GAME_STATES.VILLAGE;
    // ... village setup ...
}

function startDungeonRun(startFloor) {
    SessionManager.startRun(startFloor);
    game.state = GAME_STATES.LOADING;

    // Generate dungeon for floor
    generateDungeonForFloor(startFloor);

    game.state = GAME_STATES.PLAYING;
}
```

### Acceptance Criteria — Phase 2

- [ ] New game creates persistent state
- [ ] Loading game restores persistent state
- [ ] Session starts when entering dungeon
- [ ] Session ends on extraction/death
- [ ] Stats update correctly
- [ ] Shortcuts unlock on first extraction from floor
- [ ] Death drops are created and recoverable

---

## Phase 3: Banking System

**Goal:** Implement bank storage and loadout selection.

**Dependencies:** Phase 2 complete

### Step 3.1: Create Banking System

**File:** `js/systems/banking-system.js` (NEW)

```javascript
const BankingSystem = {
    // Deposit item to bank
    deposit(item) {
        if (persistentState.bank.usedSlots >= BANKING_CONFIG.maxSlots) {
            console.warn('Bank is full');
            return false;
        }

        // Check for stackable
        if (item.stackable) {
            const existing = persistentState.bank.items.find(
                i => i.id === item.id
            );
            if (existing) {
                existing.count += item.count || 1;
                return true;
            }
        }

        persistentState.bank.items.push({ ...item });
        persistentState.bank.usedSlots++;
        return true;
    },

    // Withdraw item from bank
    withdraw(itemIndex) {
        if (itemIndex < 0 || itemIndex >= persistentState.bank.items.length) {
            return null;
        }

        const item = persistentState.bank.items.splice(itemIndex, 1)[0];
        if (!item.stackable) {
            persistentState.bank.usedSlots--;
        }
        return item;
    },

    // Deposit gold
    depositGold(amount) {
        persistentState.bank.gold += amount;
    },

    // Withdraw gold
    withdrawGold(amount) {
        if (amount > persistentState.bank.gold) {
            return false;
        }
        persistentState.bank.gold -= amount;
        return true;
    },

    // Get bank contents
    getContents() {
        return {
            gold: persistentState.bank.gold,
            items: [...persistentState.bank.items],
            usedSlots: persistentState.bank.usedSlots,
            maxSlots: BANKING_CONFIG.maxSlots
        };
    },

    // Check if item exists in bank
    hasItem(itemId, count = 1) {
        const item = persistentState.bank.items.find(i => i.id === itemId);
        return item && (item.count || 1) >= count;
    }
};

window.BankingSystem = BankingSystem;
```

### Step 3.2: Create Loadout System

**File:** `js/systems/loadout-system.js` (NEW)

```javascript
const LoadoutSystem = {
    currentLoadout: {
        weapon: null,
        armor: [],
        consumables: [],
        gold: 0
    },

    // Select weapon for loadout
    selectWeapon(bankIndex) {
        const item = persistentState.bank.items[bankIndex];
        if (item && item.type === 'weapon') {
            this.currentLoadout.weapon = { ...item, bankIndex };
        }
    },

    // Add consumable to loadout
    addConsumable(bankIndex) {
        const item = persistentState.bank.items[bankIndex];
        if (item && item.type === 'consumable') {
            this.currentLoadout.consumables.push({ ...item, bankIndex });
        }
    },

    // Set gold to carry
    setGold(amount) {
        const maxGold = persistentState.bank.gold;
        this.currentLoadout.gold = Math.min(amount, maxGold);
    },

    // Confirm loadout and start run
    confirmLoadout() {
        // Remove items from bank
        const indicesToRemove = [];

        if (this.currentLoadout.weapon) {
            indicesToRemove.push(this.currentLoadout.weapon.bankIndex);
        }

        this.currentLoadout.consumables.forEach(c => {
            indicesToRemove.push(c.bankIndex);
        });

        // Remove in reverse order to preserve indices
        indicesToRemove.sort((a, b) => b - a);
        indicesToRemove.forEach(i => {
            persistentState.bank.items.splice(i, 1);
            persistentState.bank.usedSlots--;
        });

        // Withdraw gold
        BankingSystem.withdrawGold(this.currentLoadout.gold);

        // Prepare session inventory
        const inventory = [];
        if (this.currentLoadout.weapon) {
            inventory.push(this.currentLoadout.weapon);
        }
        this.currentLoadout.consumables.forEach(c => {
            inventory.push(c);
        });

        return {
            inventory,
            gold: this.currentLoadout.gold
        };
    },

    // Reset loadout
    reset() {
        this.currentLoadout = {
            weapon: null,
            armor: [],
            consumables: [],
            gold: 0
        };
    }
};

window.LoadoutSystem = LoadoutSystem;
```

### Step 3.3: Create Bank UI

**File:** `js/ui/bank-ui.js` (NEW)

Implement bank interface with:
- Grid display of stored items
- Gold counter
- Deposit/withdraw buttons
- Storage capacity indicator

### Step 3.4: Create Loadout UI

**File:** `js/ui/loadout-ui.js` (NEW)

Implement loadout selection with:
- Bank contents on left
- Selected loadout on right
- Gold slider
- "Enter Dungeon" button
- Floor selection (unlocked shortcuts)

### Acceptance Criteria — Phase 3

- [ ] Can deposit items to bank
- [ ] Can withdraw items from bank
- [ ] Can deposit/withdraw gold
- [ ] Bank respects slot limit
- [ ] Loadout selection works
- [ ] Items removed from bank when entering dungeon
- [ ] Gold split between bank and carried

---

## Phase 4: Extraction System

**Goal:** Replace shift mechanic with extraction points.

**Dependencies:** Phase 3 complete

### Step 4.1: Create Extraction Point Entity

**File:** `js/entities/extraction-point.js` (NEW)

```javascript
function createExtractionPoint(x, y, id) {
    return {
        id: id || `shaft_${Date.now()}`,
        x,
        y,
        gridX: Math.floor(x),
        gridY: Math.floor(y),

        status: 'active',  // active, warning, collapsing, collapsed
        collapseTime: null,
        warningStartTime: null,

        // Visual
        sprite: 'extraction_shaft',
        animationFrame: 0,

        // Interaction
        interactionRadius: 1.5,

        // Methods
        isActive() {
            return this.status === 'active' || this.status === 'warning';
        },

        startWarning(collapseAt) {
            this.status = 'warning';
            this.collapseTime = collapseAt;
            this.warningStartTime = Date.now();
        },

        collapse() {
            this.status = 'collapsed';
        },

        getWarningStage() {
            if (this.status !== 'warning') return null;

            const timeUntilCollapse = this.collapseTime - Date.now();

            if (timeUntilCollapse <= EXTRACTION_CONFIG.warningStages.critical) {
                return 'critical';
            } else if (timeUntilCollapse <= EXTRACTION_CONFIG.warningStages.debris) {
                return 'debris';
            } else {
                return 'rumble';
            }
        }
    };
}

window.createExtractionPoint = createExtractionPoint;
```

### Step 4.2: Create Extraction Spawner

**File:** `js/generation/extraction-spawner.js` (NEW)

```javascript
const ExtractionSpawner = {
    spawnExtractionPoints(floor, rooms) {
        const count = EXTRACTION_CONFIG.shaftsPerFloor[floor] || 3;
        const points = [];

        // Get eligible rooms (not spawn, not boss)
        const eligibleRooms = rooms.filter(r =>
            r.type !== 'spawn' &&
            r.type !== 'boss' &&
            r.type !== 'miniboss'
        );

        // Distribute points across rooms
        const selectedRooms = this.selectDistributedRooms(eligibleRooms, count);

        selectedRooms.forEach((room, i) => {
            const pos = this.findValidPosition(room);
            const point = createExtractionPoint(pos.x, pos.y, `shaft_${floor}_${i}`);
            points.push(point);
        });

        return points;
    },

    selectDistributedRooms(rooms, count) {
        // Try to spread points across the map
        // Simple approach: sort by distance from center, pick evenly spaced
        const sorted = [...rooms].sort((a, b) => {
            const distA = Math.hypot(a.centerX - 100, a.centerY - 100);
            const distB = Math.hypot(b.centerX - 100, b.centerY - 100);
            return distA - distB;
        });

        const selected = [];
        const step = Math.floor(sorted.length / count);

        for (let i = 0; i < count && i * step < sorted.length; i++) {
            selected.push(sorted[i * step]);
        }

        return selected;
    },

    findValidPosition(room) {
        // Find floor tile near room center
        const cx = room.floorX + Math.floor(room.floorWidth / 2);
        const cy = room.floorY + Math.floor(room.floorHeight / 2);
        return { x: cx, y: cy };
    }
};

window.ExtractionSpawner = ExtractionSpawner;
```

### Step 4.3: Create Extraction System

**File:** `js/systems/extraction-system.js` (NEW)

```javascript
const ExtractionSystem = {
    name: 'ExtractionSystem',
    priority: 75,

    points: [],
    floorStartTime: 0,
    collapseQueue: [],

    init(floor, rooms) {
        this.points = ExtractionSpawner.spawnExtractionPoints(floor, rooms);
        this.floorStartTime = Date.now();
        this.scheduleCollapses();

        sessionState.extractionPoints = this.points;
    },

    scheduleCollapses() {
        const duration = EXTRACTION_CONFIG.floorDuration;
        const schedule = EXTRACTION_CONFIG.collapseSchedule;

        this.collapseQueue = [];

        // Shuffle points for random collapse order
        const shuffled = [...this.points].sort(() => Math.random() - 0.5);

        shuffled.forEach((point, i) => {
            if (i < schedule.length) {
                const collapseTime = this.floorStartTime + (duration * schedule[i]);
                const warningTime = collapseTime - EXTRACTION_CONFIG.warningDuration;

                this.collapseQueue.push({
                    point,
                    warningTime,
                    collapseTime
                });
            }
        });

        // Sort by collapse time
        this.collapseQueue.sort((a, b) => a.collapseTime - b.collapseTime);
    },

    update(dt) {
        const now = Date.now();

        this.collapseQueue.forEach(entry => {
            // Start warning
            if (entry.point.status === 'active' && now >= entry.warningTime) {
                entry.point.startWarning(entry.collapseTime);
                this.onWarningStart(entry.point);
            }

            // Collapse
            if (entry.point.status === 'warning' && now >= entry.collapseTime) {
                entry.point.collapse();
                this.onCollapse(entry.point);
            }
        });

        // Update floor time
        sessionState.floorTime = now - this.floorStartTime;
    },

    onWarningStart(point) {
        // Play rumble sound
        // Show UI warning
        console.log(`Extraction shaft ${point.id} is becoming unstable!`);
    },

    onCollapse(point) {
        // Play collapse sound
        // Screen shake
        // Update UI
        console.log(`Extraction shaft ${point.id} has collapsed!`);

        // Check if all shafts collapsed
        const activePoints = this.points.filter(p => p.isActive());
        if (activePoints.length === 0) {
            this.onAllCollapsed();
        }
    },

    onAllCollapsed() {
        // All extraction points gone
        // Player must find path down or die
        console.log('All extraction shafts have collapsed! Find the path down!');
    },

    // Player attempts extraction
    tryExtract(point) {
        if (!point.isActive()) {
            console.log('This shaft has collapsed!');
            return false;
        }

        // Show extraction confirmation UI
        game.state = GAME_STATES.EXTRACTION;
        game.activeExtractionPoint = point;
        return true;
    },

    // Confirm extraction
    confirmExtraction() {
        const result = SessionManager.extractionSuccess();
        if (result.success) {
            game.state = GAME_STATES.VILLAGE;
            // Transition to village
        }
    },

    // Get nearest active point
    getNearestActivePoint(x, y) {
        let nearest = null;
        let nearestDist = Infinity;

        this.points.forEach(p => {
            if (p.isActive()) {
                const dist = Math.hypot(p.x - x, p.y - y);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = p;
                }
            }
        });

        return { point: nearest, distance: nearestDist };
    },

    // Get all points for UI
    getPointsStatus() {
        return this.points.map(p => ({
            id: p.id,
            x: p.x,
            y: p.y,
            status: p.status,
            warningStage: p.getWarningStage(),
            discovered: true  // TODO: track discovery
        }));
    }
};

// Register with SystemManager
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('ExtractionSystem', ExtractionSystem, 75);
}

window.ExtractionSystem = ExtractionSystem;
```

### Step 4.4: Create Extraction UI

**File:** `js/ui/extraction-overlay.js` (NEW)

Implement:
- Minimap icons for known shafts
- Warning indicators (rumble/debris/critical)
- "Extract" prompt when near shaft
- Confirmation dialog

### Step 4.5: Remove Old Shift System

**Files to modify:**
- Delete or archive `js/systems/shift-system.js`
- Delete or archive `js/systems/shift-bonus-system.js`
- Remove shift references from `main.js`
- Remove shift overlay from renderer

### Acceptance Criteria — Phase 4

- [ ] 3-4 extraction shafts spawn per floor
- [ ] Shafts collapse on schedule (40%, 65%, 83%, 92%)
- [ ] 20-second warnings with escalating stages
- [ ] Player can extract at active shaft
- [ ] Extraction ends run and returns to village
- [ ] Collapsed shafts are not usable
- [ ] UI shows shaft status

---

## Phase 5: Village Hub

**Goal:** Create explorable surface village.

**Dependencies:** Phase 4 complete

### Step 5.1: Create Village Generator

**File:** `js/generation/village-generator.js` (NEW)

```javascript
const VillageGenerator = {
    generate() {
        const width = VILLAGE_CONFIG.mapWidth;
        const height = VILLAGE_CONFIG.mapHeight;

        // Create base map
        const map = [];
        for (let y = 0; y < height; y++) {
            map[y] = [];
            for (let x = 0; x < width; x++) {
                map[y][x] = this.createGrassTile();
            }
        }

        // Place buildings
        const buildings = this.placeBuildings(map);

        // Add paths between buildings
        this.addPaths(map, buildings);

        // Add decorations
        this.addDecorations(map);

        // Place dungeon entrance
        const entrance = this.placeDungeonEntrance(map);

        return {
            map,
            buildings,
            entrance,
            width,
            height
        };
    },

    placeBuildings(map) {
        const buildings = [];

        // Fixed layout for MVP
        const layout = [
            { type: 'home', x: 20, y: 15 },
            { type: 'shop', x: 10, y: 20 },
            { type: 'smithy', x: 30, y: 20 },
            { type: 'bank', x: 25, y: 25 },
            { type: 'farm', x: 5, y: 30 },
            { type: 'stable', x: 40, y: 15 }
        ];

        layout.forEach(b => {
            const config = VILLAGE_CONFIG.buildings[b.type];
            buildings.push({
                ...b,
                ...config,
                doorX: b.x + Math.floor(config.width / 2),
                doorY: b.y + config.height
            });

            // Mark tiles as building
            for (let dy = 0; dy < config.height; dy++) {
                for (let dx = 0; dx < config.width; dx++) {
                    if (map[b.y + dy] && map[b.y + dy][b.x + dx]) {
                        map[b.y + dy][b.x + dx] = {
                            type: 'building',
                            buildingType: b.type,
                            walkable: false
                        };
                    }
                }
            }
        });

        return buildings;
    },

    placeDungeonEntrance(map) {
        // Place at edge of village
        const entrance = { x: 45, y: 20 };
        map[entrance.y][entrance.x] = {
            type: 'dungeon_entrance',
            walkable: true,
            interactive: true
        };
        return entrance;
    },

    addPaths(map, buildings) {
        // Simple path connections
        // Implementation details...
    },

    addDecorations(map) {
        // Trees, fences, etc.
        // Implementation details...
    },

    createGrassTile() {
        return {
            type: 'grass',
            walkable: true,
            variant: Math.floor(Math.random() * 4)
        };
    }
};

window.VillageGenerator = VillageGenerator;
```

### Step 5.2: Create Village Renderer

**File:** `js/ui/village-renderer.js` (NEW)

Implement:
- Tile-based village rendering
- Building sprites
- NPC sprites
- Player sprite in village
- Degradation visual states

### Step 5.3: Create NPC System

**File:** `js/data/npcs.js` (NEW)

Define NPCs:
- 3 Functional: Shopkeeper, Blacksmith, Banker
- 3 Personal: Family member, Friend, Elder

### Step 5.4: Create Dialogue UI

**File:** `js/ui/dialogue-ui.js` (NEW)

Implement:
- Portrait display (2-3 expressions)
- Text box with typewriter effect
- Flag-based dialogue selection
- Continue/close buttons

### Step 5.5: Integrate Village State

**File:** `js/core/main.js`

Add village update/render loop:

```javascript
function update(dt) {
    switch (game.state) {
        case GAME_STATES.VILLAGE:
            updateVillage(dt);
            break;
        case GAME_STATES.PLAYING:
            updateDungeon(dt);
            break;
        // ... other states
    }
}

function render() {
    switch (game.state) {
        case GAME_STATES.VILLAGE:
            VillageRenderer.render(ctx);
            break;
        case GAME_STATES.PLAYING:
            renderDungeon();
            break;
        // ... other states
    }
}
```

### Acceptance Criteria — Phase 5

- [ ] Village generates with buildings
- [ ] Player can walk around village
- [ ] Can enter buildings (home, shop, smithy)
- [ ] NPCs visible in village
- [ ] Can talk to NPCs
- [ ] Dialogue displays with portraits
- [ ] Can access dungeon entrance
- [ ] Village state persists

---

## Phase 6: Materials & Economy

**Goal:** Implement material drops and dual economy.

**Dependencies:** Phase 5 complete

### Step 6.1: Create Material Definitions

**File:** `js/data/materials.js` (NEW)

```javascript
const MATERIALS = {
    // Tier 1 (Floors 1-3)
    volcanic_ash: {
        id: 'volcanic_ash',
        name: 'Volcanic Ash',
        tier: 1,
        rarity: 'common',
        sellValue: 5,
        description: 'Fine powder from volcanic vents.'
    },
    fire_essence: {
        id: 'fire_essence',
        name: 'Fire Essence',
        tier: 1,
        rarity: 'uncommon',
        sellValue: 25,
        description: 'Concentrated elemental fire.'
    },
    molten_core: {
        id: 'molten_core',
        name: 'Molten Core',
        tier: 1,
        rarity: 'rare',
        sellValue: 100,
        description: 'The blazing heart of a fire creature.'
    },

    // Tier 2 (Floors 4-6)
    obsidian_shard: {
        id: 'obsidian_shard',
        name: 'Obsidian Shard',
        tier: 2,
        rarity: 'common',
        sellValue: 15,
        description: 'Sharp volcanic glass.'
    },
    magma_crystal: {
        id: 'magma_crystal',
        name: 'Magma Crystal',
        tier: 2,
        rarity: 'uncommon',
        sellValue: 50,
        description: 'Crystallized magma with inner fire.'
    },
    dragons_blood: {
        id: 'dragons_blood',
        name: "Dragon's Blood",
        tier: 2,
        rarity: 'rare',
        sellValue: 200,
        description: 'Searing ichor from deep dwellers.'
    },

    // Boss materials
    mini_boss_trophy: {
        id: 'mini_boss_trophy',
        name: 'Champion Trophy',
        tier: 0,  // Special
        rarity: 'epic',
        sellValue: 500,
        description: 'Proof of defeating a floor guardian.'
    }
};

window.MATERIALS = MATERIALS;
```

### Step 6.2: Create Drop Tables

**File:** `js/data/material-drops.js` (NEW)

```javascript
const MATERIAL_DROPS = {
    // By monster type
    fire_slime: {
        guaranteed: null,
        drops: [
            { id: 'volcanic_ash', chance: 0.5, count: [1, 3] },
            { id: 'fire_essence', chance: 0.1, count: [1, 1] }
        ]
    },
    magma_elemental: {
        guaranteed: 'volcanic_ash',
        drops: [
            { id: 'fire_essence', chance: 0.3, count: [1, 2] },
            { id: 'molten_core', chance: 0.05, count: [1, 1] }
        ]
    },
    // ... more monsters

    // Mini-boss drops
    floor_1_miniboss: {
        guaranteed: 'mini_boss_trophy',
        drops: [
            { id: 'molten_core', chance: 1.0, count: [2, 4] }
        ]
    }
};

window.MATERIAL_DROPS = MATERIAL_DROPS;
```

### Step 6.3: Modify Loot System

**File:** `js/systems/loot-system.js`

Add material drops:

```javascript
function rollMaterialDrops(enemy) {
    const drops = [];
    const dropTable = MATERIAL_DROPS[enemy.type];

    if (!dropTable) return drops;

    // Apply degradation multiplier
    const degradation = DegradationSystem.getMultiplier(sessionState.currentFloor);

    // Guaranteed drop
    if (dropTable.guaranteed) {
        drops.push({
            ...MATERIALS[dropTable.guaranteed],
            count: 1
        });
    }

    // Random drops
    dropTable.drops.forEach(drop => {
        const adjustedChance = drop.chance * degradation;
        if (Math.random() < adjustedChance) {
            const count = randomInt(drop.count[0], drop.count[1]);
            drops.push({
                ...MATERIALS[drop.id],
                count
            });
        }
    });

    return drops;
}
```

### Step 6.4: Update Shop for Selling

**File:** `js/systems/merchant-shop.js`

Add sell functionality:

```javascript
function sellItem(item) {
    const value = item.sellValue || 0;
    persistentState.bank.gold += value;
    return value;
}

function sellAllMaterials() {
    let total = 0;
    sessionState.inventory = sessionState.inventory.filter(item => {
        if (item.type === 'material') {
            total += (item.sellValue || 0) * (item.count || 1);
            return false;
        }
        return true;
    });
    persistentState.bank.gold += total;
    return total;
}
```

### Acceptance Criteria — Phase 6

- [ ] Enemies drop materials based on type
- [ ] Drop rates affected by degradation
- [ ] Materials have tier and rarity
- [ ] Can sell materials at shop
- [ ] Gold properly transfers to bank
- [ ] Material inventory displays correctly

---

## Phase 7: Quest System

**Goal:** Implement hand-crafted quests.

**Dependencies:** Phase 6 complete

### Step 7.1: Create Quest Definitions

**File:** `js/data/quests.js` (NEW)

```javascript
const QUESTS = {
    fetch_volcanic_ash: {
        id: 'fetch_volcanic_ash',
        type: 'fetch',
        title: 'Volcanic Samples',
        giver: 'blacksmith',
        description: 'The blacksmith needs volcanic ash for his forge.',
        objectives: [
            { type: 'collect', item: 'volcanic_ash', count: 10 }
        ],
        rewards: {
            gold: 100,
            items: [],
            unlocks: []
        },
        prerequisites: [],
        dialogueStart: 'quest_ash_start',
        dialogueComplete: 'quest_ash_complete'
    },

    village_walls: {
        id: 'village_walls',
        type: 'improvement',
        title: 'Reinforce the Walls',
        giver: 'elder',
        description: 'The village walls need strengthening.',
        objectives: [
            { type: 'collect', item: 'obsidian_shard', count: 20 },
            { type: 'gold', amount: 500 }
        ],
        rewards: {
            gold: 0,
            items: [],
            unlocks: ['improved_walls'],
            villageImprovement: 'walls_reinforced'
        },
        prerequisites: ['floor_4_reached'],
        dialogueStart: 'quest_walls_start',
        dialogueComplete: 'quest_walls_complete'
    },

    // ... more quests (5-8 total for MVP)
};

window.QUESTS = QUESTS;
```

### Step 7.2: Create Quest System

**File:** `js/systems/quest-system.js` (NEW)

```javascript
const QuestSystem = {
    // Accept a quest
    acceptQuest(questId) {
        const quest = QUESTS[questId];
        if (!quest) return false;

        if (persistentState.quests.active.length >= QUEST_CONFIG.maxActive) {
            console.log('Too many active quests');
            return false;
        }

        // Check prerequisites
        if (!this.checkPrerequisites(quest)) {
            return false;
        }

        // Add to active
        persistentState.quests.active.push({
            id: questId,
            acceptedAt: Date.now(),
            progress: this.initializeProgress(quest)
        });

        // Remove from available
        const availIdx = persistentState.quests.available.indexOf(questId);
        if (availIdx > -1) {
            persistentState.quests.available.splice(availIdx, 1);
        }

        return true;
    },

    // Update quest progress
    updateProgress(type, data) {
        persistentState.quests.active.forEach(activeQuest => {
            const quest = QUESTS[activeQuest.id];

            quest.objectives.forEach((obj, i) => {
                if (obj.type === type) {
                    if (type === 'collect' && data.item === obj.item) {
                        activeQuest.progress[i] = Math.min(
                            activeQuest.progress[i] + data.count,
                            obj.count
                        );
                    }
                    // ... other objective types
                }
            });
        });
    },

    // Check if quest is complete
    isComplete(questId) {
        const activeQuest = persistentState.quests.active.find(q => q.id === questId);
        if (!activeQuest) return false;

        const quest = QUESTS[questId];
        return quest.objectives.every((obj, i) => {
            return activeQuest.progress[i] >= (obj.count || obj.amount || 1);
        });
    },

    // Complete quest and give rewards
    completeQuest(questId) {
        if (!this.isComplete(questId)) return false;

        const quest = QUESTS[questId];
        const activeQuest = persistentState.quests.active.find(q => q.id === questId);

        // Give rewards
        if (quest.rewards.gold) {
            persistentState.bank.gold += quest.rewards.gold;
        }

        quest.rewards.items.forEach(item => {
            BankingSystem.deposit(item);
        });

        quest.rewards.unlocks.forEach(unlock => {
            // Handle unlocks (recipes, etc.)
        });

        if (quest.rewards.villageImprovement) {
            persistentState.village.improvements.push(quest.rewards.villageImprovement);
        }

        // Move to completed
        persistentState.quests.completed.push(questId);
        persistentState.quests.active = persistentState.quests.active.filter(
            q => q.id !== questId
        );

        return true;
    },

    // Initialize available quests for new game
    initializeQuests() {
        Object.keys(QUESTS).forEach(questId => {
            const quest = QUESTS[questId];
            if (quest.prerequisites.length === 0) {
                persistentState.quests.available.push(questId);
            }
        });
    },

    // Check if new quests should unlock
    checkUnlocks() {
        Object.keys(QUESTS).forEach(questId => {
            if (persistentState.quests.available.includes(questId)) return;
            if (persistentState.quests.completed.includes(questId)) return;
            if (persistentState.quests.active.find(q => q.id === questId)) return;

            const quest = QUESTS[questId];
            if (this.checkPrerequisites(quest)) {
                persistentState.quests.available.push(questId);
            }
        });
    },

    checkPrerequisites(quest) {
        return quest.prerequisites.every(prereq => {
            if (prereq.startsWith('floor_')) {
                const floor = parseInt(prereq.split('_')[1]);
                return persistentState.stats.deepestFloor >= floor;
            }
            if (prereq.startsWith('quest_')) {
                return persistentState.quests.completed.includes(prereq);
            }
            return true;
        });
    },

    initializeProgress(quest) {
        return quest.objectives.map(() => 0);
    }
};

window.QuestSystem = QuestSystem;
```

### Step 7.3: Create Quest UI

**File:** `js/ui/quest-ui.js` (NEW)

Implement:
- Quest log (accessible in village and dungeon)
- Active quest list with progress
- Available quests at NPC
- Completion notification

### Acceptance Criteria — Phase 7

- [ ] Can accept quests from NPCs
- [ ] Quest progress tracks correctly
- [ ] Can complete quests when objectives met
- [ ] Rewards given on completion
- [ ] Quest log shows active/completed
- [ ] New quests unlock based on prerequisites

---

## Phase 8: Progression Systems

**Goal:** Implement degradation, shortcuts, and rescue runs.

**Dependencies:** Phase 7 complete

### Step 8.1: Create Degradation System

**File:** `js/systems/degradation-system.js` (NEW)

```javascript
const DegradationSystem = {
    // Get current drop multiplier for floor
    getMultiplier(floor) {
        const extractions = persistentState.shortcuts.extractedFrom[floor] || 0;
        const reduction = extractions * DEGRADATION_CONFIG.stepReduction;
        return Math.max(
            DEGRADATION_CONFIG.minimum,
            1.0 - reduction
        );
    },

    // Apply degradation after extraction
    applyExtraction(floor) {
        // Degrade this floor and all below
        for (let f = 1; f <= floor; f++) {
            if (!persistentState.shortcuts.extractedFrom[f]) {
                persistentState.shortcuts.extractedFrom[f] = 0;
            }
            persistentState.shortcuts.extractedFrom[f]++;
        }
    },

    // Get degradation display info
    getFloorStatus(floor) {
        const multiplier = this.getMultiplier(floor);
        return {
            floor,
            multiplier,
            percentage: Math.round(multiplier * 100),
            extractions: persistentState.shortcuts.extractedFrom[floor] || 0
        };
    }
};

window.DegradationSystem = DegradationSystem;
```

### Step 8.2: Create Shortcut System

**File:** `js/systems/shortcut-system.js` (NEW)

```javascript
const ShortcutSystem = {
    // Check if floor is unlocked
    isUnlocked(floor) {
        return persistentState.shortcuts.unlockedFloors.includes(floor);
    },

    // Unlock floor (called on extraction)
    unlock(floor) {
        if (!this.isUnlocked(floor)) {
            persistentState.shortcuts.unlockedFloors.push(floor);
            persistentState.shortcuts.unlockedFloors.sort((a, b) => a - b);
        }
    },

    // Get all unlocked floors
    getUnlockedFloors() {
        return [...persistentState.shortcuts.unlockedFloors];
    },

    // Get highest unlocked floor
    getHighestUnlocked() {
        return Math.max(...persistentState.shortcuts.unlockedFloors);
    }
};

window.ShortcutSystem = ShortcutSystem;
```

### Step 8.3: Create Rescue System

**File:** `js/systems/rescue-system.js` (NEW)

```javascript
const RescueSystem = {
    // Check if rescue run is available
    hasDeathDrop() {
        return persistentState.deathDrop !== null;
    },

    // Get death drop info
    getDeathDropInfo() {
        if (!persistentState.deathDrop) return null;

        return {
            floor: persistentState.deathDrop.floor,
            itemCount: persistentState.deathDrop.items.length,
            gold: persistentState.deathDrop.gold,
            timestamp: persistentState.deathDrop.timestamp
        };
    },

    // Place death drop marker in dungeon
    placeDeathMarker() {
        if (!sessionState.isRescueRun || !persistentState.deathDrop) return null;

        // Only show marker if on correct floor
        if (sessionState.currentFloor !== persistentState.deathDrop.floor) {
            return null;
        }

        return {
            x: persistentState.deathDrop.x,
            y: persistentState.deathDrop.y,
            type: 'death_marker'
        };
    },

    // Player interacts with death drop
    collectDeathDrop() {
        if (!persistentState.deathDrop) return false;

        // Add items to inventory
        persistentState.deathDrop.items.forEach(item => {
            sessionState.inventory.push(item);
        });
        sessionState.gold += persistentState.deathDrop.gold;

        // Clear death drop
        persistentState.deathDrop = null;
        sessionState.isRescueRun = false;

        return true;
    }
};

window.RescueSystem = RescueSystem;
```

### Step 8.4: Create Village Degradation Visuals

**File:** `js/ui/village-degradation-ui.js` (NEW)

Implement visual changes based on `persistentState.village.degradationStage`:
- Stage 1: Normal, peaceful
- Stage 2: Smoke on horizon, worried NPCs

### Acceptance Criteria — Phase 8

- [ ] Drop rates decrease with extractions
- [ ] Degradation shows in UI
- [ ] Shortcuts unlock on extraction
- [ ] Can start run from unlocked floor
- [ ] Death creates drop marker
- [ ] Can recover death drop on rescue run
- [ ] Failing rescue loses items permanently
- [ ] Village visuals change with stage

---

## Phase 9: Crafting System

**Goal:** Implement crafting with recipes.

**Dependencies:** Phase 8 complete

### Step 9.1: Create Recipe Definitions

**File:** `js/data/recipes.js` (NEW)

```javascript
const RECIPES = {
    // Tier 1 weapons
    flame_sword: {
        id: 'flame_sword',
        name: 'Flame Sword',
        category: 'weapon',
        tier: 1,
        known: true,  // Available from start
        materials: [
            { id: 'volcanic_ash', count: 10 },
            { id: 'fire_essence', count: 5 }
        ],
        gold: 200,
        result: {
            type: 'weapon',
            id: 'flame_sword',
            // ... weapon stats
        }
    },

    // Tier 1 armor
    volcanic_helm: {
        id: 'volcanic_helm',
        name: 'Volcanic Helm',
        category: 'armor',
        tier: 1,
        known: true,
        materials: [
            { id: 'volcanic_ash', count: 15 },
            { id: 'molten_core', count: 1 }
        ],
        gold: 150,
        result: {
            type: 'armor',
            slot: 'head',
            id: 'volcanic_helm',
            // ... armor stats
        }
    },

    // Discoverable recipes
    obsidian_blade: {
        id: 'obsidian_blade',
        name: 'Obsidian Blade',
        category: 'weapon',
        tier: 2,
        known: false,  // Must be found
        materials: [
            { id: 'obsidian_shard', count: 20 },
            { id: 'magma_crystal', count: 5 },
            { id: 'molten_core', count: 3 }
        ],
        gold: 500,
        result: {
            type: 'weapon',
            id: 'obsidian_blade',
            // ... weapon stats
        }
    }

    // ... more recipes (20-30 total)
};

window.RECIPES = RECIPES;
```

### Step 9.2: Create Crafting System

**File:** `js/systems/crafting-system.js` (NEW)

```javascript
const CraftingSystem = {
    // Check if player can craft recipe
    canCraft(recipeId) {
        const recipe = RECIPES[recipeId];
        if (!recipe) return { can: false, reason: 'Unknown recipe' };

        // Check if known
        if (!recipe.known && !persistentState.recipes.known.includes(recipeId)) {
            return { can: false, reason: 'Recipe not learned' };
        }

        // Check gold
        if (persistentState.bank.gold < recipe.gold) {
            return { can: false, reason: 'Not enough gold' };
        }

        // Check materials
        for (const mat of recipe.materials) {
            if (!this.hasMaterial(mat.id, mat.count)) {
                return { can: false, reason: `Need ${mat.count}x ${MATERIALS[mat.id].name}` };
            }
        }

        return { can: true };
    },

    // Craft item
    craft(recipeId) {
        const check = this.canCraft(recipeId);
        if (!check.can) {
            console.log('Cannot craft:', check.reason);
            return false;
        }

        const recipe = RECIPES[recipeId];

        // Consume gold
        persistentState.bank.gold -= recipe.gold;

        // Consume materials
        recipe.materials.forEach(mat => {
            this.consumeMaterial(mat.id, mat.count);
        });

        // Create item
        BankingSystem.deposit({ ...recipe.result });

        console.log(`Crafted ${recipe.name}!`);
        return true;
    },

    // Learn new recipe
    learnRecipe(recipeId) {
        if (!persistentState.recipes.known.includes(recipeId)) {
            persistentState.recipes.known.push(recipeId);
            return true;
        }
        return false;
    },

    // Get all available recipes
    getAvailableRecipes() {
        return Object.keys(RECIPES).filter(id => {
            const recipe = RECIPES[id];
            return recipe.known || persistentState.recipes.known.includes(id);
        });
    },

    // Helper: check material in bank
    hasMaterial(materialId, count) {
        const item = persistentState.bank.items.find(
            i => i.id === materialId && i.type === 'material'
        );
        return item && (item.count || 1) >= count;
    },

    // Helper: consume material from bank
    consumeMaterial(materialId, count) {
        const item = persistentState.bank.items.find(
            i => i.id === materialId && i.type === 'material'
        );
        if (item) {
            item.count -= count;
            if (item.count <= 0) {
                const idx = persistentState.bank.items.indexOf(item);
                persistentState.bank.items.splice(idx, 1);
            }
        }
    }
};

window.CraftingSystem = CraftingSystem;
```

### Step 9.3: Create Crafting UI

**File:** `js/ui/crafting-ui.js` (NEW)

Implement:
- Recipe list (known/unknown/greyed)
- Material requirements display
- Gold cost display
- Craft button
- Result preview

### Acceptance Criteria — Phase 9

- [ ] Can view available recipes
- [ ] Unknown recipes show as "???"
- [ ] Can craft when materials + gold sufficient
- [ ] Materials consumed on craft
- [ ] Gold deducted on craft
- [ ] Crafted item goes to bank
- [ ] Can learn new recipes from drops

---

## Phase 10: The Core

**Goal:** Implement final boss encounter.

**Dependencies:** Phase 9 complete

### Step 10.1: Create Core Floor

Special floor generation:
- Gauntlet of 3-4 arena rooms
- No extraction points
- Wave-based enemies
- Final boss arena

### Step 10.2: Create Core Boss

**File:** `js/entities/boss.js`

Implement:
- Boss entity with phases
- Environmental mechanics
- Health phases
- Attack patterns

### Step 10.3: Create Victory Condition

On boss defeat:
- Mark game as completed
- Return to village
- Victory celebration
- Unlock post-game content

### Acceptance Criteria — Phase 10

- [ ] Core floor generates correctly
- [ ] Gauntlet has 3-4 arena rooms
- [ ] Boss has multiple phases
- [ ] Victory triggers ending
- [ ] Village restored after victory
- [ ] Stats record completion

---

## Phase 11: Polish & Integration

**Goal:** Final integration and polish.

**Dependencies:** Phase 10 complete

### Step 11.1: Mini-Boss System

- One mini-boss per floor
- Defeating reveals path on map
- Unique drops

### Step 11.2: Hidden Path System

- Path down spawns in deep room
- Environmental hints
- Revealed on mini-boss kill

### Step 11.3: Audio Integration

- Extraction warning sounds
- Collapse sounds
- Village ambience
- Combat feedback

### Step 11.4: Tutorial/Onboarding

- First-run tutorial
- Mechanic explanations
- UI hints

### Step 11.5: Balance Pass

- Drop rates
- Enemy difficulty
- Economic values
- Crafting costs

### Acceptance Criteria — Phase 11

- [ ] Mini-bosses spawn and function
- [ ] Path down discoverable
- [ ] Audio cues work
- [ ] New player understands mechanics
- [ ] Economy feels balanced
- [ ] Full playthrough possible

---

## Testing Checkpoints

### Checkpoint 1: Foundation (After Phase 2)
- [ ] New game creates save
- [ ] Load restores state
- [ ] Session starts/ends correctly

### Checkpoint 2: Core Loop (After Phase 4)
- [ ] Can enter dungeon from village
- [ ] Extraction points work
- [ ] Can extract and return to village
- [ ] Death drops inventory

### Checkpoint 3: Economy (After Phase 6)
- [ ] Materials drop from enemies
- [ ] Can sell at shop
- [ ] Banking works
- [ ] Degradation applies

### Checkpoint 4: Progression (After Phase 8)
- [ ] Shortcuts unlock
- [ ] Quests track progress
- [ ] Rescue runs work
- [ ] Village degrades visually

### Checkpoint 5: Full Game (After Phase 10)
- [ ] Can reach The Core
- [ ] Can defeat boss
- [ ] Victory state triggers
- [ ] Full loop playable

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Save corruption | High | Version migration, backup saves, validation |
| Balance issues | Medium | Playtest early, tune configs |
| Scope creep | High | Strict MVP boundaries |
| Performance (village) | Medium | Simple tilemap, limit NPCs |
| State desync | High | Single source of truth, validation |
| Browser storage limits | Low | Compress saves, warn user |

---

## Appendix: File Checklist

### New Files to Create
- [ ] `js/core/save-manager.js`
- [ ] `js/core/session-manager.js`
- [ ] `js/data/materials.js`
- [ ] `js/data/material-drops.js`
- [ ] `js/data/npcs.js`
- [ ] `js/data/quests.js`
- [ ] `js/data/recipes.js`
- [ ] `js/entities/extraction-point.js`
- [ ] `js/generation/extraction-spawner.js`
- [ ] `js/generation/village-generator.js`
- [ ] `js/systems/banking-system.js`
- [ ] `js/systems/crafting-system.js`
- [ ] `js/systems/degradation-system.js`
- [ ] `js/systems/extraction-system.js`
- [ ] `js/systems/quest-system.js`
- [ ] `js/systems/rescue-system.js`
- [ ] `js/systems/shortcut-system.js`
- [ ] `js/systems/loadout-system.js`
- [ ] `js/ui/bank-ui.js`
- [ ] `js/ui/crafting-ui.js`
- [ ] `js/ui/dialogue-ui.js`
- [ ] `js/ui/extraction-overlay.js`
- [ ] `js/ui/loadout-ui.js`
- [ ] `js/ui/quest-ui.js`
- [ ] `js/ui/village-degradation-ui.js`
- [ ] `js/ui/village-renderer.js`

### Files to Modify
- [ ] `js/core/constants.js`
- [ ] `js/core/game-state.js`
- [ ] `js/core/game-init.js`
- [ ] `js/core/main.js`
- [ ] `js/data/items.js`
- [ ] `js/data/monsters-data.js`
- [ ] `js/entities/boss.js`
- [ ] `js/entities/npc.js`
- [ ] `js/generation/dungeon-generator.js`
- [ ] `js/generation/dungeon-integration.js`
- [ ] `js/generation/enemy-spawner.js`
- [ ] `js/systems/input-handler.js`
- [ ] `js/systems/inventory-system.js`
- [ ] `js/systems/loot-system.js`
- [ ] `js/systems/merchant-shop.js`
- [ ] `js/ui/renderer.js`
- [ ] `index.html`
- [ ] `css/style.css`

### Files to Delete
- [ ] `js/systems/shift-system.js`
- [ ] `js/systems/shift-bonus-system.js`

---

*End of Implementation Guide*
