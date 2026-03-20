class_name InventorySlot
extends PanelContainer
## Individual inventory slot displaying an item icon, stack count, and rarity border.
## Supports hover tooltips, click selection, and drag-and-drop between slots.

# ---------------------------------------------------------------------------
#  Signals
# ---------------------------------------------------------------------------
signal slot_clicked(index: int)
signal slot_drag_started(index: int)
signal slot_drop_received(from_index: int, to_index: int)

# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------
const SLOT_SIZE: Vector2 = Vector2(56, 56)
const HOVER_BORDER_WIDTH: int = 2
const NORMAL_BORDER_WIDTH: int = 1

# ---------------------------------------------------------------------------
#  Node references
# ---------------------------------------------------------------------------
@onready var icon: TextureRect = %Icon
@onready var count_label: Label = %CountLabel
@onready var rarity_border: Panel = %RarityBorder
@onready var highlight_rect: ColorRect = %HighlightRect

# ---------------------------------------------------------------------------
#  State
# ---------------------------------------------------------------------------
var item_data: Dictionary = {}
var slot_index: int = -1
var _is_hovered: bool = false
var _is_selected: bool = false
var _is_empty: bool = true
var _border_stylebox: StyleBoxFlat = null

# ---------------------------------------------------------------------------
#  Lifecycle
# ---------------------------------------------------------------------------
func _ready() -> void:
	custom_minimum_size = SLOT_SIZE

	mouse_entered.connect(_on_mouse_entered)
	mouse_exited.connect(_on_mouse_exited)

	# Create the rarity border stylebox
	_border_stylebox = StyleBoxFlat.new()
	_border_stylebox.bg_color = Color.TRANSPARENT
	_border_stylebox.set_border_width_all(NORMAL_BORDER_WIDTH)
	_border_stylebox.border_color = UIConstantsDef.BORDER
	_border_stylebox.set_corner_radius_all(3)
	if rarity_border:
		rarity_border.add_theme_stylebox_override("panel", _border_stylebox)

	highlight_rect.visible = false
	highlight_rect.color = Color(1.0, 1.0, 1.0, 0.08)

	_apply_empty_visual()


func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		var mb: InputEventMouseButton = event
		if mb.pressed and mb.button_index == MOUSE_BUTTON_LEFT:
			if not _is_empty:
				slot_clicked.emit(slot_index)
				_set_selected(true)

# ---------------------------------------------------------------------------
#  Public API
# ---------------------------------------------------------------------------
func set_item(data: Dictionary) -> void:
	item_data = data
	_is_empty = data.is_empty()

	if _is_empty:
		_apply_empty_visual()
		return

	# Icon texture
	var icon_path: String = data.get("icon", "")
	if not icon_path.is_empty() and ResourceLoader.exists(icon_path):
		icon.texture = load(icon_path)
		icon.visible = true
	else:
		# Placeholder: tint background by item type
		icon.texture = null
		icon.visible = false

	# Stack count
	var count: int = data.get("count", 1)
	if count > 1:
		count_label.text = str(count)
		count_label.visible = true
	else:
		count_label.visible = false

	# Rarity border color
	var rarity: String = data.get("rarity", "common")
	var rarity_color: Color = UIConstantsDef.get_rarity_color(rarity)
	_border_stylebox.border_color = rarity_color

	# Tooltip metadata
	tooltip_text = data.get("name", "Unknown Item")


func clear() -> void:
	item_data = {}
	_is_empty = true
	_is_selected = false
	_apply_empty_visual()


func set_selected(is_selected: bool) -> void:
	_set_selected(is_selected)

# ---------------------------------------------------------------------------
#  Drag-and-drop
# ---------------------------------------------------------------------------
func _get_drag_data(_at_position: Vector2) -> Variant:
	if _is_empty:
		return null

	slot_drag_started.emit(slot_index)

	# Build drag preview
	var preview := TextureRect.new()
	preview.texture = icon.texture
	preview.custom_minimum_size = SLOT_SIZE * 0.8
	preview.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	preview.modulate = Color(1.0, 1.0, 1.0, 0.7)
	set_drag_preview(preview)

	return {
		"type": "inventory_item",
		"item_data": item_data,
		"from_index": slot_index,
	}


func _can_drop_data(_at_position: Vector2, data: Variant) -> bool:
	if data is Dictionary and data.get("type") == "inventory_item":
		return true
	return false


func _drop_data(_at_position: Vector2, data: Variant) -> void:
	if data is Dictionary and data.get("type") == "inventory_item":
		var from_index: int = data.get("from_index", -1)
		slot_drop_received.emit(from_index, slot_index)

# ---------------------------------------------------------------------------
#  Hover
# ---------------------------------------------------------------------------
func _on_mouse_entered() -> void:
	_is_hovered = true
	highlight_rect.visible = true

	if not _is_empty:
		_border_stylebox.set_border_width_all(HOVER_BORDER_WIDTH)
		# Show tooltip via EventBus or tooltip manager
		_show_item_tooltip()


func _on_mouse_exited() -> void:
	_is_hovered = false
	highlight_rect.visible = false

	if not _is_selected:
		_border_stylebox.set_border_width_all(NORMAL_BORDER_WIDTH)

	_hide_item_tooltip()

# ---------------------------------------------------------------------------
#  Visual helpers
# ---------------------------------------------------------------------------
func _apply_empty_visual() -> void:
	if icon:
		icon.texture = null
		icon.visible = false
	if count_label:
		count_label.visible = false
	if _border_stylebox:
		_border_stylebox.border_color = UIConstantsDef.BORDER
		_border_stylebox.set_border_width_all(NORMAL_BORDER_WIDTH)
	if highlight_rect:
		highlight_rect.visible = false
	tooltip_text = ""


func _set_selected(selected: bool) -> void:
	_is_selected = selected
	if _is_selected:
		_border_stylebox.set_border_width_all(HOVER_BORDER_WIDTH)
		_border_stylebox.border_color = UIConstantsDef.BORDER_ACTIVE
	else:
		_border_stylebox.set_border_width_all(NORMAL_BORDER_WIDTH)
		var rarity: String = item_data.get("rarity", "common")
		_border_stylebox.border_color = UIConstantsDef.get_rarity_color(rarity)


func _show_item_tooltip() -> void:
	# Emit request to global tooltip manager (if available)
	var tooltip_mgr: Node = get_node_or_null("/root/TooltipManager")
	if tooltip_mgr and tooltip_mgr.has_method("show_item_tooltip"):
		tooltip_mgr.show_item_tooltip(item_data, get_global_mouse_position())


func _hide_item_tooltip() -> void:
	var tooltip_mgr: Node = get_node_or_null("/root/TooltipManager")
	if tooltip_mgr and tooltip_mgr.has_method("hide_tooltip"):
		tooltip_mgr.hide_tooltip()
