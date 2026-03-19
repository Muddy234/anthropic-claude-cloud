# Monster Visual Design Guide
## The Shifting Chasm - Pixel Art Specification (32x32)

---

## 1. Core Specifications

### Canvas Size
**ALL monsters use 32x32 pixel canvas** - no exceptions. This provides:
- 4x the detail of 16x16
- Consistent rendering scale across all creatures
- Room for distinctive features, proper shading, and silhouette definition
- Clean scaling at 1x, 2x, and 4x display sizes

### Rendering Scale
- `defaultScale: 1` = 32px on screen (1:1 pixel mapping)
- `defaultScale: 2` = 64px on screen (retro chunky look)

### Size Hierarchy (Render-Time Scaling)

**All sprites are DESIGNED at full 32x32 resolution, filling the canvas.**

Size differentiation happens at RENDER TIME, not design time:

```
DESIGN RULE:
- Every monster fills the 32x32 canvas (26-30px active area, 1-3px margin)
- Design at full detail regardless of creature's narrative size
- Small creatures get the same pixel density and detail as large ones

RENDER-TIME SCALING:
- LARGE creatures (Golems, Bosses): Render at 1.0x-1.25x scale
- MEDIUM creatures (Warriors, Beasts): Render at 0.85x-1.0x scale
- SMALL creatures (Imps, Wisps): Render at 0.6x-0.75x scale
- TINY creatures (Bats, Sprites): Render at 0.4x-0.5x scale
```

**Benefits of this approach:**
- Maximum detail for every creature regardless of display size
- Consistent art pipeline (all sprites same dimensions)
- Size hierarchy controlled by game logic, not art assets
- Easy to adjust creature sizes for balance without redrawing

**Visual hierarchy** - a Bone Golem feels massive compared to a Shadow Imp because the renderer scales them differently, not because one has fewer pixels.

### Color Budget Per Sprite

**Target: 10-16 total colors per sprite**

```
Typical breakdown:
- Body ramp: 4-6 colors (highlight → core shadow)
- Accent ramp: 2-3 colors (secondary material, element glow)
- Eye/glow colors: 1-2 colors (bright accents)
- Outline colors: 1-2 colors (black + sel-out color if used)
- Effect colors: 1-2 colors (particles, magic)

Total: 10-16 colors

AVOID:
- Under 8 colors: Sprite will feel flat, lacking depth
- Over 18 colors: Palette bloat, muddy appearance, similar colors competing
```

When combining element palettes, don't use the full 6-color ramp of each - select the 3-4 most essential values from each ramp.

---

## 2. Fundamental Design Principles

### 2.1 Outline Strategy (Selective Outlining)

**Use the appropriate outline approach based on creature type:**

#### Physical Creatures (Black Outline)
**Golems, Beasts, Humanoids, Undead with solid forms**

```
- 1px pure black (#000000) outline around entire silhouette
- Outline follows OUTER edge only
- Ensures readability on any background
- Creates solid, grounded visual presence
```

#### Ethereal/Elemental Creatures (Sel-Out / Colored Outline)
**Spirits, Wisps, Phantoms, Elementals, anything "glowing" or "fading"**

```
- Use "selective outlining" (sel-out) instead of pure black
- Outline uses a VERY DARK version of the adjacent body color
- Allows edges to feel soft, glowing, or dissipating
- No outline at all on fading/wispy edges
```

**Sel-Out Color Selection:**
```
Fire creature edge:  Body #FF6B35 → Outline #661111 (dark red-brown, not black)
Ice creature edge:   Body #88CCFF → Outline #223355 (dark blue, not black)
Shadow creature:     Body #553388 → Outline #110022 (near-black purple)
Ghost/Spirit edge:   NO OUTLINE on fading sections - pixels fade to transparency
```

**Example - Phantom with Sel-Out:**
```
Upper body: Dark blue sel-out outline (#223355)
Mid body: Lighter sel-out, partial outline
Lower body: NO outline - pixels fade directly to transparent
Wispy edges: Individual pixels with no outline, creating ethereal scatter
```

#### Internal Line Work (Clarification)

**BAD: Internal black outlines**
```
Creates "sticker" or "stained-glass" look
Every shape has black border = flat, cartoony, loses depth
Example of WRONG approach:
  X X X X X X
  X O X X O X   ← Black lines separating every internal shape
  X X X X X X
```

**GOOD: Internal color contrast edges**
```
Use adjacent dark and light palette colors to define shapes
No black lines inside the sprite - just value contrast
Example of CORRECT approach:
  H L L O O D
  L O O O D S   ← Shapes defined by color transitions, not outlines
  O O D D S S
```

**For complex internal details** (Obsidian Golem cracks, Skeleton ribs, Guardian runes):
- Use your darkest palette color (core shadow) adjacent to a lighter value
- Glowing details: bright accent color adjacent to mid-dark value
- Never use black lines internally unless it's a true void/gap

### 2.2 Consistent Light Source

**All sprites use TOP-LEFT lighting (45° from upper-left corner)**

```
Light Direction:
    ↘ Light comes from here
   ╔═══════════╗
   ║ H H       ║   H = Highlights (top-left areas)
   ║ H M M     ║   M = Midtones (center)
   ║   M M S   ║   S = Shadows (bottom-right areas)
   ║     S S S ║
   ╚═══════════╝
```

**Lighting Application:**
- **Highlights**: Top surfaces, left-facing surfaces
- **Midtones**: Flat-facing surfaces, transitions
- **Shadows**: Bottom surfaces, right-facing surfaces, undersides
- **Core shadows**: Deepest recesses, under overhangs
- **Ambient occlusion**: Where surfaces meet (joints, creases)

### 2.3 Hue Shifting (Critical for Natural Shading)

**NEVER shade by simply darkening the same hue. Shift the hue as you change value.**

```
WARM COLORS (Red, Orange, Yellow):
├── Highlights: Shift toward YELLOW/WHITE
├── Midtones: Base color
└── Shadows: Shift toward RED → PURPLE → BLUE

COOL COLORS (Blue, Cyan, Green):
├── Highlights: Shift toward CYAN/WHITE
├── Midtones: Base color
└── Shadows: Shift toward PURPLE → DEEP BLUE

NEUTRAL COLORS (Gray, Brown):
├── Highlights: Shift toward cool (blue-gray)
├── Midtones: Base color
└── Shadows: Shift toward warm (purple-brown) OR cool (blue-black)
```

**Hue Shifting Examples:**
```
Orange Fire Creature:
  Highlight: #FFFFCC (Yellow-white)
  Light:     #FF9944 (Light orange)
  Mid:       #FF6B35 (Orange - base)
  Shadow:    #CC3322 (Red-orange)
  Deep:      #661122 (Purple-red)
  Core:      #330011 (Near-black with red)

Blue Ice Creature:
  Highlight: #FFFFFF (Pure white)
  Light:     #CCFFFF (Cyan-white)
  Mid:       #88CCFF (Ice blue - base)
  Shadow:    #4466AA (Purple-blue)
  Deep:      #223366 (Deep blue-purple)
  Core:      #111133 (Near-black with blue)
```

### 2.4 Saturation Strategy

**Saturation peaks at the midtone and decreases toward both extremes.**

```
Value Ramp with Saturation:
  HIGHLIGHT ──── Low saturation (washed out, approaching white)
      │
   LIGHT ─────── Medium-high saturation
      │
    MID ──────── PEAK SATURATION (most vibrant)
      │
   SHADOW ────── Medium saturation (starting to gray out)
      │
    DEEP ─────── Low saturation (muted, grayed)
      │
    CORE ─────── Very low saturation (near-neutral dark)
```

**Practical Example (Fire Palette):**
```
#FFFFCC - Highlight: Saturation ~15% (pale, washed)
#FFEE88 - Light:     Saturation ~50% (warm but not vivid)
#FF6B35 - Mid:       Saturation ~85% (PEAK - most orange)
#CC3322 - Shadow:    Saturation ~70% (still colorful)
#661122 - Deep:      Saturation ~50% (muted red-purple)
#330011 - Core:      Saturation ~30% (nearly neutral dark)
```

**Why this matters:**
- Over-saturated highlights look neon and artificial
- Over-saturated shadows look muddy and fight for attention
- Proper saturation curve creates natural, dimensional forms

### 2.5 Avoiding Isolated Pixels (Cluster Rule)

**NO single isolated pixels** - every colored pixel should touch at least one other pixel of similar value.

```
BAD (Isolated pixels):          GOOD (Clustered):
. . . . . . . .                 . . . . . . . .
. . X . . X . .                 . . X X . X X .
. . . . . . . .                 . . X . . . X .
. X . . . . X .                 . X X . . X X .
. . . . . . . .                 . . . . . . . .
```

**Exceptions:**
- Eyes (single bright pixels for sharp focus)
- Intentional sparkle/particle effects at sprite edges
- Sel-out outline fragments on ethereal creatures

### 2.6 Sub-Pixel Techniques

**When physical detail is impossible, use color blending to imply sub-pixel precision.**

At 32x32, many details can't be literally rendered. Sub-pixel technique creates the *impression* of detail smaller than one pixel through strategic color placement.

**Off-Center Eye Technique:**
```
To make an eye appear slightly left-of-center within its pixel:
  L E    (Light pixel left of eye makes eye feel right-shifted)

To make an eye appear slightly right-of-center:
  E L    (Light pixel right of eye makes eye feel left-shifted)

The eye hasn't moved - the surrounding context shifts perception.
```

**Scale/Texture Implication:**
```
Actual scales at 32x32 are impossible, but implied scales work:

BAD (literal attempt):     GOOD (sub-pixel implied):
S S S S S S                H L L M M S
S S S S S S                L M M S S D
S S S S S S                M S S D D S

Left: Every scale = 1px    Right: Value dithering implies
Reads as noise             curved, overlapping scales
```

**Sub-Pixel Shading for Curves:**
```
Hard edge (no sub-pixel):   Soft edge (sub-pixel blend):
. . X X X X . .             . . x X X x . .
. X X X X X X .             . x X X X X x .
X X X X X X X X             x X X X X X X x

x = intermediate color (blend between background and body)
Creates perceived curve smoother than actual pixels
```

**When to Use Sub-Pixel:**
- Eyes and small facial details
- Implying textures (scales, fur grain, fabric weave)
- Softening curves without full anti-aliasing
- Creating focal point "nudges"

### 2.7 Anti-Aliasing (Conservative Application)

**Apply manual AA sparingly and test at all target scales.**

Since sprites render at integer multiples (1x, 2x, 4x), aggressive AA creates problems:
- Looks great at 1x, muddy at 2x and 4x
- AA pixels become visible "halo" artifacts when scaled
- Contradicts chunky retro aesthetic

**When to use AA:**
```
✓ Large curved silhouettes where jaggies are very obvious
✓ High-contrast color boundaries that create visual vibration
✓ Diagonal lines longer than 4-5 pixels
```

**When to SKIP AA:**
```
✗ Small details (let them be crisp)
✗ Black outlines (always crisp - AA defeats their purpose)
✗ Angular/crystalline creatures (jaggies are intentional)
✗ Most internal color transitions (rely on hue shifting instead)
```

**AA Color Selection:**
```
For AA pixel between Color A and Color B:
- AA color should be ~50% blend of A and B
- Or use the lighter color at reduced opacity equivalent
- Never use a third unrelated color for AA
```

**Testing requirement:** Before finalizing any sprite with AA, preview at 1x, 2x, and 4x scale. If AA creates muddiness at larger scales, remove it.

---

## 3. Color Palette System

### 3.1 Palette Structure (6-Color Ramps with Saturation Curve)

Each element/material uses a **6-color value ramp** with proper hue shifting AND saturation management:

```
1. HIGHLIGHT - Brightest, hue toward light, LOW saturation
2. LIGHT - Above midtone, medium-high saturation
3. MID - Base color, PEAK saturation (most coverage)
4. SHADOW - Below midtone, hue toward shadow, medium saturation
5. DEEP SHADOW - Dark, significant hue shift, LOW saturation
6. CORE SHADOW - Near-black, maximum hue shift, VERY LOW saturation
```

### 3.2 Element Color Palettes (Complete 6-Color Ramps)

#### Fire Element
```
Highlight:   #FFFFCC (Pale yellow-white) - Sat: 15%
Light:       #FFDD77 (Warm yellow)       - Sat: 55%
Mid:         #FF6B35 (Vibrant orange)    - Sat: 85% ← PEAK
Shadow:      #CC3322 (Red-orange)        - Sat: 70%
Deep:        #661122 (Muted purple-red)  - Sat: 50%
Core:        #331111 (Near-black red)    - Sat: 25%

Eye Glow:    #FFFF44 (Bright yellow)
Magic FX:    #FF4400 (Pure flame)
Sel-Out:     #441100 (Dark brown-red outline for ethereal fire)
```
**Hue Shift**: Yellow → Orange → Red → Purple in shadows

#### Ice Element
```
Highlight:   #FFFFFF (Pure white)        - Sat: 0%
Light:       #DDEEFF (Ice white)         - Sat: 15%
Mid:         #88CCFF (Ice blue)          - Sat: 50% ← PEAK
Shadow:      #5588CC (Steel blue)        - Sat: 45%
Deep:        #334477 (Navy blue)         - Sat: 40%
Core:        #112244 (Near-black blue)   - Sat: 35%

Eye Glow:    #AAEEFF (Cyan)
Crystal FX:  #CCFFFF (Frost)
Sel-Out:     #223355 (Dark blue outline for ethereal ice)
```
**Hue Shift**: White → Cyan → Blue → Purple in shadows

#### Earth/Stone Element
```
Highlight:   #D4C8B0 (Sandy beige)       - Sat: 20%
Light:       #B8A888 (Tan)               - Sat: 30%
Mid:         #8B7355 (Earthy brown)      - Sat: 40% ← PEAK
Shadow:      #5D4632 (Dark brown)        - Sat: 35%
Deep:        #3A2818 (Umber)             - Sat: 30%
Core:        #1A1208 (Near-black brown)  - Sat: 20%

Moss Accent: #557744 (Muted green)
Crack FX:    #222211 (Dark warm gray)
```
**Hue Shift**: Yellow-tan → Brown → Purple-brown in shadows

#### Water Element
```
Highlight:   #FFFFFF (Foam white)        - Sat: 0%
Light:       #AAEEFF (Light aqua)        - Sat: 35%
Mid:         #4488BB (Ocean blue)        - Sat: 55% ← PEAK
Shadow:      #336688 (Teal shadow)       - Sat: 45%
Deep:        #224455 (Deep teal)         - Sat: 35%
Core:        #112233 (Near-black teal)   - Sat: 25%

Bubble FX:   #CCFFFF (Light cyan)
Depth FX:    #223355 (Navy)
Sel-Out:     #112233 (Dark teal outline)
```
**Hue Shift**: White → Cyan → Blue → Teal in shadows

#### Shadow/Dark Element
```
Highlight:   #AA88CC (Lavender)          - Sat: 30%
Light:       #7755AA (Light purple)      - Sat: 45%
Mid:         #553388 (Deep purple)       - Sat: 55% ← PEAK
Shadow:      #332255 (Dark violet)       - Sat: 45%
Deep:        #221144 (Near-black violet) - Sat: 35%
Core:        #110022 (Pure shadow)       - Sat: 20%

Eye Glow:    #FF44FF (Magenta)
Void FX:     #8800AA (Bright purple)
Sel-Out:     #110022 (Near-black purple - barely visible)
```
**Hue Shift**: Pink-lavender → Purple → Blue-black in shadows

#### Undead/Death Element
```
Highlight:   #EEEECC (Pale bone)         - Sat: 15%
Light:       #DDDDAA (Light bone)        - Sat: 20%
Mid:         #CCCCAA (Bone white)        - Sat: 20% ← PEAK (muted palette)
Shadow:      #999977 (Aged bone)         - Sat: 20%
Deep:        #555544 (Dark bone)         - Sat: 15%
Core:        #333322 (Shadow bone)       - Sat: 15%

Decay Green: #88AA77 (Muted green)
Soul Glow:   #AAFFAA (Ghostly green)
Eye Glow:    #FFFF66 (Soul yellow)
```
**Hue Shift**: Yellow-cream → Tan → Green-gray in shadows
**Note**: Undead palette is intentionally desaturated throughout

#### Nature Element
```
Highlight:   #CCFFAA (Bright lime)       - Sat: 35%
Light:       #99DD77 (Light leaf)        - Sat: 50%
Mid:         #55AA55 (Forest green)      - Sat: 60% ← PEAK
Shadow:      #337744 (Dark green)        - Sat: 50%
Deep:        #224433 (Deep forest)       - Sat: 40%
Core:        #112211 (Near-black green)  - Sat: 25%

Bark Brown:  #775533 (Wood)
Flower FX:   #FFAA33 (Amber)
```
**Hue Shift**: Yellow-green → Green → Teal-green in shadows

#### Holy/Divine Element
```
Highlight:   #FFFFEE (Divine white)      - Sat: 5%
Light:       #FFEEAA (Warm gold)         - Sat: 35%
Mid:         #FFCC55 (Golden)            - Sat: 70% ← PEAK
Shadow:      #CC9933 (Dark gold)         - Sat: 60%
Deep:        #886622 (Bronze)            - Sat: 50%
Core:        #443311 (Shadow bronze)     - Sat: 35%

Radiance:    #FFFFFF (Pure white)
Holy FX:     #FFFF88 (Bright gold)
```
**Hue Shift**: White → Yellow → Orange → Brown in shadows

#### Physical/Neutral (Metal & Leather)
```
Metal:
  Highlight: #DDDDDD (Bright silver)     - Sat: 0%
  Light:     #AAAAAA (Silver)            - Sat: 0%
  Mid:       #777777 (Steel gray)        - Sat: 0%
  Shadow:    #555555 (Dark steel)        - Sat: 0%
  Deep:      #333333 (Shadow steel)      - Sat: 0%
  Core:      #111111 (Near-black)        - Sat: 0%

Leather:
  Highlight: #BB9966 (Light leather)     - Sat: 35%
  Light:     #997755 (Tan leather)       - Sat: 35%
  Mid:       #775544 (Brown leather)     - Sat: 35%
  Shadow:    #553322 (Dark leather)      - Sat: 35%
  Deep:      #332211 (Shadow leather)    - Sat: 30%
  Core:      #111100 (Near-black brown)  - Sat: 20%
```

### 3.3 Monster Class Palettes

#### Slimes
```
Base: Translucent body with visible core
- Body uses element palette (fire=orange, ice=blue, etc.)
- Highlight band near top (light refraction)
- Darker base with drip shapes
- Inner glow spot for "nucleus"
- Semi-transparent overlay effect on edges
- OUTLINE: Sel-out colored outline OR partial black
```

#### Golems
```
Base: Heavy, solid construction
- Primary: Stone/metal base palette
- Cracks/Veins: Element color (glowing) - USE COLOR CONTRAST, NOT BLACK LINES
- Joints: Darker than body (ambient occlusion)
- Core: Bright element glow visible through gaps
- Surface: Rough texture with highlight facets
- OUTLINE: Full black outline (solid physical form)
```

#### Spirits/Wisps
```
Base: Ethereal, glowing forms
- Core: Brightest white/yellow
- Inner: Light element color
- Outer: Mid element color fading to transparency
- Edge: Wispy, NO HARD OUTLINE - pixels scatter to transparent
- Trail: Fading particles
- OUTLINE: Sel-out or NO outline on fading edges
```

#### Humanoids
```
Base: Recognizable anatomy
- Skin/Body: Appropriate palette (undead=bone, demon=red, etc.)
- Armor/Cloth: Secondary palette
- Weapons: Metal palette with element glow
- Eyes: Bright accent color
- Details: Belt, boots, accessories
- OUTLINE: Black outline (solid physical form)
```

#### Beasts
```
Base: Animal anatomy
- Fur/Scales: Textured with value variation (sub-pixel techniques)
- Underbelly: Lighter than back
- Eyes: Bright, predatory
- Claws/Teeth: Bone or dark accent
- Markings: Implied through sub-pixel value shifts
- OUTLINE: Black outline (solid physical form)
```

#### Undead
```
Base: Decayed organic matter
- Bone: Undead palette
- Flesh: Green-gray decay
- Cloth: Tattered, desaturated
- Glow: Soul/magic color in eyes/chest
- Gaps: Dark core shadow color (not black outlines)
- OUTLINE: Black outline for solid forms, sel-out for ghostly variants
```

---

## 4. Sprite Construction Process

### Step 1: Silhouette (Shape First)
```
1. Block out the overall shape in a single mid-value color
2. Ensure the silhouette is READABLE and DISTINCTIVE
3. Check: Can you identify the creature type from silhouette alone?
4. Avoid perfect symmetry - slight asymmetry adds life
5. Fill the canvas: 26-30px active area with 1-3px margin for outline/effects
```

### Step 2: Outline Application
```
1. Determine creature type: Physical (black) or Ethereal (sel-out/none)
2. Apply appropriate outline strategy
3. For sel-out: Use darkest value from body palette, not black
4. For ethereal edges: Allow pixels to fade to transparent without outline
5. Ensure outline is continuous where it exists (no accidental gaps)
```

### Step 3: Value Blocking
```
1. Apply light source (top-left)
2. Block in 3 values: highlight, mid, shadow
3. Largest areas = midtone
4. Top-left surfaces = highlight
5. Bottom-right surfaces = shadow
```

### Step 4: Color Application
```
1. Replace values with element palette colors
2. Apply hue shifting (shadows shift hue, not just value)
3. Apply saturation curve (peak at mid, decrease toward extremes)
4. Add deep shadows in recesses
5. Add core shadows at joints/underneath
6. Define internal shapes with COLOR CONTRAST, not black lines
```

### Step 5: Detail Pass
```
1. Add eyes (bright accent colors, can be isolated single pixels)
2. Add essential features first (see monster spec priorities)
3. Use sub-pixel techniques for textures and small details
4. Check for isolated pixels - cluster them (except intentional accents)
5. Add secondary features only if pixel budget allows
```

### Step 6: Polish Pass
```
1. Apply CONSERVATIVE anti-aliasing to major curves only
2. Test AA at 1x, 2x, 4x scales - remove if muddy
3. Add element-specific effects (glow, particles)
4. Final silhouette check - still readable?
5. Verify color count is within 10-16 budget
```

### Step 7: Validation
```
□ Canvas is 32x32
□ Sprite fills full 32x32 canvas (26-30px active, margin for effects)
□ Outline strategy matches creature type (black vs sel-out vs none)
□ Light source is consistent (top-left)
□ Hue shifting is applied to shadows
□ Saturation peaks at midtone, decreases toward extremes
□ No isolated single pixels (except eyes/sparkles)
□ Sub-pixel techniques used for implied detail
□ AA is conservative and tested at multiple scales
□ Internal shapes defined by color contrast, not black lines
□ Color count is 10-16 total
□ Readable on dark AND light backgrounds
□ Distinctive from other monsters
```

---

## 5. Monster Specifications (32x32)

### Specification Format

Each monster lists features in priority order:
- **ESSENTIAL (1-3 features)**: Must be present for creature identity. If these aren't readable, the sprite fails.
- **SECONDARY**: Include if pixel budget allows after essentials are solid.
- **TERTIARY**: Nice-to-have details, often achieved through sub-pixel implication rather than literal rendering.

---

### Slime Class

#### Magma Slime
```
Size: 32x32 | Render class: MEDIUM
Shape: Blob with dripping base, round top
Palette: Fire element (10-12 colors total)
Outline: Sel-out (dark red-brown) - allows glow bleed

ESSENTIAL:
1. Orange-to-red gradient body (top-light, bottom-dark with hue shift)
2. Two simple yellow dot eyes
3. Lava drip shapes at base (2-3 drips using dark red)

SECONDARY:
- Yellow highlight band near top (light refraction)
- Bubbling surface (2-3 bubble spots as color variations)

TERTIARY:
- Embedded rocks (sub-pixel dark spots, not literal rocks)

Animation: Gentle bob, bubble pop, melt death
```

#### Frost Slime
```
Size: 32x32 | Render class: MEDIUM
Shape: Angular blob with crystalline protrusions
Palette: Ice element (10-12 colors total)
Outline: Sel-out (dark blue) on body, NO outline on ice spikes

ESSENTIAL:
1. Blue-white body with proper ice palette gradient
2. Two cyan/white dot eyes
3. Crystalline spikes on top (2-3 angular protrusions)

SECONDARY:
- Internal frost pattern (sub-pixel value variation)
- Frozen ground effect at base

TERTIARY:
- Cold breath particles (edge pixels fading out)

Animation: Shiver idle, freeze pulse attack
```

#### Toxic Slime
```
Size: 32x32 | Render class: MEDIUM
Shape: Lumpy blob with bubbling surface
Palette: Yellow-green shifted nature palette (10-12 colors)
Outline: Sel-out (dark olive)

ESSENTIAL:
1. Sickly yellow-green body gradient
2. Glowing toxic eyes (bright yellow-green)
3. Acid drip shapes at base

SECONDARY:
- Toxic bubbles rising (2-3 as lighter spots)
- Skull/bones visible inside (sub-pixel dark shapes)

TERTIARY:
- Noxious vapor particles at edges

Animation: Gurgle idle, spit attack, dissolve death
```

---

### Golem Class

#### Obsidian Golem
```
Size: 32x32 | Render class: LARGE
Shape: Massive humanoid, small head, huge fists
Palette: Dark gray/black + fire veins (12-14 colors)
Outline: Full black outline (solid physical form)

ESSENTIAL:
1. Massive blocky silhouette filling most of canvas
2. Glowing orange crack lines (3-4 using COLOR CONTRAST: bright orange adjacent to dark gray)
3. Tiny head with ember eyes

SECONDARY:
- Molten core visible in chest (orange glow spot)
- Jagged edges on silhouette

TERTIARY:
- Volcanic rock texture (sub-pixel value noise)
- Oversized fist emphasis

Animation: Heavy sway, arm raise, crushing slam
```

#### Stone Guardian
```
Size: 32x32 | Render class: LARGE
Shape: Stocky humanoid, ancient statue
Palette: Earth element (10-12 colors)
Outline: Full black outline

ESSENTIAL:
1. Weathered stone body with earth palette
2. Glowing eyes (yellow or cyan when active)
3. Ancient rune carving (1-2 glowing marks using COLOR CONTRAST)

SECONDARY:
- Cracks/weathering (dark value accents, not black lines)
- Moss/lichen patches (green accent spots)

TERTIARY:
- Roman/Greek statue influence in pose
- Ground shadow/debris

Animation: Dormant pose, awakening, stomp attack
```

#### Ice Golem
```
Size: 32x32 | Render class: LARGE
Shape: Angular crystalline humanoid
Palette: Ice element (10-12 colors)
Outline: Black outline on body, sel-out on ice details

ESSENTIAL:
1. Faceted ice body (geometric angular shapes)
2. Internal blue glow (core visible as bright spot)
3. Bright cyan/white eyes

SECONDARY:
- Icicle shoulder spikes (angular protrusions)
- Sharp angular limbs

TERTIARY:
- Frost aura particles (edge pixels)
- Frozen ground effect

Animation: Grinding walk, ice slam, shatter death
```

#### Crystal Golem
```
Size: 32x32 | Render class: LARGE
Shape: Prismatic humanoid form
Palette: Purple/pink crystal + white (10-12 colors)
Outline: Sel-out (dark purple) - allows light refraction feel

ESSENTIAL:
1. Multifaceted crystal body (geometric, angular)
2. Bright white core glow
3. Light refraction highlights (multiple bright spots)

SECONDARY:
- Floating crystal shards (2-3 small shapes near body)
- Color variation across facets

TERTIARY:
- Prismatic color shifts (sub-pixel hue variation)

Animation: Float-walk, crystal barrage, explode death
```

---

### Spirit Class

**Note: All spirits use sel-out or no outline to maintain ethereal quality**

#### Cinder Wisp
```
Size: 32x32 | Render class: SMALL | Note: Dense core with flame/particle surround
Shape: Flame ball with trailing wisps
Palette: Fire element (8-10 colors)
Outline: NO BLACK OUTLINE - edges fade to transparent

ESSENTIAL:
1. Bright yellow-white core (3-5px concentrated)
2. Orange-red flame outer (gradient outward)
3. Two bright white eye dots in core

SECONDARY:
- Flickering flame edge pixels (scattered, no outline)
- Spark particle trail (isolated bright pixels OK here)

TERTIARY:
- Color temperature variation in flames

Animation: Constant flicker, flare attack, puff out
```

#### Frost Spirit
```
Size: 32x32 | Render class: SMALL | Note: Swirling vortex form
Shape: Swirling wind/snow vortex
Palette: Ice element (8-10 colors)
Outline: NO OUTLINE - wispy edges

ESSENTIAL:
1. Central bright form (concentrated light area)
2. Swirling shape (spiral or vortex silhouette)
3. Bright white eyes

SECONDARY:
- Swirling snow particles (scattered light pixels)
- Pale blue wispy body edges

TERTIARY:
- Snowflake accent shapes

Animation: Spin idle, blizzard attack, disperse
```

#### Shadow Wisp
```
Size: 32x32 | Render class: SMALL
Shape: Amorphous dark cloud with eyes
Palette: Shadow element (8-10 colors)
Outline: Sel-out (near-black purple) only on densest areas, none on wisps

ESSENTIAL:
1. Dark purple-black body mass
2. Bright magenta eyes (2-4 eyes for alien feel)
3. Wispy, smoke-like edges (pixels scatter to transparent)

SECONDARY:
- Semi-transparent feel (lighter values at edges)
- Void particles orbiting (dark accent dots)

TERTIARY:
- Internal darker core

Animation: Drift float, void bolt, fade away
```

#### Soul Fragment (Phantom)
```
Size: 32x32 | Render class: MEDIUM | Note: Upper body solid, lower body fades
Shape: Ghostly humanoid upper body, NO lower body
Palette: Pale blue-white ethereal (8-10 colors)
Outline: Sel-out (pale blue) on upper body, NO OUTLINE below chest

ESSENTIAL:
1. Recognizable humanoid torso/arms/head shape
2. Hollow eye sockets with pale glow
3. Body FADES to transparent below waist (no outline, pixels scatter)

SECONDARY:
- Tattered ethereal robes (suggested with value variation)
- Transparent/see-through effect on edges

TERTIARY:
- Soul particles rising (scattered light pixels)
- Sorrowful expression

Animation: Float bob, soul drain reach, dissipate
```

#### Blizzard Spirit
```
Size: 32x32 | Render class: SMALL | Note: Swift swirling wind form
Shape: Swirling wind vortex with humanoid suggestion
Palette: Ice element (8-10 colors)
Outline: NO OUTLINE - wispy, wind-like edges

ESSENTIAL:
1. Swirling vortex body shape (spiral or cyclone silhouette)
2. Bright white/cyan eyes (2 glowing points)
3. Wind-scattered edge pixels (no hard boundary)

SECONDARY:
- Snow/ice particle scatter around form
- Internal blue-white gradient (brighter core)

TERTIARY:
- Implied face in the wind patterns
- Frost trail particles

Animation: Rapid spin idle, frost wind blast, disperse into snow
```

#### Mushroom Sprite
```
Size: 32x32 | Render class: SMALL | Note: Small sentient fungus
Shape: Mushroom cap with tiny body/legs underneath
Palette: Nature element + bioluminescent glow (8-10 colors)
Outline: Sel-out (dark green-brown) - soft organic feel

ESSENTIAL:
1. Distinctive mushroom cap silhouette (dome top)
2. Small glowing eyes under cap rim
3. Tiny stubby legs/body beneath cap

SECONDARY:
- Spotted cap pattern (lighter spots on cap)
- Spore particles floating upward (scattered light pixels)

TERTIARY:
- Bioluminescent glow effect on underside
- Varied cap coloration (red, purple, or pale variants)

Animation: Wobble walk, spore cloud puff, shrivel death
```

---

### Beast Class

#### Flame Salamander
```
Size: 32x32 | Render class: MEDIUM-LARGE
Shape: Four-legged lizard, long tail
Palette: Fire element (12-14 colors)
Outline: Full black outline

ESSENTIAL:
1. Four-legged lizard body silhouette (clearly animal, not humanoid)
2. Long tail (distinctive shape element)
3. Alert predator eyes (yellow/orange)

SECONDARY:
- Red-orange scaled body with yellow underbelly
- Glowing scale pattern on ridgeline (sub-pixel implied with value shifts)

TERTIARY:
- Flame tip on tail
- Four sturdy leg detail

Animation: Scurry walk, tail whip, fire breath
```

#### Cave Spider
```
Size: 32x32 | Render class: MEDIUM-LARGE
Shape: Large spider, eight legs radiating
Palette: Earth + shadow brown-purple (12-14 colors)
Outline: Full black outline

ESSENTIAL:
1. Round body with eight visible legs
2. Multiple eyes clustered (6-8, small bright dots)
3. Visible fangs/mandibles

SECONDARY:
- Fuzzy body texture (sub-pixel value noise)
- Hairy leg texture (value variation along legs)

TERTIARY:
- Web texture hints
- Threat posture

Animation: Skitter, pounce, web spray
```

#### Crystal Spider
```
Size: 32x32 | Render class: MEDIUM
Shape: Angular spider with crystalline legs
Palette: Ice/crystal palette (10-12 colors)
Outline: Black outline on body, sel-out on crystalline legs

ESSENTIAL:
1. Spider silhouette with angular/crystalline legs
2. Multiple faceted eyes (gem-like, clustered)
3. Translucent body effect (lighter center)

SECONDARY:
- Sharp angular leg segments
- Light refraction highlights

TERTIARY:
- Gem-like coloration shifts
- Crystal formation details

Animation: Precise skitter, shard spray
```

#### Shadow Stalker
```
Size: 32x32 | Render class: MEDIUM-LARGE
Shape: Quadruped predator (wolf/panther)
Palette: Shadow element (10-12 colors)
Outline: Sel-out (dark purple) - allows wispy edges

ESSENTIAL:
1. Sleek quadruped predator silhouette
2. Bright magenta eyes (predatory, intense)
3. Wispy/smoky body edges (pixels fade at boundaries)

SECONDARY:
- Sharp claws emphasized (bright accents at feet)
- Smoke trail effect at back

TERTIARY:
- Predatory stance/pose
- Dark flowing "mane"

Animation: Prowl, pounce, fade death
```

#### Cave Bat
```
Size: 32x32 | Render class: TINY | Note: Common pest, rendered small
Shape: Bat with spread wings
Palette: Earth/brown tones (8-10 colors)
Outline: Full black outline

ESSENTIAL:
1. Distinctive bat wing silhouette (spread membranous wings)
2. Small beady eyes (2 bright dots)
3. Visible ears (pointed ear shapes on head)

SECONDARY:
- Leathery wing membrane texture (value variation)
- Small fanged mouth
- Fur texture on body (sub-pixel implied)

TERTIARY:
- Clawed wing tips
- Hanging idle pose variant

Animation: Rapid wing flap, swooping bite, crumple fall
```

#### Flame Bat
```
Size: 32x32 | Render class: TINY | Note: Fire-touched variant, rendered small
Shape: Bat with flaming wing edges
Palette: Fire element + dark body (10-12 colors)
Outline: Black outline on body, sel-out (dark red) on flame edges

ESSENTIAL:
1. Bat wing silhouette with fire at wing tips/edges
2. Glowing orange/yellow eyes
3. Flame trail effect (scattered fire pixels at wings)

SECONDARY:
- Dark body contrasting with bright flame accents
- Ember particles around form

TERTIARY:
- Smoke wisps from body
- Aggressive diving pose

Animation: Frantic wing flap, singe bite lunge, burn out death
```

#### Salamander
```
Size: 32x32 | Render class: SMALL | Note: Small reptile, rendered small
Shape: Four-legged lizard, low to ground
Palette: Nature element with red-orange scales (10-12 colors)
Outline: Full black outline

ESSENTIAL:
1. Low-slung lizard body silhouette (four legs visible)
2. Long tail (extends behind body)
3. Small alert eyes

SECONDARY:
- Glowing red-orange scale pattern on back
- Lighter underbelly
- Visible toes/claws

TERTIARY:
- Forked tongue (sub-pixel detail)
- Spotted pattern variation

Animation: Scurry walk, tail whip, curl up death
```

#### Deep Crawler
```
Size: 32x32 | Render class: MEDIUM-LARGE | Note: Armored crustacean
Shape: Crab/lobster hybrid with large pincers
Palette: Water element + shell browns (12-14 colors)
Outline: Full black outline

ESSENTIAL:
1. Large pincer claws (dominant silhouette feature)
2. Armored shell body (segmented carapace)
3. Multiple legs (6-8 visible, radiating from body)

SECONDARY:
- Eye stalks with glowing eyes
- Barnacle/coral growths on shell (sub-pixel texture)
- Wet sheen highlights on shell

TERTIARY:
- Antenna/feelers
- Bubbles rising near form

Animation: Sideways scuttle, pincer snap attack, shell crack death
```

#### Tide Serpent
```
Size: 32x32 | Render class: MEDIUM-LARGE | Note: Aggressive sea snake
Shape: Coiled serpent with fins
Palette: Water element + teal scales (12-14 colors)
Outline: Full black outline

ESSENTIAL:
1. Serpentine coiled body (S-curve or spiral)
2. Finned back ridge (dorsal fin visible)
3. Predatory eyes with vertical pupils

SECONDARY:
- Scaled body texture (sub-pixel value variation)
- Lighter underbelly gradient
- Fanged open mouth

TERTIARY:
- Water droplets around form
- Fin webbing detail

Animation: Slither coil, striking lunge, sink beneath death
```

---

### Humanoid Class

#### Skeletal Warrior
```
Size: 32x32 | Render class: MEDIUM-LARGE
Shape: Humanoid skeleton with gear
Palette: Undead element + metal (12-14 colors)
Outline: Full black outline

ESSENTIAL:
1. Skeleton silhouette (skull, ribcage shape visible via VALUE CONTRAST not black lines)
2. Glowing yellow eye sockets
3. Weapon visible (rusted sword shape)

SECONDARY:
- Battered shield or armor scraps
- Tattered cloth remnants

TERTIARY:
- Visible rib cage detail (internal value contrast)
- Damaged/missing bones

Animation: Shamble walk, sword slash, bones scatter
```

#### Pyro Cultist
```
Size: 32x32 | Render class: MEDIUM
Shape: Robed humanoid, dynamic pose
Palette: Dark red cloth + fire magic (12-14 colors)
Outline: Full black outline on body, sel-out on fire effects

ESSENTIAL:
1. Hooded robe silhouette
2. Glowing eyes from hood shadow
3. Fire on hands (orange-yellow glow at hand positions)

SECONDARY:
- Dark hooded robe with value shading
- Dynamic casting pose (arms raised)

TERTIARY:
- Staff or tome
- Cult symbols on robe (sub-pixel marks)

Animation: Cast pose, fireball throw, burn death
```

#### Ash Walker
```
Size: 32x32 | Render class: MEDIUM
Shape: Humanoid wrapped in ash/soot
Palette: Gray + fire accents (10-12 colors)
Outline: Full black outline

ESSENTIAL:
1. Mummy-like wrapped humanoid silhouette
2. Glowing yellow eyes through ash
3. Ash particle cloud at feet (scattered gray pixels)

SECONDARY:
- Tattered burial cloth texture
- Ember accents (orange spots)

TERTIARY:
- Shambling pose
- Trailing ash particles

Animation: Shamble, reaching grab, crumble
```

#### Shadow Imp
```
Size: 32x32 | Render class: SMALL
Shape: Small demonic humanoid
Palette: Shadow element + red accents (10-12 colors)
Outline: Sel-out (dark purple) - playful, not solid

ESSENTIAL:
1. Small horned head (distinctive silhouette)
2. Bat-like wings (small, visible)
3. Glowing yellow/red eyes

SECONDARY:
- Long clawed fingers
- Pointed tail

TERTIARY:
- Mischievous pose/expression
- Hover/flutter posture

Animation: Flutter hover, rapid slash, poof smoke
```

#### Void Touched
```
Size: 32x32 | Render class: MEDIUM
Shape: Corrupted humanoid, warped proportions
Palette: Shadow element (10-12 colors)
Outline: Sel-out, partial - allows void energy bleed

ESSENTIAL:
1. Wrong/warped humanoid proportions (long limbs, twisted form)
2. Void energy effect (purple glow/particles at edges)
3. Face partially consumed (one side dark/void)

SECONDARY:
- Floating slightly (no feet touching "ground" line)
- One arm may be mutated/extended

TERTIARY:
- Void particles orbiting
- Jerky asymmetric pose

Animation: Jerky float, void bolt, consumed death
```

#### Shield Bearer
```
Size: 32x32 | Render class: MEDIUM | Note: Tank with shield mechanic
Shape: Armored soldier with large shield
Palette: Metal/steel + leather accents (12-14 colors)
Outline: Full black outline

ESSENTIAL:
1. Large shield covering front (dominant silhouette element)
2. Armored helmet with eye slit (glowing eyes visible)
3. Weapon visible behind/beside shield (sword or spear tip)

SECONDARY:
- Chainmail/plate armor texture (sub-pixel metal sheen)
- Shield emblem or damage marks
- Sturdy defensive stance

TERTIARY:
- Cloak or tabard remnants
- Boot/greave detail

Animation: Shield brace idle, shield thrust attack, collapse death
Special: Shield blocks frontal attacks - requires flanking or shield-breaking
```

#### Temple Sentinel
```
Size: 32x32 | Render class: MEDIUM-LARGE | Note: Ancient guardian with shield
Shape: Stone-like armored guardian, ancient aesthetic
Palette: Holy element + stone/gold (12-14 colors)
Outline: Full black outline

ESSENTIAL:
1. Large ornate shield (decorated, temple motifs)
2. Glowing golden/cyan eyes (awakened guardian)
3. Ancient armor style (Roman/Greek inspired silhouette)

SECONDARY:
- Stone texture on armor (weathered appearance)
- Holy runes/symbols glowing on shield or armor
- Plumed helmet or crown detail

TERTIARY:
- Ground cracks/holy aura at feet
- Weapon (spear or sword) detail

Animation: Dormant stance, awakening, shield bash attack
Special: Shield blocks frontal attacks - requires flanking or shield-breaking
```

---

### Undead Class

#### Phantom
```
Size: 32x32 | Render class: MEDIUM
Shape: Ghostly upper body, fading to nothing below
Palette: Pale blue-white (8-10 colors)
Outline: Sel-out (pale blue) upper body, NO OUTLINE lower half

ESSENTIAL:
1. Humanoid torso visible (chest, arms, head)
2. Fades to wisps below waist (NO HARD EDGE - pixels scatter)
3. Hollow eyes with pale glow

SECONDARY:
- Ghostly tattered robes (value suggestion)
- Semi-transparent body edges

TERTIARY:
- Sorrowful expression
- Trailing wisp particles

Animation: Float drift, soul drain, dissipate
```

#### Bone Golem
```
Size: 32x32 | Render class: LARGE
Shape: Large construct of fused bones
Palette: Undead + soul glow (12-14 colors)
Outline: Full black outline

ESSENTIAL:
1. Massive bone construct silhouette
2. Multiple skulls visible (2-3 skull shapes in body via VALUE CONTRAST)
3. Glowing soul core in chest cavity (green/yellow glow)

SECONDARY:
- Massive bone club arm
- Hunched powerful stance

TERTIARY:
- Fused bone texture (sub-pixel value variation)
- Rib/spine structural hints

Animation: Lumber, overhead smash, collapse
```

#### Frozen Husk
```
Size: 32x32 | Render class: MEDIUM
Shape: Ice-encased corpse
Palette: Ice + undead blend (12-14 colors)
Outline: Full black outline on body, sel-out on ice crystals

ESSENTIAL:
1. Frozen humanoid corpse silhouette
2. Blue glowing eyes
3. Ice crystals growing from body (angular protrusions, lighter blue)

SECONDARY:
- Stiff frozen pose (arms at odd angle)
- Frost particles around

TERTIARY:
- Preserved decay details
- Frozen ground effect

Animation: Stiff jerky walk, frozen grasp, shatter
```

---

## 6. Animation Guidelines

### Idle Animations (2-4 frames, 60-120ms per frame)

**Organic Creatures (Beasts, Slimes):**
- Breathing/pulsing effect
- Subtle body expansion/contraction
- 2-3 pixel movement maximum

**Spirits/Ethereal:**
- Floating bob (vertical oscillation)
- Flickering edges (pixel scatter variation)
- Particle drift

**Golems/Heavy:**
- Subtle sway or weight shift
- Minimal movement (1-2 pixels)
- Occasional eye glow pulse

**Humanoids:**
- Breathing chest movement
- Weight shift between feet
- Occasional blink

### Attack Animations (3-5 frames)

```
Frame 1: ANTICIPATION (200-400ms)
- Pull back, wind up
- Build energy/tension
- Player can read incoming attack

Frame 2-3: ACTION (100-200ms)
- Strike/cast/bite
- Motion blur/smear optional (sub-pixel technique)
- Impact frame

Frame 4-5: FOLLOW-THROUGH (150-300ms)
- Recovery
- Return toward idle
- Damage has already been dealt
```

### Death Animations (3-5 frames)

**Physical Death:**
- Stagger, fall, crumple
- Armor/parts scatter
- Dust cloud on impact

**Ethereal Death:**
- Fade out, dissipate (sel-out helps this read)
- Particles disperse outward
- Glow diminishes to nothing

**Elemental Death:**
- Extinguish (fire fades to smoke colors)
- Shatter (ice breaks apart)
- Crumble (earth fragments)
- Evaporate (water fades)

---

## 7. Technical Implementation

### Palette Character Mapping

Standard character conventions for sprite pixel arrays:

```
Transparency:
'.' = Transparent (standard)
' ' = Transparent (alternative)

Body Colors:
'O' = Primary body color (mid)
'L' = Light body color
'D' = Dark body color
'S' = Shadow color
'C' = Core shadow (darkest body)

Outlines:
'X' = Black outline (#000000)
'x' = Sel-out colored outline (context-dependent)

Features:
'E' = Eyes (bright accent)
'H' = Highlight (brightest)
'M' = Mouth/teeth
'K' = Claws/details

Elements:
'F' = Fire/glow effect
'I' = Ice effect
'G' = Green/nature
'P' = Purple/shadow
'B' = Bone/white
'R' = Red accent
'Y' = Yellow accent
```

### Sprite Data Structure

```javascript
const SPRITE_NAME = {
    name: 'sprite_name',
    width: 32,
    height: 32,
    pixels: [
        // 32 strings of 32 characters each
        "................................",  // Row 0
        // ... 30 more rows ...
        "................................"   // Row 31
    ],
    palette: {
        // Target 10-16 colors total
        'X': '#000000',  // Black outline (if used)
        'x': '#441100',  // Sel-out outline (if used)
        'H': '#FFFFCC',  // Highlight (low sat)
        'L': '#FFDD77',  // Light
        'O': '#FF6B35',  // Mid (peak sat)
        'D': '#CC3322',  // Shadow
        'S': '#661122',  // Deep shadow (low sat)
        'C': '#331111',  // Core shadow
        'E': '#FFFF44',  // Eyes
        // ... additional colors as needed
    }
};
```

---

## 8. Quality Checklist

### Before Finalizing Any Sprite:

```
STRUCTURE:
□ Canvas is exactly 32x32 pixels
□ Sprite fills full 32x32 canvas (26-30px active, 1-3px margin for outline/effects)
□ Outline strategy matches creature type:
  □ Physical: Full black outline
  □ Ethereal: Sel-out or no outline on fading edges
□ No gaps in outline where outline IS intended

LIGHTING:
□ Light source consistent (top-left, 45°)
□ Highlights on top/left surfaces
□ Shadows on bottom/right surfaces
□ Ambient occlusion in joints/creases

COLOR:
□ Hue shifting applied (shadows shift hue toward red/purple or blue)
□ Saturation peaks at midtone, decreases toward highlights AND shadows
□ Total color count is 10-16 colors
□ No over-saturated highlights or shadows

PIXEL QUALITY:
□ No isolated single pixels (except intentional eyes/sparkles)
□ Pixel clusters of 2+ for details
□ Sub-pixel techniques used for implied detail (scales, textures)
□ Internal shapes defined by color contrast, NOT black lines

AA (if used):
□ Applied conservatively to major curves only
□ Tested at 1x, 2x, and 4x scales
□ No muddy artifacts at larger scales

READABILITY:
□ Silhouette recognizable without color
□ Clear on dark backgrounds
□ Clear on light backgrounds
□ Essential features (1-3 per spec) are clearly visible
□ Distinct from other monster types

CONSISTENCY:
□ Matches element palette guidelines (with saturation curve)
□ Matches monster class conventions (outline type, etc.)
□ Light source matches all other sprites
□ Render class assigned appropriately for game-time scaling
```

---

## 9. Common Mistakes to Avoid

### Shading Mistakes
```
✗ Pillow shading (light in center, dark on all edges)
✗ Same-hue darkening (just adding black to colors)
✗ Banding (obvious value steps with harsh transitions)
✗ Inconsistent light source direction
✗ Over-saturated shadows (should desaturate toward dark)
✗ Over-saturated highlights (should desaturate toward light)
```

### Outline Mistakes
```
✗ Pure black outline on ethereal/spirit creatures (traps them)
✗ Missing outline on solid physical creatures (loses silhouette)
✗ Gray outline instead of pure black or proper sel-out color
✗ Internal black lines (creates sticker/stained-glass look)
✗ Double-thick outline sections
✗ Outline on edges that should fade to transparent
```

### Detail Mistakes
```
✗ Isolated single pixels throughout (noise)
✗ Too much literal detail (32px can't fit it - use sub-pixel)
✗ Too little detail (flat, boring)
✗ Details that break silhouette readability
✗ Ignoring essential features for tertiary ones
```

### Color Mistakes
```
✗ Over-saturated everywhere (eye strain, flat)
✗ All same saturation across value ramp (unnatural)
✗ Too many colors (over 18 - muddy, competing)
✗ Too few colors (under 8 - flat, lacking depth)
✗ Neon colors without purpose
✗ Using full 6-color ramp of multiple palettes (palette bloat)
```

### Anti-Aliasing Mistakes
```
✗ AA on everything (muddy at scale)
✗ AA on black outlines (defeats purpose)
✗ AA using unrelated colors (visible seams)
✗ Not testing at 2x and 4x scale
```

---

## 10. Reference Examples

### Hue-Shifted Shading with Saturation Curve (Orange Body)
```
Character:  . . . . X X X X X . . . .
            . . . X H H L L X X . . .
            . . X H L L O O O X . .
            . . X L O O O O D X . .
            . . X O O O D D D X . .
            . . X O D D D S S X . .
            . . . X D S S S X . . .
            . . . . X X X X . . . .

H = #FFFFCC (Yellow highlight - low saturation, hue-shifted light)
L = #FFDD77 (Orange-yellow light - medium-high saturation)
O = #FF6B35 (Orange mid - PEAK saturation)
D = #CC3322 (Red-orange shadow - medium saturation, hue-shifted)
S = #661122 (Purple-red deep - low saturation, heavy hue shift)
X = #000000 (Black outline)
```

### Sel-Out Example (Spirit Creature)
```
Body with sel-out:        Body fading (no outline):
. . . x x x . .           . . O L L . . .
. . x O O O x .           . O O L . . . .
. x O O O O x .           O O O . . . . .
. x O O O x . .           O O . . . . . .
. . x x x . . .           O . . . . . . .

x = Sel-out color (#223355 for ice, #441100 for fire, etc.)
    Darker version of body color, NOT black

Right side: Pixels simply end - no outline at fading edges
```

### Sub-Pixel Implied Detail (Scales)
```
Literal scales (BAD):       Implied scales (GOOD):
O O O O O O O O             H L O O D S D O
O O O O O O O O             L O O D D O O D
O O O O O O O O             O D D O O D S S
O O O O O O O O             D O O D S S O D

Left: No way to show        Right: Value variation across
individual scales           body implies overlapping scales
                           via sub-pixel perception
```

### Render-Time Size Hierarchy Example
```
All sprites are 32x32 at DESIGN time, but rendered at different scales:

DESIGN (all same):     RENDER (scaled):
████████████████       ████████████████  ← Bone Golem at 1.0x
████████████████       ██████████████    ← Warrior at 0.85x
████████████████       ████████████      ← Shadow Imp at 0.65x
████████████████       ████████          ← Wisp at 0.5x
████████████████
████████████████       Size hierarchy comes from render scaling,
████████████████       NOT from drawing smaller on the canvas.
████████████████       Every sprite gets full 32x32 detail.
```

---

*This guide ensures visual consistency across all monster sprites while allowing appropriate stylistic variation between physical and ethereal creatures. Key principles: appropriate outline strategy per creature type, top-left lighting, hue-shifted AND saturation-managed shading, sub-pixel implied detail, conservative AA, proper size hierarchy, and 10-16 color budgets. Prioritize essential features first, and always test at multiple scales.*
