/**
 * Player Base Sprites
 * Pixel-array definitions for the base player character
 * 32x32 pixel sprites for all 4 directions
 *
 * Battle-hardened warrior design:
 * - Wild, windswept hair
 * - Broad, muscular build
 * - Scarred, weathered skin
 * - Worn leather armor with straps
 * - Arm wraps/bandages
 * - Heavy fur-trimmed boots
 */

const PLAYER_SPRITES = {
    // Base humanoid body - 32x32 pixels
    'player_base': {
        name: 'player_base',
        width: 32,
        height: 32,
        directions: {
            // Facing down (toward camera) - Battle-ready warrior
            down: {
                pixels: [
                    "................................",
                    "...........HHhh.................",
                    ".........HHHHHHHHh..............",
                    "........HHHHHHHHHHh.............",
                    ".......hHHHHHHHHHHHh............",
                    ".......HHHHHHHHHHHHH............",
                    "........SSSSSSSSSSss............",
                    "........SXSSSSSSSSss............",
                    "........SSEESSEESSss............",
                    "........SSeeSSeeSSss............",
                    "........SSSSSSSSSsss............",
                    ".........SSsMMsSSss.............",
                    "..........sSSSSss...............",
                    "..........ssSSss................",
                    ".......LLLLLLLLLLLLl............",
                    "......LLLBBBBBBBBLLLl...........",
                    ".....WWwLBBBBBBBBBLwWW..........",
                    ".....WWwLLBBBBBBLLLwWW..........",
                    ".....WWwwLLBBBBLLLwwWW..........",
                    "......Www.LLLLLL..wwW...........",
                    "......Www..LLLL...wwW...........",
                    ".......ww..llll...ww............",
                    "...........PPPPPP...............",
                    "..........PPPPPPPP..............",
                    "..........PPPppPPP..............",
                    "..........PP....PP..............",
                    "..........PP....PP..............",
                    ".........RFFr..rFFR.............",
                    ".........FFFF..FFFF.............",
                    ".........FFFf..fFFF.............",
                    "................................",
                    "................................"
                ]
            },
            // Facing up (away from camera)
            up: {
                pixels: [
                    "................................",
                    "...........hHHH.................",
                    ".........HHHHHHHHh..............",
                    "........HHHHHHHHHHHh............",
                    ".......hHHHHHHHHHHHHh...........",
                    ".......HHHHHHHHHHHHHH...........",
                    "........HHHHHHHHHHhh............",
                    "........HHHHHHHHHHhh............",
                    "........hhHHHHHHhhhh............",
                    "..........SSSSSS................",
                    "..........sSSSSSs...............",
                    "..........sSSSSss...............",
                    "..........ssSSss................",
                    "..........ssSSss................",
                    ".......LLLLLLLLLLLLl............",
                    "......LLLBBBBBBBBLLLl...........",
                    ".....WWwLBBBBBBBBBLwWW..........",
                    ".....WWwLLBBBBBBLLLwWW..........",
                    ".....WWwwLLBBBBLLLwwWW..........",
                    "......Www.LLLLLL..wwW...........",
                    "......Www..LLLL...wwW...........",
                    ".......ww..llll...ww............",
                    "...........PPPPPP...............",
                    "..........PPPPPPPP..............",
                    "..........PPPppPPP..............",
                    "..........PP....PP..............",
                    "..........PP....PP..............",
                    ".........RFFr..rFFR.............",
                    ".........FFFF..FFFF.............",
                    ".........FFFf..fFFF.............",
                    "................................",
                    "................................"
                ]
            },
            // Facing left - Profile view
            left: {
                pixels: [
                    "................................",
                    "..........HHHh..................",
                    ".........HHHHHHh................",
                    "........HHHHHHHHh...............",
                    ".......HHHHHHHHHHh..............",
                    ".......HHHHHHHHHHh..............",
                    "........SSSSSSSShh..............",
                    "........XSSSSSSSh...............",
                    "........EESSSSSSh...............",
                    "........eeSSSSShh...............",
                    ".........SSSSSss................",
                    ".........sMSSSss................",
                    "..........sSSss.................",
                    "..........ssss..................",
                    "........LLLLLLLLl...............",
                    ".......LLBBBBBBLLl..............",
                    "......WwLBBBBBBBLl..............",
                    "......WwLLBBBBBLLl..............",
                    "......WwwLLBBBLLl...............",
                    ".......ww.LLLLL.................",
                    ".......ww..LLL..................",
                    "........w..lll..................",
                    "..........PPPPP.................",
                    ".........PPPPPP.................",
                    ".........PPpPPP.................",
                    ".........PP..PP.................",
                    ".........PP..PP.................",
                    "........RFF.rFF.................",
                    "........FFFFFFF.................",
                    "........FFFfFFF.................",
                    "................................",
                    "................................"
                ]
            },
            // Facing right - Profile view
            right: {
                pixels: [
                    "................................",
                    "..................hHHH..........",
                    "................hHHHHHH.........",
                    "...............hHHHHHHHH........",
                    "..............hHHHHHHHHHH.......",
                    "..............hHHHHHHHHHH.......",
                    "..............hhSSSSSSSS........",
                    "...............hSSSSSSSX........",
                    "...............hSSSSSSEE........",
                    "..............hhSSSSSee.........",
                    "................ssSSSSSS........",
                    "................ssSSSMs.........",
                    ".................ssSs...........",
                    "..................ssss..........",
                    "...............lLLLLLLLL........",
                    "..............lLLBBBBBBLL.......",
                    "..............lLBBBBBBBLwW......",
                    "..............lLLBBBBBLLwW......",
                    "...............lLLBBBLLwwW......",
                    ".................LLLLL.ww.......",
                    "..................LLL..ww.......",
                    "..................lll..w........",
                    ".................PPPPP..........",
                    ".................PPPPPP.........",
                    ".................PPPpPP.........",
                    ".................PP..PP.........",
                    ".................PP..PP.........",
                    ".................FFr.FFR........",
                    ".................FFFFFFF........",
                    ".................FFFfFFF........",
                    "................................",
                    "................................"
                ]
            }
        },
        palette: {
            // Hair - wild, dark
            'H': '#3D2817',  // Dark brown, almost black
            'h': '#2A1A0F',  // Hair shadow/outline

            // Skin - weathered, battle-worn
            'S': '#D4A574',  // Tanned, weathered skin
            's': '#B8896A',  // Skin shadow
            'X': '#8B5A5A',  // Scar tissue

            // Eyes - fierce, determined
            'E': '#7A8B5A',  // Steel green/gray eyes
            'e': '#4A5A3A',  // Eye shadow/pupil

            // Mouth
            'M': '#9A6B5A',  // Weathered lips

            // Leather armor
            'L': '#6B4423',  // Worn leather brown
            'l': '#4A2F18',  // Leather shadow/straps

            // Body/tunic under armor
            'B': '#4A4A3A',  // Dark cloth/gambeson
            'b': '#3A3A2A',  // Cloth shadow

            // Arm wraps/bandages
            'W': '#C4B59A',  // Dirty cloth wraps
            'w': '#9A8B6A',  // Wrap shadow

            // Pants - battle-worn
            'P': '#4A3A2A',  // Dark leather pants
            'p': '#3A2A1A',  // Pants shadow/wear

            // Boots - heavy, fur-trimmed
            'F': '#3A2A1A',  // Dark leather boots
            'f': '#2A1A0A',  // Boot shadow
            'R': '#6B5A4A',  // Fur trim
            'r': '#5A4A3A'   // Fur shadow
        }
    }
};

// Helper to get sprite for direction
function getPlayerBaseSprite(direction) {
    const sprite = PLAYER_SPRITES.player_base;
    const dirData = sprite.directions[direction] || sprite.directions.down;
    return {
        name: `player_base_${direction}`,
        width: sprite.width,
        height: sprite.height,
        pixels: dirData.pixels,
        palette: sprite.palette
    };
}

// Make available globally
if (typeof window !== 'undefined') {
    window.PLAYER_SPRITES = PLAYER_SPRITES;
    window.getPlayerBaseSprite = getPlayerBaseSprite;
}
