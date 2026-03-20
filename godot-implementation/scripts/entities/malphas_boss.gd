## scripts/entities/malphas_boss.gd
## Malphas, Heart of the World -- stationary boss with vent mechanic.
## Does not move. Attacks via area hazards and vent activation.
## 4 phases: Dormant Awakening, Raging Pulse, Desperate Thrashing, Final Heartbeat
class_name MalphasBoss
extends Boss

# --- Vent System ---
var vents: Array[Dictionary] = []
const VENT_COUNT: int = 4
const VENT_HEALTH: int = 500
const VENT_HEAL_PER_SEC: float = 50.0
const VENT_RESPAWN_TIME: float = 30.0

# --- Vent Activation Patterns per Phase ---
## Phase 0: All vents active passively
## Phase 1: Vents pulse (activate/deactivate periodically)
## Phase 2: Vents become aggressive (damage nearby players)
## Phase 3: Vents explode on destruction, faster respawn
var vent_pulse_timer: float = 0.0
const VENT_PULSE_INTERVAL: float = 5.0

# --- Safe Zone Management ---
var safe_zones: Array[Vector2i] = []
var safe_zone_timer: float = 0.0
const SAFE_ZONE_INTERVAL: float = 12.0
const SAFE_ZONE_DURATION: float = 4.0
var safe_zone_active: bool = false

# --- Minion Config ---
const MAX_MINIONS: int = 6
const MINION_SPAWN_INTERVAL: float = 15.0
var minion_spawn_timer: float = 5.0
var minion_types: Array[StringName] = [&"magma_elemental", &"obsidian_golem", &"ember_sprite"]

# --- Hazard Timers ---
var ground_slam_timer: float = 20.0
var fire_rain_timer: float = 15.0
var lava_surge_timer: float = 10.0

# --- Stationary Override ---
## Malphas does not move; occupies a 5x5 tile area
var boss_size: Vector2i = Vector2i(5, 5)

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
	entity_name = &"Malphas, Heart of the World"
	is_final_boss = true
	max_hp = 5000
	hp = max_hp
	base_damage = 40
	base_defense = 20
	sight_range = 25.0
	hearing_range = 25.0
	combat_attack_range = 10  # Attacks at range via hazards

	phase_thresholds = [1.0, 0.75, 0.50, 0.25]
	phase_names = ["Dormant Awakening", "Raging Pulse", "Desperate Thrashing", "Final Heartbeat"]
	max_summons = MAX_MINIONS
	summon_list = minion_types

	super._ready()
	_spawn_vents()
	queue_dialogue(["The heart... it beats for this world..."])

func _spawn_vents() -> void:
	var offsets := [Vector2i(-6, 0), Vector2i(6, 0), Vector2i(0, -6), Vector2i(0, 6)]
	for i in range(VENT_COUNT):
		vents.append({
			"id": "vent_%d" % i,
			"position": grid_position + offsets[i],
			"hp": VENT_HEALTH,
			"max_hp": VENT_HEALTH,
			"active": true,
			"respawn_timer": 0.0,
			"pulsing": false,
		})

func _process(delta: float) -> void:
	super._process(delta)
	if _is_dead:
		return
	_update_vents(delta)
	_update_minion_spawning(delta)
	_update_hazards(delta)
	_update_safe_zones(delta)

# -----------------------------------------------------------------
# Stationary Override -- Malphas does not move
# -----------------------------------------------------------------

# Override to prevent any movement from AI or base class
func snap_to_grid() -> void:
	global_position = Vector2(grid_position) * Constants.BASE_TILE_SIZE

# -----------------------------------------------------------------
# Vent System
# -----------------------------------------------------------------

func _update_vents(delta: float) -> void:
	var active_count := 0
	for vent in vents:
		if vent["active"] and vent["hp"] > 0:
			active_count += 1
			# Vents heal the boss
			hp = mini(hp + int(VENT_HEAL_PER_SEC * delta), max_hp)
		elif not vent["active"]:
			# Respawn timer
			vent["respawn_timer"] -= delta
			var respawn_time := VENT_RESPAWN_TIME
			if current_phase >= 3:
				respawn_time *= 0.5  # Faster respawn in final phase
			if vent["respawn_timer"] <= 0.0:
				vent["hp"] = VENT_HEALTH
				vent["active"] = true
				vent["respawn_timer"] = 0.0
				EventBus.emit_signal("boss_hazard", &"vent_respawn", vent["position"], 0)

	# Boss invulnerable while any vent alive
	invulnerable = active_count > 0

	# Phase 1+: Vent pulsing
	if current_phase >= 1:
		vent_pulse_timer += delta
		if vent_pulse_timer >= VENT_PULSE_INTERVAL:
			vent_pulse_timer = 0.0
			_pulse_vents()

	# Phase 2+: Vent area damage
	if current_phase >= 2:
		_vent_area_damage(delta)

func _pulse_vents() -> void:
	# Toggle vent healing on/off to create windows of vulnerability
	for vent in vents:
		if vent["active"]:
			vent["pulsing"] = not vent["pulsing"]

func _vent_area_damage(delta: float) -> void:
	var player: Node = get_tree().get_first_node_in_group("player")
	if player == null or player._is_dead:
		return
	for vent in vents:
		if not vent["active"]:
			continue
		var dist := Vector2(vent["position"]).distance_to(Vector2(player.grid_position))
		if dist <= 2.0:
			var vent_dmg := int(15 * (1.0 + current_phase * 0.25))
			EventBus.emit_signal("ability_damage", self, player, vent_dmg, null)

func damage_vent(vent_id: String, amount: int) -> void:
	for vent in vents:
		if vent["id"] == vent_id and vent["active"]:
			vent["hp"] -= amount
			if vent["hp"] <= 0:
				vent["active"] = false
				vent["respawn_timer"] = VENT_RESPAWN_TIME
				# Phase 3: Explosion on vent destruction
				if current_phase >= 3:
					_vent_explosion(vent["position"])
				EventBus.emit_signal("boss_hazard", &"vent_destroyed", vent["position"], 0)

func _vent_explosion(pos: Vector2i) -> void:
	show_telegraph(Vector2(pos) * Constants.BASE_TILE_SIZE, 4.0, 0.5, Color(1.0, 0.5, 0.0))
	EventBus.emit_signal("boss_hazard", &"vent_explosion", pos, 4)

func get_active_vent_count() -> int:
	var count := 0
	for vent in vents:
		if vent["active"] and vent["hp"] > 0:
			count += 1
	return count

func get_vent_positions() -> Array[Vector2i]:
	var positions: Array[Vector2i] = []
	for vent in vents:
		positions.append(vent["position"])
	return positions

# -----------------------------------------------------------------
# Safe Zone Management
# -----------------------------------------------------------------

func _update_safe_zones(delta: float) -> void:
	if current_phase < 2:
		return

	safe_zone_timer += delta
	if safe_zone_active:
		if safe_zone_timer >= SAFE_ZONE_DURATION:
			safe_zone_active = false
			safe_zones.clear()
			safe_zone_timer = 0.0
	else:
		if safe_zone_timer >= SAFE_ZONE_INTERVAL:
			safe_zone_active = true
			safe_zone_timer = 0.0
			_generate_safe_zones()

func _generate_safe_zones() -> void:
	safe_zones.clear()
	# Create 2-3 safe zones around the arena
	var zone_count := 2 + (1 if current_phase >= 3 else 0)
	for i in range(zone_count):
		var angle := (TAU / zone_count) * i + randf() * 0.5
		var dist := 8.0 + randf() * 4.0
		var pos := Vector2i(
			grid_position.x + roundi(cos(angle) * dist),
			grid_position.y + roundi(sin(angle) * dist),
		)
		safe_zones.append(pos)
	EventBus.emit_signal("boss_hazard", &"safe_zones", grid_position, zone_count)

# -----------------------------------------------------------------
# Minion Spawning
# -----------------------------------------------------------------

func _update_minion_spawning(delta: float) -> void:
	minion_spawn_timer -= delta
	_clean_summons()
	if minion_spawn_timer <= 0.0 and active_summons.size() < MAX_MINIONS:
		_spawn_minion()
		minion_spawn_timer = MINION_SPAWN_INTERVAL / (1.0 + current_phase * 0.3)

func _spawn_minion() -> void:
	var angle := randf() * TAU
	var dist := 8.0 + randf() * 4.0
	var pos := Vector2i(
		grid_position.x + roundi(cos(angle) * dist),
		grid_position.y + roundi(sin(angle) * dist),
	)
	# Load minion scene based on random type
	var type_name: StringName = minion_types[randi() % minion_types.size()]
	EventBus.emit_signal("spawn_minion", type_name, pos, self)

# -----------------------------------------------------------------
# Hazards
# -----------------------------------------------------------------

func _update_hazards(delta: float) -> void:
	var player: Node = get_tree().get_first_node_in_group("player")
	if player == null or player._is_dead:
		return

	# Lava surge (all phases) -- wave from boss outward
	lava_surge_timer -= delta
	if lava_surge_timer <= 0.0:
		_cast_lava_surge()
		lava_surge_timer = 10.0 / (1.0 + current_phase * 0.2)

	# Ground slam (Phase 1+) -- area damage around boss
	if current_phase >= 1:
		ground_slam_timer -= delta
		if ground_slam_timer <= 0.0:
			_cast_ground_slam()
			ground_slam_timer = 20.0 / (1.0 + current_phase * 0.15)

	# Fire rain (Phase 2+) -- random positions across arena
	if current_phase >= 2:
		fire_rain_timer -= delta
		if fire_rain_timer <= 0.0:
			_cast_fire_rain(player)
			fire_rain_timer = 5.0

func _cast_lava_surge() -> void:
	show_telegraph(Vector2(grid_position) * Constants.BASE_TILE_SIZE, 6.0, 1.0, Color(1.0, 0.3, 0.0))
	EventBus.emit_signal("boss_hazard", &"lava_surge", grid_position, 6)

func _cast_ground_slam() -> void:
	show_telegraph(Vector2(grid_position) * Constants.BASE_TILE_SIZE, 8.0, 1.5, Color(0.8, 0.4, 0.0))
	EventBus.emit_signal("boss_hazard", &"ground_slam", grid_position, 8)

func _cast_fire_rain(player: Node) -> void:
	# Drop fire at several positions around the player
	var drop_count := 3 + current_phase * 2
	for i in range(drop_count):
		var offset := Vector2i(randi_range(-4, 4), randi_range(-4, 4))
		var pos := player.grid_position + offset
		show_telegraph(Vector2(pos) * Constants.BASE_TILE_SIZE, 2.0, 1.0, Color(1.0, 0.2, 0.0))
	EventBus.emit_signal("boss_hazard", &"fire_rain", player.grid_position, drop_count)

# -----------------------------------------------------------------
# Phase Transitions
# -----------------------------------------------------------------

func _on_phase_enter(phase: int) -> void:
	base_damage = int(40 * (1.0 + phase * 0.25))
	match phase:
		1:
			queue_dialogue(["The earth trembles with fury!"])
		2:
			queue_dialogue(["BURN IN THE HEART'S FLAME!"])
			_spawn_minion()
			_spawn_minion()
		3:
			queue_dialogue(["IF I FALL... THIS WORLD FALLS WITH ME!"])
			enraged = true
			is_enraged = true
			_spawn_minion()
			_spawn_minion()
			_spawn_minion()
