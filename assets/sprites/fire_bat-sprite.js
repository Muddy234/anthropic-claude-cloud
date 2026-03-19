// ============================================================================
// FIRE_BAT SPRITE DEFINITION
// ============================================================================
// Auto-converted from: fire-bat.png
// Original size: 1024x1024, scaled to 32x32
// ============================================================================

const FIRE_BAT_SPRITE = {
    name: 'fire_bat',
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
        "....Y......................Y....",
        "..FYF...................Y..FYF..",
        "..FF.H.H................H.H.FF..",
        ".HLLLLHHHH............HHHHLLLLH.",
        ".BSDDDSBLLH..........HLLBSDDDSL.",
        "..HBBSDDDSH..LH..HL..HDDDDBBBH..",
        "...LBBSDDSB..SSHHSS..BSDDSBBH...",
        "...HLLDDDDDL.DEESSED.LDDDDSLLH..",
        "...HHBDBSDDDLDDBBDDLDDDSBDBH....",
        "....HDBLBDSDDDSBBSDDDSDBBBCH....",
        "....HHLLBDBSDCCDDCDDSBDBLLLH....",
        "......HHBSBSSCDDDDCSSBSBHH......",
        ".......HLBHHSDDSSDDSHHBHH.......",
        "........HH..HSCDDCSH..HH........",
        ".............HDDDDH.............",
        "..............LHHL..............",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#F6DCCC',
        'L': '#986E6B',
        'B': '#7F5139',
        'S': '#6C402C',
        'D': '#47271C',
        'C': '#232323',
        'E': '#FFFF44',
        'F': '#FF6600',
        'Y': '#FFCC00',
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.FIRE_BAT_SPRITE = FIRE_BAT_SPRITE;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FIRE_BAT_SPRITE };
}

console.log('[fire_bat] Loaded sprite definition');
