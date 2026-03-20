class_name DamageCalculator
extends RefCounted
## Pure damage math pipeline. No side effects, no signals, no node references.
## Returns a DamageResult with full breakdown for consumers to act on.


# --- Inner class ---

class DamageResult extends RefCounted:
	var hit: bool = false
	var miss: bool = true
	var base_damage: float = 0.0
	var weapon_armor_mod: float = 1.0
	var element_mod: float = 1.0
	var defense_reduction: float = 1.0
	var is_critical: bool = false
	var crit_multiplier: float = 1.0
	var variance: float = 1.0
	var social_mod: float = 1.0
	var skill_damage_mod: float = 1.0
	var skill_defense_mod: float = 1.0
	var final_damage: int = 0
	var element: StringName = &"physical"
	var damage_type: StringName = &"physical"
	var attacker_ref: Node = null
	var defender_ref: Node = null
	var is_ambush: bool = false
	var min_damage: int = 1

	func get_breakdown() -> Dictionary:
		return {
			"hit": hit,
			"miss": miss,
			"base_damage": base_damage,
			"weapon_armor_mod": weapon_armor_mod,
			"element_mod": element_mod,
			"defense_reduction": defense_reduction,
			"is_critical": is_critical,
			"crit_multiplier": crit_multiplier,
			"variance": variance,
			"social_mod": social_mod,
			"skill_damage_mod": skill_damage_mod,
			"skill_defense_mod": skill_defense_mod,
			"final_damage": final_damage,
			"element": element,
			"damage_type": damage_type,
			"is_ambush": is_ambush,
		}

	func _to_string() -> String:
		if miss:
			return "DamageResult(MISS)"
		return "DamageResult(final=%d, base=%.1f, crit=%s)" % [final_damage, base_damage, is_critical]


# --- Constants ---

## Rows: blade, blunt, pierce.  Cols: unarmored, hide, scaled, armored, stone, bone, ethereal
const WEAPON_ARMOR_MATRIX: Dictionary = {
	&"blade": {
		&"unarmored": 1.20, &"hide": 1.10, &"scaled": 0.85,
		&"armored": 0.70, &"stone": 0.50, &"bone": 0.90, &"ethereal": 0.60,
	},
	&"blunt": {
		&"unarmored": 0.90, &"hide": 1.00, &"scaled": 1.10,
		&"armored": 1.25, &"stone": 1.30, &"bone": 1.20, &"ethereal": 0.50,
	},
	&"pierce": {
		&"unarmored": 1.10, &"hide": 1.20, &"scaled": 1.00,
		&"armored": 0.80, &"stone": 0.40, &"bone": 0.85, &"ethereal": 0.70,
	},
}

## Element effectiveness matrix. attacker_element -> defender_element -> multiplier
const ELEMENT_MATRIX: Dictionary = {
	&"fire": {
		&"fire": 0.50, &"ice": 2.00, &"lightning": 1.00, &"necromancy": 1.25,
		&"arcane": 1.00, &"holy": 0.75, &"dark": 1.25, &"death": 1.00, &"physical": 1.00,
	},
	&"ice": {
		&"fire": 0.50, &"ice": 0.50, &"lightning": 0.75, &"necromancy": 1.00,
		&"arcane": 1.00, &"holy": 1.00, &"dark": 1.00, &"death": 1.00, &"physical": 1.00,
	},
	&"lightning": {
		&"fire": 1.00, &"ice": 1.25, &"lightning": 0.50, &"necromancy": 1.00,
		&"arcane": 0.75, &"holy": 1.00, &"dark": 1.25, &"death": 1.00, &"physical": 1.00,
	},
	&"necromancy": {
		&"fire": 0.75, &"ice": 1.00, &"lightning": 1.00, &"necromancy": 0.50,
		&"arcane": 1.25, &"holy": 0.25, &"dark": 1.50, &"death": 0.75, &"physical": 1.00,
	},
	&"arcane": {
		&"fire": 1.00, &"ice": 1.00, &"lightning": 1.25, &"necromancy": 0.75,
		&"arcane": 0.50, &"holy": 1.00, &"dark": 1.00, &"death": 1.25, &"physical": 1.00,
	},
	&"holy": {
		&"fire": 1.25, &"ice": 1.00, &"lightning": 1.00, &"necromancy": 2.00,
		&"arcane": 1.00, &"holy": 0.50, &"dark": 2.00, &"death": 2.00, &"physical": 1.00,
	},
	&"dark": {
		&"fire": 0.75, &"ice": 1.00, &"lightning": 0.75, &"necromancy": 1.50,
		&"arcane": 1.00, &"holy": 0.25, &"dark": 0.50, &"death": 1.25, &"physical": 1.00,
	},
	&"death": {
		&"fire": 1.00, &"ice": 1.00, &"lightning": 1.00, &"necromancy": 0.75,
		&"arcane": 0.75, &"holy": 0.25, &"dark": 1.25, &"death": 0.00, &"physical": 1.50,
	},
	&"physical": {
		&"fire": 1.00, &"ice": 1.00, &"lightning": 1.00, &"necromancy": 1.00,
		&"arcane": 1.00, &"holy": 1.00, &"dark": 1.00, &"death": 1.00, &"physical": 1.00,
	},
}

# Stat divisors for unarmed / monster base damage secondary component
const UNARMED_DIVISOR: float = 3.0
const MONSTER_DIVISOR: float = 4.0

# Crit constants
const BASE_CRIT_CHANCE: float = 0.05
const AGI_CRIT_PER_POINT: float = 0.001
const PIERCE_CRIT_BONUS: float = 0.07
const MAX_CRIT_CHANCE: float = 0.50
const CRIT_MULTIPLIER: float = 2.5

# Defense constants
const DEFENSE_PER_POINT: float = 0.015
const MAX_DEFENSE_REDUCTION: float = 0.75

# Variance constants
const VARIANCE_BASE: float = 1.0
const VARIANCE_RANGE: float = 0.20
const VARIANCE_OFFSET: float = 0.10


# --- Public API ---

## Full 11-step damage pipeline. Returns a DamageResult with every intermediate value.
## attacker / defender are Entity (or subclass).
## context is an optional dict with keys like:
##   weapon: Resource, skill_multiplier: float, skill_defense_reduction: float,
##   weapon_type: StringName, attack_element: StringName, is_ambush: bool,
##   primary_stat: StringName, damage_type: StringName
func calculate(attacker: Node, defender: Node, context: Dictionary = {}) -> DamageResult:
	var result := DamageResult.new()
	result.attacker_ref = attacker
	result.defender_ref = defender
	result.element = context.get("element", attacker.element) as StringName
	result.damage_type = context.get("damage_type", &"physical") as StringName
	result.is_ambush = context.get("is_ambush", false) as bool

	# Step 1 -- Hit check
	result.hit = _roll_hit(attacker, defender)
	if not result.hit:
		result.miss = true
		result.final_damage = 0
		return result
	result.miss = false

	# Step 2 -- Base damage
	result.base_damage = _calc_base_damage(attacker, context)

	# Step 3 -- Weapon vs Armor
	result.weapon_armor_mod = _calc_weapon_armor(context, defender)

	# Step 4 -- Element vs Element
	var def_element: StringName = defender.element if "element" in defender else &"physical"
	result.element_mod = _calc_element(result.element, def_element)

	# Step 5 -- Defense reduction
	result.defense_reduction = _calc_defense_reduction(defender, context)

	# Step 6 -- Critical hit
	var crit_data: Dictionary = _calc_critical(attacker, context)
	result.is_critical = crit_data["is_critical"]
	result.crit_multiplier = crit_data["multiplier"]

	# Step 7 -- Variance
	result.variance = VARIANCE_BASE - VARIANCE_OFFSET + randf() * VARIANCE_RANGE

	# Step 8 -- Social bonuses
	result.social_mod = _calc_social(attacker)

	# Step 9 -- Skill damage multiplier (player only)
	result.skill_damage_mod = _calc_skill_damage_mod(attacker, context)

	# Step 10 -- Skill defense reduction (player defender only)
	result.skill_defense_mod = _calc_skill_defense_mod(defender, context)

	# Step 11 -- Final multiplication chain
	var raw: float = result.base_damage
	raw *= result.weapon_armor_mod
	raw *= result.element_mod
	raw *= result.defense_reduction
	raw *= result.crit_multiplier
	raw *= result.variance
	raw *= result.social_mod
	raw *= result.skill_damage_mod
	raw *= result.skill_defense_mod

	result.final_damage = maxi(int(floor(raw)), result.min_damage)
	return result


# --- Private helpers ---

func _roll_hit(attacker: Node, defender: Node) -> bool:
	# Player always hits
	if attacker.get("is_player"):
		return true
	# Enemy hit formula: clamp(0.90 + atk_agi*0.002 - def_agi*0.003, 0.50, 0.95)
	var atk_agi: float = _get_stat(attacker, &"AGI")
	var def_agi: float = _get_stat(defender, &"AGI")
	var hit_chance: float = clampf(0.90 + atk_agi * 0.002 - def_agi * 0.003, 0.50, 0.95)
	return randf() <= hit_chance


func _calc_base_damage(attacker: Node, context: Dictionary) -> float:
	var weapon = context.get("weapon", null)
	if weapon != null and weapon.get("stats") != null and weapon.stats.has("damage"):
		# Armed: weapon.stats.damage + primary_stat * 0.5
		var weapon_damage: float = float(weapon.stats.damage)
		var scaling_stat: float = _get_primary_stat(attacker, weapon, context)
		return weapon_damage + scaling_stat * 0.5

	# Unarmed or monster: floor(stat * 0.5) + floor(stat / divisor)
	var stat_value: float = _get_primary_stat_raw(attacker, context)
	var divisor: float = UNARMED_DIVISOR if attacker.get("is_player") else MONSTER_DIVISOR
	return float(int(floor(stat_value * 0.5)) + int(floor(stat_value / divisor)))


func _calc_weapon_armor(context: Dictionary, defender: Node) -> float:
	var weapon_type: StringName = context.get("weapon_type", &"blunt") as StringName
	var armor_type: StringName = &"unarmored"
	if defender.get("armor_type"):
		armor_type = defender.armor_type
	if WEAPON_ARMOR_MATRIX.has(weapon_type) and WEAPON_ARMOR_MATRIX[weapon_type].has(armor_type):
		return WEAPON_ARMOR_MATRIX[weapon_type][armor_type]
	return 1.0


func _calc_element(atk_element: StringName, def_element: StringName) -> float:
	if ELEMENT_MATRIX.has(atk_element) and ELEMENT_MATRIX[atk_element].has(def_element):
		return ELEMENT_MATRIX[atk_element][def_element]
	return 1.0


func _calc_defense_reduction(defender: Node, context: Dictionary) -> float:
	var defense: float = 0.0
	if defender.get("is_player"):
		# Player uses p_def or m_def depending on damage type
		var dtype: StringName = context.get("damage_type", &"physical") as StringName
		defense = float(defender.p_def) if dtype == &"physical" else float(defender.m_def)
	else:
		defense = float(defender.base_defense)
	# 1.0 - min(defense * 0.015, 0.75)
	return 1.0 - minf(defense * DEFENSE_PER_POINT, MAX_DEFENSE_REDUCTION)


func _calc_critical(attacker: Node, context: Dictionary) -> Dictionary:
	var crit_chance: float = BASE_CRIT_CHANCE
	# AGI bonus
	var agi: float = _get_stat(attacker, &"AGI")
	crit_chance += agi * AGI_CRIT_PER_POINT
	# Weapon crit bonus
	if attacker.get("is_player"):
		crit_chance += attacker.get("crit_chance") if attacker.get("crit_chance") else 0.0
		var weapon = context.get("weapon", null)
		if weapon and weapon.get("stats") and weapon.stats.get("crit_bonus"):
			crit_chance += float(weapon.stats.crit_bonus)
	# Pierce type bonus
	var weapon_type: StringName = context.get("weapon_type", &"") as StringName
	if weapon_type == &"pierce":
		crit_chance += PIERCE_CRIT_BONUS
	# Cap at 50%
	crit_chance = clampf(crit_chance, 0.0, MAX_CRIT_CHANCE)
	# Ambush guarantees crit
	var is_crit: bool = randf() <= crit_chance
	if context.get("is_ambush", false):
		is_crit = true
	return {"is_critical": is_crit, "multiplier": CRIT_MULTIPLIER if is_crit else 1.0}


func _calc_social(attacker: Node) -> float:
	if attacker.has_method("get_social_modifier"):
		return attacker.get_social_modifier() as float
	return 1.0


func _calc_skill_damage_mod(attacker: Node, context: Dictionary) -> float:
	if attacker.get("is_player") and context.has("skill_multiplier"):
		return float(context["skill_multiplier"])
	return 1.0


func _calc_skill_defense_mod(defender: Node, context: Dictionary) -> float:
	if defender.get("is_player") and context.has("skill_defense_reduction"):
		var reduction: float = float(context["skill_defense_reduction"])
		return 1.0 - reduction
	return 1.0


# --- Stat helpers ---

func _get_stat(entity: Node, stat_name: StringName) -> float:
	if entity.get("stats") and entity.stats is Dictionary and entity.stats.has(stat_name):
		return float(entity.stats[stat_name])
	return 10.0


func _get_primary_stat(entity: Node, weapon: Resource, context: Dictionary) -> float:
	# Check context override first
	if context.has("primary_stat"):
		return _get_stat(entity, context["primary_stat"] as StringName)
	# Then weapon scaling stat
	if weapon and weapon.get("scaling_stat"):
		return _get_stat(entity, weapon.scaling_stat)
	return _get_primary_stat_raw(entity, context)


func _get_primary_stat_raw(entity: Node, context: Dictionary = {}) -> float:
	if context.has("primary_stat"):
		return _get_stat(entity, context["primary_stat"] as StringName)
	return _get_stat(entity, &"STR")
