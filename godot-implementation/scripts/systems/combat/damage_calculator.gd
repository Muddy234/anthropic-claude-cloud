class_name DamageCalculator
extends RefCounted
## Pure damage math pipeline. No side effects, no signals, no node references.
## Returns a DamageResult with full breakdown for consumers to act on.


# --- Inner class ---

class DamageResult:
	var hit: bool = false
	var miss: bool = true
	var base_damage: float = 0.0
	var weapon_armor_mult: float = 1.0
	var element_mult: float = 1.0
	var defense_mult: float = 1.0
	var is_critical: bool = false
	var crit_mult: float = 1.0
	var variance: float = 1.0
	var social_mult: float = 1.0
	var skill_damage_mult: float = 1.0
	var skill_defense_mult: float = 1.0
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
			"weapon_armor_mult": weapon_armor_mult,
			"element_mult": element_mult,
			"defense_mult": defense_mult,
			"is_critical": is_critical,
			"crit_mult": crit_mult,
			"variance": variance,
			"social_mult": social_mult,
			"skill_damage_mult": skill_damage_mult,
			"skill_defense_mult": skill_defense_mult,
			"final_damage": final_damage,
			"element": element,
			"damage_type": damage_type,
			"is_ambush": is_ambush,
		}


# --- Constants ---

## Rows: blade, blunt, pierce.  Cols: unarmored, hide, scaled, armored, stone, bone, ethereal
const WEAPON_ARMOR_MATRIX: Dictionary = {
	&"blade": {
		&"unarmored": 1.20, &"hide": 1.00, &"scaled": 0.80,
		&"armored": 0.60, &"stone": 0.40, &"bone": 0.70, &"ethereal": 0.50,
	},
	&"blunt": {
		&"unarmored": 0.80, &"hide": 0.90, &"scaled": 1.10,
		&"armored": 1.20, &"stone": 1.30, &"bone": 1.20, &"ethereal": 0.30,
	},
	&"pierce": {
		&"unarmored": 1.00, &"hide": 1.10, &"scaled": 0.90,
		&"armored": 0.80, &"stone": 0.50, &"bone": 0.90, &"ethereal": 0.80,
	},
}

## Element effectiveness matrix. attacker_element -> defender_element -> multiplier
const ELEMENT_MATRIX: Dictionary = {
	&"fire": {
		&"fire": 0.50, &"ice": 1.50, &"lightning": 1.00, &"necromancy": 1.25,
		&"arcane": 1.00, &"holy": 1.00, &"dark": 1.00, &"death": 0.75,
		&"physical": 1.00,
	},
	&"ice": {
		&"fire": 0.50, &"ice": 0.50, &"lightning": 0.75, &"necromancy": 1.00,
		&"arcane": 1.00, &"holy": 1.00, &"dark": 1.00, &"death": 0.75,
		&"physical": 1.00,
	},
	&"lightning": {
		&"fire": 1.00, &"ice": 1.25, &"lightning": 0.50, &"necromancy": 1.00,
		&"arcane": 0.75, &"holy": 1.00, &"dark": 1.25, &"death": 0.75,
		&"physical": 1.00,
	},
	&"necromancy": {
		&"fire": 0.75, &"ice": 1.00, &"lightning": 1.00, &"necromancy": 0.50,
		&"arcane": 1.00, &"holy": 0.25, &"dark": 1.25, &"death": 1.50,
		&"physical": 1.00,
	},
	&"arcane": {
		&"fire": 1.00, &"ice": 1.00, &"lightning": 1.25, &"necromancy": 1.00,
		&"arcane": 0.50, &"holy": 0.75, &"dark": 0.75, &"death": 1.00,
		&"physical": 1.00,
	},
	&"holy": {
		&"fire": 1.00, &"ice": 1.00, &"lightning": 1.00, &"necromancy": 1.50,
		&"arcane": 1.25, &"holy": 0.50, &"dark": 1.50, &"death": 2.00,
		&"physical": 1.00,
	},
	&"dark": {
		&"fire": 1.00, &"ice": 1.00, &"lightning": 0.75, &"necromancy": 1.25,
		&"arcane": 1.25, &"holy": 0.50, &"dark": 0.50, &"death": 1.25,
		&"physical": 1.00,
	},
	&"death": {
		&"fire": 1.25, &"ice": 1.25, &"lightning": 1.25, &"necromancy": 1.50,
		&"arcane": 1.00, &"holy": 0.25, &"dark": 0.75, &"death": 0.00,
		&"physical": 1.00,
	},
	&"physical": {
		&"fire": 1.00, &"ice": 1.00, &"lightning": 1.00, &"necromancy": 1.00,
		&"arcane": 1.00, &"holy": 1.00, &"dark": 1.00, &"death": 1.00,
		&"physical": 1.00,
	},
}


# --- Public API ---

## Full 11-step damage pipeline. Returns a DamageResult with every intermediate value.
func calculate(attacker: Node, defender: Node, context: Dictionary = {}) -> DamageResult:
	var result := DamageResult.new()
	result.attacker_ref = attacker
	result.defender_ref = defender
	result.element = context.get("element", attacker.element) as StringName
	result.is_ambush = context.get("is_ambush", false) as bool

	# Step 1 – Hit check
	result.hit = _roll_hit(attacker, defender)
	if not result.hit:
		result.miss = true
		result.final_damage = 0
		return result
	result.miss = false

	# Step 2 – Base damage
	result.base_damage = _calc_base_damage(attacker, context)

	# Step 3 – Weapon vs Armor
	result.weapon_armor_mult = _calc_weapon_armor(attacker, defender, context)

	# Step 4 – Element vs Element
	result.element_mult = _calc_element(result.element, defender.element)

	# Step 5 – Defense reduction
	result.defense_mult = _calc_defense_reduction(defender, context)

	# Step 6 – Critical hit
	var crit_data: Dictionary = _calc_critical(attacker, context)
	result.is_critical = crit_data["is_critical"]
	result.crit_mult = crit_data["multiplier"]

	# Step 7 – Variance
	result.variance = 1.0 - 0.10 + randf() * 0.20

	# Step 8 – Social bonuses
	result.social_mult = _calc_social(attacker)

	# Step 9 – Skill damage multiplier (player only)
	result.skill_damage_mult = _calc_skill_damage_mult(attacker, context)

	# Step 10 – Skill defense reduction (player defender only)
	result.skill_defense_mult = _calc_skill_defense_mult(defender, context)

	# Step 11 – Final multiplication chain
	var raw: float = result.base_damage
	raw *= result.weapon_armor_mult
	raw *= result.element_mult
	raw *= result.defense_mult
	raw *= result.crit_mult
	raw *= result.variance
	raw *= result.social_mult
	raw *= result.skill_damage_mult
	raw *= result.skill_defense_mult

	result.final_damage = maxi(int(floor(raw)), result.min_damage)
	return result


# --- Private helpers ---

func _roll_hit(attacker: Node, defender: Node) -> bool:
	if attacker.get("is_player"):
		return true
	var atk_agi: float = _get_stat(attacker, &"AGI")
	var def_agi: float = _get_stat(defender, &"AGI")
	var hit_chance: float = clampf(0.90 + atk_agi * 0.002 - def_agi * 0.003, 0.50, 0.95)
	return randf() <= hit_chance


func _calc_base_damage(attacker: Node, context: Dictionary) -> float:
	var weapon = context.get("weapon", null)
	if weapon != null and weapon.get("stats") != null:
		var weapon_damage: float = weapon.stats.get("damage", 0.0)
		var scaling_stat: float = _get_primary_stat(attacker, weapon)
		return weapon_damage + scaling_stat * 0.5

	# Unarmed or monster: floor(stat * 0.5) + floor(stat / divisor)
	var stat_value: float = _get_primary_stat_raw(attacker)
	var divisor: float = 3.0 if attacker.get("is_player") else 4.0
	return float(int(floor(stat_value * 0.5)) + int(floor(stat_value / divisor)))


func _calc_weapon_armor(attacker: Node, defender: Node, context: Dictionary) -> float:
	var weapon_type: StringName = context.get("weapon_type", &"blunt") as StringName
	var armor_type: StringName = defender.get("armor_type") if defender.get("armor_type") else &"unarmored"
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
		var def_type: StringName = context.get("damage_type", &"physical") as StringName
		defense = float(defender.p_def) if def_type == &"physical" else float(defender.m_def)
	else:
		defense = float(defender.base_defense)
	return 1.0 - minf(defense * 0.015, 0.75)


func _calc_critical(attacker: Node, context: Dictionary) -> Dictionary:
	var crit_chance: float = 0.05
	var agi: float = _get_stat(attacker, &"AGI")
	crit_chance += agi * 0.001

	if attacker.get("is_player"):
		crit_chance += attacker.get("crit_chance") if attacker.get("crit_chance") else 0.0
		var weapon = context.get("weapon", null)
		if weapon and weapon.get("stats") and weapon.stats.get("crit_bonus"):
			crit_chance += weapon.stats.crit_bonus

	var weapon_type: StringName = context.get("weapon_type", &"") as StringName
	if weapon_type == &"pierce":
		crit_chance += 0.07

	crit_chance = minf(crit_chance, 0.50)

	var is_crit: bool = randf() <= crit_chance
	if context.get("is_ambush", false):
		is_crit = true
	return {"is_critical": is_crit, "multiplier": 2.5 if is_crit else 1.0}


func _calc_social(attacker: Node) -> float:
	if attacker.has_method("get_social_modifier"):
		return attacker.get_social_modifier()
	return 1.0


func _calc_skill_damage_mult(attacker: Node, context: Dictionary) -> float:
	if attacker.get("is_player") and context.has("skill_damage_mult"):
		return context["skill_damage_mult"] as float
	return 1.0


func _calc_skill_defense_mult(defender: Node, context: Dictionary) -> float:
	if defender.get("is_player") and context.has("skill_defense_mult"):
		return context["skill_defense_mult"] as float
	return 1.0


# --- Stat helpers ---

func _get_stat(entity: Node, stat_name: StringName) -> float:
	if entity.get("stats") and entity.stats is Dictionary and entity.stats.has(stat_name):
		return float(entity.stats[stat_name])
	return 10.0


func _get_primary_stat(entity: Node, weapon) -> float:
	if weapon and weapon.get("scaling_stat"):
		return _get_stat(entity, weapon.scaling_stat)
	return _get_primary_stat_raw(entity)


func _get_primary_stat_raw(entity: Node) -> float:
	if entity.get("is_player"):
		return _get_stat(entity, &"STR")
	# Monsters use their base stat if available
	return _get_stat(entity, &"STR")
