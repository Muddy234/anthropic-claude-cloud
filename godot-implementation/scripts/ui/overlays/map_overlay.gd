class_name MapOverlay
extends ColorRect
## Full dungeon map overlay with zoom (1x-8x via mouse wheel), pan via mouse drag,
## entity markers (player=white, enemies=red, NPCs=green, stairs=yellow),
## fog of war, floor label, and optional click-to-set-waypoint. Toggle with 'M'.

# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------
const ZOOM_LEVELS: Array[float] = [1.0, 2.0, 4.0, 8.0]
const DEFAULT_ZOOM_INDEX: int = 1  # Start at 2x
const CELL_BASE_SIZE: float = 4.0  # Pixels per cell at 1x zoom
const PAN_SPEED: float = 1.0

## Entity marker colors
const MARKER_PLAYER: Color = Color.WHITE
const MARKER_ENEMY: Color = Color(1.0, 0.2, 0.2)
const MARKER_NPC: Color = Color(0.2, 0.9, 0.3)
const MARKER_STAIRS: Color = Color(1.0, 1.0, 0.2)
const MARKER_LOOT: Color = Color(0.85, 0.65, 0.13)

## Fog of war colors
const FOG_UNEXPLORED: Color = Color(0.0, 0.0, 0.0, 1.0)
const FOG_EXPLORED: Color = Color(0.0, 0.0, 0.0, 0.55)

## Tile colors for the map
const TILE_COLORS: Dictionary = {
	"floor": Color(0.2, 0.2, 0.22),
	"wall": Color(0.12, 0.12, 0.14),
	"door": Color(0.45, 0.3, 0.15),
	"stairs": Color(0.1, 0.6, 0.6),
	"lava": Color(0.7, 0.25, 0.1),
	"water": Color(0.15, 0.3, 0.55),
	"shrine": Color(0.5, 0.35, 0.6),
}

# ---------------------------------------------------------------------------
#  Node references
# ---------------------------------------------------------------------------
@onready var map_canvas: Control = %MapCanvas
@onready var floor_label: Label = %FloorLabel
@onready var zoom_label: Label = %ZoomLabel
@onready var title_label: Label = %TitleLabel
@onready var legend_container: VBoxContainer = %LegendContainer

# ---------------------------------------------------------------------------
#  State
# ---------------------------------------------------------------------------
var _is_open: bool = false
var _zoom_index: int = DEFAULT_ZOOM_INDEX
var _pan_offset: Vector2 = Vector2.ZERO
var _is_dragging: bool = false
var _drag_start: Vector2 = Vector2.ZERO
var _pan_start: Vector2 = Vector2.ZERO
var _waypoint: Vector2i = Vector2i(-1, -1)

# ---------------------------------------------------------------------------
#  Lifecycle
# ---------------------------------------------------------------------------
func _ready() -> void:
	visible = false
	color = Color(0.02, 0.02, 0.04, 0.92)

	if map_canvas:
		map_canvas.draw.connect(_draw_map)

	if title_label:
		title_label.text = "CARTOGRAPHIA"
		title_label.add_theme_color_override("font_color", UIConstantsDef.GOLD)

	_build_legend()
	_update_zoom_label()

	EventBus.floor_advanced.connect(_on_floor_advanced)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("map_overlay"):
		toggle()
		get_viewport().set_input_as_handled()
		return

	if not _is_open:
		return

	if event.is_action_pressed("ui_cancel"):
		close()
		get_viewport().set_input_as_handled()
		return

	# Mouse wheel zoom
	if event is InputEventMouseButton:
		var mb: InputEventMouseButton = event
		if mb.pressed:
			if mb.button_index == MOUSE_BUTTON_WHEEL_UP:
				_change_zoom(1)
				get_viewport().set_input_as_handled()
			elif mb.button_index == MOUSE_BUTTON_WHEEL_DOWN:
				_change_zoom(-1)
				get_viewport().set_input_as_handled()
			elif mb.button_index == MOUSE_BUTTON_LEFT:
				if not _is_dragging:
					_is_dragging = true
					_drag_start = mb.position
					_pan_start = _pan_offset
				get_viewport().set_input_as_handled()
			elif mb.button_index == MOUSE_BUTTON_RIGHT:
				# Click to set waypoint
				_set_waypoint_at(mb.position)
				get_viewport().set_input_as_handled()
		elif not mb.pressed:
			if mb.button_index == MOUSE_BUTTON_LEFT:
				_is_dragging = false

	# Mouse drag for panning
	if event is InputEventMouseMotion and _is_dragging:
		var mm: InputEventMouseMotion = event
		var delta: Vector2 = mm.position - _drag_start
		_pan_offset = _pan_start + delta * PAN_SPEED
		if map_canvas:
			map_canvas.queue_redraw()


func _process(_delta: float) -> void:
	if _is_open and map_canvas:
		map_canvas.queue_redraw()

# ---------------------------------------------------------------------------
#  Toggle
# ---------------------------------------------------------------------------
func toggle() -> void:
	if _is_open:
		close()
	else:
		open()


func open() -> void:
	if _is_open:
		return
	_is_open = true
	visible = true
	_center_on_player()
	_update_floor_label()


func close() -> void:
	if not _is_open:
		return
	_is_open = false
	_is_dragging = false
	visible = false

# ---------------------------------------------------------------------------
#  Zoom
# ---------------------------------------------------------------------------
func _change_zoom(direction: int) -> void:
	var new_index: int = clampi(_zoom_index + direction, 0, ZOOM_LEVELS.size() - 1)
	if new_index != _zoom_index:
		_zoom_index = new_index
		_update_zoom_label()
		if map_canvas:
			map_canvas.queue_redraw()


func _update_zoom_label() -> void:
	if zoom_label:
		zoom_label.text = "%dx" % int(ZOOM_LEVELS[_zoom_index])

# ---------------------------------------------------------------------------
#  Map rendering (custom _draw on MapCanvas)
# ---------------------------------------------------------------------------
func _draw_map() -> void:
	if not map_canvas:
		return

	var map_data: Variant = _get_map_data()
	if map_data == null or not (map_data is Array):
		return
	var grid: Array = map_data

	if grid.is_empty():
		return

	var zoom: float = ZOOM_LEVELS[_zoom_index]
	var cell_size: float = CELL_BASE_SIZE * zoom
	var canvas_center: Vector2 = map_canvas.size / 2.0

	var player_pos: Vector2i = _get_player_grid_pos()
	var visibility_data: Variant = _get_visibility_data()

	# Draw terrain tiles
	var grid_height: int = grid.size()
	for y in range(grid_height):
		var row: Variant = grid[y]
		if not (row is Array):
			continue
		var grid_width: int = row.size()
		for x in range(grid_width):
			var tile: Variant = row[x]
			var tile_type: int = -1
			var explored: bool = false
			var is_visible: bool = false

			if tile is Dictionary:
				tile_type = tile.get("type", 0)
				explored = tile.get("explored", false)
				is_visible = tile.get("visible", false)
			elif tile is int:
				tile_type = tile
				# Check visibility data separately
				if visibility_data is Array and y < visibility_data.size():
					var vis_row: Variant = visibility_data[y]
					if vis_row is Array and x < vis_row.size():
						var vis: Variant = vis_row[x]
						if vis is Dictionary:
							explored = vis.get("explored", false)
							is_visible = vis.get("visible", false)

			# Skip unexplored tiles
			if not explored and not is_visible:
				continue

			var screen_pos: Vector2 = canvas_center + Vector2(
				(x - player_pos.x) * cell_size,
				(y - player_pos.y) * cell_size
			) + _pan_offset

			# Frustum cull
			if screen_pos.x < -cell_size or screen_pos.x > map_canvas.size.x + cell_size:
				continue
			if screen_pos.y < -cell_size or screen_pos.y > map_canvas.size.y + cell_size:
				continue

			var tile_color: Color = _get_tile_color(tile_type)

			# Dim explored-but-not-visible tiles
			if explored and not is_visible:
				tile_color = tile_color.darkened(0.5)
				tile_color.a = 0.6

			map_canvas.draw_rect(
				Rect2(screen_pos, Vector2(cell_size, cell_size)),
				tile_color
			)

	# Draw entity markers
	_draw_entity_markers(canvas_center, cell_size, player_pos)

	# Draw waypoint
	if _waypoint.x >= 0 and _waypoint.y >= 0:
		var wp_screen: Vector2 = canvas_center + Vector2(
			(_waypoint.x - player_pos.x) * cell_size,
			(_waypoint.y - player_pos.y) * cell_size
		) + _pan_offset
		map_canvas.draw_circle(wp_screen + Vector2(cell_size / 2.0, cell_size / 2.0), cell_size, Color(0.0, 1.0, 1.0, 0.6))

	# Draw player marker (always on top)
	var player_screen: Vector2 = canvas_center + _pan_offset
	var player_marker_size: float = maxf(cell_size * 1.2, 4.0)
	map_canvas.draw_circle(
		player_screen + Vector2(cell_size / 2.0, cell_size / 2.0),
		player_marker_size,
		MARKER_PLAYER
	)


func _draw_entity_markers(canvas_center: Vector2, cell_size: float, player_pos: Vector2i) -> void:
	var entities: Array = _get_entities()
	var marker_size: float = maxf(cell_size * 0.8, 3.0)

	for entity: Dictionary in entities:
		var ex: int = entity.get("x", 0)
		var ey: int = entity.get("y", 0)
		var etype: String = entity.get("type", "")

		# Only draw if the tile is visible/explored
		if not entity.get("visible", false):
			continue

		var screen_pos: Vector2 = canvas_center + Vector2(
			(ex - player_pos.x) * cell_size,
			(ey - player_pos.y) * cell_size
		) + _pan_offset

		var marker_color: Color
		match etype:
			"enemy":
				marker_color = MARKER_ENEMY
				# Pulse effect for enemies
				marker_color.a = 0.6 + 0.4 * sin(Time.get_ticks_msec() * 0.004)
			"npc":
				marker_color = MARKER_NPC
			"stairs":
				marker_color = MARKER_STAIRS
			"loot":
				marker_color = MARKER_LOOT
			_:
				marker_color = UIConstantsDef.TEXT_MUTED

		map_canvas.draw_circle(
			screen_pos + Vector2(cell_size / 2.0, cell_size / 2.0),
			marker_size,
			marker_color
		)

# ---------------------------------------------------------------------------
#  Tile color lookup
# ---------------------------------------------------------------------------
func _get_tile_color(tile_type: int) -> Color:
	match tile_type:
		ConstantsDef.TileType.FLOOR:       return TILE_COLORS["floor"]
		ConstantsDef.TileType.WALL:        return TILE_COLORS["wall"]
		ConstantsDef.TileType.DOOR:        return TILE_COLORS["door"]
		ConstantsDef.TileType.STAIRS_DOWN: return TILE_COLORS["stairs"]
		ConstantsDef.TileType.LAVA:        return TILE_COLORS["lava"]
		ConstantsDef.TileType.WATER:       return TILE_COLORS["water"]
		ConstantsDef.TileType.SHRINE:      return TILE_COLORS["shrine"]
		_: return TILE_COLORS["floor"]

# ---------------------------------------------------------------------------
#  Legend
# ---------------------------------------------------------------------------
func _build_legend() -> void:
	if not legend_container:
		return

	var legend_items: Array[Dictionary] = [
		{"label": "Player", "color": MARKER_PLAYER},
		{"label": "Enemy", "color": MARKER_ENEMY},
		{"label": "NPC", "color": MARKER_NPC},
		{"label": "Stairs", "color": MARKER_STAIRS},
		{"label": "Loot", "color": MARKER_LOOT},
	]

	for entry: Dictionary in legend_items:
		var row := HBoxContainer.new()

		var dot := ColorRect.new()
		dot.custom_minimum_size = Vector2(10, 10)
		dot.color = entry["color"]
		row.add_child(dot)

		var spacer := Control.new()
		spacer.custom_minimum_size = Vector2(6, 0)
		row.add_child(spacer)

		var lbl := Label.new()
		lbl.text = entry["label"]
		lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
		row.add_child(lbl)

		legend_container.add_child(row)

# ---------------------------------------------------------------------------
#  Floor label
# ---------------------------------------------------------------------------
func _update_floor_label() -> void:
	if not floor_label:
		return
	var gm: Node = get_node_or_null("/root/GameManager")
	var floor_num: int = 1
	if gm:
		floor_num = gm.get("current_floor") if gm.get("current_floor") else 1
	floor_label.text = "Floor %d" % floor_num
	floor_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)


func _on_floor_advanced(new_floor: int, _previous_floor: int) -> void:
	if floor_label:
		floor_label.text = "Floor %d" % new_floor

# ---------------------------------------------------------------------------
#  Waypoint
# ---------------------------------------------------------------------------
func _set_waypoint_at(screen_position: Vector2) -> void:
	if not map_canvas:
		return

	var zoom: float = ZOOM_LEVELS[_zoom_index]
	var cell_size: float = CELL_BASE_SIZE * zoom
	var canvas_center: Vector2 = map_canvas.size / 2.0
	var player_pos: Vector2i = _get_player_grid_pos()

	# Convert screen pos to grid pos
	var relative: Vector2 = screen_position - canvas_center - _pan_offset
	var grid_x: int = player_pos.x + int(round(relative.x / cell_size))
	var grid_y: int = player_pos.y + int(round(relative.y / cell_size))

	_waypoint = Vector2i(grid_x, grid_y)

# ---------------------------------------------------------------------------
#  Pan centering
# ---------------------------------------------------------------------------
func _center_on_player() -> void:
	_pan_offset = Vector2.ZERO

# ---------------------------------------------------------------------------
#  Data access helpers
# ---------------------------------------------------------------------------
func _get_player_grid_pos() -> Vector2i:
	var player: Node = _get_player()
	if not player:
		return Vector2i(0, 0)
	var gx: int = player.get("grid_x") if player.get("grid_x") else 0
	var gy: int = player.get("grid_y") if player.get("grid_y") else 0
	return Vector2i(gx, gy)


func _get_map_data() -> Variant:
	var gm: Node = get_node_or_null("/root/GameManager")
	if gm:
		return gm.get("map")
	return null


func _get_visibility_data() -> Variant:
	var gm: Node = get_node_or_null("/root/GameManager")
	if gm:
		return gm.get("visibility_map")
	return null


func _get_entities() -> Array:
	var gm: Node = get_node_or_null("/root/GameManager")
	if gm and gm.has_method("get_map_entities"):
		return gm.get_map_entities()
	return []


func _get_player() -> Node:
	var gm: Node = get_node_or_null("/root/GameManager")
	if gm:
		return gm.get("player")
	return null
