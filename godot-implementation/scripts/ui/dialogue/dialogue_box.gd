class_name DialogueBox
extends PanelContainer
## Dialogue system UI with NPC portrait, typewriter text effect (30 chars/sec),
## branching options, skip-on-input, and auto-advance support.

# ---------------------------------------------------------------------------
#  Signals
# ---------------------------------------------------------------------------
signal dialogue_started(npc_name: String)
signal dialogue_ended()
signal option_selected(index: int, option_data: Dictionary)

# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------
const CHARS_PER_SECOND: float = 30.0
const TEXT_SPEED: float = 1.0 / CHARS_PER_SECOND  # ~0.033 seconds per character
const AUTO_ADVANCE_DELAY: float = 2.0  # Seconds to wait before auto-advancing

# ---------------------------------------------------------------------------
#  Node references
# ---------------------------------------------------------------------------
@onready var portrait: TextureRect = %Portrait
@onready var name_label: Label = %NameLabel
@onready var text_label: RichTextLabel = %TextLabel
@onready var options_container: VBoxContainer = %OptionsContainer
@onready var continue_indicator: Label = %ContinueIndicator

# ---------------------------------------------------------------------------
#  State
# ---------------------------------------------------------------------------
var _npc_name: String = ""
var _npc_portrait: Texture2D = null
var _dialogue_data: Array = []  # Array of dialogue nodes
var _current_index: int = 0
var _full_text: String = ""
var _is_animating: bool = false
var _is_open: bool = false
var _typewriter_tween: Tween = null
var _auto_advance_enabled: bool = false
var _auto_advance_timer: float = 0.0
var _waiting_for_input: bool = false

# ---------------------------------------------------------------------------
#  Lifecycle
# ---------------------------------------------------------------------------
func _ready() -> void:
	visible = false
	continue_indicator.visible = false
	options_container.visible = false

	EventBus.game_state_changed.connect(_on_game_state_changed)


func _process(delta: float) -> void:
	if not _is_open:
		return

	# Pulse the continue indicator
	if continue_indicator.visible:
		continue_indicator.modulate.a = 0.5 + 0.5 * sin(Time.get_ticks_msec() * 0.005)

	# Auto-advance timer
	if _auto_advance_enabled and _waiting_for_input and not _has_options():
		_auto_advance_timer -= delta
		if _auto_advance_timer <= 0.0:
			advance()


func _unhandled_input(event: InputEvent) -> void:
	if not _is_open:
		return

	if event is InputEventMouseButton:
		var mb: InputEventMouseButton = event
		if mb.pressed and mb.button_index == MOUSE_BUTTON_LEFT:
			_handle_input_advance()
			get_viewport().set_input_as_handled()
	elif event.is_action_pressed("ui_accept"):
		_handle_input_advance()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("ui_cancel"):
		_close_dialogue()
		get_viewport().set_input_as_handled()

# ---------------------------------------------------------------------------
#  Public API
# ---------------------------------------------------------------------------

## Start a dialogue sequence.
## dialogue_data is an Array of dictionaries, each with:
##   "text": String - the dialogue line
##   "options": Array (optional) - branching options
##     each option: {"text": String, "next": int or "close"}
func start_dialogue(npc_name: String, npc_portrait: Texture2D, dialogue_data: Array) -> void:
	_npc_name = npc_name
	_npc_portrait = npc_portrait
	_dialogue_data = dialogue_data
	_current_index = 0
	_is_open = true
	_waiting_for_input = false

	# Setup visuals
	name_label.text = npc_name
	name_label.add_theme_color_override("font_color", UIConstantsDef.GOLD)

	if npc_portrait:
		portrait.texture = npc_portrait
		portrait.visible = true
	else:
		portrait.visible = false

	visible = true
	dialogue_started.emit(npc_name)

	EventBus.game_state_changed.emit(
		ConstantsDef.GameState.PLAYING, ConstantsDef.GameState.DIALOGUE
	)

	# Show first line
	_show_current_line()


## Advance to the next dialogue line or show options.
func advance() -> void:
	if _is_animating:
		# Skip typewriter, show full text immediately
		_skip_typewriter()
		return

	if _waiting_for_input:
		_waiting_for_input = false
		_current_index += 1

		if _current_index >= _dialogue_data.size():
			_close_dialogue()
			return

		_show_current_line()

# ---------------------------------------------------------------------------
#  Internal dialogue flow
# ---------------------------------------------------------------------------
func _show_current_line() -> void:
	if _current_index >= _dialogue_data.size():
		_close_dialogue()
		return

	var node: Variant = _dialogue_data[_current_index]
	var line_text: String = ""
	var options: Array = []

	if node is Dictionary:
		line_text = node.get("text", "")
		options = node.get("options", [])
	elif node is String:
		line_text = node
	else:
		line_text = str(node)

	_full_text = line_text
	continue_indicator.visible = false
	options_container.visible = false

	# Start typewriter animation
	_animate_typewriter(line_text)

	# Prepare options (shown after typewriter finishes)
	if options.size() > 0:
		_build_options(options)


func _animate_typewriter(text: String) -> void:
	_is_animating = true
	text_label.text = text
	text_label.visible_characters = 0

	if _typewriter_tween:
		_typewriter_tween.kill()

	var duration: float = text.length() * TEXT_SPEED
	if duration <= 0.0:
		_on_typewriter_complete()
		return

	_typewriter_tween = create_tween()
	_typewriter_tween.tween_property(
		text_label, "visible_characters",
		text.length(),
		duration
	)
	_typewriter_tween.tween_callback(_on_typewriter_complete)


func _skip_typewriter() -> void:
	if _typewriter_tween:
		_typewriter_tween.kill()
		_typewriter_tween = null
	text_label.visible_characters = -1  # Show all characters
	_on_typewriter_complete()


func _on_typewriter_complete() -> void:
	_is_animating = false
	text_label.visible_characters = -1

	var node: Variant = _dialogue_data[_current_index] if _current_index < _dialogue_data.size() else {}
	var options: Array = []
	if node is Dictionary:
		options = node.get("options", [])

	if options.size() > 0:
		# Show branching options
		options_container.visible = true
		continue_indicator.visible = false
	else:
		# Wait for input to advance
		_waiting_for_input = true
		continue_indicator.visible = true
		continue_indicator.text = "[Click or Enter to continue]"
		_auto_advance_timer = AUTO_ADVANCE_DELAY

# ---------------------------------------------------------------------------
#  Options
# ---------------------------------------------------------------------------
func _build_options(options: Array) -> void:
	for child in options_container.get_children():
		child.queue_free()

	for i in range(options.size()):
		var option: Dictionary = options[i] if options[i] is Dictionary else {"text": str(options[i])}
		var btn := Button.new()
		btn.text = "%d. %s" % [i + 1, option.get("text", "...")]
		btn.alignment = HORIZONTAL_ALIGNMENT_LEFT
		btn.add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)
		btn.pressed.connect(_on_option_selected.bind(i))
		options_container.add_child(btn)


func _on_option_selected(index: int) -> void:
	var node: Variant = _dialogue_data[_current_index] if _current_index < _dialogue_data.size() else {}
	var options: Array = []
	if node is Dictionary:
		options = node.get("options", [])

	if index < 0 or index >= options.size():
		return

	var option: Dictionary = options[index] if options[index] is Dictionary else {}
	option_selected.emit(index, option)

	var next: Variant = option.get("next", "")

	if next == "close" or next == "":
		_close_dialogue()
	elif next is int:
		_current_index = next
		_show_current_line()
	elif next is String:
		# Try to find by id
		for i in range(_dialogue_data.size()):
			var d: Variant = _dialogue_data[i]
			if d is Dictionary and d.get("id", "") == next:
				_current_index = i
				_show_current_line()
				return
		# Fallback: advance normally
		_current_index += 1
		if _current_index < _dialogue_data.size():
			_show_current_line()
		else:
			_close_dialogue()

# ---------------------------------------------------------------------------
#  Input handler
# ---------------------------------------------------------------------------
func _handle_input_advance() -> void:
	if _is_animating:
		_skip_typewriter()
	elif _waiting_for_input and not _has_options():
		advance()


func _has_options() -> bool:
	if _current_index >= _dialogue_data.size():
		return false
	var node: Variant = _dialogue_data[_current_index]
	if node is Dictionary:
		var options: Array = node.get("options", [])
		return options.size() > 0
	return false

# ---------------------------------------------------------------------------
#  Close
# ---------------------------------------------------------------------------
func _close_dialogue() -> void:
	_is_open = false
	_waiting_for_input = false
	_is_animating = false
	visible = false

	if _typewriter_tween:
		_typewriter_tween.kill()
		_typewriter_tween = null

	dialogue_ended.emit()

	EventBus.game_state_changed.emit(
		ConstantsDef.GameState.DIALOGUE, ConstantsDef.GameState.PLAYING
	)

# ---------------------------------------------------------------------------
#  EventBus
# ---------------------------------------------------------------------------
func _on_game_state_changed(_old_state: int, new_state: int) -> void:
	if new_state != ConstantsDef.GameState.DIALOGUE and _is_open:
		_close_dialogue()
