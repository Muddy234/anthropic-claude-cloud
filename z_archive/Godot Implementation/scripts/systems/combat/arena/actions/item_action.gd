class_name ItemAction
extends CombatAction

## Item usage action in arena combat

var item: Resource  # The ItemData resource being used

func _init(p_source: Node, p_target: Vector2i, p_item: Resource = null) -> void:
	super(p_source, p_target)
	action_type = Constants.CombatActionType.ITEM
	priority = Constants.PRIORITY_MEDIUM
	pip_cost = Constants.ITEM_COST
	item = p_item

func get_display_name() -> String:
	if item and item.has_method("get_name"):
		return "Use " + item.get_name()
	elif item and "name" in item:
		return "Use " + item.name
	return "Use Item"

func get_icon_path() -> String:
	if item and "icon" in item and item.icon:
		return item.icon.resource_path
	return "res://assets/ui/icons/item.png"

func is_valid(grid: ArenaGrid) -> bool:
	if not super.is_valid(grid):
		return false

	# Check source is still valid
	if not source or not is_instance_valid(source):
		return false

	# Must have an item to use
	if not item:
		return false

	# Item must be usable
	if item.has_method("is_usable") and not item.is_usable():
		return false

	return true

func execute(grid: ArenaGrid, resolver: RefCounted) -> Dictionary:
	if not source or not is_instance_valid(source):
		return {"success": false, "action_type": action_type, "message": "Source no longer valid"}
	var source_pos: Vector2i = grid.get_combatant_position(source)

	if not item:
		return {
			"success": false,
			"action_type": action_type,
			"message": "No item to use"
		}

	# Determine target (self or other combatant at position)
	var target := source
	if target_position != source_pos:
		var combatant_at_target := grid.get_combatant_at(target_position)
		if combatant_at_target:
			target = combatant_at_target

	# Use the item
	var result := _use_item(target)

	return {
		"success": result.success,
		"action_type": action_type,
		"item": item,
		"target": target,
		"effect": result.get("effect", ""),
		"message": result.get("message", "Used item")
	}

func _use_item(target: Node) -> Dictionary:
	# Check if item has a use method
	if item.has_method("use"):
		return item.use(source, target)

	# Handle common consumable types
	if "item_type" in item:
		match item.item_type:
			Constants.ItemType.CONSUMABLE:
				return _use_consumable(target)

	return {"success": false, "message": "Item cannot be used"}

func _use_consumable(target: Node) -> Dictionary:
	# Check for healing effect
	if "heal_amount" in item and item.heal_amount > 0:
		if target.has_method("heal"):
			target.heal(item.heal_amount)
			# Get target position for popup
			var target_pos := Vector2i(-1, -1)
			if "grid_pos" in target:
				target_pos = target.grid_pos
			EventBus.arena_combatant_healed.emit(target, target_pos, item.heal_amount)
			return {
				"success": true,
				"effect": "heal",
				"amount": item.heal_amount,
				"message": "Healed for %d HP" % item.heal_amount
			}

	# Check for mana restore
	if "mana_amount" in item and item.mana_amount > 0:
		if target.has_method("restore_mana"):
			target.restore_mana(item.mana_amount)
			return {
				"success": true,
				"effect": "mana",
				"amount": item.mana_amount,
				"message": "Restored %d MP" % item.mana_amount
			}

	# Check for buff effect
	if "buff_effect" in item and item.buff_effect:
		if target.has_method("apply_status"):
			target.apply_status(item.buff_effect)
			return {
				"success": true,
				"effect": "buff",
				"message": "Applied %s" % item.buff_effect.name
			}

	return {"success": false, "message": "Unknown consumable effect"}
