class_name GameOverScreen
extends Control

## Game over screen showing stats and options to retry or quit

@onready var stats_label: Label = $CenterContainer/VBoxContainer/StatsLabel
@onready var retry_button: Button = $CenterContainer/VBoxContainer/RetryButton
@onready var quit_button: Button = $CenterContainer/VBoxContainer/QuitButton

func _ready():
	retry_button.pressed.connect(_on_retry_pressed)
	quit_button.pressed.connect(_on_quit_pressed)

	visibility_changed.connect(_on_visibility_changed)

func _on_visibility_changed():
	if visible:
		_show_stats()
		retry_button.grab_focus()
		get_tree().paused = true

func _show_stats():
	if not stats_label:
		return

	var stats := GameManager.statistics
	var text := ""
	text += "Floor Reached: %d\n" % stats.get("floors_explored", 1)
	text += "Enemies Defeated: %d\n" % stats.get("enemies_killed", 0)
	text += "Gold Collected: %s\n" % Helpers.format_number(stats.get("gold_collected", 0))
	text += "Time Played: %s\n" % Helpers.format_time_long(stats.get("play_time", 0))

	if stats.has("cause_of_death"):
		text += "\nCause of Death: %s" % stats.cause_of_death

	stats_label.text = text

func _on_retry_pressed():
	get_tree().paused = false
	GameManager.new_game()
	hide()

func _on_quit_pressed():
	get_tree().paused = false
	GameManager.change_state(Constants.GameState.MAIN_MENU)
	get_tree().change_scene_to_file("res://scenes/ui/menus/main_menu.tscn")
