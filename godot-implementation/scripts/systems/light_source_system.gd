class_name LightSourceSystem
extends BaseSystem
## Dynamic lighting with Perlin noise flicker, spatial grid optimization,
## and multiple source types (torch, brazier, campfire, etc.).

# --- Config ---
const TORCH_FUEL_MAX: float = 120.0       # seconds of fuel
const TORCH_DEPLETE_RATE: float = 1.0     # fuel per second
const BASE_LIGHT_RADIUS: float = 4.0      # tiles
const MIN_LIGHT_RADIUS: float = 1.0
const FLICKER_SPEED: float = 8.0
const FLICKER_INTENSITY: float = 0.08
const FLICKER_TABLE_SIZE: int = 256
const SPATIAL_CELL_SIZE: int = 8
const CAMPFIRE_HEAL_PERCENT: float = 0.01 # 1% HP per second
const CAMPFIRE_HEAL_RADIUS: float = 2.0

# --- Light source type definitions ---
const LIGHT_TYPES: Dictionary = {
	"torch":        {"radius": 4,  "fuel": 120.0, "permanent": false},
	"brazier":      {"radius": 5,  "fuel": 60.0,  "permanent": false, "warmth_bonus": 8.0},
	"lantern":      {"radius": 3,  "fuel": 300.0, "permanent": false},
	"campfire":     {"radius": 5,  "fuel": -1.0,  "permanent": true,  "heal_radius": 2.0},
	"spell":        {"radius": 4,  "fuel": 30.0,  "permanent": false},
	"player":       {"radius": 3,  "fuel": -1.0,  "permanent": true},
	"thermal_vent": {"radius": 7,  "fuel": -1.0,  "permanent": true,  "warmth_bonus": 15.0},
	"holy_light":   {"radius": 5,  "fuel": -1.0,  "permanent": true,  "undead_dps": 5.0},
}

# --- State ---
var _sources: Dictionary = {}           # source_id -> LightSourceData
var _spatial_grid: Dictionary = {}      # Vector2i -> Array[String] (source ids)
var _flicker_table: PackedFloat32Array = PackedFloat32Array()
var _global_darkness: float = 0.0       # 0.0 (bright) to 1.0 (dark)
var _next_source_id: int = 0
var _player_torch_fuel: float = TORCH_FUEL_MAX
var _player_torch_active: bool = true


class LightSourceData:
	var id: String = ""
	var source_type: String = "torch"
	var position: Vector2i = Vector2i.ZERO
	var radius: float = 4.0
	var fuel: float = 120.0
	var permanent: bool = false
	var base_intensity: float = 1.0
	var flicker_offset: float = 0.0
	var warmth_bonus: float = 0.0
	var heal_radius: float = 0.0
	var undead_dps: float = 0.0
	var owner_node: Node = null
	var active: bool = true


func _init() -> void:
	system_name = "light-source-system"
	priority = 4


func initialize() -> void:
	_build_flicker_table()


func process_system(delta: float) -> void:
	_update_player_torch(delta)
	_update_fuel(delta)
	_update_healing(delta)


func cleanup() -> void:
	_sources.clear()
	_spatial_grid.clear()
	_player_torch_fuel = TORCH_FUEL_MAX
	_player_torch_active = true
	_global_darkness = 0.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func add_source(config: Dictionary) -> String:
	## Creates a light source. config keys: type, position, owner, intensity.
	var src := LightSourceData.new()
	_next_source_id += 1
	src.id = "light_%d" % _next_source_id
	src.source_type = config.get("type", "torch")
	src.position = config.get("position", Vector2i.ZERO)
	src.owner_node = config.get("owner", null)
	src.base_intensity = config.get("intensity", 1.0)
	src.flicker_offset = randf() * 100.0

	var type_def: Dictionary = LIGHT_TYPES.get(src.source_type, LIGHT_TYPES["torch"])
	src.radius = type_def.get("radius", 4.0)
	src.fuel = type_def.get("fuel", 120.0)
	src.permanent = type_def.get("permanent", false)
	src.warmth_bonus = type_def.get("warmth_bonus", 0.0)
	src.heal_radius = type_def.get("heal_radius", 0.0)
	src.undead_dps = type_def.get("undead_dps", 0.0)

	_sources[src.id] = src
	_add_to_spatial_grid(src)
	return src.id


func remove_source(source_id: String) -> void:
	if not _sources.has(source_id):
		return
	var src: LightSourceData = _sources[source_id]
	_remove_from_spatial_grid(src)
	_sources.erase(source_id)


func get_visibility_at(x: int, y: int) -> float:
	## Returns 0.0 (dark) to 1.0 (bright) at tile (x, y).
	var max_vis := 0.0
	var nearby := _get_nearby_sources(x, y, 12)
	for src_id in nearby:
		var src: LightSourceData = _sources.get(src_id)
		if src == null or not src.active:
			continue
		var dist := Vector2(x, y).distance_to(Vector2(src.position))
		var effective_radius := _get_effective_radius(src)
		if dist <= effective_radius:
			var intensity := src.base_intensity * (1.0 - dist / effective_radius)
			intensity += _get_flicker_value(src)
			max_vis = maxf(max_vis, intensity)
	max_vis = clampf(max_vis * (1.0 - _global_darkness), 0.0, 1.0)
	return max_vis


func get_tile_brightness_at(x: int, y: int) -> float:
	return get_visibility_at(x, y)


func get_warmth_bonus_at(x: int, y: int) -> float:
	## Returns warmth bonus from nearby light sources.
	var total := 0.0
	var nearby := _get_nearby_sources(x, y, 10)
	for src_id in nearby:
		var src: LightSourceData = _sources.get(src_id)
		if src == null or not src.active or src.warmth_bonus <= 0.0:
			continue
		var dist := Vector2(x, y).distance_to(Vector2(src.position))
		var effective_radius := _get_effective_radius(src)
		if dist <= effective_radius:
			total += src.warmth_bonus * (1.0 - dist / effective_radius)
	return total


func set_global_darkness(level: float) -> void:
	_global_darkness = clampf(level, 0.0, 1.0)


func get_player_torch_fuel() -> float:
	return _player_torch_fuel


func get_player_torch_fuel_percent() -> float:
	return _player_torch_fuel / TORCH_FUEL_MAX


func is_player_torch_active() -> bool:
	return _player_torch_active


func toggle_player_torch() -> void:
	_player_torch_active = not _player_torch_active


func get_player_light_radius() -> float:
	if not _player_torch_active or _player_torch_fuel <= 0.0:
		return LIGHT_TYPES["player"]["radius"]  # Base player glow only
	var fuel_ratio := _player_torch_fuel / TORCH_FUEL_MAX
	var torch_radius := BASE_LIGHT_RADIUS * fuel_ratio
	return maxf(torch_radius, MIN_LIGHT_RADIUS) + float(LIGHT_TYPES["player"]["radius"])


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _update_player_torch(delta: float) -> void:
	if not _player_torch_active:
		return
	if _player_torch_fuel > 0.0:
		_player_torch_fuel -= TORCH_DEPLETE_RATE * delta
		_player_torch_fuel = maxf(_player_torch_fuel, 0.0)
		if _player_torch_fuel <= 0.0:
			_player_torch_active = false


func _update_fuel(delta: float) -> void:
	var expired: Array[String] = []
	for src_id in _sources:
		var src: LightSourceData = _sources[src_id]
		if src.permanent or not src.active:
			continue
		src.fuel -= delta
		if src.fuel <= 0.0:
			src.fuel = 0.0
			src.active = false
			expired.append(src_id)
	for src_id in expired:
		remove_source(src_id)


func _update_healing(delta: float) -> void:
	if not GameManager.player:
		return
	var player: Node = GameManager.player
	var player_tile := Vector2i(
		int(player.position.x) / Constants.BASE_TILE_SIZE,
		int(player.position.y) / Constants.BASE_TILE_SIZE
	)
	for src_id in _sources:
		var src: LightSourceData = _sources[src_id]
		if not src.active or src.heal_radius <= 0.0:
			continue
		var dist := Vector2(player_tile).distance_to(Vector2(src.position))
		if dist <= src.heal_radius:
			# Only heal out of combat
			if GameManager.current_state != Constants.GameState.COMBAT:
				if player.has_method("heal"):
					var max_hp: float = 100.0
					if player.has_method("get_max_hp"):
						max_hp = player.get_max_hp()
					player.heal(max_hp * CAMPFIRE_HEAL_PERCENT * delta)


func _get_effective_radius(src: LightSourceData) -> float:
	if src.permanent:
		return src.radius
	var fuel_ratio := src.fuel / maxf(LIGHT_TYPES.get(src.source_type, {}).get("fuel", 120.0), 1.0)
	return maxf(src.radius * fuel_ratio, MIN_LIGHT_RADIUS)


func _get_flicker_value(src: LightSourceData) -> float:
	var time_offset := src.flicker_offset + Time.get_ticks_msec() / 1000.0
	var index := int(time_offset * FLICKER_SPEED) % FLICKER_TABLE_SIZE
	if index < 0:
		index += FLICKER_TABLE_SIZE
	return _flicker_table[index] * FLICKER_INTENSITY


func _build_flicker_table() -> void:
	_flicker_table.resize(FLICKER_TABLE_SIZE)
	for i in FLICKER_TABLE_SIZE:
		# Simple pseudo-Perlin: layered sine waves
		var t := float(i) / float(FLICKER_TABLE_SIZE) * TAU
		_flicker_table[i] = (sin(t) * 0.5 + sin(t * 2.3) * 0.3 + sin(t * 5.7) * 0.2)


# ---------------------------------------------------------------------------
# Spatial grid
# ---------------------------------------------------------------------------

func _grid_key(x: int, y: int) -> Vector2i:
	return Vector2i(x / SPATIAL_CELL_SIZE, y / SPATIAL_CELL_SIZE)


func _add_to_spatial_grid(src: LightSourceData) -> void:
	var key := _grid_key(src.position.x, src.position.y)
	if not _spatial_grid.has(key):
		_spatial_grid[key] = []
	_spatial_grid[key].append(src.id)


func _remove_from_spatial_grid(src: LightSourceData) -> void:
	var key := _grid_key(src.position.x, src.position.y)
	if _spatial_grid.has(key):
		_spatial_grid[key].erase(src.id)
		if _spatial_grid[key].is_empty():
			_spatial_grid.erase(key)


func _get_nearby_sources(x: int, y: int, search_range: int) -> Array[String]:
	var result: Array[String] = []
	var cell_range := search_range / SPATIAL_CELL_SIZE + 1
	var center := _grid_key(x, y)
	for cx in range(center.x - cell_range, center.x + cell_range + 1):
		for cy in range(center.y - cell_range, center.y + cell_range + 1):
			var key := Vector2i(cx, cy)
			if _spatial_grid.has(key):
				for src_id in _spatial_grid[key]:
					result.append(src_id)
	return result
