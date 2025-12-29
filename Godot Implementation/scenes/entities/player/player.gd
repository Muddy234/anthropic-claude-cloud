class_name Player
extends Entity

## Player entity with input handling, inventory, and progression

# Stats
var stats: Dictionary = {
	"STR": 10,
	"DEX": 10,
	"INT": 10,
	"WIS": 10,
	"CON": 10
}

# Equipment slots
var equipment: Dictionary = {
	"main_hand": null,
	"off_hand": null,
	"head": null,
	"body": null,
	"boots": null,
	"accessory_1": null,
	"accessory_2": null
}

# Inventory
var inventory: Array[ItemData] = []
const MAX_INVENTORY := 20

# Skills
var learned_skills: Array[SkillData] = []
var active_skills: Array[SkillData] = []  # Hotbar (max 8)
var skill_cooldowns: Dictionary = {}  # skill_id -> turns remaining
var skill_charges: Dictionary = {}  # skill_id -> charges remaining

# Progression
var gold: int = 0
var xp: int = 0
var level: int = 1
var available_skill_points: int = 0
var allocated_skills: Dictionary = {}  # skill_tree_id -> points spent

# Resources
var mp: int = 50
var max_mp: int = 50
var mana_regen: float = 1.0  # Per second

# GCD (Global Cooldown)
var gcd_active: bool = false
var gcd_remaining: float = 0.0
const GCD_DURATION := 0.5

# Signals
signal xp_gained(amount: int)
signal level_up(new_level: int)
signal gold_changed(new_amount: int)
signal item_acquired(item: ItemData)
signal item_used(item: ItemData)
signal equipment_changed(slot: String, item: ItemData)
signal skill_learned(skill: SkillData)
signal mp_changed(current: int, maximum: int)

func _ready():
	super._ready()
	add_to_group("player")
	GameManager.player = self
	died.connect(_on_died)

	# Initialize MP
	mp = max_mp

func _unhandled_input(event: InputEvent):
	if not GameManager.is_player_turn:
		return

	if GameManager.current_state != Constants.GameState.PLAYING:
		return

	if not can_act():
		return

	# Movement
	var direction := Vector2i.ZERO

	if event.is_action_pressed("move_up"):
		direction = Vector2i.UP
	elif event.is_action_pressed("move_down"):
		direction = Vector2i.DOWN
	elif event.is_action_pressed("move_left"):
		direction = Vector2i.LEFT
	elif event.is_action_pressed("move_right"):
		direction = Vector2i.RIGHT

	if direction != Vector2i.ZERO:
		_try_move(direction)
		get_viewport().set_input_as_handled()
		return

	# Skill hotkeys (1-8)
	for i in range(8):
		if event.is_action_pressed("skill_%d" % (i + 1)):
			_try_use_skill(i)
			get_viewport().set_input_as_handled()
			return

	# Interact
	if event.is_action_pressed("interact"):
		_try_interact()
		get_viewport().set_input_as_handled()

func _process(delta: float):
	super._process(delta)

	# Mana regeneration
	if mp < max_mp:
		mp = mini(max_mp, mp + int(mana_regen * delta))

	# GCD
	if gcd_active:
		gcd_remaining -= delta
		if gcd_remaining <= 0:
			gcd_active = false

## Try to move in a direction
func _try_move(direction: Vector2i):
	if not can_move():
		return

	var target_pos := grid_pos + direction
	face_direction(direction)

	# Check for enemy at target
	var entity := GameManager.get_entity_at(target_pos)
	if entity is Enemy:
		_attack_enemy(entity)
		return

	# Check for NPC
	if entity and entity.is_in_group("npcs"):
		_interact_with_npc(entity)
		return

	# Check for walkable tile
	if GameManager.is_walkable(target_pos):
		grid_pos = target_pos
		_check_tile_interactions()
		_end_turn()

## Attack an enemy
func _attack_enemy(enemy: Enemy):
	var result := GameManager.combat_system.perform_attack(self, enemy)
	_check_effect_breaks("attack")
	_end_turn()

## Try to interact with adjacent tiles/entities
func _try_interact():
	var interact_pos := grid_pos + Constants.DIRECTIONS[facing]

	# Check for NPC
	var entity := GameManager.get_entity_at(interact_pos)
	if entity and entity.is_in_group("npcs"):
		_interact_with_npc(entity)
		return

	# Check for loot
	var loot := GameManager.get_loot_at(grid_pos)
	if loot:
		_pickup_loot(loot)
		return

	# Check for stairs
	if GameManager.dungeon:
		var tile_type := GameManager.dungeon.get_tile_type(grid_pos)
		if tile_type == Constants.TileType.STAIRS_DOWN:
			GameManager.descend_floor()
		elif tile_type == Constants.TileType.STAIRS_UP:
			GameManager.ascend_floor()

## Check interactions at current tile
func _check_tile_interactions():
	# Auto-pickup gold
	if GameManager.settings.auto_pickup_gold:
		var loot := GameManager.get_loot_at(grid_pos)
		if loot:
			var gold_amount := loot.take_gold()
			if gold_amount > 0:
				add_gold(gold_amount)

## Try to use a skill from hotbar
func _try_use_skill(slot_index: int):
	if slot_index >= active_skills.size():
		return

	var skill := active_skills[slot_index]
	if not skill:
		return

	var can_use := skill.can_use(self)
	if not can_use.can_use:
		EventBus.show_notification.emit(can_use.reason, "error")
		return

	# Check GCD
	if skill.triggers_gcd and gcd_active:
		EventBus.show_notification.emit("On cooldown", "error")
		return

	# TODO: Target selection for targeted skills
	# For now, use on self or nearest enemy
	var target = self if skill.target_type == "self" else _get_nearest_enemy()

	if skill.target_type != "self" and not target:
		EventBus.show_notification.emit("No target", "error")
		return

	_use_skill(skill, target)

## Use a skill
func _use_skill(skill: SkillData, target):
	# Deduct costs
	mp -= skill.mp_cost
	current_hp -= skill.hp_cost
	mp_changed.emit(mp, max_mp)

	# Set cooldown
	if skill.cooldown > 0:
		skill_cooldowns[skill.id] = skill.cooldown

	# Trigger GCD
	if skill.triggers_gcd:
		gcd_active = true
		gcd_remaining = GCD_DURATION

	# Execute skill
	GameManager.combat_system.execute_skill(self, skill, target)

	_end_turn()

## Interact with NPC
func _interact_with_npc(npc):
	EventBus.npc_interacted.emit(npc)

## Pickup loot
func _pickup_loot(loot):
	var items := loot.take_all()

	for item in items:
		if item.type == "currency" and item.id == "gold":
			add_gold(item.stack_count)
		else:
			if add_item(item):
				item_acquired.emit(item)
			else:
				# Inventory full, put it back
				loot.items.append(item)
				EventBus.show_notification.emit("Inventory full!", "error")
				break

	# Remove empty loot pile
	if loot.is_empty():
		GameManager.loot_piles.erase(loot)

## End player turn
func _end_turn():
	process_status_effects(GameManager.turn_delta)
	_tick_cooldowns()
	GameManager.end_player_turn()

## Tick skill cooldowns
func _tick_cooldowns():
	for skill_id in skill_cooldowns.keys():
		skill_cooldowns[skill_id] -= 1
		if skill_cooldowns[skill_id] <= 0:
			skill_cooldowns.erase(skill_id)

## Get nearest enemy
func _get_nearest_enemy() -> Enemy:
	var nearest: Enemy = null
	var nearest_dist := INF

	for enemy in GameManager.enemies:
		if not is_instance_valid(enemy) or enemy.current_hp <= 0:
			continue

		var dist := grid_pos.distance_to(Vector2(enemy.grid_pos))
		if dist < nearest_dist:
			nearest_dist = dist
			nearest = enemy

	return nearest

# === INVENTORY METHODS ===

## Add an item to inventory
func add_item(item: ItemData) -> bool:
	# Check for stackable items
	if item.is_stackable:
		for existing in inventory:
			if existing.id == item.id and existing.stack_count < existing.max_stack:
				var space := existing.max_stack - existing.stack_count
				var to_add := mini(space, item.stack_count)
				existing.stack_count += to_add
				item.stack_count -= to_add
				if item.stack_count <= 0:
					return true

	# Add as new item
	if inventory.size() < MAX_INVENTORY:
		inventory.append(item)
		return true

	return false

## Remove an item from inventory
func remove_item(item: ItemData) -> bool:
	var idx := inventory.find(item)
	if idx >= 0:
		inventory.remove_at(idx)
		return true
	return false

## Use an item
func use_item(item: ItemData) -> bool:
	if item.type != "consumable":
		return false

	# Apply effects
	if item.heal_amount > 0:
		heal(item.heal_amount)
	if item.mana_restore > 0:
		mp = mini(max_mp, mp + item.mana_restore)
		mp_changed.emit(mp, max_mp)
	if item.buff_effect:
		var effect := item.buff_effect.create_instance(self)
		apply_status(effect)

	# Remove or reduce stack
	if item.is_stackable:
		item.stack_count -= 1
		if item.stack_count <= 0:
			remove_item(item)
	else:
		remove_item(item)

	item_used.emit(item)
	return true

## Equip an item
func equip_item(item: ItemData, slot: String) -> ItemData:
	var old_item: ItemData = equipment[slot]
	equipment[slot] = item
	remove_item(item)

	if old_item:
		add_item(old_item)

	_recalculate_equipment_stats()
	equipment_changed.emit(slot, item)

	return old_item

## Unequip an item
func unequip_item(slot: String) -> bool:
	var item: ItemData = equipment[slot]
	if not item:
		return false

	if inventory.size() >= MAX_INVENTORY:
		return false

	equipment[slot] = null
	add_item(item)
	_recalculate_equipment_stats()
	equipment_changed.emit(slot, null)

	return true

## Get equipped weapon
func get_equipped_weapon() -> ItemData:
	return equipment["main_hand"]

## Recalculate stats from equipment
func _recalculate_equipment_stats():
	# Clear equipment modifiers
	for stat in stat_modifiers.keys():
		stat_modifiers[stat] = stat_modifiers[stat].filter(func(v): return not v is Dictionary or not v.get("from_equipment"))

	# Apply equipment bonuses
	for slot in equipment:
		var item: ItemData = equipment[slot]
		if not item:
			continue

		for stat in item.stat_bonuses:
			add_stat_modifier(stat, item.stat_bonuses[stat])

# === PROGRESSION METHODS ===

## Add gold
func add_gold(amount: int):
	gold += amount
	gold_changed.emit(gold)
	GameManager.add_stat("gold_collected", amount)

## Spend gold
func spend_gold(amount: int) -> bool:
	if gold < amount:
		return false
	gold -= amount
	gold_changed.emit(gold)
	return true

## Gain XP
func gain_xp(amount: int):
	xp += amount
	xp_gained.emit(amount)
	_check_level_up()

## Check for level up
func _check_level_up():
	var xp_needed := _xp_for_level(level + 1)
	while xp >= xp_needed:
		xp -= xp_needed
		level += 1
		available_skill_points += 1
		_apply_level_up_stats()
		level_up.emit(level)
		xp_needed = _xp_for_level(level + 1)

## XP required for a level
func _xp_for_level(lvl: int) -> int:
	return int(100 * pow(lvl, 1.5))

## Apply stat increases on level up
func _apply_level_up_stats():
	max_hp += 10
	current_hp = max_hp
	max_mp += 5
	mp = max_mp
	attack += 2
	defense += 1

## Get luck bonus for loot
func get_luck_bonus() -> float:
	return stats.get("LCK", 0) * 0.01

## Handle death
func _on_died():
	GameManager.game_over()

## Override crit chance
func get_crit_chance() -> float:
	var base := 0.05
	base += stats.get("DEX", 0) * 0.005

	var weapon := get_equipped_weapon()
	if weapon:
		base += weapon.crit_bonus

	# Add from passives
	for skill in learned_skills:
		if skill.is_passive:
			base += skill.passive_bonuses.get("crit_chance", 0.0)

	return clampf(base, 0.0, 0.75)

## Get all resistances from equipment
func get_resistances() -> Dictionary:
	var resistances := {}

	for slot in equipment:
		var item: ItemData = equipment[slot]
		if not item:
			continue

		for res_type in item.resistances:
			if not resistances.has(res_type):
				resistances[res_type] = 0.0
			resistances[res_type] += item.resistances[res_type]

	return resistances
