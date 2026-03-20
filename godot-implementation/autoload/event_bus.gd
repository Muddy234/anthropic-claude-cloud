class_name EventBusDef
extends Node

# --- Game State ---
signal game_state_changed(old_state: int, new_state: int)

# --- Game Flow ---
signal player_death(player: Node)
signal dungeon_complete(floor_reached: int)
signal village_entered()

# --- Floor Events ---
signal floor_advanced(new_floor: int, previous_floor: int)

# --- Player Combat Events ---
signal player_hit_enemy(player: Node, enemy: Node, damage: float, weapon_type: String)
signal player_critical_hit(player: Node, enemy: Node, damage: float)
signal player_damage_taken(player: Node, damage: float, source: Node)
signal player_killed_enemy(player: Node, enemy: Node)
signal player_took_damage(player: Node, amount: float, source: Node)
signal player_crit_hit(player: Node, enemy: Node, damage: float)

# --- Boon Events ---
signal player_boon_selected(boon_id: String, ancestor: String)
signal player_boon_removed(boon_id: String)
signal synergy_activated(ancestor: String, tier: int)
signal synergy_deactivated(ancestor: String, tier: int)

# --- Enemy Events ---
signal enemy_death(enemy: Node, killer: Node, overkill: float)

# --- Encirclement Events ---
signal encirclement_changed(player: Node, enemy_count: int)
signal encirclement_flanked(player: Node)
signal encirclement_surrounded(player: Node)
signal encirclement_clear(player: Node)

# --- Dodge Events ---
signal player_dodge_start(player: Node, direction: Vector2)
signal player_dodge_end(player: Node)

# --- Hazard Events ---
signal hazard_created(position: Vector2, type: String, damage: float)
signal hazard_damage(target: Node, damage: float, type: String)

# --- Spell Events ---
signal player_spell_cast(spell_name: String, position: Vector2)
signal player_spell_heal(player: Node, amount: float)
signal player_spell_shield(player: Node, amount: float)
signal player_shield_break(player: Node)
signal player_shield_expire(player: Node)

# --- Stamina Events ---
signal stamina_exhausted(player: Node)
signal stamina_recovered(player: Node)

# --- Combat Audio/Integration Events ---
signal combat_hit(attacker: Node, defender: Node, result: Dictionary)
signal entity_died(entity: Node, killer: Node)
signal combat_engaged(attacker: Node, defender: Node)
signal player_attacked(weapon_type: String)
