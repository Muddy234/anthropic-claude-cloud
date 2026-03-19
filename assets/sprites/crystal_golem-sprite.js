// ============================================================================
// CRYSTAL_GOLEM SPRITE DEFINITION
// ============================================================================
// Auto-converted from: crystal-golem.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const CRYSTAL_GOLEM_SPRITE = {
    name: 'crystal_golem',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "..............LSo...............",
        ".............LFHCo..............",
        "........SL...oMCCBS.............",
        "........oD.L.oMCBES.L.LS........",
        "........MLLoLDBCCBS.oSSoL.......",
        ".........L.L.DFCEFS.LLLL........",
        "........SDooDCFFFFCoooDL........",
        ".......LSMCFBBEooDBCFCHDL.......",
        ".......SBBCEMMMMMMMMFCSBS.......",
        ".......SMoEFCMMHHMMCFECMS.......",
        ".......SBCCFEMM..HMEFCBBS.......",
        "......LFFEFFEBMH.MBCFFEFoL......",
        "......SDEFS.FCBMMBEFLSFFDS......",
        "......oBMES.SEEBBoES.SCBMo......",
        "......EBBES.LFEDDEFL.SEBBo......",
        "......FEEF..DEFBBFEo.LFEEE......",
        "......FoEo.LSMEFFFMML.EoEF......",
        "......DBFF.LMMEFDEBMS.FFCS......",
        "......LFFS.oSBEDDEBSo.DEFL......",
        ".......LL.LEMFFLLFFMDS.ML.......",
        "..........LFCEBSLCoCFS..........",
        "..........LFCCCSLECCFS..........",
        "..........LFEFE..EEEFS..........",
        "..........oMBFF..DFBMoL.........",
        "..........SoFo....DFooL.........",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#F8EDF7',
        'L': '#D9D5DB',
        'M': '#E2BEE2',
        'B': '#CA76C8',
        'S': '#B09AB7',
        'D': '#A986AE',
        'C': '#B568BA',
        'o': '#94669E',
        'E': '#934A9D',
        'F': '#794785',
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
        window.registerSprite(CRYSTAL_GOLEM_SPRITE);
    } else if (window.SpriteRegistry) {
        window.SpriteRegistry.register('crystal_golem', CRYSTAL_GOLEM_SPRITE);
    }

    // Also export directly for backward compatibility
    window.CRYSTAL_GOLEM_SPRITE = CRYSTAL_GOLEM_SPRITE;

    // Add to MONSTER_SPRITES if it exists
    if (window.MONSTER_SPRITES) {
        window.MONSTER_SPRITES['crystal_golem'] = CRYSTAL_GOLEM_SPRITE;
    }
}

// Node.js module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CRYSTAL_GOLEM_SPRITE };
}
