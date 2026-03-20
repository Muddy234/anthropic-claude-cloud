class_name TavernGamesPanel
extends Control
## Tavern mini-game UI.  Supports game selection (dice, cards placeholder),
## bet input with gold display, play/roll action, and result with win/loss
## animation and payout calculation.

# --- Signals ---
signal game_played(game_type: String, bet: int, won: bool, payout: int)
signal panel_closed

# --- Constants ---
enum GameType { DICE, CARDS }
const GAME_NAMES: Dictionary = {
	GameType.DICE:  "Bone Dice",
	GameType.CARDS: "Shadow Cards",
}

# Dice game: roll 2d6, beat the house roll
const DICE_WIN_MULTIPLIER: float = 2.0
const MIN_BET: int = 5
const MAX_BET: int = 500

# --- Node references ---
var _overlay_bg: ColorRect
var _panel: PanelContainer
var _game_select_row: HBoxContainer
var _dice_btn: Button
var _cards_btn: Button
var _gold_display: Label
var _bet_input: LineEdit
var _bet_slider: HSlider
var _play_btn: Button
var _result_label: Label
var _result_detail: Label
var _roll_display: HBoxContainer
var _player_roll_label: Label
var _house_roll_label: Label
var _close_btn: Button

# --- State ---
var _current_game: GameType = GameType.DICE
var _player_gold: int = 100
var _current_bet: int = MIN_BET
var _is_playing: bool = false
var _rng: RandomNumberGenerator = RandomNumberGenerator.new()


func _ready() -> void:
	visible = false
	mouse_filter = Control.MOUSE_FILTER_STOP
	_rng.randomize()
	_build_ui()


# ==========================================================================
#  UI Construction
# ==========================================================================

func _build_ui() -> void:
	_overlay_bg = ColorRect.new()
	_overlay_bg.color = Color(0, 0, 0, 0.6)
	_overlay_bg.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(_overlay_bg)

	var center := CenterContainer.new()
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	_panel = PanelContainer.new()
	_panel.custom_minimum_size = Vector2(480, 420)
	center.add_child(_panel)

	var main_vbox := VBoxContainer.new()
	main_vbox.add_theme_constant_override("separation", 12)
	_panel.add_child(main_vbox)

	# Header
	var header := HBoxContainer.new()
	main_vbox.add_child(header)

	var title := Label.new()
	title.text = "Tavern Games"
	title.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["header"])
	title.add_theme_color_override("font_color", UIConstantsDef.FRAME_GOLD_BRIGHT)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	header.add_child(title)

	_close_btn = Button.new()
	_close_btn.text = "X"
	_close_btn.custom_minimum_size = Vector2(32, 32)
	_close_btn.pressed.connect(close_tavern)
	header.add_child(_close_btn)

	var sep := HSeparator.new()
	main_vbox.add_child(sep)

	# Game selection
	_game_select_row = HBoxContainer.new()
	_game_select_row.alignment = BoxContainer.ALIGNMENT_CENTER
	_game_select_row.add_theme_constant_override("separation", 12)
	main_vbox.add_child(_game_select_row)

	_dice_btn = Button.new()
	_dice_btn.text = "Bone Dice"
	_dice_btn.toggle_mode = true
	_dice_btn.button_pressed = true
	_dice_btn.custom_minimum_size = Vector2(140, 36)
	_dice_btn.pressed.connect(_on_game_selected.bind(GameType.DICE))
	_game_select_row.add_child(_dice_btn)

	_cards_btn = Button.new()
	_cards_btn.text = "Shadow Cards"
	_cards_btn.toggle_mode = true
	_cards_btn.custom_minimum_size = Vector2(140, 36)
	_cards_btn.disabled = true
	_cards_btn.tooltip_text = "Coming soon"
	_cards_btn.pressed.connect(_on_game_selected.bind(GameType.CARDS))
	_game_select_row.add_child(_cards_btn)

	# Gold display
	_gold_display = Label.new()
	_gold_display.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_gold_display.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
	_gold_display.add_theme_color_override("font_color", UIConstantsDef.GOLD)
	main_vbox.add_child(_gold_display)

	# Bet controls
	var bet_row := HBoxContainer.new()
	bet_row.alignment = BoxContainer.ALIGNMENT_CENTER
	bet_row.add_theme_constant_override("separation", 8)
	main_vbox.add_child(bet_row)

	var bet_label := Label.new()
	bet_label.text = "Bet:"
	bet_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
	bet_row.add_child(bet_label)

	_bet_input = LineEdit.new()
	_bet_input.text = str(MIN_BET)
	_bet_input.custom_minimum_size = Vector2(80, 0)
	_bet_input.alignment = HORIZONTAL_ALIGNMENT_CENTER
	_bet_input.text_changed.connect(_on_bet_text_changed)
	bet_row.add_child(_bet_input)

	var gold_icon := Label.new()
	gold_icon.text = "g"
	gold_icon.add_theme_color_override("font_color", UIConstantsDef.GOLD)
	bet_row.add_child(gold_icon)

	_bet_slider = HSlider.new()
	_bet_slider.min_value = MIN_BET
	_bet_slider.max_value = MAX_BET
	_bet_slider.value = MIN_BET
	_bet_slider.step = 5
	_bet_slider.custom_minimum_size = Vector2(200, 0)
	_bet_slider.value_changed.connect(_on_bet_slider_changed)
	main_vbox.add_child(_bet_slider)

	# Roll display area
	_roll_display = HBoxContainer.new()
	_roll_display.alignment = BoxContainer.ALIGNMENT_CENTER
	_roll_display.add_theme_constant_override("separation", 40)
	_roll_display.visible = false
	main_vbox.add_child(_roll_display)

	var player_col := VBoxContainer.new()
	player_col.alignment = BoxContainer.ALIGNMENT_CENTER
	_roll_display.add_child(player_col)

	var you_label := Label.new()
	you_label.text = "You"
	you_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	you_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
	player_col.add_child(you_label)

	_player_roll_label = Label.new()
	_player_roll_label.text = "-"
	_player_roll_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_player_roll_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["display"])
	_player_roll_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)
	player_col.add_child(_player_roll_label)

	var vs_label := Label.new()
	vs_label.text = "vs"
	vs_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
	_roll_display.add_child(vs_label)

	var house_col := VBoxContainer.new()
	house_col.alignment = BoxContainer.ALIGNMENT_CENTER
	_roll_display.add_child(house_col)

	var house_header := Label.new()
	house_header.text = "House"
	house_header.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	house_header.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
	house_col.add_child(house_header)

	_house_roll_label = Label.new()
	_house_roll_label.text = "-"
	_house_roll_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_house_roll_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["display"])
	_house_roll_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)
	house_col.add_child(_house_roll_label)

	# Play button
	_play_btn = Button.new()
	_play_btn.text = "Roll!"
	_play_btn.custom_minimum_size = Vector2(180, 44)
	_play_btn.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
	_play_btn.pressed.connect(_on_play_pressed)
	main_vbox.add_child(_play_btn)
	# Center the button
	_play_btn.size_flags_horizontal = Control.SIZE_SHRINK_CENTER

	# Result labels
	_result_label = Label.new()
	_result_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_result_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["title"])
	_result_label.visible = false
	main_vbox.add_child(_result_label)

	_result_detail = Label.new()
	_result_detail.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_result_detail.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
	_result_detail.visible = false
	main_vbox.add_child(_result_detail)

	_update_gold_display()


# ==========================================================================
#  Open / Close
# ==========================================================================

func open_tavern(gold: int) -> void:
	_player_gold = gold
	_current_bet = clampi(_current_bet, MIN_BET, mini(MAX_BET, _player_gold))
	visible = true
	_result_label.visible = false
	_result_detail.visible = false
	_roll_display.visible = false
	_is_playing = false
	_update_gold_display()
	_update_bet_display()


func close_tavern() -> void:
	visible = false
	panel_closed.emit()


# ==========================================================================
#  Game selection
# ==========================================================================

func _on_game_selected(game_type: GameType) -> void:
	_current_game = game_type
	_dice_btn.button_pressed = (game_type == GameType.DICE)
	_cards_btn.button_pressed = (game_type == GameType.CARDS)
	_play_btn.text = "Roll!" if game_type == GameType.DICE else "Draw!"


# ==========================================================================
#  Bet controls
# ==========================================================================

func _on_bet_text_changed(new_text: String) -> void:
	var value: int = clampi(new_text.to_int(), MIN_BET, mini(MAX_BET, _player_gold))
	_current_bet = value
	_bet_slider.set_value_no_signal(float(value))


func _on_bet_slider_changed(value: float) -> void:
	_current_bet = clampi(int(value), MIN_BET, mini(MAX_BET, _player_gold))
	_bet_input.text = str(_current_bet)


func _update_bet_display() -> void:
	_bet_slider.max_value = float(maxi(MIN_BET, mini(MAX_BET, _player_gold)))
	_bet_slider.value = float(_current_bet)
	_bet_input.text = str(_current_bet)


func _update_gold_display() -> void:
	_gold_display.text = "Gold: %d" % _player_gold


# ==========================================================================
#  Play / Roll
# ==========================================================================

func _on_play_pressed() -> void:
	if _is_playing:
		return
	if _current_bet > _player_gold or _current_bet < MIN_BET:
		return

	_is_playing = true
	_play_btn.disabled = true
	_result_label.visible = false
	_result_detail.visible = false

	match _current_game:
		GameType.DICE:
			_play_dice_game()
		GameType.CARDS:
			_play_dice_game()  # Placeholder: same as dice


func _play_dice_game() -> void:
	# Player rolls 2d6
	var player_d1: int = _rng.randi_range(1, 6)
	var player_d2: int = _rng.randi_range(1, 6)
	var player_total: int = player_d1 + player_d2

	# House rolls 2d6
	var house_d1: int = _rng.randi_range(1, 6)
	var house_d2: int = _rng.randi_range(1, 6)
	var house_total: int = house_d1 + house_d2

	# Animate the roll reveal
	_roll_display.visible = true
	_player_roll_label.text = "..."
	_house_roll_label.text = "..."

	var tween := create_tween()

	# Reveal player roll
	tween.tween_interval(0.4)
	tween.tween_callback(func() -> void:
		_player_roll_label.text = "%d + %d = %d" % [player_d1, player_d2, player_total]
	)

	# Reveal house roll
	tween.tween_interval(0.6)
	tween.tween_callback(func() -> void:
		_house_roll_label.text = "%d + %d = %d" % [house_d1, house_d2, house_total]
	)

	# Show result
	tween.tween_interval(0.4)
	tween.tween_callback(func() -> void:
		var won: bool = player_total > house_total
		var payout: int = 0

		if won:
			payout = int(float(_current_bet) * DICE_WIN_MULTIPLIER)
			_player_gold += payout - _current_bet
			_result_label.text = "You Win!"
			_result_label.add_theme_color_override("font_color", UIConstantsDef.SUCCESS)
			_result_detail.text = "+%d gold" % (payout - _current_bet)
			_result_detail.add_theme_color_override("font_color", UIConstantsDef.GOLD)
		elif player_total == house_total:
			# Tie: money back
			_result_label.text = "Draw"
			_result_label.add_theme_color_override("font_color", UIConstantsDef.WARNING)
			_result_detail.text = "Bet returned"
		else:
			_player_gold -= _current_bet
			_result_label.text = "You Lose"
			_result_label.add_theme_color_override("font_color", UIConstantsDef.DANGER)
			_result_detail.text = "-%d gold" % _current_bet

		_result_label.visible = true
		_result_detail.visible = true
		_update_gold_display()
		_update_bet_display()

		# Animate result
		_result_label.modulate.a = 0.0
		var flash := create_tween()
		flash.tween_property(_result_label, "modulate:a", 1.0, 0.3)
		if won:
			flash.tween_property(_result_label, "scale", Vector2(1.15, 1.15), 0.1)
			flash.tween_property(_result_label, "scale", Vector2.ONE, 0.1)

		game_played.emit("dice", _current_bet, won, payout)

		_is_playing = false
		_play_btn.disabled = (_player_gold < MIN_BET)
	)


# ==========================================================================
#  Input
# ==========================================================================

func _unhandled_input(event: InputEvent) -> void:
	if visible and event.is_action_pressed("ui_cancel"):
		close_tavern()
		get_viewport().set_input_as_handled()
