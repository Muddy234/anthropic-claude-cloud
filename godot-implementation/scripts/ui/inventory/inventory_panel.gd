class_name InventoryPanel
extends PanelContainer
## Modal inventory panel with 5 tabs: weapons, armor, consumables, items, equipped.
## Grid of InventorySlot nodes populated from player inventory data.
## Detail sidebar showing selected item stats and action buttons.
## Opens/closes with a slide-in animation from the right side of the screen.

# ---------------------------------------------------------------------------
#  Signals
# ---------------------------------------------------------------------------
signal item_selected(item_data: Dictionary)
signal item_used(item_data: Dictionary)
signal item_dropped(item_data: Dictionary)

# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------
const SLOT_SCENE: PackedScene = preload("res://scenes/ui/inventory/inventory_slot.tscn")

const TAB_NAMES: PackedStringArray = [
	"WEAPONS", "ARMOR", "CONSUMABLES", "ITEMS", "EQUIPPED"
]

const TAB_FILTERS: PackedStringArray = [
	"weapon", "armor", "consumable", "material", "equipped"
]

const SORT_FIELDS: PackedStringArray = [
	"name", "rarity", "level", "value"
]

const SLIDE_DURATION: float = 0.25

# ---------------------------------------------------------------------------
#  Node references  (use unique-name % syntax in the scene tree)
# ---------------------------------------------------------------------------
@onready var tab_bar: TabBar = %TabBar
@onready var item_grid: GridContainer = %ItemGrid
@onready var scroll_container: ScrollContainer = %ScrollContainer
@onready var detail_panel: PanelContainer = %DetailPanel
@onready var detail_name: Label = %DetailName
@onready var detail_icon: TextureRect = %DetailIcon
@onready var detail_stats: RichTextLabel = %DetailStats
@onready var detail_description: RichTextLabel = %DetailDescription
@onready var use_button: Button = %UseButton
@onready var equip_button: Button = %EquipButton
@onready var drop_button: Button = %DropButton
@onready var close_button: Button = %CloseButton

# ---------------------------------------------------------------------------
#  State
# ---------------------------------------------------------------------------
var current_tab: int = 0
var current_sort: String = "name"
var selected_item: Dictionary = {}
var _items_cache: Array[Dictionary] = []
var _is_open: bool = false
var _slide_tween: Tween = null

# ---------------------------------------------------------------------------
#  Lifecycle
# ---------------------------------------------------------------------------
func _ready() -> void:
	visible = false
	modulate.a = 0.0

	# Build tabs
	tab_bar.clear_tabs()
	for tab_name in TAB_NAMES:
		tab_bar.add_tab(tab_name)
	tab_bar.current_tab = 0
	tab_bar.tab_changed.connect(_on_tab_changed)

	# Buttons
	use_button.pressed.connect(_on_use_pressed)
	equip_button.pressed.connect(_on_equip_pressed)
	drop_button.pressed.connect(_on_drop_pressed)
	close_button.pressed.connect(close)

	# EventBus connections
	if Engine.has_singleton("EventBus"):
		pass  # EventBus signals connected externally via GameManager
	EventBus.game_state_changed.connect(_on_game_state_changed)

	detail_panel.visible = false


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("inventory"):
		if _is_open:
			close()
		else:
			open()
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("ui_cancel") and _is_open:
		close()
		get_viewport().set_input_as_handled()

# ---------------------------------------------------------------------------
#  Open / Close with slide animation
# ---------------------------------------------------------------------------
func open() -> void:
	if _is_open:
		return
	_is_open = true
	visible = true
	_refresh_list()

	if _slide_tween:
		_slide_tween.kill()
	_slide_tween = create_tween().set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)

	# Slide in from right
	var target_x: float = position.x
	position.x = position.x + 300.0
	modulate.a = 0.0

	_slide_tween.tween_property(self, "position:x", target_x, SLIDE_DURATION)
	_slide_tween.parallel().tween_property(self, "modulate:a", 1.0, SLIDE_DURATION * 0.6)

	EventBus.game_state_changed.emit(
		ConstantsDef.GameState.PLAYING, ConstantsDef.GameState.INVENTORY
	)


func close() -> void:
	if not _is_open:
		return
	_is_open = false

	if _slide_tween:
		_slide_tween.kill()
	_slide_tween = create_tween().set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_CUBIC)
	_slide_tween.tween_property(self, "modulate:a", 0.0, SLIDE_DURATION * 0.6)
	_slide_tween.tween_callback(func() -> void: visible = false)

	EventBus.game_state_changed.emit(
		ConstantsDef.GameState.INVENTORY, ConstantsDef.GameState.PLAYING
	)

# ---------------------------------------------------------------------------
#  Tab handling
# ---------------------------------------------------------------------------
func _on_tab_changed(tab: int) -> void:
	current_tab = tab
	selected_item = {}
	detail_panel.visible = false
	_refresh_list()


func filter_by_tab(tab: String) -> void:
	var idx: int = TAB_FILTERS.find(tab)
	if idx >= 0:
		tab_bar.current_tab = idx

# ---------------------------------------------------------------------------
#  Sorting
# ---------------------------------------------------------------------------
func sort_items(by: String) -> void:
	if by in SORT_FIELDS:
		current_sort = by
		_refresh_list()

# ---------------------------------------------------------------------------
#  Refresh grid
# ---------------------------------------------------------------------------
func _refresh_list() -> void:
	# Clear existing slots
	for child in item_grid.get_children():
		child.queue_free()

	_items_cache = _get_filtered_items()
	_sort_cache()

	for i in range(_items_cache.size()):
		var slot: InventorySlot = SLOT_SCENE.instantiate()
		item_grid.add_child(slot)
		slot.set_item(_items_cache[i])
		slot.slot_index = i
		slot.slot_clicked.connect(_on_slot_clicked.bind(i))
		slot.slot_drag_started.connect(_on_slot_drag_started)
		slot.slot_drop_received.connect(_on_slot_drop_received)

	# Fill remaining empty slots up to visible grid
	var min_slots: int = 20  # 5 columns x 4 rows minimum
	for j in range(_items_cache.size(), min_slots):
		var empty_slot: InventorySlot = SLOT_SCENE.instantiate()
		item_grid.add_child(empty_slot)
		empty_slot.clear()
		empty_slot.slot_index = j
		empty_slot.slot_drop_received.connect(_on_slot_drop_received)


func _get_filtered_items() -> Array[Dictionary]:
	var player: Node = _get_player()
	if not player:
		return []

	var filter: String = TAB_FILTERS[current_tab]
	var inventory: Array = player.get("inventory") if player.get("inventory") else []

	if filter == "equipped":
		if player.has_method("get_equipped_items"):
			var equipped: Array = player.get_equipped_items()
			var result: Array[Dictionary] = []
			for item in equipped:
				result.append(item)
			return result
		return []

	var result: Array[Dictionary] = []
	for item: Dictionary in inventory:
		var item_type: String = item.get("type", "")
		if item_type == filter:
			result.append(item)
	return result


func _sort_cache() -> void:
	match current_sort:
		"name":
			_items_cache.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
				return a.get("name", "") < b.get("name", ""))
		"rarity":
			_items_cache.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
				return _rarity_order(a.get("rarity", "common")) > _rarity_order(b.get("rarity", "common")))
		"level":
			_items_cache.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
				return a.get("level", 0) > b.get("level", 0))
		"value":
			_items_cache.sort_custom(func(a: Dictionary, b: Dictionary) -> bool:
				return a.get("value", 0) > b.get("value", 0))


static func _rarity_order(rarity: String) -> int:
	match rarity:
		"common": return 0
		"uncommon": return 1
		"rare": return 2
		"epic": return 3
		"legendary": return 4
		"mythic": return 5
		_: return 0

# ---------------------------------------------------------------------------
#  Selection & Detail
# ---------------------------------------------------------------------------
func _on_slot_clicked(index: int) -> void:
	if index < 0 or index >= _items_cache.size():
		return
	selected_item = _items_cache[index]
	_show_detail(selected_item)
	item_selected.emit(selected_item)


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
		var value: Variant = stats[stat_key]
		detail_stats.push_color(UIConstantsDef.TEXT_SECONDARY)
		detail_stats.add_text("%s: " % stat_key.capitalize())
		detail_stats.pop()
		detail_stats.push_color(UIConstantsDef.TEXT_PRIMARY)
		detail_stats.add_text(str(value))
		detail_stats.pop()
		detail_stats.newline()

	# Description
	detail_description.text = item.get("description", "")

	# Button visibility
	var item_type: String = item.get("type", "")
	use_button.visible = item_type == "consumable"
	equip_button.visible = item_type in ["weapon", "armor"]
	drop_button.visible = true

# ---------------------------------------------------------------------------
#  Action buttons
# ---------------------------------------------------------------------------
func _on_use_pressed() -> void:
	if selected_item.is_empty():
		return
	item_used.emit(selected_item)
	_refresh_list()


func _on_equip_pressed() -> void:
	if selected_item.is_empty():
		return
	var player: Node = _get_player()
	if player and player.has_method("equip_item"):
		player.equip_item(selected_item)
	_refresh_list()


func _on_drop_pressed() -> void:
	if selected_item.is_empty():
		return
	item_dropped.emit(selected_item)
	selected_item = {}
	detail_panel.visible = false
	_refresh_list()

# ---------------------------------------------------------------------------
#  Drag-and-drop between slots
# ---------------------------------------------------------------------------
func _on_slot_drag_started(_from_index: int) -> void:
	pass  # Visual feedback handled in InventorySlot


func _on_slot_drop_received(from_index: int, to_index: int) -> void:
	var player: Node = _get_player()
	if not player:
		return
	var inventory: Array = player.get("inventory") if player.get("inventory") else []
	if from_index < 0 or from_index >= inventory.size():
		return
	if to_index < 0 or to_index >= inventory.size():
		return
	# Swap items in underlying inventory
	var temp: Variant = inventory[from_index]
	inventory[from_index] = inventory[to_index]
	inventory[to_index] = temp
	_refresh_list()

# ---------------------------------------------------------------------------
#  EventBus handlers
# ---------------------------------------------------------------------------
func _on_game_state_changed(_old_state: int, new_state: int) -> void:
	if new_state != ConstantsDef.GameState.INVENTORY and _is_open:
		_is_open = false
		visible = false
		modulate.a = 0.0

# ---------------------------------------------------------------------------
#  Helpers
# ---------------------------------------------------------------------------
func _get_player() -> Node:
	if Engine.has_singleton("GameManager"):
		return Engine.get_singleton("GameManager").get("player")
	# Fallback: try the autoload directly
	var gm: Node = get_node_or_null("/root/GameManager")
	if gm:
		return gm.get("player")
	return null
