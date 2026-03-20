class_name AbilityProjectileSystem
extends BaseSystem
## Homing/tracking enemy ability projectiles.
## Manages projectiles fired by enemy abilities that can home toward the player,
## apply status effects on hit, and leave visual trails.

# --- Signals ---
signal ability_projectile_hit(target: Node, projectile_id: int, damage: int)
signal ability_projectile_spawned(projectile_id: int)

# --- Config ---
const DEFAULT_SPEED: float = 180.0       # Pixels per second
const DEFAULT_TURN_RATE: float = 3.0     # Radians per second
const DEFAULT_RADIUS: float = 8.0        # Pixels
const DEFAULT_DAMAGE: int = 10
const DEFAULT_MAX_LIFETIME: float = 5.0  # Seconds
const PLAYER_HITBOX: float = 0.5         # Tiles
const MAX_TRAIL_LENGTH: int = 10
const TILE_SIZE: float = float(Constants.BASE_TILE_SIZE)

# --- Ability effect mapping ---
const ABILITY_EFFECTS: Dictionary = {
	"venom_spit":   "poisoned",
	"frost_bolt":   "chilled",
	"shadow_bolt":  "weakened",
	"fire_breath":  "burning",
	"acid_spray":   "corroded",
	"dark_pulse":   "feared",
	"ice_lance":    "frozen",
	"plague_cloud": "diseased",
}

# --- Inner class ---
class AbilityProjectile:
	var id: int = -1
	var x: float = 0.0
	var y: float = 0.0
	var direction: float = 0.0           # Radians
	var speed: float = 180.0             # Pixels/sec
	var homing: bool = false
	var turn_rate: float = 3.0           # Radians/sec
	var color: Color = Color.RED
	var trail_color: Color = Color(1.0, 0.3, 0.3, 0.6)
	var radius: float = 8.0             # Pixels
	var damage: int = 10
	var enemy_id: StringName = &""
	var ability_id: StringName = &""
	var persists_after_caster_death: bool = false
	var max_lifetime: float = 5.0       # Seconds
	var lifetime: float = 0.0
	var trail_positions: Array[Vector2] = []
	var alive: bool = true

	func reset() -> void:
		id = -1
		x = 0.0
		y = 0.0
		direction = 0.0
		speed = 180.0
		homing = false
		turn_rate = 3.0
		color = Color.RED
		trail_color = Color(1.0, 0.3, 0.3, 0.6)
		radius = 8.0
		damage = 10
		enemy_id = &""
		ability_id = &""
		persists_after_caster_death = false
		max_lifetime = 5.0
		lifetime = 0.0
		trail_positions.clear()
		alive = true

# --- State ---
var _projectiles: Array[AbilityProjectile] = []
var _next_id: int = 0


func _init() -> void:
	system_name = "ability-projectile-system"
	priority = 31


func initialize() -> void:
	_projectiles.clear()
	_next_id = 0


# ---------------------------------------------------------------------------
# Spawning
# ---------------------------------------------------------------------------

func spawn(config: Dictionary) -> int:
	## Spawn a single ability projectile. Returns its ID.
	## Config keys: x, y, direction, speed, homing, turn_rate, color, trail_color,
	##   radius, damage, enemy_id, ability_id, persists_after_caster_death, max_lifetime
	var proj := AbilityProjectile.new()
	proj.id = _next_id
	_next_id += 1

	proj.x = config.get("x", 0.0)
	proj.y = config.get("y", 0.0)
	proj.direction = config.get("direction", 0.0)
	proj.speed = config.get("speed", DEFAULT_SPEED)
	proj.homing = config.get("homing", false)
	proj.turn_rate = config.get("turn_rate", DEFAULT_TURN_RATE)
	proj.radius = config.get("radius", DEFAULT_RADIUS)
	proj.damage = config.get("damage", DEFAULT_DAMAGE)
	proj.enemy_id = StringName(str(config.get("enemy_id", "")))
	proj.ability_id = StringName(str(config.get("ability_id", "")))
	proj.persists_after_caster_death = config.get("persists_after_caster_death", false)
	proj.max_lifetime = config.get("max_lifetime", DEFAULT_MAX_LIFETIME)

	if config.has("color"):
		proj.color = config["color"]
	if config.has("trail_color"):
		proj.trail_color = config["trail_color"]

	proj.trail_positions.append(Vector2(proj.x, proj.y))
	_projectiles.append(proj)

	ability_projectile_spawned.emit(proj.id)
	return proj.id


func spawn_burst(config: Dictionary) -> Array[int]:
	## Spawn multiple projectiles in a spread pattern. Returns array of IDs.
	## Additional config keys: count (default 3), spread_degrees (default 30)
	var count: int = config.get("count", 3)
	var spread_degrees: float = config.get("spread_degrees", 30.0)
	var base_direction: float = config.get("direction", 0.0)
	var spread_rad: float = deg_to_rad(spread_degrees)

	var ids: Array[int] = []

	if count <= 1:
		ids.append(spawn(config))
		return ids

	var start_angle: float = base_direction - spread_rad / 2.0
	var angle_step: float = spread_rad / float(count - 1)

	for i in range(count):
		var proj_config: Dictionary = config.duplicate()
		proj_config["direction"] = start_angle + angle_step * float(i)
		# Remove burst-specific keys
		proj_config.erase("count")
		proj_config.erase("spread_degrees")
		ids.append(spawn(proj_config))

	return ids


# ---------------------------------------------------------------------------
# Processing
# ---------------------------------------------------------------------------

func process_system(delta: float) -> void:
	if _projectiles.is_empty():
		return

	var player: Node = GameManager.player
	var to_remove: Array[int] = []

	for i in range(_projectiles.size()):
		var proj: AbilityProjectile = _projectiles[i]
		if not proj.alive:
			to_remove.append(i)
			continue

		# Update lifetime
		proj.lifetime += delta
		if proj.lifetime >= proj.max_lifetime:
			proj.alive = false
			to_remove.append(i)
			continue

		# Homing steering
		if proj.homing and player and is_instance_valid(player) and player.is_alive:
			var target_x: float = float(player.grid_position.x) * TILE_SIZE
			var target_y: float = float(player.grid_position.y) * TILE_SIZE
			var desired_angle: float = atan2(target_y - proj.y, target_x - proj.x)
			var angle_diff: float = _wrap_angle(desired_angle - proj.direction)
			var max_turn: float = proj.turn_rate * delta
			proj.direction += clampf(angle_diff, -max_turn, max_turn)

		# Movement
		var vx: float = cos(proj.direction) * proj.speed
		var vy: float = sin(proj.direction) * proj.speed
		proj.x += vx * delta
		proj.y += vy * delta

		# Update trail
		proj.trail_positions.append(Vector2(proj.x, proj.y))
		if proj.trail_positions.size() > MAX_TRAIL_LENGTH:
			proj.trail_positions.remove_at(0)

		# Check collision with player
		if player and is_instance_valid(player) and player.is_alive:
			var player_px: float = float(player.grid_position.x) * TILE_SIZE
			var player_py: float = float(player.grid_position.y) * TILE_SIZE
			var hitbox_px: float = PLAYER_HITBOX * TILE_SIZE
			var dx: float = proj.x - player_px
			var dy: float = proj.y - player_py
			var dist: float = sqrt(dx * dx + dy * dy)

			if dist <= hitbox_px + proj.radius:
				# Check if player is invincible (dodge iframes)
				var is_invincible: bool = false
				if player.has_method("get") and player.get(&"is_invincible"):
					is_invincible = true

				if not is_invincible:
					_on_hit_player(proj, player)
					proj.alive = false
					to_remove.append(i)
					continue

		# Check out of bounds
		var grid_x: int = roundi(proj.x / TILE_SIZE)
		var grid_y: int = roundi(proj.y / TILE_SIZE)
		if grid_x < 0 or grid_x >= Constants.GRID_WIDTH or grid_y < 0 or grid_y >= Constants.GRID_HEIGHT:
			proj.alive = false
			to_remove.append(i)
			continue

	# Remove dead projectiles (reverse order to preserve indices)
	to_remove.reverse()
	for idx in to_remove:
		if idx < _projectiles.size():
			_projectiles.remove_at(idx)


# ---------------------------------------------------------------------------
# Hit handling
# ---------------------------------------------------------------------------

func _on_hit_player(proj: AbilityProjectile, player: Node) -> void:
	if player.has_method("take_damage"):
		player.take_damage(proj.damage, proj.ability_id, null)

	_apply_status_effect(player, String(proj.ability_id), String(proj.enemy_id))

	ability_projectile_hit.emit(player, proj.id, proj.damage)
	EventBus.player_damage_taken.emit(player, float(proj.damage), null)


func _apply_status_effect(target: Node, ability_id: String, enemy_id: String) -> void:
	## Apply a status effect based on the ability that spawned this projectile.
	var effect_name: String = ABILITY_EFFECTS.get(ability_id, "")
	if effect_name.is_empty():
		return

	# Create a lightweight status effect resource
	var effect := Resource.new()
	effect.set_meta(&"id", StringName(effect_name + "_" + enemy_id))
	effect.set_meta(&"effect", effect_name)
	effect.set_meta(&"source", enemy_id)
	effect.set_meta(&"duration", 3.0)

	# Use set/get pattern compatible with Entity.apply_status
	effect.set(&"id", StringName(effect_name + "_" + enemy_id))
	effect.set(&"effect", effect_name)

	if target.has_method("apply_status"):
		target.apply_status(effect)


# ---------------------------------------------------------------------------
# Cancel by enemy
# ---------------------------------------------------------------------------

func cancel_by_enemy(enemy_id: StringName) -> void:
	## Remove all projectiles from a specific enemy (e.g., when enemy dies).
	## Projectiles with persists_after_caster_death are kept.
	var to_remove: Array[int] = []
	for i in range(_projectiles.size()):
		var proj: AbilityProjectile = _projectiles[i]
		if proj.enemy_id == enemy_id and not proj.persists_after_caster_death:
			proj.alive = false
			to_remove.append(i)

	to_remove.reverse()
	for idx in to_remove:
		if idx < _projectiles.size():
			_projectiles.remove_at(idx)


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------

func get_active_count() -> int:
	return _projectiles.size()


func get_projectile_by_id(proj_id: int) -> AbilityProjectile:
	for proj in _projectiles:
		if proj.id == proj_id:
			return proj
	return null


func get_projectiles_by_enemy(enemy_id: StringName) -> Array[AbilityProjectile]:
	var result: Array[AbilityProjectile] = []
	for proj in _projectiles:
		if proj.enemy_id == enemy_id and proj.alive:
			result.append(proj)
	return result


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

func _wrap_angle(angle: float) -> float:
	## Wrap angle to [-PI, PI] range.
	while angle > PI:
		angle -= TAU
	while angle < -PI:
		angle += TAU
	return angle


# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

func cleanup() -> void:
	_projectiles.clear()
	_next_id = 0
