// ============================================================================
// THE SHIFTING CHASM - ELEMENTS DATA
// ============================================================================
// 10 elements with properties, colors, and relationships
// ============================================================================

const ELEMENTS = {
    fire: {
        id: 'fire',
        name: 'Fire',
        color: '#ff6b35',
        theme: 'Heat, burning, volcanic',
        statusEffect: 'burning',
        opposedBy: ['ice', 'water'],
        complements: ['earth', 'arcane']
    },
    ice: {
        id: 'ice',
        name: 'Ice',
        color: '#74b9ff',
        theme: 'Cold, freezing',
        statusEffect: 'chilled',
        opposedBy: ['fire'],
        complements: ['water', 'dark']
    },
    water: {
        id: 'water',
        name: 'Water',
        color: '#0984e3',
        theme: 'Liquid, drowning, erosion',
        statusEffect: 'soaked',
        opposedBy: ['fire', 'earth'],
        complements: ['ice', 'nature']
    },
    earth: {
        id: 'earth',
        name: 'Earth',
        color: '#b37f4a',
        theme: 'Stone, stability',
        statusEffect: 'staggered',
        opposedBy: ['water', 'nature'],
        complements: ['fire', 'dark']
    },
    nature: {
        id: 'nature',
        name: 'Nature',
        color: '#00b894',
        theme: 'Growth, poison, life',
        statusEffect: 'poisoned',
        opposedBy: ['fire', 'death'],
        complements: ['water', 'holy']
    },
    death: {
        id: 'death',
        name: 'Death',
        color: '#636e72',
        theme: 'Undeath, draining, decay',
        statusEffect: 'withered',
        opposedBy: ['holy', 'nature'],
        complements: ['dark', 'arcane']
    },
    arcane: {
        id: 'arcane',
        name: 'Arcane',
        color: '#a55eea',
        theme: 'Raw magic, instability',
        statusEffect: 'destabilized',
        opposedBy: ['physical'],
        complements: ['fire', 'death']
    },
    dark: {
        id: 'dark',
        name: 'Dark',
        color: '#2d3436',
        theme: 'Shadow, stealth, void',
        statusEffect: 'blinded',
        opposedBy: ['holy'],
        complements: ['ice', 'death', 'earth']
    },
    holy: {
        id: 'holy',
        name: 'Holy',
        color: '#ffeaa7',
        theme: 'Light, smiting, sanctity',
        statusEffect: 'judged',
        opposedBy: ['dark', 'death'],
        complements: ['nature', 'arcane']
    },
    physical: {
        id: 'physical',
        name: 'Physical',
        color: '#dfe6e9',
        theme: 'Non-magical, mundane',
        statusEffect: null,
        opposedBy: ['arcane'],
        complements: ['earth']
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get element definition by ID
 * @param {string} id - Element ID
 * @returns {Object|null} Element definition or null
 */
function getElement(id) {
    return ELEMENTS[id] || null;
}

/**
 * Get element color for rendering
 * @param {string} id - Element ID
 * @returns {string} Hex color code
 */
function getElementColor(id) {
    return ELEMENTS[id]?.color || '#ffffff';
}

/**
 * Get element name for display
 * @param {string} id - Element ID
 * @returns {string} Element name
 */
function getElementName(id) {
    return ELEMENTS[id]?.name || 'Unknown';
}

/**
 * Check if two elements are opposed
 * @param {string} element1 - First element ID
 * @param {string} element2 - Second element ID
 * @returns {boolean} True if opposed
 */
function areElementsOpposed(element1, element2) {
    const el1 = ELEMENTS[element1];
    const el2 = ELEMENTS[element2];
    if (!el1 || !el2) return false;
    return el1.opposedBy.includes(element2) || el2.opposedBy.includes(element1);
}

/**
 * Check if two elements complement each other
 * @param {string} element1 - First element ID
 * @param {string} element2 - Second element ID
 * @returns {boolean} True if complementary
 */
function areElementsComplementary(element1, element2) {
    const el1 = ELEMENTS[element1];
    const el2 = ELEMENTS[element2];
    if (!el1 || !el2) return false;
    return el1.complements.includes(element2) || el2.complements.includes(element1);
}

/**
 * Get all element IDs
 * @returns {string[]} Array of element IDs
 */
function getAllElementIds() {
    return Object.keys(ELEMENTS);
}

/**
 * Get status effect for element
 * @param {string} id - Element ID
 * @returns {string|null} Status effect ID or null
 */
function getElementStatusEffect(id) {
    return ELEMENTS[id]?.statusEffect || null;
}

// ============================================================================
// EXPORTS
// ============================================================================

window.ELEMENTS = ELEMENTS;
window.getElement = getElement;
window.getElementColor = getElementColor;
window.getElementName = getElementName;
window.areElementsOpposed = areElementsOpposed;
window.areElementsComplementary = areElementsComplementary;
window.getAllElementIds = getAllElementIds;
window.getElementStatusEffect = getElementStatusEffect;

console.log('[Elements] Loaded 10 elements');