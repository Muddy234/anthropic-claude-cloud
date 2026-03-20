class_name VillageRenderer
extends Node2D
## Populates TileMapLayer nodes from village generator output and places
## NPC markers and decoration sprites.
##
## Expected scene structure (children of this node):
##   TerrainLayer   — TileMapLayer for grass / path / building tiles
##   DecorLayer     — Node2D container for decoration Sprite2D children
##   NPCLayer       — Node2D container for instanced NPC scene markers
##
## The village_data Dictionary passed to [method render_village] must contain:
##   "width":   int
##   "height":  int
##   "tiles":   Array[Array[int]]   — 2-D grid of Constants.TileType values
##   "npcs":    Array[Dictionary]    — each with "position" (Vector2i), "npc_id", "display_name"
##   "decorations": Array[Dictionary] — each with "position" (Vector2i), "type" (String)

const ATLAS_SOURCE_ID: int = 0

# =========================================================================
#  NPC marker scene — instanced for each NPC placed in the village
# =========================================================================
const NPC_SCENE_PATH := "res://scenes/entities/npc/npc.tscn"

# =========================================================================
#  Decoration atlas mapping — decoration type string -> atlas coord
# =========================================================================
const DECORATION_ATLAS_MAP: Dictionary = {
	"tree":       Vector2i(0, 2),
	"bush":       Vector2i(1, 2),
	"barrel":     Vector2i(2, 2),
	"crate":      Vector2i(3, 2),
	"well":       Vector2i(4, 2),
	"lamppost":   Vector2i(5, 2),
	"sign":       Vector2i(6, 2),
	"bench":      Vector2i(7, 2),
	"flower_bed": Vector2i(8, 2),
	"statue":     Vector2i(9, 2),
	"cart":       Vector2i(10, 2),
	"fence_post": Vector2i(11, 2),
}

# =========================================================================
#  Village tile atlas mapping — TileType -> atlas coord in village TileSet
# =========================================================================
var TILE_ATLAS_MAP: Dictionary = {}

const TILE_SIZE: int = 16

## Color palette for placeholder village tiles.
const VILLAGE_TILE_COLORS: Dictionary = {
	7:  Color(0.30, 0.55, 0.20),  # GRASS - green
	8:  Color(0.55, 0.45, 0.30),  # PATH - dirt brown
	9:  Color(0.50, 0.48, 0.45),  # COBBLESTONE - gray
	10: Color(0.40, 0.38, 0.35),  # STONE_BORDER - dark gray
	1:  Color(0.35, 0.30, 0.25),  # WALL - dark brown
	0:  Color(0.45, 0.40, 0.33),  # FLOOR - wood
	2:  Color(0.55, 0.35, 0.15),  # DOOR - brown
	11: Color(0.50, 0.42, 0.28),  # FENCE - tan
	5:  Color(0.15, 0.35, 0.65),  # WATER - blue
}

# =========================================================================
#  Node references
# =========================================================================
@onready var terrain_layer: TileMapLayer = $TerrainLayer
@onready var decor_layer: Node2D         = $DecorLayer
@onready var npc_layer: Node2D           = $NPCLayer

# =========================================================================
#  Internal
# =========================================================================
var _map_width: int  = 0
var _map_height: int = 0


# =========================================================================
#  Initialization — build placeholder TileSet at runtime
# =========================================================================

func _ready() -> void:
	terrain_layer.tile_set = _create_placeholder_tileset()

func _create_placeholder_tileset() -> TileSet:
	var ts := TileSet.new()
	ts.tile_size = Vector2i(TILE_SIZE, TILE_SIZE)
	var atlas := TileSetAtlasSource.new()
	var cols: int = VILLAGE_TILE_COLORS.size()
	var img := Image.create(cols * TILE_SIZE, TILE_SIZE, false, Image.FORMAT_RGBA8)
	var col_index: int = 0
	for tile_type: int in VILLAGE_TILE_COLORS:
		var color: Color = VILLAGE_TILE_COLORS[tile_type]
		img.fill_rect(Rect2i(col_index * TILE_SIZE, 0, TILE_SIZE, TILE_SIZE), color)
		TILE_ATLAS_MAP[tile_type] = Vector2i(col_index, 0)
		col_index += 1
	var tex := ImageTexture.create_from_image(img)
	atlas.texture = tex
	atlas.texture_region_size = Vector2i(TILE_SIZE, TILE_SIZE)
	for i in range(cols):
		atlas.create_tile(Vector2i(i, 0))
	ts.add_source(atlas, ATLAS_SOURCE_ID)
	return ts

# =========================================================================
#  Public API
# =========================================================================

## Clears previous data and renders the full village from generator output.
func render_village(village_data: Dictionary) -> void:
	clear()

	_map_width  = village_data.get("width", 0)  as int
	_map_height = village_data.get("height", 0) as int

	_render_terrain(village_data.get("tiles", []))
	_place_decorations(village_data.get("decorations", []))
	_place_npcs(village_data.get("npcs", []))


## Remove all painted cells, decoration sprites, and NPC markers.
func clear() -> void:
	if terrain_layer:
		terrain_layer.clear()

	if decor_layer:
		for child in decor_layer.get_children():
			child.queue_free()

	if npc_layer:
		for child in npc_layer.get_children():
			child.queue_free()

	_map_width  = 0
	_map_height = 0


# =========================================================================
#  Terrain
# =========================================================================

func _render_terrain(tiles: Array) -> void:
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


func _tile_type_to_atlas(tile_type: int) -> Vector2i:
	if TILE_ATLAS_MAP.has(tile_type):
		return TILE_ATLAS_MAP[tile_type]
	# Fallback to grass for unrecognised village tile types
	return TILE_ATLAS_MAP[ConstantsDef.TileType.GRASS]


# =========================================================================
#  Decorations
# =========================================================================

func _place_decorations(decorations: Array) -> void:
	for deco_data: Dictionary in decorations:
		var grid_pos: Vector2i = deco_data.get("position", Vector2i.ZERO)
		var deco_type: String  = deco_data.get("type", "")

		if deco_type.is_empty():
			continue

		# Attempt to use a dedicated decoration TileMapLayer cell if the type
		# is in our atlas, otherwise fall back to a plain Sprite2D.
		if DECORATION_ATLAS_MAP.has(deco_type):
			_place_decoration_sprite(grid_pos, deco_type, deco_data)
		else:
			push_warning("VillageRenderer: unknown decoration type '%s'" % deco_type)


func _place_decoration_sprite(grid_pos: Vector2i, deco_type: String, data: Dictionary) -> void:
	var sprite := Sprite2D.new()
	sprite.name = "Deco_%s_%d_%d" % [deco_type, grid_pos.x, grid_pos.y]

	# Position at tile center
	sprite.position = Vector2(
		grid_pos.x * ConstantsDef.BASE_TILE_SIZE + ConstantsDef.BASE_TILE_SIZE * 0.5,
		grid_pos.y * ConstantsDef.BASE_TILE_SIZE + ConstantsDef.BASE_TILE_SIZE * 0.5
	)

	# Try loading a dedicated texture; callers can also pre-assign textures
	var tex_path: String = data.get("texture_path", "")
	if tex_path.is_empty():
		tex_path = "res://assets/sprites/village/decorations/%s.png" % deco_type
	if ResourceLoader.exists(tex_path):
		sprite.texture = load(tex_path)

	# Optional flip / scale from data
	sprite.flip_h = data.get("flip_h", false)

	var custom_scale: float = data.get("scale", 1.0)
	sprite.scale = Vector2(custom_scale, custom_scale)

	decor_layer.add_child(sprite)


# =========================================================================
#  NPCs
# =========================================================================

func _place_npcs(npcs: Array) -> void:
	var npc_scene: PackedScene = null
	if ResourceLoader.exists(NPC_SCENE_PATH):
		npc_scene = load(NPC_SCENE_PATH) as PackedScene

	for npc_data: Dictionary in npcs:
		var grid_pos: Vector2i  = npc_data.get("position", Vector2i.ZERO)
		var npc_id: String      = npc_data.get("npc_id", "")
		var display_name: String = npc_data.get("display_name", "NPC")

		var world_pos := Vector2(
			grid_pos.x * ConstantsDef.BASE_TILE_SIZE + ConstantsDef.BASE_TILE_SIZE * 0.5,
			grid_pos.y * ConstantsDef.BASE_TILE_SIZE + ConstantsDef.BASE_TILE_SIZE * 0.5
		)

		if npc_scene:
			var npc_node: Node2D = npc_scene.instantiate() as Node2D
			npc_node.position = world_pos
			npc_node.set_meta("npc_id", npc_id)
			npc_node.set_meta("display_name", display_name)

			# Forward any extra metadata the generator attached
			for key: String in npc_data:
				if key not in ["position", "npc_id", "display_name"]:
					npc_node.set_meta(key, npc_data[key])

			npc_layer.add_child(npc_node)
		else:
			# Fallback: place a simple marker sprite when the NPC scene is
			# not yet available (useful during early development).
			_place_npc_marker(world_pos, display_name, npc_id)


func _place_npc_marker(world_pos: Vector2, display_name: String, npc_id: String) -> void:
	var marker := Sprite2D.new()
	marker.name = "NPCMarker_%s" % npc_id
	marker.position = world_pos
	marker.modulate = UIConstantsDef.GOLD

	# Draw a small colored rectangle as placeholder
	var img := Image.create(ConstantsDef.BASE_TILE_SIZE, ConstantsDef.BASE_TILE_SIZE, false, Image.FORMAT_RGBA8)
	img.fill(Color(0.85, 0.65, 0.13, 0.9))
	marker.texture = ImageTexture.create_from_image(img)

	var label := Label.new()
	label.text = display_name
	label.position = Vector2(-24, -20)
	label.add_theme_font_size_override("font_size", 8)
	label.add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)
	marker.add_child(label)

	npc_layer.add_child(marker)
