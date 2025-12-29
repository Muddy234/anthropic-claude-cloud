class_name NPC
extends Entity

## Non-player character for quests, shops, and dialog

@export var npc_id: String
@export var display_name: String
@export var title: String = ""  # e.g., "Blacksmith", "Village Elder"
@export var portrait: Texture2D

@export_group("Dialog")
@export var dialog_lines: Array[String] = []
@export var greeting_dialogue: String = ""
@export var has_quest: bool = false
@export var quest_id: String = ""
@export var quest_ids: Array[String] = []

@export_group("Shop")
@export var is_merchant: bool = false
@export var shop_inventory: Array[ItemData] = []
@export var shop_inventory_ids: Array[String] = []  # Item IDs for dynamic loading
@export var buy_price_modifier: float = 1.0  # 1.0 = normal prices
@export var sell_price_modifier: float = 0.5  # 0.5 = half value when selling

@export_group("Service")
@export var service_type: String = ""  # "bank", "heal", "rest", "bounties"

@export_group("Behavior")
@export var is_stationary: bool = true
@export var wander_radius: int = 3
@export var home_position: Vector2i

@export_group("Location")
@export var building_id: String = ""
@export var stall_id: String = ""

# State
var current_dialog_index: int = 0
var has_been_talked_to: bool = false
var npc_name: String:  # Alias for display_name
	get: return display_name
var current_quest: Resource = null

# Signals
signal dialog_started()
signal dialog_ended()
signal quest_offered(quest_id: String)
signal shop_opened()

func _ready():
	super._ready()
	add_to_group("npcs")
	home_position = grid_pos

## Interact with this NPC
func interact():
	has_been_talked_to = true

	if is_merchant:
		_open_shop()
	elif has_quest:
		_offer_quest()
	else:
		_start_dialog()

## Start dialog
func _start_dialog():
	if dialog_lines.is_empty():
		return

	dialog_started.emit()
	EventBus.dialog_started.emit(self)

	current_dialog_index = 0
	_show_current_dialog()

## Show current dialog line
func _show_current_dialog():
	if current_dialog_index >= dialog_lines.size():
		_end_dialog()
		return

	var line := dialog_lines[current_dialog_index]
	EventBus.show_dialog.emit({
		"speaker": display_name,
		"portrait": portrait,
		"text": line,
		"npc": self
	})

## Advance to next dialog line
func advance_dialog():
	current_dialog_index += 1
	_show_current_dialog()

## End dialog
func _end_dialog():
	dialog_ended.emit()
	EventBus.dialog_ended.emit(self)
	EventBus.hide_dialog.emit()

## Open shop
func _open_shop():
	shop_opened.emit()
	EventBus.shop_opened.emit(self)

## Offer quest
func _offer_quest():
	quest_offered.emit(quest_id)

	# Show quest dialog
	EventBus.show_dialog.emit({
		"speaker": display_name,
		"portrait": portrait,
		"text": _get_quest_dialog(),
		"npc": self,
		"is_quest": true,
		"quest_id": quest_id
	})

## Get quest dialog text
func _get_quest_dialog() -> String:
	# TODO: Load quest data and get appropriate dialog
	if dialog_lines.size() > 0:
		return dialog_lines[0]
	return "I have a task for you..."

## Buy an item from this NPC
func buy_item(item: ItemData) -> bool:
	var price := int(item.buy_price * buy_price_modifier)

	if not GameManager.player.spend_gold(price):
		EventBus.show_notification.emit("Not enough gold!", "error")
		return false

	var item_copy := item.create_instance()
	if GameManager.player.add_item(item_copy):
		AudioManager.play_ui_sfx("gold")
		return true
	else:
		# Refund
		GameManager.player.add_gold(price)
		EventBus.show_notification.emit("Inventory full!", "error")
		return false

## Sell an item to this NPC
func sell_item(item: ItemData) -> bool:
	var price := int(item.get_sell_value() * sell_price_modifier)

	if GameManager.player.remove_item(item):
		GameManager.player.add_gold(price)
		AudioManager.play_ui_sfx("gold")
		return true

	return false

## Get greeting text based on state
func get_greeting() -> String:
	if has_been_talked_to:
		if is_merchant:
			return "Welcome back! Looking to trade?"
		else:
			return "Good to see you again."
	else:
		if is_merchant:
			return "Welcome, traveler! Take a look at my wares."
		elif has_quest:
			return "Adventurer! I need your help."
		else:
			return "Hello there."

## Update NPC (for wandering behavior)
func update_npc(delta: float):
	if is_stationary:
		return

	# Simple wander logic
	if randf() < 0.01:
		var new_pos := home_position + Vector2i(
			randi_range(-wander_radius, wander_radius),
			randi_range(-wander_radius, wander_radius)
		)

		if GameManager.is_walkable(new_pos):
			face_position(new_pos)
			grid_pos = new_pos

## Setup from NPCData resource
func setup_from_resource(data: NPCData):
	npc_id = data.id
	display_name = data.display_name
	title = data.title
	portrait = data.portrait

	greeting_dialogue = data.greeting_dialogue
	has_quest = data.has_quest
	quest_ids = data.quest_ids.duplicate()
	if not quest_ids.is_empty():
		quest_id = quest_ids[0]

	is_merchant = data.is_merchant
	shop_inventory_ids = data.shop_inventory.duplicate()
	sell_price_modifier = data.buy_multiplier

	service_type = data.service_type
	building_id = data.default_building

	# Set dialog lines from greeting
	if greeting_dialogue != "":
		dialog_lines = [greeting_dialogue]
