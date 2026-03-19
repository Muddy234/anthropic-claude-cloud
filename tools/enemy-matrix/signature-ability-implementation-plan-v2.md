# Monster Signature Abilities Implementation Plan (v2)

## Overview
Replace basic monster attacks with unique signature abilities. Each monster gets ONE distinctive attack plus ONE passive/mechanic, both with mandatory visual telegraphs. Every monster in the roster should demand a different player response — no two enemies should feel identical in combat.

### Key Changes from v1
- **Every ability assignment reviewed** to eliminate duplicates and maximize combat variety
- **Passive/mechanic layer added** — each monster gets a `signaturePassive` that changes how the fight evolves
- **Minimum telegraph lowered** from 400ms to 300ms (with 200ms exception for Shadow Stalker)
- **Safety checks added** to ability resolution (death/stun cancels pending abilities)
- **Ability conflicts resolved** — no two monsters in the core roster share the same primary ability

---

## Design Principles

1. **No two monsters should share a primary ability.** If the player dodges the same telegraph shape and punishes the same recovery window on two different enemies, those enemies are functionally identical regardless of their sprite.

2. **Passives create fight evolution.** Without passives, an enemy does the same thing from 100% HP to 0%. Passives like `enrage`, `ethereal`, and `pack_hunter` create phase changes and escalation within a single fight.

3. **Telegraph duration = difficulty tuning.** Fast telegraphs (200-350ms) are for experienced players. Slow telegraphs (800-1200ms) are for heavy hits that punish positioning. The telegraph is the player's skill check — never remove it, but tune it per enemy.

4. **Abilities always fire when ready.** No probability rolls. When cooldown is up and target is in range, the enemy attacks. Predictable timing creates learnable patterns. Randomness creates frustration.

---

## Monster-to-Ability Mapping (29 Monsters)

### Volcanic Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Effect | Passive/Mechanic | Passive Effect |
|---------|-------------------|-----------|-----------|--------|------------------|----------------|
| Magma Slime | `fire_breath` | 1000ms | 60° cone r6 | Lingering flames (3s) | `death_explosion` | 25 dmg r3 on death — WHERE it dies reshapes the room |
| Obsidian Golem | `ground_slam` | 1000ms | Circle r3 | Screen shake | `thorns` + `death_explosion` | 15% reflect + 25 dmg r3 on death — punishes melee, punishes proximity on kill |
| Cinder Wisp | `projectile_burst` | 600ms | 3 projectiles | 30° spread | `teleport_when_hurt` | 25% chance to teleport 4-8 tiles when damaged — forces chase or ranged burst |
| Flame Bat | `bite` | 300ms | 60° arc r1 | Bleed (3 dmg/3s) | `evasion` | 20% dodge — erratic, hard to hit, bleeds stack with multiple Bats |
| Ash Walker | `life_drain` | 600ms | Range 4 | Heal 50% of damage dealt | `regeneration` | 2% HP/sec after 3s no damage — self-sustaining vampire, requires focused burst |
| Salamander | `tail_whip` | 500ms | 180° arc r2.5 | Knockback (2) | `berserk` | +50% dmg below 30% HP — knockback becomes dangerous when enraged |
| Pyro Cultist | `homing_orb` | 800ms | Projectile (homing) | Tracks target, speed 4 | `regeneration` | 2% HP/sec after 3s — heals if ignored, orb forces attention split |

### Cave Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Effect | Passive/Mechanic | Passive Effect |
|---------|-------------------|-----------|-----------|--------|------------------|----------------|
| Cave Bat | `claw_swipe` | 350ms | 90° arc r2 | Fast attack | `pack_hunter` | +10% dmg per ally nearby (max 50%) — swarm of 6 hits 50% harder |
| Stone Lurker | `ground_slam` | 1000ms | Circle r3 | Screen shake | `ambusher` + `armored` | +50% first strike dmg + 10 armor — devastating ambush opener, tanky after reveal |
| Mushroom Sprite | `poison_cloud` | 700ms | 90° cone r4 | Poison (3 dmg/4s) | `regeneration` | 2% HP/sec after 3s — heals if not actively pressured, must be focused down |
| Crystal Spider | `web_shot` | 300ms | Projectile | Root (2s) | `poison_touch` | 2 dmg/tick for 3s on any hit — root + poison chip, enables other enemies to punish |

### Undead Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Effect | Passive/Mechanic | Passive Effect |
|---------|-------------------|-----------|-----------|--------|------------------|----------------|
| Skeletal Warrior | `melee_swing` | 600ms | 120° arc r2 | Standard melee | `call_for_help` | Alerts allies in 8 range on combat start — the alarm enemy, kill fast or face reinforcements |
| Phantom | `life_drain` | 600ms | Range 4 | Heal 50% damage dealt | `ethereal` | 2s immune / 5s vulnerable cycle — must burst during vulnerable windows |
| Bone Golem | `heavy_slam` | 1200ms | Circle r2.5 | Knockback (3) | `split` + `berserk` | Enrages at 30% HP, splits into 2 copies (30% HP each) on death — three-phase fight |

### Aquatic Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Effect | Passive/Mechanic | Passive Effect |
|---------|-------------------|-----------|-----------|--------|------------------|----------------|
| Deep Crawler | `double_strike` | 500ms | 90° arc r2 | 2 hits @ 300ms | `armored` | +10 armor — tough shell, double hit feels pressuring and aggressive |
| Tide Serpent | `lunge` | 400ms | Line w1 l3 | Dash (2 tiles) | `berserk` | +50% dmg below 30% HP — fast dasher that becomes lethal when wounded |

### Shadow Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Effect | Passive/Mechanic | Passive Effect |
|---------|-------------------|-----------|-----------|--------|------------------|----------------|
| Shadow Stalker | `shadow_step` | 200ms | Circle r2 | Teleport behind + strike | `ambusher` + `ethereal` | +50% first strike + 2s immune/5s vulnerable cycle — devastating opener, phase cycling |
| Void Touched | `void_beam` | 1500ms | Line w1 r15 | Continuous 2s beam | `adaptive_resistance` + `teleport_when_hurt` | Gains resist per hit type + teleports when damaged — requires varied attacks and burst windows |

### Ice Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Effect | Passive/Mechanic | Passive Effect |
|---------|-------------------|-----------|-----------|--------|------------------|----------------|
| Frost Elemental | `frost_breath` | 1000ms | 75° cone r5 | 50% slow (3s) | `frost_aura` | 30% passive slow in 3 range — approaching it is dangerous, slows stack to 80% |
| Ice Golem | `stomp` | 600ms | Circle r2 | Stun (0.5s) | `thorns` + `undying` | 15% reflect + 20% survive lethal at 1 HP — grindy, refuses to die, reflects melee |
| Frozen Husk | `lunge` | 400ms | Line w1 l3 | Dash + chill | `berserk` | +50% dmg below 30% — gap-closer that traps you in melee, enrages when wounded |
| Blizzard Spirit | `projectile_single` | 400ms | Projectile (speed 8) | Ice bolt | `evasion` | 20% dodge — fast, evasive ranged pest |

### Combat Variety Monsters
| Monster | Signature Ability | Telegraph | AOE Shape | Effect | Passive/Mechanic | Passive Effect |
|---------|-------------------|-----------|-----------|--------|------------------|----------------|
| Shadow Imp | `teleport_strike` | 500ms | Circle r2 | Teleport behind + 40 dmg | `evasion` | 20% dodge — blinks behind you, hits hard, dodges counterattacks |
| Temple Sentinel | `heavy_slam` | 1200ms | Circle r2.5 | Knockback (3) | `shield_barrier` (frontal block) | 90° front arc blocks basic attacks — THE shield enemy, requires flanking or heavy attack break |
| Stone Guardian | `ground_slam` | 1000ms | Circle r3 | Screen shake, devastating | `thorns` + `armored` | 15% reflect + 10 armor — punishes melee, punishes trading, requires patience |
| Demon Knight | `charge` | 800ms | Line w2 r10 | Stun (1s) | `enrage` | +50% dmg / +30% speed below 30% HP — charge cycle accelerates when wounded |
| Giant Spider | `sweep` | 1000ms | 270° arc r3 | Widest attack in game | `ambusher` | +50% first strike — only safe position is directly behind it |
| Shield Bearer | `stomp` | 600ms | Circle r2 | Stun (0.5s) | `shield_barrier` (frontal block) | Front arc blocks — lighter shield enemy, stun instead of knockback |
| Flame Sprite | `pounce` | 500ms | Circle r1 | Quick leap to target | `fire_aura` | 5 dmg/tick in 2 range — leaps in, burns you passively, fragile if you can hit it |

---

## Ability Uniqueness Audit

### Primary Ability Distribution (29 monsters → 22 unique abilities)

**Fully unique primaries (no overlap):**
- fire_breath → Magma Slime
- projectile_burst → Cinder Wisp
- bite → Flame Bat
- tail_whip → Salamander
- homing_orb → Pyro Cultist
- web_shot → Crystal Spider
- poison_cloud → Mushroom Sprite
- double_strike → Deep Crawler
- shadow_step → Shadow Stalker
- void_beam → Void Touched
- frost_breath → Frost Elemental
- projectile_single → Blizzard Spirit
- teleport_strike → Shadow Imp
- charge → Demon Knight
- sweep → Giant Spider
- pounce → Flame Sprite
- melee_swing → Skeletal Warrior

**Shared primaries (differentiated by passive):**
| Ability | Monster A | Monster B | How Passives Differentiate |
|---------|-----------|-----------|---------------------------|
| ground_slam | Stone Lurker | Stone Guardian | Lurker: ambush opener (+50% first hit). Guardian: thorns + armored (sustained grind). Lurker spikes on reveal, Guardian attrites over time. |
| heavy_slam | Bone Golem | Temple Sentinel | Bone Golem: split + berserk (three-phase fight). Sentinel: shield block (flanking puzzle). Same attack, completely different fights. |
| life_drain | Ash Walker | Phantom | Ash Walker: regeneration (melee vampire). Phantom: ethereal (ranged, phases in/out of immunity). Same ability, different engagement range and counterplay. |
| lunge | Frozen Husk | Tide Serpent | Both have berserk, BUT Frozen Husk is ice-themed (slow context) and Tide Serpent is aquatic (knockback tail_whip if given secondary later). Weakest differentiation — consider swapping Frozen Husk to `claw_swipe` if this feels too similar in practice. |
| stomp | Ice Golem | Shield Bearer | Ice Golem: thorns + undying (unkillable grind). Shield Bearer: shield block (directional defense). Same stun, very different fights. |
| claw_swipe | Cave Bat | (unique — only Cave Bat) | No conflict. |

**Acceptable overlap: 5 shared abilities across 10 monsters, all differentiated by passives.** In practice, no two monsters will feel identical because the passive changes the fight's structure even when the attack telegraph is the same.

---

## Implementation Steps

### Step 1: Create MONSTER_SIGNATURE_ABILITIES Mapping
**File:** `js/systems/enemy-ability-system.js`

Add new constant object with all monster-to-ability AND passive mappings:

```javascript
MONSTER_SIGNATURE_ABILITIES: {
    // ─── VOLCANIC ───
    'Magma Slime': {
        signatureAbility: 'fire_breath',
        signaturePassive: 'death_explosion'
    },
    'Obsidian Golem': {
        signatureAbility: 'ground_slam',
        signaturePassive: ['thorns', 'death_explosion']
    },
    'Cinder Wisp': {
        signatureAbility: 'projectile_burst',
        signaturePassive: 'teleport_when_hurt'
    },
    'Flame Bat': {
        signatureAbility: 'bite',
        signaturePassive: 'evasion'
    },
    'Ash Walker': {
        signatureAbility: 'life_drain',
        signaturePassive: 'regeneration'
    },
    'Salamander': {
        signatureAbility: 'tail_whip',
        signaturePassive: 'berserk'
    },
    'Pyro Cultist': {
        signatureAbility: 'homing_orb',
        signaturePassive: 'regeneration'
    },

    // ─── CAVE ───
    'Cave Bat': {
        signatureAbility: 'claw_swipe',
        signaturePassive: 'pack_hunter'
    },
    'Stone Lurker': {
        signatureAbility: 'ground_slam',
        signaturePassive: ['ambusher', 'armored']
    },
    'Mushroom Sprite': {
        signatureAbility: 'poison_cloud',
        signaturePassive: 'regeneration'
    },
    'Crystal Spider': {
        signatureAbility: 'web_shot',
        signaturePassive: 'poison_touch'
    },

    // ─── UNDEAD ───
    'Skeletal Warrior': {
        signatureAbility: 'melee_swing',
        signaturePassive: 'call_for_help'
    },
    'Phantom': {
        signatureAbility: 'life_drain',
        signaturePassive: 'ethereal'
    },
    'Bone Golem': {
        signatureAbility: 'heavy_slam',
        signaturePassive: ['split', 'berserk']
    },

    // ─── AQUATIC ───
    'Deep Crawler': {
        signatureAbility: 'double_strike',
        signaturePassive: 'armored'
    },
    'Tide Serpent': {
        signatureAbility: 'lunge',
        signaturePassive: 'berserk'
    },

    // ─── SHADOW ───
    'Shadow Stalker': {
        signatureAbility: 'shadow_step',
        signaturePassive: ['ambusher', 'ethereal']
    },
    'Void Touched': {
        signatureAbility: 'void_beam',
        signaturePassive: ['adaptive_resistance', 'teleport_when_hurt']
    },

    // ─── ICE ───
    'Frost Elemental': {
        signatureAbility: 'frost_breath',
        signaturePassive: 'frost_aura'
    },
    'Ice Golem': {
        signatureAbility: 'stomp',
        signaturePassive: ['thorns', 'undying']
    },
    'Frozen Husk': {
        signatureAbility: 'lunge',
        signaturePassive: 'berserk'
    },
    'Blizzard Spirit': {
        signatureAbility: 'projectile_single',
        signaturePassive: 'evasion'
    },

    // ─── COMBAT VARIETY ───
    'Shadow Imp': {
        signatureAbility: 'teleport_strike',
        signaturePassive: 'evasion'
    },
    'Temple Sentinel': {
        signatureAbility: 'heavy_slam',
        signaturePassive: 'shield_barrier'
    },
    'Stone Guardian': {
        signatureAbility: 'ground_slam',
        signaturePassive: ['thorns', 'armored']
    },
    'Demon Knight': {
        signatureAbility: 'charge',
        signaturePassive: 'enrage'
    },
    'Giant Spider': {
        signatureAbility: 'sweep',
        signaturePassive: 'ambusher'
    },
    'Shield Bearer': {
        signatureAbility: 'stomp',
        signaturePassive: 'shield_barrier'
    },
    'Flame Sprite': {
        signatureAbility: 'pounce',
        signaturePassive: 'fire_aura'
    }
}
```

### Step 2: Modify initializeEnemy() for Ability + Passive
**File:** `js/systems/enemy-ability-system.js`
**Location:** ~Lines 205-266

Changes from v1:
1. Look up monster in `MONSTER_SIGNATURE_ABILITIES` instead of `MONSTER_ABILITY_PRESETS`
2. Load ONE ability + passive(s)
3. Store as `signatureAbility` and `signaturePassive` properties
4. Apply passive effects to enemy stats on initialization

```javascript
initializeEnemy(enemy) {
    const mapping = this.MONSTER_SIGNATURE_ABILITIES[enemy.name];

    if (!mapping) {
        console.error(`[MISSING ABILITY] ${enemy.name} has no signature ability mapping!`);
        this.missingAbilityMonsters.add(enemy.name);
        return;
    }

    // Initialize signature ability
    const abilitySet = {
        signatureAbility: AbilityRepository.getScaledAttack(
            mapping.signatureAbility, enemy.tier
        ),
        cooldowns: { [mapping.signatureAbility]: 0 },
        globalCooldown: 0
    };

    this.enemyAbilities.set(enemy.id, abilitySet);

    // Initialize passive(s)
    const passives = Array.isArray(mapping.signaturePassive)
        ? mapping.signaturePassive
        : [mapping.signaturePassive];

    passives.forEach(passiveId => {
        if (passiveId) {
            this.applyPassive(enemy, passiveId);
        }
    });
}

applyPassive(enemy, passiveId) {
    const passive = PassiveRepository.get(passiveId);
    if (!passive) {
        console.warn(`[MISSING PASSIVE] ${passiveId} not found for ${enemy.name}`);
        return;
    }

    // Store passive reference on enemy for runtime checks
    if (!enemy.passives) enemy.passives = [];
    enemy.passives.push(passiveId);

    // Apply stat modifications immediately (armored, frost_aura, etc.)
    switch (passiveId) {
        case 'armored':
            enemy.pDef = (enemy.pDef || 0) + 10;
            break;
        case 'fire_aura':
            enemy.aura = { type: 'fire', damage: 5, range: 2, interval: 1000 };
            break;
        case 'frost_aura':
            enemy.aura = { type: 'frost', slow: 0.3, range: 3 };
            break;
        case 'pack_hunter':
            enemy.packHunter = { bonusPerAlly: 0.10, maxBonus: 0.50, range: 5 };
            break;
        case 'shield_barrier':
            enemy.shield = { arc: 90, active: true, breakCondition: 'heavy_attack', breakDuration: 3000 };
            break;
        // Triggered passives (enrage, berserk, split, etc.) are checked at runtime
        // and don't need stat modifications at init
    }
}
```

### Step 3: Simplify tryUseAbility() — Remove Probability
**File:** `js/systems/enemy-ability-system.js`
**Location:** ~Lines 310-347

Changes from v1:
1. Remove the 25-40% probability roll — abilities ALWAYS fire when ready
2. Only check range and cooldown

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

    // Execute ability (always — no probability roll)
    this.executeAbility(enemy, target, ability, abilitySet);
    return true;
}
```

### Step 4: Enforce Mandatory Telegraphs (300ms minimum, 200ms exception)
**File:** `js/systems/enemy-ability-system.js`
**Location:** ~Lines 392-459 (executeAbility)

Changes from v1:
1. Minimum telegraph lowered to 300ms (was 400ms)
2. `shadow_step` explicitly exempted at 200ms — this is the fastest attack in the game by design
3. **Added safety check** — ability resolution cancels if enemy dies or is stunned during telegraph

```javascript
// Abilities that are allowed below the 300ms minimum telegraph
FAST_TELEGRAPH_EXCEPTIONS: ['shadow_step'],

executeAbility(enemy, target, ability, abilitySet) {
    const MINIMUM_TELEGRAPH = 300;
    const isException = this.FAST_TELEGRAPH_EXCEPTIONS.includes(ability.id);

    const telegraphTime = isException
        ? (ability.telegraphTime || MINIMUM_TELEGRAPH)
        : Math.max(ability.telegraphTime || 0, MINIMUM_TELEGRAPH);

    // Set cooldowns
    abilitySet.cooldowns[ability.id] = ability.cooldown;
    abilitySet.globalCooldown = 1000;

    // ALWAYS create telegraph visual
    this.createTelegraph(enemy, target, ability);

    // Set attack animation state
    enemy.combat.attackAnimation = {
        state: 'windup',
        timer: telegraphTime,
        abilityBased: true,
        signatureAbility: ability.id
    };

    // Delayed execution with safety check
    const enemyId = enemy.id;
    setTimeout(() => {
        // SAFETY: Cancel if enemy died or was stunned during telegraph
        if (!enemy || enemy.hp <= 0) return;
        if (enemy.isStunned || enemy.isRooted) return;

        // SAFETY: Verify enemy still exists in game
        if (!this.enemyAbilities.has(enemyId)) return;

        this.resolveAbility(enemy, target, ability);
    }, telegraphTime);
}
```

### Step 5: Add Runtime Passive Checks
**File:** `js/systems/enemy-ability-system.js`

New methods for passives that trigger at runtime rather than at initialization:

```javascript
// Call this in the main combat update loop
updatePassives(enemy, deltaTime) {
    if (!enemy.passives) return;

    enemy.passives.forEach(passiveId => {
        switch (passiveId) {
            case 'regeneration':
                this.handleRegeneration(enemy, deltaTime);
                break;
            case 'enrage':
            case 'berserk':
                this.handleEnrage(enemy);
                break;
            case 'ethereal':
                this.handleEthereal(enemy, deltaTime);
                break;
            case 'pack_hunter':
                this.handlePackHunter(enemy);
                break;
        }
    });
},

handleRegeneration(enemy, deltaTime) {
    if (!enemy._lastDamagedTime) enemy._lastDamagedTime = 0;
    const timeSinceDamage = Date.now() - enemy._lastDamagedTime;

    // Only regen after 3 seconds of no damage
    if (timeSinceDamage >= 3000) {
        const healAmount = enemy.maxHp * 0.02 * (deltaTime / 1000);
        enemy.hp = Math.min(enemy.hp + healAmount, enemy.maxHp);
    }
},

handleEnrage(enemy) {
    const threshold = 0.30;
    const isLowHP = (enemy.hp / enemy.maxHp) <= threshold;

    if (isLowHP && !enemy._enraged) {
        enemy._enraged = true;
        enemy.damageMultiplier = (enemy.damageMultiplier || 1.0) * 1.5;
        enemy.speedMultiplier = (enemy.speedMultiplier || 1.0) * 1.3;

        // Visual feedback: enemy glows red, emits particles
        this.triggerEnrageVisual(enemy);
    }
},

handleEthereal(enemy, deltaTime) {
    if (!enemy._etherealTimer) {
        enemy._etherealTimer = 0;
        enemy._etherealImmune = false;
    }

    enemy._etherealTimer += deltaTime;

    if (enemy._etherealImmune && enemy._etherealTimer >= 2000) {
        // Transition: immune → vulnerable (5 seconds)
        enemy._etherealImmune = false;
        enemy._etherealTimer = 0;
        enemy.invulnerable = false;
        this.triggerEtherealVisual(enemy, false);
    } else if (!enemy._etherealImmune && enemy._etherealTimer >= 5000) {
        // Transition: vulnerable → immune (2 seconds)
        enemy._etherealImmune = true;
        enemy._etherealTimer = 0;
        enemy.invulnerable = true;
        this.triggerEtherealVisual(enemy, true);
    }
},

handlePackHunter(enemy) {
    if (!enemy.packHunter) return;
    const nearbyAllies = this.countAlliesInRange(enemy, enemy.packHunter.range);
    const bonus = Math.min(
        nearbyAllies * enemy.packHunter.bonusPerAlly,
        enemy.packHunter.maxBonus
    );
    enemy.packHunterBonus = bonus;
},

// Call this when an enemy takes damage
onEnemyDamaged(enemy, damage, damageType) {
    // Track last damage time for regeneration
    enemy._lastDamagedTime = Date.now();

    // Thorns: reflect damage to attacker
    if (enemy.passives?.includes('thorns')) {
        const reflectDamage = Math.floor(damage * 0.15);
        if (reflectDamage > 0 && enemy._lastAttacker) {
            this.applyDamage(enemy._lastAttacker, reflectDamage, 'reflect');
        }
    }

    // Teleport when hurt
    if (enemy.passives?.includes('teleport_when_hurt')) {
        if (Math.random() < 0.25 && !enemy._teleportCooldown) {
            this.teleportEnemy(enemy, 4 + Math.random() * 4);
            enemy._teleportCooldown = true;
            setTimeout(() => { enemy._teleportCooldown = false; }, 5000);
        }
    }

    // Adaptive resistance
    if (enemy.passives?.includes('adaptive_resistance')) {
        if (!enemy._resistances) enemy._resistances = {};
        const current = enemy._resistances[damageType] || 0;
        enemy._resistances[damageType] = Math.min(current + 0.10, 0.50);
    }

    // Evasion is checked BEFORE damage is applied (in the damage pipeline)
    // Not handled here — see onEnemyAttacked()
},

// Call this BEFORE damage is applied
onEnemyAttacked(enemy, incomingDamage) {
    // Evasion: chance to dodge
    if (enemy.passives?.includes('evasion')) {
        if (Math.random() < 0.20) {
            this.triggerDodgeVisual(enemy);
            return 0; // No damage dealt
        }
    }

    // Shield: block frontal attacks
    if (enemy.passives?.includes('shield_barrier') && enemy.shield?.active) {
        const attackAngle = this.getAttackAngle(enemy);
        if (Math.abs(attackAngle) <= enemy.shield.arc / 2) {
            this.triggerShieldBlockVisual(enemy);
            return 0; // Blocked
        }
    }

    return incomingDamage;
},

// Call this when an enemy dies
onEnemyDeath(enemy) {
    // Death explosion
    if (enemy.passives?.includes('death_explosion')) {
        this.scheduleDeathExplosion(enemy, {
            delay: 1000,      // 1 second fuse
            damage: 25,
            radius: 3,
            hitsAllEntities: true  // Damages players AND other enemies
        });
    }

    // Split
    if (enemy.passives?.includes('split')) {
        this.spawnSplitCopies(enemy, {
            count: 2,
            hpPercent: 0.30,
            sizePercent: 0.60
        });
    }

    // Call for help (on combat start, not death — listed here for completeness)
    // This is handled in onEnemyCombatStart() instead
},

// Call when an enemy first enters combat
onEnemyCombatStart(enemy) {
    if (enemy.passives?.includes('call_for_help')) {
        this.alertNearbyEnemies(enemy, 8);
    }

    // Ambusher bonus for first attack
    if (enemy.passives?.includes('ambusher')) {
        enemy._ambushBonus = 1.5; // +50% on first attack
        // Consumed after first attack resolves
    }
},

// Call when an enemy's shield is hit by a heavy attack
onShieldHeavyAttack(enemy) {
    if (enemy.shield?.active && enemy.shield.breakCondition === 'heavy_attack') {
        enemy.shield.active = false;
        this.triggerShieldBreakVisual(enemy);
        setTimeout(() => {
            enemy.shield.active = true;
            this.triggerShieldRegenVisual(enemy);
        }, enemy.shield.breakDuration);
    }
}
```

### Step 6: Integrate into EnemyAI Attack Flow
**File:** `js/systems/enemy-ai.js`
**Location:** ~Lines 1418-1447 (_attackDirect method)

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

    // FALLBACK: Basic attack with forced telegraph (unmapped monsters only)
    // This should not happen in production — log error
    console.error(`[FALLBACK ATTACK] ${this.enemy.name} used basic attack — missing ability mapping!`);
    this._performBasicAttackWithTelegraph(game);
}
```

### Step 7: Add Validation and Reporting
**File:** `js/systems/enemy-ability-system.js`

```javascript
missingAbilityMonsters: new Set(),

validateAllMappings() {
    const allMonsters = Object.keys(window.MONSTER_DATA || {});
    const mapped = Object.keys(this.MONSTER_SIGNATURE_ABILITIES);
    const missing = allMonsters.filter(m => !mapped.includes(m));

    // Check all referenced abilities exist in repository
    const abilityErrors = [];
    const passiveErrors = [];

    Object.entries(this.MONSTER_SIGNATURE_ABILITIES).forEach(([monster, config]) => {
        // Validate ability exists
        if (!AbilityRepository.get(config.signatureAbility)) {
            abilityErrors.push(`${monster}: ability '${config.signatureAbility}' not found`);
        }

        // Validate passives exist
        const passives = Array.isArray(config.signaturePassive)
            ? config.signaturePassive
            : [config.signaturePassive];

        passives.forEach(p => {
            if (p && !PassiveRepository.get(p)) {
                passiveErrors.push(`${monster}: passive '${p}' not found`);
            }
        });
    });

    console.log(`[Ability Validation] ${mapped.length}/${allMonsters.length} monsters mapped`);
    if (missing.length > 0) console.warn('[UNMAPPED MONSTERS]:', missing);
    if (abilityErrors.length > 0) console.error('[MISSING ABILITIES]:', abilityErrors);
    if (passiveErrors.length > 0) console.error('[MISSING PASSIVES]:', passiveErrors);

    return {
        total: allMonsters.length,
        mapped: mapped.length,
        missing,
        abilityErrors,
        passiveErrors
    };
},

getMissingAbilityReport() {
    return Array.from(this.missingAbilityMonsters);
}
```

---

## Boss-Only Ability Unlocks Required

The following abilities are currently flagged `For Enemy = FALSE` in `ability-repository.js` and must be unlocked for specific monsters:

| Ability | Unlock For | Rationale |
|---------|-----------|-----------|
| `sweep` | Giant Spider | 270° arc IS the Giant Spider's identity. Without it, the Spider has no unique combat role. |
| `void_beam` | Void Touched (Elite) | The sustained beam is what makes this Elite feel boss-adjacent. Elites should have boss-tier abilities. |

**Implementation:** Add a `forElite` flag or change the `forEnemy` check to also accept specific monster names:

```javascript
// In ability-repository.js, update the access check:
canEnemyUse(abilityId, enemy) {
    const ability = this.get(abilityId);
    if (!ability) return false;
    if (ability.forEnemy) return true;
    if (ability.forBoss && enemy.tier === 'ELITE') return true;
    // Named exceptions
    const exceptions = {
        'sweep': ['Giant Spider', 'Bone Golem'],
        'void_beam': ['Void Touched']
    };
    return exceptions[abilityId]?.includes(enemy.name) || false;
}
```

---

## Files Summary

### Files to Modify
| File | Purpose | Key Changes |
|------|---------|-------------|
| `js/systems/enemy-ability-system.js` | Ability + passive management | New mapping, passive system, runtime checks, safety guards |
| `js/systems/enemy-ai.js` | Attack entry point | Modify `_attackDirect()` to use signature abilities |
| `js/data/ability-repository.js` | Ability access control | Add Elite/named-exception access for `sweep` and `void_beam` |

### Reference Files (No Changes)
| File | Purpose |
|------|---------|
| `js/data/ability-repository.js` | Ability definitions (37 attacks ready) |
| `js/data/passive-repository.js` | Passive definitions (15 passives ready) |
| `js/data/monsters-data.js` | Monster list (29 monsters) |

---

## Implementation Priority Order

Implement in this order to get playable results as fast as possible:

### Phase 1: Core Abilities (Biggest Impact)
1. Add `MONSTER_SIGNATURE_ABILITIES` mapping (Step 1 — ability only, skip passives)
2. Modify `initializeEnemy()` to load signature ability (Step 2 — ability init only)
3. Modify `tryUseAbility()` to remove probability (Step 3)
4. Modify `executeAbility()` with telegraph minimum and safety check (Step 4)
5. Integrate into `_attackDirect()` (Step 6)
6. Run `validateAllMappings()` to confirm coverage (Step 7)
7. **Playtest.** Every enemy should now telegraph its attack. Combat should already feel dramatically different.

### Phase 2: Passives (Transforms Fights)
8. Add `signaturePassive` to the mapping object
9. Implement `applyPassive()` for stat-based passives (armored, frost_aura, fire_aura, shield_barrier, pack_hunter)
10. Implement `updatePassives()` for runtime passives (regeneration, enrage/berserk, ethereal)
11. Implement `onEnemyDamaged()` for reactive passives (thorns, teleport_when_hurt, adaptive_resistance)
12. Implement `onEnemyDeath()` for death triggers (death_explosion, split)
13. Implement `onEnemyCombatStart()` for combat-start triggers (call_for_help, ambusher)
14. Implement `onEnemyAttacked()` for pre-damage checks (evasion, shield_barrier)
15. **Playtest.** Enemies should now feel genuinely different — the Phantom phases in and out, the Demon Knight enrages, Cave Bats hit harder in packs, the Magma Slime explodes on death.

### Phase 3: Boss-Only Unlocks
16. Update ability access control for `sweep` and `void_beam`
17. Test Giant Spider sweep arc and Void Touched beam
18. **Playtest.** These two enemies should now be among the most distinctive in the roster.

### Phase 4: Polish
19. Verify all telegraph visuals match ability shapes (arc, cone, line, circle, projectile)
20. Verify all status effects apply correctly (bleed, poison, slow, root, stun, knockback)
21. Verify passive visual feedback (enrage glow, ethereal shimmer, shield break/regen, dodge text)
22. Edge case testing (enemy dies during telegraph, enemy stunned during telegraph, multiple passives on same enemy)

---

## Verification Checklist

### After Phase 1 (Core Abilities)
- [ ] Every attack shows ground telegraph indicator
- [ ] Telegraph color/shape matches ability type
- [ ] Different monsters have visually distinct attacks
- [ ] Minimum 300ms reaction time on all attacks (200ms for Shadow Stalker)
- [ ] Slower abilities (heavy_slam, charge) have longer telegraphs
- [ ] Abilities always fire when cooldown is ready (no probability)
- [ ] Ranged enemies (Pyro Cultist, Cinder Wisp) attack from range
- [ ] Charge enemies (Demon Knight) rush correctly
- [ ] Teleport enemies (Shadow Stalker, Shadow Imp) blink before attacking
- [ ] `EnemyAbilitySystem.validateAllMappings()` shows 29/29 mapped, 0 errors
- [ ] No `[FALLBACK ATTACK]` errors in console
- [ ] Enemy ability cancels if enemy dies during telegraph
- [ ] Enemy ability cancels if enemy is stunned during telegraph

### After Phase 2 (Passives)
- [ ] Cave Bats deal more damage when grouped (pack_hunter)
- [ ] Demon Knight speeds up and hits harder below 30% HP (enrage)
- [ ] Phantom cycles between immune and vulnerable states (ethereal)
- [ ] Temple Sentinel blocks frontal basic attacks (shield_barrier)
- [ ] Shield breaks on heavy attack, regenerates after 3s
- [ ] Stone Guardian reflects 15% of melee damage (thorns)
- [ ] Cinder Wisp occasionally teleports when hit (teleport_when_hurt)
- [ ] Mushroom Sprite / Ash Walker heal when not taking damage (regeneration)
- [ ] Magma Slime / Obsidian Golem explode on death (death_explosion)
- [ ] Bone Golem splits into 2 copies on death (split)
- [ ] Skeletal Warrior alerts nearby enemies on combat start (call_for_help)
- [ ] Frost Elemental passively slows nearby players (frost_aura)
- [ ] Flame Sprite damages nearby players passively (fire_aura)

### After Phase 3 (Boss Unlocks)
- [ ] Giant Spider uses 270° sweep arc (not web_shot)
- [ ] Void Touched fires sustained beam that tracks slowly
- [ ] Both abilities have correct telegraph shapes and timing

---

## Ability Reference Quick Guide

### By Telegraph Duration (Reaction Time)
| Duration | Abilities | Difficulty |
|----------|-----------|------------|
| 200ms | shadow_step | Extreme — near-instant (Shadow Stalker only) |
| 300-350ms | bite, web_shot, claw_swipe | Hard — requires anticipation |
| 400-500ms | lunge, pounce, double_strike, projectile_single, teleport_strike | Medium-Hard |
| 600-700ms | melee_swing, life_drain, stomp, projectile_burst, poison_cloud | Medium |
| 800-1000ms | charge, homing_orb, ground_slam, fire_breath, frost_breath, sweep | Readable — positioning test |
| 1200ms+ | heavy_slam | Very readable — commitment test |
| 1500ms | void_beam | Long telegraph, but sustained 2s beam is the real threat |

### By AOE Shape
| Shape | Abilities |
|-------|-----------|
| Circle | ground_slam, heavy_slam, pounce, stomp, shadow_step, teleport_strike |
| Narrow Arc (60-120°) | melee_swing, bite, claw_swipe, double_strike |
| Wide Arc (180-270°) | tail_whip (180°), sweep (270°) |
| Cone (breath) | fire_breath (60°), frost_breath (75°), poison_cloud (90°) |
| Line | charge, lunge, void_beam |
| Projectile | projectile_single, projectile_burst, web_shot, homing_orb |
| Special | life_drain (beam/channel) |

### By Status Effect
| Effect | Abilities | Duration | Player Counter |
|--------|-----------|----------|----------------|
| Knockback | heavy_slam (3), tail_whip (2) | Instant | Position awareness — don't get knocked into hazards |
| Stun | charge (1s), stomp (0.5s) | 0.5-1s | Dodge telegraph — stun enables follow-up damage from other enemies |
| Root | web_shot | 2s | Dodge projectile — rooted player is vulnerable to everything |
| Bleed | bite | 3s DOT (3 dmg/tick) | Kill Flame Bats fast — bleeds stack with multiple Bats |
| Poison | poison_cloud, poison_touch | 3-4s DOT | Avoid cone, kill Crystal Spider before poison accumulates |
| Slow | frost_breath (50%), frost_aura (30%) | 3s / passive | Kill Frost Elemental first — slow makes everything else deadlier |
| Heal Self | life_drain (50% of damage) | Per hit | Focus fire to out-damage the healing |
| Lingering Flames | fire_breath | 3s ground zone | Avoid the zone — it blocks movement and deals DOT |

### By Passive Trigger
| Trigger | Passives | Monsters Using |
|---------|----------|----------------|
| Always active | armored, frost_aura, fire_aura, pack_hunter, shield_barrier, flying | Cave Bat, Deep Crawler, Stone Lurker, Frost Elemental, Flame Sprite, Temple Sentinel, Shield Bearer |
| When not taking damage | regeneration | Ash Walker, Pyro Cultist, Mushroom Sprite |
| HP threshold (30%) | enrage, berserk | Demon Knight, Salamander, Tide Serpent, Frozen Husk, Bone Golem |
| On taking damage | thorns, teleport_when_hurt, adaptive_resistance | Stone Guardian, Ice Golem, Obsidian Golem, Cinder Wisp, Void Touched |
| Before damage applied | evasion, shield_barrier | Flame Bat, Blizzard Spirit, Shadow Imp, Temple Sentinel, Shield Bearer |
| On death | death_explosion, split | Magma Slime, Obsidian Golem, Bone Golem |
| On combat start | call_for_help, ambusher | Skeletal Warrior, Stone Lurker, Shadow Stalker, Giant Spider |
| Timed cycle | ethereal (2s immune / 5s vulnerable) | Phantom, Shadow Stalker |

---

## Design Decisions (Q&A)

The following questions were raised during design review and answered to establish implementation guidelines.

---

### Player-Side Questions

#### Q1: Does the player have tools to counter these mechanics?

**Interrupts:** Yes, players can cancel a telegraphed attack by stunning or knocking back an enemy during the windup phase. This is already half-implemented in the safety check (`if (enemy.isStunned) return;`). See Q7 for cooldown behavior on interrupt.

**Shield breaking:** "Heavy attack" maps to a charged attack input: hold the attack button for 0.5s to charge, release for a heavy attack that deals 2x damage and breaks shields. This competes with dodge for stamina budget.

**Temporary workaround:** Until heavy attack is implemented, shields break after 3-4 hits instead of requiring heavy attack.

**Cleansing status effects:** No general cleanse. Status effects are only scary if they stick. Per-effect counterplay:
- **Bleed:** Stops after 3s duration (survive it)
- **Poison:** Can be outhealed by health pickups
- **Slow:** Wears off in 3s (play defensively)
- **Root:** Lasts 2s (teammates can cover you)

**Ethereal visibility:** The Phantom has a visible "shimmer" effect during immune phase that fades as the vulnerable window approaches. A subtle UI element (outline pulse or timer ring) tells observant players "3... 2... 1... NOW." The transition from immune to vulnerable has a distinct sound cue (crystalline "crack" or "shatter").

---

#### Q2: How does the player learn 22+ unique attack patterns?

**Incremental introduction through floor pools.** Each floor biome introduces 3-4 enemy types maximum, with the first floor limited to two.

| Floors | Enemies Introduced | Mechanics Learned |
|--------|-------------------|-------------------|
| 1-2 | Cave Bat, Magma Slime, Flame Bat | Swarms, area denial, bleed DOTs |
| 3-4 | Crystal Spider, Salamander, Mushroom Sprite | Root, knockback, poison/support |
| 5-6 | Demon Knight, Temple Sentinel, Frost Elemental | Charge, shields, slow debuff |
| 7-8 | Shadow Stalker, Phantom, Elites | Stealth, ethereal phasing, multi-passive enemies |
| 9-10 | Full roster available | Curated encounter templates |

**Death screen:** When a player dies, show: what killed them (enemy name + ability name), how much damage the killing blow did, and a one-line tip ("Dodge sideways when you see the red charge line"). This teaches through failure.

**Telegraph color coding:** Three colors maximum:
- **Red/Orange:** Direct damage
- **Blue/Purple:** Crowd control (stun, root, slow)
- **Green:** DOT/poison zone

The shape of the telegraph already communicates a lot — a line means "move sideways," a circle means "move away," a cone means "get behind."

---

### Balance Questions

#### Q3: What's the enemy attack cadence?

The **global cooldown of 1000ms** is the minimum gap between any two attacks by the same enemy. The **ability cooldown** is the minimum gap between uses of the same ability. Since each enemy only has one ability, the effective attack rate is `max(globalCooldown, abilityCooldown)`.

For most enemies, the ability cooldown (1500ms-6000ms) is longer than the global cooldown, so the global cooldown is irrelevant.

**Between ability cooldowns, the enemy should reposition, not stand still:**
- Demon Knight retreats to charge range
- Cinder Wisp kites away
- Temple Sentinel rotates to face the nearest player

The cooldown window is when the enemy's AI behavior matters most — it's the player's punish window AND the enemy's repositioning window.

**Cadence variation creates combat rhythm:**
- Fast enemies (Cave Bat 1500ms, Flame Bat 1800ms) attack every 1.5-2 seconds — intentional for swarming pests
- Heavy hitters (Demon Knight 6000ms, Stone Guardian 5000ms) attack every 5-6 seconds with dangerous gaps

---

#### Q4: What happens when 5 enemies attack simultaneously?

**Keep the attack token system.** The token system exists to prevent this problem. When an enemy gets the token, it uses its signature ability instead of a generic attack. The token system controls WHO attacks and WHEN. The signature ability system controls HOW they attack.

**Maximum 2-3 simultaneous telegraphs on screen.** If more enemies want to attack, they queue. This prevents telegraph soup where the player can't read any individual threat.

---

#### Q5: How do stacking effects work?

| Effect | Stacking Rule | Cap | Rationale |
|--------|---------------|-----|-----------|
| **Bleed** | Stacks independently | 5 stacks max | 3 Flame Bats = 3 bleeds = 9 dmg/tick. This is what makes swarm Bats dangerous. |
| **Slow** | Highest value only, no additive | 50% max | Frost aura (30%) + frost breath (50%) = 50%, not 80%. An 80% slow is effectively a root. |
| **Root** | Refreshes duration, doesn't stack | N/A | Two Crystal Spiders don't perma-root — second web refreshes 2s timer. |
| **Stun** | Refreshes duration, doesn't stack | N/A | No stunlock through overlapping stomps. |
| **Poison** | Stacks up to 3 instances | 3 stacks | Different sources count as separate stacks. Same source refreshes existing stack. |

---

### Combat Flow Questions

#### Q6: What are the recovery frames after an ability?

Yes, there should be a **punish window after every ability**, and it should be ability-specific. This is fundamental to the combat loop: read the telegraph → dodge → punish the recovery.

| Ability | Recovery (ms) | Rationale |
|---------|---------------|-----------|
| claw_swipe, bite, double_strike | 300-400ms | Fast attacks, short window — reward quick reactions |
| lunge, pounce | 500ms | Dash commits the enemy to a position, brief vulnerability |
| melee_swing, stomp, poison_cloud | 600ms | Medium attacks, medium window |
| charge | 1000ms | Heavy commit — long punish window is the reward for dodging |
| heavy_slam, ground_slam | 800ms | Big swing needs recovery time |
| sweep (270°) | 1000ms | Massive commit — longest punish on a regular enemy |
| fire_breath, frost_breath | 700ms | Breath is channeled, recovery after channel ends |
| shadow_step, teleport_strike | 400ms | Short window because attack is near-instant — balances the low telegraph |
| void_beam | 1500ms | 2s channel + 1.5s recovery = long vulnerability after beam ends |
| homing_orb, projectile_burst | 500ms | Ranged enemies shouldn't be safe just because they're far |

**Add `recoveryTime` to the mapping:**
```javascript
'Demon Knight': {
    signatureAbility: 'charge',
    signaturePassive: 'enrage',
    recoveryTime: 1000
},
```

During recovery, the enemy should play a "staggered" or "resetting" animation and take **bonus damage (1.25x-1.5x)**. This is how the player learns the combat loop: dodge, then hit during recovery, then disengage before the next attack.

---

#### Q7: Can players interrupt telegraphed attacks?

**Yes, and the interrupted ability goes on cooldown at 50% of its normal duration.**

| Scenario | Result | Reasoning |
|----------|--------|-----------|
| Cooldown resets on interrupt | Stun-locking becomes optimal. Enemy never attacks. No tension. |
| Full cooldown persists | Enemy is sitting duck for full 6s cooldown. Too punishing to enemy. |
| **50% cooldown on interrupt** | Middle ground. Player rewarded (free damage window) but enemy recovers faster than normal. |

**Example:** Demon Knight stunned during 800ms charge telegraph. Charge cancels. 6000ms cooldown starts at 3000ms. Knight recovers from stun, has ~2 seconds of non-threatening behavior, then starts next charge.

**Implementation:**
```javascript
// In the safety check when ability cancels:
if (enemy.isStunned || enemy.isRooted) {
    // Ability cancelled — set half cooldown
    abilitySet.cooldowns[ability.id] = ability.cooldown * 0.5;
    return;
}
```

---

#### Q8: How does enemy positioning work with new abilities?

**Charge/lunge abilities must move the enemy.** The Demon Knight physically moves from start position along the charge line to end position (or until it hits player/wall).

| Enemy | Positioning Behavior |
|-------|---------------------|
| Demon Knight | AI maintains preferred range of 8-10 tiles. When charge ready, telegraphs and charges to player. |
| Pyro Cultist | Effective homing_orb range is 20 tiles, but kiter AI maintains 6-8 tiles preferred range. Fires orbs from mid-range. |
| All charge/lunge | Wall collision = 10-15 self-damage + 500ms-1000ms stun/recovery. Distinct impact sound and screen shake. |

**Wall collision is one of the most satisfying outcomes in combat** — baiting a charge into a wall should be a learnable tactic.

---

### Passive Interaction Questions

#### Q9: How do multiple passives on one enemy interact?

| Enemy | Passives | Interaction |
|-------|----------|-------------|
| Shadow Stalker | ambusher + ethereal | Ambush bonus applies to first attack from stealth, NOT from exiting ethereal immunity. Once consumed, ethereal cycling is just survivability. Ambush bonus does not refresh. |
| Bone Golem | split + berserk | Split copies spawn at 30% of parent HP = exactly the berserk threshold. **Split copies spawn already enraged.** This is intentional and terrifying. If too brutal, make copies spawn at 35% HP (above threshold). |
| Stone Lurker | ambusher + armored | Ambush bonus applies to first ground_slam only (the eruption from hiding). After that, Lurker is a slow armored tank. The contrast IS the communication. |

---

#### Q10: How do death triggers resolve with multiple enemies?

**Chain reactions: yes, but with a frame delay.**

| Rule | Value | Rationale |
|------|-------|-----------|
| Chain delay | 500ms per chain level | Prevents infinite loops, creates satisfying cascade |
| Maximum chain depth | 3 | A kills B kills C kills D... stop at C. |
| Can kill player after last enemy dies? | **Yes** | The 1000ms fuse exists so players can see it coming. "Don't celebrate early." |

**Implementation:**
```javascript
scheduleDeathExplosion(enemy, config) {
    const chainDepth = enemy._chainDepth || 0;
    if (chainDepth >= 3) return; // Max chain depth

    const totalDelay = config.delay + (chainDepth * 500);

    setTimeout(() => {
        const entities = this.getEntitiesInRadius(enemy.position, config.radius);
        entities.forEach(entity => {
            this.applyDamage(entity, config.damage, 'explosion');
            if (entity.type === 'enemy' && entity.hp <= 0) {
                entity._chainDepth = chainDepth + 1;
                // entity's own onDeath will handle its death_explosion
            }
        });
    }, totalDelay);
}
```

---

### Technical Questions

#### Q11: What happens to pending abilities when enemy dies?

| State | Behavior |
|-------|----------|
| Telegraph in progress | Cancels (already implemented via safety check) |
| Projectile already in flight | **Persists.** A homing_orb that's been fired is an independent entity — keeps tracking until it hits, leaves play area, or times out (10-second max lifetime). |

---

#### Q12: How do telegraphs render with overlapping AOEs?

**Transparency stacking with distinct outlines:**
- Each telegraph: 30-40% opacity fill with solid colored border
- Overlap zone: 60-80% opacity (naturally communicates "VERY dangerous")
- Solid borders remain distinct for individual threat identification

**Z-ordering:** Most recent telegraph renders on top (newest threat = most visible = matches attention priority).

In practice, attack token system limits simultaneous telegraphs to 2-3, so massive overlap is rare.

---

#### Q13: What's the performance cost of passive updates?

**Use event-driven triggers, not per-frame polling.**

| Passive | Trigger Model |
|---------|---------------|
| regeneration | Timer event (check every 1000ms, not every frame) |
| enrage/berserk | On-damage event (check HP threshold when damaged) |
| ethereal | Timer event (toggle every 2s/5s using setTimeout) |
| pack_hunter | On-spawn/on-death event + proximity check every 1000ms |
| thorns | On-damage event (reflect in damage pipeline) |
| teleport_when_hurt | On-damage event |
| evasion | Pre-damage event |
| fire_aura/frost_aura | Timer event (tick every 1000ms for proximity check) |

Convert `updatePassives()` from per-frame call to event-subscription model.

---

### Progression Questions

#### Q14: How does this affect dungeon difficulty curve?

**Floor 1 enemies are learnable:**
- Cave Bat (claw_swipe + pack_hunter): Fast swipes in small groups
- Magma Slime (fire_breath + death_explosion): Big visible cone, 1-second fuse with pulsing glow

These are tutorial enemies with visually obvious mechanics.

**Elite jump is manageable IF player has learned base mechanics.** An Obsidian Golem is a Stone Guardian (ground_slam + thorns, learned floor 3-4) with death_explosion added (learned from Magma Slime floor 1-2). **Elites combine mechanics the player has already seen individually, not introduce brand new ones.**

---

#### Q15: Does enemy variety per floor need adjustment?

**Yes — curated pools, not random.**

Each floor has a pool of 3-5 enemy types with encounter templates that combine them in designed ways. Random spawning from full roster would be chaotic and unlearnable.

---

### Missing Systems Questions

#### Q16: What audio cues accompany abilities?

**Every ability needs two audio cues:**

| Cue Type | Purpose | Examples |
|----------|---------|----------|
| Telegraph sound | Warning when windup starts | Fast attacks: quick "swoosh"/"hiss". Slow attacks: rising tone/rumble. Charge: roar/scraping. |
| Impact sound | Feedback when ability resolves | Blunt: thud. Blade: slash. Fire: crackle. Ice: shatter. Miss: "whiff" sound. |

**Off-screen warning:** If enemy telegraphs ability targeting player from off-screen:
- Directional audio cue (louder in ear closest to threat)
- Screen-edge indicator (red flash on edge attack is coming from)

Without this, off-screen charges and homing orbs feel unfair.

---

#### Q17: How does this integrate with existing special attack system?

**Replace, don't coexist.** The old `enemy.special` field (Earthquake, Bone Shatter, Void Blast) is deprecated. Signature ability system replaces it entirely.

Obsidian Golem's old "Earthquake (AOE stun)" is now `ground_slam` — same concept, implemented through unified ability system with proper telegraphs, cooldowns, and recovery windows.

**Clean up by removing or commenting the special field:**
```javascript
// DEPRECATED: special attacks replaced by MONSTER_SIGNATURE_ABILITIES
// 'Obsidian Golem': { special: 'Earthquake' }
// NOW: 'Obsidian Golem': { signatureAbility: 'ground_slam', ... }
```

---

#### Q18: What happens to the boss system?

**Bosses use multiple signature abilities in a phase-based system.**

| Entity Type | Abilities | Passives | Special |
|-------------|-----------|----------|---------|
| Regular enemy | 1 ability | 1 passive | — |
| Elite | 1 ability | 2 passives (one boss-tier) | — |
| Boss | 3-4 abilities | 2-3 passives | Phase transitions + arena hazards |

**Bosses cycle through abilities based on HP phase.** Example floor 3 boss:
- Phase 1 (100-60% HP): `charge`
- Phase 2 (60-30% HP): `ground_slam` + `summon_minions`
- Phase 3 (below 30%): `berserk_roar` + `meteor`

Each phase introduces a new ability the player must learn mid-fight.

**Implementation priority:** Get regular enemy signature abilities working first. Bosses become "what if one enemy had four of these abilities and switched between them."

---

## Resolved: Recovery Timer Ownership

**Decision: EnemyAbilitySystem owns the entire ability lifecycle.**

One system, one chain of responsibility: Telegraph → Resolve → Recovery → Idle.

The EnemyAI system only checks a single boolean: `enemy.abilityLockout`.

**Rationale:** If ownership is split (ability system handles telegraph, AI system handles recovery), two systems must agree on state transitions. Any desync creates stuck enemies. A `setTimeout` chain within the ability system is self-contained and guaranteed to resolve.

---

### Full Lifecycle Implementation

```javascript
executeAbility(enemy, target, ability, abilitySet) {
    const MINIMUM_TELEGRAPH = 300;
    const isException = this.FAST_TELEGRAPH_EXCEPTIONS.includes(ability.id);

    const telegraphTime = isException
        ? (ability.telegraphTime || MINIMUM_TELEGRAPH)
        : Math.max(ability.telegraphTime || 0, MINIMUM_TELEGRAPH);

    const recoveryTime = ability.recoveryTime || 600; // default 600ms

    // Set cooldowns immediately — cooldown starts at telegraph, not at resolution
    abilitySet.cooldowns[ability.id] = ability.cooldown;
    abilitySet.globalCooldown = 1000;

    // Lock the enemy into ability state — EnemyAI checks this flag
    enemy.abilityState = 'telegraph';
    enemy.abilityLockout = true;

    // Create telegraph visual
    this.createTelegraph(enemy, target, ability);

    // Store enemy ID and ability for safety checks
    const enemyId = enemy.id;
    const abilityId = ability.id;

    // ── PHASE 1: Telegraph → Resolve ──
    setTimeout(() => {
        // Safety: cancel if enemy died, stunned, or removed
        if (!enemy || enemy.hp <= 0 || !this.enemyAbilities.has(enemyId)) {
            this.cleanupAbilityState(enemy);
            return;
        }

        // Interrupted: ability cancelled, half cooldown, skip to recovery
        if (enemy.isStunned || enemy.isRooted) {
            abilitySet.cooldowns[abilityId] = ability.cooldown * 0.5;
            this.enterRecovery(enemy, recoveryTime * 0.5, enemyId);
            return;
        }

        // Resolve the ability (deal damage, apply effects)
        enemy.abilityState = 'resolving';
        this.resolveAbility(enemy, target, ability);

        // ── PHASE 2: Resolve → Recovery ──
        this.enterRecovery(enemy, recoveryTime, enemyId);

    }, telegraphTime);
},

enterRecovery(enemy, recoveryTime, enemyId) {
    enemy.abilityState = 'recovery';
    enemy.damageTakenMultiplier = 1.25; // Bonus damage during recovery

    // Visual: play stagger/reset animation
    enemy.combat.attackAnimation = {
        state: 'recovery',
        timer: recoveryTime
    };

    // ── PHASE 3: Recovery → Idle ──
    setTimeout(() => {
        // Safety: enemy may have died during recovery
        if (!enemy || enemy.hp <= 0 || !this.enemyAbilities.has(enemyId)) {
            this.cleanupAbilityState(enemy);
            return;
        }

        this.cleanupAbilityState(enemy);

    }, recoveryTime);
},

cleanupAbilityState(enemy) {
    if (!enemy) return;
    enemy.abilityState = null;
    enemy.abilityLockout = false;
    enemy.damageTakenMultiplier = 1.0;
    enemy.combat.attackAnimation = { state: 'idle', timer: 0 };
}
```

---

### EnemyAI Integration

The AI side is minimal — just check the lockout flag:

```javascript
// In enemy-ai.js — _attackDirect()
_attackDirect(game) {
    if (!this.target) {
        this._releaseAttackToken();
        return;
    }

    // If ability system has control, do nothing
    if (this.enemy.abilityLockout) return;

    this._face(this.target.gridX, this.target.gridY);

    if (typeof EnemyAbilitySystem !== 'undefined') {
        const usedAbility = EnemyAbilitySystem.tryUseAbility(this.enemy, this.target);
        if (usedAbility) {
            this._releaseAttackToken();
            this.enemy.lastAttackTime = Date.now();
            return;
        }
    }

    // Fallback for unmapped enemies
    console.error(`[FALLBACK ATTACK] ${this.enemy.name} — missing ability mapping`);
    this._performBasicAttackWithTelegraph(game);
}
```

**In the AI update loop — don't reposition during ability execution:**
```javascript
if (this.enemy.abilityLockout) {
    // Enemy is locked into ability animation — no movement,
    // no target switching, no behavior changes
    // EXCEPTION: enemy can still be knocked back by external forces
    return;
}
```

---

### Example Timeline: Demon Knight Charge

| Time | Event | State |
|------|-------|-------|
| t=0ms | Charge cooldown ready, AI calls `tryUseAbility()` | `abilityState = 'telegraph'`, `abilityLockout = true` |
| | Red line telegraph appears, charge roar sound plays | |
| t=800ms | Telegraph setTimeout fires | Safety check passes |
| | `abilityState = 'resolving'` | Enemy physically moves along charge line |
| | Damage applied to anything in path | Impact sound on hit (or wall-collision stun) |
| t=800ms | `enterRecovery()` called immediately after resolve | `abilityState = 'recovery'` |
| | `damageTakenMultiplier = 1.25` | Enemy plays stagger animation |
| | **PLAYER PUNISH WINDOW STARTS** | |
| t=1800ms | Recovery setTimeout fires (800 + 1000ms) | `cleanupAbilityState()` |
| | `abilityState = null`, `abilityLockout = false` | `damageTakenMultiplier = 1.0` |
| | **PLAYER PUNISH WINDOW ENDS** | AI resumes normal behavior |
| t=6800ms | Charge cooldown expires (set at t=0) | AI can call `tryUseAbility()` again |

---

### Why Cooldown Starts at Telegraph

If cooldown started after recovery, total cycle = telegraph (800ms) + recovery (1000ms) + cooldown (6000ms) = **7800ms between charges**. Too slow.

By starting cooldown at telegraph time, the effective gap between attacks is the cooldown minus telegraph+recovery time already elapsed.

**Demon Knight:** 6000ms cooldown, but 1800ms already spent on telegraph+recovery = **~4200ms idle window** where the group repositions and deals damage.

---

### Edge Case: External Knockback During Telegraph

**Example:** Stone Guardian's ground_slam knocks Demon Knight mid-charge-telegraph.

**Decision:** Treat external knockback as an interrupt.
- Cancel the ability
- Apply half cooldown
- Enter recovery

This creates tactical moments where environmental disruption affects enemy coordination. A well-timed AoE can disrupt multiple enemy telegraphs simultaneously.
