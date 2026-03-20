class_name BaseSystem
extends Node
## Abstract base class for all game systems.
## Provides lifecycle hooks and priority-based execution order.

## Whether this system is currently active and processing.
@export var enabled: bool = true

## Execution priority — lower values run earlier each frame.
@export var priority: int = 50

## Human-readable name used for logging and SystemCoordinator lookups.
@export var system_name: String = ""

## Set to true once system_init has been called.
var _initialized: bool = false


func _ready() -> void:
	if system_name.is_empty():
		system_name = name
	EventBus.game_state_changed.connect(_on_game_state_changed)


# ---------------------------------------------------------------------------
# Lifecycle hooks — called by SystemCoordinator
# ---------------------------------------------------------------------------

## Called once when the coordinator boots all systems.
func system_init(_game_manager: Node) -> void:
	initialize()
	_initialized = true


## Called every frame by the coordinator in priority order.
func system_update(delta: float) -> void:
	if enabled and _initialized:
		process_system(delta)


## Called on floor change / run end to reset transient state.
func system_cleanup() -> void:
	cleanup()


# ---------------------------------------------------------------------------
# Virtual methods — override in subclasses
# ---------------------------------------------------------------------------

## One-time setup. Override instead of _ready for system-specific init.
func initialize() -> void:
	pass


## Per-frame logic. Override instead of _process.
func process_system(_delta: float) -> void:
	pass


## Reset state between floors or runs. Override to clear caches, timers, etc.
func cleanup() -> void:
	pass


## Reacts to game-state transitions (e.g. PLAYING -> PAUSED).
func on_state_changed(_old_state: int, _new_state: int) -> void:
	pass


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

func _on_game_state_changed(old_state: int, new_state: int) -> void:
	on_state_changed(old_state, new_state)
