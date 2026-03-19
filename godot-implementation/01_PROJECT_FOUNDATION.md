# Work Package 01: Project Foundation

## Objective
Set up the Godot 4.3+ project structure, autoload singletons, consolidated state architecture, event bus, and system coordinator. This is the skeleton everything else attaches to.

## Dependencies
- None (this is the root)

## Source Files to Reference
| JS File | Lines | Purpose |
|---------|-------|---------|
| `js/core/constants.js` | 494 | All game constants, enums, config values |
| `js/core/game-state.js` | 596 | 4 global state objects |
| `js/core/event-bus.js` | 45 | Pub/sub event system |
| `js/core/system-manager.js` | 444 | Priority-based system orchestration |
| `js/core/save-manager.js` | 414 | localStorage save/load |
| `js/core/session-manager.js` | 330 | Run lifecycle tracking |
| `js/core/crash-recovery.js` | 122 | Error handling |
| `js/core/main.js` | 210 | Game loop |

## Output Files to Create

### 1. `project.godot`
Standard Godot project file. Key settings:
```
[application]
config/name="The Shifting Chasm"
run/main_scene="res://scenes/main/main.tscn"
config/features=PackedStringArray("4.3")

[autoload]
Constants="*res://autoload/constants.gd"
EventBus="*res://autoload/event_bus.gd"
GameManager="*res://autoload/game_manager.gd"
SaveManager="*res://autoload/save_manager.gd"
AudioManager="*res://autoload/audio_manager.gd"

[display]
window/size/viewport_width=1280
window/size/viewport_height=720
window/stretch/mode="canvas_items"

[input]
move_up={...}
move_down={...}
move_left={...}
move_right={...}
attack={...}
interact={...}
inventory={...}
pause={...}
```

### 2. `autoload/constants.gd`

Convert `js/core/constants.js` (~494 lines). This contains all game tuning values.

**JS source structure to convert:**
```javascript
// Game states enum
const GAME_STATES = { MENU, PLAYING, DEAD, VILLAGE, PAUSED, ... }

// Grid/display constants
const GRID_WIDTH = 200, GRID_HEIGHT = 200
const BASE_TILE_SIZE = 16
const VIEWPORT_TILES_X = 20, VIEWPORT_TILES_Y = 15

// Player defaults
const PLAYER_CONFIG = { baseHp: 100, baseStats: {str:10, dex:10, int:10, vit:10}, ... }

// Movement
const MOVEMENT_CONFIG = { baseSpeed: 4, friction: 0.85, ... }

// Combat timing
const ATTACK_SPEEDS = { dagger: 250, sword: 375, ... }

// AI
const AI_CONFIG = { sightRange: 6, hearingRange: 4, ... }

// Inventory
const INVENTORY_CONFIG = { maxSlots: 15, stackableTypes: [...] }

// Vision
const VISION_CONFIG = { baseRange: 8, torchBonus: 3, ... }
```

**Godot implementation:**
```gdscript
class_name ConstantsDef
extends Node

# --- Game States ---
enum GameState {
    MENU,
    PLAYING,
    DEAD,
    VILLAGE,
    PAUSED,
    COMBAT,
    DIALOGUE,
    SHOP,
    INVENTORY,
    CHARACTER_SHEET,
    CRAFTING,
    GAME_OVER,
    VICTORY
}

# --- Grid ---
const GRID_WIDTH: int = 200
const GRID_HEIGHT: int = 200
const BASE_TILE_SIZE: int = 16

# --- Tile Types ---
enum TileType { FLOOR, WALL, DOOR, STAIRS_DOWN, LAVA, WATER, ... }

# Replicate all config objects as const dictionaries or inner classes.
# Keep the same groupings as the JS file for traceability.
```

**Conversion rules:**
- JS `const OBJECT = {...}` → GDScript `const OBJECT: Dictionary = {...}` or typed inner class
- JS string enums → GDScript `enum`
- JS arrays → `Array` or `PackedStringArray`
- Numeric constants → `const NAME: int/float = value`

### 3. `autoload/event_bus.gd`

The JS EventBus is a generic pub/sub. In Godot, use **typed signals** for compile-time safety.

**All 27 events found in the JS codebase:**

```gdscript
class_name EventBusDef
extends Node

# --- Floor Events ---
signal floor_advanced(new_floor: int, previous_floor: int)

# --- Player Combat Events ---
signal player_hit_enemy(player: Node, enemy: Node, damage: float, weapon_type: String)
signal player_critical_hit(player: Node, enemy: Node, damage: float)
signal player_damage_taken(player: Node, damage: float, source: Node)
signal player_killed_enemy(player: Node, enemy: Node)
signal player_took_damage(player: Node, amount: float, source: Node)
signal player_crit_hit(player: Node, enemy: Node, damage: float)

# --- Boon Events ---
signal player_boon_selected(boon_id: String, ancestor: String)
signal player_boon_removed(boon_id: String)
signal synergy_activated(ancestor: String, tier: int)
signal synergy_deactivated(ancestor: String, tier: int)

# --- Enemy Events ---
signal enemy_death(enemy: Node, killer: Node, overkill: float)

# --- Encirclement Events ---
signal encirclement_changed(player: Node, enemy_count: int)
signal encirclement_flanked(player: Node)
signal encirclement_surrounded(player: Node)
signal encirclement_clear(player: Node)

# --- Dodge Events ---
signal player_dodge_start(player: Node, direction: Vector2)
signal player_dodge_end(player: Node)

# --- Hazard Events ---
signal hazard_created(position: Vector2, type: String, damage: float)
signal hazard_damage(target: Node, damage: float, type: String)

# --- Spell Events ---
signal player_spell_cast(spell_name: String, position: Vector2)
signal player_spell_heal(player: Node, amount: float)
signal player_spell_shield(player: Node, amount: float)
signal player_shield_break(player: Node)
signal player_shield_expire(player: Node)

# --- Stamina Events ---
signal stamina_exhausted(player: Node)
signal stamina_recovered(player: Node)
```

### 4. `autoload/game_manager.gd`

**Consolidates JS's 4 state objects into 2:**

| JS Object | → Godot Location | Rationale |
|-----------|-------------------|-----------|
| `game` (runtime) | `GameManager.run_state` | Active dungeon data |
| `sessionState` | Merged into `run_state` | Was duplicating `game` fields |
| `persistentState` | `GameManager.persistent_state` | Survives death, saved to disk |
| `villageState` | `GameManager.village_state` (lightweight) | Reset per village visit |

```gdscript
class_name GameManagerDef
extends Node

# --- Current game state ---
var current_state: Constants.GameState = Constants.GameState.MENU

# --- Run State (cleared on death) ---
var run_state: RunState = null

# --- Persistent State (saved to disk) ---
var persistent_state: PersistentState = null

# --- Village State (reset per visit) ---
var village_state: VillageState = null

# --- Entity references (live) ---
var player: Node = null
var enemies: Array[Node] = []
var npcs: Array[Node] = []
var ground_loot: Array[Dictionary] = []

# --- Map data ---
var map: Array = []  # 2D array of TileType
var rooms: Array[Dictionary] = []
var doorways: Array[Dictionary] = []
var lava_tiles: Dictionary = {}  # Set<Vector2i>

# --- Camera ---
var camera_position: Vector2 = Vector2.ZERO

func _ready() -> void:
    persistent_state = SaveManager.load_game()
    if persistent_state == null:
        persistent_state = PersistentState.new()

func start_new_run() -> void:
    run_state = RunState.new()
    run_state.active = true
    run_state.run_id = str(randi())
    run_state.start_time = Time.get_unix_time_from_system()

func end_run(survived: bool) -> void:
    if survived:
        _bank_inventory()
    persistent_state.stats.total_runs += 1
    if not survived:
        persistent_state.stats.deaths += 1
    run_state = null
    SaveManager.save_game(persistent_state)

func change_state(new_state: Constants.GameState) -> void:
    var old_state := current_state
    current_state = new_state
    EventBus.game_state_changed.emit(old_state, new_state)
```

**Inner classes (or separate .gd files):**

```gdscript
# RunState — everything about the current dungeon run
class RunState extends RefCounted:
    var active: bool = false
    var run_id: String = ""
    var start_time: float = 0.0
    var current_floor: int = 1
    var floor_time: float = 0.0
    var gold: int = 50
    var inventory: Array = []
    var path_down: Vector2i = Vector2i(-1, -1)
    var path_down_discovered: bool = false
    var mini_boss_defeated: bool = false
    var shift_active: bool = false
    var shift_meter: float = 0.0
    var explored_tiles: Dictionary = {}  # Set<Vector2i>

# PersistentState — survives death, written to disk
class PersistentState extends RefCounted:
    var save_slot: int = 0
    var created_at: float = 0.0
    var last_played: float = 0.0
    var version: int = 1
    var bank_gold: int = 0
    var bank_items: Array = []
    var bank_capacity: int = 30
    var stats: Dictionary = {
        "total_runs": 0, "deaths": 0, "total_kills": 0,
        "total_gold_earned": 0, "victories": 0, "deepest_floor": 1,
        "mini_bosses_defeated": 0, "playtime": 0.0,
        "core_defeated": false
    }
    var quests_available: Array = []
    var quests_active: Array = []
    var quests_completed: Array = []
    var recipes_known: Array[String] = []
    var village_improvements: Array[String] = []
    var npc_states: Dictionary = {}
    var world_state: int = 1
    var monsters_discovered: Array[String] = []
    var monster_kill_counts: Dictionary = {}
    var skills: Dictionary = {}  # Populated by SkillSystem
    var victory_achieved: bool = false

# VillageState — lightweight, reset each visit
class VillageState extends RefCounted:
    var player_position: Vector2 = Vector2(25, 20)
    var current_building: String = ""
    var inside_building: bool = false
    var active_npc: String = ""
    var map: Array = []
    var buildings: Array[Dictionary] = []
    var npcs: Array[Dictionary] = []
```

### 5. `autoload/save_manager.gd`

Convert `js/core/save-manager.js` (414 lines). Replace `localStorage` with Godot `FileAccess`.

```gdscript
class_name SaveManagerDef
extends Node

const SAVE_PATH: String = "user://save_slot_%d.json"
const AUTO_SAVE_INTERVAL: float = 30.0  # seconds

var _auto_save_timer: float = 0.0

func _process(delta: float) -> void:
    if GameManager.current_state == Constants.GameState.PLAYING:
        _auto_save_timer += delta
        if _auto_save_timer >= AUTO_SAVE_INTERVAL:
            _auto_save_timer = 0.0
            save_game(GameManager.persistent_state)

func save_game(state: GameManager.PersistentState, slot: int = 0) -> bool:
    var path := SAVE_PATH % slot
    var file := FileAccess.open(path, FileAccess.WRITE)
    if file == null:
        push_error("SaveManager: Failed to open %s" % path)
        return false
    var data := _serialize_state(state)
    file.store_string(JSON.stringify(data, "\t"))
    file.close()
    return true

func load_game(slot: int = 0) -> GameManager.PersistentState:
    var path := SAVE_PATH % slot
    if not FileAccess.file_exists(path):
        return null
    var file := FileAccess.open(path, FileAccess.READ)
    var text := file.get_as_text()
    file.close()
    var json := JSON.new()
    if json.parse(text) != OK:
        push_error("SaveManager: Parse error in %s" % path)
        return null
    return _deserialize_state(json.data)

func has_save(slot: int = 0) -> bool:
    return FileAccess.file_exists(SAVE_PATH % slot)

func delete_save(slot: int = 0) -> void:
    var path := SAVE_PATH % slot
    if FileAccess.file_exists(path):
        DirAccess.remove_absolute(path)

func _serialize_state(state: GameManager.PersistentState) -> Dictionary:
    # Convert PersistentState to plain Dictionary for JSON
    return {
        "save_slot": state.save_slot,
        "created_at": state.created_at,
        "last_played": Time.get_unix_time_from_system(),
        "version": state.version,
        "bank_gold": state.bank_gold,
        "bank_items": state.bank_items,
        "bank_capacity": state.bank_capacity,
        "stats": state.stats,
        "quests_available": state.quests_available,
        "quests_active": state.quests_active,
        "quests_completed": state.quests_completed,
        "recipes_known": state.recipes_known,
        "village_improvements": state.village_improvements,
        "npc_states": state.npc_states,
        "world_state": state.world_state,
        "monsters_discovered": state.monsters_discovered,
        "monster_kill_counts": state.monster_kill_counts,
        "skills": state.skills,
        "victory_achieved": state.victory_achieved,
    }

func _deserialize_state(data: Dictionary) -> GameManager.PersistentState:
    var state := GameManager.PersistentState.new()
    # Map each key back. Use .get() with defaults for forward-compat.
    state.save_slot = data.get("save_slot", 0)
    state.created_at = data.get("created_at", 0.0)
    state.last_played = data.get("last_played", 0.0)
    state.version = data.get("version", 1)
    state.bank_gold = data.get("bank_gold", 0)
    state.bank_items = data.get("bank_items", [])
    state.bank_capacity = data.get("bank_capacity", 30)
    state.stats = data.get("stats", {})
    state.quests_available = data.get("quests_available", [])
    state.quests_active = data.get("quests_active", [])
    state.quests_completed = data.get("quests_completed", [])
    state.recipes_known = data.get("recipes_known", [])
    state.village_improvements = data.get("village_improvements", [])
    state.npc_states = data.get("npc_states", {})
    state.world_state = data.get("world_state", 1)
    state.monsters_discovered = data.get("monsters_discovered", [])
    state.monster_kill_counts = data.get("monster_kill_counts", {})
    state.skills = data.get("skills", {})
    state.victory_achieved = data.get("victory_achieved", false)
    return state
```

### 6. `scripts/systems/system_coordinator.gd`

Replaces `js/core/system-manager.js`. Manages priority-ordered system execution.

**Complete system registry (from JS codebase):**

| Priority | System Name | JS File | GDScript Target |
|----------|-------------|---------|-----------------|
| 1 | SurvivalIntegration | survival-integration.js | survival_integration.gd |
| 4 | light-source-system | light-source-system.js | light_source_system.gd |
| 5 | audio-manager | audio-manager.js | (autoload) |
| 5 | shift-bonus-system | shift-bonus-system.js | shift_bonus_system.gd |
| 5 | vision | vision-system.js | vision_system.gd |
| 8 | time-effects | time-effects.js | time_effects.gd |
| 10 | input-handler | input-handler.js | input_handler.gd |
| 24 | spell-system | spell-system.js | spell_system.gd |
| 25 | dodge-system | dodge-system.js | dodge_system.gd |
| 25 | player-animation | player-animation.js | player_animation.gd |
| 28 | stamina | stamina-system.js | stamina_system.gd |
| 30 | noise-system | noise-system.js | noise_system.gd |
| 35 | hazards | hazard-system.js | hazard_system.gd |
| 36 | dynamic-tile-system | dynamic-tile-system.js | dynamic_tile_system.gd |
| 37 | environmental-meter | environmental-meter-system.js | environmental_meter.gd |
| 38 | enemy-ability-system | enemy-ability-system.js | enemy_ability_system.gd |
| 38 | spawn-point-system | spawn-point-system.js | spawn_point_system.gd |
| 39 | boss-system | boss.js | boss_system.gd |
| 40 | enemy-ai | enemy-ai.js | enemy_ai.gd |
| 41 | npc-system | npc.js | npc_system.gd |
| 42 | monster-social | monster-social-system.js | monster_social.gd |
| 43 | monster-animation | monster-animation-system.js | monster_animation.gd |
| 45 | ability-projectiles | ability-projectile-system.js | ability_projectile.gd |
| 45 | combat-enhancements | combat-master.js (partial) | combat_enhancements.gd |
| 50 | combat-master | combat-master.js | combat_master.gd |
| 51 | combat-effect-system | combat-effect-system.js | combat_effects.gd |
| 55 | skills-combat | skills-combat-integration.js | skills_combat.gd |
| 55 | status-effects | status-effect-system.js | status_effect_manager.gd |
| 60 | skill-system | skill-system.js | skill_system.gd |
| 62 | kill-streaks | kill-streak-system.js | kill_streak.gd |
| 65 | inventory-system | inventory-system.js | inventory_system.gd |
| 66 | quest-item-system | quest-item-system.js | quest_item_system.gd |
| 70 | loot-system | loot-system.js | loot_system.gd |
| 80 | shift-system | shift-system.js | shift_system.gd |
| 82 | kill-streak-ui | kill-streak-ui.js | kill_streak_ui.gd |
| 85 | QuestSystem | quest-system.js | quest_system.gd |
| 88 | CraftingSystem | crafting-system.js | crafting_system.gd |
| 90 | particle-system | particle-system.js | particle_system.gd |
| 95 | CoreSystem | core-system.js | core_system.gd |

**Godot implementation pattern:**

```gdscript
class_name SystemCoordinator
extends Node

# Each registered system must implement:
#   func system_init(game_manager: GameManagerDef) -> void
#   func system_update(delta: float) -> void
#   func system_cleanup() -> void  (optional)

var _systems: Array[Dictionary] = []
var _initialized: bool = false

func register(system_name: String, system_node: Node, priority: int) -> void:
    _systems.append({
        "name": system_name,
        "node": system_node,
        "priority": priority
    })
    _systems.sort_custom(func(a, b): return a["priority"] < b["priority"])

func init_all() -> void:
    for entry in _systems:
        if entry["node"].has_method("system_init"):
            entry["node"].system_init(GameManager)
    _initialized = true

func update_all(delta: float) -> void:
    if not _initialized:
        return
    for entry in _systems:
        if entry["node"].has_method("system_update"):
            entry["node"].system_update(delta)

func cleanup_all() -> void:
    for entry in _systems:
        if entry["node"].has_method("system_cleanup"):
            entry["node"].system_cleanup()
    _systems.clear()
    _initialized = false

func get_system(system_name: String) -> Node:
    for entry in _systems:
        if entry["name"] == system_name:
            return entry["node"]
    return null
```

### 7. `scenes/main/main.gd`

Replaces `js/core/main.js` (210 lines) + `js/core/game-init.js` (937 lines).

```gdscript
extends Node

@onready var system_coordinator: SystemCoordinator = $SystemCoordinator
@onready var world: Node2D = $World
@onready var ui_layer: CanvasLayer = $UILayer
@onready var camera: Camera2D = $Camera2D

func _ready() -> void:
    _register_systems()
    system_coordinator.init_all()
    GameManager.change_state(Constants.GameState.MENU)

func _process(delta: float) -> void:
    match GameManager.current_state:
        Constants.GameState.MENU:
            pass  # Menu handles itself
        Constants.GameState.VILLAGE:
            system_coordinator.update_all(delta)
        Constants.GameState.PLAYING:
            system_coordinator.update_all(delta)
            _update_camera(delta)
        Constants.GameState.PAUSED:
            pass

func _register_systems() -> void:
    # Systems are child nodes of SystemCoordinator in the scene tree.
    # Each system script calls system_coordinator.register() in its _ready().
    # Alternatively, register them explicitly here for full control.
    pass

func _update_camera(delta: float) -> void:
    if GameManager.player:
        camera.position = camera.position.lerp(
            GameManager.player.position, 5.0 * delta
        )

func start_village() -> void:
    system_coordinator.cleanup_all()
    GameManager.village_state = GameManager.VillageState.new()
    # Load village scene, generate layout
    _register_systems()
    system_coordinator.init_all()
    GameManager.change_state(Constants.GameState.VILLAGE)

func start_dungeon_run() -> void:
    GameManager.start_new_run()
    # Generate dungeon, spawn player, spawn enemies
    GameManager.change_state(Constants.GameState.PLAYING)

func end_dungeon_run(survived: bool) -> void:
    GameManager.end_run(survived)
    if survived:
        start_village()
    else:
        GameManager.change_state(Constants.GameState.GAME_OVER)
```

### 8. `scenes/main/main.tscn` (Scene Tree)

```
Main (Node) [main.gd]
├── SystemCoordinator (Node) [system_coordinator.gd]
│   ├── VisionSystem (Node)
│   ├── NoiseSystem (Node)
│   ├── HazardSystem (Node)
│   ├── ... (all systems as child nodes)
│
├── World (Node2D)
│   ├── TileMap (TileMapLayer)
│   ├── Entities (Node2D)
│   │   ├── Player (instantiated at runtime)
│   │   └── Enemies (Node2D, children added at runtime)
│   └── GroundLoot (Node2D)
│
├── Camera2D
│
├── UILayer (CanvasLayer)
│   ├── HUD (Control)
│   ├── Menus (Control)
│   └── Overlays (Control)
│
└── AudioPlayers (Node)
    ├── MusicPlayer (AudioStreamPlayer)
    ├── AmbiencePlayer (AudioStreamPlayer)
    └── SFXPool (Node, children are AudioStreamPlayer instances)
```

## Verification Checklist
- [ ] `project.godot` loads without errors in Godot editor
- [ ] All 5 autoloads initialize in order (Constants → EventBus → GameManager → SaveManager → AudioManager)
- [ ] `GameManager.persistent_state` is non-null after `_ready()`
- [ ] `SaveManager.save_game()` writes JSON to `user://`
- [ ] `SaveManager.load_game()` reads it back correctly
- [ ] `EventBus` signals can be connected and emitted from any script
- [ ] `SystemCoordinator` registers, sorts by priority, and calls `system_update()` in order
- [ ] `main.tscn` opens in editor with scene tree visible
- [ ] State transitions work: MENU → VILLAGE → PLAYING → GAME_OVER → MENU
