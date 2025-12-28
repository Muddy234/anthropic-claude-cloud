extends Node

## Global constants and enumerations

# Tile size for grid-based movement
const TILE_SIZE := 32

# Map dimensions
const MAP_WIDTH := 80
const MAP_HEIGHT := 50

# Combat constants
const BASE_HIT_CHANCE := 0.85
const CRIT_MULTIPLIER := 1.5
const GRAZE_MULTIPLIER := 0.5
const MIN_DAMAGE := 1
const MAX_SIMULTANEOUS_ATTACKERS := 3

# Movement
const MOVE_SPEED := 8.0  # Tiles per second for smooth movement

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
	MAIN_HAND,
	OFF_HAND,
	HEAD,
	BODY,
	BOOTS,
	ACCESSORY_1,
	ACCESSORY_2
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
	DIALOG,
	BANK,
	SHOP,
	GAME_OVER,
	VICTORY
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
