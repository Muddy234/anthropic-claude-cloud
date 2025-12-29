class_name StatusEffectSystem
extends Node

## Manages status effects (buffs/debuffs) on entities

signal effect_applied(entity: Entity, effect: StatusEffect)
signal effect_removed(entity: Entity, effect: StatusEffect)
signal effect_ticked(entity: Entity, effect: StatusEffect, damage: int)

# Effect definitions with default values
const EFFECT_DEFINITIONS := {
	"bleeding": {
		"duration": 5.0,
		"tick_rate": 1.0,
		"damage_per_tick": 3,
		"stacks": true,
		"max_stacks": 5
	},
	"burning": {
		"duration": 3.0,
		"tick_rate": 0.5,
		"damage_per_tick": 5,
		"stacks": false
	},
	"poisoned": {
		"duration": 8.0,
		"tick_rate": 2.0,
		"damage_per_tick": 2,
		"stacks": true,
		"max_stacks": 3
	},
	"chilled": {
		"duration": 4.0,
		"speed_modifier": -0.3,
		"stacks": false
	},
	"frozen": {
		"duration": 2.0,
		"prevents_action": true,
		"stacks": false
	},
	"stunned": {
		"duration": 1.0,
		"prevents_action": true,
		"stacks": false
	},
	"weakened": {
		"duration": 5.0,
		"damage_modifier": -0.25,
		"stacks": false
	},
	"strengthened": {
		"duration": 10.0,
		"damage_modifier": 0.25,
		"stacks": false
	},
	"haste": {
		"duration": 8.0,
		"speed_modifier": 0.5,
		"stacks": false
	},
	"regenerating": {
		"duration": 10.0,
		"tick_rate": 1.0,
		"heal_per_tick": 5,
		"stacks": false
	},
	"invisible": {
		"duration": 15.0,
		"breaks_on_attack": true,
		"stacks": false
	},
	"shielded": {
		"duration": 30.0,
		"shield_amount": 50,
		"stacks": false
	}
}

## Apply a status effect to an entity
func apply_effect(entity: Entity, effect_id: String, source: Entity = null, overrides: Dictionary = {}) -> StatusEffect:
	if not EFFECT_DEFINITIONS.has(effect_id):
		push_warning("Unknown status effect: " + effect_id)
		return null

	var definition := EFFECT_DEFINITIONS[effect_id].duplicate()

	# Apply overrides
	for key in overrides:
		definition[key] = overrides[key]

	# Check for existing effect
	var existing := get_effect(entity, effect_id)
	if existing:
		if definition.get("stacks", false):
			# Add stack
			existing.stacks = mini(existing.stacks + 1, definition.get("max_stacks", 99))
			existing.duration = definition.duration  # Refresh duration
			return existing
		else:
			# Refresh duration
			existing.duration = definition.duration
			return existing

	# Create new effect
	var effect := StatusEffect.new()
	effect.id = effect_id
	effect.source = source
	effect.duration = definition.duration
	effect.max_duration = definition.duration
	effect.tick_rate = definition.get("tick_rate", 0.0)
	effect.damage_per_tick = definition.get("damage_per_tick", 0)
	effect.heal_per_tick = definition.get("heal_per_tick", 0)
	effect.speed_modifier = definition.get("speed_modifier", 0.0)
	effect.damage_modifier = definition.get("damage_modifier", 0.0)
	effect.prevents_action = definition.get("prevents_action", false)
	effect.breaks_on_attack = definition.get("breaks_on_attack", false)
	effect.shield_amount = definition.get("shield_amount", 0)
	effect.stacks = 1

	entity.apply_status(effect)
	effect_applied.emit(entity, effect)

	return effect

## Remove a status effect from an entity
func remove_effect(entity: Entity, effect_id: String):
	var effect := get_effect(entity, effect_id)
	if effect:
		entity.status_effects.erase(effect)
		effect_removed.emit(entity, effect)

## Remove all status effects from an entity
func clear_effects(entity: Entity):
	for effect in entity.status_effects.duplicate():
		entity.status_effects.erase(effect)
		effect_removed.emit(entity, effect)

## Get a specific effect on an entity
func get_effect(entity: Entity, effect_id: String) -> StatusEffect:
	for effect in entity.status_effects:
		if effect.id == effect_id:
			return effect
	return null

## Check if entity has a specific effect
func has_effect(entity: Entity, effect_id: String) -> bool:
	return get_effect(entity, effect_id) != null

## Check if entity can act (not stunned/frozen)
func can_act(entity: Entity) -> bool:
	for effect in entity.status_effects:
		if effect.prevents_action:
			return false
	return true

## Get total stat modifier from effects
func get_stat_modifier(entity: Entity, stat: String) -> float:
	var total := 0.0

	for effect in entity.status_effects:
		match stat:
			"speed":
				total += effect.speed_modifier * effect.stacks
			"damage":
				total += effect.damage_modifier * effect.stacks

	return total

## Process status effects for an entity (call each frame or turn)
func process_effects(entity: Entity, delta: float):
	for effect in entity.status_effects.duplicate():
		effect.duration -= delta

		# Tick damage/heal
		if effect.tick_rate > 0:
			effect.tick_timer += delta
			while effect.tick_timer >= effect.tick_rate:
				effect.tick_timer -= effect.tick_rate
				_apply_tick(entity, effect)

		# Check expiration
		if effect.duration <= 0:
			entity.status_effects.erase(effect)
			effect_removed.emit(entity, effect)

func _apply_tick(entity: Entity, effect: StatusEffect):
	var tick_damage := effect.damage_per_tick * effect.stacks
	var tick_heal := effect.heal_per_tick * effect.stacks

	if tick_damage > 0:
		entity.current_hp -= tick_damage
		effect_ticked.emit(entity, effect, tick_damage)

		# Show damage number
		var dmg_number = preload("res://scenes/effects/damage_number.tscn").instantiate()
		dmg_number.position = entity.position
		dmg_number.setup(tick_damage, false, false, _get_effect_color(effect.id))
		GameManager.get_current_scene().add_child(dmg_number)

		# Check death
		if entity.current_hp <= 0:
			entity.died.emit()

	if tick_heal > 0:
		var healed := entity.heal(tick_heal)
		if healed > 0:
			effect_ticked.emit(entity, effect, -healed)

			# Show heal number
			var heal_number = preload("res://scenes/effects/damage_number.tscn").instantiate()
			heal_number.position = entity.position
			heal_number.setup(healed, false, false, Color.GREEN)
			GameManager.get_current_scene().add_child(heal_number)

func _get_effect_color(effect_id: String) -> Color:
	match effect_id:
		"bleeding":
			return Color.DARK_RED
		"burning":
			return Color.ORANGE
		"poisoned":
			return Color.GREEN_YELLOW
		"chilled", "frozen":
			return Color.CYAN
		_:
			return Color.WHITE
