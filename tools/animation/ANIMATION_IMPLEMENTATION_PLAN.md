# Enemy Ability Animation System Implementation Plan

## Overview

This plan implements a comprehensive animation system for enemy abilities based on the 6 reference implementations in `tools/animation/*.html`. Each ability is a **variant** of a base reference, requiring only parameter adjustments rather than new rendering logic.

---

## ⚠️ Key Risks and Architecture Decisions

### Risk 1: Existing Telegraph System is Insufficient

**Discovery:** The existing `renderTelegraphs()` in `enemy-ability-system.js` (lines 1914-2001) draws basic shapes but **does NOT support the specialized renderers needed**:

| Existing | Needed | Gap |
|----------|--------|-----|
| `circle` (static) | `circle_grow` (animated) | No growth animation |
| `arc`/`cone` (dynamic direction) | `arc_fill`, `cone_fixed` (locked direction) | Direction recalculates every frame |
| `line` (dynamic direction) | `line_fixed` (locked direction) | Direction recalculates every frame |
| ❌ | `caster_charge` | Not implemented |
| ❌ | `beam_telegraph` | Not implemented |
| Hardcoded red/yellow | Element-based colors | No color system |

**Decision:** Phase 0 is now scoped as "Enable + Audit + Extend shape dispatch" rather than just "flip it on."

---

### Architecture Decision: Two-Pass Rendering

All reference docs are explicit about layering:
```
TileRenderer → EffectRenderer.drawGround() → EntityRenderer → EffectRenderer.drawOverlay() → UIRenderer
```

| Pass | Content | Layer |
|------|---------|-------|
| **Ground Pass** | Telegraphs | BELOW entities |
| **Overlay Pass** | Impacts, slash arcs, ring bursts, beam channels, particles | ABOVE entities |

**Renderer.js requires TWO insertion points**, not one.

---

### Architecture Decision: Channel Phase is Foundational

The channel phase is NOT a beam-specific concern. Three of six base types require it:

| Base Type | Channel Usage |
|-----------|---------------|
| fire_breath | 1500ms channel with tick damage |
| poison_cloud | 2000ms channel + 1000ms linger |
| beam/life_drain | 200-2000ms sustained channel |

**The phase lifecycle must be:**
```javascript
// Instant abilities:
telegraph → impact → done

// Sustained abilities:
telegraph → channel → fading → done
```

This is a **Phase 0 foundation** requirement, not discovered during implementation.

---

### Architecture Decision: Telegraph Phase is Event-Driven, Not Timer-Driven

**CRITICAL:** The telegraph→impact/channel transition is NOT timer-driven. The ability system calls `resolve(effectId)` at the exact moment damage is dealt, which transitions the visual.

If EffectAnimator auto-advances on its own timer, the visual can desync from gameplay — the telegraph might end 1-2 frames before or after damage lands, breaking player trust in the warning system.

| Phase Transition | Trigger |
|------------------|---------|
| `telegraph` → `impact`/`channel` | **External** - ability system calls `resolve()` |
| `channel` → `fading` | Timer-driven (purely visual) |
| `impact` → `done` | Timer-driven (purely visual) |
| `fading` → `done` | Timer-driven (purely visual) |

---

### Architecture Decision: Recovery Phase is NOT in EffectAnimator

The recovery phase (enemy takes 1.15x–1.35x damage, can't move or act) appears in all timeline diagrams but is a **gameplay state**, not a visual effect phase.

| System | Responsibility |
|--------|----------------|
| `EffectAnimator` | Visual phases: telegraph, impact, channel, fading |
| `enemy-ability-system.js` | Gameplay state: `enterRecovery()`, recovery multiplier, action lock |

**Recovery is managed by `enemy-ability-system.js` via `enterRecovery()`, not by EffectAnimator.**

---

### Architecture Decision: Cancellation Handling is Required

**Scenarios that must cancel effects cleanly:**
- Enemy dies mid-telegraph
- Enemy dies mid-channel
- Enemy gets stunned during void_beam
- Player kills enemy while fire_breath is active

**Required:** `EffectAnimator.cancel(effectId)` must instantly clean up:
- Active telegraph visuals
- Channel particles and beams
- Pending damage applications

**Exception:** Projectiles with `persistsAfterCasterDeath: true` must NOT be cancelled when the caster dies. The `cancelByEnemy()` filter must check this flag.

If an enemy dies and a beam stays visible for 2 more seconds, it looks broken. But if an enemy dies and an in-flight homing orb vanishes mid-air, that also looks broken.

---

### Architecture Decision: Hit Detection Location

The plan references `isInsideBeam()` and `isInsideCone()` but they need a home:

| Function | Purpose | Location |
|----------|---------|----------|
| `isInsideBeam(targetX, targetY, beamStart, beamEnd, width)` | Gameplay hit detection | `enemy-ability-system.js` or `js/utils/geometry.js` |
| `isInsideCone(targetX, targetY, coneOrigin, angle, arcAngle, radius)` | Gameplay hit detection | Same |
| `isInsideArc(...)` | Melee arc hit detection | Same |

These are **gameplay functions**, not rendering functions. They integrate with the existing damage system.

**Note:** The existing ability system may use simple radius checks. The integration plan must specify how shape-specific checks replace or augment existing behavior.

---

### Architecture Decision: Data-Driven Rendering

**CRITICAL:** Renderers must read colors and parameters from `effect.config`, NOT hardcode values.

```javascript
// WRONG - hardcoded color
ctx.fillStyle = `rgba(255, 100, 100, ${alpha})`;

// CORRECT - data-driven color
const color = effect.config.telegraph.color || '#FF6464';
ctx.fillStyle = hexToRgba(color, alpha);
```

This applies to ALL renderers. The whole point of the data-driven approach is that renderers read from config, allowing variants to change colors via data only.

---

### Performance Consideration: Particle Budget

With 21 abilities, some spawning 10+ particles every 50-80ms during channel, multiple simultaneous abilities could spawn hundreds of particles.

**Budget:**
- Global particle cap: **250 particles**
- When cap hit: Oldest particles die early (FIFO)
- Glow effects (beam, void_beam): Note as expensive overdraw - optimize later if needed

---

## Base Reference Summary

| Base Reference | Abilities | Core Mechanics |
|----------------|-----------|----------------|
| **melee-swing** | 6 | `arc_fill` telegraph, `slash_arc` impact, `arc_edge` particles |
| **ground-slam** | 4 | `circle_grow` telegraph, `ring_burst` impact, radial particles |
| **charge** | 2 | `line_fixed` telegraph, dash trail, wall collision |
| **fire-breath** | 3 | `cone_fixed` telegraph, channel phase, streaming particles |
| **homing-orb** | 4 | `caster_charge` telegraph, ProjectileSystem, homing behavior |
| **beam** | 2 | `beam_telegraph`, `beam_channel`, line hit detection |

**Total: 21 abilities across 6 base types**

---

## Ability Animation Tracker

### Legend
- Status: `[ ]` Not Started | `[~]` In Progress | `[x]` Complete
- Phase: `P0` Foundation | `P1` Core Type | `P2` Variant | `P3` Complex Behavior

---

### 1. Melee Arc Abilities (Base: `melee-swing-animation-reference.html`)

| # | Ability | Status | Phase | Key Differentiators |
|---|---------|--------|-------|---------------------|
| 1 | melee_swing | [x] | P1 | **BASE** - 90° arc, r1.5, white slash |
| 2 | claw_swipe | [x] | P2 | 120° arc, triple slash lines, red tint |
| 3 | bite | [x] | P2 | 60° arc, r1.0, lunge 0.5 tiles, chomp effect |
| 4 | double_strike | [x] | P3 | Two sequential 90° arcs (CW then CCW) |
| 5 | tail_whip | [x] | P3 | 140° rear-facing arc, knockback, dust |
| 6 | sweep | [x] | P3 | 180° semicircle, screen shake |

**Base Configuration:**
```javascript
melee_swing: {
    baseRef: 'melee',
    telegraph: {
        type: 'arc_fill',
        arcAngle: Math.PI / 2,  // 90 degrees
        radius: 1.5,            // tiles
        color: '#FF6464',       // Red - read by renderer, not hardcoded
        borderColor: '#FFAAAA',
        directed: true,
        lockDirection: true     // CRITICAL: direction set at start, not recalculated
    },
    impact: { type: 'slash_arc', sweepDirection: 'cw', duration: 150, color: '#FFFFFF' },
    particles: { spawnMode: 'arc_edge', color: '#FFCCCC' },
    camera: { type: 'screenNudge', intensity: 2 }
}
```

---

### 2. Circle AoE Abilities (Base: `ground-slam-animation-reference.html`)

| # | Ability | Status | Phase | Key Differentiators |
|---|---------|--------|-------|---------------------|
| 7 | ground_slam | [x] | P1 | **BASE** - r3.0, 800ms, 2 rings, shake 4px |
| 8 | heavy_slam | [x] | P2 | r4.0, 1200ms, 3 rings + ground crack, shake 6px |
| 9 | stomp | [x] | P2 | r1.5, 400ms, 1 ring, shake 2px |
| 10 | pounce | [x] | P3-HIGH-RISK | r2.0, 600ms, **caster leaps to center** |

**Base Configuration:**
```javascript
ground_slam: {
    baseRef: 'ground',
    telegraph: {
        type: 'circle_grow',
        radius: 3.0,            // tiles (per reference doc)
        color: '#FFAA00',       // Orange - read by renderer
        borderColor: '#FFDD00',
        growDuration: 'match',  // match telegraph duration
        fillOpacity: 0.25
    },
    impact: { type: 'ring_burst', ringCount: 2, color: '#FFAA00' },
    particles: { type: 'debris', count: 8, spawnMode: 'radial', color: '#AA7744' },
    camera: { type: 'screenShake', intensity: 4, duration: 150 }
}
```

---

### 3. Line/Charge Abilities (Base: `charge-animation-reference.html`)

| # | Ability | Status | Phase | Key Differentiators |
|---|---------|--------|-------|---------------------|
| 11 | charge | [x] | P1 | **BASE** - w1.0, len6, 800ms, 3 afterimages |
| 12 | lunge | [x] | P2 | w0.8, len3, 400ms, 1 afterimage, no wall crack |

**Base Configuration:**
```javascript
charge: {
    baseRef: 'charge',
    telegraph: {
        type: 'line_fixed',
        width: 1.0,             // tiles
        length: 6.0,            // tiles
        color: '#FF4444',       // Red
        borderColor: '#FF8888',
        lockDirection: true     // CRITICAL: direction locked at telegraph start
    },
    dash: { speed: 400, trail: true, afterimages: 3 },
    impact: { wallCrack: true, stunStars: true },
    camera: { type: 'screenShake', intensity: 3, onWallHit: true }
}
```

---

### 4. Cone/Breath Abilities (Base: `fire-breath-animation-reference.html`)

| # | Ability | Status | Phase | Key Differentiators |
|---|---------|--------|-------|---------------------|
| 13 | fire_breath | [x] | P1 | **BASE** - 60° cone, r4, 1500ms channel, burn DoT |
| 14 | frost_breath | [x] | P2 | Blue/white colors, slow 40% debuff |
| 15 | poison_cloud | [x] | P3 | 90° cone, r3, green, 2000ms channel, **lingering 1s** |

**Base Configuration:**
```javascript
fire_breath: {
    baseRef: 'breath',
    telegraph: {
        type: 'cone_fixed',
        angle: Math.PI / 3,     // 60 degrees
        radius: 4.0,            // tiles
        color: '#FF6600',       // Orange-red
        borderColor: '#FFAA00',
        lockDirection: true     // CRITICAL: direction locked at telegraph start
    },
    channel: {
        duration: 1500,         // ms
        tickInterval: 300,      // damage every 300ms (5 ticks total)
        streaming: true
    },
    particles: { type: 'flame', spawnMode: 'cone_fill', flowDirection: 'outward', color: '#FF4400' },
    hitDetection: 'isInsideCone'
}

// Variant example - frost_breath changes colors only
frost_breath: {
    baseRef: 'breath',
    telegraph: {
        type: 'cone_fixed',
        angle: Math.PI / 3,
        radius: 4.0,
        color: '#4488FF',       // Blue
        borderColor: '#88CCFF',
        lockDirection: true
    },
    channel: { duration: 1500, tickInterval: 300, streaming: true },
    particles: { type: 'ice', spawnMode: 'cone_fill', flowDirection: 'outward', color: '#AADDFF' },
    hitDetection: 'isInsideCone'
}
```

---

### 5. Projectile Abilities (Base: `homing-orb-animation-reference.html`)

| # | Ability | Status | Phase | Key Differentiators |
|---|---------|--------|-------|---------------------|
| 16 | homing_orb | [x] | P1 | **BASE** - 180px/s, homing 90°/s, ember trail |
| 17 | projectile_burst | [x] | P2 | 3 projectiles, 30° spread, no homing |
| 18 | projectile_single | [x] | P2 | 220px/s, no homing, minimal trail |
| 19 | web_shot | [x] | P2 | 120px/s, weak homing (30°/s), strand trail, snare |

**Base Configuration:**
```javascript
homing_orb: {
    baseRef: 'projectile',
    telegraph: {
        type: 'caster_charge',
        duration: 500,
        glowColor: '#FF6600'
    },
    projectile: {
        speed: 180,             // pixels/sec
        homing: true,
        turnRate: 90,           // degrees/sec
        sprite: 'orb',
        color: '#FF4400',
        persistsAfterCasterDeath: true  // CRITICAL: orb keeps flying if caster dies
    },
    trail: { type: 'ember', spawnRate: 30, fadeTime: 300, color: '#FF8800' },
    impact: { type: 'burst', radius: 0.5, particles: 6, color: '#FFAA00' }
}
```

---

### 6. Beam Abilities (Base: `beam-animation-reference.html`)

| # | Ability | Status | Phase | Key Differentiators |
|---|---------|--------|-------|----------------------|
| 20 | life_drain | [x] | P1 | **BASE** - Dashed, w0.3, r4, particles flow → caster, heal |
| 21 | void_beam | [x] | P2 | Solid, w1.0, r15, purple, 2000ms, **tracking 30°/s** |
| 20 | life_drain | [ ] | P1 | **BASE** - Dashed, w0.3, r4, particles flow → caster, heal |
| 21 | void_beam | [ ] | P2 | Solid, w1.0, r15, purple, 2000ms, **tracking 30°/s** |

**Base Configuration:**
```javascript
life_drain: {
    baseRef: 'beam',
    telegraph: {
        type: 'beam_telegraph',
        style: 'dashed',
        width: 0.3,             // tiles
        maxRange: 4,            // tiles
        color: '#88FF88',       // Green (life magic)
        lockDirection: true
    },
    channel: {
        type: 'beam_channel',
        duration: 200,          // ms
        trackingSpeed: 0,       // degrees/sec (life_drain doesn't track)
        particleFlow: 'reverse' // particles flow toward caster
    },
    particles: { spawnMode: 'along_beam', flowDirection: 'reverse', color: '#44FF44' },
    casterFeedback: { type: 'heal_pulse', color: '#88FF88' },
    hitDetection: 'isInsideBeam'
}

// Variant - void_beam
void_beam: {
    baseRef: 'beam',
    telegraph: {
        type: 'beam_telegraph',
        style: 'solid',
        width: 1.0,
        maxRange: 15,
        color: '#8844FF',       // Purple (void magic)
        lockDirection: true
    },
    channel: {
        type: 'beam_channel',
        duration: 2000,
        trackingSpeed: 30,      // degrees/sec - beam slowly tracks target
        particleFlow: 'outward'
    },
    particles: { spawnMode: 'along_beam', flowDirection: 'outward', color: '#AA66FF' },
    hitDetection: 'isInsideBeam'
}
```

---

## Summary Statistics

| Phase | Count | Abilities |
|-------|-------|-----------|
| **P0 - Foundation** | - | Architecture, shape dispatch, lifecycle |
| **P1 - Core Types** | 6 | melee_swing, ground_slam, charge, fire_breath, homing_orb, life_drain |
| **P2 - Variants** | 10 | claw_swipe, bite, heavy_slam, stomp, lunge, frost_breath, projectile_burst, projectile_single, web_shot, void_beam |
| **P3 - Complex** | 5 | double_strike, tail_whip, sweep, pounce ⚠️, poison_cloud |
| **TOTAL** | **21** | |

---

## Implementation Phases

### Phase 0: Foundation (Architecture + Enable)

**Goal:** Establish architecture, extend shape dispatch, validate before proceeding

#### 0.1 Two-Pass Render Integration
**File:** `js/ui/renderer.js`

Add TWO insertion points:
```javascript
// === GROUND PASS (before entities) ===
// Around line 1190, after tile rendering
if (typeof EffectRenderer !== 'undefined') {
    EffectRenderer.drawGround(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
}

// ... entity rendering happens here ...

// === OVERLAY PASS (after entities) ===
// After entity rendering, before UI
if (typeof EffectRenderer !== 'undefined') {
    EffectRenderer.drawOverlay(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
}
```

#### 0.2 Effect Animator Lifecycle
**File:** `js/rendering/effect-animator.js`

Implement phase-based lifecycle with **event-driven telegraph resolution**:
```javascript
const EffectAnimator = {
    activeEffects: [],

    // CRITICAL: direction parameter required for all directed abilities
    startEffect(abilityId, x, y, direction, telegraphMs, radius, enemyId) {
        const config = ABILITY_EFFECTS[abilityId];
        const effect = {
            id: generateId(),
            abilityId,
            enemyId,
            x, y,
            direction,              // Locked at start, never recalculated
            phase: 'telegraph',
            phaseTimer: telegraphMs,// For progress calculation only, NOT auto-advance
            maxTimer: telegraphMs,
            config,
        };
        this.activeEffects.push(effect);
        return effect.id;
    },

    update(deltaTime) {
        for (const effect of this.activeEffects) {
            // Update timer for progress calculation
            if (effect.phase === 'telegraph') {
                effect.phaseTimer -= deltaTime;
                // Telegraph does NOT auto-advance - waits for resolve()
            } else {
                // Channel, impact, fading ARE timer-driven
                effect.phaseTimer -= deltaTime;
                if (effect.phaseTimer <= 0) {
                    this.advancePhase(effect);
                }
            }
        }
        this.cleanup();
    },

    // CRITICAL: Called by ability system at exact moment damage is dealt
    // This is what transitions telegraph → impact/channel
    resolve(effectId) {
        const effect = this.activeEffects.find(e => e.id === effectId);
        if (!effect || effect.phase !== 'telegraph') return;

        if (effect.config.channel) {
            effect.phase = 'channel';
            effect.phaseTimer = effect.config.channel.duration;
        } else {
            effect.phase = 'impact';
            effect.phaseTimer = effect.config.impact?.duration || 200;
        }
    },

    advancePhase(effect) {
        // Only called for timer-driven phases (NOT telegraph)
        switch (effect.phase) {
            case 'channel':
                if (effect.config.channel?.linger) {
                    effect.phase = 'fading';
                    effect.phaseTimer = effect.config.channel.linger;
                } else {
                    effect.phase = 'done';
                }
                break;
            case 'impact':
            case 'fading':
                effect.phase = 'done';
                break;
        }
    },

    // CRITICAL: Cancel must clean up immediately
    cancel(effectId) {
        const index = this.activeEffects.findIndex(e => e.id === effectId);
        if (index !== -1) {
            this.activeEffects.splice(index, 1);
        }
    },

    // Called when enemy dies - cancel all their effects
    // EXCEPTION: Projectiles with persistsAfterCasterDeath survive
    cancelByEnemy(enemyId) {
        this.activeEffects = this.activeEffects.filter(e => {
            if (e.enemyId === enemyId) {
                // Check if this effect should persist after caster death
                if (e.config.projectile?.persistsAfterCasterDeath) {
                    // Keep projectile alive, but clear enemyId so future
                    // cancelByEnemy calls don't affect it
                    e.enemyId = null;
                    return true;
                }
                return false;  // Remove effect
            }
            return true;  // Keep effect (different enemy)
        });
    },

    cleanup() {
        this.activeEffects = this.activeEffects.filter(e => e.phase !== 'done');
    },

    // Get progress for rendering (0 to 1)
    getProgress(effect) {
        if (effect.phase === 'telegraph') {
            return 1 - (effect.phaseTimer / effect.maxTimer);
        }
        // Other phases have their own progress calculations
        return effect.phaseTimer / effect.maxTimer;
    }
};
```

**NOTE: Recovery phase is NOT here.** Recovery is a gameplay state managed by `enemy-ability-system.js` via `enterRecovery()`. EffectAnimator only handles visual phases.

#### 0.3 Extend Shape Dispatch
**File:** `js/systems/enemy-ability-system.js` (or new `js/rendering/effect-renderer.js`)

Replace basic shapes with specialized renderers:
```javascript
renderTelegraph(ctx, effect, camX, camY, tileSize, offsetX) {
    const config = effect.config;
    const progress = EffectAnimator.getProgress(effect);

    switch (config.telegraph.type) {
        case 'arc_fill':
            this.drawArcFill(ctx, effect, progress, tileSize, offsetX);
            break;
        case 'circle_grow':
            this.drawCircleGrow(ctx, effect, progress, tileSize, offsetX);
            break;
        case 'line_fixed':
            this.drawLineFixed(ctx, effect, progress, tileSize, offsetX);
            break;
        case 'cone_fixed':
            this.drawConeFixed(ctx, effect, progress, tileSize, offsetX);
            break;
        case 'caster_charge':
            this.drawCasterCharge(ctx, effect, progress, tileSize, offsetX);
            break;
        case 'beam_telegraph':
            this.drawBeamTelegraph(ctx, effect, progress, tileSize, offsetX);
            break;
        default:
            // Fallback to existing basic circle
            this.drawBasicCircle(ctx, effect, progress, tileSize, offsetX);
    }
}
```

#### 0.4 Hit Detection Functions
**File:** `js/utils/geometry.js` (NEW) or add to `enemy-ability-system.js`

```javascript
const GeometryUtils = {
    isInsideCone(targetX, targetY, originX, originY, direction, arcAngle, radius) {
        const dx = targetX - originX;
        const dy = targetY - originY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > radius) return false;

        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = angleToTarget - direction;

        // Normalize to -PI to PI
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        return Math.abs(angleDiff) <= arcAngle / 2;
    },

    isInsideBeam(targetX, targetY, startX, startY, endX, endY, width) {
        // Project point onto line, check distance
        const dx = endX - startX;
        const dy = endY - startY;
        const lengthSq = dx * dx + dy * dy;

        if (lengthSq === 0) return false;

        const t = Math.max(0, Math.min(1,
            ((targetX - startX) * dx + (targetY - startY) * dy) / lengthSq
        ));

        const projX = startX + t * dx;
        const projY = startY + t * dy;

        const distSq = (targetX - projX) ** 2 + (targetY - projY) ** 2;
        return distSq <= (width / 2) ** 2;
    },

    isInsideArc(targetX, targetY, originX, originY, direction, arcAngle, innerRadius, outerRadius) {
        const dx = targetX - originX;
        const dy = targetY - originY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > outerRadius || distance < innerRadius) return false;

        const angleToTarget = Math.atan2(dy, dx);
        let angleDiff = angleToTarget - direction;

        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        return Math.abs(angleDiff) <= arcAngle / 2;
    }
};
```

#### 0.5 Create ABILITY_EFFECTS Data Structure
**File:** `js/effects/ability-effects-data.js` (NEW)

Central data definition for all 21 abilities (see configurations in ability sections above).

#### 0.6 Particle Budget System
**File:** `js/rendering/particle-system.js` (or existing)

```javascript
const ParticleSystem = {
    MAX_PARTICLES: 250,
    particles: [],

    spawn(config) {
        if (this.particles.length >= this.MAX_PARTICLES) {
            // Kill oldest particle (FIFO)
            this.particles.shift();
        }
        this.particles.push(config);
    }
};
```

#### 0.7 Color Utility
**File:** `js/utils/color-utils.js` (NEW or add to existing utils)

```javascript
const ColorUtils = {
    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
};
```

**Phase 0 Deliverables:**
- [x] Two-pass rendering in renderer.js
- [x] EffectAnimator with event-driven telegraph and timer-driven channel/impact/fading
- [x] EffectAnimator.resolve() method for telegraph→impact transition
- [x] EffectAnimator.cancel() and cancelByEnemy() with projectile exception
- [x] Shape dispatch extended with 6 telegraph types
- [x] Hit detection functions (isInsideCone, isInsideBeam, isInsideArc)
- [x] ABILITY_EFFECTS data structure with colors defined
- [x] Particle budget enforced
- [x] Color utility for data-driven rendering

---

### Phase 1: Core Types (6 abilities)

**Goal:** Implement one ability per base reference to validate all renderers work

| Ability | Base Ref | New Renderer Components |
|---------|----------|------------------------|
| melee_swing | melee | `arc_fill` telegraph, `slash_arc` impact |
| ground_slam | ground | `circle_grow` telegraph, `ring_burst` impact |
| charge | charge | `line_fixed` telegraph, dash trail system |
| fire_breath | breath | `cone_fixed` telegraph, channel tick system |
| homing_orb | projectile | `caster_charge` telegraph, ProjectileSystem |
| life_drain | beam | `beam_telegraph`, particle flow system |

#### 1.1 Implement Telegraph Renderers (Data-Driven)
**File:** `js/rendering/effect-renderer.js`

```javascript
// GROUND PASS - These render below entities
// CRITICAL: All colors read from config, never hardcoded

drawArcFill(ctx, effect, progress, tileSize, offsetX) {
    const config = effect.config.telegraph;
    const arcAngle = config.arcAngle;
    const radius = config.radius * tileSize;
    const startAngle = effect.direction - arcAngle / 2;
    const endAngle = effect.direction + arcAngle / 2;

    // Color from config, NOT hardcoded
    const fillColor = config.color || '#FF6464';
    const borderColor = config.borderColor || '#FFAAAA';
    const fillAlpha = 0.3 + progress * 0.4;
    const borderAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.2;

    ctx.beginPath();
    ctx.moveTo(effect.screenX, effect.screenY);
    ctx.arc(effect.screenX, effect.screenY, radius * progress, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = ColorUtils.hexToRgba(fillColor, fillAlpha);
    ctx.fill();
    ctx.strokeStyle = ColorUtils.hexToRgba(borderColor, borderAlpha);
    ctx.lineWidth = 2;
    ctx.stroke();
}

drawCircleGrow(ctx, effect, progress, tileSize, offsetX) {
    const config = effect.config.telegraph;
    const maxRadius = config.radius * tileSize;
    const currentRadius = maxRadius * (0.3 + progress * 0.7);  // Grow from 30% to 100%

    // Color from config, NOT hardcoded
    const fillColor = config.color || '#FFAA00';
    const borderColor = config.borderColor || '#FFDD00';
    const fillAlpha = config.fillOpacity || 0.25;
    const borderAlpha = 0.5 + Math.sin(Date.now() * 0.01) * 0.2;

    ctx.beginPath();
    ctx.arc(effect.screenX, effect.screenY, currentRadius, 0, Math.PI * 2);
    ctx.fillStyle = ColorUtils.hexToRgba(fillColor, fillAlpha);
    ctx.fill();
    ctx.strokeStyle = ColorUtils.hexToRgba(borderColor, borderAlpha);
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Pattern for all renderers:
// 1. Read config values
// 2. Apply defaults if not specified
// 3. Use ColorUtils.hexToRgba() for all colors
// 4. Never hardcode RGB values
```

#### 1.2 Implement Impact Renderers (Data-Driven)
```javascript
// OVERLAY PASS - These render above entities

drawSlashArc(ctx, effect, progress) {
    const config = effect.config.impact;
    const color = config.color || '#FFFFFF';
    // ... use color from config
}

drawRingBurst(ctx, effect, progress) {
    const config = effect.config.impact;
    const ringCount = config.ringCount;
    const color = config.color || '#FFAA00';

    for (let i = 0; i < ringCount; i++) {
        const ringProgress = (progress + i * 0.2) % 1;
        const radius = effect.maxRadius * ringProgress;
        ctx.beginPath();
        ctx.arc(effect.screenX, effect.screenY, radius, 0, Math.PI * 2);
        ctx.strokeStyle = ColorUtils.hexToRgba(color, 1 - ringProgress);
        ctx.stroke();
    }
}
```

#### 1.3 Integrate with Combat Loop
**File:** `js/systems/combat-master.js`

```javascript
// In update loop
EffectAnimator.update(deltaTime);

// When enemy dies
EffectAnimator.cancelByEnemy(enemy.id);
```

**File:** `js/systems/enemy-ability-system.js`

```javascript
// When starting an ability
const effectId = EffectAnimator.startEffect(
    ability.id,
    enemy.gridX, enemy.gridY,
    direction,
    ability.windUp,
    ability.range,
    enemy.id
);

// When damage is dealt (after windUp timer expires)
EffectAnimator.resolve(effectId);

// After ability completes, enter recovery (gameplay state, not visual)
this.enterRecovery(enemy, ability.recovery);
```

---

### Phase 2: Variants (10 abilities)

**Goal:** Add parameter variations to existing renderers - minimal new code

| Ability | Base | Key Parameter Changes |
|---------|------|----------------------|
| claw_swipe | melee_swing | `arcAngle: 120°`, `multiLine: 3`, `color: '#FF4444'` |
| bite | melee_swing | `arcAngle: 60°`, `radius: 1.0`, lunge 0.5 |
| heavy_slam | ground_slam | `radius: 4.0`, `ringCount: 3`, ground crack |
| stomp | ground_slam | `radius: 1.5`, `ringCount: 1`, fast 400ms |
| lunge | charge | `length: 3`, `speed: 600`, no wall crack |
| frost_breath | fire_breath | `color: '#4488FF'`, slow debuff, ice particles |
| projectile_burst | homing_orb | `count: 3`, `spread: 30°`, no homing |
| projectile_single | homing_orb | `speed: 220`, no homing, arrow sprite |
| web_shot | homing_orb | `speed: 120`, `turnRate: 30`, `color: '#CCCCCC'` |
| void_beam | life_drain | `width: 1.0`, `tracking: 30°/s`, `color: '#8844FF'` |

**Implementation:** Update `ABILITY_EFFECTS` data with variant configs. Renderers automatically use the different colors and parameters.

---

### Phase 3: Complex Behaviors (5 abilities)

**Goal:** Abilities requiring additional logic beyond parameter changes

#### 3.1 Sequential Effects (double_strike, sweep)
```javascript
double_strike: {
    sequence: [
        { delay: 0, direction: 'cw', arcAngle: Math.PI / 2 },
        { delay: 350, direction: 'ccw', arcAngle: Math.PI / 2 }
    ]
}

sweep: {
    telegraph: { type: 'arc_fill', arcAngle: Math.PI, color: '#FF6464' },
    camera: { type: 'screenShake', intensity: 4 }
}
```

#### 3.2 Direction Offset (tail_whip)
```javascript
tail_whip: {
    telegraph: {
        type: 'arc_fill',
        arcAngle: 140 * Math.PI / 180,
        color: '#AA8866',
        directionOffset: Math.PI  // Face opposite direction from target
    }
}
```

#### 3.3 Lingering Effects (poison_cloud)
```javascript
poison_cloud: {
    telegraph: { type: 'cone_fixed', color: '#44AA44' },
    channel: {
        duration: 2000,
        linger: 1000  // Cloud persists 1s after channel ends
    },
    particles: { color: '#66CC66' }
}
```

#### 3.4 ⚠️ HIGH RISK: Caster Movement (pounce)
**This is the highest-risk item.** Pounce modifies the entity's world position during animation.

**Risks:**
- Conflict with AI pathfinding (enemy is mid-air, where does AI think it is?)
- Collision detection (is enemy solid during leap?)
- Position tracking (ability system may cache positions)

**Recommended approach:** Pull pounce into its own mini-phase or flag as post-Phase-3.

```javascript
pounce: {
    telegraph: { type: 'circle_grow', radius: 2.0, color: '#FFAA00' },
    casterMovement: {
        type: 'leap',
        startTime: 0.3,          // Begin leap at 30% through telegraph
        arcHeight: 2.0,          // Tiles above ground at peak
        landAt: 'center',        // Land at telegraph center
        // Integration requirements:
        disableAI: true,         // Disable AI during leap
        disableCollision: false, // Keep hitbox active
        updatePosition: true     // Actually move the entity
    }
}
```

---

## Critical Files to Modify

| File | Changes |
|------|---------|
| `js/ui/renderer.js` | Add TWO render calls (ground + overlay) |
| `js/systems/enemy-ability-system.js` | Integrate with EffectAnimator, call resolve(), enterRecovery() |
| `js/systems/combat-master.js` | Add EffectAnimator.update(), enemy death → cancelByEnemy() |
| `js/rendering/effect-animator.js` | Phase lifecycle with resolve(), cancel with projectile exception |
| `js/rendering/effect-renderer.js` | 6 telegraph renderers, 6 impact renderers (all data-driven) |
| `js/effects/ability-effects-data.js` | **NEW** - All 21 ability configurations with colors |
| `js/utils/geometry.js` | **NEW** - Hit detection functions |
| `js/utils/color-utils.js` | **NEW** - hexToRgba for data-driven colors |
| `js/rendering/particle-system.js` | Particle budget enforcement |

---

## Verification Plan

### Phase 0 Verification
1. ✅ Two render passes visible (test with debug borders)
2. ✅ Telegraph waits for resolve() call, does NOT auto-advance
3. ✅ Channel/impact/fading auto-advance on timer
4. ✅ Killing enemy mid-telegraph cleans up visual immediately
5. ✅ Killing enemy mid-channel cleans up visual immediately
6. ✅ Killing enemy does NOT cancel in-flight homing_orb (persistsAfterCasterDeath)
7. ✅ Shape dispatch routes to correct renderer
8. ✅ Hit detection functions return correct results
9. ✅ All renderers use colors from config (no hardcoded RGB)

### Phase 1 Verification
For each core ability:
1. Open corresponding HTML reference file in browser
2. Compare in-game animation to reference
3. Check timing matches (telegraph duration, impact duration)
4. Verify particles and camera effects match
5. Verify direction is LOCKED (not tracking player during telegraph)
6. Verify colors match config

### Phase 2 Verification
1. Each variant looks distinct from its base
2. Color changes visible (frost_breath is blue, not orange)
3. Parameter changes visible (larger radius, different arc angles)
4. Frost_breath applies slow, not burn
5. Web_shot applies snare, not damage

### Phase 3 Verification
1. double_strike: Two distinct arcs with 350ms gap
2. tail_whip: Arc faces AWAY from target
3. poison_cloud: Cloud persists 1s after channel ends
4. pounce: Caster lands at correct position, AI resumes correctly

### Performance Verification
- Monitor FPS with 10+ simultaneous telegraphs
- Verify particle count stays under 250
- Verify effect cleanup prevents memory leaks

---

## Animation Reference Files

| Base Type | File | Abilities Covered |
|-----------|------|-------------------|
| Melee Arc | `tools/animation/melee-swing-animation-reference.html` | melee_swing, claw_swipe, bite, double_strike, tail_whip, sweep |
| Circle AoE | `tools/animation/ground-slam-animation-reference.html` | ground_slam, heavy_slam, stomp, pounce |
| Line/Charge | `tools/animation/charge-animation-reference.html` | charge, lunge |
| Cone/Breath | `tools/animation/fire-breath-animation-reference.html` | fire_breath, frost_breath, poison_cloud |
| Projectile | `tools/animation/homing-orb-animation-reference.html` | homing_orb, projectile_burst, projectile_single, web_shot |
| Beam | `tools/animation/beam-animation-reference.html` | life_drain, void_beam |

---

## Quick Reference - All 21 Abilities

| # | Ability | Base Ref | Telegraph Type | Phase | Notes |
|---|---------|----------|----------------|-------|-------|
| 1 | melee_swing | melee | `arc_fill` 90° | P1 | BASE |
| 2 | claw_swipe | melee | `arc_fill` 120° | P2 | |
| 3 | bite | melee | `arc_fill` 60° | P2 | |
| 4 | double_strike | melee | `arc_fill` 90°×2 | P3 | Sequential |
| 5 | tail_whip | melee | `arc_fill` 140° rear | P3 | Direction offset |
| 6 | sweep | melee | `arc_fill` 180° | P3 | Screen shake |
| 7 | ground_slam | ground | `circle_grow` r3 | P1 | BASE |
| 8 | heavy_slam | ground | `circle_grow` r4 | P2 | |
| 9 | stomp | ground | `circle_grow` r1.5 | P2 | |
| 10 | pounce | ground | `circle_grow` r2 | P3 | ⚠️ HIGH RISK - caster movement |
| 11 | charge | charge | `line_fixed` len6 | P1 | BASE |
| 12 | lunge | charge | `line_fixed` len3 | P2 | |
| 13 | fire_breath | breath | `cone_fixed` 60° | P1 | BASE - channel |
| 14 | frost_breath | breath | `cone_fixed` 60° | P2 | Blue colors |
| 15 | poison_cloud | breath | `cone_fixed` 90° | P3 | Green, lingering |
| 16 | homing_orb | projectile | `caster_charge` | P1 | BASE - persists after death |
| 17 | projectile_burst | projectile | `caster_charge` | P2 | |
| 18 | projectile_single | projectile | `caster_charge` | P2 | |
| 19 | web_shot | projectile | `caster_charge` | P2 | Gray/white |
| 20 | life_drain | beam | `beam_telegraph` dashed | P1 | BASE - channel, green |
| 21 | void_beam | beam | `beam_telegraph` solid | P2 | Purple, tracking |
