# Tileset Visual Design Guide
## The Shifting Chasm - Procedural Pixel Art Specification

---

## 1. Art Style Overview

### Reference: Desktop Dungeons Aesthetic
- **Resolution**: 16x16 pixel tiles (standard), 32x32 for detailed variants
- **Palette**: Limited colors per tile (4-6 colors max)
- **Tileable**: Seamless edges for repeating patterns
- **Readable**: Clear distinction between walkable and non-walkable areas
- **Atmospheric**: Tiles support the mood of each environment

### Core Principles
1. **Function First**: Players must instantly know what they can walk on
2. **Environment Theming**: Each zone has a distinct color palette and texture
3. **Seamless Tiling**: Edges must connect naturally when repeated
4. **Depth Illusion**: Use shading to suggest 3D form on 2D tiles
5. **Consistency**: All tiles share the same pixel density and lighting direction
6. **Contrast**: Floors are darker, walls are lighter (or vice versa with clear distinction)

### Lighting Convention
- **Light source**: Top-left (consistent with monster sprites)
- **Highlights**: Top and left edges
- **Shadows**: Bottom and right edges
- **Floor shadows**: Cast by walls onto adjacent floor tiles

---

## 2. Tile Size Classes

| Class | Pixel Size | Usage | Notes |
|-------|------------|-------|-------|
| **Standard** | 16x16 | Primary tiles | Matches monster sprite scale |
| **Detail** | 32x32 | Special areas, bosses | 4x standard for high-detail zones |
| **Mini** | 8x8 | Minimap, UI elements | Quarter-size for overview |

### Grid Alignment
- All tiles snap to 16x16 grid
- Wall tiles occupy full cell
- Floor tiles occupy full cell
- Decorative overlays render on top of base tiles

---

## 3. Environment Color Palettes

### Volcanic Caverns (Fire Theme)
```
Floor Dark:     #2A1810 (Scorched Black)
Floor Mid:      #4A3020 (Charred Brown)
Floor Light:    #6B4530 (Warm Stone)
Wall Dark:      #1A0808 (Deep Char)
Wall Mid:       #3A2018 (Burnt Rock)
Wall Light:     #5A3828 (Hot Stone)
Accent:         #FF6B35 (Lava Orange)
Glow:           #FFAA44 (Ember Yellow)
```
**Visual Cues**: Cracked surfaces, lava veins, heat shimmer, ash deposits

### Frozen Depths (Ice Theme)
```
Floor Dark:     #1A2A3A (Deep Ice)
Floor Mid:      #2A4A5A (Frozen Stone)
Floor Light:    #4A6A7A (Frost Gray)
Wall Dark:      #0A1A2A (Glacial Black)
Wall Mid:       #2A3A4A (Ice Rock)
Wall Light:     #4A5A6A (Pale Ice)
Accent:         #88CCFF (Ice Blue)
Glow:           #AAEEFF (Frost White)
```
**Visual Cues**: Ice crystals, frozen puddles, frost patterns, cracked ice

### Ancient Catacombs (Death Theme)
```
Floor Dark:     #1A1A18 (Grave Dirt)
Floor Mid:      #2A2A25 (Dusty Stone)
Floor Light:    #3A3A32 (Weathered Gray)
Wall Dark:      #151512 (Tomb Black)
Wall Mid:       #252520 (Crypt Stone)
Wall Light:     #454540 (Ancient Gray)
Accent:         #88AA88 (Decay Green)
Glow:           #FFFF66 (Soul Yellow)
```
**Visual Cues**: Cracked tiles, bone fragments, cobwebs, moss growth

### Crystal Caves (Earth Theme)
```
Floor Dark:     #2A2520 (Cave Brown)
Floor Mid:      #4A4035 (Rock Brown)
Floor Light:    #6A5A4A (Tan Stone)
Wall Dark:      #1A1510 (Deep Cave)
Wall Mid:       #3A3028 (Brown Rock)
Wall Light:     #5A4A3A (Light Rock)
Accent:         #AA88CC (Crystal Purple)
Glow:           #DDBBFF (Crystal Glow)
```
**Visual Cues**: Crystal formations, mineral veins, stalactites, rocky texture

### Sunken Ruins (Water Theme)
```
Floor Dark:     #1A2520 (Deep Murk)
Floor Mid:      #2A3A35 (Wet Stone)
Floor Light:    #3A4A45 (Damp Gray)
Wall Dark:      #0A1510 (Flooded Black)
Wall Mid:       #1A2A25 (Drowned Stone)
Wall Light:     #2A3A35 (Mossy Rock)
Accent:         #4488BB (Water Blue)
Glow:           #66CCCC (Foam Aqua)
```
**Visual Cues**: Water puddles, algae, barnacles, eroded surfaces

### Shadow Realm (Dark Theme)
```
Floor Dark:     #0A0510 (Void Black)
Floor Mid:      #1A1020 (Shadow Purple)
Floor Light:    #2A1A30 (Dark Violet)
Wall Dark:      #050308 (Pure Void)
Wall Mid:       #100818 (Deep Shadow)
Wall Light:     #1A1028 (Shadow Stone)
Accent:         #8844AA (Void Purple)
Glow:           #FF44FF (Eldritch Pink)
```
**Visual Cues**: Wispy edges, void cracks, floating particles, unstable geometry

### Temple Halls (Holy Theme)
```
Floor Dark:     #3A3530 (Polished Dark)
Floor Mid:      #5A5550 (Temple Stone)
Floor Light:    #7A756A (Marble Gray)
Wall Dark:      #2A2520 (Foundation)
Wall Mid:       #4A4540 (Carved Stone)
Wall Light:     #6A655A (Blessed Stone)
Accent:         #FFDD77 (Divine Gold)
Glow:           #FFFFCC (Holy Light)
```
**Visual Cues**: Clean lines, geometric patterns, gold inlays, pristine surfaces

### Standard Dungeon (Neutral Theme)
```
Floor Dark:     #1A1A1A (Deep Gray)
Floor Mid:      #2A2A2A (Stone Gray)
Floor Light:    #3A3A3A (Light Gray)
Wall Dark:      #101010 (Black Stone)
Wall Mid:       #202020 (Dark Stone)
Wall Light:     #303030 (Gray Stone)
Accent:         #555555 (Metal Gray)
Glow:           #888888 (Torch Light)
```
**Visual Cues**: Brick patterns, mortar lines, utilitarian, torchlit

---

## 4. Tile Archetypes

### A. FLOOR TILES

#### Basic Floor
**Purpose**: Primary walkable surface
**Design Rules**:
- Darker than walls for contrast
- Subtle texture variation (not flat color)
- Edges blend with adjacent floor tiles
- Optional: footprint wear patterns in high-traffic areas

**Variants**:
| Variant | Description |
|---------|-------------|
| Clean | Minimal detail, uniform |
| Worn | Cracks, scuffs, weathering |
| Rubble | Scattered debris, broken |
| Decorated | Patterns, inlays, symbols |

```
Example: Stone Floor (16x16)
Palette: . = dark, : = mid, ; = light, # = crack

................
..:..:..:..:..:.
.:;;:.:;;:.:;;:.
.:;;:.:;;:.:;;:.
..:..:..:..:..:.
................
..:..:..#..:..:.
.:;;:.:;;:.:;;:.
.:;;:.#;;:.:;;:.
..:..:..:..:..:.
................
..:..:..:..:..:.
.:;;:.:;;:.:;;:.
.:;;:.:;;:.:;;:.
..:..:..:..:..:.
................
```

#### Hazard Floor
**Purpose**: Dangerous walkable surface
**Design Rules**:
- Base floor with hazard overlay
- Clear visual warning (color coding)
- Animated for active hazards

**Types**:
| Hazard | Visual | Color |
|--------|--------|-------|
| Lava | Bubbling orange | #FF6B35 |
| Spikes | Metal points | #888888 |
| Ice | Slippery sheen | #88CCFF |
| Poison | Green puddle | #88AA44 |
| Void | Purple cracks | #8844AA |

#### Transition Floor
**Purpose**: Bridges different tile themes
**Design Rules**:
- Gradual blend between two palettes
- Used at zone boundaries
- 2-3 tile transition width

---

### B. WALL TILES

#### Solid Wall
**Purpose**: Impassable boundary
**Design Rules**:
- Lighter than floor (catches light)
- Clear top edge (suggests height)
- Texture indicates material
- Shadow cast on adjacent floor

**Structure**:
```
┌─────────────────┐
│ Highlight edge  │ <- Top 2-3 pixels lighter
│ Main body       │ <- Primary wall color
│ Mid detail      │ <- Texture/brick pattern
│ Base shadow     │ <- Bottom 2-3 pixels darker
└─────────────────┘
```

**Variants**:
| Variant | Description |
|---------|-------------|
| Brick | Regular block pattern |
| Stone | Irregular natural shapes |
| Smooth | Carved/polished surface |
| Rough | Jagged, natural cave |
| Ruined | Crumbling, damaged |

```
Example: Brick Wall (16x16)
Palette: # = dark, = = mid, - = light (mortar), @ = highlight

@@@@@@@@@@@@@@@@
-##==-##==-##==-
=##==-##==-##==-
-##==-##==-##==-
==-##==-##==-##=
==-##==-##==-##=
==-##==-##==-##=
-##==-##==-##==-
=##==-##==-##==-
-##==-##==-##==-
==-##==-##==-##=
==-##==-##==-##=
==-##==-##==-##=
-##==-##==-##==-
################
################
```

#### Wall Top (Exposed)
**Purpose**: Top surface of shorter walls
**Design Rules**:
- Shows top surface when wall doesn't reach ceiling
- Perspective suggests depth
- Used for half-walls, ledges

#### Wall Corner
**Purpose**: Where two walls meet
**Design Rules**:
- Interior corners: shadow in corner
- Exterior corners: highlight on edge
- Must align with adjacent wall tiles

**Corner Types**:
```
Interior NW    Interior NE    Exterior NW    Exterior NE
 ████│          │████          ████            ████
 ████│          │████          ████            ████
 ────┘          └────          ────            ────
                               │                  │
                               │                  │
```

---

### C. SPECIAL TILES

#### Door Frame
**Purpose**: Passageway between areas
**Design Rules**:
- Clear opening in center
- Frame matches wall material
- Distinct from wall (archway shape)

**States**:
| State | Visual |
|-------|--------|
| Open | Empty doorway |
| Closed | Door panel in frame |
| Locked | Door with lock icon |
| Hidden | Blends with wall |

#### Stairs
**Purpose**: Level transitions
**Design Rules**:
- Clear direction indicator (up/down)
- Steps visible
- Perspective suggests depth

**Variants**:
```
Stairs Down          Stairs Up
(darker descent)     (lighter ascent)
    ████████             ░░░░░░░░
   ████████             ░░░░░░░░░
  ██████████           ░░░░░░░░░░
 ██████████████       ░░░░░░░░░░░░
████████████████     ░░░░░░░░░░░░░░
```

#### Pit/Chasm
**Purpose**: Deep hole, may be jumpable or fatal
**Design Rules**:
- Pure black center
- Crumbling edge detail
- Depth suggested by fade to black

#### Interactive Tiles
**Purpose**: Triggers, switches, pressure plates
**Design Rules**:
- Distinct from regular floor
- Visual state change when activated
- Consistent iconography

| Type | Inactive | Active |
|------|----------|--------|
| Pressure Plate | Raised | Depressed |
| Switch | Left position | Right position |
| Magic Circle | Dim runes | Glowing runes |

---

### D. DECORATIVE TILES

#### Pillars/Columns
**Purpose**: Structural decoration, partial cover
**Design Rules**:
- Casts shadow on floor
- Can be destroyed or intact
- Matches wall material

#### Rubble
**Purpose**: Destroyed terrain, debris
**Design Rules**:
- Scattered fragments
- Color matches source material
- Partial walkability

#### Environmental Details
**Purpose**: Atmosphere and world-building
**Types**:
| Detail | Usage |
|--------|-------|
| Bones | Catacombs, monster lairs |
| Chains | Dungeons, prisons |
| Mushrooms | Caves, damp areas |
| Crystals | Magical areas, caves |
| Cracks | Old/damaged structures |
| Moss | Wet/abandoned areas |
| Ash | Fire-damaged areas |
| Ice patches | Cold areas |
| Puddles | Wet areas |
| Runes | Magical areas |

---

## 5. Individual Tile Specifications

### VOLCANIC CAVERN TILES

#### Scorched Stone Floor
- **Base Colors**: #2A1810, #4A3020, #6B4530
- **Pattern**: Irregular cracked flagstones
- **Details**:
  - Heat cracks radiating across surface
  - Ember glow in deepest cracks (accent color)
  - Ash deposits in corners
  - Occasional charred debris

#### Obsidian Wall
- **Base Colors**: #1A0808, #3A2018, #5A3828
- **Pattern**: Sharp angular formations
- **Details**:
  - Reflective highlights (glassy surface)
  - Lava veins with glow (#FF6B35)
  - Jagged top edge
  - Heat shimmer effect (animation)

#### Lava Pool (Hazard)
- **Base Colors**: #FF6B35, #FFAA44, #FF3333
- **Pattern**: Bubbling liquid
- **Details**:
  - Animated bubbles rising
  - Darker crust at edges
  - Bright yellow hotspots
  - Steam particles above

#### Cooled Lava Floor
- **Base Colors**: #1A0808, #2A1810, #3A2018
- **Pattern**: Wrinkled/ropy texture
- **Details**:
  - Cracks showing orange beneath
  - Rough, uneven surface
  - Sharp edges where broken

---

### FROZEN DEPTHS TILES

#### Frozen Stone Floor
- **Base Colors**: #1A2A3A, #2A4A5A, #4A6A7A
- **Pattern**: Cracked ice over stone
- **Details**:
  - Ice crystal formations
  - Frost patterns at edges
  - Occasional frozen puddles
  - Subtle blue tint

#### Ice Wall
- **Base Colors**: #0A1A2A, #2A3A4A, #4A5A6A
- **Pattern**: Glacial layers, crystalline
- **Details**:
  - Translucent sections (lighter)
  - Frozen objects embedded (bones, debris)
  - Icicle formations hanging
  - Reflective highlights

#### Frozen Pool (Hazard - Slippery)
- **Base Colors**: #4A6A7A, #88CCFF, #AAEEFF
- **Pattern**: Smooth ice surface
- **Details**:
  - Reflection highlights
  - Cracks beneath surface
  - Bubbles frozen in place
  - Skate mark scratches

#### Snowdrift
- **Base Colors**: #AABBCC, #DDEEFF, #FFFFFF
- **Pattern**: Soft piled snow
- **Details**:
  - Rounded edges
  - Shadow beneath
  - Occasional debris poking through
  - Footprint impressions

---

### ANCIENT CATACOMB TILES

#### Tomb Floor
- **Base Colors**: #1A1A18, #2A2A25, #3A3A32
- **Pattern**: Large ancient tiles
- **Details**:
  - Worn inscriptions
  - Cracked and shifted tiles
  - Dust accumulation
  - Bone fragments scattered

#### Crypt Wall
- **Base Colors**: #151512, #252520, #454540
- **Pattern**: Carved stone blocks
- **Details**:
  - Skull niches
  - Faded murals/carvings
  - Green mold patches (#88AA88)
  - Cobwebs in corners

#### Burial Chamber Floor
- **Base Colors**: #2A2A25, #3A3A32, #4A4A42
- **Pattern**: Ornate tile work
- **Details**:
  - Ceremonial patterns
  - Gold inlay remnants (#AAAA55)
  - Offering debris
  - Disturbed dust patterns

#### Bone Pile (Decoration)
- **Base Colors**: #CCCCAA, #AAAA88, #888866
- **Pattern**: Scattered bones
- **Details**:
  - Various bone shapes
  - Partial skulls
  - Tattered cloth remnants
  - Green decay tint on some

---

### CRYSTAL CAVE TILES

#### Cave Floor
- **Base Colors**: #2A2520, #4A4035, #6A5A4A
- **Pattern**: Natural uneven stone
- **Details**:
  - Mineral veins
  - Small crystal clusters
  - Damp patches
  - Pebble scatter

#### Crystal Wall
- **Base Colors**: #1A1510, #3A3028, #5A4A3A
- **Pattern**: Rock with crystal growths
- **Details**:
  - Large crystal formations (#AA88CC)
  - Glowing crystal cores
  - Natural rock between
  - Reflective facets

#### Crystal Floor (Walkable Crystals)
- **Base Colors**: #6A5A6A, #8A7A8A, #AA88CC
- **Pattern**: Crystalline surface
- **Details**:
  - Geometric facets
  - Internal glow
  - Reflective highlights
  - Crack lines

#### Stalactite/Stalagmite
- **Base Colors**: #3A3028, #5A4A3A, #7A6A5A
- **Pattern**: Pointed formations
- **Details**:
  - Drip patterns
  - Mineral deposits
  - Wet sheen
  - Shadow beneath

---

### SUNKEN RUINS TILES

#### Flooded Floor
- **Base Colors**: #1A2520, #2A3A35, #3A4A45
- **Pattern**: Submerged flagstones
- **Details**:
  - Water overlay (semi-transparent)
  - Visible stone pattern beneath
  - Ripple effects (animated)
  - Algae growth

#### Mossy Wall
- **Base Colors**: #0A1510, #1A2A25, #2A3A35
- **Pattern**: Eroded stonework
- **Details**:
  - Thick moss covering (#446644)
  - Barnacle clusters
  - Water stains
  - Crumbling sections

#### Shallow Water (Hazard - Slow)
- **Base Colors**: #2255AA, #4488BB, #66CCCC
- **Pattern**: Rippling water
- **Details**:
  - Animated ripples
  - Visible floor beneath
  - Floating debris
  - Caustic light patterns

#### Coral Formation (Decoration)
- **Base Colors**: #CC6655, #FFAA88, #FF8866
- **Pattern**: Branching coral
- **Details**:
  - Organic branching
  - Color variations
  - Small fish particles
  - Barnacle accents

---

### SHADOW REALM TILES

#### Void Floor
- **Base Colors**: #0A0510, #1A1020, #2A1A30
- **Pattern**: Unstable, shifting
- **Details**:
  - Void cracks (#8844AA)
  - Floating particles
  - Edges seem to drift
  - Pulsing glow in cracks

#### Shadow Wall
- **Base Colors**: #050308, #100818, #1A1028
- **Pattern**: Amorphous, unclear edges
- **Details**:
  - Wispy protrusions
  - Eyes occasionally visible
  - Reality tears (#FF44FF)
  - No clear texture

#### Void Rift (Hazard - Damage)
- **Base Colors**: #000000, #110022, #FF44FF
- **Pattern**: Tear in reality
- **Details**:
  - Black center
  - Purple-pink edges
  - Particles being pulled in
  - Unstable pulsing

#### Corruption Spread (Decoration)
- **Base Colors**: #1A1020, #2A1A30, #8844AA
- **Pattern**: Organic spreading
- **Details**:
  - Tendril patterns
  - Corrupted normal tiles
  - Pulsing veins
  - Gradual transition

---

### TEMPLE HALL TILES

#### Marble Floor
- **Base Colors**: #3A3530, #5A5550, #7A756A
- **Pattern**: Polished tiles with veins
- **Details**:
  - Subtle marble veining
  - Reflective sheen
  - Gold inlay borders (#FFDD77)
  - Geometric patterns

#### Temple Wall
- **Base Colors**: #2A2520, #4A4540, #6A655A
- **Pattern**: Carved stone blocks
- **Details**:
  - Relief carvings
  - Holy symbols
  - Gold trim
  - Pristine condition

#### Sacred Circle (Interactive)
- **Base Colors**: #5A5550, #FFDD77, #FFFFCC
- **Pattern**: Inscribed runes
- **Details**:
  - Circular border
  - Glowing runes (animated)
  - Central symbol
  - Light particles rising

#### Pillar Base
- **Base Colors**: #4A4540, #6A655A, #8A857A
- **Pattern**: Ornate column base
- **Details**:
  - Decorative molding
  - Shadow cast
  - Gold accents
  - Cracked variants available

---

## 6. Tile Connectivity System

### Autotile Rules
Tiles connect based on adjacent tile types. Each tile checks 8 neighbors:
```
[NW][N][NE]
[W][X][E]
[SW][S][SE]
```

### Wall Connection Types
| Configuration | Tile Variant |
|---------------|--------------|
| All sides wall | Center fill |
| N open | South-facing wall top |
| S open | North-facing wall (rare) |
| E open | West edge |
| W open | East edge |
| NE corner | Inner corner NE |
| NW corner | Inner corner NW |
| SE corner | Inner corner SE |
| SW corner | Inner corner SW |

### Floor Variation Rules
- **No special connections**: Use random variation
- **Near walls**: Add shadow/dirt accumulation
- **Near hazards**: Add transition effect
- **High traffic**: Add worn patterns

---

## 7. Animation Guidelines

### Animated Tile Types

#### Lava/Magma (4-6 frames)
- Bubbles rise and pop
- Surface shifts colors
- Glow pulses
- Frame timing: 150-200ms

#### Water (4-8 frames)
- Ripple patterns
- Reflection shimmer
- Wave movement
- Frame timing: 100-150ms

#### Magic Effects (3-5 frames)
- Rune glow pulse
- Particle effects
- Color cycling
- Frame timing: 200-300ms

#### Environmental (2-4 frames)
- Torch flicker (light tiles)
- Dripping water
- Swaying vegetation
- Frame timing: 200-400ms

### Animation Sync
- All tiles of same type should sync
- Use global timer, not per-tile
- Offset by position for natural variation

---

## 8. Visual Effects Integration

### Lighting Effects
| Source | Radius | Color | Flicker |
|--------|--------|-------|---------|
| Torch | 3 tiles | #FFAA44 | Yes |
| Lava | 2 tiles | #FF6B35 | Yes |
| Crystal | 2 tiles | #AA88CC | No |
| Magic | 2-4 tiles | Varies | Pulse |
| Holy | 4 tiles | #FFFFCC | No |

### Shadow Casting
- Walls cast shadows onto adjacent floors
- Shadow direction: bottom-right (light from top-left)
- Shadow opacity: 30-50%
- Shadow length: 2-3 pixels into floor tile

### Particle Effects by Environment
| Environment | Particles |
|-------------|-----------|
| Volcanic | Embers, ash, smoke |
| Frozen | Snowflakes, frost |
| Catacombs | Dust motes, spirits |
| Crystal | Sparkles, light flares |
| Sunken | Bubbles, fish |
| Shadow | Void motes, wisps |
| Temple | Light motes, feathers |

---

## 9. Procedural Generation Rules

### When generating tiles programmatically:

1. **Establish base color** - Use environment palette
2. **Apply pattern** - Brick, stone, natural, etc.
3. **Add connectivity** - Check neighbors, select variant
4. **Apply wear/variation** - Randomize within bounds
5. **Add details** - Environment-appropriate decorations
6. **Apply lighting** - Highlights and shadows
7. **Test tiling** - Ensure seamless connections

### Randomization Parameters
- **Color variation**: Hue shift ±5%, brightness ±10%
- **Pattern offset**: Randomize starting position
- **Crack placement**: Random with density control
- **Detail density**: Sparse/medium/dense settings
- **Wear level**: New/worn/damaged/ruined

### Procedural Variation Seeds
```javascript
// Example variation system
function getTileVariant(x, y, tileType) {
    const seed = hashPosition(x, y);
    const variant = seed % VARIANT_COUNT[tileType];
    const wear = (seed >> 4) % 4; // 0-3 wear level
    const detail = (seed >> 6) % 3; // 0-2 detail level
    return { variant, wear, detail };
}
```

---

## 10. Technical Specifications

### Canvas Rendering
```javascript
// Recommended tile rendering settings
ctx.imageSmoothingEnabled = false;  // Crisp pixels
ctx.scale(PIXEL_SCALE, PIXEL_SCALE); // Integer scaling only

// Tile constants
const TILE_SIZE = 16;
const TILE_SCALE = 2; // Render at 32x32 on screen
```

### Color Format
- Use hex codes for consistency
- Store palettes as objects for easy swapping
- Support palette shifting for variants

```javascript
// Example palette structure
const VOLCANIC_PALETTE = {
    floorDark: '#2A1810',
    floorMid: '#4A3020',
    floorLight: '#6B4530',
    wallDark: '#1A0808',
    wallMid: '#3A2018',
    wallLight: '#5A3828',
    accent: '#FF6B35',
    glow: '#FFAA44'
};
```

### Tile Data Format
```javascript
// Example tile definition
const TILE_DEFINITIONS = {
    stone_floor: {
        name: 'Stone Floor',
        walkable: true,
        width: 16,
        height: 16,
        pixels: [
            '................',
            '..:..:..:..:..:.',
            // ... 16 rows total
        ],
        palette: {
            '.': '#2A2A2A',
            ':': '#3A3A3A',
            ';': '#4A4A4A',
            '#': '#1A1A1A'
        },
        variants: 4,
        animated: false
    }
};
```

### Performance Considerations
- Pre-render tile variants to cache
- Use tilemap texture atlas
- Batch similar tiles in draw calls
- Only update animated tiles when visible

### Tile Atlas Layout
```
┌────┬────┬────┬────┐
│F-01│F-02│F-03│F-04│  Floor variants
├────┼────┼────┼────┤
│W-01│W-02│W-03│W-04│  Wall variants
├────┼────┼────┼────┤
│C-NW│C-NE│C-SW│C-SE│  Corner pieces
├────┼────┼────┼────┤
│D-01│D-02│D-03│D-04│  Decorations
└────┴────┴────┴────┘
```

---

## 11. Implementation Checklist

### Minimum Viable Tileset (per environment)
- [ ] Basic floor tile (4 variants)
- [ ] Basic wall tile (4 variants)
- [ ] Inner corners (4 pieces)
- [ ] Outer corners (4 pieces)
- [ ] Wall top edge
- [ ] Floor-to-wall transition

### Extended Tileset
- [ ] Hazard tiles
- [ ] Decorative overlays
- [ ] Door frames
- [ ] Stairs up/down
- [ ] Pit/chasm edges
- [ ] Interactive tiles
- [ ] Pillar/column
- [ ] Rubble/debris

### Polish Tileset
- [ ] Animated variants
- [ ] Lighting variations
- [ ] Theme transitions
- [ ] Rare decorations
- [ ] Environmental storytelling pieces

---

*This document serves as the visual specification for all environment tiles in The Shifting Chasm. Follow these guidelines to ensure visual consistency across procedurally generated and hand-crafted tilesets.*
