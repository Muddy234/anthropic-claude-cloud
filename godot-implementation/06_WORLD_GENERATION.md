# Work Package 06: World Generation

## Objective
Port all procedural generation systems from JS to GDScript: seeded RNG, blob-based BSP dungeon generation, chamber interior generation, enemy spawning/factory, village hub layout, and boss arena generation. Wire outputs into TileMapLayer nodes and scene tree via an integration layer.

## Dependencies
- WP01: Autoloads (`Constants`, `EventBus`, `GameManager`), game state architecture
- WP02: `MonsterData` resource definitions, tile type enums, `ItemData` resources

## Source Files to Reference

| JS File | Lines | Purpose |
|---------|-------|---------|
| `js/generation/seeded-rng.js` | 267 | Mulberry32 deterministic PRNG with child RNG derivation |
| `js/generation/dungeon-generator.js` | 906 | BSP tree + blob growth + corridor carving + blob assignment |
| `js/generation/chamber-generator.js` | 1107 | Per-room BSP + cellular automata interior detail |
| `js/generation/enemy-spawner.js` | 1069 | Monster selection, tier weights, spawn patterns, placement |
| `js/generation/enemy-factory.js` | 340 | Unified enemy entity creation from MonsterData templates |
| `js/generation/dungeon-integration.js` | 641 | Converts generator output to game map + spawns entities |
| `js/generation/village-generator.js` | 589 | Village hub: buildings, paths, decorations, NPC placement |
| `js/generation/core-generator.js` | 387 | Final boss arena: pillars, safe zones, hazard spawns |

**Total: ~5,306 lines**

## Output Files to Create

```
scripts/generation/
  seeded_rng.gd             # Mulberry32 PRNG (RefCounted)
  dungeon_generator.gd      # BSP tree + blob growth orchestrator (RefCounted)
  chamber_generator.gd      # Per-room interior detail via BSP+CA (RefCounted)
  enemy_spawner.gd          # Monster selection + placement logic (RefCounted)
  enemy_factory.gd          # Entity creation from MonsterData (RefCounted)
  dungeon_integration.gd    # Wires generator data into scene tree (Node)
  village_generator.gd      # Hub layout generation (RefCounted)
  core_generator.gd         # Boss arena generation (RefCounted)
```

---

## 1. Seeded RNG (`seeded_rng.gd`)

**Source:** `js/generation/seeded-rng.js` (267 lines)

### Input Parameters
| Param | Type | Description |
|-------|------|-------------|
| `seed` | `Variant` (int, String, or null) | Seed value; null = random |

### Output
A `SeededRNG` instance with deterministic `random()`, `random_int()`, `choose()`, `shuffle()`, `weighted_choice()`, `gaussian()`.

### Key Algorithm: Mulberry32

```
# Pseudocode - direct port of _mulberry32()
func _mulberry32() -> float:
    state += 0x6D2B79F5
    var t := state
    t = wrapping_multiply(t ^ (t >> 15), t | 1)
    t ^= t + wrapping_multiply(t ^ (t >> 7), t | 61)
    return float((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
```

### GDScript Structure

```gdscript
class_name SeededRNG
extends RefCounted

var seed: int
var initial_seed: int
var state: int
var call_count: int = 0

func _init(p_seed: Variant = null) -> void:
    set_seed(p_seed)

func set_seed(p_seed: Variant) -> void:
    if p_seed == null:
        p_seed = randi()
    if p_seed is String:
        p_seed = _hash_string(p_seed)
    seed = p_seed & 0xFFFFFFFF
    initial_seed = seed
    state = seed

func random() -> float:
    call_count += 1
    return _mulberry32()

func random_int(min_val: int, max_val: int) -> int:
    return int(random() * (max_val - min_val + 1)) + min_val

func chance(probability: float) -> bool:
    return random() < probability

func choose(array: Array) -> Variant:
    if array.is_empty(): return null
    return array[int(random() * array.size())]

func shuffle(array: Array) -> Array:
    # Fisher-Yates in-place
    for i in range(array.size() - 1, 0, -1):
        var j := int(random() * (i + 1))
        var tmp = array[i]
        array[i] = array[j]
        array[j] = tmp
    return array

func weighted_choice(items: Array, weights: Array) -> Variant:
    var total := 0.0
    for w in weights: total += w
    var roll := random() * total
    for i in items.size():
        roll -= weights[i]
        if roll <= 0: return items[i]
    return items.back()

func gaussian(mean: float = 0.0, std_dev: float = 1.0) -> float:
    # Box-Muller transform
    var u1 := random()
    var u2 := random()
    var z0 := sqrt(-2.0 * log(u1)) * cos(TAU * u2)
    return z0 * std_dev + mean

func child(name: String) -> SeededRNG:
    return SeededRNG.new(_hash_string("%d_%s" % [seed, name]))

func get_state() -> Dictionary:
    return { "seed": seed, "initial_seed": initial_seed,
             "state": state, "call_count": call_count }

func load_state(data: Dictionary) -> void:
    seed = data.seed
    initial_seed = data.initial_seed
    state = data.state
    call_count = data.call_count
```

### Conversion Notes
- `Math.imul()` -> use GDScript bitwise ops or a helper that does `(a * b) & 0xFFFFFFFF` to stay in 32-bit range.
- All integer overflow must wrap at 32 bits. GDScript ints are 64-bit, so mask with `& 0xFFFFFFFF` after each arithmetic op in `_mulberry32()`.
- The global `GenerationRNG` instance in JS becomes a member variable on `DungeonGenerator` or stored on `GameManager`.
- Godot's built-in `RandomNumberGenerator` can be used for non-seed-critical systems. Use `SeededRNG` only where deterministic replay/seed sharing matters.

---

## 2. Dungeon Generator (`dungeon_generator.gd`)

**Source:** `js/generation/dungeon-generator.js` (906 lines)

### Input Parameters
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `seed` | `Variant` | `null` | RNG seed (null = random) |
| `floor_number` | `int` | `1` | Current dungeon floor |

### Output Data Structure

```gdscript
class DungeonResult extends RefCounted:
    var grid: Array[Array]         # 2D int array: 0=floor, 1=wall
    var blobs: Array[BlobData]     # All generated blobs
    var corridors: Array[CorridorData]
    var entrance_blob: BlobData
    var seed: int
    var map_width: int             # 180
    var map_height: int            # 180

class BlobData extends RefCounted:
    var tiles: Dictionary          # Set<String> "x,y" -> bool (or PackedVector2iArray)
    var connection_point: Vector2i
    var blob_type: String          # "entrance" | "combat" | "treasure" | "shrine"
    var element: String            # "fire", "ice", etc.
    var theme: String              # "magma_chamber", etc.
    var difficulty: int            # 1-10
    var corridor_connections: int

class CorridorData extends RefCounted:
    var tiles: Dictionary          # Set<String> "x,y" -> bool
    var start_blob: BlobData
    var end_blob: BlobData
    var path: PackedVector2iArray
    var midpoint: Vector2i
```

### Key Algorithm: BSP + Blob Growth

```
# Pseudocode
func generate(seed, floor_number) -> DungeonResult:
    rng = SeededRNG.new(seed)

    # 1. BSP: Recursively split 180x180 space
    root = Leaf.new(0, 0, 180, 180)
    split_leaves(root)   # split until leaf < min_leaf_size*2

    # 2. Grow organic blobs in each leaf
    for leaf in root.get_leaves():
        blob = grow_blob(leaf, rng)   # random walk from seed point
        leaf.blob = blob

    # 3. Init grid (180x180, all walls=1)
    grid = create_wall_grid(180, 180)

    # 4. Paint blob tiles as floor (0)
    for blob in blobs:
        for tile_pos in blob.tiles:
            grid[tile_pos.y][tile_pos.x] = 0

    # 5. Carve corridors between sibling leaves
    create_corridors(root, grid)  # recursive, connects sibling blobs

    # 6. Assign blob types (entrance, shrine, treasure, combat)
    assign_blob_properties(blobs)

    # 7. Validate connectivity via flood fill
    validate_connectivity(grid, entrance_blob)

    return DungeonResult
```

### BSP Leaf Class (inner class or separate)

```gdscript
class Leaf extends RefCounted:
    var x: int
    var y: int
    var w: int
    var h: int
    var depth: int = 0
    var child1: Leaf
    var child2: Leaf
    var blob: BlobData

    func split(rng: SeededRNG) -> bool:
        # Determine direction from aspect ratio
        # Split at random position within [min_leaf_size, size - min_leaf_size]
        # Create child1, child2
        ...

    func get_leaves() -> Array[Leaf]:
        if child1 or child2:
            var leaves: Array[Leaf] = []
            if child1: leaves.append_array(child1.get_leaves())
            if child2: leaves.append_array(child2.get_leaves())
            return leaves
        return [self]
```

### Blob Growth Algorithm

```
func grow_blob(leaf: Leaf, rng: SeededRNG) -> BlobData:
    var padding := 4
    var cx := leaf.x + padding + rng.random_int(0, leaf.w - padding*2 - 1)
    var cy := leaf.y + padding + rng.random_int(0, leaf.h - padding*2 - 1)

    var tiles := {}  # Dictionary acting as Set
    tiles[Vector2i(cx, cy)] = true
    var tiles_list := [Vector2i(cx, cy)]

    var target_area := max(int(leaf.w * leaf.h * 0.5), 100)

    while tiles.size() < target_area and attempts < 2000:
        var curr := rng.choose(tiles_list) as Vector2i
        var dir := rng.choose(FOUR_DIRS) as Vector2i
        var next := curr + dir
        # Check within leaf bounds (with padding)
        if in_bounds(next, leaf, padding) and not tiles.has(next):
            tiles[next] = true
            tiles_list.append(next)

    return BlobData.new(tiles, Vector2i(cx, cy))
```

### Corridor Generation

```
func create_corridor_path(grid, blob1, blob2, rng) -> CorridorData:
    var p1 := blob1.connection_point
    var p2 := blob2.connection_point
    var distance := abs(p2.x - p1.x) + abs(p2.y - p1.y)

    if distance > 15:
        # Dogleg: go to waypoint, then to destination
        var mid := (p1 + p2) / 2
        var offset := rng.random_int(-5, 5)
        var waypoint := Vector2i(mid.x, mid.y + offset)  # simplified
        dig_biased_walk(grid, p1, waypoint, tiles, path, rng)
        dig_biased_walk(grid, waypoint, p2, tiles, path, rng)
    else:
        dig_biased_walk(grid, p1, p2, tiles, path, rng)
```

Corridor width is 4 tiles (configurable via `DUNGEON_CONFIG.corridorWidth`).

### Blob Assignment Priority

1. **ENTRANCE** (1): Center-most blob. Element = `physical`, theme = `ancient_arena`.
2. **SHRINE** (2-4): Dead-end blobs, smaller, mid-distance from entrance. Element = `holy`.
3. **TREASURE** (~15% remaining): Farthest blobs (normalized distance > 0.5).
4. **COMBAT** (remainder): Random element + theme.

Difficulty is set 1-10 based on Manhattan distance from entrance blob.

### Connectivity Validation

Flood fill from entrance connection point. All floor tiles must be reachable. If not, regenerate (up to 3 attempts).

### Config Constants (port from `DUNGEON_CONFIG`)

```gdscript
const MAP_WIDTH := 180
const MAP_HEIGHT := 180
const MIN_LEAF_SIZE := 20
const LEAF_PADDING := 4
const BLOB_FILL_RATIO := 0.5
const MIN_BLOB_SIZE := 100
const MAX_GROWTH_ATTEMPTS := 2000
const CORRIDOR_WIDTH := 4
const CORRIDOR_WOBBLE := 0.10
const DOGLEG_THRESHOLD := 15
const DOGLEG_OFFSET := 5
const TREASURE_BLOB_RATIO := 0.15
const MIN_SHRINES := 2
const MAX_SHRINES := 4
const SHRINE_MIN_DISTANCE := 0.3
const MAX_REGEN_ATTEMPTS := 3
```

### Conversion Notes
- JS uses `Set<string>` with `"x,y"` keys for tile positions. In GDScript, use `Dictionary` (as a set: `{Vector2i: true}`) or `PackedVector2iArray` for tile storage. Dictionary is faster for `.has()` lookups; `PackedVector2iArray` is more memory efficient for large tile sets.
- JS `Leaf` class -> GDScript inner class or standalone `RefCounted` class.
- The JS global `DUNGEON_STATE` object becomes return value of `generate()` -- no mutable global state.
- All `Math.random()` calls in the JS source -> `rng.random()` calls in GDScript (the JS code already partially does this via `dungeonRandom()`).

---

## 3. Chamber Generator (`chamber_generator.gd`)

**Source:** `js/generation/chamber-generator.js` (1107 lines)

### Input Parameters
| Param | Type | Description |
|-------|------|-------------|
| `floor_width` | `int` | Room interior width |
| `floor_height` | `int` | Room interior height |
| `element` | `String` | Room element for theme-specific CA rules |
| `doorways` | `Array` | Doorway positions (for connectivity validation) |

### Output

```gdscript
class ChamberResult extends RefCounted:
    var grid: Array[Array]            # 2D int: 0=floor, 1=interior_wall
    var sections: Array[BSPSection]   # BSP leaf sections
    var chambers: Array[Chamber]      # Connected floor regions
    var corridors: Array[Dictionary]  # Internal section corridors
    var safe_chamber: Chamber         # Furthest from doorways

class BSPSection extends RefCounted:
    var x: int
    var y: int
    var width: int
    var height: int
    var id: int
    var depth: int
    var neighbors: Array[BSPSection]

class Chamber extends RefCounted:
    var id: int
    var tiles: PackedVector2iArray
    var size: int
    var center: Vector2i
    var is_safe: bool = false
```

### Key Algorithm: BSP + Cellular Automata

```
func generate_chambers(width, height, element, doorways) -> ChamberResult:
    var attempts := 0
    var success := false

    while not success and attempts < 5:
        attempts += 1

        # 1. BSP subdivision (target 4 sections, min 12x12)
        sections = binary_space_partition(width, height)

        # 2. Apply CA to each section
        grid = create_wall_grid(width, height)
        for section in sections:
            apply_cellular_automata(grid, section, element)

        # 3. Carve corridors between neighbor sections
        corridors = carve_corridors(grid, sections, width, height)

        # 4. Validate doorway connectivity (flood fill)
        success = validate_doorway_connectivity(grid, doorways, width, height)

    # 5. Identify distinct chambers (flood fill)
    chambers = identify_chambers(grid, width, height)

    # 6. Find safest chamber (furthest from all doorways)
    safe_chamber = find_safest_chamber(chambers, doorways)

    return ChamberResult.new(grid, sections, chambers, corridors, safe_chamber)
```

### Theme-Specific CA Rules

```gdscript
const THEME_CA_RULES := {
    "fire":     { "initial_wall": 0.25, "passes": 2, "birth": 3, "survival": 3 },
    "ice":      { "initial_wall": 0.15, "passes": 4, "birth": 5, "survival": 4 },
    "shadow":   { "initial_wall": 0.30, "passes": 3, "birth": 4, "survival": 5 },
    "earth":    { "initial_wall": 0.18, "passes": 4, "birth": 4, "survival": 4 },
    "physical": { "initial_wall": 0.20, "passes": 3, "birth": 4, "survival": 4 },
    "default":  { "initial_wall": 0.20, "passes": 3, "birth": 4, "survival": 4 },
}
```

Element mapping: fire/lava/magma -> "fire", ice/frost/water -> "ice", shadow/void/dark/death -> "shadow", earth/stone/nature -> "earth".

### Cellular Automata Per Section

```
func apply_cellular_automata(grid, section, element):
    var rules := get_ca_rules(element)
    var buffer_a := init_random_grid(section.width, section.height, rules.initial_wall)
    var buffer_b := create_empty_grid(section.width, section.height)

    for pass in rules.passes:
        for sy in section.height:
            for sx in section.width:
                var wall_count := count_wall_neighbors(buffer_a, sx, sy, section)
                if buffer_a[sy][sx] == 1:
                    buffer_b[sy][sx] = 1 if wall_count >= rules.survival else 0
                else:
                    buffer_b[sy][sx] = 1 if wall_count >= rules.birth else 0
        swap(buffer_a, buffer_b)

    # Copy buffer_a into grid at section offset
    blit(buffer_a, grid, section.x, section.y)
```

The JS version uses double-buffered shared CA arrays for performance. In GDScript, allocate local arrays per section -- `PackedByteArray` or `PackedInt32Array` reshaped as 2D for tighter memory.

### Doorway Clearance

Before connectivity validation, force a 2-tile clearance radius around each doorway position to floor. Additionally, carve a 4-tile-deep corridor inward from each edge doorway.

### Conversion Notes
- The JS code uses shared `caBufferA`/`caBufferB` globals for double-buffered CA. In GDScript, make these local to the function or member variables on the generator instance.
- `identifyChambers()` is a standard flood fill grouping -- same algorithm as connectivity validation but collects connected components.
- The `isInSafeChamber()` utility needs to be accessible from enemy spawner (to exclude safe zones). Expose it as a static method or pass the safe chamber data through.
- Config: `target_sections=4`, `min_section_size=12`, `split_variance=0.2`, `corridor_width=2`, `doorway_clearance=2`, `dead_end_ratio=0.25`.

---

## 4. Enemy Spawner (`enemy_spawner.gd`)

**Source:** `js/generation/enemy-spawner.js` (1069 lines)

### Input Parameters
| Param | Type | Description |
|-------|------|-------------|
| `room` | `Dictionary` | Room data (type, element, floor area, blob ref) |
| `valid_tiles` | `Array[Vector2i]` | Pre-calculated floor tiles (optional) |
| `floor_number` | `int` | Current dungeon floor |
| `existing_enemies` | `Array[Vector2i]` | Positions of already-spawned enemies |
| `player_pos` | `Vector2i` | Player spawn position (for safe zone) |

### Output

```gdscript
class SpawnResult extends RefCounted:
    var spawn_entries: Array[SpawnEntry]  # What to spawn and where

class SpawnEntry extends RefCounted:
    var monster_type: String     # MonsterData key
    var position: Vector2i
    var spawn_pattern: String    # "patrol" | "ambush" | "guard" | "cluster" | "scattered"
    var difficulty_scale: float
```

### Key Algorithm: Element-Weighted Monster Selection + Pattern Placement

```
func spawn_enemies_in_room(room, valid_tiles, floor_number) -> SpawnResult:
    # 1. Calculate enemy count
    var count := calculate_enemy_count(room, floor_number)

    # 2. Pre-select monster types (element + tier weighted)
    var monster_types := []
    for i in count:
        monster_types.append(select_monster_for_room(room, floor_number))

    # 3. Select spawn pattern
    var pattern := select_spawn_pattern(room, monster_types)

    # 4. Get pattern-specific positions (or random for "scattered")
    var positions := get_pattern_positions(pattern, room, valid_tiles, count)

    # 5. For each enemy, find valid position with min spacing
    var result := SpawnResult.new()
    var used_positions: Dictionary = {}  # Set
    var spawned_positions: Array[Vector2i] = []

    for i in count:
        var pos: Vector2i
        if i < positions.size():
            pos = positions[i]  # Pattern position
        else:
            pos = find_spawn_position(valid_tiles, used_positions,
                                       spawned_positions, player_pos)
        if pos == Vector2i(-1, -1): continue

        used_positions[pos] = true
        spawned_positions.append(pos)
        result.spawn_entries.append(SpawnEntry.new(
            monster_types[i], pos, pattern, 1.0
        ))

    return result
```

### Enemy Count Formula

```gdscript
func calculate_enemy_count(room: Dictionary, floor_number: int) -> int:
    var area := room.floor_width * room.floor_height
    var count := int(area * 0.06)  # 6% density
    count += 3                      # base enemies per room
    count += randi() % 3            # variance 0-2
    # Room type modifiers
    match room.type:
        "boss": count = 1
        "treasure": count = ceili(count * 0.5)
        "shrine": count = ceili(count * 0.3)
        "entrance": count = maxi(1, count / 2)
    # Floor scaling
    count += floor_number / 3
    return clampi(count, 1, 9)
```

### Tier Weight System

Distance-based tiers using room difficulty (1-10, from blob distance):

| Difficulty | TIER_3 | TIER_2 | TIER_1 | ELITE |
|-----------|--------|--------|--------|-------|
| 1-3 (near) | 80% | 18% | 2% | 0% |
| 4-6 (mid) | 50% | 35% | 12% | 3% |
| 7-10 (far) | 25% | 35% | 30% | 10% |

On floors > 1, shift weight toward stronger tiers: `+3% per floor` (max 15% shift).

### Monster Selection Weights

For each candidate monster from `MONSTER_DATA`:
```
weight = 1.0
weight *= tier_weight[monster.tier]          # From table above
if monster.element == room.element:
    weight *= 3.0                            # Element match bonus
elif is_opposed(monster.element, room.element):
    weight *= 0.3                            # Opposed penalty
elif is_complementary(monster.element, room.element):
    weight *= 1.5                            # Complementary bonus
if room.theme in monster.rooms.native:
    weight *= 2.0                            # Native room bonus
if room.theme in monster.rooms.hostile:
    continue                                 # Skip entirely
```

Weighted random selection from candidates.

### Spawn Patterns

| Pattern | Description | Room Affinity | Placement Strategy |
|---------|-------------|---------------|-------------------|
| `patrol` | Along walls, 2 tiles from edges | combat, corridor | Filter tiles near room edges |
| `ambush` | Corners, behind cover | treasure, combat | Score by corner proximity + adjacent walls |
| `guard` | Ring around room center (3-5 tiles away) | treasure, shrine | Score by distance from center, spread by angle |
| `cluster` | Tight group around random anchor | combat, entrance | Sort by distance from random anchor point |
| `scattered` | Random (default/fallback) | any | Standard random with spacing |

Pattern selection: 60% chance to use a tactical pattern, 40% scattered. Room type and monster behavior type provide 2x and 1.5x weight bonuses respectively.

### Minimum Spacing

Enemies must be at least 2 tiles apart (Chebyshev distance). Up to 30 attempts per position. Fallback: ignore spacing if no valid position found after all attempts.

### Floor-Based Stat Scaling

```gdscript
func apply_floor_scaling(template: Dictionary, floor: int) -> Dictionary:
    var scale := 1.0 + (floor - 1) * 0.15
    # Floor 1 = 1.0x, Floor 5 = 1.6x, Floor 10 = 2.35x
    return {
        "hp": int(template.hp * scale),
        "str": int(template.str * scale),
        "damage": int(template.damage * scale),
        "defense": int(template.defense * (1.0 + (floor - 1) * 0.10)),
        "xp": int(template.xp * scale),
    }
```

### Conversion Notes
- The spawner should produce data (positions + types), NOT instantiate scene tree nodes. The integration layer handles instantiation.
- JS `SPAWNER_CONFIG` becomes `const` members on the class. Key values: `base_enemies=3`, `variance=3`, `density=0.06`, `min=1`, `max=9`, `element_match_bonus=3.0`, `element_penalty=0.3`, `min_spacing=2`, `max_attempts=30`, `pattern_chance=0.6`.
- The JS uses `game.enemies.some()` to check existing enemies at a position. In GDScript, pass in the positions as a `Dictionary` or `Array[Vector2i]`.

---

## 5. Enemy Factory (`enemy_factory.gd`)

**Source:** `js/generation/enemy-factory.js` (340 lines)

### Input Parameters
| Param | Type | Description |
|-------|------|-------------|
| `monster_type` | `String` | Key into MonsterData |
| `position` | `Vector2i` | Grid position |
| `floor_number` | `int` | For stat scaling |
| `room` | `Variant` | Room reference (optional) |
| `difficulty_scale` | `float` | Additional multiplier (default 1.0) |
| `spawn_pattern` | `String` | Spawn pattern hint for AI |

### Output
An enemy scene instance (or entity dictionary for ECS-style).

### Key Algorithm: Template -> Entity

```
func create_enemy(options: Dictionary) -> Node:
    var template := MonsterData.get_monster(options.monster_type)
    if not template: return null

    # 1. Apply floor-based stat scaling
    var stats := apply_floor_scaling(template, options.floor_number)

    # 2. Apply difficulty_scale multiplier
    if options.difficulty_scale != 1.0:
        stats.hp = int(stats.hp * options.difficulty_scale)
        stats.str = int(stats.str * options.difficulty_scale)
        stats.p_def = int(stats.p_def * options.difficulty_scale)
        stats.m_def = int(stats.m_def * options.difficulty_scale)

    # 3. Create enemy entity/node
    var enemy := preload("res://scenes/entities/enemy/enemy.tscn").instantiate()
    enemy.initialize({
        "type_id": options.monster_type,
        "position": options.position,
        "stats": stats,
        "tier": template.tier,
        "element": template.element,
        "behavior": determine_behavior(template),
        "combat": {
            "attack_speed": template.attack_speed,
            "attack_range": template.attack_range,
        },
        "level": options.floor_number,
        "loot": template.loot,
        "xp": stats.xp,
        "spawn_pattern": options.get("spawn_pattern", "scattered"),
    })

    # 4. Register with AI system
    # (handled by enemy node's _ready or explicit call)

    return enemy
```

### Mana Calculation

```gdscript
func _calculate_mana(template: Dictionary) -> int:
    var int_stat := template.get("int", 10)
    var is_magic := template.get("attack_type") == "magic"
    return 50 + int(int_stat * (3 if is_magic else 1))

func _calculate_mana_regen(template: Dictionary) -> float:
    var int_stat := template.get("int", 10)
    var is_magic := template.get("attack_type") == "magic"
    return 2 + int(int_stat / 10) + (2 if is_magic else 0)
```

### Behavior Inference

```gdscript
func determine_behavior(template: Dictionary) -> Dictionary:
    if template.has("behavior"):
        return template.behavior
    var aggression := template.get("aggression", 2)
    var move_interval := template.get("move_interval", 2)
    var type := "territorial"  # default
    if aggression >= 5: type = "aggressive"
    elif aggression >= 3: type = "territorial"
    elif aggression <= 1: type = "passive"
    elif move_interval >= 3: type = "patrol"
    return {
        "type": type,
        "aggression": aggression,
        "move_interval": move_interval,
        "chase_range": aggression * 3,
        "retreat_threshold": 0.2,
    }
```

### Conversion Notes
- The JS `EnemyFactory.createAndRegister()` both creates the object AND registers it with `AIManager`, `EnemyAbilitySystem`, animation init. In Godot, the enemy scene's `_ready()` should handle AI/ability registration. The factory just instantiates + configures.
- Unique ID generation: JS uses `Date.now() + random()`. In Godot, use `ResourceUID.create_id()` or a simple counter on the factory.
- The JS factory is a singleton object. In GDScript, make it a `RefCounted` class with static methods, or a utility autoload.

---

## 6. Dungeon Integration (`dungeon_integration.gd`)

**Source:** `js/generation/dungeon-integration.js` (641 lines)

### Role
Orchestrates the full dungeon generation pipeline and converts pure data into scene tree nodes. This is the only generator file that touches the scene tree directly.

### Input
- `seed: Variant`
- `floor_number: int`
- `tilemap: TileMapLayer` (the node to populate)
- `enemy_container: Node` (parent for enemy nodes)

### Output
Populates the TileMapLayer and spawns entity nodes.

### Key Algorithm: Full Pipeline

```
func generate_floor(seed, floor_number, tilemap, enemy_container):
    # 1. Generate dungeon layout (pure data)
    var dungeon_gen := DungeonGenerator.new()
    var dungeon := dungeon_gen.generate(seed, floor_number)

    # 2. Apply to TileMapLayer
    apply_tilemap(dungeon.grid, dungeon.blobs, dungeon.corridors, tilemap)

    # 3. Generate chamber interiors for each blob
    var chamber_gen := ChamberGenerator.new()
    for blob in dungeon.blobs:
        var chamber_result := chamber_gen.generate_chambers(
            blob_width, blob_height, blob.element, blob_doorways
        )
        apply_chamber_to_tilemap(chamber_result, blob, tilemap)

    # 4. Spawn enemies
    var spawner := EnemySpawner.new()
    var factory := EnemyFactory.new()

    for blob in dungeon.blobs:
        if blob.blob_type == "entrance": continue

        var spawn_result := spawner.spawn_enemies_in_room(
            blob_as_room(blob), null, floor_number
        )

        for entry in spawn_result.spawn_entries:
            var enemy := factory.create_enemy({
                "monster_type": entry.monster_type,
                "position": entry.position,
                "floor_number": floor_number,
                "difficulty_scale": entry.difficulty_scale,
                "spawn_pattern": entry.spawn_pattern,
            })
            if enemy:
                enemy_container.add_child(enemy)

    # 5. Spawn decorations (shrines, etc.)
    spawn_decorations(dungeon, tilemap)

    # 6. Place exit in farthest blob
    place_exit(dungeon, tilemap)

    # 7. Return player spawn position
    return dungeon.entrance_blob.connection_point
```

### TileMap Mapping

Each tile type from the generator maps to a TileMap atlas coordinate:

| Generator Value | Tile Type | TileMap Source/Atlas |
|----------------|-----------|---------------------|
| `1` (wall) | Void/wall | Terrain auto-tile or specific atlas coord |
| `0` (floor) in blob | Floor | Element-themed atlas variant |
| `0` (floor) in corridor | Corridor floor | Blended theme |
| `interior_wall` | Interior obstacle | Pillar/rubble atlas coord |
| `exit` | Stairs down | Special tile |
| `shrine` | Shrine decoration | Overlay tile or scene |

```gdscript
func apply_tilemap(grid: Array, blobs: Array, corridors: Array,
                   tilemap: TileMapLayer) -> void:
    tilemap.clear()
    for y in grid.size():
        for x in grid[y].size():
            var cell := Vector2i(x, y)
            if grid[y][x] == 0:
                # Floor - determine theme from blob/corridor
                var theme := get_theme_at(x, y, blobs, corridors)
                var atlas_coord := get_floor_atlas(theme)
                tilemap.set_cell(cell, SOURCE_ID, atlas_coord)
            # Walls can use terrain auto-tiling
            # or remain as no cell (void)
```

Use Godot's **TileMap terrain system** for auto-tiling walls: define terrain types for each element theme, let the terrain system pick correct wall/corner tiles automatically.

### Exit Placement

```gdscript
func place_exit(dungeon: DungeonResult, tilemap: TileMapLayer) -> Vector2i:
    # Find blob with highest difficulty (farthest from entrance)
    var farthest: BlobData = null
    var max_diff := 0
    for blob in dungeon.blobs:
        if blob == dungeon.entrance_blob: continue
        if blob.difficulty > max_diff:
            max_diff = blob.difficulty
            farthest = blob

    var exit_pos := farthest.connection_point
    # Verify reachability via AStar or flood fill
    # Set exit tile on tilemap
    tilemap.set_cell(exit_pos, SOURCE_ID, EXIT_ATLAS_COORD)
    return exit_pos
```

### Shrine Spawning

For each blob with `blob_type == "shrine"`, place an interactable shrine scene at the blob's connection point (or nearby valid floor tile).

### Conversion Notes
- This is the only file that should be a `Node` (not `RefCounted`), since it interfaces with the scene tree.
- The JS version mutates the global `game.map`, `game.rooms`, `game.enemies` arrays. In Godot, pass references to target nodes/containers.
- The JS `createRoomFromBlob()` function that computes bounding boxes from tile sets can be a utility on `BlobData`.
- Theme colors from JS (`floorColor`, `accentColor`, `wallColor`) map to TileMap terrain or atlas source IDs in Godot.

---

## 7. Village Generator (`village_generator.gd`)

**Source:** `js/generation/village-generator.js` (589 lines)

### Input Parameters
None (fixed layout).

### Output

```gdscript
class VillageResult extends RefCounted:
    var map: Array[Array]              # 2D tile type grid
    var buildings: Array[BuildingData]
    var spawn_point: Vector2i
    var width: int                     # 50
    var height: int                    # 40

class BuildingData extends RefCounted:
    var id: String                     # "bank", "smithy", etc.
    var name: String
    var type: String                   # "building" | "open" | "entrance"
    var position: Vector2i
    var size: Vector2i                 # width x height
    var entrance: Vector2i             # Door tile position
    var interior_tiles: PackedVector2iArray
    var npc_ids: PackedStringArray
    var is_open: bool
```

### Key Algorithm: Fixed Layout + Path Generation

```
func generate() -> VillageResult:
    # 1. Create 50x40 base map (all grass)
    var map := create_grass_map(50, 40)
    add_fence_border(map)

    # 2. Place buildings at fixed positions
    var layout := [
        { "def": TOWN_SQUARE, "pos": Vector2i(21, 16) },
        { "def": BANK,        "pos": Vector2i(5, 5) },
        { "def": SMITHY,      "pos": Vector2i(38, 5) },
        { "def": TAVERN,      "pos": Vector2i(5, 25) },
        { "def": PLAYER_HOUSE,"pos": Vector2i(38, 30) },
        { "def": EXPEDITION,  "pos": Vector2i(20, 5) },
        { "def": SHRINE,      "pos": Vector2i(40, 20) },
        { "def": CHASM,       "pos": Vector2i(22, 32) },
        { "def": TRAINING,    "pos": Vector2i(12, 5) },
    ]
    var buildings := []
    for entry in layout:
        var building := place_building(map, entry.def, entry.pos)
        buildings.append(building)

    # 3. Connect all buildings to town square via L-shaped paths
    var town_center := get_building_center("town_square", buildings)
    for building in buildings:
        if building.id == "town_square": continue
        create_l_path(map, building.entrance, town_center)

    # 4. Add decorations (trees, bushes, well, training dummies, benches)
    add_decorations(map, buildings)

    # 5. Find spawn point (in front of player house)
    var spawn := find_spawn_point(buildings)

    return VillageResult.new(map, buildings, spawn, 50, 40)
```

### Building Definitions

| ID | Name | Size | Type | NPCs |
|----|------|------|------|------|
| `town_square` | Town Square | 8x8 | open | elder |
| `bank` | The Vault | 6x5 | building | banker |
| `smithy` | Ironforge Smithy | 7x5 | building | blacksmith |
| `tavern` | The Weary Delver | 8x6 | building | innkeeper, patron |
| `player_house` | Your Quarters | 5x4 | building | (none) |
| `expedition_hall` | Expedition Hall | 7x6 | building | expedition_master |
| `shrine` | Shrine of Light | 4x4 | open | priestess |
| `chasm_entrance` | The Chasm | 6x4 | entrance | (none) |
| `training_ground` | Training Ground | 5x4 | open | (none) |

### Building Placement Rules

- **building** type: Edge tiles = wall (non-walkable), center tile of bottom edge = door (walkable), interior = floor.
- **open** type: Edge = stone_border (walkable), interior = cobblestone (walkable).
- **entrance** type: Edge = cave_wall (non-walkable), center bottom = cave_entrance (walkable, `is_exit_point`), interior = cave_floor.

### Path Generation

L-shaped paths connecting each building entrance to town square center:
1. Walk horizontally from building entrance to target X.
2. Walk vertically from current Y to target Y.
3. Only overwrite `grass` tiles with `path` tiles.

### Decorations

- 15 random trees (non-walkable) on grass tiles
- 20 random bushes/flowers (bushes non-walkable, flowers walkable)
- Well at town square center (non-walkable)
- Bulletin board at town square edge (non-walkable, interactable)
- 3 training dummies at training ground (non-walkable, interactable)
- Benches outside building entrances

### NPC Positions

```gdscript
func get_npc_positions(buildings: Array[BuildingData]) -> Array[Dictionary]:
    var positions := []
    for building in buildings:
        for i in building.npc_ids.size():
            var pos: Vector2i
            if building.interior_tiles.size() > 0:
                pos = building.interior_tiles[mini(i, building.interior_tiles.size()-1)]
            else:
                pos = Vector2i(building.entrance.x, building.entrance.y - 1)
            positions.append({"npc_id": building.npc_ids[i], "position": pos,
                              "building_id": building.id})
    return positions
```

### Conversion Notes
- Village is deterministic (no RNG needed). Layout is fixed.
- The JS version had a degradation/world-state damage system that has been removed. Village always appears healthy.
- Village tile types -> TileMap atlas: grass, path, cobblestone, stone_border, wall, door, floor, fence, cave_wall, cave_floor, cave_entrance.
- `isChasmEntrance()` query -> check for `cave_entrance` tile type or `is_exit_point` property.

---

## 8. Core Arena Generator (`core_generator.gd`)

**Source:** `js/generation/core-generator.js` (387 lines)

### Input Parameters
| Param | Type | Description |
|-------|------|-------------|
| `width` | `int` | Arena width (from `CORE_CONFIG.arena.width`) |
| `height` | `int` | Arena height (from `CORE_CONFIG.arena.height`) |

### Output

```gdscript
class ArenaResult extends RefCounted:
    var tiles: Array[Array]           # 2D tile data
    var width: int
    var height: int
    var spawn_point: Vector2i         # Player start (south side)
    var boss_spawn: Vector2i          # Boss start (center, offset for 4x4 boss)
    var safe_zones: Array[Rect2i]     # 4 corner zones for boss mechanics
    var hazard_spawns: Array[Dictionary]  # Dynamic hazard points
    var pillars: Array[Dictionary]    # 8 destructible pillars (2x2 each)
    var ambient_light: Color
    var fog_color: Color
```

### Key Algorithm

```
func generate(width, height) -> ArenaResult:
    # 1. Create tile grid
    var tiles := []
    for y in height:
        tiles.append([])
        for x in width:
            tiles[y].append(create_tile(x, y, width, height))

    # 2. Place 8 pillars in ring around center (radius 12)
    var pillars := generate_pillars(tiles, width, height)

    # 3. Define 4 corner safe zones (margin=5, size=4x4)
    var safe_zones := [
        Rect2i(5, 5, 4, 4),
        Rect2i(width-9, 5, 4, 4),
        Rect2i(5, height-9, 4, 4),
        Rect2i(width-9, height-9, 4, 4),
    ]

    # 4. Player spawn (center bottom)
    var spawn_point := Vector2i(width/2, height-5)

    # 5. Boss spawn (center, offset -2 for 4x4 boss)
    var boss_spawn := Vector2i(width/2 - 2, height/2 - 2)

    # 6. Generate hazard spawn points in concentric rings
    var hazard_spawns := define_hazard_spawns(width, height, pillars)
    # Rings at radius 8, 14, 18 with 6, 8, 10 points each
    # Skip points too close to pillars (< 4 tiles)

    return ArenaResult.new(tiles, width, height, spawn_point, boss_spawn,
                           safe_zones, hazard_spawns, pillars)
```

### Tile Types

- **Edge** (dist from edge = 0): `void`, non-walkable, black.
- **Inner void** (dist from edge = 1, 30% chance): `void_crack`, walkable, dark purple.
- **Floor**: Walkable, color gradient from center outward:
  - < 15% dist: deep purple `#3a1a5a`
  - < 30%: `#2a1a4a`
  - < 50%: `#1a1a3a`
  - < 70%: `#151530`
  - 70%+: `#101025`
- Tiles near center (< 5 dist) get glow effect. Tiles near center (< 8 dist) are animated.

### Pillars

8 pillars placed at 0, 45, 90, 135, 180, 225, 270, 315 degrees from center, radius 12. Each is a 2x2 block of non-walkable `pillar` tiles. Destructible (health = 100).

### Arena Shrink

The `apply_shrink(tiles, amount)` method converts edge tiles to void -- used by the boss's "Void Collapse" ability to shrink the playable arena progressively.

### Conversion Notes
- Visual effects (center pulse, floating particles, energy lines, fog patches) are purely cosmetic. In Godot, implement these with `GPUParticles2D`, shader effects, or `CanvasModulate` rather than per-tile data.
- Tile colors -> TileMap alternative sources or shader modulation.
- The `applyShrink()` mechanic needs runtime TileMap updates. Store the base tiles and re-apply shrink each time the boss triggers the ability.

---

## TileMap Integration Strategy

### TileSet Configuration

Create a single `TileSet` resource with multiple terrain sets:

1. **Dungeon Terrains** (one per element theme):
   - Floor tiles (auto-tile with variation)
   - Wall tiles (full auto-tile with corners/edges)
   - Interior wall / pillar tiles
   - Special tiles (exit, shrine, lava, etc.)

2. **Village Terrains**:
   - Grass, path, cobblestone, stone_border
   - Building walls, doors, floors
   - Cave entrance tiles
   - Fence tiles

3. **Core Arena Terrains**:
   - Void, void_crack, floor variants
   - Pillar tiles

### Layer Strategy

| Layer | Purpose |
|-------|---------|
| `TileMapLayer` (ground) | Floor tiles, paths, terrain |
| `TileMapLayer` (walls) | Walls, obstacles, pillars |
| `TileMapLayer` (decoration) | Decorations, objects |

### Auto-Tiling

Use Godot's terrain system for wall auto-tiling:
1. Mark wall tiles with a terrain set.
2. Use `set_cells_terrain_connect()` to automatically resolve wall corners/edges.
3. Each element theme has its own terrain set or terrain within the same set.

---

## Generation Pipeline (Call Order)

### Dungeon Floor Generation
```
1. DungeonGenerator.generate(seed)        -> DungeonResult (pure data)
2. ChamberGenerator.generate_chambers()    -> ChamberResult per blob (pure data)
3. EnemySpawner.spawn_enemies_in_room()   -> SpawnResult per room (pure data)
4. DungeonIntegration.generate_floor()     -> Populates TileMapLayer + spawns nodes
   a. apply_tilemap()
   b. apply_chambers()
   c. spawn_enemies() via EnemyFactory
   d. spawn_decorations()
   e. place_exit()
```

### Village Generation
```
1. VillageGenerator.generate()            -> VillageResult (pure data)
2. DungeonIntegration.generate_village()  -> Populates TileMapLayer + spawns NPCs
```

### Boss Arena Generation
```
1. CoreGenerator.generate(width, height)  -> ArenaResult (pure data)
2. DungeonIntegration.generate_arena()    -> Populates TileMapLayer + spawns boss
```

---

## Verification Checklist

- [ ] **Seeded RNG produces deterministic output** -- Same seed always generates identical sequence. Write unit test: `SeededRNG.new(42).random()` returns same float every time.
- [ ] **Seeded RNG 32-bit wrapping** -- All arithmetic in `_mulberry32()` correctly wraps at 32 bits. Compare first 100 values against JS implementation with same seed.
- [ ] **Dungeon generates connected, walkable rooms** -- Flood fill from entrance reaches all floor tiles. Zero unreachable pockets.
- [ ] **All rooms reachable from start** -- Every blob's connection point is reachable from entrance blob's connection point via corridors.
- [ ] **BSP produces correct leaf count** -- 180x180 map with `min_leaf_size=20` produces 10-40 leaves depending on random splits.
- [ ] **Blob sizes within expected range** -- Each blob has >= 100 tiles (MIN_BLOB_SIZE). Average is ~50% of leaf area.
- [ ] **Corridor width is 4 tiles** -- Sample corridors and verify all are 4 tiles wide.
- [ ] **Blob type assignment correct** -- Exactly 1 entrance. 2-4 shrines. ~15% treasure. Rest combat.
- [ ] **Chamber CA produces walkable interiors** -- All doorway tiles connect to playable floor. Doorway clearance is 2 tiles.
- [ ] **Theme-specific CA produces visually distinct rooms** -- Fire rooms are more jagged, ice rooms more linear, shadow rooms denser.
- [ ] **Enemy spawns respect tier/floor pools** -- Near-entrance rooms spawn mostly TIER_3. Far rooms spawn TIER_1 + ELITE.
- [ ] **Enemy count scales with room area** -- Small rooms: 1-3 enemies. Large rooms: 6-9 enemies.
- [ ] **Element-weighted spawning works** -- Fire rooms predominantly spawn fire-element monsters.
- [ ] **Spawn patterns produce tactical layouts** -- Guard pattern places enemies in a ring. Ambush places in corners.
- [ ] **No enemies spawn in safe zone around player** -- `isInSafeChamber()` correctly excludes safe chamber tiles.
- [ ] **Minimum spacing enforced** -- No two enemies within 2 tiles of each other.
- [ ] **Village generates with all 9 buildings placed** -- All building IDs present. No overlapping buildings.
- [ ] **Village NPCs placed correctly** -- Each building's NPC list has corresponding position entries.
- [ ] **Village paths connect all buildings to town square** -- Walk from any building entrance to town square center on path tiles.
- [ ] **Chasm entrance tile is walkable and marked** -- `is_exit_point == true` on chasm entrance tiles.
- [ ] **Core arena pillars placed symmetrically** -- 8 pillars at 45-degree intervals, radius 12 from center.
- [ ] **Core arena safe zones in corners** -- 4 zones at margin 5 from each corner.
- [ ] **Core arena shrink works** -- `apply_shrink(2)` converts 2-tile border to void.
- [ ] **EnemyFactory produces correctly scaled stats** -- Floor 5 enemy has 1.6x base HP. Floor 10 has 2.35x.
- [ ] **TileMap populated correctly** -- Visual inspection: rooms, corridors, walls, decorations all render.
- [ ] **Generation performance** -- Full dungeon generation completes in < 500ms on target hardware.
- [ ] **Seed sharing works** -- Two players with same seed get identical dungeon layout.
