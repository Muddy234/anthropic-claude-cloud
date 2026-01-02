# Enemy AI and Stats Documentation

This document outlines the current enemy AI behavior, attack styles, and complete list of enemies with their stats and behaviors.

---

## Table of Contents

1. [Arena Combat AI Overview](#arena-combat-ai-overview)
2. [Arena Tiles](#arena-tiles)
   - [Hazards](#hazards)
   - [Obstacles](#obstacles)
3. [Behavior Types](#behavior-types)
   - [Behavior Synergies](#behavior-synergies)
4. [Attack Styles](#attack-styles)
5. [Pip Economy](#pip-economy)
6. [Enemy List](#enemy-list)
7. [Monster Tiers](#monster-tiers)
8. [Configuration Files](#configuration-files)

---

## Arena Combat AI Overview

The arena combat uses a tactical AI system with **behavior-based scoring** and **synergy coordination**. Each enemy has a behavior type that determines how it prioritizes tactical goals, and enemies receive bonus scoring for attacks that complement ally behaviors.

### AI Decision Process

1. **Load Behavior Weights** - Each enemy has a behavior that defines scoring priorities
2. **Build Reachability Map** - Calculate all tiles the player can reach given their current pips
3. **Build Ally Context** - Gather ally behaviors, covered tiles, and escape routes
4. **Generate Attack Plans** - Evaluate all possible move + attack combinations
5. **Score Each Plan** - Apply behavior-specific weights + synergy bonuses
6. **Execute Best Plan** - Queue moves and attacks

### Shared Goal, Individual Contribution

All enemies share the same goal: **defeat the player**. Each enemy's behavior determines *how* they contribute:

- **AGGRESSIVE** enemies deliver damage
- **STRATEGIC** enemies drain player resources
- **TACTICAL** enemies control the board

Synergy bonuses reward attacks that complement ally behaviors, creating emergent coordination.

---

## Arena Tiles

The 4x4 arena can contain special tile types that affect movement and combat. Tiles are randomly generated at the start of each battle, avoiding combatant spawn positions.

### Tile Types

| Type | Movement | Attacks | Effect |
|------|----------|---------|--------|
| **EMPTY** | Allowed | Pass through | Normal tile |
| **HAZARD** | Blocked | Pass through | Instant kill on contact |
| **OBSTACLE** | Blocked | Blocked | Provides cover |

### Hazards

Hazards are deadly tiles that instantly kill any combatant that lands on them.

**Key Mechanics:**
- **Voluntary Movement Blocked** - Neither player nor enemies can walk onto hazards
- **Push Allowed** - Combatants CAN be pushed into hazards (instant death)
- **Attacks Pass Through** - Hazards don't block attack patterns

**Tactical Implications:**
- TACTICAL enemies receive bonus scoring for herding player toward hazard-adjacent tiles
- Push mechanics can be used to eliminate enemies by pushing them into hazards
- Player must avoid being cornered near hazards

### Obstacles

Obstacles are impassable tiles that block both movement and attacks.

**Key Mechanics:**
- **Movement Blocked** - Cannot walk through obstacles
- **Attacks Blocked** - Row/Column sweeps STOP at obstacles, Nova skips obstacle tiles
- **Provides Cover** - Standing behind an obstacle protects from line attacks

**Tactical Implications:**
- Obstacles reduce effective attack coverage
- Can be used as defensive cover by player
- AI considers obstacles when calculating attack patterns

### Generation Constants

| Constant | Default Value |
|----------|---------------|
| `ARENA_MIN_HAZARDS` | 0 |
| `ARENA_MAX_HAZARDS` | 2 |
| `ARENA_MIN_OBSTACLES` | 0 |
| `ARENA_MAX_OBSTACLES` | 2 |

### AI Hazard Awareness

The AI scoring system includes a `hazard_adjacent` weight that rewards attacks forcing the player toward hazard-adjacent tiles:

| Behavior | Hazard Adjacent Weight |
|----------|------------------------|
| AGGRESSIVE | 50 (opportunistic use) |
| STRATEGIC | 40 (limits options) |
| TACTICAL | **200** (primary focus) |

---

## Behavior Types

Behaviors define the AI's **primary goal** during tactical combat. Each behavior applies different weights to the scoring system.

| Behavior | Goal | Primary Focus |
|----------|------|---------------|
| **AGGRESSIVE** | Kill the player | Damage and lethal hits |
| **STRATEGIC** | Bankrupt player pips | Force costly movement/escapes |
| **TACTICAL** | Corner the player | Minimize escape options |

### Scoring Weight Profiles

| Factor | Aggressive | Strategic | Tactical |
|--------|------------|-----------|----------|
| Guaranteed hit | **150** | 25 | 50 |
| Lethal damage | **1000** | 100 | 100 |
| Tiles covered | 25 | 75 | **200** |
| Escape cost | 5 | **60** | 30 |
| Forces corner | 10 | 30 | **150** |
| Hazard adjacent | 50 | 40 | **200** |
| Pip cost penalty | 3 | 8 | 4 |

### Behavior Descriptions

**AGGRESSIVE**
- Prioritizes damage above all else
- Will spend pips freely to secure hits
- Becomes extremely dangerous when player is low HP (lethal bonus)
- Doesn't care about board control

**STRATEGIC**
- Forces player to burn pips escaping attacks
- Prefers efficient attacks (lower pip cost penalty)
- Creates pressure through resource denial
- Pairs well with other enemies to compound pip drain

**TACTICAL**
- Maximizes threatened tiles
- Herds player toward corners, edges, and hazards
- Sets up future turns by controlling space
- Strongly prioritizes forcing player toward hazard-adjacent tiles
- Most effective in multi-enemy fights for coordinated zoning

### Behavior Synergies

When multiple enemies fight together, they receive **synergy bonuses** for attacks that complement ally behaviors.

| My Behavior | Ally Behavior | Synergy Condition | Bonus |
|-------------|---------------|-------------------|-------|
| AGGRESSIVE | TACTICAL | Attack escape routes from ally's coverage | +100 |
| AGGRESSIVE | STRATEGIC | Attack cheapest escape from ally's attack | +80 |
| TACTICAL | TACTICAL | Combined coverage eliminates safe tiles | +50/tile |
| TACTICAL | AGGRESSIVE | Herd player toward ally's attack zone | +100 |
| STRATEGIC | STRATEGIC | Attack ally's escape routes (pip chain) | +60 |
| STRATEGIC | TACTICAL | Force movement into ally's net | +70 |

### Coordination Examples

**TACTICAL + AGGRESSIVE (Skeleton + Goblin)**
```
Turn: Skeleton plans first, Goblin plans second

Skeleton (TACTICAL):
  Uses ROW_SWEEP covering tiles [A, B, C]
  Player can escape to tiles [D, E]

Goblin (AGGRESSIVE):
  Gets +100 synergy bonus for attacking tile D or E
  Result: Attacks escape route, player has fewer options
```

**STRATEGIC + STRATEGIC (Archer + Archer)**
```
Turn: First archer covers tiles [A, B]
      Escape from [A, B] costs 1 pip

Second Archer:
  Gets +60 synergy for attacking the 1-pip escape tiles
  Result: Player must spend 3+ pips to escape both
```

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
| **Behavior** | AGGRESSIVE |
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
| **Behavior** | AGGRESSIVE |
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
| **Behavior** | STRATEGIC |
| **Preferred Range** | 6 |
| **Kites** | Yes |
| **Flees** | Yes |
| **Floor Range** | 2-8 |
| **Spawn Weight** | 50.0 (uncommon) |

**Description:** *A goblin that prefers to attack from a distance. Uses strategic positioning to drain player resources.*

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
| **Behavior** | TACTICAL |
| **Flees** | No |
| **Floor Range** | 3-10 |
| **Spawn Weight** | 60.0 (moderate) |

**Description:** *An undead soldier that herds players into corners with calculated positioning.*

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
| **Behavior** | AGGRESSIVE |
| **Aggression** | 0.8 |
| **Flees** | No |
| **Floor Range** | 5-10 |
| **Spawn Weight** | 10.0 (rare) |

**Description:** *A fearsome orc chieftain focused on destroying the player with overwhelming force.*

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
| `autoload/constants.gd` | Combat constants, enums, pip costs, tile generation params |
| `scripts/systems/combat/arena/arena_grid.gd` | Grid state, tile types, hazard/obstacle logic |
| `scripts/systems/combat/arena/arena_enemy_ai.gd` | Arena tactical AI |
| `scripts/systems/combat/arena/tactical_analyzer.gd` | Attack plan generation and scoring |
| `scripts/systems/combat/arena/actions/pattern_attack_action.gd` | Pattern attack implementation |
| `scripts/systems/combat/arena/actions/move_action.gd` | Movement action (respects tile blocking) |
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
```

### Behavior Weight Tuning

The current weight profiles can be adjusted in `tactical_analyzer.gd` in the `BEHAVIOR_PROFILES` dictionary. Consider playtesting to find optimal values for game balance.
