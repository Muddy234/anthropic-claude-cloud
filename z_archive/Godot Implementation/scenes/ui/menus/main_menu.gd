class_name MainMenu
extends Control

## Main menu with new game, continue, and options

@onready var new_game_button: Button = $CenterContainer/VBoxContainer/NewGameButton
@onready var continue_button: Button = $CenterContainer/VBoxContainer/ContinueButton
@onready var options_button: Button = $CenterContainer/VBoxContainer/OptionsButton
@onready var quit_button: Button = $CenterContainer/VBoxContainer/QuitButton

func _ready():
	new_game_button.pressed.connect(_on_new_game_pressed)
	continue_button.pressed.connect(_on_continue_pressed)
	options_button.pressed.connect(_on_options_pressed)
	quit_button.pressed.connect(_on_quit_pressed)

	# Check if save exists
	continue_button.disabled = not SaveManager.has_save(1)

	new_game_button.grab_focus()

func _on_new_game_pressed():
	GameManager.new_game()
	get_tree().change_scene_to_file("res://scenes/main/main.tscn")

func _on_continue_pressed():
	if SaveManager.load_game():
		get_tree().change_scene_to_file("res://scenes/main/main.tscn")
	else:
		# Failed to load, disable button
		continue_button.disabled = true

func _on_options_pressed():
	# TODO: Show options menu
	pass

func _on_quit_pressed():
	get_tree().quit()
