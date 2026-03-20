class_name MovementSystem
extends BaseSystem
## Handles player and entity movement: 8-directional input, speed modifiers,
## collision via move_and_slide, A* pathfinding helpers, and raycasting.

# --- Config ---
const GRID_SIZE: int = 200
const SUB_TILE_PRECISION: float = 0.125
const PLAYER_SPEED: float = 4.0         # tiles/second
const DIAGONAL_FACTOR: float = 0.707
const TILE_SIZE: int = Constants.BASE_TILE_SIZE
const CORNER_NUDGE_THRESHOLD: float = 0.3  # tiles

# --- Direction vectors ---
const DIR_VECTORS: Dictionary = {
	"up":         Vector2( 0, -1),
	"down":       Vector2( 0,  1),
	"left":       Vector2(-1,  0),
	"right":      Vector2( 1,  0),
	"up_left":    Vector2(-DIAGONAL_FACTOR, -DIAGONAL_FACTOR),
	"up_right":   Vector2( DIAGONAL_FACTOR, -DIAGONAL_FACTOR),
	"down_left":  Vector2(-DIAGONAL_FACTOR,  DIAGONAL_FACTOR),
	"down_right": Vector2( DIAGONAL_FACTOR,  DIAGONAL_FACTOR),
}

# --- State ---
var _speed_modifiers: Dictionary = {}  # source_id -> float multiplier
var _last_player_tile: Vector2i = Vector2i(-1, -1)


func _init() -> void:
	system_name = "movement-system"
	priority = 10


func initialize() -> void:
	pass


func process_system(delta: float) -> void:
	if not GameManager.player:
		return
	_process_player_movement(delta)


func cleanup() -> void:
	_speed_modifiers.clear()
	_last_player_tile = Vector2i(-1, -1)


# ---------------------------------------------------------------------------
# Player movement
# ---------------------------------------------------------------------------

func _process_player_movement(delta: float) -> void:
	var player: Node = GameManager.player
	if not player:
		return

	# Gather 8-directional input
	var input_dir := _get_input_direction()
	if input_dir == Vector2.ZERO:
		return

	var speed := _calculate_speed(player)
	var velocity := input_dir * speed * float(TILE_SIZE) * delta

	# Move via CharacterBody2D if available
	if player is CharacterBody2D:
		player.velocity = input_dir * speed * float(TILE_SIZE)
		player.move_and_slide()
	elif player.has_method("set_position"):
		var new_pos := Vector2(player.position) + velocity
		# Manual collision check
		var tile_pos := world_to_tile(new_pos)
		if is_tile_walkable(tile_pos):
			player.position = new_pos
		else:
			# Axis-decoupled resolution: try X alone, then Y alone
			var x_pos := Vector2(player.position.x + velocity.x, player.position.y)
			var y_pos := Vector2(player.position.x, player.position.y + velocity.y)
			if is_tile_walkable(world_to_tile(x_pos)):
				player.position = x_pos
			elif is_tile_walkable(world_to_tile(y_pos)):
				player.position = y_pos

	# Check tile change
	var current_tile := world_to_tile(player.position)
	if current_tile != _last_player_tile:
		_last_player_tile = current_tile


func _get_input_direction() -> Vector2:
	var dir := Vector2.ZERO
	if Input.is_action_pressed("move_up"):
		dir.y -= 1
	if Input.is_action_pressed("move_down"):
		dir.y += 1
	if Input.is_action_pressed("move_left"):
		dir.x -= 1
	if Input.is_action_pressed("move_right"):
		dir.x += 1
	if dir != Vector2.ZERO:
		dir = dir.normalized()
	return dir


func _calculate_speed(entity: Node) -> float:
	var base_speed := PLAYER_SPEED
	if entity.has_method("get_base_speed"):
		base_speed = entity.get_base_speed()

	var modifier := 1.0
	for mod_value in _speed_modifiers.values():
		modifier *= mod_value

	# Stamina penalty
	if entity.get("is_exhausted"):
		modifier *= 0.5

	# Environmental speed mod
	if entity.get("environmental_speed_mod") != null:
		modifier *= entity.environmental_speed_mod

	return base_speed * modifier


# ---------------------------------------------------------------------------
# Speed modifier API
# ---------------------------------------------------------------------------

func add_speed_modifier(source_id: String, multiplier: float) -> void:
	_speed_modifiers[source_id] = multiplier


func remove_speed_modifier(source_id: String) -> void:
	_speed_modifiers.erase(source_id)


func get_effective_speed(entity: Node) -> float:
	return _calculate_speed(entity)


# ---------------------------------------------------------------------------
# Coordinate conversion
# ---------------------------------------------------------------------------

func world_to_tile(world_pos: Vector2) -> Vector2i:
	return Vector2i(
		int(world_pos.x) / TILE_SIZE,
		int(world_pos.y) / TILE_SIZE
	)


func tile_to_world(tile_pos: Vector2i) -> Vector2:
	return Vector2(
		tile_pos.x * TILE_SIZE + TILE_SIZE / 2,
		tile_pos.y * TILE_SIZE + TILE_SIZE / 2
	)


# ---------------------------------------------------------------------------
# Collision helpers
# ---------------------------------------------------------------------------

func is_tile_walkable(tile: Vector2i) -> bool:
	if tile.x < 0 or tile.x >= GRID_SIZE or tile.y < 0 or tile.y >= GRID_SIZE:
		return false
	if GameManager.map.is_empty():
		return true
	if tile.y >= GameManager.map.size() or tile.x >= GameManager.map[tile.y].size():
		return false
	var tile_type: int = GameManager.map[tile.y][tile.x]
	return tile_type == Constants.TileType.FLOOR \
		or tile_type == Constants.TileType.DOOR \
		or tile_type == Constants.TileType.STAIRS_DOWN \
		or tile_type == Constants.TileType.GRASS \
		or tile_type == Constants.TileType.PATH \
		or tile_type == Constants.TileType.COBBLESTONE \
		or tile_type == Constants.TileType.CAVE_FLOOR \
		or tile_type == Constants.TileType.CAVE_ENTRANCE \
		or tile_type == Constants.TileType.SHRINE \
		or tile_type == Constants.TileType.EXIT


func check_collision_9point(x: float, y: float, radius: float = 0.4) -> bool:
	## Tests 9 points around (x, y) with given radius.
	## Returns true if ANY point collides with a non-walkable tile.
	var offsets: Array[Vector2] = [
		Vector2(0, 0),
		Vector2(radius, 0), Vector2(-radius, 0),
		Vector2(0, radius), Vector2(0, -radius),
		Vector2(radius, radius), Vector2(-radius, radius),
		Vector2(radius, -radius), Vector2(-radius, -radius),
	]
	for offset in offsets:
		var check_pos := Vector2(x, y) + offset * float(TILE_SIZE)
		if not is_tile_walkable(world_to_tile(check_pos)):
			return true
	return false


# ---------------------------------------------------------------------------
# Raycasting — Bresenham's line algorithm
# ---------------------------------------------------------------------------

func has_line_of_sight(from: Vector2i, to: Vector2i) -> bool:
	## Returns true if no wall tiles block the line between from and to.
	var tiles := raycast_tiles(from, to)
	for tile in tiles:
		if not is_tile_walkable(tile):
			return false
	return true


func raycast_tiles(from: Vector2i, to: Vector2i) -> Array[Vector2i]:
	## Returns all tiles along a Bresenham line from → to (exclusive of endpoints).
	var result: Array[Vector2i] = []
	var dx := absi(to.x - from.x)
	var dy := absi(to.y - from.y)
	var sx := 1 if from.x < to.x else -1
	var sy := 1 if from.y < to.y else -1
	var err := dx - dy
	var x := from.x
	var y := from.y
	while true:
		if x == to.x and y == to.y:
			break
		result.append(Vector2i(x, y))
		var e2 := 2 * err
		if e2 > -dy:
			err -= dy
			x += sx
		if e2 < dx:
			err += dx
			y += sy
	return result


# ---------------------------------------------------------------------------
# A* pathfinding
# ---------------------------------------------------------------------------

func find_path(start: Vector2i, goal: Vector2i, max_iterations: int = 1000) -> Array[Vector2i]:
	## Basic A* pathfinding returning waypoint array.
	if start == goal:
		return []
	if not is_tile_walkable(goal):
		return []

	var open_set: Array[Vector2i] = [start]
	var came_from: Dictionary = {}
	var g_score: Dictionary = {start: 0.0}
	var f_score: Dictionary = {start: _heuristic(start, goal)}
	var iterations := 0

	while open_set.size() > 0 and iterations < max_iterations:
		iterations += 1
		# Find node with lowest f_score
		var current := open_set[0]
		var best_f: float = f_score.get(current, INF)
		for node in open_set:
			var f: float = f_score.get(node, INF)
			if f < best_f:
				best_f = f
				current = node

		if current == goal:
			return _reconstruct_path(came_from, current)

		open_set.erase(current)
		for neighbor in _get_neighbors(current):
			var tentative_g: float = g_score.get(current, INF) + _move_cost(current, neighbor)
			if tentative_g < g_score.get(neighbor, INF):
				came_from[neighbor] = current
				g_score[neighbor] = tentative_g
				f_score[neighbor] = tentative_g + _heuristic(neighbor, goal)
				if neighbor not in open_set:
					open_set.append(neighbor)

	return []  # No path found


func _heuristic(a: Vector2i, b: Vector2i) -> float:
	var dx := absi(a.x - b.x)
	var dy := absi(a.y - b.y)
	return float(dx + dy) + (1.414 - 2.0) * float(mini(dx, dy))


func _move_cost(from: Vector2i, to: Vector2i) -> float:
	if from.x != to.x and from.y != to.y:
		return 1.414
	return 1.0


func _get_neighbors(tile: Vector2i) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for dx in range(-1, 2):
		for dy in range(-1, 2):
			if dx == 0 and dy == 0:
				continue
			var neighbor := Vector2i(tile.x + dx, tile.y + dy)
			if is_tile_walkable(neighbor):
				# For diagonal movement, ensure both adjacent cardinal tiles are walkable
				if dx != 0 and dy != 0:
					if not is_tile_walkable(Vector2i(tile.x + dx, tile.y)):
						continue
					if not is_tile_walkable(Vector2i(tile.x, tile.y + dy)):
						continue
				result.append(neighbor)
	return result


func _reconstruct_path(came_from: Dictionary, current: Vector2i) -> Array[Vector2i]:
	var path: Array[Vector2i] = [current]
	while came_from.has(current):
		current = came_from[current]
		path.push_front(current)
	return path


# ---------------------------------------------------------------------------
# Entity movement helpers (for AI)
# ---------------------------------------------------------------------------

func move_entity_toward(entity: Node, target: Vector2, speed: float, delta: float) -> void:
	## Moves an entity toward a world-space target at the given speed.
	var direction := (target - Vector2(entity.position)).normalized()
	var velocity := direction * speed * float(TILE_SIZE) * delta
	if entity is CharacterBody2D:
		entity.velocity = direction * speed * float(TILE_SIZE)
		entity.move_and_slide()
	else:
		var new_pos := Vector2(entity.position) + velocity
		if is_tile_walkable(world_to_tile(new_pos)):
			entity.position = new_pos


func move_entity_along_path(entity: Node, path: Array[Vector2i], speed: float, delta: float) -> int:
	## Moves entity along a tile path. Returns the current waypoint index.
	if path.is_empty():
		return 0
	var current_index: int = entity.get_meta("path_index", 0)
	if current_index >= path.size():
		return path.size()
	var target := tile_to_world(path[current_index])
	var dist := Vector2(entity.position).distance_to(target)
	if dist < 2.0:
		current_index += 1
		entity.set_meta("path_index", current_index)
		if current_index >= path.size():
			return path.size()
		target = tile_to_world(path[current_index])
	move_entity_toward(entity, target, speed, delta)
	return current_index
