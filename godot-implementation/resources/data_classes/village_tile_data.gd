class_name VillageTileData
extends Resource

@export var id: String = ""
@export var display_name: String = ""
@export var tile_type: Constants.TileType = Constants.TileType.FLOOR
@export var building_type: String = ""
@export var walkable: bool = true
@export var interactable: bool = false
@export var interaction_type: String = ""      # "shop", "bank", "quest", etc.
@export var npc_id: String = ""                # NPC stationed here
