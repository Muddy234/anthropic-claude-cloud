extends Node

## Central event bus for decoupled communication between systems

# === PLAYER EVENTS ===
signal player_moved(from: Vector2i, to: Vector2i)
signal player_attacked(target: Node)
signal player_damaged(amount: int, source: Node)
signal player_healed(amount: int, source: Node)
signal player_died()
signal player_level_up(new_level: int)
signal player_xp_gained(amount: int)
signal player_gold_changed(new_amount: int)

# === ENEMY EVENTS ===
signal enemy_spawned(enemy: Node)
signal enemy_died(enemy: Node)
signal enemy_damaged(enemy: Node, amount: int, source: Node)
signal enemy_spotted_player(enemy: Node)
signal enemy_lost_player(enemy: Node)

# === COMBAT EVENTS ===
signal combat_started()
signal combat_ended()
signal attack_performed(attacker: Node, defender: Node, result: Dictionary)
signal skill_used(caster: Node, skill: Resource, targets: Array)
signal status_applied(entity: Node, effect: Node)
signal status_removed(entity: Node, effect: Node)

# === TURN EVENTS ===
signal turn_started()
signal turn_ended()
signal player_turn_started()
signal player_turn_ended()
signal enemy_turn_started(enemy: Node)
signal enemy_turn_ended(enemy: Node)

# === ITEM EVENTS ===
signal item_picked_up(item: Resource)
signal item_dropped(item: Resource, position: Vector2i)
signal item_used(item: Resource)
signal item_equipped(item: Resource, slot: int)
signal item_unequipped(item: Resource, slot: int)
signal loot_pile_created(pile: Node, position: Vector2i)

# === DUNGEON EVENTS ===
signal floor_entered(floor_num: int)
signal floor_exited(floor_num: int)
signal room_entered(room: Dictionary)
signal room_cleared(room: Dictionary)
signal stairs_used(direction: String)  # "up" or "down"
signal secret_found(position: Vector2i)

# === UI EVENTS ===
signal show_dialog(dialog_data: Dictionary)
signal hide_dialog()
signal show_tooltip(text: String, position: Vector2)
signal hide_tooltip()
signal show_notification(text: String, type: String)
signal update_hud()
signal show_loot_popup(items: Array)
signal hide_loot_popup()

# === MENU EVENTS ===
signal menu_opened(menu_name: String)
signal menu_closed(menu_name: String)
signal inventory_opened()
signal inventory_closed()
signal character_sheet_opened()
signal character_sheet_closed()

# === QUEST EVENTS ===
signal quest_started(quest_id: String)
signal quest_updated(quest_id: String)
signal quest_completed(quest_id: String)
signal quest_failed(quest_id: String)
signal objective_completed(quest_id: String, objective_id: String)

# === NPC EVENTS ===
signal npc_interacted(npc: Node)
signal dialog_started(npc: Node)
signal dialog_ended(npc: Node)
signal shop_opened(npc: Node)
signal shop_closed()

# === GAME STATE EVENTS ===
signal game_started()
signal game_paused()
signal game_resumed()
signal game_over()
signal game_saved()
signal game_loaded()

# === AUDIO EVENTS ===
signal play_sfx(sfx_name: String)
signal play_music(track_name: String)
signal stop_music()

# === DEBUG EVENTS ===
signal debug_message(message: String)
signal debug_command(command: String, args: Array)
