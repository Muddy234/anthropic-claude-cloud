class_name DungeonIntegration
extends RefCounted
## Wires generator data into the scene tree.
## Orchestrates the full floor generation pipeline: dungeon layout, chamber
## details, enemy spawning, tilemap application, and decoration placement.

# --- Configuration ---
const DECORATION_SHRINE_CHANCE: float = 0.4
const DECORATION_TORCH_SPACING: int = 8
const DECORATION_RUBBLE_CHANCE: float = 0.03
const EXIT_MARKER_RADIUS: int = 2

# --- Generators ---
var dungeon_gen: DungeonGenerator
var chamber_gen: ChamberGenerator
var enemy_spawner: EnemySpawner
var enemy_factory: EnemyFactory
var village_gen: VillageGenerator
var core_gen: CoreGenerator


func _init() -> void:
	dungeon_gen = DungeonGenerator.new()
	chamber_gen = ChamberGenerator.new()
	enemy_spawner = EnemySpawner.new()
	enemy_factory = EnemyFactory.new()
	village_gen = VillageGenerator.new()
	core_gen = CoreGenerator.new()


# =========================================================================
#  Main Floor Generation
# =========================================================================

func generate_floor(
	p_seed: Variant,
	floor_number: int,
	tilemap: Node,
	enemy_container: Node
) -> Vector2i:
	## Full pipeline: dungeon gen -> chamber gen per blob -> enemy spawn -> tilemap.
	## Returns the player spawn position as Vector2i.

	# Step 1: Generate dungeon layout
	var dungeon := dungeon_gen.generate(p_seed, floor_number)
	if not dungeon.valid:
		push_warning("DungeonIntegration: Dungeon generation failed, using fallback")

	# Step 2: Apply base dungeon tilemap
	if tilemap:
		apply_tilemap(dungeon.tiles, dungeon.blobs, dungeon.corridors, tilemap)

	# Step 3: Generate chamber details for each blob
	for blob in dungeon.blobs:
		var doorways_local: Array = []
		for dw in blob.doorways:
			# Convert to local coordinates relative to blob bounds
			doorways_local.append(Vector2i(dw.x - blob.bounds.position.x, dw.y - blob.bounds.position.y))

		var chamber_result := chamber_gen.generate_chambers(
			blob.bounds.size.x,
			blob.bounds.size.y,
			blob.element,
			doorways_local
		)

		# Apply chamber details to the tilemap
		if tilemap:
			apply_chamber_to_tilemap(chamber_result, blob, tilemap)

	# Step 4: Place exit
	if dungeon.exit_position.x < 0:
		dungeon.exit_position = _place_exit(dungeon)

	# Step 5: Spawn enemies in each combat/treasure room
	if enemy_container:
		_spawn_all_enemies(dungeon, floor_number, enemy_container)

	# Step 6: Spawn decorations
	if tilemap:
		spawn_decorations(dungeon, tilemap)

	# Step 7: Determine player spawn position
	var player_spawn := Vector2i.ZERO
	if dungeon.entrance_blob:
		player_spawn = dungeon.entrance_blob.center
	else:
		# Fallback: find first floor tile
		for y in dungeon.height:
			for x in dungeon.width:
				if dungeon.tiles[y][x] == Constants.TileType.FLOOR:
					player_spawn = Vector2i(x, y)
					break
			if player_spawn != Vector2i.ZERO:
				break

	return player_spawn


# =========================================================================
#  Tilemap Application
# =========================================================================

func apply_tilemap(
	grid: Array,
	blobs: Array,
	corridors: Array,
	tilemap: Node
) -> void:
	## Applies the dungeon tile grid to the TileMap node.
	## Uses set_cell for each tile position based on tile type.
	if not tilemap or grid.is_empty():
		return

	var height: int = grid.size()
	var width: int = grid[0].size() if height > 0 else 0

	for y in range(height):
		for x in range(width):
			var tile_type: int = grid[y][x]
			_set_tilemap_cell(tilemap, x, y, tile_type)


func apply_chamber_to_tilemap(
	chamber_result: ChamberGenerator.ChamberResult,
	blob: DungeonGenerator.BlobData,
	tilemap: Node
) -> void:
	## Overlays chamber detail tiles onto the dungeon tilemap.
	## Chamber tiles are in local coordinates; offset by blob bounds.
	if not tilemap or chamber_result.tiles.is_empty():
		return

	var offset_x: int = blob.bounds.position.x
	var offset_y: int = blob.bounds.position.y

	for ly in range(chamber_result.height):
		for lx in range(chamber_result.width):
			var global_x: int = offset_x + lx
			var global_y: int = offset_y + ly

			var tile_type: int = chamber_result.tiles[ly][lx]
			# Only override walls within the blob bounds with CA-generated detail
			if tile_type != Constants.TileType.WALL:
				_set_tilemap_cell(tilemap, global_x, global_y, tile_type)


func _set_tilemap_cell(tilemap: Node, x: int, y: int, tile_type: int) -> void:
	## Sets a single cell on the tilemap. Handles the TileMap API.
	## In Godot 4.3, TileMap uses layers and atlas coordinates.
	if tilemap.has_method("set_cell"):
		# Layer 0, atlas coords mapped from tile type
		var atlas_coords := _tile_type_to_atlas(tile_type)
		tilemap.set_cell(0, Vector2i(x, y), 0, atlas_coords)


func _tile_type_to_atlas(tile_type: int) -> Vector2i:
	## Maps tile types to atlas coordinates in the tileset.
	## These coordinates should match the project's tileset atlas layout.
	match tile_type:
		Constants.TileType.FLOOR: return Vector2i(0, 0)
		Constants.TileType.WALL: return Vector2i(1, 0)
		Constants.TileType.DOOR: return Vector2i(2, 0)
		Constants.TileType.STAIRS_DOWN: return Vector2i(3, 0)
		Constants.TileType.LAVA: return Vector2i(4, 0)
		Constants.TileType.WATER: return Vector2i(5, 0)
		Constants.TileType.ICE: return Vector2i(6, 0)
		Constants.TileType.GRASS: return Vector2i(0, 1)
		Constants.TileType.PATH: return Vector2i(1, 1)
		Constants.TileType.COBBLESTONE: return Vector2i(2, 1)
		Constants.TileType.STONE_BORDER: return Vector2i(3, 1)
		Constants.TileType.FENCE: return Vector2i(4, 1)
		Constants.TileType.CAVE_WALL: return Vector2i(5, 1)
		Constants.TileType.CAVE_FLOOR: return Vector2i(6, 1)
		Constants.TileType.CAVE_ENTRANCE: return Vector2i(7, 1)
		Constants.TileType.VOID: return Vector2i(0, 2)
		Constants.TileType.VOID_CRACK: return Vector2i(1, 2)
		Constants.TileType.PILLAR: return Vector2i(2, 2)
		Constants.TileType.SHRINE: return Vector2i(3, 2)
		Constants.TileType.EXIT: return Vector2i(4, 2)
		_: return Vector2i(0, 0)


# =========================================================================
#  Exit Placement
# =========================================================================

func _place_exit(dungeon: DungeonGenerator.DungeonResult) -> Vector2i:
	## Places the exit in the blob furthest from entrance.
	var best_blob: DungeonGenerator.BlobData = null
	var best_dist: float = 0.0

	for blob in dungeon.blobs:
		if blob == dungeon.entrance_blob:
			continue
		if blob.distance_from_entrance > best_dist:
			best_dist = blob.distance_from_entrance
			best_blob = blob

	if best_blob == null and not dungeon.blobs.is_empty():
		best_blob = dungeon.blobs.back()

	if best_blob == null:
		return Vector2i(dungeon.width / 2, dungeon.height / 2)

	var exit_pos := best_blob.center
	if exit_pos.y >= 0 and exit_pos.y < dungeon.tiles.size():
		if exit_pos.x >= 0 and exit_pos.x < dungeon.tiles[0].size():
			dungeon.tiles[exit_pos.y][exit_pos.x] = Constants.TileType.EXIT
			# Mark surrounding tiles for visibility
			for dy in range(-EXIT_MARKER_RADIUS, EXIT_MARKER_RADIUS + 1):
				for dx in range(-EXIT_MARKER_RADIUS, EXIT_MARKER_RADIUS + 1):
					if dx == 0 and dy == 0:
						continue
					var mx: int = exit_pos.x + dx
					var my: int = exit_pos.y + dy
					if my >= 0 and my < dungeon.tiles.size() and mx >= 0 and mx < dungeon.tiles[0].size():
						if dungeon.tiles[my][mx] == Constants.TileType.WALL:
							dungeon.tiles[my][mx] = Constants.TileType.FLOOR

	return exit_pos


# =========================================================================
#  Enemy Spawning
# =========================================================================

func _spawn_all_enemies(
	dungeon: DungeonGenerator.DungeonResult,
	floor_number: int,
	enemy_container: Node
) -> void:
	var all_enemies: Array = []
	var player_pos := dungeon.entrance_blob.center if dungeon.entrance_blob else Vector2i.ZERO

	# Calculate max distance for normalization
	var max_dist: float = 0.0
	for blob in dungeon.blobs:
		max_dist = maxf(max_dist, blob.distance_from_entrance)

	for blob in dungeon.blobs:
		if blob.room_type == "entrance":
			continue  # Skip entrance room or minimal spawns

		# Build valid tile list for this blob
		var valid_tiles: Array = []
		for tile_pos in blob.tiles:
			valid_tiles.append(tile_pos)

		if valid_tiles.is_empty():
			continue

		# Build room info dictionary
		var room_info: Dictionary = {
			"id": blob.id,
			"area": blob.area,
			"room_type": blob.room_type,
			"element": blob.element,
			"distance_from_entrance": blob.distance_from_entrance,
			"max_distance": max_dist,
			"center": blob.center,
		}

		var spawn_result := enemy_spawner.spawn_enemies_in_room(
			room_info, valid_tiles, floor_number, all_enemies, player_pos
		)

		# Create enemy entities from spawn entries
		for entry in spawn_result.entries:
			var enemy_data := enemy_factory.create_enemy({
				"monster_id": entry.monster_id,
				"position": entry.position,
				"tier": entry.tier,
				"element": entry.element,
				"level": entry.level,
				"scale_factor": entry.scale_factor,
				"behavior": entry.behavior,
				"patrol_points": entry.patrol_points,
			})

			all_enemies.append(enemy_data)

			# If an enemy container node exists, add child node
			if enemy_container and enemy_container.has_method("add_child"):
				var enemy_node := _create_enemy_node(enemy_data)
				if enemy_node:
					enemy_container.add_child(enemy_node)


func _create_enemy_node(enemy_data: Dictionary) -> Node:
	## Creates a Node2D for the enemy entity.
	## In a full implementation, this would instantiate the proper scene.
	var node := Node2D.new()
	node.name = enemy_data.get("unique_id", "enemy")
	node.position = Vector2(
		enemy_data.get("position", Vector2i.ZERO).x * Constants.BASE_TILE_SIZE,
		enemy_data.get("position", Vector2i.ZERO).y * Constants.BASE_TILE_SIZE,
	)

	# Store data on the node via metadata
	for key in enemy_data:
		node.set_meta(key, enemy_data[key])

	return node


# =========================================================================
#  Decoration Placement
# =========================================================================

func spawn_decorations(dungeon: DungeonGenerator.DungeonResult, tilemap: Node) -> void:
	## Places decorative tiles based on room types and dungeon structure.
	if not tilemap:
		return

	var rng := SeededRNG.new(dungeon.seed_value + 777)

	for blob in dungeon.blobs:
		match blob.room_type:
			"shrine":
				# Place shrine marker at center
				if blob.center.y >= 0 and blob.center.y < dungeon.tiles.size():
					if blob.center.x >= 0 and blob.center.x < dungeon.tiles[0].size():
						dungeon.tiles[blob.center.y][blob.center.x] = Constants.TileType.SHRINE
						_set_tilemap_cell(tilemap, blob.center.x, blob.center.y, Constants.TileType.SHRINE)

		# Scatter rubble/decorative tiles
		for tile_pos in blob.tiles:
			if rng.chance(DECORATION_RUBBLE_CHANCE):
				# Place element-themed decoration
				var deco_type := _element_decoration(blob.element)
				if deco_type != Constants.TileType.FLOOR:
					dungeon.tiles[tile_pos.y][tile_pos.x] = deco_type
					_set_tilemap_cell(tilemap, tile_pos.x, tile_pos.y, deco_type)

	# Torch placement along corridors
	for corridor in dungeon.corridors:
		for i in range(0, corridor.tiles.size(), DECORATION_TORCH_SPACING):
			if i < corridor.tiles.size():
				var pos: Vector2i = corridor.tiles[i]
				# Check adjacent wall to place torch
				for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
					var wall_pos := pos + d
					if wall_pos.y >= 0 and wall_pos.y < dungeon.tiles.size() and \
					   wall_pos.x >= 0 and wall_pos.x < dungeon.tiles[0].size():
						if dungeon.tiles[wall_pos.y][wall_pos.x] == Constants.TileType.WALL:
							# Mark the floor tile near the wall as a torch position
							# (actual torch would be a scene instance, we just note it)
							break


func _element_decoration(element: int) -> int:
	## Returns an appropriate decorative tile type for an element.
	match element:
		Constants.Element.FIRE: return Constants.TileType.LAVA
		Constants.Element.ICE: return Constants.TileType.ICE
		Constants.Element.WATER: return Constants.TileType.WATER
		Constants.Element.DEATH: return Constants.TileType.VOID_CRACK
		_: return Constants.TileType.FLOOR  # No decoration


# =========================================================================
#  Village Generation
# =========================================================================

func generate_village(tilemap: Node, npc_container: Node) -> void:
	## Generates the hub village and applies it to the scene tree.
	var village := village_gen.generate()

	if tilemap:
		for y in range(village.height):
			for x in range(village.width):
				_set_tilemap_cell(tilemap, x, y, village.tiles[y][x])

	if npc_container:
		for npc_data in village.npc_positions:
			var npc_node := Node2D.new()
			npc_node.name = npc_data.get("role", "npc")
			npc_node.position = Vector2(
				npc_data.get("x", 0) * Constants.BASE_TILE_SIZE,
				npc_data.get("y", 0) * Constants.BASE_TILE_SIZE,
			)
			for key in npc_data:
				npc_node.set_meta(key, npc_data[key])
			npc_container.add_child(npc_node)


# =========================================================================
#  Arena Generation
# =========================================================================

func generate_arena(width: int, height: int, tilemap: Node) -> void:
	## Generates a boss arena and applies it to the tilemap.
	var arena := core_gen.generate(width, height)

	if tilemap:
		for y in range(arena.height):
			for x in range(arena.width):
				_set_tilemap_cell(tilemap, x, y, arena.tiles[y][x])
