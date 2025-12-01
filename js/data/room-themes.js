// ============================================================================
// ROOM THEMES - Visual themes for rooms, decorations, atmosphere
// ============================================================================

const ROOM_THEMES = {
    'volcanic_chamber': {
        name: 'Volcanic Chamber',
        floorColor: '#2c1810',
        wallColor: '#1a0f0a',
        accentColor: '#d32f2f',
        glowColor: '#ff6b35',
        decorations: ['lava_crack', 'ember_pile', 'obsidian_shard', 'volcanic_vent'],
        decorationDensity: 0.15,
        specialFeatures: ['lava_pools'],
        ambientParticles: 'embers',
        monsters: ['Magma Slime', 'Flame Bat', 'Cinder Wisp', 'Salamander']
    },
    
    'ancient_crypt': {
        name: 'Ancient Crypt',
        floorColor: '#1e1e28',
        wallColor: '#0d0d12',
        accentColor: '#7b68ee',
        glowColor: '#9370db',
        decorations: ['skull_pile', 'broken_coffin', 'bone_scatter', 'ancient_rune'],
        decorationDensity: 0.12,
        specialFeatures: ['tomb_alcoves'],
        ambientParticles: 'dust',
        monsters: ['Skeletal Warrior', 'Phantom', 'Ash Walker', 'Bone Golem']
    },
    
    'ruined_temple': {
        name: 'Ruined Temple',
        floorColor: '#3a3a2f',
        wallColor: '#252520',
        accentColor: '#d4af37',
        glowColor: '#f1c40f',
        decorations: ['broken_pillar', 'statue_fragment', 'prayer_candle', 'collapsed_arch'],
        decorationDensity: 0.18,
        specialFeatures: ['altar', 'shrine'],
        ambientParticles: 'none',
        monsters: ['Pyro Cultist', 'Ash Walker', 'Skeletal Warrior']
    },
    
    'fungal_cavern': {
        name: 'Fungal Cavern',
        floorColor: '#1a2f1a',
        wallColor: '#0f1a0f',
        accentColor: '#4caf50',
        glowColor: '#76ff03',
        decorations: ['mushroom_cluster', 'hanging_moss', 'spore_cloud', 'glowing_fungus'],
        decorationDensity: 0.20,
        specialFeatures: ['giant_mushrooms'],
        ambientParticles: 'spores',
        monsters: ['Mushroom Sprite', 'Crystal Spider', 'Cave Bat', 'Stone Lurker']
    },
    
    'obsidian_halls': {
        name: 'Obsidian Halls',
        floorColor: '#1c1c1c',
        wallColor: '#0a0a0a',
        accentColor: '#424242',
        glowColor: '#757575',
        decorations: ['obsidian_spike', 'glass_shard', 'mirror_fragment', 'crystal_growth'],
        decorationDensity: 0.10,
        specialFeatures: ['reflective_pools'],
        ambientParticles: 'none',
        monsters: ['Obsidian Golem', 'Shadow Stalker', 'Void Touched']
    },
    
    'ashen_wastes': {
        name: 'Ashen Wastes',
        floorColor: '#4a4a4a',
        wallColor: '#2c2c2c',
        accentColor: '#9e9e9e',
        glowColor: '#ff5722',
        decorations: ['ash_pile', 'charred_remains', 'smoke_vent', 'ember_glow'],
        decorationDensity: 0.14,
        specialFeatures: ['ash_drifts'],
        ambientParticles: 'ash',
        monsters: ['Ash Walker', 'Cinder Wisp', 'Flame Bat']
    },
    
    'molten_forge': {
        name: 'Molten Forge',
        floorColor: '#3e2723',
        wallColor: '#1c0f0d',
        accentColor: '#ff6f00',
        glowColor: '#ffab00',
        decorations: ['anvil', 'forge_hammer', 'metal_scrap', 'cooling_trough'],
        decorationDensity: 0.16,
        specialFeatures: ['forge_fire', 'weapon_racks'],
        ambientParticles: 'sparks',
        monsters: ['Obsidian Golem', 'Magma Slime', 'Pyro Cultist']
    },

    'flooded_depths': {
        name: 'Flooded Depths',
        floorColor: '#1a2a3a',
        wallColor: '#0d1520',
        accentColor: '#0288d1',
        glowColor: '#4fc3f7',
        decorations: ['water_puddle', 'algae_growth', 'dripping_stalactite', 'shell_pile'],
        decorationDensity: 0.16,
        specialFeatures: ['water_pools', 'dripping_ceiling'],
        ambientParticles: 'water_drops',
        monsters: ['Deep Crawler', 'Tide Serpent', 'Crystal Spider']
    },

    'shadow_realm': {
        name: 'Shadow Realm',
        floorColor: '#0d0d15',
        wallColor: '#050508',
        accentColor: '#6a1b9a',
        glowColor: '#9c27b0',
        decorations: ['shadow_tendril', 'void_rift', 'dark_crystal', 'soul_flame'],
        decorationDensity: 0.12,
        specialFeatures: ['void_portals'],
        ambientParticles: 'shadow_wisps',
        monsters: ['Shadow Stalker', 'Void Touched', 'Phantom']
    },

    'crystal_caves': {
        name: 'Crystal Caves',
        floorColor: '#1a1a2e',
        wallColor: '#0f0f1a',
        accentColor: '#00bcd4',
        glowColor: '#18ffff',
        decorations: ['crystal_cluster', 'gem_vein', 'prismatic_shard', 'crystal_pillar'],
        decorationDensity: 0.14,
        specialFeatures: ['crystal_formations'],
        ambientParticles: 'sparkles',
        monsters: ['Crystal Spider', 'Stone Lurker', 'Cave Bat']
    },

    'bone_pit': {
        name: 'Bone Pit',
        floorColor: '#2a2520',
        wallColor: '#1a1510',
        accentColor: '#d7ccc8',
        glowColor: '#bcaaa4',
        decorations: ['bone_pile', 'ribcage', 'skull_stack', 'bone_altar'],
        decorationDensity: 0.18,
        specialFeatures: ['mass_graves'],
        ambientParticles: 'bone_dust',
        monsters: ['Skeletal Warrior', 'Bone Golem', 'Phantom']
    }
};

// ============================================================================
// DECORATION TYPES
// ============================================================================

const DECORATION_TYPES = {
    // === VOLCANIC ===
    'lava_crack': { color: '#ff6b35', symbol: '≋', size: 'small', blocksMovement: false, blocksVision: false, glow: true, glowRadius: 1.5, damage: 5 },
    'ember_pile': { color: '#d32f2f', symbol: '※', size: 'small', blocksMovement: false, blocksVision: false, glow: true, glowRadius: 1.0 },
    'obsidian_shard': { color: '#424242', symbol: '◆', size: 'small', blocksMovement: false, blocksVision: false, glow: false },
    'volcanic_vent': { color: '#ff5722', symbol: '◉', size: 'medium', blocksMovement: true, blocksVision: false, glow: true, glowRadius: 2.0, hazard: 'fire' },
    
    // === CRYPT ===
    'skull_pile': { color: '#e0e0e0', symbol: '☠', size: 'small', blocksMovement: false, blocksVision: false, glow: false },
    'broken_coffin': { color: '#5d4037', symbol: '▭', size: 'large', blocksMovement: true, blocksVision: true, glow: false },
    'bone_scatter': { color: '#d7ccc8', symbol: '⌇', size: 'small', blocksMovement: false, blocksVision: false, glow: false },
    'ancient_rune': { color: '#7b68ee', symbol: '◈', size: 'small', blocksMovement: false, blocksVision: false, glow: true, glowRadius: 1.2 },
    
    // === TEMPLE ===
    'broken_pillar': { color: '#9e9e9e', symbol: '▓', size: 'large', blocksMovement: true, blocksVision: true, glow: false },
    'statue_fragment': { color: '#bcaaa4', symbol: '♜', size: 'medium', blocksMovement: true, blocksVision: true, glow: false },
    'prayer_candle': { color: '#f1c40f', symbol: '♨', size: 'small', blocksMovement: false, blocksVision: false, glow: true, glowRadius: 1.5 },
    'collapsed_arch': { color: '#795548', symbol: '⌒', size: 'large', blocksMovement: true, blocksVision: true, glow: false },
    
    // === FUNGAL ===
    'mushroom_cluster': { color: '#4caf50', symbol: '♠', size: 'small', blocksMovement: false, blocksVision: false, glow: true, glowRadius: 1.0 },
    'hanging_moss': { color: '#2e7d32', symbol: '≈', size: 'small', blocksMovement: false, blocksVision: false, glow: false },
    'spore_cloud': { color: '#76ff03', symbol: '◌', size: 'small', blocksMovement: false, blocksVision: false, glow: true, glowRadius: 1.8, hazard: 'poison' },
    'glowing_fungus': { color: '#00e676', symbol: '◍', size: 'medium', blocksMovement: false, blocksVision: false, glow: true, glowRadius: 2.5 },
    
    // === OBSIDIAN ===
    'obsidian_spike': { color: '#1c1c1c', symbol: '▲', size: 'medium', blocksMovement: true, blocksVision: false, glow: false, damage: 10 },
    'glass_shard': { color: '#e0e0e0', symbol: '◇', size: 'small', blocksMovement: false, blocksVision: false, glow: true, glowRadius: 0.8 },
    'mirror_fragment': { color: '#9e9e9e', symbol: '◊', size: 'small', blocksMovement: false, blocksVision: false, glow: false },
    'crystal_growth': { color: '#424242', symbol: '◆', size: 'large', blocksMovement: true, blocksVision: true, glow: true, glowRadius: 2.0 },
    
    // === ASHEN ===
    'ash_pile': { color: '#757575', symbol: '≈', size: 'small', blocksMovement: false, blocksVision: false, glow: false },
    'charred_remains': { color: '#424242', symbol: '✕', size: 'small', blocksMovement: false, blocksVision: false, glow: false },
    'smoke_vent': { color: '#616161', symbol: '○', size: 'medium', blocksMovement: false, blocksVision: true, glow: false },
    'ember_glow': { color: '#ff5722', symbol: '◉', size: 'small', blocksMovement: false, blocksVision: false, glow: true, glowRadius: 1.5 },
    
    // === FORGE ===
    'anvil': { color: '#616161', symbol: '▬', size: 'large', blocksMovement: true, blocksVision: false, glow: false, interactive: true },
    'forge_hammer': { color: '#5d4037', symbol: '⚒', size: 'small', blocksMovement: false, blocksVision: false, glow: false },
    'metal_scrap': { color: '#9e9e9e', symbol: '▪', size: 'small', blocksMovement: false, blocksVision: false, glow: false },
    'cooling_trough': { color: '#0288d1', symbol: '▭', size: 'large', blocksMovement: true, blocksVision: false, glow: false },

    // === FLOODED ===
    'water_puddle': { color: '#4fc3f7', symbol: '~', size: 'small', blocksMovement: false, blocksVision: false, glow: false, slowsMovement: true },
    'algae_growth': { color: '#2e7d32', symbol: '≋', size: 'small', blocksMovement: false, blocksVision: false, glow: false },
    'dripping_stalactite': { color: '#78909c', symbol: '▼', size: 'medium', blocksMovement: true, blocksVision: false, glow: false },
    'shell_pile': { color: '#bcaaa4', symbol: '◕', size: 'small', blocksMovement: false, blocksVision: false, glow: false },

    // === SHADOW ===
    'shadow_tendril': { color: '#6a1b9a', symbol: '⌇', size: 'small', blocksMovement: false, blocksVision: false, glow: true, glowRadius: 0.8 },
    'void_rift': { color: '#9c27b0', symbol: '◎', size: 'medium', blocksMovement: true, blocksVision: false, glow: true, glowRadius: 2.5, hazard: 'void' },
    'dark_crystal': { color: '#4a148c', symbol: '◆', size: 'medium', blocksMovement: true, blocksVision: true, glow: true, glowRadius: 1.5 },
    'soul_flame': { color: '#ce93d8', symbol: '♨', size: 'small', blocksMovement: false, blocksVision: false, glow: true, glowRadius: 2.0 },

    // === CRYSTAL ===
    'crystal_cluster': { color: '#00bcd4', symbol: '❖', size: 'medium', blocksMovement: true, blocksVision: false, glow: true, glowRadius: 2.0 },
    'gem_vein': { color: '#18ffff', symbol: '◈', size: 'small', blocksMovement: false, blocksVision: false, glow: true, glowRadius: 1.0 },
    'prismatic_shard': { color: '#e040fb', symbol: '◇', size: 'small', blocksMovement: false, blocksVision: false, glow: true, glowRadius: 1.5 },
    'crystal_pillar': { color: '#00acc1', symbol: '▓', size: 'large', blocksMovement: true, blocksVision: true, glow: true, glowRadius: 3.0 },

    // === BONE PIT ===
    'bone_pile': { color: '#d7ccc8', symbol: '☠', size: 'medium', blocksMovement: false, blocksVision: false, glow: false },
    'ribcage': { color: '#efebe9', symbol: '⌢', size: 'medium', blocksMovement: true, blocksVision: false, glow: false },
    'skull_stack': { color: '#e0e0e0', symbol: '◎', size: 'medium', blocksMovement: true, blocksVision: false, glow: false },
    'bone_altar': { color: '#bcaaa4', symbol: '▬', size: 'large', blocksMovement: true, blocksVision: false, glow: true, glowRadius: 1.5, interactive: true }
};

// ============================================================================
// DECORATION HELPER FUNCTIONS
// ============================================================================

function hasBlockingDecorationAt(x, y) {
    if (!game.decorations || game.decorations.length === 0) return false;
    
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);
    
    return game.decorations.some(dec => 
        Math.floor(dec.x) === gridX && 
        Math.floor(dec.y) === gridY && 
        dec.data && 
        dec.data.blocksMovement === true
    );
}

function hasVisionBlockingDecorationAt(x, y) {
    if (!game.decorations || game.decorations.length === 0) return false;
    
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);
    
    return game.decorations.some(dec => 
        Math.floor(dec.x) === gridX && 
        Math.floor(dec.y) === gridY && 
        dec.data && 
        dec.data.blocksVision === true
    );
}

function getDecorationAt(x, y) {
    if (!game.decorations) return null;
    
    const gridX = Math.floor(x);
    const gridY = Math.floor(y);
    
    return game.decorations.find(dec => 
        Math.floor(dec.x) === gridX && 
        Math.floor(dec.y) === gridY
    ) || null;
}

function getHazardAt(x, y) {
    const dec = getDecorationAt(x, y);
    if (dec && dec.data && dec.data.hazard) {
        return { type: dec.data.hazard, damage: dec.data.damage || 0 };
    }
    return null;
}

function decorateRoom(room) {
    if (!room || !room.theme) return;
    
    const theme = ROOM_THEMES[room.theme];
    if (!theme || !theme.decorations || theme.decorations.length === 0) return;
    
    const decorationDensity = theme.decorationDensity || 0.1;
    const validTiles = [];
    
    for (let dy = 0; dy < room.floorHeight; dy++) {
        for (let dx = 0; dx < room.floorWidth; dx++) {
            const x = room.floorX + dx;
            const y = room.floorY + dy;
            
            if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) continue;
            
            const tile = game.map[y] && game.map[y][x];
            if (!tile || tile.type !== 'floor') continue;
            
            // Skip doorways
            const isDoorway = game.doorways && game.doorways.some(d => 
                Math.floor(d.x) === x && Math.floor(d.y) === y
            );
            if (isDoorway) continue;
            
            // Skip room center
            const centerX = room.floorX + Math.floor(room.floorWidth / 2);
            const centerY = room.floorY + Math.floor(room.floorHeight / 2);
            const distFromCenter = Math.abs(x - centerX) + Math.abs(y - centerY);
            if (distFromCenter < 2) continue;
            
            // Skip existing decorations
            if (hasBlockingDecorationAt(x, y)) continue;
            
            validTiles.push({ x, y });
        }
    }
    
    if (validTiles.length === 0) return;
    
    const numDecorations = Math.floor(validTiles.length * decorationDensity);
    
    // Shuffle tiles
    for (let i = validTiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validTiles[i], validTiles[j]] = [validTiles[j], validTiles[i]];
    }
    
    if (!room.decorations) room.decorations = [];
    if (!game.decorations) game.decorations = [];
    
    for (let i = 0; i < numDecorations && i < validTiles.length; i++) {
        const tile = validTiles[i];
        const decType = theme.decorations[Math.floor(Math.random() * theme.decorations.length)];
        const decData = DECORATION_TYPES[decType];
        
        if (!decData) continue;
        
        const decoration = {
            x: tile.x,
            y: tile.y,
            type: decType,
            data: decData,
            roomId: room.id || null
        };
        
        game.decorations.push(decoration);
        room.decorations.push(decoration);
    }
}

function clearRoomDecorations(room) {
    if (!room || !game.decorations) return;
    
    game.decorations = game.decorations.filter(dec => dec.roomId !== room.id);
    
    if (room.decorations) {
        room.decorations = [];
    }
}

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
window.DECORATION_TYPES = DECORATION_TYPES;
window.hasBlockingDecorationAt = hasBlockingDecorationAt;
window.hasVisionBlockingDecorationAt = hasVisionBlockingDecorationAt;
window.getDecorationAt = getDecorationAt;
window.getHazardAt = getHazardAt;
window.decorateRoom = decorateRoom;
window.clearRoomDecorations = clearRoomDecorations;
window.getRandomTheme = getRandomTheme;
window.getThemeByDepth = getThemeByDepth;
window.getThemeMonsters = getThemeMonsters;

console.log('[RoomThemes] Loaded', Object.keys(ROOM_THEMES).length, 'themes,', Object.keys(DECORATION_TYPES).length, 'decorations');