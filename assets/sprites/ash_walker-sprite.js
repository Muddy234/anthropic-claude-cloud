// ============================================================================
// ASH_WALKER SPRITE DEFINITION
// ============================================================================
// Auto-converted from: ash-walker.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const ASH_WALKER_SPRITE = {
    name: 'ash_walker',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        ".............HHH................",
        "............HMBMHH..............",
        "............HSBSSH..............",
        "...........HHDSSSCH.............",
        "...........HMXXoXXH.............",
        "..........HMDoCooCSHH...........",
        "..........HDCoCDooCSBH..........",
        "..........HSooooooooDH..........",
        "..........HDooooooooDH..........",
        ".........HLDCHoooooDCSH.........",
        ".........HSSH.HoooHHBSH.........",
        ".........HSHH.HDCCH.HDH.........",
        "........HHSH..HDSDH.HHDH........",
        "........HLSH..HoCoH..HDBH.......",
        "........HLDH..HCDDH..HDDH.......",
        ".........HHH.HDCDoD...HHH.......",
        "............HSooDoDH............",
        "...........HSDDSDDDBH...........",
        "...........HDCHSDLDSH...........",
        "...........HooHHHHHooH..........",
        "...........HDoH...HDoH..........",
        ".........HHHBoH...HMCBH.........",
        ".........HMSSCH...HMSDH........",
        ".........HHHHHH...HHHHH........",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#C0BFBF',
        'L': '#AEACAA',
        'X': '#FFDD44',
        'M': '#A19A8E',
        'B': '#8E8982',
        'S': '#756C62',
        'D': '#5B544E',
        'C': '#4C433C',
        'o': '#3B322C',
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.ASH_WALKER_SPRITE = ASH_WALKER_SPRITE;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ASH_WALKER_SPRITE };
}

console.log('[ash_walker] Loaded sprite definition');
