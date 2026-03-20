class_name KillStreakSystem
extends BaseSystem
## Tracks consecutive kills, provides tier announcements and reward multipliers.
## Streak resets on taking unshielded HP damage or on decay timeout.

# --- Tier definitions ---
const STREAK_TIERS: Array[Dictionary] = [
	{"kills": 2,  "name": "Double Kill",   "color": "#c0c0c0", "multiplier": 1.1},
	{"kills": 4,  "name": "Killing Spree", "color": "#4a9eff", "multiplier": 1.25},
	{"kills": 6,  "name": "Rampage",       "color": "#9b4dca", "multiplier": 1.5},
	{"kills": 8,  "name": "Unstoppable",   "color": "#ff6b35", "multiplier": 2.0},
	{"kills": 10, "name": "Godlike",       "color": "#ffd700", "multiplier": 3.0},
]

# --- Config ---
const DECAY_TIME: float = 5.0  # seconds until streak starts decaying

# --- State ---
var current_streak: int = 0
var highest_streak: int = 0
var decay_timer: float = 0.0
var current_tier: Dictionary = {}
var _tier_index: int = -1


func _init() -> void:
	system_name = "kill-streak-system"
	priority = 50


func initialize() -> void:
	EventBus.player_killed_enemy.connect(_on_kill)
	EventBus.player_took_damage.connect(_on_damage_taken)
	EventBus.entity_died.connect(_on_entity_died)


func process_system(delta: float) -> void:
	if current_streak <= 0:
		return

	decay_timer -= delta
	if decay_timer <= 0.0:
		_break_streak("timeout")


func cleanup() -> void:
	current_streak = 0
	highest_streak = 0
	decay_timer = 0.0
	current_tier = {}
	_tier_index = -1


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func get_bonus_multiplier() -> float:
	## Returns gold/XP multiplier for current tier.
	if current_tier.is_empty():
		return 1.0
	return current_tier.get("multiplier", 1.0)


func get_current_streak() -> int:
	return current_streak


func get_highest_streak() -> int:
	return highest_streak


func get_current_tier() -> Dictionary:
	return current_tier


func get_tier_name() -> String:
	return current_tier.get("name", "")


func get_tier_color() -> String:
	return current_tier.get("color", "#ffffff")


func get_decay_remaining() -> float:
	return maxf(decay_timer, 0.0)


func get_decay_percent() -> float:
	if current_streak <= 0:
		return 0.0
	return clampf(decay_timer / DECAY_TIME, 0.0, 1.0)


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _on_kill(_player: Node, _enemy: Node) -> void:
	current_streak += 1
	decay_timer = DECAY_TIME

	if current_streak > highest_streak:
		highest_streak = current_streak

	_update_tier()


func _on_entity_died(_entity: Node, killer: Node) -> void:
	# Only count kills by the player
	if killer == GameManager.player:
		pass  # Already handled by player_killed_enemy


func _on_damage_taken(_player: Node, amount: float, _source: Node) -> void:
	## Reset streak on HP loss (not shielded damage).
	if amount > 0 and current_streak > 0:
		_break_streak("damage_taken")


func _update_tier() -> void:
	var new_tier_index := -1
	for i in range(STREAK_TIERS.size() - 1, -1, -1):
		if current_streak >= STREAK_TIERS[i]["kills"]:
			new_tier_index = i
			break

	if new_tier_index != _tier_index:
		_tier_index = new_tier_index
		if _tier_index >= 0:
			current_tier = STREAK_TIERS[_tier_index]
		else:
			current_tier = {}


func _break_streak(reason: String) -> void:
	var lost_streak := current_streak
	current_streak = 0
	decay_timer = 0.0
	_tier_index = -1
	current_tier = {}
	if lost_streak > 0:
		pass  # UI notification could be triggered here
