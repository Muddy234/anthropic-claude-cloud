class_name AttackTokenSystem
extends Node

## Manages attack tokens to limit simultaneous attackers on the player
## This creates more tactical combat by preventing enemy swarms from all attacking at once

const MAX_SIMULTANEOUS_ATTACKERS := 3

# Currently held tokens
var active_tokens: Array[Enemy] = []

# Queue of enemies waiting for tokens
var token_queue: Array[Enemy] = []

# Token hold duration before forced release
const TOKEN_HOLD_TIME := 2.0
var token_timers: Dictionary = {}  # enemy -> time_held

signal token_granted(enemy: Enemy)
signal token_released(enemy: Enemy)
signal token_denied(enemy: Enemy)

func _ready():
	EventBus.enemy_died.connect(_on_enemy_died)
	EventBus.turn_ended.connect(_on_turn_ended)

func _process(delta: float):
	# Update token timers and force release if held too long
	for enemy in active_tokens.duplicate():
		if not is_instance_valid(enemy):
			_force_release(enemy)
			continue

		token_timers[enemy] = token_timers.get(enemy, 0.0) + delta
		if token_timers[enemy] > TOKEN_HOLD_TIME:
			release_token(enemy)

## Request an attack token
## Returns true if token was granted, false if enemy must wait
func request_token(enemy: Enemy) -> bool:
	if not is_instance_valid(enemy):
		return false

	# Already has token
	if enemy in active_tokens:
		return true

	# Token available
	if active_tokens.size() < MAX_SIMULTANEOUS_ATTACKERS:
		_grant_token(enemy)
		return true

	# Add to queue if not already waiting
	if enemy not in token_queue:
		token_queue.append(enemy)
		token_denied.emit(enemy)

	return false

## Release an attack token
func release_token(enemy: Enemy):
	if enemy in active_tokens:
		active_tokens.erase(enemy)
		token_timers.erase(enemy)
		enemy.has_attack_token = false
		token_released.emit(enemy)
		_process_queue()

## Check if enemy has a token
func has_token(enemy: Enemy) -> bool:
	return enemy in active_tokens

## Get queue position (0 = has token, 1+ = waiting)
func get_queue_position(enemy: Enemy) -> int:
	if enemy in active_tokens:
		return 0
	var idx := token_queue.find(enemy)
	return idx + 1 if idx >= 0 else -1

## Get number of active attackers
func get_active_attacker_count() -> int:
	return active_tokens.size()

## Clear all tokens (used when player dies or changes floor)
func clear_all():
	for enemy in active_tokens.duplicate():
		if is_instance_valid(enemy):
			enemy.has_attack_token = false
	active_tokens.clear()
	token_queue.clear()
	token_timers.clear()

# === PRIVATE METHODS ===

func _grant_token(enemy: Enemy):
	active_tokens.append(enemy)
	token_timers[enemy] = 0.0
	enemy.has_attack_token = true
	token_granted.emit(enemy)

func _force_release(enemy: Enemy):
	active_tokens.erase(enemy)
	token_timers.erase(enemy)
	if is_instance_valid(enemy):
		enemy.has_attack_token = false

func _process_queue():
	# Grant tokens to waiting enemies
	while active_tokens.size() < MAX_SIMULTANEOUS_ATTACKERS and not token_queue.is_empty():
		var next := token_queue.pop_front() as Enemy
		if is_instance_valid(next) and next.current_hp > 0:
			_grant_token(next)
		# Skip dead/invalid enemies

func _on_enemy_died(enemy: Enemy):
	release_token(enemy)
	token_queue.erase(enemy)

func _on_turn_ended():
	# Clean up invalid references
	for enemy in active_tokens.duplicate():
		if not is_instance_valid(enemy) or enemy.current_hp <= 0:
			_force_release(enemy)

	for enemy in token_queue.duplicate():
		if not is_instance_valid(enemy) or enemy.current_hp <= 0:
			token_queue.erase(enemy)

	_process_queue()
