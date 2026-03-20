class_name BankPanel
extends PanelContainer
## Bank storage panel with dual-pane layout: bank items (left), player items (right).
## Supports deposit/withdraw, deposit all/withdraw all, search/filter, and drag transfer.

# ---------------------------------------------------------------------------
#  Signals
# ---------------------------------------------------------------------------
signal item_deposited(item: Dictionary)
signal item_withdrawn(item: Dictionary)

# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------
const MAX_BANK_CAPACITY: int = 60
const ITEMS_PER_PAGE: int = 12
const SLOT_SCENE: PackedScene = preload("res://scenes/ui/inventory/inventory_slot.tscn")

# ---------------------------------------------------------------------------
#  Node references
# ---------------------------------------------------------------------------
@onready var bank_list: VBoxContainer = %BankList
@onready var bank_scroll: ScrollContainer = %BankScroll
@onready var player_list: VBoxContainer = %PlayerList
@onready var player_scroll: ScrollContainer = %PlayerScroll
@onready var search_field: LineEdit = %SearchField
@onready var filter_option: OptionButton = %FilterOption
@onready var capacity_label: Label = %CapacityLabel
@onready var deposit_all_btn: Button = %DepositAllButton
@onready var withdraw_all_btn: Button = %WithdrawAllButton
@onready var close_button: Button = %CloseButton
@onready var message_label: Label = %MessageLabel

# ---------------------------------------------------------------------------
#  State
# ---------------------------------------------------------------------------
var bank_items: Array[Dictionary] = []
var _is_open: bool = false
var _search_text: String = ""
var _filter_type: String = ""  # empty = all

# ---------------------------------------------------------------------------
#  Lifecycle
# ---------------------------------------------------------------------------
func _ready() -> void:
	visible = false

	close_button.pressed.connect(close)
	deposit_all_btn.pressed.connect(deposit_all)
	withdraw_all_btn.pressed.connect(withdraw_all)
	search_field.text_changed.connect(_on_search_changed)

	# Filter options
	filter_option.clear()
	filter_option.add_item("All", 0)
	filter_option.add_item("Weapons", 1)
	filter_option.add_item("Armor", 2)
	filter_option.add_item("Consumables", 3)
	filter_option.add_item("Materials", 4)
	filter_option.item_selected.connect(_on_filter_changed)

	message_label.text = ""

	EventBus.game_state_changed.connect(_on_game_state_changed)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel") and _is_open:
		close()
		get_viewport().set_input_as_handled()

# ---------------------------------------------------------------------------
#  Open / Close
# ---------------------------------------------------------------------------
func open(saved_bank_items: Array = []) -> void:
	if _is_open:
		return
	_is_open = true

	bank_items.clear()
	for item: Dictionary in saved_bank_items:
		bank_items.append(item)

	_search_text = ""
	_filter_type = ""
	search_field.text = ""
	filter_option.selected = 0
	message_label.text = ""

	_refresh_both_panes()
	visible = true


func close() -> void:
	if not _is_open:
		return
	_is_open = false
	visible = false

# ---------------------------------------------------------------------------
#  Deposit / Withdraw single items
# ---------------------------------------------------------------------------
func deposit_item(item_id: String) -> void:
	if bank_items.size() >= MAX_BANK_CAPACITY:
		_show_message("Bank is full! (%d/%d)" % [bank_items.size(), MAX_BANK_CAPACITY], UIConstantsDef.DANGER)
		return

	var player: Node = _get_player()
	if not player:
		return

	var inventory: Array = player.get("inventory") if player.get("inventory") else []
	var item_index: int = _find_item_index(inventory, item_id)
	if item_index < 0:
		_show_message("Item not found in inventory!", UIConstantsDef.DANGER)
		return

	var item: Dictionary = inventory[item_index]
	inventory.remove_at(item_index)
	bank_items.append(item)

	_show_message("Deposited %s." % item.get("name", "item"), UIConstantsDef.SUCCESS)
	item_deposited.emit(item)
	_refresh_both_panes()


func withdraw_item(item_id: String) -> void:
	var player: Node = _get_player()
	if not player:
		return

	var inventory: Array = player.get("inventory") if player.get("inventory") else []
	var max_slots: int = ConstantsDef.INVENTORY_CONFIG.get("max_slots", 15)
	if inventory.size() >= max_slots:
		_show_message("Inventory is full!", UIConstantsDef.DANGER)
		return

	var item_index: int = _find_item_index(bank_items, item_id)
	if item_index < 0:
		_show_message("Item not found in bank!", UIConstantsDef.DANGER)
		return

	var item: Dictionary = bank_items[item_index]
	bank_items.remove_at(item_index)
	inventory.append(item)

	_show_message("Withdrew %s." % item.get("name", "item"), UIConstantsDef.SUCCESS)
	item_withdrawn.emit(item)
	_refresh_both_panes()

# ---------------------------------------------------------------------------
#  Deposit All / Withdraw All
# ---------------------------------------------------------------------------
func deposit_all() -> void:
	var player: Node = _get_player()
	if not player:
		return

	var inventory: Array = player.get("inventory") if player.get("inventory") else []
	var deposited_count: int = 0

	# Deposit from end to avoid index shifting
	var i: int = inventory.size() - 1
	while i >= 0:
		if bank_items.size() >= MAX_BANK_CAPACITY:
			break
		var item: Dictionary = inventory[i]
		# Skip equipped items
		if not item.get("equipped", false):
			inventory.remove_at(i)
			bank_items.append(item)
			deposited_count += 1
			item_deposited.emit(item)
		i -= 1

	if deposited_count > 0:
		_show_message("Deposited %d items." % deposited_count, UIConstantsDef.SUCCESS)
	else:
		_show_message("No items to deposit.", UIConstantsDef.TEXT_MUTED)
	_refresh_both_panes()


func withdraw_all() -> void:
	var player: Node = _get_player()
	if not player:
		return

	var inventory: Array = player.get("inventory") if player.get("inventory") else []
	var max_slots: int = ConstantsDef.INVENTORY_CONFIG.get("max_slots", 15)
	var withdrawn_count: int = 0

	while bank_items.size() > 0 and inventory.size() < max_slots:
		var item: Dictionary = bank_items.pop_back()
		inventory.append(item)
		withdrawn_count += 1
		item_withdrawn.emit(item)

	if withdrawn_count > 0:
		_show_message("Withdrew %d items." % withdrawn_count, UIConstantsDef.SUCCESS)
	else:
		_show_message("No items to withdraw or inventory full.", UIConstantsDef.TEXT_MUTED)
	_refresh_both_panes()

# ---------------------------------------------------------------------------
#  Search / Filter
# ---------------------------------------------------------------------------
func _on_search_changed(text: String) -> void:
	_search_text = text.to_lower()
	_refresh_both_panes()


func _on_filter_changed(index: int) -> void:
	match index:
		0: _filter_type = ""
		1: _filter_type = "weapon"
		2: _filter_type = "armor"
		3: _filter_type = "consumable"
		4: _filter_type = "material"
	_refresh_both_panes()

# ---------------------------------------------------------------------------
#  Refresh panes
# ---------------------------------------------------------------------------
func _refresh_both_panes() -> void:
	_refresh_bank_pane()
	_refresh_player_pane()
	_update_capacity_display()


func _refresh_bank_pane() -> void:
	for child in bank_list.get_children():
		child.queue_free()

	var filtered: Array[Dictionary] = _apply_filters(bank_items)
	for i in range(filtered.size()):
		var row: HBoxContainer = _create_item_row(filtered[i], true)
		bank_list.add_child(row)

	if filtered.is_empty():
		var empty_label := Label.new()
		empty_label.text = "No items in bank"
		empty_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
		bank_list.add_child(empty_label)


func _refresh_player_pane() -> void:
	for child in player_list.get_children():
		child.queue_free()

	var player: Node = _get_player()
	if not player:
		return

	var inventory: Array = player.get("inventory") if player.get("inventory") else []
	var typed_inv: Array[Dictionary] = []
	for item: Dictionary in inventory:
		typed_inv.append(item)

	var filtered: Array[Dictionary] = _apply_filters(typed_inv)
	for i in range(filtered.size()):
		var row: HBoxContainer = _create_item_row(filtered[i], false)
		player_list.add_child(row)

	if filtered.is_empty():
		var empty_label := Label.new()
		empty_label.text = "No items in inventory"
		empty_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
		player_list.add_child(empty_label)


func _apply_filters(items: Array[Dictionary]) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for item: Dictionary in items:
		# Type filter
		if not _filter_type.is_empty() and item.get("type", "") != _filter_type:
			continue
		# Search filter
		if not _search_text.is_empty():
			var item_name: String = item.get("name", "").to_lower()
			if not item_name.contains(_search_text):
				continue
		result.append(item)
	return result


func _create_item_row(item: Dictionary, is_bank_side: bool) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.custom_minimum_size.y = 32

	# Name
	var name_label := Label.new()
	name_label.text = item.get("name", "Unknown")
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var rarity: String = item.get("rarity", "common")
	name_label.add_theme_color_override("font_color", UIConstantsDef.get_rarity_color(rarity))
	row.add_child(name_label)

	# Type tag
	var type_label := Label.new()
	type_label.text = "[%s]" % item.get("type", "misc").capitalize()
	type_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
	row.add_child(type_label)

	# Transfer button
	var transfer_btn := Button.new()
	var item_id: String = item.get("id", "")
	if is_bank_side:
		transfer_btn.text = "Withdraw"
		transfer_btn.pressed.connect(withdraw_item.bind(item_id))
	else:
		transfer_btn.text = "Deposit"
		transfer_btn.pressed.connect(deposit_item.bind(item_id))
	row.add_child(transfer_btn)

	return row

# ---------------------------------------------------------------------------
#  Capacity display
# ---------------------------------------------------------------------------
func _update_capacity_display() -> void:
	var count: int = bank_items.size()
	capacity_label.text = "Bank: %d / %d" % [count, MAX_BANK_CAPACITY]
	if count >= MAX_BANK_CAPACITY:
		capacity_label.add_theme_color_override("font_color", UIConstantsDef.DANGER)
	elif count >= MAX_BANK_CAPACITY * 0.8:
		capacity_label.add_theme_color_override("font_color", UIConstantsDef.WARNING)
	else:
		capacity_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)

# ---------------------------------------------------------------------------
#  Utility
# ---------------------------------------------------------------------------
func _find_item_index(items: Array, item_id: String) -> int:
	for i in range(items.size()):
		if items[i].get("id", "") == item_id:
			return i
	return -1


func _show_message(text: String, color: Color) -> void:
	message_label.text = text
	message_label.add_theme_color_override("font_color", color)
	var tween := create_tween()
	tween.tween_interval(3.0)
	tween.tween_callback(func() -> void:
		if message_label.text == text:
			message_label.text = ""
	)


func _on_game_state_changed(_old_state: int, new_state: int) -> void:
	if new_state != ConstantsDef.GameState.SHOP and _is_open:
		close()


func _get_player() -> Node:
	var gm: Node = get_node_or_null("/root/GameManager")
	if gm:
		return gm.get("player")
	return null
