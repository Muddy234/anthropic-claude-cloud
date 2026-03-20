class_name CombatAudio
extends Node
## Connects to EventBus combat signals and plays appropriate SFX.
## Handles weapon-type to sound mapping, monster sounds, and combat feedback.

# --- Weapon Type to Sound Mapping ---
const WEAPON_SOUNDS: Dictionary = {
	"sword": ["sword_swing_1", "sword_swing_2", "sword_swing_3"],
	"axe": ["sword_swing_1", "sword_swing_2", "sword_swing_3"],
	"dagger": ["sword_swing_1", "sword_swing_2"],
	"mace": ["sword_swing_1", "sword_swing_2"],
	"polearm": ["sword_swing_1", "sword_swing_3"],
	"bow": ["bow_release"],
	"staff": ["spell_fire", "spell_ice", "spell_lightning"],
	"magic": ["spell_fire", "spell_ice", "spell_lightning"],
}

# --- Monster Type to Sound Mapping ---
const MONSTER_SOUNDS: Dictionary = {
	"rat": {"hurt": "player_hurt", "death": "player_death", "attack": "sword_swing_1"},
	"skeleton": {"hurt": "hit_melee_1", "death": "player_death", "attack": "sword_swing_2"},
	"goblin": {"hurt": "player_hurt", "death": "player_death", "attack": "sword_swing_1"},
	"slime": {"hurt": "hit_melee_2", "death": "player_death", "attack": "hit_melee_3"},
	"orc": {"hurt": "hit_melee_1", "death": "player_death", "attack": "sword_swing_3"},
	"malphas": {"hurt": "hit_critical", "death": "player_death", "attack": "spell_fire"},
	"core": {"hurt": "hit_critical", "death": "player_death", "attack": "spell_lightning"},
	"generic": {"hurt": "hit_melee_1", "death": "player_death", "attack": "sword_swing_1"},
}

# --- References ---
var _sfx_manager: Node = null


func _ready() -> void:
	# Defer signal connections to ensure EventBus is available
	call_deferred("_connect_signals")


func _connect_signals() -> void:
	var event_bus := _get_event_bus()
	if not event_bus:
		push_warning("CombatAudio: EventBus not found")
		return

	if event_bus.has_signal("combat_hit"):
		event_bus.combat_hit.connect(_on_combat_hit)
	if event_bus.has_signal("entity_died"):
		event_bus.entity_died.connect(_on_entity_died)
	if event_bus.has_signal("combat_engaged"):
		event_bus.combat_engaged.connect(_on_combat_engaged)
	if event_bus.has_signal("player_attacked"):
		event_bus.player_attacked.connect(_on_player_attacked)
	if event_bus.has_signal("player_hit_enemy"):
		event_bus.player_hit_enemy.connect(_on_player_hit_enemy)
	if event_bus.has_signal("player_critical_hit"):
		event_bus.player_critical_hit.connect(_on_player_critical_hit)
	if event_bus.has_signal("player_damage_taken"):
		event_bus.player_damage_taken.connect(_on_player_damage_taken)


# --- Signal Handlers ---

func _on_combat_hit(attacker: Node, _defender: Node, result: Dictionary) -> void:
	var was_blocked: bool = result.get("blocked", false)
	var was_critical: bool = result.get("critical", false)
	var damage_type: String = result.get("damage_type", "melee")

	if was_blocked:
		_play("hit_blocked", -1.0, -1.0, SFXManager.Priority.HIGH, "combat")
		return

	if was_critical:
		_play("hit_critical", -1.0, -1.0, SFXManager.Priority.HIGH, "combat")
		return

	# Normal hit based on damage type
	match damage_type:
		"melee", "physical":
			_play_random_hit_melee()
		"magic", "fire", "ice", "lightning":
			_play("spell_fire", -1.0, -1.0, SFXManager.Priority.MEDIUM, "combat")
		_:
			_play_random_hit_melee()


func _on_entity_died(entity: Node, _killer: Node) -> void:
	var monster_type := _get_monster_type(entity)
	var sounds: Dictionary = MONSTER_SOUNDS.get(monster_type, MONSTER_SOUNDS["generic"])
	var death_sound: String = sounds.get("death", "player_death")
	_play(death_sound, -1.0, -1.0, SFXManager.Priority.HIGH, "monster")


func _on_combat_engaged(_attacker: Node, _defender: Node) -> void:
	# Optional: play a combat start stinger or alert sound
	pass


func _on_player_attacked(weapon_type: String) -> void:
	var sounds: Array = WEAPON_SOUNDS.get(weapon_type.to_lower(), WEAPON_SOUNDS.get("sword", []))
	if sounds.is_empty():
		return
	var chosen: String = sounds[randi() % sounds.size()]
	_play(chosen, -1.0, -1.0, SFXManager.Priority.MEDIUM, "combat")


func _on_player_hit_enemy(_player: Node, _enemy: Node, _damage: float, weapon_type: String) -> void:
	# Play hit impact sound
	_play_random_hit_melee()
	# Also play weapon-specific swing if not already triggered
	if weapon_type == "bow":
		_play("bow_release", -1.0, -1.0, SFXManager.Priority.MEDIUM, "combat")


func _on_player_critical_hit(_player: Node, _enemy: Node, _damage: float) -> void:
	_play("hit_critical", -1.0, -1.0, SFXManager.Priority.HIGH, "combat")


func _on_player_damage_taken(_player: Node, _damage: float, _source: Node) -> void:
	_play("player_hurt", -1.0, -1.0, SFXManager.Priority.HIGH, "combat")


# --- Helpers ---

func _play_random_hit_melee() -> void:
	var hits := ["hit_melee_1", "hit_melee_2", "hit_melee_3"]
	var chosen: String = hits[randi() % hits.size()]
	_play(chosen, -1.0, -1.0, SFXManager.Priority.MEDIUM, "combat")


func _play(sound_id: String, volume: float = -1.0, pitch: float = -1.0,
		priority: int = SFXManager.Priority.MEDIUM, category: String = "combat") -> void:
	if not _sfx_manager:
		_sfx_manager = _get_sfx_manager()
	if _sfx_manager:
		_sfx_manager.play(sound_id, volume, pitch, priority, category)


func _get_monster_type(entity: Node) -> String:
	# Try to extract monster type from entity metadata or properties
	if entity.has_method("get_monster_type"):
		return entity.get_monster_type()
	if entity.has_meta("monster_type"):
		return entity.get_meta("monster_type")
	if "monster_type" in entity:
		return entity.monster_type
	if "monster_id" in entity:
		var mid: String = entity.monster_id
		for key in MONSTER_SOUNDS:
			if mid.to_lower().contains(key):
				return key
	return "generic"


func _get_sfx_manager() -> Node:
	var audio_mgr := get_parent()
	if audio_mgr and "sfx_manager" in audio_mgr:
		return audio_mgr.sfx_manager
	return null


func _get_event_bus() -> Node:
	return get_node_or_null("/root/EventBus")
