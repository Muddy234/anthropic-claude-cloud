// ============================================================================
// TIDE_SERPENT SPRITE DEFINITION
// ============================================================================
// Auto-converted from: tide-serpent.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const TIDE_SERPENT_SPRITE = {
    name: 'tide_serpent',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        "..............MMMMMM............",
        "............SMLMMLLLMM..........",
        "...........MMBBBBBBBMMM.........",
        "..........MSBBBBBBBBBBMM........",
        ".........LSSBBBBBBBBBBBMM.......",
        ".........SSBBBBMMMBSBBBBBSB.....",
        ".........SSBBMMSMMMSSBSBBBBSM...",
        "........MSSBBEEM....MSSBBBBBBM..",
        ".........SSBBLLM.....SSBSSSBBS..",
        ".........SSBBHHM......SSBSSSSSM.",
        ".........MSSBLLHM.....MSSSSSSSM.",
        "........MMSSSBHLLMM....MSSSSSS..",
        ".....MMBBBBSSBBHHHLMM....MSMS...",
        "....SBBBBBBBSSSBMLHHMM....MM....",
        "...SBBBSSSBBBBSSSMLHHLM.........",
        "..LBBSSMMMMSBBSSSBMLLHM.........",
        "..MBBSSMMMSSSBSSSSBLHLL.........",
        "..SBSS...SSSBBSSMSBMHHHM........",
        "..MBSSM.SSSSSBSS.SSBLLLM........",
        "..MMBSSSSSSSBBSM.SSBLHHM........",
        "...MBBBBSSSBBSS.SSBBLLLM........",
        "...MLMBBBBBSSSSSSSBMHHM.........",
        "....MMLLLMBMSSSBSBBLHMM.........",
        ".....SSSSSSSSSSBBBMMMM..........",
        "....SSSSMSSSBBBBMMMMM...........",
        "...SSMM..MMSMMMMSMM.............",
        "...M........MMMM................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#D9F2E8',
        'L': '#D0E8DE',
        'M': '#AAACAB',
        'B': '#58B5AB',
        'S': '#4FA29D',
        'E': '#FFFFFF',
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TIDE_SERPENT_SPRITE = TIDE_SERPENT_SPRITE;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TIDE_SERPENT_SPRITE };
}

console.log('[tide_serpent] Loaded sprite definition');
