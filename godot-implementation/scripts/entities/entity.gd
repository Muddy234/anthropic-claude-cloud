## scripts/entities/entity.gd
## Abstract base class for all game entities (Player, Enemy, NPC, Boss).
class_name Entity
extends CharacterBody2D

# --- Signals ---
signal health_changed(current: int, maximum: int)
signal died
signal status_effect_applied(effect: StringName)
signal status_effect_removed(effect: StringName)
signal facing_changed(new_facing: StringName)

# --- Enums ---
enum Facing { UP, DOWN, LEFT, RIGHT }

# --- Identity ---
@export var entity_name: StringName = &""
@export var entity_id: StringName = &""

# --- Position ---
## Grid position (integer tile coords). Movement system snaps to this.
var grid_position: Vector2i = Vector2i.ZERO
## Facing direction
var facing: Facing = Facing.DOWN

# --- Stats ---
@export var max_hp: int = 100
var hp: int = 100:
	set(value):
		hp = clampi(value, 0, max_hp)
		health_changed.emit(hp, max_hp)
		if hp <= 0 and not _is_dead:
			_is_dead = true
			died.emit()

@export var base_defense: int = 0
@export var element: StringName = &"physical"

# --- Speed ---
@export var speed: float = 4.0

# --- Status Effects ---
## Array of active StatusEffect resources
var status_effects: Array[Resource] = []
var is_stunned: bool = false
var is_frozen: bool = false
var is_rooted: bool = false
var is_invisible: bool = false

# --- Internal ---
var _is_dead: bool = false
var is_alive: bool:
	get:
		return not _is_dead

# --- Node References (set by scene) ---
@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var collision: CollisionShape2D = $CollisionShape2D

# --- Collision Layers ---
# Layer 1: World geometry
# Layer 2: Player
# Layer 3: Enemies
# Layer 4: NPCs
# Layer 5: Projectiles
# Layer 6: Interactables
# Layer 7: Detection areas

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
	hp = max_hp
	grid_position = Vector2i(
		roundi(global_position.x / Constants.BASE_TILE_SIZE),
		roundi(global_position.y / Constants.BASE_TILE_SIZE)
	)

# -----------------------------------------------------------------
# Damage & Healing
# -----------------------------------------------------------------

func take_damage(amount: int, damage_element: StringName = &"physical", source: Node = null) -> int:
	if _is_dead:
		return 0
	var actual := maxi(1, amount - base_defense)
	hp -= actual
	return actual

func heal(amount: int) -> int:
	if _is_dead:
		return 0
	var before := hp
	hp = mini(hp + amount, max_hp)
	return hp - before

# -----------------------------------------------------------------
# Status Effects
# -----------------------------------------------------------------

func apply_status(effect: Resource) -> void:
	# Check for duplicate
	for existing in status_effects:
		if existing.get(&"id") == effect.get(&"id"):
			return
	status_effects.append(effect)
	_apply_status_flags(effect)
	status_effect_applied.emit(effect.get(&"id") if effect.get(&"id") else &"unknown")

func remove_status(effect: Resource) -> void:
	var idx := status_effects.find(effect)
	if idx >= 0:
		status_effects.remove_at(idx)
		_remove_status_flags(effect)
		status_effect_removed.emit(effect.get(&"id") if effect.get(&"id") else &"unknown")

func _apply_status_flags(effect: Resource) -> void:
	var effect_name: String = effect.get(&"effect") if effect.get(&"effect") else ""
	match effect_name:
		"stun":
			is_stunned = true
		"freeze":
			is_frozen = true
		"root":
			is_rooted = true
		"invisibility":
			is_invisible = true

func _remove_status_flags(effect: Resource) -> void:
	var effect_name: String = effect.get(&"effect") if effect.get(&"effect") else ""
	match effect_name:
		"stun":
			is_stunned = false
		"freeze":
			is_frozen = false
		"root":
			is_rooted = false
		"invisibility":
			is_invisible = false

# -----------------------------------------------------------------
# Facing
# -----------------------------------------------------------------

func set_facing(new_facing: Facing) -> void:
	if facing != new_facing:
		facing = new_facing
		facing_changed.emit(Facing.keys()[facing].to_lower())

func get_facing_direction() -> Vector2:
	match facing:
		Facing.UP:
			return Vector2(0, -1)
		Facing.DOWN:
			return Vector2(0, 1)
		Facing.LEFT:
			return Vector2(-1, 0)
		Facing.RIGHT:
			return Vector2(1, 0)
	return Vector2(0, 1)

# -----------------------------------------------------------------
# Grid Helpers
# -----------------------------------------------------------------

func snap_to_grid() -> void:
	global_position = Vector2(grid_position) * Constants.BASE_TILE_SIZE

# -----------------------------------------------------------------
# Death
# -----------------------------------------------------------------

func die() -> void:
	if not _is_dead:
		_is_dead = true
		hp = 0
		died.emit()
