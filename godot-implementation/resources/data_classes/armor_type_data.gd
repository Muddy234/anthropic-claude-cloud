class_name ArmorTypeData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var armor_type: Constants.ArmorType = Constants.ArmorType.UNARMORED

@export_group("Weaknesses & Resistances")
@export var weak_to: Array[Constants.DamageType] = []
@export var resistant_to: Array[Constants.DamageType] = []

@export_group("Usage")
@export var player_wearable: bool = false
@export var monster_only: bool = false
@export var defensive_role: String = ""

@export_group("Modifiers")
@export var defense_modifier: float = 0.0      # 0.0 - 1.1
@export var hp_tier_modifier: float = 0.0      # 0.0 - 1.0

@export_group("Stat Allocation (player armor)")
@export var primary_stat: String = ""          # 'str', 'agi', 'int'
@export var secondary_stat: String = ""
