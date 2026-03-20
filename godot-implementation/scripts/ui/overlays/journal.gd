class_name JournalPanel
extends Control
## Quest journal overlay with three modes: quest_list, quest_detail, npc_log.
## Toggled with 'J' key.  Shows active quests, detailed objectives, and NPC notes.

# --- Signals ---
signal journal_opened
signal journal_closed
signal quest_selected(quest_id: String)

# --- Enums ---
enum Mode { QUEST_LIST, QUEST_DETAIL, NPC_LOG }

# --- Constants ---
const TAB_NAMES: Array[String] = ["Quests", "Details", "NPC Log"]

# --- Node references ---
var _overlay_bg: ColorRect
var _panel: PanelContainer
var _tab_buttons: Array[Button] = []
var _tab_container: HBoxContainer
var _content_area: Control
var _close_btn: Button

# Quest list mode
var _quest_list_scroll: ScrollContainer
var _quest_list_vbox: VBoxContainer

# Quest detail mode
var _detail_scroll: ScrollContainer
var _detail_vbox: VBoxContainer
var _detail_title: Label
var _detail_description: RichTextLabel
var _objectives_vbox: VBoxContainer
var _rewards_vbox: VBoxContainer

# NPC log mode
var _npc_scroll: ScrollContainer
var _npc_list_vbox: VBoxContainer

# --- State ---
var _current_mode: Mode = Mode.QUEST_LIST
var _selected_quest_id: String = ""
var _quest_data: Array[Dictionary] = []
var _npc_data: Array[Dictionary] = []


func _ready() -> void:
	visible = false
	mouse_filter = Control.MOUSE_FILTER_STOP
	_build_ui()


# ==========================================================================
#  UI Construction
# ==========================================================================

func _build_ui() -> void:
	# Semi-transparent overlay
	_overlay_bg = ColorRect.new()
	_overlay_bg.color = Color(0, 0, 0, 0.55)
	_overlay_bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_overlay_bg)

	# Center panel
	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	_panel = PanelContainer.new()
	_panel.custom_minimum_size = Vector2(700, 500)
	center.add_child(_panel)

	var main_vbox := VBoxContainer.new()
	main_vbox.add_theme_constant_override("separation", 8)
	_panel.add_child(main_vbox)

	# Header row
	var header := HBoxContainer.new()
	header.add_theme_constant_override("separation", 8)
	main_vbox.add_child(header)

	var title := Label.new()
	title.text = "Journal"
	title.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["header"])
	title.add_theme_color_override("font_color", UIConstantsDef.FRAME_GOLD_BRIGHT)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)

	_close_btn = Button.new()
	_close_btn.text = "X"
	_close_btn.custom_minimum_size = Vector2(32, 32)
	_close_btn.pressed.connect(close_journal)
	header.add_child(_close_btn)

	# Tab row
	_tab_container = HBoxContainer.new()
	_tab_container.add_theme_constant_override("separation", 4)
	main_vbox.add_child(_tab_container)

	for i in range(TAB_NAMES.size()):
		var tab_btn := Button.new()
		tab_btn.text = TAB_NAMES[i]
		tab_btn.custom_minimum_size = Vector2(120, 32)
		tab_btn.toggle_mode = true
		tab_btn.button_pressed = (i == 0)
		tab_btn.pressed.connect(_on_tab_pressed.bind(i))
		_tab_container.add_child(tab_btn)
		_tab_buttons.append(tab_btn)

	var sep := HSeparator.new()
	main_vbox.add_child(sep)

	# Content area
	_content_area = Control.new()
	_content_area.size_flags_vertical = Control.SIZE_EXPAND_FILL
	_content_area.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_content_area.custom_minimum_size = Vector2(0, 380)
	main_vbox.add_child(_content_area)

	_build_quest_list_mode()
	_build_quest_detail_mode()
	_build_npc_log_mode()
	_set_mode(Mode.QUEST_LIST)


func _build_quest_list_mode() -> void:
	_quest_list_scroll = ScrollContainer.new()
	_quest_list_scroll.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_content_area.add_child(_quest_list_scroll)

	_quest_list_vbox = VBoxContainer.new()
	_quest_list_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_quest_list_vbox.add_theme_constant_override("separation", 4)
	_quest_list_scroll.add_child(_quest_list_vbox)


func _build_quest_detail_mode() -> void:
	_detail_scroll = ScrollContainer.new()
	_detail_scroll.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_content_area.add_child(_detail_scroll)

	_detail_vbox = VBoxContainer.new()
	_detail_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_detail_vbox.add_theme_constant_override("separation", 10)
	_detail_scroll.add_child(_detail_vbox)

	# Back button
	var back_btn := Button.new()
	back_btn.text = "< Back to List"
	back_btn.pressed.connect(func() -> void: _set_mode(Mode.QUEST_LIST))
	_detail_vbox.add_child(back_btn)

	_detail_title = Label.new()
	_detail_title.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["title"])
	_detail_title.add_theme_color_override("font_color", UIConstantsDef.GOLD)
	_detail_vbox.add_child(_detail_title)

	_detail_description = RichTextLabel.new()
	_detail_description.bbcode_enabled = true
	_detail_description.fit_content = true
	_detail_description.scroll_active = false
	_detail_description.custom_minimum_size = Vector2(0, 60)
	_detail_vbox.add_child(_detail_description)

	# Objectives section
	var obj_header := Label.new()
	obj_header.text = "Objectives"
	obj_header.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
	obj_header.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
	_detail_vbox.add_child(obj_header)

	_objectives_vbox = VBoxContainer.new()
	_objectives_vbox.add_theme_constant_override("separation", 4)
	_detail_vbox.add_child(_objectives_vbox)

	# Rewards section
	var rew_header := Label.new()
	rew_header.text = "Rewards"
	rew_header.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
	rew_header.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
	_detail_vbox.add_child(rew_header)

	_rewards_vbox = VBoxContainer.new()
	_rewards_vbox.add_theme_constant_override("separation", 4)
	_detail_vbox.add_child(_rewards_vbox)


func _build_npc_log_mode() -> void:
	_npc_scroll = ScrollContainer.new()
	_npc_scroll.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_content_area.add_child(_npc_scroll)

	_npc_list_vbox = VBoxContainer.new()
	_npc_list_vbox.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_npc_list_vbox.add_theme_constant_override("separation", 6)
	_npc_scroll.add_child(_npc_list_vbox)


# ==========================================================================
#  Mode switching
# ==========================================================================

func _set_mode(mode: Mode) -> void:
	_current_mode = mode
	_quest_list_scroll.visible = (mode == Mode.QUEST_LIST)
	_detail_scroll.visible = (mode == Mode.QUEST_DETAIL)
	_npc_scroll.visible = (mode == Mode.NPC_LOG)

	# Update tab button states
	for i in range(_tab_buttons.size()):
		_tab_buttons[i].button_pressed = (i == mode)

	match mode:
		Mode.QUEST_LIST:
			_refresh_quest_list()
		Mode.QUEST_DETAIL:
			_refresh_quest_detail()
		Mode.NPC_LOG:
			_refresh_npc_log()


func _on_tab_pressed(index: int) -> void:
	# Tab 1 (Details) requires a selected quest; fall back to list if none
	if index == Mode.QUEST_DETAIL and _selected_quest_id.is_empty():
		_set_mode(Mode.QUEST_LIST)
		return
	_set_mode(index as Mode)


# ==========================================================================
#  Data refresh
# ==========================================================================

func set_quest_data(quests: Array[Dictionary]) -> void:
	_quest_data = quests


func set_npc_data(npcs: Array[Dictionary]) -> void:
	_npc_data = npcs


func _refresh_quest_list() -> void:
	_clear_children(_quest_list_vbox)

	if _quest_data.is_empty():
		var empty_lbl := Label.new()
		empty_lbl.text = "No active quests."
		empty_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
		_quest_list_vbox.add_child(empty_lbl)
		return

	for quest in _quest_data:
		var row := _create_quest_row(quest)
		_quest_list_vbox.add_child(row)


func _create_quest_row(quest: Dictionary) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)

	# Status indicator
	var status_lbl := Label.new()
	var status: String = quest.get("status", "active")
	match status:
		"completed":
			status_lbl.text = "[DONE]"
			status_lbl.add_theme_color_override("font_color", UIConstantsDef.SUCCESS)
		"failed":
			status_lbl.text = "[FAIL]"
			status_lbl.add_theme_color_override("font_color", UIConstantsDef.DANGER)
		_:
			status_lbl.text = "[...]"
			status_lbl.add_theme_color_override("font_color", UIConstantsDef.GOLD)
	status_lbl.custom_minimum_size = Vector2(60, 0)
	row.add_child(status_lbl)

	# Quest name (clickable)
	var name_btn := Button.new()
	name_btn.text = quest.get("name", "Unknown Quest")
	name_btn.flat = true
	name_btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name_btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
	name_btn.add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)
	name_btn.pressed.connect(func() -> void:
		_selected_quest_id = quest.get("id", "")
		quest_selected.emit(_selected_quest_id)
		_set_mode(Mode.QUEST_DETAIL)
	)
	row.add_child(name_btn)

	# Progress indicator
	var objectives: Array = quest.get("objectives", [])
	var completed_count: int = 0
	for obj: Dictionary in objectives:
		if obj.get("completed", false):
			completed_count += 1
	var progress_lbl := Label.new()
	progress_lbl.text = "%d/%d" % [completed_count, objectives.size()]
	progress_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
	row.add_child(progress_lbl)

	return row


func _refresh_quest_detail() -> void:
	_clear_children(_objectives_vbox)
	_clear_children(_rewards_vbox)

	var quest: Dictionary = _find_quest(_selected_quest_id)
	if quest.is_empty():
		_detail_title.text = "Quest not found"
		_detail_description.text = ""
		return

	_detail_title.text = quest.get("name", "Unknown")
	_detail_description.text = quest.get("description", "No description available.")

	# Objectives (checkbox-style list)
	var objectives: Array = quest.get("objectives", [])
	for obj: Dictionary in objectives:
		var obj_row := HBoxContainer.new()
		obj_row.add_theme_constant_override("separation", 8)

		var check := Label.new()
		var is_done: bool = obj.get("completed", false)
		check.text = "[x]" if is_done else "[ ]"
		check.add_theme_color_override("font_color",
			UIConstantsDef.SUCCESS if is_done else UIConstantsDef.TEXT_MUTED)
		obj_row.add_child(check)

		var obj_text := Label.new()
		obj_text.text = obj.get("description", "")
		var progress_current: int = obj.get("current", 0)
		var progress_required: int = obj.get("required", 1)
		if progress_required > 1:
			obj_text.text += "  (%d/%d)" % [progress_current, progress_required]
		obj_text.add_theme_color_override("font_color",
			UIConstantsDef.TEXT_SECONDARY if is_done else UIConstantsDef.TEXT_PRIMARY)
		obj_row.add_child(obj_text)

		_objectives_vbox.add_child(obj_row)

	# Rewards
	var rewards: Array = quest.get("rewards", [])
	for reward: Dictionary in rewards:
		var rew_lbl := Label.new()
		rew_lbl.text = "- %s" % reward.get("description", str(reward))
		rew_lbl.add_theme_color_override("font_color", UIConstantsDef.GOLD)
		_rewards_vbox.add_child(rew_lbl)


func _refresh_npc_log() -> void:
	_clear_children(_npc_list_vbox)

	if _npc_data.is_empty():
		var empty_lbl := Label.new()
		empty_lbl.text = "No NPCs encountered yet."
		empty_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
		_npc_list_vbox.add_child(empty_lbl)
		return

	for npc: Dictionary in _npc_data:
		var npc_panel := PanelContainer.new()
		_npc_list_vbox.add_child(npc_panel)

		var npc_vbox := VBoxContainer.new()
		npc_vbox.add_theme_constant_override("separation", 4)
		npc_panel.add_child(npc_vbox)

		var name_lbl := Label.new()
		name_lbl.text = npc.get("name", "Unknown NPC")
		name_lbl.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
		name_lbl.add_theme_color_override("font_color", UIConstantsDef.GOLD)
		npc_vbox.add_child(name_lbl)

		var location_lbl := Label.new()
		location_lbl.text = npc.get("location", "")
		location_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
		npc_vbox.add_child(location_lbl)

		var notes: Array = npc.get("notes", [])
		for note: String in notes:
			var note_lbl := Label.new()
			note_lbl.text = "  - %s" % note
			note_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
			npc_vbox.add_child(note_lbl)


# ==========================================================================
#  Open / Close / Toggle
# ==========================================================================

func open_journal() -> void:
	if visible:
		return
	visible = true
	_set_mode(Mode.QUEST_LIST)
	journal_opened.emit()


func close_journal() -> void:
	if not visible:
		return
	visible = false
	journal_closed.emit()


func toggle_journal() -> void:
	if visible:
		close_journal()
	else:
		open_journal()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("journal"):
		toggle_journal()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("ui_cancel") and visible:
		close_journal()
		get_viewport().set_input_as_handled()


# ==========================================================================
#  Helpers
# ==========================================================================

func _find_quest(quest_id: String) -> Dictionary:
	for quest in _quest_data:
		if quest.get("id", "") == quest_id:
			return quest
	return {}


func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()
