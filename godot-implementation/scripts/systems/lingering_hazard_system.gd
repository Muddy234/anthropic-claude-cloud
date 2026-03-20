class_name LingeringHazardSystem
extends BaseSystem
## Manages spell/ability-created temporary hazard zones with telegraph warnings,
## lifetime management, damage ticking, and visual effect coordination.
## Hard cap of MAX_ACTIVE lingering hazards at any time.

const MAX_ACTIVE: int = 20

# ---------------------------------------------------------------------------
# Lingering hazard type definitions
# ---------------------------------------------------------------------------

const LINGERING_TYPES: Dictionary = {
	"fire_pool": {
		"display_name": "Fire Pool",
		"element": Constants.Element.FIRE,
		"damage_per_tick": 8,
		"tick_rate": 0.5,
		"duration": 5.0,
		"telegraph_time": 0.5,
		"radius": 2,
		"effect": "burning",
		"particle_color": Color(1.0, 0.4, 0.1),
		"particle_style": "rising",
	},
	"poison_cloud": {
		"display_name": "Poison Cloud",
		"element": Constants.Element.NATURE,
		"damage_per_tick": 4,
		"tick_rate": 1.0,
		"duration": 8.0,
		"telegraph_time": 0.3,
		"radius": 3,
		"effect": "poison",
		"particle_color": Color(0.2, 0.8, 0.1),
		"particle_style": "floating",
	},
	"ice_zone": {
		"display_name": "Ice Zone",
		"element": Constants.Element.ICE,
		"damage_per_tick": 2,
		"tick_rate": 0.5,
		"duration": 6.0,
		"telegraph_time": 0.4,
		"radius": 2,
		"effect": "slow",
		"slow_amount": 0.5,
		"particle_color": Color(0.6, 0.8, 1.0),
		"particle_style": "falling",
	},
	"void_rift": {
		"display_name": "Void Rift",
		"element": Constants.Element.DARK,
		"damage_per_tick": 12,
		"tick_rate": 0.5,
		"duration": 3.0,
		"telegraph_time": 1.0,
		"radius": 2,
		"effect": "teleport_risk",
		"teleport_chance": 0.1,
		"particle_color": Color(0.6, 0.1, 0.8),
		"particle_style": "swirling",
	},
	"lightning_field": {
		"display_name": "Lightning Field",
		"element": Constants.Element.ARCANE,
		"damage_per_tick": 6,
		"tick_rate": 0.3,
		"duration": 4.0,
		"telegraph_time": 0.6,
		"radius": 2,
		"effect": "stun",
		"stun_chance": 0.15,
		"particle_color": Color(0.9, 0.9, 0.2),
		"particle_style": "sparking",
	},
	"holy_ground": {
		"display_name": "Holy Ground",
		"element": Constants.Element.HOLY,
		"damage_per_tick": -3,
		"tick_rate": 1.0,
		"duration": 10.0,
		"telegraph_time": 0.2,
		"radius": 2,
		"effect": "heal_living",
		"undead_damage": 8,
		"particle_color": Color(1.0, 1.0, 0.8),
		"particle_style": "rising",
	},
}

# ---------------------------------------------------------------------------
# Phase enum
# ---------------------------------------------------------------------------

enum Phase { TELEGRAPH, ACTIVE, FADING }

const FADE_DURATION: float = 0.5

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

var _hazards: Dictionary = {}  # id -> Dictionary
var _next_id: int = 0

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "lingering_hazard_system"
	priority = 50


func initialize() -> void:
	EventBus.player_spell_cast.connect(_on_spell_cast)


func process_system(delta: float) -> void:
	var to_remove: Array[String] = []

	for hid in _hazards:
		var h: Dictionary = _hazards[hid]
		h["age"] += delta

		match h["phase"]:
			Phase.TELEGRAPH:
				_process_telegraph(h, delta)
			Phase.ACTIVE:
				_process_active(h, delta)
			Phase.FADING:
				h["fade_timer"] -= delta
				if h["fade_timer"] <= 0.0:
					to_remove.append(hid)

	for hid in to_remove:
		_hazards.erase(hid)


func cleanup() -> void:
	_hazards.clear()
	_next_id = 0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Create a lingering hazard zone. Returns hazard id, or empty string if at cap.
func create_hazard(config: Dictionary) -> String:
	if _hazards.size() >= MAX_ACTIVE:
		_evict_oldest()

	var hazard_type: String = config.get("type", "fire_pool")
	if not LINGERING_TYPES.has(hazard_type):
		push_warning("LingeringHazardSystem: Unknown type '%s'" % hazard_type)
		return ""

	var def: Dictionary = LINGERING_TYPES[hazard_type].duplicate(true)
	# Allow config overrides
	for key in ["duration", "damage_per_tick", "radius"]:
		if config.has(key):
			def[key] = config[key]

	var hid: String = "lh_%d" % _next_id
	_next_id += 1

	var hazard: Dictionary = {
		"id": hid,
		"type": hazard_type,
		"definition": def,
		"position": config.get("position", Vector2i.ZERO),
		"source": config.get("source", null),
		"phase": Phase.TELEGRAPH,
		"age": 0.0,
		"telegraph_timer": def["telegraph_time"],
		"duration_remaining": def["duration"],
		"tick_timer": 0.0,
		"fade_timer": FADE_DURATION,
		"entities_inside": [],
	}

	_hazards[hid] = hazard
	return hid


## Remove a lingering hazard immediately.
func remove_hazard(hazard_id: String) -> void:
	if _hazards.has(hazard_id):
		var h: Dictionary = _hazards[hazard_id]
		_clear_effects_on_entities(h)
		_hazards.erase(hazard_id)


## Get all active hazard data for rendering.
func get_active_hazards() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for hid in _hazards:
		result.append(_hazards[hid])
	return result


## Query if a position is inside any active lingering hazard.
func get_hazards_at(position: Vector2i) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for hid in _hazards:
		var h: Dictionary = _hazards[hid]
		if h["phase"] != Phase.ACTIVE:
			continue
		var radius: int = h["definition"].get("radius", 1)
		if _in_radius(position, h["position"], radius):
			result.append(h)
	return result


## Get current count.
func get_active_count() -> int:
	return _hazards.size()


# ---------------------------------------------------------------------------
# Phase processing
# ---------------------------------------------------------------------------

func _process_telegraph(h: Dictionary, delta: float) -> void:
	h["telegraph_timer"] -= delta
	if h["telegraph_timer"] <= 0.0:
		h["phase"] = Phase.ACTIVE
		EventBus.hazard_created.emit(
			Vector2(h["position"]),
			h["type"],
			float(h["definition"].get("damage_per_tick", 0))
		)


func _process_active(h: Dictionary, delta: float) -> void:
	var def: Dictionary = h["definition"]

	# Tick damage
	var tick_rate: float = def.get("tick_rate", 0.5)
	h["tick_timer"] += delta
	if h["tick_timer"] >= tick_rate:
		h["tick_timer"] -= tick_rate
		_tick_damage(h)

	# Update entity overlap
	_update_entity_overlap(h)

	# Duration countdown
	h["duration_remaining"] -= delta
	if h["duration_remaining"] <= 0.0:
		h["phase"] = Phase.FADING
		_clear_effects_on_entities(h)


func _tick_damage(h: Dictionary) -> void:
	var def: Dictionary = h["definition"]
	var damage: float = float(def.get("damage_per_tick", 0))
	var source: Node = h.get("source")

	for entity in h["entities_inside"]:
		if entity == null or not is_instance_valid(entity):
			continue

		# Skip source entity (don't damage caster)
		if source != null and entity == source:
			continue

		if damage < 0.0:
			# Healing effect
			if entity.has_method("heal"):
				entity.heal(absf(damage))
		elif damage > 0.0:
			# Holy ground special: extra damage to undead
			if def.get("element") == Constants.Element.HOLY:
				if entity.has_method("is_undead") and entity.is_undead():
					damage = float(def.get("undead_damage", damage))

			if entity.has_method("take_damage"):
				entity.take_damage(damage)
			EventBus.hazard_damage.emit(entity, damage, h["type"])

		# Apply secondary effects
		_apply_lingering_effect(entity, def)


func _apply_lingering_effect(entity: Node, def: Dictionary) -> void:
	var effect: String = def.get("effect", "none")
	match effect:
		"burning":
			if entity.has_method("apply_status"):
				entity.apply_status("burning", 2.0)
		"poison":
			if entity.has_method("apply_status"):
				entity.apply_status("poison", 3.0)
		"slow":
			var amount: float = def.get("slow_amount", 0.5)
			if entity.has_method("apply_speed_modifier"):
				entity.apply_speed_modifier("lingering_slow", 1.0 - amount)
		"stun":
			var chance: float = def.get("stun_chance", 0.15)
			if randf() < chance and entity.has_method("apply_status"):
				entity.apply_status("stun", 0.5)
		"teleport_risk":
			var chance: float = def.get("teleport_chance", 0.1)
			if randf() < chance and entity.has_method("random_teleport"):
				entity.random_teleport()


func _update_entity_overlap(h: Dictionary) -> void:
	var radius: int = h["definition"].get("radius", 1)
	var center: Vector2i = h["position"]

	# Check player
	var new_list: Array = []
	if GameManager.player != null and is_instance_valid(GameManager.player):
		var ppos: Vector2i = _get_entity_tile(GameManager.player)
		if _in_radius(ppos, center, radius):
			new_list.append(GameManager.player)

	# Check enemies
	for enemy in GameManager.enemies:
		if enemy == null or not is_instance_valid(enemy):
			continue
		var epos: Vector2i = _get_entity_tile(enemy)
		if _in_radius(epos, center, radius):
			new_list.append(enemy)

	# Detect exits for effect removal
	for old_entity in h["entities_inside"]:
		if not new_list.has(old_entity):
			_remove_lingering_effect(old_entity, h["definition"])

	h["entities_inside"] = new_list


func _clear_effects_on_entities(h: Dictionary) -> void:
	for entity in h.get("entities_inside", []):
		if entity != null and is_instance_valid(entity):
			_remove_lingering_effect(entity, h["definition"])
	h["entities_inside"] = []


func _remove_lingering_effect(entity: Node, def: Dictionary) -> void:
	var effect: String = def.get("effect", "none")
	if effect == "slow":
		if entity.has_method("remove_speed_modifier"):
			entity.remove_speed_modifier("lingering_slow")


# ---------------------------------------------------------------------------
# Spell integration
# ---------------------------------------------------------------------------

func _on_spell_cast(spell_name: String, position: Vector2) -> void:
	# Map spell names to lingering hazard types
	var mapping: Dictionary = {
		"fireball": "fire_pool",
		"ice_lance": "ice_zone",
		"poison_bolt": "poison_cloud",
		"lightning": "lightning_field",
		"void_bolt": "void_rift",
		"heal": "holy_ground",
	}

	if mapping.has(spell_name):
		create_hazard({
			"type": mapping[spell_name],
			"position": Vector2i(position),
			"source": GameManager.player,
		})


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

func _evict_oldest() -> void:
	var oldest_id: String = ""
	var oldest_age: float = -1.0
	for hid in _hazards:
		var h: Dictionary = _hazards[hid]
		if h["age"] > oldest_age:
			oldest_age = h["age"]
			oldest_id = hid
	if not oldest_id.is_empty():
		remove_hazard(oldest_id)


func _get_entity_tile(entity: Node) -> Vector2i:
	if entity.has_method("get_tile_position"):
		return entity.get_tile_position()
	if "tile_position" in entity:
		return entity.tile_position
	if "position" in entity:
		return Vector2i(entity.position)
	return Vector2i.ZERO


func _in_radius(point: Vector2i, center: Vector2i, radius: int) -> bool:
	var dx: int = absi(point.x - center.x)
	var dy: int = absi(point.y - center.y)
	return dx <= radius and dy <= radius
