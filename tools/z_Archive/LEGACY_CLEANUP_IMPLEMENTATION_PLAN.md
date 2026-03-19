# Legacy Code Cleanup - Implementation Plan

**Created:** 2026-02-18
**Based on:** LEGACY_CODE_ANALYSIS.md
**Estimated Scope:** 8 files modified, 14 files archived, 3 bugs fixed

---

## Pre-Flight Checklist

Before starting, complete these steps:

- [ ] Ensure working directory is clean (`git status`)
- [ ] Create backup branch: `git checkout -b legacy-cleanup-backup && git push origin legacy-cleanup-backup`
- [ ] Return to working branch: `git checkout Godot-Implementation`
- [ ] Open browser with game running for testing
- [ ] Open browser console (F12) to monitor for errors

---

## Phase 1: Critical Bug Fixes

**Objective:** Fix the 2 critical bugs affecting gameplay before any cleanup.

### Step 1.1: Fix Gold Loss Bug

**File:** `js/entities/boss.js`

1. Open the file and navigate to line 1967
2. Find: `game.gold += boss.loot.bonus.gold;`
3. Replace with: `game.player.gold += boss.loot.bonus.gold;`

**File:** `js/entities/npc.js`

1. Open the file and navigate to line 624
2. Find: `game.gold = (game.gold || 0) + rewards.gold;`
3. Replace with: `game.player.gold = (game.player.gold || 0) + rewards.gold;`

**Verification:**
```
1. Start game, enter dungeon
2. Find and kill a boss (or use debug: spawnBoss())
3. Note the gold amount shown in UI
4. Extract from dungeon
5. Check bank balance - should include boss gold
```

### Step 1.2: Fix Skill Actions Bug

**File:** `index.html`

1. Open the file and navigate to line 235
2. Find: `<!-- <script src="js/systems/skills-combat-integration.js"></script> --> <!-- Consolidated into combat-master.js -->`
3. Replace with: `<script src="js/systems/skills-combat-integration.js"></script>`

**Verification:**
```
1. Start game, enter dungeon
2. Engage enemy in combat
3. Use any skill from action bar (not basic attack)
4. Verify damage numbers appear and enemy takes damage
5. Check console for errors
```

### Step 1.3: Commit Phase 1

```bash
git add js/entities/boss.js js/entities/npc.js index.html
git commit -m "$(cat <<'EOF'
Fix critical bugs: gold loss and skill actions

- Fix gold divergence: boss.js and npc.js now write to game.player.gold
  instead of deprecated game.gold field. This fixes gold being lost
  on extraction because sync reads from game.player.gold.

- Restore skills-combat-integration.js: The file was commented out
  as "consolidated" but executeSkillAction() was never migrated to
  combat-master.js, causing all skill actions to fail silently.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2: Data Fixes

**Objective:** Add missing data references (pure additions, zero deletion risk).

### Step 2.1: Add Missing Monster Tier Mappings

**File:** `js/data/monster-tiers.js`

1. Find the `MONSTER_TIER_MAP` object (around line 757)
2. Add these entries inside the object (before the closing brace):

```javascript
    // Added: Previously missing tier mappings
    'Frozen Husk': 'TIER_3',
    'Blizzard Spirit': 'ELITE',
    'Frost Elemental': 'TIER_3',
    'Deep Crawler': 'TIER_3',
    'Tide Serpent': 'ELITE',
    'Void Touched': 'ELITE',
    'Flame Sprite': 'TIER_2',
    'Ice Golem': 'TIER_3',
```

### Step 2.2: Add Missing Enemy Timings

**File:** `js/config/enemy-patterns-config.js`

1. Find the `enemyTimings` object (around line 83)
2. Add these entries inside the object:

```javascript
    // Added: Previously missing timing profiles
    'Frozen Husk': 'heavy',
    'Blizzard Spirit': 'caster',
    'Frost Elemental': 'caster',
    'Deep Crawler': 'standard',
    'Tide Serpent': 'heavy',
    'Void Touched': 'caster',
    'Flame Sprite': 'standard',
    'Ice Golem': 'heavy',
```

### Step 2.3: Remove Phantom Monster References

**File:** `js/config/enemy-patterns-config.js`

1. Find the `shieldedEnemies` array (around line 142)
2. Remove `'Demon Guardian',` and `'Armored Knight'` from the array
3. Result should be:

```javascript
    shieldedEnemies: [
        'Temple Sentinel',
        'Shield Bearer'
    ],
```

### Step 2.4: Fix Flame Sprite Damage Type

**File:** `js/data/monsters-data.js`

1. Find `'Flame Sprite':` entry (around line 411)
2. Find the line: `damageType: 'magic',`
3. Change to: `damageType: 'fire',` (to match fire element)

**Verification:**
```javascript
// Run in browser console:
console.log('Tier mappings:');
['Frozen Husk', 'Blizzard Spirit', 'Frost Elemental', 'Deep Crawler',
 'Tide Serpent', 'Void Touched', 'Flame Sprite', 'Ice Golem'].forEach(m => {
    console.log(`  ${m}: ${MONSTER_TIER_MAP[m] || 'MISSING'}`);
});

// Should show all 8 with proper tiers, no 'MISSING'
```

### Step 2.5: Commit Phase 2

```bash
git add js/data/monster-tiers.js js/config/enemy-patterns-config.js js/data/monsters-data.js
git commit -m "$(cat <<'EOF'
Add missing monster data and remove phantom references

- Add 8 monsters to MONSTER_TIER_MAP: Frozen Husk, Blizzard Spirit,
  Frost Elemental, Deep Crawler, Tide Serpent, Void Touched,
  Flame Sprite, Ice Golem

- Add 8 monsters to enemyTimings config with appropriate profiles

- Remove phantom shieldedEnemies entries: 'Demon Guardian' and
  'Armored Knight' (monsters don't exist in monsters-data.js)

- Fix Flame Sprite damageType from 'magic' to 'fire' to match element

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 3: Item Lookup Bug Fix

**Objective:** Fix the item name/ID mismatch causing incomplete loot tooltips.

### Step 3.1: Add Normalizer Function

**File:** `js/utils/helpers.js`

1. Add this function near the top of the file (after any existing utility functions):

```javascript
/**
 * Converts item display name to underscore ID format.
 * Example: "Bat Wing" -> "bat_wing"
 * @param {string} displayName - The display name of the item
 * @returns {string} The normalized ID
 */
function normalizeItemId(displayName) {
    if (!displayName || typeof displayName !== 'string') return displayName;
    return displayName.toLowerCase().replace(/\s+/g, '_');
}

// Export to window
window.normalizeItemId = normalizeItemId;
```

### Step 3.2: Update Item Lookup in Renderer

**File:** `js/ui/renderer.js`

1. Find line 359 (item lookup in inventory rendering)
2. Find pattern: `ITEMS_DATA[item.name]`
3. Replace with: `ITEMS_DATA[normalizeItemId(item.name)] || ITEMS_DATA[item.name]`

4. Find line 483 (item lookup in inspect panel)
5. Find pattern: `ITEMS_DATA[item.name] || item`
6. Replace with: `ITEMS_DATA[normalizeItemId(item.name)] || ITEMS_DATA[item.name] || item`

**Verification:**
```
1. Start game, enter dungeon
2. Kill a Flame Bat (or monster that drops materials)
3. Pick up the loot
4. Open inventory
5. Hover over the dropped item (e.g., "Bat Wing")
6. Verify tooltip shows full data (rarity, description, etc.)
```

### Step 3.3: Commit Phase 3

```bash
git add js/utils/helpers.js js/ui/renderer.js
git commit -m "$(cat <<'EOF'
Fix item lookup mismatch between loot names and ITEMS_DATA keys

Monster loot uses display names ('Bat Wing') but ITEMS_DATA uses
underscore IDs ('bat_wing'). Added normalizeItemId() function to
convert display names to IDs, and updated renderer.js lookups to
use the normalizer with fallback chain.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 4: Code Cleanup

**Objective:** Archive dead code and remove unused functions.

### Step 4.1: Create Archive Directory

```bash
mkdir -p z_archive/legacy-code
```

### Step 4.2: Archive Orphaned Files

```bash
# Combat system files (consolidated into combat-master.js)
mv js/systems/combat-system.js z_archive/legacy-code/
mv js/systems/active-combat.js z_archive/legacy-code/
mv js/systems/projectile-system.js z_archive/legacy-code/
mv js/systems/combat-enhancements.js z_archive/legacy-code/
mv js/systems/mouse-attack-system.js z_archive/legacy-code/
mv js/systems/status-effect-system.js z_archive/legacy-code/
mv js/systems/boon-combat-integration.js z_archive/legacy-code/

# Movement system files (consolidated into movement-master.js)
mv js/systems/pokemon-movement.js z_archive/legacy-code/
mv js/ui/enemy-movement-updater.js z_archive/legacy-code/
mv js/utils/movement-utils.js z_archive/legacy-code/
mv js/utils/pathfinding.js z_archive/legacy-code/

# Utility files
mv js/utils/damage-calculator.js z_archive/legacy-code/
mv js/utils/Collision.js z_archive/legacy-code/

# Deprecated system
mv js/systems/advanced-enemy-system.js z_archive/legacy-code/
```

**Note:** DO NOT archive `skills-combat-integration.js` - it was restored in Phase 1.

### Step 4.3: Remove Unused Helper Functions

**File:** `js/data/monsters-data.js`

1. Find and delete lines 462-480 (approximately):

```javascript
// DELETE THIS BLOCK:
// Get monsters by element
function getMonstersByElement(element) {
    return Object.entries(MONSTER_DATA)
        .filter(([name, data]) => data.element === element)
        .map(([name]) => name);
}

// Get monsters by attack type
function getMonstersByAttackType(attackType) {
    return Object.entries(MONSTER_DATA)
        .filter(([name, data]) => data.attackType === attackType)
        .map(([name]) => name);
}

// Export (also delete these lines)
window.getMonstersByElement = getMonstersByElement;
window.getMonstersByAttackType = getMonstersByAttackType;
```

### Step 4.4: Clean index.html Comments

**File:** `index.html`

Remove all commented-out script tags (lines ~70-240). These are no longer needed as reference since files are archived.

Find and delete lines like:
```html
<!-- <script src="js/utils/Collision.js"></script> -->
<!-- <script src="js/systems/combat-system.js"></script> --> <!-- Consolidated into combat-master.js -->
<!-- etc... -->
```

Keep active script tags. When done, the script section should only contain uncommented, active script tags.

### Step 4.5: Verification

```
1. Hard refresh browser (Ctrl+Shift+R)
2. Check console for any script loading errors
3. Start game in village - verify no errors
4. Enter dungeon - verify no errors
5. Engage in combat - verify combat works
6. Use skills - verify skills work
7. Move around - verify movement works
8. Kill enemy - verify loot drops and can be picked up
```

### Step 4.6: Commit Phase 4

```bash
git add -A
git commit -m "$(cat <<'EOF'
Archive legacy code and clean up unused functions

Archived 14 files to z_archive/legacy-code/:
- Combat: combat-system.js, active-combat.js, projectile-system.js,
  combat-enhancements.js, mouse-attack-system.js, status-effect-system.js,
  boon-combat-integration.js (all consolidated into combat-master.js)
- Movement: pokemon-movement.js, enemy-movement-updater.js,
  movement-utils.js, pathfinding.js (consolidated into movement-master.js)
- Utils: damage-calculator.js, Collision.js
- Deprecated: advanced-enemy-system.js

Removed unused helper functions from monsters-data.js:
- getMonstersByElement() - never called
- getMonstersByAttackType() - never called

Cleaned commented script tags from index.html.

Total: ~6,470 lines of dead code removed from active codebase.

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 5: Final Verification

### Full Playthrough Test

Complete this checklist to verify all systems work:

**Village:**
- [ ] Game starts in village without console errors
- [ ] Can interact with NPCs
- [ ] Can access bank
- [ ] Can access shop
- [ ] Can start dungeon run

**Dungeon:**
- [ ] Dungeon generates correctly
- [ ] Player can move (WASD/arrow keys)
- [ ] Enemies spawn and move
- [ ] Enemies have correct AI behavior (not all using TIER_2)

**Combat:**
- [ ] Basic attack works
- [ ] Skills work (damage numbers appear)
- [ ] Projectiles render correctly
- [ ] Status effects apply (test poison/bleed)
- [ ] Damage numbers display
- [ ] Enemy death animation plays

**Loot:**
- [ ] Enemies drop loot on death
- [ ] Loot can be picked up
- [ ] Loot tooltip shows full data (rarity, description)
- [ ] Inventory displays items correctly

**Extraction:**
- [ ] Kill boss, note gold reward
- [ ] Extract from dungeon
- [ ] Verify gold appears in bank (CRITICAL - validates Phase 1 fix)

**Audio:**
- [ ] Combat sounds play
- [ ] Sounds play once (not doubled)

### Console Check

```javascript
// Run in browser console to verify no legacy references
console.log('Legacy check:');
console.log('  renderProjectiles:', typeof window.renderProjectiles);  // Should exist (from combat-master)
console.log('  renderDamageNumbers:', typeof window.renderDamageNumbers);  // Should exist
console.log('  executeSkillAction:', typeof window.executeSkillAction);  // Should exist (from restored file)
console.log('  StatusEffectSystem:', typeof window.StatusEffectSystem);  // Should exist
console.log('  normalizeItemId:', typeof window.normalizeItemId);  // Should exist (new function)
```

---

## Rollback Procedures

### If Phase 1 Breaks Something

```bash
git checkout HEAD~1 -- js/entities/boss.js js/entities/npc.js index.html
```

### If Phase 2 Breaks Something

```bash
git checkout HEAD~1 -- js/data/monster-tiers.js js/config/enemy-patterns-config.js js/data/monsters-data.js
```

### If Phase 3 Breaks Something

```bash
git checkout HEAD~1 -- js/utils/helpers.js js/ui/renderer.js
```

### If Phase 4 Breaks Something

```bash
# Restore archived files
cp z_archive/legacy-code/* js/systems/ 2>/dev/null
cp z_archive/legacy-code/damage-calculator.js js/utils/
cp z_archive/legacy-code/Collision.js js/utils/
cp z_archive/legacy-code/movement-utils.js js/utils/
cp z_archive/legacy-code/pathfinding.js js/utils/
cp z_archive/legacy-code/enemy-movement-updater.js js/ui/

# Restore index.html
git checkout HEAD~1 -- index.html

# Restore monsters-data.js
git checkout HEAD~1 -- js/data/monsters-data.js
```

### Full Rollback

```bash
git checkout legacy-cleanup-backup
```

---

## Post-Implementation

### Update Documentation

After successful implementation, update any relevant documentation:
- [ ] Update README if it references removed files
- [ ] Update any developer onboarding docs
- [ ] Mark LEGACY_CODE_ANALYSIS.md as "COMPLETED" with date

### Future Consolidation Tasks (Not in this plan)

These are identified but deferred:

1. **Tile Renderer Merge** - Merge `js/ui/tile-renderer.js` into `js/rendering/tile-renderer.js`
2. **Complete skills-combat-integration Migration** - Move `executeSkillAction()` and handlers into `combat-master.js`, then archive the file
3. **SystemManager Integration** - Move manual system updates from `main.js` into SystemManager
4. **NPC Legacy Alias** - Remove `elder` alias after verifying no references

---

## Summary

| Phase | Changes | Risk Level | Test Required |
|-------|---------|------------|---------------|
| 1 | Fix 2 critical bugs | LOW | Yes - verify gold + skills |
| 2 | Add missing data | ZERO | Yes - spawn monsters |
| 3 | Fix item lookup | LOW | Yes - verify tooltips |
| 4 | Archive dead code | LOW | Yes - full playthrough |

**Total Estimated Time:** 1-2 hours (including testing)

**Files Modified:** 8
**Files Archived:** 14
**Lines Removed:** ~6,470
**Bugs Fixed:** 3 (2 critical, 1 high)
