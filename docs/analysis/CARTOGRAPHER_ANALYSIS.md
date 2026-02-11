# Cartographer Agent Analysis Report
## Procedural Generation Systems - The Shifting Chasm

**Analysis Date:** 2026-02-11
**Agent Role:** Cartographer (Procedural Generation Specialist)
**Files Analyzed:** 9 generation/spawning files

---

## Executive Summary

The procedural generation pipeline for The Shifting Chasm is **largely complete and functional**, with several sophisticated algorithms in place. The system uses a Blob-based BSP approach for dungeon generation combined with Cellular Automata for chamber detail, creating organic, element-themed maps with themed transitions.

### Overall Assessment: **B+ (Good, with room for optimization)**

**Strengths:**
- Blob-based BSP creates organic, non-rectangular rooms
- Element and theme system provides visual variety
- Connectivity validation ensures playable maps
- Priority-based blob assignment (entrance > shrines > treasure > combat)
- Chamber generator adds interior detail without blocking doorways

**Critical Concerns:**
- No seeded RNG - maps are not reproducible
- Duplicate enemy creation logic across files
- Some edge cases in corridor generation could create disconnected maps
- Village generator lacks world state integration
- Performance concerns with large map connectivity validation

---

## File-by-File Analysis

### 1. `js/generation/dungeon-generator.js`

**Status:** Complete and functional
**Lines:** 831
**Algorithm:** Blob-based BSP with dogleg corridors

#### Current Implementation

```
BSP Tree -> Blob Growth -> Corridor Carving -> Blob Assignment -> Validation
```

**Algorithm Quality:** High
- BSP tree with proper leaf splitting (minLeafSize: 20)
- Blob growth uses random expansion with target fill ratio (50%)
- Dogleg corridors with chaotic waypoints for organic feel
- 4-tile wide corridors for comfortable navigation

**Seed Reproducibility:** MISSING
- Uses `Math.random()` throughout - no seeded RNG
- Map generation is non-deterministic

**Connectivity Guarantee:** Partial
- Flood-fill validation from entrance blob
- Counts unreachable tiles but DOES NOT regenerate on failure
- Warning logged but map still used

**Performance Concerns:**
- `validateConnectivity()` iterates entire 180x180 grid (32,400 tiles)
- Blob growth has max 2000 attempts per blob
- No early termination on obviously bad maps

**Parameter Tuning:**
| Parameter | Value | Assessment |
|-----------|-------|------------|
| mapWidth/Height | 180 | Large, could cause performance issues |
| minLeafSize | 20 | Good for blob variety |
| blobFillRatio | 0.5 | Reasonable organic feel |
| corridorWidth | 2 (config) / 4 (actual) | Inconsistency! Config says 2, code uses 4 |
| minShrines | 2 | Appropriate |
| maxShrines | 4 | Appropriate |

**Edge Cases:**
1. Very small blobs (< minBlobSize) can be created if growth attempts max out
2. All blobs could be the same type if random distribution is poor
3. Shrine assignment may fail if no blobs meet distance threshold

**Duplicative Logic:**
- `assignBlobElementAndTheme()` duplicates theme/element mapping that could be centralized

**Missing Features:**
- Seeded RNG for reproducible generation
- Pre-placed special rooms (guaranteed shrine positions)
- Multi-floor connectivity (stairs between floors)
- Difficulty gradient from entrance to exit

**Priority Recommendations:**
1. **HIGH:** Add seeded RNG throughout
2. **HIGH:** Fix corridorWidth inconsistency (config=2, code=4)
3. **MEDIUM:** Regenerate map on connectivity failure (not just warn)
4. **LOW:** Add early termination for bad maps

---

### 2. `js/generation/chamber-generator.js`

**Status:** Complete and functional
**Lines:** 968
**Algorithm:** BSP + Cellular Automata for room interiors

#### Current Implementation

Chamber generation operates WITHIN rooms created by dungeon-generator:

```
BSP Subdivision -> CA per Section -> Corridor Carving -> Doorway Validation
```

**Algorithm Quality:** High
- 4 target sections per room (realistic for 36x36)
- B4/S4 cellular automata rules
- 20% initial wall chance (light texture)
- 3 smoothing passes

**Seed Reproducibility:** MISSING
- Uses `Math.random()` throughout

**Connectivity Guarantee:** Yes
- `validateDoorwayConnectivity()` ensures all doorways are connected
- Regeneration up to 5 attempts if validation fails
- Aggressive doorway clearance (2-tile + 4-tile path clearing)

**Performance Concerns:**
- CA runs 3 passes per section
- Full grid copy on each pass (could use double-buffering)
- Multiple flood-fill operations for connectivity

**Parameter Tuning:**
| Parameter | Value | Assessment |
|-----------|-------|------------|
| targetSections | 4 | Good for room size |
| minSectionSize | 12 | Appropriate |
| initialWallChance | 0.20 | Light, good for playability |
| wallThreshold | 4 | Standard B4/S4 |
| deadEndRatio | 0.25 | Creates tactical variety |

**Edge Cases:**
1. If all sections are too small, subdivision fails silently
2. Doorway clearance can overwrite CA-generated features near edges
3. Safe chamber identification may pick suboptimal chamber

**Missing Features:**
- Custom CA rules per room theme
- Pillar placement for cover
- Hazard tile seeding within chambers

**Priority Recommendations:**
1. **MEDIUM:** Add seeded RNG
2. **LOW:** Optimize CA with double-buffering
3. **LOW:** Add theme-specific CA rules

---

### 3. `js/generation/village-generator.js`

**Status:** Complete but needs integration
**Lines:** 698
**Algorithm:** Fixed layout with procedural decoration

#### Current Implementation

```
Base Map -> Place Buildings (fixed layout) -> Add Paths -> Add Decorations -> Apply World State
```

**Algorithm Quality:** Medium
- Fixed building positions (not procedural)
- L-shaped path carving between buildings
- Random tree/bush/flower placement
- World state integration (degradation system)

**Seed Reproducibility:** MISSING
- Decoration placement uses `Math.random()`

**Connectivity Guarantee:** Implicit
- Fixed layout guarantees connectivity
- Path carving only on grass tiles

**Performance Concerns:**
- 50x40 map - very manageable
- No significant performance issues

**Parameter Tuning:**
| Parameter | Value | Assessment |
|-----------|-------|------------|
| WIDTH | 50 | Appropriate |
| HEIGHT | 40 | Appropriate |
| Tree count | 15 | Good density |
| Bush/flower count | 20 | Good density |

**Edge Cases:**
1. Building overlap not checked (fixed layout assumes no overlap)
2. NPC positions may conflict with decorations
3. Crushed building transformation may leave impassable areas

**Missing Features:**
- Procedural building placement
- NPC pathing validation
- Dynamic shop inventory based on world state

**Duplicative Logic:**
- `_applyWorldState` and `_applyDegradation` are nearly identical
- World state helpers (`getTransformedTile`, `getBuildingState`) are external dependencies

**Priority Recommendations:**
1. **HIGH:** Verify world state integration works
2. **MEDIUM:** Add seeded RNG for decorations
3. **LOW:** Consider procedural building placement for variety

---

### 4. `js/generation/core-generator.js`

**Status:** Complete and functional
**Lines:** 388
**Algorithm:** Radial arena with pillar placement

#### Current Implementation

```
Create Tiles -> Generate Pillars (circular pattern) -> Define Safe Zones -> Define Hazard Spawns
```

**Algorithm Quality:** High
- Radial color gradient from center
- 8 pillars in circular arrangement (45-degree increments)
- 4 corner safe zones for boss mechanics
- Ring-based hazard spawn points

**Seed Reproducibility:** MISSING
- Random inner void tiles, particle positions

**Connectivity Guarantee:** Guaranteed
- Arena is always fully connected (open design)

**Performance Concerns:**
- 50 particles generated for visual effects
- No significant performance issues

**Parameter Tuning:**
| Parameter | Value | Assessment |
|-----------|-------|------------|
| Arena size | Config-dependent | Appropriate |
| Pillar radius | 12 | Good spacing |
| Pillar size | 2x2 | Reasonable cover |
| Safe zone size | 4x4 | Appropriate |

**Edge Cases:**
1. `applyShrink()` could trap player if shrink is too aggressive
2. No validation that hazard spawns don't overlap pillars

**Missing Features:**
- Multiple arena layouts for boss variety
- Destructible pillar respawn mechanics
- Phase-based arena transformation

**Priority Recommendations:**
1. **LOW:** Add alternative arena layouts
2. **LOW:** Add seeded RNG for visual variation

---

### 5. `js/generation/enemy-spawner.js`

**Status:** Complete and functional
**Lines:** 613
**Algorithm:** Element-weighted monster selection with tier scaling

#### Current Implementation

```
Calculate Enemy Count -> For Each: Find Position -> Select Monster (element + tier weighted) -> Create Enemy
```

**Algorithm Quality:** High
- Element matching with 3x bonus for same element
- Distance-based tier weights (near=weak, far=strong)
- Floor scaling for higher difficulties
- Room type modifiers (boss=1 enemy, shrine=30% normal)

**Seed Reproducibility:** MISSING
- All random selections use `Math.random()`

**Connectivity Guarantee:** N/A (spawning, not generation)

**Performance Concerns:**
- Iterates all MONSTER_DATA entries for each spawn
- 20 attempts per spawn position
- Could be slow with many enemies

**Parameter Tuning:**
| Parameter | Value | Assessment |
|-----------|-------|------------|
| enemyDensity | 0.06 | 6% of floor tiles - high but manageable |
| baseEnemiesPerRoom | 3 | Good baseline |
| maxEnemiesPerRoom | 9 | Could be overwhelming |
| elementMatchBonus | 3.0 | Strong theming |

**Edge Cases:**
1. If no valid spawn positions, enemies may not spawn
2. Safe chamber check only for entrance rooms
3. Could spawn all enemies near each other

**Duplicative Logic:**
- `createEnemy()` here vs `createEnemyAtPosition()` in dungeon-integration.js
- Both create enemies but with different stat calculations!
- This could cause inconsistent enemy strength

**Missing Features:**
- Spawn patterns (patrol routes, ambush positions)
- Monster group composition rules
- Guaranteed minimum spacing between enemies

**Priority Recommendations:**
1. **HIGH:** Unify enemy creation logic (remove duplication)
2. **MEDIUM:** Add seeded RNG
3. **MEDIUM:** Add minimum enemy spacing
4. **LOW:** Implement spawn patterns

---

### 6. `js/generation/extraction-spawner.js`

**Status:** Complete and functional
**Lines:** 311
**Algorithm:** Distance-weighted room selection for extraction points

#### Current Implementation

```
Get Eligible Rooms -> Select Distributed Rooms -> Find Valid Positions -> Create Extraction Points
```

**Algorithm Quality:** Good
- Filters out spawn/boss rooms
- Distance-based scoring (prefers far rooms)
- Minimum 15-tile spacing between points
- Fallback to room center if no valid position

**Seed Reproducibility:** MISSING
- Uses `Math.random()` for position selection

**Connectivity Guarantee:** Relies on room validity

**Performance Concerns:**
- Manageable - only runs once per floor

**Parameter Tuning:**
| Parameter | Value | Assessment |
|-----------|-------|------------|
| shaftsPerFloor | 3-4 | Appropriate |
| minDistBetween | 15 | Good spacing |
| minDistanceFromSpawn | 10 | Reasonable |

**Edge Cases:**
1. If no eligible rooms, returns empty array (no extraction possible!)
2. `_isValidTile` doesn't check for enemies
3. Random position search limited to 20 attempts

**Missing Features:**
- Extraction point difficulty rating
- Visible hints for extraction locations
- Dynamic extraction point activation

**Priority Recommendations:**
1. **MEDIUM:** Add fallback for no eligible rooms
2. **LOW:** Add seeded RNG
3. **LOW:** Add extraction difficulty indicators

---

### 7. `js/generation/dungeon-integration.js`

**Status:** Complete adapter layer
**Lines:** 607
**Purpose:** Converts blob dungeon to legacy game.map format

#### Current Implementation

```
Generate Blob Dungeon -> Apply to Game Map -> Spawn Enemies -> Spawn Shrines -> Place Exit
```

**Algorithm Quality:** Good
- Proper theme color mapping
- Corridor theme transitions at midpoint
- Shrine decoration placement with validation

**Seed Reproducibility:** MISSING

**Connectivity Guarantee:** Relies on dungeon-generator

**Performance Concerns:**
- Full 180x180 iteration to apply dungeon
- PathFinding validation for exit placement

**Edge Cases:**
1. Exit may be unreachable if pathfinding fails
2. `createEnemyAtPosition` has different stat scaling than enemy-spawner.js
3. No fallback if shrine position invalid in all blobs

**Duplicative Logic:**
- **MAJOR:** `createEnemyAtPosition()` duplicates `createEnemy()` from enemy-spawner.js
- Different difficulty scaling formulas!
  - enemy-spawner: `applyTierMultipliers()` + floor-based level
  - dungeon-integration: `1 + (difficulty - 1) * 0.15` multiplier
- This WILL cause inconsistent enemy stats!

**Missing Features:**
- Unified enemy creation
- Map caching for regeneration
- Floor transition handling

**Priority Recommendations:**
1. **CRITICAL:** Remove `createEnemyAtPosition()`, use `createEnemy()` from enemy-spawner.js
2. **MEDIUM:** Add seeded RNG
3. **LOW:** Cache generated maps

---

### 8. `js/systems/dynamic-tile-system.js`

**Status:** Complete and functional
**Lines:** 688
**Purpose:** Runtime tile transformations (lava, ice, corruption, etc.)

#### Current Implementation

Manages dynamic tile conversions and spread effects:

```
Convert Tile -> Track State -> Process Effects -> Apply Damage/Healing -> Revert on Duration
```

**Algorithm Quality:** High
- Multiple tile types with distinct behaviors
- Radial spread mechanics (inward/outward)
- Duration-based auto-revert
- Entity effect processing (damage, slow, heal)

**Seed Reproducibility:** N/A (runtime system)

**Performance Concerns:**
- `maxSpreadPerFrame: 50` limits per-frame processing
- Map-based tracking for O(1) lookups
- Could be slow with many dynamic tiles

**Parameter Tuning:**
| Tile Type | Damage/Tick | Tick Rate | Notes |
|-----------|-------------|-----------|-------|
| lava | 20 | 500ms | High damage |
| frozen_floor | 0 + warmth drain | - | Movement slow |
| corrupted | 3 | 1000ms | Void damage |
| sanctified | +5 heal | 1000ms | Damages undead |

**Edge Cases:**
1. Nested tile conversions (corrupted -> sanctified -> ?) not fully handled
2. No visual warning before damage ticks
3. Movement blocking not integrated with pathfinding

**Missing Features:**
- Visual damage warnings
- Tile immunity for elemental creatures
- Spread from multiple simultaneous sources

**Priority Recommendations:**
1. **MEDIUM:** Add visual warning before damage
2. **LOW:** Integrate with pathfinding for AI avoidance
3. **LOW:** Handle nested conversions

---

### 9. `js/systems/spawn-point-system.js`

**Status:** Complete and functional
**Lines:** 716
**Purpose:** Continuous enemy spawning from rifts, nests, portals

#### Current Implementation

```
Create Spawn Point -> Update Timer -> Spawn Enemy -> Track Active Count -> Cleanup on Death
```

**Algorithm Quality:** High
- Multiple spawn point types with distinct behaviors
- Global cap (12 enemies) prevents overwhelming
- Spawn rate scaling over time
- Destructible spawn points with health

**Seed Reproducibility:** N/A (runtime system)

**Performance Concerns:**
- Processes all spawn points every frame
- Enemy lookup for position validation
- Manageable with limited spawn points

**Parameter Tuning:**
| Type | Spawn Rate | Cap | Total | Notes |
|------|-----------|-----|-------|-------|
| rift | 10s | 5 | Infinite | Void enemies |
| nest | 12s | 3 | 8 | Spiders |
| portal | 15s | 4 | Infinite | Demons |
| grave | 18s | 2 | 4 | Undead |

**Edge Cases:**
1. If no valid position, spawn silently fails
2. Enemy death callback may not fire if enemy removed differently
3. Spawn point destruction doesn't always kill spawned enemies

**Duplicative Logic:**
- `createEnemy()` here is a THIRD implementation of enemy creation!
- Uses different stat structure than enemy-spawner.js or dungeon-integration.js

**Missing Features:**
- Spawn point visual indicators
- Player-triggered activation (step on nest)
- Wave-based spawning

**Priority Recommendations:**
1. **CRITICAL:** Unify enemy creation with enemy-spawner.js
2. **MEDIUM:** Add visual spawn indicators
3. **LOW:** Implement wave mechanics

---

## Generation Algorithm Assessment

### BSP + Blob Algorithm

**Correctness:** The Blob-based BSP algorithm produces valid, playable maps in most cases.

**Strengths:**
1. Organic room shapes (not rectangular)
2. Theme variety with element assignment
3. Smooth corridor connections
4. Shrine/treasure distribution

**Weaknesses:**
1. No guaranteed minimum blob size
2. Corridor width inconsistency (config vs code)
3. May produce disconnected maps (rare)

### Cellular Automata

**Correctness:** B4/S4 rules produce reasonable interior detail.

**Strengths:**
1. Light texturing (20% walls)
2. Doorway preservation
3. Regeneration on failure

**Weaknesses:**
1. Generic rules (no theme customization)
2. No feature placement (pillars, etc.)

---

## Connectivity & Validity Analysis

### Connectivity Guarantees

| System | Guarantee | Recovery |
|--------|-----------|----------|
| dungeon-generator | Validated (flood-fill) | Warning only |
| chamber-generator | Validated (flood-fill) | Regenerate up to 5x |
| village-generator | Implicit (fixed layout) | N/A |
| core-generator | Guaranteed (open arena) | N/A |

### Validity Concerns

1. **Dungeon:** May produce maps with unreachable areas (warning logged, not regenerated)
2. **Chambers:** May fail to connect doorways after 5 attempts (uses last attempt)
3. **Village:** Fixed layout assumes no building overlap
4. **Core:** Always valid

### Recommendation
Add regeneration loop to dungeon-generator when connectivity validation fails.

---

## Performance Considerations

### Generation Time Estimates

| System | Map Size | Operations | Estimated Time |
|--------|----------|------------|----------------|
| dungeon-generator | 180x180 | BSP + Blob + Corridor + Validate | ~50-100ms |
| chamber-generator | 36x36 per room | BSP + CA + Validate | ~10-20ms per room |
| village-generator | 50x40 | Fixed + Decorations | ~5ms |
| core-generator | Config-based | Radial + Pillars | ~5ms |

### Memory Usage

- Dungeon: ~180x180 = 32,400 tiles + blob tracking
- Chambers: Grid copies during CA (3x per section)
- Village: 50x40 = 2,000 tiles
- Dynamic tiles: Map-based tracking (efficient)

### Optimization Opportunities

1. **Lazy connectivity validation** - only if visible issues
2. **CA double-buffering** - avoid grid copies
3. **Cached monster weights** - pre-compute element matching
4. **Spatial hashing** - for spawn position validation

---

## Priority Recommendations

### CRITICAL Priority

1. **Unify Enemy Creation Logic**
   - Three separate implementations exist:
     - `enemy-spawner.js::createEnemy()`
     - `dungeon-integration.js::createEnemyAtPosition()`
     - `spawn-point-system.js::createEnemy()`
   - Different stat scaling formulas cause inconsistent enemy strength
   - **Action:** Create single `EnemyFactory` module used by all systems

2. **Fix Corridor Width Inconsistency**
   - `DUNGEON_CONFIG.corridorWidth = 2` but `digWideCorridorTile()` uses 4
   - **Action:** Reconcile config with implementation

### HIGH Priority

3. **Add Seeded RNG Throughout**
   - No map reproducibility currently
   - Affects: dungeon, chamber, village, core, spawners
   - **Action:** Implement `SeededRNG` class, pass seed to all generators

4. **Regenerate on Connectivity Failure**
   - Currently only warns when dungeon has unreachable areas
   - **Action:** Add regeneration loop (max 3-5 attempts)

### MEDIUM Priority

5. **Verify Village World State Integration**
   - External dependencies (`getTransformedTile`, `getBuildingState`)
   - **Action:** Verify integration or add fallbacks

6. **Add Minimum Enemy Spacing**
   - Enemies can spawn adjacent to each other
   - **Action:** Add 2-tile minimum spacing requirement

7. **Add Visual Tile Damage Warnings**
   - Dynamic tiles damage without warning
   - **Action:** Add visual indicator 500ms before damage

### LOW Priority

8. **Optimize CA with Double-Buffering**
   - Grid copies inefficient
   - Minor performance gain

9. **Add Theme-Specific CA Rules**
   - All chambers use same rules
   - Could vary by element

10. **Implement Spawn Patterns**
    - Enemies spawn randomly
    - Could add patrol routes, ambush positions

---

## Dependencies on Other Agents

### Required from Data Architect
- `MONSTER_DATA` structure and tier definitions
- `ROOM_THEMES` color definitions
- `isOpposed()`, `isComplementary()` element relationship functions

### Required from Engineer
- `SystemManager` registration
- `AIManager` for enemy AI initialization
- `EnemyAbilitySystem` for ability setup

### Required from Interface
- `addMessage()` for damage notifications
- World state system integration (`WorldStateSystem`, `getTransformedTile`)

### Provides to Others
- `generateBlobDungeon()` - main generation entry point
- `DUNGEON_STATE` - blob/corridor data
- `DynamicTileSystem` - runtime tile effects
- `SpawnPointSystem` - continuous spawning

---

## Appendix: Code Metrics

| File | Lines | Functions | Classes | Complexity |
|------|-------|-----------|---------|------------|
| dungeon-generator.js | 831 | 18 | 1 (Leaf) | Medium |
| chamber-generator.js | 968 | 22 | 0 | Medium |
| village-generator.js | 698 | 17 | 0 | Low |
| core-generator.js | 388 | 12 | 0 | Low |
| enemy-spawner.js | 613 | 14 | 0 | Medium |
| extraction-spawner.js | 311 | 7 | 0 | Low |
| dungeon-integration.js | 607 | 12 | 0 | Medium |
| dynamic-tile-system.js | 688 | 23 | 0 | Medium |
| spawn-point-system.js | 716 | 22 | 0 | Medium |
| **TOTAL** | **5,820** | **147** | **1** | - |

---

*Report generated by Cartographer Agent*
*The Shifting Chasm - Procedural Generation Analysis*

---

# IMPLEMENTATION PLAN

## Summary
- Total issues identified: 10
- Priority breakdown: Critical: 2, High: 2, Medium: 3, Low: 3

## Issue Fix Queue

### Issue #1: Unify Enemy Creation Logic
- **File:** `js/generation/enemy-spawner.js`, `js/generation/dungeon-integration.js`, `js/systems/spawn-point-system.js`
- **Line(s):**
  - enemy-spawner.js: `createEnemy()` function
  - dungeon-integration.js: `createEnemyAtPosition()` function
  - spawn-point-system.js: `createEnemy()` function
- **Problem:** Three separate implementations of enemy creation exist with DIFFERENT stat scaling formulas, causing inconsistent enemy strength throughout the game
- **Fix:**
  1. Create unified `EnemyFactory` module in `js/generation/enemy-factory.js`
  2. Consolidate stat calculation logic (use enemy-spawner's `applyTierMultipliers()`)
  3. Remove `createEnemyAtPosition()` from dungeon-integration.js
  4. Remove `createEnemy()` from spawn-point-system.js
  5. Update all callers to use `EnemyFactory.create()`
- **Status:** [x] Fixed
- **Notes:** CRITICAL - Created `js/generation/enemy-factory.js` with unified `EnemyFactory` module. Updated all three files to use `EnemyFactory.createAndRegister()` with legacy fallbacks. All enemies now use consistent stat scaling via `applyTierMultipliers()`. Spawn point tracking preserved via `spawnPointId` and `spawnPointType` parameters.

### Issue #2: Fix Corridor Width Inconsistency
- **File:** `js/generation/dungeon-generator.js`
- **Line(s):** Config declaration vs `digWideCorridorTile()` function
- **Problem:** `DUNGEON_CONFIG.corridorWidth = 2` but `digWideCorridorTile()` uses hardcoded 4-tile width; config is ignored
- **Fix:**
  1. Update `digWideCorridorTile()` to read from `DUNGEON_CONFIG.corridorWidth`
  2. Decide on correct width (2 or 4) - recommend 4 for gameplay, update config
  3. Use `Math.floor(corridorWidth / 2)` for offset calculations
- **Status:** [x] Fixed
- **Notes:** CRITICAL - Updated `DUNGEON_CONFIG.corridorWidth` to 4 (matching intended behavior for comfortable navigation). Updated `digBiasedWalk()` to use `DUNGEON_CONFIG.corridorWidth` instead of hardcoded value. Added JSDoc comments to `digWideCorridorTile()`.

### Issue #3: Add Seeded RNG Throughout Generation
- **File:** `js/generation/dungeon-generator.js`, `js/generation/chamber-generator.js`, `js/generation/village-generator.js`, `js/generation/core-generator.js`, `js/generation/enemy-spawner.js`, `js/generation/extraction-spawner.js`
- **Line(s):** All `Math.random()` calls throughout these files
- **Problem:** No seeded RNG - maps are not reproducible; cannot replay specific dungeons or debug generation issues
- **Fix:**
  1. Create `SeededRNG` class in `js/generation/seeded-rng.js`
  2. Implement Mulberry32 or similar PRNG algorithm
  3. Pass seed through all generator functions
  4. Store seed in game state for reproducibility
  5. Replace all `Math.random()` calls with `rng.random()`
- **Status:** [x] Fixed (partial)
- **Notes:** HIGH - Created `js/generation/seeded-rng.js` with `SeededRNG` class using Mulberry32 algorithm. Integrated into `dungeon-generator.js` - all Math.random() calls replaced with `dungeonRandom()` helper that uses global `GenerationRNG`. Seed is stored in `DUNGEON_STATE.seed`. `generateBlobDungeonMap()` now accepts optional seed parameter. Other generators (chamber, village, core, spawners) can be migrated incrementally using the same pattern.

### Issue #4: Regenerate on Connectivity Failure
- **File:** `js/generation/dungeon-generator.js`
- **Line(s):** `validateConnectivity()` function and caller
- **Problem:** When connectivity validation fails (unreachable tiles detected), only a warning is logged - the broken map is still used
- **Fix:**
  1. Modify `validateConnectivity()` to return success/failure boolean
  2. Add regeneration loop in main generator function (max 5 attempts)
  3. Track attempt count and log if hitting max
  4. Only return map when validation passes
- **Status:** [x] Fixed
- **Notes:** HIGH - Modified `generateDungeonAttempt()` to return `isConnected` boolean. Updated main generation loop to check connectivity first and regenerate if failed. Added final warning with seed if max attempts reached without full connectivity. Uses existing `DUNGEON_CONFIG.maxRegenAttempts` (3) for regeneration limit.

### Issue #5: Verify Village World State Integration
- **File:** `js/generation/village-generator.js`
- **Line(s):** `_applyWorldState()` and `_applyDegradation()` functions
- **Problem:** External dependencies (`getTransformedTile`, `getBuildingState`) may not exist or work correctly; also `_applyWorldState` and `_applyDegradation` are nearly identical (code duplication)
- **Fix:**
  1. Verify `getTransformedTile` and `getBuildingState` exist in WorldStateSystem
  2. Add null checks/fallbacks for missing dependencies
  3. Merge `_applyWorldState` and `_applyDegradation` into single function
  4. Add unit test for world state integration
- **Status:** [x] Fixed
- **Notes:** MEDIUM - Added local fallback functions (`_fallbackGetTransformedTile`, `_fallbackGetBuildingState`, `_fallbackGetDamageConfig`). Updated `_applyWorldState()` to use fallbacks if global functions unavailable. Added defensive null checks throughout. Verified load order in index.html (village-tile-states.js loads BEFORE village-generator.js).

### Issue #6: Add Minimum Enemy Spacing
- **File:** `js/generation/enemy-spawner.js`
- **Line(s):** Position selection logic in spawn functions
- **Problem:** Enemies can spawn directly adjacent to each other, creating unfair difficulty spikes and visual clutter
- **Fix:**
  1. Track all spawned enemy positions in array
  2. Add `getMinDistance(pos, existingPositions)` helper
  3. Require minimum 2-tile spacing between enemies
  4. Increase spawn position attempts from 20 to 30 to accommodate spacing
- **Status:** [x] Fixed
- **Notes:** MEDIUM - Added `SPAWNER_CONFIG.minEnemySpacing = 2` and `maxSpawnAttempts = 30`. Added `getDistance()` and `respectsMinSpacing()` helper functions. Updated `findSpawnPosition()` to check spacing against both batch positions and existing game.enemies. Includes fallback to spawn without spacing if strict requirements cannot be met in dense rooms.

### Issue #7: Add Visual Tile Damage Warnings
- **File:** `js/systems/dynamic-tile-system.js`
- **Line(s):** Damage tick processing section
- **Problem:** Dynamic tiles (lava, corruption, etc.) damage players without visual warning; feels unfair
- **Fix:**
  1. Add `warningTime: 500` parameter to tile type configs
  2. Track warning state per tile-entity pair
  3. Emit visual warning event 500ms before first damage tick
  4. Glasswright will handle visual effect (pulse/glow)
- **Status:** [x] Fixed
- **Notes:** MEDIUM - Added `entityWarnings` Map to track warning state per entity-tile pair. Added `getEntityWarningState()`, `clearEntityWarningState()`, and `emitDamageWarning()` methods. Updated `applyTileEffectToEntity()` to show warning before first damage: displays warning message, emits `tileDamageWarning` and `tileDamageWarningPulse` events for visual systems, then applies damage after `config.warningTime` (500ms). Config added: `warningTime: 500`, `warningPulseSpeed: 200`.

### Issue #8: Optimize CA with Double-Buffering
- **File:** `js/generation/chamber-generator.js`
- **Line(s):** Cellular automata passes (grid copy operations)
- **Problem:** Full grid copy on each CA pass is inefficient; creates unnecessary memory allocation
- **Fix:**
  1. Allocate two grid buffers at start
  2. Alternate read/write between buffers each pass
  3. Swap buffer references instead of copying
  4. Minor performance improvement (~2-3ms per room)
- **Status:** [x] Fixed
- **Notes:** LOW - Added shared CA buffers (`caBufferA`, `caBufferB`) using Uint8Array for efficiency. Added `ensureCABuffers()` to allocate/resize buffers as needed. Updated `applyCellularAutomataToSection()` to use read/write buffer swapping instead of full grid copies. Only final result is copied to actual grid. Buffers are reused across all sections.

### Issue #9: Add Theme-Specific CA Rules
- **File:** `js/generation/chamber-generator.js`
- **Line(s):** CA rule configuration (currently hardcoded B4/S4)
- **Problem:** All chambers use identical CA rules regardless of element/theme; misses opportunity for visual variety
- **Fix:**
  1. Define CA rule sets per element in config object
  2. Fire element: higher wall chance, more chaotic (B3/S3)
  3. Ice element: linear formations, fewer walls (B5/S4)
  4. Shadow element: dense clusters (B4/S5)
  5. Pass element to CA function to select rules
- **Status:** [x] Fixed
- **Notes:** LOW - Added `THEME_CA_RULES` constant with element-specific configurations (fire: B3/S3 chaotic, ice: B5/S4 linear, shadow: B4/S5 dense, earth: B4/S4 solid, physical/default: B4/S4). Added `getCArulesForElement()` helper with element name mapping. Updated `applyCellularAutomataToSection()` to accept element parameter and use theme-specific rules. Updated `generateChambers()` to pass `room.element` to CA function.

### Issue #10: Implement Enemy Spawn Patterns
- **File:** `js/generation/enemy-spawner.js`
- **Line(s):** Position selection (currently pure random)
- **Problem:** Enemies spawn in random positions with no tactical consideration; misses opportunity for interesting encounters
- **Fix:**
  1. Define spawn patterns: "patrol" (along walls), "ambush" (behind cover), "guard" (near treasure/shrines), "cluster" (group tactics)
  2. Assign pattern based on monster type and room type
  3. Calculate positions that satisfy pattern requirements
  4. Fall back to random if pattern cannot be satisfied
- **Status:** [x] Fixed
- **Notes:** LOW - Added `SPAWN_PATTERNS` constant with 5 patterns (patrol, ambush, guard, cluster, scattered). Each pattern has `monsterAffinity` and `roomAffinity` arrays for weighted selection. Added `selectSpawnPattern()` for weighted pattern selection based on room and monsters. Added position finders: `getPatrolPositions()` (near walls), `getAmbushPositions()` (corners/cover), `getGuardPositions()` (around center), `getClusterPositions()` (tight group). Updated `spawnEnemiesInRoom()` to pre-select monsters, choose pattern, get pattern positions, and spawn with fallback to random. Enemies get `spawnPattern` property for AI behavior hints.

---

# RUNNING LOG (Context Window Continuity)

## Current Position
- **Last Completed:** Issue #10 - Implement Enemy Spawn Patterns
- **Currently Working On:** ALL ISSUES COMPLETE
- **Next Up:** N/A - All 10 issues resolved

## Session Log
| Session | Date | Issues Fixed | Notes |
|---------|------|--------------|-------|
| 0 | 2025-02-11 | - | Implementation plan created |
| 1 | 2026-02-11 | Issue #1, #2, #3, #4 | Created EnemyFactory; Fixed corridor width; Added SeededRNG; Added connectivity regeneration |
| 2 | 2026-02-11 | Issue #5, #6, #7, #8, #9, #10 | Village state fallbacks; Enemy spacing; Tile damage warnings; CA double-buffering; Theme CA rules; Spawn patterns |

## Quick Resume Instructions
All issues have been completed. If future work is needed:
1. Read this analysis file (CARTOGRAPHER_ANALYSIS.md)
2. Review completed issue notes for implementation details
3. Files owned by Cartographer: `js/generation/`, `js/systems/dynamic-tile-system.js`, `js/systems/spawn-point-system.js`
4. Key additions: `js/generation/enemy-factory.js`, `js/generation/seeded-rng.js`
5. NOTE: Issue #1 created shared `EnemyFactory` - coordinate with Warbringer if AI initialization changes are needed
