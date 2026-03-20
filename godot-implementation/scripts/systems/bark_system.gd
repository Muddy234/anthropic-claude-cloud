class_name BarkSystem
extends BaseSystem
## Dynamic dialogue barks: contextual one-liners from NPCs/enemies triggered
## by proximity, world state, quest progress, combat, etc. with cooldowns
## and priority queueing.

# ---------------------------------------------------------------------------
# Bark trigger enum
# ---------------------------------------------------------------------------

enum BarkTrigger {
	PROXIMITY,
	WORLD_STATE,
	QUEST_COMPLETE,
	ITEM_PURCHASED,
	RETURN_FROM_RUN,
	LOW_HP,
	COMBAT_START,
	FLOOR_REACHED,
	FIRST_VISIT,
}

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

const BARK_DURATION: float = 3.0
const BARK_COOLDOWN: float = 30.0
const PROXIMITY_RANGE: int = 2
const LOW_HP_THRESHOLD: float = 0.25
const MAX_QUEUE_SIZE: int = 5

# ---------------------------------------------------------------------------
# Bark definition structure
# ---------------------------------------------------------------------------
# {
#   "npc_id": String,
#   "trigger": BarkTrigger,
#   "conditions": Dictionary,  # Optional extra conditions
#   "lines": Array[String],    # Pool of possible lines
#   "priority": int,           # Higher = more important (0-10)
# }

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

## Registered bark definitions: Array of bark dicts
var _bark_definitions: Array[Dictionary] = []

## Cooldown timers per NPC: npc_id -> float (remaining cooldown)
var _npc_cooldowns: Dictionary = {}

## Currently displayed barks: npc_id -> { text, timer, priority }
var _active_barks: Dictionary = {}

## Priority queue for pending barks: Array of { npc_id, text, priority }
var _bark_queue: Array[Dictionary] = []

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "bark_system"
	priority = 50


func initialize() -> void:
	EventBus.game_state_changed.connect(_on_state_change_bark)
	EventBus.entity_died.connect(_on_entity_died)
	EventBus.floor_advanced.connect(_on_floor_advanced)


func process_system(delta: float) -> void:
	_update_cooldowns(delta)
	_update_active_barks(delta)
	_process_queue()

	# Proximity check (only in village)
	if GameManager.current_state == Constants.GameState.VILLAGE:
		_check_proximity_barks()


func cleanup() -> void:
	_active_barks.clear()
	_bark_queue.clear()
	# Don't clear cooldowns -- they persist across floor changes


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Register a bark definition.
func register_bark(bark_def: Dictionary) -> void:
	_bark_definitions.append(bark_def)


## Register barks from NPC data (uses the barks PackedStringArray).
func register_npc_barks(npc_id: String, lines: PackedStringArray, trigger: int = BarkTrigger.PROXIMITY) -> void:
	if lines.is_empty():
		return
	var str_lines: Array[String] = []
	for line in lines:
		str_lines.append(line)
	_bark_definitions.append({
		"npc_id": npc_id,
		"trigger": trigger,
		"conditions": {},
		"lines": str_lines,
		"priority": 5,
	})


## Manually trigger a bark check for all NPCs matching a trigger type.
func trigger_barks(trigger: int, context: Dictionary = {}) -> void:
	for bark_def in _bark_definitions:
		if bark_def["trigger"] != trigger:
			continue

		var npc_id: String = bark_def["npc_id"]

		# Check cooldown
		if _npc_cooldowns.get(npc_id, 0.0) > 0.0:
			continue

		# Check conditions
		if not _check_conditions(bark_def, context):
			continue

		# Pick a random line
		var lines: Array = bark_def["lines"]
		if lines.is_empty():
			continue
		var text: String = lines[randi() % lines.size()]

		_enqueue_bark(npc_id, text, bark_def.get("priority", 5))


## Trigger a bark for a specific NPC.
func trigger_npc_bark(npc_id: String, text: String, bark_priority: int = 5) -> void:
	if _npc_cooldowns.get(npc_id, 0.0) > 0.0:
		return
	_enqueue_bark(npc_id, text, bark_priority)


## Get all currently active barks for rendering.
func get_active_barks() -> Dictionary:
	return _active_barks.duplicate()


## Get bark text for a specific NPC, or empty string if none.
func get_bark_for_npc(npc_id: String) -> String:
	if _active_barks.has(npc_id):
		return _active_barks[npc_id].get("text", "")
	return ""


## Clear all active barks.
func clear_barks() -> void:
	_active_barks.clear()
	_bark_queue.clear()


# ---------------------------------------------------------------------------
# Queue management
# ---------------------------------------------------------------------------

func _enqueue_bark(npc_id: String, text: String, bark_priority: int) -> void:
	# Check if this NPC already has a higher-priority bark queued
	for i in _bark_queue.size():
		if _bark_queue[i]["npc_id"] == npc_id:
			if _bark_queue[i]["priority"] >= bark_priority:
				return  # Existing bark has higher priority
			else:
				_bark_queue.remove_at(i)
				break

	_bark_queue.append({
		"npc_id": npc_id,
		"text": text,
		"priority": bark_priority,
	})

	# Sort by priority descending
	_bark_queue.sort_custom(func(a, b): return a["priority"] > b["priority"])

	# Cap queue size
	while _bark_queue.size() > MAX_QUEUE_SIZE:
		_bark_queue.pop_back()


func _process_queue() -> void:
	if _bark_queue.is_empty():
		return

	var to_activate: Array[int] = []

	for i in _bark_queue.size():
		var entry: Dictionary = _bark_queue[i]
		var npc_id: String = entry["npc_id"]

		# Don't activate if NPC already has an active bark
		if _active_barks.has(npc_id):
			continue

		_active_barks[npc_id] = {
			"text": entry["text"],
			"timer": BARK_DURATION,
			"priority": entry["priority"],
		}

		_npc_cooldowns[npc_id] = BARK_COOLDOWN
		to_activate.append(i)

	# Remove activated entries (reverse order)
	to_activate.reverse()
	for idx in to_activate:
		_bark_queue.remove_at(idx)


# ---------------------------------------------------------------------------
# Updates
# ---------------------------------------------------------------------------

func _update_cooldowns(delta: float) -> void:
	for npc_id in _npc_cooldowns:
		if _npc_cooldowns[npc_id] > 0.0:
			_npc_cooldowns[npc_id] = maxf(0.0, _npc_cooldowns[npc_id] - delta)


func _update_active_barks(delta: float) -> void:
	var to_remove: Array[String] = []
	for npc_id in _active_barks:
		_active_barks[npc_id]["timer"] -= delta
		if _active_barks[npc_id]["timer"] <= 0.0:
			to_remove.append(npc_id)
	for npc_id in to_remove:
		_active_barks.erase(npc_id)


func _check_proximity_barks() -> void:
	if GameManager.village_state == null or GameManager.player == null:
		return

	var player_pos: Vector2i = Vector2i(GameManager.village_state.player_position)

	for npc in GameManager.village_state.npcs:
		var npc_pos: Vector2i = Vector2i(npc.get("x", 0), npc.get("y", 0))
		var dist: int = absi(npc_pos.x - player_pos.x) + absi(npc_pos.y - player_pos.y)
		if dist <= PROXIMITY_RANGE:
			var npc_id: String = npc.get("id", "")
			if not npc_id.is_empty():
				trigger_barks(BarkTrigger.PROXIMITY, {"npc_id": npc_id})


func _check_conditions(bark_def: Dictionary, context: Dictionary) -> bool:
	var conditions: Dictionary = bark_def.get("conditions", {})
	if conditions.is_empty():
		return true

	# NPC match
	if conditions.has("npc_id") and context.has("npc_id"):
		if conditions["npc_id"] != context["npc_id"]:
			return false

	# World state check
	if conditions.has("world_state"):
		if GameManager.persistent_state != null:
			if GameManager.persistent_state.world_state != conditions["world_state"]:
				return false

	# Floor requirement
	if conditions.has("min_floor"):
		if GameManager.run_state != null:
			if GameManager.run_state.current_floor < conditions["min_floor"]:
				return false

	# Quest requirement
	if conditions.has("quest_completed"):
		if GameManager.persistent_state != null:
			if not GameManager.persistent_state.quests_completed.has(conditions["quest_completed"]):
				return false

	return true


# ---------------------------------------------------------------------------
# Signal handlers
# ---------------------------------------------------------------------------

func _on_state_change_bark(_old_state: int, new_state: int) -> void:
	if new_state == Constants.GameState.VILLAGE:
		trigger_barks(BarkTrigger.RETURN_FROM_RUN)


func _on_entity_died(entity: Node, _killer: Node) -> void:
	if entity == GameManager.player:
		return
	# Enemies might bark on death in combat
	if entity.has_method("get_death_bark"):
		var bark_text: String = entity.get_death_bark()
		if not bark_text.is_empty():
			var eid: String = "enemy_%d" % entity.get_instance_id()
			trigger_npc_bark(eid, bark_text, 3)


func _on_floor_advanced(new_floor: int, _previous_floor: int) -> void:
	trigger_barks(BarkTrigger.FLOOR_REACHED, {"floor": new_floor})
