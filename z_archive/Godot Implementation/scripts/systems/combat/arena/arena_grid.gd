class_name ArenaGrid
extends RefCounted

## Manages the 4x4 arena grid state for combat

signal combatant_moved(combatant: Node, from: Vector2i, to: Vector2i)
signal tile_state_changed(position: Vector2i)

# Grid dimensions
var size: Vector2i = Constants.ARENA_SIZE

# Grid state - stores which combatant (if any) is at each position
var grid: Array = []  # 2D array of Node references (null = empty)

# Combatant positions cache for quick lookup
var combatant_positions: Dictionary = {}  # Node -> Vector2i

func _init() -> void:
	_init_grid()

func _init_grid() -> void:
	grid.clear()
	combatant_positions.clear()

	for x in range(size.x):
		var column: Array = []
		for y in range(size.y):
			column.append(null)
		grid.append(column)

## Reset the grid to empty state
func reset() -> void:
	_init_grid()

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

## Check if a tile is blocked (has a combatant)
func is_tile_blocked(pos: Vector2i) -> bool:
	if not is_within_bounds(pos):
		return true
	return grid[pos.x][pos.y] != null

## Check if a tile is empty
func is_tile_empty(pos: Vector2i) -> bool:
	if not is_within_bounds(pos):
		return false
	return grid[pos.x][pos.y] == null

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

	# Player starts on left side, centered vertically
	var player_pos := Vector2i(0, size.y / 2)
	place_combatant(player, player_pos)

	# Enemy spawn positions on the right side of the grid
	# Arranged to maximize coverage while avoiding overlap
	var enemy_spawn_positions := _calculate_enemy_spawn_positions(enemies.size())

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
