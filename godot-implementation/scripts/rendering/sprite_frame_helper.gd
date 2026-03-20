class_name SpriteFrameHelper
extends RefCounted
## Helper for programmatically building SpriteFrames resources from
## spritesheet textures. Handles standard animation names, per-row frame
## extraction via AtlasTexture, and right-direction flip_h convention.
##
## Standard animation names (matching the JS ANIMATION_TYPES + ANIMATION_PHASES):
##   idle_down, idle_up, idle_left
##   walk_down, walk_up, walk_left
##   attack_windup, attack_strike, attack_recovery
##   death
##
## Right-facing animations use flip_h on the corresponding left sprites;
## no separate "idle_right" / "walk_right" animations are stored.

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

## Default animation definitions used when the caller does not provide
## an explicit anim_config dictionary. Each entry maps an animation name
## to a row index, frame count, playback speed, and loop flag.
const DEFAULT_MONSTER_ANIMS: Dictionary = {
	"idle_down":        {"row": 0,  "frames": 4, "speed": 4.0,  "loop": true},
	"idle_up":          {"row": 1,  "frames": 4, "speed": 4.0,  "loop": true},
	"idle_left":        {"row": 2,  "frames": 4, "speed": 4.0,  "loop": true},
	"walk_down":        {"row": 3,  "frames": 6, "speed": 8.0,  "loop": true},
	"walk_up":          {"row": 4,  "frames": 6, "speed": 8.0,  "loop": true},
	"walk_left":        {"row": 5,  "frames": 6, "speed": 8.0,  "loop": true},
	"attack_windup":    {"row": 6,  "frames": 3, "speed": 6.0,  "loop": false},
	"attack_strike":    {"row": 7,  "frames": 2, "speed": 12.0, "loop": false},
	"attack_recovery":  {"row": 8,  "frames": 2, "speed": 6.0,  "loop": false},
	"death":            {"row": 9,  "frames": 4, "speed": 6.0,  "loop": false},
}

## Default player animation layout -- identical structure but may have
## different frame counts for walk cycles.
const DEFAULT_PLAYER_ANIMS: Dictionary = {
	"idle_down":        {"row": 0,  "frames": 4, "speed": 4.0,  "loop": true},
	"idle_up":          {"row": 1,  "frames": 4, "speed": 4.0,  "loop": true},
	"idle_left":        {"row": 2,  "frames": 4, "speed": 4.0,  "loop": true},
	"walk_down":        {"row": 3,  "frames": 8, "speed": 10.0, "loop": true},
	"walk_up":          {"row": 4,  "frames": 8, "speed": 10.0, "loop": true},
	"walk_left":        {"row": 5,  "frames": 8, "speed": 10.0, "loop": true},
	"attack_windup":    {"row": 6,  "frames": 3, "speed": 8.0,  "loop": false},
	"attack_strike":    {"row": 7,  "frames": 2, "speed": 14.0, "loop": false},
	"attack_recovery":  {"row": 8,  "frames": 2, "speed": 8.0,  "loop": false},
	"death":            {"row": 9,  "frames": 6, "speed": 6.0,  "loop": false},
}

## All standard animation names in canonical order.
const STANDARD_ANIM_NAMES: PackedStringArray = PackedStringArray([
	"idle_down", "idle_up", "idle_left",
	"walk_down", "walk_up", "walk_left",
	"attack_windup", "attack_strike", "attack_recovery",
	"death",
])


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

## Build a SpriteFrames resource for a monster from a single spritesheet.
##
## [param sprite_sheet]  The full spritesheet Texture2D (rows = animations,
##                       columns = frames).
## [param frame_size]    Size of one frame in pixels, e.g. Vector2i(32, 32).
## [param anim_config]   Optional dictionary overriding DEFAULT_MONSTER_ANIMS.
##                       Keys are animation names; values are dictionaries
##                       with "row", "frames", "speed", and "loop" entries.
##                       Entries in anim_config override defaults; defaults
##                       fill in any animation names not provided.
## Returns a ready-to-use SpriteFrames resource.
static func create_monster_frames(
	sprite_sheet: Texture2D,
	frame_size: Vector2i = Vector2i(32, 32),
	anim_config: Dictionary = {}
) -> SpriteFrames:
	var merged := DEFAULT_MONSTER_ANIMS.duplicate(true)
	merged.merge(anim_config, true)
	return _build_sprite_frames(sprite_sheet, frame_size, merged)


## Build a SpriteFrames resource for the player, compositing the base body
## sheet with zero or more equipment overlay sheets.
##
## [param base_sheet]       Base player body spritesheet.
## [param equipment_sheets] Array of equipment overlay Texture2Ds.  Each
##                          overlay is expected to share the same row/frame
##                          layout and frame_size as the base sheet.
##                          If empty, only the base sheet is used.
## [param frame_size]       Size of one frame in pixels.
## [param anim_config]      Optional overrides for DEFAULT_PLAYER_ANIMS.
##
## The returned SpriteFrames contains frames from the base sheet only.
## Equipment overlays are intended to be rendered by separate Sprite2D
## children that share the same frame index; this method stores overlay
## atlas regions in the SpriteFrames metadata under the key
## "equipment_atlases" so that the player rendering script can look them up.
static func create_player_frames(
	base_sheet: Texture2D,
	equipment_sheets: Array[Texture2D] = [],
	frame_size: Vector2i = Vector2i(32, 32),
	anim_config: Dictionary = {}
) -> SpriteFrames:
	var merged := DEFAULT_PLAYER_ANIMS.duplicate(true)
	merged.merge(anim_config, true)

	var sf := _build_sprite_frames(base_sheet, frame_size, merged)

	# Store equipment atlas metadata so the player sprite script can
	# build Sprite2D overlays per equipment slot.
	if not equipment_sheets.is_empty():
		var equip_data: Array[Dictionary] = []
		for equip_tex in equipment_sheets:
			var tex_data: Dictionary = {}
			for anim_name in merged:
				var adef: Dictionary = merged[anim_name]
				var row: int = adef.get("row", 0)
				var frame_count: int = adef.get("frames", 1)
				var regions: Array[Rect2] = []
				for i in range(frame_count):
					regions.append(Rect2(
						i * frame_size.x,
						row * frame_size.y,
						frame_size.x,
						frame_size.y
					))
				tex_data[anim_name] = {
					"texture": equip_tex,
					"regions": regions,
				}
			equip_data.append(tex_data)
		sf.set_meta("equipment_atlases", equip_data)

	return sf


## Return the list of standard animation names.
static func get_standard_anim_names() -> PackedStringArray:
	return STANDARD_ANIM_NAMES


## Given a direction string ("down", "up", "left", "right") and a base
## animation prefix ("idle", "walk"), return the animation name and
## whether flip_h should be enabled.
##
## Right-facing uses the left animation with flip_h = true.
static func resolve_direction_anim(prefix: String, direction: String) -> Dictionary:
	var flip_h: bool = false
	var dir_key: String = direction

	if direction == "right":
		dir_key = "left"
		flip_h = true

	var anim_name: String = "%s_%s" % [prefix, dir_key]
	return {"animation": anim_name, "flip_h": flip_h}


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

## Core builder: creates a SpriteFrames from a texture and animation map.
static func _build_sprite_frames(
	texture: Texture2D,
	frame_size: Vector2i,
	anim_defs: Dictionary
) -> SpriteFrames:
	var sf := SpriteFrames.new()
	# Remove Godot's auto-created "default" animation.
	if sf.has_animation("default"):
		sf.remove_animation("default")

	for anim_name in anim_defs:
		var adef: Dictionary = anim_defs[anim_name]
		var row: int = adef.get("row", 0)
		var frame_count: int = adef.get("frames", 1)
		var speed: float = adef.get("speed", 8.0)
		var loop: bool = adef.get("loop", true)

		sf.add_animation(anim_name)
		sf.set_animation_speed(anim_name, speed)
		sf.set_animation_loop(anim_name, loop)

		for i in range(frame_count):
			var atlas := AtlasTexture.new()
			atlas.atlas = texture
			atlas.region = Rect2(
				i * frame_size.x,
				row * frame_size.y,
				frame_size.x,
				frame_size.y
			)
			sf.add_frame(anim_name, atlas)

	return sf
