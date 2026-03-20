class_name AmbientManager
extends Node
## Manages layered ambient audio with zone-based transitions and random one-shot events.

const MAX_LAYERS := 4
const ONE_SHOT_BASE_INTERVAL := 15.0
const ONE_SHOT_VARIANCE := 5.0
const FADE_DURATION := 2.0

# --- Layer Players ---
var _layer_players: Array[AudioStreamPlayer] = []
var _one_shot_player: AudioStreamPlayer = null

# --- State ---
var _current_zone_id: String = ""
var _one_shot_timer: Timer = null
var _current_zone_data: Dictionary = {}
var _fade_tweens: Array[Tween] = []
var _stream_cache: Dictionary = {}


func _ready() -> void:
	# Create 4 layer players
	for i in MAX_LAYERS:
		var player := AudioStreamPlayer.new()
		player.name = "AmbientLayer_%d" % i
		player.bus = "Ambient"
		add_child(player)
		_layer_players.append(player)

	# Create one-shot player
	_one_shot_player = AudioStreamPlayer.new()
	_one_shot_player.name = "AmbientOneShot"
	_one_shot_player.bus = "Ambient"
	add_child(_one_shot_player)

	# Create one-shot timer
	_one_shot_timer = Timer.new()
	_one_shot_timer.name = "OneShotTimer"
	_one_shot_timer.one_shot = true
	_one_shot_timer.timeout.connect(_on_one_shot_timer)
	add_child(_one_shot_timer)


# --- Public API ---

func set_zone(zone_id: String, fade_duration: float = FADE_DURATION) -> void:
	if zone_id == _current_zone_id:
		return

	_current_zone_id = zone_id
	_current_zone_data = AmbientZoneData.get_zone(zone_id)

	if _current_zone_data.is_empty():
		push_warning("AmbientManager: No zone data for '%s'" % zone_id)
		_stop_all(fade_duration)
		return

	# Kill any ongoing fade tweens
	_kill_fade_tweens()

	# Get layer definitions for this zone
	var layers: Array = _current_zone_data.get("layers", [])

	# Fade in new layers, fade out unused ones
	for i in MAX_LAYERS:
		var player := _layer_players[i]
		if i < layers.size():
			var layer_def: Dictionary = layers[i]
			var path: String = layer_def.get("path", "")
			var volume: float = layer_def.get("volume", 0.7)

			var stream := _load_stream(path)
			if stream:
				_configure_loop(stream, true)
				player.stream = stream
				player.volume_db = -80.0
				player.play()

				# Fade in
				var tween := create_tween()
				tween.tween_property(player, "volume_db", linear_to_db(volume), fade_duration)\
					.set_trans(Tween.TRANS_SINE)
				_fade_tweens.append(tween)
			else:
				_fade_out_player(player, fade_duration)
		else:
			# No layer at this index - fade out if playing
			_fade_out_player(player, fade_duration)

	# Restart one-shot timer
	_restart_one_shot_timer()


func stop(fade_duration: float = FADE_DURATION) -> void:
	_current_zone_id = ""
	_current_zone_data = {}
	_stop_all(fade_duration)


# --- Static Zone Mapping ---

static func get_zone_for_state(game_state: int, floor_num: int, village_state: int) -> String:
	## Maps game state + context to an ambient zone ID.
	# Check combat/boss states first
	match game_state:
		5:  # COMBAT
			return "combat"
		11:  # GAME_OVER
			return "village_normal"
		12:  # VICTORY
			return "village_normal"

	# Village states
	if game_state == 3:  # VILLAGE
		match village_state:
			1: return "village_normal"
			2: return "village_ash"
			3: return "village_burning"
			4: return "village_endgame"
			_: return "village_normal"

	# Dungeon floors
	if game_state == 1:  # PLAYING
		if floor_num <= 3:
			return "dungeon_early"
		elif floor_num <= 6:
			return "dungeon_mid"
		elif floor_num <= 9:
			return "dungeon_deep"
		else:
			return "dungeon_core"

	return "village_normal"


# --- One-Shot System ---

func _restart_one_shot_timer() -> void:
	_one_shot_timer.stop()
	var one_shots: Array = _current_zone_data.get("one_shots", [])
	if one_shots.is_empty():
		return
	var interval := ONE_SHOT_BASE_INTERVAL + randf_range(-ONE_SHOT_VARIANCE, ONE_SHOT_VARIANCE)
	_one_shot_timer.start(maxf(interval, 3.0))


func _on_one_shot_timer() -> void:
	if _current_zone_data.is_empty():
		return

	var one_shots: Array = _current_zone_data.get("one_shots", [])
	if one_shots.is_empty():
		return

	# Pick a random one-shot
	var chosen: Dictionary = one_shots[randi() % one_shots.size()]
	var path: String = chosen.get("path", "")
	var volume: float = chosen.get("volume", 0.5)
	var pitch_variation: float = chosen.get("pitch_variation", 0.0)

	var stream := _load_stream(path)
	if stream:
		_one_shot_player.stream = stream
		_one_shot_player.volume_db = linear_to_db(volume)
		if pitch_variation > 0.0:
			_one_shot_player.pitch_scale = 1.0 + randf_range(-pitch_variation, pitch_variation)
		else:
			_one_shot_player.pitch_scale = 1.0
		_one_shot_player.play()

	# Restart timer for next one-shot
	_restart_one_shot_timer()


# --- Internal Helpers ---

func _fade_out_player(player: AudioStreamPlayer, duration: float) -> void:
	if not player.playing:
		return
	var tween := create_tween()
	tween.tween_property(player, "volume_db", -80.0, duration)\
		.set_trans(Tween.TRANS_SINE)
	tween.tween_callback(player.stop)
	_fade_tweens.append(tween)


func _stop_all(fade_duration: float) -> void:
	_kill_fade_tweens()
	_one_shot_timer.stop()
	for player in _layer_players:
		_fade_out_player(player, fade_duration)
	if _one_shot_player.playing:
		_one_shot_player.stop()


func _kill_fade_tweens() -> void:
	for tween in _fade_tweens:
		if tween and tween.is_valid():
			tween.kill()
	_fade_tweens.clear()


func _load_stream(path: String) -> AudioStream:
	if path.is_empty():
		return null
	if _stream_cache.has(path):
		return _stream_cache[path]
	if not ResourceLoader.exists(path):
		return null
	var stream: AudioStream = load(path)
	if stream:
		_stream_cache[path] = stream
	return stream


func _configure_loop(stream: AudioStream, should_loop: bool) -> void:
	if stream is AudioStreamOggVorbis:
		(stream as AudioStreamOggVorbis).loop = should_loop
	elif stream is AudioStreamWAV:
		if should_loop:
			(stream as AudioStreamWAV).loop_mode = AudioStreamWAV.LOOP_FORWARD
		else:
			(stream as AudioStreamWAV).loop_mode = AudioStreamWAV.LOOP_DISABLED
