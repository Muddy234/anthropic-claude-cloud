class_name TileDefData
extends Resource

@export var id: String = ""
@export var tile_type: int = 0                 # TileType enum value
@export var walkable: bool = true
@export var transparent: bool = true
@export var color: Color = Color.WHITE
@export var floor_context: int = 0             # Which dungeon floor
