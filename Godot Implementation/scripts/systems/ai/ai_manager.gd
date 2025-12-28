class_name AIManager
extends Node

## Manages all enemy AI instances and coordinates group behaviors

# All registered enemy AIs
var registered_enemies: Array[Enemy] = []

# Turn management
var current_enemy_index: int = 0
var is_processing_turns: bool = false

# Pathfinding cache
var pathfinding_cache: Dictionary = {}
var cache_lifetime: float = 1.0
var cache_timer: float = 0.0

signal all_enemies_acted()
signal enemy_turn_started(enemy: Enemy)
signal enemy_turn_ended(enemy: Enemy)

func _ready():
	EventBus.turn_ended.connect(_on_player_turn_ended)
	EventBus.floor_entered.connect(_on_floor_changed)

func _process(delta: float):
	# Update cache timer
	cache_timer += delta
	if cache_timer >= cache_lifetime:
		cache_timer = 0.0
		pathfinding_cache.clear()

## Register an enemy with the AI manager
func register_enemy(enemy: Enemy):
	if enemy not in registered_enemies:
		registered_enemies.append(enemy)
		enemy.died.connect(_on_enemy_died.bind(enemy))

## Unregister an enemy
func unregister_enemy(enemy: Enemy):
	registered_enemies.erase(enemy)

## Process all enemy turns (called after player acts)
func process_enemy_turns():
	if is_processing_turns:
		return

	is_processing_turns = true
	current_enemy_index = 0

	# Sort enemies by speed (faster enemies act first)
	registered_enemies.sort_custom(func(a, b): return a.speed > b.speed)

	_process_next_enemy()

func _process_next_enemy():
	while current_enemy_index < registered_enemies.size():
		var enemy := registered_enemies[current_enemy_index]
		current_enemy_index += 1

		if not is_instance_valid(enemy) or enemy.current_hp <= 0:
			continue

		enemy_turn_started.emit(enemy)

		# Update AI
		if enemy.ai:
			enemy.ai.update(GameManager.turn_delta)

		enemy_turn_ended.emit(enemy)

	# All enemies have acted
	is_processing_turns = false
	all_enemies_acted.emit()

## Get a cached path or calculate a new one
func get_path(from: Vector2i, to: Vector2i) -> Array[Vector2i]:
	var cache_key := "%d,%d->%d,%d" % [from.x, from.y, to.x, to.y]

	if pathfinding_cache.has(cache_key):
		return pathfinding_cache[cache_key]

	var path := GameManager.dungeon.find_path(from, to)
	pathfinding_cache[cache_key] = path

	return path

## Find enemies within a radius
func get_enemies_in_radius(center: Vector2i, radius: float) -> Array[Enemy]:
	var result: Array[Enemy] = []

	for enemy in registered_enemies:
		if not is_instance_valid(enemy) or enemy.current_hp <= 0:
			continue

		if enemy.grid_pos.distance_to(Vector2(center)) <= radius:
			result.append(enemy)

	return result

## Find the nearest enemy to a position
func get_nearest_enemy(pos: Vector2i, exclude: Enemy = null) -> Enemy:
	var nearest: Enemy = null
	var nearest_dist := INF

	for enemy in registered_enemies:
		if not is_instance_valid(enemy) or enemy.current_hp <= 0:
			continue
		if enemy == exclude:
			continue

		var dist := enemy.grid_pos.distance_to(Vector2(pos))
		if dist < nearest_dist:
			nearest_dist = dist
			nearest = enemy

	return nearest

## Find enemies by tier
func get_enemies_by_tier(tier: Constants.MonsterTier) -> Array[Enemy]:
	var result: Array[Enemy] = []

	for enemy in registered_enemies:
		if not is_instance_valid(enemy) or enemy.current_hp <= 0:
			continue

		if enemy.monster_data and enemy.monster_data.tier == tier:
			result.append(enemy)

	return result

## Get all enemies currently targeting the player
func get_enemies_targeting_player() -> Array[Enemy]:
	var result: Array[Enemy] = []

	for enemy in registered_enemies:
		if not is_instance_valid(enemy) or enemy.current_hp <= 0:
			continue

		if enemy.ai and enemy.ai.target == GameManager.player:
			result.append(enemy)

	return result

## Get count of enemies in combat states
func get_combat_enemy_count() -> int:
	var count := 0

	for enemy in registered_enemies:
		if not is_instance_valid(enemy) or enemy.current_hp <= 0:
			continue

		if enemy.ai and enemy.ai.current_state in [
			Constants.AIState.COMBAT,
			Constants.AIState.CHASING,
			Constants.AIState.CIRCLING,
			Constants.AIState.SKIRMISHING
		]:
			count += 1

	return count

## Alert all enemies in a room to a position
func alert_room(room, alert_pos: Vector2i, alerter: Enemy = null):
	for enemy in registered_enemies:
		if not is_instance_valid(enemy) or enemy.current_hp <= 0:
			continue
		if enemy == alerter:
			continue

		# Check if enemy is in the same room
		if _is_in_room(enemy.grid_pos, room):
			if enemy.ai and enemy.ai.current_state in [
				Constants.AIState.IDLE,
				Constants.AIState.WANDERING
			]:
				enemy.ai.last_known_target_pos = alert_pos
				enemy.ai._change_state(Constants.AIState.SEARCHING)

func _is_in_room(pos: Vector2i, room) -> bool:
	if not room:
		return false

	return (pos.x >= room.position.x and pos.x < room.position.x + room.size.x and
			pos.y >= room.position.y and pos.y < room.position.y + room.size.y)

func _on_player_turn_ended():
	process_enemy_turns()

func _on_floor_changed(_floor_num: int):
	# Clear all registrations when changing floors
	registered_enemies.clear()
	pathfinding_cache.clear()

func _on_enemy_died(enemy: Enemy):
	unregister_enemy(enemy)
