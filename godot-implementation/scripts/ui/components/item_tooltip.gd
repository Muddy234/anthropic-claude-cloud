class_name ItemTooltip
extends PanelContainer
## Floating item tooltip that shows on hover over inventory slots.
## Displays item name (rarity colored), type, stats, enchantments, and
## an optional comparison against the currently equipped item.
## Position follows the mouse and is clamped to screen bounds.

# --- Constants ---
const TOOLTIP_OFFSET := Vector2(16, 16)
const MAX_WIDTH: float = 300.0
const COMPARISON_BETTER := Color("#55FF55")
const COMPARISON_WORSE := Color("#FF5555")
const COMPARISON_NEUTRAL := Color("#AAAAAA")

# --- Node references ---
var _vbox: VBoxContainer
var _name_label: Label
var _type_label: Label
var _separator_1: HSeparator
var _stats_container: VBoxContainer
var _separator_2: HSeparator
var _effects_container: VBoxContainer
var _description_label: RichTextLabel
var _price_label: Label
var _comparison_container: VBoxContainer

# --- State ---
var _is_showing: bool = false


func _ready() -> void:
	visible = false
	mouse_filter = Control.MOUSE_FILTER_IGNORE
	custom_minimum_size = Vector2(200, 0)
	set_anchors_and_offsets_preset(Control.PRESET_TOP_LEFT)
	z_index = 100

	# Apply tooltip panel style
	var style := StyleBoxFlat.new()
	style.bg_color = Color(UIConstantsDef.BG_DARKEST, 0.95)
	style.border_color = UIConstantsDef.BORDER_BRIGHT
	style.set_border_width_all(1)
	style.set_corner_radius_all(4)
	style.content_margin_left = 10.0
	style.content_margin_top = 8.0
	style.content_margin_right = 10.0
	style.content_margin_bottom = 8.0
	add_theme_stylebox_override("panel", style)

	_build_ui()


# ==========================================================================
#  UI Construction
# ==========================================================================

func _build_ui() -> void:
	_vbox = VBoxContainer.new()
	_vbox.add_theme_constant_override("separation", 4)
	add_child(_vbox)

	# Item name
	_name_label = Label.new()
	_name_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["subtitle"])
	_name_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_vbox.add_child(_name_label)

	# Item type
	_type_label = Label.new()
	_type_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["small"])
	_type_label.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
	_vbox.add_child(_type_label)

	# Separator
	_separator_1 = HSeparator.new()
	_vbox.add_child(_separator_1)

	# Stats list
	_stats_container = VBoxContainer.new()
	_stats_container.add_theme_constant_override("separation", 2)
	_vbox.add_child(_stats_container)

	# Separator
	_separator_2 = HSeparator.new()
	_vbox.add_child(_separator_2)

	# Special effects / enchantments
	_effects_container = VBoxContainer.new()
	_effects_container.add_theme_constant_override("separation", 2)
	_vbox.add_child(_effects_container)

	# Description
	_description_label = RichTextLabel.new()
	_description_label.bbcode_enabled = true
	_description_label.fit_content = true
	_description_label.scroll_active = false
	_description_label.custom_minimum_size = Vector2(0, 0)
	_description_label.add_theme_color_override("default_color", UIConstantsDef.TEXT_MUTED)
	_description_label.add_theme_font_size_override("normal_font_size", UIConstantsDef.FONT_SIZES["small"])
	_vbox.add_child(_description_label)

	# Sell price
	_price_label = Label.new()
	_price_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["small"])
	_price_label.add_theme_color_override("font_color", UIConstantsDef.GOLD)
	_vbox.add_child(_price_label)

	# Comparison section
	_comparison_container = VBoxContainer.new()
	_comparison_container.add_theme_constant_override("separation", 2)
	_vbox.add_child(_comparison_container)


# ==========================================================================
#  Show / Hide
# ==========================================================================

## Show tooltip for an item, optionally comparing against an equipped item.
## item_data: {name, type, rarity, stats:{}, effects:[], description, sell_price}
## compare_item: same structure, or empty dict to skip comparison.
func show_tooltip(item_data: Dictionary, compare_item: Dictionary = {}) -> void:
	_populate(item_data, compare_item)
	_is_showing = true
	visible = true


func hide_tooltip() -> void:
	_is_showing = false
	visible = false


# ==========================================================================
#  Populate fields
# ==========================================================================

func _populate(item: Dictionary, compare: Dictionary) -> void:
	# Name (rarity colored)
	var rarity: String = item.get("rarity", "common")
	_name_label.text = item.get("name", "Unknown Item")
	_name_label.add_theme_color_override("font_color", UIConstantsDef.get_rarity_color(rarity))

	# Type
	var item_type: String = item.get("type", "")
	_type_label.text = item_type.capitalize()
	_type_label.visible = not item_type.is_empty()

	# Stats
	_clear_children(_stats_container)
	var stats: Dictionary = item.get("stats", {})
	var compare_stats: Dictionary = compare.get("stats", {})
	_separator_1.visible = not stats.is_empty()

	for stat_name: String in stats:
		var value: Variant = stats[stat_name]
		var stat_row := _create_stat_line(stat_name, value, compare_stats.get(stat_name))
		_stats_container.add_child(stat_row)

	# Effects / enchantments
	_clear_children(_effects_container)
	var effects: Array = item.get("effects", [])
	_separator_2.visible = not effects.is_empty()

	for effect: Variant in effects:
		var eff_label := Label.new()
		if effect is Dictionary:
			eff_label.text = effect.get("description", str(effect))
		else:
			eff_label.text = str(effect)
		eff_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["small"])
		eff_label.add_theme_color_override("font_color", UIConstantsDef.CORRUPTION_BRIGHT)
		eff_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
		_effects_container.add_child(eff_label)

	# Description
	var desc: String = item.get("description", "")
	_description_label.text = desc
	_description_label.visible = not desc.is_empty()

	# Sell price
	var price: int = item.get("sell_price", 0)
	if price > 0:
		_price_label.text = "Sell: %d gold" % price
		_price_label.visible = true
	else:
		_price_label.visible = false

	# Comparison summary
	_clear_children(_comparison_container)
	if not compare.is_empty() and not compare_stats.is_empty():
		var comp_header := Label.new()
		comp_header.text = "Compared to equipped:"
		comp_header.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["tiny"])
		comp_header.add_theme_color_override("font_color", UIConstantsDef.TEXT_MUTED)
		_comparison_container.add_child(comp_header)

		# Show diffs for stats in the new item
		for stat_name: String in stats:
			if compare_stats.has(stat_name):
				var diff: float = float(stats[stat_name]) - float(compare_stats[stat_name])
				if not is_zero_approx(diff):
					var diff_label := Label.new()
					var arrow: String = "^" if diff > 0 else "v"
					diff_label.text = "  %s %s %+.0f" % [arrow, stat_name.capitalize(), diff]
					diff_label.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["small"])
					diff_label.add_theme_color_override("font_color",
						COMPARISON_BETTER if diff > 0 else COMPARISON_WORSE)
					_comparison_container.add_child(diff_label)


func _create_stat_line(stat_name: String, value: Variant, compare_value: Variant) -> HBoxContainer:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 8)

	var name_lbl := Label.new()
	name_lbl.text = stat_name.capitalize() + ":"
	name_lbl.custom_minimum_size = Vector2(100, 0)
	name_lbl.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["small"])
	name_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_SECONDARY)
	row.add_child(name_lbl)

	var value_lbl := Label.new()
	value_lbl.text = _format_stat_value(value)
	value_lbl.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["small"])
	value_lbl.add_theme_color_override("font_color", UIConstantsDef.TEXT_PRIMARY)
	row.add_child(value_lbl)

	# Comparison arrow
	if compare_value != null:
		var diff: float = float(value) - float(compare_value)
		if not is_zero_approx(diff):
			var arrow_lbl := Label.new()
			arrow_lbl.text = "(^)" if diff > 0 else "(v)"
			arrow_lbl.add_theme_font_size_override("font_size", UIConstantsDef.FONT_SIZES["small"])
			arrow_lbl.add_theme_color_override("font_color",
				COMPARISON_BETTER if diff > 0 else COMPARISON_WORSE)
			row.add_child(arrow_lbl)

	return row


func _format_stat_value(value: Variant) -> String:
	if value is float:
		if absf(value) < 1.0:
			return "%+.0f%%" % (value * 100.0)
		return str(snapped(value, 0.1))
	return str(value)


# ==========================================================================
#  Position tracking
# ==========================================================================

func _process(_delta: float) -> void:
	if not _is_showing:
		return
	_update_position()


func _update_position() -> void:
	var mouse_pos: Vector2 = get_viewport().get_mouse_position()
	var viewport_size: Vector2 = get_viewport_rect().size
	var tooltip_size: Vector2 = size

	var target_pos: Vector2 = mouse_pos + TOOLTIP_OFFSET

	# Clamp to right edge
	if target_pos.x + tooltip_size.x > viewport_size.x:
		target_pos.x = mouse_pos.x - tooltip_size.x - TOOLTIP_OFFSET.x

	# Clamp to bottom edge
	if target_pos.y + tooltip_size.y > viewport_size.y:
		target_pos.y = mouse_pos.y - tooltip_size.y - TOOLTIP_OFFSET.y

	# Clamp to left/top
	target_pos.x = maxf(target_pos.x, 0.0)
	target_pos.y = maxf(target_pos.y, 0.0)

	global_position = target_pos


# ==========================================================================
#  Helpers
# ==========================================================================

func _clear_children(node: Node) -> void:
	for child in node.get_children():
		child.queue_free()
