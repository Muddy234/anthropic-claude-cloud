class_name HUD
extends Control

## Main heads-up display showing player stats, skills, and game info

@onready var health_bar: ProgressBar = $MarginContainer/VBoxContainer/TopBar/HealthBar
@onready var health_label: Label = $MarginContainer/VBoxContainer/TopBar/HealthBar/Label
@onready var mana_bar: ProgressBar = $MarginContainer/VBoxContainer/TopBar/ManaBar
@onready var mana_label: Label = $MarginContainer/VBoxContainer/TopBar/ManaBar/Label
@onready var xp_bar: ProgressBar = $MarginContainer/VBoxContainer/TopBar/XPBar
@onready var level_label: Label = $MarginContainer/VBoxContainer/TopBar/LevelLabel
@onready var floor_label: Label = $MarginContainer/VBoxContainer/TopBar/FloorLabel
@onready var gold_label: Label = $MarginContainer/VBoxContainer/TopBar/GoldLabel

@onready var skill_bar: HBoxContainer = $MarginContainer/VBoxContainer/BottomBar/SkillBar
@onready var message_log: VBoxContainer = $MarginContainer/VBoxContainer/MessageLog

const MAX_MESSAGES := 5
var messages: Array[String] = []

func _ready():
	# Connect to game events
	EventBus.player_hp_changed.connect(_on_player_hp_changed)
	EventBus.player_mana_changed.connect(_on_player_mana_changed)
	EventBus.player_xp_gained.connect(_on_player_xp_gained)
	EventBus.player_leveled_up.connect(_on_player_leveled_up)
	EventBus.floor_entered.connect(_on_floor_entered)
	EventBus.gold_changed.connect(_on_gold_changed)
	EventBus.message_logged.connect(_on_message_logged)
	EventBus.skill_cooldown_changed.connect(_on_skill_cooldown_changed)

	# Initial update
	_update_all()

func _update_all():
	if not GameManager.player:
		return

	var player := GameManager.player
	_update_health(player.hp, player.max_hp)
	_update_mana(player.mana, player.max_mana)
	_update_xp(player.xp, player.xp_to_next_level)
	_update_level(player.level)
	_update_gold(player.gold)

func _update_health(current: int, maximum: int):
	if health_bar:
		health_bar.max_value = maximum
		health_bar.value = current
	if health_label:
		health_label.text = "%d / %d" % [current, maximum]

func _update_mana(current: int, maximum: int):
	if mana_bar:
		mana_bar.max_value = maximum
		mana_bar.value = current
	if mana_label:
		mana_label.text = "%d / %d" % [current, maximum]

func _update_xp(current: int, needed: int):
	if xp_bar:
		xp_bar.max_value = needed
		xp_bar.value = current

func _update_level(level: int):
	if level_label:
		level_label.text = "Lv.%d" % level

func update_floor(floor_num: int):
	if floor_label:
		floor_label.text = "Floor %d" % floor_num

func _update_gold(amount: int):
	if gold_label:
		gold_label.text = "%s G" % Helpers.format_number(amount)

func add_message(text: String, color: Color = Color.WHITE):
	messages.append(text)
	if messages.size() > MAX_MESSAGES:
		messages.pop_front()

	_refresh_message_log()

func _refresh_message_log():
	if not message_log:
		return

	# Clear existing messages
	for child in message_log.get_children():
		child.queue_free()

	# Add messages
	for msg in messages:
		var label := Label.new()
		label.text = msg
		label.add_theme_font_size_override("font_size", 12)
		message_log.add_child(label)

## Signal handlers
func _on_player_hp_changed(current: int, maximum: int, _change: int):
	_update_health(current, maximum)

func _on_player_mana_changed(current: int, maximum: int, _change: int):
	_update_mana(current, maximum)

func _on_player_xp_gained(amount: int, total: int, needed: int):
	_update_xp(total, needed)

func _on_player_leveled_up(new_level: int):
	_update_level(new_level)
	add_message("Level Up! Now level %d" % new_level, Constants.COLORS.gold)

func _on_floor_entered(floor_num: int):
	update_floor(floor_num)
	add_message("Entered floor %d" % floor_num)

func _on_gold_changed(new_amount: int, _change: int):
	_update_gold(new_amount)

func _on_message_logged(text: String, color: Color):
	add_message(text, color)

func _on_skill_cooldown_changed(skill_index: int, current_cd: float, max_cd: float):
	if skill_bar and skill_index < skill_bar.get_child_count():
		var skill_slot := skill_bar.get_child(skill_index)
		if skill_slot.has_method("update_cooldown"):
			skill_slot.update_cooldown(current_cd, max_cd)
