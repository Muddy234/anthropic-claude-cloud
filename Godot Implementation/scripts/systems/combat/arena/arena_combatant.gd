class_name ArenaCombatant
extends RefCounted

## Wrapper for entities participating in arena combat
## Provides combat-specific state while preserving the original entity

signal died()
signal exhausted()
signal overloaded()

var entity: Node  # The underlying Player or Enemy node
var resources: CombatResources
var action_queue: ActionQueue
var is_player: bool = false

# Combat state
var arena_position: Vector2i = Vector2i.ZERO
var is_alive: bool = true
var last_turn_moved: bool = false  # Tracks if movement occurred (for UI/anims)

func _init(p_entity: Node) -> void:
	entity = p_entity
	is_player = p_entity.is_in_group("player") or p_entity.get_class() == "Player"

	resources = CombatResources.new()
	action_queue = ActionQueue.new(entity, resources)

	# Connect resource signals
	resources.exhausted_triggered.connect(_on_exhausted_triggered)

## Initialize for combat start
func setup() -> void:
	resources.reset()
	action_queue.clear()
	is_alive = true
	last_turn_moved = false

## Called at start of each turn (upkeep phase)
func process_upkeep() -> void:
	resources.process_upkeep()

## Called at end of each turn
func end_turn() -> void:
	# Track if movement occurred before clearing
	last_turn_moved = action_queue.had_moves_this_turn()
	# Clear without refunding - actions have been executed
	action_queue.clear_without_refund()
	# Clear exhaustion at end of turn (after attacks were blocked)
	resources.clear_exhaustion()

func _on_exhausted_triggered() -> void:
	exhausted.emit()
	overloaded.emit()

## Get current HP
func get_hp() -> int:
	if not entity or not is_instance_valid(entity):
		return 0
	if entity.has_method("get") and entity.get("current_hp") != null:
		return entity.current_hp
	if "current_hp" in entity:
		return entity.current_hp
	if "hp" in entity:
		return entity.hp
	return 0

## Get max HP
func get_max_hp() -> int:
	if not entity or not is_instance_valid(entity):
		return 100
	if "max_hp" in entity:
		return entity.max_hp
	return 100

## Get a stat from the entity
func get_stat(stat_name: String) -> int:
	if not entity or not is_instance_valid(entity):
		return 0
	if entity.has_method("get_stat"):
		return entity.get_stat(stat_name)
	return 0

## Get weapon range
func get_weapon_range() -> int:
	if not entity or not is_instance_valid(entity):
		return 1
	if entity.has_method("get_weapon_range"):
		return entity.get_weapon_range()
	# Default melee range
	return 1

## Take damage
func take_damage(amount: int, source: Node = null) -> void:
	if entity.has_method("take_damage"):
		entity.take_damage(amount, source)
	elif "current_hp" in entity:
		entity.current_hp = maxi(0, entity.current_hp - amount)

	if get_hp() <= 0:
		is_alive = false
		died.emit()
		EventBus.arena_combatant_died.emit(entity)

## Heal
func heal(amount: int) -> void:
	if entity.has_method("heal"):
		entity.heal(amount)
	elif "current_hp" in entity and "max_hp" in entity:
		entity.current_hp = mini(entity.current_hp + amount, entity.max_hp)

## Restore mana
func restore_mana(amount: int) -> void:
	if entity.has_method("restore_mana"):
		entity.restore_mana(amount)

## Apply a status effect
func apply_status(effect: Node) -> void:
	if entity.has_method("apply_status"):
		entity.apply_status(effect)

## Queue a move action
func queue_move(target_pos: Vector2i) -> bool:
	var move_number := action_queue.get_move_count()
	var action := MoveAction.new(entity, target_pos, move_number)
	return action_queue.queue_action(action)

## Queue a light attack
func queue_light_attack(target_pos: Vector2i) -> bool:
	var action := AttackAction.new(entity, target_pos, false)
	return action_queue.queue_action(action)

## Queue a heavy attack
func queue_heavy_attack(target_pos: Vector2i) -> bool:
	var action := AttackAction.new(entity, target_pos, true)
	return action_queue.queue_action(action)

## Queue a pattern attack (multi-tile heavy attack)
func queue_pattern_attack(source_pos: Vector2i, pattern: Constants.HeavyAttackPattern) -> bool:
	var action := PatternAttackAction.new(entity, source_pos, pattern)
	return action_queue.queue_action(action)

## Queue an item use
func queue_item(target_pos: Vector2i, item: Resource) -> bool:
	var action := ItemAction.new(entity, target_pos, item)
	return action_queue.queue_action(action)

## Undo last queued action
func undo_action() -> CombatAction:
	return action_queue.undo_last()

## Clear all queued actions
func clear_actions() -> void:
	action_queue.clear()

## Get all queued actions
func get_queued_actions() -> Array[CombatAction]:
	return action_queue.get_actions()

## Get stamina
func get_current_stamina() -> int:
	return resources.current_stamina

func get_max_stamina() -> int:
	return resources.max_stamina

## Get strain
func get_current_strain() -> float:
	return resources.current_strain

func get_strain_percentage() -> float:
	return resources.get_strain_percentage()

func is_exhausted() -> bool:
	return resources.is_exhausted

func is_overloaded() -> bool:
	return resources.is_overloaded()

## Check if can afford movement
func can_afford_move(distance: int) -> bool:
	return resources.can_afford_move(distance)

## Check if can attack (not exhausted)
func can_attack() -> bool:
	return resources.can_attack()

## Get predicted position after all queued moves
func get_predicted_position(grid: ArenaGrid) -> Vector2i:
	if not entity or not is_instance_valid(entity):
		return Vector2i(-1, -1)
	var current := grid.get_combatant_position(entity)
	return action_queue.get_predicted_position(current)

## Get display name
func get_display_name() -> String:
	if entity and is_instance_valid(entity) and "entity_name" in entity:
		return entity.entity_name
	if is_player:
		return "Player"
	return "Enemy"
