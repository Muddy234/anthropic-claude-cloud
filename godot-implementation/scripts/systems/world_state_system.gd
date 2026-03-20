class_name WorldStateSystem
extends BaseSystem
## Tracks global world variables that persist across runs: floors cleared,
## bosses killed, corruption level, village state, unlocked areas.
## One-way world state progression: NORMAL -> ASH -> BURNING -> ENDGAME.

# ---------------------------------------------------------------------------
# World state enum
# ---------------------------------------------------------------------------

enum WorldState {
	NORMAL = 1,
	ASH = 2,
	BURNING = 3,
	ENDGAME = 4,
}

# State transition thresholds (deepest floor reached)
const STATE_THRESHOLDS: Dictionary = {
	WorldState.ASH: 4,
	WorldState.BURNING: 7,
	WorldState.ENDGAME: 10,
}

# ---------------------------------------------------------------------------
# World state effects
# ---------------------------------------------------------------------------

const STATE_EFFECTS: Dictionary = {
	WorldState.NORMAL: {
		"sky": "clear",
		"npc_mood": "normal",
		"price_multiplier": 1.0,
		"description": "The village is peaceful.",
	},
	WorldState.ASH: {
		"sky": "dark",
		"npc_mood": "worried",
		"price_multiplier": 1.1,
		"description": "Ash falls from the sky. The villagers grow anxious.",
	},
	WorldState.BURNING: {
		"sky": "fiery",
		"npc_mood": "panic",
		"price_multiplier": 1.3,
		"description": "The horizon burns. Panic grips the village.",
	},
	WorldState.ENDGAME: {
		"sky": "red",
		"npc_mood": "resolute",
		"price_multiplier": 1.0,
		"description": "A blood-red sky. Final preparations underway.",
	},
}

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

var _world_state: int = WorldState.NORMAL

## Tracked global variables
var _global_vars: Dictionary = {
	"floors_cleared": 0,
	"bosses_killed": 0,
	"total_runs": 0,
	"deepest_floor": 1,
	"corruption_level": 0.0,
	"village_upgrade_level": 0,
	"core_defeated": false,
}

## Unlocked areas
var _unlocked_areas: Array[String] = ["village", "floor_1"]

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "world_state_system"
	priority = 50


func initialize() -> void:
	EventBus.floor_advanced.connect(_on_floor_advanced)
	EventBus.entity_died.connect(_on_entity_died)
	_load_persistent()


func process_system(_delta: float) -> void:
	pass  # Updates are event-driven


func cleanup() -> void:
	_save_persistent()


func on_state_changed(_old_state: int, new_state: int) -> void:
	if new_state == Constants.GameState.VILLAGE:
		_save_persistent()


# ---------------------------------------------------------------------------
# Public API: World State
# ---------------------------------------------------------------------------

## Get the current world state enum value.
func get_world_state() -> int:
	return _world_state


## Get the world state name as a string.
func get_world_state_name() -> String:
	match _world_state:
		WorldState.NORMAL:
			return "NORMAL"
		WorldState.ASH:
			return "ASH"
		WorldState.BURNING:
			return "BURNING"
		WorldState.ENDGAME:
			return "ENDGAME"
	return "UNKNOWN"


## Get world state effects for current state.
func get_state_effects() -> Dictionary:
	return STATE_EFFECTS.get(_world_state, STATE_EFFECTS[WorldState.NORMAL])


## Get NPC dialogue modifier based on world state.
func get_npc_dialogue_modifier() -> String:
	var effects: Dictionary = get_state_effects()
	return effects.get("npc_mood", "normal")


## Get price multiplier from world state.
func get_price_multiplier() -> float:
	var effects: Dictionary = get_state_effects()
	return effects.get("price_multiplier", 1.0)


## Check world progression based on floor reached.
func check_progression(floor_num: int) -> void:
	# Update deepest floor
	if floor_num > _global_vars["deepest_floor"]:
		_global_vars["deepest_floor"] = floor_num

	# One-way state progression
	for state in [WorldState.ENDGAME, WorldState.BURNING, WorldState.ASH]:
		var threshold: int = STATE_THRESHOLDS.get(state, 999)
		if floor_num >= threshold and _world_state < state:
			_advance_world_state(state)
			break

	_save_persistent()


# ---------------------------------------------------------------------------
# Public API: Global Variables
# ---------------------------------------------------------------------------

## Get a global variable value.
func get_global(key: String) -> Variant:
	return _global_vars.get(key, null)


## Set a global variable value.
func set_global(key: String, value: Variant) -> void:
	_global_vars[key] = value
	_save_persistent()


## Increment a global integer variable.
func increment_global(key: String, amount: int = 1) -> void:
	var current = _global_vars.get(key, 0)
	if current is int or current is float:
		_global_vars[key] = current + amount


## Get all global variables.
func get_all_globals() -> Dictionary:
	return _global_vars.duplicate()


# ---------------------------------------------------------------------------
# Public API: Unlocked Areas
# ---------------------------------------------------------------------------

## Unlock a new area.
func unlock_area(area_id: String) -> void:
	if not _unlocked_areas.has(area_id):
		_unlocked_areas.append(area_id)
		_save_persistent()


## Check if an area is unlocked.
func is_area_unlocked(area_id: String) -> bool:
	return _unlocked_areas.has(area_id)


## Get all unlocked areas.
func get_unlocked_areas() -> Array[String]:
	return _unlocked_areas.duplicate()


# ---------------------------------------------------------------------------
# Difficulty scaling
# ---------------------------------------------------------------------------

## Get difficulty multiplier based on world state and run count.
func get_difficulty_multiplier() -> float:
	var base: float = 1.0

	# Scale with world state
	match _world_state:
		WorldState.ASH:
			base = 1.1
		WorldState.BURNING:
			base = 1.25
		WorldState.ENDGAME:
			base = 1.5

	# Scale with total runs (slight increase)
	var runs: int = _global_vars.get("total_runs", 0)
	base += float(runs) * 0.005  # +0.5% per run, capped

	return minf(base, 3.0)


## Get corruption level (0.0 to 100.0).
func get_corruption_level() -> float:
	return _global_vars.get("corruption_level", 0.0)


## Add corruption.
func add_corruption(amount: float) -> void:
	var current: float = _global_vars.get("corruption_level", 0.0)
	_global_vars["corruption_level"] = clampf(current + amount, 0.0, 100.0)


## Reduce corruption (natural decay or cleansing).
func reduce_corruption(amount: float) -> void:
	var current: float = _global_vars.get("corruption_level", 0.0)
	_global_vars["corruption_level"] = clampf(current - amount, 0.0, 100.0)


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _advance_world_state(new_state: int) -> void:
	if new_state <= _world_state:
		return  # One-way only

	_world_state = new_state

	# Sync to persistent state
	if GameManager.persistent_state != null:
		GameManager.persistent_state.world_state = _world_state


# ---------------------------------------------------------------------------
# Signal handlers
# ---------------------------------------------------------------------------

func _on_floor_advanced(new_floor: int, _previous_floor: int) -> void:
	increment_global("floors_cleared", 1)
	check_progression(new_floor)

	# Unlock floor area
	var area_id: String = "floor_%d" % new_floor
	unlock_area(area_id)


func _on_entity_died(entity: Node, _killer: Node) -> void:
	if entity == null or entity == GameManager.player:
		return

	# Check if boss
	if entity.has_method("is_boss") and entity.is_boss():
		increment_global("bosses_killed", 1)
	elif "tier" in entity and entity.tier == Constants.MonsterTier.BOSS:
		increment_global("bosses_killed", 1)


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

func _save_persistent() -> void:
	if GameManager.persistent_state == null:
		return

	GameManager.persistent_state.world_state = _world_state
	GameManager.persistent_state.npc_states["_world_globals"] = _global_vars.duplicate()
	GameManager.persistent_state.npc_states["_unlocked_areas"] = _unlocked_areas.duplicate()

	# Sync stats
	GameManager.persistent_state.stats["deepest_floor"] = _global_vars.get("deepest_floor", 1)
	GameManager.persistent_state.stats["core_defeated"] = _global_vars.get("core_defeated", false)


func _load_persistent() -> void:
	if GameManager.persistent_state == null:
		return

	_world_state = GameManager.persistent_state.world_state
	if _world_state < WorldState.NORMAL or _world_state > WorldState.ENDGAME:
		_world_state = WorldState.NORMAL

	var saved_globals = GameManager.persistent_state.npc_states.get("_world_globals", {})
	if saved_globals is Dictionary:
		for key in saved_globals:
			_global_vars[key] = saved_globals[key]

	var saved_areas = GameManager.persistent_state.npc_states.get("_unlocked_areas", [])
	if saved_areas is Array:
		_unlocked_areas.clear()
		for a in saved_areas:
			_unlocked_areas.append(a)

	# Sync deepest floor from stats
	_global_vars["deepest_floor"] = maxi(
		_global_vars.get("deepest_floor", 1),
		GameManager.persistent_state.stats.get("deepest_floor", 1)
	)
	_global_vars["total_runs"] = GameManager.persistent_state.stats.get("total_runs", 0)
