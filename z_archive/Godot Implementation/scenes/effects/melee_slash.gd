class_name MeleeSlash
extends Node2D

## Melee attack visual effect

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var audio: AudioStreamPlayer2D = $AudioStreamPlayer2D

var direction: Vector2 = Vector2.RIGHT

func _ready():
	# Rotate to face attack direction
	rotation = direction.angle()

	# Play animation
	if sprite:
		sprite.play("slash")
		sprite.animation_finished.connect(_on_animation_finished)
	else:
		# Fallback if no animated sprite
		var tween := create_tween()
		tween.tween_property(self, "modulate:a", 0.0, 0.2)
		tween.tween_callback(queue_free)

func _on_animation_finished():
	queue_free()

## Setup the slash effect
func setup(dir: Vector2, attack_color: Color = Color.WHITE):
	direction = dir.normalized()
	modulate = attack_color

## Create a slash effect at a position
static func create(pos: Vector2, dir: Vector2, color: Color = Color.WHITE) -> MeleeSlash:
	var scene := preload("res://scenes/effects/melee_slash.tscn")
	var slash: MeleeSlash = scene.instantiate()
	slash.position = pos
	slash.setup(dir, color)
	return slash
