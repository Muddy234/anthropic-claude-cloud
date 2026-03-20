class_name KillStreakDisplay
extends Control
## Kill streak HUD element showing counter, tier announcements,
## and a decay ring timer. Connects to KillStreakSystem signals.

# ── Constants ───────────────────────────────────────────────────────────────

# Tier thresholds matching KillStreakSystem.TIERS
const TIER_THRESHOLDS: Array[Dictionary] = [
	{"kills": 2,  "name": "DOUBLE KILL",  "color": Color("#C0C0C0")},
	{"kills": 3,  "name": "TRIPLE KILL",  "color": Color("#4A9EFF")},
	{"kills": 5,  "name": "RAMPAGE",      "color": Color("#9B4DCA")},
	{"kills": 8,  "name": "UNSTOPPABLE",  "color": Color("#FF6B35")},
	{"kills": 12, "name": "GODLIKE",      "color": Color("#FFD700")},
]

const ANNOUNCEMENT_DURATION: float = 2.0
const COUNTER_PULSE_DURATION: float = 0.25
const DECAY_RING_RADIUS: float = 28.0
const DECAY_RING_WIDTH: float = 3.0

# ── Nodes ───────────────────────────────────────────────────────────────────
@onready var counter_label: Label = %CounterLabel
@onready var tier_label: Label = %TierLabel
@onready var decay_ring: TextureProgressBar = %DecayRing

# ── State ───────────────────────────────────────────────────────────────────
var _current_count: int = 0
var _current_tier: int = 0
var _announcement_timer: float = 0.0
var _counter_pulse_timer: float = 0.0
var _decay_ratio: float = 0.0  # 1.0 = full, 0.0 = expired
var _announcement_tween: Tween = null
var _pulse_tween: Tween = null
var _kill_streak_system: Node = null  # Reference to KillStreakSystem

# ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	visible = false
	tier_label.visible = false

	# Style counter label
	counter_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	counter_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	counter_label.add_theme_font_size_override("font_size", UIConstants.FONT_SIZES["title"])
	counter_label.add_theme_color_override("font_color", UIConstants.TEXT_PRIMARY)

	# Style tier label
	tier_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	tier_label.add_theme_font_size_override("font_size", UIConstants.FONT_SIZES["header"])

	# Configure decay ring (TextureProgressBar in radial mode)
	if decay_ring:
		decay_ring.max_value = 1.0
		decay_ring.value = 0.0
		decay_ring.fill_mode = TextureProgressBar.FILL_CLOCKWISE

	# Connect to EventBus signals used by combat systems
	if EventBus.has_signal("enemy_death"):
		EventBus.enemy_death.connect(_on_enemy_death)
	if EventBus.has_signal("player_killed_enemy"):
		EventBus.player_killed_enemy.connect(_on_player_killed_enemy)


func _process(delta: float) -> void:
	if _current_count <= 0:
		return

	# Update announcement timer
	if _announcement_timer > 0.0:
		_announcement_timer -= delta
		if _announcement_timer <= 0.0:
			_hide_announcement()

	# Update counter pulse
	if _counter_pulse_timer > 0.0:
		_counter_pulse_timer -= delta

	# Update decay ring smoothly
	_update_decay_ring()

	# Custom draw for the ring background
	queue_redraw()


func _draw() -> void:
	if _current_count <= 0:
		return

	var center: Vector2 = Vector2(size.x * 0.5, 32.0)

	# Draw ring background (dark)
	draw_arc(center, DECAY_RING_RADIUS, 0.0, TAU, 48,
		Color(UIConstants.BG_DARKEST, 0.6), DECAY_RING_WIDTH + 1.0)

	# Draw decay ring foreground
	if _decay_ratio > 0.0:
		var ring_color: Color = _get_current_tier_color()
		var arc_end: float = TAU * _decay_ratio
		# Start from top (-PI/2)
		draw_arc(center, DECAY_RING_RADIUS, -PI / 2.0, -PI / 2.0 + arc_end, 48,
			ring_color, DECAY_RING_WIDTH)


# ── Public API ──────────────────────────────────────────────────────────────

func bind_kill_streak_system(system: Node) -> void:
	_kill_streak_system = system
	if system.has_signal("kill_registered"):
		system.kill_registered.connect(_on_kill_registered)
	if system.has_signal("tier_changed"):
		system.tier_changed.connect(_on_tier_changed)
	if system.has_signal("streak_lost"):
		system.streak_lost.connect(_on_streak_lost)


func show_streak(count: int, tier: int) -> void:
	_current_count = count
	_current_tier = tier

	if count <= 0:
		_hide_streak()
		return

	visible = true
	counter_label.text = str(count)

	# Apply tier color to counter
	counter_label.add_theme_color_override("font_color", _get_current_tier_color())

	_pulse_counter()


func show_tier_announcement(tier_name: String, tier_color: Color) -> void:
	if tier_name.is_empty():
		return

	tier_label.text = tier_name
	tier_label.add_theme_color_override("font_color", tier_color)
	tier_label.visible = true
	_announcement_timer = ANNOUNCEMENT_DURATION

	# Scale-in animation
	if _announcement_tween:
		_announcement_tween.kill()

	tier_label.scale = Vector2(0.3, 0.3)
	tier_label.modulate.a = 0.0
	tier_label.pivot_offset = tier_label.size * 0.5

	_announcement_tween = create_tween()
	_announcement_tween.set_ease(Tween.EASE_OUT)
	_announcement_tween.set_trans(Tween.TRANS_BACK)
	_announcement_tween.tween_property(tier_label, "scale", Vector2.ONE, 0.35)
	_announcement_tween.parallel().tween_property(tier_label, "modulate:a", 1.0, 0.2)


func set_decay_ratio(ratio: float) -> void:
	_decay_ratio = clampf(ratio, 0.0, 1.0)


# ── Private ─────────────────────────────────────────────────────────────────

func _pulse_counter() -> void:
	if _pulse_tween:
		_pulse_tween.kill()

	_counter_pulse_timer = COUNTER_PULSE_DURATION
	counter_label.pivot_offset = counter_label.size * 0.5

	_pulse_tween = create_tween()
	_pulse_tween.set_ease(Tween.EASE_OUT)
	_pulse_tween.set_trans(Tween.TRANS_ELASTIC)
	counter_label.scale = Vector2(1.4, 1.4)
	_pulse_tween.tween_property(counter_label, "scale", Vector2.ONE, 0.3)


func _hide_announcement() -> void:
	if _announcement_tween:
		_announcement_tween.kill()

	_announcement_tween = create_tween()
	_announcement_tween.tween_property(tier_label, "modulate:a", 0.0, 0.5)
	_announcement_tween.tween_callback(func() -> void: tier_label.visible = false)


func _hide_streak() -> void:
	_current_count = 0
	_current_tier = 0
	_decay_ratio = 0.0

	# Fade out
	var tween: Tween = create_tween()
	tween.tween_property(self, "modulate:a", 0.0, 0.4)
	tween.tween_callback(func() -> void:
		visible = false
		modulate.a = 1.0
	)


func _update_decay_ring() -> void:
	if not _kill_streak_system:
		return

	if "decay_timer" in _kill_streak_system and "DECAY_TIME" in _kill_streak_system:
		var timer: float = _kill_streak_system.decay_timer
		var max_time: float = _kill_streak_system.DECAY_TIME
		_decay_ratio = clampf(timer / maxf(max_time, 0.01), 0.0, 1.0)

	if decay_ring:
		decay_ring.value = _decay_ratio


func _get_current_tier_color() -> Color:
	if _current_tier <= 0:
		return UIConstants.TEXT_PRIMARY
	var idx: int = clampi(_current_tier - 1, 0, TIER_THRESHOLDS.size() - 1)
	return TIER_THRESHOLDS[idx]["color"]


func _get_tier_name(tier: int) -> String:
	if tier <= 0 or tier > TIER_THRESHOLDS.size():
		return ""
	return TIER_THRESHOLDS[tier - 1]["name"]


# ── Signal Handlers ─────────────────────────────────────────────────────────

func _on_kill_registered(streak_count: int, tier: int, _enemy: Node) -> void:
	show_streak(streak_count, tier)


func _on_tier_changed(old_tier: int, new_tier: int, tier_name: String) -> void:
	_current_tier = new_tier

	if new_tier > old_tier and new_tier > 0:
		# Tier increased -- show announcement
		var color: Color = _get_current_tier_color()
		show_tier_announcement(tier_name, color)
	elif new_tier == 0:
		# Tier dropped to 0, streak may be ending
		pass

	# Update counter color
	counter_label.add_theme_color_override("font_color", _get_current_tier_color())


func _on_streak_lost(final_streak: int, _final_tier: int) -> void:
	# Flash red and then hide
	if final_streak > 1:
		var flash_tween: Tween = create_tween()
		counter_label.add_theme_color_override("font_color", UIConstants.DANGER)
		flash_tween.tween_interval(0.3)
		flash_tween.tween_callback(_hide_streak)
	else:
		_hide_streak()


func _on_enemy_death(_enemy: Node, _killer: Node, _overkill: float) -> void:
	# KillStreakSystem handles the logic; we just refresh from it if bound
	if _kill_streak_system:
		var data: Dictionary = _kill_streak_system.get_streak_data()
		show_streak(data.get("current_streak", 0), data.get("current_tier", 0))


func _on_player_killed_enemy(_player: Node, _enemy: Node) -> void:
	# Redundant with _on_kill_registered when system is bound, but acts as
	# fallback if KillStreakSystem signals aren't connected directly.
	if not _kill_streak_system:
		_current_count += 1
		show_streak(_current_count, 0)
