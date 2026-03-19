// ============================================================================
// SHIELD_BEARER SPRITE DEFINITION
// ============================================================================
// Auto-converted from: shield-bearer.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const SHIELD_BEARER_SPRITE = {
    name: 'shield_bearer',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "...........................M....",
        ".........................HHB....",
        ".........................LHSL...",
        "...............H.........LMS....",
        ".............LMMSH......MLDL....",
        "............L.HMBD......BMD.....",
        "............BLMSDCH....HMSM.....",
        "............SMLSDCB....BBD......",
        ".........LL.DSSCDCMHMH.DDB......",
        "........LLSCCBBCCCCCLLBDCH......",
        ".......L.MDCCMLMDDCCSLLCD.......",
        ".......SBSMLLLLLSDDDDDBCL.......",
        ".......CCLH...HLBBBBDDCCBL......",
        ".......SCL....LMBBBBBDCBDDH.....",
        ".......HCL..HLLMBBSBSDC..L......",
        ".......LDBH.HHLLBMBBSCDH........",
        ".......HCBL.HLHLMBSSDCC.........",
        "........HMLHHHLLMSSSDDH.........",
        ".........LLHHLMMBBSSDM..........",
        ".........SMLHMMMDSSDCB..........",
        "........HMSLHLMMDDSDCBH.........",
        "........CDCMLLMBDSDCCDC.........",
        ".......LHBCDMLLBSDCCCBHL........",
        ".......HCCCCMMLMSDCCCCCH........",
        "........SDCMHBMBDCHBCDS.........",
        "........BBCD.LMBCL.DCBB.........",
        ".......LDDCH..LDL..HCDDH........",
        ".......BSCC.........CCSM........",
        "......MBDCD.........DCDMM.......",
        ".......HH.............HH........",
        "................................",
    ],
    palette: {
        'H': '#C0C0C0',
        'L': '#9D9D9D',
        'M': '#7E7E7E',
        'B': '#686868',
        'S': '#585858',
        'D': '#484747',
        'C': '#313030',
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
        window.registerSprite(SHIELD_BEARER_SPRITE);
    } else if (window.SpriteRegistry) {
        window.SpriteRegistry.register('shield_bearer', SHIELD_BEARER_SPRITE);
    }

    // Also export directly for backward compatibility
    window.SHIELD_BEARER_SPRITE = SHIELD_BEARER_SPRITE;

    // Add to MONSTER_SPRITES if it exists
    if (window.MONSTER_SPRITES) {
        window.MONSTER_SPRITES['shield_bearer'] = SHIELD_BEARER_SPRITE;
    }
}

// Node.js module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SHIELD_BEARER_SPRITE };
}
