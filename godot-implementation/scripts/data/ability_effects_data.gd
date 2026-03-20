class_name AbilityEffectsData
extends RefCounted
## Static data class containing visual/audio effect configurations for all ability types.
## Defines telegraph, impact, particle, and camera effects for each ability.

# --- Element Colors ---
const ELEMENT_COLORS: Dictionary = {
	"none": Color(1.0, 1.0, 1.0, 1.0),
	"physical": Color(0.9, 0.9, 0.9, 1.0),
	"fire": Color(1.0, 0.4, 0.1, 1.0),
	"ice": Color(0.4, 0.8, 1.0, 1.0),
	"water": Color(0.2, 0.5, 1.0, 1.0),
	"earth": Color(0.6, 0.45, 0.2, 1.0),
	"nature": Color(0.3, 0.85, 0.3, 1.0),
	"death": Color(0.5, 0.1, 0.5, 1.0),
	"arcane": Color(0.7, 0.3, 1.0, 1.0),
	"dark": Color(0.3, 0.0, 0.4, 1.0),
	"holy": Color(1.0, 0.95, 0.6, 1.0),
	"poison": Color(0.4, 0.8, 0.1, 1.0),
	"lightning": Color(1.0, 1.0, 0.3, 1.0),
	"void": Color(0.2, 0.0, 0.3, 1.0),
}

# --- Ability Effect Definitions ---
# Each ability: {type, telegraph:{sound,duration}, impact:{sound,shake}, particles:{}, camera:{}}
const ABILITIES: Dictionary = {
	"melee_swing": {
		"type": "melee",
		"telegraph": {"sound": "sword_swing_1", "duration": 0.15},
		"impact": {"sound": "hit_melee_1", "shake": 2.0},
		"particles": {"type": "slash", "count": 8, "speed": 80.0, "lifetime": 0.3},
		"camera": {"shake_intensity": 2.0, "shake_duration": 0.15},
	},
	"claw_swipe": {
		"type": "melee",
		"telegraph": {"sound": "sword_swing_2", "duration": 0.2},
		"impact": {"sound": "hit_melee_2", "shake": 3.0},
		"particles": {"type": "slash", "count": 12, "speed": 100.0, "lifetime": 0.3},
		"camera": {"shake_intensity": 3.0, "shake_duration": 0.2},
	},
	"bite": {
		"type": "melee",
		"telegraph": {"sound": "sword_swing_1", "duration": 0.1},
		"impact": {"sound": "hit_melee_3", "shake": 2.5},
		"particles": {"type": "burst", "count": 6, "speed": 60.0, "lifetime": 0.25},
		"camera": {"shake_intensity": 2.5, "shake_duration": 0.15},
	},
	"double_strike": {
		"type": "melee",
		"telegraph": {"sound": "sword_swing_1", "duration": 0.12},
		"impact": {"sound": "hit_melee_1", "shake": 2.0},
		"particles": {"type": "slash", "count": 10, "speed": 90.0, "lifetime": 0.25},
		"camera": {"shake_intensity": 2.0, "shake_duration": 0.12},
	},
	"tail_whip": {
		"type": "melee",
		"telegraph": {"sound": "sword_swing_3", "duration": 0.25},
		"impact": {"sound": "hit_melee_2", "shake": 4.0},
		"particles": {"type": "arc", "count": 16, "speed": 120.0, "lifetime": 0.35},
		"camera": {"shake_intensity": 4.0, "shake_duration": 0.25},
	},
	"sweep": {
		"type": "melee",
		"telegraph": {"sound": "sword_swing_2", "duration": 0.3},
		"impact": {"sound": "hit_melee_3", "shake": 3.5},
		"particles": {"type": "arc", "count": 20, "speed": 110.0, "lifetime": 0.4},
		"camera": {"shake_intensity": 3.5, "shake_duration": 0.2},
	},
	"ground_slam": {
		"type": "area",
		"telegraph": {"sound": "sword_swing_3", "duration": 0.4},
		"impact": {"sound": "hit_critical", "shake": 6.0},
		"particles": {"type": "ring", "count": 24, "speed": 150.0, "lifetime": 0.5},
		"camera": {"shake_intensity": 6.0, "shake_duration": 0.35},
	},
	"heavy_slam": {
		"type": "area",
		"telegraph": {"sound": "sword_swing_3", "duration": 0.5},
		"impact": {"sound": "hit_critical", "shake": 8.0},
		"particles": {"type": "ring", "count": 30, "speed": 180.0, "lifetime": 0.6},
		"camera": {"shake_intensity": 8.0, "shake_duration": 0.4},
	},
	"stomp": {
		"type": "area",
		"telegraph": {"sound": "sword_swing_1", "duration": 0.3},
		"impact": {"sound": "hit_melee_3", "shake": 5.0},
		"particles": {"type": "ring", "count": 16, "speed": 100.0, "lifetime": 0.4},
		"camera": {"shake_intensity": 5.0, "shake_duration": 0.3},
	},
	"pounce": {
		"type": "movement",
		"telegraph": {"sound": "sword_swing_2", "duration": 0.2},
		"impact": {"sound": "hit_melee_2", "shake": 4.0},
		"particles": {"type": "burst", "count": 12, "speed": 120.0, "lifetime": 0.3},
		"camera": {"shake_intensity": 4.0, "shake_duration": 0.2},
	},
	"charge": {
		"type": "movement",
		"telegraph": {"sound": "sword_swing_3", "duration": 0.3},
		"impact": {"sound": "hit_critical", "shake": 5.0},
		"particles": {"type": "trail", "count": 8, "speed": 60.0, "lifetime": 0.5},
		"camera": {"shake_intensity": 5.0, "shake_duration": 0.25},
	},
	"bull_rush": {
		"type": "movement",
		"telegraph": {"sound": "sword_swing_3", "duration": 0.35},
		"impact": {"sound": "hit_critical", "shake": 6.0},
		"particles": {"type": "trail", "count": 12, "speed": 80.0, "lifetime": 0.5},
		"camera": {"shake_intensity": 6.0, "shake_duration": 0.3},
	},
	"lunge": {
		"type": "movement",
		"telegraph": {"sound": "sword_swing_1", "duration": 0.15},
		"impact": {"sound": "hit_melee_1", "shake": 3.0},
		"particles": {"type": "burst", "count": 8, "speed": 100.0, "lifetime": 0.25},
		"camera": {"shake_intensity": 3.0, "shake_duration": 0.15},
	},
	"fire_breath": {
		"type": "cone",
		"telegraph": {"sound": "spell_fire", "duration": 0.4},
		"impact": {"sound": "spell_fire", "shake": 3.0},
		"particles": {"type": "cone_fire", "count": 30, "speed": 200.0, "lifetime": 0.8, "element": "fire"},
		"camera": {"shake_intensity": 3.0, "shake_duration": 0.4},
	},
	"frost_breath": {
		"type": "cone",
		"telegraph": {"sound": "spell_ice", "duration": 0.4},
		"impact": {"sound": "spell_ice", "shake": 3.0},
		"particles": {"type": "cone_ice", "count": 25, "speed": 180.0, "lifetime": 0.8, "element": "ice"},
		"camera": {"shake_intensity": 3.0, "shake_duration": 0.4},
	},
	"poison_cloud": {
		"type": "area",
		"telegraph": {"sound": "spell_fire", "duration": 0.5},
		"impact": {"sound": "spell_fire", "shake": 1.5},
		"particles": {"type": "cloud", "count": 20, "speed": 30.0, "lifetime": 2.0, "element": "poison"},
		"camera": {"shake_intensity": 1.5, "shake_duration": 0.2},
	},
	"homing_orb": {
		"type": "projectile",
		"telegraph": {"sound": "spell_lightning", "duration": 0.3},
		"impact": {"sound": "spell_fire", "shake": 3.0},
		"particles": {"type": "orb", "count": 8, "speed": 150.0, "lifetime": 0.4, "element": "arcane"},
		"camera": {"shake_intensity": 3.0, "shake_duration": 0.2},
	},
	"projectile_burst": {
		"type": "projectile",
		"telegraph": {"sound": "spell_ice", "duration": 0.25},
		"impact": {"sound": "hit_melee_1", "shake": 2.0},
		"particles": {"type": "burst", "count": 16, "speed": 200.0, "lifetime": 0.3},
		"camera": {"shake_intensity": 2.0, "shake_duration": 0.15},
	},
	"projectile_single": {
		"type": "projectile",
		"telegraph": {"sound": "bow_release", "duration": 0.2},
		"impact": {"sound": "hit_melee_2", "shake": 2.0},
		"particles": {"type": "trail", "count": 4, "speed": 250.0, "lifetime": 0.2},
		"camera": {"shake_intensity": 2.0, "shake_duration": 0.1},
	},
	"web_shot": {
		"type": "projectile",
		"telegraph": {"sound": "bow_release", "duration": 0.2},
		"impact": {"sound": "hit_melee_3", "shake": 1.5},
		"particles": {"type": "web", "count": 10, "speed": 120.0, "lifetime": 0.5},
		"camera": {"shake_intensity": 1.5, "shake_duration": 0.15},
	},
	"life_drain": {
		"type": "beam",
		"telegraph": {"sound": "spell_heal", "duration": 0.3},
		"impact": {"sound": "spell_heal", "shake": 2.0},
		"particles": {"type": "drain", "count": 12, "speed": 80.0, "lifetime": 1.0, "element": "death"},
		"camera": {"shake_intensity": 2.0, "shake_duration": 0.3},
	},
	"void_beam": {
		"type": "beam",
		"telegraph": {"sound": "spell_lightning", "duration": 0.5},
		"impact": {"sound": "spell_lightning", "shake": 5.0},
		"particles": {"type": "beam", "count": 20, "speed": 300.0, "lifetime": 0.6, "element": "void"},
		"camera": {"shake_intensity": 5.0, "shake_duration": 0.5},
	},
}

# ---------------------------------------------------------------------------
# Ability Visual Effects -- per-ability rendering configuration
# ---------------------------------------------------------------------------
# Maps ability name -> visual effect config used by the rendering / UI layer.
#   telegraph_type  : "circle" | "cone" | "line" | "none"
#   telegraph_color : Color shown for the telegraph indicator
#   impact_visual   : "slash" | "burst" | "beam" | "none"
#   particles       : { "type": ParticleLibrary type, "count": int }
#   camera_shake    : { "intensity": float, "duration": float }
#   hitstop_frames  : int -- engine frames to freeze on impact (0 = none)

const ABILITY_EFFECTS: Dictionary = {
	"fireball": {
		"telegraph_type": "circle",
		"telegraph_color": Color(1.0, 0.4, 0.1, 0.35),
		"impact_visual": "burst",
		"particles": {"type": "fire_trail", "count": 24},
		"camera_shake": {"intensity": 4.0, "duration": 0.25},
		"hitstop_frames": 3,
	},
	"ice_lance": {
		"telegraph_type": "line",
		"telegraph_color": Color(0.4, 0.8, 1.0, 0.35),
		"impact_visual": "burst",
		"particles": {"type": "magic_sparks", "count": 16},
		"camera_shake": {"intensity": 3.0, "duration": 0.2},
		"hitstop_frames": 4,
	},
	"earthquake": {
		"telegraph_type": "circle",
		"telegraph_color": Color(0.6, 0.45, 0.2, 0.4),
		"impact_visual": "burst",
		"particles": {"type": "death_poof", "count": 30},
		"camera_shake": {"intensity": 8.0, "duration": 0.5},
		"hitstop_frames": 6,
	},
	"heal": {
		"telegraph_type": "circle",
		"telegraph_color": Color(0.3, 0.9, 0.6, 0.3),
		"impact_visual": "none",
		"particles": {"type": "heal_glow", "count": 15},
		"camera_shake": {"intensity": 0.0, "duration": 0.0},
		"hitstop_frames": 0,
	},
	"shadow_bolt": {
		"telegraph_type": "line",
		"telegraph_color": Color(0.35, 0.1, 0.5, 0.35),
		"impact_visual": "burst",
		"particles": {"type": "magic_sparks", "count": 18},
		"camera_shake": {"intensity": 3.5, "duration": 0.2},
		"hitstop_frames": 3,
	},
	"holy_smite": {
		"telegraph_type": "circle",
		"telegraph_color": Color(1.0, 0.95, 0.6, 0.4),
		"impact_visual": "burst",
		"particles": {"type": "magic_sparks", "count": 20},
		"camera_shake": {"intensity": 5.0, "duration": 0.3},
		"hitstop_frames": 4,
	},
	"poison_cloud": {
		"telegraph_type": "circle",
		"telegraph_color": Color(0.4, 0.8, 0.1, 0.3),
		"impact_visual": "none",
		"particles": {"type": "magic_sparks", "count": 20},
		"camera_shake": {"intensity": 1.0, "duration": 0.15},
		"hitstop_frames": 0,
	},
	"lightning_strike": {
		"telegraph_type": "circle",
		"telegraph_color": Color(1.0, 1.0, 0.3, 0.4),
		"impact_visual": "beam",
		"particles": {"type": "magic_sparks", "count": 22},
		"camera_shake": {"intensity": 6.0, "duration": 0.3},
		"hitstop_frames": 5,
	},
	"shield_bash": {
		"telegraph_type": "cone",
		"telegraph_color": Color(0.9, 0.9, 0.9, 0.3),
		"impact_visual": "slash",
		"particles": {"type": "magic_sparks", "count": 10},
		"camera_shake": {"intensity": 4.0, "duration": 0.2},
		"hitstop_frames": 5,
	},
	"whirlwind": {
		"telegraph_type": "circle",
		"telegraph_color": Color(0.8, 0.85, 0.9, 0.3),
		"impact_visual": "slash",
		"particles": {"type": "magic_sparks", "count": 24},
		"camera_shake": {"intensity": 3.0, "duration": 0.35},
		"hitstop_frames": 2,
	},
}


# --- Static Access Methods ---

static func get_ability(ability_id: String) -> Dictionary:
	return ABILITIES.get(ability_id, {})


static func get_element_color(element: String) -> Color:
	return ELEMENT_COLORS.get(element.to_lower(), ELEMENT_COLORS["none"])


static func get_all_ability_ids() -> Array:
	return ABILITIES.keys()


static func get_abilities_by_type(ability_type: String) -> Array:
	var result: Array = []
	for ability_id in ABILITIES:
		var ability: Dictionary = ABILITIES[ability_id]
		if ability.get("type", "") == ability_type:
			result.append(ability_id)
	return result


## Look up the visual effect configuration for a named ability.
## Returns an empty Dictionary if the ability has no effect entry.
static func get_effect(ability_name: String) -> Dictionary:
	return ABILITY_EFFECTS.get(ability_name, {})
