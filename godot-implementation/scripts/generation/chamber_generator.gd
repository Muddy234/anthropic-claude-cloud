class_name ChamberGenerator
extends RefCounted
## Per-room BSP + cellular automata chamber generator.
## Subdivides a blob region into sections, applies element-themed CA rules,
## then carves corridors and identifies chambers within the result.

# --- Configuration Constants ---
const TARGET_SECTIONS: int = 4
const MIN_SECTION_SIZE: int = 12
const CA_ITERATIONS: int = 5
const CORRIDOR_CARVE_WIDTH: int = 2
const DOORWAY_CLEAR_RADIUS: int = 2
const DOORWAY_INWARD_LENGTH: int = 4

## Element-themed cellular automata rules:
## { initial_fill, birth_threshold, death_threshold, smoothing_passes }
const CA_RULES: Dictionary = {
	Constants.Element.FIRE: { "fill": 0.25, "birth": 2, "death": 3, "smooth": 3 },
	Constants.Element.ICE: { "fill": 0.15, "birth": 4, "death": 5, "smooth": 4 },
	Constants.Element.DEATH: { "fill": 0.30, "birth": 3, "death": 4, "smooth": 5 },
	Constants.Element.EARTH: { "fill": 0.18, "birth": 4, "death": 4, "smooth": 4 },
	Constants.Element.PHYSICAL: { "fill": 0.20, "birth": 3, "death": 4, "smooth": 4 },
}

const DEFAULT_CA_RULE: Dictionary = { "fill": 0.20, "birth": 3, "death": 4, "smooth": 4 }


# =========================================================================
#  Inner Classes
# =========================================================================

class ChamberResult extends RefCounted:
	var tiles: Array = []             # 2D grid of Constants.TileType (local coords)
	var width: int = 0
	var height: int = 0
	var chambers: Array = []          # Array[Chamber]
	var sections: Array = []          # Array[BSPSection]
	var safe_chamber: Chamber = null  # Furthest from doorways
	var element: int = Constants.Element.PHYSICAL
	var doorways: Array = []          # Array[Vector2i] (local coords)


class BSPSection extends RefCounted:
	var x: int = 0
	var y: int = 0
	var w: int = 0
	var h: int = 0
	var left: BSPSection = null
	var right: BSPSection = null
	var center: Vector2i = Vector2i.ZERO

	func _init(p_x: int, p_y: int, p_w: int, p_h: int) -> void:
		x = p_x
		y = p_y
		w = p_w
		h = p_h
		center = Vector2i(x + w / 2, y + h / 2)

	func split(rng: SeededRNG) -> bool:
		if left != null or right != null:
			return false
		var split_h: bool
		if float(w) / float(h) >= 1.25:
			split_h = false
		elif float(h) / float(w) >= 1.25:
			split_h = true
		else:
			split_h = rng.chance(0.5)

		var max_size: int = (h if split_h else w) - MIN_SECTION_SIZE
		if max_size < MIN_SECTION_SIZE:
			return false

		var split_pos: int = rng.random_int(MIN_SECTION_SIZE, max_size)
		if split_h:
			left = BSPSection.new(x, y, w, split_pos)
			right = BSPSection.new(x, y + split_pos, w, h - split_pos)
		else:
			left = BSPSection.new(x, y, split_pos, h)
			right = BSPSection.new(x + split_pos, y, w - split_pos, h)
		return true

	func get_leaves() -> Array:
		if left == null and right == null:
			return [self]
		var result: Array = []
		if left:
			result.append_array(left.get_leaves())
		if right:
			result.append_array(right.get_leaves())
		return result

	func get_neighbor_pairs() -> Array:
		## Returns Array of [BSPSection, BSPSection] sibling pairs.
		if left == null and right == null:
			return []
		var pairs: Array = []
		if left and right:
			var left_leaves := left.get_leaves()
			var right_leaves := right.get_leaves()
			if not left_leaves.is_empty() and not right_leaves.is_empty():
				pairs.append([left_leaves[0], right_leaves[0]])
			pairs.append_array(left.get_neighbor_pairs())
			pairs.append_array(right.get_neighbor_pairs())
		return pairs


class Chamber extends RefCounted:
	var id: int = 0
	var tiles: Array = []             # Array[Vector2i] local coords
	var center: Vector2i = Vector2i.ZERO
	var area: int = 0
	var min_doorway_distance: float = 0.0


# =========================================================================
#  Main Generation
# =========================================================================

func generate_chambers(width: int, height: int, element: int, doorways: Array) -> ChamberResult:
	var rng := SeededRNG.new(width * 31337 + height * 7919 + element * 1013)
	var result := ChamberResult.new()
	result.width = width
	result.height = height
	result.element = element
	result.doorways = doorways.duplicate()

	# Initialize tile grid to walls
	result.tiles = _create_grid(width, height, Constants.TileType.WALL)

	if width < MIN_SECTION_SIZE or height < MIN_SECTION_SIZE:
		# Too small for BSP, just fill with floor
		_fill_rect_floor(result.tiles, 1, 1, width - 2, height - 2)
		_apply_doorway_clearance(result.tiles, doorways, width, height)
		result.chambers = _identify_chambers(result.tiles, width, height, doorways)
		result.safe_chamber = _find_safe_chamber(result.chambers, doorways)
		return result

	# --- BSP Subdivision ---
	var root := BSPSection.new(1, 1, width - 2, height - 2)
	var sections_to_split: Array = [root]
	var split_count: int = 0

	while not sections_to_split.is_empty() and split_count < TARGET_SECTIONS:
		var next_batch: Array = []
		for section in sections_to_split:
			if section.split(rng):
				next_batch.append(section.left)
				next_batch.append(section.right)
				split_count += 1
		sections_to_split = next_batch

	var leaves := root.get_leaves()
	result.sections = leaves

	# --- Cellular Automata per Section ---
	var ca_rule: Dictionary = CA_RULES.get(element, DEFAULT_CA_RULE)

	for section in leaves:
		_apply_ca_to_section(rng, result.tiles, section, ca_rule)

	# --- Carve Corridors Between Neighbor Sections ---
	var neighbor_pairs := root.get_neighbor_pairs()
	for pair in neighbor_pairs:
		var sec_a: BSPSection = pair[0]
		var sec_b: BSPSection = pair[1]
		_carve_section_corridor(result.tiles, sec_a, sec_b, width, height)

	# --- Doorway Clearance ---
	_apply_doorway_clearance(result.tiles, doorways, width, height)

	# --- Connectivity Validation ---
	if not _validate_connectivity_from_doorways(result.tiles, doorways, width, height):
		# Fallback: open more corridors to ensure connectivity
		_force_connectivity(result.tiles, doorways, width, height)

	# --- Identify Chambers ---
	result.chambers = _identify_chambers(result.tiles, width, height, doorways)

	# --- Find Safe Chamber ---
	result.safe_chamber = _find_safe_chamber(result.chambers, doorways)

	return result


# =========================================================================
#  Cellular Automata
# =========================================================================

func _apply_ca_to_section(rng: SeededRNG, tiles: Array, section: BSPSection, rule: Dictionary) -> void:
	var sw: int = section.w
	var sh: int = section.h
	var sx: int = section.x
	var sy: int = section.y

	# Initialize section with random fill
	for ly in range(sh):
		for lx in range(sw):
			var gx: int = sx + lx
			var gy: int = sy + ly
			if gy >= 0 and gy < tiles.size() and gx >= 0 and gx < tiles[0].size():
				if rng.chance(rule["fill"]):
					tiles[gy][gx] = Constants.TileType.WALL
				else:
					tiles[gy][gx] = Constants.TileType.FLOOR

	# Double-buffered CA iterations
	var buffer: Array = []
	for ly in range(sh):
		var row: Array = []
		row.resize(sw)
		row.fill(Constants.TileType.FLOOR)
		buffer.append(row)

	for _iteration in range(rule["smooth"]):
		# Copy current state to buffer
		for ly in range(sh):
			for lx in range(sw):
				var gx: int = sx + lx
				var gy: int = sy + ly
				if gy >= 0 and gy < tiles.size() and gx >= 0 and gx < tiles[0].size():
					buffer[ly][lx] = tiles[gy][gx]

		# Apply CA rules from buffer back to tiles
		for ly in range(1, sh - 1):
			for lx in range(1, sw - 1):
				var wall_count: int = _count_walls_in_buffer(buffer, lx, ly, sw, sh)
				var gx: int = sx + lx
				var gy: int = sy + ly

				if gy >= 0 and gy < tiles.size() and gx >= 0 and gx < tiles[0].size():
					if buffer[ly][lx] == Constants.TileType.WALL:
						# Wall survives if enough wall neighbors
						if wall_count >= rule["death"]:
							tiles[gy][gx] = Constants.TileType.WALL
						else:
							tiles[gy][gx] = Constants.TileType.FLOOR
					else:
						# Floor becomes wall if enough wall neighbors
						if wall_count >= rule["birth"]:
							tiles[gy][gx] = Constants.TileType.WALL
						else:
							tiles[gy][gx] = Constants.TileType.FLOOR


func _count_walls_in_buffer(buffer: Array, lx: int, ly: int, sw: int, sh: int) -> int:
	var count: int = 0
	for dy in range(-1, 2):
		for dx in range(-1, 2):
			if dx == 0 and dy == 0:
				continue
			var nx: int = lx + dx
			var ny: int = ly + dy
			if nx < 0 or nx >= sw or ny < 0 or ny >= sh:
				count += 1  # Out of bounds counts as wall
			elif buffer[ny][nx] == Constants.TileType.WALL:
				count += 1
	return count


# =========================================================================
#  Corridor Carving Between Sections
# =========================================================================

func _carve_section_corridor(tiles: Array, sec_a: BSPSection, sec_b: BSPSection, grid_w: int, grid_h: int) -> void:
	var from := sec_a.center
	var to := sec_b.center
	var half_w: int = CORRIDOR_CARVE_WIDTH / 2

	# Carve horizontal then vertical
	var current := from
	var step_x: int = 1 if to.x > from.x else -1
	while current.x != to.x:
		for oy in range(-half_w, half_w + 1):
			var tx: int = clampi(current.x, 0, grid_w - 1)
			var ty: int = clampi(current.y + oy, 0, grid_h - 1)
			if ty < tiles.size() and tx < tiles[0].size():
				tiles[ty][tx] = Constants.TileType.FLOOR
		current.x += step_x

	var step_y: int = 1 if to.y > from.y else -1
	while current.y != to.y:
		for ox in range(-half_w, half_w + 1):
			var tx: int = clampi(current.x + ox, 0, grid_w - 1)
			var ty: int = clampi(current.y, 0, grid_h - 1)
			if ty < tiles.size() and tx < tiles[0].size():
				tiles[ty][tx] = Constants.TileType.FLOOR
		current.y += step_y


# =========================================================================
#  Doorway Clearance
# =========================================================================

func _apply_doorway_clearance(tiles: Array, doorways: Array, grid_w: int, grid_h: int) -> void:
	for doorway in doorways:
		var dw: Vector2i = doorway
		# Clear 2-tile radius around doorway
		for dy in range(-DOORWAY_CLEAR_RADIUS, DOORWAY_CLEAR_RADIUS + 1):
			for dx in range(-DOORWAY_CLEAR_RADIUS, DOORWAY_CLEAR_RADIUS + 1):
				var tx: int = dw.x + dx
				var ty: int = dw.y + dy
				if tx >= 0 and tx < grid_w and ty >= 0 and ty < grid_h:
					tiles[ty][tx] = Constants.TileType.FLOOR

		# Carve 4-tile inward corridor toward center
		var center := Vector2i(grid_w / 2, grid_h / 2)
		var dir := Vector2i(signi(center.x - dw.x), signi(center.y - dw.y))
		if dir == Vector2i.ZERO:
			dir = Vector2i(0, -1)

		for step in range(1, DOORWAY_INWARD_LENGTH + 1):
			var tx: int = dw.x + dir.x * step
			var ty: int = dw.y + dir.y * step
			if tx >= 0 and tx < grid_w and ty >= 0 and ty < grid_h:
				tiles[ty][tx] = Constants.TileType.FLOOR
				# Widen the corridor by 1
				for side in [-1, 1]:
					var sx: int = tx + (dir.y * side)
					var sy: int = ty + (dir.x * side)
					if sx >= 0 and sx < grid_w and sy >= 0 and sy < grid_h:
						tiles[sy][sx] = Constants.TileType.FLOOR


# =========================================================================
#  Connectivity Validation
# =========================================================================

func _validate_connectivity_from_doorways(tiles: Array, doorways: Array, grid_w: int, grid_h: int) -> bool:
	if doorways.is_empty():
		return true

	# Flood fill from first doorway
	var start: Vector2i = doorways[0]
	var visited: Dictionary = _flood_fill(tiles, start, grid_w, grid_h)

	# Check all other doorways are reachable
	for i in range(1, doorways.size()):
		if not visited.has(doorways[i]):
			return false
	return true


func _flood_fill(tiles: Array, start: Vector2i, grid_w: int, grid_h: int) -> Dictionary:
	var visited: Dictionary = {}
	if start.x < 0 or start.x >= grid_w or start.y < 0 or start.y >= grid_h:
		return visited
	if tiles[start.y][start.x] == Constants.TileType.WALL:
		# Start from nearest floor tile
		for dy in range(-3, 4):
			for dx in range(-3, 4):
				var nx: int = start.x + dx
				var ny: int = start.y + dy
				if nx >= 0 and nx < grid_w and ny >= 0 and ny < grid_h:
					if tiles[ny][nx] != Constants.TileType.WALL:
						start = Vector2i(nx, ny)
						break

	var queue: Array = [start]
	visited[start] = true
	var directions: Array = [
		Vector2i(1, 0), Vector2i(-1, 0),
		Vector2i(0, 1), Vector2i(0, -1),
	]

	while not queue.is_empty():
		var pos: Vector2i = queue.pop_front()
		for d in directions:
			var np := pos + d
			if np.x >= 0 and np.x < grid_w and np.y >= 0 and np.y < grid_h:
				if not visited.has(np) and tiles[np.y][np.x] != Constants.TileType.WALL:
					visited[np] = true
					queue.append(np)
	return visited


func _force_connectivity(tiles: Array, doorways: Array, grid_w: int, grid_h: int) -> void:
	## Carves direct corridors between all doorways to guarantee connectivity.
	if doorways.size() < 2:
		return
	for i in range(doorways.size() - 1):
		var from: Vector2i = doorways[i]
		var to: Vector2i = doorways[i + 1]
		var current := from
		while current != to:
			if current.x >= 0 and current.x < grid_w and current.y >= 0 and current.y < grid_h:
				tiles[current.y][current.x] = Constants.TileType.FLOOR
			if current.x != to.x:
				current.x += signi(to.x - current.x)
			elif current.y != to.y:
				current.y += signi(to.y - current.y)
			else:
				break


# =========================================================================
#  Chamber Identification (Connected Components)
# =========================================================================

func _identify_chambers(tiles: Array, grid_w: int, grid_h: int, doorways: Array) -> Array:
	var visited: Dictionary = {}
	var chambers: Array = []
	var chamber_id: int = 0
	var directions: Array = [
		Vector2i(1, 0), Vector2i(-1, 0),
		Vector2i(0, 1), Vector2i(0, -1),
	]

	for y in range(grid_h):
		for x in range(grid_w):
			var pos := Vector2i(x, y)
			if visited.has(pos):
				continue
			if tiles[y][x] == Constants.TileType.WALL:
				continue

			# BFS to find connected component
			var component: Array = []
			var queue: Array = [pos]
			visited[pos] = true

			while not queue.is_empty():
				var current: Vector2i = queue.pop_front()
				component.append(current)
				for d in directions:
					var np := current + d
					if np.x >= 0 and np.x < grid_w and np.y >= 0 and np.y < grid_h:
						if not visited.has(np) and tiles[np.y][np.x] != Constants.TileType.WALL:
							visited[np] = true
							queue.append(np)

			if component.size() >= 4:
				var chamber := Chamber.new()
				chamber.id = chamber_id
				chamber.tiles = component
				chamber.area = component.size()

				# Calculate center
				var sum_x: int = 0
				var sum_y: int = 0
				for t in component:
					sum_x += t.x
					sum_y += t.y
				chamber.center = Vector2i(sum_x / component.size(), sum_y / component.size())

				# Calculate minimum distance from any doorway
				chamber.min_doorway_distance = INF
				for dw in doorways:
					var dist: float = float(chamber.center.distance_to(dw))
					chamber.min_doorway_distance = minf(chamber.min_doorway_distance, dist)

				chambers.append(chamber)
				chamber_id += 1

	return chambers


# =========================================================================
#  Safe Chamber Selection
# =========================================================================

func _find_safe_chamber(chambers: Array, doorways: Array) -> Chamber:
	## Returns the chamber furthest from all doorways.
	if chambers.is_empty():
		return null

	var best: Chamber = null
	var best_dist: float = -1.0

	for chamber in chambers:
		# Sum of distances to all doorways
		var total_dist: float = 0.0
		for dw in doorways:
			total_dist += float(chamber.center.distance_to(dw))

		if total_dist > best_dist:
			best_dist = total_dist
			best = chamber

	return best


# =========================================================================
#  Utility
# =========================================================================

func _create_grid(width: int, height: int, fill_value: int) -> Array:
	var grid: Array = []
	grid.resize(height)
	for y in height:
		var row: Array = []
		row.resize(width)
		row.fill(fill_value)
		grid[y] = row
	return grid


func _fill_rect_floor(tiles: Array, x: int, y: int, w: int, h: int) -> void:
	for ly in range(y, y + h):
		for lx in range(x, x + w):
			if ly >= 0 and ly < tiles.size() and lx >= 0 and lx < tiles[0].size():
				tiles[ly][lx] = Constants.TileType.FLOOR
