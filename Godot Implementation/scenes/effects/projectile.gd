class_name Projectile
extends Node2D

## Projectile effect for ranged attacks and spells

signal hit(target)
signal expired

@onready var sprite: Sprite2D = $Sprite2D
@onready var trail: GPUParticles2D = $Trail

var velocity: Vector2 = Vector2.ZERO
var speed: float = 300.0
var max_distance: float = 500.0
var damage: int = 0
var source: Node2D
var target_pos: Vector2
var pierce_count: int = 0
var homing: bool = false
var homing_strength: float = 5.0

var distance_traveled: float = 0.0
var hit_targets: Array = []

func _ready():
	# Calculate initial velocity toward target
	var direction := (target_pos - position).normalized()
	velocity = direction * speed
	rotation = direction.angle()

func _process(delta: float):
	# Homing behavior
	if homing and is_instance_valid(source):
		var to_target := (target_pos - position).normalized()
		velocity = velocity.lerp(to_target * speed, homing_strength * delta)
		rotation = velocity.angle()

	# Move projectile
	var move := velocity * delta
	position += move
	distance_traveled += move.length()

	# Check max distance
	if distance_traveled >= max_distance:
		_expire()

func _on_area_entered(area: Area2D):
	var target := area.get_parent()
	if target == source:
		return
	if target in hit_targets:
		return

	hit_targets.append(target)
	hit.emit(target)

	if pierce_count > 0:
		pierce_count -= 1
	else:
		_expire()

func _expire():
	expired.emit()

	# Fade out effect
	var tween := create_tween()
	tween.tween_property(self, "modulate:a", 0.0, 0.2)
	tween.tween_callback(queue_free)

## Setup the projectile
func setup(from: Node2D, to: Vector2, proj_damage: int, proj_speed: float = 300.0):
	source = from
	target_pos = to
	damage = proj_damage
	speed = proj_speed

## Set projectile to pierce through enemies
func set_pierce(count: int):
	pierce_count = count

## Enable homing behavior
func set_homing(strength: float = 5.0):
	homing = true
	homing_strength = strength

## Set custom color/appearance
func set_color(color: Color):
	modulate = color
	if trail:
		trail.modulate = color
