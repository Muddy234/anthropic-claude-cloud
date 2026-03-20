class_name SystemCoordinator
extends Node

var _systems: Array[Dictionary] = []
var _initialized: bool = false

func register(system_name: String, system_node: Node, priority: int) -> void:
	_systems.append({
		"name": system_name,
		"node": system_node,
		"priority": priority
	})
	_systems.sort_custom(func(a, b): return a["priority"] < b["priority"])

func init_all() -> void:
	for entry in _systems:
		if entry["node"].has_method("system_init"):
			entry["node"].system_init(GameManager)
	_initialized = true

func update_all(delta: float) -> void:
	if not _initialized:
		return
	for entry in _systems:
		if entry["node"].has_method("system_update"):
			entry["node"].system_update(delta)

func cleanup_all() -> void:
	for entry in _systems:
		if entry["node"].has_method("system_cleanup"):
			entry["node"].system_cleanup()
	_systems.clear()
	_initialized = false

func get_system(system_name: String) -> Node:
	for entry in _systems:
		if entry["name"] == system_name:
			return entry["node"]
	return null

func is_initialized() -> bool:
	return _initialized

func get_system_count() -> int:
	return _systems.size()
