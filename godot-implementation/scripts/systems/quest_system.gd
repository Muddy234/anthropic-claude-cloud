class_name QuestSystem
extends BaseSystem
## Manages quest lifecycle: accept, track objectives, complete, and reward.
## Quest progress is PERSISTENT (survives death) via SaveManager.
## Supports kill, collect, deliver, explore, and talk objective types.

# ---------------------------------------------------------------------------
# Quest status constants
# ---------------------------------------------------------------------------

const STATUS_AVAILABLE: String = "available"
const STATUS_ACTIVE: String = "active"
const STATUS_COMPLETED: String = "completed"
const STATUS_TURNED_IN: String = "turned_in"
const STATUS_FAILED: String = "failed"

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

## Loaded quest definitions (QuestData resources) indexed by quest id.
var _quest_definitions: Dictionary = {}  # id -> QuestData

## Runtime quest instances: id -> Dictionary with status, objectives progress, etc.
var _quests: Dictionary = {}

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "quest_system"
	priority = 85


func initialize() -> void:
	EventBus.entity_died.connect(_on_entity_died)
	EventBus.floor_advanced.connect(_on_floor_advanced)
	_load_persistent_state()


func process_system(_delta: float) -> void:
	pass  # Quest updates are event-driven


func cleanup() -> void:
	# Quests persist across floors; only save state
	_save_persistent_state()


func on_state_changed(_old_state: int, new_state: int) -> void:
	if new_state == Constants.GameState.VILLAGE:
		_save_persistent_state()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Register a QuestData resource so the system knows about it.
func register_quest_definition(quest_data: QuestData) -> void:
	if quest_data == null or quest_data.id.is_empty():
		return
	_quest_definitions[quest_data.id] = quest_data
	# If quest not yet in runtime state, add as available
	if not _quests.has(quest_data.id):
		_quests[quest_data.id] = _create_quest_instance(quest_data)


## Accept a quest. Returns true on success.
func accept_quest(quest_id: String) -> bool:
	if not _quests.has(quest_id):
		push_warning("QuestSystem: Unknown quest '%s'" % quest_id)
		return false

	var quest: Dictionary = _quests[quest_id]
	if quest["status"] != STATUS_AVAILABLE:
		return false

	# Check prerequisites
	var def: QuestData = _quest_definitions.get(quest_id)
	if def != null and not def.prerequisite.is_empty():
		var prereq: Dictionary = _quests.get(def.prerequisite, {})
		if prereq.get("status", "") != STATUS_TURNED_IN:
			return false

	quest["status"] = STATUS_ACTIVE
	_save_persistent_state()
	return true


## Update objective progress. Called when relevant events occur.
func update_objective(obj_type: String, target: String, amount: int = 1) -> void:
	for quest_id in _quests:
		var quest: Dictionary = _quests[quest_id]
		if quest["status"] != STATUS_ACTIVE:
			continue

		var objectives: Array = quest["objectives"]
		var all_complete: bool = true

		for i in objectives.size():
			var obj: Dictionary = objectives[i]
			if obj["type"] == obj_type and obj["target"] == target:
				obj["current"] = mini(obj["current"] + amount, obj["required"])

			if obj["current"] < obj["required"]:
				all_complete = false

		if all_complete:
			quest["status"] = STATUS_COMPLETED


## Complete (turn in) a quest. Returns rewards dictionary.
func complete_quest(quest_id: String) -> Dictionary:
	if not _quests.has(quest_id):
		return {}

	var quest: Dictionary = _quests[quest_id]
	if quest["status"] != STATUS_COMPLETED:
		return {}

	quest["status"] = STATUS_TURNED_IN

	var rewards: Dictionary = quest.get("rewards", {})

	# Apply rewards to persistent state
	if GameManager.persistent_state != null:
		var gold: int = rewards.get("gold", 0)
		if gold > 0 and GameManager.run_state != null:
			GameManager.run_state.gold += gold

		# Record completion
		if not GameManager.persistent_state.quests_completed.has(quest_id):
			GameManager.persistent_state.quests_completed.append(quest_id)

		# Remove from active
		var idx: int = GameManager.persistent_state.quests_active.find(quest_id)
		if idx >= 0:
			GameManager.persistent_state.quests_active.remove_at(idx)

	_save_persistent_state()
	return rewards


## Fail a quest.
func fail_quest(quest_id: String) -> void:
	if not _quests.has(quest_id):
		return
	var quest: Dictionary = _quests[quest_id]
	if quest["status"] == STATUS_ACTIVE:
		quest["status"] = STATUS_FAILED
		_save_persistent_state()


## Abandon a quest (revert to available if not failed).
func abandon_quest(quest_id: String) -> void:
	if not _quests.has(quest_id):
		return
	var quest: Dictionary = _quests[quest_id]
	if quest["status"] == STATUS_ACTIVE:
		quest["status"] = STATUS_AVAILABLE
		# Reset objective progress
		for obj in quest["objectives"]:
			obj["current"] = 0
		_save_persistent_state()


## Get all active quests.
func get_active_quests() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for quest_id in _quests:
		var quest: Dictionary = _quests[quest_id]
		if quest["status"] == STATUS_ACTIVE or quest["status"] == STATUS_COMPLETED:
			result.append(quest)
	return result


## Get all available quests.
func get_available_quests() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for quest_id in _quests:
		var quest: Dictionary = _quests[quest_id]
		if quest["status"] == STATUS_AVAILABLE:
			# Check prerequisites
			var def: QuestData = _quest_definitions.get(quest_id)
			if def != null and not def.prerequisite.is_empty():
				var prereq: Dictionary = _quests.get(def.prerequisite, {})
				if prereq.get("status", "") != STATUS_TURNED_IN:
					continue
			result.append(quest)
	return result


## Get quest by ID.
func get_quest(quest_id: String) -> Dictionary:
	return _quests.get(quest_id, {})


## Get quest status string.
func get_quest_status(quest_id: String) -> String:
	if not _quests.has(quest_id):
		return ""
	return _quests[quest_id].get("status", "")


## Check if a quest is completed or turned in.
func is_quest_done(quest_id: String) -> bool:
	var status: String = get_quest_status(quest_id)
	return status == STATUS_COMPLETED or status == STATUS_TURNED_IN


## Get all quests for a given NPC (giver).
func get_quests_for_npc(npc_id: String) -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for quest_id in _quests:
		var quest: Dictionary = _quests[quest_id]
		if quest.get("giver_npc", "") == npc_id:
			result.append(quest)
	return result


## Get journal data for UI display.
func get_journal_data() -> Dictionary:
	var active: Array[Dictionary] = []
	var completed: Array[Dictionary] = []
	var failed: Array[Dictionary] = []

	for quest_id in _quests:
		var quest: Dictionary = _quests[quest_id]
		match quest["status"]:
			STATUS_ACTIVE, STATUS_COMPLETED:
				active.append(quest)
			STATUS_TURNED_IN:
				completed.append(quest)
			STATUS_FAILED:
				failed.append(quest)

	return {
		"active": active,
		"completed": completed,
		"failed": failed,
	}


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _create_quest_instance(quest_data: QuestData) -> Dictionary:
	var objectives: Array[Dictionary] = []
	for obj_data in quest_data.objectives:
		var obj_type: String = _objective_type_to_string(obj_data.type)
		var target: String = obj_data.item_id if not obj_data.item_id.is_empty() else str(obj_data.target_floor)
		objectives.append({
			"type": obj_type,
			"target": target,
			"description": obj_data.description,
			"required": obj_data.target_count,
			"current": 0,
		})

	var rewards: Dictionary = {}
	if quest_data.rewards != null:
		rewards = {
			"gold": quest_data.rewards.gold,
			"items": quest_data.rewards.item_rewards,
			"unlocks": quest_data.rewards.unlocks,
		}

	return {
		"id": quest_data.id,
		"title": quest_data.display_name,
		"description": quest_data.description,
		"quest_type": quest_data.quest_type,
		"status": STATUS_AVAILABLE,
		"objectives": objectives,
		"rewards": rewards,
		"giver_npc": quest_data.giver,
		"repeatable": quest_data.repeatable,
	}


func _objective_type_to_string(obj_type: Constants.QuestObjectiveType) -> String:
	match obj_type:
		Constants.QuestObjectiveType.KILL:
			return "kill"
		Constants.QuestObjectiveType.COLLECT:
			return "collect"
		Constants.QuestObjectiveType.REACH_FLOOR:
			return "explore"
		Constants.QuestObjectiveType.DEFEAT_GUARDIAN:
			return "kill"
		Constants.QuestObjectiveType.TALK_TO:
			return "talk"
		Constants.QuestObjectiveType.SURVIVE:
			return "survive"
		Constants.QuestObjectiveType.CRAFT:
			return "craft"
	return "kill"


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

func _save_persistent_state() -> void:
	if GameManager.persistent_state == null:
		return

	var active_ids: Array = []
	var completed_ids: Array = []
	var quest_progress: Dictionary = {}

	for quest_id in _quests:
		var quest: Dictionary = _quests[quest_id]
		match quest["status"]:
			STATUS_ACTIVE, STATUS_COMPLETED:
				active_ids.append(quest_id)
				quest_progress[quest_id] = {
					"status": quest["status"],
					"objectives": quest["objectives"].duplicate(true),
				}
			STATUS_TURNED_IN:
				if not completed_ids.has(quest_id):
					completed_ids.append(quest_id)

	GameManager.persistent_state.quests_active = active_ids
	GameManager.persistent_state.quests_completed = completed_ids
	# Store progress in npc_states as a generic data bucket
	GameManager.persistent_state.npc_states["_quest_progress"] = quest_progress


func _load_persistent_state() -> void:
	if GameManager.persistent_state == null:
		return

	var progress: Dictionary = GameManager.persistent_state.npc_states.get("_quest_progress", {})

	# Restore active quests
	for quest_id in progress:
		if _quests.has(quest_id):
			var saved: Dictionary = progress[quest_id]
			_quests[quest_id]["status"] = saved.get("status", STATUS_ACTIVE)
			var saved_objs: Array = saved.get("objectives", [])
			var quest_objs: Array = _quests[quest_id]["objectives"]
			for i in mini(saved_objs.size(), quest_objs.size()):
				quest_objs[i]["current"] = saved_objs[i].get("current", 0)

	# Mark turned-in quests
	for quest_id in GameManager.persistent_state.quests_completed:
		if _quests.has(quest_id):
			_quests[quest_id]["status"] = STATUS_TURNED_IN


# ---------------------------------------------------------------------------
# Signal handlers
# ---------------------------------------------------------------------------

func _on_entity_died(entity: Node, _killer: Node) -> void:
	if entity == null or entity == GameManager.player:
		return
	var monster_id: String = ""
	if "id" in entity:
		monster_id = entity.id
	elif "monster_id" in entity:
		monster_id = entity.monster_id
	if not monster_id.is_empty():
		update_objective("kill", monster_id, 1)


func _on_floor_advanced(new_floor: int, _previous_floor: int) -> void:
	update_objective("explore", str(new_floor), 1)
	_save_persistent_state()
