class_name ArenaEnemyAI
extends RefCounted

## Tactical AI for arena combat with behavior-based coordination
## Each enemy contributes to the shared goal (defeat player) according to their behavior.
## Synergy bonuses reward attacks that complement ally behaviors.

var combatant: ArenaCombatant
var grid: ArenaGrid
var player_combatant: ArenaCombatant
var tactical_analyzer: TacticalAnalyzer

# Allied enemy combatants for coordination
var ally_combatants: Array[ArenaCombatant] = []

# Cached damage values (calculated once per combat)
var _light_damage: int = 5
var _heavy_damage: int = 7

# Behavior weights for this enemy
var _behavior_weights: TacticalAnalyzer.BehaviorWeights
var _my_behavior: Constants.EnemyBehavior = Constants.EnemyBehavior.AGGRESSIVE

# Ally coordination context (computed each turn)
var _ally_context: AllyContext = null

## Context about ally plans for coordination
class AllyContext:
	var behaviors: Array[Constants.EnemyBehavior] = []
	var covered_tiles: Array[Vector2i] = []
	var escape_routes: Array[Vector2i] = []  # Safe tiles from ally attacks
	var has_tactical: bool = false
	var has_strategic: bool = false
	var has_aggressive: bool = false

func _init(p_combatant: ArenaCombatant, p_grid: ArenaGrid, p_player: ArenaCombatant) -> void:
	combatant = p_combatant
	grid = p_grid
	player_combatant = p_player
	tactical_analyzer = TacticalAnalyzer.new(grid)
	_load_behavior_weights()

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

	# Get resources (Stamina for movement, Strain for attack planning)
	var enemy_stamina := combatant.get_current_stamina()
	var enemy_strain := combatant.get_current_strain()
	var player_stamina := player_combatant.get_current_stamina()
	var player_hp := player_combatant.get_hp()

	# Skip planning if exhausted (attacks will deal 0 damage anyway)
	if combatant.is_exhausted():
		# Just do positioning moves when exhausted
		var blocked_tiles := _get_ally_positions()
		var reachability := tactical_analyzer.build_reachability_map(player_pos, player_stamina, blocked_tiles)
		var positioning_plans := tactical_analyzer.generate_positioning_plans(
			enemy_pos,
			enemy_stamina,
			player_pos,
			reachability
		)
		if not positioning_plans.is_empty():
			var best_position := tactical_analyzer.find_best_attack(positioning_plans, _behavior_weights)
			if best_position:
				_execute_plan(best_position, player_pos)
		return

	# Calculate expected damage values (fixed values in new system)
	_calculate_damage_values()

	# Step 1: Build player's reachability map (accounting for ally positions)
	var blocked_tiles := _get_ally_positions()
	var reachability := tactical_analyzer.build_reachability_map(player_pos, player_stamina, blocked_tiles)

	# Step 2: Build ally context for coordination
	_ally_context = _build_ally_context(reachability)

	# Get ally positions for friendly fire check
	var ally_positions := _get_ally_positions()

	# Step 3: Generate and evaluate all possible attack plans
	var attack_plans := tactical_analyzer.generate_all_attack_plans(
		enemy_pos,
		enemy_stamina,
		player_pos,
		reachability,
		player_hp,
		_light_damage,
		_heavy_damage,
		_ally_context.covered_tiles,  # Pass ally coverage for base coordination
		enemy_strain,  # Pass current strain for overload prediction
		ally_positions  # Pass ally positions for friendly fire check
	)

	# Step 4: Find the best attack plan using behavior weights + synergy bonuses
	var best_plan := tactical_analyzer.find_best_attack(
		attack_plans,
		_behavior_weights,
		_my_behavior,
		_ally_context.behaviors,
		_ally_context.covered_tiles,
		_ally_context.escape_routes
	)

	# Step 5: If no good attack, consider positioning
	if best_plan == null or best_plan.tiles_covered == 0:
		var positioning_plans := tactical_analyzer.generate_positioning_plans(
			enemy_pos,
			enemy_stamina,
			player_pos,
			reachability
		)
		if not positioning_plans.is_empty():
			best_plan = tactical_analyzer.find_best_attack(
				positioning_plans,
				_behavior_weights,
				_my_behavior,
				_ally_context.behaviors,
				_ally_context.covered_tiles,
				_ally_context.escape_routes
			)

	# Step 6: Execute the best plan
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

## Build complete ally context for coordination
func _build_ally_context(reachability: Dictionary) -> AllyContext:
	var context := AllyContext.new()

	# Gather ally behaviors and covered tiles
	for ally in ally_combatants:
		if not ally or not ally.is_alive:
			continue

		# Get ally behavior
		var ally_behavior := _get_combatant_behavior(ally)
		context.behaviors.append(ally_behavior)

		# Track behavior types present
		match ally_behavior:
			Constants.EnemyBehavior.TACTICAL:
				context.has_tactical = true
			Constants.EnemyBehavior.STRATEGIC:
				context.has_strategic = true
			Constants.EnemyBehavior.AGGRESSIVE:
				context.has_aggressive = true

		# Get tiles covered by ally attacks
		for action in ally.get_queued_actions():
			if action.action_type == Constants.CombatActionType.LIGHT_ATTACK:
				if action.target_position not in context.covered_tiles:
					context.covered_tiles.append(action.target_position)
			elif action.action_type == Constants.CombatActionType.HEAVY_ATTACK:
				if action is PatternAttackAction:
					var pattern_action := action as PatternAttackAction
					var source_pos := ally.get_predicted_position(grid)
					var pattern_tiles := pattern_action.calculate_affected_tiles(source_pos)
					for tile in pattern_tiles:
						if tile not in context.covered_tiles:
							context.covered_tiles.append(tile)
				else:
					if action.target_position not in context.covered_tiles:
						context.covered_tiles.append(action.target_position)

	# Calculate escape routes (reachable tiles NOT covered by allies)
	for tile_pos in reachability:
		if tile_pos not in context.covered_tiles:
			context.escape_routes.append(tile_pos)

	return context

## Get the behavior of a combatant
func _get_combatant_behavior(comb: ArenaCombatant) -> Constants.EnemyBehavior:
	if not comb or not comb.entity:
		return Constants.EnemyBehavior.AGGRESSIVE

	if comb.entity.has_method("get_monster_data"):
		var monster_data = comb.entity.get_monster_data()
		if monster_data and "behavior" in monster_data:
			return monster_data.behavior
	elif "monster_data" in comb.entity:
		var monster_data = comb.entity.monster_data
		if monster_data and "behavior" in monster_data:
			return monster_data.behavior

	return Constants.EnemyBehavior.AGGRESSIVE

## Calculate expected damage for attacks (using fixed values from new system)
func _calculate_damage_values() -> void:
	var player_defense := 0
	if player_combatant.entity.has_method("get_stat"):
		player_defense = player_combatant.entity.get_stat("defense")

	# Use fixed damage values from Constants (Light = 2, Heavy = 6)
	_light_damage = maxi(Constants.MIN_DAMAGE, Constants.LIGHT_ATTACK_DAMAGE - player_defense)
	_heavy_damage = maxi(Constants.MIN_DAMAGE, Constants.HEAVY_ATTACK_DAMAGE - player_defense)

## Load behavior weights from entity's monster data
func _load_behavior_weights() -> void:
	_my_behavior = Constants.EnemyBehavior.AGGRESSIVE  # Default

	# Try to get behavior from monster data
	if combatant.entity and combatant.entity.has_method("get_monster_data"):
		var monster_data = combatant.entity.get_monster_data()
		if monster_data and "behavior" in monster_data:
			_my_behavior = monster_data.behavior
	elif combatant.entity and "monster_data" in combatant.entity:
		var monster_data = combatant.entity.monster_data
		if monster_data and "behavior" in monster_data:
			_my_behavior = monster_data.behavior

	_behavior_weights = TacticalAnalyzer.get_weights(_my_behavior)

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

## Reload behavior weights (call if monster data changes mid-combat)
func refresh_behavior_weights() -> void:
	_load_behavior_weights()
