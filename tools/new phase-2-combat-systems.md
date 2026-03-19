# The Shifting Chasm — Phase 2: Combat System Integration

---

## Vision

Phase 2 transforms The Shifting Chasm from a functional prototype into a game that feels alive. The MVP (Phase 1) proves the skeleton works — the player can walk, fight, loot, and die across 10 floors. But without the six systems in this phase, every run is mechanically identical. The player swings, the enemy dies, loot drops, repeat. There is no decision-making beyond "walk forward and attack."

Phase 2 introduces **the decision layer.** After this phase, the player is constantly choosing: Do I spend stamina on one more attack or save it for a dash? Do I stack fire boons for raw damage or defense boons for survivability? Do I use Fireball on this group or save the cooldown for the next room? Do I stand in this choke point and risk the fire patch, or reposition and let the swarm spread out?

These six systems — Boons, Stamina, Spells, Kill Streaks, Time Effects, and Lingering Hazards — are not independent features. They are an interlocking combat ecosystem. Stamina limits how aggressively you can play. Boons modify the cost/benefit of that aggression. Spells give you burst options when stamina is low. Kill streaks reward sustained aggression without taking damage. Time effects make critical moments feel weighty. Hazards force you to think about positioning, not just target selection.

A player who finishes Phase 2 will say: "I died on Floor 6 because I burned all my stamina on a swarm, couldn't dash away from the fire patch, and my shield spell was on cooldown. Next run I'm going to take the stamina regen boon early and save my spells for emergencies." That sentence — that autopsy of decisions — is the game.

---

## MVP Prerequisite Audit

> **This section verifies that all MVP (Phase 1) requirements from `MVP_IMPLEMENTATION_GUIDE.md` and `MVP_PLAYTEST_IMPLEMENTATION_PLAN.md` are satisfied before Phase 2 work begins. Phase 2 systems depend on the MVP core loop being solid. Incomplete MVP items will cause integration failures in Phase 2.**

### MVP Status Matrix

#### Tier 0 — Critical Blockers

| # | Item | Status | Impact on Phase 2 |
|---|------|--------|--------------------|
| 0.1 | Game auto-starts to main menu | DONE | None — resolved |
| 0.2 | Main menu click/key handlers | DONE | None — resolved |
| 0.3 | Starter loadout weapon mismatch | DONE | None — dynamic weapon selection works |
| 0.4 | **Global crash recovery handler** | **NOT DONE** | **HIGH** — Phase 2 adds 6 interacting systems, making crashes more likely. Without `window.onerror` recovery, testing will be extremely painful. **Must be implemented before Phase 2 starts.** |
| 0.5 | **Save trigger policy** | **PARTIAL** | **MEDIUM** — Auto-save every 30s works, but no saves on village entry, shop transactions, or victory. Saves only protect against browser crashes (all saved state is wiped on death anyway). Phase 2 doesn't directly depend on this. |
| 0.6 | Extraction system disabled | DONE | None — files deleted |

#### Tier 1 — Core Gameplay Loop

| # | Item | Status | Impact on Phase 2 |
|---|------|--------|--------------------|
| 1.1 | Village → Dungeon transition | DONE | Loadout → dungeon chain works. Phase 2 spells need to hook into loadout's spell selection (already wired for Dash/Heal/Shield). |
| 1.2 | Basic combat functional | DONE | `applyDamage()`, `handleDeath()`, damage numbers all working. Phase 2 hooks into these for stamina gating, boon modifiers, time effects triggers. |
| 1.3 | Item pickup and inventory | DONE | Loot system works. Phase 2 doesn't add new item types. |
| 1.4 | Floor advancement (1-10) | DONE | `advanceToNextFloor()` preserves player state. Phase 2 boons must also persist across floors (they do — stored on player). |
| 1.5 | Victory condition (Floor 10) | DONE | Victory screen renders, `SessionManager.coreCompleted()` works. Phase 2 death screen needs to show boons/streaks — extends this. |
| 1.6 | Death and game over | DONE | `handlePlayerDeath()` clears boons and status effects. Phase 2 relies on this for boon/stamina/streak reset. |
| 1.7 | NPC dialogue system | DONE | Works fully. Not impacted by Phase 2. |
| 1.8 | Shop system (buy/sell) | DONE | Gold transfers work. Not impacted by Phase 2. |
| 1.9 | Skill system (XP on kill) | DONE | `awardSkillXp()` called from `handleDeath()`. Skills level up during a run. Wiped on death (permadeath). Not impacted by Phase 2. |

#### Tier 2 — Within-Run Infrastructure (Bank, Loadout, Stats)

| # | Item | Status | Impact on Phase 2 |
|---|------|--------|--------------------|
| 2.1 | Bank system | DONE (bug) | Deposit/withdraw works. **Backend capacity is still `Infinity`** while UI enforces 30. Fix before Phase 2 to avoid inventory exploits. |
| 2.2 | Loadout selection | DONE | 3-panel layout with spell selection. Phase 2's 3 new spells need to be added to the loadout spell picker. |
| 2.3 | **Within-run statistics** | **PARTIAL** | `totalKills`, `totalGoldEarned`, `victories` fields exist in `persistentState.stats` but **`trackMonsterKill()` is never called from combat**. Note: these stats are wiped on death (permadeath). They only matter for the death/victory screen summary and within-run tracking. Phase 2's `runStats` object depends on kill tracking working. **Must wire `trackMonsterKill()` into `handleDeath()` before Phase 2.** |

#### Tier 3 — Depth & Engagement

| # | Item | Status | Impact on Phase 2 |
|---|------|--------|--------------------|
| 3.1 | Boon system | DONE | 70 boons, shrine UI, interaction chain all working. Phase 2 extends this with synergies and stat previews. |
| 3.2 | **Enemy scaling by floor** | **INCOMPLETE** | **`applyTierMultipliers()` is still undefined.** Tier weight distribution works (TIER_3 on early floors, ELITE on deep floors) but HP/damage don't scale by floor. Phase 2 balance depends on enemy scaling working. **Must implement before Phase 2 tuning.** |
| 3.3 | Playtest feedback tool | DONE | F9 dumps state. Ready. |

#### Tier 4 — Polish & Feel

| # | Item | Status | Impact on Phase 2 |
|---|------|--------|--------------------|
| 4.1 | HUD during dungeon | DONE | Unit frames, minimap, action bar all working. Phase 2 adds boon icons and stamina bar enhancements. |
| 4.2 | Visual feedback | DONE | Damage numbers, screen shake, status effects all working. Phase 2 time effects hook into screen shake. |
| 4.3 | **Controls overlay** | **NOT DONE** | **LOW** — Not a Phase 2 blocker, but Phase 2 adds new hotkeys for spells. F1 help overlay should exist before adding 6 new keybindings. |
| 4.4 | Pause menu | DONE | ESC → Resume/Settings/Quit works. Not impacted by Phase 2. |

### Critical MVP Items That Must Be Complete Before Phase 2

These items are incomplete and **will cause Phase 2 integration failures** if not resolved first:

1. **Crash recovery handler (MVP 0.4)** — Phase 2 adds 6 tightly-coupled systems. Unhandled exceptions will increase. Without crash recovery, testing is impractical.

2. **`applyTierMultipliers()` missing (MVP 3.2)** — Phase 2 stamina costs, boon bonuses, and spell damage are all tuned against expected enemy difficulty curves. If all enemies have identical stats regardless of floor, no balance tuning is meaningful.

3. **`trackMonsterKill()` not called (MVP 2.3)** — Phase 2 introduces `game.runStats` which aggregates kill data, streak data, boon data, and spell data. If the base kill tracking doesn't work, runStats will be incomplete.

4. **Save triggers on village entry and victory (MVP 0.5)** — Phase 2 doesn't directly depend on this, but saves protect against browser crashes mid-run. Without save triggers, a player who crashes after banking items loses those items. (All saved state is still wiped on death — saves only protect against crashes, not death.)

5. **Bank capacity backend fix (MVP 2.1)** — Backend returns `Infinity` while UI caps at 30. This inconsistency could cause item overflow bugs.

### Recommended Pre-Phase-2 Checklist

```
[ ] Implement window.onerror + window.onunhandledrejection crash recovery (MVP 0.4)
[ ] Define applyTierMultipliers() in enemy-spawner.js (MVP 3.2)
[ ] Wire trackMonsterKill() into handleDeath() in combat-master.js (MVP 2.3)
[ ] Add SaveManager.save() calls on village entry and victory for crash protection (MVP 0.5)
[ ] Fix BankingSystem.maxSlots to 30 instead of Infinity (MVP 2.1)
[ ] Add F1 controls overlay (MVP 4.3) — optional but recommended
```

---

## Design Constraints

- **True permadeath. Nothing persists after death.** All state is wiped: carried items, gold, bank contents, skills, stats, quest progress, boons — everything. The player starts completely fresh. The only things retained are the player's own knowledge and mechanical ability. The codebase enforces this via `createNewPersistentState()` on death and `SaveManager.deleteSave()` which wipes the localStorage save file.
- **`localStorage` stores within-run persistent state only.** Bank, skills, stats, and save data are stored in localStorage so the player can close the browser and resume. All of this is wiped on death.
- **All progression is within-run.** Boons shape the build. Gear is found and equipped during the run. Skills level up during the run. Bank stores items between dungeon floors. None of this survives death.
- **There is no between-run progression.** No meta-progression, no unlocks, no carried-over stats. Run 1 and run 100 start from the same place. The game's replayability comes from boon build variety and player skill improvement, not accumulated power.
- **Phase 2 is combat systems only.** Boss encounters, content expansion (new enemies, weapons, floor themes), and audio/visual polish are deferred to later phases.

> **NOTE FOR IMPLEMENTERS:** The MVP Playtest Implementation Plan (`MVP_PLAYTEST_IMPLEMENTATION_PLAN.md`) contains language like "skills persist across death" and "bank contents survive death" — this is **outdated and incorrect**. The authoritative design is **true permadeath**: death wipes everything. The codebase already enforces this (`handlePlayerDeath()` → `SessionManager.playerDeath()` → `createNewPersistentState()` → `SaveManager.deleteSave()`). Do not add any logic that preserves state across death. The MVP Playtest Plan should be updated to reflect this.

---

## Architecture Overview

### System Initialization Order

All six systems initialize through `SystemManager` in `js/core/system-manager.js`. The current initialization order matters because several systems depend on shared config and on each other.

> **CODEBASE NOTE:** `SystemManager` already exists with a priority-based registration system. Systems are registered with a numeric priority (lower = earlier) and both `initAll()` and `updateAll()` respect priority order. Current priority ranges: 5-29 (Input/Vision), 30-39 (Environmental), 40-49 (AI), 50-59 (Combat), 60-79 (Post-Combat), 80-99 (UI/Cleanup). The Phase 2 systems must be registered at appropriate priorities within this existing scheme.

**Required init order (mapped to SystemManager priorities):**
```
1. Constants / Config          (js/core/constants.js)                — loaded at script level, no priority
2. GameState                   (js/core/game-state.js)               — loaded at script level, no priority
3. TimeEffects                 (js/systems/time-effects.js)          — priority 8 (before all gameplay systems)
4. StaminaSystem               (js/systems/stamina-system.js)        — priority 28 (after input, before combat)
5. SpellSystem                 (js/systems/spell-system.js)          — priority 29 (depends on StaminaSystem)
6. LingeringHazards            (js/systems/lingering-hazards.js)     — priority 35 (already registered at this level)
7. BoonSystem                  (js/systems/boon-system.js)           — priority 38 (after hazards, modifies all values)
8. KillStreakSystem             (js/systems/kill-streak-system.js)    — priority 62 (post-combat reaction)
9. CombatMaster                (js/systems/combat-master.js)         — priority 55 (already registered, orchestrates combat)
```

**IMPORTANT:** SystemManager already enforces priority ordering. Do NOT add duplicate initialization calls. Currently, StaminaSystem, KillStreakSystem, and TimeEffects are updated MANUALLY in `updateDungeon()` (in `main.js`) instead of being registered with SystemManager. These manual calls must be migrated into SystemManager registrations to ensure consistent ordering and avoid double-updates.

**Current manual update calls to migrate (from `main.js` `updateDungeon()`):**
```
StaminaSystem.update(dt/1000)    → register with SystemManager at priority 28
KillStreakSystem.update(dt/1000) → register with SystemManager at priority 62
KillStreakUI.update(dt/1000)     → register with SystemManager at priority 82
TimeEffects.update(dt/1000)      → register with SystemManager at priority 8
```

**Verification:** Add a console log to each system's `init()`: `console.log('[SystemManager] Initializing: StaminaSystem')`. On game boot, confirm the log order matches the sequence above.

### Game Loop Integration

All six systems hook into the main game loop at specific phases. The loop in `main.js` should call systems in this order per frame:

```
1. Input Processing          — read player input, queue actions
2. TimeEffects.update(dt)    — compute effective deltaTime (dt * timeScale)
3. StaminaSystem.update(dt)  — regen stamina, update exhaustion state
4. SpellSystem.update(dt)    — tick cooldowns, update active spell effects
5. Player.update(dt)         — move, attack (consumes stamina, checks spells)
6. Enemy AI + Update(dt)     — all enemy behavior, movement, attacks
7. CombatMaster.resolve()    — process all queued attacks → damage → death
   ├── triggers KillStreakSystem on enemy death
   ├── triggers TimeEffects on critical hits
   ├── triggers LingeringHazards on ability hits
   └── triggers StaminaSystem.refund() on kills
8. LingeringHazards.update(dt) — tick hazard timers, apply damage to entities in zones
9. BoonSystem.update(dt)     — tick conditional boon effects (if any are time-based)
10. KillStreakSystem.update(dt) — tick decay timer
```

**Critical:** `TimeEffects` must update FIRST because it determines the effective `deltaTime` that all other systems use. If `TimeEffects.timeScale` is 0.3, then `dt` passed to all subsequent systems should be `rawDt * 0.3`.

### Event Bus

> **CRITICAL CODEBASE GAP:** EventBus does NOT exist yet. Multiple systems already reference it with guards like `if (typeof EventBus !== 'undefined')` — meaning the codebase was designed to use one but it was never created. Systems that already emit guarded EventBus calls include: `dodge-system.js` (`player:dodge_start`), `spell-system.js` (`player:spell_heal`, `player:spell_shield`, `player:shield_break`), and `enemy-ai.js` (`encirclement:changed`). **Creating EventBus is a prerequisite for all Phase 2 work.** It must be loaded before any system script in `index.html`.

Create the event bus:

```javascript
// js/core/event-bus.js
const EventBus = {
    listeners: {},
    on(event, callback) {
        (this.listeners[event] = this.listeners[event] || []).push(callback);
    },
    off(event, callback) {
        if (this.listeners[event]) {
            this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
        }
    },
    emit(event, data) {
        (this.listeners[event] || []).forEach(cb => cb(data));
    }
};
```

> **ADDITION:** Add `once()` support — several Phase 2 events (synergy activation notification, death screen capture) only need to fire once per occurrence. Without `once()`, systems must manually call `off()` after handling, which is error-prone.
>
> ```javascript
> once(event, callback) {
>     const wrapper = (data) => {
>         this.off(event, wrapper);
>         callback(data);
>     };
>     this.on(event, wrapper);
> }
> ```

**Events used across Phase 2 systems:**

| Event Name | Emitted By | Consumed By | Data Payload |
|---|---|---|---|
| `enemy:death` | CombatMaster | KillStreakSystem, StaminaSystem, LootSystem | `{ enemy, killer, position, damageType }` |
| `player:damage_taken` | CombatMaster | KillStreakSystem, TimeEffects (if lethal) | `{ amount, source, damageType, isLethal }` |
| `player:critical_hit` | CombatMaster | TimeEffects, KillStreakSystem | `{ target, damage, damageType }` |
| `player:death` | CombatMaster / GameState | BoonSystem, KillStreakSystem, LingeringHazards, TimeEffects | `{ cause, floor, runStats }` |
| `player:spell_cast` | SpellSystem | StaminaSystem, LingeringHazards (for hazard-creating spells) | `{ spellId, staminaCost, position, direction }` |
| `player:boon_selected` | BoonSystem | HUD renderer | `{ boon, totalBoons, ancestor }` |
| `floor:advance` | GameInit | KillStreakSystem, LingeringHazards, BoonSystem (tier unlock check) | `{ newFloor, previousFloor }` |
| `streak:tier_up` | KillStreakSystem | TimeEffects (optional shake), HUD, Audio | `{ tier, tierName, killCount }` |
| `hazard:created` | LingeringHazards | Renderer (for telegraph rendering) | `{ hazard }` |
| `stamina:exhausted` | StaminaSystem | Renderer (for vignette), Audio (gasp sound) | `{ current: 0 }` |
| `stamina:recovered` | StaminaSystem | Renderer (remove vignette) | `{ current, max }` |

**The codebase does NOT have an event system yet.** Multiple files guard EventBus calls with `typeof` checks. Creating `js/core/event-bus.js` and loading it early in `index.html` (before any system scripts) will activate all existing guarded emit calls automatically. Audit each guarded call to ensure the event names align with the table above.

### Shared State: `game.runStats`

All six systems contribute to the run statistics displayed on death/victory screens. `game.runStats` is the **sole run statistics tracker** — `persistentState.stats` is deprecated and should not be used for Phase 2. `runStats` is created fresh on each `startNewGame()`, destroyed on death along with everything else (permadeath), and only read by the death/victory screen renderer before the wipe:

```javascript
// Created in game-init.js at startNewGame()
game.runStats = {
    floorsReached: 0,
    enemiesKilled: 0,
    damageDealt: 0,
    damageTaken: 0,
    goldEarned: 0,
    itemsCollected: 0,
    boonsCollected: [],         // array of { boonId, boonName, ancestor, tier }
    ancestorSynergies: [],      // array of ancestor names where synergy was active
    highestStreak: 0,
    highestStreakTier: '',
    totalStreaks: 0,            // streaks of 3+
    spellsCast: 0,
    criticalHits: 0,
    hazardsTriggered: 0,       // times player took hazard damage
    hazardsAvoided: 0,         // times player was in telegraph zone and left before damage
    timePlayed: 0,             // seconds
    causeOfDeath: null         // { enemyName, damageType, floor } or null if victory
};
```

Each system writes to `runStats` at the relevant event. The death/victory screen reads from `runStats` to render the summary.

---

## A.1 — BOON SYSTEM INTEGRATION

### Vision

Boons are the answer to "why is this run different from the last one?" In a full-wipe game with no persistent progression, the boon system is the primary mechanism that gives each run a unique identity. By Floor 5, two players who started identically should be playing fundamentally different games based on which shrines they found and which boons they chose.

The boon system also creates the game's core strategic decision: **depth vs. breadth.** Stacking boons from one Ancestor triggers a powerful synergy bonus but leaves you vulnerable in other areas. Spreading across Ancestors gives balanced power but no spike. This tension should be felt every time the player opens a shrine — there is no autopilot "always pick the biggest number" answer.

For multiplayer (Phase 4+), boons become a differentiator between players in the same dungeon. Two players on the same floor with different boon sets play differently, loot differently, and pose different PvP threats. The system must be built cleanly enough that boon state can eventually be serialized and transmitted over the network.

### Engineering Specification

#### Data Architecture

> **CODEBASE MISMATCH:** Ancestors and boons are ALREADY fully defined in `js/systems/boon-system.js` (not a separate data file). The existing 7 Ancestors use different names/IDs than the placeholder names below. The actual Ancestors are: `torchbearer` (fire), `headsman` (physical), `lurker` (shadow), `storm_caller` (lightning), `rot_weaver` (poison), `iron_warden` (ice), `maniac` (chaos). The existing data does NOT include `synergyThreshold` or `synergyBonus` — these must be ADDED to the existing ANCESTORS object, not created from scratch. Do NOT create a new `boon-data.js` — extend the existing `boon-system.js`.

> **EXISTING BOON TIERS (different from this doc):** The codebase uses Core (21 boons, always available), Resonance (42 boons, requires 1 boon from each of 2 different ancestors), and Legendary (7 boons, requires 3 from same ancestor). The floor-based tier gating described below (Tier 1 always, Tier 2 at Floor 3, Tier 3 at Floor 6) conflicts with this requirement-based unlock system. Reconcile these two approaches: either replace the existing system or merge floor gating with requirement gating (e.g., Legendary requires 3 same-ancestor boons AND Floor 6+).

**Ancestor definitions** (extend existing in `js/systems/boon-system.js`):
```javascript
// ADD synergyThreshold and synergyBonus to each existing ANCESTORS entry:
const ANCESTORS = {
    torchbearer: {
        id: 'torchbearer',
        name: 'The Torchbearer',
        title: 'Bearer of the First Light',
        element: 'fire',
        color: '#e67e22',
        icon: '🔥',
        theme: 'Light manipulation, fire damage, visibility',
        // NEW fields for Phase 2:
        synergyThreshold: 3,
        synergyBonus: {
            id: 'torchbearer_synergy',
            name: 'Blazing Legacy',
            description: 'All fire damage +25%. Attacks have 15% chance to ignite.',
            effects: [
                { stat: 'fireDamagePercent', value: 25, type: 'additive' },
                { stat: 'igniteChance', value: 15, type: 'additive' }
            ]
        }
    },
    headsman: { /* ... add synergyThreshold + synergyBonus ... */ },
    lurker: { /* ... */ },
    storm_caller: { /* ... */ },
    rot_weaver: { /* ... */ },
    iron_warden: { /* ... */ },
    maniac: { /* ... */ }
};
```

**Boon definitions** (individual boons within each Ancestor pool):
```javascript
const BOONS = {
    // NOTE: Use actual Ancestor IDs from boon-system.js, NOT placeholder names.
    // Actual IDs: torchbearer, headsman, lurker, storm_caller, rot_weaver, iron_warden, maniac
    flame_touched: {
        id: 'flame_touched',
        name: 'Flame Touched',
        ancestor: 'torchbearer',   // matches ANCESTORS.torchbearer in boon-system.js
        tier: 1,
        description: '+10% fire damage.',
        effects: [
            { stat: 'fireDamagePercent', value: 10, type: 'additive' }
        ],
        icon: 'boon_flame_touched'
    },
    inferno_will: {
        id: 'inferno_will',
        name: 'Inferno Will',
        ancestor: 'ember',
        tier: 2,
        description: '+20% fire damage. Attacks burn enemies for 3 damage/sec over 4 seconds.',
        effects: [
            { stat: 'fireDamagePercent', value: 20, type: 'additive' },
            { stat: 'burnOnHit', value: { damage: 3, duration: 4 }, type: 'special' }
        ],
        icon: 'boon_inferno_will'
    },
    // ... 68 more boons
};
```

**Effect types and how they resolve:**

| `type` Value | Meaning | Resolution |
|---|---|---|
| `additive` | Add flat value to player stat | `player[stat] += value` on apply, `player[stat] -= value` on remove |
| `multiplicative` | Multiply player stat | `player[stat] *= (1 + value/100)` on apply. Removal requires tracking base values (see below). |
| `special` | Custom logic | Each `special` effect has a handler keyed by stat name. E.g., `burnOnHit` registers a hook in CombatMaster that checks on every hit. |
| `conditional` | Active only when condition is met | Checked in `BoonSystem.update(dt)` every frame. E.g., `{ condition: 'hpBelow50', stat: 'damage', value: 30 }` applies +30 damage only when HP < 50%. Must cleanly apply/remove as condition toggles. |

**Multiplicative stat resolution — base value tracking:**

This is the most common source of boon bugs. If a player's base damage is 20 and a boon applies +50% (`multiplicative`), damage becomes 30. If a second boon applies +25%, the naive approach would give `30 * 1.25 = 37.5`. But if the first boon is then removed, we'd need to compute `37.5 / 1.5 = 25` which is wrong (should be `20 * 1.25 = 25`).

**Solution: always store the base value and recompute all multiplicative modifiers from scratch.**

```javascript
class StatModifierStack {
    constructor(baseValue) {
        this.base = baseValue;
        this.additiveModifiers = [];    // [{ id, value }]
        this.multiplicativeModifiers = []; // [{ id, value }]
    }

    addModifier(id, value, type) {
        if (type === 'additive') this.additiveModifiers.push({ id, value });
        else if (type === 'multiplicative') this.multiplicativeModifiers.push({ id, value });
    }

    removeModifier(id) {
        this.additiveModifiers = this.additiveModifiers.filter(m => m.id !== id);
        this.multiplicativeModifiers = this.multiplicativeModifiers.filter(m => m.id !== id);
    }

    compute() {
        // First apply all additive
        let total = this.base;
        for (const mod of this.additiveModifiers) {
            total += mod.value;
        }
        // Then apply all multiplicative (stacked additively with each other)
        let multiplier = 1.0;
        for (const mod of this.multiplicativeModifiers) {
            multiplier += mod.value / 100;
        }
        return total * multiplier;
    }

    clone() {
        const copy = new StatModifierStack(this.base);
        copy.additiveModifiers = this.additiveModifiers.map(m => ({ ...m }));
        copy.multiplicativeModifiers = this.multiplicativeModifiers.map(m => ({ ...m }));
        return copy;
    }
}
```

**Every player stat that boons can modify should use a `StatModifierStack` instance.** This guarantees clean addition and removal regardless of order.

**Stats that boons can modify (complete list for engineering reference):**

| Stat Key | Base Source | Description |
|---|---|---|
| `maxHp` | Player base | Maximum health |
| `damage` | Weapon + base | Melee/ranged damage |
| `magicDamage` | Base + gear | Spell damage |
| `defense` | Armor + base | Damage reduction |
| `speed` | Base | Movement speed (px/s) |
| `attackSpeed` | Weapon base | Attacks per second (or cooldown multiplier) |
| `critChance` | Base (5%) | % chance of critical hit |
| `critDamage` | Base (150%) | Critical hit damage multiplier |
| `fireDamagePercent` | 0 | % bonus to fire damage |
| `iceDamagePercent` | 0 | % bonus to ice damage |
| `poisonDamagePercent` | 0 | % bonus to poison damage |
| `shadowDamagePercent` | 0 | % bonus to shadow damage |
| `fireResist` | 0 | % fire damage reduction |
| `iceResist` | 0 | % ice damage reduction |
| `poisonResist` | 0 | % poison damage reduction |
| `shadowResist` | 0 | % shadow damage reduction |
| `maxStamina` | StaminaSystem base (100) | Maximum stamina |
| `staminaRegenRate` | StaminaSystem base (15/s, 7.5/s in combat) | Stamina regen per second — **actual value is 15/s (not 8/s), halved to 7.5/s in combat via `inCombatRegenMultiplier: 0.5`** |
| `staminaKillRefund` | StaminaSystem base (25) | Stamina gained per kill |
| `healingReceived` | 100% | Multiplier on all healing |
| `igniteChance` | 0 | % chance to apply burn on hit |
| `freezeChance` | 0 | % chance to apply chill on hit |
| `poisonChance` | 0 | % chance to apply poison on hit |
| `lifestealPercent` | 0 | % of damage dealt returned as HP |
| `thornsDamage` | 0 | Flat damage reflected to melee attackers |
| `goldFindPercent` | 0 | % bonus gold from drops |
| `lootRarityBonus` | 0 | Flat addition to loot rarity roll |
| `dashDistance` | SpellSystem base | Dash range in tiles |
| `shieldStrength` | SpellSystem base | Shield HP as % of player max HP |
| `healAmount` | SpellSystem base | Heal amount as % of player max HP |
| `cooldownReduction` | 0 | % reduction to all spell cooldowns |
| `aoeRadiusBonus` | 0 | % increase to all AoE ability radii |

When a boon effect references a stat key not in this table, the test harness (A.1.4) should flag it as an error.

#### A.1.1 Shrine Spawning in Dungeon Generator

**File:** `js/generation/dungeon-generator.js`

**Task:** After room generation and enemy placement, add a shrine placement pass.

> **CODEBASE NOTE:** Shrines are already placed by the dungeon generator. `constants.js` defines `shrineRoomChance: 0.08` in MAP_CONFIG, and `game-init.js` already has `interactWithDecoration()` handling for `decorationType === 'shrine'` that calls `openShrineUI(decoration)`. The shrine UI (`js/ui/shrine-ui.js`, 398 lines) is already implemented and wired into the input handler. **This entire section (A.1.1) describes work that is largely already done.** Review the existing implementation and identify gaps rather than rebuilding from scratch.

> **EXTRACTION SYSTEM REMOVED:** The extraction system was deleted in a previous cleanup pass. Remove all references to `hasExtractionPortal` from shrine placement logic — those checks will throw undefined errors.

**Integration point:** Find the function that finalizes a floor (likely called at the end of `generateFloor()` or `buildFloor()`). The shrine pass should run AFTER:
- Room generation (rooms exist with positions and tags)
- Corridor connections (paths are walkable)
- Stairs/exit placement (so we can exclude those rooms)
- ~~Extraction portal placement (so we can exclude those rooms)~~ **REMOVED — extraction system was deleted**
- Enemy spawning (so shrines don't overlap spawn points)

And BEFORE:
- Fog of war initialization (shrines should be hidden until room is explored)
- Any final validation pass

**Logic:**
```javascript
function placeShrinesToFloor(floor, rooms, floorNumber) {
    const shrineCount = Math.floor(Math.random() * 3) + 2; // 2-4

    // Build eligible room list
    const eligible = rooms.filter(room =>
        !room.hasStairs &&
        // NOTE: hasExtractionPortal removed — extraction system was deleted
        !room.isCorridor &&
        (room.tag === 'treasure' || room.tag === 'special' || room.tag === 'dead_end' || room.size >= 36)
    );

    // If not enough eligible rooms, include large standard rooms
    if (eligible.length < shrineCount) {
        const standard = rooms
            .filter(r => !r.hasStairs && !r.isCorridor && !eligible.includes(r))
            .sort((a, b) => b.size - a.size);
        while (eligible.length < shrineCount && standard.length > 0) {
            eligible.push(standard.shift());
        }
    }

    // Defensive: if still not enough, we place as many as we can
    const actualCount = Math.min(shrineCount, eligible.length);

    // Shuffle and pick
    shuffleArray(eligible);
    const selectedRooms = eligible.slice(0, actualCount);

    // Assign unique Ancestors (avoid duplicates per floor when possible)
    const ancestorPool = shuffleArray(Object.keys(ANCESTORS)).slice();
    
    const shrines = selectedRooms.map((room, index) => {
        const ancestor = ancestorPool[index % ancestorPool.length];
        return {
            type: 'shrine',
            x: room.cx * TILE_SIZE + TILE_SIZE / 2,  // world-space center
            y: room.cy * TILE_SIZE + TILE_SIZE / 2,
            tileX: room.cx,
            tileY: room.cy,
            ancestor: ancestor,
            used: false,
            floor: floorNumber,
            interactionRadius: 1.5 * TILE_SIZE  // 24px at 16px tiles (TILE_SIZE is 16, not 32)
        };
    });

    // Register shrines in the entity system
    shrines.forEach(shrine => {
        floor.entities.push(shrine);
        // Mark the tile as occupied (prevents enemy spawn on shrine tile)
        floor.tileFlags[shrine.tileY][shrine.tileX] |= TILE_FLAG_OCCUPIED;
    });

    return shrines;
}
```

**Tile collision:** Shrines should be walkable tiles (the player walks up to them, not onto them). But the center tile where the shrine visual renders should be flagged as occupied so enemy spawning doesn't place an enemy on top of a shrine.

**Shrine rendering:** The shrine needs a visual on the game map. Options:
- A dedicated sprite (preferred — matches the game's pixel art style)
- A colored circle/glyph drawn programmatically (fallback if sprite isn't ready)
- Color matches the Ancestor's `color` property (ember shrines glow orange, stone shrines glow gray, etc.)
- Idle animation: gentle pulse (opacity 0.7 → 1.0 at 0.5Hz) and/or particle emission (2-3 particles per second in Ancestor color, rising slowly)
- Used shrines: stop pulsing, reduce opacity to 0.3, stop particles. Must be visually obvious that the shrine is spent.

**Systems impacted by this change:**
- `dungeon-generator.js` — new placement pass added
- Entity system — new entity type `'shrine'` must be handled in the entity update loop (even if shrines don't move, they need to be in the entity list for proximity checks)
- Renderer — new rendering logic for shrine visuals (see rendering note above)
- Minimap (`js/ui/mini-map.js`) — shrines should appear as a small icon or colored dot on the minimap once the room is explored. Color matches Ancestor.

**Downstream impact:**
- **Boss phase (future):** Boss rooms should NEVER contain shrines. When boss arenas are added, exclude rooms tagged `'boss_arena'` from the eligible list.
- **Multiplayer (future):** Shrine spawning is deterministic per floor seed. In multiplayer, all players see the same shrines at the same locations. Shrine `used` state is per-player (each player can use each shrine once). The `used` flag will need to be a Map of `playerId → boolean` instead of a single boolean.
- **Content phase (future):** When floor themes are added, shrine visuals should tint to match the floor palette (an ember shrine in an ice-themed floor still glows orange, but the shrine base stone matches the floor).

**Edge cases:**
- Floor generation produces 0 eligible rooms: Force-place one shrine in the largest room on the floor, even if it has enemies. Log a warning.
- Floor generation produces 1 room total (shouldn't happen with current generator, but defensive): Place 1 shrine in that room.
- Shrine placed in a room the player can reach but never needs to visit (dead end far from stairs): This is intentional. The player must choose whether to explore for shrines or rush to the exit. Dead ends containing shrines is a risk/reward design choice.

**Verification:**
1. Generate 50 floors via console loop → log shrine count per floor → all values are 2, 3, or 4.
2. For each shrine, verify `tileX/tileY` is a walkable floor tile, not a wall, not stairs, not a portal.
3. Verify no two shrines in the same room on the same floor.
4. Verify Ancestor assignment: on a floor with 3 shrines, all 3 have different Ancestors. On a floor with 4, at most 4 unique Ancestors.

---

#### A.1.2 Shrine Interaction Flow

**Files:** `js/systems/boon-system.js`, `js/entities/player.js`, `js/core/main.js`, `js/core/input-handler.js`

**Task:** Wire the player interaction system to detect shrine proximity and trigger boon selection.

**Existing interaction pattern:** The game likely already has an interaction system for other entities (cave entrance in village, extraction portals, NPCs). Shrines should use the same pattern. Audit the existing system:
- Does `player.js` already check for nearby interactable entities each frame?
- Is there an `interactableEntities` list that the proximity checker iterates?
- Does pressing E already call `entity.onInteract(player)`?

If yes: add `onInteract` method to shrine entities and register them as interactable.

If no (interaction is hardcoded per entity type): you need to either generalize it now or add shrine-specific proximity checks. Generalizing is recommended — it will save time when boss arenas and future interactables are added.

> **CODEBASE NOTE:** This interaction flow is ALREADY IMPLEMENTED in `js/ui/shrine-ui.js` and `js/core/game-init.js`. The `openShrineUI(decoration)` function handles shrine opening, `selectShrineBoon()` handles selection, and `closeShrineUI()` handles cleanup. Input routing for the `'shrine'` state is already wired in `input-handler.js` (keyboard and mouse click handlers). **Review and extend the existing implementation rather than rewriting.**

> **PAUSE MECHANISM MISMATCH:** The codebase does NOT use `game.paused = true/false`. It uses a state machine: `game.state = 'shrine'` (or `'chest'`, `'inventory'`, etc.). When `game.state !== 'playing'`, the main loop in `main.js` routes to `updatePausedState(dt)` instead of `updateDungeon(dt)`, effectively freezing gameplay. All references to `game.paused` in this document should be replaced with `game.state = 'shrine'` (to pause) and `game.state = 'playing'` (to resume). Do NOT introduce a separate `game.paused` boolean — it would conflict with the existing state machine.

**Interaction flow (corrected to match existing patterns):**

```
Player approaches shrine (within 1.5 tiles)
    ↓
HUD shows prompt: "E — Ancestor Shrine" (rendered in Ancestor color)
    ↓
Player presses E
    ↓
Check: is shrine.used === true?
    → Yes: show message "This shrine's power has been claimed." (1.5s fade, no state change)
    → No: continue
    ↓
Check: BoonSystem.activePlayerBoons.length >= 8?
    → Yes: enter REPLACE flow (see below)
    → No: enter SELECTION flow
    ↓
SELECTION FLOW:
    1. game.state = 'shrine' (freezes gameplay via main loop state routing)
    2. BoonSystem.generateOffering(shrine.ancestor, game.currentFloor)
    3. Open boon selection UI overlay (A.1.3) — already implemented in shrine-ui.js
    4. Player selects boon OR presses Esc
    5. If selected: BoonSystem.applyBoon(selectedBoon), shrine.used = true
    6. If cancelled: shrine.used remains false
    7. game.state = 'playing'
    ↓
REPLACE FLOW:
    1. game.state = 'shrine'
    2. BoonSystem.generateOffering(shrine.ancestor, game.currentFloor)
    3. Open boon selection UI with an additional panel showing current 8 boons
    4. Player selects a NEW boon, then selects which EXISTING boon to replace
    5. BoonSystem.removeBoon(replacedBoon), BoonSystem.applyBoon(newBoon), shrine.used = true
    6. Synergy recalculated (removing old boon may break a synergy, adding new may create one)
    7. game.state = 'playing'
```

**`BoonSystem.generateOffering(ancestorId, currentFloor)`:**

```javascript
generateOffering(ancestorId, currentFloor) {
    const allBoons = Object.values(BOONS);
    const activeBoonIds = this.activePlayerBoons.map(b => b.id);

    // Primary pool: boons from this Ancestor that the player doesn't already have
    // Uses merged gating: both requirement AND floor gates must pass
    let pool = allBoons.filter(b =>
        b.ancestor === ancestorId &&
        !activeBoonIds.includes(b.id) &&
        this.isTierAvailable(b, currentFloor, this.activePlayerBoons)
    );

    // If pool < 3, pad from other Ancestors (same merged gating)
    if (pool.length < 3) {
        const otherBoons = allBoons.filter(b =>
            b.ancestor !== ancestorId &&
            !activeBoonIds.includes(b.id) &&
            this.isTierAvailable(b, currentFloor, this.activePlayerBoons)
        );
        shuffleArray(otherBoons);
        while (pool.length < 3 && otherBoons.length > 0) {
            pool.push(otherBoons.shift());
        }
    }

    // If pool is STILL < 3 (player has almost every boon — extremely unlikely with 70 boons)
    // Offer whatever is available, even if fewer than 3
    shuffleArray(pool);
    return pool.slice(0, 3);
}

isTierAvailable(boon, floor, activePlayerBoons) {
    // MERGED GATING: Both requirement AND floor gates must be satisfied.
    // This prevents lucky early runs from offering Legendary boons on Floor 2.

    const tier = boon.tier || 1;
    const ancestor = boon.ancestor;

    // --- Tier 1 / Core: Always available ---
    if (tier === 1) return true;

    // --- Tier 2 / Resonance: Requires 2-ancestor diversity AND Floor 3+ ---
    if (tier === 2) {
        if (floor < 3) return false;
        // Must have at least 1 boon from each of 2 different ancestors
        const uniqueAncestors = new Set(activePlayerBoons.map(b => b.ancestor));
        return uniqueAncestors.size >= 2;
    }

    // --- Tier 3 / Legendary: Requires 3 same-ancestor boons AND Floor 6+ ---
    if (tier === 3) {
        if (floor < 6) return false;
        // Must have 3+ boons from the same ancestor as this boon
        const sameAncestorCount = activePlayerBoons.filter(b => b.ancestor === ancestor).length;
        return sameAncestorCount >= 3;
    }

    return false;
}
```

**Tier unlock by floor:**
- Tier 1: Always available. These are the foundation — small stat bumps.
- Tier 2: Available from Floor 3. By now the player understands the basics and can evaluate moderate power spikes.
- Tier 3: Available from Floor 6. Major build-defining boons. By Floor 6 the player has committed to a direction.

This gating means early shrines always offer Tier 1. The player's first 4-6 boons will be Tier 1, establishing a foundation. Mid-run shrines offer a mix of Tier 1 and Tier 2. Late shrines include Tier 3 options that can dramatically shift power level.

**Systems impacted:**
- `input-handler.js` — E key now has a new interaction target type (shrine). If E is already bound to interact, no change needed. If E is hardcoded to specific interactions, add shrine to the switch/if chain.
- `main.js` — `game.state = 'shrine'` already freezes gameplay (routes to `updatePausedState(dt)` instead of `updateDungeon(dt)`). This freezes: entity updates, enemy AI, hazard ticks, stamina regen. It does NOT freeze: rendering, UI input, shrine UI animation. **Already working.**
- `renderer.js` — Already renders the game world behind the shrine overlay when `game.state === 'shrine'` and calls `renderShrineUI(ctx)`. **Already working.**
- `game-state.js` — Already supports the `'shrine'` state. No changes needed.

**Downstream impact:**
- **Multiplayer (future):** In multiplayer, shrine interaction does NOT pause the game for other players. Only the interacting player sees the boon UI. The player is vulnerable while choosing (enemies can still attack them). This creates a risk: do you pick boons in a safe room or rush through in a dangerous one? For now, build the pause-based version. The multiplayer refactor will change `game.paused = true` to `player.inUI = true` which only freezes that player's input processing while the world continues.
- **Boss phase (future):** Boon selection between boss phases (if that becomes a mechanic) would use the same offering/selection flow.

**Edge cases:**
- Player takes damage while in boon selection UI: Impossible because `game.state === 'shrine'` routes the main loop away from `updateDungeon()`. But verify this — if any system bypasses the state check and still deals damage, the death handler could fire during boon selection. Add a guard: `if (game.state !== 'playing') return;` at the top of damage application in `combat-master.js`.
- Shrine is in a room with enemies: Enemies freeze when the UI opens. This is fine — the player chose to interact while enemies were nearby. When the UI closes, enemies resume.
- Player opens shrine, reads boons, cancels, fights more enemies, comes back to same shrine: Shrine should offer the SAME 3 boons it offered before (cache the offering on the shrine object) OR re-roll (regenerate). **Recommendation:** Re-roll. This gives the player a reason to return later if the first offerings were bad for their build.

---

#### A.1.3 Boon Selection UI

> **CODEBASE NOTE:** `js/ui/shrine-ui.js` (398 lines) already exists and implements the shrine boon selection overlay. It includes `openShrineUI()`, `closeShrineUI()`, `selectShrineBoon()`, `renderShrineUI(ctx)`, and `handleShrineInput(e)` / `handleShrineClick(e)`. The renderer already calls `renderShrineUI(ctx)` when `game.state === 'shrine'`. **Do NOT create a new `boon-selection-ui.js` — extend `shrine-ui.js` with the stat preview and replace flow features described below.**

**File:** `js/ui/shrine-ui.js` (existing — extend, do not replace)

**Task:** Enhance the existing shrine overlay with stat previews and replacement flow.

**Layout specification (for canvas rendering at 1920×1080 reference resolution):**

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│                    ✦ Shrine of the Ember Ancestor ✦                          │
│                    (ancestor name, centered, colored)                        │
│                                                                              │
│    ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐         │
│    │   FLAME TOUCHED  │   │  INFERNO WILL   │   │  CINDERSKIN     │         │
│    │                  │   │                  │   │                  │         │
│    │    Tier I        │   │    Tier II       │   │    Tier I        │         │
│    │                  │   │                  │   │                  │         │
│    │ +10% fire dmg    │   │ +20% fire dmg    │   │ +8 defense       │         │
│    │                  │   │ Burn: 3/s, 4s    │   │ +5% fire resist  │         │
│    │                  │   │                  │   │                  │         │
│    │ ── Stats ──      │   │ ── Stats ──      │   │ ── Stats ──      │         │
│    │ Fire: 10% → 20%  │   │ Fire: 10% → 30%  │   │ Def: 12 → 20    │         │
│    │                  │   │                  │   │ F.Res: 0% → 5%  │         │
│    │                  │   │                  │   │                  │         │
│    │   [ 1 ] Select   │   │   [ 2 ] Select   │   │   [ 3 ] Select   │         │
│    └─────────────────┘   └─────────────────┘   └─────────────────┘         │
│                                                                              │
│                         [Esc] Leave Shrine                                   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

**Dimensions (scaled to canvas):**
- Overlay: full canvas, `rgba(0, 0, 0, 0.75)`
- Ancestor title: 24px font, `ANCESTORS[shrine.ancestor].color`, centered horizontally, y = 15% from top
- Card area starts at y = 25% from top
- Each card: width = 22% of canvas, height = 50% of canvas
- Card spacing: 4% of canvas between cards
- 3 cards centered horizontally: left edge of first card = `(canvasWidth - (3 * cardWidth + 2 * cardSpacing)) / 2`
- Card background: `rgba(25, 25, 35, 0.95)`, 1px border
- Card border color: Tier 1 = `#888888`, Tier 2 = `#4488cc`, Tier 3 = `#aa44dd`
- Hover state: border brightens to 100% opacity, card background lightens to `rgba(35, 35, 50, 0.95)`, subtle outer glow in tier color

**Card content (top to bottom within card):**
1. **Boon name** — 16px bold, white, centered, y-offset 16px from card top
2. **Tier badge** — Small rectangle, tier color background, white text "Tier I/II/III", centered below name
3. **Ancestor icon** — 16×16 colored square or icon, next to tier badge (visual context)
4. **Description** — 11px, `#cccccc`, left-aligned with 12px padding, word-wrapped to card width - 24px. Max 3 lines.
5. **Divider line** — 1px `#444444`, horizontal, 60% card width, centered
6. **Stat preview** — 11px, left-aligned. For each stat affected:
   - `"StatName: currentValue → newValue"` where newValue is green if higher, red if lower
   - Compute previews by cloning player stat stacks, adding the boon's modifiers, calling `compute()`, comparing to current computed values
7. **Select prompt** — Bottom of card, centered, "[ 1 ] Select" in `#888888`, brightens on hover

**Stat preview implementation:**

```javascript
function computeStatPreview(boon, player) {
    const previews = [];
    for (const effect of boon.effects) {
        if (effect.type === 'special' || effect.type === 'conditional') {
            // Special effects don't have simple stat previews
            // Show the description text instead
            continue;
        }
        const statStack = player.statStacks[effect.stat];
        if (!statStack) continue; // stat not tracked — flag as error in test harness
        
        const currentValue = statStack.compute();
        // Clone the stack, add the modifier, compute new value
        const projected = statStack.clone();
        projected.addModifier(boon.id, effect.value, effect.type);
        const newValue = projected.compute();
        
        previews.push({
            statName: STAT_DISPLAY_NAMES[effect.stat] || effect.stat,
            current: currentValue,
            projected: newValue,
            isIncrease: newValue > currentValue
        });
    }
    return previews;
}
```

**Input handling during boon selection:**
- Mouse: track cursor position relative to canvas. On `mousemove`, check which card (if any) the cursor overlaps → set `hoveredCard` index (0, 1, 2, or -1 for none). On `click`, if `hoveredCard >= 0`, select that boon.
- Keyboard: `1`, `2`, `3` keys select corresponding card directly. `Esc` cancels.
- **Block all other input** during boon selection. Movement keys, attack, spells — nothing should process. The input handler already checks `game.state === 'shrine'` and routes to `handleShrineInput(e)` / `handleShrineClick(e)` instead of the game's normal input processing. This is already working.

**Animation:**
- **Open:** 3 cards start at y-offset +100px below final position, opacity 0. Over 300ms, lerp to final position and opacity 1. Stagger by 50ms (card 1 starts immediately, card 2 at 50ms, card 3 at 100ms).
- **Select:** Selected card scales to 105% and brightens over 150ms. Other cards fade to opacity 0.3 over 150ms. After 200ms total, close overlay.
- **Close:** Overlay fades from 0.75 to 0 over 200ms. During this fade, the game unpauses — the player sees the world resuming through the fading overlay.
- **Total animation time:** ~500ms from selection to full game resume. Fast enough to not feel sluggish, slow enough to feel deliberate.

**Systems impacted:**
- `input-handler.js` — Already routes input to shrine UI when `game.state === 'shrine'` (keyboard via `handleShrineInput(e)`, mouse via `handleShrineClick(e)`). No changes needed.
- `renderer.js` — The boon UI renders on top of everything. It must be called AFTER all other rendering in the draw pipeline. Rendering order: game world → HUD → boon overlay (if active).
- `player.js` — `statStacks` must be exposed (or cloneable) for stat preview computation

**Downstream impact:**
- **Content phase (future):** When new boons are added, they automatically appear in shrine offerings if they're in the `BOONS` object. No UI changes needed — the card layout handles any boon with effects and a description.
- **Multiplayer (future):** The boon UI is client-side only. In multiplayer, the client sends `{ action: 'select_boon', boonId: '...' }` to the server, which validates the selection and applies it server-side. The UI itself doesn't change.

**Verification:**
1. Open shrine → 3 cards animate in → all text readable, no overflow
2. Hover each card → border brightens, background lightens
3. Check stat preview on each card → numbers match manual calculation
4. Press 1 → first boon selected → UI closes → stat change applied
5. Press Esc → UI closes → shrine remains usable → interact again → 3 new boons offered (re-roll)
6. At 8 boons, interact → replacement flow shows current boons alongside new offerings

---

#### A.1.4 Boon Effect Application and Verification

**File:** `js/systems/boon-system.js`

**Task:** Ensure every boon modifies player stats correctly and reversibly.

**`applyBoon(boon)` implementation:**

```javascript
applyBoon(boon) {
    // Guard: don't apply duplicates
    if (this.activePlayerBoons.find(b => b.id === boon.id)) {
        console.warn(`[BoonSystem] Boon ${boon.id} already active. Skipping.`);
        return false;
    }

    // Apply each effect
    for (const effect of boon.effects) {
        if (effect.type === 'additive' || effect.type === 'multiplicative') {
            const stack = this.player.statStacks[effect.stat];
            if (!stack) {
                console.error(`[BoonSystem] Unknown stat: ${effect.stat} in boon ${boon.id}`);
                continue;
            }
            stack.addModifier(boon.id, effect.value, effect.type);
        } else if (effect.type === 'special') {
            this.applySpecialEffect(boon.id, effect);
        } else if (effect.type === 'conditional') {
            this.registerConditionalEffect(boon.id, effect);
        }
    }

    // Track the boon
    this.activePlayerBoons.push({ ...boon, appliedAt: game.runStats.timePlayed });

    // Update run stats
    game.runStats.boonsCollected.push({
        boonId: boon.id, boonName: boon.name,
        ancestor: boon.ancestor, tier: boon.tier
    });

    // Check for Ancestor synergy
    this.checkSynergy(boon.ancestor);

    // Emit event for HUD update
    EventBus.emit('player:boon_selected', {
        boon, totalBoons: this.activePlayerBoons.length, ancestor: boon.ancestor
    });

    // Recompute all player derived stats
    this.player.recomputeStats();

    return true;
}
```

**`removeBoon(boonId)` implementation:**

```javascript
removeBoon(boonId) {
    const boon = this.activePlayerBoons.find(b => b.id === boonId);
    if (!boon) {
        console.warn(`[BoonSystem] Boon ${boonId} not found in active boons.`);
        return false;
    }

    // Reverse each effect
    for (const effect of boon.effects) {
        if (effect.type === 'additive' || effect.type === 'multiplicative') {
            const stack = this.player.statStacks[effect.stat];
            if (stack) stack.removeModifier(boon.id);
        } else if (effect.type === 'special') {
            this.removeSpecialEffect(boon.id);
        } else if (effect.type === 'conditional') {
            this.unregisterConditionalEffect(boon.id);
        }
    }

    // Remove from active list
    this.activePlayerBoons = this.activePlayerBoons.filter(b => b.id !== boonId);

    // Re-check synergy (may have broken one)
    this.checkSynergy(boon.ancestor);

    // Recompute all player derived stats
    this.player.recomputeStats();

    return true;
}
```

**Special effect handlers:**

Special effects register hooks into other systems. They need explicit cleanup.

```javascript
applySpecialEffect(boonId, effect) {
    switch (effect.stat) {
        case 'burnOnHit':
            // Register a hook in CombatMaster that fires on every player hit
            const handler = (hitData) => {
                if (hitData.attacker === this.player) {
                    hitData.target.applyStatusEffect('burn', {
                        damage: effect.value.damage,
                        duration: effect.value.duration,
                        source: boonId
                    });
                }
            };
            EventBus.on('combat:hit', handler);
            this.specialEffectHandlers.set(boonId, { event: 'combat:hit', handler });
            break;

        case 'thornsDamage':
            const thornsHandler = (hitData) => {
                if (hitData.target === this.player && hitData.isMelee) {
                    CombatMaster.dealDamage(this.player, hitData.attacker, effect.value, 'physical');
                }
            };
            EventBus.on('combat:hit', thornsHandler);
            this.specialEffectHandlers.set(boonId, { event: 'combat:hit', handler: thornsHandler });
            break;

        // Add cases for each special effect type
    }
}

removeSpecialEffect(boonId) {
    const registration = this.specialEffectHandlers.get(boonId);
    if (registration) {
        EventBus.off(registration.event, registration.handler);
        this.specialEffectHandlers.delete(boonId);
    }
}
```

**Test harness:**

```javascript
// Call from console: BoonSystem.testAllBoons()
testAllBoons() {
    const results = { passed: 0, failed: 0, errors: [] };
    const player = this.player;

    for (const boon of Object.values(BOONS)) {
        // Snapshot current stats
        const before = {};
        for (const key of Object.keys(player.statStacks)) {
            before[key] = player.statStacks[key].compute();
        }

        // Apply boon
        this.applyBoon(boon);

        // Check each expected effect
        let boonPassed = true;
        for (const effect of boon.effects) {
            if (effect.type === 'special' || effect.type === 'conditional') continue;
            
            const stack = player.statStacks[effect.stat];
            if (!stack) {
                results.errors.push(`${boon.id}: Unknown stat '${effect.stat}'`);
                boonPassed = false;
                continue;
            }
            
            const after = stack.compute();
            if (effect.type === 'additive' && Math.abs(after - (before[effect.stat] + effect.value)) > 0.01) {
                results.errors.push(`${boon.id}: ${effect.stat} expected ${before[effect.stat] + effect.value}, got ${after}`);
                boonPassed = false;
            }
        }

        // Remove boon
        this.removeBoon(boon.id);

        // Verify stats returned to baseline
        for (const key of Object.keys(player.statStacks)) {
            const restored = player.statStacks[key].compute();
            if (Math.abs(restored - before[key]) > 0.01) {
                results.errors.push(`${boon.id}: ${key} not restored. Was ${before[key]}, now ${restored}`);
                boonPassed = false;
            }
        }

        boonPassed ? results.passed++ : results.failed++;
    }

    console.log(`[BoonTest] ${results.passed}/${results.passed + results.failed} passed.`);
    if (results.errors.length) {
        console.error('[BoonTest] Errors:');
        results.errors.forEach(e => console.error(`  - ${e}`));
    }
    return results;
}
```

**Run the test harness on every build.** Any boon data change (adding/modifying boons, renaming stats) should be followed by `testAllBoons()` to catch regressions.

**Systems impacted:**
> **CODEBASE STATE:** Player currently uses flat stats (`player.hp`, `player.maxHp`, `player.str`, etc.) with a `recalculateDerivedStats()` function in `js/utils/stat-system.js` that recomputes derived values from base + equipment. The boon system already has a `getTotalBonus()` method (line ~1452 of boon-system.js) that aggregates boon effects. **The `StatModifierStack` class described in this document does not yet exist in the codebase.** This is a significant refactor.

- `player.js` — Must implement `statStacks` as described in the Data Architecture section. The player currently stores stats as flat numbers (`player.damage = 20`) and derives them via `recalculateDerivedStats()`. Every stat that boons can modify needs a `StatModifierStack`. The player's `recomputeStats()` method (currently named `recalculateDerivedStats()` — standardize the naming) iterates all stacks, calls `compute()`, and writes the result to the player's effective stat properties. **Migration plan:** Wrap each modifiable stat in a `StatModifierStack` initialized with the current base value. The existing `recalculateDerivedStats()` should call `compute()` on each stack instead of reading flat values.
- `combat-master.js` — Must emit `'combat:hit'` events for special effect hooks. If it currently applies damage directly without events, the hit event must be added.
- `spell-system.js` — Boons that modify spell stats (cooldown reduction, heal amount, shield strength, dash distance) must be read from the player's stat stacks, not from hardcoded spell data. E.g., `const healAmount = player.statStacks.healAmount.compute()` instead of `const healAmount = SPELLS.heal.baseHealPercent`.

**Downstream impact:**
- **Content phase (future):** New boons are added as entries in the `BOONS` object. The system handles them automatically. The test harness validates them automatically.
- **Boss phase (future):** Boss-specific boons (e.g., "Godslayer: +50% damage to bosses") use the same `special` effect type with a handler that checks `target.isBoss`.
- **Multiplayer (future):** Boon state must be serializable: `JSON.stringify(BoonSystem.activePlayerBoons)` → transmit to server → other clients can display boon icons on that player's nameplate. The `StatModifierStack` recomputes on the server using the same logic. No gameplay logic in the UI.

---

#### A.1.5 Boon HUD Display

**File:** `js/ui/unit-frames.js` or `js/ui/renderer.js`

**Rendering spec:**
- Position: immediately below the stamina bar (or in a dedicated boon row)
- Icon size: 20×20px per boon
- Spacing: 2px between icons
- Max 8 icons in a row. Total width: 8 × 20 + 7 × 2 = 174px
- Each icon: filled square with rounded corners (2px radius), background = `ANCESTORS[boon.ancestor].color` at 80% opacity
- Tier border: Tier 1 = 1px white at 50% opacity. Tier 2 = 1px `#4488cc`. Tier 3 = 1px `#aa44dd` with subtle glow (draw twice — once at 3px blur, once sharp).
- **Synergy indicator:** If a synergy is active, draw a thin gold line connecting all icons from that Ancestor (horizontal bar below those icons) and a small "✦" glyph next to the group.

**Hover tooltip:** When the cursor hovers over a boon icon (check `mouseX >= iconX && mouseX <= iconX + 20 && mouseY >= iconY && mouseY <= iconY + 20`), show a tooltip with:
- Boon name (white, bold)
- Ancestor name (Ancestor color)
- Tier
- Description
- Current stat effects with computed values

**Render order:** Boon icons render as part of the HUD layer, AFTER the game world and BEFORE any overlay (boon selection, death screen).

**Systems impacted:**
- `unit-frames.js` — New rendering code added. Must know the position and size of the health/stamina bars to place boon icons relative to them.
- `renderer.js` — If HUD rendering is in the main renderer, the boon icon draw calls go in the HUD section.

---

#### A.1.6 Boon Wipe on Death

**File:** `js/systems/boon-system.js`, `js/core/game-init.js`

**Implementation:**

```javascript
// In BoonSystem:
clearAllBoons() {
    // Remove in reverse order (last applied first) to ensure clean stat restoration
    const boonIds = [...this.activePlayerBoons.map(b => b.id)].reverse();
    for (const id of boonIds) {
        this.removeBoon(id);
    }
    
    // Clear all synergy bonuses
    for (const ancestor of Object.keys(ANCESTORS)) {
        if (this.activeSynergies.has(ancestor)) {
            this.removeSynergyBonus(ancestor);
        }
    }
    this.activeSynergies.clear();
    
    // Final safety check
    if (this.activePlayerBoons.length !== 0) {
        console.error('[BoonSystem] clearAllBoons failed — lingering boons:', this.activePlayerBoons);
        this.activePlayerBoons = [];
    }
    
    // Clear special effect handlers
    for (const [boonId, registration] of this.specialEffectHandlers) {
        EventBus.off(registration.event, registration.handler);
    }
    this.specialEffectHandlers.clear();
    
    // Clear conditional effect trackers
    this.conditionalEffects = [];
}
```

**Integration point:** `clearAllBoons()` must be called:
1. In the death handler, BEFORE the death screen renders (so the run summary captures the boons before they're cleared)
2. In `startNewGame()`, as a safety reset
3. In `advanceToNextFloor()` — **NO, do NOT clear on floor change.** Boons persist through the entire run. Only death clears them.

**Capture boons for death summary BEFORE clearing:**
```javascript
// In death handler:
const boonSummary = BoonSystem.activePlayerBoons.map(b => ({
    name: b.name, ancestor: b.ancestor, tier: b.tier
}));
const synergySummary = [...BoonSystem.activeSynergies];
game.runStats.finalBoons = boonSummary;
game.runStats.finalSynergies = synergySummary;

BoonSystem.clearAllBoons();
```

**Edge case:** Player dies while boon selection UI is open. The death handler must:
1. Close the boon selection UI (set `boonSelectionActive = false`)
2. Unpause the game (`game.paused = false`)
3. Then proceed with normal death flow

In practice this shouldn't happen because the game is paused during boon selection and no damage can occur. But if a future change introduces something that deals damage through pause (unlikely but defensive), this ordering prevents a crash.

**Verification:**
1. Collect 5 boons → verify stats are elevated → die → start new run
2. Character sheet shows base stats (no boon bonuses)
3. HUD shows 0 boon icons
4. Console: `BoonSystem.activePlayerBoons.length === 0` → true
5. Console: verify player stat stacks have 0 modifiers

---

#### A.1.7 Boon Summary on Death/Victory Screens

**File:** `js/ui/renderer.js` (death/victory screen sections)

**Content to display:**
- Header: "Boons (N/8)" where N is boons collected
- List each boon: colored dot (Ancestor color) + name + "Tier X"
- Group visually by Ancestor if multiple boons from the same one
- Highlight synergies: if 3+ boons from one Ancestor, show Ancestor synergy name in gold text
- Total stat impact summary: "Fire Dmg: +45%, Defense: +15, Crit: +12%"
  - Compute by summing all boon effects by stat, formatted as a single line

**Layout on death screen:** The death screen likely has: floor reached, enemies killed, time survived. Add a boon section below this. If screen space is tight, make the boon section scrollable or collapsible.

**Verification:** Die with 6 boons including 3 from Ember → death screen shows all 6 boons grouped by Ancestor → Ember group shows "Emberborn" synergy → total stat summary matches expected values.

---

#### A.1.8 Ancestor Synergy System

**File:** `js/systems/boon-system.js`

**Implementation:**

```javascript
checkSynergy(ancestorId) {
    const ancestor = ANCESTORS[ancestorId];
    const count = this.activePlayerBoons.filter(b => b.ancestor === ancestorId).length;
    const wasActive = this.activeSynergies.has(ancestorId);
    const shouldBeActive = count >= ancestor.synergyThreshold;

    if (shouldBeActive && !wasActive) {
        // Activate synergy
        this.applySynergyBonus(ancestorId, ancestor.synergyBonus);
        this.activeSynergies.add(ancestorId);
        
        // Notification
        EventBus.emit('synergy:activated', {
            ancestor: ancestorId,
            name: ancestor.synergyBonus.name,
            description: ancestor.synergyBonus.description
        });
        
        game.runStats.ancestorSynergies.push(ancestor.name);
    } else if (!shouldBeActive && wasActive) {
        // Deactivate synergy
        this.removeSynergyBonus(ancestorId);
        this.activeSynergies.delete(ancestorId);
        
        EventBus.emit('synergy:deactivated', { ancestor: ancestorId });
    }
}

applySynergyBonus(ancestorId, synergyData) {
    for (const effect of synergyData.effects) {
        const stack = this.player.statStacks[effect.stat];
        if (stack) {
            stack.addModifier(`synergy_${ancestorId}`, effect.value, effect.type);
        }
    }
    this.player.recomputeStats();
}

removeSynergyBonus(ancestorId) {
    const synergyData = ANCESTORS[ancestorId].synergyBonus;
    for (const effect of synergyData.effects) {
        const stack = this.player.statStacks[effect.stat];
        if (stack) {
            stack.removeModifier(`synergy_${ancestorId}`);
        }
    }
    this.player.recomputeStats();
}
```

**Synergy activation notification:** When a synergy activates, display a full-width banner across the top of the screen: `"EMBERBORN — All fire damage +25%"` in gold text with Ancestor color accent. Banner slides in from top, holds for 2 seconds, slides out. Accompanied by a distinct audio cue (if audio is available).

**Multiple synergies:** A player with 8 boons could theoretically have 2 synergies active (e.g., 3 Ember + 3 Stone + 2 other). Both should be tracked and displayed. The synergies stack independently.

**Verification:**
1. Collect 2 Ember boons → no synergy
2. Collect 3rd Ember boon → "Emberborn" notification → fire damage stat increases by synergy amount
3. Open character sheet → synergy bonus shown separately from individual boon bonuses
4. Replace one Ember boon at a shrine (at 8/8 boons) → Ember count drops to 2 → synergy deactivates → fire damage decreases

---

### A.2 — STAMINA SYSTEM POLISH

### Vision

Stamina is the heartbeat of combat. Without it, the player mashes attack and every fight is a DPS race with no skill expression. With stamina, the player develops a rhythm: attack-attack-attack, pause to regen, dash to reposition, attack-attack, kill for refund, keep going. The kill refund mechanic specifically rewards aggressive play — killing enemies gives stamina back, so a player who kills efficiently can chain through an entire room without stopping. But miss a swing, waste stamina on a dash you didn't need, or face too many enemies at once, and the pool empties. Exhaustion (zero stamina) means you can't attack, can't dash, and you move at 60% speed. You're vulnerable. Stamina exhaustion is the primary way this game kills aggressive players — they overcommit, run dry, and can't escape.

For the Gauntlet/Minecraft Dungeons feel: stamina should NOT feel restrictive in most encounters. Against 3-4 enemies, a competent player should never run out. Against 8-10 enemies (a real swarm), stamina becomes a genuine resource. Against a floor guardian or boss (future phase), stamina management is the central skill test.

### Engineering Specification

> **CODEBASE STATE:** StaminaSystem is already fully implemented in `js/systems/stamina-system.js` with: `consume(amount, actionType)`, `consumeAction(actionType)`, `refund(amount, reason)`, `canAfford(actionType)`, `getExhaustionModifier()`, `onKill()`, and `onPerfectDodge()`. Configuration is in `js/config/combat-config.js` with `maxStamina: 100`, categorized costs (lightAttack, heavyAttack, dodge, dash, block), `regenRate: 15/sec`, `regenDelay: 0.8s`, `inCombatRegenMultiplier: 0.5`, `exhaustedThreshold: 20`, and `exhaustedSpeedPenalty: 0.7`. The exhaustion penalty is 0.7 (70% speed), NOT 0.6 as stated below. Regen rate is 15/sec (not 8/s as stated in the stats table). Kill refund is 25 stamina. The system also has a `surroundedRegenPenalty` for pack tactics.

> **KEY GAP:** StaminaSystem is updated manually in `main.js` (`StaminaSystem.update(dt/1000)`) rather than through SystemManager. It needs to be registered with SystemManager for proper ordering.

Full specification from previous version is retained (A.2.1 through A.2.6). See expanded document. Adding the following system integration detail:

**Systems impacted by Stamina:**
- `combat-master.js` — Every player attack must call `StaminaSystem.consume('attack')` (or `consumeAction('lightAttack')` / `consumeAction('heavyAttack')` for typed costs) BEFORE dealing damage. If `consume()` returns false (insufficient stamina), the attack does not execute. The attack animation should not play. This is the gating mechanism.
- `spell-system.js` — Dash already costs 15 stamina via SpellSystem. Heal and Shield currently cost 0 stamina. If the design intent is for all spells to cost stamina, add stamina costs to Heal and Shield in the spell definitions. Spells and attacks draw from the same stamina pool.
- `player.js` — Dash movement already delegates to DodgeSystem which consumes stamina. Exhaustion movement penalty is applied via `StaminaSystem.getExhaustionModifier()` which returns `0.7` (not 0.6 as stated elsewhere in this doc): `const moveSpeed = this.baseSpeed * StaminaSystem.getExhaustionModifier()`.
- `boon-system.js` — Boons modify `maxStamina`, `staminaRegenRate`, and `staminaKillRefund` through stat stacks. When boons are applied or removed, stamina config must recompute. `StaminaSystem` should read these values from the player's stat stacks, not from a static config.
- `kill-streak-system.js` — Kill refunds happen on the same event (`enemy:death`) that kill streaks track. Order matters: refund stamina FIRST, then increment kill streak. This way the player has the stamina to continue their streak.
- `time-effects.js` — During time slow, stamina regen should also slow (uses scaled `dt`). This means time slow doesn't give the player free regen time. However, stamina consumption (attack/dash costs) remains the same — a single attack costs 15 stamina regardless of time scale.
- `action-bar-ui.js` — Each action icon must read the current stamina level and the action's cost. If cost > current stamina, dim the icon and show a red tint. This gives the player advance warning before they try to act and fail.

**Downstream impact:**
- **Boss phase (future):** Boss fights are long. Stamina management over a 2-3 minute boss fight is a sustained skill test. The regen rate and kill refund need to be tuned so that a boss fight never leaves the player unable to act for more than ~2 seconds (regen delay + regen to minimum attack cost). If boss fights add minions (adds), killing adds gives stamina refunds — a deliberate design lever.
- **Multiplayer (future):** Stamina is client-side for input prediction but server-authoritative for validation. The server tracks each player's stamina and rejects actions the player can't afford. This prevents stamina-hack exploits.
- **Content phase (future):** Some weapon types should modify stamina costs. Axes (heavy, slow) could cost 20 stamina per swing. Daggers (fast, light) could cost 10. This differentiates weapon feel beyond damage numbers. The `consume()` method should accept a cost override: `StaminaSystem.consume('attack', weapon.staminaCost || STAMINA_CONFIG.attackCost)`.

**All remaining A.2 sub-task detail (A.2.1–A.2.6) is retained from the previous expanded document and applies here without changes.**

---

### A.3 — SPELL SYSTEM POLISH

### Vision

Spells are the player's burst toolkit. Where basic attacks are the bread-and-butter and stamina governs the flow, spells are decisive moments. Healing at 20% HP to stay alive for one more room. Shielding before charging into a pack of 6 enemies. Dashing out of a fire patch just in time. Casting Fireball into a choke point to soften a swarm. Frost Nova to buy 3 seconds of breathing room when overwhelmed.

Spells also interact with the boon system to create build identity. A player who picks Ember boons and finds a Fireball staff is playing a mage. A player who picks Iron boons with defense buffs and relies on Shield to face-tank swarms is playing a paladin. Same spells, different builds, different playstyle.

### Engineering Specification

> **CODEBASE STATE:** SpellSystem exists in `js/systems/spell-system.js` with 3 spells: Dash (1.0s CD, 15 stamina, delegates to DodgeSystem), Heal (180s CD, 0 stamina, +35% max HP), Shield (180s CD, 0 stamina, 50% max HP barrier for 10s). The system uses `tryActivate(player)` as the main execution method, `hasActiveShield()`, `absorbDamage(damage)`, and `getCooldownPercent()` for UI. Spells are triggered via **Spacebar only** — there is no hotkey routing for individual spell selection (1-4 keys).

> **KEY GAPS:**
> 1. **No Fireball, Frost Nova, or Blink** — these 3 new spells need to be added.
> 2. **Per-spell hotkeys: RESOLVED.** Space = Dash (always equipped). Keys 1-4 = four loadout spell slots (player picks 4 of 5: Heal, Shield, Fireball, Frost Nova, Blink). Key 5 = consumable. Q/E = weapon actions. The loadout spell picker expands from 3 options to a 4-of-5 picker. `input-handler.js` routes keys 1-4 to `SpellSystem.castSlot(slotIndex)`. See P4 item #2 for the full mapping.
> 3. **Heal and Shield cost 0 stamina** — If the design intent is for all spells to cost stamina, these need costs added.
> 4. **Heal/Shield cooldowns: RESOLVED.** Heal reduced from 180s to **35s** (~1 use per floor). Shield reduced from 180s to **40s** (staggered from Heal to prevent double-defensive stacking). At 180s, these were once-per-run emergency buttons with no interesting decision-making. At 35-40s, they become meaningful per-floor resource decisions. Boon-enhanced cooldown reduction (20-40%) brings these to 21-28s at max investment, rewarding spell-focused builds.
>
>    **Updated spell cooldown table:**
>    | Spell | Old CD | New CD | Rationale |
>    |-------|--------|--------|-----------|
>    | Dash | 1.0s | 1.0s | Unchanged — movement ability, high frequency |
>    | Heal | 180s | 35s | ~1 use per floor, meaningful rotation spell |
>    | Shield | 180s | 40s | Slightly offset from Heal, prevents double-defensive stacking |
>    | Fireball | — | 12s | Offensive burst, available multiple times per room |
>    | Frost Nova | — | 18s | CC/utility, longer than Fireball (AoE is stronger) |
>    | Blink | — | 8s | Escape/reposition, high frequency but not as fast as Dash |

**Current spell registry and new spells from previous version are retained (A.3.1–A.3.4).** Adding system integration detail:

**Systems impacted by Spells:**
- `stamina-system.js` — Dash already costs 15 stamina. For new spells, `SpellSystem.cast(spellId)` must call `StaminaSystem.consume('ability', spell.staminaCost)` and abort if it returns false. The cooldown should NOT start if the cast was blocked by insufficient stamina.
- `boon-system.js` — Boons modify spell behavior through stat stacks:
  - `cooldownReduction` — percentage reduction to all spell cooldowns. Applied when computing effective cooldown: `const effectiveCooldown = spell.baseCooldown * (1 - player.statStacks.cooldownReduction.compute() / 100)`. Clamp minimum cooldown to 0.5s to prevent infinite spell spam.
  - `healAmount` — modifies Heal spell effectiveness. The spell reads `player.statStacks.healAmount.compute()` instead of a hardcoded 35%.
  - `shieldStrength` — modifies Shield spell barrier amount.
  - `dashDistance` — modifies Dash travel distance.
  - `aoeRadiusBonus` — modifies Frost Nova radius and any future AoE spells.
- `combat-master.js` — Fireball projectile damage is resolved through CombatMaster, not directly. Fireball creates a projectile entity → projectile moves per frame → on collision with enemy, `CombatMaster.dealDamage(player, enemy, computedDamage, 'fire')` is called. This ensures damage goes through the standard pipeline where boon damage modifiers, critical hit checks, and status effect applications all apply correctly.
- `lingering-hazards.js` — Frost Nova creates an ice_slick hazard at the cast location. Fireball could create a fire_patch at the impact location if a boon enhances it. Spells that create hazards call `LingeringHazards.create(hazardConfig)`.
- `time-effects.js` — Spell cooldowns tick using scaled `dt`. During time slow, cooldowns recover slower. This is automatic if `SpellSystem.update(dt)` receives the time-scaled delta.
- `kill-streak-system.js` — Spell kills (enemy dies to Fireball) trigger the same `enemy:death` event and count toward kill streaks. No special handling needed.

**Downstream impact:**
- **Boss phase (future):** Boss fights will likely require spell usage (dodge boss AoE with Dash, survive burst with Shield). Spell cooldowns become a pacing mechanism during boss phases. If boon-enhanced cooldowns are too short, bosses become trivial. If too long, bosses become tedious. Boss tuning must account for the range of possible cooldown reduction values (0% to ~40% with stacked boons).
- **Multiplayer (future):** Spell casts are client-predicted, server-validated. The client plays the animation immediately on input. The server confirms or rejects. If rejected (insufficient stamina, cooldown not ready), the client rolls back the visual. Projectile spells (Fireball) have their position authoritative on the server — the client interpolates.
- **Content phase (future):** New weapon types may unlock new spells or modify existing ones. A fire staff could upgrade Fireball's base damage. An ice wand could unlock Frost Nova without needing to find it as a drop. The spell registry should support per-weapon spell overrides.

**All remaining A.3 sub-task detail (A.3.1–A.3.4) is retained from the previous expanded document.**

---

### A.4 — KILL STREAK SYSTEM POLISH

### Vision

Kill streaks are the applause track. They celebrate the player for doing the thing the game wants them to do: kill monsters efficiently without getting hit. In a swarm combat game, the moments where you cut through 8 enemies in 5 seconds should feel transcendent. The announcements, screen shake, and gold bonuses are the game saying "yes, that was awesome."

Kill streaks also serve a subtle tutorial function. The streak resets on taking damage. This teaches players that avoiding damage is as important as dealing it. A player who learns to kite, position, and use spells to avoid hits will naturally reach higher streaks and earn more gold — the system rewards the playstyle the game wants to cultivate.

### Engineering Specification

> **CODEBASE STATE:** KillStreakSystem is fully implemented in `js/systems/kill-streak-system.js` with: 5 tiers (Double Kill at 2, Killing Spree at 4, Rampage at 6, Unstoppable at 8, Godlike at 10), decay at 1 kill per 5 seconds of inactivity, reset on damage taken, and visual feedback via `KillStreakUI` (announcements, streak-lost vignette). Audio hooks exist. **However, there are NO mechanical rewards yet** — no damage multiplier, no gold bonus, no stat bonuses. The system is tracking/feedback only.

> **KEY GAP:** The document references "gold bonus on drops" at streak tiers (verification step 6) but the system doesn't implement this. Add tier-based multipliers: `getCurrentBonusMultiplier()` method that returns a gold/XP multiplier based on current tier.

**All A.4 sub-tasks (A.4.1–A.4.6) are retained from the previous expanded document.** Adding system integration detail:

**Systems impacted by Kill Streaks:**
- `combat-master.js` — Kill streak hooks into two methods: `onKill(enemy)` (increment counter) and `onDamageTaken(damage, source)` (reset counter). Currently these are direct function calls, not EventBus events. When EventBus is created, migrate to event-based triggering for cleaner decoupling. Enemy death data needs kill position (for announcement placement), damage taken needs to distinguish HP loss from shield absorption.
- `stamina-system.js` — Kill refund and kill streak increment happen on the same event. Order: refund first, then streak increment. Both listen to `enemy:death`.
- `time-effects.js` — Kill streak tier-up could optionally trigger a very brief time slow (50ms at 0.5x) for extra impact. This is a juice layer on top of the screen shake. If implemented, it fires through the standard `TimeEffects.setTimeScale()` and uses the same conflict resolution.
- `loot-system.js` — If the gold bonus per tier (A.4.6) is implemented, the loot system must query `KillStreakSystem.getCurrentBonusMultiplier()` when spawning gold drops. The multiplier applies ONLY to gold, not to item drop rates or rarity.
- `renderer.js` — Kill streak announcements render on the HUD layer. They must render ABOVE the game world, particle effects, and health bars, but BELOW the boon selection UI and death/victory screen overlays.

**Downstream impact:**
- **Multiplayer (future):** Each player has independent kill streaks. Other players should see your streak announcement (broadcasts to nearby players in the same instance). High streaks on other players serve as a threat indicator in PvP — a player at "Unstoppable" is having a good run and is probably well-geared. Kill streak state is part of the player's networked data.
- **Content phase (future):** Some boons could enhance kill streaks: "Kill streak decay timer extended by 2 seconds" or "Kill streak not reset by fire damage." These would be `special` type boon effects that modify KillStreakSystem config values through the same stat stack pattern.

---

### A.5 — TIME EFFECTS SYSTEM

### Vision

Time effects are invisible when they work and conspicuous when they're absent. The player won't think "wow, great time slow implementation." They'll think "that crit hit SO hard" because the 150ms slowdown made the impact register. They'll think "that death was dramatic" because the 800ms death slow gave them a moment to process what happened. Time manipulation is pure feel — it costs almost nothing to implement but adds enormous perceived quality.

### Engineering Specification

> **CODEBASE STATE:** TimeEffects is fully implemented in `js/systems/time-effects.js` with: `triggerSlow(durationMs, factor, options)`, `triggerStop(durationMs)`, `triggerImpactSlow(durationMs)` (0.7x for hits), `triggerDramaticSlow(durationMs)` (0.3x for kills/crits), visual rendering via `renderTimeSlowEffects(ctx)` (vignette + desaturate). **However, it is NOT integrated into the main game loop.** It is called manually from `updateDungeon(dt)` as `TimeEffects.update(dt/1000)` but the scaled delta is NOT used by other systems. The `timeScale` value is computed but never applied to `dt` before passing it to other systems.

> **CRITICAL GAP:** TimeEffects exists but its output (`timeScale`) is unused. The main loop must be modified to: (1) call `TimeEffects.update(rawDt)` first, (2) compute `scaledDt = rawDt * TimeEffects.timeScale`, (3) pass `scaledDt` to all gameplay systems. Without this, time slow effects are purely visual with no gameplay impact.

**All A.5 sub-tasks (A.5.1–A.5.4) are retained.** Adding system integration:

**Systems impacted by Time Effects:**
- `main.js` — The game loop must use `TimeEffects.getScaledDelta(rawDt)` (or `rawDt * TimeEffects.timeScale`) instead of raw `dt` for all gameplay systems. Currently `TimeEffects.update()` is called but its `timeScale` output is discarded. This is the single highest-priority integration task for TimeEffects. Rendering continues at normal speed (UI animations, particle effects can optionally use raw `dt` for smoothness). The critical split: gameplay systems (entity movement, AI, cooldowns, hazard ticks) use scaled `dt`. Visual systems (HUD animations, damage number float, announcement fade) use raw `dt` so they remain smooth during slow-mo.
- `combat-master.js` — Must call `TimeEffects.triggerDramaticSlow()` on critical hits and `TimeEffects.triggerImpactSlow()` on normal kills. Currently CombatMaster does NOT emit EventBus events (it uses direct function calls). When EventBus is created, add `player:critical_hit` emission. Until then, call TimeEffects directly from the damage resolution path.
- `renderer.js` — Renders the vignette/desaturation overlay when time slow is active. This is purely visual — no gameplay impact.

**Downstream impact:**
- **Boss phase (future):** Boss phase transitions can use longer, more dramatic time slows (0.1x for 500ms with camera focus shift). Boss death should use the most dramatic time slow in the game (0.05x for 1000ms with screen-wide flash).
- **Multiplayer (future):** Time effects are CLIENT-SIDE ONLY. The server runs at a constant tick rate. When a player lands a crit, their client renders the slow-mo while the server continues at normal speed. Client-side prediction handles the sync. Other players do not see your time slow (they see your crit animation at normal speed). This is critical — one player's time slow cannot affect another player's game state.

---

### A.6 — LINGERING HAZARDS POLISH

### Vision

Hazards make the floor as dangerous as the enemies. A room isn't just "5 goblins" — it's "5 goblins with a poison cloud on the left and a fire patch near the door." The player can't just stand in one spot and swing. They have to move, they have to watch the ground, they have to plan their path through the room. This is where the Gauntlet Dark Legacy DNA shows most clearly — in Gauntlet, the environment is always a factor. Lava, spike traps, gas vents. The dungeon itself is an enemy.

The telegraph system is critical to fairness. Hazards that appear instantly with no warning feel like cheap shots. The 0.8-second pulsing circle is the game saying "danger is coming HERE, you have time to move." Players who read telegraphs and reposition will take dramatically less damage than players who don't. This is a learnable skill that gets better over runs — exactly the kind of knowledge-based progression that replaces persistent stat growth in a full-wipe game.

### Engineering Specification

> **CODEBASE STATE:** LingeringHazards is implemented in `js/systems/lingering-hazards.js` with: `createPoisonCloud()` (cone-shaped), `createCircularZone()` (generic circular), `update(deltaTime, player)`, `isPointInZone()`, `applyZoneDamage()`. It has a particle system (1-2 particles per 80ms), radial gradient rendering, and integrates with StatusEffectSystem to apply `poisoned` status. **Currently only supports poison clouds (green).** Fire patches, ice slicks, and void zones referenced in the document do not exist yet.

> **KEY GAPS:**
> 1. **Only poison type exists** — Need to add fire_patch, ice_slick, void_zone hazard types with distinct colors, damage types, and status effects.
> 2. **No telegraph system** — The document describes a 0.8-second pulsing telegraph before hazard activation. The current system creates hazards instantly with no warning. The telegraph system is critical for fairness.
> 3. **Hazard damage bypasses CombatMaster** — Currently uses `target.hp -= damage` directly. Must route through CombatMaster for resistance/boon calculations.
> 4. **Already registered with SystemManager** at priority 35 (HazardSystem). Verify this is the same system or if there's a naming mismatch.

**All A.6 sub-tasks (A.6.1–A.6.5) are retained.** Adding system integration:

**Systems impacted by Lingering Hazards:**
- `combat-master.js` — Hazard damage currently bypasses CombatMaster (`target.hp -= damage`). This must be rerouted through `CombatMaster.dealDamage()` (or `applyDamage()` as it's named in the codebase) so that all damage modifiers (resistances, defense, boon effects) apply correctly. A player with +30% fire resistance from boons should take 30% less damage from fire patches.
- `spell-system.js` — Frost Nova creates an ice_slick hazard. Fireball (if upgraded by boon) can create a fire_patch at impact. Spell-created hazards use `owner: 'player'` so they damage enemies but not the player.
- `boon-system.js` — Boons can modify hazard interaction: `fireResist` reduces fire_patch damage, `poisonResist` reduces poison_cloud damage. A special boon could grant immunity to hazards entirely for 2 seconds after dashing (would be a `special` type effect that sets a temporary flag on the player).
- `enemy-ai.js` — Enemies should have basic hazard avoidance. When an enemy's pathfinding evaluates a tile that contains an active hazard with `owner: 'player'`, it should increase the tile's cost (making the enemy prefer other paths). Enemies should NOT perfectly avoid all hazards — that feels robotic. A 70% chance to reroute and 30% chance to walk through (taking damage) feels natural.
- `stamina-system.js` — Hazard damage should NOT reset kill streaks (it's environmental, not an enemy attacking you). But hazard damage DOES reset kill streaks if you decide that all damage sources reset streaks. **Recommendation:** Only enemy-sourced damage resets streaks. Hazard damage does not. This rewards players who reposition through hazards to maintain a streak.
- `time-effects.js` — Hazard tick timers use scaled `dt`. During time slow, hazard damage ticks are slower. This gives the player more reaction time to telegraphs during slow-mo, which feels generous and correct.
- `dungeon-generator.js` — Hazards can be pre-placed during floor generation (lava pools, gas vents) in addition to being created dynamically by enemy abilities. Pre-placed hazards have no telegraph (they're visible from the start) and have infinite duration (they're terrain features, not temporary effects). Mechanically they use the same `LingeringHazards` system but with `duration: Infinity` and `isTelegraphing: false`.

**Downstream impact:**
- **Content phase (future):** Each floor theme introduces new hazard types. The hazard system must be extensible — adding a new hazard type should only require adding an entry to the hazard type definitions, not modifying the core update/render loop. The type definition provides: color, damage, tick interval, status effect, telegraph duration. The core loop handles the rest.
- **Boss phase (future):** Boss abilities create hazards as a primary mechanic. Boss room floors may be covered in rotating hazard zones that the player must dodge. The system must support 10-15 simultaneous hazards without performance issues. Current implementation iterates all entities against all hazards — at 15 hazards × 30 entities = 450 proximity checks per frame. This should be fine at 60fps but profile it.
- **Multiplayer (future):** Hazards are server-authoritative. The server tracks all active hazards, their positions, and their tick timers. Clients render hazards based on server state. Player-created hazards (from spells) are validated server-side before being spawned.

---

## Implementation Order

> **REVISED:** Order updated to reflect that many systems already exist and need integration/extension rather than creation from scratch. Also incorporates MVP prerequisite fixes that must land first.

### Wave -1: MVP Prerequisite Fixes (Must Complete First)

These are incomplete MVP items that will cause Phase 2 integration failures. Complete these before touching any Phase 2 system. The order matters — crash recovery first so you can debug everything else safely.

1. **Add crash recovery handler** (`window.onerror` + `window.onunhandledrejection`) — renders recovery overlay, logs context, allows return to village. Without this, Phase 2 debugging is impractical.
2. **Define `applyTierMultipliers()`** in `js/generation/enemy-spawner.js` — 15% HP/damage scaling per floor. Without this, all balance tuning is meaningless.
3. **Wire `trackMonsterKill()`** into `handleDeath()` in `combat-master.js` — enables kill statistics that `runStats` depends on.
4. **Add save triggers** — `SaveManager.save()` on village entry, shop transactions, and victory. These protect against browser crashes only; all saved state is wiped on death.
5. **Fix bank capacity** — set `BankingSystem.maxSlots` to 30 (currently `Infinity`).

**Milestone:** Crash recovery works. Enemies scale by floor. Kills are tracked. Crash-protection saves fire at correct moments. Bank has a real capacity limit.

### Wave 0: Phase 2 Infrastructure (Prerequisite)

Must be completed before any Phase 2 system integration work.

1. **Create EventBus** (`js/core/event-bus.js`) — load first in `index.html`. This activates all existing guarded emit calls and enables Phase 2 event-driven architecture.
2. **Create StatModifierStack class** — can live in `js/utils/stat-modifier-stack.js`. Must include `clone()` method (used by boon stat preview).
3. **Migrate player stats** to StatModifierStack instances (wrap `recalculateDerivedStats()`)
4. **Migrate manual system updates** from `main.js` into SystemManager registrations (StaminaSystem, KillStreakSystem, KillStreakUI, TimeEffects)
5. **Integrate TimeEffects `timeScale`** into main loop delta calculation — compute `scaledDt = rawDt * TimeEffects.timeScale` and pass to all gameplay systems
6. **Decompose CombatMaster** — extract `DamageResolver` (`js/systems/damage-resolver.js`) for the pure damage calculation pipeline, and `ProjectileManager` (`js/systems/projectile-manager.js`) for projectile tracking/collision/lifecycle. CombatMaster calls into these but no longer contains their implementation. This must happen before Phase 2 adds boon hooks, spell projectiles, and hazard routing to CombatMaster — otherwise the file becomes unmaintainable.

**Milestone:** EventBus exists and all guarded emit calls activate. Player stats use modifier stacks. SystemManager controls all system updates. Time slow affects gameplay, not just visuals. CombatMaster is under 3,500 lines with damage and projectile logic extracted into testable modules.

### Wave 1: Boons Enhancement + Stamina Integration

Boons and stamina are largely implemented but need deeper integration. Boons need synergy system, stat preview, replace flow, and HUD display. Stamina needs boon-driven stat modifications via StatModifierStack.

**Milestone:** Player can find shrines, choose boons with stat previews, see synergy bonuses activate, manage stamina modified by boons. Start a run, build toward a direction, die, start fresh.

### Wave 2: Spells

Depends on Stamina integration (spells cost stamina). Depends on Boons integration (boons modify spell stats). New spells (Fireball, Frost Nova, Blink) require Lingering Hazards for hazard creation — if hazards aren't ready, ship spells without the hazard-on-impact feature and add it in Wave 3. **Requires solving the hotkey mapping problem — where do 6 spells bind?**

**Milestone:** Player has 6 spells available (Dash, Heal, Shield, Fireball, Frost Nova, Blink). Cooldowns visible on action bar. Visual effects on all casts.

### Wave 3: Hazards + Time Effects Polish

Hazards need new types (fire, ice, void), telegraph system, and CombatMaster damage routing. TimeEffects is done but needs event-driven triggers from CombatMaster (crit slow, death slow). Can be developed in parallel.

**Milestone:** Enemy abilities create ground hazards with telegraphs. Critical hits trigger time slow. Death has dramatic slow-mo. All hazard types (fire, ice, poison, void) functional.

### Wave 4: Kill Streaks + Polish

Add mechanical rewards (gold/XP multipliers) to existing tracking system. Add death screen boon summary. Wire up `runStats` aggregation.

**Milestone:** Streaks track correctly with rewards, reset on damage, show on HUD, appear on death screen. Death screen shows full run summary including boons. Screen shake on tier-up.

### Full Dependency Chain (MVP → Phase 2)

```
MVP PREREQUISITES (Wave -1)
│
├── 0.4 Crash Recovery ─────────────────────── (debug safety net for all Phase 2 work)
├── 3.2 applyTierMultipliers() ──────────────── (enemy scaling needed for balance tuning)
├── 2.3 trackMonsterKill() wiring ───────────── (kill stats needed for runStats)
├── 0.5 Save triggers ──────────────────────── (crash protection only — all state wiped on death)
└── 2.1 Bank capacity fix ──────────────────── (prevent inventory exploits)
        │
        ▼
PHASE 2 INFRASTRUCTURE (Wave 0)
│
├── EventBus ──────────────────┬─── Boon events ──────── Wave 1 Boons
│                              ├─── Combat events ─────── Wave 2 Spells (projectile hit events)
│                              ├─── Kill events ──────── Wave 4 Kill Streaks
│                              └─── Crit events ──────── Wave 3 Time Effects
│
├── StatModifierStack ────────── Player stat migration ─── Wave 1 Boons (stat modifiers)
│
├── SystemManager migration ──── Consistent update order ── All waves
│
├── CombatMaster decomposition ── DamageResolver + ProjectileManager extracted ── All waves
│
└── TimeEffects integration ──── scaledDt in game loop ─── Wave 3 Time Effects
        │
        ▼
WAVE 1: Boons + Stamina
│   ├── Boon synergy system (extends existing boon-system.js)
│   ├── Boon stat preview in shrine UI (extends shrine-ui.js)
│   ├── Boon replace flow (8/8 cap)
│   ├── Boon HUD icons
│   └── Stamina ↔ boon modifier integration
│       │
│       ▼
WAVE 2: Spells
│   ├── 3 new spells (Fireball, Frost Nova, Blink)
│   ├── Spell hotkey mapping (solve the 6-spell binding problem)
│   ├── Spell ↔ stamina cost integration
│   ├── Spell ↔ boon modifier integration
│   └── Loadout spell picker update (add new spells)
│       │
│       ▼
WAVE 3: Hazards + Time Effects (can run in parallel)
│   ├── New hazard types (fire, ice, void)
│   ├── Telegraph system (0.8s warning)
│   ├── Hazard damage through CombatMaster
│   ├── Spell → hazard creation (Fireball → fire patch)
│   └── Time effects event triggers (crit slow, death slow)
│       │
│       ▼
WAVE 4: Kill Streaks + Polish
    ├── Mechanical rewards (gold/XP multipliers)
    ├── runStats creation and population
    ├── Death screen boon/streak summary
    └── Final integration testing (23-step verification)
```

---

## Verification: Phase 2 Complete

When all six systems are integrated, this test sequence should pass:

1. **Start run** → enter Floor 1 with base stats, 0 boons, full stamina, all spells on cooldown 0
2. **Attack enemy** → stamina decreases by attack cost → enemy takes damage
3. **Attack until stamina = 0** → player enters exhaustion → movement slows → screen edge tints → attack attempts fail
4. **Wait** → stamina regens after 0.8s delay (actual `regenDelay` value, not 1.5s) → exhaustion clears at 20% → tint fades
5. **Kill enemy** → stamina refunds 25 → kill streak increments
6. **Kill 3 rapidly** → "Killing Spree!" announcement → screen shake → gold bonus on drops
7. **Take damage** → streak resets to 0
8. **Cast Heal** → green particles → HP recovers → stamina decreases → cooldown starts on action bar
9. **Cast Shield** → blue shimmer ring → next hit absorbed → no streak reset from shielded hit
10. **Cast Fireball** → orange projectile → hits enemy → burn DoT → fire patch at impact point
11. **Cast Frost Nova** → ice ring expands → enemies slowed → ice_slick hazard on ground
12. **Cast Dash** → afterimage trail → player moves 4 tiles → stamina decreases
13. **Cast Blink** → purple flash → teleport 5 tiles → invulnerable during transit
14. **Land critical hit** → time slows 0.3x for 150ms → vignette darkens → yellow damage number
15. **Find shrine** → approach → "E — Ancestor Shrine" prompt
16. **Interact** → game pauses → 3 boon cards with stat previews → select one → stats change → boon icon on HUD
17. **Find 2 more shrines from same Ancestor** → 3rd boon triggers synergy → "EMBERBORN" banner → fire damage spike
18. **Enemy casts fire breath** → telegraph circle pulses → fire patch appears after 0.8s → standing in it deals damage
19. **Advance to Floor 3** → shrine now offers Tier 2 boons alongside Tier 1
20. **Advance to Floor 6** → shrine now offers Tier 3 boons
21. **Collect 8 boons** → next shrine shows replacement flow → swap one boon → synergy recalculated
22. **Die** → dramatic 0.8s time slow → death screen shows: floor, kills, boons collected, synergies, best streak, time played
23. **Start new run** → 0 boons, base stats, full stamina, 0 streaks, empty bank, no skills, no gold, no items. True permadeath — completely fresh, identical to a brand new game.

If all 23 steps pass and the player's experience at step 22 makes them want to reach step 1 again, Phase 2 is complete.

---

## REVIEW APPENDIX — Critical Findings from Codebase Audit

*Added after cross-referencing this document against the actual codebase state.*

### P0: Blockers (Must Fix Before Any Phase 2 Work)

| # | Issue | Details |
|---|-------|---------|
| 1 | **EventBus does not exist** | The entire Phase 2 event architecture depends on EventBus, but `js/core/event-bus.js` does not exist. Multiple files already guard calls with `if (typeof EventBus !== 'undefined')`. Create this file and load it first in `index.html`. |
| 2 | **TimeEffects `timeScale` output is unused** | `TimeEffects.update()` is called in the main loop but its `timeScale` value is never applied to `dt` before passing to other systems. Time slow effects are purely visual — no gameplay impact. The main loop must compute `scaledDt = rawDt * TimeEffects.timeScale` and pass `scaledDt` to gameplay systems. |
| 3 | **Manual system updates in main.js bypass SystemManager** | StaminaSystem, KillStreakSystem, KillStreakUI, and TimeEffects are updated manually in `updateDungeon()` instead of being registered with SystemManager. This creates ordering bugs and potential double-updates. Migrate all manual calls to SystemManager registrations. |

### P1: Factual Mismatches (Document States Incorrect Values)

| # | Issue | Document Says | Actual Value | Location |
|---|-------|--------------|--------------|----------|
| 1 | TILE_SIZE | 32px | **16px** | `constants.js` line 11 |
| 2 | Stamina regen rate | 8/s | **15/s** (7.5/s in combat) | `combat-config.js` |
| 3 | Stamina regen delay | 1.5s | **0.8s** | `combat-config.js` |
| 4 | Exhaustion speed penalty | 0.6 (60% speed) | **0.7 (70% speed)** | `stamina-system.js` |
| 5 | Pause mechanism | `game.paused = true/false` | **`game.state = 'shrine'`** (state machine) | `main.js`, `game-state.js` |
| 6 | Ancestor names | ember, stone, tide, gale, shadow, iron, spirit | **torchbearer, headsman, lurker, storm_caller, rot_weaver, iron_warden, maniac** | `boon-system.js` |
| 7 | Boon tier system | Floor-gated (Tier 1/2/3) | **Requirement-gated** (Core/Resonance/Legendary) | `boon-system.js` |
| 8 | Kill streak tiers | 3 kills = Killing Spree | **2=Double Kill, 4=Killing Spree, 6=Rampage, 8=Unstoppable, 10=Godlike** | `kill-streak-system.js` |
| 9 | Boon data file | `js/data/boon-data.js` | **`js/systems/boon-system.js`** (inline) | `boon-system.js` |
| 10 | Extraction portals | Referenced in shrine placement | **Deleted** — extraction system was removed | git status |

### P2: Already Implemented (Document Describes Work That Exists)

| # | Feature | Status | File |
|---|---------|--------|------|
| 1 | Shrine spawning in dungeon | Done | `constants.js` (`shrineRoomChance: 0.08`), dungeon generator |
| 2 | Shrine interaction flow | Done | `game-init.js` (`interactWithDecoration()`), `shrine-ui.js` |
| 3 | Shrine UI overlay | Done (398 lines) | `js/ui/shrine-ui.js` |
| 4 | Shrine input routing | Done | `input-handler.js` (keyboard + mouse handlers) |
| 5 | Shrine rendering in game loop | Done | `renderer.js` line 1317 |
| 6 | Shrine on minimap | Done (cyan torii gate icon) | `mini-map.js` |
| 7 | Boon data (70 boons, 7 ancestors) | Done | `boon-system.js` |
| 8 | StaminaSystem core | Done | `stamina-system.js` |
| 9 | KillStreakSystem core + UI | Done | `kill-streak-system.js`, `kill-streak-ui.js` |
| 10 | TimeEffects core | Done (not integrated) | `time-effects.js` |
| 11 | LingeringHazards (poison only) | Partial | `lingering-hazards.js` |
| 12 | SpellSystem (Dash/Heal/Shield) | Done | `spell-system.js` |
| 13 | SystemManager with priorities | Done | `system-manager.js` |
| 14 | STAT_DISPLAY_NAMES | Done | `ui-design-system.js` lines 2555-2603 |
| 15 | Stamina pip display in unit frames | Done | `unit-frames.js` |

### P3: Actually Missing (New Work Required)

| # | Feature | Description | Priority |
|---|---------|-------------|----------|
| 1 | **EventBus creation** | Create `js/core/event-bus.js` with on/off/emit/once | Blocker |
| 2 | **StatModifierStack class** | Base value tracking with clean add/remove for multiplicative stacking | High |
| 3 | **Player stat stack migration** | Convert flat player stats to StatModifierStack instances | High |
| 4 | **Ancestor synergy system** | `synergyThreshold`, `synergyBonus` on ANCESTORS + `checkSynergy()` logic | High |
| 5 | **Boon tier reconciliation** | Merge floor-gating with existing requirement-gating system | High |
| 6 | **Boon replace flow (8/8 cap)** | UI for swapping an existing boon when at max capacity | Medium |
| 7 | **Boon stat preview in shrine UI** | Show current → projected stat values on hover/select | Medium |
| 8 | **Boon HUD display** | Icon row below stamina bar with synergy indicators | Medium |
| 9 | **Boon summary on death screen** | Show collected boons, synergies, total stat impact | Medium |
| 10 | **Kill streak mechanical rewards** | Gold multiplier, XP bonus, or damage bonus per tier | Medium |
| 11 | **New spells: Fireball, Frost Nova, Blink** | Full implementation with projectiles, AoE, teleport | High |
| 12 | **Spell hotkey system** | Per-spell key bindings beyond just Spacebar | High |
| 13 | **Hazard telegraph system** | 0.8s pulsing warning before hazard activation | High |
| 14 | **New hazard types** | fire_patch, ice_slick, void_zone (only poison exists) | Medium |
| 15 | **Hazard damage through CombatMaster** | Route hazard damage through `applyDamage()` for resistance calcs | Medium |
| 16 | **TimeEffects main loop integration** | Apply `timeScale` to `dt` before passing to gameplay systems | High |
| 17 | **SystemManager migration** | Move manual system updates from main.js into SystemManager | Medium |
| 18 | **runStats object** | Create and populate `game.runStats` across all systems | Medium |
| 19 | **Boon clear on death** | `clearAllBoons()` in death handler with pre-clear capture | Medium |
| 20 | **`shuffleArray` utility** | Fisher-Yates shuffle — referenced but not in codebase | Low |
| 21 | ~~Heal/Shield cooldown tuning~~ | **RESOLVED:** Heal → 35s, Shield → 40s. See A.3 codebase note for full rationale and cooldown table. | Done |

### P3.5: Ordering Risks (Things That Break If Done Out of Sequence)

| # | If You Do This... | Before This... | What Breaks |
|---|-------------------|----------------|-------------|
| 1 | Boon stat modifiers (Wave 1) | StatModifierStack (Wave 0) | Boon effects will use ad-hoc stat manipulation that's impossible to cleanly remove on boon replacement. Refactoring later is expensive. |
| 2 | Spell damage tuning (Wave 2) | `applyTierMultipliers()` (Wave -1) | All spell balance numbers will be tuned against enemies that don't scale. When scaling is added later, spells will feel too weak on early floors and too strong on late floors. |
| 3 | Kill streak rewards (Wave 4) | `trackMonsterKill()` wiring (Wave -1) | `runStats.enemiesKilled` will be 0, making streak thresholds impossible to tune. |
| 4 | Hazard damage routing (Wave 3) | EventBus (Wave 0) | Hazard → CombatMaster damage events won't fire. You'll use direct function calls that must be refactored when EventBus lands. |
| 5 | Any Phase 2 system | Crash recovery (Wave -1) | Silent crashes during integration testing. You'll waste hours on bugs that a stack trace would have solved instantly. |
| 6 | New spells in loadout (Wave 2) | Spell hotkey mapping (Wave 2) | Player selects Fireball in loadout but has no key to cast it in the dungeon. |
| 7 | SystemManager migration (Wave 0) | Nothing — do first | Double-updates (manual + SystemManager) will cause stamina to drain twice as fast, kill streaks to count double, etc. |
| 8 | Boon synergy bonuses (Wave 1) | Boon tier reconciliation (Wave 1) | Synergy triggers at 3 same-ancestor boons, but if the floor-gating system is also active, players might never see enough boons to trigger synergy. |

### P4: Design Concerns

1. **Boon tier conflict: RESOLVED.** Merged gating system adopted. Both requirement gates AND floor gates must be satisfied. Core boons are always available. Resonance boons require 2-ancestor diversity AND Floor 3+. Legendary boons require 3 same-ancestor boons AND Floor 6+. This prevents lucky early runs from offering Legendary boons on Floor 2 while preserving the interesting requirement mechanic. `isTierAvailable()` and `generateOffering()` have been updated in this document to implement merged gating.

2. **Spell hotkey mapping: RESOLVED.** The player has 6 spells but only equips 4 spell slots per run (chosen in loadout). Dash is always bound to Space (muscle memory from Phase 1, movement ability). The remaining 4 loadout spell slots are bound to keys 1-4. This repurposes key 1 from consumable-only to spell slot. Consumables move to key 5 or are used from the inventory screen.

   **Final hotkey layout:**
   ```
   Space  = Dash (always equipped, not a loadout choice)
   1      = Spell Slot 1 (chosen in loadout from: Heal, Shield, Fireball, Frost Nova, Blink)
   2      = Spell Slot 2
   3      = Spell Slot 3
   4      = Spell Slot 4
   Q      = Weapon Action (main hand)
   E      = Weapon Action (off hand)
   5      = Consumable (moved from key 1)
   ```

   **Loadout spell picker:** The existing 3-option spell picker (Dash/Heal/Shield) is replaced with a 4-slot picker from the 5 available spells (Heal, Shield, Fireball, Frost Nova, Blink). Dash is always equipped and not selectable. The player picks 4 of 5, leaving one spell behind — this is a meaningful build decision (do you bring Blink for mobility or Shield for survivability?).

   **Action bar UI update:** The bottom bar changes from `[Dash/Space][WeaponQ][WeaponE][Consumable/1]` to `[Dash/Space][Spell1/1][Spell2/2][Spell3/3][Spell4/4][WeaponQ][WeaponE][Consumable/5]`. This is 8 slots — may need to shrink icon size or use a two-row layout. Prioritize readability over compactness.

3. **CombatMaster decomposition: RESOLVED — added to Wave 0.** At 4,462 lines, CombatMaster is already unwieldy. Phase 2 adds EventBus emissions, boon damage hooks, hazard damage routing, spell projectile resolution, and stamina gating. Extract two modules before Phase 2 integration:

   **a) `DamageResolver` (`js/systems/damage-resolver.js`):** Pure damage calculation pipeline: base damage → defense reduction → elemental resistance → boon modifiers → crit check → final damage. Input: attacker stats, defender stats, damage type. Output: `{ finalDamage, isCrit, damageType, resistanceApplied }`. This is the function that StatModifierStack feeds into. ~200-300 lines.

   **b) `ProjectileManager` (`js/systems/projectile-manager.js`):** Tracks active projectiles (arrows, spell projectiles), collision detection per frame, lifecycle (spawn → travel → hit/expire → cleanup), on-hit callbacks. Currently inline in CombatMaster's projectile section. ~300-400 lines.

   CombatMaster remains the orchestrator — it calls `DamageResolver.calculate()` and `ProjectileManager.update(dt)` but no longer contains their implementation. This makes each piece independently testable and keeps CombatMaster at a manageable ~3,500 lines even after Phase 2 additions.

4. **`game.runStats` vs `persistentState.stats`: RESOLVED.** `game.runStats` is the sole run statistics tracker. It is created fresh on `startNewGame()`, populated by all six Phase 2 systems during the run, read by the death/victory screen for the summary, and then destroyed by permadeath along with everything else. `persistentState.stats` (which contains overlapping fields like totalKills, deaths, deepestFloor) is deprecated for Phase 2 purposes — its fields are not maintained and should not be read. If a future phase adds career-spanning stats (outside the permadeath wipe), they would need a separate storage mechanism entirely. For now, `game.runStats` is the only stats object that matters.

5. **No `game.paused` boolean:** The document repeatedly references `game.paused` as the pause mechanism, but the codebase uses `game.state` (a string state machine). Adding a separate `game.paused` boolean would create two competing pause mechanisms. All `game.paused` references in this document have been corrected to use `game.state` checks, but implementers should be aware of this pattern.

6. **Missing: enemy ability hazard creation system.** The document describes enemies creating telegraphed hazards (fire breath, poison cloud) but doesn't specify which enemies get which abilities, or how enemy abilities are defined. The existing `EnemyAbilitySystem` and enemy AI would need hazard-creation ability definitions added.
