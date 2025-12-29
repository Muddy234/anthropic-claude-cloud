class_name LootSystem
extends Node

## Handles loot generation, drops, and item spawning

# Rarity weights (higher = more common)
const RARITY_WEIGHTS := {
	1: 100,  # Common
	2: 50,   # Uncommon
	3: 20,   # Rare
	4: 5,    # Epic
	5: 1     # Legendary
}

# Floor-based rarity modifiers
const FLOOR_RARITY_BONUS := 0.1  # +10% better rarity per floor

signal item_dropped(item: ItemData, position: Vector2i)
signal loot_pile_created(pile: LootPile, position: Vector2i)

## Roll loot from a loot table
func roll_loot(loot_table: LootTableData, luck_bonus: float = 0.0) -> Array[ItemData]:
	var items: Array[ItemData] = []

	if not loot_table:
		return items

	# Guaranteed drops
	for entry in loot_table.guaranteed_drops:
		var item := _create_item(entry.item_id, entry.get("count", 1))
		if item:
			items.append(item)

	# Random drops
	for entry in loot_table.random_drops:
		var drop_chance: float = entry.chance + luck_bonus
		if randf() < drop_chance:
			var item := _create_item(entry.item_id, entry.get("count", 1))
			if item:
				items.append(item)

	# Roll additional items from pool
	var pool_rolls: int = loot_table.pool_rolls + int(luck_bonus * 2)
	for _i in pool_rolls:
		var entry := _roll_pool_entry(loot_table.item_pool, luck_bonus)
		if entry:
			var item := _create_item(entry.item_id, entry.get("count", 1))
			if item:
				items.append(item)

	# Gold drop
	if loot_table.gold_min > 0 or loot_table.gold_max > 0:
		var gold := randi_range(loot_table.gold_min, loot_table.gold_max)
		gold = int(gold * (1.0 + luck_bonus))
		if gold > 0:
			var gold_item := _create_gold(gold)
			items.append(gold_item)

	return items

## Roll loot from an enemy
func roll_enemy_loot(enemy: Enemy) -> Array[ItemData]:
	if not enemy.monster_data:
		return []

	var loot_table: LootTableData = enemy.monster_data.loot_table
	if not loot_table:
		# Use tier-based fallback
		loot_table = _get_tier_loot_table(enemy.monster_data.tier)

	# Calculate luck bonus from player
	var luck_bonus := 0.0
	if GameManager.player:
		luck_bonus = GameManager.player.get_luck_bonus()

	return roll_loot(loot_table, luck_bonus)

## Create a loot pile at a position
func spawn_loot_pile(items: Array[ItemData], position: Vector2i) -> LootPile:
	if items.is_empty():
		return null

	var pile := LootPile.new()
	pile.grid_pos = position
	pile.items = items

	GameManager.loot_piles.append(pile)
	loot_pile_created.emit(pile, position)

	return pile

## Spawn loot from an enemy death
func spawn_enemy_loot(enemy: Enemy):
	var items := roll_enemy_loot(enemy)

	if items.is_empty():
		return

	spawn_loot_pile(items, enemy.grid_pos)

## Generate a random item of specified rarity
func generate_random_item(rarity: int = -1, item_type: String = "") -> ItemData:
	if rarity < 0:
		rarity = _roll_rarity()

	# Get all items matching criteria
	var candidates: Array[ItemData] = []

	# TODO: Load items from resources folder
	# For now, return null
	return null

## Roll item rarity
func _roll_rarity(luck_bonus: float = 0.0) -> int:
	var total_weight := 0.0

	for rarity in RARITY_WEIGHTS:
		var weight: float = RARITY_WEIGHTS[rarity]
		# Luck increases chance of higher rarities
		if rarity > 1:
			weight *= (1.0 + luck_bonus)
		total_weight += weight

	var roll := randf() * total_weight
	var cumulative := 0.0

	for rarity in RARITY_WEIGHTS:
		var weight: float = RARITY_WEIGHTS[rarity]
		if rarity > 1:
			weight *= (1.0 + luck_bonus)
		cumulative += weight

		if roll <= cumulative:
			return rarity

	return 1  # Default to common

func _roll_pool_entry(pool: Array, luck_bonus: float) -> Dictionary:
	if pool.is_empty():
		return {}

	var total_weight := 0.0
	for entry in pool:
		var weight: float = entry.get("weight", 1.0)
		weight *= (1.0 + luck_bonus * 0.5)
		total_weight += weight

	var roll := randf() * total_weight
	var cumulative := 0.0

	for entry in pool:
		var weight: float = entry.get("weight", 1.0)
		weight *= (1.0 + luck_bonus * 0.5)
		cumulative += weight

		if roll <= cumulative:
			return entry

	return pool[0] if not pool.is_empty() else {}

func _create_item(item_id: String, count: int = 1) -> ItemData:
	# Load item from resources
	var path := "res://resources/items/%s.tres" % item_id

	if ResourceLoader.exists(path):
		var item := load(path) as ItemData
		if item:
			var instance := item.duplicate() as ItemData
			instance.stack_count = count
			return instance

	push_warning("Item not found: " + item_id)
	return null

func _create_gold(amount: int) -> ItemData:
	var gold := ItemData.new()
	gold.id = "gold"
	gold.name = "Gold"
	gold.type = "currency"
	gold.stack_count = amount
	gold.value = amount
	return gold

func _get_tier_loot_table(tier: Constants.MonsterTier) -> LootTableData:
	var table := LootTableData.new()

	match tier:
		Constants.MonsterTier.TIER_3:
			table.gold_min = 1
			table.gold_max = 5
			table.pool_rolls = 0

		Constants.MonsterTier.TIER_2:
			table.gold_min = 3
			table.gold_max = 10
			table.pool_rolls = 1

		Constants.MonsterTier.TIER_1:
			table.gold_min = 8
			table.gold_max = 20
			table.pool_rolls = 1

		Constants.MonsterTier.ELITE:
			table.gold_min = 20
			table.gold_max = 50
			table.pool_rolls = 2

		Constants.MonsterTier.BOSS:
			table.gold_min = 100
			table.gold_max = 250
			table.pool_rolls = 3

	return table
