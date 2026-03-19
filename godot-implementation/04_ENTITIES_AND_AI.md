# Work Package 04: Entities and AI

## Objective
Port all entity types (Player, Enemy, NPC, Boss) and the enemy AI finite-state machine from JS to Godot 4.x scenes and scripts. Establish a base Entity class hierarchy, convert the 5-state AI FSM, monster social/group system, enemy ability system, boss phase framework, and bark system.

## Dependencies
- **WP01** -- autoloads (`Constants`, `EventBus`, `GameManager`)
- **WP02** -- data resources (`MonsterData`, `ItemData`, `SkillData`, `AbilityData`, `NpcData`)
- **WP03** -- core systems (movement, vision, inventory, stamina, hazards)

---

## Source File Inventory

### Entities (`js/entities/`)
| File | Lines | Description |
|------|-------|-------------|
| `player.js` | 606 | Player creation, 6 equipment slots, stat calc, torch, death |
| `enemy.js` | 519 | Enemy entity, vision/detection, room queries, alerting |
| `npc.js` | 1398 | Village NPCs, dialogue trees, shops, quest giving, escort |
| `boss.js` | 2472 | Generic boss framework with phases, attack components, telegraphs |
| `core-boss.js` | 852 | The Primordial final boss with 3 phases, summons |
| `malphas-boss.js` | 703 | Malphas stationary boss with vents, minions, hazards |

### AI Systems (`js/systems/`)
| File | Lines | Description |
|------|-------|-------------|
| `enemy-ai.js` | 2223 | 5-state FSM (EnemyAI class), AIManager, EncirclementSystem |
| `monster-social-system.js` | 979 | GroupSystem -- pack/swarm/command, morale, leader selection |
| `monster-animations.js` | 375 | Monster sprite animation configuration and lookup |
| `enemy-ability-system.js` | 3986 | Ability assignment, cooldowns, telegraphs, execution |
| `bark-system.js` | 327 | NPC speech bubbles with proximity triggers |

---

## Godot Output Files

| Godot File | Source | Purpose |
|------------|--------|---------|
| `scenes/entities/entity.gd` | Base class | Abstract base for all entities |
| `scenes/entities/player/player.gd` | `player.js` | Player script |
| `scenes/entities/player/player.tscn` | -- | Player scene |
| `scenes/entities/enemy/enemy.gd` | `enemy.js` | Enemy script |
| `scenes/entities/enemy/enemy.tscn` | -- | Enemy scene |
| `scenes/entities/enemy/enemy_ai.gd` | `enemy-ai.js` | AI FSM component |
| `scenes/entities/enemy/enemy_ability.gd` | `enemy-ability-system.js` | Ability component |
| `scenes/entities/npc/npc.gd` | `npc.js` | NPC script |
| `scenes/entities/npc/npc.tscn` | -- | NPC scene |
| `scenes/entities/boss/boss.gd` | `boss.js` | Boss base script |
| `scenes/entities/boss/boss.tscn` | -- | Boss scene |
| `scenes/entities/boss/core_boss.gd` | `core-boss.js` | The Primordial |
| `scenes/entities/boss/malphas_boss.gd` | `malphas-boss.js` | Malphas |
| `scripts/systems/group_system.gd` | `monster-social-system.js` | Pack/swarm coordination |
| `scripts/systems/bark_system.gd` | `bark-system.js` | NPC speech bubbles |

---

## Part 1: Base Entity Class

### Source Pattern
JS uses plain object literals with `gridX/gridY`, `displayX/displayY`, `hp/maxHp`, `facing`, and `statusEffects`. There is no shared prototype -- each entity type repeats common fields.

### Godot Target: `entity.gd`

```gdscript
## scenes/entities/entity.gd
## Abstract base class for all game entities (Player, Enemy, NPC, Boss).
class_name Entity
extends CharacterBody2D

# --- Signals ---
signal health_changed(current: int, maximum: int)
signal died
signal status_effect_applied(effect: StringName)
signal status_effect_removed(effect: StringName)
signal facing_changed(new_facing: StringName)

# --- Enums ---
enum Facing { UP, DOWN, LEFT, RIGHT }

# --- Identity ---
@export var entity_name: StringName = &""
@export var entity_id: StringName = &""

# --- Position ---
## Grid position (integer tile coords). Movement system snaps to this.
var grid_position: Vector2i = Vector2i.ZERO
## Facing direction
var facing: Facing = Facing.DOWN

# --- Stats ---
@export var max_hp: int = 100
var hp: int = 100:
    set(value):
        hp = clampi(value, 0, max_hp)
        health_changed.emit(hp, max_hp)
        if hp <= 0 and not _is_dead:
            _is_dead = true
            died.emit()

@export var base_defense: int = 0
@export var element: StringName = &"physical"

# --- Status Effects ---
## Array of active StatusEffect resources
var status_effects: Array[Resource] = []
var is_stunned: bool = false
var is_frozen: bool = false
var is_rooted: bool = false
var is_invisible: bool = false

# --- Internal ---
var _is_dead: bool = false

# --- Node References (set by scene) ---
@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var collision: CollisionShape2D = $CollisionShape2D

# --- Virtual Methods ---
func _ready() -> void:
    hp = max_hp
    grid_position = Vector2i(
        roundi(global_position.x / Constants.BASE_TILE_SIZE),
        roundi(global_position.y / Constants.BASE_TILE_SIZE)
    )

func take_damage(amount: int, damage_element: StringName = &"physical") -> int:
    if _is_dead:
        return 0
    var actual := maxi(1, amount - base_defense)
    hp -= actual
    return actual

func heal(amount: int) -> int:
    var before := hp
    hp = mini(hp + amount, max_hp)
    return hp - before

func set_facing(new_facing: Facing) -> void:
    if facing != new_facing:
        facing = new_facing
        facing_changed.emit(Facing.keys()[facing].to_lower())

func snap_to_grid() -> void:
    global_position = Vector2(grid_position) * Constants.BASE_TILE_SIZE
```

### Scene Tree Template (shared by all entities)
```
Entity (CharacterBody2D)
 +-- AnimatedSprite2D
 +-- CollisionShape2D (RectangleShape2D)
 +-- DetectionArea (Area2D)          # Perception radius
 |    +-- CollisionShape2D (CircleShape2D)
 +-- HitboxArea (Area2D)             # Hittable area for combat
 |    +-- CollisionShape2D (RectangleShape2D)
```

---

## Part 2: Player Entity

### Source: `player.js` -- `createPlayer()`

Key properties to port:
```
Position:   gridX, gridY, displayX, displayY, facing
Movement:   isMoving, moveProgress, moveSpeed (4 tiles/s), targetGridX/Y
Stats:      stats.STR/AGI/INT/STA (all base 10)
Resources:  hp (100), maxHp (100), stamina (100), maxStamina (100),
            mp (100), maxMp (100), manaRegen (5)
Combat:     pDef, mDef, critChance (5%), dodgeChance (0%), element,
            combat.attackSpeed (1.0), combat.attackRange (1),
            combat.isInCombat, combat.currentTarget
Equipment:  equipped { HEAD, CHEST, LEGS, FEET, MAIN, OFF }
Inventory:  inventory[] (array of item dicts)
Abilities:  abilities[4] -- slot 0 always Unarmed Strike
GCD:        gcd.active, gcd.remaining, gcd.duration (0.5s)
Cooldowns:  actionCooldowns { baseAttack, skillAttack, consumable3, consumable4 }
Ammo:       ammo.arrows, ammo.bolts
Status:     statusEffects[], isInvisible, isStunned, isFrozen, isRooted, isSilenced
Flags:      isDead, isTorchOn (true)
```

### Godot: `player.gd`

```gdscript
## scenes/entities/player/player.gd
class_name Player
extends Entity

# --- Signals ---
signal equipment_changed(slot: StringName)
signal stats_recalculated
signal torch_toggled(is_on: bool)
signal gold_changed(amount: int)
signal stamina_changed(current: float, maximum: float)
signal mana_changed(current: float, maximum: float)

# --- Equipment Slot Enum ---
enum EquipSlot { HEAD, CHEST, LEGS, FEET, MAIN, OFF }

# --- Base Attributes ---
var stats: Dictionary = {
    &"STR": 10,
    &"AGI": 10,
    &"INT": 10,
    &"STA": 10
}

# --- Resources ---
@export var max_stamina: float = 100.0
var stamina: float = 100.0
@export var max_mp: float = 100.0
var mp: float = 100.0
var mana_regen: float = 5.0  # per second

# --- Derived Combat Stats ---
var p_def: int = 0
var m_def: int = 0
var crit_chance: float = 5.0
var dodge_chance: float = 0.0

# --- Equipment ---
## Keys: EquipSlot enum values. Values: ItemData resource or null.
var equipped: Dictionary = {}

# --- Inventory ---
## Managed via WP03 InventorySystem; player holds a reference.
var inventory: Array[Resource] = []

# --- Abilities ---
## 4 action bar slots. Slot 0 = unarmed fallback.
var abilities: Array[Variant] = [null, null, null, null]

# --- Combat State ---
var is_in_combat: bool = false
var current_target: Node = null
var attack_cooldown: float = 0.0
var attack_speed: float = 1.0
var attack_range: int = 1

# --- GCD ---
var gcd_active: bool = false
var gcd_remaining: float = 0.0
const GCD_DURATION: float = 0.5

# --- Action Cooldowns ---
var action_cooldowns: Dictionary = {
    &"base_attack": 0.0,
    &"skill_attack": 0.0,
    &"consumable_3": 0.0,
    &"consumable_4": 0.0,
}

# --- Ammo ---
var ammo_arrows: int = 0
var ammo_bolts: int = 0

# --- Consumable Hotkeys ---
var assigned_consumables: Dictionary = {
    &"slot_3": null,  # ItemData id
    &"slot_4": null,
}

# --- Torch ---
var is_torch_on: bool = true

# --- Gold ---
var gold: int = 50

# --- Stat Modifier Stacks (WP05 integration) ---
## Dictionary of StringName -> StatModifierStack.
## Populated by boon/effect systems. Keys match JS statStacks.
var stat_stacks: Dictionary = {}

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
    super._ready()
    _init_equipment_slots()
    _init_default_ability()
    recalculate_stats()

func _init_equipment_slots() -> void:
    for slot in EquipSlot.values():
        equipped[slot] = null

func _init_default_ability() -> void:
    # Slot 0: Unarmed Strike (always present)
    abilities[0] = {
        "name": "Unarmed Strike",
        "cost": 0,
        "type": "stamina",
        "base_dmg": 5,
        "scaling": "STR",
        "accuracy": 85,
        "element": "physical",
        "damage_type": "blunt",
    }

func _process(delta: float) -> void:
    _update_cooldowns(delta)
    _update_mana_regen(delta)

func _update_cooldowns(delta: float) -> void:
    if gcd_active:
        gcd_remaining -= delta
        if gcd_remaining <= 0.0:
            gcd_active = false
            gcd_remaining = 0.0
    for key in action_cooldowns:
        if action_cooldowns[key] > 0.0:
            action_cooldowns[key] = maxf(0.0, action_cooldowns[key] - delta)
    if attack_cooldown > 0.0:
        attack_cooldown = maxf(0.0, attack_cooldown - delta)

func _update_mana_regen(delta: float) -> void:
    if mp < max_mp:
        mp = minf(mp + mana_regen * delta, max_mp)
        mana_changed.emit(mp, max_mp)

# -----------------------------------------------------------------
# Equipment
# -----------------------------------------------------------------

func equip_item(item: Resource, from_index: int) -> bool:
    var slot: int = _get_equip_slot(item)
    if slot == -1:
        return false
    # Unequip current
    var current: Resource = equipped[slot]
    if current != null:
        inventory.append(current)
    equipped[slot] = item
    # Remove from inventory
    if from_index >= 0 and from_index < inventory.size():
        inventory.remove_at(from_index)
    recalculate_stats()
    equipment_changed.emit(EquipSlot.keys()[slot])
    return true

func unequip_item(slot: int) -> bool:
    if equipped.get(slot) == null:
        return false
    inventory.append(equipped[slot])
    equipped[slot] = null
    recalculate_stats()
    equipment_changed.emit(EquipSlot.keys()[slot])
    return true

func _get_equip_slot(item: Resource) -> int:
    # Map item.slot string to EquipSlot enum
    var slot_map := {
        "HEAD": EquipSlot.HEAD, "CHEST": EquipSlot.CHEST,
        "LEGS": EquipSlot.LEGS, "FEET": EquipSlot.FEET,
        "MAIN": EquipSlot.MAIN, "OFF": EquipSlot.OFF,
    }
    var slot_name: String = item.get("slot") if item.has_method("get") else ""
    return slot_map.get(slot_name, -1)

# -----------------------------------------------------------------
# Stat Recalculation
# -----------------------------------------------------------------
## Port of JS recalculatePlayerStats().
## Sums equipment bonuses -> derives maxHp, mana, crit, dodge, etc.

func recalculate_stats() -> void:
    var bonus_str := 0
    var bonus_agi := 0
    var bonus_int := 0
    var bonus_p_def := 0
    var bonus_m_def := 0
    var gear_flat_hp := 0

    for slot in EquipSlot.values():
        var item: Resource = equipped[slot]
        if item == null:
            continue
        bonus_str += item.get(&"stat_str") if item.get(&"stat_str") else 0
        bonus_agi += item.get(&"stat_agi") if item.get(&"stat_agi") else 0
        bonus_int += item.get(&"stat_int") if item.get(&"stat_int") else 0
        bonus_p_def += item.get(&"p_def") if item.get(&"p_def") else 0
        bonus_m_def += item.get(&"m_def") if item.get(&"m_def") else 0
        gear_flat_hp += item.get(&"flat_hp") if item.get(&"flat_hp") else 0

    # HP = 100 base + vitality bonus + gear flat HP
    var base_hp_val: int = Constants.PLAYER_BASE_HP if "PLAYER_BASE_HP" in Constants else 100
    max_hp = base_hp_val + gear_flat_hp
    hp = mini(hp, max_hp)

    # Mana: fixed at 100, regen scales with INT
    var total_int := stats[&"INT"] + bonus_int
    max_mp = 100.0
    mana_regen = 5.0 * (1.0 + total_int / 100.0)

    # Defense
    p_def = bonus_p_def
    m_def = bonus_m_def

    # Crit (base 5% + 0.3% per AGI over 10)
    var total_agi := stats[&"AGI"] + bonus_agi
    crit_chance = 5.0 + maxf(0.0, (total_agi - 10) * 0.3)

    # Dodge (0.2% per AGI over 10)
    dodge_chance = maxf(0.0, (total_agi - 10) * 0.2)

    # Weapon-derived stats
    var weapon: Resource = equipped[EquipSlot.MAIN]
    if weapon:
        attack_speed = weapon.get(&"attack_speed") if weapon.get(&"attack_speed") else 1.0
        attack_range = weapon.get(&"attack_range") if weapon.get(&"attack_range") else 1
        element = weapon.get(&"element") if weapon.get(&"element") else &"physical"
    else:
        attack_speed = 1.0
        attack_range = 1
        element = &"physical"

    stats_recalculated.emit()

# -----------------------------------------------------------------
# Torch
# -----------------------------------------------------------------

func toggle_torch() -> void:
    is_torch_on = not is_torch_on
    torch_toggled.emit(is_torch_on)
    EventBus.emit_signal("torch_toggled", is_torch_on)

# -----------------------------------------------------------------
# Death / Reset (Permadeath)
# -----------------------------------------------------------------

func handle_death() -> void:
    _is_dead = true
    EventBus.emit_signal("player_died")

func reset() -> Player:
    return Player.new()
```

### Player Scene Tree
```
Player (CharacterBody2D) [player.gd]
 +-- AnimatedSprite2D            # Layered bodypart sprites
 +-- CollisionShape2D            # Physics body
 +-- DetectionArea (Area2D)      # Not used for player, reserved
 |    +-- CollisionShape2D
 +-- HitboxArea (Area2D)         # Where enemies hit the player
 |    +-- CollisionShape2D
 +-- Camera2D                    # Follows player
 +-- TorchLight (PointLight2D)   # Togglable torch visual
```

---

## Part 3: Enemy Entity

### Source: `enemy.js`

Key systems:
- `canSeePlayer()` -- sight range, torch stealth (0.25x when off), vision cone, same-room check, LOS
- `isInVisionCone()` -- facing-based 90-degree cone
- `hasLineOfSight()` -- Bresenham's algorithm
- `moveEnemy()` -- legacy fallback when AI not attached
- `isValidEnemyMove()` -- tile, room, decoration, hazard, other-enemy checks
- Query helpers: `getEnemiesInRadius()`, `getClosestEnemyTo()`, `getEnemiesInRoom()`
- Alerting: `alertEnemiesInRoom()`, `alertEnemiesBySound()`
- Element: `getEnemyElementModifier()`

### Godot: `enemy.gd`

```gdscript
## scenes/entities/enemy/enemy.gd
class_name Enemy
extends Entity

# --- Signals ---
signal alerted(source: Node, target_pos: Vector2i)
signal entered_combat(target: Node)
signal left_combat
signal ability_used(ability_id: StringName)

# --- Monster Data (from WP02 Resource) ---
@export var monster_data: Resource  # MonsterData .tres

# --- Perception ---
@export var sight_range: float = 6.0
@export var hearing_range: float = 4.0
var perception_cone_angle: float = 90.0  # degrees

# --- Combat ---
var tier: StringName = &"TIER_3"
var is_in_combat: bool = false
var current_target: Node = null
var combat_attack_range: int = 1
var combat_attack_speed: float = 1.0
var base_damage: int = 10

# --- Room Assignment ---
var assigned_room: Variant = null  # Room data dict or null
var spawn_position: Vector2i = Vector2i.ZERO

# --- Group/Social ---
var group_id: StringName = &""
var is_leader: bool = false
var is_enraged: bool = false
var is_feared: bool = false
var fear_duration: float = 0.0

# --- Loot ---
var loot_table_id: StringName = &""

# --- Child Components ---
@onready var ai: EnemyAI = $EnemyAI
@onready var detection_area: Area2D = $DetectionArea
@onready var ability_component: EnemyAbility = $EnemyAbility

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
    super._ready()
    spawn_position = grid_position
    _load_from_monster_data()
    detection_area.body_entered.connect(_on_detection_body_entered)

func _load_from_monster_data() -> void:
    if monster_data == null:
        return
    entity_name = monster_data.get(&"monster_name")
    max_hp = monster_data.get(&"hp")
    hp = max_hp
    base_damage = monster_data.get(&"damage")
    base_defense = monster_data.get(&"defense")
    element = monster_data.get(&"element")
    tier = monster_data.get(&"tier")
    sight_range = monster_data.get(&"sight_range")
    hearing_range = monster_data.get(&"hearing_range")
    combat_attack_range = monster_data.get(&"attack_range")
    combat_attack_speed = monster_data.get(&"attack_speed")
    loot_table_id = monster_data.get(&"loot_table")

# -----------------------------------------------------------------
# Perception  (port of canSeePlayer, isInVisionCone, hasLineOfSight)
# -----------------------------------------------------------------

func can_see_target(target: Node) -> bool:
    if target == null or target.get(&"_is_dead"):
        return false
    if target.get(&"is_invisible"):
        return false

    var effective_range := sight_range
    # Torch stealth: if player torch off and not in light source, 0.25x range
    var torch_on: bool = target.get(&"is_torch_on") if target.has_method("get") else true
    if not torch_on:
        effective_range *= 0.25

    var dist := _grid_distance_to(target)
    if dist > effective_range:
        return false

    # Vision cone check (skip if very close)
    if dist > 2.0 and not _is_in_vision_cone(target):
        return false

    # Line of sight via raycast (WP03 VisionSystem)
    if not _has_line_of_sight(target):
        return false

    return true

func can_hear_sound(source_pos: Vector2i, volume: float) -> bool:
    var dist := _grid_distance_to_pos(source_pos)
    var effective_volume := volume - dist * 10.0
    return effective_volume > 0.0 and dist <= hearing_range

func _is_in_vision_cone(target: Node) -> bool:
    var to_target := Vector2(target.grid_position - grid_position)
    var facing_vec := _facing_to_vector()
    var angle := rad_to_deg(facing_vec.angle_to(to_target))
    return absf(angle) <= perception_cone_angle / 2.0

func _has_line_of_sight(target: Node) -> bool:
    # Use Godot RayCast2D or manual Bresenham on tile map
    # Delegate to WP03 VisionSystem.has_los(grid_position, target.grid_position)
    return true  # Placeholder

func _facing_to_vector() -> Vector2:
    match facing:
        Facing.UP:    return Vector2(0, -1)
        Facing.DOWN:  return Vector2(0, 1)
        Facing.LEFT:  return Vector2(-1, 0)
        Facing.RIGHT: return Vector2(1, 0)
    return Vector2(0, 1)

func _grid_distance_to(other: Node) -> float:
    return Vector2(grid_position).distance_to(Vector2(other.grid_position))

func _grid_distance_to_pos(pos: Vector2i) -> float:
    return Vector2(grid_position).distance_to(Vector2(pos))

# -----------------------------------------------------------------
# Alerting
# -----------------------------------------------------------------

func alert_nearby(target: Node, alert_type: StringName = &"sight") -> void:
    alerted.emit(self, target.grid_position if target else Vector2i.ZERO)
    EventBus.emit_signal("enemy_alerted", self, target, alert_type)

# -----------------------------------------------------------------
# Detection Area callback
# -----------------------------------------------------------------

func _on_detection_body_entered(body: Node2D) -> void:
    if body is Player and can_see_target(body):
        if ai:
            ai.on_target_detected(body)
```

### Enemy Scene Tree
```
Enemy (CharacterBody2D) [enemy.gd]
 +-- AnimatedSprite2D
 +-- CollisionShape2D
 +-- DetectionArea (Area2D)          # sight_range radius
 |    +-- CollisionShape2D (CircleShape2D, radius = sight_range * tile_size)
 +-- HitboxArea (Area2D)
 |    +-- CollisionShape2D
 +-- EnemyAI (Node) [enemy_ai.gd]   # AI FSM component
 +-- EnemyAbility (Node) [enemy_ability.gd]  # Ability component
 +-- TelegraphSprite (Sprite2D)      # Attack telegraph visual
```

---

## Part 4: Enemy AI -- 5-State FSM

### Source: `enemy-ai.js` -- `class EnemyAI`

The JS AI uses 5 top-level states with combat sub-behaviors. The original comment mentions 18 states, but the actual refactored implementation uses:

| State | Description |
|-------|-------------|
| `IDLE` | Patrol, wander, or stationary. Random movement within territory. |
| `ALERT` | Investigating noise/sighting. Reaction delay before transitioning. |
| `COMBAT` | Engaged with target. Sub-behaviors: melee approach, circling, ranged kiting, windup, retreat-to-ally, sacrifice. |
| `SEARCHING` | Lost sight of target, checking last known position. |
| `FOLLOWING` | Following a leader or commanded to a position. |

### AI Configuration Properties (from `_loadTierConfig`)
```
Perception:  sightRange, hearingRange, reactionDelay, memoryDuration, canSeeInDark
Movement:    baseSpeed, chaseSpeed, fleeSpeed, combatSpeed, wanderPattern,
             wanderRadius, pauseChance, pauseDurationMin, pauseDurationMax
Combat:      windupDuration, attackCooldownBase, tracksDuringWindup, trackingCutoff,
             canInterruptAttack, telegraphColor, circlingSpeed, attackArcAngle, knockbackOnHit
Defense:     fleeThreshold, evasionChance
Social:      canLead, commandRange, packCourage, packCourageThreshold, isSacrificial,
             canSacrificeMinions, sacrificeThreshold, sacrificeHeal, sacrificeDamageBuff,
             retreatHierarchy, shoutRange
Positioning: optimalRange, rangeTolerance, canKite, circlingEnabled, circlingRadius
Intelligence: searchBehavior, searchDuration, frustrationThreshold, frustrationBehavior
```

### Godot: `enemy_ai.gd`

```gdscript
## scenes/entities/enemy/enemy_ai.gd
## 5-state FSM attached as a child node on Enemy scenes.
class_name EnemyAI
extends Node

# --- Signals ---
signal state_changed(old_state: StringName, new_state: StringName)
signal attack_started(target: Node)
signal attack_executed(target: Node, damage: int)

# --- States ---
enum State { IDLE, ALERT, COMBAT, SEARCHING, FOLLOWING }

const STATE_NAMES: Dictionary = {
    State.IDLE: &"idle",
    State.ALERT: &"alert",
    State.COMBAT: &"combat",
    State.SEARCHING: &"searching",
    State.FOLLOWING: &"following",
}

# --- Current State ---
var current_state: State = State.IDLE
var previous_state: State = State.IDLE
var state_timer: float = 0.0

# --- Owner ---
var enemy: Enemy = null

# --- Target Tracking ---
var target: Node = null
var last_known_target_pos: Vector2i = Vector2i.ZERO
var follow_target: Node = null
var alert_source: Node = null

# --- Spawn / Territory ---
var spawn_position: Vector2i = Vector2i.ZERO
var territory_size: float = 20.0

# --- Timers ---
var attack_cooldown: float = 0.0
var special_cooldown: float = 0.0
var think_timer: float = 0.0
var reaction_timer: float = 0.0
var strafe_timer: float = 0.0
var stuck_check_timer: float = 0.0
var idle_sub_timer: float = 0.0

# --- Combat Sub-state ---
var windup_active: bool = false
var windup_timer: float = 0.0
var windup_target_pos: Vector2i = Vector2i.ZERO
var has_attack_token: bool = false
var circle_angle: float = 0.0

# --- Movement ---
var wander_target: Variant = null  # Vector2i or null
var last_position: Vector2i = Vector2i.ZERO
var frustration_counter: int = 0
var strafe_direction: int = 1  # 1 or -1

# --- Chase Hysteresis ---
var is_in_chase_mode: bool = false
const CHASE_HYSTERESIS: float = 0.5

# --- Retreat ---
var retreat_ally: Node = null
var sacrifice_target: Node = null
var has_sacrifice_buff: bool = false

# --- Config (loaded from MonsterData tier config) ---
var sight_range: float = 6.0
var hearing_range: float = 8.0
var reaction_delay: float = 0.15  # seconds
var memory_duration: float = 3.0  # seconds

var base_speed: float = 3.0
var chase_speed: float = 3.5
var flee_speed: float = 4.0
var combat_speed: float = 2.5
var wander_pattern: StringName = &"random"
var wander_radius: float = 4.0
var pause_chance: float = 0.25
var pause_duration_min: float = 1.0
var pause_duration_max: float = 3.0

var windup_duration: float = 0.6
var attack_cooldown_base: float = 2.5
var tracks_during_windup: bool = false
var tracking_cutoff: float = 0.1
var can_interrupt_attack: bool = true
var telegraph_color: Color = Color.RED
var circling_speed: float = 2.0
var circling_enabled: bool = true
var circling_radius: float = 1.5

var flee_threshold: float = 0.25
var evasion_chance: float = 0.0

var optimal_range: float = 1.0
var range_tolerance: float = 1.0
var can_kite: bool = false

var search_behavior: StringName = &"none"
var search_duration: float = 5.0
var frustration_threshold: int = 5
var frustration_behavior: StringName = &"give_up"

var can_lead: bool = false
var command_range: float = 0.0
var pack_courage: bool = false
var pack_courage_threshold: int = 4
var shout_range: float = 5.0

var can_sacrifice_minions: bool = false
var sacrifice_threshold: float = 0.3
var sacrifice_heal: float = 0.25
var sacrifice_damage_buff: float = 0.2

const THINK_INTERVAL: float = 0.2  # 200ms between decision cycles

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
    enemy = get_parent() as Enemy
    if enemy:
        spawn_position = enemy.grid_position
        last_position = enemy.grid_position
        _load_config()
    think_timer = randf() * THINK_INTERVAL

func _load_config() -> void:
    # Pull AI config from monster_data resource or tier defaults
    if enemy.monster_data == null:
        return
    var md: Resource = enemy.monster_data
    sight_range = md.get(&"ai_sight_range") if md.get(&"ai_sight_range") else sight_range
    hearing_range = md.get(&"ai_hearing_range") if md.get(&"ai_hearing_range") else hearing_range
    reaction_delay = md.get(&"ai_reaction_delay") if md.get(&"ai_reaction_delay") else reaction_delay
    memory_duration = md.get(&"ai_memory_duration") if md.get(&"ai_memory_duration") else memory_duration
    windup_duration = md.get(&"ai_windup_duration") if md.get(&"ai_windup_duration") else windup_duration
    attack_cooldown_base = md.get(&"ai_attack_cooldown") if md.get(&"ai_attack_cooldown") else attack_cooldown_base
    flee_threshold = md.get(&"ai_flee_threshold") if md.get(&"ai_flee_threshold") else flee_threshold
    optimal_range = md.get(&"ai_preferred_range") if md.get(&"ai_preferred_range") else optimal_range
    can_kite = md.get(&"ai_kites") if md.get(&"ai_kites") else can_kite

func _process(delta: float) -> void:
    if enemy == null or enemy._is_dead:
        return
    # Update timers
    state_timer += delta
    think_timer += delta
    attack_cooldown = maxf(0.0, attack_cooldown - delta)
    special_cooldown = maxf(0.0, special_cooldown - delta)

    # Status-based overrides
    if enemy.is_stunned or enemy.is_frozen:
        return

    # Throttled decision making
    if think_timer >= THINK_INTERVAL:
        think_timer = 0.0
        _evaluate_state(delta)

    # Continuous state execution
    _execute_state(delta)

# -----------------------------------------------------------------
# State Machine
# -----------------------------------------------------------------

func set_state(new_state: State) -> void:
    if new_state == current_state:
        return
    var old := current_state
    previous_state = old
    current_state = new_state
    state_timer = 0.0
    _on_state_exit(old)
    _on_state_enter(new_state)
    state_changed.emit(STATE_NAMES[old], STATE_NAMES[new_state])

func _on_state_enter(state: State) -> void:
    match state:
        State.IDLE:
            wander_target = null
            target = null
        State.ALERT:
            reaction_timer = reaction_delay
        State.COMBAT:
            _request_circle_angle()
        State.SEARCHING:
            idle_sub_timer = 0.0
        State.FOLLOWING:
            pass

func _on_state_exit(state: State) -> void:
    match state:
        State.COMBAT:
            windup_active = false
            has_attack_token = false
            enemy.left_combat.emit()

# -----------------------------------------------------------------
# State Evaluation (runs every THINK_INTERVAL)
# -----------------------------------------------------------------

func _evaluate_state(_delta: float) -> void:
    var player: Node = _get_player()
    if player == null or player.get(&"_is_dead"):
        if current_state == State.COMBAT or current_state == State.ALERT:
            set_state(State.IDLE)
        return

    var can_see: bool = enemy.can_see_target(player)
    var dist: float = enemy._grid_distance_to(player)
    var atk_range: float = float(enemy.combat_attack_range)

    match current_state:
        State.IDLE:
            if can_see and dist <= sight_range:
                target = player
                last_known_target_pos = player.grid_position
                set_state(State.ALERT)
        State.ALERT:
            reaction_timer -= THINK_INTERVAL
            if reaction_timer <= 0.0:
                if can_see:
                    target = player
                    set_state(State.COMBAT)
                    enemy.entered_combat.emit(player)
                    enemy.alert_nearby(player, &"sight")
                else:
                    set_state(State.SEARCHING)
        State.COMBAT:
            _evaluate_combat(player, can_see, dist, atk_range)
        State.SEARCHING:
            if can_see:
                target = player
                set_state(State.COMBAT)
            elif state_timer > search_duration:
                set_state(State.IDLE)
        State.FOLLOWING:
            if can_see and dist <= sight_range:
                target = player
                set_state(State.COMBAT)

func _evaluate_combat(player: Node, can_see: bool, dist: float, atk_range: float) -> void:
    # Lost sight
    if not can_see:
        last_known_target_pos = player.grid_position
        set_state(State.SEARCHING)
        return
    # Update target pos
    last_known_target_pos = player.grid_position
    # Flee check
    var hp_pct: float = float(enemy.hp) / float(enemy.max_hp)
    if hp_pct <= flee_threshold and not enemy.is_enraged:
        _try_flee(player)
        return
    # Sacrifice check (elite mechanic)
    if can_sacrifice_minions and hp_pct <= sacrifice_threshold:
        _try_sacrifice()

# -----------------------------------------------------------------
# State Execution (runs every frame)
# -----------------------------------------------------------------

func _execute_state(delta: float) -> void:
    match current_state:
        State.IDLE:
            _execute_idle(delta)
        State.ALERT:
            pass  # Waiting on reaction timer
        State.COMBAT:
            _execute_combat(delta)
        State.SEARCHING:
            _execute_searching(delta)
        State.FOLLOWING:
            _execute_following(delta)

## --- IDLE ---
func _execute_idle(delta: float) -> void:
    idle_sub_timer += delta
    if wander_target == null:
        if randf() < pause_chance:
            idle_sub_timer = 0.0
            return
        wander_target = _pick_wander_target()
    if wander_target:
        var arrived := _move_toward(wander_target, base_speed, delta)
        if arrived:
            wander_target = null
            idle_sub_timer = 0.0

## --- COMBAT ---
func _execute_combat(delta: float) -> void:
    if target == null:
        set_state(State.IDLE)
        return

    # Windup sub-state
    if windup_active:
        _execute_windup(delta)
        return

    var dist: float = enemy._grid_distance_to(target)
    var atk_range: float = float(enemy.combat_attack_range)

    # Update chase mode hysteresis
    _update_chase_mode(dist, atk_range)

    if is_in_chase_mode:
        _move_toward(target.grid_position, chase_speed, delta)
    elif dist <= atk_range + 0.5:
        # In attack range
        if attack_cooldown <= 0.0:
            _start_attack()
    elif can_kite and dist < optimal_range - range_tolerance:
        # Too close, kite away
        _move_away_from(target.grid_position, combat_speed, delta)
    elif circling_enabled:
        _execute_circling(delta)
    else:
        _move_toward(target.grid_position, combat_speed, delta)

func _execute_windup(delta: float) -> void:
    windup_timer += delta
    if tracks_during_windup and windup_timer < windup_duration - tracking_cutoff:
        windup_target_pos = target.grid_position if target else windup_target_pos
    if windup_timer >= windup_duration:
        _execute_attack()
        windup_active = false
        windup_timer = 0.0

func _execute_circling(delta: float) -> void:
    circle_angle += circling_speed * delta * strafe_direction
    var ideal_x: float = float(target.grid_position.x) + cos(circle_angle) * circling_radius
    var ideal_y: float = float(target.grid_position.y) + sin(circle_angle) * circling_radius
    _move_toward(Vector2i(roundi(ideal_x), roundi(ideal_y)), combat_speed, delta)

## --- SEARCHING ---
func _execute_searching(delta: float) -> void:
    if last_known_target_pos != Vector2i.ZERO:
        var arrived := _move_toward(last_known_target_pos, base_speed, delta)
        if arrived:
            last_known_target_pos = Vector2i.ZERO

## --- FOLLOWING ---
func _execute_following(delta: float) -> void:
    if follow_target == null:
        set_state(State.IDLE)
        return
    var dist := enemy._grid_distance_to(follow_target)
    if dist > 2.0:
        _move_toward(follow_target.grid_position, base_speed, delta)

# -----------------------------------------------------------------
# Attack
# -----------------------------------------------------------------

func _start_attack() -> void:
    windup_active = true
    windup_timer = 0.0
    windup_target_pos = target.grid_position if target else enemy.grid_position
    attack_started.emit(target)
    # Show telegraph via EventBus
    EventBus.emit_signal("attack_telegraph", enemy, windup_target_pos, windup_duration, telegraph_color)

func _execute_attack() -> void:
    if target == null or target.get(&"_is_dead"):
        return
    # Try special ability first
    if enemy.get_node_or_null("EnemyAbility"):
        var used: bool = enemy.get_node("EnemyAbility").try_use_ability(target)
        if used:
            attack_cooldown = attack_cooldown_base
            return
    # Basic attack
    var dist: float = enemy._grid_distance_to(target)
    if dist <= float(enemy.combat_attack_range) + 0.5:
        var damage: int = enemy.base_damage
        attack_executed.emit(target, damage)
        EventBus.emit_signal("enemy_attacked", enemy, target, damage)
    attack_cooldown = attack_cooldown_base

# -----------------------------------------------------------------
# Chase Mode Hysteresis
# -----------------------------------------------------------------

func _update_chase_mode(dist: float, atk_range: float) -> void:
    var enter_threshold := maxf(atk_range + 5.0, 6.0)
    var exit_threshold := enter_threshold - CHASE_HYSTERESIS
    if not is_in_chase_mode and dist > enter_threshold:
        is_in_chase_mode = true
    elif is_in_chase_mode and dist < exit_threshold:
        is_in_chase_mode = false

# -----------------------------------------------------------------
# Movement Helpers
# -----------------------------------------------------------------

func _move_toward(target_pos: Vector2i, speed: float, delta: float) -> bool:
    var dir := Vector2(target_pos - enemy.grid_position).normalized()
    if dir.length_squared() < 0.01:
        return true
    # Single-tile step toward target
    var step := Vector2i(signi(target_pos.x - enemy.grid_position.x),
                         signi(target_pos.y - enemy.grid_position.y))
    var next := enemy.grid_position + step
    if _is_tile_walkable(next) and not _is_occupied(next):
        enemy.grid_position = next
        enemy.snap_to_grid()
        _update_facing(step)
        return enemy.grid_position == target_pos
    return false

func _move_away_from(target_pos: Vector2i, speed: float, delta: float) -> bool:
    var step := Vector2i(signi(enemy.grid_position.x - target_pos.x),
                         signi(enemy.grid_position.y - target_pos.y))
    var next := enemy.grid_position + step
    if _is_tile_walkable(next) and not _is_occupied(next):
        enemy.grid_position = next
        enemy.snap_to_grid()
        _update_facing(step)
    return false

func _pick_wander_target() -> Variant:
    for _i in range(10):
        var offset := Vector2i(randi_range(-int(wander_radius), int(wander_radius)),
                                randi_range(-int(wander_radius), int(wander_radius)))
        var candidate := spawn_position + offset
        if _is_tile_walkable(candidate):
            return candidate
    return null

func _update_facing(step: Vector2i) -> void:
    if abs(step.x) > abs(step.y):
        enemy.set_facing(Entity.Facing.RIGHT if step.x > 0 else Entity.Facing.LEFT)
    elif step.y != 0:
        enemy.set_facing(Entity.Facing.DOWN if step.y > 0 else Entity.Facing.UP)

func _is_tile_walkable(pos: Vector2i) -> bool:
    # Delegate to WP03 tilemap query
    return true  # Placeholder

func _is_occupied(pos: Vector2i) -> bool:
    # Check other enemies at position
    return false  # Placeholder

func _request_circle_angle() -> void:
    circle_angle = randf() * TAU

func _try_flee(player: Node) -> void:
    # Move away from player, optionally seek nearby ally
    _move_away_from(player.grid_position, flee_speed, 0.0)

func _try_sacrifice() -> void:
    # Elite mechanic: consume a nearby minion for healing
    pass  # Implement with GroupSystem integration

func _get_player() -> Node:
    return get_tree().get_first_node_in_group("player")

# -----------------------------------------------------------------
# External Hooks
# -----------------------------------------------------------------

func on_target_detected(new_target: Node) -> void:
    if current_state == State.IDLE:
        target = new_target
        last_known_target_pos = new_target.grid_position
        set_state(State.ALERT)

func on_hear_noise(source_pos: Vector2i, _volume: float) -> void:
    if current_state == State.IDLE:
        last_known_target_pos = source_pos
        set_state(State.ALERT)

func on_ally_shout(alerter: Node, target_pos: Vector2i) -> void:
    if current_state == State.IDLE or current_state == State.SEARCHING:
        alert_source = alerter
        last_known_target_pos = target_pos
        set_state(State.ALERT)

func on_commanded(command_type: StringName, cmd_target: Variant = null) -> void:
    match command_type:
        &"attack":
            if cmd_target is Node:
                target = cmd_target
                set_state(State.COMBAT)
        &"defend", &"hold":
            target = null
            set_state(State.IDLE)
        &"retreat":
            enemy.is_feared = true
            _try_flee(_get_player())
        &"follow":
            if cmd_target is Node:
                follow_target = cmd_target
                set_state(State.FOLLOWING)
```

### State Transition Diagram
```
         detect player
  IDLE -----------------> ALERT
   ^                        |
   | timer expired          | reaction_delay elapsed
   |                        v
   +---- timer ------- SEARCHING <---- lost sight ---- COMBAT
                                                         ^  |
                                          detect again --+  |
                                                            | flee/sacrifice
                                                            v
                                                        (move away)

  FOLLOWING: entered via group command, exits to COMBAT on detect or IDLE on lost target
```

---

## Part 5: Enemy Ability System

### Source: `enemy-ability-system.js` (3986 lines)

Key concepts:
- Each enemy gets an "ability set" assigned on spawn based on their monster data
- Abilities have: id, name, damage, range, cooldown, telegraph time, element, type (melee/ranged/area/sequence)
- Global cooldown (1s base) prevents ability spam
- `tryUseAbility()` checks range, cooldowns, then rolls ability-use chance
- Execution creates telegraphs, visual effects, applies damage/status

### Godot: `enemy_ability.gd`

```gdscript
## scenes/entities/enemy/enemy_ability.gd
## Manages ability assignment, cooldowns, and execution for a single enemy.
class_name EnemyAbility
extends Node

# --- Signals ---
signal ability_started(ability_id: StringName)
signal ability_executed(ability_id: StringName, target: Node)
signal telegraph_shown(position: Vector2i, duration: float, color: Color)

# --- Config ---
const DEFAULT_TELEGRAPH_TIME: float = 0.5
const GLOBAL_COOLDOWN_BASE: float = 1.0
const ABILITY_USE_CHANCE: float = 0.25
const ELITE_ABILITY_CHANCE: float = 0.4

# --- State ---
var enemy: Enemy = null
var ability_set: Array[Resource] = []  # Array of AbilityData resources
var signature_ability: Resource = null  # Primary ability
var cooldowns: Dictionary = {}  # ability_id -> float remaining
var global_cooldown: float = 0.0
var is_executing: bool = false

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
    enemy = get_parent() as Enemy
    if enemy and enemy.monster_data:
        _assign_abilities()

func _process(delta: float) -> void:
    global_cooldown = maxf(0.0, global_cooldown - delta)
    for key in cooldowns:
        cooldowns[key] = maxf(0.0, cooldowns[key] - delta)

func _assign_abilities() -> void:
    # Load from monster_data.abilities (Array of AbilityData resource paths)
    var ability_ids: Array = enemy.monster_data.get(&"abilities") if enemy.monster_data else []
    for ability_id in ability_ids:
        # Load AbilityData resource from WP02
        var ability: Resource = load("res://resources/abilities/%s.tres" % ability_id)
        if ability:
            ability_set.append(ability)
            cooldowns[ability_id] = 0.0
    if ability_set.size() > 0:
        signature_ability = ability_set[0]

# -----------------------------------------------------------------
# Try Use Ability (called by AI during attack phase)
# -----------------------------------------------------------------

func try_use_ability(target: Node) -> bool:
    if is_executing or global_cooldown > 0.0:
        return false
    if ability_set.is_empty():
        return false

    # Roll chance
    var chance: float = ELITE_ABILITY_CHANCE if enemy.tier == &"ELITE" else ABILITY_USE_CHANCE
    if randf() > chance:
        return false

    # Find usable ability
    for ability in ability_set:
        var aid: StringName = ability.get(&"ability_id")
        if cooldowns.get(aid, 0.0) > 0.0:
            continue
        var ability_range: float = ability.get(&"ability_range") if ability.get(&"ability_range") else 1.0
        var dist: float = enemy._grid_distance_to(target)
        if dist > ability_range:
            continue
        # Execute
        _execute_ability(ability, target)
        return true

    return false

func _execute_ability(ability: Resource, target: Node) -> void:
    is_executing = true
    var aid: StringName = ability.get(&"ability_id")
    ability_started.emit(aid)

    # Telegraph
    var telegraph_time: float = ability.get(&"telegraph_time") if ability.get(&"telegraph_time") else DEFAULT_TELEGRAPH_TIME
    telegraph_shown.emit(target.grid_position, telegraph_time, Color.RED)

    # Wait for telegraph, then apply
    await get_tree().create_timer(telegraph_time).timeout

    if enemy._is_dead or target.get(&"_is_dead"):
        is_executing = false
        return

    # Apply damage
    var damage: int = ability.get(&"damage") if ability.get(&"damage") else enemy.base_damage
    EventBus.emit_signal("ability_damage", enemy, target, damage, ability)
    ability_executed.emit(aid, target)

    # Set cooldowns
    cooldowns[aid] = ability.get(&"cooldown") if ability.get(&"cooldown") else 5.0
    global_cooldown = GLOBAL_COOLDOWN_BASE

    is_executing = false
```

---

## Part 6: NPC Entity

### Source: `npc.js` -- `NPCSystem`

NPC types: `spirit, prisoner, guide, merchant, wounded, ghost, quest_giver, villager`

Key systems:
- NPC state machine: `idle, talking, quest_active, quest_complete, bound, following, guiding, freed, rescued`
- Dialogue trees with options and conditions
- Quest giving/tracking
- Shop inventory (merchants)
- Escort behavior (following player)

### Godot: `npc.gd`

```gdscript
## scenes/entities/npc/npc.gd
class_name NPC
extends Entity

# --- Signals ---
signal interaction_started
signal interaction_ended
signal quest_offered(quest_id: StringName)
signal dialogue_started(npc_id: StringName)

# --- NPC Types ---
enum NPCType { SPIRIT, PRISONER, GUIDE, MERCHANT, WOUNDED, GHOST, QUEST_GIVER, VILLAGER }

# --- Config ---
@export var npc_data: Resource  # NpcData from WP02
@export var npc_type: NPCType = NPCType.VILLAGER
@export var interact_range: float = 1.5

# --- State ---
enum NPCState { IDLE, TALKING, QUEST_ACTIVE, QUEST_COMPLETE, BOUND, FOLLOWING, GUIDING, FREED }
var npc_state: NPCState = NPCState.IDLE

# --- Dialogue ---
var dialogue_tree: Array = []  # Array of dialogue node dicts
var current_dialogue_index: int = -1

# --- Quest ---
var offered_quest_id: StringName = &""
var quest_complete: bool = false

# --- Shop ---
var shop_inventory: Array[Resource] = []

# --- Movement (for escort/guide NPCs) ---
var move_speed: float = 2.0
var follow_distance: float = 2.0

# --- Bark ---
var barks: Array = []
var bark_cooldown: float = 0.0
const BARK_COOLDOWN_DURATION: float = 30.0

# --- Interaction Area ---
@onready var interact_area: Area2D = $InteractArea

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
    super._ready()
    _load_from_npc_data()
    interact_area.body_entered.connect(_on_interact_area_body_entered)
    interact_area.body_exited.connect(_on_interact_area_body_exited)

func _load_from_npc_data() -> void:
    if npc_data == null:
        return
    entity_name = npc_data.get(&"npc_name")
    npc_type = npc_data.get(&"npc_type_enum") if npc_data.get(&"npc_type_enum") else NPCType.VILLAGER
    move_speed = npc_data.get(&"move_speed") if npc_data.get(&"move_speed") else 2.0
    dialogue_tree = npc_data.get(&"dialogue") if npc_data.get(&"dialogue") else []
    barks = npc_data.get(&"barks") if npc_data.get(&"barks") else []
    shop_inventory = npc_data.get(&"shop_items") if npc_data.get(&"shop_items") else []
    offered_quest_id = npc_data.get(&"quest_id") if npc_data.get(&"quest_id") else &""

func _process(delta: float) -> void:
    if bark_cooldown > 0.0:
        bark_cooldown -= delta
    match npc_state:
        NPCState.FOLLOWING, NPCState.GUIDING:
            _follow_player(delta)

# -----------------------------------------------------------------
# Interaction
# -----------------------------------------------------------------

func interact(player: Node) -> void:
    match npc_type:
        NPCType.MERCHANT:
            EventBus.emit_signal("open_shop", self, shop_inventory)
        NPCType.QUEST_GIVER:
            if offered_quest_id != &"":
                quest_offered.emit(offered_quest_id)
            _start_dialogue()
        _:
            _start_dialogue()
    interaction_started.emit()

func _start_dialogue() -> void:
    if dialogue_tree.is_empty():
        return
    current_dialogue_index = 0
    npc_state = NPCState.TALKING
    dialogue_started.emit(entity_id)
    EventBus.emit_signal("dialogue_started", self, dialogue_tree)

func end_dialogue() -> void:
    current_dialogue_index = -1
    npc_state = NPCState.IDLE
    interaction_ended.emit()

# -----------------------------------------------------------------
# Following / Escort
# -----------------------------------------------------------------

func _follow_player(delta: float) -> void:
    var player: Node = get_tree().get_first_node_in_group("player")
    if player == null:
        return
    var dist := _grid_distance_to(player)
    if dist > follow_distance:
        var dir := Vector2(player.grid_position - grid_position).normalized()
        var step := Vector2i(signi(int(dir.x)), signi(int(dir.y)))
        grid_position += step
        snap_to_grid()

func _grid_distance_to(other: Node) -> float:
    return Vector2(grid_position).distance_to(Vector2(other.grid_position))

# -----------------------------------------------------------------
# Bark System (proximity speech bubbles)
# -----------------------------------------------------------------

func try_bark(player_pos: Vector2i) -> String:
    if bark_cooldown > 0.0 or barks.is_empty():
        return ""
    var dist := Vector2(grid_position).distance_to(Vector2(player_pos))
    if dist > 2.0:
        return ""
    bark_cooldown = BARK_COOLDOWN_DURATION
    var bark_text: String = barks[randi() % barks.size()]
    EventBus.emit_signal("bark_triggered", self, bark_text)
    return bark_text

# -----------------------------------------------------------------
# Signals
# -----------------------------------------------------------------

var _player_in_range: bool = false

func _on_interact_area_body_entered(body: Node2D) -> void:
    if body is Player:
        _player_in_range = true
        EventBus.emit_signal("interact_prompt_show", self)

func _on_interact_area_body_exited(body: Node2D) -> void:
    if body is Player:
        _player_in_range = false
        EventBus.emit_signal("interact_prompt_hide", self)
```

### NPC Scene Tree
```
NPC (CharacterBody2D) [npc.gd]
 +-- AnimatedSprite2D
 +-- CollisionShape2D
 +-- InteractArea (Area2D)           # interact_range radius
 |    +-- CollisionShape2D (CircleShape2D)
 +-- BarkLabel (Label)               # Speech bubble text
```

---

## Part 7: Boss Entity

### Source: `boss.js` -- `BossSystem`

The BossSystem provides a modular component library:
- **ATTACK_COMPONENTS**: melee_swing, heavy_slam, charge, projectile_burst, ground_slam, shockwave, meteor, etc.
- **BEHAVIOR_COMPONENTS**: aggressive, defensive, hit_and_run, artillery, berserker
- **MECHANIC_COMPONENTS**: enrage, immunity, summon, phase_shield, regeneration
- **PHASE_PRESETS**: standard, aggressive_ramp, tactical_retreat

### Source: `core-boss.js` -- The Primordial
- 3 phases at 75%/50%/25% HP thresholds
- Abilities: area damage, tendrils (targeted projectiles), chaos orbs (radial), summons, reality tears (damage zones), void collapse (arena shrink)
- Invulnerable during phase transitions (2s)
- Dialogue queue system

### Source: `malphas-boss.js` -- Malphas, Heart of the World
- Stationary 5x5 tile boss
- 4 phases: Dormant Awakening, Raging Pulse, Desperate Thrashing, Final Heartbeat
- 4 lava vents heal boss; boss invulnerable while any vent alive
- Vents respawn after 30s
- Minion spawning: magma_elemental, obsidian_golem, ember_sprite
- Hazards: lava surge, ground slam, fire rain

### Godot: `boss.gd`

```gdscript
## scenes/entities/boss/boss.gd
## Base boss class. Extends Enemy with phase system and telegraph overlay.
class_name Boss
extends Enemy

# --- Signals ---
signal phase_changed(old_phase: int, new_phase: int)
signal telegraph_created(position: Vector2, radius: float, duration: float, color: Color)
signal boss_defeated

# --- Phase System ---
@export var phase_thresholds: Array[float] = [1.0, 0.75, 0.5, 0.25]
@export var phase_names: Array[String] = ["Phase 1", "Phase 2", "Phase 3", "Phase 4"]
var current_phase: int = 0
var phase_transitioning: bool = false
var phase_transition_timer: float = 0.0
const PHASE_TRANSITION_DURATION: float = 2.0

# --- Boss Flags ---
var is_boss: bool = true
var is_final_boss: bool = false
var invulnerable: bool = false
var enraged: bool = false

# --- Active Summons ---
var active_summons: Array[Node] = []
var max_summons: int = 6

# --- Attack Components ---
## Array of attack component dictionaries (from ATTACK_COMPONENTS library)
var attack_components: Array[Dictionary] = []
var attack_cooldowns: Dictionary = {}  # component_name -> float

# --- Dialogue ---
var dialogue_queue: Array[String] = []
var current_dialogue: String = ""
var dialogue_timer: float = 0.0

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
    super._ready()
    add_to_group("bosses")

func _process(delta: float) -> void:
    if _is_dead:
        return
    if phase_transitioning:
        phase_transition_timer += delta
        if phase_transition_timer >= PHASE_TRANSITION_DURATION:
            phase_transitioning = false
            invulnerable = false
        return
    _update_cooldowns_boss(delta)
    _update_dialogue(delta)
    _clean_summons()

func _update_cooldowns_boss(delta: float) -> void:
    for key in attack_cooldowns:
        attack_cooldowns[key] = maxf(0.0, attack_cooldowns[key] - delta)

func _update_dialogue(delta: float) -> void:
    if current_dialogue != "":
        dialogue_timer -= delta
        if dialogue_timer <= 0.0:
            current_dialogue = ""
            _show_next_dialogue()

func _clean_summons() -> void:
    active_summons = active_summons.filter(func(s): return is_instance_valid(s) and not s._is_dead)

# -----------------------------------------------------------------
# Damage Override
# -----------------------------------------------------------------

func take_damage(amount: int, damage_element: StringName = &"physical") -> int:
    if invulnerable:
        return 0
    var actual := super.take_damage(amount, damage_element)
    _check_phase_transition()
    return actual

# -----------------------------------------------------------------
# Phase System
# -----------------------------------------------------------------

func _check_phase_transition() -> void:
    var hp_pct: float = float(hp) / float(max_hp)
    for i in range(phase_thresholds.size() - 1, -1, -1):
        if hp_pct <= phase_thresholds[i] and current_phase < i:
            _transition_to_phase(i)
            break

func _transition_to_phase(new_phase: int) -> void:
    var old_phase := current_phase
    current_phase = new_phase
    phase_transitioning = true
    phase_transition_timer = 0.0
    invulnerable = true
    _on_phase_enter(new_phase)
    phase_changed.emit(old_phase, new_phase)

## Override in subclasses for phase-specific behavior.
func _on_phase_enter(phase: int) -> void:
    pass

# -----------------------------------------------------------------
# Dialogue
# -----------------------------------------------------------------

func queue_dialogue(lines: Array[String]) -> void:
    dialogue_queue.append_array(lines)
    if current_dialogue == "":
        _show_next_dialogue()

func _show_next_dialogue() -> void:
    if dialogue_queue.is_empty():
        return
    current_dialogue = dialogue_queue.pop_front()
    dialogue_timer = 3.0
    EventBus.emit_signal("boss_dialogue", self, current_dialogue)

# -----------------------------------------------------------------
# Telegraph
# -----------------------------------------------------------------

func show_telegraph(position: Vector2, radius: float, duration: float, color: Color = Color.RED) -> void:
    telegraph_created.emit(position, radius, duration, color)
    EventBus.emit_signal("telegraph_created", position, radius, duration, color)

# -----------------------------------------------------------------
# Summon
# -----------------------------------------------------------------

func spawn_summon(summon_scene: PackedScene, pos: Vector2i) -> Node:
    if active_summons.size() >= max_summons:
        return null
    var summon: Node = summon_scene.instantiate()
    summon.global_position = Vector2(pos) * Constants.BASE_TILE_SIZE
    get_tree().current_scene.add_child(summon)
    active_summons.append(summon)
    return summon

# -----------------------------------------------------------------
# Death
# -----------------------------------------------------------------

func _on_death() -> void:
    # Clear summons
    for summon in active_summons:
        if is_instance_valid(summon):
            summon.queue_free()
    active_summons.clear()
    boss_defeated.emit()
    EventBus.emit_signal("boss_defeated", self)
```

### Core Boss: `core_boss.gd`

```gdscript
## scenes/entities/boss/core_boss.gd
## The Primordial -- 3-phase final boss.
class_name CoreBoss
extends Boss

func _ready() -> void:
    entity_name = &"The Primordial"
    is_final_boss = true
    phase_thresholds = [1.0, 0.75, 0.50, 0.25]
    phase_names = ["Awakening", "Unraveling", "Primordial Wrath"]
    max_summons = 6
    super._ready()

func _on_phase_enter(phase: int) -> void:
    match phase:
        1:
            queue_dialogue(["You dare disturb the foundation?"])
            base_damage = int(base_damage * 1.25)
        2:
            queue_dialogue(["FEEL THE WEIGHT OF CREATION!"])
            base_damage = int(base_damage * 1.5)
            # Unlock void collapse ability
        3:
            queue_dialogue(["THIS WORLD ENDS WITH ME!"])
            enraged = true
            base_damage = int(base_damage * 2.0)
```

### Malphas Boss: `malphas_boss.gd`

```gdscript
## scenes/entities/boss/malphas_boss.gd
## Malphas, Heart of the World -- stationary boss with vent mechanic.
class_name MalphasBoss
extends Boss

# --- Vent System ---
var vents: Array[Dictionary] = []
const VENT_COUNT: int = 4
const VENT_HEALTH: int = 500
const VENT_HEAL_PER_SEC: float = 50.0
const VENT_RESPAWN_TIME: float = 30.0

# --- Minion Config ---
const MAX_MINIONS: int = 6
const MINION_SPAWN_INTERVAL: float = 15.0
var minion_spawn_timer: float = 5.0
var minion_types: Array[StringName] = [&"magma_elemental", &"obsidian_golem", &"ember_sprite"]

# --- Hazard Timers ---
var ground_slam_timer: float = 20.0
var fire_rain_timer: float = 15.0

func _ready() -> void:
    entity_name = &"Malphas, Heart of the World"
    is_final_boss = true
    max_hp = 5000
    hp = max_hp
    phase_thresholds = [1.0, 0.75, 0.50, 0.25]
    phase_names = ["Dormant Awakening", "Raging Pulse", "Desperate Thrashing", "Final Heartbeat"]
    super._ready()
    _spawn_vents()

func _spawn_vents() -> void:
    var offsets := [Vector2i(-6, 0), Vector2i(6, 0), Vector2i(0, -6), Vector2i(0, 6)]
    for i in range(VENT_COUNT):
        vents.append({
            "id": "vent_%d" % i,
            "position": grid_position + offsets[i],
            "hp": VENT_HEALTH,
            "max_hp": VENT_HEALTH,
            "active": true,
            "respawn_timer": 0.0,
        })

func _process(delta: float) -> void:
    super._process(delta)
    if _is_dead:
        return
    _update_vents(delta)
    _update_minion_spawning(delta)
    _update_hazards(delta)

func _update_vents(delta: float) -> void:
    var active_count := 0
    for vent in vents:
        if vent["active"] and vent["hp"] > 0:
            active_count += 1
            hp = mini(hp + int(VENT_HEAL_PER_SEC * delta), max_hp)
        elif not vent["active"]:
            vent["respawn_timer"] -= delta
            if vent["respawn_timer"] <= 0.0:
                vent["hp"] = VENT_HEALTH
                vent["active"] = true
    invulnerable = active_count > 0

func damage_vent(vent_id: String, amount: int) -> void:
    for vent in vents:
        if vent["id"] == vent_id and vent["active"]:
            vent["hp"] -= amount
            if vent["hp"] <= 0:
                vent["active"] = false
                vent["respawn_timer"] = VENT_RESPAWN_TIME

func _update_minion_spawning(delta: float) -> void:
    minion_spawn_timer -= delta
    _clean_summons()
    if minion_spawn_timer <= 0.0 and active_summons.size() < MAX_MINIONS:
        _spawn_minion()
        minion_spawn_timer = MINION_SPAWN_INTERVAL / (1.0 + current_phase * 0.3)

func _spawn_minion() -> void:
    var angle := randf() * TAU
    var dist := 8.0 + randf() * 4.0
    var pos := Vector2i(
        grid_position.x + roundi(cos(angle) * dist),
        grid_position.y + roundi(sin(angle) * dist),
    )
    # Load minion scene based on random type
    var type_name: StringName = minion_types[randi() % minion_types.size()]
    EventBus.emit_signal("spawn_minion", type_name, pos, self)

func _update_hazards(delta: float) -> void:
    if current_phase >= 1:
        ground_slam_timer -= delta
        if ground_slam_timer <= 0.0:
            EventBus.emit_signal("boss_hazard", &"ground_slam", grid_position, 8)
            ground_slam_timer = 20.0
    if current_phase >= 2:
        fire_rain_timer -= delta
        if fire_rain_timer <= 0.0:
            EventBus.emit_signal("boss_hazard", &"fire_rain", Vector2i.ZERO, 0)
            fire_rain_timer = 5.0

func _on_phase_enter(phase: int) -> void:
    base_damage = int(40 * (1.0 + phase * 0.25))
    if phase >= 2:
        _spawn_minion()
        _spawn_minion()
```

---

## Part 8: Group System (Monster Social)

### Source: `monster-social-system.js` -- `GroupSystem`

Core concepts:
- Groups are ID-based (never store object references)
- Formation types: `pack`, `swarm`, `command`
- Group bonuses scale by live member count (2-8): damage +5%..+30%, defense +5%..+20%, attackSpeed +0%..+30%, evasion +0%..+15%
- Leader selection: highest tier wins, then highest maxHp
- Leader death: weak minions become panicked (3s), strong guards become enraged (5s)
- Commands: attack, defend, retreat, hold
- Orphan regrouping: after 2s delay, orphaned enemies seek nearby compatible groups

### Godot: `group_system.gd`

```gdscript
## scripts/systems/group_system.gd
## Manages monster pack/swarm/command groups. ID-only storage.
class_name GroupSystem
extends Node

# --- Signals ---
signal group_formed(group_id: StringName)
signal group_disbanded(group_id: StringName)
signal leader_changed(group_id: StringName, new_leader_id: StringName)
signal command_issued(group_id: StringName, command: StringName)

# --- Config ---
const PACK_RADIUS: float = 5.0
const SWARM_RADIUS: float = 3.0
const COMMAND_RADIUS: float = 8.0
const MAX_GROUP_SIZE: int = 8
const MIN_PACK_SIZE: int = 2
const MIN_SWARM_SIZE: int = 3

# Size-based bonuses: { size: { damage, defense, attack_speed, evasion } }
const BONUSES: Dictionary = {
    2: { "damage": 0.05, "defense": 0.05, "attack_speed": 0.0, "evasion": 0.0 },
    3: { "damage": 0.10, "defense": 0.10, "attack_speed": 0.10, "evasion": 0.05 },
    4: { "damage": 0.15, "defense": 0.10, "attack_speed": 0.15, "evasion": 0.07 },
    5: { "damage": 0.20, "defense": 0.15, "attack_speed": 0.20, "evasion": 0.10 },
    6: { "damage": 0.25, "defense": 0.15, "attack_speed": 0.25, "evasion": 0.12 },
    7: { "damage": 0.28, "defense": 0.18, "attack_speed": 0.28, "evasion": 0.13 },
    8: { "damage": 0.30, "defense": 0.20, "attack_speed": 0.30, "evasion": 0.15 },
}

# --- Data ---
## group_id -> { member_ids: Array[StringName], leader_id, formation_type, element, last_command }
var groups: Dictionary = {}
## enemy_id -> group_id (reverse lookup)
var member_to_group: Dictionary = {}
var _group_counter: int = 0

# -----------------------------------------------------------------
# Core Methods
# -----------------------------------------------------------------

func join_group(enemy_id: StringName, group_id: StringName = &"") -> StringName:
    if member_to_group.has(enemy_id):
        leave_group(enemy_id)
    if group_id != &"" and groups.has(group_id):
        var group: Dictionary = groups[group_id]
        if group["member_ids"].size() >= MAX_GROUP_SIZE:
            return &""
        group["member_ids"].append(enemy_id)
        member_to_group[enemy_id] = group_id
        _update_leader(group_id)
        return group_id
    else:
        _group_counter += 1
        var new_id := StringName("group_%d" % _group_counter)
        groups[new_id] = {
            "member_ids": [enemy_id],
            "leader_id": enemy_id,
            "formation_type": &"pack",
            "element": &"physical",
            "last_command": null,
        }
        member_to_group[enemy_id] = new_id
        group_formed.emit(new_id)
        return new_id

func leave_group(enemy_id: StringName) -> void:
    var gid: StringName = member_to_group.get(enemy_id, &"")
    if gid == &"":
        return
    member_to_group.erase(enemy_id)
    if not groups.has(gid):
        return
    var group: Dictionary = groups[gid]
    group["member_ids"].erase(enemy_id)
    var min_size: int = MIN_SWARM_SIZE if group["formation_type"] == &"swarm" else MIN_PACK_SIZE
    if group["member_ids"].size() < min_size:
        _disband_group(gid)
    elif group["leader_id"] == enemy_id:
        _update_leader(gid)

func on_enemy_death(enemy_id: StringName) -> void:
    var gid: StringName = member_to_group.get(enemy_id, &"")
    var was_leader := false
    if gid != &"" and groups.has(gid):
        was_leader = groups[gid]["leader_id"] == enemy_id
    leave_group(enemy_id)
    if was_leader and groups.has(gid):
        _handle_leader_death(gid)

func get_bonuses(enemy_id: StringName) -> Dictionary:
    var default := { "damage": 0.0, "defense": 0.0, "attack_speed": 0.0, "evasion": 0.0 }
    var gid: StringName = member_to_group.get(enemy_id, &"")
    if gid == &"":
        return default
    var count := _get_live_count(gid)
    return BONUSES.get(mini(count, 8), default)

func issue_command(leader_id: StringName, command_type: StringName, target_id: StringName = &"") -> Array[StringName]:
    var gid: StringName = member_to_group.get(leader_id, &"")
    if gid == &"" or not groups.has(gid):
        return []
    var group: Dictionary = groups[gid]
    if group["leader_id"] != leader_id:
        return []
    var commanded: Array[StringName] = []
    for mid in group["member_ids"]:
        if mid == leader_id:
            continue
        var enemy: Node = _resolve_enemy(mid)
        if enemy and not enemy._is_dead and enemy.has_node("EnemyAI"):
            enemy.get_node("EnemyAI").on_commanded(command_type)
            commanded.append(mid)
    group["last_command"] = { "type": command_type, "target": target_id }
    command_issued.emit(gid, command_type)
    return commanded

# -----------------------------------------------------------------
# Internal
# -----------------------------------------------------------------

func _update_leader(gid: StringName) -> void:
    if not groups.has(gid):
        return
    var group: Dictionary = groups[gid]
    var best_id: StringName = &""
    var best_tier: int = -1
    var best_max_hp: int = 0
    for mid in group["member_ids"]:
        var enemy: Node = _resolve_enemy(mid)
        if enemy == null or enemy._is_dead:
            continue
        var tier_val: int = _tier_order(enemy.get(&"tier"))
        var mhp: int = enemy.get(&"max_hp") if enemy.get(&"max_hp") else 0
        if tier_val > best_tier or (tier_val == best_tier and mhp > best_max_hp):
            best_id = mid
            best_tier = tier_val
            best_max_hp = mhp
    group["leader_id"] = best_id
    leader_changed.emit(gid, best_id)

func _handle_leader_death(gid: StringName) -> void:
    if not groups.has(gid):
        return
    for mid in groups[gid]["member_ids"]:
        var enemy: Node = _resolve_enemy(mid)
        if enemy == null or enemy._is_dead:
            continue
        var tier_val: int = _tier_order(enemy.get(&"tier"))
        if tier_val <= 1:
            enemy.is_feared = true
            enemy.fear_duration = 3.0
        else:
            enemy.is_enraged = true

func _disband_group(gid: StringName) -> void:
    if not groups.has(gid):
        return
    for mid in groups[gid]["member_ids"]:
        member_to_group.erase(mid)
    groups.erase(gid)
    group_disbanded.emit(gid)

func _get_live_count(gid: StringName) -> int:
    if not groups.has(gid):
        return 0
    var count := 0
    for mid in groups[gid]["member_ids"]:
        var enemy: Node = _resolve_enemy(mid)
        if enemy and not enemy._is_dead:
            count += 1
    return count

func _resolve_enemy(enemy_id: StringName) -> Node:
    for enemy in get_tree().get_nodes_in_group("enemies"):
        if enemy.entity_id == enemy_id:
            return enemy
    return null

func _tier_order(tier: Variant) -> int:
    var order := { &"TIER_3": 0, &"TIER_2": 1, &"TIER_1": 2, &"ELITE": 3, &"BOSS": 4 }
    return order.get(tier, 0)

func cleanup() -> void:
    groups.clear()
    member_to_group.clear()
```

---

## Part 9: Bark System

### Source: `bark-system.js`
- Trigger distance: 2 tiles (Manhattan distance)
- Cooldown: 30s per NPC
- Display: 4s, then 500ms fade
- Context-aware barks: low_health, high_gold, first_run, recent_death, etc.

In Godot, bark logic is integrated directly into `npc.gd` (see Part 6). The rendering is handled by a `Label` node on the NPC scene. The `BarkSystem` singleton is not needed -- the NPC handles its own bark cooldown and the UI layer reads the signal.

The `EventBus.bark_triggered` signal carries `(npc: NPC, text: String)` for the HUD to render a floating label.

---

## Part 10: Monster Animation Configuration

### Source: `monster-animations.js`

Maps monster names to spritesheet configs: `frameWidth`, `frameHeight`, per-animation (run/attack/hurt/death) file names and directional row/column data.

In Godot, this maps to **AnimatedSprite2D** `SpriteFrames` resources:
1. Create a `.tres` `SpriteFrames` resource per monster
2. Each animation name = `run_down`, `run_up`, `attack_left`, `death_right`, etc.
3. Import spritesheets, configure Godot's AtlasTexture or frame-based animation
4. Set `fps` and `loop` per animation

No script needed -- it becomes data in the Godot editor.

---

## Signal Registry (EventBus signals for this WP)

Add these to `autoload/event_bus.gd`:

```gdscript
# Entity signals
signal player_died
signal torch_toggled(is_on: bool)
signal enemy_alerted(enemy: Node, target: Node, alert_type: StringName)
signal enemy_attacked(attacker: Node, target: Node, damage: int)
signal attack_telegraph(enemy: Node, target_pos: Vector2i, duration: float, color: Color)
signal ability_damage(source: Node, target: Node, damage: int, ability: Resource)

# Boss signals
signal boss_defeated(boss: Node)
signal boss_dialogue(boss: Node, text: String)
signal boss_hazard(hazard_type: StringName, position: Vector2i, radius: int)
signal telegraph_created(position: Vector2, radius: float, duration: float, color: Color)

# NPC signals
signal open_shop(npc: Node, inventory: Array)
signal dialogue_started(npc: Node, dialogue: Array)
signal interact_prompt_show(npc: Node)
signal interact_prompt_hide(npc: Node)
signal bark_triggered(npc: Node, text: String)
signal quest_offered(quest_id: StringName)
signal spawn_minion(type: StringName, position: Vector2i, owner: Node)
```

---

## Verification Checklist

### Entity Base
- [ ] `entity.gd` compiles with no errors
- [ ] `hp` setter clamps and emits `health_changed`
- [ ] `died` signal fires when hp reaches 0
- [ ] `snap_to_grid()` places entity at correct pixel position

### Player
- [ ] `player.tscn` instantiates with correct scene tree
- [ ] All 6 equipment slots initialized to null
- [ ] `equip_item()` swaps old item to inventory, recalculates stats
- [ ] `unequip_item()` returns item to inventory
- [ ] `recalculate_stats()` correctly derives: maxHp, critChance, dodgeChance, manaRegen, pDef, mDef
- [ ] Crit formula: `5.0 + max(0, (totalAGI - 10) * 0.3)`
- [ ] Dodge formula: `max(0, (totalAGI - 10) * 0.2)`
- [ ] Mana regen formula: `5.0 * (1.0 + totalINT / 100.0)`
- [ ] GCD timer decrements and resets correctly
- [ ] `toggle_torch()` emits signal and flips boolean
- [ ] `handle_death()` emits `player_died` signal

### Enemy
- [ ] `enemy.tscn` instantiates with AI and ability child nodes
- [ ] `_load_from_monster_data()` populates all stats from resource
- [ ] `can_see_target()` respects: sight range, torch stealth (0.25x), vision cone, LOS
- [ ] `can_hear_sound()` uses volume falloff over distance
- [ ] `DetectionArea` triggers `_on_detection_body_entered` for Player
- [ ] `alert_nearby()` emits EventBus signal

### Enemy AI
- [ ] All 5 states reachable: IDLE, ALERT, COMBAT, SEARCHING, FOLLOWING
- [ ] IDLE -> ALERT on player detected within sight range
- [ ] ALERT -> COMBAT after reaction delay, or -> SEARCHING if lost sight
- [ ] COMBAT: windup -> execute attack cycle works
- [ ] COMBAT: chase mode hysteresis prevents jitter (enter at +5, exit at +4.5)
- [ ] COMBAT: circling behavior maintains distance at `circling_radius`
- [ ] COMBAT: flee check triggers at `hp <= flee_threshold * max_hp`
- [ ] SEARCHING -> IDLE after `search_duration` timeout
- [ ] SEARCHING -> COMBAT on re-detection
- [ ] FOLLOWING -> tracks follow_target, transitions to COMBAT on detection
- [ ] `on_hear_noise()` transitions IDLE -> ALERT
- [ ] `on_ally_shout()` transitions IDLE/SEARCHING -> ALERT
- [ ] `on_commanded()` handles attack/defend/retreat/hold/follow

### Enemy Abilities
- [ ] Abilities loaded from MonsterData on spawn
- [ ] Global cooldown prevents spam (1s base)
- [ ] `try_use_ability()` checks: not executing, GCD, range, cooldown, chance roll
- [ ] Telegraph signal emitted before damage
- [ ] Cooldowns decrement each frame

### NPC
- [ ] `npc.tscn` has InteractArea and BarkLabel
- [ ] Merchant type opens shop via EventBus
- [ ] Quest giver emits `quest_offered` signal
- [ ] Dialogue state machine: IDLE -> TALKING -> IDLE
- [ ] Following/guiding NPCs move toward player when distance > `follow_distance`
- [ ] Bark triggers within 2 tiles, respects 30s cooldown

### Boss
- [ ] Boss extends Enemy (which extends Entity)
- [ ] Phase transitions trigger at correct HP thresholds
- [ ] Invulnerable during 2s phase transition
- [ ] `take_damage()` returns 0 when invulnerable
- [ ] Dialogue queue processes correctly (3s per line)
- [ ] Summons tracked and cleaned up on death

### Core Boss (The Primordial)
- [ ] 3 phases at 75%/50%/25%
- [ ] Damage scales per phase: 1.25x, 1.5x, 2.0x
- [ ] Summons capped at 6
- [ ] Death clears all summons

### Malphas Boss
- [ ] 4 vents spawn at cardinal positions (offset 6 tiles)
- [ ] Vents heal boss while alive (50hp/s each)
- [ ] Boss invulnerable while any vent active
- [ ] Vents respawn after 30s
- [ ] Minions spawn every 15s (scaled by phase)
- [ ] Ground slam hazard active from phase 1
- [ ] Fire rain hazard active from phase 2
- [ ] Damage scales: `40 * (1 + phase * 0.25)`

### Group System
- [ ] Groups form correctly: pack (2+), swarm (3+), command (leader + followers)
- [ ] Bonuses scale by live member count (2-8)
- [ ] Leader death: weak members feared 3s, strong members enraged
- [ ] Group disbands below minimum size
- [ ] Commands propagate to all non-leader members
- [ ] `on_enemy_death()` cleans up membership and triggers leader succession

### Monster Animations
- [ ] SpriteFrames resources created for each configured monster
- [ ] Animations named: `{action}_{direction}` (e.g., `run_down`, `attack_left`)
- [ ] FPS and loop flags match source config

---

## Key Architectural Decisions

1. **AI is a child Node, not a singleton.** Each enemy owns its own `EnemyAI` instance. The JS `AIManager` singleton becomes unnecessary -- Godot's `_process()` on each node handles per-frame updates. For distance-based culling, use `VisibleOnScreenNotifier2D` or manual distance checks.

2. **GroupSystem is a singleton (autoload or scene-level node).** It manages cross-entity relationships and must persist across the dungeon. Register in GameManager or as a child of the dungeon scene.

3. **Boss extends Enemy, not a parallel class.** This gives bosses access to all enemy infrastructure (perception, AI hooks, group bonuses). Boss-specific behavior layers on top via overrides.

4. **Equipment is Resource-based.** `ItemData` resources from WP02 are stored directly in the `equipped` dictionary. Stat recalculation reads properties from these resources.

5. **Signals over direct references.** Entity-to-system communication uses `EventBus` signals. Entity-to-entity communication uses direct signal connections when in the same scene tree, or EventBus for cross-scene.

6. **Area2D for perception.** Each enemy's `DetectionArea` circle radius matches `sight_range * tile_size`. When the Player enters, the AI gets notified. This replaces the JS distance-check loop in `AIManager.update()`.
