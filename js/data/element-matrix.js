// ============================================================================
// THE SHIFTING CHASM - ELEMENT VS ELEMENT MATRIX
// ============================================================================
// Damage modifiers when elemental attacker hits elemental defender
// Row = Attacker Element, Column = Defender Element
// Values: -0.30 (weak), 0 (neutral), +0.30 (strong)
// ============================================================================

const ELEMENT_MATRIX = {
    fire: {
        fire: 0,
        ice: 0.30,
        water: -0.30,
        earth: 0,
        nature: 0.30,
        death: 0,
        arcane: 0,
        dark: 0,
        holy: 0,
        physical: 0,
        neutral: 0
    },
    ice: {
        fire: -0.30,
        ice: 0,
        water: 0,
        earth: 0,
        nature: 0,
        death: 0,
        arcane: 0,
        dark: 0,
        holy: 0,
        physical: 0,
        neutral: 0
    },
    water: {
        fire: 0.30,
        ice: 0,
        water: 0,
        earth: 0.30,
        nature: 0,
        death: 0,
        arcane: 0,
        dark: 0,
        holy: 0,
        physical: 0,
        neutral: 0
    },
    earth: {
        fire: 0,
        ice: 0,
        water: -0.30,
        earth: 0,
        nature: 0.30,
        death: 0,
        arcane: 0,
        dark: 0,
        holy: 0,
        physical: 0,
        neutral: 0
    },
    nature: {
        fire: -0.30,
        ice: 0,
        water: 0,
        earth: -0.30,
        nature: 0,
        death: 0.30,
        arcane: 0,
        dark: 0,
        holy: 0,
        physical: 0,
        neutral: 0
    },
    death: {
        fire: 0,
        ice: 0,
        water: 0,
        earth: 0,
        nature: -0.30,
        death: 0,
        arcane: 0,
        dark: 0,
        holy: -0.30,
        physical: 0,
        neutral: 0
    },
    arcane: {
        fire: 0,
        ice: 0,
        water: 0,
        earth: 0,
        nature: 0,
        death: 0,
        arcane: 0,
        dark: 0,
        holy: 0,
        physical: 0.30,
        neutral: 0
    },
    dark: {
        fire: 0,
        ice: 0,
        water: 0,
        earth: 0,
        nature: 0,
        death: 0,
        arcane: 0,
        dark: 0,
        holy: -0.30,
        physical: 0,
        neutral: 0
    },
    holy: {
        fire: 0,
        ice: 0,
        water: 0,
        earth: 0,
        nature: 0,
        death: 0.30,
        arcane: 0,
        dark: 0.30,
        holy: 0,
        physical: 0,
        neutral: 0
    },
    physical: {
        fire: 0,
        ice: 0,
        water: 0,
        earth: 0,
        nature: 0,
        death: 0,
        arcane: -0.30,
        dark: 0,
        holy: 0,
        physical: 0,
        neutral: 0
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
        physical: 0,
        neutral: 0
    }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get damage modifier for element matchup
 * @param {string|null} attackerElement - Attacker's element (null = neutral)
 * @param {string|null} defenderElement - Defender's element (null = neutral)
 * @returns {number} Modifier (-0.30 to +0.30)
 */
function getElementModifier(attackerElement, defenderElement) {
    const attacker = attackerElement || 'neutral';
    const defender = defenderElement || 'neutral';
    
    const modifier = ELEMENT_MATRIX[attacker]?.[defender];
    
    if (modifier === undefined) {
        console.warn(`[ElementMatrix] Unknown element matchup: ${attacker} vs ${defender}`);
        return 0;
    }
    
    return modifier;
}

/**
 * Get elements that attacker deals bonus damage to
 * @param {string} attackerElement - Attacker's element
 * @returns {string[]} Array of defender elements that take +30% damage
 */
function getStrongAgainst(attackerElement) {
    const row = ELEMENT_MATRIX[attackerElement];
    if (!row) return [];
    
    return Object.entries(row)
        .filter(([element, mod]) => mod > 0)
        .map(([element]) => element);
}

/**
 * Get elements that attacker deals reduced damage to
 * @param {string} attackerElement - Attacker's element
 * @returns {string[]} Array of defender elements that take -30% damage
 */
function getWeakAgainst(attackerElement) {
    const row = ELEMENT_MATRIX[attackerElement];
    if (!row) return [];
    
    return Object.entries(row)
        .filter(([element, mod]) => mod < 0)
        .map(([element]) => element);
}

/**
 * Format modifier as percentage string for display
 * @param {number} modifier - The modifier value
 * @returns {string} Formatted string like "+30%" or "-30%"
 */
function formatElementModifier(modifier) {
    if (modifier === 0) return '0%';
    const sign = modifier > 0 ? '+' : '';
    return `${sign}${Math.round(modifier * 100)}%`;
}

// ============================================================================
// EXPORTS
// ============================================================================

window.ELEMENT_MATRIX = ELEMENT_MATRIX;
window.getElementModifier = getElementModifier;
window.getStrongAgainst = getStrongAgainst;
window.getWeakAgainst = getWeakAgainst;
window.formatElementModifier = formatElementModifier;

console.log('[ElementMatrix] Loaded element vs element damage matrix');