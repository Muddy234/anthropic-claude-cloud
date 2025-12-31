class_name Dungeon
extends Node2D

## Main dungeon scene - manages tilemap, fog of war, and floor generation

@onready var tile_map: TileMapLayer = $TileMap
@onready var fog_of_war: TileMapLayer = $FogOfWar
@onready var entities_container: Node2D = $Entities

var generator: DungeonGenerator
var current_data: Dictionary
var explored: Array  # 2D bool array

# Fog states
const FOG_HIDDEN := 0
const FOG_EXPLORED := 1
const FOG_VISIBLE := 2

# Terrain set and terrain indices (configure these after setting up TileSet terrains)
const TERRAIN_SET := 0  # Index of terrain set in TileSet
const TERRAIN_WALL := 0  # Index of wall terrain within the set
const TERRAIN_FLOOR := 1  # Index of floor terrain within the set

# Whether to use terrain-based autotiling (set to true once terrains are configured)
var use_autotiling := false  # Temporarily disabled for debugging

# Fallback tile atlas coordinates (used when autotiling is disabled or for special tiles)
# Based on walls_floor.png tileset (16x16 tiles)
const TILE_ATLAS := {
	Constants.TileType.WALL: Vector2i(4, 1),      # Stone wall (textured)
	Constants.TileType.FLOOR: Vector2i(1, 1),     # Floor tile
	Constants.TileType.DOOR: Vector2i(0, 3),      # Door frame
	Constants.TileType.DOOR_LOCKED: Vector2i(1, 3), # Locked door (door variant)
	Constants.TileType.STAIRS_DOWN: Vector2i(2, 5), # Using floor variant for now
	Constants.TileType.STAIRS_UP: Vector2i(0, 5),   # Using floor variant for now
	Constants.TileType.WATER: Vector2i(0, 0),     # Dark tile (placeholder)
	Constants.TileType.LAVA: Vector2i(0, 0),      # Dark tile (placeholder)
	Constants.TileType.PIT: Vector2i(0, 0)        # Dark/void tile
}

func _ready():
	generator = DungeonGenerator.new()
	GameManager.dungeon = self

## Generate a new floor
func generate_floor(floor_num: int):
	# Clear existing entities
	for child in entities_container.get_children():
		child.queue_free()

	# Generate dungeon data
	current_data = generator.generate(
		Constants.MAP_WIDTH,
		Constants.MAP_HEIGHT,
		floor_num
	)

	# Initialize explored array
	_init_explored()

	# Render tiles
	_render_tiles()

	# Spawn player at spawn point
	_spawn_player(current_data.player_spawn)

	# Spawn enemies
	_spawn_enemies(current_data.enemy_spawns, floor_num)

	# Spawn items
	_spawn_items(current_data.item_spawns, floor_num)

	# Spawn NPCs
	_spawn_npcs(current_data.npc_spawns)

	# Initialize fog of war
	_init_fog()

	# Update visibility around player
	if GameManager.player:
		update_visibility(GameManager.player.grid_pos, Constants.DEFAULT_VISION_RANGE)

	EventBus.floor_entered.emit(floor_num)

## Initialize explored array
func _init_explored():
	explored = []
	for x in Constants.MAP_WIDTH:
		var column := []
		for y in Constants.MAP_HEIGHT:
			column.append(false)
		explored.append(column)

## Render tiles to tilemap
func _render_tiles():
	tile_map.clear()

	if use_autotiling:
		_render_tiles_with_terrain()
	else:
		_render_tiles_simple()

## Simple tile rendering (no autotiling)
func _render_tiles_simple():
	print("DEBUG: _render_tiles_simple called")
	print("DEBUG: current_data.tiles size: ", current_data.tiles.size())
	print("DEBUG: tile_map: ", tile_map)
	print("DEBUG: tile_map.tile_set: ", tile_map.tile_set)

	# Get the source ID from the tileset
	var source_id := 0
	if tile_map.tile_set and tile_map.tile_set.get_source_count() > 0:
		source_id = tile_map.tile_set.get_source_id(0)
		print("DEBUG: Using source_id: ", source_id)

	var tiles_placed := 0
	for x: int in current_data.tiles.size():
		for y: int in current_data.tiles[x].size():
			var tile_type: Constants.TileType = current_data.tiles[x][y]
			var atlas_coords: Vector2i = TILE_ATLAS.get(tile_type, Vector2i(0, 0))
			# TileMapLayer API: set_cell(coords, source_id, atlas_coords)
			tile_map.set_cell(Vector2i(x, y), source_id, atlas_coords)
			tiles_placed += 1

	print("DEBUG: Tiles placed: ", tiles_placed)

## Terrain-based rendering with autotiling
func _render_tiles_with_terrain():
	# Collect cells by terrain type for batch processing
	var wall_cells: Array[Vector2i] = []
	var floor_cells: Array[Vector2i] = []
	var special_cells: Array[Dictionary] = []  # For doors, stairs, etc.

	for x: int in current_data.tiles.size():
		for y: int in current_data.tiles[x].size():
			var tile_type: Constants.TileType = current_data.tiles[x][y]
			var pos := Vector2i(x, y)

			match tile_type:
				Constants.TileType.WALL:
					wall_cells.append(pos)
				Constants.TileType.FLOOR:
					floor_cells.append(pos)
				_:
					# Special tiles (doors, stairs, etc.) use direct atlas placement
					special_cells.append({"pos": pos, "type": tile_type})

	# Use set_cells_terrain_connect for autotiling
	# TileMapLayer API: set_cells_terrain_connect(cells, terrain_set, terrain)
	tile_map.set_cells_terrain_connect(floor_cells, TERRAIN_SET, TERRAIN_FLOOR)
	tile_map.set_cells_terrain_connect(wall_cells, TERRAIN_SET, TERRAIN_WALL)

	# Place special tiles directly
	for cell in special_cells:
		var atlas_coords: Vector2i = TILE_ATLAS.get(cell.type, Vector2i(0, 0))
		tile_map.set_cell(cell.pos, 0, atlas_coords)

## Initialize fog of war
func _init_fog():
	if not fog_of_war:
		return
	fog_of_war.clear()

	for x: int in Constants.MAP_WIDTH:
		for y: int in Constants.MAP_HEIGHT:
			# TileMapLayer API: set_cell(coords, source_id, atlas_coords)
			fog_of_war.set_cell(Vector2i(x, y), 0, Vector2i(0, 0))

## Update visibility around a point
func update_visibility(center: Vector2i, radius: int):
	# Reset all to explored (dim) state
	for x in Constants.MAP_WIDTH:
		for y in Constants.MAP_HEIGHT:
			if explored[x][y]:
				_set_fog(Vector2i(x, y), FOG_EXPLORED)

	# Calculate visible tiles using shadowcasting
	var visible_tiles := _calculate_fov(center, radius)

	for pos in visible_tiles:
		if pos.x >= 0 and pos.x < Constants.MAP_WIDTH and pos.y >= 0 and pos.y < Constants.MAP_HEIGHT:
			explored[pos.x][pos.y] = true
			_set_fog(pos, FOG_VISIBLE)

## Set fog state for a tile
func _set_fog(pos: Vector2i, state: int):
	if not fog_of_war:
		return
	match state:
		FOG_HIDDEN:
			fog_of_war.set_cell(pos, 0, Vector2i(0, 0))  # Full black
		FOG_EXPLORED:
			fog_of_war.set_cell(pos, 0, Vector2i(1, 0))  # Dim/gray
		FOG_VISIBLE:
			fog_of_war.set_cell(pos, -1)  # Clear (no tile)

## Calculate field of view using recursive shadowcasting
func _calculate_fov(center: Vector2i, radius: int) -> Array[Vector2i]:
	var visible_cells: Array[Vector2i] = [center]

	# Simple circular FOV with line-of-sight check
	for x in range(center.x - radius, center.x + radius + 1):
		for y in range(center.y - radius, center.y + radius + 1):
			var pos := Vector2i(x, y)
			var dist := center.distance_to(Vector2(pos))

			if dist <= radius and generator.has_line_of_sight(center, pos):
				visible_cells.append(pos)

	return visible_cells

## Spawn player
func _spawn_player(spawn_pos: Vector2i):
	# Validate spawn position - ensure player doesn't spawn in wall or void
	var valid_pos := _find_valid_spawn_position(spawn_pos)
	# Calculate centered position on the tile
	var centered_pos := Vector2(valid_pos) * Constants.TILE_SIZE + Vector2(Constants.TILE_SIZE / 2.0, Constants.TILE_SIZE / 2.0)

	if GameManager.player:
		GameManager.player.grid_pos = valid_pos
		GameManager.player.position = centered_pos
		return

	var player_scene := preload("res://scenes/entities/player/player.tscn")
	var player: Player = player_scene.instantiate()
	player.grid_pos = valid_pos
	player.position = centered_pos
	entities_container.add_child(player)

## Find a valid spawn position, with fallbacks if the provided position is invalid
func _find_valid_spawn_position(desired_pos: Vector2i) -> Vector2i:
	# First check: is the desired position already valid?
	if is_walkable(desired_pos):
		return desired_pos

	push_warning("Player spawn position invalid at %s, searching for valid position..." % desired_pos)

	# Second check: search adjacent tiles (8 directions)
	for dir: Vector2i in Constants.ALL_DIRECTIONS:
		var adjacent_pos: Vector2i = desired_pos + dir
		if is_walkable(adjacent_pos):
			return adjacent_pos

	# Third check: search in expanding rings around the position
	for radius in range(2, 10):
		for dx in range(-radius, radius + 1):
			for dy in range(-radius, radius + 1):
				if abs(dx) == radius or abs(dy) == radius:  # Only check perimeter
					var check_pos := desired_pos + Vector2i(dx, dy)
					if is_walkable(check_pos):
						return check_pos

	# Fourth check: search all rooms for any walkable tile
	for room in current_data.rooms:
		for x in range(room.position.x + 1, room.end.x - 1):
			for y in range(room.position.y + 1, room.end.y - 1):
				var room_pos := Vector2i(x, y)
				if is_walkable(room_pos):
					return room_pos

	# Last resort: search entire map
	for x in Constants.MAP_WIDTH:
		for y in Constants.MAP_HEIGHT:
			var map_pos := Vector2i(x, y)
			if is_walkable(map_pos):
				return map_pos

	# Absolute fallback - should never happen if dungeon generated correctly
	push_error("No valid spawn position found! Using center of map.")
	return Vector2i(Constants.MAP_WIDTH / 2, Constants.MAP_HEIGHT / 2)

## Spawn enemies
func _spawn_enemies(spawns: Array, floor_num: int):
	print("DEBUG: _spawn_enemies called with %d spawn points for floor %d" % [spawns.size(), floor_num])

	for spawn_data in spawns:
		var pos: Vector2i = spawn_data.position

		# Get appropriate monster for floor
		var monster_data := _get_monster_for_floor(floor_num)
		if monster_data:
			print("DEBUG: Spawning '%s' at position %s" % [monster_data.name, pos])
			GameManager.spawn_enemy(monster_data, pos)
		else:
			print("DEBUG: No monster data found for floor %d!" % floor_num)

## Cached monster data
var _monster_cache: Array[MonsterData] = []

## Get a random monster appropriate for the floor
func _get_monster_for_floor(floor_num: int) -> MonsterData:
	# Load monsters on first call
	if _monster_cache.is_empty():
		_load_monster_data()

	# Filter monsters that can spawn on this floor
	var valid_monsters: Array[MonsterData] = []
	var total_weight: float = 0.0

	for monster in _monster_cache:
		if monster.can_spawn_on_floor(floor_num):
			valid_monsters.append(monster)
			total_weight += monster.spawn_weight

	if valid_monsters.is_empty():
		return null

	# Weighted random selection
	var roll := randf() * total_weight
	var cumulative: float = 0.0

	for monster in valid_monsters:
		cumulative += monster.spawn_weight
		if roll <= cumulative:
			return monster

	return valid_monsters[0]

## Load all monster data from resources
func _load_monster_data():
	print("DEBUG: Loading monster data from resources/monsters/")
	var dir := DirAccess.open("res://resources/monsters/")
	if not dir:
		push_warning("Could not open monsters directory")
		print("DEBUG: ERROR - Could not open monsters directory!")
		return

	dir.list_dir_begin()
	var file_name := dir.get_next()

	while file_name != "":
		if file_name.ends_with(".tres"):
			var path := "res://resources/monsters/" + file_name
			var monster := load(path) as MonsterData
			if monster:
				_monster_cache.append(monster)
				print("DEBUG: Loaded monster '%s' (floors %d-%d, weight %.1f)" % [
					monster.name, monster.min_floor, monster.max_floor, monster.spawn_weight
				])
			else:
				print("DEBUG: Failed to load monster from %s" % path)
		file_name = dir.get_next()

	dir.list_dir_end()
	print("DEBUG: Loaded %d monster types total" % _monster_cache.size())

## Spawn items
func _spawn_items(spawns: Array, floor_num: int):
	for spawn_data in spawns:
		var _pos: Vector2i = spawn_data.position
		# TODO: Generate random item appropriate for floor
		# GameManager.spawn_item(item, pos)
		pass

## Spawn NPCs
func _spawn_npcs(spawns: Array):
	for spawn_data in spawns:
		var pos: Vector2i = spawn_data.position
		var npc_type: String = spawn_data.type

		var npc_scene := preload("res://scenes/entities/npc/npc.tscn")
		var npc: NPC = npc_scene.instantiate()
		npc.grid_pos = pos
		npc.is_merchant = npc_type == "merchant"
		npc.has_quest = npc_type == "quest_giver"
		entities_container.add_child(npc)

## Check if a position is walkable
func is_walkable(pos: Vector2i) -> bool:
	return generator.is_walkable(pos)

## Check line of sight
func has_line_of_sight(from: Vector2i, to: Vector2i) -> bool:
	return generator.has_line_of_sight(from, to)

## Get tile type at position
func get_tile_type(pos: Vector2i) -> Constants.TileType:
	if pos.x < 0 or pos.x >= Constants.MAP_WIDTH or pos.y < 0 or pos.y >= Constants.MAP_HEIGHT:
		return Constants.TileType.WALL

	return current_data.tiles[pos.x][pos.y]

## Find path between two points (A*)
func find_path(from: Vector2i, to: Vector2i) -> Array[Vector2i]:
	var open_set := [from]
	var came_from := {}
	var g_score := {from: 0}
	var f_score := {from: _heuristic(from, to)}

	while not open_set.is_empty():
		# Get node with lowest f_score
		var current: Vector2i = open_set[0]
		var current_f: float = f_score.get(current, INF)
		for node in open_set:
			var node_f: float = f_score.get(node, INF)
			if node_f < current_f:
				current = node
				current_f = node_f

		if current == to:
			return _reconstruct_path(came_from, current)

		open_set.erase(current)

		# Check neighbors
		for dir in Constants.ALL_DIRECTIONS:
			var neighbor: Vector2i = current + dir

			if not is_walkable(neighbor):
				continue

			var tentative_g: float = g_score.get(current, INF) + 1

			if tentative_g < g_score.get(neighbor, INF):
				came_from[neighbor] = current
				g_score[neighbor] = tentative_g
				f_score[neighbor] = tentative_g + _heuristic(neighbor, to)

				if neighbor not in open_set:
					open_set.append(neighbor)

	return []  # No path found

func _heuristic(a: Vector2i, b: Vector2i) -> float:
	# Chebyshev distance (allows diagonal movement)
	return maxf(abs(a.x - b.x), abs(a.y - b.y))

func _reconstruct_path(came_from: Dictionary, current: Vector2i) -> Array[Vector2i]:
	var path: Array[Vector2i] = [current]

	while came_from.has(current):
		current = came_from[current]
		path.push_front(current)

	return path

## Get room containing a position
func get_room_at(pos: Vector2i) -> Rect2i:
	for room in current_data.rooms:
		if room.has_point(pos):
			return room
	return Rect2i()

## Check if position is explored
func is_explored(pos: Vector2i) -> bool:
	if pos.x < 0 or pos.x >= Constants.MAP_WIDTH or pos.y < 0 or pos.y >= Constants.MAP_HEIGHT:
		return false
	return explored[pos.x][pos.y]
