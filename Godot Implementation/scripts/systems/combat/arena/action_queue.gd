class_name ActionQueue
extends RefCounted

## Manages queued actions for a combatant during the planning phase

signal action_added(action: CombatAction)
signal action_removed(action: CombatAction)
signal queue_cleared()

var actions: Array[CombatAction] = []
var owner: Node  # The combatant this queue belongs to
var resources: CombatResources
var _moves_queued_this_turn: int = 0  # Track moves for cost calculation

func _init(p_owner: Node, p_resources: CombatResources) -> void:
	owner = p_owner
	resources = p_resources

## Add an action to the queue
func queue_action(action: CombatAction) -> bool:
	match action.action_type:
		Constants.CombatActionType.MOVE:
			return _queue_move_action(action)
		Constants.CombatActionType.LIGHT_ATTACK, Constants.CombatActionType.HEAVY_ATTACK:
			return _queue_attack_action(action)
		Constants.CombatActionType.ITEM:
			return _queue_item_action(action)
		_:
			return false

func _queue_move_action(action: CombatAction) -> bool:
	# For movement, we validate stamina availability
	# Each move action is 1 tile, cost calculation is cumulative
	var total_distance := _moves_queued_this_turn + 1
	var validation := resources.validate_move(total_distance)

	if not validation.can_move:
		return false

	# Calculate incremental cost for this tile
	var prev_cost := resources.get_move_cost(_moves_queued_this_turn)
	var new_cost := resources.get_move_cost(total_distance)
	var incremental_cost := new_cost - prev_cost

	# Store move info for proper handling
	action.move_number = _moves_queued_this_turn
	action.stamina_cost = incremental_cost
	action.strain_cost = 0.0

	# If this move requires desperate dash, calculate the strain penalty
	if validation.requires_dash:
		# Only the portion that exceeds stamina causes strain
		var stamina_after_prev := resources.current_stamina - prev_cost
		if stamina_after_prev < incremental_cost:
			var deficit := incremental_cost - maxi(0, stamina_after_prev)
			action.strain_cost = deficit * Constants.DESPERATE_DASH_PENALTY

	_moves_queued_this_turn += 1
	actions.append(action)
	action_added.emit(action)
	EventBus.arena_action_queued.emit(owner, action.to_dict())

	return true

func _queue_attack_action(action: CombatAction) -> bool:
	# Attacks can always be queued (exhaustion is checked at execution)
	action.strain_cost = resources.get_attack_strain_cost(action.action_type)
	action.stamina_cost = 0

	actions.append(action)
	action_added.emit(action)
	EventBus.arena_action_queued.emit(owner, action.to_dict())

	return true

func _queue_item_action(action: CombatAction) -> bool:
	action.strain_cost = Constants.ITEM_STRAIN
	action.stamina_cost = 0

	actions.append(action)
	action_added.emit(action)
	EventBus.arena_action_queued.emit(owner, action.to_dict())

	return true

## Remove the last action from the queue
func undo_last() -> CombatAction:
	if actions.is_empty():
		return null

	var action: CombatAction = actions.pop_back()

	# Handle move count tracking
	if action.action_type == Constants.CombatActionType.MOVE:
		_moves_queued_this_turn = maxi(0, _moves_queued_this_turn - 1)

	action_removed.emit(action)
	EventBus.arena_action_dequeued.emit(owner, action.to_dict())

	return action

## Clear all queued actions (for planning phase reset)
func clear() -> void:
	_moves_queued_this_turn = 0
	actions.clear()
	queue_cleared.emit()
	EventBus.arena_actions_cleared.emit(owner)

## Clear actions without resetting counters (for end of turn after execution)
func clear_without_refund() -> void:
	_moves_queued_this_turn = 0
	actions.clear()
	queue_cleared.emit()
	EventBus.arena_actions_cleared.emit(owner)

## Check if any moves were queued this turn
func had_moves_this_turn() -> bool:
	return _moves_queued_this_turn > 0

## Get all actions in queue
func get_actions() -> Array[CombatAction]:
	return actions

## Get actions sorted by priority for resolution
func get_actions_by_priority() -> Array[CombatAction]:
	var sorted := actions.duplicate()
	sorted.sort_custom(func(a, b): return a.priority < b.priority)
	return sorted

## Get total stamina cost of queued moves
func get_total_stamina_cost() -> int:
	return resources.get_move_cost(_moves_queued_this_turn)

## Get total strain cost of all queued actions
func get_total_strain_cost() -> float:
	var total := 0.0
	for action in actions:
		total += action.strain_cost
	return total

## Get number of queued actions
func size() -> int:
	return actions.size()

## Check if queue is empty
func is_empty() -> bool:
	return actions.is_empty()

## Get number of move actions in queue
func get_move_count() -> int:
	return _moves_queued_this_turn

## Get the predicted position after all moves execute
func get_predicted_position(current_pos: Vector2i) -> Vector2i:
	var pos := current_pos
	for action in actions:
		if action.action_type == Constants.CombatActionType.MOVE:
			pos = action.target_position
	return pos

## Convert queue to array of dictionaries for UI display
func to_display_list() -> Array[Dictionary]:
	var list: Array[Dictionary] = []
	for action in actions:
		var cost_info := {}
		if action.stamina_cost > 0:
			cost_info["stamina"] = action.stamina_cost
		if action.strain_cost > 0:
			cost_info["strain"] = action.strain_cost
		list.append({
			"name": action.get_display_name(),
			"icon": action.get_icon_path(),
			"cost": cost_info,
			"target": action.target_position
		})
	return list
