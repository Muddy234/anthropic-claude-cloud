// ============================================================================
// GIANT_SPIDER SPRITE DEFINITION
// ============================================================================
// Auto-converted from: giant-spider.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const GIANT_SPIDER_SPRITE = {
    name: 'giant_spider',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        ".................SS.............",
        "................SoL.............",
        "...............HDS..............",
        "...........SB..SC...L...........",
        "..........SoDL.CCLMMMMBDH.......",
        ".........HoSDBLCoMEEEMMMDH......",
        ".........MS.CDMoEEEMMBBBBC......",
        ".....HBCLH..CDSCBMMBBBBBDCM.....",
        "....MCCoBL..SDoCDBBBBBDDCCC.....",
        "...SDCHLCDL.HCooCDBBDDDCCoo.....",
        "...oSLCDSoDLSDBooCCCCCCCooC.....",
        "..LoHBoCDooDMMMBCooCCooCDCDCS...",
        "..LDSoSLoCDMBBBBDooooDDCoSLCoL..",
        "...SDC..LoDBMBDDCooCoCoCoL..CD..",
        "...DCH..DCoCDCCoooCoDBDCoD...o..",
        "...CC..LMoooooooooDoDSLHLoS..L..",
        "...CS..LL.SoooBoooCM.....LCL....",
        "...oM...L.MBSCCS.SoS......oS....",
        "...oL....SMHLDS...oS......SS....",
        "...SL.......SDL...CS......LD....",
        "............oC....oL......HS....",
        "...........HCS...LCL............",
        "...........SoH...Lo.............",
        "...........oS....SD.............",
        "..........Lo.....S..............",
        "..........LH....................",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#C1C1C1',
        'L': '#B2B1B1',
        'M': '#BD8D76',
        'B': '#9B705F',
        'S': '#7C706E',
        'D': '#836153',
        'C': '#623E3A',
        'o': '#4C2E2D',
        'E': '#FF4444',
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.GIANT_SPIDER_SPRITE = GIANT_SPIDER_SPRITE;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { GIANT_SPIDER_SPRITE };
}

console.log('[giant_spider] Loaded sprite definition');
