class_name StatusEffectManager
extends BaseSystem
## Manages all 17 status effects with per-entity tracking, tick processing,
## stack behaviors, and stat modifier queries.

# --- Signals ---

signal effect_applied(entity: Node, effect_id: StringName, stacks: int)
signal effect_removed(entity: Node, effect_id: StringName)
signal effect_tick(entity: Node, effect_id: StringName, tick_damage: int)
signal effect_expired(entity: Node, effect_id: StringName)

# --- Stack behavior enum ---

enum StackBehavior { REFRESH, INTENSITY, DURATION, NONE }

# --- Effect definitions ---
# Each entry: { duration, tick_interval, tick_damage, max_stacks, stack_behavior, category, modifiers }
# Categories: dot, cc, debuff, buff
# Modifiers is a Dictionary of stat_key -> value (additive percentages)

const EFFECTS: Dictionary = {
	# --- DoTs ---
	&"burning": {
		"duration": 5.0, "tick_interval": 1.0, "tick_damage": 3,
		"max_stacks": 5, "stack_behavior": StackBehavior.INTENSITY,
		"category": &"dot", "modifiers": {},
	},
	&"poisoned": {
		"duration": 8.0, "tick_interval": 1.5, "tick_damage": 2,
		"max_stacks": 3, "stack_behavior": StackBehavior.INTENSITY,
		"category": &"dot", "modifiers": { &"heal_received": -0.50 },
	},
	&"bleeding": {
		"duration": 5.0, "tick_interval": 1.0, "tick_damage": 0,
		"max_stacks": 5, "stack_behavior": StackBehavior.INTENSITY,
		"category": &"dot", "modifiers": {},
		"percent_hp_tick": 0.05,  # 5% max HP per tick
	},
	&"ignite": {
		"duration": 4.0, "tick_interval": 1.0, "tick_damage": 2,
		"max_stacks": 3, "stack_behavior": StackBehavior.REFRESH,
		"category": &"dot", "modifiers": {},
	},
	&"rot": {
		"duration": 6.0, "tick_interval": 1.0, "tick_damage": 1,
		"max_stacks": 4, "stack_behavior": StackBehavior.INTENSITY,
		"category": &"dot", "modifiers": { &"armor": -0.10 },
	},
	# --- CCs ---
	&"fear": {
		"duration": 3.0, "tick_interval": 0.0, "tick_damage": 0,
		"max_stacks": 1, "stack_behavior": StackBehavior.REFRESH,
		"category": &"cc", "modifiers": {},
		"ai_override": &"flee",
	},
	&"stunned": {
		"duration": 2.0, "tick_interval": 0.0, "tick_damage": 0,
		"max_stacks": 1, "stack_behavior": StackBehavior.NONE,
		"category": &"cc", "modifiers": {},
	},
	&"frozen": {
		"duration": 3.0, "tick_interval": 0.0, "tick_damage": 0,
		"max_stacks": 1, "stack_behavior": StackBehavior.NONE,
		"category": &"cc", "modifiers": {},
	},
	&"rooted": {
		"duration": 4.0, "tick_interval": 0.0, "tick_damage": 0,
		"max_stacks": 1, "stack_behavior": StackBehavior.REFRESH,
		"category": &"cc", "modifiers": {},
	},
	# --- Debuffs ---
	&"slow": {
		"duration": 3.0, "tick_interval": 0.0, "tick_damage": 0,
		"max_stacks": 1, "stack_behavior": StackBehavior.REFRESH,
		"category": &"debuff", "modifiers": { &"move_speed": -0.15 },
	},
	&"chilled": {
		"duration": 3.0, "tick_interval": 0.0, "tick_damage": 0,
		"max_stacks": 1, "stack_behavior": StackBehavior.REFRESH,
		"category": &"debuff", "modifiers": { &"move_speed": -0.10, &"attack_speed": -0.10 },
	},
	&"weakened": {
		"duration": 5.0, "tick_interval": 0.0, "tick_damage": 0,
		"max_stacks": 1, "stack_behavior": StackBehavior.REFRESH,
		"category": &"debuff", "modifiers": { &"damage_dealt": -0.25 },
	},
	&"vulnerable": {
		"duration": 5.0, "tick_interval": 0.0, "tick_damage": 0,
		"max_stacks": 1, "stack_behavior": StackBehavior.REFRESH,
		"category": &"debuff", "modifiers": { &"damage_taken": 0.25 },
	},
	# --- Buffs ---
	&"regenerating": {
		"duration": 10.0, "tick_interval": 1.0, "tick_damage": 0,
		"max_stacks": 1, "stack_behavior": StackBehavior.REFRESH,
		"category": &"buff", "modifiers": {},
		"tick_heal": 3,
	},
	&"strengthened": {
		"duration": 8.0, "tick_interval": 0.0, "tick_damage": 0,
		"max_stacks": 1, "stack_behavior": StackBehavior.REFRESH,
		"category": &"buff", "modifiers": { &"damage_dealt": 0.25 },
	},
	&"hastened": {
		"duration": 6.0, "tick_interval": 0.0, "tick_damage": 0,
		"max_stacks": 1, "stack_behavior": StackBehavior.REFRESH,
		"category": &"buff", "modifiers": { &"move_speed": 0.30, &"attack_speed": 0.20 },
	},
	&"shielded": {
		"duration": 8.0, "tick_interval": 0.0, "tick_damage": 0,
		"max_stacks": 1, "stack_behavior": StackBehavior.REFRESH,
		"category": &"buff", "modifiers": { &"damage_taken": -0.30 },
	},
}

# --- Active effects tracking ---
# Dictionary[int, Dictionary]  ->  entity_instance_id -> { effect_id -> effect_state }
# effect_state: { stacks: int, remaining: float, tick_timer: float, source: Node }
var _active_effects: Dictionary = {}


# --- BaseSystem overrides ---

func initialize() -> void:
	system_name = "StatusEffectManager"
	priority = 55


func process_system(delta: float) -> void:
	var entities_to_clean: Array[int] = []

	for entity_id: int in _active_effects:
		var effects: Dictionary = _active_effects[entity_id]
		var entity: Node = instance_from_id(entity_id) as Node
		if not entity or not is_instance_valid(entity):
			entities_to_clean.append(entity_id)
			continue

		if not entity.is_alive:
			entities_to_clean.append(entity_id)
			continue

		var expired_effects: Array[StringName] = []

		for effect_id: StringName in effects:
			var state: Dictionary = effects[effect_id]
			var def: Dictionary = EFFECTS[effect_id]

			# Countdown remaining duration
			state["remaining"] -= delta
			if state["remaining"] <= 0.0:
				expired_effects.append(effect_id)
				continue

			# Process ticks (DoTs and heals)
			if def["tick_interval"] > 0.0:
				state["tick_timer"] -= delta
				if state["tick_timer"] <= 0.0:
					state["tick_timer"] += def["tick_interval"]
					_process_tick(entity, effect_id, state, def)

			# Apply CC flags
			_apply_cc_flags(entity, effect_id, true)

		# Remove expired effects
		for eid: StringName in expired_effects:
			_remove_effect_internal(entity, eid, effects)
			effect_expired.emit(entity, eid)

	# Clean up entries for dead / freed entities
	for dead_id: int in entities_to_clean:
		_active_effects.erase(dead_id)


func cleanup() -> void:
	# Remove all CC flags and clear tracking
	for entity_id: int in _active_effects:
		var entity: Node = instance_from_id(entity_id) as Node
		if entity and is_instance_valid(entity):
			var effects: Dictionary = _active_effects[entity_id]
			for effect_id: StringName in effects:
				_apply_cc_flags(entity, effect_id, false)
	_active_effects.clear()


# --- Public API ---

## Apply a status effect to an entity. Source is the caster/inflictor (can be null).
func apply_effect(entity: Node, effect_id: StringName, source: Node = null, stacks_to_add: int = 1) -> void:
	if not entity or not entity.is_alive:
		return
	if not EFFECTS.has(effect_id):
		push_warning("StatusEffectManager: Unknown effect '%s'" % effect_id)
		return

	var def: Dictionary = EFFECTS[effect_id]
	var eid: int = entity.get_instance_id()

	if not _active_effects.has(eid):
		_active_effects[eid] = {}

	var effects: Dictionary = _active_effects[eid]

	if effects.has(effect_id):
		# Effect already active -- apply stack behavior
		var state: Dictionary = effects[effect_id]
		var behavior: int = def["stack_behavior"] as int

		match behavior:
			StackBehavior.REFRESH:
				# Reset duration, keep stacks
				state["remaining"] = def["duration"] as float
			StackBehavior.INTENSITY:
				# Add stacks (capped) and refresh duration
				state["stacks"] = mini(state["stacks"] + stacks_to_add, def["max_stacks"] as int)
				state["remaining"] = def["duration"] as float
			StackBehavior.DURATION:
				# Extend remaining time
				state["remaining"] += def["duration"] as float
			StackBehavior.NONE:
				# Blocked -- do nothing
				return

		state["source"] = source
	else:
		# Fresh application
		var state: Dictionary = {
			"stacks": mini(stacks_to_add, def["max_stacks"] as int),
			"remaining": def["duration"] as float,
			"tick_timer": def["tick_interval"] as float,
			"source": source,
		}
		effects[effect_id] = state

		# Apply CC flags on first application
		_apply_cc_flags(entity, effect_id, true)

	var current_stacks: int = effects[effect_id]["stacks"] as int
	effect_applied.emit(entity, effect_id, current_stacks)
	EventBus.emit_signal("status_effect_applied", entity, effect_id, current_stacks)


## Manually remove an effect from an entity.
func remove_effect(entity: Node, effect_id: StringName) -> void:
	if not entity:
		return
	var eid: int = entity.get_instance_id()
	if not _active_effects.has(eid):
		return
	var effects: Dictionary = _active_effects[eid]
	if not effects.has(effect_id):
		return
	_remove_effect_internal(entity, effect_id, effects)


## Check whether an entity currently has a specific effect.
func has_effect(entity: Node, effect_id: StringName) -> bool:
	if not entity:
		return false
	var eid: int = entity.get_instance_id()
	if not _active_effects.has(eid):
		return false
	return _active_effects[eid].has(effect_id)


## Return the current stack count for an effect on an entity (0 if absent).
func get_stacks(entity: Node, effect_id: StringName) -> int:
	if not entity:
		return 0
	var eid: int = entity.get_instance_id()
	if not _active_effects.has(eid):
		return 0
	if not _active_effects[eid].has(effect_id):
		return 0
	return _active_effects[eid][effect_id]["stacks"] as int


## Get the aggregate stat modifier from all active effects on an entity.
## Returns a Dictionary of stat_key -> total_modifier (additive sum of percentages).
func get_stat_modifiers(entity: Node) -> Dictionary:
	var mods: Dictionary = {}
	if not entity:
		return mods
	var eid: int = entity.get_instance_id()
	if not _active_effects.has(eid):
		return mods

	var effects: Dictionary = _active_effects[eid]
	for effect_id: StringName in effects:
		var def: Dictionary = EFFECTS[effect_id]
		var state: Dictionary = effects[effect_id]
		var effect_mods: Dictionary = def.get("modifiers", {}) as Dictionary
		for stat_key: StringName in effect_mods:
			var value: float = effect_mods[stat_key] as float
			# For intensity-stacking effects, multiply modifier by stack count
			if def["stack_behavior"] == StackBehavior.INTENSITY:
				value *= float(state["stacks"])
			if mods.has(stat_key):
				mods[stat_key] += value
			else:
				mods[stat_key] = value

	return mods


## Get a single stat modifier value. Returns 0.0 if no effects modify that stat.
func get_stat_modifier(entity: Node, stat_key: StringName) -> float:
	var mods: Dictionary = get_stat_modifiers(entity)
	return mods.get(stat_key, 0.0) as float


## Get remaining duration for an effect. Returns 0.0 if not present.
func get_remaining_duration(entity: Node, effect_id: StringName) -> float:
	if not entity:
		return 0.0
	var eid: int = entity.get_instance_id()
	if not _active_effects.has(eid):
		return 0.0
	if not _active_effects[eid].has(effect_id):
		return 0.0
	return _active_effects[eid][effect_id]["remaining"] as float


## Get all active effects on an entity. Returns Array of effect_id StringNames.
func get_active_effects(entity: Node) -> Array[StringName]:
	var result: Array[StringName] = []
	if not entity:
		return result
	var eid: int = entity.get_instance_id()
	if not _active_effects.has(eid):
		return result
	for effect_id: StringName in _active_effects[eid]:
		result.append(effect_id)
	return result


## Get all active effects filtered by category (dot, cc, debuff, buff).
func get_effects_by_category(entity: Node, category: StringName) -> Array[StringName]:
	var result: Array[StringName] = []
	if not entity:
		return result
	var eid: int = entity.get_instance_id()
	if not _active_effects.has(eid):
		return result
	for effect_id: StringName in _active_effects[eid]:
		if EFFECTS.has(effect_id) and EFFECTS[effect_id]["category"] == category:
			result.append(effect_id)
	return result


## Remove all effects from an entity.
func clear_all(entity: Node) -> void:
	if not entity:
		return
	var eid: int = entity.get_instance_id()
	if not _active_effects.has(eid):
		return
	var effects: Dictionary = _active_effects[eid]
	var effect_ids: Array = effects.keys()
	for effect_id: StringName in effect_ids:
		_remove_effect_internal(entity, effect_id, effects)
	_active_effects.erase(eid)


## Remove all debuffs from an entity (dispel).
func clear_debuffs(entity: Node) -> void:
	_clear_by_category(entity, &"debuff")


## Remove all buffs from an entity (purge).
func clear_buffs(entity: Node) -> void:
	_clear_by_category(entity, &"buff")


# --- Private helpers ---

func _clear_by_category(entity: Node, category: StringName) -> void:
	if not entity:
		return
	var eid: int = entity.get_instance_id()
	if not _active_effects.has(eid):
		return
	var effects: Dictionary = _active_effects[eid]
	var to_remove: Array[StringName] = []
	for effect_id: StringName in effects:
		if EFFECTS.has(effect_id) and EFFECTS[effect_id]["category"] == category:
			to_remove.append(effect_id)
	for effect_id: StringName in to_remove:
		_remove_effect_internal(entity, effect_id, effects)


func _remove_effect_internal(entity: Node, effect_id: StringName, effects: Dictionary) -> void:
	# Clear CC flags before removing
	_apply_cc_flags(entity, effect_id, false)
	effects.erase(effect_id)
	effect_removed.emit(entity, effect_id)
	EventBus.emit_signal("status_effect_removed", entity, effect_id)


func _process_tick(entity: Node, effect_id: StringName, state: Dictionary, def: Dictionary) -> void:
	var stacks: int = state["stacks"] as int

	# Damage ticks
	var tick_damage: int = def["tick_damage"] as int
	if tick_damage > 0:
		var total_tick: int = tick_damage * stacks
		entity.take_damage(total_tick, &"physical", state.get("source"))
		effect_tick.emit(entity, effect_id, total_tick)
		EventBus.emit_signal("status_effect_tick", entity, effect_id, total_tick)

	# Percent HP tick (bleeding)
	if def.has("percent_hp_tick"):
		var percent: float = def["percent_hp_tick"] as float
		var hp_damage: int = maxi(int(floor(float(entity.max_hp) * percent)) * stacks, 1)
		entity.take_damage(hp_damage, &"physical", state.get("source"))
		effect_tick.emit(entity, effect_id, hp_damage)
		EventBus.emit_signal("status_effect_tick", entity, effect_id, hp_damage)

	# Heal ticks (regenerating)
	if def.has("tick_heal"):
		var heal_amount: int = def["tick_heal"] as int
		# Check for poisoned heal reduction
		var heal_mod: float = 1.0 + get_stat_modifier(entity, &"heal_received")
		heal_amount = maxi(int(floor(float(heal_amount) * heal_mod)), 0)
		if heal_amount > 0:
			entity.heal(heal_amount)


func _apply_cc_flags(entity: Node, effect_id: StringName, is_active: bool) -> void:
	# Set or clear the entity's CC boolean flags
	match effect_id:
		&"stunned":
			if "is_stunned" in entity:
				entity.is_stunned = is_active
		&"frozen":
			if "is_frozen" in entity:
				entity.is_frozen = is_active
		&"rooted":
			if "is_rooted" in entity:
				entity.is_rooted = is_active
		&"fear":
			# Fear changes AI state to flee
			if is_active and "ai_state" in entity:
				entity.ai_state = &"flee"
