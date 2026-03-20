class_name UIConstantsDef
extends Node
## Autoload singleton containing the complete "occult dungeon" design-system
## color palette, font size presets, and helper look-ups for rarity / element
## colors.  Ported from the JS ui-design-system.js (~80 named colors).
##
## Register as autoload named "UIConstants" in Project Settings.

# ==========================================================================
#  Background shades  (warm charcoal / soot)
# ==========================================================================
const BG_DARKEST  := Color("#0D0D0F")
const BG_DARK     := Color("#141418")
const BG_MEDIUM   := Color("#1C1C22")
const BG_LIGHT    := Color("#22222A")
const BG_LIGHTEST := Color("#2A2A30")

# ==========================================================================
#  Health
# ==========================================================================
const HP_BAR      := Color("#C0392B")
const HP_LOW      := Color("#E74C3C")
const HP_CRITICAL := Color("#FF0000")

# ==========================================================================
#  Mana
# ==========================================================================
const MP_BAR      := Color("#2980B9")
const MP_LOW      := Color("#3498DB")
const MP_EMPTY    := Color("#1A5276")

# ==========================================================================
#  Stamina
# ==========================================================================
const STAMINA_BAR   := Color("#F39C12")
const STAMINA_LOW   := Color("#E67E22")
const STAMINA_EMPTY := Color("#7D5A00")

# ==========================================================================
#  Corruption
# ==========================================================================
const CORRUPTION       := Color("#6B3A7D")
const CORRUPTION_BRIGHT := Color("#8A4F9E")
const CORRUPTION_DARK   := Color("#3A1F42")

# ==========================================================================
#  Gold / XP
# ==========================================================================
const GOLD        := Color("#DAA520")
const GOLD_BRIGHT := Color("#FFD700")
const GOLD_DARK   := Color("#8B6914")
const XP          := Color("#8FAFC4")

# ==========================================================================
#  Text  (parchment / bone)
# ==========================================================================
const TEXT_PRIMARY   := Color("#E8E0D4")
const TEXT_SECONDARY := Color("#B8A99A")
const TEXT_MUTED     := Color("#7A6E62")
const TEXT_DISABLED  := Color("#4A4440")

# ==========================================================================
#  Borders
# ==========================================================================
const BORDER        := Color("#3A3530")
const BORDER_BRIGHT := Color("#585048")
const BORDER_ACTIVE := Color("#C0392B")

# ==========================================================================
#  Frame  (ornate gold)
# ==========================================================================
const FRAME_GOLD        := Color("#B8860B")
const FRAME_GOLD_BRIGHT := Color("#DAA520")
const FRAME_GOLD_DARK   := Color("#8B6914")

# ==========================================================================
#  Rarity colors
# ==========================================================================
const RARITY_COLORS: Dictionary = {
	"common":    Color("#FFFFFF"),
	"uncommon":  Color("#1EFF00"),
	"rare":      Color("#0070DD"),
	"epic":      Color("#A335EE"),
	"legendary": Color("#FF8000"),
	"mythic":    Color("#E6CC80"),
}

# ==========================================================================
#  Element colors
# ==========================================================================
const ELEMENT_COLORS: Dictionary = {
	"fire":     Color("#FF4500"),
	"water":    Color("#1E90FF"),
	"earth":    Color("#8B4513"),
	"nature":   Color("#32CD32"),
	"shadow":   Color("#9400D3"),
	"death":    Color("#2F4F4F"),
	"physical": Color("#C0C0C0"),
	"holy":     Color("#FFD700"),
}

# ==========================================================================
#  Warning / status accent colors
# ==========================================================================
const DANGER  := Color("#FF0000")
const WARNING := Color("#FFA500")
const SUCCESS := Color("#00FF00")

# ==========================================================================
#  Font sizes  (used by ThemeBuilder and individual panels)
# ==========================================================================
const FONT_SIZES: Dictionary = {
	"tiny":     10,
	"small":    12,
	"body":     14,
	"subtitle": 16,
	"title":    20,
	"header":   24,
	"display":  32,
}


# ==========================================================================
#  Helper look-ups
# ==========================================================================

## Returns the Color associated with a rarity name, falling back to white.
static func get_rarity_color(rarity: String) -> Color:
	return RARITY_COLORS.get(rarity.to_lower(), RARITY_COLORS["common"])


## Returns the Color associated with an element name, falling back to physical.
static func get_element_color(element: String) -> Color:
	return ELEMENT_COLORS.get(element.to_lower(), ELEMENT_COLORS["physical"])
