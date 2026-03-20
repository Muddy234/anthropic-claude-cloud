class_name CharacterSheet
extends PanelContainer
## Character stats overlay (non-modal). Displays player stats (STR, DEX, INT, VIT,
## AGI, LCK), derived stats, equipment slots, resistances, level/XP bar, and
## skill points. Toggle with 'C' key.

# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------
const PRIMARY_STATS: PackedStringArray = ["str", "dex", "int", "vit", "agi", "lck"]

const STAT_LABELS: Dictionary = {
	"str": "STR", "dex": "DEX", "int": "INT",
	"vit": "VIT", "agi": "AGI", "lck": "LCK",
}

const DERIVED_STAT_LABELS: PackedStringArray = [
	"damage", "defense", "crit_chance", "crit_mult",
	"dodge_chance", "block_chance", "magic_power", "attack_speed",
]

const EQUIP_SLOT_LABELS: Dictionary = {
	"head": "Head", "chest": "Body", "main": "Weapon",
	"off": "Shield", "ring": "Ring", "amulet": "Amulet",
}

const RESISTANCE_TYPES: PackedStringArray = [
	"fire", "water", "earth", "nature", "shadow", "death"
]

# ---------------------------------------------------------------------------
#  Node references
# ---------------------------------------------------------------------------
@onready var player_name_label: Label = %PlayerNameLabel
@onready var level_label: Label = %LevelLabel
@onready var xp_bar: ProgressBar = %XpBar
@onready var xp_label: Label = %XpLabel
@onready var skill_points_label: Label = %SkillPointsLabel
@onready var primary_stats_grid: GridContainer = %PrimaryStatsGrid
@onready var derived_stats_grid: GridContainer = %DerivedStatsGrid
@onready var equipment_grid: GridContainer = %EquipmentGrid
@onready var resistances_grid: GridContainer = %ResistancesGrid

# ---------------------------------------------------------------------------
#  State
# ---------------------------------------------------------------------------
var _is_open: bool = false
var _stat_value_labels: Dictionary = {}  # stat_name -> Label node
var _derived_value_labels: Dictionary = {}
var _equip_value_labels: Dictionary = {}
var _resistance_value_labels: Dictionary = {}

# ---------------------------------------------------------------------------
#  Lifecycle
# ---------------------------------------------------------------------------
func _ready() -> void:
	visible = false
	_build_stat_displays()

	EventBus.game_state_changed.connect(_on_game_state_changed)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("character_sheet"):
		toggle()
		get_viewport().set_input_as_handled()


func _process(_delta: float) -> void:
	if _is_open:
		_update_all_stats()

# ---------------------------------------------------------------------------
#  Toggle
# ---------------------------------------------------------------------------
func toggle() -> void:
	if _is_open:
		close()
	else:
		open()


func open() -> void:
	if _is_open:
		return
	_is_open = true
	visible = true
	_update_all_stats()


func close() -> void:
	if not _is_open:
		return
	_is_open = false
	visible = false

# ---------------------------------------------------------------------------
#  Build UI structure (called once in _ready)
# ---------------------------------------------------------------------------
func _build_stat_displays() -> void:
	# Primary stats
	_build_primary_stats()
	# Derived stats
	_build_derived_stats()
	# Equipment slots
	_build_equipment_slots()
	# Resistances
	_build_resistances()


func _build_primary_stats() -> void:
	if not primary_stats_grid:
		return
	for child in primary_stats_grid.get_children():
		child.queue_free()

	primary_stats_grid.columns = 2

	for stat: String in PRIMARY_STATS:
		var name_lbl := Label.new()
		name_lbl.text = STAT_LABELS.get(stat, stat.to_upper())
		name_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
		name_lbl.custom_minimum_size.x = 60
		primary_stats_grid.add_child(name_lbl)

		var value_lbl := Label.new()
		value_lbl.text = "0"
		value_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)
		value_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		primary_stats_grid.add_child(value_lbl)

		_stat_value_labels[stat] = value_lbl


func _build_derived_stats() -> void:
	if not derived_stats_grid:
		return
	for child in derived_stats_grid.get_children():
		child.queue_free()

	derived_stats_grid.columns = 2

	for stat: String in DERIVED_STAT_LABELS:
		var name_lbl := Label.new()
		name_lbl.text = _format_stat_name(stat)
		name_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
		name_lbl.custom_minimum_size.x = 100
		derived_stats_grid.add_child(name_lbl)

		var value_lbl := Label.new()
		value_lbl.text = "0"
		value_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
		value_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		derived_stats_grid.add_child(value_lbl)

		_derived_value_labels[stat] = value_lbl


func _build_equipment_slots() -> void:
	if not equipment_grid:
		return
	for child in equipment_grid.get_children():
		child.queue_free()

	equipment_grid.columns = 2

	for slot: String in EQUIP_SLOT_LABELS:
		var slot_lbl := Label.new()
		slot_lbl.text = EQUIP_SLOT_LABELS[slot]
		slot_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
		slot_lbl.custom_minimum_size.x = 80
		equipment_grid.add_child(slot_lbl)

		var item_lbl := Label.new()
		item_lbl.text = "(empty)"
		item_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_DISABLED)
		item_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		item_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		item_lbl.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS
		equipment_grid.add_child(item_lbl)

		_equip_value_labels[slot] = item_lbl


func _build_resistances() -> void:
	if not resistances_grid:
		return
	for child in resistances_grid.get_children():
		child.queue_free()

	resistances_grid.columns = 2

	for element: String in RESISTANCE_TYPES:
		var elem_lbl := Label.new()
		elem_lbl.text = element.capitalize()
		elem_lbl.add_theme_color_override("font_color", UIConstantsDef.get_element_color(element))
		elem_lbl.custom_minimum_size.x = 80
		resistances_grid.add_child(elem_lbl)

		var value_lbl := Label.new()
		value_lbl.text = "0%"
		value_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
		value_lbl.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		resistances_grid.add_child(value_lbl)

		_resistance_value_labels[element] = value_lbl

# ---------------------------------------------------------------------------
#  Update all stats from player data
# ---------------------------------------------------------------------------
func _update_all_stats() -> void:
	var player: Node = _get_player()
	if not player:
		return

	# Name and level
	var player_name: String = player.get("player_name") if player.get("player_name") else "Adventurer"
	if player_name_label:
		player_name_label.text = player_name

	var level: int = player.get("level") if player.get("level") else 1
	if level_label:
		level_label.text = "Level %d" % level
		level_label.add_theme_color_override("font_color", UIConstantsDef.GOLD)

	# XP bar
	var current_xp: int = player.get("xp") if player.get("xp") else 0
	var xp_to_next: int = _calculate_xp_to_level(level)
	if xp_bar:
		xp_bar.max_value = xp_to_next
		xp_bar.value = current_xp
	if xp_label:
		xp_label.text = "%d / %d XP" % [current_xp, xp_to_next]
		xp_label.add_theme_color_override("font_color", UIConstantsDef.XP)

	# Skill points
	var sp: int = player.get("skill_points") if player.get("skill_points") else 0
	if skill_points_label:
		skill_points_label.text = "%d Skill Points Available" % sp
		if sp > 0:
			skill_points_label.add_theme_color_override("font_color", UIConstantsDef.SUCCESS)
		else:
			skill_points_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)

	# Primary stats
	var stats: Dictionary = player.get("stats") if player.get("stats") else {}
	for stat: String in PRIMARY_STATS:
		var value: int = stats.get(stat, 0)
		if _stat_value_labels.has(stat):
			_stat_value_labels[stat].text = str(value)
			# Highlight if above base (10)
			if value > 10:
				_stat_value_labels[stat].add_theme_color_override("font_color", UIConstantsDef.SUCCESS)
			elif value < 10:
				_stat_value_labels[stat].add_theme_color_override("font_color", UIConstantsDef.DANGER)
			else:
				_stat_value_labels[stat].add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)

	# Derived stats
	_update_derived_stats(player, stats)

	# Equipment
	_update_equipment(player)

	# Resistances
	_update_resistances(player)


func _update_derived_stats(player: Node, stats: Dictionary) -> void:
	var str_val: int = stats.get("str", 10)
	var dex_val: int = stats.get("dex", 10)
	var int_val: int = stats.get("int", 10)
	var vit_val: int = stats.get("vit", 10)
	var agi_val: int = stats.get("agi", 10)
	var lck_val: int = stats.get("lck", 10)

	# Calculate derived values (matching JS formulas)
	var damage: float = player.get("attack_damage") if player.get("attack_damage") else (str_val * 1.5)
	var defense: float = player.get("defense") if player.get("defense") else (vit_val * 0.8)
	var crit_chance: float = player.get("crit_chance") if player.get("crit_chance") else (
		ConstantsDef.PLAYER_CONFIG.get("base_crit_chance", 0.05) + lck_val * 0.005 + dex_val * 0.002
	)
	var crit_mult: float = player.get("crit_multiplier") if player.get("crit_multiplier") else (
		ConstantsDef.PLAYER_CONFIG.get("base_crit_multiplier", 1.5)
	)
	var dodge: float = player.get("dodge_chance") if player.get("dodge_chance") else (agi_val * 0.005)
	var block: float = player.get("block_chance") if player.get("block_chance") else 0.0
	var magic_power: float = player.get("magic_power") if player.get("magic_power") else (int_val * 1.2)
	var atk_speed: float = player.get("attack_speed") if player.get("attack_speed") else 1.0

	var derived: Dictionary = {
		"damage": "%.0f" % damage,
		"defense": "%.0f" % defense,
		"crit_chance": "%.1f%%" % (crit_chance * 100.0),
		"crit_mult": "x%.2f" % crit_mult,
		"dodge_chance": "%.1f%%" % (dodge * 100.0),
		"block_chance": "%.1f%%" % (block * 100.0),
		"magic_power": "%.0f" % magic_power,
		"attack_speed": "%.2f/s" % atk_speed,
	}

	for key: String in derived:
		if _derived_value_labels.has(key):
			_derived_value_labels[key].text = derived[key]


func _update_equipment(player: Node) -> void:
	var equipment: Dictionary = player.get("equipment") if player.get("equipment") else {}

	for slot: String in EQUIP_SLOT_LABELS:
		var item: Dictionary = equipment.get(slot, {})
		if _equip_value_labels.has(slot):
			if item.is_empty():
				_equip_value_labels[slot].text = "(empty)"
				_equip_value_labels[slot].add_theme_color_override("font_color", UIConstantsDef.TEXT_DISABLED)
			else:
				_equip_value_labels[slot].text = item.get("name", "Unknown")
				var rarity: String = item.get("rarity", "common")
				_equip_value_labels[slot].add_theme_color_override(
					"font_color", UIConstantsDef.get_rarity_color(rarity)
				)


func _update_resistances(player: Node) -> void:
	var resistances: Dictionary = player.get("resistances") if player.get("resistances") else {}

	for element: String in RESISTANCE_TYPES:
		var resist_val: float = resistances.get(element, 0.0)
		if _resistance_value_labels.has(element):
			_resistance_value_labels[element].text = "%.0f%%" % (resist_val * 100.0)
			if resist_val > 0.0:
				_resistance_value_labels[element].add_theme_color_override("font_color", UIConstantsDef.SUCCESS)
			elif resist_val < 0.0:
				_resistance_value_labels[element].add_theme_color_override("font_color", UIConstantsDef.DANGER)
			else:
				_resistance_value_labels[element].add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)

# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------
func _calculate_xp_to_level(level: int) -> int:
	var base: int = ConstantsDef.PLAYER_CONFIG.get("xp_to_level_base", 100)
	var scaling: float = ConstantsDef.PLAYER_CONFIG.get("xp_scaling", 1.5)
	return int(base * pow(scaling, level - 1))


static func _format_stat_name(stat: String) -> String:
	return stat.replace("_", " ").capitalize()


func _on_game_state_changed(_old_state: int, _new_state: int) -> void:
	# Non-modal overlay: stays open during gameplay, closes on modal states
	pass


func _get_player() -> Node:
	var gm: Node = get_node_or_null("/root/GameManager")
	if gm:
		return gm.get("player")
	return null
