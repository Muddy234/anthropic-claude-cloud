class_name EnemyAI
extends Node

## Enemy AI state machine with tier-based behaviors

# Reference to the enemy this AI controls
var enemy: Node  # Enemy

# Current state
var current_state: Constants.AIState = Constants.AIState.IDLE
var previous_state: Constants.AIState
var state_timer: float = 0.0
var state_data: Dictionary = {}

# Target tracking
var target: Node = null  # Entity
var last_known_target_pos: Vector2i
var memory_duration: float = 0.0

# Spawn/territory
var spawn_position: Vector2i
var territory_size: int = 20

# Movement
var wander_target: Vector2i
var wander_pause_timer: float = 0.0
var current_path: Array[Vector2i] = []
var path_index: int = 0

# Combat
var attack_cooldown: float = 0.0
var special_cooldown: float = 0.0
var has_attack_token: bool = false
var assigned_circle_angle: float = 0.0

# Range-aware positioning
var optimal_range: float = 1.0
var can_kite: bool = false
var range_tolerance: float = 1.0
var strafe_direction: int = 1
var strafe_timer: float = 0.0

# Social system
var follow_target: Node = null  # Enemy
var commanded_target: Node = null  # Entity
var target_position: Vector2i  # Override from social system

# Tier-based behavior
var reaction_delay: float = 0.0
var windup_duration: float = 0.3
var search_behavior: String = "none"
var pack_courage: bool = false
var pack_courage_threshold: int = 4
var is_sacrificial: bool = false
var can_sacrifice_minions: bool = false
var sacrifice_threshold: float = 0.3
var sacrifice_target: Node = null  # Enemy

# Shout state
var shout_timer: float = 0.0
var is_shout_interrupted: bool = false
var last_shout_time: float = 0.0

# Timing
var think_interval: float = 0.2
var think_timer: float = 0.0

signal state_changed(old_state: Constants.AIState, new_state: Constants.AIState)
signal spotted_player()
signal lost_player()
signal shouting_started()
signal shouting_completed()

func _init(e: Node = null):  # Enemy
	if e:
		setup(e)

func setup(e: Node):  # Enemy
	enemy = e
	spawn_position = enemy.grid_pos
	think_timer = randf() * think_interval

	# Load tier configuration
	if enemy.monster_data:
		_load_tier_config()

func _load_tier_config():
	var data = enemy.monster_data

	# Senses
	reaction_delay = data.reaction_delay
	memory_duration = data.memory_duration

	# Combat
	windup_duration = data.windup_duration
	optimal_range = data.preferred_range
	can_kite = data.kites_behavior

	# Social
	pack_courage = data.pack_courage
	pack_courage_threshold = data.pack_courage_threshold
	is_sacrificial = data.is_sacrificial
	can_sacrifice_minions = data.can_sacrifice_minions
	sacrifice_threshold = data.sacrifice_threshold

	# Behavior
	search_behavior = data.search_behavior
	territory_size = data.territory_size

func update(delta: float):
	if enemy.current_hp <= 0:
		return

	# Check for fear status
	if enemy.is_feared:
		if current_state != Constants.AIState.PANICKED:
			_change_state(Constants.AIState.PANICKED)

	state_timer += delta
	think_timer += delta
	attack_cooldown = maxf(0, attack_cooldown - delta)
	special_cooldown = maxf(0, special_cooldown - delta)

	# Periodic thinking
	if think_timer >= think_interval:
		think_timer = 0.0
		_think()

	# Execute current state behavior
	_execute_behavior(delta)

func _think():
	var player := GameManager.player
	if not player:
		return

	var can_see := _can_see_target(player)
	var dist := _get_distance_to(player.grid_pos)

	if can_see:
		target = player
		last_known_target_pos = player.grid_pos

	# Commanded target fallback
	if commanded_target and not target:
		target = commanded_target
		last_known_target_pos = commanded_target.grid_pos
		commanded_target = null

	# Calculate thresholds
	var hp_pct: float = float(enemy.current_hp) / float(enemy.max_hp)
	var flee_threshold: float = enemy.monster_data.flee_threshold if enemy.monster_data else 0.25
	var is_low_hp := hp_pct <= flee_threshold
	var can_flee: bool = enemy.monster_data.flees_behavior if enemy.monster_data else false

	var aggro_range: float = enemy.monster_data.vision_range if enemy.monster_data else 6.0
	var deaggro_range := aggro_range * 1.5
	var atk_range: float = enemy.attack_range if enemy.attack_range else 1.0
	var is_ranged := optimal_range > 1.5

	_state_transitions(can_see, dist, is_low_hp, can_flee, hp_pct, aggro_range, deaggro_range, atk_range, is_ranged)

func _state_transitions(can_see: bool, dist: float, is_low_hp: bool, can_flee: bool, hp_pct: float,
						aggro_range: float, deaggro_range: float, atk_range: float, is_ranged: bool):
	var S := Constants.AIState
	var flee_threshold: float = enemy.monster_data.flee_threshold if enemy.monster_data else 0.25

	# Pack courage: nearby allies reduce fear
	var effective_flee_threshold := flee_threshold
	if pack_courage and can_flee:
		var nearby_allies := _count_nearby_allies(4)
		if nearby_allies >= pack_courage_threshold:
			effective_flee_threshold = 0.0  # No fear with pack

	var adjusted_low_hp := hp_pct <= effective_flee_threshold

	# Sacrifice check for elites
	if can_sacrifice_minions and hp_pct <= sacrifice_threshold:
		var victim := _find_sacrificial_victim()
		if victim:
			sacrifice_target = victim
			_change_state(S.SACRIFICING)
			return

	# Low HP flee check
	if adjusted_low_hp and can_flee:
		if current_state in [S.CHASING, S.COMBAT, S.CIRCLING, S.SKIRMISHING]:
			_change_state(S.DEFENSIVE)
			return

	match current_state:
		S.IDLE, S.WANDERING:
			if can_see and dist <= aggro_range:
				# Check if within arena combat engage range - trigger combat instead of chasing
				if dist <= Constants.ARENA_ENGAGE_RANGE:
					_trigger_arena_combat()
					return
				elif reaction_delay > 0:
					_change_state(S.REACTING)
				else:
					_change_state(S.SHOUTING if _should_shout() else S.CHASING)
			elif follow_target:
				_change_state(S.FOLLOWING)

		S.REACTING:
			if state_timer >= reaction_delay:
				if can_see:
					# Trigger arena combat if within range after reacting
					if dist <= Constants.ARENA_ENGAGE_RANGE:
						_trigger_arena_combat()
						return
					_change_state(S.SHOUTING if _should_shout() else S.CHASING)
				else:
					_change_state(S.WANDERING)

		S.CHASING:
			# Trigger arena combat when chasing enemy gets close enough
			if can_see and dist <= Constants.ARENA_ENGAGE_RANGE:
				_trigger_arena_combat()
				return
			elif can_kite and is_ranged and can_see and dist <= optimal_range + range_tolerance + 1:
				_change_state(S.SKIRMISHING)
			elif can_see and dist <= atk_range:
				if GameManager.combat_system.attack_token_system.request_token(enemy):
					_change_state(S.COMBAT)
				else:
					_change_state(S.CIRCLING)
			elif not can_see:
				if memory_duration > 0 and last_known_target_pos:
					_change_state(S.SEARCHING)
				elif dist > deaggro_range:
					_change_state(S.RETURNING)

		S.COMBAT:
			if not can_see or dist > atk_range + 1:
				_change_state(S.CHASING)

		S.CIRCLING:
			if has_attack_token and dist <= atk_range:
				_change_state(S.COMBAT)
			elif not can_see or dist > atk_range + 3:
				_change_state(S.CHASING)

		S.SKIRMISHING:
			if not can_see:
				_change_state(S.SEARCHING if memory_duration > 0 else S.RETURNING)
			elif dist > optimal_range + range_tolerance + 2:
				_change_state(S.CHASING)

		S.DEFENSIVE:
			if hp_pct > flee_threshold + 0.15:
				_change_state(S.CHASING)
			elif not can_see and dist > deaggro_range:
				_change_state(S.RETURNING)

		S.SEARCHING:
			if can_see:
				_change_state(S.CHASING)
			elif state_timer > memory_duration:
				_change_state(S.RETURNING)

		S.RETURNING:
			if can_see and dist <= aggro_range:
				_change_state(S.CHASING)
			elif _get_distance_to(spawn_position) < 1:
				_change_state(S.WANDERING)

		S.FOLLOWING:
			if can_see and dist <= aggro_range:
				_change_state(S.CHASING)
			elif not follow_target or not is_instance_valid(follow_target) or follow_target.current_hp <= 0:
				follow_target = null
				_change_state(S.WANDERING)

		S.PANICKED:
			if not enemy.is_feared and hp_pct > flee_threshold:
				_change_state(S.CHASING if can_see else S.RETURNING)

func _execute_behavior(delta: float):
	match current_state:
		Constants.AIState.IDLE:
			if state_timer > 1.5:
				_change_state(Constants.AIState.WANDERING)

		Constants.AIState.WANDERING:
			_wander(delta)

		Constants.AIState.REACTING:
			_react(delta)

		Constants.AIState.SHOUTING:
			_shout(delta)

		Constants.AIState.CHASING:
			_chase(delta)

		Constants.AIState.COMBAT:
			_combat(delta)

		Constants.AIState.CIRCLING:
			_circle(delta)

		Constants.AIState.SKIRMISHING:
			_skirmish(delta)

		Constants.AIState.DEFENSIVE:
			_defensive(delta)

		Constants.AIState.SEARCHING:
			_search(delta)

		Constants.AIState.RETURNING:
			_move_toward(spawn_position, 0.7)

		Constants.AIState.FOLLOWING:
			_follow(delta)

		Constants.AIState.PANICKED:
			_panicked(delta)

		Constants.AIState.SACRIFICING:
			_sacrifice(delta)

# === STATE BEHAVIORS ===

func _wander(delta: float):
	if wander_pause_timer > 0:
		wander_pause_timer -= delta
		return

	# Random pause
	if randf() < 0.002 * delta:
		wander_pause_timer = 1.0 + randf() * 2.0
		return

	# Pick new wander target
	if not wander_target or _get_distance_to(wander_target) < 1:
		wander_target = _get_random_wander_target()

	if wander_target:
		_move_toward(wander_target, 0.5)

func _react(_delta: float):
	# Just wait for reaction delay to expire
	# Face the player if we can see them
	if target:
		_face_target(target.grid_pos)

func _shout(delta: float):
	shout_timer += delta

	if is_shout_interrupted:
		_change_state(Constants.AIState.CHASING)
		return

	# Shout duration (about 1 second)
	if shout_timer >= 1.0:
		shouting_completed.emit()
		_alert_nearby_allies()
		_change_state(Constants.AIState.CHASING)

func _chase(_delta: float):
	if not target:
		_change_state(Constants.AIState.WANDERING)
		return

	# Use social system position if available
	var move_target: Vector2i
	if target_position:
		move_target = target_position
	else:
		move_target = target.grid_pos

	_move_toward(move_target, 1.0)

func _combat(delta: float):
	if not target or not is_instance_valid(target):
		_change_state(Constants.AIState.IDLE)
		return

	_face_target(target.grid_pos)

	# Attack when cooldown ready
	if attack_cooldown <= 0:
		_perform_attack()

func _circle(delta: float):
	if not target:
		return

	# Request token periodically
	if GameManager.combat_system.attack_token_system.request_token(enemy):
		_change_state(Constants.AIState.COMBAT)
		return

	# Circle around target
	var circle_pos := _get_circle_position()
	_move_toward(circle_pos, 0.8)

	# Randomly change direction
	if randf() < 0.1 * delta:
		strafe_direction *= -1

func _skirmish(delta: float):
	if not target:
		return

	strafe_timer += delta

	# Maintain optimal range
	var dist := _get_distance_to(target.grid_pos)

	if dist < optimal_range - range_tolerance:
		# Too close - back up
		_move_away_from(target.grid_pos)
	elif dist > optimal_range + range_tolerance:
		# Too far - close in
		_move_toward(target.grid_pos, 0.8)
	else:
		# At optimal range - strafe and attack
		if strafe_timer > 0.5:
			strafe_timer = 0.0
			strafe_direction *= -1

		var strafe_pos := _get_strafe_position()
		_move_toward(strafe_pos, 0.6)

		# Attack if we have token
		if has_attack_token and attack_cooldown <= 0:
			_perform_attack()

func _defensive(delta: float):
	if not target:
		_change_state(Constants.AIState.RETURNING)
		return

	# Retreat while facing player
	_face_target(target.grid_pos)
	_move_away_from(target.grid_pos)

	# Occasional counter-attack
	if has_attack_token and attack_cooldown <= 0 and randf() < 0.3:
		_perform_attack()

func _search(_delta: float):
	if not last_known_target_pos:
		_change_state(Constants.AIState.RETURNING)
		return

	_move_toward(last_known_target_pos, 0.6)

	if _get_distance_to(last_known_target_pos) < 1:
		# Reached last known position, look around
		if search_behavior == "expand":
			last_known_target_pos = _get_random_nearby_position(last_known_target_pos, 3)

func _follow(_delta: float):
	if not follow_target or not is_instance_valid(follow_target):
		follow_target = null
		_change_state(Constants.AIState.WANDERING)
		return

	var dist := _get_distance_to(follow_target.grid_pos)
	if dist > 2:
		_move_toward(follow_target.grid_pos, 0.8)

func _panicked(delta: float):
	# Run away from threat
	if target:
		_move_away_from(target.grid_pos)
	else:
		# Run toward spawn
		_move_toward(spawn_position, 1.0)

func _sacrifice(_delta: float):
	if not sacrifice_target or not is_instance_valid(sacrifice_target):
		_change_state(Constants.AIState.CHASING)
		return

	var dist := _get_distance_to(sacrifice_target.grid_pos)

	if dist <= 1:
		# Consume the sacrifice
		var heal_amount := int(enemy.max_hp * 0.25)
		enemy.heal(heal_amount)
		sacrifice_target.current_hp = 0
		sacrifice_target.died.emit()
		sacrifice_target = null
		_change_state(Constants.AIState.ENRAGED)
	else:
		_move_toward(sacrifice_target.grid_pos, 1.0)

# === HELPER METHODS ===

## Trigger arena combat with the player
func _trigger_arena_combat():
	var player := GameManager.player
	if not player or not is_instance_valid(player):
		return

	# Don't trigger if already in combat
	if GameManager.current_state == Constants.GameState.COMBAT:
		return

	print("DEBUG: Enemy ", enemy.get_display_name(), " triggering arena combat at distance ", _get_distance_to(player.grid_pos))
	EventBus.arena_combat_triggered.emit(player, enemy)

func _change_state(new_state: Constants.AIState):
	previous_state = current_state
	current_state = new_state
	state_timer = 0.0
	state_data.clear()

	# State entry actions
	match new_state:
		Constants.AIState.SHOUTING:
			shout_timer = 0.0
			is_shout_interrupted = false
			shouting_started.emit()

		Constants.AIState.CHASING:
			spotted_player.emit()

		Constants.AIState.RETURNING, Constants.AIState.WANDERING:
			if previous_state in [Constants.AIState.CHASING, Constants.AIState.COMBAT]:
				lost_player.emit()

	state_changed.emit(previous_state, new_state)

func _can_see_target(target_entity: Node) -> bool:  # Entity
	if not target_entity:
		return false

	var vision_range: float = enemy.monster_data.vision_range if enemy.monster_data else 6.0
	var dist := _get_distance_to(target_entity.grid_pos)

	if dist > vision_range:
		return false

	# Line of sight check
	return GameManager.dungeon.has_line_of_sight(enemy.grid_pos, target_entity.grid_pos)

func _get_distance_to(pos: Vector2i) -> float:
	return enemy.grid_pos.distance_to(Vector2(pos))

func _move_toward(pos: Vector2i, speed_mult: float = 1.0):
	# Simple pathfinding - get next step toward target
	var direction: Vector2i = _get_direction_to(pos)
	var next_pos: Vector2i = enemy.grid_pos + direction

	if _can_move_to(next_pos):
		enemy.grid_pos = next_pos

func _move_away_from(pos: Vector2i):
	var direction: Vector2i = _get_direction_to(pos)
	var away_pos: Vector2i = enemy.grid_pos - direction

	if _can_move_to(away_pos):
		enemy.grid_pos = away_pos

func _get_direction_to(pos: Vector2i) -> Vector2i:
	var dx: int = pos.x - enemy.grid_pos.x
	var dy: int = pos.y - enemy.grid_pos.y

	var dir := Vector2i.ZERO
	if abs(dx) > abs(dy):
		dir.x = signi(dx)
	elif dy != 0:
		dir.y = signi(dy)
	elif dx != 0:
		dir.x = signi(dx)

	return dir

func _can_move_to(pos: Vector2i) -> bool:
	if not GameManager.dungeon.is_walkable(pos):
		return false

	# Check for other entities
	for other_enemy in GameManager.enemies:
		if other_enemy != enemy and other_enemy.grid_pos == pos:
			return false

	if GameManager.player and GameManager.player.grid_pos == pos:
		return false

	return true

func _face_target(pos: Vector2i):
	var dx: int = pos.x - enemy.grid_pos.x
	var dy: int = pos.y - enemy.grid_pos.y

	if abs(dx) > abs(dy):
		enemy.facing = "right" if dx > 0 else "left"
	else:
		enemy.facing = "down" if dy > 0 else "up"

func _should_shout() -> bool:
	# Only shout occasionally and if enough time has passed
	if last_shout_time > 0 and state_timer < 10.0:
		return false

	return randf() < 0.3

func _alert_nearby_allies():
	for other in GameManager.enemies:
		if other == enemy or other.current_hp <= 0:
			continue

		var dist := _get_distance_to(other.grid_pos)
		if dist <= 8 and other.ai:
			if other.ai.current_state in [Constants.AIState.IDLE, Constants.AIState.WANDERING]:
				other.ai.target = target
				other.ai._change_state(Constants.AIState.CHASING)

func _perform_attack():
	if not target or not is_instance_valid(target):
		return

	var _result := GameManager.combat_system.perform_attack(enemy, target)

	# Set cooldown based on attack speed
	var base_speed: float = enemy.speed if enemy.speed else 100.0
	attack_cooldown = 0.7 / (base_speed / 100.0)

func _get_circle_position() -> Vector2i:
	if not target:
		return enemy.grid_pos

	var angle := state_timer * 0.5 * strafe_direction + assigned_circle_angle
	var offset := Vector2i(
		int(cos(angle) * 2),
		int(sin(angle) * 2)
	)

	return target.grid_pos + offset

func _get_strafe_position() -> Vector2i:
	if not target:
		return enemy.grid_pos

	var perpendicular := Vector2i(
		-(target.grid_pos.y - enemy.grid_pos.y),
		target.grid_pos.x - enemy.grid_pos.x
	).sign() * strafe_direction

	return enemy.grid_pos + perpendicular

func _get_random_wander_target() -> Vector2i:
	for _i in 10:
		var offset := Vector2i(
			randi_range(-3, 3),
			randi_range(-3, 3)
		)
		var pos := spawn_position + offset

		if _can_move_to(pos) and _get_distance_to(pos) <= territory_size:
			return pos

	return enemy.grid_pos

func _get_random_nearby_position(center: Vector2i, radius: int) -> Vector2i:
	return center + Vector2i(
		randi_range(-radius, radius),
		randi_range(-radius, radius)
	)

func _count_nearby_allies(radius: int) -> int:
	var count := 0
	for other in GameManager.enemies:
		if other == enemy or other.current_hp <= 0:
			continue
		if _get_distance_to(other.grid_pos) <= radius:
			count += 1
	return count

func _find_sacrificial_victim() -> Node:  # Enemy
	for other in GameManager.enemies:
		if other == enemy or other.current_hp <= 0:
			continue
		if other.ai and other.ai.is_sacrificial:
			if _get_distance_to(other.grid_pos) <= 3:
				return other
	return null

## Called when this enemy takes damage - immediate reaction
func on_damaged(attacker: Node):  # Entity
	# Already in combat states - just update target if needed
	if current_state in [Constants.AIState.COMBAT, Constants.AIState.CHASING,
						Constants.AIState.SKIRMISHING, Constants.AIState.CIRCLING]:
		if not target and attacker:
			target = attacker
			last_known_target_pos = attacker.grid_pos
		return

	# Being attacked - immediate pursuit regardless of vision
	if attacker and is_instance_valid(attacker):
		target = attacker
		last_known_target_pos = attacker.grid_pos

		if _should_shout():
			_change_state(Constants.AIState.SHOUTING)
		else:
			_change_state(Constants.AIState.CHASING)

## Interrupt shouting (e.g., when damaged)
func interrupt_shout():
	if current_state == Constants.AIState.SHOUTING:
		is_shout_interrupted = true
