## scripts/entities/enemy.gd
## Enemy character entity. Loads stats from MonsterData, handles perception and alerting.
class_name Enemy
extends Entity

# --- Signals ---
signal alerted(source: Node, target_pos: Vector2i)
signal entered_combat(target: Node)
signal left_combat
signal ability_used(ability_id: StringName)

# --- Monster Data (from WP02 Resource) ---
@export var monster_data: Resource  # MonsterData .tres

# --- Perception ---
@export var sight_range: float = 6.0
@export var hearing_range: float = 4.0
var perception_cone_angle: float = 90.0  # degrees

# --- Combat ---
var tier: StringName = &"TIER_3"
var is_in_combat: bool = false
var current_target: Node = null
var combat_attack_range: int = 1
var combat_attack_speed: float = 1.0
var base_damage: int = 10

# --- Room Assignment ---
var assigned_room: Variant = null  # Room data dict or null
var spawn_position: Vector2i = Vector2i.ZERO

# --- Group/Social ---
var group_id: StringName = &""
var is_leader: bool = false
var is_enraged: bool = false
var is_feared: bool = false
var fear_duration: float = 0.0

# --- Loot ---
var loot_table_id: StringName = &""

# --- Alert Level ---
var alert_level: float = 0.0  # 0.0 (calm) to 1.0 (fully alert)

# --- Patrol ---
var patrol_points: Array[Vector2i] = []
var current_patrol_index: int = 0

# --- Child Components ---
@onready var ai: Node = $EnemyAI  # EnemyAI
@onready var detection_area: Area2D = $DetectionArea
@onready var ability_component: Node = $EnemyAbility  # EnemyAbility
@onready var hitbox_area: Area2D = $HitboxArea

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
	super._ready()
	add_to_group("enemies")
	spawn_position = grid_position
	_load_from_monster_data()
	if detection_area:
		detection_area.body_entered.connect(_on_detection_body_entered)

func _process(delta: float) -> void:
	# Update fear timer
	if is_feared and fear_duration > 0.0:
		fear_duration -= delta
		if fear_duration <= 0.0:
			is_feared = false
			fear_duration = 0.0

func _load_from_monster_data() -> void:
	if monster_data == null:
		return
	# MonsterData uses typed properties from the resource class
	entity_name = StringName(monster_data.display_name) if monster_data.display_name else entity_name
	entity_id = StringName(monster_data.id) if monster_data.id else entity_id
	max_hp = monster_data.hp if monster_data.hp else max_hp
	hp = max_hp
	base_damage = monster_data.str_stat if monster_data.str_stat else base_damage
	base_defense = monster_data.p_def if monster_data.p_def else base_defense
	# Element from Constants.Element enum -> convert to StringName for entity base
	element = _element_to_name(monster_data.element)
	# Tier from elite flag
	if monster_data.elite:
		tier = &"ELITE"
	# Combat stats
	combat_attack_range = int(monster_data.attack_range) if monster_data.attack_range else combat_attack_range
	combat_attack_speed = monster_data.attack_speed if monster_data.attack_speed else combat_attack_speed
	# Perception from AI config defaults
	sight_range = float(Constants.AI_CONFIG.get("sight_range", 6))
	hearing_range = float(Constants.AI_CONFIG.get("hearing_range", 4))
	# Loot
	# loot_table stored on monster_data.loot array

func initialize_from_data(data: Resource) -> void:
	monster_data = data
	_load_from_monster_data()

func _element_to_name(elem: int) -> StringName:
	match elem:
		Constants.Element.FIRE: return &"fire"
		Constants.Element.ICE: return &"ice"
		Constants.Element.WATER: return &"water"
		Constants.Element.EARTH: return &"earth"
		Constants.Element.NATURE: return &"nature"
		Constants.Element.DEATH: return &"death"
		Constants.Element.ARCANE: return &"arcane"
		Constants.Element.DARK: return &"dark"
		Constants.Element.HOLY: return &"holy"
		Constants.Element.PHYSICAL: return &"physical"
		_: return &"physical"

# -----------------------------------------------------------------
# Perception  (port of canSeePlayer, isInVisionCone, hasLineOfSight)
# -----------------------------------------------------------------

func can_see_target(target: Node) -> bool:
	if target == null or target.get(&"_is_dead"):
		return false
	if target.get(&"is_invisible"):
		return false

	var effective_range := sight_range
	# Torch stealth: if player torch off, 0.25x range
	if target is Player:
		if not target.is_torch_on:
			effective_range *= 0.25

	var dist := _grid_distance_to(target)
	if dist > effective_range:
		return false

	# Vision cone check (skip if very close)
	if dist > 2.0 and not _is_in_vision_cone(target):
		return false

	# Line of sight via raycast (WP03 VisionSystem)
	if not _has_line_of_sight(target):
		return false

	return true

func can_hear_sound(source_pos: Vector2i, volume: float) -> bool:
	var dist := _grid_distance_to_pos(source_pos)
	var effective_volume := volume - dist * 10.0
	return effective_volume > 0.0 and dist <= hearing_range

func _is_in_vision_cone(target: Node) -> bool:
	var to_target := Vector2(target.grid_position - grid_position)
	if to_target.length_squared() < 0.01:
		return true
	var facing_vec := get_facing_direction()
	var angle := rad_to_deg(facing_vec.angle_to(to_target))
	return absf(angle) <= perception_cone_angle / 2.0

func _has_line_of_sight(target: Node) -> bool:
	# Use Godot RayCast2D or manual Bresenham on tile map
	# Delegate to WP03 VisionSystem.has_los(grid_position, target.grid_position)
	return true  # Placeholder until WP03 integration

func _grid_distance_to(other: Node) -> float:
	return Vector2(grid_position).distance_to(Vector2(other.grid_position))

func _grid_distance_to_pos(pos: Vector2i) -> float:
	return Vector2(grid_position).distance_to(Vector2(pos))

# -----------------------------------------------------------------
# Alerting
# -----------------------------------------------------------------

func alert_nearby(target: Node, alert_type: StringName = &"sight") -> void:
	alert_level = 1.0
	alerted.emit(self, target.grid_position if target else Vector2i.ZERO)
	EventBus.enemy_alerted.emit(self, target, alert_type)

	# Propagate to nearby enemies within hearing radius
	for enemy_node in get_tree().get_nodes_in_group("enemies"):
		if enemy_node == self:
			continue
		if enemy_node is Enemy:
			var dist := _grid_distance_to(enemy_node)
			if dist <= hearing_range:
				if enemy_node.ai and enemy_node.ai.has_method("on_ally_shout"):
					enemy_node.ai.on_ally_shout(self, target.grid_position if target else Vector2i.ZERO)

# -----------------------------------------------------------------
# Loot
# -----------------------------------------------------------------

func get_loot_drops() -> Array:
	if monster_data == null:
		return []
	var drops: Array = []
	var loot_entries: Array = monster_data.loot if monster_data.loot else []
	for entry in loot_entries:
		var chance: float = entry.get(&"drop_chance") if entry.get(&"drop_chance") else 0.0
		if randf() <= chance:
			drops.append(entry)
	return drops

# -----------------------------------------------------------------
# Detection Area callback
# -----------------------------------------------------------------

func _on_detection_body_entered(body: Node2D) -> void:
	if body is Player and can_see_target(body):
		if ai and ai.has_method("on_target_detected"):
			ai.on_target_detected(body)

# -----------------------------------------------------------------
# Death override
# -----------------------------------------------------------------

func die() -> void:
	super.die()
	EventBus.enemy_death.emit(self, current_target, 0.0)
