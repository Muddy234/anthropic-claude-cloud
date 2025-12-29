class_name StatusEffect
extends RefCounted

## Runtime instance of a status effect on an entity

var id: String
var effect_data: EffectData
var source: Node  # Entity that applied this effect

var duration: float
var max_duration: float
var tick_rate: float
var tick_timer: float = 0.0
var stacks: int = 1

signal expired()
signal ticked(damage: int)
signal stack_added(new_stacks: int)

## Initialize from EffectData
func init_from_data(data: EffectData, effect_source: Node = null):
	id = data.id
	effect_data = data
	source = effect_source
	duration = data.duration
	max_duration = data.duration
	tick_rate = data.tick_rate
	stacks = 1

## Check if effect is expired
func is_expired() -> bool:
	return duration <= 0 and max_duration > 0

## Refresh duration (when reapplied)
func refresh(new_effect: StatusEffect = null):
	duration = max_duration

	if new_effect and effect_data.stacks:
		stacks = mini(stacks + 1, effect_data.max_stacks)
		stack_added.emit(stacks)

## Apply the effect when first added
func apply(entity: Node):
	if not effect_data:
		return

	# Apply stat bonuses
	if entity.has_method("add_stat_modifier"):
		if effect_data.attack_bonus != 0:
			entity.add_stat_modifier("attack", effect_data.attack_bonus)
		if effect_data.defense_bonus != 0:
			entity.add_stat_modifier("defense", effect_data.defense_bonus)
		if effect_data.speed_bonus != 0:
			entity.add_stat_modifier("speed", effect_data.speed_bonus)
		if effect_data.max_hp_bonus != 0:
			entity.add_stat_modifier("max_hp", effect_data.max_hp_bonus)

	# Special effects
	if effect_data.is_invisible:
		entity.set("is_invisible", true)
	if effect_data.is_invulnerable:
		entity.set("is_invulnerable", true)
	if effect_data.prevents_action:
		entity.set("is_stunned", true)
	if effect_data.prevents_movement:
		entity.set("is_rooted", true)

## Remove the effect
func remove(entity: Node):
	if not effect_data:
		return

	# Remove stat bonuses
	if entity.has_method("remove_stat_modifier"):
		if effect_data.attack_bonus != 0:
			entity.remove_stat_modifier("attack", effect_data.attack_bonus)
		if effect_data.defense_bonus != 0:
			entity.remove_stat_modifier("defense", effect_data.defense_bonus)
		if effect_data.speed_bonus != 0:
			entity.remove_stat_modifier("speed", effect_data.speed_bonus)
		if effect_data.max_hp_bonus != 0:
			entity.remove_stat_modifier("max_hp", effect_data.max_hp_bonus)

	# Remove special effects
	if effect_data.is_invisible:
		entity.set("is_invisible", false)
	if effect_data.is_invulnerable:
		entity.set("is_invulnerable", false)
	if effect_data.prevents_action:
		entity.set("is_stunned", false)
	if effect_data.prevents_movement:
		entity.set("is_rooted", false)

## Process a tick (called by status effect system)
func tick(entity: Node):
	if not effect_data:
		return

	var tick_damage := effect_data.damage_per_tick * stacks
	var tick_heal := effect_data.heal_per_tick * stacks

	# Apply damage
	if tick_damage > 0 and entity.has_method("take_damage"):
		entity.take_damage(tick_damage, source, effect_data.tick_damage_type)
		ticked.emit(tick_damage)

	# Apply healing
	if tick_heal > 0 and entity.has_method("heal"):
		entity.heal(tick_heal)
		ticked.emit(-tick_heal)

	# Mana regen/drain
	if effect_data.mana_per_tick != 0 and entity.has("mp"):
		entity.mp += effect_data.mana_per_tick * stacks

## Check if this effect should break
func should_break(trigger: String) -> bool:
	if not effect_data:
		return false

	match trigger:
		"damage":
			return effect_data.breaks_on_damage
		"attack":
			return effect_data.breaks_on_attack
		"movement":
			return effect_data.breaks_on_movement

	return false

## Get remaining duration as percentage (0-1)
func get_duration_percent() -> float:
	if max_duration <= 0:
		return 1.0
	return duration / max_duration

## Get damage modifier (accounting for stacks)
func get_damage_modifier() -> float:
	if not effect_data:
		return 0.0
	return effect_data.damage_modifier * stacks

## Get speed modifier (accounting for stacks)
func get_speed_modifier() -> float:
	if not effect_data:
		return 0.0
	return effect_data.speed_modifier * stacks

## Get display name with stacks
func get_display_name() -> String:
	if stacks > 1:
		return "%s x%d" % [effect_data.name if effect_data else id, stacks]
	return effect_data.name if effect_data else id

## Check if this is a buff (positive effect)
func is_buff() -> bool:
	return effect_data.is_buff if effect_data else true

## Get tint color for visual effects
func get_tint_color() -> Color:
	return effect_data.tint_color if effect_data else Color.WHITE
