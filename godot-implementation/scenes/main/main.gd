extends Node

# =============================================================================
#  Scene-tree references
# =============================================================================
@onready var system_coordinator: SystemCoordinator = $SystemCoordinator
@onready var world: Node2D = $World
@onready var dungeon_renderer: Node2D = $World/DungeonRenderer
@onready var terrain_layer: TileMapLayer = $World/DungeonRenderer/TerrainLayer
@onready var fog_layer: TileMapLayer = $World/DungeonRenderer/FogLayer
@onready var village_renderer: Node2D = $World/VillageRenderer
@onready var entities: Node2D = $World/Entities
@onready var enemies: Node2D = $World/Entities/Enemies
@onready var npcs: Node2D = $World/Entities/NPCs
@onready var ground_loot: Node2D = $World/GroundLoot
@onready var effects: Node2D = $World/Effects
@onready var camera: Camera2D = $GameCamera
@onready var world_effects_layer: CanvasLayer = $WorldEffectsLayer
@onready var ui_layer: CanvasLayer = $UILayer
@onready var hud: Control = $UILayer/HUD
@onready var menus: Control = $UILayer/Menus
@onready var overlays: Control = $UILayer/Overlays
@onready var panels: Control = $UILayer/Panels
@onready var audio_players: Node = $AudioPlayers

# =============================================================================
#  System script preloads
# =============================================================================
const VisionSystemScript = preload("res://scripts/systems/vision_system.gd")
const MovementSystemScript = preload("res://scripts/systems/movement_system.gd")
const StaminaSystemScript = preload("res://scripts/systems/stamina_system.gd")
const NoiseSystemScript = preload("res://scripts/systems/noise_system.gd")
const HazardSystemScript = preload("res://scripts/systems/hazard_system.gd")
const CombatMasterScript = preload("res://scripts/systems/combat/combat_master.gd")
const StatusEffectManagerScript = preload("res://scripts/systems/combat/status_effect_manager.gd")
const SpellSystemScript = preload("res://scripts/systems/spell_system.gd")
const ProjectileSystemScript = preload("res://scripts/systems/combat/projectile_system.gd")
const KillStreakSystemScript = preload("res://scripts/systems/kill_streak_system.gd")
const InventorySystemScript = preload("res://scripts/systems/inventory_system.gd")
const QuestSystemScript = preload("res://scripts/systems/quest_system.gd")
const BoonSystemScript = preload("res://scripts/systems/boon_system.gd")
const ShiftSystemScript = preload("res://scripts/systems/shift_system.gd")
const LootSystemScript = preload("res://scripts/systems/loot_system.gd")

# =============================================================================
#  Lifecycle
# =============================================================================
func _ready() -> void:
	_register_systems()
	system_coordinator.init_all()
	_connect_signals()
	GameManager.change_state(Constants.GameState.MENU)

func _process(delta: float) -> void:
	match GameManager.current_state:
		Constants.GameState.MENU:
			pass
		Constants.GameState.VILLAGE:
			system_coordinator.update_all(delta)
		Constants.GameState.PLAYING:
			system_coordinator.update_all(delta)
			_update_camera(delta)
			if dungeon_renderer and dungeon_renderer.has_method("update_fog_of_war") and GameManager.player:
				dungeon_renderer.update_fog_of_war(GameManager.player.global_position)
		Constants.GameState.PAUSED:
			pass

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("pause"):
		match GameManager.current_state:
			Constants.GameState.PLAYING:
				GameManager.change_state(Constants.GameState.PAUSED)
				get_tree().paused = true
			Constants.GameState.PAUSED:
				get_tree().paused = false
				GameManager.change_state(Constants.GameState.PLAYING)

# =============================================================================
#  System registration
# =============================================================================
func _register_systems() -> void:
	_register_system("VisionSystem", VisionSystemScript, 10)
	_register_system("MovementSystem", MovementSystemScript, 20)
	_register_system("StaminaSystem", StaminaSystemScript, 30)
	_register_system("NoiseSystem", NoiseSystemScript, 40)
	_register_system("HazardSystem", HazardSystemScript, 50)
	_register_system("CombatMaster", CombatMasterScript, 60)
	_register_system("StatusEffectManager", StatusEffectManagerScript, 70)
	_register_system("SpellSystem", SpellSystemScript, 80)
	_register_system("ProjectileSystem", ProjectileSystemScript, 90)
	_register_system("KillStreakSystem", KillStreakSystemScript, 100)
	_register_system("InventorySystem", InventorySystemScript, 110)
	_register_system("QuestSystem", QuestSystemScript, 120)
	_register_system("BoonSystem", BoonSystemScript, 130)
	_register_system("ShiftSystem", ShiftSystemScript, 140)
	_register_system("LootSystem", LootSystemScript, 150)

func _register_system(system_name: String, script: GDScript, priority: int) -> void:
	var node := Node.new()
	node.name = system_name
	node.set_script(script)
	add_child(node)
	system_coordinator.register(system_name, node, priority)

# =============================================================================
#  Signal wiring
# =============================================================================
func _connect_signals() -> void:
	EventBus.floor_advanced.connect(_on_floor_advanced)
	if EventBus.has_signal("player_death"):
		EventBus.player_death.connect(_on_player_death)
	if EventBus.has_signal("dungeon_complete"):
		EventBus.dungeon_complete.connect(_on_dungeon_complete)
	if EventBus.has_signal("village_entered"):
		EventBus.village_entered.connect(_on_village_entered)

func _on_floor_advanced(new_floor: int, _previous_floor: int) -> void:
	_clear_world()
	_setup_dungeon_floor(new_floor)

func _on_player_death() -> void:
	end_dungeon_run(false)

func _on_dungeon_complete() -> void:
	end_dungeon_run(true)

func _on_village_entered() -> void:
	start_village()

# =============================================================================
#  Camera
# =============================================================================
func _update_camera(delta: float) -> void:
	if GameManager.player and camera:
		camera.position = camera.position.lerp(
			GameManager.player.position, 5.0 * delta
		)

# =============================================================================
#  World setup / teardown
# =============================================================================
func _setup_dungeon_floor(floor_num: int) -> void:
	dungeon_renderer.visible = true
	village_renderer.visible = false

	var generator = system_coordinator.get_system("ShiftSystem")
	if generator and generator.has_method("generate_floor"):
		var dungeon_data: Dictionary = generator.generate_floor(floor_num)
		if dungeon_renderer.has_method("render_dungeon"):
			dungeon_renderer.render_dungeon(dungeon_data)
		_spawn_player()
		if GameManager.run_state:
			GameManager.run_state.current_floor = floor_num

func _setup_village() -> void:
	dungeon_renderer.visible = false
	village_renderer.visible = true

	if village_renderer.has_method("render_village"):
		village_renderer.render_village()
	_spawn_player()

func _spawn_player() -> void:
	if GameManager.player and is_instance_valid(GameManager.player):
		return
	var player_scene := preload("res://scenes/entities/player/player.tscn")
	var player := player_scene.instantiate()
	entities.add_child(player)
	GameManager.player = player
	camera.position = player.position

func _clear_world() -> void:
	for child in enemies.get_children():
		child.queue_free()
	for child in npcs.get_children():
		child.queue_free()
	for child in ground_loot.get_children():
		child.queue_free()
	for child in effects.get_children():
		child.queue_free()
	GameManager.enemies.clear()
	GameManager.npcs.clear()
	GameManager.ground_loot.clear()

# =============================================================================
#  High-level game flow
# =============================================================================
func start_village() -> void:
	system_coordinator.cleanup_all()
	_clear_world()
	GameManager.village_state = GameManager.VillageState.new()
	_register_systems()
	system_coordinator.init_all()
	_setup_village()
	GameManager.change_state(Constants.GameState.VILLAGE)

func start_dungeon_run() -> void:
	GameManager.start_new_run()
	_clear_world()
	_setup_dungeon_floor(1)
	GameManager.change_state(Constants.GameState.PLAYING)

func end_dungeon_run(survived: bool) -> void:
	GameManager.end_run(survived)
	_clear_world()
	if survived:
		start_village()
	else:
		GameManager.change_state(Constants.GameState.GAME_OVER)
