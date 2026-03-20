class_name SkillSystem
extends BaseSystem
## 3 proficiencies with 20 specializations and piecewise XP curve.
## Session-scoped (resets on death). Highest levels tracked persistently.

# --- Proficiency types ---
enum Proficiency { MELEE = 0, RANGED = 1, MAGIC = 2 }

# --- Specialty definitions ---
const SPECIALTIES: Dictionary = {
	# Melee
	"swordsmanship":    {"proficiency": Proficiency.MELEE,  "bonus_per_level": 0.02, "description": "+2% sword damage"},
	"shield_mastery":   {"proficiency": Proficiency.MELEE,  "bonus_per_level": 0.01, "description": "+1% block chance"},
	"axe_proficiency":  {"proficiency": Proficiency.MELEE,  "bonus_per_level": 0.02, "description": "+2% axe damage"},
	"mace_mastery":     {"proficiency": Proficiency.MELEE,  "bonus_per_level": 0.015, "description": "+1.5% stun chance"},
	"polearm_skill":    {"proficiency": Proficiency.MELEE,  "bonus_per_level": 0.02, "description": "+2% polearm damage"},
	"dual_wielding":    {"proficiency": Proficiency.MELEE,  "bonus_per_level": 0.015, "description": "+1.5% offhand damage"},
	"heavy_armor":      {"proficiency": Proficiency.MELEE,  "bonus_per_level": 0.01, "description": "+1% armor effectiveness"},
	# Ranged
	"marksmanship":     {"proficiency": Proficiency.RANGED, "bonus_per_level": 0.02, "description": "+2% bow damage"},
	"quick_draw":       {"proficiency": Proficiency.RANGED, "bonus_per_level": 0.01, "description": "-1% draw time"},
	"crossbow_expert":  {"proficiency": Proficiency.RANGED, "bonus_per_level": 0.02, "description": "+2% crossbow damage"},
	"throwing_arms":    {"proficiency": Proficiency.RANGED, "bonus_per_level": 0.015, "description": "+1.5% throw damage"},
	"eagle_eye":        {"proficiency": Proficiency.RANGED, "bonus_per_level": 0.01, "description": "+1% crit chance"},
	"trap_setting":     {"proficiency": Proficiency.RANGED, "bonus_per_level": 0.02, "description": "+2% trap damage"},
	# Magic
	"pyromancy":        {"proficiency": Proficiency.MAGIC,  "bonus_per_level": 0.03, "description": "+3% fire damage"},
	"cryomancy":        {"proficiency": Proficiency.MAGIC,  "bonus_per_level": 0.03, "description": "+3% ice damage"},
	"electromancy":     {"proficiency": Proficiency.MAGIC,  "bonus_per_level": 0.03, "description": "+3% lightning damage"},
	"restoration":      {"proficiency": Proficiency.MAGIC,  "bonus_per_level": 0.02, "description": "+2% heal power"},
	"arcane_mastery":   {"proficiency": Proficiency.MAGIC,  "bonus_per_level": 0.02, "description": "+2% arcane damage"},
	"mana_efficiency":  {"proficiency": Proficiency.MAGIC,  "bonus_per_level": 0.01, "description": "-1% mana cost"},
	"summoning":        {"proficiency": Proficiency.MAGIC,  "bonus_per_level": 0.02, "description": "+2% summon strength"},
}

# --- Per-proficiency data ---
class ProficiencyData:
	var level: int = 1
	var xp: float = 0.0
	var specialties: Dictionary = {}  # specialty_id -> int (level)

# --- State ---
var proficiencies: Dictionary = {}  # Proficiency enum -> ProficiencyData
var skill_points: Dictionary = {}   # Proficiency enum -> int (unspent points)


func _init() -> void:
	system_name = "skill-system"
	priority = 60


func initialize() -> void:
	_reset_all()
	EventBus.player_killed_enemy.connect(_on_player_killed_enemy)
	EventBus.player_hit_enemy.connect(_on_player_hit_enemy)


func process_system(_delta: float) -> void:
	pass  # XP system is event-driven


func cleanup() -> void:
	# Save highest levels to persistent state before resetting
	_save_highest_levels()
	_reset_all()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func gain_xp(prof: int, amount: float) -> void:
	## Adds XP to a proficiency. Triggers level-ups as needed.
	if not proficiencies.has(prof):
		return
	var data: ProficiencyData = proficiencies[prof]
	data.xp += amount

	# Check for level-ups
	while data.xp >= xp_for_level(data.level):
		data.xp -= xp_for_level(data.level)
		data.level += 1
		skill_points[prof] = skill_points.get(prof, 0) + 1


func allocate_skill_point(prof: int, specialty_id: String) -> bool:
	## Spends a skill point to level up a specialty.
	if skill_points.get(prof, 0) <= 0:
		return false
	if not SPECIALTIES.has(specialty_id):
		return false
	if SPECIALTIES[specialty_id]["proficiency"] != prof:
		return false

	var data: ProficiencyData = proficiencies.get(prof)
	if data == null:
		return false

	var current_level: int = data.specialties.get(specialty_id, 0)
	data.specialties[specialty_id] = current_level + 1
	skill_points[prof] -= 1
	return true


func get_proficiency_level(prof: int) -> int:
	var data: ProficiencyData = proficiencies.get(prof)
	return data.level if data else 1


func get_proficiency_xp(prof: int) -> float:
	var data: ProficiencyData = proficiencies.get(prof)
	return data.xp if data else 0.0


func get_xp_progress(prof: int) -> float:
	## Returns 0.0-1.0 progress toward next level.
	var data: ProficiencyData = proficiencies.get(prof)
	if data == null:
		return 0.0
	var needed := xp_for_level(data.level)
	if needed <= 0.0:
		return 1.0
	return data.xp / needed


func get_specialty_level(specialty_id: String) -> int:
	var def: Dictionary = SPECIALTIES.get(specialty_id, {})
	var prof: int = def.get("proficiency", 0)
	var data: ProficiencyData = proficiencies.get(prof)
	if data == null:
		return 0
	return data.specialties.get(specialty_id, 0)


func get_damage_multiplier(prof: int, specialty_id: String) -> float:
	## Additive stacking, capped at 4.0x.
	var base := 1.0
	var spec_level := get_specialty_level(specialty_id)
	var bonus_per: float = SPECIALTIES.get(specialty_id, {}).get("bonus_per_level", 0.0)
	return minf(base + float(spec_level) * bonus_per, 4.0)


func get_unspent_points(prof: int) -> int:
	return skill_points.get(prof, 0)


func get_specialties_for_proficiency(prof: int) -> Array[String]:
	var result: Array[String] = []
	for spec_id in SPECIALTIES:
		if SPECIALTIES[spec_id]["proficiency"] == prof:
			result.append(spec_id)
	return result


# ---------------------------------------------------------------------------
# XP curve (piecewise)
# ---------------------------------------------------------------------------

static func xp_for_level(level: int) -> float:
	if level <= 5:
		return 50.0 * float(level)
	elif level <= 10:
		return 250.0 + 100.0 * float(level - 5)
	elif level <= 15:
		return 750.0 + 200.0 * float(level - 10)
	else:
		return 1750.0 + 350.0 * float(level - 15)


# ---------------------------------------------------------------------------
# Stat bonuses (aggregated across all specialties)
# ---------------------------------------------------------------------------

func get_total_stat_bonus(stat_name: String) -> float:
	## Returns summed bonus for a stat type across all specialties.
	## stat_name matches specialty description keywords.
	var total := 0.0
	for prof_key in proficiencies:
		var data: ProficiencyData = proficiencies[prof_key]
		for spec_id in data.specialties:
			var level: int = data.specialties[spec_id]
			var def: Dictionary = SPECIALTIES.get(spec_id, {})
			if def.get("description", "").contains(stat_name):
				total += float(level) * def.get("bonus_per_level", 0.0)
	return total


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _reset_all() -> void:
	proficiencies.clear()
	skill_points.clear()
	for prof in [Proficiency.MELEE, Proficiency.RANGED, Proficiency.MAGIC]:
		proficiencies[prof] = ProficiencyData.new()
		skill_points[prof] = 0


func _save_highest_levels() -> void:
	if not GameManager.persistent_state:
		return
	var skills_data: Dictionary = GameManager.persistent_state.skills
	for prof in proficiencies:
		var key := "highest_%d" % prof
		var current_level: int = proficiencies[prof].level
		var saved: int = skills_data.get(key, 0)
		if current_level > saved:
			skills_data[key] = current_level
	GameManager.persistent_state.skills = skills_data


func _on_player_killed_enemy(_player: Node, enemy: Node) -> void:
	## Award XP based on enemy tier.
	var xp_amount := 10.0
	if enemy.get("tier") != null:
		match enemy.tier:
			Constants.MonsterTier.TIER_3:  xp_amount = 5.0
			Constants.MonsterTier.TIER_2:  xp_amount = 10.0
			Constants.MonsterTier.TIER_1:  xp_amount = 20.0
			Constants.MonsterTier.ELITE:   xp_amount = 50.0
			Constants.MonsterTier.BOSS:    xp_amount = 100.0

	# Award to the proficiency matching the weapon used
	var weapon_prof := Proficiency.MELEE  # Default
	if _player and _player.get("current_weapon_type") != null:
		match _player.current_weapon_type:
			"bow", "crossbow":
				weapon_prof = Proficiency.RANGED
			"staff", "wand":
				weapon_prof = Proficiency.MAGIC
	gain_xp(weapon_prof, xp_amount)


func _on_player_hit_enemy(_player: Node, _enemy: Node, _damage: float, weapon_type: String) -> void:
	## Small XP gain per hit.
	var prof := Proficiency.MELEE
	match weapon_type:
		"bow", "crossbow":
			prof = Proficiency.RANGED
		"staff", "wand":
			prof = Proficiency.MAGIC
	gain_xp(prof, 1.0)
