class_name CollisionHandler
extends RefCounted

## Handles collision detection for simultaneous movement in arena combat

var grid: ArenaGrid

func _init(p_grid: ArenaGrid) -> void:
	grid = p_grid

## Check if two simultaneous moves result in a collision
## Returns collision info dictionary
func check_collision(move_targets: Array[Dictionary]) -> Dictionary:
	if move_targets.size() < 2:
		return {"collision": false}

	var target_a: Dictionary = move_targets[0]
	var target_b: Dictionary = move_targets[1]

	var from_a: Vector2i = target_a.from
	var to_a: Vector2i = target_a.to
	var from_b: Vector2i = target_b.from
	var to_b: Vector2i = target_b.to

	# Case 1: Both moving to the same tile
	if to_a == to_b:
		return {
			"collision": true,
			"collision_type": "same_destination",
			"collision_position": to_a,
			"final_positions": [from_a, from_b]  # Both stay in place
		}

	# Case 2: Swapping positions (A moves to B's position and vice versa)
	if to_a == from_b and to_b == from_a:
		# They meet in the middle - calculate midpoint
		var mid_x := (from_a.x + from_b.x) / 2.0
		var mid_y := (from_a.y + from_b.y) / 2.0

		# Both stay in original positions
		return {
			"collision": true,
			"collision_type": "swap_blocked",
			"collision_position": Vector2i(int(mid_x), int(mid_y)),
			"final_positions": [from_a, from_b]
		}

	# Case 3: One moving into other's current position
	# (This is okay if other is also moving out)
	if to_a == from_b and to_b != from_a:
		# A is moving to where B was, B is moving elsewhere
		# This is fine - no collision
		pass

	if to_b == from_a and to_a != from_b:
		# B is moving to where A was, A is moving elsewhere
		# This is fine - no collision
		pass

	# No collision
	return {"collision": false}

## Check if a planned move would result in collision with existing occupant
func would_collide_with_occupant(from: Vector2i, to: Vector2i) -> bool:
	return grid.is_tile_blocked(to)

## Get the path between two adjacent tiles
func get_movement_path(from: Vector2i, to: Vector2i) -> Array[Vector2i]:
	var path: Array[Vector2i] = [from, to]
	return path

## Check if two paths intersect
func paths_intersect(path_a: Array[Vector2i], path_b: Array[Vector2i]) -> bool:
	# For cardinal movement, paths only intersect if they cross the same midpoint
	if path_a.size() < 2 or path_b.size() < 2:
		return false

	var from_a := path_a[0]
	var to_a := path_a[1]
	var from_b := path_b[0]
	var to_b := path_b[1]

	# Check swap collision
	if to_a == from_b and to_b == from_a:
		return true

	# Check same destination
	if to_a == to_b:
		return true

	return false

## Resolve collision by determining final positions
## Returns array of final positions for each combatant
func resolve_collision(from_a: Vector2i, to_a: Vector2i,
					   from_b: Vector2i, to_b: Vector2i) -> Array[Vector2i]:
	# Same destination - both stay put
	if to_a == to_b:
		return [from_a, from_b]

	# Swap attempt - both stay put
	if to_a == from_b and to_b == from_a:
		return [from_a, from_b]

	# No actual collision - allow moves
	return [to_a, to_b]
