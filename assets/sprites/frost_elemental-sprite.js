// ============================================================================
// FROST_ELEMENTAL SPRITE DEFINITION
// ============================================================================
// Auto-converted from: frost-elemental.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const FROST_ELEMENTAL_SPRITE = {
    name: 'frost_elemental',
    width: 32,
    height: 32,
    pixels: [
        "................................",
        "................................",
        ".........HH.HHLH..H.............",
        "........HHHHHHHH..H.............",
        ".......HHHLHHHHLLHH.H.H.........",
        "....H.H.LLLLLLLLLHHHHLH.........",
        ".....HHLLLLLLLLHLBBLLHLH........",
        ".....HHLLLLLLLMBBBBBBLHLH.......",
        "...HHHLLMLLLLBBMLLLHLLMLLHHH....",
        "....HHLMLMLLBMMMMLMMLLLLLLHHH...",
        "....HHLMBLMLELMBBELMMMMBLLHH.H..",
        "..HHHHLMMLLLMBBMMBBBMBLLBHHHHHH.",
        "..LHHLLMLMLLBLLHHLLBBBBLMMHLL...",
        "..L.LMHLLMLBMHH..HHMBMBLLLHLLL..",
        ".HL.LMLLLMMBLHH..HHLBMMMLHLLLL..",
        ".HLHLLLLMMBMH.H..HHHBMBBLHLLLMH.",
        ".HLLHLLLMBMMH......HMMBBLHLLHLH.",
        "..LMHLLLMBMBLH....HLBLBMLHLLHLH.",
        "..HMHHLLLBBBMHH..HHMBLMMMLLMHL..",
        "...LHHBLLMBMBMLHHLMBMLMMMHMLHL..",
        "...HHHBMLLMMMBBMMBBMLMMMMLLHLH..",
        "...HHHLBLLLBMLMBBMLMBMMLBLHHL...",
        "...H.HLLBBMLLLLMMMBBBLLMMHHH....",
        "....HHLHLBBLLLLMBBBMLLMMLHL.....",
        "....H.HLHLLBMLLMBMLLLLLLLHHH....",
        "......HHLHHHLBMMLLLLLLLLML.H....",
        "......HH.HHHHHHHLLMLLHLMHH......",
        ".......H.HH..HHHLHHHHLLHH.......",
        "......H...H.H..HHHHLLH.HH.......",
        "..........H..HH..HLH............",
        ".............H..................",
        "................................",
    ],
    palette: {
        'H': '#E9F9FA',
        'L': '#B8EEFE',
        'M': '#A6EBFE',
        'B': '#9AE5FD',
        'E': '#FFFFFF',
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.FROST_ELEMENTAL_SPRITE = FROST_ELEMENTAL_SPRITE;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FROST_ELEMENTAL_SPRITE };
}

console.log('[frost_elemental] Loaded sprite definition');
