class_name LootPile
extends RefCounted

## Represents a pile of items on the ground

var grid_pos: Vector2i
var items: Array[ItemData] = []
var created_time: float = 0.0
var is_highlighted: bool = false

signal item_taken(item: ItemData)
signal pile_emptied()

func _init():
	created_time = Time.get_unix_time_from_system()

## Get total gold value in pile
func get_gold_amount() -> int:
	var total := 0
	for item in items:
		if item.type == "currency" and item.id == "gold":
			total += item.stack_count
	return total

## Get all non-gold items
func get_items() -> Array[ItemData]:
	var result: Array[ItemData] = []
	for item in items:
		if item.type != "currency":
			result.append(item)
	return result

## Take an item from the pile
func take_item(item: ItemData) -> bool:
	var idx := items.find(item)
	if idx >= 0:
		items.remove_at(idx)
		item_taken.emit(item)

		if items.is_empty():
			pile_emptied.emit()

		return true
	return false

## Take all items from the pile
func take_all() -> Array[ItemData]:
	var taken := items.duplicate()
	items.clear()
	pile_emptied.emit()
	return taken

## Take just the gold from the pile
func take_gold() -> int:
	var total := 0

	for i in range(items.size() - 1, -1, -1):
		var item := items[i]
		if item.type == "currency" and item.id == "gold":
			total += item.stack_count
			items.remove_at(i)
			item_taken.emit(item)

	if items.is_empty():
		pile_emptied.emit()

	return total

## Check if pile contains any items
func is_empty() -> bool:
	return items.is_empty()

## Get display name for pile
func get_display_name() -> String:
	if items.is_empty():
		return "Empty"

	if items.size() == 1:
		return items[0].name

	var gold := get_gold_amount()
	var item_count := items.size() - (1 if gold > 0 else 0)

	if gold > 0 and item_count > 0:
		return "%d Gold + %d items" % [gold, item_count]
	elif gold > 0:
		return "%d Gold" % gold
	else:
		return "%d items" % item_count

## Get the most valuable item in the pile (for display)
func get_primary_item() -> ItemData:
	var best: ItemData = null
	var best_value := -1

	for item in items:
		if item.type == "currency":
			continue

		var value: int = item.rarity * 100 + item.value
		if value > best_value:
			best_value = value
			best = item

	return best
