// ============================================================================
// ROOM GENERATOR - The Shifting Chasm
// ============================================================================
// Updated: Added element assignment, room adjacency effects
// Rooms are 22x22 total (20x20 floor + 1-tile walls on all sides)
// ============================================================================

// ============================================================================
// CONFIGURATION
// ============================================================================

const ROOM_CONFIG = {
    roomSize: 36,                 // Interior floor space (increased for chambers)
    totalSize: 38,                // Including walls
    minRooms: 5,
    maxRooms: 8,
    elementSpread: true,          // Adjacent rooms tend toward similar elements
    debugLogging: true
};

// Element to theme mappings (2 themes per element)
const ELEMENT_THEMES = {
    fire: ['magma_chamber', 'ember_crypts'],
    ice: ['frozen_abyss', 'glacial_tombs'],
    water: ['drowned_halls', 'weeping_caverns'],
    earth: ['crystal_caverns', 'stone_sanctum'],
    nature: ['fungal_grotto', 'overgrown_ruins'],
    death: ['bone_ossuary', 'shadow_crypt'],
    arcane: ['runic_vaults', 'shattered_observatory'],
    dark: ['void_chamber', 'lightless_depths'],
    holy: ['sacred_shrine', 'radiant_halls'],
    physical: ['ancient_arena', 'gladiator_pits']
};

// Theme to element reverse lookup
const THEME_ELEMENTS = {};
for (const [element, themes] of Object.entries(ELEMENT_THEMES)) {
    for (const theme of themes) {
        THEME_ELEMENTS[theme] = element;
    }
}

// ============================================================================
// ROOM GENERATION
// ============================================================================

/**
 * Generate a rectangular room with element assignment
 * @param {number} gridX - Top-left X position on grid
 * @param {number} gridY - Top-left Y position on grid
 * @param {string} roomType - 'entrance', 'combat', 'treasure', etc.
 * @param {object} options - Generation options
 * @returns {object} Room object
 */
function generateRectangularRoom(gridX, gridY, roomType = 'combat', options = {}) {
    const ROOM_SIZE = ROOM_CONFIG.roomSize;
    const TOTAL_SIZE = ROOM_CONFIG.totalSize;
    
    // Determine element
    let element = options.element;
    if (!element) {
        element = selectRoomElement(options.adjacentRooms || []);
    }
    
    // Select theme based on element
    let theme = options.theme;
    if (!theme) {
        const themes = ELEMENT_THEMES[element] || ['ancient_arena'];
        theme = themes[Math.floor(Math.random() * themes.length)];
    }
    
    // Get theme data
    const themeData = typeof ROOM_THEMES !== 'undefined' ? ROOM_THEMES[theme] : null;
    
    const room = {
        // Position & Size
        x: gridX,
        y: gridY,
        width: TOTAL_SIZE,
        height: TOTAL_SIZE,
        floorX: gridX + 1,
        floorY: gridY + 1,
        floorWidth: ROOM_SIZE,
        floorHeight: ROOM_SIZE,
        
        // Type & Theme
        type: roomType,
        theme: theme,
        shape: 'rectangle',
        
        // Element System
        element: element,
        elementPower: calculateElementPower(roomType),
        
        // Connectivity
        doorways: [],
        connectedRooms: [],
        
        // State
        generated: false,
        explored: false,
        cleared: false,
        
        // Visual (from theme)
        floorColor: themeData?.floorColor || '#4a4a4a',
        wallColor: themeData?.wallColor || '#2a2a2a',
        accentColor: themeData?.accentColor || '#666666',
        ambientLight: themeData?.ambientLight || 1.0
    };
    
    if (ROOM_CONFIG.debugLogging) {
        console.log(`[RoomGen] Created ${roomType} room at (${gridX}, ${gridY}) - ${element}/${theme}`);
    }
    
    return room;
}

/**
 * Select element for a room based on adjacent rooms
 */
function selectRoomElement(adjacentRooms) {
    const elements = ['fire', 'ice', 'water', 'earth', 'nature', 'death', 'arcane', 'dark', 'holy', 'physical'];
    
    // If no adjacent rooms, pick random
    if (!adjacentRooms || adjacentRooms.length === 0) {
        return elements[Math.floor(Math.random() * elements.length)];
    }
    
    // Weight toward adjacent elements if spread is enabled
    if (ROOM_CONFIG.elementSpread) {
        const weights = {};
        elements.forEach(e => weights[e] = 1);
        
        for (const adj of adjacentRooms) {
            if (adj.element) {
                // Same element: high weight
                weights[adj.element] = (weights[adj.element] || 1) + 3;
                
                // Complementary elements: medium weight
                if (typeof ELEMENTS !== 'undefined' && ELEMENTS[adj.element]?.complements) {
                    for (const comp of ELEMENTS[adj.element].complements) {
                        weights[comp] = (weights[comp] || 1) + 2;
                    }
                }
                
                // Opposed elements: low weight (but not zero - creates tension)
                if (typeof ELEMENTS !== 'undefined' && ELEMENTS[adj.element]?.opposedBy) {
                    for (const opp of ELEMENTS[adj.element].opposedBy) {
                        weights[opp] = Math.max(0.5, (weights[opp] || 1) - 1);
                    }
                }
            }
        }
        
        // Weighted random selection
        const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0);
        let roll = Math.random() * totalWeight;
        
        for (const element of elements) {
            roll -= weights[element];
            if (roll <= 0) {
                return element;
            }
        }
    }
    
    return elements[Math.floor(Math.random() * elements.length)];
}

/**
 * Calculate element power based on room type
 */
function calculateElementPower(roomType) {
    const powerByType = {
        'entrance': 1,
        'combat': 2,
        'treasure': 2,
        'boss': 4,
        'shrine': 3,
        'special': 3
    };
    return powerByType[roomType] || 2;
}

// ============================================================================
// FLOOR TILE PLACEMENT
// ============================================================================

/**
 * Place floor tiles for a room
 */
function placeRoomFloorTiles(room) {
    if (room.generated) return;
    
    // Get theme data
    const themeData = typeof ROOM_THEMES !== 'undefined' ? ROOM_THEMES[room.theme] : null;
    
    // Place floor tiles
    for (let dy = 0; dy < room.floorHeight; dy++) {
        for (let dx = 0; dx < room.floorWidth; dx++) {
            const x = room.floorX + dx;
            const y = room.floorY + dy;
            
            if (x < 0 || x >= GRID_WIDTH || y < 0 || y >= GRID_HEIGHT) continue;
            
            // Create floor tile with element info
            game.map[y][x] = {
                type: 'floor',
                room: room,
                element: room.element,
                floorColor: room.floorColor,
                accentColor: room.accentColor,
                // For special floor patterns
                isAccent: shouldBeAccentTile(dx, dy, room)
            };
        }
    }
    
    room.generated = true;
    
    if (ROOM_CONFIG.debugLogging) {
        console.log(`[RoomGen] Placed floor tiles for ${room.type} room (${room.element})`);
    }
}

/**
 * Determine if a tile should use accent color (for patterns)
 */
function shouldBeAccentTile(dx, dy, room) {
    // Checkerboard pattern for some themes
    if (['runic_vaults', 'sacred_shrine', 'ancient_arena'].includes(room.theme)) {
        return (dx + dy) % 2 === 0;
    }
    
    // Border accent
    if (dx === 0 || dy === 0 || dx === room.floorWidth - 1 || dy === room.floorHeight - 1) {
        return Math.random() < 0.3;
    }
    
    // Random accent tiles
    return Math.random() < 0.05;
}

// ============================================================================
// ROOM ELEMENT EFFECTS
// ============================================================================

/**
 * Get element effect when entity enters room
 */
function getRoomEnterEffect(room, entity) {
    if (!room?.element) return null;
    
    const effects = {
        fire: { message: 'The air shimmers with heat.', ambient: 'hot' },
        ice: { message: 'A bitter cold seeps into your bones.', ambient: 'cold' },
        water: { message: 'You hear the sound of dripping water.', ambient: 'damp' },
        earth: { message: 'The ground feels solid and ancient.', ambient: 'stable' },
        nature: { message: 'The scent of growth fills the air.', ambient: 'organic' },
        death: { message: 'A chill of dread washes over you.', ambient: 'deathly' },
        arcane: { message: 'Magical energy crackles around you.', ambient: 'magical' },
        dark: { message: 'Shadows seem to reach toward you.', ambient: 'dark' },
        holy: { message: 'A warm light fills this place.', ambient: 'holy' },
        physical: { message: 'This place has seen many battles.', ambient: 'martial' }
    };
    
    return effects[room.element] || null;
}

/**
 * Apply room element effect to entity (called each tick in room)
 */
function applyRoomElementEffect(room, entity, deltaTime) {
    if (!room?.element || !entity) return;
    
    // Only apply effects periodically
    entity._roomEffectTimer = (entity._roomEffectTimer || 0) + deltaTime;
    if (entity._roomEffectTimer < 5000) return; // Every 5 seconds
    entity._roomEffectTimer = 0;
    
    // Check attunement
    const attunement = typeof AttunementSystem !== 'undefined' 
        ? AttunementSystem.calculateAttunement(entity, room.element)
        : 0;
    
    // High attunement provides benefits
    if (attunement >= 75) {
        // Regenerate 1% HP
        const regen = Math.ceil(entity.maxHp * 0.01);
        entity.hp = Math.min(entity.maxHp, entity.hp + regen);
    }
    
    // Low attunement in opposed room causes minor damage
    if (attunement < 10 && room.elementPower >= 3) {
        // Small chip damage
        entity.hp -= 1;
    }
}

// ============================================================================
// ROOM ADJACENCY
// ============================================================================

/**
 * Get attunement modifier for adjacent room transitions
 */
function getAdjacentRoomModifier(fromRoom, toRoom) {
    if (!fromRoom?.element || !toRoom?.element) return 1.0;
    
    // Same element: bonus
    if (fromRoom.element === toRoom.element) {
        return 1.1;
    }
    
    // Check element relationships
    if (typeof isOpposed === 'function' && isOpposed(fromRoom.element, toRoom.element)) {
        return 0.9; // Small penalty for opposing
    }
    
    if (typeof isComplementary === 'function' && isComplementary(fromRoom.element, toRoom.element)) {
        return 1.05; // Small bonus for complementary
    }
    
    return 1.0;
}

// ============================================================================
// ROOM TYPE GENERATION
// ============================================================================

/**
 * Generate room type based on position in dungeon
 */
function determineRoomType(roomIndex, totalRooms, floorNumber) {
    // First room is always entrance
    if (roomIndex === 0) return 'entrance';
    
    // Last room has higher chance of boss/treasure
    if (roomIndex === totalRooms - 1) {
        if (floorNumber % 5 === 0) return 'boss';
        return Math.random() < 0.5 ? 'treasure' : 'combat';
    }
    
    // Random room types for middle rooms
    const roll = Math.random();
    if (roll < 0.6) return 'combat';
    if (roll < 0.75) return 'treasure';
    if (roll < 0.85) return 'shrine';
    return 'special';
}

// ============================================================================
// VALID SPAWN TILES
// ============================================================================

/**
 * Get valid tiles for spawning entities in a room
 */
function getValidSpawnTiles(room, margin = 2) {
    const tiles = [];
    
    for (let dy = margin; dy < room.floorHeight - margin; dy++) {
        for (let dx = margin; dx < room.floorWidth - margin; dx++) {
            const x = room.floorX + dx;
            const y = room.floorY + dy;
            
            const tile = game.map[y]?.[x];
            if (tile?.type === 'floor' && !tile.blocked) {
                // Check for decorations
                if (typeof hasBlockingDecorationAt === 'function' && hasBlockingDecorationAt(x, y)) {
                    continue;
                }
                tiles.push({ x, y });
            }
        }
    }
    
    return tiles;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.ROOM_CONFIG = ROOM_CONFIG;
    window.ELEMENT_THEMES = ELEMENT_THEMES;
    window.THEME_ELEMENTS = THEME_ELEMENTS;
    window.generateRectangularRoom = generateRectangularRoom;
    window.selectRoomElement = selectRoomElement;
    window.placeRoomFloorTiles = placeRoomFloorTiles;
    window.getRoomEnterEffect = getRoomEnterEffect;
    window.applyRoomElementEffect = applyRoomElementEffect;
    window.getAdjacentRoomModifier = getAdjacentRoomModifier;
    window.determineRoomType = determineRoomType;
    window.getValidSpawnTiles = getValidSpawnTiles;
}

console.log('✅ Room generator loaded (with element assignment)');
