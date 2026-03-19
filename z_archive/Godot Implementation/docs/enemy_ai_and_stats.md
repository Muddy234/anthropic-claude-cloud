# Enemy AI and Stats Documentation

This document outlines the current enemy AI behavior, attack styles, and complete list of enemies with their stats and behaviors.

---

## Table of Contents

1. [Arena Combat AI Overview](#arena-combat-ai-overview)
2. [Attack Styles](#attack-styles)
3. [Pip Economy](#pip-economy)
4. [Enemy List](#enemy-list)
5. [Monster Tiers](#monster-tiers)
6. [Behavior Types](#behavior-types)
7. [Configuration Files](#configuration-files)

---

## Arena Combat AI Overview

The arena combat uses a tactical AI system based on **"Option Restriction"** strategy. The AI analyzes the player's possible moves and selects attacks that maximize coverage while forcing expensive escapes.

### AI Decision Process

1. **Build Reachability Map** - Calculate all tiles the player can reach given their current pips
2. **Generate Attack Plans** - Evaluate all possible move + attack combinations
3. **Score Each Plan** - Based on:
   - Tiles covered (options removed from player)
   - Guaranteed hit on player's current position
   - Lethal damage potential
   - Escape cost forced on player
   - Corner/edge trapping
4. **Coordinate with Allies** - In multi-enemy fights, avoid redundant coverage
5. **Execute Best Plan** - Queue moves and attacks

### Scoring Factors

| Factor | Score Impact |
|--------|--------------|
| Tiles covered | +100 per tile |
| Guaranteed hit | +50 |
| Lethal damage | +200 |
| Forces corner escape | +30 |
| High escape cost | +25 per pip |
| Zero coverage (no threat) | -1000 (rejected) |

---

## Attack Styles

### Light Attack
- **Cost:** 1 pip
- **Priority:** 1 (Fast - executes first)
- **Range:** Adjacent tiles (1 tile)
- **Damage:** Base attack stat

### Heavy Attack
- **Cost:** 3 pips
- **Priority:** 3 (Slow - executes last)
- **Damage:** Base attack * 1.5

#### Heavy Attack Patterns

| Pattern | Description | Affected Tiles |
|---------|-------------|----------------|
| **ADJACENT** | Single target | 1 adjacent tile |
| **ROW_SWEEP** | Horizontal line | All tiles in enemy's row (excluding self) |
| **COLUMN_SWEEP** | Vertical line | All tiles in enemy's column (excluding self) |
| **NOVA** | Area burst | All 8 surrounding tiles |

### Current Limitation

> **Note:** All enemies currently have access to ALL attack patterns. The tactical AI chooses the optimal pattern based on coverage analysis. Per-enemy pattern restrictions are not yet implemented in MonsterData.

---

## Pip Economy

| Constant | Value |
|----------|-------|
| Maximum Pips | 5 |
| Pip Regeneration | 2 per turn |
| Light Attack Cost | 1 pip |
| Heavy Attack Cost | 3 pips |
| Move Cost | 1 pip (1st), 2 pips (2nd), 3 pips (3rd) |

---

## Enemy List

### Giant Rat

| Stat | Value |
|------|-------|
| **ID** | `rat` |
| **Tier** | TIER_3 (Weak) |
| **HP** | 15 |
| **Attack** | 8 |
| **Defense** | 1 |
| **Speed** | 12 |
| **Vision Range** | 5 |
| **Attack Range** | 1 (melee) |
| **XP Value** | 10 |
| **Behavior** | Pack |
| **Flees** | No (default) |
| **Floor Range** | 1-5 |
| **Spawn Weight** | 100.0 (very common) |

**Description:** *A common dungeon pest, grown large on magical refuse.*

---

### Goblin

| Stat | Value |
|------|-------|
| **ID** | `goblin` |
| **Tier** | TIER_3 (Weak) |
| **HP** | 25 |
| **Attack** | 10 |
| **Defense** | 2 |
| **Speed** | 10 |
| **Vision Range** | 6 |
| **Attack Range** | 1 (melee) |
| **XP Value** | 20 |
| **Behavior** | Pack |
| **Flees** | Yes |
| **Floor Range** | 1-8 |
| **Spawn Weight** | 80.0 (common) |

**Description:** *A cunning creature that fights in packs and retreats when wounded.*

---

### Goblin Archer

| Stat | Value |
|------|-------|
| **ID** | `goblin_archer` |
| **Tier** | TIER_3 (Weak) |
| **HP** | 18 |
| **Attack** | 11 |
| **Defense** | 1 |
| **Speed** | 9 |
| **Vision Range** | 8 |
| **Attack Range** | 6 (ranged) |
| **XP Value** | 25 |
| **Behavior** | Pack |
| **Preferred Range** | 6 |
| **Kites** | Yes |
| **Flees** | Yes |
| **Floor Range** | 2-8 |
| **Spawn Weight** | 50.0 (uncommon) |

**Description:** *A goblin that prefers to attack from a distance.*

---

### Skeleton Warrior

| Stat | Value |
|------|-------|
| **ID** | `skeleton` |
| **Tier** | TIER_2 (Normal) |
| **Family** | Undead |
| **HP** | 40 |
| **Attack** | 14 |
| **Defense** | 4 |
| **Speed** | 8 |
| **Vision Range** | 7 |
| **Attack Range** | 1 (melee) |
| **XP Value** | 35 |
| **Behavior** | Tactical |
| **Flees** | No |
| **Floor Range** | 3-10 |
| **Spawn Weight** | 60.0 (moderate) |

**Description:** *An undead soldier, still wielding its ancient weapon.*

---

### Orc Warlord (BOSS)

| Stat | Value |
|------|-------|
| **ID** | `orc_warlord` |
| **Tier** | BOSS |
| **HP** | 150 |
| **Attack** | 25 |
| **Defense** | 10 |
| **Speed** | 7 |
| **Vision Range** | 8 |
| **Attack Range** | 1 (melee) |
| **XP Value** | 200 |
| **Behavior** | Dominant |
| **Can Command** | Yes |
| **Aggression** | 0.8 |
| **Flees** | No |
| **Floor Range** | 5-10 |
| **Spawn Weight** | 10.0 (rare) |

**Description:** *A fearsome orc chieftain who commands lesser creatures in battle.*

---

## Monster Tiers

| Tier | Name | Default XP | UI Color |
|------|------|------------|----------|
| TIER_3 | Weak | 15 | Gray |
| TIER_2 | Normal | 30 | White |
| TIER_1 | Veteran | 55 | Blue |
| ELITE | Elite | 100 | Orange |
| BOSS | Boss | 500 | Red |

---

## Behavior Types

| Behavior | Description |
|----------|-------------|
| **pack** | Fights in groups, may flee when alone |
| **tactical** | Uses positioning and strategic attacks |
| **dominant** | Leader type, can command other monsters |
| **solitary** | Fights alone, doesn't group |
| **swarm** | Overwhelming numbers, simple attacks |

### Additional Behavior Flags

| Flag | Effect |
|------|--------|
| `flees_behavior` | Will retreat when HP drops below threshold |
| `flee_threshold` | HP percentage to trigger flee (default: 25%) |
| `kites_behavior` | Maintains preferred range, backs away from player |
| `preferred_range` | Ideal distance to maintain from player |
| `can_command` | Can issue orders to other monsters |
| `can_be_commanded` | Responds to leader commands |
| `pack_courage` | Braver when allies are nearby |
| `aggression` | 0-1 value affecting combat decisions |

---

## Configuration Files

### Monster Data Location
```
resources/monsters/
├── rat.tres
├── goblin.tres
├── goblin_archer.tres
├── skeleton.tres
└── orc_warlord.tres
```

### Key Source Files

| File | Purpose |
|------|---------|
| `scripts/data/monsters/monster_data.gd` | MonsterData resource class definition |
| `autoload/constants.gd` | Combat constants, enums, pip costs |
| `scripts/systems/combat/arena/arena_enemy_ai.gd` | Arena tactical AI |
| `scripts/systems/combat/arena/tactical_analyzer.gd` | Attack plan generation and scoring |
| `scripts/systems/combat/arena/actions/pattern_attack_action.gd` | Pattern attack implementation |
| `scenes/entities/enemy/enemy.gd` | Enemy entity class |

---

## Future Considerations

### Per-Enemy Attack Pattern Restrictions

Currently not implemented. Potential addition to MonsterData:
```gdscript
@export var allowed_attack_patterns: Array[Constants.HeavyAttackPattern] = []
```

This would allow:
- Rats: Only ADJACENT
- Skeletons: ADJACENT, ROW_SWEEP
- Bosses: All patterns

### Arena-Specific Stats

Could add to MonsterData:
```gdscript
@export_group("Arena Combat")
@export var arena_pip_bonus: int = 0  # Extra starting pips
@export var arena_regen_bonus: int = 0  # Extra pip regen per turn
@export var heavy_attack_preference: float = 0.5  # 0-1, likelihood to use heavy attacks
```
