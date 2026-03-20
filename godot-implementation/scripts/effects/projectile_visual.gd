class_name ProjectileVisual
extends Node2D
## Visual component for projectiles: a tinted sprite with a fading Line2D
## motion trail. Attach as a child of the projectile node managed by
## ProjectileManager. Call set_projectile_type() once, then let _process()
## handle trail updates and sprite rotation.
##
## Usage:
##   var visual = ProjectileVisual.new()
##   projectile_node.add_child(visual)
##   visual.set_projectile_type("arrow", "fire")

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

const MAX_TRAIL_POINTS: int = 10
const TRAIL_WIDTH: float = 2.0
const SPRITE_SIZE: float = 8.0

## Per-type base color when no element override is given.
const TYPE_COLORS: Dictionary = {
	"arrow": Color(0.85, 0.75, 0.55, 1.0),
	"bolt": Color(0.6, 0.7, 0.9, 1.0),
	"orb": Color(0.7, 0.3, 1.0, 1.0),
	"fireball": Color(1.0, 0.5, 0.1, 1.0),
	"icebolt": Color(0.4, 0.8, 1.0, 1.0),
	"web": Color(0.9, 0.9, 0.9, 0.8),
	"rock": Color(0.55, 0.45, 0.3, 1.0),
	"dart": Color(0.4, 0.8, 0.1, 1.0),
}

## Element -> color used for tinting and trail when element is provided.
const ELEMENT_COLORS: Dictionary = {
	"fire": Color(1.0, 0.5, 0.1, 1.0),
	"ice": Color(0.4, 0.8, 1.0, 1.0),
	"water": Color(0.2, 0.5, 1.0, 1.0),
	"earth": Color(0.6, 0.45, 0.2, 1.0),
	"nature": Color(0.3, 0.85, 0.3, 1.0),
	"death": Color(0.5, 0.1, 0.5, 1.0),
	"arcane": Color(0.7, 0.3, 1.0, 1.0),
	"dark": Color(0.3, 0.0, 0.4, 1.0),
	"holy": Color(1.0, 0.95, 0.6, 1.0),
	"poison": Color(0.4, 0.8, 0.1, 1.0),
	"lightning": Color(1.0, 1.0, 0.3, 1.0),
	"shadow": Color(0.35, 0.1, 0.5, 1.0),
	"physical": Color(0.9, 0.9, 0.9, 1.0),
	"none": Color(1.0, 1.0, 1.0, 1.0),
}

# ---------------------------------------------------------------------------
# Child nodes
# ---------------------------------------------------------------------------

var _sprite: Sprite2D = null
var _trail: Line2D = null
var _impact_particles: GPUParticles2D = null

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

var _projectile_type: String = ""
var _element: String = ""
var _base_color: Color = Color.WHITE
var _trail_positions: PackedVector2Array = PackedVector2Array()
var _previous_global_pos: Vector2 = Vector2.ZERO
var _initialized: bool = false


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

func _ready() -> void:
	# -- Sprite (simple colored rectangle stand-in; swap for real texture) --
	_sprite = Sprite2D.new()
	_sprite.z_index = 1
	add_child(_sprite)

	# -- Trail (Line2D with fading width/alpha) --
	_trail = Line2D.new()
	_trail.width = TRAIL_WIDTH
	_trail.default_color = Color.WHITE
	_trail.z_index = 0
	_trail.begin_cap_mode = Line2D.LINE_CAP_ROUND
	_trail.end_cap_mode = Line2D.LINE_CAP_ROUND
	# Width curve: thick at head, thin at tail.
	var curve := Curve.new()
	curve.add_point(Vector2(0.0, 1.0))  # Newest point = full width.
	curve.add_point(Vector2(1.0, 0.0))  # Oldest point = zero width.
	_trail.width_curve = curve
	add_child(_trail)

	# -- Impact particles (dormant until on_impact()) --
	_impact_particles = GPUParticles2D.new()
	_impact_particles.emitting = false
	_impact_particles.one_shot = true
	_impact_particles.amount = 10
	_impact_particles.lifetime = 0.3
	_impact_particles.explosiveness = 0.9
	_impact_particles.z_index = 2
	var mat := ParticleProcessMaterial.new()
	mat.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_POINT
	mat.direction = Vector3(0.0, -1.0, 0.0)
	mat.spread = 180.0
	mat.initial_velocity_min = 30.0
	mat.initial_velocity_max = 70.0
	mat.gravity = Vector3(0.0, 40.0, 0.0)
	mat.scale_min = 1.0
	mat.scale_max = 2.5
	mat.color = Color.WHITE
	_impact_particles.process_material = mat
	add_child(_impact_particles)


func _process(_delta: float) -> void:
	if not _initialized:
		return

	_update_trail()
	_update_sprite_rotation()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Configure the visual for a given projectile + element combination.
## Call once after adding this node to the scene tree.
func set_projectile_type(type: String, element: String = "") -> void:
	_projectile_type = type
	_element = element.to_lower()

	# Determine base color: element overrides type default.
	if not _element.is_empty() and ELEMENT_COLORS.has(_element):
		_base_color = ELEMENT_COLORS[_element]
	else:
		_base_color = TYPE_COLORS.get(type, Color.WHITE)

	# Apply color to sprite.
	_sprite.modulate = _base_color

	# Apply gradient to trail.
	var gradient := Gradient.new()
	gradient.colors = PackedColorArray([
		_base_color,
		Color(_base_color.r, _base_color.g, _base_color.b, 0.0),
	])
	gradient.offsets = PackedFloat32Array([0.0, 1.0])
	_trail.gradient = gradient

	# Impact particle color.
	var p_mat: ParticleProcessMaterial = _impact_particles.process_material
	p_mat.color = _base_color

	_previous_global_pos = global_position
	_trail_positions.clear()
	_initialized = true


## Call when the projectile hits something. Spawns impact particles and
## frees the trail. The caller is responsible for queue_free-ing this node
## (or its parent) after the impact particles finish.
func on_impact() -> void:
	_initialized = false

	# Hide sprite and trail immediately.
	_sprite.visible = false
	_trail.visible = false

	# Play impact particles.
	_impact_particles.global_position = global_position
	_impact_particles.emitting = true
	_impact_particles.finished.connect(_on_impact_particles_finished, CONNECT_ONE_SHOT)


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _update_trail() -> void:
	# Record current global position as a new trail point (in local space
	# of the trail's parent, which is this Node2D -- but the trail needs
	# world-space points to look correct while the projectile moves).
	# We store positions in global space and convert for Line2D.

	var current_pos: Vector2 = global_position
	if current_pos.distance_squared_to(_previous_global_pos) > 1.0:
		_trail_positions.insert(0, current_pos)
		_previous_global_pos = current_pos

	# Cap the trail length.
	while _trail_positions.size() > MAX_TRAIL_POINTS:
		_trail_positions.remove_at(_trail_positions.size() - 1)

	# Convert global positions to local positions for Line2D rendering.
	_trail.clear_points()
	for i in range(_trail_positions.size()):
		_trail.add_point(to_local(_trail_positions[i]))


func _update_sprite_rotation() -> void:
	# Rotate sprite to face the current movement direction.
	if _trail_positions.size() >= 2:
		var dir: Vector2 = _trail_positions[0] - _trail_positions[1]
		if dir.length_squared() > 0.0:
			_sprite.rotation = dir.angle()
	elif get_parent() and "velocity" in get_parent():
		var vel: Vector2 = get_parent().velocity
		if vel.length_squared() > 0.0:
			_sprite.rotation = vel.angle()


func _on_impact_particles_finished() -> void:
	queue_free()
