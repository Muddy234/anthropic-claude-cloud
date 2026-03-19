// ============================================================================
// STAT MODIFIER STACK - The Shifting Chasm
// ============================================================================
// Tracks a base stat value with additive and multiplicative modifiers.
// Used by boon system, equipment, and status effects for clean stat management.
// Guarantees correct values regardless of modifier add/remove order.
// ============================================================================

class StatModifierStack {
    constructor(baseValue) {
        this.base = baseValue;
        this.additiveModifiers = [];    // [{ id, value, source }]
        this.multiplicativeModifiers = []; // [{ id, value, source }]
    }

    /**
     * Add a modifier to the stack
     * @param {string} id - Unique identifier for this modifier
     * @param {number} value - Modifier value (additive: flat amount, multiplicative: percentage)
     * @param {string} type - 'additive' or 'multiplicative'
     * @param {string} [source] - Optional source identifier (e.g., 'boon:flame_touched')
     */
    addModifier(id, value, type, source) {
        const mod = { id, value, source: source || '' };
        if (type === 'additive') {
            this.additiveModifiers.push(mod);
        } else if (type === 'multiplicative') {
            this.multiplicativeModifiers.push(mod);
        }
    }

    /**
     * Remove a modifier by ID
     * @param {string} id - Modifier ID to remove
     */
    removeModifier(id) {
        this.additiveModifiers = this.additiveModifiers.filter(m => m.id !== id);
        this.multiplicativeModifiers = this.multiplicativeModifiers.filter(m => m.id !== id);
    }

    /**
     * Remove all modifiers from a given source
     * @param {string} source - Source identifier to remove all modifiers for
     */
    removeBySource(source) {
        this.additiveModifiers = this.additiveModifiers.filter(m => m.source !== source);
        this.multiplicativeModifiers = this.multiplicativeModifiers.filter(m => m.source !== source);
    }

    /**
     * Check if a modifier with the given ID exists
     * @param {string} id - Modifier ID
     * @returns {boolean}
     */
    hasModifier(id) {
        return this.additiveModifiers.some(m => m.id === id) ||
               this.multiplicativeModifiers.some(m => m.id === id);
    }

    /**
     * Compute the final stat value
     * Order: base + all additive, then * (1 + sum of multiplicative / 100)
     * @returns {number}
     */
    compute() {
        // First apply all additive
        let total = this.base;
        for (const mod of this.additiveModifiers) {
            total += mod.value;
        }
        // Then apply all multiplicative (stacked additively with each other)
        let multiplier = 1.0;
        for (const mod of this.multiplicativeModifiers) {
            multiplier += mod.value / 100;
        }
        return total * multiplier;
    }

    /**
     * Create a deep copy of this stack (used for stat preview projections)
     * @returns {StatModifierStack}
     */
    clone() {
        const copy = new StatModifierStack(this.base);
        copy.additiveModifiers = this.additiveModifiers.map(m => ({ ...m }));
        copy.multiplicativeModifiers = this.multiplicativeModifiers.map(m => ({ ...m }));
        return copy;
    }

    /**
     * Update the base value (e.g., when leveling up)
     * @param {number} newBase
     */
    setBase(newBase) {
        this.base = newBase;
    }

    /**
     * Get a debug summary of all modifiers
     * @returns {Object}
     */
    getSummary() {
        return {
            base: this.base,
            computed: this.compute(),
            additive: [...this.additiveModifiers],
            multiplicative: [...this.multiplicativeModifiers]
        };
    }
}

window.StatModifierStack = StatModifierStack;

console.log('[StatModifierStack] Stat modifier stack loaded');
