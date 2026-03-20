## scripts/entities/core_boss.gd
## The Primordial -- 3-phase final boss.
## Phase 1 (>50% HP): basic attacks + element cycling
## Phase 2 (50-25%): summons + arena hazards
## Phase 3 (<25%): enrage + all abilities + arena shrink
class_name CoreBoss
extends Boss

# --- Element Cycling ---
var element_cycle: Array[StringName] = [&"fire", &"ice", &"arcane", &"death"]
var current_element_index: int = 0
var element_cycle_timer: float = 0.0
const ELEMENT_CYCLE_INTERVAL: float = 8.0

# --- Corruption Aura ---
var corruption_aura_active: bool = false
var corruption_aura_radius: float = 3.0
var corruption_aura_damage: int = 5
var corruption_aura_timer: float = 0.0
const CORRUPTION_AURA_TICK: float = 2.0

# --- Arena Shrink (Phase 3) ---
var arena_shrink_active: bool = false
var arena_radius: float = 20.0
const ARENA_SHRINK_RATE: float = 0.5  # tiles per second
const ARENA_MIN_RADIUS: float = 8.0

# --- Ability Timers ---
var tendril_timer: float = 6.0
var chaos_orb_timer: float = 10.0
var reality_tear_timer: float = 15.0
var void_collapse_timer: float = 25.0
var summon_timer: float = 20.0

# --- Summon Config ---
var core_summon_types: Array[StringName] = [&"void_tendril", &"chaos_wisp", &"shadow_fragment"]

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
	entity_name = &"The Primordial"
	is_final_boss = true
	max_hp = 8000
	hp = max_hp
	base_damage = 35
	base_defense = 15
	sight_range = 20.0
	hearing_range = 20.0
	combat_attack_range = 3

	phase_thresholds = [1.0, 0.75, 0.50, 0.25]
	phase_names = ["Awakening", "Unraveling", "Primordial Wrath"]
	max_summons = 6
	summon_list = core_summon_types

	super._ready()
	queue_dialogue(["You have reached the foundation of the world..."])

func _process(delta: float) -> void:
	super._process(delta)
	if _is_dead or phase_transitioning:
		return

	_update_element_cycle(delta)
	_update_corruption_aura(delta)
	_update_phase_abilities(delta)

	if arena_shrink_active:
		_update_arena_shrink(delta)

# -----------------------------------------------------------------
# Element Cycling (Phase 1+)
# -----------------------------------------------------------------

func _update_element_cycle(delta: float) -> void:
	element_cycle_timer += delta
	if element_cycle_timer >= ELEMENT_CYCLE_INTERVAL:
		element_cycle_timer = 0.0
		current_element_index = (current_element_index + 1) % element_cycle.size()
		element = element_cycle[current_element_index]

# -----------------------------------------------------------------
# Corruption Aura
# -----------------------------------------------------------------

func _update_corruption_aura(delta: float) -> void:
	if not corruption_aura_active:
		return
	corruption_aura_timer += delta
	if corruption_aura_timer >= CORRUPTION_AURA_TICK:
		corruption_aura_timer = 0.0
		# Damage player if within aura radius
		var player: Node = get_tree().get_first_node_in_group("player")
		if player and not player._is_dead:
			var dist := _grid_distance_to(player)
			if dist <= corruption_aura_radius:
				var aura_dmg := corruption_aura_damage * (1 + current_phase)
				EventBus.emit_signal("ability_damage", self, player, aura_dmg, null)

# -----------------------------------------------------------------
# Phase-Specific Abilities
# -----------------------------------------------------------------

func _update_phase_abilities(delta: float) -> void:
	var player: Node = get_tree().get_first_node_in_group("player")
	if player == null or player._is_dead:
		return

	# Phase 1+: Tendril attack (targeted projectiles)
	if current_phase >= 1:
		tendril_timer -= delta
		if tendril_timer <= 0.0:
			_cast_tendrils(player)
			tendril_timer = 6.0 / (1.0 + current_phase * 0.2)

	# Phase 1+: Chaos orbs (radial spread)
	chaos_orb_timer -= delta
	if chaos_orb_timer <= 0.0:
		_cast_chaos_orbs()
		chaos_orb_timer = 10.0 / (1.0 + current_phase * 0.15)

	# Phase 2+: Reality tears (damage zones)
	if current_phase >= 2:
		reality_tear_timer -= delta
		if reality_tear_timer <= 0.0:
			_cast_reality_tear(player)
			reality_tear_timer = 15.0 / (1.0 + current_phase * 0.1)

	# Phase 2+: Summons
	if current_phase >= 2:
		summon_timer -= delta
		if summon_timer <= 0.0:
			_clean_summons()
			if active_summons.size() < max_summons:
				summon_minions()
			summon_timer = 20.0 / (1.0 + current_phase * 0.2)

	# Phase 3: Void collapse (arena shrink)
	if current_phase >= 3:
		void_collapse_timer -= delta
		if void_collapse_timer <= 0.0:
			_cast_void_collapse()
			void_collapse_timer = 30.0

func _cast_tendrils(target: Node) -> void:
	var telegraph_pos := Vector2(target.grid_position) * Constants.BASE_TILE_SIZE
	show_telegraph(telegraph_pos, 2.0, 0.8, Color(0.5, 0.0, 0.8))
	await get_tree().create_timer(0.8).timeout
	if _is_dead or target._is_dead:
		return
	var dmg := int(base_damage * 0.8)
	EventBus.emit_signal("ability_damage", self, target, dmg, null)

func _cast_chaos_orbs() -> void:
	var orb_count := 4 + current_phase * 2
	for i in range(orb_count):
		var angle := (TAU / orb_count) * i
		var pos := Vector2(grid_position) * Constants.BASE_TILE_SIZE + Vector2(cos(angle), sin(angle)) * 5.0 * Constants.BASE_TILE_SIZE
		show_telegraph(pos, 1.5, 0.6, Color(0.8, 0.0, 0.3))
	EventBus.emit_signal("boss_hazard", &"chaos_orbs", grid_position, orb_count)

func _cast_reality_tear(target: Node) -> void:
	# Create damage zone between boss and player
	var mid_pos := (grid_position + target.grid_position) / 2
	show_telegraph(Vector2(mid_pos) * Constants.BASE_TILE_SIZE, 3.0, 1.2, Color(0.3, 0.0, 0.5))
	EventBus.emit_signal("boss_hazard", &"reality_tear", mid_pos, 3)

func _cast_void_collapse() -> void:
	arena_shrink_active = true
	queue_dialogue(["The world collapses around you!"])
	EventBus.emit_signal("boss_hazard", &"void_collapse", grid_position, int(arena_radius))

# -----------------------------------------------------------------
# Arena Shrink
# -----------------------------------------------------------------

func _update_arena_shrink(delta: float) -> void:
	if arena_radius > ARENA_MIN_RADIUS:
		arena_radius -= ARENA_SHRINK_RATE * delta
		arena_radius = maxf(arena_radius, ARENA_MIN_RADIUS)
		# Damage players outside arena
		var player: Node = get_tree().get_first_node_in_group("player")
		if player and not player._is_dead:
			var dist := _grid_distance_to(player)
			if dist > arena_radius:
				EventBus.emit_signal("ability_damage", self, player, 10, null)

# -----------------------------------------------------------------
# Phase Transitions
# -----------------------------------------------------------------

func _on_phase_enter(phase: int) -> void:
	match phase:
		1:
			queue_dialogue(["You dare disturb the foundation?"])
			base_damage = int(base_damage * 1.25)
			corruption_aura_active = true
			corruption_aura_radius = 3.0
		2:
			queue_dialogue(["FEEL THE WEIGHT OF CREATION!"])
			base_damage = int(base_damage * 1.5)
			corruption_aura_radius = 4.0
			# Spawn initial wave
			summon_minions()
		3:
			queue_dialogue(["THIS WORLD ENDS WITH ME!"])
			enraged = true
			is_enraged = true
			base_damage = int(base_damage * 2.0)
			corruption_aura_radius = 5.0
			corruption_aura_damage = 10
			arena_shrink_active = true
			# Spawn double wave
			summon_minions()
			summon_minions()
