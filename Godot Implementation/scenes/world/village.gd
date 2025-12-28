class_name Village
extends Node2D

## Village hub scene - safe area with NPCs, shops, and the chasm entrance

signal chasm_entered
signal building_entered(building_id: String)
signal npc_interaction_started(npc: Node)

@onready var tile_map: TileMap = $TileMap
@onready var decorations_layer: TileMap = $DecorationsLayer
@onready var buildings_layer: Node2D = $BuildingsLayer
@onready var npcs_container: Node2D = $NPCs
@onready var player_node: CharacterBody2D = $Player

var generator: VillageGenerator
var village_data: Dictionary
var player_position: Vector2  # Continuous position (not grid-based)

# Movement settings (continuous, not turn-based)
const MOVE_SPEED := 4.5  # Tiles per second
const HITBOX_SIZE := 0.35

# Input state
var keys_held := {
	"up": false,
	"down": false,
	"left": false,
	"right": false
}

# Tile atlas coordinates for village tileset
const TILE_ATLAS := {
	VillageGenerator.VillageTile.GRASS: Vector2i(0, 0),
	VillageGenerator.VillageTile.PATH: Vector2i(1, 0),
	VillageGenerator.VillageTile.COBBLESTONE: Vector2i(2, 0),
	VillageGenerator.VillageTile.STONE_BORDER: Vector2i(3, 0),
	VillageGenerator.VillageTile.FLOOR: Vector2i(4, 0),
	VillageGenerator.VillageTile.WALL: Vector2i(5, 0),
	VillageGenerator.VillageTile.DOOR: Vector2i(6, 0),
	VillageGenerator.VillageTile.FENCE: Vector2i(7, 0),
	VillageGenerator.VillageTile.STALL_COUNTER: Vector2i(8, 0),
	VillageGenerator.VillageTile.STALL_FLOOR: Vector2i(9, 0),
	VillageGenerator.VillageTile.CAVE_ENTRANCE: Vector2i(10, 0),
	VillageGenerator.VillageTile.CAVE_FLOOR: Vector2i(11, 0),
	VillageGenerator.VillageTile.CAVE_WALL: Vector2i(12, 0),
	VillageGenerator.VillageTile.RUBBLE: Vector2i(13, 0),
	VillageGenerator.VillageTile.WALL_CRACKED: Vector2i(14, 0),
	VillageGenerator.VillageTile.BOULDER: Vector2i(15, 0)
}

# Decoration atlas
const DECORATION_ATLAS := {
	"tree": Vector2i(0, 1),
	"bush": Vector2i(1, 1),
	"flowers": Vector2i(2, 1),
	"well": Vector2i(3, 1),
	"bench": Vector2i(4, 1),
	"barrel": Vector2i(5, 1),
	"crate": Vector2i(6, 1)
}

func _ready():
	generator = VillageGenerator.new()
	GameManager.village = self

func _process(delta: float):
	if GameManager.current_state != Constants.GameState.VILLAGE:
		return

	_handle_movement(delta)
	_check_interactions()

func _unhandled_input(event: InputEvent):
	if GameManager.current_state != Constants.GameState.VILLAGE:
		return

	# Track held keys for continuous movement
	if event.is_action_pressed("move_up"):
		keys_held.up = true
	elif event.is_action_released("move_up"):
		keys_held.up = false

	if event.is_action_pressed("move_down"):
		keys_held.down = true
	elif event.is_action_released("move_down"):
		keys_held.down = false

	if event.is_action_pressed("move_left"):
		keys_held.left = true
	elif event.is_action_released("move_left"):
		keys_held.left = false

	if event.is_action_pressed("move_right"):
		keys_held.right = true
	elif event.is_action_released("move_right"):
		keys_held.right = false

	# Interaction
	if event.is_action_pressed("interact"):
		_try_interact()

## Generate and display the village
func generate_village(world_state: int = 1):
	village_data = generator.generate(world_state)

	_render_tiles()
	_render_decorations()
	_spawn_npcs()
	_spawn_player()

	EventBus.village_entered.emit()

## Render village tiles to tilemap
func _render_tiles():
	tile_map.clear()

	for y in village_data.tiles.size():
		for x in village_data.tiles[y].size():
			var tile_type: int = village_data.tiles[y][x]
			var atlas_coords := TILE_ATLAS.get(tile_type, Vector2i(0, 0))
			tile_map.set_cell(0, Vector2i(x, y), 0, atlas_coords)

## Render decorations
func _render_decorations():
	decorations_layer.clear()

	for y in village_data.tile_data.size():
		for x in village_data.tile_data[y].size():
			var data: Dictionary = village_data.tile_data[y][x]
			if data.decoration != "":
				var atlas_coords := DECORATION_ATLAS.get(data.decoration, Vector2i(-1, -1))
				if atlas_coords.x >= 0:
					decorations_layer.set_cell(0, Vector2i(x, y), 0, atlas_coords)

## Spawn NPCs at their positions
func _spawn_npcs():
	# Clear existing NPCs
	for child in npcs_container.get_children():
		child.queue_free()

	var npc_scene := preload("res://scenes/entities/npc/npc.tscn")

	for npc_data in village_data.npc_positions:
		var npc: NPC = npc_scene.instantiate()
		npc.grid_pos = Vector2i(npc_data.x, npc_data.y)
		npc.npc_id = npc_data.npc_id
		npc.building_id = npc_data.building_id

		# Load NPC data resource if available
		var npc_resource_path := "res://resources/npcs/%s.tres" % npc_data.npc_id
		if ResourceLoader.exists(npc_resource_path):
			var npc_resource = load(npc_resource_path)
			npc.setup_from_resource(npc_resource)

		npcs_container.add_child(npc)

## Spawn or position the player
func _spawn_player():
	var spawn := village_data.spawn_point
	player_position = Vector2(spawn.x, spawn.y)

	if player_node:
		player_node.position = player_position * Constants.TILE_SIZE

## Handle continuous movement
func _handle_movement(delta: float):
	var dx := 0.0
	var dy := 0.0

	if keys_held.up:
		dy -= 1.0
	if keys_held.down:
		dy += 1.0
	if keys_held.left:
		dx -= 1.0
	if keys_held.right:
		dx += 1.0

	# Normalize diagonal movement
	if dx != 0.0 and dy != 0.0:
		var length := sqrt(dx * dx + dy * dy)
		dx /= length
		dy /= length

	if dx == 0.0 and dy == 0.0:
		return

	var move_amount := MOVE_SPEED * delta
	var new_x := player_position.x + dx * move_amount
	var new_y := player_position.y + dy * move_amount

	# Check if new position is valid
	if _can_move_to(new_x, new_y):
		player_position.x = new_x
		player_position.y = new_y
	else:
		# Try wall sliding
		if dx != 0.0 and _can_move_to(player_position.x + dx * move_amount, player_position.y):
			player_position.x += dx * move_amount
		elif dy != 0.0 and _can_move_to(player_position.x, player_position.y + dy * move_amount):
			player_position.y += dy * move_amount

	# Update player node position
	if player_node:
		player_node.position = player_position * Constants.TILE_SIZE

	# Check for chasm entrance
	var grid_pos := Vector2i(roundi(player_position.x), roundi(player_position.y))
	if generator.is_chasm_entrance(grid_pos):
		_on_chasm_entrance()

## Check if position is valid for movement
func _can_move_to(x: float, y: float) -> bool:
	# Check bounds
	if x < 0.3 or x >= VillageGenerator.WIDTH - 0.3:
		return false
	if y < 0.3 or y >= VillageGenerator.HEIGHT - 0.3:
		return false

	# Check hitbox corners
	var check_points := [
		Vector2(x - HITBOX_SIZE, y - HITBOX_SIZE),
		Vector2(x + HITBOX_SIZE, y - HITBOX_SIZE),
		Vector2(x - HITBOX_SIZE, y + HITBOX_SIZE),
		Vector2(x + HITBOX_SIZE, y + HITBOX_SIZE)
	]

	for point in check_points:
		var tile_pos := Vector2i(int(point.x), int(point.y))
		if not generator.is_walkable(tile_pos):
			return false

	return true

## Check for nearby interactions
func _check_interactions():
	# Highlight nearby NPCs or interactables
	pass

## Try to interact with nearby NPC or object
func _try_interact():
	var grid_pos := Vector2i(roundi(player_position.x), roundi(player_position.y))
	var interaction_range := 1.5

	# Find nearby NPC
	for npc in npcs_container.get_children():
		if not npc is NPC:
			continue

		var npc_pos := Vector2(npc.grid_pos)
		var dist := player_position.distance_to(npc_pos)

		if dist <= interaction_range:
			_interact_with_npc(npc)
			return

	# Check for building interaction
	var building_id := generator.get_building_at(grid_pos)
	if building_id != "":
		_interact_with_building(building_id)

## Interact with an NPC
func _interact_with_npc(npc: NPC):
	npc_interaction_started.emit(npc)
	EventBus.npc_interacted.emit(npc)

	# Open dialogue
	EventBus.dialog_started.emit(npc)

## Interact with a building
func _interact_with_building(building_id: String):
	building_entered.emit(building_id)

	match building_id:
		"bank":
			EventBus.bank_opened.emit()
		"chasm_entrance":
			_on_chasm_entrance()

## Handle entering the chasm (dungeon entrance)
func _on_chasm_entrance():
	chasm_entered.emit()
	EventBus.loadout_opened.emit()

## Get NPC by ID
func get_npc(npc_id: String) -> NPC:
	for npc in npcs_container.get_children():
		if npc is NPC and npc.npc_id == npc_id:
			return npc
	return null

## Get building data
func get_building(building_id: String) -> Dictionary:
	return generator.get_building_by_id(building_id)

## Check if a building is usable
func is_building_usable(building_id: String) -> bool:
	var building := generator.get_building_by_id(building_id)
	return building.get("usable", true)
