// ============================================================================
// MAGMA_SLIME SPRITE DEFINITION
// ============================================================================
// Auto-converted from: magma-slime.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const MAGMA_SLIME_SPRITE = {
    name: 'magma_slime',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "............MCooooCM............",
        "..........MoDHHHHHLDoM..........",
        "........HoDHHHHHHHHHHDCH........",
        ".......HoLHE.HHHHHHEHLMCH.......",
        "......HCML.HHHHHHHHHLLLMCH......",
        "......CBLLLLLHHHHHLLLLLMBC......",
        ".....HCMMLLLLLLLLLLLLLMMMCH.....",
        ".....CBMMMMMMLLLLLLMMMMMMSC.....",
        ".....oBMMMMBDBMMMMDDMMMMBBo.....",
        "....MoBBBMMCLCMMMDBBDMBBBBoM....",
        "....CCBBBBBCMCMMMDBBDBBLMBCC....",
        "....CCSMMBBSDSBBBBDDBBMMMSCC....",
        "....MoSMMBBBBBBBBBBBBBBBBSoC....",
        "....HCDSSSBBBBBBBBBBBBSSSDCC....",
        ".....oCDSSSBBBBBBBBBSSSSCCo.....",
        ".....CDCCDSSSSSSSSSSSDDCCDC.....",
        ".....CSSSDCCDDDDDDDCCCDSSSC.....",
        ".....MDDCoDCDCCDCCDDDSooSSC.....",
        "......CC.CSSoCCDDDoCoCHHCSC.....",
        ".........CSSC..CBSC.....oDM.....",
        ".........DSSD..CBSM.....HC......",
        ".........HooH..CBSC.............",
        "..........HH...oSDC.............",
        "...............HoC..............",
        "................................",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#FCE9AE',
        'L': '#FDDF81',
        'M': '#FEC756',
        'B': '#FC8B2A',
        'S': '#D5402B',
        'D': '#B83B2E',
        'C': '#9A3632',
        'o': '#551918',
        'E': '#FFFF44',
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MAGMA_SLIME_SPRITE = MAGMA_SLIME_SPRITE;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MAGMA_SLIME_SPRITE };
}

console.log('[magma_slime] Loaded sprite definition');
