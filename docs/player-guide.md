# The Shifting Chasm - Player Guide

> Comprehensive reference for player mechanics, stats, combat, and progression.

---

## Table of Contents

1. [Base Stats](#base-stats)
2. [Derived Stats](#derived-stats)
3. [Resources](#resources)
4. [Combat System](#combat-system)
5. [Combo System](#combo-system)
6. [Dash & I-Frames](#dash--i-frames)
7. [Weapon Types](#weapon-types)
8. [Equipment Slots](#equipment-slots)
9. [Attunement System](#attunement-system)
10. [Status Effects](#status-effects)
11. [Progression](#progression)
12. [Controls Reference](#controls-reference)

---

## Base Stats

All base stats start at **10** and increase by **+1 per level**.

| Stat | Name | Effect |
|------|------|--------|
| **STR** | Strength | Physical damage, melee damage scaling |
| **AGI** | Agility | Attack speed, critical chance, dodge chance |
| **INT** | Intelligence | Magic damage, mana regeneration |
| **STA** | Stamina | Health pool, stamina pool |

### Starting Stats (Level 1)
```
STR: 10    AGI: 10    INT: 10    STA: 10
```

---

## Derived Stats

Stats calculated from base stats and equipment bonuses.

### Health & Resources

| Stat | Formula | Level 1 Value |
|------|---------|---------------|
| **Max HP** | 80 + (STA x 2) | 100 HP |
| **Max Stamina** | 80 + (STA x 2) | 100 Stamina |
| **Max MP** | Fixed at 100 | 100 MP |
| **Mana Regen** | 5 x (1 + INT/100) | 5.5 MP/sec |

### Combat Stats

| Stat | Formula | Level 1 Value |
|------|---------|---------------|
| **Critical Chance** | 5% + (AGI - 10) x 0.3% | 5% |
| **Dodge Chance** | (AGI - 10) x 0.2% | 0% |
| **Physical Defense** | Sum of equipment pDef | 0 |
| **Magic Defense** | Sum of equipment mDef | 0 |
| **Attack Speed** | From weapon (base 1.0) | 1.0x |
| **Attack Range** | From weapon (default 1 tile) | 1 tile |

### Stat Scaling Examples

| Level | Total Stats | Max HP | Crit Chance |
|-------|-------------|--------|-------------|
| 1 | 10 each | 100 | 5.0% |
| 5 | 14 each | 108 | 6.2% |
| 10 | 19 each | 118 | 7.7% |
| 20 | 29 each | 138 | 10.7% |

---

## Resources

### Health (HP)
- Primary survival resource
- Depleted by enemy attacks, DoT effects, environmental hazards
- Restored by: Bonfires (full heal), Health Potions, Regeneration effects
- **Death occurs when HP reaches 0** (roguelike permadeath)

### Mana (MP)
- Used by magic weapons (Staff, Wand, Tome)
- Fixed pool of 100 MP
- Regenerates automatically at **5 x (1 + INT/100)** per second
- Higher INT = faster mana regen

### Stamina
- Primarily cosmetic in current build
- Same formula as HP: 80 + (STA x 2)
- Reserved for future sprint/dodge mechanics

---

## Combat System

### Attack Mechanics

Combat uses a **mouse-driven click-to-attack** system:

1. **Left-click** toward target to attack
2. Attack direction determined by mouse cursor position
3. Player automatically faces attack direction
4. Base attack time: **700ms**, modified by weapon speed

### Damage Calculation

```
Base Damage = Weapon Damage + (STR / 5) for melee
Base Damage = Weapon Damage + (AGI / 5) for ranged
Base Damage = Weapon Damage + (INT / 3) for magic

Final Damage = Base Damage x Elemental Modifiers x Crit Multiplier
```

### Critical Hits
- Chance: 5% + (AGI - 10) x 0.3%
- Multiplier: **1.5x damage**
- Visual: Yellow damage numbers

### Attack Cooldown
```
Cooldown = 0.7 / Weapon Speed
```
- Speed 1.0 = 700ms between attacks
- Speed 1.5 = 467ms between attacks
- Speed 0.5 = 1400ms between attacks

---

## Combo System

Attacks follow a **3-hit combo chain**:

| Combo Hit | Attack Side | Damage | Visual |
|-----------|-------------|--------|--------|
| **Attack 1** | Left swing | 100% | Arc from left |
| **Attack 2** | Right swing | 100% | Arc from right |
| **Attack 3** | Special/Finisher | **150%** | Center + effect |

### Combo Mechanics
- Combo advances automatically: 1 -> 2 -> 3 -> 1
- No timing window required (always chains)
- **Attack 3 deals 1.5x damage** (combo finisher bonus)
- Visual effects differ per attack in chain

### Combo by Weapon Type

| Weapon | Attack 1 | Attack 2 | Attack 3 (Special) |
|--------|----------|----------|-------------------|
| Sword | Left sweep | Right sweep | Wide sweep + glow |
| Knife | Left slash | Right slash | Double slash |
| Axe | Left chop | Right chop | X-mark + sparks |
| Mace | Left slam | Right slam | Shockwave burst |
| Polearm | Left thrust | Right thrust | Long thrust |
| Unarmed | Left jab | Right jab | Impact burst |
| Ranged | Slight left offset | Slight right offset | Straight + bonus damage |

---

## Dash & I-Frames

### Dash Ability
- **Hotkey**: Spacebar
- **Direction**: Toward mouse cursor
- **Distance**: 1.5 tiles
- **Cooldown**: 1.0 seconds
- **Duration**: 150ms animation

### Invincibility Frames (I-Frames)
- **Duration**: 200ms after dash starts
- Player is **immune to all damage** during i-frames
- Visual: 50% transparency during dash
- Ghost trail follows dash path

### Dash Properties
- Passes through enemies (not blocked)
- Stopped by walls (no wall clipping)
- Cannot dash into solid tiles
- Cooldown displayed on action bar

---

## Weapon Types

### Melee Weapons

| Type | Arc Angle | Range | Slash Style | Knockback |
|------|-----------|-------|-------------|-----------|
| **Sword** | 90° | 1.56 tiles | Sweep | 0.7 tiles |
| **Knife** | 60° | 1.04 tiles | Alternate | 0.3 tiles |
| **Axe** | 80° | 1.69 tiles | Chop | 1.0 tiles |
| **Mace** | 60° | 1.56 tiles | Slam | 1.5 tiles |
| **Polearm** | 45° | 2.6 tiles | Thrust | 0.5 tiles |
| **Unarmed** | 60° | 0.78 tiles | Jab | 0.3 tiles |
| **Shield** | 90° | 1.04 tiles | Sweep | 1.2 tiles |

### Ranged Weapons

| Type | Projectile Speed | Scaling | Ammo |
|------|------------------|---------|------|
| **Bow** | 8 tiles/sec | AGI | Arrows |
| **Crossbow** | 10 tiles/sec | AGI | Bolts |
| **Throwing** | 7 tiles/sec | AGI | None |

### Magic Weapons

| Type | Projectile Speed | Scaling | Cost |
|------|------------------|---------|------|
| **Staff** | 7 tiles/sec | INT | MP |
| **Wand** | 9 tiles/sec | INT | MP |
| **Tome** | 6 tiles/sec | INT | MP |

### Weapon Speed Reference
- **Fast** (1.5): Knife, Wand
- **Normal** (1.0): Sword, Bow, Staff
- **Slow** (0.7): Axe, Mace, Crossbow
- **Very Slow** (0.5): Polearm, Tome

---

## Equipment Slots

| Slot | Type | Primary Stats |
|------|------|---------------|
| **HEAD** | Helmet | pDef, mDef, STA |
| **CHEST** | Armor | pDef, mDef, STA |
| **LEGS** | Leggings | pDef, AGI |
| **FEET** | Boots | AGI, Move Speed |
| **MAIN** | Weapon | Damage, Speed, Element |
| **OFF** | Shield/Secondary | pDef, Block Chance |

### Equipment Rarity

| Rarity | Color | Drop Chance |
|--------|-------|-------------|
| Common | White | Base rate |
| Uncommon | Green | 30% of base |
| Rare | Blue | 10% of base |
| Epic | Purple | 3% of base |
| Legendary | Orange | 1% of base |

### Starting Equipment
- **Weapon**: None (Unarmed Strike)
- **Armor**: None
- **Inventory**: 2x Health Potion (50 HP each)

---

## Attunement System

Elemental affinity gained through combat and exploration.

### Elements

| Element | Color | Status Effect | Opposed By |
|---------|-------|---------------|------------|
| **Fire** | #ff6b35 | Burning | Ice, Water |
| **Ice** | #74b9ff | Chilled | Fire |
| **Water** | #0984e3 | Soaked | Fire, Earth |
| **Earth** | #b37f4a | Staggered | Water, Nature |
| **Nature** | #00b894 | Poisoned | Fire, Death |
| **Death** | #636e72 | Withered | Holy, Nature |
| **Arcane** | #a55eea | Destabilized | Physical |
| **Dark** | #2d3436 | Blinded | Holy |
| **Holy** | #ffeaa7 | Judged | Dark, Death |
| **Physical** | #dfe6e9 | None | Arcane |

### Attunement Values
- Range: 0-100 per element
- Primary element: Highest attunement >= 25
- Affects damage dealt/received with that element
- Gained by: Using weapons of that element, fighting in element-themed rooms

---

## Status Effects

### Damage Over Time (DoT)

| Effect | Damage | Tick | Duration | Max Stacks |
|--------|--------|------|----------|------------|
| **Burning** | 3/tick | 1.0s | 5s | 3 |
| **Poisoned** | 2/tick | 1.5s | 8s | 5 |
| **Bleeding** | 4/tick | 1.0s | 6s | 3 |
| **Withered** | 2/tick | 2.0s | 10s | 1 |

> Note: Withered also reduces Max HP by 20%

### Crowd Control (CC)

| Effect | Duration | Prevents |
|--------|----------|----------|
| **Stunned** | 2.0s | Action, Movement |
| **Frozen** | 3.0s | Action, Movement |
| **Rooted** | 4.0s | Movement only |
| **Silenced** | 5.0s | Abilities only |

### Debuffs

| Effect | Duration | Modifier |
|--------|----------|----------|
| **Chilled** | 4.0s | -10% move/attack speed per stack (max 3) |
| **Weakened** | 6.0s | -25% damage dealt |
| **Vulnerable** | 5.0s | +25% damage taken |
| **Blinded** | 4.0s | -30% accuracy, -3 vision range |
| **Disrupted** | 5.0s | -50% cooldown rate |

### Buffs

| Effect | Duration | Modifier |
|--------|----------|----------|
| **Regenerating** | 10.0s | +3 HP per second |
| **Strengthened** | 8.0s | +25% damage dealt |
| **Hastened** | 6.0s | +30% move speed, +20% attack speed |
| **Shielded** | 8.0s | -30% damage taken |
| **Invisible** | 10.0s | Enemies can't see you (breaks on attack) |
| **Sanctified** | 8.0s | +50% damage vs Undead |

---

## Progression

### Experience & Leveling

| Level | XP Required | Cumulative XP |
|-------|-------------|---------------|
| 2 | 100 | 100 |
| 3 | 150 | 250 |
| 4 | 225 | 475 |
| 5 | 337 | 812 |
| 10 | 1,139 | 3,837 |

**Formula**: XP to next level = Previous requirement x 1.5

### Level Up Rewards
- **All base stats +1** (STR, AGI, INT, STA)
- **Full HP restore**
- **Full Stamina restore**
- **Full Mana restore**

### XP Sources
- Killing enemies (scaled by enemy tier)
- Clearing rooms
- Boss defeats (large bonus)
- Exploration discoveries

---

## Controls Reference

### Movement
| Key | Action |
|-----|--------|
| W / Up Arrow | Move up |
| A / Left Arrow | Move left |
| S / Down Arrow | Move down |
| D / Right Arrow | Move right |

### Combat
| Input | Action |
|-------|--------|
| Left Click | Attack toward cursor |
| Spacebar | Dash toward cursor |
| 3 | Use consumable slot 3 |
| 4 | Use consumable slot 4 |

### Interface
| Key | Action |
|-----|--------|
| I | Toggle inventory |
| C | Toggle character sheet |
| M | Toggle map |
| Escape | Pause / Menu |

### Mouse
| Input | Action |
|-------|--------|
| Left Click (on UI) | Interact with UI elements |
| Left Click (on world) | Attack in direction |
| Hover | Show tooltips |

---

## Quick Reference Card

```
+--------------------------------------------------+
|              THE SHIFTING CHASM                   |
|                 PLAYER STATS                      |
+--------------------------------------------------+
| HP: 80 + (STA x 2)     | Crit: 5% + (AGI-10)*0.3 |
| MP: 100 (fixed)        | Dodge: (AGI-10) * 0.2%  |
| Regen: 5*(1+INT/100)   | Attack: 700ms / speed   |
+--------------------------------------------------+
|                   COMBO                           |
| Attack 1 (Left) -> Attack 2 (Right) -> Finisher  |
|    100% damage      100% damage      150% damage  |
+--------------------------------------------------+
|                    DASH                           |
| Spacebar | 1.5 tiles | 1s cooldown | 0.2s i-frame|
+--------------------------------------------------+
|               LEVEL UP: +1 ALL STATS              |
+--------------------------------------------------+
```

---

## Tips for Survival

1. **Use the combo finisher**: Attack 3 deals 50% bonus damage
2. **Dash through enemies**: I-frames make you invincible briefly
3. **Watch enemy windups**: 35% telegraph time on enemy attacks
4. **Manage cooldowns**: Dash has 1 second cooldown
5. **Element matching**: Use opposed elements for bonus damage
6. **Bonfire heals fully**: Sanctuaries restore all HP
7. **Boss rooms are optional**: Defeat for stairs to next floor
8. **Knockback blunt weapons**: Maces push enemies into walls for bonus damage

---

*Last Updated: Floor systems, combo mechanics, dash i-frames*
