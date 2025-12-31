@tool
class_name LootTableData
extends Resource

## Defines a loot table for enemies, chests, etc.

@export var id: String

@export_group("Gold")
@export var gold_min: int = 0
@export var gold_max: int = 0

@export_group("Guaranteed Drops")
## Items that always drop
@export var guaranteed_drops: Array[Dictionary] = []
# Format: { "item_id": "sword_iron", "count": 1 }

@export_group("Random Drops")
## Items with a chance to drop
@export var random_drops: Array[Dictionary] = []
# Format: { "item_id": "potion_health", "chance": 0.25, "count": 1 }

@export_group("Item Pool")
## Number of times to roll the item pool
@export var pool_rolls: int = 1

## Weighted pool of possible items
@export var item_pool: Array[Dictionary] = []
# Format: { "item_id": "material_bone", "weight": 10, "count": 1 }

@export_group("Modifiers")
## Rarity modifier (-1 = worse, 0 = normal, +1 = better)
@export_range(-2, 2) var rarity_modifier: int = 0

## Whether this table can drop equipment
@export var can_drop_equipment: bool = true

## Minimum player level for this loot table
@export var min_level: int = 1

## Add a guaranteed drop
func add_guaranteed(item_id: String, count: int = 1):
	guaranteed_drops.append({
		"item_id": item_id,
		"count": count
	})

## Add a random drop with chance
func add_random(item_id: String, chance: float, count: int = 1):
	random_drops.append({
		"item_id": item_id,
		"chance": chance,
		"count": count
	})

## Add an item to the pool
func add_to_pool(item_id: String, weight: float, count: int = 1):
	item_pool.append({
		"item_id": item_id,
		"weight": weight,
		"count": count
	})
