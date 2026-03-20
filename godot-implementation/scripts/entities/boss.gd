## scripts/entities/boss.gd
## Base boss class. Extends Enemy with phase system, telegraph overlay, summons, dialogue.
class_name Boss
extends Enemy

# --- Signals ---
signal phase_changed(old_phase: int, new_phase: int)
signal telegraph_created(position: Vector2, radius: float, duration: float, color: Color)
signal boss_defeated

# --- Phase System ---
@export var phase_thresholds: Array[float] = [1.0, 0.75, 0.5, 0.25]
@export var phase_names: Array[String] = ["Phase 1", "Phase 2", "Phase 3", "Phase 4"]
var current_phase: int = 0
var max_phases: int = 4
var phase_transitioning: bool = false
var phase_transition_timer: float = 0.0
const PHASE_TRANSITION_DURATION: float = 2.0

# --- Boss Flags ---
var is_boss: bool = true
var is_final_boss: bool = false
var invulnerable: bool = false
var enraged: bool = false
var boss_intro_shown: bool = false

# --- Active Summons ---
var active_summons: Array[Node] = []
var max_summons: int = 6
var summon_list: Array[StringName] = []

# --- Telegraph ---
var telegraph_duration: float = 0.5

# --- Attack Components ---
## Array of attack component dictionaries (from ATTACK_COMPONENTS library)
var attack_components: Array[Dictionary] = []
var attack_cooldowns: Dictionary = {}  # component_name -> float

# --- Dialogue ---
var dialogue_queue: Array[String] = []
var current_dialogue: String = ""
var dialogue_timer: float = 0.0

# --- Node References ---
@onready var telegraph_display: Node2D = $TelegraphDisplay
@onready var boss_aura: Node2D = $BossAura

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
	tier = &"BOSS"
	super._ready()
	add_to_group("bosses")
	max_phases = phase_thresholds.size()

func _process(delta: float) -> void:
	super._process(delta)
	if _is_dead:
		return
	if phase_transitioning:
		phase_transition_timer += delta
		if phase_transition_timer >= PHASE_TRANSITION_DURATION:
			phase_transitioning = false
			invulnerable = false
		return
	_update_cooldowns_boss(delta)
	_update_dialogue(delta)
	_clean_summons()

func _update_cooldowns_boss(delta: float) -> void:
	for key in attack_cooldowns:
		attack_cooldowns[key] = maxf(0.0, attack_cooldowns[key] - delta)

func _update_dialogue(delta: float) -> void:
	if current_dialogue != "":
		dialogue_timer -= delta
		if dialogue_timer <= 0.0:
			current_dialogue = ""
			_show_next_dialogue()

func _clean_summons() -> void:
	active_summons = active_summons.filter(func(s): return is_instance_valid(s) and not s._is_dead)

# -----------------------------------------------------------------
# Damage Override
# -----------------------------------------------------------------

func take_damage(amount: int, damage_element: StringName = &"physical", source: Node = null) -> int:
	if invulnerable:
		return 0
	var actual := super.take_damage(amount, damage_element, source)
	_check_phase_transition()
	return actual

# -----------------------------------------------------------------
# Phase System
# -----------------------------------------------------------------

func _check_phase_transition() -> void:
	var hp_pct: float = float(hp) / float(max_hp)
	for i in range(phase_thresholds.size() - 1, -1, -1):
		if hp_pct <= phase_thresholds[i] and current_phase < i:
			_transition_to_phase(i)
			break

func _transition_to_phase(new_phase: int) -> void:
	var old_phase := current_phase
	current_phase = new_phase
	phase_transitioning = true
	phase_transition_timer = 0.0
	invulnerable = true
	_on_phase_enter(new_phase)
	phase_changed.emit(old_phase, new_phase)
	EventBus.emit_signal("boss_dialogue", self, "Phase %d" % (new_phase + 1))

func enter_phase(phase_num: int) -> void:
	if phase_num >= 0 and phase_num < max_phases:
		_transition_to_phase(phase_num)

## Override in subclasses for phase-specific behavior.
func _on_phase_enter(phase: int) -> void:
	pass

func enrage_check() -> void:
	var hp_pct: float = float(hp) / float(max_hp)
	if hp_pct <= 0.25 and not enraged:
		enraged = true
		is_enraged = true
		base_damage = int(base_damage * 1.5)

# -----------------------------------------------------------------
# Telegraph
# -----------------------------------------------------------------

func telegraph_attack(ability: Resource) -> void:
	var tele_duration: float = ability.telegraph_time if ability else telegraph_duration
	var target_pos := Vector2(current_target.grid_position if current_target else grid_position) * Constants.BASE_TILE_SIZE
	show_telegraph(target_pos, 2.0, tele_duration)

func show_telegraph(position: Vector2, radius: float, duration: float, color: Color = Color.RED) -> void:
	telegraph_created.emit(position, radius, duration, color)
	EventBus.emit_signal("telegraph_created", position, radius, duration, color)

# -----------------------------------------------------------------
# Dialogue
# -----------------------------------------------------------------

func queue_dialogue(lines: Array[String]) -> void:
	dialogue_queue.append_array(lines)
	if current_dialogue == "":
		_show_next_dialogue()

func _show_next_dialogue() -> void:
	if dialogue_queue.is_empty():
		return
	current_dialogue = dialogue_queue.pop_front()
	dialogue_timer = 3.0
	EventBus.emit_signal("boss_dialogue", self, current_dialogue)

# -----------------------------------------------------------------
# Summon
# -----------------------------------------------------------------

func summon_minions() -> void:
	for summon_type in summon_list:
		if active_summons.size() >= max_summons:
			break
		var angle := randf() * TAU
		var dist := 5.0 + randf() * 3.0
		var pos := Vector2i(
			grid_position.x + roundi(cos(angle) * dist),
			grid_position.y + roundi(sin(angle) * dist),
		)
		EventBus.emit_signal("spawn_minion", summon_type, pos, self)

func spawn_summon(summon_scene: PackedScene, pos: Vector2i) -> Node:
	if active_summons.size() >= max_summons:
		return null
	var summon: Node = summon_scene.instantiate()
	summon.global_position = Vector2(pos) * Constants.BASE_TILE_SIZE
	get_tree().current_scene.add_child(summon)
	active_summons.append(summon)
	return summon

func register_summon(summon: Node) -> void:
	if active_summons.size() < max_summons:
		active_summons.append(summon)

# -----------------------------------------------------------------
# Death
# -----------------------------------------------------------------

func die() -> void:
	# Clear summons
	for summon in active_summons:
		if is_instance_valid(summon):
			summon.queue_free()
	active_summons.clear()
	boss_defeated.emit()
	EventBus.emit_signal("boss_defeated", self)
	super.die()
