class_name CombatSpellSystem
extends BaseSystem
## Player spell abilities with cooldown management, stamina costs, and shield system.
## Handles dash, heal, shield, fireball, frost_nova, and blink spells.

# --- Signals ---
signal spell_cast(spell_id: String, player: Node)
signal spell_heal(player: Node, amount: int)
signal spell_shield_activated(player: Node, amount: int, duration: float)
signal shield_broken(player: Node)
signal shield_expired(player: Node)

# --- Spell Definitions ---
const SPELLS: Dictionary = {
	"dash": {
		"name": "Dash",
		"cooldown": 1.0,
		"stamina_cost": 15,
		"uses_dodge_system": true,
		"description": "Quick dodge roll using the dodge system.",
	},
	"heal": {
		"name": "Heal",
		"cooldown": 35.0,
		"stamina_cost": 0,
		"heal_percent": 0.35,
		"description": "Restore 35% of max HP.",
	},
	"shield": {
		"name": "Shield",
		"cooldown": 40.0,
		"stamina_cost": 0,
		"shield_percent": 0.50,
		"shield_duration": 10.0,
		"description": "Absorb 50% of max HP as a shield for 10 seconds.",
	},
	"fireball": {
		"name": "Fireball",
		"cooldown": 12.0,
		"stamina_cost": 20,
		"damage": 35,
		"element": "fire",
		"speed": 8,
		"range": 10,
		"description": "Launch a fireball projectile.",
	},
	"frost_nova": {
		"name": "Frost Nova",
		"cooldown": 18.0,
		"stamina_cost": 25,
		"damage": 20,
		"element": "ice",
		"radius": 3,
		"slow_duration": 3.0,
		"slow_amount": 0.5,
		"description": "AoE ice blast that damages and slows nearby enemies.",
	},
	"blink": {
		"name": "Blink",
		"cooldown": 8.0,
		"stamina_cost": 15,
		"distance": 5,
		"description": "Teleport forward in facing direction.",
	},
}

# --- Spell Slot Order ---
const SPELL_SLOTS: Array[String] = ["dash", "heal", "shield", "fireball", "frost_nova", "blink"]

# --- State ---
var selected_spell: String = "dash"
var cooldowns: Dictionary = {}  # spell_id -> remaining_seconds
var active_shield: Dictionary = {}  # { "amount": int, "max_amount": int, "timer": float } or empty

# --- CDR cache ---
var _cooldown_reduction: float = 0.0  # percentage 0-100


func _init() -> void:
	system_name = "combat-spell-system"
	priority = 24


func initialize() -> void:
	cooldowns.clear()
	active_shield.clear()
	selected_spell = "dash"
	_cooldown_reduction = 0.0


func process_system(delta: float) -> void:
	_tick_cooldowns(delta)
	_tick_shield(delta)


func cleanup() -> void:
	cooldowns.clear()
	active_shield.clear()
	selected_spell = "dash"
	_cooldown_reduction = 0.0


# ---------------------------------------------------------------------------
# Cooldown Ticking
# ---------------------------------------------------------------------------

func _tick_cooldowns(delta: float) -> void:
	var finished: Array[String] = []
	for spell_id: String in cooldowns:
		cooldowns[spell_id] -= delta
		if cooldowns[spell_id] <= 0.0:
			finished.append(spell_id)
	for spell_id: String in finished:
		cooldowns.erase(spell_id)


func _tick_shield(delta: float) -> void:
	if active_shield.is_empty():
		return
	active_shield["timer"] -= delta
	if active_shield["timer"] <= 0.0:
		var player: Node = GameManager.player
		active_shield.clear()
		shield_expired.emit(player)
		if player:
			EventBus.player_shield_expire.emit(player)


# ---------------------------------------------------------------------------
# Public API: Cast by Slot Index
# ---------------------------------------------------------------------------

func cast_slot(slot_index: int) -> bool:
	## Cast spell by slot index (0-5 mapping to SPELL_SLOTS).
	if slot_index < 0 or slot_index >= SPELL_SLOTS.size():
		return false
	var spell_id: String = SPELL_SLOTS[slot_index]
	return _try_cast(spell_id)


# ---------------------------------------------------------------------------
# Public API: Spacebar Activation
# ---------------------------------------------------------------------------

func try_activate(player: Entity) -> bool:
	## Activate the currently selected spell via spacebar.
	if player == null or not player.is_alive:
		return false
	return _try_cast(selected_spell)


# ---------------------------------------------------------------------------
# Public API: Select Spell
# ---------------------------------------------------------------------------

func select_spell(spell_id: String) -> void:
	if SPELLS.has(spell_id):
		selected_spell = spell_id


# ---------------------------------------------------------------------------
# Shield: Absorb Damage
# ---------------------------------------------------------------------------

func absorb_damage(damage: int) -> int:
	## Reduce incoming damage via active shield. Returns remaining damage.
	if active_shield.is_empty():
		return damage
	var shield_amount: int = active_shield.get("amount", 0)
	if shield_amount <= 0:
		active_shield.clear()
		return damage
	var absorbed: int = mini(damage, shield_amount)
	active_shield["amount"] = shield_amount - absorbed
	var remaining: int = damage - absorbed
	if active_shield["amount"] <= 0:
		var player: Node = GameManager.player
		active_shield.clear()
		shield_broken.emit(player)
		if player:
			EventBus.player_shield_break.emit(player)
	return remaining


func has_shield() -> bool:
	return not active_shield.is_empty() and active_shield.get("amount", 0) > 0


func get_shield_amount() -> int:
	return active_shield.get("amount", 0)


# ---------------------------------------------------------------------------
# Cooldown Queries
# ---------------------------------------------------------------------------

func get_effective_cooldown(spell_id: String) -> float:
	## Calculate effective cooldown with CDR. Minimum 0.5s.
	if not SPELLS.has(spell_id):
		return 1.0
	var base_cd: float = SPELLS[spell_id].get("cooldown", 1.0)
	return maxf(0.5, base_cd * (1.0 - _cooldown_reduction / 100.0))


func is_on_cooldown(spell_id: String) -> bool:
	return cooldowns.has(spell_id)


func get_cooldown_remaining(spell_id: String) -> float:
	return cooldowns.get(spell_id, 0.0)


func set_cooldown_reduction(cdr_percent: float) -> void:
	_cooldown_reduction = clampf(cdr_percent, 0.0, 100.0)


# ---------------------------------------------------------------------------
# Internal: Cast Logic
# ---------------------------------------------------------------------------

func _try_cast(spell_id: String) -> bool:
	if not SPELLS.has(spell_id):
		return false

	var player: Node = GameManager.player
	if player == null or not player.is_alive:
		return false

	# CC check
	if player.get("is_stunned") == true or player.get("is_frozen") == true:
		return false

	# Cooldown check
	if cooldowns.has(spell_id):
		return false

	# Stamina check
	var spell_def: Dictionary = SPELLS[spell_id]
	var stamina_cost: int = spell_def.get("stamina_cost", 0)
	if stamina_cost > 0:
		var player_stamina: float = player.get("stamina") if player.get("stamina") != null else 0.0
		if player_stamina < float(stamina_cost):
			return false
		# Deduct stamina
		player.stamina -= float(stamina_cost)

	# Execute
	var success: bool = _execute_spell(spell_id, player)
	if not success:
		# Refund stamina on failure
		if stamina_cost > 0:
			player.stamina += float(stamina_cost)
		return false

	# Start cooldown
	var effective_cd: float = get_effective_cooldown(spell_id)
	cooldowns[spell_id] = effective_cd

	# Emit signals
	spell_cast.emit(spell_id, player)
	EventBus.player_spell_cast.emit(spell_id, Vector2(player.global_position))
	return true


func _execute_spell(spell_id: String, player: Node) -> bool:
	match spell_id:
		"dash":
			return _execute_dash(player)
		"heal":
			return _execute_heal(player)
		"shield":
			return _execute_shield(player)
		"fireball":
			return _execute_fireball(player)
		"frost_nova":
			return _execute_frost_nova(player)
		"blink":
			return _execute_blink(player)
	return false


# ---------------------------------------------------------------------------
# Spell Implementations
# ---------------------------------------------------------------------------

func _execute_dash(player: Node) -> bool:
	## Delegate to DodgeSystem via SystemCoordinator or tree lookup.
	var dodge_system: Node = _find_system("dodge-system")
	if dodge_system and dodge_system.has_method("try_dodge"):
		return dodge_system.try_dodge(player)
	# Fallback: manual dash in facing direction
	var dir: Vector2 = player.get_facing_direction() if player.has_method("get_facing_direction") else Vector2(0, 1)
	var tile_size: float = float(Constants.BASE_TILE_SIZE)
	var dash_distance: float = 2.0 * tile_size
	var target_pos: Vector2 = Vector2(player.global_position) + dir * dash_distance
	var best_pos: Vector2 = Vector2(player.global_position)
	for i: int in range(1, 5):
		var check_pos: Vector2 = Vector2(player.global_position) + dir * (float(i) * 0.5 * tile_size)
		var tile: Vector2i = Vector2i(
			int(check_pos.x) / Constants.BASE_TILE_SIZE,
			int(check_pos.y) / Constants.BASE_TILE_SIZE
		)
		if _is_walkable(tile):
			best_pos = check_pos
		else:
			break
	player.global_position = best_pos
	return true


func _execute_heal(player: Node) -> bool:
	var heal_percent: float = SPELLS["heal"].get("heal_percent", 0.35)
	var max_hp_val: int = player.max_hp
	var heal_amount: int = int(float(max_hp_val) * heal_percent)
	if heal_amount <= 0:
		return false
	var actual_healed: int = 0
	if player.has_method("heal"):
		actual_healed = player.heal(heal_amount)
	else:
		var before: int = player.hp
		player.hp = mini(player.hp + heal_amount, player.max_hp)
		actual_healed = player.hp - before
	spell_heal.emit(player, actual_healed)
	EventBus.player_spell_heal.emit(player, float(actual_healed))
	return true


func _execute_shield(player: Node) -> bool:
	var shield_percent: float = SPELLS["shield"].get("shield_percent", 0.50)
	var shield_duration: float = SPELLS["shield"].get("shield_duration", 10.0)
	var max_hp_val: int = player.max_hp
	var shield_amount: int = int(float(max_hp_val) * shield_percent)
	if shield_amount <= 0:
		return false
	active_shield = {
		"amount": shield_amount,
		"max_amount": shield_amount,
		"timer": shield_duration,
	}
	spell_shield_activated.emit(player, shield_amount, shield_duration)
	EventBus.player_spell_shield.emit(player, float(shield_amount))
	return true


func _execute_fireball(player: Node) -> bool:
	var spell_def: Dictionary = SPELLS["fireball"]
	var dir: Vector2 = player.get_facing_direction() if player.has_method("get_facing_direction") else Vector2(0, 1)
	var config: Dictionary = {
		"owner": player,
		"x": float(player.grid_position.x),
		"y": float(player.grid_position.y),
		"dir_x": dir.x,
		"dir_y": dir.y,
		"speed": spell_def.get("speed", 8),
		"damage": spell_def.get("damage", 35),
		"element": spell_def.get("element", "fire"),
		"is_magic": true,
		"is_skill": true,
		"is_direction_based": true,
		"distance_to_travel": float(spell_def.get("range", 10)),
	}
	# Try to find the combat ProjectileSystem
	var proj_system: Node = _find_system("projectile-system")
	if proj_system and proj_system.has_method("spawn"):
		proj_system.spawn(config)
	else:
		# Fallback: use ProjectileManager
		var proj_manager: Node = _find_system("projectile-manager")
		if proj_manager and proj_manager.has_method("fire_projectile"):
			var pm_config: Dictionary = {
				"source": player,
				"direction": dir,
				"speed": spell_def.get("speed", 8),
				"damage": spell_def.get("damage", 35),
				"element": spell_def.get("element", "fire"),
			}
			proj_manager.fire_projectile(pm_config)
	return true


func _execute_frost_nova(player: Node) -> bool:
	var spell_def: Dictionary = SPELLS["frost_nova"]
	var radius: int = spell_def.get("radius", 3)
	var damage: int = spell_def.get("damage", 20)
	var slow_duration: float = spell_def.get("slow_duration", 3.0)
	var slow_amount: float = spell_def.get("slow_amount", 0.5)
	var tile_size: float = float(Constants.BASE_TILE_SIZE)
	var radius_px: float = float(radius) * tile_size
	var player_pos: Vector2 = Vector2(player.global_position)

	# Damage and slow all enemies within radius
	for enemy: Node in GameManager.enemies:
		if not is_instance_valid(enemy):
			continue
		if not enemy.is_alive:
			continue
		var dist: float = player_pos.distance_to(Vector2(enemy.global_position))
		if dist <= radius_px:
			# Apply damage
			if enemy.has_method("take_damage"):
				enemy.take_damage(damage, &"ice", player)
			# Apply slow effect
			_apply_slow(enemy, slow_amount, slow_duration)
	return true


func _execute_blink(player: Node) -> bool:
	var distance: int = SPELLS["blink"].get("distance", 5)
	var dir: Vector2 = player.get_facing_direction() if player.has_method("get_facing_direction") else Vector2(0, 1)
	var tile_size: float = float(Constants.BASE_TILE_SIZE)
	var best_pos: Vector2 = Vector2(player.global_position)
	for i: int in range(1, distance + 1):
		var check_pos: Vector2 = Vector2(player.global_position) + dir * float(i) * tile_size
		var tile: Vector2i = Vector2i(
			int(check_pos.x) / Constants.BASE_TILE_SIZE,
			int(check_pos.y) / Constants.BASE_TILE_SIZE
		)
		if _is_walkable(tile):
			best_pos = check_pos
		else:
			break
	player.global_position = best_pos
	# Update grid position
	player.grid_position = Vector2i(
		roundi(best_pos.x / tile_size),
		roundi(best_pos.y / tile_size)
	)
	return true


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

func _apply_slow(target: Node, slow_amount: float, duration: float) -> void:
	## Apply a slow status effect to the target.
	if target.has_method("apply_status"):
		var slow_effect: Resource = Resource.new()
		slow_effect.set_meta("id", "chilled")
		slow_effect.set_meta("effect", "slow")
		slow_effect.set_meta("slow_amount", slow_amount)
		slow_effect.set_meta("duration", duration)
		target.apply_status(slow_effect)
	# Directly reduce speed as a fallback
	if target.get("speed") != null:
		var original_speed: float = target.speed
		target.speed = original_speed * (1.0 - slow_amount)
		# Schedule speed restore via timer
		var timer: SceneTreeTimer = target.get_tree().create_timer(duration)
		timer.timeout.connect(func() -> void:
			if is_instance_valid(target):
				target.speed = original_speed
		)


func _is_walkable(tile: Vector2i) -> bool:
	if tile.x < 0 or tile.x >= Constants.GRID_WIDTH or tile.y < 0 or tile.y >= Constants.GRID_HEIGHT:
		return false
	if GameManager.map.is_empty():
		return true
	if tile.y >= GameManager.map.size() or tile.x >= GameManager.map[tile.y].size():
		return false
	var tile_type: int = GameManager.map[tile.y][tile.x]
	return tile_type == Constants.TileType.FLOOR \
		or tile_type == Constants.TileType.DOOR \
		or tile_type == Constants.TileType.STAIRS_DOWN \
		or tile_type == Constants.TileType.GRASS \
		or tile_type == Constants.TileType.PATH \
		or tile_type == Constants.TileType.EXIT


func _find_system(sys_name: String) -> Node:
	## Look for a sibling system by system_name.
	var parent: Node = get_parent()
	if parent == null:
		return null
	for child: Node in parent.get_children():
		if child.get("system_name") == sys_name:
			return child
	# Check grandparent (SystemCoordinator nesting)
	var grandparent: Node = parent.get_parent()
	if grandparent == null:
		return null
	for child: Node in grandparent.get_children():
		if child.get("system_name") == sys_name:
			return child
		# Check one more level deep
		for grandchild: Node in child.get_children():
			if grandchild.get("system_name") == sys_name:
				return grandchild
	return null
