class_name ShiftBonusSystem
extends BaseSystem
## Query interface for shift-active multipliers. When a shift (meltdown) is
## active, various bonuses apply to drops, XP, damage, and movement.

# ---------------------------------------------------------------------------
# Bonus type enum
# ---------------------------------------------------------------------------

enum BonusType {
	EPIC_DROPS,
	RARE_DROPS,
	GOLD_DROPS,
	POTION_DROPS,
	XP_GAIN,
	DAMAGE_DEALT,
	DAMAGE_TAKEN,
	MOVE_SPEED,
	HEALTH_REGEN,
	STAMINA_REGEN,
	LIFESTEAL,
	SPECIAL_VISION,
	BANISH_CHANCE,
}

# ---------------------------------------------------------------------------
# Bonus definition per scenario
# ---------------------------------------------------------------------------

const SCENARIO_BONUSES: Dictionary = {
	"magma_collapse": {
		"EPIC_DROPS": 2.0,
		"RARE_DROPS": 1.5,
		"GOLD_DROPS": 1.5,
		"POTION_DROPS": 1.3,
		"XP_GAIN": 2.0,
		"DAMAGE_DEALT": 1.25,
		"DAMAGE_TAKEN": 1.5,
		"MOVE_SPEED": 1.1,
		"HEALTH_REGEN": 0.0,
		"STAMINA_REGEN": 1.2,
		"LIFESTEAL": 0.05,
		"SPECIAL_VISION": 1.0,
		"BANISH_CHANCE": 0.0,
	},
}

# Shift surfer bonus: extra multiplier for entities that were moving when shift triggered
const SHIFT_SURFER_MULTIPLIER: float = 1.5
const SHIFT_SURFER_DURATION: float = 30.0

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

var _active_scenario: String = ""
var _shift_surfer_active: bool = false
var _shift_surfer_timer: float = 0.0
var _bonus_tier: int = 0  # Based on shift intensity; 0 = base, 1+ = enhanced
var _custom_bonuses: Dictionary = {}  # String -> float overrides

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "shift_bonus_system"
	priority = 5


func initialize() -> void:
	EventBus.hazard_created.connect(_on_hazard_created)


func process_system(delta: float) -> void:
	if _shift_surfer_active:
		_shift_surfer_timer -= delta
		if _shift_surfer_timer <= 0.0:
			_shift_surfer_active = false
			_shift_surfer_timer = 0.0


func cleanup() -> void:
	_active_scenario = ""
	_shift_surfer_active = false
	_shift_surfer_timer = 0.0
	_bonus_tier = 0
	_custom_bonuses.clear()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Get the multiplier for a given bonus type. Returns 1.0 if no shift active.
func get_multiplier(bonus_type: String) -> float:
	if _active_scenario.is_empty():
		return 1.0

	var bonuses: Dictionary = SCENARIO_BONUSES.get(_active_scenario, {})
	var base_mult: float = bonuses.get(bonus_type, 1.0)

	# Apply bonus tier scaling (+10% per tier)
	if _bonus_tier > 0 and base_mult > 1.0:
		var tier_bonus: float = (base_mult - 1.0) * _bonus_tier * 0.1
		base_mult += tier_bonus

	# Apply shift surfer bonus to positive multipliers
	if _shift_surfer_active and base_mult > 1.0:
		base_mult *= SHIFT_SURFER_MULTIPLIER

	# Apply custom overrides
	if _custom_bonuses.has(bonus_type):
		base_mult *= _custom_bonuses[bonus_type]

	return base_mult


## Whether a specific bonus is active (multiplier > 1.0).
func is_active(bonus_type: String) -> bool:
	return get_multiplier(bonus_type) > 1.0


## Get all active bonuses as an array of dictionaries for UI.
func get_active_bonuses() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	if _active_scenario.is_empty():
		return result

	var bonuses: Dictionary = SCENARIO_BONUSES.get(_active_scenario, {})
	for key in bonuses:
		var mult: float = get_multiplier(key)
		if mult != 1.0:
			result.append({
				"type": key,
				"multiplier": mult,
				"is_positive": mult > 1.0,
			})

	return result


## Apply shift bonuses to rarity weight tables.
## weights: Dictionary of rarity_name -> float weight
func apply_to_rarity_weights(weights: Dictionary) -> Dictionary:
	var modified: Dictionary = weights.duplicate()

	var epic_mult: float = get_multiplier("EPIC_DROPS")
	var rare_mult: float = get_multiplier("RARE_DROPS")

	if modified.has("epic"):
		modified["epic"] = modified["epic"] * epic_mult
	if modified.has("legendary"):
		modified["legendary"] = modified.get("legendary", 0.0) * epic_mult
	if modified.has("rare"):
		modified["rare"] = modified["rare"] * rare_mult

	return modified


## Activate shift surfer bonus (called when player was moving during trigger).
func activate_shift_surfer() -> void:
	_shift_surfer_active = true
	_shift_surfer_timer = SHIFT_SURFER_DURATION


## Set the active scenario (typically called by ShiftSystem).
func set_active_scenario(scenario_id: String) -> void:
	_active_scenario = scenario_id


## Clear active scenario.
func clear_scenario() -> void:
	_active_scenario = ""
	_shift_surfer_active = false
	_shift_surfer_timer = 0.0


## Set bonus tier based on shift intensity (floor depth).
func set_bonus_tier(tier: int) -> void:
	_bonus_tier = maxi(0, tier)


## Add a custom bonus override multiplier.
func add_custom_bonus(bonus_type: String, multiplier: float) -> void:
	_custom_bonuses[bonus_type] = multiplier


## Remove a custom bonus override.
func remove_custom_bonus(bonus_type: String) -> void:
	_custom_bonuses.erase(bonus_type)


## Whether shift surfer is currently active.
func is_shift_surfer_active() -> bool:
	return _shift_surfer_active


# ---------------------------------------------------------------------------
# Signal handlers
# ---------------------------------------------------------------------------

func _on_hazard_created(_position: Vector2, hazard_type: String, _damage: float) -> void:
	# Detect shift activation from the hazard type convention
	if hazard_type == "shift_exit":
		set_active_scenario("magma_collapse")
		# Check if player was moving when shift triggered
		if GameManager.player != null:
			if GameManager.player.has_method("is_moving") and GameManager.player.is_moving():
				activate_shift_surfer()
