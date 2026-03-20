class_name CoreSystem
extends BaseSystem
## The Core endgame boss arena system: manages the final boss encounter with
## 3-phase fight, corruption mechanics, arena shrink timer, and phase transitions.

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

const ARENA_WIDTH: int = 40
const ARENA_HEIGHT: int = 40
const ARENA_SHRINK_INTERVAL: float = 30.0   # Seconds between arena shrinks (phase 3)
const ARENA_SHRINK_AMOUNT: int = 2           # Tiles shrunk per interval
const CORE_STABILITY_MAX: float = 100.0
const CORE_STABILITY_DECAY_RATE: float = 0.5  # Per second during fight

# Phase HP thresholds (fraction of max HP)
const PHASE_THRESHOLDS: Array[float] = [1.0, 0.66, 0.33, 0.0]

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

var _encounter_active: bool = false
var _current_phase: int = 0            # 0 = not started, 1-3 = active phases
var _boss_node: Node = null
var _boss_max_hp: float = 5000.0
var _boss_current_hp: float = 5000.0
var _core_stability: float = CORE_STABILITY_MAX
var _arena_bounds: Rect2i = Rect2i(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
var _arena_center: Vector2i = Vector2i(ARENA_WIDTH / 2, ARENA_HEIGHT / 2)
var _shrink_timer: float = 0.0
var _phase_transition_active: bool = false
var _adds_spawned: Array[Node] = []
var _arena_hazards: Array[String] = []   # Hazard IDs created in the arena
var _boss_data: CoreBossData = null
var _config: CoreConfigData = null

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "core_system"
	priority = 95


func initialize() -> void:
	EventBus.entity_died.connect(_on_entity_died)


func process_system(delta: float) -> void:
	if not _encounter_active:
		return

	_update_core_stability(delta)
	_check_phase_transition()

	if _current_phase == 3:
		_update_arena_shrink(delta)


func cleanup() -> void:
	_reset_encounter()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Configure the core system with boss and config data.
func configure(boss_data: CoreBossData, config: CoreConfigData) -> void:
	_boss_data = boss_data
	_config = config
	if boss_data != null:
		_boss_max_hp = float(boss_data.health)


## Check if the player meets requirements to enter the core.
func can_enter_core() -> bool:
	if GameManager.persistent_state == null:
		return false

	if _config != null:
		var guardians_needed: int = _config.guardians_defeated
		var guardians_killed: int = GameManager.persistent_state.stats.get("mini_bosses_defeated", 0)
		if guardians_killed < guardians_needed:
			return false

	return true


## Start the boss encounter.
func start_boss_encounter() -> void:
	if _encounter_active:
		return

	_encounter_active = true
	_current_phase = 1
	_boss_current_hp = _boss_max_hp
	_core_stability = CORE_STABILITY_MAX
	_shrink_timer = 0.0
	_phase_transition_active = false

	# Initialize arena bounds
	_arena_bounds = Rect2i(0, 0, ARENA_WIDTH, ARENA_HEIGHT)
	_arena_center = Vector2i(ARENA_WIDTH / 2, ARENA_HEIGHT / 2)

	# Lock arena doors
	_lock_arena()

	# Spawn boss
	_spawn_boss()

	# Start phase 1 music
	_set_phase_music(1)

	# Emit phase 1 start
	EventBus.hazard_created.emit(Vector2(_arena_center), "core_phase_1", 0.0)


## Get the current boss phase (1-3, or 0 if not active).
func get_current_phase() -> int:
	return _current_phase


## Get boss HP as a fraction (0.0 to 1.0).
func get_boss_hp_fraction() -> float:
	if _boss_max_hp <= 0.0:
		return 0.0
	return _boss_current_hp / _boss_max_hp


## Get core stability as a fraction (0.0 to 1.0).
func get_core_stability() -> float:
	return _core_stability / CORE_STABILITY_MAX


## Get the current arena bounds.
func get_arena_bounds() -> Rect2i:
	return _arena_bounds


## Whether the encounter is currently active.
func is_encounter_active() -> bool:
	return _encounter_active


## Notify the system that the boss took damage.
func on_boss_damaged(damage: float) -> void:
	if not _encounter_active:
		return
	_boss_current_hp = maxf(0.0, _boss_current_hp - damage)


## Get encounter summary for UI/stats.
func get_encounter_state() -> Dictionary:
	return {
		"active": _encounter_active,
		"phase": _current_phase,
		"boss_hp_fraction": get_boss_hp_fraction(),
		"core_stability": get_core_stability(),
		"arena_bounds": _arena_bounds,
		"adds_alive": _count_alive_adds(),
	}


# ---------------------------------------------------------------------------
# Phase transitions
# ---------------------------------------------------------------------------

func _check_phase_transition() -> void:
	if _phase_transition_active:
		return

	var hp_frac: float = get_boss_hp_fraction()

	if _current_phase == 1 and hp_frac <= PHASE_THRESHOLDS[2]:
		_transition_to_phase(2)
	elif _current_phase == 2 and hp_frac <= PHASE_THRESHOLDS[3]:
		_transition_to_phase(3)
	elif _current_phase >= 1 and hp_frac <= 0.0:
		_on_boss_defeated()


func _transition_to_phase(phase: int) -> void:
	_phase_transition_active = true
	_current_phase = phase

	match phase:
		2:
			_start_phase_2()
		3:
			_start_phase_3()

	_set_phase_music(phase)
	_phase_transition_active = false

	EventBus.hazard_created.emit(Vector2(_arena_center), "core_phase_%d" % phase, 0.0)


func _start_phase_2() -> void:
	# Enrage: boss gets stronger, new attack patterns
	if _boss_node != null and _boss_node.has_method("enter_enrage"):
		_boss_node.enter_enrage()

	# Spawn arena hazards
	_spawn_arena_hazards(2)

	# Summon adds
	_summon_adds(2)


func _start_phase_3() -> void:
	# Desperation: all abilities, shrinking arena
	if _boss_node != null and _boss_node.has_method("enter_desperation"):
		_boss_node.enter_desperation()

	# More hazards
	_spawn_arena_hazards(3)

	# Start arena shrink
	_shrink_timer = ARENA_SHRINK_INTERVAL

	# Summon more adds
	_summon_adds(3)


# ---------------------------------------------------------------------------
# Arena management
# ---------------------------------------------------------------------------

func _lock_arena() -> void:
	# Signal to the dungeon to lock arena doors
	EventBus.hazard_created.emit(Vector2(_arena_center), "arena_lock", 0.0)


func _unlock_arena() -> void:
	EventBus.hazard_created.emit(Vector2(_arena_center), "arena_unlock", 0.0)


func _update_arena_shrink(delta: float) -> void:
	_shrink_timer -= delta
	if _shrink_timer <= 0.0:
		_shrink_timer = ARENA_SHRINK_INTERVAL
		_shrink_arena()


func _shrink_arena() -> void:
	var new_x: int = _arena_bounds.position.x + ARENA_SHRINK_AMOUNT
	var new_y: int = _arena_bounds.position.y + ARENA_SHRINK_AMOUNT
	var new_w: int = maxi(10, _arena_bounds.size.x - ARENA_SHRINK_AMOUNT * 2)
	var new_h: int = maxi(10, _arena_bounds.size.y - ARENA_SHRINK_AMOUNT * 2)
	_arena_bounds = Rect2i(new_x, new_y, new_w, new_h)

	# Convert tiles outside new bounds to hazard (void/lava)
	# This is handled by spawning hazards at the new edges
	EventBus.hazard_created.emit(
		Vector2(_arena_center),
		"arena_shrink",
		float(ARENA_SHRINK_AMOUNT),
	)


# ---------------------------------------------------------------------------
# Boss and adds
# ---------------------------------------------------------------------------

func _spawn_boss() -> void:
	# Use EnemyFactory if available
	var factory: Node = get_node_or_null("/root/EnemyFactory")
	if factory != null and factory.has_method("create_boss"):
		var boss_id: String = ""
		if _boss_data != null:
			boss_id = _boss_data.id
		_boss_node = factory.create_boss(boss_id, _arena_center)
	else:
		# Signal for external handling
		EventBus.hazard_created.emit(Vector2(_arena_center), "spawn_core_boss", _boss_max_hp)


func _summon_adds(phase: int) -> void:
	var add_count: int = phase  # 2 adds in phase 2, 3 in phase 3
	var factory: Node = get_node_or_null("/root/EnemyFactory")

	for i in add_count:
		var offset: Vector2i = Vector2i(
			(randi() % 10) - 5,
			(randi() % 10) - 5,
		)
		var spawn_pos: Vector2i = _arena_center + offset

		if factory != null and factory.has_method("create_and_register"):
			var add: Node = factory.create_and_register("core_add", spawn_pos, float(phase))
			if add != null:
				_adds_spawned.append(add)


func _spawn_arena_hazards(phase: int) -> void:
	# Get the lingering hazard system if available
	var lh_sys: Node = get_node_or_null("/root/SystemCoordinator/LingeringHazardSystem")
	if lh_sys == null or not lh_sys.has_method("create_hazard"):
		return

	var hazard_types: Array[String] = []
	match phase:
		2:
			hazard_types = ["fire_pool", "void_rift"]
		3:
			hazard_types = ["fire_pool", "void_rift", "lightning_field"]

	var count: int = phase * 2  # 4 in phase 2, 6 in phase 3
	for i in count:
		var htype: String = hazard_types[randi() % hazard_types.size()]
		var offset: Vector2i = Vector2i(
			(randi() % (_arena_bounds.size.x - 4)) - (_arena_bounds.size.x / 2 - 2),
			(randi() % (_arena_bounds.size.y - 4)) - (_arena_bounds.size.y / 2 - 2),
		)
		var pos: Vector2i = _arena_center + offset
		var hid: String = lh_sys.create_hazard({
			"type": htype,
			"position": pos,
		})
		if not hid.is_empty():
			_arena_hazards.append(hid)


func _count_alive_adds() -> int:
	var count: int = 0
	var alive: Array[Node] = []
	for add in _adds_spawned:
		if add != null and is_instance_valid(add):
			alive.append(add)
			count += 1
	_adds_spawned = alive
	return count


# ---------------------------------------------------------------------------
# Core stability
# ---------------------------------------------------------------------------

func _update_core_stability(delta: float) -> void:
	if _current_phase >= 2:
		_core_stability -= CORE_STABILITY_DECAY_RATE * delta
		_core_stability = maxf(0.0, _core_stability)

		if _core_stability <= 0.0:
			_on_core_collapse()


func _on_core_collapse() -> void:
	# Core collapsed -- player fails the encounter
	_encounter_active = false
	_unlock_arena()

	# Massive damage to player
	if GameManager.player != null and GameManager.player.has_method("take_damage"):
		GameManager.player.take_damage(9999.0)


# ---------------------------------------------------------------------------
# Victory / Defeat
# ---------------------------------------------------------------------------

func _on_boss_defeated() -> void:
	_encounter_active = false
	_current_phase = 0
	_unlock_arena()

	# Clean up adds
	for add in _adds_spawned:
		if add != null and is_instance_valid(add) and add.has_method("take_damage"):
			add.take_damage(99999.0)
	_adds_spawned.clear()

	# Clean up hazards
	var lh_sys: Node = get_node_or_null("/root/SystemCoordinator/LingeringHazardSystem")
	if lh_sys != null and lh_sys.has_method("remove_hazard"):
		for hid in _arena_hazards:
			lh_sys.remove_hazard(hid)
	_arena_hazards.clear()

	# Record victory
	if GameManager.persistent_state != null:
		GameManager.persistent_state.stats["core_defeated"] = true
		GameManager.persistent_state.victory_achieved = true
		SaveManager.save_game(GameManager.persistent_state)

	# Rewards
	if _config != null:
		if GameManager.run_state != null:
			GameManager.run_state.gold += _config.reward_gold

	# Signal victory
	EventBus.hazard_created.emit(Vector2(_arena_center), "core_victory", 0.0)

	# Change game state
	GameManager.change_state(Constants.GameState.VICTORY)


func _reset_encounter() -> void:
	_encounter_active = false
	_current_phase = 0
	_boss_node = null
	_boss_current_hp = _boss_max_hp
	_core_stability = CORE_STABILITY_MAX
	_shrink_timer = 0.0
	_phase_transition_active = false
	_adds_spawned.clear()
	_arena_hazards.clear()


# ---------------------------------------------------------------------------
# Music
# ---------------------------------------------------------------------------

func _set_phase_music(phase: int) -> void:
	if _boss_data == null:
		return

	for phase_data in _boss_data.phases:
		if not phase_data.music_track.is_empty():
			# Use the music track from the phase matching our current phase index
			var phase_idx: int = _boss_data.phases.find(phase_data)
			if phase_idx == phase - 1:
				if AudioManager.music_manager != null and AudioManager.music_manager.has_method("crossfade_to"):
					AudioManager.music_manager.crossfade_to(phase_data.music_track, 1.0)
				break


# ---------------------------------------------------------------------------
# Signal handlers
# ---------------------------------------------------------------------------

func _on_entity_died(entity: Node, _killer: Node) -> void:
	if not _encounter_active:
		return

	# Check if the boss died
	if entity == _boss_node:
		_boss_current_hp = 0.0
		_on_boss_defeated()
		return

	# Check if an add died
	var idx: int = _adds_spawned.find(entity)
	if idx >= 0:
		_adds_spawned.remove_at(idx)
