class_name TabBarComponent
extends Control
## Reusable tab bar with horizontal row of tab buttons, active highlighting,
## and animated underline indicator.  Emits tab_changed on selection.

# --- Signals ---
signal tab_changed(index: int, tab_name: String)

# --- Constants ---
const TAB_HEIGHT: float = 36.0
const INDICATOR_HEIGHT: float = 3.0
const INDICATOR_ANIM_DURATION: float = 0.2

# --- Node references ---
var _hbox: HBoxContainer
var _indicator: ColorRect
var _buttons: Array[Button] = []

# --- State ---
var _tab_names: Array[String] = []
var _active_index: int = 0


func _ready() -> void:
	custom_minimum_size = Vector2(0, TAB_HEIGHT + INDICATOR_HEIGHT)
	clip_contents = true
	_build_ui()


# ==========================================================================
#  UI Construction
# ==========================================================================

func _build_ui() -> void:
	_hbox = HBoxContainer.new()
	_hbox.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_hbox.offset_bottom = -INDICATOR_HEIGHT
	_hbox.add_theme_constant_override("separation", 0)
	add_child(_hbox)

	# Underline indicator
	_indicator = ColorRect.new()
	_indicator.color = UIConstantsDef.GOLD
	_indicator.custom_minimum_size = Vector2(0, INDICATOR_HEIGHT)
	_indicator.anchor_top = 1.0
	_indicator.anchor_bottom = 1.0
	_indicator.offset_top = -INDICATOR_HEIGHT
	_indicator.offset_bottom = 0.0
	_indicator.offset_left = 0.0
	_indicator.offset_right = 0.0
	_indicator.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_indicator)


# ==========================================================================
#  Public API
# ==========================================================================

## Set the tab names.  Rebuilds all tab buttons.
func set_tabs(tab_names: Array[String]) -> void:
	_tab_names = tab_names
	_active_index = 0
	_rebuild_tabs()


## Set the active tab by index.
func set_active_tab(index: int) -> void:
	if index < 0 or index >= _buttons.size():
		return
	_active_index = index
	_update_tab_states()
	_animate_indicator()


## Get the currently active tab index.
func get_active_tab() -> int:
	return _active_index


## Get the currently active tab name.
func get_active_tab_name() -> String:
	if _active_index >= 0 and _active_index < _tab_names.size():
		return _tab_names[_active_index]
	return ""


## Get the number of tabs.
func get_tab_count() -> int:
	return _tab_names.size()


# ==========================================================================
#  Tab rebuilding
# ==========================================================================

func _rebuild_tabs() -> void:
	# Clear existing
	for btn in _buttons:
		btn.queue_free()
	_buttons.clear()

	for i in range(_tab_names.size()):
		var btn := Button.new()
		btn.text = _tab_names[i]
		btn.flat = true
		btn.custom_minimum_size = Vector2(0, TAB_HEIGHT)
		btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		btn.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["body"])
		btn.pressed.connect(_on_tab_pressed.bind(i))
		_hbox.add_child(btn)
		_buttons.append(btn)

	_update_tab_states()

	# Position indicator after layout settles
	await get_tree().process_frame
	_snap_indicator()


# ==========================================================================
#  Tab interaction
# ==========================================================================

func _on_tab_pressed(index: int) -> void:
	if index == _active_index:
		return
	_active_index = index
	_update_tab_states()
	_animate_indicator()
	tab_changed.emit(index, _tab_names[index])


func _update_tab_states() -> void:
	for i in range(_buttons.size()):
		var btn: Button = _buttons[i]
		if i == _active_index:
			btn.add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)
			btn.add_theme_color_override("font_hover_color", UIConstantsDef.TEXT_PRIMARY)
		else:
			btn.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
			btn.add_theme_color_override("font_hover_color", UIConstantsDef.TEXT_SECONDARY)


# ==========================================================================
#  Indicator animation
# ==========================================================================

func _animate_indicator() -> void:
	if _active_index < 0 or _active_index >= _buttons.size():
		return

	var btn: Button = _buttons[_active_index]
	var target_left: float = btn.position.x
	var target_right: float = btn.position.x + btn.size.x

	var tween := create_tween().set_parallel(true)
	tween.tween_property(_indicator, "offset_left", target_left, INDICATOR_ANIM_DURATION)\
		.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tween.tween_property(_indicator, "offset_right", target_right - size.x, INDICATOR_ANIM_DURATION)\
		.set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)


func _snap_indicator() -> void:
	if _active_index < 0 or _active_index >= _buttons.size():
		return

	var btn: Button = _buttons[_active_index]
	_indicator.offset_left = btn.position.x
	_indicator.offset_right = btn.position.x + btn.size.x - size.x


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		# Re-snap indicator on resize
		_snap_indicator()
