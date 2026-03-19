// ============================================================================
// SHADOW_WISP SPRITE DEFINITION
// ============================================================================
// Auto-converted from: shadow-wisp.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const SHADOW_WISP_SPRITE = {
    name: 'shadow_wisp',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "............HHHH..HHHH..........",
        "...........HHHHHHHLLHLH.........",
        ".........HHHHLLLLLLLLH.H.H......",
        "......H.HHHHLLMLLHLLLLHHLH......",
        ".....HH.HHLLLELMHLELMLLLLHHH....",
        "....HH.HHHLLLLLMMMMLMMMMLH......",
        "....HHHLLLLHHLLMMMMLLLMMLH......",
        "....LLLLLLLLLLMMMMMLHHLMMLH.....",
        "....HLLLMLLLLLMMMMMLLLLMMLLH....",
        "...HHHLLMMMLLLLLMMMMMMMMMLHH....",
        "....HHLLLMMMMMMMMMMMMLMMMLLHH...",
        "....HHLLMMMMMMMMMMMMMMMMMLLHH...",
        "....HHLLLLMMLLMMMMLMMMLMLLLHH...",
        "....HHLLHHLMMMMMMMLLMLLLLLHHH...",
        "....HHLLLLLMMMMMMLLMLLLMLL.HH...",
        "....HHLMLLLMMMMLMMLLHLMMLLH.....",
        ".....HHHLLMLMMMMMMLLHLMLLLHH....",
        ".......HLLMMLLLMMMMLLLMLLLH.....",
        ".....H.HHLLMHHLMMMMMLLLLHHH.....",
        ".......HHLLLLLMMLMLLLLLHHH......",
        ".......HHHHHHHLLLLLHLLLH........",
        ".........HH.HHHHHHHHHHH.........",
        ".............HHH.H.HHH..........",
        "................................",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#CA96DA',
        'L': '#3E1556',
        'M': '#2A0E3D',
        'E': '#FF44FF',
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.SHADOW_WISP_SPRITE = SHADOW_WISP_SPRITE;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SHADOW_WISP_SPRITE };
}

console.log('[shadow_wisp] Loaded sprite definition');
