// ============================================================================
// HELPERS - General utility functions
// ============================================================================

/**
 * Converts item display name to underscore ID format.
 * Example: "Bat Wing" -> "bat_wing"
 * Used to resolve mismatch between monster loot names and ITEMS_DATA keys.
 * @param {string} displayName - The display name of the item
 * @returns {string} The normalized ID
 */
function normalizeItemId(displayName) {
    if (!displayName || typeof displayName !== 'string') return displayName;
    return displayName.toLowerCase().replace(/\s+/g, '_');
}

/**
 * Looks up item data with fallback through multiple sources.
 * Handles the name/ID mismatch between loot system and item registries.
 * @param {string} itemName - The item name (display name or ID)
 * @returns {Object|null} The item data or null if not found
 */
function getItemData(itemName) {
    if (!itemName) return null;

    const normalizedId = normalizeItemId(itemName);

    // Try equipment data first (for weapons/armor)
    if (typeof EQUIPMENT_DATA !== 'undefined') {
        if (EQUIPMENT_DATA[itemName]) return EQUIPMENT_DATA[itemName];
        if (EQUIPMENT_DATA[normalizedId]) return EQUIPMENT_DATA[normalizedId];
    }

    // Try items data (for materials/consumables)
    if (typeof ITEMS_DATA !== 'undefined') {
        if (ITEMS_DATA[itemName]) return ITEMS_DATA[itemName];
        if (ITEMS_DATA[normalizedId]) return ITEMS_DATA[normalizedId];
    }

    return null;
}

// Export to window
window.normalizeItemId = normalizeItemId;
window.getItemData = getItemData;
