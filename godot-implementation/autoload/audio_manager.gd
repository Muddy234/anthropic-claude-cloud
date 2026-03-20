class_name AudioManagerDef
extends Node
## AudioManager autoload - Central audio system coordinator.
## Manages audio buses, volume persistence, voice pooling, and subsystem lifecycle.

# --- Bus Names ---
const BUS_MASTER := "Master"
const BUS_MUSIC := "Music"
const BUS_SFX := "SFX"
const BUS_AMBIENT := "Ambient"
const BUS_UI := "UI"

const SETTINGS_PATH := "user://audio_settings.cfg"
const SFX_POOL_SIZE := 16

# --- Bus Indices (cached on _ready) ---
var _bus_master: int = 0
var _bus_music: int = 1
var _bus_sfx: int = 2
var _bus_ambient: int = 3
var _bus_ui: int = 4

# --- Default Volumes (linear 0.0 - 1.0) ---
var volumes: Dictionary = {
	"master": 1.0,
	"music": 0.7,
	"sfx": 1.0,
	"ambient": 0.5,
	"ui": 0.8,
}

# --- State ---
var _was_muted_before_focus_loss: bool = false
var _sfx_pool: Array[AudioStreamPlayer] = []
var _config: ConfigFile = ConfigFile.new()

# --- Subsystems ---
var sfx_manager: Node = null
var music_manager: Node = null
var ambient_manager: Node = null
var combat_audio: Node = null
var ui_audio: Node = null


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	_cache_bus_indices()
	_load_settings()
	_apply_all_volumes()
	_create_sfx_pool()
	_init_subsystems()


func _notification(what: int) -> void:
	match what:
		NOTIFICATION_APPLICATION_FOCUS_OUT:
			_was_muted_before_focus_loss = AudioServer.is_bus_mute(_bus_master)
			AudioServer.set_bus_mute(_bus_master, true)
		NOTIFICATION_APPLICATION_FOCUS_IN:
			AudioServer.set_bus_mute(_bus_master, _was_muted_before_focus_loss)


# --- Bus Index Caching ---

func _cache_bus_indices() -> void:
	_bus_master = AudioServer.get_bus_index(BUS_MASTER)
	_bus_music = _get_or_default_bus(BUS_MUSIC, 1)
	_bus_sfx = _get_or_default_bus(BUS_SFX, 2)
	_bus_ambient = _get_or_default_bus(BUS_AMBIENT, 3)
	_bus_ui = _get_or_default_bus(BUS_UI, 4)


func _get_or_default_bus(bus_name: String, fallback: int) -> int:
	var idx := AudioServer.get_bus_index(bus_name)
	if idx == -1:
		push_warning("AudioManager: Bus '%s' not found, using fallback index %d" % [bus_name, fallback])
		return fallback
	return idx


# --- Volume Management ---

func set_volume(bus_name: String, linear_volume: float) -> void:
	linear_volume = clampf(linear_volume, 0.0, 1.0)
	volumes[bus_name] = linear_volume
	var bus_idx := _get_bus_index_for_name(bus_name)
	if bus_idx >= 0:
		AudioServer.set_bus_volume_db(bus_idx, linear_to_db(linear_volume))
	_save_settings()


func get_volume(bus_name: String) -> float:
	return volumes.get(bus_name, 1.0)


func set_muted(bus_name: String, muted: bool) -> void:
	var bus_idx := _get_bus_index_for_name(bus_name)
	if bus_idx >= 0:
		AudioServer.set_bus_mute(bus_idx, muted)


func is_muted(bus_name: String) -> bool:
	var bus_idx := _get_bus_index_for_name(bus_name)
	if bus_idx >= 0:
		return AudioServer.is_bus_mute(bus_idx)
	return false


func _apply_all_volumes() -> void:
	for bus_name in volumes:
		var bus_idx := _get_bus_index_for_name(bus_name)
		if bus_idx >= 0:
			AudioServer.set_bus_volume_db(bus_idx, linear_to_db(volumes[bus_name]))


func _get_bus_index_for_name(bus_name: String) -> int:
	match bus_name:
		"master": return _bus_master
		"music": return _bus_music
		"sfx": return _bus_sfx
		"ambient": return _bus_ambient
		"ui": return _bus_ui
		_:
			push_warning("AudioManager: Unknown bus name '%s'" % bus_name)
			return -1


# --- Settings Persistence ---

func _load_settings() -> void:
	var err := _config.load(SETTINGS_PATH)
	if err == OK:
		for bus_name in volumes:
			if _config.has_section_key("audio", bus_name):
				volumes[bus_name] = _config.get_value("audio", bus_name, volumes[bus_name])


func _save_settings() -> void:
	for bus_name in volumes:
		_config.set_value("audio", bus_name, volumes[bus_name])
	_config.save(SETTINGS_PATH)


# --- SFX Voice Pool ---

func _create_sfx_pool() -> void:
	for i in SFX_POOL_SIZE:
		var player := AudioStreamPlayer.new()
		player.name = "SFXVoice_%d" % i
		player.bus = BUS_SFX
		add_child(player)
		_sfx_pool.append(player)


func get_available_voice() -> AudioStreamPlayer:
	for player in _sfx_pool:
		if not player.playing:
			return player
	return null


func get_voice_by_priority(min_priority: int) -> AudioStreamPlayer:
	## Returns a non-playing voice, or steals the lowest-priority playing voice
	## if all voices are in use and the requesting priority exceeds it.
	var available := get_available_voice()
	if available:
		return available
	# All voices busy - find lowest priority to potentially steal
	var lowest_priority: int = min_priority
	var lowest_player: AudioStreamPlayer = null
	for player in _sfx_pool:
		var pri: int = player.get_meta("priority", 0)
		if pri < lowest_priority:
			lowest_priority = pri
			lowest_player = player
	if lowest_player:
		lowest_player.stop()
		return lowest_player
	return null


# --- Convenience Methods ---

func play_sfx(sound_id: String, volume_override: float = -1.0, pitch_override: float = -1.0) -> void:
	if sfx_manager:
		sfx_manager.play(sound_id, volume_override, pitch_override)


func play_music_zone(zone_id: String) -> void:
	if music_manager:
		music_manager.set_zone(zone_id)


func play_ambient_zone(zone_id: String) -> void:
	if ambient_manager:
		ambient_manager.set_zone(zone_id)


# --- Subsystem Initialization ---

func _init_subsystems() -> void:
	# Load subsystem scripts
	var sfx_script := load("res://scripts/systems/audio/sfx_manager.gd")
	var music_script := load("res://scripts/systems/audio/music_manager.gd")
	var ambient_script := load("res://scripts/systems/audio/ambient_manager.gd")
	var combat_script := load("res://scripts/systems/audio/combat_audio.gd")
	var ui_script := load("res://scripts/systems/audio/ui_audio.gd")

	if sfx_script:
		sfx_manager = sfx_script.new()
		sfx_manager.name = "SFXManager"
		add_child(sfx_manager)

	if music_script:
		music_manager = music_script.new()
		music_manager.name = "MusicManager"
		add_child(music_manager)

	if ambient_script:
		ambient_manager = ambient_script.new()
		ambient_manager.name = "AmbientManager"
		add_child(ambient_manager)

	if combat_script:
		combat_audio = combat_script.new()
		combat_audio.name = "CombatAudio"
		add_child(combat_audio)

	if ui_script:
		ui_audio = ui_script.new()
		ui_audio.name = "UIAudio"
		add_child(ui_audio)
