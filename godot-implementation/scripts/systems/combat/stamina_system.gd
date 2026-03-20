class_name CombatStaminaSystem
extends BaseSystem
## Combat stamina resource management system.
## Handles stamina consumption, regeneration, exhaustion, and combat refunds.

# ── Signals ──────────────────────────────────────────────────────────────────
signal stamina_exhausted(current: float)
signal stamina_recovered(current: float)
signal stamina_consumed(amount: float, action_type: String)
signal stamina_refunded(amount: float, reason: String)

# ── Configuration ────────────────────────────────────────────────────────────
const STAMINA_CONFIG: Dictionary = {
	"max_stamina": 100.0,
	"costs": {
		"lightAttack": 10.0,
		"heavyAttack": 10.0,
		"dodge": 25.0,
		"dash": 15.0,
		"block": 5.0,
	},
	"regen_rate": 4.0,
	"regen_delay": 0.0,
	"in_combat_regen_multiplier": 1.0,
	"kill_refund": 25.0,
	"perfect_dodge_refund": 15.0,
	"exhausted_threshold": 20.0,
	"exhausted_speed_penalty": 0.7,
	"segment_value": 20.0,
}

# ── State ────────────────────────────────────────────────────────────────────
var current_stamina: float = 100.0
var is_exhausted: bool = false
var regen_delay_timer: float = 0.0


# ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	system_name = "CombatStaminaSystem"
	priority = 15
	super._ready()


func initialize() -> void:
	current_stamina = get_max_stamina()
	is_exhausted = false
	regen_delay_timer = 0.0
	_connect_signals()


func _connect_signals() -> void:
	if EventBus.has_signal("enemy_died"):
		EventBus.enemy_died.connect(_on_enemy_died)


func cleanup() -> void:
	current_stamina = get_max_stamina()
	is_exhausted = false
	regen_delay_timer = 0.0
	if EventBus.has_signal("enemy_died") and EventBus.enemy_died.is_connected(_on_enemy_died):
		EventBus.enemy_died.disconnect(_on_enemy_died)


# ── Core Methods ─────────────────────────────────────────────────────────────

func can_afford(action_type: String) -> bool:
	## Returns true if the player has enough stamina for the given action.
	if is_exhausted:
		return false
	var cost: float = STAMINA_CONFIG["costs"].get(action_type, 0.0)
	return current_stamina >= cost


func consume(amount: float, action_type: String = "") -> bool:
	## Consume a specific amount of stamina. Returns false if insufficient.
	if is_exhausted:
		return false
	if current_stamina < amount:
		return false

	current_stamina -= amount
	regen_delay_timer = STAMINA_CONFIG["regen_delay"]

	stamina_consumed.emit(amount, action_type)

	_check_exhaustion()
	return true


func consume_action(action_type: String) -> bool:
	## Consume stamina for a named action. Returns false if cannot afford.
	var cost: float = STAMINA_CONFIG["costs"].get(action_type, 0.0)
	if cost <= 0.0:
		return true  # Free action

	return consume(cost, action_type)


func refund(amount: float, reason: String = "") -> void:
	## Refund stamina (e.g., from kills or perfect dodges).
	var max_stam: float = get_max_stamina()
	var old_stamina: float = current_stamina
	current_stamina = minf(current_stamina + amount, max_stam)

	var actual_refund: float = current_stamina - old_stamina
	if actual_refund > 0.0:
		stamina_refunded.emit(actual_refund, reason)

	# Check if we recovered from exhaustion
	if is_exhausted and current_stamina >= STAMINA_CONFIG["exhausted_threshold"]:
		is_exhausted = false
		stamina_recovered.emit(current_stamina)


func get_exhaustion_modifier() -> float:
	## Returns the speed penalty multiplier when exhausted.
	if is_exhausted:
		return STAMINA_CONFIG["exhausted_speed_penalty"]
	return 1.0


func on_kill() -> void:
	## Called when the player kills an enemy — grants stamina refund.
	refund(get_kill_refund(), "kill")


func on_perfect_dodge() -> void:
	## Called on a perfectly-timed dodge — grants stamina refund.
	refund(STAMINA_CONFIG["perfect_dodge_refund"], "perfect_dodge")


# ── Getters ──────────────────────────────────────────────────────────────────

func get_max_stamina() -> float:
	return STAMINA_CONFIG["max_stamina"]


func get_regen_rate() -> float:
	return STAMINA_CONFIG["regen_rate"]


func get_kill_refund() -> float:
	return STAMINA_CONFIG["kill_refund"]


func get_stamina_percent() -> float:
	return current_stamina / get_max_stamina()


func get_segment_count() -> int:
	## Returns the number of full stamina segments available.
	var segment_val: float = STAMINA_CONFIG["segment_value"]
	if segment_val <= 0.0:
		return 0
	return int(current_stamina / segment_val)


# ── Processing ───────────────────────────────────────────────────────────────

func process_system(delta: float) -> void:
	# Handle regen delay
	if regen_delay_timer > 0.0:
		regen_delay_timer -= delta
		return

	# Regenerate stamina
	var max_stam: float = get_max_stamina()
	if current_stamina < max_stam:
		var regen: float = get_regen_rate() * delta * STAMINA_CONFIG["in_combat_regen_multiplier"]
		current_stamina = minf(current_stamina + regen, max_stam)

		# Check exhaustion recovery
		if is_exhausted and current_stamina >= STAMINA_CONFIG["exhausted_threshold"]:
			is_exhausted = false
			stamina_recovered.emit(current_stamina)


# ── Private Helpers ──────────────────────────────────────────────────────────

func _check_exhaustion() -> void:
	if not is_exhausted and current_stamina <= STAMINA_CONFIG["exhausted_threshold"]:
		is_exhausted = true
		stamina_exhausted.emit(current_stamina)


# ── Signal Handlers ──────────────────────────────────────────────────────────

func _on_enemy_died(_enemy: Node) -> void:
	on_kill()


func _on_game_state_changed(old_state, new_state) -> void:
	on_state_changed(old_state, new_state)


func on_state_changed(_old_state, _new_state) -> void:
	pass
