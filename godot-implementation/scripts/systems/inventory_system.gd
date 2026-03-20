class_name InventorySystem
extends BaseSystem
## Grid-based inventory with stacking, equip/unequip, weight tracking, and sorting.

# --- Config ---
const MAX_SLOTS: int = 15
const MAX_STACK: int = 99
const STACKABLE_TYPES: Array[String] = ["consumable", "material"]

# --- Slot structure ---
class InventorySlot:
	var item_id: String = ""
	var quantity: int = 0
	var is_equipped: bool = false
	var item_data: Dictionary = {}  # Cached item properties

	func is_empty() -> bool:
		return item_id.is_empty() or quantity <= 0

	func clear() -> void:
		item_id = ""
		quantity = 0
		is_equipped = false
		item_data = {}

	func to_dict() -> Dictionary:
		return {
			"item_id": item_id,
			"quantity": quantity,
			"is_equipped": is_equipped,
			"item_data": item_data,
		}

	static func from_dict(data: Dictionary) -> InventorySlot:
		var slot := InventorySlot.new()
		slot.item_id = data.get("item_id", "")
		slot.quantity = data.get("quantity", 0)
		slot.is_equipped = data.get("is_equipped", false)
		slot.item_data = data.get("item_data", {})
		return slot


# --- State ---
var slots: Array[InventorySlot] = []
var total_weight: float = 0.0


func _init() -> void:
	system_name = "inventory-system"
	priority = 65


func initialize() -> void:
	_init_slots()


func process_system(_delta: float) -> void:
	pass  # Inventory is event-driven, no per-frame processing needed


func cleanup() -> void:
	_init_slots()
	total_weight = 0.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func add_item(item_id: String, quantity: int = 1, item_data: Dictionary = {}) -> bool:
	## Adds an item to inventory. Returns false if inventory is full.
	if quantity <= 0:
		return false

	var remaining := quantity

	# 1. If stackable and already exists, increment existing stacks
	if _is_stackable(item_id, item_data):
		for slot in slots:
			if slot.item_id == item_id and slot.quantity < MAX_STACK:
				var can_add := mini(remaining, MAX_STACK - slot.quantity)
				slot.quantity += can_add
				remaining -= can_add
				if remaining <= 0:
					_recalculate_weight()
					return true

	# 2. Fill empty slots
	while remaining > 0:
		var empty_index := _find_empty_slot()
		if empty_index == -1:
			return false  # Inventory full

		var slot := slots[empty_index]
		slot.item_id = item_id
		slot.item_data = item_data
		if _is_stackable(item_id, item_data):
			slot.quantity = mini(remaining, MAX_STACK)
			remaining -= slot.quantity
		else:
			slot.quantity = 1
			remaining -= 1

	_recalculate_weight()
	return true


func remove_item(slot_index: int, quantity: int = 1) -> Dictionary:
	## Removes items from a slot. Returns {item_id, quantity} of what was removed.
	if slot_index < 0 or slot_index >= MAX_SLOTS:
		return {}
	var slot := slots[slot_index]
	if slot.is_empty():
		return {}

	var removed_qty := mini(quantity, slot.quantity)
	var result := {"item_id": slot.item_id, "quantity": removed_qty, "item_data": slot.item_data}

	slot.quantity -= removed_qty
	if slot.quantity <= 0:
		slot.clear()

	_recalculate_weight()
	return result


func use_item(slot_index: int) -> bool:
	## Attempts to use the item at the given slot index.
	if slot_index < 0 or slot_index >= MAX_SLOTS:
		return false
	var slot := slots[slot_index]
	if slot.is_empty():
		return false

	# Only consumables can be used
	var item_type: String = slot.item_data.get("type", "")
	if item_type != "consumable":
		return false

	# Apply item effect
	var used := _apply_item_effect(slot.item_id, slot.item_data)
	if used:
		slot.quantity -= 1
		if slot.quantity <= 0:
			slot.clear()
		_recalculate_weight()
	return used


func equip_item(slot_index: int) -> bool:
	## Marks an item as equipped.
	if slot_index < 0 or slot_index >= MAX_SLOTS:
		return false
	var slot := slots[slot_index]
	if slot.is_empty():
		return false

	var item_type: String = slot.item_data.get("type", "")
	if item_type not in ["weapon", "armor", "shield"]:
		return false

	# Unequip existing item of same equip slot
	var equip_slot: String = slot.item_data.get("equip_slot", "")
	for i in range(MAX_SLOTS):
		if slots[i].is_equipped and slots[i].item_data.get("equip_slot", "") == equip_slot:
			slots[i].is_equipped = false

	slot.is_equipped = true
	return true


func unequip_item(slot_index: int) -> bool:
	if slot_index < 0 or slot_index >= MAX_SLOTS:
		return false
	var slot := slots[slot_index]
	if not slot.is_equipped:
		return false
	slot.is_equipped = false
	return true


func get_item_count(item_id: String) -> int:
	var count := 0
	for slot in slots:
		if slot.item_id == item_id:
			count += slot.quantity
	return count


func has_item(item_id: String, quantity: int = 1) -> bool:
	return get_item_count(item_id) >= quantity


func get_slot(index: int) -> InventorySlot:
	if index < 0 or index >= MAX_SLOTS:
		return null
	return slots[index]


func get_equipped_items() -> Array[InventorySlot]:
	var result: Array[InventorySlot] = []
	for slot in slots:
		if slot.is_equipped:
			result.append(slot)
	return result


func get_empty_slot_count() -> int:
	var count := 0
	for slot in slots:
		if slot.is_empty():
			count += 1
	return count


func is_full() -> bool:
	return get_empty_slot_count() == 0


func sort_inventory() -> void:
	## Sorts inventory: equipped first, then by type, then by name.
	var items: Array[Dictionary] = []
	for slot in slots:
		if not slot.is_empty():
			items.append(slot.to_dict())
	# Clear all slots
	for slot in slots:
		slot.clear()
	# Sort: equipped first, then by item_id
	items.sort_custom(func(a, b):
		if a["is_equipped"] != b["is_equipped"]:
			return a["is_equipped"]  # Equipped first
		return a["item_id"] < b["item_id"]
	)
	# Refill slots
	for i in range(mini(items.size(), MAX_SLOTS)):
		slots[i].item_id = items[i]["item_id"]
		slots[i].quantity = items[i]["quantity"]
		slots[i].is_equipped = items[i]["is_equipped"]
		slots[i].item_data = items[i]["item_data"]


func swap_slots(index_a: int, index_b: int) -> void:
	if index_a < 0 or index_a >= MAX_SLOTS or index_b < 0 or index_b >= MAX_SLOTS:
		return
	if index_a == index_b:
		return
	var temp_id := slots[index_a].item_id
	var temp_qty := slots[index_a].quantity
	var temp_equip := slots[index_a].is_equipped
	var temp_data := slots[index_a].item_data

	slots[index_a].item_id = slots[index_b].item_id
	slots[index_a].quantity = slots[index_b].quantity
	slots[index_a].is_equipped = slots[index_b].is_equipped
	slots[index_a].item_data = slots[index_b].item_data

	slots[index_b].item_id = temp_id
	slots[index_b].quantity = temp_qty
	slots[index_b].is_equipped = temp_equip
	slots[index_b].item_data = temp_data


func to_array() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for slot in slots:
		result.append(slot.to_dict())
	return result


func from_array(data: Array) -> void:
	_init_slots()
	for i in range(mini(data.size(), MAX_SLOTS)):
		if data[i] is Dictionary:
			slots[i] = InventorySlot.from_dict(data[i])


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _init_slots() -> void:
	slots.clear()
	for i in range(MAX_SLOTS):
		slots.append(InventorySlot.new())


func _find_empty_slot() -> int:
	for i in range(MAX_SLOTS):
		if slots[i].is_empty():
			return i
	return -1


func _is_stackable(item_id: String, item_data: Dictionary = {}) -> bool:
	var item_type: String = item_data.get("type", "")
	return item_type in STACKABLE_TYPES


func _recalculate_weight() -> void:
	total_weight = 0.0
	for slot in slots:
		if not slot.is_empty():
			var weight: float = slot.item_data.get("weight", 0.0)
			total_weight += weight * float(slot.quantity)


func _apply_item_effect(item_id: String, item_data: Dictionary) -> bool:
	## Applies the effect of a consumable item.
	if not GameManager.player:
		return false

	var player: Node = GameManager.player
	var effect_type: String = item_data.get("effect_type", "")
	var effect_value: float = item_data.get("effect_value", 0.0)

	match effect_type:
		"heal":
			if player.has_method("heal"):
				player.heal(effect_value)
				return true
		"heal_percent":
			if player.has_method("heal") and player.has_method("get_max_hp"):
				player.heal(player.get_max_hp() * effect_value / 100.0)
				return true
		"restore_mana":
			if player.has_method("restore_mana"):
				player.restore_mana(effect_value)
				return true
		"buff":
			# Buffs handled by other systems
			return true
		"cure_poison":
			if player.has_method("cure_status"):
				player.cure_status("poison")
				return true

	return false
