extends Node2D

## Main game scene - coordinates all game systems

@onready var camera: Camera2D = $Camera2D
@onready var dungeon: Node2D = $World/Dungeon
@onready var effects_layer: Node2D = $EffectsLayer
@onready var visual_effects: Node = $EffectsLayer/VisualEffects
@onready var hud: Control = $UILayer/HUD
@onready var pause_menu: Control = $UILayer/PauseMenu
@onready var game_over_screen: Control = $UILayer/GameOverScreen
@onready var inventory_panel: Control = $UILayer/InventoryPanel
@onready var character_sheet: Control = $UILayer/CharacterSheet
@onready var combat_arena_overlay: Control = $UILayer/CombatArenaOverlay
@onready var combat_arena: Node = $CombatArena

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

	# Arena combat signals
	EventBus.arena_combat_triggered.connect(_on_arena_combat_triggered)
	EventBus.arena_combat_started.connect(_on_arena_combat_started)
	EventBus.arena_combat_started_multi.connect(_on_arena_combat_started_multi)
	EventBus.arena_combat_ended.connect(_on_arena_combat_ended)

	# Connect UI panel closed signals to restore game state
	if inventory_panel:
		inventory_panel.closed.connect(_on_inventory_closed)
	if character_sheet:
		character_sheet.closed.connect(_on_character_sheet_closed)

	# Start new game or load
	_initialize_game()

func _process(delta: float):
	_update_camera(delta)

func _unhandled_input(event: InputEvent):
	if event.is_action_pressed("pause"):
		_toggle_pause()

	# UI panel toggles (only when playing or in that panel's state)
	if event.is_action_pressed("inventory"):
		_toggle_inventory()

	if event.is_action_pressed("character"):
		_toggle_character_sheet()

	# Debug keys
	if OS.is_debug_build():
		if event.is_action_pressed("ui_home"):
			_debug_reveal_map()

## Initialize the game
func _initialize_game():
	# Ensure dungeon is registered with GameManager
	# (dungeon._ready sets GameManager.dungeon, but we need to make sure it's done)
	if dungeon and not GameManager.dungeon:
		GameManager.dungeon = dungeon

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

## Toggle inventory panel
func _toggle_inventory():
	# Only open from PLAYING state - closing is handled by the panel itself via closed signal
	if GameManager.current_state == Constants.GameState.PLAYING:
		GameManager.change_state(Constants.GameState.INVENTORY)
		if inventory_panel and inventory_panel.has_method("open"):
			inventory_panel.open()
		elif inventory_panel:
			inventory_panel.visible = true

## Toggle character sheet
func _toggle_character_sheet():
	# Only open from PLAYING state - closing is handled by the panel itself via closed signal
	if GameManager.current_state == Constants.GameState.PLAYING:
		GameManager.change_state(Constants.GameState.CHARACTER_SHEET)
		if character_sheet and character_sheet.has_method("open"):
			character_sheet.open()
		elif character_sheet:
			character_sheet.visible = true

## Handle inventory panel closed (by ESC, close button, or pressing I again)
func _on_inventory_closed():
	if GameManager.current_state == Constants.GameState.INVENTORY:
		GameManager.change_state(Constants.GameState.PLAYING)

## Handle character sheet closed
func _on_character_sheet_closed():
	if GameManager.current_state == Constants.GameState.CHARACTER_SHEET:
		GameManager.change_state(Constants.GameState.PLAYING)

## Handle arena combat triggered (player bumped into enemy)
## Gathers nearby enemies within ARENA_JOIN_RANGE to join the combat
func _on_arena_combat_triggered(player: Node, enemy: Node):
	print("DEBUG: _on_arena_combat_triggered called - player: ", player, " enemy: ", enemy)
	print("DEBUG: combat_arena reference: ", combat_arena)
	if combat_arena:
		# Gather nearby enemies that should join the combat
		var enemies_to_fight := _gather_nearby_enemies(player, enemy)
		print("DEBUG: Starting combat with %d enemies..." % enemies_to_fight.size())
		combat_arena.start_combat_multi(player, enemies_to_fight)
	else:
		print("DEBUG: ERROR - combat_arena is null!")

## Gather all enemies within join range of the player or triggering enemy
func _gather_nearby_enemies(player: Node, triggering_enemy: Node) -> Array:
	var enemies: Array = [triggering_enemy]
	var player_pos: Vector2i = player.grid_pos if "grid_pos" in player else Vector2i.ZERO
	var trigger_pos: Vector2i = triggering_enemy.grid_pos if "grid_pos" in triggering_enemy else Vector2i.ZERO

	# Check all enemies in the game
	for enemy in GameManager.enemies:
		if enemy == triggering_enemy:
			continue
		if not enemy or not is_instance_valid(enemy):
			continue

		var enemy_pos: Vector2i = enemy.grid_pos if "grid_pos" in enemy else Vector2i(-100, -100)

		# Calculate distance to player and triggering enemy
		var dist_to_player: int = abs(enemy_pos.x - player_pos.x) + abs(enemy_pos.y - player_pos.y)
		var dist_to_trigger: int = abs(enemy_pos.x - trigger_pos.x) + abs(enemy_pos.y - trigger_pos.y)

		# Join if within range of either player or triggering enemy
		if dist_to_player <= Constants.ARENA_JOIN_RANGE or dist_to_trigger <= Constants.ARENA_JOIN_RANGE:
			enemies.append(enemy)

		# Stop if we've hit the maximum
		if enemies.size() >= Constants.MAX_ARENA_ENEMIES:
			break

	return enemies

## Handle arena combat started (single enemy - backwards compatible)
func _on_arena_combat_started(player: Node, enemy: Node):
	_setup_combat_overlay()

## Handle arena combat started (multi-enemy)
func _on_arena_combat_started_multi(player: Node, enemies: Array):
	_setup_combat_overlay()

## Common setup for combat overlay
func _setup_combat_overlay():
	if combat_arena_overlay:
		combat_arena_overlay.setup(combat_arena)
		combat_arena_overlay.show_combat()

	# Hide HUD during combat
	if hud:
		hud.visible = false

## Handle arena combat ended
func _on_arena_combat_ended(victor: Node):
	if combat_arena_overlay:
		combat_arena_overlay.hide_combat()

	# Show HUD again
	if hud:
		hud.visible = true

## Debug: reveal entire map
func _debug_reveal_map():
	if dungeon and dungeon.has_method("_init_explored"):
		for x in Constants.MAP_WIDTH:
			for y in Constants.MAP_HEIGHT:
				dungeon.explored[x][y] = true
		dungeon.update_visibility(GameManager.player.grid_pos, 100)
