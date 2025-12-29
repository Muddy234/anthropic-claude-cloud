class_name DamageCalculator
extends Node

## Handles all damage calculations with 2-layer system (weapon/armor + element)

# Damage type effectiveness matrix
# Row = attacker element, Column = defender element
# Values: 0.5 = weak, 1.0 = normal, 1.5 = strong, 2.0 = super effective
const ELEMENT_MATRIX := {
	Constants.DamageType.FIRE: {
		Constants.DamageType.ICE: 1.5,
		Constants.DamageType.FIRE: 0.5,
		Constants.DamageType.PHYSICAL: 1.0
	},
	Constants.DamageType.ICE: {
		Constants.DamageType.FIRE: 0.5,
		Constants.DamageType.ICE: 0.5,
		Constants.DamageType.LIGHTNING: 1.5,
		Constants.DamageType.PHYSICAL: 1.0
	},
	Constants.DamageType.LIGHTNING: {
		Constants.DamageType.ICE: 0.5,
		Constants.DamageType.LIGHTNING: 0.5,
		Constants.DamageType.PHYSICAL: 1.0
	},
	Constants.DamageType.POISON: {
		Constants.DamageType.POISON: 0.5,
		Constants.DamageType.PHYSICAL: 1.0
	},
	Constants.DamageType.HOLY: {
		Constants.DamageType.DARK: 2.0,
		Constants.DamageType.HOLY: 0.5,
		Constants.DamageType.PHYSICAL: 1.0
	},
	Constants.DamageType.DARK: {
		Constants.DamageType.HOLY: 2.0,
		Constants.DamageType.DARK: 0.5,
		Constants.DamageType.PHYSICAL: 1.0
	}
}

## Calculate full damage with all modifiers
func calculate_damage(attacker: Entity, defender: Entity, context: Dictionary = {}) -> Dictionary:
	var result := {
		"base_damage": 0,
		"final_damage": 0,
		"is_hit": true,
		"is_crit": false,
		"damage_type": Constants.DamageType.PHYSICAL,
		"element_modifier": 1.0,
		"armor_reduction": 0,
		"breakdown": {},
		"messages": []
	}

	# Layer 1: Base weapon damage
	var weapon_damage := _calculate_weapon_damage(attacker)
	result.base_damage = weapon_damage.damage
	result.damage_type = weapon_damage.type

	# Layer 2: Apply attacker stat bonuses
	var stat_bonus := _calculate_stat_bonus(attacker, weapon_damage.type)
	var damage := result.base_damage + stat_bonus

	# Layer 3: Critical hit check
	var crit_chance := _calculate_crit_chance(attacker)
	if randf() < crit_chance:
		result.is_crit = true
		damage = int(damage * 1.5)
		result.messages.append("CRITICAL")

	# Layer 4: Armor reduction
	var armor_reduction := _calculate_armor_reduction(defender, weapon_damage.type)
	result.armor_reduction = armor_reduction
	damage = int(damage * (1.0 - armor_reduction))

	# Layer 5: Element effectiveness
	var element_mod := _calculate_element_modifier(weapon_damage.type, defender)
	result.element_modifier = element_mod
	damage = int(damage * element_mod)

	if element_mod > 1.0:
		result.messages.append("EFFECTIVE!")
	elif element_mod < 1.0:
		result.messages.append("RESISTED")

	# Layer 6: Room/context modifiers
	if context.has("room"):
		damage = _apply_room_modifiers(damage, context.room, attacker, defender)

	# Minimum damage
	damage = maxi(1, damage)
	result.final_damage = damage

	# Build breakdown for UI/debugging
	result.breakdown = {
		"base": result.base_damage,
		"stat_bonus": stat_bonus,
		"crit_mult": 1.5 if result.is_crit else 1.0,
		"armor_reduction": armor_reduction,
		"element_mod": element_mod,
		"final": result.final_damage
	}

	return result

## Calculate weapon base damage
func _calculate_weapon_damage(attacker: Entity) -> Dictionary:
	var result := {
		"damage": attacker.attack,
		"type": Constants.DamageType.PHYSICAL
	}

	if attacker is Player:
		var weapon = attacker.get_equipped_weapon()
		if weapon:
			result.damage = randi_range(weapon.damage_min, weapon.damage_max)
			result.type = weapon.damage_type if weapon.damage_type else Constants.DamageType.PHYSICAL

	elif attacker is Enemy:
		if attacker.monster_data:
			result.damage = attacker.monster_data.attack
			# Check for elemental attacks
			if attacker.monster_data.has("element"):
				result.type = attacker.monster_data.element

	return result

## Calculate stat bonus based on damage type
func _calculate_stat_bonus(attacker: Entity, damage_type: Constants.DamageType) -> int:
	var stats = attacker.stats if attacker.has("stats") else {}

	match damage_type:
		Constants.DamageType.PHYSICAL:
			# STR bonus for physical
			var str_val: int = stats.get("STR", 10)
			return int((str_val - 10) * 0.5)
		Constants.DamageType.FIRE, Constants.DamageType.ICE, Constants.DamageType.LIGHTNING:
			# INT bonus for elemental magic
			var int_val: int = stats.get("INT", 10)
			return int((int_val - 10) * 0.5)
		Constants.DamageType.HOLY, Constants.DamageType.DARK:
			# WIS bonus for divine/dark magic
			var wis_val: int = stats.get("WIS", 10)
			return int((wis_val - 10) * 0.5)
		_:
			return 0

## Calculate critical hit chance
func _calculate_crit_chance(attacker: Entity) -> float:
	var base_crit := 0.05  # 5% base

	if attacker is Player:
		var weapon = attacker.get_equipped_weapon()
		if weapon and weapon.has("crit_bonus"):
			base_crit += weapon.crit_bonus

		# DEX bonus to crit
		var dex_val: int = attacker.stats.get("DEX", 10) if attacker.has("stats") else 10
		base_crit += (dex_val - 10) * 0.01  # +1% per DEX over 10

	return clampf(base_crit, 0.0, 0.75)

## Calculate armor damage reduction
func _calculate_armor_reduction(defender: Entity, damage_type: Constants.DamageType) -> float:
	var defense := defender.defense

	# Physical defense applies to physical damage
	if damage_type == Constants.DamageType.PHYSICAL:
		# Diminishing returns formula
		return defense / (defense + 100.0)

	# Elemental resistance
	if defender is Player:
		var resistances = defender.get_resistances()
		if resistances.has(damage_type):
			return clampf(resistances[damage_type], -0.5, 0.75)

	elif defender is Enemy:
		if defender.monster_data and defender.monster_data.has("resistances"):
			var res = defender.monster_data.resistances.get(damage_type, 0.0)
			return clampf(res, -0.5, 0.75)

	return 0.0

## Calculate element effectiveness modifier
func _calculate_element_modifier(attack_type: Constants.DamageType, defender: Entity) -> float:
	# Physical has no element modifier
	if attack_type == Constants.DamageType.PHYSICAL:
		return 1.0

	# Check defender's element (for enemies)
	var defender_element := Constants.DamageType.PHYSICAL
	if defender is Enemy and defender.monster_data:
		if defender.monster_data.has("element"):
			defender_element = defender.monster_data.element

	# Look up in effectiveness matrix
	if ELEMENT_MATRIX.has(attack_type):
		var row = ELEMENT_MATRIX[attack_type]
		if row.has(defender_element):
			return row[defender_element]

	return 1.0

## Apply room-specific modifiers
func _apply_room_modifiers(damage: int, room, attacker: Entity, _defender: Entity) -> int:
	if not room:
		return damage

	# Example: Fire damage bonus in volcanic rooms
	if room.has("type") and room.type == "volcanic":
		if attacker is Player:
			var weapon = attacker.get_equipped_weapon()
			if weapon and weapon.damage_type == Constants.DamageType.FIRE:
				damage = int(damage * 1.25)

	return damage
