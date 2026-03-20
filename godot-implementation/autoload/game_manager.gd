class_name GameManagerDef
extends Node

var current_state: Constants.GameState = Constants.GameState.MENU

var run_state: RunState = null
var persistent_state: PersistentState = null
var village_state: VillageState = null

var player: Node = null
var enemies: Array[Node] = []
var npcs: Array[Node] = []
var ground_loot: Array[Dictionary] = []

var map: Array = []
var rooms: Array[Dictionary] = []
var doorways: Array[Dictionary] = []
var lava_tiles: Dictionary = {}

var camera_position: Vector2 = Vector2.ZERO

func _ready() -> void:
	persistent_state = SaveManager.load_game()
	if persistent_state == null:
		persistent_state = PersistentState.new()

func start_new_run() -> void:
	run_state = RunState.new()
	run_state.active = true
	run_state.run_id = str(randi())
	run_state.start_time = Time.get_unix_time_from_system()

func end_run(survived: bool) -> void:
	if survived:
		_bank_inventory()
	persistent_state.stats.total_runs += 1
	if not survived:
		persistent_state.stats.deaths += 1
	run_state = null
	SaveManager.save_game(persistent_state)

func change_state(new_state: Constants.GameState) -> void:
	var old_state := current_state
	current_state = new_state
	EventBus.game_state_changed.emit(old_state, new_state)

func _bank_inventory() -> void:
	if run_state and persistent_state:
		persistent_state.bank_gold += run_state.gold
		for item in run_state.inventory:
			if persistent_state.bank_items.size() < persistent_state.bank_capacity:
				persistent_state.bank_items.append(item)

class RunState extends RefCounted:
	var active: bool = false
	var run_id: String = ""
	var start_time: float = 0.0
	var current_floor: int = 1
	var floor_time: float = 0.0
	var gold: int = 50
	var inventory: Array = []
	var path_down: Vector2i = Vector2i(-1, -1)
	var path_down_discovered: bool = false
	var mini_boss_defeated: bool = false
	var shift_active: bool = false
	var shift_meter: float = 0.0
	var explored_tiles: Dictionary = {}

class PersistentState extends RefCounted:
	var save_slot: int = 0
	var created_at: float = 0.0
	var last_played: float = 0.0
	var version: int = 1
	var bank_gold: int = 0
	var bank_items: Array = []
	var bank_capacity: int = 30
	var stats: Dictionary = {
		"total_runs": 0, "deaths": 0, "total_kills": 0,
		"total_gold_earned": 0, "victories": 0, "deepest_floor": 1,
		"mini_bosses_defeated": 0, "playtime": 0.0,
		"core_defeated": false
	}
	var quests_available: Array = []
	var quests_active: Array = []
	var quests_completed: Array = []
	var recipes_known: Array[String] = []
	var village_improvements: Array[String] = []
	var npc_states: Dictionary = {}
	var world_state: int = 1
	var monsters_discovered: Array[String] = []
	var monster_kill_counts: Dictionary = {}
	var skills: Dictionary = {}
	var victory_achieved: bool = false

class VillageState extends RefCounted:
	var player_position: Vector2 = Vector2(25, 20)
	var current_building: String = ""
	var inside_building: bool = false
	var active_npc: String = ""
	var map: Array = []
	var buildings: Array[Dictionary] = []
	var npcs: Array[Dictionary] = []
