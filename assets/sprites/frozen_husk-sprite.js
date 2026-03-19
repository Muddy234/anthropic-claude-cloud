// ============================================================================
// FROZEN_HUSK SPRITE DEFINITION
// ============================================================================
// Auto-converted from: frozen-husk.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const FROZEN_HUSK_SPRITE = {
    name: 'frozen_husk',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "..............MDS...............",
        "...MDCS..MM..SBHHD..............",
        "...DoCDD.MBL.DEBBES.............",
        "...CDSDD.SBD.DSDDDDMS...........",
        "...SDSD.DDBSMDDDCDCBS...........",
        "....DDD.SDDSSBDoDoSDSM..........",
        "....SDDLDSBMSDDCCDSDDDDSSSSDDM..",
        "....SCBDBBCDDDCCCDDBBSBBBBBCoC..",
        ".....CDDCooCSSDDSCCCCCCCCDDCDS..",
        ".....DoCoSDDDDDDSSDS.DCDCCS.CM..",
        ".....DD.o.CSDDCSD....DD.MLS.....",
        "........L.DDCCCDS...............",
        ".......MDSDBCCCSDSS.............",
        "........MDDSSSSBCD..............",
        "........SBDSDDDSDSS.............",
        ".......DDDDBDCoSBCS.............",
        ".......L.SSHCDCDBSM.............",
        ".........SBBC.LCDBD.............",
        ".........DHSD...CSSM............",
        ".........DSCM...CDD.............",
        "........SSCD...MCSS.............",
        "........DSoL...SDDL.............",
        ".......LDDD....DDBS.............",
        ".......DBBS....DoCDC............",
        ".......SDDD.....................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#D6F6FA',
        'L': '#E4E5E9',
        'M': '#C5CBD3',
        'B': '#B3D1DD',
        'S': '#B0B5C1',
        'D': '#8F9AAB',
        'C': '#627185',
        'o': '#475870',
        'E': '#44AAFF',
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.FROZEN_HUSK_SPRITE = FROZEN_HUSK_SPRITE;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FROZEN_HUSK_SPRITE };
}

console.log('[frozen_husk] Loaded sprite definition');
