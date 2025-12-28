class_name DialogueBox
extends Control

## Dialogue box for NPC conversations with typewriter effect and choices

signal dialogue_finished
signal choice_selected(choice_index: int)

@onready var panel: PanelContainer = $Panel
@onready var portrait: TextureRect = $Panel/MarginContainer/HBoxContainer/Portrait
@onready var name_label: Label = $Panel/MarginContainer/HBoxContainer/VBoxContainer/NameLabel
@onready var text_label: Label = $Panel/MarginContainer/HBoxContainer/VBoxContainer/TextLabel
@onready var continue_indicator: Label = $Panel/MarginContainer/HBoxContainer/VBoxContainer/ContinueIndicator
@onready var choices_container: VBoxContainer = $Panel/MarginContainer/HBoxContainer/VBoxContainer/ChoicesContainer

const CHARS_PER_SECOND := 40.0
const FAST_CHARS_PER_SECOND := 120.0

var current_dialogue: Array = []  # Array of dialogue entries
var current_index: int = 0
var full_text: String = ""
var displayed_chars: int = 0
var is_typing: bool = false
var is_fast_forward: bool = false
var is_waiting_for_input: bool = false
var current_npc: NPC = null

func _ready():
	hide()
	if choices_container:
		for child in choices_container.get_children():
			child.queue_free()

func _process(delta: float):
	if not visible or not is_typing:
		return

	var speed := FAST_CHARS_PER_SECOND if is_fast_forward else CHARS_PER_SECOND
	displayed_chars += speed * delta

	if displayed_chars >= full_text.length():
		displayed_chars = full_text.length()
		is_typing = false
		is_waiting_for_input = true
		_show_continue_or_choices()

	if text_label:
		text_label.visible_characters = int(displayed_chars)

func _unhandled_input(event: InputEvent):
	if not visible:
		return

	if event.is_action_pressed("ui_accept") or event.is_action_pressed("interact"):
		_handle_input()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("ui_cancel"):
		_close_dialogue()
		get_viewport().set_input_as_handled()

func _handle_input():
	if is_typing:
		# Fast forward text
		is_fast_forward = true
	elif is_waiting_for_input:
		if _has_choices():
			return  # Wait for choice button press
		_advance_dialogue()

## Start a dialogue sequence
func start_dialogue(npc: NPC, dialogue: Array):
	current_npc = npc
	current_dialogue = dialogue
	current_index = 0

	if npc:
		if name_label:
			name_label.text = npc.npc_name
		if portrait and npc.portrait:
			portrait.texture = npc.portrait
			portrait.visible = true
		elif portrait:
			portrait.visible = false

	show()
	_show_current_entry()

## Show a single dialogue entry
func show_dialogue(speaker_name: String, text: String, speaker_portrait: Texture2D = null):
	current_dialogue = [{"text": text}]
	current_index = 0

	if name_label:
		name_label.text = speaker_name
	if portrait:
		portrait.texture = speaker_portrait
		portrait.visible = speaker_portrait != null

	show()
	_show_current_entry()

func _show_current_entry():
	if current_index >= current_dialogue.size():
		_close_dialogue()
		return

	var entry = current_dialogue[current_index]

	# Update speaker if specified
	if entry.has("speaker") and name_label:
		name_label.text = entry.speaker
	if entry.has("portrait") and portrait:
		portrait.texture = entry.portrait

	# Start typing effect
	full_text = entry.get("text", "")
	displayed_chars = 0
	is_typing = true
	is_fast_forward = false
	is_waiting_for_input = false

	if text_label:
		text_label.text = full_text
		text_label.visible_characters = 0

	# Hide continue indicator and choices during typing
	if continue_indicator:
		continue_indicator.visible = false
	_clear_choices()

func _show_continue_or_choices():
	var entry = current_dialogue[current_index]

	if entry.has("choices") and entry.choices.size() > 0:
		_show_choices(entry.choices)
	else:
		if continue_indicator:
			continue_indicator.visible = true

func _has_choices() -> bool:
	if current_index >= current_dialogue.size():
		return false
	var entry = current_dialogue[current_index]
	return entry.has("choices") and entry.choices.size() > 0

func _show_choices(choices: Array):
	_clear_choices()

	for i in choices.size():
		var choice = choices[i]
		var button := Button.new()
		button.text = choice.get("text", "...")
		button.pressed.connect(_on_choice_pressed.bind(i, choice))

		if i == 0:
			button.grab_focus()

		choices_container.add_child(button)

func _clear_choices():
	if not choices_container:
		return
	for child in choices_container.get_children():
		child.queue_free()

func _on_choice_pressed(index: int, choice: Dictionary):
	choice_selected.emit(index)

	# Handle choice actions
	if choice.has("action"):
		_execute_action(choice.action)

	# Go to next dialogue or specific index
	if choice.has("next"):
		current_index = choice.next
		_show_current_entry()
	else:
		_advance_dialogue()

func _execute_action(action: String):
	match action:
		"open_shop":
			EventBus.shop_opened.emit(current_npc)
		"accept_quest":
			if current_npc and current_npc.current_quest:
				EventBus.quest_accepted.emit(current_npc.current_quest)
		"complete_quest":
			if current_npc and current_npc.current_quest:
				EventBus.quest_completed.emit(current_npc.current_quest)
		_:
			# Custom action - emit generic signal
			EventBus.dialogue_action.emit(action)

func _advance_dialogue():
	current_index += 1

	if current_index >= current_dialogue.size():
		_close_dialogue()
	else:
		_show_current_entry()

func _close_dialogue():
	hide()
	is_typing = false
	is_waiting_for_input = false
	current_dialogue = []
	current_index = 0
	current_npc = null
	_clear_choices()
	dialogue_finished.emit()

## Quick message (no portrait, auto-dismiss)
func show_message(text: String, duration: float = 2.0):
	if name_label:
		name_label.text = ""
	if portrait:
		portrait.visible = false

	full_text = text
	displayed_chars = text.length()
	is_typing = false
	is_waiting_for_input = false

	if text_label:
		text_label.text = text
		text_label.visible_characters = -1

	if continue_indicator:
		continue_indicator.visible = false

	show()

	# Auto close after duration
	var timer := get_tree().create_timer(duration)
	timer.timeout.connect(_close_dialogue)
