class_name VillageGenerator
extends RefCounted

## Generates the village hub map with buildings, paths, and decorations

const WIDTH := 50
const HEIGHT := 40

# Tile types for village
enum VillageTile {
	GRASS,
	PATH,
	COBBLESTONE,
	STONE_BORDER,
	FLOOR,
	WALL,
	DOOR,
	FENCE,
	STALL_COUNTER,
	STALL_FLOOR,
	CAVE_ENTRANCE,
	CAVE_FLOOR,
	CAVE_WALL,
	RUBBLE,
	WALL_CRACKED,
	BOULDER
}

# Building definitions
const BUILDINGS := {
	"town_square": {
		"name": "Town Square",
		"width": 8,
		"height": 8,
		"type": "open",
		"color": Color(0.545, 0.451, 0.333),
		"npcs": ["elder"],
		"position": Vector2i(21, 16)
	},
	"bank": {
		"name": "The Vault",
		"width": 6,
		"height": 5,
		"type": "building",
		"color": Color(0.29, 0.29, 0.29),
		"npcs": ["banker"],
		"position": Vector2i(5, 5)
	},
	"market": {
		"name": "Village Market",
		"width": 14,
		"height": 8,
		"type": "open",
		"color": Color(0.627, 0.322, 0.176),
		"npcs": ["blacksmith", "general_store", "alchemist"],
		"stalls": ["smithy_stall", "general_stall", "alchemist_stall"],
		"position": Vector2i(32, 4)
	},
	"tavern": {
		"name": "The Weary Delver",
		"width": 8,
		"height": 6,
		"type": "building",
		"color": Color(0.396, 0.263, 0.129),
		"npcs": ["innkeeper"],
		"position": Vector2i(5, 25)
	},
	"player_house": {
		"name": "Your Quarters",
		"width": 5,
		"height": 4,
		"type": "building",
		"color": Color(0.365, 0.306, 0.216),
		"npcs": [],
		"position": Vector2i(40, 30)
	},
	"expedition_hall": {
		"name": "Expedition Hall",
		"width": 7,
		"height": 6,
		"type": "building",
		"color": Color(0.294, 0.212, 0.129),
		"npcs": ["expedition_master"],
		"position": Vector2i(20, 5)
	},
	"shrine": {
		"name": "Shrine of Light",
		"width": 4,
		"height": 4,
		"type": "open",
		"color": Color(0.902, 0.902, 0.980),
		"npcs": ["priestess"],
		"position": Vector2i(40, 18)
	},
	"chasm_entrance": {
		"name": "The Chasm",
		"width": 6,
		"height": 4,
		"type": "entrance",
		"color": Color(0.184, 0.094, 0.063),
		"npcs": [],
		"position": Vector2i(22, 32)
	}
}

var tiles: Array = []  # 2D array of VillageTile
var tile_data: Array = []  # 2D array of tile metadata
var buildings: Array = []
var npc_positions: Array = []

## Generate the village map
func generate(world_state: int = 1) -> Dictionary:
	_create_base_map()
	_place_all_buildings()
	_add_paths()
	_add_decorations()
	_apply_world_state(world_state)

	var spawn_point := _find_spawn_point()
	npc_positions = _get_npc_positions()

	return {
		"tiles": tiles,
		"tile_data": tile_data,
		"buildings": buildings,
		"npc_positions": npc_positions,
		"spawn_point": spawn_point,
		"width": WIDTH,
		"height": HEIGHT,
		"world_state": world_state
	}

## Create base map filled with grass
func _create_base_map():
	tiles = []
	tile_data = []

	for y in HEIGHT:
		var tile_row := []
		var data_row := []
		for x in WIDTH:
			tile_row.append(VillageTile.GRASS)
			data_row.append({
				"walkable": true,
				"building_id": "",
				"decoration": "",
				"npc_id": "",
				"is_entrance": false,
				"is_exit_point": false
			})
		tiles.append(tile_row)
		tile_data.append(data_row)

	# Add border fence
	for x in WIDTH:
		tiles[0][x] = VillageTile.FENCE
		tile_data[0][x].walkable = false
		tiles[HEIGHT - 1][x] = VillageTile.FENCE
		tile_data[HEIGHT - 1][x].walkable = false

	for y in HEIGHT:
		tiles[y][0] = VillageTile.FENCE
		tile_data[y][0].walkable = false
		tiles[y][WIDTH - 1] = VillageTile.FENCE
		tile_data[y][WIDTH - 1].walkable = false

## Place all buildings on the map
func _place_all_buildings():
	buildings = []

	for building_id in BUILDINGS:
		var def: Dictionary = BUILDINGS[building_id]
		var building := _create_building(building_id, def)
		_place_building(building)
		buildings.append(building)

## Create a building object
func _create_building(id: String, def: Dictionary) -> Dictionary:
	var pos: Vector2i = def.position
	return {
		"id": id,
		"name": def.name,
		"type": def.type,
		"x": pos.x,
		"y": pos.y,
		"width": def.width,
		"height": def.height,
		"color": def.color,
		"npcs": def.npcs.duplicate(),
		"entrance_x": pos.x + def.width / 2,
		"entrance_y": pos.y + def.height,
		"interior_tiles": [],
		"is_open": def.type == "open" or def.type == "entrance",
		"stall_npcs": [],
		"usable": true,
		"status": "normal"
	}

## Place a building on the map
func _place_building(building: Dictionary):
	var stalls := []
	if building.id == "market":
		stalls = [
			{"id": "smithy_stall", "start_x": 2, "npc_id": "blacksmith"},
			{"id": "general_stall", "start_x": 6, "npc_id": "general_store"},
			{"id": "alchemist_stall", "start_x": 10, "npc_id": "alchemist"}
		]

	for dy in building.height:
		for dx in building.width:
			var x: int = building.x + dx
			var y: int = building.y + dy

			if y < 0 or y >= HEIGHT or x < 0 or x >= WIDTH:
				continue

			var is_edge := dx == 0 or dx == building.width - 1 or dy == 0 or dy == building.height - 1
			var is_entrance := dx == building.width / 2 and dy == building.height - 1

			match building.type:
				"building":
					if is_entrance:
						tiles[y][x] = VillageTile.DOOR
						tile_data[y][x].walkable = true
						tile_data[y][x].building_id = building.id
						tile_data[y][x].is_entrance = true
					elif is_edge:
						tiles[y][x] = VillageTile.WALL
						tile_data[y][x].walkable = false
						tile_data[y][x].building_id = building.id
					else:
						tiles[y][x] = VillageTile.FLOOR
						tile_data[y][x].walkable = true
						tile_data[y][x].building_id = building.id
						building.interior_tiles.append(Vector2i(x, y))

				"open":
					var tile_type := VillageTile.STONE_BORDER if is_edge else VillageTile.COBBLESTONE

					# Handle market stalls
					if building.id == "market" and not is_edge:
						for stall in stalls:
							var stall_width := 3
							var stall_height := 3
							var stall_y := 2

							if dx >= stall.start_x and dx < stall.start_x + stall_width:
								if dy >= stall_y and dy < stall_y + stall_height:
									var is_stall_back := dy == stall_y
									tile_type = VillageTile.STALL_COUNTER if is_stall_back else VillageTile.STALL_FLOOR
									tile_data[y][x].stall_id = stall.id

									# Mark NPC position
									if dx == stall.start_x + 1 and dy == stall_y + 1:
										building.stall_npcs.append({
											"npc_id": stall.npc_id,
											"x": x,
											"y": y,
											"stall_id": stall.id
										})

					tiles[y][x] = tile_type
					tile_data[y][x].walkable = true
					tile_data[y][x].building_id = building.id
					building.interior_tiles.append(Vector2i(x, y))

				"entrance":
					var is_entrance_gap := dx == building.width / 2 and dy == building.height - 1

					if is_entrance_gap:
						tiles[y][x] = VillageTile.CAVE_ENTRANCE
						tile_data[y][x].walkable = true
						tile_data[y][x].building_id = building.id
						tile_data[y][x].is_exit_point = true
						building.interior_tiles.append(Vector2i(x, y))
					elif is_edge:
						tiles[y][x] = VillageTile.CAVE_WALL
						tile_data[y][x].walkable = false
						tile_data[y][x].building_id = building.id
					else:
						tiles[y][x] = VillageTile.CAVE_FLOOR
						tile_data[y][x].walkable = true
						tile_data[y][x].building_id = building.id
						tile_data[y][x].is_exit_point = true
						building.interior_tiles.append(Vector2i(x, y))

## Add paths between buildings
func _add_paths():
	var town_square: Dictionary
	for b in buildings:
		if b.id == "town_square":
			town_square = b
			break

	if town_square.is_empty():
		return

	var center_x := town_square.x + town_square.width / 2
	var center_y := town_square.y + town_square.height / 2

	for building in buildings:
		if building.id == "town_square":
			continue
		_create_path(building.entrance_x, building.entrance_y, center_x, center_y)

## Create an L-shaped path between two points
func _create_path(x1: int, y1: int, x2: int, y2: int):
	var dx := 1 if x2 > x1 else -1
	var dy := 1 if y2 > y1 else -1

	var x := x1
	var y := y1

	# Horizontal segment
	while x != x2:
		if y >= 0 and y < HEIGHT and x >= 0 and x < WIDTH:
			if tiles[y][x] == VillageTile.GRASS:
				tiles[y][x] = VillageTile.PATH
				tile_data[y][x].walkable = true
		x += dx

	# Vertical segment
	while y != y2:
		if y >= 0 and y < HEIGHT and x >= 0 and x < WIDTH:
			if tiles[y][x] == VillageTile.GRASS:
				tiles[y][x] = VillageTile.PATH
				tile_data[y][x].walkable = true
		y += dy

## Add decorative elements
func _add_decorations():
	# Add trees
	for i in 15:
		var x := 2 + randi() % (WIDTH - 4)
		var y := 2 + randi() % (HEIGHT - 4)

		if tiles[y][x] == VillageTile.GRASS and tile_data[y][x].decoration == "":
			tile_data[y][x].decoration = "tree"
			tile_data[y][x].walkable = false

	# Add bushes and flowers
	for i in 20:
		var x := 2 + randi() % (WIDTH - 4)
		var y := 2 + randi() % (HEIGHT - 4)

		if tiles[y][x] == VillageTile.GRASS and tile_data[y][x].decoration == "":
			var deco := "bush" if randf() > 0.5 else "flowers"
			tile_data[y][x].decoration = deco
			if deco == "bush":
				tile_data[y][x].walkable = false

	# Add well in town square center
	for b in buildings:
		if b.id == "town_square":
			var well_x := b.x + b.width / 2
			var well_y := b.y + b.height / 2
			if tiles[well_y][well_x] == VillageTile.COBBLESTONE:
				tile_data[well_y][well_x].decoration = "well"
				tile_data[well_y][well_x].walkable = false
			break

	# Add benches near building entrances
	for building in buildings:
		if building.type == "building":
			var bench_x := building.entrance_x + 1
			var bench_y := building.entrance_y + 1
			if bench_y < HEIGHT and bench_x < WIDTH:
				if tiles[bench_y][bench_x] in [VillageTile.GRASS, VillageTile.PATH]:
					tile_data[bench_y][bench_x].decoration = "bench"

## Apply world state effects (degradation)
func _apply_world_state(world_state: int):
	if world_state <= 1:
		return  # Normal state, no changes

	var crack_chance := 0.0
	var rubble_chance := 0.0
	var fire_chance := 0.0

	match world_state:
		2:  # ASH
			crack_chance = 0.05
		3:  # BURNING
			crack_chance = 0.15
			rubble_chance = 0.05
			fire_chance = 0.02
		4:  # ENDGAME
			crack_chance = 0.25
			rubble_chance = 0.10
			fire_chance = 0.05

	for y in HEIGHT:
		for x in WIDTH:
			if randf() < crack_chance:
				if tiles[y][x] in [VillageTile.PATH, VillageTile.COBBLESTONE]:
					tile_data[y][x].cracked = true

			if randf() < rubble_chance:
				if tiles[y][x] == VillageTile.WALL:
					tiles[y][x] = VillageTile.RUBBLE
					tile_data[y][x].walkable = false

			if randf() < fire_chance:
				if tiles[y][x] in [VillageTile.GRASS, VillageTile.FLOOR]:
					tile_data[y][x].on_fire = true

	# Crush bank in BURNING state
	if world_state >= 3:
		for b in buildings:
			if b.id == "bank":
				_crush_building(b)
				break

## Apply crushed building effect
func _crush_building(building: Dictionary):
	for dy in building.height:
		for dx in building.width:
			var x := building.x + dx
			var y := building.y + dy

			if y < 0 or y >= HEIGHT or x < 0 or x >= WIDTH:
				continue

			var is_edge := dx == 0 or dx == building.width - 1 or dy == 0 or dy == building.height - 1

			if randf() < 0.7:
				tiles[y][x] = VillageTile.RUBBLE
				tile_data[y][x].walkable = false
			elif is_edge:
				tiles[y][x] = VillageTile.WALL_CRACKED
				tile_data[y][x].walkable = false

	# Place boulder in center
	var center_x := building.x + building.width / 2
	var center_y := building.y + building.height / 2
	tiles[center_y][center_x] = VillageTile.BOULDER
	tile_data[center_y][center_x].walkable = false
	tile_data[center_y][center_x].interactable = true
	tile_data[center_y][center_x].interaction_type = "emergency_safe"

	building.crushed = true
	building.usable = false
	building.status = "crushed"

## Find player spawn point
func _find_spawn_point() -> Vector2i:
	# Spawn in front of player house
	for b in buildings:
		if b.id == "player_house":
			return Vector2i(b.entrance_x, b.entrance_y + 1)

	# Fallback: town square center
	for b in buildings:
		if b.id == "town_square":
			return Vector2i(b.x + b.width / 2, b.y + b.height / 2)

	return Vector2i(WIDTH / 2, HEIGHT / 2)

## Get NPC positions
func _get_npc_positions() -> Array:
	var positions := []

	for building in buildings:
		if building.npcs.is_empty() and building.stall_npcs.is_empty():
			continue
		if not building.usable:
			continue

		# Handle market stall NPCs
		if building.id == "market" and not building.stall_npcs.is_empty():
			for stall_npc in building.stall_npcs:
				positions.append({
					"npc_id": stall_npc.npc_id,
					"x": stall_npc.x,
					"y": stall_npc.y,
					"building_id": building.id,
					"stall_id": stall_npc.stall_id
				})
			continue

		# Regular building NPCs
		for i in building.npcs.size():
			var npc_id: String = building.npcs[i]
			var x: int
			var y: int

			if not building.interior_tiles.is_empty():
				var tile: Vector2i = building.interior_tiles[mini(i, building.interior_tiles.size() - 1)]
				x = tile.x
				y = tile.y
			else:
				x = building.entrance_x
				y = building.entrance_y - 1

			positions.append({
				"npc_id": npc_id,
				"x": x,
				"y": y,
				"building_id": building.id
			})

	return positions

## Check if position is walkable
func is_walkable(pos: Vector2i) -> bool:
	if pos.x < 0 or pos.x >= WIDTH or pos.y < 0 or pos.y >= HEIGHT:
		return false
	return tile_data[pos.y][pos.x].walkable

## Check if position is chasm entrance
func is_chasm_entrance(pos: Vector2i) -> bool:
	if pos.x < 0 or pos.x >= WIDTH or pos.y < 0 or pos.y >= HEIGHT:
		return false
	return tile_data[pos.y][pos.x].is_exit_point

## Get building at position
func get_building_at(pos: Vector2i) -> String:
	if pos.x < 0 or pos.x >= WIDTH or pos.y < 0 or pos.y >= HEIGHT:
		return ""
	return tile_data[pos.y][pos.x].building_id

## Get building by ID
func get_building_by_id(id: String) -> Dictionary:
	for b in buildings:
		if b.id == id:
			return b
	return {}
