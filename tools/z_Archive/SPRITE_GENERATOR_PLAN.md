# Humanoid Sprite Generator — Implementation Plan

## Goal
Build a Python tool that procedurally generates layered bodypart sprites for humanoid creatures. Given a creature config (proportions, head shape, features, palette), it outputs 18 `.js` files (6 parts × 3 directions) plus a loader — ready to drop into the game.

## Existing Reference Sprites
- **Base human**: 18 files in `assets/sprites/base/{down,up,mirror}/`
- **Skeleton**: 6 files in `assets/sprites/skeleton/up/` (up direction only so far)

## Anatomy Reference (from pixel analysis)

### Anchor Points (must be consistent across ALL generated sprites)
| Connection | Row | Notes |
|-----------|-----|-------|
| Head top | ~3-5 | Varies by head size |
| Head-body overlap | 15-17 | Head bottom touches body top |
| Arm attachment | 16-18 | Shoulder line |
| Body bottom / hip line | 22-24 | Where legs begin |
| Leg bottom | 27-30 | Varies by leg length |
| Horizontal center | Column 16 | All parts centered here |

### Part Size Ranges
| Part | Width (cols) | Height (rows) | Pixel count |
|------|-------------|---------------|-------------|
| head | 10-13 | 12-15 | 50-120 |
| body | 7-9 | 8-9 | 35-80 |
| arms (each) | 4-6 | 6 | 10-40 |
| legs (each) | 3-8 | 6-8 | 15-50 |

### Color Layering Convention
Each part uses 2-5 palette chars: `outline` (darkest) → `dark` → `fill` (dominant) → `highlight` (lightest). Optional `accent` for eyes/teeth/details.

### Direction Differences
- **DOWN** (front): Symmetrical. Arms flank body at cols 8-14 (left) and 19-26 (right). Full face on head.
- **UP** (back): Same proportions/positions as DOWN. No face — back of head. May show different detail (hair, hood back).
- **MIRROR** (side profile): Body ~30% narrower. Arms centered/overlapping body instead of flanking. Head in profile. Legs narrower, stacked vertically.

---

## Output Format (must match exactly)

Each part file:
```javascript
const GOBLIN_DOWN_HEAD = {
    pixels: [
        "................................",  // 32 chars × 32 rows
        // ...
    ],
    palette: {
        'S': '#1a3a1a',
        'M': '#2d6b2d',
        // ...
    }
};

if (typeof window !== 'undefined') window.GOBLIN_DOWN_HEAD = GOBLIN_DOWN_HEAD;
```

Each loader file (`js/rendering/{name}-sprite-loader.js`):
```javascript
const GOBLIN_SPRITES = {
    name: 'goblin', width: 32, height: 32,
    directions: {
        down: { head: GOBLIN_DOWN_HEAD, body: GOBLIN_DOWN_BODY, ... },
        up:   { head: GOBLIN_UP_HEAD, ... },
        left: { head: GOBLIN_MIRROR_HEAD, ... }
    }
};
BodypartSpriteRegistry.register('goblin', GOBLIN_SPRITES);
```

---

## Architecture

### File Structure
```
tools/sprite-generator/
    generate.py              # CLI entry point
    grid.py                  # 32x32 grid with drawing primitives
    shapes.py                # Ellipse, rect, polygon, outline, shading
    generators.py            # Per-part generation (head, body, arms, legs) × 3 directions
    features.py              # Additive micro-patterns (horns, ears, tusks, hoods, etc.)
    palettes.py              # Color palette presets
    configs.py               # Creature config definitions
    writer.py                # JS file + loader output
    validator.py             # Connectivity and format checks
```

### Core: SpriteGrid (grid.py)
32×32 character grid with drawing primitives:
- `fill_ellipse(cx, cy, rx, ry, char)` — filled ellipse
- `fill_rect(x, y, w, h, char)` — filled rectangle
- `draw_line(x0, y0, x1, y1, char)` — Bresenham line
- `apply_outline(char)` — 1px border around all non-transparent pixels
- `apply_shading(highlight_char, shadow_char, light_dir)` — replace edge pixels based on light direction
- `to_rows()` → list of 32 strings, each 32 chars

### Core: Shape Primitives (shapes.py)
Higher-level shape functions that operate on a grid:
- `draw_round_head(grid, cx, cy, width, height, palette)` — elliptical head with face
- `draw_skull_head(grid, cx, cy, width, height, palette)` — skull with jaw cutout + eye sockets
- `draw_angular_head(grid, cx, cy, width, height, palette)` — diamond/pentagonal head
- `draw_hood_head(grid, cx, cy, width, height, palette)` — outer hood + inner face
- `draw_helmet_head(grid, cx, cy, width, height, palette)` — metal helm with visor slit
- `draw_torso(grid, cx, top_row, width, height, palette)` — rectangular body with shading
- `draw_arm(grid, shoulder_col, top_row, length, width, palette, side)` — tapered limb
- `draw_leg(grid, hip_col, top_row, length, width, palette, side)` — limb with foot

### Feature System (features.py)
Small pixel patches (2-6 pixels) applied after base shape generation. Each feature has per-direction variants:

```python
FEATURES = {
    'pointed_ears':  { 'down': {...}, 'up': {...}, 'mirror': {...} },
    'horns':         { 'down': {...}, 'up': {...}, 'mirror': {...} },
    'tusks':         { 'down': {...}, 'mirror': {...} },
    'skull_eyes':    { 'down': {...}, 'mirror': {...} },
    'hood':          { 'down': ..., 'up': ..., 'mirror': ... },
    'helmet_visor':  { 'down': {...}, 'mirror': {...} },
    'claws':         { 'down': {...}, 'mirror': {...} },
    'armor_plates':  { 'down': ..., 'up': ..., 'mirror': ... },
    'robe':          { 'down': ..., 'mirror': ... },
    'glowing_eyes':  { 'down': {...}, 'mirror': {...} },
}
```

Features are positioned relative to named anchors computed from the actual generated shape's bounding box (not absolute coordinates), so they work across different head/body sizes.

### Creature Config (configs.py)

Each creature defined as a dict:
```python
GOBLIN = {
    'name': 'goblin',

    # Proportions
    'head_shape': 'round',        # round | skull | angular | hood | helmet
    'head_width': 10,
    'head_height': 12,
    'body_width': 7,
    'body_height': 7,
    'arm_width': 4,
    'arm_length': 6,
    'leg_width': 4,
    'leg_length': 5,

    # Features (applied after base shapes)
    'features': ['pointed_ears', 'small_fangs'],

    # Palette
    'palette': {
        'outline':   '#0a1a0a',
        'dark':      '#1a3a1a',
        'fill':      '#2d6b2d',
        'highlight': '#4a9a4a',
        'accent':    '#8a6a2a',    # teeth, claws
        'eye':       '#ff2222',
    },

    # Direction-specific feature overrides (optional)
    'down_features': ['pointed_ears', 'beady_eyes', 'wide_mouth'],
    'up_features':   ['pointed_ears'],
    'mirror_features': ['pointed_ear_profile', 'side_eye', 'jaw_profile'],
}
```

### Direction Generation Strategy (generators.py)

**DOWN** is the canonical view. **UP** reuses the same proportions but swaps front→back features. **MIRROR** is generated independently with narrowed proportions.

```
generate_creature(config):
    1. Generate DOWN (6 parts)
       - Place head shape centered at anchor
       - Place body below head at overlap zone
       - Place arms at shoulder row, flanking body
       - Place legs at hip row, below body
       - Apply outline → shading → features

    2. Generate UP (6 parts)
       - Same positions as DOWN
       - Remove face features, add back-of-head features
       - Slightly different palette emphasis (back shading)

    3. Generate MIRROR (6 parts)
       - Narrow body_width by ~30%
       - Center arms on body instead of flanking
       - Profile head (narrower, one-sided features)
       - Narrower legs, stacked vertically
       - Apply outline → shading → profile features

    4. Validate connectivity (all parts overlap at anchor rows)
    5. Write 18 .js files + 1 loader
```

### Validation (validator.py)
Checks after generation:
- Head has pixels in rows 15-17 (overlap with body)
- Body has pixels in rows 15-24 (spans overlap zones)
- Arms start within 2 rows of row 18
- Legs start within 2 rows of row 24
- Pixel counts within expected ranges per part
- No part is empty
- All palette chars used in pixels exist in palette dict

---

## Target Creature Library

| Creature | Head Shape | Build | Key Features | Palette Family |
|----------|-----------|-------|-------------|---------------|
| goblin | round (large) | small | pointed_ears, fangs | green |
| orc | angular | hulking | tusks, heavy_brow | dark green |
| skeleton | skull | thin | skull_eyes, jaw | bone gray |
| zombie | round | medium | missing_jaw, ragged | sickly green/gray |
| cultist | hood | medium | hood, glowing_eyes | dark purple |
| bandit | round | medium | bandana, scar | brown/leather |
| dark_knight | helmet | large | helmet_visor, armor_plates | dark metal |
| demon | angular | large | horns, glowing_eyes, claws | red/crimson |
| ghost | round (tall) | thin | no_legs, transparent_body | pale blue |
| mage | hood | medium | hood, staff_arm, robe | purple/blue |
| archer | round | medium | hood_small, quiver_back | green/brown |
| rat_man | round (small) | small | pointed_ears, whiskers, tail | brown/gray |

---

## CLI Usage

```bash
# Generate a single creature
python tools/sprite-generator/generate.py goblin

# Generate all configured creatures
python tools/sprite-generator/generate.py --all

# Validate without writing
python tools/sprite-generator/generate.py goblin --validate-only

# ASCII preview in terminal
python tools/sprite-generator/generate.py goblin --preview
```

Output for `goblin`:
```
assets/sprites/goblin/
    down/  head.js, body.js, left-arm.js, right-arm.js, left-leg.js, right-leg.js
    up/    head.js, body.js, left-arm.js, right-arm.js, left-leg.js, right-leg.js
    mirror/ head.js, body.js, left-arm.js, right-arm.js, left-leg.js, right-leg.js
js/rendering/goblin-sprite-loader.js
```

---

## Implementation Phases

### Phase 1: Core grid + primitives
- `grid.py` — SpriteGrid class with fill_ellipse, fill_rect, draw_line, apply_outline, apply_shading, to_rows
- `shapes.py` — Higher-level head/body/arm/leg drawing functions
- Unit tests for grid ops

### Phase 2: Config + palette system
- `palettes.py` — Palette presets for each creature family
- `configs.py` — CreatureConfig definitions (start with goblin, orc, skeleton)

### Phase 3: Part generators (DOWN direction first)
- `generators.py` — generate_head_down, generate_body_down, generate_arm_down, generate_leg_down
- Test against base human reference: generated output should resemble the hand-crafted version

### Phase 4: UP + MIRROR direction generators
- UP: same proportions as DOWN, swap features
- MIRROR: independent generator with narrowed proportions + profile shapes

### Phase 5: Feature system
- `features.py` — Feature library (pointed_ears, horns, tusks, skull_eyes, hood, helmet, claws, etc.)
- Feature anchoring relative to shape bounding box

### Phase 6: Output + validation
- `writer.py` — JS file writer + loader writer (exact format match)
- `validator.py` — Connectivity checks, pixel count validation

### Phase 7: CLI + full creature library
- `generate.py` — CLI with --all, --validate-only, --preview flags
- Define all 12 creature configs
- Generate and visually verify each

---

## Verification
1. Run `python tools/sprite-generator/generate.py goblin`
2. Confirm 18 .js files created in `assets/sprites/goblin/{down,up,mirror}/`
3. Confirm `js/rendering/goblin-sprite-loader.js` created
4. Add script tags to `index.html`, load game, verify goblin renders correctly
5. Create a demo HTML (like `skeleton-demo.html`) to preview the generated sprite with walk animation
6. Run `--all` to generate all 12 creatures, visually inspect each
