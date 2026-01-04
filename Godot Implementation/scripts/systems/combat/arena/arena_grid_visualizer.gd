class_name ArenaGridVisualizer
extends Node3D

## Visualizes the combat arena grid during battle
## Creates glowing grid lines with reveal/hide animations

signal reveal_complete()
signal hide_complete()

# Grid configuration
var grid_size: Vector2i = Constants.ARENA_SIZE
var tile_size: float = Constants.TILE_SIZE

# Visual properties
var line_color := Color(0.2, 0.6, 1.0, 0.6)  # Cyan-blue glow
var line_width: float = 0.05
var reveal_progress: float = 0.0  # 0-1 animation progress

# Material for glowing effect
var grid_material: StandardMaterial3D
var hazard_material: StandardMaterial3D
var obstacle_material: StandardMaterial3D

# Mesh instances for grid elements
var grid_mesh: MeshInstance3D
var tile_indicators: Array[MeshInstance3D] = []

# Reference to arena grid for tile types
var arena_grid: ArenaGrid

# Animation state
var is_revealing: bool = false
var is_hiding: bool = false

func _ready() -> void:
	visible = false
	_setup_materials()
	_create_grid_mesh()

func _setup_materials() -> void:
	# Main grid material with emission for glow
	grid_material = StandardMaterial3D.new()
	grid_material.albedo_color = line_color
	grid_material.emission_enabled = true
	grid_material.emission = line_color
	grid_material.emission_energy_multiplier = 2.0
	grid_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	grid_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED

	# Hazard tile material (red glow)
	hazard_material = StandardMaterial3D.new()
	hazard_material.albedo_color = Color(1.0, 0.2, 0.2, 0.4)
	hazard_material.emission_enabled = true
	hazard_material.emission = Color(1.0, 0.2, 0.2)
	hazard_material.emission_energy_multiplier = 1.5
	hazard_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	hazard_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED

	# Obstacle tile material (gray)
	obstacle_material = StandardMaterial3D.new()
	obstacle_material.albedo_color = Color(0.3, 0.3, 0.35, 0.5)
	obstacle_material.emission_enabled = true
	obstacle_material.emission = Color(0.3, 0.3, 0.35)
	obstacle_material.emission_energy_multiplier = 0.5
	obstacle_material.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	obstacle_material.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED

func _create_grid_mesh() -> void:
	# Create main grid lines using ImmediateMesh
	var immediate_mesh := ImmediateMesh.new()

	grid_mesh = MeshInstance3D.new()
	grid_mesh.mesh = immediate_mesh
	grid_mesh.material_override = grid_material
	add_child(grid_mesh)

	_rebuild_grid_lines(immediate_mesh)

func _rebuild_grid_lines(immediate_mesh: ImmediateMesh) -> void:
	immediate_mesh.clear_surfaces()
	immediate_mesh.surface_begin(Mesh.PRIMITIVE_LINES)

	var half_width := tile_size * grid_size.x / 2.0
	var half_height := tile_size * grid_size.y / 2.0

	# Vertical lines
	for x in range(grid_size.x + 1):
		var x_pos := -half_width + x * tile_size
		immediate_mesh.surface_add_vertex(Vector3(x_pos, 0.01, -half_height))
		immediate_mesh.surface_add_vertex(Vector3(x_pos, 0.01, half_height))

	# Horizontal lines
	for y in range(grid_size.y + 1):
		var y_pos := -half_height + y * tile_size
		immediate_mesh.surface_add_vertex(Vector3(-half_width, 0.01, y_pos))
		immediate_mesh.surface_add_vertex(Vector3(half_width, 0.01, y_pos))

	immediate_mesh.surface_end()

## Set the arena grid reference for tile type visualization
func set_arena_grid(grid: ArenaGrid) -> void:
	arena_grid = grid
	_update_tile_indicators()

## Create or update tile type indicators
func _update_tile_indicators() -> void:
	# Clear existing indicators
	for indicator in tile_indicators:
		indicator.queue_free()
	tile_indicators.clear()

	if not arena_grid:
		return

	var half_width := tile_size * grid_size.x / 2.0
	var half_height := tile_size * grid_size.y / 2.0

	# Create indicators for hazards and obstacles
	for x in range(grid_size.x):
		for y in range(grid_size.y):
			var pos := Vector2i(x, y)
			var tile_type := arena_grid.get_tile_type(pos)

			if tile_type == Constants.ArenaTileType.HAZARD:
				var indicator := _create_tile_indicator(x, y, half_width, half_height, hazard_material)
				tile_indicators.append(indicator)
			elif tile_type == Constants.ArenaTileType.OBSTACLE:
				var indicator := _create_tile_indicator(x, y, half_width, half_height, obstacle_material)
				tile_indicators.append(indicator)

func _create_tile_indicator(x: int, y: int, half_width: float, half_height: float, material: StandardMaterial3D) -> MeshInstance3D:
	var plane := PlaneMesh.new()
	plane.size = Vector2(tile_size * 0.9, tile_size * 0.9)

	var mesh_instance := MeshInstance3D.new()
	mesh_instance.mesh = plane
	mesh_instance.material_override = material

	# Calculate world position from grid position
	var world_x := -half_width + (x + 0.5) * tile_size
	var world_z := -half_height + (y + 0.5) * tile_size
	mesh_instance.position = Vector3(world_x, 0.02, world_z)

	add_child(mesh_instance)
	return mesh_instance

## Start reveal animation
func reveal() -> void:
	visible = true
	is_revealing = true
	is_hiding = false
	reveal_progress = 0.0

## Start hide animation
func hide_grid() -> void:
	is_hiding = true
	is_revealing = false

## Set reveal progress directly (called from CameraManager)
func set_reveal_progress(progress: float) -> void:
	reveal_progress = clampf(progress, 0.0, 1.0)
	_apply_reveal_effect()

	if progress >= 1.0 and is_revealing:
		is_revealing = false
		reveal_complete.emit()
	elif progress <= 0.0 and is_hiding:
		is_hiding = false
		visible = false
		hide_complete.emit()

func _apply_reveal_effect() -> void:
	# Apply reveal progress to material opacity
	var alpha := reveal_progress * line_color.a
	grid_material.albedo_color.a = alpha
	grid_material.emission_energy_multiplier = 2.0 * reveal_progress

	# Apply to tile indicators
	for indicator in tile_indicators:
		if indicator.material_override:
			var mat := indicator.material_override as StandardMaterial3D
			mat.albedo_color.a = mat.albedo_color.a * reveal_progress
			mat.emission_energy_multiplier *= reveal_progress

## Convert grid position to world position
func grid_to_world(grid_pos: Vector2i) -> Vector3:
	var half_width := tile_size * grid_size.x / 2.0
	var half_height := tile_size * grid_size.y / 2.0

	var world_x := -half_width + (grid_pos.x + 0.5) * tile_size
	var world_z := -half_height + (grid_pos.y + 0.5) * tile_size

	return global_position + Vector3(world_x, 0.0, world_z)

## Convert world position to grid position
func world_to_grid(world_pos: Vector3) -> Vector2i:
	var local_pos := world_pos - global_position
	var half_width := tile_size * grid_size.x / 2.0
	var half_height := tile_size * grid_size.y / 2.0

	var grid_x := int((local_pos.x + half_width) / tile_size)
	var grid_y := int((local_pos.z + half_height) / tile_size)

	return Vector2i(clamp(grid_x, 0, grid_size.x - 1), clamp(grid_y, 0, grid_size.y - 1))

## Highlight specific tiles (for attack telegraphs)
func highlight_tiles(tiles: Array[Vector2i], color: Color = Color.RED) -> void:
	# Implementation for highlighting attack zones
	pass

## Clear all tile highlights
func clear_highlights() -> void:
	# Implementation for clearing highlights
	pass
