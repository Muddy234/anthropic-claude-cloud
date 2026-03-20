class_name ArmorPieceData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""

@export_group("Classification")
@export var slot: Constants.EquipSlot = Constants.EquipSlot.HEAD
@export var armor_type: Constants.ArmorType = Constants.ArmorType.CLOTH
@export var rarity: Constants.Rarity = Constants.Rarity.COMMON

@export_group("Stats")
@export var defense: int = 0
@export var hp_bonus: int = 0
@export var str_bonus: int = 0
@export var agi_bonus: int = 0
@export var int_bonus: int = 0
@export var p_def_bonus: int = 0
@export var m_def_bonus: int = 0

@export_group("Special Properties")
@export var special: Dictionary = {}           # e.g. {"fireResist": 0.1}
@export var element: Constants.Element = Constants.Element.NONE

@export_group("Economy")
@export var gold_value: int = 0
