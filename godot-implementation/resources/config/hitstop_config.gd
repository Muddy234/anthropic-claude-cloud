class_name HitstopConfig
extends Resource
## Hitstop (hit-freeze) configuration: weapon weights, multipliers, and caps.

# ── Weight Classes (base hitstop duration in ms) ─────────────────────────────
@export var weight_classes: Dictionary = {
	"light": 30,
	"medium": 50,
	"heavy": 100,
}

# ── Weapon-to-Weight Mapping ─────────────────────────────────────────────────
@export var weapon_weights: Dictionary = {
	"knife": "light",
	"wand": "light",
	"unarmed": "light",
	"sword": "medium",
	"staff": "medium",
	"tome": "medium",
	"bow": "medium",
	"polearm": "medium",
	"axe": "heavy",
	"mace": "heavy",
	"crossbow": "heavy",
}

# ── Multipliers ──────────────────────────────────────────────────────────────
@export var multipliers: Dictionary = {
	"combo_finisher": 1.5,
	"critical": 2.0,
	"ambush": 1.3,
	"killing": 2.5,
}

# ── Caps & Thresholds ────────────────────────────────────────────────────────
@export var max_duration_ms: int = 250  ## Absolute maximum hitstop in ms
@export var shake_threshold_ms: int = 80  ## Hitstop above this triggers screen shake
@export var slow_threshold_ms: int = 150  ## Hitstop above this triggers time slow


func get_base_duration(weapon_type: String) -> int:
	var weight: String = weapon_weights.get(weapon_type, "medium")
	return weight_classes.get(weight, 50)


func get_weight_class(weapon_type: String) -> String:
	return weapon_weights.get(weapon_type, "medium")


func calculate_hitstop(weapon_type: String, hit_flags: Dictionary = {}) -> int:
	## Calculate final hitstop duration given weapon type and hit context flags.
	## hit_flags may contain: combo_finisher, critical, ambush, killing (all bool).
	var base: int = get_base_duration(weapon_type)
	var total_multiplier: float = 1.0

	for flag_name in hit_flags:
		if hit_flags[flag_name] and multipliers.has(flag_name):
			total_multiplier *= multipliers[flag_name]

	var result: int = int(base * total_multiplier)
	return mini(result, max_duration_ms)


func should_screen_shake(duration_ms: int) -> bool:
	return duration_ms >= shake_threshold_ms


func should_time_slow(duration_ms: int) -> bool:
	return duration_ms >= slow_threshold_ms
