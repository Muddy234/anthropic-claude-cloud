class_name CraftingRecipeData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""

@export_group("Classification")
@export var category: Constants.CraftCategory = Constants.CraftCategory.WEAPONS
@export var tier: int = 1

@export_group("Requirements")
@export var materials: Array[CraftingMaterialEntry] = []
@export var gold_cost: int = 0
@export var craft_time: float = 2.0           # Seconds

@export_group("Result")
@export var result_item_id: String = ""       # ID of the item produced
@export var result_type: String = ""          # 'weapon', 'armor', 'consumable'
@export var result_rarity: Constants.Rarity = Constants.Rarity.UNCOMMON

@export_group("Availability")
@export var unlocked: bool = true             # Available from start?
@export var required_quest: String = ""       # Quest that unlocks this
