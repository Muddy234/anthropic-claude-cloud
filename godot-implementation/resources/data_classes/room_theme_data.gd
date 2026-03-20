class_name RoomThemeData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""

@export_group("Floor Range")
@export var floor_range: Vector2i = Vector2i(1, 5)  # Min/max floors

@export_group("Element")
@export var element: Constants.Element = Constants.Element.NONE

@export_group("Colors")
@export var floor_color: Color = Color.WHITE
@export var wall_color: Color = Color.WHITE
@export var accent_color: Color = Color.WHITE
@export var ambient_color: Color = Color.WHITE

@export_group("Tiles")
@export var tile_variants: PackedStringArray = []

@export_group("Spawns")
@export var monster_types: PackedStringArray = []
@export var hazard_types: PackedStringArray = []
