class_name MeleeSlashEffect
extends Node2D
## Visual melee slash arc effect with WINDUP -> SLASH -> FADE state machine.
## Renders a custom arc polygon using _draw() with element color support.

enum State { WINDUP, SLASH, FADE, DONE }

# --- Timing ---
const WINDUP_DURATION := 0.15
const SLASH_DURATION := 0.2
const FADE_DURATION := 0.15

# --- Arc Configuration ---
const ARC_SEGMENTS := 12
const ARC_INNER_RADIUS := 8.0
const ARC_OUTER_RADIUS := 28.0
const ARC_ANGLE_START := -0.6  # radians from direction
const ARC_ANGLE_END := 0.6

# --- State ---
var _state: State = State.WINDUP
var _timer: float = 0.0
var _direction: Vector2 = Vector2.RIGHT
var _base_angle: float = 0.0
var _element_color: Color = Color.WHITE
var _alpha: float = 1.0
var _slash_progress: float = 0.0
var _weapon_type: String = "sword"


func _ready() -> void:
	z_index = 10


## Configure the slash effect before it plays.
## direction: normalized direction vector the slash faces
## weapon_type: affects arc width ("dagger" = narrow, "polearm" = wide)
## element: element string for color (e.g., "fire", "ice", "none")
func setup(direction: Vector2, weapon_type: String = "sword", element: String = "none") -> void:
	_direction = direction.normalized() if direction.length() > 0.0 else Vector2.RIGHT
	_base_angle = _direction.angle()
	_weapon_type = weapon_type
	_element_color = AbilityEffectsData.get_element_color(element)

	# Adjust arc width based on weapon type
	match weapon_type:
		"dagger":
			pass  # Use defaults (narrower)
		"polearm", "staff":
			pass  # Wider arc handled in draw
		_:
			pass  # Default arc


func _process(delta: float) -> void:
	_timer += delta

	match _state:
		State.WINDUP:
			_slash_progress = 0.0
			_alpha = lerpf(0.3, 0.8, minf(_timer / WINDUP_DURATION, 1.0))
			if _timer >= WINDUP_DURATION:
				_timer = 0.0
				_state = State.SLASH

		State.SLASH:
			_slash_progress = minf(_timer / SLASH_DURATION, 1.0)
			_alpha = 1.0
			if _timer >= SLASH_DURATION:
				_timer = 0.0
				_state = State.FADE

		State.FADE:
			var fade_t := minf(_timer / FADE_DURATION, 1.0)
			_alpha = lerpf(1.0, 0.0, fade_t)
			_slash_progress = 1.0
			if _timer >= FADE_DURATION:
				_state = State.DONE
				queue_free()
				return

	queue_redraw()


func _draw() -> void:
	if _state == State.DONE:
		return

	var arc_start: float
	var arc_end: float
	var inner_r: float = ARC_INNER_RADIUS
	var outer_r: float = ARC_OUTER_RADIUS

	# Adjust size based on weapon type
	match _weapon_type:
		"dagger":
			outer_r = 22.0
			inner_r = 6.0
		"polearm", "staff":
			outer_r = 36.0
			inner_r = 10.0
		"mace":
			outer_r = 30.0
			inner_r = 8.0

	match _state:
		State.WINDUP:
			# Small growing indicator
			var t := minf(_timer / WINDUP_DURATION, 1.0)
			arc_start = ARC_ANGLE_START * 0.3
			arc_end = ARC_ANGLE_END * 0.3
			outer_r *= lerpf(0.3, 0.6, t)
			inner_r *= 0.5
		State.SLASH:
			# Arc sweeps outward
			var t := _slash_progress
			arc_start = lerpf(ARC_ANGLE_START * 0.3, ARC_ANGLE_START, t)
			arc_end = lerpf(ARC_ANGLE_END * 0.3, ARC_ANGLE_END, t)
			outer_r *= lerpf(0.6, 1.0, t)
		State.FADE:
			# Full arc, fading out
			arc_start = ARC_ANGLE_START
			arc_end = ARC_ANGLE_END
		_:
			return

	# Build arc polygon
	var points: PackedVector2Array = PackedVector2Array()
	var colors: PackedColorArray = PackedColorArray()

	var draw_color := _element_color
	draw_color.a = _alpha

	# Outer arc (forward)
	for i in range(ARC_SEGMENTS + 1):
		var t := float(i) / float(ARC_SEGMENTS)
		var angle := _base_angle + lerpf(arc_start, arc_end, t)
		points.append(Vector2(cos(angle), sin(angle)) * outer_r)
		colors.append(draw_color)

	# Inner arc (reverse)
	var inner_color := draw_color
	inner_color.a *= 0.5
	for i in range(ARC_SEGMENTS, -1, -1):
		var t := float(i) / float(ARC_SEGMENTS)
		var angle := _base_angle + lerpf(arc_start, arc_end, t)
		points.append(Vector2(cos(angle), sin(angle)) * inner_r)
		colors.append(inner_color)

	if points.size() >= 3:
		draw_polygon(points, colors)

	# Draw bright edge line on the outer arc
	var edge_color := Color.WHITE
	edge_color.a = _alpha * 0.8
	var edge_points: PackedVector2Array = PackedVector2Array()
	for i in range(ARC_SEGMENTS + 1):
		var t := float(i) / float(ARC_SEGMENTS)
		var angle := _base_angle + lerpf(arc_start, arc_end, t)
		edge_points.append(Vector2(cos(angle), sin(angle)) * outer_r)

	if edge_points.size() >= 2:
		draw_polyline(edge_points, edge_color, 1.5, true)


func get_total_duration() -> float:
	return WINDUP_DURATION + SLASH_DURATION + FADE_DURATION


func is_done() -> bool:
	return _state == State.DONE
