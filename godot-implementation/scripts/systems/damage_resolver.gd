class_name DamageResolver
extends BaseSystem
## Central damage calculation: 11-step pipeline from raw attack to final HP change.
## Element matrix, weapon-armor matrix, crit system, shield absorption.

# --- Element effectiveness matrix ---
# Row = attacker element, Col = defender element
# Values: 0.5 = resist, 1.0 = neutral, 1.5 = weak, 2.0 = very weak
# Order: FIRE, ICE, WATER, EARTH, NATURE, DEATH, ARCANE, DARK, HOLY, PHYSICAL
const ELEMENT_MATRIX: Array = [
	#       FIRE  ICE   WATER EARTH NAT   DEATH ARC   DARK  HOLY  PHYS
	[1.0,  1.5,  0.5,  1.0,  1.5,  1.0,  1.0,  1.0,  1.0,  1.0],  # FIRE
	[0.5,  1.0,  1.5,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0],  # ICE
	[1.5,  0.5,  1.0,  1.5,  0.5,  1.0,  1.0,  1.0,  1.0,  1.0],  # WATER
	[1.0,  1.0,  0.5,  1.0,  1.5,  1.0,  1.0,  1.0,  1.0,  1.0],  # EARTH
	[0.5,  1.0,  1.5,  0.5,  1.0,  1.5,  1.0,  1.0,  1.0,  1.0],  # NATURE
	[1.0,  1.0,  1.0,  1.0,  0.5,  1.0,  0.5,  1.0,  2.0,  1.0],  # DEATH
	[1.0,  1.0,  1.0,  1.0,  1.0,  1.5,  1.0,  1.5,  1.0,  1.0],  # ARCANE
	[1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  0.5,  1.0,  2.0,  1.0],  # DARK
	[1.0,  1.0,  1.0,  1.0,  1.0,  2.0,  1.0,  2.0,  1.0,  1.0],  # HOLY
	[1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0,  1.0],  # PHYSICAL
]

# Element index mapping
const ELEMENT_INDEX: Dictionary = {
	"fire": 0, "ice": 1, "water": 2, "earth": 3, "nature": 4,
	"death": 5, "arcane": 6, "dark": 7, "holy": 8, "physical": 9,
}

# --- Weapon vs Armor effectiveness ---
# Row = weapon type, Col = armor type
# Order weapons: BLADE, BLUNT, PIERCE, MAGIC
# Order armor:   UNARMORED, CLOTH, HIDE, SCALED, ARMORED, STONE, BONE, ETHEREAL
const WEAPON_ARMOR_MATRIX: Array = [
	#       UNARM  CLOTH  HIDE   SCALD  ARMOR  STONE  BONE   ETHER
	[1.0,   1.2,   1.0,   0.8,   0.7,   0.5,   0.9,   1.0],  # BLADE
	[1.0,   0.8,   1.0,   1.2,   1.3,   1.5,   1.2,   0.5],  # BLUNT
	[1.0,   1.3,   1.2,   1.0,   0.8,   0.3,   0.8,   1.0],  # PIERCE
	[1.0,   0.9,   1.0,   1.0,   1.0,   1.0,   1.0,   1.5],  # MAGIC
]

# --- Config ---
const MIN_DAMAGE: int = 1
const CRIT_MULTIPLIER_DEFAULT: float = 1.5
const VARIANCE_MIN: float = 0.9
const VARIANCE_MAX: float = 1.1


func _init() -> void:
	system_name = "damage-resolver"
	priority = 20


func initialize() -> void:
	pass


func process_system(_delta: float) -> void:
	pass  # Damage resolution is on-demand, not per-frame


func cleanup() -> void:
	pass


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func resolve_damage(attacker: Node, defender: Node, attack_data: Dictionary) -> Dictionary:
	## 11-step damage pipeline. Returns result dictionary.
	## attack_data: {base_damage, element, weapon_type, damage_type, crit_chance, crit_multiplier}
	var result := {
		"final_damage": 0,
		"is_crit": false,
		"element": attack_data.get("element", "physical"),
		"was_blocked": false,
		"damage_type": attack_data.get("damage_type", "blade"),
		"overkill": 0,
	}

	# Step 1: Base damage
	var damage := float(attack_data.get("base_damage", 0))

	# Step 2: Proficiency multiplier (via skill system)
	var prof_mult := attack_data.get("proficiency_multiplier", 1.0)
	damage *= prof_mult

	# Step 3: Specialty bonus
	var spec_mult := attack_data.get("specialty_multiplier", 1.0)
	damage *= spec_mult

	# Step 4: Boon damage multiplier
	var boon_mult := attack_data.get("boon_multiplier", 1.0)
	damage *= boon_mult

	# Step 5: Kill streak multiplier
	var streak_mult := attack_data.get("streak_multiplier", 1.0)
	damage *= streak_mult

	# Step 6: Element matrix
	var atk_element: String = attack_data.get("element", "physical")
	var def_element: String = _get_entity_element(defender)
	damage = _apply_element_matrix(damage, atk_element, def_element)

	# Step 7: Weapon-armor matrix
	var weapon_type: String = attack_data.get("damage_type", "blade")
	var armor_type: String = _get_entity_armor_type(defender)
	damage = _apply_weapon_armor_matrix(damage, weapon_type, armor_type)

	# Step 8: Defense scaling: final = damage * (100 / (100 + defense))
	var defense := _get_entity_defense(defender)
	if defense > 0.0:
		damage = damage * (100.0 / (100.0 + defense))

	# Step 9: Critical hit check
	var crit_chance: float = attack_data.get("crit_chance", Constants.PLAYER_CONFIG["base_crit_chance"])
	var crit_mult: float = attack_data.get("crit_multiplier", CRIT_MULTIPLIER_DEFAULT)
	if randf() < crit_chance:
		damage *= crit_mult
		result["is_crit"] = true

	# Step 10: Random variance
	var variance := randf_range(VARIANCE_MIN, VARIANCE_MAX)
	damage *= variance

	# Step 11: Clamp to minimum
	var final_damage := maxi(int(damage), MIN_DAMAGE)

	# Shield absorption (spell system integration)
	if defender == GameManager.player:
		# Check if player has a shield from the spell system
		if defender.has_method("get_shield_hp") and defender.get_shield_hp() > 0:
			var absorbed := mini(final_damage, defender.get_shield_hp())
			if defender.has_method("absorb_shield_damage"):
				defender.absorb_shield_damage(absorbed)
			final_damage -= absorbed
			if final_damage <= 0:
				result["final_damage"] = 0
				result["was_blocked"] = true
				return result

	result["final_damage"] = final_damage

	# Emit signal
	if result["is_crit"]:
		EventBus.player_critical_hit.emit(attacker, defender, float(final_damage))

	return result


func calculate_raw_damage(base: float, atk_element: String, def_element: String,
						weapon_type: String, armor_type: String) -> float:
	## Simplified calculation without entity context.
	var damage := base
	damage = _apply_element_matrix(damage, atk_element, def_element)
	damage = _apply_weapon_armor_matrix(damage, weapon_type, armor_type)
	return maxf(damage, float(MIN_DAMAGE))


# ---------------------------------------------------------------------------
# Matrix lookups
# ---------------------------------------------------------------------------

func _apply_element_matrix(base: float, atk_element: String, def_element: String) -> float:
	var atk_idx: int = ELEMENT_INDEX.get(atk_element, 9)  # Default physical
	var def_idx: int = ELEMENT_INDEX.get(def_element, 9)
	if atk_idx >= 0 and atk_idx < ELEMENT_MATRIX.size():
		var row: Array = ELEMENT_MATRIX[atk_idx]
		if def_idx >= 0 and def_idx < row.size():
			return base * row[def_idx]
	return base


func _apply_weapon_armor_matrix(base: float, weapon_type: String, armor_type: String) -> float:
	var weapon_idx := _weapon_type_index(weapon_type)
	var armor_idx := _armor_type_index(armor_type)
	if weapon_idx >= 0 and weapon_idx < WEAPON_ARMOR_MATRIX.size():
		var row: Array = WEAPON_ARMOR_MATRIX[weapon_idx]
		if armor_idx >= 0 and armor_idx < row.size():
			return base * row[armor_idx]
	return base


func get_element_multiplier(atk_element: String, def_element: String) -> float:
	var atk_idx: int = ELEMENT_INDEX.get(atk_element, 9)
	var def_idx: int = ELEMENT_INDEX.get(def_element, 9)
	if atk_idx >= 0 and atk_idx < ELEMENT_MATRIX.size():
		var row: Array = ELEMENT_MATRIX[atk_idx]
		if def_idx >= 0 and def_idx < row.size():
			return row[def_idx]
	return 1.0


# ---------------------------------------------------------------------------
# Entity property accessors
# ---------------------------------------------------------------------------

func _get_entity_element(entity: Node) -> String:
	if entity == null:
		return "physical"
	if entity.has_method("get_element"):
		return entity.get_element()
	if entity.get("element") != null:
		return str(entity.element)
	return "physical"


func _get_entity_armor_type(entity: Node) -> String:
	if entity == null:
		return "unarmored"
	if entity.has_method("get_armor_type"):
		return entity.get_armor_type()
	if entity.get("armor_type") != null:
		return str(entity.armor_type)
	return "unarmored"


func _get_entity_defense(entity: Node) -> float:
	if entity == null:
		return 0.0
	if entity.has_method("get_defense"):
		return entity.get_defense()
	if entity.get("defense") != null:
		return float(entity.defense)
	return 0.0


# ---------------------------------------------------------------------------
# Index helpers
# ---------------------------------------------------------------------------

func _weapon_type_index(weapon_type: String) -> int:
	match weapon_type:
		"blade", "sword", "dagger": return 0
		"blunt", "mace":           return 1
		"pierce", "polearm", "bow": return 2
		"magic", "staff":          return 3
		_:                         return 0


func _armor_type_index(armor_type: String) -> int:
	match armor_type:
		"unarmored": return 0
		"cloth":     return 1
		"hide":      return 2
		"scaled":    return 3
		"armored":   return 4
		"stone":     return 5
		"bone":      return 6
		"ethereal":  return 7
		_:           return 0
