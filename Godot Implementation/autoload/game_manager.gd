extends Node

## Central game manager - holds references to all major game objects and systems

# === GAME STATE ===
var current_state: Constants.GameState = Constants.GameState.MAIN_MENU
var is_player_turn: bool = true
var turn_count: int = 0
var turn_delta: float = 0.1  # Time per turn for AI calculations
var _is_processing_turn: bool = false  # Guard against re-entrant end_player_turn calls

# === CURRENT FLOOR ===
var current_floor: int = 1
var dungeon_seed: int = 0
var max_floor_reached: int = 1

# === ENTITY REFERENCES ===
var player: Player
var enemies: Array[Enemy] = []
var npcs: Array = []  # Array of NPC nodes
var loot_piles: Array = []  # Array of LootPile

# === WORLD REFERENCES ===
var dungeon: Node  # Dungeon scene
var village: Node  # Village hub scene
var current_room: Dictionary = {}
var world_state: int = 1  # 1=NORMAL, 2=ASH, 3=BURNING, 4=ENDGAME

# === SYSTEM REFERENCES ===
var combat_system: CombatSystem
var ai_manager: AIManager
var loot_system: LootSystem
var social_system: MonsterSocialSystem
var status_system: StatusEffectSystem

# === STORY/PROGRESS ===
var story_flags: Dictionary = {}
var statistics: Dictionary = {
	"enemies_killed": 0,
	"damage_dealt": 0,
	"damage_taken": 0,
	"items_collected": 0,
	"gold_collected": 0,
	"deaths": 0,
	"floors_cleared": 0
}

# === SETTINGS ===
var settings: Dictionary = {
	"music_volume": 0.8,
	"sfx_volume": 1.0,
	"screen_shake": true,
	"show_damage_numbers": true,
	"auto_pickup_gold": true
}

func _ready():
	_initialize_systems()
	process_mode = Node.PROCESS_MODE_ALWAYS

func _initialize_systems():
	# Create combat system
	combat_system = CombatSystem.new()
	combat_system.name = "CombatSystem"
	add_child(combat_system)

	# Create AI manager
	ai_manager = AIManager.new()
	ai_manager.name = "AIManager"
	add_child(ai_manager)

	# Create loot system
	loot_system = LootSystem.new()
	loot_system.name = "LootSystem"
	add_child(loot_system)

	# Create social system
	social_system = MonsterSocialSystem.new()
	social_system.name = "MonsterSocialSystem"
	add_child(social_system)

	# Create status effect system
	status_system = StatusEffectSystem.new()
	status_system.name = "StatusEffectSystem"
	add_child(status_system)

## Start a new game
func new_game(seed_value: int = 0):
	if seed_value == 0:
		seed_value = randi()

	dungeon_seed = seed_value
	seed(dungeon_seed)

	current_floor = 1
	max_floor_reached = 1
	turn_count = 0
	story_flags.clear()
	_reset_statistics()

	change_state(Constants.GameState.PLAYING)
	EventBus.game_started.emit()

	# Generate first floor
	_generate_floor(1)

## Change game state
func change_state(new_state: Constants.GameState):
	var old_state := current_state
	current_state = new_state

	match new_state:
		Constants.GameState.PAUSED:
			get_tree().paused = true
			EventBus.game_paused.emit()

		Constants.GameState.PLAYING:
			get_tree().paused = false
			if old_state == Constants.GameState.PAUSED:
				EventBus.game_resumed.emit()

		Constants.GameState.GAME_OVER:
			statistics.deaths += 1
			EventBus.game_over.emit()

## Go to next floor
func descend_floor():
	current_floor += 1
	max_floor_reached = maxi(max_floor_reached, current_floor)
	statistics.floors_cleared += 1

	_clear_floor()
	_generate_floor(current_floor)

	EventBus.floor_entered.emit(current_floor)

## Go to previous floor
func ascend_floor():
	if current_floor > 1:
		current_floor -= 1
		_clear_floor()
		_generate_floor(current_floor)
		EventBus.floor_entered.emit(current_floor)

## End player turn and process enemies
func end_player_turn():
	# Don't process dungeon turns during arena combat
	if current_state == Constants.GameState.COMBAT:
		return

	# Skip turn processing during exploration - enemies only act in arena combat
	# Just increment the turn counter for time-based effects
	turn_count += 1
	EventBus.player_turn_ended.emit()
	EventBus.turn_ended.emit()
	EventBus.player_turn_started.emit()
	EventBus.turn_started.emit()

## Handle game over
func game_over():
	change_state(Constants.GameState.GAME_OVER)

## Spawn an enemy
func spawn_enemy(monster_data: MonsterData, position: Vector2i) -> Enemy:
	var enemy_scene := preload("res://scenes/entities/enemy/enemy.tscn")
	var enemy: Enemy = enemy_scene.instantiate()

	enemy.monster_data = monster_data
	enemy.grid_pos = position

	enemies.append(enemy)

	# Add to entities container if available, otherwise directly to dungeon
	if dungeon.has_node("Entities"):
		dungeon.get_node("Entities").add_child(enemy)
	else:
		dungeon.add_child(enemy)

	print("DEBUG: Spawned enemy '%s' at grid pos %s, world pos %s" % [
		monster_data.name if monster_data else "unknown",
		position,
		enemy.position
	])

	ai_manager.register_enemy(enemy)
	social_system.register_enemy(enemy)

	EventBus.enemy_spawned.emit(enemy)
	return enemy

## Spawn an item on the ground
func spawn_item(item: ItemData, position: Vector2i):
	loot_system.spawn_loot_pile([item], position)

## Get entity at grid position
func get_entity_at(pos: Vector2i) -> Node:
	if player and player.grid_pos == pos:
		return player

	for enemy in enemies:
		if is_instance_valid(enemy) and enemy.grid_pos == pos:
			return enemy

	for npc in npcs:
		if is_instance_valid(npc) and npc.grid_pos == pos:
			return npc

	return null

## Get loot pile at position
func get_loot_at(pos: Vector2i):
	for pile in loot_piles:
		if pile.grid_pos == pos:
			return pile
	return null

## Check if position is walkable
func is_walkable(pos: Vector2i) -> bool:
	if not dungeon:
		return false

	if not dungeon.is_walkable(pos):
		return false

	if get_entity_at(pos):
		return false

	return true

## Get current scene (for adding effects, etc.)
func get_current_scene() -> Node:
	return get_tree().current_scene

## Set a story flag
func set_flag(flag_name: String, value: Variant = true):
	story_flags[flag_name] = value

## Check a story flag
func get_flag(flag_name: String, default: Variant = false) -> Variant:
	return story_flags.get(flag_name, default)

## Add to a statistic
func add_stat(stat_name: String, amount: int = 1):
	if statistics.has(stat_name):
		statistics[stat_name] += amount

func _generate_floor(floor_num: int):
	# Clear existing enemies
	enemies.clear()
	loot_piles.clear()

	# Dungeon will handle generation
	if dungeon and dungeon.has_method("generate_floor"):
		dungeon.generate_floor(floor_num)

func _clear_floor():
	# Clean up existing entities
	for enemy in enemies:
		if is_instance_valid(enemy):
			enemy.queue_free()
	enemies.clear()

	for pile in loot_piles:
		if pile is Node and is_instance_valid(pile):
			pile.queue_free()
	loot_piles.clear()

func _reset_statistics():
	for key in statistics:
		statistics[key] = 0
