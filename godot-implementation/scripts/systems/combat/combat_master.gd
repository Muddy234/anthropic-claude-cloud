class_name CombatMaster
extends BaseSystem
## Main combat orchestrator. Handles engagement tracking, damage application with
## modifiers, death handling, ambush detection, knockback, screen shake, and
## auto-attack timing.

# --- Signals ---

signal combat_engaged(entity_a: Node, entity_b: Node)
signal combat_disengaged(entity: Node)
signal damage_applied(target: Node, amount: int, source: Node, context: Dictionary)
signal entity_died(entity: Node, killer: Node)
signal ambush_triggered(attacker: Node, defender: Node)
signal knockback_applied(target: Node, direction: Vector2, distance: float)
signal screen_shake_triggered(intensity: float, duration: float, direction: Vector2)
signal xp_awarded(amount: int, source: Node)

# --- Configuration ---

## Base attack interval in seconds (440 ms)
const BASE_ATTACK_TIME: float = 0.44

## Delay before a new engagement fully activates
const ENGAGE_DELAY: float = 0.4

## Time with no combat actions before auto-disengage (30 seconds)
const COMBAT_DISENGAGE_TIME: float = 30.0

## Weapon-specific attack times (seconds)
const WEAPON_ATTACK_TIMES: Dictionary = {
	&"sword":      0.44,
	&"greatsword": 0.70,
	&"axe":        0.55,
	&"mace":       0.50,
	&"dagger":     0.30,
	&"spear":      0.48,
	&"rapier":     0.35,
	&"hammer":     0.65,
	&"staff":      0.55,
	&"fist":       0.38,
}

## Ambush configuration
const AMBUSH_DAMAGE_MULT: float = 1.5
const AMBUSH_GUARANTEED_CRIT: bool = true
const AMBUSH_SIDE_ANGLE: float = 60.0  # degrees from front that counts as "aware"
const AMBUSH_UNAWARE_STATES: Array[StringName] = [&"idle", &"patrol", &"wander", &"sleeping"]

## XP rewards by enemy tier
const XP_REWARDS: Dictionary = {
	&"TIER_3": 15,
	&"TIER_2": 30,
	&"TIER_1": 55,
	&"ELITE":  100,
	&"BOSS":   500,
}

## Knockback configuration
const KNOCKBACK_WALL_DAMAGE_PERCENT: float = 0.10

## I-frame duration after taking a hit (seconds)
const IFRAME_DURATION: float = 0.15

## Hit flash duration (seconds)
const HIT_FLASH_DURATION: float = 0.10

# --- Combat tracking ---

## Dictionary of entity_instance_id -> combat state dict
## State: { target: Node, timer: float, attack_timer: float, engage_timer: float }
var _combat_states: Dictionary = {}

## Dictionary of entity_instance_id -> i-frame remaining time
var _iframes: Dictionary = {}

# --- Screen shake state ---

var _shake_intensity: float = 0.0
var _shake_duration: float = 0.0
var _shake_timer: float = 0.0
var _shake_direction: Vector2 = Vector2.ZERO

# --- Internal refs ---

var _damage_calculator: DamageCalculator = DamageCalculator.new()


# --- BaseSystem overrides ---

func initialize() -> void:
	system_name = "CombatMaster"
	priority = 50
	EventBus.connect("damage_dealt", _on_damage_dealt)


func process_system(delta: float) -> void:
	_process_combat_timers(delta)
	_process_iframes(delta)
	_process_screen_shake(delta)


func cleanup() -> void:
	var entity_ids: Array = _combat_states.keys()
	for eid: int in entity_ids:
		var state: Dictionary = _combat_states[eid]
		var entity: Node = instance_from_id(eid) as Node
		if entity and is_instance_valid(entity):
			_set_combat_flag(entity, false)
	_combat_states.clear()
	_iframes.clear()
	_shake_intensity = 0.0
	_shake_timer = 0.0


func on_state_changed(_old_state: int, new_state: int) -> void:
	# Disengage all combat when game leaves active play
	if new_state != 1:  # Assuming 1 = GameState.PLAYING
		var entity_ids: Array = _combat_states.keys()
		for eid: int in entity_ids:
			var entity: Node = instance_from_id(eid) as Node
			if entity and is_instance_valid(entity):
				disengage_combat(entity)


# --- Public API: Engagement ---

## Mark two entities as in combat with each other.
func engage_combat(entity_a: Node, entity_b: Node) -> void:
	if not entity_a or not entity_b:
		return
	if not entity_a.is_alive or not entity_b.is_alive:
		return

	_ensure_combat_state(entity_a, entity_b)
	_ensure_combat_state(entity_b, entity_a)

	_set_combat_flag(entity_a, true)
	_set_combat_flag(entity_b, true)

	combat_engaged.emit(entity_a, entity_b)
	EventBus.emit_signal("combat_engaged", entity_a, entity_b)


## Remove an entity from combat.
func disengage_combat(entity: Node) -> void:
	if not entity:
		return
	var eid: int = entity.get_instance_id()
	if not _combat_states.has(eid):
		return

	_combat_states.erase(eid)
	_set_combat_flag(entity, false)

	combat_disengaged.emit(entity)
	EventBus.emit_signal("combat_disengaged", entity)


## Check if an entity is currently in combat.
func is_in_combat(entity: Node) -> bool:
	if not entity:
		return false
	return _combat_states.has(entity.get_instance_id())


## Get the attack interval for an entity based on weapon type.
func get_attack_time(entity: Node) -> float:
	if entity and entity.get("is_player") and entity.get("equipped"):
		var weapon = entity.equipped.get(0, null)
		if weapon and weapon.get("weapon_type"):
			return WEAPON_ATTACK_TIMES.get(weapon.weapon_type, BASE_ATTACK_TIME) as float
	return BASE_ATTACK_TIME


# --- Public API: Damage Application ---

## Apply damage to a target with full modifier pipeline.
## context keys: element, is_critical, is_ambush, source_type, etc.
func apply_damage(target: Node, damage: int, source: Node, context: Dictionary = {}) -> int:
	if not target or not target.is_alive:
		return 0

	var tid: int = target.get_instance_id()

	# I-frame check
	if _iframes.has(tid) and _iframes[tid] > 0.0:
		return 0

	var final_damage: int = damage

	# --- Shield absorption (SpellSystem integration via signal) ---
	# If the target has an active shield, query it
	if target.has_method("get_shield_amount"):
		var shield: int = target.get_shield_amount() as int
		if shield > 0:
			var absorbed: int = mini(final_damage, shield)
			target.call("consume_shield", absorbed)
			final_damage -= absorbed
			if final_damage <= 0:
				return 0

	# --- Status effect modifiers ---
	var status_mgr: Node = _get_status_effect_manager()
	if status_mgr:
		# Vulnerable: +25% damage taken
		if status_mgr.has_effect(target, &"vulnerable"):
			var vuln_mod: float = status_mgr.get_stat_modifier(target, &"damage_taken")
			final_damage = int(ceil(float(final_damage) * (1.0 + vuln_mod)))

		# Shielded: -30% damage taken
		if status_mgr.has_effect(target, &"shielded"):
			var shield_mod: float = status_mgr.get_stat_modifier(target, &"damage_taken")
			# damage_taken modifier from shielded is -0.30
			if shield_mod < 0.0:
				final_damage = int(ceil(float(final_damage) * (1.0 + shield_mod)))

		# Weakened on source: -25% damage dealt
		if source and status_mgr.has_effect(source, &"weakened"):
			var weak_mod: float = status_mgr.get_stat_modifier(source, &"damage_dealt")
			final_damage = int(ceil(float(final_damage) * (1.0 + weak_mod)))

		# Strengthened on source: +25% damage dealt
		if source and status_mgr.has_effect(source, &"strengthened"):
			var str_mod: float = status_mgr.get_stat_modifier(source, &"damage_dealt")
			if str_mod > 0.0:
				final_damage = int(ceil(float(final_damage) * (1.0 + str_mod)))

	# --- Boon damage reduction ---
	if target.has_method("get_boon_damage_reduction"):
		var boon_red: float = target.get_boon_damage_reduction() as float
		if boon_red > 0.0:
			final_damage = int(ceil(float(final_damage) * (1.0 - boon_red)))

	# Floor at 1
	final_damage = maxi(final_damage, 1)

	# Apply the damage to entity
	var element: StringName = context.get("element", &"physical") as StringName
	target.take_damage(final_damage, element, source)

	# Start i-frames
	_iframes[tid] = IFRAME_DURATION

	# Hit flash
	_apply_hit_flash(target)

	# Kill streak reset on player damage
	if target.get("is_player") and source:
		EventBus.emit_signal("kill_streak_reset")

	# Reset disengage timer for both entities
	_refresh_combat_timer(target)
	if source:
		_refresh_combat_timer(source)

	# Emit signals
	damage_applied.emit(target, final_damage, source, context)
	EventBus.emit_signal("damage_applied", target, final_damage, source, context)

	# Check for death
	if not target.is_alive:
		handle_death(target, source)

	return final_damage


# --- Public API: Death ---

## Handle entity death: award XP, emit signals, trigger loot drops.
func handle_death(entity: Node, killer: Node) -> void:
	if not entity:
		return

	# Remove from combat tracking
	disengage_combat(entity)

	# XP rewards (only for enemies killed by player)
	if not entity.get("is_player") and killer and killer.get("is_player"):
		var tier: StringName = entity.get("tier") if entity.get("tier") else &"TIER_3"
		var xp: int = XP_REWARDS.get(tier, 15) as int
		xp_awarded.emit(xp, entity)
		EventBus.emit_signal("xp_awarded", xp, entity)

		# Skill XP for the weapon used
		if killer.get("equipped"):
			var weapon = killer.equipped.get(0, null)
			if weapon and weapon.get("weapon_type"):
				EventBus.emit_signal("skill_xp_gained", weapon.weapon_type, xp)

	# Signal loot drops
	EventBus.emit_signal("loot_drop_requested", entity)

	# Emit death
	entity_died.emit(entity, killer)
	EventBus.emit_signal("entity_died", entity, killer)


# --- Public API: Ambush ---

## Check if an attack qualifies as an ambush.
## Requires: defender is unaware (idle/patrol/etc) AND attacker is outside their
## frontal awareness cone (> AMBUSH_SIDE_ANGLE degrees from facing).
func check_ambush(attacker: Node, defender: Node) -> bool:
	if not attacker or not defender:
		return false

	# Check if defender is in an unaware state
	var is_unaware: bool = false
	if defender.get("ai_state"):
		is_unaware = defender.ai_state in AMBUSH_UNAWARE_STATES
	elif defender.get("is_player"):
		# Players can be ambushed if invisible enemies attack from behind
		is_unaware = false

	if not is_unaware:
		return false

	# Angle check: is the attacker outside the defender's frontal cone?
	if not defender.has_method("get_facing_direction"):
		return false

	var defender_facing: Vector2 = defender.get_facing_direction()
	var to_attacker: Vector2 = (attacker.global_position - defender.global_position).normalized()
	var dot: float = defender_facing.dot(to_attacker)
	# cos(60) ~ 0.5; if dot < 0.5, attacker is outside the 60-degree front cone
	var is_behind: bool = dot < cos(deg_to_rad(AMBUSH_SIDE_ANGLE))

	if is_behind:
		ambush_triggered.emit(attacker, defender)
		EventBus.emit_signal("ambush_triggered", attacker, defender)
		return true

	return false


# --- Public API: Knockback ---

## Apply knockback to a target in a direction.
## Checks walkability at destination; applies wall damage if blocked.
func apply_knockback(target: Node, direction: Vector2, distance: float) -> void:
	if not target or not target.is_alive:
		return
	if target.get("is_rooted") or target.get("is_frozen"):
		return

	var dir_normalized: Vector2 = direction.normalized()
	var dest: Vector2 = target.global_position + dir_normalized * distance * 32.0

	# Check walkability (tile-based)
	var blocked: bool = false
	if target.has_method("is_position_walkable"):
		blocked = not target.is_position_walkable(dest)
	elif has_node("/root/GameManager"):
		var gm: Node = get_node("/root/GameManager")
		if gm.has_method("is_position_walkable"):
			blocked = not gm.is_position_walkable(dest)

	if blocked:
		# Wall damage: percentage of max HP
		var wall_damage: int = maxi(int(floor(float(target.max_hp) * KNOCKBACK_WALL_DAMAGE_PERCENT)), 1)
		target.take_damage(wall_damage, &"physical", null)

		# Reduce knockback distance (stop at wall)
		distance *= 0.25
		dest = target.global_position + dir_normalized * distance * 32.0

	# Apply velocity for CharacterBody2D
	if target is CharacterBody2D:
		var kb_speed: float = distance * 32.0 / 0.15  # resolve over ~150ms
		target.velocity = dir_normalized * kb_speed

	knockback_applied.emit(target, dir_normalized, distance)
	EventBus.emit_signal("knockback_applied", target, dir_normalized, distance)


# --- Public API: Screen Shake ---

## Trigger a screen shake effect.
func trigger_screen_shake(intensity: float, duration: float, direction: Vector2 = Vector2.ZERO) -> void:
	# Stronger shakes override weaker ones
	if intensity >= _shake_intensity:
		_shake_intensity = intensity
		_shake_duration = duration
		_shake_timer = duration
		_shake_direction = direction.normalized() if direction.length() > 0.0 else Vector2.ZERO
		screen_shake_triggered.emit(intensity, duration, _shake_direction)
		EventBus.emit_signal("screen_shake", intensity, duration, _shake_direction)


## Get the current shake offset for the camera to apply.
func get_shake_offset() -> Vector2:
	if _shake_timer <= 0.0:
		return Vector2.ZERO
	var decay: float = _shake_timer / _shake_duration
	var offset: Vector2
	if _shake_direction != Vector2.ZERO:
		# Directional shake with random perpendicular component
		var perp: Vector2 = Vector2(-_shake_direction.y, _shake_direction.x)
		offset = _shake_direction * (randf() - 0.5) * 2.0 + perp * (randf() - 0.5)
	else:
		offset = Vector2(randf() - 0.5, randf() - 0.5) * 2.0
	return offset * _shake_intensity * decay


# --- Private: Process helpers ---

func _process_combat_timers(delta: float) -> void:
	var to_disengage: Array[int] = []

	for eid: int in _combat_states:
		var state: Dictionary = _combat_states[eid]
		var entity: Node = instance_from_id(eid) as Node

		if not entity or not is_instance_valid(entity) or not entity.is_alive:
			to_disengage.append(eid)
			continue

		# Engage delay countdown
		if state.has("engage_timer") and state["engage_timer"] > 0.0:
			state["engage_timer"] -= delta

		# Auto-attack timer
		if state.has("attack_timer"):
			state["attack_timer"] -= delta

		# Combat disengage timer
		state["timer"] -= delta
		if state["timer"] <= 0.0:
			to_disengage.append(eid)

	for eid: int in to_disengage:
		var entity: Node = instance_from_id(eid) as Node
		if entity and is_instance_valid(entity):
			disengage_combat(entity)
		else:
			_combat_states.erase(eid)


func _process_iframes(delta: float) -> void:
	var to_remove: Array[int] = []
	for eid: int in _iframes:
		_iframes[eid] -= delta
		if _iframes[eid] <= 0.0:
			to_remove.append(eid)
	for eid: int in to_remove:
		_iframes.erase(eid)


func _process_screen_shake(delta: float) -> void:
	if _shake_timer > 0.0:
		_shake_timer -= delta
		if _shake_timer <= 0.0:
			_shake_intensity = 0.0
			_shake_direction = Vector2.ZERO


# --- Private: Combat state helpers ---

func _ensure_combat_state(entity: Node, target: Node) -> void:
	var eid: int = entity.get_instance_id()
	if not _combat_states.has(eid):
		var attack_time: float = get_attack_time(entity)
		_combat_states[eid] = {
			"target": target,
			"timer": COMBAT_DISENGAGE_TIME,
			"attack_timer": attack_time,
			"engage_timer": ENGAGE_DELAY,
		}
	else:
		_combat_states[eid]["target"] = target
		_combat_states[eid]["timer"] = COMBAT_DISENGAGE_TIME


func _refresh_combat_timer(entity: Node) -> void:
	var eid: int = entity.get_instance_id()
	if _combat_states.has(eid):
		_combat_states[eid]["timer"] = COMBAT_DISENGAGE_TIME


func _set_combat_flag(entity: Node, value: bool) -> void:
	if "is_in_combat" in entity:
		entity.is_in_combat = value


func _apply_hit_flash(target: Node) -> void:
	if target.has_method("flash_hit"):
		target.flash_hit(HIT_FLASH_DURATION)
	elif target.has_method("set_hit_flash"):
		target.set_hit_flash(true)
		# Schedule flash end via a deferred call if the entity supports it
		if target.has_method("_on_hit_flash_timeout"):
			var timer: SceneTreeTimer = target.get_tree().create_timer(HIT_FLASH_DURATION)
			timer.timeout.connect(target._on_hit_flash_timeout)


func _get_status_effect_manager() -> Node:
	# Try to find the StatusEffectManager in the scene tree
	if has_node("/root/StatusEffectManager"):
		return get_node("/root/StatusEffectManager")
	# Try sibling node (same parent)
	var parent: Node = get_parent()
	if parent:
		for child: Node in parent.get_children():
			if child is StatusEffectManager:
				return child
	return null


# --- Private: Event handlers ---

func _on_damage_dealt(info: Dictionary) -> void:
	var attacker: Node = info.get("attacker") as Node
	var defender: Node = info.get("defender") as Node
	if attacker and defender and attacker.is_alive and defender.is_alive:
		if not is_in_combat(attacker) or not is_in_combat(defender):
			engage_combat(attacker, defender)
