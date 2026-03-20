class_name MagicConfig
extends Resource
## Magic element definitions: base damage, mana costs, cooldowns, and element-specific effects.

@export var magic_elements: Dictionary = {
	"fire": {
		"base_damage": 12.0,
		"mana_cost": 8.0,
		"cooldown": 1.0,
		"dot_damage": 3.0,
		"dot_duration": 4.0,
		"dot_tick_rate": 1.0,
		"status_effect": "burning",
		"description": "Deals damage over time with burning.",
	},
	"lightning": {
		"base_damage": 15.0,
		"mana_cost": 12.0,
		"cooldown": 1.5,
		"chain_count": 3,
		"chain_range": 64.0,
		"chain_damage_falloff": 0.7,
		"status_effect": "shocked",
		"description": "Chains between nearby enemies with damage falloff.",
	},
	"ice": {
		"base_damage": 8.0,
		"mana_cost": 10.0,
		"cooldown": 1.2,
		"slow_factor": 0.5,
		"slow_duration": 3.0,
		"freeze_chance": 0.15,
		"freeze_duration": 2.0,
		"status_effect": "chilled",
		"description": "Slows enemies and has a chance to freeze.",
	},
	"necromancy": {
		"base_damage": 10.0,
		"mana_cost": 15.0,
		"cooldown": 2.0,
		"life_steal_percent": 0.25,
		"summon_duration": 10.0,
		"max_summons": 2,
		"status_effect": "cursed",
		"description": "Drains life from enemies and can raise undead.",
	},
	"arcane": {
		"base_damage": 14.0,
		"mana_cost": 10.0,
		"cooldown": 0.8,
		"penetration": 0.3,
		"aoe_radius": 32.0,
		"status_effect": "",
		"description": "Pure magical damage that partially ignores resistance.",
	},
	"holy": {
		"base_damage": 10.0,
		"mana_cost": 12.0,
		"cooldown": 1.5,
		"heal_amount": 8.0,
		"undead_bonus_multiplier": 2.0,
		"purify_chance": 0.5,
		"status_effect": "blessed",
		"description": "Heals allies, deals bonus damage to undead, can purify debuffs.",
	},
	"dark": {
		"base_damage": 13.0,
		"mana_cost": 14.0,
		"cooldown": 1.8,
		"defense_reduction": 0.2,
		"defense_reduction_duration": 5.0,
		"fear_chance": 0.2,
		"fear_duration": 2.0,
		"status_effect": "weakened",
		"description": "Reduces enemy defenses and may cause fear.",
	},
	"death": {
		"base_damage": 20.0,
		"mana_cost": 20.0,
		"cooldown": 3.0,
		"execute_threshold": 0.15,
		"dot_damage": 5.0,
		"dot_duration": 6.0,
		"dot_tick_rate": 1.0,
		"status_effect": "doomed",
		"description": "Massive damage, executes low-HP targets, deals heavy DoT.",
	},
}


func get_element(element_name: String) -> Dictionary:
	return magic_elements.get(element_name, {})


func get_base_damage(element_name: String) -> float:
	return magic_elements.get(element_name, {}).get("base_damage", 0.0)


func get_mana_cost(element_name: String) -> float:
	return magic_elements.get(element_name, {}).get("mana_cost", 0.0)


func get_cooldown(element_name: String) -> float:
	return magic_elements.get(element_name, {}).get("cooldown", 1.0)
