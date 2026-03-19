# Equipment, Armor, Weapons & Monster Loot - Deep Analysis

> **Generated:** 2026-02-18
> **Game:** The Shifting Chasm
> **Analysis Scope:** Complete equipment and loot ecosystem

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Weapon System](#2-weapon-system)
3. [Armor System](#3-armor-system)
4. [Item & Equipment Architecture](#4-item--equipment-architecture)
5. [Monster Loot System](#5-monster-loot-system)
6. [Monster Tier System](#6-monster-tier-system)
7. [Progression Analysis](#7-progression-analysis)
8. [Balance Considerations](#8-balance-considerations)
9. [Key File Reference](#9-key-file-reference)

---

## 1. Executive Summary

### System Overview

The Shifting Chasm features a sophisticated equipment and loot system with:

| Category | Count | Notes |
|----------|-------|-------|
| **Weapons** | 289 total | Melee, Ranged, Magic across 10 categories |
| **Armor Pieces** | 142 total | 5 equipment slots + shields |
| **Consumables** | 89 items | Potions, food, utility items |
| **Materials** | 20+ types | Monster drops, crafting components |
| **Monsters** | 35 unique | 5 tier system with unique loot tables |

### Rarity Distribution

| Rarity | Equipment % | Monster Drop % | Gold Value Range |
|--------|------------|----------------|------------------|
| Common | 50% | 70% | 5-40 gold |
| Uncommon | 35% | 25% | 65-100 gold |
| Rare | 13% | 4% | 140-180 gold |
| Epic | 2% | 1% | 300-400 gold |
| Legendary | <1% | <1% | 1,100-1,400 gold |

### Core Mechanics

- **Two-Layer Damage System:** Weapon type vs armor type (±30%) + element vs element (±30%)
- **Defense Scaling:** 1.5% damage reduction per defense point (75% cap)
- **Drop Rates:** 25% monster-specific loot + 8% equipment drop per kill
- **Floor Scaling:** Monsters scale with floor number (+12-15% per floor)

---

## 2. Weapon System

### 2.1 Weapon Categories (289 Total)

| Category | Count | Damage Range | Speed | Range | Primary Stat |
|----------|-------|--------------|-------|-------|--------------|
| **Swords** | 24 | 7-25 | 0.8-1.3x | 1.25 | STR+AGI |
| **Maces/Blunt** | 27 | 8-28 | 0.7-0.95x | 1.25 | STR+pDef |
| **Polearms** | 24 | 7-24 | 0.8-1.1x | 2.0 | STR+AGI |
| **Bows** | 12 | 6-20 | 0.9-1.3x | 5-7 | AGI+INT |
| **Crossbows** | 8 | 12-20 | 0.4-0.7x | 5-6 | AGI+INT |
| **Daggers (Off-hand)** | 16 | 4-11 | 1.3-1.5x | 1.25 | AGI+STR |
| **Throwing** | 12 | 5-17 | 0.85-1.5x | 3-6 | AGI+STR |
| **Staffs** | 24 | 6-22 | 0.75-1.0x | 2.0 | INT (70%) |
| **Wands** | 16 | 5-12 | 1.1-1.4x | 4-5 | INT+AGI |
| **Tomes** | 16 | 4-14 | 0.95-1.1x | 3-4 | INT (80%) |

### 2.2 Damage Type System

Four primary damage types with rock-paper-scissors matchups:

```
BLADE WEAPONS:
  +30% vs: Unarmored
  -30% vs: Armored, Stone
  Neutral: Hide, Scaled, Bone, Ethereal

BLUNT WEAPONS:
  +30% vs: Armored, Stone, Bone
  -30% vs: Ethereal
  Neutral: Unarmored, Hide, Scaled

PIERCE WEAPONS:
  +30% vs: Hide, Scaled, Ethereal
  -30% vs: Armored, Stone
  Neutral: Unarmored, Bone

MAGIC WEAPONS:
  +30% vs: Armored, Stone, Unarmored
  -30% vs: Ethereal (some exceptions)
  Neutral: Others
```

### 2.3 Elemental System (10 Elements)

| Element | Opposed By | Status Effect | Weapon Count |
|---------|-----------|---------------|--------------|
| Fire | Ice, Water | Burning | ~35 |
| Ice | Fire | Chilled | ~30 |
| Water | Fire, Earth | Soaked | ~25 |
| Earth | Water, Nature | Staggered | ~20 |
| Nature | Fire, Death | Poisoned | ~20 |
| Death | Holy, Nature | Withered | ~15 |
| Arcane | Physical | Destabilized | ~20 |
| Dark | Holy | Blinded | ~25 |
| Holy | Dark, Death | Judged | ~15 |
| Physical | Arcane | None | ~60+ |

**Element Power Scaling:**
- Common/Uncommon: 1-2
- Rare: 3-4
- Epic: 5-6
- Legendary: 7

### 2.4 Special Weapon Abilities

**Offensive:**
- `critBonus`: +10-25% crit chance
- `executeBonus`: +15-35% damage vs low-HP enemies
- `lifeSteal`: 10-20% damage healed
- `doubleStrike`: 10-15% chance for extra hit
- `chainLightning`: 25% chain damage
- `armorPen`: 20-30% armor ignored

**Utility:**
- `noiseReduction`: 25-60% stealth bonus
- `slowAmount`: 10-35% movement reduction
- `poisonChance`: 10-30% poison application
- `stagger`: 10-25% knockback
- `magicPen`: 15-35% magic resistance ignored

**Defensive:**
- `blockBonus`: +10% block chance
- `manaRegen`: +15% mana restoration
- `spellEcho`: 15% spell repeat chance

### 2.5 Weapon Progression Examples

**Swords (Common → Legendary):**
1. Rusty Sword (7 dmg, +2 STR)
2. Iron Longsword (10 dmg, +4 STR)
3. Steel Longsword (13 dmg, +4 STR, +2 AGI)
4. Volcanic Scimitar (14 dmg, fire, +7 STR)
5. Infernal Greatsword (20 dmg, fire 5, +11 STR)
6. Primordial Edge (25 dmg, dark, crit/lifeSteal, +15 STR)

### 2.6 Noise System

Weapons have noise ratings affecting stealth:

| Noise Level | Range | Examples |
|-------------|-------|----------|
| Silent | 15-20 | Shadow Shuriken, Voidwand |
| Quiet | 25-30 | Shadow Knife, Stalker's Bow |
| Standard | 35-50 | Most melee weapons, bows |
| Loud | 55-75 | Titan's Grasp, Heavy Crossbows |

---

## 3. Armor System

### 3.1 Armor Types (7 Types)

| Type | Weakness | Resistance | Monster Examples |
|------|----------|------------|------------------|
| **Unarmored** | Blade | None | Cinder Wisp, Spore Drone |
| **Hide** | Pierce | None | Magma Hound, Frost Stalker |
| **Scaled** | Pierce | None | Drowned Revenant, Blighted Treant |
| **Armored** | Blunt | Blade | Grave Knight, Templar Remnant |
| **Stone** | Blunt | Blade, Pierce | Crystal Golem, Mud Shambler |
| **Bone** | Blunt | None | Husk, Lich Acolyte |
| **Ethereal** | Pierce | Blunt | Void Touched, Shadow Creeper |

### 3.2 Equipment Slots (142 Total Pieces)

| Slot | Count | Defense Range | Notes |
|------|-------|---------------|-------|
| **Shields (OFF)** | 24 | 2-8 + 15-40% block | Trade-offs with speed |
| **Head** | 18 | 2-8 | Vision/stagger effects |
| **Chest** | 18 | 3-12 | Highest defense slot |
| **Legs** | 18 | 2-9 | Mobility scaling |
| **Feet** | 18 | 1-6 | Speed modifiers |
| **Utility (OFF)** | 16 | 0-3 | Torches, Focuses, Talismans |

### 3.3 Defense Calculation

```javascript
Defense Scaling: 1.5% damage reduction per point
Maximum Cap: 75% damage reduction (requires 50 defense)

Formula: damage * (1 - min(defense * 0.015, 0.75))

Example:
  Total pDef: 16 (from all armor pieces)
  Reduction: 16 × 1.5% = 24%
  Final damage: base_damage × 0.76
```

### 3.4 Armor Set Lines

**Heavy/Tank (STR-focused):**
- Fortress Set (armored): 8-12 defense, +7 STR, -20% speed
- Worldstone Set (stone): +11 pDef, earth element

**Agility (AGI-focused):**
- Infernal Set (scaled): Fire element 5, +11 AGI
- Shadow Set (hide): Noise reduction, stealth bonuses

**Magic (INT-focused):**
- Voidweave Set (ethereal): Dark element 5, +11 INT, silent
- Spell Ward items: High mDef, INT scaling

### 3.5 Shield Block Mechanics

```javascript
Block System:
  - Block chance: 15-40% based on shield
  - Damage reduced: 90% on successful block
  - Block arc: Frontal 90° only
  - Shield breaks: After 3 consecutive hits
  - Rear attacks: Bypass shield entirely
```

---

## 4. Item & Equipment Architecture

### 4.1 Item Categories

**Consumables (89 items):**
- Healing: 25-200 HP restoration
- Mana: 20-80 MP restoration
- Buffs: +5 stat, 30-60 second duration
- Utility: Antidote, scrolls, smoke bombs
- Food: Regeneration over time
- Deployables: Campfires for healing zones

**Ammo (18 types):**
- Arrows: Stone, Steel, Standard, Fire, Ice, Poison
- Bolts: Same variants
- Stack limit: 99

**Materials (20+ types):**
- Monster drops: Cores, wings, bones, essences
- Elemental: Fire/Ice/Earth/etc motes
- Crafting: Ore, ingots, leather, cloth
- Stack limit: 99

### 4.2 Inventory System

```javascript
Configuration:
  Slot limit: 15 (configurable)
  Stackable types: ['material', 'consumable']
  Equipment: Non-stackable (count always 1)

Methods:
  addItem(player, item, count)
  removeItem(player, itemName, count)
  hasItem(player, itemName, count)
  findStackable(player, item)
```

### 4.3 Loadout System (Pre-Run Selection)

**Basic Loadout (Always Free):**
- Rusty Shortsword
- 2× Weak Health Potion
- 2× Fire Starter Kit

**Custom Selection:**
- 1 primary weapon (MAIN slot)
- Up to 6 armor pieces (HEAD, CHEST, LEGS, FEET, OFF)
- Multiple consumables with partial stacks
- Gold amount to carry

### 4.4 Shop System

**NPC Stocks:**
- Blacksmith: Weapons, armor, repair kits
- Alchemist: Potions, bombs, antidotes
- Innkeeper: Food items

**Transaction Rules:**
- Sell price: 50% of buy price
- Max gold cap: 999,999,999
- Validation: Prevents negative/NaN/exploit values

### 4.5 Crafting System (4 Tiers)

| Tier | Unlock | Defense Range | Cost | Craft Time |
|------|--------|---------------|------|------------|
| 1 | Start | 8-15 | 80-100g | 3-4s |
| 2 | Floor 1 | 20-25 | 180-200g | 4-5s |
| 3 | Floor 2 | 30-35 | 400g | 7s |
| 4 | Floor 3 | 40+ | 700g | 10s |

**Quality Outcomes:**
- Standard (80%): Normal stats
- Superior (15%): +8% stat bonus
- Masterwork (5%): +15% bonus + name prefix

---

## 5. Monster Loot System

### 5.1 Drop Rate Configuration

```javascript
LOOT_CONFIG = {
    despawnTime: 60000,          // 60 seconds
    monsterItemChance: 0.25,     // 25% monster-specific
    equipmentDropChance: 0.08,   // 8% random equipment
    stackableTypes: ['material', 'consumable']
}
```

**Combined Drop Rate:** ~30% chance for at least one item per kill

### 5.2 Monster-Specific Loot Tables

All 35 monsters have unique loot with 2-3 items per table:

| Monster | Items | Best Drop | Best Rarity | Favor Value |
|---------|-------|-----------|-------------|-------------|
| Cave Bat | 2 | Bat Wing | Uncommon | 15 |
| Magma Slime | 3 | Magma Core | Rare | 45 |
| Obsidian Golem | 3 | Obsidian Shard | Rare | 45 |
| **Bone Golem** | 3 | Bone Core | **Epic** | 110 |
| **Void Touched** | 2 | Void Crystal | **Epic** | 110 |
| **Ice Golem** | 3 | Permafrost Core | **Epic** | 110 |
| **Stone Guardian** | 3 | Guardian Core | **Epic** | 110 |
| **Demon Knight** | 3 | Demon Steel | **Epic** | 110 |

**5 Monsters with Epic Drops:** Bone Golem, Void Touched, Ice Golem, Stone Guardian, Demon Knight

### 5.3 Equipment Drop Rarity Weights

```javascript
Base Weights:
  common:   50%
  uncommon: 35%
  rare:     13%
  epic:     2%

With Shift Active:
  epic: 2% × 2.0 = 4%
```

### 5.4 Favor System (Sacrifice Mechanic)

Items can be sacrificed at shrines for HP:

| Rarity | HP Restoration |
|--------|----------------|
| Common | 2-5 HP |
| Uncommon | 10-20 HP |
| Rare | 35-55 HP |
| Epic | 100-120 HP |

### 5.5 Loot Pickup Mechanics

- Auto-pickup when stepping on pile
- Visibility check required (must be in light)
- Stacking for materials/consumables
- Partial pickup if inventory full
- Blink effect in last 10 seconds before despawn

---

## 6. Monster Tier System

### 6.1 Tier Overview (5 Tiers)

| Tier | Name | Color | HP Range | Damage | Attack Speed |
|------|------|-------|----------|--------|--------------|
| TIER_3 | Fodder | Gray | 20-30 | 2-3 | 2.5s |
| TIER_2 | Regular | Gold | 50-90 | 4-6 | 2.0s |
| TIER_1 | Elite Soldier | Red | 45-90 | 7-11 | 1.8s |
| ELITE | Boss Lieutenant | Gold★ | 95-120 | 10-20 | 1.5s |
| BOSS | Floor Boss | Red☆ | 150+ | 15+ | 1.2s |

### 6.2 Behavioral Properties by Tier

**TIER_3 (Fodder):**
- Perception: 3 tiles, no dark vision
- Flee at 30% HP
- No evasion, no blocking
- No leadership, panics easily

**TIER_2 (Regular):**
- Perception: 4 tiles, 1-tile peripheral
- Flee at 20% HP
- 5% evasion, 10% block
- Can be commanded, follows formations

**TIER_1 (Elite Soldier):**
- Perception: 5 tiles, dark vision resistant
- Won't flee
- 15% evasion, 20% block
- Can lead others, uses ambushes

**ELITE (Boss Lieutenant):**
- Perception: 6 tiles, darkvision
- Cannot be interrupted
- 20% evasion, 30% block
- **UNIQUE:** Sacrifices minions at 30% HP for 25% heal + 20% damage buff

**BOSS (Floor Boss):**
- Perception: 10 tiles, omniscient
- 10% evasion, 40% block
- 25% base damage reduction
- Phase-based transitions, summons reinforcements

### 6.3 Tier Resistances

| Resistance | Tier 3 | Tier 2 | Tier 1 | Elite | Boss |
|------------|--------|--------|--------|-------|------|
| Stun | 0% | 10% | 30% | 50% | 80% |
| Slow | 0% | 10% | 20% | 40% | 60% |
| Fear | 0% | 20% | 50% | 80% | 100% |
| Physical | 0% | 0% | 10% | 15% | 25% |
| Fire/Ice | 0% | 0% | 10% | 20% | 30% |
| Holy | 0% | 0% | 0% | -10% | **-20%** |

**Note:** Bosses are WEAK to Holy damage!

### 6.4 Floor Scaling

```javascript
FLOOR_SCALING = {
    Floor 2: +15% HP/XP, +5% other stats
    Floor 3: +15% HP/XP, +10% other stats
    Floor 4: +12% HP/XP, +12% other stats
    Floor 5+: +12% base, +1% per additional floor
}
```

### 6.5 Spawn Distribution by Dungeon Depth

**Near Entrance (Difficulty 1-3):**
- Tier 3: 80%, Tier 2: 18%, Tier 1: 2%, Elite: 0%

**Mid-Dungeon (Difficulty 4-6):**
- Tier 3: 50%, Tier 2: 35%, Tier 1: 12%, Elite: 3%

**Deep Dungeon (Difficulty 7-10):**
- Tier 3: 25%, Tier 2: 35%, Tier 1: 30%, Elite: 10%

---

## 7. Progression Analysis

### 7.1 Equipment vs Monster Tier Alignment

| Encounter | Recommended Gear | Drop Quality |
|-----------|------------------|--------------|
| Tier 3 monsters | Common weapons | Common loot |
| Tier 2 monsters | Uncommon weapons | Uncommon loot |
| Tier 1 monsters | Rare weapons | Rare loot |
| Elite monsters | Epic weapons | Epic loot |
| Boss monsters | Epic/Legendary | Legendary potential |

### 7.2 Consumable Scaling

| Potion | HP Restored | Monster HP Equivalent |
|--------|-------------|----------------------|
| Small Health | 30 HP | Tier 3 (20-30 HP) |
| Health | 60 HP | Tier 2 (50-90 HP) |
| Large Health | 120 HP | Tier 1 (45-90 HP) |
| Health Elixir | 50% max HP | Elite/Boss (95+ HP) |

### 7.3 Gold Economy

**Acquisition:**
- Monster kills: No direct gold drops
- Equipment selling: 50% of buy price
- Loot sacrifice: HP instead of gold

**Expenditure:**
- Shop purchases: Full price
- Crafting costs: 80-700 gold per tier
- Repair costs: Variable

### 7.4 Stat Progression (Weapons)

| Rarity | Stat Pool | Primary Stat Bonus |
|--------|-----------|-------------------|
| Common | 2-4 points | +2 |
| Uncommon | 4-8 points | +4 |
| Rare | 8-14 points | +7 |
| Epic | 14-22 points | +11 |
| Legendary | 22+ points | +15-18 |

---

## 8. Balance Considerations

### 8.1 Damage Scaling Philosophy

- High damage weapons → Slower attack speed (0.7-0.8x)
- Medium damage → Normal speed (0.9-1.0x)
- Low damage → Faster speed (1.2-1.5x)

This creates meaningful playstyle choices: burst vs sustained DPS.

### 8.2 Weapon-Armor Rock-Paper-Scissors

No armor type is perfectly balanced:
- Every armor has a +30% weakness
- Every armor has at least one resistance
- Encourages varied loadouts and adaptation

### 8.3 Stealth vs Protection Trade-off

- Silent gear (0 noise) = Lower defense
- Heavy armor (high defense) = Loud (15-20 noise)
- Creates meaningful build choices

### 8.4 Defense Cap Analysis

- 75% damage reduction cap
- Requires 50 defense to cap
- Full armor set provides 25-40 defense typically
- Cannot fully trivialize damage without sacrificing other stats

### 8.5 Drop Rate Balance

- 25% monster loot + 8% equipment = ~30% overall
- Epic equipment: 0.16% effective rate (8% × 2%)
- Shift doubles epic chance to 0.32%
- Creates appropriate rarity for progression pacing

### 8.6 Elite Minion Sacrifice

Strategic depth mechanic:
- Players must decide: kill minions first or damage Elite?
- Letting Elite sacrifice = +25% heal + 20% damage buff
- Creates tactical decisions not present in lower tiers

---

## 9. Key File Reference

### Data Files

| File | Contents | Item Count |
|------|----------|------------|
| `js/data/weapons-melee.js` | Swords, maces | 54 |
| `js/data/weapons-ranged.js` | Bows, crossbows, polearms, daggers, throwing | 57 |
| `js/data/weapons-magic.js` | Staffs, wands, tomes | 59 |
| `js/data/armor-defense.js` | Shields, head, chest | 60 |
| `js/data/armor-mobility.js` | Legs, feet, utility | 82 |
| `js/data/armor-types.js` | 7 armor type definitions | 7 |
| `js/data/weapon-armor-matrix.js` | Damage matchups | - |
| `js/data/items.js` | Consumables, ammo, materials | 127+ |
| `js/data/monsters-data.js` | Monster definitions + loot tables | 35 |
| `js/data/monster-tiers.js` | Tier behavior definitions | 5 |
| `js/data/crafting-data.js` | Crafting recipes | 20+ |

### System Files

| File | Purpose |
|------|---------|
| `js/systems/loot-system.js` | Loot spawning, pickup, despawn |
| `js/systems/inventory-system.js` | Item management, stacking |
| `js/systems/loadout-system.js` | Pre-run equipment selection |
| `js/systems/crafting-system.js` | Item crafting, upgrades |
| `js/systems/shield-system.js` | Block mechanics |
| `js/utils/damage-calculator.js` | Two-layer damage system |
| `js/entities/equipment-loader.js` | Equipment merging, helpers |
| `js/ui/shop-ui.js` | Buy/sell interface |
| `js/ui/loadout-ui.js` | Pre-run selection UI |

### Combat Integration

| File | Purpose |
|------|---------|
| `js/systems/combat-system.js` | Attack execution |
| `js/systems/combat-master.js` | Combat orchestration, death handling |
| `js/systems/status-effect-system.js` | Elemental effects |

---

## Appendix A: Complete Weapon List by Category

### A.1 Melee - Blade (27 weapons)

**Common:**
- Rusty Sword (7 dmg)
- Iron Longsword (10 dmg)

**Uncommon:**
- Steel Longsword (13 dmg)
- Serrated Blade (11 dmg)
- Ember Edge (10 dmg, fire)
- Frost Saber (10 dmg, ice)
- Coral Blade (10 dmg, water)
- Stone Edge (12 dmg, earth)
- Vine Sword (9 dmg, nature)
- Cursed Blade (11 dmg, death)
- Holy Sword (10 dmg, holy)
- Shadow Blade (11 dmg, dark)
- Arcane Edge (10 dmg, arcane)

**Rare:**
- Blessed Saber (12 dmg, holy)
- Volcanic Scimitar (14 dmg, fire)
- Glacier Blade (13 dmg, ice)
- Riptide Sword (13 dmg, water)
- Earthshatter Blade (15 dmg, earth)
- Shadow Fang (11 dmg, dark)
- Reaper's Edge (14 dmg, death)

**Epic:**
- Executioner's Blade (18 dmg)
- Infernal Greatsword (20 dmg, fire)
- Frostbite Claymore (17 dmg, ice)
- Abyssal Edge (17 dmg, dark)

**Legendary:**
- Primordial Edge (25 dmg, dark)
- Sunrazor (24 dmg, holy)
- Frostmourne Echo (23 dmg, ice)

### A.2 Melee - Blunt (27 weapons)

**Common:**
- Wooden Club (8 dmg)
- Iron Mace (11 dmg)

**Uncommon:**
- Steel Mace (14 dmg)
- Spiked Club (13 dmg)
- Volcanic Hammer (13 dmg, fire)
- Frost Maul (12 dmg, ice)
- Coral Club (11 dmg, water)
- Stone Hammer (15 dmg, earth)
- Vine Flail (10 dmg, nature)
- Cursed Mace (12 dmg, death)
- Holy Mace (11 dmg, holy)
- Shadow Hammer (13 dmg, dark)
- Arcane Maul (12 dmg, arcane)

**Rare:**
- Blessed Mace (14 dmg, holy)
- Molten Crusher (17 dmg, fire)
- Glacier Maul (16 dmg, ice)
- Tidal Hammer (15 dmg, water)
- Earthsplitter (18 dmg, earth)

**Epic:**
- Worldsplitter (22 dmg, earth)
- Infernal Flail (19 dmg, fire)
- Spellshatter Mace (16 dmg, silence)

**Legendary:**
- Titan's Grasp (28 dmg, 30% armorPen)
- Dawnbreaker (24 dmg, holy, 50% undeadBane)
- Maelstrom Crusher (26 dmg, water)

---

## Appendix B: Armor Set Summaries

### B.1 Fortress Set (Heavy/Armored)

| Piece | Defense | Block | STR | pDef | Speed Penalty |
|-------|---------|-------|-----|------|---------------|
| Fortress Shield | 8 | 40% | +7 | +11 | -20% |
| Heavy Greathelm | 8 | - | +7 | +11 | - |
| Fortress Plate | 12 | - | +7 | +11 | -20% |
| Fortress Greaves | 9 | - | +7 | +11 | - |
| Fortress Boots | 6 | - | +7 | +11 | - |
| **Total** | **43** | 40% | +35 | +55 | -40% |

### B.2 Infernal Set (Agile/Fire)

| Piece | Defense | Element | AGI | Notes |
|-------|---------|---------|-----|-------|
| Infernal Bulwark | 7 | Fire 5 | +11 | Block 35% |
| Infernal Visage | 6 | Fire 5 | +11 | - |
| Infernal Cuirass | 9 | Fire 5 | +11 | - |
| Infernal Greaves | 7 | Fire 5 | +11 | - |
| Infernal Boots | 5 | Fire 5 | +11 | - |
| **Total** | **34** | Fire 5 | +55 | 35% block |

### B.3 Voidweave Set (Stealth/Magic)

| Piece | Defense | Element | INT | Noise Red. |
|-------|---------|---------|-----|------------|
| Voidweave Robe | 5 | Dark 5 | +11 | -30% |
| Voidweave Leggings | 4 | Dark 5 | +11 | -30% |
| Voidweave Boots | 3 | Dark 5 | +11 | -35% |
| **Total** | **12** | Dark 5 | +33 | -95% noise |

---

## Appendix C: Monster Loot Table Complete Reference

| Monster | Tier | Item 1 | Drop% | Item 2 | Drop% | Item 3 | Drop% |
|---------|------|--------|-------|--------|-------|--------|-------|
| Cave Bat | 3 | Bat Wing | 5% | Guano | 30% | - | - |
| Magma Slime | 3 | Magma Core | 3% | Magma Residue | 25% | Hardened Slime | 25% |
| Flame Bat | 3 | Ember Wing | 5% | Ash | 30% | - | - |
| Cinder Wisp | 2 | Fire Mote | 3% | Ember | 25% | Spirit Dust | 25% |
| Ash Walker | 2 | Ash Essence | 4% | Burnt Bone | 20% | Ash | 30% |
| Stone Lurker | 2 | Stone Chip | 5% | Mineral Dust | 25% | - | - |
| Skeletal Warrior | 2 | Bone Fragment | 8% | Ancient Coin | 15% | - | - |
| Crystal Spider | 1 | Crystal Fang | 4% | Spider Silk | 20% | Crystal Shard | 25% |
| Shadow Stalker | 1 | Shadow Essence | 4% | Dark Cloth | 20% | - | - |
| Phantom | 1 | Ectoplasm | 5% | Spirit Dust | 25% | - | - |
| Pyro Cultist | 1 | Fire Mote | 5% | Cultist Robe | 15% | Gold Coin | 25% |
| Obsidian Golem | E | Obsidian Shard | 3% | Heavy Stone | 25% | Geode | 25% |
| Bone Golem | E | Bone Core | 3% | Ancient Bone | 25% | Bone Fragment | 35% |
| Void Touched | E | Void Crystal | 3% | Shadow Essence | 20% | - | - |
| Ice Golem | E | Permafrost Core | 3% | Glacial Stone | 25% | Ice Shard | 30% |
| Stone Guardian | E | Guardian Core | 3% | Enchanted Stone | 20% | Stone Chunk | 30% |
| Demon Knight | E | Demon Steel | 4% | Infernal Blade Frag | 15% | Dark Cloth | 25% |

*(E = Elite tier)*

---

*End of Analysis*
