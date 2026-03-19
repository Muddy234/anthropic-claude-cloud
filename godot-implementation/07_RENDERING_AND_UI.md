# Work Package 07: Rendering and UI

## Objective
Replace the JS single-canvas rendering pipeline and hand-drawn UI with Godot 4.x native nodes: TileMapLayer for terrain, AnimatedSprite2D for entities/effects, GPUParticles2D for particles, Camera2D for viewport management, and Control-based scenes for all UI panels. Port the "occult dungeon" design system (colors, fonts, gradients) to a Godot Theme resource.

## Dependencies
- WP 01 (Project Foundation) -- GameManager, EventBus, Constants
- WP 02 (Map & Dungeon) -- TileMapLayer terrain data
- WP 03 (Player) -- Player node with stats for unit frames
- WP 04 (Enemies) -- Enemy nodes with stats, sprites, animation configs
- WP 05 (Combat) -- Combat events, damage numbers, status effects
- WP 06 (Items & Loot) -- Item data for inventory/shop/bank/crafting UIs

## Source Files

### Rendering (js/rendering/ -- 18 files)
| JS File | Lines | Key Exports | Godot Replacement |
|---------|-------|-------------|-------------------|
| `tile-renderer.js` | 2324 | `TileRenderer.draw()`, pixel-array tile definitions, palette system | TileMapLayer + TileSet atlas |
| `sprite-renderer.js` | 888 | `SpriteRenderer.draw()`, cache, outline/glow effects | AnimatedSprite2D + SpriteFrames |
| `sprite-animations.js` | 1589 | `ANIMATION_TYPES`, `MONSTER_ANIMATION_CONFIG`, delta-based frames | AnimationPlayer / SpriteFrames per-monster |
| `effect-sprites.js` | 2543 | `EffectSprites` -- per-pixel frame definitions for 30+ effects | Pre-exported PNG spritesheets |
| `player-equipment-sprites.js` | 2095 | `EQUIPMENT_SPRITES` -- 32x32 directional weapon/armor overlays | Equipment overlay sprites (4-dir) |
| `effect-animator.js` | 798 | `EffectAnimator` -- phase machine (windup/strike/recovery) | AnimationPlayer with method tracks |
| `effect-renderer.js` | 1263 | `EffectRenderer.draw()` -- rotation, alpha, blend modes, glow | CanvasItem shader + AnimatedSprite2D |
| `player-sprite-renderer.js` | 401 | Player composite rendering with equipment layers | Player AnimatedSprite2D + equipment child nodes |
| `bodypart-renderer.js` | 242 | `BodypartRenderer` class -- 6-layer humanoid compositing, state machine | AnimatedSprite2D with layered child sprites |
| `humanoid-generator.js` | 486 | Procedural humanoid generation from body part data | Pre-baked SpriteFrames (export once) |
| `sprite-integration.js` | 471 | `MONSTER_SPRITE_MAP` -- display name to sprite key mapping | Resource lookup dictionary |
| `effect-animations.js` | -- | Animation timing configs per effect type | Embedded in AnimationPlayer resources |
| `player-sprites.js` | -- | Player base sprite pixel data (4-dir, idle/walk) | Player spritesheet PNG |
| `player-sprite-animations.js` | -- | Player walk cycle frame data | SpriteFrames resource |
| `bodypart-sprite-registry.js` | -- | Registry of all bodypart sprite sets | SpriteFrames per bodypart variant |
| `bodypart-walk-animation.js` | -- | Walk cycle offsets per bodypart | AnimationPlayer bone offsets |
| `base-sprite-loader.js` | -- | PNG spritesheet loader | Godot import pipeline (automatic) |
| `uvmap-renderer.js` | -- | UV-map procedural animation generator | Shader-based or pre-baked SpriteFrames |

### UI (js/ui/ -- 32 files)
| JS File | Lines | Key Exports | Godot Scene |
|---------|-------|-------------|-------------|
| `renderer.js` | 2321 | Canvas setup, `drawInventoryOverlay()`, zoom, color constants | Replaced by scene tree + Camera2D |
| `ui-design-system.js` | 3417 | `UI_COLORS`, `UI_FONT_FAMILY`, `UI_GRADIENTS`, `UI_EFFECTS`, panel/button draw helpers | `res://resources/ui/theme.tres` |
| `action-bar-ui.js` | 2172 | `ACTION_BAR_CONFIG`, ability icon draw functions, cooldown sweeps | `action_bar.tscn` |
| `unit-frames.js` | 1392 | `UNIT_FRAME_CONFIG`, `renderPlayerFrame()`, `renderEnemyFrame()`, status effects | `hud.tscn` (unit frame components) |
| `skills-ui.js` | 1403 | `SKILLS_UI_CONFIG`, radar chart, proficiency display | `skills_panel.tscn` |
| `enemy-renderer.js` | 1000 | `tryDrawEnemySprite()`, tier indicators, AI state visualization | Enemy scene AnimatedSprite2D + HUD child |
| `loadout-ui.js` | 1279 | `LoadoutUI` -- 3-panel grid (bank/equipment/inventory), spell select | `loadout_panel.tscn` |
| `map-overlay.js` | 1035 | `mapOverlayState`, zoom/pan, fog of war, entity markers | `map_overlay.tscn` |
| `bulletin-ui.js` | 1046 | `BulletinUI` -- bounties/rumors/notices tabs | `bulletin_panel.tscn` |
| `shop-ui.js` | 974 | `ShopUI` -- buy/sell tabs, NPC inventories, validation | `shop_panel.tscn` |
| `icon-sidebar.js` | 996 | `SIDEBAR_ICONS` -- character/inventory/skills/map/shift toggles | `icon_sidebar.tscn` |
| `bank-ui.js` | 906 | `BankUI` -- deposit/withdraw with dual-pane list | `bank_panel.tscn` |
| `dialogue-ui.js` | 857 | `DialogueUI` -- typewriter text, NPC portrait, branching options | `dialogue_box.tscn` |
| `mini-map.js` | 847 | `MINIMAP_CONFIG`, `MinimapCache`, circular radar with scan line | `mini_map.tscn` |
| `shrine-ui.js` | 808 | `ShrineUI` -- boon card selection, replacement mode | `shrine_selection.tscn` |
| `crafting-ui.js` | 789 | `CraftingUI` -- category tabs, recipe list, material requirements | `crafting_panel.tscn` |
| `character-overlay.js` | 722 | Character stats sheet, safe value formatting | `character_sheet.tscn` |
| `tile-renderer.js` (ui/) | 719 | Procedural tile generation (village tiles) | TileMapLayer for village |
| `chest-ui.js` | 710 | `ChestUI` -- loot list, take/take-all buttons | `chest_panel.tscn` |
| `quest-ui.js` | 671 | `QuestUI` -- quest log list/detail/NPC modes | `quest_panel.tscn` |
| `journal-ui.js` | 674 | Quest journal overlay | `journal.tscn` |
| `village-renderer.js` | 654 | `VillageRenderer` -- tile colors, building rendering, decorations | Village TileMapLayer + scene |
| `tavern-games-ui.js` | 648 | Tavern mini-game interface | `tavern_games.tscn` |
| `combat-log-ui.js` | 167 | `CombatLogUI` -- color-coded scrolling messages | `combat_log.tscn` |
| `kill-streak-ui.js` | 304 | `KillStreakUI` -- counter, tier announcements, decay ring | `kill_streak.tscn` |
| `monster-animations.js` | -- | Monster animation state management | Merged into enemy scene scripts |
| `sprite-loader.js` | -- | Spritesheet loading from PNG files | Godot import pipeline |
| `tooltip-manager.js` | -- | Tooltip positioning/display | `item_tooltip.tscn` |
| `health-bar-utils.js` | -- | Shared health bar drawing utilities | `health_bar.tscn` component |
| `ui-renderer.js` | -- | Additional UI render dispatch | Replaced by scene tree |
| `shift-overlay.js` | -- | Corruption shift overlay effect | Shader on CanvasLayer |
| `right-click-init.js` | -- | Right-click context menu setup | InputEvent handling in GDScript |

### Effects (js/effects/ -- 5 files)
| JS File | Lines | Key Exports | Godot Replacement |
|---------|-------|-------------|-------------------|
| `particle-system.js` | 1612 | `ParticleCanvas`, `ParticlePool`, fire/spark/magic/blood particle types | GPUParticles2D with particle materials |
| `monster-attack-effects.js` | 648 | `MonsterMagicEffect`, element color configs, projectile trails | AnimatedSprite2D + GPUParticles2D |
| `melee-slash-effect.js` | 589 | `MeleeSlashEffect` -- WINDUP/SLASH/FADE state machine, arc geometry | AnimatedSprite2D + shader |
| `village-atmosphere.js` | 475 | `AshfallEffect`, `FireflyEffect`, ambient weather particles | GPUParticles2D with WorldEnvironment |
| `ability-effects-data.js` | 503 | `ABILITY_EFFECTS` -- telegraph/impact/particle/camera configs per ability | Resource dictionaries |

---

## Critical Architecture Change

### JS Architecture (Single Canvas)
```
HTML5 Canvas (one ctx)
  |-- Manual viewport calculation (camera offset)
  |-- Per-frame full redraw at 60fps
  |-- Z-order by draw call sequence
  |-- UI drawn on same canvas as world
  |-- Particle overlay canvas (separate, click-through)
```

### Godot Architecture (Scene Tree)
```
Main (Node2D)
  |-- World (Node2D)
  |     |-- TileMapLayer (terrain)
  |     |-- Entities (Node2D, y-sorted)
  |     |     |-- Player (CharacterBody2D + AnimatedSprite2D)
  |     |     |-- Enemies (CharacterBody2D + AnimatedSprite2D each)
  |     |     |-- GroundLoot (Area2D each)
  |     |-- Effects (Node2D)
  |           |-- GPUParticles2D (ambient)
  |           |-- EffectSprites (AnimatedSprite2D, pooled)
  |-- Camera2D (follows player)
  |-- UILayer (CanvasLayer, layer=10)
  |     |-- HUD (always visible)
  |     |     |-- UnitFrames, ActionBar, MiniMap, CombatLog, KillStreak
  |     |-- Overlays (toggled)
  |     |     |-- CharacterSheet, MapOverlay, SkillsPanel, Journal
  |     |-- Panels (modal)
  |           |-- Inventory, Shop, Bank, Crafting, Dialogue, Chest, Shrine, etc.
  |-- WorldEffectsLayer (CanvasLayer, layer=5)
        |-- GPUParticles2D (ashfall, fireflies)
        |-- ShiftOverlay (ColorRect + shader)
```

---

## Part 1: Sprite System Migration

### 1.1 Decision: Export to PNG (Recommended)

The JS codebase defines all sprites as character-grid pixel arrays rendered to offscreen canvases. Example from `sprite-renderer.js`:
```javascript
// Each row is a string, each char maps to a palette color
pixels: [
    "..W..",
    ".WWW.",
    "WWWWW",
    ".WWW.",
    "..W.."
],
palette: { 'W': '#FFFFFF' }
```

**Migration strategy:** Run a one-time export tool that:
1. Iterates all entries in `EffectSprites`, `EQUIPMENT_SPRITES`, and monster sprite registries
2. Renders each frame to an offscreen canvas at 1x scale
3. Packs frames into spritesheet PNGs (one per entity/effect)
4. Generates `.tres` SpriteFrames resources pointing to the atlas

**Export tool (run once in browser):**
```javascript
function exportAllSprites() {
    const entries = Object.entries(EffectSprites);
    entries.forEach(([name, def]) => {
        const frames = def.frames || [def];
        frames.forEach((frame, i) => {
            const canvas = document.createElement('canvas');
            canvas.width = def.width;
            canvas.height = def.height;
            const ctx = canvas.getContext('2d');
            // render pixel-by-pixel...
            const link = document.createElement('a');
            link.download = `${name}_frame${i}.png`;
            link.href = canvas.toDataURL();
            link.click();
        });
    });
}
```

**Resulting Godot resources:**
```
res://assets/sprites/
  effects/
    claw_swipe.png          # Spritesheet: 5 frames horizontal
    fire_breath.png
    melee_swing.png
    ...
  monsters/
    magma_slime.png         # Spritesheet: idle(4) + attack(4) + death(4)
    skeletal_warrior.png
    ...
  player/
    player_base.png         # 4-dir idle + walk (8 frames per dir)
    equipment/
      sword_basic.png       # 4-dir weapon overlay
      chainmail.png         # 4-dir armor overlay
      ...
  tiles/
    dungeon_tileset.png     # Exported tile atlas
    village_tileset.png
```

### 1.2 SpriteFrames Resource Setup

For each monster, create a `SpriteFrames` resource:

```gdscript
# res://resources/sprites/monster_frames.gd
# Helper to build SpriteFrames from spritesheet conventions

static func create_monster_frames(
    texture: Texture2D,
    frame_size: Vector2i = Vector2i(32, 32),
    animations: Dictionary = {}
) -> SpriteFrames:
    var sf := SpriteFrames.new()
    sf.remove_animation("default")

    # Standard monster animations from ANIMATION_TYPES + ANIMATION_PHASES
    var anim_defs := {
        "idle_down": { "row": 0, "frames": 4, "speed": 4.0, "loop": true },
        "idle_up": { "row": 1, "frames": 4, "speed": 4.0, "loop": true },
        "idle_left": { "row": 2, "frames": 4, "speed": 4.0, "loop": true },
        "walk_down": { "row": 3, "frames": 6, "speed": 8.0, "loop": true },
        "walk_up": { "row": 4, "frames": 6, "speed": 8.0, "loop": true },
        "walk_left": { "row": 5, "frames": 6, "speed": 8.0, "loop": true },
        "attack_windup": { "row": 6, "frames": 3, "speed": 6.0, "loop": false },
        "attack_strike": { "row": 7, "frames": 2, "speed": 12.0, "loop": false },
        "attack_recovery": { "row": 8, "frames": 2, "speed": 6.0, "loop": false },
        "death": { "row": 9, "frames": 4, "speed": 6.0, "loop": false },
    }
    anim_defs.merge(animations, true)  # Allow overrides

    for anim_name in anim_defs:
        var def: Dictionary = anim_defs[anim_name]
        sf.add_animation(anim_name)
        sf.set_animation_speed(anim_name, def.get("speed", 8.0))
        sf.set_animation_loop(anim_name, def.get("loop", true))

        var row: int = def["row"]
        var frame_count: int = def["frames"]
        for i in range(frame_count):
            var atlas := AtlasTexture.new()
            atlas.atlas = texture
            atlas.region = Rect2i(
                i * frame_size.x,
                row * frame_size.y,
                frame_size.x,
                frame_size.y
            )
            sf.add_frame(anim_name, atlas)

    return sf
```

**FlipH for right-facing:** The JS system uses `flipX` for right direction (mirrors left sprites). In Godot, set `AnimatedSprite2D.flip_h = true` when facing right.

### 1.3 BodypartRenderer -> Layered Sprite Composition

The JS `BodypartRenderer` composites 6 body parts (head, body, arm_l, arm_r, leg_l, leg_r) with per-frame offsets and direction-dependent z-ordering.

**Godot equivalent:**
```
EnemySprite (Node2D)
  |-- BodyLayer (Node2D, for z-ordering)
  |     |-- LegL (Sprite2D)
  |     |-- LegR (Sprite2D)
  |     |-- Body (Sprite2D)
  |     |-- ArmL (Sprite2D)
  |     |-- ArmR (Sprite2D)
  |     |-- Head (Sprite2D)
  |-- AnimationPlayer
```

```gdscript
# res://scripts/rendering/bodypart_sprite.gd
class_name BodypartSprite
extends Node2D

@export var sprite_set: Resource  # BodypartSpriteData resource

@onready var head: Sprite2D = $BodyLayer/Head
@onready var body: Sprite2D = $BodyLayer/Body
@onready var arm_l: Sprite2D = $BodyLayer/ArmL
@onready var arm_r: Sprite2D = $BodyLayer/ArmR
@onready var leg_l: Sprite2D = $BodyLayer/LegL
@onready var leg_r: Sprite2D = $BodyLayer/LegR

var current_direction: String = "down"
var current_state: String = "idle"

# Z-order per direction (from JS BodypartRenderer)
const Z_ORDER := {
    "down": ["leg_l", "leg_r", "body", "arm_l", "head", "arm_r"],
    "up": ["arm_l", "arm_r", "head", "body", "leg_l", "leg_r"],
    "left": ["arm_r", "leg_r", "body", "leg_l", "head", "arm_l"],
}

func set_direction(dir: String) -> void:
    current_direction = dir
    var use_flip := dir == "right"
    var lookup_dir := "left" if use_flip else dir

    # Apply z-order
    var order: Array = Z_ORDER.get(lookup_dir, Z_ORDER["down"])
    for i in range(order.size()):
        var part: Sprite2D = get_node("BodyLayer/" + _part_name(order[i]))
        part.z_index = i

    # Flip for right direction
    for child in $BodyLayer.get_children():
        if child is Sprite2D:
            child.flip_h = use_flip

func _part_name(key: String) -> String:
    match key:
        "leg_l": return "LegL"
        "leg_r": return "LegR"
        "arm_l": return "ArmL"
        "arm_r": return "ArmR"
        "body": return "Body"
        "head": return "Head"
        _: return key
```

### 1.4 Player Equipment Overlays

The JS `EQUIPMENT_SPRITES` defines 32x32 directional overlays for weapons/armor that draw on top of the player sprite. Each equipment piece has `down`, `up`, `left` pixel arrays with `offsetX`/`offsetY`.

**Godot approach:**
```
Player (CharacterBody2D)
  |-- SpriteStack (Node2D)
  |     |-- BaseSprite (AnimatedSprite2D)  # Player body
  |     |-- ArmorSprite (Sprite2D)         # Armor overlay
  |     |-- WeaponSprite (Sprite2D)        # Weapon overlay
  |     |-- ShieldSprite (Sprite2D)        # Off-hand overlay
  |-- AnimationPlayer
```

```gdscript
# When equipment changes:
func update_equipment_visuals(slot: String, item_data: Dictionary) -> void:
    var sprite_key: String = item_data.get("sprite_key", "")
    if sprite_key.is_empty():
        _clear_slot_visual(slot)
        return

    var tex: Texture2D = load("res://assets/sprites/player/equipment/%s.png" % sprite_key)
    match slot:
        "MAIN":
            weapon_sprite.texture = tex
        "CHEST":
            armor_sprite.texture = tex
        "OFF":
            shield_sprite.texture = tex

# On direction change, update frame region for directional equipment:
func _update_equipment_direction(dir: String) -> void:
    var dir_index := {"down": 0, "up": 1, "left": 2, "right": 2}[dir]
    var flip := dir == "right"

    for overlay in [weapon_sprite, armor_sprite, shield_sprite]:
        if overlay.texture:
            overlay.region_rect.position.y = dir_index * 32
            overlay.flip_h = flip
```

---

## Part 2: TileMap Terrain Rendering

### 2.1 Replacing tile-renderer.js

The JS `TileRenderer` defines tiles as 16x16 pixel arrays with palettes and draws them to cached offscreen canvases. In Godot, this becomes a `TileSet` resource with a texture atlas.

**Export tileset:** Run the JS tile renderer for every tile type/variant, output to a single atlas PNG.

**TileSet resource (`res://resources/tilesets/dungeon_tileset.tres`):**
```
TileSet:
  tile_size: 16x16
  physics_layer[0]: walls (collision)
  terrain_set[0]: dungeon_floor
  terrain_set[1]: dungeon_wall
  custom_data_layer[0]: "tile_type" (int)
  custom_data_layer[1]: "blocks_movement" (bool)
  custom_data_layer[2]: "blocks_vision" (bool)
```

**TileMapLayer setup in dungeon scene:**
```gdscript
# res://scenes/world/dungeon.gd (rendering portion)

func _populate_tilemap(map_data: Array) -> void:
    var tilemap: TileMapLayer = $TileMapLayer

    for y in range(map_data.size()):
        for x in range(map_data[y].size()):
            var tile_type: int = map_data[y][x]
            var coords := Vector2i(x, y)

            # Map JS tile types to TileSet atlas coords
            var atlas_coords: Vector2i = _tile_type_to_atlas(tile_type)
            tilemap.set_cell(coords, 0, atlas_coords)

func _tile_type_to_atlas(tile_type: int) -> Vector2i:
    # Maps Constants.TileType enum values to tileset atlas positions
    match tile_type:
        Constants.TileType.FLOOR: return Vector2i(0, 0)
        Constants.TileType.WALL: return Vector2i(1, 0)
        Constants.TileType.DOOR: return Vector2i(2, 0)
        Constants.TileType.STAIRS_DOWN: return Vector2i(3, 0)
        Constants.TileType.LAVA: return Vector2i(4, 0)
        Constants.TileType.WATER: return Vector2i(5, 0)
        _: return Vector2i(0, 0)
```

### 2.2 Fog of War

The JS version skips drawing unexplored tiles and dims explored-but-not-visible tiles. In Godot:

**Option A: Second TileMapLayer overlay (simple):**
```
DungeonScene
  |-- TerrainLayer (TileMapLayer)
  |-- FogLayer (TileMapLayer, z_index=5)
```
- FogLayer starts fully black (opaque tile on every cell)
- As tiles are explored, replace with semi-transparent "dimmed" tile
- Visible tiles: remove fog cell entirely
- On player move: update visible radius, set fog cells accordingly

**Option B: CanvasItem shader (performant for large maps):**
```gdscript
# fog_of_war.gdshader
shader_type canvas_item;

uniform sampler2D visibility_texture : filter_nearest;  # R=visible, G=explored
uniform vec2 map_size;

void fragment() {
    vec2 uv = SCREEN_UV;  // Would need world-to-map transform
    vec4 vis = texture(visibility_texture, uv);

    if (vis.r > 0.5) {
        // Fully visible - no modification
        COLOR.a = 0.0;
    } else if (vis.g > 0.5) {
        // Explored but not visible - dim overlay
        COLOR = vec4(0.0, 0.0, 0.0, 0.6);
    } else {
        // Unexplored - full black
        COLOR = vec4(0.0, 0.0, 0.0, 1.0);
    }
}
```

### 2.3 Village Rendering

The JS `VillageRenderer` uses a separate color map for village tiles (grass, path, cobblestone, etc.) and draws decorations (trees, barrels, wells) as colored rectangles.

**Godot approach:**
- Separate `TileSet` for village with terrain types for grass, paths, stone, buildings
- Buildings as separate `StaticBody2D` scenes placed by the village generator
- Decorations as `Sprite2D` nodes from a decoration atlas
- NPCs placed as instanced `NPC.tscn` scenes

---

## Part 3: Camera2D Setup

### 3.1 Replacing Manual Viewport Calculation

The JS `renderer.js` calculates camera offset manually:
```javascript
currentZoom = calculateDynamicZoom(canvas.width);
// Every draw call offsets by camera position
ctx.drawImage(cached, Math.floor(x - cameraX), Math.floor(y - cameraY));
```

**Godot Camera2D:**
```gdscript
# res://scenes/main/game_camera.gd
class_name GameCamera
extends Camera2D

const TILE_SIZE := 16

@export var follow_speed: float = 8.0
@export var viewport_tiles_x: int = 20  # From JS VIEWPORT_TILES_X
@export var viewport_tiles_y: int = 15  # From JS VIEWPORT_TILES_Y

var target: Node2D = null

func _ready() -> void:
    # Match JS zoom behavior: show fixed tile count regardless of resolution
    _calculate_zoom()
    position_smoothing_enabled = true
    position_smoothing_speed = follow_speed

func _calculate_zoom() -> void:
    var viewport_size := get_viewport_rect().size
    var zoom_x := viewport_size.x / (viewport_tiles_x * TILE_SIZE)
    var zoom_y := viewport_size.y / (viewport_tiles_y * TILE_SIZE)
    var target_zoom := minf(zoom_x, zoom_y)
    zoom = Vector2(target_zoom, target_zoom)

func _process(_delta: float) -> void:
    if target:
        global_position = target.global_position

func set_target(node: Node2D) -> void:
    target = node

func _on_viewport_size_changed() -> void:
    _calculate_zoom()
```

**Configuration in scene:**
```
Camera2D:
  position_smoothing_enabled: true
  position_smoothing_speed: 8.0
  limit_left: 0
  limit_top: 0
  limit_right: GRID_WIDTH * TILE_SIZE
  limit_bottom: GRID_HEIGHT * TILE_SIZE
```

---

## Part 4: GPUParticles2D -- Particle System Migration

### 4.1 Replacing ParticleCanvas + ParticlePool

The JS `ParticleCanvas` creates a click-through overlay canvas. `ParticlePool` pre-allocates 500 particle objects. The system supports: fire trails, blood splatter, magic sparks, loot shimmer, heal glow, environmental ashfall/fireflies.

**Godot GPUParticles2D per effect type:**

```gdscript
# res://scenes/effects/particle_library.gd
class_name ParticleLibrary
extends Node

# Pre-configured particle scenes for each JS particle type
const PARTICLE_SCENES := {
    "fire_trail": preload("res://scenes/effects/particles/fire_trail.tscn"),
    "blood_splatter": preload("res://scenes/effects/particles/blood_splatter.tscn"),
    "magic_sparks": preload("res://scenes/effects/particles/magic_sparks.tscn"),
    "loot_shimmer": preload("res://scenes/effects/particles/loot_shimmer.tscn"),
    "heal_glow": preload("res://scenes/effects/particles/heal_glow.tscn"),
    "death_poof": preload("res://scenes/effects/particles/death_poof.tscn"),
}

func spawn_effect(type: String, position: Vector2, options: Dictionary = {}) -> GPUParticles2D:
    var scene: PackedScene = PARTICLE_SCENES.get(type)
    if not scene:
        push_warning("Unknown particle type: %s" % type)
        return null

    var particles: GPUParticles2D = scene.instantiate()
    particles.global_position = position
    particles.emitting = true
    particles.one_shot = options.get("one_shot", true)

    # Apply option overrides
    if options.has("color"):
        var mat: ParticleProcessMaterial = particles.process_material
        mat.color = options["color"]
    if options.has("amount"):
        particles.amount = options["amount"]

    # Add to effects layer
    get_tree().current_scene.get_node("World/Effects").add_child(particles)

    # Auto-cleanup for one-shot effects
    if particles.one_shot:
        particles.finished.connect(particles.queue_free)

    return particles
```

### 4.2 Particle Type Configurations

**Fire trail** (from JS: `{ color: [255, 100, 0], size: 2-4, lifetime: 0.3-0.8, gravity: -30 }`):
```
GPUParticles2D:
  amount: 30
  lifetime: 0.6
  one_shot: false
  process_material: ParticleProcessMaterial
    emission_shape: POINT
    direction: (0, -1, 0)
    spread: 25.0
    initial_velocity_min: 20.0
    initial_velocity_max: 40.0
    gravity: (0, -30, 0)
    scale_min: 2.0
    scale_max: 4.0
    color: Color(1.0, 0.4, 0.0, 1.0)
    color_ramp: Gradient (orange -> red -> transparent)
```

**Blood splatter** (from JS: one-shot burst, gravity pulls down):
```
GPUParticles2D:
  amount: 12
  lifetime: 0.5
  one_shot: true
  explosiveness: 0.9
  process_material: ParticleProcessMaterial
    emission_shape: SPHERE (radius 2)
    direction: (0, -0.5, 0)
    spread: 180.0
    initial_velocity_min: 30.0
    initial_velocity_max: 60.0
    gravity: (0, 100, 0)
    scale_min: 1.5
    scale_max: 3.0
    color: Color(0.7, 0.1, 0.1, 1.0)
```

### 4.3 Village Atmosphere Effects

**Ashfall** (from JS `AshfallEffect`, world state 2):
```
GPUParticles2D:
  amount: 100
  lifetime: 4.0
  visibility_rect: Rect2(-640, -360, 1280, 720)  # Viewport-sized
  process_material:
    emission_shape: BOX (1280 x 10 x 0, positioned above viewport)
    direction: (0, 1, 0)
    spread: 15.0
    initial_velocity_min: 15.0
    initial_velocity_max: 25.0
    gravity: (0, 5, 0)
    angular_velocity_min: -90.0
    angular_velocity_max: 90.0
    scale_min: 1.0
    scale_max: 2.0
    color: Color(0.6, 0.6, 0.6, 0.4)
```

**Fireflies** (village night atmosphere):
```
GPUParticles2D:
  amount: 20
  lifetime: 3.0
  process_material:
    emission_shape: BOX (viewport area)
    direction: (0, -0.2, 0)
    spread: 180.0
    initial_velocity_min: 5.0
    initial_velocity_max: 15.0
    gravity: (0, 0, 0)
    scale_min: 1.0
    scale_max: 2.0
    color: Color(0.9, 1.0, 0.3, 0.8)
    color_ramp: Gradient (glow pulse via alpha)
```

---

## Part 5: UI Theme System

### 5.1 Porting UI_COLORS and UI_FONT_FAMILY

The JS `ui-design-system.js` defines a comprehensive occult-themed color palette with ~80 named colors, 3 font families, gradient factories, and shadow/glow configs.

**Godot Theme resource (`res://resources/ui/game_theme.tres`):**

```gdscript
# res://resources/ui/ui_constants.gd
class_name UIConstants
extends RefCounted

# === BACKGROUNDS (Warm Charcoal/Soot) ===
const BG_DARKEST := Color("#0d0d0d")
const BG_DARK := Color("#141414")
const BG_MEDIUM := Color("#1c1c1c")
const BG_LIGHT := Color("#262626")
const BG_HIGHLIGHT := Color("#2e2e2e")

# === HEALTH ===
const HEALTH := Color("#a82828")
const HEALTH_BRIGHT := Color("#c43030")
const HEALTH_DARK := Color("#5a1515")
const HEALTH_CRITICAL := Color("#ff3030")

# === MANA ===
const MANA := Color("#7a89c2")
const MANA_BRIGHT := Color("#9aa8d4")
const MANA_DARK := Color("#3d4461")

# === STAMINA ===
const STAMINA := Color("#5da182")
const STAMINA_BRIGHT := Color("#72b896")
const STAMINA_DARK := Color("#2e5141")

# === CORRUPTION ===
const CORRUPTION := Color("#6b3a7d")
const CORRUPTION_BRIGHT := Color("#8a4f9e")
const CORRUPTION_DARK := Color("#3a1f42")

# === GOLD/XP ===
const GOLD := Color("#c9a227")
const GOLD_BRIGHT := Color("#e0b830")
const GOLD_DARK := Color("#7a6118")
const XP := Color("#8fafc4")

# === TEXT (Parchment/Bone) ===
const TEXT_PRIMARY := Color("#efe4b0")
const TEXT_SECONDARY := Color("#b8a878")
const TEXT_MUTED := Color("#706850")
const TEXT_DISABLED := Color("#4a4438")

# === BORDERS ===
const BORDER := Color("#3a3530")
const BORDER_BRIGHT := Color("#585048")
const BORDER_ACTIVE := Color("#a82828")

# === FRAME (Ornate Gold) ===
const FRAME_GOLD := Color("#b8860b")
const FRAME_GOLD_BRIGHT := Color("#daa520")
const FRAME_GOLD_DARK := Color("#8b6914")

# === RARITY ===
const RARITY := {
    "common": Color("#787068"),
    "uncommon": Color("#5a9868"),
    "rare": Color("#5878a8"),
    "epic": Color("#7a5898"),
    "legendary": Color("#c49030"),
    "mythic": Color("#a84848"),
}

# === ELEMENTS ===
const ELEMENTS := {
    "fire": Color("#c47030"),
    "water": Color("#5878a0"),
    "earth": Color("#7a5a3a"),
    "nature": Color("#5a8858"),
    "shadow": Color("#6a4878"),
    "death": Color("#484848"),
    "physical": Color("#8a8070"),
    "holy": Color("#c4a840"),
}

# === WARNING ACCENTS ===
const DANGER := Color("#c94a3a")
const WARNING := Color("#d4852a")
const SUCCESS := Color("#5da182")
```

### 5.2 Theme Resource Construction

```gdscript
# res://resources/ui/theme_builder.gd
# Run once at project setup or as @tool script

static func build_game_theme() -> Theme:
    var theme := Theme.new()

    # --- Fonts ---
    # JS: '"Roboto Slab", "Bitter", Georgia, serif'
    # Load .ttf/.otf files, create FontVariation for sizes
    var font_display := load("res://assets/fonts/RobotoSlab-Regular.ttf")
    var font_accent := load("res://assets/fonts/Cinzel-Regular.ttf")

    theme.set_default_font(font_display)
    theme.set_default_font_size(14)

    # Size variations
    theme.set_font_size("font_size", "HeaderLabel", 20)
    theme.set_font_size("font_size", "TitleLabel", 16)
    theme.set_font("font", "HeaderLabel", font_accent)

    # --- PanelContainer StyleBox ---
    var panel_bg := StyleBoxFlat.new()
    panel_bg.bg_color = UIConstants.BG_DARK
    panel_bg.border_color = UIConstants.BORDER
    panel_bg.set_border_width_all(2)
    panel_bg.set_corner_radius_all(4)
    panel_bg.shadow_color = Color(0, 0, 0, 0.6)
    panel_bg.shadow_size = 6
    panel_bg.shadow_offset = Vector2(3, 3)
    theme.set_stylebox("panel", "PanelContainer", panel_bg)

    # --- Button StyleBox ---
    var btn_normal := StyleBoxFlat.new()
    btn_normal.bg_color = UIConstants.BG_MEDIUM
    btn_normal.border_color = UIConstants.BORDER
    btn_normal.set_border_width_all(1)
    btn_normal.set_corner_radius_all(3)
    theme.set_stylebox("normal", "Button", btn_normal)

    var btn_hover := btn_normal.duplicate()
    btn_hover.bg_color = UIConstants.BG_HIGHLIGHT
    btn_hover.border_color = UIConstants.BORDER_BRIGHT
    theme.set_stylebox("hover", "Button", btn_hover)

    var btn_pressed := btn_normal.duplicate()
    btn_pressed.bg_color = UIConstants.BG_DARKEST
    btn_pressed.border_color = UIConstants.BORDER_ACTIVE
    theme.set_stylebox("pressed", "Button", btn_pressed)

    # --- Label Colors ---
    theme.set_color("font_color", "Label", UIConstants.TEXT_PRIMARY)
    theme.set_color("font_color", "Button", UIConstants.TEXT_PRIMARY)

    # --- ProgressBar (Health/Mana/Stamina) ---
    var bar_bg := StyleBoxFlat.new()
    bar_bg.bg_color = UIConstants.BG_DARKEST
    bar_bg.set_corner_radius_all(2)
    theme.set_stylebox("background", "ProgressBar", bar_bg)

    # Health bar fill (override per-instance for mana/stamina)
    var bar_fill := StyleBoxFlat.new()
    bar_fill.bg_color = UIConstants.HEALTH
    bar_fill.set_corner_radius_all(2)
    theme.set_stylebox("fill", "ProgressBar", bar_fill)

    return theme
```

### 5.3 Font Setup

JS fonts: `"Roboto Slab"` (body), `"Cinzel"` (accent headers).

```
res://assets/fonts/
  RobotoSlab-Regular.ttf
  RobotoSlab-Bold.ttf
  Cinzel-Regular.ttf
  Cinzel-Bold.ttf
```

Import settings in Godot: set antialiasing to `NONE` for pixel-art style at small sizes, or `LCD` for larger UI text.

---

## Part 6: UI Panels -- Scene-by-Scene Conversion

### 6.1 Target Directory Structure

```
scenes/ui/
  hud/
    hud.tscn + hud.gd
    mini_map.tscn + mini_map.gd
    combat_log.tscn + combat_log.gd
    kill_streak.tscn + kill_streak.gd
  menus/
    main_menu.tscn + main_menu.gd
    pause_menu.tscn + pause_menu.gd
    game_over.tscn + game_over.gd
  overlays/
    character_sheet.tscn + character_sheet.gd
    map_overlay.tscn + map_overlay.gd
    skills_panel.tscn + skills_panel.gd
    journal.tscn + journal.gd
  inventory/
    inventory_panel.tscn + inventory_panel.gd
    inventory_slot.tscn + inventory_slot.gd
    loadout_panel.tscn + loadout_panel.gd
  dialogue/
    dialogue_box.tscn + dialogue_box.gd
  shop/
    shop_panel.tscn + shop_panel.gd
    bank_panel.tscn + bank_panel.gd
  crafting/
    crafting_panel.tscn + crafting_panel.gd
  combat/
    action_bar.tscn + action_bar.gd
    shrine_selection.tscn + shrine_selection.gd
  village/
    bulletin_panel.tscn + bulletin_panel.gd
    tavern_games.tscn + tavern_games.gd
  components/
    item_tooltip.tscn + item_tooltip.gd
    health_bar.tscn + health_bar.gd
    icon_button.tscn + icon_button.gd
    tab_bar.tscn + tab_bar.gd
```

---

### 6.2 HUD (unit-frames.js + action-bar-ui.js + mini-map.js + combat-log-ui.js + kill-streak-ui.js)

**Source:** `unit-frames.js` draws player/enemy frames at fixed screen positions with ornate gold borders, segmented health bars, status effect gem sockets. `action-bar-ui.js` draws hotkey slots with cooldown sweep overlays.

**Scene tree:**
```
HUD (CanvasLayer, layer=10)
  |-- TopBar (HBoxContainer)
  |     |-- PlayerFrame (PanelContainer)
  |     |     |-- HBox
  |     |     |     |-- Portrait (TextureRect, 58x58)
  |     |     |     |-- VBox
  |     |     |           |-- NameLabel (Label)
  |     |     |           |-- HealthBar (custom health_bar.tscn)
  |     |     |           |-- ManaBar (custom health_bar.tscn)
  |     |     |           |-- StaminaBar (custom health_bar.tscn)
  |     |     |-- StatusEffects (GridContainer, 4 cols)
  |     |           |-- StatusIcon x8 (TextureRect, 20x20)
  |     |-- EnemyFrame (PanelContainer, same structure, visible when target exists)
  |-- BottomCenter
  |     |-- ActionBar (HBoxContainer)
  |           |-- ActionSlot x6 (custom scenes)
  |                 |-- IconRect (TextureRect)
  |                 |-- HotkeyLabel (Label)
  |                 |-- CooldownOverlay (TextureRect + shader)
  |                 |-- QuantityLabel (Label)
  |-- TopRight
  |     |-- MiniMap (custom mini_map.tscn)
  |-- BottomLeft
  |     |-- CombatLog (custom combat_log.tscn)
  |-- TopCenter
        |-- KillStreak (custom kill_streak.tscn)
```

```gdscript
# res://scenes/ui/hud/hud.gd
extends CanvasLayer

@onready var player_frame: PanelContainer = %PlayerFrame
@onready var enemy_frame: PanelContainer = %EnemyFrame
@onready var health_bar: Control = %PlayerHealthBar
@onready var mana_bar: Control = %PlayerManaBar
@onready var stamina_bar: Control = %PlayerStaminaBar
@onready var action_bar: HBoxContainer = %ActionBar

func _ready() -> void:
    enemy_frame.visible = false
    EventBus.player_took_damage.connect(_on_player_damaged)
    EventBus.player_spell_heal.connect(_on_player_healed)

func _process(_delta: float) -> void:
    _update_player_frame()
    _update_enemy_frame()
    _update_action_bar()

func _update_player_frame() -> void:
    var player = GameManager.player
    if not player:
        return
    health_bar.set_value(player.hp, player.max_hp)
    mana_bar.set_value(player.mp, player.max_mp)
    stamina_bar.set_value(player.stamina, player.max_stamina)

func _update_enemy_frame() -> void:
    var target = GameManager.player.combat.current_target if GameManager.player else null
    if target and target.hp > 0:
        enemy_frame.visible = true
        # Update enemy bars...
    else:
        enemy_frame.visible = false

func _update_action_bar() -> void:
    # Update cooldown overlays, quantities, etc.
    pass
```

### 6.3 Health Bar Component

**Source:** `health-bar-utils.js` and the bar rendering in `unit-frames.js` (gradient fill, segmented optional, damage flash).

```
HealthBar (Control, custom_minimum_size 200x18)
  |-- Background (ColorRect)
  |-- FillBar (ColorRect, anchored left)
  |-- DamageFlash (ColorRect, modulate fades)
  |-- ValueLabel (Label, anchored center)
```

```gdscript
# res://scenes/ui/components/health_bar.gd
class_name HealthBarComponent
extends Control

@export var bar_color: Color = UIConstants.HEALTH
@export var bar_color_bright: Color = UIConstants.HEALTH_BRIGHT
@export var show_value: bool = true
@export var animate_damage: bool = true

@onready var fill_bar: ColorRect = $FillBar
@onready var damage_flash: ColorRect = $DamageFlash
@onready var value_label: Label = $ValueLabel

var current_value: float = 100.0
var max_value: float = 100.0
var _display_ratio: float = 1.0
var _damage_tween: Tween

func set_value(current: float, maximum: float) -> void:
    var old_ratio := _display_ratio
    current_value = current
    max_value = maximum
    _display_ratio = clampf(current / maxf(maximum, 1.0), 0.0, 1.0)

    fill_bar.size.x = size.x * _display_ratio
    fill_bar.color = bar_color

    # Pulse at low health (JS: healthCritical flash)
    if _display_ratio < 0.25:
        fill_bar.color = UIConstants.HEALTH_CRITICAL

    if show_value:
        value_label.text = "%d / %d" % [int(current), int(maximum)]

    # Damage flash animation
    if animate_damage and _display_ratio < old_ratio:
        _flash_damage(old_ratio)

func _flash_damage(old_ratio: float) -> void:
    if _damage_tween:
        _damage_tween.kill()
    damage_flash.size.x = size.x * old_ratio
    damage_flash.color = Color(1.0, 0.3, 0.3, 0.6)
    damage_flash.visible = true
    _damage_tween = create_tween()
    _damage_tween.tween_property(damage_flash, "size:x", fill_bar.size.x, 0.4)
    _damage_tween.parallel().tween_property(damage_flash, "color:a", 0.0, 0.4)
    _damage_tween.tween_callback(func(): damage_flash.visible = false)
```

### 6.4 Action Bar (action-bar-ui.js)

**Source:** `ACTION_BAR_CONFIG` defines 56px slots with 10px spacing. Slots show: consumable hotkeys (1-4), dash ability (Space), weapon skill (5). Each slot has cooldown sweep overlay and quantity counter.

**Scene tree:**
```
ActionBar (HBoxContainer, anchored bottom-center)
  |-- Slot1 (PanelContainer)  # Consumable hotkey 1
  |     |-- MarginContainer
  |     |     |-- IconRect (TextureRect, 22x22)
  |     |-- HotkeyLabel (Label, "1", anchored top-left)
  |     |-- CooldownArc (TextureRect + cooldown_sweep.gdshader)
  |     |-- QuantityLabel (Label, anchored bottom-right)
  |-- Slot2...
  |-- DashSlot (PanelContainer, accent border)
  |-- SkillSlot (PanelContainer)
```

```gdscript
# res://scenes/ui/combat/action_bar.gd
extends HBoxContainer

const SLOT_SCENE := preload("res://scenes/ui/components/action_slot.tscn")

var slots: Array[Control] = []

func _ready() -> void:
    _build_slots()
    EventBus.game_state_changed.connect(_on_state_changed)

func _build_slots() -> void:
    # 4 consumable slots + dash + weapon skill = 6 total
    for i in range(6):
        var slot := SLOT_SCENE.instantiate()
        add_child(slot)
        slots.append(slot)

    # Configure hotkeys
    slots[0].set_hotkey("1")
    slots[1].set_hotkey("2")
    slots[2].set_hotkey("3")
    slots[3].set_hotkey("4")
    slots[4].set_hotkey("SPACE")
    slots[4].set_icon_draw_callback(_draw_dash_icon)
    slots[5].set_hotkey("5")

func _process(_delta: float) -> void:
    var player = GameManager.player
    if not player:
        return

    # Update each slot's cooldown state
    for i in range(4):
        var item = player.hotbar_items[i] if i < player.hotbar_items.size() else null
        slots[i].update_item(item)

    # Dash slot
    var dash_ready: bool = player.can_dash()
    slots[4].set_cooldown_ratio(0.0 if dash_ready else player.dash_cooldown_ratio())
    slots[4].set_ready_state(dash_ready)
```

### 6.5 Mini-Map (mini-map.js)

**Source:** `MINIMAP_CONFIG` -- 160px diameter circular radar, 18-tile radius, scan line animation, entity pulse dots. `MinimapCache` caches terrain to offscreen canvas, only redraws entities each frame.

**Scene tree:**
```
MiniMap (Control, custom_minimum_size 160x160, anchored top-right)
  |-- SubViewportContainer (160x160, stretch=true)
  |     |-- SubViewport (160x160)
  |           |-- MapCamera (Camera2D, zoomed out)
  |           |-- MapTilePreview (TileMapLayer, simplified)
  |-- CircleMask (TextureRect, circle mask shader)
  |-- BorderRing (TextureRect, ornate ring overlay)
  |-- ScanLine (Line2D, rotating)
  |-- EntityDots (Control, custom draw)
```

**Alternative approach (simpler, matching JS behavior):**
```gdscript
# res://scenes/ui/hud/mini_map.gd
extends Control

const RADIUS := 80  # Half of 160px
const TILE_RADIUS := 18
const TILE_DOT_SIZE := 4

var scan_angle: float = 0.0
var pulse_phase: float = 0.0

func _process(delta: float) -> void:
    scan_angle += delta * 0.5  # Rotating scan line
    pulse_phase += delta * 2.0  # Entity pulse
    queue_redraw()

func _draw() -> void:
    var center := size / 2.0
    var player_pos: Vector2i = _get_player_grid_pos()

    # Background circle
    draw_circle(center, RADIUS, Color(0.05, 0.05, 0.05, 0.85))

    # Draw explored terrain dots
    _draw_terrain(center, player_pos)

    # Draw entity dots (enemies = red pulse, loot = gold, exit = cyan)
    _draw_entities(center, player_pos)

    # Scan line
    var scan_end := center + Vector2(cos(scan_angle), sin(scan_angle)) * RADIUS
    draw_line(center, scan_end, Color(0.2, 0.5, 1.0, 0.3), 1.0)

    # Border ring
    draw_arc(center, RADIUS, 0, TAU, 64, UIConstants.BORDER, 3.0)
    draw_arc(center, RADIUS - 3, 0, TAU, 64, UIConstants.FRAME_GOLD_DARK, 1.0)

    # Player dot (center, always visible)
    draw_circle(center, 3.0, Color(0.16, 0.5, 0.72))

func _draw_terrain(center: Vector2, player_pos: Vector2i) -> void:
    var map_data: Array = GameManager.map
    if map_data.is_empty():
        return
    for dy in range(-TILE_RADIUS, TILE_RADIUS + 1):
        for dx in range(-TILE_RADIUS, TILE_RADIUS + 1):
            if dx * dx + dy * dy > TILE_RADIUS * TILE_RADIUS:
                continue
            var mx := player_pos.x + dx
            var my := player_pos.y + dy
            if mx < 0 or my < 0 or my >= map_data.size() or mx >= map_data[my].size():
                continue
            var tile = map_data[my][mx]
            if not tile.get("explored", false):
                continue
            var screen_pos := center + Vector2(dx, dy) * TILE_DOT_SIZE
            var color := Color(0.15, 0.15, 0.15) if tile.get("type") == Constants.TileType.WALL else Color(0.25, 0.25, 0.25)
            draw_rect(Rect2(screen_pos - Vector2(2, 2), Vector2(4, 4)), color)
```

### 6.6 Combat Log (combat-log-ui.js)

**Source:** `CombatLogUI` -- max 50 messages, displays 5, auto-fade after 4s. Message types: `damage_dealt` (green), `damage_taken` (red), `heal` (cyan), `pickup` (gold), `level_up` (bright gold), `system` (muted), `death` (bright red).

**Scene tree:**
```
CombatLog (VBoxContainer, anchored bottom-left)
  |-- Message1 (RichTextLabel, max_lines=1)
  |-- Message2...
  |-- Message5
```

```gdscript
# res://scenes/ui/hud/combat_log.gd
extends VBoxContainer

const MAX_MESSAGES := 50
const DISPLAY_COUNT := 5
const MESSAGE_DURATION := 4.0
const FADE_DURATION := 1.0

const TYPE_COLORS := {
    "damage_dealt": Color("#7dce82"),
    "damage_taken": Color("#e85d5d"),
    "heal": Color("#82d9ce"),
    "pickup": Color("#daa520"),
    "level_up": Color("#ffd700"),
    "system": Color("#b8a878"),
    "death": Color("#ff4444"),
}

const TYPE_PREFIXES := {
    "damage_dealt": "* ",
    "damage_taken": "! ",
    "heal": "+ ",
    "pickup": "> ",
    "level_up": "^ ",
    "system": "",
    "death": "X ",
}

var messages: Array[Dictionary] = []

func add_message(text: String, type: String = "system") -> void:
    var msg := {
        "text": text,
        "type": type,
        "time": Time.get_ticks_msec() / 1000.0,
    }
    messages.push_back(msg)
    if messages.size() > MAX_MESSAGES:
        messages.pop_front()
    _refresh_display()

func _refresh_display() -> void:
    var visible_msgs := messages.slice(
        maxi(0, messages.size() - DISPLAY_COUNT),
        messages.size()
    )
    # Update label children
    for i in range(DISPLAY_COUNT):
        var label: RichTextLabel = get_child(i)
        if i < visible_msgs.size():
            var msg: Dictionary = visible_msgs[i]
            var color: Color = TYPE_COLORS.get(msg["type"], TYPE_COLORS["system"])
            var prefix: String = TYPE_PREFIXES.get(msg["type"], "")
            label.clear()
            label.push_color(color)
            label.add_text(prefix + msg["text"])
            label.pop()
            label.visible = true
        else:
            label.visible = false

func _process(_delta: float) -> void:
    # Fade old messages
    var now: float = Time.get_ticks_msec() / 1000.0
    for i in range(get_child_count()):
        var label: RichTextLabel = get_child(i)
        var idx: int = messages.size() - DISPLAY_COUNT + i
        if idx >= 0 and idx < messages.size():
            var age: float = now - messages[idx]["time"]
            if age > MESSAGE_DURATION:
                var fade_progress: float = clampf((age - MESSAGE_DURATION) / FADE_DURATION, 0.0, 1.0)
                label.modulate.a = 1.0 - fade_progress
            else:
                label.modulate.a = 1.0
```

### 6.7 Kill Streak (kill-streak-ui.js)

**Source:** `KillStreakUI` -- circular counter at top-center, tier announcement text, decay timer ring, streak-lost flash.

**Scene tree:**
```
KillStreak (Control, anchored top-center)
  |-- CounterCircle (Control, custom_draw for ring + number)
  |-- TierAnnouncement (Label, centered below counter)
  |-- LostFlash (ColorRect, full-width red flash)
```

```gdscript
# res://scenes/ui/hud/kill_streak.gd
extends Control

@onready var counter_label: Label = %CounterLabel
@onready var tier_label: Label = %TierLabel
@onready var lost_flash: ColorRect = %LostFlash

var announcement_timer: float = 0.0
var lost_flash_timer: float = 0.0

func show_streak_update(count: int, decay_ratio: float) -> void:
    visible = count > 0
    counter_label.text = str(count)
    # Draw decay ring in _draw()
    queue_redraw()

func show_tier_announcement(tier_name: String, tier_color: Color) -> void:
    tier_label.text = tier_name
    tier_label.add_theme_color_override("font_color", tier_color)
    tier_label.visible = true
    announcement_timer = 2.0

func show_streak_lost(count: int) -> void:
    lost_flash.visible = true
    lost_flash.color = Color(1.0, 0.2, 0.2, 0.5)
    lost_flash_timer = 0.5

func _process(delta: float) -> void:
    if announcement_timer > 0.0:
        announcement_timer -= delta
        if announcement_timer <= 0.0:
            tier_label.visible = false

    if lost_flash_timer > 0.0:
        lost_flash_timer -= delta
        lost_flash.color.a = lost_flash_timer / 0.5 * 0.5
        if lost_flash_timer <= 0.0:
            lost_flash.visible = false
```

### 6.8 Icon Sidebar (icon-sidebar.js)

**Source:** `SIDEBAR_ICONS` -- 70px wide vertical bar with 5 icon buttons: Character (C), Inventory (E), Skills (K), Map (M), Shift (Tab). Each draws a custom glyph with active/hover states.

**Scene tree:**
```
IconSidebar (VBoxContainer, anchored left, fixed 70px width)
  |-- CharacterBtn (TextureButton, hotkey 'C')
  |-- InventoryBtn (TextureButton, hotkey 'E')
  |-- SkillsBtn (TextureButton, hotkey 'K')
  |-- MapBtn (TextureButton, hotkey 'M')
  |-- Separator
  |-- ShiftBtn (TextureButton, hotkey 'Tab')
  |-- Spacer (Control, expand)
  |-- GoldLabel (Label, "$0")
  |-- FloorLabel (Label, "F1")
```

```gdscript
# res://scenes/ui/hud/icon_sidebar.gd
extends VBoxContainer

signal overlay_toggled(overlay_name: String)

var active_overlay: String = ""

@onready var buttons := {
    "character": %CharacterBtn,
    "inventory": %InventoryBtn,
    "skills": %SkillsBtn,
    "map": %MapBtn,
    "shift": %ShiftBtn,
}

func _ready() -> void:
    for key in buttons:
        buttons[key].pressed.connect(_on_button_pressed.bind(key))

func _on_button_pressed(overlay_name: String) -> void:
    if active_overlay == overlay_name:
        active_overlay = ""
    else:
        active_overlay = overlay_name
    overlay_toggled.emit(active_overlay)
    _update_button_states()

func _update_button_states() -> void:
    for key in buttons:
        var btn: TextureButton = buttons[key]
        btn.modulate = UIConstants.GOLD if key == active_overlay else Color.WHITE

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("character_sheet"):
        _on_button_pressed("character")
    elif event.is_action_pressed("inventory"):
        _on_button_pressed("inventory")
    elif event.is_action_pressed("skills_menu"):
        _on_button_pressed("skills")
    elif event.is_action_pressed("map_overlay"):
        _on_button_pressed("map")
```

### 6.9 Inventory Panel (renderer.js::drawInventoryOverlay)

**Source:** `drawInventoryOverlay()` in `renderer.js` -- tabbed panel (WEAPONS, ARMOR, CONSUME, ITEMS, EQUIPPED) with scrollable item list, item detail sidebar, and action buttons.

**Scene tree:**
```
InventoryPanel (PanelContainer, centered, 1000x700 max)
  |-- VBox
  |     |-- TabBar (5 tabs: WEAPONS, ARMOR, CONSUME, ITEMS, EQUIPPED)
  |     |-- HSplitContainer
  |           |-- ScrollContainer (item list)
  |           |     |-- VBoxContainer
  |           |           |-- InventorySlot x N (instanced)
  |           |-- ItemDetail (PanelContainer)
  |                 |-- VBox
  |                       |-- ItemName (Label)
  |                       |-- ItemIcon (TextureRect)
  |                       |-- StatsLabel (RichTextLabel)
  |                       |-- ActionButtons (HBoxContainer)
  |                             |-- UseBtn / EquipBtn / DropBtn
  |-- CloseButton (Button, top-right)
```

```gdscript
# res://scenes/ui/inventory/inventory_panel.gd
extends PanelContainer

const SLOT_SCENE := preload("res://scenes/ui/inventory/inventory_slot.tscn")

@onready var tab_bar: TabBar = %TabBar
@onready var item_list: VBoxContainer = %ItemList
@onready var item_detail: PanelContainer = %ItemDetail

var current_tab: int = 0
var selected_index: int = 0

const TAB_FILTERS := ["weapon", "armor", "consumable", "material", "equipped"]

func _ready() -> void:
    tab_bar.tab_changed.connect(_on_tab_changed)
    _refresh_list()

func _on_tab_changed(tab: int) -> void:
    current_tab = tab
    selected_index = 0
    _refresh_list()

func _refresh_list() -> void:
    # Clear existing slots
    for child in item_list.get_children():
        child.queue_free()

    var items: Array = _get_filtered_items()
    for i in range(items.size()):
        var slot := SLOT_SCENE.instantiate()
        slot.set_item(items[i])
        slot.pressed.connect(_on_slot_selected.bind(i))
        item_list.add_child(slot)

func _get_filtered_items() -> Array:
    var player = GameManager.player
    if not player:
        return []
    var filter: String = TAB_FILTERS[current_tab]
    if filter == "equipped":
        return player.get_equipped_items()
    return player.inventory.filter(func(item): return item.type == filter)
```

### 6.10 Shop Panel (shop-ui.js)

**Source:** `ShopUI` -- buy/sell tabs, NPC-specific inventories (blacksmith/alchemist/innkeeper), item validation, gold display.

**Scene tree:**
```
ShopPanel (PanelContainer, centered, 800x550)
  |-- VBox
  |     |-- Header (HBox: NPC name + gold display)
  |     |-- TabBar (BUY / SELL)
  |     |-- HSplit
  |     |     |-- ItemList (ScrollContainer + VBox of ShopSlots)
  |     |     |-- ItemDetail (stats + buy/sell button + price)
  |     |-- MessageBar (Label, feedback messages)
  |-- CloseButton
```

```gdscript
# res://scenes/ui/shop/shop_panel.gd
extends PanelContainer

signal item_purchased(item: Dictionary)
signal item_sold(item: Dictionary)

var current_npc: Node = null
var current_tab: int = 0  # 0=buy, 1=sell
var shop_inventory: Array = []

func open(npc: Node) -> void:
    current_npc = npc
    current_tab = 0
    visible = true

    # Get NPC's shop inventory from data
    var inventory_key: String = npc.get_meta("inventory", "blacksmith_stock")
    shop_inventory = ItemDatabase.get_shop_inventory(inventory_key)
    _refresh_list()

    GameManager.change_state(Constants.GameState.SHOP)

func close() -> void:
    visible = false
    current_npc = null
    GameManager.change_state(Constants.GameState.VILLAGE)
```

### 6.11 Bank Panel (bank-ui.js)

**Source:** `BankUI` -- dual-pane (BANK / INVENTORY tabs), deposit/withdraw with scroll, 12 items per page.

**Scene tree:** Same pattern as Shop but with two item lists side-by-side. Drag-and-drop between panes is a natural Godot improvement.

### 6.12 Dialogue Box (dialogue-ui.js)

**Source:** `DialogueUI` -- typewriter text animation (30ms/char), NPC portrait, branching options list, fallback handling for missing dialogue nodes.

**Scene tree:**
```
DialogueBox (PanelContainer, anchored bottom, 600x200)
  |-- HBox
  |     |-- Portrait (TextureRect, 80x80)
  |     |-- VBox
  |           |-- NameLabel (Label)
  |           |-- TextLabel (RichTextLabel, bbcode for typewriter)
  |           |-- OptionsContainer (VBoxContainer)
  |                 |-- OptionButton x N
```

```gdscript
# res://scenes/ui/dialogue/dialogue_box.gd
extends PanelContainer

@export var text_speed: float = 0.03  # Seconds per character (JS: 30ms)

@onready var name_label: Label = %NameLabel
@onready var text_label: RichTextLabel = %TextLabel
@onready var options_container: VBoxContainer = %OptionsContainer
@onready var portrait: TextureRect = %Portrait

var current_npc: Node = null
var current_node: Dictionary = {}
var is_animating: bool = false
var full_text: String = ""

func open(npc: Node) -> void:
    if not npc:
        push_error("[DialogueBox] NPC is null")
        return
    current_npc = npc
    visible = true
    name_label.text = npc.display_name
    GameManager.change_state(Constants.GameState.DIALOGUE)

    var node_id: String = npc.get_meta("current_dialogue", npc.get_meta("initial_dialogue", ""))
    if node_id.is_empty():
        _show_fallback("...")
        return
    show_node(node_id)

func show_node(node_id: String) -> void:
    var dialogue_data = DialogueDatabase.get_node(current_npc.npc_id, node_id)
    if not dialogue_data:
        _show_fallback("...")
        return

    current_node = dialogue_data
    full_text = dialogue_data.get("text", "")

    # Typewriter effect
    text_label.text = ""
    is_animating = true
    _animate_text()

    # Build options
    _build_options(dialogue_data.get("options", []))

func _animate_text() -> void:
    text_label.visible_characters = 0
    text_label.text = full_text

    var tween := create_tween()
    tween.tween_property(
        text_label, "visible_characters",
        full_text.length(),
        full_text.length() * text_speed
    )
    tween.tween_callback(func(): is_animating = false)

func _build_options(options: Array) -> void:
    for child in options_container.get_children():
        child.queue_free()
    for i in range(options.size()):
        var btn := Button.new()
        btn.text = options[i].get("text", "...")
        btn.pressed.connect(_on_option_selected.bind(i))
        options_container.add_child(btn)

func _on_option_selected(index: int) -> void:
    var options: Array = current_node.get("options", [])
    if index >= options.size():
        return
    var next_id: String = options[index].get("next", "")
    if next_id == "close" or next_id.is_empty():
        close()
    else:
        show_node(next_id)
```

### 6.13 Character Sheet (character-overlay.js)

**Source:** `character-overlay.js` -- stats display with safe value formatting. Shows: level, XP, all stats (STR/DEX/INT/VIT), equipment summary, resistances, proficiencies.

**Scene tree:**
```
CharacterSheet (PanelContainer, centered overlay)
  |-- ScrollContainer
  |     |-- VBox
  |           |-- HeaderSection (Name, Level, XP bar)
  |           |-- StatsGrid (GridContainer, 2 cols)
  |           |     |-- "STR" Label | ValueLabel
  |           |     |-- "DEX" Label | ValueLabel
  |           |     |-- "INT" Label | ValueLabel
  |           |     |-- "VIT" Label | ValueLabel
  |           |-- Separator
  |           |-- CombatStats (GridContainer)
  |           |     |-- "Attack" | ValueLabel
  |           |     |-- "Defense" | ValueLabel
  |           |     |-- "Crit %" | ValueLabel
  |           |-- EquipmentSection (VBox of equipped items)
  |           |-- ResistancesSection (GridContainer)
```

### 6.14 Skills Panel (skills-ui.js)

**Source:** `SKILLS_UI_CONFIG` -- triangle radar chart for melee/ranged/magic proficiencies, vertex selection for details.

**Scene tree:**
```
SkillsPanel (PanelContainer, centered overlay)
  |-- HBox
  |     |-- RadarChart (Control, custom _draw)
  |     |-- DetailPanel (VBox)
  |           |-- ProficiencyName (Label)
  |           |-- ProficiencyLevel (ProgressBar)
  |           |-- AbilityList (VBox of ability entries)
```

The radar chart uses `_draw()` with `draw_polygon()` for the filled area and `draw_line()` for axes/rings.

### 6.15 Map Overlay (map-overlay.js)

**Source:** `mapOverlayState` -- full 200x200 dungeon view with zoom (1x-8x), pan, fog of war, entity markers. Mouse drag for panning, scroll for zoom.

**Scene tree:**
```
MapOverlay (ColorRect background 95% opacity)
  |-- Header ("CARTOGRAPHIA", floor info)
  |-- MapViewport (SubViewportContainer)
  |     |-- SubViewport
  |           |-- MapCamera (Camera2D, zoom controlled by UI)
  |           |-- TileMapLayer reference or simplified copy
  |-- ZoomControls (HBox: +/- buttons, zoom label)
  |-- Legend (VBox: color key for entities)
```

### 6.16 Shrine Selection (shrine-ui.js)

**Source:** `ShrineUI` -- 3 boon cards presented as choices, replacement mode when at max boons. Card entrance animation.

**Scene tree:**
```
ShrineSelection (CenterContainer, overlay)
  |-- VBox
  |     |-- TitleLabel ("Choose a Blessing")
  |     |-- CardContainer (HBoxContainer)
  |     |     |-- BoonCard x 3 (PanelContainer)
  |     |           |-- VBox
  |     |                 |-- AncestorLabel (Label, colored)
  |     |                 |-- BoonName (Label)
  |     |                 |-- Description (RichTextLabel)
  |     |                 |-- SelectBtn (Button)
  |     |-- ReplacementPanel (VBox, visible only in replacement mode)
```

### 6.17 Crafting Panel (crafting-ui.js)

**Source:** `CraftingUI` -- category sidebar (weapons/armor/consumables), recipe list, material requirements, craft button with animation.

**Scene tree:**
```
CraftingPanel (PanelContainer, centered, 700x500)
  |-- HSplit
  |     |-- LeftPanel (VBox)
  |     |     |-- CategoryList (ItemList: Weapons, Armor, Consumables)
  |     |     |-- RecipeList (ScrollContainer + VBox)
  |     |-- RightPanel (VBox)
  |           |-- RecipeName (Label)
  |           |-- ResultPreview (TextureRect)
  |           |-- MaterialsList (VBox of "Material x Count" labels)
  |           |-- CraftButton (Button)
  |           |-- CraftAnimation (TextureRect, plays on craft)
```

### 6.18 Chest Panel (chest-ui.js)

**Source:** `ChestUI` -- item list (max 6 visible), take individual / take all buttons.

**Scene tree:**
```
ChestPanel (PanelContainer, centered, 400x350)
  |-- VBox
  |     |-- TitleLabel ("Chest Contents")
  |     |-- ItemList (ScrollContainer + VBox of item rows)
  |     |-- ButtonBar (HBox)
  |           |-- TakeAllBtn (Button)
  |           |-- CloseBtn (Button)
```

### 6.19 Loadout Panel (loadout-ui.js)

**Source:** `LoadoutUI` -- 3-panel grid layout (bank items left, equipment center, inventory right), spell selection (dash/heal/shield), equipment slots (HEAD/MAIN/CHEST/OFF/LEGS/FEET).

**Scene tree:**
```
LoadoutPanel (PanelContainer, centered, 1100x700)
  |-- HBox
  |     |-- BankGrid (GridContainer, 4 cols, scrollable)
  |     |-- EquipmentPanel (VBox)
  |     |     |-- EquipSlots (GridContainer, 2x3)
  |     |     |     |-- HeadSlot, MainSlot, ChestSlot, OffSlot, LegsSlot, FeetSlot
  |     |     |-- SpellSelect (HBox of 3 radio buttons)
  |     |     |-- ReadyButton (Button, "ENTER THE CHASM")
  |     |-- InventoryGrid (GridContainer, 4 cols, scrollable)
```

### 6.20 Bulletin Board (bulletin-ui.js)

**Source:** `BulletinUI` -- 3 tabs (BOUNTIES, RUMORS, NOTICES), accept bounty button, 6 items per page.

**Scene tree:**
```
BulletinPanel (PanelContainer, centered, 850x580)
  |-- VBox
  |     |-- TabBar (BOUNTIES / RUMORS / NOTICES)
  |     |-- ItemList (ScrollContainer + VBox)
  |     |-- DetailPanel (RichTextLabel)
  |     |-- AcceptBtn (Button, bounties tab only)
```

### 6.21 Quest Panel & Journal (quest-ui.js, journal-ui.js)

**Source:** `QuestUI` -- list/detail/NPC modes. Journal is a separate full overlay.

**Scene tree (Quest):**
```
QuestPanel (PanelContainer, 700x500)
  |-- VBox
  |     |-- ModeHeader (Label: "Quest Log" or NPC name)
  |     |-- QuestList (ScrollContainer + VBox)
  |     |-- QuestDetail (RichTextLabel, objectives + rewards)
```

### 6.22 Item Tooltip (tooltip-manager.js)

**Source:** Tooltip positioning logic, item stat formatting.

**Scene tree:**
```
ItemTooltip (PopupPanel)
  |-- VBox
  |     |-- ItemName (Label, colored by rarity)
  |     |-- ItemType (Label, muted)
  |     |-- Separator
  |     |-- StatsContainer (VBox of stat lines)
  |     |-- Separator
  |     |-- Description (RichTextLabel)
  |     |-- PriceLabel (Label, gold icon + value)
```

```gdscript
# res://scenes/ui/components/item_tooltip.gd
extends PopupPanel

@onready var name_label: Label = %ItemName
@onready var type_label: Label = %ItemType
@onready var stats_container: VBoxContainer = %StatsContainer
@onready var description_label: RichTextLabel = %Description

func show_item(item: Dictionary, screen_pos: Vector2) -> void:
    name_label.text = item.get("name", "Unknown")
    var rarity: String = item.get("rarity", "common")
    name_label.add_theme_color_override("font_color", UIConstants.RARITY[rarity])

    type_label.text = item.get("type", "").capitalize()

    # Build stats
    for child in stats_container.get_children():
        child.queue_free()

    var stats: Dictionary = item.get("stats", {})
    for stat_name in stats:
        var label := Label.new()
        label.text = "%s: %s" % [stat_name.capitalize(), str(stats[stat_name])]
        stats_container.add_child(label)

    description_label.text = item.get("description", "")

    # Position near mouse, clamped to viewport
    position = _clamp_to_viewport(screen_pos)
    popup()
```

---

## Part 7: Effect System Migration

### 7.1 Melee Slash Effect (melee-slash-effect.js)

**Source:** State machine: WINDUP (telegraph circle) -> SLASH (arc sweep) -> FADE. Arc geometry uses `startAngle`/`endAngle`, inner/outer edges.

**Godot approach:**
```
MeleeSlashEffect (Node2D)
  |-- WindupCircle (Control, custom _draw expanding circle)
  |-- SlashArc (AnimatedSprite2D, pre-rendered slash frames)
  |-- Particles (GPUParticles2D, sparks along blade)
  |-- AnimationPlayer
```

AnimationPlayer timeline:
```
0.0s - 0.15s: WINDUP (WindupCircle scales 0->1, alpha 0->0.5)
0.15s - 0.35s: SLASH (SlashArc plays, Particles emit)
0.35s - 0.5s: FADE (SlashArc alpha 1->0, Particles stop)
0.5s: queue_free()
```

### 7.2 Monster Attack Effects (monster-attack-effects.js)

**Source:** `MonsterMagicEffect` -- element-colored burst at target, `MonsterRangedEffect` -- projectile trail. Element color map: fire(orange), ice(blue), earth(brown), nature(green), death(purple), etc.

**Godot approach:** Each element gets a tinted particle material and animated sprite variant. Pool attack effect scenes for performance.

### 7.3 Ability Effects Data (ability-effects-data.js)

**Source:** `ABILITY_EFFECTS` -- configuration for each enemy ability: telegraph type/shape/color, impact visual, particle settings, camera shake, audio cues.

**Godot:** Store as Resource files or a const dictionary in an autoload:

```gdscript
# res://scripts/data/ability_effects_data.gd
class_name AbilityEffectsData
extends RefCounted

const EFFECTS := {
    "melee_swing": {
        "telegraph": {
            "type": "arc_fill",
            "arc_angle": PI / 2.0,
            "radius": 1.5,
            "color": Color("#FF6464"),
        },
        "impact": { "type": "slash_arc", "duration": 0.15, "color": Color.WHITE },
        "particles": { "spawn_mode": "arc_edge", "color": Color("#FFCCCC"), "count": 4 },
        "camera": { "type": "screen_nudge", "intensity": 2.0 },
    },
    "claw_swipe": {
        "telegraph": {
            "type": "arc_fill",
            "arc_angle": PI * 2.0 / 3.0,
            "radius": 1.5,
            "color": Color("#FF4444"),
            "multi_line": 3,
        },
        "impact": { "type": "slash_arc", "duration": 0.15, "color": Color("#FF6666") },
        "particles": { "spawn_mode": "arc_edge", "color": Color("#FF8888"), "count": 6 },
    },
    # ... all other abilities
}
```

---

## Part 8: Signal Connections Summary

### UI signals connected to game events:

| EventBus Signal | UI Consumer | Action |
|----------------|-------------|--------|
| `player_took_damage` | HUD health bar | Flash + update value |
| `player_spell_heal` | HUD health bar | Green flash + update |
| `player_killed_enemy` | KillStreak | Increment counter |
| `enemy_death` | CombatLog | Add death message |
| `player_hit_enemy` | CombatLog | Add damage message |
| `floor_advanced` | HUD floor label | Update floor number |
| `player_boon_selected` | ShrineUI | Close panel |
| `game_state_changed` | All UI panels | Show/hide based on state |
| `hazard_created` | ParticleLibrary | Spawn hazard particles |
| `stamina_exhausted` | HUD stamina bar | Flash warning |

### UI signals emitted:

| UI Panel | Signal | Consumer |
|----------|--------|----------|
| IconSidebar | `overlay_toggled` | HUD (show/hide overlays) |
| ShopPanel | `item_purchased` | Player inventory |
| ShopPanel | `item_sold` | Player inventory + gold |
| DialogueBox | `dialogue_ended` | GameManager (resume play) |
| ShrineSelection | `boon_selected` | BoonSystem |
| LoadoutPanel | `run_started` | GameManager (begin dungeon) |
| CraftingPanel | `item_crafted` | Player inventory |
| ActionBar | `ability_activated` | CombatSystem |

---

## Part 9: Input Mapping for UI

The JS version uses direct keyboard checks. Godot uses InputMap actions:

| JS Key | Godot Action | UI Function |
|--------|-------------|-------------|
| `C` | `character_sheet` | Toggle character overlay |
| `E` | `inventory` | Toggle inventory panel |
| `K` | `skills_menu` | Toggle skills panel |
| `M` | `map_overlay` | Toggle map overlay |
| `J` | `journal` | Toggle quest journal |
| `Tab` | `shift_overlay` | Toggle shift display |
| `Escape` | `ui_cancel` | Close topmost panel / pause |
| `1-4` | `hotbar_1` - `hotbar_4` | Use consumable |
| `5` | `hotbar_5` | Weapon skill |
| `Space` | `dash` | Dash ability |
| `Enter` | `ui_accept` | Confirm selection |
| `Arrow keys` | `ui_up/down/left/right` | Navigate UI lists |

**Panel stack management:**
```gdscript
# res://scenes/ui/ui_manager.gd (child of HUD CanvasLayer)
extends Control

var panel_stack: Array[Control] = []

func open_panel(panel: Control) -> void:
    if panel in panel_stack:
        return
    panel.visible = true
    panel_stack.push_back(panel)
    _pause_game_if_needed()

func close_top_panel() -> void:
    if panel_stack.is_empty():
        return
    var panel: Control = panel_stack.pop_back()
    panel.visible = false
    _resume_game_if_needed()

func _unhandled_input(event: InputEvent) -> void:
    if event.is_action_pressed("ui_cancel"):
        if not panel_stack.is_empty():
            close_top_panel()
            get_viewport().set_input_as_handled()
        else:
            # Open pause menu
            open_panel(%PauseMenu)
```

---

## Verification Checklist

### Rendering
- [ ] TileSet atlas exported from JS tile definitions (dungeon + village)
- [ ] TileMapLayer renders dungeon correctly at all tile types
- [ ] Fog of war hides unexplored, dims explored-but-not-visible
- [ ] Camera2D follows player with smoothing, respects map bounds
- [ ] Camera zoom shows correct number of viewport tiles (20x15)
- [ ] Camera handles window resize without breaking zoom

### Sprites
- [ ] All monster sprites exported to PNG spritesheets
- [ ] SpriteFrames resources created with idle/walk/attack/death animations
- [ ] Player sprite renders with 4-directional walk cycle
- [ ] Equipment overlays (weapon/armor/shield) layer correctly on player
- [ ] Bodypart renderer composites humanoid monsters with correct z-order
- [ ] FlipH works for right-facing direction (mirrors left frames)
- [ ] Monster animation state machine: idle -> walk -> attack -> idle transitions

### Particles
- [ ] Fire trail particles follow moving entities
- [ ] Blood splatter spawns at damage impact point
- [ ] Magic sparks appear for spell cast effects
- [ ] Death poof plays when enemy dies
- [ ] Ashfall particle system activates in world state 2
- [ ] Particle budget respected (no runaway particle counts)

### UI Theme
- [ ] All UI_COLORS values ported to UIConstants
- [ ] Godot Theme resource applies consistently to all panels
- [ ] Fonts loaded (Roboto Slab + Cinzel) with correct sizes
- [ ] Panel backgrounds use warm charcoal palette, not default Godot gray
- [ ] Rarity colors display correctly on item names
- [ ] Gold frame colors used on unit frames and panel borders

### HUD
- [ ] Player unit frame shows HP/MP/Stamina bars with gradient fills
- [ ] Enemy unit frame appears when target selected, hides when no target
- [ ] Status effect icons display in grid (max 8 icons)
- [ ] Action bar shows 6 slots with correct hotkey labels
- [ ] Cooldown sweep overlay animates correctly
- [ ] Mini-map shows explored terrain, enemy dots pulse
- [ ] Mini-map scan line rotates
- [ ] Combat log shows colored messages with auto-fade
- [ ] Kill streak counter + tier announcements display
- [ ] Icon sidebar toggles overlay panels

### Panels
- [ ] Inventory panel: tabs filter correctly, item selection highlights, detail shows
- [ ] Shop panel: buy/sell tabs work, prices display, gold deducted
- [ ] Bank panel: deposit/withdraw between bank and inventory
- [ ] Dialogue box: typewriter text animation, options selectable, NPC portrait shows
- [ ] Crafting panel: recipes list by category, materials shown, craft button works
- [ ] Character sheet: all stats display with correct formatting
- [ ] Skills panel: radar chart draws 3-axis proficiency
- [ ] Map overlay: zoom (1x-8x), pan, entity markers, fog of war
- [ ] Shrine selection: 3 boon cards display, selection works
- [ ] Chest panel: item list, take/take-all functionality
- [ ] Loadout panel: 3-column layout, equipment drag, spell select, ready button
- [ ] Bulletin board: 3 tabs, bounty accept
- [ ] Quest panel: list and detail modes
- [ ] Item tooltip: rarity-colored name, stats, description, positioned near cursor

### Input
- [ ] All hotkeys (C, E, K, M, J, Tab, 1-5, Space) mapped in InputMap
- [ ] Escape closes topmost panel, then opens pause
- [ ] Arrow keys navigate all list-based UIs
- [ ] Enter confirms selection in all panels
- [ ] Panel stack prevents multiple panels from conflicting

### Effects
- [ ] Melee slash: windup telegraph -> arc sweep -> fade
- [ ] Monster magic: element-colored burst at impact
- [ ] Projectile trail from monster to target
- [ ] Camera nudge on heavy hits
- [ ] Village atmosphere particles (ashfall, fireflies) match world state

### Performance
- [ ] No visible frame drops with full HUD + particles + 20 enemies
- [ ] Mini-map terrain caching prevents per-frame redraw
- [ ] UI panels use `visible = false` (not queue_free) for frequent toggles
- [ ] Particle one_shot effects auto-cleanup via `finished` signal
- [ ] Sprite caches populated at scene load, not per-frame
