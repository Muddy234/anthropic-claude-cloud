class_name WeaponData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""

@export_group("Classification")
@export var weapon_type: Constants.WeaponType = Constants.WeaponType.SWORD
@export var damage_type: Constants.DamageType = Constants.DamageType.BLADE
@export var rarity: Constants.Rarity = Constants.Rarity.COMMON
@export var slot: Constants.EquipSlot = Constants.EquipSlot.MAIN

@export_group("Combat Stats")
@export var damage: int = 0
@export var speed: float = 1.0                 # Attack speed multiplier
@export var range_tiles: float = 1.25

@export_group("Bonus Stats")
@export var str_bonus: int = 0
@export var agi_bonus: int = 0
@export var int_bonus: int = 0
@export var p_def_bonus: int = 0
@export var m_def_bonus: int = 0

@export_group("Special Properties")
@export var crit_bonus: float = 0.0
@export var execute_bonus: float = 0.0
@export var life_steal: float = 0.0
@export var armor_pen: float = 0.0
@export var stagger: float = 0.0
@export var bleed: float = 0.0
@export var reach: int = 0                     # Extra range in tiles
@export var noise_reduction: float = 0.0
@export var double_strike: float = 0.0
@export var silent: bool = false
@export var spell_echo: float = 0.0
@export var magic_pen: float = 0.0
@export var mana_regen: float = 0.0
@export var crit_dmg: float = 0.0              # Crit damage bonus

@export_group("Economy")
@export var gold_value: int = 0
