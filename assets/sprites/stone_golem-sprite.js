// ============================================================================
// STONE_GOLEM SPRITE DEFINITION
// ============================================================================
// Auto-converted from: stone-golem.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const STONE_GOLEM_SPRITE = {
    name: 'stone_golem',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "............LDDoCB..............",
        "....LHHH..CoMMMEFoEEBHHLLLoC....",
        "...LHHHHDEHESooEFFSEEHHMHMEEB...",
        "...LMMMMMDHESSoEFEDooMMMMMEEB...",
        "...LMSMMoMMEoSEFFEMSoMMMSMEEB...",
        "...LoSSSoMSDEFFEoSSSoMSSSSEEB...",
        "....ooooEMMMMooMMSSSooooooEFH...",
        "....oSSoFMSMMSSSMMoSEEoSSoFF....",
        "....CFEFFoMSMMMMMMSoFFFFFFFo....",
        ".....SMoFFoSSMMSMSoEFFoSSoFB....",
        "....LDMoFFooSSSSoooEFFoMSEFE....",
        "....MMEEFCESoSoSoSoFFHLEEoEF....",
        "...LMMMEF.CEoSSSoFEFE.HMMoEF....",
        "...LMMSEF.oooSooEooFF.HMMSEF....",
        "...LoSoEo.oSSooooSSEF.HSMSEF....",
        "...BEEEFH.oEoMSSSoEEFCHooEFE....",
        "...LoSME.oMMEESoEEMSEFCSSoFo....",
        "....ooEECSMSoFEEFEMSSEFooEFH....",
        "....EEEECSooEFLHHFSoSoFEEFF.....",
        ".....BB.oSooFo...BEoooECoEH.....",
        "........FFEEF.....ooFFFC........",
        "........FEEFF.....oEEEEo........",
        ".......BEEEFF.....LEEEEo........",
        "......BEEEFFF.....CFEEEE........",
        ".......HHHHH......HBBBBB........",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#B8B6B3',
        'L': '#A59D92',
        'M': '#BE9367',
        'B': '#948B84',
        'S': '#B3875D',
        'D': '#9D886C',
        'C': '#877C72',
        'o': '#826952',
        'E': '#684533',
        'F': '#4E3229',
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
        window.registerSprite(STONE_GOLEM_SPRITE);
    } else if (window.SpriteRegistry) {
        window.SpriteRegistry.register('stone_golem', STONE_GOLEM_SPRITE);
    }

    // Also export directly for backward compatibility
    window.STONE_GOLEM_SPRITE = STONE_GOLEM_SPRITE;

    // Add to MONSTER_SPRITES if it exists
    if (window.MONSTER_SPRITES) {
        window.MONSTER_SPRITES['stone_golem'] = STONE_GOLEM_SPRITE;
    }
}

// Node.js module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { STONE_GOLEM_SPRITE };
}
