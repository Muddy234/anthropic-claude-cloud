class_name EnemySpawner
extends RefCounted
## Monster selection and placement system.
## Selects enemies based on room element, floor difficulty, and tier weights,
## then places them using tactical spawn patterns with spacing enforcement.

# --- Configuration Constants ---
const BASE_DENSITY: float = 0.06
const BASE_COUNT: int = 3
const COUNT_VARIANCE: int = 2
const MIN_ENEMIES: int = 1
const MAX_ENEMIES: int = 9
const MIN_SPACING: int = 2
const MAX_PLACEMENT_ATTEMPTS: int = 30
const TACTICAL_PATTERN_CHANCE: float = 0.60
const FLOOR_SCALE_FACTOR: float = 0.15

## Tier weight tables by distance category
## [tier3, tier2, tier1, elite]
const TIER_WEIGHTS_NEAR: Array = [80.0, 18.0, 2.0, 0.0]
const TIER_WEIGHTS_MID: Array = [50.0, 35.0, 12.0, 3.0]
const TIER_WEIGHTS_FAR: Array = [25.0, 35.0, 30.0, 10.0]

## Element interaction multipliers
const ELEMENT_MATCH_BONUS: float = 3.0
const ELEMENT_OPPOSED_PENALTY: float = 0.3
const ELEMENT_COMPLEMENTARY: float = 1.5
const NATIVE_ROOM_BONUS: float = 2.0

## Opposed element pairs
const OPPOSED_ELEMENTS: Dictionary = {
	Constants.Element.FIRE: Constants.Element.ICE,
	Constants.Element.ICE: Constants.Element.FIRE,
	Constants.Element.EARTH: Constants.Element.ARCANE,
	Constants.Element.ARCANE: Constants.Element.EARTH,
	Constants.Element.DEATH: Constants.Element.HOLY,
	Constants.Element.HOLY: Constants.Element.DEATH,
}

## Complementary element sets
const COMPLEMENTARY_ELEMENTS: Dictionary = {
	Constants.Element.FIRE: [Constants.Element.EARTH],
	Constants.Element.ICE: [Constants.Element.WATER, Constants.Element.ARCANE],
	Constants.Element.EARTH: [Constants.Element.NATURE, Constants.Element.FIRE],
	Constants.Element.DEATH: [Constants.Element.DARK],
	Constants.Element.ARCANE: [Constants.Element.ICE],
	Constants.Element.NATURE: [Constants.Element.EARTH, Constants.Element.WATER],
}

## Spawn pattern types
enum SpawnPattern { PATROL, AMBUSH, GUARD, CLUSTER, SCATTERED }


# =========================================================================
#  Inner Classes
# =========================================================================

class SpawnResult extends RefCounted:
	var entries: Array = []           # Array[SpawnEntry]
	var total_count: int = 0
	var pattern: int = SpawnPattern.SCATTERED
	var difficulty_rating: float = 0.0


class SpawnEntry extends RefCounted:
	var monster_id: String = ""
	var position: Vector2i = Vector2i.ZERO
	var tier: int = Constants.MonsterTier.TIER_3
	var element: int = Constants.Element.PHYSICAL
	var level: int = 1
	var scale_factor: float = 1.0
	var behavior: String = "wander"   # wander, patrol, ambush, guard
	var patrol_points: Array = []     # Array[Vector2i] for patrol behavior


# =========================================================================
#  Main Spawn Logic
# =========================================================================

func spawn_enemies_in_room(
	room: Dictionary,
	valid_tiles: Array,
	floor_number: int,
	existing_enemies: Array,
	player_pos: Vector2i
) -> SpawnResult:
	var rng := SeededRNG.new(room.get("id", 0) * 9973 + floor_number * 6991)
	var result := SpawnResult.new()

	if valid_tiles.is_empty():
		return result

	# --- Calculate Enemy Count ---
	var area: int = room.get("area", valid_tiles.size())
	var room_type: String = room.get("room_type", "combat")
	var base_count: float = area * BASE_DENSITY + BASE_COUNT
	var variance: int = rng.random_int(0, COUNT_VARIANCE)
	var count: int = int(base_count) + variance

	# Room type modifiers
	match room_type:
		"entrance":
			count = clampi(count / 2, 1, 3)
		"shrine":
			count = clampi(count - 2, 0, 2)
		"treasure":
			count = clampi(int(count * 1.5), 2, MAX_ENEMIES)
		"combat":
			pass  # Default

	# Floor scaling
	count = clampi(count + floor_number / 3, MIN_ENEMIES, MAX_ENEMIES)

	if room_type == "shrine" and count == 0:
		return result

	# --- Determine Distance Category ---
	var distance: float = room.get("distance_from_entrance", 50.0)
	var max_distance: float = room.get("max_distance", 200.0)
	var norm_distance: float = distance / maxf(max_distance, 1.0)

	var tier_weights: Array
	if norm_distance < 0.33:
		tier_weights = TIER_WEIGHTS_NEAR.duplicate()
	elif norm_distance < 0.66:
		tier_weights = TIER_WEIGHTS_MID.duplicate()
	else:
		tier_weights = TIER_WEIGHTS_FAR.duplicate()

	# --- Select Spawn Pattern ---
	var pattern: int
	if rng.chance(TACTICAL_PATTERN_CHANCE):
		var tactical_patterns: Array = [SpawnPattern.PATROL, SpawnPattern.AMBUSH, SpawnPattern.GUARD, SpawnPattern.CLUSTER]
		pattern = rng.choose(tactical_patterns)
	else:
		pattern = SpawnPattern.SCATTERED
	result.pattern = pattern

	# --- Select and Place Enemies ---
	var room_element: int = room.get("element", Constants.Element.PHYSICAL)
	var occupied_positions: Dictionary = {}

	# Mark existing enemy positions
	for enemy in existing_enemies:
		if enemy is Dictionary:
			var epos: Vector2i = enemy.get("position", Vector2i(-100, -100))
			occupied_positions[epos] = true

	var scale_factor: float = 1.0 + (floor_number - 1) * FLOOR_SCALE_FACTOR

	for i in range(count):
		var entry := SpawnEntry.new()

		# Select tier
		var tiers: Array = [
			Constants.MonsterTier.TIER_3,
			Constants.MonsterTier.TIER_2,
			Constants.MonsterTier.TIER_1,
			Constants.MonsterTier.ELITE,
		]
		entry.tier = rng.weighted_choice(tiers, tier_weights)

		# Select element (weighted by room element)
		entry.element = _select_element(rng, room_element)

		# Select monster ID
		entry.monster_id = _select_monster(rng, entry.tier, entry.element, room_element)

		# Set level and scaling
		entry.level = floor_number
		entry.scale_factor = scale_factor

		# Set behavior based on pattern
		entry.behavior = _get_behavior_for_pattern(pattern, i, count)

		# Find valid position with spacing
		var pos := _find_spawn_position(rng, valid_tiles, occupied_positions, player_pos)
		if pos.x < 0:
			continue  # Could not find valid position

		entry.position = pos
		occupied_positions[pos] = true

		# Generate patrol points for patrol behavior
		if entry.behavior == "patrol":
			entry.patrol_points = _generate_patrol_points(rng, pos, valid_tiles, 3)

		result.entries.append(entry)
		result.difficulty_rating += _tier_difficulty(entry.tier) * scale_factor

	result.total_count = result.entries.size()
	return result


# =========================================================================
#  Element Selection
# =========================================================================

func _select_element(rng: SeededRNG, room_element: int) -> int:
	var elements: Array = [
		Constants.Element.PHYSICAL,
		Constants.Element.FIRE,
		Constants.Element.ICE,
		Constants.Element.EARTH,
		Constants.Element.DEATH,
		Constants.Element.ARCANE,
		Constants.Element.NATURE,
	]
	var weights: Array = []

	for element in elements:
		var weight: float = 1.0

		if element == room_element:
			weight *= ELEMENT_MATCH_BONUS * NATIVE_ROOM_BONUS
		elif _is_opposed(element, room_element):
			weight *= ELEMENT_OPPOSED_PENALTY
		elif _is_complementary(element, room_element):
			weight *= ELEMENT_COMPLEMENTARY
		else:
			weight *= 1.0

		weights.append(weight)

	return rng.weighted_choice(elements, weights)


func _is_opposed(element_a: int, element_b: int) -> bool:
	return OPPOSED_ELEMENTS.get(element_a, -1) == element_b


func _is_complementary(element_a: int, element_b: int) -> bool:
	var comp: Array = COMPLEMENTARY_ELEMENTS.get(element_a, [])
	return element_b in comp


# =========================================================================
#  Monster Selection
# =========================================================================

func _select_monster(rng: SeededRNG, tier: int, element: int, room_element: int) -> String:
	## Selects a monster ID based on tier and element.
	## In a full implementation this would query a monster database.
	## For now, generates a deterministic ID from parameters.
	var tier_prefix: String
	match tier:
		Constants.MonsterTier.TIER_3:
			tier_prefix = "t3"
		Constants.MonsterTier.TIER_2:
			tier_prefix = "t2"
		Constants.MonsterTier.TIER_1:
			tier_prefix = "t1"
		Constants.MonsterTier.ELITE:
			tier_prefix = "elite"
		_:
			tier_prefix = "t3"

	var element_name: String = _element_name(element)
	return "%s_%s_%d" % [tier_prefix, element_name, rng.random_int(1, 5)]


func _element_name(element: int) -> String:
	match element:
		Constants.Element.FIRE: return "fire"
		Constants.Element.ICE: return "ice"
		Constants.Element.EARTH: return "earth"
		Constants.Element.DEATH: return "death"
		Constants.Element.ARCANE: return "arcane"
		Constants.Element.NATURE: return "nature"
		Constants.Element.WATER: return "water"
		Constants.Element.DARK: return "dark"
		Constants.Element.HOLY: return "holy"
		_: return "physical"


# =========================================================================
#  Spawn Patterns
# =========================================================================

func _get_behavior_for_pattern(pattern: int, index: int, total: int) -> String:
	match pattern:
		SpawnPattern.PATROL:
			return "patrol"
		SpawnPattern.AMBUSH:
			return "ambush"
		SpawnPattern.GUARD:
			if index == 0:
				return "guard"
			elif index < total / 2:
				return "patrol"
			else:
				return "wander"
		SpawnPattern.CLUSTER:
			return "wander"
		SpawnPattern.SCATTERED:
			return "wander"
		_:
			return "wander"


# =========================================================================
#  Position Finding
# =========================================================================

func _find_spawn_position(
	rng: SeededRNG,
	valid_tiles: Array,
	occupied: Dictionary,
	player_pos: Vector2i
) -> Vector2i:
	for _attempt in range(MAX_PLACEMENT_ATTEMPTS):
		var pos: Vector2i = rng.choose(valid_tiles)
		if pos == null:
			continue

		# Check minimum spacing from occupied positions (Chebyshev distance)
		var too_close := false
		for occ_pos in occupied:
			var dx: int = absi(pos.x - occ_pos.x)
			var dy: int = absi(pos.y - occ_pos.y)
			if maxi(dx, dy) < MIN_SPACING:
				too_close = true
				break

		if too_close:
			continue

		# Avoid spawning on top of player
		var pdx: int = absi(pos.x - player_pos.x)
		var pdy: int = absi(pos.y - player_pos.y)
		if maxi(pdx, pdy) < 3:
			continue

		return pos

	return Vector2i(-1, -1)


func _generate_patrol_points(rng: SeededRNG, start: Vector2i, valid_tiles: Array, count: int) -> Array:
	var points: Array = [start]
	var valid_set: Dictionary = {}
	for t in valid_tiles:
		valid_set[t] = true

	for _i in range(count):
		var last_point: Vector2i = points.back()
		var best_point: Vector2i = last_point
		var best_dist: float = 0.0

		for _attempt in range(10):
			var candidate: Vector2i = rng.choose(valid_tiles)
			if candidate == null:
				continue
			var dist: float = float(candidate.distance_to(last_point))
			if dist > 3.0 and dist < 12.0 and dist > best_dist:
				best_dist = dist
				best_point = candidate

		if best_point != last_point:
			points.append(best_point)

	return points


# =========================================================================
#  Difficulty Calculation
# =========================================================================

func _tier_difficulty(tier: int) -> float:
	match tier:
		Constants.MonsterTier.TIER_3: return 1.0
		Constants.MonsterTier.TIER_2: return 2.0
		Constants.MonsterTier.TIER_1: return 3.5
		Constants.MonsterTier.ELITE: return 6.0
		Constants.MonsterTier.BOSS: return 15.0
		_: return 1.0
