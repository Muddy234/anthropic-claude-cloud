## scripts/entities/player.gd
## Player character entity. 6 equip slots, stat block, GCD, torch, mana.
class_name Player
extends Entity

# --- Signals ---
signal equipment_changed(slot: StringName)
signal stats_recalculated
signal torch_toggled(is_on: bool)
signal gold_changed(amount: int)
signal stamina_changed(current: float, maximum: float)
signal mana_changed(current: float, maximum: float)
signal experience_changed(current: int, required: int)
signal level_changed(new_level: int)

# --- Equipment Slot Enum ---
enum EquipSlot { HEAD, CHEST, LEGS, FEET, MAIN, OFF }

# --- Base Attributes ---
var stats: Dictionary = {
	&"STR": 10,
	&"AGI": 10,
	&"INT": 10,
	&"STA": 10
}

# --- Resources ---
@export var max_stamina: float = 100.0
var stamina: float = 100.0:
	set(value):
		stamina = clampf(value, 0.0, max_stamina)
		stamina_changed.emit(stamina, max_stamina)

@export var max_mp: float = 100.0
var mp: float = 100.0:
	set(value):
		mp = clampf(value, 0.0, max_mp)
		mana_changed.emit(mp, max_mp)

var mana_regen: float = 5.0  # per second

# --- Derived Combat Stats ---
var p_def: int = 0
var m_def: int = 0
var crit_chance: float = 5.0
var dodge_chance: float = 0.0

# --- Equipment ---
## Keys: EquipSlot enum values. Values: ItemData resource or null.
var equipped: Dictionary = {}

# --- Inventory ---
## Managed via WP03 InventorySystem; player holds a reference.
var inventory: Array[Resource] = []

# --- Abilities ---
## 4 action bar slots. Slot 0 = unarmed fallback.
var abilities: Array[Variant] = [null, null, null, null]

# --- Combat State ---
var is_in_combat: bool = false
var current_target: Node = null
var attack_cooldown: float = 0.0
var attack_speed: float = 1.0
var attack_range: int = 1

# --- GCD ---
var gcd_active: bool = false
var gcd_remaining: float = 0.0
const GCD_DURATION: float = 0.4

# --- Action Cooldowns ---
var action_cooldowns: Dictionary = {
	&"base_attack": 0.0,
	&"skill_attack": 0.0,
	&"consumable_3": 0.0,
	&"consumable_4": 0.0,
}

# --- Ammo ---
var ammo_arrows: int = 0
var ammo_bolts: int = 0

# --- Consumable Hotkeys ---
var assigned_consumables: Dictionary = {
	&"slot_3": null,  # ItemData id
	&"slot_4": null,
}

# --- Torch ---
var is_torch_on: bool = true
var torch_fuel: float = 100.0
const TORCH_FUEL_MAX: float = 100.0
const TORCH_FUEL_DRAIN: float = 1.0  # per second

# --- Gold ---
var gold: int = 50

# --- Experience & Level ---
var level: int = 1
var experience: int = 0
var experience_to_next: int = 100

# --- Stat Modifier Stacks (WP05 integration) ---
## Dictionary of StringName -> StatModifierStack.
## Populated by boon/effect systems. Keys match JS statStacks.
var stat_stacks: Dictionary = {}

# --- Node References ---
@onready var torch_light: PointLight2D = $TorchLight
@onready var interaction_area: Area2D = $InteractionArea
@onready var hitbox_area: Area2D = $HitboxArea

# -----------------------------------------------------------------
# Lifecycle
# -----------------------------------------------------------------

func _ready() -> void:
	super._ready()
	add_to_group("player")
	_init_equipment_slots()
	_init_default_ability()
	recalculate_stats()
	stamina = max_stamina
	mp = max_mp
	if torch_light:
		torch_light.enabled = is_torch_on

func _init_equipment_slots() -> void:
	for slot in EquipSlot.values():
		equipped[slot] = null

func _init_default_ability() -> void:
	# Slot 0: Unarmed Strike (always present)
	abilities[0] = {
		"name": "Unarmed Strike",
		"cost": 0,
		"type": "stamina",
		"base_dmg": 5,
		"scaling": "STR",
		"accuracy": 85,
		"element": "physical",
		"damage_type": "blunt",
	}

func _process(delta: float) -> void:
	_update_cooldowns(delta)
	_update_mana_regen(delta)
	_update_torch_fuel(delta)

func _update_cooldowns(delta: float) -> void:
	if gcd_active:
		gcd_remaining -= delta
		if gcd_remaining <= 0.0:
			gcd_active = false
			gcd_remaining = 0.0
	for key in action_cooldowns:
		if action_cooldowns[key] > 0.0:
			action_cooldowns[key] = maxf(0.0, action_cooldowns[key] - delta)
	if attack_cooldown > 0.0:
		attack_cooldown = maxf(0.0, attack_cooldown - delta)

func _update_mana_regen(delta: float) -> void:
	if mp < max_mp:
		mp = minf(mp + mana_regen * delta, max_mp)

func _update_torch_fuel(delta: float) -> void:
	if is_torch_on and torch_fuel > 0.0:
		torch_fuel = maxf(0.0, torch_fuel - TORCH_FUEL_DRAIN * delta)
		if torch_fuel <= 0.0:
			toggle_torch()

# -----------------------------------------------------------------
# Input Handling
# -----------------------------------------------------------------

func _unhandled_input(event: InputEvent) -> void:
	if _is_dead:
		return
	if event.is_action_pressed("interact"):
		_try_interact()
	if event.is_action_pressed("toggle_torch"):
		toggle_torch()
	if event.is_action_pressed("attack"):
		_try_attack()

func _try_interact() -> void:
	var nearest: Node = _find_nearest_interactable()
	if nearest:
		if nearest is NPC:
			nearest.interact(self)
		else:
			EventBus.emit_signal("interact_with", nearest)

func _find_nearest_interactable() -> Node:
	if not interaction_area:
		return null
	var bodies: Array[Node2D] = interaction_area.get_overlapping_bodies()
	var nearest: Node = null
	var nearest_dist: float = INF
	for body in bodies:
		if body == self:
			continue
		if body is NPC or body.is_in_group("interactables"):
			var dist := global_position.distance_to(body.global_position)
			if dist < nearest_dist:
				nearest_dist = dist
				nearest = body
	return nearest

# -----------------------------------------------------------------
# Attack Dispatch
# -----------------------------------------------------------------

func _try_attack() -> void:
	if gcd_active or attack_cooldown > 0.0:
		return
	if is_stunned or is_frozen:
		return

	# Start GCD
	gcd_active = true
	gcd_remaining = GCD_DURATION

	# Use equipped ability or unarmed strike
	var ability: Variant = abilities[0]
	for i in range(abilities.size()):
		if abilities[i] != null and action_cooldowns.get(&"base_attack", 0.0) <= 0.0:
			ability = abilities[i]
			break

	if ability == null:
		return

	# Check mana/stamina cost
	var cost: float = ability.get("cost", 0)
	var cost_type: String = ability.get("type", "stamina")
	if cost_type == "mana" and mp < cost:
		return
	elif cost_type == "stamina" and stamina < cost:
		return

	# Deduct cost
	if cost_type == "mana":
		mp -= cost
	elif cost_type == "stamina":
		stamina -= cost

	# Set cooldowns
	attack_cooldown = 1.0 / attack_speed
	action_cooldowns[&"base_attack"] = attack_cooldown

	# Dispatch attack event
	EventBus.player_attacked.emit(ability.get("damage_type", "blunt"))

# -----------------------------------------------------------------
# Equipment
# -----------------------------------------------------------------

func equip_item(item: Resource, from_index: int) -> bool:
	var slot: int = _get_equip_slot(item)
	if slot == -1:
		return false
	# Unequip current
	var current: Resource = equipped[slot]
	if current != null:
		inventory.append(current)
	equipped[slot] = item
	# Remove from inventory
	if from_index >= 0 and from_index < inventory.size():
		inventory.remove_at(from_index)
	recalculate_stats()
	equipment_changed.emit(EquipSlot.keys()[slot])
	return true

func unequip_item(slot: int) -> bool:
	if equipped.get(slot) == null:
		return false
	inventory.append(equipped[slot])
	equipped[slot] = null
	recalculate_stats()
	equipment_changed.emit(EquipSlot.keys()[slot])
	return true

func _get_equip_slot(item: Resource) -> int:
	# Map item.slot string to EquipSlot enum
	var slot_map := {
		"HEAD": EquipSlot.HEAD, "CHEST": EquipSlot.CHEST,
		"LEGS": EquipSlot.LEGS, "FEET": EquipSlot.FEET,
		"MAIN": EquipSlot.MAIN, "OFF": EquipSlot.OFF,
	}
	var slot_name: String = item.get("slot") if item.has_method("get") else ""
	return slot_map.get(slot_name, -1)

# -----------------------------------------------------------------
# Stat Recalculation
# -----------------------------------------------------------------
## Port of JS recalculatePlayerStats().
## Sums equipment bonuses -> derives maxHp, mana, crit, dodge, etc.

func recalculate_stats() -> void:
	var bonus_str := 0
	var bonus_agi := 0
	var bonus_int := 0
	var bonus_sta := 0
	var bonus_p_def := 0
	var bonus_m_def := 0
	var gear_flat_hp := 0

	for slot in EquipSlot.values():
		var item: Resource = equipped[slot]
		if item == null:
			continue
		bonus_str += item.get(&"stat_str") if item.get(&"stat_str") else 0
		bonus_agi += item.get(&"stat_agi") if item.get(&"stat_agi") else 0
		bonus_int += item.get(&"stat_int") if item.get(&"stat_int") else 0
		bonus_sta += item.get(&"stat_sta") if item.get(&"stat_sta") else 0
		bonus_p_def += item.get(&"p_def") if item.get(&"p_def") else 0
		bonus_m_def += item.get(&"m_def") if item.get(&"m_def") else 0
		gear_flat_hp += item.get(&"flat_hp") if item.get(&"flat_hp") else 0

	# HP = 100 base + vitality bonus + gear flat HP
	var base_hp_val: int = Constants.PLAYER_CONFIG.get("base_hp", 100)
	var total_sta := stats[&"STA"] + bonus_sta
	max_hp = base_hp_val + (total_sta - 10) * 5 + gear_flat_hp
	hp = mini(hp, max_hp)

	# Mana: fixed at 100, regen scales with INT
	var total_int := stats[&"INT"] + bonus_int
	max_mp = 100.0
	mana_regen = 5.0 * (1.0 + total_int / 100.0)

	# Defense
	p_def = bonus_p_def
	m_def = bonus_m_def
	base_defense = p_def

	# Crit (base 5% + 0.3% per AGI over 10)
	var total_agi := stats[&"AGI"] + bonus_agi
	crit_chance = 5.0 + maxf(0.0, (total_agi - 10) * 0.3)

	# Dodge (0.2% per AGI over 10)
	dodge_chance = maxf(0.0, (total_agi - 10) * 0.2)

	# Weapon-derived stats
	var weapon: Resource = equipped[EquipSlot.MAIN]
	if weapon:
		attack_speed = weapon.get(&"attack_speed") if weapon.get(&"attack_speed") else 1.0
		attack_range = weapon.get(&"attack_range") if weapon.get(&"attack_range") else 1
		element = weapon.get(&"element") if weapon.get(&"element") else &"physical"
	else:
		attack_speed = 1.0
		attack_range = 1
		element = &"physical"

	stats_recalculated.emit()

# -----------------------------------------------------------------
# Experience & Leveling
# -----------------------------------------------------------------

func gain_experience(amount: int) -> void:
	experience += amount
	while experience >= experience_to_next:
		experience -= experience_to_next
		_level_up()
	experience_changed.emit(experience, experience_to_next)

func _level_up() -> void:
	level += 1
	# Scale XP requirement: base * scaling^(level-1)
	var base_xp: int = Constants.PLAYER_CONFIG.get("xp_to_level_base", 100)
	var scaling: float = Constants.PLAYER_CONFIG.get("xp_scaling", 1.5)
	experience_to_next = int(base_xp * pow(scaling, level - 1))

	# Stat growth per level
	stats[&"STR"] += 1
	stats[&"AGI"] += 1
	stats[&"INT"] += 1
	stats[&"STA"] += 1

	recalculate_stats()
	hp = max_hp  # Full heal on level up
	level_changed.emit(level)

# -----------------------------------------------------------------
# Torch
# -----------------------------------------------------------------

func toggle_torch() -> void:
	is_torch_on = not is_torch_on
	if torch_light:
		torch_light.enabled = is_torch_on
	torch_toggled.emit(is_torch_on)
	EventBus.emit_signal("torch_toggled", is_torch_on)

# -----------------------------------------------------------------
# Gold
# -----------------------------------------------------------------

func add_gold(amount: int) -> void:
	gold += amount
	gold_changed.emit(gold)

func spend_gold(amount: int) -> bool:
	if gold < amount:
		return false
	gold -= amount
	gold_changed.emit(gold)
	return true

# -----------------------------------------------------------------
# Death / Reset (Permadeath)
# -----------------------------------------------------------------

func handle_death() -> void:
	_is_dead = true
	EventBus.emit_signal("player_died")

func reset() -> Player:
	return Player.new()
