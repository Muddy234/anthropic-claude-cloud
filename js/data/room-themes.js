// ============================================================================
// ROOM THEMES - Visual themes for rooms (colors and monsters only)
// ============================================================================

const ROOM_THEMES = {
    'volcanic_chamber': {
        name: 'Volcanic Chamber',
        floorColor: '#2c1810',
        wallColor: '#1a0f0a',
        accentColor: '#d32f2f',
        monsters: ['Magma Slime', 'Flame Bat', 'Cinder Wisp', 'Salamander']
    },

    'ancient_crypt': {
        name: 'Ancient Crypt',
        floorColor: '#1e1e28',
        wallColor: '#0d0d12',
        accentColor: '#7b68ee',
        monsters: ['Skeletal Warrior', 'Phantom', 'Ash Walker', 'Bone Golem']
    },

    'ruined_temple': {
        name: 'Ruined Temple',
        floorColor: '#3a3a2f',
        wallColor: '#252520',
        accentColor: '#d4af37',
        monsters: ['Pyro Cultist', 'Ash Walker', 'Skeletal Warrior']
    },

    'fungal_cavern': {
        name: 'Fungal Cavern',
        floorColor: '#1a2f1a',
        wallColor: '#0f1a0f',
        accentColor: '#4caf50',
        monsters: ['Mushroom Sprite', 'Crystal Spider', 'Cave Bat', 'Stone Lurker']
    },

    'obsidian_halls': {
        name: 'Obsidian Halls',
        floorColor: '#1c1c1c',
        wallColor: '#0a0a0a',
        accentColor: '#424242',
        monsters: ['Obsidian Golem', 'Shadow Stalker', 'Void Touched']
    },

    'ashen_wastes': {
        name: 'Ashen Wastes',
        floorColor: '#4a4a4a',
        wallColor: '#2c2c2c',
        accentColor: '#9e9e9e',
        monsters: ['Ash Walker', 'Cinder Wisp', 'Flame Bat']
    },

    'molten_forge': {
        name: 'Molten Forge',
        floorColor: '#3e2723',
        wallColor: '#1c0f0d',
        accentColor: '#ff6f00',
        monsters: ['Obsidian Golem', 'Magma Slime', 'Pyro Cultist']
    },

    'flooded_depths': {
        name: 'Flooded Depths',
        floorColor: '#1a2a3a',
        wallColor: '#0d1520',
        accentColor: '#0288d1',
        monsters: ['Deep Crawler', 'Tide Serpent', 'Crystal Spider']
    },

    'shadow_realm': {
        name: 'Shadow Realm',
        floorColor: '#0d0d15',
        wallColor: '#050508',
        accentColor: '#6a1b9a',
        monsters: ['Shadow Stalker', 'Void Touched', 'Phantom']
    },

    'crystal_caves': {
        name: 'Crystal Caves',
        floorColor: '#1a1a2e',
        wallColor: '#0f0f1a',
        accentColor: '#00bcd4',
        monsters: ['Crystal Spider', 'Stone Lurker', 'Cave Bat']
    },

    'bone_pit': {
        name: 'Bone Pit',
        floorColor: '#2a2520',
        wallColor: '#1a1510',
        accentColor: '#d7ccc8',
        monsters: ['Skeletal Warrior', 'Bone Golem', 'Phantom']
    }
};

// ============================================================================
// STUB FUNCTIONS (decoration system removed)
// ============================================================================

function hasBlockingDecorationAt(x, y) { return false; }
function hasVisionBlockingDecorationAt(x, y) { return false; }
function getDecorationAt(x, y) { return null; }
function getHazardAt(x, y) { return null; }
function decorateRoom(room) { /* No-op - decorations removed */ }
function clearRoomDecorations(room) { /* No-op - decorations removed */ }

// ============================================================================
// THEME SELECTION HELPERS
// ============================================================================

function getRandomTheme() {
    const themes = Object.keys(ROOM_THEMES);
    return themes[Math.floor(Math.random() * themes.length)];
}

function getThemeByDepth(depth) {
    if (depth <= 2) {
        const early = ['ruined_temple', 'ashen_wastes'];
        return early[Math.floor(Math.random() * early.length)];
    } else if (depth <= 4) {
        const mid1 = ['volcanic_chamber', 'ancient_crypt', 'fungal_cavern'];
        return mid1[Math.floor(Math.random() * mid1.length)];
    } else if (depth <= 6) {
        const mid2 = ['obsidian_halls', 'flooded_depths', 'crystal_caves'];
        return mid2[Math.floor(Math.random() * mid2.length)];
    } else if (depth <= 8) {
        const late = ['shadow_realm', 'bone_pit'];
        return late[Math.floor(Math.random() * late.length)];
    } else {
        return 'molten_forge';
    }
}

function getThemeMonsters(themeName) {
    const theme = ROOM_THEMES[themeName];
    return theme ? theme.monsters : [];
}

// ============================================================================
// EXPORTS
// ============================================================================

window.ROOM_THEMES = ROOM_THEMES;
window.hasBlockingDecorationAt = hasBlockingDecorationAt;
window.hasVisionBlockingDecorationAt = hasVisionBlockingDecorationAt;
window.getDecorationAt = getDecorationAt;
window.getHazardAt = getHazardAt;
window.decorateRoom = decorateRoom;
window.clearRoomDecorations = clearRoomDecorations;
window.getRandomTheme = getRandomTheme;
window.getThemeByDepth = getThemeByDepth;
window.getThemeMonsters = getThemeMonsters;

console.log('[RoomThemes] Loaded', Object.keys(ROOM_THEMES).length, 'themes (decorations removed)');