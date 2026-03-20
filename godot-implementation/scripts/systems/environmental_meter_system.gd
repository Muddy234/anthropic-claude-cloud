class_name EnvironmentalMeterSystem
extends BaseSystem
## Temperature/corruption/instability meters: floor-based base values,
## area modifiers, threshold effects, gradual change over time.

# --- Meter types ---
const METER_DEFS: Dictionary = {
	"warmth": {
		"start_value": 100.0,
		"min_value": 0.0,
		"max_value": 100.0,
		"base_drain": 1.0,     # per second
		"base_regen": 0.0,
		"thresholds": [
			{"value": 30.0, "direction": "below", "effects": [{"type": "speed_mod", "value": 0.9}]},
			{"value": 15.0, "direction": "below", "effects": [{"type": "speed_mod", "value": 0.75}, {"type": "visual", "value": "frost_overlay"}]},
			{"value": 0.0,  "direction": "at",    "effects": [{"type": "dot", "value": 5.0, "element": "ice"}]},
		],
	},
	"infection": {
		"start_value": 0.0,
		"min_value": 0.0,
		"max_value": 100.0,
		"base_drain": 0.0,
		"base_regen": 0.0,     # Increases from specific sources
		"thresholds": [
			{"value": 60.0,  "direction": "above", "effects": [{"type": "damage_mod", "value": 1.2}]},
			{"value": 90.0,  "direction": "above", "effects": [{"type": "light_sensitivity", "value": true}]},
			{"value": 100.0, "direction": "at",    "effects": [{"type": "game_over", "value": true}]},
		],
	},
	"sanity": {
		"start_value": 100.0,
		"min_value": 0.0,
		"max_value": 100.0,
		"base_drain": 0.0,
		"base_regen": 0.0,
		"thresholds": [],  # Future use
	},
	"corruption": {
		"start_value": 0.0,
		"min_value": 0.0,
		"max_value": 100.0,
		"base_drain": 0.0,
		"base_regen": -0.5,   # Decays at 0.5/s naturally
		"thresholds": [
			{"value": 25.0, "direction": "above", "effects": [{"type": "visual", "value": "whispers"}]},
			{"value": 50.0, "direction": "above", "effects": [{"type": "vision_mod", "value": "void_sight"}]},
			{"value": 75.0, "direction": "above", "effects": [{"type": "transform", "value": "void_form"}]},
			{"value": 100.0,"direction": "at",    "effects": [{"type": "game_over", "value": true}]},
		],
	},
	"oxygen": {
		"start_value": 100.0,
		"min_value": 0.0,
		"max_value": 100.0,
		"base_drain": 0.0,
		"base_regen": 0.0,
		"thresholds": [],  # Future use
	},
}

# --- Modifier class ---
class MeterModifier:
	var id: String = ""
	var drain_modifier: float = 0.0     # Additive drain change
	var regen_modifier: float = 0.0     # Additive regen change
	var drain_multiplier: float = 1.0   # Multiplicative drain
	var regen_multiplier: float = 1.0   # Multiplicative regen
	var duration: float = -1.0          # -1 = permanent
	var _elapsed: float = 0.0

# --- State ---
var meters: Dictionary = {}              # meter_type -> float (current value)
var _modifiers: Dictionary = {}          # meter_type -> Array[MeterModifier]
var _active_thresholds: Dictionary = {}  # meter_type -> Array[int] (indices of crossed thresholds)
var _applied_effects: Dictionary = {}    # meter_type -> Dictionary of applied effect data


func _init() -> void:
	system_name = "environmental-meter-system"
	priority = 37


func initialize() -> void:
	_reset_all_meters()


func process_system(delta: float) -> void:
	if GameManager.current_state != Constants.GameState.PLAYING and \
	   GameManager.current_state != Constants.GameState.COMBAT:
		return

	for meter_type in METER_DEFS:
		_update_meter(meter_type, delta)
		_check_thresholds(meter_type)

	_update_modifiers(delta)
	_apply_player_effects()


func cleanup() -> void:
	_reset_all_meters()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func get_meter_value(meter_type: String) -> float:
	return meters.get(meter_type, 0.0)


func get_meter_percent(meter_type: String) -> float:
	var def: Dictionary = METER_DEFS.get(meter_type, {})
	var max_val: float = def.get("max_value", 100.0)
	if max_val <= 0.0:
		return 0.0
	return meters.get(meter_type, 0.0) / max_val


func get_meter_max(meter_type: String) -> float:
	return METER_DEFS.get(meter_type, {}).get("max_value", 100.0)


func set_meter_value(meter_type: String, value: float) -> void:
	var def: Dictionary = METER_DEFS.get(meter_type, {})
	var min_val: float = def.get("min_value", 0.0)
	var max_val: float = def.get("max_value", 100.0)
	meters[meter_type] = clampf(value, min_val, max_val)


func modify_meter(meter_type: String, amount: float) -> void:
	## Directly changes a meter value by amount (positive = increase).
	var current: float = meters.get(meter_type, 0.0)
	set_meter_value(meter_type, current + amount)


func add_modifier(meter_type: String, modifier: MeterModifier) -> void:
	if not _modifiers.has(meter_type):
		_modifiers[meter_type] = []
	# Remove existing with same ID
	remove_modifier(meter_type, modifier.id)
	_modifiers[meter_type].append(modifier)


func remove_modifier(meter_type: String, modifier_id: String) -> void:
	if not _modifiers.has(meter_type):
		return
	var mods: Array = _modifiers[meter_type]
	for i in range(mods.size() - 1, -1, -1):
		if mods[i].id == modifier_id:
			mods.remove_at(i)


func get_effective_drain_rate(meter_type: String) -> float:
	var def: Dictionary = METER_DEFS.get(meter_type, {})
	var base_drain: float = def.get("base_drain", 0.0)
	var additive := 0.0
	var multiplicative := 1.0
	if _modifiers.has(meter_type):
		for mod in _modifiers[meter_type]:
			additive += mod.drain_modifier
			multiplicative *= mod.drain_multiplier
	return (base_drain + additive) * multiplicative


func get_effective_regen_rate(meter_type: String) -> float:
	var def: Dictionary = METER_DEFS.get(meter_type, {})
	var base_regen: float = def.get("base_regen", 0.0)
	var additive := 0.0
	var multiplicative := 1.0
	if _modifiers.has(meter_type):
		for mod in _modifiers[meter_type]:
			additive += mod.regen_modifier
			multiplicative *= mod.regen_multiplier
	return (base_regen + additive) * multiplicative


func is_meter_critical(meter_type: String) -> bool:
	## Returns true if meter has crossed its most severe threshold.
	var def: Dictionary = METER_DEFS.get(meter_type, {})
	var thresholds: Array = def.get("thresholds", [])
	if thresholds.is_empty():
		return false
	var last := thresholds[thresholds.size() - 1]
	var value: float = meters.get(meter_type, 0.0)
	match last.get("direction", ""):
		"above", "at":
			return value >= last.get("value", 100.0)
		"below":
			return value <= last.get("value", 0.0)
	return false


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _reset_all_meters() -> void:
	meters.clear()
	_modifiers.clear()
	_active_thresholds.clear()
	_applied_effects.clear()
	for meter_type in METER_DEFS:
		meters[meter_type] = METER_DEFS[meter_type].get("start_value", 0.0)
		_modifiers[meter_type] = []
		_active_thresholds[meter_type] = []
		_applied_effects[meter_type] = {}


func _update_meter(meter_type: String, delta: float) -> void:
	var def: Dictionary = METER_DEFS.get(meter_type, {})
	var drain := get_effective_drain_rate(meter_type)
	var regen := get_effective_regen_rate(meter_type)
	var net_change := (regen - drain) * delta

	if net_change == 0.0:
		return

	var current: float = meters.get(meter_type, 0.0)
	var min_val: float = def.get("min_value", 0.0)
	var max_val: float = def.get("max_value", 100.0)
	meters[meter_type] = clampf(current + net_change, min_val, max_val)


func _update_modifiers(delta: float) -> void:
	for meter_type in _modifiers:
		var mods: Array = _modifiers[meter_type]
		var i := mods.size() - 1
		while i >= 0:
			var mod: MeterModifier = mods[i]
			if mod.duration > 0.0:
				mod._elapsed += delta
				if mod._elapsed >= mod.duration:
					mods.remove_at(i)
			i -= 1


func _check_thresholds(meter_type: String) -> void:
	var def: Dictionary = METER_DEFS.get(meter_type, {})
	var thresholds: Array = def.get("thresholds", [])
	var value: float = meters.get(meter_type, 0.0)
	var active: Array = _active_thresholds.get(meter_type, [])

	for i in range(thresholds.size()):
		var threshold: Dictionary = thresholds[i]
		var thresh_val: float = threshold.get("value", 0.0)
		var direction: String = threshold.get("direction", "above")
		var is_crossed := false

		match direction:
			"above":
				is_crossed = value >= thresh_val
			"below":
				is_crossed = value <= thresh_val
			"at":
				is_crossed = is_equal_approx(value, thresh_val) or \
					(direction == "at" and ((thresh_val == 0.0 and value <= 0.0) or (thresh_val >= 100.0 and value >= 100.0)))

		var was_active := i in active
		if is_crossed and not was_active:
			active.append(i)
		elif not is_crossed and was_active:
			active.erase(i)

	_active_thresholds[meter_type] = active


func _apply_player_effects() -> void:
	if not GameManager.player:
		return

	var player: Node = GameManager.player
	var speed_mod := 1.0
	var damage_mod := 1.0
	var dot_damage := 0.0
	var dot_element := "physical"

	for meter_type in METER_DEFS:
		var thresholds: Array = METER_DEFS[meter_type].get("thresholds", [])
		var active_indices: Array = _active_thresholds.get(meter_type, [])

		for idx in active_indices:
			if idx < 0 or idx >= thresholds.size():
				continue
			var threshold: Dictionary = thresholds[idx]
			var effects: Array = threshold.get("effects", [])
			for effect in effects:
				var eff_type: String = effect.get("type", "")
				match eff_type:
					"speed_mod":
						speed_mod = minf(speed_mod, effect.get("value", 1.0))
					"damage_mod":
						damage_mod = maxf(damage_mod, effect.get("value", 1.0))
					"dot":
						dot_damage = maxf(dot_damage, effect.get("value", 0.0))
						dot_element = effect.get("element", "physical")
					"light_sensitivity":
						if player.get("light_sensitivity") != null:
							player.light_sensitivity = effect.get("value", false)
					"game_over":
						# Trigger death via environmental hazard
						if player.has_method("take_damage"):
							player.take_damage(9999, null, "environment")

	# Apply aggregated effects
	if player.get("environmental_speed_mod") != null:
		player.environmental_speed_mod = speed_mod
	if player.get("environmental_damage_mod") != null:
		player.environmental_damage_mod = damage_mod

	# Apply DOT (once per process_system call)
	if dot_damage > 0.0 and player.has_method("take_damage"):
		# Scale by delta would be better but we're called per-frame
		# This gets handled by the tick_interval in the calling pattern
		pass  # DOT is applied via survival_integration's tick system
