# Phase 2: Feature Implementation Plan
## The Shifting Chasm - New Features & Enhancements

**Document Created:** 2025-02-11
**Phase 1 Status:** Bug fixes and critical issues (see analysis files)
**Phase 2 Focus:** New features, enhancements, and quality-of-life improvements

---

## Executive Summary

Phase 1 addressed 83 issues across 6 agents focused on bug fixes and critical problems. Phase 2 introduces **new features and enhancements** identified during the analysis phase but excluded from Phase 1 due to the "no new features" constraint.

### Feature Categories

| Category | Features | Primary Agents |
|----------|----------|----------------|
| **Core Systems** | State management, async init, save system | foundry |
| **Content** | Legendary weapons, ice monsters, crafting | lorekeeper |
| **UI/UX** | Quest HUD, tooltips, panel polish | glasswright |
| **Generation** | Multi-floor stairs, spawn patterns | cartographer |
| **Combat** | Dodge roll, player combos, block system | warbringer |
| **Audio** | Complete audio system | cantor |

### Priority Tiers

- **Tier 1 (High Impact):** Features that significantly improve player experience
- **Tier 2 (Medium Impact):** Quality-of-life and polish features
- **Tier 3 (Low Impact):** Nice-to-have features and developer tools

---

## FOUNDRY AGENT - Core System Features

### Tier 1 Features

#### F-1.1: Async Initialization with Loading Screen
- **Files:** `js/core/game-init.js`, NEW: `js/ui/loading-screen.js`
- **Description:** Convert synchronous initialization to async/await with progress events and loading screen support
- **Requirements:**
  1. Convert all init functions to async
  2. Emit progress events (0-100%)
  3. Create loading screen UI (coordinate with Glasswright)
  4. Handle init failures gracefully with retry
  5. Add timeout handling for stuck initialization
- **Dependencies:** Glasswright for loading screen visuals
- **Estimated Effort:** 8-12 hours

#### F-1.2: Background Tab Handling (Visibility API)
- **Files:** `js/core/main.js`
- **Description:** Pause game when browser tab is hidden to save CPU and prevent desync
- **Requirements:**
  1. Add `visibilitychange` event listener
  2. Pause game loop when hidden
  3. Pause audio (coordinate with Cantor)
  4. Resume gracefully on return
  5. Handle long absence (show "Welcome back" message)
- **Dependencies:** Cantor for audio pause
- **Estimated Effort:** 2-4 hours

#### F-1.3: Save System Enhancements
- **Files:** `js/core/save-manager.js`
- **Description:** Add compression, automatic backups, and corruption recovery
- **Requirements:**
  1. Implement LZ-string compression for large saves
  2. Automatic backup rotation (keep last 3 saves)
  3. Save integrity checksums
  4. Corruption detection and recovery from backup
  5. Cloud save sync hooks (for future integration)
- **Dependencies:** None
- **Estimated Effort:** 6-8 hours

### Tier 2 Features

#### F-2.1: State Change Observer System
- **Files:** `js/core/game-state.js`
- **Description:** Implement observer pattern for state changes to enable reactive UI updates
- **Requirements:**
  1. Create `StateObserver` class
  2. Add `subscribe(path, callback)` method
  3. Emit events on state changes
  4. Support path wildcards (`player.*`)
  5. Debounce rapid changes
- **Dependencies:** None
- **Estimated Effort:** 4-6 hours

#### F-2.2: Loadout Presets System
- **Files:** `js/systems/loadout-system.js`
- **Description:** Allow players to save and load loadout configurations
- **Requirements:**
  1. Save current loadout as named preset
  2. Load preset to loadout screen
  3. Delete/rename presets
  4. Store in `persistentState.loadoutPresets`
  5. Limit to 5 presets
- **Dependencies:** Glasswright for preset UI
- **Estimated Effort:** 4-6 hours

#### F-2.3: Bank Quality-of-Life
- **Files:** `js/systems/banking-system.js`
- **Description:** Add search, filtering, tabs, and item locking
- **Requirements:**
  1. Search by item name
  2. Filter by item type, rarity, element
  3. Bank tabs (Weapons, Armor, Consumables, Materials)
  4. Item locking to prevent accidental sale
  5. Transaction history log
- **Dependencies:** Glasswright for bank UI updates
- **Estimated Effort:** 6-8 hours

### Tier 3 Features

#### F-3.1: Debug Enhancements
- **Files:** `debug-commands.js`
- **Description:** Add command history, macros, and state snapshots
- **Requirements:**
  1. Command history with up/down navigation
  2. Macro recording/playback
  3. State snapshot/restore
  4. Performance budget for test commands
- **Estimated Effort:** 4-6 hours

#### F-3.2: Config Environment System
- **Files:** `js/core/constants.js`
- **Description:** Support dev/test/prod config overrides
- **Requirements:**
  1. Environment detection
  2. Config override merging
  3. Runtime config modification API
  4. Config validation on load
- **Estimated Effort:** 4-6 hours

---

## LOREKEEPER AGENT - Content Features

### Tier 1 Features

#### L-1.1: Legendary Tier Weapons
- **Files:** `js/data/weapons-melee.js`, `js/data/weapons-ranged.js`, `js/data/weapons-magic.js`
- **Description:** Add legendary tier weapons as ultimate endgame rewards
- **Requirements:**
  1. 2 legendary blade weapons (e.g., Worldsplitter, Dawnbringer)
  2. 2 legendary blunt weapons (e.g., Titan's Hammer, Earthquake)
  3. 2 legendary polearms
  4. 2 legendary bows/crossbows
  5. 2 legendary magic weapons per category
  6. Unique effects (life steal, area damage, element switching)
  7. Appropriate gold values (1000+)
  8. Floor 10 / boss-only drop sources
- **Dependencies:** Warbringer for unique effects implementation
- **Estimated Effort:** 6-8 hours

#### L-1.2: Ice Element Monsters
- **Files:** `js/data/monsters-data.js`, `js/data/room-themes.js`
- **Description:** Add ice-element monsters and fix ice_cave theme mismatch
- **Requirements:**
  1. Frost Elemental (ice, ethereal, caster)
  2. Ice Golem (ice, stone, tank)
  3. Frozen Husk (ice, bone, undead)
  4. Blizzard Spirit (ice, ethereal, fast)
  5. Update ice_cave theme monster list
  6. Ice-specific abilities (freeze, slow, shatter)
- **Dependencies:** Warbringer for freeze/slow status effects
- **Estimated Effort:** 4-6 hours

#### L-1.3: Magic/Ranged Crafting Recipes
- **Files:** `js/data/crafting-data.js`
- **Description:** Add crafting recipes for magic and ranged weapons
- **Requirements:**
  1. 5 magic weapon recipes (staff, wand, tome)
  2. 5 ranged weapon recipes (bow, crossbow, polearm)
  3. Appropriate material requirements
  4. Balance with existing melee recipes
- **Dependencies:** None
- **Estimated Effort:** 3-4 hours

### Tier 2 Features

#### L-2.1: Element System Expansion
- **Files:** `js/data/elements.js`, `js/data/element-matrix.js`
- **Description:** Add resistance/immunity system and buff underperforming elements
- **Requirements:**
  1. Add resistance percentages to element definitions
  2. Buff ice element (add strength vs nature)
  3. Add "void" element for consistency
  4. Normalize shadow/dark naming
  5. Resistance/immunity flags for monsters
- **Dependencies:** Warbringer for damage calculator updates
- **Estimated Effort:** 4-6 hours

#### L-2.2: Throwing Weapons Category
- **Files:** `js/data/weapons-ranged.js`
- **Description:** Add throwing weapons as defined in weapon-types.js specialties
- **Requirements:**
  1. Common: Throwing Knives
  2. Uncommon: Javelins, Chakrams
  3. Rare: Elemental throwing weapons
  4. Epic: Returning weapons
  5. Quick-throw mechanic (faster than bow, less range)
- **Dependencies:** Warbringer for throwing combat mechanics
- **Estimated Effort:** 4-6 hours

#### L-2.3: Nature/Water/Earth Magic Weapons
- **Files:** `js/data/weapons-magic.js`
- **Description:** Fill element gaps in magic weapon roster
- **Requirements:**
  1. 2 rare nature staffs/wands
  2. 2 rare water staffs/wands
  3. 2 rare earth staffs/wands
  4. 1 epic of each element
  5. Appropriate effects (healing, slow, knockback)
- **Dependencies:** None
- **Estimated Effort:** 3-4 hours

### Tier 3 Features

#### L-3.1: Accessory System
- **Files:** NEW: `js/data/accessories.js`, `js/data/crafting-data.js`
- **Description:** Add rings and amulets as new equipment category
- **Requirements:**
  1. Define accessory slots (Ring x2, Amulet x1)
  2. Create 20+ accessories with stat bonuses
  3. Add accessory crafting recipes
  4. Integration with equipment system
- **Dependencies:** Foundry for equipment slots, Glasswright for UI
- **Estimated Effort:** 8-12 hours

#### L-3.2: Additional Lore Fragments
- **Files:** `js/data/lore-fragments.js`
- **Description:** Add optional lore for even-numbered floors
- **Requirements:**
  1. Floor 2: Miner's log (foreshadowing)
  2. Floor 4: Guard's report
  3. Floor 6: Cultist's notes
  4. Floor 8: Prisoner's plea
  5. Lower spawn chances (30-50%)
- **Dependencies:** None
- **Estimated Effort:** 2-3 hours

---

## GLASSWRIGHT AGENT - UI/UX Features

### Tier 1 Features

#### G-1.1: Quest HUD Tracking
- **Files:** `js/ui/quest-ui.js`, NEW: `js/ui/quest-hud.js`
- **Description:** Allow pinning quests to screen with inline progress
- **Requirements:**
  1. Pin/unpin quest button in quest panel
  2. HUD widget showing pinned quest (max 2)
  3. Inline objective progress (3/5 collected)
  4. Map waypoints for quest objectives
  5. Auto-unpin on completion
- **Dependencies:** Cartographer for waypoint positions
- **Estimated Effort:** 6-8 hours

#### G-1.2: BasePanel Class & Transitions
- **Files:** NEW: `js/ui/base-panel.js`, all panel files
- **Description:** Standardize panel lifecycle with consistent animations
- **Requirements:**
  1. Create `BasePanel` class with open/close/toggle
  2. Consistent escape-to-close behavior
  3. Open/close animations (fade, slide)
  4. Panel stack management (close in reverse order)
  5. Refactor existing panels to extend BasePanel
- **Dependencies:** None
- **Estimated Effort:** 8-12 hours

#### G-1.3: Loading Screen
- **Files:** NEW: `js/ui/loading-screen.js`
- **Description:** Visual loading screen during game initialization
- **Requirements:**
  1. Full-screen overlay with game logo
  2. Progress bar (0-100%)
  3. Loading tips/hints (rotate)
  4. "Click to start" prompt when complete
  5. Graceful error display if init fails
- **Dependencies:** Foundry for init progress events
- **Estimated Effort:** 4-6 hours

### Tier 2 Features

#### G-2.1: Mini Map Enhancements
- **Files:** `js/ui/mini-map.js`
- **Description:** Add edge fog effect and improve visual clarity
- **Requirements:**
  1. Fog-of-war edge effect (gradient fade)
  2. Zoom controls (+/- or scroll)
  3. Room labels on hover
  4. Extraction point markers
  5. Enemy density indicators
- **Dependencies:** None
- **Estimated Effort:** 4-6 hours

#### G-2.2: Dialogue System Enhancements
- **Files:** `js/ui/dialogue-ui.js`
- **Description:** Add conversation history and text options
- **Requirements:**
  1. Conversation history (scroll back)
  2. Text skip option (click to complete)
  3. Auto-advance toggle
  4. Voice line support hooks (for Cantor)
  5. Speaker portraits (if available)
- **Dependencies:** Cantor for voice hooks
- **Estimated Effort:** 4-6 hours

#### G-2.3: Mobile/Responsive Support
- **Files:** `css/style.css`, input handling files
- **Description:** Add responsive breakpoints and touch support
- **Requirements:**
  1. Responsive breakpoints (tablet, mobile)
  2. Touch-friendly button sizes
  3. Virtual joystick for movement
  4. Pinch-to-zoom for map
  5. Orientation handling
- **Dependencies:** None
- **Estimated Effort:** 8-12 hours

### Tier 3 Features

#### G-3.1: Accessibility Improvements
- **Files:** Multiple UI files
- **Description:** Add focus states and screen reader support
- **Requirements:**
  1. Visible focus indicators
  2. ARIA labels for interactive elements
  3. High contrast mode option
  4. Font size scaling option
  5. Color blind mode (icon indicators)
- **Dependencies:** None
- **Estimated Effort:** 8-12 hours

#### G-3.2: UI Sound Hooks
- **Files:** All UI panel files
- **Description:** Add hooks for UI sounds (button clicks, panel transitions)
- **Requirements:**
  1. `onButtonClick` event
  2. `onPanelOpen`/`onPanelClose` events
  3. `onNotification` event
  4. `onError` event
  5. Event data includes element ID for sound selection
- **Dependencies:** Cantor for audio playback
- **Estimated Effort:** 2-4 hours

---

## CARTOGRAPHER AGENT - Generation Features

### Tier 1 Features

#### C-1.1: Multi-Floor Connectivity (Stairs)
- **Files:** `js/generation/dungeon-generator.js`, `js/generation/dungeon-integration.js`
- **Description:** Add stairs between floors for vertical navigation
- **Requirements:**
  1. Generate up/down stair positions per floor
  2. Stairs must be in different rooms
  3. Down stairs lead to next floor
  4. Up stairs return to previous floor
  5. Track stair positions in DUNGEON_STATE
  6. Player interaction to use stairs
- **Dependencies:** Foundry for floor transition logic
- **Estimated Effort:** 6-8 hours

#### C-1.2: Spawn Patterns System
- **Files:** `js/generation/enemy-spawner.js`
- **Description:** Add tactical spawn patterns for interesting encounters
- **Requirements:**
  1. **Patrol pattern:** Enemies spawn along walls with patrol routes
  2. **Ambush pattern:** Enemies spawn behind cover/corners
  3. **Guard pattern:** Enemies spawn near treasure/shrines
  4. **Cluster pattern:** Group of 3-4 enemies for pack tactics
  5. Pattern selection based on room type and monster tier
  6. Fallback to random if pattern fails
- **Dependencies:** Warbringer for patrol AI behavior
- **Estimated Effort:** 6-8 hours

#### C-1.3: Difficulty Gradient
- **Files:** `js/generation/dungeon-generator.js`, `js/generation/enemy-spawner.js`
- **Description:** Scale difficulty from entrance to exit within each floor
- **Requirements:**
  1. Calculate room distance from entrance
  2. Scale enemy tier distribution by distance
  3. Scale enemy count by distance
  4. Place better loot in far rooms
  5. Boss/treasure rooms always far from entrance
- **Dependencies:** None
- **Estimated Effort:** 4-6 hours

### Tier 2 Features

#### C-2.1: Theme-Specific CA Rules
- **Files:** `js/generation/chamber-generator.js`
- **Description:** Vary cellular automata rules per element/theme
- **Requirements:**
  1. Fire theme: Higher wall chance, chaotic (B3/S3)
  2. Ice theme: Linear formations, fewer walls (B5/S4)
  3. Shadow theme: Dense clusters (B4/S5)
  4. Nature theme: Organic curves (B4/S4 with variation)
  5. Config object mapping theme to CA rules
- **Dependencies:** None
- **Estimated Effort:** 4-6 hours

#### C-2.2: Cover/Pillar Placement
- **Files:** `js/generation/chamber-generator.js`
- **Description:** Add tactical cover elements to rooms
- **Requirements:**
  1. Pillar placement algorithm (not blocking paths)
  2. 2-4 pillars per combat room
  3. Line-of-sight breaking for ranged combat
  4. Pillars don't spawn in doorways
  5. Optional destructible pillars
- **Dependencies:** Warbringer for cover-aware AI
- **Estimated Effort:** 4-6 hours

#### C-2.3: Extraction Point Enhancements
- **Files:** `js/generation/extraction-spawner.js`
- **Description:** Add difficulty ratings and visual hints
- **Requirements:**
  1. Difficulty rating per extraction (enemies nearby)
  2. Visual indicator of difficulty (color coding)
  3. Visible hints on mini-map when discovered
  4. Dynamic activation (some start inactive)
  5. Countdown timer display
- **Dependencies:** Glasswright for mini-map markers
- **Estimated Effort:** 4-6 hours

### Tier 3 Features

#### C-3.1: Boss Arena Variants
- **Files:** `js/generation/core-generator.js`
- **Description:** Multiple arena layouts for boss variety
- **Requirements:**
  1. Arena A: Current radial design
  2. Arena B: Rectangular with corner pillars
  3. Arena C: Cross-shaped with center platform
  4. Random selection per boss encounter
  5. Phase-based arena transformation (pillars rise/fall)
- **Dependencies:** None
- **Estimated Effort:** 6-8 hours

#### C-3.2: Wave-Based Spawn Points
- **Files:** `js/systems/spawn-point-system.js`
- **Description:** Add wave mechanics to spawn points
- **Requirements:**
  1. Wave counter per spawn point
  2. Increasing difficulty per wave
  3. Rest period between waves
  4. Wave completion bonus (loot/XP)
  5. Endless mode option for challenge
- **Dependencies:** Warbringer for wave completion detection
- **Estimated Effort:** 4-6 hours

---

## WARBRINGER AGENT - Combat Features

### Tier 1 Features

#### W-1.1: Dodge Roll System
- **Files:** NEW: `js/systems/dodge-system.js`, `js/entities/player.js`
- **Description:** Add active dodge mechanic with invincibility frames
- **Requirements:**
  1. Dodge input (Shift or Space key)
  2. 0.3s invincibility frames during roll
  3. 1.0s cooldown between dodges
  4. Stamina cost (if stamina system exists)
  5. Dodge animation (coordinate with Glasswright)
  6. Direction based on movement keys
- **Dependencies:** Glasswright for dodge animation
- **Estimated Effort:** 6-8 hours

#### W-1.2: Block/Parry System
- **Files:** `js/systems/combat-system.js`, `js/entities/player.js`
- **Description:** Add shield-based blocking and timed parry
- **Requirements:**
  1. Block input (hold right-click or dedicated key)
  2. Block reduces damage by shield's block value
  3. Stamina drain while blocking
  4. Parry window (first 0.2s of block)
  5. Successful parry: Negate damage, stagger enemy
  6. Shield bash follow-up after parry
- **Dependencies:** None
- **Estimated Effort:** 8-10 hours

#### W-1.3: Player Combo System
- **Files:** `js/systems/combat-system.js`
- **Description:** Expose enemy combo mechanic to player
- **Requirements:**
  1. Track player consecutive hits (2s window)
  2. Combo counter display (coordinate with Glasswright)
  3. 3rd hit: 1.5x damage multiplier
  4. Combo breaks on miss or taking damage
  5. Weapon-specific combo patterns (optional)
  6. Sound/visual feedback for combo
- **Dependencies:** Glasswright for combo counter UI
- **Estimated Effort:** 4-6 hours

### Tier 2 Features

#### W-2.1: Degradation UI Indicator
- **Files:** `js/systems/degradation-system.js`, `js/ui/hud.js`
- **Description:** Show floor quality indicator to explain degradation
- **Requirements:**
  1. Floor quality percentage display
  2. Color coding (green/yellow/red)
  3. Tooltip explaining degradation
  4. Warning when floor becomes "depleted"
  5. Integration with extraction decision
- **Dependencies:** Glasswright for HUD display
- **Estimated Effort:** 3-4 hours

#### W-2.2: Status Effect Expansion
- **Files:** `js/systems/status-effect-system.js`
- **Description:** Add freeze, shatter, and other ice effects
- **Requirements:**
  1. Freeze: Movement stopped for duration
  2. Chill: Movement slowed 50%
  3. Shatter: Bonus damage to frozen targets
  4. Warm: Immunity to freeze/chill
  5. Integration with ice monsters and weapons
- **Dependencies:** Lorekeeper for ice content
- **Estimated Effort:** 4-6 hours

#### W-2.3: AI Patrol Behavior
- **Files:** `js/systems/enemy-ai.js`
- **Description:** Add patrol routes for spawn pattern integration
- **Requirements:**
  1. Patrol waypoint system
  2. Loop/ping-pong patrol modes
  3. Alert state breaks patrol
  4. Return to patrol after losing target
  5. Patrol speed vs chase speed
- **Dependencies:** Cartographer for spawn patterns
- **Estimated Effort:** 4-6 hours

### Tier 3 Features

#### W-3.1: AI Debug Visualizer
- **Files:** NEW: `js/debug/ai-visualizer.js`
- **Description:** Development tool to visualize AI states
- **Requirements:**
  1. Toggle with F3 key
  2. Show current state above enemy
  3. Draw vision cones
  4. Draw patrol paths
  5. Show attack token status
  6. Frustration counter display
- **Dependencies:** None
- **Estimated Effort:** 4-6 hours

#### W-3.2: Armor Penetration Stat
- **Files:** `js/utils/damage-calculator.js`, weapon data files
- **Description:** Add armor penetration for late-game scaling
- **Requirements:**
  1. `armorPen` stat on weapons (0-50%)
  2. Reduces effective armor by percentage
  3. Epic/legendary weapons have higher armorPen
  4. Some monsters have armor pen reduction
  5. UI display of armor pen value
- **Dependencies:** Lorekeeper for weapon stat updates
- **Estimated Effort:** 3-4 hours

#### W-3.3: Glancing Blow System
- **Files:** `js/utils/damage-calculator.js`
- **Description:** Add near-miss feedback for close dodges
- **Requirements:**
  1. Calculate hit quality (center vs edge)
  2. Glancing blow: 50% damage reduction
  3. "Glancing!" text indicator
  4. Sound effect difference
  5. Affects both player and enemy attacks
- **Dependencies:** None
- **Estimated Effort:** 2-4 hours

---

## CANTOR AGENT - Audio Features

> **Note:** The entire audio system is new. Phase 1 included the foundational audio infrastructure. Phase 2 expands with advanced features.

### Tier 1 Features

#### A-1.1: Adaptive Music System
- **Files:** `js/audio/music-system.js` (enhancement)
- **Description:** Music responds dynamically to gameplay tension
- **Requirements:**
  1. Tension level tracking (0-100)
  2. Separate stems: base, tension, combat
  3. Crossfade stems based on thresholds
  4. Integration with combat state
  5. 2-4 second transitions
  6. Per-floor music themes
- **Dependencies:** Warbringer for tension events
- **Estimated Effort:** 8-10 hours

#### A-1.2: Spatial Audio System
- **Files:** `js/audio/spatial-audio.js` (from Phase 1)
- **Description:** Position-aware audio for immersion
- **Requirements:**
  1. Stereo panning based on source position
  2. Volume falloff with distance
  3. Integration with enemy sounds
  4. Extraction shaft directional hum
  5. Off-screen enemy indicators
- **Dependencies:** Cartographer for positions
- **Estimated Effort:** 4-6 hours

### Tier 2 Features

#### A-2.1: Monster Voice Sets
- **Files:** `js/data/audio-definitions.js`, monster data integration
- **Description:** Per-monster-type audio for personality
- **Requirements:**
  1. Idle sounds (ambient chittering, growling)
  2. Alert shout (enemy spots player)
  3. Attack grunt variations
  4. Hit reaction sounds
  5. Death cry
  6. 5-10 core monster types covered
- **Dependencies:** Lorekeeper for monster data, Warbringer for AI events
- **Estimated Effort:** 6-8 hours

#### A-2.2: Village Atmosphere Audio
- **Files:** `js/audio/ambient-system.js`
- **Description:** Dynamic village soundscape matching world state
- **Requirements:**
  1. State 1 (NORMAL): Birds, wind, distant chatter
  2. State 2 (ASH): Ominous wind, distant rumbles
  3. State 3 (BURNING): Fire crackle, screams, collapse
  4. State 4 (ENDGAME): Apocalyptic sounds
  5. Smooth crossfade between states
- **Dependencies:** Foundry for world state
- **Estimated Effort:** 4-6 hours

### Tier 3 Features

#### A-3.1: Surface-Aware Footsteps
- **Files:** `js/audio/sfx-system.js`
- **Description:** Footstep sounds vary by terrain
- **Requirements:**
  1. Stone: Hard clicks
  2. Dirt: Soft thuds
  3. Metal: Metallic clanks
  4. Water: Splashes
  5. Tile type detection
  6. Footstep timing sync with animation
- **Dependencies:** Cartographer for tile surface types
- **Estimated Effort:** 4-6 hours

#### A-3.2: Reverb Zones
- **Files:** `js/audio/spatial-audio.js`
- **Description:** Room-based reverb effects
- **Requirements:**
  1. Small room: Short reverb
  2. Large cavern: Long reverb
  3. Open area: No reverb
  4. Smooth transition between zones
  5. Convolution reverb or algorithmic
- **Dependencies:** None
- **Estimated Effort:** 4-6 hours

---

## Cross-Agent Features

These features require coordination between multiple agents.

### X-1: Complete Equipment System Expansion
- **Agents:** Lorekeeper (data), Foundry (slots), Glasswright (UI)
- **Description:** Add accessory slots (rings, amulets)
- **Total Effort:** 12-16 hours combined

### X-2: Tutorial System
- **Agents:** All
- **Description:** New player tutorial explaining mechanics
- **Components:**
  - Foundry: Tutorial state management
  - Lorekeeper: Tutorial dialogue/text
  - Glasswright: Tutorial UI overlays
  - Warbringer: Tutorial combat scenarios
  - Cartographer: Tutorial dungeon layout
  - Cantor: Tutorial audio cues
- **Total Effort:** 20-30 hours combined

### X-3: Bestiary System
- **Agents:** Lorekeeper (data), Glasswright (UI), Warbringer (kill tracking)
- **Description:** Monster encyclopedia unlocked through combat
- **Total Effort:** 8-12 hours combined

### X-4: Achievement System
- **Agents:** Foundry (tracking), Lorekeeper (definitions), Glasswright (UI)
- **Description:** Track and reward player accomplishments
- **Total Effort:** 12-16 hours combined

---

## Implementation Priority Matrix

### Must Have (MVP for Phase 2)

| ID | Feature | Agent | Impact |
|----|---------|-------|--------|
| W-1.1 | Dodge Roll | Warbringer | High - Core combat improvement |
| G-1.1 | Quest HUD | Glasswright | High - Navigation QoL |
| L-1.1 | Legendary Weapons | Lorekeeper | High - Endgame content |
| F-1.1 | Async Init | Foundry | High - Loading experience |
| A-1.1 | Adaptive Music | Cantor | High - Atmosphere |

### Should Have

| ID | Feature | Agent | Impact |
|----|---------|-------|--------|
| W-1.2 | Block System | Warbringer | Medium - Defensive options |
| W-1.3 | Player Combos | Warbringer | Medium - Combat depth |
| L-1.2 | Ice Monsters | Lorekeeper | Medium - Content gap |
| C-1.1 | Multi-Floor Stairs | Cartographer | Medium - Navigation |
| G-1.2 | BasePanel Class | Glasswright | Medium - Code quality |

### Nice to Have

| ID | Feature | Agent | Impact |
|----|---------|-------|--------|
| L-3.1 | Accessories | Lorekeeper | Low - Content expansion |
| W-3.1 | AI Visualizer | Warbringer | Low - Dev tool |
| G-3.1 | Accessibility | Glasswright | Low - Inclusion |
| C-3.1 | Boss Arenas | Cartographer | Low - Variety |

---

## Estimated Total Effort

| Agent | Tier 1 | Tier 2 | Tier 3 | Total |
|-------|--------|--------|--------|-------|
| Foundry | 16-24h | 14-20h | 8-12h | 38-56h |
| Lorekeeper | 13-18h | 11-16h | 10-15h | 34-49h |
| Glasswright | 18-26h | 16-24h | 10-16h | 44-66h |
| Cartographer | 16-22h | 12-18h | 10-14h | 38-54h |
| Warbringer | 18-24h | 11-16h | 9-14h | 38-54h |
| Cantor | 12-16h | 10-14h | 8-12h | 30-42h |
| **TOTAL** | **93-130h** | **74-108h** | **55-83h** | **222-321h** |

---

## Notes

1. **Phase 1 Completion Required:** Complete Phase 1 bug fixes before starting Phase 2 features
2. **Feature Flags:** Consider feature flags for gradual rollout
3. **Testing:** Each feature needs testing plan before implementation
4. **Audio Assets:** Cantor features require acquiring/creating audio assets
5. **Cross-Agent Dependencies:** Schedule dependent features accordingly

---

*Document prepared for The Shifting Chasm development team*
*Phase 2: Feature Implementation Plan*
