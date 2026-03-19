# Work Package 02: Data Layer

## Objective
Convert ~13,062 lines of static JS data definitions across 30 files in `js/data/` into Godot 4.x `Resource` subclass definitions (`.gd`) and instance files (`.tres`). Every piece of game data -- monsters, items, weapons, armor, abilities, NPCs, quests, crafting recipes, bounties, elements, tilesets, lore, audio metadata -- must be accessible as typed, inspector-editable Godot Resources.

## Dependencies
- **WP01 `autoload/constants.gd`** must exist with all enums defined (see Section 2 below for the full enum list this package requires). If WP01 is not yet complete, create a stub `constants.gd` with just the enums listed here.

## Output Directory Structure
```
resources/
  data_classes/          # Resource class definitions (.gd files)
    monster_data.gd
    monster_tier_data.gd
    loot_entry_data.gd
    item_data.gd
    weapon_data.gd
    armor_piece_data.gd
    armor_type_data.gd
    shield_data.gd
    ability_data.gd
    aoe_shape_data.gd
    element_data.gd
    npc_data.gd
    npc_narrative_data.gd
    quest_data.gd
    quest_objective_data.gd
    quest_reward_data.gd
    bounty_data.gd
    bounty_objective_data.gd
    crafting_recipe_data.gd
    crafting_material_entry.gd
    material_data.gd
    room_theme_data.gd
    tile_def_data.gd
    village_tile_data.gd
    lore_fragment_data.gd
    audio_def_data.gd
    music_track_data.gd
    equipment_visual_data.gd
    core_config_data.gd
    core_boss_data.gd
    boss_phase_data.gd
    elder_dialogue_data.gd
  monsters/              # .tres instances (one per monster)
  items/
    consumables/
    quest_items/
  weapons/
    melee/
    ranged/
    magic/
  armor/
    pieces/              # 80 generated + 4 legendary
    shields/
  armor_types/           # 8 armor type definitions
  abilities/
    attacks/
    behaviors/
    boss_abilities/
  elements/              # 10 element .tres + matrices as autoload
  npcs/
  quests/
  bounties/
  crafting/
    recipes/
    categories/
  materials/
  tilesets/
  village_tiles/
  room_themes/
  lore/
  audio/
    sfx/
    music/
  equipment_visuals/
  core/                  # Core boss arena config
```

---

## Section 1: JS-to-GDScript Type Mapping Reference

Every field in every JS data object maps to a GDScript type. Use this table for all conversions.

| JS Type / Pattern | GDScript Type | Notes |
|-------------------|---------------|-------|
| `string` (id, name, description) | `String` | Direct |
| `number` (int-like: hp, str, xp) | `int` | Use `int` when values are always whole numbers |
| `number` (float-like: speed, dropChance) | `float` | Use `float` for multipliers, chances, speeds |
| `boolean` | `bool` | Direct |
| `null` | `Variant` or nullable type | Use `-1` for null ints, `""` for null strings, `null` for Resources |
| `string` enum value (e.g. `'fire'`, `'rare'`) | `Constants.EnumName` (int enum) | Map to enum, store as int |
| `Array` of primitives | `Array[type]` or `PackedStringArray` | Typed arrays preferred |
| `Array` of objects | `Array[ResourceSubclass]` | Each object becomes a sub-Resource |
| `Object` (nested dict) | Inner `Resource` subclass | e.g., loot entry, AoE shape, quest objective |
| `Object` (flat key:value) | `Dictionary` | Only for truly dynamic/untyped data |
| JS `undefined` / missing key | Default value in `@export` | Always provide defaults |

---

## Section 2: Enum Definitions Required

These enums must exist in `autoload/constants.gd` (WP01) before .tres files can reference them. If WP01 is incomplete, create them as a block at the top of `constants.gd`.

```gdscript
# --- autoload/constants.gd (enums required by WP02) ---

## Element types used by monsters, weapons, spells
enum Element {
    NONE = 0,
    FIRE = 1,
    ICE = 2,
    WATER = 3,
    EARTH = 4,
    NATURE = 5,
    DEATH = 6,
    ARCANE = 7,
    DARK = 8,
    HOLY = 9,
    PHYSICAL = 10
}

## Item rarity levels
enum Rarity {
    COMMON = 0,
    UNCOMMON = 1,
    RARE = 2,
    EPIC = 3,
    LEGENDARY = 4
}

## Physical damage types for weapon-armor matrix
enum DamageType {
    BLADE = 0,
    BLUNT = 1,
    PIERCE = 2,
    MAGIC = 3
}

## Armor categories (all 8, including monster-only)
enum ArmorType {
    UNARMORED = 0,
    CLOTH = 1,
    HIDE = 2,
    SCALED = 3,
    ARMORED = 4,
    STONE = 5,
    BONE = 6,
    ETHEREAL = 7
}

## Weapon subtypes
enum WeaponType {
    SWORD = 0,
    MACE = 1,
    POLEARM = 2,
    BOW = 3,
    DAGGER = 4,
    STAFF = 5
}

## Equipment slots
enum EquipSlot {
    MAIN = 0,
    OFF = 1,
    HEAD = 2,
    CHEST = 3,
    LEGS = 4,
    FEET = 5
}

## Attack categories for abilities
enum AttackCategory {
    MELEE = 0,
    RANGED = 1,
    MAGIC = 2,
    AREA = 3,
    SUMMON = 4,
    BUFF = 5,
    DEBUFF = 6,
    MOVEMENT = 7,
    UTILITY = 8
}

## AoE shape types
enum AoeShape {
    NONE = 0,
    ARC = 1,
    CIRCLE = 2,
    LINE = 3,
    CONE = 4,
    CROSS = 5,
    RING = 6
}

## Monster tier levels
enum MonsterTier {
    TIER_3 = 0,   # Fodder
    TIER_2 = 1,   # Standard
    TIER_1 = 2,   # Veteran
    ELITE = 3,
    BOSS = 4
}

## Attack type (physical vs magic)
enum AttackType {
    PHYSICAL = 0,
    MAGIC = 1
}

## Item type categories
enum ItemType {
    CONSUMABLE = 0,
    MATERIAL = 1,
    QUEST_ITEM = 2,
    WEAPON = 3,
    ARMOR = 4,
    SHIELD = 5
}

## Consumable subtypes
enum ConsumableSubtype {
    HEALING = 0,
    MANA = 1,
    BUFF = 2,
    UTILITY = 3,
    FOOD = 4,
    ANTIDOTE = 5
}

## Effect types for consumables
enum EffectType {
    HEAL = 0,
    HEAL_PERCENT = 1,
    RESTORE_MANA = 2,
    BUFF = 3,
    STEALTH = 4,
    CURE_POISON = 5,
    SHIELD = 6
}

## Quest types
enum QuestType {
    MAIN = 0,
    SIDE = 1,
    BOUNTY = 2,
    HIDDEN = 3
}

## Quest objective types
enum QuestObjectiveType {
    REACH_FLOOR = 0,
    COLLECT = 1,
    DEFEAT_GUARDIAN = 2,
    KILL = 3,
    TALK_TO = 4,
    SURVIVE = 5,
    CRAFT = 6
}

## Bounty types
enum BountyType {
    KILL = 0,
    COLLECT = 1,
    REACH = 2,
    SURVIVE = 3,
    ELITE = 4
}

## NPC roles
enum NpcRole {
    QUEST_GIVER = 0,
    SHOPKEEPER = 1,
    BANKER = 2,
    BLACKSMITH = 3,
    ALCHEMIST = 4,
    INNKEEPER = 5,
    ELDER = 6,
    TRAINER = 7,
    BOUNTY_BOARD = 8,
    EXPEDITION_MASTER = 9,
    PRIESTESS = 10
}

## Crafting categories
enum CraftCategory {
    WEAPONS = 0,
    ARMOR = 1,
    CONSUMABLES = 2,
    UPGRADES = 3,
    SPECIAL = 4
}

## Wander patterns for monster AI
enum WanderPattern {
    RANDOM = 0,
    PATROL = 1,
    STATIONARY = 2,
    PACING = 3
}

## Follow formations for pack AI
enum FollowFormation {
    CLUSTER = 0,
    LINE = 1,
    SPREAD = 2,
    NONE = 3
}
```

---

## Section 3: Resource Class Definitions

### 3.1 Monster Data

**JS Source:** `js/data/monsters-data.js` (466 lines, ~25 monsters)

Each monster entry in `MONSTER_DATA` becomes a `MonsterData` resource instance.

**Loot sub-resource:**
```gdscript
# resources/data_classes/loot_entry_data.gd
class_name LootEntryData
extends Resource

@export var item_name: String = ""
@export var drop_chance: float = 0.0       # 0.0 - 1.0
@export var rarity: Constants.Rarity = Constants.Rarity.COMMON
@export var favor_value: int = 0
```

**Monster resource:**
```gdscript
# resources/data_classes/monster_data.gd
class_name MonsterData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""

@export_group("Base Stats")
@export var hp: int = 0
@export var str_stat: int = 0              # 'str' is reserved in some contexts
@export var agi: int = 0
@export var int_stat: int = 0              # 'int' is a type name
@export var p_def: int = 0
@export var m_def: int = 0
@export var xp: int = 0

@export_group("Combat")
@export var element: Constants.Element = Constants.Element.PHYSICAL
@export var attack_name: String = ""       # Display name of default attack
@export var attack_type: Constants.AttackType = Constants.AttackType.PHYSICAL
@export var damage_type: Constants.DamageType = Constants.DamageType.BLUNT
@export var attack_range: float = 1.0      # Tiles
@export var attack_speed: float = 2.0      # Seconds between attacks
@export var armor_type: Constants.ArmorType = Constants.ArmorType.UNARMORED

@export_group("Behavior")
@export var elite: bool = false
@export var move_interval: float = 2.0     # Seconds between movements
@export var aggression: int = 2            # 1-5 scale
@export var spawn_weight: int = 10         # Higher = more common

@export_group("Loot")
@export var loot: Array[LootEntryData] = []
```

**JS field mapping:**
| JS Field | GDScript Property | Type | Notes |
|----------|-------------------|------|-------|
| `key` (e.g. `'Magma Slime'`) | `display_name` + derive `id` | `String` | `id` = `snake_case(key)` |
| `hp` | `hp` | `int` | Direct |
| `str` | `str_stat` | `int` | Renamed to avoid keyword conflict |
| `agi` | `agi` | `int` | Direct |
| `int` | `int_stat` | `int` | Renamed to avoid type name conflict |
| `pDef` | `p_def` | `int` | snake_case |
| `mDef` | `m_def` | `int` | snake_case |
| `xp` | `xp` | `int` | Direct |
| `element` (string) | `element` | `Constants.Element` | Map string to enum |
| `attack` | `attack_name` | `String` | Display name |
| `attackType` (string) | `attack_type` | `Constants.AttackType` | `'physical'` -> `PHYSICAL` |
| `damageType` (string) | `damage_type` | `Constants.DamageType` | `'blunt'` -> `BLUNT` |
| `attackRange` | `attack_range` | `float` | Direct |
| `attackSpeed` | `attack_speed` | `float` | Direct |
| `armorType` (string) | `armor_type` | `Constants.ArmorType` | Map string to enum |
| `elite` | `elite` | `bool` | Direct |
| `moveInterval` | `move_interval` | `float` | Direct |
| `aggression` | `aggression` | `int` | Direct |
| `spawnWeight` | `spawn_weight` | `int` | Direct |
| `loot` (array of objects) | `loot` | `Array[LootEntryData]` | Each object -> sub-resource |
| `description` | `description` | `String` | Direct |

**Example .tres file:**
```
; resources/monsters/magma_slime.tres
[gd_resource type="Resource" script_class="MonsterData" load_steps=4 format=3]

[ext_resource type="Script" path="res://resources/data_classes/monster_data.gd" id="1"]
[ext_resource type="Script" path="res://resources/data_classes/loot_entry_data.gd" id="2"]

[sub_resource type="Resource" id="loot_1"]
script = ExtResource("2")
item_name = "Magma Core"
drop_chance = 0.03
rarity = 2
favor_value = 45

[sub_resource type="Resource" id="loot_2"]
script = ExtResource("2")
item_name = "Magma Residue"
drop_chance = 0.25
rarity = 0
favor_value = 3

[sub_resource type="Resource" id="loot_3"]
script = ExtResource("2")
item_name = "Hardened Slime"
drop_chance = 0.25
rarity = 0
favor_value = 3

[resource]
script = ExtResource("1")
id = "magma_slime"
display_name = "Magma Slime"
description = "A slow, gelatinous blob of living lava. Easy to kill but watch for groups."
hp = 30
str_stat = 6
agi = 5
int_stat = 8
p_def = 15
m_def = 8
xp = 15
element = 1
attack_name = "Slam"
attack_type = 0
damage_type = 1
attack_range = 1.0
attack_speed = 2.5
armor_type = 0
elite = false
move_interval = 3.0
aggression = 2
spawn_weight = 30
loot = [SubResource("loot_1"), SubResource("loot_2"), SubResource("loot_3")]
```

**File count:** ~25 .tres files in `resources/monsters/`

---

### 3.2 Monster Tiers

**JS Source:** `js/data/monster-tiers.js` (1008 lines, 5 tiers)

Each tier is a deeply nested config with 7 categories: perception, movement, combat, defense, social, positioning, intelligence. Convert each tier to a `MonsterTierData` resource.

```gdscript
# resources/data_classes/monster_tier_data.gd
class_name MonsterTierData
extends Resource

@export_group("Identity")
@export var tier: Constants.MonsterTier = Constants.MonsterTier.TIER_3
@export var tier_name: String = ""
@export var indicator: String = ""
@export var color: Color = Color.WHITE
@export var description: String = ""

@export_group("Perception")
@export var sight_range: float = 3.0
@export var sight_cone_angle: float = 50.0
@export var can_see_in_dark: bool = false
@export var peripheral_range: float = 0.0
@export var hearing_range: float = 6.0
@export var hearing_multiplier: float = 0.8
@export var deaf_during_combat: bool = true
@export var reaction_delay: float = 0.6        # Seconds (JS uses ms, convert)
@export var alertness_falloff: float = 2.0
@export var memory_duration: float = 0.0        # Seconds
@export var memory_accuracy: float = 0.0

@export_group("Movement")
@export var base_speed: float = 2.5
@export var chase_speed: float = 3.0
@export var flee_speed: float = 4.0
@export var combat_speed: float = 2.0
@export var strafe_mult: float = 0.6
@export var retreat_mult: float = 0.8
@export var injured_mult: float = 1.2
@export var wander_pattern: Constants.WanderPattern = Constants.WanderPattern.RANDOM
@export var wander_radius: float = 4.0
@export var pause_chance: float = 0.3
@export var pause_duration_min: float = 1.0     # Seconds (JS uses ms)
@export var pause_duration_max: float = 3.0
@export var turn_chance: float = 0.5

@export_group("Combat")
@export var windup_duration: float = 0.5        # Seconds (JS uses ms)
@export var attack_duration: float = 0.7
@export var recovery_duration: float = 0.4
@export var attack_cooldown: float = 2.5
@export var tracks_during_windup: bool = false
@export var tracking_cutoff: float = 0.0
@export var can_interrupt_attack: bool = true
@export var attack_arc: float = -1.0            # -1 = single target (JS null)
@export var charge_distance: float = 0.0
@export var knockback_on_hit: float = 0.0
@export var telegraph_color: Color = Color.WHITE
@export var telegraph_intensity: float = 0.3
@export var max_attackers_contribution: float = 0.5
@export var circling_speed: float = 1.5
@export var maintains_formation: bool = false

@export_group("Defense")
@export var flee_threshold: float = 0.3
@export var flee_to_ally: bool = true
@export var flee_distance: float = 6.0
@export var evasion_chance: float = 0.0
@export var evasion_cooldown: float = 0.0
@export var can_dodge_aoe: bool = false
@export var dodge_distance: float = 0.0
@export var base_damage_reduction: float = 0.0
@export var resistances: Dictionary = {}        # Element string -> float
@export var status_resistance: Dictionary = {}  # Status string -> float

@export_group("Social")
@export var can_lead: bool = false
@export var command_range: float = 0.0
@export var commandable_by: Array[Constants.MonsterTier] = []
@export var follow_distance: float = 3.0
@export var follow_formation: Constants.FollowFormation = Constants.FollowFormation.CLUSTER
@export var pack_courage: bool = true
@export var pack_courage_threshold: int = 4
@export var pack_courage_bonus: float = 0.1
@export var is_sacrificial: bool = true
@export var can_sacrifice_minions: bool = false
@export var sacrifice_threshold: float = 0.0
@export var sacrifice_heal: float = 0.0
@export var sacrifice_damage_buff: float = 0.0
@export var shout_range: float = 5.0
@export var shout_delay: float = 1.5
@export var shout_interruptable: bool = true
@export var alert_on_damage: bool = true
@export var alert_on_death: bool = true
@export var base_morale: int = 40
@export var morale_per_ally_death: int = 15
@export var morale_panic_threshold: int = 20
@export var morale_recovery_rate: int = 5
```

**Conversion note -- milliseconds to seconds:** The JS source uses milliseconds for timings (`reactionDelay: 600`, `windupDuration: 500`, `pauseDurationMin: 1000`). Godot uses seconds. **Divide all ms values by 1000** when writing .tres files. Colors are hex strings in JS (`'#888888'`); convert to Godot `Color` objects.

**File count:** 5 .tres files in `resources/monsters/tiers/`

---

### 3.3 Abilities

**JS Source:** `js/data/ability-repository.js` (1260 lines, 50+ abilities)

The JS `AbilityRepository` has three sections: `TIER_SCALING`, `ATTACKS`, and `BEHAVIORS`. Tier scaling becomes a lookup dictionary on the autoload. Attacks and behaviors each become `AbilityData` resources.

**AoE sub-resource:**
```gdscript
# resources/data_classes/aoe_shape_data.gd
class_name AoeShapeData
extends Resource

@export var shape: Constants.AoeShape = Constants.AoeShape.NONE
@export var angle: float = 0.0           # Degrees (for arc/cone)
@export var radius: float = 0.0          # Tiles
@export var length: float = 0.0          # Tiles (for line)
@export var width: float = 0.0           # Tiles (for line)
```

**Ability resource:**
```gdscript
# resources/data_classes/ability_data.gd
class_name AbilityData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var category: Constants.AttackCategory = Constants.AttackCategory.MELEE

@export_group("Damage")
@export var damage: float = 0.0
@export var range_tiles: float = 1.0          # 'range' is a keyword
@export var hit_count: int = 1
@export var hit_delay: float = 0.0            # Seconds between multi-hits

@export_group("AoE")
@export var aoe: AoeShapeData = null

@export_group("Timing")
@export var telegraph_time: float = 0.6       # Seconds (JS ms / 1000)
@export var cooldown: float = 1.6             # Seconds
@export var recovery_time: float = 0.6        # Seconds

@export_group("Movement")
@export var charge_distance: float = 0.0      # Tiles lunged forward
@export var charge_speed: float = 0.0

@export_group("Effects")
@export var effect: String = ""               # e.g., 'knockback', 'stun', 'burn'
@export var knockback_force: float = 0.0
@export var stun_duration: float = 0.0
@export var dot_damage: float = 0.0
@export var dot_duration: float = 0.0
@export var slow_amount: float = 0.0
@export var slow_duration: float = 0.0
@export var projectile_speed: float = 0.0
@export var projectile_count: int = 0

@export_group("Usage Restrictions")
@export var for_boss: bool = false
@export var for_enemy: bool = false
@export var allowed_enemies: PackedStringArray = []  # Named exceptions

@export_group("Summon")
@export var summon_type: String = ""
@export var summon_count: int = 0
@export var summon_duration: float = 0.0
```

**Tier Scaling** -- stored as a const dictionary on a data autoload or in Constants:
```gdscript
# In autoload/constants.gd or a dedicated data_registry.gd
const ABILITY_TIER_SCALING: Dictionary = {
    Constants.MonsterTier.TIER_3: { "damage_multiplier": 0.4, "range_multiplier": 0.7 },
    Constants.MonsterTier.TIER_2: { "damage_multiplier": 0.6, "range_multiplier": 0.85 },
    Constants.MonsterTier.TIER_1: { "damage_multiplier": 0.8, "range_multiplier": 1.0 },
    Constants.MonsterTier.ELITE:  { "damage_multiplier": 1.0, "range_multiplier": 1.0 },
    Constants.MonsterTier.BOSS:   { "damage_multiplier": 1.2, "range_multiplier": 1.2 },
}
```

**Example .tres -- `melee_swing`:**
```
; resources/abilities/attacks/melee_swing.tres
[gd_resource type="Resource" script_class="AbilityData" load_steps=3 format=3]

[ext_resource type="Script" path="res://resources/data_classes/ability_data.gd" id="1"]
[ext_resource type="Script" path="res://resources/data_classes/aoe_shape_data.gd" id="2"]

[sub_resource type="Resource" id="aoe"]
script = ExtResource("2")
shape = 1
angle = 120.0
radius = 2.0

[resource]
script = ExtResource("1")
id = "melee_swing"
display_name = "Melee Swing"
description = "Standard melee arc attack"
category = 0
damage = 20.0
range_tiles = 2.0
aoe = SubResource("aoe")
telegraph_time = 0.6
cooldown = 1.6
recovery_time = 0.6
for_boss = true
for_enemy = true
```

**JS field mapping (abilities):**
| JS Field | GDScript Property | Type | Notes |
|----------|-------------------|------|-------|
| `id` | `id` | `String` | Direct |
| `name` | `display_name` | `String` | `name` is inherited from Object |
| `category` (string) | `category` | `Constants.AttackCategory` | Map `'melee'`->0, `'ranged'`->1, etc. |
| `damage` | `damage` | `float` | Direct |
| `range` | `range_tiles` | `float` | `range` is a GDScript keyword |
| `aoe` (object) | `aoe` | `AoeShapeData` | Sub-resource |
| `aoe.shape` | `aoe.shape` | `Constants.AoeShape` | Map `'arc'`->1, `'circle'`->2, etc. |
| `telegraphTime` (ms) | `telegraph_time` | `float` | **Divide by 1000** |
| `cooldown` (ms) | `cooldown` | `float` | **Divide by 1000** |
| `recoveryTime` (ms) | `recovery_time` | `float` | **Divide by 1000** |
| `hitCount` | `hit_count` | `int` | Direct (default 1) |
| `hitDelay` (ms) | `hit_delay` | `float` | **Divide by 1000** |
| `forBoss` | `for_boss` | `bool` | Direct |
| `forEnemy` | `for_enemy` | `bool` | Direct |
| `allowedEnemies` | `allowed_enemies` | `PackedStringArray` | Direct |
| `effect` (string) | `effect` | `String` | Direct |
| `knockbackForce` | `knockback_force` | `float` | Direct |

**File count:** ~50+ .tres files in `resources/abilities/`

---

### 3.4 Items (Consumables, Quest Items)

**JS Source:** `js/data/items.js` (543 lines)

The JS file has three dictionaries: `CONSUMABLES`, `MATERIALS` (references `materials.js`), and `QUEST_ITEMS`. Each entry becomes an `ItemData` resource.

**Effect sub-resource** (inline in the item):
```gdscript
# resources/data_classes/item_data.gd
class_name ItemData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var item_type: Constants.ItemType = Constants.ItemType.CONSUMABLE

@export_group("Classification")
@export var subtype: Constants.ConsumableSubtype = Constants.ConsumableSubtype.HEALING
@export var rarity: Constants.Rarity = Constants.Rarity.COMMON

@export_group("Stacking")
@export var stackable: bool = true
@export var max_stack: int = 10

@export_group("Effect")
@export var effect_type: Constants.EffectType = Constants.EffectType.HEAL
@export var effect_value: float = 0.0          # Flat heal, mana restore, etc.
@export var effect_stat: String = ""           # For buffs: 'str', 'agi', etc.
@export var effect_duration: float = 0.0       # Seconds
@export var effect_is_percent: bool = false     # true for healPercent

@export_group("Economy")
@export var gold_value: int = 0

@export_group("Quest Item Properties")
@export var quest_id: String = ""              # Which quest this belongs to
@export var unique: bool = false               # Can only hold one
```

**JS field mapping (consumables):**
| JS Field | GDScript Property | Type | Notes |
|----------|-------------------|------|-------|
| key / `id` | `id` | `String` | Direct |
| `name` | `display_name` | `String` | |
| `type` (always `'consumable'`) | `item_type` | `Constants.ItemType` | `CONSUMABLE` |
| `subtype` | `subtype` | `Constants.ConsumableSubtype` | Map string to enum |
| `rarity` | `rarity` | `Constants.Rarity` | Map string to enum |
| `stackable` | `stackable` | `bool` | Direct |
| `maxStack` | `max_stack` | `int` | Direct |
| `effect.type` | `effect_type` | `Constants.EffectType` | Map `'heal'`->0, `'healPercent'`->1, etc. |
| `effect.value` | `effect_value` | `float` | Direct |
| `effect.stat` | `effect_stat` | `String` | For buffs only |
| `effect.duration` | `effect_duration` | `float` | Direct (already in seconds) |
| `description` | `description` | `String` | Direct |
| `goldValue` | `gold_value` | `int` | Direct |

**Example .tres (consumable):**
```
; resources/items/consumables/health_potion.tres
[gd_resource type="Resource" script_class="ItemData" load_steps=2 format=3]

[ext_resource type="Script" path="res://resources/data_classes/item_data.gd" id="1"]

[resource]
script = ExtResource("1")
id = "health_potion"
display_name = "Health Potion"
description = "Restores 60 HP."
item_type = 0
subtype = 0
rarity = 1
stackable = true
max_stack = 10
effect_type = 0
effect_value = 60.0
gold_value = 50
```

**File count:** ~25 consumables + ~15 quest items = ~40 .tres files

---

### 3.5 Weapons

**JS Sources:**
- `js/data/weapons-melee.js` (155 lines, 10 weapons: 5 swords, 5 maces)
- `js/data/weapons-ranged.js` (227 lines, 15 weapons: 5 polearms, 5 bows, 5 daggers)
- `js/data/weapons-magic.js` (83 lines, 5 staffs)

All 30 weapons share the same structure. One `WeaponData` class handles all.

```gdscript
# resources/data_classes/weapon_data.gd
class_name WeaponData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""

@export_group("Classification")
@export var weapon_type: Constants.WeaponType = Constants.WeaponType.SWORD
@export var damage_type: Constants.DamageType = Constants.DamageType.BLADE
@export var rarity: Constants.Rarity = Constants.Rarity.COMMON
@export var slot: Constants.EquipSlot = Constants.EquipSlot.MAIN

@export_group("Combat Stats")
@export var damage: int = 0
@export var speed: float = 1.0                 # Attack speed multiplier
@export var range_tiles: float = 1.25

@export_group("Bonus Stats")
@export var str_bonus: int = 0
@export var agi_bonus: int = 0
@export var int_bonus: int = 0
@export var p_def_bonus: int = 0
@export var m_def_bonus: int = 0

@export_group("Special Properties")
@export var crit_bonus: float = 0.0
@export var execute_bonus: float = 0.0
@export var life_steal: float = 0.0
@export var armor_pen: float = 0.0
@export var stagger: float = 0.0
@export var bleed: float = 0.0
@export var reach: int = 0                     # Extra range in tiles
@export var noise_reduction: float = 0.0
@export var double_strike: float = 0.0
@export var silent: bool = false
@export var spell_echo: float = 0.0
@export var magic_pen: float = 0.0
@export var mana_regen: float = 0.0
@export var crit_dmg: float = 0.0              # Crit damage bonus

@export_group("Economy")
@export var gold_value: int = 0
```

**JS field mapping (weapons):**
| JS Field | GDScript Property | Type | Notes |
|----------|-------------------|------|-------|
| `id` | `id` | `String` | Direct |
| `name` | `display_name` | `String` | |
| `type` (e.g. `'sword'`) | `weapon_type` | `Constants.WeaponType` | Map string to enum |
| `damageType` (e.g. `'blade'`) | `damage_type` | `Constants.DamageType` | Map string to enum |
| `rarity` | `rarity` | `Constants.Rarity` | Map string to enum |
| `damage` | `damage` | `int` | Direct |
| `speed` | `speed` | `float` | Direct |
| `range` | `range_tiles` | `float` | Renamed |
| `stats.str` | `str_bonus` | `int` | Flattened from nested object |
| `stats.agi` | `agi_bonus` | `int` | |
| `stats.int` | `int_bonus` | `int` | |
| `stats.pDef` | `p_def_bonus` | `int` | |
| `stats.mDef` | `m_def_bonus` | `int` | |
| `special.critBonus` | `crit_bonus` | `float` | Flattened from nested object |
| `special.executeBonus` | `execute_bonus` | `float` | |
| `special.lifeSteal` | `life_steal` | `float` | |
| `special.armorPen` | `armor_pen` | `float` | |
| `special.stagger` | `stagger` | `float` | |
| `special.bleed` | `bleed` | `float` | |
| `special.reach` | `reach` | `int` | |
| `special.noiseReduction` | `noise_reduction` | `float` | |
| `special.doubleStrike` | `double_strike` | `float` | |
| `special.silent` | `silent` | `bool` | |
| `special.spellEcho` | `spell_echo` | `float` | |
| `special.magicPen` | `magic_pen` | `float` | |
| `special.manaRegen` | `mana_regen` | `float` | |
| `special.critDmg` | `crit_dmg` | `float` | |
| `slot` (always `'MAIN'`) | `slot` | `Constants.EquipSlot` | Map string to enum |
| `goldValue` | `gold_value` | `int` | Direct |

**Example .tres:**
```
; resources/weapons/melee/rusty_sword.tres
[gd_resource type="Resource" script_class="WeaponData" load_steps=2 format=3]

[ext_resource type="Script" path="res://resources/data_classes/weapon_data.gd" id="1"]

[resource]
script = ExtResource("1")
id = "rusty_sword"
display_name = "Rusty Sword"
weapon_type = 0
damage_type = 0
rarity = 0
slot = 0
damage = 7
speed = 1.0
range_tiles = 1.25
str_bonus = 2
agi_bonus = 1
gold_value = 15
```

**File count:** 30 .tres files (10 melee + 15 ranged + 5 magic)

---

### 3.6 Armor Types

**JS Source:** `js/data/armor-types.js` (280 lines, 8 types)

Each of the 8 armor type definitions becomes an `ArmorTypeData` resource. This stores the meta-definition (weaknesses, resistances, modifiers), NOT individual armor pieces.

```gdscript
# resources/data_classes/armor_type_data.gd
class_name ArmorTypeData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var armor_type: Constants.ArmorType = Constants.ArmorType.UNARMORED

@export_group("Weaknesses & Resistances")
@export var weak_to: Array[Constants.DamageType] = []
@export var resistant_to: Array[Constants.DamageType] = []

@export_group("Usage")
@export var player_wearable: bool = false
@export var monster_only: bool = false
@export var defensive_role: String = ""

@export_group("Modifiers")
@export var defense_modifier: float = 0.0      # 0.0 - 1.1
@export var hp_tier_modifier: float = 0.0      # 0.0 - 1.0

@export_group("Stat Allocation (player armor)")
@export var primary_stat: String = ""          # 'str', 'agi', 'int'
@export var secondary_stat: String = ""
```

**File count:** 8 .tres files in `resources/armor_types/`

---

### 3.7 Armor Pieces, Shields, and Legendary Armor

**JS Source:** `js/data/armor-defense.js` (448 lines, 80 generated + 5 shields + 4 legendary = 89 pieces)

The JS generates 80 armor pieces procedurally at load time from a matrix of 5 types x 4 slots x 4 rarities. For Godot, either:
- **(Recommended) Generate .tres files at conversion time** using a script, or
- **Write a GDScript factory** that generates them at startup

Approach: **Generate all 89 .tres files upfront.** Use a conversion script (see Section 10).

```gdscript
# resources/data_classes/armor_piece_data.gd
class_name ArmorPieceData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""

@export_group("Classification")
@export var slot: Constants.EquipSlot = Constants.EquipSlot.HEAD
@export var armor_type: Constants.ArmorType = Constants.ArmorType.CLOTH
@export var rarity: Constants.Rarity = Constants.Rarity.COMMON

@export_group("Stats")
@export var defense: int = 0
@export var hp_bonus: int = 0
@export var str_bonus: int = 0
@export var agi_bonus: int = 0
@export var int_bonus: int = 0
@export var p_def_bonus: int = 0
@export var m_def_bonus: int = 0

@export_group("Special Properties")
@export var special: Dictionary = {}           # e.g. {"fireResist": 0.1}
@export var element: Constants.Element = Constants.Element.NONE

@export_group("Economy")
@export var gold_value: int = 0
```

**Shield resource** (same class, `slot = OFF`, `armor_type` is null/NONE):
```gdscript
# resources/data_classes/shield_data.gd
class_name ShieldData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""

@export_group("Classification")
@export var rarity: Constants.Rarity = Constants.Rarity.COMMON

@export_group("Stats")
@export var defense: int = 0
@export var hp_bonus: int = 0
@export var str_bonus: int = 0
@export var agi_bonus: int = 0
@export var int_bonus: int = 0
@export var p_def_bonus: int = 0

@export_group("Economy")
@export var gold_value: int = 0
```

**JS Generation Formula** (must produce identical results):
```
For each (armorType in [cloth, ethereal, hide, armored, stone]):
  For each (slot in [HEAD, CHEST, LEGS, FEET]):
    For each (rarity in [common, uncommon, rare, epic]):
      id = "{armorType}_{rarity}_{slot_lower}"
      defense = round(BASE_DEFENSE_BY_SLOT[slot][rarity] * ARMOR_TYPE_MODIFIERS[armorType].defenseModifier)
      hp = round(BASE_HP_BY_SLOT[slot][rarity] * ARMOR_TYPE_MODIFIERS[armorType].hpTierModifier)
      primary_stat_value = STATS_BY_RARITY[rarity].primary
      secondary_stat_value = STATS_BY_RARITY[rarity].secondary
```

**Generation lookup tables** (replicate exactly):
```
BASE_DEFENSE_BY_SLOT:
  HEAD:  common=4,  uncommon=8,  rare=14, epic=20
  CHEST: common=6,  uncommon=12, rare=20, epic=28
  LEGS:  common=4,  uncommon=10, rare=16, epic=24
  FEET:  common=3,  uncommon=6,  rare=12, epic=18

BASE_HP_BY_SLOT:
  HEAD:  common=3,  uncommon=6,  rare=10, epic=15
  CHEST: common=5,  uncommon=10, rare=16, epic=25
  LEGS:  common=3,  uncommon=8,  rare=12, epic=20
  FEET:  common=2,  uncommon=5,  rare=8,  epic=15

STATS_BY_RARITY:
  common:   primary=2,  secondary=0
  uncommon: primary=4,  secondary=2
  rare:     primary=7,  secondary=4
  epic:     primary=11, secondary=6

ARMOR_TYPE_MODIFIERS:
  cloth:    defMod=0.5, hpMod=0.3, primary='int', secondary='agi'
  ethereal: defMod=0.6, hpMod=0.3, primary='int', secondary='agi'
  hide:     defMod=0.8, hpMod=0.6, primary='agi', secondary='str'
  armored:  defMod=1.0, hpMod=1.0, primary='str', secondary='agi'
  stone:    defMod=1.1, hpMod=1.0, primary='str', secondary='str'

NAME ADJECTIVES: common='Crude', uncommon='Sturdy', rare='Reinforced', epic='Masterwork'

SLOT_NAMES[slot][type]:
  HEAD:  cloth='Hood',  ethereal='Circlet', hide='Cap',      armored='Helm',    stone='Crown'
  CHEST: cloth='Robe',  ethereal='Mantle',  hide='Vest',     armored='Cuirass', stone='Breastplate'
  LEGS:  cloth='Pants', ethereal='Legwraps',hide='Leggings', armored='Greaves', stone='Legguards'
  FEET:  cloth='Slippers', ethereal='Treads', hide='Boots', armored='Sabatons', stone='Stompers'
```

**File count:** 80 armor pieces + 5 shields + 4 legendary = 89 .tres files

---

### 3.8 Weapon-Armor Effectiveness Matrix

**JS Source:** `js/data/weapon-armor-matrix.js` (159 lines)

This is a 4x8 matrix of damage multipliers. Store as a **const dictionary** on a singleton, NOT as individual .tres files.

```gdscript
# In autoload/constants.gd or a dedicated data_registry.gd autoload

## Weapon vs Armor damage multiplier matrix
## Access: WEAPON_ARMOR_MATRIX[DamageType][ArmorType] -> float
const WEAPON_ARMOR_MATRIX: Dictionary = {
    DamageType.BLADE: {
        ArmorType.UNARMORED: 1.3, ArmorType.CLOTH: 1.3,
        ArmorType.HIDE: 1.0,     ArmorType.SCALED: 1.0,
        ArmorType.ARMORED: 0.7,  ArmorType.STONE: 0.7,
        ArmorType.BONE: 1.0,     ArmorType.ETHEREAL: 1.0,
    },
    DamageType.BLUNT: {
        ArmorType.UNARMORED: 1.0, ArmorType.CLOTH: 1.0,
        ArmorType.HIDE: 1.0,     ArmorType.SCALED: 1.0,
        ArmorType.ARMORED: 1.3,  ArmorType.STONE: 1.3,
        ArmorType.BONE: 1.3,     ArmorType.ETHEREAL: 0.7,
    },
    DamageType.PIERCE: {
        ArmorType.UNARMORED: 1.0, ArmorType.CLOTH: 1.3,
        ArmorType.HIDE: 1.3,     ArmorType.SCALED: 1.3,
        ArmorType.ARMORED: 0.7,  ArmorType.STONE: 0.7,
        ArmorType.BONE: 1.0,     ArmorType.ETHEREAL: 1.3,
    },
    DamageType.MAGIC: {
        ArmorType.UNARMORED: 1.3, ArmorType.CLOTH: 1.0,
        ArmorType.HIDE: 1.0,     ArmorType.SCALED: 1.0,
        ArmorType.ARMORED: 1.3,  ArmorType.STONE: 1.3,
        ArmorType.BONE: 1.0,     ArmorType.ETHEREAL: 0.7,
    },
}

## Weapon subtype -> Damage type mapping
const WEAPON_TO_DAMAGE_TYPE: Dictionary = {
    WeaponType.SWORD:   DamageType.BLADE,
    WeaponType.MACE:    DamageType.BLUNT,
    WeaponType.POLEARM: DamageType.PIERCE,
    WeaponType.BOW:     DamageType.PIERCE,
    WeaponType.DAGGER:  DamageType.PIERCE,
    WeaponType.STAFF:   DamageType.MAGIC,
}

## Lookup helper
static func get_weapon_armor_modifier(damage_type: DamageType, armor_type: ArmorType) -> float:
    if WEAPON_ARMOR_MATRIX.has(damage_type):
        var row: Dictionary = WEAPON_ARMOR_MATRIX[damage_type]
        if row.has(armor_type):
            return row[armor_type]
    return 1.0
```

**No .tres files** -- this is pure lookup data on the autoload.

---

### 3.9 Element Effectiveness Matrix

**JS Sources:**
- `js/data/elements.js` (186 lines, 10 elements)
- `js/data/element-matrix.js` (227 lines, 11x11 matrix)

**Element resource:**
```gdscript
# resources/data_classes/element_data.gd
class_name ElementData
extends Resource

@export var id: String = ""
@export var display_name: String = ""
@export var element: Constants.Element = Constants.Element.NONE
@export var color: Color = Color.WHITE
@export var theme: String = ""
@export var status_effect: String = ""         # Status effect applied by this element
@export var opposed_by: Array[Constants.Element] = []
@export var complements: Array[Constants.Element] = []
```

**Element Matrix** -- a const dictionary on the autoload, NOT .tres:
```gdscript
## Element vs Element damage modifier matrix
## Access: ELEMENT_MATRIX[attacker_element][defender_element] -> float (-0.3 to +0.3)
const ELEMENT_MATRIX: Dictionary = {
    Element.FIRE: {
        Element.FIRE: 0.0,    Element.ICE: 0.3,     Element.WATER: -0.3,
        Element.EARTH: 0.0,   Element.NATURE: 0.3,   Element.DEATH: 0.0,
        Element.ARCANE: 0.0,  Element.DARK: 0.0,     Element.HOLY: 0.0,
        Element.PHYSICAL: 0.0, Element.NONE: 0.0,
    },
    Element.ICE: {
        Element.FIRE: -0.3,   Element.ICE: 0.0,     Element.WATER: 0.0,
        Element.EARTH: 0.0,   Element.NATURE: 0.0,   Element.DEATH: 0.0,
        Element.ARCANE: 0.0,  Element.DARK: 0.0,     Element.HOLY: 0.0,
        Element.PHYSICAL: 0.0, Element.NONE: 0.0,
    },
    Element.WATER: {
        Element.FIRE: 0.3,    Element.ICE: 0.0,     Element.WATER: 0.0,
        Element.EARTH: 0.3,   Element.NATURE: 0.0,   Element.DEATH: 0.0,
        Element.ARCANE: 0.0,  Element.DARK: 0.0,     Element.HOLY: 0.0,
        Element.PHYSICAL: 0.0, Element.NONE: 0.0,
    },
    Element.EARTH: {
        Element.FIRE: 0.0,    Element.ICE: 0.0,     Element.WATER: -0.3,
        Element.EARTH: 0.0,   Element.NATURE: 0.3,   Element.DEATH: 0.0,
        Element.ARCANE: 0.0,  Element.DARK: 0.0,     Element.HOLY: 0.0,
        Element.PHYSICAL: 0.0, Element.NONE: 0.0,
    },
    Element.NATURE: {
        Element.FIRE: -0.3,   Element.ICE: 0.0,     Element.WATER: 0.0,
        Element.EARTH: -0.3,  Element.NATURE: 0.0,   Element.DEATH: 0.3,
        Element.ARCANE: 0.0,  Element.DARK: 0.0,     Element.HOLY: 0.0,
        Element.PHYSICAL: 0.0, Element.NONE: 0.0,
    },
    Element.DEATH: {
        Element.FIRE: 0.0,    Element.ICE: 0.0,     Element.WATER: 0.0,
        Element.EARTH: 0.0,   Element.NATURE: -0.3,  Element.DEATH: 0.0,
        Element.ARCANE: 0.0,  Element.DARK: 0.0,     Element.HOLY: -0.3,
        Element.PHYSICAL: 0.0, Element.NONE: 0.0,
    },
    Element.ARCANE: {
        Element.FIRE: 0.0,    Element.ICE: 0.0,     Element.WATER: 0.0,
        Element.EARTH: 0.0,   Element.NATURE: 0.0,   Element.DEATH: 0.0,
        Element.ARCANE: 0.0,  Element.DARK: 0.0,     Element.HOLY: 0.0,
        Element.PHYSICAL: 0.3, Element.NONE: 0.0,
    },
    Element.DARK: {
        Element.FIRE: 0.0,    Element.ICE: 0.0,     Element.WATER: 0.0,
        Element.EARTH: 0.0,   Element.NATURE: 0.0,   Element.DEATH: 0.0,
        Element.ARCANE: 0.0,  Element.DARK: 0.0,     Element.HOLY: -0.3,
        Element.PHYSICAL: 0.0, Element.NONE: 0.0,
    },
    Element.HOLY: {
        Element.FIRE: 0.0,    Element.ICE: 0.0,     Element.WATER: 0.0,
        Element.EARTH: 0.0,   Element.NATURE: 0.0,   Element.DEATH: 0.3,
        Element.ARCANE: 0.0,  Element.DARK: 0.3,     Element.HOLY: 0.0,
        Element.PHYSICAL: 0.0, Element.NONE: 0.0,
    },
    Element.PHYSICAL: {
        Element.FIRE: 0.0,    Element.ICE: 0.0,     Element.WATER: 0.0,
        Element.EARTH: 0.0,   Element.NATURE: 0.0,   Element.DEATH: 0.0,
        Element.ARCANE: -0.3, Element.DARK: 0.0,     Element.HOLY: 0.0,
        Element.PHYSICAL: 0.0, Element.NONE: 0.0,
    },
    Element.NONE: {
        Element.FIRE: 0.0,    Element.ICE: 0.0,     Element.WATER: 0.0,
        Element.EARTH: 0.0,   Element.NATURE: 0.0,   Element.DEATH: 0.0,
        Element.ARCANE: 0.0,  Element.DARK: 0.0,     Element.HOLY: 0.0,
        Element.PHYSICAL: 0.0, Element.NONE: 0.0,
    },
}

static func get_element_modifier(attacker: Element, defender: Element) -> float:
    if ELEMENT_MATRIX.has(attacker):
        var row: Dictionary = ELEMENT_MATRIX[attacker]
        if row.has(defender):
            return row[defender]
    return 0.0
```

**File count:** 10 element .tres files + matrix as const on autoload

---

### 3.10 NPCs

**JS Source:** `js/data/npcs.js` (875 lines, ~15 NPCs)

**Narrative sub-resource:**
```gdscript
# resources/data_classes/npc_narrative_data.gd
class_name NpcNarrativeData
extends Resource

@export var personality: String = ""
@export var secret: String = ""
@export var confrontation: String = ""
```

**NPC resource:**
```gdscript
# resources/data_classes/npc_data.gd
class_name NpcData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var title: String = ""
@export var description: String = ""
@export var color: Color = Color.WHITE

@export_group("Location & Role")
@export var building: String = ""
@export var role: Constants.NpcRole = Constants.NpcRole.SHOPKEEPER

@export_group("Dialogue")
@export var dialogue_tree: String = ""
@export var initial_dialogue: String = ""
@export var barks: PackedStringArray = []

@export_group("Services")
@export var services: PackedStringArray = []    # e.g. ["bank", "deposit", "withdraw"]

@export_group("Shop")
@export var shop_inventory: PackedStringArray = []  # Item IDs for sale
@export var buy_multiplier: float = 1.0
@export var sell_multiplier: float = 0.5

@export_group("Narrative")
@export var narrative: NpcNarrativeData = null

@export_group("Aliases")
@export var alias_of: String = ""              # For backward compat references
```

**File count:** ~15 .tres files in `resources/npcs/`

---

### 3.11 Quests

**JS Source:** `js/data/quests.js` (390 lines, ~15 quests)

**Quest objective sub-resource:**
```gdscript
# resources/data_classes/quest_objective_data.gd
class_name QuestObjectiveData
extends Resource

@export var type: Constants.QuestObjectiveType = Constants.QuestObjectiveType.REACH_FLOOR
@export var description: String = ""
@export var target_floor: int = -1            # For reach_floor
@export var item_id: String = ""              # For collect
@export var target_count: int = 0             # For collect, kill, defeat_guardian
```

**Quest reward sub-resource:**
```gdscript
# resources/data_classes/quest_reward_data.gd
class_name QuestRewardData
extends Resource

@export var gold: int = 0
@export var item_rewards: Dictionary = {}     # {item_id: count}
@export var unlocks: PackedStringArray = []   # Quest IDs or feature IDs unlocked
```

**Quest resource:**
```gdscript
# resources/data_classes/quest_data.gd
class_name QuestData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var quest_type: Constants.QuestType = Constants.QuestType.MAIN

@export_group("Structure")
@export var giver: String = ""                # NPC ID
@export var prerequisite: String = ""         # Quest ID (empty = none)
@export var repeatable: bool = false

@export_group("Objectives")
@export var objectives: Array[QuestObjectiveData] = []

@export_group("Rewards")
@export var rewards: QuestRewardData = null

@export_group("Dialogue")
@export var dialogue_start: String = ""
@export var dialogue_progress: String = ""
@export var dialogue_complete: String = ""
```

**File count:** ~15 .tres files in `resources/quests/`

---

### 3.12 Bounties

**JS Source:** `js/data/bounties.js` (602 lines, ~20 bounties)

**Bounty objective sub-resource:**
```gdscript
# resources/data_classes/bounty_objective_data.gd
class_name BountyObjectiveData
extends Resource

@export var type: Constants.BountyType = Constants.BountyType.KILL
@export var target: String = ""               # Monster type or 'any'
@export var count: int = 0
@export var floor: int = -1                   # -1 = any floor
```

**Bounty resource:**
```gdscript
# resources/data_classes/bounty_data.gd
class_name BountyData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""

@export_group("Classification")
@export var bounty_type: Constants.BountyType = Constants.BountyType.KILL
@export var tier: Constants.Rarity = Constants.Rarity.COMMON  # Reuse rarity for tier

@export_group("Objective")
@export var objective: BountyObjectiveData = null

@export_group("Reward")
@export var reward_gold: int = 0
@export var reward_items: Dictionary = {}     # {item_id: count}

@export_group("Limits")
@export var expires_after: int = 3            # Failed attempts before expiration
```

**File count:** ~20 .tres files in `resources/bounties/`

---

### 3.13 Crafting Recipes

**JS Source:** `js/data/crafting-data.js` (1140 lines, ~40 recipes)

**Material entry sub-resource:**
```gdscript
# resources/data_classes/crafting_material_entry.gd
class_name CraftingMaterialEntry
extends Resource

@export var material_id: String = ""
@export var count: int = 0
```

**Crafting recipe resource:**
```gdscript
# resources/data_classes/crafting_recipe_data.gd
class_name CraftingRecipeData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""

@export_group("Classification")
@export var category: Constants.CraftCategory = Constants.CraftCategory.WEAPONS
@export var tier: int = 1

@export_group("Requirements")
@export var materials: Array[CraftingMaterialEntry] = []
@export var gold_cost: int = 0
@export var craft_time: float = 2.0           # Seconds

@export_group("Result")
@export var result_item_id: String = ""       # ID of the item produced
@export var result_type: String = ""          # 'weapon', 'armor', 'consumable'
@export var result_rarity: Constants.Rarity = Constants.Rarity.UNCOMMON

@export_group("Availability")
@export var unlocked: bool = true             # Available from start?
@export var required_quest: String = ""       # Quest that unlocks this
```

**File count:** ~40 .tres files in `resources/crafting/recipes/`

---

### 3.14 Materials

**JS Source:** `js/data/materials.js` (~200 lines, ~20 materials)

```gdscript
# resources/data_classes/material_data.gd
class_name MaterialData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""

@export_group("Classification")
@export var tier: int = 1
@export var rarity: Constants.Rarity = Constants.Rarity.COMMON

@export_group("Stacking")
@export var stackable: bool = true
@export var max_stack: int = 99

@export_group("Economy")
@export var sell_value: int = 0

@export_group("Drop Info")
@export var drop_floors: PackedInt32Array = []
@export var drop_chance: float = 0.0

@export_group("Usage")
@export var uses: PackedStringArray = []       # e.g. ["basic_weapons", "repairs"]
```

**File count:** ~20 .tres files in `resources/materials/`

---

### 3.15 Audio Definitions

**JS Source:** `js/data/audio-definitions.js` (1089 lines), `js/data/music-tracks.js` (~200 lines)

```gdscript
# resources/data_classes/audio_def_data.gd
class_name AudioDefData
extends Resource

@export var id: String = ""
@export var display_name: String = ""
@export var file_path: String = ""             # res://assets/audio/sfx/...
@export var volume_db: float = 0.0
@export var pitch_scale: float = 1.0
@export var bus: String = "SFX"
@export var max_polyphony: int = 1
@export var category: String = ""              # e.g. "combat", "ui", "ambient"
```

```gdscript
# resources/data_classes/music_track_data.gd
class_name MusicTrackData
extends Resource

@export var id: String = ""
@export var display_name: String = ""
@export var file_path: String = ""
@export var volume_db: float = 0.0
@export var loop: bool = true
@export var bpm: float = 0.0
@export var scene_context: String = ""         # "village", "dungeon", "boss", "menu"
```

**File count:** ~50 SFX .tres + ~15 music .tres

---

### 3.16 Tileset & Room Data

**JS Sources:**
- `js/data/tileset-reference.js` (363 lines)
- `js/data/tileset-floors-1-2.js` (312 lines)
- `js/data/village-tile-states.js` (356 lines)
- `js/data/room-themes.js` (160 lines)

```gdscript
# resources/data_classes/tile_def_data.gd
class_name TileDefData
extends Resource

@export var id: String = ""
@export var tile_type: int = 0                 # TileType enum value
@export var walkable: bool = true
@export var transparent: bool = true
@export var color: Color = Color.WHITE
@export var floor_context: int = 0             # Which dungeon floor
```

```gdscript
# resources/data_classes/village_tile_data.gd
class_name VillageTileData
extends Resource

@export var id: String = ""
@export var display_name: String = ""
@export var tile_type: int = 0
@export var building_type: String = ""
@export var walkable: bool = true
@export var interactable: bool = false
@export var npc_id: String = ""                # NPC stationed here
```

```gdscript
# resources/data_classes/room_theme_data.gd
class_name RoomThemeData
extends Resource

@export var id: String = ""
@export var display_name: String = ""
@export var description: String = ""
@export var floor_range: Vector2i = Vector2i(1, 5)  # Min/max floors
@export var wall_color: Color = Color.WHITE
@export var floor_color: Color = Color.WHITE
@export var ambient_color: Color = Color.WHITE
@export var monster_types: PackedStringArray = []
@export var hazard_types: PackedStringArray = []
```

**File count:** ~20 tile defs + ~15 village tiles + ~8 room themes

---

### 3.17 Lore, Equipment Visuals, Core Data, Elder Dialogue

**JS Sources:**
- `js/data/lore-fragments.js` (~150 lines)
- `js/data/equipment-visuals.js` (~150 lines)
- `js/data/core-data.js` (~200 lines)
- `js/data/elder-dialogue.js` (~200 lines)

```gdscript
# resources/data_classes/lore_fragment_data.gd
class_name LoreFragmentData
extends Resource

@export var id: String = ""
@export var title: String = ""
@export var text: String = ""
@export var category: String = ""              # "history", "monsters", "village"
@export var floor_found: int = 0
@export var rarity: Constants.Rarity = Constants.Rarity.COMMON
```

```gdscript
# resources/data_classes/equipment_visual_data.gd
class_name EquipmentVisualData
extends Resource

@export var equipment_id: String = ""
@export var sprite_sheet: String = ""          # res://assets/sprites/...
@export var sprite_region: Rect2 = Rect2()
@export var color_tint: Color = Color.WHITE
@export var animation_set: String = ""
```

```gdscript
# resources/data_classes/core_config_data.gd
class_name CoreConfigData
extends Resource

@export_group("Access")
@export var key_item: String = "core_key"
@export var min_level: int = 1
@export var guardians_defeated: int = 5

@export_group("Arena")
@export var arena_width: int = 40
@export var arena_height: int = 40
@export var tile_type: String = "void"
@export var ambient_light: float = 0.3
@export var fog_color: Color = Color("1a0a2a")

@export_group("Phases")
@export var phase_count: int = 3

@export_group("Rewards")
@export var reward_gold: int = 10000
@export var reward_materials: Dictionary = {}  # {id: count}
@export var unlocks: PackedStringArray = []
```

```gdscript
# resources/data_classes/boss_phase_data.gd
class_name BossPhaseData
extends Resource

@export var phase_name: String = ""
@export var health_threshold: float = 1.0
@export var stat_multiplier: float = 1.0
@export var abilities: PackedStringArray = []
@export var attack_pattern: String = "standard"
@export var music_track: String = ""
@export var dialogue: PackedStringArray = []
```

```gdscript
# resources/data_classes/core_boss_data.gd
class_name CoreBossData
extends Resource

@export_group("Identity")
@export var id: String = ""
@export var display_name: String = ""
@export var title: String = ""
@export var description: String = ""

@export_group("Base Stats")
@export var health: int = 5000
@export var damage: int = 40
@export var defense: int = 30
@export var speed: float = 1.5
@export var attack_speed: float = 1.0

@export_group("Visual")
@export var sprite: String = ""
@export var size: int = 4
@export var color: Color = Color.WHITE
@export var glow_color: Color = Color.WHITE
@export var glow_intensity: float = 0.8

@export_group("Phases")
@export var phases: Array[BossPhaseData] = []
```

```gdscript
# resources/data_classes/elder_dialogue_data.gd
class_name ElderDialogueData
extends Resource

@export var id: String = ""
@export var speaker: String = ""
@export var condition: String = ""             # When this dialogue triggers
@export var lines: PackedStringArray = []
@export var choices: Array[Dictionary] = []    # [{text, next_id, condition}]
```

---

## Section 4: Data Registry Autoload

Create a singleton that loads all .tres files at startup and provides lookup by ID. This replaces the JS pattern of `MONSTER_DATA['Magma Slime']`.

```gdscript
# autoload/data_registry.gd
class_name DataRegistryDef
extends Node

# --- Preloaded collections ---
var monsters: Dictionary = {}           # id -> MonsterData
var items: Dictionary = {}              # id -> ItemData
var weapons: Dictionary = {}            # id -> WeaponData
var armor_pieces: Dictionary = {}       # id -> ArmorPieceData
var shields: Dictionary = {}            # id -> ShieldData
var armor_types: Dictionary = {}        # id -> ArmorTypeData
var abilities: Dictionary = {}          # id -> AbilityData
var elements: Dictionary = {}           # id -> ElementData
var npcs: Dictionary = {}               # id -> NpcData
var quests: Dictionary = {}             # id -> QuestData
var bounties: Dictionary = {}           # id -> BountyData
var recipes: Dictionary = {}            # id -> CraftingRecipeData
var materials: Dictionary = {}          # id -> MaterialData
var monster_tiers: Dictionary = {}      # MonsterTier enum -> MonsterTierData
var lore_fragments: Dictionary = {}     # id -> LoreFragmentData
var room_themes: Dictionary = {}        # id -> RoomThemeData
var audio_defs: Dictionary = {}         # id -> AudioDefData
var music_tracks: Dictionary = {}       # id -> MusicTrackData

func _ready() -> void:
    _load_directory("res://resources/monsters/", monsters)
    _load_directory("res://resources/items/consumables/", items)
    _load_directory("res://resources/items/quest_items/", items)
    _load_directory("res://resources/weapons/melee/", weapons)
    _load_directory("res://resources/weapons/ranged/", weapons)
    _load_directory("res://resources/weapons/magic/", weapons)
    _load_directory("res://resources/armor/pieces/", armor_pieces)
    _load_directory("res://resources/armor/shields/", shields)
    _load_directory("res://resources/armor_types/", armor_types)
    _load_directory("res://resources/abilities/attacks/", abilities)
    _load_directory("res://resources/abilities/behaviors/", abilities)
    _load_directory("res://resources/abilities/boss_abilities/", abilities)
    _load_directory("res://resources/elements/", elements)
    _load_directory("res://resources/npcs/", npcs)
    _load_directory("res://resources/quests/", quests)
    _load_directory("res://resources/bounties/", bounties)
    _load_directory("res://resources/crafting/recipes/", recipes)
    _load_directory("res://resources/materials/", materials)
    _load_directory("res://resources/lore/", lore_fragments)
    _load_directory("res://resources/room_themes/", room_themes)
    _load_directory("res://resources/audio/sfx/", audio_defs)
    _load_directory("res://resources/audio/music/", music_tracks)
    _load_tiers()
    print("[DataRegistry] Loaded: %d monsters, %d items, %d weapons, %d armor, %d abilities" % [
        monsters.size(), items.size(), weapons.size(), armor_pieces.size(), abilities.size()
    ])

func _load_directory(path: String, target: Dictionary) -> void:
    var dir := DirAccess.open(path)
    if dir == null:
        push_warning("DataRegistry: Could not open %s" % path)
        return
    dir.list_dir_begin()
    var file_name := dir.get_next()
    while file_name != "":
        if file_name.ends_with(".tres"):
            var res := load(path + file_name)
            if res and res.has_method("get") == false:
                # Access the id property
                if "id" in res:
                    target[res.id] = res
                else:
                    push_warning("DataRegistry: Resource %s has no 'id' property" % file_name)
        file_name = dir.get_next()
    dir.list_dir_end()

func _load_tiers() -> void:
    var tier_dir := "res://resources/monsters/tiers/"
    var dir := DirAccess.open(tier_dir)
    if dir == null:
        return
    dir.list_dir_begin()
    var file_name := dir.get_next()
    while file_name != "":
        if file_name.ends_with(".tres"):
            var res: MonsterTierData = load(tier_dir + file_name)
            if res:
                monster_tiers[res.tier] = res
        file_name = dir.get_next()
    dir.list_dir_end()

# --- Lookup helpers ---
func get_monster(id: String) -> MonsterData:
    return monsters.get(id)

func get_item(id: String) -> ItemData:
    return items.get(id)

func get_weapon(id: String) -> WeaponData:
    return weapons.get(id)

func get_ability(id: String) -> AbilityData:
    return abilities.get(id)

func get_npc(id: String) -> NpcData:
    return npcs.get(id)

func get_quest(id: String) -> QuestData:
    return quests.get(id)

func get_monster_tier(tier: Constants.MonsterTier) -> MonsterTierData:
    return monster_tiers.get(tier)
```

**Register in `project.godot`:**
```
[autoload]
Constants="*res://autoload/constants.gd"
EventBus="*res://autoload/event_bus.gd"
DataRegistry="*res://autoload/data_registry.gd"
GameManager="*res://autoload/game_manager.gd"
SaveManager="*res://autoload/save_manager.gd"
AudioManager="*res://autoload/audio_manager.gd"
```

---

## Section 5: Complete File-by-File Conversion Table

| # | JS Source File | Lines | Godot Target File(s) | Type | Count |
|---|----------------|-------|----------------------|------|-------|
| 1 | `monsters-data.js` | 466 | `resources/data_classes/monster_data.gd` + `resources/monsters/*.tres` | Class + Instances | 1 + ~25 |
| 2 | `monster-tiers.js` | 1008 | `resources/data_classes/monster_tier_data.gd` + `resources/monsters/tiers/*.tres` | Class + Instances | 1 + 5 |
| 3 | `ability-repository.js` | 1260 | `resources/data_classes/ability_data.gd` + `resources/data_classes/aoe_shape_data.gd` + `resources/abilities/**/*.tres` | Classes + Instances | 2 + ~50 |
| 4 | `items.js` | 543 | `resources/data_classes/item_data.gd` + `resources/items/**/*.tres` | Class + Instances | 1 + ~40 |
| 5 | `weapons-melee.js` | 155 | `resources/data_classes/weapon_data.gd` + `resources/weapons/melee/*.tres` | Class + Instances | 1 + 10 |
| 6 | `weapons-ranged.js` | 227 | `resources/weapons/ranged/*.tres` | Instances only | 15 |
| 7 | `weapons-magic.js` | 83 | `resources/weapons/magic/*.tres` | Instances only | 5 |
| 8 | `armor-types.js` | 280 | `resources/data_classes/armor_type_data.gd` + `resources/armor_types/*.tres` | Class + Instances | 1 + 8 |
| 9 | `armor-defense.js` | 448 | `resources/data_classes/armor_piece_data.gd` + `resources/data_classes/shield_data.gd` + `resources/armor/**/*.tres` | Classes + Instances | 2 + 89 |
| 10 | `weapon-armor-matrix.js` | 159 | `autoload/constants.gd` (WEAPON_ARMOR_MATRIX const) | Const dict | 0 (inline) |
| 11 | `npcs.js` | 875 | `resources/data_classes/npc_data.gd` + `resources/data_classes/npc_narrative_data.gd` + `resources/npcs/*.tres` | Classes + Instances | 2 + ~15 |
| 12 | `quests.js` | 390 | `resources/data_classes/quest_data.gd` + sub-resources + `resources/quests/*.tres` | Classes + Instances | 3 + ~15 |
| 13 | `bounties.js` | 602 | `resources/data_classes/bounty_data.gd` + sub-resources + `resources/bounties/*.tres` | Classes + Instances | 2 + ~20 |
| 14 | `crafting-data.js` | 1140 | `resources/data_classes/crafting_recipe_data.gd` + sub-resources + `resources/crafting/recipes/*.tres` | Classes + Instances | 2 + ~40 |
| 15 | `elements.js` | 186 | `resources/data_classes/element_data.gd` + `resources/elements/*.tres` | Class + Instances | 1 + 10 |
| 16 | `element-matrix.js` | 227 | `autoload/constants.gd` (ELEMENT_MATRIX const) | Const dict | 0 (inline) |
| 17 | `materials.js` | ~200 | `resources/data_classes/material_data.gd` + `resources/materials/*.tres` | Class + Instances | 1 + ~20 |
| 18 | `audio-definitions.js` | 1089 | `resources/data_classes/audio_def_data.gd` + `resources/audio/sfx/*.tres` | Class + Instances | 1 + ~50 |
| 19 | `music-tracks.js` | ~200 | `resources/data_classes/music_track_data.gd` + `resources/audio/music/*.tres` | Class + Instances | 1 + ~15 |
| 20 | `tileset-reference.js` | 363 | `resources/data_classes/tile_def_data.gd` + `resources/tilesets/*.tres` | Class + Instances | 1 + ~20 |
| 21 | `tileset-floors-1-2.js` | 312 | Merged into `resources/tilesets/*.tres` (floor-specific configs) | Instances | ~10 |
| 22 | `village-tile-states.js` | 356 | `resources/data_classes/village_tile_data.gd` + `resources/village_tiles/*.tres` | Class + Instances | 1 + ~15 |
| 23 | `room-themes.js` | 160 | `resources/data_classes/room_theme_data.gd` + `resources/room_themes/*.tres` | Class + Instances | 1 + ~8 |
| 24 | `core-data.js` | ~200 | `resources/data_classes/core_config_data.gd` + `resources/data_classes/core_boss_data.gd` + `resources/data_classes/boss_phase_data.gd` + `resources/core/*.tres` | Classes + Instances | 3 + 2 |
| 25 | `elder-dialogue.js` | ~200 | `resources/data_classes/elder_dialogue_data.gd` + `resources/npcs/dialogue/*.tres` | Class + Instances | 1 + ~10 |
| 26 | `lore-fragments.js` | ~150 | `resources/data_classes/lore_fragment_data.gd` + `resources/lore/*.tres` | Class + Instances | 1 + ~15 |
| 27 | `equipment-visuals.js` | ~150 | `resources/data_classes/equipment_visual_data.gd` + `resources/equipment_visuals/*.tres` | Class + Instances | 1 + ~30 |
| 28 | `quest-items.js` | 374 | Merged into `resources/items/quest_items/*.tres` using `ItemData` | Instances | ~15 |
| | | | `resources/data_classes/loot_entry_data.gd` | Sub-resource class | 1 |
| | | | `autoload/data_registry.gd` | Autoload singleton | 1 |

**Totals:**
- Resource class `.gd` files: **~32**
- Instance `.tres` files: **~530**
- Autoload additions: **1** (data_registry.gd)
- Const matrices added to constants.gd: **2** (weapon-armor, element)

---

## Section 6: String-to-Enum Mapping Tables

Use these exact mappings when converting JS string values to Godot enum integers in .tres files.

### Element
| JS String | Enum Value | Int |
|-----------|-----------|-----|
| `'fire'` | `Element.FIRE` | 1 |
| `'ice'` | `Element.ICE` | 2 |
| `'water'` | `Element.WATER` | 3 |
| `'earth'` | `Element.EARTH` | 4 |
| `'nature'` | `Element.NATURE` | 5 |
| `'death'` | `Element.DEATH` | 6 |
| `'arcane'` | `Element.ARCANE` | 7 |
| `'dark'` | `Element.DARK` | 8 |
| `'holy'` | `Element.HOLY` | 9 |
| `'physical'` | `Element.PHYSICAL` | 10 |
| `null` / missing | `Element.NONE` | 0 |

### Rarity
| JS String | Enum Value | Int |
|-----------|-----------|-----|
| `'common'` | `Rarity.COMMON` | 0 |
| `'uncommon'` | `Rarity.UNCOMMON` | 1 |
| `'rare'` | `Rarity.RARE` | 2 |
| `'epic'` | `Rarity.EPIC` | 3 |
| `'legendary'` | `Rarity.LEGENDARY` | 4 |

### DamageType
| JS String | Enum Value | Int |
|-----------|-----------|-----|
| `'blade'` | `DamageType.BLADE` | 0 |
| `'blunt'` | `DamageType.BLUNT` | 1 |
| `'pierce'` | `DamageType.PIERCE` | 2 |
| `'magic'` | `DamageType.MAGIC` | 3 |

### ArmorType
| JS String | Enum Value | Int |
|-----------|-----------|-----|
| `'unarmored'` | `ArmorType.UNARMORED` | 0 |
| `'cloth'` | `ArmorType.CLOTH` | 1 |
| `'hide'` | `ArmorType.HIDE` | 2 |
| `'scaled'` | `ArmorType.SCALED` | 3 |
| `'armored'` | `ArmorType.ARMORED` | 4 |
| `'stone'` | `ArmorType.STONE` | 5 |
| `'bone'` | `ArmorType.BONE` | 6 |
| `'ethereal'` | `ArmorType.ETHEREAL` | 7 |

### WeaponType
| JS String | Enum Value | Int |
|-----------|-----------|-----|
| `'sword'` | `WeaponType.SWORD` | 0 |
| `'mace'` | `WeaponType.MACE` | 1 |
| `'polearm'` | `WeaponType.POLEARM` | 2 |
| `'bow'` | `WeaponType.BOW` | 3 |
| `'dagger'` | `WeaponType.DAGGER` | 4 |
| `'staff'` | `WeaponType.STAFF` | 5 |

### AttackCategory
| JS String | Enum Value | Int |
|-----------|-----------|-----|
| `'melee'` | `AttackCategory.MELEE` | 0 |
| `'ranged'` | `AttackCategory.RANGED` | 1 |
| `'magic'` | `AttackCategory.MAGIC` | 2 |
| `'area'` | `AttackCategory.AREA` | 3 |
| `'summon'` | `AttackCategory.SUMMON` | 4 |
| `'buff'` | `AttackCategory.BUFF` | 5 |
| `'debuff'` | `AttackCategory.DEBUFF` | 6 |
| `'movement'` | `AttackCategory.MOVEMENT` | 7 |
| `'utility'` | `AttackCategory.UTILITY` | 8 |

### AoeShape
| JS String | Enum Value | Int |
|-----------|-----------|-----|
| `null` / missing | `AoeShape.NONE` | 0 |
| `'arc'` | `AoeShape.ARC` | 1 |
| `'circle'` | `AoeShape.CIRCLE` | 2 |
| `'line'` | `AoeShape.LINE` | 3 |
| `'cone'` | `AoeShape.CONE` | 4 |
| `'cross'` | `AoeShape.CROSS` | 5 |
| `'ring'` | `AoeShape.RING` | 6 |

### AttackType
| JS String | Enum Value | Int |
|-----------|-----------|-----|
| `'physical'` | `AttackType.PHYSICAL` | 0 |
| `'magic'` | `AttackType.MAGIC` | 1 |

### EquipSlot
| JS String | Enum Value | Int |
|-----------|-----------|-----|
| `'MAIN'` | `EquipSlot.MAIN` | 0 |
| `'OFF'` | `EquipSlot.OFF` | 1 |
| `'HEAD'` | `EquipSlot.HEAD` | 2 |
| `'CHEST'` | `EquipSlot.CHEST` | 3 |
| `'LEGS'` | `EquipSlot.LEGS` | 4 |
| `'FEET'` | `EquipSlot.FEET` | 5 |

---

## Section 7: Unit Conversion Rules

| JS Unit | Godot Unit | Conversion |
|---------|-----------|------------|
| Milliseconds (ms) | Seconds (float) | **Divide by 1000** |
| Hex color string (`'#ff6b35'`) | `Color` | `Color("ff6b35")` or enum int in .tres |
| JS `null` | Godot default | `-1` for int, `""` for String, `null` for Resource |
| Degrees (already degrees) | Degrees (float) | Direct (no conversion needed) |
| Tile distance (float) | Tile distance (float) | Direct |
| Percentage as decimal (0.25 = 25%) | Float (0.25) | Direct |

**Critical ms-to-seconds fields by file:**
- `monster-tiers.js`: `reactionDelay`, `windupDuration`, `attackDuration`, `recoveryDuration`, `pauseDurationMin`, `pauseDurationMax`, `evasionCooldown`, `trackingCutoff`, `shoutDelay` -- **all divide by 1000**
- `ability-repository.js`: `telegraphTime`, `cooldown`, `recoveryTime`, `hitDelay`, `castTime`, `stunDuration`, `dotDuration`, `slowDuration` -- **all divide by 1000**
- Item durations in `items.js`: already in seconds (e.g., `duration: 60`) -- **no conversion needed**

---

## Section 8: Recommended Execution Order

1. **Create all enum definitions** in `autoload/constants.gd` (Section 2)
2. **Create all Resource class `.gd` files** in `resources/data_classes/` (Section 3)
3. **Create the `data_registry.gd` autoload** (Section 4)
4. **Create matrix constants** (weapon-armor, element) in `constants.gd` (Sections 3.8, 3.9)
5. **Generate `.tres` instance files** in priority order:
   - Elements (10 files) -- no dependencies
   - Armor types (8 files) -- no dependencies
   - Materials (20 files) -- no dependencies
   - Items / consumables (40 files) -- no dependencies
   - Weapons (30 files) -- no dependencies
   - Armor pieces + shields (89 files) -- depends on armor types
   - Monsters (25 files) -- depends on elements, armor types
   - Monster tiers (5 files) -- no dependencies
   - Abilities (50+ files) -- no dependencies
   - NPCs (15 files) -- no dependencies
   - Quests (15 files) -- depends on NPCs, items
   - Bounties (20 files) -- depends on monsters
   - Crafting recipes (40 files) -- depends on materials, items, weapons
   - Audio / Music (~65 files) -- no dependencies
   - Tilesets / Village tiles / Room themes (~43 files) -- no dependencies
   - Lore / Equipment visuals / Core data (~57 files) -- no dependencies
6. **Register `DataRegistry` in `project.godot` autoload list**
7. **Run verification** (Section 9)

---

## Section 9: Verification Checklist

Run these checks after all files are created:

### 9.1 File Count Verification
- [ ] `resources/data_classes/` contains exactly 32 `.gd` files
- [ ] `resources/monsters/` contains ~25 `.tres` files
- [ ] `resources/monsters/tiers/` contains exactly 5 `.tres` files
- [ ] `resources/items/consumables/` + `resources/items/quest_items/` contains ~40 `.tres` files
- [ ] `resources/weapons/` (all subdirs) contains exactly 30 `.tres` files
- [ ] `resources/armor/pieces/` contains exactly 84 `.tres` files (80 generated + 4 legendary)
- [ ] `resources/armor/shields/` contains exactly 5 `.tres` files
- [ ] `resources/armor_types/` contains exactly 8 `.tres` files
- [ ] `resources/abilities/` (all subdirs) contains ~50 `.tres` files
- [ ] `resources/elements/` contains exactly 10 `.tres` files
- [ ] `resources/npcs/` contains ~15 `.tres` files
- [ ] `resources/quests/` contains ~15 `.tres` files
- [ ] `resources/bounties/` contains ~20 `.tres` files
- [ ] `resources/crafting/recipes/` contains ~40 `.tres` files
- [ ] `resources/materials/` contains ~20 `.tres` files

### 9.2 GDScript Load Verification
Create a test script and run it in the Godot editor:
```gdscript
# test_data_layer.gd (attach to any Node, run once)
extends Node

func _ready() -> void:
    # Test 1: DataRegistry loaded
    assert(DataRegistry.monsters.size() > 0, "No monsters loaded")
    assert(DataRegistry.weapons.size() == 30, "Expected 30 weapons, got %d" % DataRegistry.weapons.size())
    assert(DataRegistry.armor_pieces.size() >= 84, "Expected 84+ armor, got %d" % DataRegistry.armor_pieces.size())

    # Test 2: Specific monster lookup
    var slime: MonsterData = DataRegistry.get_monster("magma_slime")
    assert(slime != null, "Magma Slime not found")
    assert(slime.hp == 30, "Magma Slime HP should be 30")
    assert(slime.element == Constants.Element.FIRE, "Magma Slime element should be FIRE")
    assert(slime.loot.size() == 3, "Magma Slime should have 3 loot entries")

    # Test 3: Weapon lookup
    var sword: WeaponData = DataRegistry.get_weapon("rusty_sword")
    assert(sword != null, "Rusty Sword not found")
    assert(sword.damage == 7, "Rusty Sword damage should be 7")
    assert(sword.weapon_type == Constants.WeaponType.SWORD, "Should be SWORD type")

    # Test 4: Weapon-armor matrix
    var mod: float = Constants.get_weapon_armor_modifier(
        Constants.DamageType.BLADE, Constants.ArmorType.UNARMORED)
    assert(mod == 1.3, "Blade vs Unarmored should be 1.3")

    var mod2: float = Constants.get_weapon_armor_modifier(
        Constants.DamageType.BLADE, Constants.ArmorType.ARMORED)
    assert(mod2 == 0.7, "Blade vs Armored should be 0.7")

    # Test 5: Element matrix
    var elem_mod: float = Constants.get_element_modifier(
        Constants.Element.FIRE, Constants.Element.ICE)
    assert(elem_mod == 0.3, "Fire vs Ice should be +0.3")

    var elem_mod2: float = Constants.get_element_modifier(
        Constants.Element.FIRE, Constants.Element.WATER)
    assert(elem_mod2 == -0.3, "Fire vs Water should be -0.3")

    # Test 6: Armor generation correctness
    # cloth_common_head: defense = round(4 * 0.5) = 2, hp = round(3 * 0.3) = 1
    var cloth_head: ArmorPieceData = DataRegistry.armor_pieces.get("cloth_common_head")
    assert(cloth_head != null, "cloth_common_head not found")
    assert(cloth_head.defense == 2, "Cloth common head defense should be 2")
    assert(cloth_head.hp_bonus == 1, "Cloth common head HP should be 1")

    # Test 7: Tier data
    var tier3: MonsterTierData = DataRegistry.get_monster_tier(Constants.MonsterTier.TIER_3)
    assert(tier3 != null, "Tier 3 data not found")
    assert(tier3.sight_range == 3.0, "Tier 3 sight range should be 3.0")

    # Test 8: Quest data
    var quest: QuestData = DataRegistry.get_quest("intro_first_dive")
    assert(quest != null, "intro_first_dive quest not found")
    assert(quest.objectives.size() > 0, "Quest should have objectives")

    print("[DataLayerTest] All tests passed!")
    queue_free()
```

### 9.3 Data Integrity Checks
- [ ] Every .tres file opens without errors in the Godot Inspector
- [ ] Every `id` field is unique within its collection
- [ ] All enum int values in .tres files match the expected enum entries
- [ ] All ms-to-seconds conversions applied (no values > 10 for timing fields)
- [ ] Armor generation produces identical stats to JS (spot-check 5 pieces)
- [ ] Weapon-armor matrix returns correct multipliers for all 32 (4x8) combinations
- [ ] Element matrix returns correct modifiers for key matchups (fire vs ice = +0.3, fire vs water = -0.3)
- [ ] `DataRegistry._ready()` completes without errors in the Output panel
- [ ] No `push_warning` messages from DataRegistry about missing IDs

---

## Section 10: Conversion Script (Optional Automation)

For generating the ~530 .tres files, a Python script can read the JS source and emit .tres text. Run this from the project root.

**Usage pattern** (pseudocode):
```python
# tools/generate_tres.py
# 1. Parse JS files using regex to extract object literals
# 2. Map string enum values to int using the tables in Section 6
# 3. Apply ms->seconds conversion per Section 7
# 4. Write .tres files with correct [gd_resource] headers

# Example for monsters:
for key, monster in parsed_monsters.items():
    id = to_snake_case(key)
    element_int = ELEMENT_MAP[monster['element']]
    # ... map all fields ...
    write_tres(f"resources/monsters/{id}.tres", fields)
```

Key concerns for the automation script:
- `.tres` format requires correct `load_steps` count (1 + number of sub_resources + ext_resources)
- Sub-resources (loot entries, AoE shapes) need unique `id` strings within the file
- Enum values are stored as **plain integers** in .tres files
- Strings are quoted, booleans are `true`/`false` (lowercase)
- Arrays use `[item1, item2]` syntax; Resource arrays use `[SubResource("id")]`
- Colors in .tres use `Color(r, g, b, a)` with 0-1 floats, NOT hex strings

---

## Appendix A: Naming Convention Quick Reference

| JS Pattern | Godot Pattern | Example |
|-----------|--------------|---------|
| `camelCase` key | `snake_case` property | `attackSpeed` -> `attack_speed` |
| `UPPER_CASE` const | `UPPER_CASE` const | `MONSTER_DATA` -> `MONSTER_DATA` |
| Display name as dict key | Separate `id` + `display_name` | `'Magma Slime'` -> `id="magma_slime"`, `display_name="Magma Slime"` |
| Nested `{stats: {str: 2}}` | Flattened `str_bonus = 2` | Avoid deep nesting in Resources |
| `null` | Default value or `-1` | `prerequisite: null` -> `prerequisite = ""` |
| `window.X = X` | Not needed | Godot uses `class_name` registration |

## Appendix B: Quick Stat Spot-Check Table

Use these known values to verify conversions are correct:

| Resource | Field | Expected Value |
|---------|-------|---------------|
| `magma_slime.tres` | `hp` | `30` |
| `magma_slime.tres` | `element` | `1` (FIRE) |
| `magma_slime.tres` | `armor_type` | `0` (UNARMORED) |
| `magma_slime.tres` | `damage_type` | `1` (BLUNT) |
| `rusty_sword.tres` | `damage` | `7` |
| `rusty_sword.tres` | `weapon_type` | `0` (SWORD) |
| `rusty_sword.tres` | `damage_type` | `0` (BLADE) |
| `conduit_of_ruin.tres` | `damage` | `25` |
| `conduit_of_ruin.tres` | `weapon_type` | `5` (STAFF) |
| `worldstone_barrier.tres` | `defense` | `30` |
| `cloth_common_head` | `defense` | `2` (round(4*0.5)) |
| `cloth_common_head` | `hp_bonus` | `1` (round(3*0.3)) |
| `armored_epic_chest` | `defense` | `28` (round(28*1.0)) |
| `armored_epic_chest` | `hp_bonus` | `25` (round(25*1.0)) |
| `stone_rare_legs` | `defense` | `18` (round(16*1.1)) |
| `health_potion.tres` | `effect_value` | `60.0` |
| `health_potion.tres` | `rarity` | `1` (UNCOMMON) |
| `melee_swing.tres` | `telegraph_time` | `0.6` (600ms/1000) |
| `melee_swing.tres` | `cooldown` | `1.6` (1600ms/1000) |
| WEAPON_ARMOR_MATRIX blade vs unarmored | multiplier | `1.3` |
| WEAPON_ARMOR_MATRIX blunt vs ethereal | multiplier | `0.7` |
| ELEMENT_MATRIX fire vs ice | modifier | `0.3` |
| ELEMENT_MATRIX fire vs water | modifier | `-0.3` |
| ELEMENT_MATRIX holy vs dark | modifier | `0.3` |
