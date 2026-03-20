class_name StaminaConfig
extends Resource
## Stamina system configuration: max values, action costs, regen, exhaustion, and refunds.

@export var max_stamina: float = 100.0

@export var costs: Dictionary = {
	"lightAttack": 10.0,
	"heavyAttack": 10.0,
	"dodge": 25.0,
	"dash": 15.0,
	"block": 5.0,
}

@export var regen_rate: float = 4.0  ## Stamina regenerated per second
@export var regen_delay: float = 0.0  ## Seconds after consumption before regen starts
@export var in_combat_regen_multiplier: float = 1.0  ## Multiplier on regen while in combat

@export var kill_refund: float = 25.0  ## Stamina refunded on enemy kill
@export var perfect_dodge_refund: float = 15.0  ## Stamina refunded on perfect dodge

@export var exhausted_threshold: float = 20.0  ## Stamina level that triggers exhaustion
@export var exhausted_speed_penalty: float = 0.7  ## Movement speed multiplier when exhausted

@export var segment_value: float = 20.0  ## Value of each stamina segment for UI display


func get_cost(action_type: String) -> float:
	return costs.get(action_type, 0.0)


func get_segment_count(current_stamina: float) -> int:
	if segment_value <= 0.0:
		return 0
	return int(current_stamina / segment_value)


func get_max_segments() -> int:
	if segment_value <= 0.0:
		return 0
	return int(max_stamina / segment_value)
