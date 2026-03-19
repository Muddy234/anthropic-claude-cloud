# Cantor Analysis: Audio & Sound Systems

**Agent:** Cantor (Audio & Sound Specialist)
**Date:** 2026-02-11
**Project:** The Shifting Chasm
**Analysis Type:** Comprehensive Audio System Assessment

---

## Executive Summary

**CRITICAL FINDING: The audio system does not exist.**

The Shifting Chasm currently operates as a completely silent game. No audio system files have been implemented. No audio asset directories exist. No audio data files have been created. The game has excellent visual feedback systems, particle effects, and UI polish, but **zero audio infrastructure**.

This represents a significant gap in the player experience. Audio is estimated to contribute 50% of "game feel" - combat impacts, environmental atmosphere, tension building, and UI feedback all depend on sound. The game is feature-rich but missing an entire sensory dimension.

### Current Audio Status

| Component | Status | Notes |
|-----------|--------|-------|
| `js/audio/audio-manager.js` | **MISSING** | Core audio engine not implemented |
| `js/audio/music-system.js` | **MISSING** | Adaptive music not implemented |
| `js/audio/sfx-system.js` | **MISSING** | Sound effects not implemented |
| `js/audio/ambient-system.js` | **MISSING** | Environmental audio not implemented |
| `js/audio/spatial-audio.js` | **MISSING** | Positional audio not implemented |
| `js/data/audio-definitions.js` | **MISSING** | Audio metadata not defined |
| `js/data/music-tracks.js` | **MISSING** | Music track data not defined |
| `assets/audio/` directory | **MISSING** | No audio asset infrastructure |

### Readiness Assessment

The codebase is **well-prepared** for audio integration despite having no implementation:

1. **Architecture Support**: SystemManager pattern is established - audio can register as a system
2. **Configuration Placeholder**: `AUDIO_CONFIG` exists in `constants.js` with volume settings
3. **Noise System**: `noise-system.js` provides game-logic "noise" that could trigger audio
4. **Event Hooks**: Multiple systems have `// TODO: Play sound` comments indicating integration points
5. **Atmosphere Effects**: `village-atmosphere.js` has visual effects that need matching audio

---

## File-by-File Analysis

### 1. `js/audio/audio-manager.js` - DOES NOT EXIST

**Status:** Missing entirely

**What Should Exist:**

The audio manager should be the core audio engine providing:

```javascript
// Proposed structure
const AudioManager = {
    name: 'AudioManager',
    priority: 5,  // Initialize early

    // Web Audio API core
    audioContext: null,
    masterGain: null,

    // Subsystems
    music: null,      // MusicSystem reference
    sfx: null,        // SFXSystem reference
    ambient: null,    // AmbientSystem reference

    // Configuration
    enabled: true,
    masterVolume: 1.0,

    // Methods
    init(game),           // Create AudioContext, setup gain staging
    update(dt),           // Tick subsystems
    suspend(),            // Pause audio (tab hidden, game paused)
    resume(),             // Resume audio
    setMasterVolume(v),   // 0.0 - 1.0
    cleanup()             // Destroy context, free resources
};
```

**Web Audio API Requirements:**
- Create `AudioContext` on user interaction (browser autoplay policy)
- Master gain node for global volume control
- Compressor for preventing clipping
- Analyzer node for visualization (optional)

**Critical Considerations:**
- AudioContext must be created AFTER user gesture (click to start)
- Must handle page visibility changes (pause when tab hidden)
- Mobile Safari requires webkit prefix checks
- Memory management for long-running sessions

---

### 2. `js/audio/music-system.js` - DOES NOT EXIST

**Status:** Missing entirely

**What Should Exist:**

Adaptive music system with tension-based layering:

```javascript
// Proposed structure
const MusicSystem = {
    // Track management
    tracks: {},           // Loaded AudioBufferSourceNodes
    currentTrack: null,

    // Layered stems
    stems: {
        base: null,       // Always playing
        tension: null,    // Combat proximity
        combat: null,     // Active combat
        boss: null        // Boss encounter
    },

    // State
    tensionLevel: 0,      // 0-100, drives stem mixing
    targetVolumes: {},    // Crossfade targets

    // Methods
    loadTrack(id),
    play(trackId, options),
    stop(fadeOut),
    setTensionLevel(level),  // 0 = exploration, 100 = boss fight
    crossfadeTo(trackId, duration),
    update(dt)
};
```

**Adaptive Music Requirements:**
- Separate stems that layer based on game state
- Smooth crossfades between states (2-4 second transitions)
- Tension level driven by:
  - Distance to enemies
  - Number of enemies in combat
  - Boss presence
  - Low HP
  - Shift/MELTDOWN timer

**Track Categories Needed:**
- Village theme (peaceful, hopeful)
- Exploration themes per floor tier (ambient, mysterious)
- Combat layers (percussion, intensity)
- Boss themes (unique per boss)
- Shift warning escalation
- Game over sting
- Victory fanfare

---

### 3. `js/audio/sfx-system.js` - DOES NOT EXIST

**Status:** Missing entirely

**What Should Exist:**

Sound effect playback with pooling and priority:

```javascript
// Proposed structure
const SFXSystem = {
    // Voice management
    maxVoices: 16,        // Simultaneous sounds
    voices: [],           // Active sound instances
    pool: [],             // Recycled AudioBufferSourceNodes

    // Sound bank
    sounds: {},           // Preloaded AudioBuffers

    // Priority queue
    priorities: {
        CRITICAL: 4,      // Player damage, death
        HIGH: 3,          // Combat hits, abilities
        MEDIUM: 2,        // Footsteps, interactions
        LOW: 1            // Ambient one-shots
    },

    // Methods
    preload(soundId),
    play(soundId, options),    // { volume, pitch, pan, priority }
    stop(soundId),
    stopAll(),
    update(dt)
};
```

**Sound Categories Needed:**

| Category | Examples | Count Estimate |
|----------|----------|----------------|
| **Combat - Player** | Sword swing (3 variations), bow release, spell cast, hit impact, parry | 15-20 |
| **Combat - Enemy** | Attack whoosh, hit receive, death cry (per type), ability sounds | 30-40 |
| **Movement** | Footsteps (stone, dirt, metal), door open/close, ladder climb | 10-15 |
| **UI** | Button click, panel open/close, notification, error, level up | 8-12 |
| **Items** | Pickup, equip, use potion, gold collect, chest open | 10-15 |
| **Environment** | Extraction shaft hum, collapse rumble, shift warning | 8-10 |
| **Boons/Skills** | Skill activate, cooldown ready, buff apply | 10-15 |

**Voice Limiting Strategy:**
1. Priority-based culling (low priority sounds dropped first)
2. Same-sound cooldown (prevent machine gun effect)
3. Distance-based culling (far sounds at lower priority)
4. Category limits (max 4 footsteps, max 2 UI sounds, etc.)

---

### 4. `js/audio/ambient-system.js` - DOES NOT EXIST

**Status:** Missing entirely

**What Should Exist:**

Layered environmental soundscapes:

```javascript
// Proposed structure
const AmbientSystem = {
    // Active layers
    layers: [],           // Currently playing ambient loops
    maxLayers: 4,         // Concurrent ambient sounds

    // Zone management
    currentZone: null,
    zoneDefinitions: {},  // Zone -> sound layers mapping

    // One-shot ambients
    oneShots: [],         // Random ambient events

    // Methods
    setZone(zoneId),      // Crossfade to new ambient
    addLayer(layerId),
    removeLayer(layerId),
    triggerOneShot(soundId, position),
    update(dt)
};
```

**Zone-Based Ambient Design:**

| Zone | Base Layer | Accent Layers | One-Shots |
|------|------------|---------------|-----------|
| Village (Normal) | Light wind | Birds, distant chatter | Door creak, dog bark |
| Village (Ash) | Deep wind | Crackling embers | Distant rumble |
| Village (Burning) | Roaring wind | Fire crackle, screams | Collapse, explosion |
| Dungeon Floor 1-2 | Cave drip | Distant monsters | Rock fall, skitter |
| Dungeon Floor 3-4 | Deep rumble | Lava bubble, vents | Steam burst |
| Dungeon Floor 5-6 | Void hum | Heartbeat, whispers | Scream, laugh |
| The Core | Pulsing bass | Machinery, energy | Voice fragments |

**Integration with VillageAtmosphere:**
The `village-atmosphere.js` system already handles visual world state changes (ashfall, embers, screen shake). Each visual state needs corresponding audio:
- State 1 (NORMAL): Peaceful village ambience
- State 2 (ASH): Unsettling wind, distant rumbles
- State 3 (BURNING): Fire sounds, collapse impacts
- State 4 (ENDGAME): Apocalyptic audio

---

### 5. `js/audio/spatial-audio.js` - DOES NOT EXIST

**Status:** Missing entirely

**What Should Exist:**

Position-aware audio for immersion:

```javascript
// Proposed structure
const SpatialAudio = {
    // Listener position (player)
    listenerX: 0,
    listenerY: 0,

    // Configuration
    maxDistance: 20,      // Tiles for full falloff
    rolloffFactor: 1.0,

    // Methods
    updateListener(x, y),
    playAt(soundId, x, y, options),
    calculatePanAndVolume(sourceX, sourceY),
    update(dt)
};
```

**Spatial Audio Features:**
- Stereo panning based on relative position
- Volume falloff with distance
- Integration with noise system (audio cue for noise events)
- Off-screen enemy indicator sounds
- Extraction shaft location cues

**Use Cases:**
1. Combat sounds positioned at enemy/player
2. Loot drop sounds at item location
3. Extraction shaft hum from direction
4. Environmental hazard warnings
5. Enemy alert shouts from source

---

### 6. `js/data/audio-definitions.js` - DOES NOT EXIST

**Status:** Missing entirely

**What Should Exist:**

Audio metadata definitions for all sounds:

```javascript
// Proposed structure
const AUDIO_DEFINITIONS = {
    // SFX definitions
    sfx: {
        sword_swing_1: {
            path: 'assets/audio/sfx/combat/sword_swing_1.ogg',
            volume: 0.8,
            pitchVariation: 0.1,
            priority: 'HIGH',
            cooldown: 100  // ms
        },
        footstep_stone: {
            path: 'assets/audio/sfx/movement/footstep_stone.ogg',
            volume: 0.5,
            pitchVariation: 0.15,
            priority: 'MEDIUM',
            cooldown: 200
        }
        // ... hundreds more
    },

    // Monster sound sets
    monsterSounds: {
        goblin: {
            idle: ['goblin_idle_1', 'goblin_idle_2'],
            alert: 'goblin_alert',
            attack: ['goblin_attack_1', 'goblin_attack_2'],
            hit: 'goblin_hit',
            death: 'goblin_death'
        }
        // ... per monster type
    },

    // UI sounds
    ui: {
        button_click: { path: '...', volume: 0.6 },
        panel_open: { path: '...', volume: 0.5 },
        notification: { path: '...', volume: 0.7 }
    }
};
```

---

### 7. `js/data/music-tracks.js` - DOES NOT EXIST

**Status:** Missing entirely

**What Should Exist:**

Music track definitions and stem configurations:

```javascript
// Proposed structure
const MUSIC_TRACKS = {
    village_peaceful: {
        stems: {
            base: 'assets/audio/music/village/base.ogg',
            melody: 'assets/audio/music/village/melody.ogg'
        },
        bpm: 90,
        loopPoint: 32.0,  // seconds
        fadeIn: 2.0,
        fadeOut: 2.0
    },

    dungeon_floor_1: {
        stems: {
            base: 'assets/audio/music/dungeon1/ambient.ogg',
            tension: 'assets/audio/music/dungeon1/tension.ogg',
            combat: 'assets/audio/music/dungeon1/combat.ogg'
        },
        bpm: 110,
        tensionThresholds: {
            tension: 30,  // Start tension stem at 30% tension
            combat: 70    // Start combat stem at 70% tension
        }
    },

    boss_malphas: {
        intro: 'assets/audio/music/boss/malphas_intro.ogg',
        loop: 'assets/audio/music/boss/malphas_loop.ogg',
        victory: 'assets/audio/music/boss/malphas_victory.ogg',
        bpm: 140
    }
};
```

---

### 8. `assets/audio/` Directory - DOES NOT EXIST

**Status:** No audio asset infrastructure

**Required Directory Structure:**

```
assets/audio/
  sfx/
    combat/
      sword_swing_1.ogg
      sword_swing_2.ogg
      bow_release.ogg
      spell_fire.ogg
      hit_flesh.ogg
      hit_armor.ogg
      parry.ogg
      ...
    movement/
      footstep_stone_1.ogg
      footstep_stone_2.ogg
      footstep_dirt.ogg
      door_open.ogg
      ...
    ui/
      click.ogg
      panel_open.ogg
      panel_close.ogg
      notification.ogg
      error.ogg
      levelup.ogg
      ...
    items/
      pickup_gold.ogg
      pickup_item.ogg
      equip_weapon.ogg
      use_potion.ogg
      chest_open.ogg
      ...
    environment/
      extraction_hum.ogg
      collapse.ogg
      shift_warning.ogg
      lava_bubble.ogg
      ...
    monsters/
      goblin/
        idle_1.ogg
        alert.ogg
        attack.ogg
        death.ogg
      skeleton/
        ...
      (per monster type)
  music/
    village/
      base.ogg
      melody.ogg
    dungeon1/
      ambient.ogg
      tension.ogg
      combat.ogg
    dungeon2/
      ...
    boss/
      malphas_intro.ogg
      malphas_loop.ogg
      core_boss_theme.ogg
    stings/
      gameover.ogg
      victory.ogg
      extraction_success.ogg
  ambient/
    village_peaceful.ogg
    village_ash.ogg
    village_burning.ogg
    dungeon_drip.ogg
    dungeon_deep.ogg
    void_hum.ogg
```

**Audio Format Recommendations:**
- **OGG Vorbis** for most sounds (good compression, universal support)
- **MP3** fallback for Safari compatibility
- **WAV** for very short UI sounds (faster decode)
- Bitrate: 128-192kbps for music, 96-128kbps for SFX
- Sample rate: 44.1kHz

---

## Existing Code Integration Points

### Active TODO Comments Requiring Audio

Found in `js/systems/extraction-system.js`:

```javascript
// Line 192
_onWarningStart(point) {
    // ...
    // TODO: Play warning sound
    // TODO: Add screen effect
}

// Line 209
_onCollapse(point) {
    // ...
    // TODO: Play collapse sound
    // TODO: Screen shake
}
```

### Systems Ready for Audio Integration

| System | File | Audio Hooks Needed |
|--------|------|-------------------|
| **Combat Master** | `combat-master.js` | Hit sounds, damage, death, ability sounds |
| **Noise System** | `noise-system.js` | Convert game "noise" to actual audio |
| **Extraction System** | `extraction-system.js` | Warning, collapse, success sounds |
| **Shift System** | `shift-system.js` | Escalating warning sounds |
| **Loot System** | `loot-system.js` | Pickup sounds, chest sounds |
| **Inventory System** | `inventory-system.js` | Equip, use item sounds |
| **Village System** | `village-system.js` | NPC interaction, building enter/exit |
| **Quest System** | `quest-system.js` | Quest accept, complete, update |
| **Skill System** | `skill-system.js` | Ability sounds, cooldown ready |
| **Hazard System** | `hazard-system.js` | Trap trigger, environmental damage |
| **Village Atmosphere** | `village-atmosphere.js` | Ambient soundscapes per world state |

### AUDIO_CONFIG in constants.js

Already exists as a placeholder:

```javascript
// Line 223-228 in js/core/constants.js
const AUDIO_CONFIG = {
    masterVolume: 1.0,
    musicVolume: 0.7,
    sfxVolume: 1.0,
    ambientVolume: 0.5
};
```

This provides a starting point but needs expansion:

```javascript
// Recommended expansion
const AUDIO_CONFIG = {
    masterVolume: 1.0,
    musicVolume: 0.7,
    sfxVolume: 1.0,
    ambientVolume: 0.5,
    uiVolume: 0.8,

    // Voice management
    maxVoices: 16,
    maxSameSound: 3,
    sameSoundCooldown: 50,  // ms

    // Spatial audio
    spatialEnabled: true,
    maxHearingDistance: 20,  // tiles

    // Adaptive music
    tensionFadeTime: 2.0,    // seconds
    musicCrossfade: 3.0,     // seconds

    // Performance
    preloadAll: false,       // Load on demand
    mobileOptimized: true    // Reduce polyphony on mobile
};
```

---

## Missing Features Analysis

### Critical (Must Have)

| Feature | Description | Effort |
|---------|-------------|--------|
| Audio Manager Core | Web Audio API setup, gain staging, lifecycle | 2-3 days |
| SFX Playback | Basic sound effect playing with pooling | 2-3 days |
| Combat Sounds | Hit impacts, abilities, death sounds | 2-3 days |
| UI Sounds | Button clicks, panel transitions | 1 day |
| Volume Controls | Settings UI, persistence | 1 day |

### High Priority

| Feature | Description | Effort |
|---------|-------------|--------|
| Background Music | Single-track music per area | 2 days |
| Ambient Loops | Environmental soundscapes | 2 days |
| Extraction Audio | Warning, collapse sounds | 1 day |
| Shift Audio | Escalating tension sounds | 1 day |

### Medium Priority

| Feature | Description | Effort |
|---------|-------------|--------|
| Adaptive Music | Tension-based stem layering | 3-4 days |
| Spatial Audio | Position-based panning | 2 days |
| Monster Voice Sets | Per-monster-type sounds | 3-4 days |
| Footstep Variation | Surface-aware movement sounds | 2 days |

### Low Priority (Polish)

| Feature | Description | Effort |
|---------|-------------|--------|
| Dynamic Music Stems | Full adaptive composition | 5+ days |
| Reverb Zones | Room-based reverb | 2 days |
| Audio Visualization | Analyzer-driven effects | 2 days |
| Accessibility Audio | Screen reader integration | 3 days |

---

## Priority Recommendations

### Phase 1: Foundation (High Priority)

**Week 1-2: Core Infrastructure**

1. Create `js/audio/` directory structure
2. Implement `audio-manager.js` with:
   - AudioContext creation (user gesture compliant)
   - Master gain staging
   - Page visibility handling
   - Mobile compatibility
3. Register with SystemManager
4. Add to `index.html` load order

**Week 2-3: Basic SFX**

1. Implement `sfx-system.js` with:
   - Sound preloading
   - Basic playback
   - Voice pooling (8-16 voices)
   - Priority system
2. Create `audio-definitions.js` with initial sounds
3. Source or create placeholder sounds for:
   - 3 combat hit sounds
   - 3 UI click sounds
   - 1 pickup sound
   - 1 level up sound

**Week 3-4: Combat Integration**

1. Add audio hooks to `combat-master.js`
2. Play hit sounds on damage dealt
3. Play death sounds on enemy death
4. Add ability cast sounds

### Phase 2: Atmosphere (Medium Priority)

**Week 5-6: Background Music**

1. Implement basic `music-system.js`:
   - Track loading
   - Play/stop with fade
   - Loop support
2. Add tracks for:
   - Village theme
   - Dungeon exploration
   - Combat music
   - Boss music

**Week 6-7: Ambient System**

1. Implement `ambient-system.js`:
   - Looping ambient layers
   - Zone-based switching
2. Create ambient soundscapes for:
   - Village (normal, ash, burning)
   - Dungeon floors
3. Integrate with `village-atmosphere.js`

### Phase 3: Polish (Lower Priority)

**Week 8-10: Advanced Features**

1. Adaptive music with tension stems
2. Spatial audio positioning
3. Full monster voice sets
4. Surface-aware footsteps
5. Audio settings UI

---

## Dependencies on Other Agents

### Required From Warbringer

1. **Combat Event Hooks**
   - `onDamageDealt(source, target, damage, element)`
   - `onEnemyDeath(enemy)`
   - `onPlayerDeath()`
   - `onAbilityUsed(ability, caster)`
   - `onTensionChange(level)`

2. **Extraction/Shift Events**
   - `onShaftWarning(shaft, timeRemaining)`
   - `onShaftCollapse(shaft)`
   - `onShiftWarning(stage)`
   - `onMeltdown()`

### Required From Glasswright

1. **UI Event Hooks**
   - `onButtonClick(buttonId)`
   - `onPanelOpen(panelId)`
   - `onPanelClose(panelId)`
   - `onNotification(type)`

2. **Animation Sync**
   - Frame timing for attack sounds
   - Footstep animation callbacks

### Required From Cartographer

1. **Zone Tagging**
   - Room ambient zone identifiers
   - Surface type per tile (for footsteps)
   - Extraction point positions (for spatial audio)

### Required From Lorekeeper

1. **Audio Metadata in Data Files**
   - Monster sound set IDs in `monsters-data.js`
   - Environment theme IDs in `room-themes.js`
   - Item use sounds in `items.js`

### Required From Foundry

1. **System Registration Review**
   - Verify AudioManager priority (should be early, ~5)
   - Confirm frame budget allocation for audio
   - Review state management integration

---

## Technical Considerations

### Browser Compatibility

| Browser | AudioContext | OGG Support | Notes |
|---------|-------------|-------------|-------|
| Chrome | Yes | Yes | Full support |
| Firefox | Yes | Yes | Full support |
| Safari | webkit prefix | No (use MP3) | Requires fallback |
| Edge | Yes | Yes | Full support |
| Mobile Chrome | Yes | Yes | Autoplay restrictions |
| Mobile Safari | webkit prefix | No | Stricter autoplay |

### Autoplay Policy Handling

```javascript
// Must be called from user gesture (click handler)
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
}
```

### Performance Budget

- Target: <1ms per frame for audio processing
- Max voices: 16 simultaneous
- Preload: Critical sounds only (~2MB)
- Lazy load: Music tracks, ambient (~5-10MB)

### Memory Management

- Reuse AudioBufferSourceNode instances
- Clear completed sounds from pools
- Unload unused music tracks
- Monitor for audio context leaks

---

## Asset Acquisition Strategy

### Options for Audio Assets

1. **Royalty-Free Libraries**
   - Freesound.org (CC licensed)
   - OpenGameArt.org
   - Kenney.nl (public domain)

2. **AI-Generated Audio**
   - Stable Audio for music
   - AudioGen for SFX
   - Requires cleanup and editing

3. **Commissioned**
   - Hire sound designer
   - Higher quality, custom fit
   - Budget: $500-2000 for full set

4. **Procedural Generation**
   - Web Audio oscillators for UI sounds
   - Noise-based ambient
   - Limited but free

### Recommended Approach

1. Start with placeholders from Kenney.nl (free, professional quality)
2. Iterate on game feel with temporary assets
3. Replace with custom assets when gameplay is locked

---

## Conclusion

The Shifting Chasm has zero audio implementation but is architecturally ready for audio integration. The SystemManager pattern, existing configuration placeholder, and clear integration points in gameplay systems make adding audio straightforward.

**Immediate Action Items:**

1. Create `js/audio/` directory
2. Implement minimal `audio-manager.js`
3. Add basic SFX for combat feedback
4. Source placeholder audio assets

**Estimated Total Effort:** 4-6 weeks for full audio system with adaptive music and spatial audio. 1-2 weeks for minimum viable audio (basic SFX and music).

**Risk Assessment:** Low technical risk (Web Audio API is mature), moderate effort, high impact on player experience.

---

*Analysis complete. Cantor standing by for implementation tasking.*

---

# IMPLEMENTATION PLAN

## Summary
- Total issues identified: 14
- Priority breakdown: Critical: 6, High: 4, Medium: 4, Low: 0
- **Note:** Unlike other agents, Cantor has NO existing code to fix. All items are new system creation.

## Issue Fix Queue

### Issue #1: Create Audio Directory Structure
- **File:** NEW: `js/audio/` directory, `assets/audio/` directory
- **Line(s):** N/A (new directories)
- **Problem:** No audio infrastructure exists; cannot add any audio until directory structure is in place
- **Fix:**
  1. Create `js/audio/` directory for system files
  2. Create `assets/audio/sfx/`, `assets/audio/music/`, `assets/audio/ambient/` directories
  3. Create subdirectories: `sfx/combat/`, `sfx/ui/`, `sfx/movement/`, `sfx/items/`, `sfx/monsters/`
  4. Add directories to .gitignore if needed (for large audio files)
- **Status:** [x] Fixed
- **Notes:** CRITICAL - Created js/audio/ directory with audio-manager.js and other files

### Issue #2: Implement Audio Manager Core
- **File:** NEW: `js/audio/audio-manager.js`
- **Line(s):** N/A (new file)
- **Problem:** No core audio engine; game is completely silent
- **Fix:**
  1. Create `AudioManager` system with Web Audio API
  2. Handle `AudioContext` creation on user gesture (click-to-start)
  3. Setup master gain node, compressor node
  4. Handle page visibility changes (pause when tab hidden)
  5. Add webkit prefix for Safari compatibility
  6. Register with SystemManager (priority: 5)
  7. Add to `index.html` load order
- **Status:** [x] Fixed
- **Notes:** CRITICAL - Implemented full AudioManager with gain staging, visibility handling, Safari support

### Issue #3: Implement SFX System
- **File:** NEW: `js/audio/sfx-system.js`
- **Line(s):** N/A (new file)
- **Problem:** No sound effects playback capability
- **Fix:**
  1. Create `SFXSystem` with voice pooling (16 max voices)
  2. Implement priority-based voice allocation
  3. Add same-sound cooldown to prevent machine-gun effect
  4. Support pitch variation for variety
  5. Implement distance-based priority for culling
  6. Create `play(soundId, options)` API
- **Status:** [x] Fixed
- **Notes:** CRITICAL - Implemented with voice pooling, priority culling, category limits, cooldowns

### Issue #4: Create Audio Definitions Data File
- **File:** NEW: `js/data/audio-definitions.js`
- **Line(s):** N/A (new file)
- **Problem:** No metadata defining sounds, paths, volumes, priorities
- **Fix:**
  1. Create `AUDIO_DEFINITIONS` constant with sfx, ui, monster sound definitions
  2. Define path, volume, pitchVariation, priority, cooldown per sound
  3. Create `MONSTER_SOUNDS` mapping monster types to sound sets
  4. Create `UI_SOUNDS` for interface audio
  5. Coordinate with Lorekeeper for monster sound set IDs in monster data
- **Status:** [x] Fixed
- **Notes:** CRITICAL - Created comprehensive definitions for combat, UI, environment, monster sounds

### Issue #5: Combat Sound Integration
- **File:** NEW: `js/audio/combat-audio.js` (hooks combat events)
- **Line(s):** Wraps handleDeath, onCombatHit, performMouseAttack, engageCombat
- **Problem:** Combat has no audio feedback; hits, abilities, deaths are silent
- **Fix:**
  1. Created `CombatAudio` module that hooks existing combat functions
  2. Plays weapon-appropriate swing sounds on attack
  3. Plays hit sounds (normal/critical) on damage
  4. Plays monster-specific death sounds
  5. Plays alert sounds when enemies notice player
- **Status:** [x] Fixed
- **Notes:** CRITICAL - Implemented via function wrapping to avoid modifying combat-master.js

### Issue #6: UI Sound Integration
- **File:** NEW: `js/audio/ui-audio.js`
- **Line(s):** Global event listeners, public API methods
- **Problem:** UI interactions are silent; no feedback for clicks, panels, notifications
- **Fix:**
  1. Created `UIAudio` module with automatic button click detection
  2. Provides playClick(), playOpen(), playClose(), playError(), etc.
  3. Added item pickup, equip, chest open sounds
  4. Added progression sounds (level up, quest complete)
  5. Added extraction and shift warning sounds
- **Status:** [x] Fixed
- **Notes:** CRITICAL - Provides global UI audio hooks plus manual API for specific sounds

### Issue #7: Implement Music System
- **File:** NEW: `js/audio/music-system.js`
- **Line(s):** N/A (new file)
- **Problem:** No background music capability
- **Fix:**
  1. Create `MusicSystem` with track loading and playback
  2. Implement play/stop with fade in/out
  3. Add loop point support
  4. Implement crossfade between tracks
  5. Create zone-based track switching (village, dungeon, boss)
- **Status:** [x] Fixed
- **Notes:** HIGH - Full MusicSystem implemented with async loading, crossfade, zone mapping, duck/pause/resume

### Issue #8: Create Music Tracks Data File
- **File:** NEW: `js/data/music-tracks.js`
- **Line(s):** N/A (new file)
- **Problem:** No music track definitions
- **Fix:**
  1. Create `MUSIC_TRACKS` constant with track configurations
  2. Define path, bpm, loopPoint, fadeIn, fadeOut per track
  3. Plan for future stems support (tension, combat layers)
  4. Source placeholder tracks (Kenney.nl or similar royalty-free)
- **Status:** [x] Fixed
- **Notes:** HIGH - 20+ tracks defined: village (4 states), dungeon floors, combat, boss, shift, stingers

### Issue #9: Implement Ambient System
- **File:** NEW: `js/audio/ambient-system.js`
- **Line(s):** N/A (new file)
- **Problem:** No environmental audio; no atmospheric soundscapes
- **Fix:**
  1. Create `AmbientSystem` with layered loop management
  2. Support 4 concurrent ambient layers
  3. Implement zone-based switching with crossfade
  4. Support one-shot ambient events (random distant sounds)
  5. Integrate with `village-atmosphere.js` for world state audio
- **Status:** [x] Fixed
- **Notes:** HIGH - Full zone definitions for village (4 states), dungeon tiers, combat, boss, shift. One-shot system with random triggers.

### Issue #10: Extraction/Shift Audio Integration
- **File:** `js/systems/extraction-system.js`, `js/systems/shift-system.js`
- **Line(s):**
  - extraction-system.js: ~line 192 (TODO: Play warning sound), ~line 209 (TODO: Play collapse sound)
  - shift-system.js: Warning events
- **Problem:** Extraction warnings and shift escalation have no audio; critical gameplay moments are silent
- **Fix:**
  1. Add audio hooks to existing TODO locations in extraction-system.js
  2. Create escalating shift warning sounds (3 intensity levels)
  3. Add extraction shaft hum (looping spatial audio)
  4. Add collapse/success sounds
  5. Coordinate with Warbringer for shift/extraction events
- **Status:** [x] Fixed
- **Notes:** HIGH - Added UIAudio calls and ScreenEffects.shake to extraction and shift systems. Escalating shift warnings at 2min, 1min, 30sec.

### Issue #11: Adaptive Music with Tension Stems
- **File:** `js/audio/music-system.js` (enhancement)
- **Line(s):** Stem management section
- **Problem:** Music is static; doesn't respond to gameplay tension
- **Fix:**
  1. Enhance MusicSystem with stem support (base, tension, combat layers)
  2. Track tension level (0-100) based on combat state
  3. Crossfade stems based on tension thresholds
  4. Integrate with Warbringer's tension events
  5. Smooth 2-4 second transitions between states
- **Status:** [ ] Pending
- **Notes:** MEDIUM - Enhancement to basic music; more complex implementation

### Issue #12: Implement Spatial Audio
- **File:** NEW: `js/audio/spatial-audio.js`
- **Line(s):** N/A (new file)
- **Problem:** All audio is mono/center; no positional awareness
- **Fix:**
  1. Create `SpatialAudio` module with listener tracking
  2. Calculate stereo panning based on source position relative to player
  3. Apply volume falloff with distance (max 20 tiles)
  4. Support playAt(soundId, x, y) API
  5. Use for: enemy sounds, loot drops, extraction shafts, hazards
- **Status:** [ ] Pending
- **Notes:** MEDIUM - Adds depth to audio; coordinate with Cartographer for positions

### Issue #13: Monster Voice Sets
- **File:** `js/data/audio-definitions.js` (data), `js/systems/enemy-ai.js` (hooks)
- **Line(s):** Monster sound definitions; AI state transition handlers
- **Problem:** Enemies are silent; no idle sounds, alert shouts, attack grunts, death cries
- **Fix:**
  1. Define sound sets per monster type: idle[], alert, attack[], hit, death
  2. Add audio hooks to enemy-ai.js state transitions:
     - IDLE -> random idle sound chance
     - REACTING -> alert shout
     - COMBAT -> attack grunt on attack
  3. Source/create sounds for 5-10 core monster types
  4. Coordinate with Lorekeeper for monster data integration
- **Status:** [ ] Pending
- **Notes:** MEDIUM - Significant content creation; coordinate with Lorekeeper + Warbringer

### Issue #14: Expand AUDIO_CONFIG in constants.js
- **File:** `js/core/constants.js`
- **Line(s):** ~223-240 (expanded AUDIO_CONFIG)
- **Problem:** AUDIO_CONFIG exists but is minimal; missing voice management, spatial, adaptive settings
- **Fix:**
  1. Add voice management: maxVoices, maxSameSound, sameSoundCooldown
  2. Add spatial settings: spatialEnabled, maxHearingDistance
  3. Add adaptive music: tensionFadeTime, musicCrossfade
  4. Add performance: preloadAll, mobileOptimized
  5. Integrate with settings UI for persistence
- **Status:** [x] Fixed
- **Notes:** MEDIUM - Expanded AUDIO_CONFIG with all recommended settings

---

# RUNNING LOG (Context Window Continuity)

## Current Position
- **Last Completed:** Issue #10 - Extraction/Shift Audio Integration
- **Currently Working On:** Issue #11 - Adaptive Music with Tension Stems (next session)
- **Next Up:** Issue #12 - Implement Spatial Audio

## Session Log
| Session | Date | Issues Fixed | Notes |
|---------|------|--------------|-------|
| 0 | 2025-02-11 | - | Implementation plan created |
| 1 | 2025-02-11 | #1, #2, #3, #4, #5, #6 | Created full audio foundation: AudioManager, SFXSystem, CombatAudio, UIAudio, audio-definitions.js. Updated index.html and constants.js. |
| 2 | 2025-02-11 | #7, #8, #9, #10 | Implemented MusicSystem with crossfade/zones, MUSIC_TRACKS data, AmbientSystem with layered loops, extraction/shift audio hooks. Updated index.html. |

## Quick Resume Instructions
If context window fills up, new session should:
1. Read this analysis file (CANTOR_ANALYSIS.md)
2. Check "Current Position" section above
3. Continue from "Currently Working On"
4. Files owned by Cantor: `js/audio/` (all files), `js/data/audio-definitions.js`, `js/data/music-tracks.js`, `assets/audio/` (all subdirectories)
5. NOTE: Cantor is building from ZERO - all files are NEW, not fixes to existing code

## Cross-Agent Dependencies (Critical)
Cantor requires hooks/events from other agents to integrate audio:
- **Warbringer:** Combat events (damage, death, ability), tension level, shift/extraction events
- **Glasswright:** UI events (click, panel open/close), animation timing for attack sounds
- **Cartographer:** Zone IDs, tile surface types, extraction point positions
- **Lorekeeper:** Monster sound set IDs in monster data, item use sound mappings
- **Foundry:** SystemManager registration approval, config pattern review

## Asset Acquisition Note
Audio assets must be acquired separately. Recommended:
1. Start with Kenney.nl (free, professional quality placeholders)
2. OpenGameArt.org for variety
3. Replace with custom assets after gameplay is finalized
