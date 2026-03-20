class_name CoreGenerator
extends RefCounted
## Boss arena generator for "The Core" final encounter.
## Creates a circular arena with pillars, safe zones, hazard spawn points,
## and supports the Void Collapse shrink mechanic.

# --- Configuration ---
const DEFAULT_WIDTH: int = 40
const DEFAULT_HEIGHT: int = 40
const PILLAR_RING_RADIUS: int = 12
const PILLAR_SIZE: int = 2
const PILLAR_COUNT: int = 8
const SAFE_ZONE_MARGIN: int = 5
const SAFE_ZONE_SIZE: int = 4
const HAZARD_RING_RADII: Array = [8, 14, 18]
const HAZARD_RING_COUNTS: Array = [6, 8, 10]
const ARENA_BORDER_THICKNESS: int = 2


# =========================================================================
#  Inner Classes
# =========================================================================

class ArenaResult extends RefCounted:
	var tiles: Array = []             # 2D grid of Constants.TileType
	var width: int = 0
	var height: int = 0
	var center: Vector2i = Vector2i.ZERO
	var player_spawn: Vector2i = Vector2i.ZERO
	var boss_spawn: Vector2i = Vector2i.ZERO
	var pillar_positions: Array = []  # Array[Vector2i] (top-left of each 2x2 pillar)
	var safe_zones: Array = []        # Array[Rect2i]
	var hazard_points: Array = []     # Array[Vector2i]
	var arena_radius: int = 0


# =========================================================================
#  Main Generation
# =========================================================================

func generate(width: int = DEFAULT_WIDTH, height: int = DEFAULT_HEIGHT) -> ArenaResult:
	var result := ArenaResult.new()
	result.width = width
	result.height = height
	result.center = Vector2i(width / 2, height / 2)

	var cx: int = result.center.x
	var cy: int = result.center.y
	result.arena_radius = mini(cx, cy) - ARENA_BORDER_THICKNESS

	# Initialize tile grid
	result.tiles = _create_grid(width, height, Constants.TileType.VOID)

	# --- Create circular arena floor with distance-based coloring ---
	_create_arena_floor(result)

	# --- Place 8 pillars in ring at 45-degree intervals ---
	_place_pillars(result)

	# --- Create 4 corner safe zones ---
	_create_safe_zones(result)

	# --- Set spawn positions ---
	result.player_spawn = Vector2i(cx, cy + result.arena_radius / 2)
	result.boss_spawn = Vector2i(cx, cy - result.arena_radius / 3)

	# Ensure spawn positions are floor tiles
	_ensure_floor(result.tiles, result.player_spawn, width, height)
	_ensure_floor(result.tiles, result.boss_spawn, width, height)

	# --- Calculate hazard spawn points ---
	_create_hazard_points(result)

	return result


# =========================================================================
#  Arena Floor Creation
# =========================================================================

func _create_arena_floor(result: ArenaResult) -> void:
	var cx: int = result.center.x
	var cy: int = result.center.y
	var radius: int = result.arena_radius

	for y in range(result.height):
		for x in range(result.width):
			var dx: float = float(x - cx)
			var dy: float = float(y - cy)
			var dist: float = sqrt(dx * dx + dy * dy)

			if dist <= float(radius):
				# Distance-based tile coloring
				var norm_dist: float = dist / float(radius)
				if norm_dist < 0.3:
					result.tiles[y][x] = Constants.TileType.FLOOR
				elif norm_dist < 0.6:
					result.tiles[y][x] = Constants.TileType.FLOOR
				elif norm_dist < 0.85:
					result.tiles[y][x] = Constants.TileType.FLOOR
				else:
					# Edge zone - slightly different appearance
					result.tiles[y][x] = Constants.TileType.VOID_CRACK
			elif dist <= float(radius + ARENA_BORDER_THICKNESS):
				# Border ring
				result.tiles[y][x] = Constants.TileType.WALL


# =========================================================================
#  Pillar Placement
# =========================================================================

func _place_pillars(result: ArenaResult) -> void:
	var cx: int = result.center.x
	var cy: int = result.center.y

	for i in range(PILLAR_COUNT):
		var angle: float = (float(i) / float(PILLAR_COUNT)) * TAU
		var px: int = cx + int(cos(angle) * float(PILLAR_RING_RADIUS))
		var py: int = cy + int(sin(angle) * float(PILLAR_RING_RADIUS))

		# Place 2x2 pillar block
		var pillar_pos := Vector2i(px, py)
		result.pillar_positions.append(pillar_pos)

		for dy in range(PILLAR_SIZE):
			for dx in range(PILLAR_SIZE):
				var tx: int = px + dx
				var ty: int = py + dy
				if tx >= 0 and tx < result.width and ty >= 0 and ty < result.height:
					result.tiles[ty][tx] = Constants.TileType.PILLAR


# =========================================================================
#  Safe Zone Creation
# =========================================================================

func _create_safe_zones(result: ArenaResult) -> void:
	## Creates 4 safe zones in the corners of the arena.
	var cx: int = result.center.x
	var cy: int = result.center.y
	var radius: int = result.arena_radius

	# Four cardinal-diagonal positions within the arena
	var corners: Array = [
		Vector2i(cx - radius + SAFE_ZONE_MARGIN, cy - radius + SAFE_ZONE_MARGIN),  # NW
		Vector2i(cx + radius - SAFE_ZONE_MARGIN - SAFE_ZONE_SIZE, cy - radius + SAFE_ZONE_MARGIN),  # NE
		Vector2i(cx - radius + SAFE_ZONE_MARGIN, cy + radius - SAFE_ZONE_MARGIN - SAFE_ZONE_SIZE),  # SW
		Vector2i(cx + radius - SAFE_ZONE_MARGIN - SAFE_ZONE_SIZE, cy + radius - SAFE_ZONE_MARGIN - SAFE_ZONE_SIZE),  # SE
	]

	for corner in corners:
		var zone := Rect2i(corner.x, corner.y, SAFE_ZONE_SIZE, SAFE_ZONE_SIZE)
		result.safe_zones.append(zone)

		# Clear safe zone area to floor
		for dy in range(SAFE_ZONE_SIZE):
			for dx in range(SAFE_ZONE_SIZE):
				var tx: int = corner.x + dx
				var ty: int = corner.y + dy
				if tx >= 0 and tx < result.width and ty >= 0 and ty < result.height:
					result.tiles[ty][tx] = Constants.TileType.FLOOR


# =========================================================================
#  Hazard Spawn Points
# =========================================================================

func _create_hazard_points(result: ArenaResult) -> void:
	## Creates hazard spawn points in concentric rings.
	## Ring 1 (radius 8): 6 points
	## Ring 2 (radius 14): 8 points
	## Ring 3 (radius 18): 10 points
	var cx: int = result.center.x
	var cy: int = result.center.y

	for ring_idx in range(HAZARD_RING_RADII.size()):
		var ring_radius: int = HAZARD_RING_RADII[ring_idx]
		var point_count: int = HAZARD_RING_COUNTS[ring_idx]

		# Skip if ring is larger than arena
		if ring_radius >= result.arena_radius:
			continue

		for i in range(point_count):
			var angle: float = (float(i) / float(point_count)) * TAU
			# Offset each ring slightly so points don't align
			angle += float(ring_idx) * 0.3

			var hx: int = cx + int(cos(angle) * float(ring_radius))
			var hy: int = cy + int(sin(angle) * float(ring_radius))

			if hx >= 0 and hx < result.width and hy >= 0 and hy < result.height:
				# Only place on floor tiles
				if result.tiles[hy][hx] == Constants.TileType.FLOOR or \
				   result.tiles[hy][hx] == Constants.TileType.VOID_CRACK:
					result.hazard_points.append(Vector2i(hx, hy))


# =========================================================================
#  Void Collapse Mechanic
# =========================================================================

func apply_shrink(tiles: Array, amount: int) -> Array:
	## Shrinks the arena by converting outer floor tiles to void.
	## Used during the Void Collapse boss mechanic.
	## amount: number of tiles to shrink from the edge inward.
	if tiles.is_empty():
		return tiles

	var height: int = tiles.size()
	var width: int = tiles[0].size()
	var cx: int = width / 2
	var cy: int = height / 2

	# Calculate current arena radius (find furthest floor tile from center)
	var current_radius: float = 0.0
	for y in range(height):
		for x in range(width):
			if tiles[y][x] == Constants.TileType.FLOOR or \
			   tiles[y][x] == Constants.TileType.VOID_CRACK:
				var dx: float = float(x - cx)
				var dy: float = float(y - cy)
				var dist: float = sqrt(dx * dx + dy * dy)
				current_radius = maxf(current_radius, dist)

	var new_radius: float = current_radius - float(amount)
	if new_radius < 5.0:
		new_radius = 5.0  # Minimum arena size

	# Convert tiles outside new radius to void
	for y in range(height):
		for x in range(width):
			var dx: float = float(x - cx)
			var dy: float = float(y - cy)
			var dist: float = sqrt(dx * dx + dy * dy)

			if dist > new_radius:
				if tiles[y][x] != Constants.TileType.PILLAR:
					# Transition zone: void crack before full void
					if dist <= new_radius + 2.0:
						tiles[y][x] = Constants.TileType.VOID_CRACK
					else:
						tiles[y][x] = Constants.TileType.VOID

	return tiles


# =========================================================================
#  Utility
# =========================================================================

func _ensure_floor(tiles: Array, pos: Vector2i, width: int, height: int) -> void:
	## Ensures the given position and surrounding tiles are floor.
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			var tx: int = pos.x + dx
			var ty: int = pos.y + dy
			if tx >= 0 and tx < width and ty >= 0 and ty < height:
				if tiles[ty][tx] != Constants.TileType.PILLAR:
					tiles[ty][tx] = Constants.TileType.FLOOR


func _create_grid(width: int, height: int, fill_value: int) -> Array:
	var grid: Array = []
	grid.resize(height)
	for y in height:
		var row: Array = []
		row.resize(width)
		row.fill(fill_value)
		grid[y] = row
	return grid
