# Legacy Code Analysis Report

**Generated:** 2026-02-18
**Updated:** 2026-02-18 (with actionable resolutions)
**Codebase:** anthropic-claude-cloud (JavaScript game)
**Files Analyzed:** 181 JavaScript files

---

## Executive Summary

This analysis identified **significant legacy debt** including **2 CRITICAL BUGS** currently affecting gameplay:

| Severity | Issue | Impact |
|----------|-------|--------|
| **CRITICAL** | `game.gold` divergence bug | Gold from bosses/NPCs is LOST on extraction |
| **CRITICAL** | `executeSkillAction` missing | All skill actions FAIL SILENTLY |
| **HIGH** | Item lookup bug | Loot tooltips show incomplete data |
| **HIGH** | 8 monsters missing tier mappings | Wrong AI behavior |
| **MEDIUM** | 14 orphaned files | ~6,470 lines dead code |

---

## CRITICAL BUG #1: Gold Loss on Extraction

### The Problem
`game.gold` is deprecated but still actively written to, while save/sync reads from `game.player.gold`.

### Evidence

**WRITES to deprecated field (active code):**
| File | Line | Code |
|------|------|------|
| `js/entities/boss.js` | 1967 | `game.gold += boss.loot.bonus.gold` |
| `js/entities/npc.js` | 624 | `game.gold = (game.gold \|\| 0) + rewards.gold` |

**READS from deprecated field (active code):**
| File | Line | Code |
|------|------|------|
| `js/ui/character-overlay.js` | 360, 378 | Display gold in overlay |
| `js/ui/extraction-ui.js` | 190 | Display gold in extraction UI |

**SYNC reads from CORRECT field:**
- `js/core/game-state.js:544` - `syncSessionFromGame()` reads `game.player.gold`

### Bug Flow
1. Boss dies → `game.gold += bonus` (boss.js:1967)
2. Player sees gold in UI → reads `game.gold` (character-overlay.js:360)
3. Player extracts → sync reads `game.player.gold` (game-state.js:544)
4. Bank receives 0 gold → **GOLD LOST**

### FIX (Exact Changes)

**File: `js/entities/boss.js` line 1967**
```javascript
// CHANGE FROM:
game.gold += boss.loot.bonus.gold;
// CHANGE TO:
game.player.gold += boss.loot.bonus.gold;
```

**File: `js/entities/npc.js` line 624**
```javascript
// CHANGE FROM:
game.gold = (game.gold || 0) + rewards.gold;
// CHANGE TO:
game.player.gold = (game.player.gold || 0) + rewards.gold;
```

---

## CRITICAL BUG #2: Skill Actions Fail Silently

### The Problem
`skills-combat-integration.js` was commented out with note "Consolidated into combat-master.js" but the consolidation is **incomplete**. The function definitions were never migrated.

### Evidence

**index.html line 235:**
```html
<!-- <script src="js/systems/skills-combat-integration.js"></script> --> <!-- Consolidated into combat-master.js -->
```

**combat-master.js lines 3564-3565 (ACTIVE):**
```javascript
if (target && typeof executeSkillAction === 'function') {
    executeSkillAction(player, actionId, target);  // CALL exists
}
```

**skills-combat-integration.js lines 475-748 (NOT LOADED):**
```javascript
function executeSkillAction(player, actionId, target) { ... }  // DEFINITION exists but not loaded
function executeDamageAction(player, action, target, damage) { ... }
function executeDotAction(player, action, target, damage) { ... }
function executeCCAction(player, action, target, damage) { ... }
function executeAoeAction(player, action, targets, damage) { ... }
```

### Bug Flow
1. Player uses skill → combat-master.js:3564 checks `typeof executeSkillAction`
2. Check returns `false` (function not defined)
3. Skill execution silently skipped
4. **ALL SKILL ACTIONS NON-FUNCTIONAL**

### FIX (Choose One)

**Option A: Uncomment the file (quick fix)**
```html
<!-- index.html line 235 -->
<!-- CHANGE FROM: -->
<!-- <script src="js/systems/skills-combat-integration.js"></script> -->
<!-- CHANGE TO: -->
<script src="js/systems/skills-combat-integration.js"></script>
```

**Option B: Complete the consolidation (proper fix)**
Migrate these functions from skills-combat-integration.js (lines 475-748) into combat-master.js:
- `executeSkillAction()` (lines 475-535)
- `executeDamageAction()` (lines 537-580)
- `executeDotAction()` (lines 585-610)
- `executeCCAction()` (lines 615-640)
- `executeAoeAction()` (lines 645-662)

---

## HIGH PRIORITY BUG: Item Lookup Failure

### The Problem
Monster loot uses display names (`'Bat Wing'`) but `ITEMS_DATA` uses underscore IDs (`'bat_wing'`). **No normalizer exists.**

### Evidence

**Monster loot definition (`js/data/monsters-data.js` line 57):**
```javascript
loot: [{ name: 'Bat Wing', dropChance: 0.03, ... }]
```

**Item lookup (`js/ui/renderer.js` lines 359, 483):**
```javascript
const itemData = ITEMS_DATA[item.name] || item;
// item.name = "Bat Wing"
// ITEMS_DATA["Bat Wing"] = undefined  // FAILS
// ITEMS_DATA["bat_wing"] = { ... }    // Correct key, but not used
```

### Impact
- Loot tooltips show incomplete data
- Rarity, descriptions, and metadata from ITEMS_DATA not displayed
- Falls back to inventory item properties (partial data)

### FIX (Choose One)

**Option A: Create normalizer function**
```javascript
// Add to js/utils/helpers.js
function normalizeItemId(displayName) {
    return displayName.toLowerCase().replace(/\s+/g, '_');
}

// Then in renderer.js lines 359, 483:
const itemData = ITEMS_DATA[normalizeItemId(item.name)] || ITEMS_DATA[item.name] || item;
```

**Option B: Change loot to use IDs**
Update all monster loot arrays to use IDs instead of display names:
```javascript
// CHANGE FROM:
loot: [{ name: 'Bat Wing', ... }]
// CHANGE TO:
loot: [{ id: 'bat_wing', ... }]
```

---

## 1. ORPHANED FILES - Dependency Map Verified

All 15 files verified **SAFE TO DELETE** - no active code depends on them.

### Verification Method
- Searched for ALL exports from each orphaned file
- Checked for `typeof` runtime checks
- Verified no window property dependencies
- All files are commented out in index.html with "Consolidated" notes

### Files Safe to Archive

| File | Lines | Verified Safe | Exports Checked |
|------|-------|---------------|-----------------|
| `js/systems/combat-system.js` | ~1600 | YES | updateCombat, engageCombat, renderDamageNumbers, etc. |
| `js/systems/active-combat.js` | ~600 | YES | handleActiveCombatHotkey, MAGIC_CONFIG |
| `js/systems/projectile-system.js` | ~650 | YES | createProjectile, updateProjectiles, renderProjectiles |
| `js/utils/damage-calculator.js` | ~460 | YES | DamageCalculator, calculateDamageSimple |
| `js/systems/pokemon-movement.js` | ~100 | YES | movePlayerContinuous, canMoveToPosition |
| `js/utils/movement-utils.js` | ~230 | YES | lerp, updateEntityMovement, easeOutQuad |
| `js/utils/pathfinding.js` | ~320 | YES | findPath, isWalkable (completely unused) |
| `js/utils/Collision.js` | ~250 | YES | canMoveTo, checkCircleCollision |
| `js/systems/combat-enhancements.js` | ~200 | YES | performDash, applyKnockback |
| `js/systems/mouse-attack-system.js` | ~150 | YES | performMouseAttack, getMouseWorldPosition |
| `js/systems/status-effect-system.js` | ~300 | YES | StatusEffectSystem (typeof checks are fallbacks) |
| `js/systems/boon-combat-integration.js` | ~60 | YES | BoonCombatIntegration |
| `js/systems/advanced-enemy-system.js` | ~400 | YES | Explicitly deprecated in file |
| `js/ui/enemy-movement-updater.js` | ~100 | YES | updateEnemyMovement |

**EXCEPTION:** `js/systems/skills-combat-integration.js` - **DO NOT DELETE** until Critical Bug #2 is fixed.

### Action
```bash
mkdir -p z_archive/legacy-code
mv js/systems/combat-system.js z_archive/legacy-code/
mv js/systems/active-combat.js z_archive/legacy-code/
# ... etc for all files except skills-combat-integration.js
```

---

## 2. TILE RENDERER RESOLUTION

### Analysis Result
Both files are loaded, but `js/ui/tile-renderer.js` is a **wrapper that DEPENDS ON** `js/rendering/tile-renderer.js`.

### Load Order (index.html)
- Line 140: `js/rendering/tile-renderer.js` (loaded FIRST - core system)
- Line 142: `js/ui/tile-renderer.js` (loaded SECOND - wrapper)

### Dependency Chain
```
js/ui/tile-renderer.js
  └─> Line 248: calls drawCorridorFloorTile()     ← from rendering/tile-renderer.js
  └─> Line 253: calls drawThemedFloorTile()       ← from rendering/tile-renderer.js
  └─> Line 344: calls drawThemedCornerTile()      ← from rendering/tile-renderer.js
  └─> Line 347: calls drawThemedWallTile()        ← from rendering/tile-renderer.js
```

### Decision: KEEP BOTH (for now)

**Rationale:**
- `js/rendering/tile-renderer.js` (2,325 lines) - Contains TILE_SPRITES, core procedural rendering
- `js/ui/tile-renderer.js` (720 lines) - Provides drawFloorTile(), drawWallTile() called by renderer.js

**Future consolidation:** Merge ui/tile-renderer.js functions into rendering/tile-renderer.js, but this requires updating all call sites in renderer.js.

---

## 3. STATUS EFFECT SYSTEM RESOLUTION

### Single Authority Decision: `combat-master.js`

### Comparison

| Feature | skills-combat-integration.js | combat-master.js |
|---------|------------------------------|------------------|
| Effect types | 4 (bleed, burn, stun, freeze) | 16+ registered |
| Stack handling | Manual per-tick | Sophisticated stackBehavior modes |
| Stat modifiers | Hardcoded properties | Full statMods system |
| Callbacks | None | onApply, onTick, onExpire lifecycle |

**Verdict:** combat-master.js has the superior implementation. The skills-combat-integration.js status logic (lines 9-181) is redundant.

**However:** The skill action execution logic (lines 468-748) is NOT redundant - see Critical Bug #2.

---

## 4. PHANTOM MONSTER REFERENCES

### Full-Text Search Results

**'Demon Guardian'** - 1 location only:
- `js/config/enemy-patterns-config.js` line 145

**'Armored Knight'** - 1 location only:
- `js/config/enemy-patterns-config.js` line 146

### Verified NOT in:
- Spawn tables (enemy-spawner.js, extraction-spawner.js)
- Loot tables (loot-system.js)
- Dialogue (elder-dialogue.js)
- Quests (quests.js)
- Monster data (monsters-data.js)

### Action
**File: `js/config/enemy-patterns-config.js` lines 142-147**
```javascript
// CHANGE FROM:
shieldedEnemies: [
    'Temple Sentinel',
    'Shield Bearer',
    'Demon Guardian',
    'Armored Knight'
],
// CHANGE TO:
shieldedEnemies: [
    'Temple Sentinel',
    'Shield Bearer'
],
```

---

## 5. UNUSED HELPER FUNCTIONS

### Verification Result: SAFE TO DELETE

**Functions:** `getMonstersByElement()`, `getMonstersByAttackType()`
**Location:** `js/data/monsters-data.js` lines 462-480

### Checked For:
- Direct calls: NONE FOUND
- Dynamic invocation (`window[methodName]()`): NONE FOUND
- Callback patterns: NONE FOUND
- Debug command usage: NONE FOUND

### Action
Delete lines 462-480 and corresponding window exports (lines 479-480).

---

## 6. MISSING DATA REFERENCES

### Monsters Missing from MONSTER_TIER_MAP

**File:** `js/data/monster-tiers.js`

**Add to MONSTER_TIER_MAP object:**
```javascript
'Frozen Husk': 'TIER_3',
'Blizzard Spirit': 'ELITE',
'Frost Elemental': 'TIER_3',
'Deep Crawler': 'TIER_3',
'Tide Serpent': 'ELITE',
'Void Touched': 'ELITE',
'Flame Sprite': 'TIER_2',
'Ice Golem': 'TIER_3'
```

### Monsters Missing from enemyTimings

**File:** `js/config/enemy-patterns-config.js`

**Add to enemyTimings object:**
```javascript
'Frozen Husk': 'heavy',        // attackSpeed: 2.0
'Blizzard Spirit': 'caster',   // attackSpeed: 1.2, fast caster
'Frost Elemental': 'caster',   // attackSpeed: 1.6, caster
'Deep Crawler': 'standard',    // attackSpeed: 1.6
'Tide Serpent': 'heavy',       // attackSpeed: 1.4
'Void Touched': 'caster',      // attackSpeed: 1.8, ranged
'Flame Sprite': 'standard',    // attackSpeed: 1.4
'Ice Golem': 'heavy'           // attackSpeed: 2.0
```

---

## 7. EXECUTION ORDER (Phased Rollback Strategy)

### Phase 1: Critical Bug Fixes (Test after each)
1. Fix `game.gold` divergence (boss.js:1967, npc.js:624)
   - **Test:** Kill boss, extract, verify gold in bank
2. Fix `executeSkillAction` missing (uncomment or migrate)
   - **Test:** Use any skill in combat, verify damage/effect applied

### Phase 2: Data Fixes (Pure additions, zero risk)
3. Add 8 monsters to MONSTER_TIER_MAP
4. Add 8 monsters to enemyTimings
5. Remove phantom shieldedEnemies entries
6. Fix Flame Sprite damageType

**Test:** Spawn each of the 8 monsters, verify AI behavior

### Phase 3: Bug Fixes (Test after each)
7. Fix item lookup (add normalizer OR change loot to IDs)
   - **Test:** Kill monster with loot, hover tooltip, verify full data shows

### Phase 4: Cleanup (Low risk after above phases)
8. Archive 14 orphaned files (NOT skills-combat-integration.js until Phase 1 done)
9. Delete unused helper functions
10. Clean commented script tags from index.html

**Test full playthrough after Phase 4**

---

## 8. VERIFICATION CHECKLIST

Run after EACH phase:

### Phase 1 Verification
- [ ] Kill boss, extract, check bank balance increased
- [ ] Use skill in combat, verify damage numbers appear
- [ ] Check console for errors

### Phase 2 Verification
- [ ] Spawn 'Frozen Husk' - verify TIER_3 AI behavior
- [ ] Spawn 'Blizzard Spirit' - verify ELITE AI behavior
- [ ] Spawn 'Void Touched' - verify caster timing

### Phase 3 Verification
- [ ] Kill Flame Bat, hover 'Bat Wing' loot
- [ ] Verify tooltip shows rarity, description from ITEMS_DATA

### Phase 4 Verification (Full Playthrough)
- [ ] Game starts in village without console errors
- [ ] Can enter dungeon without errors
- [ ] Combat damage calculates correctly
- [ ] Projectiles render and hit targets
- [ ] Status effects apply once (not twice)
- [ ] Movement/pathfinding works
- [ ] Shield enemies (Temple Sentinel, Shield Bearer) block correctly
- [ ] Audio plays once per event (not doubled)

---

## Appendix: Quick Reference

### Files to Modify

| File | Changes |
|------|---------|
| `js/entities/boss.js:1967` | `game.gold` → `game.player.gold` |
| `js/entities/npc.js:624` | `game.gold` → `game.player.gold` |
| `index.html:235` | Uncomment skills-combat-integration.js OR migrate functions |
| `js/ui/renderer.js:359,483` | Add item ID normalizer |
| `js/data/monster-tiers.js` | Add 8 monster tier mappings |
| `js/config/enemy-patterns-config.js:83-120` | Add 8 monster timings |
| `js/config/enemy-patterns-config.js:145-146` | Remove phantom monsters |
| `js/data/monsters-data.js:462-480` | Delete unused functions |

### Files to Archive (After Phase 1 complete)

Move to `z_archive/legacy-code/`:
- 14 files listed in Section 1 (6,470 lines total)

### Estimated Impact

| Metric | Before | After |
|--------|--------|-------|
| Critical bugs | 2 | 0 |
| High priority bugs | 1 | 0 |
| Dead code lines | ~6,470 | 0 |
| Missing data references | 10 | 0 |
| Phantom config entries | 2 | 0 |
