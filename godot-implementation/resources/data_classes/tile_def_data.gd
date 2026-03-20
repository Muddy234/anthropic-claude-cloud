class_name TileDefData
extends Resource

@export var id: String = ""
@export var tile_type: Constants.TileType = Constants.TileType.FLOOR
@export var walkable: bool = true
@export var blocks_sight: bool = false
@export var transparent: bool = true
@export var color: Color = Color.WHITE
@export var damage: float = 0.0                # Damage per tick (for lava, etc.)
@export var damage_element: Constants.Element = Constants.Element.NONE
@export var floor_context: int = 0             # Which dungeon floor
