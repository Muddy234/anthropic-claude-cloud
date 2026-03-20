class_name MusicManager
extends Node
## Manages music playback with dual-player crossfading, zone mapping, and ducking.

const DEFAULT_CROSSFADE: float = 3.0

# --- Zone to Track Mapping ---
const ZONE_TO_TRACK: Dictionary = {
	"village_normal": "village_peaceful",
	"village_ash": "village_ash",
	"village_burning": "village_burning",
	"village_endgame": "village_endgame",
	"dungeon_floor_1": "dungeon_floor_1",
	"dungeon_floor_2": "dungeon_floor_2",
	"dungeon_floor_3": "dungeon_floor_3",
	"combat": "combat_theme",
	"combat_intense": "combat_intense",
	"boss": "boss_theme",
	"boss_malphas": "boss_malphas",
	"boss_core": "boss_core",
	"shift": "shift_imminent",
	"meltdown": "meltdown",
	"gameover": "gameover",
	"victory": "victory",
	"menu": "village_peaceful",
}

# --- Players ---
var _player_a: AudioStreamPlayer = null
var _player_b: AudioStreamPlayer = null
var _active_player: AudioStreamPlayer = null
var _inactive_player: AudioStreamPlayer = null

# --- State ---
var _current_track_id: String = ""
var _current_zone: String = ""
var _crossfade_tween: Tween = null
var _duck_tween: Tween = null
var _base_volume_db: float = 0.0
var _is_ducked: bool = false


func _ready() -> void:
	_player_a = AudioStreamPlayer.new()
	_player_a.name = "MusicPlayerA"
	_player_a.bus = "Music"
	add_child(_player_a)

	_player_b = AudioStreamPlayer.new()
	_player_b.name = "MusicPlayerB"
	_player_b.bus = "Music"
	add_child(_player_b)

	_active_player = _player_a
	_inactive_player = _player_b


# --- Public API ---

func set_zone(zone_id: String, crossfade_duration: float = DEFAULT_CROSSFADE) -> void:
	if zone_id == _current_zone:
		return
	_current_zone = zone_id
	var track_id: String = ZONE_TO_TRACK.get(zone_id, "")
	if track_id.is_empty():
		push_warning("MusicManager: No track mapped for zone '%s'" % zone_id)
		return
	crossfade_to(track_id, crossfade_duration)


func crossfade_to(track_id: String, duration: float = DEFAULT_CROSSFADE) -> void:
	if track_id == _current_track_id:
		return

	var track_data: Dictionary = MusicTrackData.get_track(track_id)
	if track_data.is_empty():
		push_warning("MusicManager: No track data for '%s'" % track_id)
		return

	var path: String = track_data.get("path", "")
	if path.is_empty() or not ResourceLoader.exists(path):
		push_warning("MusicManager: Track resource not found at '%s'" % path)
		# Still update current track so zone logic works
		_current_track_id = track_id
		return

	var stream: AudioStream = load(path)
	if not stream:
		return

	_current_track_id = track_id

	# Cancel any ongoing crossfade
	if _crossfade_tween and _crossfade_tween.is_valid():
		_crossfade_tween.kill()

	# Swap active/inactive
	var old_player := _active_player
	_active_player = _inactive_player
	_inactive_player = old_player

	# Configure new active player
	_active_player.stream = stream
	_active_player.volume_db = -80.0

	# Handle looping
	var should_loop: bool = track_data.get("loop", true)
	var loop_offset: float = track_data.get("loop_offset", 0.0)
	if stream is AudioStreamOggVorbis:
		(stream as AudioStreamOggVorbis).loop = should_loop
		(stream as AudioStreamOggVorbis).loop_offset = loop_offset
	elif stream is AudioStreamWAV:
		if should_loop:
			(stream as AudioStreamWAV).loop_mode = AudioStreamWAV.LOOP_FORWARD
			(stream as AudioStreamWAV).loop_begin = int(loop_offset * stream.mix_rate) if loop_offset > 0.0 else 0
		else:
			(stream as AudioStreamWAV).loop_mode = AudioStreamWAV.LOOP_DISABLED

	_active_player.play()

	# Crossfade tween
	var target_db: float = linear_to_db(1.0)
	var fade_in: float = track_data.get("fade_in", duration)

	_crossfade_tween = create_tween()
	_crossfade_tween.set_parallel(true)
	# Fade in new player
	_crossfade_tween.tween_property(_active_player, "volume_db", target_db, fade_in)\
		.set_trans(Tween.TRANS_LINEAR)
	# Fade out old player
	if old_player.playing:
		var fade_out: float = track_data.get("fade_out", duration)
		_crossfade_tween.tween_property(old_player, "volume_db", -80.0, fade_out)\
			.set_trans(Tween.TRANS_LINEAR)
		# Stop old player after fade completes
		_crossfade_tween.chain().tween_callback(old_player.stop)

	_base_volume_db = target_db


func stop(fade_duration: float = 1.0) -> void:
	if _crossfade_tween and _crossfade_tween.is_valid():
		_crossfade_tween.kill()

	var tween := create_tween()
	tween.set_parallel(true)
	if _active_player.playing:
		tween.tween_property(_active_player, "volume_db", -80.0, fade_duration)
	if _inactive_player.playing:
		tween.tween_property(_inactive_player, "volume_db", -80.0, fade_duration)
	tween.chain().tween_callback(_stop_both)

	_current_track_id = ""
	_current_zone = ""


func _stop_both() -> void:
	_active_player.stop()
	_inactive_player.stop()


# --- Ducking (for dialogue, cutscenes) ---

func duck(duck_db: float = -10.0, duration_sec: float = 0.0, fade: float = 0.5) -> void:
	## Lower music volume. If duration_sec > 0, auto-unduck after that duration.
	if _duck_tween and _duck_tween.is_valid():
		_duck_tween.kill()

	_is_ducked = true
	var target_db: float = _base_volume_db + duck_db

	_duck_tween = create_tween()
	_duck_tween.tween_property(_active_player, "volume_db", target_db, fade)\
		.set_trans(Tween.TRANS_SINE)

	if duration_sec > 0.0:
		_duck_tween.tween_interval(duration_sec)
		_duck_tween.tween_callback(unduck.bind(fade))


func unduck(fade: float = 0.5) -> void:
	if not _is_ducked:
		return
	_is_ducked = false

	if _duck_tween and _duck_tween.is_valid():
		_duck_tween.kill()

	_duck_tween = create_tween()
	_duck_tween.tween_property(_active_player, "volume_db", _base_volume_db, fade)\
		.set_trans(Tween.TRANS_SINE)


# --- Getters ---

func get_current_track() -> String:
	return _current_track_id


func get_current_zone() -> String:
	return _current_zone


func is_playing() -> bool:
	return _active_player.playing
