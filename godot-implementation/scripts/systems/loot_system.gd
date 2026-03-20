class_name LootSystem
extends BaseSystem
## Manages loot drops from monsters and chests: rarity rolls, element enchantment,
## gold/material/equipment drops, loot piles with despawn timers, and sacrifice.

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

const DESPAWN_TIME: float = 120.0
const MONSTER_ITEM_CHANCE: float = 0.25
const EQUIPMENT_DROP_CHANCE: float = 0.40
const WEAPON_RATIO: float = 0.50
const ARMOR_RATIO: float = 0.50
const SHIELD_FROM_ARMOR: float = 0.15
const ENCHANT_CHANCE: float = 0.67
const BLINK_START_TIME: float = 10.0  # Seconds before despawn to start blinking

const ELEMENTS: Array[String] = [
	"fire", "ice", "lightning", "nature", "water",
	"earth", "dark", "holy", "arcane", "void",
]

# Floor-based rarity weights: floor -> {rarity: weight}
const FLOOR_RARITY_WEIGHTS: Dictionary = {
	1:  {"common": 90, "uncommon": 10, "rare": 0, "epic": 0},
	2:  {"common": 78, "uncommon": 18, "rare": 4, "epic": 0},
	3:  {"common": 65, "uncommon": 25, "rare": 9, "epic": 1},
	4:  {"common": 58, "uncommon": 27, "rare": 12, "epic": 3},
	5:  {"common": 50, "uncommon": 30, "rare": 15, "epic": 5},
	6:  {"common": 45, "uncommon": 30, "rare": 17, "epic": 8},
	7:  {"common": 40, "uncommon": 30, "rare": 20, "epic": 10},
	8:  {"common": 35, "uncommon": 28, "rare": 24, "epic": 13},
	9:  {"common": 30, "uncommon": 27, "rare": 27, "epic": 16},
	10: {"common": 25, "uncommon": 26, "rare": 30, "epic": 19},
}

# Enchantment power by rarity
const ENCHANT_POWER: Dictionary = {
	"common": 1,
	"uncommon": 2,
	"rare": 4,
	"epic": 6,
	"legendary": 7,
}

# Sacrifice HP restoration by rarity
const SACRIFICE_HP: Dictionary = {
	"common": {"min": 2, "max": 5},
	"uncommon": {"min": 8, "max": 15},
	"rare": {"min": 30, "max": 50},
	"epic": {"min": 100, "max": 120},
	"legendary": {"min": 150, "max": 200},
}

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

var _loot_piles: Dictionary = {}  # pile_id -> Dictionary
var _next_pile_id: int = 0

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "loot_system"
	priority = 70


func initialize() -> void:
	EventBus.entity_died.connect(_on_entity_died)
	EventBus.floor_advanced.connect(_on_floor_advanced)


func process_system(delta: float) -> void:
	var to_remove: Array[String] = []

	for pid in _loot_piles:
		var pile: Dictionary = _loot_piles[pid]
		pile["age"] += delta
		if pile["age"] >= DESPAWN_TIME:
			to_remove.append(pid)

	for pid in to_remove:
		_loot_piles.erase(pid)


func cleanup() -> void:
	_loot_piles.clear()
	_next_pile_id = 0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Roll loot for a killed monster on the current floor.
func roll_monster_loot(monster_id: String, position: Vector2i, floor_num: int = -1) -> String:
	if floor_num < 0:
		floor_num = _get_current_floor()

	var items: Array[Dictionary] = []

	# Gold drop (always)
	var base_gold: int = 5 + floor_num * 3 + randi() % (5 + floor_num * 2)
	items.append({"type": "gold", "amount": base_gold})

	# Item drop chance
	if randf() < MONSTER_ITEM_CHANCE:
		var rarity: String = _roll_rarity(floor_num)

		if randf() < EQUIPMENT_DROP_CHANCE:
			var equip: Dictionary = _roll_equipment(rarity, floor_num)
			items.append(equip)
		else:
			# Material or consumable
			var mat: Dictionary = _roll_material(rarity)
			items.append(mat)

	if items.is_empty():
		return ""

	return _create_loot_pile(position, items)


## Drop loot from a chest or other source.
func drop_loot(position: Vector2i, items: Array[Dictionary]) -> String:
	if items.is_empty():
		return ""
	return _create_loot_pile(position, items)


## Pick up all items from a loot pile. Returns the items array.
func pick_up_pile(pile_id: String) -> Array[Dictionary]:
	if not _loot_piles.has(pile_id):
		return []

	var pile: Dictionary = _loot_piles[pile_id]
	var items: Array[Dictionary] = []
	for item in pile["items"]:
		items.append(item)

	_loot_piles.erase(pile_id)
	return items


## Pick up a single item from a pile by index. Returns the item dict.
func pick_up_item(pile_id: String, item_index: int) -> Dictionary:
	if not _loot_piles.has(pile_id):
		return {}

	var pile: Dictionary = _loot_piles[pile_id]
	var items: Array = pile["items"]
	if item_index < 0 or item_index >= items.size():
		return {}

	var item: Dictionary = items[item_index]
	items.remove_at(item_index)

	if items.is_empty():
		_loot_piles.erase(pile_id)

	return item


## Sacrifice an item for HP restoration. Returns HP restored.
func sacrifice_item(item: Dictionary) -> int:
	var rarity: String = item.get("rarity", "common")
	var range_data: Dictionary = SACRIFICE_HP.get(rarity, {"min": 1, "max": 3})
	var hp: int = range_data["min"] + randi() % maxi(1, range_data["max"] - range_data["min"] + 1)
	return hp


## Get loot pile at a position, or empty dict.
func get_pile_at(position: Vector2i) -> Dictionary:
	for pid in _loot_piles:
		var pile: Dictionary = _loot_piles[pid]
		if pile["position"] == position:
			return pile
	return {}


## Get all active loot piles.
func get_all_piles() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for pid in _loot_piles:
		result.append(_loot_piles[pid])
	return result


## Get loot pile by ID.
func get_pile(pile_id: String) -> Dictionary:
	return _loot_piles.get(pile_id, {})


## Check if a pile is blinking (near despawn).
func is_pile_blinking(pile_id: String) -> bool:
	if not _loot_piles.has(pile_id):
		return false
	var age: float = _loot_piles[pile_id]["age"]
	return age >= (DESPAWN_TIME - BLINK_START_TIME)


## Get blink alpha (sin-based) for rendering.
func get_blink_alpha(pile_id: String) -> float:
	if not _loot_piles.has(pile_id):
		return 1.0
	var age: float = _loot_piles[pile_id]["age"]
	if age < (DESPAWN_TIME - BLINK_START_TIME):
		return 1.0
	return 0.5 + 0.5 * sin(age / 0.15)


# ---------------------------------------------------------------------------
# Rarity rolling
# ---------------------------------------------------------------------------

func _roll_rarity(floor_num: int) -> String:
	var clamped_floor: int = clampi(floor_num, 1, 10)
	var weights: Dictionary = FLOOR_RARITY_WEIGHTS.get(clamped_floor, FLOOR_RARITY_WEIGHTS[1]).duplicate()

	# Apply shift bonuses if available
	var shift_bonus: Node = get_node_or_null("/root/SystemCoordinator/ShiftBonusSystem")
	if shift_bonus != null and shift_bonus.has_method("apply_to_rarity_weights"):
		weights = shift_bonus.apply_to_rarity_weights(weights)

	var total: float = 0.0
	for key in weights:
		total += float(weights[key])

	var roll: float = randf() * total
	var cumulative: float = 0.0

	for rarity in ["epic", "rare", "uncommon", "common"]:
		cumulative += float(weights.get(rarity, 0))
		if roll < cumulative:
			return rarity

	return "common"


# ---------------------------------------------------------------------------
# Equipment rolling
# ---------------------------------------------------------------------------

func _roll_equipment(rarity: String, floor_num: int) -> Dictionary:
	var is_weapon: bool = randf() < WEAPON_RATIO
	var equipment: Dictionary = {
		"type": "equipment",
		"rarity": rarity,
		"is_weapon": is_weapon,
	}

	if is_weapon:
		equipment["subtype"] = "weapon"
		equipment["weapon_type"] = _random_weapon_type()
	else:
		if randf() < SHIELD_FROM_ARMOR:
			equipment["subtype"] = "shield"
		else:
			equipment["subtype"] = "armor"
			equipment["armor_slot"] = _random_armor_slot()

	# Random stat rolls based on rarity
	var stat_bonus: float = _stat_bonus_for_rarity(rarity)
	equipment["stat_bonus"] = stat_bonus
	equipment["floor_level"] = floor_num

	# Element enchantment
	if randf() < ENCHANT_CHANCE:
		equipment["enchantment"] = _roll_enchantment(rarity)

	return equipment


func _roll_enchantment(rarity: String) -> Dictionary:
	var element: String = ELEMENTS[randi() % ELEMENTS.size()]
	var power: int = ENCHANT_POWER.get(rarity, 1)
	return {"element": element, "power": power}


func _stat_bonus_for_rarity(rarity: String) -> float:
	match rarity:
		"common":
			return randf_range(0.0, 0.05)
		"uncommon":
			return randf_range(0.05, 0.15)
		"rare":
			return randf_range(0.15, 0.30)
		"epic":
			return randf_range(0.30, 0.50)
		"legendary":
			return randf_range(0.50, 0.75)
	return 0.0


func _random_weapon_type() -> String:
	var types: Array[String] = ["sword", "mace", "polearm", "bow", "dagger", "staff"]
	return types[randi() % types.size()]


func _random_armor_slot() -> String:
	var slots: Array[String] = ["head", "chest", "legs", "feet"]
	return slots[randi() % slots.size()]


# ---------------------------------------------------------------------------
# Material rolling
# ---------------------------------------------------------------------------

func _roll_material(rarity: String) -> Dictionary:
	return {
		"type": "material",
		"rarity": rarity,
		"material_id": "material_%s" % rarity,
		"quantity": 1 + randi() % 3,
	}


# ---------------------------------------------------------------------------
# Loot pile management
# ---------------------------------------------------------------------------

func _create_loot_pile(position: Vector2i, items: Array[Dictionary]) -> String:
	var pile_id: String = "loot_%d" % _next_pile_id
	_next_pile_id += 1

	var pile: Dictionary = {
		"id": pile_id,
		"position": position,
		"items": items,
		"spawn_time": Time.get_ticks_msec() / 1000.0,
		"age": 0.0,
	}

	_loot_piles[pile_id] = pile

	# Also add to GameManager ground loot
	GameManager.ground_loot.append({
		"pile_id": pile_id,
		"position": position,
		"items": items,
	})

	return pile_id


# ---------------------------------------------------------------------------
# Signal handlers
# ---------------------------------------------------------------------------

func _on_entity_died(entity: Node, _killer: Node) -> void:
	if entity == null:
		return
	# Only drop loot for enemies, not for the player
	if entity == GameManager.player:
		return

	var pos: Vector2i = _get_entity_tile(entity)
	var monster_id: String = ""
	if "id" in entity:
		monster_id = entity.id
	elif "monster_id" in entity:
		monster_id = entity.monster_id

	roll_monster_loot(monster_id, pos)


func _on_floor_advanced(_new_floor: int, _previous_floor: int) -> void:
	cleanup()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

func _get_current_floor() -> int:
	if GameManager.run_state != null:
		return GameManager.run_state.current_floor
	return 1


func _get_entity_tile(entity: Node) -> Vector2i:
	if entity.has_method("get_tile_position"):
		return entity.get_tile_position()
	if "tile_position" in entity:
		return entity.tile_position
	if "position" in entity:
		return Vector2i(entity.position)
	return Vector2i.ZERO
