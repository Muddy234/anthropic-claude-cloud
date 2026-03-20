class_name TrainingSystem
extends BaseSystem
## Village training: DPS testing on training dummies, stat boosts,
## ability unlocking, and persistent upgrades.

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

const DPS_WINDOW: float = 10.0     # Rolling 10-second DPS window
const STAT_BOOST_COST_BASE: int = 100
const STAT_BOOST_COST_SCALE: float = 1.5
const ABILITY_UNLOCK_COST_BASE: int = 250

# ---------------------------------------------------------------------------
# State: Training Dummy
# ---------------------------------------------------------------------------

var _is_training: bool = false
var _hit_log: Array[Dictionary] = []  # { time, damage, is_crit }
var _total_hits: int = 0
var _total_crits: int = 0
var _peak_dps: float = 0.0
var _training_start_time: float = 0.0

# ---------------------------------------------------------------------------
# State: Stat upgrades (persistent)
# ---------------------------------------------------------------------------

## Persistent stat upgrades: stat_name -> int (number of upgrades purchased)
var _stat_upgrades: Dictionary = {}

## Persistent ability unlocks: Array of ability IDs
var _unlocked_abilities: Array[String] = []

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "training_system"
	priority = 50


func initialize() -> void:
	_load_persistent()


func process_system(delta: float) -> void:
	if not _is_training:
		return

	# Prune old entries outside the DPS window
	var now: float = Time.get_ticks_msec() / 1000.0
	while not _hit_log.is_empty() and (now - _hit_log[0]["time"]) > DPS_WINDOW:
		_hit_log.remove_at(0)

	# Update peak DPS
	var current_dps: float = _calculate_current_dps()
	_peak_dps = maxf(_peak_dps, current_dps)


func cleanup() -> void:
	stop_training()


# ---------------------------------------------------------------------------
# Training dummy API
# ---------------------------------------------------------------------------

## Start a training session.
func start_training() -> void:
	_is_training = true
	_hit_log.clear()
	_total_hits = 0
	_total_crits = 0
	_peak_dps = 0.0
	_training_start_time = Time.get_ticks_msec() / 1000.0


## Stop the training session.
func stop_training() -> void:
	_is_training = false


## Record a hit on the training dummy.
func record_hit(damage: int, is_crit: bool) -> void:
	if not _is_training:
		return

	var now: float = Time.get_ticks_msec() / 1000.0
	_hit_log.append({
		"time": now,
		"damage": damage,
		"is_crit": is_crit,
	})

	_total_hits += 1
	if is_crit:
		_total_crits += 1


## Get DPS stats for display.
func get_dps_stats() -> Dictionary:
	var current_dps: float = _calculate_current_dps()
	var crit_rate: float = 0.0
	if _total_hits > 0:
		crit_rate = float(_total_crits) / float(_total_hits)

	return {
		"current_dps": current_dps,
		"peak_dps": _peak_dps,
		"hits": _total_hits,
		"crits": _total_crits,
		"crit_rate": crit_rate,
		"is_training": _is_training,
	}


## Reset all training stats.
func reset_stats() -> void:
	_hit_log.clear()
	_total_hits = 0
	_total_crits = 0
	_peak_dps = 0.0
	_training_start_time = Time.get_ticks_msec() / 1000.0


## Whether currently in a training session.
func is_training() -> bool:
	return _is_training


# ---------------------------------------------------------------------------
# Stat upgrades (persistent)
# ---------------------------------------------------------------------------

## Get the cost for the next upgrade of a stat.
func get_stat_upgrade_cost(stat_name: String) -> int:
	var current_level: int = _stat_upgrades.get(stat_name, 0)
	return int(float(STAT_BOOST_COST_BASE) * pow(STAT_BOOST_COST_SCALE, float(current_level)))


## Purchase a stat upgrade. Returns true on success.
func purchase_stat_upgrade(stat_name: String) -> bool:
	var cost: int = get_stat_upgrade_cost(stat_name)

	# Can pay with run gold or bank gold
	if GameManager.run_state != null and GameManager.run_state.gold >= cost:
		GameManager.run_state.gold -= cost
	elif GameManager.persistent_state != null and GameManager.persistent_state.bank_gold >= cost:
		GameManager.persistent_state.bank_gold -= cost
	else:
		return false

	_stat_upgrades[stat_name] = _stat_upgrades.get(stat_name, 0) + 1
	_save_persistent()
	return true


## Get the current upgrade level for a stat.
func get_stat_upgrade_level(stat_name: String) -> int:
	return _stat_upgrades.get(stat_name, 0)


## Get all stat upgrades.
func get_all_stat_upgrades() -> Dictionary:
	return _stat_upgrades.duplicate()


## Get the stat bonus from upgrades (applied to player base stats).
func get_stat_bonus(stat_name: String) -> int:
	return _stat_upgrades.get(stat_name, 0)


# ---------------------------------------------------------------------------
# Ability unlocks (persistent)
# ---------------------------------------------------------------------------

## Get the cost to unlock an ability.
func get_ability_unlock_cost(ability_id: String) -> int:
	# Could vary by ability; using base cost for now
	return ABILITY_UNLOCK_COST_BASE


## Unlock an ability. Returns true on success.
func unlock_ability(ability_id: String) -> bool:
	if _unlocked_abilities.has(ability_id):
		return false  # Already unlocked

	var cost: int = get_ability_unlock_cost(ability_id)

	if GameManager.run_state != null and GameManager.run_state.gold >= cost:
		GameManager.run_state.gold -= cost
	elif GameManager.persistent_state != null and GameManager.persistent_state.bank_gold >= cost:
		GameManager.persistent_state.bank_gold -= cost
	else:
		return false

	_unlocked_abilities.append(ability_id)
	_save_persistent()
	return true


## Check if an ability is unlocked.
func is_ability_unlocked(ability_id: String) -> bool:
	return _unlocked_abilities.has(ability_id)


## Get all unlocked abilities.
func get_unlocked_abilities() -> Array[String]:
	return _unlocked_abilities.duplicate()


# ---------------------------------------------------------------------------
# Apply upgrades to player
# ---------------------------------------------------------------------------

## Apply all persistent stat upgrades to the player entity.
func apply_upgrades_to_player() -> void:
	if GameManager.player == null:
		return

	for stat_name in _stat_upgrades:
		var bonus: int = _stat_upgrades[stat_name]
		if bonus > 0 and GameManager.player.has_method("add_stat_bonus"):
			GameManager.player.add_stat_bonus(stat_name, bonus)


# ---------------------------------------------------------------------------
# Internal DPS calculation
# ---------------------------------------------------------------------------

func _calculate_current_dps() -> float:
	if _hit_log.is_empty():
		return 0.0

	var now: float = Time.get_ticks_msec() / 1000.0
	var total_damage: float = 0.0

	for entry in _hit_log:
		if (now - entry["time"]) <= DPS_WINDOW:
			total_damage += float(entry["damage"])

	var elapsed: float = minf(DPS_WINDOW, now - _training_start_time)
	if elapsed <= 0.0:
		return 0.0

	return total_damage / elapsed


# ---------------------------------------------------------------------------
# Persistence
# ---------------------------------------------------------------------------

func _save_persistent() -> void:
	if GameManager.persistent_state == null:
		return
	GameManager.persistent_state.npc_states["_training_stats"] = _stat_upgrades.duplicate()
	GameManager.persistent_state.npc_states["_training_abilities"] = _unlocked_abilities.duplicate()
	SaveManager.save_game(GameManager.persistent_state)


func _load_persistent() -> void:
	if GameManager.persistent_state == null:
		return
	var saved_stats = GameManager.persistent_state.npc_states.get("_training_stats", {})
	if saved_stats is Dictionary:
		_stat_upgrades = saved_stats.duplicate()
	var saved_abilities = GameManager.persistent_state.npc_states.get("_training_abilities", [])
	if saved_abilities is Array:
		_unlocked_abilities.clear()
		for a in saved_abilities:
			_unlocked_abilities.append(a)
