class_name SkillsPanel
extends Control

## Skills panel showing learned skills, skill trees, and XP tracking

signal closed
signal skill_equipped(skill: SkillData, slot: int)
signal skill_learned(skill: SkillData)

@onready var close_button: Button = $PanelContainer/MarginContainer/VBoxContainer/Header/CloseButton
@onready var skill_points_label: Label = $PanelContainer/MarginContainer/VBoxContainer/Header/SkillPointsLabel
@onready var xp_bar: ProgressBar = $PanelContainer/MarginContainer/VBoxContainer/Header/XPBar
@onready var xp_label: Label = $PanelContainer/MarginContainer/VBoxContainer/Header/XPBar/Label

@onready var tabs: TabContainer = $PanelContainer/MarginContainer/VBoxContainer/TabContainer
@onready var learned_skills_container: VBoxContainer = $PanelContainer/MarginContainer/VBoxContainer/TabContainer/LearnedSkills/ScrollContainer/SkillsList
@onready var skill_tree_container: VBoxContainer = $PanelContainer/MarginContainer/VBoxContainer/TabContainer/SkillTree/ScrollContainer/TreeContainer
@onready var passives_container: VBoxContainer = $PanelContainer/MarginContainer/VBoxContainer/TabContainer/Passives/ScrollContainer/PassivesList

@onready var hotbar_slots: HBoxContainer = $PanelContainer/MarginContainer/VBoxContainer/HotbarSection/HotbarSlots
@onready var skill_details: RichTextLabel = $PanelContainer/MarginContainer/VBoxContainer/DetailsSection/SkillDetails

var selected_skill: SkillData = null
var is_open: bool = false

# Skill trees organized by tree_id
var skill_trees: Dictionary = {}

func _ready():
	if close_button:
		close_button.pressed.connect(close)
	
	visibility_changed.connect(_on_visibility_changed)
	hide()
	
	# Load all available skills into trees
	_load_skill_trees()

func _unhandled_input(event: InputEvent):
	if not visible:
		return
	
	if event.is_action_pressed("skills") or event.is_action_pressed("ui_cancel"):
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
	_update_learned_skills(player)
	_update_skill_tree(player)
	_update_passives(player)
	_update_hotbar(player)

func _update_header(player: Player):
	if skill_points_label:
		var points: int = player.available_skill_points
		skill_points_label.text = "Skill Points: %d" % points
		if points > 0:
			skill_points_label.add_theme_color_override("font_color", Color.YELLOW)
		else:
			skill_points_label.remove_theme_color_override("font_color")
	
	if xp_bar:
		var xp_needed := player._xp_for_level(player.level + 1)
		xp_bar.max_value = xp_needed
		xp_bar.value = player.xp
	
	if xp_label:
		var xp_needed := player._xp_for_level(player.level + 1)
		var percent := int((float(player.xp) / float(xp_needed)) * 100)
		xp_label.text = "%d / %d XP (%d%%)" % [player.xp, xp_needed, percent]

func _update_learned_skills(player: Player):
	if not learned_skills_container:
		return
	
	# Clear existing
	for child in learned_skills_container.get_children():
		child.queue_free()
	
	if player.learned_skills.is_empty():
		var empty_label := Label.new()
		empty_label.text = "No skills learned yet"
		empty_label.add_theme_color_override("font_color", Color.GRAY)
		learned_skills_container.add_child(empty_label)
		return
	
	# Add each learned skill
	for skill in player.learned_skills:
		var skill_row := _create_skill_row(skill, player)
		learned_skills_container.add_child(skill_row)

func _create_skill_row(skill: SkillData, player: Player) -> Control:
	var row := PanelContainer.new()
	var hbox := HBoxContainer.new()
	hbox.custom_minimum_size.y = 40
	
	# Skill icon
	var icon := TextureRect.new()
	icon.custom_minimum_size = Vector2(32, 32)
	if skill.icon:
		icon.texture = skill.icon
	icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	hbox.add_child(icon)
	
	# Skill info
	var info_vbox := VBoxContainer.new()
	info_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	
	var name_label := Label.new()
	name_label.text = skill.name
	if skill.is_passive:
		name_label.text += " [Passive]"
		name_label.add_theme_color_override("font_color", Color.CYAN)
	info_vbox.add_child(name_label)
	
	var cost_label := Label.new()
	cost_label.text = skill.get_cost_text() if skill.has_method("get_cost_text") else ""
	cost_label.add_theme_font_size_override("font_size", 10)
	cost_label.add_theme_color_override("font_color", Color.GRAY)
	info_vbox.add_child(cost_label)
	
	hbox.add_child(info_vbox)
	
	# Cooldown indicator
	if skill.cooldown > 0:
		var cd_label := Label.new()
		var current_cd: int = player.skill_cooldowns.get(skill.id, 0)
		if current_cd > 0:
			cd_label.text = "CD: %d" % current_cd
			cd_label.add_theme_color_override("font_color", Color.RED)
		else:
			cd_label.text = "CD: %d" % skill.cooldown
		hbox.add_child(cd_label)
	
	# Equip button (for active skills)
	if not skill.is_passive:
		var equip_btn := Button.new()
		equip_btn.text = "Equip"
		equip_btn.custom_minimum_size.x = 60
		equip_btn.pressed.connect(_on_equip_skill.bind(skill))
		hbox.add_child(equip_btn)
	
	# Select for details
	row.gui_input.connect(_on_skill_row_input.bind(skill))
	
	row.add_child(hbox)
	return row

func _on_skill_row_input(event: InputEvent, skill: SkillData):
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		_select_skill(skill)

func _select_skill(skill: SkillData):
	selected_skill = skill
	_update_skill_details(skill)

func _update_skill_details(skill: SkillData):
	if not skill_details:
		return
	
	var text := "[b]%s[/b]\n" % skill.name
	text += "[i]%s[/i]\n\n" % (skill.description if skill.description else "No description")
	
	# Cost info
	if skill.mp_cost > 0:
		text += "[color=blue]MP Cost: %d[/color]\n" % skill.mp_cost
	if skill.hp_cost > 0:
		text += "[color=red]HP Cost: %d[/color]\n" % skill.hp_cost
	if skill.cooldown > 0:
		text += "Cooldown: %d turns\n" % skill.cooldown
	
	# Damage info
	if skill.base_damage > 0 or skill.damage_multiplier != 1.0:
		text += "\n[u]Damage[/u]\n"
		if skill.base_damage > 0:
			text += "Base: %d\n" % skill.base_damage
		if skill.damage_multiplier != 1.0:
			text += "Multiplier: %.1fx\n" % skill.damage_multiplier
	
	# Range info
	text += "\n[u]Targeting[/u]\n"
	text += "Type: %s\n" % skill.target_type
	text += "Range: %d\n" % skill.cast_range
	if skill.aoe_radius > 0:
		text += "AoE Radius: %d\n" % skill.aoe_radius
	
	# Passive bonuses
	if skill.is_passive and not skill.passive_bonuses.is_empty():
		text += "\n[u]Passive Bonuses[/u]\n"
		for stat in skill.passive_bonuses:
			var value = skill.passive_bonuses[stat]
			var sign_str := "+" if value > 0 else ""
			text += "%s: %s%s\n" % [stat.capitalize(), sign_str, str(value)]
	
	skill_details.bbcode_enabled = true
	skill_details.text = text

func _update_skill_tree(player: Player):
	if not skill_tree_container:
		return
	
	# Clear existing
	for child in skill_tree_container.get_children():
		child.queue_free()
	
	if skill_trees.is_empty():
		var empty_label := Label.new()
		empty_label.text = "No skill trees available"
		skill_tree_container.add_child(empty_label)
		return
	
	# Create a section for each skill tree
	for tree_id in skill_trees:
		var tree_section := _create_tree_section(tree_id, skill_trees[tree_id], player)
		skill_tree_container.add_child(tree_section)

func _create_tree_section(tree_id: String, skills: Array, player: Player) -> Control:
	var section := VBoxContainer.new()
	
	# Tree header
	var header := Label.new()
	header.text = tree_id.capitalize().replace("_", " ") + " Tree"
	header.add_theme_font_size_override("font_size", 14)
	header.add_theme_color_override("font_color", Color.GOLD)
	section.add_child(header)
	
	# Points allocated in this tree
	var allocated: int = player.allocated_skills.get(tree_id, 0)
	var allocated_label := Label.new()
	allocated_label.text = "Points Allocated: %d" % allocated
	allocated_label.add_theme_font_size_override("font_size", 10)
	section.add_child(allocated_label)
	
	# Organize skills by tier
	var tiers: Dictionary = {}
	for skill in skills:
		var tier: int = skill.tier if skill.tier else 1
		if not tiers.has(tier):
			tiers[tier] = []
		tiers[tier].append(skill)
	
	# Display each tier
	var tier_keys := tiers.keys()
	tier_keys.sort()
	
	for tier in tier_keys:
		var tier_hbox := HBoxContainer.new()
		
		var tier_label := Label.new()
		tier_label.text = "T%d: " % tier
		tier_label.custom_minimum_size.x = 30
		tier_hbox.add_child(tier_label)
		
		for skill in tiers[tier]:
			var skill_btn := _create_tree_skill_button(skill, player)
			tier_hbox.add_child(skill_btn)
		
		section.add_child(tier_hbox)
	
	section.add_child(HSeparator.new())
	return section

func _create_tree_skill_button(skill: SkillData, player: Player) -> Button:
	var btn := Button.new()
	btn.text = skill.name
	btn.custom_minimum_size = Vector2(100, 30)
	btn.tooltip_text = skill.description if skill.description else ""
	
	# Check if learned
	var is_learned := skill in player.learned_skills
	
	# Check if can learn (prerequisites, points)
	var can_learn := _can_learn_skill(skill, player)
	
	if is_learned:
		btn.disabled = true
		btn.text += " ✓"
		btn.add_theme_color_override("font_color", Color.GREEN)
	elif can_learn:
		btn.pressed.connect(_on_learn_skill.bind(skill))
	else:
		btn.disabled = true
		btn.add_theme_color_override("font_disabled_color", Color.DARK_GRAY)
	
	return btn

func _can_learn_skill(skill: SkillData, player: Player) -> bool:
	# Check skill points
	var points_needed: int = skill.points_required if skill.points_required else 1
	if player.available_skill_points < points_needed:
		return false
	
	# Check prerequisites
	if not skill.prerequisites.is_empty():
		for prereq_id in skill.prerequisites:
			var has_prereq := false
			for learned in player.learned_skills:
				if learned.id == prereq_id:
					has_prereq = true
					break
			if not has_prereq:
				return false
	
	# Check if already learned
	for learned in player.learned_skills:
		if learned.id == skill.id:
			return false
	
	return true

func _on_learn_skill(skill: SkillData):
	if not GameManager.player:
		return
	
	var player := GameManager.player
	if not _can_learn_skill(skill, player):
		return
	
	# Deduct skill points
	var points_needed: int = skill.points_required if skill.points_required else 1
	player.available_skill_points -= points_needed
	
	# Track allocation per tree
	var tree_id: String = skill.tree_id if skill.tree_id else "general"
	player.allocated_skills[tree_id] = player.allocated_skills.get(tree_id, 0) + points_needed
	
	# Learn the skill
	player.learned_skills.append(skill)
	
	# Apply passive bonuses if applicable
	if skill.is_passive and skill.has_method("apply_passive"):
		skill.apply_passive(player)
	
	skill_learned.emit(skill)
	player.skill_learned.emit(skill)
	_refresh_all()

func _update_passives(player: Player):
	if not passives_container:
		return
	
	# Clear existing
	for child in passives_container.get_children():
		child.queue_free()
	
	# Find all passive skills
	var passives: Array[SkillData] = []
	for skill in player.learned_skills:
		if skill.is_passive:
			passives.append(skill)
	
	if passives.is_empty():
		var empty_label := Label.new()
		empty_label.text = "No passive skills active"
		empty_label.add_theme_color_override("font_color", Color.GRAY)
		passives_container.add_child(empty_label)
		return
	
	# Display each passive with its bonuses
	for skill in passives:
		var passive_row := _create_passive_row(skill)
		passives_container.add_child(passive_row)

func _create_passive_row(skill: SkillData) -> Control:
	var vbox := VBoxContainer.new()
	
	var name_label := Label.new()
	name_label.text = skill.name
	name_label.add_theme_color_override("font_color", Color.CYAN)
	vbox.add_child(name_label)
	
	# List bonuses
	if not skill.passive_bonuses.is_empty():
		for stat in skill.passive_bonuses:
			var bonus_label := Label.new()
			var value = skill.passive_bonuses[stat]
			var sign_str := "+" if value > 0 else ""
			bonus_label.text = "  • %s: %s%s" % [stat.capitalize(), sign_str, str(value)]
			bonus_label.add_theme_font_size_override("font_size", 11)
			if value > 0:
				bonus_label.add_theme_color_override("font_color", Color.GREEN)
			else:
				bonus_label.add_theme_color_override("font_color", Color.RED)
			vbox.add_child(bonus_label)
	else:
		var desc_label := Label.new()
		desc_label.text = "  " + (skill.description if skill.description else "Passive effect active")
		desc_label.add_theme_font_size_override("font_size", 11)
		vbox.add_child(desc_label)
	
	return vbox

func _update_hotbar(player: Player):
	if not hotbar_slots:
		return
	
	# Clear existing
	for child in hotbar_slots.get_children():
		child.queue_free()
	
	# Create 8 hotbar slots
	for i in range(8):
		var slot := _create_hotbar_slot(i, player)
		hotbar_slots.add_child(slot)

func _create_hotbar_slot(index: int, player: Player) -> Control:
	var slot := PanelContainer.new()
	slot.custom_minimum_size = Vector2(48, 48)
	
	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	
	# Slot number
	var num_label := Label.new()
	num_label.text = str(index + 1)
	num_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	num_label.add_theme_font_size_override("font_size", 10)
	vbox.add_child(num_label)
	
	# Skill in slot
	if index < player.active_skills.size() and player.active_skills[index]:
		var skill: SkillData = player.active_skills[index]
		
		var icon := TextureRect.new()
		icon.custom_minimum_size = Vector2(32, 32)
		if skill.icon:
			icon.texture = skill.icon
		icon.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
		vbox.add_child(icon)
		
		# Clear button
		var clear_btn := Button.new()
		clear_btn.text = "X"
		clear_btn.custom_minimum_size = Vector2(20, 16)
		clear_btn.pressed.connect(_on_clear_slot.bind(index))
		vbox.add_child(clear_btn)
	else:
		var empty := Label.new()
		empty.text = "Empty"
		empty.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		empty.add_theme_font_size_override("font_size", 9)
		empty.add_theme_color_override("font_color", Color.DARK_GRAY)
		vbox.add_child(empty)
	
	slot.add_child(vbox)
	
	# Allow drag-drop to slot
	slot.gui_input.connect(_on_hotbar_slot_input.bind(index))
	
	return slot

func _on_hotbar_slot_input(event: InputEvent, slot_index: int):
	if event is InputEventMouseButton and event.pressed and event.button_index == MOUSE_BUTTON_LEFT:
		if selected_skill and not selected_skill.is_passive:
			_equip_to_slot(selected_skill, slot_index)

func _on_equip_skill(skill: SkillData):
	# Find first empty slot or use slot 0
	if not GameManager.player:
		return
	
	var player := GameManager.player
	var target_slot := 0
	
	for i in range(8):
		if i >= player.active_skills.size() or player.active_skills[i] == null:
			target_slot = i
			break
	
	_equip_to_slot(skill, target_slot)

func _equip_to_slot(skill: SkillData, slot_index: int):
	if not GameManager.player:
		return
	
	var player := GameManager.player
	
	# Ensure array is large enough
	while player.active_skills.size() <= slot_index:
		player.active_skills.append(null)
	
	# Check if skill is already equipped elsewhere
	for i in range(player.active_skills.size()):
		if player.active_skills[i] == skill:
			player.active_skills[i] = null
	
	player.active_skills[slot_index] = skill
	skill_equipped.emit(skill, slot_index)
	_update_hotbar(player)

func _on_clear_slot(slot_index: int):
	if not GameManager.player:
		return
	
	var player := GameManager.player
	if slot_index < player.active_skills.size():
		player.active_skills[slot_index] = null
		_update_hotbar(player)

func _load_skill_trees():
	skill_trees.clear()
	
	# Load all skill resources
	var dir := DirAccess.open("res://resources/skills/")
	if not dir:
		return
	
	dir.list_dir_begin()
	var file_name := dir.get_next()
	
	while file_name != "":
		if file_name.ends_with(".tres"):
			var path := "res://resources/skills/" + file_name
			var skill := load(path) as SkillData
			if skill:
				var tree_id: String = skill.tree_id if skill.tree_id else "general"
				if not skill_trees.has(tree_id):
					skill_trees[tree_id] = []
				skill_trees[tree_id].append(skill)
		file_name = dir.get_next()
	
	dir.list_dir_end()
