class_name DodgeSystem
extends BaseSystem
## Active defense with invincibility frames and directional roll.

# --- Config ---
const IFRAME_DURATION: float = 0.3    # Invincibility window
const ROLL_DURATION: float = 0.35     # Total roll time
const COOLDOWN: float = 1.0
const STAMINA_COST: int = 15
const ROLL_DISTANCE: float = 2.0      # Tiles
const ROLL_SPEED: float = 6.0         # Tiles/sec
const CHECKS_PER_TILE: int = 4        # Collision checks during roll

# --- Direction vectors ---
const DIR_MAP: Dictionary = {
	"up":         Vector2( 0, -1),
	"down":       Vector2( 0,  1),
	"left":       Vector2(-1,  0),
	"right":      Vector2( 1,  0),
	"up_left":    Vector2(-0.707, -0.707),
	"up_right":   Vector2( 0.707, -0.707),
	"down_left":  Vector2(-0.707,  0.707),
	"down_right": Vector2( 0.707,  0.707),
}

# --- State ---
var is_dodging: bool = false
var is_invincible: bool = false
var cooldown_remaining: float = 0.0
var roll_direction: Vector2 = Vector2.ZERO
var roll_progress: float = 0.0
var _roll_start_pos: Vector2 = Vector2.ZERO
var _roll_target_pos: Vector2 = Vector2.ZERO
var _iframe_timer: float = 0.0
var _roll_timer: float = 0.0


func _init() -> void:
	system_name = "dodge-system"
	priority = 25


func initialize() -> void:
	pass


func process_system(delta: float) -> void:
	# Cooldown tick
	if cooldown_remaining > 0.0:
		cooldown_remaining -= delta

	if not is_dodging:
		return

	# Update roll
	_roll_timer += delta
	roll_progress = minf(_roll_timer / ROLL_DURATION, 1.0)

	# Ease-out quad: t * (2 - t)
	var eased := roll_progress * (2.0 - roll_progress)

	# Move player
	if GameManager.player:
		var new_pos := _roll_start_pos.lerp(_roll_target_pos, eased)
		GameManager.player.position = new_pos

	# I-frame tracking
	_iframe_timer -= delta
	if _iframe_timer <= 0.0:
		is_invincible = false

	# Roll completion
	if roll_progress >= 1.0:
		_end_dodge()


func cleanup() -> void:
	is_dodging = false
	is_invincible = false
	cooldown_remaining = 0.0
	roll_direction = Vector2.ZERO
	roll_progress = 0.0
	_roll_timer = 0.0
	_iframe_timer = 0.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func try_dodge(player: Node, direction: String = "") -> bool:
	## Attempts a dodge roll. Returns true if successful.
	if is_dodging:
		return false
	if cooldown_remaining > 0.0:
		return false
	if not player:
		return false

	# Check for CC effects
	if player.get("is_stunned") == true:
		return false
	if player.get("is_frozen") == true:
		return false

	# Determine direction
	var dir := Vector2.ZERO
	if direction != "" and DIR_MAP.has(direction):
		dir = DIR_MAP[direction]
	else:
		# Use input direction
		dir = _get_input_direction()
		if dir == Vector2.ZERO:
			# Fall back to facing direction
			dir = _get_facing_direction(player)

	if dir == Vector2.ZERO:
		dir = Vector2(0, 1)  # Default: down

	# Consume stamina (use the stamina system if available via SystemCoordinator)
	# Direct check: does the player have enough stamina?
	if player.has_method("consume_stamina"):
		if not player.consume_stamina(STAMINA_COST):
			return false

	# Start dodge
	is_dodging = true
	is_invincible = true
	_iframe_timer = IFRAME_DURATION
	_roll_timer = 0.0
	roll_progress = 0.0
	roll_direction = dir.normalized()
	_roll_start_pos = Vector2(player.position)
	_roll_target_pos = _clamp_to_walkable(
		_roll_start_pos,
		_roll_start_pos + roll_direction * ROLL_DISTANCE * float(Constants.BASE_TILE_SIZE),
		roll_direction
	)
	cooldown_remaining = COOLDOWN

	EventBus.player_dodge_start.emit(player, roll_direction)
	return true


func is_dodge_invincible() -> bool:
	## Checked by combat system before applying damage.
	return is_invincible


func can_dodge() -> bool:
	return not is_dodging and cooldown_remaining <= 0.0


func get_cooldown_percent() -> float:
	if cooldown_remaining <= 0.0:
		return 1.0
	return 1.0 - (cooldown_remaining / COOLDOWN)


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _end_dodge() -> void:
	is_dodging = false
	is_invincible = false
	roll_direction = Vector2.ZERO
	_roll_timer = 0.0
	roll_progress = 0.0
	if GameManager.player:
		EventBus.player_dodge_end.emit(GameManager.player)


func _clamp_to_walkable(start: Vector2, target: Vector2, dir: Vector2) -> Vector2:
	## Steps along the path at CHECKS_PER_TILE per tile, returns furthest valid position.
	var total_dist := start.distance_to(target)
	var step_count := int(total_dist / float(Constants.BASE_TILE_SIZE) * float(CHECKS_PER_TILE))
	step_count = maxi(step_count, 1)
	var best_pos := start
	for i in range(1, step_count + 1):
		var t := float(i) / float(step_count)
		var check_pos := start.lerp(target, t)
		var tile := Vector2i(
			int(check_pos.x) / Constants.BASE_TILE_SIZE,
			int(check_pos.y) / Constants.BASE_TILE_SIZE
		)
		if _is_walkable(tile):
			best_pos = check_pos
		else:
			break
	return best_pos


func _is_walkable(tile: Vector2i) -> bool:
	if tile.x < 0 or tile.x >= Constants.GRID_WIDTH or tile.y < 0 or tile.y >= Constants.GRID_HEIGHT:
		return false
	if GameManager.map.is_empty():
		return true
	if tile.y >= GameManager.map.size() or tile.x >= GameManager.map[tile.y].size():
		return false
	var tile_type: int = GameManager.map[tile.y][tile.x]
	return tile_type == Constants.TileType.FLOOR \
		or tile_type == Constants.TileType.DOOR \
		or tile_type == Constants.TileType.STAIRS_DOWN \
		or tile_type == Constants.TileType.GRASS \
		or tile_type == Constants.TileType.PATH \
		or tile_type == Constants.TileType.EXIT


func _get_input_direction() -> Vector2:
	var dir := Vector2.ZERO
	if Input.is_action_pressed("move_up"):
		dir.y -= 1
	if Input.is_action_pressed("move_down"):
		dir.y += 1
	if Input.is_action_pressed("move_left"):
		dir.x -= 1
	if Input.is_action_pressed("move_right"):
		dir.x += 1
	return dir.normalized() if dir != Vector2.ZERO else Vector2.ZERO


func _get_facing_direction(player: Node) -> Vector2:
	if player.has_method("get_facing_vector"):
		return player.get_facing_vector()
	if player.get("facing") != null:
		match player.facing:
			"up":    return Vector2(0, -1)
			"down":  return Vector2(0, 1)
			"left":  return Vector2(-1, 0)
			"right": return Vector2(1, 0)
	return Vector2(0, 1)
