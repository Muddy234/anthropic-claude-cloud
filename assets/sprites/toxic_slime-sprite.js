// ============================================================================
// TOXIC_SLIME SPRITE DEFINITION
// ============================================================================
// Auto-converted from: toxic-slime.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const TOXIC_SLIME_SPRITE = {
    name: 'toxic_slime',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        ".............HHHHH..............",
        "...........HLMMMMMMH............",
        "..........HMHHHHHHLMH...........",
        ".........HLHHHHHHHHHLH..........",
        "........HMHEHHHHHHEHMH.........",
        "........LLHHHHHHHHHHHLH.........",
        "........MHHHHHHHHHHHLLM.........",
        "........MHHHHHHHHHHHHHM.........",
        ".......HMLHHHHHHHHHHHLMH........",
        "......HMHLHHHMMHHHMMHLMHH.......",
        "......HLHHLHLMMHHHMMHHHMH.......",
        "......HLHLLLLLLHHHLLLHHHM.......",
        "......HMLLLLLLLLLLLLLLHLBH......",
        "......HMMLLLLLLLLLLLLLLMBH......",
        "......LMHLLLLLLLLLLMMMMMBH......",
        ".....HBMHLMLMMLLLLMBMMMMMB......",
        ".....HBBMMMMBBMMMMMBBBBMBBH.....",
        ".....BBBBMBBMMMMMMBBBMBBBBH.....",
        ".....BBBBBBBBBBBBBBBBBBBBBH.....",
        ".....HBBBBBBBBBBBBBBBBBBBBH.....",
        "......BBBBBBBBBBBBBBBBBBBBH.....",
        "......HBBMBBBBBBBBBBBBBBBB......",
        ".......BB.MBMBBHBBBBHBB.H.......",
        "..........HBHBB.MBBL.BB.........",
        ".............BB......MH.........",
        ".............HM.................",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#D7F942',
        'L': '#B6D128',
        'M': '#8CA323',
        'B': '#5F8A22',
        'E': '#CCFF44',
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TOXIC_SLIME_SPRITE = TOXIC_SLIME_SPRITE;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TOXIC_SLIME_SPRITE };
}

console.log('[toxic_slime] Loaded sprite definition');
