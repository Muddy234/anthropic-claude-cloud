@tool
class_name MonsterData
extends Resource

## Resource defining a monster type

@export var id: String
@export var name: String
@export_multiline var description: String
@export var sprite: Texture2D

@export_group("Classification")
@export var tier: Constants.MonsterTier = Constants.MonsterTier.TIER_3
@export var family: String = ""  # "undead", "beast", "demon", etc.
@export var is_boss: bool = false
@export var is_unique: bool = false

@export_group("Base Stats")
@export var hp: int = 10
@export var attack: int = 5
@export var defense: int = 2
@export var speed: int = 100  # 100 = normal speed
@export var vision_range: int = 6
@export var attack_range: int = 1

@export_group("Arena Behavior")
@export var behavior: Constants.EnemyBehavior = Constants.EnemyBehavior.AGGRESSIVE

@export_group("Exploration Behavior")
@export var flee_threshold: float = 0.25  # HP% to start fleeing
@export var flees_behavior: bool = true
@export var aggression: float = 0.5  # 0-1, affects combat decisions
@export var preferred_range: int = 1
@export var kites_behavior: bool = false
@export var territory_size: int = 20

@export_group("Senses")
@export var reaction_delay: float = 0.0  # Seconds before reacting to player
@export var memory_duration: float = 5.0  # How long they remember player position
@export var hearing_range: int = 10
@export var search_behavior: String = "none"  # "none", "expand", "systematic"

@export_group("Social")
@export var can_command: bool = false  # Can lead other monsters
@export var can_be_commanded: bool = false  # Can be commanded by leaders
@export var is_sacrificial: bool = false  # Can be sacrificed by elites
@export var can_sacrifice_minions: bool = false
@export var sacrifice_threshold: float = 0.3
@export var pack_courage: bool = false  # Braver in groups
@export var pack_courage_threshold: int = 4

@export_group("Combat")
@export var windup_duration: float = 0.3  # Attack telegraph time
@export var element: Constants.DamageType = Constants.DamageType.PHYSICAL
@export var resistances: Dictionary = {}  # {DamageType: float}
@export var weaknesses: Dictionary = {}  # {DamageType: float}
@export var abilities: Array[Resource] = []  # MonsterAbilityData

@export_group("Loot")
@export var loot_table: Resource  # LootTableData
@export var xp_value: int = 10
@export var gold_min: int = 0
@export var gold_max: int = 5

@export_group("Spawning")
@export var min_floor: int = 1
@export var max_floor: int = 100
@export var spawn_weight: float = 1.0  # Higher = more common
@export var spawn_group_min: int = 1
@export var spawn_group_max: int = 1

## Get XP value adjusted for tier
func get_xp_value() -> int:
	if xp_value > 0:
		return xp_value

	# Default XP by tier
	match tier:
		Constants.MonsterTier.TIER_3: return 15
		Constants.MonsterTier.TIER_2: return 30
		Constants.MonsterTier.TIER_1: return 55
		Constants.MonsterTier.ELITE: return 100
		Constants.MonsterTier.BOSS: return 500
		_: return 10

## Get resistance to a damage type
func get_resistance(damage_type: Constants.DamageType) -> float:
	if resistances.has(damage_type):
		return resistances[damage_type]
	return 0.0

## Get weakness to a damage type
func get_weakness(damage_type: Constants.DamageType) -> float:
	if weaknesses.has(damage_type):
		return weaknesses[damage_type]
	return 0.0

## Check if monster should spawn on a floor
func can_spawn_on_floor(floor_num: int) -> bool:
	return floor_num >= min_floor and floor_num <= max_floor

## Get threat level for UI display
func get_threat_level() -> String:
	match tier:
		Constants.MonsterTier.TIER_3: return "Weak"
		Constants.MonsterTier.TIER_2: return "Normal"
		Constants.MonsterTier.TIER_1: return "Veteran"
		Constants.MonsterTier.ELITE: return "Elite"
		Constants.MonsterTier.BOSS: return "Boss"
		_: return "Unknown"

## Get tier color for UI
func get_tier_color() -> Color:
	match tier:
		Constants.MonsterTier.TIER_3: return Color(0.6, 0.6, 0.6)
		Constants.MonsterTier.TIER_2: return Color(1.0, 1.0, 1.0)
		Constants.MonsterTier.TIER_1: return Color(0.3, 0.7, 1.0)
		Constants.MonsterTier.ELITE: return Color(1.0, 0.5, 0.0)
		Constants.MonsterTier.BOSS: return Color(1.0, 0.2, 0.2)
		_: return Color.WHITE
