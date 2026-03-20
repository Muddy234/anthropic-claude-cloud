class_name BulletinPanel
extends Control
## Village bulletin board UI with three tabs: Bounties, Rumors, Notices.
## Bounties offer enemy-kill quests with accept buttons and reward info.
## Rumors provide lore text.  Notices display community events.

# --- Signals ---
signal bounty_accepted(bounty_id: String)
signal panel_closed

# --- Constants ---
const TAB_NAMES: Array[String] = ["Bounties", "Rumors", "Notices"]
const ITEMS_PER_PAGE: int = 6

enum Tab { BOUNTIES, RUMORS, NOTICES }

# --- Node references ---
var _overlay_bg: ColorRect
var _panel: PanelContainer
var _tab_buttons: Array[Button] = []
var _tab_row: HBoxContainer
var _item_scroll: ScrollContainer
var _item_list: VBoxContainer
var _detail_panel: PanelContainer
var _detail_text: RichTextLabel
var _accept_btn: Button
var _close_btn: Button

# --- State ---
var _current_tab: Tab = Tab.BOUNTIES
var _bounties: Array[Dictionary] = []
var _rumors: Array[Dictionary] = []
var _notices: Array[Dictionary] = []
var _selected_index: int = -1


func _ready() -> void:
	visible = false
	mouse_filter = Control.MOUSE_FILTER_STOP
	_build_ui()


# ==========================================================================
#  UI Construction
# ==========================================================================

func _build_ui() -> void:
	_overlay_bg = ColorRect.new()
	_overlay_bg.color = Color(0, 0, 0, 0.55)
	_overlay_bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_overlay_bg)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	_panel = PanelContainer.new()
	_panel.custom_minimum_size = Vector2(800, 520)
	center.add_child(_panel)

	var main_vbox := VBoxContainer.new()
	main_vbox.add_theme_constant_override("separation", 8)
	_panel.add_child(main_vbox)

	# Header
	var header := HBoxContainer.new()
	main_vbox.add_child(header)

	var title := Label.new()
	title.text = "Bulletin Board"
	title.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["header"])
	title.add_theme_color_override("font_color", UIConstantsDef.FRAME_GOLD_BRIGHT)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)

	_close_btn = Button.new()
	_close_btn.text = "X"
	_close_btn.custom_minimum_size = Vector2(32, 32)
	_close_btn.pressed.connect(close_bulletin)
	header.add_child(_close_btn)

	# Tabs
	_tab_row = HBoxContainer.new()
	_tab_row.add_theme_constant_override("separation", 4)
	main_vbox.add_child(_tab_row)

	for i in range(TAB_NAMES.size()):
		var tab_btn := Button.new()
		tab_btn.text = TAB_NAMES[i]
		tab_btn.custom_minimum_size = Vector2(120, 32)
		tab_btn.toggle_mode = true
		tab_btn.button_pressed = (i == 0)
		tab_btn.pressed.connect(_on_tab_pressed.bind(i))
		_tab_row.add_child(tab_btn)
		_tab_buttons.append(tab_btn)

	var sep := HSeparator.new()
	main_vbox.add_child(sep)

	# Content area: split between list and detail
	var hsplit := HBoxContainer.new()
	hsplit.add_theme_constant_override("separation", 12)
	hsplit.size_flags_vertical = Control.SIZE_EXPAND_FILL
	main_vbox.add_child(hsplit)

	# Left: item list
	_item_scroll = ScrollContainer.new()
	_item_scroll.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_item_scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	hsplit.add_child(_item_scroll)

	_item_list = VBoxContainer.new()
	_item_list.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_item_list.add_theme_constant_override("separation", 4)
	_item_scroll.add_child(_item_list)

	# Right: detail / accept
	var detail_vbox := VBoxContainer.new()
	detail_vbox.custom_minimum_size = Vector2(300, 0)
	detail_vbox.add_theme_constant_override("separation", 8)
	hsplit.add_child(detail_vbox)

	_detail_panel = PanelContainer.new()
	_detail_panel.size_flags_vertical = Control.SIZE_EXPAND_FILL
	detail_vbox.add_child(_detail_panel)

	_detail_text = RichTextLabel.new()
	_detail_text.bbcode_enabled = true
	_detail_text.fit_content = false
	_detail_text.scroll_active = true
	_detail_panel.add_child(_detail_text)

	_accept_btn = Button.new()
	_accept_btn.text = "Accept Bounty"
	_accept_btn.custom_minimum_size = Vector2(0, 38)
	_accept_btn.pressed.connect(_on_accept_pressed)
	_accept_btn.visible = false
	detail_vbox.add_child(_accept_btn)


# ==========================================================================
#  Open / Close
# ==========================================================================

func open_bulletin(bounties: Array[Dictionary] = [], rumors: Array[Dictionary] = [],
		notices: Array[Dictionary] = []) -> void:
	_bounties = bounties
	_rumors = rumors
	_notices = notices
	_selected_index = -1
	_current_tab = Tab.BOUNTIES
	visible = true
	_refresh_tabs()
	_refresh_list()


func close_bulletin() -> void:
	visible = false
	panel_closed.emit()


# ==========================================================================
#  Tab handling
# ==========================================================================

func _on_tab_pressed(index: int) -> void:
	_current_tab = index as Tab
	_selected_index = -1
	_refresh_tabs()
	_refresh_list()
	_clear_detail()


func _refresh_tabs() -> void:
	for i in range(_tab_buttons.size()):
		_tab_buttons[i].button_pressed = (i == _current_tab)


# ==========================================================================
#  List refresh
# ==========================================================================

func _refresh_list() -> void:
	_clear_children(_item_list)

	var entries: Array[Dictionary] = _get_current_entries()

	if entries.is_empty():
		var empty_lbl := Label.new()
		empty_lbl.text = "Nothing posted."
		empty_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
		_item_list.add_child(empty_lbl)
		return

	for i in range(mini(entries.size(), ITEMS_PER_PAGE)):
		var entry: Dictionary = entries[i]
		var row := _create_entry_row(entry, i)
		_item_list.add_child(row)


func _get_current_entries() -> Array[Dictionary]:
	match _current_tab:
		Tab.BOUNTIES: return _bounties
		Tab.RUMORS:   return _rumors
		Tab.NOTICES:  return _notices
	return []


func _create_entry_row(entry: Dictionary, index: int) -> Button:
	var btn := Button.new()
	btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
	btn.size_flags_horizontal = Control.SIZE_EXPAND_FILL

	match _current_tab:
		Tab.BOUNTIES:
			var reward: int = entry.get("reward_gold", 0)
			btn.text = "%s  [%dg]" % [entry.get("title", "Bounty"), reward]
		Tab.RUMORS:
			btn.text = entry.get("title", "Rumor")
		Tab.NOTICES:
			btn.text = entry.get("title", "Notice")

	btn.pressed.connect(_on_entry_selected.bind(index))
	return btn


# ==========================================================================
#  Detail display
# ==========================================================================

func _on_entry_selected(index: int) -> void:
	_selected_index = index
	var entries: Array[Dictionary] = _get_current_entries()
	if index < 0 or index >= entries.size():
		_clear_detail()
		return

	var entry: Dictionary = entries[index]
	_detail_text.clear()

	match _current_tab:
		Tab.BOUNTIES:
			_detail_text.push_color(UIConstantsDef.GOLD)
			_detail_text.add_text(entry.get("title", "Bounty"))
			_detail_text.pop()
			_detail_text.newline()
			_detail_text.newline()
			_detail_text.add_text(entry.get("description", ""))
			_detail_text.newline()
			_detail_text.newline()
			_detail_text.push_color(UIConstantsDef.TEXT_SECONDARY)
			_detail_text.add_text("Target: %s" % entry.get("target_name", "Unknown"))
			_detail_text.newline()
			_detail_text.add_text("Required kills: %d" % entry.get("kill_count", 1))
			_detail_text.newline()
			_detail_text.add_text("Reward: %d gold" % entry.get("reward_gold", 0))
			var reward_xp: int = entry.get("reward_xp", 0)
			if reward_xp > 0:
				_detail_text.newline()
				_detail_text.add_text("Bonus XP: %d" % reward_xp)
			_detail_text.pop()

			_accept_btn.visible = true
			_accept_btn.disabled = entry.get("accepted", false)
			_accept_btn.text = "Accepted" if entry.get("accepted", false) else "Accept Bounty"

		Tab.RUMORS:
			_detail_text.push_color(UIConstantsDef.FRAME_GOLD)
			_detail_text.add_text(entry.get("title", "Rumor"))
			_detail_text.pop()
			_detail_text.newline()
			_detail_text.newline()
			_detail_text.push_color(UIConstantsDef.TEXT_SECONDARY)
			_detail_text.add_text(entry.get("text", ""))
			_detail_text.pop()
			_accept_btn.visible = false

		Tab.NOTICES:
			_detail_text.push_color(UIConstantsDef.FRAME_GOLD)
			_detail_text.add_text(entry.get("title", "Notice"))
			_detail_text.pop()
			_detail_text.newline()
			_detail_text.newline()
			_detail_text.add_text(entry.get("text", ""))
			_accept_btn.visible = false


func _clear_detail() -> void:
	_detail_text.clear()
	_accept_btn.visible = false


# ==========================================================================
#  Bounty acceptance
# ==========================================================================

func accept_bounty(bounty_id: String) -> void:
	bounty_accepted.emit(bounty_id)
	# Mark as accepted locally
	for bounty in _bounties:
		if bounty.get("id", "") == bounty_id:
			bounty["accepted"] = true
			break
	if _selected_index >= 0:
		_on_entry_selected(_selected_index)  # Refresh detail


func _on_accept_pressed() -> void:
	if _current_tab != Tab.BOUNTIES or _selected_index < 0:
		return
	if _selected_index >= _bounties.size():
		return
	var bounty: Dictionary = _bounties[_selected_index]
	var bounty_id: String = bounty.get("id", "")
	if bounty_id.is_empty() or bounty.get("accepted", false):
		return
	accept_bounty(bounty_id)


# ==========================================================================
#  Input
# ==========================================================================

func _unhandled_input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("ui_cancel"):
		close_bulletin()
		get_viewport().set_input_as_handled()


# ==========================================================================
#  Helpers
# ==========================================================================

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()
