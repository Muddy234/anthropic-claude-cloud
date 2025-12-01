// ============================================================================
// THE SHIFTING CHASM - ROOM ATTUNEMENT MATRIX
// ============================================================================
// Modifiers for entities based on their element vs the room's element
// Row = Entity Element, Column = Room Element
// Values: -0.20 to +0.25
// +0.25 = Native (matching element)
// +0.10 = Complementary
// -0.20 = Opposing
// 0 = Neutral
// ============================================================================

const ROOM_ATTUNEMENT_MATRIX = {
    fire: {
        fire: 0.25,
        ice: -0.20,
        water: -0.20,
        earth: 0.10,
        nature: 0.10,
        death: 0,
        arcane: 0.10,
        dark: 0,
        holy: 0,
        physical: 0
    },
    ice: {
        fire: -0.20,
        ice: 0.25,
        water: 0.10,
        earth: 0,
        nature: 0,
        death: 0,
        arcane: 0,
        dark: 0.10,
        holy: 0,
        physical: 0
    },
    water: {
        fire: 0.10,
        ice: 0.10,
        water: 0.25,
        earth: -0.20,
        nature: 0.10,
        death: 0,
        arcane: 0,
        dark: 0,
        holy: 0,
        physical: 0
    },
    earth: {
        fire: 0.10,
        ice: 0,
        water: -0.20,
        earth: 0.25,
        nature: 0,
        death: 0,
        arcane: 0.10,
        dark: 0.10,
        holy: 0,
        physical: 0.10
    },
    nature: {
        fire: -0.20,
        ice: 0,
        water: 0.10,
        earth: 0,
        nature: 0.25,
        death: -0.20,
        arcane: 0,
        dark: 0,
        holy: 0.10,
        physical: 0
    },
    death: {
        fire: 0,
        ice: 0,
        water: 0,
        earth: 0,
        nature: -0.20,
        death: 0.25,
        arcane: 0.10,
        dark: 0.10,
        holy: -0.20,
        physical: 0
    },
    arcane: {
        fire: 0.10,
        ice: 0,
        water: 0,
        earth: 0.10,
        nature: 0,
        death: 0.10,
        arcane: 0.25,
        dark: 0,
        holy: 0.10,
        physical: -0.20
    },
    dark: {
        fire: 0,
        ice: 0.10,
        water: 0,
        earth: 0.10,
        nature: 0,
        death: 0.10,
        arcane: 0,
        dark: 0.25,
        holy: -0.20,
        physical: 0
    },
    holy: {
        fire: 0,
        ice: 0,
        water: 0,
        earth: 0,
        nature: 0.10,
        death: -0.20,
        arcane: 0.10,
        dark: -0.20,
        holy: 0.25,
        physical: 0
    },
    physical: {
        fire: 0,
        ice: 0,
        water: 0,
        earth: 0.10,
        nature: 0,
        death: 0,
        arcane: -0.20,
        dark: 0,
        holy: 0,
        physical: 0.25
    },
    neutral: {
        fire: 0,
        ice: 0,
        water: 0,
        earth: 0,
        nature: 0,
        death: 0,
        arcane: 0,
        dark: 0,
        holy: 0,
        physical: 0
    }
};

// ============================================================================
// ATTUNEMENT CATEGORIES
// ============================================================================

const ATTUNEMENT_CATEGORIES = {
    NATIVE: 0.25,      // Entity in matching element room
    COMPLEMENTARY: 0.10, // Entity in friendly element room
    NEUTRAL: 0,        // No special relationship
    OPPOSING: -0.20    // Entity in hostile element room
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get room attunement modifier for entity in room
 * @param {string|null} entityElement - Entity's element (null = neutral)
 * @param {string|null} roomElement - Room's element (null = neutral)
 * @returns {number} Modifier (-0.20 to +0.25)
 */
function getRoomAttunementModifier(entityElement, roomElement) {
    if (!entityElement || !roomElement) return 0;
    
    const entity = entityElement || 'neutral';
    const room = roomElement || 'neutral';
    
    const modifier = ROOM_ATTUNEMENT_MATRIX[entity]?.[room];
    
    if (modifier === undefined) {
        console.warn(`[RoomAttunement] Unknown matchup: ${entity} in ${room} room`);
        return 0;
    }
    
    return modifier;
}

/**
 * Get attunement category for entity in room
 * @param {string|null} entityElement - Entity's element
 * @param {string|null} roomElement - Room's element
 * @returns {string} Category: 'native', 'complementary', 'neutral', or 'opposing'
 */
function getAttunementCategory(entityElement, roomElement) {
    const modifier = getRoomAttunementModifier(entityElement, roomElement);
    
    if (modifier >= ATTUNEMENT_CATEGORIES.NATIVE) return 'native';
    if (modifier >= ATTUNEMENT_CATEGORIES.COMPLEMENTARY) return 'complementary';
    if (modifier <= ATTUNEMENT_CATEGORIES.OPPOSING) return 'opposing';
    return 'neutral';
}

/**
 * Check if entity is native to room element
 * @param {string} entityElement - Entity's element
 * @param {string} roomElement - Room's element
 * @returns {boolean} True if native (matching elements)
 */
function isNativeToRoom(entityElement, roomElement) {
    return entityElement === roomElement;
}

/**
 * Get all rooms where entity has bonus
 * @param {string} entityElement - Entity's element
 * @returns {string[]} Array of room elements with positive modifier
 */
function getBonusRooms(entityElement) {
    const row = ROOM_ATTUNEMENT_MATRIX[entityElement];
    if (!row) return [];
    
    return Object.entries(row)
        .filter(([room, mod]) => mod > 0)
        .map(([room]) => room);
}

/**
 * Get all rooms where entity has penalty
 * @param {string} entityElement - Entity's element
 * @returns {string[]} Array of room elements with negative modifier
 */
function getPenaltyRooms(entityElement) {
    const row = ROOM_ATTUNEMENT_MATRIX[entityElement];
    if (!row) return [];
    
    return Object.entries(row)
        .filter(([room, mod]) => mod < 0)
        .map(([room]) => room);
}

/**
 * Format room attunement modifier for display
 * @param {number} modifier - The modifier value
 * @returns {string} Formatted string like "+25%" or "-20%"
 */
function formatRoomModifier(modifier) {
    if (modifier === 0) return '0%';
    const sign = modifier > 0 ? '+' : '';
    return `${sign}${Math.round(modifier * 100)}%`;
}

// ============================================================================
// EXPORTS
// ============================================================================

window.ROOM_ATTUNEMENT_MATRIX = ROOM_ATTUNEMENT_MATRIX;
window.ATTUNEMENT_CATEGORIES = ATTUNEMENT_CATEGORIES;
window.getRoomAttunementModifier = getRoomAttunementModifier;
window.getAttunementCategory = getAttunementCategory;
window.isNativeToRoom = isNativeToRoom;
window.getBonusRooms = getBonusRooms;
window.getPenaltyRooms = getPenaltyRooms;
window.formatRoomModifier = formatRoomModifier;

console.log('[RoomAttunement] Loaded element vs room attunement matrix');