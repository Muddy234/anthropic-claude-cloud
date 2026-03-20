class_name SpellSystem
extends BaseSystem
## Spell slots (max 4 equipped), mana costs, cooldowns, cast time,
## element affinity bonuses, and spell effects dispatch.

# --- Config ---
const MAX_EQUIPPED_SPELLS: int = 4

# --- Spell definitions ---
const SPELL_DEFS: Dictionary = {
	"fireball": {
		"name": "Fireball",
		"mana_cost": 25,
		"cooldown": 3.0,
		"cast_time": 0.0,
		"element": "fire",
		"damage": 30,
		"effect": "projectile_aoe",
		"aoe_radius": 2.0,
		"description": "Launches a fireball that explodes on impact.",
	},
	"ice_lance": {
		"name": "Ice Lance",
		"mana_cost": 20,
		"cooldown": 2.5,
		"cast_time": 0.0,
		"element": "ice",
		"damage": 20,
		"effect": "piercing_line",
		"status": "chill",
		"description": "Piercing ice projectile that chills targets.",
	},
	"lightning": {
		"name": "Lightning",
		"mana_cost": 30,
		"cooldown": 4.0,
		"cast_time": 0.0,
		"element": "lightning",
		"damage": 25,
		"effect": "chain",
		"chain_count": 3,
		"description": "Lightning that chains to 3 targets.",
	},
	"heal": {
		"name": "Heal",
		"mana_cost": 20,
		"cooldown": 5.0,
		"cast_time": 0.5,
		"element": "holy",
		"heal_amount": 40,
		"effect": "self_heal",
		"description": "Restores HP over a brief cast time.",
	},
	"shield": {
		"name": "Shield",
		"mana_cost": 15,
		"cooldown": 8.0,
		"cast_time": 0.0,
		"element": "arcane",
		"shield_amount": 30,
		"effect": "shield_absorb",
		"description": "Creates a damage-absorbing shield.",
	},
	"blink": {
		"name": "Blink",
		"mana_cost": 35,
		"cooldown": 10.0,
		"cast_time": 0.0,
		"element": "arcane",
		"blink_range": 5,
		"effect": "teleport",
		"description": "Teleport up to 5 tiles in facing direction.",
	},
}

# --- State ---
var equipped_spells: Array[String] = []       # Spell IDs in slots 0-3
var cooldowns: Dictionary = {}                # spell_id -> remaining cooldown
var _casting_spell: String = ""               # Currently casting spell
var _cast_timer: float = 0.0
var _cast_target: Variant = null
var _player_mana: float = 50.0
var _player_max_mana: float = 50.0
var _player_shield_hp: int = 0
var _element_affinities: Dictionary = {}      # element -> float bonus multiplier


func _init() -> void:
	system_name = "spell-system"
	priority = 24


func initialize() -> void:
	cooldowns.clear()
	equipped_spells.clear()
	_casting_spell = ""
	_player_shield_hp = 0


func process_system(delta: float) -> void:
	# Tick cooldowns
	var finished: Array[String] = []
	for spell_id in cooldowns:
		cooldowns[spell_id] -= delta
		if cooldowns[spell_id] <= 0.0:
			finished.append(spell_id)
	for spell_id in finished:
		cooldowns.erase(spell_id)

	# Process casting
	if not _casting_spell.is_empty():
		_cast_timer -= delta
		if _cast_timer <= 0.0:
			_complete_cast()


func cleanup() -> void:
	equipped_spells.clear()
	cooldowns.clear()
	_casting_spell = ""
	_cast_timer = 0.0
	_player_shield_hp = 0
	_element_affinities.clear()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func equip_spell(spell_id: String, slot: int) -> bool:
	## Equips a spell to a slot (0-3).
	if not SPELL_DEFS.has(spell_id):
		return false
	if slot < 0 or slot >= MAX_EQUIPPED_SPELLS:
		return false
	# Ensure array is large enough
	while equipped_spells.size() <= slot:
		equipped_spells.append("")
	# Remove from any existing slot
	for i in range(equipped_spells.size()):
		if equipped_spells[i] == spell_id:
			equipped_spells[i] = ""
	equipped_spells[slot] = spell_id
	return true


func unequip_spell(slot: int) -> void:
	if slot >= 0 and slot < equipped_spells.size():
		equipped_spells[slot] = ""


func cast_spell(spell_id: String, target: Variant = null) -> bool:
	## Attempts to cast a spell. Returns true if successful.
	if not SPELL_DEFS.has(spell_id):
		return false
	if not _casting_spell.is_empty():
		return false  # Already casting

	var def: Dictionary = SPELL_DEFS[spell_id]

	# Check cooldown
	if cooldowns.has(spell_id):
		return false

	# Check mana
	var mana_cost: float = _get_modified_mana_cost(spell_id)
	if not _can_spend_mana(mana_cost):
		return false

	# Spend mana
	_spend_mana(mana_cost)

	# Start cooldown
	cooldowns[spell_id] = def.get("cooldown", 1.0)

	# Check cast time
	var cast_time: float = def.get("cast_time", 0.0)
	if cast_time > 0.0:
		_casting_spell = spell_id
		_cast_timer = cast_time
		_cast_target = target
		return true

	# Instant cast
	_execute_spell(spell_id, target)
	return true


func cast_spell_by_slot(slot: int, target: Variant = null) -> bool:
	if slot < 0 or slot >= equipped_spells.size():
		return false
	var spell_id := equipped_spells[slot]
	if spell_id.is_empty():
		return false
	return cast_spell(spell_id, target)


func is_on_cooldown(spell_id: String) -> bool:
	return cooldowns.has(spell_id)


func get_cooldown_remaining(spell_id: String) -> float:
	return cooldowns.get(spell_id, 0.0)


func get_cooldown_percent(spell_id: String) -> float:
	if not cooldowns.has(spell_id):
		return 1.0
	var def: Dictionary = SPELL_DEFS.get(spell_id, {})
	var max_cd: float = def.get("cooldown", 1.0)
	return 1.0 - (cooldowns[spell_id] / max_cd)


func is_casting() -> bool:
	return not _casting_spell.is_empty()


func cancel_cast() -> void:
	## Cancels current cast (no mana refund).
	_casting_spell = ""
	_cast_timer = 0.0
	_cast_target = null


func get_equipped_spells() -> Array[String]:
	return equipped_spells


# ---------------------------------------------------------------------------
# Shield system
# ---------------------------------------------------------------------------

func apply_shield(amount: int) -> void:
	_player_shield_hp = amount
	if GameManager.player:
		EventBus.player_spell_shield.emit(GameManager.player, float(amount))


func take_damage_with_shield(damage: int) -> int:
	## Absorbs damage with shield. Returns remaining damage that hits HP.
	if _player_shield_hp <= 0:
		return damage
	var absorbed := mini(damage, _player_shield_hp)
	_player_shield_hp -= absorbed
	if _player_shield_hp <= 0:
		_player_shield_hp = 0
		if GameManager.player:
			EventBus.player_shield_break.emit(GameManager.player)
	return damage - absorbed


func get_shield_hp() -> int:
	return _player_shield_hp


func has_shield() -> bool:
	return _player_shield_hp > 0


# ---------------------------------------------------------------------------
# Element affinity
# ---------------------------------------------------------------------------

func set_element_affinity(element: String, bonus: float) -> void:
	_element_affinities[element] = bonus


func get_element_affinity(element: String) -> float:
	return _element_affinities.get(element, 0.0)


# ---------------------------------------------------------------------------
# Mana management
# ---------------------------------------------------------------------------

func set_player_mana(current: float, max_mana: float) -> void:
	_player_mana = current
	_player_max_mana = max_mana


func get_player_mana() -> float:
	return _player_mana


func get_player_max_mana() -> float:
	return _player_max_mana


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _complete_cast() -> void:
	var spell_id := _casting_spell
	var target := _cast_target
	_casting_spell = ""
	_cast_timer = 0.0
	_cast_target = null
	_execute_spell(spell_id, target)


func _execute_spell(spell_id: String, target: Variant) -> void:
	var def: Dictionary = SPELL_DEFS.get(spell_id, {})
	var effect: String = def.get("effect", "")
	var element: String = def.get("element", "")
	var affinity_bonus := 1.0 + get_element_affinity(element)

	match effect:
		"projectile_aoe":
			_fire_spell_projectile(spell_id, def, target, affinity_bonus)
		"piercing_line":
			_fire_spell_projectile(spell_id, def, target, affinity_bonus)
		"chain":
			_cast_chain_lightning(def, target, affinity_bonus)
		"self_heal":
			_cast_heal(def, affinity_bonus)
		"shield_absorb":
			_cast_shield(def, affinity_bonus)
		"teleport":
			_cast_blink(def)

	EventBus.player_spell_cast.emit(spell_id, _get_player_position())


func _fire_spell_projectile(spell_id: String, def: Dictionary, target: Variant, affinity: float) -> void:
	## Fires a projectile spell — actual projectile creation delegated to ProjectileManager.
	# The ProjectileManager will be called by whoever integrates these systems.
	# Here we just prepare the config.
	var damage := int(float(def.get("damage", 0)) * affinity)
	var _config := {
		"spell_id": spell_id,
		"source": GameManager.player,
		"target": target,
		"damage": damage,
		"element": def.get("element", "physical"),
		"aoe_radius": def.get("aoe_radius", 0.0),
		"piercing": def.get("effect", "") == "piercing_line",
		"status": def.get("status", ""),
	}
	# ProjectileManager.fire_projectile(config) would be called by integrator


func _cast_chain_lightning(def: Dictionary, _target: Variant, affinity: float) -> void:
	var damage := int(float(def.get("damage", 0)) * affinity)
	var chain_count: int = def.get("chain_count", 3)
	# Find nearby enemies and chain damage
	var targets_hit: Array[Node] = []
	var current_pos := _get_player_position()
	for i in range(chain_count):
		var nearest := _find_nearest_enemy(current_pos, targets_hit, 5.0)
		if nearest == null:
			break
		targets_hit.append(nearest)
		if nearest.has_method("take_damage"):
			nearest.take_damage(damage, GameManager.player, "lightning")
		current_pos = Vector2(nearest.position)
		damage = int(float(damage) * 0.7)  # 30% falloff per chain


func _cast_heal(def: Dictionary, affinity: float) -> void:
	if not GameManager.player:
		return
	var amount := float(def.get("heal_amount", 0)) * affinity
	if GameManager.player.has_method("heal"):
		GameManager.player.heal(amount)
	EventBus.player_spell_heal.emit(GameManager.player, amount)


func _cast_shield(def: Dictionary, affinity: float) -> void:
	var amount := int(float(def.get("shield_amount", 0)) * affinity)
	apply_shield(amount)


func _cast_blink(def: Dictionary) -> void:
	if not GameManager.player:
		return
	var range_tiles: int = def.get("blink_range", 5)
	var facing := Vector2(0, 1)
	if GameManager.player.has_method("get_facing_vector"):
		facing = GameManager.player.get_facing_vector()
	var tile_size := float(Constants.BASE_TILE_SIZE)
	var target_pos := Vector2(GameManager.player.position) + facing * float(range_tiles) * tile_size
	# Clamp to walkable
	var best_pos := Vector2(GameManager.player.position)
	for i in range(1, range_tiles + 1):
		var check := Vector2(GameManager.player.position) + facing * float(i) * tile_size
		var tile := Vector2i(int(check.x) / Constants.BASE_TILE_SIZE, int(check.y) / Constants.BASE_TILE_SIZE)
		if _is_walkable(tile):
			best_pos = check
		else:
			break
	GameManager.player.position = best_pos


func _get_modified_mana_cost(spell_id: String) -> float:
	var def: Dictionary = SPELL_DEFS.get(spell_id, {})
	return float(def.get("mana_cost", 0))


func _can_spend_mana(amount: float) -> bool:
	if GameManager.player and GameManager.player.has_method("get_mana"):
		return GameManager.player.get_mana() >= amount
	return _player_mana >= amount


func _spend_mana(amount: float) -> void:
	if GameManager.player and GameManager.player.has_method("spend_mana"):
		GameManager.player.spend_mana(amount)
	else:
		_player_mana = maxf(_player_mana - amount, 0.0)


func _get_player_position() -> Vector2:
	if GameManager.player:
		return Vector2(GameManager.player.position)
	return Vector2.ZERO


func _find_nearest_enemy(pos: Vector2, exclude: Array[Node], max_range: float) -> Node:
	var nearest: Node = null
	var nearest_dist := max_range * float(Constants.BASE_TILE_SIZE)
	for enemy in GameManager.enemies:
		if not is_instance_valid(enemy) or enemy in exclude:
			continue
		var dist := pos.distance_to(Vector2(enemy.position))
		if dist < nearest_dist:
			nearest_dist = dist
			nearest = enemy
	return nearest


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
		or tile_type == Constants.TileType.EXIT
