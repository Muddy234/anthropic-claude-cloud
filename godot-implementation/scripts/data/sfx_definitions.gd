class_name SFXDefinitions
extends RefCounted
## Static data class containing all SFX metadata definitions.
## Each entry defines path, volume, pitch variation, priority, category, and cooldown.

# --- SFX Definitions ---
# Keys: sound_id -> {path, volume, pitch_variation, priority, category, cooldown}

const DEFINITIONS: Dictionary = {
	# === Combat: Weapon Swings ===
	"sword_swing_1": {
		"path": "res://assets/audio/sfx/combat/sword_swing_1.ogg",
		"volume": 0.8,
		"pitch_variation": 0.1,
		"priority": 2,  # MEDIUM
		"category": "combat",
		"cooldown": 50,
	},
	"sword_swing_2": {
		"path": "res://assets/audio/sfx/combat/sword_swing_2.ogg",
		"volume": 0.8,
		"pitch_variation": 0.1,
		"priority": 2,
		"category": "combat",
		"cooldown": 50,
	},
	"sword_swing_3": {
		"path": "res://assets/audio/sfx/combat/sword_swing_3.ogg",
		"volume": 0.8,
		"pitch_variation": 0.1,
		"priority": 2,
		"category": "combat",
		"cooldown": 50,
	},

	# === Combat: Hit Impacts ===
	"hit_melee_1": {
		"path": "res://assets/audio/sfx/combat/hit_melee_1.ogg",
		"volume": 0.9,
		"pitch_variation": 0.15,
		"priority": 2,
		"category": "combat",
		"cooldown": 50,
	},
	"hit_melee_2": {
		"path": "res://assets/audio/sfx/combat/hit_melee_2.ogg",
		"volume": 0.9,
		"pitch_variation": 0.15,
		"priority": 2,
		"category": "combat",
		"cooldown": 50,
	},
	"hit_melee_3": {
		"path": "res://assets/audio/sfx/combat/hit_melee_3.ogg",
		"volume": 0.9,
		"pitch_variation": 0.15,
		"priority": 2,
		"category": "combat",
		"cooldown": 50,
	},
	"hit_critical": {
		"path": "res://assets/audio/sfx/combat/hit_critical.ogg",
		"volume": 1.0,
		"pitch_variation": 0.05,
		"priority": 3,  # HIGH
		"category": "combat",
		"cooldown": 100,
	},
	"hit_blocked": {
		"path": "res://assets/audio/sfx/combat/hit_blocked.ogg",
		"volume": 0.85,
		"pitch_variation": 0.1,
		"priority": 3,
		"category": "combat",
		"cooldown": 80,
	},

	# === Combat: Ranged ===
	"bow_release": {
		"path": "res://assets/audio/sfx/combat/bow_release.ogg",
		"volume": 0.7,
		"pitch_variation": 0.08,
		"priority": 2,
		"category": "combat",
		"cooldown": 100,
	},

	# === Combat: Spells ===
	"spell_fire": {
		"path": "res://assets/audio/sfx/combat/spell_fire.ogg",
		"volume": 0.85,
		"pitch_variation": 0.1,
		"priority": 2,
		"category": "combat",
		"cooldown": 100,
	},
	"spell_ice": {
		"path": "res://assets/audio/sfx/combat/spell_ice.ogg",
		"volume": 0.85,
		"pitch_variation": 0.1,
		"priority": 2,
		"category": "combat",
		"cooldown": 100,
	},
	"spell_lightning": {
		"path": "res://assets/audio/sfx/combat/spell_lightning.ogg",
		"volume": 0.9,
		"pitch_variation": 0.08,
		"priority": 3,
		"category": "combat",
		"cooldown": 100,
	},
	"spell_heal": {
		"path": "res://assets/audio/sfx/combat/spell_heal.ogg",
		"volume": 0.8,
		"pitch_variation": 0.05,
		"priority": 3,
		"category": "combat",
		"cooldown": 200,
	},

	# === Combat: Player Feedback ===
	"player_hurt": {
		"path": "res://assets/audio/sfx/combat/player_hurt.ogg",
		"volume": 0.9,
		"pitch_variation": 0.12,
		"priority": 3,
		"category": "combat",
		"cooldown": 150,
	},
	"player_death": {
		"path": "res://assets/audio/sfx/combat/player_death.ogg",
		"volume": 1.0,
		"pitch_variation": 0.0,
		"priority": 4,  # CRITICAL
		"category": "combat",
		"cooldown": 500,
	},

	# === UI Sounds ===
	"click": {
		"path": "res://assets/audio/sfx/ui/click.ogg",
		"volume": 0.6,
		"pitch_variation": 0.05,
		"priority": 3,
		"category": "ui",
		"cooldown": 30,
	},
	"open": {
		"path": "res://assets/audio/sfx/ui/open.ogg",
		"volume": 0.7,
		"pitch_variation": 0.0,
		"priority": 3,
		"category": "ui",
		"cooldown": 100,
	},
	"close": {
		"path": "res://assets/audio/sfx/ui/close.ogg",
		"volume": 0.7,
		"pitch_variation": 0.0,
		"priority": 3,
		"category": "ui",
		"cooldown": 100,
	},
	"error": {
		"path": "res://assets/audio/sfx/ui/error.ogg",
		"volume": 0.8,
		"pitch_variation": 0.0,
		"priority": 3,
		"category": "ui",
		"cooldown": 200,
	},
	"level_up": {
		"path": "res://assets/audio/sfx/ui/level_up.ogg",
		"volume": 1.0,
		"pitch_variation": 0.0,
		"priority": 4,  # CRITICAL
		"category": "ui",
		"cooldown": 500,
	},

	# === Movement / Environment ===
	"footstep_stone_1": {
		"path": "res://assets/audio/sfx/movement/footstep_stone_1.ogg",
		"volume": 0.4,
		"pitch_variation": 0.15,
		"priority": 1,  # LOW
		"category": "footstep",
		"cooldown": 200,
	},
	"footstep_stone_2": {
		"path": "res://assets/audio/sfx/movement/footstep_stone_2.ogg",
		"volume": 0.4,
		"pitch_variation": 0.15,
		"priority": 1,
		"category": "footstep",
		"cooldown": 200,
	},
	"footstep_dirt_1": {
		"path": "res://assets/audio/sfx/movement/footstep_dirt_1.ogg",
		"volume": 0.35,
		"pitch_variation": 0.15,
		"priority": 1,
		"category": "footstep",
		"cooldown": 200,
	},
	"footstep_dirt_2": {
		"path": "res://assets/audio/sfx/movement/footstep_dirt_2.ogg",
		"volume": 0.35,
		"pitch_variation": 0.15,
		"priority": 1,
		"category": "footstep",
		"cooldown": 200,
	},
	"door_open": {
		"path": "res://assets/audio/sfx/movement/door_open.ogg",
		"volume": 0.7,
		"pitch_variation": 0.05,
		"priority": 2,
		"category": "ambient",
		"cooldown": 300,
	},
	"stairs_descend": {
		"path": "res://assets/audio/sfx/movement/stairs_descend.ogg",
		"volume": 0.7,
		"pitch_variation": 0.0,
		"priority": 3,
		"category": "ambient",
		"cooldown": 500,
	},

	# === Items ===
	"item_pickup": {
		"path": "res://assets/audio/sfx/items/item_pickup.ogg",
		"volume": 0.7,
		"pitch_variation": 0.1,
		"priority": 2,
		"category": "ui",
		"cooldown": 50,
	},
	"gold_pickup": {
		"path": "res://assets/audio/sfx/items/gold_pickup.ogg",
		"volume": 0.65,
		"pitch_variation": 0.15,
		"priority": 2,
		"category": "ui",
		"cooldown": 30,
	},
	"equip_weapon": {
		"path": "res://assets/audio/sfx/items/equip_weapon.ogg",
		"volume": 0.75,
		"pitch_variation": 0.05,
		"priority": 2,
		"category": "ui",
		"cooldown": 100,
	},
	"equip_armor": {
		"path": "res://assets/audio/sfx/items/equip_armor.ogg",
		"volume": 0.75,
		"pitch_variation": 0.05,
		"priority": 2,
		"category": "ui",
		"cooldown": 100,
	},
	"chest_open": {
		"path": "res://assets/audio/sfx/items/chest_open.ogg",
		"volume": 0.8,
		"pitch_variation": 0.05,
		"priority": 3,
		"category": "ui",
		"cooldown": 300,
	},
}

# --- Variant Groups (for random selection) ---
const VARIANTS: Dictionary = {
	"sword_swing": ["sword_swing_1", "sword_swing_2", "sword_swing_3"],
	"hit_melee": ["hit_melee_1", "hit_melee_2", "hit_melee_3"],
	"footstep_stone": ["footstep_stone_1", "footstep_stone_2"],
	"footstep_dirt": ["footstep_dirt_1", "footstep_dirt_2"],
	"spell": ["spell_fire", "spell_ice", "spell_lightning"],
}


# --- Static Access Methods ---

static func get_definition(sound_id: String) -> Dictionary:
	return DEFINITIONS.get(sound_id, {})


static func get_variant_group(group_name: String) -> Array:
	return VARIANTS.get(group_name, [])


static func get_all_ids() -> Array:
	return DEFINITIONS.keys()


static func get_all_groups() -> Array:
	return VARIANTS.keys()
