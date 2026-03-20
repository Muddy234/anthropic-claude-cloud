class_name MaterialData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""

@export_group("Classification")
@export var tier: int = 1
@export var rarity: Constants.Rarity = Constants.Rarity.COMMON

@export_group("Stacking")
@export var stackable: bool = true
@export var max_stack: int = 99

@export_group("Economy")
@export var sell_value: int = 0

@export_group("Drop Info")
@export var drop_floors: PackedInt32Array = []
@export var drop_chance: float = 0.0

@export_group("Usage")
@export var uses: PackedStringArray = []       # e.g. ["basic_weapons", "repairs"]
