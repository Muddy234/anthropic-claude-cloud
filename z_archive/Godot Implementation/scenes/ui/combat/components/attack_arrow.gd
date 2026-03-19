class_name AttackArrow
extends Control

## Visual arrow indicator showing attack direction from source to target
## Used during telegraph phase to show enemy attack intentions

# Configuration
@export var arrow_color_enemy := Color("#FF5722")  # Red/orange for enemy attacks
@export var arrow_color_player := Color("#2196F3")  # Blue for player attacks
@export var arrow_width: float = 4.0
@export var arrow_head_size: float = 12.0
@export var show_damage: bool = true

# Internal state
var source_pos: Vector2 = Vector2.ZERO
var target_pos: Vector2 = Vector2.ZERO
var damage_amount: int = 0
var is_player_attack: bool = false
var is_kill: bool = false

# Child nodes
var _damage_label: Label
var _pulse_tween: Tween

func _ready() -> void:
	# Create damage label
	_damage_label = Label.new()
	_damage_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_damage_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_damage_label.add_theme_font_size_override("font_size", 16)
	_damage_label.add_theme_constant_override("outline_size", 2)
	_damage_label.add_theme_color_override("font_outline_color", Color.BLACK)
	_damage_label.visible = false
	add_child(_damage_label)

	# Make sure we render on top of tiles but under popups
	z_index = 50

## Setup the arrow from source to target tile
## source: Grid position of attacker
## target: Grid position of target
## tile_size: Size of each grid tile in pixels
## tile_offset: Top-left corner of the grid in screen space
func setup(source: Vector2i, target: Vector2i, tile_size: float, tile_offset: Vector2, damage: int = 0, player_attack: bool = false, will_kill: bool = false) -> void:
	# Calculate pixel positions (center of tiles)
	var half_tile := tile_size / 2.0
	source_pos = tile_offset + Vector2(source.x * tile_size + half_tile, source.y * tile_size + half_tile)
	target_pos = tile_offset + Vector2(target.x * tile_size + half_tile, target.y * tile_size + half_tile)

	damage_amount = damage
	is_player_attack = player_attack
	is_kill = will_kill

	# Update damage label
	if show_damage and damage > 0:
		_damage_label.visible = true
		if is_kill:
			_damage_label.text = "KILL"
			_damage_label.add_theme_color_override("font_color", Color("#FFD740"))  # Yellow
		else:
			_damage_label.text = "-%d" % damage
			_damage_label.add_theme_color_override("font_color", Color("#FF5252"))  # Red

		# Position label near target
		_damage_label.position = target_pos - Vector2(20, 30)
	else:
		_damage_label.visible = false

	queue_redraw()

## Custom drawing for the arrow
func _draw() -> void:
	if source_pos == Vector2.ZERO and target_pos == Vector2.ZERO:
		return

	var color: Color = arrow_color_player if is_player_attack else arrow_color_enemy

	# Calculate direction
	var direction := (target_pos - source_pos).normalized()
	var length := source_pos.distance_to(target_pos)

	# Don't draw if too short
	if length < 10:
		return

	# Shorten line to not overlap source/target centers
	var line_start := source_pos + direction * 20
	var line_end := target_pos - direction * 20

	# Draw main line
	draw_line(line_start, line_end, color, arrow_width, true)

	# Draw arrow head
	var head_base := line_end - direction * arrow_head_size
	var perpendicular := Vector2(-direction.y, direction.x)
	var head_left := head_base + perpendicular * (arrow_head_size * 0.5)
	var head_right := head_base - perpendicular * (arrow_head_size * 0.5)

	var head_points := PackedVector2Array([line_end, head_left, head_right])
	draw_colored_polygon(head_points, color)

## Start pulsing animation for telegraph visibility
func start_pulse() -> void:
	if _pulse_tween and _pulse_tween.is_valid():
		_pulse_tween.kill()

	_pulse_tween = create_tween()
	_pulse_tween.set_loops()  # Infinite loop

	# Pulse opacity
	_pulse_tween.tween_property(self, "modulate:a", 0.5, 0.3)
	_pulse_tween.tween_property(self, "modulate:a", 1.0, 0.3)

## Stop pulsing
func stop_pulse() -> void:
	if _pulse_tween and _pulse_tween.is_valid():
		_pulse_tween.kill()
	modulate.a = 1.0

## Animate the arrow shooting (for resolution phase)
func animate_attack(on_complete: Callable = Callable()) -> void:
	if _pulse_tween and _pulse_tween.is_valid():
		_pulse_tween.kill()

	var tween := create_tween()

	# Quick flash then fade
	tween.tween_property(self, "modulate:a", 1.5, 0.1)  # Bright flash
	tween.tween_property(self, "modulate:a", 0.0, 0.3)  # Fade out

	if on_complete.is_valid():
		tween.tween_callback(on_complete)

	tween.tween_callback(queue_free)

## Static helper to create an arrow between two grid positions
static func create_between(parent: Node, source: Vector2i, target: Vector2i, tile_size: float, grid_offset: Vector2, damage: int = 0, is_player: bool = false, will_kill: bool = false) -> AttackArrow:
	var arrow := AttackArrow.new()
	parent.add_child(arrow)
	arrow.setup(source, target, tile_size, grid_offset, damage, is_player, will_kill)
	return arrow
