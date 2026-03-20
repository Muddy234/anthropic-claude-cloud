class_name VisionSystem
extends BaseSystem
## Fog of war using recursive shadowcasting with 8 octants.
## Manages tile visibility states: UNEXPLORED, EXPLORED, VISIBLE.

# --- Config ---
const BASE_SIGHT_RANGE: int = 4
const TORCH_BONUS: int = 6
const FADE_BUFFER: int = 2

# --- Visibility states ---
enum TileVisibility { UNEXPLORED = 0, EXPLORED = 1, VISIBLE = 2 }

# --- State ---
var tile_visibility: Array = []         # 2D array [y][x] of TileVisibility
var _visible_tiles: Array[Vector2i] = []
var _map_width: int = 0
var _map_height: int = 0
var _sight_range: int = BASE_SIGHT_RANGE
var _torch_active: bool = true
var _equipment_vision_bonus: int = 0


func _init() -> void:
	system_name = "vision-system"
	priority = 5


func initialize() -> void:
	_init_visibility_map()


func process_system(_delta: float) -> void:
	if not GameManager.player:
		return

	var player_pos := _get_player_tile()
	var range_val := _calculate_sight_range()
	update_fov(player_pos, range_val)


func cleanup() -> void:
	_visible_tiles.clear()
	tile_visibility.clear()
	_init_visibility_map()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func update_fov(origin: Vector2i, sight_range: int) -> void:
	## Recomputes FOV from origin with given sight range.
	# 1. Clear previous visible tiles — mark them as EXPLORED
	for tile in _visible_tiles:
		if _in_bounds(tile):
			tile_visibility[tile.y][tile.x] = TileVisibility.EXPLORED
	_visible_tiles.clear()

	# 2. Mark origin visible
	_mark_visible(origin, 1.0)

	# 3. Cast shadows in 8 octants
	for octant in range(8):
		_cast_light(origin, 1, 1.0, 0.0, octant, sight_range)


func get_tile_visibility(tile: Vector2i) -> int:
	if not _in_bounds(tile):
		return TileVisibility.UNEXPLORED
	return tile_visibility[tile.y][tile.x]


func is_tile_visible(tile: Vector2i) -> bool:
	return get_tile_visibility(tile) == TileVisibility.VISIBLE


func is_tile_explored(tile: Vector2i) -> bool:
	var vis := get_tile_visibility(tile)
	return vis == TileVisibility.EXPLORED or vis == TileVisibility.VISIBLE


func get_visible_tiles() -> Array[Vector2i]:
	return _visible_tiles


func get_entity_visibility(pos: Vector2) -> float:
	## Returns 0.0 (invisible) to 1.0 (fully visible) for a world position.
	if not GameManager.player:
		return 0.0
	var tile := Vector2i(int(pos.x) / Constants.BASE_TILE_SIZE, int(pos.y) / Constants.BASE_TILE_SIZE)
	if not is_tile_visible(tile):
		return 0.0
	var player_pos := _get_player_tile()
	var dist := Vector2(tile).distance_to(Vector2(player_pos))
	var range_val := float(_calculate_sight_range())
	if dist <= range_val - float(FADE_BUFFER):
		return 1.0
	elif dist <= range_val:
		var t := (dist - (range_val - float(FADE_BUFFER))) / float(FADE_BUFFER)
		return 1.0 - smoothstep(t)
	return 0.0


func set_torch_active(active: bool) -> void:
	_torch_active = active


func get_equipment_vision_bonus() -> int:
	if not _torch_active:
		return 0
	return _equipment_vision_bonus


func set_equipment_vision_bonus(bonus: int) -> void:
	_equipment_vision_bonus = bonus


# ---------------------------------------------------------------------------
# Shadowcasting
# ---------------------------------------------------------------------------

func _cast_light(origin: Vector2i, row: int, start_slope: float,
				end_slope: float, octant: int, range_limit: int) -> void:
	if start_slope < end_slope:
		return

	var next_start_slope := start_slope
	for j in range(row, range_limit + 1):
		var blocked := false
		var dx := -j - 1
		var dy := -j
		while dx <= 0:
			dx += 1
			var mapped := _transform_octant(dx, dy, octant)
			var map_pos := Vector2i(origin.x + mapped.x, origin.y + mapped.y)

			var l_slope := (float(dx) - 0.5) / (float(dy) + 0.5)
			var r_slope := (float(dx) + 0.5) / (float(dy) - 0.5)

			if start_slope < r_slope:
				continue
			elif end_slope > l_slope:
				break

			# Check distance for range limit
			var dist := sqrt(float(dx * dx + dy * dy))
			if dist <= float(range_limit):
				var intensity := 1.0 - (dist / float(range_limit + FADE_BUFFER))
				intensity = clampf(intensity, 0.0, 1.0)
				_mark_visible(map_pos, intensity)

			# Handle blocking
			if blocked:
				if _is_blocking(map_pos):
					next_start_slope = r_slope
					continue
				else:
					blocked = false
					start_slope = next_start_slope
			else:
				if _is_blocking(map_pos) and j < range_limit:
					blocked = true
					_cast_light(origin, j + 1, start_slope, l_slope, octant, range_limit)
					next_start_slope = r_slope
		if blocked:
			break


func _transform_octant(col: int, row: int, octant: int) -> Vector2i:
	match octant:
		0: return Vector2i( col, -row)
		1: return Vector2i(-row,  col)
		2: return Vector2i(-row, -col)
		3: return Vector2i(-col, -row)
		4: return Vector2i(-col,  row)
		5: return Vector2i( row, -col)
		6: return Vector2i( row,  col)
		7: return Vector2i( col,  row)
		_: return Vector2i( col,  row)


func _mark_visible(pos: Vector2i, _intensity: float) -> void:
	if not _in_bounds(pos):
		return
	if tile_visibility[pos.y][pos.x] != TileVisibility.VISIBLE:
		tile_visibility[pos.y][pos.x] = TileVisibility.VISIBLE
		_visible_tiles.append(pos)


func _is_blocking(pos: Vector2i) -> bool:
	if not _in_bounds(pos):
		return true
	if GameManager.map.is_empty():
		return false
	if pos.y >= GameManager.map.size() or pos.x >= GameManager.map[pos.y].size():
		return true
	var tile_type: int = GameManager.map[pos.y][pos.x]
	return tile_type == Constants.TileType.WALL \
		or tile_type == Constants.TileType.CAVE_WALL \
		or tile_type == Constants.TileType.PILLAR \
		or tile_type == Constants.TileType.VOID


# ---------------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------------

static func smoothstep(t: float) -> float:
	var clamped := clampf(t, 0.0, 1.0)
	return clamped * clamped * (3.0 - 2.0 * clamped)


func _calculate_sight_range() -> int:
	var range_val := BASE_SIGHT_RANGE
	if _torch_active:
		range_val += TORCH_BONUS
	range_val += _equipment_vision_bonus
	return range_val


func _get_player_tile() -> Vector2i:
	if not GameManager.player:
		return Vector2i.ZERO
	return Vector2i(
		int(GameManager.player.position.x) / Constants.BASE_TILE_SIZE,
		int(GameManager.player.position.y) / Constants.BASE_TILE_SIZE
	)


func _in_bounds(pos: Vector2i) -> bool:
	return pos.x >= 0 and pos.x < _map_width and pos.y >= 0 and pos.y < _map_height


func _init_visibility_map() -> void:
	_map_width = Constants.GRID_WIDTH
	_map_height = Constants.GRID_HEIGHT
	tile_visibility.clear()
	for y in range(_map_height):
		var row: Array = []
		row.resize(_map_width)
		row.fill(TileVisibility.UNEXPLORED)
		tile_visibility.append(row)
