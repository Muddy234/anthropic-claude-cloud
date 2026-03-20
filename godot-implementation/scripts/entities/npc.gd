## scripts/entities/npc.gd
## NPC character entity. Dialogue, shops, quests, escort behavior, barks.
class_name NPC
extends Entity

# --- Signals ---
signal interaction_started
signal interaction_ended
signal quest_offered(quest_id: StringName)
signal dialogue_started(npc_id: StringName)

# --- NPC Types ---
enum NPCType { SPIRIT, PRISONER, GUIDE, MERCHANT, WOUNDED, GHOST, QUEST_GIVER, VILLAGER }

# --- Config ---
@export var npc_data: Resource  # NpcData from WP02
@export var npc_type: NPCType = NPCType.VILLAGER
@export var interact_range: float = 1.5
@export var role: Constants.NpcRole = Constants.NpcRole.SHOPKEEPER

# --- State ---
enum NPCState { IDLE, TALKING, QUEST_ACTIVE, QUEST_COMPLETE, BOUND, FOLLOWING, GUIDING, FREED, RESCUED }
var npc_state: NPCState = NPCState.IDLE
var is_interactable: bool = true
var interaction_radius: float = 2.0

# --- Dialogue ---
var dialogue_tree: Array = []  # Array of dialogue node dicts
var current_dialogue_index: int = -1

# --- Quest ---
var offered_quest_id: StringName = &""
var quest_complete: bool = false

# --- Shop ---
var shop_inventory: Array[Resource] = []

# --- Movement (for escort/guide NPCs) ---
var move_speed: float = 2.0
var follow_distance: float = 2.0

# --- Bark ---
var barks: Array = []
var bark_cooldown: float = 0.0
const BARK_COOLDOWN_DURATION: float = 30.0

# --- Interaction Area ---
@onready var interact_area: Area2D = $InteractArea
@onready var bark_label: Label = $BarkLabel

# --- Internal ---
var _player_in_range: bool = false

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
	super._ready()
	add_to_group("npcs")
	_load_from_npc_data()
	if interact_area:
		interact_area.body_entered.connect(_on_interact_area_body_entered)
		interact_area.body_exited.connect(_on_interact_area_body_exited)
	if bark_label:
		bark_label.visible = false

func _load_from_npc_data() -> void:
	if npc_data == null:
		return
	entity_name = StringName(npc_data.display_name) if npc_data.display_name else entity_name
	entity_id = StringName(npc_data.id) if npc_data.id else entity_id
	role = npc_data.role if npc_data.role else Constants.NpcRole.SHOPKEEPER
	# Map NpcRole to NPCType
	_map_role_to_type()
	# Dialogue
	if npc_data.dialogue_tree and npc_data.dialogue_tree != "":
		dialogue_tree = [{"text": npc_data.initial_dialogue, "tree": npc_data.dialogue_tree}]
	elif npc_data.initial_dialogue and npc_data.initial_dialogue != "":
		dialogue_tree = [{"text": npc_data.initial_dialogue}]
	# Barks
	barks = Array(npc_data.barks) if npc_data.barks else []
	# Shop inventory
	if npc_data.shop_inventory:
		for item_id in npc_data.shop_inventory:
			shop_inventory.append(item_id)

func _map_role_to_type() -> void:
	match role:
		Constants.NpcRole.SHOPKEEPER, Constants.NpcRole.BLACKSMITH, Constants.NpcRole.ALCHEMIST:
			npc_type = NPCType.MERCHANT
		Constants.NpcRole.QUEST_GIVER, Constants.NpcRole.BOUNTY_BOARD:
			npc_type = NPCType.QUEST_GIVER
		Constants.NpcRole.ELDER, Constants.NpcRole.PRIESTESS:
			npc_type = NPCType.SPIRIT
		_:
			npc_type = NPCType.VILLAGER

func _process(delta: float) -> void:
	if bark_cooldown > 0.0:
		bark_cooldown -= delta
	match npc_state:
		NPCState.FOLLOWING, NPCState.GUIDING:
			_follow_player(delta)

# -----------------------------------------------------------------
# Interaction
# -----------------------------------------------------------------

func interact(player: Node) -> void:
	if not is_interactable:
		return
	match npc_type:
		NPCType.MERCHANT:
			EventBus.emit_signal("open_shop", self, shop_inventory)
			_start_dialogue()
		NPCType.QUEST_GIVER:
			if offered_quest_id != &"":
				quest_offered.emit(offered_quest_id)
			_start_dialogue()
		_:
			_start_dialogue()
	interaction_started.emit()

func get_dialogue() -> Array:
	return dialogue_tree

func open_shop() -> void:
	EventBus.emit_signal("open_shop", self, shop_inventory)

func accept_quest() -> void:
	if offered_quest_id != &"":
		npc_state = NPCState.QUEST_ACTIVE
		quest_offered.emit(offered_quest_id)

func has_quest() -> bool:
	return offered_quest_id != &""

func _start_dialogue() -> void:
	if dialogue_tree.is_empty():
		return
	current_dialogue_index = 0
	npc_state = NPCState.TALKING
	dialogue_started.emit(entity_id)
	EventBus.emit_signal("dialogue_started", self, dialogue_tree)

func end_dialogue() -> void:
	current_dialogue_index = -1
	if npc_state == NPCState.TALKING:
		npc_state = NPCState.IDLE
	interaction_ended.emit()

# -----------------------------------------------------------------
# Following / Escort
# -----------------------------------------------------------------

func start_following() -> void:
	npc_state = NPCState.FOLLOWING

func start_guiding() -> void:
	npc_state = NPCState.GUIDING

func stop_following() -> void:
	if npc_state == NPCState.FOLLOWING or npc_state == NPCState.GUIDING:
		npc_state = NPCState.IDLE

func _follow_player(delta: float) -> void:
	var player: Node = get_tree().get_first_node_in_group("player")
	if player == null:
		return
	var dist := _grid_distance_to(player)
	if dist > follow_distance:
		var dir := Vector2(player.grid_position - grid_position).normalized()
		var step := Vector2i(signi(int(dir.x)), signi(int(dir.y)))
		grid_position += step
		snap_to_grid()
		# Update facing
		if abs(step.x) > abs(step.y):
			set_facing(Facing.RIGHT if step.x > 0 else Facing.LEFT)
		elif step.y != 0:
			set_facing(Facing.DOWN if step.y > 0 else Facing.UP)

func _grid_distance_to(other: Node) -> float:
	return Vector2(grid_position).distance_to(Vector2(other.grid_position))

# -----------------------------------------------------------------
# Bark System (proximity speech bubbles)
# -----------------------------------------------------------------

func try_bark(player_pos: Vector2i) -> String:
	if bark_cooldown > 0.0 or barks.is_empty():
		return ""
	var dist := Vector2(grid_position).distance_to(Vector2(player_pos))
	if dist > 2.0:
		return ""
	bark_cooldown = BARK_COOLDOWN_DURATION
	var bark_text: String = barks[randi() % barks.size()]
	if bark_label:
		bark_label.text = bark_text
		bark_label.visible = true
		# Auto-hide after 4 seconds
		get_tree().create_timer(4.0).timeout.connect(func(): bark_label.visible = false)
	EventBus.emit_signal("bark_triggered", self, bark_text)
	return bark_text

# -----------------------------------------------------------------
# Area Signals
# -----------------------------------------------------------------

func _on_interact_area_body_entered(body: Node2D) -> void:
	if body is Player:
		_player_in_range = true
		is_interactable = true
		EventBus.emit_signal("interact_prompt_show", self)
		# Try bark on proximity
		try_bark(body.grid_position)

func _on_interact_area_body_exited(body: Node2D) -> void:
	if body is Player:
		_player_in_range = false
		EventBus.emit_signal("interact_prompt_hide", self)
