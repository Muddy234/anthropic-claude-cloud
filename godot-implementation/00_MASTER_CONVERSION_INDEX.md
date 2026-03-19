# The Shifting Chasm: JavaScript to Godot 4.x Conversion Guide

## Master Index

This guide breaks the full JS→Godot port into **8 independent work packages** that can be assigned to separate agents. Each document is self-contained with all context needed to execute without cross-referencing conversations.

---

## Work Package Overview

| # | Document | Scope | Dependencies | Est. Files |
|---|----------|-------|-------------|------------|
| 01 | `01_PROJECT_FOUNDATION.md` | Godot project setup, autoloads, state architecture, event system | None | 8-10 |
| 02 | `02_DATA_LAYER.md` | Resource classes, .tres files, all static game data | 01 (Constants) | 30-40 |
| 03 | `03_CORE_SYSTEMS.md` | Vision, noise, hazards, inventory, stamina, movement | 01, 02 | 15-20 |
| 04 | `04_ENTITIES_AND_AI.md` | Entity base, player, enemy, NPC, boss, enemy AI FSM | 01, 02, 03 | 12-15 |
| 05 | `05_COMBAT_SYSTEM.md` | Combat decomposition, damage, status effects, spells, boons | 01, 02, 03, 04 | 15-20 |
| 06 | `06_WORLD_GENERATION.md` | Dungeon gen, village gen, enemy spawning, seeded RNG | 01, 02 | 8-10 |
| 07 | `07_RENDERING_AND_UI.md` | TileMap, sprites, all UI panels, HUD, menus | 01-06 | 40-50 |
| 08 | `08_AUDIO_AND_EFFECTS.md` | Audio manager, music, SFX, particles, visual effects | 01 | 10-12 |

---

## Execution Order (Critical Path)

```
Phase A (parallel):
  [01 PROJECT_FOUNDATION]
  [02 DATA_LAYER]          ← can start once Constants from 01 exist
  [06 WORLD_GENERATION]    ← can start once 01+02 exist
  [08 AUDIO_AND_EFFECTS]   ← can start once 01 exists

Phase B (parallel, after Phase A):
  [03 CORE_SYSTEMS]        ← needs 01+02
  [04 ENTITIES_AND_AI]     ← needs 01+02+03(partial)

Phase C (after Phase B):
  [05 COMBAT_SYSTEM]       ← needs 01-04

Phase D (after Phase C):
  [07 RENDERING_AND_UI]    ← needs all systems functional
```

---

## Source Codebase Statistics

| Category | JS Files | Lines | Key Files |
|----------|----------|-------|-----------|
| Core | 9 | 3,592 | main.js, game-state.js, system-manager.js, game-init.js |
| Data | 30 | 13,062 | monsters-data.js, items.js, ability-repository.js |
| Systems | 45 | 38,045 | combat-master.js (4601), enemy-ai.js (2223), boon-system.js (2409) |
| Entities | 7 | 6,716 | player.js, enemy.js, boss.js, npc.js |
| Generation | 8 | 5,306 | dungeon-generator.js, chamber-generator.js |
| UI | 33 | 30,071 | renderer.js, ui-design-system.js, action-bar-ui.js |
| Rendering | 20 | 14,883 | sprite-renderer.js, tile-renderer.js, effect-sprites.js |
| Audio | 6 | 3,616 | audio-manager.js, music-system.js |
| Effects | 5 | 3,827 | particle-system.js, melee-slash-effect.js |
| Utils/Config/Debug | 11 | 2,634 | helpers.js, geometry-utils.js, combat-config.js |
| **Total** | **174** | **~122,000** | |

---

## Godot Target Directory Structure

```
godot-implementation/
├── project.godot
├── autoload/
│   ├── game_manager.gd          ← GameManager singleton
│   ├── event_bus.gd             ← Signal hub
│   ├── constants.gd             ← All game constants + enums
│   ├── save_manager.gd          ← File-based persistence
│   └── audio_manager.gd         ← Audio singleton
│
├── resources/
│   ├── data_classes/             ← Resource class definitions (.gd)
│   │   ├── monster_data.gd
│   │   ├── item_data.gd
│   │   ├── skill_data.gd
│   │   ├── ability_data.gd
│   │   ├── npc_data.gd
│   │   ├── quest_data.gd
│   │   ├── loot_table_data.gd
│   │   ├── crafting_recipe_data.gd
│   │   ├── boon_data.gd
│   │   └── weapon_data.gd
│   ├── monsters/                 ← .tres instances
│   ├── items/
│   ├── weapons/
│   ├── armor/
│   ├── abilities/
│   ├── npcs/
│   ├── quests/
│   ├── loot_tables/
│   ├── crafting_recipes/
│   ├── boons/
│   └── config/                   ← Tuning resources
│       ├── combat_config.tres
│       ├── movement_config.tres
│       └── ai_config.tres
│
├── scenes/
│   ├── main/
│   │   ├── main.tscn             ← Root scene
│   │   └── main.gd
│   ├── world/
│   │   ├── dungeon.tscn
│   │   ├── dungeon.gd
│   │   ├── village.tscn
│   │   └── village.gd
│   ├── entities/
│   │   ├── entity.gd             ← Base class
│   │   ├── player/
│   │   │   ├── player.tscn
│   │   │   └── player.gd
│   │   ├── enemy/
│   │   │   ├── enemy.tscn
│   │   │   └── enemy.gd
│   │   ├── npc/
│   │   │   ├── npc.tscn
│   │   │   └── npc.gd
│   │   └── boss/
│   │       ├── boss.tscn
│   │       ├── boss.gd
│   │       ├── core_boss.gd
│   │       └── malphas_boss.gd
│   ├── ui/
│   │   ├── hud/
│   │   ├── menus/
│   │   ├── combat/
│   │   ├── inventory/
│   │   ├── dialogue/
│   │   ├── shop/
│   │   ├── crafting/
│   │   └── overlays/
│   └── effects/
│       ├── damage_number.tscn
│       ├── melee_slash.tscn
│       ├── projectile.tscn
│       └── particles/
│
├── scripts/
│   ├── systems/
│   │   ├── system_coordinator.gd  ← Priority-based update manager
│   │   ├── vision_system.gd
│   │   ├── noise_system.gd
│   │   ├── hazard_system.gd
│   │   ├── movement_system.gd
│   │   ├── stamina_system.gd
│   │   ├── inventory_system.gd
│   │   ├── loot_system.gd
│   │   ├── quest_system.gd
│   │   ├── crafting_system.gd
│   │   ├── banking_system.gd
│   │   ├── skill_system.gd
│   │   ├── boon_system.gd
│   │   ├── shift_system.gd
│   │   ├── village_system.gd
│   │   ├── spawn_point_system.gd
│   │   └── loadout_system.gd
│   ├── combat/
│   │   ├── damage_calculator.gd
│   │   ├── attack_resolver.gd
│   │   ├── status_effect_manager.gd
│   │   ├── combat_master.gd
│   │   ├── spell_system.gd
│   │   ├── dodge_system.gd
│   │   ├── kill_streak_system.gd
│   │   ├── projectile_manager.gd
│   │   └── enemy_ability_system.gd
│   ├── ai/
│   │   ├── enemy_ai.gd
│   │   ├── monster_social_system.gd
│   │   └── ai_config.gd
│   ├── generation/
│   │   ├── dungeon_generator.gd
│   │   ├── chamber_generator.gd
│   │   ├── village_generator.gd
│   │   ├── enemy_factory.gd
│   │   ├── enemy_spawner.gd
│   │   ├── core_generator.gd
│   │   └── seeded_rng.gd
│   └── utils/
│       ├── helpers.gd
│       ├── geometry_utils.gd
│       ├── message_log.gd
│       ├── stat_system.gd
│       └── room_utils.gd
│
└── assets/
    ├── sprites/
    ├── audio/
    │   ├── sfx/
    │   └── music/
    └── tilesets/
```

---

## Conventions for All Work Packages

### Naming
- GDScript files: `snake_case.gd`
- Class names: `PascalCase` via `class_name`
- Signals: `snake_case` verbs (e.g., `damage_dealt`, `enemy_killed`)
- Resources: `snake_case.tres`
- Scenes: `snake_case.tscn`

### State Management
- **`RunState`** = merged `game` + `sessionState` (cleared on death)
- **`PersistentState`** = `persistentState` (saved to disk)
- Village state lives on `VillageSystem` node, not global
- No duplicated state — single source of truth per datum

### Communication Pattern
- **Intra-system:** Direct method calls
- **Cross-system:** Signals via `EventBus` autoload
- **Never:** Direct global variable reads across system boundaries

### GDScript Style
- Use typed variables: `var hp: int = 100`
- Use typed arrays: `var enemies: Array[Enemy] = []`
- Use `@export` for inspector-editable values
- Use `@onready` for node references
- Prefer `RefCounted` over `Node` for pure data/logic classes
- Use `Resource` subclasses for all data definitions

### Testing Milestone Per Phase
Each work package should produce a testable artifact:
- 01: Autoloads load, state initializes, signals connect
- 02: Resources load in inspector, data accessible from GDScript
- 03: Systems init/update in priority order, vision calculates
- 04: Player moves on grid, enemy runs FSM states
- 05: Attack deals damage, status effects tick, enemy dies
- 06: Dungeon generates walkable map, enemies spawn
- 07: TileMap renders, UI panels open/close, HUD updates
- 08: SFX plays on hit, music crossfades between scenes
