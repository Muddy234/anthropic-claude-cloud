# Work Package 08: Audio and Effects

## Objective
Port the entire audio pipeline (SFX, music, ambient) and visual effects systems (particles, melee slashes, monster attacks, village atmosphere) from JavaScript/Web Audio API to Godot 4.x native audio and particle nodes.

## Dependencies
- **WP01** (Project Foundation) -- AudioManager autoload, EventBus signals, Constants

## Source Files to Reference

### Audio System Files (6 files, ~3,494 lines)
| JS File | Lines | Purpose |
|---------|-------|---------|
| `js/audio/audio-manager.js` | 627 | Core engine: AudioContext, gain staging, subsystem coordination |
| `js/audio/sfx-system.js` | 662 | Voice pooling (16 max), priority culling, cooldown, categories |
| `js/audio/music-system.js` | 682 | BGM playback, crossfade, zone-based switching, loop points |
| `js/audio/ambient-system.js` | 734 | Layered ambient loops (4 max), zone definitions, one-shot events |
| `js/audio/combat-audio.js` | 515 | Combat event hooks: swing, hit, crit, block, death, alert |
| `js/audio/ui-audio.js` | 396 | UI feedback: click, hover, open/close, item, progression sounds |

### Audio Data Files (2 files, ~1,443 lines)
| JS File | Lines | Purpose |
|---------|-------|---------|
| `js/data/audio-definitions.js` | 1,089 | All SFX metadata: paths, volumes, pitch variation, cooldowns, monster sound sets |
| `js/data/music-tracks.js` | 354 | BGM track definitions: BPM, loop points, fade settings, zone mappings |

### Visual Effects Files (5 files, ~3,827 lines)
| JS File | Lines | Purpose |
|---------|-------|---------|
| `js/effects/particle-system.js` | 1,612 | Fire particles, cone particles, status effect visuals, object pooling |
| `js/effects/melee-slash-effect.js` | 589 | Cleave arc rendering with WINDUP/SLASH/FADE state machine |
| `js/effects/monster-attack-effects.js` | 648 | Magic burst and ranged projectile effects with travel/burst states |
| `js/effects/ability-effects-data.js` | 503 | Data-driven config for 20+ ability types (telegraph, impact, particles, camera, audio) |
| `js/effects/village-atmosphere.js` | 475 | Ashfall, ember rain, smoke overlay, screen tint, ground shake |

---

## Part A: Audio Architecture

### JS Audio Architecture (What We Are Porting)

The JS audio system uses the Web Audio API with this signal chain:

```
AudioBufferSourceNode(s)
    -> per-voice GainNode
        -> [optional StereoPannerNode]
            -> channel GainNode (sfxGain / musicGain / ambientGain / uiGain)
                -> masterGain
                    -> DynamicsCompressorNode (threshold:-6dB, ratio:4:1)
                        -> AudioContext.destination
```

Key architectural patterns from the JS source:

- **AudioManager** (`audio-manager.js`): Creates AudioContext on first user gesture (browser autoplay policy). Creates 5 GainNodes (master, music, sfx, ambient, ui). Links subsystems (SFX, Music, Ambient). Handles suspend/resume on tab visibility. Saves volume prefs to localStorage.
- **SFXSystem** (`sfx-system.js`): 16-voice pool with priority culling. 4 priority levels: CRITICAL(4), HIGH(3), MEDIUM(2), LOW(1). Per-category limits (combat:6, footstep:2, ui:3, ambient:4, monster:4). 50ms default cooldown between same sound. Pitch randomization via `pitchVariation` field. On-demand loading with failed-URL tracking.
- **MusicSystem** (`music-system.js`): Two AudioBufferSourceNodes for crossfading (current + next). Configurable loop points (loopStart/loopEnd per track). Zone-based automatic switching via `setZone()`. Default crossfade: 3.0 seconds. Music ducking for dialogue.
- **AmbientSystem** (`ambient-system.js`): Up to 4 concurrent looping layers per zone. Random one-shot events on a cooldown timer (15s base + random variance). 11 zone definitions (4 village states, 4 dungeon tiers, combat, boss, shift). Fade transitions between zones.

### Default Volume Levels (JS Source)
```
master:  1.0
music:   0.7
sfx:     1.0
ambient: 0.5
ui:      0.8
```

---

## Part B: Godot Audio Implementation

### Audio Bus Layout

Create in Godot Editor: Project > Project Settings > Audio > Bus Layout, or via `default_bus_layout.tres`:

```
Bus 0: Master        (volume_db: 0.0)
  |-- Bus 1: Music   (volume_db: -3.0)    # 0.7 linear ~ -3dB
  |-- Bus 2: SFX     (volume_db: 0.0)     # 1.0 linear
  |-- Bus 3: Ambient (volume_db: -6.0)    # 0.5 linear ~ -6dB
  |-- Bus 4: UI      (volume_db: -2.0)    # 0.8 linear ~ -2dB
```

Add a **Compressor** effect on the Master bus:
- Threshold: -6 dB
- Ratio: 4.0
- Attack: 3 ms
- Release: 100 ms

### Key Godot Audio Concepts

| JS Concept | Godot Equivalent |
|------------|-----------------|
| `AudioContext` | Godot audio server (automatic) |
| `AudioBufferSourceNode` | `AudioStreamPlayer` / `AudioStreamPlayer2D` |
| `GainNode` per channel | Audio bus with volume slider |
| `DynamicsCompressorNode` | Compressor effect on bus |
| `StereoPannerNode` | `AudioStreamPlayer2D` with spatial panning |
| `source.loop = true` | `stream.loop = true` on AudioStream resource |
| `source.loopStart/End` | `stream.loop_offset` (OGG Vorbis loop point metadata) |
| `source.playbackRate` | `AudioStreamPlayer.pitch_scale` |
| `gain.linearRampToValueAtTime` | `Tween` on `volume_db` property |
| Browser autoplay policy | Not needed in Godot (no restriction) |

### AudioManager Autoload (`autoload/audio_manager.gd`)

```gdscript
extends Node

## Audio Manager - coordinates all audio subsystems
## Autoload singleton (registered in WP01 project.godot)

# --- Bus indices (cache on ready) ---
var _bus_master: int
var _bus_music: int
var _bus_sfx: int
var _bus_ambient: int
var _bus_ui: int

# --- Volume settings (linear 0.0-1.0, converted to dB) ---
var volumes := {
    "master": 1.0,
    "music": 0.7,
    "sfx": 1.0,
    "ambient": 0.5,
    "ui": 0.8
}

# --- Subsystem references ---
var sfx_system: SFXManager
var music_system: MusicManager
var ambient_system: AmbientManager

# --- SFX voice pool ---
const MAX_VOICES := 16
var _voice_pool: Array[AudioStreamPlayer] = []
var _active_voices: Array[Dictionary] = []

func _ready() -> void:
    # Cache bus indices
    _bus_master = AudioServer.get_bus_index("Master")
    _bus_music = AudioServer.get_bus_index("Music")
    _bus_sfx = AudioServer.get_bus_index("SFX")
    _bus_ambient = AudioServer.get_bus_index("Ambient")
    _bus_ui = AudioServer.get_bus_index("UI")

    # Apply saved volume preferences
    _load_volume_preferences()
    _apply_volumes()

    # Create voice pool for SFX
    _create_voice_pool()

    # Initialize subsystems
    sfx_system = SFXManager.new(self)
    music_system = MusicManager.new(self)
    ambient_system = AmbientManager.new(self)
    add_child(sfx_system)
    add_child(music_system)
    add_child(ambient_system)

func _create_voice_pool() -> void:
    for i in MAX_VOICES:
        var player := AudioStreamPlayer.new()
        player.bus = "SFX"
        add_child(player)
        _voice_pool.append(player)

func _notification(what: int) -> void:
    if what == NOTIFICATION_APPLICATION_FOCUS_OUT:
        # Equivalent to JS suspend() on tab hidden
        AudioServer.set_bus_mute(_bus_master, true)
    elif what == NOTIFICATION_APPLICATION_FOCUS_IN:
        AudioServer.set_bus_mute(_bus_master, false)

# --- Volume control ---
func set_bus_volume(bus_name: String, linear: float) -> void:
    linear = clampf(linear, 0.0, 1.0)
    volumes[bus_name] = linear
    var bus_idx := AudioServer.get_bus_index(bus_name.capitalize())
    if bus_idx >= 0:
        AudioServer.set_bus_volume_db(bus_idx, linear_to_db(linear))
    _save_volume_preferences()

func _apply_volumes() -> void:
    for bus_name in volumes:
        set_bus_volume(bus_name, volumes[bus_name])

func _load_volume_preferences() -> void:
    # Load from ConfigFile (Godot equivalent of localStorage)
    var config := ConfigFile.new()
    if config.load("user://audio_settings.cfg") == OK:
        for key in volumes:
            volumes[key] = config.get_value("audio", key, volumes[key])

func _save_volume_preferences() -> void:
    var config := ConfigFile.new()
    for key in volumes:
        config.set_value("audio", key, volumes[key])
    config.save("user://audio_settings.cfg")

# --- Convenience SFX play ---
func play_sfx(sound_id: String, volume: float = 1.0, pitch: float = 1.0) -> void:
    sfx_system.play(sound_id, volume, pitch)
```

---

### SFX System (`scripts/systems/audio/sfx_manager.gd`)

Ports `sfx-system.js` (662 lines) + `audio-definitions.js` SFX data.

Key behaviors to replicate:
- **16-voice pool** with priority-based culling (CRITICAL > HIGH > MEDIUM > LOW)
- **Category limits**: combat:6, footstep:2, ui:3, ambient:4, monster:4
- **Cooldown**: 50ms default minimum between same SFX
- **Pitch randomization**: `pitch_scale = 1.0 + randf_range(-variation, variation)`
- **On-demand loading**: `ResourceLoader.load()` with caching
- **Variant selection**: `playRandom()` picks from array of sound IDs

```gdscript
class_name SFXManager
extends Node

enum Priority { LOW = 1, MEDIUM = 2, HIGH = 3, CRITICAL = 4 }

const CATEGORY_LIMITS := {
    "combat": 6, "footstep": 2, "ui": 3, "ambient": 4, "monster": 4
}

var _audio_mgr: Node  # AudioManager ref
var _sound_cache: Dictionary = {}  # sound_id -> AudioStream
var _last_play_time: Dictionary = {}  # sound_id -> msec
var _category_counts: Dictionary = {}  # category -> int
var _active_voices: Array[Dictionary] = []

func _init(audio_manager: Node) -> void:
    _audio_mgr = audio_manager

func play(sound_id: String, volume: float = 1.0, pitch: float = 1.0,
          priority: Priority = Priority.MEDIUM, category: String = "sfx",
          cooldown_ms: int = 50) -> void:
    # Check cooldown
    var now := Time.get_ticks_msec()
    if _last_play_time.has(sound_id):
        if now - _last_play_time[sound_id] < cooldown_ms:
            return

    # Check category limit
    var count: int = _category_counts.get(category, 0)
    if count >= CATEGORY_LIMITS.get(category, 8):
        return

    # Check voice limit / cull
    if _active_voices.size() >= _audio_mgr.MAX_VOICES:
        if not _try_cull(priority):
            return

    # Load or get cached stream
    var stream: AudioStream = _get_stream(sound_id)
    if not stream:
        return

    # Find free voice from pool
    var player: AudioStreamPlayer = _get_free_voice()
    if not player:
        return

    player.stream = stream
    player.volume_db = linear_to_db(volume)
    player.pitch_scale = pitch
    player.bus = "UI" if category == "ui" else "SFX"
    player.play()

    _last_play_time[sound_id] = now
    _category_counts[category] = count + 1
    _active_voices.append({
        "player": player,
        "sound_id": sound_id,
        "priority": priority,
        "category": category
    })

    player.finished.connect(_on_voice_finished.bind(player, category), CONNECT_ONE_SHOT)

func play_random(sound_ids: Array[String], volume: float = 1.0) -> void:
    if sound_ids.is_empty():
        return
    var idx := randi() % sound_ids.size()
    play(sound_ids[idx], volume)

func _on_voice_finished(player: AudioStreamPlayer, category: String) -> void:
    _category_counts[category] = maxi(0, _category_counts.get(category, 1) - 1)
    _active_voices = _active_voices.filter(func(v): return v.player != player)

func _try_cull(new_priority: Priority) -> bool:
    var lowest_pri := Priority.CRITICAL
    var cull_idx := -1
    for i in _active_voices.size():
        if _active_voices[i].priority < lowest_pri:
            lowest_pri = _active_voices[i].priority
            cull_idx = i
    if cull_idx >= 0 and new_priority > lowest_pri:
        _active_voices[cull_idx].player.stop()
        _active_voices.remove_at(cull_idx)
        return true
    return false

func _get_free_voice() -> AudioStreamPlayer:
    for player in _audio_mgr._voice_pool:
        if not player.playing:
            return player
    return null

func _get_stream(sound_id: String) -> AudioStream:
    if _sound_cache.has(sound_id):
        return _sound_cache[sound_id]
    var def: Dictionary = SFXDefinitions.get_definition(sound_id)
    if def.is_empty():
        return null
    var stream: AudioStream = load(def.path)
    if stream:
        _sound_cache[sound_id] = stream
    return stream
```

### SFX Definitions Resource (`scripts/data/sfx_definitions.gd`)

Ports `audio-definitions.js` (1,089 lines). Convert the JS object to a GDScript static class or a Resource file.

```gdscript
class_name SFXDefinitions
extends RefCounted

## All SFX metadata ported from audio-definitions.js
## Each entry: { path, volume, pitch_variation, priority, category, cooldown }

const DEFINITIONS := {
    # --- Combat: Melee Swings ---
    "sword_swing_1": { "path": "res://assets/audio/sfx/combat/sword_swing_1.ogg",
        "volume": 0.7, "pitch_variation": 0.1, "priority": 3, "category": "combat", "cooldown": 100 },
    "sword_swing_2": { "path": "res://assets/audio/sfx/combat/sword_swing_2.ogg",
        "volume": 0.7, "pitch_variation": 0.1, "priority": 3, "category": "combat", "cooldown": 100 },
    "sword_swing_3": { "path": "res://assets/audio/sfx/combat/sword_swing_3.ogg",
        "volume": 0.7, "pitch_variation": 0.1, "priority": 3, "category": "combat", "cooldown": 100 },

    # --- Combat: Impacts ---
    "hit_melee_1": { "path": "res://assets/audio/sfx/combat/hit_melee_1.ogg",
        "volume": 0.8, "pitch_variation": 0.15, "priority": 3, "category": "combat", "cooldown": 50 },
    "hit_melee_2": { "path": "res://assets/audio/sfx/combat/hit_melee_2.ogg",
        "volume": 0.8, "pitch_variation": 0.15, "priority": 3, "category": "combat", "cooldown": 50 },
    "hit_melee_3": { "path": "res://assets/audio/sfx/combat/hit_melee_3.ogg",
        "volume": 0.8, "pitch_variation": 0.15, "priority": 3, "category": "combat", "cooldown": 50 },
    "hit_critical": { "path": "res://assets/audio/sfx/combat/hit_critical.ogg",
        "volume": 0.9, "pitch_variation": 0.05, "priority": 3, "category": "combat", "cooldown": 100 },
    "hit_blocked": { "path": "res://assets/audio/sfx/combat/hit_blocked.ogg",
        "volume": 0.7, "pitch_variation": 0.1, "priority": 3, "category": "combat", "cooldown": 100 },

    # --- Combat: Ranged ---
    "bow_release": { "path": "res://assets/audio/sfx/combat/bow_release.ogg",
        "volume": 0.6, "pitch_variation": 0.1, "priority": 3, "category": "combat", "cooldown": 150 },

    # --- Combat: Magic ---
    "spell_fire": { "path": "res://assets/audio/sfx/combat/spell_fire.ogg",
        "volume": 0.8, "pitch_variation": 0.1, "priority": 3, "category": "combat", "cooldown": 100 },
    "spell_ice": { "path": "res://assets/audio/sfx/combat/spell_ice.ogg",
        "volume": 0.8, "pitch_variation": 0.1, "priority": 3, "category": "combat", "cooldown": 100 },
    "spell_lightning": { "path": "res://assets/audio/sfx/combat/spell_lightning.ogg",
        "volume": 0.9, "pitch_variation": 0.05, "priority": 3, "category": "combat", "cooldown": 100 },
    "spell_heal": { "path": "res://assets/audio/sfx/combat/spell_heal.ogg",
        "volume": 0.7, "pitch_variation": 0.1, "priority": 3, "category": "combat", "cooldown": 200 },

    # --- Player ---
    "player_hurt": { "path": "res://assets/audio/sfx/combat/player_hurt.ogg",
        "volume": 0.9, "pitch_variation": 0.1, "priority": 4, "category": "combat", "cooldown": 200 },
    "player_death": { "path": "res://assets/audio/sfx/combat/player_death.ogg",
        "volume": 1.0, "pitch_variation": 0.0, "priority": 4, "category": "combat", "cooldown": 1000 },

    # --- UI ---
    "ui_click": { "path": "res://assets/audio/sfx/ui/click.ogg",
        "volume": 0.5, "pitch_variation": 0.05, "priority": 2, "category": "ui", "cooldown": 50 },
    "ui_open": { "path": "res://assets/audio/sfx/ui/panel_open.ogg",
        "volume": 0.5, "pitch_variation": 0.0, "priority": 2, "category": "ui", "cooldown": 100 },
    "ui_close": { "path": "res://assets/audio/sfx/ui/panel_close.ogg",
        "volume": 0.5, "pitch_variation": 0.0, "priority": 2, "category": "ui", "cooldown": 100 },
    "ui_error": { "path": "res://assets/audio/sfx/ui/error.ogg",
        "volume": 0.6, "pitch_variation": 0.0, "priority": 2, "category": "ui", "cooldown": 200 },
    "level_up": { "path": "res://assets/audio/sfx/ui/level_up.ogg",
        "volume": 0.9, "pitch_variation": 0.0, "priority": 4, "category": "ui", "cooldown": 1000 },

    # ... (port remaining ~80 entries from AUDIO_DEFINITIONS.sfx and .ui)
}

## Variant groups (for playRandom)
const VARIANTS := {
    "sword_swing": ["sword_swing_1", "sword_swing_2", "sword_swing_3"],
    "hit_melee": ["hit_melee_1", "hit_melee_2", "hit_melee_3"],
    "footstep_stone": ["footstep_stone_1", "footstep_stone_2"],
    "footstep_dirt": ["footstep_dirt_1", "footstep_dirt_2"],
}

static func get_definition(sound_id: String) -> Dictionary:
    return DEFINITIONS.get(sound_id, {})

static func get_variant_group(group: String) -> Array:
    return VARIANTS.get(group, [])
```

**Porting note**: The JS `AUDIO_DEFINITIONS` contains ~80+ SFX entries across combat, player, movement, items, environment, abilities, progression, UI, and 7 monster sound sets. Port all of them following the pattern above. Each JS entry maps 1:1 -- just change `assets/audio/` paths to `res://assets/audio/`.

### Pitch Randomization

The JS system applies per-sound pitch variation:

```javascript
// JS: sfx-system.js
if (def?.pitchVariation) {
    const variation = (Math.random() - 0.5) * 2 * def.pitchVariation;
    opts.pitch += variation;
}
```

Godot equivalent -- apply before playing:

```gdscript
# In SFXManager.play():
var def := SFXDefinitions.get_definition(sound_id)
if def.has("pitch_variation") and def.pitch_variation > 0.0:
    pitch += randf_range(-def.pitch_variation, def.pitch_variation)
player.pitch_scale = pitch
```

**Alternative**: Use `AudioStreamRandomizer` resource in Godot 4.x. Wrap 2-4 stream variants in a single `AudioStreamRandomizer`, set `random_pitch` range. This handles both variant selection AND pitch jitter natively.

---

### Music System (`scripts/systems/audio/music_manager.gd`)

Ports `music-system.js` (682 lines) + `music-tracks.js` (354 lines).

#### Node Structure

```
MusicManager (Node)
  +-- MusicPlayerA (AudioStreamPlayer, bus="Music")
  +-- MusicPlayerB (AudioStreamPlayer, bus="Music")
```

Two players enable crossfading. Only one plays at a time (except during crossfade).

#### Music Track Data

Port `MUSIC_TRACKS` from `music-tracks.js`. The JS defines 15 tracks:

| Track ID | Name | BPM | Duration | Loop Start | Loop End | Fade In | Fade Out | Tags |
|----------|------|-----|----------|------------|----------|---------|----------|------|
| `village_peaceful` | Haven's Rest | 90 | 120s | 0 | 120 | 3.0 | 2.0 | village, peaceful |
| `village_ash` | Embers on the Wind | 75 | 90s | 0 | 90 | 2.5 | 2.5 | village, ash |
| `village_burning` | The Flames Rise | 120 | 60s | 0 | 60 | 1.0 | 1.5 | village, burning |
| `village_endgame` | Twilight of Hope | 60 | 180s | 8 | 180 | 4.0 | 3.0 | village, endgame |
| `dungeon_floor_1` | Into the Depths | 85 | 180s | 0 | 180 | 2.0 | 2.0 | dungeon, early |
| `dungeon_floor_2` | Whispers in Stone | 90 | 150s | 0 | 150 | 2.0 | 2.0 | dungeon, mid |
| `dungeon_floor_3` | The Core Beckons | 95 | 120s | 0 | 120 | 2.0 | 2.0 | dungeon, deep |
| `combat_theme` | Steel and Shadow | 130 | 90s | 0 | 90 | 0.5 | 1.5 | combat |
| `combat_intense` | Blood and Fire | 145 | 60s | 0 | 60 | 0.3 | 1.0 | combat, boss |
| `boss_theme` | Harbinger | 140 | 180s | 16 | 180 | 0.5 | 2.0 | boss |
| `boss_malphas` | Malphas, the Fallen | 150 | 210s | 20 | 210 | 0.5 | 2.0 | boss, malphas |
| `boss_core` | Heart of the Chasm | 160 | 240s | 24 | 240 | 1.0 | 3.0 | boss, final |
| `shift_imminent` | The Collapse | 140 | 90s | 0 | 90 | 0.5 | 1.0 | shift, urgent |
| `meltdown` | Protocol: MELTDOWN | 160 | 90s | 0 | 90 | 0.0 | 0.5 | shift, critical |
| `gameover` | Fallen | 60 | 8s | null | null | 0.0 | 2.0 | sting (no loop) |
| `victory` | Triumph | 100 | 10s | null | null | 0.0 | 2.0 | sting (no loop) |
| `level_up_fanfare` | Growth | 120 | 3s | null | null | 0.0 | 0.5 | sting (no loop) |

**Loop points**: In Godot, OGG Vorbis files support native loop metadata. Set `loop = true` and `loop_offset` in the `.import` settings, or encode the loop point into the OGG file itself. For tracks with `loopStart > 0` (boss_theme:16s, boss_malphas:20s, boss_core:24s, village_endgame:8s), the intro plays once, then loops from the offset.

#### Zone Mappings

Port from `MUSIC_TRACKS.zoneMappings`:

```gdscript
const ZONE_TO_TRACK := {
    # Village states
    "village": "village_peaceful",
    "village_normal": "village_peaceful",
    "village_ash": "village_ash",
    "village_burning": "village_burning",
    "village_endgame": "village_endgame",

    # Dungeon floors (grouped by tier)
    "dungeon_1": "dungeon_floor_1",
    "dungeon_2": "dungeon_floor_1",
    "dungeon_3": "dungeon_floor_2",
    "dungeon_4": "dungeon_floor_2",
    "dungeon_5": "dungeon_floor_3",
    "dungeon_6": "dungeon_floor_3",

    # Combat
    "combat": "combat_theme",
    "combat_intense": "combat_intense",

    # Boss encounters
    "boss": "boss_theme",
    "boss_generic": "boss_theme",
    "boss_malphas": "boss_malphas",
    "boss_core": "boss_core",

    # Shift states
    "shift_warning": "shift_imminent",
    "meltdown": "meltdown",

    # Game states
    "gameover": "gameover",
    "victory": "victory",
}
```

#### Crossfade Implementation

The JS crossfade (`music-system.js` lines 350-454) uses two AudioBufferSourceNodes with opposing linear gain ramps over `defaultCrossfade` (3.0s).

Godot equivalent using Tween:

```gdscript
class_name MusicManager
extends Node

var _player_a: AudioStreamPlayer
var _player_b: AudioStreamPlayer
var _active_player: AudioStreamPlayer  # Currently audible
var _current_track_id: String = ""
var _current_zone: String = ""

const DEFAULT_CROSSFADE := 3.0

func _ready() -> void:
    _player_a = $MusicPlayerA
    _player_b = $MusicPlayerB
    _player_a.bus = "Music"
    _player_b.bus = "Music"

func set_zone(zone_id: String) -> void:
    if zone_id == _current_zone:
        return
    _current_zone = zone_id
    var track_id: String = ZONE_TO_TRACK.get(zone_id, "")
    if track_id.is_empty() or track_id == _current_track_id:
        return
    crossfade_to(track_id)

func crossfade_to(track_id: String, duration: float = DEFAULT_CROSSFADE) -> void:
    var track_def: Dictionary = MusicTrackData.get_track(track_id)
    if track_def.is_empty():
        return

    var stream: AudioStream = load(track_def.path)
    if not stream:
        return

    # Determine which player is inactive
    var new_player: AudioStreamPlayer
    if _active_player == _player_a:
        new_player = _player_b
    else:
        new_player = _player_a

    # Configure new player
    new_player.stream = stream
    new_player.volume_db = -80.0  # Start silent
    new_player.play()

    # Crossfade with Tween
    var tween := create_tween().set_parallel(true)

    # Fade out old
    if _active_player and _active_player.playing:
        tween.tween_property(_active_player, "volume_db", -80.0, duration)
        # Stop old player after fade
        tween.chain().tween_callback(_active_player.stop)

    # Fade in new
    tween.tween_property(new_player, "volume_db", 0.0, duration)

    _active_player = new_player
    _current_track_id = track_id

## Music ducking (for dialogue)
func duck(duck_db: float = -10.0, duration_sec: float = 2.0, fade: float = 0.3) -> void:
    if not _active_player:
        return
    var original_db := _active_player.volume_db
    var tween := create_tween()
    tween.tween_property(_active_player, "volume_db", duck_db, fade)
    tween.tween_interval(duration_sec)
    tween.tween_property(_active_player, "volume_db", original_db, fade)
```

---

### Ambient System (`scripts/systems/audio/ambient_manager.gd`)

Ports `ambient-system.js` (734 lines).

#### Key Design

- Up to **4 concurrent AudioStreamPlayer nodes** for ambient layers
- Each zone defines 1-3 looping layers + optional one-shot random events
- One-shot timer: 15s base + random(-5, +5) variance between triggers
- Zone transitions fade all layers out, then start new layers

#### Zone Definitions (from JS source)

Port the `zoneDefinitions` object. Each zone has `layers[]` and `oneShots[]`:

| Zone | Layers | One-Shots |
|------|--------|-----------|
| `village_normal` | village_ambience(0.5), birds_distant(0.3) | dog_bark(10%), door_creak(8%), chatter_distant(12%) |
| `village_ash` | wind_eerie(0.5), embers_crackle(0.35) | rumble_distant(15%), wood_creak(10%) |
| `village_burning` | fire_roar(0.6), wind_harsh(0.4) | collapse_distant(20%), scream_distant(10%) |
| `village_endgame` | void_hum(0.4), wind_mournful(0.35) | whisper(12%), heartbeat(8%) |
| `dungeon_early` | cave_drip(0.4), dungeon_ambience(0.5) | rock_fall_small(10%), skitter(12%), chains_rattle(6%) |
| `dungeon_mid` | deep_rumble(0.45), lava_bubble_loop(0.35) | steam_burst(12%), rock_fall_large(8%), monster_distant(10%) |
| `dungeon_deep` | void_pulse(0.5), machinery_hum(0.35) | whisper_eldritch(15%), energy_crackle(10%), scream_distant(5%) |
| `dungeon_core` | core_pulse(0.6), energy_surge(0.4), heartbeat_slow(0.35) | voice_fragment(18%), reality_tear(8%) |
| `combat` | combat_tension(0.3) | (none) |
| `boss` | boss_presence(0.4) | power_surge(10%) |
| `shift` | earthquake_rumble(0.5), collapse_ambient(0.45) | collapse_distant(25%), lava_surge(15%) |

The JS ambient system defines **44 unique ambient sound IDs** with paths under `assets/audio/ambient/`.

#### Game State to Zone Mapping (from JS)

```gdscript
## Maps game state + context to ambient zone
static func get_zone_for_state(game_state: String, floor: int = 1,
                                village_state: int = 1) -> String:
    match game_state:
        "village":
            match village_state:
                1: return "village_normal"
                2: return "village_ash"
                3: return "village_burning"
                4: return "village_endgame"
        "playing", "dungeon":
            if floor <= 2: return "dungeon_early"
            if floor <= 4: return "dungeon_mid"
            if floor <= 6: return "dungeon_deep"
            return "dungeon_core"
        "combat": return "combat"
        "boss": return "boss"
        "shift", "meltdown": return "shift"
    return "dungeon_early"
```

#### Ambient Layer Node Structure

```
AmbientManager (Node)
  +-- AmbientLayer0 (AudioStreamPlayer, bus="Ambient")
  +-- AmbientLayer1 (AudioStreamPlayer, bus="Ambient")
  +-- AmbientLayer2 (AudioStreamPlayer, bus="Ambient")
  +-- AmbientLayer3 (AudioStreamPlayer, bus="Ambient")
  +-- OneShotPlayer (AudioStreamPlayer, bus="Ambient")
```

---

### Combat Audio Integration (`scripts/systems/audio/combat_audio.gd`)

Ports `combat-audio.js` (515 lines). In JS this works by monkey-patching global functions (`handleDeath`, `onCombatHit`, etc.). In Godot, use **signals** from EventBus instead.

```gdscript
class_name CombatAudioIntegration
extends Node

## Connect to combat signals from EventBus
func _ready() -> void:
    EventBus.combat_hit.connect(_on_combat_hit)
    EventBus.entity_died.connect(_on_entity_died)
    EventBus.combat_engaged.connect(_on_combat_engaged)
    EventBus.player_attacked.connect(_on_player_swing)

func _on_player_swing(weapon_type: String) -> void:
    var variants: Array = _get_swing_sounds(weapon_type)
    AudioManager.sfx_system.play_random(variants, 0.7)

func _on_combat_hit(attacker: Node, defender: Node, result: Dictionary) -> void:
    if result.get("is_crit", false):
        AudioManager.play_sfx("hit_critical", 0.9)
    elif result.get("is_hit", true):
        AudioManager.sfx_system.play_random(["hit_melee_1", "hit_melee_2", "hit_melee_3"], 0.8)
    else:
        AudioManager.play_sfx("hit_blocked", 0.7)

func _on_entity_died(entity: Node, killer: Node) -> void:
    if entity.is_in_group("player"):
        AudioManager.play_sfx("player_death", 1.0)
    else:
        var monster_type := _get_monster_sound_type(entity)
        AudioManager.play_sfx(monster_type + "_death", 0.8)

func _get_swing_sounds(weapon_type: String) -> Array:
    match weapon_type:
        "sword", "axe", "dagger":
            return SFXDefinitions.get_variant_group("sword_swing")
        "bow":
            return ["bow_release"]
        "magic":
            return ["spell_fire", "spell_ice", "spell_lightning"]
    return SFXDefinitions.get_variant_group("sword_swing")

func _get_monster_sound_type(entity: Node) -> String:
    # Maps entity to sound type (rat, skeleton, goblin, slime, orc, malphas, core_boss, generic)
    var type_str: String = entity.get("monster_type", "generic").to_lower()
    for known in ["rat", "skeleton", "goblin", "slime", "orc", "malphas", "core"]:
        if type_str.contains(known):
            return known
    return "generic"
```

### UI Audio Integration (`scripts/systems/audio/ui_audio.gd`)

Ports `ui-audio.js` (396 lines). Instead of monkey-patching DOM click events, connect to UI signals.

Key sounds to wire up:
- `ui_click` -- on button press (0.5 vol, 50ms debounce)
- `ui_hover` -- on button hover (0.3 vol, disabled by default for performance)
- `ui_open` / `ui_close` -- panel toggling
- `ui_error`, `ui_confirm`, `ui_cancel`, `ui_notification`, `ui_tab_switch`
- `item_pickup`, `gold_pickup`, `equip_weapon`, `equip_armor`, `chest_open`
- `level_up` (CRITICAL priority), `xp_gain`, `quest_complete`, `quest_update`
- `skill_ready`, `shift_warning_1/2/3`, `meltdown`

---

### Monster Sound Sets

The JS `AUDIO_DEFINITIONS.monsters` defines 7 monster types with per-action sound sets (idle, alert, attack, hit, death). Port as a lookup dictionary:

| Monster Type | Idle Variants | Alert | Attack Variants | Hit | Death | Special |
|-------------|---------------|-------|-----------------|-----|-------|---------|
| generic | 2 | 1 | 2 | 1 | 1 | -- |
| rat | 2 | 1 | 1 | 1 | 1 | -- |
| skeleton | 2 | 1 | 1 | 1 | 1 | -- |
| goblin | 2 | 1 | 2 | 1 | 1 | -- |
| slime | 2 | 1 | 1 | 1 | 1 | -- |
| orc | 2 | 1 | 2 | 1 | 1 | -- |
| malphas | 1 | 1 | 2 | 1 | 1 | 2 |
| core_boss | 1 | 1 | 1 | 1 | 1 | phase_change |

---

### Procedural Audio Note

The JS codebase generates some sounds procedurally using Web Audio API oscillators (e.g., UI beeps, shift warnings). These have **no audio files on disk** -- they are synthesized at runtime.

For Godot:
1. **Pre-render to .ogg/.wav files** using a tool like Audacity or a Python script with `numpy`/`scipy`
2. Or use Godot's `AudioStreamGenerator` for runtime synthesis (more complex, only if needed)

Recommended approach: Pre-render all procedural sounds to `.ogg` files and include them in `res://assets/audio/sfx/`. This is simpler, more performant, and easier to tune.

---

## Part C: Visual Effects

### JS Visual Effects Architecture (What We Are Porting)

The JS effects system renders directly to HTML5 Canvas using `ctx.beginPath()`, `ctx.arc()`, `ctx.fillStyle`, etc. Everything is procedural code-based rendering.

### Particle System (`particle-system.js`, 1,612 lines)

#### Key Components

1. **ParticleCanvas**: Dedicated overlay canvas (z-index 5, pointer-events: none)
2. **ParticlePool**: Pre-allocates particles, acquire/release with FIFO eviction
   - `MAX_PARTICLES = 250` global budget
3. **FireSpark / FireParticleSystem**: Fire particles for torches, braziers, campfires
   - Styles: torch(1 particle/tick), brazier(2), campfire(3), lantern(0), thermal_vent(4)
   - Color shifts from yellow to red over lifetime
4. **ConeParticle / ConeParticleSystem**: Breath attack particles
   - Types: flame, ice, poison -- each with unique colors and physics
   - Streaming particles emitted in a cone shape
5. **ParticleSystemManager**: Coordinates subsystems, provides `burst()` function
6. **StatusEffectVisualSystem**: Renders 18+ status effect overlays

#### Particle Type Mapping (JS -> Godot)

| JS Particle Type | Godot Node | Implementation Notes |
|-----------------|------------|---------------------|
| FireSpark (torch) | `GPUParticles2D` | Use `ParticleProcessMaterial`, gravity=-50, color ramp yellow->red |
| FireSpark (brazier) | `GPUParticles2D` | Same material, higher `amount` (2x torch) |
| FireSpark (campfire) | `GPUParticles2D` | Higher `amount` (3x torch), wider spread |
| ConeParticle (flame) | `GPUParticles2D` | Custom cone emission shape, fire colors |
| ConeParticle (ice) | `GPUParticles2D` | Cone emission, blue/cyan colors, slower speed |
| ConeParticle (poison) | `GPUParticles2D` | Cone emission, green colors, swirl motion |
| StatusEffect overlays | `Sprite2D` + shader | Per-entity overlay with animated shader |
| Damage number | `Label` + `Tween` | Float up + fade out |

#### MAX_PARTICLES Budget

The JS system caps at 250 total particles. In Godot, `GPUParticles2D` runs on the GPU and can handle significantly more. However, maintain a similar budget as a starting point:

```gdscript
# In a ParticleManager autoload or scene-level node:
const MAX_PARTICLE_EMITTERS := 50  # Active GPUParticles2D nodes
```

#### Status Effect Visuals

The JS `StatusEffectVisualSystem` renders visual indicators for 18 status effects. Port each as a shader or animated sprite overlay:

| Status Effect | JS Visual | Godot Implementation |
|--------------|-----------|---------------------|
| burning | Orange flicker, small flame particles | `GPUParticles2D` fire + modulate flash |
| poisoned | Green pulse, drip particles | Green modulate pulse via AnimationPlayer |
| bleeding | Red droplet particles | `GPUParticles2D` red droplets falling |
| chilled | Blue tint, frost particles | Blue modulate + frost particle overlay |
| frozen | Solid blue overlay, ice crystal | Sprite2D ice overlay + modulate = cyan |
| stunned | Yellow stars circling | Animated `Sprite2D` with star frames |
| rooted | Brown/green tendrils at feet | `GPUParticles2D` rising from base |
| fear | Dark screen flash, purple wisps | CanvasModulate pulse + particles |
| silenced | Red X icon above entity | `Sprite2D` icon overlay |
| weakened | Gray desaturation | Shader: reduce saturation |
| vulnerable | Red glow outline | Shader: outline with red tint |
| blinded | White overlay pulse | White modulate flash |
| regenerating | Green sparkle upward | `GPUParticles2D` green rising sparks |
| strengthened | Orange glow | Shader: orange additive outline |
| hastened | Blue speed lines | `GPUParticles2D` trailing lines |
| shielded | Blue bubble overlay | `Sprite2D` shield bubble + shader |
| invisible | Alpha fade to 0.3 | Set `modulate.a = 0.3` |
| sanctified | Golden glow, holy particles | `GPUParticles2D` golden sparkles |

---

### Melee Slash Effect (`melee-slash-effect.js`, 589 lines)

#### State Machine

```
WINDUP (0.15s) -> SLASH (0.2s) -> FADE (0.15s)
```

- **WINDUP**: Growing opacity, preparing the arc shape
- **SLASH**: Full arc rendered. Outer edge is fixed. Inner edge uses sine wave (thin->thick->thin) for cleave shape
- **FADE**: Decreasing opacity until removed

#### Weapon Type to Effect Mapping

From JS source:

```
sword      -> melee_swing pixel effect
knife      -> claw_swipe pixel effect
mace       -> heavy_slam pixel effect
hammer     -> heavy_slam pixel effect
axe        -> melee_swing pixel effect
spear      -> lunge pixel effect
dagger     -> claw_swipe pixel effect
staff      -> projectile_single pixel effect
bow        -> projectile_single pixel effect
unarmed    -> melee_swing pixel effect
```

#### Element Color Configurations

Used by both melee and magic effects:

| Element | Primary Color | Secondary Color | Glow Color |
|---------|--------------|-----------------|------------|
| fire | #FF6600 | #FF3300 | #FFaa00 |
| ice | #00BBFF | #0066FF | #88DDFF |
| water | #0088FF | #0044CC | #44AAFF |
| earth | #886622 | #664411 | #AA8844 |
| nature | #22CC22 | #118811 | #44FF44 |
| death | #880088 | #440044 | #CC44CC |
| holy | #FFD700 | #FFA500 | #FFEE88 |
| dark | #440066 | #220033 | #8800CC |
| arcane | #AA44FF | #6600CC | #CC88FF |

#### Godot Implementation

Use an `AnimatedSprite2D` or custom `Node2D` drawing:

```gdscript
class_name MeleeSlashEffect
extends Node2D

enum State { WINDUP, SLASH, FADE }

@export var arc_angle: float = 1.2  # radians (~70 degrees)
@export var radius: float = 48.0
@export var color: Color = Color.WHITE
@export var element_color: Color = Color.TRANSPARENT

var _state: State = State.WINDUP
var _timer: float = 0.0
var _direction: float = 0.0  # radians

const WINDUP_DURATION := 0.15
const SLASH_DURATION := 0.2
const FADE_DURATION := 0.15

func setup(dir: float, weapon_type: String, element: String = "") -> void:
    _direction = dir
    color = _get_element_color(element) if element else Color.WHITE

func _process(delta: float) -> void:
    _timer += delta
    match _state:
        State.WINDUP:
            if _timer >= WINDUP_DURATION:
                _state = State.SLASH
                _timer = 0.0
        State.SLASH:
            if _timer >= SLASH_DURATION:
                _state = State.FADE
                _timer = 0.0
        State.FADE:
            if _timer >= FADE_DURATION:
                queue_free()
                return
    queue_redraw()

func _draw() -> void:
    var alpha: float
    match _state:
        State.WINDUP: alpha = _timer / WINDUP_DURATION * 0.7
        State.SLASH: alpha = 0.7
        State.FADE: alpha = 0.7 * (1.0 - _timer / FADE_DURATION)

    # Draw arc (cleave shape)
    var draw_color := Color(color, alpha)
    var start_angle := _direction - arc_angle / 2.0
    var end_angle := _direction + arc_angle / 2.0
    var points := PackedVector2Array()
    var segments := 16

    # Outer arc
    for i in range(segments + 1):
        var t := float(i) / float(segments)
        var angle := lerpf(start_angle, end_angle, t)
        points.append(Vector2.from_angle(angle) * radius)

    # Inner arc (sine wave for thickness variation)
    for i in range(segments, -1, -1):
        var t := float(i) / float(segments)
        var angle := lerpf(start_angle, end_angle, t)
        var inner_r := radius * 0.4 * (1.0 + 0.3 * sin(t * PI))
        points.append(Vector2.from_angle(angle) * inner_r)

    draw_colored_polygon(points, draw_color)
```

---

### Monster Attack Effects (`monster-attack-effects.js`, 648 lines)

#### MonsterMagicEffect

State machine: `travel -> burst`

- **Travel phase**: Small orb with radial gradient moves from caster to target
- **Burst phase**: Expanding ring at impact location

#### MonsterRangedEffect

State machine: `travel -> fade`

- **Travel phase**: Arrow/projectile shape with trail particles
- **Fade phase**: Quick opacity decrease at impact

#### Godot Implementation

Use scene-based effects:

```
effects/
  monster_magic_effect.tscn    # Node2D with GPUParticles2D + AnimationPlayer
  monster_ranged_effect.tscn   # Node2D with Sprite2D + trail particles
```

For the travel phase, use a `Tween` to move the effect node from source to target position:

```gdscript
class_name MonsterMagicEffect
extends Node2D

var _source_pos: Vector2
var _target_pos: Vector2
var _element: String

func fire(source: Vector2, target: Vector2, element: String = "fire") -> void:
    _source_pos = source
    _target_pos = target
    _element = element
    global_position = source

    # Travel to target
    var distance := source.distance_to(target)
    var travel_time := distance / 300.0  # pixels per second

    var tween := create_tween()
    tween.tween_property(self, "global_position", target, travel_time)
    tween.tween_callback(_on_impact)

func _on_impact() -> void:
    # Play burst particles
    $BurstParticles.emitting = true
    $BurstParticles.color = _get_element_color(_element)
    # Play impact sound
    AudioManager.play_sfx("ability_projectile_impact")
    # Remove after burst completes
    await get_tree().create_timer(0.5).timeout
    queue_free()
```

---

### Ability Effects Data (`ability-effects-data.js`, 503 lines)

The JS `ABILITY_EFFECTS` object defines 20+ enemy ability types with data-driven configuration. Each ability specifies:

- **type**: melee_arc, circle_aoe, line_charge, cone_breath, projectile, beam
- **telegraph**: duration, color, shape
- **impact**: sound, screen shake intensity, particles
- **particles**: type, color, count, speed, lifetime
- **camera**: shake intensity, duration
- **audio**: charge sound, impact sound, loop sound

#### Ability Categories

| Category | Abilities | Key Properties |
|----------|-----------|---------------|
| Melee Arc | melee_swing, claw_swipe, bite, double_strike, tail_whip, sweep | arc_angle, radius |
| Circle AoE | ground_slam, heavy_slam, stomp, pounce | radius, casterMovement (leap) |
| Line/Charge | charge, bull_rush, lunge | dash distance, wallCollision, afterimages |
| Cone/Breath | fire_breath, frost_breath, poison_cloud | cone_angle, channel duration, linger |
| Projectile | homing_orb, projectile_burst, projectile_single, web_shot | speed, homing, count |
| Beam | life_drain, void_beam | tracking, reverse particle flow |

Each ability has both a **telegraph** sound (charge/buildup) and an **impact** sound. Example from JS:

```
melee_swing: {
    telegraph: { sound: "ability_melee_charge", duration: 0.3 },
    impact: { sound: "ability_melee_hit", shake: 0.2 }
}
fire_breath: {
    telegraph: { sound: "ability_breath_inhale", duration: 0.5 },
    channel: { sound: "ability_fire_breath_loop", duration: 1.5 },
    impact: { sound: "ability_projectile_impact" }
}
```

Port as a `Dictionary` constant or a `Resource` class in Godot.

---

### Village Atmosphere (`village-atmosphere.js`, 475 lines)

#### Components

| JS Object | Purpose | World States |
|-----------|---------|-------------|
| `AshfallEffect` | Falling ash particles | State 2 (ASH) |
| `EmberRainEffect` | Rising ember particles | State 3+ (BURNING) |
| `SmokeOverlay` | Radial dark gradient overlay | State 3 (BURNING) |
| `ScreenTint` | Full-screen color tint | State 3-4 |
| `GroundShake` | Periodic camera offset | State 3-4 |
| `VillageAtmosphere` | Manager, dispatches world state changes | All |

#### Ashfall Effect (World State 2: ASH)

- Max 100 particles
- Gray ellipses (#9B9B9B, #8B8B8B)
- Fall speed: 15-40 px/s, drift: -10 to +20 px/s
- Gentle sine-wave sway
- Spawn rate controlled by density (default 0.3)

Godot: `GPUParticles2D` with `ParticleProcessMaterial`:
- Direction: (0, 1, 0) (downward)
- Gravity: (0, 25, 0)
- Initial velocity: 15-40
- Spread: 180 degrees horizontal
- Color: Gray
- Lifetime: calculated from screen height / speed

#### Ember Rain Effect (World State 3: BURNING)

- Max 150 particles
- Orange/red/gold colors (#FF4500, #FF6347, #FF8C00, #FFA500, #FFD700)
- **Rise** from bottom (negative Y velocity: -20 to -40 px/s)
- Life-based fade, glow flicker
- White core, colored glow halo

Godot: `GPUParticles2D`:
- Direction: (0, -1, 0) (upward)
- Gravity: (0, -30, 0)
- Color ramp: white core -> orange/red -> transparent
- Draw order: Back to front for glow layering

#### Smoke Overlay (World State 3)

Radial gradient from center (clear) to edges (dark, opacity 0.15). Scrolls slowly.

Godot: `ColorRect` with a custom shader:
```glsl
shader_type canvas_item;
uniform float opacity : hint_range(0.0, 1.0) = 0.15;

void fragment() {
    vec2 uv = UV - vec2(0.5);
    float dist = length(uv) / 0.7;
    float alpha = smoothstep(0.0, 1.0, dist) * opacity;
    COLOR = vec4(0.12, 0.08, 0.04, alpha);
}
```

#### Screen Tint

Full-screen `ColorRect` with RGBA. Default burning tint: `Color(1.0, 0.39, 0.2, 0.2)`.

#### Ground Shake

Periodic camera offset every 2 seconds. Intensity * 5 pixels random offset, decays by 0.9 per frame.

Godot: Apply to `Camera2D.offset` or use `Camera2D`'s built-in trauma/shake system.

#### VillageAtmosphere Manager

Listens for world state changes and activates/deactivates effects:

```gdscript
class_name VillageAtmosphereManager
extends Node

@onready var ashfall: GPUParticles2D = $AshfallParticles
@onready var embers: GPUParticles2D = $EmberRainParticles
@onready var smoke_overlay: ColorRect = $SmokeOverlay
@onready var screen_tint: ColorRect = $ScreenTint

func set_world_state(state: int) -> void:
    # Stop all
    ashfall.emitting = false
    embers.emitting = false
    smoke_overlay.visible = false
    screen_tint.visible = false

    match state:
        1:  # NORMAL
            pass  # All off
        2:  # ASH
            ashfall.emitting = true
        3:  # BURNING
            embers.emitting = true
            smoke_overlay.visible = true
            screen_tint.visible = true
            screen_tint.color = Color(1.0, 0.39, 0.2, 0.2)
        4:  # ENDGAME
            embers.emitting = true
            smoke_overlay.visible = true
            screen_tint.visible = true
            screen_tint.color = Color(0.3, 0.0, 0.3, 0.25)
```

---

## Part D: Audio File Organization

```
res://assets/audio/
  music/
    village/
      village_peaceful.ogg
      village_ash.ogg
      village_burning.ogg
      village_endgame.ogg
    dungeon/
      dungeon_floor_1.ogg
      dungeon_floor_2.ogg
      dungeon_floor_3.ogg
    combat/
      combat_theme.ogg
      combat_intense.ogg
    boss/
      boss_theme.ogg
      boss_malphas.ogg
      boss_core.ogg
    shift/
      shift_imminent.ogg
      meltdown.ogg
    stings/
      gameover.ogg
      victory.ogg
      level_up.ogg
  sfx/
    combat/
      sword_swing_1.ogg  (+ _2, _3)
      hit_melee_1.ogg    (+ _2, _3)
      hit_critical.ogg
      hit_blocked.ogg
      bow_release.ogg
      arrow_hit.ogg
      spell_fire.ogg
      spell_ice.ogg
      spell_lightning.ogg
      spell_heal.ogg
      player_hurt.ogg
      player_death.ogg
      player_dodge.ogg
      skill_activate.ogg
      skill_ready.ogg
      buff_apply.ogg
      debuff_apply.ogg
    movement/
      footstep_stone_1.ogg  (+ _2)
      footstep_dirt_1.ogg   (+ _2)
      door_open.ogg
      door_close.ogg
      stairs_descend.ogg
    items/
      item_pickup.ogg
      gold_pickup.ogg
      equip_weapon.ogg
      equip_armor.ogg
      use_potion.ogg
      chest_open.ogg
    environment/
      shaft_warning.ogg
      shaft_collapse.ogg
      shift_warning_1.ogg  (+ _2, _3)
      meltdown.ogg
      rumble.ogg
      lava_bubble.ogg
    abilities/
      melee_charge.ogg
      claw_charge.ogg
      bite_charge.ogg
      whoosh_charge.ogg
      heavy_charge.ogg
      slam_charge.ogg
      heavy_slam_charge.ogg
      stomp_charge.ogg
      pounce_charge.ogg
      charge_windup.ogg
      lunge_charge.ogg
      breath_inhale.ogg
      projectile_charge.ogg
      web_charge.ogg
      drain_charge.ogg
      beam_charge.ogg
      melee_hit.ogg
      claw_hit.ogg
      bite_hit.ogg
      whoosh_hit.ogg
      heavy_hit.ogg
      slam_impact.ogg
      heavy_slam_impact.ogg
      stomp_impact.ogg
      pounce_land.ogg
      charge_hit.ogg
      charge_heavy_hit.ogg
      lunge_hit.ogg
      projectile_impact.ogg
      web_hit.ogg
      fire_breath_loop.ogg
      frost_breath_loop.ogg
      poison_cloud_loop.ogg
      breath_loop.ogg
      drain_loop.ogg
      beam_loop.ogg
    ui/
      click.ogg
      hover.ogg
      panel_open.ogg
      panel_close.ogg
      error.ogg
      notification.ogg
      confirm.ogg
      cancel.ogg
      tab_switch.ogg
      level_up.ogg
      xp_gain.ogg
      quest_complete.ogg
      quest_update.ogg
    monsters/
      generic/
        idle_1.ogg, idle_2.ogg
        alert.ogg
        attack_1.ogg, attack_2.ogg
        hit.ogg
        death.ogg
      rat/
        idle_1.ogg, idle_2.ogg, alert.ogg, attack.ogg, hit.ogg, death.ogg
      skeleton/
        rattle_1.ogg, rattle_2.ogg, alert.ogg, attack.ogg, hit.ogg, death.ogg
      goblin/
        idle_1.ogg, idle_2.ogg, alert.ogg, attack_1.ogg, attack_2.ogg, hit.ogg, death.ogg
      slime/
        squish_1.ogg, squish_2.ogg, alert.ogg, attack.ogg, hit.ogg, death.ogg
      orc/
        grunt_1.ogg, grunt_2.ogg, alert.ogg, attack_1.ogg, attack_2.ogg, hit.ogg, death.ogg
      boss/
        malphas_idle.ogg, malphas_alert.ogg
        malphas_attack_1.ogg, malphas_attack_2.ogg
        malphas_hit.ogg, malphas_death.ogg
        malphas_special_1.ogg, malphas_special_2.ogg
        core_idle.ogg, core_alert.ogg, core_attack.ogg
        core_hit.ogg, core_death.ogg, core_phase_change.ogg
  ambient/
    village/
      village_ambience.ogg
      birds_distant.ogg
      dog_bark.ogg
      door_creak.ogg
      chatter_distant.ogg
      wind_eerie.ogg
      embers_crackle.ogg
      rumble_distant.ogg
      wood_creak.ogg
      fire_roar.ogg
      wind_harsh.ogg
      collapse_distant.ogg
      scream_distant.ogg
      wind_mournful.ogg
    dungeon/
      cave_drip.ogg
      dungeon_ambience.ogg
      rock_fall_small.ogg
      rock_fall_large.ogg
      skitter.ogg
      chains_rattle.ogg
      deep_rumble.ogg
      lava_bubble_loop.ogg
      steam_burst.ogg
      monster_distant.ogg
      void_pulse.ogg
      void_hum.ogg
      machinery_hum.ogg
      whisper.ogg
      whisper_eldritch.ogg
      energy_crackle.ogg
      heartbeat.ogg
      heartbeat_slow.ogg
      core_pulse.ogg
      energy_surge.ogg
      voice_fragment.ogg
      reality_tear.ogg
    combat/
      combat_tension.ogg
      boss_presence.ogg
      power_surge.ogg
    shift/
      earthquake_rumble.ogg
      collapse_ambient.ogg
      lava_surge.ogg
```

**Total audio files**: ~170 files across music (17), SFX (~100), ambient (~44), and monster sounds (~50 with variants).

---

## Part E: Output Files Summary

### Scripts to Create

| File | Ports From | Purpose |
|------|-----------|---------|
| `autoload/audio_manager.gd` | `audio-manager.js` | Autoload: bus control, voice pool, subsystem init |
| `scripts/systems/audio/sfx_manager.gd` | `sfx-system.js` | SFX voice pooling, priority, cooldown |
| `scripts/systems/audio/music_manager.gd` | `music-system.js` | BGM crossfade, zone switching |
| `scripts/systems/audio/ambient_manager.gd` | `ambient-system.js` | Layered ambient, one-shots |
| `scripts/systems/audio/combat_audio.gd` | `combat-audio.js` | Combat event -> SFX wiring |
| `scripts/systems/audio/ui_audio.gd` | `ui-audio.js` | UI event -> SFX wiring |
| `scripts/data/sfx_definitions.gd` | `audio-definitions.js` | All SFX metadata |
| `scripts/data/music_track_data.gd` | `music-tracks.js` | BGM track metadata + zone mappings |
| `scripts/data/ambient_zone_data.gd` | `ambient-system.js` zoneDefinitions | Ambient zone configs |
| `scripts/data/ability_effects_data.gd` | `ability-effects-data.js` | Ability telegraph/impact/particle configs |

### Scenes to Create

| File | Ports From | Purpose |
|------|-----------|---------|
| `scenes/effects/melee_slash.tscn` | `melee-slash-effect.js` | Arc slash visual |
| `scenes/effects/monster_magic.tscn` | `monster-attack-effects.js` | Magic orb travel + burst |
| `scenes/effects/monster_ranged.tscn` | `monster-attack-effects.js` | Projectile travel + trail |
| `scenes/effects/damage_number.tscn` | particle-system.js burst | Float-up damage text |
| `scenes/effects/status_effect_overlay.tscn` | particle-system.js StatusEffectVisualSystem | Per-entity status visuals |
| `scenes/atmosphere/village_atmosphere.tscn` | `village-atmosphere.js` | Ashfall, embers, overlays |

### Resources to Create

| File | Purpose |
|------|---------|
| `default_bus_layout.tres` | Master > Music, SFX, Ambient, UI buses |
| `resources/particles/fire_spark.tres` | ParticleProcessMaterial for torches |
| `resources/particles/ashfall.tres` | ParticleProcessMaterial for ash |
| `resources/particles/ember_rain.tres` | ParticleProcessMaterial for embers |
| `resources/particles/cone_flame.tres` | Cone-shaped fire breath particles |
| `resources/particles/cone_ice.tres` | Cone-shaped frost breath particles |
| `resources/particles/cone_poison.tres` | Cone-shaped poison breath particles |

---

## Verification Checklist

### Audio System
- [ ] Audio bus layout created: Master, Music, SFX, Ambient, UI
- [ ] Compressor effect on Master bus (threshold:-6dB, ratio:4:1)
- [ ] AudioManager autoload registered and initializes on game start
- [ ] Volume levels persist across sessions (ConfigFile)
- [ ] App focus out/in mutes/unmutes audio
- [ ] SFX voice pool: 16 max, priority culling works
- [ ] SFX cooldown: same sound blocked within 50ms
- [ ] SFX category limits enforced (combat:6, footstep:2, etc.)
- [ ] Pitch randomization applied per sound definition
- [ ] Music crossfade: smooth transition between two AudioStreamPlayers
- [ ] Music zone switching: setZone() triggers crossfade
- [ ] Music loop points: boss tracks skip intro on loop (loopStart > 0)
- [ ] Music stingers: gameover/victory/level_up play once without loop
- [ ] Music ducking: volume dips during dialogue
- [ ] Ambient layers: up to 4 simultaneous loops per zone
- [ ] Ambient zone transitions: fade out all, fade in new
- [ ] Ambient one-shots: random triggers on 15s+ cooldown
- [ ] All 11 ambient zone definitions ported
- [ ] Combat audio: swing, hit, crit, block, death sounds trigger on signals
- [ ] UI audio: click, open/close, error, confirm, item pickup sounds wired
- [ ] Monster sounds: 7 types with idle/alert/attack/hit/death variants
- [ ] All ~170 audio file paths map correctly to res://assets/audio/

### Visual Effects
- [ ] Melee slash: WINDUP->SLASH->FADE state machine renders arc
- [ ] Melee slash: element colors applied per weapon element
- [ ] Monster magic: orb travels from caster to target, burst on impact
- [ ] Monster ranged: projectile travels with trail, fades on impact
- [ ] Fire particles: torch/brazier/campfire with yellow->red color ramp
- [ ] Cone particles: flame/ice/poison breath attacks with streaming particles
- [ ] Status effect visuals: all 18 effects render correctly on entities
- [ ] Ability effects data: 20+ abilities with telegraph + impact configs
- [ ] Village ashfall: gray particles falling in state 2
- [ ] Village embers: orange/red particles rising in state 3
- [ ] Village smoke overlay: radial dark gradient in state 3
- [ ] Village screen tint: color overlay in states 3-4
- [ ] Village ground shake: camera offset in states 3-4
- [ ] VillageAtmosphere manager: responds to world state changes
- [ ] Damage numbers float up and fade out correctly
- [ ] Particle budget: system does not exceed reasonable limits
