class_name ProjectileSystem
extends BaseSystem
## Object-pooled projectile system for player ranged attacks and spell projectiles.
## Supports both direction-based (straight line) and target-based (homing) projectiles.

# --- Signals ---
signal projectile_spawned(projectile_index: int)
signal projectile_hit(projectile_index: int, target: Node)
signal projectile_expired(projectile_index: int)

# --- Pool Config ---
const MAX_PROJECTILES: int = 100
const HIT_RADIUS: float = 0.4  # Tiles
const DEFAULT_SPEED: float = 8.0
const DEFAULT_RANGE: float = 10.0

# --- Inner class ---
class Projectile:
	var active: bool = false
	var x: float = 0.0
	var y: float = 0.0
	var display_x: float = 0.0
	var display_y: float = 0.0
	var target_x: float = 0.0
	var target_y: float = 0.0
	var target: Node = null  # Entity
	var dir_x: float = 0.0
	var dir_y: float = 0.0
	var velocity_x: float = 0.0
	var velocity_y: float = 0.0
	var speed: float = 8.0
	var distance_to_travel: float = 10.0
	var distance_traveled: float = 0.0
	var damage: int = 0
	var element: StringName = &"physical"
	var owner: Node = null  # Entity
	var is_magic: bool = false
	var is_skill: bool = false
	var has_hit: bool = false
	var alpha: float = 1.0
	var is_direction_based: bool = false

	func reset() -> void:
		active = false
		x = 0.0
		y = 0.0
		display_x = 0.0
		display_y = 0.0
		target_x = 0.0
		target_y = 0.0
		target = null
		dir_x = 0.0
		dir_y = 0.0
		velocity_x = 0.0
		velocity_y = 0.0
		speed = 8.0
		distance_to_travel = 10.0
		distance_traveled = 0.0
		damage = 0
		element = &"physical"
		owner = null
		is_magic = false
		is_skill = false
		has_hit = false
		alpha = 1.0
		is_direction_based = false

# --- Pool ---
var _pool: Array[Projectile] = []
var _active_count: int = 0


func _init() -> void:
	system_name = "projectile-system"
	priority = 30


func initialize() -> void:
	_pool.resize(MAX_PROJECTILES)
	for i in range(MAX_PROJECTILES):
		_pool[i] = Projectile.new()


# ---------------------------------------------------------------------------
# Pool management
# ---------------------------------------------------------------------------

func _acquire() -> Projectile:
	for proj in _pool:
		if not proj.active:
			proj.reset()
			proj.active = true
			_active_count += 1
			return proj
	# Pool exhausted — recycle oldest
	var oldest: Projectile = _pool[0]
	oldest.reset()
	oldest.active = true
	return oldest


func _release(proj: Projectile) -> void:
	if proj.active:
		proj.active = false
		_active_count -= 1


# ---------------------------------------------------------------------------
# Spawning
# ---------------------------------------------------------------------------

func spawn(config: Dictionary) -> Projectile:
	## Spawn a projectile from a configuration dictionary.
	## Keys: x, y, target_x, target_y, target, dir_x, dir_y, speed, range,
	##        damage, element, owner, is_magic, is_skill, is_direction_based
	var proj: Projectile = _acquire()

	proj.x = config.get("x", 0.0)
	proj.y = config.get("y", 0.0)
	proj.display_x = proj.x
	proj.display_y = proj.y

	proj.damage = config.get("damage", 0)
	proj.element = StringName(config.get("element", "physical"))
	proj.owner = config.get("owner", null)
	proj.is_magic = config.get("is_magic", false)
	proj.is_skill = config.get("is_skill", false)
	proj.speed = config.get("speed", DEFAULT_SPEED)
	proj.distance_to_travel = config.get("range", DEFAULT_RANGE)
	proj.is_direction_based = config.get("is_direction_based", false)

	if proj.is_direction_based:
		# Direction-based: travel in a straight line
		proj.dir_x = config.get("dir_x", 0.0)
		proj.dir_y = config.get("dir_y", 0.0)
		var length: float = sqrt(proj.dir_x * proj.dir_x + proj.dir_y * proj.dir_y)
		if length > 0.0:
			proj.dir_x /= length
			proj.dir_y /= length
		proj.velocity_x = proj.dir_x * proj.speed
		proj.velocity_y = proj.dir_y * proj.speed
	else:
		# Target-based: home toward target
		proj.target = config.get("target", null)
		proj.target_x = config.get("target_x", 0.0)
		proj.target_y = config.get("target_y", 0.0)
		if proj.target and is_instance_valid(proj.target):
			proj.target_x = float(proj.target.grid_position.x)
			proj.target_y = float(proj.target.grid_position.y)
		_update_homing_velocity(proj)

	var idx: int = _pool.find(proj)
	projectile_spawned.emit(idx)
	return proj


# ---------------------------------------------------------------------------
# Processing
# ---------------------------------------------------------------------------

func process_system(delta: float) -> void:
	if _active_count <= 0:
		return

	var enemies: Array[Node] = _get_enemies()

	for i in range(MAX_PROJECTILES):
		var proj: Projectile = _pool[i]
		if not proj.active or proj.has_hit:
			continue

		# Update position
		if proj.is_direction_based:
			_move_direction_based(proj, delta)
		else:
			_move_target_based(proj, delta)

		proj.display_x = proj.x
		proj.display_y = proj.y

		# Track distance
		var step_dist: float = proj.speed * delta
		proj.distance_traveled += step_dist

		# Check wall collision
		if _check_wall_collision(proj):
			proj.has_hit = true
			projectile_expired.emit(i)
			_release(proj)
			continue

		# Check enemy collision (only player projectiles hit enemies)
		if proj.owner and proj.owner.get(&"is_in_group") and proj.owner.is_in_group("player"):
			var hit_entity: Node = _check_enemy_collision(proj, enemies)
			if hit_entity:
				proj.has_hit = true
				_on_projectile_hit(proj, hit_entity, i)
				_release(proj)
				continue

		# Check max range
		if proj.distance_traveled >= proj.distance_to_travel:
			proj.has_hit = true
			projectile_expired.emit(i)
			_release(proj)
			continue

		# Fade near end of range
		var remaining_ratio: float = 1.0 - (proj.distance_traveled / proj.distance_to_travel)
		if remaining_ratio < 0.2:
			proj.alpha = remaining_ratio / 0.2


func _move_direction_based(proj: Projectile, delta: float) -> void:
	proj.x += proj.velocity_x * delta
	proj.y += proj.velocity_y * delta


func _move_target_based(proj: Projectile, delta: float) -> void:
	# Update target position if target is alive
	if proj.target and is_instance_valid(proj.target) and proj.target.is_alive:
		proj.target_x = float(proj.target.grid_position.x)
		proj.target_y = float(proj.target.grid_position.y)

	_update_homing_velocity(proj)
	proj.x += proj.velocity_x * delta
	proj.y += proj.velocity_y * delta


func _update_homing_velocity(proj: Projectile) -> void:
	var dx: float = proj.target_x - proj.x
	var dy: float = proj.target_y - proj.y
	var dist: float = sqrt(dx * dx + dy * dy)
	if dist > 0.01:
		proj.dir_x = dx / dist
		proj.dir_y = dy / dist
	proj.velocity_x = proj.dir_x * proj.speed
	proj.velocity_y = proj.dir_y * proj.speed


# ---------------------------------------------------------------------------
# Collision
# ---------------------------------------------------------------------------

func _check_enemy_collision(proj: Projectile, enemies: Array[Node]) -> Node:
	## Returns the first enemy within HIT_RADIUS tiles of the projectile, or null.
	for enemy in enemies:
		if not is_instance_valid(enemy) or not enemy.is_alive:
			continue
		if enemy == proj.owner:
			continue
		var ex: float = float(enemy.grid_position.x)
		var ey: float = float(enemy.grid_position.y)
		var dx: float = proj.x - ex
		var dy: float = proj.y - ey
		var dist_sq: float = dx * dx + dy * dy
		if dist_sq <= HIT_RADIUS * HIT_RADIUS:
			return enemy
	return null


func _check_wall_collision(proj: Projectile) -> bool:
	## Check if the projectile is inside a wall tile.
	var tile_x: int = roundi(proj.x)
	var tile_y: int = roundi(proj.y)
	if tile_x < 0 or tile_x >= Constants.GRID_WIDTH or tile_y < 0 or tile_y >= Constants.GRID_HEIGHT:
		return true
	var map: Array = GameManager.map
	if map.is_empty():
		return false
	if tile_y >= map.size():
		return true
	var row: Variant = map[tile_y]
	if row is Array and tile_x < row.size():
		var tile: Variant = row[tile_x]
		if tile is Dictionary:
			var tile_type: int = tile.get("type", Constants.TileType.FLOOR)
			return tile_type == Constants.TileType.WALL
		elif tile is int:
			return tile == Constants.TileType.WALL
	return false


# ---------------------------------------------------------------------------
# Line of Sight (Bresenham)
# ---------------------------------------------------------------------------

func has_line_of_sight(x1: float, y1: float, x2: float, y2: float) -> bool:
	## Bresenham line algorithm to check if a clear path exists between two points.
	var ix1: int = roundi(x1)
	var iy1: int = roundi(y1)
	var ix2: int = roundi(x2)
	var iy2: int = roundi(y2)

	var dx: int = absi(ix2 - ix1)
	var dy: int = absi(iy2 - iy1)
	var sx: int = 1 if ix1 < ix2 else -1
	var sy: int = 1 if iy1 < iy2 else -1
	var err: int = dx - dy

	var cx: int = ix1
	var cy: int = iy1

	var map: Array = GameManager.map

	while true:
		# Skip start position
		if cx != ix1 or cy != iy1:
			if cx < 0 or cx >= Constants.GRID_WIDTH or cy < 0 or cy >= Constants.GRID_HEIGHT:
				return false
			if cy < map.size():
				var row: Variant = map[cy]
				if row is Array and cx < row.size():
					var tile: Variant = row[cx]
					var tile_type: int = -1
					if tile is Dictionary:
						tile_type = tile.get("type", Constants.TileType.FLOOR)
					elif tile is int:
						tile_type = tile
					if tile_type == Constants.TileType.WALL:
						return false

		if cx == ix2 and cy == iy2:
			break

		var e2: int = 2 * err
		if e2 > -dy:
			err -= dy
			cx += sx
		if e2 < dx:
			err += dx
			cy += sy

	return true


# ---------------------------------------------------------------------------
# Hit handling
# ---------------------------------------------------------------------------

func _on_projectile_hit(proj: Projectile, target: Node, index: int) -> void:
	if target.has_method("take_damage"):
		target.take_damage(proj.damage, proj.element, proj.owner)

	var result: Dictionary = {
		"damage": proj.damage,
		"element": proj.element,
		"is_magic": proj.is_magic,
		"is_skill": proj.is_skill,
		"source": proj.owner,
	}

	projectile_hit.emit(index, target)
	EventBus.combat_hit.emit(proj.owner, target, result)

	if proj.owner and is_instance_valid(proj.owner):
		EventBus.player_hit_enemy.emit(proj.owner, target, float(proj.damage), "ranged")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

func _get_enemies() -> Array[Node]:
	var tree: SceneTree = get_tree()
	if tree == null:
		return []
	var nodes: Array[Node] = []
	for node in tree.get_nodes_in_group("enemies"):
		nodes.append(node)
	return nodes


func get_active_count() -> int:
	return _active_count


func get_active_projectiles() -> Array[Projectile]:
	var result: Array[Projectile] = []
	for proj in _pool:
		if proj.active and not proj.has_hit:
			result.append(proj)
	return result


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

func cleanup() -> void:
	for proj in _pool:
		if proj.active:
			_release(proj)
		proj.reset()
	_active_count = 0
