class_name CoreConfigData
extends Resource

@export_group("Access")
@export var key_item: String = "core_key"
@export var min_level: int = 1
@export var guardians_defeated: int = 5

@export_group("Arena")
@export var arena_width: int = 40
@export var arena_height: int = 40
@export var tile_type: String = "void"
@export var ambient_light: float = 0.3
@export var fog_color: Color = Color("1a0a2a")

@export_group("Phases")
@export var phase_count: int = 3

@export_group("Rewards")
@export var reward_gold: int = 10000
@export var reward_materials: Dictionary = {}  # {id: count}
@export var unlocks: PackedStringArray = []
