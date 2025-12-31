class_name CombatAction
extends RefCounted

## Base class for all arena combat actions

var action_type: Constants.CombatActionType
var priority: int  # Lower = executes first
var pip_cost: int
var source: Node  # The combatant performing the action
var target_position: Vector2i  # Grid position being targeted
var move_number: int = 0  # For tracking escalating move costs

func _init(p_source: Node, p_target: Vector2i) -> void:
	source = p_source
	target_position = p_target

## Get display name for UI
func get_display_name() -> String:
	return "Action"

## Get icon path for UI (override in subclasses)
func get_icon_path() -> String:
	return ""

## Validate if this action can be executed given current state
func is_valid(grid: ArenaGrid) -> bool:
	return source != null

## Execute the action (override in subclasses)
func execute(grid: ArenaGrid, resolver: RefCounted) -> Dictionary:
	return {"success": false, "message": "Base action cannot be executed"}

## Convert to dictionary for serialization/signals
func to_dict() -> Dictionary:
	return {
		"action_type": action_type,
		"priority": priority,
		"pip_cost": pip_cost,
		"source_path": source.get_path() if source else "",
		"target_position": target_position,
		"move_number": move_number
	}
