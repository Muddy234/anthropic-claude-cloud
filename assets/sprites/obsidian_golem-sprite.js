// ============================================================================
// OBSIDIAN_GOLEM SPRITE DEFINITION
// ============================================================================
// Auto-converted from: obsidian-golem.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const OBSIDIAN_GOLEM_SPRITE = {
    name: 'obsidian_golem',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "..............BMMLB.............",
        ".............BDDMSMB............",
        ".............CoCEDEo............",
        "............BDoDMDSB............",
        "........HLBBLMoDSMDCHH..........",
        ".......HBLLSDDooDSoDDMLH........",
        ".......BHHLMDLSooooSSDHB........",
        ".......oHHMDDHHLMDLHLoHB........",
        ".......oSSooDHHLLMLHSoDo........",
        ".......oooDooDSSSoSBoooo........",
        ".......DDSDoooDooDooooLB........",
        "......HMLDoBoooDSSSoEooDH.......",
        "......HSLLo.oDoSSMSoEoMLH.......",
        "......HoSMoBoDSDDDoDEoMMH.......",
        "......HoSLBBooDLLLMoBoDDH.......",
        ".......oSSooMLDoMMoDBoSLH.......",
        ".......oooEoLSSooooMDooSH.......",
        "........BBBoMLoCCoDSMBoo........",
        "..........CSDSoHHoooSB..........",
        "..........oDDoo..ooDoB..........",
        "..........ooDDC..oooDB..........",
        "..........ooSMo..ooDSSH.........",
        "..........BBBBB..BBBBBH.........",
        "................................",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#AEABA7',
        'L': '#BFA589',
        'M': '#AA8B73',
        'B': '#8A7F78',
        'S': '#9F7A62',
        'D': '#856554',
        'C': '#74635C',
        'o': '#6F5248',
        'E': '#48615D',
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
        window.registerSprite(OBSIDIAN_GOLEM_SPRITE);
    } else if (window.SpriteRegistry) {
        window.SpriteRegistry.register('obsidian_golem', OBSIDIAN_GOLEM_SPRITE);
    }

    // Also export directly for backward compatibility
    window.OBSIDIAN_GOLEM_SPRITE = OBSIDIAN_GOLEM_SPRITE;

    // Add to MONSTER_SPRITES if it exists
    if (window.MONSTER_SPRITES) {
        window.MONSTER_SPRITES['obsidian_golem'] = OBSIDIAN_GOLEM_SPRITE;
    }
}

// Node.js module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { OBSIDIAN_GOLEM_SPRITE };
}
