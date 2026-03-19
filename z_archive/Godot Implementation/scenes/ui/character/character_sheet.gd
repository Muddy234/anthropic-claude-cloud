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
		name_label.text = "Hero"  # Player doesn't have a name property yet

	if level_label:
		level_label.text = "Level %d" % player.level

	if class_label:
		class_label.text = "Adventurer"  # Player doesn't have a class property yet

func _update_vitals(player: Player):
	if hp_bar:
		hp_bar.max_value = player.max_hp
		hp_bar.value = player.current_hp
	if hp_label:
		hp_label.text = "%d / %d" % [player.current_hp, player.max_hp]

	if mana_bar:
		mana_bar.max_value = player.max_mp
		mana_bar.value = player.mp
	if mana_label:
		mana_label.text = "%d / %d" % [player.mp, player.max_mp]

	var xp_needed := _xp_for_level(player.level + 1)
	if xp_bar:
		xp_bar.max_value = xp_needed
		xp_bar.value = player.xp
	if xp_label:
		xp_label.text = "%d / %d XP" % [player.xp, xp_needed]

## Calculate XP required for a level (matches player formula)
func _xp_for_level(lvl: int) -> int:
	return int(100 * pow(lvl, 1.5))

func _update_core_stats(player: Player):
	if not stats_container:
		return

	# Clear existing
	for child in stats_container.get_children():
		child.queue_free()

	# Add skill points display - Player uses available_skill_points
	if skill_points_label:
		skill_points_label.text = "Skill Points: %d" % player.available_skill_points

	# Add each core stat - Player uses stats dictionary with uppercase keys (STR, DEX, etc.)
	var stat_mapping := {
		"strength": "STR",
		"dexterity": "DEX",
		"intelligence": "INT",
		"vitality": "CON"  # Player uses CON for constitution/vitality
	}

	for stat_name in CORE_STATS:
		var stat_key: String = stat_mapping.get(stat_name, stat_name.to_upper())
		var row := _create_stat_row(stat_name, stat_key, player)
		stats_container.add_child(row)

func _create_stat_row(display_name: String, stat_key: String, player: Player) -> HBoxContainer:
	var row := HBoxContainer.new()

	var label := Label.new()
	label.text = display_name.capitalize() + ":"
	label.custom_minimum_size.x = 100
	row.add_child(label)

	var base_value: int = player.stats.get(stat_key, 0)
	var total_value: int = player.get_stat(stat_key)
	var bonus: int = total_value - base_value

	var value_label := Label.new()
	if bonus != 0:
		value_label.text = "%d (%s%d)" % [total_value, "+" if bonus > 0 else "", bonus]
	else:
		value_label.text = str(total_value)
	value_label.custom_minimum_size.x = 80
	row.add_child(value_label)

	# Add + button if skill points available
	if player.available_skill_points > 0:
		var add_button := Button.new()
		add_button.text = "+"
		add_button.custom_minimum_size = Vector2(24, 24)
		add_button.pressed.connect(_on_stat_increase.bind(stat_key))
		row.add_child(add_button)

	return row

func _on_stat_increase(stat_key: String):
	if not GameManager.player:
		return

	var player := GameManager.player
	if player.available_skill_points <= 0:
		return

	player.available_skill_points -= 1
	player.stats[stat_key] = player.stats.get(stat_key, 0) + 1

	skill_point_spent.emit(stat_key)
	_refresh_all()

func _update_combat_stats(player: Player):
	if not combat_stats_container:
		return

	# Clear existing
	for child in combat_stats_container.get_children():
		child.queue_free()

	# Calculate combat stats - use player's specific methods where available
	var crit_chance := player.get_crit_chance() if player.has_method("get_crit_chance") else 0.05
	var stats := {
		"Attack": player.get_stat("attack"),
		"Defense": player.get_stat("defense"),
		"Crit Chance": "%d%%" % int(crit_chance * 100),
		"Crit Damage": "150%",  # Default crit damage multiplier
		"Accuracy": player.get_stat("accuracy"),
		"Evasion": player.get_stat("evasion"),
		"Speed": player.get_stat("speed")
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
