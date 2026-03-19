class_name CombatSystem
extends Node

## Main combat system - handles attacks, damage calculation, and combat state

# Configuration
const BASE_ATTACK_TIME := 0.7  # Base attack speed in seconds
const ENGAGE_DELAY := 0.4  # Initial delay when engaging
const MIN_DAMAGE := 1
const MISS_CHANCE := 0.08  # Base 8% miss chance
const CRIT_MULTIPLIER := 1.5
const GRAZE_MULTIPLIER := 0.5
const COMBAT_DISENGAGE_TIME := 2.0  # Seconds without combat before auto-disengage

# Ambush configuration
const AMBUSH_DAMAGE_MULTIPLIER := 1.5
const AMBUSH_GUARANTEED_CRIT := true
const AMBUSH_SIDE_ANGLE_THRESHOLD := 60.0  # Degrees from facing
const UNAWARE_STATES := [
	Constants.AIState.IDLE,
	Constants.AIState.WANDERING,
	Constants.AIState.RETURNING,
	Constants.AIState.SEARCHING
]

# Signals
signal attack_performed(attacker: Entity, defender: Entity, result: Dictionary)
signal combat_engaged(attacker: Entity, target: Entity)
signal combat_disengaged(entity: Entity)
signal entity_died(entity: Entity, killer: Entity)

# References
var damage_calculator: DamageCalculator
var attack_token_system: AttackTokenSystem

func _ready():
	damage_calculator = DamageCalculator.new()
	add_child(damage_calculator)

	attack_token_system = AttackTokenSystem.new()
	add_child(attack_token_system)

## Calculate attack result without applying damage
func calculate_attack(attacker: Entity, defender: Entity, room = null) -> Dictionary:
	var result := {
		"is_hit": true,
		"is_crit": false,
		"is_graze": false,
		"is_ambush": false,
		"final_damage": 0,
		"damage_type": Constants.DamageType.PHYSICAL,
		"messages": []
	}

	# Hit calculation
	var hit_chance := 1.0 - MISS_CHANCE
	hit_chance += (attacker.speed - defender.speed) * 0.01
	hit_chance = clampf(hit_chance, 0.1, 0.99)

	var roll := randf()
	if roll > hit_chance:
		result.is_hit = false
		result.messages.append("MISS")
		return result
	elif roll > hit_chance * 0.85:
		result.is_graze = true

	# Crit calculation
	var crit_chance := attacker.get_crit_chance()
	if randf() < crit_chance:
		result.is_crit = true
		result.messages.append("CRITICAL")

	# Base damage calculation
	var base_damage := _get_attack_damage(attacker)

	# Apply defense reduction
	var damage := base_damage - defender.defense
	damage = maxi(MIN_DAMAGE, damage)

	# Apply multipliers
	if result.is_crit:
		damage = int(damage * CRIT_MULTIPLIER)
	elif result.is_graze:
		damage = int(damage * GRAZE_MULTIPLIER)

	result.final_damage = damage
	return result

## Perform a full attack (calculate and apply damage)
func perform_attack(attacker: Entity, defender: Entity) -> Dictionary:
	var result := calculate_attack(attacker, defender)

	# Check for ambush (player attacking unaware enemy)
	if attacker is Player and defender is Enemy:
		if _check_ambush(attacker, defender):
			result.is_ambush = true
			if AMBUSH_GUARANTEED_CRIT and not result.is_crit:
				result.is_crit = true
				result.final_damage = int(result.final_damage * CRIT_MULTIPLIER)
			result.final_damage = int(result.final_damage * AMBUSH_DAMAGE_MULTIPLIER)
			result.messages.append("AMBUSH!")

	# Apply damage if hit
	if result.is_hit:
		apply_damage(defender, result.final_damage, attacker, result)
		_apply_weapon_effects(attacker, defender, result)

	attack_performed.emit(attacker, defender, result)
	return result

## Apply damage to an entity
func apply_damage(entity: Entity, damage: int, source: Entity, result: Dictionary = {}):
	# Validate damage
	if not is_instance_valid(entity):
		return

	damage = maxi(1, damage)

	# Apply damage
	entity.current_hp -= damage

	# Visual feedback
	_show_damage_number(entity, damage, result)

	# Notify AI of damage (enemies react to being hit)
	if entity is Enemy and entity.ai:
		entity.ai.on_damaged(source)

	# Check for death
	if entity.current_hp <= 0:
		_handle_death(entity, source)

## Engage combat between two entities
func engage_combat(attacker: Entity, target: Entity):
	if not attacker or not target:
		return

	# Don't re-engage same target
	if attacker.combat_target == target and attacker.is_in_combat:
		return

	attacker.is_in_combat = true
	attacker.combat_target = target
	attacker.attack_cooldown = ENGAGE_DELAY

	combat_engaged.emit(attacker, target)

	# Target retaliates if able
	if target is Enemy and not target.is_in_combat:
		engage_combat(target, attacker)

## Disengage from combat
func disengage_combat(entity: Entity):
	if not entity:
		return

	entity.is_in_combat = false
	entity.combat_target = null
	entity.attack_cooldown = 0.0

	combat_disengaged.emit(entity)

## Check if attacker can reach target
func can_attack_target(attacker: Entity, target: Entity) -> bool:
	if not target or not is_instance_valid(target):
		return false

	# Check range
	var distance := _get_distance(attacker, target)
	var attack_range: float = attacker.attack_range if attacker.attack_range else 1.0

	return distance <= attack_range + 0.5  # Small buffer for diagonal

## Execute a skill
func execute_skill(caster: Entity, skill: SkillData, target) -> Dictionary:
	var targets := _resolve_targets(caster, skill, target)
	var results := []

	for t in targets:
		var result := {
			"target": t,
			"damage": 0,
			"effects_applied": []
		}

		if skill.damage_multiplier > 0:
			var _base := _get_attack_damage(caster)
			var damage := int(_base * skill.damage_multiplier)
			damage = maxi(1, damage - t.defense)
			apply_damage(t, damage, caster, {"skill": skill})
			result.damage = damage

		# Apply skill effects
		for effect in skill.effects:
			_apply_effect(effect, t, caster)
			result.effects_applied.append(effect)

		results.append(result)

	return {"targets": results, "skill": skill}

# === PRIVATE METHODS ===

func _get_attack_damage(entity: Entity) -> int:
	var _base := entity.attack

	if entity is Player:
		var weapon = entity.get_equipped_weapon()
		if weapon:
			return entity.attack + randi_range(weapon.damage_min, weapon.damage_max)

	return entity.attack

func _get_distance(entity1: Entity, entity2: Entity) -> float:
	var dx: int = abs(entity1.grid_pos.x - entity2.grid_pos.x)
	var dy: int = abs(entity1.grid_pos.y - entity2.grid_pos.y)
	return maxf(dx, dy)  # Chebyshev distance

func _check_ambush(attacker: Entity, defender: Enemy) -> bool:
	# Check if defender is in unaware state
	if not defender.ai:
		return false

	if defender.ai.current_state not in UNAWARE_STATES:
		return false

	# Check angle (player must be behind or to side of enemy)
	var dx := attacker.grid_pos.x - defender.grid_pos.x
	var dy := attacker.grid_pos.y - defender.grid_pos.y
	var angle_to_player := rad_to_deg(atan2(dy, dx))

	var facing_angles := {"right": 0, "down": 90, "left": 180, "up": -90}
	var facing_angle: float = facing_angles.get(defender.facing, 0)

	var angle_diff := absf(angle_to_player - facing_angle)
	if angle_diff > 180:
		angle_diff = 360 - angle_diff

	return angle_diff > AMBUSH_SIDE_ANGLE_THRESHOLD

func _handle_death(entity: Entity, killer: Entity):
	if entity is Player:
		GameManager.game_over()
		return

	# Enemy death
	disengage_combat(entity)

	# Grant XP to killer
	if killer is Player and entity is Enemy:
		var xp_value: int = entity.monster_data.xp_value if entity.monster_data else 10
		killer.gain_xp(xp_value)

	entity_died.emit(entity, killer)

func _show_damage_number(entity: Entity, damage: int, result: Dictionary):
	# Create floating damage number
	var dmg_number = preload("res://scenes/effects/damage_number.tscn").instantiate()
	dmg_number.position = entity.position
	dmg_number.setup(damage, result.get("is_crit", false), result.get("is_ambush", false))
	GameManager.get_current_scene().add_child(dmg_number)

func _apply_weapon_effects(attacker: Entity, defender: Entity, result: Dictionary):
	if not attacker is Player:
		return

	var weapon = attacker.get_equipped_weapon()
	if not weapon:
		return

	# Blade weapons: chance to cause bleeding
	if weapon.damage_type == "blade":
		var bleed_chance: float = weapon.bleed_chance if weapon.bleed_chance else 0.15
		if randf() < bleed_chance:
			GameManager.status_effect_system.apply_effect(defender, "bleeding", attacker)

	# Blunt weapons: chance to cause stun
	elif weapon.damage_type == "blunt":
		var stun_chance: float = weapon.stun_chance if weapon.stun_chance else 0.15
		if randf() < stun_chance:
			GameManager.status_effect_system.apply_effect(defender, "stunned", attacker)

func _apply_effect(effect: EffectData, target: Entity, source: Entity):
	var status := StatusEffect.new()
	status.init_from_data(effect, source)
	target.apply_status(status)

func _resolve_targets(caster: Entity, skill: SkillData, target) -> Array:
	match skill.target_type:
		"self":
			return [caster]
		"single":
			return [target] if target else []
		"aoe":
			return _get_entities_in_radius(target, skill.aoe_radius)
		"line":
			return _get_entities_in_line(caster.grid_pos, target)
		"cone":
			return _get_entities_in_cone(caster.grid_pos, target, skill.aoe_radius)
	return []

func _get_entities_in_radius(center: Vector2i, radius: int) -> Array:
	var entities := []
	for enemy in GameManager.enemies:
		if enemy.grid_pos.distance_to(center) <= radius:
			entities.append(enemy)
	return entities

func _get_entities_in_line(_from: Vector2i, _to: Vector2i) -> Array:
	# TODO: Implement line targeting
	return []

func _get_entities_in_cone(_from: Vector2i, _direction: Vector2i, _radius: int) -> Array:
	# TODO: Implement cone targeting
	return []
