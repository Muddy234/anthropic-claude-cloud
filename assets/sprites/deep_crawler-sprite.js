// ============================================================================
// DEEP_CRAWLER SPRITE DEFINITION
// ============================================================================
// Auto-converted from: deep-crawler.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const DEEP_CRAWLER_SPRITE = {
    name: 'deep_crawler',
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
        "................HLLLL...........",
        "..............ESDEMMMLEM........",
        ".......HLLLHoSBBLCSMLDSDH.......",
        ".....LBSCBBCDBCBBBBCDSDLS.......",
        "....SBLBBoCooCSBBBBCCMSoBL.L....",
        "...BBCSBBoCooooSSCCBBoCoCoCo....",
        "..HBBCoooCSSooooooSBSoooooSS....",
        "..LBoSoCCHCooCooooDDCDoooSCCL...",
        "..HS.SCC.CooSooCooooooooooLCSH..",
        "...HLCo.HCLL..LooooSSoooSS..CS..",
        "....HH..LC......SoSBBCoCoCB.HS..",
        "........HS.....HBBSCoCoL.MoHHH..",
        ".........H.....CLBBBoCCCL.SC....",
        ".............HBCoBBBCS.oS..o....",
        ".............SCooCBCC..SB..o....",
        ".............CLSCCoCL..LC..L....",
        ".............LCCBooL....o.......",
        "............HCCCoSH.....S.......",
        "..............HH................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#B8BABA',
        'L': '#A3A5A3',
        'M': '#9B896F',
        'B': '#5D9890',
        'S': '#737875',
        'D': '#867258',
        'C': '#34535A',
        'o': '#304449',
        'E': '#FFAA00',
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.DEEP_CRAWLER_SPRITE = DEEP_CRAWLER_SPRITE;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DEEP_CRAWLER_SPRITE };
}

console.log('[deep_crawler] Loaded sprite definition');
