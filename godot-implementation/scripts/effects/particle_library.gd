class_name ParticleLibrary
extends Node
## Pool manager for GPUParticles2D effects.
## Preloads particle configurations for 8 types, manages a recycling pool
## of up to MAX_POOL_SIZE active particle nodes to prevent runaway allocation.

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

const MAX_POOL_SIZE: int = 50
const TILE_SIZE: int = Constants.BASE_TILE_SIZE

## Pre-loaded particle scene paths (one scene per type when available).
## If the scene file does not exist at runtime the library falls back to
## programmatic GPUParticles2D construction using PARTICLE_CONFIGS.
const PARTICLE_SCENE_PATHS: Dictionary = {
	"fire_trail": "res://scenes/effects/particles/fire_trail.tscn",
	"blood_splatter": "res://scenes/effects/particles/blood_splatter.tscn",
	"magic_sparks": "res://scenes/effects/particles/magic_sparks.tscn",
	"loot_shimmer": "res://scenes/effects/particles/loot_shimmer.tscn",
	"heal_glow": "res://scenes/effects/particles/heal_glow.tscn",
	"death_poof": "res://scenes/effects/particles/death_poof.tscn",
	"ashfall": "res://scenes/effects/particles/ashfall.tscn",
	"fireflies": "res://scenes/effects/particles/fireflies.tscn",
}

## Per-type default configurations used when building particles at runtime.
const PARTICLE_CONFIGS: Dictionary = {
	"fire_trail": {
		"amount": 30,
		"lifetime": 0.6,
		"one_shot": false,
		"explosiveness": 0.0,
		"direction": Vector3(0.0, -1.0, 0.0),
		"spread": 25.0,
		"velocity_min": 20.0,
		"velocity_max": 40.0,
		"gravity": Vector3(0.0, -30.0, 0.0),
		"scale_min": 2.0,
		"scale_max": 4.0,
		"color": Color(1.0, 0.4, 0.0, 1.0),
		"color_ramp": [Color(1.0, 0.6, 0.0, 1.0), Color(0.8, 0.15, 0.0, 0.8), Color(0.3, 0.05, 0.0, 0.0)],
		"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_POINT,
	},
	"blood_splatter": {
		"amount": 12,
		"lifetime": 0.5,
		"one_shot": true,
		"explosiveness": 0.9,
		"direction": Vector3(0.0, -0.5, 0.0),
		"spread": 180.0,
		"velocity_min": 30.0,
		"velocity_max": 60.0,
		"gravity": Vector3(0.0, 100.0, 0.0),
		"scale_min": 1.5,
		"scale_max": 3.0,
		"color": Color(0.7, 0.1, 0.1, 1.0),
		"color_ramp": [Color(0.8, 0.1, 0.1, 1.0), Color(0.5, 0.05, 0.05, 0.6), Color(0.3, 0.0, 0.0, 0.0)],
		"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE,
		"emission_sphere_radius": 2.0,
	},
	"magic_sparks": {
		"amount": 20,
		"lifetime": 0.8,
		"one_shot": true,
		"explosiveness": 0.6,
		"direction": Vector3(0.0, -1.0, 0.0),
		"spread": 180.0,
		"velocity_min": 40.0,
		"velocity_max": 80.0,
		"gravity": Vector3(0.0, 0.0, 0.0),
		"scale_min": 1.0,
		"scale_max": 2.5,
		"color": Color(0.7, 0.3, 1.0, 1.0),
		"color_ramp": [Color(1.0, 1.0, 1.0, 1.0), Color(0.7, 0.3, 1.0, 0.8), Color(0.3, 0.1, 0.5, 0.0)],
		"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_POINT,
	},
	"loot_shimmer": {
		"amount": 8,
		"lifetime": 1.0,
		"one_shot": false,
		"explosiveness": 0.0,
		"direction": Vector3(0.0, -1.0, 0.0),
		"spread": 45.0,
		"velocity_min": 10.0,
		"velocity_max": 25.0,
		"gravity": Vector3(0.0, -10.0, 0.0),
		"scale_min": 1.0,
		"scale_max": 2.0,
		"color": Color(0.85, 0.7, 0.15, 1.0),
		"color_ramp": [Color(1.0, 0.9, 0.3, 1.0), Color(0.85, 0.65, 0.1, 0.7), Color(0.6, 0.4, 0.0, 0.0)],
		"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_POINT,
	},
	"heal_glow": {
		"amount": 15,
		"lifetime": 0.7,
		"one_shot": true,
		"explosiveness": 0.4,
		"direction": Vector3(0.0, -1.0, 0.0),
		"spread": 120.0,
		"velocity_min": 15.0,
		"velocity_max": 35.0,
		"gravity": Vector3(0.0, -20.0, 0.0),
		"scale_min": 1.5,
		"scale_max": 3.0,
		"color": Color(0.3, 0.9, 0.6, 1.0),
		"color_ramp": [Color(0.4, 1.0, 0.8, 1.0), Color(0.2, 0.8, 0.5, 0.6), Color(0.1, 0.4, 0.3, 0.0)],
		"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_POINT,
	},
	"death_poof": {
		"amount": 40,
		"lifetime": 0.5,
		"one_shot": true,
		"explosiveness": 0.95,
		"direction": Vector3(0.0, -1.0, 0.0),
		"spread": 180.0,
		"velocity_min": 30.0,
		"velocity_max": 70.0,
		"gravity": Vector3(0.0, 20.0, 0.0),
		"scale_min": 2.0,
		"scale_max": 5.0,
		"color": Color(0.5, 0.5, 0.5, 0.8),
		"color_ramp": [Color(0.6, 0.6, 0.6, 0.9), Color(0.4, 0.4, 0.4, 0.5), Color(0.2, 0.2, 0.2, 0.0)],
		"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_SPHERE,
		"emission_sphere_radius": 4.0,
	},
	"ashfall": {
		"amount": 100,
		"lifetime": 4.0,
		"one_shot": false,
		"explosiveness": 0.0,
		"direction": Vector3(0.2, 1.0, 0.0),
		"spread": 15.0,
		"velocity_min": 15.0,
		"velocity_max": 25.0,
		"gravity": Vector3(0.0, 5.0, 0.0),
		"scale_min": 1.0,
		"scale_max": 2.0,
		"color": Color(0.6, 0.6, 0.6, 0.4),
		"color_ramp": [Color(0.7, 0.7, 0.7, 0.5), Color(0.5, 0.5, 0.5, 0.3), Color(0.3, 0.3, 0.3, 0.0)],
		"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_BOX,
		"emission_box_extents": Vector3(640.0, 5.0, 0.0),
		"angular_velocity_min": -90.0,
		"angular_velocity_max": 90.0,
		"viewport_sized": true,
		"visibility_rect": Rect2(-640, -360, 1280, 720),
	},
	"fireflies": {
		"amount": 20,
		"lifetime": 3.0,
		"one_shot": false,
		"explosiveness": 0.0,
		"direction": Vector3(0.0, -0.2, 0.0),
		"spread": 180.0,
		"velocity_min": 5.0,
		"velocity_max": 15.0,
		"gravity": Vector3(0.0, 0.0, 0.0),
		"scale_min": 1.0,
		"scale_max": 2.0,
		"color": Color(0.9, 1.0, 0.3, 0.8),
		"color_ramp": [Color(0.9, 1.0, 0.4, 0.0), Color(0.9, 1.0, 0.3, 0.9), Color(0.9, 1.0, 0.3, 0.0)],
		"emission_shape": ParticleProcessMaterial.EMISSION_SHAPE_BOX,
		"emission_box_extents": Vector3(640.0, 360.0, 0.0),
		"viewport_sized": true,
		"visibility_rect": Rect2(-640, -360, 1280, 720),
	},
}

## Element-to-color mapping for spawn_element_particles().
const ELEMENT_PARTICLE_COLORS: Dictionary = {
	"fire": Color(1.0, 0.4, 0.1, 1.0),
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
# State
# ---------------------------------------------------------------------------

## Pool of active GPUParticles2D nodes tracked for recycling.
var _active_pool: Array[GPUParticles2D] = []

## Inactive particles waiting for reuse.
var _inactive_pool: Array[GPUParticles2D] = []

## Cached packed scenes (lazy-loaded).
var _scene_cache: Dictionary = {}  # type_name -> PackedScene or null

## Stats counters.
var _total_spawned: int = 0
var _total_recycled: int = 0


# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

func _ready() -> void:
	# Pre-warm a few generic particle nodes for the pool.
	for i in range(5):
		var p := _create_bare_particles()
		p.visible = false
		_inactive_pool.append(p)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Spawn particles of a given type at a world position.
## [param params] can override any PARTICLE_CONFIGS key, plus:
##   "parent"  - Node to parent particles under (default: World/Effects or self)
##   "color"   - Override base color
##   "amount"  - Override particle count
##   "scale"   - Uniform scale multiplier
func spawn_particles(type: String, position: Vector2, params: Dictionary = {}) -> GPUParticles2D:
	if _active_pool.size() >= MAX_POOL_SIZE:
		# Evict oldest one-shot that has finished, or the oldest overall.
		_evict_oldest()

	var config: Dictionary = PARTICLE_CONFIGS.get(type, {}).duplicate(true)
	if config.is_empty():
		push_warning("ParticleLibrary: Unknown particle type '%s'" % type)
		return null

	# Merge caller overrides.
	for key in params:
		if key != "parent":
			config[key] = params[key]

	var particles: GPUParticles2D = _acquire_particle_node()
	_configure_particle(particles, config)
	particles.global_position = position
	particles.emitting = true
	particles.visible = true

	# Parent to caller-specified node, or a sensible default.
	var parent_node: Node = params.get("parent", null)
	if parent_node == null:
		parent_node = _get_effects_parent()
	if particles.get_parent() != parent_node:
		if particles.get_parent():
			particles.get_parent().remove_child(particles)
		parent_node.add_child(particles)

	_active_pool.append(particles)
	_total_spawned += 1

	# One-shot particles auto-recycle when finished.
	if particles.one_shot:
		if not particles.finished.is_connected(_recycle_particle):
			particles.finished.connect(_recycle_particle.bind(particles), CONNECT_ONE_SHOT)

	return particles


## Convenience: spawn magic_sparks with element-appropriate color.
func spawn_element_particles(element: String, position: Vector2) -> GPUParticles2D:
	var color: Color = ELEMENT_PARTICLE_COLORS.get(element.to_lower(), ELEMENT_PARTICLE_COLORS["none"])
	return spawn_particles("magic_sparks", position, {"color": color})


## Get current pool utilization stats.
func get_pool_stats() -> Dictionary:
	return {
		"active": _active_pool.size(),
		"inactive": _inactive_pool.size(),
		"total_spawned": _total_spawned,
		"total_recycled": _total_recycled,
		"max_pool_size": MAX_POOL_SIZE,
	}


## Manually stop and recycle a particle that was returned from spawn_particles().
func recycle(particle: GPUParticles2D) -> void:
	_recycle_particle(particle)


# ---------------------------------------------------------------------------
# Internal -- pool management
# ---------------------------------------------------------------------------

func _acquire_particle_node() -> GPUParticles2D:
	if not _inactive_pool.is_empty():
		return _inactive_pool.pop_back()
	return _create_bare_particles()


func _create_bare_particles() -> GPUParticles2D:
	var p := GPUParticles2D.new()
	p.emitting = false
	p.visible = false
	return p


func _recycle_particle(particle: GPUParticles2D) -> void:
	if particle == null or not is_instance_valid(particle):
		return

	particle.emitting = false
	particle.visible = false

	var idx: int = _active_pool.find(particle)
	if idx >= 0:
		_active_pool.remove_at(idx)

	# Disconnect finished signal if still connected.
	if particle.finished.is_connected(_recycle_particle):
		particle.finished.disconnect(_recycle_particle)

	_inactive_pool.append(particle)
	_total_recycled += 1


func _evict_oldest() -> void:
	# Prefer to evict finished one-shot particles first.
	for i in range(_active_pool.size()):
		var p: GPUParticles2D = _active_pool[i]
		if p.one_shot and not p.emitting:
			_recycle_particle(p)
			return
	# Otherwise evict the oldest entry.
	if not _active_pool.is_empty():
		_recycle_particle(_active_pool[0])


# ---------------------------------------------------------------------------
# Internal -- particle configuration
# ---------------------------------------------------------------------------

func _configure_particle(particles: GPUParticles2D, config: Dictionary) -> void:
	particles.amount = config.get("amount", 20)
	particles.lifetime = config.get("lifetime", 1.0)
	particles.one_shot = config.get("one_shot", true)
	particles.explosiveness = config.get("explosiveness", 0.0)

	if config.has("visibility_rect"):
		particles.visibility_rect = config["visibility_rect"]
	else:
		particles.visibility_rect = Rect2(-64, -64, 128, 128)

	# Build or update the process material.
	var mat: ParticleProcessMaterial
	if particles.process_material is ParticleProcessMaterial:
		mat = particles.process_material
	else:
		mat = ParticleProcessMaterial.new()
		particles.process_material = mat

	mat.emission_shape = config.get("emission_shape", ParticleProcessMaterial.EMISSION_SHAPE_POINT)
	if mat.emission_shape == ParticleProcessMaterial.EMISSION_SHAPE_SPHERE:
		mat.emission_sphere_radius = config.get("emission_sphere_radius", 2.0)
	elif mat.emission_shape == ParticleProcessMaterial.EMISSION_SHAPE_BOX:
		mat.emission_box_extents = config.get("emission_box_extents", Vector3(8.0, 8.0, 0.0))

	mat.direction = config.get("direction", Vector3(0.0, -1.0, 0.0))
	mat.spread = config.get("spread", 45.0)
	mat.initial_velocity_min = config.get("velocity_min", 20.0)
	mat.initial_velocity_max = config.get("velocity_max", 40.0)
	mat.gravity = config.get("gravity", Vector3(0.0, 0.0, 0.0))
	mat.scale_min = config.get("scale_min", 1.0)
	mat.scale_max = config.get("scale_max", 2.0)
	mat.color = config.get("color", Color.WHITE)

	if config.has("angular_velocity_min"):
		mat.angular_velocity_min = config["angular_velocity_min"]
	if config.has("angular_velocity_max"):
		mat.angular_velocity_max = config["angular_velocity_max"]

	# Color ramp gradient.
	if config.has("color_ramp"):
		var ramp_colors: Array = config["color_ramp"]
		var gradient := Gradient.new()
		gradient.colors = PackedColorArray(ramp_colors)
		var offsets := PackedFloat32Array()
		for i in range(ramp_colors.size()):
			offsets.append(float(i) / maxf(float(ramp_colors.size() - 1), 1.0))
		gradient.offsets = offsets
		var tex := GradientTexture1D.new()
		tex.gradient = gradient
		mat.color_ramp = tex

	# Optional scale multiplier from caller.
	if config.has("scale"):
		var s: float = config["scale"]
		mat.scale_min *= s
		mat.scale_max *= s


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

## Resolve the default parent for world-space effects.
func _get_effects_parent() -> Node:
	var tree := get_tree()
	if tree == null:
		return self
	var root := tree.current_scene
	if root == null:
		return self
	var effects_node := root.get_node_or_null("World/Effects")
	if effects_node:
		return effects_node
	return root
