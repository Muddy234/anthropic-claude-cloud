class_name CombatResources
extends RefCounted

## Manages Stamina (movement) and Strain (combat) resources for arena combat
## Replaces the old pip economy system

signal stamina_changed(current: int, maximum: int)
signal strain_changed(current: float, maximum: float)
signal exhausted_triggered()
signal exhausted_cleared()

# Stamina (Movement Resource) - Integer, battery-style
var current_stamina: int = Constants.STAMINA_MAX
var max_stamina: int = Constants.STAMINA_MAX
var moves_this_turn: int = 0  # Tracks escalating movement cost

# Strain (Combat Resource) - Float, can exceed max (overload)
var current_strain: float = 0.0
var is_exhausted: bool = false

## Reset resources to starting values (beginning of combat)
func reset() -> void:
	current_stamina = max_stamina
	current_strain = 0.0
	is_exhausted = false
	moves_this_turn = 0
	stamina_changed.emit(current_stamina, max_stamina)
	strain_changed.emit(current_strain, Constants.STRAIN_MAX)

## Process upkeep at start of turn (Phase A in lifecycle)
## Returns true if exhausted state is active this turn (damage will be blocked)
func process_upkeep() -> bool:
	var damage_blocked_this_turn := is_exhausted

	# Strain Recovery
	if is_exhausted:
		# Skip recovery when exhausted - exhausted state clears at end of turn
		# Attacks this turn will deal 0 damage
		pass
	else:
		# Normal strain recovery
		current_strain = maxf(0.0, current_strain - Constants.STRAIN_RECOVERY)
		strain_changed.emit(current_strain, Constants.STRAIN_MAX)

	# Stamina Regeneration
	var old_stamina := current_stamina
	current_stamina = mini(current_stamina + Constants.STAMINA_REGEN, max_stamina)
	if current_stamina != old_stamina:
		stamina_changed.emit(current_stamina, max_stamina)

	# Reset movement counter for new turn
	moves_this_turn = 0

	return damage_blocked_this_turn

## Clear exhausted state at end of turn (after attacks have been blocked)
func clear_exhaustion() -> void:
	if is_exhausted:
		is_exhausted = false
		exhausted_cleared.emit()

## Get cumulative stamina cost for moving a given distance (1-3 tiles)
func get_move_cost(distance: int) -> int:
	if distance <= 0:
		return 0
	var index := mini(distance - 1, Constants.MOVE_COSTS.size() - 1)
	return Constants.MOVE_COSTS[index]

## Get cost for the next single tile of movement
func get_next_tile_cost() -> int:
	match moves_this_turn:
		0: return Constants.MOVE_COST_TIER_1
		1: return Constants.MOVE_COST_TIER_2
		_: return Constants.MOVE_COST_TIER_3

## Check if can afford to move a distance (returns validation result)
## Returns Dictionary: {can_move: bool, requires_dash: bool, strain_penalty: float, reason: String}
func validate_move(distance: int) -> Dictionary:
	if distance <= 0:
		return {can_move = false, requires_dash = false, strain_penalty = 0.0, reason = "Invalid distance"}

	var cost := get_move_cost(distance)
	var stamina_deficit := maxi(0, cost - current_stamina)

	# Standard move - enough stamina
	if stamina_deficit == 0:
		return {can_move = true, requires_dash = false, strain_penalty = 0.0, reason = ""}

	# Desperate Dash - need to check strain
	var strain_penalty := stamina_deficit * Constants.DESPERATE_DASH_PENALTY
	var projected_strain := current_strain + strain_penalty

	if projected_strain > Constants.STRAIN_MAX:
		return {
			can_move = false,
			requires_dash = true,
			strain_penalty = strain_penalty,
			reason = "Desperate Dash would cause immediate overload"
		}

	return {
		can_move = true,
		requires_dash = true,
		strain_penalty = strain_penalty,
		reason = ""
	}

## Check if can afford to move (simple bool check)
func can_afford_move(distance: int) -> bool:
	return validate_move(distance).can_move

## Spend stamina for movement (handles desperate dash internally)
## Returns Dictionary: {success: bool, stamina_spent: int, strain_added: float}
func spend_move(distance: int) -> Dictionary:
	var validation := validate_move(distance)
	if not validation.can_move:
		return {success = false, stamina_spent = 0, strain_added = 0.0}

	var cost := get_move_cost(distance)
	var stamina_to_spend := mini(cost, current_stamina)
	var strain_to_add := validation.strain_penalty

	# Deduct stamina
	current_stamina -= stamina_to_spend
	moves_this_turn += distance
	stamina_changed.emit(current_stamina, max_stamina)

	# Apply desperate dash strain if applicable
	if strain_to_add > 0:
		current_strain += strain_to_add
		strain_changed.emit(current_strain, Constants.STRAIN_MAX)
		# Note: Desperate dash cannot cause immediate overload (validated above)

	return {success = true, stamina_spent = stamina_to_spend, strain_added = strain_to_add}

## Get strain cost for an attack type
func get_attack_strain_cost(action_type: Constants.CombatActionType) -> float:
	match action_type:
		Constants.CombatActionType.LIGHT_ATTACK:
			return Constants.LIGHT_ATTACK_STRAIN
		Constants.CombatActionType.HEAVY_ATTACK:
			return Constants.HEAVY_ATTACK_STRAIN
		Constants.CombatActionType.ITEM:
			return Constants.ITEM_STRAIN
		_:
			return 0.0

## Check if can execute an attack (not exhausted)
func can_attack() -> bool:
	return not is_exhausted

## Execute an attack - applies strain cost and checks for overload
## Returns Dictionary: {success: bool, damage_blocked: bool, triggered_overload: bool}
func execute_attack(action_type: Constants.CombatActionType) -> Dictionary:
	# Pre-flight exhaustion check
	if is_exhausted:
		return {success = false, damage_blocked = true, triggered_overload = false}

	# Apply strain cost
	var strain_cost := get_attack_strain_cost(action_type)
	current_strain += strain_cost
	strain_changed.emit(current_strain, Constants.STRAIN_MAX)

	# Check for overload after attack
	var triggered_overload := false
	if current_strain > Constants.STRAIN_MAX:
		is_exhausted = true
		triggered_overload = true
		exhausted_triggered.emit()

	return {success = true, damage_blocked = false, triggered_overload = triggered_overload}

## Check if currently overloaded (strain > max)
func is_overloaded() -> bool:
	return current_strain > Constants.STRAIN_MAX

## Get strain percentage (0.0 to 1.0+, can exceed 1.0 when overloaded)
func get_strain_percentage() -> float:
	return current_strain / Constants.STRAIN_MAX

## Refund stamina for an undone move action
func refund_move(distance: int) -> void:
	var cost := get_move_cost(distance)
	current_stamina = mini(current_stamina + cost, max_stamina)
	moves_this_turn = maxi(0, moves_this_turn - distance)
	stamina_changed.emit(current_stamina, max_stamina)

## Get remaining stamina after hypothetical move
func stamina_after_move(distance: int) -> int:
	var cost := get_move_cost(distance)
	return maxi(0, current_stamina - cost)

## Get projected strain after hypothetical attack
func strain_after_attack(action_type: Constants.CombatActionType) -> float:
	return current_strain + get_attack_strain_cost(action_type)

## Utility: Get UI color for current strain level
func get_strain_color() -> Color:
	var percentage := get_strain_percentage()
	if percentage >= 1.0:
		return Color(1.0, 0.2, 0.2)  # Red - Overload
	elif percentage >= 0.8:
		return Color(1.0, 0.5, 0.0)  # Orange - Danger
	elif percentage >= 0.5:
		return Color(1.0, 1.0, 0.0)  # Yellow - Caution
	else:
		return Color(0.3, 1.0, 0.3)  # Green - Safe
