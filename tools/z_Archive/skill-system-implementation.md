# Skill System — Implementation Spec v2.0

> **Purpose:** This document defines all changes to the player skill progression system. It supersedes the existing skill-system.js implementation. All line references are to the current codebase prior to these changes.

---

## Summary of Changes

| Area | Old | New |
|------|-----|-----|
| Proficiencies | 5 (Melee, Ranged, Magic, Defense, Vitality) | 3 (Melee, Ranged, Magic) |
| Level cap | 100 | 30 |
| XP curve | `100 × (level+1)^1.5` | Piecewise (fast 1–5, steep 6–30) |
| Damage formula | Multiplicative (up to 26.1x) | Additive (up to 4.0x) |
| Action scaling | Separate third multiplier | Folded into specialty bonus |
| Expertise specialties | 4 (Traps, Potions, Lockpicking, Tinkering) | Removed |
| Expertise actions | 4 (Spike Trap, Volatile Flask, Expose Weakness, Deploy Turret) | Removed |
| Action bar slots | Dash, Torch, Consumable ×2 | Dash, Weapon Action ×2, Consumable |
| Naming | Mixed "specialization"/"specialty" | Standardized to "specialty" |
| Defense/Vitality | XP-based proficiencies | Removed (handled by equipment and floor scaling) |

---

## 1. SKILL_CONFIG

Replace the existing `SKILL_CONFIG` block (lines 16–44 of `skill-system.js`) with:

```javascript
const SKILL_CONFIG = {
    // Level caps
    proficiencyCap: 30,
    specialtyCap: 30,

    // Damage bonuses (ADDITIVE, not multiplicative)
    proficiencyBonusPerLevel: 0.05,   // +5% per proficiency level
    specialtyBonusPerLevel: 0.05,     // +5% per specialty level

    // XP curve
    xpEarlyBase: 25,                  // Levels 1-5: base multiplier
    xpLateMultiplier: 15,             // Levels 6-30: coefficient
    xpLateExponent: 1.8,             // Levels 6-30: exponent
    xpEarlyThreshold: 5,             // Level at which curve switches

    // Actions
    actionUnlockLevel: 5,            // Specialty level to unlock weapon action
    defaultCooldown: 10000,          // 10 seconds (milliseconds)
};
```

### Removed Keys (delete all references)
- `proficiencyBonusPerLevel: 0.02` → replaced with `0.05`
- `specializationCap` → renamed to `specialtyCap`
- `specializationBonusPerLevel` → renamed to `specialtyBonusPerLevel`
- `xpCurveBase` → replaced by `xpEarlyBase` and `xpLateMultiplier`
- `xpCurveExponent` → replaced by `xpLateExponent`
- `actionScalingPerLevel` → removed entirely (folded into specialty bonus)
- `xpSplitProficiency` → removed (was never defined)
- `xpSplitSpecialty` → removed (was never defined)

---

## 2. Proficiency Definitions

### Remove: Defense and Vitality

Delete the `defense` and `vitality` proficiency definitions entirely (previously lines 104–128 of `skill-system.js`). Remove all associated XP award calls:

- `awardDefenseXp()` in `combat-master.js` (line 2035–2036) — delete
- `awardDefenseXp()` in `combat-system.js` (line 656–657) — delete
- `awardVitalityXp()` in `items.js` (line 359–370) — delete

### Surviving Proficiencies (3 total)

| Proficiency | Key | Icon | Color | XP Source |
|-------------|-----|------|-------|-----------|
| Melee Combat | `melee` | M | `#c0392b` | Melee damage dealt |
| Ranged Combat | `ranged` | R | `#27ae60` | Ranged damage dealt |
| Arcane Arts | `magic` | A | `#9b59b6` | Magic damage dealt |

### Proficiency Bonuses (per level)

| Proficiency | Primary Bonus | Secondary Bonus |
|-------------|---------------|-----------------|
| Melee | +5% damage | +0.3% crit chance |
| Ranged | +5% damage | +0.5% accuracy |
| Magic | +5% damage | -0.5% mana cost |

### Max Level (30) Bonuses

| Proficiency | At Level 30 |
|-------------|-------------|
| Melee | +150% damage, +9% crit |
| Ranged | +150% damage, +15% accuracy |
| Magic | +150% damage, -15% mana cost |

---

## 3. Specialty Definitions

### Remove: All Expertise Specialties

Delete these specialty definitions and all associated logic:

| Removed Specialty | Removed Action |
|-------------------|----------------|
| Traps | Spike Trap |
| Potions | Volatile Flask |
| Lockpicking | Expose Weakness |
| Tinkering | Deploy Turret |

### Surviving Specialties (18 total)

#### Melee Specialties (8)

| Specialty | Key | Proficiency | Bonus/Level | Secondary Bonus |
|-----------|-----|-------------|-------------|-----------------|
| Sword | `sword` | melee | +5% damage | +0.4% parry chance |
| Knife | `knife` | melee | +5% damage | +0.6% crit, +0.3% attack speed |
| Axe | `axe` | melee | +5% damage | +0.5% armor penetration |
| Polearm | `polearm` | melee | +5% damage | +1 reach at levels 10, 20 |
| Mace | `mace` | melee | +5% damage | +0.6% stun, +0.3% armor pen |
| Staff | `staff` | melee | +5% damage | +0.5% AoE bonus |
| Unarmed | `unarmed` | melee | +5% damage | +0.5% attack speed, +0.4% combo |
| Shield | `shield` | melee | +5% damage | +0.6% block, +0.4% knockback |

> **Note — Unarmed:** Previously had +3% damage per level (outlier). Now normalized to +5% like all others. Starts unlocked at level 1. All other specialties unlock on first XP gain.

> **Note — Polearm reach thresholds:** Previously at levels 25 and 50. Adjusted to 10 and 20 to fit the new 30-level cap.

#### Magic Specialties (11)

| Specialty | Key | Proficiency | Bonus/Level | Secondary Bonus |
|-----------|-----|-------------|-------------|-----------------|
| Fire | `fire` | magic | +5% damage | +0.5% burn, +0.3% burn duration |
| Ice | `ice` | magic | +5% damage | +0.4% freeze, +0.5% slow potency |
| Lightning | `lightning` | magic | +5% damage | +1 chain at 8/16/24, +0.3% chain retention |
| Necromancy | `necromancy` | magic | +5% damage | +0.4% lifesteal, +0.5% undead damage |
| Water | `water` | magic | +5% damage | +0.3% AoE radius, +0.4% debuff duration |
| Earth | `earth` | magic | +5% damage | +0.4% stagger, +0.3% armor bonus |
| Nature | `nature` | magic | +5% damage | +0.5% poison, +0.4% healing bonus |
| Dark | `dark` | magic | +5% damage | +0.5% stealth, +0.4% debuff potency |
| Holy | `holy` | magic | +5% damage | +0.5% healing, +0.6% undead damage |
| Arcane | `arcane` | magic | +5% damage | +0.5% magic pen, +0.3% spell power |
| Death | `death` | magic | +5% damage | +0.3% lifesteal, +0.4% execute bonus |

> **Note — Lightning chain thresholds:** Previously at 20/40/60. Adjusted to 8/16/24 for the new 30-level cap.

#### Ranged Specialties (3)

| Specialty | Key | Proficiency | Bonus/Level | Secondary Bonus |
|-----------|-----|-------------|-------------|-----------------|
| Bow | `bow` | ranged | +5% damage | +0.5% crit, +0.3% crit damage |
| Crossbow | `crossbow` | ranged | +5% damage | +0.7% armor pen, +0.4% pierce |
| Throwing | `throwing` | ranged | +5% damage | +1 projectile at 10/20, +0.3% spread |

> **Note — Throwing projectile thresholds:** Previously at 25/50. Adjusted to 10/20.

---

## 4. XP & Leveling

### XP Curve Formula

Replace the existing `getXpForNextLevel()` function (lines 1036–1038) with:

```javascript
/**
 * Piecewise XP curve:
 * - Levels 1-5: Fast linear ramp to quickly unlock weapon action
 * - Levels 6-30: Power curve for meaningful progression
 */
function getXpForNextLevel(currentLevel) {
    if (currentLevel < SKILL_CONFIG.xpEarlyThreshold) {
        // Levels 0→1 through 4→5: 50, 75, 100, 125, 150
        return SKILL_CONFIG.xpEarlyBase * (currentLevel + 2);
    }
    // Levels 5→6 through 29→30: steep power curve
    return Math.floor(
        SKILL_CONFIG.xpLateMultiplier * Math.pow(currentLevel + 1, SKILL_CONFIG.xpLateExponent)
    );
}
```

### Complete XP Table

```
┌───────────┬────────────┬────────────┬─────────────────────────────────┐
│   Level   │ XP to Next │ Cumulative │             Notes               │
├───────────┼────────────┼────────────┼─────────────────────────────────┤
│   0 → 1   │         50 │         50 │ ~2 kills                        │
│   1 → 2   │         75 │        125 │                                 │
│   2 → 3   │        100 │        225 │                                 │
│   3 → 4   │        125 │        350 │                                 │
│   4 → 5   │        150 │        500 │ ★ ACTION UNLOCKS (floors 1-2)   │
├───────────┼────────────┼────────────┼─────────────────────────────────┤
│   5 → 6   │        377 │        877 │ Curve steepens here             │
│   6 → 7   │        498 │      1,375 │                                 │
│   7 → 8   │        633 │      2,008 │                                 │
│   8 → 9   │        783 │      2,791 │                                 │
│   9 → 10  │        946 │      3,737 │                                 │
├───────────┼────────────┼────────────┼─────────────────────────────────┤
│  10 → 11  │      1,124 │      4,861 │                                 │
│  11 → 12  │      1,314 │      6,175 │                                 │
│  12 → 13  │      1,517 │      7,692 │                                 │
│  13 → 14  │      1,734 │      9,426 │                                 │
│  14 → 15  │      1,961 │     11,387 │ ★ GOOD RUN PEAK (floors 8-10)   │
├───────────┼────────────┼────────────┼─────────────────────────────────┤
│  15 → 16  │      2,202 │     13,589 │                                 │
│  16 → 17  │      2,454 │     16,043 │                                 │
│  17 → 18  │      2,718 │     18,761 │                                 │
│  18 → 19  │      2,994 │     21,755 │                                 │
│  19 → 20  │      3,282 │     25,037 │ ★ EXCEPTIONAL RUN               │
├───────────┼────────────┼────────────┼─────────────────────────────────┤
│  20 → 21  │      3,582 │     28,619 │                                 │
│  21 → 22  │      3,894 │     32,513 │                                 │
│  22 → 23  │      4,218 │     36,731 │                                 │
│  23 → 24  │      4,554 │     41,285 │                                 │
│  24 → 25  │      4,902 │     46,187 │ ★ ASPIRATIONAL                  │
├───────────┼────────────┼────────────┼─────────────────────────────────┤
│  25 → 26  │      5,261 │     51,448 │                                 │
│  26 → 27  │      5,633 │     57,081 │                                 │
│  27 → 28  │      6,017 │     63,098 │                                 │
│  28 → 29  │      6,412 │     69,510 │                                 │
│  29 → 30  │      6,822 │     76,332 │ ★ THEORETICAL CAP               │
└───────────┴────────────┴────────────┴─────────────────────────────────┘
```

### Expected Progression Per Run

Based on 10 floors, ~500 kills, ~25 XP per kill, ~12,500 XP per run:

| Run Phase | Floors | XP Earned | Proficiency Level | Specialty Level | Damage Multiplier |
|-----------|--------|-----------|-------------------|-----------------|-------------------|
| Early | 1–2 | ~2,500 | 5–6 | 5–6 | 1.50–1.60x |
| Mid | 3–5 | ~3,750 | 9–10 | 9–10 | 1.90–2.00x |
| Late | 6–8 | ~3,750 | 12–13 | 12–13 | 2.20–2.30x |
| Final | 9–10 | ~2,500 | 14–16 | 14–16 | 2.40–2.60x |

> **Design intent:** Player unlocks weapon action in floors 1–2. Power ramps meaningfully through mid-run. A full focused run peaks around level 15 (~2.5x damage). Level 20+ requires exceptional efficiency or extended runs. Level 30 is a theoretical cap that communicates "there's always room to grow."

### XP Award Functions

**No changes to the XP ratio.** Retain `floor(damage × 0.5)` for all sources.

**Critical: Cap XP at effective damage.** XP should be based on actual HP removed, not raw damage dealt. This prevents the snowball where higher damage → more overkill XP → faster leveling.

```javascript
// BEFORE (snowball-prone):
function awardMeleeXp(player, damage) {
    const xp = Math.floor(damage * 0.5);
    addProficiencyXp(player, 'melee', xp);
}

// AFTER (capped at effective damage):
function awardMeleeXp(player, damage, targetCurrentHp) {
    const effectiveDamage = Math.min(damage, targetCurrentHp);
    const xp = Math.floor(effectiveDamage * 0.5);
    addProficiencyXp(player, 'melee', xp);
}
```

Apply to all XP award functions: `awardMeleeXp`, `awardRangedXp`, `awardMagicXp`.

**XP goes to both proficiency and specialty independently.** No splitting. Dealing 50 damage with a sword awards 25 XP to Melee proficiency AND 25 XP to Sword specialty. Both level at the same rate when using a single weapon type.

```javascript
// XP award call site pattern:
const effectiveDamage = Math.min(damage, target.hp);
const xp = Math.floor(effectiveDamage * 0.5);
awardProficiencyXp(player, proficiencyId, xp);      // e.g., 'melee'
awardSpecialtyXp(player, specialtyId, xp);           // e.g., 'sword'
```

### Specialty XP on Weapon Switch

If a player switches weapons mid-run (e.g., sword → axe), their Melee proficiency XP continues accumulating but their specialty XP splits between Sword and Axe. This is the intended behavior — specializing in one weapon rewards focus, while the proficiency still benefits all melee weapons.

---

## 5. Damage Formula

### Replace: Multiplicative → Additive

Replace `getSkillDamageMultiplier()` (lines 1296–1309) with:

```javascript
/**
 * ADDITIVE damage multiplier from skills.
 * Max: 1 + (30 × 0.05) + (30 × 0.05) = 4.0x
 *
 * @param {Object} player
 * @param {string} proficiencyId - 'melee', 'ranged', or 'magic'
 * @param {number} specLevel - current specialty level
 * @returns {number} multiplier (1.0 to 4.0)
 */
function getSkillDamageMultiplier(player, proficiencyId, specLevel = 0) {
    const profLevel = player.skills.proficiencies[proficiencyId]?.level || 0;
    const profBonus = profLevel * SKILL_CONFIG.proficiencyBonusPerLevel;
    const specBonus = specLevel * SKILL_CONFIG.specialtyBonusPerLevel;

    return 1 + profBonus + specBonus;
}
```

### Multiplier Reference Table

| Prof Level | Spec Level | Multiplier | Power Feel |
|------------|------------|------------|------------|
| 0 | 0 | 1.00x | Baseline |
| 5 | 5 | 1.50x | Action just unlocked |
| 10 | 10 | 2.00x | Solid mid-run |
| 15 | 15 | 2.50x | Strong (good run peak) |
| 20 | 20 | 3.00x | Very strong |
| 25 | 25 | 3.50x | Near mastery |
| 30 | 30 | 4.00x | Theoretical max |

### Remove: Action Scaling Layer

Delete the `actionScaling` variable from `calculateActionDamage()` (lines 1250–1265). The old formula had three multipliers; the new one has one:

```javascript
// OLD (three multiplicative layers):
// const profBonus = 1 + (proficiencyLevel * 0.02);
// const specBonus = 1 + (specialtyLevel * 0.02);
// const actionScaling = 1 + ((specialtyLevel - 5) * 0.02);
// return Math.floor(baseWeaponDamage * profBonus * specBonus * actionScaling);

// NEW (single additive multiplier):
function calculateActionDamage(player, action, specialtyLevel, proficiencyLevel) {
    const baseWeaponDamage = player.equipped?.MAIN?.damage || 10;
    const skillMultiplier = getSkillDamageMultiplier(player, action.proficiency, specialtyLevel);
    return Math.floor(baseWeaponDamage * skillMultiplier * action.damageMultiplier);
}
```

Where `action.damageMultiplier` is the action's inherent multiplier (e.g., 1.8 for Power Shot's 180%, 1.2 for Blade Dancer's 120%).

### Full Damage Pipeline (Revised)

```
Final Damage =
    Base Weapon Damage
    × Stat Multiplier (1 + STR × 0.03)
    × Skill Multiplier (1 + profLevel × 0.05 + specLevel × 0.05)
    × Action Multiplier (varies per action, e.g., 1.8 for Power Shot)
    × Critical Multiplier (1.5x if crit)
    × Elemental Modifier (if applicable)
    × Damage Amplification (marks/debuffs)
    - Defense (with penetration)
    × Variance (0.95 to 1.05)
```

Note there are now **two** multiplicative layers that scale with player progression (stat multiplier and skill multiplier) instead of four. This produces a much flatter power curve.

---

## 6. Action Definitions

### Remove: Expertise Actions

Delete these action definitions and all execution logic:

- `spike_trap` (Traps specialty)
- `volatile_flask` (Potions specialty)
- `expose_weakness` (Lockpicking specialty)
- `deploy_turret` (Tinkering specialty)

### Surviving Actions (15 total)

#### Melee Actions (8)

| Action ID | Name | Specialty | Damage | Mechanics | Cooldown |
|-----------|------|-----------|--------|-----------|----------|
| `blade_dancer` | Blade Dancer | sword | 120% (2×60%) | 2 rapid strikes | 10s |
| `arterial_strike` | Arterial Strike | knife | 200% (80% + 3×40%) | 6s bleed | 10s |
| `cleaving_blow` | Cleaving Blow | axe | 150% | 50% armor pen | 10s |
| `impaling_thrust` | Impaling Thrust | polearm | 130%/target | 2-tile line, max 3 | 10s |
| `skull_crack` | Skull Crack | mace | 130% | 2s stun | 10s |
| `sweeping_arc` | Sweeping Arc | staff | 100%/target | 8 adjacent tiles | 10s |
| `flurry_of_blows` | Flurry of Blows | unarmed | 150% (5×30%) | 5 rapid strikes | 10s |
| `shield_charge` | Shield Charge | shield | 120% | 2-tile charge + 2-tile knockback | 10s |

#### Magic Actions (4)

| Action ID | Name | Specialty | Damage | Mechanics | Cooldown |
|-----------|------|-----------|--------|-----------|----------|
| `immolate` | Immolate | fire | 210% (60% + 5×30%) | 10s burn | 10s |
| `frozen_grasp` | Frozen Grasp | ice | 100% | 3s freeze | 10s |
| `chain_lightning` | Chain Lightning | lightning | 220% (100%+70%+50%) | 2 bounces | 10s |
| `life_siphon` | Life Siphon | necromancy | 120% | Heal 50% dealt | 10s |

#### Ranged Actions (3)

| Action ID | Name | Specialty | Damage | Mechanics | Cooldown |
|-----------|------|-----------|--------|-----------|----------|
| `power_shot` | Power Shot | bow | 180% | +20% crit chance | 10s |
| `piercing_bolt` | Piercing Bolt | crossbow | 130%/target | 75% armor pen, 2 pierce | 10s |
| `fan_of_knives` | Fan of Knives | throwing | 80%/target | 90° cone, max 5 | 10s |

> **Note:** 7 magic specialties (Water, Earth, Nature, Dark, Holy, Arcane, Death) and no ranged specialties (Firearms, if it existed) currently have NO weapon action. These are candidates for future action design. For now, these specialties contribute passive bonuses only.

---

## 7. Action Bar

### New Layout (4 slots)

Replace the current action bar layout in `action-bar-ui.js` (lines 293–357).

```
┌─────────┬──────────────────┬──────────────────┬──────────────┐
│  DASH   │  WEAPON ACTION   │  WEAPON ACTION   │  CONSUMABLE  │
│ (Space) │   (Main Hand)    │   (Off Hand)     │     (1)      │
│ Slot 0  │     Slot 1       │     Slot 2       │    Slot 3    │
└─────────┴──────────────────┴──────────────────┴──────────────┘
```

| Slot | Function | Hotkey | Source |
|------|----------|--------|--------|
| 0 | Dash | Space | Unchanged |
| 1 | Weapon Action (MAIN) | Q | Auto-populated from equipped main-hand weapon |
| 2 | Weapon Action (OFF) | E | Auto-populated from equipped off-hand weapon |
| 3 | Consumable | 1 | Player-assigned consumable item |

### Removed from Bar

**Torch Toggle** — move to standalone keybind (T key). Display torch state via the existing light/dark indicator on the sidebar (`icon-sidebar.js`, near the flame animation element). No action bar slot needed.

**Consumable 2 (Hotkey 2)** — removed. One consumable slot is sufficient.

### Auto-Population Logic

```javascript
/**
 * Determines what action to display in weapon action slots.
 * Called on: weapon equip, weapon unequip, specialty level-up.
 */
function updateWeaponActionSlots(player) {
    // Slot 1: Main hand
    const mainWeapon = player.equipped?.MAIN;
    if (mainWeapon && mainWeapon.specialty) {
        const specLevel = player.skills.specialties[mainWeapon.specialty]?.level || 0;
        const action = getActionForSpecialty(mainWeapon.specialty);
        if (action && specLevel >= SKILL_CONFIG.actionUnlockLevel) {
            setSlotAction(1, action.id, 'ready');
        } else if (action) {
            setSlotAction(1, action.id, 'locked', {
                requiredLevel: SKILL_CONFIG.actionUnlockLevel,
                currentLevel: specLevel
            });
        } else {
            setSlotAction(1, null, 'disabled');
        }
    } else {
        setSlotAction(1, null, 'disabled');
    }

    // Slot 2: Off hand
    const offWeapon = player.equipped?.OFF;
    if (offWeapon && offWeapon.specialty) {
        const specLevel = player.skills.specialties[offWeapon.specialty]?.level || 0;
        const action = getActionForSpecialty(offWeapon.specialty);
        if (action && specLevel >= SKILL_CONFIG.actionUnlockLevel) {
            setSlotAction(2, action.id, 'ready');
        } else if (action) {
            setSlotAction(2, action.id, 'locked', {
                requiredLevel: SKILL_CONFIG.actionUnlockLevel,
                currentLevel: specLevel
            });
        } else {
            setSlotAction(2, null, 'disabled');
        }
    } else {
        setSlotAction(2, null, 'disabled');
    }
}
```

### New Slot State: `locked`

Add to the existing slot state system in `action-bar-ui.js`:

| State | Border Color | Glow | Icon | Use Case |
|-------|-------------|------|------|----------|
| `ready` | Green/Cyan | Yes | Action icon | Available to use |
| `active` | Bright Green | Yes | Action icon | Currently executing |
| `cooldown` | Orange | No | Sweep overlay | On cooldown |
| `gcd` | Orange | No | Sweep overlay | Global cooldown |
| `outOfAmmo` | Red | Red | Action icon | Resource depleted |
| `disabled` | Dark Gray | No | Empty/dash | No weapon in slot |
| **`locked`** | **Dark Gray** | **No** | **Lock icon + "Lv.5"** | **Specialty below unlock level** |

The `locked` state should display:
- A small lock icon (centered)
- The text "Lv.5" below the lock
- The action's icon dimmed/desaturated behind the lock

When the player reaches specialty level 5, the slot transitions from `locked` → `ready` with a brief glow/pulse animation to signal the unlock.

---

## 8. Player Skills Data Structure

### Updated `createFreshSkills()`

Replace the existing function (lines 1404–1445) with:

```javascript
function createFreshSkills() {
    return {
        proficiencies: {
            melee:  { level: 0, xp: 0, xpToNext: getXpForNextLevel(0) },
            ranged: { level: 0, xp: 0, xpToNext: getXpForNextLevel(0) },
            magic:  { level: 0, xp: 0, xpToNext: getXpForNextLevel(0) },
            // defense and vitality REMOVED
        },
        specialties: {
            // Melee
            sword:    { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            knife:    { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            axe:      { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            polearm:  { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            mace:     { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            staff:    { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            unarmed:  { level: 1, xp: 0, xpToNext: getXpForNextLevel(1), unlocked: true },
            shield:   { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            // Magic
            fire:       { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            ice:        { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            lightning:  { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            necromancy: { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            water:      { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            earth:      { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            nature:     { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            dark:       { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            holy:       { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            arcane:     { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            death:      { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            // Ranged
            bow:      { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            crossbow: { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            throwing: { level: 0, xp: 0, xpToNext: getXpForNextLevel(0), unlocked: false },
            // Expertise REMOVED (traps, potions, lockpicking, tinkering)
        },
        unlockedActions: [],
        actionCooldowns: {}
    };
}
```

---

## 9. Defense & Vitality Replacement

Since Defense and Vitality are no longer proficiencies, their functionality is handled by:

### Defense → Equipment Only

All damage mitigation comes from gear:
- **Armor stat** on equipment → flat damage reduction
- **Shield items** → block chance (percentage based)
- **Dodge** → player movement skill (no stat)

No XP system. No leveling. Player gets tougher by finding better gear during the extraction loop.

### Vitality → Floor Scaling

```javascript
/**
 * Award passive HP bonus when a floor is completed.
 * Called in floor transition logic.
 */
function onFloorComplete(player, floorNumber) {
    const hpBonus = 15; // +15 max HP per floor cleared
    player.maxHp += hpBonus;
    player.hp += hpBonus; // Heal the bonus amount too
    addMessage(`Floor ${floorNumber} cleared! +${hpBonus} max HP`);
}
```

| After Floor | Bonus HP | Total Bonus |
|-------------|----------|-------------|
| 1 | +15 | +15 |
| 2 | +15 | +30 |
| 5 | +15 | +75 |
| 10 | +15 | +150 |

Healing effectiveness is a property of the consumable or spell, not a player stat.

---

## 10. Naming Standardization

### Global Find-and-Replace

Execute these renames across the entire codebase:

| Find | Replace | Files Affected |
|------|---------|----------------|
| `specializationCap` | `specialtyCap` | skill-system.js |
| `specializationBonusPerLevel` | `specialtyBonusPerLevel` | skill-system.js |
| `specialization` (as variable/key) | `specialty` | All files |
| `xpSplitProficiency` | *(delete reference)* | skill-system.js |
| `xpSplitSpecialty` | *(delete reference)* | skill-system.js |
| `actionScalingPerLevel` | *(delete reference)* | skill-system.js |

### Naming Convention

| Term | Meaning | Example |
|------|---------|---------|
| `proficiency` | Parent combat category | `melee`, `ranged`, `magic` |
| `specialty` | Specific weapon or school | `sword`, `fire`, `bow` |
| `action` | Active ability tied to a specialty | `blade_dancer`, `immolate` |

Never use "specialization" anywhere in the codebase.

---

## 11. Character Overlay Updates

Update `character-overlay.js` (lines 175–354) to reflect removed systems.

### Remove from Display
- Defense proficiency bar and stats
- Vitality proficiency bar and stats
- P.DEF and M.DEF attribute rows (these are now purely equipment-derived; show them under equipment stats if needed, not as proficiency-based attributes)

### Update Attributes Section
Show only equipment-derived defensive stats:

| Attribute | Source |
|-----------|--------|
| STR | Base + equipment |
| AGI | Base + equipment |
| INT | Base + equipment |
| STA | Base + equipment |
| Armor | Equipment only |
| Block | Shield equipment only |

---

## 12. Hotkey Summary

### Final Hotkey Map

| Key | Action | System |
|-----|--------|--------|
| Space | Dash | Action bar slot 0 |
| Q | Weapon Action (main hand) | Action bar slot 1 |
| E | Weapon Action (off hand) | Action bar slot 2 |
| 1 | Consumable | Action bar slot 3 |
| T | Torch toggle | Standalone (not on bar) |
| C | Character panel | Sidebar |
| K | Skills panel | Sidebar |
| I or previous E binding | Inventory | Sidebar (rebind if E conflicts) |
| M | Map | Sidebar |
| J | Journal | Sidebar |

> **Note — E key conflict:** The off-hand weapon action now uses E, which was previously Inventory. Rebind Inventory to I or another available key.

---

## 13. Files Affected

| File | Changes |
|------|---------|
| `js/systems/skill-system.js` | SKILL_CONFIG, XP formula, damage formula, proficiency/specialty definitions, action definitions, data structures, remove expertise/defense/vitality |
| `js/ui/action-bar-ui.js` | New slot layout, auto-population logic, locked state, remove torch slot, remove consumable 2 |
| `js/ui/character-overlay.js` | Remove defense/vitality display, update attributes |
| `js/ui/icon-sidebar.js` | No structural changes (torch indicator already exists) |
| `js/utils/damage-calculator.js` | Update to additive formula, remove action scaling layer |
| `js/systems/combat-master.js` | Remove defense XP calls, update XP award signatures |
| `js/systems/combat-system.js` | Remove defense XP calls |
| `js/items.js` | Remove vitality XP calls |
| `js/systems/mouse-attack-system.js` | Update XP award calls with effective damage cap |
| `js/systems/projectile-system.js` | Update XP award calls with effective damage cap |
