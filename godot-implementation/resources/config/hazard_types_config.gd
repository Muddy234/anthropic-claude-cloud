class_name HazardTypesConfig
extends Resource
## Lingering hazard zone type definitions: damage, timing, status effects, and elements.

@export var hazard_types: Dictionary = {
	"poison_cloud": {
		"damage": 3.0,
		"tick_interval": 1.0,
		"duration": 8.0,
		"status_effect": "poisoned",
		"element": "poison",
		"default_radius": 48.0,
		"default_shape": "cone",
	},
	"fire_patch": {
		"damage": 5.0,
		"tick_interval": 0.5,
		"duration": 6.0,
		"status_effect": "burning",
		"element": "fire",
		"default_radius": 32.0,
		"default_shape": "circle",
	},
	"ice_slick": {
		"damage": 0.0,
		"tick_interval": 0.5,
		"duration": 5.0,
		"status_effect": "chilled",
		"element": "ice",
		"default_radius": 40.0,
		"default_shape": "circle",
		"slow_factor": 0.5,
	},
	"void_zone": {
		"damage": 8.0,
		"tick_interval": 0.8,
		"duration": 4.0,
		"status_effect": "",
		"element": "shadow",
		"default_radius": 36.0,
		"default_shape": "circle",
	},
}


func get_hazard_type(type_name: String) -> Dictionary:
	return hazard_types.get(type_name, {})


func get_damage(type_name: String) -> float:
	return hazard_types.get(type_name, {}).get("damage", 0.0)


func get_duration(type_name: String) -> float:
	return hazard_types.get(type_name, {}).get("duration", 5.0)


func get_element(type_name: String) -> String:
	return hazard_types.get(type_name, {}).get("element", "")


func get_status_effect(type_name: String) -> String:
	return hazard_types.get(type_name, {}).get("status_effect", "")


func get_all_type_names() -> Array[String]:
	var names: Array[String] = []
	for key in hazard_types.keys():
		names.append(key)
	return names
