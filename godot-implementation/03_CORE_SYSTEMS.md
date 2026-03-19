# WP-03: Core Game Systems

> **The Shifting Chasm** -- JS to Godot 4.x Porting Guide
> Covers all non-combat, non-AI gameplay systems: movement, inventory, skills, environment, lighting, boons, shifts, loot, and more.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [SystemCoordinator Pattern](#2-systemcoordinator-pattern)
3. [Survival Integration (Master Coordinator)](#3-survival-integration)
4. [Movement Master](#4-movement-master)
5. [Vision System](#5-vision-system)
6. [Light Source System](#6-light-source-system)
7. [Player Animation System](#7-player-animation-system)
8. [Stamina System](#8-stamina-system)
9. [Dodge System](#9-dodge-system)
10. [Time Effects System](#10-time-effects-system)
11. [Noise System](#11-noise-system)
12. [Inventory System](#12-inventory-system)
13. [Skill System](#13-skill-system)
14. [Spell System](#14-spell-system)
15. [Projectile Manager](#15-projectile-manager)
16. [Damage Resolver](#16-damage-resolver)
17. [Kill Streak System](#17-kill-streak-system)
18. [Boon System](#18-boon-system)
19. [Dynamic Tile System](#19-dynamic-tile-system)
20. [Environmental Meter System](#20-environmental-meter-system)
21. [Hazard System](#21-hazard-system)
22. [Lingering Hazards System](#22-lingering-hazards-system)
23. [Shift System](#23-shift-system)
24. [Shift Bonus System](#24-shift-bonus-system)
25. [Spawn Point System](#25-spawn-point-system)
26. [Loot System](#26-loot-system)
27. [Quest System](#27-quest-system)
28. [Quest Item System](#28-quest-item-system)
29. [Crafting System](#29-crafting-system)
30. [Banking System](#30-banking-system)
31. [Loadout System](#31-loadout-system)
32. [Village System](#32-village-system)
33. [Bark System](#33-bark-system)
34. [Training System](#34-training-system)
35. [World State System](#35-world-state-system)
36. [Core System (Boss Arena)](#36-core-system)
37. [Verification Matrix](#37-verification-matrix)

---

## Dependencies

| Dependency | Source |
|---|---|
| WP-01 Autoloads | `Constants`, `EventBus`, `GameManager`, `SaveManager`, `AudioManager` |
| WP-02 Resources | `ItemData`, `MonsterData`, `SkillData`, `NPCData`, `LootTableData` |

---

## 1. Architecture Overview

All 35+ game systems follow a unified lifecycle managed by `SystemManager` (a global autoload). Each system is a child `Node` attached to `SystemCoordinator` and implements standard hooks.

### Priority Execution Order (lower = earlier)

| Priority | System | Role |
|---|---|---|
| 1 | survival-integration | Master coordinator |
| 4 | light-source-system | Dynamic lighting |
| 5 | vision-system / shift-bonus-system | FOV / shift bonuses |
| 8 | time-effects | Time scale manipulation |
| 24 | spell-system | Spell cooldowns, casts |
| 25 | player-animation / dodge-system | Animation / dodge roll |
| 28 | stamina-system | Stamina regen / exhaustion |
| 30 | noise-system | Sound propagation |
| 36 | dynamic-tile-system | Tile state changes |
| 37 | environmental-meter-system | Warmth, infection, etc. |
| 38 | spawn-point-system | Continuous spawners |
| 60 | skill-system | Proficiency / XP |
| 65 | inventory-system | Item management |
| 66 | quest-item-system | Collectible objectives |
| 70 | loot-system | Ground loot / drops |
| 80 | shift-system | Meltdown countdown |
| 85 | quest-system | Quest tracking |
| 88 | crafting-system | Crafting queue |
| 95 | core-system | Final boss arena |

---

## 2. SystemCoordinator Pattern

### JS Pattern (current)
```javascript
// Each system registers itself:
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('system-name', SystemDef, priority);
}
```

### Godot Target Pattern
```
res://systems/
  system_coordinator.gd        # AutoLoad - manages all systems
  movement_system.gd
  vision_system.gd
  ...
```

```gdscript
# system_coordinator.gd
extends Node
class_name SystemCoordinator

var _systems: Array[Node] = []

func _ready() -> void:
    # Systems are child nodes, sorted by priority meta
    _systems = get_children().duplicate()
    _systems.sort_custom(func(a, b): return a.priority < b.priority)
    for sys in _systems:
        if sys.has_method("system_init"):
            sys.system_init(GameManager)

func _process(delta: float) -> void:
    for sys in _systems:
        if sys.has_method("system_update"):
            sys.system_update(delta)

func _on_floor_change() -> void:
    for sys in _systems:
        if sys.has_method("system_cleanup"):
            sys.system_cleanup()
```

### Standard System Interface
```gdscript
# base_system.gd
extends Node
class_name BaseSystem

@export var priority: int = 50

func system_init(_game_manager) -> void:
    pass

func system_update(_delta: float) -> void:
    pass

func system_cleanup() -> void:
    pass
```

---

## 3. Survival Integration

> Master coordinator that orchestrates the dungeon game loop.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/survival-integration.js` (453 lines) |
| **GD Target** | `res://systems/survival_integration.gd` |
| **Priority** | 1 |

### State
```gdscript
var game_state: String = "exploring"   # exploring | combat | paused | gameover | village
var floor_number: int = 1
var run_stats: Dictionary = {}          # kills, gold, time, etc.
var shift_countdown: float = 600.0      # 10 minutes
var lava_tiles: Dictionary = {}         # Set<String> equivalent
var is_village: bool = false
```

### Key Methods
```gdscript
func start_new_run() -> void
func enter_dungeon() -> void
func change_floor(direction: int) -> void
func handle_player_death() -> void
func return_to_village() -> void
func _process_game_tick(delta: float) -> void
```

### EventBus Signals
```
signal run_started(floor: int)
signal floor_changed(new_floor: int, direction: int)
signal player_died(run_stats: Dictionary)
signal game_state_changed(old_state: String, new_state: String)
```

### Conversion Notes
- JS uses a global `game` object; Godot should use `GameManager` autoload
- `game.state` becomes `GameManager.game_state` enum
- `game.map[][]` becomes a `TileMapLayer` or custom `DungeonMap` resource
- `game.enemies[]` becomes child nodes under dungeon scene
- Run stats persist via `SaveManager.save_run_stats()`

---

## 4. Movement Master

> Handles A* pathfinding, velocity-based movement, collision detection, and raycasting.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/movement-master.js` (1765 lines) |
| **GD Target** | `res://systems/movement_system.gd` + `res://utils/pathfinding.gd` |
| **Priority** | N/A (called per-frame by entities) |

### Sub-tile Movement Config
```gdscript
const GRID_SIZE: int = 200          # 200x200 tiles
const SUB_TILE_PRECISION: float = 0.125
const PLAYER_SPEED: float = 4.0     # tiles/second
const DIAGONAL_FACTOR: float = 0.707
```

### A* Pathfinding
```gdscript
# pathfinding.gd
class PriorityQueue:
    var heap: Array = []
    func push(item, priority: float) -> void
    func pop() -> Variant

func find_path(start: Vector2i, goal: Vector2i, max_iterations: int = 1000) -> Array[Vector2i]:
    # A* with Manhattan + Euclidean heuristic blend
    # String-pulling path smoothing post-process
    # Returns waypoint array

func heuristic(a: Vector2i, b: Vector2i) -> float:
    var dx := absi(a.x - b.x)
    var dy := absi(a.y - b.y)
    return float(dx + dy) + (1.414 - 2.0) * float(mini(dx, dy))
```

### Collision Detection (9-point bounding box)
```gdscript
func check_collision(x: float, y: float, radius: float = 0.4) -> bool:
    # Tests 9 points: center + 4 cardinal + 4 diagonal
    # Each point checks tile walkability
    # Returns true if ANY point collides

func resolve_collision(entity: Node, velocity: Vector2) -> Vector2:
    # Axis-decoupled resolution: try X alone, then Y alone
    # Wall sliding: retain perpendicular component
    # Corner nudging: <=0.3 tiles from corner -> auto-adjust
```

### Raycasting (Bresenham's Line)
```gdscript
func has_line_of_sight(from: Vector2i, to: Vector2i) -> bool:
    # Bresenham's line algorithm
    # Returns false if any wall tile intersected
    # Used by combat, vision, noise systems

func raycast_tiles(from: Vector2i, to: Vector2i) -> Array[Vector2i]:
    # Returns all tiles along the ray
```

### Conversion Notes
- Godot has built-in `AStar2D` -- evaluate whether it meets needs or keep custom
- Sub-tile positions map to `CharacterBody2D.position` (pixel-based, not tile-based)
- Collision can leverage Godot physics shapes instead of manual 9-point checks
- Village uses grid-based (tile-snap) movement; dungeon uses velocity-based

---

## 5. Vision System

> Fog of war using recursive shadowcasting with 8 octants.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/vision-system.js` (588 lines) |
| **GD Target** | `res://systems/vision_system.gd` |
| **Priority** | 5 |

### Config
```gdscript
const BASE_SIGHT_RANGE: int = 4
const TORCH_BONUS: int = 6
const FADE_BUFFER: int = 2
# Torch ON:  range = 4 + 6 = 10, with 2-tile fade = 12 total
# Torch OFF: range = 4,           with 2-tile fade = 6 total
```

### Visibility States
```gdscript
enum TileVisibility { UNEXPLORED, EXPLORED, VISIBLE }
# UNEXPLORED: never seen (black)
# EXPLORED:   seen before, currently dark (dim/remembered)
# VISIBLE:    currently in LOS (full brightness)
```

### Algorithm: Recursive Shadowcasting (Bjorn Bergstrom)
```gdscript
func update_fov(origin: Vector2i, sight_range: int) -> void:
    # 1. Clear previous visible tiles
    # 2. Mark origin visible
    # 3. Cast shadows in 8 octants via _cast_light()
    # 4. Apply smoothstep fade in buffer zone

func _cast_light(origin: Vector2i, row: int, start_slope: float,
                 end_slope: float, octant: int, range_limit: int) -> void:
    # Recursive octant scanning
    # Only tiles with visibility >= 1.0 get marked EXPLORED

func _transform_octant(row: int, col: int, octant: int) -> Vector2i:
    # Maps (row, col) to world coordinates per octant (0-7)

static func smoothstep(t: float) -> float:
    return t * t * (3.0 - 2.0 * t)
```

### Entity Visibility
```gdscript
func get_entity_visibility(pos: Vector2) -> float:
    # Checks distance from player AND all light sources
    # Returns 0.0 (invisible) to 1.0 (fully visible)
    # Used by renderer to decide whether to draw enemies/NPCs

func get_equipment_vision_bonus() -> int:
    # Only applies when torch is ON
    # Reads from player equipment properties
```

### Key State
```gdscript
var _visible_tiles: Array[Vector2i] = []   # Cleared each frame for efficiency
var tile_visibility: Array = []             # 2D array [y][x] of TileVisibility
```

### EventBus Signals
```
signal fov_updated(visible_tiles: Array[Vector2i])
```

### Conversion Notes
- `tile.explored` / `tile.visible` in JS become the `TileVisibility` enum in a parallel array
- Godot's `TileMapLayer` can use custom data layers for visibility state
- Consider using a shader for fog-of-war rendering instead of per-tile alpha

---

## 6. Light Source System

> Dynamic lighting with Perlin noise flicker, spatial grid optimization, and multiple source types.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/light-source-system.js` (1420 lines) |
| **GD Target** | `res://systems/light_source_system.gd` + `res://utils/perlin_noise.gd` |
| **Priority** | 4 |

### Light Source Types
| Type | Radius | Fuel (s) | Special |
|---|---|---|---|
| `torch` | 4 | 120 | Player-held |
| `brazier` | 5 | 60 | warmthBonus: 8 |
| `lantern` | 3 | 300 | Attachable to entities |
| `campfire` | 5 | permanent | Heals 1% HP/s within r=2 |
| `spell` | 4 | 30 | Temporary |
| `player` | 3 | permanent | Always-on base glow |
| `thermal_vent` | 7 | permanent | warmthBonus: 15 |
| `holy_light` | 5 | permanent | 5 DPS to undead in radius |

### Sub-systems
```gdscript
# Perlin noise for flicker
class PerlinNoise:
    func fbm(x: float, y: float, octaves: int = 3) -> float

# Pre-computed flicker values (256 entries)
class FlickerLookupTable:
    var table: PackedFloat32Array
    func get_value(index: int) -> float

# Spatial partitioning for O(1) nearby source queries
class LightSpatialGrid:
    const CELL_SIZE: int = 8
    var cells: Dictionary  # Vector2i -> Array[LightSource]
    func get_nearby(x: int, y: int, range: int) -> Array[LightSource]
```

### Key Methods
```gdscript
func add_source(config: Dictionary) -> String:         # Returns source ID
func remove_source(source_id: String) -> void
func get_visibility_at(x: int, y: int) -> float:       # 0.0-1.0 with smoothstep
func get_warmth_bonus_at(x: int, y: int) -> float:     # For EnvironmentalMeterSystem
func get_tile_brightness_at(x: int, y: int) -> float:  # For tile renderer
func set_global_darkness(level: float) -> void:         # 0.0 (bright) to 1.0 (dark)
```

### Flicker Algorithm
```gdscript
# Per source, per frame:
var time_offset := source.flicker_offset + Time.get_ticks_msec() / 1000.0
var flicker_index := int(time_offset * FLICKER_SPEED) % 256
var intensity_mod := FLICKER_TABLE[flicker_index] * FLICKER_INTENSITY  # ~0.08
var final_intensity := source.base_intensity + intensity_mod
```

### Campfire Healing
```gdscript
func _update_healing(delta: float) -> void:
    # For each campfire source with heal_radius:
    #   If player within heal_radius AND not in combat:
    #     player.hp += player.max_hp * 0.01 * delta
```

### Conversion Notes
- Godot has `PointLight2D` nodes -- evaluate using them vs custom rendering
- Perlin noise available via `FastNoiseLite` in Godot
- Spatial grid can be replaced with Godot's physics area queries
- Global darkness can be a `CanvasModulate` or shader

---

## 7. Player Animation System

> 4-tier sprite priority system with dash ghost trails.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/player-animation.js` (388 lines) |
| **GD Target** | `res://systems/player_animation.gd` |
| **Priority** | 25 |

### Sprite Priority
1. **UV-map animation generator** (procedural humanoid)
2. **Bodypart layered sprites** (composited limb layers)
3. **Pixel sprite renderer** (single composite)
4. **Spritesheet fallback** (4-direction walking sheets, 4x5 grid = 20 frames)

### State
```gdscript
var animation_state: String = "idle"  # idle | walking | attacking
var facing: String = "down"           # up | down | left | right
var current_frame: int = 0
var anim_timer: float = 0.0
const FPS: int = 6
```

### Dash Ghost Trail
```gdscript
func draw_ghost_trail(ghosts: Array) -> void:
    # For each ghost: draw player sprite at ghost position
    # Apply hue-rotate(200deg) + brightness(1.2) filter
    # Alpha decreases per ghost age
```

### Conversion Notes
- In Godot, use `AnimatedSprite2D` or `AnimationPlayer` with `SpriteFrames`
- Ghost trails: use `RemoteTransform2D` + fading `Sprite2D` duplicates
- Equipment rendering overlays become additional `Sprite2D` children

---

## 8. Stamina System

> Energy resource with exhaustion state, regen delay, and boon-aware modifiers.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/stamina-system.js` (444 lines) |
| **GD Target** | `res://systems/stamina_system.gd` |
| **Priority** | 28 |

### Config
```gdscript
const MAX_STAMINA: float = 100.0
const REGEN_RATE: float = 15.0          # per second
const REGEN_DELAY: float = 1.0          # seconds after last use
const EXHAUSTION_THRESHOLD: float = 0.0 # triggers exhaustion at 0
const EXHAUSTION_RECOVERY: float = 30.0 # must regen to 30% before un-exhausted
```

### Action Costs
| Action | Cost |
|---|---|
| `dodge` | 15 |
| `sprint` | 8/s |
| `attack_melee` | 10 |
| `attack_ranged` | 8 |
| `ability_light` | 15 |
| `ability_heavy` | 25 |

### Key Methods
```gdscript
func consume_action(action_name: String) -> bool:
    # Returns false if insufficient stamina
    # Applies cost, resets regen delay, checks exhaustion

func refund(amount: float) -> void:
    # Partial refund (e.g., interrupted attack)

func get_modified_cost(base_cost: float) -> float:
    # Applies boon modifiers via StatModifierStack
```

### State
```gdscript
var current: float = 100.0
var is_exhausted: bool = false
var regen_delay_timer: float = 0.0
var _stat_stack: StatModifierStack     # For boon/equipment modifiers
```

### EventBus Signals
```
signal stamina_changed(current: float, max_val: float)
signal stamina_exhausted()
signal stamina_recovered()
```

---

## 9. Dodge System

> Active defense with invincibility frames and directional roll.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/dodge-system.js` (553 lines) |
| **GD Target** | `res://systems/dodge_system.gd` |
| **Priority** | 25 |

### Config
```gdscript
const IFRAME_DURATION: float = 0.3    # Invincibility window
const ROLL_DURATION: float = 0.35     # Total roll time
const COOLDOWN: float = 1.0
const STAMINA_COST: int = 15
const ROLL_DISTANCE: float = 2.0      # Tiles
const ROLL_SPEED: float = 6.0         # Tiles/sec
```

### State
```gdscript
var is_dodging: bool = false
var is_invincible: bool = false
var cooldown_remaining: float = 0.0
var roll_direction: String = ""
var roll_progress: float = 0.0        # 0-1 eased via ease_out_quad
```

### Key Methods
```gdscript
func try_dodge(player: Node, direction: String = "") -> bool:
    # Checks: not already dodging, not on cooldown, not CC'd
    # Consumes stamina via StaminaSystem
    # Starts roll with direction locked at initiation

func is_invincible() -> bool:
    # Checked by combat system before applying damage

func _clamp_to_walkable(start: Vector2, target: Vector2, dir: Vector2) -> Vector2:
    # Steps along path at 4 checks/tile, returns furthest valid position
```

### EventBus Signals
```
signal dodge_started(direction: String, target: Vector2)
signal dodge_ended(final_position: Vector2)
```

### Conversion Notes
- Roll movement uses `ease_out_quad`: `t * (2 - t)`
- Afterimage trail: 3 ghost sprites with 0.2s fade, alpha 0.5
- Direction vectors include 8 directions (4 cardinal + 4 diagonal at 0.707)

---

## 10. Time Effects System

> Slow-motion / time scale manipulation with smooth transitions.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/time-effects.js` (272 lines) |
| **GD Target** | `res://systems/time_effects.gd` |
| **Priority** | 8 |

### Config
```gdscript
const MIN_TIME_SCALE: float = 0.1
const DEFAULT_TRANSITION: float = 0.3  # seconds
```

### Key Methods
```gdscript
func set_time_scale(target: float, duration: float = 0.3) -> void:
    # Ease-out transition from current to target
    # Affects: movement speed, attack cooldowns, animation FPS
    # Does NOT affect: UI, input polling, audio

func reset_time_scale() -> void:
    # Returns to 1.0 with transition

func get_effective_delta(delta: float) -> float:
    # Returns delta * current_time_scale
```

### Conversion Notes
- Godot has `Engine.time_scale` but it affects everything
- Better approach: custom `time_scale` property that systems read manually
- `delta * time_scale` passed to affected systems only

---

## 11. Noise System

> Sound propagation for stealth mechanics. Monsters react to player-generated noise.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/noise-system.js` (734 lines) |
| **GD Target** | `res://systems/noise_system.gd` |
| **Priority** | 30 |

### Volume Scale (0-100)
| Range | Label | Example |
|---|---|---|
| 0-20 | Whisper | Sneak step (10) |
| 21-40 | Normal | Walk (25), chest open (30) |
| 41-60 | Loud | Run (45), melee attack (50) |
| 61-80 | Very Loud | Monster shout (65), door break (70) |
| 81-100 | Deafening | Explosion (90) |

### Noise Types (15 total across 6 categories)
```gdscript
enum NoiseCategory { MOVEMENT, INTERACTION, COMBAT, ABILITY, COMMUNICATION, ENVIRONMENT }

# Key types:
# STEP_SNEAK: 10, STEP_WALK: 25, STEP_RUN: 45
# DOOR_OPEN: 35, DOOR_BREAK: 70
# ATTACK_MELEE: 50, ATTACK_RANGED: 40, ATTACK_MAGIC: 55
# ABILITY_SMALL: 35, ABILITY_LARGE: 75, EXPLOSION: 90
# MONSTER_SHOUT: 65 (alerts other monsters)
```

### Propagation Algorithm
```gdscript
func emit_noise(x: int, y: int, volume: int, type: String) -> void:
    var max_range := maxi(volume / 5, 2)  # 10 -> 2 tiles, 90 -> 18 tiles
    # Linear falloff: volume_at_distance = volume * (1 - dist / max_range)

func _check_blocked(from: Vector2i, to: Vector2i) -> bool:
    # Raycast between points
    # Walls / decorations block sound
    # Blocked sound reduced to 30% volume
    # Below threshold (15) -> ignored

func _alert_monsters(x: int, y: int, volume_at_point: int) -> void:
    # For each enemy in range:
    #   Check enemy.senses.hearing_range and hearing_multiplier
    #   Effective volume = volume_at_point * hearing_multiplier
    #   If > detection_threshold (15): alert enemy
```

### EventBus Signals
```
signal noise_emitted(position: Vector2i, volume: int, type: String)
signal monster_alerted(enemy: Node, noise_position: Vector2i)
```

---

## 12. Inventory System

> 15-slot inventory with stackable consumables and materials.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/inventory-system.js` (307 lines) |
| **GD Target** | `res://systems/inventory_system.gd` |
| **Priority** | 65 |

### Config
```gdscript
const MAX_SLOTS: int = 15
const MAX_STACK: int = 99            # For stackable items
```

### Slot Structure
```gdscript
class InventorySlot:
    var item_id: String = ""
    var quantity: int = 0
    var is_equipped: bool = false
```

### Key Methods
```gdscript
func add_item(item_id: String, quantity: int = 1) -> bool:
    # 1. If stackable and exists: increment quantity
    # 2. Else find empty slot
    # 3. Return false if full

func remove_item(slot_index: int, quantity: int = 1) -> Dictionary:
func use_item(slot_index: int) -> bool:
func get_item_count(item_id: String) -> int:
func has_item(item_id: String, quantity: int = 1) -> bool:
func sort_inventory() -> void:
```

### Stackable Rules
- `equipment` (weapons, armor, shields): NOT stackable, quantity always 1
- `consumable` (potions, food): stackable up to 99
- `material` (crafting ingredients): stackable up to 99
- `quest_item`: NOT stackable

### EventBus Signals
```
signal inventory_changed(slot_index: int)
signal item_added(item_id: String, quantity: int)
signal item_removed(item_id: String, quantity: int)
signal item_used(item_id: String)
signal inventory_full()
```

---

## 13. Skill System

> 3 proficiencies, 20 specializations, piecewise XP curve.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/skill-system.js` (1311 lines) |
| **GD Target** | `res://systems/skill_system.gd` |
| **Priority** | 60 |

### Proficiency Structure
```gdscript
enum Proficiency { MELEE, RANGED, MAGIC }

class ProficiencyData:
    var level: int = 1
    var xp: float = 0.0
    var specialties: Dictionary = {}  # specialty_id -> SpecialtyData
```

### XP Curve (Piecewise)
```gdscript
func xp_for_level(level: int) -> float:
    if level <= 5:
        return 50.0 * level                          # 50, 100, 150...
    elif level <= 10:
        return 250.0 + 100.0 * (level - 5)           # 350, 450...
    elif level <= 15:
        return 750.0 + 200.0 * (level - 10)          # 950, 1150...
    else:
        return 1750.0 + 350.0 * (level - 15)         # 2100, 2450...
```

### 20 Specialties (Selection)
| Proficiency | Specialty | Effect per Level |
|---|---|---|
| Melee | Swordsmanship | +2% sword damage |
| Melee | Shield Mastery | +1% block chance |
| Ranged | Marksmanship | +2% bow damage |
| Ranged | Quick Draw | -1% draw time |
| Magic | Pyromancy | +3% fire damage |
| Magic | Restoration | +2% heal power |

### Damage Multiplier
```gdscript
func get_damage_multiplier(proficiency: Proficiency, specialty_id: String) -> float:
    # Additive stacking, capped at 4.0x
    # Base 1.0 + (specialty_level * bonus_per_level)
    # Example: Swordsmanship Lv10 = 1.0 + (10 * 0.02) = 1.20x
```

### EventBus Signals
```
signal xp_gained(proficiency: Proficiency, amount: float)
signal level_up(proficiency: Proficiency, new_level: int)
signal specialty_unlocked(specialty_id: String)
```

### Persistence
- Skill data is SESSION-scoped (resets on death)
- Highest levels tracked in `SaveManager` for unlock persistence

---

## 14. Spell System

> 6 spells with cooldowns, mana costs, and shield absorption.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/spell-system.js` (1085 lines) |
| **GD Target** | `res://systems/spell_system.gd` |
| **Priority** | 24 |

### Spell Definitions
| ID | Name | Mana | Cooldown | Effect |
|---|---|---|---|---|
| `fireball` | Fireball | 25 | 3s | Projectile, AOE on impact |
| `ice_lance` | Ice Lance | 20 | 2.5s | Piercing line, chill |
| `lightning` | Lightning | 30 | 4s | Chain 3 targets |
| `heal` | Heal | 20 | 5s | Restore HP |
| `shield` | Shield | 15 | 8s | Absorb next N damage |
| `blink` | Blink | 35 | 10s | Teleport 5 tiles |

### Shield Absorption
```gdscript
func apply_shield(amount: int) -> void:
    player.shield_hp = amount
    # Shield absorbs damage before HP
    # shield_hp reduced first, excess goes to HP

func take_damage_with_shield(damage: int) -> int:
    var absorbed := mini(damage, player.shield_hp)
    player.shield_hp -= absorbed
    return damage - absorbed  # Remaining damage hits HP
```

### EventBus Signals
```
signal spell_cast(spell_id: String, target: Variant)
signal spell_cooldown_started(spell_id: String, duration: float)
signal spell_cooldown_ended(spell_id: String)
signal shield_applied(amount: int)
signal shield_broken()
```

---

## 15. Projectile Manager

> Facade over CombatMaster's projectile subsystem.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/projectile-manager.js` (249 lines) |
| **GD Target** | `res://systems/projectile_manager.gd` |

### Key Methods
```gdscript
func fire_projectile(config: Dictionary) -> Node:
    # config: { source, target, speed, damage, element, on_hit, piercing }
    # Creates projectile node, adds to scene tree
    # Collision detection via Area2D

func update_projectiles(delta: float) -> void:
    # Move each projectile along velocity
    # Check wall collision (destroy)
    # Check entity collision (apply damage, call on_hit)
```

### Conversion Notes
- In Godot, projectiles should be `Area2D` scenes with `CollisionShape2D`
- Use `body_entered` signal for collision instead of manual distance checks
- Pool projectile nodes for performance

---

## 16. Damage Resolver

> 11-step damage pipeline from raw attack to final HP change.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/damage-resolver.js` (421 lines) |
| **GD Target** | `res://systems/damage_resolver.gd` |

### Pipeline Steps
```
1. Base damage (weapon + STR/INT scaling)
2. Proficiency multiplier (skill system)
3. Specialty bonus (specific weapon type)
4. Boon damage multiplier
5. Kill streak multiplier (1.0x - 3.0x)
6. Element matrix lookup (attacker element vs defender element)
7. Weapon-armor matrix lookup (weapon type vs armor type)
8. Defense scaling: final = damage * (100 / (100 + defense))
9. Critical hit check (1.5x multiplier, modified by boons)
10. Shield absorption (spell system)
11. Clamp to minimum 1 damage
```

### Key Methods
```gdscript
func resolve_damage(attacker: Node, defender: Node, attack_data: Dictionary) -> Dictionary:
    # Returns: { final_damage, is_crit, element, was_blocked, damage_type }

func _apply_element_matrix(base: float, atk_element: String, def_element: String) -> float:
    # 10x10 element matrix: fire/ice/lightning/nature/water/earth/dark/holy/arcane/physical
    # Returns multiplied damage

func _apply_weapon_armor_matrix(base: float, weapon_type: String, armor_type: String) -> float:
    # Weapon effectiveness vs armor type
```

### EventBus Signals
```
signal damage_resolved(attacker: Node, defender: Node, result: Dictionary)
signal critical_hit(attacker: Node, defender: Node, damage: int)
```

---

## 17. Kill Streak System

> Tracks consecutive kills, provides tier announcements and reward multipliers.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/kill-streak-system.js` (434 lines) |
| **GD Target** | `res://systems/kill_streak_system.gd` |

### Tiers
| Kills | Name | Color | Multiplier |
|---|---|---|---|
| 2 | Double Kill | `#c0c0c0` | 1.1x |
| 4 | Killing Spree | `#4a9eff` | 1.25x |
| 6 | Rampage | `#9b4dca` | 1.5x |
| 8 | Unstoppable | `#ff6b35` | 2.0x |
| 10 | Godlike | `#ffd700` | 3.0x |

### State
```gdscript
var current_streak: int = 0
var highest_streak: int = 0
var decay_timer: float = 0.0          # 5.0s until decay starts
var current_tier: Dictionary = {}
```

### Key Methods
```gdscript
func on_kill(enemy: Node) -> void:
    # Increment streak, reset decay, check tier upgrade
    # Sync to run_stats

func on_damage_taken(amount: int) -> void:
    # Reset streak on HP loss (not shielded damage)

func get_bonus_multiplier() -> float:
    # Returns gold/XP multiplier for current tier
```

### EventBus Signals
```
signal streak_changed(count: int)
signal tier_changed(tier: Dictionary)
signal streak_lost(count: int, reason: String)
```

---

## 18. Boon System

> 7 Ancestors, 70 boons (21 Core + 42 Resonance + 7 Legendary), cleared on death.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/boon-system.js` (2410 lines) |
| **GD Target** | `res://systems/boon_system.gd` + `res://data/boon_definitions.gd` |

### Ancestors (7)
| ID | Name | Theme | Synergy Threshold |
|---|---|---|---|
| `torchbearer` | The Torchbearer | Light, fire, vision | 3 boons |
| `headsman` | The Headsman | Bleed, execute, violence | 3 boons |
| `lurker` | The Lurker | Stealth, crit, evasion | 3 boons |
| `storm_caller` | The Storm Caller | Lightning, speed, chain | 3 boons |
| `rot_weaver` | The Rot Weaver | Poison, decay, DOT | 3 boons |
| `iron_warden` | The Iron Warden | Defense, thorns, fortify | 3 boons |
| `maniac` | The Maniac | Glass cannon, risk/reward | 3 boons |

### Tier Gating
| Tier | Floor Req | Ancestor Req |
|---|---|---|
| Core | Any floor | None |
| Resonance | Floor 3+ | Boons from 2+ different ancestors |
| Legendary | Floor 6+ | 3+ boons from same ancestor |

### Legendary Capstones
| Ancestor | Name | Effect |
|---|---|---|
| Torchbearer | SUPERNOVA | Massive AoE light explosion |
| Headsman | CRIMSON RAIN | AOE bleed on kill |
| Lurker | GHOST IN THE MACHINE | Phase through walls |
| Storm Caller | VELOCITY GOD | Permanent haste |
| Rot Weaver | PANDEMIC | Spread poison to all |
| Iron Warden | COLOSSUS | Damage immunity pulses |
| Maniac | FINAL OFFER | 1 max HP, 5x damage, free revive |

### Key State
```gdscript
var active_boons: Dictionary = {}        # boon_id -> stack_count
var active_player_boons: Array = []      # Ordered display list
var active_synergies: Array[String] = [] # Active ancestor synergies
var special_effect_handlers: Dictionary = {} # boon_id -> Array[Callable]
```

### Key Methods
```gdscript
func apply_boon(boon_id: String) -> bool:
    # 1. Check max boons (from BOON_CONFIG)
    # 2. Handle stacking (stackable? max_stacks?)
    # 3. Apply stat modifiers via StatModifierStack
    # 4. Register EventBus handlers (on_hit, on_kill, etc.)
    # 5. Check synergy activation
    # 6. Recalculate player stats

func remove_boon(boon_id: String, all_stacks: bool = true) -> void:
    # Reverse of apply_boon: remove modifiers, handlers, check synergy

func clear_boons() -> void:
    # Death wipe: remove all in reverse order, clean synergies

func generate_offering(count: int, floor: int) -> Array[String]:
    # Weighted random selection from available boons
    # Resonance: 1.5x weight, Legendary: 2.0x weight
    # Excludes max-stacked and tier-locked boons
```

### Stat Modifier Integration
```gdscript
func _apply_boon_stat_modifiers(boon_id: String, boon: Dictionary, player: Node) -> void:
    # Maps boon effect.type to StatModifierStack operations:
    # - tradeoff: applies bonus AND penalty modifiers
    # - conditional_damage: tracked as special effect
    # - ultimate_tradeoff: e.g., FINAL OFFER (5x damage, 1 HP)
    # Source tag: "boon:{boon_id}"
```

### Helper Functions (Global)
```gdscript
func apply_boon_hp_bonus(base_hp: int) -> int
func apply_boon_damage_reduction(damage: int) -> int
func apply_boon_attack_speed(base_cooldown: float) -> float
func apply_boon_gold_bonus(base_gold: int) -> int
func apply_boon_xp_bonus(base_xp: int) -> int
```

### EventBus Signals
```
signal boon_selected(boon_id: String, stacks: int)
signal boon_removed(boon_id: String)
signal synergy_activated(ancestor_id: String, synergy_name: String)
signal synergy_deactivated(ancestor_id: String)
```

### Conversion Notes
- All 70 boon definitions should be a `Resource` or data dictionary loaded from file
- `StatModifierStack` integration is critical -- boons add/remove modifiers by source tag
- Special effect handlers map to Godot signal connections (disconnected on removal)
- `testAllBoons()` method useful for automated regression testing in Godot

---

## 19. Dynamic Tile System

> Runtime tile state changes with spread mechanics, warnings, and entity damage.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/dynamic-tile-system.js` (803 lines) |
| **GD Target** | `res://systems/dynamic_tile_system.gd` |
| **Priority** | 36 |

### Tile Types
| Type | Damage | Interval | Element | Special |
|---|---|---|---|---|
| `lava` | 20 | 500ms | fire | -- |
| `frozen_floor` | 0 | -- | ice | 50% slow, warmth drain |
| `ice_wall` | 0 | -- | ice | 50 HP, blocks movement |
| `corrupted` | 3 | 1000ms | void | Buffs void enemies |
| `darkness` | 0 | -- | dark | Reduces visibility |
| `unstable` | 0 | -- | earth | 10% collapse/s, 2s warn |
| `sanctified` | -5 | 1000ms | holy | Heals living, 10 dmg undead |

### Warning System
```gdscript
func _apply_warning(tile: Dictionary) -> void:
    # 500ms warning_time before first damage
    # Pulsing visual every 200ms
    # Emits: tile_damage_warning, tile_damage_warning_pulse
```

### Spread Mechanics
```gdscript
func start_spread_from(center: Vector2i, tile_type: String, rate: float) -> void:
    # Outward radial spread from center

func start_spread_toward(target: Vector2i, tile_type: String, rate: float) -> void:
    # Inward spread toward target (used by shift system)

func _apply_radial_spread(center: Vector2i, inner_r: float, outer_r: float,
                          tile_type: String) -> void:
    # Iterate bounding box, convert tiles in ring between inner/outer radius
    # Only converts floor/doorway tiles
```

### Conversion Notes
- Tile types map to `TileMapLayer` custom data or a parallel `Dictionary`
- Spread uses timer-based ring expansion
- Duration-based auto-revert for temporary tiles

---

## 20. Environmental Meter System

> Warmth, infection, sanity, corruption meters with threshold effects.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/environmental-meter-system.js` (670 lines) |
| **GD Target** | `res://systems/environmental_meter_system.gd` |
| **Priority** | 37 |

### Meter Types
| Meter | Start | Direction | Key Thresholds |
|---|---|---|---|
| Warmth | 100 | Depletes down | 30: 10% slow, 15: 25% slow, 0: DOT |
| Infection | 0 | Fills up | 60: +20% damage, 90: light hurts, 100: game over |
| Sanity | 100 | Depletes down | (future use) |
| Corruption | 0 | Fills up (decays -0.5/s) | 25: whispers, 50: void sight, 75: void form, 100: consumed |
| Oxygen | 100 | Depletes down | (future use) |

### Modifier System
```gdscript
class MeterModifier:
    var id: String
    var drain_modifier: float = 0.0       # Additive drain change
    var regen_modifier: float = 0.0       # Additive regen change
    var drain_multiplier: float = 1.0     # Multiplicative drain
    var regen_multiplier: float = 1.0     # Multiplicative regen
    var duration: float = -1.0            # -1 = permanent

func add_modifier(meter_type: String, modifier: MeterModifier) -> void
func remove_modifier(meter_type: String, modifier_id: String) -> void
```

### Player Effects Applied
```gdscript
# Set on player entity:
player.environmental_speed_mod = 0.75   # e.g., warmth < 15
player.environmental_damage_mod = 1.2   # e.g., infection > 60
player.environmental_dot = 5            # e.g., warmth = 0 (freezing)
player.light_sensitivity = true         # e.g., infection > 90
player.visual_effect = "frost_overlay"  # Shader effect name
```

### EventBus Signals
```
signal meter_changed(meter_type: String, value: float, max_val: float)
signal meter_threshold_crossed(meter_type: String, threshold: float, direction: String)
signal meter_critical(meter_type: String)
```

---

## 21. Hazard System

> 19 environmental hazard types with element theming and AI avoidance tiers.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/hazard-system.js` (328 lines) |
| **GD Target** | `res://systems/hazard_system.gd` |

### Hazard Categories
| Threat Level | Examples | Damage Range |
|---|---|---|
| Low (0-4/tick) | ice_patch, poison_spores, mana_void, sanctified_ground | 0-3 |
| Medium (4-10/tick) | thorn_patch, whirlpool, crystal_shards, lava_pool | 4-10 |
| High (12-20 burst) | fire_vent, spike_trap, pit_trap, arcane_mine | 12-20 |

### AI Avoidance Tiers
```gdscript
# Per hazard definition: avoidTiers array
# TIER_3 (Fodder): avoids most hazards
# TIER_2 (Standard): avoids dangerous hazards
# TIER_1 (Veteran): avoids only deadliest (void_rift)
# ELITE/BOSS: ignores all hazards

func should_avoid(monster: Node, hazard: Dictionary) -> bool:
    return hazard.avoid_tiers.has(monster.tier)
```

### Spawning
```gdscript
func spawn_for_room(room: Dictionary) -> void:
    # Filters hazards by room.element (+ physical always eligible)
    # Count = min(max_per_room, floor(area * density))
    # density = 0.02, max_per_room = 5
```

### Key Methods
```gdscript
func register_hazard(definition: Dictionary) -> void
func check_collision(entity: Node) -> void:
    # Called when entity moves to new tile
    # Triggered hazards: fire damage + cooldown
    # Static hazards: ongoing damage per tick
    # Special effects: slip, slow, mana_drain, blind

func tick_hazard(hazard: Dictionary) -> void:
    # Area/static hazards damage all entities in radius
```

---

## 22. Lingering Hazards System

> Combat-spawned hazard zones with telegraph warnings and particle effects.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/lingering-hazards.js` (811 lines) |
| **GD Target** | `res://systems/lingering_hazards.gd` |

### Hazard Types
| Type | Damage/tick | Duration | Telegraph | Special |
|---|---|---|---|---|
| `fire_pool` | 8 | 5s | 0.5s | Burning status |
| `poison_cloud` | 4 | 8s | 0.3s | Poison status |
| `ice_zone` | 2 | 6s | 0.4s | 50% slow |
| `void_rift` | 12 | 3s | 1.0s | Teleport risk |

### Telegraph System
```gdscript
func create_hazard(config: Dictionary) -> void:
    # Phase 1: Telegraph warning (pulsing indicator)
    # Phase 2: Active damage zone (after telegraph_time)
    # Phase 3: Fade out (last 0.5s)

# Telegraph visual: growing circle with pulsing border
# Players can dodge out during telegraph phase
```

### Particle Effects
```gdscript
# Each hazard type has particles:
# fire_pool:    orange/red rising particles
# poison_cloud: green floating particles
# ice_zone:     blue/white falling particles
# void_rift:    purple swirling particles
```

---

## 23. Shift System

> Floor meltdown mechanic with 10-minute countdown and inward lava spread.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/shift-system.js` (353 lines) |
| **GD Target** | `res://systems/shift_system.gd` |
| **Priority** | 80 |

### Scenario: Magma Collapse ("Protocol: MELTDOWN")
```gdscript
const COUNTDOWN_TIME: float = 600.0    # 10 minutes
const LAVA_DURATION: float = 90.0      # 90 seconds to escape
const LAVA_DAMAGE: int = 20            # Per tick while in lava
const TICK_INTERVAL: float = 0.5       # Lava spread tick rate
```

### Mechanics
```gdscript
func trigger_shift() -> void:
    # 1. Find farthest room from entrance (Manhattan distance)
    # 2. Place exit in center of that room
    # 3. Calculate max radius from exit to map corners
    # 4. step_size = max_radius / (90.0 / 0.5)  # 180 ticks in 90s
    # 5. Start inward lava spread

func _update_lava(dt: float) -> void:
    # Decrease radius by step_size each tick
    # Convert all floor/doorway tiles outside radius to lava
    # Damage player if outside safe radius (20 HP)
```

### Warning Stages
| Stage | Time Left | Effects |
|---|---|---|
| 1 | 2 minutes | Light shake, warning message |
| 2 | 1 minute | Medium shake, danger message |
| 3 | 30 seconds | Heavy shake, critical message |

### Audio Hooks
```gdscript
# On trigger:
UIAudio.play_meltdown()
MusicSystem.crossfade_to("meltdown", 1.0)
AmbientSystem.set_zone("shift", 1.0)
ScreenEffects.shake(1.5, 1500)
```

### EventBus Signals
```
signal shift_warning(stage: int, seconds_remaining: float)
signal shift_triggered(scenario_id: String)
signal shift_completed(escaped: bool)
```

### Query API
```gdscript
func get_time_until_shift() -> Dictionary:
    # Returns: { seconds, is_imminent, warning_level, is_active }
    # warning_level: "safe" | "yellow" (<=60s) | "orange" (<=30s) | "red" (<=10s)

func format_countdown() -> String:
    # Returns "5:30" or "ACTIVE"
```

---

## 24. Shift Bonus System

> Query interface for shift-active multipliers.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/shift-bonus-system.js` (243 lines) |
| **GD Target** | `res://systems/shift_bonus_system.gd` |
| **Priority** | 5 |

### Bonus Types
```gdscript
enum BonusType {
    EPIC_DROPS, RARE_DROPS, GOLD_DROPS, POTION_DROPS,
    XP_GAIN, DAMAGE_DEALT, DAMAGE_TAKEN,
    MOVE_SPEED, HEALTH_REGEN, STAMINA_REGEN,
    LIFESTEAL, SPECIAL_VISION, BANISH_CHANCE
}
```

### Key Methods
```gdscript
func get_multiplier(bonus_type: String) -> float:
    # Returns 1.0 if no shift active, else bonus multiplier
    # Current: magma_collapse grants 2.0x epic_drops

func is_active(bonus_type: String) -> bool
func get_active_bonuses() -> Array[Dictionary]
func apply_to_rarity_weights(weights: Dictionary) -> Dictionary
```

---

## 25. Spawn Point System

> Continuous enemy spawning from rifts, nests, portals during shift scenarios.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/spawn-point-system.js` (738 lines) |
| **GD Target** | `res://systems/spawn_point_system.gd` |
| **Priority** | 38 |

### Spawn Types
| Type | Size | Rate (ms) | Cap | Health | Pool |
|---|---|---|---|---|---|
| `rift` | 2x2 | 10000 | 5 | indestructible | void_wraith |
| `nest` | 1x1 | 12000 | 3 | 100 | spider |
| `portal` | 2x2 | 15000 | 4 | 200 | demon |
| `grave` | 1x1 | 18000 | 2 | 50 | skeleton, zombie |
| `hive` | 3x3 | 8000 | 6 | 300 | swarm |
| `summoning_circle` | 2x2 | 25000 | 2 | 150 | elite |

### Config
```gdscript
const GLOBAL_SPAWN_CAP: int = 12
const MIN_SPAWN_DISTANCE: int = 3   # Tiles from player
```

### Key Methods
```gdscript
func create(config: Dictionary) -> String:
    # Returns spawn_point_id
    # Marks tiles on map

func destroy(spawn_point_id: String, kill_spawns: bool = false) -> void
func damage(spawn_point_id: String, amount: int) -> bool:
    # Returns true if destroyed

func spawn_enemy(spawn_point: Dictionary) -> Node:
    # Uses EnemyFactory.create_and_register()
    # Checks per-point cap and global cap
    # Difficulty scales with floor: 1 + (floor - 1) * floor_scale

func on_spawned_enemy_death(enemy: Node) -> void:
    # Removes from tracking set
```

### Conversion Notes
- Destructible spawn points have HP and can be attacked
- `rateScale` accelerates spawning over time (multiplied per spawn)
- Uses `EnemyFactory` for consistent enemy creation

---

## 26. Loot System

> Floor-based rarity weights, element enchantment, loot piles, and favor/sacrifice.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/loot-system.js` (800 lines) |
| **GD Target** | `res://systems/loot_system.gd` |
| **Priority** | 70 |

### Config
```gdscript
const DESPAWN_TIME: float = 120.0       # Seconds
const MONSTER_ITEM_CHANCE: float = 0.25
const EQUIPMENT_DROP_CHANCE: float = 0.40
const WEAPON_RATIO: float = 0.50
const ARMOR_RATIO: float = 0.50
const SHIELD_FROM_ARMOR: float = 0.15
```

### Floor Rarity Weights
| Floor | Common | Uncommon | Rare | Epic |
|---|---|---|---|---|
| 1 | 90% | 10% | 0% | 0% |
| 3 | 65% | 25% | 9% | 1% |
| 5 | 50% | 30% | 15% | 5% |
| 7 | 40% | 30% | 20% | 10% |
| 10 | 25% | 26% | 30% | 19% |

### Element Enchantment
```gdscript
const ENCHANT_CHANCE: float = 0.67     # 67% chance of element
const ELEMENTS: Array = [
    "fire", "ice", "lightning", "nature", "water",
    "earth", "dark", "holy", "arcane", "void"
]

func _roll_enchantment(rarity: String) -> Dictionary:
    # Power by rarity: common=1, uncommon=2, rare=4, epic=6, legendary=7
    # Returns: { element: String, power: int }
```

### Favor / Sacrifice
```gdscript
func sacrifice_item(item: Dictionary) -> int:
    # HP restoration by rarity:
    # common: 2-5, uncommon: 8-15, rare: 30-50, epic: 100-120
    # Item is destroyed
```

### Loot Pile Structure
```gdscript
class LootPile:
    var id: String
    var position: Vector2i
    var items: Array[Dictionary]
    var spawn_time: float
    # Last 10s: blink effect via sin(age / 150)
```

### EventBus Signals
```
signal loot_dropped(pile: LootPile)
signal loot_picked_up(item: Dictionary)
signal loot_despawned(pile_id: String)
signal item_sacrificed(item: Dictionary, hp_restored: int)
```

---

## 27. Quest System

> Quest tracking with objectives, progression, and rewards.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/quest-system.js` (464 lines) |
| **GD Target** | `res://systems/quest_system.gd` |
| **Priority** | 85 |

### Quest Structure
```gdscript
class Quest:
    var id: String
    var title: String
    var description: String
    var objectives: Array[QuestObjective]
    var rewards: Dictionary            # gold, xp, items
    var status: String = "available"   # available | active | completed | turned_in
    var giver_npc: String

class QuestObjective:
    var type: String     # kill, collect, deliver, explore, talk
    var target: String   # monster_id, item_id, room_id, npc_id
    var required: int
    var current: int = 0
```

### Key Methods
```gdscript
func accept_quest(quest_id: String) -> bool
func update_objective(type: String, target: String, amount: int = 1) -> void
func complete_quest(quest_id: String) -> Dictionary:   # Returns rewards
func get_active_quests() -> Array[Quest]
```

### Persistence
- Quest progress is PERSISTENT (survives death)
- Stored via `SaveManager`
- Objectives auto-track via EventBus listeners

---

## 28. Quest Item System

> Collectible objectives during shift scenarios with carry effects and delivery points.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/quest-item-system.js` (775 lines) |
| **GD Target** | `res://systems/quest_item_system.gd` |
| **Priority** | 66 |

### Item Types
| Type | Carry Effect | Max Carry |
|---|---|---|
| `seal_fragment` | -15% speed, glowing, attracts void | 5 |
| `keycard` | None | 10 |
| `crystal_shard` | -10% speed, 1 DOT/s | 1 |
| `holy_relic` | +3 light radius, damages undead | 1 |
| `energy_cell` | -10% speed, explodes on death (50 dmg, r=3) | 2 |

### Key Methods
```gdscript
func start_quest(config: Dictionary) -> void
func spawn_item(config: Dictionary) -> String
func collect_item(item_id: String) -> bool
func drop_item(item_id: String) -> bool
func deliver_items(delivery_point_id: String) -> int

func update_player_carry_effects() -> void:
    # Combines all carried item effects:
    # - speed_mod (multiplicative)
    # - glowing (boolean OR)
    # - light_radius (max)
    # - attracts (union of Sets)
```

---

## 29. Crafting System

> Recipe-based crafting with quality variation and crafting queue.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/crafting-system.js` (551 lines) |
| **GD Target** | `res://systems/crafting_system.gd` |
| **Priority** | 88 |

### Quality Tiers
| Quality | Chance | Stat Bonus |
|---|---|---|
| Standard | 75% | 0% |
| Superior | 20% | +15% |
| Masterwork | 5% | +30% |

### Recipe Structure
```gdscript
class Recipe:
    var id: String
    var result_item: String
    var ingredients: Dictionary     # item_id -> quantity
    var crafting_time: float        # seconds
    var required_station: String    # forge, alchemy_table, etc.
    var skill_requirement: Dictionary  # proficiency -> level
```

### Key Methods
```gdscript
func can_craft(recipe_id: String) -> bool:
    # Checks ingredients, station proximity, skill level

func start_crafting(recipe_id: String) -> bool:
    # Consumes ingredients, adds to queue

func update_queue(delta: float) -> void:
    # Progress active craft, complete when timer expires
    # Roll quality on completion
```

### Persistence
- Recipes unlocked are PERSISTENT
- Crafting queue is SESSION-scoped (cleared on death)

---

## 30. Banking System

> Persistent gold and item storage, survives death.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/banking-system.js` (417 lines) |
| **GD Target** | `res://systems/banking_system.gd` |

### Config
```gdscript
const MAX_BANK_SLOTS: int = 30
const MAX_GOLD: int = 999999
```

### Key Methods
```gdscript
func deposit_gold(amount: int) -> bool
func withdraw_gold(amount: int) -> bool
func deposit_item(inventory_slot: int) -> bool
func withdraw_item(bank_slot: int) -> bool
func get_balance() -> int
func get_bank_contents() -> Array[Dictionary]
```

### Persistence
- Bank data is PERSISTENT (saved via `SaveManager`)
- Gold and items survive death
- Bank accessible only in village via Banker NPC

---

## 31. Loadout System

> Pre-run equipment selection from banked items.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/loadout-system.js` (459 lines) |
| **GD Target** | `res://systems/loadout_system.gd` |

### Equipment Slots
```gdscript
enum EquipSlot { WEAPON, ARMOR, SHIELD, ACCESSORY_1, ACCESSORY_2 }
```

### Key Methods
```gdscript
func equip_from_bank(bank_slot: int, equip_slot: EquipSlot) -> bool
func unequip_to_bank(equip_slot: EquipSlot) -> bool
func get_loadout() -> Dictionary:
    # Returns: { weapon: ItemData, armor: ItemData, ... }

func apply_loadout_to_player() -> void:
    # Called at run start, applies all equipped items to player stats
```

### Persistence
- Loadout configuration is PERSISTENT
- References bank slot indices

---

## 32. Village System

> Village hub scene with grid movement and NPC interaction.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/village-system.js` (398 lines) |
| **GD Target** | `res://scenes/village/village_system.gd` |

### Movement
```gdscript
# Village uses tile-snap (grid) movement, NOT velocity-based
func move_player(direction: Vector2i) -> bool:
    # Checks tile walkability
    # Snaps to grid position
    # No diagonal movement in village
```

### NPC Interaction
```gdscript
func interact_with_npc(npc_id: String) -> void:
    # Reads NPC data to determine interaction type:
    # shop, quest_giver, banker, blacksmith, alchemist, etc.
    # Opens appropriate UI overlay

func get_nearby_npcs(range: int = 1) -> Array[Dictionary]:
    # Returns NPCs within interaction range
```

### Facilities
| NPC | Function |
|---|---|
| Blacksmith | Crafting (forge station) |
| Alchemist | Crafting (alchemy table) |
| Banker | Banking / loadout |
| General Store | Buy/sell items |
| Innkeeper | Heal, save game |
| Elder | Main questline |
| Priestess | Boon preview (future) |
| Expedition Master | Start dungeon run |

---

## 33. Bark System

> NPC ambient dialogue with context-aware triggers.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/bark-system.js` (328 lines) |
| **GD Target** | `res://systems/bark_system.gd` |

### Bark Triggers
```gdscript
enum BarkTrigger {
    PROXIMITY,          # Player walks near NPC
    WORLD_STATE,        # World state changed
    QUEST_COMPLETE,     # Quest was turned in
    ITEM_PURCHASED,     # Bought from shop
    RETURN_FROM_RUN,    # Player returned from dungeon
    LOW_HP,             # Player below 25% HP
}
```

### Key Methods
```gdscript
func check_barks(player: Node) -> void:
    # For each NPC in range:
    #   Check trigger conditions
    #   Select contextual dialogue line
    #   Show floating text bubble (3s duration)
    #   Cooldown: 30s per NPC before next bark
```

---

## 34. Training System

> Training dummies in village for DPS testing.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/training-system.js` (375 lines) |
| **GD Target** | `res://systems/training_system.gd` |

### Features
- Training dummy with infinite HP
- DPS calculator: tracks damage over rolling 10s window
- Displays: current DPS, peak DPS, hit count, crit rate
- Reset on demand

### Key Methods
```gdscript
func start_training() -> void
func stop_training() -> void
func record_hit(damage: int, is_crit: bool) -> void
func get_dps_stats() -> Dictionary:
    # Returns: { current_dps, peak_dps, hits, crits, crit_rate }
```

---

## 35. World State System

> 4 one-way world states that change village appearance and NPC behavior.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/world-state-system.js` (500 lines) |
| **GD Target** | `res://systems/world_state_system.gd` |

### States (One-Way Progression)
```
NORMAL -> ASH -> BURNING -> ENDGAME
```

| State | Trigger | Effects |
|---|---|---|
| NORMAL | Default | Standard village, all NPCs |
| ASH | Reach floor 4 | Dark sky, some NPCs worried |
| BURNING | Reach floor 7 | Fire particles, NPCs panic, prices up |
| ENDGAME | Reach floor 10 | Red sky, final preparations |

### Key Methods
```gdscript
func check_progression(floor: int) -> void:
    # Advances state based on deepest floor reached
    # One-way: never reverts

func get_world_state() -> String
func get_npc_dialogue_modifier() -> String:
    # NPCs change dialogue based on world state
```

### Persistence
- World state is PERSISTENT (saved via `SaveManager`)
- Floor-triggered, never resets

---

## 36. Core System (Boss Arena)

> Final boss encounter with 3-phase fight.

| Field | Value |
|---|---|
| **JS Source** | `js/systems/core-system.js` (724 lines) |
| **GD Target** | `res://systems/core_system.gd` |
| **Priority** | 95 |

### Boss Phases
| Phase | HP Threshold | Mechanics |
|---|---|---|
| 1 | 100%-66% | Standard attacks, summon adds |
| 2 | 66%-33% | Enrage, new attack patterns, arena hazards |
| 3 | 33%-0% | Desperation, all abilities, shrinking arena |

### Key Methods
```gdscript
func start_boss_encounter() -> void:
    # Lock arena doors, spawn boss, start phase 1

func check_phase_transition() -> void:
    # Monitor boss HP, trigger phase changes

func spawn_arena_hazards(phase: int) -> void:
    # Phase-specific environmental dangers
```

---

## 37. Verification Matrix

### Per-System Checklist

For each system, verify:

| Check | Description |
|---|---|
| **State Init** | All state variables initialized correctly |
| **Update Loop** | `system_update(delta)` called at correct priority |
| **Cleanup** | `system_cleanup()` resets all state on floor change |
| **EventBus** | All signals connected and emitted correctly |
| **Persistence** | Session vs persistent data saved/loaded correctly |
| **Dependencies** | All required autoloads/systems available |
| **Edge Cases** | Null checks, empty arrays, division by zero |

### Integration Test Scenarios

| Test | Systems Involved |
|---|---|
| Full dungeon run (floor 1-3) | All systems |
| Shift meltdown + escape | shift, dynamic-tile, spawn-point, loot |
| Boon shrine offering + synergy | boon, stat-modifier-stack |
| Kill streak to Godlike tier | kill-streak, damage-resolver, loot |
| Environmental meter thresholds | environmental-meter, dynamic-tile, vision |
| Dodge through hazard zone | dodge, hazard, stamina, damage-resolver |
| Craft + equip + enter dungeon | crafting, inventory, loadout, banking |
| Quest completion cycle | quest, quest-item, village |
| Full death + respawn cycle | survival-integration, boon (clear), banking (persist) |
| Light source fuel depletion | light-source, vision, noise (torch off = louder?) |

### Persistence Boundary

| Persistent (Survives Death) | Session (Cleared on Death) |
|---|---|
| Bank gold + items | Inventory contents |
| Loadout configuration | Boons (all cleared) |
| Quest progress | Kill streak stats |
| World state (NORMAL->ENDGAME) | Floor number |
| Highest skill levels | Current skill levels/XP |
| Crafting recipes unlocked | Crafting queue |
| Run statistics (historical) | Current run stats |

---

*End of WP-03: Core Game Systems*
