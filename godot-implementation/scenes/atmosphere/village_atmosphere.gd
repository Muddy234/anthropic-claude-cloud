class_name VillageAtmosphere
extends Node2D
## Manages village atmosphere visual effects based on world state.
## Controls ashfall particles, ember particles, smoke overlay, and screen tint.
##
## World States:
##   1 (Normal):  All effects off
##   2 (Ash):     Ashfall particles on
##   3 (Burning): Embers + smoke overlay + orange tint
##   4 (Endgame): Embers + smoke overlay + purple tint

# --- Child node references ---
var _ashfall_particles: GPUParticles2D = null
var _ember_particles: GPUParticles2D = null
var _smoke_overlay: ColorRect = null
var _screen_tint: ColorRect = null

# --- Tint Colors ---
const TINT_NONE := Color(0.0, 0.0, 0.0, 0.0)
const TINT_ORANGE := Color(1.0, 0.5, 0.1, 0.12)
const TINT_PURPLE := Color(0.5, 0.1, 0.8, 0.15)

# --- State ---
var _current_state: int = 1
var _tween: Tween = null
const TRANSITION_DURATION := 2.0


func _ready() -> void:
	_create_ashfall_particles()
	_create_ember_particles()
	_create_smoke_overlay()
	_create_screen_tint()
	set_world_state(1)


## Set the village world state (1-4) and update all atmosphere effects.
func set_world_state(state: int) -> void:
	state = clampi(state, 1, 4)
	if state == _current_state and _ashfall_particles != null:
		return
	_current_state = state

	if _tween and _tween.is_valid():
		_tween.kill()
	_tween = create_tween()
	_tween.set_parallel(true)

	match state:
		1:
			# Normal: all off
			_ashfall_particles.emitting = false
			_ember_particles.emitting = false
			_tween.tween_property(_smoke_overlay, "color:a", 0.0, TRANSITION_DURATION)
			_tween.tween_property(_screen_tint, "color", TINT_NONE, TRANSITION_DURATION)

		2:
			# Ash: ashfall only
			_ashfall_particles.emitting = true
			_ember_particles.emitting = false
			_tween.tween_property(_smoke_overlay, "color:a", 0.0, TRANSITION_DURATION)
			_tween.tween_property(_screen_tint, "color", TINT_NONE, TRANSITION_DURATION)

		3:
			# Burning: embers + smoke + orange tint
			_ashfall_particles.emitting = false
			_ember_particles.emitting = true
			_tween.tween_property(_smoke_overlay, "color:a", 0.08, TRANSITION_DURATION)
			_tween.tween_property(_screen_tint, "color", TINT_ORANGE, TRANSITION_DURATION)

		4:
			# Endgame: embers + smoke + purple tint
			_ashfall_particles.emitting = false
			_ember_particles.emitting = true
			_tween.tween_property(_smoke_overlay, "color:a", 0.1, TRANSITION_DURATION)
			_tween.tween_property(_screen_tint, "color", TINT_PURPLE, TRANSITION_DURATION)


func get_world_state() -> int:
	return _current_state


# --- Particle Creation ---

func _create_ashfall_particles() -> void:
	_ashfall_particles = GPUParticles2D.new()
	_ashfall_particles.name = "AshfallParticles"
	_ashfall_particles.emitting = false
	_ashfall_particles.amount = 60
	_ashfall_particles.lifetime = 6.0
	_ashfall_particles.z_index = 50

	var material := ParticleProcessMaterial.new()
	material.direction = Vector3(0.2, 1.0, 0.0)
	material.spread = 30.0
	material.initial_velocity_min = 10.0
	material.initial_velocity_max = 25.0
	material.gravity = Vector3(0.0, 8.0, 0.0)
	material.angular_velocity_min = -30.0
	material.angular_velocity_max = 30.0
	material.scale_min = 0.5
	material.scale_max = 1.5
	material.color = Color(0.6, 0.55, 0.5, 0.6)

	# Emission shape covers screen width
	material.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	material.emission_box_extents = Vector3(200.0, 5.0, 0.0)

	_ashfall_particles.process_material = material
	_ashfall_particles.position = Vector2(160, -20)
	add_child(_ashfall_particles)


func _create_ember_particles() -> void:
	_ember_particles = GPUParticles2D.new()
	_ember_particles.name = "EmberParticles"
	_ember_particles.emitting = false
	_ember_particles.amount = 40
	_ember_particles.lifetime = 4.0
	_ember_particles.z_index = 51

	var material := ParticleProcessMaterial.new()
	material.direction = Vector3(0.3, -1.0, 0.0)
	material.spread = 45.0
	material.initial_velocity_min = 15.0
	material.initial_velocity_max = 40.0
	material.gravity = Vector3(0.0, -5.0, 0.0)
	material.scale_min = 0.3
	material.scale_max = 1.0

	# Orange-red color gradient for embers
	var color_ramp := Gradient.new()
	color_ramp.set_color(0, Color(1.0, 0.6, 0.1, 1.0))
	color_ramp.set_color(1, Color(1.0, 0.2, 0.0, 0.0))
	var color_ramp_tex := GradientTexture1D.new()
	color_ramp_tex.gradient = color_ramp
	material.color_ramp = color_ramp_tex

	# Emission from bottom of screen
	material.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	material.emission_box_extents = Vector3(200.0, 5.0, 0.0)

	_ember_particles.process_material = material
	_ember_particles.position = Vector2(160, 260)
	add_child(_ember_particles)


func _create_smoke_overlay() -> void:
	_smoke_overlay = ColorRect.new()
	_smoke_overlay.name = "SmokeOverlay"
	_smoke_overlay.color = Color(0.2, 0.15, 0.1, 0.0)
	_smoke_overlay.size = Vector2(320, 240)
	_smoke_overlay.position = Vector2.ZERO
	_smoke_overlay.z_index = 49
	_smoke_overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_smoke_overlay)


func _create_screen_tint() -> void:
	_screen_tint = ColorRect.new()
	_screen_tint.name = "ScreenTint"
	_screen_tint.color = TINT_NONE
	_screen_tint.size = Vector2(320, 240)
	_screen_tint.position = Vector2.ZERO
	_screen_tint.z_index = 52
	_screen_tint.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_screen_tint)
