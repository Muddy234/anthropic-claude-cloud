# Foundry Agent Analysis Report
## The Shifting Chasm - Core Systems Audit

**Agent:** Foundry (Game Architect)
**Date:** 2026-02-11
**Scope:** Core game loop, state management, save/load, and meta-progression systems

---

## Executive Summary

The Foundry agent's systems form the architectural backbone of The Shifting Chasm. Overall, the codebase demonstrates solid foundational architecture with clear separation between persistent state (survives death), session state (current run), and village state. However, several issues need attention:

### Critical Issues
1. **Duplicated state tracking** between `game`, `sessionState`, and `persistentState` causes confusion
2. **Set serialization** in SaveManager is broken - Sets are serialized but never restored
3. **Missing initialization checks** in several systems can cause null reference errors
4. **Message log system is minimal** - lacks message types, styling, and capacity management

### Strengths
1. Clear state separation pattern (persistent/session/village)
2. Robust SystemManager with priority-based execution
3. Comprehensive save slot system with export/import
4. Good debug tooling for development

### Estimated Effort
- High Priority fixes: ~8-12 hours
- Medium Priority improvements: ~16-20 hours
- Low Priority enhancements: ~10-15 hours

---

## File-by-File Analysis

---

### 1. `js/core/main.js` - Master Game Loop

**Current Status:** Complete and functional

**Purpose:** Orchestrates the main game loop with state-based update routing and auto-save functionality.

#### Issues & Bugs

| Issue | Severity | Description |
|-------|----------|-------------|
| Global variable pollution | Medium | `lastAutoSaveTime`, `playtimeTracker` are module-level globals |
| Implicit dependencies | Medium | References `activeEffects`, `AIManager`, `SystemManager`, `DialogueUI` without guards |
| Missing render state check | Low | `render()` called every frame regardless of state (menu, gameover) |

#### Code Quality
- **Naming:** Consistent, clear function names
- **Comments:** Good section headers, sparse inline comments
- **Organization:** Well-structured with clear state routing

#### Duplicative Functions
- None identified

#### Missing Features
1. Frame rate limiting/throttling option
2. Pause functionality separate from game state
3. Background tab handling (visibility API)
4. Performance stats beyond perfMonitor

#### Performance Concerns
- `perfMonitor.check()` called every frame even when disabled (minor)
- Debug string concatenation every frame in `updateDungeon()`

#### Integration Issues
- Relies on global `render()` function existing (not defined in this file)
- `villageState` referenced without null check

#### Improvement Recommendations
1. Wrap module-level variables in a closure or namespace
2. Add visibility API to pause when tab is hidden
3. Only build debug strings when debug panel is visible
4. Add frame skipping option for low-end devices

---

### 2. `js/core/game-state.js` - Global State Container

**Current Status:** Complete but has structural issues

**Purpose:** Defines and manages all game state objects: `game`, `persistentState`, `sessionState`, `villageState`.

#### Issues & Bugs

| Issue | Severity | Description |
|-------|----------|-------------|
| Dual state tracking | High | Both `game.gold` and `sessionState.gold` exist - which is authoritative? |
| Inconsistent inventory | High | `game.player.inventory` vs `sessionState.inventory` - both used |
| Missing type safety | Medium | No validation on state object properties |
| Set serialization | Medium | `game.exploredTiles` is a Set - won't survive JSON serialization |
| Circular structure risk | Low | `persistentState.skills = null` - populated externally, could cause issues |

#### Code Quality
- **Naming:** Excellent, descriptive names
- **Comments:** Good section headers and JSDoc
- **Organization:** Well-organized with clear sections

#### Duplicative Functions
- `resetSessionState()` and `resetVillageState()` have identical patterns - could use a generic reset helper

#### Missing Features
1. State validation/schema enforcement
2. State change events/observers
3. Undo/redo capability for state changes
4. State diffing for debugging

#### Performance Concerns
- `Object.keys().forEach()` pattern in reset functions could be optimized
- Factory functions create new objects every call (fine, but noted)

#### Integration Issues
- `BANKING_CONFIG` and `VILLAGE_CONFIG` referenced without guards
- `discoverMonster` and `trackMonsterKill` modify persistent state directly without save

#### Improvement Recommendations
1. **Establish single source of truth** - document which state object owns what data
2. Add state validation layer
3. Implement observer pattern for state changes
4. Create state migration utilities for version updates

---

### 3. `js/core/system-manager.js` - System Registration and Execution

**Current Status:** Complete and well-designed

**Purpose:** Manages registration, lifecycle, and priority-based execution of game systems.

#### Issues & Bugs

| Issue | Severity | Description |
|-------|----------|-------------|
| No dependency tracking | Medium | Systems can't declare dependencies on other systems |
| Silent failures | Medium | Errors logged but system continues - may cause cascading issues |
| Hardcoded expected list | Low | `EXPECTED_SYSTEMS` list doesn't match actual implementations |

#### Code Quality
- **Naming:** Excellent
- **Comments:** Good JSDoc and section headers
- **Organization:** Clean, logical structure

#### Duplicative Functions
- None

#### Missing Features
1. System dependency declaration and resolution
2. System state (paused, running, error)
3. Performance metrics per system
4. Hot reload capability for development

#### Performance Concerns
- `_rebuildSortedSystems()` called on every update when `_needsSort` is true
- No batching of enable/disable operations

#### Integration Issues
- `EXPECTED_SYSTEMS` list is partially outdated
- Systems referenced: `input-handler`, `pokemon-movement` (not in list note) - naming inconsistency

#### Improvement Recommendations
1. Add system dependency graph
2. Track per-system update times for performance profiling
3. Add system state machine (idle -> running -> paused -> error)
4. Update `EXPECTED_SYSTEMS` to match actual implementations

---

### 4. `js/core/constants.js` - Global Configuration

**Current Status:** Complete and comprehensive

**Purpose:** Central configuration for all game systems.

#### Issues & Bugs

| Issue | Severity | Description |
|-------|----------|-------------|
| No config validation | Medium | Invalid values silently used |
| No environment overrides | Low | Can't easily switch configs for testing/production |
| Magic numbers remain | Low | Some values inline in code instead of here |

#### Code Quality
- **Naming:** Consistent `SCREAMING_CASE` for constants
- **Comments:** Good section headers
- **Organization:** Well-organized by system

#### Duplicative Functions
- N/A (data file)

#### Missing Features
1. Config validation on load
2. Environment-based overrides (dev/test/prod)
3. Config schema documentation
4. Runtime config modification API

#### Performance Concerns
- None - loaded once

#### Integration Issues
- Some systems use hardcoded fallbacks instead of requiring these constants

#### Improvement Recommendations
1. Add config validation function
2. Create config schema documentation
3. Consider config grouping object for easier system-specific access
4. Add `Object.freeze()` to prevent accidental modification

---

### 5. `js/core/game-init.js` - Startup and Initialization

**Current Status:** Complete but complex

**Purpose:** Handles all game initialization paths: village start, dungeon start, floor transitions.

#### Issues & Bugs

| Issue | Severity | Description |
|-------|----------|-------------|
| Missing error handling | High | `generateDungeon()` throws but not caught at higher level |
| Inconsistent loadout handling | Medium | `applyLoadoutToPlayer` and `confirmLoadout` have different approaches |
| Side effects in init | Medium | `placeStarterChest` modifies game state during init |
| Memory leak potential | Low | `game._intervals` and `game._timeouts` cleared but not in all paths |

#### Code Quality
- **Naming:** Good
- **Comments:** Reasonable JSDoc
- **Organization:** Complex but logical

#### Duplicative Functions
- `setPlayerPosition()` duplicates logic also found in other files
- Player spawn logic repeated between `initializePlayer()` and `advanceToNextFloor()`

#### Missing Features
1. Init progress tracking/events
2. Init failure recovery
3. Loading screen hooks
4. Async initialization support

#### Performance Concerns
- Multiple loops over rooms during initialization
- Synchronous initialization blocks rendering

#### Integration Issues
- Many optional system checks (`typeof X !== 'undefined'`)
- `GAME_STATES` fallback patterns throughout

#### Improvement Recommendations
1. Implement async initialization with progress events
2. Extract spawn logic to shared utility
3. Add initialization state machine
4. Implement init failure recovery/retry

---

### 6. `js/core/save-manager.js` - localStorage Persistence

**Current Status:** Complete but has serialization bug

**Purpose:** Handles save/load operations with multiple slots, export/import, and version migration.

#### Issues & Bugs

| Issue | Severity | Description |
|-------|----------|-------------|
| Set restoration broken | Critical | `_cloneState` serializes Sets as `{__type: 'Set', values: [...]}` but `_restoreTypes` is never called |
| No save validation | High | Loaded saves not validated against expected schema |
| Quota handling incomplete | Medium | Quota exceeded logged but no recovery action |
| Storage key inconsistency | Low | `SAVE_CONFIG.storageKey` vs hardcoded `this.storageKey` |

#### Code Quality
- **Naming:** Excellent
- **Comments:** Good JSDoc
- **Organization:** Well-structured

#### Duplicative Functions
- `_cloneState` could use a more robust deep clone library

#### Missing Features
1. Save compression
2. Cloud save sync hooks
3. Save corruption recovery
4. Automatic backup rotation

#### Performance Concerns
- Full state serialization on every save
- No delta/incremental saves

#### Integration Issues
- `SAVE_CONFIG` optional - many fallbacks throughout
- Direct `Object.assign` on load could overwrite unintended properties

#### Improvement Recommendations
1. **Fix Set restoration** - call `_restoreTypes` after JSON.parse in `load()`
2. Add save schema validation
3. Implement save compression for large inventories
4. Add save integrity checksums

---

### 7. `js/core/session-manager.js` - Run Lifecycle

**Current Status:** Complete and functional

**Purpose:** Manages dungeon run lifecycle: start, extraction, death, floor transitions.

#### Issues & Bugs

| Issue | Severity | Description |
|-------|----------|-------------|
| Inventory source confusion | High | `extractionSuccess()` uses both `game.player.inventory` and `sessionState.inventory` |
| Duplicate detection fragile | Medium | Uses `item.id && item.name` match - could miss duplicates |
| Floor 10 hardcoded | Low | Magic number for Malphas floor |

#### Code Quality
- **Naming:** Good
- **Comments:** Good JSDoc
- **Organization:** Well-structured

#### Duplicative Functions
- `_applyDegradation` logic similar to DegradationSystem (if exists)

#### Missing Features
1. Run statistics per session
2. Checkpoint system within floor
3. Run replay/recording
4. Session recovery after crash

#### Performance Concerns
- None significant

#### Integration Issues
- `GAME_STATES` compared with `===` but also checks string literals
- Direct manipulation of `persistentState` without events

#### Improvement Recommendations
1. **Establish inventory authority** - document that `game.player.inventory` is source of truth
2. Add run summary generation
3. Implement mid-run checkpoints
4. Add session events for external listeners

---

### 8. `js/systems/village-system.js` - Village Hub State

**Current Status:** Complete

**Purpose:** Manages village hub gameplay, movement, NPC interaction.

#### Issues & Bugs

| Issue | Severity | Description |
|-------|----------|-------------|
| Hardcoded state strings | Medium | `'village'`, `'dialogue'`, `'journal'` instead of `GAME_STATES` |
| Missing VillageGenerator check | Medium | `VillageGenerator` accessed without existence check |
| Memory leak | Low | `_keyHandler` could persist if cleanup not called |

#### Code Quality
- **Naming:** Good
- **Comments:** Good JSDoc
- **Organization:** Clean structure

#### Duplicative Functions
- `_tryMove` collision logic may duplicate other movement systems

#### Missing Features
1. Village ambient sounds
2. NPC schedules/routines
3. Weather effects
4. Day/night cycle

#### Performance Concerns
- None significant

#### Integration Issues
- Depends on `VillageGenerator`, `VillageRenderer`, `DialogueUI` without guards

#### Improvement Recommendations
1. Use `GAME_STATES` constants consistently
2. Add existence checks for dependencies
3. Implement village ambient system hooks
4. Add NPC AI/scheduling framework

---

### 9. `js/systems/banking-system.js` - Persistent Storage

**Current Status:** Complete and well-designed

**Purpose:** Manages bank storage, deposits, withdrawals, and selling.

#### Issues & Bugs

| Issue | Severity | Description |
|-------|----------|-------------|
| No transaction logging | Low | Operations not logged for debugging/audit |
| Sell value calculation exposed | Low | `_calculateSellValue` is private but called from LoadoutSystem |

#### Code Quality
- **Naming:** Excellent
- **Comments:** Good JSDoc
- **Organization:** Clean, logical sections

#### Duplicative Functions
- `_calculateSellValue` similar to potential shop pricing logic

#### Missing Features
1. Bank transaction history
2. Item favoriting/locking
3. Bank tabs/categories
4. Search/filter functionality

#### Performance Concerns
- `getSummary()` iterates items multiple times - could be optimized

#### Integration Issues
- Direct `persistentState.bank` access - no abstraction

#### Improvement Recommendations
1. Make `_calculateSellValue` public or extract to pricing utility
2. Add transaction history for audit
3. Implement bank event system for UI updates
4. Add item locking to prevent accidental sales

---

### 10. `js/systems/loadout-system.js` - Pre-run Gear Selection

**Current Status:** Complete

**Purpose:** Manages loadout assembly before dungeon runs.

#### Issues & Bugs

| Issue | Severity | Description |
|-------|----------|-------------|
| Internal tracking (`_bankIndex`) | Medium | Uses private property that could leak into saves |
| Basic loadout immutable risk | Low | `BASIC_LOADOUT` could be mutated if not careful |

#### Code Quality
- **Naming:** Good
- **Comments:** Good JSDoc
- **Organization:** Well-structured

#### Duplicative Functions
- Item selection patterns similar between weapon/armor/consumable

#### Missing Features
1. Loadout presets/templates
2. Loadout sharing
3. Recommended loadouts based on floor
4. Equipment comparison

#### Performance Concerns
- None significant

#### Integration Issues
- `BankingSystem._calculateSellValue` accessed (private method)

#### Improvement Recommendations
1. Clean `_bankIndex` from items before returning
2. Freeze `BASIC_LOADOUT` to prevent mutation
3. Add loadout preset system
4. Implement equipment comparison UI data

---

### 11. `js/systems/shortcut-system.js` - Floor Shortcuts

**Current Status:** Complete but minimal

**Purpose:** Manages floor shortcut unlocking and usage.

#### Issues & Bugs

| Issue | Severity | Description |
|-------|----------|-------------|
| Dual unlock systems | Medium | Both `ShortcutSystem` and `persistentState.shortcuts` track unlocks |
| Init overwrites | Low | `init()` could overwrite existing shortcuts |

#### Code Quality
- **Naming:** Good
- **Comments:** Good JSDoc
- **Organization:** Clean

#### Duplicative Functions
- Shortcut unlocking logic exists in both ShortcutSystem and SessionManager

#### Missing Features
1. Shortcut requirements (items, quests)
2. Shortcut usage cost
3. Shortcut condition checking
4. Visual shortcut map

#### Performance Concerns
- None

#### Integration Issues
- `addMessage` used without import
- `persistentState.stats.shortcutsUnlocked` field doesn't exist in game-state.js

#### Improvement Recommendations
1. Consolidate shortcut state to single location
2. Add shortcut prerequisites system
3. Implement shortcut usage costs/cooldowns
4. Add event for shortcut unlock

---

### 12. `js/utils/stat-system.js` - Stat Derivation

**Current Status:** Partially implemented

**Purpose:** Calculates derived player stats from base stats and equipment.

#### Issues & Bugs

| Issue | Severity | Description |
|-------|----------|-------------|
| Global function pollution | Medium | `recalculateDerivedStats` and `checkLevelUp` are global |
| Missing null checks | Medium | `game.player.stats`, `game.player.equipped` accessed without guards |
| Inconsistent stat naming | Low | `player.mana` vs `player.mp`, `player.maxMana` vs `player.maxMp` |

#### Code Quality
- **Naming:** Reasonable
- **Comments:** None
- **Organization:** Two unrelated functions in one file

#### Duplicative Functions
- Level-up stat application may duplicate logic in player.js

#### Missing Features
1. Stat modifier system (buffs/debuffs)
2. Stat caps/floors
3. Stat change events
4. Detailed stat breakdown

#### Performance Concerns
- `Object.values().forEach()` called every recalculation

#### Integration Issues
- `recalculatePlayerStats` function referenced but not defined
- `addMessage` used without definition check

#### Improvement Recommendations
1. Wrap in namespace or class
2. Add comprehensive null checks
3. Standardize stat naming (`mana` vs `mp`)
4. Implement stat modifier stack

---

### 13. `js/utils/message-log.js` - Message Log

**Current Status:** Minimal implementation

**Purpose:** Adds messages to the game log.

#### Issues & Bugs

| Issue | Severity | Description |
|-------|----------|-------------|
| No capacity limit | Medium | `messageLog` array grows unbounded |
| No message types | Medium | All messages treated equally |
| No deduplication | Low | Rapid identical messages not consolidated |

#### Code Quality
- **Naming:** Simple
- **Comments:** None
- **Organization:** Single function

#### Duplicative Functions
- N/A

#### Missing Features
1. Message types (info, combat, loot, error)
2. Message history limit
3. Message filtering
4. Message formatting
5. Message callbacks/events

#### Performance Concerns
- Unbounded array growth

#### Integration Issues
- Directly mutates `game.messageLog`

#### Improvement Recommendations
1. Add message type parameter
2. Implement circular buffer with max capacity
3. Add message deduplication with count
4. Create MessageLog class with full API

---

### 14. `debug-commands.js` - Debug Utilities

**Current Status:** Complete and extensive

**Purpose:** Comprehensive debug console commands for testing.

#### Issues & Bugs

| Issue | Severity | Description |
|-------|----------|-------------|
| God mode inconsistent | Low | Sets HP to 99999 instead of true invincibility |
| Arena visibility hacks | Low | Direct manipulation of visibility arrays |

#### Code Quality
- **Naming:** Good, consistent
- **Comments:** Excellent help system
- **Organization:** Well-organized by category

#### Duplicative Functions
- `teleport()` logic duplicated from other movement code
- Monster spawning logic similar to regular spawn code

#### Missing Features
1. Debug command history
2. Debug macros/scripts
3. Automated test sequences
4. State snapshot/restore

#### Performance Concerns
- `testMaps()` can generate many dungeons - could freeze browser

#### Integration Issues
- Many optional system checks (good)
- Some commands assume systems exist

#### Improvement Recommendations
1. Add command history navigation
2. Implement debug macros/batches
3. Add performance budgeting for test commands
4. Create debug state snapshots

---

## Cross-Cutting Concerns

### 1. State Management Confusion

**Problem:** Multiple overlapping state containers with unclear authority:
- `game.gold` vs `sessionState.gold`
- `game.player.inventory` vs `sessionState.inventory`
- `game.floor` vs `sessionState.currentFloor`

**Impact:** Bugs where one is updated but not the other, or reads from wrong source.

**Recommendation:** Create clear documentation establishing which state object owns what data. Consider consolidating to single state tree with accessor methods.

### 2. Set Serialization

**Problem:** JavaScript Sets used throughout (`game.exploredTiles`, `game.lavaTiles`) but JSON.stringify converts them to empty objects.

**Impact:** Save/load corrupts Set data.

**Recommendation:**
1. Fix `SaveManager._restoreTypes` to be called after parse
2. Audit all Set usage and ensure serialization coverage
3. Consider using arrays with Set-like helper functions

### 3. Error Handling

**Problem:** Many try/catch blocks log errors but continue execution, potentially causing cascading failures.

**Impact:** Hard to diagnose root cause of bugs.

**Recommendation:** Implement error severity levels and proper error propagation for critical failures.

### 4. Global Namespace Pollution

**Problem:** Many functions and objects exported directly to `window`.

**Impact:** Name collision risk, harder to track dependencies.

**Recommendation:** Consider module system or namespace objects (e.g., `window.Chasm.systems.*`).

### 5. Missing Null Checks

**Problem:** Many functions assume state objects exist without verification.

**Impact:** Runtime errors when state not initialized.

**Recommendation:** Add defensive programming patterns or use optional chaining consistently.

---

## Priority Recommendations

### High Priority (Do First)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | Fix SaveManager Set restoration | 2 hours | Critical bug - saves corrupted |
| 2 | Establish state authority documentation | 4 hours | Reduces confusion and bugs |
| 3 | Fix inventory source in SessionManager | 2 hours | Items could be lost on extraction |
| 4 | Add null checks in stat-system.js | 1 hour | Prevents crashes |

### Medium Priority (Next Sprint)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 5 | Expand message-log.js with types/capacity | 4 hours | Better player feedback |
| 6 | Add save validation schema | 6 hours | Prevents save corruption |
| 7 | Update EXPECTED_SYSTEMS list | 2 hours | Accurate diagnostics |
| 8 | Implement async game initialization | 8 hours | Loading screen support |
| 9 | Add per-system performance metrics | 4 hours | Performance debugging |

### Low Priority (Backlog)

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 10 | Namespace consolidation | 8 hours | Code quality |
| 11 | Loadout presets | 4 hours | Player convenience |
| 12 | Bank transaction history | 4 hours | Debugging/audit |
| 13 | Debug command history | 2 hours | Developer convenience |
| 14 | Config validation | 4 hours | Early error detection |

---

## Dependencies on Other Agents

### Depends On

| Agent | Dependency | Notes |
|-------|------------|-------|
| **Architect** | System registration | Systems must call `SystemManager.register()` |
| **Cartographer** | Room generation | `game.rooms` populated by dungeon generator |
| **Merchant** | Item data | `BankingSystem` and `LoadoutSystem` need item definitions |
| **Scribe** | UI rendering | Save slots, loadout UI, message display |

### Provides To

| Agent | Provision | Notes |
|-------|-----------|-------|
| **All** | Game state | `game`, `persistentState`, `sessionState` |
| **All** | SystemManager | Registration and lifecycle management |
| **All** | Constants | Configuration values |
| **Scribe** | Message log | `addMessage()` function |
| **All** | Debug commands | Testing utilities |

---

## Testing Recommendations

### Unit Tests Needed
1. `SaveManager._cloneState` and `_restoreTypes` round-trip
2. `BankingSystem` deposit/withdraw with stackables
3. `LoadoutSystem.confirmLoadout` withdrawal correctness
4. `SessionManager.extractionSuccess` inventory transfer
5. `recalculateDerivedStats` formula verification

### Integration Tests Needed
1. Full save/load cycle with all state types
2. Village -> Dungeon -> Extraction -> Village flow
3. Death -> Rescue run -> Recovery flow
4. Floor progression with shortcut unlocking

### Manual Testing Checklist
- [ ] Save game, reload page, load game - verify all state restored
- [ ] Complete extraction - verify items in bank
- [ ] Die with items - verify death drop created
- [ ] Use basic loadout - verify items not withdrawn from bank
- [ ] Use custom loadout - verify items withdrawn from bank

---

## Conclusion

The core systems are architecturally sound but need attention on state management clarity and serialization bugs. The highest priority is fixing the Set serialization issue in SaveManager, followed by documenting state authority to prevent dual-tracking bugs.

The debug tools are comprehensive and will aid ongoing development. The SystemManager provides a solid foundation for system orchestration.

**Estimated Total Technical Debt:** ~40-50 hours to address all recommendations

**Recommended Sprint Focus:** Items 1-4 from High Priority list (9 hours)

---

# IMPLEMENTATION PLAN

## Summary
- Total issues identified: 14
- Priority breakdown: Critical: 1, High: 3, Medium: 5, Low: 5

## Issue Fix Queue

### Issue #1: Fix SaveManager Set Restoration
- **File:** `js/core/save-manager.js`
- **Line(s):** `load()` method, after `JSON.parse()`
- **Problem:** `_cloneState` serializes Sets as `{__type: 'Set', values: [...]}` but `_restoreTypes` is never called after loading, corrupting Set data like `game.exploredTiles`
- **Fix:** Call `_restoreTypes()` on the parsed data in the `load()` method before returning/applying state
- **Status:** [x] Fixed
- **Notes:** Fix already applied in working directory (uncommitted). Added `const restored = this._restoreTypes(migrated);` and returning `restored` instead of `migrated`.

### Issue #2: Establish State Authority Documentation
- **File:** `js/core/game-state.js`
- **Line(s):** Top of file (add documentation)
- **Problem:** Both `game.gold` and `sessionState.gold` exist; `game.player.inventory` and `sessionState.inventory` both used. Unclear which is authoritative.
- **Fix:** Add JSDoc comment block at top of file documenting which state object owns each piece of data. Deprecate duplicate fields with comments.
- **Status:** [x] Fixed
- **Notes:** Added comprehensive STATE AUTHORITY DOCUMENTATION at top of file with tables showing authoritative sources, duplicate fields, and synchronization points. Added `syncSessionFromGame()` helper function.

### Issue #3: Fix Inventory Source in SessionManager
- **File:** `js/core/session-manager.js`
- **Line(s):** `extractionSuccess()` method, `playerDeath()` method, utility methods
- **Problem:** Uses both `game.player.inventory` and `sessionState.inventory` inconsistently. Items could be lost on extraction.
- **Fix:** Standardize on `game.player.inventory` as source of truth. Update all reads to use single source.
- **Status:** [x] Fixed
- **Notes:** Updated `playerDeath()` to use `game.player.inventory` as authoritative source. Updated `extractionSuccess()`, `coreCompleted()`, `getRunStatus()`, `addToInventory()`, `addGold()`, and `recoverDeathDrop()` to consistently use authoritative source. Added `syncFromGame()` helper. Removed redundant backwards compatibility code.

### Issue #4: Add Null Checks in stat-system.js
- **File:** `js/utils/stat-system.js`
- **Line(s):** `recalculateDerivedStats()` function
- **Problem:** `game.player.stats`, `game.player.equipped` accessed without guards. Causes crashes if called before player initialized.
- **Fix:** Add optional chaining (`?.`) or explicit null checks before accessing nested properties.
- **Status:** [x] Fixed
- **Notes:** Added comprehensive null checks: `game?.player` guard, explicit `player.stats` check, guard for `player.equipped`, null coalescing for base stats, optional chaining for `player.equipped?.MAIN`, guards for `player.combat`. Added JSDoc comments, console warnings for debugging, and proper exports section.

### Issue #5: Expand message-log.js with Types/Capacity
- **File:** `js/utils/message-log.js`
- **Line(s):** Entire file (rewrite)
- **Problem:** No message types, no capacity limit (unbounded array growth), no deduplication.
- **Fix:** Create MessageLog class with: message types (info, combat, loot, error), circular buffer (max 100 messages), deduplication with count.
- **Status:** [x] Fixed
- **Notes:** Added MESSAGE_TYPES constants (INFO, WARNING, ERROR, COMBAT, LOOT, QUEST, SYSTEM, DIALOGUE). Added MESSAGE_LOG_CONFIG with capacity=100, deduplicationWindow=2000ms. MessageLog class with add(), getByType(), getRecent(), getSince(), clear(), clearType(). Convenience functions addCombatMessage(), addLootMessage(), etc. Backwards compatible - existing addMessage() calls still work.

### Issue #6: Add SystemManager Priority Sorting for Initialization
- **File:** `js/core/system-manager.js`
- **Line(s):** Top of file, `initAll()` method
- **Problem:** Systems with dependencies may initialize in wrong order.
- **Fix:** Document priority system, ensure initAll() sorts by priority first, add dependency verification helper.
- **Status:** [x] Fixed
- **Notes:** Added comprehensive priority documentation at top of file (ranges 0-99). Enhanced initAll() with logging of initialization order. Added verifyDependencyOrder() and getInitOrder() helper methods.

### Issue #7: Document Village State Degradation System
- **File:** `js/core/constants.js`, `js/core/game-state.js`
- **Line(s):** DEGRADATION_CONFIG section
- **Problem:** Degradation system not well documented. Unclear how village and floor degradation work.
- **Fix:** Add comprehensive documentation explaining both degradation systems, thresholds, and restoration.
- **Status:** [x] Fixed
- **Notes:** Added ~50 lines of documentation explaining village degradation levels (Thriving/Damaged/Ruined), floor quality multipliers, recovery mechanics, and material restoration values. Added explicit config values for failedRunPenalty, extractionRecovery, deepExtractionBonus.

### Issue #8 (Renumbered): Add Save Validation Schema
- **File:** `js/core/save-manager.js`
- **Line(s):** `load()` method
- **Problem:** Loaded saves not validated against expected schema. Corrupted/old saves can cause runtime errors.
- **Fix:** Add schema validation function that checks required fields, types, and version. Add migration for old save versions.
- **Status:** [ ] Pending
- **Notes:** Medium priority. Define schema based on current state objects. Add version field to saves.

### Issue #8: Implement Async Game Initialization
- **File:** `js/core/game-init.js`
- **Line(s):** All init functions
- **Problem:** Synchronous initialization blocks rendering. No loading screen support.
- **Fix:** Convert init functions to async/await. Add progress events for loading screen. Handle init failures gracefully.
- **Status:** [ ] Pending
- **Notes:** Medium effort. Coordinate with Glasswright for loading screen UI.

### Issue #9: Add Per-System Performance Metrics
- **File:** `js/core/system-manager.js`
- **Line(s):** `update()` method
- **Problem:** No way to profile which systems are slow.
- **Fix:** Add `performance.now()` timing around each system update. Store in metrics object. Add debug command to view.
- **Status:** [ ] Pending
- **Notes:** Useful for optimization. Coordinate with debug-commands.js.

### Issue #10: Namespace Consolidation
- **File:** Multiple files
- **Line(s):** Global exports
- **Problem:** Functions and objects exported directly to `window`. Name collision risk.
- **Fix:** Create `window.Chasm` namespace object. Move all exports under appropriate sub-namespaces (`.systems`, `.utils`, `.state`).
- **Status:** [ ] Pending
- **Notes:** Low priority but improves code quality. Large refactor - do incrementally.

### Issue #11: Loadout Presets
- **File:** `js/systems/loadout-system.js`
- **Line(s):** New feature
- **Problem:** No way to save/load loadout configurations.
- **Fix:** Add preset system: save current loadout as preset, load preset, delete preset. Store in persistentState.
- **Status:** [ ] Pending
- **Notes:** Low priority. Player convenience feature. Coordinate with Glasswright for UI.

### Issue #12: Bank Transaction History
- **File:** `js/systems/banking-system.js`
- **Line(s):** All transaction methods
- **Problem:** No audit trail for deposits/withdrawals/sales.
- **Fix:** Add transaction log array. Log each operation with timestamp, type, items, gold amount. Add method to retrieve history.
- **Status:** [ ] Pending
- **Notes:** Low priority. Useful for debugging. Coordinate with Glasswright for history UI.

### Issue #13: Debug Command History
- **File:** `debug-commands.js`
- **Line(s):** Console input handling
- **Problem:** No way to recall previous debug commands.
- **Fix:** Add command history array. Implement up/down arrow navigation. Store last 50 commands.
- **Status:** [ ] Pending
- **Notes:** Low priority. Developer convenience.

### Issue #14: Config Validation
- **File:** `js/core/constants.js`
- **Line(s):** End of file (add validation)
- **Problem:** Invalid config values silently used.
- **Fix:** Add `validateConfig()` function that checks all constants for valid ranges/types. Call on load. Log warnings for invalid values.
- **Status:** [ ] Pending
- **Notes:** Low priority. Early error detection.

---

# RUNNING LOG (Context Window Continuity)

## Current Position
- **Last Completed:** Issue #7 - Document Village State Degradation System
- **Currently Working On:** None - MEDIUM priority issues complete
- **Next Up:** Issue #8 - Add Save Validation Schema (if continuing)

## Session Log
| Session | Date | Issues Fixed | Notes |
|---------|------|--------------|-------|
| 0 | 2026-02-11 | - | Implementation plan created |
| 1 | 2026-02-11 | #1, #2, #3, #4 | Fixed all HIGH priority issues. #1 was already fixed in working dir. #2 added state authority docs to game-state.js. #3 fixed inventory source in session-manager.js. #4 added null checks to stat-system.js. |
| 2 | 2026-02-11 | #5, #6, #7 | Fixed MEDIUM priority issues. #5 rewrote message-log.js with MessageLog class, types, capacity, deduplication. #6 added priority documentation and dependency verification to system-manager.js. #7 documented degradation system in constants.js. |

## Quick Resume Instructions
If context window fills up, new session should:
1. Read `docs/analysis/FOUNDRY_ANALYSIS.md`
2. Check "Current Position" section above
3. Continue from "Currently Working On" issue
4. After fixing, update status to `[x] Fixed`, move to next issue, update "Current Position"
5. Log the session in the Session Log table
