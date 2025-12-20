# Economy & Crafting System Design

## Core Philosophy

> **Gold buys materials. Loot enables upgrades. Risk creates value.**

The overworld is a preparation hub, not a shopping mall. Players use resources to:
1. Upgrade gear (which can be lost on death)
2. Restock basic supplies
3. Stash valuable loot for future upgrades

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
│   • Floor completion              • Cannot buy dungeon loot         │
│                                                                     │
│   Used for:                       Used for:                         │
│   • Crafting recipes              • Raw material purchases          │
│   • Upgrade requirements          • Basic supply restocking         │
│   • Special unlocks               • Service fees (repair, etc.)     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Item Categories

### 1. RAW MATERIALS (Bought with Gold)
Basic crafting ingredients from vendors.

| Material | Price | Used For |
|----------|-------|----------|
| Iron Ore | 15g | Weapons, Armor |
| Leather Scraps | 10g | Light Armor, Accessories |
| Cloth Bolts | 8g | Robes, Bandages |
| Herb Bundle | 12g | Potions, Salves |
| Coal | 5g | Smithing fuel |
| Oil Flask | 10g | Weapon coating, Fire kits |
| Empty Vials | 3g | Potion crafting |
| Binding Thread | 6g | Armor repair, Crafting |

### 2. DUNGEON LOOT (Found in Dungeon)
Cannot be purchased - must be earned through risk.

| Loot Type | Source | Rarity | Used For |
|-----------|--------|--------|----------|
| Monster Fangs | Beasts | Common | Weapon upgrades |
| Bone Fragments | Skeletons | Common | Armor reinforcement |
| Spider Silk | Spiders | Uncommon | Light armor crafting |
| Demon Essence | Demons | Uncommon | Enchantments |
| Crystal Shards | Golems | Rare | Magical weapons |
| Dragon Scale | Dragons | Rare | Elite armor |
| Ancient Core | Bosses | Epic | Legendary crafting |
| Void Fragment | Deep floors | Epic | Special upgrades |

### 3. FINISHED GOODS (Crafted)
Created by combining raw materials + dungeon loot.

| Item | Recipe | Result |
|------|--------|--------|
| Iron Sword +1 | Iron Ore x2 + Monster Fangs x3 | 12 damage weapon |
| Reinforced Leather | Leather x2 + Spider Silk x1 | 5 defense armor |
| Health Potion | Herb Bundle + Empty Vial + Demon Essence | Restore 75 HP |
| Fire Bomb | Oil Flask + Coal + Crystal Shard | AOE fire damage |

### 4. BASIC SUPPLIES (Bought Ready-Made)
Simple consumables that don't require dungeon loot.

| Supply | Price | Effect |
|--------|-------|--------|
| Bandage | 5g | Heal 15 HP (slow) |
| Torch | 3g | Light in dark areas |
| Rope | 8g | Escape tool |
| Rations | 4g | Prevent hunger debuff |
| Whetstone | 10g | Temporary +2 damage |
| Antidote (Basic) | 8g | Cure weak poison |

---

## Crafting Flow

```
                            ┌─────────────────┐
                            │   DUNGEON RUN   │
                            └────────┬────────┘
                                     │
                    ┌────────────────┼────────────────┐
                    ▼                ▼                ▼
              ┌──────────┐    ┌──────────┐    ┌──────────┐
              │  GOLD    │    │  LOOT    │    │EQUIPMENT │
              │ (drops)  │    │(monsters)│    │ (chests) │
              └────┬─────┘    └────┬─────┘    └────┬─────┘
                   │               │               │
                   ▼               │               ▼
            ┌────────────┐         │         ┌──────────┐
            │   VENDOR   │         │         │  EQUIP   │
            │ Buy Mats   │         │         │  or BANK │
            └─────┬──────┘         │         └──────────┘
                  │                │
                  ▼                ▼
            ┌──────────────────────────────┐
            │         RAW MATERIALS        │
            │   (Iron, Leather, Herbs)     │
            └──────────────┬───────────────┘
                           │
                           ▼
            ┌──────────────────────────────┐
            │         CRAFTING STATION     │◄──── DUNGEON LOOT
            │   (Blacksmith, Alchemist)    │      (Fangs, Silk, Essence)
            └──────────────┬───────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │ WEAPONS  │    │  ARMOR   │    │ POTIONS  │
    │ (Craft)  │    │ (Craft)  │    │ (Craft)  │
    └──────────┘    └──────────┘    └──────────┘
```

---

## Upgrade System

### Weapon Upgrade Path

```
┌─────────────────────────────────────────────────────────────────────┐
│                      WEAPON UPGRADE PATH                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  BASE WEAPON                                                        │
│  ══════════                                                         │
│  Iron Sword (8 dmg)                                                 │
│       │                                                             │
│       ▼                                                             │
│  ┌─────────────────────────────────────────┐                        │
│  │ UPGRADE +1                              │                        │
│  │ Cost: Iron Ore x1 + Monster Fangs x3   │                        │
│  │ Result: Iron Sword +1 (10 dmg)          │                        │
│  └─────────────────────┬───────────────────┘                        │
│                        ▼                                            │
│  ┌─────────────────────────────────────────┐                        │
│  │ UPGRADE +2                              │                        │
│  │ Cost: Iron Ore x2 + Bone Fragments x5   │                        │
│  │ Result: Iron Sword +2 (12 dmg)          │                        │
│  └─────────────────────┬───────────────────┘                        │
│                        ▼                                            │
│  ┌─────────────────────────────────────────┐                        │
│  │ UPGRADE +3 (Requires Rare Loot)         │                        │
│  │ Cost: Steel Ingot x1 + Crystal Shard x2 │                        │
│  │ Result: Iron Sword +3 (15 dmg)          │                        │
│  └─────────────────────┬───────────────────┘                        │
│                        ▼                                            │
│  ┌─────────────────────────────────────────┐                        │
│  │ TRANSFORM (Requires Epic Loot)          │                        │
│  │ Cost: Iron Sword +3 + Ancient Core x1   │                        │
│  │ Result: Runic Blade (20 dmg + effect)   │                        │
│  └─────────────────────────────────────────┘                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Armor Upgrade Path

```
┌─────────────────────────────────────────────────────────────────────┐
│                      ARMOR UPGRADE PATH                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Leather Vest (3 def)                                               │
│       │                                                             │
│       ├──► +1: Leather x1 + Spider Silk x2 → (5 def)                │
│       │                                                             │
│       ├──► +2: Leather x2 + Demon Essence x1 → (7 def)              │
│       │                                                             │
│       └──► +3: Hardened Leather + Dragon Scale → (10 def)           │
│                                                                     │
│  Chainmail (5 def)                                                  │
│       │                                                             │
│       ├──► +1: Iron Ore x2 + Bone Fragments x4 → (7 def)            │
│       │                                                             │
│       ├──► +2: Steel Ingot x1 + Crystal Shard x1 → (10 def)         │
│       │                                                             │
│       └──► +3: Steel x2 + Void Fragment → (14 def)                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Vendor Roles (Revised)

### Blacksmith (Tormund)
**Sells:** Raw metals, smithing supplies
**Services:** Weapon/Armor crafting, Upgrades, Repairs

| Item | Price | Category |
|------|-------|----------|
| Iron Ore | 15g | Raw Material |
| Steel Ingot | 45g | Raw Material |
| Coal | 5g | Raw Material |
| Binding Wire | 8g | Raw Material |
| Whetstone | 10g | Basic Supply |
| Repair Kit | 20g | Basic Supply |

**Crafting Menu:**
- Craft new weapons (requires materials + loot)
- Upgrade existing weapons (+1, +2, +3)
- Repair damaged gear

---

### Alchemist (Zephyr)
**Sells:** Herbs, vials, alchemical bases
**Services:** Potion crafting, Enchanting

| Item | Price | Category |
|------|-------|----------|
| Herb Bundle | 12g | Raw Material |
| Empty Vial | 3g | Raw Material |
| Alchemical Base | 20g | Raw Material |
| Purified Water | 5g | Raw Material |
| Bandage | 5g | Basic Supply |
| Basic Antidote | 8g | Basic Supply |

**Crafting Menu:**
- Craft potions (requires herbs + monster drops)
- Create bombs (requires oil + crystal shards)
- Brew elixirs (temporary buffs)

---

### General Store (NEW - Helena)
**Sells:** Basic supplies, utility items
**Services:** Buy/Sell, Storage overflow

| Item | Price | Category |
|------|-------|----------|
| Torch | 3g | Basic Supply |
| Rope | 8g | Basic Supply |
| Rations | 4g | Basic Supply |
| Leather Scraps | 10g | Raw Material |
| Cloth Bolts | 8g | Raw Material |
| Oil Flask | 10g | Raw Material |

---

### Innkeeper (Rosie)
**Sells:** Food, drink (cheap heals)
**Services:** Rest (full heal), Rumors

| Item | Price | Category |
|------|-------|----------|
| Bread | 3g | Basic Supply |
| Stew | 8g | Basic Supply |
| Ale | 5g | Basic Supply |
| Trail Rations | 10g | Basic Supply |

---

## Risk/Reward Loop

```
┌─────────────────────────────────────────────────────────────────────┐
│                        RISK/REWARD LOOP                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐                                                   │
│   │   VILLAGE   │◄────────────────────────────────┐                 │
│   │ (Safe Zone) │                                 │                 │
│   └──────┬──────┘                                 │                 │
│          │                                        │                 │
│          │ Prepare                                │ Extract         │
│          │ • Buy raw materials                    │ (Keep everything)│
│          │ • Craft/upgrade gear                   │                 │
│          │ • Restock supplies                     │                 │
│          ▼                                        │                 │
│   ┌─────────────┐                          ┌──────┴──────┐          │
│   │   DUNGEON   │─────────────────────────►│  EXTRACTION │          │
│   │  (Danger!)  │      Reach Exit          │    POINT    │          │
│   └──────┬──────┘                          └─────────────┘          │
│          │                                                          │
│          │ Die                                                      │
│          ▼                                                          │
│   ┌─────────────┐                                                   │
│   │   DEATH     │                                                   │
│   │ Lose:       │                                                   │
│   │ • Inventory │──────────────────────────────────────┐            │
│   │ • Gold held │                                      │            │
│   │ • Unbanked  │                                      ▼            │
│   │   loot      │                              ┌─────────────┐      │
│   │             │                              │   VILLAGE   │      │
│   │ Keep:       │                              │  (Respawn)  │      │
│   │ • Bank gold │                              │             │      │
│   │ • Bank items│                              │ Keep:       │      │
│   │ • Skills    │                              │ • Banked    │      │
│   │ • Shortcuts │                              │   items     │      │
│   └─────────────┘                              │ • Skills    │      │
│                                                │ • Progress  │      │
│                                                └─────────────┘      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Key Design Decisions

### 1. Why Gold Can't Buy Gear
- **Prevents grinding bypass** - Can't just farm gold and skip content
- **Makes dungeon runs meaningful** - Need specific drops for upgrades
- **Creates target farming** - "I need Spider Silk, going to floor 3"
- **Risk has value** - Losing loot hurts, creating tension

### 2. Why Upgrades Can Be Lost
- **Stakes matter** - Every run has real consequences
- **Decision tension** - "Do I risk my +3 sword or use backup?"
- **Progression isn't linear** - Can lose progress, rebuilding is part of game
- **Banking is strategic** - Store backup gear, don't risk everything

### 3. Why Basic Supplies Exist
- **Accessibility** - Always have something to buy
- **Gold sink** - Prevents gold hoarding
- **Low-risk prep** - Bandages are cheap, won't miss them
- **Bridge to next run** - Can always do another attempt

---

## Implementation Phases

### Phase 1: Item Categories
- [ ] Define raw materials in items.js
- [ ] Define dungeon loot drops in monsters
- [ ] Categorize existing items

### Phase 2: Vendor Overhaul
- [ ] Blacksmith sells raw metals only
- [ ] Alchemist sells herbs/vials only
- [ ] Create General Store (Helena)
- [ ] Remove finished goods from shops

### Phase 3: Crafting System
- [ ] Create crafting UI
- [ ] Define recipes
- [ ] Implement upgrade paths
- [ ] Add crafting stations to village

### Phase 4: Loot Integration
- [ ] Update monster drop tables
- [ ] Add loot to chests
- [ ] Implement loot rarity
- [ ] Balance drop rates

---

## Questions to Resolve

1. **Can upgraded gear be repaired after death?** (Rescue run mechanic?)
2. **Should there be a "stash run" option?** (Return to village mid-dungeon)
3. **How rare should epic loot be?** (1 in 100? 1 in 50?)
4. **Should crafting have failure chance?** (Risk/reward on crafting itself)
5. **Can players disassemble gear for materials?**

---

*This document is a living design spec. Update as decisions are made.*
