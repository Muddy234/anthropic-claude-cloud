class_name CombatArenaOverlay
extends Control

## UI overlay for arena combat - handles grid display, action buttons, and pip display

signal tile_clicked(position: Vector2i)
signal action_button_pressed(action_type: Constants.CombatActionType)
signal confirm_pressed()
signal undo_pressed()
signal clear_pressed()

# References - using unique names (%) for UI elements
@onready var background: ColorRect = $Background
@onready var arena_container: CenterContainer = $ArenaContainer
@onready var grid_container: GridContainer = $ArenaContainer/ArenaFrame/MarginContainer/VBoxContainer/GridContainer
@onready var entity_layer: Control = $ArenaContainer/ArenaFrame/MarginContainer/VBoxContainer/EntityLayer
@onready var effects_layer: Control = $ArenaContainer/ArenaFrame/MarginContainer/VBoxContainer/EffectsLayer

@onready var phase_label: Label = %PhaseLabel
@onready var player_hp_label: Label = %PlayerHPLabel
@onready var pip_container: HBoxContainer = %PipContainer
@onready var enemy_name_label: Label = %EnemyNameLabel
@onready var enemy_hp_label: Label = %EnemyHPLabel
@onready var enemy_pip_container: HBoxContainer = %EnemyPipContainer
@onready var action_buttons: HBoxContainer = %ActionButtons
@onready var queue_display: VBoxContainer = %QueueDisplay
@onready var confirm_button: Button = %ConfirmButton
@onready var undo_button: Button = %UndoButton
@onready var clear_button: Button = %ClearButton

# Combat reference
var combat_arena: CombatArena
var grid_tiles: Array = []  # 2D array of tile panels

# UI state
var highlighted_tiles: Array[Vector2i] = []
var _attack_arrows: Array[AttackArrow] = []  # Active attack arrows
var _tile_health_displays: Dictionary = {}  # Vector2i -> HealthSegmentDisplay
var _tile_damage_previews: Dictionary = {}  # Vector2i -> Label (damage preview)
var _active_telegraphs: Array[Dictionary] = []  # Stored telegraph data for damage preview
var _execution_order_panel: ExecutionOrderPanel  # Shows action execution order
var _current_resolution_index: int = -1  # Index of currently resolving action
var _tile_tooltip: TileTooltip  # Hover tooltip for tiles
var _hovered_tile: Vector2i = Vector2i(-1, -1)  # Currently hovered tile position
var _movement_path_labels: Array[Label] = []  # Labels showing move order numbers
var _ghost_player_tile: Vector2i = Vector2i(-1, -1)  # Position of ghost player indicator
var _enemy_movement_path_labels: Array[Label] = []  # Labels showing enemy move order numbers
var _ghost_enemy_tile: Vector2i = Vector2i(-1, -1)  # Position of ghost enemy indicator

# Tile size for grid display
const TILE_DISPLAY_SIZE := 96

# Tile colors
const COLOR_TILE_NORMAL := Color(0.2, 0.22, 0.28, 1.0)
const COLOR_TILE_BORDER := Color(0.35, 0.38, 0.45, 1.0)
const COLOR_HIGHLIGHT_MOVE := Color(0.2, 0.5, 0.3, 1.0)
const COLOR_HIGHLIGHT_ATTACK := Color(0.6, 0.25, 0.25, 1.0)
const COLOR_HIGHLIGHT_ITEM := Color(0.25, 0.35, 0.6, 1.0)
const COLOR_PLAYER := Color(0.2, 0.45, 0.7, 1.0)
const COLOR_ENEMY := Color(0.7, 0.2, 0.2, 1.0)
const COLOR_TELEGRAPH := Color(0.85, 0.5, 0.1, 1.0)
const COLOR_GHOST_PLAYER := Color(0.3, 0.55, 0.8, 0.5)  # Semi-transparent blue
const COLOR_MOVE_PATH := Color(0.3, 0.6, 0.4, 0.8)  # Green path
const COLOR_ATTACK_RANGE := Color(0.8, 0.3, 0.3, 0.4)  # Semi-transparent red
const COLOR_ENEMY_MOVE_PATH := Color(0.8, 0.4, 0.3, 0.8)  # Orange/red path for enemy
const COLOR_GHOST_ENEMY := Color(0.8, 0.35, 0.35, 0.5)  # Semi-transparent red

func _ready() -> void:
	# Connect signals
	if confirm_button:
		confirm_button.pressed.connect(_on_confirm_pressed)
	if undo_button:
		undo_button.pressed.connect(_on_undo_pressed)
	if clear_button:
		clear_button.pressed.connect(_on_clear_pressed)

	# Connect to EventBus
	EventBus.arena_phase_changed.connect(_on_phase_changed)
	EventBus.arena_pips_changed.connect(_on_pips_changed)
	EventBus.arena_action_queued.connect(_on_action_queued)
	EventBus.arena_action_dequeued.connect(_on_action_dequeued)
	EventBus.arena_actions_cleared.connect(_on_actions_cleared)
	EventBus.arena_telegraphs_shown.connect(_on_telegraphs_shown)  # Multi-enemy version
	EventBus.arena_combatant_attacked.connect(_on_combatant_attacked)
	EventBus.arena_combatant_healed.connect(_on_combatant_healed)
	EventBus.arena_action_resolving.connect(_on_action_resolving)

	# Setup action buttons
	_setup_action_buttons()

	# Create execution order panel (positioned to the right of arena)
	_create_execution_order_panel()

	# Create tile tooltip
	_create_tile_tooltip()

	# Hide by default
	hide()

## Handle keyboard input for movement during planning phase
func _unhandled_input(event: InputEvent) -> void:
	if not visible or not combat_arena or not combat_arena.is_planning():
		return

	# WASD / Arrow keys for movement
	if event.is_action_pressed("move_up") or event.is_action_pressed("ui_up"):
		_queue_move_in_direction(Vector2i(0, -1))
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("move_down") or event.is_action_pressed("ui_down"):
		_queue_move_in_direction(Vector2i(0, 1))
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("move_left") or event.is_action_pressed("ui_left"):
		_queue_move_in_direction(Vector2i(-1, 0))
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("move_right") or event.is_action_pressed("ui_right"):
		_queue_move_in_direction(Vector2i(1, 0))
		get_viewport().set_input_as_handled()

	# Space or Enter to confirm
	elif event.is_action_pressed("ui_accept"):
		_on_confirm_pressed()
		get_viewport().set_input_as_handled()

	# Backspace or Z to undo
	elif event is InputEventKey and event.pressed:
		if event.keycode == KEY_BACKSPACE or event.keycode == KEY_Z:
			_on_undo_pressed()
			get_viewport().set_input_as_handled()
		elif event.keycode == KEY_ESCAPE:
			_on_clear_pressed()
			get_viewport().set_input_as_handled()

## Queue a move action in the given direction from predicted position
func _queue_move_in_direction(direction: Vector2i) -> void:
	if not combat_arena or not combat_arena.is_planning():
		return

	var player := combat_arena.get_player_combatant()
	if not player:
		return

	var grid := combat_arena.get_grid()
	var predicted_pos := player.get_predicted_position(grid)
	var target_pos := predicted_pos + direction

	if grid.is_within_bounds(target_pos):
		var success := combat_arena.player_queue_move(target_pos)
		if success:
			_refresh_grid()
			_update_pip_display()
			_update_queue_display()

## Initialize with combat arena reference
func setup(arena: CombatArena) -> void:
	combat_arena = arena
	_create_grid_tiles()
	_update_hp_display()
	_update_pip_display()
	_update_enemy_pip_display()

## Show the overlay and start combat display
func show_combat() -> void:
	show()
	_refresh_grid()
	_update_hp_display()
	_update_pip_display()
	_update_enemy_pip_display()
	_update_queue_display()

## Hide the overlay
func hide_combat() -> void:
	hide()

## Create the grid tile panels with proper styling
func _create_grid_tiles() -> void:
	if not grid_container:
		push_error("CombatArenaOverlay: grid_container not found!")
		return

	# Clear existing
	for child in grid_container.get_children():
		child.queue_free()

	grid_tiles.clear()

	# Set grid columns
	grid_container.columns = Constants.ARENA_SIZE.x
	grid_container.add_theme_constant_override("h_separation", 4)
	grid_container.add_theme_constant_override("v_separation", 4)

	# Create tiles
	for y in range(Constants.ARENA_SIZE.y):
		var row: Array = []
		for x in range(Constants.ARENA_SIZE.x):
			var tile := _create_tile(Vector2i(x, y))
			grid_container.add_child(tile)
			row.append(tile)
		grid_tiles.append(row)

func _create_tile(pos: Vector2i) -> PanelContainer:
	var tile := PanelContainer.new()
	tile.custom_minimum_size = Vector2(TILE_DISPLAY_SIZE, TILE_DISPLAY_SIZE)

	# Store position in metadata
	tile.set_meta("grid_pos", pos)

	# Create stylebox for the tile
	var style := StyleBoxFlat.new()
	style.bg_color = COLOR_TILE_NORMAL
	style.border_width_left = 2
	style.border_width_top = 2
	style.border_width_right = 2
	style.border_width_bottom = 2
	style.border_color = COLOR_TILE_BORDER
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 4
	style.corner_radius_bottom_right = 4
	style.corner_radius_bottom_left = 4
	tile.add_theme_stylebox_override("panel", style)

	# Create a control overlay for click detection (supports left/right click)
	var click_area := Control.new()
	click_area.name = "ClickArea"
	click_area.custom_minimum_size = Vector2(TILE_DISPLAY_SIZE, TILE_DISPLAY_SIZE)
	click_area.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	click_area.mouse_filter = Control.MOUSE_FILTER_STOP
	click_area.gui_input.connect(_on_tile_gui_input.bind(pos))
	click_area.mouse_entered.connect(_on_tile_hover_enter.bind(pos))
	click_area.mouse_exited.connect(_on_tile_hover_exit.bind(pos))
	tile.add_child(click_area)

	# Create VBoxContainer for tile content layout
	var content := VBoxContainer.new()
	content.name = "Content"
	content.set_anchors_preset(Control.PRESET_FULL_RECT)
	content.mouse_filter = Control.MOUSE_FILTER_IGNORE
	click_area.add_child(content)

	# Top spacer
	var top_spacer := Control.new()
	top_spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	top_spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(top_spacer)

	# Create label for entity display (centered)
	var label := Label.new()
	label.name = "EntityLabel"
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 32)
	label.add_theme_color_override("font_color", Color.WHITE)
	label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(label)

	# Middle spacer
	var mid_spacer := Control.new()
	mid_spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	mid_spacer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(mid_spacer)

	# Create health segment display (bottom of tile)
	var health_display := HealthSegmentDisplay.new()
	health_display.name = "HealthDisplay"
	health_display.visible = false
	health_display.set_compact(true)
	health_display.alignment = BoxContainer.ALIGNMENT_CENTER
	health_display.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(health_display)
	_tile_health_displays[pos] = health_display

	# Create damage preview label (shows incoming damage)
	var damage_preview := Label.new()
	damage_preview.name = "DamagePreview"
	damage_preview.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	damage_preview.add_theme_font_size_override("font_size", 14)
	damage_preview.add_theme_color_override("font_color", Color("#FF5252"))
	damage_preview.add_theme_constant_override("outline_size", 2)
	damage_preview.add_theme_color_override("font_outline_color", Color.BLACK)
	damage_preview.visible = false
	damage_preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(damage_preview)
	_tile_damage_previews[pos] = damage_preview

	# Bottom padding
	var bottom_pad := Control.new()
	bottom_pad.custom_minimum_size = Vector2(0, 4)
	bottom_pad.mouse_filter = Control.MOUSE_FILTER_IGNORE
	content.add_child(bottom_pad)

	return tile

func _set_tile_style(tile: PanelContainer, style_name: String, entity_text: String = "") -> void:
	var style: StyleBoxFlat = tile.get_theme_stylebox("panel").duplicate()

	match style_name:
		"normal":
			style.bg_color = COLOR_TILE_NORMAL
			style.border_color = COLOR_TILE_BORDER
		"highlight_move":
			style.bg_color = COLOR_HIGHLIGHT_MOVE
			style.border_color = COLOR_HIGHLIGHT_MOVE.lightened(0.3)
		"highlight_attack":
			style.bg_color = COLOR_HIGHLIGHT_ATTACK
			style.border_color = COLOR_HIGHLIGHT_ATTACK.lightened(0.3)
		"highlight_item":
			style.bg_color = COLOR_HIGHLIGHT_ITEM
			style.border_color = COLOR_HIGHLIGHT_ITEM.lightened(0.3)
		"player":
			style.bg_color = COLOR_PLAYER
			style.border_color = COLOR_PLAYER.lightened(0.4)
		"enemy":
			style.bg_color = COLOR_ENEMY
			style.border_color = COLOR_ENEMY.lightened(0.3)
		"telegraph":
			style.bg_color = COLOR_TELEGRAPH
			style.border_color = COLOR_TELEGRAPH.lightened(0.3)
		"ghost_player":
			style.bg_color = COLOR_GHOST_PLAYER
			style.border_color = COLOR_GHOST_PLAYER.lightened(0.3)
		"move_path":
			style.bg_color = COLOR_MOVE_PATH
			style.border_color = COLOR_MOVE_PATH.lightened(0.3)
		"attack_range":
			style.bg_color = COLOR_ATTACK_RANGE
			style.border_color = COLOR_ATTACK_RANGE.lightened(0.3)
		"enemy_move_path":
			style.bg_color = COLOR_ENEMY_MOVE_PATH
			style.border_color = COLOR_ENEMY_MOVE_PATH.lightened(0.3)
		"ghost_enemy":
			style.bg_color = COLOR_GHOST_ENEMY
			style.border_color = COLOR_GHOST_ENEMY.lightened(0.3)

	tile.add_theme_stylebox_override("panel", style)

	# Update entity label - navigate through new structure
	var click_area := tile.get_node_or_null("ClickArea") as Control
	if click_area:
		var content := click_area.get_node_or_null("Content") as VBoxContainer
		if content:
			var label := content.get_node_or_null("EntityLabel") as Label
			if label:
				label.text = entity_text

## Setup action buttons - now shows controls help instead of action selection
func _setup_action_buttons() -> void:
	if not action_buttons:
		return

	# Clear existing
	for child in action_buttons.get_children():
		child.queue_free()

	# Create help labels for controls
	var controls_label := Label.new()
	controls_label.text = "WASD: Move (1-3 pips)  |  Left Click: Light Atk (1 pip)  |  Right Click: Heavy Atk (3 pips)"
	controls_label.add_theme_font_size_override("font_size", 14)
	controls_label.add_theme_color_override("font_color", Color(0.8, 0.8, 0.8))
	action_buttons.add_child(controls_label)

## Create the execution order panel
func _create_execution_order_panel() -> void:
	_execution_order_panel = ExecutionOrderPanel.new()
	_execution_order_panel.visible = false

	# Position to the right of the arena
	_execution_order_panel.set_anchors_preset(Control.PRESET_CENTER_RIGHT)
	_execution_order_panel.offset_left = -220
	_execution_order_panel.offset_right = -20
	_execution_order_panel.offset_top = -150
	_execution_order_panel.offset_bottom = 150

	add_child(_execution_order_panel)

## Update the execution order panel with current actions
func _update_execution_order_panel() -> void:
	if not _execution_order_panel or not combat_arena:
		return

	var player := combat_arena.get_player_combatant()
	var enemy := combat_arena.get_enemy_combatant()

	if not player or not enemy:
		return

	var player_actions := player.get_queued_actions()
	var enemy_actions := enemy.get_queued_actions()

	var player_name := "Player"
	var enemy_name := "Enemy"
	if enemy and is_instance_valid(enemy.entity):
		enemy_name = enemy.get_display_name()

	_execution_order_panel.update_actions(player_actions, enemy_actions, player_name, enemy_name)

## Create the tile tooltip
func _create_tile_tooltip() -> void:
	_tile_tooltip = TileTooltip.new()
	add_child(_tile_tooltip)

## Handle tile hover enter
func _on_tile_hover_enter(pos: Vector2i) -> void:
	_hovered_tile = pos
	_update_tooltip_for_tile(pos)

## Handle tile hover exit
func _on_tile_hover_exit(pos: Vector2i) -> void:
	if _hovered_tile == pos:
		_hovered_tile = Vector2i(-1, -1)
		if _tile_tooltip:
			_tile_tooltip.cancel_show()

## Update tooltip content for a specific tile
func _update_tooltip_for_tile(pos: Vector2i) -> void:
	if not _tile_tooltip or not combat_arena:
		return

	var grid := combat_arena.get_grid()
	var player := combat_arena.get_player_combatant()

	if not grid or not player:
		return

	# Get screen position for tooltip
	var screen_pos := get_viewport().get_mouse_position()

	# Get player position
	var player_pos := grid.get_combatant_position(player.entity) if player and is_instance_valid(player.entity) else Vector2i(-1, -1)

	if pos == player_pos:
		# Player tile
		var hp := player.get_hp()
		var max_hp := player.get_max_hp()
		var queued := player.get_queued_actions().size()
		var incoming := _calculate_incoming_damage_to_player()
		_tile_tooltip.show_player_tile(screen_pos, hp, max_hp, queued, incoming)
		return

	# Check if this tile has any enemy
	var enemy_combatants := combat_arena.get_enemy_combatants()
	for enemy in enemy_combatants:
		if not enemy or not enemy.is_alive or not is_instance_valid(enemy.entity):
			continue

		var enemy_pos := grid.get_combatant_position(enemy.entity)
		if pos == enemy_pos:
			# Found the enemy at this position
			var enemy_name := enemy.get_display_name()
			var hp := enemy.get_hp()
			var max_hp := enemy.get_max_hp()

			# Get enemy intent from their queued actions
			var intent_action := ""
			var intent_target := ""
			var intent_damage := 0

			var queued_actions := enemy.get_queued_actions()
			for action in queued_actions:
				if action.action_type == Constants.CombatActionType.LIGHT_ATTACK:
					intent_action = "Light Attack"
					intent_damage = _calculate_telegraph_damage(enemy, action.action_type)
					if action.target_position == player_pos:
						intent_target = "Player"
					break
				elif action.action_type == Constants.CombatActionType.HEAVY_ATTACK:
					if action is PatternAttackAction:
						intent_action = action.get_display_name()
					else:
						intent_action = "Heavy Attack"
					intent_damage = _calculate_telegraph_damage(enemy, action.action_type)
					if action.target_position == player_pos:
						intent_target = "Player"
					# For pattern attacks, check if player is in affected tiles
					if action is PatternAttackAction:
						var pattern_action := action as PatternAttackAction
						if player_pos in pattern_action.affected_tiles:
							intent_target = "Player"
					break

			_tile_tooltip.show_enemy_tile(screen_pos, enemy_name, hp, max_hp, intent_action, intent_target, intent_damage)
			return

	# Empty tile - check if player can move here
	var predicted_pos := player.get_predicted_position(grid)
	var can_move := false

	# Check if this tile is adjacent to predicted position
	for dir in Constants.CARDINAL_DIRECTIONS:
		if predicted_pos + dir == pos and grid.is_tile_empty(pos):
			can_move = true
			break

	_tile_tooltip.show_empty_tile(screen_pos, can_move)

## Calculate total incoming damage to player from telegraphs
func _calculate_incoming_damage_to_player() -> int:
	var total := 0
	var player := combat_arena.get_player_combatant() if combat_arena else null
	var grid := combat_arena.get_grid() if combat_arena else null

	if not player or not grid or not is_instance_valid(player.entity):
		return 0

	var player_pos := grid.get_combatant_position(player.entity)

	for telegraph in _active_telegraphs:
		var target_pos: Vector2i = telegraph.get("target_position", Vector2i(-1, -1))
		# Only count damage that actually targets the player's tile
		if target_pos == player_pos:
			total += telegraph.get("damage", 0)
	return total

## Update movement path visualization showing queued moves (simplified - only ghost at final position)
func _update_movement_path() -> void:
	# Clear existing path labels
	_clear_movement_path()

	if not combat_arena or not combat_arena.is_planning():
		return

	var player := combat_arena.get_player_combatant()
	var grid := combat_arena.get_grid()

	if not player or not grid:
		return

	# Get all queued move actions
	var move_positions: Array[Vector2i] = []

	for action in player.get_queued_actions():
		if action.action_type == Constants.CombatActionType.MOVE:
			move_positions.append(action.target_position)

	if move_positions.is_empty():
		_ghost_player_tile = Vector2i(-1, -1)
		return

	# Only show ghost "P" at final position (no intermediate path visualization)
	var final_pos := move_positions[move_positions.size() - 1]
	_ghost_player_tile = final_pos
	if final_pos.y < grid_tiles.size() and final_pos.x < grid_tiles[final_pos.y].size():
		var tile: PanelContainer = grid_tiles[final_pos.y][final_pos.x]
		_set_tile_style(tile, "ghost_player", "P")

## Clear movement path visualization
func _clear_movement_path() -> void:
	for label in _movement_path_labels:
		if is_instance_valid(label):
			label.queue_free()
	_movement_path_labels.clear()
	_ghost_player_tile = Vector2i(-1, -1)

## Show enemy movement path during telegraph phase
func _show_enemy_movement_path(enemy: ArenaCombatant, grid: ArenaGrid) -> void:
	if not enemy or not grid:
		return

	# Get all queued move actions from enemy
	var move_positions: Array[Vector2i] = []
	var current_pos := grid.get_combatant_position(enemy.entity)

	for action in enemy.get_queued_actions():
		if action.action_type == Constants.CombatActionType.MOVE:
			move_positions.append(action.target_position)

	if move_positions.is_empty():
		_ghost_enemy_tile = Vector2i(-1, -1)
		return

	# Show path with simple red highlight - all tiles same color, no labels
	for i in range(move_positions.size()):
		var pos := move_positions[i]
		if pos.y < grid_tiles.size() and pos.x < grid_tiles[pos.y].size():
			var tile: PanelContainer = grid_tiles[pos.y][pos.x]

			# Style all movement tiles the same color
			_set_tile_style(tile, "enemy_move_path", "")

			# Track final position for reference
			if i == move_positions.size() - 1:
				_ghost_enemy_tile = pos

## Clear enemy movement path visualization
func _clear_enemy_movement_path() -> void:
	for label in _enemy_movement_path_labels:
		if is_instance_valid(label):
			label.queue_free()
	_enemy_movement_path_labels.clear()
	_ghost_enemy_tile = Vector2i(-1, -1)

## Update enemy movement path display (called during refresh)
## Re-applies the enemy movement path during telegraph and planning phases
## Now supports multiple enemies
func _update_enemy_movement_path_display() -> void:
	if not combat_arena:
		return

	# Only show during telegraph and planning phases
	var current_phase := combat_arena.get_current_phase()
	if current_phase != Constants.CombatPhase.TELEGRAPH and current_phase != Constants.CombatPhase.PLANNING:
		return

	var grid := combat_arena.get_grid()

	# Clear existing paths first
	_clear_enemy_movement_path()

	# Show movement paths for all living enemies
	var enemy_combatants := combat_arena.get_enemy_combatants()
	for enemy in enemy_combatants:
		if not enemy or not enemy.is_alive or not is_instance_valid(enemy.entity):
			continue

		# Check if enemy has any queued moves
		var enemy_current_pos := grid.get_combatant_position(enemy.entity)
		var enemy_predicted_pos := enemy.get_predicted_position(grid)

		# Only show path if enemy is moving
		if enemy_current_pos != Vector2i(-1, -1) and enemy_predicted_pos != enemy_current_pos:
			_show_enemy_movement_path(enemy, grid)

## Refresh grid display
func _refresh_grid() -> void:
	if not combat_arena:
		return
	if grid_tiles.is_empty():
		return

	var grid := combat_arena.get_grid()
	var player := combat_arena.get_player_combatant()

	# Reset all tiles and hide health displays
	for y in range(Constants.ARENA_SIZE.y):
		for x in range(Constants.ARENA_SIZE.x):
			var tile: PanelContainer = grid_tiles[y][x]
			_set_tile_style(tile, "normal", "")
			_hide_tile_health(Vector2i(x, y))
			_hide_tile_damage_preview(Vector2i(x, y))

	# Re-apply telegraph styles from stored telegraphs (before showing entities)
	for telegraph in _active_telegraphs:
		var tile_pos: Vector2i = telegraph.get("target_position", Vector2i(-1, -1))
		if tile_pos != Vector2i(-1, -1) and \
		   tile_pos.x >= 0 and tile_pos.x < Constants.ARENA_SIZE.x and \
		   tile_pos.y >= 0 and tile_pos.y < Constants.ARENA_SIZE.y:
			var tile: PanelContainer = grid_tiles[tile_pos.y][tile_pos.x]
			_set_tile_style(tile, "telegraph", "!")

	# Show player with health segments
	if player and is_instance_valid(player.entity):
		var player_pos := grid.get_combatant_position(player.entity)
		if player_pos != Vector2i(-1, -1) and player_pos.x >= 0 and player_pos.y >= 0:
			if player_pos.y < grid_tiles.size() and player_pos.x < grid_tiles[player_pos.y].size():
				var tile: PanelContainer = grid_tiles[player_pos.y][player_pos.x]
				_set_tile_style(tile, "player", "P")
				_show_tile_health(player_pos, player.get_hp(), player.get_max_hp(), true)

	# Show all enemies with health segments
	var enemy_combatants := combat_arena.get_enemy_combatants()
	var enemy_index := 0
	for enemy in enemy_combatants:
		if not enemy or not enemy.is_alive or not is_instance_valid(enemy.entity):
			enemy_index += 1
			continue

		var enemy_pos := grid.get_combatant_position(enemy.entity)
		if enemy_pos != Vector2i(-1, -1) and enemy_pos.x >= 0 and enemy_pos.y >= 0:
			if enemy_pos.y < grid_tiles.size() and enemy_pos.x < grid_tiles[enemy_pos.y].size():
				var tile: PanelContainer = grid_tiles[enemy_pos.y][enemy_pos.x]
				# Use letters E, F, G, H for multiple enemies
				var enemy_label := String.chr(ord("E") + enemy_index)
				_set_tile_style(tile, "enemy", enemy_label)
				_show_tile_health(enemy_pos, enemy.get_hp(), enemy.get_max_hp(), false)
		enemy_index += 1

	# Show damage previews from telegraphed attacks
	_update_damage_previews()

	# Show enemy movement path during telegraph and planning phases
	_update_enemy_movement_path_display()

	# Show movement path and ghost player during planning
	_update_movement_path()

	# Highlight valid targets for selected action
	_highlight_valid_targets()

## Show health segment display on a tile
func _show_tile_health(pos: Vector2i, current_hp: int, max_hp: int, is_player: bool) -> void:
	if pos not in _tile_health_displays:
		return
	var health_display: HealthSegmentDisplay = _tile_health_displays[pos]
	health_display.setup(current_hp, max_hp, is_player)
	health_display.visible = true

## Hide health segment display on a tile
func _hide_tile_health(pos: Vector2i) -> void:
	if pos not in _tile_health_displays:
		return
	var health_display: HealthSegmentDisplay = _tile_health_displays[pos]
	health_display.visible = false

## Show damage preview on a tile
func _show_tile_damage_preview(pos: Vector2i, damage: int, is_kill: bool = false) -> void:
	if pos not in _tile_damage_previews:
		return
	var preview: Label = _tile_damage_previews[pos]
	if is_kill:
		preview.text = "KILL"
		preview.add_theme_color_override("font_color", Color("#FFD740"))  # Yellow
	else:
		preview.text = "-%d" % damage
		preview.add_theme_color_override("font_color", Color("#FF5252"))  # Red
	preview.visible = true

## Hide damage preview on a tile
func _hide_tile_damage_preview(pos: Vector2i) -> void:
	if pos not in _tile_damage_previews:
		return
	var preview: Label = _tile_damage_previews[pos]
	preview.visible = false

## Update damage previews based on telegraphed attacks
func _update_damage_previews() -> void:
	if not combat_arena:
		return

	var player := combat_arena.get_player_combatant()
	if not player or not is_instance_valid(player.entity):
		return

	var grid := combat_arena.get_grid()
	var player_pos := grid.get_combatant_position(player.entity) if grid else Vector2i(-1, -1)

	# Aggregate damage per tile from all telegraphs
	var tile_damage: Dictionary = {}  # Vector2i -> int (total damage)

	for telegraph in _active_telegraphs:
		var target_pos: Vector2i = telegraph.get("target_position", Vector2i(-1, -1))
		var damage: int = telegraph.get("damage", 0)

		if target_pos != Vector2i(-1, -1) and damage > 0:
			if target_pos in tile_damage:
				tile_damage[target_pos] += damage
			else:
				tile_damage[target_pos] = damage

	# Show aggregated damage on each tile
	for target_pos in tile_damage:
		var total_damage: int = tile_damage[target_pos]
		var is_kill := false
		if target_pos == player_pos:
			is_kill = total_damage >= player.get_hp()
		_show_tile_damage_preview(target_pos, total_damage, is_kill)

## Track valid targets for input handling (no visual highlighting)
func _highlight_valid_targets() -> void:
	if not combat_arena or not combat_arena.is_planning():
		return

	var grid := combat_arena.get_grid()
	var player := combat_arena.get_player_combatant()

	if not player or not is_instance_valid(player.entity):
		return

	highlighted_tiles.clear()

	var predicted_pos := player.get_predicted_position(grid)

	# Track valid move targets (no visual highlight - just for input handling)
	for dir in Constants.CARDINAL_DIRECTIONS:
		var target: Vector2i = predicted_pos + dir
		if grid.is_within_bounds(target) and grid.is_tile_empty(target):
			highlighted_tiles.append(target)

	# Track attackable tiles (no visual highlight - just for input handling)
	var weapon_range := player.get_weapon_range()
	for tile_pos in grid.get_tiles_in_range(predicted_pos, weapon_range):
		if tile_pos not in highlighted_tiles:
			highlighted_tiles.append(tile_pos)

## Update HP displays for both player and enemy
func _update_hp_display() -> void:
	if not combat_arena:
		return

	var player := combat_arena.get_player_combatant()
	var enemy := combat_arena.get_enemy_combatant()

	if player and is_instance_valid(player.entity) and player_hp_label:
		var hp := player.get_hp()
		var max_hp := player.get_max_hp()
		player_hp_label.text = "Player HP: %d/%d" % [hp, max_hp]

	if enemy and is_instance_valid(enemy.entity):
		if enemy_name_label:
			enemy_name_label.text = enemy.get_display_name()
		if enemy_hp_label:
			var hp := enemy.get_hp()
			var max_hp := enemy.get_max_hp()
			enemy_hp_label.text = "HP: %d/%d" % [hp, max_hp]

## Update stamina display for player (battery-style resource)
func _update_pip_display() -> void:
	if not pip_container or not combat_arena:
		return

	# Clear existing
	for child in pip_container.get_children():
		child.queue_free()

	var player := combat_arena.get_player_combatant()
	if not player:
		return

	var current := player.get_current_stamina()
	var max_stamina := player.get_max_stamina()

	for i in range(max_stamina):
		var cell := PanelContainer.new()
		cell.custom_minimum_size = Vector2(20, 20)

		var style := StyleBoxFlat.new()
		style.corner_radius_top_left = 3
		style.corner_radius_top_right = 3
		style.corner_radius_bottom_right = 3
		style.corner_radius_bottom_left = 3

		if i < current:
			style.bg_color = Color(0.3, 0.9, 0.3)  # Green for available stamina
			style.border_width_left = 1
			style.border_width_top = 1
			style.border_width_right = 1
			style.border_width_bottom = 1
			style.border_color = Color(0.5, 1.0, 0.5)
		else:
			style.bg_color = Color(0.25, 0.25, 0.25)  # Gray for spent
			style.border_width_left = 1
			style.border_width_top = 1
			style.border_width_right = 1
			style.border_width_bottom = 1
			style.border_color = Color(0.35, 0.35, 0.35)

		cell.add_theme_stylebox_override("panel", style)
		pip_container.add_child(cell)

	# Add strain indicator after stamina cells
	var strain_percentage := player.get_strain_percentage()
	var strain_color := player.resources.get_strain_color() if player.resources else Color(0.3, 1.0, 0.3)

	var strain_label := Label.new()
	if player.is_exhausted():
		strain_label.text = " [EXHAUSTED]"
		strain_label.add_theme_color_override("font_color", Color(1.0, 0.2, 0.2))
	else:
		strain_label.text = " Strain: %d%%" % int(strain_percentage * 100)
		strain_label.add_theme_color_override("font_color", strain_color)
	pip_container.add_child(strain_label)

## Update stamina display for enemy
func _update_enemy_pip_display() -> void:
	if not enemy_pip_container or not combat_arena:
		return

	# Clear existing
	for child in enemy_pip_container.get_children():
		child.queue_free()

	var enemy := combat_arena.get_enemy_combatant()
	if not enemy or not is_instance_valid(enemy.entity):
		return

	var current := enemy.get_current_stamina()
	var max_stamina := enemy.get_max_stamina()

	for i in range(max_stamina):
		var cell := PanelContainer.new()
		cell.custom_minimum_size = Vector2(16, 16)  # Slightly smaller than player cells

		var style := StyleBoxFlat.new()
		style.corner_radius_top_left = 3
		style.corner_radius_top_right = 3
		style.corner_radius_bottom_right = 3
		style.corner_radius_bottom_left = 3

		if i < current:
			style.bg_color = Color(0.85, 0.35, 0.35)  # Red for enemy available stamina
			style.border_width_left = 1
			style.border_width_top = 1
			style.border_width_right = 1
			style.border_width_bottom = 1
			style.border_color = Color(1.0, 0.5, 0.5)
		else:
			style.bg_color = Color(0.25, 0.25, 0.25)  # Gray for spent
			style.border_width_left = 1
			style.border_width_top = 1
			style.border_width_right = 1
			style.border_width_bottom = 1
			style.border_color = Color(0.35, 0.35, 0.35)

		cell.add_theme_stylebox_override("panel", style)
		enemy_pip_container.add_child(cell)

	# Add strain indicator
	var strain_percentage := enemy.get_strain_percentage()
	var strain_label := Label.new()
	if enemy.is_exhausted():
		strain_label.text = " [EXH]"
		strain_label.add_theme_color_override("font_color", Color(1.0, 0.2, 0.2))
	elif strain_percentage >= 0.5:
		strain_label.text = " %d%%" % int(strain_percentage * 100)
		strain_label.add_theme_color_override("font_color", enemy.resources.get_strain_color() if enemy.resources else Color(1.0, 1.0, 0.0))
		enemy_pip_container.add_child(strain_label)

## Update queue display
func _update_queue_display() -> void:
	if not queue_display or not combat_arena:
		return

	# Clear existing
	for child in queue_display.get_children():
		child.queue_free()

	var player := combat_arena.get_player_combatant()
	if not player:
		return

	var actions := player.action_queue.to_display_list()

	for action_info in actions:
		var label := Label.new()
		label.text = "%s (%d pip)" % [action_info.name, action_info.cost]
		label.add_theme_font_size_override("font_size", 13)
		queue_display.add_child(label)

	if actions.is_empty():
		var empty_label := Label.new()
		empty_label.text = "(No actions queued)"
		empty_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5))
		empty_label.add_theme_font_size_override("font_size", 13)
		queue_display.add_child(empty_label)

## Handle tile gui input (supports left/right click)
func _on_tile_gui_input(event: InputEvent, pos: Vector2i) -> void:
	if not event is InputEventMouseButton:
		return

	var mouse_event := event as InputEventMouseButton
	if not mouse_event.pressed:
		return

	if not combat_arena or not combat_arena.is_planning():
		return

	tile_clicked.emit(pos)

	var success := false

	# Left click = light attack, Right click = heavy attack
	match mouse_event.button_index:
		MOUSE_BUTTON_LEFT:
			# Light attack on clicked tile
			success = combat_arena.player_queue_light_attack(pos)

		MOUSE_BUTTON_RIGHT:
			# Heavy attack on clicked tile
			success = combat_arena.player_queue_heavy_attack(pos)

	if success:
		_refresh_grid()
		_update_pip_display()
		_update_queue_display()


## Handle confirm button
func _on_confirm_pressed() -> void:
	confirm_pressed.emit()
	combat_arena.player_confirm()

## Handle undo button
func _on_undo_pressed() -> void:
	undo_pressed.emit()
	combat_arena.player_undo()
	_refresh_grid()
	_update_pip_display()
	_update_queue_display()

## Handle clear button
func _on_clear_pressed() -> void:
	clear_pressed.emit()
	combat_arena.player_clear()
	_refresh_grid()
	_update_pip_display()
	_update_queue_display()

## EventBus handlers
func _on_phase_changed(new_phase: int) -> void:
	if phase_label:
		match new_phase:
			Constants.CombatPhase.ENTERING:
				phase_label.text = "Entering Combat..."
			Constants.CombatPhase.TELEGRAPH:
				phase_label.text = "Enemy Intent"
			Constants.CombatPhase.PLANNING:
				phase_label.text = "Plan Your Actions"
			Constants.CombatPhase.RESOLUTION:
				phase_label.text = "Resolving..."
			Constants.CombatPhase.CLEANUP:
				phase_label.text = "Turn End"
			Constants.CombatPhase.VICTORY:
				phase_label.text = "Victory!"
			Constants.CombatPhase.DEFEAT:
				phase_label.text = "Defeat..."
			Constants.CombatPhase.EXITING:
				phase_label.text = "Exiting..."

	# Enable/disable buttons based on phase
	var can_act := (new_phase == Constants.CombatPhase.PLANNING)
	if confirm_button:
		confirm_button.disabled = not can_act
	if undo_button:
		undo_button.disabled = not can_act
	if clear_button:
		clear_button.disabled = not can_act

	# Clear arrows when entering resolution (attacks are about to execute)
	if new_phase == Constants.CombatPhase.RESOLUTION:
		_clear_attack_arrows()
		_clear_enemy_movement_path()
		_active_telegraphs.clear()
		_current_resolution_index = -1
		# Update execution order panel and start highlighting
		_update_execution_order_panel()
		if _execution_order_panel:
			_execution_order_panel.visible = true
			_execution_order_panel.reset_highlighting()

	# Show execution order panel during telegraph and planning
	if new_phase == Constants.CombatPhase.TELEGRAPH:
		_update_execution_order_panel()
		if _execution_order_panel:
			_execution_order_panel.visible = true

	if new_phase == Constants.CombatPhase.PLANNING:
		# Update with latest actions during planning
		_update_execution_order_panel()
		if _execution_order_panel:
			_execution_order_panel.visible = true

	# Hide panel and cleanup when combat ends
	if new_phase in [Constants.CombatPhase.CLEANUP]:
		if _execution_order_panel:
			_execution_order_panel.mark_all_completed()

	# Clear arrows and telegraphs when combat ends
	if new_phase in [Constants.CombatPhase.VICTORY, Constants.CombatPhase.DEFEAT, Constants.CombatPhase.EXITING]:
		_clear_attack_arrows()
		_clear_enemy_movement_path()
		_active_telegraphs.clear()
		if _execution_order_panel:
			_execution_order_panel.visible = false
		return

	# Check combat_arena is still valid and active
	if not combat_arena or not combat_arena.is_active:
		return

	_refresh_grid()

	# Update HP and pips after resolution (HP may have changed) and cleanup (pips regenerate)
	_update_hp_display()
	_update_pip_display()
	_update_enemy_pip_display()
	_update_queue_display()

func _on_pips_changed(_combatant: Node, _current: int, _maximum: int) -> void:
	_update_pip_display()

func _on_action_queued(_combatant: Node, _action: Dictionary) -> void:
	_update_queue_display()
	_update_pip_display()
	_update_execution_order_panel()
	_refresh_grid()  # Refresh to show movement path

func _on_action_dequeued(_combatant: Node, _action: Dictionary) -> void:
	_update_queue_display()
	_update_pip_display()
	_update_execution_order_panel()
	_refresh_grid()  # Refresh to update movement path

func _on_actions_cleared(_combatant: Node) -> void:
	_update_queue_display()
	_update_pip_display()
	_update_execution_order_panel()
	_refresh_grid()  # Refresh to clear movement path

## Handle action resolving - highlight current action in execution order panel
func _on_action_resolving(action_index: int, _action_dict: Dictionary) -> void:
	_current_resolution_index = action_index
	if _execution_order_panel:
		_execution_order_panel.highlight_action(action_index)

## Handle combatant healed event - spawn healing popup
func _on_combatant_healed(_target: Node, target_pos: Vector2i, amount: int) -> void:
	if target_pos.x < 0 or target_pos.y < 0:
		return
	if target_pos.x >= Constants.ARENA_SIZE.x or target_pos.y >= Constants.ARENA_SIZE.y:
		return

	if amount <= 0:
		return

	# Get the tile for positioning
	if target_pos.y < grid_tiles.size() and target_pos.x < grid_tiles[target_pos.y].size():
		var tile: PanelContainer = grid_tiles[target_pos.y][target_pos.x]
		var popup_pos := tile.global_position + Vector2(TILE_DISPLAY_SIZE / 2, TILE_DISPLAY_SIZE / 3)

		# Spawn healing popup (uses negative damage for green color)
		DamagePopup.spawn_healing_at(self, popup_pos, amount)

		# Update health display on the tile
		_update_tile_health_after_damage(target_pos)

## Handle multi-enemy telegraph signal
func _on_telegraphs_shown(telegraphs: Array) -> void:
	# Clear previous telegraphs and arrows
	_clear_attack_arrows()
	_active_telegraphs.clear()
	_clear_enemy_movement_path()

	if grid_tiles.is_empty():
		return

	var grid := combat_arena.get_grid() if combat_arena else null
	var player := combat_arena.get_player_combatant() if combat_arena else null

	# Get player HP for kill calculation
	var player_hp := 0
	var player_pos := Vector2i(-1, -1)
	if player and is_instance_valid(player.entity):
		player_hp = player.get_hp()
		if grid:
			player_pos = grid.get_combatant_position(player.entity)

	# Process telegraphs from each enemy
	for telegraph_entry in telegraphs:
		var enemy_node: Node = telegraph_entry.get("enemy", null)
		var actions: Array = telegraph_entry.get("actions", [])

		# Find the combatant wrapper for this enemy
		var enemy: ArenaCombatant = _find_combatant_for_entity(enemy_node)
		if not enemy:
			continue

		# Get enemy current position
		var enemy_current_pos := Vector2i(-1, -1)
		if grid and is_instance_valid(enemy.entity):
			enemy_current_pos = grid.get_combatant_position(enemy.entity)

		# Calculate enemy's predicted position after all move actions
		var enemy_predicted_pos := enemy_current_pos
		if grid and is_instance_valid(enemy.entity):
			enemy_predicted_pos = enemy.get_predicted_position(grid)

		# Show enemy movement path if they have queued moves
		if enemy_current_pos != Vector2i(-1, -1) and enemy_predicted_pos != enemy_current_pos:
			_show_enemy_movement_path(enemy, grid)

		# Process actions for this enemy
		_process_enemy_actions(enemy, actions, enemy_predicted_pos, player_pos, player_hp)

	# Update damage previews on tiles
	_update_damage_previews()

## Find the ArenaCombatant wrapper for an entity node
func _find_combatant_for_entity(entity: Node) -> ArenaCombatant:
	if not combat_arena or not entity:
		return null

	var enemy_combatants := combat_arena.get_enemy_combatants()
	for combatant in enemy_combatants:
		if combatant and combatant.entity == entity:
			return combatant
	return null

## Process actions from a single enemy for telegraph display
func _process_enemy_actions(enemy: ArenaCombatant, actions: Array, enemy_predicted_pos: Vector2i, player_pos: Vector2i, player_hp: int) -> void:
	for action_dict in actions:
		var action_type: int = action_dict.get("action_type", -1)
		var raw_target = action_dict.get("target_position", null)
		var target_pos := Vector2i(-1, -1)
		if raw_target != null:
			if raw_target is Vector2i:
				target_pos = raw_target
			elif raw_target is Vector2:
				target_pos = Vector2i(int(raw_target.x), int(raw_target.y))

		# Check for pattern attacks (multi-tile heavy attacks)
		var affected_tiles_raw = action_dict.get("affected_tiles", null)
		var pattern_value = action_dict.get("pattern", null)

		if affected_tiles_raw != null and affected_tiles_raw is Array and affected_tiles_raw.size() > 0:
			# This is a pattern attack with multiple affected tiles
			var damage := _calculate_telegraph_damage(enemy, Constants.CombatActionType.HEAVY_ATTACK)

			for affected_tile in affected_tiles_raw:
				var tile_pos := Vector2i(-1, -1)
				if affected_tile is Vector2i:
					tile_pos = affected_tile
				elif affected_tile is Vector2:
					tile_pos = Vector2i(int(affected_tile.x), int(affected_tile.y))

				if tile_pos != Vector2i(-1, -1) and \
				   tile_pos.x >= 0 and tile_pos.x < Constants.ARENA_SIZE.x and \
				   tile_pos.y >= 0 and tile_pos.y < Constants.ARENA_SIZE.y:
					# Set tile style to telegraph
					var tile: PanelContainer = grid_tiles[tile_pos.y][tile_pos.x]
					_set_tile_style(tile, "telegraph", "!")

					var is_kill := (tile_pos == player_pos) and (damage >= player_hp)

					# Store telegraph data for damage preview
					var telegraph_data := {
						"source_pos": enemy_predicted_pos,
						"target_position": tile_pos,
						"damage": damage,
						"action_type": action_type,
						"is_kill": is_kill,
						"is_pattern": true,
						"pattern": pattern_value
					}
					_active_telegraphs.append(telegraph_data)

					# Create attack arrow for each affected tile
					if enemy_predicted_pos != Vector2i(-1, -1):
						_create_attack_arrow(enemy_predicted_pos, tile_pos, damage, false, is_kill)

		elif target_pos != Vector2i(-1, -1) and action_type in [
			Constants.CombatActionType.LIGHT_ATTACK,
			Constants.CombatActionType.HEAVY_ATTACK
		]:
			if target_pos.x >= 0 and target_pos.x < Constants.ARENA_SIZE.x and \
			   target_pos.y >= 0 and target_pos.y < Constants.ARENA_SIZE.y:
				# Set tile style to telegraph
				var tile: PanelContainer = grid_tiles[target_pos.y][target_pos.x]
				_set_tile_style(tile, "telegraph", "!")

				# Calculate expected damage
				var damage := _calculate_telegraph_damage(enemy, action_type)
				var is_kill := (target_pos == player_pos) and (damage >= player_hp)

				# Store telegraph data for damage preview (use predicted position)
				var telegraph_data := {
					"source_pos": enemy_predicted_pos,
					"target_position": target_pos,
					"damage": damage,
					"action_type": action_type,
					"is_kill": is_kill
				}
				_active_telegraphs.append(telegraph_data)

				# Create attack arrow FROM PREDICTED POSITION (after moves)
				if enemy_predicted_pos != Vector2i(-1, -1):
					_create_attack_arrow(enemy_predicted_pos, target_pos, damage, false, is_kill)

## Calculate expected damage for a telegraphed attack
func _calculate_telegraph_damage(enemy: ArenaCombatant, action_type: int) -> int:
	if not enemy or not is_instance_valid(enemy.entity):
		return 0

	var base_damage := 5
	if enemy.entity.has_method("get_stat"):
		base_damage = enemy.entity.get_stat("attack")

	# Apply heavy attack multiplier
	if action_type == Constants.CombatActionType.HEAVY_ATTACK:
		base_damage = int(base_damage * 1.5)

	# Account for player defense
	var defense := 0
	var player := combat_arena.get_player_combatant() if combat_arena else null
	if player and is_instance_valid(player.entity) and player.entity.has_method("get_stat"):
		defense = player.entity.get_stat("defense")

	return maxi(Constants.MIN_DAMAGE, base_damage - defense)

## Create an attack arrow between two grid positions
## Note: Damage display is handled by tile previews, so arrows don't show damage labels
func _create_attack_arrow(source: Vector2i, target: Vector2i, _damage: int, is_player: bool, _is_kill: bool) -> void:
	if not grid_container:
		return

	# Calculate tile offset (grid container position in arena)
	var grid_offset := grid_container.global_position

	# Create the arrow without damage label (tile preview handles damage display)
	var arrow := AttackArrow.create_between(
		self,
		source,
		target,
		TILE_DISPLAY_SIZE + 4,  # Add spacing between tiles
		grid_offset,
		0,  # No damage label on arrow - tile preview shows aggregated damage
		is_player,
		false  # Not showing kill indicator on arrow
	)
	arrow.start_pulse()
	_attack_arrows.append(arrow)

## Clear all attack arrows
func _clear_attack_arrows() -> void:
	for arrow in _attack_arrows:
		if is_instance_valid(arrow):
			arrow.queue_free()
	_attack_arrows.clear()

## Handle combatant attacked event - spawn damage popup
func _on_combatant_attacked(attacker: Node, target_pos: Vector2i, damage_result: Dictionary) -> void:
	# Spawn floating damage number at target tile
	if target_pos.x < 0 or target_pos.y < 0:
		return
	if target_pos.x >= Constants.ARENA_SIZE.x or target_pos.y >= Constants.ARENA_SIZE.y:
		return

	var damage: int = damage_result.get("damage", 0)
	var is_crit: bool = damage_result.get("is_crit", false)

	if damage <= 0:
		return

	# Get the tile for positioning
	if target_pos.y < grid_tiles.size() and target_pos.x < grid_tiles[target_pos.y].size():
		var tile: PanelContainer = grid_tiles[target_pos.y][target_pos.x]
		var popup_pos := tile.global_position + Vector2(TILE_DISPLAY_SIZE / 2, TILE_DISPLAY_SIZE / 3)

		# Spawn damage popup
		DamagePopup.spawn_at(self, popup_pos, damage, is_crit)

		# Update health display on the tile (it will flash)
		_update_tile_health_after_damage(target_pos)

## Update tile health display after damage is dealt
func _update_tile_health_after_damage(pos: Vector2i) -> void:
	if not combat_arena:
		return

	var grid := combat_arena.get_grid()
	var player := combat_arena.get_player_combatant()
	var enemy := combat_arena.get_enemy_combatant()

	# Check if player is at this position
	if player and is_instance_valid(player.entity):
		var player_pos := grid.get_combatant_position(player.entity)
		if player_pos == pos:
			if pos in _tile_health_displays:
				var health_display: HealthSegmentDisplay = _tile_health_displays[pos]
				health_display.update_health(player.get_hp(), player.get_max_hp())
			return

	# Check if enemy is at this position
	if enemy and is_instance_valid(enemy.entity):
		var enemy_pos := grid.get_combatant_position(enemy.entity)
		if enemy_pos == pos:
			if pos in _tile_health_displays:
				var health_display: HealthSegmentDisplay = _tile_health_displays[pos]
				health_display.update_health(enemy.get_hp(), enemy.get_max_hp())
