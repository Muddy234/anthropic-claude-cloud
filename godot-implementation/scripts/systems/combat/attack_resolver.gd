class_name AttackResolver
extends BaseSystem
## Mouse-driven melee attack system with combo chains, directional arcs,
## lunge movement, and hitstop juice. Extends BaseSystem for lifecycle management.

# --- Signals ---

signal attack_started(player: Node, direction: Vector2, combo_step: int)
signal attack_hit(attacker: Node, defender: Node, damage_result: RefCounted)
signal combo_advanced(new_step: int)
signal combo_reset()
signal hitstop_triggered(duration: float)

# --- Weapon arc presets (half-angle in degrees) ---

const WEAPON_ARCS: Dictionary = {
	&"sword":      {&"arc": 45.0, &"style": &"sweep"},
	&"greatsword": {&"arc": 55.0, &"style": &"sweep"},
	&"axe":        {&"arc": 35.0, &"style": &"chop"},
	&"mace":       {&"arc": 40.0, &"style": &"slam"},
	&"dagger":     {&"arc": 25.0, &"style": &"alternate"},
	&"spear":      {&"arc": 15.0, &"style": &"thrust"},
	&"rapier":     {&"arc": 12.0, &"style": &"jab"},
	&"hammer":     {&"arc": 50.0, &"style": &"slam"},
	&"staff":      {&"arc": 45.0, &"style": &"sweep"},
	&"fist":       {&"arc": 30.0, &"style": &"alternate"},
}

## Lunge distance per weapon type (in grid units)
const WEAPON_LUNGE: Dictionary = {
	&"sword":      0.20,
	&"greatsword": 0.30,
	&"axe":        0.15,
	&"mace":       0.10,
	&"dagger":     0.35,
	&"spear":      0.40,
	&"rapier":     0.45,
	&"hammer":     0.10,
	&"staff":      0.05,
	&"fist":       0.25,
}

# --- Stamina costs (flat values) ---

const STAMINA_COST_LIGHT: float = 8.0
const STAMINA_COST_HEAVY: float = 18.0

# --- Swing state ---

var cooldown: float = 0.0
var is_swinging: bool = false
var swing_progress: float = 0.0
var swing_duration: float = 0.25
var swing_direction: Vector2 = Vector2.ZERO
var swing_arc_angle: float = 90.0  # full arc in degrees
var swing_range: float = 1.0       # grid units
var slash_style: StringName = &"sweep"
var hit_enemies: Dictionary = {}   # entity instance_id -> true (prevents double hits)

# --- Combo state ---

var combo_count: int = 1           # current step in chain (1, 2, or 3)
var combo_reset_timer: float = 0.0
var combo_decay_duration: float = 1.5

# --- Input buffer ---

var input_buffer_time: float = 0.0
var input_buffer_duration: float = 0.2
var buffered_attack: bool = false
var buffered_direction: Vector2 = Vector2.ZERO

# --- Lunge state ---

var is_lunging: bool = false
var lunge_direction: Vector2 = Vector2.ZERO
var lunge_distance: float = 0.0
var lunge_progress: float = 0.0
var lunge_duration: float = 0.10
var lunge_entity: Node = null

# --- Hitstop state ---

var is_hitstop: bool = false
var hitstop_timer: float = 0.0
var hitstop_duration: float = 0.0

# --- Active window (normalised swing progress where hits register) ---

var active_window_start: float = 0.15
var active_window_end: float = 0.85

# --- Internal refs ---

var _damage_calculator: DamageCalculator = DamageCalculator.new()


# --- BaseSystem overrides ---

func initialize() -> void:
	system_name = "AttackResolver"
	priority = 60


func process_system(delta: float) -> void:
	# Hitstop freezes everything
	if is_hitstop:
		hitstop_timer -= delta
		if hitstop_timer <= 0.0:
			is_hitstop = false
		return

	_process_swing(delta)
	_process_combo_decay(delta)
	_process_input_buffer(delta)
	_process_lunge(delta)


func cleanup() -> void:
	is_swinging = false
	combo_count = 1
	hit_enemies.clear()
	is_lunging = false
	lunge_entity = null
	buffered_attack = false
	is_hitstop = false


# --- Public API ---

## Attempt a melee attack. Returns true if the swing started.
func perform_attack(player: Node, direction: Vector2) -> bool:
	if not player or not player.is_alive:
		return false

	# If mid-swing, buffer the input instead
	if is_swinging:
		buffered_attack = true
		buffered_direction = direction.normalized()
		input_buffer_time = input_buffer_duration
		return false

	if cooldown > 0.0:
		return false

	# Determine stamina cost -- combo finisher (step 3) uses heavy cost
	var stamina_cost: float = STAMINA_COST_HEAVY if combo_count == 3 else STAMINA_COST_LIGHT
	if player.stamina < stamina_cost:
		return false
	player.stamina -= stamina_cost

	# Resolve weapon info
	var weapon_data: Dictionary = _get_weapon_data(player)
	var weapon_type: StringName = weapon_data.get("type", &"fist") as StringName
	var arc_info: Dictionary = WEAPON_ARCS.get(weapon_type, WEAPON_ARCS[&"fist"])

	# Set swing state
	is_swinging = true
	swing_progress = 0.0
	swing_direction = direction.normalized()
	swing_arc_angle = arc_info[&"arc"] * 2.0
	slash_style = arc_info[&"style"]
	swing_range = weapon_data.get("range", 1.0) as float
	hit_enemies.clear()

	# Start lunge
	_begin_lunge(player, swing_direction, weapon_type)

	attack_started.emit(player, swing_direction, combo_count)

	# Advance combo: 1 -> 2 -> 3 -> 1
	var previous_step: int = combo_count
	combo_count = (combo_count % 3) + 1
	combo_reset_timer = combo_decay_duration

	if combo_count != previous_step + 1:
		# Wrapped around from 3 -> 1
		combo_reset.emit()
	else:
		combo_advanced.emit(combo_count)

	return true


## Check which enemies are hit by the current swing arc.
## Returns an Array of enemy nodes.
func check_melee_hits(player: Node, enemies: Array) -> Array:
	if not is_swinging:
		return []

	# Only register hits inside the active window
	if swing_progress < active_window_start or swing_progress > active_window_end:
		return []

	var results: Array = []
	var player_pos: Vector2 = player.global_position
	var range_px: float = swing_range * 32.0  # 32 px per grid unit

	for enemy in enemies:
		if not enemy or not enemy.is_alive:
			continue
		var eid: int = enemy.get_instance_id()
		if hit_enemies.has(eid):
			continue

		var to_enemy: Vector2 = enemy.global_position - player_pos
		var dist: float = to_enemy.length()
		if dist > range_px:
			continue

		var in_arc: bool = false
		match slash_style:
			&"thrust", &"jab":
				# Narrow perpendicular check -- dot product against swing direction
				var dot: float = to_enemy.normalized().dot(swing_direction)
				in_arc = dot >= cos(deg_to_rad(swing_arc_angle * 0.5))
			&"sweep", &"chop", &"slam", &"alternate":
				# Angular arc check
				var angle: float = abs(rad_to_deg(swing_direction.angle_to(to_enemy)))
				in_arc = angle <= swing_arc_angle * 0.5

		if in_arc:
			hit_enemies[eid] = true
			results.append(enemy)

	return results


## Compute and apply damage from attacker to defender (melee context).
func apply_melee_damage(attacker: Node, defender: Node) -> void:
	var weapon_data: Dictionary = _get_weapon_data(attacker)
	var weapon_type: StringName = weapon_data.get("type", &"fist") as StringName
	var is_ambush: bool = _check_ambush_angle(attacker, defender)

	var context: Dictionary = {
		"weapon": weapon_data.get("resource", null),
		"weapon_type": _get_damage_category(weapon_type),
		"element": weapon_data.get("element", &"physical") as StringName,
		"is_ambush": is_ambush,
	}

	var result: DamageCalculator.DamageResult = _damage_calculator.calculate(attacker, defender, context)

	if result.miss:
		EventBus.emit_signal("damage_dealt", {
			"attacker": attacker,
			"defender": defender,
			"amount": 0,
			"missed": true,
		})
		return

	# Apply damage through the defender
	defender.take_damage(result.final_damage, result.element, attacker)

	# Dramatic hitstop on critical hit
	if result.is_critical:
		_trigger_hitstop(0.08)

	attack_hit.emit(attacker, defender, result)

	EventBus.emit_signal("damage_dealt", {
		"attacker": attacker,
		"defender": defender,
		"amount": result.final_damage,
		"is_critical": result.is_critical,
		"is_ambush": result.is_ambush,
		"element": result.element,
		"missed": false,
	})


# --- Private: process helpers ---

func _process_swing(delta: float) -> void:
	if not is_swinging:
		if cooldown > 0.0:
			cooldown -= delta
		return

	swing_progress += delta / swing_duration
	if swing_progress >= 1.0:
		is_swinging = false
		swing_progress = 0.0
		cooldown = 0.05  # brief recovery


func _process_combo_decay(delta: float) -> void:
	if combo_reset_timer > 0.0:
		combo_reset_timer -= delta
		if combo_reset_timer <= 0.0 and combo_count != 1:
			combo_count = 1
			combo_reset.emit()


func _process_input_buffer(delta: float) -> void:
	if not buffered_attack:
		return
	input_buffer_time -= delta
	if input_buffer_time <= 0.0:
		buffered_attack = false
		return
	# If swing just ended, replay the buffered input
	if not is_swinging and cooldown <= 0.0:
		buffered_attack = false
		EventBus.emit_signal("attack_buffered", buffered_direction)


func _process_lunge(delta: float) -> void:
	if not is_lunging:
		return
	lunge_progress += delta / lunge_duration
	if lunge_progress >= 1.0:
		is_lunging = false
		lunge_entity = null
		return

	if lunge_entity and is_instance_valid(lunge_entity):
		var step: Vector2 = lunge_direction * (lunge_distance * 32.0) * (delta / lunge_duration)
		lunge_entity.velocity = step / delta  # let CharacterBody2D handle collision


# --- Private: lunge ---

func _begin_lunge(entity: Node, direction: Vector2, weapon_type: StringName) -> void:
	lunge_distance = WEAPON_LUNGE.get(weapon_type, 0.15) as float
	if lunge_distance <= 0.0:
		return
	is_lunging = true
	lunge_direction = direction
	lunge_progress = 0.0
	lunge_entity = entity


# --- Private: hitstop ---

func _trigger_hitstop(duration: float) -> void:
	is_hitstop = true
	hitstop_timer = duration
	hitstop_duration = duration
	hitstop_triggered.emit(duration)


# --- Private: weapon helpers ---

func _get_weapon_data(entity: Node) -> Dictionary:
	if entity.get("is_player") and entity.get("equipped"):
		# EquipSlot.MAIN_HAND is typically 0
		var weapon_item = entity.equipped.get(0, null)
		if weapon_item:
			return {
				"resource": weapon_item,
				"type": weapon_item.get("weapon_type") if weapon_item.get("weapon_type") else &"fist",
				"range": weapon_item.get("range") if weapon_item.get("range") else 1.0,
				"element": weapon_item.get("element") if weapon_item.get("element") else &"physical",
			}
	return {"resource": null, "type": &"fist", "range": 1.0, "element": &"physical"}


func _get_damage_category(weapon_type: StringName) -> StringName:
	match weapon_type:
		&"sword", &"greatsword", &"dagger", &"axe":
			return &"blade"
		&"mace", &"hammer", &"staff", &"fist":
			return &"blunt"
		&"spear", &"rapier":
			return &"pierce"
	return &"blunt"


func _check_ambush_angle(attacker: Node, defender: Node) -> bool:
	if not defender.has_method("get_facing_direction"):
		return false
	var defender_facing: Vector2 = defender.get_facing_direction()
	var attack_dir: Vector2 = (defender.global_position - attacker.global_position).normalized()
	# Check if attacker is behind or to the side (> 60 degrees from facing)
	var dot: float = defender_facing.dot(-attack_dir)
	# dot < cos(60 deg) means angle > 60 from front, i.e. side/behind
	return dot < cos(deg_to_rad(60.0))
