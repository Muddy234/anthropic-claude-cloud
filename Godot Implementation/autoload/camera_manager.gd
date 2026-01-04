extends Node

## Camera Manager - Handles transitions between exploration and combat camera states
## Implements smooth lerping, post-processing effects, and grid visualization

signal camera_transition_started(from_state: CameraState, to_state: CameraState)
signal camera_transition_completed(state: CameraState)
signal hit_stop_started()
signal hit_stop_completed()

enum CameraState {
	EXPLORATION,
	COMBAT_LOCKED,
	TRANSITIONING
}

## Camera profile data structure
class CameraProfile:
	var fov: float = 60.0           # Field of view
	var angle: float = 45.0         # Camera pitch angle (degrees)
	var height: float = 12.0        # Camera height above target
	var offset: float = -8.0        # Camera offset behind target
	var vignette_intensity: float = 0.2
	var dof_enabled: bool = false
	var dof_blur_amount: float = 0.0

	func _init(p_fov: float = 60.0, p_angle: float = 45.0, p_height: float = 12.0,
			   p_offset: float = -8.0, p_vignette: float = 0.2,
			   p_dof: bool = false, p_blur: float = 0.0) -> void:
		fov = p_fov
		angle = p_angle
		height = p_height
		offset = p_offset
		vignette_intensity = p_vignette
		dof_enabled = p_dof
		dof_blur_amount = p_blur

# Camera profiles for each state
var exploration_profile := CameraProfile.new(
	60.0,   # FOV: Wide for exploration
	45.0,   # Angle: Lower, more cinematic
	12.0,   # Height: Higher for wider view
	-8.0,   # Offset: Further back
	0.2,    # Vignette: Subtle
	false,  # DOF: Disabled
	0.0     # Blur: None
)

var combat_profile := CameraProfile.new(
	40.0,   # FOV: Tight for tactical view
	65.0,   # Angle: Steeper, nearly top-down
	8.0,    # Height: Lower, closer
	-4.0,   # Offset: Closer to action
	0.45,   # Vignette: Strong focus effect
	true,   # DOF: Enabled
	2.0     # Blur: Strong background blur
)

# Current state
var current_state: CameraState = CameraState.EXPLORATION
var previous_state: CameraState = CameraState.EXPLORATION

# Transition progress (0.0 = exploration, 1.0 = combat)
var transition_t: float = 0.0
var target_transition_t: float = 0.0
var transition_speed: float = 2.0  # 0.5 seconds to transition

# Camera references
var camera: Camera3D
var camera_target: Node3D  # What the camera follows
var player_target: Node3D  # Reference to player for exploration
var arena_center: Vector3 = Vector3.ZERO  # Center point for combat

# Smooth camera movement
var current_position: Vector3 = Vector3.ZERO
var current_rotation: Vector3 = Vector3.ZERO
var position_velocity: Vector3 = Vector3.ZERO
var rotation_velocity: Vector3 = Vector3.ZERO
const SMOOTH_TIME: float = 0.15

# Post-processing references
var world_environment: WorldEnvironment
var environment: Environment

# Grid visualizer
var grid_visualizer: Node3D
var grid_reveal_progress: float = 0.0

# Time management
var is_hit_stopping: bool = false
var hit_stop_timer: float = 0.0
var slow_motion_timer: float = 0.0
var combat_time_scale: float = 1.0

# Suspended entities (outside combat bubble)
var suspended_entities: Array[Node] = []

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_setup_post_processing()

func _process(delta: float) -> void:
	_update_transition(delta)
	_update_camera(delta)
	_update_post_processing()
	_update_time_effects(delta)
	_update_grid_reveal(delta)

## Setup initial post-processing (creates environment if needed)
func _setup_post_processing() -> void:
	# Will be set up when camera is registered
	pass

## Register the main camera for management
func register_camera(cam: Camera3D, player: Node3D = null) -> void:
	camera = cam
	player_target = player
	camera_target = player

	if camera:
		current_position = camera.global_position
		current_rotation = camera.rotation_degrees

	# Find or create WorldEnvironment
	_find_or_create_environment()

func _find_or_create_environment() -> void:
	# Look for existing WorldEnvironment in the scene
	var root := get_tree().root
	world_environment = _find_world_environment(root)

	if not world_environment:
		# Create one
		world_environment = WorldEnvironment.new()
		world_environment.name = "CameraWorldEnvironment"
		environment = Environment.new()
		environment.background_mode = Environment.BG_COLOR
		environment.background_color = Color(0.1, 0.1, 0.15)
		world_environment.environment = environment
		get_tree().current_scene.add_child(world_environment)
	else:
		environment = world_environment.environment

func _find_world_environment(node: Node) -> WorldEnvironment:
	if node is WorldEnvironment:
		return node
	for child in node.get_children():
		var found := _find_world_environment(child)
		if found:
			return found
	return null

## Initiate combat camera transition
## enemy_positions: Array of enemy world positions for arena center calculation
func initiate_combat(player_pos: Vector3, enemy_positions: Array) -> void:
	if current_state == CameraState.COMBAT_LOCKED:
		return

	previous_state = current_state
	current_state = CameraState.TRANSITIONING

	# Calculate arena center
	arena_center = _calculate_arena_center(player_pos, enemy_positions)

	# Detach camera from player, target arena center
	camera_target = null

	# Start transition
	target_transition_t = 1.0

	# Trigger hit stop effect
	_start_hit_stop()

	# Show grid visualization
	_reveal_grid()

	# Suspend entities outside combat zone
	_suspend_outside_entities()

	camera_transition_started.emit(previous_state, CameraState.COMBAT_LOCKED)
	EventBus.camera_combat_started.emit(arena_center)

## Calculate the center point of the combat arena
func _calculate_arena_center(player_pos: Vector3, enemy_positions: Array) -> Vector3:
	if enemy_positions.is_empty():
		return player_pos

	# Average all positions
	var center := player_pos
	for pos in enemy_positions:
		center += pos
	center /= (enemy_positions.size() + 1)

	# Snap to grid (tile size from constants)
	var tile_size := float(Constants.TILE_SIZE)
	center.x = round(center.x / tile_size) * tile_size
	center.z = round(center.z / tile_size) * tile_size
	center.y = 0  # Ground level

	# Validate center isn't in a wall (offset towards player if needed)
	center = _validate_arena_center(center, player_pos)

	return center

## Validate arena center isn't blocked
func _validate_arena_center(center: Vector3, player_pos: Vector3) -> Vector3:
	# Use physics to check for obstacles
	var space_state := get_viewport().world_3d.direct_space_state if get_viewport() else null
	if not space_state:
		return center

	# Check if center is valid, if not offset towards player
	var params := PhysicsRayQueryParameters3D.new()
	params.from = center + Vector3.UP * 2
	params.to = center
	params.collision_mask = 1  # Assuming layer 1 is obstacles

	var result := space_state.intersect_ray(params)
	if result:
		# Offset towards player
		var to_player := (player_pos - center).normalized()
		center += to_player * Constants.TILE_SIZE

	return center

## End combat and return to exploration
func end_combat() -> void:
	if current_state == CameraState.EXPLORATION:
		return

	previous_state = current_state
	current_state = CameraState.TRANSITIONING

	# Reattach camera to player
	camera_target = player_target

	# Start reverse transition
	target_transition_t = 0.0

	# Hide grid visualization
	_hide_grid()

	# Resume suspended entities
	_resume_suspended_entities()

	camera_transition_started.emit(previous_state, CameraState.EXPLORATION)
	EventBus.camera_combat_ended.emit()

## Update transition progress
func _update_transition(delta: float) -> void:
	if abs(transition_t - target_transition_t) < 0.001:
		transition_t = target_transition_t
		if current_state == CameraState.TRANSITIONING:
			current_state = CameraState.COMBAT_LOCKED if target_transition_t > 0.5 else CameraState.EXPLORATION
			camera_transition_completed.emit(current_state)
		return

	# EaseInOutCubic interpolation
	var speed := transition_speed * delta
	if transition_t < target_transition_t:
		transition_t = minf(transition_t + speed, target_transition_t)
	else:
		transition_t = maxf(transition_t - speed, target_transition_t)

## Update camera position and rotation
func _update_camera(delta: float) -> void:
	if not camera:
		return

	# Calculate target position based on current profile blend
	var target_pos: Vector3
	var target_rot: Vector3
	var target_fov: float

	# Get interpolated profile values
	var t := _ease_in_out_cubic(transition_t)
	var current_fov := lerpf(exploration_profile.fov, combat_profile.fov, t)
	var current_angle := lerpf(exploration_profile.angle, combat_profile.angle, t)
	var current_height := lerpf(exploration_profile.height, combat_profile.height, t)
	var current_offset := lerpf(exploration_profile.offset, combat_profile.offset, t)

	# Determine look-at target
	var look_target: Vector3
	if transition_t < 0.5 and camera_target:
		look_target = camera_target.global_position
	elif transition_t >= 0.5 or not camera_target:
		look_target = arena_center
	else:
		# Blend between player and arena center during transition
		var blend := transition_t * 2.0  # 0-0.5 maps to 0-1
		if camera_target:
			look_target = camera_target.global_position.lerp(arena_center, blend)
		else:
			look_target = arena_center

	# Calculate camera position from angle and height
	var angle_rad := deg_to_rad(current_angle)
	var offset_dir := Vector3(0, 0, current_offset).rotated(Vector3.RIGHT, -angle_rad)
	target_pos = look_target + Vector3(0, current_height, 0) + offset_dir

	# Calculate rotation to look at target
	var look_dir := (look_target - target_pos).normalized()
	target_rot = Vector3(
		-rad_to_deg(asin(look_dir.y)),
		rad_to_deg(atan2(look_dir.x, look_dir.z)),
		0
	)

	# Smooth damp position and rotation
	current_position = _smooth_damp_v3(current_position, target_pos, position_velocity, SMOOTH_TIME, delta)
	current_rotation = _smooth_damp_v3(current_rotation, target_rot, rotation_velocity, SMOOTH_TIME, delta)

	# Apply to camera
	camera.global_position = current_position
	camera.rotation_degrees = current_rotation
	camera.fov = current_fov

## Update post-processing effects
func _update_post_processing() -> void:
	if not environment:
		return

	var t := _ease_in_out_cubic(transition_t)

	# Vignette
	var vignette_intensity := lerpf(
		exploration_profile.vignette_intensity,
		combat_profile.vignette_intensity,
		t
	)
	# Note: Godot 4 uses different vignette settings
	# environment.adjustment_enabled = true would be needed for some effects

	# Depth of Field
	if combat_profile.dof_enabled and t > 0.1:
		# Enable DOF and set focus to arena center
		var focus_distance := current_position.distance_to(arena_center)
		# environment.dof_blur_far_enabled = true
		# environment.dof_blur_far_distance = focus_distance + 5.0
		# environment.dof_blur_far_amount = combat_profile.dof_blur_amount * t

## Update grid reveal animation
func _update_grid_reveal(delta: float) -> void:
	if current_state == CameraState.COMBAT_LOCKED or (current_state == CameraState.TRANSITIONING and target_transition_t > 0.5):
		grid_reveal_progress = minf(grid_reveal_progress + delta * 2.0, 1.0)
	else:
		grid_reveal_progress = maxf(grid_reveal_progress - delta * 3.0, 0.0)

	if grid_visualizer and grid_visualizer.has_method("set_reveal_progress"):
		grid_visualizer.set_reveal_progress(grid_reveal_progress)

## Reveal the combat grid
func _reveal_grid() -> void:
	if not grid_visualizer:
		_create_grid_visualizer()

	if grid_visualizer:
		grid_visualizer.visible = true
		grid_visualizer.global_position = arena_center
		if grid_visualizer.has_method("reveal"):
			grid_visualizer.reveal()

## Hide the combat grid
func _hide_grid() -> void:
	if grid_visualizer and grid_visualizer.has_method("hide_grid"):
		grid_visualizer.hide_grid()

## Create the grid visualizer node
func _create_grid_visualizer() -> void:
	# Check if ArenaGridVisualizer class exists
	var visualizer_script := load("res://scripts/systems/combat/arena/arena_grid_visualizer.gd")
	if visualizer_script:
		grid_visualizer = Node3D.new()
		grid_visualizer.set_script(visualizer_script)
		grid_visualizer.name = "ArenaGridVisualizer"
		get_tree().current_scene.add_child(grid_visualizer)

## Start hit stop effect
func _start_hit_stop() -> void:
	is_hit_stopping = true
	hit_stop_timer = 0.15  # Impact frame duration
	slow_motion_timer = 0.5  # Slow motion duration after
	Engine.time_scale = 0.0
	hit_stop_started.emit()

## Update time effects (hit stop, slow motion)
func _update_time_effects(delta: float) -> void:
	if not is_hit_stopping:
		return

	# Use unscaled delta
	var real_delta := delta / maxf(Engine.time_scale, 0.001) if Engine.time_scale > 0 else delta

	if hit_stop_timer > 0:
		hit_stop_timer -= real_delta
		if hit_stop_timer <= 0:
			# Transition to slow motion
			Engine.time_scale = 0.1
	elif slow_motion_timer > 0:
		slow_motion_timer -= real_delta
		# Gradually restore time scale
		Engine.time_scale = lerpf(0.1, 1.0, 1.0 - (slow_motion_timer / 0.5))
		if slow_motion_timer <= 0:
			Engine.time_scale = 1.0
			is_hit_stopping = false
			hit_stop_completed.emit()

## Suspend entities outside combat zone
func _suspend_outside_entities() -> void:
	suspended_entities.clear()

	var combat_radius := 15.0 * Constants.TILE_SIZE

	for enemy in GameManager.enemies:
		if not is_instance_valid(enemy):
			continue

		var distance := enemy.global_position.distance_to(arena_center)
		if distance > combat_radius:
			suspended_entities.append(enemy)
			if enemy.has_method("suspend"):
				enemy.suspend()
			else:
				enemy.set_process(false)
				enemy.set_physics_process(false)

## Resume suspended entities
func _resume_suspended_entities() -> void:
	for entity in suspended_entities:
		if is_instance_valid(entity):
			if entity.has_method("resume"):
				entity.resume()
			else:
				entity.set_process(true)
				entity.set_physics_process(true)

	suspended_entities.clear()

## Smooth damp for Vector3
func _smooth_damp_v3(current: Vector3, target: Vector3, velocity: Vector3, smooth_time: float, delta: float) -> Vector3:
	var omega := 2.0 / maxf(smooth_time, 0.0001)
	var x := omega * delta
	var exp_factor := 1.0 / (1.0 + x + 0.48 * x * x + 0.235 * x * x * x)

	var change := current - target
	var temp := (velocity + omega * change) * delta
	velocity = (velocity - omega * temp) * exp_factor

	var result := target + (change + temp) * exp_factor

	# Prevent overshoot
	if (target - current).dot(result - target) > 0:
		result = target
		velocity = Vector3.ZERO

	return result

## EaseInOutCubic easing function
func _ease_in_out_cubic(t: float) -> float:
	if t < 0.5:
		return 4.0 * t * t * t
	else:
		var f := (2.0 * t) - 2.0
		return 0.5 * f * f * f + 1.0

## Get current camera state
func get_state() -> CameraState:
	return current_state

## Check if camera is in combat mode
func is_in_combat() -> bool:
	return current_state == CameraState.COMBAT_LOCKED

## Get the arena center position
func get_arena_center() -> Vector3:
	return arena_center

## Force immediate camera position (no lerp)
func snap_to_target() -> void:
	if not camera:
		return

	var target := camera_target.global_position if camera_target else arena_center
	current_position = camera.global_position
	position_velocity = Vector3.ZERO
	rotation_velocity = Vector3.ZERO
