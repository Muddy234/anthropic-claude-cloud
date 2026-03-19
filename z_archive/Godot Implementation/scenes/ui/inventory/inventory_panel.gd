class_name InventoryPanel
extends Control

## Full inventory panel with equipment slots and item grid

signal item_used(item: ItemData)
signal item_dropped(item: ItemData)
signal closed

@onready var equipment_slots: VBoxContainer = $PanelContainer/MarginContainer/VBoxContainer/HBoxContainer/EquipmentSection/EquipmentSlots
@onready var inventory_grid: GridContainer = $PanelContainer/MarginContainer/VBoxContainer/HBoxContainer/InventorySection/ScrollContainer/InventoryGrid
@onready var gold_label: Label = $PanelContainer/MarginContainer/VBoxContainer/HBoxContainer/InventorySection/GoldLabel
@onready var weight_label: Label = $PanelContainer/MarginContainer/VBoxContainer/HBoxContainer/InventorySection/WeightLabel
@onready var item_tooltip: Control = $ItemTooltip
@onready var close_button: Button = $PanelContainer/MarginContainer/VBoxContainer/TitleBar/CloseButton

const INVENTORY_SLOT_SCENE := preload("res://scenes/ui/inventory/inventory_slot.tscn")
const INVENTORY_SIZE := 20
const GRID_COLUMNS := 5

var equipment_slot_refs: Dictionary = {}  # EquipSlot -> InventorySlot
var inventory_slot_refs: Array[InventorySlot] = []
var selected_slot: InventorySlot = null
var is_open: bool = false

func _ready():
	_setup_equipment_slots()
	_setup_inventory_grid()

	# Connect signals
	EventBus.item_hovered.connect(_on_item_hovered)
	EventBus.item_unhovered.connect(_on_item_unhovered)
	EventBus.inventory_changed.connect(_refresh_inventory)
	EventBus.equipment_changed.connect(_refresh_equipment)
	EventBus.gold_changed.connect(_on_gold_changed)

	visibility_changed.connect(_on_visibility_changed)
	hide()

func _unhandled_input(event: InputEvent):
	if not visible:
		return

	if event.is_action_pressed("inventory") or event.is_action_pressed("ui_cancel"):
		close()
		get_viewport().set_input_as_handled()

func _setup_equipment_slots():
	var equip_slot_types := [
		Constants.EquipSlot.HEAD,
		Constants.EquipSlot.BODY,
		Constants.EquipSlot.WEAPON,
		Constants.EquipSlot.OFF_HAND,
		Constants.EquipSlot.HANDS,
		Constants.EquipSlot.FEET,
		Constants.EquipSlot.ACCESSORY
	]

	for slot_type in equip_slot_types:
		var slot: InventorySlot = INVENTORY_SLOT_SCENE.instantiate()
		slot.slot_type = slot_type
		slot.is_equipment_slot = true
		slot.slot_clicked.connect(_on_equipment_slot_clicked)
		slot.slot_right_clicked.connect(_on_slot_right_clicked)
		slot.item_dropped.connect(_on_item_swap)
		equipment_slots.add_child(slot)
		equipment_slot_refs[slot_type] = slot

func _setup_inventory_grid():
	inventory_grid.columns = GRID_COLUMNS

	for i in INVENTORY_SIZE:
		var slot: InventorySlot = INVENTORY_SLOT_SCENE.instantiate()
		slot.slot_index = i
		slot.slot_clicked.connect(_on_inventory_slot_clicked)
		slot.slot_right_clicked.connect(_on_slot_right_clicked)
		slot.item_dropped.connect(_on_item_swap)
		inventory_grid.add_child(slot)
		inventory_slot_refs.append(slot)

## Open the inventory
func open():
	_refresh_all()
	show()
	is_open = true

## Close the inventory
func close():
	hide()
	is_open = false
	_clear_selection()
	closed.emit()

func _on_visibility_changed():
	if visible:
		_refresh_all()

## Refresh all displays
func _refresh_all():
	_refresh_equipment()
	_refresh_inventory()
	_update_gold()
	_update_weight()

## Refresh equipment display
func _refresh_equipment():
	if not GameManager.player:
		return

	var player := GameManager.player
	for slot_type in equipment_slot_refs:
		var slot: InventorySlot = equipment_slot_refs[slot_type]
		var equipped_item = player.equipment.get(slot_type)
		if equipped_item:
			slot.set_item(equipped_item)
		else:
			slot.clear()

## Refresh inventory display
func _refresh_inventory():
	if not GameManager.player:
		return

	var player := GameManager.player
	for i in inventory_slot_refs.size():
		var slot := inventory_slot_refs[i]
		if i < player.inventory.size() and player.inventory[i]:
			var item: ItemData = player.inventory[i]
			slot.set_item(item, item.stack_count)
		else:
			slot.clear()

## Update gold display
func _update_gold():
	if gold_label and GameManager.player:
		gold_label.text = "Gold: %s" % Helpers.format_number(GameManager.player.gold)

func _on_gold_changed(amount: int, _change: int):
	if gold_label:
		gold_label.text = "Gold: %s" % Helpers.format_number(amount)

## Update weight display
func _update_weight():
	if weight_label and GameManager.player:
		var current := _calculate_weight()
		var max_weight := GameManager.player.get_stat("carry_capacity")
		weight_label.text = "Weight: %d / %d" % [current, max_weight]

func _calculate_weight() -> int:
	if not GameManager.player:
		return 0

	var total := 0
	for item: ItemData in GameManager.player.inventory:
		if item:
			total += item.weight * item.stack_count
	return total

## Handle equipment slot click
func _on_equipment_slot_clicked(slot: InventorySlot):
	if selected_slot:
		# Try to swap/equip
		if selected_slot.is_equipment_slot:
			# Swap equipment (usually not needed)
			_clear_selection()
		else:
			# Equip from inventory
			_try_equip(selected_slot, slot)
			_clear_selection()
	else:
		if slot.item:
			_select_slot(slot)

## Handle inventory slot click
func _on_inventory_slot_clicked(slot: InventorySlot):
	if selected_slot:
		if selected_slot == slot:
			_clear_selection()
		else:
			# Swap items
			_swap_inventory_items(selected_slot, slot)
			_clear_selection()
	else:
		if slot.item:
			_select_slot(slot)

## Handle right-click (use/unequip)
func _on_slot_right_clicked(slot: InventorySlot):
	if not slot.item:
		return

	if slot.is_equipment_slot:
		# Unequip
		_try_unequip(slot)
	else:
		# Use item
		_try_use_item(slot)

## Handle drag-drop swap
func _on_item_swap(from_slot: InventorySlot, to_slot: InventorySlot):
	if from_slot.is_equipment_slot and to_slot.is_equipment_slot:
		return  # Can't swap equipment slots directly

	if from_slot.is_equipment_slot:
		_try_unequip_to_slot(from_slot, to_slot)
	elif to_slot.is_equipment_slot:
		_try_equip(from_slot, to_slot)
	else:
		_swap_inventory_items(from_slot, to_slot)

## Try to equip an item
func _try_equip(from_slot: InventorySlot, equip_slot: InventorySlot):
	if not from_slot.item:
		return
	if not equip_slot.accepts_item(from_slot.item):
		return

	var player := GameManager.player
	if not player:
		return

	# Unequip current if any
	var old_item = player.equipment.get(equip_slot.slot_type)

	# Equip new
	player.equip_item(from_slot.item, equip_slot.slot_type)

	# Put old item in inventory slot
	if old_item:
		from_slot.set_item(old_item)

	_refresh_all()

## Try to unequip an item
func _try_unequip(equip_slot: InventorySlot):
	if not equip_slot.item:
		return

	var player := GameManager.player
	if not player:
		return

	# Find empty inventory slot
	var empty_index := _find_empty_slot()
	if empty_index == -1:
		EventBus.message_logged.emit("Inventory full!", Constants.COLORS.warning)
		return

	player.unequip_item(equip_slot.slot_type)
	_refresh_all()

func _try_unequip_to_slot(equip_slot: InventorySlot, inv_slot: InventorySlot):
	if not equip_slot.item:
		return

	var player := GameManager.player
	if not player:
		return

	# Swap if inventory slot has compatible item
	if inv_slot.item and equip_slot.accepts_item(inv_slot.item):
		var old_equip = equip_slot.item
		player.equip_item(inv_slot.item, equip_slot.slot_type)
		player.inventory[inv_slot.slot_index] = old_equip
	else:
		player.unequip_item(equip_slot.slot_type)
		if inv_slot.item:
			# Move unequipped to first empty slot
			pass

	_refresh_all()

## Try to use an item
func _try_use_item(slot: InventorySlot):
	if not slot.item:
		return

	var item := slot.item
	if item.item_type == Constants.ItemType.CONSUMABLE:
		item_used.emit(item)
		GameManager.player.use_item(item)
		_refresh_inventory()
	elif item.item_type in [Constants.ItemType.WEAPON, Constants.ItemType.ARMOR, Constants.ItemType.ACCESSORY]:
		# Auto-equip to appropriate slot
		var target_slot := _get_equip_slot_for_item(item)
		if target_slot != Constants.EquipSlot.NONE:
			_try_equip(slot, equipment_slot_refs[target_slot])

func _get_equip_slot_for_item(item: ItemData) -> Constants.EquipSlot:
	match item.item_type:
		Constants.ItemType.WEAPON:
			return Constants.EquipSlot.WEAPON
		Constants.ItemType.ARMOR:
			if item.equip_slot != Constants.EquipSlot.NONE:
				return item.equip_slot
			return Constants.EquipSlot.BODY
		Constants.ItemType.ACCESSORY:
			return Constants.EquipSlot.ACCESSORY
		_:
			return Constants.EquipSlot.NONE

## Swap two inventory items
func _swap_inventory_items(slot_a: InventorySlot, slot_b: InventorySlot):
	var player := GameManager.player
	if not player:
		return

	var idx_a := slot_a.slot_index
	var idx_b := slot_b.slot_index

	var temp = player.inventory[idx_a]
	player.inventory[idx_a] = player.inventory[idx_b]
	player.inventory[idx_b] = temp

	_refresh_inventory()

## Find empty inventory slot
func _find_empty_slot() -> int:
	if not GameManager.player:
		return -1

	for i in GameManager.player.inventory.size():
		if not GameManager.player.inventory[i]:
			return i
	return -1

## Select a slot
func _select_slot(slot: InventorySlot):
	_clear_selection()
	selected_slot = slot
	slot.set_selected(true)

## Clear selection
func _clear_selection():
	if selected_slot:
		selected_slot.set_selected(false)
		selected_slot = null

## Show item tooltip
func _on_item_hovered(item: ItemData):
	if item_tooltip and item:
		_update_tooltip(item)
		item_tooltip.visible = true

func _on_item_unhovered():
	if item_tooltip:
		item_tooltip.visible = false

func _update_tooltip(item: ItemData):
	if not item_tooltip:
		return

	var name_label = item_tooltip.get_node_or_null("NameLabel")
	var desc_label = item_tooltip.get_node_or_null("DescriptionLabel")
	var stats_label = item_tooltip.get_node_or_null("StatsLabel")

	if name_label:
		name_label.text = item.display_name
		name_label.add_theme_color_override("font_color", _get_rarity_color(item.rarity))

	if desc_label:
		desc_label.text = item.description

	if stats_label:
		stats_label.text = _format_item_stats(item)

func _get_rarity_color(rarity: Constants.Rarity) -> Color:
	match rarity:
		Constants.Rarity.COMMON:
			return Color.WHITE
		Constants.Rarity.UNCOMMON:
			return Color.GREEN
		Constants.Rarity.RARE:
			return Color.BLUE
		Constants.Rarity.EPIC:
			return Color.PURPLE
		Constants.Rarity.LEGENDARY:
			return Color.ORANGE
		_:
			return Color.WHITE

func _format_item_stats(item: ItemData) -> String:
	var lines := []

	if item.damage > 0:
		lines.append("Damage: %d" % item.damage)
	if item.defense > 0:
		lines.append("Defense: %d" % item.defense)

	for stat in item.stat_bonuses:
		var value = item.stat_bonuses[stat]
		if value > 0:
			lines.append("%s: +%d" % [stat.capitalize(), value])
		else:
			lines.append("%s: %d" % [stat.capitalize(), value])

	if item.value > 0:
		lines.append("Value: %d gold" % item.value)

	return "\n".join(lines)
