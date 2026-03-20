class_name DungeonRenderer
extends Node2D
## Populates TileMapLayer nodes from dungeon generator output and manages
## a fog-of-war overlay.
##
## Expected scene structure (children of this node):
##   TerrainLayer  — TileMapLayer for floor / wall / feature tiles
##   FogLayer      — TileMapLayer overlay for fog of war
##
## The dungeon_data Dictionary passed to [method render_dungeon] must contain:
##   "width":  int
##   "height": int
##   "tiles":  Array[Array[int]]   — 2-D grid of Constants.TileType values

# =========================================================================
#  Tile atlas source ID used by set_cell.  Assumes a single atlas source
#  at index 0 in each TileSet.
# =========================================================================
const ATLAS_SOURCE_ID: int = 0

# =========================================================================
#  Fog tile indices inside the fog TileSet atlas
# =========================================================================
const FOG_UNEXPLORED_COORD := Vector2i(0, 0)  # fully opaque black tile
const FOG_EXPLORED_COORD   := Vector2i(1, 0)  # semi-transparent dim tile

# =========================================================================
#  Node references
# =========================================================================
@onready var terrain_layer: TileMapLayer = $TerrainLayer
@onready var fog_layer: TileMapLayer     = $FogLayer

# =========================================================================
#  Internal state
# =========================================================================
var _map_width: int  = 0
var _map_height: int = 0


# =========================================================================
#  Atlas coordinate mapping — tile type enum -> atlas (col, row)
# =========================================================================
## Maps ConstantsDef.TileType values to their atlas coordinates in the
## dungeon TileSet.  Extend this dictionary when new tile types are added
## to the tileset.
const TILE_ATLAS_MAP: Dictionary = {
	ConstantsDef.TileType.FLOOR:         Vector2i(0, 0),
	ConstantsDef.TileType.WALL:          Vector2i(1, 0),
	ConstantsDef.TileType.DOOR:          Vector2i(2, 0),
	ConstantsDef.TileType.STAIRS_DOWN:   Vector2i(3, 0),
	ConstantsDef.TileType.LAVA:          Vector2i(4, 0),
	ConstantsDef.TileType.WATER:         Vector2i(5, 0),
	ConstantsDef.TileType.ICE:           Vector2i(6, 0),
	ConstantsDef.TileType.CAVE_WALL:     Vector2i(7, 0),
	ConstantsDef.TileType.CAVE_FLOOR:    Vector2i(8, 0),
	ConstantsDef.TileType.CAVE_ENTRANCE: Vector2i(9, 0),
	ConstantsDef.TileType.VOID:          Vector2i(10, 0),
	ConstantsDef.TileType.VOID_CRACK:    Vector2i(11, 0),
	ConstantsDef.TileType.PILLAR:        Vector2i(12, 0),
	ConstantsDef.TileType.SHRINE:        Vector2i(13, 0),
	ConstantsDef.TileType.EXIT:          Vector2i(14, 0),
}


# =========================================================================
#  Public API
# =========================================================================

## Clears previous terrain + fog and paints every cell from the generator data.
func render_dungeon(dungeon_data: Dictionary) -> void:
	clear()

	_map_width  = dungeon_data.get("width", 0)  as int
	_map_height = dungeon_data.get("height", 0) as int
	var tiles: Array = dungeon_data.get("tiles", [])

	for y in range(_map_height):
		if y >= tiles.size():
			break
		var row: Array = tiles[y]
		for x in range(_map_width):
			if x >= row.size():
				break
			var tile_type: int = row[x] as int
			var coords := Vector2i(x, y)
			var atlas_coord: Vector2i = _tile_type_to_atlas(tile_type)
			terrain_layer.set_cell(coords, ATLAS_SOURCE_ID, atlas_coord)

			# Start every cell unexplored
			fog_layer.set_cell(coords, ATLAS_SOURCE_ID, FOG_UNEXPLORED_COORD)


## Updates the fog overlay to reflect current visibility.
##
## [param visible_tiles] — tiles the player can see right now (fully revealed).
## [param explored_tiles] — tiles the player has seen before (dimmed).
##
## Both arrays contain Vector2i grid coordinates.
func update_fog_of_war(visible_tiles: Array, explored_tiles: Array) -> void:
	# Build a look-up set for visible tiles (fast membership test)
	var visible_set: Dictionary = {}
	for tile_pos: Vector2i in visible_tiles:
		visible_set[tile_pos] = true

	var explored_set: Dictionary = {}
	for tile_pos: Vector2i in explored_tiles:
		explored_set[tile_pos] = true

	for y in range(_map_height):
		for x in range(_map_width):
			var pos := Vector2i(x, y)
			if visible_set.has(pos):
				# Fully visible — remove fog
				fog_layer.erase_cell(pos)
			elif explored_set.has(pos):
				# Explored but not currently visible — dim overlay
				fog_layer.set_cell(pos, ATLAS_SOURCE_ID, FOG_EXPLORED_COORD)
			# else: stays unexplored (opaque), already set during render_dungeon


## Efficiently update fog only for tiles that changed since last call.
## Preferred over [method update_fog_of_war] when the full explored set is
## large and only a handful of tiles changed.
func update_fog_incremental(newly_visible: Array, newly_hidden: Array) -> void:
	for tile_pos: Vector2i in newly_visible:
		fog_layer.erase_cell(tile_pos)

	for tile_pos: Vector2i in newly_hidden:
		fog_layer.set_cell(tile_pos, ATLAS_SOURCE_ID, FOG_EXPLORED_COORD)


## Remove all painted cells from both layers and reset internal state.
func clear() -> void:
	if terrain_layer:
		terrain_layer.clear()
	if fog_layer:
		fog_layer.clear()
	_map_width  = 0
	_map_height = 0


# =========================================================================
#  Internals
# =========================================================================

func _tile_type_to_atlas(tile_type: int) -> Vector2i:
	if TILE_ATLAS_MAP.has(tile_type):
		return TILE_ATLAS_MAP[tile_type]
	# Fallback to floor for unrecognised types
	return TILE_ATLAS_MAP[ConstantsDef.TileType.FLOOR]
