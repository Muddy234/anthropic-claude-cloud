class_name ConstantsDef
extends Node

# --- Game States ---
enum GameState {
	MENU,
	PLAYING,
	DEAD,
	VILLAGE,
	PAUSED,
	COMBAT,
	DIALOGUE,
	SHOP,
	INVENTORY,
	CHARACTER_SHEET,
	CRAFTING,
	GAME_OVER,
	VICTORY
}

# --- Elements ---
enum Element {
	NONE = 0, FIRE = 1, ICE = 2, WATER = 3, EARTH = 4,
	NATURE = 5, DEATH = 6, ARCANE = 7, DARK = 8, HOLY = 9, PHYSICAL = 10
}

enum Rarity { COMMON = 0, UNCOMMON = 1, RARE = 2, EPIC = 3, LEGENDARY = 4 }

enum DamageType { BLADE = 0, BLUNT = 1, PIERCE = 2, MAGIC = 3 }

enum ArmorType {
	UNARMORED = 0, CLOTH = 1, HIDE = 2, SCALED = 3,
	ARMORED = 4, STONE = 5, BONE = 6, ETHEREAL = 7
}

enum WeaponType { SWORD = 0, MACE = 1, POLEARM = 2, BOW = 3, DAGGER = 4, STAFF = 5 }

enum EquipSlot { MAIN = 0, OFF = 1, HEAD = 2, CHEST = 3, LEGS = 4, FEET = 5 }

enum AttackCategory { MELEE = 0, RANGED = 1, MAGIC = 2, AREA = 3, SUMMON = 4, BUFF = 5, DEBUFF = 6, MOVEMENT = 7, UTILITY = 8 }

enum AoeShape { NONE = 0, ARC = 1, CIRCLE = 2, LINE = 3, CONE = 4, CROSS = 5, RING = 6 }

enum MonsterTier { TIER_3 = 0, TIER_2 = 1, TIER_1 = 2, ELITE = 3, BOSS = 4 }

enum AttackType { PHYSICAL = 0, MAGIC = 1 }

enum ItemType { CONSUMABLE = 0, MATERIAL = 1, QUEST_ITEM = 2, WEAPON = 3, ARMOR = 4, SHIELD = 5 }

enum ConsumableSubtype { HEALING = 0, MANA = 1, BUFF = 2, UTILITY = 3, FOOD = 4, ANTIDOTE = 5 }

enum EffectType { HEAL = 0, HEAL_PERCENT = 1, RESTORE_MANA = 2, BUFF = 3, STEALTH = 4, CURE_POISON = 5, SHIELD = 6 }

enum QuestType { MAIN = 0, SIDE = 1, BOUNTY = 2, HIDDEN = 3 }

enum QuestObjectiveType { REACH_FLOOR = 0, COLLECT = 1, DEFEAT_GUARDIAN = 2, KILL = 3, TALK_TO = 4, SURVIVE = 5, CRAFT = 6 }

enum BountyType { KILL = 0, COLLECT = 1, REACH = 2, SURVIVE = 3, ELITE = 4 }

enum NpcRole { QUEST_GIVER = 0, SHOPKEEPER = 1, BANKER = 2, BLACKSMITH = 3, ALCHEMIST = 4, INNKEEPER = 5, ELDER = 6, TRAINER = 7, BOUNTY_BOARD = 8, EXPEDITION_MASTER = 9, PRIESTESS = 10 }

enum CraftCategory { WEAPONS = 0, ARMOR = 1, CONSUMABLES = 2, UPGRADES = 3, SPECIAL = 4 }

enum WanderPattern { RANDOM = 0, PATROL = 1, STATIONARY = 2, PACING = 3 }

enum FollowFormation { CLUSTER = 0, LINE = 1, SPREAD = 2, NONE = 3 }

enum TileType { FLOOR, WALL, DOOR, STAIRS_DOWN, LAVA, WATER, ICE, GRASS, PATH, COBBLESTONE, STONE_BORDER, FENCE, CAVE_WALL, CAVE_FLOOR, CAVE_ENTRANCE, VOID, VOID_CRACK, PILLAR, SHRINE, EXIT }

# --- Grid ---
const GRID_WIDTH: int = 200
const GRID_HEIGHT: int = 200
const BASE_TILE_SIZE: int = 16
const VIEWPORT_TILES_X: int = 20
const VIEWPORT_TILES_Y: int = 15

# --- Player Config ---
const PLAYER_CONFIG: Dictionary = {
	"base_hp": 100,
	"base_mana": 50,
	"base_stats": {"str": 10, "dex": 10, "int": 10, "vit": 10},
	"base_speed": 4.0,
	"base_crit_chance": 0.05,
	"base_crit_multiplier": 1.5,
	"xp_to_level_base": 100,
	"xp_scaling": 1.5,
}

# --- Movement Config ---
const MOVEMENT_CONFIG: Dictionary = {
	"base_speed": 4.0,
	"friction": 0.85,
	"diagonal_factor": 0.707,
}

# --- Attack Speeds (seconds) ---
const ATTACK_SPEEDS: Dictionary = {
	"dagger": 0.25,
	"sword": 0.375,
	"mace": 0.5,
	"polearm": 0.45,
	"bow": 0.6,
	"staff": 0.55,
}

# --- AI Config ---
const AI_CONFIG: Dictionary = {
	"sight_range": 6,
	"hearing_range": 4,
	"chase_timeout": 5.0,
	"patrol_pause": 2.0,
}

# --- Inventory Config ---
const INVENTORY_CONFIG: Dictionary = {
	"max_slots": 15,
	"stackable_types": ["consumable", "material"],
}

# --- Vision Config ---
const VISION_CONFIG: Dictionary = {
	"base_range": 8,
	"torch_bonus": 3,
	"darkness_penalty": 4,
}

# --- Ability Tier Scaling ---
const ABILITY_TIER_SCALING: Dictionary = {
	MonsterTier.TIER_3: {"damage_multiplier": 0.4, "range_multiplier": 0.7},
	MonsterTier.TIER_2: {"damage_multiplier": 0.6, "range_multiplier": 0.85},
	MonsterTier.TIER_1: {"damage_multiplier": 0.8, "range_multiplier": 1.0},
	MonsterTier.ELITE: {"damage_multiplier": 1.0, "range_multiplier": 1.0},
	MonsterTier.BOSS: {"damage_multiplier": 1.2, "range_multiplier": 1.2},
}
