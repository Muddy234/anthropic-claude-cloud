## scripts/ai/enemy_ai.gd
## 5-state FSM attached as a child node on Enemy scenes.
## States: IDLE, ALERT, COMBAT, SEARCHING, FOLLOWING
class_name EnemyAI
extends Node

# --- Signals ---
signal state_changed(old_state: StringName, new_state: StringName)
signal attack_started(target: Node)
signal attack_executed(target: Node, damage: int)

# --- States ---
enum State { IDLE, ALERT, COMBAT, SEARCHING, FOLLOWING }

const STATE_NAMES: Dictionary = {
	State.IDLE: &"idle",
	State.ALERT: &"alert",
	State.COMBAT: &"combat",
	State.SEARCHING: &"searching",
	State.FOLLOWING: &"following",
}

# --- Current State ---
var current_state: State = State.IDLE
var previous_state: State = State.IDLE
var state_timer: float = 0.0

# --- Owner ---
var enemy: Enemy = null

# --- Target Tracking ---
var target: Node = null
var last_known_target_pos: Vector2i = Vector2i.ZERO
var follow_target: Node = null
var alert_source: Node = null

# --- Spawn / Territory ---
var spawn_position: Vector2i = Vector2i.ZERO
var territory_size: float = 20.0

# --- Timers ---
var attack_cooldown: float = 0.0
var special_cooldown: float = 0.0
var think_timer: float = 0.0
var reaction_timer: float = 0.0
var strafe_timer: float = 0.0
var stuck_check_timer: float = 0.0
var idle_sub_timer: float = 0.0

# --- Combat Sub-state ---
var windup_active: bool = false
var windup_timer: float = 0.0
var windup_target_pos: Vector2i = Vector2i.ZERO
var has_attack_token: bool = false
var circle_angle: float = 0.0

# --- Movement ---
var wander_target: Variant = null  # Vector2i or null
var last_position: Vector2i = Vector2i.ZERO
var frustration_counter: int = 0
var strafe_direction: int = 1  # 1 or -1

# --- Chase Hysteresis ---
var is_in_chase_mode: bool = false
const CHASE_HYSTERESIS: float = 0.5

# --- Retreat ---
var retreat_ally: Node = null
var sacrifice_target: Node = null
var has_sacrifice_buff: bool = false

# --- Config (loaded from MonsterData tier config) ---
var sight_range: float = 6.0
var hearing_range: float = 8.0
var reaction_delay: float = 0.15  # seconds
var memory_duration: float = 3.0  # seconds

var base_speed: float = 3.0
var chase_speed: float = 3.5
var flee_speed: float = 4.0
var combat_speed: float = 2.5
var wander_pattern: StringName = &"random"
var wander_radius: float = 4.0
var pause_chance: float = 0.25
var pause_duration_min: float = 1.0
var pause_duration_max: float = 3.0

var windup_duration: float = 0.6
var attack_cooldown_base: float = 2.5
var tracks_during_windup: bool = false
var tracking_cutoff: float = 0.1
var can_interrupt_attack: bool = true
var telegraph_color: Color = Color.RED
var circling_speed: float = 2.0
var circling_enabled: bool = true
var circling_radius: float = 1.5

var flee_threshold: float = 0.25
var evasion_chance: float = 0.0

var optimal_range: float = 1.0
var range_tolerance: float = 1.0
var can_kite: bool = false

var search_behavior: StringName = &"none"
var search_duration: float = 5.0
var frustration_threshold: int = 5
var frustration_behavior: StringName = &"give_up"

var can_lead: bool = false
var command_range: float = 0.0
var pack_courage: bool = false
var pack_courage_threshold: int = 4
var shout_range: float = 5.0

var can_sacrifice_minions: bool = false
var sacrifice_threshold: float = 0.3
var sacrifice_heal: float = 0.25
var sacrifice_damage_buff: float = 0.2

const THINK_INTERVAL: float = 0.2  # 200ms between decision cycles

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
	enemy = get_parent() as Enemy
	if enemy:
		spawn_position = enemy.grid_position
		last_position = enemy.grid_position
		_load_config()
	think_timer = randf() * THINK_INTERVAL

func _load_config() -> void:
	# Pull AI config from monster_data resource or tier defaults
	if enemy.monster_data == null:
		return
	var md: Resource = enemy.monster_data
	# Use typed MonsterData properties
	sight_range = float(Constants.AI_CONFIG.get("sight_range", 6))
	hearing_range = float(Constants.AI_CONFIG.get("hearing_range", 4))

	# Aggression affects reaction delay and flee threshold
	var aggression: int = md.aggression if md.aggression else 2
	reaction_delay = maxf(0.05, 0.3 - aggression * 0.05)
	flee_threshold = maxf(0.0, 0.4 - aggression * 0.08)

	# Movement speed from move_interval
	var move_interval: float = md.move_interval if md.move_interval else 2.0
	base_speed = 4.0 / move_interval
	chase_speed = base_speed * 1.2
	combat_speed = base_speed * 0.8

	# Attack speed
	attack_cooldown_base = md.attack_speed if md.attack_speed else 2.0

	# Elite enemies get enhanced config
	if md.elite:
		circling_enabled = true
		can_kite = true
		search_behavior = &"expand"
		search_duration = 8.0
		shout_range = 8.0
		can_lead = true

func _process(delta: float) -> void:
	if enemy == null or enemy._is_dead:
		return
	# Update timers
	state_timer += delta
	think_timer += delta
	attack_cooldown = maxf(0.0, attack_cooldown - delta)
	special_cooldown = maxf(0.0, special_cooldown - delta)

	# Status-based overrides
	if enemy.is_stunned or enemy.is_frozen:
		return

	# Fear override
	if enemy.is_feared:
		var player: Node = _get_player()
		if player:
			_move_away_from(player.grid_position, flee_speed, delta)
		return

	# Throttled decision making
	if think_timer >= THINK_INTERVAL:
		think_timer = 0.0
		_evaluate_state(delta)

	# Continuous state execution
	_execute_state(delta)

# -----------------------------------------------------------------
# State Machine
# -----------------------------------------------------------------

func set_state(new_state: State) -> void:
	if new_state == current_state:
		return
	var old := current_state
	previous_state = old
	current_state = new_state
	state_timer = 0.0
	_on_state_exit(old)
	_on_state_enter(new_state)
	state_changed.emit(STATE_NAMES[old], STATE_NAMES[new_state])

func _on_state_enter(state: State) -> void:
	match state:
		State.IDLE:
			wander_target = null
			target = null
			enemy.is_in_combat = false
		State.ALERT:
			reaction_timer = reaction_delay
			enemy.alert_level = 0.5
		State.COMBAT:
			_request_circle_angle()
			enemy.is_in_combat = true
			enemy.alert_level = 1.0
		State.SEARCHING:
			idle_sub_timer = 0.0
			enemy.alert_level = 0.75
		State.FOLLOWING:
			enemy.alert_level = 0.3

func _on_state_exit(state: State) -> void:
	match state:
		State.COMBAT:
			windup_active = false
			has_attack_token = false
			enemy.is_in_combat = false
			enemy.left_combat.emit()
		State.ALERT:
			pass

# -----------------------------------------------------------------
# State Evaluation (runs every THINK_INTERVAL)
# -----------------------------------------------------------------

func _evaluate_state(_delta: float) -> void:
	var player: Node = _get_player()
	if player == null or player.get(&"_is_dead"):
		if current_state == State.COMBAT or current_state == State.ALERT:
			set_state(State.IDLE)
		return

	var can_see: bool = enemy.can_see_target(player)
	var dist: float = enemy._grid_distance_to(player)
	var atk_range: float = float(enemy.combat_attack_range)

	match current_state:
		State.IDLE:
			if can_see and dist <= sight_range:
				target = player
				last_known_target_pos = player.grid_position
				set_state(State.ALERT)
		State.ALERT:
			reaction_timer -= THINK_INTERVAL
			if reaction_timer <= 0.0:
				if can_see:
					target = player
					set_state(State.COMBAT)
					enemy.entered_combat.emit(player)
					enemy.alert_nearby(player, &"sight")
				else:
					set_state(State.SEARCHING)
		State.COMBAT:
			_evaluate_combat(player, can_see, dist, atk_range)
		State.SEARCHING:
			if can_see:
				target = player
				set_state(State.COMBAT)
			elif state_timer > search_duration:
				# Return to spawn area
				if frustration_counter >= frustration_threshold:
					match frustration_behavior:
						&"give_up":
							set_state(State.IDLE)
						&"rage":
							enemy.is_enraged = true
							set_state(State.IDLE)
						_:
							set_state(State.IDLE)
					frustration_counter = 0
				else:
					frustration_counter += 1
					set_state(State.IDLE)
		State.FOLLOWING:
			if can_see and dist <= sight_range:
				target = player
				set_state(State.COMBAT)
			elif follow_target == null or not is_instance_valid(follow_target):
				set_state(State.IDLE)

func _evaluate_combat(player: Node, can_see: bool, dist: float, atk_range: float) -> void:
	# Lost sight
	if not can_see:
		last_known_target_pos = player.grid_position
		set_state(State.SEARCHING)
		return
	# Update target pos
	last_known_target_pos = player.grid_position
	# Flee check
	var hp_pct: float = float(enemy.hp) / float(enemy.max_hp)
	if hp_pct <= flee_threshold and not enemy.is_enraged:
		_try_flee(player)
		return
	# Sacrifice check (elite mechanic)
	if can_sacrifice_minions and hp_pct <= sacrifice_threshold:
		_try_sacrifice()

	# Stuck detection
	if enemy.grid_position == last_position:
		stuck_check_timer += THINK_INTERVAL
		if stuck_check_timer > 3.0:
			strafe_direction *= -1
			stuck_check_timer = 0.0
			frustration_counter += 1
	else:
		stuck_check_timer = 0.0
		last_position = enemy.grid_position

# -----------------------------------------------------------------
# State Execution (runs every frame)
# -----------------------------------------------------------------

func _execute_state(delta: float) -> void:
	match current_state:
		State.IDLE:
			_execute_idle(delta)
		State.ALERT:
			pass  # Waiting on reaction timer
		State.COMBAT:
			_execute_combat(delta)
		State.SEARCHING:
			_execute_searching(delta)
		State.FOLLOWING:
			_execute_following(delta)

## --- IDLE ---
func _execute_idle(delta: float) -> void:
	idle_sub_timer += delta
	if wander_target == null:
		if randf() < pause_chance:
			idle_sub_timer = 0.0
			return
		wander_target = _pick_wander_target()
	if wander_target:
		var arrived := _move_toward(wander_target, base_speed, delta)
		if arrived:
			wander_target = null
			idle_sub_timer = 0.0

## --- COMBAT ---
func _execute_combat(delta: float) -> void:
	if target == null or target.get(&"_is_dead"):
		set_state(State.IDLE)
		return

	# Windup sub-state
	if windup_active:
		_execute_windup(delta)
		return

	var dist: float = enemy._grid_distance_to(target)
	var atk_range: float = float(enemy.combat_attack_range)

	# Update chase mode hysteresis
	_update_chase_mode(dist, atk_range)

	if is_in_chase_mode:
		_move_toward(target.grid_position, chase_speed, delta)
	elif dist <= atk_range + 0.5:
		# In attack range
		if attack_cooldown <= 0.0:
			_start_attack()
	elif can_kite and dist < optimal_range - range_tolerance:
		# Too close, kite away
		_move_away_from(target.grid_position, combat_speed, delta)
	elif circling_enabled and dist <= optimal_range + range_tolerance:
		_execute_circling(delta)
	else:
		_move_toward(target.grid_position, combat_speed, delta)

func _execute_windup(delta: float) -> void:
	windup_timer += delta
	if tracks_during_windup and windup_timer < windup_duration - tracking_cutoff:
		windup_target_pos = target.grid_position if target else windup_target_pos
	if windup_timer >= windup_duration:
		_execute_attack()
		windup_active = false
		windup_timer = 0.0

func _execute_circling(delta: float) -> void:
	circle_angle += circling_speed * delta * strafe_direction
	var ideal_x: float = float(target.grid_position.x) + cos(circle_angle) * circling_radius
	var ideal_y: float = float(target.grid_position.y) + sin(circle_angle) * circling_radius
	_move_toward(Vector2i(roundi(ideal_x), roundi(ideal_y)), combat_speed, delta)

## --- SEARCHING ---
func _execute_searching(delta: float) -> void:
	if last_known_target_pos != Vector2i.ZERO:
		var arrived := _move_toward(last_known_target_pos, base_speed, delta)
		if arrived:
			# Expand search if configured
			if search_behavior == &"expand":
				last_known_target_pos = _pick_search_target()
			else:
				last_known_target_pos = Vector2i.ZERO
	else:
		# Return to spawn
		_move_toward(spawn_position, base_speed, delta)

func _pick_search_target() -> Vector2i:
	var offset := Vector2i(randi_range(-3, 3), randi_range(-3, 3))
	return last_known_target_pos + offset

## --- FOLLOWING ---
func _execute_following(delta: float) -> void:
	if follow_target == null or not is_instance_valid(follow_target):
		set_state(State.IDLE)
		return
	var dist := enemy._grid_distance_to(follow_target)
	if dist > 2.0:
		_move_toward(follow_target.grid_position, base_speed, delta)

# -----------------------------------------------------------------
# Attack
# -----------------------------------------------------------------

func _start_attack() -> void:
	windup_active = true
	windup_timer = 0.0
	windup_target_pos = target.grid_position if target else enemy.grid_position
	attack_started.emit(target)
	# Show telegraph via EventBus
	EventBus.emit_signal("attack_telegraph", enemy, windup_target_pos, windup_duration, telegraph_color)

func _execute_attack() -> void:
	if target == null or target.get(&"_is_dead"):
		return
	# Try special ability first
	var ability_node: Node = enemy.get_node_or_null("EnemyAbility")
	if ability_node and ability_node.has_method("try_use_ability"):
		var used: bool = ability_node.try_use_ability(target)
		if used:
			attack_cooldown = attack_cooldown_base
			return
	# Basic attack
	var dist: float = enemy._grid_distance_to(target)
	if dist <= float(enemy.combat_attack_range) + 0.5:
		var damage: int = enemy.base_damage
		attack_executed.emit(target, damage)
		EventBus.emit_signal("enemy_attacked", enemy, target, damage)
	attack_cooldown = attack_cooldown_base

# -----------------------------------------------------------------
# Chase Mode Hysteresis
# -----------------------------------------------------------------

func _update_chase_mode(dist: float, atk_range: float) -> void:
	var enter_threshold := maxf(atk_range + 5.0, 6.0)
	var exit_threshold := enter_threshold - CHASE_HYSTERESIS
	if not is_in_chase_mode and dist > enter_threshold:
		is_in_chase_mode = true
	elif is_in_chase_mode and dist < exit_threshold:
		is_in_chase_mode = false

# -----------------------------------------------------------------
# Movement Helpers
# -----------------------------------------------------------------

func _move_toward(target_pos: Vector2i, spd: float, delta: float) -> bool:
	var dir := Vector2(target_pos - enemy.grid_position).normalized()
	if dir.length_squared() < 0.01:
		return true
	# Single-tile step toward target
	var step := Vector2i(signi(target_pos.x - enemy.grid_position.x),
						 signi(target_pos.y - enemy.grid_position.y))
	var next := enemy.grid_position + step
	if _is_tile_walkable(next) and not _is_occupied(next):
		enemy.grid_position = next
		enemy.snap_to_grid()
		_update_facing(step)
		return enemy.grid_position == target_pos
	else:
		# Try cardinal directions if diagonal blocked
		if step.x != 0 and step.y != 0:
			var alt_x := enemy.grid_position + Vector2i(step.x, 0)
			var alt_y := enemy.grid_position + Vector2i(0, step.y)
			if _is_tile_walkable(alt_x) and not _is_occupied(alt_x):
				enemy.grid_position = alt_x
				enemy.snap_to_grid()
				_update_facing(Vector2i(step.x, 0))
				return false
			elif _is_tile_walkable(alt_y) and not _is_occupied(alt_y):
				enemy.grid_position = alt_y
				enemy.snap_to_grid()
				_update_facing(Vector2i(0, step.y))
				return false
	return false

func _move_away_from(target_pos: Vector2i, spd: float, delta: float) -> bool:
	var step := Vector2i(signi(enemy.grid_position.x - target_pos.x),
						 signi(enemy.grid_position.y - target_pos.y))
	if step == Vector2i.ZERO:
		# Pick random direction
		step = Vector2i(randi_range(-1, 1), randi_range(-1, 1))
	var next := enemy.grid_position + step
	if _is_tile_walkable(next) and not _is_occupied(next):
		enemy.grid_position = next
		enemy.snap_to_grid()
		_update_facing(step)
	return false

func _pick_wander_target() -> Variant:
	match wander_pattern:
		&"stationary":
			return null
		&"patrol":
			if enemy.patrol_points.size() > 0:
				enemy.current_patrol_index = (enemy.current_patrol_index + 1) % enemy.patrol_points.size()
				return enemy.patrol_points[enemy.current_patrol_index]
		_:  # "random"
			for _i in range(10):
				var offset := Vector2i(randi_range(-int(wander_radius), int(wander_radius)),
										randi_range(-int(wander_radius), int(wander_radius)))
				var candidate := spawn_position + offset
				if _is_tile_walkable(candidate):
					return candidate
	return null

func _update_facing(step: Vector2i) -> void:
	if abs(step.x) > abs(step.y):
		enemy.set_facing(Entity.Facing.RIGHT if step.x > 0 else Entity.Facing.LEFT)
	elif step.y != 0:
		enemy.set_facing(Entity.Facing.DOWN if step.y > 0 else Entity.Facing.UP)

func _is_tile_walkable(pos: Vector2i) -> bool:
	# Delegate to WP03 tilemap query or GameManager map
	if GameManager.map.is_empty():
		return true
	if pos.x < 0 or pos.y < 0 or pos.x >= Constants.GRID_WIDTH or pos.y >= Constants.GRID_HEIGHT:
		return false
	if pos.y < GameManager.map.size() and pos.x < GameManager.map[pos.y].size():
		var tile: int = GameManager.map[pos.y][pos.x]
		# Walls and void are not walkable
		return tile != Constants.TileType.WALL and tile != Constants.TileType.VOID
	return false

func _is_occupied(pos: Vector2i) -> bool:
	# Check other enemies at position
	for other in get_tree().get_nodes_in_group("enemies"):
		if other == enemy:
			continue
		if other is Enemy and other.grid_position == pos:
			return true
	return false

func _request_circle_angle() -> void:
	circle_angle = randf() * TAU

func _try_flee(player: Node) -> void:
	# Move away from player, optionally seek nearby ally
	_move_away_from(player.grid_position, flee_speed, 0.0)

	# Check for retreat to stronger ally
	for ally in get_tree().get_nodes_in_group("enemies"):
		if ally == enemy or ally._is_dead:
			continue
		var dist := enemy._grid_distance_to(ally)
		if dist <= shout_range and dist > 2.0:
			retreat_ally = ally
			break

func _try_sacrifice() -> void:
	# Elite mechanic: consume a nearby minion for healing
	for minion in get_tree().get_nodes_in_group("enemies"):
		if minion == enemy or minion._is_dead:
			continue
		if minion.is_leader:
			continue
		var dist := enemy._grid_distance_to(minion)
		if dist <= 3.0:
			# Sacrifice the minion
			var heal_amount := int(float(enemy.max_hp) * sacrifice_heal)
			enemy.heal(heal_amount)
			minion.die()
			# Apply damage buff
			enemy.base_damage = int(float(enemy.base_damage) * (1.0 + sacrifice_damage_buff))
			has_sacrifice_buff = true
			break

func _get_player() -> Node:
	return get_tree().get_first_node_in_group("player")

# -----------------------------------------------------------------
# External Hooks
# -----------------------------------------------------------------

func on_target_detected(new_target: Node) -> void:
	if current_state == State.IDLE:
		target = new_target
		last_known_target_pos = new_target.grid_position
		set_state(State.ALERT)

func on_hear_noise(source_pos: Vector2i, _volume: float) -> void:
	if current_state == State.IDLE:
		last_known_target_pos = source_pos
		set_state(State.ALERT)

func on_ally_shout(alerter: Node, target_pos: Vector2i) -> void:
	if current_state == State.IDLE or current_state == State.SEARCHING:
		alert_source = alerter
		last_known_target_pos = target_pos
		set_state(State.ALERT)

func on_commanded(command_type: StringName, cmd_target: Variant = null) -> void:
	match command_type:
		&"attack":
			if cmd_target is Node:
				target = cmd_target
				set_state(State.COMBAT)
		&"defend", &"hold":
			target = null
			set_state(State.IDLE)
		&"retreat":
			enemy.is_feared = true
			enemy.fear_duration = 3.0
			var player := _get_player()
			if player:
				_try_flee(player)
		&"follow":
			if cmd_target is Node:
				follow_target = cmd_target
				set_state(State.FOLLOWING)
