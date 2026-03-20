class_name HazardSystem
extends BaseSystem
## Manages environmental hazard zones: lava pools, poison clouds, spike traps,
## ice patches, acid pools, and 14 other hazard variants with element theming
## and AI avoidance tiers.

# ---------------------------------------------------------------------------
# Hazard definition structure
# ---------------------------------------------------------------------------

const HAZARD_DEFINITIONS: Dictionary = {
	"lava_pool": {
		"display_name": "Lava Pool",
		"element": Constants.Element.FIRE,
		"damage": 8,
		"tick_rate": 0.5,
		"duration": -1.0,
		"area": 1,
		"effect": "burning",
		"avoid_tiers": [Constants.MonsterTier.TIER_3, Constants.MonsterTier.TIER_2, Constants.MonsterTier.TIER_1],
		"threat_level": "medium",
	},
	"poison_cloud": {
		"display_name": "Poison Cloud",
		"element": Constants.Element.NATURE,
		"damage": 3,
		"tick_rate": 1.0,
		"duration": 15.0,
		"area": 2,
		"effect": "poison",
		"avoid_tiers": [Constants.MonsterTier.TIER_3, Constants.MonsterTier.TIER_2],
		"threat_level": "low",
	},
	"spike_trap": {
		"display_name": "Spike Trap",
		"element": Constants.Element.PHYSICAL,
		"damage": 15,
		"tick_rate": 0.0,
		"duration": -1.0,
		"area": 1,
		"effect": "none",
		"trigger_cooldown": 2.0,
		"avoid_tiers": [Constants.MonsterTier.TIER_3, Constants.MonsterTier.TIER_2, Constants.MonsterTier.TIER_1],
		"threat_level": "high",
	},
	"ice_patch": {
		"display_name": "Ice Patch",
		"element": Constants.Element.ICE,
		"damage": 0,
		"tick_rate": 0.0,
		"duration": -1.0,
		"area": 1,
		"effect": "slow",
		"slow_amount": 0.5,
		"avoid_tiers": [Constants.MonsterTier.TIER_3],
		"threat_level": "low",
	},
	"acid_pool": {
		"display_name": "Acid Pool",
		"element": Constants.Element.NATURE,
		"damage": 6,
		"tick_rate": 0.5,
		"duration": -1.0,
		"area": 1,
		"effect": "corrode",
		"avoid_tiers": [Constants.MonsterTier.TIER_3, Constants.MonsterTier.TIER_2, Constants.MonsterTier.TIER_1],
		"threat_level": "medium",
	},
	"fire_vent": {
		"display_name": "Fire Vent",
		"element": Constants.Element.FIRE,
		"damage": 18,
		"tick_rate": 0.0,
		"duration": -1.0,
		"area": 1,
		"effect": "burning",
		"trigger_cooldown": 3.0,
		"avoid_tiers": [Constants.MonsterTier.TIER_3, Constants.MonsterTier.TIER_2, Constants.MonsterTier.TIER_1],
		"threat_level": "high",
	},
	"thorn_patch": {
		"display_name": "Thorn Patch",
		"element": Constants.Element.NATURE,
		"damage": 5,
		"tick_rate": 0.5,
		"duration": -1.0,
		"area": 1,
		"effect": "slow",
		"slow_amount": 0.3,
		"avoid_tiers": [Constants.MonsterTier.TIER_3, Constants.MonsterTier.TIER_2],
		"threat_level": "medium",
	},
	"poison_spores": {
		"display_name": "Poison Spores",
		"element": Constants.Element.NATURE,
		"damage": 2,
		"tick_rate": 1.0,
		"duration": 20.0,
		"area": 2,
		"effect": "poison",
		"avoid_tiers": [Constants.MonsterTier.TIER_3],
		"threat_level": "low",
	},
	"mana_void": {
		"display_name": "Mana Void",
		"element": Constants.Element.ARCANE,
		"damage": 0,
		"tick_rate": 1.0,
		"duration": -1.0,
		"area": 2,
		"effect": "mana_drain",
		"drain_amount": 5,
		"avoid_tiers": [Constants.MonsterTier.TIER_3],
		"threat_level": "low",
	},
	"crystal_shards": {
		"display_name": "Crystal Shards",
		"element": Constants.Element.EARTH,
		"damage": 7,
		"tick_rate": 0.5,
		"duration": -1.0,
		"area": 1,
		"effect": "none",
		"avoid_tiers": [Constants.MonsterTier.TIER_3, Constants.MonsterTier.TIER_2],
		"threat_level": "medium",
	},
	"whirlpool": {
		"display_name": "Whirlpool",
		"element": Constants.Element.WATER,
		"damage": 4,
		"tick_rate": 0.5,
		"duration": -1.0,
		"area": 2,
		"effect": "pull",
		"avoid_tiers": [Constants.MonsterTier.TIER_3, Constants.MonsterTier.TIER_2],
		"threat_level": "medium",
	},
	"pit_trap": {
		"display_name": "Pit Trap",
		"element": Constants.Element.PHYSICAL,
		"damage": 20,
		"tick_rate": 0.0,
		"duration": -1.0,
		"area": 1,
		"effect": "stun",
		"stun_duration": 1.5,
		"trigger_cooldown": 5.0,
		"avoid_tiers": [Constants.MonsterTier.TIER_3, Constants.MonsterTier.TIER_2, Constants.MonsterTier.TIER_1],
		"threat_level": "high",
	},
	"arcane_mine": {
		"display_name": "Arcane Mine",
		"element": Constants.Element.ARCANE,
		"damage": 18,
		"tick_rate": 0.0,
		"duration": -1.0,
		"area": 2,
		"effect": "none",
		"trigger_cooldown": -1.0,
		"avoid_tiers": [Constants.MonsterTier.TIER_3, Constants.MonsterTier.TIER_2, Constants.MonsterTier.TIER_1],
		"threat_level": "high",
	},
	"sanctified_ground": {
		"display_name": "Sanctified Ground",
		"element": Constants.Element.HOLY,
		"damage": -5,
		"tick_rate": 1.0,
		"duration": -1.0,
		"area": 2,
		"effect": "heal_living",
		"undead_damage": 10,
		"avoid_tiers": [],
		"threat_level": "low",
	},
	"void_rift": {
		"display_name": "Void Rift",
		"element": Constants.Element.DARK,
		"damage": 12,
		"tick_rate": 0.5,
		"duration": 10.0,
		"area": 3,
		"effect": "teleport_risk",
		"teleport_chance": 0.1,
		"avoid_tiers": [Constants.MonsterTier.TIER_3, Constants.MonsterTier.TIER_2, Constants.MonsterTier.TIER_1],
		"threat_level": "high",
	},
	"darkness_zone": {
		"display_name": "Darkness Zone",
		"element": Constants.Element.DARK,
		"damage": 0,
		"tick_rate": 0.0,
		"duration": -1.0,
		"area": 3,
		"effect": "blind",
		"avoid_tiers": [Constants.MonsterTier.TIER_3],
		"threat_level": "low",
	},
	"frozen_floor": {
		"display_name": "Frozen Floor",
		"element": Constants.Element.ICE,
		"damage": 0,
		"tick_rate": 0.0,
		"duration": -1.0,
		"area": 1,
		"effect": "slip",
		"slow_amount": 0.5,
		"warmth_drain": 2.0,
		"avoid_tiers": [Constants.MonsterTier.TIER_3],
		"threat_level": "low",
	},
	"corrupted_ground": {
		"display_name": "Corrupted Ground",
		"element": Constants.Element.DARK,
		"damage": 3,
		"tick_rate": 1.0,
		"duration": -1.0,
		"area": 1,
		"effect": "corruption",
		"corruption_amount": 1.0,
		"avoid_tiers": [Constants.MonsterTier.TIER_3, Constants.MonsterTier.TIER_2],
		"threat_level": "low",
	},
	"unstable_floor": {
		"display_name": "Unstable Floor",
		"element": Constants.Element.EARTH,
		"damage": 0,
		"tick_rate": 0.0,
		"duration": -1.0,
		"area": 1,
		"effect": "collapse_risk",
		"collapse_chance_per_sec": 0.1,
		"warning_time": 2.0,
		"avoid_tiers": [Constants.MonsterTier.TIER_3, Constants.MonsterTier.TIER_2],
		"threat_level": "medium",
	},
}

const SPAWN_DENSITY: float = 0.02
const MAX_PER_ROOM: int = 5

# ---------------------------------------------------------------------------
# Active hazard instance
# ---------------------------------------------------------------------------

var _active_hazards: Dictionary = {}  # hazard_id -> Dictionary
var _next_hazard_id: int = 0
var _tick_timers: Dictionary = {}     # hazard_id -> float (accumulated time)
var _trigger_cooldowns: Dictionary = {}  # hazard_id -> float (remaining cooldown)
var _duration_timers: Dictionary = {}    # hazard_id -> float (remaining lifetime)
var _entity_overlap: Dictionary = {}     # hazard_id -> Array[Node] (entities currently inside)

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "hazard_system"
	priority = 50


func initialize() -> void:
	pass


func process_system(delta: float) -> void:
	_update_tick_timers(delta)
	_update_trigger_cooldowns(delta)
	_update_durations(delta)


func cleanup() -> void:
	_active_hazards.clear()
	_tick_timers.clear()
	_trigger_cooldowns.clear()
	_duration_timers.clear()
	_entity_overlap.clear()
	_next_hazard_id = 0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Register a new hazard instance at a world position.
func register_hazard(hazard_type: String, position: Vector2i, overrides: Dictionary = {}) -> String:
	if not HAZARD_DEFINITIONS.has(hazard_type):
		push_warning("HazardSystem: Unknown hazard type '%s'" % hazard_type)
		return ""

	var definition: Dictionary = HAZARD_DEFINITIONS[hazard_type].duplicate(true)
	for key in overrides:
		definition[key] = overrides[key]

	var hazard_id: String = "hazard_%d" % _next_hazard_id
	_next_hazard_id += 1

	var hazard: Dictionary = {
		"id": hazard_id,
		"type": hazard_type,
		"position": position,
		"definition": definition,
		"active": true,
	}
	_active_hazards[hazard_id] = hazard
	_tick_timers[hazard_id] = 0.0
	_entity_overlap[hazard_id] = []

	if definition.get("trigger_cooldown", 0.0) != 0.0:
		_trigger_cooldowns[hazard_id] = 0.0

	var duration: float = definition.get("duration", -1.0)
	if duration > 0.0:
		_duration_timers[hazard_id] = duration

	EventBus.hazard_created.emit(Vector2(position), hazard_type, float(definition.get("damage", 0)))
	return hazard_id


## Remove a hazard by ID.
func remove_hazard(hazard_id: String) -> void:
	_active_hazards.erase(hazard_id)
	_tick_timers.erase(hazard_id)
	_trigger_cooldowns.erase(hazard_id)
	_duration_timers.erase(hazard_id)
	_entity_overlap.erase(hazard_id)


## Check if an entity is overlapping any hazard and apply effects.
func check_entity_collision(entity: Node) -> void:
	if entity == null:
		return
	var entity_pos: Vector2i = _get_entity_tile(entity)

	for hazard_id in _active_hazards:
		var hazard: Dictionary = _active_hazards[hazard_id]
		if not hazard["active"]:
			continue

		var def: Dictionary = hazard["definition"]
		var hpos: Vector2i = hazard["position"]
		var area: int = def.get("area", 1)

		if _is_in_area(entity_pos, hpos, area):
			_on_entity_enter_hazard(entity, hazard)
		else:
			_on_entity_exit_hazard(entity, hazard)


## Whether a given monster should path-avoid a hazard.
func should_avoid(monster: Node, hazard_id: String) -> bool:
	if not _active_hazards.has(hazard_id):
		return false
	var def: Dictionary = _active_hazards[hazard_id]["definition"]
	var avoid_tiers: Array = def.get("avoid_tiers", [])
	if monster.has_method("get_tier"):
		return avoid_tiers.has(monster.get_tier())
	return false


## Spawn hazards for a room based on room element and floor area.
func spawn_for_room(room: Dictionary) -> void:
	var room_element: int = room.get("element", Constants.Element.NONE)
	var room_width: int = room.get("width", 5)
	var room_height: int = room.get("height", 5)
	var room_x: int = room.get("x", 0)
	var room_y: int = room.get("y", 0)
	var area: int = room_width * room_height
	var count: int = mini(MAX_PER_ROOM, int(area * SPAWN_DENSITY))
	if count <= 0:
		return

	var eligible: Array[String] = []
	for hazard_type in HAZARD_DEFINITIONS:
		var def: Dictionary = HAZARD_DEFINITIONS[hazard_type]
		var h_element: int = def.get("element", Constants.Element.NONE)
		if h_element == room_element or h_element == Constants.Element.PHYSICAL:
			eligible.append(hazard_type)

	if eligible.is_empty():
		# Fallback: allow any physical hazard
		for hazard_type in HAZARD_DEFINITIONS:
			var def: Dictionary = HAZARD_DEFINITIONS[hazard_type]
			if def.get("element", Constants.Element.NONE) == Constants.Element.PHYSICAL:
				eligible.append(hazard_type)

	if eligible.is_empty():
		return

	for i in count:
		var htype: String = eligible[randi() % eligible.size()]
		var px: int = room_x + 1 + (randi() % maxi(1, room_width - 2))
		var py: int = room_y + 1 + (randi() % maxi(1, room_height - 2))
		register_hazard(htype, Vector2i(px, py))


## Get hazard at a specific tile position, or null.
func get_hazard_at(position: Vector2i) -> Dictionary:
	for hazard_id in _active_hazards:
		var hazard: Dictionary = _active_hazards[hazard_id]
		var def: Dictionary = hazard["definition"]
		if _is_in_area(position, hazard["position"], def.get("area", 1)):
			return hazard
	return {}


## Get all active hazard IDs.
func get_active_hazard_ids() -> Array[String]:
	var ids: Array[String] = []
	for key in _active_hazards:
		ids.append(key)
	return ids


## Get hazard data by ID.
func get_hazard(hazard_id: String) -> Dictionary:
	return _active_hazards.get(hazard_id, {})


# ---------------------------------------------------------------------------
# Internal tick processing
# ---------------------------------------------------------------------------

func _update_tick_timers(delta: float) -> void:
	for hazard_id in _tick_timers:
		if not _active_hazards.has(hazard_id):
			continue
		var hazard: Dictionary = _active_hazards[hazard_id]
		var def: Dictionary = hazard["definition"]
		var tick_rate: float = def.get("tick_rate", 0.0)
		if tick_rate <= 0.0:
			continue

		_tick_timers[hazard_id] += delta
		if _tick_timers[hazard_id] >= tick_rate:
			_tick_timers[hazard_id] -= tick_rate
			_tick_hazard(hazard)


func _update_trigger_cooldowns(delta: float) -> void:
	for hazard_id in _trigger_cooldowns:
		if _trigger_cooldowns[hazard_id] > 0.0:
			_trigger_cooldowns[hazard_id] = maxf(0.0, _trigger_cooldowns[hazard_id] - delta)


func _update_durations(delta: float) -> void:
	var to_remove: Array[String] = []
	for hazard_id in _duration_timers:
		_duration_timers[hazard_id] -= delta
		if _duration_timers[hazard_id] <= 0.0:
			to_remove.append(hazard_id)
	for hazard_id in to_remove:
		remove_hazard(hazard_id)


## Apply area-of-effect damage to all overlapping entities.
func _tick_hazard(hazard: Dictionary) -> void:
	var hazard_id: String = hazard["id"]
	var overlapping: Array = _entity_overlap.get(hazard_id, [])
	var def: Dictionary = hazard["definition"]
	var damage: float = float(def.get("damage", 0))

	for entity in overlapping:
		if entity == null or not is_instance_valid(entity):
			continue
		_apply_hazard_damage(entity, damage, def)


func _on_entity_enter_hazard(entity: Node, hazard: Dictionary) -> void:
	var hazard_id: String = hazard["id"]
	var overlap_list: Array = _entity_overlap.get(hazard_id, [])
	if overlap_list.has(entity):
		return  # Already tracked

	overlap_list.append(entity)
	_entity_overlap[hazard_id] = overlap_list

	var def: Dictionary = hazard["definition"]

	# Trigger-type hazards (spike trap, fire vent, etc.)
	if def.has("trigger_cooldown"):
		var cd: float = _trigger_cooldowns.get(hazard_id, 0.0)
		if cd <= 0.0:
			var damage: float = float(def.get("damage", 0))
			_apply_hazard_damage(entity, damage, def)
			var reset_time: float = def.get("trigger_cooldown", 2.0)
			if reset_time > 0.0:
				_trigger_cooldowns[hazard_id] = reset_time
			elif reset_time < 0.0:
				# One-shot hazard (arcane mine)
				remove_hazard(hazard_id)

	# Apply immediate effects
	var effect: String = def.get("effect", "none")
	_apply_hazard_effect(entity, effect, def)


func _on_entity_exit_hazard(entity: Node, hazard: Dictionary) -> void:
	var hazard_id: String = hazard["id"]
	var overlap_list: Array = _entity_overlap.get(hazard_id, [])
	var idx: int = overlap_list.find(entity)
	if idx >= 0:
		overlap_list.remove_at(idx)
		_entity_overlap[hazard_id] = overlap_list
		_remove_hazard_effect(entity, hazard["definition"])


func _apply_hazard_damage(entity: Node, damage: float, def: Dictionary) -> void:
	if damage == 0.0:
		return

	var hazard_type: String = def.get("display_name", "hazard")

	# Negative damage = healing (sanctified ground)
	if damage < 0.0:
		if entity.has_method("heal"):
			entity.heal(absf(damage))
		return

	# Sanctified ground special: damages undead
	if def.get("element", Constants.Element.NONE) == Constants.Element.HOLY:
		var undead_dmg: int = def.get("undead_damage", 0)
		if undead_dmg > 0 and entity.has_method("is_undead") and entity.is_undead():
			damage = float(undead_dmg)
		elif damage < 0.0:
			# Heals living entities
			if entity.has_method("heal"):
				entity.heal(absf(damage))
			return

	if entity.has_method("take_damage"):
		entity.take_damage(damage)
	EventBus.hazard_damage.emit(entity, damage, hazard_type)


func _apply_hazard_effect(entity: Node, effect: String, def: Dictionary) -> void:
	match effect:
		"slow", "slip":
			var amount: float = def.get("slow_amount", 0.5)
			if entity.has_method("apply_speed_modifier"):
				entity.apply_speed_modifier("hazard_slow", 1.0 - amount)
		"poison":
			if entity.has_method("apply_status"):
				entity.apply_status("poison", 5.0)
		"burning":
			if entity.has_method("apply_status"):
				entity.apply_status("burning", 3.0)
		"stun":
			var stun_dur: float = def.get("stun_duration", 1.0)
			if entity.has_method("apply_status"):
				entity.apply_status("stun", stun_dur)
		"mana_drain":
			var amount: int = def.get("drain_amount", 5)
			if entity.has_method("drain_mana"):
				entity.drain_mana(amount)
		"blind":
			if entity.has_method("apply_status"):
				entity.apply_status("blind", 2.0)
		"corruption":
			var amount: float = def.get("corruption_amount", 1.0)
			if entity.has_method("add_corruption"):
				entity.add_corruption(amount)
		"corrode":
			if entity.has_method("apply_status"):
				entity.apply_status("corrode", 3.0)
		"pull":
			pass  # Handled by physics/movement system
		"teleport_risk":
			var chance: float = def.get("teleport_chance", 0.1)
			if randf() < chance and entity.has_method("random_teleport"):
				entity.random_teleport()
		"collapse_risk":
			pass  # Handled by dynamic tile system
		"heal_living":
			pass  # Handled in _apply_hazard_damage


func _remove_hazard_effect(entity: Node, def: Dictionary) -> void:
	var effect: String = def.get("effect", "none")
	match effect:
		"slow", "slip":
			if entity.has_method("remove_speed_modifier"):
				entity.remove_speed_modifier("hazard_slow")


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


func _is_in_area(point: Vector2i, center: Vector2i, radius: int) -> bool:
	var dx: int = absi(point.x - center.x)
	var dy: int = absi(point.y - center.y)
	return dx <= radius and dy <= radius
