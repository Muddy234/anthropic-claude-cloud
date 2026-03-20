class_name NoiseSystem
extends BaseSystem
## Sound propagation for stealth mechanics. Monsters react to player-generated noise.

# --- Config ---
const DETECTION_THRESHOLD: int = 15
const BLOCKED_VOLUME_FACTOR: float = 0.3
const NOISE_DECAY_RATE: float = 2.0  # per second for lingering noise

# --- Noise categories ---
enum NoiseCategory { MOVEMENT, INTERACTION, COMBAT, ABILITY, COMMUNICATION, ENVIRONMENT }

# --- Noise type definitions: {volume, category} ---
const NOISE_TYPES: Dictionary = {
	"step_sneak":      {"volume": 10, "category": NoiseCategory.MOVEMENT},
	"step_walk":       {"volume": 25, "category": NoiseCategory.MOVEMENT},
	"step_run":        {"volume": 45, "category": NoiseCategory.MOVEMENT},
	"door_open":       {"volume": 35, "category": NoiseCategory.INTERACTION},
	"door_break":      {"volume": 70, "category": NoiseCategory.INTERACTION},
	"chest_open":      {"volume": 30, "category": NoiseCategory.INTERACTION},
	"attack_melee":    {"volume": 50, "category": NoiseCategory.COMBAT},
	"attack_ranged":   {"volume": 40, "category": NoiseCategory.COMBAT},
	"attack_magic":    {"volume": 55, "category": NoiseCategory.COMBAT},
	"ability_small":   {"volume": 35, "category": NoiseCategory.ABILITY},
	"ability_large":   {"volume": 75, "category": NoiseCategory.ABILITY},
	"explosion":       {"volume": 90, "category": NoiseCategory.ABILITY},
	"monster_shout":   {"volume": 65, "category": NoiseCategory.COMMUNICATION},
	"item_drop":       {"volume": 20, "category": NoiseCategory.INTERACTION},
	"ambient_crumble": {"volume": 15, "category": NoiseCategory.ENVIRONMENT},
}

# --- State ---
var _recent_noises: Array[Dictionary] = []  # {position, volume, type, age}
var _noise_modifier: float = 1.0            # Global modifier (e.g., boon)


func _init() -> void:
	system_name = "noise-system"
	priority = 30


func initialize() -> void:
	EventBus.player_attacked.connect(_on_player_attacked)


func process_system(delta: float) -> void:
	# Decay recent noises
	var i := _recent_noises.size() - 1
	while i >= 0:
		_recent_noises[i]["age"] += delta
		_recent_noises[i]["volume"] -= NOISE_DECAY_RATE * delta
		if _recent_noises[i]["volume"] <= 0.0 or _recent_noises[i]["age"] > 5.0:
			_recent_noises.remove_at(i)
		i -= 1


func cleanup() -> void:
	_recent_noises.clear()
	_noise_modifier = 1.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

func emit_noise(x: int, y: int, volume: int, noise_type: String = "step_walk") -> void:
	## Emits noise at tile position with given volume. Alerts nearby enemies.
	var effective_volume := int(float(volume) * _noise_modifier)
	if effective_volume < DETECTION_THRESHOLD:
		return

	var pos := Vector2i(x, y)

	# Track for decay
	_recent_noises.append({
		"position": pos,
		"volume": float(effective_volume),
		"type": noise_type,
		"age": 0.0,
	})

	# Calculate propagation range
	var max_range := maxi(effective_volume / 5, 2)

	# Alert enemies
	_alert_monsters(pos, effective_volume, max_range, noise_type)


func emit_noise_by_type(x: int, y: int, noise_type: String) -> void:
	## Convenience: emits noise using the predefined volume for a type.
	var def: Dictionary = NOISE_TYPES.get(noise_type, {})
	var volume: int = def.get("volume", 25)
	emit_noise(x, y, volume, noise_type)


func get_noise_at(x: int, y: int) -> float:
	## Returns current noise level at a tile (from lingering noises).
	var total := 0.0
	var pos := Vector2(x, y)
	for noise in _recent_noises:
		var dist := pos.distance_to(Vector2(noise["position"]))
		var max_range := maxf(noise["volume"] / 5.0, 2.0)
		if dist <= max_range:
			total += noise["volume"] * (1.0 - dist / max_range)
	return total


func set_noise_modifier(modifier: float) -> void:
	## Global noise modifier (e.g., stealth boon = 0.5).
	_noise_modifier = maxf(modifier, 0.0)


func get_noise_modifier() -> float:
	return _noise_modifier


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _alert_monsters(origin: Vector2i, volume: int, max_range: int, noise_type: String) -> void:
	for enemy in GameManager.enemies:
		if not is_instance_valid(enemy):
			continue

		var enemy_pos := Vector2i(
			int(enemy.position.x) / Constants.BASE_TILE_SIZE,
			int(enemy.position.y) / Constants.BASE_TILE_SIZE
		)
		var dist := Vector2(origin).distance_to(Vector2(enemy_pos))
		if dist > float(max_range):
			continue

		# Volume at distance (linear falloff)
		var volume_at_point := float(volume) * (1.0 - dist / float(max_range))

		# Check if blocked by walls (reduces to 30%)
		if _check_blocked(origin, enemy_pos):
			volume_at_point *= BLOCKED_VOLUME_FACTOR

		# Check enemy hearing
		var hearing_range: float = Constants.AI_CONFIG.get("hearing_range", 4)
		var hearing_multiplier: float = 1.0
		if enemy.has_method("get_hearing_range"):
			hearing_range = enemy.get_hearing_range()
		if enemy.get("hearing_multiplier") != null:
			hearing_multiplier = enemy.hearing_multiplier

		var effective_volume := volume_at_point * hearing_multiplier
		if effective_volume > float(DETECTION_THRESHOLD) and dist <= hearing_range * 2.0:
			# Alert the enemy
			if enemy.has_method("on_noise_heard"):
				enemy.on_noise_heard(origin, effective_volume, noise_type)


func _check_blocked(from: Vector2i, to: Vector2i) -> bool:
	## Returns true if walls block sound between two tiles.
	var dx := absi(to.x - from.x)
	var dy := absi(to.y - from.y)
	var sx := 1 if from.x < to.x else -1
	var sy := 1 if from.y < to.y else -1
	var err := dx - dy
	var x := from.x
	var y := from.y

	while true:
		if x == to.x and y == to.y:
			break
		if _is_wall(Vector2i(x, y)):
			return true
		var e2 := 2 * err
		if e2 > -dy:
			err -= dy
			x += sx
		if e2 < dx:
			err += dx
			y += sy
	return false


func _is_wall(pos: Vector2i) -> bool:
	if GameManager.map.is_empty():
		return false
	if pos.y < 0 or pos.y >= GameManager.map.size():
		return true
	if pos.x < 0 or pos.x >= GameManager.map[pos.y].size():
		return true
	var tile_type: int = GameManager.map[pos.y][pos.x]
	return tile_type == Constants.TileType.WALL \
		or tile_type == Constants.TileType.CAVE_WALL


# ---------------------------------------------------------------------------
# Signal handlers
# ---------------------------------------------------------------------------

func _on_player_attacked(weapon_type: String) -> void:
	if not GameManager.player:
		return
	var pos := Vector2i(
		int(GameManager.player.position.x) / Constants.BASE_TILE_SIZE,
		int(GameManager.player.position.y) / Constants.BASE_TILE_SIZE
	)
	match weapon_type:
		"bow", "crossbow":
			emit_noise_by_type(pos.x, pos.y, "attack_ranged")
		"staff", "wand":
			emit_noise_by_type(pos.x, pos.y, "attack_magic")
		_:
			emit_noise_by_type(pos.x, pos.y, "attack_melee")
