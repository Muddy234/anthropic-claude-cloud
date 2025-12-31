class_name AttackAction
extends CombatAction

## Attack action (light or heavy)

var is_heavy: bool = false
var weapon_range: int = 1  # Tiles the attack can reach

func _init(p_source: Node, p_target: Vector2i, p_is_heavy: bool = false) -> void:
	super(p_source, p_target)
	is_heavy = p_is_heavy

	if is_heavy:
		action_type = Constants.CombatActionType.HEAVY_ATTACK
		priority = Constants.PRIORITY_SLOW
		pip_cost = Constants.HEAVY_ATTACK_COST
	else:
		action_type = Constants.CombatActionType.LIGHT_ATTACK
		priority = Constants.PRIORITY_FAST
		pip_cost = Constants.LIGHT_ATTACK_COST

	# Get weapon range from source if available
	if p_source and p_source.has_method("get_weapon_range"):
		weapon_range = p_source.get_weapon_range()

func get_display_name() -> String:
	return "Heavy Attack" if is_heavy else "Light Attack"

func get_icon_path() -> String:
	if is_heavy:
		return "res://assets/ui/icons/heavy_attack.png"
	return "res://assets/ui/icons/light_attack.png"

func is_valid(grid: ArenaGrid) -> bool:
	if not super.is_valid(grid):
		return false

	# Check source is still valid
	if not source or not is_instance_valid(source):
		return false

	# Check target is within weapon range
	var source_pos: Vector2i = grid.get_combatant_position(source)
	var distance := _manhattan_distance(source_pos, target_position)

	if distance > weapon_range:
		return false

	return true

func execute(grid: ArenaGrid, resolver: RefCounted) -> Dictionary:
	if not source or not is_instance_valid(source):
		return {"success": false, "action_type": action_type, "message": "Source no longer valid"}
	var source_pos: Vector2i = grid.get_combatant_position(source)

	# Check if there's a target at the position
	var target := grid.get_combatant_at(target_position)

	if not target:
		return {
			"success": false,
			"action_type": action_type,
			"from": source_pos,
			"to": target_position,
			"message": "No target at position"
		}

	# Calculate damage using existing damage calculator
	var damage_result := _calculate_damage(target)

	# Apply damage through the resolver's wrapper to ensure is_alive gets updated
	if damage_result.damage > 0:
		if resolver.has_method("apply_damage_to_entity"):
			resolver.apply_damage_to_entity(target, damage_result.damage, source)
		else:
			# Fallback for non-arena combat (shouldn't happen)
			target.take_damage(damage_result.damage, source)

	EventBus.arena_combatant_attacked.emit(source, target_position, damage_result)

	return {
		"success": true,
		"action_type": action_type,
		"from": source_pos,
		"to": target_position,
		"target": target,
		"damage": damage_result.damage,
		"is_crit": damage_result.get("is_crit", false),
		"message": "%s dealt %d damage" % [get_display_name(), damage_result.damage]
	}

func _calculate_damage(target: Node) -> Dictionary:
	# Use existing DamageCalculator via GameManager's combat_system if available
	if GameManager.combat_system and GameManager.combat_system.has_method("calculate_damage"):
		var context := {"heavy_attack": is_heavy}
		var result: Dictionary = GameManager.combat_system.calculate_damage(source, target, context)
		# Apply heavy attack multiplier
		if is_heavy:
			result.damage = int(result.get("final_damage", result.get("damage", 0)) * 1.5)
		else:
			result.damage = result.get("final_damage", result.get("damage", 0))
		return result

	# Fallback basic calculation
	var base_damage: int = 5
	if source.has_method("get_stat"):
		base_damage = source.get_stat("attack")

	if is_heavy:
		base_damage = int(base_damage * 1.5)

	var defense: int = 0
	if target.has_method("get_stat"):
		defense = target.get_stat("defense")

	var final_damage := maxi(Constants.MIN_DAMAGE, base_damage - defense)

	return {"damage": final_damage, "is_crit": false}

func _manhattan_distance(a: Vector2i, b: Vector2i) -> int:
	return abs(a.x - b.x) + abs(a.y - b.y)
