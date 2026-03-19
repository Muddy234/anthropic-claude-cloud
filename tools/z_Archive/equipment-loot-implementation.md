# Equipment, Armor, Weapons & Loot — Implementation Spec v2.0

> **Purpose:** This document defines all changes to the equipment, armor, weapon, and loot systems. It supersedes the existing item definitions and loot logic. All line references are to the current codebase prior to these changes.
>
> **Companion Document:** Skill System Implementation Spec v2.0 — several changes here require corresponding updates to that system (noted inline).

---

## Summary of Changes

| Area | Old | New |
|------|-----|-----|
| Weapon types | 10 (289 items) | 6 (30 items) |
| Weapon element | Fixed per weapon | Random roll on drop (33% none, 67% element) |
| Player armor types | 7 | 5 (Cloth, Hide, Armored, Stone, Ethereal) |
| Monster armor types | 7 | 8 (adds Cloth, keeps Scaled and Bone for monsters) |
| Armor pieces | 142 | 80 (5 types × 4 slots × 4 rarities) |
| Shields | 24 (block mechanics) | 5 (pure defense, no block) |
| Total equipment items | 431 | 115 |
| Defense formula | 1.5% per point, 75% cap | 0.5% per point, no cap |
| Shield mechanics | Block chance, break, frontal arc | Pure defense value only |
| Equipment drop rate | 8% | 40% (one item per proc) |
| Drop rarity | Flat weights all floors | Floor-scaled rarity weights |
| Loot despawn | 60 seconds | 120 seconds |
| Floor stat scaling | Monsters scale +12-15%/floor | No stat scaling (monster stats fixed) |
| Gold drops | None | None (unchanged) |

---

## 1. Weapon System

### 1.1 Weapon Types (6 remaining)

**Removed:** Crossbow, Throwing, Wands, Tomes (and all associated items).

| Type | Damage Type | Speed Range | Range | Primary Stat | Specialty |
|------|-------------|-------------|-------|-------------|-----------|
| Sword | Blade | 0.8–1.3x | 1.25 | STR+AGI | `sword` |
| Mace | Blunt | 0.7–0.95x | 1.25 | STR | `mace` |
| Polearm | Pierce | 0.8–1.1x | 2.0 | STR+AGI | `polearm` |
| Bow | Pierce | 0.9–1.3x | 5–7 | AGI | `bow` |
| Dagger | Pierce | 1.3–1.5x | 1.25 | AGI+STR | `knife` |
| Staff | Magic | 0.75–1.0x | 2.0 | INT | `staff` |

> **Dagger change:** Previously off-hand only. Now equippable in MAIN hand. Maps to the `knife` specialty and unlocks Arterial Strike at specialty level 5.

> **Skill system impact:** Remove specialties `crossbow` and `throwing`. Remove weapon actions `piercing_bolt` and `fan_of_knives`. Updated specialty count: 16 (down from 18). Ranged proficiency now supports only the `bow` specialty.

### 1.2 Weapon Definitions (30 total)

6 types × 4 rarities + 6 legendaries (boss drops) = **30 base weapons.**

Each weapon has fixed stats (damage, speed, stat bonuses). Element is determined at drop time (see Section 5.3).

#### Swords (5)

| Rarity | Name | Damage | Speed | Stats | Special |
|--------|------|--------|-------|-------|---------|
| Common | Rusty Sword | 7 | 1.0x | +2 STR | — |
| Uncommon | Steel Longsword | 13 | 1.0x | +4 STR, +2 AGI | — |
| Rare | Volcanic Scimitar | 17 | 1.1x | +7 STR, +3 AGI | +10% crit |
| Epic | Executioner's Blade | 22 | 0.9x | +11 STR, +5 AGI | +15% crit, +15% execute |
| Legendary | Primordial Edge | 27 | 1.0x | +15 STR, +8 AGI | +20% crit, 15% lifeSteal |

#### Maces (5)

| Rarity | Name | Damage | Speed | Stats | Special |
|--------|------|--------|-------|-------|---------|
| Common | Wooden Club | 8 | 0.85x | +2 STR | — |
| Uncommon | Steel Mace | 14 | 0.85x | +4 STR | +10% stagger |
| Rare | Molten Crusher | 19 | 0.8x | +7 STR, +3 pDef | +20% armorPen |
| Epic | Worldsplitter | 25 | 0.75x | +11 STR, +5 pDef | +25% armorPen, +15% stagger |
| Legendary | Titan's Grasp | 30 | 0.7x | +15 STR, +8 pDef | +30% armorPen, +20% stagger |

#### Polearms (5)

| Rarity | Name | Damage | Speed | Stats | Special |
|--------|------|--------|-------|-------|---------|
| Common | Wooden Spear | 7 | 0.95x | +2 STR | — |
| Uncommon | Steel Halberd | 13 | 0.9x | +4 STR, +2 AGI | +1 reach |
| Rare | Serrated Pike | 17 | 0.9x | +7 STR, +4 AGI | +1 reach, +10% bleed |
| Epic | Warlord's Glaive | 22 | 0.85x | +11 STR, +6 AGI | +1 reach, +15% bleed, +10% armorPen |
| Legendary | Worldpiercer | 27 | 0.85x | +15 STR, +8 AGI | +2 reach, +20% bleed, +15% armorPen |

#### Bows (5)

| Rarity | Name | Damage | Speed | Stats | Special |
|--------|------|--------|-------|-------|---------|
| Common | Shortbow | 6 | 1.1x | +2 AGI | — |
| Uncommon | Hunting Bow | 11 | 1.1x | +4 AGI | +10% crit |
| Rare | Stalker's Bow | 15 | 1.2x | +7 AGI, +3 INT | +15% crit, -30% noise |
| Epic | Deadeye Longbow | 20 | 1.0x | +11 AGI, +5 INT | +20% crit, +15% critDamage |
| Legendary | Voidstring | 25 | 1.2x | +15 AGI, +8 INT | +25% crit, +20% critDamage, silent |

#### Daggers (5)

| Rarity | Name | Damage | Speed | Stats | Special |
|--------|------|--------|-------|-------|---------|
| Common | Rusty Knife | 4 | 1.4x | +2 AGI | — |
| Uncommon | Steel Stiletto | 8 | 1.4x | +4 AGI, +2 STR | +10% crit |
| Rare | Shadow Knife | 11 | 1.45x | +7 AGI, +3 STR | +15% crit, -40% noise |
| Epic | Assassin's Fang | 14 | 1.5x | +11 AGI, +5 STR | +20% crit, +10% doubleStrike, -50% noise |
| Legendary | Whisper | 17 | 1.5x | +15 AGI, +8 STR | +25% crit, +15% doubleStrike, silent |

#### Staffs (5)

| Rarity | Name | Damage | Speed | Stats | Special |
|--------|------|--------|-------|-------|---------|
| Common | Gnarled Staff | 6 | 0.9x | +2 INT | — |
| Uncommon | Carved Staff | 11 | 0.9x | +5 INT | +5% spellEcho |
| Rare | Channeler's Staff | 15 | 0.95x | +8 INT, +2 AGI | +10% spellEcho, +10% magicPen |
| Epic | Archmage Staff | 20 | 0.95x | +12 INT, +4 AGI | +15% spellEcho, +20% magicPen |
| Legendary | Conduit of Ruin | 25 | 1.0x | +18 INT, +6 AGI | +20% spellEcho, +25% magicPen, +15% manaRegen |

### 1.3 Glass Cannon Rule — Staff HP Bonuses

Staffs must **never** carry HP or Stamina bonuses. If future weapon iterations add stat bonuses beyond the table above, staffs are restricted to INT, AGI, and offensive properties only. This is an authoring rule, not a code constraint.

---

## 2. Armor System

### 2.1 Defense Formula

Replace the existing defense calculation in `damage-calculator.js`:

```javascript
// OLD:
// damage * (1 - Math.min(defense * 0.015, 0.75))

// NEW: 0.5% reduction per point, no cap
function applyDefense(baseDamage, defense) {
    const reduction = defense * 0.005;
    return Math.floor(baseDamage * (1 - reduction));
}
```

| Defense | Reduction | Build Archetype |
|---------|-----------|-----------------|
| 10 | 5% | Minimal (unarmored run) |
| 30 | 15% | Light (cloth mage) |
| 50 | 25% | Medium (hide ranger) |
| 80 | 40% | Heavy (armored warrior) |
| 108 | 54% | Full plate (all armored epic) |
| 130 | 65% | Maximum tank (stone epic + shield) |

**Design Constraint:** No combination of equipment may exceed **134 total defense** (67% reduction). This is enforced through item authoring, not code. The development team must validate total defense budgets whenever new items are added.

### 2.2 Player Armor Types (5)

Players can find and equip armor in these 5 types:

| Armor Type | Defense Modifier | HP Bonus Tier | Fantasy |
|------------|-----------------|---------------|---------|
| Cloth | 0.5x | Low (30%) | Mage robes, fragile |
| Ethereal | 0.6x | Low (30%) | Magical protection, ghostly |
| Hide | 0.8x | Moderate (60%) | Leather, ranger gear |
| Armored | 1.0x | Full (100%) | Plate metal, warrior |
| Stone | 1.1x | Full (100%) | Heavy mineral, fortress |

> **Defense Modifier** is applied to the base defense value for the rarity/slot. A Rare Chest with base defense 20 gives 10 defense as Cloth, 16 as Hide, 20 as Armored, 22 as Stone.

> **HP Bonus Tier** controls how much bonus HP the armor piece grants (see Section 2.5). This enforces the glass cannon design: Cloth and Ethereal gear gives 30% of the HP bonus that Armored and Stone gear provides.

### 2.3 Monster Armor Types (8)

The full weapon-armor matchup matrix uses **8 armor types**. Scaled and Bone exist on monsters only — they never appear as player equipment drops.

| Armor Type | Appears On | Notes |
|------------|-----------|-------|
| Unarmored | Monsters only | Never drops as equipment |
| Cloth | Players + Monsters | NEW — added for mage/caster enemies |
| Hide | Players + Monsters | |
| Scaled | **Monsters only** | Does not drop as player equipment |
| Armored | Players + Monsters | |
| Stone | Players + Monsters | |
| Bone | **Monsters only** | Does not drop as player equipment |
| Ethereal | Players + Monsters | |

### 2.4 Weapon-Armor Type Matrix (Updated)

```
BLADE (Sword, Dagger):
  +30% vs: Unarmored, Cloth
  -30% vs: Armored, Stone
  Neutral: Hide, Scaled, Bone, Ethereal

BLUNT (Mace):
  +30% vs: Armored, Stone, Bone
  -30% vs: Ethereal
  Neutral: Unarmored, Cloth, Hide, Scaled

PIERCE (Polearm, Bow, Dagger):
  +30% vs: Hide, Scaled, Ethereal, Cloth
  -30% vs: Armored, Stone
  Neutral: Unarmored, Bone

MAGIC (Staff spells):
  +30% vs: Armored, Stone, Unarmored
  -30% vs: Ethereal
  Neutral: Cloth, Hide, Scaled, Bone
```

> **Changes from original matrix:**
> - Cloth added as a new type: weak to Blade and Pierce, neutral to Blunt and Magic. This reinforces the glass cannon design — mages in cloth are vulnerable to physical attacks.
> - Dagger listed under both Blade and Pierce. Daggers are pierce weapons for the matchup matrix (they stab, they don't slash). Updated categorization: **Blade = Sword only. Pierce = Polearm, Bow, Dagger.**

**Implementation in `weapon-armor-matrix.js`:**

```javascript
const WEAPON_ARMOR_MATRIX = {
    blade:  { unarmored: 1.3, cloth: 1.3, hide: 1.0, scaled: 1.0, armored: 0.7, stone: 0.7, bone: 1.0, ethereal: 1.0 },
    blunt:  { unarmored: 1.0, cloth: 1.0, hide: 1.0, scaled: 1.0, armored: 1.3, stone: 1.3, bone: 1.3, ethereal: 0.7 },
    pierce: { unarmored: 1.0, cloth: 1.3, hide: 1.3, scaled: 1.3, armored: 0.7, stone: 0.7, bone: 1.0, ethereal: 1.3 },
    magic:  { unarmored: 1.3, cloth: 1.0, hide: 1.0, scaled: 1.0, armored: 1.3, stone: 1.3, bone: 1.0, ethereal: 0.7 },
};
```

**Weapon-to-damage-type mapping:**

```javascript
const WEAPON_DAMAGE_TYPE = {
    sword:   'blade',
    mace:    'blunt',
    polearm: 'pierce',
    bow:     'pierce',
    dagger:  'pierce',
    staff:   'magic',
};
```

### 2.5 Armor Definitions (80 pieces)

5 armor types × 4 slots × 4 rarities = **80 base armor pieces.**

Each armor piece has: a slot, a rarity, a base defense (modified by armor type), stat bonuses, and an HP bonus (modified by HP bonus tier). Element is determined at drop time (see Section 5.3).

#### Base Defense Values by Slot and Rarity

These are the **base values before armor type modifier is applied.**

| Slot | Common | Uncommon | Rare | Epic |
|------|--------|----------|------|------|
| Head | 4 | 8 | 14 | 20 |
| Chest | 6 | 12 | 20 | 28 |
| Legs | 4 | 10 | 16 | 24 |
| Feet | 3 | 6 | 12 | 18 |
| **Slot Total** | **17** | **36** | **62** | **90** |

**After armor type modifier (full set, all 4 slots):**

| Armor Type | Modifier | Common Set | Uncommon Set | Rare Set | Epic Set |
|------------|----------|------------|--------------|----------|----------|
| Cloth | 0.5x | 9 | 18 | 31 | 45 |
| Ethereal | 0.6x | 10 | 22 | 37 | 54 |
| Hide | 0.8x | 14 | 29 | 50 | 72 |
| Armored | 1.0x | 17 | 36 | 62 | 90 |
| Stone | 1.1x | 19 | 40 | 68 | 99 |

**With Epic Shield (+25 base, see Section 2.6):**

| Build | Armor Type | Total Defense | Damage Reduction |
|-------|------------|---------------|------------------|
| Mage | Cloth + no shield | 45 | 22.5% |
| Stealth Mage | Ethereal + no shield | 54 | 27% |
| Ranger | Hide + no shield | 72 | 36% |
| Warrior | Armored + shield | 115 | 57.5% |
| Fortress Tank | Stone + shield | 124 | 62% |

All values safely under the 134 defense / 67% reduction ceiling.

#### Base HP Bonuses by Slot and Rarity

| Slot | Common | Uncommon | Rare | Epic |
|------|--------|----------|------|------|
| Head | 3 | 6 | 10 | 15 |
| Chest | 5 | 10 | 16 | 25 |
| Legs | 3 | 8 | 12 | 20 |
| Feet | 2 | 5 | 8 | 15 |
| **Slot Total** | **13** | **29** | **46** | **75** |

**After HP bonus tier (full set, all 4 slots):**

| Armor Type | HP Tier | Common | Uncommon | Rare | Epic |
|------------|---------|--------|----------|------|------|
| Cloth | 30% | 4 | 9 | 14 | 23 |
| Ethereal | 30% | 4 | 9 | 14 | 23 |
| Hide | 60% | 8 | 17 | 28 | 45 |
| Armored | 100% | 13 | 29 | 46 | 75 |
| Stone | 100% | 13 | 29 | 46 | 75 |

> **Survivability at Epic tier (base HP + 150 floor bonus + gear HP):**
> - Mage (Cloth): base + 150 + 23 = significantly less total HP with much lower armor
> - Tank (Stone): base + 150 + 75 = significantly more total HP with much higher armor
> - This creates the intended glass cannon vs. fortress spectrum

#### Base Stat Bonuses by Rarity

| Rarity | Primary Stat | Secondary Stat |
|--------|-------------|----------------|
| Common | +2 | — |
| Uncommon | +4 | +2 |
| Rare | +7 | +4 |
| Epic | +11 | +6 |

**Stat allocation by armor type:**

| Armor Type | Primary Stat | Secondary Stat |
|------------|-------------|----------------|
| Cloth | INT | AGI |
| Ethereal | INT | AGI |
| Hide | AGI | STR |
| Armored | STR | AGI |
| Stone | STR | STR (double primary) |

#### Armor Naming Convention

Format: `{ArmorType} {Rarity Adjective} {Slot}`

| Rarity | Adjective |
|--------|-----------|
| Common | Crude |
| Uncommon | Sturdy |
| Rare | Reinforced |
| Epic | Masterwork |

Examples: "Cloth Crude Hood", "Armored Masterwork Chestplate", "Hide Reinforced Boots"

Legendary armor follows unique naming (see Section 2.7).

### 2.6 Shields (5 total)

Shields occupy the OFF slot and provide **defense only**. All previous shield mechanics are removed: no block chance, no break mechanic, no frontal arc, no special abilities.

**Equipping a shield sacrifices the off-hand weapon action slot** (Action Bar Slot 2). This is the core tradeoff: more defense vs. a second active ability.

Shields do NOT have an armor type. They are generic defense items.

| Rarity | Name | Defense | Stats | Special |
|--------|------|---------|-------|---------|
| Common | Wooden Buckler | 5 | +2 STR | — |
| Uncommon | Iron Kite Shield | 12 | +4 STR, +2 pDef | — |
| Rare | Reinforced Greatshield | 20 | +7 STR, +4 pDef | — |
| Epic | Fortress Shield | 25 | +11 STR, +6 pDef | — |
| Legendary | Worldstone Barrier | 30 | +15 STR, +8 pDef | +10 HP |

> **Note:** Legendary shield is a boss drop. Its 30 defense + a full Epic Stone set (99) = 129 total defense = 64.5% reduction. Safely under ceiling.

### 2.7 Legendary Equipment (Boss Drops)

Legendary items drop **only** from Boss encounters (one per floor boss). They are not subject to the floor rarity scaling — they are guaranteed unique drops from specific bosses.

Legendary weapons are defined in Section 1.2 (one per weapon type, 6 total).

Legendary armor — one per slot, unique named pieces with fixed armor type:

| Slot | Name | Armor Type | Base Def | Modifier | Final Def | HP | Stats | Special |
|------|------|-----------|----------|----------|-----------|----|-------|---------|
| Head | Crown of Embers | Stone | 22 | 1.1x | 24 | 18 | +14 STR | +10% fire resist |
| Chest | Voidheart Mantle | Ethereal | 30 | 0.6x | 18 | 8 | +18 INT | +20% spellEcho |
| Legs | Ironhide Greaves | Armored | 26 | 1.0x | 26 | 22 | +14 STR, +8 AGI | — |
| Feet | Windstrider Boots | Hide | 20 | 0.8x | 16 | 12 | +14 AGI | +15% movement speed |

> **Design note:** Legendary armor differentiates through special effects and high stats, not dramatically higher defense. This keeps them under the defense ceiling while still feeling like significant upgrades.

### 2.8 Systems to Remove

Delete the following entirely:

| System | File | Reason |
|--------|------|--------|
| Shield block mechanics | `shield-system.js` | Shields are pure defense now |
| Block chance calculation | `combat-system.js` | No block mechanic |
| Block arc detection | `combat-system.js` | No frontal arc |
| Shield break logic | `combat-system.js` | No break mechanic |

**Remove block chance from monster tier behavior:**

The tier resistance table previously included block percentages. Remove all block references:

| Tier | Old Block | New |
|------|-----------|-----|
| Fodder | 0% | Remove |
| Regular | 10% | Remove |
| Soldier | 20% | Remove |
| Elite | 30% | Remove |
| Boss | 40% | Remove |

> **Clarification:** This removes *player* block mechanics. If monsters have their own blocking/shielding behavior defined in the AI system, that is separate and not affected by this change.

---

## 3. Elemental System

### 3.1 Element Rolling on Drop

When a weapon or armor piece drops, it rolls for an elemental enchantment:

```javascript
const ENCHANTMENT_CONFIG = {
    noEnchantmentChance: 0.33,   // 33% chance of no element
    enchantmentChance: 0.67,     // 67% chance of random element
};

const ELEMENTS = [
    'fire', 'ice', 'water', 'earth', 'nature',
    'death', 'arcane', 'dark', 'holy', 'physical'
];

function rollElement() {
    if (Math.random() < ENCHANTMENT_CONFIG.noEnchantmentChance) {
        return null;  // No enchantment
    }
    return ELEMENTS[Math.floor(Math.random() * ELEMENTS.length)];
}
```

Each element has equal probability when an enchantment does roll: ~6.7% each.

### 3.2 Element Display

Enchanted items display the element in their name:

- No enchantment: "Steel Longsword"
- With enchantment: "Steel Longsword [Fire]" or "Steel Longsword [Ice]"

Armor follows the same pattern: "Armored Masterwork Chestplate [Holy]"

### 3.3 Element Matchup Table (Unchanged)

The existing elemental matchup table (Section 2.3 of the original analysis) is unchanged. Elements provide ±30% damage based on opposing elements.

| Element | Opposed By | Status Effect |
|---------|-----------|---------------|
| Fire | Ice, Water | Burning |
| Ice | Fire | Chilled |
| Water | Fire, Earth | Soaked |
| Earth | Water, Nature | Staggered |
| Nature | Fire, Death | Poisoned |
| Death | Holy, Nature | Withered |
| Arcane | Physical | Destabilized |
| Dark | Holy | Blinded |
| Holy | Dark, Death | Judged |
| Physical | Arcane | None |

### 3.4 Element Power by Rarity

When an item rolls an element, the element's power level is determined by the item's rarity:

| Rarity | Element Power |
|--------|--------------|
| Common | 1 |
| Uncommon | 2 |
| Rare | 3–4 |
| Epic | 5–6 |
| Legendary | 7 |

---

## 4. Monster Loot Tables

### 4.1 Monster-Specific Drops (Unchanged)

Monster-specific loot tables (materials, crafting components) are **not affected** by this document. The existing `monsterItemChance: 0.25` (25%) for monster-specific drops remains unchanged. See Appendix C of the original analysis for the complete monster loot table.

### 4.2 Monster Tier Definitions (Unchanged)

Monster stats, behavior, and tier definitions are **not affected** by this document. The existing tier system (Fodder, Regular, Soldier, Elite, Boss) and all associated HP, damage, speed, perception, and resistance values remain as-is.

**No floor-based stat scaling is applied to monsters.** A Tier 2 Regular on floor 10 has identical stats to a Tier 2 Regular on floor 1. Difficulty escalation comes from spawn composition (more Soldiers and Elites on deeper floors) as already defined in the spawn distribution tables.

### 4.3 Monster Spawn Composition (Unchanged)

The existing spawn distribution by dungeon depth is not modified:

| Depth | Fodder | Regular | Soldier | Elite |
|-------|--------|---------|---------|-------|
| Near Entrance (1-3) | 80% | 18% | 2% | 0% |
| Mid-Dungeon (4-6) | 50% | 35% | 12% | 3% |
| Deep Dungeon (7-10) | 25% | 35% | 30% | 10% |

---

## 5. Equipment Drop System

### 5.1 Drop Rate

Replace the existing drop rate configuration in `loot-system.js`:

```javascript
// OLD:
// equipmentDropChance: 0.08

// NEW:
const LOOT_CONFIG = {
    despawnTime: 120000,              // 120 seconds (was 60)
    monsterItemChance: 0.25,          // 25% monster-specific (unchanged)
    equipmentDropChance: 0.40,        // 40% chance per kill
    equipmentTypeWeights: {
        weapon: 0.50,                 // 50% of equipment drops are weapons
        armor: 0.50,                  // 50% are armor
    },
};
```

**Per-kill logic:**
1. Roll 40% for equipment drop
2. If success, roll 50/50 weapon or armor
3. Roll rarity based on current floor (see Section 5.2)
4. If weapon: select random weapon type, select rarity-appropriate weapon
5. If armor: select random armor type (from 5 player types), random slot, select rarity-appropriate piece
6. Roll element (see Section 3.1)
7. Spawn loot on ground

### 5.2 Floor-Based Rarity Weights

Rarity weights shift by floor. Deeper floors produce better gear:

```javascript
const FLOOR_RARITY_WEIGHTS = {
    1:  { common: 0.90, uncommon: 0.10, rare: 0.00, epic: 0.00 },
    2:  { common: 0.80, uncommon: 0.17, rare: 0.03, epic: 0.00 },
    3:  { common: 0.65, uncommon: 0.25, rare: 0.09, epic: 0.01 },
    4:  { common: 0.55, uncommon: 0.28, rare: 0.14, epic: 0.03 },
    5:  { common: 0.50, uncommon: 0.28, rare: 0.17, epic: 0.05 },
    6:  { common: 0.45, uncommon: 0.28, rare: 0.20, epic: 0.07 },
    7:  { common: 0.40, uncommon: 0.28, rare: 0.22, epic: 0.10 },
    8:  { common: 0.35, uncommon: 0.28, rare: 0.24, epic: 0.13 },
    9:  { common: 0.30, uncommon: 0.28, rare: 0.26, epic: 0.16 },
    10: { common: 0.25, uncommon: 0.28, rare: 0.28, epic: 0.19 },
};
```

**Expected drops per full run (500 kills, 40% drop rate = 200 equipment):**

| Rarity | Floor 1 Only | Full Run (all floors) |
|--------|-------------|----------------------|
| Common | 180 | ~100 |
| Uncommon | 20 | ~50 |
| Rare | 0 | ~35 |
| Epic | 0 | ~15 |

> **Legendary items are NOT part of this table.** They drop exclusively from boss kills as guaranteed unique rewards.

### 5.3 Equipment Drop Generation

```javascript
function generateEquipmentDrop(floor) {
    // 1. Determine weapon or armor
    const isWeapon = Math.random() < LOOT_CONFIG.equipmentTypeWeights.weapon;

    // 2. Roll rarity from floor table
    const rarity = rollRarity(FLOOR_RARITY_WEIGHTS[floor]);

    // 3. Roll element
    const element = rollElement();  // null or element string

    if (isWeapon) {
        // 4a. Random weapon type
        const weaponTypes = ['sword', 'mace', 'polearm', 'bow', 'dagger', 'staff'];
        const type = weaponTypes[Math.floor(Math.random() * weaponTypes.length)];
        return createWeapon(type, rarity, element);
    } else {
        // 4b. Random armor type and slot
        const armorTypes = ['cloth', 'hide', 'armored', 'stone', 'ethereal'];
        const slots = ['head', 'chest', 'legs', 'feet'];
        const type = armorTypes[Math.floor(Math.random() * armorTypes.length)];
        const slot = slots[Math.floor(Math.random() * slots.length)];
        return createArmor(type, slot, rarity, element);
    }
}

function rollRarity(weights) {
    const roll = Math.random();
    let cumulative = 0;
    for (const [rarity, weight] of Object.entries(weights)) {
        cumulative += weight;
        if (roll < cumulative) return rarity;
    }
    return 'common'; // Fallback
}
```

### 5.4 Shield Drops

Shields drop separately from the armor pool. When the 50/50 weapon/armor roll results in armor, there is an additional 15% chance it becomes a shield instead of a regular armor piece:

```javascript
// Inside the armor branch of generateEquipmentDrop:
if (Math.random() < 0.15) {
    return createShield(rarity, element);
} else {
    // Normal armor drop logic
}
```

This keeps shields rarer than regular armor (players only have one OFF slot) while still being findable.

### 5.5 Despawn Timer

Loot despawn increased from 60 seconds to **120 seconds** (120000ms). Blink warning still begins at 10 seconds before despawn (at 110 seconds elapsed).

---

## 6. Removed Systems

### 6.1 Removed Weapon Types

Delete all item definitions and associated logic for:

| Weapon Type | File | Count Removed |
|-------------|------|---------------|
| Crossbow | `weapons-ranged.js` | 8 items |
| Throwing | `weapons-ranged.js` | 12 items |
| Wands | `weapons-magic.js` | 16 items |
| Tomes | `weapons-magic.js` | 16 items |

### 6.2 Removed Specialties (Skill System Update)

Update the Skill System Implementation Spec v2.0:

| Removed Specialty | Removed Action | Proficiency |
|-------------------|----------------|-------------|
| `crossbow` | `piercing_bolt` | ranged |
| `throwing` | `fan_of_knives` | ranged |

Remove from `createFreshSkills()` in `skill-system.js`. Updated specialty count: **16** (down from 18).

### 6.3 Removed Shield Mechanics

| System | File | Action |
|--------|------|--------|
| `shield-system.js` | Entire file | Delete |
| Block chance calculation | `combat-system.js` | Remove block logic |
| Block arc / frontal detection | `combat-system.js` | Remove |
| Shield break tracking | `combat-system.js` | Remove |
| Block chance in tier resistances | `monster-tiers.js` | Remove block rows |

### 6.4 Removed Floor Stat Scaling

Delete the existing floor scaling logic that modifies monster stats:

```javascript
// DELETE all references to FLOOR_SCALING and getFloorScaling()
// Monster stats are defined per-tier and never modified by floor number
```

> **Critical:** Only the `FLOOR_SCALING` stat modification is removed. The spawn composition tables (Section 4.3) that control which tiers appear at which depth are preserved.

### 6.5 Removed Crafting Armor Types

Remove Scaled and Bone from any crafting recipes or armor generation that produces player equipment. These types remain valid in monster definitions only.

---

## 7. Noise System (Unchanged)

The noise system is not affected by this document. Weapons retain their noise ratings. Armor noise is determined by armor type:

| Armor Type | Noise Modifier |
|------------|---------------|
| Cloth | Silent (0) |
| Ethereal | Silent (0) |
| Hide | Quiet (10-15) |
| Armored | Standard (30-40) |
| Stone | Loud (40-50) |

---

## 8. Full Damage Pipeline (Revised)

With the changes from both this document and the Skill System spec, the complete damage formula is:

```
Final Damage =
    Base Weapon Damage
    × Stat Multiplier (1 + primaryStat × 0.03)
    × Skill Multiplier (1 + profLevel × 0.05 + specLevel × 0.05)
    × Action Multiplier (if using weapon action)
    × Critical Multiplier (1.5x if crit)
    × Weapon-Armor Type Modifier (0.7, 1.0, or 1.3)
    × Elemental Modifier (0.7, 1.0, or 1.3 based on element matchup)
    × Damage Amplification (marks/debuffs, if any)
    - Defense Reduction (damage × defense × 0.005)
    × Variance (0.95 to 1.05)
```

**Applied as:**

```javascript
function calculateFinalDamage(attacker, defender, options = {}) {
    let damage = options.baseWeaponDamage;

    // Multiplicative layers
    damage *= (1 + attacker.primaryStat * 0.03);                    // Stat
    damage *= getSkillDamageMultiplier(attacker, options.proficiency, options.specLevel); // Skill
    if (options.actionMultiplier) damage *= options.actionMultiplier; // Action
    if (options.isCrit) damage *= 1.5;                               // Crit
    damage *= getWeaponArmorModifier(options.weaponDamageType, defender.armorType); // Type
    damage *= getElementalModifier(options.element, defender.element); // Element
    if (options.damageAmp) damage *= options.damageAmp;              // Debuffs

    // Flat defense reduction
    const reduction = defender.totalDefense * 0.005;
    damage *= (1 - reduction);

    // Variance
    damage *= (0.95 + Math.random() * 0.10);

    return Math.floor(Math.max(1, damage)); // Minimum 1 damage
}
```

---

## 9. Files Affected

### Data Files

| File | Changes |
|------|---------|
| `js/data/weapons-melee.js` | Replace all definitions with 10 weapons (sword ×5, mace ×5) |
| `js/data/weapons-ranged.js` | Replace all definitions with 15 weapons (polearm ×5, bow ×5, dagger ×5) |
| `js/data/weapons-magic.js` | Replace all definitions with 5 weapons (staff ×5) |
| `js/data/armor-defense.js` | Replace with 80 armor pieces + 5 shields |
| `js/data/armor-mobility.js` | Merge into `armor-defense.js` (single armor file) |
| `js/data/armor-types.js` | Update to 8 types (add Cloth, keep Scaled/Bone for monsters) |
| `js/data/weapon-armor-matrix.js` | Update matrix with Cloth, remap Dagger to pierce |
| `js/data/items.js` | Remove wand/tome/crossbow/throwing related items |
| `js/data/monster-tiers.js` | Remove block chance from tier definitions |

### System Files

| File | Changes |
|------|---------|
| `js/systems/loot-system.js` | New drop rate (40%), floor-based rarity, element rolling, despawn 120s |
| `js/systems/shield-system.js` | **DELETE entire file** |
| `js/systems/combat-system.js` | Remove all block/shield mechanics |
| `js/systems/combat-master.js` | Remove block references |
| `js/utils/damage-calculator.js` | New defense formula (0.5% per point, no cap) |
| `js/data/weapon-armor-matrix.js` | Updated matchup table |
| `js/systems/skill-system.js` | Remove `crossbow`, `throwing` specialties and actions |

### UI Files

| File | Changes |
|------|---------|
| `js/ui/shop-ui.js` | Update for reduced item catalog |
| `js/ui/loadout-ui.js` | Update for reduced item catalog |
| `js/ui/character-overlay.js` | Remove block chance display |

---

## Appendix A: Design Constraints Checklist

These constraints must be validated whenever items are added or modified:

| Constraint | Rule | Validation |
|------------|------|------------|
| Max defense | No equipment combination > 134 total defense | Sum all slots at max rarity |
| Glass cannon HP | Cloth/Ethereal HP bonus = 30% of base | Check HP tier multiplier |
| Staff HP | Staffs never grant HP or Stamina bonuses | Audit staff definitions |
| Legendary defense | Legendary armor defense ≈ Epic (differentiate via specials) | Compare defense values |
| Element balance | 33% no enchantment, 67% random element | Verify rollElement() |
| No monster stat scaling | Monster HP/damage never modified by floor | Grep for floor scaling code |

## Appendix B: Quick Reference — Item Totals

| Category | Count | Notes |
|----------|-------|-------|
| Swords | 5 | Common through Legendary |
| Maces | 5 | Common through Legendary |
| Polearms | 5 | Common through Legendary |
| Bows | 5 | Common through Legendary |
| Daggers | 5 | Common through Legendary |
| Staffs | 5 | Common through Legendary |
| **Weapons Total** | **30** | |
| Armor (Cloth) | 16 | 4 slots × 4 rarities |
| Armor (Ethereal) | 16 | 4 slots × 4 rarities |
| Armor (Hide) | 16 | 4 slots × 4 rarities |
| Armor (Armored) | 16 | 4 slots × 4 rarities |
| Armor (Stone) | 16 | 4 slots × 4 rarities |
| Legendary Armor | 4 | 1 per slot, unique |
| **Armor Total** | **84** | |
| Shields | 5 | Common through Legendary |
| **Grand Total** | **119** | Each can roll element variants |
