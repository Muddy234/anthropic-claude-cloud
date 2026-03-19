# Extraction System Removal - Implementation Record

## Overview
Converted the game from an extraction roguelike to a true permadeath roguelike. All extraction, rescue, degradation, and shortcut systems have been completely removed.

## Design Decisions
1. **Village remains as between-floor hub within a single life** - bank/shops/loadout still useful during one continuous life
2. **Bank becomes "run storage"** - safe between dungeon floors, wiped on death
3. **Death = full reset** - persistentState wiped, no death drops, no rescue, start completely fresh
4. **Every run starts floor 1** - no shortcuts

## What Changed

### Files Deleted (7)
- `js/entities/extraction-point.js` - Extraction shaft entity
- `js/systems/extraction-system.js` - Core extraction mechanics
- `js/generation/extraction-spawner.js` - Shaft placement in dungeons
- `js/ui/extraction-ui.js` - Extraction confirmation dialog
- `js/systems/rescue-system.js` - Death drop recovery mechanics
- `js/systems/degradation-system.js` - Floor quality reduction
- `js/systems/shortcut-system.js` - Floor shortcuts

### Core Behavioral Changes

#### Death Flow (True Permadeath)
- **`js/core/session-manager.js`**: `playerDeath()` now wipes ALL persistentState, resets sessionState, and deletes saves. Removed `extractionSuccess()`, `hasDeathDrop()`, `getDeathDropInfo()`, `recoverDeathDrop()`, `_applyDegradation()`, `_checkVillageDegradation()`.
- **`js/entities/player.js`**: `handlePlayerDeath()` simplified to clear boons/effects, call SessionManager.playerDeath(), and set gameover state.
- **`js/core/game-init.js`**: `restartGame()` now does a full fresh start (wipes persistentState, sessionState, villageState, reinitializes starting kit).
- **`js/ui/renderer.js`**: Game over text changed from "Press SPACE to Return to Village" to "Press SPACE to Start New Adventure".

#### State Schema
- **`js/core/game-state.js`**: Removed from `game`: extractionPoints, activeExtractionPoint. Removed from `persistentState`: shortcuts, degradation, deathDrop, extraction stats. Removed from `sessionState`: extractionPoints, collapseQueue, isRescueRun, deathDropCollected. Removed from `villageState`: selectedShortcutFloor, degradationStage.
- **`js/core/constants.js`**: Removed EXTRACTION_CONFIG, RESCUE_CONFIG, DEGRADATION_CONFIG, GAME_STATES.EXTRACTION, 'rescue' from quest types.

### UI/Rendering Cleanup
- **`js/ui/mini-map.js`**: Removed extraction point drawing from drawMinimapEntities()
- **`js/ui/map-overlay.js`**: Removed drawExitPortal() function and its call
- **`js/ui/renderer.js`**: Removed extraction state checks, extraction point draw layer, ExtractionUI render call, credits text about extraction
- **`js/ui/loadout-ui.js`**: Removed floor selection UI (startingFloor, _adjustStartingFloor, PageUp/PageDown handlers, floor display). Always starts on floor 1.

### System Integration
- **`js/systems/survival-integration.js`**: Removed ShortcutSystem, DegradationSystem, RescueSystem from init. Removed onExtraction() entirely. Simplified onDeath(). Cleaned getProgress().
- **`js/systems/input-handler.js`**: T key now only toggles torch. Removed extraction point interaction check.
- **`js/systems/world-state-system.js`**: Changed state progression trigger from extraction milestones to floor descent milestones. Merged checkExtractionProgression() and checkFloorEntryProgression() into checkFloorDescentProgression().

### Data/Content Cleanup
- **`js/data/npcs.js`**: Removed extraction barks, shortcut services, expedition_shortcuts dialogue nodes, extraction flavor text
- **`js/ui/dialogue-ui.js`**: Removed shortcut_status handler, simplified village_status, removed extraction stats
- **`js/data/quests.js`**: Rewrote extraction-based quests to be floor-descent based. Removed extract objective type.
- **`js/data/bounties.js`**: Removed extraction bounties and rumor
- **`js/data/crafting-data.js`**: Removed escape_rope recipe (teleport to extraction)
- **`js/data/materials.js`**: Removed shortcut references from guardian_heart material
- **`js/audio/ui-audio.js`**: Removed playExtractionWarning/Collapse/Success methods
- **`js/data/audio-definitions.js`**: Removed extraction audio definitions
- **`js/data/music-tracks.js`**: Removed extraction music tracks
- **`js/data/village-tile-states.js`**: Changed "extraction" dialogue to generic
- **`js/systems/bark-system.js`**: Removed successful_extraction case
- **`js/systems/quest-system.js`**: Removed extract objective matcher and onExtraction()
- **`js/core/save-manager.js`**: Removed successfulExtractions from save metadata

### Village System
- **`js/generation/village-generator.js`**: Removed degradationLevel parameter, removed _applyWorldState(), _crushBuilding(), _applyDegradation() methods. Village always appears fully healthy.
- **`js/systems/village-system.js`**: Removed degradationLevel parameter from init()
- **`js/generation/dungeon-integration.js`**: Updated stale extraction comments

### Miscellaneous
- Removed "SURVIVAL EXTRACTION UPDATE:" prefix from 15+ file headers
- Renamed `extractionInfo` variable to `floorInfo` in main.js
- Updated `index.html` to remove all script tags for deleted files

## Verification Checklist
- [ ] Start new game - village loads, NPCs work
- [ ] Enter dungeon via loadout (always floor 1, no floor selector)
- [ ] Play through combat and looting
- [ ] Die - game over screen - SPACE starts completely fresh game (no items, no bank, no progress)
- [ ] No extraction points on minimap/map
- [ ] T key only toggles torch
- [ ] No console errors referencing deleted systems
- [ ] NPC dialogues have no extraction/shortcut/rescue mentions
