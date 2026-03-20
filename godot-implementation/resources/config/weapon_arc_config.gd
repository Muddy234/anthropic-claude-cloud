class_name WeaponArcConfig
extends Resource
## Weapon arc geometry, range, and projectile data for all 11 weapon types.

@export var weapon_arcs: Dictionary = {
	"sword": {
		"arc_angle": 90.0,
		"arc_range": 40.0,
		"is_ranged": false,
		"slash_style": "horizontal",
		"projectile_speed": 0.0,
	},
	"knife": {
		"arc_angle": 60.0,
		"arc_range": 28.0,
		"is_ranged": false,
		"slash_style": "stab",
		"projectile_speed": 0.0,
	},
	"axe": {
		"arc_angle": 120.0,
		"arc_range": 44.0,
		"is_ranged": false,
		"slash_style": "overhead",
		"projectile_speed": 0.0,
	},
	"mace": {
		"arc_angle": 100.0,
		"arc_range": 38.0,
		"is_ranged": false,
		"slash_style": "overhead",
		"projectile_speed": 0.0,
	},
	"unarmed": {
		"arc_angle": 45.0,
		"arc_range": 24.0,
		"is_ranged": false,
		"slash_style": "jab",
		"projectile_speed": 0.0,
	},
	"polearm": {
		"arc_angle": 70.0,
		"arc_range": 56.0,
		"is_ranged": false,
		"slash_style": "thrust",
		"projectile_speed": 0.0,
	},
	"bow": {
		"arc_angle": 10.0,
		"arc_range": 160.0,
		"is_ranged": true,
		"slash_style": "none",
		"projectile_speed": 300.0,
	},
	"crossbow": {
		"arc_angle": 5.0,
		"arc_range": 200.0,
		"is_ranged": true,
		"slash_style": "none",
		"projectile_speed": 400.0,
	},
	"staff": {
		"arc_angle": 80.0,
		"arc_range": 36.0,
		"is_ranged": false,
		"slash_style": "sweep",
		"projectile_speed": 0.0,
	},
	"wand": {
		"arc_angle": 15.0,
		"arc_range": 120.0,
		"is_ranged": true,
		"slash_style": "none",
		"projectile_speed": 250.0,
	},
	"tome": {
		"arc_angle": 20.0,
		"arc_range": 100.0,
		"is_ranged": true,
		"slash_style": "none",
		"projectile_speed": 200.0,
	},
}


func get_arc(weapon_type: String) -> Dictionary:
	return weapon_arcs.get(weapon_type, weapon_arcs["sword"])


func is_ranged(weapon_type: String) -> bool:
	var arc: Dictionary = get_arc(weapon_type)
	return arc.get("is_ranged", false)


func get_range(weapon_type: String) -> float:
	var arc: Dictionary = get_arc(weapon_type)
	return arc.get("arc_range", 40.0)
