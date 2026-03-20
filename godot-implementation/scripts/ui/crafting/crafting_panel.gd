class_name CraftingPanel
extends PanelContainer
## Crafting interface with category sidebar (weapons, armor, potions, scrolls),
## recipe list, material requirements with have/need counts, result preview,
## and crafting animation/progress indicator.

# ---------------------------------------------------------------------------
#  Signals
# ---------------------------------------------------------------------------
signal item_crafted(recipe_id: String, result_item: Dictionary)

# ---------------------------------------------------------------------------
#  Constants
# ---------------------------------------------------------------------------
const CATEGORIES: Array[Dictionary] = [
	{"id": "weapons",  "label": "Weapons",  "enum": ConstantsDef.CraftCategory.WEAPONS},
	{"id": "armor",    "label": "Armor",    "enum": ConstantsDef.CraftCategory.ARMOR},
	{"id": "potions",  "label": "Potions",  "enum": ConstantsDef.CraftCategory.CONSUMABLES},
	{"id": "scrolls",  "label": "Scrolls",  "enum": ConstantsDef.CraftCategory.SPECIAL},
]

const CRAFT_ANIM_DURATION: float = 1.2  # seconds

# ---------------------------------------------------------------------------
#  Node references
# ---------------------------------------------------------------------------
@onready var category_list: ItemList = %CategoryList
@onready var recipe_list: VBoxContainer = %RecipeList
@onready var recipe_scroll: ScrollContainer = %RecipeScroll
@onready var detail_panel: PanelContainer = %DetailPanel
@onready var recipe_name_label: Label = %RecipeNameLabel
@onready var result_icon: TextureRect = %ResultIcon
@onready var result_description: RichTextLabel = %ResultDescription
@onready var materials_list: VBoxContainer = %MaterialsList
@onready var craft_button: Button = %CraftButton
@onready var craft_progress: ProgressBar = %CraftProgress
@onready var message_label: Label = %MessageLabel
@onready var close_button: Button = %CloseButton

# ---------------------------------------------------------------------------
#  State
# ---------------------------------------------------------------------------
var _is_open: bool = false
var _current_category: String = "weapons"
var _selected_recipe: Dictionary = {}
var _recipes: Array[Dictionary] = []  # All available recipes
var _is_crafting: bool = false
var _craft_tween: Tween = null

# ---------------------------------------------------------------------------
#  Lifecycle
# ---------------------------------------------------------------------------
func _ready() -> void:
	visible = false

	# Build category sidebar
	category_list.clear()
	for cat: Dictionary in CATEGORIES:
		category_list.add_item(cat["label"])
	category_list.select(0)
	category_list.item_selected.connect(_on_category_selected)

	craft_button.pressed.connect(_on_craft_pressed)
	close_button.pressed.connect(close)

	detail_panel.visible = false
	craft_progress.visible = false
	message_label.text = ""

	EventBus.game_state_changed.connect(_on_game_state_changed)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel") and _is_open:
		close()
		get_viewport().set_input_as_handled()

# ---------------------------------------------------------------------------
#  Open / Close
# ---------------------------------------------------------------------------
func open(recipes: Array = []) -> void:
	if _is_open:
		return
	_is_open = true

	_recipes.clear()
	for recipe: Dictionary in recipes:
		_recipes.append(recipe)

	_current_category = "weapons"
	category_list.select(0)
	_selected_recipe = {}
	detail_panel.visible = false
	message_label.text = ""

	_refresh_recipe_list()
	visible = true

	EventBus.game_state_changed.emit(
		ConstantsDef.GameState.VILLAGE, ConstantsDef.GameState.CRAFTING
	)


func close() -> void:
	if not _is_open:
		return
	if _is_crafting:
		return  # Cannot close while crafting

	_is_open = false
	visible = false

	EventBus.game_state_changed.emit(
		ConstantsDef.GameState.CRAFTING, ConstantsDef.GameState.VILLAGE
	)

# ---------------------------------------------------------------------------
#  Category selection
# ---------------------------------------------------------------------------
func _on_category_selected(index: int) -> void:
	if index >= 0 and index < CATEGORIES.size():
		_current_category = CATEGORIES[index]["id"]
		_selected_recipe = {}
		detail_panel.visible = false
		_refresh_recipe_list()

# ---------------------------------------------------------------------------
#  Recipe list
# ---------------------------------------------------------------------------
func _refresh_recipe_list() -> void:
	for child in recipe_list.get_children():
		child.queue_free()

	var filtered: Array[Dictionary] = _get_filtered_recipes()

	if filtered.is_empty():
		var empty_label := Label.new()
		empty_label.text = "No recipes available"
		empty_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
		recipe_list.add_child(empty_label)
		return

	for i in range(filtered.size()):
		var recipe: Dictionary = filtered[i]
		var row: HBoxContainer = _create_recipe_row(recipe)
		recipe_list.add_child(row)


func _get_filtered_recipes() -> Array[Dictionary]:
	var result: Array[Dictionary] = []
	for recipe: Dictionary in _recipes:
		var category: String = recipe.get("category", "")
		if category == _current_category:
			result.append(recipe)
	return result


func _create_recipe_row(recipe: Dictionary) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.custom_minimum_size.y = 36

	# Name
	var name_label := Label.new()
	name_label.text = recipe.get("name", "Unknown Recipe")
	name_label.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	var can_make: bool = can_craft(recipe.get("id", ""))
	if can_make:
		name_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)
	else:
		name_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_DISABLED)
	row.add_child(name_label)

	# Craftable indicator
	var status_label := Label.new()
	if can_make:
		status_label.text = "[Ready]"
		status_label.add_theme_color_override("font_color", UIConstantsDef.SUCCESS)
	else:
		status_label.text = "[Missing]"
		status_label.add_theme_color_override("font_color", UIConstantsDef.DANGER)
	row.add_child(status_label)

	# Select button
	var select_btn := Button.new()
	select_btn.text = "View"
	select_btn.pressed.connect(_on_recipe_selected.bind(recipe))
	row.add_child(select_btn)

	return row

# ---------------------------------------------------------------------------
#  Recipe detail
# ---------------------------------------------------------------------------
func _on_recipe_selected(recipe: Dictionary) -> void:
	_selected_recipe = recipe
	_show_recipe_detail(recipe)


func _show_recipe_detail(recipe: Dictionary) -> void:
	detail_panel.visible = true

	# Recipe name
	recipe_name_label.text = recipe.get("name", "Unknown")
	var rarity: String = recipe.get("result_rarity", "common")
	recipe_name_label.add_theme_color_override(
		"font_color", UIConstantsDef.get_rarity_color(rarity)
	)

	# Result icon
	var icon_path: String = recipe.get("result_icon", "")
	if not icon_path.is_empty() and ResourceLoader.exists(icon_path):
		result_icon.texture = load(icon_path)
	else:
		result_icon.texture = null

	# Result description
	result_description.clear()
	result_description.push_color(UIConstantsDef.TEXT_SECONDARY)
	result_description.add_text(recipe.get("description", ""))
	result_description.pop()

	# Materials required
	_build_materials_display(recipe)

	# Craft button state
	var recipe_id: String = recipe.get("id", "")
	var craftable: bool = can_craft(recipe_id)
	craft_button.disabled = not craftable or _is_crafting
	craft_button.text = "CRAFT" if not _is_crafting else "CRAFTING..."

	craft_progress.visible = false
	message_label.text = ""


func _build_materials_display(recipe: Dictionary) -> void:
	for child in materials_list.get_children():
		child.queue_free()

	var header := Label.new()
	header.text = "Materials Required:"
	header.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
	materials_list.add_child(header)

	var materials: Array = recipe.get("materials", [])
	for mat: Dictionary in materials:
		var mat_row := HBoxContainer.new()

		var mat_name := Label.new()
		mat_name.text = mat.get("name", "Unknown")
		mat_name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		mat_row.add_child(mat_name)

		var need_count: int = mat.get("count", 1)
		var have_count: int = _count_player_material(mat.get("id", ""))

		var count_label := Label.new()
		count_label.text = "%d / %d" % [have_count, need_count]

		if have_count >= need_count:
			count_label.add_theme_color_override("font_color", UIConstantsDef.SUCCESS)
			mat_name.add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)
		else:
			count_label.add_theme_color_override("font_color", UIConstantsDef.DANGER)
			mat_name.add_theme_color_override("font_color", UIConstantsDef.TEXT_DISABLED)

		mat_row.add_child(count_label)
		materials_list.add_child(mat_row)

# ---------------------------------------------------------------------------
#  Craft logic
# ---------------------------------------------------------------------------
func can_craft(recipe_id: String) -> bool:
	var recipe: Dictionary = _find_recipe(recipe_id)
	if recipe.is_empty():
		return false

	var materials: Array = recipe.get("materials", [])
	for mat: Dictionary in materials:
		var need: int = mat.get("count", 1)
		var have: int = _count_player_material(mat.get("id", ""))
		if have < need:
			return false
	return true


func craft_item(recipe_id: String) -> void:
	if _is_crafting:
		return

	if not can_craft(recipe_id):
		_show_message("Missing required materials!", UIConstantsDef.DANGER)
		return

	var recipe: Dictionary = _find_recipe(recipe_id)
	if recipe.is_empty():
		return

	_is_crafting = true
	craft_button.disabled = true
	craft_button.text = "CRAFTING..."

	# Consume materials
	var materials: Array = recipe.get("materials", [])
	for mat: Dictionary in materials:
		_consume_player_material(mat.get("id", ""), mat.get("count", 1))

	# Play crafting animation
	_play_craft_animation(recipe)


func _on_craft_pressed() -> void:
	if _selected_recipe.is_empty():
		return
	craft_item(_selected_recipe.get("id", ""))


func _play_craft_animation(recipe: Dictionary) -> void:
	craft_progress.visible = true
	craft_progress.value = 0.0
	craft_progress.max_value = 100.0

	if _craft_tween:
		_craft_tween.kill()

	_craft_tween = create_tween()
	_craft_tween.tween_property(craft_progress, "value", 100.0, CRAFT_ANIM_DURATION)
	_craft_tween.tween_callback(_on_craft_complete.bind(recipe))


func _on_craft_complete(recipe: Dictionary) -> void:
	_is_crafting = false
	craft_progress.visible = false
	craft_button.text = "CRAFT"

	# Create result item
	var result_item: Dictionary = {
		"id": recipe.get("result_id", "crafted_item"),
		"name": recipe.get("name", "Crafted Item"),
		"type": recipe.get("result_type", "weapon"),
		"rarity": recipe.get("result_rarity", "common"),
		"icon": recipe.get("result_icon", ""),
		"stats": recipe.get("result_stats", {}),
		"description": recipe.get("description", ""),
		"value": recipe.get("result_value", 0),
	}

	# Add to player inventory
	var player: Node = _get_player()
	if player:
		var inventory: Array = player.get("inventory") if player.get("inventory") else []
		inventory.append(result_item)

	_show_message("Crafted %s!" % result_item.get("name", "item"), UIConstantsDef.SUCCESS)
	item_crafted.emit(recipe.get("id", ""), result_item)

	# Refresh to update material counts
	_refresh_recipe_list()
	if not _selected_recipe.is_empty():
		_show_recipe_detail(_selected_recipe)

# ---------------------------------------------------------------------------
#  Material helpers (reads from player inventory)
# ---------------------------------------------------------------------------
func _count_player_material(material_id: String) -> int:
	var player: Node = _get_player()
	if not player:
		return 0
	var inventory: Array = player.get("inventory") if player.get("inventory") else []
	var total: int = 0
	for item: Dictionary in inventory:
		if item.get("id", "") == material_id:
			total += item.get("count", 1)
	return total


func _consume_player_material(material_id: String, amount: int) -> void:
	var player: Node = _get_player()
	if not player:
		return
	var inventory: Array = player.get("inventory") if player.get("inventory") else []
	var remaining: int = amount

	# Remove from end to avoid index shifting issues
	var i: int = inventory.size() - 1
	while i >= 0 and remaining > 0:
		var item: Dictionary = inventory[i]
		if item.get("id", "") == material_id:
			var stack: int = item.get("count", 1)
			if stack <= remaining:
				remaining -= stack
				inventory.remove_at(i)
			else:
				item["count"] = stack - remaining
				remaining = 0
		i -= 1

# ---------------------------------------------------------------------------
#  Utility
# ---------------------------------------------------------------------------
func _find_recipe(recipe_id: String) -> Dictionary:
	for recipe: Dictionary in _recipes:
		if recipe.get("id", "") == recipe_id:
			return recipe
	return {}


func _show_message(text: String, color: Color) -> void:
	message_label.text = text
	message_label.add_theme_color_override("font_color", color)
	var tween := create_tween()
	tween.tween_interval(3.0)
	tween.tween_callback(func() -> void:
		if message_label.text == text:
			message_label.text = ""
	)


func _on_game_state_changed(_old_state: int, new_state: int) -> void:
	if new_state != ConstantsDef.GameState.CRAFTING and _is_open:
		if not _is_crafting:
			close()


func _get_player() -> Node:
	var gm: Node = get_node_or_null("/root/GameManager")
	if gm:
		return gm.get("player")
	return null
