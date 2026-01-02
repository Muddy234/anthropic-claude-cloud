class_name ArenaGrid
extends RefCounted

## Manages the 4x4 arena grid state for combat

signal combatant_moved(combatant: Node, from: Vector2i, to: Vector2i)
signal tile_state_changed(position: Vector2i)
signal combatant_killed_by_hazard(combatant: Node, position: Vector2i)

# Grid dimensions
var size: Vector2i = Constants.ARENA_SIZE

# Grid state - stores which combatant (if any) is at each position
var grid: Array = []  # 2D array of Node references (null = empty)

# Tile types - stores special tile types (EMPTY, HAZARD, OBSTACLE)
var tile_types: Dictionary = {}  # Vector2i -> Constants.ArenaTileType

# Combatant positions cache for quick lookup
var combatant_positions: Dictionary = {}  # Node -> Vector2i

func _init() -> void:
	_init_grid()

func _init_grid() -> void:
	grid.clear()
	combatant_positions.clear()
	tile_types.clear()

	for x in range(size.x):
		var column: Array = []
		for y in range(size.y):
			column.append(null)
		grid.append(column)

	# Initialize all tiles as EMPTY
	for x in range(size.x):
		for y in range(size.y):
			tile_types[Vector2i(x, y)] = Constants.ArenaTileType.EMPTY

## Reset the grid to empty state
func reset() -> void:
	_init_grid()

## Generate random hazards and obstacles on the grid
## Call this BEFORE placing combatants to ensure spawn positions are valid
## reserved_positions: Array of Vector2i that should remain EMPTY (spawn points)
func generate_arena_tiles(reserved_positions: Array[Vector2i] = []) -> void:
	# Clear existing special tiles
	for pos in tile_types:
		tile_types[pos] = Constants.ArenaTileType.EMPTY

	# Collect all valid positions (not reserved)
	var valid_positions: Array[Vector2i] = []
	for x in range(size.x):
		for y in range(size.y):
			var pos := Vector2i(x, y)
			if pos not in reserved_positions:
				valid_positions.append(pos)

	# Shuffle for random placement
	valid_positions.shuffle()

	# Determine number of hazards and obstacles
	var num_hazards := randi_range(Constants.ARENA_MIN_HAZARDS, Constants.ARENA_MAX_HAZARDS)
	var num_obstacles := randi_range(Constants.ARENA_MIN_OBSTACLES, Constants.ARENA_MAX_OBSTACLES)

	var placed := 0

	# Place hazards first
	for i in range(num_hazards):
		if placed >= valid_positions.size():
			break
		tile_types[valid_positions[placed]] = Constants.ArenaTileType.HAZARD
		placed += 1

	# Place obstacles
	for i in range(num_obstacles):
		if placed >= valid_positions.size():
			break
		tile_types[valid_positions[placed]] = Constants.ArenaTileType.OBSTACLE
		placed += 1

## Get the tile type at a position
func get_tile_type(pos: Vector2i) -> Constants.ArenaTileType:
	if pos in tile_types:
		return tile_types[pos]
	return Constants.ArenaTileType.EMPTY

## Check if a tile is a hazard
func is_hazard(pos: Vector2i) -> bool:
	return get_tile_type(pos) == Constants.ArenaTileType.HAZARD

## Check if a tile is an obstacle
func is_obstacle(pos: Vector2i) -> bool:
	return get_tile_type(pos) == Constants.ArenaTileType.OBSTACLE

## Check if a tile blocks attacks (obstacles block, hazards don't)
func blocks_attack(pos: Vector2i) -> bool:
	return is_obstacle(pos)

## Check if a tile blocks voluntary movement (both hazards and obstacles)
func blocks_movement(pos: Vector2i) -> bool:
	var tile_type := get_tile_type(pos)
	return tile_type == Constants.ArenaTileType.HAZARD or tile_type == Constants.ArenaTileType.OBSTACLE

## Get all hazard positions
func get_hazards() -> Array[Vector2i]:
	var hazards: Array[Vector2i] = []
	for pos in tile_types:
		if tile_types[pos] == Constants.ArenaTileType.HAZARD:
			hazards.append(pos)
	return hazards

## Get all obstacle positions
func get_obstacles() -> Array[Vector2i]:
	var obstacles: Array[Vector2i] = []
	for pos in tile_types:
		if tile_types[pos] == Constants.ArenaTileType.OBSTACLE:
			obstacles.append(pos)
	return obstacles

## Apply hazard effect to a combatant (instant kill)
## Returns true if the combatant was killed
func apply_hazard_effect(combatant: Node, pos: Vector2i) -> bool:
	if not is_hazard(pos):
		return false

	# Kill the combatant
	if combatant.has_method("take_damage"):
		# Deal massive damage to ensure death
		combatant.take_damage(99999, null)
	elif "current_hp" in combatant:
		combatant.current_hp = 0

	combatant_killed_by_hazard.emit(combatant, pos)
	return true

## Force move a combatant (for push mechanics)
## Unlike normal movement, this can push into hazards (causing death)
## Cannot push into obstacles or out of bounds
## Returns: Dictionary with {success: bool, killed_by_hazard: bool}
func force_move_combatant(combatant: Node, new_pos: Vector2i) -> Dictionary:
	if not combatant or not is_instance_valid(combatant) or combatant not in combatant_positions:
		return {"success": false, "killed_by_hazard": false}

	if not is_within_bounds(new_pos):
		return {"success": false, "killed_by_hazard": false}

	# Can't push into obstacles
	if is_obstacle(new_pos):
		return {"success": false, "killed_by_hazard": false}

	# Can't push into another combatant
	if grid[new_pos.x][new_pos.y] != null and grid[new_pos.x][new_pos.y] != combatant:
		return {"success": false, "killed_by_hazard": false}

	var old_pos: Vector2i = combatant_positions[combatant]

	# Clear old position
	grid[old_pos.x][old_pos.y] = null

	# Check for hazard BEFORE updating position
	var killed := false
	if is_hazard(new_pos):
		# Don't place on grid (they're dead), just update for the emit
		combatant_positions.erase(combatant)
		killed = apply_hazard_effect(combatant, new_pos)
	else:
		# Normal move
		grid[new_pos.x][new_pos.y] = combatant
		combatant_positions[combatant] = new_pos

	combatant_moved.emit(combatant, old_pos, new_pos)

	return {"success": true, "killed_by_hazard": killed}

## Place a combatant at a position
func place_combatant(combatant: Node, pos: Vector2i) -> bool:
	if not is_within_bounds(pos):
		return false

	if grid[pos.x][pos.y] != null:
		return false  # Tile occupied

	grid[pos.x][pos.y] = combatant
	combatant_positions[combatant] = pos

	return true

## Remove a combatant from the grid
func remove_combatant(combatant: Node) -> void:
	if not combatant or combatant not in combatant_positions:
		return

	var pos: Vector2i = combatant_positions[combatant]
	if is_within_bounds(pos):
		grid[pos.x][pos.y] = null
	combatant_positions.erase(combatant)

## Move a combatant to a new position
func move_combatant(combatant: Node, new_pos: Vector2i) -> bool:
	if not combatant or not is_instance_valid(combatant) or combatant not in combatant_positions:
		return false

	if not is_within_bounds(new_pos):
		return false

	# Check if target is empty or has the same combatant
	if grid[new_pos.x][new_pos.y] != null and grid[new_pos.x][new_pos.y] != combatant:
		return false

	var old_pos: Vector2i = combatant_positions[combatant]

	# Clear old position
	grid[old_pos.x][old_pos.y] = null

	# Set new position
	grid[new_pos.x][new_pos.y] = combatant
	combatant_positions[combatant] = new_pos

	combatant_moved.emit(combatant, old_pos, new_pos)

	return true

## Get position of a combatant
func get_combatant_position(combatant: Node) -> Vector2i:
	if combatant and is_instance_valid(combatant) and combatant in combatant_positions:
		return combatant_positions[combatant]
	return Vector2i(-1, -1)

## Get combatant at a position
func get_combatant_at(pos: Vector2i) -> Node:
	if not is_within_bounds(pos):
		return null
	var combatant = grid[pos.x][pos.y]
	# Return null if combatant was freed
	if combatant and not is_instance_valid(combatant):
		grid[pos.x][pos.y] = null
		return null
	return combatant

## Check if position is within grid bounds
func is_within_bounds(pos: Vector2i) -> bool:
	return pos.x >= 0 and pos.x < size.x and pos.y >= 0 and pos.y < size.y

## Check if a tile is blocked (has a combatant OR is an obstacle/hazard)
func is_tile_blocked(pos: Vector2i) -> bool:
	if not is_within_bounds(pos):
		return true
	if blocks_movement(pos):
		return true
	return grid[pos.x][pos.y] != null

## Check if a tile is empty (no combatant AND not an obstacle/hazard)
func is_tile_empty(pos: Vector2i) -> bool:
	if not is_within_bounds(pos):
		return false
	if blocks_movement(pos):
		return false
	return grid[pos.x][pos.y] == null

## Check if a tile is walkable for voluntary movement (empty and not blocked)
## For forced movement (push), use is_within_bounds only and handle hazard separately
func is_walkable(pos: Vector2i) -> bool:
	return is_tile_empty(pos)

## Get all valid move targets for a combatant (cardinal adjacent empty tiles)
func get_valid_move_targets(combatant: Node) -> Array[Vector2i]:
	var targets: Array[Vector2i] = []
	var pos := get_combatant_position(combatant)

	if pos == Vector2i(-1, -1):
		return targets

	for dir in Constants.CARDINAL_DIRECTIONS:
		var target: Vector2i = pos + dir
		if is_within_bounds(target) and is_tile_empty(target):
			targets.append(target)

	return targets

## Get all tiles within range of a position (for attack targeting)
func get_tiles_in_range(pos: Vector2i, range_val: int) -> Array[Vector2i]:
	var tiles: Array[Vector2i] = []

	for x in range(size.x):
		for y in range(size.y):
			var tile_pos := Vector2i(x, y)
			if tile_pos == pos:
				continue
			var distance := _manhattan_distance(pos, tile_pos)
			if distance <= range_val:
				tiles.append(tile_pos)

	return tiles

## Get tiles with enemies in range (for attack targeting)
func get_attackable_tiles(combatant: Node, range_val: int) -> Array[Vector2i]:
	var tiles: Array[Vector2i] = []
	var pos := get_combatant_position(combatant)

	if pos == Vector2i(-1, -1):
		return tiles

	for tile in get_tiles_in_range(pos, range_val):
		var target := get_combatant_at(tile)
		if target != null and target != combatant:
			tiles.append(tile)

	return tiles

## Calculate manhattan distance between two positions
func _manhattan_distance(a: Vector2i, b: Vector2i) -> int:
	return abs(a.x - b.x) + abs(a.y - b.y)

## Get distance between two combatants
func get_distance(combatant_a: Node, combatant_b: Node) -> int:
	var pos_a := get_combatant_position(combatant_a)
	var pos_b := get_combatant_position(combatant_b)

	if pos_a == Vector2i(-1, -1) or pos_b == Vector2i(-1, -1):
		return -1

	return _manhattan_distance(pos_a, pos_b)

## Setup initial positions for combat (player on left, enemy on right)
## Backwards compatible - calls setup_combat_multi with single enemy
func setup_combat(player: Node, enemy: Node) -> void:
	setup_combat_multi(player, [enemy])

## Setup initial positions for combat with multiple enemies
## Player starts on left side, enemies spread on right side
func setup_combat_multi(player: Node, enemies: Array) -> void:
	reset()

	# Calculate spawn positions first (before generating tiles)
	var player_pos := Vector2i(0, size.y / 2)
	var enemy_spawn_positions := _calculate_enemy_spawn_positions(enemies.size())

	# Build reserved positions array (spawn points that must stay empty)
	var reserved: Array[Vector2i] = [player_pos]
	for pos in enemy_spawn_positions:
		reserved.append(pos)

	# Generate hazards and obstacles avoiding spawn positions
	generate_arena_tiles(reserved)

	# Place player
	place_combatant(player, player_pos)

	# Place enemies
	for i in range(enemies.size()):
		if i < enemy_spawn_positions.size():
			place_combatant(enemies[i], enemy_spawn_positions[i])

## Calculate spawn positions for enemies based on count
## Spreads enemies across the right side of the arena
func _calculate_enemy_spawn_positions(enemy_count: int) -> Array[Vector2i]:
	var positions: Array[Vector2i] = []

	match enemy_count:
		1:
			# Single enemy: right side, centered
			positions.append(Vector2i(size.x - 1, size.y / 2))
		2:
			# Two enemies: right side, top and bottom
			positions.append(Vector2i(size.x - 1, 0))
			positions.append(Vector2i(size.x - 1, size.y - 1))
		3:
			# Three enemies: right column top, middle, bottom
			positions.append(Vector2i(size.x - 1, 0))
			positions.append(Vector2i(size.x - 1, size.y / 2))
			positions.append(Vector2i(size.x - 1, size.y - 1))
		4, _:
			# Four enemies: right two columns, corners
			positions.append(Vector2i(size.x - 1, 0))
			positions.append(Vector2i(size.x - 1, size.y - 1))
			positions.append(Vector2i(size.x - 2, 0))
			positions.append(Vector2i(size.x - 2, size.y - 1))

	return positions

## Get all combatants on the grid
func get_all_combatants() -> Array[Node]:
	var combatants: Array[Node] = []
	for combatant in combatant_positions.keys():
		if combatant and is_instance_valid(combatant):
			combatants.append(combatant)
	return combatants

## Get all enemy combatants (excluding player)
func get_enemy_combatants(player: Node) -> Array[Node]:
	var enemies: Array[Node] = []
	for combatant in combatant_positions.keys():
		if combatant and is_instance_valid(combatant) and combatant != player:
			enemies.append(combatant)
	return enemies

## Check if a tile has an enemy (not the player)
func has_enemy_at(pos: Vector2i, player: Node) -> bool:
	var combatant := get_combatant_at(pos)
	return combatant != null and combatant != player

## Get count of combatants on the grid
func get_combatant_count() -> int:
	var count := 0
	for combatant in combatant_positions.keys():
		if combatant and is_instance_valid(combatant):
			count += 1
	return count
