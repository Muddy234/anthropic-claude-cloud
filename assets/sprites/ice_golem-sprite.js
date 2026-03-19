// ============================================================================
// ICE_GOLEM SPRITE DEFINITION
// ============================================================================
// Auto-converted from: ice-golem.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const ICE_GOLEM_SPRITE = {
    name: 'ice_golem',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        "..............SEEEE.............",
        ".............SCHLMDC............",
        ".............EDMLDDF............",
        "........BB...EooMoFF...S........",
        "........CFB..EFFoFFF..SF........",
        ".....E..CMF..FoFDoFF.BoC..BE....",
        ".....FSFSooF.CFFDDoF.FoFSEDF....",
        ".....SFoFFFFFFFFFFFFFFFFFoF.....",
        "......FFLHDFDFFFFFFFDFMHCFS.....",
        ".......FMMFFMLMoFoMLMFoMMF......",
        "......CDooFFMMMMoLMMMFFooF......",
        ".......FFFFFDMMoDoMMDFFFFS......",
        ".......EoFFFFooDHDooFFFFDE......",
        ".......EDFFFFFFoDoFFFFFFMC......",
        "......CFFFFEFFFFoFFFFSFFFF......",
        "......ELFF..FFFoooFFF.FFDC......",
        "......ELDF..EDFFoFFF..EFME......",
        "......ELDF..SFFFoFFF..FFME......",
        "......ELDF..EFFFDFFFS.FFME......",
        "......EMFFESCoFFFFFDE.FFFE......",
        "......EFFFFEHoFF.FFDLEFFFF......",
        ".......FFE.FoFFE.FFFoESFFF......",
        ".......CFE.FFFF..EFFFE.FF.......",
        "........SS.FFFF..CFFFE.C........",
        "...........FFFF..CFFFF..........",
        "..........CMDFF..EFFMCS.........",
        ".........EFFFFE...FFFFFS........",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#F0FBFC',
        'L': '#CDEDF5',
        'M': '#B6E1EE',
        'B': '#D2D4D9',
        'S': '#C2C4C7',
        'D': '#98CAE0',
        'C': '#A1B4BE',
        'o': '#79B2D2',
        'E': '#999EA6',
        'F': '#7E9BAB',
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
        window.registerSprite(ICE_GOLEM_SPRITE);
    } else if (window.SpriteRegistry) {
        window.SpriteRegistry.register('ice_golem', ICE_GOLEM_SPRITE);
    }

    // Also export directly for backward compatibility
    window.ICE_GOLEM_SPRITE = ICE_GOLEM_SPRITE;

    // Add to MONSTER_SPRITES if it exists
    if (window.MONSTER_SPRITES) {
        window.MONSTER_SPRITES['ice_golem'] = ICE_GOLEM_SPRITE;
    }
}

// Node.js module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ICE_GOLEM_SPRITE };
}
