# Economy & Crafting System Design

## Core Philosophy

> **Gold buys materials. Loot enables upgrades. Risk creates value.**

The overworld is a preparation hub, not a shopping mall. Players use resources to:
1. Upgrade gear (which is **LOST FOREVER** on death)
2. Restock basic supplies
3. Stash valuable loot for future upgrades

---

## Final Design Decisions

| Question | Decision |
|----------|----------|
| Can uncommon/rare materials be bought? | **NO** - Only common raw materials are buyable. Uncommon/rare must be crafted. |
| What material line for bows? | **Wood** |
| What material line for staves? | **Cloth** |
| Can players downgrade items for materials? | **NO** |
| Is there crafting failure chance? | **NO** |
| What happens to +3 gear on death? | **LOST FOREVER** |

---

## Currency Hierarchy

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CURRENCY HIERARCHY                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   DUNGEON LOOT (Primary)          GOLD (Secondary)                  │
│   ════════════════════            ════════════════                  │
│   • Monster drops                 • Sell loot for gold              │
│   • Chest contents                • Buy RAW MATERIALS only          │
│   • Boss rewards                  • Cannot buy finished gear        │
│   • Equipment drops               • Cannot buy dungeon loot         │
│                                                                     │
│   MONSTERS DO NOT DROP GOLD - ONLY LOOT                             │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Material System

### 6 Primary Material Lines

Each line has 3 tiers: **Common** (buy) → **Uncommon** (craft) → **Rare** (craft + dungeon drop)

#### 1. METAL LINE (Melee Weapons, Heavy Armor)

| Tier | Material | Source | Gold Cost |
|------|----------|--------|-----------|
| Common | Iron Ore | Buy from Blacksmith | 15g |
| Uncommon | Steel Ingot | Craft: Iron Ore ×3 + Coal ×2 | ~55g equivalent |
| Rare | Mithril Bar | Craft: Steel Ingot ×2 + Crystal Shard (T2 drop) | ~110g + dungeon |

#### 2. LEATHER LINE (Light Armor, Accessories)

| Tier | Material | Source | Gold Cost |
|------|----------|--------|-----------|
| Common | Leather Scraps | Buy from General Store | 12g |
| Uncommon | Cured Leather | Craft: Leather Scraps ×3 + Binding Thread ×1 | ~42g equivalent |
| Rare | Hardened Hide | Craft: Cured Leather ×2 + Demon Essence (T2 drop) | ~84g + dungeon |

#### 3. CLOTH LINE (Robes, Staves, Magic Gear)

| Tier | Material | Source | Gold Cost |
|------|----------|--------|-----------|
| Common | Cloth Bolts | Buy from General Store | 10g |
| Uncommon | Woven Fabric | Craft: Cloth Bolts ×3 + Binding Thread ×1 | ~36g equivalent |
| Rare | Enchanted Silk | Craft: Woven Fabric ×2 + Spider Silk (T2 drop) | ~72g + dungeon |

#### 4. HERB LINE (Potions, Consumables)

| Tier | Material | Source | Gold Cost |
|------|----------|--------|-----------|
| Common | Herb Bundle | Buy from Alchemist | 12g |
| Uncommon | Refined Extract | Craft: Herb Bundle ×3 + Empty Vial ×2 | ~42g equivalent |
| Rare | Pure Essence | Craft: Refined Extract ×2 + Demon Essence (T2 drop) | ~84g + dungeon |

#### 5. WOOD LINE (Bows, Ranged Weapons)

| Tier | Material | Source | Gold Cost |
|------|----------|--------|-----------|
| Common | Timber | Buy from General Store | 10g |
| Uncommon | Treated Wood | Craft: Timber ×3 + Wax ×1 | ~34g equivalent |
| Rare | Ironwood | Craft: Treated Wood ×2 + Crystal Shard (T2 drop) | ~68g + dungeon |

#### 6. ALCHEMICAL LINE (Bombs, Coatings, Fire Kits)

| Tier | Material | Source | Gold Cost |
|------|----------|--------|-----------|
| Common | Oil Flask | Buy from Alchemist | 8g |
| Uncommon | Alchemical Base | Craft: Oil Flask ×3 + Empty Vial ×1 | ~27g equivalent |
| Rare | Volatile Compound | Craft: Alchemical Base ×2 + Fire Mote (T2 drop) | ~54g + dungeon |

### 4 Utility Materials (No Tiers)

| Material | Price | Sold By | Used For |
|----------|-------|---------|----------|
| Coal | 5g | Blacksmith | Metal crafting fuel |
| Binding Thread | 6g | General Store | Leather/Cloth crafting |
| Empty Vial | 3g | Alchemist | Potion containers |
| Wax | 4g | General Store | Wood treatment |

---

## Weapon/Armor Material Assignments

| Equipment Type | Material Line |
|----------------|---------------|
| Swords, Axes, Maces | Metal |
| Daggers | Metal |
| Bows, Crossbows | Wood |
| Staves, Wands | Cloth |
| Plate Armor (Heavy) | Metal |
| Chainmail (Medium) | Metal |
| Leather Armor (Light) | Leather |
| Robes (Cloth) | Cloth |
| Shields | Metal |

---

## Dungeon Loot Tiers

### Crafting Materials (30% drop rate)

| Tier | Floors | Examples | Used For |
|------|--------|----------|----------|
| T1 | 1-2 | Monster Fangs, Bone Fragments, Rat Tails | +1 upgrades |
| T2 | 3-4 | Spider Silk, Demon Essence, Crystal Shards | +2 upgrades, Rare material crafting |
| Elite | Bosses | Ancient Core, Void Fragment, Dragon Heart | +3 upgrades |

### Sellable Loot (50% drop rate) - NOT for crafting

| Tier | Examples | Sell Value |
|------|----------|------------|
| T1 | Old Coins, Cracked Gems, Dusty Trinkets | 3-12g |
| T2 | Silver Coins, Ruby Chips, Ancient Medallions | 10-30g |
| T3 | Gold Coins, Flawless Gems, Royal Signets | 25-75g |
| Elite | Treasure Contents, Ancient Artifacts | 100-150g |

---

## Upgrade System

### Rules
- **NO crafting new weapons** - Only upgrade existing items found in dungeon
- **Max 3 upgrades** per item (+1, +2, +3)
- **All base stats increase** with each upgrade
- **Lost forever on death** - No recovery, no degrading

### Stat Multipliers

| Upgrade | Multiplier | Example: 10 dmg weapon |
|---------|------------|------------------------|
| Base | 1.00x | 10 damage |
| +1 | 1.15x | 11.5 → 12 damage |
| +2 | 1.35x | 13.5 → 14 damage |
| +3 | 1.60x | 16 damage |

### Upgrade Recipes by Material Line

#### Metal Weapons (Swords, Axes, Maces, Daggers)

| Upgrade | Overworld Materials | Dungeon Materials |
|---------|--------------------|--------------------|
| +1 | Iron Ore ×2 + Coal ×1 | T1 Drop ×3 |
| +2 | Steel Ingot ×2 + Coal ×1 | T2 Drop ×2 |
| +3 | Mithril Bar ×1 + Coal ×2 | Elite Drop ×1 |

#### Wood Weapons (Bows, Crossbows)

| Upgrade | Overworld Materials | Dungeon Materials |
|---------|--------------------|--------------------|
| +1 | Timber ×2 + Wax ×1 | T1 Drop ×3 |
| +2 | Treated Wood ×2 + Wax ×1 | T2 Drop ×2 |
| +3 | Ironwood ×1 + Wax ×2 | Elite Drop ×1 |

#### Cloth Weapons (Staves, Wands)

| Upgrade | Overworld Materials | Dungeon Materials |
|---------|--------------------|--------------------|
| +1 | Cloth Bolts ×2 + Binding Thread ×1 | T1 Drop ×3 |
| +2 | Woven Fabric ×2 + Binding Thread ×1 | T2 Drop ×2 |
| +3 | Enchanted Silk ×1 + Binding Thread ×2 | Elite Drop ×1 |

#### Metal Armor (Plate, Chain, Shields)

| Upgrade | Overworld Materials | Dungeon Materials |
|---------|--------------------|--------------------|
| +1 | Iron Ore ×2 + Coal ×1 | T1 Drop ×3 |
| +2 | Steel Ingot ×2 + Coal ×1 | T2 Drop ×2 |
| +3 | Mithril Bar ×1 + Coal ×2 | Elite Drop ×1 |

#### Leather Armor (Light Armor, Accessories)

| Upgrade | Overworld Materials | Dungeon Materials |
|---------|--------------------|--------------------|
| +1 | Leather Scraps ×2 + Binding Thread ×1 | T1 Drop ×3 |
| +2 | Cured Leather ×2 + Binding Thread ×1 | T2 Drop ×2 |
| +3 | Hardened Hide ×1 + Binding Thread ×2 | Elite Drop ×1 |

#### Cloth Armor (Robes)

| Upgrade | Overworld Materials | Dungeon Materials |
|---------|--------------------|--------------------|
| +1 | Cloth Bolts ×2 + Binding Thread ×1 | T1 Drop ×3 |
| +2 | Woven Fabric ×2 + Binding Thread ×1 | T2 Drop ×2 |
| +3 | Enchanted Silk ×1 + Binding Thread ×2 | Elite Drop ×1 |

---

## Potion Crafting

Potions CAN be crafted (unlike weapons/armor). Base potions require overworld materials + T1 drops.

| Potion | Recipe |
|--------|--------|
| Health Potion | Herb Bundle ×2 + Empty Vial ×1 + T1 Drop ×2 |
| Health Potion +1 | Refined Extract ×1 + Empty Vial ×1 + T1 Drop ×3 |
| Health Potion +2 | Refined Extract ×2 + Empty Vial ×1 + T2 Drop ×2 |
| Health Potion +3 | Pure Essence ×1 + Empty Vial ×2 + Elite Drop ×1 |

| Upgrade | Heal Amount |
|---------|-------------|
| Base | 50 HP |
| +1 | 75 HP |
| +2 | 100 HP |
| +3 | 150 HP |

---

## Vendor Inventories (Final)

### Blacksmith (Tormund)
**Sells:** Raw metals, smithing supplies
**Services:** Upgrade weapons/armor

| Item | Price | Category |
|------|-------|----------|
| Iron Ore | 15g | Raw Material |
| Coal | 5g | Utility |
| Whetstone | 10g | Basic Supply |
| Repair Kit | 20g | Basic Supply |

### Alchemist (Zephyr)
**Sells:** Herbs, vials, alchemical supplies
**Services:** Craft/upgrade potions

| Item | Price | Category |
|------|-------|----------|
| Herb Bundle | 12g | Raw Material |
| Oil Flask | 8g | Raw Material |
| Empty Vial | 3g | Utility |
| Bandage | 5g | Basic Supply |
| Basic Antidote | 8g | Basic Supply |

### General Store (Helena)
**Sells:** Leather, cloth, wood, utility items
**Services:** Buy/Sell loot

| Item | Price | Category |
|------|-------|----------|
| Leather Scraps | 12g | Raw Material |
| Cloth Bolts | 10g | Raw Material |
| Timber | 10g | Raw Material |
| Binding Thread | 6g | Utility |
| Wax | 4g | Utility |
| Torch | 3g | Basic Supply |
| Rope | 8g | Basic Supply |

### Innkeeper (Rosie)
**Sells:** Food only
**Services:** Rest, Rumors

| Item | Price | Category |
|------|-------|----------|
| Bread | 3g | Basic Supply (10 HP) |
| Stew | 8g | Basic Supply (25 HP) |
| Ale | 5g | Basic Supply (+Courage) |
| Trail Rations | 10g | Basic Supply (15 HP over time) |

---

## Full Upgrade Cost Analysis

### Assumptions
- 30% drop rate for crafting materials
- 6 gear slots (Weapon + 5 Armor)
- Loot sells for ~80g per successful run average

### Full +3 Metal Build (Warrior)

| Stage | Gold | T1 Kills | T2 Kills | Boss Kills | Est. Runs |
|-------|------|----------|----------|------------|-----------|
| All +1 | 210g | 60 | 0 | 0 | 5-8 |
| All +2 | 900g | 60 | 40 | 0 | 12-18 |
| All +3 | 1,620g | 60 | 60 | 6 | 25-35 |

### Full +3 Leather Build (Rogue)

| Stage | Gold | T1 Kills | T2 Kills | Boss Kills | Est. Runs |
|-------|------|----------|----------|------------|-----------|
| All +1 | 180g | 60 | 0 | 0 | 5-8 |
| All +2 | 720g | 60 | 40 | 0 | 10-15 |
| All +3 | 1,296g | 60 | 60 | 6 | 20-30 |

### Full +3 Cloth Build (Mage)

| Stage | Gold | T1 Kills | T2 Kills | Boss Kills | Est. Runs |
|-------|------|----------|----------|------------|-----------|
| All +1 | 156g | 60 | 0 | 0 | 4-7 |
| All +2 | 624g | 60 | 40 | 0 | 10-15 |
| All +3 | 1,128g | 60 | 60 | 6 | 20-28 |

---

## Risk/Reward Loop

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RISK/REWARD LOOP                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   VILLAGE (Safe)                                                    │
│       │                                                             │
│       │ Prepare: Buy mats, Upgrade gear, Restock                    │
│       ▼                                                             │
│   DUNGEON (Danger)                                                  │
│       │                                                             │
│       ├─── Extract ──► Keep EVERYTHING (gear, loot, upgrades)       │
│       │                                                             │
│       └─── Die ──► LOSE EVERYTHING equipped/carried                 │
│                    (gear GONE FOREVER, even +3 items)               │
│                    Keep: Bank items, skills, shortcuts              │
│                                                                     │
│   STRATEGY: Bank backup gear. Don't risk +3 unless necessary.       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Implementation Checklist

### Phase 1: Material Definitions
- [ ] Create `js/data/raw-materials.js` with 6 lines × 3 tiers
- [ ] Define crafting recipes for uncommon/rare materials
- [ ] Add utility materials

### Phase 2: Vendor Overhaul
- [ ] Update `shop-ui.js` inventories (remove weapons/armor)
- [ ] Add Helena (General Store) to NPCs
- [ ] Update Blacksmith, Alchemist, Innkeeper inventories

### Phase 3: Loot System Changes
- [ ] Modify `loot-system.js` to NOT drop gold
- [ ] Add sellable loot tables (separate from crafting mats)
- [ ] Implement 30% crafting mat / 50% sellable split

### Phase 4: Upgrade System
- [ ] Create `js/systems/upgrade-system.js`
- [ ] Add `upgradeLevel` property to items
- [ ] Implement stat multipliers
- [ ] Create upgrade UI in village

### Phase 5: Potion Crafting
- [ ] Define potion recipes
- [ ] Implement potion crafting UI
- [ ] Add upgraded potion variants

### Phase 6: Testing & Balance
- [ ] Verify gold economy flow
- [ ] Test upgrade costs feel right
- [ ] Ensure +3 gear is meaningful achievement

---

*Document finalized with user decisions. Ready for implementation.*
