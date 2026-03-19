// ============================================================================
// PYRO_CULTIST SPRITE DEFINITION
// ============================================================================
// Auto-converted from: pyro-cultist.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const PYRO_CULTIST_SPRITE = {
    name: 'pyro_cultist',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        ".....H..................H.......",
        ".....HHH...............HH.......",
        ".....HHH...............HHHH.....",
        "....HHHHH.............HHHHH.....",
        "....HHHHH..HHHHHHH....HHHHH.....",
        "....HHHHH..HLHHHHHH...HHHHH.....",
        "....HHHHH...LHHHBBH...HHHLH.....",
        "....HHHH....LHHHMHLH...HHLH.....",
        ".....HLH...HHHLHLHMH...HLH......",
        ".....HMHH..LLHBBBBBH..HHMH......",
        ".....MBHHHHHLLLBBBMLHHHHBH......",
        ".....BBHHHHHHMLLBMMLHHHLBM......",
        ".....BBLLLLLHHLLLMLLLLLLBM......",
        ".....BMLLLLLLHHLLLHMLLLMBM......",
        ".....HMMMMMMLHHHHHLMMMMMMH......",
        "........HHHMLLHHHHLHHHH.........",
        "...........MLLLHHLL.............",
        "...........MLLLLLLL.............",
        "...........MLHLLLLLH............",
        "...........MLHHHHHHH............",
        "..........HLHHHHHHHHH...........",
        "..........HLHHHHHHHHHH..........",
        "..........HLHHHHHHHHHHH.........",
        "..........HHHHHHHHLLHHH.........",
        ".........HLLHHHHLLLLLLL.........",
        ".........LLLLLLLLLLLLLL.........",
        "........HLLLLLLLLLLLLLL.........",
        ".......HLLLLLLLLLLLLLMLH........",
        ".......HMLMLLMLLLHHHLLLH........",
        ".......HHHH........HHHHH........",
        "................................",
    ],
    palette: {
        'H': '#5B1F1C',
        'L': '#381211',
        'M': '#1C0808',
        'B': '#050101',
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
        window.registerSprite(PYRO_CULTIST_SPRITE);
    } else if (window.SpriteRegistry) {
        window.SpriteRegistry.register('pyro_cultist', PYRO_CULTIST_SPRITE);
    }

    // Also export directly for backward compatibility
    window.PYRO_CULTIST_SPRITE = PYRO_CULTIST_SPRITE;

    // Add to MONSTER_SPRITES if it exists
    if (window.MONSTER_SPRITES) {
        window.MONSTER_SPRITES['pyro_cultist'] = PYRO_CULTIST_SPRITE;
    }
}

// Node.js module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PYRO_CULTIST_SPRITE };
}
