class_name PauseMenu
extends Control

## Pause menu with resume, options, and quit buttons

@onready var resume_button: Button = $CenterContainer/VBoxContainer/ResumeButton
@onready var options_button: Button = $CenterContainer/VBoxContainer/OptionsButton
@onready var save_button: Button = $CenterContainer/VBoxContainer/SaveButton
@onready var quit_button: Button = $CenterContainer/VBoxContainer/QuitButton

func _ready():
	resume_button.pressed.connect(_on_resume_pressed)
	options_button.pressed.connect(_on_options_pressed)
	save_button.pressed.connect(_on_save_pressed)
	quit_button.pressed.connect(_on_quit_pressed)

	# Pause when visible
	visibility_changed.connect(_on_visibility_changed)

func _on_visibility_changed():
	if visible:
		resume_button.grab_focus()
		get_tree().paused = true
	else:
		get_tree().paused = false

func _on_resume_pressed():
	GameManager.change_state(Constants.GameState.PLAYING)

func _on_options_pressed():
	# TODO: Show options menu
	pass

func _on_save_pressed():
	SaveManager.save_game()
	EventBus.message_logged.emit("Game saved!", Constants.COLORS.gold)

func _on_quit_pressed():
	# Return to main menu
	GameManager.change_state(Constants.GameState.MAIN_MENU)
	get_tree().change_scene_to_file("res://scenes/ui/menus/main_menu.tscn")

func _unhandled_input(event: InputEvent):
	if visible and event.is_action_pressed("pause"):
		_on_resume_pressed()
		get_viewport().set_input_as_handled()
