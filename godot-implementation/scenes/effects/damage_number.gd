class_name DamageNumber
extends Node2D
## Float-up damage text that tweens upward and fades out.
## Supports color coding: white=normal, yellow=critical, green=heal.

# --- Configuration ---
const FLOAT_DISTANCE := 40.0
const FLOAT_DURATION := 0.8
const FADE_START := 0.5  # Start fading at this fraction of duration
const FONT_SIZE_NORMAL := 14
const FONT_SIZE_CRIT := 20
const FONT_SIZE_HEAL := 16

# --- Colors ---
const COLOR_NORMAL := Color(1.0, 1.0, 1.0, 1.0)
const COLOR_CRITICAL := Color(1.0, 0.9, 0.1, 1.0)
const COLOR_HEAL := Color(0.2, 1.0, 0.3, 1.0)
const COLOR_SHADOW := Color(0.0, 0.0, 0.0, 0.6)

# --- Internal ---
var _label: Label = null
var _tween: Tween = null
var _is_crit: bool = false
var _is_heal: bool = false


func _ready() -> void:
	z_index = 100
	# Label will be created in setup if not already present
	if not _label:
		_create_label()


## Configure and start the damage number animation.
## value: the number to display (negative values shown as positive for heal)
## start_position: global position to spawn at
## is_crit: whether this was a critical hit (larger, yellow)
## is_heal: whether this is healing (green)
func setup(value: int, start_position: Vector2, is_crit: bool = false, is_heal: bool = false) -> void:
	_is_crit = is_crit
	_is_heal = is_heal
	global_position = start_position

	if not _label:
		_create_label()

	# Set text
	var display_value := absi(value)
	if is_heal:
		_label.text = "+%d" % display_value
	elif is_crit:
		_label.text = "%d!" % display_value
	else:
		_label.text = str(display_value)

	# Set color
	if is_heal:
		_label.add_theme_color_override("font_color", COLOR_HEAL)
		_label.add_theme_font_size_override("font_size", FONT_SIZE_HEAL)
	elif is_crit:
		_label.add_theme_color_override("font_color", COLOR_CRITICAL)
		_label.add_theme_font_size_override("font_size", FONT_SIZE_CRIT)
	else:
		_label.add_theme_color_override("font_color", COLOR_NORMAL)
		_label.add_theme_font_size_override("font_size", FONT_SIZE_NORMAL)

	_label.add_theme_color_override("font_shadow_color", COLOR_SHADOW)
	_label.add_theme_constant_override("shadow_offset_x", 1)
	_label.add_theme_constant_override("shadow_offset_y", 1)

	# Center the label
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.position = Vector2(-50, -10)
	_label.size = Vector2(100, 20)

	# Add horizontal scatter to avoid overlap
	var scatter_x := randf_range(-12.0, 12.0)
	position.x += scatter_x

	# Start animation
	_animate()


func _create_label() -> void:
	_label = Label.new()
	_label.name = "DamageLabel"
	add_child(_label)


func _animate() -> void:
	if _tween and _tween.is_valid():
		_tween.kill()

	_tween = create_tween()
	_tween.set_parallel(true)

	# Float upward
	var target_y := position.y - FLOAT_DISTANCE
	_tween.tween_property(self, "position:y", target_y, FLOAT_DURATION)\
		.set_trans(Tween.TRANS_QUAD)\
		.set_ease(Tween.EASE_OUT)

	# Scale pop for crits
	if _is_crit:
		scale = Vector2(1.5, 1.5)
		_tween.tween_property(self, "scale", Vector2(1.0, 1.0), 0.2)\
			.set_trans(Tween.TRANS_ELASTIC)\
			.set_ease(Tween.EASE_OUT)

	# Fade out in second half
	_tween.tween_property(self, "modulate:a", 0.0, FLOAT_DURATION * (1.0 - FADE_START))\
		.set_delay(FLOAT_DURATION * FADE_START)\
		.set_trans(Tween.TRANS_QUAD)\
		.set_ease(Tween.EASE_IN)

	# Queue free after animation completes
	_tween.chain().tween_callback(queue_free)
