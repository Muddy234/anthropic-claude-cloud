class_name VillageSystem
extends BaseSystem
## Village hub management: grid-based movement, NPC interaction, shop
## inventories, building upgrades, quest board, rest heal, and village events.

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

const INTERACTION_RANGE: int = 1
const REST_HEAL_PERCENT: float = 1.0  # 100% heal at inn
const SHOP_REFRESH_ITEMS: int = 8

# NPC facility types
const FACILITY_BLACKSMITH: String = "blacksmith"
const FACILITY_ALCHEMIST: String = "alchemist"
const FACILITY_BANKER: String = "banker"
const FACILITY_GENERAL_STORE: String = "general_store"
const FACILITY_INNKEEPER: String = "innkeeper"
const FACILITY_ELDER: String = "elder"
const FACILITY_PRIESTESS: String = "priestess"
const FACILITY_EXPEDITION: String = "expedition_master"
const FACILITY_TRAINER: String = "trainer"
const FACILITY_BOUNTY_BOARD: String = "bounty_board"

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

var _is_in_village: bool = false
var _shop_inventories: Dictionary = {}  # npc_id -> Array[Dictionary]
var _npc_positions: Dictionary = {}     # npc_id -> Vector2i
var _interacting_npc: String = ""
var _buildings_upgraded: Array[String] = []

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "village_system"
	priority = 50


func initialize() -> void:
	EventBus.game_state_changed.connect(_on_game_state_changed_village)


func process_system(_delta: float) -> void:
	if not _is_in_village:
		return


func cleanup() -> void:
	_interacting_npc = ""


func on_state_changed(_old_state: int, new_state: int) -> void:
	if new_state == Constants.GameState.VILLAGE:
		_enter_village()
	elif _is_in_village:
		_exit_village()


# ---------------------------------------------------------------------------
# Movement (grid-based, no diagonals)
# ---------------------------------------------------------------------------

## Move the player one tile in the given direction. Returns true if move was valid.
func move_player(direction: Vector2i) -> bool:
	if not _is_in_village:
		return false
	if GameManager.village_state == null:
		return false

	# Only cardinal directions
	if direction.x != 0 and direction.y != 0:
		return false
	if absi(direction.x) + absi(direction.y) != 1:
		return false

	var current_pos: Vector2 = GameManager.village_state.player_position
	var target: Vector2i = Vector2i(current_pos) + direction

	# Check walkability
	if not _is_tile_walkable(target):
		return false

	GameManager.village_state.player_position = Vector2(target)
	return true


## Check tile walkability in the village map.
func _is_tile_walkable(pos: Vector2i) -> bool:
	if GameManager.village_state == null:
		return false
	var vmap: Array = GameManager.village_state.map
	if vmap.is_empty():
		return true  # No map loaded, allow movement
	if pos.y < 0 or pos.y >= vmap.size():
		return false
	var row = vmap[pos.y]
	if row is Array:
		if pos.x < 0 or pos.x >= row.size():
			return false
		var tile = row[pos.x]
		if tile is Dictionary:
			return tile.get("walkable", true)
		return true
	return false


# ---------------------------------------------------------------------------
# NPC Interaction
# ---------------------------------------------------------------------------

## Interact with the nearest NPC. Returns NPC data dict or empty.
func interact() -> Dictionary:
	if GameManager.village_state == null:
		return {}

	var nearby: Array[Dictionary] = get_nearby_npcs(INTERACTION_RANGE)
	if nearby.is_empty():
		return {}

	var npc: Dictionary = nearby[0]
	var npc_id: String = npc.get("id", "")
	_interacting_npc = npc_id

	GameManager.village_state.active_npc = npc_id
	return npc


## Interact with a specific NPC by ID.
func interact_with_npc(npc_id: String) -> void:
	_interacting_npc = npc_id
	if GameManager.village_state != null:
		GameManager.village_state.active_npc = npc_id

	# Determine interaction type from NPC data
	var npc_data: Dictionary = _get_npc_data(npc_id)
	var role: int = npc_data.get("role", Constants.NpcRole.SHOPKEEPER)

	match role:
		Constants.NpcRole.SHOPKEEPER:
			GameManager.change_state(Constants.GameState.SHOP)
		Constants.NpcRole.BANKER:
			GameManager.change_state(Constants.GameState.SHOP)
		Constants.NpcRole.BLACKSMITH, Constants.NpcRole.ALCHEMIST:
			GameManager.change_state(Constants.GameState.CRAFTING)
		Constants.NpcRole.QUEST_GIVER, Constants.NpcRole.ELDER:
			GameManager.change_state(Constants.GameState.DIALOGUE)
		Constants.NpcRole.INNKEEPER:
			_rest_at_inn()
		Constants.NpcRole.EXPEDITION_MASTER:
			_start_expedition()
		_:
			GameManager.change_state(Constants.GameState.DIALOGUE)


## End interaction with current NPC.
func end_interaction() -> void:
	_interacting_npc = ""
	if GameManager.village_state != null:
		GameManager.village_state.active_npc = ""
	GameManager.change_state(Constants.GameState.VILLAGE)


## Get NPCs within interaction range of the player.
func get_nearby_npcs(range_tiles: int = 1) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	if GameManager.village_state == null:
		return result

	var player_pos: Vector2i = Vector2i(GameManager.village_state.player_position)

	for npc in GameManager.village_state.npcs:
		var npc_pos: Vector2i = Vector2i(npc.get("x", 0), npc.get("y", 0))
		var dist: int = absi(npc_pos.x - player_pos.x) + absi(npc_pos.y - player_pos.y)
		if dist <= range_tiles:
			result.append(npc)

	return result


## Get current interacting NPC ID.
func get_active_npc() -> String:
	return _interacting_npc


# ---------------------------------------------------------------------------
# Shop
# ---------------------------------------------------------------------------

## Get shop inventory for an NPC. Generates if not yet created this run.
func get_shop_inventory(npc_id: String) -> Array[Dictionary]:
	if _shop_inventories.has(npc_id):
		return _shop_inventories[npc_id]

	# Generate new inventory
	var inventory: Array[Dictionary] = _generate_shop_inventory(npc_id)
	_shop_inventories[npc_id] = inventory
	return inventory


## Buy an item from a shop.
func buy_item(npc_id: String, item_index: int) -> bool:
	if GameManager.run_state == null:
		return false

	var shop: Array[Dictionary] = get_shop_inventory(npc_id)
	if item_index < 0 or item_index >= shop.size():
		return false

	var item: Dictionary = shop[item_index]
	var price: int = item.get("price", 0)

	if GameManager.run_state.gold < price:
		return false

	GameManager.run_state.gold -= price
	GameManager.run_state.inventory.append(item.get("item", item))

	# Remove from shop
	shop.remove_at(item_index)
	return true


## Sell an item to a shop.
func sell_item(inventory_index: int, npc_id: String) -> int:
	if GameManager.run_state == null:
		return 0
	if inventory_index < 0 or inventory_index >= GameManager.run_state.inventory.size():
		return 0

	var item = GameManager.run_state.inventory[inventory_index]
	var base_value: int = 10
	if item is Dictionary:
		base_value = item.get("gold_value", item.get("price", 10))

	var sell_mult: float = 0.5
	var npc_data: Dictionary = _get_npc_data(npc_id)
	if not npc_data.is_empty():
		sell_mult = npc_data.get("sell_multiplier", 0.5)

	var sell_price: int = maxi(1, int(float(base_value) * sell_mult))
	GameManager.run_state.gold += sell_price
	GameManager.run_state.inventory.remove_at(inventory_index)
	return sell_price


func _generate_shop_inventory(npc_id: String) -> Array[Dictionary]:
	var items: Array[Dictionary] = []
	var npc_data: Dictionary = _get_npc_data(npc_id)
	var shop_ids: Array = npc_data.get("shop_inventory", [])

	if shop_ids.is_empty():
		# Generate generic items
		for i in SHOP_REFRESH_ITEMS:
			items.append({
				"item_id": "potion_%d" % i,
				"display_name": "Health Potion",
				"price": 25 + randi() % 20,
				"type": "consumable",
			})
	else:
		for item_id in shop_ids:
			items.append({
				"item_id": item_id,
				"display_name": item_id.replace("_", " ").capitalize(),
				"price": 20 + randi() % 50,
			})

	return items


# ---------------------------------------------------------------------------
# Inn / Rest
# ---------------------------------------------------------------------------

func _rest_at_inn() -> void:
	if GameManager.player == null:
		return
	if GameManager.player.has_method("heal_percent"):
		GameManager.player.heal_percent(REST_HEAL_PERCENT)
	elif GameManager.player.has_method("heal"):
		var max_hp: float = float(Constants.PLAYER_CONFIG.get("base_hp", 100))
		GameManager.player.heal(max_hp)


# ---------------------------------------------------------------------------
# Expedition
# ---------------------------------------------------------------------------

func _start_expedition() -> void:
	GameManager.start_new_run()
	GameManager.change_state(Constants.GameState.PLAYING)


# ---------------------------------------------------------------------------
# Building upgrades
# ---------------------------------------------------------------------------

## Upgrade a building. Persistent.
func upgrade_building(building_id: String) -> bool:
	if _buildings_upgraded.has(building_id):
		return false

	_buildings_upgraded.append(building_id)

	if GameManager.persistent_state != null:
		if not GameManager.persistent_state.village_improvements.has(building_id):
			GameManager.persistent_state.village_improvements.append(building_id)
		SaveManager.save_game(GameManager.persistent_state)

	return true


## Check if a building is upgraded.
func is_building_upgraded(building_id: String) -> bool:
	return _buildings_upgraded.has(building_id)


## Get all upgraded buildings.
func get_upgraded_buildings() -> Array[String]:
	return _buildings_upgraded.duplicate()


# ---------------------------------------------------------------------------
# Village enter/exit
# ---------------------------------------------------------------------------

func _enter_village() -> void:
	_is_in_village = true
	# Refresh shop inventories each run
	_shop_inventories.clear()

	# Load persistent building upgrades
	if GameManager.persistent_state != null:
		_buildings_upgraded.clear()
		for b in GameManager.persistent_state.village_improvements:
			_buildings_upgraded.append(b)


func _exit_village() -> void:
	_is_in_village = false
	_interacting_npc = ""


## Whether the player is currently in the village.
func is_in_village() -> bool:
	return _is_in_village


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

func _get_npc_data(npc_id: String) -> Dictionary:
	if GameManager.village_state == null:
		return {}
	for npc in GameManager.village_state.npcs:
		if npc.get("id", "") == npc_id:
			return npc
	return {}


func _on_game_state_changed_village(old_state: int, new_state: int) -> void:
	# Already handled by on_state_changed from BaseSystem
	pass
