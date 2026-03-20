class_name SkillsPanel
extends PanelContainer
## Skills and proficiency panel with a triangle/radar chart for weapon proficiencies
## (rendered via _draw), proficiency list with XP bars, skill tree placeholder,
## and active abilities list. Toggle with 'K' key. Non-modal overlay.

# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------
const WEAPON_PROFICIENCIES: PackedStringArray = [
	"sword", "mace", "polearm", "bow", "dagger", "staff"
]

const PROF_LABELS: Dictionary = {
	"sword": "Sword", "mace": "Mace", "polearm": "Polearm",
	"bow": "Bow", "dagger": "Dagger", "staff": "Staff",
}

const PROF_COLORS: Dictionary = {
	"sword": Color("#C0C0C0"),
	"mace": Color("#8B4513"),
	"polearm": Color("#4682B4"),
	"bow": Color("#228B22"),
	"dagger": Color("#9400D3"),
	"staff": Color("#DAA520"),
}

## Radar chart sizing
const RADAR_CENTER: Vector2 = Vector2(140, 140)
const RADAR_RADIUS: float = 110.0
const RADAR_RING_COUNT: int = 4

## Max proficiency level for radar scaling
const MAX_PROFICIENCY: float = 100.0

# ---------------------------------------------------------------------------
#  Node references
# ---------------------------------------------------------------------------
@onready var radar_chart: Control = %RadarChart
@onready var proficiency_list: VBoxContainer = %ProficiencyList
@onready var abilities_list: VBoxContainer = %AbilitiesList
@onready var skill_tree_placeholder: Label = %SkillTreePlaceholder

# ---------------------------------------------------------------------------
#  State
# ---------------------------------------------------------------------------
var _is_open: bool = false
var _proficiency_bars: Dictionary = {}  # weapon_type -> ProgressBar

# ---------------------------------------------------------------------------
#  Lifecycle
# ---------------------------------------------------------------------------
func _ready() -> void:
	visible = false

	# Set up the radar chart custom draw
	if radar_chart:
		radar_chart.custom_minimum_size = Vector2(280, 280)
		radar_chart.draw.connect(_draw_radar_chart)

	_build_proficiency_list()
	_build_abilities_section()

	if skill_tree_placeholder:
		skill_tree_placeholder.text = "Skill Tree - Coming Soon"
		skill_tree_placeholder.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
		skill_tree_placeholder.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("skills_menu"):
		toggle()
		get_viewport().set_input_as_handled()


func _process(_delta: float) -> void:
	if _is_open:
		_update_proficiency_data()
		if radar_chart:
			radar_chart.queue_redraw()

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
	_update_proficiency_data()
	_update_abilities()


func close() -> void:
	if not _is_open:
		return
	_is_open = false
	visible = false

# ---------------------------------------------------------------------------
#  Radar chart rendering (custom _draw on the RadarChart control)
# ---------------------------------------------------------------------------
func _draw_radar_chart() -> void:
	if not radar_chart:
		return

	var center: Vector2 = radar_chart.size / 2.0
	var radius: float = minf(center.x, center.y) - 20.0
	var axis_count: int = WEAPON_PROFICIENCIES.size()
	var angle_step: float = TAU / axis_count

	# Draw background rings
	for ring in range(1, RADAR_RING_COUNT + 1):
		var ring_radius: float = radius * (ring / float(RADAR_RING_COUNT))
		var ring_points: PackedVector2Array = PackedVector2Array()
		for i in range(axis_count):
			var angle: float = -PI / 2.0 + i * angle_step
			ring_points.append(center + Vector2(cos(angle), sin(angle)) * ring_radius)
		ring_points.append(ring_points[0])  # close the polygon
		for j in range(ring_points.size() - 1):
			radar_chart.draw_line(
				ring_points[j], ring_points[j + 1],
				UIConstantsDef.BORDER, 1.0
			)

	# Draw axis lines
	for i in range(axis_count):
		var angle: float = -PI / 2.0 + i * angle_step
		var endpoint: Vector2 = center + Vector2(cos(angle), sin(angle)) * radius
		radar_chart.draw_line(center, endpoint, UIConstantsDef.BORDER, 1.0)

		# Axis label
		var label_pos: Vector2 = center + Vector2(cos(angle), sin(angle)) * (radius + 16.0)
		var prof_name: String = PROF_LABELS.get(WEAPON_PROFICIENCIES[i], WEAPON_PROFICIENCIES[i])
		var font: Font = radar_chart.get_theme_default_font()
		var font_size: int = UIConstantsDef.FONT_SIZES.get("small", 12)
		var text_size: Vector2 = font.get_string_size(prof_name, HORIZONTAL_ALIGNMENT_CENTER, -1, font_size)
		radar_chart.draw_string(
			font,
			label_pos - Vector2(text_size.x / 2.0, -text_size.y / 4.0),
			prof_name,
			HORIZONTAL_ALIGNMENT_CENTER,
			-1,
			font_size,
			UIConstantsDef.TEXT_SECONDARY
		)

	# Draw proficiency polygon (filled area)
	var player: Node = _get_player()
	if not player:
		return

	var proficiencies: Dictionary = player.get("proficiencies") if player.get("proficiencies") else {}
	var data_points: PackedVector2Array = PackedVector2Array()

	for i in range(axis_count):
		var weapon_type: String = WEAPON_PROFICIENCIES[i]
		var level: float = proficiencies.get(weapon_type, {}).get("level", 0.0)
		var ratio: float = clampf(level / MAX_PROFICIENCY, 0.0, 1.0)
		var angle: float = -PI / 2.0 + i * angle_step
		data_points.append(center + Vector2(cos(angle), sin(angle)) * radius * ratio)

	if data_points.size() >= 3:
		# Filled polygon (semi-transparent)
		var fill_color: Color = Color(0.3, 0.5, 0.8, 0.25)
		radar_chart.draw_polygon(data_points, PackedColorArray([fill_color]))

		# Outline
		var outline_color: Color = Color(0.4, 0.6, 1.0, 0.8)
		for i in range(data_points.size()):
			var next_i: int = (i + 1) % data_points.size()
			radar_chart.draw_line(data_points[i], data_points[next_i], outline_color, 2.0)

		# Vertex dots
		for point: Vector2 in data_points:
			radar_chart.draw_circle(point, 4.0, outline_color)

# ---------------------------------------------------------------------------
#  Proficiency list with XP bars
# ---------------------------------------------------------------------------
func _build_proficiency_list() -> void:
	if not proficiency_list:
		return
	for child in proficiency_list.get_children():
		child.queue_free()

	for weapon: String in WEAPON_PROFICIENCIES:
		var row := VBoxContainer.new()
		row.custom_minimum_size.y = 40

		# Header row: name + level
		var header := HBoxContainer.new()
		var name_lbl := Label.new()
		name_lbl.text = PROF_LABELS.get(weapon, weapon.capitalize())
		name_lbl.add_theme_color_override("font_color", PROF_COLORS.get(weapon, Color.WHITE))
		name_lbl.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		header.add_child(name_lbl)

		var level_lbl := Label.new()
		level_lbl.text = "Lv. 0"
		level_lbl.name = "LevelLabel"
		level_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
		header.add_child(level_lbl)
		row.add_child(header)

		# XP progress bar
		var xp_bar := ProgressBar.new()
		xp_bar.custom_minimum_size = Vector2(0, 12)
		xp_bar.max_value = 100
		xp_bar.value = 0
		xp_bar.show_percentage = false
		xp_bar.name = "XpBar"
		row.add_child(xp_bar)

		proficiency_list.add_child(row)
		_proficiency_bars[weapon] = row


func _update_proficiency_data() -> void:
	var player: Node = _get_player()
	if not player:
		return

	var proficiencies: Dictionary = player.get("proficiencies") if player.get("proficiencies") else {}

	for weapon: String in WEAPON_PROFICIENCIES:
		if not _proficiency_bars.has(weapon):
			continue
		var row: VBoxContainer = _proficiency_bars[weapon]
		var prof_data: Dictionary = proficiencies.get(weapon, {})
		var level: int = prof_data.get("level", 0)
		var xp: float = prof_data.get("xp", 0.0)
		var xp_to_next: float = prof_data.get("xp_to_next", 100.0)

		# Update level label
		var header: HBoxContainer = row.get_child(0) as HBoxContainer
		if header:
			var level_lbl: Label = header.get_node_or_null("LevelLabel")
			if level_lbl:
				level_lbl.text = "Lv. %d" % level

		# Update XP bar
		var xp_bar: ProgressBar = row.get_node_or_null("XpBar")
		if xp_bar:
			xp_bar.max_value = maxf(xp_to_next, 1.0)
			xp_bar.value = xp

# ---------------------------------------------------------------------------
#  Active abilities list
# ---------------------------------------------------------------------------
func _build_abilities_section() -> void:
	if not abilities_list:
		return
	# Placeholder header
	var header := Label.new()
	header.text = "Active Abilities"
	header.add_theme_color_override("font_color", UIConstantsDef.GOLD)
	abilities_list.add_child(header)


func _update_abilities() -> void:
	if not abilities_list:
		return

	# Clear old entries (keep the header)
	while abilities_list.get_child_count() > 1:
		abilities_list.get_child(abilities_list.get_child_count() - 1).queue_free()

	var player: Node = _get_player()
	if not player:
		return

	var abilities: Array = player.get("active_abilities") if player.get("active_abilities") else []

	if abilities.is_empty():
		var empty_lbl := Label.new()
		empty_lbl.text = "No abilities unlocked"
		empty_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
		abilities_list.add_child(empty_lbl)
		return

	for ability: Dictionary in abilities:
		var row := VBoxContainer.new()

		# Ability name
		var name_lbl := Label.new()
		name_lbl.text = ability.get("name", "Unknown Ability")
		name_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)
		row.add_child(name_lbl)

		# Description
		var desc_lbl := Label.new()
		desc_lbl.text = ability.get("description", "")
		desc_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
		desc_lbl.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		row.add_child(desc_lbl)

		# Cooldown info
		var cd: float = ability.get("cooldown", 0.0)
		if cd > 0.0:
			var cd_lbl := Label.new()
			cd_lbl.text = "Cooldown: %.1fs" % cd
			cd_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
			row.add_child(cd_lbl)

		abilities_list.add_child(row)

# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------
func _get_player() -> Node:
	var gm: Node = get_node_or_null("/root/GameManager")
	if gm:
		return gm.get("player")
	return null
