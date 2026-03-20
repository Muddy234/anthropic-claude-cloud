class_name UIManagerDef
extends Node
## Central UI panel manager (autoload singleton, register as "UIManager").
## Maintains a panel stack for open panels, handles ESC-to-close,
## auto-pause for modal panels, and blocks game input when panels are open.
##
## Usage:
##   UIManager.register_panel("inventory", $InventoryPanel)
##   UIManager.open_panel("inventory")
##   UIManager.toggle_panel("inventory")
##   UIManager.close_top_panel()

# --- Signals ---
signal panel_opened(panel_name: String)
signal panel_closed(panel_name: String)
signal all_panels_closed
signal game_input_blocked(blocked: bool)

# --- Panel categories ---
## Modal panels pause the game and block all input behind them.
const MODAL_PANELS: Array[String] = [
	"inventory", "shop", "bank", "crafting", "dialogue",
	"shrine", "chest", "loadout", "bulletin", "tavern",
	"pause", "game_over",
]

## Overlay panels do not pause the game; they float over gameplay.
const OVERLAY_PANELS: Array[String] = [
	"character_sheet", "skills", "map", "journal",
]

# --- Hotkey action -> panel name mapping ---
## These must match InputMap action names defined in Project Settings.
const HOTKEY_MAP: Dictionary = {
	"inventory":        "inventory",
	"character_sheet":  "character_sheet",
	"skills_menu":      "skills",
	"map_overlay":      "map",
	"journal":          "journal",
}

# --- State ---
## Stack of currently open panel names (newest at the back).
var panel_stack: Array[String] = []

## Registry of panel name -> Control node reference.
var registered_panels: Dictionary = {}  # String -> Control

## Tracks which panels are modal for quick lookup.
var _modal_set: Dictionary = {}  # String -> bool
var _overlay_set: Dictionary = {}  # String -> bool

## Whether game input is currently blocked by an open panel.
var _input_blocked: bool = false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS

	# Build lookup sets
	for p: String in MODAL_PANELS:
		_modal_set[p] = true
	for p: String in OVERLAY_PANELS:
		_overlay_set[p] = true


# ==========================================================================
#  Registration
# ==========================================================================

## Register a panel Control with a unique name.
## The panel's visibility is set to false upon registration.
func register_panel(panel_name: String, panel: Control) -> void:
	if registered_panels.has(panel_name):
		push_warning("[UIManager] Panel '%s' already registered, overwriting." % panel_name)
	registered_panels[panel_name] = panel
	panel.visible = false


## Unregister a panel (e.g., when a scene is freed).
func unregister_panel(panel_name: String) -> void:
	if panel_name in panel_stack:
		close_panel(panel_name)
	registered_panels.erase(panel_name)


# ==========================================================================
#  Open / Close / Toggle
# ==========================================================================

## Open a panel by name.  If it is already open, bring it to the top.
func open_panel(panel_name: String) -> void:
	var panel: Control = registered_panels.get(panel_name)
	if not panel:
		push_warning("[UIManager] Panel '%s' not registered." % panel_name)
		return

	# Already open? Move to top of stack.
	if panel_name in panel_stack:
		panel_stack.erase(panel_name)

	panel.visible = true
	panel_stack.push_back(panel_name)
	panel_opened.emit(panel_name)

	_update_pause_state()
	_update_input_block()


## Close a specific panel by name.
func close_panel(panel_name: String) -> void:
	var panel: Control = registered_panels.get(panel_name)
	if not panel:
		return

	panel.visible = false
	panel_stack.erase(panel_name)
	panel_closed.emit(panel_name)

	_update_pause_state()
	_update_input_block()

	if panel_stack.is_empty():
		all_panels_closed.emit()


## Toggle a panel open/closed.
func toggle_panel(panel_name: String) -> void:
	if is_panel_open(panel_name):
		close_panel(panel_name)
	else:
		open_panel(panel_name)


## Close the topmost panel in the stack (used for ESC handling).
func close_top_panel() -> void:
	if panel_stack.is_empty():
		return
	var top_name: String = panel_stack.back()
	close_panel(top_name)


## Close all open panels.
func close_all_panels() -> void:
	var names: Array[String] = panel_stack.duplicate()
	for panel_name: String in names:
		close_panel(panel_name)


# ==========================================================================
#  Queries
# ==========================================================================

## Returns true if the named panel is currently open (in the stack).
func is_panel_open(panel_name: String) -> bool:
	return panel_name in panel_stack


## Returns true if any panel is open.
func has_open_panel() -> bool:
	return not panel_stack.is_empty()


## Returns true if any modal panel is open.
func has_open_modal() -> bool:
	for panel_name: String in panel_stack:
		if _modal_set.has(panel_name):
			return true
	return false


## Returns true if game input should be blocked.
func is_input_blocked() -> bool:
	return _input_blocked


## Returns the name of the topmost panel, or "" if none.
func get_top_panel() -> String:
	if panel_stack.is_empty():
		return ""
	return panel_stack.back()


# ==========================================================================
#  Input handling
# ==========================================================================

func _unhandled_input(event: InputEvent) -> void:
	# ESC: close topmost panel, or open pause if nothing is open
	if event.is_action_pressed("ui_cancel"):
		if not panel_stack.is_empty():
			close_top_panel()
		else:
			# Open pause menu if registered
			if registered_panels.has("pause"):
				open_panel("pause")
		get_viewport().set_input_as_handled()
		return

	# Hotkey toggles (only when no modal is blocking)
	if not has_open_modal():
		for action: String in HOTKEY_MAP:
			if event.is_action_pressed(action):
				var panel_name: String = HOTKEY_MAP[action]
				toggle_panel(panel_name)
				get_viewport().set_input_as_handled()
				return


# ==========================================================================
#  Pause management
# ==========================================================================

## Auto-pause when a modal panel is open.  Unpause when all modals close.
func _update_pause_state() -> void:
	var should_pause: bool = has_open_modal()
	# Avoid fighting with other pause sources (e.g., PauseMenu handles its own)
	if should_pause and not get_tree().paused:
		get_tree().paused = true
	elif not should_pause and get_tree().paused:
		# Only unpause if we were the ones who paused
		get_tree().paused = false


# ==========================================================================
#  Input blocking
# ==========================================================================

func _update_input_block() -> void:
	var should_block: bool = has_open_panel()
	if should_block != _input_blocked:
		_input_blocked = should_block
		game_input_blocked.emit(_input_blocked)


# ==========================================================================
#  Utility: ensure InputMap actions exist
# ==========================================================================

## Call this at startup to register panel hotkey actions if they are not
## already defined in Project Settings.  This is a convenience for
## development; in production the InputMap should be configured in the
## editor.
static func ensure_input_actions() -> void:
	var action_keys: Dictionary = {
		"inventory":       KEY_E,
		"character_sheet": KEY_C,
		"skills_menu":     KEY_K,
		"map_overlay":     KEY_M,
		"journal":         KEY_J,
		"shift_overlay":   KEY_TAB,
		"hotbar_1":        KEY_1,
		"hotbar_2":        KEY_2,
		"hotbar_3":        KEY_3,
		"hotbar_4":        KEY_4,
		"hotbar_5":        KEY_5,
		"dash":            KEY_SPACE,
	}

	for action_name: String in action_keys:
		if not InputMap.has_action(action_name):
			InputMap.add_action(action_name)
			var event := InputEventKey.new()
			event.keycode = action_keys[action_name]
			InputMap.action_add_event(action_name, event)
