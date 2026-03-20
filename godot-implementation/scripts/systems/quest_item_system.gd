class_name QuestItemSystem
extends BaseSystem
## Manages special quest items that have carry effects, can't be dropped/sold,
## and track collection/delivery for quest progression.

# ---------------------------------------------------------------------------
# Quest item type definitions
# ---------------------------------------------------------------------------

const ITEM_TYPE_DEFS: Dictionary = {
	"seal_fragment": {
		"display_name": "Seal Fragment",
		"max_carry": 5,
		"speed_mod": 0.85,
		"glowing": true,
		"attracts": ["void"],
		"light_radius": 0,
		"dot_per_second": 0.0,
		"explodes_on_death": false,
	},
	"keycard": {
		"display_name": "Keycard",
		"max_carry": 10,
		"speed_mod": 1.0,
		"glowing": false,
		"attracts": [],
		"light_radius": 0,
		"dot_per_second": 0.0,
		"explodes_on_death": false,
	},
	"crystal_shard": {
		"display_name": "Crystal Shard",
		"max_carry": 1,
		"speed_mod": 0.9,
		"glowing": true,
		"attracts": [],
		"light_radius": 0,
		"dot_per_second": 1.0,
		"explodes_on_death": false,
	},
	"holy_relic": {
		"display_name": "Holy Relic",
		"max_carry": 1,
		"speed_mod": 1.0,
		"glowing": true,
		"attracts": [],
		"light_radius": 3,
		"dot_per_second": 0.0,
		"explodes_on_death": false,
		"damages_undead": true,
	},
	"energy_cell": {
		"display_name": "Energy Cell",
		"max_carry": 2,
		"speed_mod": 0.9,
		"glowing": false,
		"attracts": [],
		"light_radius": 0,
		"dot_per_second": 0.0,
		"explodes_on_death": true,
		"explosion_damage": 50,
		"explosion_radius": 3,
	},
}

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

## Active quest item collection session
var _active_quest: Dictionary = {}  # config from start_quest()

## Spawned quest items in the world: item_id -> Dictionary
var _world_items: Dictionary = {}
var _next_item_id: int = 0

## Items carried by the player: item_id -> Dictionary
var _carried_items: Dictionary = {}

## Delivery points: dp_id -> Dictionary {position, quest_id, accepted_types}
var _delivery_points: Dictionary = {}

## Aggregated carry effects currently applied
var _current_effects: Dictionary = {
	"speed_mod": 1.0,
	"glowing": false,
	"light_radius": 0,
	"attracts": [],
}

## DOT timer for items that damage the carrier
var _dot_timer: float = 0.0

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "quest_item_system"
	priority = 66


func initialize() -> void:
	EventBus.entity_died.connect(_on_entity_died)
	EventBus.floor_advanced.connect(_on_floor_advanced)


func process_system(delta: float) -> void:
	if _carried_items.is_empty():
		return

	# DOT from carried items
	_dot_timer += delta
	if _dot_timer >= 1.0:
		_dot_timer -= 1.0
		_apply_carry_dot()


func cleanup() -> void:
	_world_items.clear()
	_carried_items.clear()
	_delivery_points.clear()
	_active_quest = {}
	_next_item_id = 0
	_dot_timer = 0.0
	_reset_carry_effects()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Start a quest item collection session.
func start_quest(config: Dictionary) -> void:
	_active_quest = config.duplicate()
	# config: { quest_id, item_type, required_count, delivery_point }


## Spawn a quest item in the world. Returns item_id.
func spawn_item(config: Dictionary) -> String:
	var item_type: String = config.get("type", "keycard")
	if not ITEM_TYPE_DEFS.has(item_type):
		push_warning("QuestItemSystem: Unknown type '%s'" % item_type)
		return ""

	var item_id: String = "qi_%d" % _next_item_id
	_next_item_id += 1

	var item: Dictionary = {
		"id": item_id,
		"type": item_type,
		"definition": ITEM_TYPE_DEFS[item_type],
		"position": config.get("position", Vector2i.ZERO),
		"quest_id": config.get("quest_id", ""),
		"collected": false,
	}

	_world_items[item_id] = item
	return item_id


## Collect a quest item. Returns true on success.
func collect_item(item_id: String) -> bool:
	if not _world_items.has(item_id):
		return false

	var item: Dictionary = _world_items[item_id]
	if item["collected"]:
		return false

	var def: Dictionary = item["definition"]
	var item_type: String = item["type"]

	# Check carry cap
	var carry_count: int = _count_carried_of_type(item_type)
	if carry_count >= def.get("max_carry", 1):
		return false

	item["collected"] = true
	_carried_items[item_id] = item
	_world_items.erase(item_id)

	update_player_carry_effects()

	# Notify quest system
	var quest_sys: Node = get_node_or_null("/root/SystemCoordinator/QuestSystem")
	if quest_sys != null and quest_sys.has_method("update_objective"):
		quest_sys.update_objective("collect", item_type, 1)

	return true


## Drop a carried quest item back into the world. Returns true on success.
func drop_item(item_id: String) -> bool:
	if not _carried_items.has(item_id):
		return false

	var item: Dictionary = _carried_items[item_id]
	item["collected"] = false

	# Place at player position
	if GameManager.player != null:
		item["position"] = _get_entity_tile(GameManager.player)

	_world_items[item_id] = item
	_carried_items.erase(item_id)

	update_player_carry_effects()
	return true


## Deliver carried items to a delivery point. Returns count delivered.
func deliver_items(delivery_point_id: String) -> int:
	if not _delivery_points.has(delivery_point_id):
		return 0

	var dp: Dictionary = _delivery_points[delivery_point_id]
	var accepted: Array = dp.get("accepted_types", [])
	var delivered: int = 0
	var to_remove: Array[String] = []

	for item_id in _carried_items:
		var item: Dictionary = _carried_items[item_id]
		if accepted.has(item["type"]):
			to_remove.append(item_id)
			delivered += 1

	for item_id in to_remove:
		_carried_items.erase(item_id)

	if delivered > 0:
		update_player_carry_effects()

		# Notify quest system
		var quest_sys: Node = get_node_or_null("/root/SystemCoordinator/QuestSystem")
		if quest_sys != null and quest_sys.has_method("update_objective"):
			var quest_id: String = dp.get("quest_id", "")
			quest_sys.update_objective("deliver", delivery_point_id, delivered)

	return delivered


## Register a delivery point.
func register_delivery_point(dp_id: String, config: Dictionary) -> void:
	_delivery_points[dp_id] = {
		"id": dp_id,
		"position": config.get("position", Vector2i.ZERO),
		"quest_id": config.get("quest_id", ""),
		"accepted_types": config.get("accepted_types", []),
	}


## Recalculate and apply combined carry effects to the player.
func update_player_carry_effects() -> void:
	var speed_mod: float = 1.0
	var glowing: bool = false
	var light_radius: int = 0
	var attracts: Array = []

	for item_id in _carried_items:
		var def: Dictionary = _carried_items[item_id]["definition"]
		speed_mod *= def.get("speed_mod", 1.0)
		if def.get("glowing", false):
			glowing = true
		light_radius = maxi(light_radius, def.get("light_radius", 0))
		for a in def.get("attracts", []):
			if not attracts.has(a):
				attracts.append(a)

	_current_effects = {
		"speed_mod": speed_mod,
		"glowing": glowing,
		"light_radius": light_radius,
		"attracts": attracts,
	}

	# Apply to player
	if GameManager.player != null:
		if GameManager.player.has_method("apply_speed_modifier"):
			GameManager.player.apply_speed_modifier("quest_item_carry", speed_mod)


## Get current carry effects.
func get_carry_effects() -> Dictionary:
	return _current_effects.duplicate()


## Get all carried items.
func get_carried_items() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for item_id in _carried_items:
		result.append(_carried_items[item_id])
	return result


## Get all world (uncollected) quest items.
func get_world_items() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for item_id in _world_items:
		result.append(_world_items[item_id])
	return result


## Count carried items of a specific type.
func get_carried_count(item_type: String) -> int:
	return _count_carried_of_type(item_type)


## Get total carried item count.
func get_total_carried() -> int:
	return _carried_items.size()


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _count_carried_of_type(item_type: String) -> int:
	var count: int = 0
	for item_id in _carried_items:
		if _carried_items[item_id]["type"] == item_type:
			count += 1
	return count


func _apply_carry_dot() -> void:
	if GameManager.player == null:
		return

	var total_dot: float = 0.0
	for item_id in _carried_items:
		var def: Dictionary = _carried_items[item_id]["definition"]
		total_dot += def.get("dot_per_second", 0.0)

	if total_dot > 0.0 and GameManager.player.has_method("take_damage"):
		GameManager.player.take_damage(total_dot)


func _reset_carry_effects() -> void:
	_current_effects = {
		"speed_mod": 1.0,
		"glowing": false,
		"light_radius": 0,
		"attracts": [],
	}
	if GameManager.player != null and GameManager.player.has_method("remove_speed_modifier"):
		GameManager.player.remove_speed_modifier("quest_item_carry")


# ---------------------------------------------------------------------------
# Death explosion handling
# ---------------------------------------------------------------------------

func _on_entity_died(entity: Node, _killer: Node) -> void:
	if entity != GameManager.player:
		return

	# Check for explode-on-death items
	for item_id in _carried_items:
		var def: Dictionary = _carried_items[item_id]["definition"]
		if def.get("explodes_on_death", false):
			var damage: int = def.get("explosion_damage", 50)
			var radius: int = def.get("explosion_radius", 3)
			_trigger_explosion(_get_entity_tile(entity), damage, radius)

	# Drop all carried items on death
	var carried_ids: Array = _carried_items.keys()
	for item_id in carried_ids:
		drop_item(item_id)


func _trigger_explosion(center: Vector2i, damage: int, radius: int) -> void:
	for enemy in GameManager.enemies:
		if enemy == null or not is_instance_valid(enemy):
			continue
		var epos: Vector2i = _get_entity_tile(enemy)
		var dx: int = absi(epos.x - center.x)
		var dy: int = absi(epos.y - center.y)
		if dx <= radius and dy <= radius:
			if enemy.has_method("take_damage"):
				enemy.take_damage(float(damage))


func _on_floor_advanced(_new_floor: int, _previous_floor: int) -> void:
	# World items reset on floor change; carried items persist
	_world_items.clear()
	_delivery_points.clear()


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
