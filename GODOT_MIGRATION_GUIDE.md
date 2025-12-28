# Godot Migration Implementation Guide

## Overview

This guide details the step-by-step process for migrating the JavaScript roguelike (85,667 LOC) to Godot 4.x using GDScript. The migration is organized into 10 phases with clear dependencies and milestones.

---

## Phase 1: Project Foundation (Week 1-2)

### 1.1 Create Godot Project Structure

```
res://
├── project.godot
├── autoload/           # Singletons (GameManager, EventBus, etc.)
├── scenes/
│   ├── main/           # Main game scene
│   ├── entities/       # Player, enemies, NPCs
│   ├── ui/             # All UI screens
│   └── world/          # Map, tiles, dungeon
├── scripts/
│   ├── systems/        # Game systems (combat, AI, etc.)
│   ├── data/           # Data classes
│   └── utils/          # Utility functions
├── resources/          # Custom resources (.tres)
│   ├── items/
│   ├── monsters/
│   ├── skills/
│   └── quests/
└── assets/
    ├── sprites/
    ├── audio/
    └── fonts/
```

### 1.2 Create Core Autoloads

Create these as singletons in Project Settings → AutoLoad:

**autoload/game_manager.gd**
```gdscript
extends Node

# Core game state - replaces window.game
var player: Player
var current_floor: int = 1
var dungeon: Dungeon
var enemies: Array[Enemy] = []
var items: Array[Item] = []
var npcs: Array[NPC] = []

# System references
var combat_system: CombatSystem
var ai_system: AISystem
var loot_system: LootSystem

signal floor_changed(floor_num: int)
signal game_state_changed(state: String)

func _ready():
    # Initialize systems
    pass
```

**autoload/event_bus.gd**
```gdscript
extends Node

# Central event system - replaces JavaScript event emitters
signal player_moved(from: Vector2i, to: Vector2i)
signal player_attacked(target: Node)
signal player_damaged(amount: int, source: Node)
signal enemy_died(enemy: Node)
signal item_picked_up(item: Node)
signal skill_used(skill: Resource, target: Node)
signal turn_ended()
signal floor_entered(floor_num: int)

# UI events
signal show_dialog(dialog_data: Dictionary)
signal update_hud()
signal show_loot_popup(items: Array)
```

**autoload/constants.gd**
```gdscript
extends Node

# Tile size for grid-based movement
const TILE_SIZE := 32

# Map dimensions
const MAP_WIDTH := 80
const MAP_HEIGHT := 50

# Combat constants
const BASE_HIT_CHANCE := 0.85
const CRIT_MULTIPLIER := 1.5
const GRAZE_MULTIPLIER := 0.5

# AI States
enum AIState {
    IDLE,
    WANDERING,
    REACTING,
    SHOUTING,
    CHASING,
    COMBAT,
    CIRCLING,
    SKIRMISHING,
    DEFENSIVE,
    PANICKED,
    SEARCHING,
    RETURNING,
    SACRIFICING,
    ENRAGED,
    COMMANDED,
    PACK_RALLYING,
    TACTICAL_POSITIONING,
    SWARM_ATTACKING
}

# Monster tiers
enum MonsterTier {
    TIER_3,  # Weakest
    TIER_2,
    TIER_1,
    ELITE,
    BOSS
}

# Damage types
enum DamageType {
    PHYSICAL,
    FIRE,
    ICE,
    LIGHTNING,
    POISON,
    HOLY,
    DARK
}
```

---

## Phase 2: Data Layer Migration (Week 2-3)

### 2.1 Create Custom Resources

Godot's Resource system replaces JavaScript data objects. Create these resource scripts:

**resources/item_data.gd**
```gdscript
@tool
class_name ItemData
extends Resource

@export var id: String
@export var name: String
@export_multiline var description: String
@export var icon: Texture2D
@export_enum("weapon", "armor", "consumable", "accessory", "material") var type: String
@export var rarity: int = 1  # 1-5
@export var value: int = 0

# Weapon stats
@export_group("Weapon Stats")
@export var damage_min: int = 0
@export var damage_max: int = 0
@export var damage_type: Constants.DamageType
@export var attack_speed: float = 1.0
@export var range: int = 1

# Armor stats
@export_group("Armor Stats")
@export var defense: int = 0
@export var resistances: Dictionary = {}

# Effects
@export_group("Effects")
@export var on_hit_effects: Array[EffectData] = []
@export var passive_effects: Array[EffectData] = []
```

**resources/monster_data.gd**
```gdscript
@tool
class_name MonsterData
extends Resource

@export var id: String
@export var name: String
@export var sprite: Texture2D
@export var tier: Constants.MonsterTier

@export_group("Base Stats")
@export var hp: int = 10
@export var attack: int = 5
@export var defense: int = 2
@export var speed: int = 100
@export var vision_range: int = 8

@export_group("Behavior")
@export_enum("pack", "tactical", "dominant") var behavior_type: String
@export var flee_threshold: float = 0.3
@export var aggression: float = 0.5

@export_group("Social")
@export var can_command: bool = false
@export var can_be_commanded: bool = false
@export var is_sacrificial: bool = false

@export_group("Loot")
@export var loot_table: LootTableData
@export var xp_value: int = 10
```

**resources/skill_data.gd**
```gdscript
@tool
class_name SkillData
extends Resource

@export var id: String
@export var name: String
@export var icon: Texture2D
@export_multiline var description: String

@export_group("Cost & Cooldown")
@export var mp_cost: int = 0
@export var hp_cost: int = 0
@export var cooldown: int = 0

@export_group("Targeting")
@export_enum("self", "single", "aoe", "line", "cone") var target_type: String
@export var range: int = 1
@export var aoe_radius: int = 0

@export_group("Effects")
@export var damage_multiplier: float = 1.0
@export var damage_type: Constants.DamageType
@export var effects: Array[EffectData] = []
```

### 2.2 Convert Data Files

Create a migration script to convert JS data to Godot resources:

**scripts/utils/data_converter.gd** (Editor tool)
```gdscript
@tool
extends EditorScript

# Run this in Godot editor to convert JSON exports of JS data

func _run():
    convert_items()
    convert_monsters()
    convert_skills()

func convert_items():
    var json = FileAccess.open("res://migration/items.json", FileAccess.READ)
    var data = JSON.parse_string(json.get_as_text())

    for item_data in data:
        var item = ItemData.new()
        item.id = item_data.id
        item.name = item_data.name
        item.description = item_data.description
        # ... map all fields

        ResourceSaver.save(item, "res://resources/items/%s.tres" % item.id)
```

### 2.3 Data Files to Migrate

This table maps your **current JavaScript source files** to the Godot resources you'll create:

| Source File (Current JS) | → Godot Resource (.tres) | Priority |
|--------------------------|--------------------------|----------|
| `js/data/items.js` | `res://resources/items/*.tres` (ItemData) | High |
| `js/data/weapons.js` | `res://resources/items/*.tres` (ItemData) | High |
| `js/data/armor.js` | `res://resources/items/*.tres` (ItemData) | High |
| `js/data/monster-types.js` | `res://resources/monsters/*.tres` (MonsterData) | High |
| `js/data/monster-tiers.js` | `res://resources/monsters/tiers/*.tres` (MonsterTierData) | High |
| `js/data/skills.js` | `res://resources/skills/*.tres` (SkillData) | High |
| `js/data/skill-trees.js` | `res://resources/skill_trees/*.tres` (SkillTreeData) | Medium |
| `js/data/quests.js` | `res://resources/quests/*.tres` (QuestData) | Medium |
| `js/data/npc-data.js` | `res://resources/npcs/*.tres` (NPCData) | Medium |
| `js/data/loot-tables.js` | `res://resources/loot/*.tres` (LootTableData) | Medium |

**Note**: `.tres` is Godot's text-based resource format. Each item/monster/skill becomes its own resource file that can be edited in Godot's inspector.

---

## Phase 3: Core Entity System (Week 3-4)

### 3.1 Base Entity Class

**scenes/entities/entity.gd**
```gdscript
class_name Entity
extends Node2D

# Grid position (separate from pixel position for smooth movement)
var grid_pos: Vector2i:
    set(value):
        grid_pos = value
        _target_position = Vector2(value) * Constants.TILE_SIZE

var _target_position: Vector2

# Base stats
@export var max_hp: int = 100
var current_hp: int:
    set(value):
        current_hp = clampi(value, 0, max_hp)
        hp_changed.emit(current_hp, max_hp)
        if current_hp <= 0:
            died.emit()

@export var attack: int = 10
@export var defense: int = 5
@export var speed: int = 100

# Status effects
var status_effects: Array[StatusEffect] = []

# Signals
signal hp_changed(current: int, maximum: int)
signal died()
signal status_applied(effect: StatusEffect)
signal status_removed(effect: StatusEffect)

func _ready():
    current_hp = max_hp
    position = Vector2(grid_pos) * Constants.TILE_SIZE

func _process(delta):
    # Smooth movement interpolation
    if position.distance_to(_target_position) > 1:
        position = position.lerp(_target_position, 10 * delta)
    else:
        position = _target_position

func take_damage(amount: int, source: Entity, damage_type: Constants.DamageType) -> int:
    var final_damage = _calculate_damage(amount, damage_type)
    current_hp -= final_damage
    return final_damage

func _calculate_damage(amount: int, damage_type: Constants.DamageType) -> int:
    # Apply defense and resistances
    var reduced = amount - defense
    return maxi(1, reduced)

func heal(amount: int) -> int:
    var old_hp = current_hp
    current_hp += amount
    return current_hp - old_hp

func apply_status(effect: StatusEffect):
    # Check for stacking/refreshing
    for existing in status_effects:
        if existing.id == effect.id:
            existing.refresh(effect)
            return

    status_effects.append(effect)
    effect.apply(self)
    status_applied.emit(effect)

func process_status_effects():
    for effect in status_effects.duplicate():
        effect.tick(self)
        if effect.is_expired():
            status_effects.erase(effect)
            effect.remove(self)
            status_removed.emit(effect)
```

### 3.2 Player Entity

**scenes/entities/player/player.gd**
```gdscript
class_name Player
extends Entity

# Equipment slots
var equipment: Dictionary = {
    "weapon": null,
    "armor": null,
    "helmet": null,
    "boots": null,
    "accessory1": null,
    "accessory2": null
}

# Inventory
var inventory: Array[ItemData] = []
const MAX_INVENTORY := 20

# Skills
var learned_skills: Array[SkillData] = []
var active_skills: Array[SkillData] = []  # Hotbar (max 8)
var skill_cooldowns: Dictionary = {}  # skill_id -> turns remaining

# Resources
var gold: int = 0
var xp: int = 0
var level: int = 1

# Skill points
var available_skill_points: int = 0
var allocated_skills: Dictionary = {}  # skill_tree_id -> points

signal xp_gained(amount: int)
signal level_up(new_level: int)
signal item_acquired(item: ItemData)
signal equipment_changed(slot: String, item: ItemData)

func _ready():
    super._ready()
    GameManager.player = self
    died.connect(_on_died)

func _unhandled_input(event):
    if not GameManager.is_player_turn:
        return

    var direction := Vector2i.ZERO

    if event.is_action_pressed("move_up"):
        direction = Vector2i.UP
    elif event.is_action_pressed("move_down"):
        direction = Vector2i.DOWN
    elif event.is_action_pressed("move_left"):
        direction = Vector2i.LEFT
    elif event.is_action_pressed("move_right"):
        direction = Vector2i.RIGHT

    if direction != Vector2i.ZERO:
        _try_move(direction)

func _try_move(direction: Vector2i):
    var target_pos = grid_pos + direction

    # Check for enemy at target
    var enemy = _get_enemy_at(target_pos)
    if enemy:
        _attack(enemy)
        return

    # Check for walkable tile
    if GameManager.dungeon.is_walkable(target_pos):
        grid_pos = target_pos
        EventBus.player_moved.emit(grid_pos - direction, grid_pos)
        _end_turn()

func _attack(target: Entity):
    var damage = GameManager.combat_system.calculate_attack(self, target)
    EventBus.player_attacked.emit(target)
    _end_turn()

func _end_turn():
    process_status_effects()
    _tick_cooldowns()
    EventBus.turn_ended.emit()

func _tick_cooldowns():
    for skill_id in skill_cooldowns.keys():
        skill_cooldowns[skill_id] -= 1
        if skill_cooldowns[skill_id] <= 0:
            skill_cooldowns.erase(skill_id)

func use_skill(skill: SkillData, target = null):
    if not can_use_skill(skill):
        return false

    # Deduct costs
    current_hp -= skill.hp_cost
    # MP system if implemented

    # Set cooldown
    if skill.cooldown > 0:
        skill_cooldowns[skill.id] = skill.cooldown

    # Execute skill
    GameManager.combat_system.execute_skill(self, skill, target)
    return true

func can_use_skill(skill: SkillData) -> bool:
    if skill.id in skill_cooldowns:
        return false
    if current_hp <= skill.hp_cost:
        return false
    return true

func gain_xp(amount: int):
    xp += amount
    xp_gained.emit(amount)
    _check_level_up()

func _check_level_up():
    var xp_needed = _xp_for_level(level + 1)
    while xp >= xp_needed:
        xp -= xp_needed
        level += 1
        available_skill_points += 1
        _apply_level_up_stats()
        level_up.emit(level)
        xp_needed = _xp_for_level(level + 1)

func _xp_for_level(lvl: int) -> int:
    return int(100 * pow(lvl, 1.5))

func _apply_level_up_stats():
    max_hp += 10
    current_hp = max_hp
    attack += 2
    defense += 1

func equip_item(item: ItemData, slot: String):
    var old_item = equipment[slot]
    equipment[slot] = item
    _recalculate_stats()
    equipment_changed.emit(slot, item)
    return old_item

func _on_died():
    # Handle player death
    GameManager.game_over()
```

### 3.3 Enemy Entity

**scenes/entities/enemy/enemy.gd**
```gdscript
class_name Enemy
extends Entity

@export var monster_data: MonsterData

# AI component
var ai: EnemyAI

# Social system
var commanded_by: Enemy = null
var followers: Array[Enemy] = []

# Combat state
var target: Entity = null
var last_known_target_pos: Vector2i
var has_attack_token: bool = false

signal spotted_player()
signal lost_player()
signal commanded(command: String, target: Entity)

func _ready():
    super._ready()
    _apply_monster_data()
    ai = EnemyAI.new(self)
    add_child(ai)
    died.connect(_on_died)

func _apply_monster_data():
    if monster_data:
        max_hp = monster_data.hp
        current_hp = max_hp
        attack = monster_data.attack
        defense = monster_data.defense
        speed = monster_data.speed

func take_turn():
    ai.update()
    process_status_effects()

func on_damaged(attacker: Entity):
    # Immediate reaction to being attacked
    if ai:
        ai.on_damaged(attacker)

func _on_died():
    # Drop loot
    if monster_data and monster_data.loot_table:
        var loot = GameManager.loot_system.roll_loot(monster_data.loot_table)
        for item in loot:
            GameManager.spawn_item(item, grid_pos)

    # Grant XP
    if monster_data:
        GameManager.player.gain_xp(monster_data.xp_value)

    EventBus.enemy_died.emit(self)
    queue_free()
```

---

## Phase 4: Enemy AI System (Week 4-5)

### 4.1 AI State Machine

**scripts/systems/enemy_ai.gd**
```gdscript
class_name EnemyAI
extends Node

var enemy: Enemy
var current_state: Constants.AIState = Constants.AIState.IDLE
var state_timer: float = 0

# Behavior config from monster data
var vision_range: int = 8
var behavior_type: String = "pack"
var flee_threshold: float = 0.3
var aggression: float = 0.5

# Pathfinding
var current_path: Array[Vector2i] = []
var path_index: int = 0

# Wander state
var wander_target: Vector2i
var wander_wait_time: float = 0

# Combat
var attack_cooldown: float = 0
var circle_direction: int = 1  # 1 or -1

signal state_changed(old_state: Constants.AIState, new_state: Constants.AIState)

func _init(e: Enemy):
    enemy = e
    if enemy.monster_data:
        vision_range = enemy.monster_data.vision_range
        behavior_type = enemy.monster_data.behavior_type
        flee_threshold = enemy.monster_data.flee_threshold
        aggression = enemy.monster_data.aggression

func update():
    state_timer += 1
    attack_cooldown = maxf(0, attack_cooldown - 1)

    match current_state:
        Constants.AIState.IDLE:
            _update_idle()
        Constants.AIState.WANDERING:
            _update_wandering()
        Constants.AIState.CHASING:
            _update_chasing()
        Constants.AIState.COMBAT:
            _update_combat()
        Constants.AIState.CIRCLING:
            _update_circling()
        Constants.AIState.SEARCHING:
            _update_searching()
        Constants.AIState.PANICKED:
            _update_panicked()
        Constants.AIState.COMMANDED:
            _update_commanded()
        # ... other states

func _change_state(new_state: Constants.AIState):
    var old_state = current_state
    current_state = new_state
    state_timer = 0
    state_changed.emit(old_state, new_state)

func _update_idle():
    # Check for player in vision
    if _can_see_player():
        enemy.target = GameManager.player
        enemy.spotted_player.emit()
        _change_state(Constants.AIState.CHASING)
        return

    # Random chance to start wandering
    if randf() < 0.1:
        _start_wandering()

func _update_chasing():
    if not enemy.target or not is_instance_valid(enemy.target):
        _change_state(Constants.AIState.SEARCHING)
        return

    # Update last known position
    if _can_see_player():
        enemy.last_known_target_pos = enemy.target.grid_pos

    var dist = _distance_to(enemy.target.grid_pos)

    # In attack range
    if dist <= 1:
        _change_state(Constants.AIState.COMBAT)
        return

    # Move towards target
    _move_towards(enemy.last_known_target_pos)

func _update_combat():
    if not enemy.target or not is_instance_valid(enemy.target):
        _change_state(Constants.AIState.IDLE)
        return

    var dist = _distance_to(enemy.target.grid_pos)

    # Target moved away
    if dist > 1:
        _change_state(Constants.AIState.CHASING)
        return

    # Check flee threshold
    if _should_flee():
        _change_state(Constants.AIState.PANICKED)
        return

    # Attack if we have token and cooldown ready
    if enemy.has_attack_token and attack_cooldown <= 0:
        _perform_attack()
    elif not enemy.has_attack_token:
        # Circle while waiting for token
        _change_state(Constants.AIState.CIRCLING)

func _update_circling():
    if not enemy.target or not is_instance_valid(enemy.target):
        _change_state(Constants.AIState.IDLE)
        return

    # Got attack token
    if enemy.has_attack_token:
        _change_state(Constants.AIState.COMBAT)
        return

    # Move in circle around target
    var offset = _get_circle_position()
    _move_towards(enemy.target.grid_pos + offset)

    # Randomly change direction
    if randf() < 0.1:
        circle_direction *= -1

func _can_see_player() -> bool:
    var player = GameManager.player
    if not player:
        return false

    var dist = _distance_to(player.grid_pos)
    if dist > vision_range:
        return false

    # Line of sight check
    return GameManager.dungeon.has_line_of_sight(enemy.grid_pos, player.grid_pos)

func _move_towards(target: Vector2i):
    if current_path.is_empty() or path_index >= current_path.size():
        current_path = GameManager.dungeon.find_path(enemy.grid_pos, target)
        path_index = 0

    if path_index < current_path.size():
        var next_pos = current_path[path_index]
        if _can_move_to(next_pos):
            enemy.grid_pos = next_pos
            path_index += 1

func _can_move_to(pos: Vector2i) -> bool:
    if not GameManager.dungeon.is_walkable(pos):
        return false
    # Check for other entities
    if _get_entity_at(pos):
        return false
    return true

func _perform_attack():
    var damage = GameManager.combat_system.calculate_attack(enemy, enemy.target)
    enemy.target.take_damage(damage, enemy, Constants.DamageType.PHYSICAL)
    attack_cooldown = 1.0 / (enemy.speed / 100.0)

func _should_flee() -> bool:
    return float(enemy.current_hp) / enemy.max_hp < flee_threshold

func on_damaged(attacker: Entity):
    # Immediate response to damage regardless of vision
    if current_state in [Constants.AIState.COMBAT, Constants.AIState.CHASING]:
        if not enemy.target and attacker:
            enemy.target = attacker
        return

    if attacker:
        enemy.target = attacker
        enemy.last_known_target_pos = attacker.grid_pos
        _change_state(Constants.AIState.CHASING)

func _distance_to(pos: Vector2i) -> float:
    return enemy.grid_pos.distance_to(pos)

func _get_circle_position() -> Vector2i:
    var angle = state_timer * 0.5 * circle_direction
    return Vector2i(
        int(cos(angle) * 2),
        int(sin(angle) * 2)
    )
```

### 4.2 Attack Token System

**scripts/systems/attack_token_system.gd**
```gdscript
class_name AttackTokenSystem
extends Node

const MAX_SIMULTANEOUS_ATTACKERS := 3

var active_tokens: Array[Enemy] = []
var token_queue: Array[Enemy] = []

func _ready():
    EventBus.enemy_died.connect(_on_enemy_died)
    EventBus.turn_ended.connect(_process_queue)

func request_token(enemy: Enemy) -> bool:
    if enemy in active_tokens:
        return true

    if active_tokens.size() < MAX_SIMULTANEOUS_ATTACKERS:
        _grant_token(enemy)
        return true

    if enemy not in token_queue:
        token_queue.append(enemy)

    return false

func release_token(enemy: Enemy):
    if enemy in active_tokens:
        active_tokens.erase(enemy)
        enemy.has_attack_token = false
        _process_queue()

func _grant_token(enemy: Enemy):
    active_tokens.append(enemy)
    enemy.has_attack_token = true

func _process_queue():
    while active_tokens.size() < MAX_SIMULTANEOUS_ATTACKERS and not token_queue.is_empty():
        var next = token_queue.pop_front()
        if is_instance_valid(next) and next.current_hp > 0:
            _grant_token(next)

func _on_enemy_died(enemy: Enemy):
    release_token(enemy)
    token_queue.erase(enemy)
```

---

## Phase 5: Dungeon Generation (Week 5-6)

### 5.1 Dungeon Generator

**scripts/systems/dungeon_generator.gd**
```gdscript
class_name DungeonGenerator
extends RefCounted

const MIN_ROOM_SIZE := 5
const MAX_ROOM_SIZE := 15

var width: int
var height: int
var tiles: Array[Array]  # 2D array of TileType
var rooms: Array[Rect2i] = []

enum TileType { WALL, FLOOR, DOOR, STAIRS_DOWN, STAIRS_UP }

func generate(w: int, h: int, floor_num: int) -> Dictionary:
    width = w
    height = h
    _init_tiles()

    # Generate rooms
    var num_rooms = randi_range(8, 15) + floor_num
    for i in num_rooms:
        _try_place_room()

    # Connect rooms with corridors
    _connect_rooms()

    # Place stairs
    var stairs_down = _place_stairs_down()
    var stairs_up = _place_stairs_up()

    # Generate spawn points
    var enemy_spawns = _generate_enemy_spawns(floor_num)
    var item_spawns = _generate_item_spawns(floor_num)

    return {
        "tiles": tiles,
        "rooms": rooms,
        "stairs_down": stairs_down,
        "stairs_up": stairs_up,
        "enemy_spawns": enemy_spawns,
        "item_spawns": item_spawns,
        "player_spawn": _get_player_spawn()
    }

func _init_tiles():
    tiles = []
    for x in width:
        var column: Array = []
        for y in height:
            column.append(TileType.WALL)
        tiles.append(column)

func _try_place_room():
    var room_width = randi_range(MIN_ROOM_SIZE, MAX_ROOM_SIZE)
    var room_height = randi_range(MIN_ROOM_SIZE, MAX_ROOM_SIZE)
    var x = randi_range(1, width - room_width - 1)
    var y = randi_range(1, height - room_height - 1)

    var new_room = Rect2i(x, y, room_width, room_height)

    # Check overlap
    for room in rooms:
        if room.intersects(new_room.grow(1)):
            return

    # Carve room
    for rx in range(x, x + room_width):
        for ry in range(y, y + room_height):
            tiles[rx][ry] = TileType.FLOOR

    rooms.append(new_room)

func _connect_rooms():
    for i in range(1, rooms.size()):
        var prev_center = rooms[i-1].get_center()
        var curr_center = rooms[i].get_center()

        # Randomly choose horizontal-first or vertical-first
        if randf() < 0.5:
            _carve_h_corridor(prev_center.x, curr_center.x, prev_center.y)
            _carve_v_corridor(prev_center.y, curr_center.y, curr_center.x)
        else:
            _carve_v_corridor(prev_center.y, curr_center.y, prev_center.x)
            _carve_h_corridor(prev_center.x, curr_center.x, curr_center.y)

func _carve_h_corridor(x1: int, x2: int, y: int):
    for x in range(mini(x1, x2), maxi(x1, x2) + 1):
        tiles[x][y] = TileType.FLOOR

func _carve_v_corridor(y1: int, y2: int, x: int):
    for y in range(mini(y1, y2), maxi(y1, y2) + 1):
        tiles[x][y] = TileType.FLOOR

func is_walkable(pos: Vector2i) -> bool:
    if pos.x < 0 or pos.x >= width or pos.y < 0 or pos.y >= height:
        return false
    return tiles[pos.x][pos.y] != TileType.WALL

func has_line_of_sight(from: Vector2i, to: Vector2i) -> bool:
    # Bresenham's line algorithm
    var dx = abs(to.x - from.x)
    var dy = abs(to.y - from.y)
    var sx = 1 if from.x < to.x else -1
    var sy = 1 if from.y < to.y else -1
    var err = dx - dy

    var x = from.x
    var y = from.y

    while true:
        if x == to.x and y == to.y:
            return true
        if tiles[x][y] == TileType.WALL:
            return false

        var e2 = 2 * err
        if e2 > -dy:
            err -= dy
            x += sx
        if e2 < dx:
            err += dx
            y += sy

    return false
```

### 5.2 Dungeon TileMap

**scenes/world/dungeon.gd**
```gdscript
class_name Dungeon
extends Node2D

@onready var tile_map: TileMap = $TileMap
@onready var fog_of_war: TileMap = $FogOfWar

var generator: DungeonGenerator
var current_data: Dictionary
var explored: Array[Array]  # 2D bool array

const FOG_HIDDEN := 0
const FOG_EXPLORED := 1
const FOG_VISIBLE := 2

func _ready():
    generator = DungeonGenerator.new()

func generate_floor(floor_num: int):
    current_data = generator.generate(
        Constants.MAP_WIDTH,
        Constants.MAP_HEIGHT,
        floor_num
    )

    _init_explored()
    _render_tiles()
    _spawn_entities()

    EventBus.floor_entered.emit(floor_num)

func _init_explored():
    explored = []
    for x in Constants.MAP_WIDTH:
        var column: Array = []
        for y in Constants.MAP_HEIGHT:
            column.append(false)
        explored.append(column)

func _render_tiles():
    tile_map.clear()
    for x in current_data.tiles.size():
        for y in current_data.tiles[x].size():
            var tile_type = current_data.tiles[x][y]
            var atlas_coords = _get_tile_atlas(tile_type)
            tile_map.set_cell(0, Vector2i(x, y), 0, atlas_coords)

func _get_tile_atlas(tile_type: int) -> Vector2i:
    match tile_type:
        DungeonGenerator.TileType.WALL:
            return Vector2i(0, 0)
        DungeonGenerator.TileType.FLOOR:
            return Vector2i(1, 0)
        DungeonGenerator.TileType.DOOR:
            return Vector2i(2, 0)
        DungeonGenerator.TileType.STAIRS_DOWN:
            return Vector2i(3, 0)
        DungeonGenerator.TileType.STAIRS_UP:
            return Vector2i(4, 0)
    return Vector2i(0, 0)

func update_visibility(center: Vector2i, radius: int):
    # Reset all to explored (not visible)
    for x in Constants.MAP_WIDTH:
        for y in Constants.MAP_HEIGHT:
            if explored[x][y]:
                _set_fog(Vector2i(x, y), FOG_EXPLORED)

    # Calculate visible tiles using shadowcasting
    var visible_tiles = _calculate_fov(center, radius)
    for pos in visible_tiles:
        explored[pos.x][pos.y] = true
        _set_fog(pos, FOG_VISIBLE)

func _set_fog(pos: Vector2i, state: int):
    match state:
        FOG_HIDDEN:
            fog_of_war.set_cell(0, pos, 0, Vector2i(0, 0))  # Black
        FOG_EXPLORED:
            fog_of_war.set_cell(0, pos, 0, Vector2i(1, 0))  # Dim
        FOG_VISIBLE:
            fog_of_war.set_cell(0, pos, -1)  # Clear

func is_walkable(pos: Vector2i) -> bool:
    return generator.is_walkable(pos)

func has_line_of_sight(from: Vector2i, to: Vector2i) -> bool:
    return generator.has_line_of_sight(from, to)

func find_path(from: Vector2i, to: Vector2i) -> Array[Vector2i]:
    # A* pathfinding
    var astar = AStar2D.new()
    # ... implement A* or use built-in navigation
    return []
```

---

## Phase 6: Combat System (Week 6-7)

### 6.1 Combat Calculator

**scripts/systems/combat_system.gd**
```gdscript
class_name CombatSystem
extends Node

signal attack_performed(attacker: Entity, defender: Entity, result: Dictionary)
signal skill_executed(caster: Entity, skill: SkillData, targets: Array, result: Dictionary)

func calculate_attack(attacker: Entity, defender: Entity) -> Dictionary:
    var result = {
        "hit": false,
        "crit": false,
        "graze": false,
        "damage": 0,
        "damage_type": Constants.DamageType.PHYSICAL
    }

    # Hit calculation
    var hit_chance = Constants.BASE_HIT_CHANCE
    hit_chance += (attacker.speed - defender.speed) * 0.01

    var roll = randf()
    if roll > hit_chance:
        # Miss
        return result
    elif roll < hit_chance * 0.15:
        # Graze (near-miss that does reduced damage)
        result.graze = true

    result.hit = true

    # Crit calculation
    var crit_chance = 0.05 + attacker.get("crit_chance", 0)
    if randf() < crit_chance:
        result.crit = true

    # Damage calculation
    var base_damage = _get_attack_damage(attacker)
    var damage = base_damage - defender.defense
    damage = maxi(1, damage)

    if result.crit:
        damage = int(damage * Constants.CRIT_MULTIPLIER)
    elif result.graze:
        damage = int(damage * Constants.GRAZE_MULTIPLIER)

    result.damage = damage

    return result

func perform_attack(attacker: Entity, defender: Entity) -> Dictionary:
    var result = calculate_attack(attacker, defender)

    if result.hit:
        defender.take_damage(result.damage, attacker, result.damage_type)

        # Apply on-hit effects
        if attacker is Player:
            var weapon = attacker.equipment.get("weapon")
            if weapon and weapon.on_hit_effects:
                for effect in weapon.on_hit_effects:
                    _apply_effect(effect, defender, attacker)

    attack_performed.emit(attacker, defender, result)
    return result

func execute_skill(caster: Entity, skill: SkillData, target) -> Dictionary:
    var targets = _resolve_targets(caster, skill, target)
    var results = []

    for t in targets:
        var result = {
            "target": t,
            "damage": 0,
            "effects_applied": []
        }

        if skill.damage_multiplier > 0:
            var base = _get_attack_damage(caster)
            var damage = int(base * skill.damage_multiplier)
            damage = maxi(1, damage - t.defense)
            t.take_damage(damage, caster, skill.damage_type)
            result.damage = damage

        for effect in skill.effects:
            _apply_effect(effect, t, caster)
            result.effects_applied.append(effect)

        results.append(result)

    var combined = {"targets": results, "skill": skill}
    skill_executed.emit(caster, skill, targets, combined)
    return combined

func _get_attack_damage(entity: Entity) -> int:
    var base = entity.attack

    if entity is Player:
        var weapon = entity.equipment.get("weapon")
        if weapon:
            base += randi_range(weapon.damage_min, weapon.damage_max)

    return base

func _resolve_targets(caster: Entity, skill: SkillData, target) -> Array:
    match skill.target_type:
        "self":
            return [caster]
        "single":
            return [target] if target else []
        "aoe":
            return _get_entities_in_radius(target, skill.aoe_radius)
        "line":
            return _get_entities_in_line(caster.grid_pos, target)
        "cone":
            return _get_entities_in_cone(caster.grid_pos, target, skill.aoe_radius)
    return []

func _apply_effect(effect: EffectData, target: Entity, source: Entity):
    var status = StatusEffect.new()
    status.init_from_data(effect, source)
    target.apply_status(status)
```

---

## Phase 7: UI System (Week 7-9)

### 7.1 UI Architecture

Use Godot's Control nodes with a layered approach:

```
UI (CanvasLayer)
├── HUD (Always visible)
│   ├── HealthBar
│   ├── ResourceBars
│   ├── Minimap
│   └── ActionBar
├── Popups (Modal)
│   ├── InventoryScreen
│   ├── CharacterScreen
│   ├── SkillTreeScreen
│   ├── QuestLogScreen
│   └── SettingsScreen
├── Overlays
│   ├── DialogBox
│   ├── LootPopup
│   └── Notifications
└── Menus
    ├── MainMenu
    ├── PauseMenu
    └── GameOverScreen
```

### 7.2 HUD Implementation

**scenes/ui/hud/hud.gd**
```gdscript
extends CanvasLayer

@onready var health_bar: ProgressBar = $HealthBar
@onready var health_label: Label = $HealthBar/Label
@onready var action_bar: HBoxContainer = $ActionBar
@onready var minimap: Control = $Minimap

var skill_buttons: Array[Button] = []

func _ready():
    EventBus.update_hud.connect(_update_all)

    if GameManager.player:
        GameManager.player.hp_changed.connect(_update_health)
        GameManager.player.equipment_changed.connect(_update_action_bar)

    _setup_action_bar()

func _update_all():
    _update_health(GameManager.player.current_hp, GameManager.player.max_hp)
    _update_action_bar("", null)

func _update_health(current: int, maximum: int):
    health_bar.max_value = maximum
    health_bar.value = current
    health_label.text = "%d / %d" % [current, maximum]

func _setup_action_bar():
    for i in 8:
        var btn = preload("res://scenes/ui/hud/skill_button.tscn").instantiate()
        btn.slot_index = i
        btn.pressed.connect(_on_skill_button_pressed.bind(i))
        action_bar.add_child(btn)
        skill_buttons.append(btn)

    _update_action_bar("", null)

func _update_action_bar(_slot: String, _item):
    for i in skill_buttons.size():
        var skill = GameManager.player.active_skills[i] if i < GameManager.player.active_skills.size() else null
        skill_buttons[i].set_skill(skill)

        if skill and skill.id in GameManager.player.skill_cooldowns:
            skill_buttons[i].set_cooldown(GameManager.player.skill_cooldowns[skill.id])

func _on_skill_button_pressed(index: int):
    if index < GameManager.player.active_skills.size():
        var skill = GameManager.player.active_skills[index]
        # Start targeting mode or use immediately
        _start_skill_targeting(skill)
```

### 7.3 Inventory Screen

**scenes/ui/screens/inventory_screen.gd**
```gdscript
extends Control

@onready var grid: GridContainer = $Panel/Grid
@onready var item_info: Control = $Panel/ItemInfo
@onready var equipment_slots: Control = $Panel/EquipmentSlots

var item_slot_scene = preload("res://scenes/ui/components/item_slot.tscn")
var selected_slot: int = -1

func _ready():
    _setup_grid()
    _setup_equipment_slots()

func _setup_grid():
    for i in Player.MAX_INVENTORY:
        var slot = item_slot_scene.instantiate()
        slot.slot_index = i
        slot.clicked.connect(_on_slot_clicked.bind(i))
        slot.right_clicked.connect(_on_slot_right_clicked.bind(i))
        grid.add_child(slot)

    refresh()

func refresh():
    var inventory = GameManager.player.inventory
    for i in grid.get_child_count():
        var slot = grid.get_child(i)
        if i < inventory.size():
            slot.set_item(inventory[i])
        else:
            slot.clear()

    _refresh_equipment()

func _refresh_equipment():
    for slot_name in GameManager.player.equipment:
        var item = GameManager.player.equipment[slot_name]
        var slot_ui = equipment_slots.get_node(slot_name.capitalize())
        if slot_ui:
            slot_ui.set_item(item)

func _on_slot_clicked(index: int):
    if selected_slot == -1:
        selected_slot = index
        _show_item_info(index)
    else:
        # Swap items
        _swap_items(selected_slot, index)
        selected_slot = -1

func _on_slot_right_clicked(index: int):
    var item = GameManager.player.inventory[index]
    if not item:
        return

    # Show context menu
    var menu = PopupMenu.new()
    menu.add_item("Use", 0)
    menu.add_item("Drop", 1)
    if item.type in ["weapon", "armor", "helmet", "boots", "accessory"]:
        menu.add_item("Equip", 2)

    menu.id_pressed.connect(_on_context_action.bind(index))
    add_child(menu)
    menu.popup(Rect2i(get_global_mouse_position(), Vector2i.ZERO))

func _on_context_action(action_id: int, slot_index: int):
    var item = GameManager.player.inventory[slot_index]
    match action_id:
        0:  # Use
            _use_item(slot_index)
        1:  # Drop
            _drop_item(slot_index)
        2:  # Equip
            _equip_item(slot_index)

    refresh()
```

---

## Phase 8: Monster Social System (Week 9-10)

### 8.1 Social System

**scripts/systems/monster_social_system.gd**
```gdscript
class_name MonsterSocialSystem
extends Node

# Command chains: leader_id -> { leader, followers }
var command_chains: Dictionary = {}

# Pack groups: pack_id -> Array[Enemy]
var packs: Dictionary = {}

func _ready():
    EventBus.enemy_died.connect(_on_enemy_died)
    EventBus.turn_ended.connect(_update)

func register_enemy(enemy: Enemy):
    if enemy.monster_data.can_command:
        _try_create_command_chain(enemy)

    if enemy.monster_data.behavior_type == "pack":
        _try_join_pack(enemy)

func _try_create_command_chain(leader: Enemy):
    var chain = {
        "leader": leader,
        "followers": []
    }

    # Find nearby commandable enemies
    for other in GameManager.enemies:
        if other == leader or other.current_hp <= 0:
            continue
        if not other.monster_data.can_be_commanded:
            continue
        if leader.grid_pos.distance_to(other.grid_pos) > 10:
            continue

        chain.followers.append(other)
        other.commanded_by = leader

    if chain.followers.size() > 0:
        command_chains[leader.get_instance_id()] = chain

func issue_command(leader: Enemy, command: String, target: Entity = null):
    var chain = command_chains.get(leader.get_instance_id())
    if not chain:
        return

    for follower in chain.followers:
        if not is_instance_valid(follower) or follower.current_hp <= 0:
            continue

        match command:
            "attack":
                follower.target = target
                follower.ai._change_state(Constants.AIState.CHASING)
            "retreat":
                follower.ai._change_state(Constants.AIState.PANICKED)
            "hold":
                follower.ai._change_state(Constants.AIState.IDLE)

        follower.commanded.emit(command, target)

func get_pack_bonus(enemy: Enemy) -> float:
    for pack in packs.values():
        if enemy in pack:
            var size = pack.filter(func(e): return is_instance_valid(e) and e.current_hp > 0).size()
            return _calculate_pack_bonus(size)
    return 0.0

func _calculate_pack_bonus(pack_size: int) -> float:
    match pack_size:
        2: return 0.05
        3: return 0.10
        4: return 0.15
        5: return 0.20
        _: return min(0.25, pack_size * 0.05) if pack_size > 5 else 0.0

func _update():
    _recruit_bodyguards()
    _update_leader_commands()

func _recruit_bodyguards():
    for leader in GameManager.enemies:
        if not leader.monster_data.can_command:
            continue
        if leader.get_instance_id() in command_chains:
            continue

        _try_create_command_chain(leader)

func _update_leader_commands():
    for chain in command_chains.values():
        var leader = chain.leader
        if not is_instance_valid(leader) or leader.current_hp <= 0:
            continue

        # If leader is in combat with player, command followers to attack
        if leader.ai.current_state == Constants.AIState.COMBAT:
            if leader.target == GameManager.player:
                issue_command(leader, "attack", GameManager.player)

func _on_enemy_died(enemy: Enemy):
    # Remove from command chains
    command_chains.erase(enemy.get_instance_id())

    for chain in command_chains.values():
        chain.followers.erase(enemy)

    # Remove from packs
    for pack in packs.values():
        pack.erase(enemy)
```

---

## Phase 9: Save/Load System (Week 10)

### 9.1 Save Manager

**scripts/systems/save_manager.gd**
```gdscript
class_name SaveManager
extends Node

const SAVE_DIR := "user://saves/"
const CURRENT_VERSION := 1

func _ready():
    DirAccess.make_dir_recursive_absolute(SAVE_DIR)

func save_game(slot: int = 0) -> bool:
    var data = _collect_save_data()
    var path = SAVE_DIR + "save_%d.json" % slot

    var file = FileAccess.open(path, FileAccess.WRITE)
    if not file:
        push_error("Failed to open save file: " + path)
        return false

    file.store_string(JSON.stringify(data, "\t"))
    file.close()
    return true

func load_game(slot: int = 0) -> bool:
    var path = SAVE_DIR + "save_%d.json" % slot

    if not FileAccess.file_exists(path):
        return false

    var file = FileAccess.open(path, FileAccess.READ)
    var data = JSON.parse_string(file.get_as_text())
    file.close()

    if not data:
        return false

    return _restore_save_data(data)

func _collect_save_data() -> Dictionary:
    var player = GameManager.player

    return {
        "version": CURRENT_VERSION,
        "timestamp": Time.get_unix_time_from_system(),
        "player": {
            "grid_pos": {"x": player.grid_pos.x, "y": player.grid_pos.y},
            "current_hp": player.current_hp,
            "max_hp": player.max_hp,
            "level": player.level,
            "xp": player.xp,
            "gold": player.gold,
            "equipment": _serialize_equipment(player.equipment),
            "inventory": _serialize_inventory(player.inventory),
            "learned_skills": player.learned_skills.map(func(s): return s.id),
            "active_skills": player.active_skills.map(func(s): return s.id),
            "skill_cooldowns": player.skill_cooldowns,
            "allocated_skills": player.allocated_skills
        },
        "dungeon": {
            "current_floor": GameManager.current_floor,
            "seed": GameManager.dungeon_seed,
            "explored": _serialize_explored()
        },
        "quests": _serialize_quests(),
        "flags": GameManager.story_flags
    }

func _restore_save_data(data: Dictionary) -> bool:
    if data.version != CURRENT_VERSION:
        return _migrate_save(data)

    # Restore dungeon first
    GameManager.dungeon_seed = data.dungeon.seed
    GameManager.current_floor = data.dungeon.current_floor
    GameManager.dungeon.generate_floor(data.dungeon.current_floor)

    # Restore player
    var player = GameManager.player
    player.grid_pos = Vector2i(data.player.grid_pos.x, data.player.grid_pos.y)
    player.max_hp = data.player.max_hp
    player.current_hp = data.player.current_hp
    player.level = data.player.level
    player.xp = data.player.xp
    player.gold = data.player.gold

    _restore_equipment(player, data.player.equipment)
    _restore_inventory(player, data.player.inventory)
    _restore_skills(player, data.player)

    # Restore explored tiles
    _restore_explored(data.dungeon.explored)

    # Restore quests
    _restore_quests(data.quests)

    # Restore story flags
    GameManager.story_flags = data.flags

    return true
```

---

## Phase 10: Polish & Testing (Week 11-12)

### 10.1 Audio System

**scripts/systems/audio_manager.gd**
```gdscript
extends Node

@onready var music_player: AudioStreamPlayer = $MusicPlayer
@onready var sfx_pool: Node = $SFXPool

var sfx_cache: Dictionary = {}
var current_music: String = ""

func play_music(track_name: String, fade_time: float = 1.0):
    if track_name == current_music:
        return

    var tween = create_tween()
    tween.tween_property(music_player, "volume_db", -40, fade_time)
    tween.tween_callback(func():
        music_player.stream = load("res://assets/audio/music/" + track_name + ".ogg")
        music_player.play()
        current_music = track_name
    )
    tween.tween_property(music_player, "volume_db", 0, fade_time)

func play_sfx(sfx_name: String, volume: float = 0.0, pitch: float = 1.0):
    if not sfx_name in sfx_cache:
        sfx_cache[sfx_name] = load("res://assets/audio/sfx/" + sfx_name + ".wav")

    # Find available player in pool
    for player in sfx_pool.get_children():
        if not player.playing:
            player.stream = sfx_cache[sfx_name]
            player.volume_db = volume
            player.pitch_scale = pitch
            player.play()
            return

    # All players busy, create temporary one
    var temp = AudioStreamPlayer.new()
    temp.stream = sfx_cache[sfx_name]
    temp.volume_db = volume
    temp.pitch_scale = pitch
    temp.finished.connect(temp.queue_free)
    add_child(temp)
    temp.play()
```

### 10.2 Visual Effects

**scenes/effects/damage_number.gd**
```gdscript
extends Node2D

@onready var label: Label = $Label

func show_damage(amount: int, is_crit: bool = false, is_heal: bool = false):
    label.text = str(amount)

    if is_heal:
        label.add_theme_color_override("font_color", Color.GREEN)
    elif is_crit:
        label.add_theme_color_override("font_color", Color.YELLOW)
        label.scale = Vector2(1.5, 1.5)
    else:
        label.add_theme_color_override("font_color", Color.WHITE)

    var tween = create_tween()
    tween.set_parallel(true)
    tween.tween_property(self, "position:y", position.y - 50, 0.8)
    tween.tween_property(self, "modulate:a", 0.0, 0.8)
    tween.chain().tween_callback(queue_free)
```

---

## Asset Migration Checklist

### Sprites (429 files)
- [ ] Convert all PNG sprites to Godot-compatible format
- [ ] Create sprite atlases for frequently used sprites
- [ ] Set up animation players for animated sprites
- [ ] Configure import settings for pixel art (nearest neighbor filtering)

### Audio
- [ ] Convert audio files to OGG (music) and WAV (SFX)
- [ ] Set up audio buses for music, SFX, and ambient
- [ ] Implement spatial audio for positional sounds

### Fonts
- [ ] Import bitmap fonts for pixel art aesthetic
- [ ] Create font resources with proper settings

---

## Testing Strategy

### Unit Tests
```gdscript
# tests/test_combat.gd
extends GutTest

func test_damage_calculation():
    var attacker = Entity.new()
    attacker.attack = 10

    var defender = Entity.new()
    defender.defense = 3

    var result = CombatSystem.calculate_attack(attacker, defender)
    assert_gte(result.damage, 1, "Damage should be at least 1")
```

### Integration Tests
- Test complete dungeon generation
- Test save/load cycle
- Test combat flow from start to finish
- Test AI state machine transitions

### Performance Benchmarks
- Target 60 FPS with 50+ enemies on screen
- Pathfinding should complete in < 1ms per enemy
- Save/load should complete in < 500ms

---

## Migration Order Summary

1. **Week 1-2**: Project setup, autoloads, constants
2. **Week 2-3**: Data resources, conversion scripts
3. **Week 3-4**: Entity system (Player, Enemy base classes)
4. **Week 4-5**: Enemy AI state machine
5. **Week 5-6**: Dungeon generation, pathfinding
6. **Week 6-7**: Combat system, damage calculation
7. **Week 7-9**: UI screens (30 screens to migrate)
8. **Week 9-10**: Monster social system, quest system
9. **Week 10**: Save/load, settings persistence
10. **Week 11-12**: Polish, audio, effects, testing

---

## Key Architectural Differences

| JavaScript | Godot |
|------------|-------|
| `window.game` global | `GameManager` autoload |
| Event emitters | Signals |
| Plain objects | Custom Resources |
| requestAnimationFrame | `_process(delta)` |
| HTML/CSS UI | Control nodes |
| 2D canvas | TileMap + Sprite2D |
| setInterval/setTimeout | Timer nodes, `await` |
| Prototype inheritance | GDScript class inheritance |

---

## Common Gotchas

1. **Grid vs Pixel coordinates**: Always track both `grid_pos` and actual `position`
2. **Turn-based timing**: Use signals and state machines, not timers
3. **Resource loading**: Preload frequently used resources
4. **Memory management**: Use `queue_free()` not just remove from array
5. **Node references**: Use `@onready` or null checks, nodes may not exist yet
