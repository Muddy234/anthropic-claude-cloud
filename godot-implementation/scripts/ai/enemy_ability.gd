## scripts/ai/enemy_ability.gd
## Manages ability assignment, cooldowns, telegraph, and execution for a single enemy.
## Priority selection: heal if low HP > AoE if multiple targets > ranged if far > melee if close.
class_name EnemyAbility
extends Node

# --- Signals ---
signal ability_started(ability_id: StringName)
signal ability_executed(ability_id: StringName, target: Node)
signal telegraph_shown(position: Vector2i, duration: float, color: Color)

# --- Config ---
const DEFAULT_TELEGRAPH_TIME: float = 0.5
const GLOBAL_COOLDOWN_BASE: float = 1.0
const ABILITY_USE_CHANCE: float = 0.25
const ELITE_ABILITY_CHANCE: float = 0.4

# --- State ---
var enemy: Enemy = null
var ability_set: Array[Resource] = []  # Array of AbilityData resources
var signature_ability: Resource = null  # Primary ability
var cooldowns: Dictionary = {}  # ability_id -> float remaining
var global_cooldown: float = 0.0
var is_executing: bool = false

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
	enemy = get_parent() as Enemy
	if enemy and enemy.monster_data:
		_assign_abilities()

func _process(delta: float) -> void:
	global_cooldown = maxf(0.0, global_cooldown - delta)
	for key in cooldowns:
		cooldowns[key] = maxf(0.0, cooldowns[key] - delta)

# -----------------------------------------------------------------
# Ability Assignment
# -----------------------------------------------------------------

func _assign_abilities() -> void:
	# MonsterData doesn't have an abilities array directly,
	# so we assign abilities based on tier and element
	var tier_scaling: Dictionary = Constants.ABILITY_TIER_SCALING.get(
		_get_monster_tier_enum(), {}
	)
	var dmg_mult: float = tier_scaling.get("damage_multiplier", 1.0)
	var range_mult: float = tier_scaling.get("range_multiplier", 1.0)

	# Create a basic attack ability from monster data
	var basic_attack := AbilityData.new()
	basic_attack.id = enemy.entity_id + "_basic"
	basic_attack.display_name = enemy.monster_data.attack_name if enemy.monster_data.attack_name else "Attack"
	basic_attack.damage = float(enemy.base_damage) * dmg_mult
	basic_attack.range_tiles = float(enemy.combat_attack_range) * range_mult
	basic_attack.telegraph_time = 0.5
	basic_attack.cooldown = enemy.combat_attack_speed
	basic_attack.category = _get_attack_category()
	ability_set.append(basic_attack)
	cooldowns[basic_attack.id] = 0.0
	signature_ability = basic_attack

	# Elite enemies get a special ability
	if enemy.monster_data.elite:
		var special := AbilityData.new()
		special.id = enemy.entity_id + "_special"
		special.display_name = "Special Attack"
		special.damage = float(enemy.base_damage) * dmg_mult * 1.5
		special.range_tiles = float(enemy.combat_attack_range + 1) * range_mult
		special.telegraph_time = 0.8
		special.cooldown = enemy.combat_attack_speed * 3.0
		special.category = Constants.AttackCategory.AREA
		ability_set.append(special)
		cooldowns[special.id] = 0.0

func _get_monster_tier_enum() -> int:
	match enemy.tier:
		&"TIER_3": return Constants.MonsterTier.TIER_3
		&"TIER_2": return Constants.MonsterTier.TIER_2
		&"TIER_1": return Constants.MonsterTier.TIER_1
		&"ELITE": return Constants.MonsterTier.ELITE
		&"BOSS": return Constants.MonsterTier.BOSS
		_: return Constants.MonsterTier.TIER_3

func _get_attack_category() -> int:
	if enemy.monster_data == null:
		return Constants.AttackCategory.MELEE
	var atk_type: int = enemy.monster_data.attack_type
	match atk_type:
		Constants.AttackType.PHYSICAL:
			if enemy.combat_attack_range > 1:
				return Constants.AttackCategory.RANGED
			return Constants.AttackCategory.MELEE
		Constants.AttackType.MAGIC:
			return Constants.AttackCategory.MAGIC
		_:
			return Constants.AttackCategory.MELEE

# -----------------------------------------------------------------
# Try Use Ability (called by AI during attack phase)
# -----------------------------------------------------------------

func try_use_ability(target: Node) -> bool:
	if is_executing or global_cooldown > 0.0:
		return false
	if ability_set.is_empty():
		return false

	# Roll chance
	var chance: float = ELITE_ABILITY_CHANCE if enemy.tier == &"ELITE" else ABILITY_USE_CHANCE
	if randf() > chance:
		return false

	# Priority selection
	var selected: Resource = _select_ability(target)
	if selected == null:
		return false

	_execute_ability(selected, target)
	return true

func _select_ability(target: Node) -> Resource:
	var dist: float = enemy._grid_distance_to(target)
	var hp_pct: float = float(enemy.hp) / float(enemy.max_hp)

	# Priority 1: Heal if low HP
	if hp_pct < 0.3:
		var heal_ability := _find_ability_by_category(Constants.AttackCategory.BUFF)
		if heal_ability:
			return heal_ability

	# Priority 2: AoE if multiple targets nearby
	var nearby_count := _count_nearby_targets(target, 3.0)
	if nearby_count >= 2:
		var aoe_ability := _find_ability_by_category(Constants.AttackCategory.AREA)
		if aoe_ability and _is_ability_ready(aoe_ability) and _is_in_range(aoe_ability, dist):
			return aoe_ability

	# Priority 3: Ranged if far
	if dist > 2.0:
		var ranged_ability := _find_ability_by_category(Constants.AttackCategory.RANGED)
		if ranged_ability and _is_ability_ready(ranged_ability) and _is_in_range(ranged_ability, dist):
			return ranged_ability
		var magic_ability := _find_ability_by_category(Constants.AttackCategory.MAGIC)
		if magic_ability and _is_ability_ready(magic_ability) and _is_in_range(magic_ability, dist):
			return magic_ability

	# Priority 4: Melee if close
	if dist <= 1.5:
		var melee_ability := _find_ability_by_category(Constants.AttackCategory.MELEE)
		if melee_ability and _is_ability_ready(melee_ability) and _is_in_range(melee_ability, dist):
			return melee_ability

	# Fallback: any ready ability in range
	for ability in ability_set:
		if _is_ability_ready(ability) and _is_in_range(ability, dist):
			return ability

	return null

func _find_ability_by_category(category: int) -> Resource:
	for ability in ability_set:
		if ability.category == category:
			return ability
	return null

func _is_ability_ready(ability: Resource) -> bool:
	var aid: String = ability.id
	return cooldowns.get(aid, 0.0) <= 0.0

func _is_in_range(ability: Resource, dist: float) -> bool:
	var ability_range: float = ability.range_tiles if ability.range_tiles else 1.0
	return dist <= ability_range

func _count_nearby_targets(primary_target: Node, radius: float) -> int:
	# Count player-allied entities near the target position
	var count := 1  # The primary target
	# In a single-player game, this is typically just 1
	# Could count player summons or allies if they exist
	return count

# -----------------------------------------------------------------
# Execute Ability
# -----------------------------------------------------------------

func _execute_ability(ability: Resource, target: Node) -> void:
	is_executing = true
	var aid: String = ability.id
	ability_started.emit(StringName(aid))
	enemy.ability_used.emit(StringName(aid))

	# Telegraph
	var telegraph_time: float = ability.telegraph_time if ability.telegraph_time else DEFAULT_TELEGRAPH_TIME
	telegraph_shown.emit(target.grid_position, telegraph_time, Color.RED)
	EventBus.emit_signal("attack_telegraph", enemy, target.grid_position, telegraph_time, Color.RED)

	# Wait for telegraph, then apply
	await get_tree().create_timer(telegraph_time).timeout

	if enemy._is_dead or target.get(&"_is_dead"):
		is_executing = false
		return

	# Check range again after telegraph
	var dist: float = enemy._grid_distance_to(target)
	var ability_range: float = ability.range_tiles if ability.range_tiles else 1.0
	if dist > ability_range + 1.0:
		is_executing = false
		return

	# Apply damage
	var damage: int = int(ability.damage) if ability.damage else enemy.base_damage
	EventBus.emit_signal("ability_damage", enemy, target, damage, ability)

	# Apply effects
	_apply_ability_effects(ability, target)

	ability_executed.emit(StringName(aid), target)

	# Set cooldowns
	cooldowns[aid] = ability.cooldown if ability.cooldown else 5.0
	global_cooldown = GLOBAL_COOLDOWN_BASE

	is_executing = false

func _apply_ability_effects(ability: Resource, target: Node) -> void:
	if ability.effect == null or ability.effect == "":
		return

	match ability.effect:
		"knockback":
			# Push target away from enemy
			if target.has_method("take_damage"):
				var dir := Vector2(target.grid_position - enemy.grid_position).normalized()
				var force := int(ability.knockback_force) if ability.knockback_force else 2
				target.grid_position += Vector2i(roundi(dir.x * force), roundi(dir.y * force))
				target.snap_to_grid()
		"stun":
			if target is Entity:
				target.is_stunned = true
				var duration: float = ability.stun_duration if ability.stun_duration else 1.0
				get_tree().create_timer(duration).timeout.connect(func(): target.is_stunned = false)
		"burn":
			# Apply DoT
			var dot_dmg: float = ability.dot_damage if ability.dot_damage else 5.0
			var dot_dur: float = ability.dot_duration if ability.dot_duration else 3.0
			EventBus.emit_signal("hazard_damage", target, dot_dmg, "burn")
		"slow":
			if target is Entity:
				var slow_amt: float = ability.slow_amount if ability.slow_amount else 0.5
				var slow_dur: float = ability.slow_duration if ability.slow_duration else 3.0
				target.speed *= (1.0 - slow_amt)
				get_tree().create_timer(slow_dur).timeout.connect(
					func(): target.speed /= (1.0 - slow_amt)
				)
