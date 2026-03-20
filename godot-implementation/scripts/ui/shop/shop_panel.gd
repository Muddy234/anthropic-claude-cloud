class_name ShopPanel
extends PanelContainer
## Shop interface with buy/sell tabs, NPC shop inventory, player inventory,
## item details, gold display, and charisma-based price modifiers.

# ---------------------------------------------------------------------------
#  Signals
# ---------------------------------------------------------------------------
signal item_purchased(item: Dictionary)
signal item_sold(item: Dictionary)

# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------
const TAB_BUY: int = 0
const TAB_SELL: int = 1
const BASE_CHARISMA_MODIFIER: float = 0.05  # 5 % discount per CHA point above 10

# ---------------------------------------------------------------------------
#  Node references
# ---------------------------------------------------------------------------
@onready var tab_bar: TabBar = %TabBar
@onready var npc_name_label: Label = %NpcNameLabel
@onready var gold_label: Label = %GoldLabel
@onready var item_list: VBoxContainer = %ItemList
@onready var scroll_container: ScrollContainer = %ScrollContainer
@onready var detail_panel: PanelContainer = %DetailPanel
@onready var detail_name: Label = %DetailName
@onready var detail_icon: TextureRect = %DetailIcon
@onready var detail_stats: RichTextLabel = %DetailStats
@onready var detail_price: Label = %DetailPrice
@onready var action_button: Button = %ActionButton
@onready var message_bar: Label = %MessageBar
@onready var close_button: Button = %CloseButton

# ---------------------------------------------------------------------------
#  State
# ---------------------------------------------------------------------------
var current_tab: int = TAB_BUY
var current_npc_data: Dictionary = {}
var shop_inventory: Array[Dictionary] = []
var selected_item: Dictionary = {}
var _is_open: bool = false

# ---------------------------------------------------------------------------
#  Lifecycle
# ---------------------------------------------------------------------------
func _ready() -> void:
	visible = false

	tab_bar.clear_tabs()
	tab_bar.add_tab("BUY")
	tab_bar.add_tab("SELL")
	tab_bar.current_tab = TAB_BUY
	tab_bar.tab_changed.connect(_on_tab_changed)

	action_button.pressed.connect(_on_action_pressed)
	close_button.pressed.connect(close)

	detail_panel.visible = false
	message_bar.text = ""

	EventBus.game_state_changed.connect(_on_game_state_changed)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel") and _is_open:
		close()
		get_viewport().set_input_as_handled()

# ---------------------------------------------------------------------------
#  Open / Close
# ---------------------------------------------------------------------------
func open(npc_data: Dictionary) -> void:
	if _is_open:
		return
	_is_open = true
	current_npc_data = npc_data
	current_tab = TAB_BUY
	tab_bar.current_tab = TAB_BUY
	selected_item = {}
	detail_panel.visible = false
	message_bar.text = ""

	npc_name_label.text = npc_data.get("name", "Merchant")

	# Load shop inventory from NPC data
	shop_inventory.clear()
	var stock: Array = npc_data.get("shop_inventory", [])
	for item: Dictionary in stock:
		shop_inventory.append(item)

	_update_gold_display()
	_refresh_list()
	visible = true

	EventBus.game_state_changed.emit(
		ConstantsDef.GameState.VILLAGE, ConstantsDef.GameState.SHOP
	)


func close() -> void:
	if not _is_open:
		return
	_is_open = false
	visible = false
	current_npc_data = {}
	selected_item = {}

	EventBus.game_state_changed.emit(
		ConstantsDef.GameState.SHOP, ConstantsDef.GameState.VILLAGE
	)

# ---------------------------------------------------------------------------
#  Tab handling
# ---------------------------------------------------------------------------
func _on_tab_changed(tab: int) -> void:
	current_tab = tab
	selected_item = {}
	detail_panel.visible = false
	message_bar.text = ""
	_refresh_list()

# ---------------------------------------------------------------------------
#  Refresh item list
# ---------------------------------------------------------------------------
func _refresh_list() -> void:
	for child in item_list.get_children():
		child.queue_free()

	var items: Array[Dictionary] = _get_current_items()

	for i in range(items.size()):
		var row: HBoxContainer = _create_item_row(items[i], i)
		item_list.add_child(row)

	_update_gold_display()


func _get_current_items() -> Array[Dictionary]:
	if current_tab == TAB_BUY:
		return shop_inventory
	else:
		# Sell mode: show player inventory
		var player: Node = _get_player()
		if not player:
			return []
		var inventory: Array = player.get("inventory") if player.get("inventory") else []
		var result: Array[Dictionary] = []
		for item: Dictionary in inventory:
			result.append(item)
		return result


func _create_item_row(item: Dictionary, index: int) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.custom_minimum_size.y = 36

	# Icon placeholder
	var icon_rect := TextureRect.new()
	icon_rect.custom_minimum_size = Vector2(32, 32)
	icon_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	var icon_path: String = item.get("icon", "")
	if not icon_path.is_empty() and ResourceLoader.exists(icon_path):
		icon_rect.texture = load(icon_path)
	row.add_child(icon_rect)

	# Name
	var name_label := Label.new()
	name_label.text = item.get("name", "Unknown")
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var rarity: String = item.get("rarity", "common")
	name_label.add_theme_color_override("font_color", UIConstantsDef.get_rarity_color(rarity))
	row.add_child(name_label)

	# Price
	var price_label := Label.new()
	var price: int = _calculate_price(item)
	var price_prefix: String = "Buy: " if current_tab == TAB_BUY else "Sell: "
	price_label.text = "%s%d g" % [price_prefix, price]
	price_label.add_theme_color_override("font_color", UIConstantsDef.GOLD)
	row.add_child(price_label)

	# Click handler
	var btn := Button.new()
	btn.text = "Select"
	btn.pressed.connect(_on_item_selected.bind(index))
	row.add_child(btn)

	return row

# ---------------------------------------------------------------------------
#  Selection & Detail
# ---------------------------------------------------------------------------
func _on_item_selected(index: int) -> void:
	var items: Array[Dictionary] = _get_current_items()
	if index < 0 or index >= items.size():
		return
	selected_item = items[index]
	_show_detail(selected_item)


func _show_detail(item: Dictionary) -> void:
	detail_panel.visible = true

	detail_name.text = item.get("name", "Unknown")
	var rarity: String = item.get("rarity", "common")
	detail_name.add_theme_color_override(
		"font_color", UIConstantsDef.get_rarity_color(rarity)
	)

	# Icon
	var icon_path: String = item.get("icon", "")
	if not icon_path.is_empty() and ResourceLoader.exists(icon_path):
		detail_icon.texture = load(icon_path)
	else:
		detail_icon.texture = null

	# Stats
	detail_stats.clear()
	var stats: Dictionary = item.get("stats", {})
	for stat_key: String in stats:
		detail_stats.push_color(UIConstantsDef.TEXT_SECONDARY)
		detail_stats.add_text("%s: %s\n" % [stat_key.capitalize(), str(stats[stat_key])])
		detail_stats.pop()

	# Price
	var price: int = _calculate_price(item)
	detail_price.text = "%d gold" % price
	detail_price.add_theme_color_override("font_color", UIConstantsDef.GOLD)

	# Action button
	if current_tab == TAB_BUY:
		action_button.text = "BUY"
		var can_afford: bool = _get_player_gold() >= price
		action_button.disabled = not can_afford
		if not can_afford:
			message_bar.text = "Insufficient gold!"
			message_bar.add_theme_color_override("font_color", UIConstantsDef.DANGER)
		else:
			message_bar.text = ""
	else:
		action_button.text = "SELL"
		action_button.disabled = false
		message_bar.text = ""

# ---------------------------------------------------------------------------
#  Buy / Sell
# ---------------------------------------------------------------------------
func buy_item(item_id: String) -> void:
	var item: Dictionary = _find_shop_item(item_id)
	if item.is_empty():
		_show_message("Item not found!", UIConstantsDef.DANGER)
		return

	var price: int = _calculate_price(item)
	var player_gold: int = _get_player_gold()

	if player_gold < price:
		_show_message("Not enough gold! Need %d, have %d." % [price, player_gold], UIConstantsDef.DANGER)
		return

	# Deduct gold, add item to player inventory
	_set_player_gold(player_gold - price)
	_add_item_to_player(item)

	_show_message("Purchased %s for %d gold." % [item.get("name", "item"), price], UIConstantsDef.SUCCESS)
	item_purchased.emit(item)
	_refresh_list()


func sell_item(item_id: String) -> void:
	var player: Node = _get_player()
	if not player:
		return

	var inventory: Array = player.get("inventory") if player.get("inventory") else []
	var item_index: int = -1
	for i in range(inventory.size()):
		if inventory[i].get("id", "") == item_id:
			item_index = i
			break

	if item_index < 0:
		_show_message("Item not in inventory!", UIConstantsDef.DANGER)
		return

	var item: Dictionary = inventory[item_index]
	var sell_price: int = _calculate_sell_price(item)

	# Remove from inventory, add gold
	inventory.remove_at(item_index)
	_set_player_gold(_get_player_gold() + sell_price)

	_show_message("Sold %s for %d gold." % [item.get("name", "item"), sell_price], UIConstantsDef.SUCCESS)
	item_sold.emit(item)
	selected_item = {}
	detail_panel.visible = false
	_refresh_list()


func _on_action_pressed() -> void:
	if selected_item.is_empty():
		return
	var item_id: String = selected_item.get("id", "")
	if current_tab == TAB_BUY:
		buy_item(item_id)
	else:
		sell_item(item_id)

# ---------------------------------------------------------------------------
#  Price calculation with charisma modifier
# ---------------------------------------------------------------------------
func _calculate_price(item: Dictionary) -> int:
	var base_price: int = item.get("value", 0)
	var charisma_mod: float = _get_charisma_modifier()

	if current_tab == TAB_BUY:
		# Buy: reduce price with charisma
		return maxi(1, int(base_price * (1.0 - charisma_mod)))
	else:
		return _calculate_sell_price(item)


func _calculate_sell_price(item: Dictionary) -> int:
	var base_price: int = item.get("value", 0)
	var charisma_mod: float = _get_charisma_modifier()
	# Sell: base is 40% of value, charisma increases it
	return maxi(1, int(base_price * (0.4 + charisma_mod * 0.5)))


func _get_charisma_modifier() -> float:
	var player: Node = _get_player()
	if not player:
		return 0.0
	var stats: Dictionary = player.get("stats") if player.get("stats") else {}
	var charisma: int = stats.get("cha", 10)
	return maxf(0.0, (charisma - 10) * BASE_CHARISMA_MODIFIER)

# ---------------------------------------------------------------------------
#  Gold helpers
# ---------------------------------------------------------------------------
func _update_gold_display() -> void:
	gold_label.text = "%d gold" % _get_player_gold()
	gold_label.add_theme_color_override("font_color", UIConstantsDef.GOLD)


func _get_player_gold() -> int:
	var player: Node = _get_player()
	if not player:
		return 0
	return player.get("gold") if player.get("gold") else 0


func _set_player_gold(amount: int) -> void:
	var player: Node = _get_player()
	if player:
		player.set("gold", amount)


func _add_item_to_player(item: Dictionary) -> void:
	var player: Node = _get_player()
	if not player:
		return
	var inventory: Array = player.get("inventory") if player.get("inventory") else []
	inventory.append(item.duplicate())

# ---------------------------------------------------------------------------
#  Utility
# ---------------------------------------------------------------------------
func _find_shop_item(item_id: String) -> Dictionary:
	for item: Dictionary in shop_inventory:
		if item.get("id", "") == item_id:
			return item
	return {}


func _show_message(text: String, color: Color) -> void:
	message_bar.text = text
	message_bar.add_theme_color_override("font_color", color)

	# Auto-clear after 3 seconds
	var tween := create_tween()
	tween.tween_interval(3.0)
	tween.tween_callback(func() -> void:
		if message_bar.text == text:
			message_bar.text = ""
	)


func _on_game_state_changed(_old_state: int, new_state: int) -> void:
	if new_state != ConstantsDef.GameState.SHOP and _is_open:
		_is_open = false
		visible = false


func _get_player() -> Node:
	var gm: Node = get_node_or_null("/root/GameManager")
	if gm:
		return gm.get("player")
	return null
