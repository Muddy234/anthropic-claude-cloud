class_name CraftingSystem
extends BaseSystem
## Recipe-based crafting with quality variation, crafting queue, and station
## requirements. Recipes are unlocked persistently; the queue is session-scoped.

# ---------------------------------------------------------------------------
# Quality tiers
# ---------------------------------------------------------------------------

const QUALITY_STANDARD_CHANCE: float = 0.75
const QUALITY_SUPERIOR_CHANCE: float = 0.20
const QUALITY_MASTERWORK_CHANCE: float = 0.05

const QUALITY_STAT_BONUS: Dictionary = {
	"standard": 0.0,
	"superior": 0.15,
	"masterwork": 0.30,
}

const BASE_SUCCESS_CHANCE: float = 0.80
const SKILL_BONUS_PER_LEVEL: float = 0.02
const MAX_QUEUE_SIZE: int = 5

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

## All known recipes: recipe_id -> CraftingRecipeData
var _recipes: Dictionary = {}

## Currently queued crafts: Array of {recipe_id, time_remaining, total_time}
var _crafting_queue: Array[Dictionary] = []

## Whether player is at a crafting station
var _at_station: bool = false
var _current_station: String = ""  # "forge", "alchemy_table", etc.

# ---------------------------------------------------------------------------
# BaseSystem overrides
# ---------------------------------------------------------------------------

func _init() -> void:
	system_name = "crafting_system"
	priority = 88


func initialize() -> void:
	_load_unlocked_recipes()


func process_system(delta: float) -> void:
	if _crafting_queue.is_empty():
		return
	if not _at_station:
		return

	_update_queue(delta)


func cleanup() -> void:
	# Queue clears on death / run end; recipes persist
	_crafting_queue.clear()
	_at_station = false
	_current_station = ""


func on_state_changed(_old_state: int, new_state: int) -> void:
	# Leave crafting station when state changes away from village/crafting
	if new_state != Constants.GameState.CRAFTING and new_state != Constants.GameState.VILLAGE:
		_at_station = false
		_current_station = ""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Register a CraftingRecipeData resource.
func register_recipe(recipe: CraftingRecipeData) -> void:
	if recipe == null or recipe.id.is_empty():
		return
	_recipes[recipe.id] = recipe


## Check if the player can craft a given recipe.
func can_craft(recipe_id: String) -> bool:
	if not _recipes.has(recipe_id):
		return false
	if _crafting_queue.size() >= MAX_QUEUE_SIZE:
		return false

	var recipe: CraftingRecipeData = _recipes[recipe_id]

	# Check if recipe is unlocked
	if not recipe.unlocked:
		if GameManager.persistent_state == null:
			return false
		if not GameManager.persistent_state.recipes_known.has(recipe_id):
			return false

	# Check station requirement
	if _at_station:
		# Station type check based on recipe category
		var required_station: String = _get_required_station(recipe)
		if not required_station.is_empty() and required_station != _current_station:
			return false
	else:
		return false  # Must be at a crafting station

	# Check gold
	if recipe.gold_cost > 0:
		if GameManager.run_state == null or GameManager.run_state.gold < recipe.gold_cost:
			return false

	# Check materials
	for mat_entry in recipe.materials:
		if not _has_material(mat_entry.material_id, mat_entry.count):
			return false

	return true


## Start crafting a recipe. Returns true on success.
func start_crafting(recipe_id: String) -> bool:
	if not can_craft(recipe_id):
		return false

	var recipe: CraftingRecipeData = _recipes[recipe_id]

	# Consume materials
	for mat_entry in recipe.materials:
		_consume_material(mat_entry.material_id, mat_entry.count)

	# Consume gold
	if recipe.gold_cost > 0 and GameManager.run_state != null:
		GameManager.run_state.gold -= recipe.gold_cost

	# Add to queue
	_crafting_queue.append({
		"recipe_id": recipe_id,
		"time_remaining": recipe.craft_time,
		"total_time": recipe.craft_time,
	})

	return true


## Update crafting queue timers and complete finished crafts.
func _update_queue(delta: float) -> void:
	if _crafting_queue.is_empty():
		return

	var front: Dictionary = _crafting_queue[0]
	front["time_remaining"] -= delta

	if front["time_remaining"] <= 0.0:
		_complete_craft(front)
		_crafting_queue.remove_at(0)


## Get all known recipes.
func get_all_recipes() -> Array[CraftingRecipeData]:
	var result: Array[CraftingRecipeData] = []
	for rid in _recipes:
		result.append(_recipes[rid])
	return result


## Get available (unlocked) recipes.
func get_available_recipes() -> Array[CraftingRecipeData]:
	var result: Array[CraftingRecipeData] = []
	for rid in _recipes:
		var recipe: CraftingRecipeData = _recipes[rid]
		if recipe.unlocked:
			result.append(recipe)
		elif GameManager.persistent_state != null:
			if GameManager.persistent_state.recipes_known.has(rid):
				result.append(recipe)
	return result


## Get the current crafting queue for UI display.
func get_queue() -> Array[Dictionary]:
	return _crafting_queue.duplicate()


## Get queue progress (0.0 to 1.0) for the current item.
func get_current_progress() -> float:
	if _crafting_queue.is_empty():
		return 0.0
	var front: Dictionary = _crafting_queue[0]
	if front["total_time"] <= 0.0:
		return 1.0
	return 1.0 - (front["time_remaining"] / front["total_time"])


## Enter a crafting station.
func enter_station(station_type: String) -> void:
	_at_station = true
	_current_station = station_type


## Leave the crafting station.
func leave_station() -> void:
	_at_station = false
	_current_station = ""


## Unlock a recipe permanently.
func unlock_recipe(recipe_id: String) -> void:
	if GameManager.persistent_state == null:
		return
	if not GameManager.persistent_state.recipes_known.has(recipe_id):
		GameManager.persistent_state.recipes_known.append(recipe_id)


## Check if a recipe is unlocked.
func is_recipe_unlocked(recipe_id: String) -> bool:
	if not _recipes.has(recipe_id):
		return false
	var recipe: CraftingRecipeData = _recipes[recipe_id]
	if recipe.unlocked:
		return true
	if GameManager.persistent_state != null:
		return GameManager.persistent_state.recipes_known.has(recipe_id)
	return false


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _complete_craft(queue_entry: Dictionary) -> void:
	var recipe_id: String = queue_entry["recipe_id"]
	if not _recipes.has(recipe_id):
		return

	var recipe: CraftingRecipeData = _recipes[recipe_id]

	# Roll success
	var success_chance: float = BASE_SUCCESS_CHANCE + _get_skill_bonus(recipe)
	success_chance = clampf(success_chance, 0.1, 1.0)

	if randf() > success_chance:
		# Craft failed -- materials already consumed
		return

	# Roll quality
	var quality: String = _roll_quality()
	var stat_bonus: float = QUALITY_STAT_BONUS.get(quality, 0.0)

	# Create result item
	var result: Dictionary = {
		"item_id": recipe.result_item_id,
		"rarity": recipe.result_rarity,
		"quality": quality,
		"stat_bonus": stat_bonus,
		"crafted": true,
	}

	# Add to player inventory via GameManager
	if GameManager.run_state != null:
		GameManager.run_state.inventory.append(result)


func _roll_quality() -> String:
	var roll: float = randf()
	if roll < QUALITY_MASTERWORK_CHANCE:
		return "masterwork"
	elif roll < QUALITY_MASTERWORK_CHANCE + QUALITY_SUPERIOR_CHANCE:
		return "superior"
	return "standard"


func _get_skill_bonus(recipe: CraftingRecipeData) -> float:
	# Check player skill level for the recipe's category
	if GameManager.persistent_state == null:
		return 0.0

	var skills: Dictionary = GameManager.persistent_state.skills
	var category_key: String = _category_to_skill_key(recipe.category)
	var skill_level: int = skills.get(category_key, 0)
	return float(skill_level) * SKILL_BONUS_PER_LEVEL


func _category_to_skill_key(category: Constants.CraftCategory) -> String:
	match category:
		Constants.CraftCategory.WEAPONS:
			return "smithing"
		Constants.CraftCategory.ARMOR:
			return "smithing"
		Constants.CraftCategory.CONSUMABLES:
			return "alchemy"
		Constants.CraftCategory.UPGRADES:
			return "enchanting"
		Constants.CraftCategory.SPECIAL:
			return "enchanting"
	return "crafting"


func _get_required_station(recipe: CraftingRecipeData) -> String:
	match recipe.category:
		Constants.CraftCategory.WEAPONS, Constants.CraftCategory.ARMOR:
			return "forge"
		Constants.CraftCategory.CONSUMABLES:
			return "alchemy_table"
		Constants.CraftCategory.UPGRADES, Constants.CraftCategory.SPECIAL:
			return "enchanting_table"
	return ""


func _has_material(material_id: String, count: int) -> bool:
	if GameManager.run_state == null:
		return false
	var found: int = 0
	for item in GameManager.run_state.inventory:
		if item is Dictionary:
			if item.get("item_id", "") == material_id or item.get("material_id", "") == material_id:
				found += item.get("quantity", 1)
		elif item is Resource and "id" in item:
			if item.id == material_id:
				found += 1
	return found >= count


func _consume_material(material_id: String, count: int) -> void:
	if GameManager.run_state == null:
		return
	var remaining: int = count
	var to_remove: Array[int] = []

	for i in GameManager.run_state.inventory.size():
		if remaining <= 0:
			break
		var item = GameManager.run_state.inventory[i]
		var matches: bool = false
		if item is Dictionary:
			matches = item.get("item_id", "") == material_id or item.get("material_id", "") == material_id
		elif item is Resource and "id" in item:
			matches = item.id == material_id

		if matches:
			var qty: int = 1
			if item is Dictionary:
				qty = item.get("quantity", 1)
			if qty <= remaining:
				remaining -= qty
				to_remove.append(i)
			else:
				if item is Dictionary:
					item["quantity"] = qty - remaining
				remaining = 0

	# Remove consumed stacks (reverse order to preserve indices)
	to_remove.reverse()
	for idx in to_remove:
		GameManager.run_state.inventory.remove_at(idx)


func _load_unlocked_recipes() -> void:
	# Recipes are registered externally; this just ensures unlocked state is synced
	pass
