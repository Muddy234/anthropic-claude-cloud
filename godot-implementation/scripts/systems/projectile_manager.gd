class_name ProjectileManager
extends BaseSystem
## Projectile pooling, movement/collision, damage on hit,
## pierce/bounce properties, lifetime, and cleanup.

# --- Config ---
const MAX_PROJECTILES: int = 50
const DEFAULT_SPEED: float = 8.0       # tiles/sec
const DEFAULT_LIFETIME: float = 5.0    # seconds
const TILE_SIZE: int = Constants.BASE_TILE_SIZE

# --- Projectile data ---
class ProjectileData:
	var id: int = 0
	var active: bool = false
	var position: Vector2 = Vector2.ZERO
	var velocity: Vector2 = Vector2.ZERO
	var speed: float = 8.0
	var damage: int = 0
	var element: String = "physical"
	var source: Node = null
	var target: Variant = null             # Node or Vector2 for homing
	var lifetime: float = 5.0
	var age: float = 0.0
	var piercing: bool = false
	var pierce_count: int = 0
	var max_pierces: int = 0
	var bouncing: bool = false
	var bounce_count: int = 0
	var max_bounces: int = 0
	var aoe_radius: float = 0.0
	var status_effect: String = ""
	var on_hit_callback: Callable = Callable()
	var homing: bool = false
	var homing_strength: float = 2.0
	var hit_entities: Array[Node] = []     # Avoid double-hitting on pierce
	var visual_node: Node = null


# --- State ---
var _pool: Array[ProjectileData] = []
var _next_id: int = 0
var _active_count: int = 0


func _init() -> void:
	system_name = "projectile-manager"
	priority = 15


func initialize() -> void:
	_init_pool()


func process_system(delta: float) -> void:
	_update_projectiles(delta)


func cleanup() -> void:
	for proj in _pool:
		_deactivate(proj)
	_active_count = 0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func fire_projectile(config: Dictionary) -> int:
	## Creates and fires a projectile. Returns projectile ID or -1 if pool full.
	## config: source, target, speed, damage, element, piercing, bouncing,
	##         aoe_radius, status, on_hit, homing, lifetime, direction
	var proj := _get_from_pool()
	if proj == null:
		return -1

	_next_id += 1
	proj.id = _next_id
	proj.active = true
	proj.source = config.get("source", null)
	proj.target = config.get("target", null)
	proj.speed = config.get("speed", DEFAULT_SPEED)
	proj.damage = config.get("damage", 0)
	proj.element = config.get("element", "physical")
	proj.lifetime = config.get("lifetime", DEFAULT_LIFETIME)
	proj.age = 0.0
	proj.piercing = config.get("piercing", false)
	proj.max_pierces = config.get("max_pierces", 3)
	proj.pierce_count = 0
	proj.bouncing = config.get("bouncing", false)
	proj.max_bounces = config.get("max_bounces", 2)
	proj.bounce_count = 0
	proj.aoe_radius = config.get("aoe_radius", 0.0)
	proj.status_effect = config.get("status", "")
	proj.homing = config.get("homing", false)
	proj.homing_strength = config.get("homing_strength", 2.0)
	proj.hit_entities.clear()

	if config.has("on_hit") and config["on_hit"] is Callable:
		proj.on_hit_callback = config["on_hit"]
	else:
		proj.on_hit_callback = Callable()

	# Determine initial position and velocity
	if proj.source:
		proj.position = Vector2(proj.source.position)
	else:
		proj.position = config.get("position", Vector2.ZERO)

	var direction: Vector2 = config.get("direction", Vector2.ZERO)
	if direction == Vector2.ZERO and proj.target != null:
		var target_pos := Vector2.ZERO
		if proj.target is Node and is_instance_valid(proj.target):
			target_pos = Vector2(proj.target.position)
		elif proj.target is Vector2:
			target_pos = proj.target
		if target_pos != Vector2.ZERO:
			direction = (target_pos - proj.position).normalized()

	if direction == Vector2.ZERO:
		direction = Vector2(1, 0)  # Default right

	proj.velocity = direction.normalized() * proj.speed * float(TILE_SIZE)
	_active_count += 1
	return proj.id


func get_active_count() -> int:
	return _active_count


func cancel_projectile(proj_id: int) -> void:
	for proj in _pool:
		if proj.active and proj.id == proj_id:
			_deactivate(proj)
			break


func cancel_all_from_source(source: Node) -> void:
	for proj in _pool:
		if proj.active and proj.source == source:
			_deactivate(proj)


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _init_pool() -> void:
	_pool.clear()
	_active_count = 0
	for i in range(MAX_PROJECTILES):
		_pool.append(ProjectileData.new())


func _get_from_pool() -> ProjectileData:
	for proj in _pool:
		if not proj.active:
			return proj
	# Pool full — recycle oldest
	var oldest: ProjectileData = null
	var oldest_age := 0.0
	for proj in _pool:
		if proj.age > oldest_age:
			oldest_age = proj.age
			oldest = proj
	if oldest:
		_deactivate(oldest)
		return oldest
	return null


func _update_projectiles(delta: float) -> void:
	for proj in _pool:
		if not proj.active:
			continue

		proj.age += delta

		# Lifetime check
		if proj.age >= proj.lifetime:
			_deactivate(proj)
			continue

		# Homing
		if proj.homing and proj.target is Node and is_instance_valid(proj.target):
			var target_pos := Vector2(proj.target.position)
			var desired_dir := (target_pos - proj.position).normalized()
			var current_dir := proj.velocity.normalized()
			var new_dir := current_dir.lerp(desired_dir, proj.homing_strength * delta).normalized()
			proj.velocity = new_dir * proj.speed * float(TILE_SIZE)

		# Move
		proj.position += proj.velocity * delta

		# Wall collision
		var tile := Vector2i(
			int(proj.position.x) / TILE_SIZE,
			int(proj.position.y) / TILE_SIZE
		)
		if _is_wall(tile):
			if proj.bouncing and proj.bounce_count < proj.max_bounces:
				_bounce(proj, tile)
			else:
				if proj.aoe_radius > 0.0:
					_apply_aoe(proj)
				_deactivate(proj)
			continue

		# Entity collision
		_check_entity_collision(proj)


func _check_entity_collision(proj: ProjectileData) -> void:
	var hit_radius := float(TILE_SIZE) * 0.5

	# Check against enemies (if player-fired) or player (if enemy-fired)
	var targets: Array[Node] = []
	if proj.source == GameManager.player:
		targets.assign(GameManager.enemies)
	elif GameManager.player:
		targets = [GameManager.player]

	for entity in targets:
		if not is_instance_valid(entity):
			continue
		if entity in proj.hit_entities:
			continue
		if entity == proj.source:
			continue

		var dist := proj.position.distance_to(Vector2(entity.position))
		if dist <= hit_radius:
			_on_hit(proj, entity)
			if not proj.piercing or proj.pierce_count >= proj.max_pierces:
				if proj.aoe_radius > 0.0:
					_apply_aoe(proj)
				_deactivate(proj)
				return


func _on_hit(proj: ProjectileData, entity: Node) -> void:
	proj.hit_entities.append(entity)
	proj.pierce_count += 1

	# Apply damage
	if entity.has_method("take_damage") and proj.damage > 0:
		entity.take_damage(proj.damage, proj.source, proj.element)

	# Apply status
	if not proj.status_effect.is_empty() and entity.has_method("apply_status"):
		entity.apply_status(proj.status_effect)

	# Callback
	if proj.on_hit_callback.is_valid():
		proj.on_hit_callback.call(proj, entity)


func _apply_aoe(proj: ProjectileData) -> void:
	var aoe_pixel_radius := proj.aoe_radius * float(TILE_SIZE)
	var all_entities: Array[Node] = []
	all_entities.assign(GameManager.enemies)
	if GameManager.player and proj.source != GameManager.player:
		all_entities.append(GameManager.player)

	for entity in all_entities:
		if not is_instance_valid(entity):
			continue
		if entity == proj.source:
			continue
		if entity in proj.hit_entities:
			continue
		var dist := proj.position.distance_to(Vector2(entity.position))
		if dist <= aoe_pixel_radius:
			var falloff := 1.0 - (dist / aoe_pixel_radius)
			var aoe_damage := int(float(proj.damage) * falloff)
			if entity.has_method("take_damage") and aoe_damage > 0:
				entity.take_damage(aoe_damage, proj.source, proj.element)


func _bounce(proj: ProjectileData, _wall_tile: Vector2i) -> void:
	proj.bounce_count += 1
	# Simple bounce: reflect velocity on the axis that hit the wall
	var tile_center := Vector2(
		float(_wall_tile.x) * float(TILE_SIZE) + float(TILE_SIZE) / 2.0,
		float(_wall_tile.y) * float(TILE_SIZE) + float(TILE_SIZE) / 2.0
	)
	var diff := proj.position - tile_center
	if absf(diff.x) > absf(diff.y):
		proj.velocity.x = -proj.velocity.x
	else:
		proj.velocity.y = -proj.velocity.y
	# Push back slightly
	proj.position += proj.velocity.normalized() * 2.0


func _deactivate(proj: ProjectileData) -> void:
	if proj.active:
		_active_count = maxi(_active_count - 1, 0)
	proj.active = false
	proj.source = null
	proj.target = null
	proj.hit_entities.clear()
	proj.on_hit_callback = Callable()
	if proj.visual_node and is_instance_valid(proj.visual_node):
		proj.visual_node.queue_free()
		proj.visual_node = null


func _is_wall(pos: Vector2i) -> bool:
	if pos.x < 0 or pos.x >= Constants.GRID_WIDTH or pos.y < 0 or pos.y >= Constants.GRID_HEIGHT:
		return true
	if GameManager.map.is_empty():
		return false
	if pos.y >= GameManager.map.size() or pos.x >= GameManager.map[pos.y].size():
		return true
	var tile_type: int = GameManager.map[pos.y][pos.x]
	return tile_type == Constants.TileType.WALL \
		or tile_type == Constants.TileType.CAVE_WALL \
		or tile_type == Constants.TileType.PILLAR
