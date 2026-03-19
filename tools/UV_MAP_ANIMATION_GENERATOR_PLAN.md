# Plan: UV-Map Animation Generator System (Humanoid)

## Overview

Replace the current offset-only `BodypartRenderer` (32x32, translation-only) with a UV-map/FK-skeleton animation generator system (32x32, proper joint rotation). The first generator is **"humanoid"** — the architecture supports adding more generator types (slime, beast, golem, etc.) later. Both player and humanoid enemies will use this system.

**Native resolution: 32x32** — matches the existing sprite system. All identity textures, UV maps, part shapes, bone lengths, and hip positions operate within a 32x32 pixel grid. Display scaling is handled by a named constant (see Scaling section).

Each direction (down, up, left, right) gets its own FK skeleton definition and walk cycle — no workarounds or fallbacks for missing directions.

---

## Scaling (Issue #1)

The existing codebase uses different scale multipliers in different contexts:
- **Player** (player-animation.js:247): `tileSize / 32 * 1.3` — renders the 32px sprite at 130% of a tile. This makes the player slightly larger than one tile for visual presence.
- **Enemy sprites** (sprite-integration.js drawPixelSprite): `targetSize / spritePixelSize` where targetSize varies by monster.
- **Enemy legacy** (enemy-renderer.js:119): `tileSize * 1.5` for legacy spritesheets.

The 1.3 multiplier exists because the game designers want characters to be visually larger than a single tile for readability. This is a design choice, not a rendering artifact.

**Solution**: Define a named constant in `uvmap-renderer.js`:

```js
// How much larger than a tile the sprite renders. 1.0 = exactly one tile.
// 1.3 = 30% overflow (matches existing BodypartRenderer convention).
const UV_RENDER_SCALE = 1.3;
```

The draw formula becomes: `pixelScale = tileSize / generator.getSize() * UV_RENDER_SCALE`

This constant is used for **both** player and enemy rendering. The `draw()` method accepts `tileSize` and computes scale internally using `getSize()` and `UV_RENDER_SCALE`, so callers don't do their own math:

```js
// In UVMapRenderer.draw():
const nativeSize = this.generator.getSize(); // 32
const drawSize = tileSize * UV_RENDER_SCALE;
const pixelScale = drawSize / nativeSize;
// Center in tile
const offsetX = (tileSize - drawSize) / 2;
const offsetY = (tileSize - drawSize) / 2;
```

---

## New Files (4)

### 1. `js/rendering/animation-generator-registry.js`
Central registry mapping generator type names to instances.
- `register(typeName, generatorInstance)`
- `get(typeName)`, `has(typeName)`, `list()`
- Same pattern as existing `BodypartSpriteRegistry`

**Defensive bootstrap** (Issue #8): The registry self-initializes with a pending queue so generators that load before the registry (due to script reordering or CDN delays) can still register:

```js
// At top of file:
window.AnimationGeneratorRegistry = window.AnimationGeneratorRegistry || { _pending: [] };

// Then define the full registry, flushing any pending registrations:
const AnimationGeneratorRegistry = {
    _generators: {},
    register(name, gen) { this._generators[name] = gen; },
    get(name) { return this._generators[name] || null; },
    has(name) { return name in this._generators; },
    list() { return Object.keys(this._generators); }
};
// Flush pending
if (window.AnimationGeneratorRegistry._pending) {
    for (const p of window.AnimationGeneratorRegistry._pending) {
        AnimationGeneratorRegistry.register(p.name, p.gen);
    }
}
window.AnimationGeneratorRegistry = AnimationGeneratorRegistry;
```

Generators use this guard pattern when registering:
```js
if (typeof AnimationGeneratorRegistry !== 'undefined' && AnimationGeneratorRegistry.register) {
    AnimationGeneratorRegistry.register('humanoid', instance);
} else {
    window.AnimationGeneratorRegistry = window.AnimationGeneratorRegistry || { _pending: [] };
    window.AnimationGeneratorRegistry._pending.push({ name: 'humanoid', gen: instance });
}
```

### 2. `js/rendering/generators/humanoid-generator.js`
The humanoid animation generator. Extracted from `uv-map-prototype.html`, at 32x32 native, expanded to 4 directions.

**Shape generators** (adapted from prototype, halved dimensions):
- `makeOval(w, h)`, `makeRect(w, h, roundness)`, `makeHead()`

**Part definitions — 32x32 scale**:

| Part | Size | Pivot | Notes |
|------|------|-------|-------|
| head | 7x8 | (3, 6) | Hand-crafted profile |
| torso | 7x8 | (3, 1) | Rounded rectangle |
| lUpperArm / rUpperArm | 3x5 | (1, 0) | Oval |
| lForearm / rForearm | 3x5 | (1, 0) | Oval |
| lThigh / rThigh | 4x6 | (2, 0) | Rounded rectangle |
| lShin / rShin | 3x6 | (1, 0) | Rounded rectangle |

**Identity texture layout** — all 10 parts packed into a 32x32 atlas:
```
Row 0-7:   head(0,0)  torso(8,0)  lUpperArm(16,0)  rUpperArm(20,0)  lForearm(24,0)  rForearm(28,0)
Row 9-14:  lThigh(0,9) rThigh(5,9) lShin(10,9)      rShin(14,9)
```

---

#### Left/Right Bone Tree (side-view)

Adapted from prototype at half scale. Hip at `{x:16, y:14}`.

```
BONES_LEFT = [
    { name: 'spine',     parent: 'hip',       restAngle: -90, length: 6 },
    { name: 'neck',      parent: 'spine',     restAngle: 0,   length: 2 },
    { name: 'lUpperArm', parent: 'spine',     restAngle: 175, length: 4 },
    { name: 'lForearm',  parent: 'lUpperArm', restAngle: 5,   length: 4 },
    { name: 'rUpperArm', parent: 'spine',     restAngle: 175, length: 4 },
    { name: 'rForearm',  parent: 'rUpperArm', restAngle: 5,   length: 4 },
    { name: 'lThigh',    parent: 'hip',       restAngle: 90,  length: 5 },
    { name: 'lShin',     parent: 'lThigh',    restAngle: 0,   length: 5 },
    { name: 'rThigh',    parent: 'hip',       restAngle: 90,  length: 5 },
    { name: 'rShin',     parent: 'rThigh',    restAngle: 0,   length: 5 },
]
```

Z-order (left): `['rUpperArm','rForearm','rThigh','rShin','torso','lThigh','lShin','lUpperArm','lForearm','head']`

Right: Rendered frames from left are flipped horizontally via canvas transform.

---

#### Down/Up Bone Tree (Issue #3 — front/back-view)

The front-facing rig has a different topology than side-view. In side-view, both arms share a single shoulder joint (they overlap at different z-depths). In front-view, arms must emanate from different x-positions on the torso.

**Solution**: Add `shoulderL` and `shoulderR` bones as children of spine, each with a short horizontal offset. This means the down/up BONES array has 12 entries (2 more than left).

Hip at `{x:16, y:14}`.

```
BONES_DOWN = [
    { name: 'spine',      parent: 'hip',        restAngle: -90, length: 6  },
    { name: 'neck',       parent: 'spine',      restAngle: 0,   length: 2  },
    { name: 'shoulderL',  parent: 'spine',      restAngle: 180, length: 3  },  // offset left from spine top
    { name: 'shoulderR',  parent: 'spine',      restAngle: 0,   length: 3  },  // offset right from spine top
    { name: 'lUpperArm',  parent: 'shoulderL',  restAngle: 90,  length: 4  },  // hangs straight down
    { name: 'lForearm',   parent: 'lUpperArm',  restAngle: 0,   length: 4  },
    { name: 'rUpperArm',  parent: 'shoulderR',  restAngle: 90,  length: 4  },
    { name: 'rForearm',   parent: 'rUpperArm',  restAngle: 0,   length: 4  },
    { name: 'lThigh',     parent: 'hip',        restAngle: 80,  length: 5  },  // slight outward splay
    { name: 'lShin',      parent: 'lThigh',     restAngle: 10,  length: 5  },
    { name: 'rThigh',     parent: 'hip',        restAngle: 100, length: 5  },  // mirrored splay
    { name: 'rShin',      parent: 'rThigh',     restAngle: -10, length: 5  },
]
```

Z-order (down): `['lUpperArm','lForearm','rUpperArm','rForearm','lThigh','lShin','rThigh','rShin','torso','head']` — arms and legs behind torso, head on top.

Z-order (up): `['head','torso','lUpperArm','lForearm','rUpperArm','rForearm','lThigh','lShin','rThigh','rShin']` — head behind everything, limbs in front showing the back.

PART_JOINTS for down/up (differs from left due to shoulder bones):
```
{ lUpperArm: 'shoulderL', rUpperArm: 'shoulderR', ... } // others same as left
```

---

#### Walk Cycle — Left (side-view, 8 frames)

Same as prototype (angles are resolution-independent):

```
WALK_LEFT = [
    // Frame 0: Left leg forward contact
    { lThigh:-22, lShin:5,   rThigh:22,  rShin:0,   lUpperArm:18,  lForearm:8,  rUpperArm:-18, rForearm:-8,  spine:2,  hipDy:0  },
    // Frame 1: Weight settling
    { lThigh:-18, lShin:10,  rThigh:18,  rShin:8,   lUpperArm:12,  lForearm:5,  rUpperArm:-12, rForearm:-5,  spine:1,  hipDy:1  },
    // Frame 2: Left midstance
    { lThigh:-8,  lShin:3,   rThigh:5,   rShin:25,  lUpperArm:5,   lForearm:2,  rUpperArm:-5,  rForearm:-2,  spine:0,  hipDy:0  },
    // Frame 3: Push off
    { lThigh:8,   lShin:0,   rThigh:-12, rShin:22,  lUpperArm:-8,  lForearm:-4, rUpperArm:8,   rForearm:4,   spine:-1, hipDy:-1 },
    // Frame 4: Right leg forward contact (mirror of 0)
    { lThigh:22,  lShin:0,   rThigh:-22, rShin:5,   lUpperArm:-18, lForearm:-8, rUpperArm:18,  rForearm:8,   spine:-2, hipDy:0  },
    // Frame 5: Weight settling (mirror of 1)
    { lThigh:18,  lShin:8,   rThigh:-18, rShin:10,  lUpperArm:-12, lForearm:-5, rUpperArm:12,  rForearm:5,   spine:-1, hipDy:1  },
    // Frame 6: Right midstance (mirror of 2)
    { lThigh:5,   lShin:25,  rThigh:-8,  rShin:3,   lUpperArm:-5,  lForearm:-2, rUpperArm:5,   rForearm:2,   spine:0,  hipDy:0  },
    // Frame 7: Push off (mirror of 3)
    { lThigh:-12, lShin:22,  rThigh:8,   rShin:0,   lUpperArm:8,   lForearm:4,  rUpperArm:-8,  rForearm:-4,  spine:1,  hipDy:-1 },
]
```

---

#### Walk Cycle — Down (front-facing, 8 frames) (Issue #2)

The down view is the most common in a top-down roguelike. This is a **tuning task during implementation** — the exact values below are initial estimates that will require visual iteration. The frame structure and bone names are committed; the angle numbers will be adjusted during implementation of file #2 when we can see the results in-browser.

Constraints at 32x32:
- Front-facing has narrower visible range of motion (legs splay, arms sway side-to-side)
- Smaller angle swings than side-view to avoid artifacts (±10° to ±15° for thighs)
- Shoulder bones don't animate — they provide static horizontal offset only
- Arm swing is subtle (±8° upper arm) since it's foreshortened in front view

Initial estimate (8 frames):
```
WALK_DOWN = [
    // Frame 0: Left leg forward contact
    { lThigh:-12, lShin:5,   rThigh:12,  rShin:0,   lUpperArm:8,   lForearm:5,  rUpperArm:-8,  rForearm:-5,  shoulderL:0, shoulderR:0, spine:1,  hipDy:0  },
    // Frame 1: Weight settling
    { lThigh:-10, lShin:8,   rThigh:10,  rShin:5,   lUpperArm:5,   lForearm:3,  rUpperArm:-5,  rForearm:-3,  shoulderL:0, shoulderR:0, spine:0,  hipDy:1  },
    // Frame 2: Left midstance
    { lThigh:-5,  lShin:3,   rThigh:3,   rShin:15,  lUpperArm:2,   lForearm:1,  rUpperArm:-2,  rForearm:-1,  shoulderL:0, shoulderR:0, spine:0,  hipDy:0  },
    // Frame 3: Push off
    { lThigh:5,   lShin:0,   rThigh:-8,  rShin:12,  lUpperArm:-5,  lForearm:-3, rUpperArm:5,   rForearm:3,   shoulderL:0, shoulderR:0, spine:-1, hipDy:0  },
    // Frame 4: Right leg forward contact (mirror of 0)
    { lThigh:12,  lShin:0,   rThigh:-12, rShin:5,   lUpperArm:-8,  lForearm:-5, rUpperArm:8,   rForearm:5,   shoulderL:0, shoulderR:0, spine:-1, hipDy:0  },
    // Frame 5: Weight settling (mirror of 1)
    { lThigh:10,  lShin:5,   rThigh:-10, rShin:8,   lUpperArm:-5,  lForearm:-3, rUpperArm:5,   rForearm:3,   shoulderL:0, shoulderR:0, spine:0,  hipDy:1  },
    // Frame 6: Right midstance (mirror of 2)
    { lThigh:3,   lShin:15,  rThigh:-5,  rShin:3,   lUpperArm:-2,  lForearm:-1, rUpperArm:2,   rForearm:1,   shoulderL:0, shoulderR:0, spine:0,  hipDy:0  },
    // Frame 7: Push off (mirror of 3)
    { lThigh:-8,  lShin:12,  rThigh:5,   rShin:0,   lUpperArm:5,   lForearm:3,  rUpperArm:-5,  rForearm:-3,  shoulderL:0, shoulderR:0, spine:1,  hipDy:0  },
]
```

#### Walk Cycle — Up (back-facing)

Uses the same angle data as down. The visual difference comes from the different z-order (back of head visible, back of torso, etc.). If the back-facing view looks wrong with identical angles, the up cycle can diverge during tuning — but structurally it starts as a copy of down.

---

#### Attack Cycle (Issue #4)

The current system handles attacks in two ways:
1. **BodypartRenderer** (player): `attacking` state with `frameCount: 6` in BODYPART_SPRITE_CONFIG — but no actual attack animation data exists in BODYPART_WALK_ANIMATION. The attacking state currently shows the idle pose (no movement).
2. **Enemies**: Attack visuals are handled by `SpriteAnimator` via scale transforms (squash/stretch), white flash overlays, and particle effects — not by the sprite itself changing pose.

So neither system currently renders attack poses via limb movement. The visual "attack" is communicated through:
- White flash overlay (enemy-renderer.js:572-576)
- Hit flash overlay (enemy-renderer.js:580-586)
- Damage numbers
- Particle effects (melee slash, projectiles)

**Decision**: The UVMapRenderer will support an `attacking` animation cycle, defined as a simple 4-frame swing:

```
ATTACK_LEFT = [
    // Frame 0: Wind up (right arm pulls back)
    { rUpperArm:-40, rForearm:-20, lUpperArm:5, spine:-5, ... others at 0 },
    // Frame 1: Swing forward
    { rUpperArm:30, rForearm:15, lUpperArm:-5, spine:5, ... },
    // Frame 2: Follow through
    { rUpperArm:50, rForearm:25, lUpperArm:-8, spine:8, ... },
    // Frame 3: Return to neutral
    { rUpperArm:10, rForearm:5, lUpperArm:0, spine:2, ... },
]
```

Attack cycles for down/up follow the same pattern (arm swing toward camera / away from camera). These are initial values — exact tuning during implementation.

The attack cycle is `looping: false` with `frameCount: 4`. When `setState('attacking')` is called, it plays once and the `onComplete` callback returns to idle/walking.

This is an **upgrade** over the current system which has no attack pose at all for the bodypart renderer. The white flash / hit flash / particle overlays continue to work on top of the posed sprite.

---

**Animation cycles** — stored in `ANIMATION_CYCLES`:
```
{
  walk:   { left: [...8 frames...], down: [...8 frames...], up: [...8 frames...] },
  idle:   { left: [all-zeros],      down: [all-zeros],      up: [all-zeros]      },
  attack: { left: [...4 frames...], down: [...4 frames...], up: [...4 frames...] }
}
```
Right derived from left by swapping L/R bone deltas and negating horizontal components.

---

**FK solver**: `solveFK(hipPos, bones, deltas)` — from prototype, takes direction-specific bones array as parameter.

**UV-map generator**: `generateUVFrame(directionConfig, animFrame)` — generates a 32x32 UV coordinate map per frame.

**Identity texture builder**: `buildIdentityTexture(skinDef)` — builds 32x32 RGBA array (4096 bytes).

**Public API** (class `HumanoidAnimationGenerator`):
- `constructor()` — pre-computes all UV frames for all directions and animation types
- `getUVFrames(direction, animationType)` — returns pre-computed UV frame array
- `buildSkin(skinDefinition)` — returns Uint8ClampedArray identity texture (32x32)
- `renderFrame(ctx, x, y, scale, uvFrame, identityData)` — draws one frame to an offscreen canvas
- `getFrameCount(animationType)` — returns frame count (8 for walk, 1 for idle, 4 for attack)
- `getSize()` — returns 32. Callers use this instead of hardcoding, which future-proofs for generators at different resolutions.
- Registers itself with `AnimationGeneratorRegistry` as `'humanoid'` (with defensive guard pattern)

### 3. `js/rendering/generators/humanoid-skins.js`
Skin color definitions for humanoid entities.

**`HUMANOID_SKINS`** object with named presets:
- `default` (warrior skin from prototype — used for player)
- `mage`, `ranger` (from prototype)
- Enemy skins: `skeletal_warrior`, `pyro_cultist`, `shadow_stalker`, `ash_walker`, `temple_sentinel`, `demon_knight`, `shield_bearer`

Each skin maps shape indices (1-7) to hex colors per body part, same format as prototype SKINS.

**`MONSTER_GENERATOR_MAP`** — maps humanoid monster names to `{ generator: 'humanoid', skin: 'skinName' }`:
```js
'Skeletal Warrior': { generator: 'humanoid', skin: 'skeletal_warrior' },
'Skeleton':         { generator: 'humanoid', skin: 'skeletal_warrior' },
'Pyro Cultist':     { generator: 'humanoid', skin: 'pyro_cultist' },
'Shadow Stalker':   { generator: 'humanoid', skin: 'shadow_stalker' },
'Ash Walker':       { generator: 'humanoid', skin: 'ash_walker' },
'Temple Sentinel':  { generator: 'humanoid', skin: 'temple_sentinel' },
'Demon Knight':     { generator: 'humanoid', skin: 'demon_knight' },
'Shield Bearer':    { generator: 'humanoid', skin: 'shield_bearer' },
```

### 4. `js/rendering/uvmap-renderer.js`
Drop-in replacement for `BodypartRenderer` — same public interface.

**Class `UVMapRenderer`**:
- **Constructor(generatorType, skinName)**
  - Gets generator from `AnimationGeneratorRegistry`
  - Builds identity texture via `generator.buildSkin(HUMANOID_SKINS[skinName])`
  - Creates offscreen canvas cache
  - Stores `_skinName` for cache key generation
- **setState(state)** — same state machine (idle, walking, attacking, hit, dying)
- **setDirection(direction)** — stores direction (down/up/left/right)
- **update(deltaTime)** — advances frame counter at configured FPS
- **draw(ctx, x, y, tileSize, directionOverride, frameOverride)**
  - Computes `pixelScale = tileSize / generator.getSize() * UV_RENDER_SCALE`
  - Resolves direction (right → uses left UV frames + flipX)
  - Gets UV frame from generator for current (direction, animType, frameIdx)
  - Checks offscreen canvas cache; if miss, renders to 32x32 offscreen canvas
  - Draws cached canvas to output ctx, centered in tile
  - For right direction: `ctx.save(); ctx.scale(-1, 1)` before draw, then restore
- **setSkin(skinName)** — rebuilds identity texture, sets `_dirty = true` (lazy cache invalidation, see Issue #7)
- **clearCache()** — invalidates all cached frames
- **getSize()** — delegates to `generator.getSize()`

---

## Caching Architecture (Issue #6 — per-entity state vs shared data)

The expensive pre-computed data (UV frames, identity textures) should be shared. Per-entity animation state (currentFrame, currentState, direction) must not be shared.

**Two-tier architecture**:

1. **`AnimationTemplate`** (shared, cached per generatorType + skinName):
   - References the generator's pre-computed UV frames (shared across all skins)
   - Holds the identity texture for this specific skin
   - Holds pre-rendered offscreen canvases per (direction, animType, frameIdx)
   - One instance per unique (generatorType, skinName) pair
   - Stored in a module-level `_templateCache` map in `uvmap-renderer.js`

2. **`UVMapRenderer`** (per-entity instance):
   - References an AnimationTemplate (shared)
   - Owns its own animation state: `{ current, direction, frameIndex, elapsed, moveSpeed, onComplete }`
   - Lightweight — just state + pointer to template
   - Multiple enemies of the same type share the template but each has its own renderer instance

```js
// Module-level cache
const _templateCache = {};

function getTemplate(generatorType, skinName) {
    const key = generatorType + ':' + skinName;
    if (!_templateCache[key]) {
        const gen = AnimationGeneratorRegistry.get(generatorType);
        _templateCache[key] = {
            generator: gen,
            identityData: gen.buildSkin(HUMANOID_SKINS[skinName]),
            frameCanvases: {},  // lazily populated
        };
    }
    return _templateCache[key];
}
```

This means:
- Creating a UVMapRenderer for an enemy is cheap (lookup template, init state)
- 10 Skeletal Warriors share one template but each tracks its own walk frame
- No cache key collision — state is per-instance, data is per-type

---

## Visual Effects the UVMapRenderer Path Must Handle (Issue #5)

The enemy rendering pipeline in `drawEnemy()` applies visual effects **after** `tryDrawEnemySprite()` returns, as overlays on the tile area. These effects are:

1. **Attack white flash** (lines 572-576): `ctx.fillRect` with pulsing white over the tile bounds
2. **Hit flash** (lines 580-586): `ctx.fillRect` with fading red over tile bounds
3. **Stagger flash** (lines 589-592): `ctx.fillRect` with white over tile bounds
4. **Death fade**: Handled by `SpriteAnimator.isDeathAnimationComplete()` check at top of `drawEnemy()` — prevents rendering after death animation finishes
5. **Leap shadow** (lines 538-556): Drawn before sprite, uses enemy position — independent of sprite system
6. **Target outline** (lines 61-66): `ctx.strokeRect` red border — independent of sprite system

**All of these are applied as rect fills/strokes over the tile area**, not as modifications to the sprite pixels. This means they work identically regardless of whether the sprite was drawn by pixel sprites or UVMapRenderer. **No changes needed** — the existing overlay pipeline handles everything.

The UVMapRenderer just needs to:
- Draw the sprite within the tile bounds (centered via UV_RENDER_SCALE offset)
- Return `true` from `tryDrawEnemySprite` so the overlay pipeline runs

The only concern is death animation: currently `SpriteAnimator` tracks death state per entity. For UVMapRenderer enemies, we either:
- (a) Have UVMapRenderer handle its own death via `setState('dying')` and report completion, OR
- (b) Use the existing SpriteAnimator death tracking alongside UVMapRenderer

**Decision**: Option (a). UVMapRenderer's `dying` state plays a simple fade-out (reduce globalAlpha over frames). The `isComplete()` method returns true when the dying animation finishes. `drawEnemy()` checks this instead of `SpriteAnimator.isDeathAnimationComplete()` for generator-based enemies.

---

## Player Equipment / Skin Changes (Issue #7)

The player can change equipment, which in the paperdoll system changes visual appearance. In the UVMapRenderer system, "skin" = "current color palette for body parts."

**Lazy rebuild approach**: When `setSkin()` is called:
1. Set `this._dirty = true` on the template
2. Store the new skin definition
3. On next `draw()`, if `_dirty`:
   - Rebuild only the identity texture (cheap — 32x32 = 4096 bytes, ~1ms)
   - Invalidate only the pre-rendered frame canvases for this skin
   - Set `_dirty = false`

This avoids a frame hitch on equipment change. The identity texture rebuild is fast enough at 32x32 to be imperceptible. The frame canvases rebuild lazily — only the frame being drawn that tick gets rebuilt, others rebuild over subsequent frames as they're needed.

For the initial implementation, equipment doesn't change the skin — the player uses the `'default'` skin. Equipment-driven skin changes are a future enhancement that will map equipment items to palette modifications per body part.

---

## Existing Files to Modify (3)

### 5. `js/systems/player-animation.js`
- Add `useUVMapSprites` flag and `PlayerUVMapRenderer` variable
- In `initPlayerSpriteSystem()`: Add Priority 0 check:
  - If `AnimationGeneratorRegistry` exists and has `'humanoid'` → create `PlayerUVMapRenderer = new UVMapRenderer('humanoid', 'default')`
  - Set `useUVMapSprites = true`
- In `updatePlayerAnimation()`: Add first branch for UVMapRenderer (setState, setDirection, update)
- In `drawPlayerSprite()`: Add first branch for UVMapRenderer draw. Pass `tileSize` — the renderer computes scale internally using `UV_RENDER_SCALE`. Same dash ghost trail support (ghost rendering uses saved direction override).
- Keep BodypartRenderer + pixel sprite + spritesheet as lower-priority fallbacks

### 6. `js/ui/enemy-renderer.js`
- In `tryDrawEnemySprite()`: Add a check at the top, before the existing pixel sprite path:
  - If `MONSTER_GENERATOR_MAP` exists and has the enemy's name
  - Get/create a `UVMapRenderer` instance **per enemy** (stored on the enemy object as `enemy._uvRenderer`)
  - If `enemy._uvRenderer` doesn't exist, create one and store it
  - Update state: set direction from enemy facing, set state from combat state (idle/walking/attacking based on `enemy.isMoving`, `enemy.isAttacking` / windup)
  - Call `enemy._uvRenderer.update(deltaTime)` then `enemy._uvRenderer.draw(ctx, ex, ey, tileSize)`
  - Draw target outline if applicable
  - Return `true`
- For death: check `enemy._uvRenderer.isComplete()` instead of `SpriteAnimator.isDeathAnimationComplete()` for generator-based enemies
- Non-humanoid enemies fall through to existing SpriteRenderer path unchanged

### 7. `index.html`
Add new script tags after the existing bodypart section (around line 213) and before player-animation.js:
```html
<!-- Animation Generator System -->
<script src="js/rendering/animation-generator-registry.js"></script>
<script src="js/rendering/generators/humanoid-generator.js"></script>
<script src="js/rendering/generators/humanoid-skins.js"></script>
<script src="js/rendering/uvmap-renderer.js"></script>
```

`sprite-integration.js` requires no changes — `MONSTER_GENERATOR_MAP` is checked in enemy-renderer.js directly.

---

## 32x32 Considerations

At 32x32, rotation quality is more constrained than 64x64:
- Bone of length 4px has ~25 distinct endpoint positions per full rotation
- Limbs are 3-4px wide — rotation will show some pixel stepping
- Acceptable for the art style and consistent with existing sprite resolution
- The game upscales to display size (via `UV_RENDER_SCALE = 1.3`), which softens stepping visually
- Walk cycle angles use moderate swings (±12° to ±22°) to minimize artifacts
- The UV-map approach still provides a significant improvement over offset-only animation even at 32x32, because limbs actually rotate around joints rather than just translating

---

## Known Gotcha: Right-Direction Mirror and Asymmetric Equipment

When equipment rendering is eventually added (weapon in right hand, shield on left), the horizontal flip for right-direction will put these on the wrong side. This is fine for the base humanoid (symmetric), but must be handled when equipment arrives — likely by rendering equipment as a separate layer that's not flipped, or by having equipment attach to named joints rather than pixel positions.

---

## Implementation Order

1. `animation-generator-registry.js` — small foundational registry with defensive bootstrap
2. `humanoid-generator.js` — bulk of work; build at 32x32, all 4 direction rigs, walk + idle + attack cycles. **Down/up walk cycle values are initial estimates that will be tuned during this step by visual inspection.**
3. `humanoid-skins.js` — skin definitions + monster generator map
4. `uvmap-renderer.js` — renderer with BodypartRenderer-compatible interface + template cache
5. `index.html` — add script tags
6. `player-animation.js` — wire up UVMapRenderer as Priority 0
7. `enemy-renderer.js` — add generator-based enemy rendering path with per-entity renderer instances

---

## Verification

- Open game in browser
- Console should log "Using UV-map animation generator (humanoid) for player"
- Player walks with FK skeleton animation in all 4 directions (down is most important — verify first)
- Humanoid enemies (Skeletal Warrior, Pyro Cultist, etc.) also animate with FK
- Non-humanoid enemies render unchanged via existing pixel sprites
- Walk in all directions — limbs rotate at joints, body bobs, arms counter-swing
- **Right-direction mirror**: verify it looks correct (symmetric body, no visual artifacts)
- Attack pose: verify the arm swing plays when attacking, then returns to idle/walk
- Enemy visual effects: hit flash, attack flash, stagger flash, death fade all work on generator-based enemies
- Multiple enemies of the same type walk independently (different frames, not synchronized)
- No visual regressions on non-humanoid enemies, effects, or UI
- Sprite size on screen matches the current system (controlled by `UV_RENDER_SCALE`)
