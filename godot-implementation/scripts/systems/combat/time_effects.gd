class_name TimeEffects
extends BaseSystem
## Time manipulation system for slow-motion, time-stop, and dramatic effects.
## Provides scaled delta for combat systems and visual effect flags.

# ── Signals ──────────────────────────────────────────────────────────────────
signal time_slow_started(factor: float, duration: float)
signal time_slow_ended()

# ── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_EASE_OUT_DURATION: float = 0.05

# ── State ────────────────────────────────────────────────────────────────────
var time_scale: float = 1.0
var slow_timer: float = 0.0
var target_scale: float = 1.0
var ease_out_timer: float = 0.0
var ease_out_duration: float = DEFAULT_EASE_OUT_DURATION

## Visual effect flags — read by rendering / post-process systems.
var vignette: bool = false
var desaturate: bool = false
var intensity: float = 0.0

## Internal tracking for "only apply if slower" logic.
var _current_factor: float = 1.0


# ── Lifecycle ────────────────────────────────────────────────────────────────

func _ready() -> void:
	system_name = "TimeEffects"
	priority = 10
	super._ready()


func initialize() -> void:
	time_scale = 1.0
	slow_timer = 0.0
	target_scale = 1.0
	ease_out_timer = 0.0
	ease_out_duration = DEFAULT_EASE_OUT_DURATION
	vignette = false
	desaturate = false
	intensity = 0.0
	_current_factor = 1.0


func cleanup() -> void:
	initialize()


# ── Public API ───────────────────────────────────────────────────────────────

func trigger_slow(duration_ms: int, factor: float = 0.5, options: Dictionary = {}) -> void:
	## Apply a time-slow effect. Only applies if the requested factor is slower
	## (lower) than the currently active slow. Duration is in milliseconds.
	if factor >= _current_factor and slow_timer > 0.0:
		return  # Current slow is already stronger

	var duration_sec: float = duration_ms / 1000.0
	_current_factor = factor
	target_scale = factor
	time_scale = factor
	slow_timer = duration_sec
	ease_out_timer = 0.0
	ease_out_duration = options.get("ease_out_duration", DEFAULT_EASE_OUT_DURATION)
	vignette = options.get("vignette", false)
	desaturate = options.get("desaturate", false)
	intensity = clampf(1.0 - factor, 0.0, 1.0)

	time_slow_started.emit(factor, duration_sec)


func trigger_stop(duration_ms: int) -> void:
	## Complete time stop (factor = 0).
	trigger_slow(duration_ms, 0.0, {"vignette": true, "desaturate": true})


func trigger_impact_slow(duration_ms: int) -> void:
	## Brief impact hit-pause feel (factor = 0.7, no vignette).
	trigger_slow(duration_ms, 0.7, {"vignette": false, "desaturate": false})


func trigger_dramatic_slow(duration_ms: int) -> void:
	## Dramatic slow-mo for big moments (factor = 0.3, vignette enabled).
	trigger_slow(duration_ms, 0.3, {"vignette": true, "desaturate": false})


func get_scaled_delta(real_dt: float) -> float:
	## Returns the time-scaled delta for systems that respect time manipulation.
	return real_dt * time_scale


func get_scale() -> float:
	return time_scale


func is_slowed() -> bool:
	return time_scale < 1.0


# ── Processing ───────────────────────────────────────────────────────────────

func process_system(delta: float) -> void:
	# Use real (unscaled) delta for timer countdown so slows expire in real-time.
	var real_dt: float = delta

	if slow_timer > 0.0:
		slow_timer -= real_dt

		if slow_timer <= 0.0:
			# Begin ease-out phase
			slow_timer = 0.0
			ease_out_timer = ease_out_duration
			_current_factor = 1.0

	if ease_out_timer > 0.0:
		ease_out_timer -= real_dt

		if ease_out_timer <= 0.0:
			# Ease-out complete — snap to normal
			ease_out_timer = 0.0
			time_scale = 1.0
			target_scale = 1.0
			vignette = false
			desaturate = false
			intensity = 0.0
			time_slow_ended.emit()
		else:
			# Interpolate from current factor back to 1.0 using quadratic ease-out
			var t: float = 1.0 - (ease_out_timer / ease_out_duration)
			var eased: float = _ease_out_quad(t)
			time_scale = lerpf(target_scale, 1.0, eased)
			intensity = clampf(1.0 - time_scale, 0.0, 1.0)


# ── Easing ───────────────────────────────────────────────────────────────────

func _ease_out_quad(t: float) -> float:
	## Quadratic ease-out: decelerating from zero velocity.
	## Formula: t * (2 - t)
	return t * (2.0 - t)


# ── State Change ─────────────────────────────────────────────────────────────

func _on_game_state_changed(old_state, new_state) -> void:
	on_state_changed(old_state, new_state)


func on_state_changed(_old_state, _new_state) -> void:
	pass
