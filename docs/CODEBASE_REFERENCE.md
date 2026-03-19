# The Shifting Chasm - Codebase Reference Guide

A high-level reference for navigating the project. Each section describes what a folder or file contains and when you'd look there.

---

## Root Directory

| File | Description |
|------|-------------|
| `index.html` | Main entry point. Loads all ~120 script tags in dependency order and sets up the canvas element. Start here to see load order or add/remove scripts. |
| `debug-commands.js` | Console utilities for testing. Spawn enemies/items, teleport, toggle systems, profile performance. Run functions from the browser console during play. |
| `game_env.py` | Python wrapper that exposes the game as a Gym-style environment for reinforcement learning training. |
| `train.py` | RL training script using Stable Baselines PPO. Pairs with `game_env.py`. |
| `monster_spritesheet_viewer.html` | Standalone HTML tool for previewing monster sprite sheets and their animation frames. |
| `tileset_viewer.html` | Standalone HTML tool for previewing tile artwork from the walls/floors sprite sheet. |
| `MAP_GENERATION_ANALYSIS.md` | Output from the map generation analyzer with statistics on chamber sizes, wall density, dead ends, etc. |

---

## css/

| File | Description |
|------|-------------|
| `style.css` | Single stylesheet. Sets the canvas to fixed fullscreen, hides overflow, black background. Minimal - all game UI is rendered via Canvas, not DOM. |

---

## js/core/ — Game Loop & State Management

The backbone of the application. Look here for how the game starts, how frames are processed, and how data persists.

| File | Description |
|------|-------------|
| `main.js` | Master game loop via `requestAnimationFrame`. Routes updates based on game state (`playing`, `village`, `menu`, `gameover`, `victory`). Tracks performance (flags slow frames >50ms) and triggers auto-save every 30 seconds. |
| `game-state.js` | Global state container. Defines the `game` object (current session: player, enemies, map, UI flags), `persistentState` (permanent progression: bank, stats, skills, quests), and `sessionState` (current run: active flag, floor data). |
| `system-manager.js` | Orchestration framework. All game systems register here with a priority number. Lower priority = runs earlier each frame. Handles init sequencing, update loops, and error diagnostics. |
| `constants.js` | Global configuration values. Grid size (200x200), tile size (16px), zoom (3.25x), movement speeds, noise ranges, vision distances, combat timings. The first place to look when tweaking numbers. |
| `game-init.js` | Startup sequence. Initializes all systems in order, loads persistent data from storage, creates the player, generates the first map, and spawns enemies. |
| `save-manager.js` | Persistence layer using `localStorage`. Handles auto-save, manual save/load slots, and session state checkpoints. |
| `session-manager.js` | Run lifecycle manager. Tracks floor progression, manages run start/end events, and handles death vs. extraction outcomes. |

---

## js/entities/ — Game Objects

Factories and logic for the main interactable objects in the game.

| File | Description |
|------|-------------|
| `player.js` | Player character factory (`createPlayer()`). Defines stats (STR/AGI/INT/STA at base 10), resources (HP, stamina, MP), equipment slots (6), inventory (15 slots), attack speed, skills, and boons. Contains methods for movement, attacking, equipping, and consuming items. |
| `enemy.js` | Enemy utility functions. Vision calculation (range-based with torch stealth modifiers), line-of-sight checks, hearing/noise perception, and vision cone facing detection. |
| `boss.js` | Standard boss template. Extended enemy with phase mechanics, dialogue, and boss-specific loot tables. |
| `core-boss.js` | The Primordial (final boss). 3-phase battle in a 40x40 void arena. 5000 HP base, abilities include void_pulse, shadow_tendrils, and summon_echoes. |
| `malphas-boss.js` | Mini-boss template for floor-specific encounters. Drops rare extraction materials. |
| `npc.js` | Non-player characters for the village hub. Dialogue trees, quest interactions, and lore delivery. |
| `extraction-point.js` | Extraction portal entity. State machine: open -> warning -> collapsing -> collapsed. Timing-based triggers for the survival mechanic. |
| `equipment-loader.js` | Loads gear from data definitions, applies stat bonuses to entities, and manages durability/degradation values. |

---

## js/systems/ — Game Mechanics

All gameplay systems, registered with SystemManager by priority. This is where the bulk of game logic lives.

### Input & Animation (Priority 10-25)

| File | Priority | Description |
|------|----------|-------------|
| `input-handler.js` | 10 | Keyboard/mouse capture. Queues commands for the current frame. Handles WASD movement, hotkeys (1-4), Tab targeting, mouse clicks. |
| `player-animation.js` | 25 | Cycles player sprite frames based on movement direction and state (idle vs walking). 4-directional support. |

### Environment (Priority 30-38)

| File | Priority | Description |
|------|----------|-------------|
| `noise-system.js` | 30 | Tracks noise events (footsteps, combat, abilities) and propagates them to nearby enemies. Noise alerts enemies within hearing range. |
| `hazard-system.js` | 35 | Environmental damage sources: lava tiles, traps, area denial. Applies damage when entities stand on hazard tiles. |
| `dynamic-tile-system.js` | 36 | Handles floor tiles that change during gameplay — shifting terrain, collapsing passages, tile property mutations. |
| `environmental-meter-system.js` | 37 | Tracks environmental status effects on the player: heat, pressure, exposure. Used in themed dungeon floors. |
| `spawn-point-system.js` | 38 | Manages enemy respawn locations and timers. Controls how and when new enemies appear on the current floor. |
| `light-source-system.js` | 4 | Light propagation from torches, campfires, and braziers. Calculates vision radius and affects enemy detection ranges. |

### AI & Social (Priority 40-43)

| File | Priority | Description |
|------|----------|-------------|
| `enemy-ai.js` | 40 | Core AI state machine with 18 states (idle, wandering, alert, chasing, combat, searching, returning, circling, defensive, skirmishing, panicked, enraged, windup, etc.). Decision logic runs every 200ms. Handles perception, aggro, retreat, and territory. |
| `advanced-enemy-system.js` | 41 | Extended AI behaviors for elite and special enemies. Adds complexity beyond the base state machine. |
| `monster-social-system.js` | 42 | Pack coordination. Shout alerts (30-tile radius), morale/courage mechanics (+1 per nearby ally), elite sacrifice (consume minion for 25% heal + 20% damage buff), retreat hierarchy. |
| `monster-animation-system.js` | 43 | Monster sprite animation cycling. Handles frame updates, directional facing, and attack/death animation sequences. |
| `enemy-ability-system.js` | 38 | Enemy special abilities (spells, charges, area attacks). Manages cooldowns, targeting, and ability execution. |

### Combat (Priority 50-56)

| File | Priority | Description |
|------|----------|-------------|
| `combat-master.js` | 50 | **Unified combat system** (consolidated from multiple files). 2-layer damage formula, status effects, projectiles, ambush detection (1.5x + guaranteed crit), knockback, screen shake, dash with i-frames, hotkey combat, Tab targeting. The main file for all combat logic. |
| `combat-effect-system.js` | 51 | Triggers visual effects on combat events — hit sparks, critical flashes, death animations, damage numbers. |
| `combat-system.js` | — | Legacy combat system. Functionality consolidated into `combat-master.js`. |
| `active-combat.js` | — | Legacy active combat logic. Consolidated into `combat-master.js`. |
| `combat-enhancements.js` | — | Legacy combat extras (dash, screen shake). Consolidated into `combat-master.js`. |
| `mouse-attack-system.js` | — | Legacy mouse-based attack system. Consolidated into `combat-master.js`. |
| `projectile-system.js` | — | Legacy projectile logic. Consolidated into `combat-master.js`. |
| `status-effect-system.js` | — | Legacy status effects. Consolidated into `combat-master.js`. |
| `skills-combat-integration.js` | — | Legacy skill-combat bridge. Consolidated into `combat-master.js`. |
| `boon-combat-integration.js` | — | Legacy boon-combat bridge. Consolidated into `combat-master.js`. |

### Progression (Priority 60-70)

| File | Priority | Description |
|------|----------|-------------|
| `skill-system.js` | 60 | Soul & Body skill progression. 5 proficiencies (Melee, Ranged, Magic, Defense, Vitality) with 4 specializations each. Permanent XP tracking, +2% damage per level, unlocks at 25/50/75/100. |
| `boon-system.js` | 61 | The Echoes (shrine boons). 70 boons across 7 Ancestors (Torchbearer, Headsman, Lurker, Storm-Caller, Rot-Weaver, Iron-Warden, Maniac). Tiers: Core (21), Resonance (42), Legendary (7). Session-only, lost on death. Max 8 held. |
| `inventory-system.js` | 65 | Inventory slot management. 15-slot bag, item stacking for consumables/materials, equip/unequip flow, drop-on-death logic. |
| `quest-item-system.js` | 66 | Quest item tracking. Manages special items tied to quest progression, prevents accidental discard. |
| `loot-system.js` | 70 | Drop generation on enemy kill. 8% base equipment chance, monster-specific loot tables (25% chance), rarity rolls, ground pile rendering, 60-second despawn timer. |

### Session Mechanics (Priority 75-95)

| File | Priority | Description |
|------|----------|-------------|
| `extraction-system.js` | 75 | Extraction point management. Spawns 4 portals per floor, schedules collapse at 40%/65%/83%/92% of floor time, 20-second warnings. |
| `shift-system.js` | 80 | Protocol: MELTDOWN. 10-minute countdown, lava encroaches from edges (90s phase), 20 HP/tick on lava, exit spawns in farthest room. |
| `shift-bonus-system.js` | 5 | Bonuses active during shift events — 2x epic equipment drop rate. |
| `quest-system.js` | 85 | Quest tracking and completion. Manages active quests, objectives, rewards, and turn-in logic. |
| `crafting-system.js` | 88 | Recipe-based crafting. Consumes materials from inventory, produces equipment or consumables per recipe definitions. |
| `core-system.js` | 95 | Final boss (The Primordial) arena management. Phase transitions, arena effects, victory conditions. |

### Utility & Support Systems

| File | Priority | Description |
|------|----------|-------------|
| `vision-system.js` | 5 | Fog of war. Tracks explored tiles, calculates visible area based on light sources and player vision radius. |
| `movement-master.js` | — | **Unified movement system** (consolidated from multiple files). Sub-tile collision (0.125 precision), A* pathfinding, velocity-based acceleration/friction, soft collision separation, corner nudge, diagonal normalization. |
| `pokemon-movement.js` | — | Legacy movement logic. Consolidated into `movement-master.js`. |
| `village-system.js` | — | Village hub state management. Tracks NPC positions, shop inventories, and village-specific interactions. |
| `banking-system.js` | — | Persistent storage between runs. Deposit/withdraw gold and items that survive death. |
| `loadout-system.js` | — | Pre-run gear selection from banked items. Choose equipment before entering the dungeon. |
| `shortcut-system.js` | — | Unlocked floor shortcuts. Skip previously cleared floors on subsequent runs. |
| `degradation-system.js` | — | Floor difficulty scaling. Enemies and hazards intensify the longer you stay on a floor. |
| `rescue-system.js` | — | Death drop recovery. Return to your death location on a new run to recover lost items. |
| `survival-integration.js` | 1 | Integration layer connecting extraction, shift, and degradation systems into a cohesive survival loop. |
| `world-state-system.js` | — | Narrative progression tracking. Flags for story beats, world events, and lore state. |

---

## js/data/ — Static Definitions

Pure data files. No logic — just object/array definitions consumed by systems. Look here to add or modify game content.

### Equipment

| File | Description |
|------|-------------|
| `weapons-melee.js` | Melee weapon definitions: swords, axes, maces, knives, staffs, polearms. Base damage, attack speed, range, knockback, weapon arc. |
| `weapons-ranged.js` | Ranged weapon definitions: bows, crossbows, throwing weapons. Projectile speed, range, ammo type. |
| `weapons-magic.js` | Magic weapon definitions: wands, staves, tomes. Mana cost, element, cast time, effect radius. |
| `weapon-types.js` | Weapon type enum/constants. Categories used for skill proficiency matching. |
| `armor-types.js` | Armor slot definitions: head, chest, legs, feet pieces. Base stats per piece. |
| `armor-defense.js` | Physical defense values by armor type and tier. Damage reduction percentages. |
| `armor-mobility.js` | Agility and dodge bonuses per armor weight class. Movement speed modifiers. |
| `weapon-armor-matrix.js` | Compatibility and effectiveness chart. Which weapon types are strong/weak against which armor types. |

### Combat

| File | Description |
|------|-------------|
| `ability-repository.js` | All player and enemy abilities. Damage, cooldown, range, element, targeting rules, and special effects. |
| `elements.js` | Element type definitions: fire, ice, lightning, poison, shadow, holy, physical, chaos. |
| `element-matrix.js` | Element effectiveness chart. Strengths and weaknesses between element pairs. |

### Monsters

| File | Description |
|------|-------------|
| `monsters-data.js` | 50+ monster type definitions. HP, stats (STR/AGI/INT), defenses, element, attack type, range, speed, loot tables (3-5 drops each), spawn weights. |
| `monster-tiers.js` | Tier configuration: normal, elite, boss. Stat multipliers, behavior flags, ability access per tier. |

### Items & Crafting

| File | Description |
|------|-------------|
| `items.js` | Consumable item definitions: potions, food, scrolls. Heal amounts, buff durations, stack sizes. |
| `materials.js` | Crafting ingredient definitions. Rarity, source (monster drop, node, chest), stack limits. |
| `quest-items.js` | Quest-specific item definitions. Non-consumable, non-droppable items tied to quest objectives. |
| `crafting-data.js` | Crafting recipes. Input materials, output item, required station (forge, alchemy bench, etc.). |

### World & Progression

| File | Description |
|------|-------------|
| `quests.js` | Quest definitions: objectives, prerequisites, rewards, dialogue triggers. |
| `npcs.js` | NPC data: names, locations, roles (merchant, quest-giver, banker), inventory, dialogue IDs. |
| `room-themes.js` | Room aesthetic definitions: volcanic, ice, overgrown, corrupted, etc. Tile palettes and hazard types per theme. |
| `tileset-reference.js` | Tile ID to sprite mapping. Which ID corresponds to which tile on the sprite sheet. |
| `tileset-floors-1-2.js` | Floor-specific tile variants for floors 1-2. Theme overrides and special tiles. |
| `village-tile-states.js` | Village degradation states. How village tiles change as narrative progresses. |

### Lore

| File | Description |
|------|-------------|
| `elder-dialogue.js` | Village Elder dialogue trees. Branching conversation for lore and quest delivery. |
| `lore-fragments.js` | Scattered narrative text found in the dungeon. World-building lore tied to specific rooms or events. |
| `core-data.js` | The Primordial (final boss) configuration. Phase thresholds, ability sets, arena rules. |

---

## js/generation/ — Procedural Generation

Map building algorithms. Look here to change dungeon layout, room shapes, enemy placement, or portal spawning.

| File | Description |
|------|-------------|
| `dungeon-generator.js` | Main map builder (180x180 grid). Binary Space Partitioning into leaves (min 20x20), organic blob growth (50% fill), dogleg corridors (2-tile width, 10% wobble), shrine placement (2-4 per floor), treasure room designation (15% of blobs). Outputs `DUNGEON_STATE`. |
| `chamber-generator.js` | Cellular automata subdivision within rooms. Aggressive B3/S5 rules at 65% initial wall density, 3 smoothing passes. Produces 5-8 chambers per room with 25-35% wall density. Outputs `CHAMBER_STATS`. |
| `village-generator.js` | Village hub layout. Places buildings, NPCs, shops, bank, and shrines in the safe zone. |
| `core-generator.js` | Final boss arena. 40x40 void space centered on The Primordial. Phase-specific terrain changes. |
| `enemy-spawner.js` | Monster placement in generated rooms. Uses spawn weights from monster data, scales by floor tier. |
| `extraction-spawner.js` | Extraction portal placement. Spawns 4 points per floor, schedules collapse timing (40%, 65%, 83%, 92% of floor duration). |
| `dungeon-integration.js` | Pipeline coordinator. Chains generator -> chamber -> spawner -> theme application. Validates room connectivity. |

---

## js/effects/ — Visual Effects

Particle systems and combat visuals rendered on the canvas.

| File | Description |
|------|-------------|
| `particle-system.js` | General-purpose particle renderer. Fire, magic, impact, and ambient effects. Manages particle lifetime, velocity, color, and canvas layering. |
| `melee-slash-effect.js` | Melee attack visual trails. Sword arcs, axe chops, knife stabs. Loads frames from slash sprite sheets. |
| `monster-attack-effects.js` | Enemy ability visuals. Spell animations, projectile trails, area-of-effect indicators. |
| `village-atmosphere.js` | Village ambient effects. Floating particles, time-based lighting shifts, environmental mood. |

---

## js/ui/ — Rendering & Interface

Everything drawn to the screen. Tile rendering, entity sprites, HUD overlays, and interactive panels.

### Core Rendering

| File | Description |
|------|-------------|
| `renderer.js` | Main render dispatcher. Calls sub-renderers in correct order (tiles -> entities -> effects -> UI). |
| `tile-renderer.js` | Map tile rendering. Draws floors, walls, doors, and hazards from `walls_floor.png` sprite sheet. Supports room-themed tile variants. |
| `enemy-renderer.js` | Enemy sprite rendering. Directional facing, health bars above enemies, tint for status effects. |
| `sprite-loader.js` | Asset loading and caching. Parses sprite sheets into individual frames, handles async image loading. |
| `ui-renderer.js` | UI overlay rendering. Draws HUD elements, message log, status indicators on top of the game world. |
| `village-renderer.js` | Village-specific rendering. Buildings, NPCs, and ambient details for the hub area. |
| `ui-design-system.js` | Shared UI theme: color palette, font sizes, panel styles, button appearances. Consistent look across all overlays. |

### Animation

| File | Description |
|------|-------------|
| `monster-animations.js` | Monster frame cycling definitions. Which sprites to use for idle, walk, attack, hurt, and death per monster type. |
| `enemy-movement-updater.js` | Interpolates enemy display positions for smooth movement between grid positions. |

### HUD & Status

| File | Description |
|------|-------------|
| `unit-frames.js` | HP/MP/stamina bars for player and targeted enemy. Resource bar rendering with color coding. |
| `action-bar-ui.js` | Hotkey bar (1-4 keys). Shows equipped abilities, cooldown overlays, and keybind labels. |
| `icon-sidebar.js` | Quick-access status icons on screen edge. Active buffs, debuffs, boon indicators. |
| `mini-map.js` | Corner mini-map. Shows explored rooms, player position, extraction points, and enemies. |
| `map-overlay.js` | Full-screen map view (toggle). Detailed room layout with labels and points of interest. |
| `extraction-ui.js` | Extraction point status display. Countdown timers, portal states, warning indicators. |
| `shift-overlay.js` | Shift countdown and mechanics display. Shows MELTDOWN timer, lava progression, exit location. |

### Interactive Panels

| File | Description |
|------|-------------|
| `character-overlay.js` | Character sheet. Stats, attributes, equipped gear, skill levels, and derived values. |
| `chest-ui.js` | Loot pickup panel. Shows items in a chest or ground pile, pick-up/discard options. |
| `shop-ui.js` | NPC merchant interface. Buy/sell items, price display, inventory comparison. |
| `shrine-ui.js` | Boon selection panel. Presents 3 boon choices from applicable Ancestors at shrine locations. |
| `bank-ui.js` | Persistent bank interface. Deposit/withdraw items and gold that survive death. |
| `loadout-ui.js` | Pre-run gear selection. Choose equipment from bank before entering the dungeon. |
| `crafting-ui.js` | Crafting interface. Recipe list, material requirements, craft button. |
| `quest-ui.js` | Quest log. Active and completed quests, objectives, rewards. |
| `journal-ui.js` | Lore journal. Collected lore fragments, narrative entries, world history. |
| `skills-ui.js` | Skill tree display. Proficiency levels, specialization branches, XP progress bars. |
| `dialogue-ui.js` | NPC conversation panel. Dialogue text, response choices, portrait display. |
| `right-click-init.js` | Context menu system. Right-click on items/entities for contextual actions (inspect, use, drop, etc.). |

---

## js/utils/ — Helper Functions

Shared utility code used across multiple systems.

| File | Description |
|------|-------------|
| `Collision.js` | Collision detection helpers. Tile walkability checks, bounding box overlap, circle collision tests. (Also consolidated into `movement-master.js`.) |
| `pathfinding.js` | A* search with priority queue. Finds shortest walkable path between two grid positions. (Also consolidated into `movement-master.js`.) |
| `damage-calculator.js` | Damage formula helpers. Base calculation, crit rolls, element modifiers, defense reduction. (Also consolidated into `combat-master.js`.) |
| `stat-system.js` | Stat derivation functions. Converts base stats + gear + skills into final values (defense rating, crit chance, attack power, etc.). |
| `message-log.js` | In-game message log. `addMessage()` to queue combat text, system messages, and lore with color coding. |
| `movement-utils.js` | Movement math helpers. Lerp, easing functions (linear, quad ease-in/out), distance calculations, grid-to-pixel conversion. |

---

## js/testing/ — Test & Analysis Tools

| File | Description |
|------|-------------|
| `map-gen-analyzer.js` | Dungeon generation statistics tool. Runs the generator multiple times and reports chamber counts, average sizes, wall density, dead end ratios, and connectivity metrics. Used for tuning generation parameters. |

---

## js/rl/ — Reinforcement Learning

Directory for RL modules. Appears to be a work-in-progress integration point for ML-driven enemy behavior or balance testing.

---

## docs/ — Documentation

| File | Description |
|------|-------------|
| `SHIFT_IMPLEMENTATION_GUIDE.md` | Implementation guide for the Protocol: MELTDOWN shift system. Mechanics, timings, lava propagation, and exit spawning. |
| `SURVIVAL_EXTRACTION_IMPLEMENTATION_GUIDE.md` | Guide for the extraction/survival loop. Portal states, collapse scheduling, death penalties, rescue runs. |
| `TILESET_LAYOUT_FLOORS_1_2.md` | Tile sprite sheet layout documentation. Tile IDs, coordinates, and visual descriptions for floors 1-2. |
| `monster-bestiary.md` | Monster catalog. Stats, behaviors, loot tables, and flavor text for all enemy types. |
| `player-guide.md` | Player-facing guide. Controls, mechanics explanations, progression tips. |
| `Book1.pdf` | Reference document (PDF). |

---

## tools/ — Balance & Simulation

| File | Description |
|------|-------------|
| `balance-analyzer.js` | JavaScript balance analysis tool. Evaluates damage curves, stat scaling, and item power levels. |
| `balance_simulator.py` | Python combat simulator. Runs thousands of encounters to evaluate balance across gear/skill combinations. |
| `dungeon_run_simulator.py` | Python run simulator. Models a full dungeon run (floor-to-floor) to evaluate pacing, loot rates, and difficulty curves. |
| `BALANCE_REFERENCE.md` | Balance target documentation. Expected TTK (time to kill), damage ranges, HP thresholds per floor. |

---

## assets/ — Art & Sprites

### assets/spritesheet/

| Path | Description |
|------|-------------|
| `walls_floors/walls_floor.png` | Main tileset. 16px tiles for all floor and wall types. |
| `dungeon_upper.png` | Upper dungeon layer tiles (overhangs, ceiling details). |
| `player_caveman/idle/` | Player idle sprites. 4 directions (front, back, left, right). |
| `player_caveman/walking/` | Player walking sprite sheets. 4-direction animation strips. |
| `Monsters/` | Individual monster sprite sheets (Minotaur, Skeleton-Soldier, Necromancer, GiantCrab, Magmaslime, OrcMage, PlantRun, VampireRun, etc.). |
| `Monsters/Ghost/` | Ghost animation set: attack, death, hurt, run. |
| `Monsters/Vampire/` | Vampire animation set: attack, death, hurt, run. |
| `sword/` | Orc attack swing animation for melee reference. |
| `slash1/` through `slash10/` | 10 melee slash effect animation sets (PNG sequences). |
| `explosion_effects/1-4, 10/` | Explosion/impact animation sets for ability effects. |
| `magic_effect/1-10/` | 10 magic spell animation sets (fireballs, ice shards, lightning, etc.). |
| `elixir_icons/` | 50 potion/elixir icons for inventory display. |
| `skill_icons/` | 100 skill/ability icons for the skill tree and action bar. |

### Root assets/

| File | Description |
|------|-------------|
| `Enemy_Animations_Set.zip` | Bundled enemy animation pack (source archive). |
| `MiniWorldSprites.zip` | Tile and environment sprite collection (source archive). |
| `fire-skeleton-mobs.zip` | Fire skeleton variant sprites (source archive). |
| `plant-mobs.zip` | Plant enemy sprites (source archive). |
| `slime-mobs.zip` | Slime enemy sprites (source archive). |
| `swordsmen-mobs.zip` | Swordsman enemy sprites (source archive). |
| `vampire-mobs.zip` | Vampire enemy sprites (source archive). |

---

## z_archive/Godot Implementation/ — Archived Godot Version

A previous implementation of the game in Godot 4 / GDScript. Not actively developed — the JS Canvas version is the current codebase. Included here for reference.

### Key directories:

| Path | Description |
|------|-------------|
| `autoload/` | Godot singletons: `game_manager.gd`, `save_manager.gd`, `audio_manager.gd`, `constants.gd`, `event_bus.gd`. |
| `scenes/main/` | Main scene and game loop (`main.gd`, `main.tscn`). |
| `scenes/entities/player/` | Player scene and script. |
| `scenes/entities/enemy/` | Enemy scene and script with base `entity.gd`. |
| `scenes/entities/npc/` | NPC scene and script. |
| `scenes/world/` | Dungeon and village scenes with `dungeon_generator.gd`. |
| `scenes/ui/` | UI scenes: HUD, inventory, character sheet, dialogue, combat arena overlay, menus (main, pause, game over). |
| `scenes/effects/` | Visual effects: damage numbers, melee slash, projectiles. |
| `scripts/systems/combat/` | Combat system with arena-based tactical combat (action queue, pip economy, phase machine, attack tokens). |
| `scripts/systems/ai/` | AI manager and enemy AI scripts. |
| `scripts/systems/loot/` | Loot system, loot tables, loot piles. |
| `scripts/systems/social/` | Monster social/pack system. |
| `scripts/data/` | Data resource scripts: items, monsters, NPCs, skills, effects. |
| `resources/` | Godot `.tres` resource files: weapons, armor, consumables, monster definitions, NPC definitions, loot tables, skills. |

---

## Quick Lookup: "Where do I find...?"

| If you need to... | Look in... |
|---|---|
| Change a game constant (speed, damage, grid size) | `js/core/constants.js` |
| Modify how damage is calculated | `js/systems/combat-master.js` |
| Change enemy behavior or AI states | `js/systems/enemy-ai.js` |
| Add a new monster type | `js/data/monsters-data.js` |
| Add a new weapon | `js/data/weapons-melee.js`, `weapons-ranged.js`, or `weapons-magic.js` |
| Add a new armor piece | `js/data/armor-types.js` |
| Modify dungeon generation | `js/generation/dungeon-generator.js` |
| Change room subdivision | `js/generation/chamber-generator.js` |
| Adjust enemy spawn rates | `js/generation/enemy-spawner.js` |
| Change extraction timing | `js/generation/extraction-spawner.js` |
| Modify the skill tree | `js/systems/skill-system.js` |
| Add or change a boon | `js/systems/boon-system.js` |
| Edit loot drop rates | `js/systems/loot-system.js` |
| Change player stats or inventory size | `js/entities/player.js` |
| Add a quest | `js/data/quests.js` + `js/systems/quest-system.js` |
| Add a crafting recipe | `js/data/crafting-data.js` |
| Change how the HUD looks | `js/ui/ui-renderer.js` + `js/ui/ui-design-system.js` |
| Fix a rendering issue | `js/ui/renderer.js` or the specific sub-renderer |
| Add a new particle effect | `js/effects/particle-system.js` |
| Modify save/load behavior | `js/core/save-manager.js` |
| Adjust the game loop or state routing | `js/core/main.js` |
| Debug in the browser console | `debug-commands.js` |
| Analyze dungeon generation quality | `js/testing/map-gen-analyzer.js` |
| Simulate game balance | `tools/balance_simulator.py` or `tools/balance-analyzer.js` |
