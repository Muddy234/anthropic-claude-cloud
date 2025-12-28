extends Node

## Manages all game audio - music and sound effects

# Audio players
@onready var music_player: AudioStreamPlayer = AudioStreamPlayer.new()
var sfx_pool: Array[AudioStreamPlayer] = []
const SFX_POOL_SIZE := 16

# State
var current_music: String = ""
var music_volume: float = 0.8
var sfx_volume: float = 1.0
var is_muted: bool = false

# Cached audio streams
var sfx_cache: Dictionary = {}
var music_cache: Dictionary = {}

# Audio buses
const MUSIC_BUS := "Music"
const SFX_BUS := "SFX"

func _ready():
	_setup_audio_players()
	_connect_signals()

func _setup_audio_players():
	# Setup music player
	music_player.name = "MusicPlayer"
	music_player.bus = MUSIC_BUS
	add_child(music_player)

	# Create SFX pool
	for i in SFX_POOL_SIZE:
		var player := AudioStreamPlayer.new()
		player.name = "SFXPlayer_%d" % i
		player.bus = SFX_BUS
		add_child(player)
		sfx_pool.append(player)

func _connect_signals():
	EventBus.play_sfx.connect(play_sfx)
	EventBus.play_music.connect(play_music)
	EventBus.stop_music.connect(stop_music)

## Play background music with optional crossfade
func play_music(track_name: String, fade_time: float = 1.0):
	if track_name == current_music:
		return

	if is_muted:
		current_music = track_name
		return

	var stream := _load_music(track_name)
	if not stream:
		push_warning("Music not found: " + track_name)
		return

	# Crossfade
	var tween := create_tween()

	if music_player.playing:
		tween.tween_property(music_player, "volume_db", -40.0, fade_time * 0.5)
		tween.tween_callback(func():
			music_player.stream = stream
			music_player.play()
		)
	else:
		music_player.stream = stream
		music_player.volume_db = -40.0
		music_player.play()

	tween.tween_property(music_player, "volume_db", linear_to_db(music_volume), fade_time * 0.5)

	current_music = track_name

## Stop music with optional fade
func stop_music(fade_time: float = 1.0):
	if not music_player.playing:
		return

	var tween := create_tween()
	tween.tween_property(music_player, "volume_db", -40.0, fade_time)
	tween.tween_callback(music_player.stop)

	current_music = ""

## Play a sound effect
func play_sfx(sfx_name: String, volume_offset: float = 0.0, pitch_variation: float = 0.0):
	if is_muted:
		return

	var stream := _load_sfx(sfx_name)
	if not stream:
		push_warning("SFX not found: " + sfx_name)
		return

	# Find available player
	var player := _get_available_sfx_player()
	if not player:
		return

	player.stream = stream
	player.volume_db = linear_to_db(sfx_volume) + volume_offset
	player.pitch_scale = 1.0 + randf_range(-pitch_variation, pitch_variation)
	player.play()

## Play positional sound (for 2D spatial audio)
func play_sfx_at(sfx_name: String, position: Vector2, max_distance: float = 500.0):
	if is_muted or not GameManager.player:
		return

	# Calculate volume based on distance from player
	var player_pos := Vector2(GameManager.player.grid_pos) * Constants.TILE_SIZE
	var distance := position.distance_to(player_pos)

	if distance > max_distance:
		return

	var volume_offset := -20.0 * (distance / max_distance)
	play_sfx(sfx_name, volume_offset)

## Play combat sound
func play_combat_sfx(type: String, is_crit: bool = false):
	match type:
		"hit":
			play_sfx("hit_flesh" if not is_crit else "hit_crit", 0, 0.1)
		"miss":
			play_sfx("swoosh", -5, 0.15)
		"block":
			play_sfx("hit_metal", 0, 0.1)
		"death":
			play_sfx("death_enemy", 0, 0.1)

## Play UI sound
func play_ui_sfx(type: String):
	match type:
		"click":
			play_sfx("ui_click", -10)
		"hover":
			play_sfx("ui_hover", -15)
		"open":
			play_sfx("ui_open", -5)
		"close":
			play_sfx("ui_close", -5)
		"error":
			play_sfx("ui_error", -5)
		"confirm":
			play_sfx("ui_confirm", -5)
		"pickup":
			play_sfx("item_pickup", -5)
		"equip":
			play_sfx("item_equip", -5)
		"gold":
			play_sfx("gold_pickup", -5)

## Set music volume (0.0 to 1.0)
func set_music_volume(volume: float):
	music_volume = clampf(volume, 0.0, 1.0)
	if music_player.playing:
		music_player.volume_db = linear_to_db(music_volume)
	GameManager.settings.music_volume = music_volume

## Set SFX volume (0.0 to 1.0)
func set_sfx_volume(volume: float):
	sfx_volume = clampf(volume, 0.0, 1.0)
	GameManager.settings.sfx_volume = sfx_volume

## Toggle mute
func toggle_mute():
	is_muted = not is_muted
	if is_muted:
		music_player.volume_db = -80.0
	else:
		music_player.volume_db = linear_to_db(music_volume)

func _get_available_sfx_player() -> AudioStreamPlayer:
	for player in sfx_pool:
		if not player.playing:
			return player

	# All busy - steal the oldest one
	return sfx_pool[0]

func _load_sfx(sfx_name: String) -> AudioStream:
	if sfx_cache.has(sfx_name):
		return sfx_cache[sfx_name]

	var path := "res://assets/audio/sfx/%s.wav" % sfx_name
	if not ResourceLoader.exists(path):
		path = "res://assets/audio/sfx/%s.ogg" % sfx_name

	if ResourceLoader.exists(path):
		var stream := load(path) as AudioStream
		sfx_cache[sfx_name] = stream
		return stream

	return null

func _load_music(track_name: String) -> AudioStream:
	if music_cache.has(track_name):
		return music_cache[track_name]

	var path := "res://assets/audio/music/%s.ogg" % track_name
	if not ResourceLoader.exists(path):
		path = "res://assets/audio/music/%s.mp3" % track_name

	if ResourceLoader.exists(path):
		var stream := load(path) as AudioStream
		music_cache[track_name] = stream
		return stream

	return null
