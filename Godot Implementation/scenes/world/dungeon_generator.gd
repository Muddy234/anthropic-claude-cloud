class_name DungeonGenerator
extends RefCounted

## Procedural dungeon generator using room placement and corridor connection

const MIN_ROOM_SIZE := 5
const MAX_ROOM_SIZE := 15
const MIN_ROOMS := 8
const MAX_ROOMS := 15
const CORRIDOR_WIDTH := 1

var width: int
var height: int
var tiles: Array  # 2D array of TileType
var rooms: Array[Rect2i] = []
var corridors: Array[Array] = []  # Array of Vector2i arrays

## Generate a new dungeon floor
func generate(w: int, h: int, floor_num: int) -> Dictionary:
	width = w
	height = h
	_init_tiles()

	# Seed affects room count and placement
	var num_rooms := randi_range(MIN_ROOMS, MAX_ROOMS) + int(floor_num * 0.5)
	num_rooms = mini(num_rooms, 20)

	# Place rooms
	for _i in num_rooms * 3:  # Try 3x to place all rooms
		if rooms.size() >= num_rooms:
			break
		_try_place_room()

	if rooms.is_empty():
		# Fallback: create at least one room
		var fallback_room := Rect2i(5, 5, 10, 10)
		_carve_room(fallback_room)
		rooms.append(fallback_room)

	# Connect rooms with corridors
	_connect_rooms()

	# Place doors at corridor-room intersections
	_place_doors()

	# Place stairs
	var stairs_down := _place_stairs(Constants.TileType.STAIRS_DOWN)
	var stairs_up := _place_stairs(Constants.TileType.STAIRS_UP)

	# Ensure stairs aren't in same room
	while _get_room_at(stairs_down) == _get_room_at(stairs_up) and rooms.size() > 1:
		stairs_down = _place_stairs(Constants.TileType.STAIRS_DOWN)

	# Generate spawn points
	var enemy_spawns := _generate_enemy_spawns(floor_num)
	var item_spawns := _generate_item_spawns(floor_num)
	var npc_spawns := _generate_npc_spawns(floor_num)

	return {
		"tiles": tiles,
		"rooms": rooms,
		"corridors": corridors,
		"stairs_down": stairs_down,
		"stairs_up": stairs_up,
		"player_spawn": _get_player_spawn(stairs_up),
		"enemy_spawns": enemy_spawns,
		"item_spawns": item_spawns,
		"npc_spawns": npc_spawns
	}

## Initialize tiles to all walls
func _init_tiles():
	tiles = []
	for x in width:
		var column := []
		for y in height:
			column.append(Constants.TileType.WALL)
		tiles.append(column)

## Try to place a room
func _try_place_room():
	var room_width := randi_range(MIN_ROOM_SIZE, MAX_ROOM_SIZE)
	var room_height := randi_range(MIN_ROOM_SIZE, MAX_ROOM_SIZE)
	var x := randi_range(2, width - room_width - 2)
	var y := randi_range(2, height - room_height - 2)

	var new_room := Rect2i(x, y, room_width, room_height)

	# Check overlap with existing rooms (with padding)
	for room in rooms:
		if room.grow(2).intersects(new_room):
			return

	# Carve the room
	_carve_room(new_room)
	rooms.append(new_room)

## Carve a room into the tiles
func _carve_room(room: Rect2i):
	for rx in range(room.position.x, room.end.x):
		for ry in range(room.position.y, room.end.y):
			if rx >= 0 and rx < width and ry >= 0 and ry < height:
				tiles[rx][ry] = Constants.TileType.FLOOR

## Connect all rooms with corridors
func _connect_rooms():
	if rooms.size() < 2:
		return

	# Connect each room to the next
	for i in range(1, rooms.size()):
		var prev_center := rooms[i - 1].get_center()
		var curr_center := rooms[i].get_center()

		var corridor := []

		# Randomly choose horizontal-first or vertical-first
		if randf() < 0.5:
			corridor.append_array(_carve_h_corridor(prev_center.x, curr_center.x, prev_center.y))
			corridor.append_array(_carve_v_corridor(prev_center.y, curr_center.y, curr_center.x))
		else:
			corridor.append_array(_carve_v_corridor(prev_center.y, curr_center.y, prev_center.x))
			corridor.append_array(_carve_h_corridor(prev_center.x, curr_center.x, curr_center.y))

		corridors.append(corridor)

	# Optionally add extra connections for loops
	if rooms.size() > 4 and randf() < 0.5:
		var room_a := rooms[randi() % rooms.size()]
		var room_b := rooms[randi() % rooms.size()]
		if room_a != room_b:
			var corridor := []
			corridor.append_array(_carve_h_corridor(room_a.get_center().x, room_b.get_center().x, room_a.get_center().y))
			corridor.append_array(_carve_v_corridor(room_a.get_center().y, room_b.get_center().y, room_b.get_center().x))
			corridors.append(corridor)

## Carve horizontal corridor
func _carve_h_corridor(x1: int, x2: int, y: int) -> Array[Vector2i]:
	var carved: Array[Vector2i] = []
	for x in range(mini(x1, x2), maxi(x1, x2) + 1):
		for w in range(-CORRIDOR_WIDTH / 2, CORRIDOR_WIDTH / 2 + 1):
			var cy := y + w
			if x >= 0 and x < width and cy >= 0 and cy < height:
				if tiles[x][cy] == Constants.TileType.WALL:
					tiles[x][cy] = Constants.TileType.FLOOR
					carved.append(Vector2i(x, cy))
	return carved

## Carve vertical corridor
func _carve_v_corridor(y1: int, y2: int, x: int) -> Array[Vector2i]:
	var carved: Array[Vector2i] = []
	for y in range(mini(y1, y2), maxi(y1, y2) + 1):
		for w in range(-CORRIDOR_WIDTH / 2, CORRIDOR_WIDTH / 2 + 1):
			var cx := x + w
			if cx >= 0 and cx < width and y >= 0 and y < height:
				if tiles[cx][y] == Constants.TileType.WALL:
					tiles[cx][y] = Constants.TileType.FLOOR
					carved.append(Vector2i(cx, y))
	return carved

## Place doors at room entrances
func _place_doors():
	for room in rooms:
		# Check each edge of the room for corridor connections
		for x in range(room.position.x, room.end.x):
			# Top edge
			if room.position.y > 0 and tiles[x][room.position.y - 1] == Constants.TileType.FLOOR:
				if _is_valid_door_position(x, room.position.y):
					tiles[x][room.position.y] = Constants.TileType.DOOR
			# Bottom edge
			if room.end.y < height and tiles[x][room.end.y] == Constants.TileType.FLOOR:
				if _is_valid_door_position(x, room.end.y - 1):
					tiles[x][room.end.y - 1] = Constants.TileType.DOOR

		for y in range(room.position.y, room.end.y):
			# Left edge
			if room.position.x > 0 and tiles[room.position.x - 1][y] == Constants.TileType.FLOOR:
				if _is_valid_door_position(room.position.x, y):
					tiles[room.position.x][y] = Constants.TileType.DOOR
			# Right edge
			if room.end.x < width and tiles[room.end.x][y] == Constants.TileType.FLOOR:
				if _is_valid_door_position(room.end.x - 1, y):
					tiles[room.end.x - 1][y] = Constants.TileType.DOOR

func _is_valid_door_position(x: int, y: int) -> bool:
	# Door should have walls on opposite sides
	var h_walls := (x > 0 and tiles[x - 1][y] == Constants.TileType.WALL) and \
				   (x < width - 1 and tiles[x + 1][y] == Constants.TileType.WALL)
	var v_walls := (y > 0 and tiles[x][y - 1] == Constants.TileType.WALL) and \
				   (y < height - 1 and tiles[x][y + 1] == Constants.TileType.WALL)

	return h_walls or v_walls

## Place stairs
func _place_stairs(stair_type: Constants.TileType) -> Vector2i:
	if rooms.is_empty():
		return Vector2i(width / 2, height / 2)

	# Pick a random room
	var room := rooms[randi() % rooms.size()]

	# Find a valid floor tile in the room
	for _attempt in 20:
		var x := randi_range(room.position.x + 1, room.end.x - 2)
		var y := randi_range(room.position.y + 1, room.end.y - 2)

		if tiles[x][y] == Constants.TileType.FLOOR:
			tiles[x][y] = stair_type
			return Vector2i(x, y)

	# Fallback
	var center := room.get_center()
	tiles[center.x][center.y] = stair_type
	return center

## Get room containing a position
func _get_room_at(pos: Vector2i) -> Rect2i:
	for room in rooms:
		if room.has_point(pos):
			return room
	return Rect2i()

## Get player spawn position
func _get_player_spawn(stairs_up: Vector2i) -> Vector2i:
	# Spawn near stairs up
	for dir in Constants.CARDINAL_DIRECTIONS:
		var pos := stairs_up + dir
		if is_floor(pos):
			return pos
	return stairs_up

## Generate enemy spawn points
func _generate_enemy_spawns(floor_num: int) -> Array[Dictionary]:
	var spawns: Array[Dictionary] = []
	var enemy_count := 5 + floor_num * 2

	for room in rooms:
		var room_enemies := randi_range(1, 3)
		for _i in room_enemies:
			if spawns.size() >= enemy_count:
				break

			var pos := _get_random_floor_in_room(room)
			if pos != Vector2i(-1, -1):
				spawns.append({
					"position": pos,
					"room": room
				})

	return spawns

## Generate item spawn points
func _generate_item_spawns(floor_num: int) -> Array[Dictionary]:
	var spawns: Array[Dictionary] = []
	var item_count := 3 + int(floor_num * 0.5)

	for _i in item_count:
		var room := rooms[randi() % rooms.size()]
		var pos := _get_random_floor_in_room(room)
		if pos != Vector2i(-1, -1):
			spawns.append({
				"position": pos,
				"room": room
			})

	return spawns

## Generate NPC spawn points (only on certain floors)
func _generate_npc_spawns(floor_num: int) -> Array[Dictionary]:
	var spawns: Array[Dictionary] = []

	# NPCs appear every 3 floors
	if floor_num % 3 == 0 and rooms.size() > 0:
		var room := rooms[0]  # First room (near stairs up)
		var pos := _get_random_floor_in_room(room)
		if pos != Vector2i(-1, -1):
			spawns.append({
				"position": pos,
				"type": "merchant" if floor_num % 6 == 0 else "quest_giver"
			})

	return spawns

## Get random floor position in a room
func _get_random_floor_in_room(room: Rect2i) -> Vector2i:
	for _attempt in 20:
		var x := randi_range(room.position.x + 1, room.end.x - 2)
		var y := randi_range(room.position.y + 1, room.end.y - 2)

		if tiles[x][y] == Constants.TileType.FLOOR:
			return Vector2i(x, y)

	return Vector2i(-1, -1)

## Check if a position is a floor tile
func is_floor(pos: Vector2i) -> bool:
	if pos.x < 0 or pos.x >= width or pos.y < 0 or pos.y >= height:
		return false
	return tiles[pos.x][pos.y] == Constants.TileType.FLOOR

## Check if a position is walkable
func is_walkable(pos: Vector2i) -> bool:
	if pos.x < 0 or pos.x >= width or pos.y < 0 or pos.y >= height:
		return false

	var tile: Constants.TileType = tiles[pos.x][pos.y]
	return tile in [
		Constants.TileType.FLOOR,
		Constants.TileType.DOOR,
		Constants.TileType.STAIRS_DOWN,
		Constants.TileType.STAIRS_UP
	]

## Check line of sight between two points
func has_line_of_sight(from: Vector2i, to: Vector2i) -> bool:
	# Bresenham's line algorithm
	var dx := abs(to.x - from.x)
	var dy := abs(to.y - from.y)
	var sx := 1 if from.x < to.x else -1
	var sy := 1 if from.y < to.y else -1
	var err := dx - dy

	var x := from.x
	var y := from.y

	while true:
		if x == to.x and y == to.y:
			return true

		if not is_walkable(Vector2i(x, y)) and Vector2i(x, y) != from:
			return false

		var e2 := 2 * err
		if e2 > -dy:
			err -= dy
			x += sx
		if e2 < dx:
			err += dx
			y += sy

	return false
