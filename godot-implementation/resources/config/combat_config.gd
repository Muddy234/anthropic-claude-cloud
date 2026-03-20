class_name CombatConfig
extends Resource
## Core combat configuration values: timing, ambush rules, weapon speeds, XP rewards.

# ── Base Timing ──────────────────────────────────────────────────────────────
@export var base_attack_time: int = 440  ## Default attack time in ms
@export var engage_delay: float = 0.4  ## Seconds before combat officially starts
@export var combat_disengage_time: float = 30.0  ## Seconds of no combat before disengaging

# ── Ambush ───────────────────────────────────────────────────────────────────
@export var ambush_damage_multiplier: float = 1.5
@export var ambush_guaranteed_crit: bool = true
@export var ambush_side_angle: float = 60.0  ## Degrees from behind that count as "side" ambush

@export var ambush_unaware_states: Array[String] = [
	"idle",
	"patrol",
	"sleeping",
	"eating",
	"talking",
]

# ── Weapon Attack Times (ms) ────────────────────────────────────────────────
@export var weapon_attack_times: Dictionary = {
	"sword": 440,
	"knife": 320,
	"axe": 560,
	"mace": 600,
	"unarmed": 380,
	"polearm": 520,
	"bow": 700,
	"crossbow": 900,
	"staff": 480,
	"wand": 400,
	"tome": 500,
}

# ── XP Rewards ───────────────────────────────────────────────────────────────
@export var xp_rewards: Dictionary = {
	"tier_1": 10,
	"tier_2": 25,
	"tier_3": 50,
	"tier_4": 100,
	"tier_5": 200,
	"boss": 500,
	"mini_boss": 250,
}
