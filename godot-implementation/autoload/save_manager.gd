class_name SaveManagerDef
extends Node

const SAVE_PATH: String = "user://save_slot_%d.json"
const AUTO_SAVE_INTERVAL: float = 30.0

var _auto_save_timer: float = 0.0

func _process(delta: float) -> void:
	if not is_instance_valid(GameManager) or GameManager.persistent_state == null:
		return
	if GameManager.current_state == Constants.GameState.PLAYING:
		_auto_save_timer += delta
		if _auto_save_timer >= AUTO_SAVE_INTERVAL:
			_auto_save_timer = 0.0
			save_game(GameManager.persistent_state)

func save_game(state: GameManager.PersistentState, slot: int = 0) -> bool:
	if state == null:
		return false
	var path := SAVE_PATH % slot
	var file := FileAccess.open(path, FileAccess.WRITE)
	if file == null:
		push_error("SaveManager: Failed to open %s" % path)
		return false
	var data := _serialize_state(state)
	file.store_string(JSON.stringify(data, "\t"))
	file.close()
	return true

func load_game(slot: int = 0) -> GameManager.PersistentState:
	var path := SAVE_PATH % slot
	if not FileAccess.file_exists(path):
		return null
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		return null
	var text := file.get_as_text()
	file.close()
	var json := JSON.new()
	if json.parse(text) != OK:
		push_error("SaveManager: Parse error in %s" % path)
		return null
	return _deserialize_state(json.data)

func has_save(slot: int = 0) -> bool:
	return FileAccess.file_exists(SAVE_PATH % slot)

func delete_save(slot: int = 0) -> void:
	var path := SAVE_PATH % slot
	if FileAccess.file_exists(path):
		DirAccess.remove_absolute(path)

func _serialize_state(state: GameManager.PersistentState) -> Dictionary:
	return {
		"save_slot": state.save_slot,
		"created_at": state.created_at,
		"last_played": Time.get_unix_time_from_system(),
		"version": state.version,
		"bank_gold": state.bank_gold,
		"bank_items": state.bank_items,
		"bank_capacity": state.bank_capacity,
		"stats": state.stats,
		"quests_available": state.quests_available,
		"quests_active": state.quests_active,
		"quests_completed": state.quests_completed,
		"recipes_known": state.recipes_known,
		"village_improvements": state.village_improvements,
		"npc_states": state.npc_states,
		"world_state": state.world_state,
		"monsters_discovered": state.monsters_discovered,
		"monster_kill_counts": state.monster_kill_counts,
		"skills": state.skills,
		"victory_achieved": state.victory_achieved,
	}

func _deserialize_state(data: Dictionary) -> GameManager.PersistentState:
	var state := GameManager.PersistentState.new()
	state.save_slot = data.get("save_slot", 0)
	state.created_at = data.get("created_at", 0.0)
	state.last_played = data.get("last_played", 0.0)
	state.version = data.get("version", 1)
	state.bank_gold = data.get("bank_gold", 0)
	state.bank_items = data.get("bank_items", [])
	state.bank_capacity = data.get("bank_capacity", 30)
	state.stats = data.get("stats", {})
	state.quests_available = data.get("quests_available", [])
	state.quests_active = data.get("quests_active", [])
	state.quests_completed = data.get("quests_completed", [])
	state.recipes_known = data.get("recipes_known", [])
	state.village_improvements = data.get("village_improvements", [])
	state.npc_states = data.get("npc_states", {})
	state.world_state = data.get("world_state", 1)
	state.monsters_discovered = data.get("monsters_discovered", [])
	state.monster_kill_counts = data.get("monster_kill_counts", {})
	state.skills = data.get("skills", {})
	state.victory_achieved = data.get("victory_achieved", false)
	return state
