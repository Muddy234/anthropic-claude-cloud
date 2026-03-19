class_name DamagePopup
extends Control

## Floating damage number popup that rises and fades
## Spawns at target position, floats up, then disappears

# Configuration
@export var float_distance: float = 40.0  # How far up to float
@export var duration: float = 0.8  # Total animation duration
@export var font_size: int = 24

# Colors from implementation guide
const COLOR_DAMAGE := Color("#FF5252")      # Red for damage
const COLOR_HEALING := Color("#69F0AE")     # Green for healing
const COLOR_CRITICAL := Color("#FFD740")    # Yellow for crits
const COLOR_BLOCKED := Color("#9E9E9E")     # Gray for blocked

# Internal
var _label: Label
var _tween: Tween

func _ready() -> void:
	# Create the label
	_label = Label.new()
	_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	add_child(_label)

	# Set font properties
	_label.add_theme_font_size_override("font_size", font_size)

	# Make sure we're on top
	z_index = 100

## Show damage number with animation
## amount: The number to display (positive for damage, negative for healing)
## is_crit: Whether this was a critical hit
## is_blocked: Whether the damage was blocked
func show_damage(amount: int, is_crit: bool = false, is_blocked: bool = false) -> void:
	# Determine text and color
	var text: String
	var color: Color

	if is_blocked:
		text = str(abs(amount))
		color = COLOR_BLOCKED
		_label.add_theme_font_size_override("font_size", font_size - 4)
	elif amount < 0:
		# Healing (negative damage = positive healing)
		text = "+" + str(abs(amount))
		color = COLOR_HEALING
	elif is_crit:
		text = str(amount) + "!"
		color = COLOR_CRITICAL
		_label.add_theme_font_size_override("font_size", font_size + 8)
	else:
		text = "-" + str(amount)
		color = COLOR_DAMAGE

	_label.text = text
	_label.add_theme_color_override("font_color", color)

	# Add outline for visibility
	_label.add_theme_constant_override("outline_size", 3)
	_label.add_theme_color_override("font_outline_color", Color.BLACK)

	# Center the label
	_label.position = -_label.size / 2

	# Start animation
	_animate()

## Show healing number
func show_healing(amount: int) -> void:
	show_damage(-amount, false, false)

## Show a "KILL" indicator
func show_kill() -> void:
	_label.text = "KILL"
	_label.add_theme_color_override("font_color", COLOR_CRITICAL)
	_label.add_theme_font_size_override("font_size", font_size + 4)
	_label.add_theme_constant_override("outline_size", 3)
	_label.add_theme_color_override("font_outline_color", Color.BLACK)
	_label.position = -_label.size / 2
	_animate()

## Show a miss indicator
func show_miss() -> void:
	_label.text = "MISS"
	_label.add_theme_color_override("font_color", COLOR_BLOCKED)
	_label.add_theme_font_size_override("font_size", font_size - 2)
	_label.add_theme_constant_override("outline_size", 2)
	_label.add_theme_color_override("font_outline_color", Color.BLACK)
	_label.position = -_label.size / 2
	_animate()

## Animate the popup floating up and fading out
func _animate() -> void:
	if _tween and _tween.is_valid():
		_tween.kill()

	_tween = create_tween()
	_tween.set_parallel(true)

	# Float up
	var start_pos := position
	var end_pos := start_pos - Vector2(0, float_distance)
	_tween.tween_property(self, "position", end_pos, duration).set_ease(Tween.EASE_OUT)

	# Fade out (start fading at 60% through)
	_tween.tween_property(self, "modulate:a", 0.0, duration * 0.4).set_delay(duration * 0.6)

	# Scale up slightly at start for impact
	scale = Vector2(0.5, 0.5)
	_tween.tween_property(self, "scale", Vector2(1.0, 1.0), duration * 0.2).set_ease(Tween.EASE_OUT)

	# Remove self when animation completes
	_tween.chain().tween_callback(queue_free)

## Static helper to spawn a damage popup at a position
static func spawn_at(parent: Node, world_position: Vector2, amount: int, is_crit: bool = false) -> DamagePopup:
	var popup := DamagePopup.new()
	parent.add_child(popup)
	popup.global_position = world_position
	popup.show_damage(amount, is_crit)
	return popup

## Static helper to spawn a healing popup at a position
static func spawn_healing_at(parent: Node, world_position: Vector2, amount: int) -> DamagePopup:
	var popup := DamagePopup.new()
	parent.add_child(popup)
	popup.global_position = world_position
	popup.show_healing(amount)
	return popup
