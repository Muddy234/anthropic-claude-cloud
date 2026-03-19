class_name DamageNumber
extends Node2D

## Floating damage number effect

@onready var label: Label = $Label

var velocity: Vector2 = Vector2.ZERO
var lifetime: float = 1.0
var max_lifetime: float = 1.0
var scale_target: float = 1.0

func _ready():
	# Random horizontal offset for visual variety
	velocity.x = randf_range(-30, 30)
	velocity.y = -80 - randf() * 20

func _process(delta: float):
	# Apply velocity
	position += velocity * delta

	# Gravity
	velocity.y += 200 * delta

	# Slow down horizontal movement
	velocity.x *= 0.95

	# Scale animation (shrink from crit size)
	if scale.x > scale_target:
		scale = scale.lerp(Vector2(scale_target, scale_target), 5 * delta)

	# Fade out in last 30%
	lifetime -= delta
	var life_pct := lifetime / max_lifetime
	if life_pct < 0.3:
		modulate.a = life_pct / 0.3

	if lifetime <= 0:
		queue_free()

## Setup the damage number
func setup(amount, is_crit: bool = false, is_ambush: bool = false, custom_color: Color = Color.WHITE):
	# Set text
	if amount is int:
		label.text = str(amount) if amount != 0 else "MISS"
	else:
		label.text = str(amount)

	# Determine color
	var color := custom_color
	if custom_color == Color.WHITE:
		if amount == 0 or amount == "MISS":
			color = Constants.COLORS.miss
		elif is_ambush:
			color = Constants.COLORS.gold
		elif is_crit:
			color = Constants.COLORS.crit
		elif amount is int and amount < 0:
			color = Constants.COLORS.heal

	label.add_theme_color_override("font_color", color)

	# Size and effects
	if is_crit or is_ambush:
		scale = Vector2(1.5, 1.5)
		scale_target = 1.0
		max_lifetime = 1.5
		lifetime = 1.5
	elif amount == 0 or amount == "MISS":
		label.add_theme_font_size_override("font_size", 14)
	else:
		var size := 16
		if amount is int:
			size = mini(24, 14 + int(log(maxi(1, amount)) / log(10) * 3))
		label.add_theme_font_size_override("font_size", size)

## Create a heal number
static func create_heal(amount: int, pos: Vector2) -> DamageNumber:
	var scene := preload("res://scenes/effects/damage_number.tscn")
	var number: DamageNumber = scene.instantiate()
	number.position = pos
	number.setup(amount, false, false, Constants.COLORS.heal)
	number.label.text = "+" + str(amount)
	return number

## Create an XP number
static func create_xp(amount: int, pos: Vector2) -> DamageNumber:
	var scene := preload("res://scenes/effects/damage_number.tscn")
	var number: DamageNumber = scene.instantiate()
	number.position = pos
	number.setup("+%d XP" % amount, false, false, Constants.COLORS.xp)
	return number

## Create a gold number
static func create_gold(amount: int, pos: Vector2) -> DamageNumber:
	var scene := preload("res://scenes/effects/damage_number.tscn")
	var number: DamageNumber = scene.instantiate()
	number.position = pos
	number.setup("+%dG" % amount, false, false, Constants.COLORS.gold)
	return number

## Create a level up notification
static func create_level_up(level: int, pos: Vector2) -> DamageNumber:
	var scene := preload("res://scenes/effects/damage_number.tscn")
	var number: DamageNumber = scene.instantiate()
	number.position = pos
	number.setup("LEVEL %d!" % level, true, false, Color(1.0, 0.85, 0.0))
	number.velocity.y = -100
	number.max_lifetime = 2.0
	number.lifetime = 2.0
	return number
