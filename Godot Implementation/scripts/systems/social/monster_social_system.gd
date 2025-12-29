class_name MonsterSocialSystem
extends Node

## Manages monster social behaviors: packs, command chains, swarms

# Command chains: leader_id -> CommandChain
var command_chains: Dictionary = {}

# Packs: pack_id -> PackData
var packs: Dictionary = {}

# Swarms: swarm_id -> SwarmData
var swarms: Dictionary = {}

# Pack bonus configuration
const PACK_BONUSES := {
	2: 0.05,   # +5% damage with 2 members
	3: 0.10,   # +10% with 3
	4: 0.15,   # +15% with 4
	5: 0.20,   # +20% with 5
}
const MAX_PACK_BONUS := 0.25  # +25% max

signal command_issued(leader: Enemy, command: String, target: Entity)
signal pack_formed(pack_id: int, members: Array[Enemy])
signal pack_disbanded(pack_id: int)
signal swarm_attack_coordinated(swarm_id: int, target: Entity)

func _ready():
	EventBus.enemy_died.connect(_on_enemy_died)
	EventBus.turn_ended.connect(_on_turn_ended)
	EventBus.floor_entered.connect(_on_floor_changed)

## Initialize social structures for enemies on a floor
func initialize_floor(enemies: Array[Enemy]):
	command_chains.clear()
	packs.clear()
	swarms.clear()

	# First pass: identify leaders and create structures
	for enemy in enemies:
		if not enemy.monster_data:
			continue

		if enemy.monster_data.can_command:
			_create_command_chain(enemy, enemies)

		if enemy.monster_data.behavior_type == "pack":
			_try_join_or_create_pack(enemy, enemies)

		if enemy.monster_data.behavior_type == "swarm":
			_try_join_or_create_swarm(enemy, enemies)

## Register an enemy with the social system
func register_enemy(enemy: Enemy):
	if not enemy.monster_data:
		return

	# Check for nearby command chains to join
	if enemy.monster_data.can_be_commanded:
		for chain in command_chains.values():
			if _can_join_chain(enemy, chain):
				_add_to_chain(enemy, chain)
				break

## Create a command chain for a leader
func _create_command_chain(leader: Enemy, all_enemies: Array[Enemy]):
	var chain := CommandChain.new()
	chain.leader = leader
	chain.leader_id = leader.get_instance_id()

	# Find nearby commandable enemies
	for other in all_enemies:
		if other == leader or other.current_hp <= 0:
			continue

		if not other.monster_data or not other.monster_data.can_be_commanded:
			continue

		var dist := leader.grid_pos.distance_to(Vector2(other.grid_pos))
		if dist <= 10:
			chain.followers.append(other)
			other.commanded_by = leader

	if not chain.followers.is_empty():
		command_chains[leader.get_instance_id()] = chain

func _can_join_chain(enemy: Enemy, chain: CommandChain) -> bool:
	if not is_instance_valid(chain.leader):
		return false

	var dist := enemy.grid_pos.distance_to(Vector2(chain.leader.grid_pos))
	return dist <= 10

func _add_to_chain(enemy: Enemy, chain: CommandChain):
	if enemy not in chain.followers:
		chain.followers.append(enemy)
		enemy.commanded_by = chain.leader

## Issue a command from a leader to followers
func issue_command(leader: Enemy, command: String, target: Entity = null):
	var chain: CommandChain = command_chains.get(leader.get_instance_id())
	if not chain:
		return

	for follower in chain.followers:
		if not is_instance_valid(follower) or follower.current_hp <= 0:
			continue

		match command:
			"attack":
				if follower.ai:
					follower.ai.commanded_target = target
					follower.ai._change_state(Constants.AIState.CHASING)

			"retreat":
				if follower.ai:
					follower.ai._change_state(Constants.AIState.PANICKED)

			"hold":
				if follower.ai:
					follower.ai._change_state(Constants.AIState.IDLE)

			"follow":
				if follower.ai:
					follower.ai.follow_target = leader
					follower.ai._change_state(Constants.AIState.FOLLOWING)

	command_issued.emit(leader, command, target)

## Try to join or create a pack
func _try_join_or_create_pack(enemy: Enemy, all_enemies: Array[Enemy]):
	# Look for nearby pack members of same type
	for pack_id in packs:
		var pack: PackData = packs[pack_id]
		if _can_join_pack(enemy, pack):
			pack.members.append(enemy)
			enemy.pack_id = pack_id
			return

	# Create new pack if we find compatible neighbors
	var compatible: Array[Enemy] = []
	for other in all_enemies:
		if other == enemy or other.current_hp <= 0:
			continue

		if _is_pack_compatible(enemy, other):
			var dist := enemy.grid_pos.distance_to(Vector2(other.grid_pos))
			if dist <= 5:
				compatible.append(other)

	if not compatible.is_empty():
		var pack := PackData.new()
		pack.members.append(enemy)
		for other in compatible:
			pack.members.append(other)
			other.pack_id = pack.id

		enemy.pack_id = pack.id
		packs[pack.id] = pack
		pack_formed.emit(pack.id, pack.members)

func _can_join_pack(enemy: Enemy, pack: PackData) -> bool:
	if pack.members.is_empty():
		return false

	var first := pack.members[0]
	if not is_instance_valid(first):
		return false

	if not _is_pack_compatible(enemy, first):
		return false

	var dist := enemy.grid_pos.distance_to(Vector2(first.grid_pos))
	return dist <= 8

func _is_pack_compatible(a: Enemy, b: Enemy) -> bool:
	if not a.monster_data or not b.monster_data:
		return false

	# Same behavior type
	if a.monster_data.behavior_type != b.monster_data.behavior_type:
		return false

	# Both must be pack type
	if a.monster_data.behavior_type != "pack":
		return false

	return true

## Get pack damage bonus for an enemy
func get_pack_bonus(enemy: Enemy) -> float:
	if not enemy.pack_id:
		return 0.0

	var pack: PackData = packs.get(enemy.pack_id)
	if not pack:
		return 0.0

	# Count living members
	var living := 0
	for member in pack.members:
		if is_instance_valid(member) and member.current_hp > 0:
			living += 1

	if living < 2:
		return 0.0

	if PACK_BONUSES.has(living):
		return PACK_BONUSES[living]

	return MAX_PACK_BONUS

## Try to join or create a swarm
func _try_join_or_create_swarm(enemy: Enemy, all_enemies: Array[Enemy]):
	# Swarms are looser than packs - any nearby swarm-type enemy
	for swarm_id in swarms:
		var swarm: SwarmData = swarms[swarm_id]
		if _can_join_swarm(enemy, swarm):
			swarm.members.append(enemy)
			enemy.swarm_id = swarm_id
			return

	# Create new swarm
	var swarm := SwarmData.new()
	swarm.members.append(enemy)
	enemy.swarm_id = swarm.id
	swarms[swarm.id] = swarm

func _can_join_swarm(enemy: Enemy, swarm: SwarmData) -> bool:
	if swarm.members.is_empty():
		return true

	for member in swarm.members:
		if is_instance_valid(member):
			var dist := enemy.grid_pos.distance_to(Vector2(member.grid_pos))
			if dist <= 6:
				return true

	return false

## Get coordinated attack position for swarm member
func get_swarm_attack_position(enemy: Enemy, target: Entity) -> Vector2i:
	if not enemy.swarm_id:
		return target.grid_pos

	var swarm: SwarmData = swarms.get(enemy.swarm_id)
	if not swarm:
		return target.grid_pos

	# Calculate surround positions
	var living: Array[Enemy] = []
	for member in swarm.members:
		if is_instance_valid(member) and member.current_hp > 0:
			living.append(member)

	var index := living.find(enemy)
	if index < 0:
		return target.grid_pos

	# Distribute around target
	var angle := (TAU / living.size()) * index
	var offset := Vector2i(
		int(cos(angle) * 2),
		int(sin(angle) * 2)
	)

	return target.grid_pos + offset

## Update social behaviors each turn
func _on_turn_ended():
	_recruit_bodyguards()
	_update_leader_commands()

## Dynamically recruit nearby enemies to command chains
func _recruit_bodyguards():
	for chain in command_chains.values():
		if not is_instance_valid(chain.leader) or chain.leader.current_hp <= 0:
			continue

		for enemy in GameManager.enemies:
			if enemy == chain.leader or enemy.current_hp <= 0:
				continue

			if enemy.commanded_by:
				continue

			if not enemy.monster_data or not enemy.monster_data.can_be_commanded:
				continue

			var dist := chain.leader.grid_pos.distance_to(Vector2(enemy.grid_pos))
			if dist <= 8:
				chain.followers.append(enemy)
				enemy.commanded_by = chain.leader

				if enemy.ai:
					enemy.ai.follow_target = chain.leader

## Auto-issue commands when leaders enter combat
func _update_leader_commands():
	for chain in command_chains.values():
		if not is_instance_valid(chain.leader) or chain.leader.current_hp <= 0:
			continue

		var leader := chain.leader
		if not leader.ai:
			continue

		# Leader in combat with player
		var in_combat := leader.ai.current_state in [
			Constants.AIState.COMBAT,
			Constants.AIState.CHASING,
			Constants.AIState.CIRCLING
		]

		if in_combat and leader.ai.target == GameManager.player:
			issue_command(leader, "attack", GameManager.player)

func _on_enemy_died(enemy: Enemy):
	# Remove from command chains
	command_chains.erase(enemy.get_instance_id())

	for chain in command_chains.values():
		chain.followers.erase(enemy)

	# Remove from packs
	if enemy.pack_id:
		var pack: PackData = packs.get(enemy.pack_id)
		if pack:
			pack.members.erase(enemy)
			if pack.members.is_empty():
				packs.erase(enemy.pack_id)
				pack_disbanded.emit(enemy.pack_id)

	# Remove from swarms
	if enemy.swarm_id:
		var swarm: SwarmData = swarms.get(enemy.swarm_id)
		if swarm:
			swarm.members.erase(enemy)
			if swarm.members.is_empty():
				swarms.erase(enemy.swarm_id)

func _on_floor_changed(_floor_num: int):
	command_chains.clear()
	packs.clear()
	swarms.clear()


## Command chain data structure
class CommandChain:
	var leader_id: int
	var leader: Enemy
	var followers: Array[Enemy] = []


## Pack data structure
class PackData:
	static var next_id: int = 0

	var id: int
	var members: Array[Enemy] = []

	func _init():
		id = next_id
		next_id += 1


## Swarm data structure
class SwarmData:
	static var next_id: int = 0

	var id: int
	var members: Array[Enemy] = []
	var attack_target: Entity = null

	func _init():
		id = next_id
		next_id += 1
