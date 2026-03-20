class_name ShieldData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""

@export_group("Classification")
@export var rarity: Constants.Rarity = Constants.Rarity.COMMON

@export_group("Stats")
@export var defense: int = 0
@export var hp_bonus: int = 0
@export var str_bonus: int = 0
@export var agi_bonus: int = 0
@export var int_bonus: int = 0
@export var p_def_bonus: int = 0

@export_group("Special Properties")
@export var special: Dictionary = {}
@export var block_chance: float = 0.0
@export var block_reduction: float = 0.0

@export_group("Economy")
@export var gold_value: int = 0
