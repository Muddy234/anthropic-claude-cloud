class_name TileTooltip
extends PanelContainer

## Contextual tooltip that shows information when hovering over arena tiles
## Displays different info for empty tiles, player tile, and enemy tile

# Tooltip appearance delay
const SHOW_DELAY := 0.3  # seconds

# Colors
const COLOR_PLAYER := Color("#2196F3")  # Blue
const COLOR_ENEMY := Color("#FF5722")   # Red/Orange
const COLOR_DAMAGE := Color("#FF5252")  # Red
const COLOR_HEAL := Color("#69F0AE")    # Green
const COLOR_NEUTRAL := Color("#BDBDBD") # Gray

# Internal
var _vbox: VBoxContainer
var _title_label: Label
var _separator: HSeparator
var _info_container: VBoxContainer
var _show_timer: Timer
var _target_position: Vector2 = Vector2.ZERO
var _is_showing: bool = false

func _ready() -> void:
	# Setup panel style
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.1, 0.1, 0.12, 0.95)
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.border_color = Color(0.4, 0.4, 0.45)
	style.corner_radius_top_left = 4
	style.corner_radius_top_right = 4
	style.corner_radius_bottom_right = 4
	style.corner_radius_bottom_left = 4
	style.content_margin_left = 10
	style.content_margin_top = 8
	style.content_margin_right = 10
	style.content_margin_bottom = 8
	add_theme_stylebox_override("panel", style)

	# Create layout
	_vbox = VBoxContainer.new()
	_vbox.add_theme_constant_override("separation", 4)
	add_child(_vbox)

	# Title label
	_title_label = Label.new()
	_title_label.add_theme_font_size_override("font_size", 14)
	_title_label.add_theme_color_override("font_color", Color.WHITE)
	_vbox.add_child(_title_label)

	# Separator
	_separator = HSeparator.new()
	_separator.add_theme_constant_override("separation", 4)
	_vbox.add_child(_separator)

	# Info container for dynamic content
	_info_container = VBoxContainer.new()
	_info_container.add_theme_constant_override("separation", 2)
	_vbox.add_child(_info_container)

	# Create show delay timer
	_show_timer = Timer.new()
	_show_timer.one_shot = true
	_show_timer.timeout.connect(_on_show_timer_timeout)
	add_child(_show_timer)

	# Set properties
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	z_index = 200  # Above everything
	visible = false

	# Set minimum size
	custom_minimum_size = Vector2(160, 60)

## Request to show tooltip after delay
func request_show(screen_pos: Vector2) -> void:
	_target_position = screen_pos
	if not _show_timer.is_stopped():
		_show_timer.stop()
	_show_timer.start(SHOW_DELAY)

## Cancel showing tooltip
func cancel_show() -> void:
	_show_timer.stop()
	hide_tooltip()

## Hide the tooltip immediately
func hide_tooltip() -> void:
	visible = false
	_is_showing = false

## Show tooltip for an empty tile
func show_empty_tile(screen_pos: Vector2, can_move: bool) -> void:
	_clear_info()
	_title_label.text = "Empty"
	_title_label.add_theme_color_override("font_color", COLOR_NEUTRAL)

	if can_move:
		_add_info_line("Can move here", COLOR_NEUTRAL)
	else:
		_add_info_line("Out of range", COLOR_NEUTRAL)

	_position_tooltip(screen_pos)
	visible = true
	_is_showing = true

## Show tooltip for player tile
func show_player_tile(screen_pos: Vector2, hp: int, max_hp: int, queued_actions: int, incoming_damage: int) -> void:
	_clear_info()
	_title_label.text = "Player"
	_title_label.add_theme_color_override("font_color", COLOR_PLAYER)

	_add_info_line("HP: %d/%d" % [hp, max_hp], COLOR_PLAYER)

	if queued_actions > 0:
		_add_info_line("Queued: %d actions" % queued_actions, COLOR_NEUTRAL)

	if incoming_damage > 0:
		var damage_color := COLOR_DAMAGE
		var damage_text := "Incoming: -%d damage" % incoming_damage
		if incoming_damage >= hp:
			damage_text = "Incoming: LETHAL!"
			damage_color = Color("#FFD740")  # Yellow warning
		_add_info_line(damage_text, damage_color)

	_position_tooltip(screen_pos)
	visible = true
	_is_showing = true

## Show tooltip for enemy tile
func show_enemy_tile(screen_pos: Vector2, enemy_name: String, hp: int, max_hp: int, intent_action: String, intent_target: String, intent_damage: int) -> void:
	_clear_info()
	_title_label.text = enemy_name
	_title_label.add_theme_color_override("font_color", COLOR_ENEMY)

	_add_info_line("HP: %d/%d" % [hp, max_hp], COLOR_ENEMY)

	if not intent_action.is_empty():
		_add_separator()
		_add_info_line("Intent: %s" % intent_action, COLOR_NEUTRAL)
		if not intent_target.is_empty():
			_add_info_line("Target: %s" % intent_target, COLOR_NEUTRAL)
		if intent_damage > 0:
			_add_info_line("Damage: %d" % intent_damage, COLOR_DAMAGE)

	_position_tooltip(screen_pos)
	visible = true
	_is_showing = true

## Add an info line to the tooltip
func _add_info_line(text: String, color: Color) -> void:
	var label := Label.new()
	label.text = text
	label.add_theme_font_size_override("font_size", 12)
	label.add_theme_color_override("font_color", color)
	_info_container.add_child(label)

## Add a separator line
func _add_separator() -> void:
	var sep := HSeparator.new()
	sep.add_theme_constant_override("separation", 2)
	_info_container.add_child(sep)

## Clear all info lines
func _clear_info() -> void:
	for child in _info_container.get_children():
		child.queue_free()

## Position tooltip near mouse, avoiding screen edges
func _position_tooltip(screen_pos: Vector2) -> void:
	# Get viewport size
	var viewport_size := get_viewport_rect().size

	# Default position: offset to the right and below cursor
	var offset := Vector2(15, 15)
	var tooltip_pos := screen_pos + offset

	# Ensure tooltip stays within viewport
	var tooltip_size := get_combined_minimum_size()

	# Adjust horizontal position if too far right
	if tooltip_pos.x + tooltip_size.x > viewport_size.x - 10:
		tooltip_pos.x = screen_pos.x - tooltip_size.x - 10

	# Adjust vertical position if too far down
	if tooltip_pos.y + tooltip_size.y > viewport_size.y - 10:
		tooltip_pos.y = screen_pos.y - tooltip_size.y - 10

	# Ensure not off left or top edge
	tooltip_pos.x = maxf(10, tooltip_pos.x)
	tooltip_pos.y = maxf(10, tooltip_pos.y)

	global_position = tooltip_pos

## Timer callback to show tooltip
func _on_show_timer_timeout() -> void:
	# The actual content should be set before this is called
	# This just handles the delay
	pass

## Check if tooltip is currently showing
func is_showing() -> bool:
	return _is_showing
