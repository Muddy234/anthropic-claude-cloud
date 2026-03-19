class_name HealthSegmentDisplay
extends HBoxContainer

## Visual health bar using segments (like Into The Breach's green squares)
## Displays health as filled/empty segments rather than text numbers

# Signals
signal health_changed(current: int, maximum: int)

# Configuration
@export var max_segments: int = 5  # Number of segments to display
@export var segment_size: Vector2 = Vector2(10, 14)  # Size of each segment
@export var segment_spacing: int = 2  # Gap between segments
@export var is_player: bool = true  # Determines color scheme

# Colors from the implementation guide
const COLOR_PLAYER_FILLED := Color("#4CAF50")  # Green
const COLOR_ENEMY_FILLED := Color("#F44336")   # Red
const COLOR_SEGMENT_EMPTY := Color("#424242")  # Dark gray
const COLOR_SEGMENT_BORDER := Color("#616161")  # Medium gray border
const COLOR_DAMAGE_FLASH := Color("#FF5252")   # Red flash on damage

# Internal state
var _current_hp: int = 0
var _max_hp: int = 0
var _segments: Array[PanelContainer] = []
var _flash_tween: Tween = null

func _ready() -> void:
	# Set container properties
	add_theme_constant_override("separation", segment_spacing)

## Initialize the health display with HP values
func setup(current_hp: int, max_hp: int, player: bool = true) -> void:
	is_player = player
	_current_hp = current_hp
	_max_hp = max_hp
	_rebuild_segments()

## Update health values and refresh display
func update_health(current_hp: int, max_hp: int = -1) -> void:
	var old_hp := _current_hp
	_current_hp = current_hp

	if max_hp > 0:
		_max_hp = max_hp

	# If max changed, rebuild segments
	if max_hp > 0 and _segments.size() != _calculate_segment_count():
		_rebuild_segments()
	else:
		_refresh_segment_colors()

	# Flash on damage
	if current_hp < old_hp:
		_flash_damage()

	health_changed.emit(_current_hp, _max_hp)

## Get the fill percentage (0.0 to 1.0)
func get_fill_percent() -> float:
	if _max_hp <= 0:
		return 0.0
	return float(_current_hp) / float(_max_hp)

## Calculate how many segments should be filled
func _calculate_filled_segments() -> int:
	if _max_hp <= 0:
		return 0
	var fill_ratio := float(_current_hp) / float(_max_hp)
	return ceili(fill_ratio * max_segments)

## Calculate segment count based on max HP brackets
func _calculate_segment_count() -> int:
	# Use max_segments by default, but could scale with HP
	return max_segments

## Rebuild all segment UI elements
func _rebuild_segments() -> void:
	# Clear existing
	for segment in _segments:
		segment.queue_free()
	_segments.clear()

	# Create new segments
	var count := _calculate_segment_count()
	for i in range(count):
		var segment := _create_segment()
		add_child(segment)
		_segments.append(segment)

	_refresh_segment_colors()

## Create a single segment panel
func _create_segment() -> PanelContainer:
	var segment := PanelContainer.new()
	segment.custom_minimum_size = segment_size

	var style := StyleBoxFlat.new()
	style.bg_color = COLOR_SEGMENT_EMPTY
	style.border_width_left = 1
	style.border_width_top = 1
	style.border_width_right = 1
	style.border_width_bottom = 1
	style.border_color = COLOR_SEGMENT_BORDER
	style.corner_radius_top_left = 2
	style.corner_radius_top_right = 2
	style.corner_radius_bottom_right = 2
	style.corner_radius_bottom_left = 2

	segment.add_theme_stylebox_override("panel", style)
	return segment

## Update segment colors based on current HP
func _refresh_segment_colors() -> void:
	var filled := _calculate_filled_segments()
	var fill_color: Color = COLOR_PLAYER_FILLED if is_player else COLOR_ENEMY_FILLED

	for i in range(_segments.size()):
		var segment := _segments[i]
		var style: StyleBoxFlat = segment.get_theme_stylebox("panel").duplicate()

		if i < filled:
			style.bg_color = fill_color
		else:
			style.bg_color = COLOR_SEGMENT_EMPTY

		segment.add_theme_stylebox_override("panel", style)

## Flash animation when damage is taken
func _flash_damage() -> void:
	if _flash_tween and _flash_tween.is_valid():
		_flash_tween.kill()

	_flash_tween = create_tween()

	# Flash all filled segments red then back
	var fill_color: Color = COLOR_PLAYER_FILLED if is_player else COLOR_ENEMY_FILLED
	var filled := _calculate_filled_segments()

	for i in range(filled):
		if i < _segments.size():
			var segment := _segments[i]
			var style: StyleBoxFlat = segment.get_theme_stylebox("panel").duplicate()
			style.bg_color = COLOR_DAMAGE_FLASH
			segment.add_theme_stylebox_override("panel", style)

	# After flash duration, restore normal colors
	_flash_tween.tween_callback(_refresh_segment_colors).set_delay(0.15)

## Set compact mode for smaller displays (e.g., on tiles)
func set_compact(compact: bool) -> void:
	if compact:
		segment_size = Vector2(6, 10)
		segment_spacing = 1
	else:
		segment_size = Vector2(10, 14)
		segment_spacing = 2

	add_theme_constant_override("separation", segment_spacing)

	# Update existing segments
	for segment in _segments:
		segment.custom_minimum_size = segment_size
