class_name Entity
extends Node2D

## Base class for all game entities (player, enemies, NPCs)

# Grid position (for game logic)
@export var grid_pos: Vector2i:
	set(value):
		var old_pos := grid_pos
		grid_pos = value
		_target_position = Vector2(value) * Constants.TILE_SIZE
		position_changed.emit(old_pos, value)

# Smooth movement target
var _target_position: Vector2

# Facing direction
@export var facing: String = "down"  # up, down, left, right

# Base stats
@export var max_hp: int = 100
var current_hp: int:
	set(value):
		var old_hp := current_hp
		current_hp = clampi(value, 0, max_hp)
		hp_changed.emit(current_hp, max_hp)
		if current_hp <= 0 and old_hp > 0:
			died.emit()

@export var attack: int = 10
@export var defense: int = 5
@export var speed: int = 100
@export var attack_range: int = 1

# Stat modifiers from equipment, buffs, etc.
var stat_modifiers: Dictionary = {}  # {"attack": [5, 3], "defense": [-2]}

# Status effects
var status_effects: Array = []  # Array of StatusEffect

# Combat state
var is_in_combat: bool = false
var combat_target: Node = null  # Entity reference
var attack_cooldown: float = 0.0

# Status flags
var is_invisible: bool = false
var is_invulnerable: bool = false
var is_stunned: bool = false
var is_rooted: bool = false
var is_feared: bool = false

# Visual feedback
var hit_flash_timer: float = 0.0
var is_hit_flashing: bool = false

# Signals
signal hp_changed(current: int, maximum: int)
signal died()
signal position_changed(from: Vector2i, to: Vector2i)
signal status_applied(effect: RefCounted)
signal status_removed(effect: RefCounted)
signal stat_changed(stat_name: String, new_value: int)

func _ready():
	current_hp = max_hp
	position = Vector2(grid_pos) * Constants.TILE_SIZE
	_target_position = position
	add_to_group("entities")

func _process(delta: float):
	# Smooth movement interpolation
	if position.distance_to(_target_position) > 1:
		position = position.lerp(_target_position, Constants.MOVE_SPEED * delta)
	else:
		position = _target_position

	# Hit flash
	if is_hit_flashing:
		hit_flash_timer -= delta
		if hit_flash_timer <= 0:
			is_hit_flashing = false
			modulate = Color.WHITE

## Take damage from a source
func take_damage(amount: int, source: Node, damage_type: int = 0) -> int:  # 0 = PHYSICAL
	if is_invulnerable:
		return 0

	# Apply defense
	var final_damage := _calculate_damage_reduction(amount, damage_type)
	final_damage = maxi(1, final_damage)

	current_hp -= final_damage

	# Visual feedback
	_trigger_hit_flash()

	# Break effects that break on damage
	_check_effect_breaks("damage")

	return final_damage

## Heal the entity
func heal(amount: int) -> int:
	var old_hp := current_hp
	current_hp += amount
	return current_hp - old_hp

## Apply a status effect
func apply_status(effect: RefCounted):  # StatusEffect
	# Check for existing effect
	for existing in status_effects:
		if existing.id == effect.id:
			existing.refresh(effect)
			return

	status_effects.append(effect)
	effect.apply(self)
	status_applied.emit(effect)

## Remove a status effect by ID
func remove_status(effect_id: String):
	for i in range(status_effects.size() - 1, -1, -1):
		if status_effects[i].id == effect_id:
			var effect := status_effects[i]
			effect.remove(self)
			status_effects.remove_at(i)
			status_removed.emit(effect)
			return

## Process status effects (call each turn/frame)
func process_status_effects(delta: float):
	for effect in status_effects.duplicate():
		effect.duration -= delta

		# Tick effects
		if effect.tick_rate > 0:
			effect.tick_timer += delta
			while effect.tick_timer >= effect.tick_rate:
				effect.tick_timer -= effect.tick_rate
				effect.tick(self)

		# Remove expired effects
		if effect.is_expired():
			effect.remove(self)
			status_effects.erase(effect)
			status_removed.emit(effect)

## Check if entity can act (not stunned/frozen)
func can_act() -> bool:
	return not is_stunned

## Check if entity can move
func can_move() -> bool:
	return not is_rooted and not is_stunned

## Add a stat modifier
func add_stat_modifier(stat: String, value: int):
	if not stat_modifiers.has(stat):
		stat_modifiers[stat] = []
	stat_modifiers[stat].append(value)
	_recalculate_stat(stat)

## Remove a stat modifier
func remove_stat_modifier(stat: String, value: int):
	if stat_modifiers.has(stat):
		stat_modifiers[stat].erase(value)
		_recalculate_stat(stat)

## Get effective stat value (base + modifiers)
func get_stat(stat: String) -> int:
	var base: int = 0
	if stat in self:
		base = get(stat)
	var bonus := 0

	if stat_modifiers.has(stat):
		for mod in stat_modifiers[stat]:
			bonus += mod

	return base + bonus

## Get crit chance
func get_crit_chance() -> float:
	return 0.05  # Base 5%, override in subclasses

## Get all resistances
func get_resistances() -> Dictionary:
	return {}  # Override in subclasses

## Face a direction
func face_direction(dir: Vector2i):
	if abs(dir.x) > abs(dir.y):
		facing = "right" if dir.x > 0 else "left"
	elif dir.y != 0:
		facing = "down" if dir.y > 0 else "up"

## Face a position
func face_position(target_pos: Vector2i):
	var dir := target_pos - grid_pos
	face_direction(dir)

# === PRIVATE METHODS ===

func _calculate_damage_reduction(amount: int, _damage_type: int) -> int:
	# Simple defense reduction
	var effective_defense := get_stat("defense")
	var reduction := effective_defense / (effective_defense + 100.0)
	return int(amount * (1.0 - reduction))

func _trigger_hit_flash():
	is_hit_flashing = true
	hit_flash_timer = 0.1
	modulate = Color(1.5, 0.5, 0.5)

func _check_effect_breaks(trigger: String):
	for effect in status_effects.duplicate():
		if effect.should_break(trigger):
			effect.remove(self)
			status_effects.erase(effect)
			status_removed.emit(effect)

func _recalculate_stat(stat: String):
	var new_value := get_stat(stat)
	stat_changed.emit(stat, new_value)