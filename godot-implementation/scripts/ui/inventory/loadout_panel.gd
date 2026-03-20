class_name LoadoutPanel
extends Control
## Loadout management screen: 3-column layout with bank items (left),
## equipment slots (center), and inventory (right).  Spell selection slots
## sit below equipment.  Supports drag-and-drop between columns and
## save/load loadout presets.

# --- Signals ---
signal run_started
signal loadout_saved(preset_name: String)
signal loadout_loaded(preset_name: String)
signal item_equipped(slot: StringName, item: Dictionary)
signal item_unequipped(slot: StringName)

# --- Constants ---
const EQUIPMENT_SLOTS: Array[StringName] = [
	&"HEAD", &"CHEST", &"LEGS", &"FEET", &"MAIN", &"OFF",
]
const EQUIPMENT_LABELS: Dictionary = {
	&"HEAD":  "Helmet",
	&"CHEST": "Armor",
	&"LEGS":  "Legs",
	&"FEET":  "Boots",
	&"MAIN":  "Weapon",
	&"OFF":   "Shield",
}
const SPELL_SLOTS: Array[String] = ["dash", "heal", "shield"]
const GRID_COLUMNS: int = 4
const SLOT_SIZE: Vector2 = Vector2(56, 56)

# --- Node references ---
var _overlay_bg: ColorRect
var _panel: PanelContainer
var _bank_scroll: ScrollContainer
var _bank_grid: GridContainer
var _equip_container: VBoxContainer
var _equip_slots: Dictionary = {}  # StringName -> PanelContainer
var _spell_buttons: Array[Button] = []
var _inv_scroll: ScrollContainer
var _inv_grid: GridContainer
var _ready_btn: Button
var _preset_container: HBoxContainer
var _preset_name_input: LineEdit
var _save_preset_btn: Button
var _load_preset_btn: Button
var _close_btn: Button

# --- State ---
var _bank_items: Array[Dictionary] = []
var _inventory_items: Array[Dictionary] = []
var _equipped_items: Dictionary = {}   # StringName -> Dictionary
var _selected_spell: String = "dash"
var _drag_source: String = ""
var _drag_index: int = -1


func _ready() -> void:
	visible = false
	mouse_filter = Control.MOUSE_FILTER_STOP
	_build_ui()


# ==========================================================================
#  UI Construction
# ==========================================================================

func _build_ui() -> void:
	_overlay_bg = ColorRect.new()
	_overlay_bg.color = Color(0, 0, 0, 0.6)
	_overlay_bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_overlay_bg)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	_panel = PanelContainer.new()
	_panel.custom_minimum_size = Vector2(1000, 600)
	center.add_child(_panel)

	var main_vbox := VBoxContainer.new()
	main_vbox.add_theme_constant_override("separation", 8)
	_panel.add_child(main_vbox)

	# Header
	var header := HBoxContainer.new()
	main_vbox.add_child(header)

	var title := Label.new()
	title.text = "Loadout"
	title.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["header"])
	title.add_theme_color_override("font_color", UIConstantsDef.FRAME_GOLD_BRIGHT)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)

	_close_btn = Button.new()
	_close_btn.text = "X"
	_close_btn.custom_minimum_size = Vector2(32, 32)
	_close_btn.pressed.connect(close_loadout)
	header.add_child(_close_btn)

	var sep := HSeparator.new()
	main_vbox.add_child(sep)

	# 3-column layout
	var columns := HBoxContainer.new()
	columns.add_theme_constant_override("separation", 16)
	columns.size_flags_vertical = Control.SIZE_EXPAND_FILL
	main_vbox.add_child(columns)

	# Left: Bank items
	var bank_vbox := VBoxContainer.new()
	bank_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	columns.add_child(bank_vbox)

	var bank_header := Label.new()
	bank_header.text = "Bank"
	bank_header.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
	bank_header.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
	bank_header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	bank_vbox.add_child(bank_header)

	_bank_scroll = ScrollContainer.new()
	_bank_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	bank_vbox.add_child(_bank_scroll)

	_bank_grid = GridContainer.new()
	_bank_grid.columns = GRID_COLUMNS
	_bank_grid.add_theme_constant_override("h_separation", 4)
	_bank_grid.add_theme_constant_override("v_separation", 4)
	_bank_scroll.add_child(_bank_grid)

	# Center: Equipment + Spells
	_equip_container = VBoxContainer.new()
	_equip_container.custom_minimum_size = Vector2(260, 0)
	_equip_container.alignment = BoxContainer.ALIGNMENT_CENTER
	_equip_container.add_theme_constant_override("separation", 8)
	columns.add_child(_equip_container)

	var equip_header := Label.new()
	equip_header.text = "Equipment"
	equip_header.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
	equip_header.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
	equip_header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_equip_container.add_child(equip_header)

	# Equipment slots in a 2x3 grid
	var equip_grid := GridContainer.new()
	equip_grid.columns = 2
	equip_grid.add_theme_constant_override("h_separation", 8)
	equip_grid.add_theme_constant_override("v_separation", 8)
	equip_grid.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_equip_container.add_child(equip_grid)

	for slot_name in EQUIPMENT_SLOTS:
		var slot_panel := _create_equip_slot(slot_name)
		equip_grid.add_child(slot_panel)
		_equip_slots[slot_name] = slot_panel

	# Spell selection
	var spell_sep := HSeparator.new()
	_equip_container.add_child(spell_sep)

	var spell_header := Label.new()
	spell_header.text = "Active Spell"
	spell_header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	spell_header.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
	_equip_container.add_child(spell_header)

	var spell_row := HBoxContainer.new()
	spell_row.alignment = BoxContainer.ALIGNMENT_CENTER
	spell_row.add_theme_constant_override("separation", 8)
	_equip_container.add_child(spell_row)

	for spell_name in SPELL_SLOTS:
		var spell_btn := Button.new()
		spell_btn.text = spell_name.capitalize()
		spell_btn.toggle_mode = true
		spell_btn.custom_minimum_size = Vector2(72, 36)
		spell_btn.button_pressed = (spell_name == _selected_spell)
		spell_btn.pressed.connect(_on_spell_selected.bind(spell_name))
		spell_row.add_child(spell_btn)
		_spell_buttons.append(spell_btn)

	# Right: Inventory
	var inv_vbox := VBoxContainer.new()
	inv_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	columns.add_child(inv_vbox)

	var inv_header := Label.new()
	inv_header.text = "Inventory"
	inv_header.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
	inv_header.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
	inv_header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	inv_vbox.add_child(inv_header)

	_inv_scroll = ScrollContainer.new()
	_inv_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	inv_vbox.add_child(_inv_scroll)

	_inv_grid = GridContainer.new()
	_inv_grid.columns = GRID_COLUMNS
	_inv_grid.add_theme_constant_override("h_separation", 4)
	_inv_grid.add_theme_constant_override("v_separation", 4)
	_inv_scroll.add_child(_inv_grid)

	# Bottom bar: presets + ready button
	var bottom_bar := HBoxContainer.new()
	bottom_bar.add_theme_constant_override("separation", 8)
	main_vbox.add_child(bottom_bar)

	_preset_container = HBoxContainer.new()
	_preset_container.add_theme_constant_override("separation", 4)
	_preset_container.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	bottom_bar.add_child(_preset_container)

	_preset_name_input = LineEdit.new()
	_preset_name_input.placeholder_text = "Preset name..."
	_preset_name_input.custom_minimum_size = Vector2(140, 0)
	_preset_container.add_child(_preset_name_input)

	_save_preset_btn = Button.new()
	_save_preset_btn.text = "Save"
	_save_preset_btn.pressed.connect(_on_save_preset)
	_preset_container.add_child(_save_preset_btn)

	_load_preset_btn = Button.new()
	_load_preset_btn.text = "Load"
	_load_preset_btn.pressed.connect(_on_load_preset)
	_preset_container.add_child(_load_preset_btn)

	_ready_btn = Button.new()
	_ready_btn.text = "ENTER THE CHASM"
	_ready_btn.custom_minimum_size = Vector2(200, 44)
	_ready_btn.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
	_ready_btn.pressed.connect(_on_ready_pressed)
	bottom_bar.add_child(_ready_btn)


func _create_equip_slot(slot_name: StringName) -> PanelContainer:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = SLOT_SIZE + Vector2(40, 20)

	var style := StyleBoxFlat.new()
	style.bg_color = UIConstantsDef.BG_MEDIUM
	style.border_color = UIConstantsDef.BORDER
	style.set_border_width_all(2)
	style.set_corner_radius_all(4)
	style.content_margin_left = 4.0
	style.content_margin_top = 4.0
	style.content_margin_right = 4.0
	style.content_margin_bottom = 4.0
	panel.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	panel.add_child(vbox)

	# Slot label
	var slot_label := Label.new()
	slot_label.text = EQUIPMENT_LABELS.get(slot_name, str(slot_name))
	slot_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	slot_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["tiny"])
	slot_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
	vbox.add_child(slot_label)

	# Item icon placeholder
	var icon := ColorRect.new()
	icon.custom_minimum_size = Vector2(40, 40)
	icon.color = UIConstantsDef.BG_DARKEST
	icon.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	icon.set_meta("icon_rect", true)
	vbox.add_child(icon)

	# Item name
	var item_label := Label.new()
	item_label.text = "Empty"
	item_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	item_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["tiny"])
	item_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_DISABLED)
	item_label.set_meta("item_label", true)
	vbox.add_child(item_label)

	return panel


# ==========================================================================
#  Item grid slot creation (shared for bank/inventory)
# ==========================================================================

func _create_item_slot(item: Dictionary, source: String, index: int) -> PanelContainer:
	var slot := PanelContainer.new()
	slot.custom_minimum_size = SLOT_SIZE

	var rarity: String = item.get("rarity", "common")
	var style := StyleBoxFlat.new()
	style.bg_color = UIConstantsDef.BG_MEDIUM
	style.border_color = UIConstantsDef.get_rarity_color(rarity) * Color(1, 1, 1, 0.5)
	style.set_border_width_all(1)
	style.set_corner_radius_all(3)
	slot.add_theme_stylebox_override("panel", style)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	slot.add_child(vbox)

	# Icon placeholder
	var icon := ColorRect.new()
	icon.custom_minimum_size = Vector2(32, 32)
	icon.color = UIConstantsDef.get_rarity_color(rarity) * Color(1, 1, 1, 0.3)
	icon.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	vbox.add_child(icon)

	# Short name
	var name_lbl := Label.new()
	var item_name: String = item.get("name", "?")
	name_lbl.text = item_name.substr(0, 8) if item_name.length() > 8 else item_name
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_lbl.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["tiny"])
	name_lbl.add_theme_color_override("font_color", UIConstantsDef.get_rarity_color(rarity))
	vbox.add_child(name_lbl)

	# Click handler: equip from inventory/bank or move between columns
	slot.gui_input.connect(func(event: InputEvent) -> void:
		if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			_on_slot_clicked(source, index, item)
	)

	return slot


# ==========================================================================
#  Open / Close
# ==========================================================================

func open_loadout(bank: Array[Dictionary], inventory: Array[Dictionary],
		equipped: Dictionary) -> void:
	_bank_items = bank.duplicate()
	_inventory_items = inventory.duplicate()
	_equipped_items = equipped.duplicate()
	visible = true
	_refresh_all()


func close_loadout() -> void:
	visible = false


func _refresh_all() -> void:
	_refresh_bank_grid()
	_refresh_inventory_grid()
	_refresh_equipment()


func _refresh_bank_grid() -> void:
	_clear_children(_bank_grid)
	for i in range(_bank_items.size()):
		var slot := _create_item_slot(_bank_items[i], "bank", i)
		_bank_grid.add_child(slot)


func _refresh_inventory_grid() -> void:
	_clear_children(_inv_grid)
	for i in range(_inventory_items.size()):
		var slot := _create_item_slot(_inventory_items[i], "inventory", i)
		_inv_grid.add_child(slot)


func _refresh_equipment() -> void:
	for slot_name: StringName in EQUIPMENT_SLOTS:
		var slot_panel: PanelContainer = _equip_slots[slot_name]
		var item: Dictionary = _equipped_items.get(slot_name, {})

		# Find the item label child
		var item_label: Label = _find_meta_child(slot_panel, "item_label")
		var icon_rect: ColorRect = _find_meta_child(slot_panel, "icon_rect")

		if item.is_empty():
			if item_label:
				item_label.text = "Empty"
				item_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_DISABLED)
			if icon_rect:
				icon_rect.color = UIConstantsDef.BG_DARKEST
		else:
			var rarity: String = item.get("rarity", "common")
			if item_label:
				item_label.text = item.get("name", "?")
				item_label.add_theme_color_override("font_color", UIConstantsDef.get_rarity_color(rarity))
			if icon_rect:
				icon_rect.color = UIConstantsDef.get_rarity_color(rarity) * Color(1, 1, 1, 0.4)

		# Update border color
		var style: StyleBoxFlat = slot_panel.get_theme_stylebox("panel") as StyleBoxFlat
		if style and not item.is_empty():
			var s := style.duplicate() as StyleBoxFlat
			s.border_color = UIConstantsDef.FRAME_GOLD_DARK
			slot_panel.add_theme_stylebox_override("panel", s)


# ==========================================================================
#  Slot interaction
# ==========================================================================

func _on_slot_clicked(source: String, index: int, item: Dictionary) -> void:
	var item_type: String = item.get("type", "")
	var target_slot: StringName = _type_to_equip_slot(item_type)

	if source == "inventory" and target_slot != &"":
		# Equip from inventory
		if index < _inventory_items.size():
			_inventory_items.remove_at(index)
		var old: Dictionary = _equipped_items.get(target_slot, {})
		_equipped_items[target_slot] = item
		if not old.is_empty():
			_inventory_items.append(old)
		item_equipped.emit(target_slot, item)
		_refresh_all()
	elif source == "bank":
		# Move bank item to inventory
		if index < _bank_items.size():
			_bank_items.remove_at(index)
		_inventory_items.append(item)
		_refresh_all()


func _type_to_equip_slot(item_type: String) -> StringName:
	match item_type.to_lower():
		"weapon", "sword", "axe", "mace", "dagger", "staff":
			return &"MAIN"
		"armor", "chest":
			return &"CHEST"
		"shield", "offhand":
			return &"OFF"
		"helmet", "head", "hat":
			return &"HEAD"
		"legs", "pants", "greaves":
			return &"LEGS"
		"boots", "feet":
			return &"FEET"
	return &""


# ==========================================================================
#  Spell selection
# ==========================================================================

func _on_spell_selected(spell_name: String) -> void:
	_selected_spell = spell_name
	for i in range(SPELL_SLOTS.size()):
		_spell_buttons[i].button_pressed = (SPELL_SLOTS[i] == spell_name)


func get_selected_spell() -> String:
	return _selected_spell


# ==========================================================================
#  Presets
# ==========================================================================

func _on_save_preset() -> void:
	var preset_name: String = _preset_name_input.text.strip_edges()
	if preset_name.is_empty():
		preset_name = "default"
	loadout_saved.emit(preset_name)


func _on_load_preset() -> void:
	var preset_name: String = _preset_name_input.text.strip_edges()
	if preset_name.is_empty():
		preset_name = "default"
	loadout_loaded.emit(preset_name)


# ==========================================================================
#  Ready button
# ==========================================================================

func _on_ready_pressed() -> void:
	run_started.emit()
	close_loadout()


# ==========================================================================
#  Input
# ==========================================================================

func _unhandled_input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("ui_cancel"):
		close_loadout()
		get_viewport().set_input_as_handled()


# ==========================================================================
#  Helpers
# ==========================================================================

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()


func _find_meta_child(root: Node, meta_key: String) -> Variant:
	for child in root.get_children():
		if child.has_meta(meta_key):
			return child
		var found: Variant = _find_meta_child(child, meta_key)
		if found != null:
			return found
	return null
