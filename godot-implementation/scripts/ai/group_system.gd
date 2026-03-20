## scripts/ai/group_system.gd
## Manages monster pack/swarm/command groups. ID-only storage.
## Group types: PACK (share target, flank), SWARM (surround, AoE avoidance),
##              COMMAND (leader buffs followers, followers protect leader).
## Group bonuses: pack +10% damage, swarm +15% speed, command +20% defense for followers.
class_name GroupSystem
extends Node

# --- Signals ---
signal group_formed(group_id: StringName)
signal group_disbanded(group_id: StringName)
signal leader_changed(group_id: StringName, new_leader_id: StringName)
signal command_issued(group_id: StringName, command: StringName)

# --- Formation Types ---
enum FormationType { PACK, SWARM, COMMAND }

# --- Config ---
const PACK_RADIUS: float = 5.0
const SWARM_RADIUS: float = 3.0
const COMMAND_RADIUS: float = 8.0
const MAX_GROUP_SIZE: int = 8
const MIN_PACK_SIZE: int = 2
const MIN_SWARM_SIZE: int = 3
const MIN_COMMAND_SIZE: int = 2

# --- Formation-specific bonus overrides ---
const PACK_DAMAGE_BONUS: float = 0.10
const SWARM_SPEED_BONUS: float = 0.15
const COMMAND_DEFENSE_BONUS: float = 0.20

# Size-based bonuses: { size: { damage, defense, attack_speed, evasion } }
const BONUSES: Dictionary = {
	2: { "damage": 0.05, "defense": 0.05, "attack_speed": 0.0, "evasion": 0.0 },
	3: { "damage": 0.10, "defense": 0.10, "attack_speed": 0.10, "evasion": 0.05 },
	4: { "damage": 0.15, "defense": 0.10, "attack_speed": 0.15, "evasion": 0.07 },
	5: { "damage": 0.20, "defense": 0.15, "attack_speed": 0.20, "evasion": 0.10 },
	6: { "damage": 0.25, "defense": 0.15, "attack_speed": 0.25, "evasion": 0.12 },
	7: { "damage": 0.28, "defense": 0.18, "attack_speed": 0.28, "evasion": 0.13 },
	8: { "damage": 0.30, "defense": 0.20, "attack_speed": 0.30, "evasion": 0.15 },
}

# --- Orphan Regrouping ---
const ORPHAN_REGROUP_DELAY: float = 2.0

# --- Data ---
## group_id -> { member_ids: Array[StringName], leader_id, formation_type, element, last_command }
var groups: Dictionary = {}
## enemy_id -> group_id (reverse lookup)
var member_to_group: Dictionary = {}
var _group_counter: int = 0

## Orphaned enemies waiting to regroup
var _orphan_timers: Dictionary = {}  # enemy_id -> float

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _process(delta: float) -> void:
	_process_orphan_regrouping(delta)

func _process_orphan_regrouping(delta: float) -> void:
	var to_remove: Array[StringName] = []
	for enemy_id in _orphan_timers:
		_orphan_timers[enemy_id] -= delta
		if _orphan_timers[enemy_id] <= 0.0:
			_try_regroup_orphan(enemy_id)
			to_remove.append(enemy_id)
	for eid in to_remove:
		_orphan_timers.erase(eid)

func _try_regroup_orphan(enemy_id: StringName) -> void:
	if member_to_group.has(enemy_id):
		return  # Already in a group
	var enemy: Node = _resolve_enemy(enemy_id)
	if enemy == null or enemy._is_dead:
		return
	# Find nearest compatible group
	var best_group: StringName = &""
	var best_dist: float = INF
	for gid in groups:
		var group: Dictionary = groups[gid]
		if group["member_ids"].size() >= MAX_GROUP_SIZE:
			continue
		var leader: Node = _resolve_enemy(group["leader_id"])
		if leader == null:
			continue
		var dist: float = Vector2(enemy.grid_position).distance_to(Vector2(leader.grid_position))
		if dist < best_dist and dist <= PACK_RADIUS * 2:
			best_dist = dist
			best_group = gid
	if best_group != &"":
		join_group(enemy_id, best_group)

# -----------------------------------------------------------------
# Core Methods
# -----------------------------------------------------------------

func create_group(formation: FormationType = FormationType.PACK, elem: StringName = &"physical") -> StringName:
	_group_counter += 1
	var new_id := StringName("group_%d" % _group_counter)
	groups[new_id] = {
		"member_ids": [] as Array[StringName],
		"leader_id": &"",
		"formation_type": _formation_to_name(formation),
		"element": elem,
		"last_command": null,
	}
	group_formed.emit(new_id)
	return new_id

func join_group(enemy_id: StringName, group_id: StringName = &"") -> StringName:
	if member_to_group.has(enemy_id):
		leave_group(enemy_id)

	if group_id != &"" and groups.has(group_id):
		var group: Dictionary = groups[group_id]
		if group["member_ids"].size() >= MAX_GROUP_SIZE:
			return &""
		group["member_ids"].append(enemy_id)
		member_to_group[enemy_id] = group_id
		_update_leader(group_id)
		return group_id
	else:
		_group_counter += 1
		var new_id := StringName("group_%d" % _group_counter)
		groups[new_id] = {
			"member_ids": [enemy_id] as Array[StringName],
			"leader_id": enemy_id,
			"formation_type": &"pack",
			"element": &"physical",
			"last_command": null,
		}
		member_to_group[enemy_id] = new_id
		group_formed.emit(new_id)
		return new_id

func leave_group(enemy_id: StringName) -> void:
	var gid: StringName = member_to_group.get(enemy_id, &"")
	if gid == &"":
		return
	member_to_group.erase(enemy_id)
	if not groups.has(gid):
		return
	var group: Dictionary = groups[gid]
	group["member_ids"].erase(enemy_id)
	var formation: StringName = group["formation_type"]
	var min_size: int = _get_min_size(formation)
	if group["member_ids"].size() < min_size:
		_disband_group(gid)
	elif group["leader_id"] == enemy_id:
		_update_leader(gid)

func on_enemy_death(enemy_id: StringName) -> void:
	var gid: StringName = member_to_group.get(enemy_id, &"")
	var was_leader := false
	if gid != &"" and groups.has(gid):
		was_leader = groups[gid]["leader_id"] == enemy_id
	leave_group(enemy_id)
	if was_leader and groups.has(gid):
		_handle_leader_death(gid)

# -----------------------------------------------------------------
# Bonuses
# -----------------------------------------------------------------

func get_bonuses(enemy_id: StringName) -> Dictionary:
	var default := { "damage": 0.0, "defense": 0.0, "attack_speed": 0.0, "evasion": 0.0 }
	var gid: StringName = member_to_group.get(enemy_id, &"")
	if gid == &"":
		return default
	var count := _get_live_count(gid)
	var base_bonuses: Dictionary = BONUSES.get(mini(count, 8), default).duplicate()

	# Apply formation-specific overrides
	if not groups.has(gid):
		return base_bonuses
	var formation: StringName = groups[gid]["formation_type"]
	var is_leader: bool = groups[gid]["leader_id"] == enemy_id

	match formation:
		&"pack":
			# Pack: extra damage bonus
			base_bonuses["damage"] += PACK_DAMAGE_BONUS
		&"swarm":
			# Swarm: extra speed bonus
			base_bonuses["attack_speed"] += SWARM_SPEED_BONUS
		&"command":
			# Command: leader gets no extra, followers get defense bonus
			if not is_leader:
				base_bonuses["defense"] += COMMAND_DEFENSE_BONUS

	return base_bonuses

func get_group_id(enemy_id: StringName) -> StringName:
	return member_to_group.get(enemy_id, &"")

func get_group_members(group_id: StringName) -> Array:
	if not groups.has(group_id):
		return []
	return groups[group_id]["member_ids"].duplicate()

func get_group_leader(group_id: StringName) -> StringName:
	if not groups.has(group_id):
		return &""
	return groups[group_id]["leader_id"]

func get_formation_type(group_id: StringName) -> StringName:
	if not groups.has(group_id):
		return &""
	return groups[group_id]["formation_type"]

func is_enemy_leader(enemy_id: StringName) -> bool:
	var gid: StringName = member_to_group.get(enemy_id, &"")
	if gid == &"" or not groups.has(gid):
		return false
	return groups[gid]["leader_id"] == enemy_id

# -----------------------------------------------------------------
# Commands
# -----------------------------------------------------------------

func issue_command(leader_id: StringName, command_type: StringName, target_id: StringName = &"") -> Array[StringName]:
	var gid: StringName = member_to_group.get(leader_id, &"")
	if gid == &"" or not groups.has(gid):
		return []
	var group: Dictionary = groups[gid]
	if group["leader_id"] != leader_id:
		return []

	var commanded: Array[StringName] = []
	var cmd_target: Variant = null
	if target_id != &"":
		cmd_target = _resolve_enemy(target_id)
		if cmd_target == null:
			# Try player
			var player: Node = get_tree().get_first_node_in_group("player")
			if player and StringName(str(player.get_instance_id())) == target_id:
				cmd_target = player

	for mid in group["member_ids"]:
		if mid == leader_id:
			continue
		var enemy: Node = _resolve_enemy(mid)
		if enemy and not enemy._is_dead:
			var ai_node: Node = enemy.get_node_or_null("EnemyAI")
			if ai_node and ai_node.has_method("on_commanded"):
				ai_node.on_commanded(command_type, cmd_target)
				commanded.append(mid)

	group["last_command"] = { "type": command_type, "target": target_id }
	command_issued.emit(gid, command_type)
	return commanded

# -----------------------------------------------------------------
# Internal
# -----------------------------------------------------------------

func _update_leader(gid: StringName) -> void:
	if not groups.has(gid):
		return
	var group: Dictionary = groups[gid]
	var best_id: StringName = &""
	var best_tier: int = -1
	var best_max_hp: int = 0
	for mid in group["member_ids"]:
		var enemy: Node = _resolve_enemy(mid)
		if enemy == null or enemy._is_dead:
			continue
		var tier_val: int = _tier_order(enemy.get(&"tier"))
		var mhp: int = enemy.get(&"max_hp") if enemy.get(&"max_hp") else 0
		if tier_val > best_tier or (tier_val == best_tier and mhp > best_max_hp):
			best_id = mid
			best_tier = tier_val
			best_max_hp = mhp
	group["leader_id"] = best_id
	# Update leader flag on entities
	for mid in group["member_ids"]:
		var enemy: Node = _resolve_enemy(mid)
		if enemy:
			enemy.is_leader = (mid == best_id)
	leader_changed.emit(gid, best_id)

func _handle_leader_death(gid: StringName) -> void:
	if not groups.has(gid):
		return
	for mid in groups[gid]["member_ids"]:
		var enemy: Node = _resolve_enemy(mid)
		if enemy == null or enemy._is_dead:
			continue
		var tier_val: int = _tier_order(enemy.get(&"tier"))
		if tier_val <= 1:
			# Weak minions become panicked (feared for 3s)
			enemy.is_feared = true
			enemy.fear_duration = 3.0
		else:
			# Strong guards become enraged (5s)
			enemy.is_enraged = true
			# Enrage timer handled by the entity or AI

func _disband_group(gid: StringName) -> void:
	if not groups.has(gid):
		return
	# Mark orphaned members for regrouping
	for mid in groups[gid]["member_ids"]:
		member_to_group.erase(mid)
		_orphan_timers[mid] = ORPHAN_REGROUP_DELAY
		# Clear leader flag
		var enemy: Node = _resolve_enemy(mid)
		if enemy:
			enemy.is_leader = false
	groups.erase(gid)
	group_disbanded.emit(gid)

func _get_live_count(gid: StringName) -> int:
	if not groups.has(gid):
		return 0
	var count := 0
	for mid in groups[gid]["member_ids"]:
		var enemy: Node = _resolve_enemy(mid)
		if enemy and not enemy._is_dead:
			count += 1
	return count

func _get_min_size(formation: StringName) -> int:
	match formation:
		&"swarm":
			return MIN_SWARM_SIZE
		&"command":
			return MIN_COMMAND_SIZE
		_:  # pack
			return MIN_PACK_SIZE

func _formation_to_name(formation: FormationType) -> StringName:
	match formation:
		FormationType.PACK: return &"pack"
		FormationType.SWARM: return &"swarm"
		FormationType.COMMAND: return &"command"
		_: return &"pack"

func _resolve_enemy(enemy_id: StringName) -> Node:
	for enemy in get_tree().get_nodes_in_group("enemies"):
		if enemy.entity_id == enemy_id:
			return enemy
	return null

func _tier_order(tier: Variant) -> int:
	var order := { &"TIER_3": 0, &"TIER_2": 1, &"TIER_1": 2, &"ELITE": 3, &"BOSS": 4 }
	return order.get(tier, 0)

# -----------------------------------------------------------------
# Cleanup
# -----------------------------------------------------------------

func cleanup() -> void:
	groups.clear()
	member_to_group.clear()
	_orphan_timers.clear()
	_group_counter = 0
