class_name ActionQueue
extends RefCounted

## Manages queued actions for a combatant during the planning phase

signal action_added(action: CombatAction)
signal action_removed(action: CombatAction)
signal queue_cleared()

var actions: Array[CombatAction] = []
var owner: Node  # The combatant this queue belongs to
var pip_economy: PipEconomy

func _init(p_owner: Node, p_pip_economy: PipEconomy) -> void:
	owner = p_owner
	pip_economy = p_pip_economy

## Add an action to the queue
func queue_action(action: CombatAction) -> bool:
	# Check if we can afford this action
	if not pip_economy.can_afford(action.action_type):
		return false

	# Spend the pips
	if not pip_economy.spend(action.action_type):
		return false

	# Store move number for proper refund later
	if action.action_type == Constants.CombatActionType.MOVE:
		action.move_number = pip_economy.moves_this_turn - 1  # -1 because we just incremented

	actions.append(action)
	action_added.emit(action)
	EventBus.arena_action_queued.emit(owner, action.to_dict())

	return true

## Remove the last action from the queue
func undo_last() -> CombatAction:
	if actions.is_empty():
		return null

	var action: CombatAction = actions.pop_back()

	# Refund pips
	pip_economy.refund(action.action_type, action.move_number)

	action_removed.emit(action)
	EventBus.arena_action_dequeued.emit(owner, action.to_dict())

	return action

## Clear all queued actions (with pip refund for planning phase undo)
func clear() -> void:
	clear_with_refund(true)

## Clear actions without refunding pips (for end of turn after execution)
func clear_without_refund() -> void:
	clear_with_refund(false)

## Internal clear with optional refund
func clear_with_refund(refund: bool) -> void:
	if refund:
		# Refund all pips (in reverse order for correct move cost refunds)
		for i in range(actions.size() - 1, -1, -1):
			var action := actions[i]
			pip_economy.refund(action.action_type, action.move_number)

	actions.clear()
	queue_cleared.emit()
	EventBus.arena_actions_cleared.emit(owner)

## Get all actions in queue
func get_actions() -> Array[CombatAction]:
	return actions

## Get actions sorted by priority for resolution
func get_actions_by_priority() -> Array[CombatAction]:
	var sorted := actions.duplicate()
	sorted.sort_custom(func(a, b): return a.priority < b.priority)
	return sorted

## Get total pip cost of all queued actions
func get_total_pip_cost() -> int:
	var total := 0
	for action in actions:
		total += action.pip_cost
	return total

## Get number of queued actions
func size() -> int:
	return actions.size()

## Check if queue is empty
func is_empty() -> bool:
	return actions.is_empty()

## Get number of move actions in queue
func get_move_count() -> int:
	var count := 0
	for action in actions:
		if action.action_type == Constants.CombatActionType.MOVE:
			count += 1
	return count

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
		list.append({
			"name": action.get_display_name(),
			"icon": action.get_icon_path(),
			"cost": action.pip_cost,
			"target": action.target_position
		})
	return list
