class_name CombatArena
extends Node

## Main controller for arena combat - coordinates all combat systems
## Supports multiple enemies in simultaneous "We-Go" turn resolution

signal combat_started(player: Node, enemy: Node)
signal combat_started_multi(player: Node, enemies: Array)
signal combat_ended(victor: Node)
signal enemy_defeated(enemy: Node)
signal turn_started(turn_number: int)
signal turn_ended(turn_number: int)

# Core systems
var grid: ArenaGrid
var phase_machine: CombatPhaseMachine
var action_resolver: ActionResolver

# Enemy AI instances (one per enemy)
var enemy_ais: Array[ArenaEnemyAI] = []

# Combatants
var player_combatant: ArenaCombatant
var enemy_combatants: Array[ArenaCombatant] = []

# State
var is_active: bool = false
var is_ending: bool = false  # Prevents multiple end_combat calls
var current_turn: int = 0

# Original entities
var original_player: Node
var original_enemies: Array[Node] = []

# Backwards compatibility - returns first enemy
var original_enemy: Node:
	get:
		return original_enemies[0] if not original_enemies.is_empty() else null

var enemy_combatant: ArenaCombatant:
	get:
		return enemy_combatants[0] if not enemy_combatants.is_empty() else null

var enemy_ai: ArenaEnemyAI:
	get:
		return enemy_ais[0] if not enemy_ais.is_empty() else null

func _ready() -> void:
	# Ensure combat arena processes during combat state
	process_mode = Node.PROCESS_MODE_ALWAYS

	grid = ArenaGrid.new()
	phase_machine = CombatPhaseMachine.new()
	action_resolver = ActionResolver.new(grid)

	# Connect phase machine signals
	phase_machine.phase_changed.connect(_on_phase_changed)
	phase_machine.phase_completed.connect(_on_phase_completed)

	# Connect to EventBus
	EventBus.arena_confirm_pressed.connect(_on_confirm_pressed)

func _process(delta: float) -> void:
	if not is_active:
		return

	# Update phase timer (unused now that all durations are 0, but kept for potential future use)
	var phase_completed := phase_machine.update(delta)
	if phase_completed:
		_advance_phase()

## Start arena combat between player and a single enemy (backwards compatible)
func start_combat(player: Node, enemy: Node) -> void:
	start_combat_multi(player, [enemy])

## Start arena combat between player and multiple enemies
func start_combat_multi(player: Node, enemies: Array) -> void:
	if is_active:
		push_warning("Combat already active")
		return

	if enemies.is_empty():
		push_warning("No enemies provided for combat")
		return

	# Limit enemies to max allowed
	var enemy_count := mini(enemies.size(), Constants.MAX_ARENA_ENEMIES)

	original_player = player
	original_enemies.clear()
	enemy_combatants.clear()
	enemy_ais.clear()

	# Create player combatant wrapper
	player_combatant = ArenaCombatant.new(player)
	player_combatant.died.connect(_on_player_died)
	player_combatant.setup()

	# Create enemy combatant wrappers and AIs
	for i in range(enemy_count):
		var enemy: Node = enemies[i]
		original_enemies.append(enemy)

		var combatant := ArenaCombatant.new(enemy)
		combatant.died.connect(_on_enemy_died.bind(enemy, combatant))
		combatant.setup()
		enemy_combatants.append(combatant)

		# Create AI for this enemy
		var ai := ArenaEnemyAI.new(combatant, grid, player_combatant)
		ai.set_personality_from_entity(enemy)
		enemy_ais.append(ai)

	# Setup grid positions for all combatants
	grid.setup_combat_multi(player, original_enemies)

	# Reset state
	is_active = true
	is_ending = false
	current_turn = 0

	# Change game state
	GameManager.change_state(Constants.GameState.COMBAT)

	# Start combat phases - reset() initializes to ENTERING
	phase_machine.reset()
	# Emit phase changed signal for UI to update
	EventBus.arena_phase_changed.emit(Constants.CombatPhase.ENTERING)

	# Emit appropriate signal
	if original_enemies.size() == 1:
		combat_started.emit(player, original_enemies[0])
		EventBus.arena_combat_started.emit(player, original_enemies[0])
	else:
		combat_started_multi.emit(player, original_enemies)
		EventBus.arena_combat_started_multi.emit(player, original_enemies)

	# Immediately advance from ENTERING since duration is 0
	call_deferred("_advance_phase")

## End combat with a victor
func end_combat(victor: Node) -> void:
	if not is_active or is_ending:
		return

	is_ending = true
	# Don't set is_active = false here - we need _process to continue running
	# for VICTORY/DEFEAT/EXITING phases. Set it false in _finalize_combat.

	# Transition to victory or defeat
	if victor == original_player:
		phase_machine.transition_to(Constants.CombatPhase.VICTORY)
	else:
		phase_machine.transition_to(Constants.CombatPhase.DEFEAT)

	combat_ended.emit(victor)
	EventBus.arena_combat_ended.emit(victor)

## Called when phase machine completes a timed phase
func _advance_phase() -> void:
	var current := phase_machine.get_phase()

	match current:
		Constants.CombatPhase.ENTERING:
			_start_turn()

		Constants.CombatPhase.TELEGRAPH:
			phase_machine.transition_to(Constants.CombatPhase.PLANNING)

		Constants.CombatPhase.RESOLUTION:
			phase_machine.transition_to(Constants.CombatPhase.CLEANUP)

		Constants.CombatPhase.CLEANUP:
			_end_turn()

		Constants.CombatPhase.VICTORY, Constants.CombatPhase.DEFEAT:
			phase_machine.transition_to(Constants.CombatPhase.EXITING)

		Constants.CombatPhase.EXITING:
			_finalize_combat()

## Start a new turn
func _start_turn() -> void:
	current_turn += 1
	turn_started.emit(current_turn)

	# Process upkeep for all combatants (stamina regen, strain recovery)
	player_combatant.process_upkeep()
	for combatant in enemy_combatants:
		if combatant.is_alive:
			combatant.process_upkeep()

	# Generate enemy AI actions during telegraph (all enemies simultaneously)
	_generate_enemy_actions()

	# Move to telegraph phase
	phase_machine.transition_to(Constants.CombatPhase.TELEGRAPH)

## End the current turn
func _end_turn() -> void:
	# Clear executed actions for all combatants
	player_combatant.end_turn()
	for combatant in enemy_combatants:
		if combatant.is_alive:
			combatant.end_turn()

	turn_ended.emit(current_turn)

	# Check for victory/defeat
	if not player_combatant.is_alive:
		# Player died - first living enemy is the "victor"
		var victor_enemy: Node = null
		for i in range(enemy_combatants.size()):
			if enemy_combatants[i].is_alive:
				victor_enemy = original_enemies[i]
				break
		end_combat(victor_enemy if victor_enemy else original_enemies[0])
	elif _all_enemies_dead():
		end_combat(original_player)
	else:
		# Start next turn
		_start_turn()

## Check if all enemies are dead
func _all_enemies_dead() -> bool:
	for combatant in enemy_combatants:
		if combatant.is_alive:
			return false
	return true

## Get count of living enemies
func get_living_enemy_count() -> int:
	var count := 0
	for combatant in enemy_combatants:
		if combatant.is_alive:
			count += 1
	return count

## Generate enemy AI actions for this turn (all enemies)
func _generate_enemy_actions() -> void:
	var all_telegraphs: Array = []

	# Generate actions for each living enemy
	for i in range(enemy_combatants.size()):
		var combatant := enemy_combatants[i]
		if not combatant.is_alive:
			continue

		var ai := enemy_ais[i]
		var enemy_node := original_enemies[i]

		# Pass info about other enemies for coordinated AI
		ai.set_ally_combatants(_get_other_enemy_combatants(i))

		# Use the AI to generate actions
		ai.generate_actions()

		# Collect telegraph data for this enemy
		var actions_display: Array = []
		for action in combatant.get_queued_actions():
			actions_display.append(action.to_dict())

		# Emit individual telegraph for backwards compatibility
		EventBus.arena_telegraph_shown.emit(enemy_node, actions_display)

		# Collect for multi-telegraph signal
		all_telegraphs.append({
			"enemy": enemy_node,
			"actions": actions_display
		})

	# Emit combined telegraph signal for multi-enemy UI
	EventBus.arena_telegraphs_shown.emit(all_telegraphs)

## Get other enemy combatants for coordinated AI
func _get_other_enemy_combatants(exclude_index: int) -> Array[ArenaCombatant]:
	var others: Array[ArenaCombatant] = []
	for i in range(enemy_combatants.size()):
		if i != exclude_index and enemy_combatants[i].is_alive:
			others.append(enemy_combatants[i])
	return others

## Handle phase changes
func _on_phase_changed(new_phase: Constants.CombatPhase) -> void:
	match new_phase:
		Constants.CombatPhase.TELEGRAPH:
			# Immediately advance to planning (no delay)
			call_deferred("_advance_phase")

		Constants.CombatPhase.PLANNING:
			# Player can now input actions - wait for confirmation
			pass

		Constants.CombatPhase.RESOLUTION:
			_execute_resolution()

		Constants.CombatPhase.CLEANUP:
			# Immediately advance (no delay)
			call_deferred("_advance_phase")

		Constants.CombatPhase.VICTORY, Constants.CombatPhase.DEFEAT:
			# Immediately advance to exiting (no delay)
			call_deferred("_advance_phase")

		Constants.CombatPhase.EXITING:
			# Immediately finalize (no delay)
			call_deferred("_advance_phase")

## Handle phase completion signals (for manually completed phases like RESOLUTION)
func _on_phase_completed(_phase: Constants.CombatPhase) -> void:
	# Advance to next phase when a phase is manually completed
	_advance_phase()

## Execute the resolution phase
func _execute_resolution() -> void:
	# Resolve all actions from player and all enemies
	var results := action_resolver.resolve_all_multi(player_combatant, enemy_combatants)

	# Immediately advance to cleanup - no delay
	phase_machine.complete_phase()

## Handle confirm button press (ends planning phase)
func _on_confirm_pressed() -> void:
	if phase_machine.get_phase() == Constants.CombatPhase.PLANNING:
		phase_machine.transition_to(Constants.CombatPhase.RESOLUTION)

## Handle player death
func _on_player_died() -> void:
	var victor_enemy: Node = null
	for i in range(enemy_combatants.size()):
		if enemy_combatants[i].is_alive:
			victor_enemy = original_enemies[i]
			break
	end_combat(victor_enemy if victor_enemy else original_enemies[0])

## Handle enemy death (called for each enemy that dies)
func _on_enemy_died(enemy_node: Node, combatant: ArenaCombatant) -> void:
	# Emit signal for UI updates
	enemy_defeated.emit(enemy_node)
	EventBus.arena_enemy_defeated.emit(enemy_node)

	# Cancel any remaining queued actions for this enemy
	combatant.clear_actions()

	# Remove from grid
	grid.remove_combatant(enemy_node)

	# Check if all enemies are dead
	if _all_enemies_dead():
		end_combat(original_player)

## Finalize combat and return to exploration
func _finalize_combat() -> void:
	is_active = false
	is_ending = false

	# Remove combatants from grid first to prevent stale references
	if original_player and is_instance_valid(original_player):
		grid.remove_combatant(original_player)

	for enemy in original_enemies:
		if enemy and is_instance_valid(enemy):
			grid.remove_combatant(enemy)

	# Emit combat ended signal again to ensure UI cleanup
	var victor = original_player if _all_enemies_dead() else original_enemies[0]
	EventBus.arena_combat_ended.emit(victor)

	# If player won, handle enemy defeat (loot, XP, stats) and remove enemies
	for i in range(enemy_combatants.size()):
		var combatant := enemy_combatants[i]
		var enemy := original_enemies[i]
		if not combatant.is_alive and enemy and is_instance_valid(enemy):
			_handle_enemy_defeat(enemy)
			enemy.queue_free()

	# Clear references
	original_enemies.clear()
	enemy_combatants.clear()
	enemy_ais.clear()
	player_combatant = null

	# Return to playing state
	GameManager.change_state(Constants.GameState.PLAYING)

## Handle enemy defeat rewards (loot, XP, stats) - called when player wins arena combat
func _handle_enemy_defeat(enemy: Node) -> void:
	# Store grid_pos before any cleanup in case node becomes invalid
	var enemy_grid_pos: Vector2i = enemy.grid_pos if "grid_pos" in enemy else Vector2i.ZERO

	# Spawn loot at enemy position
	if GameManager.loot_system:
		# Use stored position since enemy may get freed
		var items = GameManager.loot_system.roll_enemy_loot(enemy)
		if not items.is_empty():
			GameManager.loot_system.spawn_loot_pile(items, enemy_grid_pos)

	# Grant XP to player
	var xp_value: int = 10
	if enemy.has_method("get") and "monster_data" in enemy and enemy.monster_data:
		if enemy.monster_data.has_method("get_xp_value"):
			xp_value = enemy.monster_data.get_xp_value()
	if GameManager.player:
		GameManager.player.gain_xp(xp_value)

	# Update statistics
	GameManager.add_stat("enemies_killed", 1)

	# Remove from GameManager's enemies array to prevent AI processing
	if enemy in GameManager.enemies:
		GameManager.enemies.erase(enemy)

	# Unregister from AI manager
	if GameManager.ai_manager:
		GameManager.ai_manager.unregister_enemy(enemy)

	# Notify systems (do this BEFORE queue_free since handlers may need valid reference)
	EventBus.enemy_died.emit(enemy)

## Get player combatant wrapper
func get_player_combatant() -> ArenaCombatant:
	return player_combatant

## Get enemy combatant wrapper (first enemy for backwards compatibility)
func get_enemy_combatant() -> ArenaCombatant:
	return enemy_combatants[0] if not enemy_combatants.is_empty() else null

## Get all enemy combatants
func get_enemy_combatants() -> Array[ArenaCombatant]:
	return enemy_combatants

## Get all living enemy combatants
func get_living_enemy_combatants() -> Array[ArenaCombatant]:
	var living: Array[ArenaCombatant] = []
	for combatant in enemy_combatants:
		if combatant.is_alive:
			living.append(combatant)
	return living

## Get enemy combatant by index
func get_enemy_combatant_at(index: int) -> ArenaCombatant:
	if index >= 0 and index < enemy_combatants.size():
		return enemy_combatants[index]
	return null

## Get current phase
func get_current_phase() -> Constants.CombatPhase:
	return phase_machine.get_phase()

## Get grid reference
func get_grid() -> ArenaGrid:
	return grid

## Check if in planning phase
func is_planning() -> bool:
	return phase_machine.get_phase() == Constants.CombatPhase.PLANNING

## Player queues a move action
func player_queue_move(target_pos: Vector2i) -> bool:
	if not is_planning():
		return false
	return player_combatant.queue_move(target_pos)

## Player queues a light attack
func player_queue_light_attack(target_pos: Vector2i) -> bool:
	if not is_planning():
		return false
	return player_combatant.queue_light_attack(target_pos)

## Player queues a heavy attack
func player_queue_heavy_attack(target_pos: Vector2i) -> bool:
	if not is_planning():
		return false
	return player_combatant.queue_heavy_attack(target_pos)

## Player queues item use
func player_queue_item(target_pos: Vector2i, item: Resource) -> bool:
	if not is_planning():
		return false
	return player_combatant.queue_item(target_pos, item)

## Player undoes last action
func player_undo() -> void:
	if not is_planning():
		return
	player_combatant.undo_action()

## Player clears all actions
func player_clear() -> void:
	if not is_planning():
		return
	player_combatant.clear_actions()

## Player confirms actions
func player_confirm() -> void:
	if not is_planning():
		return
	EventBus.arena_confirm_pressed.emit()
