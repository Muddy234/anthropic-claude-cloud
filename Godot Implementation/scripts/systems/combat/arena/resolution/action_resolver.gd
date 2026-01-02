class_name ActionResolver
extends RefCounted

## Resolves queued actions from all combatants by priority order

signal resolution_started()
signal action_resolving(action: CombatAction)
signal action_resolved(action: CombatAction, result: Dictionary)
signal resolution_completed()
signal collision_detected(combatant_a: Node, combatant_b: Node, position: Vector2i)

var grid: ArenaGrid
var collision_handler: CollisionHandler

# Mapping from entity nodes to their ArenaCombatant wrappers
# This allows damage to be routed through the wrapper so is_alive gets updated
var _combatant_map: Dictionary = {}

# Tracks the current action index being resolved for UI highlighting
var _current_action_index: int = 0

func _init(p_grid: ArenaGrid) -> void:
	grid = p_grid
	collision_handler = CollisionHandler.new(grid)

## Resolve all actions from player and single enemy (backwards compatible)
## Returns array of resolution results in execution order
func resolve_all(player: ArenaCombatant, enemy: ArenaCombatant) -> Array[Dictionary]:
	return resolve_all_multi(player, [enemy])

## Resolve all actions from player and multiple enemies
## Returns array of resolution results in execution order
func resolve_all_multi(player: ArenaCombatant, enemies: Array[ArenaCombatant]) -> Array[Dictionary]:
	resolution_started.emit()

	# Reset action index counter
	_current_action_index = 0

	# Build mapping from entity nodes to ArenaCombatant wrappers
	# This allows damage to be applied through the wrapper so is_alive gets updated
	_combatant_map.clear()
	_combatant_map[player.entity] = player
	for enemy in enemies:
		if enemy and enemy.entity and is_instance_valid(enemy.entity):
			_combatant_map[enemy.entity] = enemy

	var results: Array[Dictionary] = []

	# Collect all actions from player and all enemies
	var all_actions: Array[Dictionary] = []

	var player_actions := player.get_queued_actions()
	for action in player_actions:
		all_actions.append({
			"action": action,
			"combatant": player,
			"priority": action.priority,
			"speed": _get_combatant_speed(player)
		})

	# Collect actions from all living enemies
	for enemy in enemies:
		if not enemy or not enemy.is_alive:
			continue
		var enemy_actions := enemy.get_queued_actions()
		for action in enemy_actions:
			all_actions.append({
				"action": action,
				"combatant": enemy,
				"priority": action.priority,
				"speed": _get_combatant_speed(enemy)
			})

	# Sort by priority (lower = faster), then by speed (higher = faster)
	all_actions.sort_custom(_compare_actions)

	# Group by priority level for simultaneous resolution
	var priority_groups: Dictionary = {}
	for entry in all_actions:
		var p: int = entry.priority
		if p not in priority_groups:
			priority_groups[p] = []
		priority_groups[p].append(entry)

	# Get sorted priority levels
	var priorities := priority_groups.keys()
	priorities.sort()

	# Track if collision occurred (cancels remaining movement)
	var collision_occurred := false

	# Resolve each priority group
	for priority in priorities:
		var group: Array = priority_groups[priority]
		var group_results := _resolve_priority_group(group, collision_occurred)
		results.append_array(group_results)

		# Check for collision in movement actions
		for result in group_results:
			if result.get("collision", false):
				collision_occurred = true

	resolution_completed.emit()
	return results

## Resolve a group of actions at the same priority level
func _resolve_priority_group(group: Array, skip_moves: bool) -> Array[Dictionary]:
	var results: Array[Dictionary] = []

	# Separate moves from other actions
	var moves: Array = []
	var other_actions: Array = []

	for entry in group:
		var action: CombatAction = entry.action
		if action.action_type == Constants.CombatActionType.MOVE:
			moves.append(entry)
		else:
			other_actions.append(entry)

	# Resolve movements simultaneously (check for collisions)
	if not skip_moves and moves.size() > 0:
		var move_results := _resolve_simultaneous_moves(moves)
		results.append_array(move_results)

	# Resolve attacks and other actions
	for entry in other_actions:
		var action: CombatAction = entry.action

		# Skip if combatant died during resolution (e.g., killed by earlier attack)
		if not entry.combatant.is_alive:
			# Emit cancelled action for UI feedback
			var cancelled_result := {
				"success": false,
				"action_type": action.action_type,
				"cancelled": true,
				"reason": "combatant_dead",
				"combatant": entry.combatant.entity,
				"message": "Attack cancelled - combatant defeated"
			}
			action_resolved.emit(action, cancelled_result)
			results.append(cancelled_result)
			_current_action_index += 1
			continue

		action_resolving.emit(action)
		EventBus.arena_action_resolving.emit(_current_action_index, action.to_dict())

		var result := action.execute(grid, self)
		result["combatant"] = entry.combatant.entity

		action_resolved.emit(action, result)
		results.append(result)
		_current_action_index += 1

	return results

## Resolve movement actions simultaneously, detecting collisions
func _resolve_simultaneous_moves(moves: Array) -> Array[Dictionary]:
	var results: Array[Dictionary] = []

	if moves.size() == 0:
		return results

	if moves.size() == 1:
		# Single move - just execute it
		var entry: Dictionary = moves[0]
		var action: CombatAction = entry.action

		# Skip if combatant died
		if not entry.combatant.is_alive:
			var cancelled_result := {
				"success": false,
				"action_type": Constants.CombatActionType.MOVE,
				"cancelled": true,
				"reason": "combatant_dead",
				"combatant": entry.combatant.entity,
				"message": "Movement cancelled - combatant defeated"
			}
			action_resolved.emit(action, cancelled_result)
			results.append(cancelled_result)
			_current_action_index += 1
			return results

		action_resolving.emit(action)
		EventBus.arena_action_resolving.emit(_current_action_index, action.to_dict())

		var result := action.execute(grid, self)
		result["combatant"] = entry.combatant.entity

		action_resolved.emit(action, result)
		results.append(result)
		_current_action_index += 1
		return results

	# Multiple moves - check for collision
	var move_targets: Array[Dictionary] = []

	for entry in moves:
		var action: CombatAction = entry.action
		# Skip if combatant entity is no longer valid or combatant is dead
		if not entry.combatant.entity or not is_instance_valid(entry.combatant.entity):
			continue
		if not entry.combatant.is_alive:
			var cancelled_result := {
				"success": false,
				"action_type": Constants.CombatActionType.MOVE,
				"cancelled": true,
				"reason": "combatant_dead",
				"combatant": entry.combatant.entity,
				"message": "Movement cancelled - combatant defeated"
			}
			action_resolved.emit(action, cancelled_result)
			results.append(cancelled_result)
			_current_action_index += 1
			continue
		move_targets.append({
			"combatant": entry.combatant,
			"action": action,
			"from": grid.get_combatant_position(entry.combatant.entity),
			"to": action.target_position
		})

	# Check if both are moving to the same tile
	var collision_result := collision_handler.check_collision(move_targets)

	if collision_result.collision:
		# Collision detected - both stop at collision point
		collision_detected.emit(
			move_targets[0].combatant.entity,
			move_targets[1].combatant.entity,
			collision_result.collision_position
		)

		for i in range(move_targets.size()):
			var target := move_targets[i]
			var action: CombatAction = target.action
			action_resolving.emit(action)
			EventBus.arena_action_resolving.emit(_current_action_index, action.to_dict())

			# Move to collision position instead of target
			var final_pos: Vector2i = collision_result.final_positions[i]
			if final_pos != target.from:
				grid.move_combatant(target.combatant.entity, final_pos)

			var result := {
				"success": true,
				"action_type": Constants.CombatActionType.MOVE,
				"from": target.from,
				"to": final_pos,
				"intended_to": target.to,
				"collision": true,
				"combatant": target.combatant.entity,
				"message": "Movement interrupted by collision"
			}

			action_resolved.emit(action, result)
			results.append(result)
			_current_action_index += 1
	else:
		# No collision - execute both moves
		for entry in moves:
			var action: CombatAction = entry.action
			action_resolving.emit(action)
			EventBus.arena_action_resolving.emit(_current_action_index, action.to_dict())

			var result := action.execute(grid, self)
			result["combatant"] = entry.combatant.entity

			action_resolved.emit(action, result)
			results.append(result)
			_current_action_index += 1

	return results

## Get the ArenaCombatant wrapper for an entity node
## This allows actions to apply damage through the wrapper so is_alive gets updated
func get_combatant_for_entity(entity: Node) -> ArenaCombatant:
	if entity in _combatant_map:
		return _combatant_map[entity]
	return null

## Apply damage to an entity through its ArenaCombatant wrapper
## Returns true if damage was applied through wrapper, false if direct fallback was used
func apply_damage_to_entity(target_entity: Node, amount: int, source: Node) -> bool:
	var wrapper := get_combatant_for_entity(target_entity)
	if wrapper:
		wrapper.take_damage(amount, source)
		return true
	else:
		# Fallback: apply directly (shouldn't happen in normal arena combat)
		if target_entity.has_method("take_damage"):
			target_entity.take_damage(amount, source)
		elif "current_hp" in target_entity:
			target_entity.current_hp = maxi(0, target_entity.current_hp - amount)
		return false

## Calculate total resolution time for animation (backwards compatible)
func calculate_resolution_time(player: ArenaCombatant, enemy: ArenaCombatant) -> float:
	return calculate_resolution_time_multi(player, [enemy])

## Calculate total resolution time for animation with multiple enemies
func calculate_resolution_time_multi(player: ArenaCombatant, enemies: Array[ArenaCombatant]) -> float:
	var move_count := 0
	var attack_count := 0

	for action in player.get_queued_actions():
		if action.action_type == Constants.CombatActionType.MOVE:
			move_count += 1
		else:
			attack_count += 1

	for enemy in enemies:
		if not enemy or not enemy.is_alive:
			continue
		for action in enemy.get_queued_actions():
			if action.action_type == Constants.CombatActionType.MOVE:
				move_count += 1
			else:
				attack_count += 1

	return (move_count * Constants.RESOLUTION_MOVE_TIME) + \
		   (attack_count * Constants.RESOLUTION_ATTACK_TIME)

## Compare two actions for sorting: by priority first, then by speed
## Lower priority = faster, higher speed = faster
func _compare_actions(a: Dictionary, b: Dictionary) -> bool:
	# First compare by priority (lower = executes first)
	if a.priority != b.priority:
		return a.priority < b.priority
	# Same priority: compare by speed (higher = executes first)
	return a.speed > b.speed

## Get the speed stat from a combatant
## Returns speed value (higher = faster), defaults to 100 if not found
func _get_combatant_speed(combatant: ArenaCombatant) -> int:
	if not combatant or not combatant.entity:
		return 100  # Default speed

	var entity = combatant.entity

	# Try to get speed from entity's get_stat method
	if entity.has_method("get_stat"):
		var speed = entity.get_stat("speed")
		if speed != null:
			return speed

	# Try to get speed from monster_data
	if "monster_data" in entity and entity.monster_data:
		if "speed" in entity.monster_data:
			return entity.monster_data.speed

	# Try direct speed property
	if "speed" in entity:
		return entity.speed

	return 100  # Default speed
