class_name MiniMap
extends Control
## Circular minimap (160px diameter) rendered via custom _draw().
## Shows terrain as colored dots, entity pips, and a rotating scan line.
## Click to toggle the full map overlay via EventBus.

# ── Constants ───────────────────────────────────────────────────────────────
const MAP_DIAMETER: int = 160
const MAP_RADIUS: int = MAP_DIAMETER / 2  # 80
const TILE_RADIUS: int = 18  # How many tiles out from player to render
const DOT_SIZE: float = 3.5  # Pixel size of each terrain dot
const SCAN_ROTATION_TIME: float = 3.0  # Full rotation period in seconds
const ENTITY_PULSE_SPEED: float = 3.0  # Pulse frequency for entity pips

# Terrain colors
const COLOR_WALL: Color = Color(0.12, 0.12, 0.14, 1.0)
const COLOR_FLOOR: Color = Color(0.22, 0.22, 0.25, 1.0)
const COLOR_DOOR: Color = Color(0.55, 0.35, 0.15, 1.0)
const COLOR_STAIRS: Color = Color(0.85, 0.75, 0.2, 1.0)
const COLOR_LAVA: Color = Color(0.85, 0.25, 0.1, 0.9)
const COLOR_WATER: Color = Color(0.15, 0.4, 0.7, 0.9)
const COLOR_UNEXPLORED: Color = Color(0.05, 0.05, 0.06, 1.0)

# Entity pip colors
const COLOR_PLAYER: Color = Color(1.0, 1.0, 1.0, 1.0)
const COLOR_ENEMY: Color = Color(0.9, 0.15, 0.15, 1.0)
const COLOR_NPC: Color = Color(0.2, 0.85, 0.3, 1.0)
const COLOR_ITEM: Color = Color(0.85, 0.65, 0.1, 1.0)

# Visual
const BACKGROUND_COLOR: Color = Color(0.04, 0.04, 0.05, 0.88)
const SCAN_LINE_COLOR: Color = Color(0.2, 0.5, 1.0, 0.3)
const SCAN_TRAIL_COLOR: Color = Color(0.15, 0.35, 0.7, 0.08)
const BORDER_OUTER_COLOR: Color = Color(0.23, 0.21, 0.19, 1.0)
const BORDER_INNER_COLOR: Color = Color(0.55, 0.41, 0.08, 0.7)

# ── State ───────────────────────────────────────────────────────────────────
var scan_angle: float = 0.0
var pulse_phase: float = 0.0
var map_scale: float = 1.0  # Zoom level multiplier

var _cached_visible_tiles: Array = []
var _cached_player_pos: Vector2i = Vector2i.ZERO
var _cached_entities: Array = []
var _is_dirty: bool = true

# ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	custom_minimum_size = Vector2(MAP_DIAMETER, MAP_DIAMETER)
	mouse_filter = Control.MOUSE_FILTER_STOP
	tooltip_text = "Click to toggle full map"

	# Clip to circular shape
	clip_contents = true


func _process(delta: float) -> void:
	# Rotate scan line: one full rotation every SCAN_ROTATION_TIME seconds
	scan_angle += (TAU / SCAN_ROTATION_TIME) * delta
	if scan_angle > TAU:
		scan_angle -= TAU

	# Pulse phase for entity pips
	pulse_phase += delta * ENTITY_PULSE_SPEED
	if pulse_phase > TAU:
		pulse_phase -= TAU

	queue_redraw()


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mb: InputEventMouseButton = event as InputEventMouseButton
		if mb.pressed and mb.button_index == MOUSE_BUTTON_LEFT:
			# Toggle full map overlay
			if EventBus.has_signal("game_state_changed"):
				EventBus.emit_signal("game_state_changed",
					Constants.GameState.PLAYING,
					Constants.GameState.PLAYING)
			accept_event()


# ── Public API ──────────────────────────────────────────────────────────────

func update_map(visible_tiles: Array, player_pos: Vector2i, entities: Array) -> void:
	_cached_visible_tiles = visible_tiles
	_cached_player_pos = player_pos
	_cached_entities = entities
	_is_dirty = true


func set_map_scale(new_scale: float) -> void:
	map_scale = clampf(new_scale, 0.5, 3.0)


# ── Drawing ─────────────────────────────────────────────────────────────────

func _draw() -> void:
	var center: Vector2 = size / 2.0
	var radius: float = float(MAP_RADIUS)

	# Background circle
	draw_circle(center, radius, BACKGROUND_COLOR)

	# Draw terrain dots
	_draw_terrain(center, radius)

	# Draw entity pips
	_draw_entities(center, radius)

	# Player dot always at center
	draw_circle(center, 3.0, COLOR_PLAYER)

	# Scan line with trail
	_draw_scan_line(center, radius)

	# Border rings
	draw_arc(center, radius, 0.0, TAU, 64, BORDER_OUTER_COLOR, 3.0)
	draw_arc(center, radius - 3.0, 0.0, TAU, 64, BORDER_INNER_COLOR, 1.0)


func _draw_terrain(center: Vector2, radius: float) -> void:
	var scaled_dot: float = DOT_SIZE * map_scale
	var half_dot: float = scaled_dot * 0.5

	for tile_data: Dictionary in _cached_visible_tiles:
		var tile_pos: Vector2i = tile_data.get("position", Vector2i.ZERO)
		var tile_type: int = tile_data.get("type", 0)
		var explored: bool = tile_data.get("explored", false)
		var visible_now: bool = tile_data.get("visible", false)

		if not explored:
			continue

		# Offset from player
		var dx: int = tile_pos.x - _cached_player_pos.x
		var dy: int = tile_pos.y - _cached_player_pos.y

		# Skip if outside minimap tile radius
		if dx * dx + dy * dy > TILE_RADIUS * TILE_RADIUS:
			continue

		# Convert to screen position within the minimap
		var screen_pos: Vector2 = center + Vector2(float(dx), float(dy)) * scaled_dot

		# Skip if outside the circular boundary
		if screen_pos.distance_to(center) + half_dot > radius:
			continue

		# Pick terrain color
		var color: Color = _get_tile_color(tile_type)

		# Dim explored-but-not-visible tiles
		if not visible_now:
			color = color.darkened(0.5)

		draw_rect(Rect2(screen_pos - Vector2(half_dot, half_dot), Vector2(scaled_dot, scaled_dot)), color)


func _draw_entities(center: Vector2, radius: float) -> void:
	var scaled_dot: float = DOT_SIZE * map_scale
	var pulse_intensity: float = 0.5 + 0.5 * sin(pulse_phase)

	for entity_data: Dictionary in _cached_entities:
		var entity_pos: Vector2i = entity_data.get("position", Vector2i.ZERO)
		var entity_type: String = entity_data.get("type", "unknown")

		# Offset from player
		var dx: int = entity_pos.x - _cached_player_pos.x
		var dy: int = entity_pos.y - _cached_player_pos.y

		if dx * dx + dy * dy > TILE_RADIUS * TILE_RADIUS:
			continue

		var screen_pos: Vector2 = center + Vector2(float(dx), float(dy)) * scaled_dot

		if screen_pos.distance_to(center) > radius - 4.0:
			continue

		var pip_color: Color = _get_entity_color(entity_type)
		var pip_radius: float = 2.5

		# Enemies pulse
		if entity_type == "enemy":
			pip_color.a = 0.6 + 0.4 * pulse_intensity
			pip_radius = 2.0 + 0.8 * pulse_intensity

		# Items have a subtle glow
		if entity_type == "item":
			pip_color.a = 0.7 + 0.3 * pulse_intensity

		draw_circle(screen_pos, pip_radius, pip_color)


func _draw_scan_line(center: Vector2, radius: float) -> void:
	# Draw a fading trail behind the scan line
	var trail_segments: int = 12
	var trail_arc: float = PI * 0.4  # Trail covers ~72 degrees behind the line

	for i in range(trail_segments):
		var t: float = float(i) / float(trail_segments)
		var trail_angle: float = scan_angle - trail_arc * t
		var trail_end: Vector2 = center + Vector2(cos(trail_angle), sin(trail_angle)) * radius
		var alpha: float = SCAN_TRAIL_COLOR.a * (1.0 - t)
		draw_line(center, trail_end, Color(SCAN_TRAIL_COLOR.r, SCAN_TRAIL_COLOR.g, SCAN_TRAIL_COLOR.b, alpha), 1.0)

	# Main scan line
	var scan_end: Vector2 = center + Vector2(cos(scan_angle), sin(scan_angle)) * radius
	draw_line(center, scan_end, SCAN_LINE_COLOR, 1.5)


# ── Helpers ─────────────────────────────────────────────────────────────────

func _get_tile_color(tile_type: int) -> Color:
	match tile_type:
		Constants.TileType.WALL, Constants.TileType.CAVE_WALL:
			return COLOR_WALL
		Constants.TileType.FLOOR, Constants.TileType.CAVE_FLOOR:
			return COLOR_FLOOR
		Constants.TileType.DOOR:
			return COLOR_DOOR
		Constants.TileType.STAIRS_DOWN, Constants.TileType.EXIT:
			return COLOR_STAIRS
		Constants.TileType.LAVA:
			return COLOR_LAVA
		Constants.TileType.WATER:
			return COLOR_WATER
		Constants.TileType.GRASS, Constants.TileType.PATH:
			return Color(0.25, 0.35, 0.2, 1.0)
		Constants.TileType.SHRINE:
			return Color(0.6, 0.5, 0.9, 1.0)
		_:
			return COLOR_FLOOR


func _get_entity_color(entity_type: String) -> Color:
	match entity_type:
		"player":
			return COLOR_PLAYER
		"enemy":
			return COLOR_ENEMY
		"npc":
			return COLOR_NPC
		"item", "loot":
			return COLOR_ITEM
		_:
			return UIConstants.TEXT_MUTED
