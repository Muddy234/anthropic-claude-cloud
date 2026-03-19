class_name MoveAction
extends CombatAction

## Movement action with escalating pip cost

func _init(p_source: Node, p_target: Vector2i, p_move_number: int = 0) -> void:
	super(p_source, p_target)
	action_type = Constants.CombatActionType.MOVE
	priority = Constants.PRIORITY_FAST  # Movement executes with fast priority
	move_number = p_move_number
	# Calculate pip cost based on move number
	var cost_index := mini(p_move_number, Constants.MOVE_COSTS.size() - 1)
	pip_cost = Constants.MOVE_COSTS[cost_index]

func get_display_name() -> String:
	return "Move"

func get_icon_path() -> String:
	return "res://assets/ui/icons/move.png"

func is_valid(grid: ArenaGrid) -> bool:
	if not super.is_valid(grid):
		return false

	# Check source is still valid
	if not source or not is_instance_valid(source):
		return false

	# Check that target is within arena bounds
	if not grid.is_within_bounds(target_position):
		return false

	# Check that target is adjacent to source current position
	var source_pos: Vector2i = grid.get_combatant_position(source)
	var diff := target_position - source_pos
	if abs(diff.x) + abs(diff.y) != 1:
		return false  # Must be cardinal adjacent

	# Check that target tile is not blocked
	if grid.is_tile_blocked(target_position):
		return false

	return true

func execute(grid: ArenaGrid, resolver: RefCounted) -> Dictionary:
	if not source or not is_instance_valid(source):
		return {"success": false, "action_type": action_type, "message": "Source no longer valid"}
	var from_pos: Vector2i = grid.get_combatant_position(source)

	# Move the combatant on the grid
	var success := grid.move_combatant(source, target_position)

	if success:
		EventBus.arena_combatant_moved.emit(source, from_pos, target_position)

	return {
		"success": success,
		"action_type": action_type,
		"from": from_pos,
		"to": target_position,
		"message": "Moved to %s" % str(target_position) if success else "Movement blocked"
	}
