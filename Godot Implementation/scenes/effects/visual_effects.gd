class_name VisualEffects
extends Node

## Manages visual effects like screen shake, flashes, and particles

static var instance: VisualEffects

# Screen shake
var shake_intensity: float = 0.0
var shake_duration: float = 0.0
var shake_decay: float = 5.0

# Screen flash
var flash_color: Color = Color.WHITE
var flash_intensity: float = 0.0
var flash_duration: float = 0.0

# Camera reference
var camera: Camera2D

# Effects container
var effects_container: Node2D

func _ready():
	instance = self
	process_mode = Node.PROCESS_MODE_ALWAYS

func _process(delta: float):
	# Update screen shake
	if shake_duration > 0:
		shake_duration -= delta
		var offset := Vector2(
			randf_range(-shake_intensity, shake_intensity),
			randf_range(-shake_intensity, shake_intensity)
		)
		if camera:
			camera.offset = offset
	else:
		if camera:
			camera.offset = Vector2.ZERO
		shake_intensity = 0

	# Update screen flash
	if flash_duration > 0:
		flash_duration -= delta
		flash_intensity = flash_duration / 0.2  # Fade over 0.2s

## Trigger screen shake
static func shake(intensity: float = 5.0, duration: float = 0.2):
	if instance:
		instance.shake_intensity = intensity
		instance.shake_duration = duration

## Trigger damage flash (red vignette)
static func damage_flash(intensity: float = 0.3, duration: float = 0.2):
	if instance:
		instance.flash_color = Color(1.0, 0.2, 0.2, intensity)
		instance.flash_intensity = intensity
		instance.flash_duration = duration

## Trigger heal flash (green)
static func heal_flash(intensity: float = 0.2, duration: float = 0.3):
	if instance:
		instance.flash_color = Color(0.2, 1.0, 0.3, intensity)
		instance.flash_intensity = intensity
		instance.flash_duration = duration

## Create a melee slash effect
static func create_slash(pos: Vector2, direction: Vector2, options: Dictionary = {}):
	var slash_scene := preload("res://scenes/effects/melee_slash.tscn")
	var slash = slash_scene.instantiate()
	slash.position = pos
	slash.rotation = direction.angle()

	if options.has("color"):
		slash.modulate = options.color
	if options.has("scale"):
		slash.scale = Vector2(options.scale, options.scale)

	if instance and instance.effects_container:
		instance.effects_container.add_child(slash)

	return slash

## Create hit particles
static func create_hit_particles(pos: Vector2, color: Color = Color.WHITE, count: int = 8):
	for i in count:
		var particle := _create_simple_particle(pos, color)
		if instance and instance.effects_container:
			instance.effects_container.add_child(particle)

## Create a simple particle
static func _create_simple_particle(pos: Vector2, color: Color) -> Node2D:
	var particle := Node2D.new()
	particle.position = pos

	# Add script for particle behavior
	var script := GDScript.new()
	script.source_code = """
extends Node2D

var velocity: Vector2
var lifetime: float = 0.5
var color: Color

func _ready():
	velocity = Vector2(randf_range(-100, 100), randf_range(-100, 50))

func _process(delta):
	position += velocity * delta
	velocity.y += 300 * delta
	lifetime -= delta
	modulate.a = lifetime / 0.5
	if lifetime <= 0:
		queue_free()

func _draw():
	draw_circle(Vector2.ZERO, 2, color)
"""
	particle.set_script(script)
	particle.set("color", color)

	return particle

## Create a status effect visual (floating icon)
static func create_status_icon(entity: Node2D, effect_id: String, is_buff: bool):
	# TODO: Implement floating status icons above entities
	pass

## Create a projectile effect
static func create_projectile(from: Vector2, to: Vector2, options: Dictionary = {}):
	var projectile_scene := preload("res://scenes/effects/projectile.tscn")
	var projectile = projectile_scene.instantiate()
	projectile.position = from
	projectile.setup(to, options)

	if instance and instance.effects_container:
		instance.effects_container.add_child(projectile)

	return projectile

## Flash an entity (hit feedback)
static func flash_entity(entity: Node2D, color: Color = Color(1.5, 0.5, 0.5), duration: float = 0.1):
	if not entity:
		return

	var original_modulate := entity.modulate
	entity.modulate = color

	# Create timer to reset
	var timer := entity.get_tree().create_timer(duration)
	timer.timeout.connect(func(): entity.modulate = original_modulate)

## Create floating text (for any message)
static func create_floating_text(pos: Vector2, text: String, color: Color = Color.WHITE):
	var label := Label.new()
	label.text = text
	label.add_theme_color_override("font_color", color)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

	var container := Node2D.new()
	container.position = pos
	container.add_child(label)

	# Add floating behavior
	var tween := container.create_tween()
	tween.tween_property(container, "position:y", pos.y - 30, 0.8)
	tween.parallel().tween_property(container, "modulate:a", 0.0, 0.8)
	tween.tween_callback(container.queue_free)

	if instance and instance.effects_container:
		instance.effects_container.add_child(container)

	return container
