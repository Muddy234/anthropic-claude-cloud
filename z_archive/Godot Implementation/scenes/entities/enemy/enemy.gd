class_name Enemy
extends Entity

## Enemy entity with AI, social behaviors, and loot

@export var monster_data: MonsterData

# AI component
var ai: Node  # EnemyAI

# Social system references
var commanded_by: Node = null  # Leader commanding this enemy (Enemy)
var followers: Array = []  # Enemies we command
var pack_id: int = 0  # Pack we belong to
var swarm_id: int = 0  # Swarm we belong to

# Combat state
var target: Node = null  # Entity
var last_known_target_pos: Vector2i
var has_attack_token: bool = false

# Signals
signal spotted_player()
signal lost_player()
signal commanded(command: String, target_entity: Node)

func _ready():
	super._ready()
	add_to_group("enemies")
	_apply_monster_data()
	_setup_ai()
	died.connect(_on_died)

## Apply stats from monster data
func _apply_monster_data():
	if not monster_data:
		return

	max_hp = monster_data.hp
	current_hp = max_hp
	attack = monster_data.attack
	defense = monster_data.defense
	speed = monster_data.speed
	attack_range = monster_data.attack_range

## Setup AI component
func _setup_ai():
	ai = EnemyAI.new(self)
	ai.name = "AI"
	add_child(ai)

	# Connect AI signals
	ai.spotted_player.connect(func(): spotted_player.emit())
	ai.lost_player.connect(func(): lost_player.emit())

## Take turn (called by AI manager)
func take_turn(delta: float):
	if current_hp <= 0:
		return

	if ai:
		ai.update(delta)

	process_status_effects(delta)

## Called when this enemy takes damage
func on_damaged(attacker: Node):
	if ai:
		ai.on_damaged(attacker)

## Override take_damage to trigger AI response
func take_damage(amount: int, source: Node, damage_type: int = 0) -> int:  # 0 = PHYSICAL
	var final_damage := super.take_damage(amount, source, damage_type)

	if final_damage > 0:
		on_damaged(source)
		GameManager.add_stat("damage_dealt", final_damage)

	return final_damage

## Handle death
func _on_died():
	# During arena combat, don't handle death here - arena manages it
	if GameManager.current_state == Constants.GameState.COMBAT:
		print("DEBUG: Enemy died during arena combat - arena will handle cleanup")
		return

	# Release attack token
	if has_attack_token:
		GameManager.combat_system.attack_token_system.release_token(self)

	# Spawn loot
	GameManager.loot_system.spawn_enemy_loot(self)

	# Grant XP
	var xp_value := monster_data.get_xp_value() if monster_data else 10
	if GameManager.player:
		GameManager.player.gain_xp(xp_value)

	# Update statistics
	GameManager.add_stat("enemies_killed", 1)

	# Notify systems
	EventBus.enemy_died.emit(self)

	# Remove from game
	queue_free()

## Get name for UI
func get_display_name() -> String:
	if monster_data:
		return monster_data.name
	return "Enemy"

## Get threat level text
func get_threat_text() -> String:
	if monster_data:
		return monster_data.get_threat_level()
	return "Unknown"

## Get tier color
func get_tier_color() -> Color:
	if monster_data:
		return monster_data.get_tier_color()
	return Color.WHITE

## Override get_resistances
func get_resistances() -> Dictionary:
	if monster_data:
		return monster_data.resistances
	return {}

## Check if this enemy can be sacrificed by elites
func can_be_sacrificed() -> bool:
	if not monster_data:
		return false
	return monster_data.is_sacrificial

## Get pack damage bonus
func get_pack_bonus() -> float:
	return GameManager.social_system.get_pack_bonus(self)

## Check if in combat with player
func is_fighting_player() -> bool:
	if not ai:
		return false

	return ai.current_state in [
		Constants.AIState.COMBAT,
		Constants.AIState.CHASING,
		Constants.AIState.CIRCLING,
		Constants.AIState.SKIRMISHING
	] and ai.target == GameManager.player
