class_name CharacterSheet
extends Control

## Character sheet showing player stats, skills, and progression

signal closed
signal skill_point_spent(stat_name: String)

@onready var name_label: Label = $PanelContainer/MarginContainer/VBoxContainer/Header/NameLabel
@onready var level_label: Label = $PanelContainer/MarginContainer/VBoxContainer/Header/LevelLabel
@onready var class_label: Label = $PanelContainer/MarginContainer/VBoxContainer/Header/ClassLabel

@onready var hp_bar: ProgressBar = $PanelContainer/MarginContainer/VBoxContainer/VitalsSection/HPBar
@onready var hp_label: Label = $PanelContainer/MarginContainer/VBoxContainer/VitalsSection/HPBar/Label
@onready var mana_bar: ProgressBar = $PanelContainer/MarginContainer/VBoxContainer/VitalsSection/ManaBar
@onready var mana_label: Label = $PanelContainer/MarginContainer/VBoxContainer/VitalsSection/ManaBar/Label
@onready var xp_bar: ProgressBar = $PanelContainer/MarginContainer/VBoxContainer/VitalsSection/XPBar
@onready var xp_label: Label = $PanelContainer/MarginContainer/VBoxContainer/VitalsSection/XPBar/Label

@onready var stats_container: VBoxContainer = $PanelContainer/MarginContainer/VBoxContainer/StatsSection/StatsContainer
@onready var skill_points_label: Label = $PanelContainer/MarginContainer/VBoxContainer/StatsSection/SkillPointsLabel

@onready var combat_stats_container: VBoxContainer = $PanelContainer/MarginContainer/VBoxContainer/CombatSection/CombatStatsContainer

@onready var resistances_container: HBoxContainer = $PanelContainer/MarginContainer/VBoxContainer/ResistancesSection/ResistancesContainer

@onready var close_button: Button = $PanelContainer/MarginContainer/VBoxContainer/Header/CloseButton

const CORE_STATS := ["strength", "dexterity", "intelligence", "vitality"]
const COMBAT_STATS := ["attack", "defense", "crit_chance", "crit_damage", "accuracy", "evasion"]
const RESISTANCES := ["fire", "ice", "lightning", "poison"]

var is_open: bool = false

func _ready():
	if close_button:
		close_button.pressed.connect(close)

	visibility_changed.connect(_on_visibility_changed)
	hide()

func _unhandled_input(event: InputEvent):
	if not visible:
		return

	if event.is_action_pressed("character") or event.is_action_pressed("ui_cancel"):
		close()
		get_viewport().set_input_as_handled()

func open():
	_refresh_all()
	show()
	is_open = true

func close():
	hide()
	is_open = false
	closed.emit()

func _on_visibility_changed():
	if visible:
		_refresh_all()

func _refresh_all():
	if not GameManager.player:
		return

	var player := GameManager.player
	_update_header(player)
	_update_vitals(player)
	_update_core_stats(player)
	_update_combat_stats(player)
	_update_resistances(player)

func _update_header(player: Player):
	if name_label:
		name_label.text = player.player_name if player.player_name else "Hero"

	if level_label:
		level_label.text = "Level %d" % player.level

	if class_label:
		class_label.text = player.player_class if player.player_class else "Adventurer"

func _update_vitals(player: Player):
	if hp_bar:
		hp_bar.max_value = player.max_hp
		hp_bar.value = player.hp
	if hp_label:
		hp_label.text = "%d / %d" % [player.hp, player.max_hp]

	if mana_bar:
		mana_bar.max_value = player.max_mana
		mana_bar.value = player.mana
	if mana_label:
		mana_label.text = "%d / %d" % [player.mana, player.max_mana]

	if xp_bar:
		xp_bar.max_value = player.xp_to_next_level
		xp_bar.value = player.xp
	if xp_label:
		xp_label.text = "%d / %d XP" % [player.xp, player.xp_to_next_level]

func _update_core_stats(player: Player):
	if not stats_container:
		return

	# Clear existing
	for child in stats_container.get_children():
		child.queue_free()

	# Add skill points display
	if skill_points_label:
		skill_points_label.text = "Skill Points: %d" % player.skill_points

	# Add each core stat
	for stat_name in CORE_STATS:
		var row := _create_stat_row(stat_name, player)
		stats_container.add_child(row)

func _create_stat_row(stat_name: String, player: Player) -> HBoxContainer:
	var row := HBoxContainer.new()

	var label := Label.new()
	label.text = stat_name.capitalize() + ":"
	label.custom_minimum_size.x = 100
	row.add_child(label)

	var base_value: int = player.base_stats.get(stat_name, 0)
	var total_value: int = player.get_stat(stat_name)
	var bonus: int = total_value - base_value

	var value_label := Label.new()
	if bonus != 0:
		var bonus_str := "+%d" % bonus if bonus > 0 else str(bonus)
		var color := "green" if bonus > 0 else "red"
		value_label.text = "%d ([color=%s]%s[/color])" % [total_value, color, bonus_str]
		# Note: Would need RichTextLabel for BBCode
		value_label.text = "%d (%s%d)" % [total_value, "+" if bonus > 0 else "", bonus]
	else:
		value_label.text = str(total_value)
	value_label.custom_minimum_size.x = 80
	row.add_child(value_label)

	# Add + button if skill points available
	if player.skill_points > 0:
		var add_button := Button.new()
		add_button.text = "+"
		add_button.custom_minimum_size = Vector2(24, 24)
		add_button.pressed.connect(_on_stat_increase.bind(stat_name))
		row.add_child(add_button)

	return row

func _on_stat_increase(stat_name: String):
	if not GameManager.player:
		return

	var player := GameManager.player
	if player.skill_points <= 0:
		return

	player.skill_points -= 1
	player.base_stats[stat_name] = player.base_stats.get(stat_name, 0) + 1
	player.recalculate_stats()

	skill_point_spent.emit(stat_name)
	_refresh_all()

func _update_combat_stats(player: Player):
	if not combat_stats_container:
		return

	# Clear existing
	for child in combat_stats_container.get_children():
		child.queue_free()

	# Calculate combat stats
	var stats := {
		"Attack": player.get_stat("attack"),
		"Defense": player.get_stat("defense"),
		"Crit Chance": "%d%%" % int(player.get_stat("crit_chance") * 100),
		"Crit Damage": "%d%%" % int(player.get_stat("crit_damage") * 100),
		"Accuracy": player.get_stat("accuracy"),
		"Evasion": player.get_stat("evasion"),
		"Attack Speed": "%.2f" % player.get_stat("attack_speed")
	}

	for stat_name in stats:
		var row := HBoxContainer.new()

		var label := Label.new()
		label.text = stat_name + ":"
		label.custom_minimum_size.x = 100
		row.add_child(label)

		var value_label := Label.new()
		value_label.text = str(stats[stat_name])
		row.add_child(value_label)

		combat_stats_container.add_child(row)

func _update_resistances(player: Player):
	if not resistances_container:
		return

	# Clear existing
	for child in resistances_container.get_children():
		child.queue_free()

	for resist in RESISTANCES:
		var vbox := VBoxContainer.new()
		vbox.alignment = BoxContainer.ALIGNMENT_CENTER

		var icon := TextureRect.new()
		icon.custom_minimum_size = Vector2(24, 24)
		# icon.texture = load resistance icon
		vbox.add_child(icon)

		var label := Label.new()
		var value: int = player.get_stat(resist + "_resist")
		label.text = "%d%%" % value
		label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

		# Color based on value
		if value > 50:
			label.add_theme_color_override("font_color", Color.GREEN)
		elif value < 0:
			label.add_theme_color_override("font_color", Color.RED)

		vbox.add_child(label)

		var name_label := Label.new()
		name_label.text = resist.capitalize()
		name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		name_label.add_theme_font_size_override("font_size", 10)
		vbox.add_child(name_label)

		resistances_container.add_child(vbox)
