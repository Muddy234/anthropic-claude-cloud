/**
 * Player Sprite Configuration
 * Configuration constants for the layered player sprite system
 */

const PLAYER_SPRITE_CONFIG = {
    // Sprite dimensions (32x32 for detailed pixel art)
    width: 32,
    height: 32,
    pixelScale: 2,  // Each pixel = 2x2 screen pixels

    // Animation settings
    walkFramesPerSecond: 8,
    idleFramesPerSecond: 2,
    attackFramesPerSecond: 12,

    // Layer rendering order (bottom to top)
    layerOrder: ['BODY', 'LEGS', 'FEET', 'CHEST', 'HEAD', 'OFF', 'MAIN'],

    // Equipment slot to layer mapping
    slotToLayer: {
        'HEAD': 'HEAD',
        'CHEST': 'CHEST',
        'LEGS': 'LEGS',
        'FEET': 'FEET',
        'MAIN': 'MAIN',
        'OFF': 'OFF'
    },

    // Direction-specific equipment offsets (fine-tuning positions)
    directionOffsets: {
        down: {
            MAIN: { x: 4, y: 0 },
            OFF: { x: -4, y: 0 },
            HEAD: { x: 0, y: 0 },
            CHEST: { x: 0, y: 0 },
            LEGS: { x: 0, y: 0 },
            FEET: { x: 0, y: 0 }
        },
        up: {
            MAIN: { x: -4, y: 0 },
            OFF: { x: 4, y: 0 },
            HEAD: { x: 0, y: 0 },
            CHEST: { x: 0, y: 0 },
            LEGS: { x: 0, y: 0 },
            FEET: { x: 0, y: 0 }
        },
        left: {
            MAIN: { x: -3, y: 0 },
            OFF: { x: 3, y: 0 },
            HEAD: { x: 0, y: 0 },
            CHEST: { x: 0, y: 0 },
            LEGS: { x: 0, y: 0 },
            FEET: { x: 0, y: 0 }
        },
        right: {
            MAIN: { x: 3, y: 0 },
            OFF: { x: -3, y: 0 },
            HEAD: { x: 0, y: 0 },
            CHEST: { x: 0, y: 0 },
            LEGS: { x: 0, y: 0 },
            FEET: { x: 0, y: 0 }
        }
    },

    // Cache settings
    enableCompositeCache: true,
    maxCacheSize: 200,

    // Default player appearance - Battle-hardened warrior
    defaultPalette: {
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
};

// Player customization palette options - Warrior variants
const PLAYER_PALETTE_OPTIONS = {
    hair: {
        dark:     '#3D2817',  // Default dark brown
        black:    '#1A1A1A',  // Raven black
        grizzled: '#5A5A5A',  // Battle-grayed
        rust:     '#6B3A1A',  // Rusty red-brown
        ash:      '#4A4A4A',  // Ash gray
        blood:    '#4A1A1A'   // Dark blood red
    },
    skin: {
        weathered: '#D4A574',  // Default - tanned, weathered
        pale:      '#E8D4B8',  // Northern pale
        bronzed:   '#B8896A',  // Sun-bronzed
        scarred:   '#C49A6A',  // Heavy scarring tone
        dark:      '#8B6B4A'   // Dark weathered
    },
    eyes: {
        steel:   '#7A8B5A',  // Default - steel green
        ice:     '#8A9AAA',  // Ice blue
        amber:   '#AA8B4A',  // Amber/gold
        blood:   '#8A4A4A',  // Blood-touched
        dark:    '#4A4A4A'   // Dark, hardened
    }
};

// Make available globally
if (typeof window !== 'undefined') {
    window.PLAYER_SPRITE_CONFIG = PLAYER_SPRITE_CONFIG;
    window.PLAYER_PALETTE_OPTIONS = PLAYER_PALETTE_OPTIONS;
}
