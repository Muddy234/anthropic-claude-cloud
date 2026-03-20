class_name UIAudio
extends Node
## Plays UI-related sound effects for menus, items, and progression events.

# --- References ---
var _sfx_manager: Node = null


func _ready() -> void:
	pass


# --- Menu / Navigation Sounds ---

func play_click() -> void:
	_play("click", -1.0, -1.0, SFXManager.Priority.HIGH, "ui")


func play_hover() -> void:
	_play("click", 0.3, 1.2, SFXManager.Priority.LOW, "ui", 80)


func play_open() -> void:
	_play("open", -1.0, -1.0, SFXManager.Priority.HIGH, "ui")


func play_close() -> void:
	_play("close", -1.0, -1.0, SFXManager.Priority.HIGH, "ui")


func play_error() -> void:
	_play("error", -1.0, -1.0, SFXManager.Priority.HIGH, "ui")


# --- Item Sounds ---

func play_item_pickup() -> void:
	_play("item_pickup", -1.0, -1.0, SFXManager.Priority.MEDIUM, "ui")


func play_gold_pickup() -> void:
	_play("gold_pickup", -1.0, -1.0, SFXManager.Priority.MEDIUM, "ui")


func play_equip_weapon() -> void:
	_play("equip_weapon", -1.0, -1.0, SFXManager.Priority.MEDIUM, "ui")


func play_equip_armor() -> void:
	_play("equip_armor", -1.0, -1.0, SFXManager.Priority.MEDIUM, "ui")


# --- Progression Sounds ---

func play_level_up() -> void:
	_play("level_up", -1.0, -1.0, SFXManager.Priority.CRITICAL, "ui")


func play_quest_complete() -> void:
	_play("level_up", 0.9, 1.1, SFXManager.Priority.HIGH, "ui")


# --- Inventory / Chest ---

func play_chest_open() -> void:
	_play("chest_open", -1.0, -1.0, SFXManager.Priority.MEDIUM, "ui")


func play_door_open() -> void:
	_play("door_open", -1.0, -1.0, SFXManager.Priority.MEDIUM, "ui")


# --- Internal ---

func _play(sound_id: String, volume: float = -1.0, pitch: float = -1.0,
		priority: int = SFXManager.Priority.MEDIUM, category: String = "ui",
		cooldown_ms: int = -1) -> void:
	if not _sfx_manager:
		_sfx_manager = _get_sfx_manager()
	if _sfx_manager:
		_sfx_manager.play(sound_id, volume, pitch, priority, category, cooldown_ms)


func _get_sfx_manager() -> Node:
	var audio_mgr := get_parent()
	if audio_mgr and "sfx_manager" in audio_mgr:
		return audio_mgr.sfx_manager
	return null
