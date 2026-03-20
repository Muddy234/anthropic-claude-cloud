class_name RoomThemeData
extends Resource

@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var floor_range: Vector2i = Vector2i(1, 5)  # Min/max floors
@export var wall_color: Color = Color.WHITE
@export var floor_color: Color = Color.WHITE
@export var ambient_color: Color = Color.WHITE
@export var monster_types: PackedStringArray = []
@export var hazard_types: PackedStringArray = []
