class_name GameOverScreen
extends Control
## Death screen displayed when the player dies.
## Shows "You Have Fallen" with stats summary and dramatic red vignette.

# --- Signals ---
signal try_again_requested
signal main_menu_requested

# --- Node references ---
var _vignette: ColorRect
var _title_label: Label
var _stats_container: VBoxContainer
var _try_again_btn: Button
var _main_menu_btn: Button
var _fade_overlay: ColorRect

# --- Stat labels ---
var _floor_label: Label
var _kills_label: Label
var _gold_label: Label
var _time_label: Label

# --- State ---
var _is_transitioning: bool = false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	mouse_filter = Control.MOUSE_FILTER_STOP
	_build_ui()


# ==========================================================================
#  UI Construction
# ==========================================================================

func _build_ui() -> void:
	# Dark background
	var bg := ColorRect.new()
	bg.color = Color(0.02, 0.01, 0.01, 0.92)
	bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	# Red vignette overlay (radial gradient effect via custom draw)
	_vignette = ColorRect.new()
	_vignette.color = Color(0.5, 0.0, 0.0, 0.0)
	_vignette.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_vignette.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_vignette)

	# Center content
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 20)
	center.add_child(vbox)

	# Title
	_title_label = Label.new()
	_title_label.text = "You Have Fallen"
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["display"])
	_title_label.add_theme_color_override("font_color", UIConstantsDef.DANGER)
	vbox.add_child(_title_label)

	# Divider
	var divider := Label.new()
	divider.text = "- - - - - - - - -"
	divider.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	divider.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
	vbox.add_child(divider)

	# Stats summary
	_stats_container = VBoxContainer.new()
	_stats_container.alignment = BoxContainer.ALIGNMENT_CENTER
	_stats_container.add_theme_constant_override("separation", 8)
	vbox.add_child(_stats_container)

	_floor_label = _add_stat_line("Floor Reached", "0")
	_kills_label = _add_stat_line("Enemies Slain", "0")
	_gold_label = _add_stat_line("Gold Collected", "0")
	_time_label = _add_stat_line("Time Survived", "0:00")

	# Spacer
	var spacer := Control.new()
	spacer.custom_minimum_size = Vector2(0, 24)
	vbox.add_child(spacer)

	# Buttons
	var btn_container := VBoxContainer.new()
	btn_container.alignment = BoxContainer.ALIGNMENT_CENTER
	btn_container.add_theme_constant_override("separation", 12)
	vbox.add_child(btn_container)

	_try_again_btn = Button.new()
	_try_again_btn.text = "Try Again"
	_try_again_btn.custom_minimum_size = Vector2(220, 46)
	_try_again_btn.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
	_try_again_btn.pressed.connect(_on_try_again_pressed)
	btn_container.add_child(_try_again_btn)

	_main_menu_btn = Button.new()
	_main_menu_btn.text = "Main Menu"
	_main_menu_btn.custom_minimum_size = Vector2(220, 46)
	_main_menu_btn.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
	_main_menu_btn.pressed.connect(_on_main_menu_pressed)
	btn_container.add_child(_main_menu_btn)

	# Fade overlay for transitions
	_fade_overlay = ColorRect.new()
	_fade_overlay.color = Color(0, 0, 0, 0)
	_fade_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_fade_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_fade_overlay)


func _add_stat_line(stat_name: String, default_value: String) -> Label:
	var hbox := HBoxContainer.new()
	hbox.alignment = BoxContainer.ALIGNMENT_CENTER
	hbox.add_theme_constant_override("separation", 24)
	_stats_container.add_child(hbox)

	var name_lbl := Label.new()
	name_lbl.text = stat_name
	name_lbl.custom_minimum_size = Vector2(180, 0)
	name_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	name_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
	hbox.add_child(name_lbl)

	var value_lbl := Label.new()
	value_lbl.text = default_value
	value_lbl.custom_minimum_size = Vector2(120, 0)
	value_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_LEFT
	value_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)
	hbox.add_child(value_lbl)

	return value_lbl


# ==========================================================================
#  Show / Hide
# ==========================================================================

func show_game_over(stats: Dictionary = {}) -> void:
	_is_transitioning = false
	visible = true
	get_tree().paused = true

	# Populate stats
	var floor_reached: int = stats.get("floor", 0)
	var enemies_killed: int = stats.get("kills", 0)
	var gold_collected: int = stats.get("gold", 0)
	var time_seconds: float = stats.get("time", 0.0)

	_floor_label.text = str(floor_reached)
	_kills_label.text = str(enemies_killed)
	_gold_label.text = str(gold_collected)
	_time_label.text = _format_time(time_seconds)

	_play_entrance_animation()


func _format_time(seconds: float) -> String:
	var mins: int = int(seconds) / 60
	var secs: int = int(seconds) % 60
	if mins >= 60:
		var hours: int = mins / 60
		mins = mins % 60
		return "%d:%02d:%02d" % [hours, mins, secs]
	return "%d:%02d" % [mins, secs]


# ==========================================================================
#  Entrance animation
# ==========================================================================

func _play_entrance_animation() -> void:
	# Title fade-in
	_title_label.modulate.a = 0.0
	_stats_container.modulate.a = 0.0
	_try_again_btn.modulate.a = 0.0
	_main_menu_btn.modulate.a = 0.0
	_vignette.color.a = 0.0

	var tween := create_tween()
	# Red vignette pulses in
	tween.tween_property(_vignette, "color:a", 0.35, 1.0).set_ease(Tween.EASE_OUT)
	# Title fades in
	tween.parallel().tween_property(_title_label, "modulate:a", 1.0, 1.2).set_ease(Tween.EASE_OUT)
	# Stats fade in after title
	tween.tween_property(_stats_container, "modulate:a", 1.0, 0.6).set_ease(Tween.EASE_OUT)
	# Buttons fade in last
	tween.tween_property(_try_again_btn, "modulate:a", 1.0, 0.4)
	tween.tween_property(_main_menu_btn, "modulate:a", 1.0, 0.4)
	tween.tween_callback(func() -> void:
		_try_again_btn.grab_focus()
	)


# ==========================================================================
#  Button callbacks
# ==========================================================================

func _on_try_again_pressed() -> void:
	if _is_transitioning:
		return
	_is_transitioning = true
	var tween := create_tween()
	tween.tween_property(_fade_overlay, "color:a", 1.0, 0.4)
	tween.tween_callback(func() -> void:
		get_tree().paused = false
		try_again_requested.emit()
	)


func _on_main_menu_pressed() -> void:
	if _is_transitioning:
		return
	_is_transitioning = true
	var tween := create_tween()
	tween.tween_property(_fade_overlay, "color:a", 1.0, 0.4)
	tween.tween_callback(func() -> void:
		get_tree().paused = false
		main_menu_requested.emit()
	)
