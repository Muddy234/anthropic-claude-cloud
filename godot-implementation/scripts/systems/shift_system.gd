class_name ShiftSystem
extends BaseSystem
## The dungeon "shift" mechanic: a 10-minute countdown to a magma collapse
## (Protocol: MELTDOWN). When triggered, lava spreads inward from the map edges
## toward an escape exit, giving the player 90 seconds to reach safety.

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

const COUNTDOWN_TIME: float = 600.0     # 10 minutes until shift triggers
const LAVA_DURATION: float = 90.0       # 90 seconds to escape once active
const LAVA_DAMAGE: int = 20             # Per tick while standing in lava
const TICK_INTERVAL: float = 0.5        # Lava spread tick rate

# Warning stages
const WARNING_STAGES: Array[Dictionary] = [
	{"seconds_remaining": 120.0, "stage": 1, "shake_intensity": 0.5, "message": "The ground trembles..."},
	{"seconds_remaining": 60.0, "stage": 2, "shake_intensity": 1.0, "message": "The dungeon is collapsing!"},
	{"seconds_remaining": 30.0, "stage": 3, "shake_intensity": 1.5, "message": "MELTDOWN IMMINENT!"},
]

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

var countdown_timer: float = COUNTDOWN_TIME
var is_shift_active: bool = false
var lava_timer: float = 0.0
var lava_tick_timer: float = 0.0
var current_lava_radius: float = 0.0
var max_lava_radius: float = 0.0
var lava_step_size: float = 0.0
var exit_position: Vector2i = Vector2i(-1, -1)
var _warned_stages: Array[int] = []
var _shift_intensity: float = 1.0
var _lava_tiles: Dictionary = {}         # Vector2i key (as String) -> true
var _escaped: bool = false

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "shift_system"
	priority = 80


func initialize() -> void:
	EventBus.floor_advanced.connect(_on_floor_advanced)


func process_system(delta: float) -> void:
	if GameManager.current_state != Constants.GameState.PLAYING:
		return
	if GameManager.run_state == null:
		return

	if is_shift_active:
		_update_lava(delta)
	else:
		_update_countdown(delta)


func cleanup() -> void:
	countdown_timer = COUNTDOWN_TIME
	is_shift_active = false
	lava_timer = 0.0
	lava_tick_timer = 0.0
	current_lava_radius = 0.0
	max_lava_radius = 0.0
	lava_step_size = 0.0
	exit_position = Vector2i(-1, -1)
	_warned_stages.clear()
	_lava_tiles.clear()
	_escaped = false


func on_state_changed(_old_state: int, new_state: int) -> void:
	if new_state == Constants.GameState.PAUSED:
		return  # Timers frozen while paused


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Manually trigger the shift (e.g. from a trap or boss).
func trigger_shift() -> void:
	if is_shift_active:
		return

	is_shift_active = true
	lava_timer = 0.0
	lava_tick_timer = 0.0

	if GameManager.run_state != null:
		GameManager.run_state.shift_active = true

	_place_exit()
	_calculate_lava_parameters()

	EventBus.hazard_created.emit(Vector2(exit_position), "shift_exit", 0.0)

	# Audio hooks
	if AudioManager.music_manager != null and AudioManager.music_manager.has_method("crossfade_to"):
		AudioManager.music_manager.crossfade_to("meltdown", 1.0)
	if AudioManager.ambient_manager != null and AudioManager.ambient_manager.has_method("set_zone"):
		AudioManager.ambient_manager.set_zone("shift")


## Get time information for UI display.
func get_time_until_shift() -> Dictionary:
	if is_shift_active:
		var remaining: float = maxf(0.0, LAVA_DURATION - lava_timer)
		return {
			"seconds": remaining,
			"is_imminent": true,
			"warning_level": "red",
			"is_active": true,
		}

	var level: String = "safe"
	if countdown_timer <= 10.0:
		level = "red"
	elif countdown_timer <= 30.0:
		level = "orange"
	elif countdown_timer <= 60.0:
		level = "yellow"

	return {
		"seconds": countdown_timer,
		"is_imminent": countdown_timer <= 30.0,
		"warning_level": level,
		"is_active": false,
	}


## Format the countdown for HUD display.
func format_countdown() -> String:
	if is_shift_active:
		var remaining: float = maxf(0.0, LAVA_DURATION - lava_timer)
		if remaining <= 0.0:
			return "ACTIVE"
		return "%d:%02d" % [int(remaining) / 60, int(remaining) % 60]

	var minutes: int = int(countdown_timer) / 60
	var seconds: int = int(countdown_timer) % 60
	return "%d:%02d" % [minutes, seconds]


## Check if a tile is currently lava from the shift.
func is_lava_tile(pos: Vector2i) -> bool:
	return _lava_tiles.has(str(pos))


## Get the escape exit position. Returns (-1,-1) if not placed yet.
func get_exit_position() -> Vector2i:
	return exit_position


## Set shift intensity multiplier (increases per floor).
func set_shift_intensity(intensity: float) -> void:
	_shift_intensity = maxf(0.5, intensity)


## Check if player has escaped.
func has_escaped() -> bool:
	return _escaped


# ---------------------------------------------------------------------------
# Countdown processing
# ---------------------------------------------------------------------------

func _update_countdown(delta: float) -> void:
	countdown_timer -= delta * _shift_intensity

	# Check warning stages
	for warning in WARNING_STAGES:
		var stage: int = warning["stage"]
		if _warned_stages.has(stage):
			continue
		if countdown_timer <= warning["seconds_remaining"]:
			_warned_stages.append(stage)
			EventBus.hazard_created.emit(Vector2.ZERO, "shift_warning_%d" % stage, 0.0)

	if countdown_timer <= 0.0:
		trigger_shift()


# ---------------------------------------------------------------------------
# Lava processing
# ---------------------------------------------------------------------------

func _update_lava(delta: float) -> void:
	lava_timer += delta
	lava_tick_timer += delta

	# Check escape condition
	if GameManager.player != null:
		var player_pos: Vector2i = _get_entity_tile(GameManager.player)
		if player_pos == exit_position:
			_escaped = true
			is_shift_active = false
			if GameManager.run_state != null:
				GameManager.run_state.shift_active = false
			return

	if lava_tick_timer >= TICK_INTERVAL:
		lava_tick_timer -= TICK_INTERVAL
		_spread_lava_tick()
		_damage_entities_in_lava()

	# Time ran out
	if lava_timer >= LAVA_DURATION:
		_on_shift_timeout()


func _spread_lava_tick() -> void:
	if current_lava_radius <= 0.0:
		return

	current_lava_radius -= lava_step_size

	# Convert all tiles outside the safe radius to lava
	var map_w: int = Constants.GRID_WIDTH
	var map_h: int = Constants.GRID_HEIGHT
	var cx: int = exit_position.x
	var cy: int = exit_position.y
	var safe_r_sq: float = current_lava_radius * current_lava_radius

	# Only check a ring around the current radius for efficiency
	var outer: int = ceili(current_lava_radius + lava_step_size + 1)
	var inner: int = maxi(0, floori(current_lava_radius - 1))

	for dy in range(-outer, outer + 1):
		for dx in range(-outer, outer + 1):
			var dist_sq: float = float(dx * dx + dy * dy)
			if dist_sq < safe_r_sq:
				continue
			var inner_sq: float = float(inner * inner)
			if dist_sq > float((outer + 2) * (outer + 2)):
				continue

			var tx: int = cx + dx
			var ty: int = cy + dy
			if tx < 0 or tx >= map_w or ty < 0 or ty >= map_h:
				continue

			var key: String = str(Vector2i(tx, ty))
			if not _lava_tiles.has(key):
				_lava_tiles[key] = true
				# Update GameManager lava tracking
				GameManager.lava_tiles[key] = true


func _damage_entities_in_lava() -> void:
	# Damage player if in lava
	if GameManager.player != null:
		var ppos: Vector2i = _get_entity_tile(GameManager.player)
		if is_lava_tile(ppos):
			if GameManager.player.has_method("take_damage"):
				GameManager.player.take_damage(float(LAVA_DAMAGE))
			EventBus.hazard_damage.emit(GameManager.player, float(LAVA_DAMAGE), "shift_lava")

	# Damage enemies in lava
	for enemy in GameManager.enemies:
		if enemy == null or not is_instance_valid(enemy):
			continue
		var epos: Vector2i = _get_entity_tile(enemy)
		if is_lava_tile(epos):
			if enemy.has_method("take_damage"):
				enemy.take_damage(float(LAVA_DAMAGE))


func _on_shift_timeout() -> void:
	# Player didn't escape in time - massive damage
	if GameManager.player != null and GameManager.player.has_method("take_damage"):
		GameManager.player.take_damage(9999.0)


# ---------------------------------------------------------------------------
# Exit placement
# ---------------------------------------------------------------------------

func _place_exit() -> void:
	# Find the room farthest from the entrance
	var rooms: Array = GameManager.rooms
	if rooms.is_empty():
		# Fallback to center of map
		exit_position = Vector2i(Constants.GRID_WIDTH / 2, Constants.GRID_HEIGHT / 2)
		return

	# Assume first room or player position as entrance reference
	var entrance: Vector2i = Vector2i.ZERO
	if GameManager.player != null:
		entrance = _get_entity_tile(GameManager.player)
	elif rooms.size() > 0:
		entrance = Vector2i(rooms[0].get("x", 0), rooms[0].get("y", 0))

	var farthest_dist: int = -1
	var farthest_room: Dictionary = {}

	for room in rooms:
		var rx: int = room.get("x", 0) + room.get("width", 5) / 2
		var ry: int = room.get("y", 0) + room.get("height", 5) / 2
		var dist: int = absi(rx - entrance.x) + absi(ry - entrance.y)
		if dist > farthest_dist:
			farthest_dist = dist
			farthest_room = room

	if farthest_room.is_empty():
		exit_position = Vector2i(Constants.GRID_WIDTH / 2, Constants.GRID_HEIGHT / 2)
	else:
		exit_position = Vector2i(
			farthest_room.get("x", 0) + farthest_room.get("width", 5) / 2,
			farthest_room.get("y", 0) + farthest_room.get("height", 5) / 2,
		)


func _calculate_lava_parameters() -> void:
	# Max radius = distance from exit to farthest map corner
	var corners: Array[Vector2i] = [
		Vector2i(0, 0),
		Vector2i(Constants.GRID_WIDTH - 1, 0),
		Vector2i(0, Constants.GRID_HEIGHT - 1),
		Vector2i(Constants.GRID_WIDTH - 1, Constants.GRID_HEIGHT - 1),
	]

	max_lava_radius = 0.0
	for corner in corners:
		var dx: float = float(corner.x - exit_position.x)
		var dy: float = float(corner.y - exit_position.y)
		var dist: float = sqrt(dx * dx + dy * dy)
		max_lava_radius = maxf(max_lava_radius, dist)

	current_lava_radius = max_lava_radius

	# Number of ticks in 90 seconds at TICK_INTERVAL
	var total_ticks: float = LAVA_DURATION / TICK_INTERVAL  # 180 ticks
	lava_step_size = max_lava_radius / total_ticks


# ---------------------------------------------------------------------------
# Floor change
# ---------------------------------------------------------------------------

func _on_floor_advanced(new_floor: int, _previous_floor: int) -> void:
	cleanup()
	# Shift intensity scales with floor depth
	_shift_intensity = 1.0 + (new_floor - 1) * 0.1
	# Reduce countdown on deeper floors
	countdown_timer = maxf(300.0, COUNTDOWN_TIME - (new_floor - 1) * 30.0)


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
