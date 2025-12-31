class_name ExecutionOrderPanel
extends PanelContainer

## Displays the execution order of all queued actions
## Shows which actions will resolve first based on priority
## Highlights the current action during resolution phase

signal action_hovered(action_index: int)
signal action_unhovered()

# Action icons (using text fallbacks since we may not have icons)
const ICON_MOVE := "►"
const ICON_LIGHT_ATTACK := "⚔"
const ICON_HEAVY_ATTACK := "⚒"
const ICON_ITEM := "◆"

# Colors
const COLOR_PLAYER := Color("#2196F3")  # Blue
const COLOR_ENEMY := Color("#FF5722")   # Red/Orange
const COLOR_CURRENT := Color("#FFD740")  # Yellow highlight
const COLOR_COMPLETED := Color("#9E9E9E")  # Gray
const COLOR_PENDING := Color("#FFFFFF")  # White

# Internal
var _action_entries: Array[Dictionary] = []  # Stores action data
var _action_rows: Array[HBoxContainer] = []  # UI row references
var _current_index: int = -1  # Currently executing action
var _vbox: VBoxContainer
var _title_label: Label

func _ready() -> void:
	# Setup panel style
	var style := StyleBoxFlat.new()
	style.bg_color = Color(0.12, 0.12, 0.15, 0.95)
	style.border_width_left = 2
	style.border_width_top = 2
	style.border_width_right = 2
	style.border_width_bottom = 2
	style.border_color = Color(0.3, 0.3, 0.35)
	style.corner_radius_top_left = 6
	style.corner_radius_top_right = 6
	style.corner_radius_bottom_right = 6
	style.corner_radius_bottom_left = 6
	style.content_margin_left = 10
	style.content_margin_top = 8
	style.content_margin_right = 10
	style.content_margin_bottom = 8
	add_theme_stylebox_override("panel", style)

	# Create layout
	_vbox = VBoxContainer.new()
	_vbox.add_theme_constant_override("separation", 4)
	add_child(_vbox)

	# Create title
	_title_label = Label.new()
	_title_label.text = "EXECUTION ORDER"
	_title_label.add_theme_font_size_override("font_size", 14)
	_title_label.add_theme_color_override("font_color", Color(0.7, 0.7, 0.75))
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_vbox.add_child(_title_label)

	# Add separator
	var separator := HSeparator.new()
	separator.add_theme_constant_override("separation", 4)
	_vbox.add_child(separator)

	# Set minimum size
	custom_minimum_size = Vector2(180, 100)

## Update the panel with all queued actions from both combatants
func update_actions(player_actions: Array, enemy_actions: Array, player_name: String = "Player", enemy_name: String = "Enemy") -> void:
	_clear_action_rows()
	_action_entries.clear()
	_current_index = -1

	# Collect all actions with metadata
	for action in player_actions:
		_action_entries.append({
			"action": action,
			"is_player": true,
			"name": player_name,
			"priority": action.priority if "priority" in action else 1
		})

	for action in enemy_actions:
		_action_entries.append({
			"action": action,
			"is_player": false,
			"name": enemy_name,
			"priority": action.priority if "priority" in action else 1
		})

	# Sort by priority (lower executes first)
	_action_entries.sort_custom(_sort_by_priority)

	# Create UI rows
	for i in range(_action_entries.size()):
		var entry := _action_entries[i]
		var row := _create_action_row(i + 1, entry)
		_vbox.add_child(row)
		_action_rows.append(row)

	# Show empty message if no actions
	if _action_entries.is_empty():
		var empty_label := Label.new()
		empty_label.text = "(No actions queued)"
		empty_label.add_theme_font_size_override("font_size", 12)
		empty_label.add_theme_color_override("font_color", Color(0.5, 0.5, 0.5))
		empty_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_vbox.add_child(empty_label)
		_action_rows.append(null)  # Placeholder

## Sort function for actions by priority
func _sort_by_priority(a: Dictionary, b: Dictionary) -> bool:
	return a.priority < b.priority

## Create a single action row
func _create_action_row(order: int, entry: Dictionary) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 6)

	# Order number
	var order_label := Label.new()
	order_label.text = "%d." % order
	order_label.add_theme_font_size_override("font_size", 13)
	order_label.add_theme_color_override("font_color", COLOR_PENDING)
	order_label.custom_minimum_size.x = 20
	row.add_child(order_label)

	# Action icon
	var icon_label := Label.new()
	icon_label.text = _get_action_icon(entry.action)
	icon_label.add_theme_font_size_override("font_size", 14)
	icon_label.add_theme_color_override("font_color", COLOR_PLAYER if entry.is_player else COLOR_ENEMY)
	row.add_child(icon_label)

	# Action name with source
	var name_label := Label.new()
	var action_name := _get_action_name(entry.action)
	name_label.text = "%s %s" % [entry.name, action_name]
	name_label.add_theme_font_size_override("font_size", 12)
	name_label.add_theme_color_override("font_color", COLOR_PLAYER if entry.is_player else COLOR_ENEMY)
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(name_label)

	# Store references for highlighting
	row.set_meta("order_label", order_label)
	row.set_meta("icon_label", icon_label)
	row.set_meta("name_label", name_label)
	row.set_meta("entry", entry)

	return row

## Get icon for action type
func _get_action_icon(action) -> String:
	if not action or not "action_type" in action:
		return "?"

	match action.action_type:
		Constants.CombatActionType.MOVE:
			return ICON_MOVE
		Constants.CombatActionType.LIGHT_ATTACK:
			return ICON_LIGHT_ATTACK
		Constants.CombatActionType.HEAVY_ATTACK:
			return ICON_HEAVY_ATTACK
		Constants.CombatActionType.ITEM:
			return ICON_ITEM
		_:
			return "?"

## Get display name for action
func _get_action_name(action) -> String:
	if action and action.has_method("get_display_name"):
		return action.get_display_name()

	if not action or not "action_type" in action:
		return "Unknown"

	match action.action_type:
		Constants.CombatActionType.MOVE:
			return "Move"
		Constants.CombatActionType.LIGHT_ATTACK:
			return "Light"
		Constants.CombatActionType.HEAVY_ATTACK:
			return "Heavy"
		Constants.CombatActionType.ITEM:
			return "Item"
		_:
			return "Action"

## Clear all action rows
func _clear_action_rows() -> void:
	for row in _action_rows:
		if row and is_instance_valid(row):
			row.queue_free()
	_action_rows.clear()

	# Also clear any remaining children after title and separator
	var children := _vbox.get_children()
	for i in range(2, children.size()):  # Skip title and separator
		children[i].queue_free()

## Highlight the current action being executed
func highlight_action(index: int) -> void:
	_current_index = index

	for i in range(_action_rows.size()):
		var row := _action_rows[i]
		if not row or not is_instance_valid(row):
			continue

		var order_label: Label = row.get_meta("order_label")
		var icon_label: Label = row.get_meta("icon_label")
		var name_label: Label = row.get_meta("name_label")
		var entry: Dictionary = row.get_meta("entry")

		if i < index:
			# Completed - gray out
			order_label.add_theme_color_override("font_color", COLOR_COMPLETED)
			icon_label.add_theme_color_override("font_color", COLOR_COMPLETED)
			name_label.add_theme_color_override("font_color", COLOR_COMPLETED)
		elif i == index:
			# Current - highlight yellow
			order_label.add_theme_color_override("font_color", COLOR_CURRENT)
			icon_label.add_theme_color_override("font_color", COLOR_CURRENT)
			name_label.add_theme_color_override("font_color", COLOR_CURRENT)

			# Add pulsing effect
			_pulse_row(row)
		else:
			# Pending - normal colors
			var base_color: Color = COLOR_PLAYER if entry.is_player else COLOR_ENEMY
			order_label.add_theme_color_override("font_color", COLOR_PENDING)
			icon_label.add_theme_color_override("font_color", base_color)
			name_label.add_theme_color_override("font_color", base_color)

## Add a pulsing effect to a row
func _pulse_row(row: HBoxContainer) -> void:
	var tween := create_tween()
	tween.set_loops(3)
	tween.tween_property(row, "modulate:a", 0.6, 0.15)
	tween.tween_property(row, "modulate:a", 1.0, 0.15)

## Mark all actions as completed
func mark_all_completed() -> void:
	for row in _action_rows:
		if not row or not is_instance_valid(row):
			continue

		var order_label: Label = row.get_meta("order_label")
		var icon_label: Label = row.get_meta("icon_label")
		var name_label: Label = row.get_meta("name_label")

		order_label.add_theme_color_override("font_color", COLOR_COMPLETED)
		icon_label.add_theme_color_override("font_color", COLOR_COMPLETED)
		name_label.add_theme_color_override("font_color", COLOR_COMPLETED)

## Reset all highlighting
func reset_highlighting() -> void:
	_current_index = -1

	for row in _action_rows:
		if not row or not is_instance_valid(row):
			continue

		var order_label: Label = row.get_meta("order_label")
		var icon_label: Label = row.get_meta("icon_label")
		var name_label: Label = row.get_meta("name_label")
		var entry: Dictionary = row.get_meta("entry")

		var base_color: Color = COLOR_PLAYER if entry.is_player else COLOR_ENEMY
		order_label.add_theme_color_override("font_color", COLOR_PENDING)
		icon_label.add_theme_color_override("font_color", base_color)
		name_label.add_theme_color_override("font_color", base_color)
		row.modulate.a = 1.0

## Get the number of actions
func get_action_count() -> int:
	return _action_entries.size()

## Get action entry at index
func get_action_at(index: int) -> Dictionary:
	if index >= 0 and index < _action_entries.size():
		return _action_entries[index]
	return {}
