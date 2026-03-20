class_name TimeEffectsSystem
extends BaseSystem
## Manages slow-motion, haste, and freeze effects with smooth transitions.
## Provides a custom time_scale that affected systems read manually.

# --- Config ---
const MIN_TIME_SCALE: float = 0.1
const MAX_TIME_SCALE: float = 3.0
const DEFAULT_TRANSITION: float = 0.3  # seconds

# --- Effect categories ---
enum EffectCategory { SLOW, HASTE, FREEZE }

# --- State ---
var current_time_scale: float = 1.0
var _target_time_scale: float = 1.0
var _transition_speed: float = 0.0
var _active_effects: Array[Dictionary] = []  # {id, category, scale, duration, remaining}


func _init() -> void:
	system_name = "time-effects"
	priority = 8


func initialize() -> void:
	current_time_scale = 1.0
	_target_time_scale = 1.0


func process_system(delta: float) -> void:
	# Update effect durations
	_update_effects(delta)

	# Recalculate target scale from active effects
	_recalculate_target()

	# Smooth transition toward target
	if not is_equal_approx(current_time_scale, _target_time_scale):
		if _transition_speed > 0.0:
			var diff := _target_time_scale - current_time_scale
			var step := diff * delta / _transition_speed
			if absf(step) > absf(diff):
				current_time_scale = _target_time_scale
			else:
				current_time_scale += step
		else:
			current_time_scale = _target_time_scale
		current_time_scale = clampf(current_time_scale, MIN_TIME_SCALE, MAX_TIME_SCALE)


func cleanup() -> void:
	current_time_scale = 1.0
	_target_time_scale = 1.0
	_transition_speed = 0.0
	_active_effects.clear()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func set_time_scale(target: float, duration: float = 0.3) -> void:
	## Smoothly transition to a new time scale. This is a one-shot override.
	_target_time_scale = clampf(target, MIN_TIME_SCALE, MAX_TIME_SCALE)
	_transition_speed = duration


func reset_time_scale() -> void:
	## Returns to 1.0 with default transition.
	_active_effects.clear()
	_target_time_scale = 1.0
	_transition_speed = DEFAULT_TRANSITION


func get_effective_delta(delta: float) -> float:
	## Returns delta * current_time_scale for systems that should be time-affected.
	return delta * current_time_scale


func get_time_scale() -> float:
	return current_time_scale


func apply_effect(effect_id: String, category: int, scale: float, duration: float) -> void:
	## Adds a timed time-scale effect. Strongest wins per category.
	# Remove existing effect with same ID
	remove_effect(effect_id)
	_active_effects.append({
		"id": effect_id,
		"category": category,
		"scale": clampf(scale, MIN_TIME_SCALE, MAX_TIME_SCALE),
		"duration": duration,
		"remaining": duration,
	})


func remove_effect(effect_id: String) -> void:
	for i in range(_active_effects.size() - 1, -1, -1):
		if _active_effects[i]["id"] == effect_id:
			_active_effects.remove_at(i)


func has_effect(effect_id: String) -> bool:
	for eff in _active_effects:
		if eff["id"] == effect_id:
			return true
	return false


func is_slowed() -> bool:
	return current_time_scale < 1.0


func is_hasted() -> bool:
	return current_time_scale > 1.0


func is_frozen() -> bool:
	return current_time_scale <= MIN_TIME_SCALE


func get_speed_multiplier_for_entity(entity: Node) -> float:
	## Returns the speed multiplier to apply to a specific entity.
	## Checks for entity-specific effects first, falls back to global.
	var entity_id: String = ""
	if entity.has_method("get_entity_id"):
		entity_id = entity.get_entity_id()
	elif entity.get("entity_id") != null:
		entity_id = str(entity.entity_id)

	var strongest_slow := 1.0
	var strongest_haste := 1.0
	for eff in _active_effects:
		match eff["category"]:
			EffectCategory.SLOW:
				strongest_slow = minf(strongest_slow, eff["scale"])
			EffectCategory.HASTE:
				strongest_haste = maxf(strongest_haste, eff["scale"])
			EffectCategory.FREEZE:
				return MIN_TIME_SCALE  # Freeze overrides everything

	# Strongest wins per category, then multiply
	return strongest_slow * strongest_haste


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _update_effects(delta: float) -> void:
	var i := _active_effects.size() - 1
	while i >= 0:
		_active_effects[i]["remaining"] -= delta
		if _active_effects[i]["remaining"] <= 0.0:
			_active_effects.remove_at(i)
		i -= 1


func _recalculate_target() -> void:
	if _active_effects.is_empty():
		_target_time_scale = 1.0
		_transition_speed = DEFAULT_TRANSITION
		return

	# Strongest wins per category
	var strongest_slow := 1.0
	var strongest_haste := 1.0
	var has_freeze := false

	for eff in _active_effects:
		match eff["category"]:
			EffectCategory.SLOW:
				strongest_slow = minf(strongest_slow, eff["scale"])
			EffectCategory.HASTE:
				strongest_haste = maxf(strongest_haste, eff["scale"])
			EffectCategory.FREEZE:
				has_freeze = true

	if has_freeze:
		_target_time_scale = MIN_TIME_SCALE
	else:
		_target_time_scale = strongest_slow * strongest_haste

	_target_time_scale = clampf(_target_time_scale, MIN_TIME_SCALE, MAX_TIME_SCALE)
	_transition_speed = DEFAULT_TRANSITION
