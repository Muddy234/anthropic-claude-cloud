class_name MeleeSlashEffect
extends Node2D
## AnimatedSprite2D-based melee slash visual with a three-phase state machine:
##   WINDUP  -> expanding circle telegraph (0.15 s)
##   SLASH   -> arc sprite sweep with particles (0.2 s)
##   FADE    -> alpha-out then queue_free (0.15 s)
##
## Usage:
##   var fx = MeleeSlashEffect.new()
##   add_child(fx)
##   fx.play_slash("sword", origin, direction, is_crit)

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

enum State { IDLE, WINDUP, SLASH, FADE }

const WINDUP_DURATION: float = 0.15
const SLASH_DURATION: float = 0.2
const FADE_DURATION: float = 0.15
const TOTAL_DURATION: float = WINDUP_DURATION + SLASH_DURATION + FADE_DURATION

const BASE_SLASH_SCALE: float = 1.0
const CRIT_SCALE_MULTIPLIER: float = 1.5
const WINDUP_CIRCLE_RADIUS: float = 12.0
const SLASH_ARC_LENGTH: float = 24.0

## Weapon type to visual tint. Falls back to white.
const WEAPON_TINTS: Dictionary = {
	"sword": Color(0.9, 0.9, 1.0, 1.0),
	"mace": Color(0.8, 0.75, 0.65, 1.0),
	"dagger": Color(0.85, 0.85, 0.95, 1.0),
	"polearm": Color(0.75, 0.8, 0.75, 1.0),
	"staff": Color(0.7, 0.5, 1.0, 1.0),
	"bow": Color(0.9, 0.8, 0.6, 1.0),
}

## Element colors for tinting (same mapping as AbilityEffectsData).
const ELEMENT_TINTS: Dictionary = {
	"fire": Color(1.0, 0.5, 0.15, 1.0),
	"ice": Color(0.4, 0.8, 1.0, 1.0),
	"earth": Color(0.65, 0.5, 0.25, 1.0),
	"nature": Color(0.3, 0.85, 0.35, 1.0),
	"death": Color(0.5, 0.15, 0.55, 1.0),
	"holy": Color(1.0, 0.95, 0.6, 1.0),
	"shadow": Color(0.35, 0.1, 0.5, 1.0),
	"lightning": Color(1.0, 1.0, 0.3, 1.0),
	"poison": Color(0.4, 0.8, 0.1, 1.0),
	"arcane": Color(0.7, 0.3, 1.0, 1.0),
}

# ---------------------------------------------------------------------------
# Child nodes -- created in _ready()
# ---------------------------------------------------------------------------

var _windup_circle: Node2D = null
var _slash_sprite: AnimatedSprite2D = null
var _particles: GPUParticles2D = null

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

var _state: int = State.IDLE
var _state_timer: float = 0.0
var _weapon_type: String = ""
var _origin: Vector2 = Vector2.ZERO
var _direction: Vector2 = Vector2.RIGHT
var _is_crit: bool = false
var _scale_mult: float = 1.0
var _tint: Color = Color.WHITE
var _element_color: Color = Color.WHITE


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

func _ready() -> void:
	# Windup circle -- custom draw expanding ring
	_windup_circle = Node2D.new()
	_windup_circle.visible = false
	_windup_circle.z_index = 1
	add_child(_windup_circle)
	_windup_circle.set_script(_create_windup_draw_script())

	# Slash arc sprite
	_slash_sprite = AnimatedSprite2D.new()
	_slash_sprite.visible = false
	_slash_sprite.z_index = 2
	add_child(_slash_sprite)

	# Particles (sparks along blade)
	_particles = GPUParticles2D.new()
	_particles.emitting = false
	_particles.one_shot = true
	_particles.amount = 8
	_particles.lifetime = 0.25
	_particles.explosiveness = 0.8
	_particles.z_index = 3
	var mat := ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_POINT
	mat.direction = Vector3(0.0, -1.0, 0.0)
	mat.spread = 90.0
	mat.initial_velocity_min = 40.0
	mat.initial_velocity_max = 80.0
	mat.gravity = Vector3.ZERO
	mat.scale_min = 1.0
	mat.scale_max = 2.0
	mat.color = Color(1.0, 0.9, 0.6, 1.0)
	_particles.process_material = mat
	add_child(_particles)


func _process(delta: float) -> void:
	if _state == State.IDLE:
		return

	_state_timer += delta

	match _state:
		State.WINDUP:
			_process_windup()
		State.SLASH:
			_process_slash()
		State.FADE:
			_process_fade()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Play the slash effect.
## [param weapon_type] e.g. "sword", "mace", "dagger"
## [param origin] world position of the attack source
## [param direction] normalized direction toward target
## [param is_crit] if true, slash is 1.5x larger with extra particles
## [param element] optional element string for color tint ("fire", "ice", etc.)
func play_slash(weapon_type: String, origin: Vector2, direction: Vector2, is_crit: bool, element: String = "") -> void:
	_weapon_type = weapon_type
	_origin = origin
	_direction = direction.normalized() if direction.length() > 0.0 else Vector2.RIGHT
	_is_crit = is_crit
	_scale_mult = CRIT_SCALE_MULTIPLIER if is_crit else BASE_SLASH_SCALE

	# Determine tint color.
	if not element.is_empty() and ELEMENT_TINTS.has(element):
		_tint = ELEMENT_TINTS[element]
		_element_color = _tint
	else:
		_tint = WEAPON_TINTS.get(weapon_type, Color.WHITE)
		_element_color = Color.WHITE

	global_position = origin
	rotation = _direction.angle()

	_enter_windup()


# ---------------------------------------------------------------------------
# State transitions
# ---------------------------------------------------------------------------

func _enter_windup() -> void:
	_state = State.WINDUP
	_state_timer = 0.0
	_windup_circle.visible = true
	_windup_circle.modulate = Color(_tint.r, _tint.g, _tint.b, 0.0)
	_slash_sprite.visible = false


func _process_windup() -> void:
	var t: float = clampf(_state_timer / WINDUP_DURATION, 0.0, 1.0)
	# Expand circle from 0 -> 1 scale and fade in alpha 0 -> 0.5
	_windup_circle.scale = Vector2.ONE * t * _scale_mult
	_windup_circle.modulate.a = t * 0.5
	_windup_circle.queue_redraw()

	if _state_timer >= WINDUP_DURATION:
		_enter_slash()


func _enter_slash() -> void:
	_state = State.SLASH
	_state_timer = 0.0
	_windup_circle.visible = false

	# Show slash arc sprite
	_slash_sprite.visible = true
	_slash_sprite.modulate = _tint
	_slash_sprite.scale = Vector2.ONE * _scale_mult

	# Emit particles along the blade.
	_particles.emitting = true
	var p_mat: ParticleProcessMaterial = _particles.process_material
	p_mat.color = _element_color
	if _is_crit:
		_particles.amount = 16
		p_mat.initial_velocity_max = 120.0
	else:
		_particles.amount = 8
		p_mat.initial_velocity_max = 80.0


func _process_slash() -> void:
	var t: float = clampf(_state_timer / SLASH_DURATION, 0.0, 1.0)
	# Sweep rotation during slash phase (45 degree arc sweep).
	var sweep_angle: float = deg_to_rad(-22.5 + 45.0 * t)
	_slash_sprite.rotation = sweep_angle

	if _state_timer >= SLASH_DURATION:
		_enter_fade()


func _enter_fade() -> void:
	_state = State.FADE
	_state_timer = 0.0
	_particles.emitting = false


func _process_fade() -> void:
	var t: float = clampf(_state_timer / FADE_DURATION, 0.0, 1.0)
	_slash_sprite.modulate.a = 1.0 - t
	_windup_circle.modulate.a = 0.0

	if _state_timer >= FADE_DURATION:
		_state = State.IDLE
		queue_free()


# ---------------------------------------------------------------------------
# Helper: inline draw script for the windup indicator circle
# ---------------------------------------------------------------------------

## Returns a GDScript that draws an expanding circle indicator.
## Attached to the windup_circle Node2D at runtime.
func _create_windup_draw_script() -> GDScript:
	# We use _draw() on the child node to paint a ring.
	# The parent MeleeSlashEffect controls scale and alpha via modulate.
	var script := GDScript.new()
	script.source_code = """extends Node2D

const RADIUS: float = 12.0
const RING_WIDTH: float = 1.5

func _draw() -> void:
	draw_arc(Vector2.ZERO, RADIUS, 0.0, TAU, 32, Color.WHITE, RING_WIDTH)
"""
	script.reload()
	return script
