class_name TacticalAnalyzer
extends RefCounted

## Analyzes the tactical state of the arena for AI decision-making
## Implements behavior-based scoring strategy

## Behavior weight profiles for AI decision-making
## Each behavior prioritizes different scoring factors
class BehaviorWeights:
	var guaranteed_hit: float
	var lethal: float
	var coverage: float
	var escape_cost: float
	var corner: float
	var pip_cost_penalty: float

	func _init(hit: float, leth: float, cov: float, esc: float, corn: float, pip: float) -> void:
		guaranteed_hit = hit
		lethal = leth
		coverage = cov
		escape_cost = esc
		corner = corn
		pip_cost_penalty = pip

## Predefined weight profiles for each behavior type
static var BEHAVIOR_PROFILES: Dictionary = {
	Constants.EnemyBehavior.AGGRESSIVE: BehaviorWeights.new(
		150.0,   # guaranteed_hit: High priority on hitting player
		1000.0,  # lethal: Very high priority on killing blows
		25.0,    # coverage: Low - doesn't care about area denial
		5.0,     # escape_cost: Low - doesn't care about pip drain
		10.0,    # corner: Low - doesn't care about positioning
		3.0      # pip_cost_penalty: Low - willing to spend pips for damage
	),
	Constants.EnemyBehavior.STRATEGIC: BehaviorWeights.new(
		25.0,    # guaranteed_hit: Low - hitting is secondary
		100.0,   # lethal: Low - killing is not the primary goal
		75.0,    # coverage: Medium - area denial helps force movement
		60.0,    # escape_cost: Very high - primary goal is pip drain
		30.0,    # corner: Medium - corners force expensive escapes
		8.0      # pip_cost_penalty: Higher - prefers efficient attacks
	),
	Constants.EnemyBehavior.TACTICAL: BehaviorWeights.new(
		50.0,    # guaranteed_hit: Medium - balanced
		100.0,   # lethal: Low - killing is not the primary goal
		200.0,   # coverage: Very high - maximize tiles threatened
		30.0,    # escape_cost: Medium - contributes to control
		150.0,   # corner: Very high - primary goal is cornering
		4.0      # pip_cost_penalty: Low - willing to spend for position
	)
}

## Get the weight profile for a behavior type
static func get_weights(behavior: Constants.EnemyBehavior) -> BehaviorWeights:
	if behavior in BEHAVIOR_PROFILES:
		return BEHAVIOR_PROFILES[behavior]
	# Default to AGGRESSIVE if not found
	return BEHAVIOR_PROFILES[Constants.EnemyBehavior.AGGRESSIVE]

## Synergy bonus constants
## These bonuses reward attacks that complement ally behaviors
const SYNERGY_BONUSES := {
	# AGGRESSIVE synergies: capitalize on ally setups
	"AGGRESSIVE_WITH_TACTICAL": 100.0,    # Attack escape routes from TACTICAL ally
	"AGGRESSIVE_WITH_STRATEGIC": 80.0,    # Attack cheapest escape from STRATEGIC ally

	# TACTICAL synergies: enhance board control
	"TACTICAL_WITH_TACTICAL": 50.0,       # Per tile of combined coverage eliminating safe tiles
	"TACTICAL_WITH_AGGRESSIVE": 100.0,    # Herd player toward AGGRESSIVE ally

	# STRATEGIC synergies: compound pip drain
	"STRATEGIC_WITH_STRATEGIC": 60.0,     # Attack ally's escape routes (pip chain)
	"STRATEGIC_WITH_TACTICAL": 70.0,      # Force movement into TACTICAL ally's net
}

## Calculate synergy bonus for an attack plan based on ally context
## Returns bonus score to add to the plan's base score
static func calculate_synergy_bonus(
	plan: AttackPlan,
	my_behavior: Constants.EnemyBehavior,
	ally_behaviors: Array,  # Array of Constants.EnemyBehavior
	ally_covered_tiles: Array,  # Array of Vector2i
	ally_escape_routes: Array   # Array of Vector2i - tiles player can escape to from ally attacks
) -> float:
	var bonus := 0.0

	# No allies = no synergy
	if ally_behaviors.is_empty():
		return 0.0

	# Check each ally for synergy opportunities
	var has_tactical := false
	var has_strategic := false
	var has_aggressive := false

	for ally_behavior in ally_behaviors:
		match ally_behavior:
			Constants.EnemyBehavior.TACTICAL:
				has_tactical = true
			Constants.EnemyBehavior.STRATEGIC:
				has_strategic = true
			Constants.EnemyBehavior.AGGRESSIVE:
				has_aggressive = true

	# Calculate synergies based on MY behavior
	match my_behavior:
		Constants.EnemyBehavior.AGGRESSIVE:
			# AGGRESSIVE benefits from attacking escape routes created by allies
			if has_tactical or has_strategic:
				# Count how many of my affected tiles are escape routes from ally attacks
				var escape_attacks := 0
				for tile in plan.affected_tiles:
					if tile in ally_escape_routes:
						escape_attacks += 1
				if escape_attacks > 0:
					if has_tactical:
						bonus += SYNERGY_BONUSES["AGGRESSIVE_WITH_TACTICAL"]
					if has_strategic:
						bonus += SYNERGY_BONUSES["AGGRESSIVE_WITH_STRATEGIC"]

		Constants.EnemyBehavior.TACTICAL:
			# TACTICAL benefits from combined coverage and herding toward AGGRESSIVE
			if has_tactical:
				# Bonus for eliminating safe tiles together
				# Count tiles that become unsafe when combined with ally coverage
				var combined_threat := 0
				for tile in plan.affected_tiles:
					if tile in ally_escape_routes:
						combined_threat += 1
				bonus += combined_threat * SYNERGY_BONUSES["TACTICAL_WITH_TACTICAL"]

			if has_aggressive:
				# Bonus if my coverage herds player toward tiles near aggressive allies
				# (simplified: bonus if we're reducing escape options)
				if plan.forces_corner or plan.tiles_covered >= 3:
					bonus += SYNERGY_BONUSES["TACTICAL_WITH_AGGRESSIVE"]

		Constants.EnemyBehavior.STRATEGIC:
			# STRATEGIC benefits from forcing movement into ally zones
			if has_strategic:
				# Pip chain: attack escape routes to compound pip cost
				var escape_attacks := 0
				for tile in plan.affected_tiles:
					if tile in ally_escape_routes:
						escape_attacks += 1
				if escape_attacks > 0:
					bonus += SYNERGY_BONUSES["STRATEGIC_WITH_STRATEGIC"]

			if has_tactical:
				# Force movement into tactical's net
				if plan.max_escape_cost >= 2:  # Forces expensive escape
					bonus += SYNERGY_BONUSES["STRATEGIC_WITH_TACTICAL"]

	return bonus

## Represents a tile the player can reach and its cost
class ReachableTile:
	var position: Vector2i
	var pip_cost: int  # Minimum pips required to reach this tile
	var escape_directions: int  # Number of adjacent empty tiles (for corner detection)

	func _init(pos: Vector2i, cost: int, escapes: int = 4) -> void:
		position = pos
		pip_cost = cost
		escape_directions = escapes

## Represents a potential attack plan
class AttackPlan:
	var enemy_moves: Array[Vector2i] = []  # Sequence of moves before attacking
	var enemy_final_pos: Vector2i  # Where enemy ends up
	var attack_type: Constants.CombatActionType
	var pattern: Constants.HeavyAttackPattern
	var target_pos: Vector2i  # For single-target attacks
	var affected_tiles: Array[Vector2i] = []  # All tiles hit by this attack
	var pip_cost: int  # Total pip cost (moves + attack)

	# Scoring
	var tiles_covered: int = 0  # How many reachable tiles are hit
	var guaranteed_hit: bool = false  # Does this hit player's current position?
	var min_escape_cost: int = 0  # Minimum pips player needs to escape
	var max_escape_cost: int = 0  # Maximum pips if player picks worst escape
	var forces_corner: bool = false  # Does escape leave player in corner?
	var is_lethal: bool = false  # Would this kill the player?

	func get_score(weights: BehaviorWeights = null) -> float:
		var score := 0.0

		# Use default weights if none provided
		if weights == null:
			weights = TacticalAnalyzer.get_weights(Constants.EnemyBehavior.AGGRESSIVE)

		# If we don't cover ANY reachable tiles, this is a bad attack
		# Only give positive scores to attacks that threaten the player
		if tiles_covered == 0 and not guaranteed_hit:
			# This attack doesn't threaten any tiles the player can reach
			# Give a very negative score so positioning is preferred
			return -1000.0

		# Coverage: How many options removed from player
		score += tiles_covered * weights.coverage

		# Guaranteed hit on current position
		if guaranteed_hit:
			score += weights.guaranteed_hit

		# Lethal damage potential
		if is_lethal:
			score += weights.lethal

		# Forces expensive escape (pip drain)
		score += max_escape_cost * weights.escape_cost

		# Forces player into corner
		if forces_corner:
			score += weights.corner

		# Penalty: Pip cost for the attack
		score -= pip_cost * weights.pip_cost_penalty

		return score

var grid: ArenaGrid

func _init(p_grid: ArenaGrid) -> void:
	grid = p_grid

## Build a map of all tiles the player can reach and their pip costs
## Returns Dictionary[Vector2i, ReachableTile]
## blocked_tiles: Additional tiles that should be considered blocked (e.g., ally enemy positions)
func build_reachability_map(player_pos: Vector2i, player_pips: int, blocked_tiles: Array[Vector2i] = []) -> Dictionary:
	var reachable: Dictionary = {}

	# Standing still is always an option (cost 0)
	reachable[player_pos] = ReachableTile.new(player_pos, 0, _count_escape_directions(player_pos, blocked_tiles))

	# BFS to find all reachable tiles with movement costs
	# Movement costs: 1st move = 1 pip, 2nd move = 2 pips, 3rd move = 3 pips
	var move_costs := Constants.MOVE_COSTS  # [1, 2, 3]

	# Track visited states: (position, moves_made) to avoid revisiting
	var visited: Dictionary = {}

	# Queue entries: [position, moves_made, total_cost, path]
	var queue: Array = [[player_pos, 0, 0, []]]
	visited[_state_key(player_pos, 0)] = true

	while not queue.is_empty():
		var current = queue.pop_front()
		var pos: Vector2i = current[0]
		var moves_made: int = current[1]
		var total_cost: int = current[2]

		# Try each cardinal direction
		for dir in Constants.CARDINAL_DIRECTIONS:
			var next_pos: Vector2i = pos + dir

			# Check bounds and obstacles
			if not grid.is_within_bounds(next_pos):
				continue
			if grid.is_tile_blocked(next_pos):
				continue
			# Check additional blocked tiles (ally enemy positions)
			if next_pos in blocked_tiles:
				continue

			var next_moves: int = moves_made + 1
			var move_cost_index: int = mini(moves_made, move_costs.size() - 1)
			var next_cost: int = total_cost + move_costs[move_cost_index]

			# Check if player can afford this
			if next_cost > player_pips:
				continue

			# Check if we've visited this state
			var state_key := _state_key(next_pos, next_moves)
			if state_key in visited:
				continue
			visited[state_key] = true

			# Record this reachable tile (keep lowest cost if already found)
			if next_pos not in reachable or reachable[next_pos].pip_cost > next_cost:
				var escapes := _count_escape_directions(next_pos, blocked_tiles)
				reachable[next_pos] = ReachableTile.new(next_pos, next_cost, escapes)

			# Continue exploring if we can afford more moves
			if next_moves < 3:  # Max 3 moves per turn
				queue.append([next_pos, next_moves, next_cost, []])

	return reachable

## Count how many directions a player can escape from a tile (for corner detection)
## blocked_tiles: Additional tiles that should be considered blocked
func _count_escape_directions(pos: Vector2i, blocked_tiles: Array[Vector2i] = []) -> int:
	var count := 0
	for dir in Constants.CARDINAL_DIRECTIONS:
		var adj: Vector2i = pos + dir
		if grid.is_within_bounds(adj) and grid.is_tile_empty(adj) and adj not in blocked_tiles:
			count += 1
	return count

## Generate state key for BFS visited tracking
func _state_key(pos: Vector2i, moves: int) -> String:
	return "%d,%d,%d" % [pos.x, pos.y, moves]

## Calculate affected tiles for an attack pattern from a given position
func get_pattern_tiles(source_pos: Vector2i, pattern: Constants.HeavyAttackPattern) -> Array[Vector2i]:
	var tiles: Array[Vector2i] = []

	match pattern:
		Constants.HeavyAttackPattern.ADJACENT:
			# All 4 adjacent tiles
			for dir in Constants.CARDINAL_DIRECTIONS:
				var tile_pos: Vector2i = source_pos + dir
				if grid.is_within_bounds(tile_pos):
					tiles.append(tile_pos)

		Constants.HeavyAttackPattern.ROW_SWEEP:
			# All tiles in the same row
			for x in range(Constants.ARENA_SIZE.x):
				if x != source_pos.x:
					tiles.append(Vector2i(x, source_pos.y))

		Constants.HeavyAttackPattern.COLUMN_SWEEP:
			# All tiles in the same column
			for y in range(Constants.ARENA_SIZE.y):
				if y != source_pos.y:
					tiles.append(Vector2i(source_pos.x, y))

		Constants.HeavyAttackPattern.NOVA:
			# All 8 surrounding tiles
			for dir in Constants.ALL_DIRECTIONS:
				var tile_pos: Vector2i = source_pos + dir
				if grid.is_within_bounds(tile_pos):
					tiles.append(tile_pos)

	return tiles

## Get all positions the enemy can move to with given pips
## Returns Array of [final_position, moves_sequence, pip_cost]
func get_enemy_move_options(enemy_pos: Vector2i, max_pips: int) -> Array:
	var options: Array = []

	# Option 0: Stay in place (cost 0)
	options.append([enemy_pos, [], 0])

	var move_costs := Constants.MOVE_COSTS

	# BFS for movement options
	var visited: Dictionary = {enemy_pos: true}
	var queue: Array = [[enemy_pos, [], 0, 0]]  # [pos, path, total_cost, moves_made]

	while not queue.is_empty():
		var current = queue.pop_front()
		var pos: Vector2i = current[0]
		var path: Array = current[1]
		var total_cost: int = current[2]
		var moves_made: int = current[3]

		for dir in Constants.CARDINAL_DIRECTIONS:
			var next_pos: Vector2i = pos + dir

			if not grid.is_within_bounds(next_pos):
				continue
			if grid.is_tile_blocked(next_pos):
				continue
			if next_pos in visited:
				continue

			var move_cost_index: int = mini(moves_made, move_costs.size() - 1)
			var next_cost: int = total_cost + move_costs[move_cost_index]

			if next_cost > max_pips:
				continue

			visited[next_pos] = true
			var next_path: Array = path.duplicate()
			next_path.append(next_pos)

			options.append([next_pos, next_path, next_cost])

			# Continue exploring
			if moves_made + 1 < 3:
				queue.append([next_pos, next_path, next_cost, moves_made + 1])

	return options

## Evaluate an attack plan against the player's reachability map
## ally_covered_tiles: Tiles already covered by ally attacks (for coordination)
func evaluate_attack(plan: AttackPlan, reachability: Dictionary, player_pos: Vector2i, player_hp: int, attack_damage: int, ally_covered_tiles: Array[Vector2i] = []) -> void:
	plan.tiles_covered = 0
	plan.guaranteed_hit = false
	plan.min_escape_cost = 999
	plan.max_escape_cost = 0
	plan.forces_corner = false
	plan.is_lethal = false

	var safe_tiles: Array[ReachableTile] = []

	# Combine our affected tiles with ally covered tiles for total coverage
	var all_covered_tiles: Array[Vector2i] = plan.affected_tiles.duplicate()
	for ally_tile in ally_covered_tiles:
		if ally_tile not in all_covered_tiles:
			all_covered_tiles.append(ally_tile)

	# Check each reachable tile
	for tile_pos in reachability:
		var tile_data: ReachableTile = reachability[tile_pos]

		if tile_pos in plan.affected_tiles:
			# This tile is hit by OUR attack (count for scoring)
			plan.tiles_covered += 1

			if tile_pos == player_pos:
				plan.guaranteed_hit = true
				if attack_damage >= player_hp:
					plan.is_lethal = true
		elif tile_pos in all_covered_tiles:
			# This tile is covered by allies - not safe but don't count as our coverage
			# (Avoid redundant attacks on same tile)
			pass
		else:
			# This tile is truly safe - player could escape here
			safe_tiles.append(tile_data)

	# Analyze escape options (considering both our attack and ally attacks)
	if safe_tiles.is_empty():
		# No escape! All options covered by combined attacks
		plan.min_escape_cost = 999
		plan.max_escape_cost = 999
	else:
		for safe_tile in safe_tiles:
			plan.min_escape_cost = mini(plan.min_escape_cost, safe_tile.pip_cost)
			plan.max_escape_cost = maxi(plan.max_escape_cost, safe_tile.pip_cost)

			# Check if escape leads to corner (0-1 escape directions)
			if safe_tile.escape_directions <= 1:
				plan.forces_corner = true

## Generate all possible attack plans for the enemy
## ally_covered_tiles: Tiles already covered by ally attacks (for coordination bonus)
func generate_all_attack_plans(
	enemy_pos: Vector2i,
	enemy_pips: int,
	player_pos: Vector2i,
	reachability: Dictionary,
	player_hp: int,
	light_damage: int,
	heavy_damage: int,
	ally_covered_tiles: Array[Vector2i] = []
) -> Array[AttackPlan]:
	var plans: Array[AttackPlan] = []

	# Get all positions enemy can move to
	var move_options := get_enemy_move_options(enemy_pos, enemy_pips)

	for move_option in move_options:
		var final_pos: Vector2i = move_option[0]
		var move_path: Array = move_option[1]
		var move_cost: int = move_option[2]
		var remaining_pips := enemy_pips - move_cost

		# Try Light Attack (1 pip, hits single tile)
		if remaining_pips >= Constants.LIGHT_ATTACK_COST:
			# Light attack can target any reachable tile within range 1
			for dir in Constants.CARDINAL_DIRECTIONS:
				var target_pos: Vector2i = final_pos + dir
				if not grid.is_within_bounds(target_pos):
					continue

				var plan := AttackPlan.new()
				plan.enemy_moves = _array_to_vector2i_array(move_path)
				plan.enemy_final_pos = final_pos
				plan.attack_type = Constants.CombatActionType.LIGHT_ATTACK
				plan.pattern = Constants.HeavyAttackPattern.ADJACENT
				plan.target_pos = target_pos
				plan.affected_tiles = [target_pos]
				plan.pip_cost = move_cost + Constants.LIGHT_ATTACK_COST

				evaluate_attack(plan, reachability, player_pos, player_hp, light_damage, ally_covered_tiles)
				plans.append(plan)

		# Try Heavy Attack - ADJACENT (single target, like light attack but stronger)
		if remaining_pips >= Constants.HEAVY_ATTACK_COST:
			for dir in Constants.CARDINAL_DIRECTIONS:
				var target_pos: Vector2i = final_pos + dir
				if not grid.is_within_bounds(target_pos):
					continue

				var plan := AttackPlan.new()
				plan.enemy_moves = _array_to_vector2i_array(move_path)
				plan.enemy_final_pos = final_pos
				plan.attack_type = Constants.CombatActionType.HEAVY_ATTACK
				plan.pattern = Constants.HeavyAttackPattern.ADJACENT
				plan.target_pos = target_pos
				plan.affected_tiles = [target_pos]
				plan.pip_cost = move_cost + Constants.HEAVY_ATTACK_COST

				evaluate_attack(plan, reachability, player_pos, player_hp, heavy_damage, ally_covered_tiles)
				plans.append(plan)

		# Try Heavy Attack patterns (3 pips each) - ROW_SWEEP, COLUMN_SWEEP, NOVA
		if remaining_pips >= Constants.HEAVY_ATTACK_COST:
			for pattern in [
				Constants.HeavyAttackPattern.ROW_SWEEP,
				Constants.HeavyAttackPattern.COLUMN_SWEEP,
				Constants.HeavyAttackPattern.NOVA
			]:
				var plan := AttackPlan.new()
				plan.enemy_moves = _array_to_vector2i_array(move_path)
				plan.enemy_final_pos = final_pos
				plan.attack_type = Constants.CombatActionType.HEAVY_ATTACK
				plan.pattern = pattern
				plan.target_pos = final_pos  # Pattern attacks use enemy position
				plan.affected_tiles = get_pattern_tiles(final_pos, pattern)
				plan.pip_cost = move_cost + Constants.HEAVY_ATTACK_COST

				evaluate_attack(plan, reachability, player_pos, player_hp, heavy_damage, ally_covered_tiles)
				plans.append(plan)

	return plans

## Convert generic Array to typed Array[Vector2i]
func _array_to_vector2i_array(arr: Array) -> Array[Vector2i]:
	var result: Array[Vector2i] = []
	for item in arr:
		result.append(item)
	return result

## Find the best attack plan from all options
## Optionally applies synergy bonuses if ally context is provided
func find_best_attack(
	plans: Array[AttackPlan],
	weights: BehaviorWeights = null,
	my_behavior: Constants.EnemyBehavior = Constants.EnemyBehavior.AGGRESSIVE,
	ally_behaviors: Array = [],
	ally_covered_tiles: Array = [],
	ally_escape_routes: Array = []
) -> AttackPlan:
	if plans.is_empty():
		return null

	var best_plan: AttackPlan = plans[0]
	var best_score: float = _score_with_synergy(
		best_plan, weights, my_behavior, ally_behaviors, ally_covered_tiles, ally_escape_routes
	)

	for plan in plans:
		var score := _score_with_synergy(
			plan, weights, my_behavior, ally_behaviors, ally_covered_tiles, ally_escape_routes
		)
		if score > best_score:
			best_score = score
			best_plan = plan

	return best_plan

## Calculate total score including synergy bonus
func _score_with_synergy(
	plan: AttackPlan,
	weights: BehaviorWeights,
	my_behavior: Constants.EnemyBehavior,
	ally_behaviors: Array,
	ally_covered_tiles: Array,
	ally_escape_routes: Array
) -> float:
	var base_score := plan.get_score(weights)

	# Don't apply synergy to invalid plans
	if base_score <= -1000.0:
		return base_score

	var synergy := TacticalAnalyzer.calculate_synergy_bonus(
		plan, my_behavior, ally_behaviors, ally_covered_tiles, ally_escape_routes
	)

	return base_score + synergy

## Generate positioning-only plans (when no good attack exists)
## Tries to move to positions that set up good attacks next turn
func generate_positioning_plans(
	enemy_pos: Vector2i,
	enemy_pips: int,
	player_pos: Vector2i,
	reachability: Dictionary
) -> Array[AttackPlan]:
	var plans: Array[AttackPlan] = []
	var move_options := get_enemy_move_options(enemy_pos, enemy_pips)

	for move_option in move_options:
		var final_pos: Vector2i = move_option[0]
		var move_path: Array = move_option[1]
		var move_cost: int = move_option[2]

		if move_path.is_empty():
			continue  # Skip standing still for positioning

		# Score this position based on attack potential next turn
		var plan := AttackPlan.new()
		plan.enemy_moves = _array_to_vector2i_array(move_path)
		plan.enemy_final_pos = final_pos
		plan.attack_type = Constants.CombatActionType.MOVE
		plan.pip_cost = move_cost
		plan.affected_tiles = []

		# Calculate coverage potential from this position
		var best_coverage := 0
		for pattern in [
			Constants.HeavyAttackPattern.ADJACENT,
			Constants.HeavyAttackPattern.ROW_SWEEP,
			Constants.HeavyAttackPattern.COLUMN_SWEEP,
			Constants.HeavyAttackPattern.NOVA
		]:
			var pattern_tiles := get_pattern_tiles(final_pos, pattern)
			var coverage := 0
			for tile_pos in reachability:
				if tile_pos in pattern_tiles:
					coverage += 1
			best_coverage = maxi(best_coverage, coverage)

		plan.tiles_covered = best_coverage

		# Prefer positions closer to player
		var distance: int = abs(final_pos.x - player_pos.x) + abs(final_pos.y - player_pos.y)
		plan.max_escape_cost = 4 - distance  # Invert so closer = higher score

		plans.append(plan)

	return plans
