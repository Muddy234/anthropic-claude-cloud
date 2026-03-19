# Enemy Ability Animation System Implementation Plan

## Overview

This plan implements a comprehensive animation system for enemy abilities based on the reference implementations in `tools/animation/*.html`. The system will provide rich visual feedback through telegraphs, impact effects, particles, and screen shake.

**Key Discovery:** The telegraph system is already implemented in `enemy-ability-system.js` (lines 1914-2001) but `renderTelegraphs()` is **NOT called** in the render loop. Phase 1 will activate this immediately.

---

## Ability Animation Tracker

### Legend
- Status: `[ ]` Not Started | `[~]` In Progress | `[x]` Complete
- Priority: `P1` Boss/Elite | `P2` Tier 1 | `P3` Tier 2 | `P4` Tier 3

---

### AoE/Ground Attacks (Circle Telegraph)

| Ability | Status | Priority | Monster(s) | Notes |
|---------|--------|----------|------------|-------|
| ground_slam | [ ] | P1 | Obsidian Golem, Stone Guardian, Stone Lurker | Reference: ground-slam-animation-reference.html |
| heavy_slam | [ ] | P1 | Obsidian Golem, Bone Golem, Temple Sentinel | Similar to ground_slam, larger radius |
| stomp | [ ] | P2 | Ice Golem, Shield Bearer | Smaller AoE (radius 2), brief stun |
| shockwave | [ ] | P1 | Boss only | Ring shape (inner/outer radius) |
| meteor | [ ] | P1 | Boss only | Long telegraph, fire pool aftermath |
| quake | [ ] | P1 | Boss only | Full room AoE |

---

### Charge/Line Attacks (Line Telegraph)

| Ability | Status | Priority | Monster(s) | Notes |
|---------|--------|----------|------------|-------|
| charge | [ ] | P1 | Demon Knight | Reference: charge-animation-reference.html |
| bull_rush | [ ] | P1 | Boss only | Wider line (w3), stuns on wall |
| lunge | [ ] | P2 | Ash Walker, Tide Serpent, Frozen Husk | Short dash (length 3) |
| leaping_strike | [ ] | P1 | Boss only | Leap to target, circle on landing |
| pounce | [ ] | P3 | Flame Bat, Crystal Spider, Flame Sprite | Quick leap (range 5) |

---

### Breath/Cone Attacks (Cone Telegraph)

| Ability | Status | Priority | Monster(s) | Notes |
|---------|--------|----------|------------|-------|
| fire_breath | [ ] | P1 | Magma Slime, Salamander, Pyro Cultist | Reference: fire-breath-animation-reference.html |
| frost_breath | [ ] | P2 | Frost Elemental, Tide Serpent | 75° arc, slow effect |
| poison_cloud | [ ] | P2 | Mushroom Sprite | 90° arc, DoT area |
| void_beam | [ ] | P1 | Void Touched | Sustained line beam |

---

### Projectile Attacks (Homing/Tracking)

| Ability | Status | Priority | Monster(s) | Notes |
|---------|--------|----------|------------|-------|
| homing_orb | [ ] | P1 | Pyro Cultist, Void Touched | Reference: homing-orb-animation-reference.html |
| projectile_single | [ ] | P3 | Cinder Wisp, Blizzard Spirit | Basic projectile |
| projectile_burst | [ ] | P2 | Cinder Wisp, Pyro Cultist | 3x spread |
| projectile_volley | [ ] | P1 | Boss only | 8x 360° spread |
| bone_throw | [ ] | P3 | Skeletal Warrior, Bone Golem | Physical projectile |
| web_shot | [ ] | P2 | Crystal Spider | Root effect |
| spit | [ ] | P3 | Mushroom Sprite, Tide Serpent | Poison projectile |

---

### Melee Attacks (Arc Telegraph)

| Ability | Status | Priority | Monster(s) | Notes |
|---------|--------|----------|------------|-------|
| melee_swing | [ ] | P3 | Skeletal Warrior | 120° arc, basic swing |
| double_strike | [ ] | P2 | Deep Crawler, Shadow Stalker | 90° arc, hits twice |
| sweep | [ ] | P1 | Giant Spider | 270° arc, wide sweep |
| bite | [ ] | P4 | Flame Bat, Cave Bat, Crystal Spider | 60° arc, close range |
| claw_swipe | [ ] | P4 | Cave Bat, Deep Crawler | 90° arc |
| tail_whip | [ ] | P3 | Salamander, Tide Serpent | 180° arc behind |

---

### Special Attacks (Custom Telegraph)

| Ability | Status | Priority | Monster(s) | Notes |
|---------|--------|----------|------------|-------|
| teleport_strike | [ ] | P1 | Shadow Imp, Phantom, Shadow Stalker | Vanish + appear effect |
| shadow_step | [ ] | P1 | Shadow Stalker, Phantom | Dark particles |
| life_drain | [ ] | P2 | Ash Walker, Phantom, Void Touched | Beam to target, heal visual |
| grab_throw | [ ] | P1 | Boss only | Custom grapple animation |

---

### Support/Buff Abilities

| Ability | Status | Priority | Monster(s) | Notes |
|---------|--------|----------|------------|-------|
| heal_pulse | [ ] | P3 | Support enemies | Green healing circle |
| shield_barrier | [ ] | P2 | Temple Sentinel, Shield Bearer | Shield bubble visual |
| berserk_roar | [ ] | P2 | Various | Red aura pulse |

---

### Passive Triggers (Death/React Effects)

| Effect | Status | Priority | Monster(s) | Notes |
|--------|--------|----------|------------|-------|
| death_explosion | [ ] | P2 | Magma Slime, Mushroom Sprite | Explode on death |
| split | [ ] | P2 | Bone Golem | Split into two smaller |
| teleport_when_hurt | [ ] | P3 | Cinder Wisp, Phantom, Shadow Stalker, Void Touched | Flash + reappear |

---

**Total: 37 abilities + 3 passive triggers = 40 animations needed**

---

## Implementation Phases

### Phase 1: Foundation & Quick Wins (Immediate Impact)

**Goal:** Activate existing telegraph system + improve visual quality

#### 1.1 Enable Telegraph Rendering
**File:** `js/ui/renderer.js` (around line 1217)

Add call to render telegraphs BEFORE entity rendering (ground layer):
```javascript
// Add before entity rendering, after tiles
if (typeof EnemyAbilitySystem !== 'undefined') {
    EnemyAbilitySystem.renderTelegraphs(ctx, camX, camY, effectiveTileSize, TRACKER_WIDTH);
}
```

#### 1.2 Enhance Existing Telegraph Visuals
**File:** `js/systems/enemy-ability-system.js` (lines 1914-2001)

Improve `renderTelegraph()` with:
- Growing animation (startScale 0.3 → endScale 1.0)
- Pulsing border with configurable speed
- Element-based colors (fire=orange, ice=blue, poison=green)
- Better alpha handling for visibility

#### 1.3 Create ABILITY_EFFECTS Data Structure
**File:** `js/effects/ability-effects-data.js` (NEW)

Central data definition for all ability visuals:
```javascript
const ABILITY_EFFECTS = {
    ground_slam: {
        telegraph: { type: 'circle_grow', color: '#FFAA00', ... },
        impact: { type: 'ring_burst', rings: 3, ... },
        particles: { count: 10, sprite: {...}, ... },
        audio: { telegraph: 'sfx_rumble_build', impact: 'sfx_heavy_impact' }
    },
    // ... all 40 abilities
};
```

**Deliverable:** Telegraphs visible immediately for ALL existing abilities

---

### Phase 2: Core Animation System

**Goal:** Implement the phase-based animation lifecycle from HTML references

#### 2.1 Refactor EffectAnimator
**File:** `js/rendering/effect-animator.js`

Implement the controller pattern from HTML references:
- `startEffect(abilityId, x, y, telegraphMs, radius)` - Create effect
- `update(deltaTime)` - Advance phase timers
- `resolve(effectId)` - Telegraph → Impact transition
- `cancel(effectId)` - Interrupt handling
- Phase states: `telegraph` | `impact` | `recovery` | `done`

#### 2.2 Refactor EffectRenderer
**File:** `js/rendering/effect-renderer.js`

Implement two-pass rendering:
- `drawGround(ctx, camX, camY)` - Telegraphs below entities
- `drawOverlay(ctx, camX, camY)` - Impacts/particles above entities

Shape renderers:
- `circle_grow` - Growing circle with pulsing border
- `line_fixed` - Line locked to direction
- `cone_fixed` - Pie-slice with direction lock
- `ring_burst` - Expanding concentric rings

#### 2.3 Integrate with Combat Loop
**File:** `js/systems/combat-master.js`

Add update call:
```javascript
EffectAnimator.update(deltaTime);
```

**File:** `js/ui/renderer.js`

Add render calls at correct layers:
```javascript
EffectRenderer.drawGround(ctx, camX, camY);  // Before entities
// ... entity rendering ...
EffectRenderer.drawOverlay(ctx, camX, camY); // After entities
```

---

### Phase 3: Priority 1 Abilities (Boss/Elite)

**Goal:** Implement the 4 reference animations + remaining P1 abilities

#### 3.1 Ground Slam (Circle AoE)
- Growing orange circle telegraph
- Expanding ring burst on impact
- Rock debris particles with gravity
- Screen shake (4px, 200ms)

#### 3.2 Charge (Line/Dash)
- Red rectangle telegraph (locked direction)
- Enemy movement during dash phase
- Speed blur afterimages (4 copies)
- 3 outcome branches (hit/wall/miss)
- Stun visual on player hit

#### 3.3 Fire Breath (Cone/Channel)
- 60° pie-slice telegraph
- Channeled damage (4 ticks over 1500ms)
- Layered fire visuals (base glow + flame streams + embers)
- Burn DoT visual on affected players

#### 3.4 Homing Orb (Projectile Entity)
- Caster-attached telegraph (not ground)
- Independent projectile entity
- Homing behavior (90°/sec turn rate)
- Persists after caster death
- 3 endings (hit player/wall/timeout)

#### 3.5 Remaining P1 Abilities
- heavy_slam, meteor, quake, shockwave (circle variants)
- bull_rush, leaping_strike (charge variants)
- void_beam (sustained line)
- teleport_strike, shadow_step (special)
- sweep (wide arc)
- projectile_volley (burst pattern)

---

### Phase 4: Priority 2-4 Abilities

#### 4.1 Tier 1 Abilities (P2)
- frost_breath, poison_cloud (cone variants)
- lunge (short dash)
- double_strike (multi-hit arc)
- projectile_burst, web_shot (projectile variants)
- life_drain, shield_barrier (support)
- death_explosion, split (passive triggers)

#### 4.2 Tier 2-3 Abilities (P3-P4)
- Basic melee arcs (melee_swing, bite, claw_swipe, tail_whip)
- Simple projectiles (projectile_single, bone_throw, spit)
- Minor buffs (heal_pulse, berserk_roar)

---

### Phase 5: Polish & Integration

#### 5.1 Audio Integration
- Telegraph sounds (building tension)
- Impact sounds (satisfying feedback)
- Looping sounds for channeled abilities

#### 5.2 Screen Effects
- Screen shake system with decay
- Flash effects on big hits
- Vignette for danger states

#### 5.3 Status Effect Visuals
- Burn (orbiting flame particles)
- Stun (yellow stars)
- Slow (ice crystals)
- Poison (green bubbles)

---

## Critical Files to Modify

| File | Changes |
|------|---------|
| `js/ui/renderer.js` | Add telegraph + effect rendering calls |
| `js/systems/enemy-ability-system.js` | Enhance telegraph visuals, integrate with EffectAnimator |
| `js/systems/combat-master.js` | Add EffectAnimator.update() call |
| `js/rendering/effect-animator.js` | Refactor for phase-based lifecycle |
| `js/rendering/effect-renderer.js` | Add shape renderers, two-pass system |
| `js/effects/ability-effects-data.js` | NEW - Central data definitions |
| `js/effects/monster-attack-effects.js` | Integrate with new system |
| `js/effects/melee-slash-effect.js` | Potentially merge into unified system |

---

## Verification Plan

### Phase 1 Verification
1. Start game and enter dungeon with enemies
2. Observe telegraph shapes appearing BEFORE damage
3. Verify circle, arc, line, cone shapes render correctly
4. Check telegraph timing matches ability wind-up

### Phase 2 Verification
1. Verify phase transitions (telegraph → impact → recovery)
2. Check EffectAnimator tracks multiple simultaneous effects
3. Verify effects clean up after completion
4. Test interrupt handling (kill enemy during telegraph)

### Phase 3-4 Verification
1. Test each P1 ability individually against reference HTML demos
2. Compare visual quality and timing
3. Verify damage application syncs with visual resolve
4. Test particle performance with multiple simultaneous effects

### Performance Checks
- Monitor FPS with 10+ simultaneous telegraphs
- Check particle count limits
- Verify effect cleanup prevents memory leaks

---

## Reference Materials

| Reference File | Animation Type | Key Features |
|----------------|----------------|--------------|
| `tools/animation/ground-slam-animation-reference.html` | Circle AoE | Growing circle, ring burst, rock particles |
| `tools/animation/charge-animation-reference.html` | Line/Dash | Direction lock, enemy movement, afterimages |
| `tools/animation/fire-breath-animation-reference.html` | Cone/Channel | Pie-slice, DoT ticks, fire layers |
| `tools/animation/homing-orb-animation-reference.html` | Projectile | Independent entity, homing, caster detach |

---

## Summary

| Phase | Scope | Key Deliverables |
|-------|-------|------------------|
| Phase 1 | Foundation | Telegraphs visible for ALL abilities immediately |
| Phase 2 | Core System | Phase-based lifecycle, shape renderers |
| Phase 3 | P1 Abilities | 12 Boss/Elite abilities with full animations |
| Phase 4 | P2-P4 Abilities | 25 remaining abilities using established patterns |
| Phase 5 | Polish | Audio, screen effects, status visuals |
