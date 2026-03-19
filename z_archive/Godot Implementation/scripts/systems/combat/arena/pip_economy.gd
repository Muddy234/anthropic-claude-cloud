class_name PipEconomy
extends RefCounted

## Manages pip resource for arena combat actions

signal pips_changed(current: int, maximum: int)

var current_pips: int = Constants.MAX_PIPS
var max_pips: int = Constants.MAX_PIPS
var moves_this_turn: int = 0  # Tracks escalating movement cost

## Reset pips to maximum (start of combat)
func reset() -> void:
	current_pips = max_pips
	moves_this_turn = 0
	pips_changed.emit(current_pips, max_pips)

## Regenerate pips at end of turn
func regenerate() -> void:
	var old_pips := current_pips
	current_pips = mini(current_pips + Constants.PIP_REGEN, max_pips)
	moves_this_turn = 0  # Reset movement cost escalation
	if current_pips != old_pips:
		pips_changed.emit(current_pips, max_pips)

## Get cost for the next movement action
func get_next_move_cost() -> int:
	var index := mini(moves_this_turn, Constants.MOVE_COSTS.size() - 1)
	return Constants.MOVE_COSTS[index]

## Get cost for an action type
func get_action_cost(action_type: Constants.CombatActionType) -> int:
	match action_type:
		Constants.CombatActionType.MOVE:
			return get_next_move_cost()
		Constants.CombatActionType.LIGHT_ATTACK:
			return Constants.LIGHT_ATTACK_COST
		Constants.CombatActionType.HEAVY_ATTACK:
			return Constants.HEAVY_ATTACK_COST
		Constants.CombatActionType.ITEM:
			return Constants.ITEM_COST
		_:
			return 0

## Check if we can afford an action
func can_afford(action_type: Constants.CombatActionType) -> bool:
	return current_pips >= get_action_cost(action_type)

## Spend pips for an action (returns true if successful)
func spend(action_type: Constants.CombatActionType) -> bool:
	var cost := get_action_cost(action_type)
	if current_pips < cost:
		return false

	current_pips -= cost

	# Track movement for escalating costs
	if action_type == Constants.CombatActionType.MOVE:
		moves_this_turn += 1

	pips_changed.emit(current_pips, max_pips)
	return true

## Refund pips for an undone action
func refund(action_type: Constants.CombatActionType, was_move_number: int = 0) -> void:
	var cost: int
	if action_type == Constants.CombatActionType.MOVE:
		# Use the move number to get the correct cost to refund
		var index := mini(was_move_number, Constants.MOVE_COSTS.size() - 1)
		cost = Constants.MOVE_COSTS[index]
		moves_this_turn = maxi(0, moves_this_turn - 1)
	else:
		cost = get_action_cost(action_type)

	current_pips = mini(current_pips + cost, max_pips)
	pips_changed.emit(current_pips, max_pips)

## Get remaining pips after hypothetically spending on action
func pips_after_action(action_type: Constants.CombatActionType) -> int:
	return current_pips - get_action_cost(action_type)
