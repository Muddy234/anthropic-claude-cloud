class_name KillStreakConfig
extends Resource
## Kill streak tier definitions, bonus multipliers, and decay settings.

@export var tiers: Array[Dictionary] = [
	{"kills": 2,  "name": "Double Kill",   "color": Color("#c0c0c0")},
	{"kills": 4,  "name": "Killing Spree", "color": Color("#4a9eff")},
	{"kills": 6,  "name": "Rampage",       "color": Color("#9b4dca")},
	{"kills": 8,  "name": "Unstoppable",   "color": Color("#ff6b35")},
	{"kills": 10, "name": "Godlike",       "color": Color("#ffd700")},
]

@export var tier_bonuses: Dictionary = {
	0: 1.0,
	1: 1.1,
	2: 1.25,
	3: 1.5,
	4: 2.0,
	5: 3.0,
}

@export var decay_time: float = 5.0  ## Seconds between decay ticks
@export var decay_per_tick: int = 1  ## Kills lost per decay tick
@export var reset_on_damage: bool = true  ## Whether taking damage resets the streak


func get_tier_for_kills(kill_count: int) -> int:
	var tier: int = 0
	for i in range(tiers.size()):
		if kill_count >= tiers[i]["kills"]:
			tier = i + 1
	return tier


func get_tier_name(tier: int) -> String:
	if tier <= 0 or tier > tiers.size():
		return ""
	return tiers[tier - 1]["name"]


func get_tier_color(tier: int) -> Color:
	if tier <= 0 or tier > tiers.size():
		return Color.WHITE
	return tiers[tier - 1]["color"]


func get_bonus_multiplier(tier: int) -> float:
	return tier_bonuses.get(tier, 1.0)


func get_next_tier_kills(current_kills: int) -> int:
	for tier_data in tiers:
		if current_kills < tier_data["kills"]:
			return tier_data["kills"]
	return -1  # Already at max tier
