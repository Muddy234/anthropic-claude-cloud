class_name PlayerAnimationSystem
extends BaseSystem
## Manages player sprite animation: idle, walk, attack, hurt, death states,
## directional facing, and dash ghost trails.

# --- Animation definitions ---
const ANIM_DEFS: Dictionary = {
	"idle":    {"frames": 4, "fps": 6,  "loop": true},
	"walk":    {"frames": 6, "fps": 10, "loop": true},
	"attack":  {"frames": 4, "fps": 12, "loop": false},
	"hurt":    {"frames": 2, "fps": 8,  "loop": false},
	"death":   {"frames": 4, "fps": 6,  "loop": false},
}

# --- Ghost trail config ---
const GHOST_COUNT: int = 3
const GHOST_FADE_TIME: float = 0.2
const GHOST_ALPHA_START: float = 0.5
const GHOST_HUE_SHIFT: float = 200.0  # degrees

# --- State ---
var animation_state: String = "idle"
var facing: String = "down"  # up | down | left | right
var current_frame: int = 0
var anim_timer: float = 0.0
var _prev_position: Vector2 = Vector2.ZERO
var _anim_finished_callback: Callable = Callable()

# Ghost trail
var _ghost_sprites: Array[Dictionary] = []  # {position, alpha, timer}
var _ghost_trail_active: bool = false


func _init() -> void:
	system_name = "player-animation"
	priority = 25


func initialize() -> void:
	EventBus.player_dodge_start.connect(_on_dodge_start)
	EventBus.player_dodge_end.connect(_on_dodge_end)
	EventBus.player_took_damage.connect(_on_player_took_damage)


func process_system(delta: float) -> void:
	if not GameManager.player:
		return

	_update_facing()
	_update_animation(delta)
	_update_ghost_trail(delta)
	_apply_to_sprite()


func cleanup() -> void:
	animation_state = "idle"
	facing = "down"
	current_frame = 0
	anim_timer = 0.0
	_ghost_sprites.clear()
	_ghost_trail_active = false


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func play_animation(anim_name: String, callback: Callable = Callable()) -> void:
	## Forces a specific animation. Optional callback when non-looping anim finishes.
	if not ANIM_DEFS.has(anim_name):
		return
	animation_state = anim_name
	current_frame = 0
	anim_timer = 0.0
	_anim_finished_callback = callback


func play_attack() -> void:
	play_animation("attack", _on_attack_finished)


func play_hurt() -> void:
	if animation_state == "death":
		return
	play_animation("hurt", _on_hurt_finished)


func play_death() -> void:
	play_animation("death")


func get_animation_state() -> String:
	return animation_state


func get_facing() -> String:
	return facing


func get_facing_vector() -> Vector2:
	match facing:
		"up":    return Vector2(0, -1)
		"down":  return Vector2(0,  1)
		"left":  return Vector2(-1, 0)
		"right": return Vector2(1,  0)
		_:       return Vector2(0,  1)


func is_animation_playing(anim_name: String) -> bool:
	return animation_state == anim_name


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _update_facing() -> void:
	if animation_state == "attack" or animation_state == "death":
		return  # Don't change facing during locked animations

	var player: Node = GameManager.player
	var velocity := Vector2.ZERO

	if player is CharacterBody2D:
		velocity = player.velocity
	elif player.has_method("get_velocity"):
		velocity = player.get_velocity()
	else:
		velocity = Vector2(player.position) - _prev_position
		_prev_position = Vector2(player.position)

	if velocity.length_squared() < 0.01:
		return

	# Determine dominant axis
	if absf(velocity.x) > absf(velocity.y):
		facing = "right" if velocity.x > 0 else "left"
	else:
		facing = "down" if velocity.y > 0 else "up"


func _update_animation(delta: float) -> void:
	var def: Dictionary = ANIM_DEFS.get(animation_state, ANIM_DEFS["idle"])
	var fps: float = def.get("fps", 6)
	var frame_count: int = def.get("frames", 4)
	var loops: bool = def.get("loop", true)

	anim_timer += delta
	var frame_duration := 1.0 / fps
	if anim_timer >= frame_duration:
		anim_timer -= frame_duration
		current_frame += 1

		if current_frame >= frame_count:
			if loops:
				current_frame = 0
			else:
				current_frame = frame_count - 1
				_on_animation_finished()

	# Auto-detect idle vs walk
	if animation_state != "attack" and animation_state != "hurt" and animation_state != "death":
		var player: Node = GameManager.player
		var is_moving := false
		if player is CharacterBody2D:
			is_moving = player.velocity.length_squared() > 1.0
		elif player.has_method("get_velocity"):
			is_moving = player.get_velocity().length_squared() > 1.0
		else:
			is_moving = Vector2(player.position).distance_squared_to(_prev_position) > 0.01

		var target_state := "walk" if is_moving else "idle"
		if animation_state != target_state:
			animation_state = target_state
			current_frame = 0
			anim_timer = 0.0


func _apply_to_sprite() -> void:
	var player: Node = GameManager.player
	if not player:
		return

	# Apply to AnimatedSprite2D if present
	var sprite: AnimatedSprite2D = player.get_node_or_null("AnimatedSprite2D")
	if sprite:
		var anim_name := "%s_%s" % [animation_state, facing]
		if sprite.sprite_frames and sprite.sprite_frames.has_animation(anim_name):
			if sprite.animation != anim_name:
				sprite.play(anim_name)
			sprite.frame = mini(current_frame, sprite.sprite_frames.get_frame_count(anim_name) - 1)
		# Flip for left/right if using single directional sprites
		sprite.flip_h = (facing == "left")


func _on_animation_finished() -> void:
	if _anim_finished_callback.is_valid():
		var cb := _anim_finished_callback
		_anim_finished_callback = Callable()
		cb.call()


func _on_attack_finished() -> void:
	animation_state = "idle"
	current_frame = 0
	anim_timer = 0.0


func _on_hurt_finished() -> void:
	if animation_state == "hurt":
		animation_state = "idle"
		current_frame = 0
		anim_timer = 0.0


# ---------------------------------------------------------------------------
# Ghost trail
# ---------------------------------------------------------------------------

func _update_ghost_trail(delta: float) -> void:
	# Update existing ghosts
	var i := _ghost_sprites.size() - 1
	while i >= 0:
		_ghost_sprites[i]["timer"] -= delta
		_ghost_sprites[i]["alpha"] = maxf(0.0, _ghost_sprites[i]["alpha"] - delta / GHOST_FADE_TIME)
		if _ghost_sprites[i]["timer"] <= 0.0:
			_ghost_sprites.remove_at(i)
		i -= 1

	# Spawn new ghosts while dodging
	if _ghost_trail_active and GameManager.player:
		_ghost_sprites.append({
			"position": Vector2(GameManager.player.position),
			"alpha": GHOST_ALPHA_START,
			"timer": GHOST_FADE_TIME,
			"frame": current_frame,
			"facing": facing,
		})
		# Limit ghost count
		while _ghost_sprites.size() > GHOST_COUNT:
			_ghost_sprites.pop_front()


func get_ghost_sprites() -> Array[Dictionary]:
	## Returns ghost sprite data for the renderer to draw.
	return _ghost_sprites


# ---------------------------------------------------------------------------
# Signal handlers
# ---------------------------------------------------------------------------

func _on_dodge_start(_player: Node, _direction: Vector2) -> void:
	_ghost_trail_active = true


func _on_dodge_end(_player: Node) -> void:
	_ghost_trail_active = false


func _on_player_took_damage(_player: Node, amount: float, _source: Node) -> void:
	if amount > 0 and animation_state != "death":
		play_hurt()
