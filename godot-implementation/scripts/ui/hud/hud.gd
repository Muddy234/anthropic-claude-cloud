class_name HUD
extends Control
## Main HUD controller that orchestrates all heads-up display sub-components.
## Connects to EventBus signals and delegates updates to child elements.

# ── Sub-component references ────────────────────────────────────────────────
@onready var player_name_label: Label = %PlayerNameLabel
@onready var player_level_label: Label = %PlayerLevelLabel
@onready var player_health_bar: ProgressBar = %PlayerHealthBar
@onready var player_health_label: Label = %PlayerHealthLabel
@onready var player_mana_bar: ProgressBar = %PlayerManaBar
@onready var player_mana_label: Label = %PlayerManaLabel
@onready var player_stamina_bar: ProgressBar = %PlayerStaminaBar
@onready var player_stamina_label: Label = %PlayerStaminaLabel
@onready var player_status_effects: GridContainer = %PlayerStatusEffects
@onready var player_frame: PanelContainer = %PlayerFrame

@onready var enemy_frame: PanelContainer = %EnemyFrame
@onready var enemy_name_label: Label = %EnemyNameLabel
@onready var enemy_level_label: Label = %EnemyLevelLabel
@onready var enemy_health_bar: ProgressBar = %EnemyHealthBar
@onready var enemy_health_label: Label = %EnemyHealthLabel

@onready var gold_label: Label = %GoldLabel
@onready var floor_label: Label = %FloorLabel

@onready var mini_map: Control = %MiniMap
@onready var combat_log: Control = %CombatLog
@onready var kill_streak_display: Control = %KillStreakDisplay
@onready var action_bar: Control = %ActionBar

@onready var damage_number_container: Control = %DamageNumberContainer

# ── Constants ───────────────────────────────────────────────────────────────
const DAMAGE_NUMBER_FLOAT_SPEED: float = 60.0
const DAMAGE_NUMBER_DURATION: float = 1.2
const DAMAGE_NUMBER_CRIT_SCALE: float = 1.5

# ── State ───────────────────────────────────────────────────────────────────
var _active_damage_numbers: Array[Dictionary] = []


# ── Lifecycle ───────────────────────────────────────────────────────────────

func _ready() -> void:
	enemy_frame.visible = false

	# Player combat signals
	EventBus.player_took_damage.connect(_on_player_took_damage)
	EventBus.player_spell_heal.connect(_on_player_healed)
	EventBus.player_damage_taken.connect(_on_player_damage_taken)
	EventBus.stamina_exhausted.connect(_on_stamina_exhausted)
	EventBus.stamina_recovered.connect(_on_stamina_recovered)

	# Enemy signals
	EventBus.player_hit_enemy.connect(_on_player_hit_enemy)
	EventBus.player_critical_hit.connect(_on_player_critical_hit)
	EventBus.enemy_death.connect(_on_enemy_death)
	EventBus.player_killed_enemy.connect(_on_player_killed_enemy)

	# Game progression signals
	EventBus.floor_advanced.connect(_on_floor_advanced)
	EventBus.game_state_changed.connect(_on_game_state_changed)

	# Spell/shield signals
	EventBus.player_spell_shield.connect(_on_player_spell_shield)
	EventBus.player_shield_break.connect(_on_player_shield_break)

	# Initialize display
	update_gold(0)
	update_floor(1)


func _process(delta: float) -> void:
	_process_damage_numbers(delta)


# ── Player Frame ────────────────────────────────────────────────────────────

func update_player_frame(
	hp: float,
	max_hp: float,
	mp: float,
	max_mp: float,
	stamina: float,
	max_stamina: float,
	level: int,
	player_name: String
) -> void:
	player_name_label.text = player_name
	player_level_label.text = "Lv.%d" % level

	# Health bar
	player_health_bar.max_value = max_hp
	player_health_bar.value = hp
	player_health_label.text = "%d / %d" % [int(hp), int(max_hp)]

	var hp_ratio: float = hp / maxf(max_hp, 1.0)
	if hp_ratio < 0.25:
		_set_bar_color(player_health_bar, UIConstants.HP_CRITICAL)
	elif hp_ratio < 0.5:
		_set_bar_color(player_health_bar, UIConstants.HP_LOW)
	else:
		_set_bar_color(player_health_bar, UIConstants.HP_BAR)

	# Mana bar
	player_mana_bar.max_value = max_mp
	player_mana_bar.value = mp
	player_mana_label.text = "%d / %d" % [int(mp), int(max_mp)]

	# Stamina bar
	player_stamina_bar.max_value = max_stamina
	player_stamina_bar.value = stamina
	player_stamina_label.text = "%d / %d" % [int(stamina), int(max_stamina)]


# ── Enemy / Target Frame ───────────────────────────────────────────────────

func update_target_frame(enemy_data: Dictionary) -> void:
	if enemy_data.is_empty():
		clear_target()
		return

	enemy_frame.visible = true

	var ename: String = enemy_data.get("name", "Unknown")
	var level: int = enemy_data.get("level", 1)
	var hp: float = enemy_data.get("hp", 0.0)
	var max_hp: float = enemy_data.get("max_hp", 1.0)

	enemy_name_label.text = ename
	enemy_level_label.text = "Lv.%d" % level

	enemy_health_bar.max_value = max_hp
	enemy_health_bar.value = hp
	enemy_health_label.text = "%d / %d" % [int(hp), int(max_hp)]

	# Color the enemy health bar based on remaining HP
	var hp_ratio: float = hp / maxf(max_hp, 1.0)
	if hp_ratio < 0.25:
		_set_bar_color(enemy_health_bar, UIConstants.HP_CRITICAL)
	elif hp_ratio < 0.5:
		_set_bar_color(enemy_health_bar, UIConstants.HP_LOW)
	else:
		_set_bar_color(enemy_health_bar, UIConstants.HP_BAR)

	# Apply tier color to name if present
	var tier_color: Color = enemy_data.get("tier_color", UIConstants.TEXT_PRIMARY)
	enemy_name_label.add_theme_color_override("font_color", tier_color)


func clear_target() -> void:
	enemy_frame.visible = false


# ── Gold / Floor ────────────────────────────────────────────────────────────

func update_gold(amount: int) -> void:
	gold_label.text = "%d" % amount
	gold_label.add_theme_color_override("font_color", UIConstants.GOLD)


func update_floor(floor_num: int) -> void:
	floor_label.text = "F%d" % floor_num
	floor_label.add_theme_color_override("font_color", UIConstants.TEXT_SECONDARY)


# ── Status Effects ──────────────────────────────────────────────────────────

func update_status_effects(effects: Array) -> void:
	# Clear existing effect icons
	for child in player_status_effects.get_children():
		child.queue_free()

	for effect_data: Dictionary in effects:
		var icon_rect := TextureRect.new()
		icon_rect.custom_minimum_size = Vector2(20, 20)
		icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED

		# Apply tint based on effect type
		var effect_type: String = effect_data.get("type", "neutral")
		match effect_type:
			"buff":
				icon_rect.modulate = UIConstants.SUCCESS
			"debuff":
				icon_rect.modulate = UIConstants.DANGER
			"dot":
				icon_rect.modulate = UIConstants.WARNING
			_:
				icon_rect.modulate = UIConstants.TEXT_PRIMARY

		# Set icon texture if available
		var icon_path: String = effect_data.get("icon", "")
		if not icon_path.is_empty() and ResourceLoader.exists(icon_path):
			icon_rect.texture = load(icon_path)

		# Tooltip with effect name and remaining duration
		var tooltip_text: String = effect_data.get("name", "Unknown")
		var duration: float = effect_data.get("remaining", 0.0)
		if duration > 0.0:
			tooltip_text += " (%.1fs)" % duration
		var stacks: int = effect_data.get("stacks", 1)
		if stacks > 1:
			tooltip_text += " x%d" % stacks
		icon_rect.tooltip_text = tooltip_text

		player_status_effects.add_child(icon_rect)


# ── Floating Damage Numbers ────────────────────────────────────────────────

func show_damage_number(amount: int, pos: Vector2, is_crit: bool) -> void:
	var label := Label.new()
	label.text = str(amount)
	label.position = pos
	label.z_index = 100

	# Style based on crit
	if is_crit:
		label.add_theme_font_size_override("font_size", UIConstants.FONT_SIZES["title"])
		label.add_theme_color_override("font_color", UIConstants.DANGER)
		label.scale = Vector2(DAMAGE_NUMBER_CRIT_SCALE, DAMAGE_NUMBER_CRIT_SCALE)
		label.text = "%d!" % amount
	else:
		label.add_theme_font_size_override("font_size", UIConstants.FONT_SIZES["body"])
		label.add_theme_color_override("font_color", UIConstants.HP_BAR)

	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	damage_number_container.add_child(label)

	_active_damage_numbers.append({
		"label": label,
		"elapsed": 0.0,
		"velocity": Vector2(randf_range(-20.0, 20.0), -DAMAGE_NUMBER_FLOAT_SPEED),
		"is_crit": is_crit,
	})


func show_heal_number(amount: int, pos: Vector2) -> void:
	var label := Label.new()
	label.text = "+%d" % amount
	label.position = pos
	label.z_index = 100
	label.add_theme_font_size_override("font_size", UIConstants.FONT_SIZES["body"])
	label.add_theme_color_override("font_color", UIConstants.SUCCESS)
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	damage_number_container.add_child(label)

	_active_damage_numbers.append({
		"label": label,
		"elapsed": 0.0,
		"velocity": Vector2(randf_range(-10.0, 10.0), -DAMAGE_NUMBER_FLOAT_SPEED * 0.8),
		"is_crit": false,
	})


func _process_damage_numbers(delta: float) -> void:
	var to_remove: Array[int] = []
	for i in range(_active_damage_numbers.size()):
		var data: Dictionary = _active_damage_numbers[i]
		var label: Label = data["label"]
		data["elapsed"] += delta

		if data["elapsed"] >= DAMAGE_NUMBER_DURATION:
			to_remove.append(i)
			continue

		# Float upward with slight deceleration
		var t: float = data["elapsed"] / DAMAGE_NUMBER_DURATION
		label.position += data["velocity"] * delta
		data["velocity"].y += 40.0 * delta  # Gravity

		# Fade out in the last 40%
		if t > 0.6:
			label.modulate.a = 1.0 - ((t - 0.6) / 0.4)

	# Remove expired numbers in reverse order
	for i in range(to_remove.size() - 1, -1, -1):
		var idx: int = to_remove[i]
		var label: Label = _active_damage_numbers[idx]["label"]
		label.queue_free()
		_active_damage_numbers.remove_at(idx)


# ── Sub-Component Visibility ────────────────────────────────────────────────

func set_minimap_visible(is_visible: bool) -> void:
	if mini_map:
		mini_map.visible = is_visible


func set_combat_log_visible(is_visible: bool) -> void:
	if combat_log:
		combat_log.visible = is_visible


func set_kill_streak_visible(is_visible: bool) -> void:
	if kill_streak_display:
		kill_streak_display.visible = is_visible


func set_action_bar_visible(is_visible: bool) -> void:
	if action_bar:
		action_bar.visible = is_visible


# ── Signal Handlers ─────────────────────────────────────────────────────────

func _on_player_took_damage(player: Node, amount: float, source: Node) -> void:
	if not is_instance_valid(player):
		return
	# Flash the health bar red briefly
	_flash_bar(player_health_bar, UIConstants.DANGER, 0.3)
	# Show floating damage number at player position
	if player.has_method("get_screen_position"):
		show_damage_number(int(amount), player.get_screen_position(), false)


func _on_player_damage_taken(player: Node, damage: float, _source: Node) -> void:
	if not is_instance_valid(player):
		return
	_flash_bar(player_health_bar, UIConstants.DANGER, 0.2)


func _on_player_healed(player: Node, amount: float) -> void:
	if not is_instance_valid(player):
		return
	# Flash the health bar green briefly
	_flash_bar(player_health_bar, UIConstants.SUCCESS, 0.3)
	if player.has_method("get_screen_position"):
		show_heal_number(int(amount), player.get_screen_position())


func _on_player_hit_enemy(player: Node, enemy: Node, damage: float, _weapon_type: String) -> void:
	if not is_instance_valid(enemy):
		return
	if enemy.has_method("get_screen_position"):
		show_damage_number(int(damage), enemy.get_screen_position(), false)


func _on_player_critical_hit(player: Node, enemy: Node, damage: float) -> void:
	if not is_instance_valid(enemy):
		return
	if enemy.has_method("get_screen_position"):
		show_damage_number(int(damage), enemy.get_screen_position(), true)


func _on_enemy_death(enemy: Node, _killer: Node, _overkill: float) -> void:
	# If the dead enemy is our current target, clear the frame
	if enemy_frame.visible and is_instance_valid(enemy):
		clear_target()


func _on_player_killed_enemy(_player: Node, _enemy: Node) -> void:
	# Kill streak display handles its own updates via kill_streak_system signals
	pass


func _on_floor_advanced(new_floor: int, _previous_floor: int) -> void:
	update_floor(new_floor)


func _on_game_state_changed(old_state: int, new_state: int) -> void:
	# Hide/show HUD elements based on game state
	var in_gameplay: bool = new_state in [
		Constants.GameState.PLAYING,
		Constants.GameState.COMBAT,
	]
	set_action_bar_visible(in_gameplay)
	set_minimap_visible(in_gameplay)
	set_kill_streak_visible(in_gameplay)

	# Combat log stays visible in more states
	var show_log: bool = new_state in [
		Constants.GameState.PLAYING,
		Constants.GameState.COMBAT,
		Constants.GameState.DIALOGUE,
		Constants.GameState.SHOP,
	]
	set_combat_log_visible(show_log)

	# Hide everything during menus and game over
	var hide_all: bool = new_state in [
		Constants.GameState.MENU,
		Constants.GameState.GAME_OVER,
	]
	if hide_all:
		visible = false
	else:
		visible = true


func _on_player_spell_shield(_player: Node, amount: float) -> void:
	# Visual feedback that a shield was applied
	_flash_bar(player_health_bar, UIConstants.MP_BAR, 0.4)


func _on_player_shield_break(_player: Node) -> void:
	_flash_bar(player_health_bar, UIConstants.WARNING, 0.5)


func _on_stamina_exhausted(_player: Node) -> void:
	_flash_bar(player_stamina_bar, UIConstants.DANGER, 0.5)


func _on_stamina_recovered(_player: Node) -> void:
	_flash_bar(player_stamina_bar, UIConstants.SUCCESS, 0.3)


# ── Private Helpers ─────────────────────────────────────────────────────────

func _flash_bar(bar: ProgressBar, flash_color: Color, duration: float) -> void:
	if not is_instance_valid(bar):
		return
	var original_modulate: Color = bar.modulate
	bar.modulate = flash_color
	var tween: Tween = create_tween()
	tween.tween_property(bar, "modulate", original_modulate, duration)


func _set_bar_color(bar: ProgressBar, color: Color) -> void:
	var fill_style: StyleBoxFlat = bar.get_theme_stylebox("fill").duplicate() as StyleBoxFlat
	if fill_style:
		fill_style.bg_color = color
		bar.add_theme_stylebox_override("fill", fill_style)
