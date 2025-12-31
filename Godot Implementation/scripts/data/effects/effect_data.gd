@tool
class_name EffectData
extends Resource

## Resource defining a status effect (buff/debuff)

@export var id: String
@export var name: String
@export_multiline var description: String
@export var icon: Texture2D

@export_group("Type")
@export var is_buff: bool = true  # false = debuff
@export var is_hidden: bool = false  # Don't show in UI
@export var is_unique: bool = true  # Only one instance allowed
@export var stacks: bool = false
@export var max_stacks: int = 5

@export_group("Duration")
@export var duration: float = 10.0  # Seconds (0 = permanent until removed)
@export var tick_rate: float = 1.0  # How often to apply tick effects

@export_group("Tick Effects")
@export var damage_per_tick: int = 0
@export var heal_per_tick: int = 0
@export var mana_per_tick: int = 0
@export var tick_damage_type: Constants.DamageType = Constants.DamageType.PHYSICAL

@export_group("Stat Modifiers")
## Flat additions
@export var attack_bonus: int = 0
@export var defense_bonus: int = 0
@export var speed_bonus: int = 0
@export var max_hp_bonus: int = 0

## Percentage modifiers (0.1 = +10%)
@export var damage_modifier: float = 0.0
@export var damage_taken_modifier: float = 0.0
@export var speed_modifier: float = 0.0
@export var crit_modifier: float = 0.0
@export var healing_modifier: float = 0.0

@export_group("Special Effects")
@export var prevents_action: bool = false  # Stun/freeze
@export var prevents_movement: bool = false  # Root
@export var is_invisible: bool = false
@export var is_invulnerable: bool = false
@export var reflects_damage: float = 0.0  # % of damage reflected
@export var lifesteal: float = 0.0  # % of damage healed

@export_group("Removal Conditions")
@export var breaks_on_damage: bool = false
@export var breaks_on_attack: bool = false
@export var breaks_on_movement: bool = false
@export var remove_on_floor_change: bool = true

@export_group("Visuals")
@export var tint_color: Color = Color.WHITE
@export var particle_effect: String = ""

## Create a status effect instance from this data
func create_instance(source: Node = null) -> StatusEffect:
	var effect := StatusEffect.new()
	effect.id = id
	effect.effect_data = self
	effect.source = source
	effect.duration = duration
	effect.max_duration = duration
	effect.tick_rate = tick_rate
	effect.stacks = 1
	return effect

## Get display text for tooltips
func get_tooltip() -> String:
	var lines := [name]

	if description:
		lines.append(description)

	if duration > 0:
		lines.append("Duration: %.1fs" % duration)

	# Stat modifiers
	if attack_bonus != 0:
		lines.append("Attack: %+d" % attack_bonus)
	if defense_bonus != 0:
		lines.append("Defense: %+d" % defense_bonus)
	if damage_modifier != 0:
		lines.append("Damage: %+.0f%%" % (damage_modifier * 100))
	if speed_modifier != 0:
		lines.append("Speed: %+.0f%%" % (speed_modifier * 100))

	# Tick effects
	if damage_per_tick > 0:
		lines.append("Deals %d damage every %.1fs" % [damage_per_tick, tick_rate])
	if heal_per_tick > 0:
		lines.append("Heals %d every %.1fs" % [heal_per_tick, tick_rate])

	# Special
	if prevents_action:
		lines.append("Cannot act")
	if prevents_movement:
		lines.append("Cannot move")

	return "\n".join(lines)
