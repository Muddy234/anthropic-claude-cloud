# Pixel-Based Attack Animation System Implementation Plan

## Master Attack Animation Tracker

This section tracks all attack animations based on **signature-ability-implementation-plan-v2.md**.

**Design Philosophy (from v2):**
- Each monster gets ONE signature ability + ONE passive/mechanic
- No two monsters share the same primary ability (differentiated by passives if same ability)
- Every ability has a mandatory visual telegraph

---

### ALL MONSTERS & SIGNATURE ABILITIES (29 Monsters)

#### Volcanic Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Passive |
|---------|-------------------|-----------|-----------|---------|
| Magma Slime | fire_breath | 1000ms | 60° cone r6 | death_explosion |
| Obsidian Golem | ground_slam | 1000ms | Circle r3 | thorns + death_explosion |
| Cinder Wisp | projectile_burst | 600ms | 3 projectiles 30° | teleport_when_hurt |
| Flame Bat | bite | 300ms | 60° arc r1 | evasion |
| Ash Walker | life_drain | 600ms | Range 4 | regeneration |
| Salamander | tail_whip | 500ms | 180° arc r2.5 | berserk |
| Pyro Cultist | homing_orb | 800ms | Homing projectile | regeneration |

#### Cave Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Passive |
|---------|-------------------|-----------|-----------|---------|
| Cave Bat | claw_swipe | 350ms | 90° arc r2 | pack_hunter |
| Stone Lurker | ground_slam | 1000ms | Circle r3 | ambusher + armored |
| Mushroom Sprite | poison_cloud | 700ms | 90° cone r4 | regeneration |
| Crystal Spider | web_shot | 300ms | Projectile | poison_touch |

#### Undead Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Passive |
|---------|-------------------|-----------|-----------|---------|
| Skeletal Warrior | melee_swing | 600ms | 120° arc r2 | call_for_help |
| Phantom | life_drain | 600ms | Range 4 | ethereal |
| Bone Golem | heavy_slam | 1200ms | Circle r2.5 | split + berserk |

#### Aquatic Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Passive |
|---------|-------------------|-----------|-----------|---------|
| Deep Crawler | double_strike | 500ms | 90° arc r2 | armored |
| Tide Serpent | lunge | 400ms | Line w1 l3 | berserk |

#### Shadow Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Passive |
|---------|-------------------|-----------|-----------|---------|
| Shadow Stalker | shadow_step | 200ms | Circle r2 | ambusher + ethereal |
| Void Touched | void_beam | 1500ms | Line w1 r15 | adaptive_resistance + teleport_when_hurt |

#### Ice Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Passive |
|---------|-------------------|-----------|-----------|---------|
| Frost Elemental | frost_breath | 1000ms | 75° cone r5 | frost_aura |
| Ice Golem | stomp | 600ms | Circle r2 | thorns + undying |
| Frozen Husk | lunge | 400ms | Line w1 l3 | berserk |
| Blizzard Spirit | projectile_single | 400ms | Projectile | evasion |

#### Combat Variety Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Passive |
|---------|-------------------|-----------|-----------|---------|
| Shadow Imp | teleport_strike | 500ms | Circle r2 | evasion |
| Temple Sentinel | heavy_slam | 1200ms | Circle r2.5 | shield_barrier |
| Stone Guardian | ground_slam | 1000ms | Circle r3 | thorns + armored |
| Demon Knight | charge | 800ms | Line w2 r10 | enrage |
| Giant Spider | sweep | 1000ms | 270° arc r3 | ambusher |
| Shield Bearer | stomp | 600ms | Circle r2 | shield_barrier |
| Flame Sprite | pounce | 500ms | Circle r1 | fire_aura |

---

### UNIQUE SIGNATURE ABILITY ANIMATIONS NEEDED

**Note:** In v2 design, each monster has ONE signature ability (no primary/secondary split).

#### MELEE ATTACKS (12 unique)

| Attack Name | Telegraph | AOE Shape | Used By | Status |
|-------------|-----------|-----------|---------|--------|
| claw_swipe | 350ms | 90° arc r2 | Cave Bat | [ ] Not Started |
| bite | 300ms | 60° arc r1 | Flame Bat | [ ] Not Started |
| melee_swing | 600ms | 120° arc r2 | Skeletal Warrior | [ ] Not Started |
| pounce | 500ms | Circle r1 | Flame Sprite | [ ] Not Started |
| charge | 800ms | Line w2 r10 | Demon Knight | [ ] Not Started |
| heavy_slam | 1200ms | Circle r2.5 | Temple Sentinel, Bone Golem | [ ] Not Started |
| ground_slam | 1000ms | Circle r3 | Obsidian Golem, Stone Lurker, Stone Guardian | [ ] Not Started |
| sweep | 1000ms | 270° arc r3 | Giant Spider | [ ] Not Started |
| stomp | 600ms | Circle r2 | Ice Golem, Shield Bearer | [ ] Not Started |
| lunge | 400ms | Line w1 l3 | Tide Serpent, Frozen Husk | [ ] Not Started |
| double_strike | 500ms | 90° arc r2 | Deep Crawler | [ ] Not Started |
| tail_whip | 500ms | 180° arc r2.5 | Salamander | [ ] Not Started |

#### ASSASSIN / TELEPORT ATTACKS (2 unique)

| Attack Name | Telegraph | AOE Shape | Used By | Status |
|-------------|-----------|-----------|---------|--------|
| shadow_step | 200ms | Circle r2 | Shadow Stalker | [ ] Not Started |
| teleport_strike | 500ms | Circle r2 | Shadow Imp | [ ] Not Started |

#### RANGED PROJECTILE ATTACKS (4 unique)

| Attack Name | Telegraph | AOE Shape | Used By | Status |
|-------------|-----------|-----------|---------|--------|
| web_shot | 300ms | Projectile | Crystal Spider | [ ] Not Started |
| projectile_single | 400ms | Projectile | Blizzard Spirit | [ ] Not Started |
| projectile_burst | 600ms | 3 projectiles 30° | Cinder Wisp | [ ] Not Started |
| homing_orb | 800ms | Homing projectile | Pyro Cultist | [ ] Not Started |

#### BREATH / CONE ATTACKS (3 unique)

| Attack Name | Telegraph | AOE Shape | Used By | Status |
|-------------|-----------|-----------|---------|--------|
| fire_breath | 1000ms | 60° cone r6 | Magma Slime | [ ] Not Started |
| frost_breath | 1000ms | 75° cone r5 | Frost Elemental | [ ] Not Started |
| poison_cloud | 700ms | 90° cone r4 | Mushroom Sprite | [ ] Not Started |

#### BEAM / DRAIN ATTACKS (2 unique)

| Attack Name | Telegraph | AOE Shape | Used By | Status |
|-------------|-----------|-----------|---------|--------|
| void_beam | 1500ms | Line w1 r15 | Void Touched | [ ] Not Started |
| life_drain | 600ms | Range 4 | Ash Walker, Phantom | [ ] Not Started |

---

### SUMMARY TOTALS

| Category | Count |
|----------|-------|
| Melee Attacks | 12 |
| Assassin/Teleport Attacks | 2 |
| Ranged Projectile Attacks | 4 |
| Breath/Cone Attacks | 3 |
| Beam/Drain Attacks | 2 |
| **TOTAL UNIQUE ANIMATIONS** | **23** |

---

### ANIMATION PRIORITY TIERS

**Priority 1 - High Usage (used by 2+ monsters)**
- ground_slam (Obsidian Golem, Stone Lurker, Stone Guardian)
- stomp (Ice Golem, Shield Bearer)
- lunge (Tide Serpent, Frozen Husk)
- heavy_slam (Temple Sentinel, Bone Golem)
- life_drain (Ash Walker, Phantom)

**Priority 2 - Signature Attacks (define monster identity)**
- shadow_step (Shadow Stalker - 200ms = instant feel)
- teleport_strike (Shadow Imp - teleport behind)
- void_beam (Void Touched - sweeping beam)
- double_strike (Deep Crawler - rapid combo)
- poison_cloud (Mushroom Sprite - area denial)
- frost_breath (Frost Elemental - slow cone)
- fire_breath (Magma Slime - lingering damage)

**Priority 3 - Single-Use / Standard**
- claw_swipe (Cave Bat)
- bite (Flame Bat)
- melee_swing (Skeletal Warrior)
- pounce (Flame Sprite)
- charge (Demon Knight)
- sweep (Giant Spider)
- tail_whip (Salamander)
- web_shot (Crystal Spider)
- projectile_single (Blizzard Spirit)
- projectile_burst (Cinder Wisp)
- homing_orb (Pyro Cultist)

---

## Detailed Animation Specifications

### MELEE ATTACKS (12)

#### claw_swipe (Cave Bat)
- **Sprite Size:** 16x12
- **Frames:** 4 (350ms telegraph)
- **Visual:** Three parallel scratch marks arcing outward (90° arc r2)
- **Colors:** White edge (#FFFFFF), gray trail (#888888)
- **Motion:** Fast sweep from upper-left to lower-right
- **Passive Synergy:** pack_hunter bonus damage when allies nearby

#### bite (Flame Bat)
- **Sprite Size:** 12x12
- **Frames:** 4 (300ms telegraph - very fast)
- **Visual:** Jaw/fang closing motion with blood splatter (60° arc r1)
- **Colors:** White fangs (#FFFFFF), red blood (#CC3333)
- **Motion:** Snap closed with particle burst
- **Passive Synergy:** evasion makes this hit-and-run style

#### melee_swing (Skeletal Warrior)
- **Sprite Size:** 18x14
- **Frames:** 6 (600ms telegraph)
- **Visual:** Standard sword arc with bone/rust aesthetic (120° arc r2)
- **Colors:** Rusty blade (#8B7355), bone grip (#DEB887), edge (#CCCCCC)
- **Motion:** Wide horizontal swing with slight upward finish
- **Passive Synergy:** call_for_help when hurt - coordinated assault

#### pounce (Flame Sprite)
- **Sprite Size:** 20x16
- **Frames:** 6 (500ms telegraph)
- **Visual:** Blur trail showing leap trajectory + fire burst on landing (circle r1)
- **Colors:** Fire trail (#FF6B35), impact burst (#FFAA00)
- **Motion:** Arc trajectory with fiery landing explosion
- **Passive Synergy:** fire_aura damages melee attackers

#### charge (Demon Knight)
- **Sprite Size:** 24x16
- **Frames:** 8 (800ms telegraph)
- **Visual:** Horizontal dash trail with impact shockwave (line w2 r10)
- **Colors:** Speed lines (#FFFFFF), impact (#FF4444), dark energy (#6C5CE7)
- **Motion:** Horizontal streak ending in knockback
- **Passive Synergy:** enrage on low HP makes charges more frequent

#### heavy_slam (Temple Sentinel, Bone Golem)
- **Sprite Size:** 20x20
- **Frames:** 10 (1200ms telegraph)
- **Visual:** Downward arc ending in ground crack/shockwave (circle r2.5)
- **Colors:** Weapon trail (#CCCCCC), impact (#FFCC00), cracks (#666666)
- **Motion:** Overhead swing down with expanding ground ring
- **Passive Synergy:** shield_barrier (Temple) / split+berserk (Bone Golem)

#### ground_slam (Obsidian Golem, Stone Lurker, Stone Guardian)
- **Sprite Size:** 24x24 (radius 3)
- **Frames:** 10 (1000ms telegraph)
- **Visual:** Concentric expanding rings from impact + screen shake (circle r3)
- **Colors:** Inner ring (#FFAA00), outer rings (#886644), debris (#AA8866)
- **Motion:** Rings expand outward with rock debris particles
- **Passive Synergy:** thorns/armored makes them tanky slam-bots

#### sweep (Giant Spider)
- **Sprite Size:** 28x20 (270° arc)
- **Frames:** 10 (1000ms telegraph)
- **Visual:** Wide arc covering 270 degrees - only behind is safe
- **Colors:** White edge (#FFFFFF), trail fade (#888888 → #444444)
- **Motion:** Massive sweep leaving afterimage trail
- **Passive Synergy:** ambusher starts combat with surprise sweep

#### stomp (Ice Golem, Shield Bearer)
- **Sprite Size:** 16x16 (radius 2)
- **Frames:** 6 (600ms telegraph)
- **Visual:** Circular shockwave from foot impact + stun stars (circle r2)
- **Colors:** Impact (#88CCFF for ice / #FFCC00 for stone), stun (#FFFF00)
- **Motion:** Quick expanding circle with stun effect (500ms stun)
- **Passive Synergy:** thorns+undying (Ice) / shield_barrier (Shield Bearer)

#### lunge (Tide Serpent, Frozen Husk)
- **Sprite Size:** 18x12
- **Frames:** 5 (400ms telegraph - tight timing)
- **Visual:** Quick dash with forward thrust (line w1 l3)
- **Colors:** Speed blur (#AAAAAA), point (#74B9FF for ice / #0984E3 for water)
- **Motion:** Horizontal dart with sharp point leading
- **Passive Synergy:** berserk on low HP = frequent lunges

#### double_strike (Deep Crawler)
- **Sprite Size:** 14x14
- **Frames:** 6 (500ms telegraph, 2 rapid hits)
- **Visual:** Two X-shaped slash marks in rapid succession (90° arc r2)
- **Colors:** First hit (#FFFFFF), second hit (#FFCCCC)
- **Motion:** Slash → brief pause → second slash
- **Passive Synergy:** armored = trades hits confidently

#### tail_whip (Salamander)
- **Sprite Size:** 20x14 (180° arc)
- **Frames:** 6 (500ms telegraph)
- **Visual:** 180° horizontal sweep + knockback force lines (180° arc r2.5)
- **Colors:** Fiery tail (#FF6B35), motion blur (#FF4400), force lines (#FFAA00)
- **Motion:** Low sweep with knockback indicators
- **Passive Synergy:** berserk = faster whips when hurt

### ASSASSIN / TELEPORT ATTACKS (2)

#### shadow_step (Shadow Stalker)
- **Sprite Size:** 16x16
- **Frames:** 4 (200ms telegraph - near instant!)
- **Visual:** Dark smoke poof at origin + reappear slash (circle r2)
- **Colors:** Shadow (#333344), purple accent (#6C5CE7)
- **Motion:** Disappear effect → reappear with instant slash
- **Passive Synergy:** ambusher+ethereal = ultimate assassin

#### teleport_strike (Shadow Imp)
- **Sprite Size:** 20x16
- **Frames:** 8 (500ms telegraph)
- **Visual:** Shadow portal opens behind target + strike emerges (circle r2)
- **Colors:** Portal (#6C5CE7), slash (#CC44CC), warning (#FF4444)
- **Motion:** Portal opens → figure emerges → strike
- **Passive Synergy:** evasion makes them slippery after strike

### RANGED PROJECTILE ATTACKS (4)

#### web_shot (Crystal Spider)
- **Sprite Size:** 10x10 (projectile) + 16x16 (impact/root)
- **Frames:** 4 travel + 4 impact (300ms telegraph)
- **Visual:** Spinning web ball → web splatter showing root effect
- **Colors:** Web (#EEEEEE), sticky strands (#CCCCCC), crystal shimmer (#A8E6CF)
- **Motion:** Spiraling projectile → expanding web net on target
- **Passive Synergy:** poison_touch applies poison when webbed target is hit

#### projectile_single (Blizzard Spirit)
- **Sprite Size:** 8x6
- **Frames:** 3 travel + 2 impact (400ms telegraph)
- **Visual:** Simple ice shard bolt
- **Colors:** Ice blue (#74B9FF), frost (#FFFFFF), core (#A8E6CF)
- **Motion:** Straight flight with small impact spark
- **Passive Synergy:** evasion = kiting attacker

#### projectile_burst (Cinder Wisp)
- **Sprite Size:** 8x8 each (x3 projectiles)
- **Frames:** 4 travel + 3 impact each (600ms telegraph)
- **Visual:** Three spread projectiles with fire trails at 30° spread
- **Colors:** Fire (#FF6B35), core (#FFAA00), trail (#FF4400)
- **Motion:** Fan out at 30° angles with trailing particles
- **Passive Synergy:** teleport_when_hurt = shoot then vanish

#### homing_orb (Pyro Cultist)
- **Sprite Size:** 12x12
- **Frames:** 6 (looping travel) + 4 impact (800ms telegraph)
- **Visual:** Pulsing orb with tracking particle trail - follows target
- **Colors:** Core (#FFAA00), glow (#FF6B35), trail (#FF4400)
- **Motion:** Slow weaving path toward target (walkable speed)
- **Passive Synergy:** regeneration = sustain while orbs track

### BREATH / CONE ATTACKS (3)

#### fire_breath (Magma Slime)
- **Sprite Size:** 24x20 (cone 60° r6)
- **Frames:** 8 + lingering effect (1000ms telegraph)
- **Visual:** Expanding flame cone with ember particles + lingering ground fire
- **Colors:** Core (#FFAA00), flames (#FF6B35), embers (#FF4400), linger (#AA3300)
- **Motion:** Expands from mouth, particles scatter, leaves ground hazard (3s)
- **Passive Synergy:** death_explosion when killed = punish melee

#### frost_breath (Frost Elemental)
- **Sprite Size:** 24x18 (cone 75° r5)
- **Frames:** 8 (1000ms telegraph)
- **Visual:** Ice crystal cone with frost particles + slow indicator
- **Colors:** Core (#74B9FF), crystals (#A8E6CF), frost (#FFFFFF), slow (#88CCFF)
- **Motion:** Expanding cone with crystalline shards
- **Effect:** 50% slow for 3s on targets hit
- **Passive Synergy:** frost_aura slows nearby enemies passively

#### poison_cloud (Mushroom Sprite)
- **Sprite Size:** 20x16 (cone 90° r4)
- **Frames:** 10 (700ms telegraph)
- **Visual:** Billowing toxic cloud with spore particles - area denial
- **Colors:** Cloud (#7D8B3B), spores (#AACC44), dark (#445522)
- **Motion:** Expanding cloud that lingers (4s duration)
- **Effect:** Poison 3 damage/tick for duration
- **Passive Synergy:** regeneration = outlast poisoned foes

### BEAM / DRAIN ATTACKS (2)

#### void_beam (Void Touched)
- **Sprite Size:** Variable length x 8 width (w1 r15)
- **Frames:** 12 (1500ms telegraph, 2s sustained sweep)
- **Visual:** Dark energy beam with crackling edges - sweeps room
- **Colors:** Core (#1E1E2E), edges (#6C5CE7), crackle (#A29BFE)
- **Motion:** Beam sweeps across area over 2 seconds - keep moving laterally
- **Passive Synergy:** adaptive_resistance + teleport_when_hurt = nightmare boss

#### life_drain (Ash Walker, Phantom)
- **Sprite Size:** Variable length x 6 width (range 4)
- **Frames:** 8 (600ms telegraph)
- **Visual:** Green/purple drain tether with soul particles flowing back
- **Colors:** Beam (#6C5CE7), souls (#A29BFE), life (#2ECC71)
- **Motion:** Tether connects to target, particles flow back to caster
- **Effect:** Heals 50% of damage dealt
- **Passive Synergy:** regeneration (Ash Walker) / ethereal (Phantom)

---

## Overview

Adapt the existing pixelated sprite creation system (used for monster sprites) to create engaging attack effect animations. The current attack effects use code-based canvas drawing; this plan replaces them with the same character-grid + palette + delta animation system used for monsters.

---

## Current System Analysis

### Pixel Sprite System (Monster Sprites)
**Files:** `js/rendering/sprite-renderer.js`, `js/rendering/sprite-animations.js`

- **Sprite Definition:** Character grids (16x16) with palette mappings
- **Animation:** Delta-based frame modifications + transforms (scale, offset, palette mod)
- **Caching:** Multi-layer (rendered sprite, composed frames, animation state)
- **Phases:** windup → strike → recovery (with frame arrays per phase)

### Current Attack Effects (Code-Based)
**Files:** `js/effects/melee-slash-effect.js`, `js/effects/monster-attack-effects.js`

- **MeleeSlashEffect:** Arc geometry + particle system (WINDUP → SLASH → FADE)
- **MonsterMagicEffect:** Travel orb + burst ring (TRAVEL → BURST)
- **MonsterRangedEffect:** Arrow projectile + trail (TRAVEL → IMPACT)

---

## Implementation Plan

### Phase 1: Create Pixel Effect Sprite Definitions

**New File:** `js/rendering/effect-sprites.js`

Define pixel-art sprites for each effect type using the same format as monster sprites:

#### 1.1 Melee Slash Sprites (per weapon type)
```javascript
const SLASH_SPRITES = {
    sword_slash: {
        name: 'sword_slash',
        width: 24,
        height: 16,
        pixels: [
            "........................",
            "....WWW.................",
            "...WWWWW......W.........",
            "..WWWWWWW....WWW........",
            // ... arc shape with motion blur effect
        ],
        palette: {
            'W': '#FFFFFF',  // White blade edge
            'S': '#CCCCCC',  // Silver blade body
            'G': '#888888',  // Gray trail
            'T': '#666666'   // Fading trail
        }
    },
    mace_impact: { /* heavy crushing shape */ },
    spear_thrust: { /* narrow piercing shape */ },
    axe_cleave: { /* wide arc shape */ },
    dagger_slash: { /* quick small arc */ },
    unarmed_strike: { /* fist/punch shape */ }
};
```

#### 1.2 Magic Effect Sprites (per element)
```javascript
const MAGIC_SPRITES = {
    fire_orb: {
        name: 'fire_orb',
        width: 12,
        height: 12,
        pixels: [
            "....FFFF....",
            "...FFFFFF...",
            "..FFFFFFFF..",
            ".FFCCCCCCFF.",
            // ... glowing orb with core
        ],
        palette: {
            'F': '#FF6B35',  // Fire orange
            'C': '#FFAA00',  // Core yellow
            'G': '#FF4400'   // Glow
        }
    },
    fire_burst: { /* explosion sprite */ },
    ice_orb: { /* blue orb */ },
    ice_burst: { /* crystal shatter */ },
    // ... other elements
};
```

#### 1.3 Projectile Sprites
```javascript
const PROJECTILE_SPRITES = {
    arrow: {
        name: 'arrow',
        width: 12,
        height: 6,
        pixels: [
            "......TTTTPP",
            "SSSSSSSSSSPP",
            "......TTTTPP"
        ],
        palette: {
            'P': '#AA6633',  // Point
            'S': '#8B4513',  // Shaft
            'T': '#DEB887'   // Feathers
        }
    },
    magic_bolt: { /* generic magic projectile */ }
};
```

#### 1.4 Impact/Burst Sprites
```javascript
const IMPACT_SPRITES = {
    slash_impact: { /* hit spark lines */ },
    blunt_impact: { /* crushing shockwave */ },
    pierce_impact: { /* small puncture spark */ },
    magic_burst: { /* expanding ring */ }
};
```

---

### Phase 2: Create Effect Animation Definitions

**New File:** `js/rendering/effect-animations.js`

Define animation frames using the delta system:

#### 2.1 Melee Slash Animation (8-12 frames)
```javascript
const SLASH_ANIMATIONS = {
    sword_slash: {
        // Arc sweeps from start to end angle
        frames: [
            {
                duration: 25,
                rotation: -45,  // Starting angle
                scaleX: 0.3,
                scaleY: 0.8,
                alpha: 0.7,
                deltas: {},
                description: 'Arc begins'
            },
            {
                duration: 25,
                rotation: -20,
                scaleX: 0.6,
                scaleY: 1.0,
                alpha: 0.9,
                deltas: { /* extend trail pixels */ },
                description: 'Arc expanding'
            },
            // ... 6-10 more frames sweeping through
            {
                duration: 30,
                rotation: 45,
                scaleX: 1.0,
                scaleY: 1.0,
                alpha: 1.0,
                deltas: { /* full arc visible */ },
                description: 'Peak of slash'
            },
            // ... fade frames
        ]
    }
};
```

#### 2.2 Magic Projectile Animation (travel + burst)
```javascript
const MAGIC_ANIMATIONS = {
    fire: {
        travel: [
            {
                duration: 30,
                scaleX: 1.0,
                scaleY: 1.0,
                paletteMod: { brightness: 1.0 },
                deltas: {},
                description: 'Orb traveling'
            },
            {
                duration: 30,
                scaleX: 1.1,
                scaleY: 0.9,
                paletteMod: { brightness: 1.2 },
                deltas: { /* pulse effect */ },
                description: 'Orb pulsing'
            }
            // ... alternating pulse frames
        ],
        burst: [
            {
                duration: 25,
                scaleX: 1.0,
                scaleY: 1.0,
                paletteMod: { brightness: 1.5, alpha: 1.0 },
                deltas: {},
                description: 'Initial burst'
            },
            {
                duration: 25,
                scaleX: 1.5,
                scaleY: 1.5,
                paletteMod: { brightness: 1.3, alpha: 0.8 },
                deltas: { /* expand outward */ },
                description: 'Expanding'
            },
            // ... 6+ more frames expanding and fading
        ]
    }
};
```

#### 2.3 Projectile Animation
```javascript
const PROJECTILE_ANIMATIONS = {
    arrow: {
        travel: [
            { duration: 20, rotation: 0, scaleX: 1.0 },
            { duration: 20, rotation: 0, scaleX: 1.05 }  // Slight stretch
        ],
        impact: [
            { duration: 15, scaleX: 0.8, alpha: 1.0 },
            { duration: 15, scaleX: 0.5, alpha: 0.6 },
            { duration: 15, scaleX: 0.3, alpha: 0.2 }
        ]
    }
};
```

---

### Phase 3: Create Pixel Effect Renderer

**New File:** `js/rendering/effect-renderer.js`

A specialized renderer for effect sprites (similar to SpriteRenderer but optimized for effects):

```javascript
const EffectRenderer = {
    cache: new Map(),

    // Render a single effect sprite frame
    draw(ctx, sprite, x, y, scale, options = {}) {
        // Similar to SpriteRenderer.draw but with:
        // - Rotation support (for directional effects)
        // - Alpha/opacity support
        // - Additive blending option (for glows)
        // - Motion blur option
    },

    // Build animated frame with deltas applied
    buildFrame(baseSprite, frameData) {
        // Apply deltas to create modified sprite
        // Cache result for reuse
    },

    // Apply palette modifications (element colors)
    applyPaletteMod(sprite, paletteMod) {
        // Modify colors based on brightness, saturation, alpha
    }
};
```

---

### Phase 4: Create Effect Animation Controller

**New File:** `js/rendering/effect-animator.js`

Manages animation state for active effects:

```javascript
const EffectAnimator = {
    activeEffects: new Map(),  // effectId -> animation state

    // Start a new effect animation
    startEffect(effectId, effectType, options) {
        // Create state: { type, phase, frameIndex, timer, ... }
    },

    // Update animation state based on elapsed time
    update(deltaTime) {
        // Advance frame timers
        // Transition between phases
        // Mark completed effects
    },

    // Get current frame data for rendering
    getCurrentFrame(effectId) {
        // Returns { sprite, transforms, finished }
    },

    // Cleanup completed effects
    removeEffect(effectId) {
        // Clear from activeEffects map
    }
};
```

---

### Phase 5: Integrate with Existing Effect Systems

Modify the existing effect files to use pixel-based rendering:

#### 5.1 Update MeleeSlashEffect (`js/effects/melee-slash-effect.js`)

```javascript
// Add import/reference to new systems
// In render():
if (EffectRenderer && SLASH_SPRITES[weaponType]) {
    // Use pixel-based rendering
    const frameData = EffectAnimator.getCurrentFrame(effect.id);
    EffectRenderer.draw(ctx, frameData.sprite, screenX, screenY, scale, {
        rotation: effect.angle,
        alpha: frameData.transforms.alpha,
        flipX: effect.facingLeft
    });
} else {
    // Fall back to existing code-based rendering
    this.drawCleaveShape(ctx, effect, ...);
}
```

#### 5.2 Update MonsterMagicEffect (`js/effects/monster-attack-effects.js`)

```javascript
// Similar pattern: check for pixel sprites, use if available, else fallback
// In travel phase: render orb sprite along path
// In burst phase: render expanding burst sprite
```

#### 5.3 Update MonsterRangedEffect

```javascript
// Render arrow/bolt sprite rotated to face direction
// On impact: play impact animation
```

---

### Phase 6: Element Color Variation System

Create a system to generate element-colored variants from base sprites:

```javascript
const ElementPalettes = {
    fire:   { primary: '#FF6B35', secondary: '#FFAA00', glow: '#FF4400' },
    ice:    { primary: '#74B9FF', secondary: '#A8E6CF', glow: '#0984E3' },
    water:  { primary: '#0984E3', secondary: '#74B9FF', glow: '#0056B3' },
    earth:  { primary: '#C4A35A', secondary: '#8B7355', glow: '#6B4423' },
    nature: { primary: '#2ECC71', secondary: '#A8E6CF', glow: '#27AE60' },
    death:  { primary: '#6C5CE7', secondary: '#A29BFE', glow: '#5B4FCF' },
    holy:   { primary: '#FFEAA7', secondary: '#FFFFFF', glow: '#F9CA24' },
    dark:   { primary: '#636E72', secondary: '#2D3436', glow: '#1E272E' },
    arcane: { primary: '#A29BFE', secondary: '#DDA0DD', glow: '#9B59B6' }
};

function getElementVariant(baseSprite, element) {
    // Replace palette colors with element colors
    // Cache the result
}
```

---

### Phase 7: Particle System Enhancement

Enhance existing particle system to use tiny pixel sprites instead of circles:

```javascript
const PARTICLE_SPRITES = {
    spark: { width: 3, height: 3, pixels: [".W.", "WWW", ".W."], palette: { 'W': '#FFFFFF' } },
    ember: { width: 4, height: 4, pixels: [...], palette: {...} },
    shard: { width: 5, height: 3, pixels: [...], palette: {...} }
};

// In particle rendering, optionally use sprites instead of ctx.arc()
```

---

## File Structure Summary

```
js/rendering/
├── sprite-renderer.js      (existing - monster sprites)
├── sprite-animations.js    (existing - monster animations)
├── sprite-integration.js   (existing - monster integration)
├── effect-sprites.js       (NEW - effect sprite definitions)
├── effect-animations.js    (NEW - effect animation frames)
├── effect-renderer.js      (NEW - effect rendering engine)
└── effect-animator.js      (NEW - effect state management)

js/effects/
├── melee-slash-effect.js   (MODIFY - integrate pixel rendering)
└── monster-attack-effects.js (MODIFY - integrate pixel rendering)
```

---

## Implementation Order

1. **effect-sprites.js** - Define base sprites for all effect types
2. **effect-animations.js** - Define animation frame sequences
3. **effect-renderer.js** - Create rendering engine with rotation/alpha
4. **effect-animator.js** - Create animation state controller
5. **Integrate with MeleeSlashEffect** - Add pixel rendering path
6. **Integrate with MonsterMagicEffect** - Add pixel rendering path
7. **Integrate with MonsterRangedEffect** - Add pixel rendering path
8. **Element color system** - Automatic palette swapping
9. **Particle sprites** - Optional enhancement

---

## Verification Plan

1. **Visual Testing:**
   - Load game and trigger player melee attacks with different weapons
   - Verify slash animation plays correctly with proper rotation
   - Test each element type (fire, ice, etc.) for color accuracy

2. **Monster Attack Testing:**
   - Aggro monsters and observe their attack animations
   - Verify magic projectiles show orb travel + burst
   - Verify ranged projectiles show arrow flight + impact

3. **Performance Testing:**
   - Monitor frame rate during combat with multiple enemies
   - Verify sprite caching is working (check cache size)
   - Ensure no memory leaks from effect cleanup

4. **Fallback Testing:**
   - Temporarily disable pixel sprites to verify code-based fallback works
   - Ensure graceful degradation

---

## Key Design Decisions

1. **Graceful Fallback:** Keep existing code-based effects as fallback
2. **Same Pattern as Monsters:** Use identical data structures for consistency
3. **Element Palette Swapping:** Generate color variants from base sprites
4. **Rotation Support:** Effects need rotation (monsters don't)
5. **Alpha/Blending:** Effects need transparency and additive blending
6. **Separate Files:** Don't clutter monster sprite files with effect sprites

---

## Technical Notes from Codebase Review

### Sprite Definition Format (Confirmed)
```javascript
{
    name: 'sprite_key',           // Unique identifier for caching
    width: 16,                    // Pixel width
    height: 16,                   // Pixel height
    pixels: [                     // Array of strings, one per row
        "................",       // '.' = transparent
        ".....OOOO.......",       // Letters = palette keys
    ],
    palette: {                    // Character -> hex color mapping
        'O': '#FF6B35',
        'E': '#FFFF00'
    }
}
```

### Animation Frame Format (Confirmed)
```javascript
{
    duration: 65,                 // Milliseconds
    verticalOffset: -1,           // Pixels to shift vertically
    horizontalOffset: 0,          // Pixels to shift horizontally (optional)
    scaleX: 1.0,                  // Horizontal scale factor
    scaleY: 0.95,                 // Vertical scale factor
    paletteMod: {                 // Optional palette modifications
        brightness: 1.1           // 0.0-2.0 brightness multiplier
    },
    deltas: {                     // Pixel modifications by row/col
        10: { 3: '.', 4: '.' },   // Row 10: set cols 3,4 to transparent
        11: { 2: 'O' }            // Row 11: set col 2 to 'O'
    },
    description: 'Human-readable description'
}
```

### SpriteRenderer.draw() Signature
```javascript
draw(ctx, sprite, x, y, scale = 2, options = {})
// options: { palette, flipX, outline, outlineColor, glow, glowColor, glowSize }
```

### Key Distinction: Effect vs Monster Animations
- **Monster animations** modify the monster's own sprite (body squash/stretch)
- **Effect animations** are separate sprites that exist in world space (slashes, projectiles, bursts)
- Effect sprites need: world position, rotation, alpha, movement interpolation
- Monster sprites only need: attachment to entity, facing direction flip
