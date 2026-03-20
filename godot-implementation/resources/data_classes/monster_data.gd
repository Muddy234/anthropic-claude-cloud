class_name MonsterData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""

@export_group("Base Stats")
@export var hp: int = 0
@export var str_stat: int = 0              # 'str' is reserved in some contexts
@export var agi: int = 0
@export var int_stat: int = 0              # 'int' is a type name
@export var p_def: int = 0
@export var m_def: int = 0
@export var xp: int = 0

@export_group("Combat")
@export var element: Constants.Element = Constants.Element.PHYSICAL
@export var attack_name: String = ""       # Display name of default attack
@export var attack_type: Constants.AttackType = Constants.AttackType.PHYSICAL
@export var damage_type: Constants.DamageType = Constants.DamageType.BLUNT
@export var attack_range: float = 1.0      # Tiles
@export var attack_speed: float = 2.0      # Seconds between attacks
@export var armor_type: Constants.ArmorType = Constants.ArmorType.UNARMORED

@export_group("Behavior")
@export var elite: bool = false
@export var move_interval: float = 2.0     # Seconds between movements
@export var aggression: int = 2            # 1-5 scale
@export var spawn_weight: int = 10         # Higher = more common

@export_group("Loot")
@export var loot: Array[LootEntryData] = []
