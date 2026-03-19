# Complete Attack Animation Reference Summary

## Overview by Base Reference

| Base Reference | Abilities Covered | Core Mechanics |
|----------------|-------------------|----------------|
| **melee-swing** | 6 abilities | `arc_fill` telegraph, `slash_arc` impact, `arc_edge` particles |
| **ground-slam** | 4 abilities | `circle_grow` telegraph, `ring_burst` impact, radial particles |
| **charge** | 2 abilities | `line_fixed` telegraph, dash trail, wall collision |
| **fire-breath** | 3 abilities | `cone_fixed` telegraph, channel phase, streaming particles |
| **homing-orb** | 4 abilities | `caster_charge` telegraph, ProjectileSystem, homing behavior |
| **beam** | 2 abilities | `beam_telegraph`, `beam_channel`, line hit detection |

---

## 1. Melee Arc Abilities (Base: `melee-swing-animation-reference.html`)

### Base Configuration
```javascript
telegraph: { type: 'arc_fill', arcAngle: Math.PI/2, radius: 1.5, directed: true, lockDirection: true }
impact: { type: 'slash_arc', sweepDirection: 'cw', duration: 150 }
particles: { spawnMode: 'arc_edge' }
camera: { type: 'screenNudge', intensity: 2 }
```

| Ability | Telegraph | Impact | Particles | Camera | Specific Adjustments |
|---------|-----------|--------|-----------|--------|---------------------|
| **melee_swing** | 90° arc, r1.5, 400ms | White slash arc | 4 sparks along arc edge | Nudge 2px | **BASE** - no changes |
| **claw_swipe** | **120° arc**, r1.5, 350ms | **Triple slash lines** (3 parallel arcs) | 6 sparks, **red tint** | Nudge 2px | Wider arc, multi-slash visual |
| **bite** | **60° arc**, r1.0, 300ms | **Chomp effect** (two arcs closing) | 3 sparks + **blood splatter** | Nudge 3px | Narrower arc, shorter range, **lunge 0.5 tiles toward target during telegraph** |
| **double_strike** | 90° arc, r1.5, **250ms×2** | Two slashes (**CW then CCW**) | 4 sparks per slash | Nudge 2px×2 | **Two sequential arcs** with 100ms gap, alternating directions |
| **tail_whip** | **140° arc**, r2.0, 500ms | Wide sweep arc | 5 sparks + **dust cloud** | Nudge 3px | **Rear-facing** (direction = facing + π), wider radius, knockback indicator |
| **sweep** | **180° arc**, r1.8, 600ms | Full semicircle slash | 8 sparks in wide spread | **screenShake** light | Half-circle coverage, longer telegraph, more particles |

### Adjustment Details

**claw_swipe:**
```javascript
impact: {
  type: 'slash_arc',
  multiLine: 3,           // Draw 3 parallel arcs
  lineSpacing: 4,         // 4px between lines
  color: '#FF8888',       // Reddish tint
}
```

**bite:**
```javascript
telegraph: {
  // ... base config
  lunge: { distance: 0.5, timing: 'end' }  // Move caster forward at end of telegraph
},
impact: {
  type: 'chomp',          // New impact type: two arcs snapping together
  closeDuration: 80,      // Fast snap
}
```

**double_strike:**
```javascript
// Handled as two sequential effects with shared cooldown
sequence: [
  { delay: 0, direction: 'cw' },
  { delay: 350, direction: 'ccw' }  // Second strike after first resolves
]
```

**tail_whip:**
```javascript
telegraph: {
  // ... base config
  directionOffset: Math.PI,  // Face away from target (hits behind)
  arcAngle: Math.PI * 0.78,  // 140°
},
particles: {
  // ... base config
  secondary: { type: 'dust_puff', count: 3, groundLevel: true }
}
```

**sweep:**
```javascript
telegraph: {
  arcAngle: Math.PI,      // 180° - full semicircle
  radius: 1.8,
},
camera: {
  type: 'screenShake',    // Upgrade from nudge to shake
  intensity: 1.5,
  duration: 100,
}
```

---

## 2. Circle AOE Abilities (Base: `ground-slam-animation-reference.html`)

### Base Configuration
```javascript
telegraph: { type: 'circle_grow', radius: 2.0, growDuration: 'match', fillOpacity: 0.25 }
impact: { type: 'ring_burst', ringCount: 2, color: '#FFAA00' }
particles: { type: 'debris', count: 8, spawnMode: 'radial' }
camera: { type: 'screenShake', intensity: 4, duration: 150 }
```

| Ability | Telegraph | Impact | Particles | Camera | Specific Adjustments |
|---------|-----------|--------|-----------|--------|---------------------|
| **ground_slam** | r2.0, 800ms, orange | 2 rings expanding | 8 rock debris | Shake 4px | **BASE** - no changes |
| **heavy_slam** | **r3.0**, **1200ms**, red | **3 rings** + **ground crack** | **12 debris** + dust | Shake **6px** | Larger radius, longer telegraph, crack decal |
| **stomp** | **r1.5**, **400ms**, yellow | 1 ring, fast | 4 debris | Shake **2px** | Smaller, faster, less dramatic |
| **pounce** | r2.0, **600ms**, orange | 2 rings | 6 debris + **landing dust** | Shake 4px | **Caster leaps to target position** during telegraph |

### Adjustment Details

**heavy_slam:**
```javascript
telegraph: {
  radius: 3.0,            // 50% larger
  color: '#FF4444',       // More dangerous red
  pulseIntensity: 1.5,    // More dramatic pulsing
},
impact: {
  type: 'ring_burst',
  ringCount: 3,
  groundCrack: true,      // Add crack decal that lingers 2s
  crackColor: '#442200',
},
camera: {
  type: 'screenShake',
  intensity: 6,
  duration: 200,
}
```

**stomp:**
```javascript
telegraph: {
  radius: 1.5,
  color: '#FFCC44',       // Lighter, less threatening
  growSpeed: 2.0,         // Faster fill
},
impact: {
  ringCount: 1,           // Single ring
  ringSpeed: 1.5,         // Faster expansion
},
particles: { count: 4 },
camera: { intensity: 2, duration: 80 }
```

**pounce:**
```javascript
telegraph: {
  // ... base config
  casterMovement: {
    type: 'leap',
    startTime: 0.3,       // Begin leap at 30% through telegraph
    arcHeight: 2.0,       // Tiles above ground at apex
    landAt: 'center',     // Land at telegraph center
  }
},
particles: {
  // ... base debris
  onLand: { type: 'dust_ring', count: 6, radius: 0.5 }
}
```

---

## 3. Line/Charge Abilities (Base: `charge-animation-reference.html`)

### Base Configuration
```javascript
telegraph: { type: 'line_fixed', width: 1.0, length: 6.0, lockDirection: true }
dash: { speed: 400, trail: true, afterimages: 3 }
impact: { wallCrack: true, stunStars: true }
camera: { type: 'screenShake', intensity: 3, onWallHit: true }
```

| Ability | Telegraph | Dash | Impact | Camera | Specific Adjustments |
|---------|-----------|------|--------|--------|---------------------|
| **charge** | w1.0, len6, 800ms | 400px/s, 3 afterimages | Wall crack, stun stars | Shake 3px | **BASE** - no changes |
| **lunge** | w0.8, **len3**, **400ms** | **600px/s**, 1 afterimage | **No wall crack**, brief stun | Shake **1.5px** | Shorter, faster, less dramatic |

### Adjustment Details

**lunge:**
```javascript
telegraph: {
  width: 0.8,             // Slightly narrower
  length: 3.0,            // Half the distance
  color: '#FFCC66',       // Lighter color
},
dash: {
  speed: 600,             // Faster movement
  afterimages: 1,         // Minimal trail
  trailOpacity: 0.3,      // Faint trail
},
impact: {
  wallCrack: false,       // No environmental damage
  stunStars: false,       // No stun visual (may still stun mechanically)
  dustPuff: true,         // Small dust on stop
},
camera: {
  intensity: 1.5,
  duration: 60,
}
```

---

## 4. Cone/Breath Abilities (Base: `fire-breath-animation-reference.html`)

### Base Configuration
```javascript
telegraph: { type: 'cone_fixed', angle: Math.PI/3, radius: 4.0, lockDirection: true }
channel: { duration: 1500, tickInterval: 300, streaming: true }
particles: { type: 'flame', spawnMode: 'cone_fill', flowDirection: 'outward' }
hitDetection: 'isInsideCone()'
```

| Ability | Telegraph | Channel | Particles | Effect | Specific Adjustments |
|---------|-----------|---------|-----------|--------|---------------------|
| **fire_breath** | 60° cone, r4, 600ms | 1500ms, tick@300ms | Orange flames | Burn DoT | **BASE** - no changes |
| **frost_breath** | 60° cone, r4, 600ms | 1500ms, tick@300ms | **Ice crystals** | **Slow 40%** | Color swap, slow debuff instead of DoT |
| **poison_cloud** | **90° cone**, r3, 800ms | **2000ms**, tick@400ms | **Green mist** | **Poison DoT** | Wider angle, shorter range, lingering cloud |

### Adjustment Details

**frost_breath:**
```javascript
telegraph: {
  color: '#88CCFF',
  borderColor: '#4488CC',
},
channel: {
  color: '#AADDFF',
  particleColor: '#FFFFFF',
},
particles: {
  sprite: { pixels: ['..X..', '.XXX.', '..X..'], palette: { X: '#CCFFFF' } },  // Snowflake
  tumble: true,           // Particles rotate as they move
},
onHit: {
  debuff: 'slow',
  slowAmount: 0.4,        // 40% movement reduction
  duration: 2000,
}
```

**poison_cloud:**
```javascript
telegraph: {
  angle: Math.PI / 2,     // 90° - wider cone
  radius: 3.0,            // Shorter range
  color: '#66AA44',
  borderColor: '#448822',
},
channel: {
  duration: 2000,         // Longer channel
  tickInterval: 400,      // Slower ticks
  linger: 1000,           // Cloud persists 1s after channel ends
},
particles: {
  sprite: { type: 'cloud_puff' },
  opacity: 0.6,           // Semi-transparent
  riseSpeed: 20,          // Slowly drifts upward
},
onHit: {
  debuff: 'poison',
  damagePerTick: 3,
  duration: 4000,
}
```

---

## 5. Projectile Abilities (Base: `homing-orb-animation-reference.html`)

### Base Configuration
```javascript
telegraph: { type: 'caster_charge', duration: 500, glowColor: '#FF6600' }
projectile: { speed: 180, homing: true, turnRate: 90, sprite: 'orb' }
trail: { type: 'ember', spawnRate: 30, fadeTime: 300 }
impact: { type: 'burst', radius: 0.5, particles: 6 }
```

| Ability | Telegraph | Projectile | Trail | Impact | Specific Adjustments |
|---------|-----------|------------|-------|--------|---------------------|
| **homing_orb** | Caster glow 500ms | 180px/s, homing 90°/s | Ember trail | Burst, 6 particles | **BASE** - no changes |
| **projectile_burst** | Caster glow **400ms** | **3 projectiles**, 150px/s, **no homing** | Ember trail | Smaller burst | Multiple projectiles in spread pattern |
| **projectile_single** | Caster glow 300ms | 220px/s, **no homing** | **Minimal trail** | Burst | Fast, straight shot |
| **web_shot** | Caster glow 600ms | 120px/s, **slight homing** (30°/s) | **Strand trail** | **Splat** | Slow projectile, snare on hit |

### Adjustment Details

**projectile_burst:**
```javascript
telegraph: {
  duration: 400,
  burstIndicator: true,   // Show 3 small orbs forming
},
projectile: {
  count: 3,
  spreadAngle: Math.PI / 6,  // 30° spread
  speed: 150,
  homing: false,          // Straight lines
  turnRate: 0,
},
impact: {
  radius: 0.3,            // Smaller per-projectile
  particles: 3,
}
```

**projectile_single:**
```javascript
telegraph: {
  duration: 300,          // Faster windup
},
projectile: {
  speed: 220,             // Faster travel
  homing: false,
  sprite: 'arrow',        // Different visual (not orb)
},
trail: {
  spawnRate: 60,          // Less frequent
  opacity: 0.4,           // Fainter
}
```

**web_shot:**
```javascript
telegraph: {
  duration: 600,
  color: '#CCCCCC',       // Grey/white
},
projectile: {
  speed: 120,             // Slow
  homing: true,
  turnRate: 30,           // Weak homing
  sprite: 'web_glob',
},
trail: {
  type: 'strand',         // Trailing web strands
  strandCount: 3,
  strandLength: 40,
},
impact: {
  type: 'splat',          // Web splatter visual
  splatRadius: 1.0,
  lingerDuration: 500,    // Visible splat on ground
},
onHit: {
  debuff: 'snare',
  snareAmount: 0.6,       // 60% slow
  duration: 2500,
}
```

---

## 6. Beam Abilities (Base: `beam-animation-reference.html`)

### Base Configuration (life_drain)
```javascript
telegraph: { type: 'beam_telegraph', style: 'dashed', width: 0.3, maxRange: 4, lockDirection: true }
channel: { type: 'beam_channel', duration: 200, trackingSpeed: 0, particleFlow: 'reverse' }
particles: { spawnMode: 'along_beam', flowDirection: 'reverse' }
casterFeedback: { type: 'heal_pulse' }
hitDetection: 'isInsideBeam()'
```

| Ability | Telegraph | Channel | Particles | Feedback | Specific Adjustments |
|---------|-----------|---------|-----------|----------|---------------------|
| **life_drain** | Dashed, w0.3, r4, 600ms | 200ms, no tracking | Along beam → caster | Heal pulse | **BASE** - no changes |
| **void_beam** | **Solid charging**, **w1.0**, r15, 1500ms | **2000ms**, **tracking 30°/s** | **Terminus spray** | None | Wide sustained beam with slow tracking |

### Adjustment Details

**void_beam:**
```javascript
telegraph: {
  type: 'beam_telegraph',
  style: 'solid',
  chargeIntensity: true,  // Grows brighter over telegraph
  startOpacity: 0.1,
  endOpacity: 0.5,
  width: 1.0,             // Much wider
  maxRange: 15,           // Very long range
  lockDirection: false,   // Allows tracking during channel
},
channel: {
  duration: 2000,         // 2 second sustained beam
  trackingSpeed: 30,      // Slowly follows player
  tickInterval: 400,      // Damage every 400ms
  particleFlow: 'forward',
  flicker: { amount: 0.08, speed: 12 },  // Visual shimmer
},
particles: {
  spawnMode: 'beam_terminus',
  velocity: { radialRange: [30, 80], tangentialRange: [-40, 40] },
},
camera: {
  duringTelegraph: { type: 'sustained_rumble', intensity: 0.5, growWithCharge: true },
  duringChannel: { type: 'sustained_shake', intensity: 1.5 },
},
casterFeedback: null,     // No heal - this is pure damage
```

---

## Quick Reference Table - All 22 Abilities

| # | Ability | Base Ref | Telegraph Type | Key Differentiators |
|---|---------|----------|----------------|---------------------|
| 1 | melee_swing | melee | `arc_fill` 90° | Base melee |
| 2 | claw_swipe | melee | `arc_fill` 120° | Triple slash lines |
| 3 | bite | melee | `arc_fill` 60° | Lunge forward, chomp |
| 4 | double_strike | melee | `arc_fill` 90°×2 | Two sequential hits |
| 5 | tail_whip | melee | `arc_fill` 140° rear | Hits behind, knockback |
| 6 | sweep | melee | `arc_fill` 180° | Half-circle coverage |
| 7 | ground_slam | ground | `circle_grow` r2 | Base AOE |
| 8 | heavy_slam | ground | `circle_grow` r3 | Larger, ground crack |
| 9 | stomp | ground | `circle_grow` r1.5 | Small, fast |
| 10 | pounce | ground | `circle_grow` r2 | Caster leaps to center |
| 11 | charge | charge | `line_fixed` len6 | Base charge |
| 12 | lunge | charge | `line_fixed` len3 | Short, fast |
| 13 | fire_breath | breath | `cone_fixed` 60° | Burn DoT |
| 14 | frost_breath | breath | `cone_fixed` 60° | Slow debuff |
| 15 | poison_cloud | breath | `cone_fixed` 90° | Lingering poison |
| 16 | homing_orb | projectile | `caster_charge` | Homing projectile |
| 17 | projectile_burst | projectile | `caster_charge` | 3 projectiles, spread |
| 18 | projectile_single | projectile | `caster_charge` | Fast straight shot |
| 19 | web_shot | projectile | `caster_charge` | Slow proj, snare |
| 20 | life_drain | beam | `beam_telegraph` dashed | Heal on hit |
| 21 | void_beam | beam | `beam_telegraph` solid | Sustained tracking |
| 22 | *(passive)* | — | — | No animation needed |

---

## Implementation Priority

### Phase 1 - Core Types (6 abilities)
Implement one ability per base reference to validate all systems work.
- `melee_swing`, `ground_slam`, `charge`, `fire_breath`, `homing_orb`, `life_drain`

### Phase 2 - Variants (10 abilities)
Add parameter variations to existing renderers.
- `claw_swipe`, `bite`, `heavy_slam`, `stomp`, `lunge`, `frost_breath`, `projectile_burst`, `projectile_single`, `web_shot`, `void_beam`

### Phase 3 - Complex Behaviors (5 abilities)
Abilities requiring additional logic (sequences, movement, lingering effects).
- `double_strike`, `tail_whip`, `sweep`, `pounce`, `poison_cloud`

---

## Animation Reference Files

| File | Location |
|------|----------|
| Melee Swing | `tools/animation/melee-swing-animation-reference.html` |
| Ground Slam | `tools/animation/ground-slam-animation-reference.html` |
| Charge | `tools/animation/charge-animation-reference.html` |
| Fire Breath | `tools/animation/fire-breath-animation-reference.html` |
| Homing Orb | `tools/animation/homing-orb-animation-reference.html` |
| Beam | `tools/animation/beam-animation-reference.html` |
