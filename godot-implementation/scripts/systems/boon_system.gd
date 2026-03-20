class_name BoonSystem
extends BaseSystem
## Per-run boon system: 7 Ancestors, tiered boons (Core/Resonance/Legendary),
## stat modifiers, synergy activation, offering generation. Cleared on death.

# --- Config ---
const MAX_ACTIVE_BOONS: int = 12
const SYNERGY_THRESHOLD: int = 3

# --- Ancestors ---
const ANCESTORS: Dictionary = {
	"torchbearer":   {"name": "The Torchbearer",   "theme": "Light, fire, vision"},
	"headsman":      {"name": "The Headsman",       "theme": "Bleed, execute, violence"},
	"lurker":        {"name": "The Lurker",         "theme": "Stealth, crit, evasion"},
	"storm_caller":  {"name": "The Storm Caller",   "theme": "Lightning, speed, chain"},
	"rot_weaver":    {"name": "The Rot Weaver",     "theme": "Poison, decay, DOT"},
	"iron_warden":   {"name": "The Iron Warden",    "theme": "Defense, thorns, fortify"},
	"maniac":        {"name": "The Maniac",         "theme": "Glass cannon, risk/reward"},
}

# --- Tier enum ---
enum BoonTier { CORE = 0, RESONANCE = 1, LEGENDARY = 2 }

# --- Boon definitions ---
# Each boon: {name, ancestor, tier, description, stackable, max_stacks, effects}
const BOON_DEFS: Dictionary = {
	# --- Torchbearer Core ---
	"ember_sight":       {"name": "Ember Sight",       "ancestor": "torchbearer", "tier": BoonTier.CORE, "stackable": true,  "max_stacks": 3, "effects": [{"type": "stat", "stat": "vision_range", "value": 2}], "description": "+2 vision range"},
	"burning_touch":     {"name": "Burning Touch",     "ancestor": "torchbearer", "tier": BoonTier.CORE, "stackable": true,  "max_stacks": 3, "effects": [{"type": "stat", "stat": "fire_damage", "value": 0.1}], "description": "+10% fire damage"},
	"torch_efficiency":  {"name": "Torch Efficiency",  "ancestor": "torchbearer", "tier": BoonTier.CORE, "stackable": false, "max_stacks": 1, "effects": [{"type": "stat", "stat": "torch_fuel_rate", "value": -0.5}], "description": "Torch burns 50% slower"},
	# --- Headsman Core ---
	"blood_draw":        {"name": "Blood Draw",        "ancestor": "headsman",    "tier": BoonTier.CORE, "stackable": true,  "max_stacks": 3, "effects": [{"type": "stat", "stat": "bleed_chance", "value": 0.1}], "description": "+10% bleed chance"},
	"executioner":       {"name": "Executioner",       "ancestor": "headsman",    "tier": BoonTier.CORE, "stackable": false, "max_stacks": 1, "effects": [{"type": "conditional_damage", "condition": "low_hp_target", "value": 0.3}], "description": "+30% damage to targets below 25% HP"},
	"bloodlust":         {"name": "Bloodlust",         "ancestor": "headsman",    "tier": BoonTier.CORE, "stackable": true,  "max_stacks": 3, "effects": [{"type": "stat", "stat": "attack_speed", "value": 0.05}], "description": "+5% attack speed"},
	# --- Lurker Core ---
	"shadow_step":       {"name": "Shadow Step",       "ancestor": "lurker",      "tier": BoonTier.CORE, "stackable": false, "max_stacks": 1, "effects": [{"type": "stat", "stat": "noise_mult", "value": -0.3}], "description": "30% less noise"},
	"backstab":          {"name": "Backstab",          "ancestor": "lurker",      "tier": BoonTier.CORE, "stackable": true,  "max_stacks": 3, "effects": [{"type": "stat", "stat": "crit_damage", "value": 0.2}], "description": "+20% crit damage"},
	"evasion":           {"name": "Evasion",           "ancestor": "lurker",      "tier": BoonTier.CORE, "stackable": true,  "max_stacks": 3, "effects": [{"type": "stat", "stat": "dodge_chance", "value": 0.05}], "description": "+5% dodge chance"},
	# --- Storm Caller Core ---
	"static_charge":     {"name": "Static Charge",     "ancestor": "storm_caller","tier": BoonTier.CORE, "stackable": true,  "max_stacks": 3, "effects": [{"type": "stat", "stat": "lightning_damage", "value": 0.1}], "description": "+10% lightning damage"},
	"chain_lightning":   {"name": "Chain Lightning",   "ancestor": "storm_caller","tier": BoonTier.CORE, "stackable": false, "max_stacks": 1, "effects": [{"type": "on_hit", "effect": "chain_zap", "value": 5}], "description": "Attacks chain to 1 nearby enemy for 5 damage"},
	"quickening":        {"name": "Quickening",        "ancestor": "storm_caller","tier": BoonTier.CORE, "stackable": true,  "max_stacks": 3, "effects": [{"type": "stat", "stat": "move_speed", "value": 0.05}], "description": "+5% movement speed"},
	# --- Rot Weaver Core ---
	"toxic_strike":      {"name": "Toxic Strike",      "ancestor": "rot_weaver",  "tier": BoonTier.CORE, "stackable": true,  "max_stacks": 3, "effects": [{"type": "stat", "stat": "poison_chance", "value": 0.1}], "description": "+10% poison chance"},
	"decay_aura":        {"name": "Decay Aura",        "ancestor": "rot_weaver",  "tier": BoonTier.CORE, "stackable": false, "max_stacks": 1, "effects": [{"type": "aura", "effect": "poison", "radius": 2, "dps": 2}], "description": "Nearby enemies take 2 poison DPS"},
	"festering_wounds":  {"name": "Festering Wounds",  "ancestor": "rot_weaver",  "tier": BoonTier.CORE, "stackable": true,  "max_stacks": 3, "effects": [{"type": "stat", "stat": "dot_damage", "value": 0.15}], "description": "+15% DOT damage"},
	# --- Iron Warden Core ---
	"iron_skin":         {"name": "Iron Skin",         "ancestor": "iron_warden", "tier": BoonTier.CORE, "stackable": true,  "max_stacks": 3, "effects": [{"type": "stat", "stat": "defense", "value": 5}], "description": "+5 defense"},
	"thorns":            {"name": "Thorns",            "ancestor": "iron_warden", "tier": BoonTier.CORE, "stackable": true,  "max_stacks": 3, "effects": [{"type": "on_hit_taken", "effect": "reflect", "value": 3}], "description": "Reflect 3 damage to attackers"},
	"fortify":           {"name": "Fortify",           "ancestor": "iron_warden", "tier": BoonTier.CORE, "stackable": false, "max_stacks": 1, "effects": [{"type": "stat", "stat": "max_hp", "value": 20}], "description": "+20 max HP"},
	# --- Maniac Core ---
	"berserker_rage":    {"name": "Berserker Rage",    "ancestor": "maniac",      "tier": BoonTier.CORE, "stackable": false, "max_stacks": 1, "effects": [{"type": "tradeoff", "bonus": {"stat": "damage", "value": 0.3}, "penalty": {"stat": "defense", "value": -10}}], "description": "+30% damage, -10 defense"},
	"glass_cannon":      {"name": "Glass Cannon",      "ancestor": "maniac",      "tier": BoonTier.CORE, "stackable": false, "max_stacks": 1, "effects": [{"type": "tradeoff", "bonus": {"stat": "crit_chance", "value": 0.15}, "penalty": {"stat": "max_hp", "value": -20}}], "description": "+15% crit chance, -20 max HP"},
	"adrenaline":        {"name": "Adrenaline",        "ancestor": "maniac",      "tier": BoonTier.CORE, "stackable": true,  "max_stacks": 3, "effects": [{"type": "stat", "stat": "attack_speed", "value": 0.1}], "description": "+10% attack speed"},
	# --- Legendary capstones ---
	"supernova":         {"name": "SUPERNOVA",         "ancestor": "torchbearer", "tier": BoonTier.LEGENDARY, "stackable": false, "max_stacks": 1, "effects": [{"type": "active", "effect": "light_explosion"}], "description": "Massive AoE light explosion ability"},
	"crimson_rain":      {"name": "CRIMSON RAIN",      "ancestor": "headsman",    "tier": BoonTier.LEGENDARY, "stackable": false, "max_stacks": 1, "effects": [{"type": "on_kill", "effect": "aoe_bleed"}], "description": "AoE bleed on kill"},
	"ghost_machine":     {"name": "GHOST IN THE MACHINE","ancestor": "lurker",    "tier": BoonTier.LEGENDARY, "stackable": false, "max_stacks": 1, "effects": [{"type": "active", "effect": "phase_walls"}], "description": "Phase through walls"},
	"velocity_god":      {"name": "VELOCITY GOD",      "ancestor": "storm_caller","tier": BoonTier.LEGENDARY, "stackable": false, "max_stacks": 1, "effects": [{"type": "stat", "stat": "move_speed", "value": 0.5}], "description": "Permanent 50% haste"},
	"pandemic":          {"name": "PANDEMIC",           "ancestor": "rot_weaver", "tier": BoonTier.LEGENDARY, "stackable": false, "max_stacks": 1, "effects": [{"type": "on_kill", "effect": "spread_poison"}], "description": "Spread poison to all nearby enemies on kill"},
	"colossus":          {"name": "COLOSSUS",           "ancestor": "iron_warden","tier": BoonTier.LEGENDARY, "stackable": false, "max_stacks": 1, "effects": [{"type": "periodic", "effect": "damage_immunity", "interval": 10.0, "duration": 2.0}], "description": "2s damage immunity every 10s"},
	"final_offer":       {"name": "FINAL OFFER",        "ancestor": "maniac",    "tier": BoonTier.LEGENDARY, "stackable": false, "max_stacks": 1, "effects": [{"type": "ultimate_tradeoff", "bonus": {"stat": "damage", "value": 4.0}, "penalty": {"stat": "max_hp", "value": 1}, "revive": true}], "description": "1 max HP, 5x damage, free revive"},
}

# --- State ---
var active_boons: Dictionary = {}          # boon_id -> stack_count
var active_player_boons: Array[String] = [] # Ordered list for display
var active_synergies: Array[String] = []   # Active ancestor synergy IDs
var _stat_modifiers: Dictionary = {}       # stat_name -> float accumulated value
var _special_handlers: Dictionary = {}     # boon_id -> effect data


func _init() -> void:
	system_name = "boon-system"
	priority = 55


func initialize() -> void:
	pass


func process_system(_delta: float) -> void:
	pass  # Boons are event-driven


func cleanup() -> void:
	clear_boons()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func apply_boon(boon_id: String) -> bool:
	## Applies a boon. Returns false if invalid or at max stacks.
	if not BOON_DEFS.has(boon_id):
		return false

	var def: Dictionary = BOON_DEFS[boon_id]
	var current_stacks: int = active_boons.get(boon_id, 0)

	# Check max boons
	if current_stacks == 0 and active_player_boons.size() >= MAX_ACTIVE_BOONS:
		return false

	# Check max stacks
	var max_stacks: int = def.get("max_stacks", 1)
	if current_stacks >= max_stacks:
		return false

	# Apply
	active_boons[boon_id] = current_stacks + 1
	if current_stacks == 0:
		active_player_boons.append(boon_id)

	# Apply stat modifiers
	_apply_boon_effects(boon_id, def)

	# Check synergy
	_check_synergies()

	EventBus.player_boon_selected.emit(boon_id, def.get("ancestor", ""))
	return true


func remove_boon(boon_id: String, all_stacks: bool = true) -> void:
	if not active_boons.has(boon_id):
		return

	if all_stacks:
		var stacks: int = active_boons[boon_id]
		for i in range(stacks):
			_remove_boon_effects(boon_id)
		active_boons.erase(boon_id)
		active_player_boons.erase(boon_id)
	else:
		_remove_boon_effects(boon_id)
		active_boons[boon_id] -= 1
		if active_boons[boon_id] <= 0:
			active_boons.erase(boon_id)
			active_player_boons.erase(boon_id)

	_check_synergies()
	EventBus.player_boon_removed.emit(boon_id)


func clear_boons() -> void:
	## Death wipe: remove all boons in reverse order.
	var boons_copy := active_player_boons.duplicate()
	boons_copy.reverse()
	for boon_id in boons_copy:
		remove_boon(boon_id, true)
	active_boons.clear()
	active_player_boons.clear()
	active_synergies.clear()
	_stat_modifiers.clear()
	_special_handlers.clear()


func generate_offering(count: int, floor_num: int) -> Array[String]:
	## Generates a weighted random selection of available boons.
	var available: Array[String] = []
	var weights: Array[float] = []

	for boon_id in BOON_DEFS:
		var def: Dictionary = BOON_DEFS[boon_id]
		var current_stacks: int = active_boons.get(boon_id, 0)
		var max_stacks: int = def.get("max_stacks", 1)

		# Skip if max-stacked
		if current_stacks >= max_stacks:
			continue

		# Tier gating
		var tier: int = def.get("tier", BoonTier.CORE)
		if not _is_tier_available(tier, floor_num):
			continue

		# Legendary requires 3+ boons from same ancestor
		if tier == BoonTier.LEGENDARY:
			var ancestor: String = def.get("ancestor", "")
			if _count_ancestor_boons(ancestor) < SYNERGY_THRESHOLD:
				continue

		available.append(boon_id)
		var weight := 1.0
		match tier:
			BoonTier.RESONANCE: weight = 1.5
			BoonTier.LEGENDARY: weight = 2.0
		weights.append(weight)

	# Weighted random selection
	var result: Array[String] = []
	for i in range(mini(count, available.size())):
		var index := _weighted_random(weights)
		if index >= 0:
			result.append(available[index])
			available.remove_at(index)
			weights.remove_at(index)

	return result


func get_stat_modifier(stat_name: String) -> float:
	## Returns accumulated stat modifier for a given stat.
	return _stat_modifiers.get(stat_name, 0.0)


func has_boon(boon_id: String) -> bool:
	return active_boons.has(boon_id)


func get_boon_stacks(boon_id: String) -> int:
	return active_boons.get(boon_id, 0)


func get_active_boon_count() -> int:
	return active_player_boons.size()


func get_ancestor_boon_count(ancestor: String) -> int:
	return _count_ancestor_boons(ancestor)


func has_synergy(ancestor: String) -> bool:
	return ancestor in active_synergies


# ---------------------------------------------------------------------------
# Boon helper functions (global stat queries)
# ---------------------------------------------------------------------------

func apply_boon_hp_bonus(base_hp: int) -> int:
	var bonus: float = _stat_modifiers.get("max_hp", 0.0)
	return maxi(int(float(base_hp) + bonus), 1)


func apply_boon_damage_reduction(damage: int) -> int:
	var reduction: float = _stat_modifiers.get("damage_reduction", 0.0)
	return maxi(int(float(damage) * (1.0 - reduction)), 0)


func apply_boon_attack_speed(base_cooldown: float) -> float:
	var bonus: float = _stat_modifiers.get("attack_speed", 0.0)
	return maxf(base_cooldown * (1.0 - bonus), 0.05)


func apply_boon_gold_bonus(base_gold: int) -> int:
	var bonus: float = _stat_modifiers.get("gold_bonus", 0.0)
	return int(float(base_gold) * (1.0 + bonus))


func apply_boon_xp_bonus(base_xp: int) -> int:
	var bonus: float = _stat_modifiers.get("xp_bonus", 0.0)
	return int(float(base_xp) * (1.0 + bonus))


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _apply_boon_effects(boon_id: String, def: Dictionary) -> void:
	var effects: Array = def.get("effects", [])
	for effect in effects:
		var eff_type: String = effect.get("type", "")
		match eff_type:
			"stat":
				var stat: String = effect.get("stat", "")
				var value: float = effect.get("value", 0.0)
				_stat_modifiers[stat] = _stat_modifiers.get(stat, 0.0) + value
			"tradeoff":
				var bonus: Dictionary = effect.get("bonus", {})
				var penalty: Dictionary = effect.get("penalty", {})
				if bonus.has("stat"):
					_stat_modifiers[bonus["stat"]] = _stat_modifiers.get(bonus["stat"], 0.0) + bonus.get("value", 0.0)
				if penalty.has("stat"):
					_stat_modifiers[penalty["stat"]] = _stat_modifiers.get(penalty["stat"], 0.0) + penalty.get("value", 0.0)
			"ultimate_tradeoff":
				var bonus: Dictionary = effect.get("bonus", {})
				var penalty: Dictionary = effect.get("penalty", {})
				if bonus.has("stat"):
					_stat_modifiers[bonus["stat"]] = _stat_modifiers.get(bonus["stat"], 0.0) + bonus.get("value", 0.0)
				if penalty.has("stat"):
					_stat_modifiers[penalty["stat"]] = penalty.get("value", 0.0)  # Override, not additive
			"on_hit", "on_hit_taken", "on_kill", "aura", "active", "periodic", "conditional_damage":
				_special_handlers[boon_id] = effect


func _remove_boon_effects(boon_id: String) -> void:
	if not BOON_DEFS.has(boon_id):
		return
	var def: Dictionary = BOON_DEFS[boon_id]
	var effects: Array = def.get("effects", [])
	for effect in effects:
		var eff_type: String = effect.get("type", "")
		match eff_type:
			"stat":
				var stat: String = effect.get("stat", "")
				var value: float = effect.get("value", 0.0)
				_stat_modifiers[stat] = _stat_modifiers.get(stat, 0.0) - value
			"tradeoff":
				var bonus: Dictionary = effect.get("bonus", {})
				var penalty: Dictionary = effect.get("penalty", {})
				if bonus.has("stat"):
					_stat_modifiers[bonus["stat"]] = _stat_modifiers.get(bonus["stat"], 0.0) - bonus.get("value", 0.0)
				if penalty.has("stat"):
					_stat_modifiers[penalty["stat"]] = _stat_modifiers.get(penalty["stat"], 0.0) - penalty.get("value", 0.0)
			"ultimate_tradeoff":
				var bonus: Dictionary = effect.get("bonus", {})
				var penalty: Dictionary = effect.get("penalty", {})
				if bonus.has("stat"):
					_stat_modifiers[bonus["stat"]] = _stat_modifiers.get(bonus["stat"], 0.0) - bonus.get("value", 0.0)
				if penalty.has("stat"):
					_stat_modifiers.erase(penalty["stat"])
			_:
				_special_handlers.erase(boon_id)


func _check_synergies() -> void:
	var old_synergies := active_synergies.duplicate()
	active_synergies.clear()

	for ancestor in ANCESTORS:
		var count := _count_ancestor_boons(ancestor)
		if count >= SYNERGY_THRESHOLD:
			active_synergies.append(ancestor)
			if ancestor not in old_synergies:
				EventBus.synergy_activated.emit(ancestor, SYNERGY_THRESHOLD)

	for ancestor in old_synergies:
		if ancestor not in active_synergies:
			EventBus.synergy_deactivated.emit(ancestor, SYNERGY_THRESHOLD)


func _count_ancestor_boons(ancestor: String) -> int:
	var count := 0
	for boon_id in active_player_boons:
		var def: Dictionary = BOON_DEFS.get(boon_id, {})
		if def.get("ancestor", "") == ancestor:
			count += active_boons.get(boon_id, 0)
	return count


func _is_tier_available(tier: int, floor_num: int) -> bool:
	match tier:
		BoonTier.CORE:
			return true
		BoonTier.RESONANCE:
			if floor_num < 3:
				return false
			# Require boons from 2+ different ancestors
			var ancestor_set: Array[String] = []
			for boon_id in active_player_boons:
				var a: String = BOON_DEFS.get(boon_id, {}).get("ancestor", "")
				if a not in ancestor_set:
					ancestor_set.append(a)
			return ancestor_set.size() >= 2
		BoonTier.LEGENDARY:
			return floor_num >= 6
		_:
			return false


func _weighted_random(weights: Array[float]) -> int:
	if weights.is_empty():
		return -1
	var total := 0.0
	for w in weights:
		total += w
	if total <= 0.0:
		return -1
	var roll := randf() * total
	var cumulative := 0.0
	for i in range(weights.size()):
		cumulative += weights[i]
		if roll <= cumulative:
			return i
	return weights.size() - 1
