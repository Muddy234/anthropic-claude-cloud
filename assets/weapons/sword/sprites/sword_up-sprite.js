// ============================================================================
// SWORD_UP SPRITE DEFINITION
// ============================================================================
// Auto-converted from: up.png
// Original size: 32x32, scaled to 32x32
// ============================================================================

const SWORD_UP_SPRITE = {
    name: 'sword_up',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "............CC..................",
        "............CCCC................",
        "............CCCC................",
        "............SSCCCC..............",
        "............SSCCCC..............",
        "............SSSSCC..............",
        "............SSSSCC..............",
        "............SSSSSS..............",
        "............BBSSSS..............",
        "............BBSSSS..............",
        "............BBBBSS..............",
        "............BBBBSS..............",
        "............BBBBBB..............",
        "............BBBBBB..............",
        "............oooooo..............",
        "............oooooo..............",
        "...........oHHLLMMoo............",
        "..............DD................",
        "..............DD................",
        "..............DD................",
        "..............DD................",
        "..............DD................",
        "..............DD................",
        "..............oo................",
        "................................",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#FED66C',
        'L': '#D3B362',
        'M': '#A88F57',
        'B': '#6A6B6B',
        'S': '#555656',
        'D': '#805728',
        'C': '#2D2C2B',
        'o': '#1A1714',
    }
};

// ============================================================================
// AUTO-REGISTRATION
// ============================================================================
// Register with SpriteRegistry if available (preferred method)
// Also export to window for direct access

if (typeof window !== 'undefined') {
    // Register with SpriteRegistry (auto-updates MONSTER_SPRITES)
    if (window.registerSprite) {
        window.registerSprite(SWORD_UP_SPRITE);
    } else if (window.SpriteRegistry) {
        window.SpriteRegistry.register('sword_up', SWORD_UP_SPRITE);
    }

    // Also export directly for backward compatibility
    window.SWORD_UP_SPRITE = SWORD_UP_SPRITE;

    // Add to MONSTER_SPRITES if it exists
    if (window.MONSTER_SPRITES) {
        window.MONSTER_SPRITES['sword_up'] = SWORD_UP_SPRITE;
    }
}

// Node.js module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SWORD_UP_SPRITE };
}
