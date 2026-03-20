class_name SpawnPointSystem
extends BaseSystem
## Manages enemy spawn points (rifts, nests, portals, etc.) with continuous
## spawning, per-point caps, global cap, and destructible spawn points.

# ---------------------------------------------------------------------------
# Spawn point type definitions
# ---------------------------------------------------------------------------

const SPAWN_TYPE_DEFS: Dictionary = {
	"rift": {
		"display_name": "Void Rift",
		"size": Vector2i(2, 2),
		"spawn_rate_ms": 10000,
		"cap": 5,
		"health": -1,
		"pool": ["void_wraith"],
		"rate_scale": 0.95,
		"destructible": false,
	},
	"nest": {
		"display_name": "Spider Nest",
		"size": Vector2i(1, 1),
		"spawn_rate_ms": 12000,
		"cap": 3,
		"health": 100,
		"pool": ["spider"],
		"rate_scale": 0.97,
		"destructible": true,
	},
	"portal": {
		"display_name": "Demon Portal",
		"size": Vector2i(2, 2),
		"spawn_rate_ms": 15000,
		"cap": 4,
		"health": 200,
		"pool": ["demon"],
		"rate_scale": 0.96,
		"destructible": true,
	},
	"grave": {
		"display_name": "Disturbed Grave",
		"size": Vector2i(1, 1),
		"spawn_rate_ms": 18000,
		"cap": 2,
		"health": 50,
		"pool": ["skeleton", "zombie"],
		"rate_scale": 0.98,
		"destructible": true,
	},
	"hive": {
		"display_name": "Insect Hive",
		"size": Vector2i(3, 3),
		"spawn_rate_ms": 8000,
		"cap": 6,
		"health": 300,
		"pool": ["swarm"],
		"rate_scale": 0.93,
		"destructible": true,
	},
	"summoning_circle": {
		"display_name": "Summoning Circle",
		"size": Vector2i(2, 2),
		"spawn_rate_ms": 25000,
		"cap": 2,
		"health": 150,
		"pool": ["elite"],
		"rate_scale": 0.99,
		"destructible": true,
	},
}

const GLOBAL_SPAWN_CAP: int = 12
const MIN_SPAWN_DISTANCE: int = 3  # Tiles from player
const DEFAULT_RESPAWN_TIMER: float = 60.0

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

var _spawn_points: Dictionary = {}  # id -> Dictionary
var _next_id: int = 0
var _global_spawn_count: int = 0
var _spawned_enemies: Dictionary = {}  # enemy_node_id -> spawn_point_id

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "spawn_point_system"
	priority = 38


func initialize() -> void:
	EventBus.entity_died.connect(_on_entity_died)
	EventBus.floor_advanced.connect(_on_floor_advanced)


func process_system(delta: float) -> void:
	if GameManager.current_state != Constants.GameState.PLAYING:
		return

	var delta_ms: float = delta * 1000.0

	for sp_id in _spawn_points:
		var sp: Dictionary = _spawn_points[sp_id]
		if not sp["active"]:
			continue

		sp["spawn_timer"] += delta_ms
		var rate: float = sp["current_rate"]

		if sp["spawn_timer"] >= rate:
			sp["spawn_timer"] -= rate
			_try_spawn(sp)


func cleanup() -> void:
	_spawn_points.clear()
	_spawned_enemies.clear()
	_global_spawn_count = 0
	_next_id = 0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Create a new spawn point. Returns spawn_point_id.
func create(config: Dictionary) -> String:
	var sp_type: String = config.get("type", "rift")
	if not SPAWN_TYPE_DEFS.has(sp_type):
		push_warning("SpawnPointSystem: Unknown type '%s'" % sp_type)
		return ""

	var def: Dictionary = SPAWN_TYPE_DEFS[sp_type].duplicate(true)
	var sp_id: String = "sp_%d" % _next_id
	_next_id += 1

	var spawn_point: Dictionary = {
		"id": sp_id,
		"type": sp_type,
		"definition": def,
		"position": config.get("position", Vector2i.ZERO),
		"active": true,
		"health": def["health"],
		"max_health": def["health"],
		"spawn_timer": 0.0,
		"current_rate": float(def["spawn_rate_ms"]),
		"spawn_count": 0,
		"spawned_enemies": [],
		"room_id": config.get("room_id", ""),
		"boss_room": config.get("boss_room", false),
		"floor_scale": config.get("floor_scale", 1.0),
	}

	_spawn_points[sp_id] = spawn_point
	return sp_id


## Destroy a spawn point. Optionally kill all spawned enemies.
func destroy(spawn_point_id: String, kill_spawns: bool = false) -> void:
	if not _spawn_points.has(spawn_point_id):
		return

	var sp: Dictionary = _spawn_points[spawn_point_id]
	sp["active"] = false

	if kill_spawns:
		for enemy in sp["spawned_enemies"]:
			if enemy != null and is_instance_valid(enemy):
				if enemy.has_method("take_damage"):
					enemy.take_damage(99999.0)

	# Clean up tracking
	for enemy in sp["spawned_enemies"]:
		if enemy != null and is_instance_valid(enemy):
			var eid: int = enemy.get_instance_id()
			_spawned_enemies.erase(eid)
			_global_spawn_count = maxi(0, _global_spawn_count - 1)

	_spawn_points.erase(spawn_point_id)


## Damage a spawn point. Returns true if destroyed.
func damage_spawn_point(spawn_point_id: String, amount: int) -> bool:
	if not _spawn_points.has(spawn_point_id):
		return false

	var sp: Dictionary = _spawn_points[spawn_point_id]
	if not sp["definition"].get("destructible", false):
		return false

	var health: int = sp["health"]
	if health < 0:
		return false  # Indestructible

	sp["health"] = health - amount
	if sp["health"] <= 0:
		destroy(spawn_point_id, false)
		return true

	return false


## Get all active spawn point data.
func get_spawn_points() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for sp_id in _spawn_points:
		result.append(_spawn_points[sp_id])
	return result


## Get spawn point by ID.
func get_spawn_point(sp_id: String) -> Dictionary:
	return _spawn_points.get(sp_id, {})


## Get the spawn point that spawned a given enemy, or empty dict.
func get_spawner_for_enemy(enemy: Node) -> Dictionary:
	if enemy == null:
		return {}
	var eid: int = enemy.get_instance_id()
	var sp_id: String = _spawned_enemies.get(eid, "")
	if sp_id.is_empty():
		return {}
	return _spawn_points.get(sp_id, {})


## Get total spawned enemy count.
func get_global_spawn_count() -> int:
	return _global_spawn_count


# ---------------------------------------------------------------------------
# Spawning logic
# ---------------------------------------------------------------------------

func _try_spawn(sp: Dictionary) -> void:
	# Boss room check
	if sp.get("boss_room", false):
		return

	# Per-point cap
	var alive_count: int = _count_alive_spawns(sp)
	var cap: int = sp["definition"].get("cap", 3)
	if alive_count >= cap:
		return

	# Global cap
	if _global_spawn_count >= GLOBAL_SPAWN_CAP:
		return

	# Distance check from player
	if GameManager.player != null:
		var player_pos: Vector2i = _get_entity_tile(GameManager.player)
		var sp_pos: Vector2i = sp["position"]
		var dist: int = absi(player_pos.x - sp_pos.x) + absi(player_pos.y - sp_pos.y)
		if dist < MIN_SPAWN_DISTANCE:
			return

	# Spawn an enemy
	var enemy: Node = _spawn_enemy(sp)
	if enemy != null:
		sp["spawned_enemies"].append(enemy)
		sp["spawn_count"] += 1
		_global_spawn_count += 1
		_spawned_enemies[enemy.get_instance_id()] = sp["id"]

		# Accelerate spawn rate
		var rate_scale: float = sp["definition"].get("rate_scale", 1.0)
		sp["current_rate"] = maxf(2000.0, sp["current_rate"] * rate_scale)


func _spawn_enemy(sp: Dictionary) -> Node:
	var pool: Array = sp["definition"].get("pool", [])
	if pool.is_empty():
		return null

	var monster_type: String = pool[randi() % pool.size()]
	var floor_num: int = 1
	if GameManager.run_state != null:
		floor_num = GameManager.run_state.current_floor

	var floor_scale: float = sp.get("floor_scale", 1.0)
	var difficulty: float = 1.0 + (floor_num - 1) * floor_scale * 0.2

	# Use EnemyFactory if available in the scene tree
	var factory: Node = get_node_or_null("/root/EnemyFactory")
	if factory != null and factory.has_method("create_and_register"):
		return factory.create_and_register(monster_type, sp["position"], difficulty)

	# Fallback: emit event for external spawning
	EventBus.hazard_created.emit(
		Vector2(sp["position"]),
		"spawn_%s" % monster_type,
		difficulty,
	)
	return null


func _count_alive_spawns(sp: Dictionary) -> int:
	var count: int = 0
	var alive_list: Array = []
	for enemy in sp["spawned_enemies"]:
		if enemy != null and is_instance_valid(enemy):
			alive_list.append(enemy)
			count += 1
	sp["spawned_enemies"] = alive_list
	return count


# ---------------------------------------------------------------------------
# Signal handlers
# ---------------------------------------------------------------------------

func _on_entity_died(entity: Node, _killer: Node) -> void:
	if entity == null:
		return
	var eid: int = entity.get_instance_id()
	if _spawned_enemies.has(eid):
		_spawned_enemies.erase(eid)
		_global_spawn_count = maxi(0, _global_spawn_count - 1)


func _on_floor_advanced(_new_floor: int, _previous_floor: int) -> void:
	cleanup()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

func _get_entity_tile(entity: Node) -> Vector2i:
	if entity.has_method("get_tile_position"):
		return entity.get_tile_position()
	if "tile_position" in entity:
		return entity.tile_position
	if "position" in entity:
		return Vector2i(entity.position)
	return Vector2i.ZERO
