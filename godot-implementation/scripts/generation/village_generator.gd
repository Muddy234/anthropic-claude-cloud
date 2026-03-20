class_name VillageGenerator
extends RefCounted
## Hub village layout generator.
## Produces a deterministic 50x40 village map with fixed building positions,
## paths connecting to the town square, decorations, and NPC spawn points.

# --- Map Dimensions ---
const MAP_WIDTH: int = 50
const MAP_HEIGHT: int = 40

# --- Tile Types (mapped to Constants.TileType) ---
# grass, path, cobblestone, stone_border, wall, door, floor, fence,
# cave_wall, cave_floor, cave_entrance

# --- Building Definitions ---
# { name: String, x: int, y: int, w: int, h: int, type: String, entrance_dir: String }
const BUILDING_DEFS: Array = [
	{ "name": "town_square", "x": 21, "y": 16, "w": 8, "h": 8, "type": "open", "entrance_dir": "none" },
	{ "name": "bank", "x": 5, "y": 5, "w": 8, "h": 6, "type": "building", "entrance_dir": "south" },
	{ "name": "smithy", "x": 38, "y": 5, "w": 7, "h": 6, "type": "building", "entrance_dir": "south" },
	{ "name": "tavern", "x": 5, "y": 25, "w": 9, "h": 7, "type": "building", "entrance_dir": "north" },
	{ "name": "player_house", "x": 38, "y": 30, "w": 7, "h": 6, "type": "building", "entrance_dir": "north" },
	{ "name": "expedition_hall", "x": 20, "y": 5, "w": 10, "h": 6, "type": "building", "entrance_dir": "south" },
	{ "name": "shrine", "x": 40, "y": 20, "w": 6, "h": 5, "type": "open", "entrance_dir": "west" },
	{ "name": "chasm_entrance", "x": 22, "y": 32, "w": 6, "h": 5, "type": "entrance", "entrance_dir": "north" },
	{ "name": "training_ground", "x": 12, "y": 5, "w": 6, "h": 6, "type": "open", "entrance_dir": "south" },
]

# --- NPC Definitions ---
const NPC_DEFS: Array = [
	{ "role": "banker", "building": "bank", "offset_x": 3, "offset_y": 3 },
	{ "role": "blacksmith", "building": "smithy", "offset_x": 3, "offset_y": 3 },
	{ "role": "innkeeper", "building": "tavern", "offset_x": 4, "offset_y": 3 },
	{ "role": "elder", "building": "town_square", "offset_x": 4, "offset_y": 4 },
	{ "role": "expedition_master", "building": "expedition_hall", "offset_x": 5, "offset_y": 3 },
	{ "role": "priestess", "building": "shrine", "offset_x": 3, "offset_y": 2 },
	{ "role": "trainer", "building": "training_ground", "offset_x": 3, "offset_y": 3 },
	{ "role": "bounty_board", "building": "town_square", "offset_x": 1, "offset_y": 1 },
]

# --- Decoration Positions ---
const WELL_POS: Vector2i = Vector2i(25, 19)
const BULLETIN_BOARD_POS: Vector2i = Vector2i(22, 17)

const BENCH_POSITIONS: Array = [
	Vector2i(20, 20), Vector2i(28, 20), Vector2i(24, 15),
]

const TRAINING_DUMMY_POSITIONS: Array = [
	Vector2i(14, 8), Vector2i(16, 8), Vector2i(15, 9),
]


# =========================================================================
#  Inner Classes
# =========================================================================

class VillageResult extends RefCounted:
	var tiles: Array = []             # 2D grid of Constants.TileType
	var width: int = MAP_WIDTH
	var height: int = MAP_HEIGHT
	var buildings: Array = []         # Array[BuildingData]
	var npc_positions: Array = []     # Array[Dictionary] with x, y, role
	var decoration_positions: Array = [] # Array[Dictionary]
	var player_spawn: Vector2i = Vector2i(25, 20)


class BuildingData extends RefCounted:
	var name: String = ""
	var x: int = 0
	var y: int = 0
	var w: int = 0
	var h: int = 0
	var type: String = "building"     # building, open, entrance
	var entrance_dir: String = "south"
	var entrance_pos: Vector2i = Vector2i.ZERO
	var interior_tiles: Array = []    # Array[Vector2i]


# =========================================================================
#  Main Generation (Deterministic, no RNG)
# =========================================================================

func generate() -> VillageResult:
	var result := VillageResult.new()

	# Initialize tile grid to grass
	result.tiles = _create_grid(MAP_WIDTH, MAP_HEIGHT, Constants.TileType.GRASS)

	# --- Place Fence Border ---
	_place_fence_border(result.tiles)

	# --- Place Buildings ---
	for bdef in BUILDING_DEFS:
		var building := _place_building(result.tiles, bdef)
		result.buildings.append(building)

	# --- Generate Paths (L-shaped to town square center) ---
	var town_center := Vector2i(25, 20)
	for building in result.buildings:
		if building.name == "town_square":
			continue
		_carve_path(result.tiles, building.entrance_pos, town_center)

	# --- Place Decorations ---
	_place_decorations(result)

	# --- Calculate NPC Positions ---
	result.npc_positions = _calculate_npc_positions(result.buildings)

	return result


# =========================================================================
#  Fence Border
# =========================================================================

func _place_fence_border(tiles: Array) -> void:
	for x in range(MAP_WIDTH):
		tiles[0][x] = Constants.TileType.FENCE
		tiles[MAP_HEIGHT - 1][x] = Constants.TileType.FENCE
	for y in range(MAP_HEIGHT):
		tiles[y][0] = Constants.TileType.FENCE
		tiles[y][MAP_WIDTH - 1] = Constants.TileType.FENCE


# =========================================================================
#  Building Placement
# =========================================================================

func _place_building(tiles: Array, bdef: Dictionary) -> BuildingData:
	var building := BuildingData.new()
	building.name = bdef["name"]
	building.x = bdef["x"]
	building.y = bdef["y"]
	building.w = bdef["w"]
	building.h = bdef["h"]
	building.type = bdef["type"]
	building.entrance_dir = bdef["entrance_dir"]

	match bdef["type"]:
		"building":
			_place_walled_building(tiles, building)
		"open":
			_place_open_area(tiles, building)
		"entrance":
			_place_chasm_entrance(tiles, building)

	return building


func _place_walled_building(tiles: Array, building: BuildingData) -> void:
	var bx: int = building.x
	var by: int = building.y
	var bw: int = building.w
	var bh: int = building.h

	# Walls
	for x in range(bx, bx + bw):
		for y in range(by, by + bh):
			if _in_bounds(x, y):
				if x == bx or x == bx + bw - 1 or y == by or y == by + bh - 1:
					tiles[y][x] = Constants.TileType.WALL
				else:
					tiles[y][x] = Constants.TileType.FLOOR
					building.interior_tiles.append(Vector2i(x, y))

	# Stone border around building
	for x in range(bx - 1, bx + bw + 1):
		for y in range(by - 1, by + bh + 1):
			if _in_bounds(x, y) and tiles[y][x] == Constants.TileType.GRASS:
				tiles[y][x] = Constants.TileType.STONE_BORDER

	# Door placement
	var door_pos := _get_entrance_position(building)
	building.entrance_pos = door_pos
	if _in_bounds(door_pos.x, door_pos.y):
		tiles[door_pos.y][door_pos.x] = Constants.TileType.DOOR


func _place_open_area(tiles: Array, building: BuildingData) -> void:
	var bx: int = building.x
	var by: int = building.y
	var bw: int = building.w
	var bh: int = building.h

	# Cobblestone surface
	for x in range(bx, bx + bw):
		for y in range(by, by + bh):
			if _in_bounds(x, y):
				tiles[y][x] = Constants.TileType.COBBLESTONE
				building.interior_tiles.append(Vector2i(x, y))

	# Stone border around open area
	for x in range(bx - 1, bx + bw + 1):
		for y in range(by - 1, by + bh + 1):
			if _in_bounds(x, y) and tiles[y][x] == Constants.TileType.GRASS:
				tiles[y][x] = Constants.TileType.STONE_BORDER

	building.entrance_pos = _get_entrance_position(building)


func _place_chasm_entrance(tiles: Array, building: BuildingData) -> void:
	var bx: int = building.x
	var by: int = building.y
	var bw: int = building.w
	var bh: int = building.h

	# Cave walls around the perimeter
	for x in range(bx, bx + bw):
		for y in range(by, by + bh):
			if _in_bounds(x, y):
				if x == bx or x == bx + bw - 1 or y == by or y == by + bh - 1:
					tiles[y][x] = Constants.TileType.CAVE_WALL
				else:
					tiles[y][x] = Constants.TileType.CAVE_FLOOR
					building.interior_tiles.append(Vector2i(x, y))

	# Entrance marker at center
	var cx: int = bx + bw / 2
	var cy: int = by + bh / 2
	if _in_bounds(cx, cy):
		tiles[cy][cx] = Constants.TileType.CAVE_ENTRANCE

	building.entrance_pos = _get_entrance_position(building)


func _get_entrance_position(building: BuildingData) -> Vector2i:
	var bx: int = building.x
	var by: int = building.y
	var bw: int = building.w
	var bh: int = building.h

	match building.entrance_dir:
		"north": return Vector2i(bx + bw / 2, by)
		"south": return Vector2i(bx + bw / 2, by + bh - 1)
		"east": return Vector2i(bx + bw - 1, by + bh / 2)
		"west": return Vector2i(bx, by + bh / 2)
		_: return Vector2i(bx + bw / 2, by + bh / 2)


# =========================================================================
#  Path Generation (L-shaped)
# =========================================================================

func _carve_path(tiles: Array, from: Vector2i, to: Vector2i) -> void:
	## Carves an L-shaped path from building entrance to town square.
	var current := from

	# Horizontal first
	var step_x: int = signi(to.x - current.x)
	while current.x != to.x:
		if _in_bounds(current.x, current.y):
			if tiles[current.y][current.x] == Constants.TileType.GRASS:
				tiles[current.y][current.x] = Constants.TileType.PATH
			# Widen path by 1
			if _in_bounds(current.x, current.y - 1) and tiles[current.y - 1][current.x] == Constants.TileType.GRASS:
				tiles[current.y - 1][current.x] = Constants.TileType.PATH
		current.x += step_x

	# Vertical
	var step_y: int = signi(to.y - current.y)
	while current.y != to.y:
		if _in_bounds(current.x, current.y):
			if tiles[current.y][current.x] == Constants.TileType.GRASS:
				tiles[current.y][current.x] = Constants.TileType.PATH
			# Widen path by 1
			if _in_bounds(current.x - 1, current.y) and tiles[current.y][current.x - 1] == Constants.TileType.GRASS:
				tiles[current.y][current.x - 1] = Constants.TileType.PATH
		current.y += step_y


# =========================================================================
#  Decoration Placement
# =========================================================================

func _place_decorations(result: VillageResult) -> void:
	var tiles := result.tiles

	# --- Trees (15 total) ---
	var tree_positions: Array = [
		Vector2i(3, 3), Vector2i(3, 15), Vector2i(3, 35),
		Vector2i(10, 15), Vector2i(10, 22), Vector2i(10, 35),
		Vector2i(18, 14), Vector2i(18, 28),
		Vector2i(32, 3), Vector2i(32, 14), Vector2i(32, 28),
		Vector2i(46, 3), Vector2i(46, 15), Vector2i(46, 28), Vector2i(46, 35),
	]
	for pos in tree_positions:
		if _in_bounds(pos.x, pos.y) and tiles[pos.y][pos.x] == Constants.TileType.GRASS:
			result.decoration_positions.append({"type": "tree", "x": pos.x, "y": pos.y})

	# --- Bushes/Flowers (20 total) ---
	var bush_positions: Array = [
		Vector2i(4, 10), Vector2i(6, 12), Vector2i(8, 20),
		Vector2i(11, 3), Vector2i(13, 14), Vector2i(15, 22),
		Vector2i(17, 30), Vector2i(19, 12), Vector2i(21, 28),
		Vector2i(23, 14), Vector2i(27, 14), Vector2i(29, 22),
		Vector2i(31, 10), Vector2i(33, 20), Vector2i(35, 28),
		Vector2i(37, 12), Vector2i(39, 28), Vector2i(41, 14),
		Vector2i(43, 22), Vector2i(45, 10),
	]
	for pos in bush_positions:
		if _in_bounds(pos.x, pos.y) and tiles[pos.y][pos.x] == Constants.TileType.GRASS:
			result.decoration_positions.append({"type": "bush", "x": pos.x, "y": pos.y})

	# --- Well ---
	if _in_bounds(WELL_POS.x, WELL_POS.y):
		result.decoration_positions.append({"type": "well", "x": WELL_POS.x, "y": WELL_POS.y})

	# --- Bulletin Board ---
	if _in_bounds(BULLETIN_BOARD_POS.x, BULLETIN_BOARD_POS.y):
		result.decoration_positions.append({"type": "bulletin_board", "x": BULLETIN_BOARD_POS.x, "y": BULLETIN_BOARD_POS.y})

	# --- Training Dummies ---
	for pos in TRAINING_DUMMY_POSITIONS:
		if _in_bounds(pos.x, pos.y):
			result.decoration_positions.append({"type": "training_dummy", "x": pos.x, "y": pos.y})

	# --- Benches ---
	for pos in BENCH_POSITIONS:
		if _in_bounds(pos.x, pos.y):
			result.decoration_positions.append({"type": "bench", "x": pos.x, "y": pos.y})


# =========================================================================
#  NPC Position Calculation
# =========================================================================

func _calculate_npc_positions(buildings: Array) -> Array:
	var positions: Array = []

	# Build lookup by name
	var building_map: Dictionary = {}
	for building in buildings:
		building_map[building.name] = building

	for npc_def in NPC_DEFS:
		var building_name: String = npc_def["building"]
		if not building_map.has(building_name):
			continue

		var building: BuildingData = building_map[building_name]
		var npc_x: int = building.x + npc_def["offset_x"]
		var npc_y: int = building.y + npc_def["offset_y"]

		positions.append({
			"role": npc_def["role"],
			"x": npc_x,
			"y": npc_y,
			"building": building_name,
		})

	return positions


# =========================================================================
#  Utility
# =========================================================================

func _in_bounds(x: int, y: int) -> bool:
	return x >= 0 and x < MAP_WIDTH and y >= 0 and y < MAP_HEIGHT


func _create_grid(width: int, height: int, fill_value: int) -> Array:
	var grid: Array = []
	grid.resize(height)
	for y in height:
		var row: Array = []
		row.resize(width)
		row.fill(fill_value)
		grid[y] = row
	return grid
