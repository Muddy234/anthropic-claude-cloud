// ============================================================================
// MUSHROOM_SPRITE SPRITE DEFINITION
// ============================================================================
// Auto-converted from: mushroom-sprite.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const MUSHROOM_SPRITE_SPRITE = {
    name: 'mushroom_sprite',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "............LMMMMLML............",
        "..........BSSMLLLMBSDB..........",
        "........HDLHLLLLLLMMBDCL........",
        ".......MMHHHLLLLLLMMMBDDB.......",
        "......HMHHHLLLLLLLMMMBDDCL......",
        ".....HBHHHLLLLLLLMMLHLSDDD......",
        ".....SLLLLLLLLLMMMMHHHBDDDB.....",
        "....SLLLELHHLEMMMMEHLBDDDDS....",
        "....DMLLLLHLMMMMMMMMMBSDDSSC....",
        "...LSMMMBBBSSSSSSSDDDDDDDMMDL...",
        "...MBBSDDDCCCCCCCCCCCCDDDSBDM...",
        "...MSDDCCCCCCDCCCCCCCCCCCDDDM...",
        "...LDCDDDCCCCCCCCCCCCCCDDDCDL...",
        "....BCDSDCCCCDDDDDCCCCDDSDCB....",
        ".....HDCCCCCDSSSSBCCCCCCCDH.....",
        ".........HLCSMSSSMSCSLHH........",
        "...........SSSSSSSSDB...........",
        "..........LSSSSSSSSDC...........",
        "..........LDSSSSSSDCC...........",
        "...........CDDSSSDCCM...........",
        "...........MCCCCCCCD............",
        "...........LDDL..DDS............",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#DEF577',
        'L': '#A7C44F',
        'M': '#8CAF48',
        'B': '#7C9C42',
        'S': '#60843C',
        'D': '#496D34',
        'C': '#334129',
        'E': '#88FF88',
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MUSHROOM_SPRITE_SPRITE = MUSHROOM_SPRITE_SPRITE;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MUSHROOM_SPRITE_SPRITE };
}

console.log('[mushroom_sprite] Loaded sprite definition');
