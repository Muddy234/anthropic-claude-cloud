# Player Skills System - Comprehensive Deep Analysis

## Executive Summary

The player skills system is a sophisticated **Soul & Body progression model** featuring:
- **5 Proficiencies** (Melee, Ranged, Magic, Defense, Vitality)
- **22 Specialties** (weapon types, magic schools, expertise)
- **19 Weapon Actions** (unlocked at specialty level 5)
- **Run-based progression** (skills reset on death)
- **Multiplicative damage scaling** (up to 9x at max levels)

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Proficiency System](#2-proficiency-system)
3. [Specialty System](#3-specialty-system)
4. [XP & Leveling Mechanics](#4-xp--leveling-mechanics)
5. [Action System](#5-action-system)
6. [Damage Calculation](#6-damage-calculation)
7. [Status Effects](#7-status-effects)
8. [Skill UI System](#8-skill-ui-system)
9. [Code Reference Tables](#9-code-reference-tables)
10. [Balance Analysis](#10-balance-analysis)

---

## 1. Architecture Overview

### Core Files

| File | Lines | Purpose |
|------|-------|---------|
| `js/systems/skill-system.js` | ~1,672 | Core definitions, XP, actions, execution |
| `js/ui/action-bar-ui.js` | ~1,515 | Action bar UI, cooldowns, icons |
| `js/ui/character-overlay.js` | ~700 | Character panel, stats display |
| `js/ui/icon-sidebar.js` | ~950 | Sidebar navigation, resource bars |
| `js/utils/damage-calculator.js` | ~500 | Damage formulas, skill integration |

### Configuration (`skill-system.js` lines 16-44)

```javascript
const SKILL_CONFIG = {
    proficiencyCap: 100,              // Max proficiency level
    specializationCap: 100,           // Max specialty level
    proficiencyBonusPerLevel: 0.02,   // +2% per proficiency level
    specializationBonusPerLevel: 0.02, // +2% per specialty level
    xpCurveBase: 100,                 // Base XP requirement
    xpCurveExponent: 1.5,             // XP scaling exponent
    actionUnlockLevel: 5,             // Specialty level for action unlock
    actionScalingPerLevel: 0.02,      // +2% action damage per level above 5
    defaultCooldown: 10000,           // 10 seconds in milliseconds
};
```

### Player Skills Data Structure

```javascript
player.skills = {
    proficiencies: {
        melee: { level: 0, xp: 0, xpToNext: 100 },
        ranged: { level: 0, xp: 0, xpToNext: 100 },
        magic: { level: 0, xp: 0, xpToNext: 100 },
        defense: { level: 0, xp: 0, xpToNext: 100 },
        vitality: { level: 0, xp: 0, xpToNext: 100 }
    },
    specialties: {
        sword: { level: 0, xp: 0, xpToNext: 100, unlocked: false },
        // ... 22 total specialties
    },
    unlockedActions: [],      // Array of unlocked action IDs
    actionCooldowns: {}       // { actionId: remainingMs }
}
```

---

## 2. Proficiency System

### The 5 Proficiencies (Lines 56-128)

| Proficiency | Icon | Color | XP Source | Specializations |
|-------------|------|-------|-----------|-----------------|
| **Melee Combat** | M | #c0392b (Red) | Melee damage dealt | blade, blunt, polearm, unarmed |
| **Ranged Combat** | R | #27ae60 (Green) | Ranged damage dealt | bow, crossbow, throwing, firearms |
| **Arcane Arts** | A | #9b59b6 (Purple) | Magic damage dealt | fire, ice, lightning, +8 more |
| **Defense** | D | #3498db (Blue) | Damage taken | armor, blocking, dodging, resilience |
| **Vitality** | V | #e74c3c (Orange) | Effective healing | regeneration, constitution, recovery, fortitude |

### Proficiency Bonuses

| Proficiency | Bonus per Level | At Level 100 |
|-------------|-----------------|--------------|
| **Melee** | +2% damage, +0.2% crit | 3.0x damage, +20% crit |
| **Ranged** | +2% damage, +0.3% accuracy | 3.0x damage, +30% accuracy |
| **Magic** | +2% damage, -0.3% mana cost | 3.0x damage, -30% mana cost |
| **Defense** | +0.2% damage reduction, +0.15% block | 20% reduction, +15% block |
| **Vitality** | +2 HP, +0.5% healing effectiveness | +200 HP, +50% healing |

### Bonus Calculation (Lines 1296-1309)

```javascript
function getSkillDamageMultiplier(player, proficiencyId, specLevel = 0) {
    const profLevel = player.skills.proficiencies[proficiencyId]?.level || 0;

    // MULTIPLICATIVE formula
    const profMult = 1 + (profLevel * 0.02);    // 1.0 to 3.0
    const specMult = 1 + (specLevel * 0.02);    // 1.0 to 3.0

    return profMult * specMult;  // 1.0 to 9.0 at max
}
```

---

## 3. Specialty System

### All 22 Specialties (Lines 158-472)

#### Blade Specialties (Melee)
| Specialty | Bonus per Level | Special Bonus |
|-----------|-----------------|---------------|
| **Sword** | +2% damage | +0.4% parry chance |
| **Knife** | +2% damage | +0.6% crit, +0.3% attack speed |
| **Axe** | +2% damage | +0.5% armor penetration |
| **Polearm** | +2% damage | +1 reach at levels 25, 50 |

#### Blunt Specialties (Melee)
| Specialty | Bonus per Level | Special Bonus |
|-----------|-----------------|---------------|
| **Mace** | +2% damage | +0.6% stun, +0.3% armor pen |
| **Staff** | +2% damage | +0.5% AoE bonus |
| **Unarmed** | **+3% damage** | +0.5% attack speed, +0.4% combo |
| **Shield** | +2% damage | +0.6% block, +0.4% knockback |

#### Magic Specialties
| Specialty | Bonus per Level | Special Bonus |
|-----------|-----------------|---------------|
| **Fire** | +2% damage | +0.5% burn, +0.3% burn duration |
| **Ice** | +2% damage | +0.4% freeze, +0.5% slow potency |
| **Lightning** | +2% damage | +1 chain target at 20/40/60, +0.3% chain retention |
| **Necromancy** | +2% damage | +0.4% lifesteal, +0.5% undead damage |
| **Water** | +2% damage | +0.3% AoE radius, +0.4% debuff duration |
| **Earth** | +2% damage | +0.4% stagger, +0.3% armor bonus |
| **Nature** | +2% damage | +0.5% poison, +0.4% healing bonus |
| **Dark** | +2% damage | +0.5% stealth, +0.4% debuff potency |
| **Holy** | +2% damage | +0.5% healing, +0.6% undead damage |
| **Arcane** | +2% damage | +0.5% magic pen, +0.3% spell power |
| **Death** | +2% damage | +0.3% lifesteal, +0.4% execute bonus |

#### Ranged Specialties
| Specialty | Bonus per Level | Special Bonus |
|-----------|-----------------|---------------|
| **Bow** | +2% damage | +0.5% crit, +0.3% crit damage |
| **Crossbow** | +2% damage | +0.7% armor pen, +0.4% pierce |
| **Throwing** | +2% damage | +1 projectile at 25/50, +0.3% spread angle |

#### Expertise Specialties
| Specialty | Bonus per Level | Special Bonus |
|-----------|-----------------|---------------|
| **Traps** | +2% damage | +0.5% trap damage, +1 max trap at 20/40/60 |
| **Potions** | +2% damage | +0.5% potion damage, +0.3% AoE |
| **Lockpicking** | N/A | 25% + 0.5%/level vulnerability, 8s + 0.1s/level duration |
| **Tinkering** | +2% damage | +0.5% turret damage, 15s + 0.2s/level duration |

### Specialty Unlock Mechanics

Specialties unlock **when first XP is gained** (Line 1124):
```javascript
if (!specData.unlocked) {
    specData.unlocked = true;
    console.log(`Unlocked specialty: ${specialtyId}`);
}
```

**Note:** Unarmed starts unlocked at level 1 (Lines 1439-1441)

---

## 4. XP & Leveling Mechanics

### XP Curve Formula (Lines 1036-1038)

```javascript
function getXpForNextLevel(currentLevel) {
    return Math.floor(100 * Math.pow(currentLevel + 1, 1.5));
}
```

### XP Requirements Table

| Level | XP Required | Cumulative | Damage Multiplier |
|-------|-------------|------------|-------------------|
| 0→1 | 100 | 100 | 1.02x |
| 1→2 | 283 | 383 | 1.04x |
| 5→6 | 1,470 | 4,843 | 1.12x |
| 10→11 | 3,644 | 18,621 | 1.22x |
| 25→26 | 13,010 | 110,525 | 1.52x |
| 50→51 | 36,465 | 581,738 | 2.02x |
| 75→76 | 65,804 | 1,343,817 | 2.52x |
| 100 (cap) | N/A | ~2,500,000 | 3.00x |

### XP Award Functions (Lines 1485-1535)

| Function | XP Formula | Source |
|----------|------------|--------|
| `awardMeleeXp()` | `floor(damage × 0.5)` | Melee attacks |
| `awardRangedXp()` | `floor(damage × 0.5)` | Projectile hits |
| `awardMagicXp()` | `floor(damage × 0.5)` | Spell damage |
| `awardDefenseXp()` | `floor(damageTaken × 0.3)` | Taking damage |
| `awardVitalityXp()` | `floor(effectiveHealing × 0.5)` | Healing (no overheal) |

### XP Call Sites in Codebase

| File | Lines | XP Type |
|------|-------|---------|
| `mouse-attack-system.js` | 771-776 | Melee/Ranged/Magic |
| `combat-master.js` | 1442-1445 | Ranged/Magic projectiles |
| `combat-master.js` | 2035-2036 | Defense |
| `combat-system.js` | 656-657 | Defense |
| `projectile-system.js` | 315-318 | Ranged/Magic |
| `items.js` | 359-370 | Vitality (healing) |

### Level-Up Notifications (Lines 1100-1152)

```javascript
// Proficiency level up
console.log(`LEVEL UP! ${profData.name} is now Level ${prof.level}!`);
addMessage(`LEVEL UP! ${profData.name} is now Level ${prof.level}!`);

// Specialty level up
console.log(`LEVEL UP! ${specData.name} is now Level ${spec.level}!`);
addMessage(`LEVEL UP! ${specData.name} is now Level ${spec.level}!`);
```

### Skill Persistence

**CRITICAL: Skills reset completely on death** (Lines 1460-1474)

```javascript
function resetPlayerSkills(player) {
    player.skills = createFreshSkills();
    console.log('[Skills] All skills reset on death');
}
```

---

## 5. Action System

### All 19 Weapon Actions

Actions unlock at **Specialty Level 5** (Lines 1149-1177)

#### Blade Actions

| Action | Specialty | Type | Damage | Mechanics |
|--------|-----------|------|--------|-----------|
| **Blade Dancer** | Sword | Multi-hit | 120% (2×60%) | 2 rapid strikes |
| **Arterial Strike** | Knife | DoT | 200% (80% + 3×40% bleed) | 6s bleed duration |
| **Cleaving Blow** | Axe | Penetrating | 150% | 50% armor penetration |
| **Impaling Thrust** | Polearm | Line AoE | 130% per target | 2-tile range, max 3 targets |

#### Blunt Actions

| Action | Specialty | Type | Damage | Mechanics |
|--------|-----------|------|--------|-----------|
| **Skull Crack** | Mace | CC | 130% | 2-second stun |
| **Sweeping Arc** | Staff | Radial AoE | 100% per target | All 8 adjacent tiles |
| **Flurry of Blows** | Unarmed | Multi-hit | 150% (5×30%) | 5 rapid strikes |
| **Shield Charge** | Shield | Mobility | 120% | 2-tile charge + 2-tile knockback |

#### Magic Actions

| Action | Specialty | Type | Damage | Mechanics |
|--------|-----------|------|--------|-----------|
| **Immolate** | Fire | DoT | 210% (60% + 5×30% burn) | 10s burn duration |
| **Frozen Grasp** | Ice | CC | 100% | 3-second freeze |
| **Chain Lightning** | Lightning | Chain | 220% (100%+70%+50%) | Bounces to 2 additional targets |
| **Life Siphon** | Necromancy | Sustain | 120% | Heal 50% of damage dealt |

#### Ranged Actions

| Action | Specialty | Type | Damage | Mechanics |
|--------|-----------|------|--------|-----------|
| **Power Shot** | Bow | Burst | 180% | +20% bonus crit chance |
| **Piercing Bolt** | Crossbow | Pierce | 130% per target | 75% armor pen, pierces 2 targets |
| **Fan of Knives** | Throwing | Cone AoE | 80% per target | 90° cone, max 5 targets |

#### Expertise Actions

| Action | Specialty | Type | Base Damage | Mechanics |
|--------|-----------|------|-------------|-----------|
| **Spike Trap** | Traps | Placed | 50 (scales) | 50% slow for 3s, max 3 active |
| **Volatile Flask** | Potions | Thrown AoE | 40 (scales) | 4-tile range, 3×3 area |
| **Expose Weakness** | Lockpicking | Debuff | 0 (debuff) | +25-29% damage taken for 8s |
| **Deploy Turret** | Tinkering | Summon | 15 (scales) | Attacks every 2s, 15s+ duration |

### Action Execution Flow (Lines 1216-1245)

```javascript
function useAction(player, actionId, target) {
    // 1. Permission check
    const check = canUseAction(player, actionId);
    if (!check.canUse) return null;

    // 2. Get skill levels
    const specialtyLevel = player.skills.specialties[action.specialty].level;
    const proficiencyLevel = player.skills.proficiencies[action.proficiency].level;

    // 3. Calculate damage
    const actionDamage = calculateActionDamage(player, action, specialtyLevel, proficiencyLevel);

    // 4. Execute
    const result = action.execute(player, target, actionDamage);

    // 5. Start cooldown
    player.skills.actionCooldowns[actionId] = action.cooldown;

    return result;
}
```

### Permission Checks (Lines 1187-1211)

```javascript
function canUseAction(player, actionId) {
    // Gate 1: Is action unlocked?
    if (!player.skills.unlockedActions.includes(actionId)) {
        return { canUse: false, reason: 'Action not unlocked' };
    }

    // Gate 2: Is cooldown ready?
    if (player.skills.actionCooldowns[actionId] > 0) {
        return { canUse: false, reason: 'On cooldown' };
    }

    // Gate 3: Weapon requirement (expertise exempt)
    if (action.requiresWeapon !== false) {
        const equipped = player.equipped?.MAIN;
        if (!equipped || equipped.specialty !== action.specialty) {
            return { canUse: false, reason: 'Requires matching weapon' };
        }
    }

    return { canUse: true };
}
```

### Cooldown System (Lines 1270-1281)

```javascript
function updateActionCooldowns(player, deltaTime) {
    for (const actionId in player.skills.actionCooldowns) {
        if (player.skills.actionCooldowns[actionId] > 0) {
            player.skills.actionCooldowns[actionId] -= deltaTime;
            if (player.skills.actionCooldowns[actionId] < 0) {
                player.skills.actionCooldowns[actionId] = 0;
            }
        }
    }
}
```

---

## 6. Damage Calculation

### Action Damage Formula (Lines 1250-1265)

```javascript
function calculateActionDamage(player, action, specialtyLevel, proficiencyLevel) {
    const baseWeaponDamage = player.equipped?.MAIN?.damage || 10;

    // Multiplicative bonuses
    const profBonus = 1 + (proficiencyLevel * 0.02);   // 1.0 to 3.0
    const specBonus = 1 + (specialtyLevel * 0.02);     // 1.0 to 3.0
    const actionScaling = 1 + ((specialtyLevel - 5) * 0.02);  // 1.0 to 2.9

    return Math.floor(baseWeaponDamage * profBonus * specBonus * actionScaling);
}
```

### Damage Scaling Examples

**Base 20 Damage Weapon:**

| Level | Prof Bonus | Spec Bonus | Action Scale | Total Multiplier | Final Damage |
|-------|------------|------------|--------------|------------------|--------------|
| 5/5 | 1.10x | 1.10x | 1.00x | 1.21x | 24 |
| 25/25 | 1.50x | 1.50x | 1.40x | 3.15x | 63 |
| 50/50 | 2.00x | 2.00x | 1.90x | 7.60x | 152 |
| 75/75 | 2.50x | 2.50x | 2.40x | 15.00x | 300 |
| 100/100 | 3.00x | 3.00x | 2.90x | 26.10x | 522 |

### Full Damage Pipeline (damage-calculator.js)

```
Final Damage =
    Base Weapon Damage
    × Stat Multiplier (1 + STR × 0.03)
    × Proficiency Bonus (1 + level × 0.02)
    × Specialty Bonus (1 + level × 0.02)
    × Action Scaling (1 + (level - 5) × 0.02)
    × Action Multiplier (varies by action)
    × Critical Multiplier (1.5x if crit)
    × Elemental Modifier (if applicable)
    × Damage Amplification (marks/debuffs)
    - Defense (with penetration)
    × Variance (0.95 to 1.05)
```

---

## 7. Status Effects

### Effect Types

| Effect | Duration | Tick Rate | Properties |
|--------|----------|-----------|------------|
| **Bleed** | 6s | 3 ticks (2s each) | DoT: 40% per tick |
| **Burn** | 10s | 5 ticks (2s each) | DoT: 30% per tick |
| **Stun** | 1-2.5s | Instant | Prevents all action |
| **Freeze** | 3s | Instant | Prevents action + movement |
| **Slow** | 3s | Continuous | 50% movement reduction |
| **Mark** | 8s | Instant | +25-29% damage taken |

### Effect Application (combat-system.js)

```javascript
// Blade weapons: 15% chance to bleed
if (damageType === 'blade') {
    if (Math.random() < 0.15) {
        applyStatusEffect(defender, 'bleeding', attacker);
    }
}

// Blunt weapons: 15% chance to stun
if (damageType === 'blunt') {
    if (Math.random() < 0.15) {
        StatusEffectSystem.applyEffect(defender, 'stunned', attacker, { duration: 1000 });
    }
}
```

### Elemental Status Effects

| Element | Status Effect |
|---------|---------------|
| Fire | Burning |
| Ice | Chilled |
| Water | Drenched |
| Nature | Poisoned |
| Death | Withered |
| Arcane | Disrupted |
| Dark | Blinded |
| Holy | Sanctified |

---

## 8. Skill UI System

### Action Bar (action-bar-ui.js)

#### Configuration (Lines 9-17)
```javascript
const ACTION_BAR_CONFIG = {
    slotSize: 56,       // Slot dimensions
    slotSpacing: 10,    // Gap between slots
    barPadding: 20,     // Margin from edge
    cornerRadius: 8,    // Rounded corners
    iconSize: 22,       // Icon dimensions
    hotkeySize: 12,     // Hotkey font size
    glowIntensity: 15   // Glow blur amount
};
```

#### Layout (4 Slots, Bottom-Right)
1. **Slot 0**: Dash (Spacebar)
2. **Slot 1**: Torch Toggle (T)
3. **Slot 2**: Consumable 1 (Hotkey 1)
4. **Slot 3**: Consumable 2 (Hotkey 2)

#### Slot States

| State | Border Color | Glow | Use Case |
|-------|--------------|------|----------|
| `ready` | Green/Cyan | Yes | Action available |
| `active` | Bright Green | Yes | Currently executing |
| `cooldown` | Orange | No | On cooldown |
| `gcd` | Orange | No | Global cooldown |
| `outOfAmmo` | Red | Red | Resource depleted |
| `disabled` | Dark Gray | No | Locked/unavailable |

#### Cooldown Display (Lines 1032-1070)

```javascript
function drawCooldownSweep(ctx, x, y, size, cfg, remaining, max, colors) {
    const progress = 1 - (remaining / max);  // 0 = full cooldown, 1 = ready
    const startAngle = -Math.PI / 2;         // Start at top (12 o'clock)
    const endAngle = startAngle + (progress * Math.PI * 2);

    // Dark pie slice over unavailable portion
    ctx.fillStyle = '#000000';
    ctx.globalAlpha = 0.7;
    ctx.arc(centerX, centerY, radius, endAngle, startAngle + Math.PI * 2);
}
```

#### Icon Types

1. **Dash Icon**: Cyan arrow with motion blur lines
2. **Torch Icon**: Sun (lit) or Moon (dark) with rays/stars
3. **Potion Icon**: Bottle with dynamic fill level and color

### Sidebar (icon-sidebar.js)

#### Layout (Left Edge, 70px Width)

**Components (top to bottom):**
1. Floor indicator (carved alcove style)
2. HP bar (vertical, left)
3. MP bar (vertical, right)
4. Navigation icons:
   - Character (C)
   - Inventory (E)
   - Skills (K)
   - Map (M)
   - Journal (J)
   - Shift (O)
5. Light/Dark indicator (torch with flame animation)

#### Visual Style

- **Stone texture**: Gradient with chisel marks
- **Gold trim**: 3px right edge with notch decorations
- **Icon sockets**: Gem-style with state-based glow
- **Temple aesthetic**: Dark stone, gold accents

### Character Overlay (character-overlay.js)

#### Panel Sections

1. **Header**: "CHARACTER" title, decorative line
2. **Vitals**: HP, MP, Stamina bars
3. **Attributes**: STR, AGI, INT, STA, P.DEF, M.DEF
4. **Equipment**: 6 slots (HEAD, CHEST, LEGS, FEET, MAIN, OFF)
5. **Gold**: Coin icon + amount

#### Safe Value Functions

```javascript
function safeFormatValue(value, options = {}) {
    if (value === undefined || value === null || isNaN(value)) {
        return options.fallback || '--';
    }
    return Number(value).toFixed(options.decimals || 0);
}
```

---

## 9. Code Reference Tables

### Critical Functions

| Function | File | Lines | Purpose |
|----------|------|-------|---------|
| `initializePlayerSkills()` | skill-system.js | 1380-1399 | Create fresh skills |
| `createFreshSkills()` | skill-system.js | 1404-1445 | Skills data structure |
| `addProficiencyXp()` | skill-system.js | 1050-1110 | Award proficiency XP |
| `addSpecialtyXp()` | skill-system.js | 1112-1160 | Award specialty XP |
| `unlockAction()` | skill-system.js | 1164-1178 | Unlock action at level 5 |
| `canUseAction()` | skill-system.js | 1187-1211 | Permission checks |
| `useAction()` | skill-system.js | 1216-1245 | Execute action |
| `calculateActionDamage()` | skill-system.js | 1250-1265 | Compute action damage |
| `updateActionCooldowns()` | skill-system.js | 1270-1281 | Tick cooldowns |
| `getSkillDamageMultiplier()` | skill-system.js | 1296-1309 | Get damage bonus |
| `resetPlayerSkills()` | skill-system.js | 1460-1474 | Reset on death |
| `drawCombatActionBar()` | action-bar-ui.js | 293-357 | Render action bar |
| `drawCooldownSweep()` | action-bar-ui.js | 1032-1070 | Cooldown animation |
| `renderIconSidebar()` | icon-sidebar.js | 254-345 | Render sidebar |
| `drawCharacterOverlay()` | character-overlay.js | 175-354 | Character panel |

### State Management

| State Object | File | Purpose |
|--------------|------|---------|
| `player.skills` | skill-system.js | All skill data |
| `window.actionBarState` | action-bar-ui.js | Action bar hover/active/pulse |
| `window.sidebarState` | icon-sidebar.js | Active overlay, hover icon |

---

## 10. Balance Analysis

### Damage Scaling Analysis

**Problem**: Multiplicative scaling creates exponential power growth.

| Stage | Prof+Spec Level | Multiplier | vs Level 0 |
|-------|-----------------|------------|------------|
| Early | 10/10 | 1.44x | +44% |
| Mid | 50/50 | 7.60x | +660% |
| Late | 100/100 | 26.10x | +2510% |

**Observation**: A level 100 character deals **26x more damage** than a level 0 character with the same weapon.

### XP Rate Analysis

**Melee XP Example** (0.5 XP per damage):

| Damage/Hit | Hits/Min | XP/Min | Time to Level 50 |
|------------|----------|--------|------------------|
| 20 | 30 | 300 | ~32 hours |
| 50 | 30 | 750 | ~13 hours |
| 100 | 30 | 1,500 | ~6.5 hours |

### Action Balance Comparison

**DPS Ranking** (assuming 10s cooldown):

| Action | Total Damage | DPS (over 10s) | Notes |
|--------|--------------|----------------|-------|
| Fan of Knives | 400% (5 targets) | 40%/s | Best AoE |
| Sweeping Arc | 800% (8 targets) | 80%/s | Adjacent only |
| Immolate | 210% | 21%/s | DoT sustained |
| Chain Lightning | 220% (3 targets) | 22%/s | Multi-target |
| Arterial Strike | 200% | 20%/s | DoT sustained |
| Power Shot | 180% | 18%/s | Burst + crit |

### Known Issues

1. **SKILL_CONFIG inconsistencies** (Lines 1070-1071):
   - `xpSplitProficiency` and `xpSplitSpecialty` used but not defined
   - `specialtyCap` vs `specializationCap` naming mismatch
   - `specialtyBonusPerLevel` vs `specializationBonusPerLevel` mismatch

2. **Scaling Balance**:
   - Expertise actions use flat base damage (50, 40, 15)
   - Combat actions use weapon damage scaling
   - Creates disparity at higher levels

3. **Reset on Death**:
   - All progress lost on death
   - No skill persistence between runs
   - High risk for player investment

---

## Appendix: Quick Reference

### Max Level Bonuses Summary

| Proficiency | At Level 100 |
|-------------|--------------|
| Melee | 3.0x damage, +20% crit |
| Ranged | 3.0x damage, +30% accuracy |
| Magic | 3.0x damage, -30% mana cost |
| Defense | 20% damage reduction, +15% block |
| Vitality | +200 HP, +50% healing |

### Action Cooldowns

All actions: **10 seconds** (10000ms)

### Hotkeys

| Action | Key |
|--------|-----|
| Dash | Spacebar |
| Torch | T |
| Consumable 1 | 1 |
| Consumable 2 | 2 |
| Character | C |
| Inventory | E |
| Skills | K |
| Map | M |
| Journal | J |

---

*Analysis generated from codebase exploration. All line numbers reference the current state of the files.*
