class_name SFXManager
extends Node
## Manages SFX playback with priority, cooldown, category limits, and pitch randomization.

# --- Priority Levels ---
enum Priority {
	LOW = 1,
	MEDIUM = 2,
	HIGH = 3,
	CRITICAL = 4,
}

# --- Category Voice Limits ---
const CATEGORY_LIMITS: Dictionary = {
	"combat": 6,
	"footstep": 2,
	"ui": 3,
	"ambient": 4,
	"monster": 4,
}

const DEFAULT_COOLDOWN_MS: int = 50

# --- State ---
var _cooldown_tracker: Dictionary = {}  # sound_id -> last_play_time_ms
var _category_counts: Dictionary = {}   # category -> count of currently playing
var _stream_cache: Dictionary = {}      # path -> AudioStream


func _ready() -> void:
	for category in CATEGORY_LIMITS:
		_category_counts[category] = 0


# --- Public API ---

func play(sound_id: String, volume_override: float = -1.0, pitch_override: float = -1.0,
		priority_override: int = -1, category_override: String = "",
		cooldown_ms_override: int = -1) -> void:
	var definition: Dictionary = SFXDefinitions.get_definition(sound_id)
	if definition.is_empty():
		push_warning("SFXManager: No definition for sound_id '%s'" % sound_id)
		return

	var path: String = definition.get("path", "")
	var base_volume: float = definition.get("volume", 1.0)
	var pitch_variation: float = definition.get("pitch_variation", 0.0)
	var priority: int = definition.get("priority", Priority.MEDIUM) if priority_override < 0 else priority_override
	var category: String = definition.get("category", "sfx") if category_override.is_empty() else category_override
	var cooldown_ms: int = definition.get("cooldown", DEFAULT_COOLDOWN_MS) if cooldown_ms_override < 0 else cooldown_ms_override

	# --- Cooldown check ---
	var now_ms: int = Time.get_ticks_msec()
	if _cooldown_tracker.has(sound_id):
		if now_ms - _cooldown_tracker[sound_id] < cooldown_ms:
			return
	_cooldown_tracker[sound_id] = now_ms

	# --- Category limit check ---
	_refresh_category_counts()
	var cat_limit: int = CATEGORY_LIMITS.get(category, 8)
	if _category_counts.get(category, 0) >= cat_limit:
		# Try to cull lowest-priority voice in this category
		if not _cull_lowest_in_category(category, priority):
			return

	# --- Acquire voice ---
	var audio_mgr := _get_audio_manager()
	if not audio_mgr:
		return
	var voice: AudioStreamPlayer = audio_mgr.get_voice_by_priority(priority)
	if not voice:
		return

	# --- Load stream ---
	var stream := _load_stream(path)
	if not stream:
		push_warning("SFXManager: Failed to load stream at '%s'" % path)
		return

	# --- Configure and play ---
	var final_volume: float = base_volume if volume_override < 0.0 else volume_override
	var final_pitch: float = 1.0
	if pitch_override >= 0.0:
		final_pitch = pitch_override
	elif pitch_variation > 0.0:
		final_pitch = 1.0 + randf_range(-pitch_variation, pitch_variation)

	voice.stream = stream
	voice.volume_db = linear_to_db(clampf(final_volume, 0.0, 2.0))
	voice.pitch_scale = clampf(final_pitch, 0.1, 4.0)
	voice.bus = "SFX"
	voice.set_meta("priority", priority)
	voice.set_meta("category", category)
	voice.set_meta("sound_id", sound_id)
	voice.play()


func play_random(sound_ids: Array, volume_override: float = -1.0) -> void:
	if sound_ids.is_empty():
		return
	var chosen: String = sound_ids[randi() % sound_ids.size()]
	play(chosen, volume_override)


func play_variant_group(group_name: String, volume_override: float = -1.0) -> void:
	var variants: Array = SFXDefinitions.get_variant_group(group_name)
	if variants.is_empty():
		push_warning("SFXManager: No variant group '%s'" % group_name)
		return
	play_random(variants, volume_override)


# --- Stream Cache ---

func _load_stream(path: String) -> AudioStream:
	if _stream_cache.has(path):
		return _stream_cache[path]
	if not ResourceLoader.exists(path):
		return null
	var stream: AudioStream = load(path)
	if stream:
		_stream_cache[path] = stream
	return stream


func clear_cache() -> void:
	_stream_cache.clear()


# --- Category Management ---

func _refresh_category_counts() -> void:
	for category in CATEGORY_LIMITS:
		_category_counts[category] = 0

	var audio_mgr := _get_audio_manager()
	if not audio_mgr:
		return
	for voice: AudioStreamPlayer in audio_mgr._sfx_pool:
		if voice.playing:
			var cat: String = voice.get_meta("category", "")
			if _category_counts.has(cat):
				_category_counts[cat] += 1


func _cull_lowest_in_category(category: String, incoming_priority: int) -> bool:
	var audio_mgr := _get_audio_manager()
	if not audio_mgr:
		return false

	var lowest_priority: int = incoming_priority
	var lowest_voice: AudioStreamPlayer = null

	for voice: AudioStreamPlayer in audio_mgr._sfx_pool:
		if voice.playing and voice.get_meta("category", "") == category:
			var pri: int = voice.get_meta("priority", 0)
			if pri < lowest_priority:
				lowest_priority = pri
				lowest_voice = voice

	if lowest_voice:
		lowest_voice.stop()
		return true
	return false


func _get_audio_manager() -> Node:
	return get_parent()
