class_name Player
extends Entity

## Player entity with input handling, inventory, and progression

# Animation references
@onready var sprite: Sprite2D = $Sprite2D
@onready var anim_player: AnimationPlayer = $AnimationPlayer

# Animation frame mapping (5 columns x 12 rows sprite sheet)
# Row 0: walk_down (frames 0-4)
const ANIM_FRAMES := {
	"walk_down": [0, 1, 2, 3, 4],
	"walk_up": [5, 6, 7, 8, 9],
	"walk_right": [10, 11, 12, 13, 14],
	"walk_left": [15, 16, 17, 18, 19],
	"idle_down": [0],
	"idle_up": [5],
	"idle_right": [10],
	"idle_left": [15],
}

# Current animation state
var current_anim: String = "idle_down"
var anim_frame_index: int = 0
var anim_timer: float = 0.0
const ANIM_SPEED := 0.15  # Seconds per frame

# Walk animation duration (plays once then returns to idle)
var walk_anim_timer: float = 0.0
const WALK_ANIM_DURATION := 0.3  # How long walk animation plays before returning to idle
var is_walking: bool = false

# Smooth velocity-based movement
var velocity: Vector2 = Vector2.ZERO
const ACCELERATION := 1200.0  # Pixels per second squared (fast startup)
const DECELERATION := 1500.0  # Pixels per second squared (quick stop, less floaty)
const MAX_SPEED := 72.0       # Maximum pixels per second (4.5 tiles/sec at 16px tiles)

# Collision margin - smaller than visual sprite to allow corridor movement
# With 16x16 tiles, player center is at 8,8 in tile. Use small margin for wall detection.
const COLLISION_MARGIN := 4.0

# Continuous movement when key held
var is_move_key_held: bool = false
var held_direction: Vector2i = Vector2i.ZERO
var pending_grid_move: bool = false  # Whether we have a grid move queued

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

# Turn state guard - prevents multiple _end_turn calls from stacking
var _is_ending_turn: bool = false

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

	# Connect internal signals to EventBus for HUD updates
	hp_changed.connect(_on_hp_changed_emit_eventbus)
	mp_changed.connect(_on_mp_changed_emit_eventbus)
	gold_changed.connect(_on_gold_changed_emit_eventbus)
	xp_gained.connect(_on_xp_gained_emit_eventbus)
	level_up.connect(_on_level_up_emit_eventbus)
	position_changed.connect(_on_position_changed_emit_eventbus)

	# Initialize MP
	mp = max_mp

	# Emit initial state to HUD after a frame (so HUD is ready)
	call_deferred("_emit_initial_state")

## Emit initial state to HUD
func _emit_initial_state():
	EventBus.player_hp_changed.emit(current_hp, max_hp, 0)
	EventBus.player_mana_changed.emit(mp, max_mp, 0)
	EventBus.gold_changed.emit(gold, 0)
	EventBus.player_xp_gained.emit(0, xp, _xp_for_level(level + 1))

## EventBus bridge signals
func _on_hp_changed_emit_eventbus(current: int, maximum: int):
	var change := current - (maximum - (maximum - current))  # Approximate change
	EventBus.player_hp_changed.emit(current, maximum, 0)

func _on_mp_changed_emit_eventbus(current: int, maximum: int):
	EventBus.player_mana_changed.emit(current, maximum, 0)

func _on_gold_changed_emit_eventbus(new_amount: int):
	EventBus.gold_changed.emit(new_amount, 0)

func _on_xp_gained_emit_eventbus(amount: int):
	EventBus.player_xp_gained.emit(amount, xp, _xp_for_level(level + 1))

func _on_level_up_emit_eventbus(new_level: int):
	EventBus.player_leveled_up.emit(new_level)

func _on_position_changed_emit_eventbus(from: Vector2i, to: Vector2i):
	EventBus.player_moved.emit(from, to)

func _unhandled_input(event: InputEvent):
	if not GameManager.is_player_turn:
		return

	if GameManager.current_state != Constants.GameState.PLAYING:
		return

	if not can_act():
		return

	# Movement key pressed - start held movement
	if event.is_action_pressed("move_up") or event.is_action_pressed("move_down") or \
	   event.is_action_pressed("move_left") or event.is_action_pressed("move_right"):
		var direction := _get_current_input_direction()
		if direction != Vector2i.ZERO:
			is_move_key_held = true
			held_direction = direction
			face_direction(direction)
			_play_directional_animation("walk")
			get_viewport().set_input_as_handled()
			return

	# Movement key released - update held direction or stop if no keys held
	if event.is_action_released("move_up") or event.is_action_released("move_down") or \
	   event.is_action_released("move_left") or event.is_action_released("move_right"):
		var direction := _get_current_input_direction()
		if direction == Vector2i.ZERO:
			is_move_key_held = false
			held_direction = Vector2i.ZERO
		else:
			# Still holding some direction keys, update the held direction
			held_direction = direction
			face_direction(direction)

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

## Get the current movement direction based on all held keys (supports diagonal)
func _get_current_input_direction() -> Vector2i:
	var direction := Vector2i.ZERO
	if Input.is_action_pressed("move_up"):
		direction.y -= 1
	if Input.is_action_pressed("move_down"):
		direction.y += 1
	if Input.is_action_pressed("move_left"):
		direction.x -= 1
	if Input.is_action_pressed("move_right"):
		direction.x += 1
	return direction

func _process(delta: float):
	# Handle velocity-based smooth movement
	_process_smooth_movement(delta)

	# Mana regeneration
	if mp < max_mp:
		mp = mini(max_mp, mp + int(mana_regen * delta))

	# GCD
	if gcd_active:
		gcd_remaining -= delta
		if gcd_remaining <= 0:
			gcd_active = false

	# Handle continuous movement when key is held
	_process_held_movement(delta)

	# Update animation
	_update_animation(delta)

	# Call parent for hit flash only (skip movement)
	if is_hit_flashing:
		hit_flash_timer -= delta
		if hit_flash_timer <= 0:
			is_hit_flashing = false
			modulate = Color.WHITE

## Velocity-based free movement with grid collision
func _process_smooth_movement(delta: float):
	# Don't process movement during enemy turn or non-playing states
	if not GameManager.is_player_turn:
		velocity = Vector2.ZERO
		return

	if GameManager.current_state != Constants.GameState.PLAYING:
		velocity = Vector2.ZERO
		return

	if is_move_key_held and held_direction != Vector2i.ZERO:
		# Calculate target velocity based on input direction
		var move_dir := Vector2(held_direction).normalized()
		var target_velocity := move_dir * MAX_SPEED
		velocity = velocity.move_toward(target_velocity, ACCELERATION * delta)
	else:
		# Decelerate when not holding movement
		velocity = velocity.move_toward(Vector2.ZERO, DECELERATION * delta)

	# Apply velocity if we have any
	if velocity.length() > 1.0:
		var movement := velocity * delta

		# Try to move with collision detection
		var final_pos := _move_with_collision(position, movement)
		position = final_pos

		# Update grid position if we've moved to a new tile
		var new_grid := _position_to_grid(position)
		if new_grid != grid_pos:
			_update_grid_pos_silent(new_grid)
			_check_tile_interactions()
			_end_turn()

	# Sync _target_position with current position for compatibility
	_target_position = position

## Move with collision detection - clamps to tile edges
func _move_with_collision(from_pos: Vector2, movement: Vector2) -> Vector2:
	var result_pos := from_pos
	var current_grid := _position_to_grid(from_pos)

	# Try X movement
	if abs(movement.x) > 0.01:
		var new_x := from_pos.x + movement.x
		var test_grid := _position_to_grid(Vector2(new_x, from_pos.y))

		if test_grid.x != current_grid.x:
			# Crossing into a new tile horizontally - check for entities first
			var entity := GameManager.get_entity_at(test_grid)
			if entity is Enemy:
				# Bump into enemy - trigger combat
				velocity = Vector2.ZERO
				_attack_enemy(entity)
				return from_pos
			elif entity and entity.is_in_group("npcs"):
				velocity = Vector2.ZERO
				_interact_with_npc(entity)
				return from_pos
			elif GameManager.dungeon and GameManager.dungeon.is_walkable(test_grid):
				# Tile is walkable and no entity blocking
				result_pos.x = new_x
			else:
				# Stop at the edge of the current tile (wall)
				if movement.x > 0:
					result_pos.x = float((current_grid.x + 1) * Constants.TILE_SIZE) - 0.01
				else:
					result_pos.x = float(current_grid.x * Constants.TILE_SIZE) + 0.01
				velocity.x = 0
		else:
			# Still in same tile, allow movement
			result_pos.x = new_x

	# Update current grid after X movement
	current_grid = _position_to_grid(result_pos)

	# Try Y movement
	if abs(movement.y) > 0.01:
		var new_y := result_pos.y + movement.y
		var test_grid := _position_to_grid(Vector2(result_pos.x, new_y))

		if test_grid.y != current_grid.y:
			# Crossing into a new tile vertically - check for entities first
			var entity := GameManager.get_entity_at(test_grid)
			if entity is Enemy:
				# Bump into enemy - trigger combat
				velocity = Vector2.ZERO
				_attack_enemy(entity)
				return from_pos
			elif entity and entity.is_in_group("npcs"):
				velocity = Vector2.ZERO
				_interact_with_npc(entity)
				return from_pos
			elif GameManager.dungeon and GameManager.dungeon.is_walkable(test_grid):
				# Tile is walkable and no entity blocking
				result_pos.y = new_y
			else:
				# Stop at the edge of the current tile (wall)
				if movement.y > 0:
					result_pos.y = float((current_grid.y + 1) * Constants.TILE_SIZE) - 0.01
				else:
					result_pos.y = float(current_grid.y * Constants.TILE_SIZE) + 0.01
				velocity.y = 0
		else:
			# Still in same tile, allow movement
			result_pos.y = new_y

	return result_pos

## Convert pixel position to grid position
func _position_to_grid(pos: Vector2) -> Vector2i:
	return Vector2i(
		int(floor(pos.x / Constants.TILE_SIZE)),
		int(floor(pos.y / Constants.TILE_SIZE))
	)

## Update grid_pos without triggering _target_position change
func _update_grid_pos_silent(new_grid: Vector2i):
	var old_pos := grid_pos
	grid_pos = new_grid
	position_changed.emit(old_pos, new_grid)

## Handle continuous movement when direction key is held
func _process_held_movement(_delta: float):
	if not GameManager.is_player_turn:
		is_move_key_held = false
		return

	if GameManager.current_state != Constants.GameState.PLAYING:
		is_move_key_held = false
		return

	if not can_act():
		is_move_key_held = false
		return

	# Get current direction from held keys (supports diagonal)
	var current_direction := _get_current_input_direction()

	if current_direction == Vector2i.ZERO:
		is_move_key_held = false
		held_direction = Vector2i.ZERO
		return

	is_move_key_held = true
	held_direction = current_direction

	# Update facing direction
	if held_direction != Vector2i.ZERO:
		face_direction(held_direction)
		if not is_walking:
			_play_directional_animation("walk")

## Update sprite animation
func _update_animation(delta: float):
	# Handle walk animation timer - return to idle after duration
	if is_walking:
		walk_anim_timer -= delta
		if walk_anim_timer <= 0:
			is_walking = false
			_play_directional_animation("idle")

	if not ANIM_FRAMES.has(current_anim):
		return

	var frames: Array = ANIM_FRAMES[current_anim]
	if frames.size() <= 1:
		# Static frame, no animation needed
		sprite.frame = frames[0]
		return

	anim_timer += delta
	if anim_timer >= ANIM_SPEED:
		anim_timer -= ANIM_SPEED
		anim_frame_index = (anim_frame_index + 1) % frames.size()
		sprite.frame = frames[anim_frame_index]

## Play an animation
func play_animation(anim_name: String):
	if current_anim == anim_name:
		return
	if not ANIM_FRAMES.has(anim_name):
		return

	current_anim = anim_name
	anim_frame_index = 0
	anim_timer = 0.0
	sprite.frame = ANIM_FRAMES[anim_name][0]

## Check if player has finished moving to current target position
func is_moving() -> bool:
	return position.distance_to(_target_position) > 2.0

## Try to move in a direction
func _try_move(direction: Vector2i):
	if not can_move():
		return

	var target_pos := grid_pos + direction
	face_direction(direction)

	# Check for enemy at target
	var entity := GameManager.get_entity_at(target_pos)
	if entity is Enemy:
		_play_directional_animation("walk")
		_attack_enemy(entity)
		return

	# Check for NPC
	if entity and entity.is_in_group("npcs"):
		_interact_with_npc(entity)
		return

	# Check for walkable tile
	if GameManager.is_walkable(target_pos):
		_play_directional_animation("walk")
		grid_pos = target_pos
		_check_tile_interactions()
		_end_turn()
		return

	# Movement blocked - try diagonal wall sliding if moving diagonally
	if direction.x != 0 and direction.y != 0:
		# Try horizontal slide first
		var horizontal_pos := grid_pos + Vector2i(direction.x, 0)
		if GameManager.is_walkable(horizontal_pos):
			face_direction(Vector2i(direction.x, 0))
			_play_directional_animation("walk")
			grid_pos = horizontal_pos
			_check_tile_interactions()
			_end_turn()
			return

		# Try vertical slide
		var vertical_pos := grid_pos + Vector2i(0, direction.y)
		if GameManager.is_walkable(vertical_pos):
			face_direction(Vector2i(0, direction.y))
			_play_directional_animation("walk")
			grid_pos = vertical_pos
			_check_tile_interactions()
			_end_turn()
			return

	# Completely blocked - wall bump feedback
	_wall_bump()

## Wall bump feedback when movement is blocked
func _wall_bump():
	# Visual bump - small shake towards the wall and back
	var bump_offset := Vector2(Constants.DIRECTIONS[facing]) * 4.0
	var original_pos := position

	# Create a quick bump tween
	var tween := create_tween()
	tween.tween_property(self, "position", position + bump_offset, 0.05)
	tween.tween_property(self, "position", original_pos, 0.1)

	# Flash sprite slightly
	modulate = Color(0.8, 0.8, 0.8)
	await get_tree().create_timer(0.1).timeout
	modulate = Color.WHITE

## Play animation based on current facing direction
func _play_directional_animation(action: String):
	var anim_name := action + "_" + facing
	if ANIM_FRAMES.has(anim_name):
		play_animation(anim_name)
	elif ANIM_FRAMES.has(action + "_down"):
		# Fallback to down if direction not available
		play_animation(action + "_down")

	# Start walk timer for walk animations
	if action == "walk":
		is_walking = true
		walk_anim_timer = WALK_ANIM_DURATION

## Attack an enemy - triggers arena combat
func _attack_enemy(enemy: Enemy):
	print("DEBUG: _attack_enemy called with enemy: ", enemy)
	# Trigger arena combat instead of old bump-to-attack
	EventBus.arena_combat_triggered.emit(self, enemy)
	print("DEBUG: arena_combat_triggered signal emitted")

## Try to interact with adjacent tiles/entities
func _try_interact():
	var interact_pos: Vector2i = grid_pos + Constants.DIRECTIONS[facing]

	# Check for NPC
	var entity := GameManager.get_entity_at(interact_pos)
	if entity and entity.is_in_group("npcs"):
		_interact_with_npc(entity)
		return

	# Check for loot
	var loot: LootPile = GameManager.get_loot_at(grid_pos)
	if loot:
		_pickup_loot(loot)
		return

	# Check for stairs
	if GameManager.dungeon:
		var tile_type: Constants.TileType = GameManager.dungeon.get_tile_type(grid_pos)
		if tile_type == Constants.TileType.STAIRS_DOWN:
			GameManager.descend_floor()
		elif tile_type == Constants.TileType.STAIRS_UP:
			GameManager.ascend_floor()

## Check interactions at current tile
func _check_tile_interactions():
	# Auto-pickup gold
	if GameManager.settings.auto_pickup_gold:
		var loot: LootPile = GameManager.get_loot_at(grid_pos)
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
	var items: Array[ItemData] = loot.take_all()

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
	# Prevent multiple concurrent turn endings
	if _is_ending_turn:
		return
	_is_ending_turn = true

	process_status_effects(GameManager.turn_delta)
	_tick_cooldowns()
	GameManager.end_player_turn()

	# Reset guard after turn ends (GameManager.end_player_turn awaits enemy turns)
	_is_ending_turn = false

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
		var effect: StatusEffect = item.buff_effect.create_instance(self)
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
func equip_item(item: ItemData, slot: Constants.EquipSlot) -> ItemData:
	var slot_key: String = _get_slot_key(slot)
	var old_item: ItemData = equipment.get(slot_key)
	equipment[slot_key] = item
	remove_item(item)

	if old_item:
		add_item(old_item)

	_recalculate_equipment_stats()
	equipment_changed.emit(slot_key, item)

	return old_item

## Unequip an item
func unequip_item(slot: Constants.EquipSlot) -> bool:
	var slot_key: String = _get_slot_key(slot)
	var item: ItemData = equipment.get(slot_key)
	if not item:
		return false

	if inventory.size() >= MAX_INVENTORY:
		return false

	equipment[slot_key] = null
	add_item(item)
	_recalculate_equipment_stats()
	equipment_changed.emit(slot_key, null)

	return true

## Get equipped weapon
func get_equipped_weapon() -> ItemData:
	return equipment["main_hand"]

## Get weapon attack range (in tiles)
func get_weapon_range() -> int:
	var weapon := get_equipped_weapon()
	if weapon and "range" in weapon:
		return weapon.range
	return 1  # Default melee range

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

## Convert EquipSlot enum to equipment dictionary key
func _get_slot_key(slot: Constants.EquipSlot) -> String:
	match slot:
		Constants.EquipSlot.WEAPON, Constants.EquipSlot.MAIN_HAND:
			return "main_hand"
		Constants.EquipSlot.OFF_HAND:
			return "off_hand"
		Constants.EquipSlot.HEAD:
			return "head"
		Constants.EquipSlot.BODY:
			return "body"
		Constants.EquipSlot.HANDS:
			return "hands"
		Constants.EquipSlot.FEET:
			return "feet"
		Constants.EquipSlot.ACCESSORY, Constants.EquipSlot.ACCESSORY_1:
			return "accessory_1"
		Constants.EquipSlot.ACCESSORY_2:
			return "accessory_2"
		_:
			return "main_hand"
