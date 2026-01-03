extends Node

## Global constants and enumerations

# Tile size for grid-based movement (must match TileSet tile_size)
const TILE_SIZE := 16

# Map dimensions
const MAP_WIDTH := 80
const MAP_HEIGHT := 50

# Combat constants
const BASE_HIT_CHANCE := 0.85
const CRIT_MULTIPLIER := 1.5
const GRAZE_MULTIPLIER := 0.5
const MIN_DAMAGE := 1
const MAX_SIMULTANEOUS_ATTACKERS := 3

# Arena combat constants
const ARENA_SIZE := Vector2i(5, 5)
const ARENA_ENGAGE_RANGE := 4  # Max distance for enemy to initiate arena combat
const ARENA_JOIN_RANGE := 4  # Max distance for additional enemies to join combat
const MAX_ARENA_ENEMIES := 4  # Maximum enemies in a single arena fight
const TELEGRAPH_DURATION := 0.0  # Seconds to show enemy intent (instant)
const RESOLUTION_MOVE_TIME := 0.0  # Seconds per movement step (instant)
const RESOLUTION_ATTACK_TIME := 0.0  # Seconds per attack animation (instant)

# Arena tile generation
const ARENA_MIN_HAZARDS := 0
const ARENA_MAX_HAZARDS := 2
const ARENA_MIN_OBSTACLES := 0
const ARENA_MAX_OBSTACLES := 2

# Stamina (Movement Resource)
const STAMINA_MAX := 6              # Maximum stamina (battery cells)
const STAMINA_REGEN := 1            # Stamina regenerated per turn start
const MOVE_COST_TIER_1 := 1         # Cost for 1st tile moved
const MOVE_COST_TIER_2 := 2         # Cost for 2nd tile moved
const MOVE_COST_TIER_3 := 3         # Cost for 3rd tile moved
const MOVE_COSTS := [1, 3, 6]       # Cumulative costs: 1 tile = 1, 2 tiles = 3, 3 tiles = 6
const DESPERATE_DASH_PENALTY := 10.0  # Strain added per 1 stamina deficit

# Strain (Combat Resource)
const STRAIN_MAX := 100.0           # Overload threshold
const STRAIN_RECOVERY := 25.0       # Strain recovered per turn start (positive value, subtracted)
const LIGHT_ATTACK_STRAIN := 15.0   # Strain cost for light attack
const HEAVY_ATTACK_STRAIN := 40.0   # Strain cost for heavy attack
const ITEM_STRAIN := 10.0           # Strain cost for item use

# Attack damage values
const LIGHT_ATTACK_DAMAGE := 2
const HEAVY_ATTACK_DAMAGE := 6

# Action priorities (lower = faster)
const PRIORITY_MOVEMENT := 0  # Movement resolves first (escape before damage)
const PRIORITY_FAST := 1      # Light attack
const PRIORITY_MEDIUM := 2    # Item use
const PRIORITY_SLOW := 3      # Heavy attack

# Arena combat phases
enum CombatPhase {
	ENTERING,     # Zoom-in animation
	TELEGRAPH,    # Enemy shows intent
	PLANNING,     # Player queues actions
	RESOLUTION,   # Actions execute by priority
	CLEANUP,      # Upkeep: stamina regen, strain recovery, check deaths
	VICTORY,      # Player won
	DEFEAT,       # Player lost
	EXITING       # Zoom-out animation
}

# Arena action types
enum CombatActionType {
	MOVE,
	LIGHT_ATTACK,
	HEAVY_ATTACK,
	ITEM
}

# Heavy attack patterns (for enemies)
enum HeavyAttackPattern {
	ADJACENT,      # Single tile directly adjacent to enemy (default)
	ROW_SWEEP,     # All tiles in the same row as the enemy
	COLUMN_SWEEP,  # All tiles in the same column as the enemy
	NOVA           # All 8 tiles surrounding the enemy
}

# Arena tile types (special tiles on the combat grid)
enum ArenaTileType {
	EMPTY,     # Normal walkable tile
	HAZARD,    # Instant kill on contact - blocks voluntary movement, push allowed
	OBSTACLE   # Blocks movement AND attacks - provides cover
}

# Movement
const MOVE_SPEED := 4.0  # Tiles per second for smooth movement (visual interpolation)

# Vision
const DEFAULT_VISION_RANGE := 8
const TORCH_VISION_BONUS := 2

# AI States
enum AIState {
	IDLE,
	WANDERING,
	REACTING,
	SHOUTING,
	CHASING,
	COMBAT,
	CIRCLING,
	SKIRMISHING,
	DEFENSIVE,
	PANICKED,
	SEARCHING,
	RETURNING,
	SACRIFICING,
	ENRAGED,
	COMMANDED,
	FOLLOWING,
	PACK_RALLYING,
	TACTICAL_POSITIONING,
	SWARM_ATTACKING
}

# Monster tiers
enum MonsterTier {
	TIER_3,  # Weakest - fodder
	TIER_2,  # Common enemies
	TIER_1,  # Veterans
	ELITE,   # Mini-bosses
	BOSS     # Floor bosses
}

# Arena combat enemy behaviors
# These define the AI's primary goal during tactical combat
enum EnemyBehavior {
	AGGRESSIVE,  # Goal: Kill the player - prioritizes damage and lethal hits
	STRATEGIC,   # Goal: Exhaust player resources - forces costly movement/strain buildup
	TACTICAL     # Goal: Corner the player - minimizes escape options
}

# Damage types
enum DamageType {
	PHYSICAL,
	FIRE,
	ICE,
	LIGHTNING,
	POISON,
	HOLY,
	DARK,
	ARCANE
}

# Item types
enum ItemType {
	WEAPON,
	ARMOR,
	HELMET,
	BOOTS,
	ACCESSORY,
	CONSUMABLE,
	MATERIAL,
	QUEST,
	CURRENCY
}

# Equipment slots
enum EquipSlot {
	NONE,
	WEAPON,
	HANDS,
	FEET,
	ACCESSORY,
	MAIN_HAND,
	OFF_HAND,
	HEAD,
	BODY,
	BOOTS,
	ACCESSORY_1,
	ACCESSORY_2
}

# Item rarity types
enum ItemRarity {
	COMMON,
	UNCOMMON,
	RARE,
	EPIC,
	LEGENDARY
}

# Weapon damage types
enum WeaponDamageType {
	BLADE,   # Can cause bleeding
	BLUNT,   # Can cause stun
	PIERCE   # Crit bonus
}

# Rarity levels
enum Rarity {
	COMMON = 1,
	UNCOMMON = 2,
	RARE = 3,
	EPIC = 4,
	LEGENDARY = 5
}

# Game states
enum GameState {
	MAIN_MENU,
	VILLAGE,
	LOADOUT,
	PLAYING,
	PAUSED,
	INVENTORY,
	CHARACTER_SHEET,
	DIALOG,
	BANK,
	SHOP,
	GAME_OVER,
	VICTORY,
	COMBAT  # Arena combat state
}

# Tile types for dungeon
enum TileType {
	WALL,
	FLOOR,
	DOOR,
	DOOR_LOCKED,
	STAIRS_DOWN,
	STAIRS_UP,
	WATER,
	LAVA,
	PIT
}

# Direction vectors
const DIRECTIONS := {
	"up": Vector2i(0, -1),
	"down": Vector2i(0, 1),
	"left": Vector2i(-1, 0),
	"right": Vector2i(1, 0),
	"up_left": Vector2i(-1, -1),
	"up_right": Vector2i(1, -1),
	"down_left": Vector2i(-1, 1),
	"down_right": Vector2i(1, 1)
}

# All 8 directions for pathfinding
const ALL_DIRECTIONS := [
	Vector2i(0, -1),   # Up
	Vector2i(1, -1),   # Up-Right
	Vector2i(1, 0),    # Right
	Vector2i(1, 1),    # Down-Right
	Vector2i(0, 1),    # Down
	Vector2i(-1, 1),   # Down-Left
	Vector2i(-1, 0),   # Left
	Vector2i(-1, -1)   # Up-Left
]

# 4 cardinal directions
const CARDINAL_DIRECTIONS := [
	Vector2i(0, -1),   # Up
	Vector2i(1, 0),    # Right
	Vector2i(0, 1),    # Down
	Vector2i(-1, 0)    # Left
]

# Color palette for UI
const COLORS := {
	"damage": Color(1.0, 0.3, 0.3),
	"heal": Color(0.3, 1.0, 0.3),
	"crit": Color(1.0, 1.0, 0.0),
	"miss": Color(0.5, 0.5, 0.5),
	"xp": Color(0.3, 0.7, 1.0),
	"gold": Color(1.0, 0.8, 0.0),
	"poison": Color(0.5, 1.0, 0.3),
	"fire": Color(1.0, 0.5, 0.2),
	"ice": Color(0.3, 0.8, 1.0),
	"lightning": Color(1.0, 1.0, 0.3),
	"common": Color(0.8, 0.8, 0.8),
	"uncommon": Color(0.3, 1.0, 0.3),
	"rare": Color(0.3, 0.5, 1.0),
	"epic": Color(0.7, 0.3, 1.0),
	"legendary": Color(1.0, 0.6, 0.0)
}

## Get color for rarity
static func get_rarity_color(rarity: int) -> Color:
	match rarity:
		Rarity.COMMON: return COLORS.common
		Rarity.UNCOMMON: return COLORS.uncommon
		Rarity.RARE: return COLORS.rare
		Rarity.EPIC: return COLORS.epic
		Rarity.LEGENDARY: return COLORS.legendary
		_: return COLORS.common

## Get color for damage type
static func get_damage_type_color(type: DamageType) -> Color:
	match type:
		DamageType.FIRE: return COLORS.fire
		DamageType.ICE: return COLORS.ice
		DamageType.LIGHTNING: return COLORS.lightning
		DamageType.POISON: return COLORS.poison
		DamageType.HOLY: return Color(1.0, 1.0, 0.8)
		DamageType.DARK: return Color(0.4, 0.2, 0.6)
		DamageType.ARCANE: return Color(0.8, 0.4, 1.0)
		_: return Color.WHITE
