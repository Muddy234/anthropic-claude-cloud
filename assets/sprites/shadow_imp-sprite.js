// ============================================================================
// SHADOW_IMP SPRITE DEFINITION
// ============================================================================
// Auto-converted from: shadow-imp.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const SHADOW_IMP_SPRITE = {
    name: 'shadow_imp',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "..........S......MH.............",
        ".........LS......BM.............",
        ".........DSH.HHHSBM....H........",
        ".........DSCSBSDDSL...HS........",
        ".......HHMCSSSSSCCL.L.SSH.......",
        ".......LDSSSSSSSDDCLDHLSH.......",
        ".......LCCSBSSBDDSDDC.HM........",
        "........DCLSSSSMDSDCM..D........",
        "...HCCCLMCHSSSMHSSCDLHLCCCM.....",
        ".....SCCCDDDSSDDSSDLSDCCDH......",
        ".....HDCCCDDDDDSSD.LCCCDL.......",
        ".....LMSCCCCCCCCCCCCCCSDL.......",
        "........CMMCCCCDSCCMMC.DL.......",
        "..........HCDSSSDSM..HLC........",
        ".........HSCSSSSCSS..HSS........",
        ".........SDDSSSSCDSCCCDH........",
        ".........DCMCDDSDCCCCM..........",
        ".........HHLSCSBDMDH............",
        "............DCLCCH..............",
        ".............SHLC...............",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#C5C0C6',
        'L': '#9982A1',
        'M': '#826F8B',
        'B': '#825292',
        'S': '#6A457B',
        'D': '#543264',
        'C': '#442753',
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
        window.registerSprite(SHADOW_IMP_SPRITE);
    } else if (window.SpriteRegistry) {
        window.SpriteRegistry.register('shadow_imp', SHADOW_IMP_SPRITE);
    }

    // Also export directly for backward compatibility
    window.SHADOW_IMP_SPRITE = SHADOW_IMP_SPRITE;

    // Add to MONSTER_SPRITES if it exists
    if (window.MONSTER_SPRITES) {
        window.MONSTER_SPRITES['shadow_imp'] = SHADOW_IMP_SPRITE;
    }
}

// Node.js module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SHADOW_IMP_SPRITE };
}
