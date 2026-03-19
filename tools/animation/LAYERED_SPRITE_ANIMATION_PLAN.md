# Layered Body Part Sprite Animation System

## Overview
Convert 18 base template PNGs (6 body parts × 3 directions) to text format, create a layered composite renderer, define a 6-frame walk cycle with idle state using offset-only animation, and build an HTML demo.

## Files to Create (6 new files, no existing files modified)

| # | File | Purpose |
|---|------|---------|
| 1 | `tools/bodypart-converter.py` | Position-preserving PNG → text converter |
| 2 | `js/rendering/body-part-sprites.js` | Output of converter (all 18 sprites in one file) |
| 3 | `js/config/bodypart-sprite-config.js` | Z-order, animation config, state machine |
| 4 | `js/rendering/bodypart-walk-animation.js` | Idle + 6-frame walk cycle offset data |
| 5 | `js/rendering/bodypart-renderer.js` | Compositing renderer with state machine |
| 6 | `bodypart-demo.html` | Interactive demo page |

---

## Step 1: Position-Preserving Converter (`tools/bodypart-converter.py`)

Fork color extraction/quantization from `tools/pixel-to-text-converter.py` (lines 28-103) with key changes:
- **No cropping** - remove bounding box crop (lines 115-126)
- **No resizing** - assert 32x32, abort if not (remove lines 131-142)
- **Alpha threshold 64** - pixels with alpha < 64 become `.` (preserves anti-aliased edges; at 32x32 losing edge pixels noticeably changes silhouettes. Can be raised via `--alpha` flag if noise pixels appear)
- **Batch mode**: Process `assets/base/{down,up,mirror}/` → single structured JS output
- **Part name mapping**:
  - `Head_sprite_*.png` → `head`
  - `Body_sprite_*.png` → `body`
  - `Left Arm_sprite_*.png` → `leftArm`
  - `Right Arm_sprite_*.png` → `rightArm`
  - `Left Leg_sprite_*.png` → `leftLeg`
  - `Right Leg_sprite_*.png` → `rightLeg`

Run: `python tools/bodypart-converter.py assets/base/ --output js/rendering/body-part-sprites.js`

---

## Step 2: Sprite Data Format (`js/rendering/body-part-sprites.js`)

Single file containing all 18 body part sprites organized by direction:

```javascript
const BODY_PART_SPRITES = {
    name: 'humanoid_base',
    width: 32, height: 32,
    directions: {
        down: {
            head:     { pixels: [/* 32 rows of 32 chars */], palette: {...} },
            body:     { pixels: [...], palette: {...} },
            leftArm:  { pixels: [...], palette: {...} },
            rightArm: { pixels: [...], palette: {...} },
            leftLeg:  { pixels: [...], palette: {...} },
            rightLeg: { pixels: [...], palette: {...} }
        },
        up:   { /* same 6 parts */ },
        left: { /* same 6 parts, from mirror/ dir */ }
        // right: derived at runtime by flipping left
    }
};
```

---

## Step 3: Config (`js/config/bodypart-sprite-config.js`)

### Z-Order per Direction (rendered back → front)

| Direction | Render Order |
|-----------|-------------|
| **down** | body → leftLeg → rightLeg → leftArm → rightArm → head |
| **up** | head → body → leftArm → rightArm → leftLeg → rightLeg |
| **left** | rightArm → rightLeg → body → leftLeg → leftArm → head |
| **right** | leftArm → leftLeg → body → rightLeg → rightArm → head |

**UP rationale**: Head is furthest (facing away), then body (back of torso), arms mid-layer, legs rendered last/frontmost since they step out below the torso and must be visible when walking away.

### Animation State Machine

```javascript
states: ['idle', 'walking', 'attacking', 'hit', 'dying']
```

- **idle** → **walking**: On movement input. Snap to walk frame 0.
- **walking** → **idle**: On movement stop. Snap to idle pose (all offsets 0,0).
- **walking** → **attacking**: On attack input. Interrupt walk, begin attack frame 0.
- **attacking** → **idle/walking**: On attack complete. Resume based on movement state.
- **any** → **hit**: On damage received. Play hit reaction, return to previous state.
- **any** → **dying**: On death. Play death animation (non-looping).

### Direction Transitions

When the player changes facing direction mid-walk (e.g., down → left):
- **Snap immediately** to the new direction's sprite set at the current frame index.
- Do not finish the current frame or blend. Pixel art handles snapping cleanly.

### Speed Scaling

Animation playback speed scales proportionally with movement speed:

```javascript
effectiveFPS = baseFPS * (currentMoveSpeed / normalMoveSpeed)
```

- Normal walk: 8 FPS (750ms cycle)
- Sprint (1.5x speed): 12 FPS (500ms cycle)
- Encumbered (0.5x speed): 4 FPS (1500ms cycle)
- Minimum clamp: 2 FPS (prevent frozen-looking animation)
- Maximum clamp: 16 FPS (prevent strobing)

---

## Step 4: Walk Animation (`js/rendering/bodypart-walk-animation.js`)

### Idle State

All offsets 0,0 — true neutral standing pose. Optional subtle breathing via code transform (scaleY 0.98→1.02 oscillation on body, head follows).

```
idle: { body: 0,0 | head: 0,0 | leftArm: 0,0 | rightArm: 0,0 | leftLeg: 0,0 | rightLeg: 0,0 }
```

### Walk Cycle

6-frame offset-only walk cycle at 8 FPS (750ms per cycle, looping).

**Design notes**:
- Leg offsets bumped to ±2/±3 to sell motion at game render scale (pixel art eats subtlety)
- Arm peak swing at ±3 horizontal
- Arms include Y-axis swing: forward-swinging arm rises (dy:-1), back-swinging arm drops (dy:+1)
- Body bob of +1 is realistic and sufficient
- Test at actual game render scale (1x-2x) before committing; what looks right zoomed in often looks like nothing in-game

### Walk Cycle Pattern
```
Frame 0: Right foot contact  (neutral body, legs split)
Frame 1: Weight settling     (body dips dy:+1, legs planted)
Frame 2: Legs passing        (head anticipates dy:-1, limbs returning center)
Frame 3: Left foot contact   (neutral, arms/legs mirror of frame 0)
Frame 4: Weight settling     (body dips dy:+1, legs planted)
Frame 5: Legs passing        (head anticipates dy:-1, limbs returning center)
```

### DOWN Direction Offset Table (dx, dy per part)

| Frame | body | head | leftArm | rightArm | leftLeg | rightLeg |
|-------|------|------|---------|----------|---------|----------|
| 0 | 0,0 | 0,0 | +2,-1 | -2,+1 | -1,+2 | +1,-2 |
| 1 | 0,+1 | 0,+1 | +3,0 | -3,+1 | -1,+2 | +1,-1 |
| 2 | 0,0 | 0,-1 | +1,0 | -1,0 | 0,0 | 0,0 |
| 3 | 0,0 | 0,0 | -2,+1 | +2,-1 | +1,-2 | -1,+2 |
| 4 | 0,+1 | 0,+1 | -3,+1 | +3,0 | +1,-1 | -1,+2 |
| 5 | 0,0 | 0,-1 | -1,0 | +1,0 | 0,0 | 0,0 |

**Arm Y-axis logic**: Forward-swinging arm (positive dx in down view) gets dy:-1 (rises). Back-swinging arm (negative dx) gets dy:+1 (drops). Peak swing frames (1,4) have maximum dx ±3.

**Leg logic**: Stepping leg displaces ±2 on dy (vertical is the visible stride in down view). Horizontal leg offset ±1 adds slight lateral spread.

### UP Direction Offset Table (dx, dy per part)

| Frame | body | head | leftArm | rightArm | leftLeg | rightLeg |
|-------|------|------|---------|----------|---------|----------|
| 0 | 0,0 | 0,0 | -2,-1 | +2,+1 | +1,+2 | -1,-2 |
| 1 | 0,+1 | 0,+1 | -3,0 | +3,+1 | +1,+2 | -1,-1 |
| 2 | 0,0 | 0,-1 | -1,0 | +1,0 | 0,0 | 0,0 |
| 3 | 0,0 | 0,0 | +2,+1 | -2,-1 | -1,-2 | +1,+2 |
| 4 | 0,+1 | 0,+1 | +3,+1 | -3,0 | -1,-1 | +1,+2 |
| 5 | 0,0 | 0,-1 | +1,0 | -1,0 | 0,0 | 0,0 |

**UP note**: Arm dx is inverted from down (we see the back, so left arm visual position swaps). Leg dy polarity matches down since vertical stride looks the same from behind.

### LEFT Direction Offset Table (dx, dy per part)

| Frame | body | head | leftArm | rightArm | leftLeg | rightLeg |
|-------|------|------|---------|----------|---------|----------|
| 0 | 0,0 | 0,0 | +2,-1 | -2,+1 | +2,+1 | -2,-1 |
| 1 | 0,+1 | 0,+1 | +3,0 | -3,+1 | +3,0 | -2,0 |
| 2 | 0,0 | 0,-1 | +1,0 | -1,0 | 0,0 | 0,0 |
| 3 | 0,0 | 0,0 | -2,+1 | +2,-1 | -2,-1 | +2,+1 |
| 4 | 0,+1 | 0,+1 | -3,+1 | +3,0 | -2,0 | +3,0 |
| 5 | 0,0 | 0,-1 | -1,0 | +1,0 | 0,0 | 0,0 |

**LEFT note**: In side view, stride is primarily horizontal (dx ±2/±3) since we see the legs stepping forward/back. Vertical component is secondary.

### RIGHT Direction (Runtime Derived)

Derived from LEFT by:
1. Using `left` direction sprites with `flipX = true`
2. Swapping leftArm↔rightArm and leftLeg↔rightLeg offset assignments
3. Negating all dx values

**FlipX asymmetry note**: The flip formula `31 - px` works for 32-wide canvases. If any body part has an odd number of active pixels horizontally, flipping may shift it by 1 pixel relative to center, causing a visible jump when rotating left↔right. Validate visually once real sprites are in and adjust with a per-part `flipXCorrection` offset if needed.

---

## Step 5: Renderer (`js/rendering/bodypart-renderer.js`)

### State Machine

```javascript
animationState: {
    current: 'idle',       // 'idle' | 'walking' | 'attacking' | 'hit' | 'dying'
    direction: 'down',     // 'down' | 'up' | 'left' | 'right'
    frameIndex: 0,
    elapsed: 0,
    moveSpeed: 1.0,        // Movement speed multiplier for animation scaling
    onComplete: null       // Callback for non-looping animations (attack, hit, dying)
}
```

### Core API
- `draw(ctx, direction, x, y, scale, frameOverride)` - composite all parts with animation
- `_renderPart(ctx, partSprite, offset, x, y, scale, flipX)` - render single part
- `_deriveRightFrame(leftFrame)` - mirror left offsets for right direction
- `update(deltaTime)` - advance animation state with speed scaling
- `setState(newState)` - transition between idle/walking/attacking/etc.
- `setDirection(direction)` - snap to new direction immediately
- `reset()` - reset to idle frame 0

### Update Logic

```javascript
update(deltaTime) {
    if (this.state.current === 'idle') return; // idle is static (breathing handled by transform)

    const baseFPS = BODYPART_SPRITE_CONFIG.walkFPS;
    const speedMult = clamp(this.state.moveSpeed, 0.25, 2.0);
    const effectiveFPS = clamp(baseFPS * speedMult, 2, 16);
    const frameDuration = 1000 / effectiveFPS;

    this.state.elapsed += deltaTime;
    if (this.state.elapsed >= frameDuration) {
        this.state.elapsed -= frameDuration;
        this.state.frameIndex++;

        if (this.state.frameIndex >= frameCount) {
            if (looping) {
                this.state.frameIndex = 0;
            } else {
                this.state.frameIndex = frameCount - 1;
                if (this.state.onComplete) this.state.onComplete();
            }
        }
    }
}
```

Per-part rendering: iterate pixels, apply dx/dy offset, use `ctx.fillRect()` per pixel.
For right direction: use left sprites with flipX (mirror x: `31 - px`), swap left/right part names and negate dx.

---

## Step 6: HTML Demo (`bodypart-demo.html`)

Self-contained HTML with all data inline. Layout:

```
┌────────────────────────────────────────────────────┐
│ Layered Sprite Walk Cycle Demo                     │
├──────────────────────┬─────────────────────────────┤
│ Large Animated       │ Individual Parts (6 canvas)  │
│ Preview (6x scale)   │ head, body, arms, legs       │
├──────────────────────┴─────────────────────────────┤
│ Frame Strip: 6 frames side-by-side (3x scale)      │
├────────────────────────────────────────────────────┤
│ All 4 Directions (animated mini-previews at 2x)    │
├────────────────────────────────────────────────────┤
│ State: [Idle] [Walk] | Speed: [0.5x] [1x] [1.5x]  │
│ Controls: Play/Pause, Step, Speed slider            │
│ Frame Info: per-part offsets for current frame       │
└────────────────────────────────────────────────────┘
```

**Demo should include**:
- Idle ↔ Walk toggle to test state transitions
- Speed multiplier control to test animation scaling
- Render at multiple scales (2x, 4x, 6x) simultaneously to validate offset visibility at game scale vs zoomed-in editor scale

---

## Execution Order

```
Step 1: Create converter
    ↓
Step 2: Run converter → produces body-part-sprites.js
    ↓
    ├── Step 3: Config (parallel)
    ├── Step 4: Walk animation data (parallel)
    └── Step 5: Renderer (parallel)
    ↓
Step 6: HTML Demo (depends on all above)
```

Steps 3, 4, 5 can be implemented by parallel agents.

---

## Verification

1. **Converter**: Each sprite = exactly 32 rows × 32 chars. Pixel bounding boxes match source PNGs. Run at alpha=64, visually compare output against alpha=128 to confirm edge quality.
2. **Static composite**: Overlay all 6 parts in idle state (all offsets 0,0) → complete humanoid, no gaps.
3. **Z-order**: DOWN: arms in front of body, head on top. UP: legs in front of body (walking away, legs step out below torso). LEFT: near-side limbs in front.
4. **Walk cycle**: Smooth loop, body bob visible, arms counter-swing with Y rise/drop, legs sell the motion at 2x render scale. Frames 2 and 5 (passing) should read as natural transitions, not frozen.
5. **FlipX**: Right direction = exact mirror of left with proper part swapping. Check for 1-pixel asymmetry jump at left↔right transitions.
6. **Idle → Walk transition**: Character snaps cleanly from neutral pose to walk frame 0 with no visual glitch.
7. **Speed scaling**: Walk at 0.5x, 1x, 1.5x visually confirm animation speed tracks movement.
8. **Demo**: All controls work, all 4 directions animate, frame strip shows all 6 frames, idle/walk toggle functions.
