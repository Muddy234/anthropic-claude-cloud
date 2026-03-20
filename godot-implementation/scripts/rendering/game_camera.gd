class_name GameCamera
extends Camera2D
## Camera that follows the player with smooth interpolation, automatic zoom to
## show a fixed tile count, map-boundary clamping, and screen-shake support.
##
## Attach to the main scene as a sibling of the World node.  Set [member target]
## to the Player node (or call [method set_target]).

const TILE_SIZE: int = 16  # matches Constants.BASE_TILE_SIZE

# =========================================================================
#  Exports
# =========================================================================

## Number of tiles the viewport should span horizontally and vertically.
## Zoom is derived from this so the same tile density is shown at any
## window resolution.
@export var target_tile_count := Vector2i(20, 15)

## Interpolation speed when following the target (higher = snappier).
@export var smooth_speed: float = 8.0

## The node this camera follows each frame.
@export var target: Node2D = null

# =========================================================================
#  Shake state
# =========================================================================
var _shake_intensity: float = 0.0
var _shake_duration: float  = 0.0
var _shake_timer: float     = 0.0
var _shake_offset: Vector2  = Vector2.ZERO

# =========================================================================
#  Lifecycle
# =========================================================================

func _ready() -> void:
	# Use manual smoothing so we can lerp in _process ourselves.
	position_smoothing_enabled = false
	_calculate_zoom()
	get_viewport().size_changed.connect(_on_viewport_size_changed)


func _process(delta: float) -> void:
	_follow_target(delta)
	_process_shake(delta)


# =========================================================================
#  Public API
# =========================================================================

## Assign a new follow target at runtime.
func set_target(node: Node2D) -> void:
	target = node


## Configure camera limits so it never scrolls past the map edges.
## [param map_size] is in tiles (e.g. Vector2i(200, 200)).
func set_map_limits(map_size: Vector2i) -> void:
	limit_left   = 0
	limit_top    = 0
	limit_right  = map_size.x * TILE_SIZE
	limit_bottom = map_size.y * TILE_SIZE


## Trigger a screen-shake effect that decays linearly over [param duration] seconds.
func screen_shake(intensity: float, duration: float) -> void:
	_shake_intensity = intensity
	_shake_duration  = duration
	_shake_timer     = duration


# =========================================================================
#  Internals
# =========================================================================

func _calculate_zoom() -> void:
	var vp_size: Vector2 = get_viewport_rect().size
	if vp_size.x <= 0.0 or vp_size.y <= 0.0:
		return

	var zoom_x: float = vp_size.x / float(target_tile_count.x * TILE_SIZE)
	var zoom_y: float = vp_size.y / float(target_tile_count.y * TILE_SIZE)
	var target_zoom: float = minf(zoom_x, zoom_y)

	# Prevent degenerate zoom values
	target_zoom = maxf(target_zoom, 0.1)
	zoom = Vector2(target_zoom, target_zoom)


func _follow_target(delta: float) -> void:
	if not is_instance_valid(target):
		return

	var desired: Vector2 = target.global_position
	global_position = global_position.lerp(desired, 1.0 - exp(-smooth_speed * delta))


func _process_shake(delta: float) -> void:
	if _shake_timer <= 0.0:
		offset = Vector2.ZERO
		return

	_shake_timer -= delta
	var decay: float = _shake_timer / maxf(_shake_duration, 0.001)
	var current_intensity: float = _shake_intensity * decay

	_shake_offset = Vector2(
		randf_range(-current_intensity, current_intensity),
		randf_range(-current_intensity, current_intensity)
	)
	offset = _shake_offset

	if _shake_timer <= 0.0:
		offset = Vector2.ZERO
		_shake_timer = 0.0


func _on_viewport_size_changed() -> void:
	_calculate_zoom()
