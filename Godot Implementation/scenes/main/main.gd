extends Node2D

## Main game scene - coordinates all game systems

@onready var camera: Camera2D = $Camera2D
@onready var dungeon: Node2D = $World/Dungeon
@onready var effects_layer: Node2D = $EffectsLayer
@onready var visual_effects: Node = $EffectsLayer/VisualEffects
@onready var hud: Control = $UILayer/HUD
@onready var pause_menu: Control = $UILayer/PauseMenu
@onready var game_over_screen: Control = $UILayer/GameOverScreen
@onready var skills_panel: Control = $UILayer/SkillsPanel

# Camera follow settings
const CAMERA_DEADZONE := Vector2(100, 75)
var camera_target: Node2D

func _ready():
	# Setup visual effects reference
	if visual_effects:
		visual_effects.camera = camera
		visual_effects.effects_container = effects_layer

	# Connect signals
	EventBus.player_moved.connect(_on_player_moved)
	EventBus.game_paused.connect(_on_game_paused)
	EventBus.game_resumed.connect(_on_game_resumed)
	EventBus.game_over.connect(_on_game_over)
	EventBus.floor_entered.connect(_on_floor_entered)

	# Start new game or load
	_initialize_game()

func _process(delta: float):
	_update_camera(delta)

func _unhandled_input(event: InputEvent):
	if event.is_action_pressed("pause"):
		_toggle_pause()

	if event.is_action_pressed("skills"):
		_toggle_skills_panel()

	# Debug keys
	if OS.is_debug_build():
		if event.is_action_pressed("ui_home"):
			_debug_reveal_map()

## Toggle skills panel
func _toggle_skills_panel():
	if not skills_panel:
		return

	if skills_panel.visible:
		if skills_panel.has_method("close"):
			skills_panel.close()
		else:
			skills_panel.hide()
	else:
		if skills_panel.has_method("open"):
			skills_panel.open()
		else:
			skills_panel.show()

## Initialize the game
func _initialize_game():
	# Check for save to load or start new game
	if GameManager.current_state == Constants.GameState.MAIN_MENU:
		GameManager.new_game()

## Update camera to follow player
func _update_camera(delta: float):
	if not GameManager.player:
		return

	var target_pos := GameManager.player.position

	# Deadzone camera following
	var diff := target_pos - camera.position
	var move := Vector2.ZERO

	if abs(diff.x) > CAMERA_DEADZONE.x:
		move.x = diff.x - sign(diff.x) * CAMERA_DEADZONE.x

	if abs(diff.y) > CAMERA_DEADZONE.y:
		move.y = diff.y - sign(diff.y) * CAMERA_DEADZONE.y

	camera.position += move * 5 * delta

## Toggle pause menu
func _toggle_pause():
	if GameManager.current_state == Constants.GameState.PLAYING:
		GameManager.change_state(Constants.GameState.PAUSED)
	elif GameManager.current_state == Constants.GameState.PAUSED:
		GameManager.change_state(Constants.GameState.PLAYING)

## Handle player movement - update visibility
func _on_player_moved(_from: Vector2i, to: Vector2i):
	if dungeon:
		dungeon.update_visibility(to, Constants.DEFAULT_VISION_RANGE)

## Handle game paused
func _on_game_paused():
	pause_menu.visible = true

## Handle game resumed
func _on_game_resumed():
	pause_menu.visible = false

## Handle game over
func _on_game_over():
	game_over_screen.visible = true

## Handle floor change
func _on_floor_entered(floor_num: int):
	# Update HUD floor display
	if hud and hud.has_method("update_floor"):
		hud.update_floor(floor_num)

	# Center camera on player
	if GameManager.player:
		camera.position = GameManager.player.position

## Debug: reveal entire map
func _debug_reveal_map():
	if dungeon and dungeon.has_method("_init_explored"):
		for x in Constants.MAP_WIDTH:
			for y in Constants.MAP_HEIGHT:
				dungeon.explored[x][y] = true
		dungeon.update_visibility(GameManager.player.grid_pos, 100)
