# Monster Signature Abilities Implementation Plan

## Overview
Replace basic monster attacks with unique signature abilities. Each monster gets ONE distinctive attack with mandatory visual telegraphs, creating varied combat encounters where players must learn and react to different attack patterns.

---

## Monster-to-Ability Mapping (31 Monsters)

### Volcanic Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Effect |
|---------|-------------------|-----------|-----------|--------|
| Magma Slime | `ground_slam` | 1000ms | Circle r3 | Screen shake |
| Obsidian Golem | `heavy_slam` | 1200ms | Circle r2.5 | Knockback (3) |
| Cinder Wisp | `fire_breath` | 1000ms | 60° cone r6 | Lingering flames (3s) |
| Flame Bat | `pounce` | 500ms | Circle r1 | Leap to target |
| Ash Walker | `claw_swipe` | 350ms | 90° arc r2 | Fast attack |
| Salamander | `tail_whip` | 500ms | 180° arc r2.5 | Knockback (2) |
| Pyro Cultist | `projectile_burst` | 600ms | 3 projectiles | 30° spread |

### Cave Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Effect |
|---------|-------------------|-----------|-----------|--------|
| Cave Bat | `bite` | 300ms | 60° arc r1 | Bleed (3 dmg/3s) |
| Stone Lurker | `heavy_slam` | 1200ms | Circle r2.5 | Knockback (3) |
| Mushroom Sprite | `poison_cloud` | 700ms | 90° cone r4 | Poison (3 dmg/4s) |
| Crystal Spider | `web_shot` | 300ms | Projectile | Root (2s) |

### Undead Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Effect |
|---------|-------------------|-----------|-----------|--------|
| Skeletal Warrior | `melee_swing` | 600ms | 120° arc r2 | Standard melee |
| Phantom | `life_drain` | 600ms | Range 4 | Heal 50% damage |
| Bone Golem | `ground_slam` | 1000ms | Circle r3 | Screen shake |

### Aquatic Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Effect |
|---------|-------------------|-----------|-----------|--------|
| Deep Crawler | `claw_swipe` | 350ms | 90° arc r2 | Pincer attack |
| Tide Serpent | `bite` | 300ms | 60° arc r1 | Fast strike |

### Shadow Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Effect |
|---------|-------------------|-----------|-----------|--------|
| Shadow Stalker | `shadow_step` | 200ms | Circle r2 | Teleport behind |
| Void Touched | `homing_orb` | 800ms | Projectile | Tracks target |

### Ice Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Effect |
|---------|-------------------|-----------|-----------|--------|
| Frost Elemental | `frost_breath` | 1000ms | 75° cone r5 | 50% slow (3s) |
| Ice Golem | `heavy_slam` | 1200ms | Circle r2.5 | Knockback (3) |
| Frozen Husk | `claw_swipe` | 350ms | 90° arc r2 | Chilling grasp |
| Blizzard Spirit | `projectile_single` | 400ms | Projectile | Ice bolt |

### Combat Variety Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Effect |
|---------|-------------------|-----------|-----------|--------|
| Shadow Imp | `double_strike` | 500ms | 90° arc r2 | 2 hits @ 300ms |
| Temple Sentinel | `stomp` | 600ms | Circle r2 | Stun (0.5s) |
| Stone Guardian | `ground_slam` | 1000ms | Circle r3 | Devastating slam |
| Demon Knight | `charge` | 800ms | Line w2 r10 | Stun (1s) |
| Giant Spider | `web_shot` | 300ms | Projectile | Root (2s) |
| Shield Bearer | `lunge` | 400ms | Line w1 l3 | Dash (2 tiles) |
| Flame Sprite | `pounce` | 500ms | Circle r1 | Quick leap |

---

## Implementation Steps

### Step 1: Create MONSTER_SIGNATURE_ABILITIES Mapping
**File:** `js/systems/enemy-ability-system.js`

Add new constant object with all monster-to-ability mappings:

```javascript
MONSTER_SIGNATURE_ABILITIES: {
    // VOLCANIC
    'Magma Slime': { signatureAbility: 'ground_slam' },
    'Obsidian Golem': { signatureAbility: 'heavy_slam' },
    'Cinder Wisp': { signatureAbility: 'fire_breath' },
    'Flame Bat': { signatureAbility: 'pounce' },
    'Ash Walker': { signatureAbility: 'claw_swipe' },
    'Salamander': { signatureAbility: 'tail_whip' },
    'Pyro Cultist': { signatureAbility: 'projectile_burst' },

    // CAVE
    'Cave Bat': { signatureAbility: 'bite' },
    'Stone Lurker': { signatureAbility: 'heavy_slam' },
    'Mushroom Sprite': { signatureAbility: 'poison_cloud' },
    'Crystal Spider': { signatureAbility: 'web_shot' },

    // UNDEAD
    'Skeletal Warrior': { signatureAbility: 'melee_swing' },
    'Phantom': { signatureAbility: 'life_drain' },
    'Bone Golem': { signatureAbility: 'ground_slam' },

    // AQUATIC
    'Deep Crawler': { signatureAbility: 'claw_swipe' },
    'Tide Serpent': { signatureAbility: 'bite' },

    // SHADOW
    'Shadow Stalker': { signatureAbility: 'shadow_step' },
    'Void Touched': { signatureAbility: 'homing_orb' },

    // ICE
    'Frost Elemental': { signatureAbility: 'frost_breath' },
    'Ice Golem': { signatureAbility: 'heavy_slam' },
    'Frozen Husk': { signatureAbility: 'claw_swipe' },
    'Blizzard Spirit': { signatureAbility: 'projectile_single' },

    // COMBAT VARIETY
    'Shadow Imp': { signatureAbility: 'double_strike' },
    'Temple Sentinel': { signatureAbility: 'stomp' },
    'Stone Guardian': { signatureAbility: 'ground_slam' },
    'Demon Knight': { signatureAbility: 'charge' },
    'Giant Spider': { signatureAbility: 'web_shot' },
    'Shield Bearer': { signatureAbility: 'lunge' },
    'Flame Sprite': { signatureAbility: 'pounce' }
}
```

### Step 2: Modify initializeEnemy() for Single Ability
**File:** `js/systems/enemy-ability-system.js`
**Location:** ~Lines 205-266

Changes needed:
1. Look up monster in `MONSTER_SIGNATURE_ABILITIES` instead of `MONSTER_ABILITY_PRESETS`
2. Load ONE ability instead of array
3. Store as `signatureAbility` property instead of `attacks` array
4. Add warning/flag for unmapped monsters

```javascript
initializeEnemy(enemy) {
    const mapping = this.MONSTER_SIGNATURE_ABILITIES[enemy.name];

    if (!mapping) {
        console.warn(`[MISSING ABILITY] ${enemy.name} has no signature ability!`);
        this.missingAbilityMonsters.add(enemy.name);
        return;
    }

    const abilitySet = {
        signatureAbility: AbilityRepository.getScaledAttack(mapping.signatureAbility, enemy.tier),
        cooldowns: { [mapping.signatureAbility]: 0 },
        globalCooldown: 0
    };

    this.enemyAbilities.set(enemy.id, abilitySet);
}
```

### Step 3: Simplify tryUseAbility() - Remove Probability
**File:** `js/systems/enemy-ability-system.js`
**Location:** ~Lines 310-347

Changes needed:
1. Remove the 25-40% probability roll
2. Always use signature ability when cooldown is ready
3. Only check range requirement

```javascript
tryUseAbility(enemy, target) {
    const abilitySet = this.enemyAbilities.get(enemy.id);
    if (!abilitySet?.signatureAbility) return false;

    // Check global cooldown
    if (abilitySet.globalCooldown > 0) return false;

    // Check ability cooldown
    const ability = abilitySet.signatureAbility;
    if (abilitySet.cooldowns[ability.id] > 0) return false;

    // Check range
    if (ability.range) {
        const dist = this.getDistance(enemy, target);
        if (dist > ability.range) return false;
    }

    // Execute ability (always)
    this.executeAbility(enemy, target, ability, abilitySet);
    return true;
}
```

### Step 4: Enforce Mandatory Telegraphs
**File:** `js/systems/enemy-ability-system.js`
**Location:** ~Lines 392-459 (executeAbility)

Changes needed:
1. Set minimum telegraph time of 400ms
2. Always call `createTelegraph()` regardless of ability type
3. Create default telegraph shape for abilities without AOE defined

```javascript
executeAbility(enemy, target, ability, abilitySet) {
    const MINIMUM_TELEGRAPH = 400;
    const telegraphTime = Math.max(ability.telegraphTime || 0, MINIMUM_TELEGRAPH);

    // Set cooldowns
    abilitySet.cooldowns[ability.id] = ability.cooldown;
    abilitySet.globalCooldown = 1000;

    // ALWAYS create telegraph
    this.createTelegraph(enemy, target, ability);

    // Set attack animation
    enemy.combat.attackAnimation = {
        state: 'windup',
        timer: telegraphTime,
        abilityBased: true,
        signatureAbility: ability.id
    };

    // Delayed execution
    setTimeout(() => {
        this.resolveAbility(enemy, target, ability);
    }, telegraphTime);
}
```

### Step 5: Integrate into EnemyAI Attack Flow
**File:** `js/systems/enemy-ai.js`
**Location:** ~Lines 1418-1447 (_attackDirect method)

Changes needed:
1. Call `EnemyAbilitySystem.tryUseAbility()` as primary attack method
2. Remove direct `_attack()` call for enemies with abilities
3. Add fallback basic attack with forced telegraph for unmapped monsters

```javascript
_attackDirect(game) {
    if (!this.target) {
        this._releaseAttackToken();
        return;
    }

    this._face(this.target.gridX, this.target.gridY);

    // PRIMARY: Use signature ability
    if (typeof EnemyAbilitySystem !== 'undefined') {
        const usedAbility = EnemyAbilitySystem.tryUseAbility(this.enemy, this.target);
        if (usedAbility) {
            this._releaseAttackToken();
            this.enemy.lastAttackTime = Date.now();
            return;
        }
    }

    // FALLBACK: Basic attack with forced telegraph (only unmapped monsters)
    this._performBasicAttackWithTelegraph(game);
}
```

### Step 6: Add Validation and Reporting
**File:** `js/systems/enemy-ability-system.js`

Add new tracking and validation methods:

```javascript
missingAbilityMonsters: new Set(),

validateAllMappings() {
    const allMonsters = Object.keys(window.MONSTER_DATA || {});
    const mapped = Object.keys(this.MONSTER_SIGNATURE_ABILITIES);
    const missing = allMonsters.filter(m => !mapped.includes(m));

    console.log(`[Ability Validation] ${mapped.length}/${allMonsters.length} mapped`);
    if (missing.length > 0) {
        console.warn('[MISSING MAPPINGS]:', missing);
    }
    return { total: allMonsters.length, mapped: mapped.length, missing };
},

getMissingAbilityReport() {
    return Array.from(this.missingAbilityMonsters);
}
```

---

## Files Summary

### Files to Modify
| File | Purpose | Key Changes |
|------|---------|-------------|
| `js/systems/enemy-ability-system.js` | Ability management | Add mapping, modify init/tryUse/execute |
| `js/systems/enemy-ai.js` | Attack entry point | Modify `_attackDirect()` to use abilities |

### Reference Files (No Changes)
| File | Purpose |
|------|---------|
| `js/data/ability-repository.js` | Ability definitions (37 attacks ready) |
| `js/data/monsters-data.js` | Monster list (31 monsters) |

---

## Flagged Issues (Monsters Needing Attention)

These monsters may benefit from custom abilities in the future:

| Monster | Issue | Recommendation |
|---------|-------|----------------|
| Temple Sentinel | Has shield mechanic | Create `shield_bash` ability |
| Shield Bearer | Has shield mechanic | Create `shield_bash` ability |
| Blizzard Spirit | Very fast attacker | May need faster ice-specific ability |

---

## Verification Checklist

After implementation:

1. **Visual Check** - Enter dungeon and observe enemy attacks
   - [ ] Every attack shows ground telegraph indicator
   - [ ] Telegraph color/shape matches ability type
   - [ ] Different monsters have visually distinct attacks

2. **Timing Check** - Observe telegraph durations
   - [ ] Minimum 400ms reaction time on all attacks
   - [ ] Slower abilities (heavy_slam, charge) have longer telegraphs
   - [ ] Fast abilities (bite, claw_swipe) still telegraph but faster

3. **Effect Check** - Verify ability effects work
   - [ ] Knockback abilities push player back
   - [ ] Status effects (bleed, poison, slow, root) apply
   - [ ] Life drain heals the enemy

4. **Console Check** - Run validation
   - [ ] `EnemyAbilitySystem.validateAllMappings()` shows full coverage
   - [ ] No "[MISSING ABILITY]" warnings in console

5. **Edge Cases**
   - [ ] Ranged enemies (Pyro Cultist, Cinder Wisp) attack from range
   - [ ] Charge enemies (Demon Knight) rush correctly
   - [ ] Teleport enemies (Shadow Stalker) blink before attacking

---

## Ability Reference Quick Guide

### By Telegraph Duration (Reaction Time)
| Duration | Abilities | Difficulty |
|----------|-----------|------------|
| 200-400ms | shadow_step, bite, web_shot, claw_swipe | Hard |
| 500-700ms | pounce, lunge, double_strike, stomp, poison_cloud | Medium |
| 800-1000ms | charge, homing_orb, ground_slam, fire_breath, frost_breath | Easy |
| 1200ms+ | heavy_slam | Very Easy |

### By AOE Shape
| Shape | Abilities |
|-------|-----------|
| Circle | ground_slam, heavy_slam, pounce, stomp, shadow_step |
| Arc (cone) | melee_swing, bite, claw_swipe, tail_whip, double_strike |
| Cone (breath) | fire_breath, frost_breath, poison_cloud |
| Line | charge, lunge |
| Projectile | projectile_single, projectile_burst, web_shot, homing_orb |
| Special | life_drain (beam) |

### By Status Effect
| Effect | Abilities | Duration |
|--------|-----------|----------|
| Knockback | heavy_slam, tail_whip | Instant |
| Stun | charge, stomp | 0.5-1s |
| Root | web_shot | 2s |
| Bleed | bite | 3s DOT |
| Poison | poison_cloud | 4s DOT |
| Slow | frost_breath | 3s, 50% |
| Heal Self | life_drain | 50% damage |
