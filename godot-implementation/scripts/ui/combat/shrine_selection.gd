class_name ShrineSelection
extends Control
## Shrine boon selection UI.  Displays 3 boon cards horizontally.
## Cards slide up from the bottom with stagger, scale on hover, and
## pulse on selection.  Connects to EventBus.player_boon_selected.

# --- Signals ---
signal boon_selected(boon_id: String)
signal selection_cancelled

# --- Constants ---
const CARD_WIDTH: float = 220.0
const CARD_HEIGHT: float = 320.0
const CARD_SPACING: float = 24.0
const HOVER_SCALE: float = 1.06
const ENTRANCE_DURATION: float = 0.5
const STAGGER_DELAY: float = 0.12

# Rarity border colors
const TIER_COLORS: Dictionary = {
	0: Color("#B0B0B0"),  # Core - silver
	1: Color("#5878A8"),  # Resonance - blue
	2: Color("#DAA520"),  # Legendary - gold
}

# --- Node references ---
var _overlay_bg: ColorRect
var _title_label: Label
var _card_container: HBoxContainer
var _cards: Array[PanelContainer] = []

# --- State ---
var _boon_options: Array[Dictionary] = []
var _selected_index: int = -1
var _is_selecting: bool = false


func _ready() -> void:
	visible = false
	mouse_filter = Control.MOUSE_FILTER_STOP
	_build_ui()


# ==========================================================================
#  UI Construction
# ==========================================================================

func _build_ui() -> void:
	_overlay_bg = ColorRect.new()
	_overlay_bg.color = Color(0, 0, 0, 0.7)
	_overlay_bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_overlay_bg)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var main_vbox := VBoxContainer.new()
	main_vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	main_vbox.add_theme_constant_override("separation", 24)
	center.add_child(main_vbox)

	_title_label = Label.new()
	_title_label.text = "Choose a Blessing"
	_title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_title_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["header"])
	_title_label.add_theme_color_override("font_color", UIConstantsDef.FRAME_GOLD_BRIGHT)
	main_vbox.add_child(_title_label)

	_card_container = HBoxContainer.new()
	_card_container.alignment = BoxContainer.ALIGNMENT_CENTER
	_card_container.add_theme_constant_override("separation", int(CARD_SPACING))
	main_vbox.add_child(_card_container)


# ==========================================================================
#  Show / Hide
# ==========================================================================

## Call with an array of boon dictionaries: [{id, name, ancestor, tier, description, icon?}]
func show_options(boons: Array[Dictionary]) -> void:
	_boon_options = boons
	_selected_index = -1
	_is_selecting = false
	visible = true

	_clear_cards()
	_create_cards()
	_play_entrance_animation()


func close_selection() -> void:
	visible = false
	_clear_cards()


func _clear_cards() -> void:
	for card in _cards:
		card.queue_free()
	_cards.clear()


# ==========================================================================
#  Card creation
# ==========================================================================

func _create_cards() -> void:
	for i in range(_boon_options.size()):
		var boon: Dictionary = _boon_options[i]
		var card := _create_boon_card(boon, i)
		_card_container.add_child(card)
		_cards.append(card)


func _create_boon_card(boon: Dictionary, index: int) -> PanelContainer:
	var card := PanelContainer.new()
	card.custom_minimum_size = Vector2(CARD_WIDTH, CARD_HEIGHT)

	# Rarity-colored border
	var tier: int = boon.get("tier", 0)
	var border_color: Color = TIER_COLORS.get(tier, TIER_COLORS[0])
	var card_style := StyleBoxFlat.new()
	card_style.bg_color = UIConstantsDef.BG_DARK
	card_style.border_color = border_color
	card_style.set_border_width_all(3)
	card_style.set_corner_radius_all(8)
	card_style.content_margin_left = 12.0
	card_style.content_margin_top = 16.0
	card_style.content_margin_right = 12.0
	card_style.content_margin_bottom = 16.0
	card.add_theme_stylebox_override("panel", card_style)

	var vbox := VBoxContainer.new()
	vbox.alignment = BoxContainer.ALIGNMENT_CENTER
	vbox.add_theme_constant_override("separation", 10)
	card.add_child(vbox)

	# Ancestor name
	var ancestor_id: String = boon.get("ancestor", "")
	var ancestor_label := Label.new()
	ancestor_label.text = ancestor_id.replace("_", " ").capitalize()
	ancestor_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	ancestor_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["small"])
	ancestor_label.add_theme_color_override("font_color", border_color)
	vbox.add_child(ancestor_label)

	# Icon placeholder
	var icon_rect := ColorRect.new()
	icon_rect.color = border_color * Color(1, 1, 1, 0.3)
	icon_rect.custom_minimum_size = Vector2(64, 64)
	icon_rect.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	vbox.add_child(icon_rect)

	# Boon name
	var name_label := Label.new()
	name_label.text = boon.get("name", "Unknown Boon")
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
	name_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)
	name_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(name_label)

	# Description
	var desc_label := RichTextLabel.new()
	desc_label.bbcode_enabled = true
	desc_label.text = boon.get("description", "")
	desc_label.fit_content = true
	desc_label.scroll_active = false
	desc_label.custom_minimum_size = Vector2(0, 80)
	desc_label.add_theme_color_override("default_color", UIConstantsDef.TEXT_SECONDARY)
	vbox.add_child(desc_label)

	# Spacer pushes button to bottom
	var spacer := Control.new()
	spacer.size_flags_vertical = Control.SIZE_EXPAND_FILL
	vbox.add_child(spacer)

	# Select button
	var select_btn := Button.new()
	select_btn.text = "Select"
	select_btn.custom_minimum_size = Vector2(0, 36)
	select_btn.pressed.connect(_on_card_selected.bind(index))
	vbox.add_child(select_btn)

	# Hover effects via mouse signals
	card.mouse_entered.connect(_on_card_hover_enter.bind(index))
	card.mouse_exited.connect(_on_card_hover_exit.bind(index))

	return card


# ==========================================================================
#  Entrance animation
# ==========================================================================

func _play_entrance_animation() -> void:
	for i in range(_cards.size()):
		var card: PanelContainer = _cards[i]
		card.modulate.a = 0.0
		card.position.y += 60.0
		var target_y: float = card.position.y - 60.0

		var tween := create_tween()
		var delay: float = i * STAGGER_DELAY
		tween.tween_property(card, "modulate:a", 1.0, ENTRANCE_DURATION).set_delay(delay).set_ease(Tween.EASE_OUT)
		tween.parallel().tween_property(card, "position:y", target_y, ENTRANCE_DURATION).set_delay(delay).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_BACK)


# ==========================================================================
#  Hover effects
# ==========================================================================

func _on_card_hover_enter(index: int) -> void:
	if _is_selecting or index >= _cards.size():
		return
	var card: PanelContainer = _cards[index]
	var tween := create_tween()
	tween.tween_property(card, "scale", Vector2(HOVER_SCALE, HOVER_SCALE), 0.15).set_ease(Tween.EASE_OUT)
	card.z_index = 1


func _on_card_hover_exit(index: int) -> void:
	if _is_selecting or index >= _cards.size():
		return
	var card: PanelContainer = _cards[index]
	var tween := create_tween()
	tween.tween_property(card, "scale", Vector2.ONE, 0.15).set_ease(Tween.EASE_OUT)
	card.z_index = 0


# ==========================================================================
#  Selection
# ==========================================================================

func _on_card_selected(index: int) -> void:
	if _is_selecting or index >= _boon_options.size():
		return
	_is_selecting = true
	_selected_index = index

	var selected_card: PanelContainer = _cards[index]
	var boon: Dictionary = _boon_options[index]

	# Selected card pulses
	var pulse_tween := create_tween().set_loops(3)
	pulse_tween.tween_property(selected_card, "modulate", Color(1.3, 1.3, 1.3, 1.0), 0.15)
	pulse_tween.tween_property(selected_card, "modulate", Color.WHITE, 0.15)

	# Other cards fade out
	for i in range(_cards.size()):
		if i != index:
			var fade_tween := create_tween()
			fade_tween.tween_property(_cards[i], "modulate:a", 0.2, 0.4)

	# After pulse, emit and close
	var close_tween := create_tween()
	close_tween.tween_interval(0.9)
	close_tween.tween_callback(func() -> void:
		var boon_id: String = boon.get("id", "")
		boon_selected.emit(boon_id)
		close_selection()
	)
