extends Node

## Handles game save/load functionality

const SAVE_DIR := "user://saves/"
const SETTINGS_PATH := "user://settings.cfg"
const CURRENT_VERSION := 1
const MAX_SAVE_SLOTS := 3

signal save_completed(slot: int, success: bool)
signal load_completed(slot: int, success: bool)

func _ready():
	_ensure_save_directory()
	load_settings()

func _ensure_save_directory():
	DirAccess.make_dir_recursive_absolute(SAVE_DIR)

## Save game to slot
func save_game(slot: int = 0) -> bool:
	if slot < 0 or slot >= MAX_SAVE_SLOTS:
		push_error("Invalid save slot: %d" % slot)
		return false

	var data := _collect_save_data()
	var path := SAVE_DIR + "save_%d.json" % slot

	var file := FileAccess.open(path, FileAccess.WRITE)
	if not file:
		push_error("Failed to open save file: " + path)
		save_completed.emit(slot, false)
		return false

	file.store_string(JSON.stringify(data, "\t"))
	file.close()

	save_completed.emit(slot, true)
	EventBus.game_saved.emit()
	return true

## Load game from slot
func load_game(slot: int = 0) -> bool:
	if slot < 0 or slot >= MAX_SAVE_SLOTS:
		push_error("Invalid save slot: %d" % slot)
		return false

	var path := SAVE_DIR + "save_%d.json" % slot

	if not FileAccess.file_exists(path):
		push_warning("Save file not found: " + path)
		load_completed.emit(slot, false)
		return false

	var file := FileAccess.open(path, FileAccess.READ)
	if not file:
		push_error("Failed to open save file: " + path)
		load_completed.emit(slot, false)
		return false

	var json_string := file.get_as_text()
	file.close()

	var data = JSON.parse_string(json_string)
	if not data:
		push_error("Failed to parse save data")
		load_completed.emit(slot, false)
		return false

	var success := _restore_save_data(data)
	load_completed.emit(slot, success)

	if success:
		EventBus.game_loaded.emit()

	return success

## Check if a save slot has data
func has_save(slot: int) -> bool:
	var path := SAVE_DIR + "save_%d.json" % slot
	return FileAccess.file_exists(path)

## Get save info for display
func get_save_info(slot: int) -> Dictionary:
	if not has_save(slot):
		return {}

	var path := SAVE_DIR + "save_%d.json" % slot
	var file := FileAccess.open(path, FileAccess.READ)
	if not file:
		return {}

	var data = JSON.parse_string(file.get_as_text())
	file.close()

	if not data:
		return {}

	return {
		"slot": slot,
		"timestamp": data.get("timestamp", 0),
		"player_level": data.get("player", {}).get("level", 1),
		"floor": data.get("dungeon", {}).get("current_floor", 1),
		"playtime": data.get("playtime", 0)
	}

## Delete a save slot
func delete_save(slot: int) -> bool:
	var path := SAVE_DIR + "save_%d.json" % slot
	if FileAccess.file_exists(path):
		DirAccess.remove_absolute(path)
		return true
	return false

## Save settings
func save_settings():
	var config := ConfigFile.new()

	config.set_value("audio", "music_volume", GameManager.settings.music_volume)
	config.set_value("audio", "sfx_volume", GameManager.settings.sfx_volume)
	config.set_value("display", "screen_shake", GameManager.settings.screen_shake)
	config.set_value("display", "show_damage_numbers", GameManager.settings.show_damage_numbers)
	config.set_value("gameplay", "auto_pickup_gold", GameManager.settings.auto_pickup_gold)

	config.save(SETTINGS_PATH)

## Load settings
func load_settings():
	var config := ConfigFile.new()
	var err := config.load(SETTINGS_PATH)

	if err != OK:
		return  # Use defaults

	GameManager.settings.music_volume = config.get_value("audio", "music_volume", 0.8)
	GameManager.settings.sfx_volume = config.get_value("audio", "sfx_volume", 1.0)
	GameManager.settings.screen_shake = config.get_value("display", "screen_shake", true)
	GameManager.settings.show_damage_numbers = config.get_value("display", "show_damage_numbers", true)
	GameManager.settings.auto_pickup_gold = config.get_value("gameplay", "auto_pickup_gold", true)

## Collect all game data for saving
func _collect_save_data() -> Dictionary:
	var player := GameManager.player

	return {
		"version": CURRENT_VERSION,
		"timestamp": Time.get_unix_time_from_system(),
		"playtime": 0,  # TODO: Track playtime

		"player": {
			"grid_pos": {"x": player.grid_pos.x, "y": player.grid_pos.y},
			"current_hp": player.current_hp,
			"max_hp": player.max_hp,
			"level": player.level,
			"xp": player.xp,
			"gold": player.gold,
			"stats": _serialize_stats(player),
			"equipment": _serialize_equipment(player),
			"inventory": _serialize_inventory(player),
			"learned_skills": _serialize_skills(player.learned_skills),
			"active_skills": _serialize_skills(player.active_skills),
			"skill_cooldowns": player.skill_cooldowns.duplicate(),
			"skill_points": player.available_skill_points,
			"allocated_skills": player.allocated_skills.duplicate()
		},

		"dungeon": {
			"current_floor": GameManager.current_floor,
			"max_floor": GameManager.max_floor_reached,
			"seed": GameManager.dungeon_seed,
			"explored": _serialize_explored()
		},

		"quests": _serialize_quests(),
		"flags": GameManager.story_flags.duplicate(),
		"statistics": GameManager.statistics.duplicate()
	}

## Restore game data from save
func _restore_save_data(data: Dictionary) -> bool:
	# Version check
	if data.get("version", 0) != CURRENT_VERSION:
		return _migrate_save(data)

	# Restore dungeon first
	GameManager.dungeon_seed = data.dungeon.seed
	GameManager.current_floor = data.dungeon.current_floor
	GameManager.max_floor_reached = data.dungeon.max_floor

	# Generate the floor with same seed
	if GameManager.dungeon:
		GameManager.dungeon.generate_floor(data.dungeon.current_floor)

	# Restore player
	var player := GameManager.player
	if player:
		player.grid_pos = Vector2i(data.player.grid_pos.x, data.player.grid_pos.y)
		player.max_hp = data.player.max_hp
		player.current_hp = data.player.current_hp
		player.level = data.player.level
		player.xp = data.player.xp
		player.gold = data.player.gold
		player.available_skill_points = data.player.skill_points
		player.allocated_skills = data.player.allocated_skills
		player.skill_cooldowns = data.player.skill_cooldowns

		_restore_stats(player, data.player.stats)
		_restore_equipment(player, data.player.equipment)
		_restore_inventory(player, data.player.inventory)
		_restore_skills(player, data.player)

	# Restore explored tiles
	_restore_explored(data.dungeon.explored)

	# Restore quests
	_restore_quests(data.quests)

	# Restore flags and statistics
	GameManager.story_flags = data.flags
	GameManager.statistics = data.statistics

	return true

func _migrate_save(data: Dictionary) -> bool:
	# Handle save format migrations here
	push_warning("Save migration not implemented for version: %d" % data.get("version", 0))
	return false

# === SERIALIZATION HELPERS ===

func _serialize_stats(player) -> Dictionary:
	return player.stats.duplicate() if player.has("stats") else {}

func _serialize_equipment(player) -> Dictionary:
	var result := {}
	for slot in player.equipment:
		var item = player.equipment[slot]
		if item:
			result[slot] = item.id
	return result

func _serialize_inventory(player) -> Array:
	var result := []
	for item in player.inventory:
		result.append({
			"id": item.id,
			"count": item.stack_count if item.has("stack_count") else 1
		})
	return result

func _serialize_skills(skills: Array) -> Array:
	var result := []
	for skill in skills:
		result.append(skill.id)
	return result

func _serialize_explored() -> Array:
	# Serialize explored tile positions
	var result := []
	# TODO: Get explored tiles from dungeon
	return result

func _serialize_quests() -> Dictionary:
	# TODO: Serialize active quests
	return {}

func _restore_stats(player, stats: Dictionary):
	if player.has("stats"):
		for key in stats:
			player.stats[key] = stats[key]

func _restore_equipment(player, equipment: Dictionary):
	for slot in equipment:
		var item_id: String = equipment[slot]
		var item := _load_item(item_id)
		if item:
			player.equipment[slot] = item

func _restore_inventory(player, inventory: Array):
	player.inventory.clear()
	for entry in inventory:
		var item := _load_item(entry.id)
		if item:
			item.stack_count = entry.get("count", 1)
			player.inventory.append(item)

func _restore_skills(player, data: Dictionary):
	player.learned_skills.clear()
	for skill_id in data.learned_skills:
		var skill := _load_skill(skill_id)
		if skill:
			player.learned_skills.append(skill)

	player.active_skills.clear()
	for skill_id in data.active_skills:
		var skill := _load_skill(skill_id)
		if skill:
			player.active_skills.append(skill)

func _restore_explored(explored: Array):
	# TODO: Restore explored tiles to dungeon
	pass

func _restore_quests(quests: Dictionary):
	# TODO: Restore quest state
	pass

func _load_item(item_id: String) -> ItemData:
	var path := "res://resources/items/%s.tres" % item_id
	if ResourceLoader.exists(path):
		return load(path) as ItemData
	return null

func _load_skill(skill_id: String) -> SkillData:
	var path := "res://resources/skills/%s.tres" % skill_id
	if ResourceLoader.exists(path):
		return load(path) as SkillData
	return null
