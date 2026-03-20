class_name SurvivalIntegration
extends BaseSystem
## Master coordinator that orchestrates the dungeon game loop.
## Handles run lifecycle, floor transitions, player death, and game-tick processing.

# --- Config ---
const SHIFT_COUNTDOWN_DEFAULT: float = 600.0  # 10 minutes per floor
const GAME_TICK_RATE: float = 0.5             # seconds between logic ticks
const DARKNESS_DAMAGE: int = 5                # damage per tick without light

# --- Run-scoped state ---
var game_state: String = "exploring"  # exploring | combat | paused | gameover | village
var floor_number: int = 1
var shift_countdown: float = SHIFT_COUNTDOWN_DEFAULT
var is_village: bool = false
var tick_timer: float = 0.0

var run_stats: Dictionary = {
	"kills": 0,
	"gold_earned": 0,
	"damage_dealt": 0,
	"damage_taken": 0,
	"items_found": 0,
	"floors_cleared": 0,
	"time_elapsed": 0.0,
	"highest_streak": 0,
	"boons_collected": 0,
}


func _init() -> void:
	system_name = "survival-integration"
	priority = 1


func initialize() -> void:
	# Connect to relevant EventBus signals
	EventBus.player_killed_enemy.connect(_on_player_killed_enemy)
	EventBus.player_took_damage.connect(_on_player_took_damage)
	EventBus.entity_died.connect(_on_entity_died)
	EventBus.floor_advanced.connect(_on_floor_advanced)


func process_system(delta: float) -> void:
	if is_village or game_state == "gameover":
		return

	# Accumulate run time
	run_stats["time_elapsed"] += delta

	# Shift countdown
	if GameManager.run_state and not GameManager.run_state.shift_active:
		shift_countdown -= delta
		if shift_countdown <= 0.0:
			_trigger_shift()

	# Game tick (periodic logic)
	tick_timer += delta
	if tick_timer >= GAME_TICK_RATE:
		tick_timer -= GAME_TICK_RATE
		_process_game_tick(GAME_TICK_RATE)


func cleanup() -> void:
	game_state = "exploring"
	tick_timer = 0.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func start_new_run() -> void:
	GameManager.start_new_run()
	floor_number = 1
	shift_countdown = SHIFT_COUNTDOWN_DEFAULT
	is_village = false
	game_state = "exploring"
	run_stats = {
		"kills": 0,
		"gold_earned": 0,
		"damage_dealt": 0,
		"damage_taken": 0,
		"items_found": 0,
		"floors_cleared": 0,
		"time_elapsed": 0.0,
		"highest_streak": 0,
		"boons_collected": 0,
	}
	GameManager.change_state(Constants.GameState.PLAYING)


func enter_dungeon() -> void:
	is_village = false
	game_state = "exploring"
	floor_number = 1
	shift_countdown = SHIFT_COUNTDOWN_DEFAULT
	GameManager.change_state(Constants.GameState.PLAYING)


func change_floor(direction: int) -> void:
	var old_floor := floor_number
	floor_number += direction
	if GameManager.run_state:
		GameManager.run_state.current_floor = floor_number
		GameManager.run_state.floor_time = 0.0
	shift_countdown = SHIFT_COUNTDOWN_DEFAULT
	run_stats["floors_cleared"] += 1
	EventBus.floor_advanced.emit(floor_number, old_floor)


func handle_player_death() -> void:
	game_state = "gameover"
	GameManager.change_state(Constants.GameState.DEAD)
	GameManager.end_run(false)


func return_to_village() -> void:
	is_village = true
	game_state = "village"
	GameManager.change_state(Constants.GameState.VILLAGE)
	GameManager.end_run(true)


func set_game_state(new_state: String) -> void:
	var old := game_state
	game_state = new_state
	if new_state == "combat":
		GameManager.change_state(Constants.GameState.COMBAT)
	elif new_state == "exploring":
		GameManager.change_state(Constants.GameState.PLAYING)
	elif new_state == "paused":
		GameManager.change_state(Constants.GameState.PAUSED)


func get_run_stats() -> Dictionary:
	return run_stats.duplicate()


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _process_game_tick(_tick_delta: float) -> void:
	if not GameManager.player:
		return

	var player: Node = GameManager.player

	# Check player death
	if player.has_method("get_hp"):
		if player.get_hp() <= 0:
			handle_player_death()
			return

	# Darkness damage — applied when light system reports no light
	if player.has_method("get_light_radius"):
		if player.get_light_radius() <= 0.0:
			if player.has_method("take_damage"):
				player.take_damage(DARKNESS_DAMAGE, null, "darkness")

	# Floor time tracking
	if GameManager.run_state:
		GameManager.run_state.floor_time += _tick_delta


func _trigger_shift() -> void:
	if GameManager.run_state:
		GameManager.run_state.shift_active = true


# ---------------------------------------------------------------------------
# Signal callbacks
# ---------------------------------------------------------------------------

func _on_player_killed_enemy(_player: Node, _enemy: Node) -> void:
	run_stats["kills"] += 1


func _on_player_took_damage(_player: Node, amount: float, _source: Node) -> void:
	run_stats["damage_taken"] += int(amount)


func _on_entity_died(_entity: Node, _killer: Node) -> void:
	pass  # Additional tracking handled by kill_streak_system


func _on_floor_advanced(new_floor: int, _previous_floor: int) -> void:
	floor_number = new_floor


func on_state_changed(old_state: int, new_state: int) -> void:
	if new_state == Constants.GameState.PAUSED:
		game_state = "paused"
	elif new_state == Constants.GameState.PLAYING:
		game_state = "exploring"
	elif new_state == Constants.GameState.COMBAT:
		game_state = "combat"
