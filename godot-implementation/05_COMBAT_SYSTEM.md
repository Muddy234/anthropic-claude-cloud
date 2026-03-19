# Work Package 05: Combat System Decomposition

## Objective
Decompose the 4601-line `combat-master.js` god object and 12 satellite files (~12,900 total lines) into 10+ focused Godot components with clean signal-based communication. Preserve exact damage formulas, status effect definitions, and all combat math.

## Dependencies
- WP01: Constants, EventBus, GameManager, SystemManager
- WP02: Resource classes (MonsterData, ItemData, SkillData, BoonData, WeaponData)
- WP03: Vision system (light radius for searing_radiance), inventory, stamina resource
- WP04: Entity base class, Player, Enemy, NPC, Boss, EnemyAI FSM

## Source Files to Reference

| JS File | Lines | Purpose |
|---------|-------|---------|
| `js/systems/combat-master.js` | 4,601 | God object: damage calc, status effects, projectiles, combat loop, mouse attacks, hotkeys, boon integration, dash, knockback, screen shake |
| `js/systems/damage-resolver.js` | 421 | Pure damage pipeline (delegates from DamageCalculator) |
| `js/systems/spell-system.js` | 1,084 | Spell selection, dash/heal/shield/fireball/frost_nova/blink |
| `js/systems/stamina-system.js` | 445 | Stamina resource: consume, regen, refund, exhaustion |
| `js/systems/kill-streak-system.js` | 433 | Consecutive kill tracking, tier rewards, decay |
| `js/systems/lingering-hazards.js` | 811 | Ground hazard zones: poison cloud, fire patch, ice slick, void zone, telegraph |
| `js/systems/projectile-manager.js` | 249 | Facade over CombatMaster projectile functions |
| `js/systems/ability-projectile-system.js` | 379 | Homing/tracking enemy ability projectiles |
| `js/systems/time-effects.js` | 273 | Time manipulation: slow, stop, dramatic slow for game feel |
| `js/systems/boon-system.js` | 2,409 | 70 boons across 7 Ancestors, shrine selection |
| `js/config/combat-config.js` | 130 | STAMINA_CONFIG, HITSTOP_CONFIG, KILL_STREAK_CONFIG |
| `js/data/weapon-armor-matrix.js` | ~200 | WEAPON_ARMOR_MATRIX, ELEMENT_MATRIX |
| `js/data/armor-defense.js` | ~150 | Armor defense values by type |

---

## Godot Target Architecture

```
scripts/
  systems/
    combat/
      damage_calculator.gd        # Pure damage math (Section 2 of combat-master.js)
      attack_resolver.gd          # Attack execution, hit detection, combo system
      status_effect_manager.gd    # Buffs, debuffs, DoTs, CCs
      projectile_system.gd        # Projectile spawn, movement, collision
      ability_projectile_system.gd # Homing/tracking ability projectiles
      combat_master.gd            # Orchestrator: engagement, combat loop, death
      spell_system.gd             # Dash/Heal/Shield/Fireball/FrostNova/Blink
      kill_streak_system.gd       # Consecutive kill tracking + rewards
      lingering_hazards.gd        # Ground hazard zones + telegraph
      time_effects.gd             # Time slow/stop for game feel
      boon_combat_integration.gd  # Boon on-hit/on-kill/on-damage effects
resources/
  config/
    combat_config.tres            # COMBAT_CONFIG + AMBUSH_CONFIG
    weapon_arc_config.tres        # WEAPON_ARC_CONFIG per weapon type
    magic_config.tres             # MAGIC_CONFIG per element
    stamina_config.tres           # STAMINA_CONFIG
    hitstop_config.tres           # HITSTOP_CONFIG
    kill_streak_config.tres       # KILL_STREAK_CONFIG
    hazard_types.tres             # HAZARD_TYPES definitions
```

---

## Component 1: DamageCalculator

**Source:** `combat-master.js` lines 404-740 (Section 2), `damage-resolver.js` lines 14-413

**Target:** `res://scripts/systems/combat/damage_calculator.gd`

### Properties
```gdscript
class_name DamageCalculator
extends RefCounted

# --- Config ---
var base_variance: float = 0.10         # +/-10% damage spread
var min_damage: int = 1                 # Floor
var crit_multiplier: float = 2.5        # Crit damage multiplier
var base_crit_chance: float = 0.05      # 5% base
var pierce_crit_bonus: float = 0.07     # +7% for pierce weapons
var defense_scaling: float = 0.015      # 1.5% reduction per defense point
var max_defense_reduction: float = 0.75 # Cap at 75%
```

### Core Method: calculate()
```gdscript
## 11-step damage pipeline. Returns DamageResult.
func calculate(attacker: Entity, defender: Entity) -> DamageResult:
    var result := DamageResult.new()

    # Step 1: Hit check
    if not _roll_hit(attacker, defender):
        result.is_hit = false
        return result

    # Step 2: Base damage
    result.raw_damage = _get_base_damage(attacker)

    # Step 3: Weapon vs Armor (Layer 1)
    var weapon_type := _get_weapon_damage_type(attacker)
    var armor_type := _get_armor_type(defender)
    result.weapon_armor_mod = _get_weapon_armor_modifier(weapon_type, armor_type)

    # Step 4: Element vs Element (Layer 2)
    var atk_element := _get_attack_element(attacker)
    var def_element := _get_defend_element(defender)
    result.element_mod = _get_element_modifier(atk_element, def_element)

    # Step 5: Defense reduction
    var defense := _get_defense(defender, weapon_type)
    result.defense_mod = _apply_defense(defense)

    # Step 6: Critical hit
    if _roll_crit(attacker):
        result.is_crit = true
        result.crit_mod = crit_multiplier

    # Step 7: Variance
    result.variance = 1.0 - base_variance + (randf() * base_variance * 2.0)

    # Step 8: Social bonuses (pack/swarm)
    result.social_mod = _get_social_modifier(attacker)

    # Step 9: Skill damage multiplier (player only)
    result.skill_mod = _get_skill_multiplier(attacker)

    # Step 10: Skill defense reduction (player defender only)
    result.skill_defense_mod = _get_skill_defense_reduction(defender)

    # Step 11: Final multiplication chain
    var damage := float(result.raw_damage)
    damage *= result.weapon_armor_mod
    damage *= result.element_mod
    damage *= result.defense_mod
    damage *= result.social_mod
    damage *= result.skill_mod
    damage *= result.skill_defense_mod
    damage *= result.crit_mod
    damage *= result.variance
    result.final_damage = max(min_damage, int(damage))

    return result
```

### Key Formulas

**Base Damage:**
```gdscript
## Weapon equipped: weapon.stats.damage + stat * 0.5
## Unarmed/monster: floor(stat * 0.5) + floor(stat / divisor)
## Stat scaling: STR for melee, AGI for ranged, INT for magic
## Divisor: magic=3, melee/ranged=5
func _get_base_damage(attacker: Entity) -> int:
    var weapon = attacker.get_equipped_weapon()
    if weapon and weapon.stats.damage > 0:
        return weapon.stats.damage + _get_stat_bonus(attacker, weapon)
    # Monster/unarmed fallback
    var stat := _get_scaling_stat(attacker)
    return int(stat * 0.5) + int(stat / _get_scaling_divisor(attacker))
```

**Hit Check:**
```gdscript
## Player always hits (deterministic - action roguelike design)
## Enemy hit chance: 0.90 + attacker_agi * 0.002 - defender_agi * 0.003
## Clamped to [0.50, 0.95]
func _roll_hit(attacker: Entity, defender: Entity) -> bool:
    if attacker.is_player:
        return true  # Player attacks never miss
    var hit_chance := 0.90
    hit_chance += attacker.stats.agi * 0.002
    hit_chance -= defender.stats.agi * 0.003
    hit_chance = clampf(hit_chance, 0.50, 0.95)
    return randf() < hit_chance
```

**Crit Check:**
```gdscript
## base_crit_chance + agi * 0.001 + weapon.crit_bonus + pierce_bonus
## Max 50%
func _roll_crit(attacker: Entity) -> bool:
    var crit_chance := base_crit_chance
    crit_chance += attacker.stats.agi * 0.001
    var weapon = attacker.get_equipped_weapon()
    if weapon and weapon.special.crit_bonus:
        crit_chance += weapon.special.crit_bonus
    if weapon and weapon.damage_type == "pierce":
        crit_chance += pierce_crit_bonus
    crit_chance = minf(0.50, crit_chance)
    return randf() < crit_chance
```

**Defense Reduction:**
```gdscript
## reduction = defense * defense_scaling, capped at max_defense_reduction
## Returns multiplier: 1.0 - capped
## Sources: base pDef/mDef + equipped armor + boon modifiers + status modifiers
func _apply_defense(defense: int) -> float:
    var reduction := defense * defense_scaling
    var capped := minf(reduction, max_defense_reduction)
    return 1.0 - capped
```

**Weapon-Armor Matrix (Layer 1):**
```gdscript
## Returns 1.0 + matrix_value. Positive = effective, negative = resisted.
const FALLBACK_MATRIX := {
    "blade":  {"unarmored": 0.30, "hide": 0.0, "scaled": 0.0, "armored": -0.30, "stone": -0.30, "bone": 0.0, "ethereal": 0.0},
    "blunt":  {"unarmored": 0.0, "hide": 0.0, "scaled": 0.0, "armored": 0.30, "stone": 0.30, "bone": 0.30, "ethereal": -0.30},
    "pierce": {"unarmored": 0.0, "hide": 0.30, "scaled": 0.30, "armored": -0.30, "stone": -0.30, "bone": 0.0, "ethereal": 0.30},
}
```

### DamageResult Class
```gdscript
class_name DamageResult
extends RefCounted

var final_damage: int = 0
var raw_damage: int = 0
var is_hit: bool = true
var is_crit: bool = false
var damage_type: String = "physical"

# Breakdown multipliers (all default 1.0)
var weapon_armor_mod: float = 1.0
var element_mod: float = 1.0
var defense_mod: float = 1.0
var crit_mod: float = 1.0
var variance: float = 1.0
var social_mod: float = 1.0
var skill_mod: float = 1.0
var skill_defense_mod: float = 1.0
```

### Signals
None -- pure calculation, no side effects.

### Dependencies
- `WeaponArmorMatrix` resource (from WP02)
- `ElementMatrix` resource (from WP02)
- Entity stats interface (from WP04)

---

## Component 2: AttackResolver

**Source:** `combat-master.js` lines 3500-4601 (Sections 10-11: Mouse Attack System, melee hit detection, combo, lunge, hitstop)

**Target:** `res://scripts/systems/combat/attack_resolver.gd`

### Properties
```gdscript
class_name AttackResolver
extends Node

# --- Mouse Attack State ---
var cooldown: float = 0.0
var is_swinging: bool = false
var swing_progress: float = 0.0
var swing_duration: float = 0.25         # seconds
var swing_direction: float = 0.0         # radians
var swing_arc_angle: float = 90.0        # degrees
var swing_range: float = 1.0             # tiles
var slash_style: String = "sweep"
var hit_enemies: Dictionary = {}         # Set equivalent

# --- Combo ---
var combo_count: int = 1                 # 1-3 hit combo
var combo_reset_timer: float = 0.0
var combo_decay_duration: float = 1.5    # seconds

# --- Input Buffer ---
var input_buffer_time: float = 0.0
var input_buffer_duration: float = 0.2   # seconds
var buffered_attack: bool = false

# --- Lunge ---
var is_lunging: bool = false
var lunge_progress: float = 0.0
var lunge_duration: float = 0.1          # seconds

# --- Hitstop ---
var hitstop_active: bool = false
var hitstop_timer: float = 0.0
var hitstop_duration: float = 0.05       # normal
var hitstop_crit_duration: float = 0.08  # on crit

# --- Active Window ---
var active_window_start: float = 0.15    # 15% of swing
var active_window_end: float = 0.85      # 85% of swing
```

### Key Methods

```gdscript
## Initiate a mouse/click attack. Handles stamina, combo cycling, exhaustion.
func perform_attack(player: Entity, direction: float) -> bool:
    # Check stamina
    if not StaminaSystem.can_afford("lightAttack"):
        return false
    # Consume stamina (combo finisher uses heavyAttack cost)
    var action := "heavyAttack" if combo_count == 3 else "lightAttack"
    StaminaSystem.consume_action(action)
    # Advance combo: 1 -> 2 -> 3 -> 1
    combo_count = (combo_count % 3) + 1
    combo_reset_timer = combo_decay_duration
    # Start swing
    _start_swing(player, direction)
    return true

## Check melee hit detection based on slash style.
## "sweep"/"chop"/"slam"/"alternate": arc-based (angle + distance)
## "thrust"/"jab": perpendicular distance check
func check_melee_hits(player: Entity, enemies: Array[Entity]) -> Array[Entity]:
    var hits: Array[Entity] = []
    for enemy in enemies:
        if hit_enemies.has(enemy.get_instance_id()):
            continue
        if _is_in_attack_arc(player, enemy):
            hits.append(enemy)
            hit_enemies[enemy.get_instance_id()] = true
    return hits

## Apply melee damage to a target. Handles ambush, crit effects, hitstop.
func apply_melee_damage(attacker: Entity, defender: Entity) -> void:
    var result := DamageCalculator.calculate(attacker, defender)
    if not result.is_hit:
        EventBus.emit_signal("combat_miss", attacker, defender)
        return
    # Ambush check
    var is_ambush := _check_ambush(attacker, defender)
    if is_ambush:
        result.final_damage = int(result.final_damage * AMBUSH_CONFIG.damage_multiplier)
        result.is_crit = true  # Guaranteed crit on ambush
    # Time effects on crit
    if result.is_crit:
        TimeEffects.trigger_dramatic_slow(150)
    # Apply damage through CombatMaster
    EventBus.emit_signal("damage_dealt", attacker, defender, result)
```

### Weapon Lunge Config
```gdscript
## Distance (in tiles) the player lurches forward on attack
const WEAPON_LUNGE := {
    "knife": 0.3, "unarmed": 0.15, "wand": 0.1, "sword": 0.5,
    "polearm": 0.6, "staff": 0.3, "axe": 0.75, "mace": 0.9, "shield": 0.45,
}
```

### Weapon Arc Config (from WEAPON_ARC_CONFIG)
```gdscript
## Per-weapon arc angle (degrees), range (tiles), ranged flag, slash style
const WEAPON_ARCS := {
    "sword":   {"arc_angle": 90, "arc_range": 1.56, "is_ranged": false, "slash_style": "sweep"},
    "knife":   {"arc_angle": 60, "arc_range": 1.04, "is_ranged": false, "slash_style": "alternate"},
    "axe":     {"arc_angle": 80, "arc_range": 1.69, "is_ranged": false, "slash_style": "chop"},
    "mace":    {"arc_angle": 60, "arc_range": 1.56, "is_ranged": false, "slash_style": "slam"},
    "unarmed": {"arc_angle": 60, "arc_range": 0.78, "is_ranged": false, "slash_style": "jab"},
    "polearm": {"arc_angle": 45, "arc_range": 2.6,  "is_ranged": false, "slash_style": "thrust"},
    "bow":     {"arc_angle": 0,  "arc_range": 0, "is_ranged": true, "projectile_speed": 8},
    "crossbow":{"arc_angle": 0,  "arc_range": 0, "is_ranged": true, "projectile_speed": 10},
    "staff":   {"arc_angle": 0,  "arc_range": 0, "is_ranged": true, "is_magic": true, "projectile_speed": 7},
    "wand":    {"arc_angle": 0,  "arc_range": 0, "is_ranged": true, "is_magic": true, "projectile_speed": 9},
    "tome":    {"arc_angle": 0,  "arc_range": 0, "is_ranged": true, "is_magic": true, "projectile_speed": 6},
}
```

### Signals
```gdscript
signal attack_started(attacker: Entity, direction: float, combo_count: int)
signal attack_hit(attacker: Entity, defender: Entity, result: DamageResult)
signal combo_advanced(new_count: int)
signal combo_reset()
signal hitstop_triggered(duration: float)
```

### Dependencies
- `DamageCalculator`
- `StaminaSystem` (stamina checks)
- `TimeEffects` (dramatic slow on crit)
- `CombatMaster` (damage application)
- Entity facing/position (from WP04)

---

## Component 3: StatusEffectManager

**Source:** `combat-master.js` lines 800-1200 (Section 3)

**Target:** `res://scripts/systems/combat/status_effect_manager.gd`

### Status Effect Definitions
```gdscript
## All 17 registered status effects with their default parameters
const EFFECTS := {
    # --- DoTs ---
    "burning":     {"category": "dot", "element": "fire",     "damage": 3, "interval": 1.0, "duration": 5.0, "stack": "refresh"},
    "poisoned":    {"category": "dot", "element": "nature",   "damage": 2, "interval": 1.5, "duration": 8.0, "stack": "refresh", "healing_mod": -0.50},
    "bleeding":    {"category": "dot", "element": "physical", "damage_percent": 0.05, "interval": 1.0, "duration": 5.0, "stack": "intensity"},
    "ignite":      {"category": "dot", "element": "fire",     "damage": 2, "interval": 1.0, "duration": 4.0, "stack": "refresh"},
    "rot":         {"category": "dot", "element": "poison",   "damage": 1, "interval": 1.0, "duration": 6.0, "stack": "intensity", "armor_reduction": 0.10},

    # --- CCs ---
    "fear":        {"category": "cc", "duration": 3.0, "stack": "refresh", "forces_flee": true},
    "stunned":     {"category": "cc", "duration": 2.0, "stack": "none"},
    "frozen":      {"category": "cc", "duration": 3.0, "stack": "none"},
    "rooted":      {"category": "cc", "duration": 4.0, "stack": "refresh"},

    # --- Debuffs ---
    "slow":        {"category": "debuff", "duration": 3.0, "stack": "intensity", "move_speed_mod": -0.15},
    "chilled":     {"category": "debuff", "duration": 3.0, "stack": "intensity", "move_speed_mod": -0.10, "attack_speed_mod": -0.10},
    "weakened":    {"category": "debuff", "duration": 5.0, "stack": "refresh", "damage_mod": -0.25},
    "vulnerable":  {"category": "debuff", "duration": 5.0, "stack": "refresh", "damage_taken_mod": 0.25},

    # --- Buffs ---
    "regenerating": {"category": "buff", "heal": 3, "interval": 1.0, "duration": 10.0, "stack": "refresh"},
    "strengthened": {"category": "buff", "duration": 8.0, "stack": "refresh", "damage_mod": 0.25},
    "hastened":     {"category": "buff", "duration": 6.0, "stack": "refresh", "move_speed_mod": 0.30, "attack_speed_mod": 0.20},
    "shielded":     {"category": "buff", "duration": 8.0, "stack": "refresh", "damage_taken_mod": -0.30},
}
```

### Stack Behaviors
```gdscript
## "refresh"   - Reset duration, keep intensity
## "intensity" - Add stacks (increase effect), refresh duration
## "duration"  - Extend duration, keep intensity
## "none"      - Blocked while active
```

### Key Methods
```gdscript
## Apply a status effect to a target entity.
## Handles stacking behavior per effect definition.
func apply_effect(target: Entity, effect_id: String, source: Entity = null, options: Dictionary = {}) -> void

## Remove a specific effect from a target.
func remove_effect(target: Entity, effect_id: String) -> void

## Update all active effects (tick damage, expire timers).
## Called every frame with delta time.
func update(dt: float) -> void

## Get total stat modifier from all active effects on an entity.
## e.g., get_stat_modifier(entity, "move_speed") -> -0.25
func get_stat_modifier(target: Entity, stat: String) -> float

## Check if entity has a specific effect.
func has_effect(target: Entity, effect_id: String) -> bool

## Get stack count for an effect.
func get_stacks(target: Entity, effect_id: String) -> int

## Clear all effects on a target (on death, floor change).
func clear_all(target: Entity) -> void
```

### Signals
```gdscript
signal effect_applied(target: Entity, effect_id: String, stacks: int)
signal effect_removed(target: Entity, effect_id: String)
signal effect_tick(target: Entity, effect_id: String, damage: int)
signal effect_expired(target: Entity, effect_id: String)
```

### Dependencies
- Entity status effects array (from WP04)
- `CombatMaster.apply_damage()` for DoT ticks

---

## Component 4: ProjectileSystem

**Source:** `combat-master.js` lines 1200-1500 (Section 4), `projectile-manager.js`

**Target:** `res://scripts/systems/combat/projectile_system.gd`

### Object Pool
```gdscript
## Reuse projectile objects to avoid GC pressure during bullet-hell scenarios.
## Pool size: 100 projectiles, 50 ghosts, 30 slash effects.
var _pool: Array[Projectile] = []
var _pool_max: int = 100

func _acquire() -> Projectile:
    for proj in _pool:
        if not proj.active:
            proj.active = true
            return proj
    if _pool.size() < _pool_max:
        var proj := Projectile.new()
        proj.active = true
        _pool.append(proj)
        return proj
    push_warning("[ProjectileSystem] Pool exhausted!")
    return Projectile.new()

func _release(proj: Projectile) -> void:
    proj.active = false
    proj.owner = null
    proj.target = null
```

### Projectile Data Class
```gdscript
class Projectile:
    var active: bool = false
    var x: float = 0.0
    var y: float = 0.0
    var display_x: float = 0.0
    var display_y: float = 0.0
    var target_x: float = 0.0
    var target_y: float = 0.0
    var target: Entity = null
    var dir_x: float = 0.0
    var dir_y: float = 0.0
    var velocity_x: float = 0.0
    var velocity_y: float = 0.0
    var speed: float = 8.0
    var distance_to_travel: float = 10.0
    var distance_traveled: float = 0.0
    var damage: int = 0
    var element: String = "physical"
    var owner: Entity = null
    var is_magic: bool = false
    var is_skill: bool = false
    var has_hit: bool = false
    var alpha: float = 1.0
    var is_direction_based: bool = false
```

### Key Methods
```gdscript
## Create a new projectile from config dictionary.
func spawn(config: Dictionary) -> Projectile

## Update all projectiles: movement, collision, lifecycle.
## Direction-based projectiles travel in a line.
## Target-based projectiles home toward their target.
func update(dt: float) -> void

## Check enemy collision: 0.4 tile hit radius.
func _check_enemy_collision(proj: Projectile, enemies: Array[Entity]) -> Entity

## Check wall/obstacle collision.
func _check_wall_collision(proj: Projectile) -> bool

## Bresenham line-of-sight check between two points.
func has_line_of_sight(x1: float, y1: float, x2: float, y2: float) -> bool

## Clear all active projectiles.
func cleanup() -> void
```

### Signals
```gdscript
signal projectile_spawned(proj: Projectile)
signal projectile_hit(proj: Projectile, target: Entity)
signal projectile_expired(proj: Projectile)
```

### Dependencies
- Game map data (wall checks)
- Enemy list (collision)
- `DamageCalculator` (on hit)

---

## Component 5: AbilityProjectileSystem

**Source:** `ability-projectile-system.js` (379 lines)

**Target:** `res://scripts/systems/combat/ability_projectile_system.gd`

### Properties
```gdscript
class_name AbilityProjectileSystem
extends Node

var projectiles: Array[AbilityProjectile] = []
var _next_id: int = 1
```

### AbilityProjectile Data
```gdscript
class AbilityProjectile:
    var id: int = 0
    var x: float = 0.0
    var y: float = 0.0
    var direction: float = 0.0          # radians
    var speed: float = 180.0            # pixels/sec
    var homing: bool = false
    var turn_rate: float = 0.0          # radians/sec (converted from degrees)
    var color: Color = Color("#FF4400")
    var trail_color: Color = Color("#FF8800")
    var radius: float = 8.0             # pixels
    var damage: int = 10
    var enemy_id: int = -1
    var ability_id: String = ""
    var persists_after_caster_death: bool = false
    var max_lifetime: float = 5000.0    # ms
    var lifetime: float = 0.0
    var trail_positions: Array[Vector2] = []
    var alive: bool = true
```

### Key Methods
```gdscript
## Spawn a homing/tracking ability projectile.
func spawn(config: Dictionary) -> int

## Spawn a burst of projectiles with spread pattern.
## config.count (default 3), config.spread_degrees (default 30)
func spawn_burst(config: Dictionary) -> Array[int]

## Update all: movement, homing, collision (0.5 tile player hitbox).
func update(delta_time: float) -> void

## Apply status effects from ABILITY_EFFECTS config on hit.
func _apply_status_effect(target: Entity, ability_id: String, enemy_id: int) -> void

## Remove projectiles from a dead enemy (unless persists_after_caster_death).
func cancel_by_enemy(enemy_id: int) -> void

## Clear all.
func clear() -> void
```

### Signals
```gdscript
signal ability_projectile_hit(target: Entity, ability_id: String, damage: int)
signal ability_projectile_spawned(id: int)
```

---

## Component 6: CombatMaster (Orchestrator)

**Source:** `combat-master.js` lines 1500-2500 (Sections 5-7: core combat loop, engagement, death, XP, boon integration)

**Target:** `res://scripts/systems/combat/combat_master.gd`

### Properties
```gdscript
class_name CombatMaster
extends Node

# --- Config ---
var base_attack_time: float = 440.0       # ms
var engage_delay: float = 0.4             # seconds
var combat_disengage_time: float = 30000  # ms without combat -> disengage

# --- Weapon attack times (ms) ---
const WEAPON_ATTACK_TIMES := {
    "knife": 250, "unarmed": 275, "wand": 315, "sword": 440,
    "axe": 565, "mace": 625, "polearm": 500, "staff": 440,
    "bow": 375, "crossbow": 565, "tome": 500,
}

# --- Ambush config ---
var ambush_damage_multiplier: float = 1.5
var ambush_guaranteed_crit: bool = true
var ambush_side_angle_threshold: float = 60.0  # degrees
var ambush_unaware_states: Array[String] = ["idle", "wandering", "returning", "searching"]

# --- XP reward tiers ---
const XP_REWARDS := {
    "TIER_3": 15, "TIER_2": 30, "TIER_1": 55, "ELITE": 100, "BOSS": 500,
}

# --- Screen Shake ---
var screen_shake_offset: Vector2 = Vector2.ZERO
var screen_shake_timer: float = 0.0
var screen_shake_intensity: float = 0.0

# --- Knockback ---
var wall_damage_percent: float = 0.10  # 10% maxHP on wall slam
```

### Key Methods
```gdscript
## Engage two entities in combat. Sets isInCombat, resets timers.
func engage_combat(entity_a: Entity, entity_b: Entity) -> void

## Disengage from combat. Called after timeout or flee.
func disengage_combat(entity: Entity) -> void

## Core combat update loop (called per frame).
## Handles auto-attack timing, engagement checks, attack execution.
func update_combat(dt: float) -> void

## Apply damage to a target. Handles:
## - I-frame check
## - Shield absorption (SpellSystem)
## - Status effect damage modifiers (vulnerable, weakened, shielded)
## - Boon damage reduction
## - Kill streak reset (on player damage)
## - Hit flash visual
func apply_damage(target: Entity, damage: int, source: Entity, context: Dictionary = {}) -> void

## Handle entity death. Distributes:
## - XP by tier
## - Loot drops
## - Skill XP
## - BoonCombatIntegration.on_kill()
## - KillStreakSystem.on_kill()
## - StaminaSystem.on_kill()
func handle_death(entity: Entity, killer: Entity) -> void

## Check ambush conditions: enemy is unaware + player attacks from outside frontal cone.
## Frontal cone = 60 degrees from enemy facing direction.
func check_ambush(attacker: Entity, defender: Entity) -> bool

## Apply knockback to entity in direction. Checks walkability, applies wall damage.
func apply_knockback(target: Entity, direction: Vector2, distance: float) -> void

## Trigger screen shake (random or directional).
func trigger_screen_shake(intensity: float, duration: float, direction: Vector2 = Vector2.ZERO) -> void
```

### Signals
```gdscript
signal combat_engaged(entity_a: Entity, entity_b: Entity)
signal combat_disengaged(entity: Entity)
signal damage_applied(target: Entity, damage: int, source: Entity, is_crit: bool)
signal entity_died(entity: Entity, killer: Entity)
signal ambush_triggered(attacker: Entity, defender: Entity)
signal knockback_applied(target: Entity, distance: float)
signal screen_shake_triggered(intensity: float)
signal xp_awarded(entity: Entity, amount: int)
```

### Dependencies
- `DamageCalculator`
- `StatusEffectManager`
- `SpellSystem` (shield absorption)
- `KillStreakSystem`
- `StaminaSystem`
- `BoonCombatIntegration`
- Entity system (from WP04)

---

## Component 7: SpellSystem

**Source:** `spell-system.js` (1,084 lines)

**Target:** `res://scripts/systems/combat/spell_system.gd`

### Spell Definitions
```gdscript
const SPELLS := {
    "dash": {
        "name": "Dash", "cooldown": 1.0, "stamina_cost": 15,
        "uses_dodge_system": true,
    },
    "heal": {
        "name": "Heal", "cooldown": 35.0, "stamina_cost": 0,
        "heal_percent": 0.35,  # 35% of max HP
    },
    "shield": {
        "name": "Shield", "cooldown": 40.0, "stamina_cost": 0,
        "shield_percent": 0.50, "shield_duration": 10.0,
    },
    "fireball": {
        "name": "Fireball", "cooldown": 12.0, "stamina_cost": 20,
        "damage": 35, "element": "fire", "projectile_speed": 8, "max_range": 10,
    },
    "frost_nova": {
        "name": "Frost Nova", "cooldown": 18.0, "stamina_cost": 25,
        "damage": 20, "element": "ice", "radius": 3, "slow_duration": 3.0, "slow_amount": 0.5,
    },
    "blink": {
        "name": "Blink", "cooldown": 8.0, "stamina_cost": 15,
        "distance": 5,
    },
}
```

### Properties
```gdscript
class_name SpellSystem
extends Node

var selected_spell: String = "dash"      # Spacebar slot
var cooldowns: Dictionary = {}           # { spell_id: remaining_seconds }
var active_shield: Dictionary = {}       # { amount, max_amount, timer } or empty
```

### Key Methods
```gdscript
## Cast a spell from slot index (0-3).
## Handles: CC check, cooldown check, stamina check, execution, cooldown start.
func cast_slot(slot_index: int) -> bool

## Spacebar activation (legacy - routes to selected spell).
func try_activate(player: Entity) -> bool

## Absorb damage with active shield. Returns remaining damage after absorption.
func absorb_damage(damage: int) -> int

## Get effective cooldown accounting for CDR boons.
## Formula: max(0.5, base_cd * (1 - cdr / 100))
func get_effective_cooldown(spell_id: String) -> float

## Update cooldowns and shield duration each frame.
func update(dt: float) -> void
```

### Signals
```gdscript
signal spell_cast(player: Entity, spell_id: String, slot: int)
signal spell_heal(player: Entity, heal_amount: int)
signal spell_shield_activated(player: Entity, shield_amount: int)
signal shield_broken()
signal shield_expired()
```

### Dependencies
- `DodgeSystem` (for dash spell)
- `StaminaSystem` (stamina costs)
- `ProjectileSystem` (fireball projectile)
- `LingeringHazards` (frost nova creates ice_slick)
- `StatusEffectManager` (frost nova applies chilled)

---

## Component 8: KillStreakSystem

**Source:** `kill-streak-system.js` (433 lines), `combat-config.js` lines 90-119

**Target:** `res://scripts/systems/combat/kill_streak_system.gd`

### Properties
```gdscript
class_name KillStreakSystem
extends Node

# --- State ---
var current_streak: int = 0
var highest_streak: int = 0
var highest_tier: int = 0
var total_streaks: int = 0       # Streaks of 3+ kills
var decay_timer: float = 0.0
var current_tier: Dictionary = {}
var total_kills_this_run: int = 0
var last_kill_time: float = 0.0
```

### Tier Config
```gdscript
const TIERS := [
    {"kills": 2,  "name": "Double Kill",   "color": "#c0c0c0", "sound": "streak_2"},
    {"kills": 4,  "name": "Killing Spree", "color": "#4a9eff", "sound": "streak_4"},
    {"kills": 6,  "name": "Rampage",       "color": "#9b4dca", "sound": "streak_6"},
    {"kills": 8,  "name": "Unstoppable",   "color": "#ff6b35", "sound": "streak_8"},
    {"kills": 10, "name": "Godlike",       "color": "#ffd700", "sound": "streak_10"},
]

## Gold/XP multiplier bonuses per tier index
const TIER_BONUSES := {
    0: 1.0,    # No streak
    1: 1.1,    # Double Kill - 10%
    2: 1.25,   # Killing Spree - 25%
    3: 1.5,    # Rampage - 50%
    4: 2.0,    # Unstoppable - 100%
    5: 3.0,    # Godlike - 200%
}

var decay_time: float = 5.0       # seconds without kill before decay
var decay_per_tick: int = 1       # kills lost per decay
var reset_on_damage: bool = true
```

### Key Methods
```gdscript
## Called when player kills an enemy. Increments streak, checks tier upgrade.
func on_kill(enemy: Entity) -> void

## Called when player takes damage. Resets streak if reset_on_damage.
func on_damage_taken(damage: int, source: Entity) -> void

## Get current gold/XP multiplier based on tier.
func get_current_bonus_multiplier() -> float

## Update decay timer. One kill lost per tick when timer expires.
func update(dt: float) -> void

## Reset all state (new run).
func reset() -> void

## Get run summary for death screen.
func get_streak_data() -> Dictionary
```

### Signals
```gdscript
signal tier_changed(tier: Dictionary)
signal streak_lost(streak_count: int, reason: String)
signal kill_registered(current_streak: int)
```

### EventBus Subscriptions
```gdscript
## Connect in _ready():
EventBus.connect("enemy_died", _on_enemy_died)
EventBus.connect("player_damage_taken", _on_player_damage_taken)
```

---

## Component 9: LingeringHazards

**Source:** `lingering-hazards.js` (811 lines)

**Target:** `res://scripts/systems/combat/lingering_hazards.gd`

### Hazard Type Definitions
```gdscript
const HAZARD_TYPES := {
    "poison_cloud": {
        "color": "#00ff00", "particle_color": "#33ff33",
        "damage": 3, "tick_interval": 1.0, "duration": 8.0,
        "status_effect": "poisoned", "status_duration": 5.0,
        "element": "poison", "opacity": 0.4
    },
    "fire_patch": {
        "color": "#ff4400", "particle_color": "#ff8844",
        "damage": 5, "tick_interval": 0.5, "duration": 6.0,
        "status_effect": "burning", "status_duration": 3.0,
        "element": "fire", "opacity": 0.5
    },
    "ice_slick": {
        "color": "#44aaff", "particle_color": "#88ccff",
        "damage": 0, "tick_interval": 0.5, "duration": 5.0,
        "status_effect": "chilled", "status_duration": 2.0,
        "element": "ice", "opacity": 0.35, "slow_amount": 0.5
    },
    "void_zone": {
        "color": "#8800cc", "particle_color": "#aa44ff",
        "damage": 8, "tick_interval": 0.8, "duration": 4.0,
        "status_effect": null,
        "element": "shadow", "opacity": 0.6
    },
}
```

### Key Methods
```gdscript
## Create a cone-shaped poison cloud.
func create_poison_cloud(x: float, y: float, direction: float,
    cone_angle: float, radius: float, duration_ms: float,
    damage_per_tick: int, tick_interval_ms: float) -> Dictionary

## Create a circular hazard zone.
func create_circular_zone(x: float, y: float, radius: float,
    duration_ms: float, damage_per_tick: int, tick_interval_ms: float,
    type: String = "generic") -> Dictionary

## Create from config object (unified interface).
func create_hazard_zone(config: Dictionary) -> Dictionary

## Create with telegraph warning phase before activation.
## Telegraph: pulsing circle at 4Hz, opacity oscillates 0.2-0.5.
func create_telegraphed_hazard(config: Dictionary) -> Dictionary

## Convenience wrappers
func create_fire_patch(x: float, y: float, radius: float, options: Dictionary = {}) -> Dictionary
func create_ice_slick(x: float, y: float, radius: float, options: Dictionary = {}) -> Dictionary
func create_void_zone(x: float, y: float, radius: float, options: Dictionary = {}) -> Dictionary

## Update all zones: telegraph phase, damage ticks, particle effects, expiry.
func update(delta_time: float, player: Entity) -> void

## Point-in-zone check. Cone: angle + radius. Circle: distance.
func is_point_in_zone(px: float, py: float, zone: Dictionary) -> bool

## Apply damage through CombatMaster.apply_damage() + optional status effect.
func _apply_zone_damage(target: Entity, zone: Dictionary) -> void

## Clear all zones (floor transition).
func clear() -> void
```

### Signals
```gdscript
signal hazard_created(type: String, position: Vector2, radius: float, element: String)
signal hazard_damage(target: Entity, damage: int, type: String, element: String)
signal hazard_expired(type: String, position: Vector2)
signal hazard_avoided()  # Player was in telegraph but moved out before activation
```

### Dependencies
- `StatusEffectManager` (apply effects on zone contact)
- `CombatMaster` (route damage for proper shield/iframe handling)

---

## Component 10: TimeEffects

**Source:** `time-effects.js` (273 lines)

**Target:** `res://scripts/systems/combat/time_effects.gd`

### Properties
```gdscript
class_name TimeEffects
extends Node

var time_scale: float = 1.0       # Current (1.0 = normal, 0 = stopped)
var slow_timer: float = 0.0       # Remaining slow duration
var target_scale: float = 1.0     # Target during slow
var ease_out_timer: float = 0.0
var ease_out_duration: float = 0.05  # 50ms ease-out

# Visual feedback
var vignette: bool = false
var desaturate: bool = false
var intensity: float = 0.0        # 0-1 for visual effects
```

### Key Methods
```gdscript
## Trigger a time slow. Only applies if slower than current effect.
## factor: 0.5 = half speed. Duration in ms.
func trigger_slow(duration_ms: float, factor: float = 0.5, options: Dictionary = {}) -> void

## Convenience presets:
func trigger_stop(duration_ms: float) -> void          # factor=0
func trigger_impact_slow(duration_ms: float) -> void    # factor=0.7, no vignette
func trigger_dramatic_slow(duration_ms: float) -> void  # factor=0.3, vignette

## Update each frame with real (unscaled) dt. Returns scaled dt for game systems.
func update(real_dt: float) -> float

## Easing: t * (2 - t)
func _ease_out_quad(t: float) -> float

## Get current scale, check if slowed
func get_scale() -> float
func is_slowed() -> bool
```

### Signals
```gdscript
signal time_slow_started(factor: float, duration_ms: float)
signal time_slow_ended()
```

---

## Component 11: BoonCombatIntegration

**Source:** `combat-master.js` lines 2500-3500 (Section 7), `boon-system.js`

**Target:** `res://scripts/systems/combat/boon_combat_integration.gd`

### On-Hit Effects
```gdscript
## Called when player hits an enemy. Applies boon-triggered effects:
## - kindled_blade: Apply ignite
## - glacial_pace: Apply chill
## - corrosive_touch: Apply rot
## - rusted_edge: On crit, apply slow
## - unseen_terror: On backstab, apply fear
func apply_on_hit_effects(attacker: Entity, defender: Entity, result: DamageResult) -> void
```

### On-Kill Effects
```gdscript
## Called when player kills an enemy:
## - executioners_gait: +20% move speed for 3s
## - leech_spores: Heal 5 HP if target had rot
## - life_of_the_flame: Restore torch fuel
func apply_on_kill_effects(killer: Entity, victim: Entity) -> void
```

### Damage Multipliers
```gdscript
## Returns total damage multiplier from all active boons.
## Stacks multiplicatively.
func get_damage_multiplier(attacker: Entity, defender: Entity) -> float:
    var multiplier := 1.0
    # glass_cannon: 2x damage (always)
    if _has_boon("glass_cannon"):
        multiplier *= 2.0
    # dark_pact: 2x when torch off
    if _has_boon("dark_pact") and not _torch_on():
        multiplier *= 2.0
    # the_cull: 2x vs enemies below 20% HP
    if _has_boon("the_cull") and defender.hp < defender.max_hp * 0.20:
        multiplier *= 2.0
    # deep_cut: 3x on ambush attacks
    if _has_boon("deep_cut") and _is_ambush:
        multiplier *= 3.0
    # searing_radiance: +15% per stack vs enemies in light radius
    if _has_boon("searing_radiance") and _in_light(defender):
        multiplier *= 1.0 + 0.15 * _get_stacks("searing_radiance")
    # festering_wounds: +10% per stack vs enemies with DoTs
    if _has_boon("festering_wounds") and _has_dot(defender):
        multiplier *= 1.0 + 0.10 * _get_stacks("festering_wounds")
    # shatter_strike: +40% per stack vs chilled/frozen
    if _has_boon("shatter_strike") and _is_chilled_or_frozen(defender):
        multiplier *= 1.0 + 0.40 * _get_stacks("shatter_strike")
    # paranoia: +50% damage, -20% visibility
    if _has_boon("paranoia"):
        multiplier *= 1.5
    # final_offer: 5x legendary
    if _has_boon("final_offer"):
        multiplier *= 5.0
    return multiplier
```

### Armor Modifier
```gdscript
## Rot stacks reduce target armor by 10% per stack (max 100%).
func get_armor_modifier(defender: Entity) -> float:
    var rot_stacks := StatusEffectManager.get_stacks(defender, "rot")
    if rot_stacks > 0:
        return maxf(0.0, 1.0 - 0.10 * rot_stacks)
    return 1.0
```

### Ticking Boon Effects
```gdscript
## Called each frame to process boon tick effects:
## - life_of_the_flame: +1% HP/s regen when torch is on
## - blood_for_fuel: -1 HP per 5s drain
## - dark_pact: -1 HP/s when torch is off
## - immolation_aura: Self fire damage + AoE fire to nearby enemies
## - plague_bearer: AoE rot to nearby enemies
func update(dt: float) -> void
```

### Dependencies
- Player boon inventory (from WP02 BoonData resources)
- `StatusEffectManager` (apply effects)
- `CombatMaster` (damage application)
- Vision system (light radius checks, from WP03)

---

## Component 12: StaminaSystem

**Source:** `stamina-system.js` (445 lines), `combat-config.js` lines 9-39

**Target:** `res://scripts/systems/combat/stamina_system.gd`

This component was already partially documented in WP03, but the combat-specific interface is detailed here for integration.

### Config (from STAMINA_CONFIG)
```gdscript
var max_stamina: int = 100
var costs := {
    "lightAttack": 10, "heavyAttack": 10,
    "dodge": 25, "dash": 15, "block": 5,
}
var regen_rate: float = 4.0           # per second
var regen_delay: float = 0.0          # no delay
var in_combat_regen_multiplier: float = 1.0
var kill_refund: int = 25
var perfect_dodge_refund: int = 15
var exhausted_threshold: int = 20
var exhausted_speed_penalty: float = 0.7
var segment_value: int = 20
```

### Key Combat Methods
```gdscript
## Check if player can afford an action without consuming.
func can_afford(action_type: String) -> bool

## Consume stamina for an action. Returns false if insufficient.
func consume(amount: int, action_type: String = "unknown") -> bool
func consume_action(action_type: String) -> bool  # Looks up cost by type

## Refund stamina (on kill, perfect dodge).
func refund(amount: int, reason: String = "unknown") -> void

## Get exhaustion modifier for attack cooldown (1.0 normal, 0.7 exhausted).
func get_exhaustion_modifier() -> float

## Event handlers
func on_kill() -> void             # Refund kill_refund stamina
func on_perfect_dodge() -> void    # Refund perfect_dodge_refund

## Boon-aware getters (check player statStacks first, fallback to config)
func get_max_stamina() -> int
func get_regen_rate() -> float
func get_kill_refund() -> int
```

### Signals
```gdscript
signal stamina_exhausted(current: int)
signal stamina_recovered(current: int, max_val: int)
signal stamina_consumed(amount: int, action: String)
signal stamina_refunded(amount: int, reason: String)
```

### EventBus Subscriptions
```gdscript
EventBus.connect("enemy_died", _on_enemy_died)  # -> on_kill()
```

---

## EventBus Signal Catalog (Combat-Related)

All combat signals routed through the EventBus autoload for decoupled communication.

| Signal | Emitter | Consumers | Payload |
|--------|---------|-----------|---------|
| `enemy_died` | CombatMaster | KillStreakSystem, StaminaSystem, BoonCombatIntegration | `{enemy: Entity}` |
| `player_damage_taken` | CombatMaster | KillStreakSystem | `{amount: int, source: Entity}` |
| `damage_dealt` | AttackResolver | CombatMaster | `{attacker, defender, result: DamageResult}` |
| `combat_engaged` | CombatMaster | UI, AI | `{entity_a, entity_b}` |
| `combat_disengaged` | CombatMaster | UI, AI | `{entity}` |
| `combat_miss` | AttackResolver | UI | `{attacker, defender}` |
| `ambush_triggered` | CombatMaster | UI, Audio | `{attacker, defender}` |
| `status_effect_applied` | StatusEffectManager | UI, AI | `{target, effect_id, stacks}` |
| `status_effect_removed` | StatusEffectManager | UI, AI | `{target, effect_id}` |
| `spell_cast` | SpellSystem | UI, Audio | `{player, spell_id, slot}` |
| `spell_shield_activated` | SpellSystem | UI | `{player, shield_amount}` |
| `shield_broken` | SpellSystem | UI, Audio | `{}` |
| `kill_streak_tier_changed` | KillStreakSystem | UI, Audio | `{tier: Dictionary}` |
| `kill_streak_lost` | KillStreakSystem | UI | `{count, reason}` |
| `hazard_created` | LingeringHazards | UI | `{type, position, radius, element}` |
| `hazard_damage` | LingeringHazards | UI | `{target, damage, type, element}` |
| `stamina_exhausted` | StaminaSystem | UI, AttackResolver | `{current: int}` |
| `stamina_recovered` | StaminaSystem | UI | `{current, max}` |
| `time_slow_started` | TimeEffects | Renderer | `{factor, duration}` |
| `projectile_hit` | ProjectileSystem | CombatMaster | `{proj, target}` |

---

## Circular Dependency Resolution

The JS codebase has circular references between combat systems. In Godot, these are resolved via signals through EventBus.

### Problem Cycles
```
CombatMaster -> KillStreakSystem (on kill) -> CombatMaster (multiplier query)
CombatMaster -> BoonCombatIntegration (on hit) -> StatusEffectManager -> CombatMaster (DoT damage)
SpellSystem -> ProjectileSystem (fireball) -> CombatMaster (on hit) -> SpellSystem (shield check)
```

### Resolution Pattern
```gdscript
## Instead of direct method calls that create cycles:
##   CombatMaster.handle_death() -> KillStreakSystem.on_kill()
##
## Use signals through EventBus:
##   CombatMaster.handle_death() -> EventBus.emit("enemy_died", {enemy})
##   KillStreakSystem._ready() -> EventBus.connect("enemy_died", _on_enemy_died)
##
## For queries (get_damage_multiplier), use service locator pattern:
##   var multiplier := BoonCombatIntegration.get_damage_multiplier(attacker, defender)
##   # BoonCombatIntegration has no dependency on CombatMaster for this method
```

### Initialization Order
Systems register with SystemManager at specific priorities to ensure correct startup:

| Priority | System | Reason |
|----------|--------|--------|
| 10 | Constants | Config values needed by all |
| 15 | StaminaSystem | Resource needed before combat |
| 20 | StatusEffectManager | Effects referenced by combat |
| 24 | SpellSystem | Before dodge at 25 |
| 25 | DodgeSystem | Before combat at 30 |
| 30 | AttackResolver | Before master at 35 |
| 35 | CombatMaster | Main orchestrator |
| 40 | KillStreakSystem | After master (reacts to kills) |
| 45 | CombatEnhancementsSystem | After master (screen shake, etc.) |
| 50 | BoonCombatIntegration | After combat (reacts to hits/kills) |

---

## Magic Element Config

From `combat-master.js` MAGIC_CONFIG (lines 236-283):

```gdscript
const MAGIC_ELEMENTS := {
    "fire":      {"base_damage": 15, "mana_cost": 15, "cooldown": 12, "burn_chance": 0.30, "burn_duration": 5, "burn_damage": 1},
    "lightning":  {"base_damage": 10, "mana_cost": 12, "cooldown": 6},
    "ice":       {"base_damage": 10, "mana_cost": 12, "cooldown": 10, "freeze_chance": 0.30, "freeze_duration": 2},
    "necromancy": {"base_damage": 8,  "mana_cost": 10, "cooldown": 5, "lifesteal_percent": 0.20},
    "arcane":    {"base_damage": 12, "mana_cost": 12, "cooldown": 8},
    "holy":      {"base_damage": 12, "mana_cost": 12, "cooldown": 8},
    "dark":      {"base_damage": 10, "mana_cost": 10, "cooldown": 7},
    "death":     {"base_damage": 10, "mana_cost": 10, "cooldown": 7},
}
```

---

## Hitstop Config

From `combat-config.js` HITSTOP_CONFIG (lines 44-85):

```gdscript
## Weapon weight classes (duration in ms)
const HITSTOP_WEAPON_CLASS := {"light": 30, "medium": 50, "heavy": 100}

## Weapon -> weight mapping
const HITSTOP_WEAPON_WEIGHTS := {
    "knife": "light", "dagger": "light", "sword": "medium",
    "spear": "medium", "polearm": "medium", "axe": "heavy",
    "mace": "heavy", "hammer": "heavy", "unarmed": "light",
}

## Multipliers (stack multiplicatively)
const HITSTOP_MULTIPLIERS := {
    "combo_finisher": 1.5, "critical": 2.0,
    "ambush": 1.3, "killing": 2.5,
}

## Caps and thresholds
var max_hitstop: float = 250.0            # ms
var screen_shake_threshold: float = 80.0  # ms - add shake above this
var time_slow_threshold: float = 150.0    # ms - brief time slow above this
var time_slow_duration: float = 100.0     # ms
var time_slow_factor: float = 0.5
```

---

## Weapon Effects on Hit

From `combat-master.js` Section 6 (performAttack):

```gdscript
## Applied after damage calculation in the combat loop:
## - Blade weapons: 15% chance to apply "bleeding" status
## - Blunt weapons: 15% chance to apply "stunned" status
## - Elemental weapons: 10% * element_power chance to apply element-specific DoT
func _apply_weapon_effects(attacker: Entity, defender: Entity, weapon_type: String) -> void:
    match weapon_type:
        "blade":
            if randf() < 0.15:
                StatusEffectManager.apply_effect(defender, "bleeding", attacker)
        "blunt":
            if randf() < 0.15:
                StatusEffectManager.apply_effect(defender, "stunned", attacker)
    # Elemental check
    var element = attacker.get_equipped_weapon().element
    if element and element != "physical":
        var power = attacker.get_equipped_weapon().element_power or 1.0
        if randf() < 0.10 * power:
            _apply_element_effect(defender, element, attacker)
```

---

## The 7 Ancestors (Boon System Overview)

From `boon-system.js` (70 boons total: 21 Core + 42 Resonance + 7 Legendary):

| Ancestor | Element | Theme | Core Boons |
|----------|---------|-------|------------|
| Torchbearer | Fire | Light, fire damage, visibility | searing_radiance, kindled_blade, desperate_ember |
| Headsman | Physical | Execution, bleeding, crits | rusted_edge, the_cull, executioners_gait |
| Lurker | Shadow | Stealth, ambush, fear | cloak_of_shadows, deep_cut, unseen_terror |
| Storm-Caller | Lightning | Speed, movement, knockback | static_buildup, thunderclap_dash, kinetic_discharge |
| Rot-Weaver | Poison | DoTs, armor reduction, lifesteal | corrosive_touch, festering_wounds, leech_spores |
| Iron-Warden | Ice | Defense, frost, standing ground | stone_stance, glacial_pace, shatter_strike |
| Maniac | Chaos | Risk/reward, self-damage, power | frenzied_swing, blood_for_fuel, glass_cannon |

### Boon Tier Unlock Rules
```
Core (21 boons):     Always available at shrines
Resonance (42 boons): Requires 1+ boon from each of 2 different Ancestors
Legendary (7 boons):  Requires 3+ boons from the same Ancestor
```

### Boon Power Formula
```
Total Damage = (Gear_Base * Skill_Multiplier) * (1 + Boon_Bonus)
```

### Config
```gdscript
var max_boons: int = 8
var shrine_boons_offered: int = 3
var clear_on_death: bool = true
var resonance_requirement: int = 1   # boons from each of 2 ancestors
var legendary_requirement: int = 3   # boons from same ancestor
```

---

## Verification Checklist

### DamageCalculator
- [ ] 11-step pipeline produces identical results to JS DamageResolver.calculate()
- [ ] Weapon-armor matrix matches FALLBACK_MATRIX values exactly
- [ ] Defense formula: `1.0 - min(defense * 0.015, 0.75)`
- [ ] Crit chance capped at 50%
- [ ] Player attacks always hit (no miss roll)
- [ ] Enemy hit chance: `clamp(0.90 + agi*0.002 - agi*0.003, 0.50, 0.95)`
- [ ] Minimum damage floor = 1
- [ ] Variance: `1.0 - 0.10 + randf() * 0.20`
- [ ] Crit multiplier = 2.5x

### AttackResolver
- [ ] 3-hit combo: count 1 (left), 2 (right), 3 (special, 1.5x damage)
- [ ] Combo decay at 1.5 seconds
- [ ] Input buffer window: 0.2 seconds
- [ ] Active hit window: 15%-85% of swing progress
- [ ] Lunge distances match WEAPON_LUNGE_CONFIG per weapon type
- [ ] Sweep hit detection: angle check within arc
- [ ] Thrust/jab hit detection: perpendicular distance check

### StatusEffectManager
- [ ] All 17 effects registered with correct defaults
- [ ] Stack behaviors: refresh/intensity/duration/none work correctly
- [ ] DoT ticking applies damage at correct intervals
- [ ] CC effects prevent movement/action appropriately
- [ ] Stat modifiers aggregate correctly from multiple sources

### CombatMaster
- [ ] Ambush: 1.5x damage + guaranteed crit when attacking from behind (>60 degrees from facing)
- [ ] Ambush only works on unaware enemies (idle/wandering/returning/searching)
- [ ] XP tiers: TIER_3=15, TIER_2=30, TIER_1=55, ELITE=100, BOSS=500
- [ ] Shield absorption happens before HP damage
- [ ] I-frame check blocks damage during dodge
- [ ] Knockback wall collision: 10% maxHP damage
- [ ] Combat auto-disengage after 30 seconds

### SpellSystem
- [ ] Heal: 35% of max HP, 35s cooldown
- [ ] Shield: 50% of max HP, 10s duration, 40s cooldown, no stacking
- [ ] Fireball: 35 damage, fire element, speed 8, range 10, 12s cooldown
- [ ] Frost Nova: 20 damage, ice AoE radius 3, 3s slow at 50%, 18s cooldown
- [ ] Blink: 5 tile teleport, wall collision stops, 8s cooldown
- [ ] CDR formula: `max(0.5, base_cd * (1 - cdr / 100))`

### KillStreakSystem
- [ ] Tiers at: 2, 4, 6, 8, 10 kills
- [ ] Multipliers: 1.0, 1.1, 1.25, 1.5, 2.0, 3.0
- [ ] Decay: 5s timer, lose 1 kill per tick
- [ ] Reset on any damage
- [ ] Syncs to runStats for death screen

### LingeringHazards
- [ ] Poison cloud: 3 dmg/1s/8s, cone shape, applies poisoned
- [ ] Fire patch: 5 dmg/0.5s/6s, circle, applies burning
- [ ] Ice slick: 0 dmg/0.5s/5s, circle, applies chilled, 50% slow
- [ ] Void zone: 8 dmg/0.8s/4s, circle, no status effect
- [ ] Telegraph: 4Hz pulse, opacity 0.2-0.5, activates after delay
- [ ] Damages both player and enemies in zone

### TimeEffects
- [ ] Dramatic slow: factor 0.3, vignette enabled
- [ ] Impact slow: factor 0.7, no vignette
- [ ] Time stop: factor 0, vignette + desaturate
- [ ] Ease-out: 50ms duration, quadratic easing `t * (2 - t)`
- [ ] Returns scaled dt for game systems

### BoonCombatIntegration
- [ ] glass_cannon: 2x damage
- [ ] dark_pact: 2x when torch off
- [ ] the_cull: 2x vs enemies below 20% HP
- [ ] deep_cut: 3x on ambush
- [ ] searing_radiance: +15% per stack in light
- [ ] festering_wounds: +10% per stack with DoT
- [ ] shatter_strike: +40% per stack vs chilled/frozen
- [ ] Rot armor reduction: 10% per stack (max 100%)

### StaminaSystem
- [ ] Max: 100, regen: 4/s, no delay
- [ ] Costs: light=10, heavy=10, dodge=25, dash=15
- [ ] Kill refund: 25 stamina
- [ ] Exhausted below 20: 30% slower attacks
- [ ] Boon-aware getters check player.statStacks first
