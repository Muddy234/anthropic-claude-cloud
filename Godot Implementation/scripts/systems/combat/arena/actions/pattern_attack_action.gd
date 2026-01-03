class_name PatternAttackAction
extends CombatAction

## Heavy attack with a specific pattern (row sweep, column sweep, nova)
## Uses strain as resource cost

var pattern: Constants.HeavyAttackPattern = Constants.HeavyAttackPattern.ADJACENT
var affected_tiles: Array[Vector2i] = []  # Tiles that will be hit

func _init(p_source: Node, p_source_pos: Vector2i, p_pattern: Constants.HeavyAttackPattern) -> void:
	# Target position is the source position for pattern attacks
	super(p_source, p_source_pos)
	pattern = p_pattern
	action_type = Constants.CombatActionType.HEAVY_ATTACK
	priority = Constants.PRIORITY_SLOW
	strain_cost = Constants.HEAVY_ATTACK_STRAIN
	# Pre-calculate affected tiles immediately using the provided position
	# This ensures the correct position is used for telegraphs before any caching occurs
	affected_tiles = calculate_affected_tiles(p_source_pos)

func get_display_name() -> String:
	match pattern:
		Constants.HeavyAttackPattern.ROW_SWEEP:
			return "Row Sweep"
		Constants.HeavyAttackPattern.COLUMN_SWEEP:
			return "Column Sweep"
		Constants.HeavyAttackPattern.NOVA:
			return "Nova"
		_:
			return "Heavy Attack"

func get_icon_path() -> String:
	return "res://assets/ui/icons/heavy_attack.png"

## Calculate which tiles this pattern affects from the given source position
## Obstacles block attacks - sweeps stop at obstacles, nova skips obstacle tiles
func calculate_affected_tiles(source_pos: Vector2i, grid: ArenaGrid = null) -> Array[Vector2i]:
	var tiles: Array[Vector2i] = []

	match pattern:
		Constants.HeavyAttackPattern.ROW_SWEEP:
			# All tiles in the same row, stopping at obstacles
			# Sweep left from source
			for x in range(source_pos.x - 1, -1, -1):
				var tile_pos := Vector2i(x, source_pos.y)
				if grid and grid.blocks_attack(tile_pos):
					break  # Obstacle blocks further tiles
				tiles.append(tile_pos)
			# Sweep right from source
			for x in range(source_pos.x + 1, Constants.ARENA_SIZE.x):
				var tile_pos := Vector2i(x, source_pos.y)
				if grid and grid.blocks_attack(tile_pos):
					break  # Obstacle blocks further tiles
				tiles.append(tile_pos)

		Constants.HeavyAttackPattern.COLUMN_SWEEP:
			# All tiles in the same column, stopping at obstacles
			# Sweep up from source
			for y in range(source_pos.y - 1, -1, -1):
				var tile_pos := Vector2i(source_pos.x, y)
				if grid and grid.blocks_attack(tile_pos):
					break  # Obstacle blocks further tiles
				tiles.append(tile_pos)
			# Sweep down from source
			for y in range(source_pos.y + 1, Constants.ARENA_SIZE.y):
				var tile_pos := Vector2i(source_pos.x, y)
				if grid and grid.blocks_attack(tile_pos):
					break  # Obstacle blocks further tiles
				tiles.append(tile_pos)

		Constants.HeavyAttackPattern.NOVA:
			# All 8 surrounding tiles, skipping obstacles
			for dir in Constants.ALL_DIRECTIONS:
				var tile_pos: Vector2i = source_pos + dir
				if _is_within_bounds(tile_pos):
					if grid and grid.blocks_attack(tile_pos):
						continue  # Obstacle blocks this tile
					tiles.append(tile_pos)

		Constants.HeavyAttackPattern.ADJACENT:
			# Single adjacent tile (shouldn't use this class for this)
			pass

	return tiles

func _is_within_bounds(pos: Vector2i) -> bool:
	return pos.x >= 0 and pos.x < Constants.ARENA_SIZE.x and pos.y >= 0 and pos.y < Constants.ARENA_SIZE.y

func is_valid(grid: ArenaGrid) -> bool:
	if not super.is_valid(grid):
		return false

	if not source or not is_instance_valid(source):
		return false

	return true

func execute(grid: ArenaGrid, resolver: RefCounted) -> Dictionary:
	if not source or not is_instance_valid(source):
		return {"success": false, "action_type": action_type, "message": "Source no longer valid"}

	var source_pos: Vector2i = grid.get_combatant_position(source)
	affected_tiles = calculate_affected_tiles(source_pos, grid)

	# Check if source is exhausted (attacks deal 0 damage when exhausted)
	var damage_blocked := false
	if resolver.has_method("get_combatant_for_entity"):
		var source_combatant = resolver.get_combatant_for_entity(source)
		if source_combatant and source_combatant.is_exhausted():
			damage_blocked = true

	var total_damage := 0
	var targets_hit := 0
	var hit_results: Array[Dictionary] = []

	# Apply damage to all combatants in affected tiles
	for tile_pos in affected_tiles:
		var target := grid.get_combatant_at(tile_pos)
		if target and target != source:
			var damage_result := _calculate_damage(target)

			# Block damage if exhausted
			if damage_blocked:
				damage_result.damage = 0
				damage_result["damage_blocked"] = true

			if damage_result.damage > 0:
				if resolver.has_method("apply_damage_to_entity"):
					resolver.apply_damage_to_entity(target, damage_result.damage, source)
				else:
					target.take_damage(damage_result.damage, source)

				total_damage += damage_result.damage

			targets_hit += 1
			hit_results.append({
				"target": target,
				"tile": tile_pos,
				"damage": damage_result.damage,
				"damage_blocked": damage_blocked,
				"is_crit": damage_result.get("is_crit", false)
			})

			EventBus.arena_combatant_attacked.emit(source, tile_pos, damage_result)

	var message := "%s hit %d targets for %d total damage" % [get_display_name(), targets_hit, total_damage]
	if damage_blocked:
		message = "%s attack blocked (exhausted)" % get_display_name()

	return {
		"success": true,
		"action_type": action_type,
		"pattern": pattern,
		"from": source_pos,
		"affected_tiles": affected_tiles,
		"targets_hit": targets_hit,
		"total_damage": total_damage,
		"damage_blocked": damage_blocked,
		"hit_results": hit_results,
		"message": message
	}

func _calculate_damage(target: Node) -> Dictionary:
	# Use fixed damage value for heavy/pattern attacks
	var damage := Constants.HEAVY_ATTACK_DAMAGE

	# Check if target has defense
	var defense: int = 0
	if target.has_method("get_stat"):
		defense = target.get_stat("defense")

	# Apply defense reduction (minimum 1 damage)
	var final_damage := maxi(Constants.MIN_DAMAGE, damage - defense)

	return {"damage": final_damage, "is_crit": false}

## Convert to dictionary for serialization/signals
func to_dict() -> Dictionary:
	var base_dict := super.to_dict()
	base_dict["pattern"] = pattern
	# Use pre-calculated affected tiles, recalculate only if empty
	if affected_tiles.is_empty():
		affected_tiles = calculate_affected_tiles(target_position)
	base_dict["affected_tiles"] = affected_tiles
	return base_dict
