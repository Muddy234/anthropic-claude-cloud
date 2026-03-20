class_name BoonCombatIntegration
extends BaseSystem
## Integrates boon effects into combat: on-hit effects, on-kill effects,
## damage multipliers, armor modifiers, and periodic boon ticking.

# --- Config ---
const EXECUTIONERS_GAIT_SPEED_BONUS: float = 0.20
const EXECUTIONERS_GAIT_DURATION: float = 3.0
const LEECH_SPORES_HEAL: int = 5
const GLASS_CANNON_MULTIPLIER: float = 2.0
const DARK_PACT_MULTIPLIER: float = 2.0
const THE_CULL_MULTIPLIER: float = 2.0
const THE_CULL_HP_THRESHOLD: float = 0.20
const DEEP_CUT_MULTIPLIER: float = 3.0
const SEARING_RADIANCE_PER_STACK: float = 0.15
const FESTERING_WOUNDS_PER_STACK: float = 0.10
const SHATTER_STRIKE_PER_STACK: float = 0.40
const PARANOIA_MULTIPLIER: float = 1.5
const FINAL_OFFER_MULTIPLIER: float = 5.0
const ROT_ARMOR_REDUCTION_PER_STACK: float = 0.10
const IMMOLATION_AURA_RADIUS: int = 2
const PLAGUE_BEARER_RADIUS: int = 3

# --- Tick Timers ---
var _blood_for_fuel_timer: float = 0.0
var _dark_pact_timer: float = 0.0
var _immolation_timer: float = 0.0
var _plague_bearer_timer: float = 0.0
var _executioners_gait_timer: float = 0.0
var _executioners_gait_active: bool = false
var _original_speed: float = 0.0


func _init() -> void:
	system_name = "boon-combat-integration"
	priority = 50


func initialize() -> void:
	_blood_for_fuel_timer = 0.0
	_dark_pact_timer = 0.0
	_immolation_timer = 0.0
	_plague_bearer_timer = 0.0
	_executioners_gait_timer = 0.0
	_executioners_gait_active = false
	# Connect to EventBus signals for combat integration
	if not EventBus.combat_hit.is_connected(_on_combat_hit):
		EventBus.combat_hit.connect(_on_combat_hit)
	if not EventBus.enemy_death.is_connected(_on_enemy_death):
		EventBus.enemy_death.connect(_on_enemy_death)


func process_system(delta: float) -> void:
	_tick_boon_effects(delta)


func cleanup() -> void:
	_blood_for_fuel_timer = 0.0
	_dark_pact_timer = 0.0
	_immolation_timer = 0.0
	_plague_bearer_timer = 0.0
	_executioners_gait_timer = 0.0
	_executioners_gait_active = false
	if EventBus.combat_hit.is_connected(_on_combat_hit):
		EventBus.combat_hit.disconnect(_on_combat_hit)
	if EventBus.enemy_death.is_connected(_on_enemy_death):
		EventBus.enemy_death.disconnect(_on_enemy_death)


# ---------------------------------------------------------------------------
# EventBus Handlers
# ---------------------------------------------------------------------------

func _on_combat_hit(attacker: Node, defender: Node, result: Dictionary) -> void:
	if attacker == null or defender == null:
		return
	if attacker.get("is_player") == true or attacker is Player:
		apply_on_hit_effects(attacker, defender, result)


func _on_enemy_death(enemy: Node, killer: Node, _overkill: float) -> void:
	if killer == null or enemy == null:
		return
	if killer.get("is_player") == true or killer is Player:
		apply_on_kill_effects(killer, enemy)


# ---------------------------------------------------------------------------
# On-Hit Effects
# ---------------------------------------------------------------------------

func apply_on_hit_effects(attacker: Node, defender: Node, result: Dictionary) -> void:
	## Apply boon-triggered effects when the player hits an enemy.
	if attacker == null or defender == null:
		return

	# Kindled Blade: ignite on hit
	if _has_boon("kindled_blade"):
		_apply_status_to_target(defender, "burning", 3.0)

	# Glacial Pace: chill on hit
	if _has_boon("glacial_pace"):
		_apply_status_to_target(defender, "chilled", 2.0)

	# Corrosive Touch: rot on hit
	if _has_boon("corrosive_touch"):
		_apply_status_to_target(defender, "rot", 4.0)

	# Rusted Edge: crit -> slow
	if _has_boon("rusted_edge"):
		var is_crit: bool = result.get("is_crit", false)
		if is_crit:
			_apply_status_to_target(defender, "slowed", 2.0)

	# Unseen Terror: backstab -> fear
	if _has_boon("unseen_terror"):
		var is_backstab: bool = result.get("is_backstab", false)
		if is_backstab:
			_apply_fear(defender, 2.0)


# ---------------------------------------------------------------------------
# On-Kill Effects
# ---------------------------------------------------------------------------

func apply_on_kill_effects(killer: Node, victim: Node) -> void:
	## Apply boon-triggered effects when the player kills an enemy.
	if killer == null:
		return

	# Executioner's Gait: +20% movement speed for 3 seconds
	if _has_boon("executioners_gait"):
		_activate_executioners_gait(killer)

	# Leech Spores: heal 5 HP if victim has rot
	if _has_boon("leech_spores"):
		if victim != null and _target_has_status(victim, "rot"):
			if killer.has_method("heal"):
				killer.heal(LEECH_SPORES_HEAL)

	# Life of the Flame: add torch fuel on kill
	if _has_boon("life_of_the_flame"):
		if killer.get("torch_fuel") != null:
			killer.torch_fuel = minf(killer.torch_fuel + 5.0, Player.TORCH_FUEL_MAX)


# ---------------------------------------------------------------------------
# Damage Multiplier
# ---------------------------------------------------------------------------

func get_damage_multiplier(attacker: Node, defender: Node) -> float:
	## Calculate multiplicative damage multiplier from all active boons.
	var multiplier: float = 1.0

	# Glass Cannon: 2x damage
	if _has_boon("glass_cannon"):
		multiplier *= GLASS_CANNON_MULTIPLIER

	# Dark Pact: 2x damage when torch is off
	if _has_boon("dark_pact"):
		if attacker.get("is_torch_on") == false:
			multiplier *= DARK_PACT_MULTIPLIER

	# The Cull: 2x damage to targets below 20% HP
	if _has_boon("the_cull"):
		if defender != null and defender.get("hp") != null and defender.get("max_hp") != null:
			var hp_percent: float = float(defender.hp) / float(defender.max_hp)
			if hp_percent < THE_CULL_HP_THRESHOLD:
				multiplier *= THE_CULL_MULTIPLIER

	# Deep Cut: 3x damage on ambush (first hit from stealth)
	if _has_boon("deep_cut"):
		if attacker.get("is_invisible") == true:
			multiplier *= DEEP_CUT_MULTIPLIER

	# Searing Radiance: +15% per stack while in light
	if _has_boon("searing_radiance"):
		var stacks: int = _get_stacks("searing_radiance")
		if attacker.get("is_torch_on") == true:
			multiplier *= (1.0 + SEARING_RADIANCE_PER_STACK * float(stacks))

	# Festering Wounds: +10% per stack when target has DoT
	if _has_boon("festering_wounds"):
		var stacks: int = _get_stacks("festering_wounds")
		if defender != null and _target_has_dot(defender):
			multiplier *= (1.0 + FESTERING_WOUNDS_PER_STACK * float(stacks))

	# Shatter Strike: +40% per stack when target is chilled/frozen
	if _has_boon("shatter_strike"):
		var stacks: int = _get_stacks("shatter_strike")
		if defender != null and (_target_has_status(defender, "chilled") or _target_has_status(defender, "frozen")):
			multiplier *= (1.0 + SHATTER_STRIKE_PER_STACK * float(stacks))

	# Paranoia: 1.5x damage
	if _has_boon("paranoia"):
		multiplier *= PARANOIA_MULTIPLIER

	# Final Offer: 5x damage
	if _has_boon("final_offer"):
		multiplier *= FINAL_OFFER_MULTIPLIER

	return multiplier


# ---------------------------------------------------------------------------
# Armor Modifier
# ---------------------------------------------------------------------------

func get_armor_modifier(defender: Node) -> float:
	## Return armor reduction factor from rot stacks. Max 100% reduction.
	if defender == null:
		return 1.0
	var rot_stacks: int = _count_status_stacks(defender, "rot")
	if rot_stacks <= 0:
		return 1.0
	var reduction: float = float(rot_stacks) * ROT_ARMOR_REDUCTION_PER_STACK
	reduction = minf(reduction, 1.0)  # Cap at 100% reduction
	return 1.0 - reduction


# ---------------------------------------------------------------------------
# Periodic Boon Effects (ticked via process_system)
# ---------------------------------------------------------------------------

func _tick_boon_effects(delta: float) -> void:
	var player: Node = GameManager.player
	if player == null or not player.is_alive:
		return

	# Life of the Flame: +1% HP/s while torch is on
	if _has_boon("life_of_the_flame"):
		if player.get("is_torch_on") == true:
			var heal_per_sec: float = float(player.max_hp) * 0.01
			var heal_amount: int = int(heal_per_sec * delta)
			if heal_amount >= 1 and player.hp < player.max_hp:
				player.heal(heal_amount)

	# Blood for Fuel: -1 HP every 5 seconds
	if _has_boon("blood_for_fuel"):
		_blood_for_fuel_timer += delta
		if _blood_for_fuel_timer >= 5.0:
			_blood_for_fuel_timer -= 5.0
			if player.hp > 1:
				player.take_damage(1, &"physical", null)

	# Dark Pact: -1 HP/s while torch is off
	if _has_boon("dark_pact"):
		if player.get("is_torch_on") == false:
			_dark_pact_timer += delta
			if _dark_pact_timer >= 1.0:
				_dark_pact_timer -= 1.0
				if player.hp > 1:
					player.take_damage(1, &"physical", null)
		else:
			_dark_pact_timer = 0.0

	# Immolation Aura: self fire damage + AoE fire to nearby enemies
	if _has_boon("immolation_aura"):
		_immolation_timer += delta
		if _immolation_timer >= 1.0:
			_immolation_timer -= 1.0
			# Self-damage (1 fire per tick)
			if player.hp > 1:
				player.take_damage(1, &"fire", null)
			# AoE fire to nearby enemies
			var tile_size: float = float(Constants.BASE_TILE_SIZE)
			var radius_px: float = float(IMMOLATION_AURA_RADIUS) * tile_size
			var player_pos: Vector2 = Vector2(player.global_position)
			for enemy: Node in GameManager.enemies:
				if not is_instance_valid(enemy) or not enemy.is_alive:
					continue
				var dist: float = player_pos.distance_to(Vector2(enemy.global_position))
				if dist <= radius_px:
					if enemy.has_method("take_damage"):
						enemy.take_damage(3, &"fire", player)
					_apply_status_to_target(enemy, "burning", 2.0)

	# Plague Bearer: AoE rot to nearby enemies
	if _has_boon("plague_bearer"):
		_plague_bearer_timer += delta
		if _plague_bearer_timer >= 1.0:
			_plague_bearer_timer -= 1.0
			var tile_size: float = float(Constants.BASE_TILE_SIZE)
			var radius_px: float = float(PLAGUE_BEARER_RADIUS) * tile_size
			var player_pos: Vector2 = Vector2(player.global_position)
			for enemy: Node in GameManager.enemies:
				if not is_instance_valid(enemy) or not enemy.is_alive:
					continue
				var dist: float = player_pos.distance_to(Vector2(enemy.global_position))
				if dist <= radius_px:
					_apply_status_to_target(enemy, "rot", 3.0)

	# Executioner's Gait speed bonus decay
	if _executioners_gait_active:
		_executioners_gait_timer -= delta
		if _executioners_gait_timer <= 0.0:
			_deactivate_executioners_gait(player)


# ---------------------------------------------------------------------------
# Executioner's Gait
# ---------------------------------------------------------------------------

func _activate_executioners_gait(player: Node) -> void:
	if not _executioners_gait_active:
		_original_speed = player.speed
		_executioners_gait_active = true
	player.speed = _original_speed * (1.0 + EXECUTIONERS_GAIT_SPEED_BONUS)
	_executioners_gait_timer = EXECUTIONERS_GAIT_DURATION


func _deactivate_executioners_gait(player: Node) -> void:
	_executioners_gait_active = false
	_executioners_gait_timer = 0.0
	if is_instance_valid(player) and player.is_alive:
		player.speed = _original_speed


# ---------------------------------------------------------------------------
# Boon Inventory Helpers
# ---------------------------------------------------------------------------

func _has_boon(boon_id: String) -> bool:
	## Check if the player has a specific boon active.
	# Check via BoonSystem on GameManager
	var boon_system: Node = _find_boon_system()
	if boon_system:
		var active_boons: Dictionary = boon_system.get("active_boons") if boon_system.get("active_boons") != null else {}
		return active_boons.has(boon_id) and active_boons[boon_id] > 0
	# Fallback: check player stat_stacks
	var player: Node = GameManager.player
	if player and player.get("stat_stacks") != null:
		return player.stat_stacks.has(StringName(boon_id))
	return false


func _get_stacks(boon_id: String) -> int:
	## Get the number of stacks for a boon.
	var boon_system: Node = _find_boon_system()
	if boon_system:
		var active_boons: Dictionary = boon_system.get("active_boons") if boon_system.get("active_boons") != null else {}
		return int(active_boons.get(boon_id, 0))
	return 1  # Default single stack if we can't determine


func _find_boon_system() -> Node:
	## Locate the BoonSystem node in the tree.
	var parent: Node = get_parent()
	if parent == null:
		return null
	# Check siblings
	for child: Node in parent.get_children():
		if child.get("system_name") == "boon-system":
			return child
	# Check parent's siblings
	var grandparent: Node = parent.get_parent()
	if grandparent == null:
		return null
	for child: Node in grandparent.get_children():
		if child.get("system_name") == "boon-system":
			return child
		for grandchild: Node in child.get_children():
			if grandchild.get("system_name") == "boon-system":
				return grandchild
	return null


# ---------------------------------------------------------------------------
# Status Effect Helpers
# ---------------------------------------------------------------------------

func _apply_status_to_target(target: Node, status_id: String, duration: float) -> void:
	## Apply a status effect to the target entity.
	if target == null or not is_instance_valid(target):
		return
	if not target.is_alive:
		return
	if target.has_method("apply_status"):
		var effect: Resource = Resource.new()
		effect.set_meta("id", status_id)
		effect.set_meta("effect", status_id)
		effect.set_meta("duration", duration)
		target.apply_status(effect)


func _apply_fear(target: Node, duration: float) -> void:
	## Apply fear to an enemy, causing it to flee.
	if target == null or not is_instance_valid(target):
		return
	if target.get("is_feared") != null:
		target.is_feared = true
		target.fear_duration = duration
	_apply_status_to_target(target, "feared", duration)


func _target_has_status(target: Node, status_id: String) -> bool:
	## Check if a target has a specific status effect.
	if target == null or not is_instance_valid(target):
		return false
	var status_effects: Array = target.get("status_effects") if target.get("status_effects") != null else []
	for effect: Resource in status_effects:
		var effect_id: Variant = effect.get_meta("id") if effect.has_meta("id") else null
		if effect_id == null:
			effect_id = effect.get(&"id")
		if str(effect_id) == status_id:
			return true
	# Check direct flags
	match status_id:
		"frozen":
			return target.get("is_frozen") == true
		"stunned":
			return target.get("is_stunned") == true
		"feared":
			return target.get("is_feared") == true
	return false


func _target_has_dot(target: Node) -> bool:
	## Check if the target has any damage-over-time status effect.
	var dot_statuses: Array[String] = ["burning", "poisoned", "rot", "bleeding"]
	for status_id: String in dot_statuses:
		if _target_has_status(target, status_id):
			return true
	return false


func _count_status_stacks(target: Node, status_id: String) -> int:
	## Count how many stacks of a status effect the target has.
	if target == null or not is_instance_valid(target):
		return 0
	var count: int = 0
	var status_effects: Array = target.get("status_effects") if target.get("status_effects") != null else []
	for effect: Resource in status_effects:
		var effect_id: Variant = effect.get_meta("id") if effect.has_meta("id") else null
		if effect_id == null:
			effect_id = effect.get(&"id")
		if str(effect_id) == status_id:
			count += 1
	# Check for stack count on the effect itself
	if count == 0:
		return 0
	# If a single effect has a stacks property, use that
	for effect: Resource in status_effects:
		var effect_id: Variant = effect.get_meta("id") if effect.has_meta("id") else null
		if effect_id == null:
			effect_id = effect.get(&"id")
		if str(effect_id) == status_id:
			var stacks: Variant = effect.get_meta("stacks") if effect.has_meta("stacks") else null
			if stacks == null:
				stacks = effect.get(&"stacks")
			if stacks != null:
				return int(stacks)
	return count
