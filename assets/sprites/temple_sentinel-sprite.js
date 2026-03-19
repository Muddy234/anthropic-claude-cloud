// ============================================================================
// TEMPLE_SENTINEL SPRITE DEFINITION
// ============================================================================
// Auto-converted from: temple-sentinel.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const TEMPLE_SENTINEL_SPRITE = {
    name: 'temple_sentinel',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "........H......MM...............",
        "........MM....HBE...............",
        "........Do....HEF...............",
        "........So....MDFC..............",
        "........SF...MDLFF..............",
        "........DC...MEoEFM.............",
        ".......HEF...CoEFFM.............",
        "........EF...oLFFFFMH...........",
        "........CMMCoFEFFFFoEC..........",
        "........CCooLoFEEEEDLEC.........",
        "........CFooLLEDLLEEoEF.........",
        "........CCFESLoLLDFFFFF.........",
        "........CCEFEEFoEFFooEF.........",
        "........CFoFEDooFooooEBo........",
        ".......MoFFFFoFFLEooooEEo.......",
        ".......CoFFFFEFoEoSDDSEFEM......",
        ".......HFFCFEoESoSDSSoEEEo......",
        "........CC.FFEoooSSDoEEEFE......",
        "........CMHooFoEoSoSoEEFFF......",
        "........CMMoDoEEESoEEEEFFF......",
        "........CMCEooEBFooEEEFFEC......",
        "........CM.FEooEEFEEEFFFE.......",
        "........CC.oFEooFEFFFFFEH.......",
        "........CM.EFFEEFFEEEEo.........",
        "........CC.FFFFEC.FFFF..........",
        "........CM.CoFF...CLEF..........",
        "........CM.CoFC...MoFC..........",
        "........CCooFFC...MDEC..........",
        "........HMCCCCM...MFFF..........",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#C5C3C0',
        'L': '#DBB882',
        'M': '#B2AFA1',
        'B': '#DCB148',
        'S': '#C3AE61',
        'D': '#BAA56F',
        'C': '#978C85',
        'o': '#A8946A',
        'E': '#946822',
        'F': '#784E2D',
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
        window.registerSprite(TEMPLE_SENTINEL_SPRITE);
    } else if (window.SpriteRegistry) {
        window.SpriteRegistry.register('temple_sentinel', TEMPLE_SENTINEL_SPRITE);
    }

    // Also export directly for backward compatibility
    window.TEMPLE_SENTINEL_SPRITE = TEMPLE_SENTINEL_SPRITE;

    // Add to MONSTER_SPRITES if it exists
    if (window.MONSTER_SPRITES) {
        window.MONSTER_SPRITES['temple_sentinel'] = TEMPLE_SENTINEL_SPRITE;
    }
}

// Node.js module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TEMPLE_SENTINEL_SPRITE };
}
