// ============================================================================
// SHADOW_STALKER SPRITE DEFINITION
// ============================================================================
// Auto-converted from: shadow-stalker.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const SHADOW_STALKER_SPRITE = {
    name: 'shadow_stalker',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................LLMH.H..........",
        "..............LLL.LSHM..........",
        "..............HBBSDCSSHL........",
        "....L.......LHM.MooooCDML.......",
        "...HL..HHHBML.LDoooooooCML......",
        "...HC..HMSDCCCoooooooooooS.C....",
        "..MLLHHLSoooooooooooEEoooooEL...",
        "..LCL.LDooooEEooEEooEEEooooo....",
        ".LHooDCoooooEEEEEoooEEoooooC....",
        "...CoEoDoooEEEEEEoooEoooCooC....",
        "..LL.B.CoooCoEEEoooEEoooCooC....",
        "..BDHDCoooo.oEEooooEooEEoooCHH..",
        "...HLooCoCCEEEoDoooC.MEEEoEB....",
        "....SoM...MEB..LBCooD..DoEECMB..",
        "....Co....HoCM.H.HBooD...MoEooB.",
        "....ooD....BEED..HMMooooM..MBBH.",
        "....SSBH.............CCCB.......",
        "......................H.........",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#EBE5EE',
        'L': '#DDCFE5',
        'M': '#CAADDA',
        'B': '#BD97D2',
        'S': '#AC7DC7',
        'D': '#9C6DB6',
        'C': '#8D5AAA',
        'o': '#361F4B',
        'E': '#19082A',
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
        window.registerSprite(SHADOW_STALKER_SPRITE);
    } else if (window.SpriteRegistry) {
        window.SpriteRegistry.register('shadow_stalker', SHADOW_STALKER_SPRITE);
    }

    // Also export directly for backward compatibility
    window.SHADOW_STALKER_SPRITE = SHADOW_STALKER_SPRITE;

    // Add to MONSTER_SPRITES if it exists
    if (window.MONSTER_SPRITES) {
        window.MONSTER_SPRITES['shadow_stalker'] = SHADOW_STALKER_SPRITE;
    }
}

// Node.js module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SHADOW_STALKER_SPRITE };
}
