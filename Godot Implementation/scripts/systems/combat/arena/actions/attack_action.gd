class_name AttackAction
extends CombatAction

## Attack action (light or heavy)
## Uses strain as resource cost

var is_heavy: bool = false
var weapon_range: int = 1  # Tiles the attack can reach
var base_damage: int = 0  # Base damage for this attack type

func _init(p_source: Node, p_target: Vector2i, p_is_heavy: bool = false) -> void:
	super(p_source, p_target)
	is_heavy = p_is_heavy

	if is_heavy:
		action_type = Constants.CombatActionType.HEAVY_ATTACK
		priority = Constants.PRIORITY_SLOW
		strain_cost = Constants.HEAVY_ATTACK_STRAIN
		base_damage = Constants.HEAVY_ATTACK_DAMAGE
	else:
		action_type = Constants.CombatActionType.LIGHT_ATTACK
		priority = Constants.PRIORITY_FAST
		strain_cost = Constants.LIGHT_ATTACK_STRAIN
		base_damage = Constants.LIGHT_ATTACK_DAMAGE

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

	# Check if source is exhausted (attacks deal 0 damage when exhausted)
	var damage_blocked := false
	if resolver.has_method("get_combatant_for_entity"):
		var source_combatant = resolver.get_combatant_for_entity(source)
		if source_combatant and source_combatant.is_exhausted():
			damage_blocked = true

	# Calculate damage
	var damage_result := _calculate_damage(target)

	# Block damage if exhausted
	if damage_blocked:
		damage_result.damage = 0
		damage_result["damage_blocked"] = true

	# Apply damage through the resolver's wrapper to ensure is_alive gets updated
	if damage_result.damage > 0:
		if resolver.has_method("apply_damage_to_entity"):
			resolver.apply_damage_to_entity(target, damage_result.damage, source)
		else:
			# Fallback for non-arena combat (shouldn't happen)
			target.take_damage(damage_result.damage, source)

	EventBus.arena_combatant_attacked.emit(source, target_position, damage_result)

	var message := "%s dealt %d damage" % [get_display_name(), damage_result.damage]
	if damage_blocked:
		message = "%s attack blocked (exhausted)" % get_display_name()

	return {
		"success": true,
		"action_type": action_type,
		"from": source_pos,
		"to": target_position,
		"target": target,
		"damage": damage_result.damage,
		"damage_blocked": damage_blocked,
		"is_crit": damage_result.get("is_crit", false),
		"message": message
	}

func _calculate_damage(target: Node) -> Dictionary:
	# Use the fixed damage values from the new system
	# Light Attack: 2 damage, Heavy Attack: 6 damage
	var damage := base_damage

	# Check if target has defense
	var defense: int = 0
	if target.has_method("get_stat"):
		defense = target.get_stat("defense")

	# Apply defense reduction (simple subtraction, minimum 1 damage)
	var final_damage := maxi(Constants.MIN_DAMAGE, damage - defense)

	return {"damage": final_damage, "is_crit": false}

func _manhattan_distance(a: Vector2i, b: Vector2i) -> int:
	return abs(a.x - b.x) + abs(a.y - b.y)
