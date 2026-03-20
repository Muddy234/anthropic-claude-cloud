class_name StaminaSystem
extends BaseSystem
## Energy resource with exhaustion state, regen delay, and boon-aware modifiers.

# --- Config ---
const MAX_STAMINA: float = 100.0
const REGEN_RATE: float = 15.0           # per second
const REGEN_DELAY: float = 1.0           # seconds after last use
const EXHAUSTION_THRESHOLD: float = 0.0  # triggers exhaustion at 0
const EXHAUSTION_RECOVERY: float = 30.0  # must regen to 30% before un-exhausted

# --- Action costs ---
const ACTION_COSTS: Dictionary = {
	"dodge":          15.0,
	"sprint":         8.0,   # per second
	"attack_melee":   10.0,
	"attack_ranged":  8.0,
	"ability_light":  15.0,
	"ability_heavy":  25.0,
}

# --- State ---
var current: float = MAX_STAMINA
var is_exhausted: bool = false
var regen_delay_timer: float = 0.0
var _cost_modifiers: Dictionary = {}  # source_id -> float multiplier
var _regen_modifiers: Dictionary = {} # source_id -> float multiplier


func _init() -> void:
	system_name = "stamina-system"
	priority = 28


func initialize() -> void:
	current = MAX_STAMINA
	is_exhausted = false
	regen_delay_timer = 0.0


func process_system(delta: float) -> void:
	if GameManager.current_state == Constants.GameState.PAUSED:
		return

	# Sprint drain
	if Input.is_action_pressed("sprint") and not is_exhausted:
		var cost := get_modified_cost(ACTION_COSTS["sprint"]) * delta
		if current >= cost:
			current -= cost
			regen_delay_timer = REGEN_DELAY
			_check_exhaustion()
		else:
			_trigger_exhaustion()

	# Regen delay
	if regen_delay_timer > 0.0:
		regen_delay_timer -= delta
		return

	# Regenerate
	if current < MAX_STAMINA:
		var regen := _get_effective_regen_rate() * delta
		current = minf(current + regen, MAX_STAMINA)

		# Check exhaustion recovery
		if is_exhausted and current >= EXHAUSTION_RECOVERY:
			is_exhausted = false
			if GameManager.player:
				EventBus.stamina_recovered.emit(GameManager.player)


func cleanup() -> void:
	current = MAX_STAMINA
	is_exhausted = false
	regen_delay_timer = 0.0
	_cost_modifiers.clear()
	_regen_modifiers.clear()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func consume_action(action_name: String) -> bool:
	## Attempts to consume stamina for the given action.
	## Returns false if insufficient stamina or exhausted.
	var base_cost: float = ACTION_COSTS.get(action_name, 0.0)
	if base_cost <= 0.0:
		return true  # Free action

	if is_exhausted:
		return false

	var cost := get_modified_cost(base_cost)
	if current < cost:
		return false

	current -= cost
	regen_delay_timer = REGEN_DELAY
	_check_exhaustion()
	return true


func consume_amount(amount: float) -> bool:
	## Directly consume a specific amount of stamina.
	if is_exhausted or current < amount:
		return false
	current -= amount
	regen_delay_timer = REGEN_DELAY
	_check_exhaustion()
	return true


func refund(amount: float) -> void:
	## Partial refund (e.g., interrupted attack).
	current = minf(current + amount, MAX_STAMINA)


func get_modified_cost(base_cost: float) -> float:
	## Applies boon/equipment cost modifiers.
	var modifier := 1.0
	for mod_value in _cost_modifiers.values():
		modifier *= mod_value
	return base_cost * modifier


func get_stamina_percent() -> float:
	return current / MAX_STAMINA


func get_current() -> float:
	return current


func get_max() -> float:
	return MAX_STAMINA


func can_afford(action_name: String) -> bool:
	if is_exhausted:
		return false
	var base_cost: float = ACTION_COSTS.get(action_name, 0.0)
	return current >= get_modified_cost(base_cost)


func is_sprinting() -> bool:
	return Input.is_action_pressed("sprint") and not is_exhausted and current > 0.0


# ---------------------------------------------------------------------------
# Modifier API
# ---------------------------------------------------------------------------

func add_cost_modifier(source_id: String, multiplier: float) -> void:
	_cost_modifiers[source_id] = multiplier


func remove_cost_modifier(source_id: String) -> void:
	_cost_modifiers.erase(source_id)


func add_regen_modifier(source_id: String, multiplier: float) -> void:
	_regen_modifiers[source_id] = multiplier


func remove_regen_modifier(source_id: String) -> void:
	_regen_modifiers.erase(source_id)


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _get_effective_regen_rate() -> float:
	var rate := REGEN_RATE
	var modifier := 1.0
	for mod_value in _regen_modifiers.values():
		modifier *= mod_value
	return rate * modifier


func _check_exhaustion() -> void:
	if current <= EXHAUSTION_THRESHOLD and not is_exhausted:
		_trigger_exhaustion()


func _trigger_exhaustion() -> void:
	is_exhausted = true
	current = 0.0
	if GameManager.player:
		EventBus.stamina_exhausted.emit(GameManager.player)
