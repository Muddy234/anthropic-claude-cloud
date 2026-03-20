class_name DungeonGenerator
extends RefCounted
## BSP tree + blob growth dungeon generator.
## Produces organic-looking dungeon layouts by growing blobs within BSP leaves,
## then connecting them with wobbly corridors.

# --- Configuration Constants ---
const MAP_WIDTH: int = 180
const MAP_HEIGHT: int = 180
const MIN_LEAF_SIZE: int = 20
const MAX_LEAF_SIZE: int = 60
const BLOB_FILL_RATIO: float = 0.5
const BLOB_MIN_AREA: int = 100
const CORRIDOR_WIDTH: int = 4
const CORRIDOR_WOBBLE: float = 0.10
const DOGLEG_THRESHOLD: int = 15
const MAX_REGEN_ATTEMPTS: int = 3
const SHRINE_COUNT_MIN: int = 2
const SHRINE_COUNT_MAX: int = 4
const TREASURE_CHANCE: float = 0.15

# --- Element themes by distance tier ---
const ELEMENT_TIERS: Array = [
	Constants.Element.PHYSICAL,  # Near entrance
	Constants.Element.FIRE,
	Constants.Element.ICE,
	Constants.Element.EARTH,
	Constants.Element.DEATH,
	Constants.Element.ARCANE,
]


# =========================================================================
#  Inner Classes
# =========================================================================

class DungeonResult extends RefCounted:
	var tiles: Array = []          # 2D grid of Constants.TileType
	var blobs: Array = []          # Array[BlobData]
	var corridors: Array = []      # Array[CorridorData]
	var entrance_blob: BlobData = null
	var exit_position: Vector2i = Vector2i(-1, -1)
	var width: int = MAP_WIDTH
	var height: int = MAP_HEIGHT
	var seed_value: int = 0
	var floor_number: int = 1
	var valid: bool = false


class BlobData extends RefCounted:
	var id: int = 0
	var tiles: Array = []          # Array[Vector2i]
	var center: Vector2i = Vector2i.ZERO
	var bounds: Rect2i = Rect2i()
	var element: Constants.Element = Constants.Element.PHYSICAL
	var room_type: String = "combat"  # combat, entrance, shrine, treasure
	var doorways: Array = []       # Array[Vector2i] - connection points
	var distance_from_entrance: float = 0.0
	var leaf_rect: Rect2i = Rect2i()
	var area: int = 0


class CorridorData extends RefCounted:
	var tiles: Array = []          # Array[Vector2i]
	var from_blob_id: int = -1
	var to_blob_id: int = -1
	var width: int = CORRIDOR_WIDTH


class Leaf extends RefCounted:
	var x: int
	var y: int
	var w: int
	var h: int
	var left: Leaf = null
	var right: Leaf = null
	var blob: BlobData = null
	var sibling: Leaf = null

	func _init(p_x: int, p_y: int, p_w: int, p_h: int) -> void:
		x = p_x
		y = p_y
		w = p_w
		h = p_h

	func split(rng: SeededRNG) -> bool:
		if left != null or right != null:
			return false
		# Determine split direction based on aspect ratio + randomness
		var split_h: bool
		if float(w) / float(h) >= 1.25:
			split_h = false
		elif float(h) / float(w) >= 1.25:
			split_h = true
		else:
			split_h = rng.chance(0.5)

		var max_size: int = (h if split_h else w) - MIN_LEAF_SIZE
		if max_size < MIN_LEAF_SIZE:
			return false

		var split_pos: int = rng.random_int(MIN_LEAF_SIZE, max_size)

		if split_h:
			left = Leaf.new(x, y, w, split_pos)
			right = Leaf.new(x, y + split_pos, w, h - split_pos)
		else:
			left = Leaf.new(x, y, split_pos, h)
			right = Leaf.new(x + split_pos, y, w - split_pos, h)

		left.sibling = right
		right.sibling = left
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

	func get_sibling_pairs() -> Array:
		## Returns Array of [Leaf, Leaf] pairs for corridor connections.
		if left == null and right == null:
			return []
		var pairs: Array = []
		if left and right:
			# Get one leaf from each child to connect
			var left_leaves := left.get_leaves()
			var right_leaves := right.get_leaves()
			if not left_leaves.is_empty() and not right_leaves.is_empty():
				pairs.append([left_leaves[0], right_leaves[0]])
			pairs.append_array(left.get_sibling_pairs())
			pairs.append_array(right.get_sibling_pairs())
		return pairs


# =========================================================================
#  Main Generation
# =========================================================================

func generate(p_seed: Variant, floor_number: int) -> DungeonResult:
	var rng := SeededRNG.new(p_seed)

	for attempt in MAX_REGEN_ATTEMPTS:
		var result := _generate_attempt(rng.child("attempt_%d" % attempt), floor_number)
		if result.valid:
			result.seed_value = rng.seed_value
			result.floor_number = floor_number
			return result

	# Return last attempt even if invalid, caller can handle
	push_warning("DungeonGenerator: All %d regen attempts failed" % MAX_REGEN_ATTEMPTS)
	var fallback := _generate_attempt(rng.child("fallback"), floor_number)
	fallback.seed_value = rng.seed_value
	fallback.floor_number = floor_number
	return fallback


func _generate_attempt(rng: SeededRNG, floor_number: int) -> DungeonResult:
	var result := DungeonResult.new()
	result.floor_number = floor_number

	# Initialize tile grid to walls
	result.tiles = _create_grid(MAP_WIDTH, MAP_HEIGHT, Constants.TileType.WALL)

	# --- BSP Splitting ---
	var root := Leaf.new(2, 2, MAP_WIDTH - 4, MAP_HEIGHT - 4)
	var leaves_to_split: Array = [root]

	while not leaves_to_split.is_empty():
		var next_batch: Array = []
		for leaf in leaves_to_split:
			if leaf.w > MAX_LEAF_SIZE or leaf.h > MAX_LEAF_SIZE or rng.chance(0.8):
				if leaf.split(rng):
					next_batch.append(leaf.left)
					next_batch.append(leaf.right)
		leaves_to_split = next_batch

	var terminal_leaves := root.get_leaves()
	if terminal_leaves.size() < 4:
		return result

	# --- Blob Growth ---
	var blob_id: int = 0
	for leaf in terminal_leaves:
		var blob := _grow_blob(rng, leaf, blob_id, result.tiles)
		if blob != null:
			leaf.blob = blob
			result.blobs.append(blob)
			blob_id += 1

	if result.blobs.size() < 3:
		return result

	# --- Corridor Carving ---
	var sibling_pairs := root.get_sibling_pairs()
	for pair in sibling_pairs:
		var leaf_a: Leaf = pair[0]
		var leaf_b: Leaf = pair[1]
		if leaf_a.blob and leaf_b.blob:
			var corridor := _carve_corridor(rng, leaf_a.blob, leaf_b.blob, result.tiles)
			if corridor:
				result.corridors.append(corridor)

	# --- Assign Blob Types ---
	_assign_blob_types(rng, result, floor_number)

	# --- Assign Elements/Themes ---
	_assign_elements(rng, result, floor_number)

	# --- Connectivity Check ---
	result.valid = _validate_connectivity(result)

	# --- Place Exit ---
	if result.valid:
		result.exit_position = _place_exit(rng, result)

	return result


# =========================================================================
#  Blob Growth (Random Walk)
# =========================================================================

func _grow_blob(rng: SeededRNG, leaf: Leaf, id: int, tiles: Array) -> BlobData:
	var target_area: int = maxi(int(leaf.w * leaf.h * BLOB_FILL_RATIO), BLOB_MIN_AREA)
	var center := Vector2i(leaf.x + leaf.w / 2, leaf.y + leaf.h / 2)

	var blob_tiles: Dictionary = {}
	var frontier: Array = [center]
	blob_tiles[center] = true

	# Padding to keep blobs away from leaf edges
	var padding: int = 2
	var min_x: int = leaf.x + padding
	var max_x: int = leaf.x + leaf.w - padding - 1
	var min_y: int = leaf.y + padding
	var max_y: int = leaf.y + leaf.h - padding - 1

	var directions: Array = [
		Vector2i(1, 0), Vector2i(-1, 0),
		Vector2i(0, 1), Vector2i(0, -1),
	]

	var iterations: int = 0
	var max_iterations: int = target_area * 10

	while blob_tiles.size() < target_area and not frontier.is_empty() and iterations < max_iterations:
		iterations += 1
		var idx := int(rng.random() * frontier.size()) % frontier.size()
		var pos: Vector2i = frontier[idx]

		var dir: Vector2i = directions[int(rng.random() * 4) % 4]
		var new_pos := pos + dir

		if new_pos.x >= min_x and new_pos.x <= max_x and \
		   new_pos.y >= min_y and new_pos.y <= max_y and \
		   not blob_tiles.has(new_pos):
			blob_tiles[new_pos] = true
			frontier.append(new_pos)

		# Remove frontier nodes that are fully surrounded
		if rng.chance(0.1) and frontier.size() > 1:
			var check_pos: Vector2i = frontier[idx]
			var surrounded := true
			for d in directions:
				if not blob_tiles.has(check_pos + d):
					surrounded = false
					break
			if surrounded:
				frontier.remove_at(idx)

	if blob_tiles.size() < BLOB_MIN_AREA:
		return null

	# Build BlobData
	var blob := BlobData.new()
	blob.id = id
	blob.tiles = blob_tiles.keys()
	blob.area = blob.tiles.size()
	blob.leaf_rect = Rect2i(leaf.x, leaf.y, leaf.w, leaf.h)

	# Calculate center and bounds
	var sum_x: int = 0
	var sum_y: int = 0
	var b_min_x: int = MAP_WIDTH
	var b_min_y: int = MAP_HEIGHT
	var b_max_x: int = 0
	var b_max_y: int = 0

	for tile_pos in blob.tiles:
		sum_x += tile_pos.x
		sum_y += tile_pos.y
		b_min_x = mini(b_min_x, tile_pos.x)
		b_min_y = mini(b_min_y, tile_pos.y)
		b_max_x = maxi(b_max_x, tile_pos.x)
		b_max_y = maxi(b_max_y, tile_pos.y)

	blob.center = Vector2i(sum_x / blob.tiles.size(), sum_y / blob.tiles.size())
	blob.bounds = Rect2i(b_min_x, b_min_y, b_max_x - b_min_x + 1, b_max_y - b_min_y + 1)

	# Apply blob to tile grid
	for tile_pos in blob.tiles:
		tiles[tile_pos.y][tile_pos.x] = Constants.TileType.FLOOR

	return blob


# =========================================================================
#  Corridor Carving
# =========================================================================

func _carve_corridor(rng: SeededRNG, blob_a: BlobData, blob_b: BlobData, tiles: Array) -> CorridorData:
	var start := blob_a.center
	var end_pos := blob_b.center
	var corridor := CorridorData.new()
	corridor.from_blob_id = blob_a.id
	corridor.to_blob_id = blob_b.id

	var corridor_tiles: Dictionary = {}
	var current := start
	var half_w: int = CORRIDOR_WIDTH / 2

	# Determine if we need a dogleg
	var dx: int = absi(end_pos.x - current.x)
	var dy: int = absi(end_pos.y - current.y)
	var use_dogleg: bool = dx > DOGLEG_THRESHOLD and dy > DOGLEG_THRESHOLD

	if use_dogleg:
		# L-shaped corridor with a bend point
		var bend: Vector2i
		if rng.chance(0.5):
			bend = Vector2i(end_pos.x, current.y)
		else:
			bend = Vector2i(current.x, end_pos.y)
		_carve_line(current, bend, half_w, tiles, corridor_tiles, rng)
		_carve_line(bend, end_pos, half_w, tiles, corridor_tiles, rng)
	else:
		# Horizontal then vertical
		var mid := Vector2i(end_pos.x, current.y)
		_carve_line(current, mid, half_w, tiles, corridor_tiles, rng)
		_carve_line(mid, end_pos, half_w, tiles, corridor_tiles, rng)

	corridor.tiles = corridor_tiles.keys()

	# Register doorway points on blobs
	if not corridor.tiles.is_empty():
		blob_a.doorways.append(corridor.tiles[0])
		blob_b.doorways.append(corridor.tiles[-1])

	return corridor


func _carve_line(from: Vector2i, to: Vector2i, half_w: int, tiles: Array, carved: Dictionary, rng: SeededRNG) -> void:
	var steps: int = maxi(absi(to.x - from.x), absi(to.y - from.y))
	if steps == 0:
		return

	for i in range(steps + 1):
		var t: float = float(i) / float(steps)
		var px: int = int(lerpf(float(from.x), float(to.x), t))
		var py: int = int(lerpf(float(from.y), float(to.y), t))

		# Apply wobble
		var wobble_x: int = int(rng.gaussian(0.0, CORRIDOR_WOBBLE * CORRIDOR_WIDTH))
		var wobble_y: int = int(rng.gaussian(0.0, CORRIDOR_WOBBLE * CORRIDOR_WIDTH))

		for ox in range(-half_w, half_w + 1):
			for oy in range(-half_w, half_w + 1):
				var tx: int = clampi(px + ox + wobble_x, 1, MAP_WIDTH - 2)
				var ty: int = clampi(py + oy + wobble_y, 1, MAP_HEIGHT - 2)
				var pos := Vector2i(tx, ty)
				if not carved.has(pos):
					carved[pos] = true
					tiles[ty][tx] = Constants.TileType.FLOOR


# =========================================================================
#  Blob Type Assignment
# =========================================================================

func _assign_blob_types(rng: SeededRNG, result: DungeonResult, _floor_number: int) -> void:
	if result.blobs.is_empty():
		return

	# Entrance: center-most blob
	var map_center := Vector2i(MAP_WIDTH / 2, MAP_HEIGHT / 2)
	var best_entrance: BlobData = null
	var best_dist: float = INF

	for blob in result.blobs:
		var dist := float(blob.center.distance_to(map_center))
		if dist < best_dist:
			best_dist = dist
			best_entrance = blob

	best_entrance.room_type = "entrance"
	result.entrance_blob = best_entrance

	# Calculate distances from entrance
	for blob in result.blobs:
		blob.distance_from_entrance = float(blob.center.distance_to(best_entrance.center))

	# Sort blobs by distance (furthest first) for type assignment
	var sorted_blobs: Array = result.blobs.duplicate()
	sorted_blobs.sort_custom(func(a: BlobData, b: BlobData) -> bool:
		return a.distance_from_entrance > b.distance_from_entrance
	)

	# Shrines: dead-end blobs (fewest doorways), pick 2-4
	var shrine_count: int = rng.random_int(SHRINE_COUNT_MIN, SHRINE_COUNT_MAX)
	var shrines_placed: int = 0

	# Find dead-end candidates (blobs with only 1 doorway connection)
	var dead_ends: Array = []
	for blob in sorted_blobs:
		if blob.room_type == "entrance":
			continue
		if blob.doorways.size() <= 1:
			dead_ends.append(blob)

	for blob in dead_ends:
		if shrines_placed >= shrine_count:
			break
		blob.room_type = "shrine"
		shrines_placed += 1

	# Treasure rooms: ~15% of remaining
	for blob in sorted_blobs:
		if blob.room_type != "combat":
			continue
		if rng.chance(TREASURE_CHANCE):
			blob.room_type = "treasure"

	# Rest stay as "combat"


# =========================================================================
#  Element Assignment
# =========================================================================

func _assign_elements(rng: SeededRNG, result: DungeonResult, floor_number: int) -> void:
	if result.blobs.is_empty():
		return

	# Determine max distance for normalization
	var max_dist: float = 0.0
	for blob in result.blobs:
		max_dist = maxf(max_dist, blob.distance_from_entrance)

	if max_dist < 1.0:
		max_dist = 1.0

	# Floor-based element pool
	var floor_elements: Array = []
	# Add base physical
	floor_elements.append(Constants.Element.PHYSICAL)
	# Add elements based on floor depth
	if floor_number >= 1:
		floor_elements.append(Constants.Element.FIRE)
	if floor_number >= 2:
		floor_elements.append(Constants.Element.ICE)
	if floor_number >= 3:
		floor_elements.append(Constants.Element.EARTH)
	if floor_number >= 4:
		floor_elements.append(Constants.Element.DEATH)
	if floor_number >= 5:
		floor_elements.append(Constants.Element.ARCANE)

	for blob in result.blobs:
		var norm_dist: float = blob.distance_from_entrance / max_dist
		# Nearer blobs get earlier elements, farther blobs get later elements
		var tier_index: int = clampi(int(norm_dist * float(floor_elements.size())), 0, floor_elements.size() - 1)

		# Add some randomness (can shift +/- 1 tier)
		if rng.chance(0.3) and tier_index > 0:
			tier_index -= 1
		elif rng.chance(0.3) and tier_index < floor_elements.size() - 1:
			tier_index += 1

		blob.element = floor_elements[tier_index]


# =========================================================================
#  Connectivity Validation (Flood Fill)
# =========================================================================

func _validate_connectivity(result: DungeonResult) -> bool:
	if result.blobs.is_empty():
		return false

	# Find first floor tile as start
	var start := Vector2i(-1, -1)
	if result.entrance_blob and not result.entrance_blob.tiles.is_empty():
		start = result.entrance_blob.tiles[0]
	else:
		for y in MAP_HEIGHT:
			for x in MAP_WIDTH:
				if result.tiles[y][x] == Constants.TileType.FLOOR:
					start = Vector2i(x, y)
					break
			if start.x >= 0:
				break

	if start.x < 0:
		return false

	# BFS flood fill
	var visited: Dictionary = {}
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
			if np.x >= 0 and np.x < MAP_WIDTH and np.y >= 0 and np.y < MAP_HEIGHT:
				if not visited.has(np) and result.tiles[np.y][np.x] == Constants.TileType.FLOOR:
					visited[np] = true
					queue.append(np)

	# Check that every blob has at least one tile reachable
	for blob in result.blobs:
		var blob_reachable := false
		for tile_pos in blob.tiles:
			if visited.has(tile_pos):
				blob_reachable = true
				break
		if not blob_reachable:
			return false

	return true


# =========================================================================
#  Exit Placement
# =========================================================================

func _place_exit(rng: SeededRNG, result: DungeonResult) -> Vector2i:
	# Place exit in the blob furthest from entrance
	var best_blob: BlobData = null
	var best_dist: float = 0.0

	for blob in result.blobs:
		if blob == result.entrance_blob:
			continue
		if blob.distance_from_entrance > best_dist:
			best_dist = blob.distance_from_entrance
			best_blob = blob

	if best_blob == null:
		best_blob = result.blobs.back()

	var exit_pos := best_blob.center
	if exit_pos.x >= 0 and exit_pos.x < MAP_WIDTH and exit_pos.y >= 0 and exit_pos.y < MAP_HEIGHT:
		result.tiles[exit_pos.y][exit_pos.x] = Constants.TileType.EXIT

	return exit_pos


# =========================================================================
#  Utility
# =========================================================================

func _create_grid(width: int, height: int, fill_value: Constants.TileType) -> Array:
	var grid: Array = []
	grid.resize(height)
	for y in height:
		var row: Array = []
		row.resize(width)
		row.fill(fill_value)
		grid[y] = row
	return grid
