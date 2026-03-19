// ============================================================================
// VOID_TOUCHED SPRITE DEFINITION
// ============================================================================
// Auto-converted from: void-touched.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const VOID_TOUCHED_SPRITE = {
    name: 'void_touched',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "..............HH................",
        "..............LSECMH............",
        "..............MoEFB.............",
        "..............DFFFC.............",
        "..............MFFFC.............",
        "...........LHHLEFFB.............",
        "...........HLMDFFBL.............",
        "...........HoFFFFEL.............",
        "..........HMEFFFFESH............",
        "..........LSFFEFFED.............",
        "..........LoDEFFFFC.............",
        "..........LFMSEFFDFML...........",
        "..........SFHMoFFSFDH...........",
        "..........SFHMFFFESFH...........",
        "..........SC.SFFFF.DMH..........",
        ".........HSD.SFFFFMLEL..........",
        ".........HSBHSEFCFSMFM..........",
        "..........SSHMoCBFDMCS..........",
        "..........EF.LoC.FSLCS..........",
        ".........HFF.HEDHCEH............",
        "..........FS..ES.FE.............",
        "..........HHHMFBMFM.............",
        "............HMFHSDH.............",
        ".............MF.FSH.............",
        ".............MC.SC..............",
        ".............BF..SH.............",
        ".............MCM................",
        ".............MBBBBH.............",
        "............MDCCEES.............",
        "................................",
    ],
    palette: {
        'H': '#F1D4EF',
        'L': '#F0B7EB',
        'M': '#C49BC2',
        'B': '#B4A1AA',
        'S': '#A367A5',
        'D': '#894F8E',
        'C': '#783A7F',
        'o': '#7E2186',
        'E': '#671E72',
        'F': '#47195A',
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
        window.registerSprite(VOID_TOUCHED_SPRITE);
    } else if (window.SpriteRegistry) {
        window.SpriteRegistry.register('void_touched', VOID_TOUCHED_SPRITE);
    }

    // Also export directly for backward compatibility
    window.VOID_TOUCHED_SPRITE = VOID_TOUCHED_SPRITE;

    // Add to MONSTER_SPRITES if it exists
    if (window.MONSTER_SPRITES) {
        window.MONSTER_SPRITES['void_touched'] = VOID_TOUCHED_SPRITE;
    }
}

// Node.js module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { VOID_TOUCHED_SPRITE };
}
