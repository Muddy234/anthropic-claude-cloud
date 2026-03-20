class_name AmbientZoneData
extends RefCounted
## Static data class containing ambient zone configurations.
## Each zone defines up to 4 looping layers and optional one-shot events.

const ZONES: Dictionary = {
	"village_normal": {
		"layers": [
			{"path": "res://assets/audio/ambient/village_birds.ogg", "volume": 0.5},
			{"path": "res://assets/audio/ambient/village_wind_light.ogg", "volume": 0.3},
			{"path": "res://assets/audio/ambient/village_crowd_murmur.ogg", "volume": 0.2},
		],
		"one_shots": [
			{"path": "res://assets/audio/ambient/oneshot/bird_chirp.ogg", "volume": 0.4, "pitch_variation": 0.15},
			{"path": "res://assets/audio/ambient/oneshot/dog_bark.ogg", "volume": 0.3, "pitch_variation": 0.1},
			{"path": "res://assets/audio/ambient/oneshot/hammer_anvil.ogg", "volume": 0.35, "pitch_variation": 0.05},
		],
	},
	"village_ash": {
		"layers": [
			{"path": "res://assets/audio/ambient/village_wind_heavy.ogg", "volume": 0.5},
			{"path": "res://assets/audio/ambient/ash_falling.ogg", "volume": 0.4},
			{"path": "res://assets/audio/ambient/village_crowd_murmur.ogg", "volume": 0.1},
		],
		"one_shots": [
			{"path": "res://assets/audio/ambient/oneshot/cough.ogg", "volume": 0.3, "pitch_variation": 0.1},
			{"path": "res://assets/audio/ambient/oneshot/creak.ogg", "volume": 0.25, "pitch_variation": 0.1},
		],
	},
	"village_burning": {
		"layers": [
			{"path": "res://assets/audio/ambient/fire_crackle.ogg", "volume": 0.6},
			{"path": "res://assets/audio/ambient/village_wind_heavy.ogg", "volume": 0.4},
			{"path": "res://assets/audio/ambient/burning_embers.ogg", "volume": 0.5},
			{"path": "res://assets/audio/ambient/distant_rumble.ogg", "volume": 0.3},
		],
		"one_shots": [
			{"path": "res://assets/audio/ambient/oneshot/timber_collapse.ogg", "volume": 0.5, "pitch_variation": 0.05},
			{"path": "res://assets/audio/ambient/oneshot/explosion_distant.ogg", "volume": 0.4, "pitch_variation": 0.1},
			{"path": "res://assets/audio/ambient/oneshot/scream_distant.ogg", "volume": 0.3, "pitch_variation": 0.15},
		],
	},
	"village_endgame": {
		"layers": [
			{"path": "res://assets/audio/ambient/void_hum.ogg", "volume": 0.5},
			{"path": "res://assets/audio/ambient/village_wind_heavy.ogg", "volume": 0.3},
			{"path": "res://assets/audio/ambient/energy_pulse.ogg", "volume": 0.4},
		],
		"one_shots": [
			{"path": "res://assets/audio/ambient/oneshot/void_crack.ogg", "volume": 0.5, "pitch_variation": 0.1},
			{"path": "res://assets/audio/ambient/oneshot/energy_surge.ogg", "volume": 0.4, "pitch_variation": 0.05},
		],
	},
	"dungeon_early": {
		"layers": [
			{"path": "res://assets/audio/ambient/dungeon_drip.ogg", "volume": 0.4},
			{"path": "res://assets/audio/ambient/dungeon_wind.ogg", "volume": 0.3},
		],
		"one_shots": [
			{"path": "res://assets/audio/ambient/oneshot/drip_echo.ogg", "volume": 0.3, "pitch_variation": 0.2},
			{"path": "res://assets/audio/ambient/oneshot/stone_scrape.ogg", "volume": 0.25, "pitch_variation": 0.1},
			{"path": "res://assets/audio/ambient/oneshot/rat_squeak.ogg", "volume": 0.2, "pitch_variation": 0.15},
		],
	},
	"dungeon_mid": {
		"layers": [
			{"path": "res://assets/audio/ambient/dungeon_drip.ogg", "volume": 0.35},
			{"path": "res://assets/audio/ambient/dungeon_wind.ogg", "volume": 0.4},
			{"path": "res://assets/audio/ambient/dungeon_rumble.ogg", "volume": 0.25},
		],
		"one_shots": [
			{"path": "res://assets/audio/ambient/oneshot/chain_rattle.ogg", "volume": 0.3, "pitch_variation": 0.1},
			{"path": "res://assets/audio/ambient/oneshot/distant_growl.ogg", "volume": 0.25, "pitch_variation": 0.15},
			{"path": "res://assets/audio/ambient/oneshot/stone_crumble.ogg", "volume": 0.3, "pitch_variation": 0.1},
		],
	},
	"dungeon_deep": {
		"layers": [
			{"path": "res://assets/audio/ambient/dungeon_wind.ogg", "volume": 0.5},
			{"path": "res://assets/audio/ambient/dungeon_rumble.ogg", "volume": 0.4},
			{"path": "res://assets/audio/ambient/lava_bubble.ogg", "volume": 0.3},
			{"path": "res://assets/audio/ambient/dungeon_heartbeat.ogg", "volume": 0.2},
		],
		"one_shots": [
			{"path": "res://assets/audio/ambient/oneshot/distant_roar.ogg", "volume": 0.4, "pitch_variation": 0.1},
			{"path": "res://assets/audio/ambient/oneshot/lava_burst.ogg", "volume": 0.35, "pitch_variation": 0.1},
			{"path": "res://assets/audio/ambient/oneshot/cave_in.ogg", "volume": 0.3, "pitch_variation": 0.05},
		],
	},
	"dungeon_core": {
		"layers": [
			{"path": "res://assets/audio/ambient/void_hum.ogg", "volume": 0.6},
			{"path": "res://assets/audio/ambient/energy_pulse.ogg", "volume": 0.5},
			{"path": "res://assets/audio/ambient/dungeon_heartbeat.ogg", "volume": 0.4},
			{"path": "res://assets/audio/ambient/core_resonance.ogg", "volume": 0.35},
		],
		"one_shots": [
			{"path": "res://assets/audio/ambient/oneshot/void_crack.ogg", "volume": 0.5, "pitch_variation": 0.1},
			{"path": "res://assets/audio/ambient/oneshot/energy_surge.ogg", "volume": 0.45, "pitch_variation": 0.05},
			{"path": "res://assets/audio/ambient/oneshot/reality_tear.ogg", "volume": 0.4, "pitch_variation": 0.1},
		],
	},
	"combat": {
		"layers": [
			{"path": "res://assets/audio/ambient/combat_tension.ogg", "volume": 0.3},
		],
		"one_shots": [],
	},
	"boss": {
		"layers": [
			{"path": "res://assets/audio/ambient/boss_arena_rumble.ogg", "volume": 0.4},
			{"path": "res://assets/audio/ambient/energy_pulse.ogg", "volume": 0.3},
		],
		"one_shots": [
			{"path": "res://assets/audio/ambient/oneshot/thunder_crack.ogg", "volume": 0.5, "pitch_variation": 0.1},
		],
	},
	"shift": {
		"layers": [
			{"path": "res://assets/audio/ambient/shift_warning.ogg", "volume": 0.6},
			{"path": "res://assets/audio/ambient/dungeon_rumble.ogg", "volume": 0.5},
			{"path": "res://assets/audio/ambient/void_hum.ogg", "volume": 0.4},
		],
		"one_shots": [
			{"path": "res://assets/audio/ambient/oneshot/reality_tear.ogg", "volume": 0.6, "pitch_variation": 0.1},
			{"path": "res://assets/audio/ambient/oneshot/cave_in.ogg", "volume": 0.5, "pitch_variation": 0.05},
		],
	},
}


# --- Static Access Methods ---

static func get_zone(zone_id: String) -> Dictionary:
	return ZONES.get(zone_id, {})


static func get_all_zone_ids() -> Array:
	return ZONES.keys()


static func has_zone(zone_id: String) -> bool:
	return ZONES.has(zone_id)
