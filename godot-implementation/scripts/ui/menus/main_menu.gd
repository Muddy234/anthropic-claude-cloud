class_name MainMenu
extends Control
## Main menu screen for "The Shifting Chasm".
## Provides New Game, Continue, Settings, and Quit buttons with fade transitions.

# --- Signals ---
signal new_game_requested
signal continue_requested
signal settings_requested
signal quit_requested

# --- Node references (assigned in _ready via _build_ui) ---
var _title_label: Label
var _new_game_btn: Button
var _continue_btn: Button
var _settings_btn: Button
var _quit_btn: Button
var _background: ColorRect
var _button_container: VBoxContainer
var _fade_overlay: ColorRect

# --- State ---
var _has_save_data: bool = false
var _is_transitioning: bool = false


func _ready() -> void:
	_build_ui()
	_check_save_data()
	_play_entrance_animation()


# ==========================================================================
#  UI Construction
# ==========================================================================

func _build_ui() -> void:
	# Full-screen background
	_background = ColorRect.new()
	_background.color = UIConstantsDef.BG_DARKEST
	_background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_background)

	# Center container for content
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 16)
	center.add_child(vbox)

	# Title
	_title_label = Label.new()
	_title_label.text = "The Shifting Chasm"
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["display"])
	_title_label.add_theme_color_override("font_color", UIConstantsDef.FRAME_GOLD_BRIGHT)
	vbox.add_child(_title_label)

	# Subtitle / tagline
	var subtitle := Label.new()
	subtitle.text = "Descend. Survive. Ascend."
	subtitle.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	subtitle.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
	subtitle.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
	vbox.add_child(subtitle)

	# Spacer
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 40)
	vbox.add_child(spacer)

	# Button container
	_button_container = VBoxContainer.new()
	_button_container.alignment = BoxContainer.ALIGNMENT_CENTER
	_button_container.add_theme_constant_override("separation", 12)
	vbox.add_child(_button_container)

	_new_game_btn = _create_menu_button("New Game")
	_new_game_btn.pressed.connect(_on_new_game_pressed)
	_button_container.add_child(_new_game_btn)

	_continue_btn = _create_menu_button("Continue")
	_continue_btn.pressed.connect(_on_continue_pressed)
	_button_container.add_child(_continue_btn)

	_settings_btn = _create_menu_button("Settings")
	_settings_btn.pressed.connect(_on_settings_pressed)
	_button_container.add_child(_settings_btn)

	_quit_btn = _create_menu_button("Quit")
	_quit_btn.pressed.connect(_on_quit_pressed)
	_button_container.add_child(_quit_btn)

	# Fade overlay (for transitions)
	_fade_overlay = ColorRect.new()
	_fade_overlay.color = Color(0, 0, 0, 0)
	_fade_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_fade_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_fade_overlay)


func _create_menu_button(label_text: String) -> Button:
	var btn := Button.new()
	btn.text = label_text
	btn.custom_minimum_size = Vector2(260, 48)
	btn.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["title"])
	return btn


# ==========================================================================
#  Save data check
# ==========================================================================

func _check_save_data() -> void:
	# Check if a save file exists on disk
	_has_save_data = FileAccess.file_exists("user://savegame.dat")
	_continue_btn.disabled = not _has_save_data
	if not _has_save_data:
		_continue_btn.tooltip_text = "No save data found"


func set_save_available(available: bool) -> void:
	_has_save_data = available
	if _continue_btn:
		_continue_btn.disabled = not available


# ==========================================================================
#  Entrance animation
# ==========================================================================

func _play_entrance_animation() -> void:
	# Title fades in from above
	_title_label.modulate.a = 0.0
	_title_label.position.y -= 30.0
	var tween := create_tween()
	tween.tween_property(_title_label, "modulate:a", 1.0, 0.8).set_ease(Tween.EASE_OUT)
	tween.parallel().tween_property(_title_label, "position:y", _title_label.position.y + 30.0, 0.8).set_ease(Tween.EASE_OUT)

	# Buttons fade in with stagger
	for i in range(_button_container.get_child_count()):
		var btn: Button = _button_container.get_child(i)
		btn.modulate.a = 0.0
		tween.tween_property(btn, "modulate:a", 1.0, 0.3).set_delay(0.1)


# ==========================================================================
#  Fade transition helper
# ==========================================================================

func _fade_and_emit(callback: Callable) -> void:
	if _is_transitioning:
		return
	_is_transitioning = true
	_set_buttons_disabled(true)

	var tween := create_tween()
	tween.tween_property(_fade_overlay, "color:a", 1.0, 0.4).set_ease(Tween.EASE_IN)
	tween.tween_callback(callback)


func _set_buttons_disabled(disabled: bool) -> void:
	for btn: Button in [_new_game_btn, _continue_btn, _settings_btn, _quit_btn]:
		btn.disabled = disabled
	if not disabled:
		_continue_btn.disabled = not _has_save_data


# ==========================================================================
#  Button callbacks
# ==========================================================================

func _on_new_game_pressed() -> void:
	_fade_and_emit(func() -> void:
		new_game_requested.emit()
	)


func _on_continue_pressed() -> void:
	if not _has_save_data:
		return
	_fade_and_emit(func() -> void:
		continue_requested.emit()
	)


func _on_settings_pressed() -> void:
	settings_requested.emit()


func _on_quit_pressed() -> void:
	_fade_and_emit(func() -> void:
		quit_requested.emit()
		get_tree().quit()
	)
