# The Shifting Chasm — MVP Playtest Implementation Plan

## Current State Summary

The game is a **roguelike dungeon crawler** built as a JavaScript/Canvas browser game. The player descends a **10-floor dungeon gauntlet** from the village hub, fighting enemies and collecting loot along the way. **Death means losing all carried items and gold.** Only persistent skills (Soul & Body XP) survive death. Beating Floor 10 wins the run. The codebase contains 120+ JS files with sophisticated systems for combat, AI, loot, village hub, and rendering. Approximately **85% of the core systems are functional**, but several critical gaps prevent a clean playtest experience.

### Core Loop

```
Village (buy gear, sell loot, bank items)
    ↓
Enter Dungeon (carry inventory + gold in)
    ↓
Floor 1 → Floor 2 → ... → Floor 10
    ↓                         ↓
  Death                    Victory
  (lose items + gold,      (return to village
   keep skills)             with all loot + gold)
    ↓                         ↓
Return to Village ←──────────┘
```

### What Dies With You
- All carried items (weapons, armor, consumables, materials)
- All carried gold

### What Survives Death
- Skill XP and levels (Soul & Body proficiencies)
- Bank contents (items deposited before the run)
- Persistent stats (total runs, deepest floor, kill counts)

---

## TIER 0 — CRITICAL BLOCKERS (~1 day)

*Nothing else matters until these are resolved. The game literally cannot be played without them.*

### 0.1 Game Does Not Auto-Start
- **Problem:** The game loop runs but nothing renders. There is no code that calls `startNewGame()` or shows the main menu on page load. Players must open the browser console and type `startNewGame()` manually.
- **Files:** `js/core/game-init.js`, `js/core/main.js`
- **Fix:** Add an initialization call that detects game state on load: if a save exists, show the main menu with "Continue" option; otherwise show the main menu with "New Game". Wire the menu button rendering in `renderer.js` to actual click/key handlers that call `startNewGame()` or `loadGame()`.
- **Verification:** Open `index.html` in a browser — the main menu should appear without opening the console.

### 0.2 Main Menu Click/Key Handlers Not Wired
- **Problem:** The main menu renders beautifully (volcanic gradient, ember particles, title) with options like "New Game", "Continue", "Settings" — but there is no input handling to detect clicks or keypresses on these menu items. The menu is purely visual.
- **Files:** `js/core/main.js`, `js/ui/renderer.js` (menu rendering at line ~1461+)
- **Fix:** Add mouse click detection on the canvas that maps click coordinates to menu options, OR add keyboard navigation (arrow keys + Enter). On selection: "New Game" → `startNewGame()`, "Continue" → `loadGame()`. Settings/Credits can be deferred.
- **Verification:** Click "New Game" on the menu → game transitions to village.

### 0.3 Starter Loadout Weapon Mismatch
- **Problem:** The basic loadout references `"Rusty Shortsword"` but the weapon database (`weapons-melee.js`) defines `"rusty_sword"` with display name `"Rusty Sword"`. This key mismatch may cause the player to start with no weapon.
- **Files:** `js/core/game-init.js` (loadout application), `js/data/weapons-melee.js`, `js/ui/loadout-ui.js`
- **Fix:** Audit the loadout system's weapon lookup. Ensure the starter weapon key matches an entry in the weapons data. Verify the player actually has a weapon equipped after `applyLoadoutToPlayer()`.
- **Verification:** Start a dungeon run → press "C" for character sheet → weapon slot shows equipped weapon → attacking an enemy deals damage.

### 0.4 Global Crash Recovery Handler
- **Problem:** With 120+ JS files loaded, uncaught exceptions during playtesting are inevitable. Currently a crash leaves the player staring at a frozen canvas with no recourse other than closing the tab, losing all context about what went wrong.
- **Files:** `js/core/main.js` or `index.html` (inline script at end of body)
- **Fix:** Add a `window.onerror` / `window.onunhandledrejection` handler (~20 lines) that:
  1. Catches the error and stack trace
  2. Logs the current `game.state`, `game.floor`, player HP, last action to console
  3. Renders a simple overlay: "Something went wrong. Click to return to village."
  4. On click, calls `returnToVillage()` (saves persistent state first)
- **Verification:** Manually throw an error from console during gameplay → crash screen appears → click → returns to village.

### 0.5 Save Trigger Policy
- **Problem:** The game has localStorage persistence for bank, skills, and stats, but the save timing is undefined. If the browser crashes mid-village, the player could lose persistent progress.
- **Files:** `js/core/game-init.js`, `js/core/game-state.js`
- **Fix:** Implement explicit save triggers for persistent state (`persistentState`: bank, skills, stats):
  - **On every village scene entry** (returning from dungeon, game start)
  - **On every shop/bank transaction** (gold and inventory changed)
  - **On dungeon victory** (Floor 10 cleared, before transition back to village)
  - **Auto-save every 60 seconds while in village** (catch idle changes)
  - **Session state (current run) auto-saves every 30 seconds** during dungeon (already partially implemented — verify it works, enables crash recovery mid-run)
  - Note: Gold and items carried into the dungeon are *at risk* by design — no mid-run saving of carried inventory to persistent state
- **Verification:** Buy item from shop → force-close browser tab → reopen → item and gold reflect the purchase.

### 0.6 Disable Extraction System
- **Problem:** The codebase has a fully built extraction system (`ExtractionSystem`, extraction portals, collapse timers, shift/meltdown mechanics) that is no longer part of the game design. If left active, extraction portals will spawn in the dungeon and confuse testers, and collapse timers may interfere with gameplay.
- **Files:** `js/systems/extraction-system.js`, `js/systems/shift-system.js`, `js/core/game-init.js` (calls `ExtractionSystem.init()`), `js/generation/extraction-spawner.js`
- **Fix:** Disable extraction initialization in `game-init.js`. Either:
  - Comment out / skip the `ExtractionSystem.init()` call and extraction spawner
  - Or add a feature flag: `FEATURES.EXTRACTION_ENABLED = false` and guard the init
  - Remove extraction-related HUD elements (collapse timer, extraction portal indicators)
  - Ensure the shift/meltdown system is also disabled (no lava encroachment or floor degradation timers)
- **Do NOT delete the extraction code** — it may be useful later. Just prevent it from running.
- **Verification:** Play through multiple floors → no extraction portals appear → no collapse timer warnings → no shift/meltdown events.

---

## TIER 1 — CORE GAMEPLAY LOOP (~3-5 days)

*The minimum set of features needed for a tester to have a meaningful session: enter dungeon, fight through 10 floors, die or win, spend gold at shop, try again. Without any of these, the loop is broken.*

### 1.1 Village → Dungeon Transition
- **Current State:** `startDungeonRun()` exists in `game-init.js` and should work if called.
- **What to Verify/Fix:**
  - Player can walk to the cave entrance in the village
  - Interaction prompt appears near the cave
  - Pressing interact key (E or Enter) triggers `startDungeonRun()`
  - Dungeon generates and player spawns at entrance
  - Player enters dungeon carrying their current inventory and gold
- **Files:** `js/systems/village-system.js`, `js/core/game-init.js`, `js/generation/dungeon-generator.js`
- **Verification:** Walk to cave in village → press E → dungeon loads with player at entrance with their inventory and gold intact.
- **Loadout System Note:** If the loadout UI (`js/ui/loadout-ui.js`) is already working and stable, keep it. If it needs debugging, **skip it entirely for MVP**. The player starts with a basic weapon, buys better gear from the shop that goes directly into inventory, and enters the dungeon with whatever they're carrying. Loadout selection is a UX refinement on top of "bring your inventory into the dungeon" — it's not mechanically necessary.

### 1.2 Basic Combat Functional
- **Current State:** Combat system is comprehensive (2-layer damage calc, status effects, weapon arcs).
- **What to Verify/Fix:**
  - Player can attack enemies (click or hotkey)
  - Enemies take damage and display health bars
  - Enemies retaliate with AI
  - Enemies can die and drop loot
  - Player can die and trigger game over
  - Damage numbers appear on screen
- **Files:** `js/systems/combat-master.js`, `js/entities/enemy.js`, `js/ui/enemy-renderer.js`
- **Verification:** Encounter an enemy → click to attack → enemy health decreases → enemy dies → loot drops.
- **Tuning Target (Floor 1):**
  - Floor 1 enemies should die in **3-5 player hits**
  - Each enemy hit should deal **10-20% of player max HP**
  - A group of 3 enemies should be **dangerous but survivable** for a player paying attention
  - A player who stands still and doesn't dodge should die to 2-3 enemies
  - **Do not try to perfect balance now.** Set these rough targets, verify they're in the ballpark, and tune after the first playtest session produces real feedback. The goal is "neither steamroll nor instant death."

### 1.3 Item Pickup and Inventory
- **Current State:** Inventory system is implemented (15 slots, stacking).
- **What to Verify/Fix:**
  - Loot drops appear on the ground after enemy death
  - Player can walk over or interact with loot to pick it up
  - Items appear in inventory panel (press I or Tab)
  - Consumables can be used (potions heal)
  - Equipment can be equipped from inventory
- **Files:** `js/systems/loot-system.js`, `js/ui/inventory-panel.js`, `js/entities/player.js`
- **Verification:** Kill enemy → walk over loot → item appears in inventory → use health potion → HP increases.

### 1.4 Floor Advancement (Floors 1-10)
- **Current State:** `advanceToNextFloor()` exists in game-init.js.
- **What to Verify/Fix:**
  - Stairs/exit tile exists and is reachable on every floor
  - Interacting with exit triggers floor advance
  - New floor generates with harder enemies
  - Player state (HP, inventory, gold) persists between floors
  - **Floor 10 is the final floor** — clearing it (finding the exit or defeating a boss) triggers the victory condition
  - Floor counter is visible in the HUD so the player knows their progress
- **Files:** `js/core/game-init.js`, `js/generation/dungeon-generator.js`
- **Verification:** Find stairs on Floor 1 → interact → Floor 2 loads → repeat through Floor 10 → victory triggers.

### 1.5 Victory Condition (Floor 10 Cleared)
- **Current State:** A `victory` game state exists in `game-state.js`. The game has a CoreSystem for a final boss concept but it may not be wired to Floor 10.
- **What to Verify/Fix:**
  - When the player clears Floor 10 (reaches the exit or defeats the floor), trigger `game.state = 'victory'`
  - Victory screen displays: congratulations, run summary (floors cleared, enemies killed, items collected, gold earned)
  - Player returns to village **keeping all carried items and gold**
  - Persistent state is saved (skills, stats updated with the successful run)
  - For MVP: a simple victory screen is sufficient — no cutscenes or narrative needed
- **Files:** `js/core/game-init.js`, `js/core/main.js`, `js/ui/renderer.js`, `js/core/game-state.js`
- **Verification:** Reach Floor 10 exit → victory screen shows → return to village → all items and gold preserved in inventory.

### 1.6 Death and Game Over Flow
- **Current State:** Death handling exists but needs verification.
- **What to Verify/Fix:**
  - When HP reaches 0, game over screen appears
  - Game over screen shows run summary (floor reached, enemies killed, items lost)
  - Player returns to village **losing all carried items and gold**
  - Persistent state survives (skills, bank contents, stats)
  - Persistent state is saved before transitioning to village
  - Player starts in village with empty inventory and 0 gold (or a minimal "pity" stipend — see note)
  - New run can be started from village
- **Files:** `js/core/main.js`, `js/core/game-init.js`, `js/ui/renderer.js`
- **Verification:** Let enemies kill you → game over screen shows → click to return to village → skills persist, items and gold gone.
- **Design Note:** If the player dies with 0 gold and an empty bank, they need *some* way to start a new run. Options: (a) always give the basic starter weapon free, (b) give a small gold stipend on death (10-20g), (c) make the Blacksmith's cheapest weapon free for destitute players. Pick one — the goal is preventing a softlock where the player has nothing and can't afford anything.

### 1.7 NPC Dialogue System
- **Current State:** Dialogue UI is robust with CotDG-style frames, branching, and dynamic content.
- **Why Tier 1:** Without NPC dialogue, the player cannot access shops. Without shops, gold is meaningless. Without meaning to gold, there's no reward for killing enemies beyond XP. The entire village purpose collapses.
- **What to Verify/Fix:**
  - NPCs have interaction prompts when player is nearby
  - Pressing E opens dialogue
  - Response options are clickable/navigable
  - Dialogue-driven actions work (open shop, open bank, start run)
- **Files:** `js/ui/dialogue-ui.js`, `js/data/npcs.js`, `js/systems/village-system.js`
- **Verification:** Walk to Blacksmith → press E → dialogue opens → select "Browse Wares" → shop opens.

### 1.8 Shop System (Buy/Sell)
- **Current State:** Shop UI is functional with NPC-specific inventories.
- **Why Tier 1:** Buying gear between runs is the core loop. A tester who fights and dies but can't spend gold at a vendor has no reason to collect gold — the loot is meaningless without somewhere to use it.
- **What to Verify/Fix:**
  - Blacksmith/Alchemist/Innkeeper shops open via dialogue
  - Player can buy items (gold deducted, item added to inventory)
  - Player can sell items (gold added, item removed from inventory)
  - Price display is accurate
  - Shop inventory refreshes appropriately
  - **Gold spent at shops is gold at risk** — if the player buys gear and dies, they lose both the gear and the gold they spent
- **Files:** `js/ui/shop-ui.js`, `js/data/npcs.js`
- **Verification:** Open Blacksmith shop → buy a weapon → gold decreases → weapon in inventory → equip weapon → enter dungeon → weapon works.

### 1.9 Skill Persistence Across Death (Soul & Body)
- **Current State:** Framework exists — 5 proficiencies (Melee, Ranged, Magic, Defense, Vitality) with specializations. XP designed to persist across death.
- **Why Tier 1:** Skill persistence is the answer to "why do I care after dying." Without it, death is a full reset and testers will bounce after 2-3 deaths. Even if the numbers are small, knowing that *something* carried over makes the next run feel like progress rather than repetition. This is especially critical now that gold and items are lost on death — skills are the only thread of continuity.
- **What to Verify/Fix:**
  - Killing enemies grants skill XP in the relevant proficiency
  - XP is stored in `persistentState` and saved to localStorage
  - XP survives death (persists when returning to village after game over)
  - Skill levels provide a noticeable (even if small) damage/defense increase
  - Skills UI (press K or via character sheet) shows current levels and XP progress
- **Files:** `js/systems/skill-system.js`, `js/ui/skills-ui.js`, `js/core/game-state.js`
- **Verification:** Kill enemies with sword → Melee XP increases → die → return to village → start new run → Melee level persists → damage is slightly higher than first run.

---

## TIER 2 — BETWEEN-RUN INFRASTRUCTURE (~2-3 days)

*These make the between-run experience smoother but the core loop functions without them.*

### 2.1 Bank System
- **Current State:** Banking exists for persistent item storage between runs.
- **Why it matters:** The bank is the only way to protect items from death. Without it, every item is at risk every run. With it, the player can choose to bank valuable items before entering the dungeon, creating a risk/reward decision: bring your best sword for a better chance at Floor 10, or bank it and bring a cheaper one to preserve value.
- **What to Verify/Fix:**
  - Banker NPC opens bank interface via dialogue
  - Player can deposit items from inventory → bank
  - Player can withdraw items from bank → inventory
  - Bank persists across page reloads (localStorage)
  - Bank persists across death (items deposited before a run survive death)
  - Bank has reasonable capacity (20-30 slots)
- **Files:** `js/ui/bank-ui.js`, `js/data/npcs.js`
- **Verification:** Talk to Banker → deposit a weapon → enter dungeon → die → return to village → talk to Banker → weapon still in bank.

### 2.2 Loadout Selection Before Run (Conditional)
- **Include only if already working.** If it needs more than minor fixes, skip entirely.
- **Current State:** Loadout UI exists for pre-run gear selection from bank.
- **What to Verify/Fix:**
  - Before entering dungeon, loadout screen appears
  - Player can select weapon, armor, consumables from bank
  - "Basic Loadout" is always free
  - Selected items are properly equipped when dungeon starts
- **Files:** `js/ui/loadout-ui.js`, `js/core/game-init.js`
- **Verification:** Enter cave → loadout screen shows → select gear → start run → gear is equipped.

### 2.3 Persistent Statistics
- **Current State:** `persistentState.stats` tracks runs, kills, deepest floor, etc.
- **What to Verify/Fix:**
  - Stats update after each run (death or victory)
  - Accessible from village (character sheet or journal)
  - Tracks: total runs, deepest floor reached, total kills, total gold earned, victories
- **Files:** `js/core/game-state.js`, `js/ui/character-overlay.js`
- **Verification:** Complete a run → check stats → numbers reflect the run.

---

## TIER 3 — DEPTH & ENGAGEMENT (~2-3 days)

*Makes playtesting rewarding beyond the first few runs. Not required for the loop to function, but significantly improves the quality of playtest feedback.*

### 3.1 Boon System (Per-Run Power-Ups)
- **Current State:** 70 boons across 7 Ancestors, 3 tiers. Session-only (lost on death).
- **What to Verify/Fix:**
  - Shrines appear in dungeon (2-4 per floor)
  - Interacting with shrine offers boon choices
  - Boons apply stat bonuses/effects
  - Boons lost on death
  - Max 8 boons per run
- **Files:** `js/systems/boon-system.js`
- **Verification:** Find shrine → interact → choose boon → stat changes visible on character sheet.

### 3.2 Enemy Scaling by Floor
- **Current State:** Enemies have tiers (TIER_3, TIER_2, TIER_1, ELITE, BOSS) with damage multipliers.
- **What to Verify/Fix:**
  - Floor 1 spawns low-tier enemies
  - Deeper floors spawn harder enemies
  - Elite enemies appear with visual indicators
  - Difficulty curve feels fair across all 10 floors (challenge increases but doesn't spike)
  - Floor 10 should feel like a genuine gauntlet — survivable but tense
- **Files:** `js/generation/enemy-factory.js`, `js/generation/enemy-spawner.js`, `js/data/monsters-data.js`
- **Verification:** Floor 1 has rats/slimes → Floor 3 has skeletons/goblins → Floor 5+ has elites → Floor 10 is hard but beatable.

### 3.3 Playtest Feedback Tool
- **Problem:** Without a way for testers to report what happened, you'll get "I died and it felt unfair" with no way to reproduce. A structured state dump makes feedback dramatically more actionable.
- **Files:** New: `js/debug/playtest-reporter.js`, referenced from `js/core/main.js`
- **What to Build:** A lightweight system (~50-80 lines) that:
  1. Maintains a rolling log of the last 50 game events (kills, damage taken, items used, floor transitions, deaths)
  2. On keypress (F9 or backtick), copies to clipboard a JSON blob containing:
     - Current game state (floor, HP, gold, inventory summary)
     - Player skill levels
     - Last 50 events from the rolling log
     - Timestamp and session duration
     - Last error (if any) from the crash handler
  3. Shows a brief toast notification: "Game state copied to clipboard"
- **Verification:** Play for a few minutes → press F9 → paste into text editor → readable game state dump.

---

## TIER 4 — POLISH & FEEL (~1-2 days)

*Important for playtest feedback quality but the game is playable without them.*

### 4.1 HUD During Dungeon Runs
- **What to Verify/Fix:**
  - HP/MP/Stamina bars visible
  - Minimap shows explored areas
  - Action bar shows hotkeys and cooldowns
  - **Floor counter visible** (e.g., "Floor 3 / 10") so the player knows how deep they are and how far they have to go
  - Target info shows when enemy is selected
- **Files:** `js/ui/unit-frames.js`, `js/ui/mini-map.js`, `js/ui/action-bar-ui.js`

### 4.2 Visual Feedback
- **What to Verify/Fix:**
  - Damage numbers float above enemies on hit
  - Screen shake on critical hits
  - Enemy health bars display and animate
  - Death animations play
  - Status effect icons visible on affected entities
- **Files:** `js/effects/`, `js/ui/enemy-renderer.js`, `js/ui/monster-animations.js`

### 4.3 Controls Reference / Tutorial Prompt
- **Current State:** No tutorial or controls reference exists.
- **What to Create:** A simple overlay (press F1 or ?) showing:
  - WASD: Move
  - Mouse Click: Attack
  - Q/E: Weapon abilities
  - Space: Dash
  - 1: Use consumable
  - I/Tab: Inventory
  - C: Character sheet
  - M: Map
  - T: Toggle torch
  - Esc: Pause/Menu
- **Files:** New addition to `js/ui/` or inline in `renderer.js`
- **Verification:** Press F1 → controls overlay appears → press F1 again → overlay closes.

### 4.4 Pause Menu
- **Current State:** Pause menu UI exists.
- **What to Verify/Fix:**
  - Pressing Esc pauses the game
  - Resume, Settings, Quit to Menu options work
  - Game state is preserved on resume
  - **"Quit to Village" option** — abandons the current run (items and gold lost, same as death) for players who want to leave without dying. This is the replacement for the old extraction mechanic as a voluntary exit.
- **Files:** `js/ui/pause-menu.js` (if exists), `js/core/main.js`

---

## TIER 5 — DEFERRABLE (Not needed for initial playtest)

These systems exist in the codebase but can be disabled or ignored for MVP:

- [ ] **Extraction System** — Disabled in Tier 0.6. Code preserved but not active.
- [ ] **Shift/Meltdown System** — Tied to extraction. Disabled alongside it.
- [ ] **Crafting System** — Framework present but recipes sparse. Defer.
- [ ] **Quest System** — Framework exists but quest content is minimal. Defer.
- [ ] **Bounty/Bulletin Board** — Data defined but integration unclear. Defer.
- [ ] **Tavern Mini-Games** — UI exists but not critical. Defer.
- [ ] **Training System** — Referenced but unused. Defer.
- [ ] **Audio Files** — System is robust but all audio files are placeholders (paths defined, no files). Game works silently. Defer.
- [ ] **World State Progression** — "Bleeding Earth" narrative system. Defer.
- [ ] **Rescue System** — Recover items from death. Defer.
- [ ] **Advanced AI Social System** — Pack tactics, sacrifice. Works but not critical. Defer.
- [ ] **Multiple Save Slots** — Single localStorage save is fine for playtest.
- [ ] **New Game+ / Post-Victory Loop** — Undecided. Show victory screen for now.

---

## Implementation Order & Checklist

### Phase 1: Make It Launchable — Tier 0 (~1 day)
- [ ] Wire auto-initialization on page load (show main menu)
- [ ] Add click/key handlers to main menu options
- [ ] Fix starter weapon key mismatch
- [ ] Add global crash recovery handler (`window.onerror` → "return to village" screen)
- [ ] Implement save trigger policy (save on village entry, victory, transactions)
- [ ] Disable extraction system and shift/meltdown system
- [ ] Verify game transitions: Menu → Village → Dungeon → Village

### Phase 2: Core Loop — Tier 1 (~3-5 days)
- [ ] Test and fix village → cave → dungeon transition
- [ ] Test combat: attack, take damage, kill enemy, die
- [ ] Apply Floor 1 tuning target (3-5 hits to kill, 10-20% HP per enemy hit)
- [ ] Test loot: enemy drops → pickup → inventory
- [ ] Test consumables: use potion → HP restores
- [ ] Test equipment: equip weapon from inventory → damage changes
- [ ] Test floor advance: stairs work from Floor 1 through Floor 10
- [ ] Implement victory condition on Floor 10 clear (victory screen, return to village with loot)
- [ ] Test death: die → game over → return to village → items and gold lost, skills persist
- [ ] Verify destitution prevention (player can always start a new run even with 0 gold and empty bank)
- [ ] Test NPC dialogue: walk up to NPC → press E → dialogue works
- [ ] Test shops: buy/sell items → gold and inventory update correctly
- [ ] Verify skill XP gain during combat and persistence across death
- [ ] Fix any crash/error found during above tests

### Phase 3: Between-Run Infrastructure — Tier 2 (~2-3 days)
- [ ] Test bank (deposit, withdraw, persistence across page reload and death)
- [ ] Test loadout screen — if broken, skip and use "bring your inventory" model
- [ ] Verify persistent stats tracking (runs, kills, deepest floor, victories)

### Phase 4: Depth & Engagement — Tier 3 (~2-3 days)
- [ ] Test boon shrines in dungeon
- [ ] Verify enemy difficulty scales across all 10 floors
- [ ] Build playtest feedback tool (F9 → state dump to clipboard)

### Phase 5: Polish — Tier 4 (~1-2 days)
- [ ] Verify HUD elements render correctly (including "Floor X / 10" counter)
- [ ] Verify visual feedback (damage numbers, health bars, screen shake)
- [ ] Add controls reference overlay (F1/?)
- [ ] Test pause menu functionality (including "Quit to Village" option)

**Total estimated timeline: ~10-14 days** for one developer working through all tiers. Tiers 0-1 are the hard gate — if those take longer than expected, Tiers 3-4 get cut, not extended.

---

## Key Files Reference

| System | Primary Files |
|--------|--------------|
| Entry Point | `index.html` |
| Game Init | `js/core/game-init.js` |
| Game Loop | `js/core/main.js` |
| Game State | `js/core/game-state.js` |
| System Manager | `js/core/system-manager.js` |
| Player | `js/entities/player.js` |
| Enemy | `js/entities/enemy.js` |
| Combat | `js/systems/combat-master.js` |
| Dungeon Gen | `js/generation/dungeon-generator.js` |
| Village | `js/systems/village-system.js`, `js/generation/village-generator.js` |
| Loot | `js/systems/loot-system.js` |
| Skills | `js/systems/skill-system.js` |
| Boons | `js/systems/boon-system.js` |
| Renderer | `js/ui/renderer.js` |
| Dialogue | `js/ui/dialogue-ui.js` |
| Shop | `js/ui/shop-ui.js` |
| Bank | `js/ui/bank-ui.js` |
| Inventory | `js/ui/inventory-panel.js` |
| Loadout | `js/ui/loadout-ui.js` |
| HUD | `js/ui/unit-frames.js`, `js/ui/action-bar-ui.js` |
| Minimap | `js/ui/mini-map.js` |
| Items Data | `js/data/items.js` |
| Weapons | `js/data/weapons-melee.js`, `js/data/weapons-ranged.js`, `js/data/weapons-magic.js` |
| NPCs | `js/data/npcs.js` |
| Monsters | `js/data/monsters-data.js` |
| Abilities | `js/data/ability-repository.js` |
| Extraction (DISABLED) | `js/systems/extraction-system.js`, `js/systems/shift-system.js` |

---

## Verification Plan

After implementing fixes, run this end-to-end test:

1. **Open `index.html`** in Chrome/Firefox → Main menu appears with title and options
2. **Click "New Game"** → Village loads, player appears near town square
3. **Walk around village** (WASD) → NPCs visible, buildings rendered
4. **Talk to Blacksmith** (E near NPC) → Dialogue opens, can browse shop
5. **Buy a weapon** → Gold decreases, weapon in inventory
6. **Equip weapon** → Open inventory, equip purchased weapon
7. **Walk to cave entrance** → Interaction prompt appears
8. **Enter dungeon** → Dungeon Floor 1 loads with player's inventory and gold intact
9. **Verify no extraction portals or collapse timers appear**
10. **Explore** → Fog of war reveals tiles, minimap updates, floor counter shows "Floor 1 / 10"
11. **Fight enemy** → Click to attack, enemy dies in 3-5 hits, deals 10-20% HP per hit, drops loot
12. **Pick up loot** → Item in inventory
13. **Use health potion** → HP bar increases
14. **Find stairs** → Advance to Floor 2, enemies are harder, counter shows "Floor 2 / 10"
15. **Continue to Floor 10** → Clear Floor 10 → Victory screen shows with run summary
16. **Return to village** → All items and gold preserved from the winning run
17. **Start another run** → Die on purpose on Floor 3
18. **Game over screen** → Return to village → **Items and gold are gone**, skills persist
19. **Verify destitution recovery** → Player can still enter dungeon with basic weapon despite 0 gold
20. **Check skills** → XP from previous runs persists, damage is slightly higher
21. **Force-crash the browser** → Reopen → Persistent progress (skills, bank, stats) still saved
22. **Press F9** → Game state dump copied to clipboard (Tier 3)

If steps 1-20 pass, the MVP is ready for playtesting. Steps 21-22 are for Tier 2-3 verification.
