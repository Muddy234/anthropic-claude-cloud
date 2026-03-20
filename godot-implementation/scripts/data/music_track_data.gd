class_name MusicTrackData
extends RefCounted
## Static data class containing all music track metadata.
## Each track defines path, BPM, duration, loop settings, and fade parameters.

const TRACKS: Dictionary = {
	"village_peaceful": {
		"path": "res://assets/audio/music/village_peaceful.ogg",
		"bpm": 90,
		"duration": 120.0,
		"loop": true,
		"loop_offset": 0.0,
		"fade_in": 3.0,
		"fade_out": 3.0,
		"tags": ["village", "calm", "exploration"],
	},
	"village_ash": {
		"path": "res://assets/audio/music/village_ash.ogg",
		"bpm": 80,
		"duration": 120.0,
		"loop": true,
		"loop_offset": 0.0,
		"fade_in": 3.0,
		"fade_out": 3.0,
		"tags": ["village", "melancholy", "ash"],
	},
	"village_burning": {
		"path": "res://assets/audio/music/village_burning.ogg",
		"bpm": 100,
		"duration": 120.0,
		"loop": true,
		"loop_offset": 0.0,
		"fade_in": 2.0,
		"fade_out": 3.0,
		"tags": ["village", "tense", "fire"],
	},
	"village_endgame": {
		"path": "res://assets/audio/music/village_endgame.ogg",
		"bpm": 70,
		"duration": 120.0,
		"loop": true,
		"loop_offset": 0.0,
		"fade_in": 4.0,
		"fade_out": 4.0,
		"tags": ["village", "somber", "endgame"],
	},
	"dungeon_floor_1": {
		"path": "res://assets/audio/music/dungeon_floor_1.ogg",
		"bpm": 95,
		"duration": 150.0,
		"loop": true,
		"loop_offset": 0.0,
		"fade_in": 3.0,
		"fade_out": 3.0,
		"tags": ["dungeon", "exploration", "early"],
	},
	"dungeon_floor_2": {
		"path": "res://assets/audio/music/dungeon_floor_2.ogg",
		"bpm": 100,
		"duration": 150.0,
		"loop": true,
		"loop_offset": 0.0,
		"fade_in": 3.0,
		"fade_out": 3.0,
		"tags": ["dungeon", "tense", "mid"],
	},
	"dungeon_floor_3": {
		"path": "res://assets/audio/music/dungeon_floor_3.ogg",
		"bpm": 110,
		"duration": 150.0,
		"loop": true,
		"loop_offset": 0.0,
		"fade_in": 2.5,
		"fade_out": 3.0,
		"tags": ["dungeon", "dark", "deep"],
	},
	"combat_theme": {
		"path": "res://assets/audio/music/combat_theme.ogg",
		"bpm": 140,
		"duration": 90.0,
		"loop": true,
		"loop_offset": 0.0,
		"fade_in": 0.5,
		"fade_out": 2.0,
		"tags": ["combat", "action"],
	},
	"combat_intense": {
		"path": "res://assets/audio/music/combat_intense.ogg",
		"bpm": 160,
		"duration": 90.0,
		"loop": true,
		"loop_offset": 0.0,
		"fade_in": 0.3,
		"fade_out": 2.0,
		"tags": ["combat", "intense", "danger"],
	},
	"boss_theme": {
		"path": "res://assets/audio/music/boss_theme.ogg",
		"bpm": 150,
		"duration": 180.0,
		"loop": true,
		"loop_offset": 4.0,
		"fade_in": 1.0,
		"fade_out": 3.0,
		"tags": ["boss", "epic", "combat"],
	},
	"boss_malphas": {
		"path": "res://assets/audio/music/boss_malphas.ogg",
		"bpm": 145,
		"duration": 210.0,
		"loop": true,
		"loop_offset": 8.0,
		"fade_in": 1.5,
		"fade_out": 3.0,
		"tags": ["boss", "malphas", "dark"],
	},
	"boss_core": {
		"path": "res://assets/audio/music/boss_core.ogg",
		"bpm": 130,
		"duration": 240.0,
		"loop": true,
		"loop_offset": 6.0,
		"fade_in": 2.0,
		"fade_out": 4.0,
		"tags": ["boss", "core", "final"],
	},
	"shift_imminent": {
		"path": "res://assets/audio/music/shift_imminent.ogg",
		"bpm": 120,
		"duration": 60.0,
		"loop": true,
		"loop_offset": 0.0,
		"fade_in": 1.0,
		"fade_out": 1.0,
		"tags": ["shift", "warning", "tension"],
	},
	"meltdown": {
		"path": "res://assets/audio/music/meltdown.ogg",
		"bpm": 170,
		"duration": 60.0,
		"loop": true,
		"loop_offset": 0.0,
		"fade_in": 0.5,
		"fade_out": 1.0,
		"tags": ["meltdown", "panic", "danger"],
	},
	"gameover": {
		"path": "res://assets/audio/music/gameover.ogg",
		"bpm": 60,
		"duration": 15.0,
		"loop": false,
		"loop_offset": 0.0,
		"fade_in": 0.5,
		"fade_out": 2.0,
		"tags": ["gameover", "death", "somber"],
	},
	"victory": {
		"path": "res://assets/audio/music/victory.ogg",
		"bpm": 120,
		"duration": 30.0,
		"loop": false,
		"loop_offset": 0.0,
		"fade_in": 0.5,
		"fade_out": 3.0,
		"tags": ["victory", "triumph", "celebration"],
	},
	"level_up_fanfare": {
		"path": "res://assets/audio/music/level_up_fanfare.ogg",
		"bpm": 140,
		"duration": 5.0,
		"loop": false,
		"loop_offset": 0.0,
		"fade_in": 0.0,
		"fade_out": 1.0,
		"tags": ["fanfare", "level_up", "celebration"],
	},
}


# --- Static Access Methods ---

static func get_track(track_id: String) -> Dictionary:
	return TRACKS.get(track_id, {})


static func get_all_track_ids() -> Array:
	return TRACKS.keys()


static func get_tracks_by_tag(tag: String) -> Array:
	var result: Array = []
	for track_id in TRACKS:
		var track: Dictionary = TRACKS[track_id]
		var tags: Array = track.get("tags", [])
		if tags.has(tag):
			result.append(track_id)
	return result
