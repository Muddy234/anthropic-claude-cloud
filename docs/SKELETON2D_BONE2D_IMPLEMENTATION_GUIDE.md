# Skeleton2D / Bone2D Implementation Guide

## Overview

This guide covers porting the JavaScript BodypartRenderer system to Godot 4.x using two approaches: **Layered Sprite2D** (recommended, direct port) and **Skeleton2D/Bone2D** (advanced, for future rigging). The JS system composites 6 body parts (head, body, leftArm, rightArm, leftLeg, rightLeg) with per-frame pixel offsets and direction-dependent z-ordering.

---

## 1. Source System Analysis (JavaScript)

### 1.1 Architecture

The JS rendering pipeline consists of three components:

| Component | File | Role |
|-----------|------|------|
| `BodypartRenderer` | `js/rendering/bodypart-renderer.js` | State machine + draw loop |
| `BODYPART_WALK_ANIMATION` | `js/rendering/bodypart-walk-animation.js` | Per-frame offset data |
| `BodypartSpriteRegistry` | `js/rendering/bodypart-sprite-registry.js` | Sprite set lookup |

### 1.2 Body Parts

Every creature is composed of exactly 6 named parts:

```
head, body, leftArm, rightArm, leftLeg, rightLeg
```

Each part is a pixel grid with a palette. Parts are drawn back-to-front using a direction-dependent layer order.

### 1.3 State Machine

```
States: idle, walking, dying
Transitions:
  idle → walking, dying
  walking → idle, dying
  dying → (terminal)
```

State changes reset `frameIndex` and `elapsed` to 0. The `dying` state is terminal — no transitions out.

### 1.4 Animation System

Animations are **offset-only** — no rotation, no scaling. Each frame specifies a `[dx, dy]` pixel shift per body part relative to the neutral pose.

**Walk cycle**: 6 frames at 8 FPS (750ms loop)

```
Frame 0: Right foot contact  — legs split, arms counter-swing
Frame 1: Weight settling      — body dips dy:+1
Frame 2: Legs passing          — head anticipates dy:-1
Frame 3: Left foot contact   — mirror of frame 0
Frame 4: Weight settling      — body dips dy:+1
Frame 5: Legs passing          — head anticipates dy:-1
```

Speed modulation clamps between `minSpeedMult` and `maxSpeedMult`, scaling the base FPS.

### 1.5 Direction Handling

Only 3 directions are authored: `down`, `up`, `left`. The `right` direction is derived at runtime:

1. Use `left` sprite data with `flipX = true`
2. Swap part names: `leftArm ↔ rightArm`, `leftLeg ↔ rightLeg`
3. Negate all `dx` values, keep `dy` unchanged

### 1.6 Z-Order Per Direction

Layer order changes based on facing direction to ensure correct overlap:

```
down:  [leftLeg, rightLeg, body, leftArm, rightArm, head]  (legs behind body)
up:    [head, leftArm, rightArm, body, leftLeg, rightLeg]  (head behind body)
left:  [rightArm, rightLeg, body, head, leftLeg, leftArm]  (far side behind)
right: [leftArm, leftLeg, body, head, rightLeg, rightArm]  (far side behind)
```

---

## 2. Approach A: Layered Sprite2D (Recommended)

This is the most direct port. Each body part is a `Sprite2D` child node, animated via `AnimationPlayer` position keyframes.

### 2.1 Scene Tree

```
EnemySprite (Node2D)
├── BodyLayer (Node2D)       ← z-sort container
│   ├── LeftLeg (Sprite2D)
│   ├── RightLeg (Sprite2D)
│   ├── Body (Sprite2D)
│   ├── LeftArm (Sprite2D)
│   ├── RightArm (Sprite2D)
│   └── Head (Sprite2D)
└── AnimationPlayer
```

### 2.2 GDScript Implementation

```gdscript
class_name BodypartSprite
extends Node2D

## Maps part names to their Sprite2D nodes
@onready var parts: Dictionary = {
    "head": $BodyLayer/Head,
    "body": $BodyLayer/Body,
    "leftArm": $BodyLayer/LeftArm,
    "rightArm": $BodyLayer/RightArm,
    "leftLeg": $BodyLayer/LeftLeg,
    "rightLeg": $BodyLayer/RightLeg,
}

## Z-order per direction (back-to-front, lowest z_index first)
const LAYER_ORDER: Dictionary = {
    "down":  ["leftLeg", "rightLeg", "body", "leftArm", "rightArm", "head"],
    "up":    ["head", "leftArm", "rightArm", "body", "leftLeg", "rightLeg"],
    "left":  ["rightArm", "rightLeg", "body", "head", "leftLeg", "leftArm"],
    "right": ["leftArm", "leftLeg", "body", "head", "rightLeg", "rightArm"],
}

## Mirror swaps for right-direction derivation
const MIRROR_SWAPS: Dictionary = {
    "leftArm": "rightArm",
    "rightArm": "leftArm",
    "leftLeg": "rightLeg",
    "rightLeg": "leftLeg",
}

var current_state: String = "idle"
var current_direction: String = "down"
var frame_index: int = 0
var elapsed: float = 0.0
var move_speed: float = 1.0

const WALK_FPS: float = 8.0
const WALK_FRAME_COUNT: int = 6
const MIN_SPEED_MULT: float = 0.25
const MAX_SPEED_MULT: float = 2.0


func set_direction(dir: String) -> void:
    if current_direction == dir:
        return
    current_direction = dir
    _update_z_order()
    _update_flip()


func set_state(new_state: String) -> void:
    if current_state == new_state:
        return
    if current_state == "dying":
        return
    current_state = new_state
    frame_index = 0
    elapsed = 0.0


func _update_z_order() -> void:
    var order: Array = LAYER_ORDER.get(current_direction, LAYER_ORDER["down"])
    for i in range(order.size()):
        var part_name: String = order[i]
        if parts.has(part_name):
            parts[part_name].z_index = i


func _update_flip() -> void:
    var is_right: bool = (current_direction == "right")
    for part_name in parts:
        parts[part_name].flip_h = is_right


func _process(delta: float) -> void:
    if current_state != "walking":
        _apply_offsets(_get_idle_offsets())
        return

    var speed_mult: float = clampf(move_speed, MIN_SPEED_MULT, MAX_SPEED_MULT)
    var effective_fps: float = WALK_FPS * speed_mult
    var frame_duration: float = 1.0 / effective_fps

    elapsed += delta
    if elapsed >= frame_duration:
        elapsed -= frame_duration
        frame_index = (frame_index + 1) % WALK_FRAME_COUNT

    _apply_offsets(_get_walk_offsets())


func _get_idle_offsets() -> Dictionary:
    # Idle: all offsets are zero
    var offsets: Dictionary = {}
    for part_name in parts:
        offsets[part_name] = Vector2.ZERO
    return offsets


func _get_walk_offsets() -> Dictionary:
    # Walk offset data — matches BODYPART_WALK_ANIMATION from JS
    # Returns the offset for current direction and frame_index
    var base_dir: String = current_direction
    var is_right: bool = false

    if current_direction == "right":
        base_dir = "left"
        is_right = true

    var frame_data: Dictionary = _walk_data(base_dir, frame_index)

    if is_right:
        return _derive_right_offsets(frame_data)
    return frame_data


func _derive_right_offsets(left_frame: Dictionary) -> Dictionary:
    var result: Dictionary = {}
    for part_name in left_frame:
        var target_part: String = MIRROR_SWAPS.get(part_name, part_name)
        var offset: Vector2 = left_frame[part_name]
        result[target_part] = Vector2(-offset.x, offset.y)
    return result


func _apply_offsets(offsets: Dictionary) -> void:
    for part_name in offsets:
        if parts.has(part_name):
            parts[part_name].position = offsets[part_name]


## Walk animation data — direct port of BODYPART_WALK_ANIMATION
## Returns Dictionary of part_name -> Vector2 offset for a given direction and frame
func _walk_data(dir: String, frame: int) -> Dictionary:
    match dir:
        "down":
            match frame:
                0: return {"body": Vector2(0,0), "head": Vector2(0,0), "leftArm": Vector2(0,1), "rightArm": Vector2(0,-1), "leftLeg": Vector2(0,1), "rightLeg": Vector2(0,-1)}
                1: return {"body": Vector2(0,1), "head": Vector2(0,1), "leftArm": Vector2(0,1), "rightArm": Vector2(0,-1), "leftLeg": Vector2(0,1), "rightLeg": Vector2(0,0)}
                2: return {"body": Vector2(0,0), "head": Vector2(0,-1), "leftArm": Vector2(0,0), "rightArm": Vector2(0,0), "leftLeg": Vector2(0,0), "rightLeg": Vector2(0,0)}
                3: return {"body": Vector2(0,0), "head": Vector2(0,0), "leftArm": Vector2(0,-1), "rightArm": Vector2(0,1), "leftLeg": Vector2(0,-1), "rightLeg": Vector2(0,1)}
                4: return {"body": Vector2(0,1), "head": Vector2(0,1), "leftArm": Vector2(0,-1), "rightArm": Vector2(0,1), "leftLeg": Vector2(0,0), "rightLeg": Vector2(0,1)}
                5: return {"body": Vector2(0,0), "head": Vector2(0,-1), "leftArm": Vector2(0,0), "rightArm": Vector2(0,0), "leftLeg": Vector2(0,0), "rightLeg": Vector2(0,0)}
        "up":
            match frame:
                0: return {"body": Vector2(0,0), "head": Vector2(0,0), "leftArm": Vector2(0,-1), "rightArm": Vector2(0,1), "leftLeg": Vector2(0,1), "rightLeg": Vector2(0,-1)}
                1: return {"body": Vector2(0,1), "head": Vector2(0,1), "leftArm": Vector2(0,-1), "rightArm": Vector2(0,1), "leftLeg": Vector2(0,1), "rightLeg": Vector2(0,0)}
                2: return {"body": Vector2(0,0), "head": Vector2(0,-1), "leftArm": Vector2(0,0), "rightArm": Vector2(0,0), "leftLeg": Vector2(0,0), "rightLeg": Vector2(0,0)}
                3: return {"body": Vector2(0,0), "head": Vector2(0,0), "leftArm": Vector2(0,1), "rightArm": Vector2(0,-1), "leftLeg": Vector2(0,-1), "rightLeg": Vector2(0,1)}
                4: return {"body": Vector2(0,1), "head": Vector2(0,1), "leftArm": Vector2(0,1), "rightArm": Vector2(0,-1), "leftLeg": Vector2(0,0), "rightLeg": Vector2(0,1)}
                5: return {"body": Vector2(0,0), "head": Vector2(0,-1), "leftArm": Vector2(0,0), "rightArm": Vector2(0,0), "leftLeg": Vector2(0,0), "rightLeg": Vector2(0,0)}
        "left":
            match frame:
                0: return {"body": Vector2(0,0), "head": Vector2(0,0), "leftArm": Vector2(1,0), "rightArm": Vector2(-1,0), "leftLeg": Vector2(1,-1), "rightLeg": Vector2(-1,0)}
                1: return {"body": Vector2(0,1), "head": Vector2(0,1), "leftArm": Vector2(1,0), "rightArm": Vector2(-1,0), "leftLeg": Vector2(1,0), "rightLeg": Vector2(-1,0)}
                2: return {"body": Vector2(0,0), "head": Vector2(0,-1), "leftArm": Vector2(0,0), "rightArm": Vector2(0,0), "leftLeg": Vector2(0,0), "rightLeg": Vector2(0,0)}
                3: return {"body": Vector2(0,0), "head": Vector2(0,0), "leftArm": Vector2(-1,0), "rightArm": Vector2(1,0), "leftLeg": Vector2(-1,0), "rightLeg": Vector2(1,-1)}
                4: return {"body": Vector2(0,1), "head": Vector2(0,1), "leftArm": Vector2(-1,0), "rightArm": Vector2(1,0), "leftLeg": Vector2(-1,0), "rightLeg": Vector2(1,0)}
                5: return {"body": Vector2(0,0), "head": Vector2(0,-1), "leftArm": Vector2(0,0), "rightArm": Vector2(0,0), "leftLeg": Vector2(0,0), "rightLeg": Vector2(0,0)}

    # Fallback: all zeros
    return {"body": Vector2.ZERO, "head": Vector2.ZERO, "leftArm": Vector2.ZERO, "rightArm": Vector2.ZERO, "leftLeg": Vector2.ZERO, "rightLeg": Vector2.ZERO}
```

### 2.3 AnimationPlayer Alternative

Instead of code-driven offsets, you can use AnimationPlayer with position tracks:

```
Animation: walk_down (0.75s, 6 frames, looping)
  Track: BodyLayer/LeftLeg:position
    Key 0 (0.000s): Vector2(0, 1)
    Key 1 (0.125s): Vector2(0, 1)
    Key 2 (0.250s): Vector2(0, 0)
    Key 3 (0.375s): Vector2(0, -1)
    Key 4 (0.500s): Vector2(0, 0)
    Key 5 (0.625s): Vector2(0, 0)

  Track: BodyLayer/RightLeg:position
    Key 0 (0.000s): Vector2(0, -1)
    ...etc for all 6 parts
```

You would create 4 walk animations (`walk_down`, `walk_up`, `walk_left`, `walk_right`) and 4 idle animations. Use `AnimationPlayer.speed_scale` for speed modulation.

### 2.4 Equipment Overlays

Equipment sprites are additional `Sprite2D` children attached to the relevant body part node:

```
BodyLayer
├── Body (Sprite2D)
│   └── ArmorOverlay (Sprite2D)   ← equipment layer
├── Head (Sprite2D)
│   └── HelmetOverlay (Sprite2D)
├── LeftArm (Sprite2D)
│   └── WeaponOverlay (Sprite2D)
...
```

Equipment overlays inherit the parent part's position offset and z_index automatically.

---

## 3. Approach B: Skeleton2D with Bone2D (Advanced)

Use Godot's built-in skeletal animation for smoother interpolation and future IK support. This approach is more complex but enables features like ragdoll physics and procedural animation.

### 3.1 Scene Tree

```
EnemySprite (Node2D)
├── Skeleton2D
│   ├── BoneRoot (Bone2D)             ← root bone at hip
│   │   ├── BoneBody (Bone2D)
│   │   │   ├── BoneHead (Bone2D)
│   │   │   ├── BoneLeftArm (Bone2D)
│   │   │   │   └── LeftArmSprite (Sprite2D)
│   │   │   ├── BoneRightArm (Bone2D)
│   │   │   │   └── RightArmSprite (Sprite2D)
│   │   │   └── BodySprite (Sprite2D)
│   │   ├── BoneLeftLeg (Bone2D)
│   │   │   └── LeftLegSprite (Sprite2D)
│   │   └── BoneRightLeg (Bone2D)
│   │       └── RightLegSprite (Sprite2D)
│   └── HeadSprite (Sprite2D)
└── AnimationPlayer
```

### 3.2 Bone Hierarchy

```
BoneRoot (hip/pelvis)
├── BoneBody (torso) — offset up from root
│   ├── BoneHead — offset up from torso
│   ├── BoneLeftArm — offset left from torso
│   └── BoneRightArm — offset right from torso
├── BoneLeftLeg — offset down-left from root
└── BoneRightLeg — offset down-right from root
```

### 3.3 Setup in GDScript

```gdscript
class_name SkeletalBodypart
extends Node2D

@onready var skeleton: Skeleton2D = $Skeleton2D
@onready var anim_player: AnimationPlayer = $AnimationPlayer

# Bone references
@onready var bone_root: Bone2D = $Skeleton2D/BoneRoot
@onready var bone_body: Bone2D = $Skeleton2D/BoneRoot/BoneBody
@onready var bone_head: Bone2D = $Skeleton2D/BoneRoot/BoneBody/BoneHead
@onready var bone_left_arm: Bone2D = $Skeleton2D/BoneRoot/BoneBody/BoneLeftArm
@onready var bone_right_arm: Bone2D = $Skeleton2D/BoneRoot/BoneBody/BoneRightArm
@onready var bone_left_leg: Bone2D = $Skeleton2D/BoneRoot/BoneLeftLeg
@onready var bone_right_leg: Bone2D = $Skeleton2D/BoneRoot/BoneRightLeg


func _ready() -> void:
    # Set rest poses (neutral standing position)
    # These values depend on your sprite dimensions (32x32 assumed)
    bone_root.rest = Transform2D(0, Vector2(16, 20))       # Hip center
    bone_body.rest = Transform2D(0, Vector2(0, -8))         # Torso above hip
    bone_head.rest = Transform2D(0, Vector2(0, -10))        # Head above torso
    bone_left_arm.rest = Transform2D(0, Vector2(-6, 0))     # Left of torso
    bone_right_arm.rest = Transform2D(0, Vector2(6, 0))     # Right of torso
    bone_left_leg.rest = Transform2D(0, Vector2(-3, 4))     # Below hip left
    bone_right_leg.rest = Transform2D(0, Vector2(3, 4))     # Below hip right

    # Apply rest poses
    for bone in [bone_root, bone_body, bone_head, bone_left_arm, bone_right_arm, bone_left_leg, bone_right_leg]:
        bone.set_autocalculate_length_and_angle(false)


func play_walk(direction: String) -> void:
    var anim_name: String = "walk_" + direction
    if anim_player.has_animation(anim_name):
        anim_player.play(anim_name)


func play_idle(direction: String) -> void:
    var anim_name: String = "idle_" + direction
    if anim_player.has_animation(anim_name):
        anim_player.play(anim_name)
```

### 3.4 AnimationPlayer Bone Tracks

For Skeleton2D, animate bone transforms instead of sprite positions:

```
Animation: walk_down (0.75s, looping)
  Track: Skeleton2D:BoneRoot/BoneBody (Transform2D)
    Key 0: offset Vector2(0, 0)
    Key 1: offset Vector2(0, 1)     # weight settling dip
    Key 2: offset Vector2(0, 0)
    Key 3: offset Vector2(0, 0)
    Key 4: offset Vector2(0, 1)     # weight settling dip
    Key 5: offset Vector2(0, 0)

  Track: Skeleton2D:BoneRoot/BoneBody/BoneHead (Transform2D)
    Key 0: offset Vector2(0, 0)
    Key 1: offset Vector2(0, 1)
    Key 2: offset Vector2(0, -1)    # anticipation bob
    Key 3: offset Vector2(0, 0)
    Key 4: offset Vector2(0, 1)
    Key 5: offset Vector2(0, -1)

  Track: Skeleton2D:BoneRoot/BoneLeftLeg (Transform2D)
    Key 0: offset Vector2(0, 1)     # forward stride
    Key 1: offset Vector2(0, 1)
    Key 2: offset Vector2(0, 0)     # passing
    Key 3: offset Vector2(0, -1)    # back stride
    Key 4: offset Vector2(0, 0)
    Key 5: offset Vector2(0, 0)
  ...etc
```

### 3.5 When to Use Skeleton2D vs Layered Sprite2D

| Feature | Layered Sprite2D | Skeleton2D |
|---------|------------------|------------|
| Setup complexity | Low | Medium-High |
| Direct JS port fidelity | Exact match | Approximate |
| Smooth interpolation | Manual (lerp) | Built-in |
| IK support | No | Yes |
| Ragdoll physics | No | Yes (with PhysicalBone2D) |
| Equipment attachment | Child nodes | Bone follow nodes |
| Runtime bone manipulation | N/A | Full access |
| Performance | Excellent | Good |

**Recommendation**: Start with Layered Sprite2D (Approach A) for a faithful port. Migrate to Skeleton2D later only if you need IK, ragdoll, or procedural animation.

---

## 4. Sprite Asset Pipeline

### 4.1 Exporting from JS to PNG

The JS system stores sprites as pixel arrays with palettes. Export them to PNGs for Godot:

```javascript
// Export script (run in browser console with bodypart-demo.html loaded)
function exportPartToPNG(partSprite, filename) {
    const canvas = document.createElement('canvas');
    canvas.width = partSprite.pixels[0].length;
    canvas.height = partSprite.pixels.length;
    const ctx = canvas.getContext('2d');

    for (let y = 0; y < partSprite.pixels.length; y++) {
        for (let x = 0; x < partSprite.pixels[y].length; x++) {
            const char = partSprite.pixels[y][x];
            if (char === '.') continue;
            ctx.fillStyle = partSprite.palette[char];
            ctx.fillRect(x, y, 1, 1);
        }
    }

    const link = document.createElement('a');
    link.download = filename + '.png';
    link.href = canvas.toDataURL();
    link.click();
}
```

### 4.2 Godot Import Settings

For pixel-art sprites, configure the import settings:

```
Filter: Nearest (no filtering)
Mipmaps: Disabled
Compress Mode: Lossless
```

Or set project-wide defaults in `Project → Project Settings → Rendering → Textures`:
```
Default Texture Filter: Nearest
```

### 4.3 SpriteFrames Resource

For `AnimatedSprite2D` usage, create a `SpriteFrames` resource with animations:

```
idle_down  (1 frame, no loop)
idle_up    (1 frame, no loop)
idle_left  (1 frame, no loop)
walk_down  (6 frames, 8 FPS, loop)
walk_up    (6 frames, 8 FPS, loop)
walk_left  (6 frames, 8 FPS, loop)
```

Right-direction animations are handled by `flip_h = true` on the left animations.

---

## 5. Integration with Existing Systems

### 5.1 PlayerAnimationSystem

The existing `player_animation_system.gd` manages state transitions. Connect it to the bodypart sprite:

```gdscript
# In player_animation_system.gd
@onready var bodypart_sprite: BodypartSprite = $BodypartSprite

func _update_animation() -> void:
    bodypart_sprite.set_direction(current_direction)
    match current_state:
        State.IDLE:
            bodypart_sprite.set_state("idle")
        State.WALKING:
            bodypart_sprite.set_state("walking")
            bodypart_sprite.move_speed = current_move_speed
        State.DYING:
            bodypart_sprite.set_state("dying")
```

### 5.2 Enemy AI Integration

Connect enemy AI state changes to the bodypart renderer:

```gdscript
# In enemy script
func _on_state_changed(new_state: String) -> void:
    match new_state:
        "patrol", "chase":
            bodypart_sprite.set_state("walking")
        "idle", "alert":
            bodypart_sprite.set_state("idle")
        "dead":
            bodypart_sprite.set_state("dying")
```

### 5.3 HUD Unit Frames

For rendering creature sprites in the HUD (unit frames, bestiary), use the same `BodypartSprite` scene instanced into a `SubViewport`:

```gdscript
# Create a SubViewport with the bodypart sprite for UI thumbnails
var viewport := SubViewport.new()
viewport.size = Vector2i(32, 32)
viewport.transparent_bg = true
var sprite_instance := bodypart_scene.instantiate()
sprite_instance.set_direction("down")
sprite_instance.set_state("idle")
viewport.add_child(sprite_instance)
```

---

## 6. Checklist

- [ ] Export body part PNGs from JS pixel data (all directions, all creature types)
- [ ] Configure Godot import settings for pixel art (Nearest filter)
- [ ] Create `BodypartSprite` scene with 6 Sprite2D children
- [ ] Implement z-order switching per direction
- [ ] Port walk cycle offset data (6 frames × 3 directions × 6 parts)
- [ ] Implement right-direction derivation (flip_h + mirror swap + negate dx)
- [ ] Add speed modulation (0.25× – 2.0× base FPS)
- [ ] Connect to PlayerAnimationSystem
- [ ] Connect to enemy AI state machine
- [ ] Add equipment overlay attachment points
- [ ] Create SubViewport setup for HUD unit frame rendering
- [ ] (Optional) Migrate to Skeleton2D/Bone2D for IK/ragdoll support
