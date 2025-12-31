class_name CombatPhaseMachine
extends RefCounted

## State machine for arena combat phases

signal phase_changed(new_phase: Constants.CombatPhase)
signal phase_completed(phase: Constants.CombatPhase)

var current_phase: Constants.CombatPhase = Constants.CombatPhase.ENTERING
var previous_phase: Constants.CombatPhase = Constants.CombatPhase.ENTERING

# Phase timers
var phase_timer: float = 0.0
var phase_duration: float = 0.0

## Get current phase
func get_phase() -> Constants.CombatPhase:
	return current_phase

## Get phase name for display
func get_phase_name() -> String:
	match current_phase:
		Constants.CombatPhase.ENTERING:
			return "Entering Combat"
		Constants.CombatPhase.TELEGRAPH:
			return "Enemy Intent"
		Constants.CombatPhase.PLANNING:
			return "Plan Actions"
		Constants.CombatPhase.RESOLUTION:
			return "Resolving..."
		Constants.CombatPhase.CLEANUP:
			return "Turn End"
		Constants.CombatPhase.VICTORY:
			return "Victory!"
		Constants.CombatPhase.DEFEAT:
			return "Defeat"
		Constants.CombatPhase.EXITING:
			return "Exiting Combat"
		_:
			return "Unknown"

## Transition to a new phase
func transition_to(new_phase: Constants.CombatPhase) -> void:
	if new_phase == current_phase:
		return

	previous_phase = current_phase
	current_phase = new_phase
	phase_timer = 0.0
	phase_duration = _get_phase_duration(new_phase)

	phase_changed.emit(new_phase)
	EventBus.arena_phase_changed.emit(new_phase)

## Get duration for a phase (0 = waits for manual trigger)
func _get_phase_duration(phase: Constants.CombatPhase) -> float:
	match phase:
		Constants.CombatPhase.ENTERING:
			return 0.0  # Instant
		Constants.CombatPhase.TELEGRAPH:
			return 0.0  # Instant - show enemy intent immediately
		Constants.CombatPhase.PLANNING:
			return 0.0  # Untimed - waits for player confirmation
		Constants.CombatPhase.RESOLUTION:
			return 0.0  # Duration determined by action count
		Constants.CombatPhase.CLEANUP:
			return 0.0  # Instant
		Constants.CombatPhase.VICTORY:
			return 0.0  # Instant
		Constants.CombatPhase.DEFEAT:
			return 0.0  # Instant
		Constants.CombatPhase.EXITING:
			return 0.0  # Instant
		_:
			return 0.0

## Check if current phase is timed
func is_phase_timed() -> bool:
	return phase_duration > 0.0

## Update phase timer (returns true if phase completed due to timer)
## Note: Does NOT emit phase_completed signal - that's only for manual completion
func update(delta: float) -> bool:
	if not is_phase_timed():
		return false

	phase_timer += delta

	if phase_timer >= phase_duration:
		# Don't emit signal here - caller handles advancement directly
		# Signal is only for manual completion via complete_phase()
		return true

	return false

## Get remaining time for current phase
func get_remaining_time() -> float:
	if not is_phase_timed():
		return -1.0
	return maxf(0.0, phase_duration - phase_timer)

## Get phase progress (0.0 - 1.0)
func get_phase_progress() -> float:
	if phase_duration <= 0.0:
		return 0.0
	return clampf(phase_timer / phase_duration, 0.0, 1.0)

## Manual completion (for untimed phases like PLANNING)
func complete_phase() -> void:
	phase_completed.emit(current_phase)

## Check if in a player-interactive phase
func is_player_input_phase() -> bool:
	return current_phase == Constants.CombatPhase.PLANNING

## Check if combat is active (not entering/exiting or victory/defeat)
func is_combat_active() -> bool:
	return current_phase in [
		Constants.CombatPhase.TELEGRAPH,
		Constants.CombatPhase.PLANNING,
		Constants.CombatPhase.RESOLUTION,
		Constants.CombatPhase.CLEANUP
	]

## Check if combat has ended
func is_combat_ended() -> bool:
	return current_phase in [
		Constants.CombatPhase.VICTORY,
		Constants.CombatPhase.DEFEAT,
		Constants.CombatPhase.EXITING
	]

## Get next phase in normal flow
func get_next_phase() -> Constants.CombatPhase:
	match current_phase:
		Constants.CombatPhase.ENTERING:
			return Constants.CombatPhase.TELEGRAPH
		Constants.CombatPhase.TELEGRAPH:
			return Constants.CombatPhase.PLANNING
		Constants.CombatPhase.PLANNING:
			return Constants.CombatPhase.RESOLUTION
		Constants.CombatPhase.RESOLUTION:
			return Constants.CombatPhase.CLEANUP
		Constants.CombatPhase.CLEANUP:
			return Constants.CombatPhase.TELEGRAPH  # Loop back
		Constants.CombatPhase.VICTORY:
			return Constants.CombatPhase.EXITING
		Constants.CombatPhase.DEFEAT:
			return Constants.CombatPhase.EXITING
		Constants.CombatPhase.EXITING:
			return Constants.CombatPhase.EXITING  # No next phase
		_:
			return Constants.CombatPhase.ENTERING

## Advance to next phase in normal flow
func advance() -> void:
	transition_to(get_next_phase())

## Reset to beginning state
func reset() -> void:
	previous_phase = Constants.CombatPhase.ENTERING
	current_phase = Constants.CombatPhase.ENTERING
	phase_timer = 0.0
	phase_duration = _get_phase_duration(Constants.CombatPhase.ENTERING)
