# Shift System Implementation Guide

## Overview

The Shift System is the core end-game mechanic for each dungeon floor. After a countdown timer expires, a "shift" event triggers that fundamentally changes the floor's dynamics, creating urgency and unique win conditions.

**Current Implementation Status:**
- Protocol: MELTDOWN - Complete
- Protocol: LOCKDOWN - Planned
- Protocol: ECLIPSE - Planned
- Protocol: BREACH - Planned
- Protocol: RESONANCE - Planned
- Protocol: FROSTBITE - Planned

---

# Part 1: Shared Systems

These systems are used across multiple shift scenarios and should be built as reusable, generic components.

---

## 1.1 Shift Scenario Data Structure

All shift scenarios follow a standard data structure defined in `js/systems/shift-system.js`.

### Schema

```javascript
const shiftScenarios = {
    'scenario_id': {
        // Display Information
        name: string,           // e.g., "Protocol: MELTDOWN"
        description: string,    // Short alert message when shift triggers

        // Lore (for Shift Overlay UI)
        lore: {
            title: string,      // e.g., "The Molten Depths"
            paragraphs: string[] // Array of lore paragraphs
        },

        // Mechanics Description (for Shift Overlay UI)
        mechanics: {
            title: string,
            description: string,
            details: string[]   // Bullet points
        },

        // Active Bonuses During Shift
        bonuses: [
            {
                name: string,
                description: string,
                icon: string,       // Emoji or icon reference
                multiplier: number, // e.g., 2.0 for 2x
                appliesTo: string   // System identifier: 'epic_drops', 'gold', 'xp', etc.
            }
        ],

        // Win Condition
        winCondition: {
            title: string,
            description: string,
            icon: string
        },

        // Timing
        countdownTime: number,  // Seconds before shift triggers (default: 600)
        shiftDuration: number,  // Seconds shift lasts (null = until win/death)

        // Lifecycle Methods
        init: function(game) {},    // Called when shift triggers
        update: function(game, dt) {}, // Called every frame during shift
        cleanup: function(game) {}  // Called when shift ends (win or floor transition)
    }
};
```

### Integration Points

**Game State** (`js/core/game-state.js`):
```javascript
// Add these properties to the game object
shiftActive: false,          // Boolean: is a shift currently active?
activeShift: null,           // Reference to current shift scenario object
shiftState: {},              // Shift-specific state data
shiftCountdown: 600,         // Seconds until shift triggers
shiftLootMultiplier: 1.0,    // Dynamic multiplier for loot bonuses
exitPosition: null           // {x, y} of current exit
```

---

## 1.2 Shift Bonus System

A generic system for applying shift-specific bonuses to game mechanics.

### Location
`js/systems/shift-bonus-system.js` (new file)

### Interface

```javascript
const ShiftBonusSystem = {
    /**
     * Get the current multiplier for a specific bonus type
     * @param {string} bonusType - The bonus identifier (e.g., 'epic_drops', 'gold')
     * @returns {number} - Multiplier value (1.0 = no bonus)
     */
    getMultiplier(bonusType) {
        if (!game.shiftActive || !game.activeShift?.bonuses) {
            return 1.0;
        }

        const bonus = game.activeShift.bonuses.find(b => b.appliesTo === bonusType);
        return bonus?.multiplier || 1.0;
    },

    /**
     * Check if a specific bonus is active
     * @param {string} bonusType - The bonus identifier
     * @returns {boolean}
     */
    isActive(bonusType) {
        return this.getMultiplier(bonusType) !== 1.0;
    },

    /**
     * Get all active bonuses for UI display
     * @returns {Array} - Array of active bonus objects
     */
    getActiveBonuses() {
        if (!game.shiftActive || !game.activeShift?.bonuses) {
            return [];
        }
        return game.activeShift.bonuses;
    }
};
```

### Supported Bonus Types

| Bonus Type | Affected System | Description |
|------------|-----------------|-------------|
| `epic_drops` | loot-system.js | Multiplies epic rarity weight |
| `rare_drops` | loot-system.js | Multiplies rare rarity weight |
| `gold_drops` | loot-system.js | Multiplies gold amounts |
| `xp_gain` | combat-system.js | Multiplies XP from kills |
| `damage_dealt` | damage-calculator.js | Multiplies player damage |
| `damage_taken` | damage-calculator.js | Multiplies incoming damage |
| `move_speed` | pokemon-movement.js | Multiplies player speed |
| `health_regen` | player.js | Multiplies passive regen |

### Integration Example (loot-system.js)

```javascript
function rollEquipmentDrop() {
    const rarityWeights = {
        'common': 50,
        'uncommon': 35,
        'rare': 13,
        'epic': 2
    };

    // Apply shift bonuses
    rarityWeights['epic'] *= ShiftBonusSystem.getMultiplier('epic_drops');
    rarityWeights['rare'] *= ShiftBonusSystem.getMultiplier('rare_drops');

    // ... rest of function
}
```

---

## 1.3 Dynamic Tile System

Handles tiles that change state during gameplay (corruption, ice, locked doors, etc.).

### Location
`js/systems/dynamic-tile-system.js` (new file)

### Tile State Schema

```javascript
// Extended tile properties for dynamic tiles
tile = {
    type: string,           // 'floor', 'wall', 'lava', 'ice', 'corrupted', etc.
    dynamicState: {
        active: boolean,    // Is the dynamic effect active?
        timer: number,      // Time until state change (ms)
        intensity: number,  // 0-1 for gradual effects
        source: string      // What caused this state ('shift', 'spell', 'trap')
    }
};
```

### Interface

```javascript
const DynamicTileSystem = {
    /**
     * Convert a tile to a new type with spread behavior
     */
    convertTile(x, y, newType, options = {}) {
        const tile = game.map[y]?.[x];
        if (!tile) return false;

        const oldType = tile.type;
        tile.type = newType;
        tile.dynamicState = {
            active: true,
            timer: options.duration || Infinity,
            intensity: options.intensity || 1.0,
            source: options.source || 'unknown',
            previousType: oldType
        };

        return true;
    },

    /**
     * Spread a tile type outward from a center point
     */
    spreadFrom(centerX, centerY, tileType, radius, options = {}) {
        // Implementation for radial spread (used by lava, ice, corruption)
    },

    /**
     * Spread inward toward a center point
     */
    spreadToward(centerX, centerY, tileType, currentRadius, options = {}) {
        // Implementation for inward spread
    },

    /**
     * Revert dynamic tiles to their previous state
     */
    revertTile(x, y) {
        const tile = game.map[y]?.[x];
        if (tile?.dynamicState?.previousType) {
            tile.type = tile.dynamicState.previousType;
            tile.dynamicState = null;
        }
    },

    /**
     * Update all dynamic tiles (call from main update loop)
     */
    update(dt) {
        // Process timers, spread effects, etc.
    }
};
```

### Supported Dynamic Tile Types

| Type | Visual | Effect | Used By |
|------|--------|--------|---------|
| `lava` | Orange/red animated | 20 damage/tick | MELTDOWN |
| `frozen_floor` | Blue/white | Slows movement, drains warmth | FROSTBITE |
| `ice_wall` | Solid ice | Blocks movement | FROSTBITE |
| `corrupted` | Purple/void | DOT, buffs void enemies | BREACH |
| `darkness` | Black overlay | Reduces visibility | ECLIPSE |
| `unstable` | Cracking animation | May collapse | LOCKDOWN |

---

## 1.4 NPC System

Handles non-enemy entities that can be interacted with during shifts.

### Location
`js/entities/npc.js` (new file)

### NPC Schema

```javascript
const npc = {
    id: string,
    name: string,
    type: string,           // 'spirit', 'prisoner', 'guide', 'merchant'

    // Position
    gridX: number,
    gridY: number,
    displayX: number,
    displayY: number,

    // State
    state: string,          // 'idle', 'following', 'guiding', 'bound', 'freed'
    health: number,         // null = invulnerable
    maxHealth: number,

    // Movement
    moveSpeed: number,
    isMoving: boolean,
    targetGridX: number,
    targetGridY: number,
    path: Array,            // Pre-calculated path for guides

    // Interaction
    interactable: boolean,
    interactRange: number,
    interactPrompt: string, // e.g., "Press F to free"

    // Visual
    sprite: string,
    animationState: string,
    facingDirection: string,

    // Callbacks
    onInteract: function(game, player) {},
    onDeath: function(game) {},
    onReachDestination: function(game) {}
};
```

### NPC Manager

```javascript
const NPCManager = {
    npcs: Map,              // id -> npc object

    spawn(npcData, x, y) {},
    remove(npcId) {},
    update(dt) {},

    getNearPlayer(range) {},
    getById(id) {},

    // Escort-specific
    startEscort(npcId, path) {},
    isEscortComplete(npcId) {}
};
```

---

## 1.5 Boss Framework

System for handling large, multi-phase boss enemies.

### Location
`js/entities/boss.js` (new file)

### Boss Schema

```javascript
const boss = {
    // Inherits from enemy base
    ...enemyBase,

    // Boss-specific
    isBoss: true,
    size: { width: 2, height: 2 },  // Tile dimensions

    // Phases
    phases: [
        {
            name: string,
            healthThreshold: number,    // Triggers at this % health
            attackPattern: string,
            movePattern: string,
            onEnter: function(game, boss) {},
            onExit: function(game, boss) {}
        }
    ],
    currentPhase: number,

    // Attack Patterns
    attacks: {
        'slam': {
            damage: number,
            range: number,
            aoe: { shape: 'circle', radius: 2 },
            telegraphTime: 1000,    // Warning time in ms
            cooldown: 3000
        },
        'charge': {
            damage: number,
            telegraphTime: 500,
            chargeSpeed: 8,
            stunOnHit: true
        }
    },

    // Visual
    telegraphIndicator: null,   // Current attack warning

    // Events
    onPhaseChange: function(game, newPhase) {},
    onDeath: function(game) {}
};
```

### Boss AI Extension

```javascript
// Extend EnemyAI class for boss-specific behavior
class BossAI extends EnemyAI {
    constructor(boss) {
        super(boss);
        this.attackQueue = [];
        this.currentAttack = null;
    }

    selectAttack() {
        // Phase-based attack selection
    }

    executeTelegraph(attack) {
        // Show warning indicator
    }

    executeAttack(attack) {
        // Perform the attack
    }

    checkPhaseTransition() {
        // Check if health threshold crossed
    }
}
```

---

## 1.6 Collectible Quest Item System

Handles special items that must be collected during shifts.

### Location
`js/systems/quest-item-system.js` (new file)

### Quest Item Schema

```javascript
const questItem = {
    id: string,
    name: string,
    description: string,
    icon: string,

    // Position (if on ground)
    gridX: number,
    gridY: number,

    // State
    collected: boolean,
    delivered: boolean,
    carriedBy: null,        // Player reference if being carried

    // Effects while carrying
    carryEffects: {
        moveSpeedMod: number,   // e.g., 0.8 for -20% speed
        glowing: boolean,       // Makes carrier visible to enemies
        attracts: string[]      // Enemy types attracted to carrier
    },

    // Visual
    groundSprite: string,
    inventorySprite: string,
    particleEffect: string
};
```

### Quest Item Manager

```javascript
const QuestItemManager = {
    items: Map,
    deliveryPoints: [],

    spawnItems(locations) {},
    collectItem(itemId) {},
    dropItem(itemId, x, y) {},
    deliverItem(itemId, deliveryPoint) {},

    getCollectedCount() {},
    getDeliveredCount() {},
    getTotalCount() {},

    isAllCollected() {},
    isAllDelivered() {},

    // UI helpers
    getItemLocations() {},      // For minimap markers
    getCarriedItems() {}        // For inventory display
};
```

---

## 1.7 Environmental Meter System

Handles resource meters affected by the environment (warmth, infection, etc.).

### Location
`js/systems/environmental-meter-system.js` (new file)

### Meter Schema

```javascript
const environmentalMeter = {
    id: string,             // 'warmth', 'infection', 'sanity', etc.
    name: string,

    // Values
    current: number,
    max: number,
    min: number,

    // Drain/Regen
    baseDrainRate: number,  // Per second
    baseRegenRate: number,
    currentDrainRate: number,
    currentRegenRate: number,

    // Thresholds
    thresholds: [
        {
            value: number,
            effect: string,     // 'dot', 'slow', 'transform', 'death'
            intensity: number,
            message: string
        }
    ],

    // Visual
    barColor: string,
    warningColor: string,
    criticalColor: string,
    position: { x, y },     // UI position

    // Modifiers
    modifiers: []           // Active effects changing drain/regen
};
```

### Environmental Meter Manager

```javascript
const EnvironmentalMeterManager = {
    meters: Map,

    createMeter(config) {},
    removeMeter(meterId) {},

    getValue(meterId) {},
    setValue(meterId, value) {},
    modifyValue(meterId, delta) {},

    addModifier(meterId, modifier) {},
    removeModifier(meterId, modifierId) {},

    update(dt) {},          // Process drain/regen
    render(ctx) {},         // Draw meter UI

    checkThresholds(meterId) {}  // Apply threshold effects
};
```

---

## 1.8 Light Source System

Handles dynamic lighting for darkness-based shifts.

### Location
`js/systems/light-source-system.js` (new file)

### Light Source Schema

```javascript
const lightSource = {
    id: string,
    type: string,           // 'torch', 'brazier', 'lantern', 'spell', 'player'

    // Position
    gridX: number,
    gridY: number,
    attachedTo: null,       // Entity reference if mobile

    // Properties
    radius: number,         // Light radius in tiles
    intensity: number,      // 0-1, affects visibility
    color: string,          // Tint color
    flicker: boolean,       // Animated flicker effect

    // Fuel (for consumable lights)
    fuel: number,           // Current fuel
    maxFuel: number,
    burnRate: number,       // Fuel consumed per second

    // State
    active: boolean,
    permanent: boolean      // Can't be extinguished
};
```

### Light Source Manager

```javascript
const LightSourceManager = {
    sources: Map,
    globalDarkness: 1.0,    // 0 = full light, 1 = full dark

    addSource(config) {},
    removeSource(sourceId) {},

    setGlobalDarkness(level) {},

    /**
     * Calculate visibility at a point considering all light sources
     */
    getVisibilityAt(x, y) {
        // Returns 0-1 visibility based on nearby light sources
    },

    /**
     * Check if a point is in a "safe zone" (well-lit area)
     */
    isInSafeZone(x, y) {
        return this.getVisibilityAt(x, y) > 0.7;
    },

    update(dt) {},          // Process fuel consumption, flicker
    render(ctx) {}          // Render light/shadow overlay
};
```

---

## 1.9 Spawn Point System

Handles continuous enemy spawning from specific locations.

### Location
`js/systems/spawn-point-system.js` (new file)

### Spawn Point Schema

```javascript
const spawnPoint = {
    id: string,
    type: string,           // 'rift', 'nest', 'portal', 'grave'

    // Position
    gridX: number,
    gridY: number,
    size: { width, height },

    // Spawning
    enemyTypes: string[],   // Pool of enemy types to spawn
    spawnRate: number,      // Ms between spawns
    spawnCap: number,       // Max active spawns from this point
    totalSpawned: 0,
    maxTotalSpawns: null,   // null = infinite

    // State
    active: boolean,
    health: number,         // null = indestructible

    // Scaling
    difficultyScale: number, // Multiplier for spawned enemy stats
    rateScale: number,      // Spawn rate increases over time

    // Visual
    sprite: string,
    particleEffect: string
};
```

### Spawn Point Manager

```javascript
const SpawnPointManager = {
    spawnPoints: Map,
    activeSpawns: Map,      // spawnPointId -> [enemy references]

    create(config) {},
    destroy(spawnPointId) {},

    activate(spawnPointId) {},
    deactivate(spawnPointId) {},

    update(dt) {},          // Process spawn timers

    getActiveCount(spawnPointId) {},
    getTotalSpawned(spawnPointId) {},

    onSpawnedEnemyDeath(enemy) {}  // Track when spawned enemies die
};
```

---

# Part 2: Shift Scenarios

---

## 2.1 Protocol: MELTDOWN (Complete)

**Status:** Implemented

### Overview
Lava flows inward from the dungeon edges toward a central exit point. Players must reach the exit before being consumed.

### Files Modified
- `js/systems/shift-system.js` - Main shift logic
- `js/systems/enemy-ai.js` - Alert state during shift
- `js/systems/loot-system.js` - Epic drop multiplier
- `js/ui/shift-overlay.js` - Shift information display
- `js/core/game-state.js` - Shift state properties

### Shift Data

```javascript
'magma_collapse': {
    name: "Protocol: MELTDOWN",
    countdownTime: 600,     // 10 minutes
    lavaDuration: 90,       // 90 seconds to consume everything

    lore: {
        title: "The Molten Depths",
        paragraphs: [...]
    },

    mechanics: {
        title: "The Meltdown",
        description: "Lava flows inward toward the exit...",
        details: [
            "Lava flows inward toward the exit",
            "Standing in lava deals 20 damage per tick",
            "All enemies become alert and aggressive",
            "The exit appears in the farthest room from spawn"
        ]
    },

    bonuses: [{
        name: "Desperate Fortune",
        description: "Epic equipment drop chance doubled",
        multiplier: 2.0,
        appliesTo: "epic_drops"
    }],

    winCondition: {
        title: "Escape",
        description: "Reach the exit portal before the lava consumes everything."
    }
}
```

### Key Mechanics

1. **Exit Placement:** Spawns in the center of the farthest room from entrance
2. **Lava Spread:** Radial spread inward, calculated to reach exit in exactly 90 seconds
3. **Enemy Behavior:** All enemies enter ALERT state, target player
4. **Damage:** 20 HP per tick while standing in lava

---

## 2.2 Protocol: LOCKDOWN

**Status:** Planned

### Overview
A massive Warden construct awakens and seals all exits. Players must defeat the boss while navigating activated traps and periodically locking doors.

### New Files Required
- `js/entities/warden-boss.js` - Warden boss entity
- `js/systems/trap-system.js` - Trap activation and damage
- `js/systems/door-lock-system.js` - Door state management

### Files to Modify
- `js/systems/shift-system.js` - Add LOCKDOWN scenario
- `js/generation/room-decorator.js` - Add trap placement
- `js/ui/renderer.js` - Trap and locked door rendering

### Shift Data

```javascript
'lockdown': {
    name: "Protocol: LOCKDOWN",
    countdownTime: 600,

    lore: {
        title: "The Sealed Vault",
        paragraphs: [
            "This place was never meant to be found. The ancients built the Warden to ensure their secrets died with them—a towering sentinel of stone and fury that awakens when intruders overstay their welcome.",
            "When the Warden rises, every door becomes a cage. The vault's defenses spring to life: arrows fly from hidden slits, spikes erupt from innocent-looking floors, and poisonous gas seeps from cracked urns.",
            "Only the Warden's destruction can break the seal. Many have tried. Their bones now decorate its chamber."
        ]
    },

    mechanics: {
        title: "Security Protocol",
        description: "The Warden seals all exits and hunts you through the vault. Defeat it to escape.",
        details: [
            "All exits seal when the shift triggers",
            "The Warden spawns in the central chamber",
            "Traps activate throughout the dungeon",
            "Doors lock and unlock in rotating patterns",
            "The Warden must be killed to unseal the exit"
        ]
    },

    bonuses: [{
        name: "Vault Breaker",
        description: "Gold drops increased by 50%",
        multiplier: 1.5,
        appliesTo: "gold_drops"
    }],

    winCondition: {
        title: "Destroy the Warden",
        description: "Defeat the Warden construct to deactivate the security system and unseal the exit.",
        icon: "💀"
    }
}
```

### Implementation Details

#### The Warden Boss

```javascript
const WARDEN_CONFIG = {
    name: "The Warden",
    size: { width: 3, height: 3 },
    baseHealth: 500,            // Scales with floor
    healthPerFloor: 100,

    phases: [
        {
            name: "Awakening",
            healthThreshold: 1.0,
            attackPattern: "basic",
            moveSpeed: 1.5
        },
        {
            name: "Aggression",
            healthThreshold: 0.6,
            attackPattern: "aggressive",
            moveSpeed: 2.0,
            onEnter: (game, warden) => {
                // Activate more traps
                TrapSystem.activateAll();
            }
        },
        {
            name: "Desperation",
            healthThreshold: 0.3,
            attackPattern: "berserk",
            moveSpeed: 2.5,
            onEnter: (game, warden) => {
                // Doors lock permanently
                DoorLockSystem.lockAll();
            }
        }
    ],

    attacks: {
        'ground_slam': {
            damage: 30,
            aoe: { shape: 'circle', radius: 2 },
            telegraphTime: 1000,
            cooldown: 4000,
            description: "Slams the ground, damaging nearby tiles"
        },
        'charge': {
            damage: 40,
            telegraphTime: 800,
            chargeDistance: 8,
            cooldown: 6000,
            description: "Charges in a line, destroying obstacles"
        },
        'security_pulse': {
            damage: 0,
            cooldown: 10000,
            effect: "activates all traps in radius 10",
            description: "Sends a pulse that activates nearby traps"
        }
    },

    immunities: ['stun', 'knockback'],
    resistances: { physical: 0.2 }
};
```

#### Trap System

```javascript
const TRAP_TYPES = {
    'arrow_trap': {
        damage: 15,
        direction: 'triggered',     // Fires toward trigger source
        triggerType: 'pressure',    // 'pressure', 'proximity', 'timed'
        rearmTime: 3000,
        sprite: 'trap_arrow'
    },
    'spike_trap': {
        damage: 25,
        triggerType: 'pressure',
        rearmTime: 2000,
        sprite: 'trap_spike'
    },
    'gas_trap': {
        damage: 5,
        damageType: 'poison',
        duration: 5000,             // Gas cloud duration
        radius: 2,
        triggerType: 'proximity',
        rearmTime: 10000,
        sprite: 'trap_gas'
    }
};

const TrapSystem = {
    traps: [],

    init() {},

    placeTrap(x, y, type) {},

    activateTrap(trap) {},

    triggerTrap(trap, triggeredBy) {},

    update(dt) {},

    // Called by Warden's security pulse
    activateInRadius(centerX, centerY, radius) {},

    // Activate all traps (phase transition)
    activateAll() {}
};
```

#### Door Lock System

```javascript
const DoorLockSystem = {
    doors: [],              // All door references
    lockPattern: 0,         // Current pattern index
    patternTimer: 0,
    patternDuration: 20000, // 20 seconds per pattern

    patterns: [
        // Each pattern defines which doors are locked
        { locked: [0, 2, 4], unlocked: [1, 3, 5] },
        { locked: [1, 3, 5], unlocked: [0, 2, 4] },
        // ... more patterns
    ],

    init() {
        // Gather all doors from game.doorways
    },

    lockDoor(doorIndex) {},
    unlockDoor(doorIndex) {},

    applyPattern(patternIndex) {},

    lockAll() {},           // Permanent lockdown (phase 3)
    unlockAll() {},         // When Warden dies

    update(dt) {
        this.patternTimer += dt;
        if (this.patternTimer >= this.patternDuration) {
            this.patternTimer = 0;
            this.lockPattern = (this.lockPattern + 1) % this.patterns.length;
            this.applyPattern(this.lockPattern);
        }
    },

    canPassThrough(doorIndex) {
        return !this.doors[doorIndex].locked;
    }
};
```

#### Shift State

```javascript
shiftState: {
    warden: null,               // Boss entity reference
    wardenDefeated: false,
    trapsActivated: true,
    doorPattern: 0,
    doorTimer: 0,
    permanentLockdown: false    // True in phase 3
}
```

#### Win Condition

```javascript
// In shift update or combat system
function onEnemyDeath(enemy) {
    if (enemy === game.shiftState.warden) {
        game.shiftState.wardenDefeated = true;
        DoorLockSystem.unlockAll();
        TrapSystem.deactivateAll();

        // Spawn exit at Warden's death location
        const exitX = Math.floor(enemy.gridX);
        const exitY = Math.floor(enemy.gridY);
        game.map[exitY][exitX] = { type: 'exit', discovered: true };
        game.exitPosition = { x: exitX, y: exitY };

        addMessage("THE WARDEN HAS FALLEN! The vault unseals...");
    }
}
```

---

## 2.3 Protocol: ECLIPSE

**Status:** Planned

### Overview
Darkness spreads inward, visibility shrinks dramatically. Slain enemies rise as vampires. Players must survive until the eclipse passes or destroy the Blood Altar.

### New Files Required
- `js/systems/light-source-system.js` - Light and darkness mechanics
- `js/systems/vampire-system.js` - Vampire conversion and infection
- `js/entities/blood-altar.js` - Destructible altar objective

### Files to Modify
- `js/systems/shift-system.js` - Add ECLIPSE scenario
- `js/systems/vision-system.js` - Dynamic visibility radius
- `js/systems/enemy-ai.js` - Vampire behavior variant
- `js/entities/enemy.js` - Vampire enemy type

### Shift Data

```javascript
'eclipse': {
    name: "Protocol: ECLIPSE",
    countdownTime: 600,
    survivalDuration: 180,      // 3 minutes to survive

    lore: {
        title: "The Blood Moon Rises",
        paragraphs: [
            "They say the vampire lord Malachar was slain here centuries ago, but death is merely an inconvenience for his kind. His curse lingers in the stones, waiting for the stars to align.",
            "When the eclipse begins, light itself flees from this place. Shadows grow teeth, and the dead remember their hunger. Those bitten do not stay themselves for long.",
            "The Blood Altar deep within still pulses with Malachar's essence. Destroy it to end the eclipse early—if you can find it in the dark. If you can survive long enough to try."
        ]
    },

    mechanics: {
        title: "The Endless Night",
        description: "Darkness consumes the dungeon. Slain enemies rise as vampires. Survive until dawn or destroy the Blood Altar.",
        details: [
            "Visibility radius shrinks dramatically",
            "Slain enemies rise as vampires after 5 seconds",
            "Fire damage prevents vampire resurrection",
            "Player can become infected (cure with Holy Water)",
            "Light sources create temporary safe zones",
            "Destroying the Blood Altar ends the eclipse early"
        ]
    },

    bonuses: [{
        name: "Blood Harvest",
        description: "Health potions drop 50% more often, attacks have 10% lifesteal",
        multiplier: 1.5,
        appliesTo: "potion_drops"
    }],

    winCondition: {
        title: "Survive or Purify",
        description: "Survive for 3 minutes until the eclipse passes, OR find and destroy the Blood Altar.",
        icon: "🌙"
    }
}
```

### Implementation Details

#### Vampire Conversion System

```javascript
const VampireSystem = {
    corpses: [],                // Pending resurrections
    resurrectionTime: 5000,     // 5 seconds

    /**
     * Called when an enemy dies during Eclipse
     */
    onEnemyDeath(enemy, killedBy) {
        // Fire damage prevents resurrection
        if (killedBy?.damageType === 'fire') {
            this.burnCorpse(enemy);
            return;
        }

        // Create corpse marker
        const corpse = {
            originalEnemy: enemy,
            x: enemy.gridX,
            y: enemy.gridY,
            timer: this.resurrectionTime,
            burned: false
        };

        this.corpses.push(corpse);

        // Visual: corpse on ground
        game.map[Math.floor(enemy.gridY)][Math.floor(enemy.gridX)].corpse = corpse;
    },

    /**
     * Prevent resurrection by burning corpse
     */
    burnCorpse(corpseOrEnemy) {
        // Remove from resurrection queue
        // Play burn effect
    },

    /**
     * Convert corpse to vampire
     */
    resurrectAsVampire(corpse) {
        const original = corpse.originalEnemy;

        const vampire = createEnemy({
            ...original,
            name: `Vampire ${original.name}`,
            isVampire: true,
            health: original.maxHp * 0.7,
            damage: original.damage * 1.3,
            moveSpeed: original.moveSpeed * 1.2,
            traits: ['lifesteal', 'light_weakness'],
            sprite: getVampireSprite(original.name)
        });

        vampire.gridX = corpse.x;
        vampire.gridY = corpse.y;

        game.enemies.push(vampire);
        AIManager.registerEnemy(vampire);

        // Remove corpse
        game.map[Math.floor(corpse.y)][Math.floor(corpse.x)].corpse = null;
    },

    update(dt) {
        for (let i = this.corpses.length - 1; i >= 0; i--) {
            const corpse = this.corpses[i];

            if (corpse.burned) {
                this.corpses.splice(i, 1);
                continue;
            }

            corpse.timer -= dt;

            if (corpse.timer <= 0) {
                this.resurrectAsVampire(corpse);
                this.corpses.splice(i, 1);
            }
        }
    }
};
```

#### Player Infection System

```javascript
const InfectionSystem = {
    infectionLevel: 0,          // 0-100
    infectionRate: 0.5,         // Per second when bitten
    stages: [
        { threshold: 0, effects: [] },
        {
            threshold: 30,
            effects: ['vision_tint_red'],
            message: "You feel a strange hunger..."
        },
        {
            threshold: 60,
            effects: ['bonus_damage', 'lifesteal_minor'],
            message: "The infection spreads. Your veins burn."
        },
        {
            threshold: 90,
            effects: ['light_hurts', 'lifesteal_major'],
            message: "You're losing yourself. Find a cure!"
        },
        {
            threshold: 100,
            effects: ['transform'],
            message: "The hunger consumes you completely."
        }
    ],

    onBitten() {
        // Start or accelerate infection
    },

    cure() {
        // Reset infection to 0
        this.infectionLevel = 0;
        addMessage("The holy water burns away the infection!");
    },

    update(dt) {
        // Progress infection if bitten recently
        // Apply stage effects
        // Check for full transformation (game over)
    },

    getCurrentStage() {
        for (let i = this.stages.length - 1; i >= 0; i--) {
            if (this.infectionLevel >= this.stages[i].threshold) {
                return this.stages[i];
            }
        }
        return this.stages[0];
    }
};
```

#### Blood Altar

```javascript
const BLOOD_ALTAR_CONFIG = {
    name: "Blood Altar",
    health: 200,
    size: { width: 2, height: 2 },

    // Spawns elite vampire guards when attacked
    guardsOnDamage: true,
    guardSpawnCooldown: 10000,

    // Healing aura for vampires
    healingRadius: 5,
    healingRate: 5,             // HP per second to nearby vampires

    onDestroy(game) {
        // End Eclipse immediately
        game.shiftState.altarDestroyed = true;
        game.shiftState.survivalTimer = 0;

        // Kill all vampires
        for (const enemy of game.enemies) {
            if (enemy.isVampire) {
                enemy.hp = 0;
                handleDeath(enemy, null);
            }
        }

        // Restore light
        LightSourceManager.setGlobalDarkness(0);

        addMessage("The Blood Altar shatters! Light returns to the dungeon!");

        // Spawn exit at altar location
        // ...
    }
};
```

#### Shift State

```javascript
shiftState: {
    darknessLevel: 0,           // 0-1, increases over time
    maxDarkness: 0.9,
    darknessRate: 0.01,         // Per second
    survivalTimer: 180,         // 3 minutes
    altarPosition: { x, y },
    altarDestroyed: false,
    vampireCorpses: [],
    playerInfection: 0
}
```

#### Win Conditions

```javascript
// Option 1: Survive
if (game.shiftState.survivalTimer <= 0 && !game.shiftState.altarDestroyed) {
    // Eclipse ends naturally
    endEclipse();
    spawnExitAtPlayer();
    addMessage("Dawn breaks. The eclipse has ended.");
}

// Option 2: Destroy altar
// Handled in Blood Altar onDestroy callback
```

---

## 2.4 Protocol: BREACH

**Status:** Planned

### Overview
A dimensional rift opens, spawning endless void creatures. Players must collect seal fragments scattered across the floor and deliver them to close the rift.

### New Files Required
- `js/systems/quest-item-system.js` - Seal fragment collection
- `js/systems/spawn-point-system.js` - Rift spawning
- `js/entities/void-creatures.js` - Void enemy variants

### Files to Modify
- `js/systems/shift-system.js` - Add BREACH scenario
- `js/ui/mini-map.js` - Seal fragment markers
- `js/ui/renderer.js` - Rift and corruption rendering

### Shift Data

```javascript
'breach': {
    name: "Protocol: BREACH",
    countdownTime: 600,

    lore: {
        title: "The Wound Between Worlds",
        paragraphs: [
            "Reality is not as solid as it seems. In places where great violence occurred, the barrier between dimensions grows thin. Here, it has finally torn.",
            "Through the rift pour creatures of the void—beings of pure entropy that exist only to unmake. They are drawn to warmth, to life, to everything this world possesses that theirs does not.",
            "The ancient seals that once held the barrier intact lie scattered, knocked loose by the breach. Gather them. Return them to the rift. It is the only way to mend what has been broken."
        ]
    },

    mechanics: {
        title: "The Endless Swarm",
        description: "A rift spawns endless void creatures. Collect the scattered seals and return them to close the breach.",
        details: [
            "The rift continuously spawns void creatures",
            "Spawn rate increases over time",
            "5 Seal Fragments are scattered across the floor",
            "Carrying seals slows you and attracts enemies",
            "Deliver all seals to the rift to close it",
            "Void corruption spreads from the rift"
        ]
    },

    bonuses: [{
        name: "Void Touch",
        description: "Attacks deal bonus void damage, 5% chance to banish enemies",
        multiplier: 1.2,
        appliesTo: "damage_dealt"
    }],

    winCondition: {
        title: "Seal the Breach",
        description: "Collect all 5 Seal Fragments and deliver them to the rift to close it forever.",
        icon: "🔮"
    }
}
```

### Implementation Details

#### Dimensional Rift

```javascript
const RIFT_CONFIG = {
    size: { width: 3, height: 3 },
    baseSpawnRate: 8000,        // 8 seconds between spawns
    minSpawnRate: 2000,         // Fastest spawn rate
    spawnAcceleration: 0.95,    // Multiplier per spawn

    spawnPool: [
        { type: 'void_wraith', weight: 40 },
        { type: 'void_crawler', weight: 35 },
        { type: 'void_stalker', weight: 20 },
        { type: 'void_horror', weight: 5 }
    ],

    maxActiveSpawns: 15,

    corruptionSpreadRate: 0.5,  // Tiles per second
    corruptionDamage: 3,        // Damage per second in corruption
};

const Rift = {
    x: 0,
    y: 0,
    active: true,
    spawnTimer: 0,
    currentSpawnRate: RIFT_CONFIG.baseSpawnRate,
    activeSpawns: [],
    sealsDelivered: 0,

    init(game) {
        // Place rift in a random room (not entrance)
        const rooms = game.rooms.filter(r => r.type !== 'entrance');
        const room = rooms[Math.floor(Math.random() * rooms.length)];

        this.x = room.floorX + Math.floor(room.floorWidth / 2);
        this.y = room.floorY + Math.floor(room.floorHeight / 2);

        // Mark rift tiles
        for (let dy = 0; dy < 3; dy++) {
            for (let dx = 0; dx < 3; dx++) {
                game.map[this.y + dy][this.x + dx] = {
                    type: 'rift',
                    riftCenter: dx === 1 && dy === 1
                };
            }
        }
    },

    update(dt) {
        if (!this.active) return;

        this.spawnTimer += dt;

        if (this.spawnTimer >= this.currentSpawnRate) {
            this.spawnTimer = 0;
            this.spawnVoidCreature();
            this.currentSpawnRate *= RIFT_CONFIG.spawnAcceleration;
            this.currentSpawnRate = Math.max(
                this.currentSpawnRate,
                RIFT_CONFIG.minSpawnRate
            );
        }

        // Spread corruption
        this.spreadCorruption(dt);
    },

    spawnVoidCreature() {
        if (this.activeSpawns.length >= RIFT_CONFIG.maxActiveSpawns) return;

        // Select random creature from pool
        const creature = weightedRandom(RIFT_CONFIG.spawnPool);

        // Spawn at rift edge
        const spawnPos = this.getSpawnPosition();
        const enemy = createVoidCreature(creature.type, spawnPos.x, spawnPos.y);

        game.enemies.push(enemy);
        AIManager.registerEnemy(enemy);
        this.activeSpawns.push(enemy);
    },

    deliverSeal() {
        this.sealsDelivered++;
        this.currentSpawnRate *= 1.3;  // Slow spawning with each seal

        addMessage(`Seal delivered! (${this.sealsDelivered}/5)`);

        if (this.sealsDelivered >= 5) {
            this.close();
        }
    },

    close() {
        this.active = false;

        // Kill all void creatures
        for (const enemy of this.activeSpawns) {
            if (enemy.hp > 0) {
                enemy.hp = 0;
                // Banish effect instead of death
            }
        }

        // Remove corruption
        DynamicTileSystem.revertAllOfType('corrupted');

        // Spawn exit where rift was
        game.map[this.y + 1][this.x + 1] = { type: 'exit', discovered: true };
        game.exitPosition = { x: this.x + 1, y: this.y + 1 };

        addMessage("The breach is sealed! Reality mends itself.");
    }
};
```

#### Seal Fragments

```javascript
const SealFragments = {
    fragments: [],
    totalFragments: 5,

    init(game) {
        // Place fragments in different rooms
        const rooms = [...game.rooms].sort(() => Math.random() - 0.5);

        for (let i = 0; i < this.totalFragments; i++) {
            const room = rooms[i % rooms.length];
            const pos = this.findValidPosition(room);

            const fragment = {
                id: `seal_${i}`,
                x: pos.x,
                y: pos.y,
                collected: false,
                delivered: false
            };

            this.fragments.push(fragment);

            // Mark on map
            game.map[pos.y][pos.x].sealFragment = fragment;
        }
    },

    collect(fragmentId) {
        const fragment = this.fragments.find(f => f.id === fragmentId);
        if (!fragment || fragment.collected) return;

        fragment.collected = true;
        game.player.carryingSeals = (game.player.carryingSeals || 0) + 1;

        // Apply carry penalties
        game.player.moveSpeedMod = 1 - (0.15 * game.player.carryingSeals);
        game.player.glowing = true;  // Enemies can see you easier

        addMessage(`Seal Fragment collected! (${this.getCollectedCount()}/${this.totalFragments})`);
    },

    deliverAll() {
        const carried = game.player.carryingSeals || 0;

        for (let i = 0; i < carried; i++) {
            Rift.deliverSeal();
        }

        game.player.carryingSeals = 0;
        game.player.moveSpeedMod = 1;
        game.player.glowing = false;
    },

    getCollectedCount() {
        return this.fragments.filter(f => f.collected).length;
    },

    getDeliveredCount() {
        return Rift.sealsDelivered;
    }
};
```

#### Void Creatures

```javascript
const VOID_CREATURES = {
    'void_wraith': {
        name: "Void Wraith",
        health: 30,
        damage: 12,
        moveSpeed: 4,
        behavior: 'aggressive',
        traits: ['phase_through'],  // Can briefly pass through walls
        sprite: 'void_wraith'
    },
    'void_crawler': {
        name: "Void Crawler",
        health: 20,
        damage: 8,
        moveSpeed: 5,
        behavior: 'swarm',
        traits: ['multiplies'],     // Splits on death
        sprite: 'void_crawler'
    },
    'void_stalker': {
        name: "Void Stalker",
        health: 50,
        damage: 20,
        moveSpeed: 3,
        behavior: 'ambush',
        traits: ['invisible_still'], // Invisible when not moving
        sprite: 'void_stalker'
    },
    'void_horror': {
        name: "Void Horror",
        health: 100,
        damage: 30,
        moveSpeed: 2,
        behavior: 'aggressive',
        traits: ['aura_corruption'],  // Spreads corruption while alive
        sprite: 'void_horror'
    }
};

function createVoidCreature(type, x, y) {
    const config = VOID_CREATURES[type];
    return createEnemy({
        ...config,
        gridX: x,
        gridY: y,
        isVoid: true,
        element: 'void',
        immunities: ['void'],
        weaknesses: ['holy']
    });
}
```

#### Shift State

```javascript
shiftState: {
    rift: Rift,
    sealFragments: SealFragments,
    corruptionRadius: 0,
    voidCreaturesKilled: 0
}
```

---

## 2.5 Protocol: RESONANCE

**Status:** Planned

### Overview
A spirit trapped in the dungeon knows a hidden exit through ever-shifting walls. Players must free the spirit and protect her as she guides them through the labyrinth.

### New Files Required
- `js/entities/npc.js` - NPC base system
- `js/entities/spirit-guide.js` - Spirit NPC specific logic
- `js/systems/wall-shift-system.js` - Dynamic wall movement

### Files to Modify
- `js/systems/shift-system.js` - Add RESONANCE scenario
- `js/systems/enemy-ai.js` - Target Spirit behavior
- `js/generation/map-generator.js` - Binding circle placement

### Shift Data

```javascript
'resonance': {
    name: "Protocol: RESONANCE",
    countdownTime: 600,

    lore: {
        title: "The Wandering Soul",
        paragraphs: [
            "She was a cartographer once, mapping these halls before they became a tomb. When the first shift came, she was caught between walls that should not have moved. Her body was crushed, but her spirit remains—bound to the very stones that killed her.",
            "The dungeon shifts around her memories. She remembers passages that no longer exist, doors that lead to places that have moved. To her, the walls are transparent echoes of what they once were.",
            "Free her from the binding circle, and she will guide you through the maze as she sees it. But she is fragile—a wisp of memory that the dungeon's guardians can sense and seek to extinguish."
        ]
    },

    mechanics: {
        title: "The Living Labyrinth",
        description: "Free the Spirit and follow her through shifting walls to find the hidden exit.",
        details: [
            "Find and interact with a Binding Circle to summon the Spirit",
            "The Spirit knows a path through walls you cannot see",
            "Protect the Spirit—enemies will target her",
            "Walls shift periodically, changing the layout",
            "If the Spirit dies, find another Binding Circle to resummon",
            "The hidden exit only reveals itself when the Spirit reaches it"
        ]
    },

    bonuses: [{
        name: "Spectral Sight",
        description: "Briefly see through walls, hidden treasures revealed on map",
        multiplier: 1.0,
        appliesTo: "special_vision"
    }],

    winCondition: {
        title: "Follow the Light",
        description: "Protect the Spirit as she guides you to the hidden exit. Keep her alive long enough to reveal the way out.",
        icon: "👻"
    }
}
```

### Implementation Details

#### Spirit Guide NPC

```javascript
const SpiritGuide = {
    // NPC properties
    id: 'spirit_guide',
    name: "The Cartographer's Spirit",
    gridX: 0,
    gridY: 0,

    // State
    state: 'bound',         // 'bound', 'following', 'guiding', 'dead'
    health: 50,
    maxHealth: 50,

    // Movement
    moveSpeed: 2,
    path: [],               // Pre-calculated path to exit
    pathIndex: 0,

    // Respawn
    respawnTimer: 0,
    respawnTime: 30000,     // 30 seconds to respawn
    deathCount: 0,

    init(game) {
        // Calculate path from binding circle to hidden exit
        this.calculatePath(game);
    },

    calculatePath(game) {
        // Path can go through walls (spirit can phase)
        // Use modified A* that ignores walls
        // Path should be reasonably long and interesting
    },

    summon(bindingCircle) {
        this.state = 'guiding';
        this.gridX = bindingCircle.x;
        this.gridY = bindingCircle.y;
        this.health = this.maxHealth;
        this.pathIndex = this.findNearestPathIndex();

        addMessage("The Spirit awakens. 'Follow me... I remember the way.'");
    },

    update(dt, game) {
        if (this.state === 'dead') {
            this.respawnTimer -= dt;
            if (this.respawnTimer <= 0) {
                // Can be resummoned at any binding circle
            }
            return;
        }

        if (this.state === 'guiding') {
            this.moveAlongPath(dt);
            this.checkArrival();
        }
    },

    moveAlongPath(dt) {
        if (this.pathIndex >= this.path.length) return;

        const target = this.path[this.pathIndex];
        const dx = target.x - this.gridX;
        const dy = target.y - this.gridY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 0.1) {
            this.pathIndex++;
            this.revealTile(target.x, target.y);
        } else {
            const speed = this.moveSpeed * dt / 1000;
            this.gridX += (dx / dist) * speed;
            this.gridY += (dy / dist) * speed;
        }
    },

    revealTile(x, y) {
        // Make wall passable if spirit passes through
        const tile = game.map[y]?.[x];
        if (tile?.type === 'wall') {
            tile.spiritRevealed = true;
            tile.passable = true;
            // Visual: ghostly passage effect
        }
    },

    takeDamage(amount, source) {
        this.health -= amount;

        if (this.health <= 0) {
            this.die();
        }
    },

    die() {
        this.state = 'dead';
        this.respawnTimer = this.respawnTime;
        this.deathCount++;

        // Close any spirit-revealed passages
        this.closeRevealedPassages();

        addMessage("The Spirit fades... Find another Binding Circle to call her back.");
    },

    checkArrival() {
        if (this.pathIndex >= this.path.length) {
            // Spirit reached the exit location
            this.revealHiddenExit();
        }
    },

    revealHiddenExit() {
        const exitPos = this.path[this.path.length - 1];
        game.map[exitPos.y][exitPos.x] = { type: 'exit', discovered: true };
        game.exitPosition = exitPos;

        this.state = 'waiting';
        addMessage("'Here... the way out. Go now, while the walls remember.'");
    }
};
```

#### Wall Shift System

```javascript
const WallShiftSystem = {
    shiftTimer: 0,
    shiftInterval: 25000,       // 25 seconds between shifts
    shiftWarningTime: 5000,     // 5 second warning
    isWarning: false,

    // Walls that can shift
    shiftableWalls: [],
    // Current configuration
    currentConfig: 0,

    init(game) {
        // Identify walls that can shift
        // Create multiple configurations
        this.generateConfigurations(game);
    },

    generateConfigurations(game) {
        // Create 3-4 different wall layouts
        // Spirit's path accounts for all configurations
    },

    update(dt) {
        this.shiftTimer += dt;

        // Warning phase
        if (this.shiftTimer >= this.shiftInterval - this.shiftWarningTime && !this.isWarning) {
            this.isWarning = true;
            addMessage("The walls begin to groan...");
            // Visual: walls start shaking
        }

        // Shift phase
        if (this.shiftTimer >= this.shiftInterval) {
            this.shiftTimer = 0;
            this.isWarning = false;
            this.performShift();
        }
    },

    performShift() {
        this.currentConfig = (this.currentConfig + 1) % this.configurations.length;

        const newConfig = this.configurations[this.currentConfig];

        for (const wall of this.shiftableWalls) {
            const shouldBeWall = newConfig.walls.includes(wall.id);
            const tile = game.map[wall.y][wall.x];

            // Animate the transition
            if (shouldBeWall && tile.type !== 'wall') {
                // Check if player is in the way
                if (game.player.gridX === wall.x && game.player.gridY === wall.y) {
                    // Push player to nearest safe tile
                    this.pushEntity(game.player, wall);
                }
                tile.type = 'wall';
            } else if (!shouldBeWall && tile.type === 'wall') {
                tile.type = 'floor';
            }
        }

        addMessage("The labyrinth shifts!");
    },

    pushEntity(entity, wall) {
        // Find nearest floor tile and move entity there
        const safeTile = this.findNearestFloor(wall.x, wall.y);
        entity.gridX = safeTile.x;
        entity.gridY = safeTile.y;
    }
};
```

#### Binding Circles

```javascript
const BindingCircles = {
    circles: [],

    init(game) {
        // Place 3 binding circles in different rooms
        const rooms = game.rooms.filter(r => r.type !== 'entrance');
        const selectedRooms = this.selectDistantRooms(rooms, 3);

        for (const room of selectedRooms) {
            const pos = this.findCenterPosition(room);

            this.circles.push({
                x: pos.x,
                y: pos.y,
                active: true,
                used: false
            });

            // Mark on map
            game.map[pos.y][pos.x].bindingCircle = true;
        }
    },

    interact(circleIndex) {
        const circle = this.circles[circleIndex];

        if (SpiritGuide.state === 'bound' || SpiritGuide.state === 'dead') {
            SpiritGuide.summon(circle);
            circle.used = true;
        }
    },

    getNearPlayer(range) {
        // Return binding circle if player is within interaction range
    }
};
```

#### Shift State

```javascript
shiftState: {
    spirit: SpiritGuide,
    bindingCircles: BindingCircles,
    wallShiftSystem: WallShiftSystem,
    hiddenExitRevealed: false,
    spiritDeaths: 0
}
```

---

## 2.6 Protocol: FROSTBITE

**Status:** Planned

### Overview
Temperature plummets as ice spreads from the dungeon edges. Players must manage a warmth meter while finding heat sources and racing to the thermal vent exit.

### New Files Required
- `js/systems/environmental-meter-system.js` - Warmth meter
- `js/systems/heat-source-system.js` - Braziers and heat management

### Files to Modify
- `js/systems/shift-system.js` - Add FROSTBITE scenario
- `js/systems/enemy-ai.js` - Frozen enemy state
- `js/ui/renderer.js` - Ice tiles, warmth meter UI

### Shift Data

```javascript
'frostbite': {
    name: "Protocol: FROSTBITE",
    countdownTime: 600,

    lore: {
        title: "The Breath of the Chasm",
        paragraphs: [
            "The Chasm breathes. Its exhale brings warmth from the molten depths below. Its inhale draws that warmth away, leaving only a cold so profound it freezes the soul itself.",
            "The old miners called it the Long Breath—a cycle that takes hours to complete. They learned to read the signs: frost forming on warm stone, breath misting in once-sweltering tunnels, the growing silence as even fire struggles to survive.",
            "The thermal vents are the only refuge. Where the Chasm exhales, warmth gathers. Find one before the cold claims you, or become another frozen statue in these halls."
        ]
    },

    mechanics: {
        title: "The Killing Cold",
        description: "Temperature drops as ice spreads inward. Manage your warmth and reach the thermal vent before freezing.",
        details: [
            "Warmth meter depletes over time",
            "Ice spreads inward from edges (similar to lava)",
            "Standing on ice drains warmth faster",
            "Braziers restore warmth but have limited fuel",
            "At zero warmth: take damage and move slower",
            "Some enemies freeze solid (easy kills, bonus loot)"
        ]
    },

    bonuses: [{
        name: "Frozen Assets",
        description: "Frozen enemies drop double loot, cold resistance gear drops more often",
        multiplier: 2.0,
        appliesTo: "frozen_enemy_loot"
    }],

    winCondition: {
        title: "Reach the Warmth",
        description: "Find and reach the thermal vent exit before the cold claims you.",
        icon: "🔥"
    }
}
```

### Implementation Details

#### Warmth System

```javascript
const WarmthSystem = {
    current: 100,
    max: 100,

    // Drain rates (per second)
    baseDrainRate: 2,
    iceDrainRate: 5,            // Additional drain on ice
    currentDrainRate: 2,

    // Thresholds
    thresholds: [
        { value: 70, effect: null, message: null },
        {
            value: 50,
            effect: 'breath_visible',
            message: "Your breath mists in the cold air."
        },
        {
            value: 30,
            effect: 'move_slow_10',
            message: "The cold seeps into your bones. Movement slowing."
        },
        {
            value: 15,
            effect: 'move_slow_25',
            message: "Hypothermia setting in. Find warmth!"
        },
        {
            value: 0,
            effect: 'freezing_dot',
            message: "You're freezing to death!"
        }
    ],

    // Heat sources
    nearHeatSource: false,
    heatSourceBonus: 0,

    update(dt) {
        // Calculate current drain/regen
        let drain = this.baseDrainRate;

        // Check if on ice
        const playerTile = game.map[Math.floor(game.player.gridY)]?.[Math.floor(game.player.gridX)];
        if (playerTile?.type === 'frozen_floor') {
            drain += this.iceDrainRate;
        }

        // Check heat sources
        this.nearHeatSource = HeatSourceSystem.isNearHeatSource(
            game.player.gridX,
            game.player.gridY
        );

        if (this.nearHeatSource) {
            this.heatSourceBonus = HeatSourceSystem.getWarmthBonus(
                game.player.gridX,
                game.player.gridY
            );
            drain -= this.heatSourceBonus;
        }

        this.currentDrainRate = drain;

        // Apply drain/regen
        this.current -= drain * (dt / 1000);
        this.current = Math.max(0, Math.min(this.max, this.current));

        // Check thresholds
        this.applyThresholdEffects();

        // Freezing damage
        if (this.current <= 0) {
            game.player.hp -= 5 * (dt / 1000);
            if (game.player.hp <= 0) {
                game.state = 'gameover';
            }
        }
    },

    applyThresholdEffects() {
        const currentThreshold = this.getCurrentThreshold();

        // Apply movement slow
        if (currentThreshold.effect === 'move_slow_10') {
            game.player.moveSpeedMod = 0.9;
        } else if (currentThreshold.effect === 'move_slow_25') {
            game.player.moveSpeedMod = 0.75;
        } else if (currentThreshold.effect === 'freezing_dot') {
            game.player.moveSpeedMod = 0.5;
        } else {
            game.player.moveSpeedMod = 1.0;
        }
    },

    getCurrentThreshold() {
        for (let i = this.thresholds.length - 1; i >= 0; i--) {
            if (this.current <= this.thresholds[i].value) {
                return this.thresholds[i];
            }
        }
        return this.thresholds[0];
    },

    addWarmth(amount) {
        this.current = Math.min(this.max, this.current + amount);
    }
};
```

#### Heat Source System

```javascript
const HeatSourceSystem = {
    sources: [],

    init(game) {
        // Place braziers throughout dungeon
        for (const room of game.rooms) {
            if (room.type === 'entrance') continue;

            const numBraziers = Math.floor(Math.random() * 2) + 1;
            for (let i = 0; i < numBraziers; i++) {
                const pos = this.findValidPosition(room);
                this.createBrazier(pos.x, pos.y, room);
            }
        }

        // Place thermal vent exit in a distant room
        this.placeThermalVent(game);
    },

    createBrazier(x, y, room) {
        const brazier = {
            id: `brazier_${this.sources.length}`,
            x: x,
            y: y,
            type: 'brazier',

            // Heat properties
            radius: 3,
            warmthBonus: 8,     // Warmth restored per second when near

            // Fuel
            fuel: 60,           // 60 seconds of fuel
            maxFuel: 60,
            burning: true,

            // Can be relit with fire spells/items
            canRelight: true
        };

        this.sources.push(brazier);
        game.map[y][x].heatSource = brazier;
    },

    placeThermalVent(game) {
        // Find room farthest from entrance
        const entrance = game.rooms[0];
        let farthestRoom = game.rooms[1];
        let maxDist = 0;

        for (const room of game.rooms) {
            if (room === entrance) continue;
            const dist = Math.abs(room.x - entrance.x) + Math.abs(room.y - entrance.y);
            if (dist > maxDist) {
                maxDist = dist;
                farthestRoom = room;
            }
        }

        const x = farthestRoom.floorX + Math.floor(farthestRoom.floorWidth / 2);
        const y = farthestRoom.floorY + Math.floor(farthestRoom.floorHeight / 2);

        const thermalVent = {
            id: 'thermal_vent',
            x: x,
            y: y,
            type: 'thermal_vent',
            radius: 5,
            warmthBonus: 15,
            fuel: Infinity,
            burning: true,
            isExit: true
        };

        this.sources.push(thermalVent);
        game.map[y][x] = { type: 'exit', heatSource: thermalVent, discovered: false };
        game.exitPosition = { x, y };
    },

    isNearHeatSource(x, y) {
        return this.sources.some(source => {
            if (!source.burning) return false;
            const dist = Math.sqrt((source.x - x) ** 2 + (source.y - y) ** 2);
            return dist <= source.radius;
        });
    },

    getWarmthBonus(x, y) {
        let bonus = 0;

        for (const source of this.sources) {
            if (!source.burning) continue;

            const dist = Math.sqrt((source.x - x) ** 2 + (source.y - y) ** 2);
            if (dist <= source.radius) {
                // Bonus decreases with distance
                const factor = 1 - (dist / source.radius);
                bonus += source.warmthBonus * factor;
            }
        }

        return bonus;
    },

    update(dt) {
        for (const source of this.sources) {
            if (!source.burning || source.fuel === Infinity) continue;

            // Consume fuel only when player is nearby
            if (this.isPlayerNear(source)) {
                source.fuel -= dt / 1000;

                if (source.fuel <= 0) {
                    source.burning = false;
                    source.fuel = 0;
                    addMessage("A brazier burns out...");
                }
            }
        }
    },

    isPlayerNear(source) {
        const dist = Math.sqrt(
            (source.x - game.player.gridX) ** 2 +
            (source.y - game.player.gridY) ** 2
        );
        return dist <= source.radius;
    },

    relightBrazier(brazierId) {
        const brazier = this.sources.find(s => s.id === brazierId);
        if (brazier && brazier.canRelight && !brazier.burning) {
            brazier.burning = true;
            brazier.fuel = brazier.maxFuel * 0.5;  // Relit braziers have less fuel
            addMessage("You relight the brazier.");
        }
    }
};
```

#### Ice Spread System

```javascript
const IceSpreadSystem = {
    currentRadius: 200,         // Start at map edge
    spreadRate: 1.5,            // Tiles per second
    centerX: 0,
    centerY: 0,

    init(game) {
        // Center on thermal vent
        this.centerX = game.exitPosition.x;
        this.centerY = game.exitPosition.y;

        // Calculate starting radius (distance to farthest corner)
        const corners = [
            { x: 0, y: 0 },
            { x: GRID_WIDTH, y: 0 },
            { x: 0, y: GRID_HEIGHT },
            { x: GRID_WIDTH, y: GRID_HEIGHT }
        ];

        this.currentRadius = 0;
        for (const corner of corners) {
            const dist = Math.sqrt(
                (corner.x - this.centerX) ** 2 +
                (corner.y - this.centerY) ** 2
            );
            if (dist > this.currentRadius) {
                this.currentRadius = dist;
            }
        }
    },

    update(dt) {
        this.currentRadius -= this.spreadRate * (dt / 1000);

        if (this.currentRadius <= 0) {
            // Everything frozen
            return;
        }

        // Convert tiles outside radius to ice
        const rSq = this.currentRadius ** 2;

        for (let y = 0; y < GRID_HEIGHT; y++) {
            for (let x = 0; x < GRID_WIDTH; x++) {
                const distSq = (x - this.centerX) ** 2 + (y - this.centerY) ** 2;

                if (distSq > rSq) {
                    const tile = game.map[y][x];

                    if (tile.type === 'floor' || tile.type === 'doorway') {
                        tile.type = 'frozen_floor';
                        tile.previousType = 'floor';
                    }
                }
            }
        }

        // Freeze enemies caught in ice
        this.checkEnemyFreezing();
    },

    checkEnemyFreezing() {
        const rSq = this.currentRadius ** 2;

        for (const enemy of game.enemies) {
            if (enemy.frozen) continue;

            const distSq = (enemy.gridX - this.centerX) ** 2 +
                          (enemy.gridY - this.centerY) ** 2;

            if (distSq > rSq) {
                // Check if enemy is cold-resistant
                if (enemy.element === 'ice' || enemy.immunities?.includes('cold')) {
                    continue;
                }

                this.freezeEnemy(enemy);
            }
        }
    },

    freezeEnemy(enemy) {
        enemy.frozen = true;
        enemy.frozenTimer = 30000;  // 30 seconds before thawing
        enemy.ai?.pause();

        // Frozen enemies take 3x damage and drop double loot
        enemy.damageMod = 3.0;
        enemy.lootMod = 2.0;
    }
};
```

#### Warmth Meter UI

```javascript
function renderWarmthMeter(ctx) {
    if (!game.shiftActive || game.activeShift?.name !== "Protocol: FROSTBITE") {
        return;
    }

    const warmth = WarmthSystem.current;
    const max = WarmthSystem.max;
    const pct = warmth / max;

    // Position below HP/MP bars in tracker
    const x = 80;
    const y = 400;  // Adjust based on tracker layout
    const width = TRACKER_WIDTH - 160;
    const height = 15;

    // Background
    ctx.fillStyle = '#333';
    ctx.fillRect(x, y, width, height);

    // Warmth bar (blue when cold, orange when warm)
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, '#3498db');
    gradient.addColorStop(1, '#e74c3c');

    ctx.fillStyle = pct > 0.5 ? '#f39c12' : pct > 0.25 ? '#3498db' : '#9b59b6';
    ctx.fillRect(x, y, width * pct, height);

    // Border
    ctx.strokeStyle = '#fff';
    ctx.strokeRect(x, y, width, height);

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`Warmth: ${Math.floor(warmth)}/${max}`, x, y - 5);

    // Heat source indicator
    if (WarmthSystem.nearHeatSource) {
        ctx.fillStyle = '#f39c12';
        ctx.fillText('🔥 Near heat source', x, y + height + 15);
    }
}
```

#### Shift State

```javascript
shiftState: {
    warmthSystem: WarmthSystem,
    heatSources: HeatSourceSystem,
    iceSpread: IceSpreadSystem,
    frozenEnemies: [],
    thermalVentPosition: { x, y }
}
```

---

# Part 3: Testing & Quality Assurance

## 3.1 Debug Commands

Add these debug commands for testing shifts:

```javascript
// In debug-commands.js

debug.triggerShift = function(shiftId) {
    game.shiftCountdown = 0;
    if (shiftId) {
        triggerShift(shiftId);
    }
};

debug.setCountdown = function(seconds) {
    game.shiftCountdown = seconds;
};

debug.endShift = function() {
    game.shiftActive = false;
    game.activeShift = null;
    game.shiftState = null;
};

debug.spawnBoss = function(bossType) {
    // Spawn specific boss for testing
};

debug.setWarmth = function(value) {
    WarmthSystem.current = value;
};

debug.collectAllSeals = function() {
    SealFragments.fragments.forEach(f => f.collected = true);
    game.player.carryingSeals = 5;
};
```

## 3.2 Test Scenarios

For each shift, test:

1. **Normal Flow:** Countdown → Shift triggers → Win condition met
2. **Failure States:** Player death during shift, fail condition
3. **Edge Cases:**
   - Shift triggers while in menu/inventory
   - Player at exit when shift triggers
   - Multiple enemies die simultaneously (ECLIPSE)
   - All heat sources exhausted (FROSTBITE)
4. **Performance:** Many entities, particle effects, tile conversions

---

# Part 4: Future Considerations

## 4.1 Potential Additional Shifts

- **Protocol: INFESTATION** - Spreading corruption from infected enemies
- **Protocol: OVERLOAD** - Magical instability, random spell effects
- **Protocol: FLOOD** - Rising water levels, swimming mechanics
- **Protocol: SANDSTORM** - Visibility reduction, terrain changing

## 4.2 Shift Modifiers

Consider adding modifiers that can stack with any shift:

- **Hardcore:** No respawn, permadeath
- **Speedrun:** Reduced countdown time
- **Nightmare:** Increased enemy stats during shift
- **Treasure Hunt:** Extra loot spawns but more enemies

## 4.3 Floor Theming

Shifts could be tied to floor themes:
- Fire floors → MELTDOWN
- Crypt floors → ECLIPSE
- Vault floors → LOCKDOWN
- Void floors → BREACH
- Ice floors → FROSTBITE
- Maze floors → RESONANCE

---

# Appendix A: File Structure

```
js/
├── systems/
│   ├── shift-system.js           # Core shift logic (existing)
│   ├── shift-bonus-system.js     # Generic bonus application
│   ├── dynamic-tile-system.js    # Tile state changes
│   ├── quest-item-system.js      # Collectible objectives
│   ├── environmental-meter-system.js  # Warmth, infection, etc.
│   ├── light-source-system.js    # Dynamic lighting
│   ├── spawn-point-system.js     # Continuous spawning
│   ├── trap-system.js            # Trap mechanics
│   ├── door-lock-system.js       # Door state management
│   ├── wall-shift-system.js      # Dynamic walls
│   ├── vampire-system.js         # Vampire conversion
│   └── heat-source-system.js     # Braziers and warmth
├── entities/
│   ├── npc.js                    # NPC base class
│   ├── spirit-guide.js           # RESONANCE spirit
│   ├── boss.js                   # Boss base class
│   ├── warden-boss.js            # LOCKDOWN boss
│   ├── blood-altar.js            # ECLIPSE objective
│   └── void-creatures.js         # BREACH enemies
└── ui/
    ├── shift-overlay.js          # Shift info panel (existing)
    └── environmental-meters-ui.js # Warmth/infection bars
```

---

# Appendix B: Constants Reference

```javascript
// Suggested constants for shift-constants.js

const SHIFT_CONSTANTS = {
    DEFAULT_COUNTDOWN: 600,         // 10 minutes

    MELTDOWN: {
        LAVA_DURATION: 90,
        LAVA_DAMAGE: 20,
        EPIC_MULTIPLIER: 2.0
    },

    LOCKDOWN: {
        WARDEN_BASE_HEALTH: 500,
        WARDEN_HEALTH_PER_FLOOR: 100,
        DOOR_PATTERN_DURATION: 20000,
        TRAP_REARM_TIME: 3000
    },

    ECLIPSE: {
        SURVIVAL_TIME: 180,
        RESURRECTION_TIME: 5000,
        MAX_INFECTION: 100,
        INFECTION_RATE: 0.5
    },

    BREACH: {
        SEAL_COUNT: 5,
        BASE_SPAWN_RATE: 8000,
        MIN_SPAWN_RATE: 2000,
        MAX_ACTIVE_SPAWNS: 15
    },

    RESONANCE: {
        SPIRIT_HEALTH: 50,
        SPIRIT_RESPAWN_TIME: 30000,
        WALL_SHIFT_INTERVAL: 25000,
        BINDING_CIRCLE_COUNT: 3
    },

    FROSTBITE: {
        MAX_WARMTH: 100,
        BASE_DRAIN_RATE: 2,
        ICE_DRAIN_RATE: 5,
        BRAZIER_FUEL: 60,
        FREEZE_DAMAGE_MULTIPLIER: 3.0
    }
};
```

---

*Document Version: 1.0*
*Last Updated: December 2024*
*Author: Development Team*
