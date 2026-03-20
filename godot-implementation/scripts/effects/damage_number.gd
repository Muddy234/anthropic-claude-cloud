class_name DamageNumber
extends Node2D

var velocity := Vector2(0, -60)
var gravity := 120.0
var lifetime := 0.8
var elapsed := 0.0

@onready var label: Label = $Label

func setup(amount: int, is_crit: bool = false, is_heal: bool = false) -> void:
	label.text = str(amount)
	if is_heal:
		label.modulate = Color(0.27, 1.0, 0.27)  # green
		label.text = "+" + label.text
	elif is_crit:
		label.modulate = Color(1.0, 0.84, 0.0)  # gold
		label.text = str(amount) + "!"
		label.add_theme_font_size_override("font_size", 16)
		scale = Vector2(1.3, 1.3)
	else:
		label.modulate = Color(1.0, 0.27, 0.27)  # red

	# Random horizontal spread
	velocity.x = randf_range(-30, 30)

func _process(delta: float) -> void:
	elapsed += delta
	velocity.y += gravity * delta
	position += velocity * delta

	var progress := elapsed / lifetime
	modulate.a = 1.0 - ease(progress, 2.0)

	if elapsed >= lifetime:
		queue_free()
