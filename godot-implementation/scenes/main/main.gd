extends Node

@onready var system_coordinator: SystemCoordinator = $SystemCoordinator
@onready var world: Node2D = $World
@onready var ui_layer: CanvasLayer = $UILayer
@onready var camera: Camera2D = $Camera2D

func _ready() -> void:
	_register_systems()
	system_coordinator.init_all()
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
		Constants.GameState.PAUSED:
			pass

func _register_systems() -> void:
	pass

func _update_camera(delta: float) -> void:
	if GameManager.player:
		camera.position = camera.position.lerp(
			GameManager.player.position, 5.0 * delta
		)

func start_village() -> void:
	system_coordinator.cleanup_all()
	GameManager.village_state = GameManager.VillageState.new()
	_register_systems()
	system_coordinator.init_all()
	GameManager.change_state(Constants.GameState.VILLAGE)

func start_dungeon_run() -> void:
	GameManager.start_new_run()
	GameManager.change_state(Constants.GameState.PLAYING)

func end_dungeon_run(survived: bool) -> void:
	GameManager.end_run(survived)
	if survived:
		start_village()
	else:
		GameManager.change_state(Constants.GameState.GAME_OVER)
