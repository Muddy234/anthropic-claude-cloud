class_name PauseMenu
extends Control
## In-game pause menu.  Pauses the scene tree, offers Resume / Settings /
## Save / Main Menu / Quit.  ESC toggles visibility.
## process_mode = PROCESS_MODE_ALWAYS so it works while the tree is paused.

# --- Signals ---
signal resumed
signal save_requested
signal settings_opened
signal main_menu_requested
signal quit_requested

# --- Node references ---
var _overlay: ColorRect
var _panel: PanelContainer
var _resume_btn: Button
var _settings_btn: Button
var _save_btn: Button
var _main_menu_btn: Button
var _quit_btn: Button
var _confirmation_dialog: Control
var _confirm_label: Label
var _confirm_yes: Button
var _confirm_no: Button

# --- State ---
var _pending_action: Callable


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	visible = false
	_build_ui()


# ==========================================================================
#  UI Construction
# ==========================================================================

func _build_ui() -> void:
	# Semi-transparent dark overlay
	_overlay = ColorRect.new()
	_overlay.color = Color(0, 0, 0, 0.65)
	_overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_overlay.mouse_filter = Control.MOUSE_FILTER_STOP
	add_child(_overlay)

	# Center panel
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	_panel = PanelContainer.new()
	_panel.custom_minimum_size = Vector2(320, 0)
	center.add_child(_panel)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 12)
	_panel.add_child(vbox)

	# Title
	var title := Label.new()
	title.text = "Paused"
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["header"])
	title.add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)
	vbox.add_child(title)

	var sep := HSeparator.new()
	vbox.add_child(sep)

	# Buttons
	_resume_btn = _add_button(vbox, "Resume")
	_resume_btn.pressed.connect(_on_resume_pressed)

	_settings_btn = _add_button(vbox, "Settings")
	_settings_btn.pressed.connect(_on_settings_pressed)

	_save_btn = _add_button(vbox, "Save Game")
	_save_btn.pressed.connect(_on_save_pressed)

	_main_menu_btn = _add_button(vbox, "Main Menu")
	_main_menu_btn.pressed.connect(_on_main_menu_pressed)

	_quit_btn = _add_button(vbox, "Quit Game")
	_quit_btn.pressed.connect(_on_quit_pressed)

	# -- Confirmation dialog (hidden by default) --
	_confirmation_dialog = Control.new()
	_confirmation_dialog.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_confirmation_dialog.visible = false
	add_child(_confirmation_dialog)

	var confirm_bg := ColorRect.new()
	confirm_bg.color = Color(0, 0, 0, 0.5)
	confirm_bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	confirm_bg.mouse_filter = Control.MOUSE_FILTER_STOP
	_confirmation_dialog.add_child(confirm_bg)

	var confirm_center := CenterContainer.new()
	confirm_center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_confirmation_dialog.add_child(confirm_center)

	var confirm_panel := PanelContainer.new()
	confirm_panel.custom_minimum_size = Vector2(300, 0)
	confirm_center.add_child(confirm_panel)

	var confirm_vbox := VBoxContainer.new()
	confirm_vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	confirm_vbox.add_theme_constant_override("separation", 12)
	confirm_panel.add_child(confirm_vbox)

	_confirm_label = Label.new()
	_confirm_label.text = "Are you sure?"
	_confirm_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_confirm_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
	confirm_vbox.add_child(_confirm_label)

	var btn_row := HBoxContainer.new()
	btn_row.alignment = BoxContainer.ALIGNMENT_CENTER
	btn_row.add_theme_constant_override("separation", 16)
	confirm_vbox.add_child(btn_row)

	_confirm_yes = Button.new()
	_confirm_yes.text = "Yes"
	_confirm_yes.custom_minimum_size = Vector2(100, 36)
	_confirm_yes.pressed.connect(_on_confirm_yes)
	btn_row.add_child(_confirm_yes)

	_confirm_no = Button.new()
	_confirm_no.text = "No"
	_confirm_no.custom_minimum_size = Vector2(100, 36)
	_confirm_no.pressed.connect(_on_confirm_no)
	btn_row.add_child(_confirm_no)


func _add_button(parent: VBoxContainer, label_text: String) -> Button:
	var btn := Button.new()
	btn.text = label_text
	btn.custom_minimum_size = Vector2(240, 42)
	parent.add_child(btn)
	return btn


# ==========================================================================
#  Open / Close
# ==========================================================================

func open_pause() -> void:
	if visible:
		return
	visible = true
	get_tree().paused = true
	_resume_btn.grab_focus()


func close_pause() -> void:
	if not visible:
		return
	_confirmation_dialog.visible = false
	visible = false
	get_tree().paused = false
	resumed.emit()


func toggle() -> void:
	if visible:
		close_pause()
	else:
		open_pause()


# ==========================================================================
#  Input
# ==========================================================================

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel"):
		if _confirmation_dialog.visible:
			_on_confirm_no()
		else:
			toggle()
		get_viewport().set_input_as_handled()


# ==========================================================================
#  Button callbacks
# ==========================================================================

func _on_resume_pressed() -> void:
	close_pause()


func _on_settings_pressed() -> void:
	settings_opened.emit()


func _on_save_pressed() -> void:
	save_requested.emit()


func _on_main_menu_pressed() -> void:
	_show_confirmation("Return to main menu?\nUnsaved progress will be lost.", func() -> void:
		close_pause()
		main_menu_requested.emit()
	)


func _on_quit_pressed() -> void:
	_show_confirmation("Quit the game?\nUnsaved progress will be lost.", func() -> void:
		quit_requested.emit()
		get_tree().quit()
	)


# ==========================================================================
#  Confirmation dialog
# ==========================================================================

func _show_confirmation(message: String, action: Callable) -> void:
	_confirm_label.text = message
	_pending_action = action
	_confirmation_dialog.visible = true
	_confirm_no.grab_focus()


func _on_confirm_yes() -> void:
	_confirmation_dialog.visible = false
	if _pending_action.is_valid():
		_pending_action.call()


func _on_confirm_no() -> void:
	_confirmation_dialog.visible = false
	_resume_btn.grab_focus()
