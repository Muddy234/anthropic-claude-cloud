class_name EnemyFactory
extends RefCounted
## Entity creation factory for enemies.
## Creates enemy data dictionaries (or nodes) from monster templates,
## applying floor-based scaling, behavior inference, and unique IDs.

# --- Configuration ---
const BASE_MANA: int = 50
const MANA_PER_INT_MAGIC: int = 3
const MANA_PER_INT_PHYS: int = 1
const FLOOR_SCALE_BASE: float = 1.0
const FLOOR_SCALE_PER_LEVEL: float = 0.15

## Counter for unique IDs
var _next_id: int = 0


# =========================================================================
#  Main Factory Method
# =========================================================================

func create_enemy(options: Dictionary) -> Dictionary:
	## Creates an enemy data dictionary from the given options.
	##
	## Expected options keys:
	##   monster_id: String - Identifier for the monster template
	##   position: Vector2i - Grid position to spawn at
	##   tier: int (Constants.MonsterTier) - Monster tier
	##   element: int (Constants.Element) - Monster element
	##   level: int - Floor / level number
	##   scale_factor: float - Pre-calculated scale factor
	##   behavior: String - AI behavior type (wander, patrol, ambush, guard)
	##   patrol_points: Array[Vector2i] - Patrol waypoints
	##   template: Dictionary - Optional monster template data override

	var monster_id: String = options.get("monster_id", "unknown")
	var position: Vector2i = options.get("position", Vector2i.ZERO)
	var tier: int = options.get("tier", Constants.MonsterTier.TIER_3)
	var element: int = options.get("element", Constants.Element.PHYSICAL)
	var level: int = options.get("level", 1)
	var scale_factor: float = options.get("scale_factor", 1.0)
	var behavior: String = options.get("behavior", "wander")
	var patrol_points: Array = options.get("patrol_points", [])
	var template: Dictionary = options.get("template", {})

	# Generate unique ID
	var unique_id: String = _generate_unique_id(monster_id)

	# Build base stats from template or defaults
	var base_stats: Dictionary = _build_base_stats(template, tier)

	# Apply floor scaling
	var scaled_stats: Dictionary = apply_floor_scaling(base_stats, level)

	# Calculate derived stats
	var is_magic_user: bool = template.get("attack_type", "physical") == "magic"
	var int_stat: int = scaled_stats.get("int", 10)
	var max_mana: int = BASE_MANA + int_stat * (MANA_PER_INT_MAGIC if is_magic_user else MANA_PER_INT_PHYS)

	# Infer behavior from template if not explicitly set
	if behavior == "wander" and not template.is_empty():
		behavior = _infer_behavior(template)

	# Determine wander pattern
	var wander_pattern: int = _get_wander_pattern(behavior)

	# Build the enemy data dictionary
	var enemy_data: Dictionary = {
		"unique_id": unique_id,
		"monster_id": monster_id,
		"position": position,
		"grid_position": position,
		"tier": tier,
		"element": element,
		"level": level,
		"scale_factor": scale_factor,

		# Stats
		"max_hp": scaled_stats.get("hp", 50),
		"current_hp": scaled_stats.get("hp", 50),
		"max_mana": max_mana,
		"current_mana": max_mana,
		"str": scaled_stats.get("str", 10),
		"dex": scaled_stats.get("dex", 10),
		"int": scaled_stats.get("int", 10),
		"vit": scaled_stats.get("vit", 10),
		"defense": scaled_stats.get("defense", 5),
		"speed": scaled_stats.get("speed", 3.0),

		# Combat
		"attack_type": template.get("attack_type", "physical"),
		"damage_type": template.get("damage_type", Constants.DamageType.BLADE),
		"armor_type": template.get("armor_type", Constants.ArmorType.UNARMORED),
		"aggression": template.get("aggression", 0.5),
		"sight_range": template.get("sight_range", Constants.AI_CONFIG["sight_range"]),

		# Behavior
		"behavior": behavior,
		"wander_pattern": wander_pattern,
		"patrol_points": patrol_points,
		"move_interval": template.get("move_interval", 1.0),

		# Abilities
		"abilities": template.get("abilities", []),

		# Loot
		"loot_table": template.get("loot_table", []),
		"xp_reward": _calculate_xp_reward(tier, level),
		"gold_reward": _calculate_gold_reward(tier, level),

		# State
		"is_alive": true,
		"is_active": false,
		"alert_level": 0,  # 0=idle, 1=suspicious, 2=alert, 3=combat
		"target": null,
	}

	return enemy_data


# =========================================================================
#  Floor Scaling
# =========================================================================

func apply_floor_scaling(template_stats: Dictionary, floor_number: int) -> Dictionary:
	## Applies floor-based stat scaling to a template's base stats.
	## scale = 1.0 + (floor - 1) * 0.15
	var scale: float = FLOOR_SCALE_BASE + (floor_number - 1) * FLOOR_SCALE_PER_LEVEL
	var scaled: Dictionary = template_stats.duplicate()

	# Scale numeric stats
	for key in ["hp", "str", "dex", "int", "vit", "defense"]:
		if scaled.has(key):
			scaled[key] = int(float(scaled[key]) * scale)

	# Speed scales more gently
	if scaled.has("speed"):
		scaled["speed"] = scaled["speed"] * (1.0 + (floor_number - 1) * 0.05)

	return scaled


# =========================================================================
#  Base Stat Generation
# =========================================================================

func _build_base_stats(template: Dictionary, tier: int) -> Dictionary:
	## Builds base stats from template, falling back to tier-based defaults.
	if not template.is_empty() and template.has("hp"):
		return {
			"hp": template.get("hp", 50),
			"str": template.get("str", 10),
			"dex": template.get("dex", 10),
			"int": template.get("int", 10),
			"vit": template.get("vit", 10),
			"defense": template.get("defense", 5),
			"speed": template.get("speed", 3.0),
		}

	# Default stats by tier
	match tier:
		Constants.MonsterTier.TIER_3:
			return {"hp": 30, "str": 8, "dex": 8, "int": 6, "vit": 8, "defense": 3, "speed": 2.5}
		Constants.MonsterTier.TIER_2:
			return {"hp": 60, "str": 12, "dex": 10, "int": 9, "vit": 12, "defense": 6, "speed": 3.0}
		Constants.MonsterTier.TIER_1:
			return {"hp": 100, "str": 16, "dex": 14, "int": 12, "vit": 16, "defense": 10, "speed": 3.5}
		Constants.MonsterTier.ELITE:
			return {"hp": 200, "str": 22, "dex": 18, "int": 18, "vit": 22, "defense": 16, "speed": 4.0}
		Constants.MonsterTier.BOSS:
			return {"hp": 500, "str": 30, "dex": 22, "int": 25, "vit": 30, "defense": 25, "speed": 3.5}
		_:
			return {"hp": 30, "str": 8, "dex": 8, "int": 6, "vit": 8, "defense": 3, "speed": 2.5}


# =========================================================================
#  Behavior Inference
# =========================================================================

func _infer_behavior(template: Dictionary) -> String:
	## Infers AI behavior from aggression and move_interval values.
	var aggression: float = template.get("aggression", 0.5)
	var move_interval: float = template.get("move_interval", 1.0)

	if aggression >= 0.8:
		return "ambush"  # Highly aggressive, waits to strike
	elif aggression >= 0.6 and move_interval <= 0.8:
		return "patrol"  # Moderately aggressive, fast mover = patroller
	elif aggression <= 0.2:
		return "guard"   # Passive, stays in place until provoked
	else:
		return "wander"


func _get_wander_pattern(behavior: String) -> int:
	match behavior:
		"patrol": return Constants.WanderPattern.PATROL
		"guard": return Constants.WanderPattern.STATIONARY
		"ambush": return Constants.WanderPattern.STATIONARY
		_: return Constants.WanderPattern.RANDOM


# =========================================================================
#  Rewards Calculation
# =========================================================================

func _calculate_xp_reward(tier: int, level: int) -> int:
	var base_xp: int
	match tier:
		Constants.MonsterTier.TIER_3: base_xp = 10
		Constants.MonsterTier.TIER_2: base_xp = 25
		Constants.MonsterTier.TIER_1: base_xp = 50
		Constants.MonsterTier.ELITE: base_xp = 120
		Constants.MonsterTier.BOSS: base_xp = 500
		_: base_xp = 10
	return int(base_xp * (1.0 + (level - 1) * 0.1))


func _calculate_gold_reward(tier: int, level: int) -> int:
	var base_gold: int
	match tier:
		Constants.MonsterTier.TIER_3: base_gold = 3
		Constants.MonsterTier.TIER_2: base_gold = 8
		Constants.MonsterTier.TIER_1: base_gold = 18
		Constants.MonsterTier.ELITE: base_gold = 40
		Constants.MonsterTier.BOSS: base_gold = 150
		_: base_gold = 3
	return int(base_gold * (1.0 + (level - 1) * 0.08))


# =========================================================================
#  Unique ID Generation
# =========================================================================

func _generate_unique_id(monster_id: String) -> String:
	_next_id += 1
	return "%s_%d_%d" % [monster_id, _next_id, Time.get_ticks_msec()]
