class_name MonsterMagicEffect
extends Node2D
## Visual effect for monster spell / magic attacks.
## Spawns an element-colored burst at the impact point with per-element
## particle style, optional screen flash, and auto queue_free on completion.
##
## Usage:
##   var fx = MonsterMagicEffect.new()
##   add_child(fx)
##   fx.play_effect("fire", impact_pos, 24.0)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

const BASE_DURATION: float = 0.6
const FLASH_DURATION: float = 0.1
const PARTICLE_COUNT: int = 16
const BURST_SCALE: float = 1.0

## Per-element visual configuration.
## color       - primary tint
## color_end   - gradient end / fade color
## particle_type - descriptive label for particle shape (informational)
## screen_flash - whether to trigger a brief canvas modulate flash
## gravity      - particle gravity override
const ELEMENT_CONFIGS: Dictionary = {
	"fire": {
		"color": Color(1.0, 0.5, 0.1, 1.0),
		"color_end": Color(0.8, 0.15, 0.0, 0.0),
		"particle_type": "embers",
		"screen_flash": true,
		"gravity": Vector3(0.0, -40.0, 0.0),
		"spread": 120.0,
		"velocity_min": 40.0,
		"velocity_max": 90.0,
	},
	"ice": {
		"color": Color(0.4, 0.8, 1.0, 1.0),
		"color_end": Color(0.7, 0.9, 1.0, 0.0),
		"particle_type": "crystal_shatter",
		"screen_flash": false,
		"gravity": Vector3(0.0, 60.0, 0.0),
		"spread": 180.0,
		"velocity_min": 30.0,
		"velocity_max": 70.0,
	},
	"earth": {
		"color": Color(0.6, 0.45, 0.2, 1.0),
		"color_end": Color(0.4, 0.3, 0.1, 0.0),
		"particle_type": "rocks",
		"screen_flash": false,
		"gravity": Vector3(0.0, 120.0, 0.0),
		"spread": 150.0,
		"velocity_min": 50.0,
		"velocity_max": 100.0,
	},
	"nature": {
		"color": Color(0.3, 0.85, 0.3, 1.0),
		"color_end": Color(0.15, 0.5, 0.15, 0.0),
		"particle_type": "leaves",
		"screen_flash": false,
		"gravity": Vector3(0.0, 15.0, 0.0),
		"spread": 180.0,
		"velocity_min": 20.0,
		"velocity_max": 50.0,
	},
	"death": {
		"color": Color(0.5, 0.1, 0.5, 1.0),
		"color_end": Color(0.25, 0.0, 0.25, 0.0),
		"particle_type": "wisps",
		"screen_flash": true,
		"gravity": Vector3(0.0, -20.0, 0.0),
		"spread": 180.0,
		"velocity_min": 15.0,
		"velocity_max": 40.0,
	},
	"shadow": {
		"color": Color(0.35, 0.1, 0.5, 1.0),
		"color_end": Color(0.15, 0.0, 0.2, 0.0),
		"particle_type": "tendrils",
		"screen_flash": true,
		"gravity": Vector3(0.0, -10.0, 0.0),
		"spread": 60.0,
		"velocity_min": 25.0,
		"velocity_max": 55.0,
	},
	"holy": {
		"color": Color(1.0, 0.95, 0.6, 1.0),
		"color_end": Color(1.0, 1.0, 0.8, 0.0),
		"particle_type": "radiance",
		"screen_flash": true,
		"gravity": Vector3(0.0, -30.0, 0.0),
		"spread": 180.0,
		"velocity_min": 30.0,
		"velocity_max": 60.0,
	},
	"lightning": {
		"color": Color(1.0, 1.0, 0.3, 1.0),
		"color_end": Color(0.8, 0.8, 0.1, 0.0),
		"particle_type": "sparks",
		"screen_flash": true,
		"gravity": Vector3(0.0, 0.0, 0.0),
		"spread": 180.0,
		"velocity_min": 80.0,
		"velocity_max": 150.0,
	},
	"arcane": {
		"color": Color(0.7, 0.3, 1.0, 1.0),
		"color_end": Color(0.4, 0.1, 0.6, 0.0),
		"particle_type": "sparks",
		"screen_flash": false,
		"gravity": Vector3(0.0, 0.0, 0.0),
		"spread": 180.0,
		"velocity_min": 40.0,
		"velocity_max": 80.0,
	},
	"poison": {
		"color": Color(0.4, 0.8, 0.1, 1.0),
		"color_end": Color(0.2, 0.4, 0.05, 0.0),
		"particle_type": "cloud",
		"screen_flash": false,
		"gravity": Vector3(0.0, -15.0, 0.0),
		"spread": 180.0,
		"velocity_min": 15.0,
		"velocity_max": 35.0,
	},
}

## Fallback for unknown elements.
const DEFAULT_CONFIG: Dictionary = {
	"color": Color(0.9, 0.9, 0.9, 1.0),
	"color_end": Color(0.5, 0.5, 0.5, 0.0),
	"particle_type": "generic",
	"screen_flash": false,
	"gravity": Vector3(0.0, 0.0, 0.0),
	"spread": 180.0,
	"velocity_min": 30.0,
	"velocity_max": 60.0,
}

# ---------------------------------------------------------------------------
# Child nodes
# ---------------------------------------------------------------------------

var _burst_particles: GPUParticles2D = null
var _burst_ring: Node2D = null  # Custom draw ring that expands
var _flash_rect: CanvasLayer = null  # Optional screen flash

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

var _element: String = ""
var _config: Dictionary = {}
var _radius: float = 24.0
var _timer: float = 0.0
var _duration: float = BASE_DURATION
var _is_playing: bool = false


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

func _ready() -> void:
	# Burst particles
	_burst_particles = GPUParticles2D.new()
	_burst_particles.emitting = false
	_burst_particles.one_shot = true
	_burst_particles.amount = PARTICLE_COUNT
	_burst_particles.lifetime = 0.5
	_burst_particles.explosiveness = 0.9
	_burst_particles.z_index = 2
	add_child(_burst_particles)

	# Burst ring (expanding circle)
	_burst_ring = Node2D.new()
	_burst_ring.visible = false
	_burst_ring.z_index = 1
	add_child(_burst_ring)


func _process(delta: float) -> void:
	if not _is_playing:
		return

	_timer += delta
	var t: float = clampf(_timer / _duration, 0.0, 1.0)

	# Expand ring and fade.
	if _burst_ring.visible:
		_burst_ring.scale = Vector2.ONE * (0.3 + 0.7 * t) * (_radius / 24.0)
		_burst_ring.modulate.a = 1.0 - t
		_burst_ring.queue_redraw()

	# Effect complete.
	if _timer >= _duration:
		_is_playing = false
		queue_free()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Play the magic effect burst.
## [param element] element string: "fire", "ice", "earth", etc.
## [param position] world-space impact position
## [param radius] effect radius in pixels
func play_effect(element: String, position: Vector2, radius: float = 24.0) -> void:
	_element = element.to_lower()
	_config = ELEMENT_CONFIGS.get(_element, DEFAULT_CONFIG)
	_radius = radius
	_timer = 0.0
	_duration = BASE_DURATION
	_is_playing = true

	global_position = position

	_setup_particles()
	_setup_ring()

	_burst_particles.emitting = true
	_burst_ring.visible = true

	if _config.get("screen_flash", false):
		_do_screen_flash()


# ---------------------------------------------------------------------------
# Internal setup
# ---------------------------------------------------------------------------

func _setup_particles() -> void:
	var mat := ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_SPHERE
	mat.emission_sphere_radius = _radius * 0.25
	mat.direction = Vector3(0.0, -1.0, 0.0)
	mat.spread = _config.get("spread", 180.0)
	mat.initial_velocity_min = _config.get("velocity_min", 30.0)
	mat.initial_velocity_max = _config.get("velocity_max", 60.0)
	mat.gravity = _config.get("gravity", Vector3.ZERO)
	mat.scale_min = 1.5
	mat.scale_max = 3.5
	mat.color = _config.get("color", Color.WHITE)

	# Build color ramp.
	var gradient := Gradient.new()
	var c_start: Color = _config.get("color", Color.WHITE)
	var c_end: Color = _config.get("color_end", Color(1, 1, 1, 0))
	gradient.colors = PackedColorArray([c_start, c_end])
	gradient.offsets = PackedFloat32Array([0.0, 1.0])
	var tex := GradientTexture1D.new()
	tex.gradient = gradient
	mat.color_ramp = tex

	_burst_particles.process_material = mat
	_burst_particles.amount = PARTICLE_COUNT
	_burst_particles.lifetime = _duration * 0.8


func _setup_ring() -> void:
	# Attach a draw script for the expanding ring.
	if not _burst_ring.has_method("_draw"):
		var script := GDScript.new()
		script.source_code = """extends Node2D

var ring_color: Color = Color.WHITE
var ring_radius: float = 24.0
var ring_width: float = 2.0

func _draw() -> void:
	draw_arc(Vector2.ZERO, ring_radius, 0.0, TAU, 48, ring_color, ring_width)
"""
		script.reload()
		_burst_ring.set_script(script)

	_burst_ring.set("ring_color", _config.get("color", Color.WHITE))
	_burst_ring.set("ring_radius", _radius)
	_burst_ring.set("ring_width", 2.5)
	_burst_ring.scale = Vector2.ONE * 0.3
	_burst_ring.modulate = _config.get("color", Color.WHITE)


func _do_screen_flash() -> void:
	# Brief screen flash using a CanvasLayer + ColorRect.
	var layer := CanvasLayer.new()
	layer.layer = 100
	add_child(layer)

	var rect := ColorRect.new()
	rect.color = Color(_config["color"].r, _config["color"].g, _config["color"].b, 0.15)
	rect.set_anchors_preset(Control.PRESET_FULL_RECT)
	rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	layer.add_child(rect)

	var tween := create_tween()
	tween.tween_property(rect, "color:a", 0.0, FLASH_DURATION)
	tween.tween_callback(layer.queue_free)
