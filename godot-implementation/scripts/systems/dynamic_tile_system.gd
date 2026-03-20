class_name DynamicTileSystem
extends BaseSystem
## Runtime tile state changes with spread mechanics, hazard damage,
## warning system, and animated tile frame cycling.

# --- Config ---
const TICK_INTERVAL: float = 0.5
const WARNING_TIME: float = 0.5
const WARNING_PULSE_INTERVAL: float = 0.2

# --- Dynamic tile type definitions ---
const TILE_TYPE_DEFS: Dictionary = {
	"lava":          {"damage": 20, "interval": 0.5, "element": "fire",  "blocks": false},
	"frozen_floor":  {"damage": 0,  "interval": 0.0, "element": "ice",   "blocks": false, "slow": 0.5, "warmth_drain": 5.0},
	"ice_wall":      {"damage": 0,  "interval": 0.0, "element": "ice",   "blocks": true,  "hp": 50},
	"corrupted":     {"damage": 3,  "interval": 1.0, "element": "void",  "blocks": false, "buff_void": true},
	"darkness":      {"damage": 0,  "interval": 0.0, "element": "dark",  "blocks": false, "vision_reduce": 3},
	"unstable":      {"damage": 0,  "interval": 0.0, "element": "earth", "blocks": false, "collapse_chance": 0.1, "warn_time": 2.0},
	"sanctified":    {"damage": -5, "interval": 1.0, "element": "holy",  "blocks": false, "undead_damage": 10},
}

# --- Tile state enum ---
enum TileState { INACTIVE, WARNING, ACTIVE, FADING }

# --- Active tile data ---
class DynamicTile:
	var position: Vector2i = Vector2i.ZERO
	var tile_type: String = ""
	var state: int = TileState.ACTIVE
	var hp: int = -1                   # -1 = indestructible
	var timer: float = 0.0             # Damage interval timer
	var warning_timer: float = 0.0
	var duration: float = -1.0         # -1 = permanent
	var remaining: float = -1.0
	var anim_frame: int = 0
	var anim_timer: float = 0.0
	var source_id: String = ""         # What created this tile

# --- State ---
var _dynamic_tiles: Dictionary = {}    # "x,y" -> DynamicTile
var _tick_timer: float = 0.0
var _spread_tasks: Array[Dictionary] = []  # Active spread operations
var _anim_fps: float = 4.0


func _init() -> void:
	system_name = "dynamic-tile-system"
	priority = 36


func initialize() -> void:
	pass


func process_system(delta: float) -> void:
	_tick_timer += delta

	# Update animations
	_update_animations(delta)

	# Update warnings
	_update_warnings(delta)

	# Update spreads
	_update_spreads(delta)

	# Update durations
	_update_durations(delta)

	# Periodic damage tick
	if _tick_timer >= TICK_INTERVAL:
		_tick_timer -= TICK_INTERVAL
		_process_damage_tick()


func cleanup() -> void:
	_dynamic_tiles.clear()
	_spread_tasks.clear()
	_tick_timer = 0.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func set_tile(position: Vector2i, tile_type: String, duration: float = -1.0, source: String = "") -> void:
	## Places a dynamic tile at position.
	var key := _tile_key(position)
	var tile := DynamicTile.new()
	tile.position = position
	tile.tile_type = tile_type
	tile.source_id = source
	tile.duration = duration
	tile.remaining = duration

	var def: Dictionary = TILE_TYPE_DEFS.get(tile_type, {})
	tile.hp = def.get("hp", -1)

	# Apply warning phase first
	if def.get("damage", 0) > 0:
		tile.state = TileState.WARNING
		tile.warning_timer = WARNING_TIME
	else:
		tile.state = TileState.ACTIVE

	_dynamic_tiles[key] = tile


func remove_tile(position: Vector2i) -> void:
	var key := _tile_key(position)
	_dynamic_tiles.erase(key)


func get_tile_at(position: Vector2i) -> DynamicTile:
	return _dynamic_tiles.get(_tile_key(position))


func has_dynamic_tile(position: Vector2i) -> bool:
	return _dynamic_tiles.has(_tile_key(position))


func get_tile_type_at(position: Vector2i) -> String:
	var tile: DynamicTile = _dynamic_tiles.get(_tile_key(position))
	if tile:
		return tile.tile_type
	return ""


func damage_tile(position: Vector2i, amount: int) -> bool:
	## Damages a destructible dynamic tile. Returns true if destroyed.
	var tile: DynamicTile = _dynamic_tiles.get(_tile_key(position))
	if tile == null or tile.hp < 0:
		return false
	tile.hp -= amount
	if tile.hp <= 0:
		remove_tile(position)
		return true
	return false


func get_all_tiles_of_type(tile_type: String) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for key in _dynamic_tiles:
		var tile: DynamicTile = _dynamic_tiles[key]
		if tile.tile_type == tile_type:
			result.append(tile.position)
	return result


func get_dynamic_tile_count() -> int:
	return _dynamic_tiles.size()


# ---------------------------------------------------------------------------
# Spread mechanics
# ---------------------------------------------------------------------------

func start_spread_from(center: Vector2i, tile_type: String, rate: float, max_radius: float = 20.0) -> void:
	## Outward radial spread from center.
	_spread_tasks.append({
		"center": center,
		"tile_type": tile_type,
		"rate": rate,
		"current_radius": 0.0,
		"max_radius": max_radius,
		"direction": "outward",
	})


func start_spread_toward(target: Vector2i, tile_type: String, rate: float, start_radius: float = 50.0) -> void:
	## Inward spread toward target (used by shift system meltdown).
	_spread_tasks.append({
		"center": target,
		"tile_type": tile_type,
		"rate": rate,
		"current_radius": start_radius,
		"max_radius": 0.0,
		"direction": "inward",
	})


func stop_all_spreads() -> void:
	_spread_tasks.clear()


# ---------------------------------------------------------------------------
# Queries for other systems
# ---------------------------------------------------------------------------

func get_slow_factor_at(position: Vector2i) -> float:
	## Returns movement speed multiplier (1.0 = normal, 0.5 = half speed).
	var tile: DynamicTile = _dynamic_tiles.get(_tile_key(position))
	if tile == null or tile.state != TileState.ACTIVE:
		return 1.0
	var def: Dictionary = TILE_TYPE_DEFS.get(tile.tile_type, {})
	return 1.0 - def.get("slow", 0.0)


func get_vision_reduction_at(position: Vector2i) -> int:
	var tile: DynamicTile = _dynamic_tiles.get(_tile_key(position))
	if tile == null or tile.state != TileState.ACTIVE:
		return 0
	var def: Dictionary = TILE_TYPE_DEFS.get(tile.tile_type, {})
	return def.get("vision_reduce", 0)


func is_tile_blocked(position: Vector2i) -> bool:
	var tile: DynamicTile = _dynamic_tiles.get(_tile_key(position))
	if tile == null:
		return false
	var def: Dictionary = TILE_TYPE_DEFS.get(tile.tile_type, {})
	return def.get("blocks", false)


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _tile_key(pos: Vector2i) -> String:
	return "%d,%d" % [pos.x, pos.y]


func _update_animations(delta: float) -> void:
	for key in _dynamic_tiles:
		var tile: DynamicTile = _dynamic_tiles[key]
		tile.anim_timer += delta
		if tile.anim_timer >= 1.0 / _anim_fps:
			tile.anim_timer -= 1.0 / _anim_fps
			tile.anim_frame = (tile.anim_frame + 1) % 4


func _update_warnings(delta: float) -> void:
	for key in _dynamic_tiles:
		var tile: DynamicTile = _dynamic_tiles[key]
		if tile.state != TileState.WARNING:
			continue
		tile.warning_timer -= delta
		if tile.warning_timer <= 0.0:
			tile.state = TileState.ACTIVE


func _update_durations(delta: float) -> void:
	var to_remove: Array[String] = []
	for key in _dynamic_tiles:
		var tile: DynamicTile = _dynamic_tiles[key]
		if tile.duration < 0.0:
			continue  # Permanent
		tile.remaining -= delta
		if tile.remaining <= 0.5 and tile.state == TileState.ACTIVE:
			tile.state = TileState.FADING
		if tile.remaining <= 0.0:
			to_remove.append(key)
	for key in to_remove:
		_dynamic_tiles.erase(key)


func _update_spreads(delta: float) -> void:
	var finished: Array[int] = []
	for i in range(_spread_tasks.size()):
		var task: Dictionary = _spread_tasks[i]
		if task["direction"] == "outward":
			var old_r: float = task["current_radius"]
			task["current_radius"] += task["rate"] * delta
			var new_r: float = task["current_radius"]
			_apply_radial_spread(task["center"], old_r, new_r, task["tile_type"])
			if task["current_radius"] >= task["max_radius"]:
				finished.append(i)
		else:  # inward
			var old_r: float = task["current_radius"]
			task["current_radius"] -= task["rate"] * delta
			var new_r: float = task["current_radius"]
			# For inward spread, tiles outside new_r become the tile type
			_apply_radial_spread_inward(task["center"], new_r, old_r, task["tile_type"])
			if task["current_radius"] <= task["max_radius"]:
				finished.append(i)

	# Remove finished tasks in reverse order
	finished.reverse()
	for idx in finished:
		_spread_tasks.remove_at(idx)


func _apply_radial_spread(center: Vector2i, inner_r: float, outer_r: float, tile_type: String) -> void:
	var min_x := int(center.x - outer_r) - 1
	var max_x := int(center.x + outer_r) + 1
	var min_y := int(center.y - outer_r) - 1
	var max_y := int(center.y + outer_r) + 1
	for x in range(maxi(min_x, 0), mini(max_x, Constants.GRID_WIDTH)):
		for y in range(maxi(min_y, 0), mini(max_y, Constants.GRID_HEIGHT)):
			var dist := Vector2(center).distance_to(Vector2(x, y))
			if dist > inner_r and dist <= outer_r:
				var pos := Vector2i(x, y)
				if not has_dynamic_tile(pos) and _is_convertible(pos):
					set_tile(pos, tile_type)


func _apply_radial_spread_inward(center: Vector2i, inner_r: float, outer_r: float, tile_type: String) -> void:
	## For inward spread: convert tiles between inner_r and outer_r that are OUTSIDE the safe zone.
	var search_r := outer_r + 2.0
	var min_x := int(center.x - search_r) - 1
	var max_x := int(center.x + search_r) + 1
	var min_y := int(center.y - search_r) - 1
	var max_y := int(center.y + search_r) + 1
	for x in range(maxi(min_x, 0), mini(max_x, Constants.GRID_WIDTH)):
		for y in range(maxi(min_y, 0), mini(max_y, Constants.GRID_HEIGHT)):
			var dist := Vector2(center).distance_to(Vector2(x, y))
			if dist > inner_r and dist <= outer_r:
				var pos := Vector2i(x, y)
				if not has_dynamic_tile(pos) and _is_convertible(pos):
					set_tile(pos, tile_type)


func _is_convertible(pos: Vector2i) -> bool:
	## Only floor/doorway tiles can be converted.
	if GameManager.map.is_empty():
		return false
	if pos.y < 0 or pos.y >= GameManager.map.size():
		return false
	if pos.x < 0 or pos.x >= GameManager.map[pos.y].size():
		return false
	var tile_type: int = GameManager.map[pos.y][pos.x]
	return tile_type == Constants.TileType.FLOOR or tile_type == Constants.TileType.DOOR


func _process_damage_tick() -> void:
	if not GameManager.player:
		return

	var player: Node = GameManager.player
	var player_tile := Vector2i(
		int(player.position.x) / Constants.BASE_TILE_SIZE,
		int(player.position.y) / Constants.BASE_TILE_SIZE
	)

	# Check player on dynamic tile
	var tile: DynamicTile = _dynamic_tiles.get(_tile_key(player_tile))
	if tile and tile.state == TileState.ACTIVE:
		var def: Dictionary = TILE_TYPE_DEFS.get(tile.tile_type, {})
		var damage: int = def.get("damage", 0)
		if damage > 0 and player.has_method("take_damage"):
			player.take_damage(damage, null, def.get("element", "physical"))
		elif damage < 0 and player.has_method("heal"):
			player.heal(absf(float(damage)))

		# Unstable collapse check
		if tile.tile_type == "unstable":
			var collapse_chance: float = def.get("collapse_chance", 0.0)
			if randf() < collapse_chance:
				tile.tile_type = "lava"
				tile.state = TileState.WARNING
				tile.warning_timer = def.get("warn_time", 2.0)

	# Check enemies on dynamic tiles
	for enemy in GameManager.enemies:
		if not is_instance_valid(enemy):
			continue
		var enemy_tile := Vector2i(
			int(enemy.position.x) / Constants.BASE_TILE_SIZE,
			int(enemy.position.y) / Constants.BASE_TILE_SIZE
		)
		var e_tile: DynamicTile = _dynamic_tiles.get(_tile_key(enemy_tile))
		if e_tile and e_tile.state == TileState.ACTIVE:
			var e_def: Dictionary = TILE_TYPE_DEFS.get(e_tile.tile_type, {})
			var e_damage: int = e_def.get("damage", 0)

			# Sanctified tiles heal living, damage undead
			if e_tile.tile_type == "sanctified":
				if enemy.get("is_undead") == true:
					e_damage = e_def.get("undead_damage", 10)
				else:
					e_damage = e_def.get("damage", -5)

			if e_damage > 0 and enemy.has_method("take_damage"):
				enemy.take_damage(e_damage, null, e_def.get("element", "physical"))
			elif e_damage < 0 and enemy.has_method("heal"):
				enemy.heal(absf(float(e_damage)))
