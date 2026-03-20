class_name KillStreakSystem
extends BaseSystem
## Tracks consecutive kills and awards escalating damage bonuses.
## Streaks decay over time and can be reset by taking damage.

# ── Signals ──────────────────────────────────────────────────────────────────
signal tier_changed(old_tier: int, new_tier: int, tier_name: String)
signal streak_lost(final_streak: int, final_tier: int)
signal kill_registered(streak_count: int, tier: int, enemy: Node)

# ── Constants ────────────────────────────────────────────────────────────────
const TIERS: Array[Dictionary] = [
	{"kills": 2,  "name": "Double Kill",   "color": Color("#c0c0c0")},
	{"kills": 4,  "name": "Killing Spree", "color": Color("#4a9eff")},
	{"kills": 6,  "name": "Rampage",       "color": Color("#9b4dca")},
	{"kills": 8,  "name": "Unstoppable",   "color": Color("#ff6b35")},
	{"kills": 10, "name": "Godlike",       "color": Color("#ffd700")},
]

const TIER_BONUSES: Dictionary = {
	0: 1.0,
	1: 1.1,
	2: 1.25,
	3: 1.5,
	4: 2.0,
	5: 3.0,
}

const DECAY_TIME: float = 5.0
const DECAY_PER_TICK: int = 1
const RESET_ON_DAMAGE: bool = true

# ── State ────────────────────────────────────────────────────────────────────
var current_streak: int = 0
var highest_streak: int = 0
var highest_tier: int = 0
var total_streaks: int = 0
var decay_timer: float = 0.0
var current_tier: int = 0
var total_kills_this_run: int = 0
var last_kill_time: float = 0.0

# ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	system_name = "KillStreakSystem"
	priority = 40
	super._ready()


func initialize() -> void:
	_connect_signals()
	reset()


func _connect_signals() -> void:
	if EventBus.has_signal("enemy_died"):
		EventBus.enemy_died.connect(_on_enemy_died)
	if EventBus.has_signal("player_damage_taken"):
		EventBus.player_damage_taken.connect(_on_player_damage_taken)


func cleanup() -> void:
	if EventBus.has_signal("enemy_died") and EventBus.enemy_died.is_connected(_on_enemy_died):
		EventBus.enemy_died.disconnect(_on_enemy_died)
	if EventBus.has_signal("player_damage_taken") and EventBus.player_damage_taken.is_connected(_on_player_damage_taken):
		EventBus.player_damage_taken.disconnect(_on_player_damage_taken)


# ── Core Methods ─────────────────────────────────────────────────────────────

func on_kill(enemy: Node) -> void:
	current_streak += 1
	total_kills_this_run += 1
	last_kill_time = Time.get_ticks_msec() / 1000.0
	decay_timer = DECAY_TIME

	if current_streak > highest_streak:
		highest_streak = current_streak

	var old_tier: int = current_tier
	current_tier = _calculate_tier(current_streak)

	if current_tier > highest_tier:
		highest_tier = current_tier

	if current_tier != old_tier:
		var tier_name: String = ""
		if current_tier > 0 and current_tier <= TIERS.size():
			tier_name = TIERS[current_tier - 1]["name"]
			total_streaks += 1
		tier_changed.emit(old_tier, current_tier, tier_name)

	kill_registered.emit(current_streak, current_tier, enemy)


func on_damage_taken(damage: float, source: Node) -> void:
	if not RESET_ON_DAMAGE:
		return
	if current_streak <= 0:
		return

	var old_tier: int = current_tier
	var old_streak: int = current_streak

	current_streak = 0
	current_tier = 0
	decay_timer = 0.0

	if old_tier > 0:
		streak_lost.emit(old_streak, old_tier)
		tier_changed.emit(old_tier, 0, "")


func get_current_bonus_multiplier() -> float:
	if current_tier < 0 or current_tier > 5:
		return 1.0
	return TIER_BONUSES.get(current_tier, 1.0)


func process_system(delta: float) -> void:
	if current_streak <= 0:
		return

	decay_timer -= delta
	if decay_timer <= 0.0:
		decay_timer = DECAY_TIME
		_apply_decay()


func reset() -> void:
	var had_streak: bool = current_streak > 0
	var old_tier: int = current_tier
	var old_streak: int = current_streak

	current_streak = 0
	highest_streak = 0
	highest_tier = 0
	total_streaks = 0
	decay_timer = 0.0
	current_tier = 0
	total_kills_this_run = 0
	last_kill_time = 0.0

	if had_streak and old_tier > 0:
		streak_lost.emit(old_streak, old_tier)
		tier_changed.emit(old_tier, 0, "")


func get_streak_data() -> Dictionary:
	return {
		"current_streak": current_streak,
		"highest_streak": highest_streak,
		"highest_tier": highest_tier,
		"total_streaks": total_streaks,
		"current_tier": current_tier,
		"total_kills_this_run": total_kills_this_run,
		"last_kill_time": last_kill_time,
		"current_bonus": get_current_bonus_multiplier(),
		"decay_timer": decay_timer,
		"current_tier_name": _get_tier_name(current_tier),
		"next_tier_kills": _get_next_tier_kills(),
	}


# ── Private Helpers ──────────────────────────────────────────────────────────

func _calculate_tier(streak: int) -> int:
	var tier: int = 0
	for i in range(TIERS.size()):
		if streak >= TIERS[i]["kills"]:
			tier = i + 1
	return tier


func _apply_decay() -> void:
	var old_tier: int = current_tier
	current_streak = maxi(current_streak - DECAY_PER_TICK, 0)
	current_tier = _calculate_tier(current_streak)

	if current_tier != old_tier:
		var tier_name: String = _get_tier_name(current_tier)
		tier_changed.emit(old_tier, current_tier, tier_name)

	if current_streak <= 0:
		streak_lost.emit(DECAY_PER_TICK, old_tier)
		decay_timer = 0.0


func _get_tier_name(tier: int) -> String:
	if tier <= 0 or tier > TIERS.size():
		return ""
	return TIERS[tier - 1]["name"]


func _get_next_tier_kills() -> int:
	for tier_data in TIERS:
		if current_streak < tier_data["kills"]:
			return tier_data["kills"]
	return -1  # Already at max tier


func _get_tier_color(tier: int) -> Color:
	if tier <= 0 or tier > TIERS.size():
		return Color.WHITE
	return TIERS[tier - 1]["color"]


# ── Signal Handlers ──────────────────────────────────────────────────────────

func _on_enemy_died(enemy: Node) -> void:
	on_kill(enemy)


func _on_player_damage_taken(damage: float, source: Node) -> void:
	on_damage_taken(damage, source)


func _on_game_state_changed(old_state: String, new_state: String) -> void:
	on_state_changed(old_state, new_state)


func on_state_changed(old_state: String, new_state: String) -> void:
	if new_state == "combat":
		reset()
