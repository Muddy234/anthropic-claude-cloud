class_name LoadoutSystem
extends BaseSystem
## Pre-run equipment setup: save/load loadout presets from banked items,
## equip weapons + armor + consumables, preview stats, and apply at run start.

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

const MAX_PRESETS: int = 5

enum EquipSlot { WEAPON, ARMOR, SHIELD, ACCESSORY_1, ACCESSORY_2 }

const SLOT_NAMES: Dictionary = {
	EquipSlot.WEAPON: "Weapon",
	EquipSlot.ARMOR: "Armor",
	EquipSlot.SHIELD: "Shield",
	EquipSlot.ACCESSORY_1: "Accessory 1",
	EquipSlot.ACCESSORY_2: "Accessory 2",
}

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

## Current loadout: EquipSlot -> bank_slot_index (or -1 if empty)
var _current_loadout: Dictionary = {
	EquipSlot.WEAPON: -1,
	EquipSlot.ARMOR: -1,
	EquipSlot.SHIELD: -1,
	EquipSlot.ACCESSORY_1: -1,
	EquipSlot.ACCESSORY_2: -1,
}

## Saved presets: Array of loadout dictionaries (max MAX_PRESETS)
var _presets: Array[Dictionary] = []

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "loadout_system"
	priority = 50


func initialize() -> void:
	_load_presets()


func process_system(_delta: float) -> void:
	pass


func cleanup() -> void:
	pass  # Loadout persists


# ---------------------------------------------------------------------------
# Equipment operations
# ---------------------------------------------------------------------------

## Equip an item from the bank into a loadout slot. Returns true on success.
func equip_from_bank(bank_slot: int, equip_slot: int) -> bool:
	if GameManager.persistent_state == null:
		return false
	if bank_slot < 0 or bank_slot >= GameManager.persistent_state.bank_items.size():
		return false

	# Check if this bank slot is already equipped in another slot
	for slot in _current_loadout:
		if _current_loadout[slot] == bank_slot and slot != equip_slot:
			return false  # Item already equipped elsewhere

	_current_loadout[equip_slot] = bank_slot
	return true


## Unequip an item from a loadout slot back to available bank items.
func unequip(equip_slot: int) -> bool:
	if not _current_loadout.has(equip_slot):
		return false
	_current_loadout[equip_slot] = -1
	return true


## Get the current loadout as a dictionary of slot -> item data.
func get_loadout() -> Dictionary:
	var result: Dictionary = {}
	if GameManager.persistent_state == null:
		return result

	for slot in _current_loadout:
		var bank_idx: int = _current_loadout[slot]
		if bank_idx >= 0 and bank_idx < GameManager.persistent_state.bank_items.size():
			result[slot] = GameManager.persistent_state.bank_items[bank_idx]
		else:
			result[slot] = null

	return result


## Get the raw loadout slot -> bank_index mapping.
func get_loadout_indices() -> Dictionary:
	return _current_loadout.duplicate()


## Apply the current loadout to the player at run start.
func apply_loadout_to_player() -> void:
	if GameManager.player == null or GameManager.persistent_state == null:
		return

	var loadout: Dictionary = get_loadout()

	for slot in loadout:
		var item = loadout[slot]
		if item == null:
			continue

		if GameManager.player.has_method("equip_item"):
			GameManager.player.equip_item(slot, item)
		else:
			# Fallback: add items to run inventory
			if GameManager.run_state != null:
				GameManager.run_state.inventory.append(item)


## Preview stats for the current loadout (without applying).
func get_stat_preview() -> Dictionary:
	var stats: Dictionary = {
		"attack": 0,
		"defense": 0,
		"speed": 0.0,
		"hp_bonus": 0,
		"element": "",
	}

	var loadout: Dictionary = get_loadout()
	for slot in loadout:
		var item = loadout[slot]
		if item == null:
			continue

		if item is Dictionary:
			stats["attack"] += item.get("attack", 0)
			stats["defense"] += item.get("defense", 0)
			stats["speed"] += item.get("speed_bonus", 0.0)
			stats["hp_bonus"] += item.get("hp_bonus", 0)
			var enchant: Dictionary = item.get("enchantment", {})
			if not enchant.is_empty():
				stats["element"] = enchant.get("element", "")

	return stats


# ---------------------------------------------------------------------------
# Presets
# ---------------------------------------------------------------------------

## Save the current loadout as a preset. Returns preset index.
func save_preset(preset_name: String = "") -> int:
	var preset: Dictionary = {
		"name": preset_name if not preset_name.is_empty() else "Preset %d" % (_presets.size() + 1),
		"slots": _current_loadout.duplicate(),
	}

	if _presets.size() >= MAX_PRESETS:
		# Overwrite the oldest
		_presets[0] = preset
		_save_presets()
		return 0
	else:
		_presets.append(preset)
		_save_presets()
		return _presets.size() - 1


## Load a preset into the current loadout. Returns true on success.
func load_preset(preset_index: int) -> bool:
	if preset_index < 0 or preset_index >= _presets.size():
		return false

	var preset: Dictionary = _presets[preset_index]
	_current_loadout = preset["slots"].duplicate()
	return true


## Delete a preset.
func delete_preset(preset_index: int) -> void:
	if preset_index >= 0 and preset_index < _presets.size():
		_presets.remove_at(preset_index)
		_save_presets()


## Get all presets for UI display.
func get_presets() -> Array[Dictionary]:
	return _presets.duplicate()


## Get preset count.
func get_preset_count() -> int:
	return _presets.size()


# ---------------------------------------------------------------------------
# Recommended loadout
# ---------------------------------------------------------------------------

## Generate a recommended loadout based on active quest context.
func get_recommended_loadout(quest_context: Dictionary = {}) -> Dictionary:
	var recommendation: Dictionary = {}
	if GameManager.persistent_state == null:
		return recommendation

	var bank: Array = GameManager.persistent_state.bank_items
	if bank.is_empty():
		return recommendation

	# Simple heuristic: pick highest-stat item per slot
	var best_weapon_idx: int = -1
	var best_weapon_score: float = -1.0
	var best_armor_idx: int = -1
	var best_armor_score: float = -1.0

	for i in bank.size():
		var item = bank[i]
		if item is Dictionary:
			var subtype: String = item.get("subtype", "")
			var score: float = item.get("stat_bonus", 0.0) + item.get("attack", 0.0) + item.get("defense", 0.0)
			if subtype == "weapon" and score > best_weapon_score:
				best_weapon_score = score
				best_weapon_idx = i
			elif subtype == "armor" and score > best_armor_score:
				best_armor_score = score
				best_armor_idx = i

	recommendation[EquipSlot.WEAPON] = best_weapon_idx
	recommendation[EquipSlot.ARMOR] = best_armor_idx

	return recommendation


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

func _save_presets() -> void:
	if GameManager.persistent_state == null:
		return
	GameManager.persistent_state.npc_states["_loadout_presets"] = _presets.duplicate(true)
	GameManager.persistent_state.npc_states["_loadout_current"] = _current_loadout.duplicate()
	SaveManager.save_game(GameManager.persistent_state)


func _load_presets() -> void:
	if GameManager.persistent_state == null:
		return
	var saved_presets = GameManager.persistent_state.npc_states.get("_loadout_presets", [])
	if saved_presets is Array:
		_presets.clear()
		for p in saved_presets:
			_presets.append(p)

	var saved_loadout = GameManager.persistent_state.npc_states.get("_loadout_current", {})
	if saved_loadout is Dictionary and not saved_loadout.is_empty():
		for slot in saved_loadout:
			_current_loadout[slot] = saved_loadout[slot]
