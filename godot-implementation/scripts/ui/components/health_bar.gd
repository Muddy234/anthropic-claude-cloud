class_name HealthBarComponent
extends Control
## Reusable bar component for HP, MP, Stamina, XP.
## Features: foreground fill, animated damage trail, color thresholds,
## optional text overlay.  Use set_value() to update.

# --- Presets ---
enum BarType { HP, MP, STAMINA, XP, CUSTOM }

# Color presets per bar type
const BAR_COLORS: Dictionary = {
	BarType.HP: {
		"fill": Color("#C0392B"),
		"trail": Color("#FF6B6B"),
		"bg": Color("#1A0808"),
	},
	BarType.MP: {
		"fill": Color("#2980B9"),
		"trail": Color("#6BB3FF"),
		"bg": Color("#081220"),
	},
	BarType.STAMINA: {
		"fill": Color("#F39C12"),
		"trail": Color("#FFD166"),
		"bg": Color("#1A1400"),
	},
	BarType.XP: {
		"fill": Color("#8FAFC4"),
		"trail": Color("#B8D4E3"),
		"bg": Color("#0A1218"),
	},
}

# HP color thresholds
const HP_THRESHOLDS: Array[Dictionary] = [
	{"ratio": 0.75, "color": Color("#22AA22")},  # green  (75-100%)
	{"ratio": 0.50, "color": Color("#CCCC22")},  # yellow (50-75%)
	{"ratio": 0.25, "color": Color("#DD8822")},  # orange (25-50%)
	{"ratio": 0.00, "color": Color("#DD2222")},  # red    (0-25%)
]

# --- Exports ---
@export var bar_type: BarType = BarType.HP:
	set(value):
		bar_type = value
		_apply_preset()
@export var show_text: bool = true
@export var trail_enabled: bool = true
@export var trail_delay: float = 0.4
@export var trail_duration: float = 0.5
@export var use_hp_color_thresholds: bool = true

# Custom colors (used when bar_type == CUSTOM)
@export var custom_fill_color: Color = Color.WHITE
@export var custom_trail_color: Color = Color(1, 1, 1, 0.5)
@export var custom_bg_color: Color = Color(0.1, 0.1, 0.1)

# --- Node references ---
var _bg_rect: ColorRect
var _trail_rect: ColorRect
var _fill_rect: ColorRect
var _text_label: Label
var _border_rect: ReferenceRect

# --- State ---
var _current_value: float = 100.0
var _max_value: float = 100.0
var _display_ratio: float = 1.0
var _trail_ratio: float = 1.0
var _trail_tween: Tween

# Colors resolved from preset or custom
var _fill_color: Color = Color.WHITE
var _trail_color: Color = Color(1, 1, 1, 0.5)
var _bg_color: Color = Color(0.1, 0.1, 0.1)


func _ready() -> void:
	custom_minimum_size = Vector2(120, 16)
	_build_ui()
	_apply_preset()


# ==========================================================================
#  UI Construction
# ==========================================================================

func _build_ui() -> void:
	# Background
	_bg_rect = ColorRect.new()
	_bg_rect.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_bg_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_bg_rect)

	# Damage trail bar (sits between bg and fill)
	_trail_rect = ColorRect.new()
	_trail_rect.anchor_top = 0.0
	_trail_rect.anchor_bottom = 1.0
	_trail_rect.anchor_left = 0.0
	_trail_rect.anchor_right = 0.0
	_trail_rect.offset_top = 0.0
	_trail_rect.offset_bottom = 0.0
	_trail_rect.offset_left = 0.0
	_trail_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_trail_rect)

	# Fill bar (current value)
	_fill_rect = ColorRect.new()
	_fill_rect.anchor_top = 0.0
	_fill_rect.anchor_bottom = 1.0
	_fill_rect.anchor_left = 0.0
	_fill_rect.anchor_right = 0.0
	_fill_rect.offset_top = 0.0
	_fill_rect.offset_bottom = 0.0
	_fill_rect.offset_left = 0.0
	_fill_rect.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_fill_rect)

	# Text overlay
	_text_label = Label.new()
	_text_label.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	_text_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	_text_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	_text_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["small"])
	_text_label.add_theme_color_override("font_color", Color.WHITE)
	_text_label.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(_text_label)

	# Ensure initial sizing
	_update_bars()


func _apply_preset() -> void:
	if bar_type == BarType.CUSTOM:
		_fill_color = custom_fill_color
		_trail_color = custom_trail_color
		_bg_color = custom_bg_color
	elif BAR_COLORS.has(bar_type):
		var preset: Dictionary = BAR_COLORS[bar_type]
		_fill_color = preset["fill"]
		_trail_color = preset["trail"]
		_bg_color = preset["bg"]

	if _bg_rect:
		_bg_rect.color = _bg_color
		_trail_rect.color = _trail_color
		_fill_rect.color = _fill_color


# ==========================================================================
#  Public API
# ==========================================================================

## Update the bar value.  Both current and maximum must be provided.
func set_value(current: float, maximum: float) -> void:
	var old_ratio: float = _display_ratio
	_current_value = maxf(current, 0.0)
	_max_value = maxf(maximum, 1.0)
	_display_ratio = clampf(_current_value / _max_value, 0.0, 1.0)

	# Apply HP color thresholds if enabled
	if use_hp_color_thresholds and bar_type == BarType.HP:
		_fill_color = _get_hp_threshold_color(_display_ratio)
		if _fill_rect:
			_fill_rect.color = _fill_color

	_update_bars()

	# Update text
	if show_text and _text_label:
		_text_label.text = "%d / %d" % [int(_current_value), int(_max_value)]
		_text_label.visible = true
	elif _text_label:
		_text_label.visible = false

	# Animate damage trail on decrease
	if trail_enabled and _display_ratio < old_ratio:
		_animate_trail(old_ratio)
	elif _display_ratio >= old_ratio:
		# Healing or same: snap trail to current
		_trail_ratio = _display_ratio
		_update_trail_size()


## Get the current ratio (0.0 to 1.0).
func get_ratio() -> float:
	return _display_ratio


# ==========================================================================
#  Bar sizing
# ==========================================================================

func _update_bars() -> void:
	if not _fill_rect:
		return
	_fill_rect.offset_right = size.x * _display_ratio
	_update_trail_size()


func _update_trail_size() -> void:
	if not _trail_rect:
		return
	_trail_rect.offset_right = size.x * _trail_ratio


func _notification(what: int) -> void:
	if what == NOTIFICATION_RESIZED:
		_update_bars()


# ==========================================================================
#  Trail animation
# ==========================================================================

func _animate_trail(from_ratio: float) -> void:
	if _trail_tween:
		_trail_tween.kill()

	# Start trail at the old ratio
	_trail_ratio = from_ratio
	_update_trail_size()

	_trail_tween = create_tween()
	# Hold at old ratio briefly, then slide down to current
	_trail_tween.tween_interval(trail_delay)
	_trail_tween.tween_method(_set_trail_ratio, from_ratio, _display_ratio, trail_duration)\
		.set_ease(Tween.EASE_IN_OUT).set_trans(Tween.TRANS_CUBIC)


func _set_trail_ratio(ratio: float) -> void:
	_trail_ratio = ratio
	_update_trail_size()


# ==========================================================================
#  HP threshold color
# ==========================================================================

func _get_hp_threshold_color(ratio: float) -> Color:
	for threshold: Dictionary in HP_THRESHOLDS:
		if ratio > threshold["ratio"]:
			return threshold["color"]
	# Below all thresholds
	return HP_THRESHOLDS[-1]["color"] if not HP_THRESHOLDS.is_empty() else Color.RED
