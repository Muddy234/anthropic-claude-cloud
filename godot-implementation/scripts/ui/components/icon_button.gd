class_name IconButtonComponent
extends Control
## Reusable icon button for sidebar / toolbar use.
## Displays a TextureButton with icon, optional label, hover highlight,
## press feedback, and active/inactive toggle state.  Shows keyboard
## shortcut text.

# --- Signals ---
signal button_pressed
signal button_toggled(active: bool)

# --- Constants ---
const DEFAULT_SIZE := Vector2(56, 56)
const HOVER_TINT := Color(1.2, 1.2, 1.2, 1.0)
const ACTIVE_TINT := Color(1.0, 0.85, 0.4, 1.0)  # Gold tint
const INACTIVE_TINT := Color(0.7, 0.7, 0.7, 1.0)
const PRESS_SCALE := Vector2(0.9, 0.9)

# --- Exports ---
@export var icon_texture: Texture2D:
	set(value):
		icon_texture = value
		if _icon_rect:
			_icon_rect.texture = value
@export var label_text: String = "":
	set(value):
		label_text = value
		if _label:
			_label.text = value
			_label.visible = not value.is_empty()
@export var shortcut_text: String = "":
	set(value):
		shortcut_text = value
		if _shortcut_label:
			_shortcut_label.text = value
			_shortcut_label.visible = not value.is_empty()
@export var toggle_mode: bool = false

# --- Node references ---
var _bg_panel: PanelContainer
var _icon_rect: TextureRect
var _label: Label
var _shortcut_label: Label
var _active_indicator: ColorRect

# --- State ---
var _is_active: bool = false
var _is_hovered: bool = false


func _ready() -> void:
	custom_minimum_size = DEFAULT_SIZE
	_build_ui()
	_update_visual_state()


# ==========================================================================
#  UI Construction
# ==========================================================================

func _build_ui() -> void:
	# Background panel
	_bg_panel = PanelContainer.new()
	_bg_panel.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_bg_panel)

	var bg_style := StyleBoxFlat.new()
	bg_style.bg_color = UIConstantsDef.BG_MEDIUM
	bg_style.border_color = UIConstantsDef.BORDER
	bg_style.set_border_width_all(1)
	bg_style.set_corner_radius_all(4)
	bg_style.content_margin_left = 4.0
	bg_style.content_margin_top = 4.0
	bg_style.content_margin_right = 4.0
	bg_style.content_margin_bottom = 4.0
	_bg_panel.add_theme_stylebox_override("panel", bg_style)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 2)
	_bg_panel.add_child(vbox)

	# Icon
	_icon_rect = TextureRect.new()
	_icon_rect.custom_minimum_size = Vector2(28, 28)
	_icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	_icon_rect.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	_icon_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	if icon_texture:
		_icon_rect.texture = icon_texture
	vbox.add_child(_icon_rect)

	# Label (below icon)
	_label = Label.new()
	_label.text = label_text
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["tiny"])
	_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
	_label.visible = not label_text.is_empty()
	vbox.add_child(_label)

	# Shortcut hint (top-right corner)
	_shortcut_label = Label.new()
	_shortcut_label.text = shortcut_text
	_shortcut_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["tiny"])
	_shortcut_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
	_shortcut_label.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT)
	_shortcut_label.offset_left = -20.0
	_shortcut_label.offset_top = 2.0
	_shortcut_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	_shortcut_label.visible = not shortcut_text.is_empty()
	_shortcut_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_shortcut_label)

	# Active indicator bar (bottom edge)
	_active_indicator = ColorRect.new()
	_active_indicator.color = UIConstantsDef.GOLD
	_active_indicator.custom_minimum_size = Vector2(0, 3)
	_active_indicator.anchor_top = 1.0
	_active_indicator.anchor_bottom = 1.0
	_active_indicator.anchor_left = 0.1
	_active_indicator.anchor_right = 0.9
	_active_indicator.offset_top = -3.0
	_active_indicator.offset_bottom = 0.0
	_active_indicator.visible = false
	_active_indicator.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_active_indicator)

	# Connect mouse events
	mouse_entered.connect(_on_mouse_entered)
	mouse_exited.connect(_on_mouse_exited)


# ==========================================================================
#  Public API
# ==========================================================================

func set_icon(texture: Texture2D) -> void:
	icon_texture = texture


func set_label(text: String) -> void:
	label_text = text


func set_shortcut(text: String) -> void:
	shortcut_text = text


func set_active(active: bool) -> void:
	_is_active = active
	_update_visual_state()
	if toggle_mode:
		button_toggled.emit(_is_active)


func is_active() -> bool:
	return _is_active


# ==========================================================================
#  Input handling
# ==========================================================================

func _gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
			_on_pressed()
			accept_event()


func _on_pressed() -> void:
	# Press scale feedback
	var tween := create_tween()
	tween.tween_property(self, "scale", PRESS_SCALE, 0.05)
	tween.tween_property(self, "scale", Vector2.ONE, 0.1)

	if toggle_mode:
		_is_active = not _is_active
		_update_visual_state()
		button_toggled.emit(_is_active)
	else:
		button_pressed.emit()


# ==========================================================================
#  Hover
# ==========================================================================

func _on_mouse_entered() -> void:
	_is_hovered = true
	_update_visual_state()


func _on_mouse_exited() -> void:
	_is_hovered = false
	_update_visual_state()


# ==========================================================================
#  Visual state
# ==========================================================================

func _update_visual_state() -> void:
	if not _bg_panel:
		return

	var style: StyleBoxFlat = _bg_panel.get_theme_stylebox("panel") as StyleBoxFlat
	if not style:
		return

	# Make a copy so we don't modify the shared resource
	style = style.duplicate() as StyleBoxFlat

	if _is_active:
		style.border_color = UIConstantsDef.GOLD
		style.bg_color = UIConstantsDef.BG_LIGHTEST
		_bg_panel.modulate = ACTIVE_TINT
	elif _is_hovered:
		style.border_color = UIConstantsDef.BORDER_BRIGHT
		style.bg_color = UIConstantsDef.BG_LIGHT
		_bg_panel.modulate = HOVER_TINT
	else:
		style.border_color = UIConstantsDef.BORDER
		style.bg_color = UIConstantsDef.BG_MEDIUM
		_bg_panel.modulate = INACTIVE_TINT

	_bg_panel.add_theme_stylebox_override("panel", style)

	if _active_indicator:
		_active_indicator.visible = _is_active
