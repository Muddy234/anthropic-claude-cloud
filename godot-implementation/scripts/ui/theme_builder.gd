@tool
class_name ThemeBuilder
extends RefCounted
## Builds the complete Godot Theme resource for "The Shifting Chasm" UI.
##
## Usage:
##   var theme := ThemeBuilder.build_theme()
##   get_tree().root.theme = theme       # apply globally
##
## Can also be invoked from an @tool EditorScript to save the result as a
## .tres resource for version control.

# =========================================================================
#  Font paths — update if assets are relocated
# =========================================================================
const FONT_SERIF_PATH  := "res://assets/fonts/RobotoSlab-Regular.ttf"
const FONT_SANS_PATH   := "res://assets/fonts/NotoSans-Regular.ttf"
const FONT_ACCENT_PATH := "res://assets/fonts/Cinzel-Regular.ttf"


static func build_theme() -> Theme:
	var theme := Theme.new()

	# ------------------------------------------------------------------
	#  Fonts
	# ------------------------------------------------------------------
	var font_serif: Font = _try_load_font(FONT_SERIF_PATH)
	var font_sans: Font = _try_load_font(FONT_SANS_PATH)
	var font_accent: Font = _try_load_font(FONT_ACCENT_PATH)

	# Fallback: if none found, leave Godot default
	if font_serif:
		theme.set_default_font(font_serif)
	elif font_sans:
		theme.set_default_font(font_sans)

	theme.set_default_font_size(UIConstantsDef.FONT_SIZES["body"])

	# Header / title font overrides
	if font_accent:
		theme.set_font("font", "HeaderLabel", font_accent)
		theme.set_font("font", "TitleLabel", font_accent)
	elif font_serif:
		theme.set_font("font", "HeaderLabel", font_serif)
		theme.set_font("font", "TitleLabel", font_serif)

	theme.set_font_size("font_size", "HeaderLabel", UIConstantsDef.FONT_SIZES["header"])
	theme.set_font_size("font_size", "TitleLabel", UIConstantsDef.FONT_SIZES["title"])

	# ------------------------------------------------------------------
	#  Panel  (PanelContainer)
	# ------------------------------------------------------------------
	var panel_bg := StyleBoxFlat.new()
	panel_bg.bg_color = UIConstantsDef.BG_DARKEST
	panel_bg.border_color = UIConstantsDef.BORDER
	panel_bg.set_border_width_all(1)
	panel_bg.set_corner_radius_all(4)
	panel_bg.content_margin_left   = 8.0
	panel_bg.content_margin_top    = 8.0
	panel_bg.content_margin_right  = 8.0
	panel_bg.content_margin_bottom = 8.0
	theme.set_stylebox("panel", "PanelContainer", panel_bg)

	# Also set the base Panel style
	var panel_base := panel_bg.duplicate()
	theme.set_stylebox("panel", "Panel", panel_base)

	# ------------------------------------------------------------------
	#  Button states
	# ------------------------------------------------------------------
	# Normal
	var btn_normal := StyleBoxFlat.new()
	btn_normal.bg_color = UIConstantsDef.BG_MEDIUM
	btn_normal.border_color = UIConstantsDef.BORDER
	btn_normal.set_border_width_all(1)
	btn_normal.set_corner_radius_all(3)
	btn_normal.content_margin_left   = 12.0
	btn_normal.content_margin_top    = 6.0
	btn_normal.content_margin_right  = 12.0
	btn_normal.content_margin_bottom = 6.0
	theme.set_stylebox("normal", "Button", btn_normal)

	# Hover
	var btn_hover := btn_normal.duplicate() as StyleBoxFlat
	btn_hover.bg_color = UIConstantsDef.BG_LIGHTEST
	btn_hover.border_color = UIConstantsDef.BORDER_BRIGHT
	theme.set_stylebox("hover", "Button", btn_hover)

	# Pressed
	var btn_pressed := btn_normal.duplicate() as StyleBoxFlat
	btn_pressed.bg_color = UIConstantsDef.BG_DARKEST
	btn_pressed.border_color = UIConstantsDef.BORDER_ACTIVE
	theme.set_stylebox("pressed", "Button", btn_pressed)

	# Disabled
	var btn_disabled := btn_normal.duplicate() as StyleBoxFlat
	btn_disabled.bg_color = UIConstantsDef.BG_DARK
	btn_disabled.border_color = UIConstantsDef.BORDER
	theme.set_stylebox("disabled", "Button", btn_disabled)

	# Focus (keyboard navigation outline)
	var btn_focus := btn_normal.duplicate() as StyleBoxFlat
	btn_focus.bg_color = UIConstantsDef.BG_MEDIUM
	btn_focus.border_color = UIConstantsDef.FRAME_GOLD
	btn_focus.set_border_width_all(2)
	theme.set_stylebox("focus", "Button", btn_focus)

	# Button text colors
	theme.set_color("font_color",          "Button", UIConstantsDef.TEXT_PRIMARY)
	theme.set_color("font_hover_color",    "Button", Color.WHITE)
	theme.set_color("font_pressed_color",  "Button", UIConstantsDef.TEXT_SECONDARY)
	theme.set_color("font_disabled_color", "Button", UIConstantsDef.TEXT_DISABLED)

	# ------------------------------------------------------------------
	#  Label
	# ------------------------------------------------------------------
	theme.set_color("font_color", "Label", UIConstantsDef.TEXT_PRIMARY)

	# ------------------------------------------------------------------
	#  ProgressBar  (HP / MP / Stamina default)
	# ------------------------------------------------------------------
	var bar_bg := StyleBoxFlat.new()
	bar_bg.bg_color = UIConstantsDef.BG_DARKEST
	bar_bg.border_color = UIConstantsDef.BORDER
	bar_bg.set_border_width_all(1)
	bar_bg.set_corner_radius_all(2)
	theme.set_stylebox("background", "ProgressBar", bar_bg)

	# Default fill — health red; callers override per-instance for mana/stamina
	var bar_fill := StyleBoxFlat.new()
	bar_fill.bg_color = UIConstantsDef.HP_BAR
	bar_fill.set_corner_radius_all(2)
	theme.set_stylebox("fill", "ProgressBar", bar_fill)

	# ------------------------------------------------------------------
	#  TabBar / TabContainer
	# ------------------------------------------------------------------
	var tab_panel := StyleBoxFlat.new()
	tab_panel.bg_color = UIConstantsDef.BG_DARK
	tab_panel.border_color = UIConstantsDef.BORDER
	tab_panel.set_border_width_all(1)
	tab_panel.set_corner_radius_all(0)
	theme.set_stylebox("tab_selected", "TabBar", _make_tab_style(UIConstantsDef.BG_MEDIUM, true))
	theme.set_stylebox("tab_unselected", "TabBar", _make_tab_style(UIConstantsDef.BG_DARKEST, false))
	theme.set_stylebox("tab_hovered", "TabBar", _make_tab_style(UIConstantsDef.BG_LIGHTEST, false))
	theme.set_stylebox("panel", "TabContainer", tab_panel)

	theme.set_color("font_selected_color",   "TabBar", UIConstantsDef.TEXT_PRIMARY)
	theme.set_color("font_unselected_color",  "TabBar", UIConstantsDef.TEXT_MUTED)
	theme.set_color("font_hovered_color",     "TabBar", UIConstantsDef.TEXT_SECONDARY)

	# ------------------------------------------------------------------
	#  ScrollContainer / ScrollBar
	# ------------------------------------------------------------------
	var scroll_bg := StyleBoxFlat.new()
	scroll_bg.bg_color = UIConstantsDef.BG_DARK
	scroll_bg.set_corner_radius_all(2)
	theme.set_stylebox("scroll", "VScrollBar", scroll_bg)

	var scroll_grabber := StyleBoxFlat.new()
	scroll_grabber.bg_color = UIConstantsDef.BORDER_BRIGHT
	scroll_grabber.set_corner_radius_all(2)
	theme.set_stylebox("grabber", "VScrollBar", scroll_grabber)

	var scroll_grabber_hl := scroll_grabber.duplicate() as StyleBoxFlat
	scroll_grabber_hl.bg_color = UIConstantsDef.FRAME_GOLD_DARK
	theme.set_stylebox("grabber_highlight", "VScrollBar", scroll_grabber_hl)

	# ------------------------------------------------------------------
	#  LineEdit
	# ------------------------------------------------------------------
	var le_normal := StyleBoxFlat.new()
	le_normal.bg_color = UIConstantsDef.BG_DARKEST
	le_normal.border_color = UIConstantsDef.BORDER
	le_normal.set_border_width_all(1)
	le_normal.set_corner_radius_all(3)
	le_normal.content_margin_left   = 6.0
	le_normal.content_margin_right  = 6.0
	le_normal.content_margin_top    = 4.0
	le_normal.content_margin_bottom = 4.0
	theme.set_stylebox("normal", "LineEdit", le_normal)

	var le_focus := le_normal.duplicate() as StyleBoxFlat
	le_focus.border_color = UIConstantsDef.FRAME_GOLD
	theme.set_stylebox("focus", "LineEdit", le_focus)

	theme.set_color("font_color", "LineEdit", UIConstantsDef.TEXT_PRIMARY)
	theme.set_color("caret_color", "LineEdit", UIConstantsDef.GOLD)

	return theme


# ==========================================================================
#  Internal helpers
# ==========================================================================

static func _try_load_font(path: String) -> Font:
	if ResourceLoader.exists(path):
		return load(path) as Font
	return null


static func _make_tab_style(bg: Color, selected: bool) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = bg
	sb.border_color = UIConstantsDef.BORDER if not selected else UIConstantsDef.FRAME_GOLD_DARK
	sb.border_width_left   = 1
	sb.border_width_top    = 1
	sb.border_width_right  = 1
	sb.border_width_bottom = 0 if selected else 1
	sb.corner_radius_top_left  = 4
	sb.corner_radius_top_right = 4
	sb.content_margin_left   = 12.0
	sb.content_margin_top    = 6.0
	sb.content_margin_right  = 12.0
	sb.content_margin_bottom = 6.0
	return sb
