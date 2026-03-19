// ============================================================================
// MONSTER SPRITE DEFINITIONS
// ============================================================================
// Each sprite is defined as:
// - width/height: Pixel dimensions (32x32)
// - pixels: Array of strings, each char maps to palette
// - palette: Character -> hex color mapping
// - name: Identifier for caching
//
// Character conventions:
//   '.' or ' ' = transparent
//   'E' = eyes (typically bright colors)
//   'H' = highlights/head
//   'B' = body/bone
//   'S' = shadow/secondary
//   Other letters vary by creature type
// ============================================================================

const MONSTER_SPRITES = {

    // ========================================================================
    // SLIMES (32x32)
    // ========================================================================

    magma_slime: {
        name: 'magma_slime',
        width: 32,
        height: 32,
        pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "............MCooooCM............",
        "..........MoDHHHHHLDoM..........",
        "........HoDHHHHHHHHHHDCH........",
        ".......HoLHHHHHHHHHHHLMCH.......",
        "......HCMLHHHHHHHHHHLLLMCH......",
        "......CBLLLLLHHHHHLLLLLMBC......",
        ".....HCMMLLLLLLLLLLLLLMMMCH.....",
        ".....CBMMMMMMLLLLLLMMMMMMSC.....",
        ".....oBMMMMBDBMMMMDDMMMMBBo.....",
        "....MoBBBMMCLCMMMDBBDMBBBBoM....",
        "....CCBBBBBCMCMMMDBBDBBLMBCC....",
        "....CCSMMBBSDSBBBBDDBBMMMSCC....",
        "....MoSMMBBBBBBBBBBBBBBBBSoC....",
        "....HCDSSSBBBBBBBBBBBBSSSDCC....",
        ".....oCDSSSBBBBBBBBBSSSSCCo.....",
        ".....CDCCDSSSSSSSSSSSDDCCDC.....",
        ".....CSSSDCCDDDDDDDCCCDSSSC.....",
        ".....MDDCoDCDCCDCCDDDSooSSC.....",
        "......CC.CSSoCCDDDoCoCHHCSC.....",
        ".........CSSC..CBSC.....oDM.....",
        ".........DSSD..CBSM.....HC......",
        ".........HooH..CBSC.............",
        "..........HH...oSDC.............",
        "...............HoC..............",
        "................................",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#FCE9AE',
        'L': '#FDDF81',
        'M': '#FEC756',
        'B': '#FC8B2A',
        'S': '#D5402B',
        'D': '#B83B2E',
        'C': '#9A3632',
        'o': '#551918',
        }
    },

    ice_slime: {
        name: 'ice_slime',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "..........oooooooooo............",
            ".........oHHHHHHHHHHo...........",
            "........oHHLLLLLLLLHHo..........",
            ".......oHLLLLLLLLLLLLHo.........",
            "......oHLLLLLLLLLLLLLLHo........",
            ".....oHLLLMMMMMMMMMLLLHo........",
            "....oHLLMMMMMMMMMMMMLLLHo.......",
            "....oLLMMMMMMMMMMMMMMMLLo.......",
            "...oHLMMMMMMMMMMMMMMMMLLHo......",
            "...oLMMMMEEMMMMMEEMMMMMMLo......",
            "...oLMMMMEEMMMMMEEMMMMMMLo......",
            "..oLLMMMMMMMMMMMMMMMMMMLLo......",
            "..oLMMMMMMBMMMMBMMMMMMMMLo......",
            "..oLMMMMMMMMMMMMMMMMMMMMLo......",
            "..oLMMMMMMMBMMMMMBMMMMMLLo......",
            ".oLLMMMMMMMMMMMMMMMMMMMMLo......",
            ".oLMMMMMMMMMMMMMMMMMMMMMMLo.....",
            ".oLSSSSSSSSSSSSSSSSSSSSSSLo.....",
            ".oSSSSSSSSSSSSSSSSSSSSSSSSo.....",
            "ooDDDDDDDDDDDDDDDDDDDDDDDDoo....",
            ".oDDDDDDDDDDDDDDDDDDDDDDDDo.....",
            ".oCCCCCCCCCCCCCCCCCCCCCCCCo.....",
            "..oCCCCCCCCCCCCCCCCCCCCCCo......",
            "...oCC....oCCCCo....oCCo........",
            "...oC.....oCCCCo.....oCo........",
            "....o......oCCo......oo.........",
            "............oCo.................",
            ".............o..................",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'o': '#223355',  // Sel-out outline (dark blue)
            'H': '#FFFFFF',  // Highlight (pure white, 0% sat)
            'L': '#DDEEFF',  // Light (ice white, ~15% sat)
            'M': '#88CCFF',  // Mid (ice blue, ~50% sat - peak)
            'B': '#AAEEFF',  // Bubble/frost highlight (cyan variation)
            'S': '#5588CC',  // Shadow (steel blue, ~45% sat)
            'D': '#334477',  // Deep shadow (navy blue, ~40% sat)
            'C': '#112244',  // Core shadow (near-black blue, ~35% sat)
            'E': '#AAFFFF'   // Eyes (bright cyan)
        }
    },

    // ========================================================================
    // SPIRITS / WISPS (32x32)
    // NO BLACK OUTLINE - edges fade to transparent
    // Bright core with gradient outward, wispy scattered edges
    // ========================================================================

    cinder_wisp: {
        name: 'cinder_wisp',
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
        ".....HH.HHLLLLLMLHLMLLLLLHHH....",
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
        }
    },

    frost_elemental: {
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
        "....HHLMBLMLLLMBBMLMMMLBLLHH.H..",
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
        }
    },

    blizzard_spirit: {
        name: 'blizzard_spirit',
        width: 32,
        height: 32,
        pixels: [
            "....s.....s....s....s...........",
            "..s..s...s..s.s..s.s.s..........",
            ".s....ssssssssssssss...s........",
            "....ssddddddddddddddss..........",
            "...sddddddddddddddddddss........",
            "..sddddddddddddddddddddds.......",
            ".sdddddddmmmmmmmmddddddds.......",
            ".ddddddmmmllllllmmmdddddd.......",
            "sddddddmmlhhhhhhhlmmddddds......",
            "dddddddmlhEEEEEEhlmmdddddds.....",
            "ddddddmmllhEEEEhllmmdddddd......",
            "sddddddmmllhhhhlllmmdddddds.....",
            ".dddddddmmmlllllmmmddddddd......",
            ".sdddddddmmmmmmmmmdddddddds.....",
            "..sdddddddddddddddddddddds......",
            "..sdddddddddddddddddddddds......",
            "...sdddddddddddddddddddds.......",
            "....sddddddddddddddddds.........",
            ".....ssddddddddddddss...........",
            "......sssddddddddsss............",
            "........ssdddddss.....s.........",
            ".........sssssss.....s..........",
            "..........s...s....s............",
            "...........s.s...s.s............",
            "............s...s...............",
            ".............s.s.s..............",
            ".............s..s...............",
            "..............s.................",
            "................................",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'E': '#AAEEFF',  // Eyes - cyan glow
            'h': '#FFFFFF',  // Highlight - pure white
            'l': '#DDEEFF',  // Light - ice white
            'm': '#88CCFF',  // Mid - ice blue (peak sat)
            'd': '#5588CC',  // Shadow - steel blue
            's': '#334477'   // Deep - navy (scattered snow particles)
        }
    },

    flame_sprite: {
        name: 'flame_sprite',
        width: 32,
        height: 32,
        pixels: [
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "................................",
        "......................L.........",
        ".....................BD.........",
        "....................BBB.........",
        ".........BB.........BHD.........",
        ".........BBL.......BBMD.........",
        ".........SHB.......BMSD.........",
        ".........DSMDDDBDDCDMDD.BB......",
        ".......LBDDCB...HMMBoCDBHB......",
        ".......BBCoML...HMMMMCDMSB......",
        ".......LDoMMMHHHHMMHHMCSCL......",
        "........oDMMMMMMMMHHMSDoC.......",
        "........oSMMMMMMMMMMSDSoL.......",
        "........CSDDMMMMDSSSDDDCB.......",
        ".......BDSDDSSSDSDSSSSDDC.......",
        ".......CDDDSSSSSDDSSDDCCC.......",
        ".......CDCCCDDDDDDDCCCCCC.......",
        "......BoDCooCCCCCCCCooCSoB......",
        ".....CBSCCCoCoooooCCoCCCDMCB....",
        "....LoMSDDCooCCoooCCoCCDSMSC....",
        ".....LCoooDSSSDDDDSSSDoooCB.....",
        "..........BoDSHMMMSDoC..........",
        "............BBCCCCDB............",
        "................................",
        "................................",
        "................................",
        "................................",
    ],
    palette: {
        'H': '#D2FAFC',
        'L': '#E6E9EC',
        'M': '#A7F3FA',
        'B': '#BEC8D5',
        'S': '#6FC8F4',
        'D': '#55A4DF',
        'C': '#3F81C6',
        'o': '#295CA7',
        }
    },

    // ========================================================================
    // GOLEMS (32x32) - Full black outline, massive silhouette, glowing cracks
    // ========================================================================

    obsidian_golem: {
        name: 'obsidian_golem',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "..........XXXXXXXXXX............",
            ".........XHHLLLLLLHXX...........",
            "........XHLLBBBBBBLLHX..........",
            ".......XHLLBBBBBBBBLLHX.........",
            ".......XHLBBBBBBBBBBLHX.........",
            "......XHLBBBEEFFEEBBBLHX........",
            "......XHLBBBEEFFEEBBBLHX........",
            ".......XHLBBBBBBBBBLHX..........",
            "........XHLBBBBBBBLHX...........",
            ".......XXHLDDDDDDDLHXX..........",
            "......XDDDXHLDDDLHXDDDX.........",
            ".....XDDDDDDXHHHXDDDDDDX........",
            "....XDDDDDFGGCGGFDDDDDDX........",
            "...XDDDDDFFGGCGGFFDDDDDDDX......",
            "..XDDDDDFGGGGCGGGGFDDDDDDDX.....",
            ".XDDDDDFFGGGCCCGGGFFDDDDDDX.....",
            ".XDDDDDFGGGCCCCCGGGFDDDDDDXX....",
            "XDDDDDDFFGGGCCCGGGFFDDDDDDDX....",
            "XDDDDDXXDDDDDDDDDDXXDDDDDDDX....",
            "XDDDDDX.XDDDDDDDDX.XDDDDDDDX....",
            "XDDDDX..XDDDDDDDDX..XDDDDDDX....",
            "XDDDDX..XDDDDDDDDX..XDDDDDDX....",
            "XDDDX...XDDSSSDDX....XDDDDDX....",
            "XDDDX...XDDSSSDDX....XDDDDDX....",
            "XSSSSX..XDSSSSSSDX...XSSSSSX....",
            "XSSSSX...XSSSSSSX....XSSSSSX....",
            ".XSSSX...XSSSSSSX....XSSSSX.....",
            "..XXX.....XXXXXX......XXXX......",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline
            'H': '#444444',  // Highlight obsidian (top-left lit)
            'L': '#383838',  // Light obsidian
            'B': '#2C2C2C',  // Mid obsidian body
            'D': '#1E1E1E',  // Dark obsidian shadow
            'S': '#121212',  // Deep shadow (joints/feet)
            'E': '#FF6B35',  // Ember eyes
            'F': '#FF4400',  // Fire vein outer (dark orange)
            'G': '#FF6B35',  // Fire vein mid (orange)
            'C': '#FFDD77'   // Fire core (brightest yellow)
        }
    },

    stone_guardian: {
        name: 'stone_guardian',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "..........XXXXXXXXXX............",
            ".........XHHLLLLLLHXX...........",
            "........XHLLMMMMMMLLHX..........",
            ".......XHLLMMMMMMMMLLHX.........",
            ".......XHLMMMMMMMMMMMLHX........",
            "......XHLMMMEEEEEEMMMLHX........",
            "......XHLMMMEEEEEEMMMHLX........",
            ".......XHLMMMMMMMMMMHLX.........",
            "........XHLMMNNMMMHLX...........",
            ".......XXHLDDDDDDDLHXX..........",
            "......XDDDXHLDDDLHXDDDX.........",
            ".....XDDDDDDXHHHXDDDDDDX........",
            "....XDDDDDCGGCGGCDDDDDDDX.......",
            "...XDDDDDCCGGCGGCCDDDDDDDX......",
            "..XDDDDDDCGGGCGGGCDDDDDDDDX.....",
            ".XDDDDDDCCGGGCGGGCCDDDDDDDDX....",
            ".XDDDDDCCGGGCCCGGGCCDDDDDDDX....",
            "XDDDDDDCCGGGCCCGGGCCDDDDDDDDX...",
            "XDDDDDXXDDDDDDDDDDXXDDDDDDDDX...",
            "XDDDDDX.XDDDDDDDDX.XDDDDDDDDX...",
            "XDDDDX..XDDDDDDDDX..XDDDDDDDX...",
            "XDDNDX..XDDDDNNDX...XNDDDDDDX...",
            "XDDDX...XDDSSSDX....XDDDDDDX....",
            "XDDDX...XDDSSSDDX...XDDDDDDX....",
            "XSSSSX..XDSSSSSSDX..XSSSSDDX....",
            "XSSSSX...XSSSSSSX...XSSSSSX.....",
            ".XSSSX...XSSSSSSX...XSSSSX......",
            "..XXX.....XXXXXX.....XXXX.......",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline
            'H': '#D4C8B0',  // Highlight sandy beige (top-left lit)
            'L': '#B8A888',  // Light tan
            'M': '#8B7355',  // Mid earthy brown (peak saturation)
            'D': '#5D4632',  // Dark brown shadow
            'S': '#3A2818',  // Deep umber shadow
            'N': '#557744',  // Moss patches (muted green)
            'E': '#AAFFAA',  // Green rune eyes (soul glow)
            'G': '#88FF88',  // Glowing green core mid
            'C': '#55AA55'   // Green core outer (darker green)
        }
    },

    ice_golem: {
        name: 'ice_golem',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "..........XXXXXXXXXX............",
            ".........XWWHHHHHWWXX...........",
            "........XWHLLLLLLLLHWX..........",
            ".......XWHLLLLLLLLLLLHX.........",
            ".......XHLLLLLLLLLLLLLHX........",
            "......XHLLLLEEEEELLLLLHX........",
            "......XHLLLLEEEEELLLLLHX........",
            ".......XHLLLLLLLLLLLHX..........",
            "........XHWLLLLLLWHLX...........",
            ".......XXHLMMMMMMMHLXX..........",
            "......XMMMXHLMMMMHLXMMMX........",
            ".....XMMMMMMXHLLHXMMMMMMX.......",
            "....XMMMMMCGGCGGCMMMMMMMX.......",
            "...XMMMMMMCGGCGGCCMMMMMMMX......",
            "..XMMMMMCGGGGCGGGGCMMMMMMX......",
            ".XMMMMMCCGGGCCCGGGCCMMMMMXX.....",
            ".XMMMMCCGGGCCCCCGGGCCMMMMMX.....",
            "XMMMMMMCGGGCCCCCGGGCMMMMMMMX....",
            "XMMMMMXXMMMMMMMMMMXXMMMMMMMX....",
            "XMMMMMX.XMMMMMMMMX.XMMMMMMMX....",
            "XMMMMX..XMMMMMMMMX..XMMMMMMX....",
            "XMWHMX..XMMMWWMMMX..XMHWMMMX....",
            "XMMMX...XMMMMMMMMX..XMMMMMMX....",
            "XMMMX...XMMSSSMMX...XMMMMMMX....",
            "XSSSSX..XMSSSSSSSX..XSSSSMMX....",
            "XSSSSX...XSSSSSSX...XSSSSSX.....",
            ".XSSSX...XSSSSSSX...XSSSSX......",
            "..XXX.....XXXXXX.....XXXX.......",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline
            'W': '#FFFFFF',  // Highlight pure white (frost facets)
            'H': '#DDEEFF',  // Light ice white
            'L': '#88CCFF',  // Mid ice blue (peak saturation)
            'M': '#5588CC',  // Shadow steel blue
            'S': '#334477',  // Deep navy blue shadow
            'E': '#AAEEFF',  // Cyan glowing eyes
            'G': '#AAEEFF',  // Glowing ice core mid (cyan glow)
            'C': '#5588CC'   // Core outer shadow
        }
    },

    bone_golem: {
        name: 'bone_golem',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "..........XXXXXXXXXX............",
            ".........XHHHHHHHHHHXX..........",
            "........XHHLLLLLLLLLHX..........",
            ".......XHHLLLLLLLLLLLHX.........",
            ".......XHLLLLLLLLLLLLLHX........",
            "......XHLLLLEEEEEELLLLLHX.......",
            "......XHLLLLEEEEEELLLLHLX.......",
            ".......XHLLLLLLLLLLLLHLX........",
            "........XHLLLLLLLLLLHX..........",
            ".......XXHLMMMMMMMMLHXX.........",
            "......XMMMXHLMMMMHLXMMMX........",
            ".....XMMMMMMXHLLHXMMMMMMX.......",
            "....XMMMMMCGGCGGCMMMMMMMX.......",
            "...XMMMMMCCGGCGGCCMMMMMMX.......",
            "..XMMMMMCGGGGCGGGGCMMMMMMMX.....",
            ".XMMMMMMCCGGGCGGGCCMMMMMMMMX....",
            ".XMMMMMCCGGGCCCGGGCCMMMMMMMMX...",
            "XMMMMMMMCGGGCCCGGGCMMMMMMMMMX...",
            "XMMMMMXXMMMMMMMMMMMXXMMMMMMMX...",
            "XMMMMMX.XMMMMMMMMMX.XMMMMMMMX...",
            "XMMMMX..XMMMMMMMMMX..XMMMMMMX...",
            "XMMMMX..XMMMMMMMMMX..XMMMMMMX...",
            "XMMMX...XMMMMMMMMMX..XMMMMMX....",
            "XMMMX...XMMMSSSMMX...XMMMMMX....",
            "XDDDSX..XMMSSSSSMMX..XSDDDDX....",
            "XDDDSX...XSSSSSSX....XSDDDDX....",
            ".XDDSX...XSSSSSSX....XSDDSX.....",
            "..XXX.....XXXXXX......XXXX......",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline
            'H': '#EEEECC',  // Highlight pale bone (top-left lit)
            'L': '#DDDDAA',  // Light bone
            'M': '#CCCCAA',  // Mid bone white (peak sat for undead)
            'D': '#999977',  // Dark aged bone shadow
            'S': '#555544',  // Deep dark bone shadow
            'E': '#AAFFAA',  // Green soul glow eyes (bright)
            'G': '#88FF88',  // Soul core mid (glowing green)
            'C': '#557744'   // Soul core outer (darker muted green)
        }
    },

    stone_lurker: {
        name: 'stone_lurker',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "................................",
            "................................",
            "..........XXXXXXXXXXXX..........",
            "........XXHHLLLLLLLLHHXX........",
            "......XXHLLLLLLLLLLLLLLHXX......",
            ".....XHLLLLLLLLLLLLLLLLLLHX.....",
            "....XHLLLLLLLLLLLLLLLLLLLLHX....",
            "...XHLLLLLLLLEEELLLLLLLLLLLHX...",
            "..XHLLLLLLLLLEEEELLLLLLLLLLLLX..",
            "..XLLLLLLLLLLLLLLLLLLLLLLLLLLLX.",
            ".XLLLLNNLLLLLLLLLLLLLLNNLLLLLLX.",
            ".XLLLNNNMLLLLLLLLLLLMNNNLLLLLLX.",
            "XMMMMMMMMMMMMMMMMMMMMMMMMMMMMMXX",
            "XMMMMMMMMMMMMMMMMMMMMMMMMMMMMMXX",
            "XMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMX",
            "XMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMX",
            "XDDDDDDDDDDDDDDDDDDDDDDDDDDDDDDX",
            ".XDDDDDDDDDDDDDDDDDDDDDDDDDDDDDX",
            ".XDDDDDDDDDDDDDDDDDDDDDDDDDDDDDX",
            "..XDDDDDDDDDDDDDDDDDDDDDDDDDDXX.",
            "..XDDSSSSDDDDDDDDDDDDDSSSSDDXX..",
            "...XDSSSSSSDDDDDDDDDSSSSSSDX....",
            "....XSSSSSSSSSSSSSSSSSSSSSSX....",
            ".....XSSSSSSSSSSSSSSSSSSSSX.....",
            "......XSSSSSSSSSSSSSSSSSSXX.....",
            ".......XXSSSSSSSSSSSSSSSXX......",
            "........XXSSSSSSSSSSSSSXX.......",
            "..........XXXXXXXXXXXX..........",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline
            'H': '#D4C8B0',  // Highlight sandy beige (top-left lit)
            'L': '#B8A888',  // Light tan
            'M': '#8B7355',  // Mid earthy brown (peak saturation)
            'D': '#5D4632',  // Dark brown shadow
            'S': '#3A2818',  // Deep umber shadow (underside)
            'N': '#557744',  // Moss patches (muted green)
            'E': '#AAFFAA'   // Green glowing eyes
        }
    },

    // ========================================================================
    // HUMANOIDS (32x32)
    // ========================================================================

    skeletal_warrior: {
        name: 'skeletal_warrior',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "................................",
            "..........XXXXXXXXXX............",
            ".........XHHLLLLLLHXX...........",
            "........XHLLBBBBBBLLX...........",
            "........XLBBBBBBBBBLX...........",
            "........XLBBEEBBEELX............",
            "........XLBBEEBBEBBLX...........",
            "........XLLBBBBBBLLX............",
            ".........XLBBDBBDBX.............",
            "..........XSBBBBSX..............",
            "............XDX.................",
            "..........XXCCCCXX..............",
            ".........XLSCCCCSLX.............",
            "........XLSSCCCC.SLX............",
            ".......XLX.XLSSX.XBLX...........",
            "......XLX..XLSSX...XLX..........",
            ".....XBX...XSSX....XLX..........",
            "....XX.....XSSX.....XLX.........",
            "...XTX.....XSSX......XLX........",
            "..XXXX.....XSSX......XXXXX......",
            "...........XBBX.................",
            "..........XBBBX.................",
            ".........XBXXXBX................",
            ".........XDX..XSX...............",
            ".........XDX..XSX...............",
            "........XDX....XSX..............",
            ".......XLX......XSX.............",
            "......XLX........XSX............",
            ".....XLX.........XCX............",
            "....XXXXX.......XXXXX...........",
            "................................"
        ],
        palette: {
            'H': '#EEEECC',  // Highlight - pale bone (top-left lit)
            'L': '#DDDDAA',  // Light bone
            'B': '#CCCC99',  // Mid bone - base
            'S': '#999977',  // Shadow bone (greenish shift)
            'D': '#666655',  // Deep shadow
            'C': '#444433',  // Core shadow
            'E': '#FFFF66',  // Yellow glowing eye sockets
            'W': '#775533',  // Rusted weapon (brown-rust)
            'T': '#554422',  // Tattered cloth
            'X': '#000000'   // Black outline
        }
    },

    pyro_cultist: {
        name: 'pyro_cultist',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "................................",
            "............XXXXXXXX............",
            "...........XHHLLLLHXX...........",
            "..........XHLLMMMMLLHX..........",
            ".........XHLLMMMMMMLLHX.........",
            ".........XLMMMMMMMMMLX..........",
            ".........XLMMSSSSSSMLX..........",
            ".........XMSSSSSSSSSSMX.........",
            ".........XMSSSEESSSSSMX.........",
            ".........XMSSSSSSSSSSMX.........",
            "..........XMSSSSSSSMX...........",
            "...........XMMMMMMX.............",
            "..........XHRRRRRRRHX...........",
            ".........XHRRRRRRRRRHX..........",
            "........XHRRRRRRRRRRRHX.........",
            ".......XHRRRRRRRRRRRRRHX........",
            "......XRRRRRRRRRRRRRRRRRX.......",
            ".....ffXRRRRRRRRRRRRRRRXff......",
            "....fffXDDRRRRRRRRRRDDXfff......",
            ".....ffXDDDRRRRRRRRDDDXff.......",
            "......XDDDDRRRRRRRDDDDX.........",
            ".......XDDDDRRRRRRDDDDX.........",
            "........XDDDRRRRRDDDX...........",
            ".........XDDRRRRDDX.............",
            "..........XDDRRDDDX.............",
            "..........XDDX.XDDX.............",
            ".........XDDX...XDDX............",
            ".........XDDX...XDDX............",
            ".........XXX.....XXX............",
            "................................",
            "................................"
        ],
        palette: {
            'H': '#883333',  // Highlight hood (warm red)
            'L': '#772222',  // Light hood
            'M': '#661111',  // Mid hood (peak saturation)
            'R': '#551111',  // Robe base
            'D': '#440000',  // Dark robe shadow
            'S': '#110000',  // Deep shadow face
            'E': '#FF6B35',  // Orange glowing eyes
            'f': '#FF6B35',  // Fire effects (sel-out)
            'X': '#000000'   // Black outline
        }
    },

    shadow_stalker: {
        name: 'shadow_stalker',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "....xx..............xx..........",
            "....xHx............xHx..........",
            ".....xHx..........xHx...........",
            "......xLLx....xLLx..............",
            ".......xLLLLLLLLx...............",
            "........xMMMMMMx...............",
            ".......xLMMMMMMMLx..............",
            ".......xMMMEEMMEEMx.............",
            ".......xMMMMMMMMMMx.............",
            "........xMMMMMMMMx..............",
            ".........xDDDDDDx...............",
            "........xDDDDDDDDx..............",
            ".......xDDDDDDDDDDx.............",
            "......xSSSSSSSSSSSx.............",
            ".....xSSSSSSSSSSSSSx............",
            "....xSSSSSSSSSSSSSSSx...........",
            "...xSSSSSSSSSSSSSSSSSx..........",
            "..xCCCCSSSSSSSSSSCCCCx..........",
            "..xC..xSSSSSSSSSSx..Cx..........",
            "..x....xSSSSSSSSx....x..........",
            "........xSSSS..xSx..............",
            ".......xSSx....xSSx.............",
            "......xSSx......xSSx............",
            "......xSx........xSx............",
            ".....xSx..........xSx...........",
            ".....xx............xx...........",
            "................................",
            "................................",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'H': '#554466',  // Highlight purple (top-left lit)
            'L': '#443355',  // Light purple
            'M': '#332244',  // Mid dark purple (peak saturation)
            'D': '#221133',  // Dark purple shadow
            'S': '#110022',  // Deep shadow
            'C': '#0A0011',  // Core shadow (near black)
            'E': '#FF44FF',  // Magenta glowing eyes
            'x': '#221133'   // Sel-out colored outline (dark purple)
        }
    },

    ash_walker: {
        name: 'ash_walker',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "................................",
            "..........XXXXXXXXXX............",
            ".........XHHLLLLLLHXX...........",
            "........XHLLMMMMMMLLHX..........",
            "........XLMMDDDDDDMMLX..........",
            "........XLMMDEEDDEMMLX..........",
            "........XLMMDDDDDDMMLX..........",
            ".........XLMDDDDDDMLX...........",
            "..........XMMDDDDMMX............",
            "...........XSSSSSSSX............",
            "..........XTTTTTTTTX............",
            ".........XWTTTTTTTTTWX..........",
            "........XWWTTTTTTTTTWWX.........",
            ".......XWWWTTTTTTTTTTWWWX.......",
            "......XWWWWTTTTTTTTTTTWWWWX.....",
            ".....XWWWWTTTTTTETTTTTTWWWWX....",
            ".....XWWWTTTTTTEETTTTTTTWWWX....",
            "......XWWTTTTTTTTTTTTTTTWWX.....",
            ".......XWTTTTTTTTTTTTTTTTWX.....",
            "........XTTTTTTTTTTTTTTTTX......",
            ".........XTTTTTTTTTTTTTTX.......",
            "..........XTTTTTTTTTTTTX........",
            "...........XTTTTTTTTTX..........",
            "..........XTTTTX.XTTTTX.........",
            ".........XTTTTX...XTTTTX........",
            ".........XTTX.......XTTX........",
            ".........XTTX.......XTTX........",
            "........XSSX.........XSSX.......",
            "........XXaaaa...aaaaXX.........",
            "................................",
            "................................"
        ],
        palette: {
            'H': '#999999',  // Highlight ash (top-left lit)
            'L': '#888888',  // Light ash
            'M': '#777777',  // Mid ash
            'D': '#666666',  // Dark ash shadow
            'S': '#555555',  // Deep shadow
            'T': '#444444',  // Tattered wrappings
            'W': '#333333',  // Wrapping shadows
            'E': '#FFAA44',  // Ember orange eyes
            'e': '#FF6622',  // Ember spots
            'a': '#553311',  // Ash particles at feet
            'X': '#000000'   // Black outline
        }
    },

    temple_sentinel: {
        name: 'temple_sentinel',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "................................",
            "...........XXXXXXXXX............",
            "..........XGGHHHHGGX............",
            ".........XGHHLLLLLHHGX..........",
            ".........XHLLMMMMMMLLHX.........",
            ".........XHLMMEEMMMLHX..........",
            ".........XHLLMMMMMMLLHX.........",
            "..........XHLLLLLLHX............",
            "...........XGGGGGGX.............",
            "..........XHAAAAAAHX............",
            ".........XHAAAAAAAAAHX..........",
            "........XHAAAAAAAAAAAHX.........",
            ".......XHAAAAAAAAAAAAAHX........",
            "......XHAAAAAAAAAAAAAAAHX.......",
            "....XSSHAAAAAAAAAAAAAAAAHX......",
            "...XSSSHAAAAAAAAAAAAAAAAHX......",
            "...XSSSSHAAAAAAAAAAAAAAAHX......",
            "...XSSSSSHAAAAAAAAAAAAAHX.......",
            "...XSSSSSSHAAAAAAAAAAAAHX.......",
            "...XSSSSSSXHAAAAAAAAAAHX........",
            "...XSSSSSSX.XHAAAAAAAHX.........",
            "...XSSSSSX...XHAAAAAAHX.........",
            "...XXXXX......XHAAAAAHX.........",
            "..............XHAAX.XAAHX.......",
            ".............XHAAX...XAAHX......",
            ".............XHAX.....XAHX......",
            ".............XHAX.....XAHX......",
            "............XBBX.......XBBX.....",
            "............XXX.........XXX.....",
            "................................",
            "................................"
        ],
        palette: {
            'H': '#FFEEAA',  // Highlight gold (top-left lit)
            'G': '#FFDD77',  // Light gold
            'L': '#DDBB55',  // Mid gold (peak saturation)
            'M': '#BB9933',  // Dark gold
            'A': '#CCCCDD',  // Silver armor (cool)
            'S': '#FFCC44',  // Golden shield
            'E': '#FFFFFF',  // White glowing eyes
            'B': '#998877',  // Boots (neutral brown)
            'X': '#000000'   // Black outline
        }
    },

    demon_knight: {
        name: 'demon_knight',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "......XX..........XX............",
            ".......XHX......XHX.............",
            "........XHX....XHX..............",
            ".........XHHHHHHX...............",
            "........XHLLLLLLLHX.............",
            ".......XHLLMMMMLLHX.............",
            ".......XHLMMEEMMLHX.............",
            ".......XHLLMMMMLLHX.............",
            "........XHLLLLLHX...............",
            ".........XDDDDDDX...............",
            "........XDAAAAAAAADX............",
            ".......XDAAAAAAAAAADX...........",
            "......XDAAAAAAAAAAADX...........",
            ".....XDAAAAAAAAAAAADX...........",
            "....ffXDAAAAGGAAAADXff..........",
            "...fffXDAAGGGGGGAADXfff.........",
            "...fffXDAAGGGGGGAADXfff.........",
            "....ffXDAAAGGGGAAADXff..........",
            ".....XDAAAAGGGGAAAADX...........",
            "......XDAAAAAAAAAADX............",
            ".......XDAAAAAAAAADX............",
            "........XDAAAAAAADX.............",
            ".........XDAAAAADX..............",
            "........XDAADX.XDAADX...........",
            ".......XDAADX...XDAADX..........",
            ".......XDADX.....XDADX..........",
            ".......XDADX.....XDADX..........",
            "......XCCX.........XCCX.........",
            "......XXX...........XXX.........",
            "................................",
            "................................"
        ],
        palette: {
            'H': '#333344',  // Highlight helm (cool black)
            'L': '#222233',  // Light helm
            'M': '#111122',  // Mid helm
            'D': '#444455',  // Dark armor shadow
            'A': '#333344',  // Armor mid
            'G': '#FF4400',  // Orange glowing core
            'E': '#FF3333',  // Red glowing eyes
            'C': '#551111',  // Dark red boots
            'f': '#FF6B35',  // Flame effects (sel-out)
            'X': '#000000'   // Black outline
        }
    },

    shield_bearer: {
        name: 'shield_bearer',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "................................",
            "...........XXXXXXXXX............",
            "..........XHHLLLLHHX............",
            ".........XHLLMMMMLLHX...........",
            ".........XHLMMMMMMMLHX..........",
            ".........XHLMMEEMMMLHX..........",
            ".........XHLMMMMMMMLHX..........",
            "..........XHLLMMLLHX............",
            "...........XDDDDDDX.............",
            "..........XHAAAAAAHX............",
            ".........XHAAAAAAAAAHX..........",
            "........XHAAAAAAAAAAAHX.........",
            ".......XHAAAAAAAAAAAAAHX........",
            "......XHAAAAAAAAAAAAAAAHX.......",
            "....XSSHAAAAAAAAAAAAAAAAHX......",
            "...XWSSHAAAAAAAAAAAAAAAAHX......",
            "...XWWSSHAAAAAAAAAAAAAAAHX......",
            "...XWWWSSHAAAAAAAAAAAAAHX.......",
            "...XWWWWSSHAAAAAAAAAAAAHX.......",
            "...XWWWWWSXHAAAAAAAAAAHX........",
            "...XWWWWWSX.XHAAAAAAAHX.........",
            "...XWWWWSX...XHAAAAAAHX.........",
            "...XWWWSX.....XHAAAAAHX.........",
            "...XWWSX.......XHAAX.XAAHX......",
            "...XXXX.........XHAX..XAHX......",
            "................XHAX..XAHX......",
            "................XHAX..XAHX......",
            "...............XBBX....XBBX.....",
            "...............XXX......XXX.....",
            "................................",
            "................................"
        ],
        palette: {
            'H': '#CCCCDD',  // Highlight steel (top-left lit)
            'L': '#AAAACC',  // Light steel
            'M': '#8888AA',  // Mid steel (peak saturation)
            'D': '#666688',  // Dark steel shadow
            'A': '#BBBBCC',  // Armor plates
            'S': '#AA7744',  // Shield leather
            'W': '#775533',  // Shield wood
            'E': '#4466FF',  // Blue glowing eyes
            'B': '#554433',  // Brown boots
            'X': '#000000'   // Black outline
        }
    },

    // ========================================================================
    // BEASTS (32x32)
    // ========================================================================

    cave_bat: {
        name: 'cave_bat',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            ".X............................X.",
            ".XX..........................XX.",
            ".XWXX......................XXWX.",
            "XWWWXX..................XXWWWWX.",
            "XWWWWXX................XXWWWWWX.",
            "XWLWWWXX..............XXWWWLWWX.",
            "XWLLWWWXX............XXWWWLLWWX.",
            "XWWLLWWWXX..........XXWWWLLWWWX.",
            "XWWWLLWWWWX........XWWWWLLWWWWX.",
            "XWWWWLLWWWWX......XWWWWLLWWWWWX.",
            "XWWWWWLLWWWWX....XWWWWLLWWWWWWX.",
            "XWWWWWWLLWWWXXXXXXWWWLLWWWWWWWX.",
            "XWWWWWWWWLLWWWWWWWWLLWWWWWWWWWX.",
            ".XWWWWWWWWLLWWWWWLLWWWWWWWWWX..",
            "..XWWWWWWWWLLLLLLLLWWWWWWWWX...",
            "...XWWWWWWWXXBBBBBXXWWWWWWX....",
            "....XWWWWXXBBOOOOOBBXXWWWX.....",
            ".....XXWXXBBOEELEOBBXXWXX......",
            "......XXXBBBOEELEOBBBBXXX......",
            ".......XXBBBOOOOOOBBBXX........",
            "........XBBOOUUUUOOBBX.........",
            ".........XBBUUUUUUBBX..........",
            "..........XBBUUUUBX............",
            "...........XBBUUBX.............",
            "............XBBX...............",
            ".............XX................",
            "................................",
            "................................",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline
            'W': '#3D2A1E',  // Dark brown wings (deep shadow, hue-shifted purple-brown)
            'L': '#5C4033',  // Wing highlight (midtone, peak sat)
            'B': '#4A3728',  // Body dark (shadow)
            'O': '#5C4033',  // Body mid (midtone)
            'U': '#7B6352',  // Underbelly (light, hue toward tan)
            'E': '#CC1111'   // Red eyes (clustered 2x2)
        }
    },

    flame_bat: {
        name: 'flame_bat',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            ".X............................X.",
            ".XX..........................XX.",
            ".XWXX......................XXWX.",
            "XWWWXX..................XXWWWWX.",
            "XWWWWXX................XXWWWWWX.",
            "XWDWWWXX..............XXWWWDWWX.",
            "XWDDWWWXX............XXWWWDDWWX.",
            "XWWDDWWWXX..........XXWWWDDWWWX.",
            "XWWWDDWWWWX........XWWWWDDWWWWX.",
            "XWWWWDDWWWWX......XWWWWDDWWWWWX.",
            "XWWWWWDDWWWWX....XWWWWDDWWWWWWX.",
            "XWWWWWWDDWWWXXXXXXWWWDDWWWWWWWX.",
            "XWWWWWWWWDDFFFFFFDDWWWWWWWWWWWX.",
            ".XWWWWWWWWFFLLLLLFFWWWWWWWWWX..",
            "..XWWWWWWWFLLHHHHLLFWWWWWWWX...",
            "...XWWWWWXFFHHHHHHHFFXWWWWX....",
            "....XWWWXXFLHEEYEEHLFXXWWX.....",
            ".....XXWXFFLLEEYELLLFFXWXX.....",
            "......XXXFFLLLLLLLLLLFFXXX.....",
            ".......XXFFOOOOOOOOOFFXX.......",
            "........XFFOOSSSSOOFFX.........",
            ".........XFFSSSSSSFX...........",
            "..........XTTSSSSTX............",
            "...........XTTTTX..............",
            "............XTTTX..............",
            ".............XTX...............",
            "..............X................",
            "................................",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline
            'W': '#661122',  // Dark red-brown wings (deep shadow, hue-shifted to purple)
            'D': '#8B2500',  // Wing highlight (shadow)
            'F': '#CC3322',  // Flame shadow (hue-shifted red-orange)
            'O': '#FF6B35',  // Flame mid (peak saturation orange)
            'L': '#FFDD77',  // Flame light (warm yellow)
            'H': '#FFFFCC',  // Flame highlight (pale yellow-white, low sat)
            'E': '#FFFF44',  // Bright yellow eyes
            'Y': '#FFFFFF',  // Eye center (white hot)
            'S': '#FF9944',  // Lower flame (light orange)
            'T': '#F7C331'   // Flame trail tip
        }
    },

    crystal_spider: {
        name: 'crystal_spider',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "x............................x..",
            ".x..........................x...",
            "..x........................x....",
            "...x......................x.....",
            "....x....................x......",
            ".....x..................x.......",
            "......x................x........",
            ".......xXXXXXXXXXXXXXXx.........",
            "......XXBBLLLLLLLLLBBXX.........",
            ".....XXBLLLLLLLLLLLLLBXX........",
            "....XXBLLLLLHHLLLLLLLBXX........",
            "...XXBLLLLEEPPEELLLLLLBXX.......",
            "...XBLLLLEEPPPPEEELLLLLBX.......",
            "..XXBLLLLLEEPPELLLLLLLLBXX......",
            "..XBLLLLLLLLLLLLLLLLLLLBX.......",
            "..xXBLLLLLLLLLLLLLLLLLBXx.......",
            "..x.XBLLLHHHHHHLLLLLBX.x........",
            "..x..XBBLHHHHHHLLLLBX..x........",
            "..x...XBBHHHHHHLLLBX...x........",
            "..x....XXBHHHHLBBXX....x........",
            "..x.....xXXBBBBXXx.....x........",
            "..x.....x...XX...x.....x........",
            "...x....x........x....x.........",
            "....x...x........x...x..........",
            ".....x..x........x..x...........",
            "......x.x........x.x............",
            ".......xx........xx.............",
            "........x........x..............",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline (body only)
            'x': '#334477',  // Sel-out colored outline for crystalline legs (dark blue)
            'B': '#5588CC',  // Body shadow (purple-blue, hue-shifted)
            'L': '#88CCFF',  // Body mid (ice blue, peak saturation)
            'H': '#DDEEFF',  // Body highlight (pale ice, low sat)
            'E': '#DD44DD',  // Eyes (purple-pink faceted)
            'P': '#FF88FF'   // Eye highlight (bright pink)
        }
    },

    giant_spider: {
        name: 'giant_spider',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            ".X............................X.",
            "..X..........................X..",
            "...XX......................XX...",
            "....XX....................XX....",
            ".....XX..................XX.....",
            "......XXXX..XXXXXX..XXXX........",
            ".......XXXXXXXXXXXXXX...........",
            "........XXBBBOOOOOBBXX..........",
            ".........XBOOOOOOOOOBX..........",
            ".........XBOOOOOOOOOOBX.........",
            "........XBOOOEEEEOOOOBX.........",
            ".......XXBOOEEEEEEOOOBXX........",
            "......XXBBOOEEEEEOOOBBBXX.......",
            ".....XXBBOOOOOOOOOOOBBBBXX......",
            "....XXBBBOOOOOOOOOOOOOBBXX......",
            "....XLLBBOOODDDOOOOOBBLX........",
            "...XLLXXBOODDDDDDOOBXXLLX.......",
            "..XLLX..XBODDDDDDDOBX..XLLX.....",
            "..XLX...XBBODDDDDOBBX...XLX.....",
            ".XXX....XXBBODDDOOBXX....XXX....",
            ".X.......XXBBOOOBBXX.......X....",
            "X........X.XBBOBBX.X........X...",
            ".........X..XBBBX..X............",
            "........X....XBX....X...........",
            ".......X......X......X..........",
            "......X..............X..........",
            ".....X................X.........",
            "....X..................X........",
            "...X....................X.......",
            "..X......................X......",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline
            'B': '#3D2A1E',  // Body deep shadow (dark brown, hue-shifted purple)
            'O': '#5C4033',  // Body mid (earth brown, peak saturation)
            'L': '#4A3728',  // Leg mid (brown)
            'D': '#2A1A10',  // Pattern marking (dark shadow, textural noise)
            'E': '#CC1111'   // Red eyes (clustered multiple)
        }
    },

    salamander: {
        name: 'salamander',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "................................",
            "........XXXXXXXXXX..............",
            ".......XXHHLLLLLHHXX............",
            "......XXHLLLLLLLLLHXX...........",
            ".....XXHLLLLLLLLLLLLXX..........",
            ".....XHLLLEELLLLLLLHX...........",
            "....XXHLLLEELLLLLLLLXX..........",
            "....XHHLLLLLLLLLLLLLHX..........",
            ".....XXHLLLLLLLLLLXX............",
            "......XXXXXXXXXXXX..............",
            "..XXX..XOOMMMMMMOOOX..XXX.......",
            ".XLLLXXXXXXXXXXXXXXXXLLLX.......",
            "XLLLLXXOOMMMMMMMMOOXXLLLLX......",
            ".XLLLXXOOMMMMMMMMOOXXLLLX.......",
            "......XOMMMMMMMMMMMOX...........",
            ".....XXOMMMMMMMMMMMMOXX.........",
            "..XXX.XOMMMMMMMMMMMMOX.XXX......",
            ".XLLLLXXOMMMMMMUUUOOXXLLLLX.....",
            "XLLLLXXOMMMMMUUUUUUOXXLLLLX.....",
            ".XLLLXXOMMMUUUUUUUUOXXLLLX......",
            "......XXTTTTTTTTTTTTXX..........",
            ".......XTTTTTTTTTTTTTX..........",
            "........XTTTTTTTTTTTTX..........",
            ".........XTTTTTTTTTTTX..........",
            "..........XTTTTTTTTTTX..........",
            "...........XTTTTTTTTTX..........",
            "............XTTTTFFFFX..........",
            ".............XFFFFFFFF..........",
            "..............XFFFFF...........",
            "...............XXX..............",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline
            'H': '#FFFFCC',  // Head highlight (pale yellow-white, low sat)
            'L': '#FFDD77',  // Head light (warm yellow)
            'E': '#FFFF44',  // Yellow eyes
            'O': '#FF6B35',  // Body mid (orange, peak sat)
            'M': '#CC3322',  // Body shadow (red-orange, hue-shifted)
            'U': '#FFDD77',  // Underbelly (yellow, lighter)
            'T': '#CC3322',  // Tail (red-orange)
            'F': '#FF6B35'   // Tail flame tip (orange glow)
        }
    },

    mushroom_sprite: {
        name: 'mushroom_sprite',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            ".........XXXXXXXXXXXX...........",
            "........XXCCCCCCCCCCXX..........",
            ".......XXCCLLLLLLLLLCXX.........",
            "......XXCLLOOOOOOOOOLLCXX.......",
            ".....XXCLLOOPPOOOOPPOOLLCXX.....",
            "....XXCLLOPPPPOOOPPPPOOLLCXX....",
            "...XXCLLOPPPPOOOPPPPPOOLLCXX....",
            "...XCLLOOOOOOOOOOOOOOOOLLCX.....",
            "..XXCLLOOOOOOOOOOOOOOOOOLLCXX...",
            "..XCLLOPPPOOOOOOOOPPOOOOLLCX....",
            "..XCLLOPPPPOOOOOPPPPPOOOLLCX....",
            "..XCCLLOPPPOOOOOOPPOOOOLLCCX....",
            "...XCCLLOOOOOOOOOOOOOOLLCCX.....",
            "....XXCCLLOOOOOOOOOLLCCXX.......",
            ".....XXGGDDDDDDDDDDDDGGXX.......",
            "......XXGGDDDDDDDDDDDGXX........",
            ".........XXSSSSSSSSXX...........",
            "........XXSSLLLLLLLSSXX.........",
            "........XSSLLEEEELLSSSX.........",
            "........XSSLLEEEEELLSSX.........",
            ".........XSSLLMMMLLSSX..........",
            ".........XSSSLLLLLSSSX..........",
            "..........XSSSSLSSSSSX..........",
            "..........XSSSSSSSSSX...........",
            ".........XXFF..FFXXX............",
            "........XXFF....FFXX............",
            ".......XXF......FXX.............",
            ".......XF........FX.............",
            "........X........X..............",
            "................................",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline
            'C': '#661122',  // Cap deep shadow (purple-red, hue-shifted)
            'O': '#AA4433',  // Cap mid (reddish brown, peak sat)
            'L': '#CC6644',  // Cap light (warm brown)
            'P': '#FFEECC',  // Cap spots (cream, low sat)
            'D': '#553322',  // Gills dark (deep shadow)
            'G': '#775544',  // Gills mid
            'S': '#AA9977',  // Stem shadow
            'E': '#DD55DD',  // Glowing spore eyes (purple-pink)
            'M': '#663344',  // Mouth (dark muted)
            'F': '#224422'   // Dark green legs (hue-shifted forest)
        }
    },

    // ========================================================================
    // UNDEAD (32x32)
    // ========================================================================

    phantom: {
        name: 'phantom',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "................................",
            "..........xxHHHHxx..............",
            ".........xHHLLLLHHx.............",
            "........xHLLLLLLLLHx............",
            ".......xHLLLLLLLLLLHx...........",
            "......xHLLLLLLLLLLLLx..........",
            ".....xHLLLMMMMMMMLLLx..........",
            ".....xLLMMMEEMMEEMMLx...........",
            "....xLLMMMEEMMEEMMMLLx..........",
            "....xLLMMMMMMMMMMMMLLx..........",
            "...xLLMMMMMMMMMMMMMMMLx.........",
            "...xLMMMMMMMMMMMMMMMMLx.........",
            "..xLLMMMMMMMMMMMMMMMMMx.........",
            "..xLMMDDMMMMMMMMMDDMMx..........",
            "...LMMDDDMMMMMMMDDDML...........",
            "...MMDDDDMMMMMMDDDDMM...........",
            "....MDDDDDMMMMDDDDDM............",
            ".....DDDDDDDDDDDDDDD............",
            "......DDSSSSSSSSSDD.............",
            ".......SSSSSSSSSS...............",
            "........SSSSSSSS................",
            "..........SSSSS.................",
            "............SS...S..............",
            ".............S....S.............",
            "..............S.................",
            "................S...............",
            "................................",
            "................................",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'x': '#4455667F',// Sel-out outline (pale blue, semi-transparent)
            'H': '#FFFFFF',  // Highlight (pure white)
            'L': '#DDEEFF',  // Light (pale blue-white)
            'M': '#AABBDD',  // Mid (ethereal blue)
            'D': '#7799BB',  // Shadow (blue-gray)
            'S': '#5577997F',// Deep shadow (fading, semi-transparent)
            'E': '#EEFFFF'   // Hollow eye glow (pale cyan)
        }
    },

    frozen_husk: {
        name: 'frozen_husk',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "...........hh.hh................",
            ".........XXHHHHHXX..............",
            "........XBBBBBBBBHX.............",
            ".......XBBBBBBBBBBBX............",
            "......XBBBBLLLBBBBBBX...........",
            "......XBBBLhhhLBBBBBX...........",
            ".....XBBBBEEMMEEBBBBX...........",
            ".....XBBBBBBMMBBBBBBX...........",
            "......XBBBBBBBBBBBBX............",
            ".......XBBBBBBBBBBX.............",
            "......hXXBBBBBBBBXXh............",
            ".....hhXBBBBBBBBBBXhh...........",
            "....hh.XBBBBBBBBBBX.hh..........",
            "....h.XBBS.BBBB.SBBX.h..........",
            ".....XBBSS.BBBB.SSBBX...........",
            "....XBBBSSSBBBBSSSBBX...........",
            "....XBBBBBBBBBBBBBBBX...........",
            ".....XBBBBBBBBBBBBBX............",
            "......XBBBBBBBBBBX..............",
            ".......XBBBSSBBBBX..............",
            "......XBBS....SBBX..............",
            "......XBS......SBX..............",
            ".....XBS........SBX.............",
            ".....XBh........hBX.............",
            "....XBS..........SBX............",
            "....XBh..........hBX............",
            "...XBS............SBX...........",
            "...Xh..............hX...........",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline (physical body)
            'h': '#FFFFFF',  // Ice crystal highlight (no outline)
            'H': '#DDEEFF',  // Light ice (pale)
            'L': '#AADDFF',  // Ice crystal mid
            'B': '#99AABB',  // Frozen bone (blue-gray)
            'S': '#667788',  // Deep shadow (dark blue-gray)
            'M': '#445566',  // Core shadow (near-black blue)
            'E': '#66CCFF'   // Blue glowing eyes
        }
    },

    // ========================================================================
    // AQUATIC CREATURES (32x32)
    // ========================================================================

    deep_crawler: {
        name: 'deep_crawler',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "....XX..............XX..........",
            "...XEEX............XEEX.........",
            "..XEEEEX..........XEEEEX........",
            "...XEEX............XEEX.........",
            "....XX..............XX..........",
            "XPPX..XXXXXXXXXXXX..XPPX........",
            "XPPPXXHHHHHHHHHHHXXXXXPX........",
            "XPPPPXHHHLLLLLLHHHXXPPX.........",
            "XPPPPXHLLLLLLLLLLHXPPPX.........",
            ".XPPXXLLLLLLLLLLLLLXXPX.........",
            "..XXLLLLLEEEELLLLLLXXX..........",
            "..XLLLLLLEEEEELLLLLLX...........",
            ".XHLLLLLLLLLLLLLLLLLLX..........",
            "XHHLLLLLLLLLLLLLLLLLLLX.........",
            "XHLLLLLMMMMMMLLLLLLLLLLX........",
            "XLLLLLMMMMMMMMLLLLLLLLLLX.......",
            "XLLLLMMMMMMMMMMLLLLLLLLLLX......",
            "XXLLSSSSSSSSSSSSSSLLLLLLXX......",
            "XAAXXXXXXXXXXXXXXXXAAAAAX.......",
            "XAAX.XSSSSSSSSSSSSX.XAAX........",
            ".XAX..XSSSSSSSSSX..XAAX.........",
            "..XX...XSSSSSSSX...XXX..........",
            "........XSSSSSX.................",
            ".........XSSSX..................",
            "..........XXX...................",
            "................................",
            "................................",
            "................................",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline
            'H': '#AAEEFF',  // Shell highlight (light aqua)
            'L': '#5599CC',  // Shell mid (ocean blue)
            'M': '#336688',  // Shell shadow (deep blue)
            'S': '#224455',  // Shell core shadow
            'E': '#FFEE44',  // Yellow stalked eyes
            'P': '#996633',  // Brown pincers (mid)
            'A': '#55BBBB'   // Aqua legs
        }
    },

    tide_serpent: {
        name: 'tide_serpent',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            ".......XXXXXX...................",
            "......XHHHHHHXX.................",
            ".....XHHHHHHHHHHX...............",
            "....XHHHLLLLLLLHHX..............",
            "...XHHLLLLLLLLLLLHX.............",
            "...XHLLLEELLEEELLLX.............",
            "...XHLLLEEELEEELLLLX............",
            "...XHLLLLLLLLLLLLLLHX...........",
            "....XHHLLLLLLLLLLLHX............",
            ".....XXHHLLLLLHHHXX.............",
            "......XXXXXLLLLLXX..............",
            "........XLLLLLLLLXX.............",
            "..........XLLLLLLLHX............",
            "...........XLLLLLLLLX...........",
            "............XLLMMLLLX...........",
            ".............XMLMMLLLX..........",
            "..............XMMMLLLX..........",
            "...............XMMLLLLX.........",
            "................XMMLLLX.........",
            ".................XMMLLLX........",
            "..................XMMLLX........",
            "...................XMMLLX.......",
            "....................XMMLX.......",
            ".....................XSSLX......",
            "......................XSSX......",
            ".......................XSSX.....",
            "........................XXX.....",
            "................................",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline
            'H': '#AAEEFF',  // Head highlight (light aqua)
            'L': '#55AACC',  // Body mid (teal scales)
            'M': '#337799',  // Body shadow (deeper teal)
            'S': '#225566',  // Tail shadow (deep blue-teal)
            'E': '#FFEE44'   // Yellow eyes
        }
    },

    // ========================================================================
    // SHADOW / DARK CREATURES (32x32)
    // ========================================================================

    void_touched: {
        name: 'void_touched',
        width: 32,
        height: 32,
        pixels: [
            "......v..........v..............",
            ".....vv..........vv.............",
            "....vv.xxxxxxxXXX.vv............",
            "...vv.xLLLLLLLLLLx.vv...........",
            "...v.xLLLMMMMMLLLLx.v...........",
            ".....xLLMMMMMMMMLLLx............",
            "....xLLMMMMMMMMMMMLx............",
            "....xLLMEEMMMEEMMLLx............",
            "....xLLMEEMMMEEMMLLx............",
            "....xLMMMMMMMMMMMLLx............",
            ".....xLMMDDDDDMMLLx.............",
            "......xLMDDDDDMLx...............",
            "......xLLDDDDDLLx...............",
            ".....xDDLDDDDDLDDx..............",
            "....xDDDLLLLLLLDDDx.............",
            "...xDDDDDLvvvLDDDDDx............",
            "...xDDDDvvvvvvvDDDDx............",
            "..xDDDDvvvvvvvvvDDDx............",
            "..xDDDDDvvvvvvDDDDDx............",
            "...xDDDDDDvvDDDDDDx.............",
            "....xDDDDDDDDDDDDx..............",
            ".....xDDDDDDDDDDx...............",
            "......xDDSSSDDx.................",
            ".......xSS.SSx..................",
            "......xSS...SSx.................",
            ".....xSS.....SSx................",
            "....vSS.......SSv...............",
            "...vvS.........Svv..............",
            "..v.....v.......v.v.............",
            ".v......v........v.v............",
            "................................",
            "................................"
        ],
        palette: {
            'x': '#221133',  // Sel-out (near-black purple)
            'v': '#9966CC',  // Void energy particles (lavender)
            'L': '#7755AA',  // Light purple
            'M': '#553388',  // Mid purple (peak saturation)
            'D': '#332255',  // Dark violet shadow
            'S': '#221144',  // Core shadow (near-black)
            'E': '#FF44FF'   // Magenta eyes
        }
    },

    shadow_imp: {
        name: 'shadow_imp',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "....xx..............xx..........",
            "...xHHx............xHHx.........",
            "....xHHx..........xHHx..........",
            ".....xHHx........xHHx...........",
            "......xHHxxxxxxHHx..............",
            ".......xHLLLLLLHHx..............",
            "......xLLLLLLLLLLLx.............",
            ".....xLLLLLLLLLLLLLx............",
            "....xLLLMMMMMMMLLLLx............",
            "....xLLMEERMMREEMLLx............",
            "....xLLMMEEMMEEMMLLx............",
            ".....xLMMMMMMMMMLLx.............",
            ".....xLLMMMMMMMLLx..............",
            "....xWWxLLLLLLLxWWx.............",
            "...xWWWWxLLLLLxWWWWx............",
            "..xWWx.WWxLLLxWW.xWWx...........",
            ".xWWx...WWxLxWW...xWWx..........",
            "xWWx.....WWLLLWW....xWWx........",
            "xWx......xLLLLLx.....xWx........",
            ".........xLLLLLx................",
            "........xLLDDLLLx...............",
            ".......xLDD..DDLx...............",
            "......xDD......DDx..............",
            ".....xDD........DDx.............",
            "....xCC..........CCx............",
            "...xCx............xCx...........",
            "..xCx..............xCx..........",
            "................................",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'x': '#221133',  // Sel-out (dark purple outline)
            'H': '#7755AA',  // Horn highlight (light purple)
            'L': '#553388',  // Body mid (deep purple, peak sat)
            'M': '#442266',  // Body shadow (dark violet)
            'D': '#332255',  // Deep shadow
            'W': '#664499',  // Wing mid (purple)
            'C': '#443366',  // Claw shadow (dark purple)
            'E': '#FFDD44',  // Yellow-orange eyes
            'R': '#FF6644'   // Red eye accent
        }
    },

    // ========================================================================
    // PLAYER CHARACTER (32x32)
    // ========================================================================

    player_warrior: {
        name: 'player_warrior',
        width: 32,
        height: 32,
        pixels: [
            "................................",
            "................................",
            "..........XXXXXXXXXX............",
            ".........XHHHHHHHHHHX...........",
            "........XHHHLLLLLLHHHX..........",
            "........XHHLLLLLLLLHHX..........",
            "........XHLLLLLLLLLLHX..........",
            ".........XFFFFFTTFFFX...........",
            "........XFFFFFEEFFFFTX..........",
            "........XFFFTTTTTFFFTX..........",
            ".........XFTTTTTTTFX............",
            "..........XTTMTTTTX.............",
            ".........XAAAAAAAAAAAX..........",
            "........XAAGGGGGGGAAAX..........",
            ".......XAAGGGGGGGGGGAAX.........",
            "......XAAAGGGGGGGGGAAAX.........",
            ".....XWWXAAGGGGGGAXWWWX.........",
            "....XWWWXAAGGGGGAXWWWWX.........",
            "....XWWWWXAGGGGGAXWWWWX.........",
            ".....XWWXXAAAAAAAXXWWX..........",
            ".........XAASAASAAX.............",
            "..........XASAASAX..............",
            ".........XPPS..SPPX.............",
            "........XPPP....PPPX............",
            "........XPP......PPX............",
            "........XPD......DPX............",
            ".......XPPD......DPPX...........",
            ".......XBBB......BBBX...........",
            "......XBBCC......CCBBX..........",
            "................................",
            "................................",
            "................................"
        ],
        palette: {
            'X': '#000000',  // Black outline
            'H': '#CC9966',  // Hair highlight (warm brown)
            'L': '#996644',  // Hair mid (brown)
            'F': '#FFDDBB',  // Skin highlight (light peach)
            'T': '#EECCAA',  // Skin mid (peach)
            'M': '#BB7766',  // Skin shadow (darker peach, hue-shifted)
            'E': '#4488FF',  // Blue eyes
            'A': '#AAAAAA',  // Armor highlight (silver)
            'G': '#888888',  // Armor mid (steel gray)
            'S': '#666666',  // Armor shadow (dark gray)
            'W': '#CCCCCC',  // Weapon highlight (bright silver)
            'P': '#775544',  // Pants mid (brown)
            'D': '#554433',  // Pants shadow (dark brown)
            'B': '#553322',  // Boots mid (brown)
            'C': '#332211'   // Boots shadow (dark brown)
        }
    }
};

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.MONSTER_SPRITES = MONSTER_SPRITES;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { MONSTER_SPRITES };
}

console.log('[MonsterSprites] Loaded', Object.keys(MONSTER_SPRITES).length, 'sprite definitions');
