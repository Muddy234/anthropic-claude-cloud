// ============================================================================
// FROST_SLIME SPRITE DEFINITION
// ============================================================================
// Auto-converted from: frost-slime.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const FROST_SLIME_SPRITE = {
    name: 'frost_slime',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "......................L.........",
        ".....................BD.........",
        "....................BBB.........",
        ".........BB.........BHD.........",
        ".........BBL.......BBMD.........",
        ".........SHB.......BMSD.........",
        ".........DSMDDDBDDCDMDD.BB......",
        ".......LBDDCB...HMMBoCDBHB......",
        ".......BBCoML...HMMMMCDMSB......",
        ".......LDoMMMHHHHMMHHMCSCL......",
        "........oDMEMMMMMEHHMSDoC.......",
        "........oSMMMMMMMMMMSDSoL.......",
        "........CSDDMMMMDSSSDDDCB.......",
        ".......BDSDDSSSDSDSSSSDDC.......",
        ".......CDDDSSSSSDDSSDDCCC.......",
        ".......CDCCCDDDDDDDCCCCCC.......",
        "......BoDCooCCCCCCCCooCSoB......",
        ".....CBSCCCoCoooooCCoCCCDMCB....",
        "....LoMSDDCooCCoooCCoCCDSMSC....",
        ".....LCoooDSSSDDDDSSSDoooCB.....",
        "..........BoDSHMMMSDoC..........",
        "............BBCCCCDB............",
        "................................",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#D2FAFC',
        'L': '#E6E9EC',
        'M': '#A7F3FA',
        'B': '#BEC8D5',
        'S': '#6FC8F4',
        'D': '#55A4DF',
        'C': '#3F81C6',
        'o': '#295CA7',
        'E': '#AAEEFF',
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.FROST_SLIME_SPRITE = FROST_SLIME_SPRITE;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FROST_SLIME_SPRITE };
}

console.log('[frost_slime] Loaded sprite definition');
