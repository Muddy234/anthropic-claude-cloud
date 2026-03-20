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
var TILE_ATLAS_MAP: Dictionary = {}

## Color palette for placeholder tiles (used until real art assets exist).
const TILE_COLORS: Dictionary = {
	0:  Color(0.25, 0.22, 0.20),  # FLOOR - dark stone
	1:  Color(0.12, 0.10, 0.10),  # WALL - very dark
	2:  Color(0.55, 0.35, 0.15),  # DOOR - brown
	3:  Color(0.90, 0.85, 0.20),  # STAIRS_DOWN - yellow
	4:  Color(0.90, 0.25, 0.05),  # LAVA - orange-red
	5:  Color(0.15, 0.35, 0.65),  # WATER - blue
	6:  Color(0.70, 0.85, 0.95),  # ICE - light blue
	7:  Color(0.35, 0.30, 0.25),  # GRASS - reused for cave_wall? no
	8:  Color(0.20, 0.18, 0.15),  # PATH - reused
	9:  Color(0.40, 0.38, 0.35),  # COBBLESTONE - reused
	10: Color(0.30, 0.28, 0.25),  # STONE_BORDER - reused
	11: Color(0.45, 0.40, 0.30),  # FENCE - reused
	12: Color(0.18, 0.15, 0.13),  # CAVE_WALL - dark brown
	13: Color(0.28, 0.24, 0.20),  # CAVE_FLOOR - medium brown
	14: Color(0.35, 0.30, 0.22),  # CAVE_ENTRANCE - lighter brown
	15: Color(0.02, 0.02, 0.05),  # VOID - near black
	16: Color(0.08, 0.05, 0.12),  # VOID_CRACK - dark purple tint
	17: Color(0.50, 0.48, 0.45),  # PILLAR - gray
	18: Color(0.60, 0.50, 0.80),  # SHRINE - purple
	19: Color(0.20, 0.70, 0.30),  # EXIT - green
}

const TILE_SIZE: int = 16


# =========================================================================
#  Initialization — build placeholder TileSet at runtime
# =========================================================================

func _ready() -> void:
	var tileset := _create_placeholder_tileset()
	terrain_layer.tile_set = tileset
	# Fog layer gets its own simple 2-tile tileset
	fog_layer.tile_set = _create_fog_tileset()

func _create_placeholder_tileset() -> TileSet:
	var ts := TileSet.new()
	ts.tile_size = Vector2i(TILE_SIZE, TILE_SIZE)
	# Create one atlas source with a generated texture
	var atlas := TileSetAtlasSource.new()
	var cols: int = TILE_COLORS.size()
	var img := Image.create(cols * TILE_SIZE, TILE_SIZE, false, Image.FORMAT_RGBA8)
	var col_index: int = 0
	for tile_type: int in TILE_COLORS:
		var color: Color = TILE_COLORS[tile_type]
		var region := Rect2i(col_index * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE)
		img.fill_rect(region, color)
		# Add slight border to walls/pillars for visual distinction
		if tile_type in [1, 12, 17]:  # WALL, CAVE_WALL, PILLAR
			var border_color := color.lightened(0.2)
			for px in range(region.position.x, region.end.x):
				img.set_pixel(px, region.position.y, border_color)
				img.set_pixel(px, region.end.y - 1, border_color)
			for py in range(region.position.y, region.end.y):
				img.set_pixel(region.position.x, py, border_color)
				img.set_pixel(region.end.x - 1, py, border_color)
		TILE_ATLAS_MAP[tile_type] = Vector2i(col_index, 0)
		col_index += 1
	var tex := ImageTexture.create_from_image(img)
	atlas.texture = tex
	atlas.texture_region_size = Vector2i(TILE_SIZE, TILE_SIZE)
	# Create tile entries for each column
	for i in range(cols):
		atlas.create_tile(Vector2i(i, 0))
	ts.add_source(atlas, ATLAS_SOURCE_ID)
	return ts

func _create_fog_tileset() -> TileSet:
	var ts := TileSet.new()
	ts.tile_size = Vector2i(TILE_SIZE, TILE_SIZE)
	var atlas := TileSetAtlasSource.new()
	var img := Image.create(2 * TILE_SIZE, TILE_SIZE, false, Image.FORMAT_RGBA8)
	# Tile 0,0 = fully opaque black (unexplored)
	img.fill_rect(Rect2i(0, 0, TILE_SIZE, TILE_SIZE), Color(0, 0, 0, 1))
	# Tile 1,0 = semi-transparent (explored but not visible)
	img.fill_rect(Rect2i(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE), Color(0, 0, 0, 0.5))
	var tex := ImageTexture.create_from_image(img)
	atlas.texture = tex
	atlas.texture_region_size = Vector2i(TILE_SIZE, TILE_SIZE)
	atlas.create_tile(Vector2i(0, 0))
	atlas.create_tile(Vector2i(1, 0))
	ts.add_source(atlas, ATLAS_SOURCE_ID)
	return ts

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
