@tool
class_name SkillData
extends Resource

## Resource defining a player skill/ability

@export var id: String
@export var name: String
@export_multiline var description: String
@export var icon: Texture2D

@export_group("Skill Tree")
@export var tree_id: String = ""  # Which skill tree this belongs to
@export var tier: int = 1  # Position in tree (1-5)
@export var prerequisites: Array[String] = []  # Required skill IDs
@export var points_required: int = 1

@export_group("Cost & Cooldown")
@export var mp_cost: int = 0
@export var hp_cost: int = 0
@export var stamina_cost: int = 0
@export var cooldown: int = 0  # In turns
@export var charges: int = 0  # 0 = unlimited uses per rest
@export var triggers_gcd: bool = true

@export_group("Targeting")
@export_enum("self", "single", "aoe", "line", "cone", "ground") var target_type: String = "single"
@export var range: int = 1
@export var aoe_radius: int = 0
@export var requires_los: bool = true  # Line of sight
@export var can_target_self: bool = false
@export var can_target_allies: bool = false
@export var can_target_enemies: bool = true

@export_group("Damage")
@export var damage_multiplier: float = 1.0  # Multiplied by weapon/attack damage
@export var base_damage: int = 0  # Flat damage added
@export var damage_type: Constants.DamageType = Constants.DamageType.PHYSICAL
@export var can_crit: bool = true
@export var crit_bonus: float = 0.0  # Extra crit chance
@export var hits: int = 1  # Number of hits

@export_group("Effects")
@export var effects: Array[Resource] = []  # EffectData to apply
@export var self_effects: Array[Resource] = []  # Effects applied to caster
@export var knockback: int = 0  # Tiles to push target

@export_group("Special")
@export var is_passive: bool = false
@export var passive_bonuses: Dictionary = {}  # {"crit_chance": 0.05, "damage": 10}
@export var on_hit_effects: Array[Resource] = []  # Applied on weapon hits while skill is known
@export var animation: String = ""  # Animation to play

## Get formatted description with values
func get_formatted_description() -> String:
	var text := description

	# Replace placeholders with actual values
	text = text.replace("{damage}", str(int(damage_multiplier * 100)) + "%")
	text = text.replace("{range}", str(range))
	text = text.replace("{aoe}", str(aoe_radius))
	text = text.replace("{cooldown}", str(cooldown))
	text = text.replace("{mp}", str(mp_cost))
	text = text.replace("{hp}", str(hp_cost))

	return text

## Get cost text for UI
func get_cost_text() -> String:
	var costs := []

	if mp_cost > 0:
		costs.append("%d MP" % mp_cost)
	if hp_cost > 0:
		costs.append("%d HP" % hp_cost)
	if stamina_cost > 0:
		costs.append("%d Stamina" % stamina_cost)

	if costs.is_empty():
		return "Free"

	return ", ".join(costs)

## Check if skill can be used
func can_use(caster) -> Dictionary:
	var result := {"can_use": true, "reason": ""}

	# Check MP
	if caster.has("mp") and caster.mp < mp_cost:
		result.can_use = false
		result.reason = "Not enough MP"
		return result

	# Check HP (don't allow suicide)
	if hp_cost > 0 and caster.current_hp <= hp_cost:
		result.can_use = false
		result.reason = "Not enough HP"
		return result

	# Check cooldown
	if caster.has("skill_cooldowns") and caster.skill_cooldowns.get(id, 0) > 0:
		result.can_use = false
		result.reason = "On cooldown (%d turns)" % caster.skill_cooldowns[id]
		return result

	# Check charges
	if charges > 0 and caster.has("skill_charges"):
		if caster.skill_charges.get(id, 0) <= 0:
			result.can_use = false
			result.reason = "No charges remaining"
			return result

	return result

## Get valid targets for this skill
func get_valid_targets(caster, all_entities: Array) -> Array:
	var valid := []

	for entity in all_entities:
		if _is_valid_target(caster, entity):
			valid.append(entity)

	return valid

func _is_valid_target(caster, target) -> bool:
	# Self targeting
	if target == caster:
		return can_target_self

	# Range check
	var dist: float = caster.grid_pos.distance_to(target.grid_pos)
	if dist > range:
		return false

	# LOS check
	if requires_los and not GameManager.dungeon.has_line_of_sight(caster.grid_pos, target.grid_pos):
		return false

	# Target type check
	var is_enemy := target.is_in_group("enemies")
	var is_ally := target.is_in_group("allies") or target.is_in_group("player")

	if is_enemy and not can_target_enemies:
		return false
	if is_ally and not can_target_allies:
		return false

	return true

## Apply passive bonuses to stats
func apply_passive(stats: Dictionary) -> Dictionary:
	if not is_passive:
		return stats

	for key in passive_bonuses:
		if stats.has(key):
			stats[key] += passive_bonuses[key]
		else:
			stats[key] = passive_bonuses[key]

	return stats
