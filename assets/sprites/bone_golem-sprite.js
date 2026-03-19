// ============================================================================
// BONE_GOLEM SPRITE DEFINITION
// ============================================================================
// Auto-converted from: bone-golem.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const BONE_GOLEM_SPRITE = {
    name: 'bone_golem',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "..............LMH...............",
        "............MSSDCCSL............",
        "...........DDSSCBBSSDSLHL.......",
        "........HMSDBSCCCSSSCSDHHD......",
        ".......LBDCLHLDoooBCBCSSCC......",
        ".......BDooDCSDCoooDoDCDBBM.....",
        "......LSSSoDSDoSSCSBoDBoCoDM....",
        "......MDDDBCDDCDSDSCoooDBCSS....",
        "......MCoDDDBSSLBBSBoooSDSDSSL..",
        "......DSDoSBBBBBLLSDCCoSBBDCoDL.",
        ".....MSDDoSSBBHBBBBSooS.SCoSSDM.",
        "....MSoBoCDSBBBBBSBSooH..CCSSBB.",
        "....SDBooL.DDSBSSDCCCD...MBSCBD.",
        "...MBSCBo..LDCCDDDDDo....SSSCDS.",
        "...SSSDCS...MCSSSSoCCL...LDBSCM.",
        "..MCSCoS....DCSBDBCCoS...SBSBCL.",
        "..BBDLM....MDoCSDCoCBC..SDCCCCB.",
        "..CSoDD...SDBCoDCoCSSCSMSCCDBD..",
        ".LCBCCM..LSSDDooCoDBCDCMDSDCCB..",
        "..CSCoH..SDDDDDHLHDSDDoSSSLoCo..",
        "..HCDH..MHHDCM....SDSHDMBSDBCD..",
        "........MSCCoH.....oBBCoMSCoCM..",
        ".........SDoCS.....SCDDCH...H...",
        ".........DooCM.....MCCoC........",
        ".........DCCCC......SooCM.......",
        ".......BCDBDoo......DCDoo.......",
        "......HDDDDCoD......DDDCDS......",
        "...................MSDDDSB......",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#C4C2BE',
        'L': '#B5B1A9',
        'M': '#A5A098',
        'B': '#AC9879',
        'S': '#99876D',
        'D': '#84745E',
        'C': '#6B5A47',
        'o': '#5A4735',
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
        window.registerSprite(BONE_GOLEM_SPRITE);
    } else if (window.SpriteRegistry) {
        window.SpriteRegistry.register('bone_golem', BONE_GOLEM_SPRITE);
    }

    // Also export directly for backward compatibility
    window.BONE_GOLEM_SPRITE = BONE_GOLEM_SPRITE;

    // Add to MONSTER_SPRITES if it exists
    if (window.MONSTER_SPRITES) {
        window.MONSTER_SPRITES['bone_golem'] = BONE_GOLEM_SPRITE;
    }
}

// Node.js module export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BONE_GOLEM_SPRITE };
}
