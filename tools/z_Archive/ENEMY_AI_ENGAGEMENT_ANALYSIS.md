# Monster Engagement Bug Analysis and Fix Recommendations

**Date:** February 2026
**Issue:** Monsters don't approach the player when engaged in combat - they circle around and wait for the player to come within range.

---

## User Requirements
- **Aggression Level:** Relentless Chase - enemies always move toward player when not in attack range
- **Scope:** Fix BOTH melee AND ranged enemies

---

## Problem Statement
Monsters don't approach the player when engaged in combat. Instead, they:
1. Circle around the player at a distance
2. Only attack when the player comes within range
3. Stand their ground waiting for the player to approach

---

## Root Cause Analysis

### The Core Issue: Positioning vs Chase Mode Logic

**File: `js/systems/enemy-ai.js`**

The enemy AI uses a two-phase approach in `_executeMeleePositioning()` (lines 663-741):

1. **CHASE MODE** (dist > chase threshold): Move directly toward target
2. **POSITIONING MODE** (dist <= chase threshold): Try to reach an "ideal position" at a specific angle

**Critical Parameters:**
- `chase threshold = Math.max(atkRange + 3, 4)` = **4 tiles** for melee (atkRange=1)
- `engagementDistance = Math.max(0.6, atkRange * 0.75)` = **0.75 tiles** for melee

### Why Circling Occurs

When an enemy is within 4 tiles of the player, they exit chase mode and enter positioning mode. In positioning mode:

1. Enemy calculates an "ideal position" at `engagementDistance` (0.75 tiles) from the player at their assigned `circleAngle`
2. Enemy tries to move to this ideal position via `_moveToward(idealX, idealY)`
3. If the path is blocked (by walls, other enemies, or player collision), `_tryAltMove()` is called
4. **`_tryAltMove()` only moves if the alternative direction brings them CLOSER to the ideal position** - not closer to the player

**Key problem in `_tryAltMove()` (lines 1376-1398):**
```javascript
if (this._distXY(nx, ny, tx, ty) < curDist) {  // tx, ty = ideal position, NOT player
    this._startMove(nx, ny, speedMult);
    return;
}
```

This means if no tile brings them closer to their "ideal position," **they don't move at all**.

### The Circling Behavior (lines 723-732)

When enemies ARE in their ideal position (distToIdeal < 0.4):
```javascript
// In position - slowly orbit to keep movement dynamic
this.circleAngle += 0.0008 * dt * this.strafeDirection;
```

This causes the circling pattern described by the user.

### The Fallback Logic is Too Weak

There IS a fallback (lines 716-722):
```javascript
// FALLBACK: If positioning failed AND we're not in attack range,
// try direct chase toward target instead.
if (!wasMoving && !this.enemy.isMoving && dist > atkRange) {
    this._moveToward(this.target.gridX, this.target.gridY, game, speedMult);
}
```

**Problem:** This fallback also uses `_moveToward`, which has the same `_tryAltMove` limitation - it won't move if it can't get closer. And the fallback only triggers when `dist > atkRange` (dist > 1 for melee), which means at very close distances it doesn't trigger.

### Additional Contributing Factors

1. **Attack token limit**: Only 2-3 enemies can attack simultaneously (`maxAttackers`). Others must wait and position.

2. **Enemy collision avoidance** (`_canMove()`, lines 1441-1451): Enemies avoid tiles occupied by other enemies, creating traffic jams.

3. **Player tile blocking** (line 1455): `if (p.gridX === x && p.gridY === y) return false` - enemies can't move into player's tile.

---

## Solution Approach

### Fix 1: Increase Chase Threshold for ALL Enemies
**Why:** Enemies switch to positioning mode too early (at 4 tiles). They should chase more aggressively.

**Change:** Increase chase threshold from `atkRange + 3` to `atkRange + 5` (6 tiles for melee, ~9 for ranged).

**File:** `js/systems/enemy-ai.js`, lines 257-269 (`_getChaseThreshold` method)

### Fix 2: Increase Engagement Distance for Melee
**Why:** `engagementDistance = 0.75` is too close. Melee enemies try to overlap with the player.

**Change:** Set `engagementDistance = Math.max(1.0, atkRange)` - at least 1 tile for melee.

**File:** `js/systems/enemy-ai.js`, line 670 in `_executeMeleePositioning`

### Fix 3: Make Movement Fallback More Aggressive
**Why:** When positioning fails, enemies should always try to close distance, not give up.

**Change:** Add a "forced chase" function that tries ANY direction that gets closer to target.

**File:** `js/systems/enemy-ai.js`, new `_moveTowardForced()` method + fallback logic

### Fix 4: Eliminate Circling When Not In Attack Range
**Why:** Per user request - relentless chase, no circling unless actively attacking.

**Change:** Remove orbiting behavior entirely when `dist > atkRange`. Only allow circling when in attack range AND waiting for attack cooldown.

**File:** `js/systems/enemy-ai.js`, lines 723-732 in `_executeMeleePositioning`

### Fix 5: Fix Ranged Enemy Positioning
**Why:** User wants both melee AND ranged enemies to actively pursue.

**Change:** In `_executeRangedPositioning`, ensure ranged enemies actively close distance when beyond their attack range. Remove strafing/kiting when player is too far.

**File:** `js/systems/enemy-ai.js`, lines 813-877 (`_executeRangedPositioning` method)

---

## Files to Modify

| File | Lines | Change |
|------|-------|--------|
| `js/systems/enemy-ai.js` | 257-269 | Increase chase threshold for all enemies |
| `js/systems/enemy-ai.js` | 670 | Increase engagement distance for melee |
| `js/systems/enemy-ai.js` | 695-734 | Rewrite melee positioning for relentless chase |
| `js/systems/enemy-ai.js` | 813-877 | Rewrite ranged positioning for aggressive pursuit |
| `js/systems/enemy-ai.js` | ~1400 (new) | Add `_moveTowardForced()` method |

---

## Detailed Implementation

### Change 1: Increase Chase Threshold (lines 257-269)

```javascript
// BEFORE
_getChaseThreshold(atkRange) {
    const baseThreshold = Math.max(atkRange + 3, 4);
    // ...
}

// AFTER
_getChaseThreshold(atkRange) {
    // Increased from +3 to +5 for more aggressive chasing
    // Melee: threshold = 6, Ranged (range 4): threshold = 9
    const baseThreshold = Math.max(atkRange + 5, 6);
    // ...
}
```

### Change 2: Increase Engagement Distance (line 670)

```javascript
// BEFORE
const engagementDistance = Math.max(0.6, atkRange * 0.75);

// AFTER
// Engagement distance should be AT attack range, not inside it
const engagementDistance = Math.max(1.0, atkRange);
```

### Change 3: Rewrite Melee Positioning for Relentless Chase (lines 663-741)

```javascript
_executeMeleePositioning(dt, game, modifiers) {
    if (!this.target) return;

    const dist = this._dist(this.target.gridX, this.target.gridY);
    const atkRange = this._getEffectiveAttackRange();

    // FIXED: Engagement distance should be AT attack range, not closer
    const engagementDistance = Math.max(1.0, atkRange);

    this._face(this.target.gridX, this.target.gridY);

    // Attack if within range and ready
    if (dist <= atkRange && this.attackCooldown <= 0) {
        if (this.hasAttackToken || this._requestAttackToken()) {
            this._attackDirect(game);
            return;
        }
    }

    if (this.enemy.isMoving) return;

    // RELENTLESS CHASE: If not in attack range, always chase directly
    if (dist > atkRange) {
        const speedMult = this._getEffectiveSpeed(1.0, modifiers);
        const wasMoving = this.enemy.isMoving;
        this._moveToward(this.target.gridX, this.target.gridY, game, speedMult);

        // If normal move failed, try forced move
        if (!wasMoving && !this.enemy.isMoving) {
            this._moveTowardForced(this.target.gridX, this.target.gridY, game, speedMult);
        }
        return;
    }

    // IN ATTACK RANGE: Only now use angle-based positioning to spread out
    if (this.circleAngle === null) {
        this.circleAngle = AIManager.assignCircleAngle(this.enemy);
    }

    const idealX = this.target.gridX + Math.cos(this.circleAngle) * engagementDistance;
    const idealY = this.target.gridY + Math.sin(this.circleAngle) * engagementDistance;
    const distToIdeal = this._distXY(this.enemy.gridX, this.enemy.gridY, idealX, idealY);

    if (distToIdeal > 0.4) {
        this._moveToward(idealX, idealY, game, 0.8);
    }

    // Request attack token while in range
    this.tokenRequestTimer += dt;
    if (this.tokenRequestTimer > 200) {
        this.tokenRequestTimer = 0;
        this._requestAttackToken();
    }
}
```

### Change 4: Rewrite Ranged Positioning for Aggressive Pursuit (lines 813-877)

```javascript
_executeRangedPositioning(dt, game, modifiers) {
    if (!this.target) return;

    const dist = this._dist(this.target.gridX, this.target.gridY);
    const atkRange = this._getEffectiveAttackRange();

    this._face(this.target.gridX, this.target.gridY);

    // Attack if within attack range and ready
    if (dist <= atkRange && this.attackCooldown <= 0) {
        if (this.hasAttackToken || this._requestAttackToken()) {
            this._attackDirect(game);
            return;
        }
    }

    if (this.enemy.isMoving) return;

    // RELENTLESS PURSUIT: If beyond attack range, always chase
    if (dist > atkRange) {
        const speedMult = this._getEffectiveSpeed(0.9, modifiers);
        const wasMoving = this.enemy.isMoving;
        this._moveToward(this.target.gridX, this.target.gridY, game, speedMult);

        // If normal move failed, try forced move
        if (!wasMoving && !this.enemy.isMoving) {
            this._moveTowardForced(this.target.gridX, this.target.gridY, game, speedMult);
        }
        return;
    }

    // IN ATTACK RANGE: Only kite if configured and player too close
    const tooClose = dist < this.optimalRange - this.rangeTolerance;
    if (tooClose && this.canKite) {
        this._moveAwayFrom(this.target.gridX, this.target.gridY, game, 0.9);
    }
    // Otherwise, stand ground and attack when ready
}
```

### Change 5: Add Forced Movement Function

Add a new method that tries ANY direction that gets closer to the target:

```javascript
_moveTowardForced(tx, ty, game, speedMult = 1.0) {
    if (this.enemy.isMoving) return;

    const dirs = [
        {x:0,y:-1}, {x:1,y:0}, {x:0,y:1}, {x:-1,y:0},
        {x:1,y:-1}, {x:1,y:1}, {x:-1,y:1}, {x:-1,y:-1}
    ];

    const curDist = this._dist(tx, ty);
    let bestDir = null;
    let bestDist = curDist;

    // Find ANY direction that gets us closer to target
    for (const d of dirs) {
        const nx = this.enemy.gridX + d.x;
        const ny = this.enemy.gridY + d.y;

        if (!this._canMove(nx, ny, d.x, d.y, game)) continue;
        if (this._shouldAvoidHazard(nx, ny, game)) continue;

        const newDist = this._distXY(nx, ny, tx, ty);
        if (newDist < bestDist) {
            bestDist = newDist;
            bestDir = d;
        }
    }

    if (bestDir) {
        const nx = this.enemy.gridX + bestDir.x;
        const ny = this.enemy.gridY + bestDir.y;
        this._face(nx, ny);
        this._startMove(nx, ny, speedMult);
    }
}
```

---

## Verification Plan

1. **Test Melee Enemy Chase:**
   - Enter dungeon, find melee enemies (Goblins, Skeletons)
   - Position player 3-5 tiles away from an enemy
   - **Expected:** Enemy immediately and relentlessly approaches player
   - **Expected:** No circling behavior until enemy is in attack range
   - **Expected:** Enemy attacks when in range

2. **Test Ranged Enemy Chase:**
   - Find ranged enemies (Imp Firebolt, Arcane Wisp)
   - Position player beyond their attack range (6+ tiles)
   - **Expected:** Ranged enemy actively closes distance
   - **Expected:** Once in range, enemy attacks
   - **Expected:** Enemy only kites if player gets too close (within 2 tiles)

3. **Test Multiple Enemies:**
   - Aggro 3-4 melee enemies at once
   - **Expected:** All enemies actively approach (no mass circling)
   - **Expected:** At least 2 attack while others continue approaching

4. **Test Blocked Paths:**
   - Position player in a narrow corridor
   - Spawn enemies on both sides
   - **Expected:** Enemies approach from both directions
   - **Expected:** No getting stuck or giving up

5. **Test Edge Cases:**
   - Player against a wall: enemies should approach from available sides
   - Player in corner: enemies should stack up trying to reach

---

## Summary of Changes

| Change | Impact |
|--------|--------|
| Increase chase threshold to `atkRange + 5` | Enemies chase longer before positioning |
| Set melee engagement distance to `1.0` | Melee enemies stop at proper attack range |
| Remove circling when `dist > atkRange` | Eliminates circling behavior per user request |
| Add `_moveTowardForced()` fallback | Ensures enemies always try to close distance |
| Simplify ranged positioning | Ranged enemies chase when beyond attack range |

---

## Additional Findings from Deep Analysis

### Potential Secondary Issue: isMoving Flag Stuck

The explore agents identified a potential secondary issue where the `isMoving` flag could get stuck as `true`:

**File:** `js/systems/enemy-ai.js`

**Movement Gate Check (lines 1325, 1343):**
```javascript
_moveToward(tx, ty, game, speedMult = 1.0) {
    if (this.enemy.isMoving) return;  // BLOCKS ALL MOVEMENT IF TRUE
    ...
}
```

**Movement Reset (lines 2210-2217):**
```javascript
if (e.moveProgress >= 1.0) {
    e.gridX = e.targetGridX;
    e.gridY = e.targetGridY;
    e.isMoving = false;  // Should reset here
    e.moveProgress = 0;
}
```

If `moveProgress` never reaches 1.0, or if the movement update system is skipped, the enemy would be permanently stuck.

### Circle Angle Assignment System

**File:** `js/systems/enemy-ai.js` (lines 2058-2081)

The AIManager distributes enemies around the player using angle assignment:
```javascript
assignCircleAngle(enemy) {
    const usedAngles = Array.from(this.circleAngles.values());
    // Tries 8 angles (0°, 45°, 90°, etc.) and picks furthest from used
    for (let i = 0; i < 8; i++) {
        const testAngle = (i / 8) * Math.PI * 2;
        // ... finds best unused angle
    }
    this.circleAngles.set(enemy.id, bestAngle);
    return bestAngle;
}
```

This system intentionally spreads enemies around the player, which can cause circling when multiple enemies are present.

### Enemy Separation Forces

**File:** `js/systems/movement-master.js` (lines 942-982)

Enemies have separation forces that push them apart:
- `separationRadius: 1.2` tiles
- `separationStrength: 2.5` multiplier

These forces can cause orbital patterns when combined with the positioning system.

---

## Debugging Checklist

1. **Verify `isMoving` resets properly:**
   - Add logging at line 2217 when `isMoving` is set to false
   - Check if movement update system is running

2. **Check chase mode state:**
   - Log `isInChaseMode` state changes (lines 281-284)
   - Verify threshold calculations

3. **Monitor positioning behavior:**
   - Log when `_executeMeleePositioning()` returns early (line 689)
   - Track `engagementDistance` and `distToIdeal` values

4. **Test with single enemy:**
   - Remove multi-enemy circling by testing with one enemy
   - Verify basic chase behavior works

---

## Related Files Reference

- **Main AI System:** `js/systems/enemy-ai.js` - Contains EnemyAI class, AIManager, state machine
- **Monster Data:** `js/data/monsters-data.js` - Monster definitions with attackRange values
- **Monster Tiers:** `js/data/monster-tiers.js` - AI configuration per tier
- **Movement System:** `js/systems/movement-master.js` - Low-level pathfinding and collision
- **Combat System:** `js/systems/combat-master.js` - Combat engagement tracking
