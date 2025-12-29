@tool
class_name ItemData
extends Resource

## Base resource for all items in the game

@export var id: String
@export var name: String
@export_multiline var description: String
@export var icon: Texture2D

@export_group("Type & Rarity")
@export_enum("weapon", "armor", "helmet", "boots", "accessory", "consumable", "material", "quest", "currency") var type: String = "material"
@export var rarity: Constants.Rarity = Constants.Rarity.COMMON
@export var is_stackable: bool = false
@export var max_stack: int = 99
var stack_count: int = 1

@export_group("Value")
@export var buy_price: int = 0
@export var sell_price: int = 0

@export_group("Requirements")
@export var required_level: int = 1
@export var required_stats: Dictionary = {}  # {"STR": 10, "DEX": 5}

@export_group("Equipment Stats")
## For weapons
@export var damage_min: int = 0
@export var damage_max: int = 0
@export var damage_type: Constants.DamageType = Constants.DamageType.PHYSICAL
@export var weapon_type: Constants.WeaponDamageType = Constants.WeaponDamageType.BLADE
@export var attack_speed: float = 1.0
@export var attack_range: int = 1
@export var crit_bonus: float = 0.0

## For armor
@export var defense: int = 0
@export var resistances: Dictionary = {}  # {DamageType: float}

## For accessories
@export var stat_bonuses: Dictionary = {}  # {"STR": 5, "max_hp": 20}

@export_group("Special Effects")
@export var bleed_chance: float = 0.0
@export var stun_chance: float = 0.0
@export var element: Constants.DamageType = Constants.DamageType.PHYSICAL
@export var element_power: int = 0
@export var on_hit_effects: Array[Resource] = []  # EffectData
@export var passive_effects: Array[Resource] = []  # EffectData

@export_group("Consumable")
@export var heal_amount: int = 0
@export var mana_restore: int = 0
@export var buff_effect: Resource  # EffectData
@export var buff_duration: float = 0.0

## Get the value for selling
func get_sell_value() -> int:
	if sell_price > 0:
		return sell_price
	return int(buy_price * 0.5)

## Check if player meets requirements
func meets_requirements(player) -> bool:
	if player.level < required_level:
		return false

	for stat in required_stats:
		var required: int = required_stats[stat]
		var current: int = player.stats.get(stat, 0)
		if current < required:
			return false

	return true

## Get formatted stat text for tooltips
func get_stat_text() -> String:
	var lines := []

	match type:
		"weapon":
			lines.append("Damage: %d-%d" % [damage_min, damage_max])
			if element != Constants.DamageType.PHYSICAL:
				lines.append("Element: %s" % Constants.DamageType.keys()[element])
			if attack_speed != 1.0:
				lines.append("Speed: %.1f" % attack_speed)
			if crit_bonus > 0:
				lines.append("Crit: +%.0f%%" % (crit_bonus * 100))

		"armor", "helmet", "boots":
			if defense > 0:
				lines.append("Defense: %d" % defense)
			for res_type in resistances:
				lines.append("%s Resist: %.0f%%" % [
					Constants.DamageType.keys()[res_type],
					resistances[res_type] * 100
				])

		"accessory":
			for stat in stat_bonuses:
				var value: int = stat_bonuses[stat]
				lines.append("%s: %+d" % [stat, value])

		"consumable":
			if heal_amount > 0:
				lines.append("Heals %d HP" % heal_amount)
			if mana_restore > 0:
				lines.append("Restores %d MP" % mana_restore)

	return "\n".join(lines)

## Get rarity color
func get_rarity_color() -> Color:
	return Constants.get_rarity_color(rarity)

## Create a duplicate for inventory
func create_instance(count: int = 1) -> ItemData:
	var instance := duplicate() as ItemData
	instance.stack_count = count
	return instance
