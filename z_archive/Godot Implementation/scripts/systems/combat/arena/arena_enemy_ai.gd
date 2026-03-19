class_name ArenaEnemyAI
extends RefCounted

## Tactical AI for arena combat using "Option Restriction" strategy
## The AI analyzes player's reachable tiles and selects attacks that
## maximize coverage while forcing expensive escapes.
## Supports coordinated attacks with ally enemies.

var combatant: ArenaCombatant
var grid: ArenaGrid
var player_combatant: ArenaCombatant
var tactical_analyzer: TacticalAnalyzer

# Allied enemy combatants for coordination
var ally_combatants: Array[ArenaCombatant] = []

# Cached damage values (calculated once per combat)
var _light_damage: int = 5
var _heavy_damage: int = 7

func _init(p_combatant: ArenaCombatant, p_grid: ArenaGrid, p_player: ArenaCombatant) -> void:
	combatant = p_combatant
	grid = p_grid
	player_combatant = p_player
	tactical_analyzer = TacticalAnalyzer.new(grid)

## Set allied combatants for coordinated attacks
func set_ally_combatants(allies: Array[ArenaCombatant]) -> void:
	ally_combatants = allies

## Generate optimal actions for this turn using tactical analysis
func generate_actions() -> void:
	# Clear any existing actions
	combatant.clear_actions()

	# Validate entities are still valid
	if not combatant.entity or not is_instance_valid(combatant.entity):
		return
	if not player_combatant.entity or not is_instance_valid(player_combatant.entity):
		return

	# Get current positions
	var enemy_pos := grid.get_combatant_position(combatant.entity)
	var player_pos := grid.get_combatant_position(player_combatant.entity)

	if enemy_pos == Vector2i(-1, -1) or player_pos == Vector2i(-1, -1):
		return

	# Get resources
	var enemy_pips := combatant.get_current_pips()
	var player_pips := player_combatant.get_current_pips()
	var player_hp := player_combatant.get_hp()

	# Calculate expected damage values
	_calculate_damage_values()

	# Gather ally attack coverage for coordinated attacks
	var ally_covered_tiles := _get_ally_covered_tiles()

	# Step 1: Build player's reachability map (accounting for ally positions)
	var blocked_tiles := _get_ally_positions()
	var reachability := tactical_analyzer.build_reachability_map(player_pos, player_pips, blocked_tiles)

	# Step 2: Generate and evaluate all possible attack plans
	var attack_plans := tactical_analyzer.generate_all_attack_plans(
		enemy_pos,
		enemy_pips,
		player_pos,
		reachability,
		player_hp,
		_light_damage,
		_heavy_damage,
		ally_covered_tiles  # Pass ally coverage for coordination
	)

	# Step 3: Find the best attack plan
	var best_plan := tactical_analyzer.find_best_attack(attack_plans)

	# Step 4: If no good attack, consider positioning
	if best_plan == null or best_plan.tiles_covered == 0:
		var positioning_plans := tactical_analyzer.generate_positioning_plans(
			enemy_pos,
			enemy_pips,
			player_pos,
			reachability
		)
		if not positioning_plans.is_empty():
			best_plan = tactical_analyzer.find_best_attack(positioning_plans)

	# Step 5: Execute the best plan
	if best_plan:
		_execute_plan(best_plan, player_pos)

## Get tiles already covered by ally attacks (for coordination)
func _get_ally_covered_tiles() -> Array[Vector2i]:
	var covered: Array[Vector2i] = []
	for ally in ally_combatants:
		if not ally or not ally.is_alive:
			continue
		# Check ally's queued actions for attack targets
		for action in ally.get_queued_actions():
			if action.action_type == Constants.CombatActionType.LIGHT_ATTACK:
				if action.target_position not in covered:
					covered.append(action.target_position)
			elif action.action_type == Constants.CombatActionType.HEAVY_ATTACK:
				if action is PatternAttackAction:
					var pattern_action := action as PatternAttackAction
					var source_pos := ally.get_predicted_position(grid)
					var pattern_tiles := pattern_action.calculate_affected_tiles(source_pos)
					for tile in pattern_tiles:
						if tile not in covered:
							covered.append(tile)
				else:
					if action.target_position not in covered:
						covered.append(action.target_position)
	return covered

## Get positions of ally enemies (for blocking in reachability)
func _get_ally_positions() -> Array[Vector2i]:
	var positions: Array[Vector2i] = []
	for ally in ally_combatants:
		if not ally or not ally.is_alive or not ally.entity:
			continue
		var pos := grid.get_combatant_position(ally.entity)
		if pos != Vector2i(-1, -1):
			positions.append(pos)
	return positions

## Calculate expected damage for attacks
func _calculate_damage_values() -> void:
	var base_attack := 5
	if combatant.entity.has_method("get_stat"):
		base_attack = combatant.entity.get_stat("attack")

	var player_defense := 0
	if player_combatant.entity.has_method("get_stat"):
		player_defense = player_combatant.entity.get_stat("defense")

	_light_damage = maxi(Constants.MIN_DAMAGE, base_attack - player_defense)
	_heavy_damage = maxi(Constants.MIN_DAMAGE, int(base_attack * 1.5) - player_defense)

## Execute a tactical plan by queueing the appropriate actions
func _execute_plan(plan: TacticalAnalyzer.AttackPlan, _player_pos: Vector2i) -> void:
	# Queue movement actions
	for move_pos in plan.enemy_moves:
		if not combatant.queue_move(move_pos):
			break  # Can't afford more moves

	# Queue the attack
	match plan.attack_type:
		Constants.CombatActionType.LIGHT_ATTACK:
			combatant.queue_light_attack(plan.target_pos)

		Constants.CombatActionType.HEAVY_ATTACK:
			if plan.pattern == Constants.HeavyAttackPattern.ADJACENT:
				# For ADJACENT, target the specific tile chosen by tactical analysis
				combatant.queue_heavy_attack(plan.target_pos)
			else:
				# For pattern attacks, use the enemy's final position
				combatant.queue_pattern_attack(plan.enemy_final_pos, plan.pattern)

		Constants.CombatActionType.MOVE:
			# Pure positioning - no attack queued
			pass

## Get a list of tiles the AI plans to target (for telegraph display)
func get_telegraph_tiles() -> Array[Vector2i]:
	var tiles: Array[Vector2i] = []

	for action in combatant.get_queued_actions():
		if action.action_type == Constants.CombatActionType.LIGHT_ATTACK:
			tiles.append(action.target_position)
		elif action.action_type == Constants.CombatActionType.HEAVY_ATTACK:
			# Check if it's a pattern attack
			if action is PatternAttackAction:
				var pattern_action := action as PatternAttackAction
				# Get the predicted source position (after any moves)
				var source_pos := combatant.get_predicted_position(grid)
				var pattern_tiles := pattern_action.calculate_affected_tiles(source_pos)
				tiles.append_array(pattern_tiles)
			else:
				tiles.append(action.target_position)

	return tiles

## Set AI personality from enemy data (kept for compatibility but not used in tactical AI)
func set_personality_from_entity(_entity: Node) -> void:
	# Tactical AI doesn't use personality weights - it always plays optimally
	pass

## Set a specific attack pattern (kept for compatibility but not used)
func set_attack_pattern(_pattern: Constants.HeavyAttackPattern) -> void:
	# Tactical AI chooses patterns based on coverage analysis
	pass
