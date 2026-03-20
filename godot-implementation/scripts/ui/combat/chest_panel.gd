class_name ChestPanel
extends Control
## Loot chest UI panel.  Displays items found in a chest with individual
## take buttons and a Take All option.  Auto-closes when the chest is empty.

# --- Signals ---
signal loot_taken(item: Dictionary)
signal all_loot_taken(items: Array[Dictionary])
signal chest_closed

# --- Constants ---
const MAX_VISIBLE_ITEMS: int = 6

# --- Node references ---
var _overlay_bg: ColorRect
var _panel: PanelContainer
var _title_label: Label
var _item_scroll: ScrollContainer
var _item_list: VBoxContainer
var _take_all_btn: Button
var _close_btn: Button

# --- State ---
var _items: Array[Dictionary] = []


func _ready() -> void:
	visible = false
	mouse_filter = Control.MOUSE_FILTER_STOP
	_build_ui()


# ==========================================================================
#  UI Construction
# ==========================================================================

func _build_ui() -> void:
	_overlay_bg = ColorRect.new()
	_overlay_bg.color = Color(0, 0, 0, 0.5)
	_overlay_bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_overlay_bg)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	_panel = PanelContainer.new()
	_panel.custom_minimum_size = Vector2(400, 350)
	center.add_child(_panel)

	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 8)
	_panel.add_child(vbox)

	# Header
	var header := HBoxContainer.new()
	vbox.add_child(header)

	_title_label = Label.new()
	_title_label.text = "Chest Contents"
	_title_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["title"])
	_title_label.add_theme_color_override("font_color", UIConstantsDef.GOLD)
	_title_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(_title_label)

	_close_btn = Button.new()
	_close_btn.text = "X"
	_close_btn.custom_minimum_size = Vector2(32, 32)
	_close_btn.pressed.connect(close_chest)
	header.add_child(_close_btn)

	var sep := HSeparator.new()
	vbox.add_child(sep)

	# Scrollable item list
	_item_scroll = ScrollContainer.new()
	_item_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_item_scroll.custom_minimum_size = Vector2(0, 200)
	vbox.add_child(_item_scroll)

	_item_list = VBoxContainer.new()
	_item_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_item_list.add_theme_constant_override("separation", 4)
	_item_scroll.add_child(_item_list)

	# Bottom buttons
	var btn_bar := HBoxContainer.new()
	btn_bar.alignment = BoxContainer.ALIGNMENT_CENTER
	btn_bar.add_theme_constant_override("separation", 12)
	vbox.add_child(btn_bar)

	_take_all_btn = Button.new()
	_take_all_btn.text = "Take All"
	_take_all_btn.custom_minimum_size = Vector2(120, 36)
	_take_all_btn.pressed.connect(take_all)
	btn_bar.add_child(_take_all_btn)


# ==========================================================================
#  Open / Close
# ==========================================================================

## Open the chest panel with a list of item dictionaries.
## Each item: {id, name, rarity, type, icon?, stats?, ...}
func open_chest(items: Array[Dictionary]) -> void:
	_items = items.duplicate()
	visible = true
	_refresh_list()


func close_chest() -> void:
	visible = false
	_items.clear()
	chest_closed.emit()


# ==========================================================================
#  Refresh item list
# ==========================================================================

func _refresh_list() -> void:
	_clear_children(_item_list)

	if _items.is_empty():
		var empty_lbl := Label.new()
		empty_lbl.text = "Empty"
		empty_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		empty_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
		_item_list.add_child(empty_lbl)
		_take_all_btn.disabled = true
		return

	_take_all_btn.disabled = false

	for i in range(_items.size()):
		var item: Dictionary = _items[i]
		var row := _create_item_row(item, i)
		_item_list.add_child(row)


func _create_item_row(item: Dictionary, index: int) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)

	# Icon placeholder
	var icon := ColorRect.new()
	icon.custom_minimum_size = Vector2(28, 28)
	var rarity: String = item.get("rarity", "common")
	icon.color = UIConstantsDef.get_rarity_color(rarity) * Color(1, 1, 1, 0.4)
	row.add_child(icon)

	# Item name (colored by rarity)
	var name_lbl := Label.new()
	name_lbl.text = item.get("name", "Unknown Item")
	name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_lbl.add_theme_color_override("font_color", UIConstantsDef.get_rarity_color(rarity))
	row.add_child(name_lbl)

	# Item type
	var type_lbl := Label.new()
	type_lbl.text = item.get("type", "").capitalize()
	type_lbl.custom_minimum_size = Vector2(80, 0)
	type_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
	type_lbl.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["small"])
	row.add_child(type_lbl)

	# Take button
	var take_btn := Button.new()
	take_btn.text = "Take"
	take_btn.custom_minimum_size = Vector2(60, 28)
	take_btn.pressed.connect(take_item.bind(index))
	row.add_child(take_btn)

	return row


# ==========================================================================
#  Take actions
# ==========================================================================

func take_item(index: int) -> void:
	if index < 0 or index >= _items.size():
		return

	var item: Dictionary = _items[index]
	_items.remove_at(index)
	loot_taken.emit(item)
	_refresh_list()

	# Auto-close when empty
	if _items.is_empty():
		_auto_close_delay()


func take_all() -> void:
	if _items.is_empty():
		return

	var taken: Array[Dictionary] = _items.duplicate()
	_items.clear()
	all_loot_taken.emit(taken)

	for item in taken:
		loot_taken.emit(item)

	_refresh_list()
	_auto_close_delay()


func _auto_close_delay() -> void:
	var tween := create_tween()
	tween.tween_interval(0.4)
	tween.tween_callback(close_chest)


# ==========================================================================
#  Input
# ==========================================================================

func _unhandled_input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("ui_cancel"):
		close_chest()
		get_viewport().set_input_as_handled()


# ==========================================================================
#  Helpers
# ==========================================================================

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()
