# The Shifting Chasm — MVP Implementation Guide (Tiers 1–4)

> **Purpose:** This is the engineering document for implementing MVP playtest readiness. Each task includes the exact files, functions, line numbers, current state analysis, and step-by-step implementation instructions. Tier 0 (Critical Blockers) is covered in `MVP_PLAYTEST_IMPLEMENTATION_PLAN.md` — this document picks up from Tier 1.

> **Architecture Context:** The game uses four state objects (see `js/core/game-state.js` lines 1–64 for full authority docs):
> - `game` — Live dungeon runtime (authoritative during gameplay)
> - `persistentState` — Saved to localStorage (bank, stats, skills); **wiped on death** (permadeath)
> - `sessionState` — Current run; lost on death (floor, inventory, gold)
> - `villageState` — Village instance (player position, NPCs, map)

---

## CRITICAL DISCOVERIES (From Codebase Analysis)

These findings surfaced during deep codebase analysis and must be addressed before or during implementation:

### HIGH SEVERITY

1. **`applyTierMultipliers()` Called But Never Defined**
   - `js/generation/enemy-spawner.js:617` calls `applyTierMultipliers(template, monsterType, currentFloor)`
   - This function **does not exist anywhere** in the codebase
   - Falls back to raw template stats, meaning **enemy stat scaling by floor is broken**
   - Enemies on Floor 1 and Floor 10 have identical base stats within the same tier
   - **See Task 3.2** for the fix

2. **Victory Screen Not Rendered**
   - `renderer.js:981` handles `'menu'` and `'gameover'` states but has **no case for `'victory'`**
   - `SessionManager.coreCompleted()` sets `game.state = 'victory'` but nothing renders it
   - Additionally, `malphas-boss.js:1682` sets `game.state = 'gameover'` on boss defeat — should be `'victory'`
   - **See Task 1.5**

3. **Bank Capacity Undefined**
   - `bank-ui.js:349` references `persistentState?.bank?.capacity` — field doesn't exist in `game-state.js`
   - Falls back to hardcoded 50
   - Meanwhile `banking-system.js:147` returns `maxSlots: Infinity` and `isFull()` always returns `false`
   - **See Task 2.1**

### MEDIUM SEVERITY

5. **Shop Buy/Sell Logic May Be Incomplete**
   - `ShopUI` has item display and validation but the actual transaction functions (gold deduction, item transfer) need verification
   - Shop inventories are hardcoded in `shop-ui.js` lines 23-43, not linked to NPC data definitions

6. **Monster Kill Tracking Not Wired**
   - `trackMonsterKill()` function exists at `game-state.js:548` but is **never called** from the combat/death system
   - `persistentState.monsterKillCounts` stays empty

7. **Spell Selection Timing Bug**
   - In `initializeDungeonCore()`, spell is applied AFTER `initializeAllSystems()` (line 221) because `SpellSystem.init()` resets state
   - Current workaround works but is fragile

### WORKING WELL (No Changes Needed)

8. **HUD System** — Unit frames, minimap, action bar all fully implemented with CotDG-style rendering
9. **Boon System** — 70 boons across 7 Ancestors, 3 tiers, fully implemented in `boon-system.js`
10. **Melee Slash Effects** — State machine (WINDUP → SLASH → FADE), element-colored particles, weapon-specific arcs
11. **Status Effect Visuals** — 18+ visual effect types (burning, frozen, stunned, etc.) with particle rendering
12. **Dialogue System** — Robust with validation, fallback handling, text animation, branching

---

## TIER 1 — CORE GAMEPLAY LOOP

---

### 1.1 Village → Dungeon Transition

**Goal:** Player walks to cave entrance in village, presses E, loadout screen opens, player enters dungeon.

**Current State:** Functional pathway exists. `VillageSystem._onChasmEntrance()` opens `LoadoutUI`, which calls `startDungeonRun()` on confirmation.

**Key Files & Functions:**

| File | Function | Line | Role |
|------|----------|------|------|
| `js/systems/village-system.js` | `_tryMove(dx, dy)` | ~158 | Checks `VillageGenerator.isChasmEntrance()` on each move |
| `js/systems/village-system.js` | `_onChasmEntrance()` | ~264 | Opens `LoadoutUI.open()` or sets state to `'loadout'` |
| `js/ui/loadout-ui.js` | `open()` | ~53 | Resets run inventory, sets `game.state = 'loadout'` |
| `js/core/game-init.js` | `startDungeonRun(options)` | ~81 | Entry point: cleans up village, starts session, calls `initializeDungeonCore()` |
| `js/core/game-init.js` | `initializeDungeonCore(options)` | ~193 | Orchestrates: cleanup → resetGameState → generateDungeon → initializePlayer → applyLoadout → initializeAllSystems → postInitialization |
| `js/core/session-manager.js` | `startRun(startFloor, loadout, gold)` | ~34 | Resets session, increments `totalRuns`, sets `sessionState.active = true` |

**Verification Steps:**
1. Confirm `VillageGenerator.isChasmEntrance()` returns `true` for the cave entrance tile
2. Walk to cave → press E or step on it → `LoadoutUI` opens
3. Confirm loadout → `startDungeonRun()` fires → dungeon generates → player spawns at entrance room
4. Check that `game.player.inventory` and `game.player.gold` carry over from loadout selection

**Implementation Notes:**
- The `_onChasmEntrance()` fallback (line 272) sets state to `'loadout'` even if `LoadoutUI` is undefined — verify it handles the case where the UI module hasn't loaded
- `startDungeonRun()` calls `SessionManager.startRun()` first, then `initializeDungeonCore()` — both must succeed
- If `LoadoutUI` is buggy, bypass it: have `_onChasmEntrance()` call `startDungeonRun()` directly with a default loadout (basic weapon from bank or a hardcoded starter)

**Fallback Implementation (if LoadoutUI is broken):**
```javascript
// In village-system.js, _onChasmEntrance():
_onChasmEntrance() {
    // Bypass loadout UI - start directly with bank contents
    const loadout = {
        weapon: this._getDefaultWeapon(),
        armor: null,
        consumables: []
    };
    startDungeonRun({ startingFloor: 1, loadout });
}
```

---

### 1.2 Basic Combat Functional

**Goal:** Player can attack enemies with mouse clicks, enemies retaliate with AI, enemies die and drop loot, player can die triggering game over.

**Current State:** Combat system is comprehensive. The `combat-master.js` file (~4400 lines) contains the full combat pipeline including mouse-based arc attacks, damage calculation, status effects, projectiles, and death handling.

**Key Files & Functions:**

| File | Function | Line | Role |
|------|----------|------|------|
| `js/systems/combat-master.js` | `COMBAT_CONFIG` | ~24 | Base attack times, miss chance, weapon speeds |
| `js/systems/combat-master.js` | `WEAPON_ARC_CONFIG` | ~132 | Arc angles and ranges per weapon type |
| `js/systems/combat-master.js` | `handleDeath(entity, killer)` | ~2135 | Dispatches to `handlePlayerDeath()` or enemy death; drops loot |
| `js/systems/combat-master.js` | `applyDamage()` | ~1470+ | Core damage application with 2-layer calc |
| `js/entities/player.js` | `handlePlayerDeath()` | ~478 | Clears boons/effects → calls `SessionManager.playerDeath()` → sets `game.state = 'gameover'` |
| `js/entities/enemy.js` | Enemy spawning/stats | varies | Enemy HP, damage, tier definitions |
| `js/ui/enemy-renderer.js` | Enemy health bars | varies | Visual health bar rendering |

**Combat Flow:**
1. Player clicks on canvas → mouse position mapped to game grid → enemies in weapon arc identified
2. Damage calculated: `baseDamage * weaponMultiplier * (1 - defenseReduction)` with variance
3. `applyDamage()` applies HP reduction → `handleDeath()` if HP ≤ 0
4. Enemy death → loot dropped via `dropLoot()` → XP awarded → kill streak updated
5. Enemy attacks player → same damage pipeline in reverse
6. Player HP ≤ 0 → `handlePlayerDeath()` → `SessionManager.playerDeath()` → `game.state = 'gameover'`

**Tuning Targets (Floor 1):**
- Floor 1 enemies should die in **3-5 player hits**
- Each enemy hit should deal **10-20% of player max HP** (player starts at 100 HP, so 10-20 damage per enemy hit)
- A group of 3 enemies should be dangerous but survivable for an attentive player

**Tuning Implementation:**
1. Check `COMBAT_CONFIG.baseAttackTime` (currently 440ms) — should feel responsive
2. Verify starter weapon damage output vs Floor 1 enemy HP
3. Verify Floor 1 enemy damage vs player's 100 base HP
4. Adjust enemy stats in `js/data/core-data.js` or the monster data files if needed
5. Important: tuning values are in `js/config/combat-config.js` if it exists, otherwise in `COMBAT_CONFIG` at the top of `combat-master.js`

**What to Verify:**
- [ ] Mouse click → attack arc animation → enemy takes damage
- [ ] Damage numbers float on screen (via particle/effect system)
- [ ] Enemy HP bar appears and decreases
- [ ] Enemy retaliates when in range (AI engages)
- [ ] Enemy death → removal from `game.enemies[]` → loot pile spawns
- [ ] Player death → `game.state = 'gameover'` → game over screen renders

---

### 1.3 Item Pickup and Inventory

**Goal:** Loot drops appear after enemy death, player picks up items, items show in inventory (I/Tab), consumables work, equipment can be equipped.

**Current State:** Inventory system exists in `player.js` (15 slots). Loot system drops items into `game.groundLoot[]`. Pickup likely requires player proximity or walk-over detection.

**Key Files & Functions:**

| File | Function | Line | Role |
|------|----------|------|------|
| `js/systems/combat-master.js` | `handleDeath()` (enemy path) | ~2135 | Triggers loot drop on enemy kill |
| `js/entities/player.js` | `game.player.inventory` | — | Array of item objects (max 15 slots) |
| `js/entities/player.js` | `equipItem(item)` | exported | Moves item from inventory to equipment slot |
| `js/ui/renderer.js` | `drawInventoryOverlay()` | ~50 | Renders inventory screen with tabs |
| `js/systems/input-handler.js` | Key handlers | ~18+ | I/Tab opens inventory, 1 uses consumable |

**Implementation Checklist:**
1. **Loot Drop Verification:** Kill an enemy → confirm `game.groundLoot` gains an entry with `x, y, items[]`
2. **Pickup Mechanic:** Verify the game loop checks player position against `game.groundLoot` entries each frame. If missing, add proximity check in the dungeon update loop:
   ```javascript
   // In updateDungeon() or a registered system:
   game.groundLoot.forEach((pile, index) => {
       if (Math.abs(pile.x - game.player.gridX) <= 0.5 &&
           Math.abs(pile.y - game.player.gridY) <= 0.5) {
           // Auto-pickup or show prompt
           pile.items.forEach(item => {
               game.player.inventory.push(item);
           });
           game.groundLoot.splice(index, 1);
       }
   });
   ```
3. **Inventory Display:** Press I or Tab → `drawInventoryOverlay()` renders → items listed with icons/names
4. **Use Consumable:** Press 1 (or click in inventory) → consumable effect applied → item removed
5. **Equip Item:** In inventory, select weapon/armor → equip action → item moves to `game.player.equipped[slot]`

**Potential Issues:**
- Loot names from drop tables might not match `ITEMS_DATA` keys (recently fixed per commit `b7aa9f79`)
- Inventory might not have a scroll mechanism if more than ~12 items fit on screen
- Check that `game.player.inventory` isn't `undefined` at start — `createPlayer()` initializes it as `[]` but `createDefaultPlayer()` also sets it to `[]` (line 691 of game-init.js)

---

### 1.4 Floor Advancement (Floors 1-10)

**Goal:** Each floor has a stairs/exit tile. Interacting with it advances to the next floor. Player state persists between floors. Floor 10 is the final floor.

**Current State:** `advanceToNextFloor()` exists in `game-init.js` (line 743). It increments `game.floor`, regenerates the dungeon, repositions the player, and awards +15 max HP per floor cleared. `SessionManager.descendToNextFloor()` handles session tracking.

**Key Files & Functions:**

| File | Function | Line | Role |
|------|----------|------|------|
| `js/core/game-init.js` | `advanceToNextFloor()` | ~743 | Core floor transition: cleanup → increment floor → regenerate → reposition |
| `js/core/session-manager.js` | `descendToNextFloor()` | ~68 | Session tracking: updates `sessionState.currentFloor`, checks deepest floor stat |
| `js/generation/dungeon-integration.js` | Stairway generation | varies | Generates exit tiles per floor |
| `js/systems/input-handler.js` | Stairway interaction | varies | Detects player on stairs + key press |

**Floor Advancement Flow:**
1. Dungeon generator places exit/stairs tile in a room (typically the exit room or after mini-boss defeat)
2. Player walks to stairs tile → `sessionState.pathDown.discovered = true`
3. Mini-boss defeated → `sessionState.pathDown.revealed = true` → stairs become usable
4. Player interacts with stairs → calls `SessionManager.descendToNextFloor()` then `advanceToNextFloor()`
5. `advanceToNextFloor()` awards +15 max HP, cleans up, generates new floor, repositions player

**What to Verify:**
- [ ] Exit/stairs tile spawns on every floor (check dungeon generation for exit room)
- [ ] Stairs interaction triggers (E key or walk-over)
- [ ] `advanceToNextFloor()` preserves: `game.player.hp`, `game.player.maxHp`, `game.player.inventory`, `game.player.gold`, `game.player.equipped`, `game.player.stats`
- [ ] Floor counter updates: `game.floor` and `sessionState.currentFloor` stay in sync
- [ ] Floor 10 logic: `SessionManager.descendToNextFloor()` caps at floor 10 (line 78: `if (nextFloor > 9)` → sets to 10)
- [ ] Enemy difficulty scales with floor (check enemy spawner uses `game.floor` for tier selection)

**Critical Detail — Player State Preservation:**
In `advanceToNextFloor()` (line 743), the function calls `cleanupPreviousGame()` but does NOT call `initializePlayer()` — it reuses the existing `game.player`. Verify that `cleanupPreviousGame()` (via `SystemManager.cleanupAll()`) does NOT reset `game.player`. If it does, player state (inventory, gold, HP) will be wiped between floors.

**Implementation Fix if Player Gets Reset:**
```javascript
// In advanceToNextFloor(), before cleanupPreviousGame():
const savedPlayer = { ...game.player };
cleanupPreviousGame();
game.player = savedPlayer;  // Restore player after cleanup
```

---

### 1.5 Victory Condition (Floor 10 Cleared)

**Goal:** When the player clears Floor 10, trigger victory. Show a victory screen with run summary. Return to village keeping all loot and gold.

**Current State:** `SessionManager.coreCompleted()` (line 200 of session-manager.js) sets `game.state = 'victory'` and marks `persistentState.stats.coreDefeated = true`. However, this is tied to defeating "The Core" (final boss entity), not simply reaching Floor 10's exit. The render function (`renderer.js` line 981) does NOT currently handle the `'victory'` state — it only handles `'menu'` and `'gameover'`.

**Key Files & Functions:**

| File | Function | Line | Role |
|------|----------|------|------|
| `js/core/session-manager.js` | `coreCompleted()` | ~200 | Sets victory state, marks `coreDefeated` |
| `js/core/game-init.js` | `advanceToNextFloor()` | ~743 | Floor transition — needs Floor 10 victory check |
| `js/ui/renderer.js` | `render()` | ~981 | Main render — needs victory screen rendering |
| `js/core/main.js` | `update()` switch | ~49 | Already handles `'victory'` state (no updates needed) |

**Implementation Steps:**

1. **Trigger Victory on Floor 10 Clear:**
   Add a check in the floor advancement logic. When the player reaches the exit on Floor 10, instead of advancing to Floor 11, trigger victory:
   ```javascript
   // In the stairs interaction handler (wherever advanceToNextFloor is called):
   if (game.floor >= 10) {
       // Victory! Don't advance - trigger win condition
       SessionManager.coreCompleted();
       return;
   }
   advanceToNextFloor();
   ```

2. **Fix `coreCompleted()` to Preserve Loot:**
   Currently `coreCompleted()` just sets state and ends session. It needs to:
   - Transfer `game.player.inventory` to `persistentState.bank.items` (player keeps everything)
   - Transfer `game.player.gold` to `persistentState.bank.gold`
   - Save persistent state
   ```javascript
   // Add to coreCompleted() before setting game.state:
   // Transfer all carried items to bank
   if (game.player && game.player.inventory) {
       game.player.inventory.forEach(item => {
           persistentState.bank.items.push({ ...item });
           persistentState.bank.usedSlots++;
       });
   }
   // Transfer gold to bank
   if (game.player && game.player.gold) {
       persistentState.bank.gold += game.player.gold;
   }
   // Save
   if (typeof SaveManager !== 'undefined') {
       SaveManager.save(persistentState.saveSlot || 0);
   }
   ```

3. **Add Victory Screen Rendering:**
   Add a victory rendering case in `renderer.js`'s `render()` function after the gameover check:
   ```javascript
   // In render(), after the gameover check (line ~994):
   if (game.state === 'victory') {
       drawVictoryScreen(ctx, canvas.width, canvas.height);
       return;
   }
   ```
   Create `drawVictoryScreen()` with:
   - Title: "Victory! The Chasm is Conquered"
   - Run summary: floors cleared, enemies killed, items collected, gold earned
   - Button: "Return to Village" → calls `returnToVillage()`

4. **Wire Return to Village:**
   The existing `returnToVillage()` function (game-init.js line 142) handles cleanup and state transition. On click from victory screen → call `returnToVillage()`.

5. **Fix Malphas Boss Death Trigger:**
   `malphas-boss.js:1682` currently sets `game.state = 'gameover'` on boss defeat. Change to:
   ```javascript
   // FROM:
   game.state = 'gameover';
   // TO:
   if (typeof SessionManager !== 'undefined') {
       SessionManager.coreCompleted();
   } else {
       game.state = 'victory';
   }
   ```
   Also add victory tracking:
   ```javascript
   persistentState.victoryAchieved = true;
   persistentState.victoryTimestamp = Date.now();
   persistentState.stats.victories = (persistentState.stats.victories || 0) + 1;
   ```

---

### 1.6 Death and Game Over Flow

**Goal:** HP reaches 0 → game over screen → full reset (permadeath). All state is wiped: bank, skills, stats, quest progress, and save file deleted. Player starts completely fresh.

**Current State: WORKING AS DESIGNED.**

The `SessionManager.playerDeath()` (session-manager.js line 127) implements **TRUE PERMADEATH** — it calls `createNewPersistentState()` which wipes ALL persistent state including bank, skills, stats, and quest progress. The `handlePlayerDeath()` in `player.js` (line 478) calls `SessionManager.playerDeath()` and then `SaveManager.deleteSave()`. This is the correct behavior.

**Death Flow (Already Implemented):**
1. Player HP ≤ 0 → `handlePlayerDeath()` in `player.js:478`
2. Clears boons via `BoonSystem.clearBoons()`
3. Clears status effects
4. Calls `SessionManager.playerDeath()` → wipes all persistent state
5. Calls `SaveManager.deleteSave()` → removes save from localStorage
6. Sets `game.state = 'gameover'`

**Verification Steps:**
1. **Game Over Screen:** Die → `drawGameOverScreen()` renders → shows run summary (floor reached, enemies killed)
2. **Full Reset:** "Restart" from game over → `restartGame()` fires → all state wiped → fresh start
3. **Save Deleted:** After death, check localStorage — save slot should be cleared
4. **Clean New Game:** After restart, verify: bank empty, skills null, stats reset, inventory empty, gold = starting amount
5. **Starter Kit:** `restartGame()` calls `initializeStartingKit()` — verify player gets a basic weapon to begin

**Implementation Notes:**
- The existing `restartGame()` in `game-init.js:797` correctly handles full permadeath reset — no changes needed
- `handlePlayerDeath()` correctly chains: clear boons → session death → delete save → game over state
- The game over screen should show a run summary (floor reached, enemies killed, etc.) to give the death impact
- After restart, `startInVillage()` initializes fresh state via `createNewPersistentState()`

---

### 1.7 NPC Dialogue System

**Goal:** Walk to NPC → press E → dialogue opens → response options work → dialogue-driven actions (open shop, bank, start run) function.

**Current State:** `DialogueUI` is robust with text animation, branching, fallback handling, and action dispatching. `VillageSystem._tryInteract()` finds the nearest NPC and calls `DialogueUI.open(npc)`.

**Key Files & Functions:**

| File | Function | Line | Role |
|------|----------|------|------|
| `js/systems/village-system.js` | `_tryInteract()` | ~199 | Finds nearest NPC within 1.5 tile range |
| `js/systems/village-system.js` | `_interactWithNPC(npc)` | ~229 | Calls `DialogueUI.open(npc)` |
| `js/ui/dialogue-ui.js` | `open(npc)` | ~35 | Validates NPC, finds initial dialogue node, sets `game.state = 'dialogue'` |
| `js/ui/dialogue-ui.js` | `showNode(nodeId)` | ~97 | Displays dialogue text, populates response options |
| `js/ui/dialogue-ui.js` | `handleInput(key)` | — | Arrow keys navigate, Enter selects, Escape closes |
| `js/data/npcs.js` | NPC definitions | — | NPC data including `initialDialogue`, inventory keys, positions |

**Verification Steps:**
1. Walk near NPC → `npc.showInteraction` becomes `true` (line 179 of village-system.js) → interaction indicator renders
2. Press E → `_tryInteract()` finds NPC → `DialogueUI.open(npc)` called
3. Dialogue box renders with NPC text and response options
4. Arrow keys navigate responses, Enter selects
5. Action responses work:
   - "Browse wares" → `ShopUI.open(npc)` (sets `game.state = 'shop'`)
   - "Access bank" → `BankUI.open()` (sets `game.state = 'bank'`)
   - "End conversation" → `DialogueUI.close()` → state returns to `'village'`
6. Escape closes dialogue at any time

**Potential Issues:**
- NPC `initialDialogue` or `currentDialogue` might point to a node ID that doesn't exist in the dialogue tree → `_showFallbackDialogue()` handles this gracefully (shows "..." with close option)
- Dialogue action handlers might reference systems that aren't loaded → check for `typeof ShopUI !== 'undefined'` guards in dialogue response actions

---

### 1.8 Shop System (Buy/Sell)

**Goal:** Shops open via dialogue, player can buy items (gold deducted, item added), sell items (gold added, item removed), prices are accurate.

**Current State:** `ShopUI` is functional with NPC-specific inventories defined inline (lines 23-43 of shop-ui.js). Has buy/sell tabs, item validation, and price checking.

**Key Files & Functions:**

| File | Function | Line | Role |
|------|----------|------|------|
| `js/ui/shop-ui.js` | `open(npc)` | ~54 | Sets up shop for specific NPC using `npc.inventory` key |
| `js/ui/shop-ui.js` | `INVENTORIES` | ~23 | Stock definitions: `blacksmith_stock`, `alchemist_stock`, `innkeeper_stock` |
| `js/ui/shop-ui.js` | `_validateItem(item)` | ~79 | Validates prices are positive integers |
| `js/ui/shop-ui.js` | `handleInput(key)` | — | Tab switches buy/sell, Enter confirms purchase/sale |

**Verification Steps:**
1. Talk to Blacksmith → select "Browse Wares" → `ShopUI.open(npc)` → shop displays with items
2. Select item → buy → gold decreases by `item.price` → item added to `game.player.inventory`
3. Switch to Sell tab → select inventory item → sell → gold increases by sell price → item removed
4. Verify gold updates reflect in both `game.player.gold` and the HUD
5. Verify inventory capacity check (can't buy if inventory full)

**Gold Source of Truth:**
- During village, gold is stored in `persistentState.bank.gold` (the bank)
- During a run, gold is in `game.player.gold` (at risk)
- Shops in the village should transact against `persistentState.bank.gold`
- Shops found in the dungeon (if any) should transact against `game.player.gold`
- **Verify which gold source the shop reads/writes** — if it uses the wrong one, purchases won't work correctly

---

### 1.9 Skill System (Per-Run Proficiencies)

**Goal:** Combat grants skill XP in relevant proficiencies during a run. Skills UI shows levels and XP progress. Skills are wiped on death (permadeath — all state resets).

**Current State:** `persistentState.skills` is initialized as `null` (line 235 of game-state.js) with a comment: "Populated by skill-system.js when player is created." The Skills UI renders a triangle radar chart with Melee/Ranged/Magic proficiencies.

**Key Files & Functions:**

| File | Function | Line | Role |
|------|----------|------|------|
| `js/core/game-state.js` | `persistentState.skills` | ~235 | Skill data store (null until initialized) |
| `js/ui/skills-ui.js` | `SKILLS_UI_CONFIG` | ~9 | UI config: proficiencies (Melee, Ranged, Magic), radar chart settings |
| `js/ui/skills-ui.js` | `drawActionBar()` | ~67 | DISABLED — expertise action bar removed |
| `js/systems/combat-master.js` | Skills integration | varies | XP awards on enemy kills |

**Verification Steps:**
1. **Skill Initialization:** Confirm that `persistentState.skills` gets populated when a player is created. If it stays `null`, skills can't be tracked. Check for a skill init call in `createPlayer()` or system initialization.
2. **XP Award on Kill:** Kill an enemy with a melee weapon → Melee XP should increase. Search for skill XP award calls in `handleDeath()` or the kill tracking code.
3. **Within-Run Progression:** Verify skill XP accumulates during a run and provides bonuses (e.g., increased damage for melee proficiency).
4. **Skills UI:** Press K → triangle radar chart renders → proficiency levels visible → XP progress shown.
5. **Reset on Death:** Skills are wiped along with all other state on death (permadeath). Verify a fresh game has `persistentState.skills` reset to null or defaults.

**If Skills Are Not Being Awarded:**
Find the skill XP award function and ensure it's called in the enemy death handler:
```javascript
// In handleDeath() for enemies, after loot drop:
if (killer === game.player && typeof awardSkillXP === 'function') {
    const weaponType = game.player.equipped?.MAIN?.weaponType || 'melee';
    awardSkillXP(weaponType, enemy.xpValue || 10);
}
```

---

## TIER 2 — BETWEEN-RUN INFRASTRUCTURE

---

### 2.1 Bank System

**Goal:** Banker NPC opens bank interface. Player deposits/withdraws items. Bank persists across page reloads (within a run). Bank is wiped on death (permadeath). Capacity: 20-30 slots.

**Current State:** `BankUI` is implemented with two-tab layout (BANK/INVENTORY), keyboard navigation (Tab/arrow/Enter/Escape), and deposit/withdraw actions. `persistentState.bank` stores `{ gold, items[], usedSlots }`. `BankingSystem` handles the backend logic.

**Key Files & Functions:**

| File | Function | Line | Role |
|------|----------|------|------|
| `js/ui/bank-ui.js` | `open()` | ~35 | Opens bank, sets `game.state = 'bank'` |
| `js/ui/bank-ui.js` | `close()` | ~50 | Returns to village state |
| `js/ui/bank-ui.js` | `handleInput(key, shiftKey)` | ~69 | Full keyboard navigation: Tab cycles focus areas, arrows navigate, Enter deposits/withdraws |
| `js/systems/banking-system.js` | Backend operations | varies | Deposit, withdraw, capacity checks |
| `js/core/game-state.js` | `persistentState.bank` | ~158 | `{ gold: 0, items: [], usedSlots: 0 }` |

**Verification Steps:**
1. Talk to Banker NPC → dialogue option opens bank → `BankUI.open()` fires
2. **Deposit:** Select item from inventory tab → deposit → item moves to bank tab → `persistentState.bank.items` gains entry
3. **Withdraw:** Select item from bank tab → withdraw → item moves to inventory → `persistentState.bank.items` loses entry
4. **Persistence across reload:** Deposit item → close browser tab → reopen → check bank → item still there (save file intact)
5. **Wiped on death:** Deposit item → enter dungeon → die → full reset (permadeath) → bank is empty on new game
6. **Gold deposit/withdraw:** Test gold transfer between `game.player.gold` (or village gold) and `persistentState.bank.gold`
7. **Capacity:** Verify max bank slots (check `BANKING_CONFIG.maxSlots` or hardcoded limit)

**Implementation Notes:**
- The bank UI renders as an overlay on the village (handled in `renderer.js` line 1013-1014)
- `BankUI.render(ctx)` is called when `game.state === 'bank'`
- Bank input handling needs to be wired in the village input system — verify `VillageSystem._handleKeyDown()` routes to `BankUI.handleInput()` when state is `'bank'`
- The state flow: village → dialogue with Banker → select "Access vault" → `BankUI.open()` → state = 'bank'
- **Banker NPC dialogue** is properly mapped in `npcs.js` lines 88-107: NPC ID `banker`, name "Grimwald" (The Vault Keeper), with dialogue action `'open_bank'` at line 472
- **Dialogue action handler** in `dialogue-ui.js` lines 341-347 closes dialogue and opens BankUI

**Known Bug — Bank Capacity Model Broken:**
Three conflicting capacity definitions exist and must be reconciled:
1. `persistentState.bank` has NO `capacity` field (only `gold`, `items[]`, `usedSlots`)
2. `bank-ui.js:349` reads `persistentState?.bank?.capacity` (undefined) → falls back to hardcoded 50
3. `banking-system.js:147` returns `maxSlots: Infinity` — `isFull()` at line 201 always returns `false`

**Fix:**
```javascript
// 1. Add capacity to persistentState.bank in game-state.js (line ~159):
bank: {
    gold: 0,
    items: [],
    usedSlots: 0,
    capacity: 30  // Fixed capacity for MVP
}

// 2. Also add to createNewPersistentState() factory function (line ~319):
bank: {
    gold: BANKING_CONFIG ? BANKING_CONFIG.startingGold : 50,
    items: [],
    usedSlots: 0,
    capacity: 30
}

// 3. Update banking-system.js to use this capacity:
// Replace maxSlots: Infinity with:
maxSlots: persistentState?.bank?.capacity || 30

// 4. Update isFull() to actually check:
isFull() {
    const max = persistentState?.bank?.capacity || 30;
    return (persistentState?.bank?.items?.length || 0) >= max;
}
```

---

### 2.2 Loadout Selection Before Run (Conditional)

**Goal:** Before entering dungeon, player selects equipment from bank to bring on the run. Basic loadout is always free. Skip this feature entirely if it's buggy.

**Current State:** `LoadoutUI` exists with an Arc Raiders-inspired 3-panel layout (bank / equipment / inventory). It has spell selection (dash/heal/shield), equipment slot management, and a "Start Run" action that calls `startDungeonRun()`.

**Key Files & Functions:**

| File | Function | Line | Role |
|------|----------|------|------|
| `js/ui/loadout-ui.js` | `open()` | ~53 | Resets run inventory, sets state to 'loadout' |
| `js/ui/loadout-ui.js` | `handleInput(key)` | ~86 | Panel switching, item selection, spell selection |
| `js/ui/loadout-ui.js` | `EQUIPMENT_SLOTS` | ~35 | HEAD, MAIN, CHEST, OFF, LEGS, FEET |
| `js/ui/loadout-ui.js` | `runEquipment` / `runInventory` | ~39 | Selected gear for this run |
| `js/systems/loadout-system.js` | Backend | varies | Loadout validation and application |
| `js/core/game-init.js` | `applyLoadoutToPlayer(loadout)` | ~116 | Equips weapon, armor, consumables to player |

**Decision Point: Keep or Skip?**

Test the loadout screen quickly:
1. Walk to cave → loadout opens → can select items from bank
2. Can equip weapon to MAIN slot
3. Can add consumables
4. "Start Run" → `startDungeonRun()` fires with selected loadout
5. In dungeon, player has selected equipment

**If it works:** Keep it. It's a nice UX.

**If it's buggy:** Skip. Implement the fallback in VillageSystem:
```javascript
_onChasmEntrance() {
    // Direct start: bring everything in bank
    const loadout = {
        weapon: persistentState.bank.items.find(i => i.slot === 'MAIN') || null,
        armor: persistentState.bank.items.find(i => i.slot === 'CHEST') || null,
        consumables: persistentState.bank.items.filter(i => i.type === 'consumable').slice(0, 3)
    };
    startDungeonRun({ startingFloor: 1, loadout });
}
```

---

### 2.3 Persistent Statistics

**Goal:** Stats update after each run. Accessible from village. Tracks: total runs, deepest floor, total kills, total gold earned, victories.

**Current State:** `persistentState.stats` already tracks:
- `totalRuns` (incremented in `SessionManager.startRun()`)
- `deaths` (incremented in `playerDeath()` before state wipe)
- `deepestFloor` (updated in `descendToNextFloor()`)
- `miniBossesDefeated`
- `playtime` (tracked every second in `main.js` update loop, lines 74-81)
- `coreDefeated` (set in `coreCompleted()`)

**Missing Stats:**
- `totalKills` — needs to be incremented in `handleDeath()` for enemy kills
- `totalGoldEarned` — needs to be incremented when gold is picked up
- `victories` — needs to be incremented on Floor 10 clear

**Key Files:**

| File | Location | What to Add |
|------|----------|-------------|
| `js/core/game-state.js` | `persistentState.stats` (line 165) | Add `totalKills: 0`, `totalGoldEarned: 0`, `victories: 0` |
| `js/core/game-state.js` | `createNewPersistentState()` (line 324) | Add same fields to factory function |
| `js/systems/combat-master.js` | `handleDeath()` (line 2135) | Add `persistentState.stats.totalKills++` for enemy kills |
| `js/core/session-manager.js` | `coreCompleted()` | Add `persistentState.stats.victories++` |

**Monster Kill Tracking Bug:**
`trackMonsterKill()` exists at `game-state.js:548` and properly increments `persistentState.monsterKillCounts[monsterName]` and calls `discoverMonster()`. However, **it is never called from combat**. Wire it into the enemy death path:
```javascript
// In handleDeath() at combat-master.js:2135, in the enemy death branch:
if (typeof trackMonsterKill === 'function') {
    trackMonsterKill(entity.name || entity.type);
}
persistentState.stats.totalKills = (persistentState.stats.totalKills || 0) + 1;
```

**Stats Display:**
The `character-overlay.js` renders the character sheet with:
- Title "CHARACTER" (line 251)
- Level display (line 268), XP bar (lines 276-279)
- Vitals: HP/MP/Stamina bars (lines 285-307)
- Attributes: STR/AGI/INT/STA (lines 320-328)
- Equipment: 6-slot visualization (lines 337-354)
- Gold display (lines 358-379)

**Missing: Career stats section.** Add after line 334 in character-overlay.js to show:
- Total Runs, Deaths, Deepest Floor, Victories, Total Kills, Playtime

**Note on Permadeath and Stats:**
Since death triggers a full state wipe (`createNewPersistentState()`), persistent stats are lost on death. Stats are primarily useful for tracking progress within a successful run or across a session before death. If career-spanning stats are desired in the future, they would need to be stored separately (e.g., in a separate localStorage key outside the save file). For MVP, stats tracking within a run is sufficient.

---

## TIER 3 — DEPTH & ENGAGEMENT

---

### 3.1 Boon System (Per-Run Power-Ups)

**Goal:** Shrines appear in dungeon (2-4 per floor). Interacting offers boon choices. Boons apply stat bonuses. Lost on death. Max 8 per run.

**Current State: FULLY IMPLEMENTED** — 70 boons across 7 Ancestors in 3 tiers. The boon system itself is complete, but the shrine spawning and interaction chain needs verification.

**Key Files & Functions:**

| File | Function | Line | Role |
|------|----------|------|------|
| `js/systems/boon-system.js` | `BoonSystem.init()` | ~1335 | Initialize empty boon state |
| `js/systems/boon-system.js` | `BoonSystem.grantBoon()` | ~1357 | Add boon, check max (8), apply bonus |
| `js/systems/boon-system.js` | `BoonSystem.clearBoons()` | ~1343 | Clear all boons on death |
| `js/systems/boon-system.js` | `BoonSystem.getShrineBoons()` | ~1582 | Get 3 random boons respecting tier requirements |
| `js/systems/boon-system.js` | `BoonSystem.meetsRequirements()` | ~1554 | Check if boon tier prereqs met |
| `js/core/game-init.js` | `interactWithDecoration()` | ~538 | Routes shrine decoration type to `openShrineUI()` |
| `js/entities/player.js` | `handlePlayerDeath()` | ~480 | Calls `BoonSystem.clearBoons()` on death |

**Boon Config (lines 19-27):**
- Max boons per run: **8**
- Shrine offerings: **3 choices** per shrine
- Clear on death: **true**

**Boon Tiers:**
- **Core Boons (21)** — Lines 104-445: 3 per Ancestor, always available, stackable (2-3 max)
- **Resonance Boons (42)** — Lines 447-1202: Cross-Ancestor synergies, require 1 boon from each of 2 different Ancestors
- **Legendary Boons (7)** — Lines 1204-1318: Ultimate capstones, require 3 boons from same Ancestor

**Known Gap:** `getTotalBonus()` (lines 1452-1508) only handles basic stat bonuses (maxHp, damageReduction, attackSpeed, gold, xp, damage). Complex conditional effects (torch-based, enemy-specific) are defined but don't execute. This is acceptable for MVP — basic stat boons will work.

**Verification Steps:**
1. **Shrine Spawning:** Check dungeon generation for shrine/boon_shrine decoration placement. Look for shrine spawning in the dungeon generator or post-initialization.
2. **Shrine Interaction:** Walk to shrine → right-click or press E → `interactWithDecoration()` dispatches to `openShrineUI()`
3. **Boon Selection:** Shrine UI presents 2-3 boon choices → select one → stat bonus applied
4. **Boon Tracking:** Boons stored on player object (likely `game.player.boons[]`)
5. **Boon Limit:** Cannot pick up more than 8 boons per run
6. **Clear on Death:** `BoonSystem.clearBoons()` is called in `handlePlayerDeath()` — verify it actually clears

**If Shrine Spawning Is Missing:**
Add shrine placement in `postInitialization()` or as part of dungeon generation:
```javascript
// Place 2-4 shrines in random rooms (not entrance/exit)
const eligibleRooms = game.rooms.filter(r => r.type !== 'entrance' && r.type !== 'exit');
const shrineCount = 2 + Math.floor(Math.random() * 3); // 2-4
for (let i = 0; i < shrineCount && i < eligibleRooms.length; i++) {
    const room = eligibleRooms[i];
    // Place shrine at room center
    const shrineX = room.floorX + Math.floor(room.floorWidth / 2);
    const shrineY = room.floorY + Math.floor(room.floorHeight / 2);
    game.decorations.push({
        x: shrineX, y: shrineY,
        type: 'boon_shrine',
        interactable: true,
        name: 'Ancient Shrine',
        room: room
    });
}
```

---

### 3.2 Enemy Scaling by Floor

**Goal:** Floor 1 has weak enemies. Deeper floors have harder enemies. Elites appear on later floors. Floor 10 is a genuine challenge.

**Current State:** Enemies have tiers (`TIER_3`, `TIER_2`, `TIER_1`, `ELITE`, `BOSS`) with damage multipliers. `logEnemyTierDistribution()` (game-init.js line 723) logs tier counts, confirming the tier system is active. Enemy spawning uses `game.floor` to select appropriate tiers.

**Key Files & Functions:**

| File | Role |
|------|------|
| `js/entities/enemy.js` | Enemy creation, tier-based stat scaling |
| `js/core/constants.js` | Tier definitions, multiplier tables |
| `js/data/core-data.js` | Monster data definitions |
| `js/generation/dungeon-integration.js` | Enemy spawning per floor |

**Scaling Targets:**

| Floor | Enemy Tiers | Expected Difficulty |
|-------|-------------|---------------------|
| 1-2 | TIER_3 only | Tutorial-level, forgiving |
| 3-4 | TIER_3 + TIER_2 mix | Moderate challenge |
| 5-6 | TIER_2 + TIER_1 mix | Noticeable danger |
| 7-8 | TIER_1 + some ELITE | Hard, requires careful play |
| 9 | TIER_1 + ELITE heavy | Very challenging |
| 10 | ELITE + BOSS | Genuine gauntlet |

**Verification Steps:**
1. Start a run → check `logEnemyTierDistribution()` output for Floor 1 → should be mostly TIER_3
2. Advance to Floor 5 → check distribution → should include TIER_2 and TIER_1
3. Advance to Floor 10 → check distribution → should have ELITE and/or BOSS
4. Verify enemy HP and damage scale appropriately (enemies on Floor 10 should feel much harder than Floor 1)
5. Check that the player's +15 max HP per floor and accumulated gear offset the increasing difficulty

**CRITICAL BUG — `applyTierMultipliers()` Is Undefined:**

`enemy-spawner.js:617` calls `applyTierMultipliers(template, monsterType, currentFloor)` but this function **does not exist** anywhere in the codebase. The fallback at line 619 uses raw template stats, which means all enemies of the same tier have identical HP/damage regardless of floor.

The existing tier distribution weighting (`getTierWeightsForDifficulty()` at lines 558-584) works correctly — it shifts toward harder tiers on deeper floors. But base stats within a tier don't scale.

**Fix — Define `applyTierMultipliers()` in `enemy-spawner.js`:**
```javascript
/**
 * Scale enemy stats by floor level
 * @param {Object} template - Base monster template
 * @param {string} monsterType - Monster type name
 * @param {number} floor - Current dungeon floor (1-10)
 * @returns {Object} Scaled stats
 */
function applyTierMultipliers(template, monsterType, floor) {
    // Floor scaling: 15% more HP/damage per floor
    const floorScale = 1 + (floor - 1) * 0.15;
    // Floor 1 = 1.0x, Floor 5 = 1.6x, Floor 10 = 2.35x

    return {
        ...template,
        hp: Math.floor((template.hp || 50) * floorScale),
        maxHp: Math.floor((template.hp || 50) * floorScale),
        str: Math.floor((template.str || 10) * floorScale),
        damage: Math.floor((template.damage || 8) * floorScale),
        defense: Math.floor((template.defense || 2) * (1 + (floor - 1) * 0.10)),
        xpValue: Math.floor((template.xpValue || 10) * floorScale)
    };
}
window.applyTierMultipliers = applyTierMultipliers;
```

**Existing Tier Weights (Working — Lines 558-584):**
```
Room difficulty near entrance:  TIER_3: 80%, TIER_2: 18%, TIER_1: 2%
Room difficulty mid:            TIER_3: 50%, TIER_2: 35%, TIER_1: 12%, ELITE: 3%
Room difficulty far from entry: TIER_3: 25%, TIER_2: 35%, TIER_1: 30%, ELITE: 10%

Floor bonus: +3% shift per floor (max 15%), favoring stronger tiers on deeper floors
```

**Monster Tier Properties (from `monster-tiers.js`):**

| Tier | HP Scale | Move Speed | Perception | AI Complexity |
|------|----------|------------|------------|---------------|
| TIER_3 (Fodder) | 1.0x | 2.5 tiles/s | 3-6 tiles | Very simple |
| TIER_2 (Regular) | 1.5-2.0x | 3.0-3.5 tiles/s | 4-8 tiles | Moderate |
| TIER_1 (Elite) | 2.5-3.5x | 3.5-4.0 tiles/s | 5-10 tiles | Tactical |
| ELITE (Boss Lt.) | 4.0-5.0x | 3.0-3.5 tiles/s | 6-12 tiles | Strategic |
| BOSS (Floor Boss) | 5.0-10x | 2.5-3.5 tiles/s | 10-15 tiles | Full AI |

---

### 3.3 Playtest Feedback Tool

**Goal:** Press F9 → copies JSON game state dump to clipboard. Shows toast notification. Helps testers provide actionable bug reports.

**Current State:** No `playtest-reporter.js` exists. Only `js/debug/ai-visualizer.js` is in the debug folder. The game has message logging (`game.messageLog`) and event tracking in various systems.

**Implementation — New File: `js/debug/playtest-reporter.js`**

```javascript
// === js/debug/playtest-reporter.js ===
// Playtest feedback tool - Press F9 to dump game state to clipboard

const PlaytestReporter = {
    // Rolling event log
    eventLog: [],
    maxEvents: 50,
    sessionStartTime: Date.now(),

    init() {
        window.addEventListener('keydown', (e) => {
            if (e.key === 'F9') {
                this.dumpToClipboard();
            }
        });
        console.log('[PlaytestReporter] Press F9 to copy game state to clipboard');
    },

    logEvent(type, data) {
        this.eventLog.push({
            time: Date.now() - this.sessionStartTime,
            type,
            data
        });
        if (this.eventLog.length > this.maxEvents) {
            this.eventLog.shift();
        }
    },

    dumpToClipboard() {
        const dump = {
            timestamp: new Date().toISOString(),
            sessionDuration: Math.floor((Date.now() - this.sessionStartTime) / 1000) + 's',
            gameState: game.state,
            floor: game.floor,
            player: game.player ? {
                hp: game.player.hp,
                maxHp: game.player.maxHp,
                gold: game.player.gold,
                inventoryCount: game.player.inventory?.length || 0,
                weapon: game.player.equipped?.MAIN?.name || 'none',
                armor: game.player.equipped?.CHEST?.name || 'none',
                position: { x: game.player.gridX, y: game.player.gridY }
            } : null,
            enemies: game.enemies?.length || 0,
            skills: persistentState?.skills || null,
            bankGold: persistentState?.bank?.gold || 0,
            bankItems: persistentState?.bank?.items?.length || 0,
            stats: persistentState?.stats || null,
            recentEvents: this.eventLog.slice(-50)
        };

        const json = JSON.stringify(dump, null, 2);

        navigator.clipboard.writeText(json).then(() => {
            this._showToast('Game state copied to clipboard');
        }).catch(() => {
            console.log('=== PLAYTEST DUMP ===');
            console.log(json);
            this._showToast('State logged to console (clipboard blocked)');
        });
    },

    _showToast(message) {
        // Render toast in next frame
        this._toastMessage = message;
        this._toastTime = Date.now();
    },

    renderToast(ctx) {
        if (!this._toastMessage || Date.now() - this._toastTime > 3000) {
            this._toastMessage = null;
            return;
        }
        const alpha = Math.max(0, 1 - (Date.now() - this._toastTime) / 3000);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#1a1a2e';
        ctx.strokeStyle = '#4a4a6a';
        const tw = ctx.measureText(this._toastMessage).width + 40;
        const tx = (canvas.width - tw) / 2;
        ctx.fillRect(tx, canvas.height - 60, tw, 36);
        ctx.strokeRect(tx, canvas.height - 60, tw, 36);
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(this._toastMessage, canvas.width / 2, canvas.height - 38);
        ctx.restore();
    }
};

window.PlaytestReporter = PlaytestReporter;
```

**Integration Steps:**
1. Create `js/debug/playtest-reporter.js` with the code above
2. Add `<script src="js/debug/playtest-reporter.js"></script>` to `index.html`
3. Call `PlaytestReporter.init()` in game initialization
4. Add `PlaytestReporter.renderToast(ctx)` to the end of the `render()` function in `renderer.js`
5. Add `PlaytestReporter.logEvent()` calls in key locations:
   - `handleDeath()` → `PlaytestReporter.logEvent('kill', { enemy: entity.name })`
   - `handlePlayerDeath()` → `PlaytestReporter.logEvent('death', { floor: game.floor })`
   - `advanceToNextFloor()` → `PlaytestReporter.logEvent('floor_advance', { floor: game.floor })`
   - Item pickup → `PlaytestReporter.logEvent('loot', { item: item.name })`

---

## TIER 4 — POLISH & FEEL

---

### 4.1 HUD During Dungeon Runs

**Goal:** HP/MP/Stamina bars visible. Minimap shows explored areas. Action bar shows hotkeys. Floor counter visible. Target info shows selected enemy.

**Current State: WELL-IMPLEMENTED.** All three major HUD subsystems are fully built and rendering.

**Key Files & Functions:**

| File | Function | Line | Status |
|------|----------|------|--------|
| `js/ui/unit-frames.js` | `renderUnitFrames(ctx)` | ~44 | WORKING — Ornate gold-framed player/enemy stats |
| `js/ui/unit-frames.js` | `renderPlayerFrame(ctx)` | ~65 | WORKING — HP/Mana bars, stamina pips, floor counter (`F${floorNum}` at line 198) |
| `js/ui/unit-frames.js` | `renderEnemyFrame(ctx, target)` | ~245 | WORKING — Tier-colored borders, crown/diamond for BOSS/ELITE |
| `js/ui/unit-frames.js` | Status effect icons | ~967 | WORKING — Gem-socket style with stack counts and duration arcs |
| `js/ui/mini-map.js` | `renderMiniMap()` | ~216 | WORKING — Circular radar with entity markers, scan line effect |
| `js/ui/action-bar-ui.js` | `drawCombatActionBar()` | ~510 | WORKING — [Dash][Weapon Q][Weapon E][Consumable], cooldown sweeps |
| `js/ui/icon-sidebar.js` | Left sidebar | varies | WORKING — Icons for overlays (C/I/K/M/O) |

**What's Already Working:**
- **Player Frame:** HP bar with damage trail animation, Mana bar, Stamina pips (CotDG diamond style), portrait circle, floor counter `F${num}`
- **Enemy Frame:** Tier-specific colored borders (gold for ELITE, red for BOSS), crown/diamond indicators, element indicator pip, animated HP bar
- **Minimap:** Offscreen canvas caching, explored/unexplored/visible tile distinction, enemy markers (red), loot markers (gold), shrine markers (cyan), player facing direction, ornate gold frame with compass labels
- **Action Bar:** Hotkey badges (Space/Q/E/1), cooldown sweep animation, lock icon for level-locked actions, shield HP bar, consumable charges

**Verification Steps:**
1. **HP/MP Bars:** Enter dungeon → player frame renders at top-left with animated HP/Mana/Stamina
2. **Enemy Target:** Click an enemy → enemy frame appears with tier-colored border and HP bar
3. **Minimap:** Check corner → circular radar shows explored rooms with entity dots
4. **Action Bar:** Bottom of screen shows 4 slots with hotkey badges and cooldown sweeps
5. **Floor Counter:** Already exists in player frame as `F${floorNum}` (line 198) — verify visibility

**Enhancement — Prominent Floor Counter:**
The existing floor counter is small (inside the player frame). Consider adding a more visible counter:
```javascript
// In the dungeon render section, after game world renders:
function drawFloorCounter(ctx) {
    const floorText = `Floor ${game.floor} / 10`;
    ctx.save();
    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#d4af37';
    ctx.textAlign = 'center';
    ctx.fillText(floorText, canvas.width / 2, 30);
    ctx.restore();
}
```

**Minor Gap:** HP/Mana/Stamina bars are animated fills but don't show numerical text values (e.g., "78/100"). Consider adding text overlays for playtesting clarity.

---

### 4.2 Visual Feedback

**Goal:** Damage numbers float above enemies. Screen shake on crits. Enemy health bars animate. Death animations play. Status effect icons visible.

**Current State: MOSTLY WORKING (90%).** Comprehensive visual effects are implemented. Screen shake needs verification.

**Key Files & Systems:**

| File | System | Status |
|------|--------|--------|
| `js/effects/melee-slash-effect.js` (590 lines) | Melee arc rendering | WORKING — State machine: WINDUP → SLASH → FADE |
| `js/effects/particle-system.js` (1612 lines) | Fire particles, status visuals | WORKING — Object pooling, 18+ effect types |
| `js/effects/monster-attack-effects.js` (200+ lines) | Monster magic/element bursts | WORKING — Element-colored impact particles |
| `js/ui/enemy-renderer.js` | Enemy health bars | WORKING |
| `js/ui/monster-animations.js` | Death/attack anims | WORKING |
| `js/systems/combat-master.js` | Screen shake config | CONFIGURED (line 112) — needs render verification |

**Detailed Status Effect Visuals (particle-system.js lines 864-1516):**
All of these are fully implemented with unique particle behaviors:
- **DoT:** Burning (orbiting flames), Poison (rising bubbles), Bleeding (dripping droplets)
- **CC:** Chilled (orbiting ice crystals), Frozen (blue overlay + sparkles), Stunned (circling stars), Rooted (vine tendrils), Fear (purple aura), Silenced (X symbol), Weakened (downward arrows), Vulnerable (crosshair), Blinded (eye with X)
- **Buffs:** Regenerating (rising plus signs), Strengthened (power lines), Hastened (speed lines), Shielded (protective aura), Invisible (shimmering outline), Sanctified (golden halo)
- Stack-based intensity (more particles with more stacks)
- Fade-out during last 20% of duration

**Melee Slash Details (melee-slash-effect.js):**
- Windup telegraph: expanding circle pre-attack (lines 419-439)
- Cleave shape: outer edge at max range, inner edge with sine-wave expansion (lines 446-507)
- Element-colored sparks: Fire, Ice, Water, Earth, Nature, Death, Holy, Dark, Arcane (lines 214-228)
- Weapon-specific arcs: sword 100°, mace 70°, knife 60°, axe 80° (lines 158-232)

**Screen Shake Configuration (combat-master.js line 112-116):**
```javascript
screenShake: {
    enabled: true,
    normalIntensity: 3,   // pixels for normal attacks
    critIntensity: 8,     // pixels for critical hits
    duration: 0.1         // seconds
}
```
`renderer.js` reads shake offset at line 1073: `getScreenShakeOffset()`. Verify this function exists and is called during combat.

**Verification Steps:**
1. **Melee Slash:** Attack with sword → visible arc sweep with sparks → WINDUP → SLASH → FADE stages visible
2. **Screen Shake:** Land a critical hit → screen shakes (8px, 0.1s) → verify `getScreenShakeOffset()` is defined
3. **Enemy Health Bars:** Hit enemy → HP bar decreases with damage trail animation
4. **Status Effects:** Apply poison → green bubbles rise from entity → gem-socket icon appears in unit frame
5. **Monster Attack Effects:** Enemy mage attacks → colored travel particles + burst at impact
6. **Death Animations:** Kill enemy → fade/collapse animation plays

**If Damage Numbers Are Missing:**
Check that the damage number creation is called in `applyDamage()`. Look for a `createDamageNumber()` or `spawnDamagePopup()` call. If missing:
```javascript
// In applyDamage(), after damage is calculated:
if (typeof createDamageNumber === 'function') {
    createDamageNumber(target.gridX, target.gridY, finalDamage, isCrit);
}
```

---

### 4.3 Controls Reference / Tutorial Prompt

**Goal:** Press F1 or ? → overlay shows all controls. Press again to dismiss.

**Current State:** No tutorial or controls reference exists. The input system (`input-handler.js`) defines all key bindings.

**Implementation — Add to `js/ui/renderer.js` or create `js/ui/controls-overlay.js`:**

```javascript
// Controls overlay state
let controlsOverlayVisible = false;

// Toggle with F1 or ?
window.addEventListener('keydown', (e) => {
    if (e.key === 'F1' || (e.key === '?' && !e.ctrlKey)) {
        controlsOverlayVisible = !controlsOverlayVisible;
        e.preventDefault();
    }
});

function drawControlsOverlay(ctx) {
    if (!controlsOverlayVisible) return;

    const w = 500, h = 520;
    const x = (canvas.width - w) / 2;
    const y = (canvas.height - h) / 2;

    // Dark background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Panel
    ctx.fillStyle = '#12121a';
    ctx.strokeStyle = '#4a4a5a';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);

    // Title
    ctx.fillStyle = '#d4af37';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CONTROLS', canvas.width / 2, y + 35);

    // Controls list
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    const controls = [
        ['WASD / Arrows', 'Move'],
        ['Mouse Click', 'Attack / Interact'],
        ['Right Click', 'Inspect / Context Menu'],
        ['Q', 'Weapon Ability 1'],
        ['E', 'Interact / Weapon Ability 2'],
        ['Space', 'Dash (i-frames)'],
        ['1-4', 'Use Consumables'],
        ['I / Tab', 'Inventory'],
        ['C', 'Character Sheet'],
        ['K', 'Skills Menu'],
        ['M', 'Map Overlay'],
        ['T', 'Toggle Torch'],
        ['Escape', 'Pause / Close Menu'],
        ['F1 / ?', 'Toggle This Menu'],
        ['F9', 'Copy Game State (Bug Report)']
    ];

    let lineY = y + 70;
    controls.forEach(([key, action]) => {
        ctx.fillStyle = '#d4af37';
        ctx.fillText(key, x + 30, lineY);
        ctx.fillStyle = '#b0b0b0';
        ctx.fillText(action, x + 220, lineY);
        lineY += 28;
    });

    // Footer
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('Press F1 to close', canvas.width / 2, y + h - 20);
}
```

**Integration:**
1. Add the code to `js/ui/renderer.js` or a new file
2. Call `drawControlsOverlay(ctx)` at the very end of `render()` (so it draws on top of everything)

---

### 4.4 Pause Menu

**Goal:** Press Escape during dungeon → game pauses → Resume / Settings / Quit to Village options. "Quit to Village" abandons the run — since this is permadeath, quitting is equivalent to dying (full state wipe).

**Current State:** The input handler checks for Escape in various states (character, map, settings, skills) and returns to `'playing'`. There is no dedicated pause state during dungeon gameplay.

**Implementation Steps:**

1. **Add Pause State:**
   Add `'paused'` to the game states. In `main.js`, the `update()` switch already handles unknown states via `updatePausedState()` — so adding `'paused'` will naturally pause game updates.

2. **Add Escape Handler for Dungeon:**
   In `input-handler.js`, add:
   ```javascript
   // After existing Escape handlers, add pause for 'playing' state:
   if (e.key === 'Escape' && game.state === 'playing') {
       game.state = 'paused';
       return;
   }
   if (e.key === 'Escape' && game.state === 'paused') {
       game.state = 'playing';
       return;
   }
   ```

3. **Add Pause Menu Rendering:**
   In `renderer.js`'s `render()` function, add:
   ```javascript
   if (game.state === 'paused') {
       // Still render the game world underneath (frozen)
       // ... (existing dungeon render code runs)
       // Then overlay pause menu
       drawPauseMenu(ctx, canvas.width, canvas.height);
       return;
   }
   ```

4. **Create `drawPauseMenu()`:**
   ```javascript
   let pauseMenuIndex = 0;
   const PAUSE_OPTIONS = ['Resume', 'Settings', 'Quit to Village'];

   function drawPauseMenu(ctx, w, h) {
       // Dim overlay
       ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
       ctx.fillRect(0, 0, w, h);

       // Title
       ctx.fillStyle = '#d4af37';
       ctx.font = 'bold 28px monospace';
       ctx.textAlign = 'center';
       ctx.fillText('PAUSED', w / 2, h / 2 - 80);

       // Options
       PAUSE_OPTIONS.forEach((option, i) => {
           const selected = i === pauseMenuIndex;
           ctx.fillStyle = selected ? '#d4af37' : '#888';
           ctx.font = `${selected ? 'bold ' : ''}20px monospace`;
           ctx.fillText(option, w / 2, h / 2 - 20 + i * 40);
       });
   }
   ```

5. **Wire Pause Menu Input:**
   Add to the Escape/pause input handler:
   ```javascript
   if (game.state === 'paused') {
       if (e.key === 'ArrowUp' || e.key === 'w') {
           pauseMenuIndex = Math.max(0, pauseMenuIndex - 1);
       }
       if (e.key === 'ArrowDown' || e.key === 's') {
           pauseMenuIndex = Math.min(PAUSE_OPTIONS.length - 1, pauseMenuIndex + 1);
       }
       if (e.key === 'Enter') {
           switch (pauseMenuIndex) {
               case 0: game.state = 'playing'; break;         // Resume
               case 1: game.state = 'settings'; break;        // Settings
               case 2:                                         // Quit to Village
                   // Treat as voluntary death (lose items, keep skills)
                   if (typeof SessionManager !== 'undefined') {
                       SessionManager.playerDeath(
                           game.player?.gridX || 0,
                           game.player?.gridY || 0
                       );
                   }
                   returnToVillage();
                   break;
           }
           pauseMenuIndex = 0;
       }
       return;
   }
   ```

**Note on "Quit to Village":**
This uses the same `SessionManager.playerDeath()` path as dying — full permadeath wipe. The player voluntarily abandons the run, which is equivalent to dying (all progress lost). Consider adding a confirmation dialog: "Quitting will end your run. All progress will be lost. Are you sure?"

---

## Implementation Checklist

### Phase 2: Core Loop — Tier 1
- [ ] **1.1** Verify village → cave → loadout → dungeon transition chain
- [ ] **1.2** Test combat: mouse attack → damage → enemy death → loot drop
- [ ] **1.2** Apply Floor 1 tuning: 3-5 hits to kill, 10-20% HP per enemy hit
- [ ] **1.3** Test loot: enemy drops → walk over → item in inventory
- [ ] **1.3** Test consumables: use potion → HP restores
- [ ] **1.3** Test equipment: equip weapon from inventory → damage changes
- [ ] **1.4** Test floor advance: stairs work Floor 1 through Floor 10
- [ ] **1.4** Verify player state (HP, inventory, gold) persists between floors
- [ ] **1.5** Implement victory condition on Floor 10 clear
- [ ] **1.5** Create victory screen with run summary
- [ ] **1.5** Verify loot/gold transferred to bank on victory
- [ ] **1.6** Verify death flow: die → game over screen → full permadeath reset → fresh start
- [ ] **1.6** Verify save file is deleted on death
- [ ] **1.6** Verify restart gives player starter kit (basic weapon)
- [ ] **1.7** Test NPC dialogue: walk to NPC → E → dialogue opens → responses work
- [ ] **1.8** Test shops: buy/sell → gold and inventory update correctly
- [ ] **1.8** Verify correct gold source (bank gold in village vs carried gold in dungeon)
- [ ] **1.9** Verify skill XP awards during combat
- [ ] **1.9** Verify skills UI renders correctly (K key → radar chart)

### Phase 3: Between-Run Infrastructure — Tier 2
- [ ] **2.1** Test bank: deposit, withdraw, persistence across reload (wiped on death)
- [ ] **2.2** Test loadout screen — if broken, implement fallback bypass
- [ ] **2.3** Add missing stat fields (`totalKills`, `totalGoldEarned`, `victories`)
- [ ] **2.3** Verify stats update after each run and are viewable

### Phase 4: Depth & Engagement — Tier 3
- [ ] **3.1** Verify boon shrines spawn in dungeon (2-4 per floor)
- [ ] **3.1** Test shrine interaction → boon selection → stat bonus applied
- [ ] **3.1** Verify boons clear on death
- [ ] **3.2** Verify enemy difficulty scales across all 10 floors
- [ ] **3.2** Adjust tier weights if scaling is flat
- [ ] **3.3** Create `js/debug/playtest-reporter.js`
- [ ] **3.3** Add to `index.html`, init on game start
- [ ] **3.3** Wire event logging in combat, death, floor advance

### Phase 5: Polish — Tier 4
- [ ] **4.1** Verify HUD elements render (HP/MP bars, minimap, action bar)
- [ ] **4.1** Add "Floor X / 10" counter to HUD
- [ ] **4.2** Verify damage numbers, screen shake, health bar animations
- [ ] **4.2** Verify death animations and status effect icons
- [ ] **4.3** Add controls reference overlay (F1/?)
- [ ] **4.4** Implement pause menu with Resume / Settings / Quit to Village

---

## Critical Path Dependencies

```
1.1 (Village→Dungeon) ──► 1.4 (Floor Advance) ──► 1.5 (Victory on Floor 10)

1.2 (Combat) ──► 1.3 (Loot/Inventory) ──► 1.8 (Shops)
             └──► 1.9 (Skills)

1.7 (Dialogue) ──► 1.8 (Shops) ──► 2.1 (Bank)

1.6 (Death/GameOver) ──► Verify only (permadeath is already correct)

2.3 (Stats) ──► Standalone (within-run tracking)
```

**Start with 1.1 and 1.2 in parallel** — these are the core gameplay entry points. 1.6 (Death) is already implemented correctly (permadeath) and only needs verification. Then 1.3-1.5, then 1.7-1.9, then Tier 2-4.
