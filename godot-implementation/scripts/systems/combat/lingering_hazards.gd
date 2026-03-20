class_name LingeringHazards
extends BaseSystem
## Manages ground-based hazard zones that deal damage over time,
## apply status effects, and optionally telegraph before activating.

# ── Signals ──────────────────────────────────────────────────────────────────
signal hazard_created(zone: Dictionary)
signal hazard_damage(target: Node, zone: Dictionary, damage: float)
signal hazard_expired(zone: Dictionary)
signal hazard_avoided(target: Node, zone: Dictionary)

# ── Constants ────────────────────────────────────────────────────────────────
const HAZARD_TYPES: Dictionary = {
	"poison_cloud": {
		"damage": 3.0,
		"tick_interval": 1.0,
		"duration": 8.0,
		"status_effect": "poisoned",
		"element": "poison",
		"default_radius": 48.0,
		"default_shape": "cone",
	},
	"fire_patch": {
		"damage": 5.0,
		"tick_interval": 0.5,
		"duration": 6.0,
		"status_effect": "burning",
		"element": "fire",
		"default_radius": 32.0,
		"default_shape": "circle",
	},
	"ice_slick": {
		"damage": 0.0,
		"tick_interval": 0.5,
		"duration": 5.0,
		"status_effect": "chilled",
		"element": "ice",
		"default_radius": 40.0,
		"default_shape": "circle",
		"slow_factor": 0.5,
	},
	"void_zone": {
		"damage": 8.0,
		"tick_interval": 0.8,
		"duration": 4.0,
		"status_effect": "",
		"element": "shadow",
		"default_radius": 36.0,
		"default_shape": "circle",
	},
}

const TELEGRAPH_PULSE_HZ: float = 4.0
const TELEGRAPH_OPACITY_MIN: float = 0.2
const TELEGRAPH_OPACITY_MAX: float = 0.5

# ── State ────────────────────────────────────────────────────────────────────
var active_zones: Array[Dictionary] = []
var _zone_id_counter: int = 0

# ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	system_name = "LingeringHazards"
	priority = 50
	super._ready()


func initialize() -> void:
	active_zones.clear()
	_zone_id_counter = 0


func cleanup() -> void:
	active_zones.clear()
	_zone_id_counter = 0


# ── Convenience Creators ─────────────────────────────────────────────────────

func create_poison_cloud(
	x: float,
	y: float,
	direction: float,
	cone_angle: float,
	radius: float,
	duration_ms: int,
	damage_per_tick: float,
	tick_interval_ms: int
) -> Dictionary:
	var config: Dictionary = {
		"type": "poison_cloud",
		"x": x,
		"y": y,
		"direction": direction,
		"cone_angle": cone_angle,
		"radius": radius,
		"shape": "cone",
		"duration": duration_ms / 1000.0,
		"damage": damage_per_tick,
		"tick_interval": tick_interval_ms / 1000.0,
		"status_effect": "poisoned",
		"element": "poison",
	}
	return create_hazard_zone(config)


func create_fire_patch(x: float, y: float, radius: float, duration_ms: int) -> Dictionary:
	return create_circular_zone(x, y, radius, duration_ms, 5.0, 500, "fire_patch")


func create_ice_slick(x: float, y: float, radius: float, duration_ms: int) -> Dictionary:
	return create_circular_zone(x, y, radius, duration_ms, 0.0, 500, "ice_slick")


func create_void_zone(x: float, y: float, radius: float, duration_ms: int) -> Dictionary:
	return create_circular_zone(x, y, radius, duration_ms, 8.0, 800, "void_zone")


func create_circular_zone(
	x: float,
	y: float,
	radius: float,
	duration_ms: int,
	damage: float,
	tick_interval_ms: int,
	type: String
) -> Dictionary:
	var type_data: Dictionary = HAZARD_TYPES.get(type, {})
	var config: Dictionary = {
		"type": type,
		"x": x,
		"y": y,
		"radius": radius,
		"shape": "circle",
		"duration": duration_ms / 1000.0,
		"damage": damage,
		"tick_interval": tick_interval_ms / 1000.0,
		"status_effect": type_data.get("status_effect", ""),
		"element": type_data.get("element", ""),
	}
	return create_hazard_zone(config)


# ── Core Creation ────────────────────────────────────────────────────────────

func create_hazard_zone(config: Dictionary) -> Dictionary:
	_zone_id_counter += 1

	var type_key: String = config.get("type", "fire_patch")
	var type_data: Dictionary = HAZARD_TYPES.get(type_key, HAZARD_TYPES["fire_patch"])

	var zone: Dictionary = {
		"id": _zone_id_counter,
		"type": type_key,
		"x": config.get("x", 0.0),
		"y": config.get("y", 0.0),
		"radius": config.get("radius", type_data.get("default_radius", 32.0)),
		"shape": config.get("shape", type_data.get("default_shape", "circle")),
		"direction": config.get("direction", 0.0),
		"cone_angle": config.get("cone_angle", 90.0),
		"damage": config.get("damage", type_data.get("damage", 0.0)),
		"tick_interval": config.get("tick_interval", type_data.get("tick_interval", 1.0)),
		"remaining_duration": config.get("duration", type_data.get("duration", 5.0)),
		"tick_timer": 0.0,
		"status_effect": config.get("status_effect", type_data.get("status_effect", "")),
		"element": config.get("element", type_data.get("element", "")),
		"slow_factor": config.get("slow_factor", type_data.get("slow_factor", 1.0)),
		"is_telegraphing": false,
		"telegraph_timer": 0.0,
		"telegraph_opacity": 0.0,
		"targets_hit": [],
		"source": config.get("source", null),
		"active": true,
	}

	active_zones.append(zone)
	hazard_created.emit(zone)
	return zone


func create_telegraphed_hazard(config: Dictionary) -> Dictionary:
	var telegraph_duration: float = config.get("telegraph_duration", 1.0)
	var zone: Dictionary = create_hazard_zone(config)

	zone["is_telegraphing"] = true
	zone["telegraph_timer"] = telegraph_duration
	zone["telegraph_opacity"] = TELEGRAPH_OPACITY_MIN
	zone["active"] = false

	return zone


# ── Processing ───────────────────────────────────────────────────────────────

func process_system(delta: float) -> void:
	var expired_indices: Array[int] = []

	for i in range(active_zones.size()):
		var zone: Dictionary = active_zones[i]

		if zone["is_telegraphing"]:
			_process_telegraph(zone, delta)
			continue

		if not zone["active"]:
			continue

		# Duration countdown
		zone["remaining_duration"] -= delta
		if zone["remaining_duration"] <= 0.0:
			expired_indices.append(i)
			continue

		# Damage tick
		zone["tick_timer"] -= delta
		if zone["tick_timer"] <= 0.0:
			zone["tick_timer"] = zone["tick_interval"]
			_process_zone_tick(zone)

	# Remove expired zones in reverse order
	for i in range(expired_indices.size() - 1, -1, -1):
		var idx: int = expired_indices[i]
		var expired_zone: Dictionary = active_zones[idx]
		active_zones.remove_at(idx)
		hazard_expired.emit(expired_zone)


func _process_telegraph(zone: Dictionary, delta: float) -> void:
	zone["telegraph_timer"] -= delta

	# Pulsing opacity during telegraph phase
	var pulse_time: float = Time.get_ticks_msec() / 1000.0
	var pulse: float = (sin(pulse_time * TELEGRAPH_PULSE_HZ * TAU) + 1.0) * 0.5
	zone["telegraph_opacity"] = lerpf(TELEGRAPH_OPACITY_MIN, TELEGRAPH_OPACITY_MAX, pulse)

	if zone["telegraph_timer"] <= 0.0:
		zone["is_telegraphing"] = false
		zone["active"] = true
		zone["telegraph_opacity"] = 1.0


func _process_zone_tick(zone: Dictionary) -> void:
	var targets: Array = _get_targets_in_zone(zone)
	for target in targets:
		if target != null and target.is_alive:
			_apply_zone_damage(target, zone)


# ── Spatial Queries ──────────────────────────────────────────────────────────

func is_point_in_zone(px: float, py: float, zone: Dictionary) -> bool:
	var dx: float = px - zone["x"]
	var dy: float = py - zone["y"]
	var dist_sq: float = dx * dx + dy * dy
	var radius: float = zone["radius"]

	if dist_sq > radius * radius:
		return false

	if zone["shape"] == "cone":
		var angle_to_point: float = atan2(dy, dx)
		var direction: float = zone["direction"]
		var half_angle: float = deg_to_rad(zone["cone_angle"] * 0.5)
		var angle_diff: float = _angle_diff(angle_to_point, direction)
		return absf(angle_diff) <= half_angle

	# Default: circle
	return true


func _angle_diff(a: float, b: float) -> float:
	var diff: float = fmod(a - b + PI, TAU) - PI
	return diff


func _get_targets_in_zone(zone: Dictionary) -> Array:
	var targets: Array = []
	var entities: Array = get_tree().get_nodes_in_group("entities")
	for entity in entities:
		if not entity.is_alive:
			continue
		var pos: Vector2 = entity.global_position if entity.has_method("get") else Vector2(entity.grid_position.x, entity.grid_position.y) if "grid_position" in entity else Vector2.ZERO
		if is_point_in_zone(pos.x, pos.y, zone):
			targets.append(entity)
	return targets


# ── Damage Application ──────────────────────────────────────────────────────

func _apply_zone_damage(target: Node, zone: Dictionary) -> void:
	var damage: float = zone["damage"]

	if damage > 0.0:
		if "hp" in target:
			target.hp -= damage
			if target.hp <= 0:
				target.hp = 0
				target.is_alive = false
		hazard_damage.emit(target, zone, damage)

	# Apply status effect
	var status: String = zone["status_effect"]
	if not status.is_empty() and "status_effects" in target:
		if status not in target.status_effects:
			target.status_effects.append(status)

	# Apply slow for ice_slick
	if zone["type"] == "ice_slick" and "speed" in target:
		var slow_factor: float = zone.get("slow_factor", 0.5)
		# Slow is applied each tick; removal handled by status effect system
		pass


# ── Queries ──────────────────────────────────────────────────────────────────

func get_active_zones() -> Array[Dictionary]:
	return active_zones


func get_zones_at_point(px: float, py: float) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for zone in active_zones:
		if zone["active"] and is_point_in_zone(px, py, zone):
			result.append(zone)
	return result


func get_zone_count() -> int:
	return active_zones.size()


func remove_zone(zone_id: int) -> bool:
	for i in range(active_zones.size()):
		if active_zones[i]["id"] == zone_id:
			var zone: Dictionary = active_zones[i]
			active_zones.remove_at(i)
			hazard_expired.emit(zone)
			return true
	return false


func remove_zones_by_type(type: String) -> int:
	var removed: int = 0
	var i: int = active_zones.size() - 1
	while i >= 0:
		if active_zones[i]["type"] == type:
			var zone: Dictionary = active_zones[i]
			active_zones.remove_at(i)
			hazard_expired.emit(zone)
			removed += 1
		i -= 1
	return removed


# ── State Change ─────────────────────────────────────────────────────────────

func _on_game_state_changed(old_state: String, new_state: String) -> void:
	on_state_changed(old_state, new_state)


func on_state_changed(old_state: String, new_state: String) -> void:
	# Clear all hazards when leaving combat
	if old_state == "combat" and new_state != "combat":
		for zone in active_zones:
			hazard_expired.emit(zone)
		active_zones.clear()
