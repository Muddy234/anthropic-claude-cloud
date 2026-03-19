// ============================================================================
// SEEDED RNG - The Shifting Chasm
// ============================================================================
// Provides reproducible random number generation for dungeon generation.
// Uses Mulberry32 algorithm for fast, high-quality pseudorandom numbers.
// ============================================================================

/**
 * SeededRNG - A seeded random number generator using Mulberry32
 *
 * Usage:
 *   const rng = new SeededRNG(12345);  // Create with seed
 *   const value = rng.random();        // Get random 0-1
 *   const int = rng.randomInt(1, 10);  // Get random int 1-10
 *   const item = rng.choose([a, b, c]); // Pick random item
 */
class SeededRNG {
    /**
     * Create a new SeededRNG instance
     * @param {number|string} seed - The seed value (number or string)
     */
    constructor(seed = null) {
        this.initialSeed = seed;
        this.setSeed(seed);
    }

    /**
     * Set or reset the seed
     * @param {number|string|null} seed - New seed value (null for random)
     */
    setSeed(seed) {
        if (seed === null || seed === undefined) {
            // Generate a random seed if none provided
            seed = Math.floor(Math.random() * 2147483647);
        }

        // Convert string seeds to numbers using a hash
        if (typeof seed === 'string') {
            seed = this._hashString(seed);
        }

        this.seed = seed >>> 0; // Ensure unsigned 32-bit integer
        this.state = this.seed;
        this.callCount = 0;
    }

    /**
     * Hash a string to a 32-bit integer
     * @private
     */
    _hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Mulberry32 PRNG algorithm
     * High-quality 32-bit PRNG with 2^32 period
     * @private
     */
    _mulberry32() {
        this.state += 0x6D2B79F5;
        let t = this.state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }

    /**
     * Get a random float between 0 (inclusive) and 1 (exclusive)
     * @returns {number} Random float [0, 1)
     */
    random() {
        this.callCount++;
        return this._mulberry32();
    }

    /**
     * Get a random integer between min (inclusive) and max (inclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random integer [min, max]
     */
    randomInt(min, max) {
        return Math.floor(this.random() * (max - min + 1)) + min;
    }

    /**
     * Get a random float between min (inclusive) and max (exclusive)
     * @param {number} min - Minimum value
     * @param {number} max - Maximum value
     * @returns {number} Random float [min, max)
     */
    randomFloat(min, max) {
        return this.random() * (max - min) + min;
    }

    /**
     * Return true with the given probability
     * @param {number} probability - Probability of returning true (0-1)
     * @returns {boolean}
     */
    chance(probability) {
        return this.random() < probability;
    }

    /**
     * Choose a random element from an array
     * @param {Array} array - Array to choose from
     * @returns {*} Random element or undefined if empty
     */
    choose(array) {
        if (!array || array.length === 0) return undefined;
        return array[Math.floor(this.random() * array.length)];
    }

    /**
     * Shuffle an array in-place using Fisher-Yates
     * @param {Array} array - Array to shuffle
     * @returns {Array} The shuffled array (same reference)
     */
    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    /**
     * Weighted random selection
     * @param {Array} items - Array of items
     * @param {Array} weights - Array of weights (same length as items)
     * @returns {*} Selected item
     */
    weightedChoice(items, weights) {
        if (!items || items.length === 0) return undefined;
        if (!weights || weights.length !== items.length) {
            return this.choose(items);
        }

        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let roll = this.random() * totalWeight;

        for (let i = 0; i < items.length; i++) {
            roll -= weights[i];
            if (roll <= 0) {
                return items[i];
            }
        }

        return items[items.length - 1];
    }

    /**
     * Get Gaussian/normal distribution random number
     * Uses Box-Muller transform
     * @param {number} mean - Mean of the distribution
     * @param {number} stdDev - Standard deviation
     * @returns {number} Random value from normal distribution
     */
    gaussian(mean = 0, stdDev = 1) {
        const u1 = this.random();
        const u2 = this.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
        return z0 * stdDev + mean;
    }

    /**
     * Clone this RNG at its current state
     * @returns {SeededRNG} A new RNG with the same state
     */
    clone() {
        const clone = new SeededRNG();
        clone.seed = this.seed;
        clone.initialSeed = this.initialSeed;
        clone.state = this.state;
        clone.callCount = this.callCount;
        return clone;
    }

    /**
     * Get the current state for serialization
     * @returns {Object} State object
     */
    getState() {
        return {
            seed: this.seed,
            initialSeed: this.initialSeed,
            state: this.state,
            callCount: this.callCount
        };
    }

    /**
     * Restore state from serialized data
     * @param {Object} stateData - State object from getState()
     */
    loadState(stateData) {
        this.seed = stateData.seed;
        this.initialSeed = stateData.initialSeed;
        this.state = stateData.state;
        this.callCount = stateData.callCount;
    }

    /**
     * Create a child RNG with a derived seed
     * Useful for subsystems that need independent but reproducible RNG
     * @param {string} name - Name to derive seed from
     * @returns {SeededRNG} New RNG with derived seed
     */
    child(name) {
        const derivedSeed = this._hashString(`${this.seed}_${name}`);
        return new SeededRNG(derivedSeed);
    }
}

// ============================================================================
// GLOBAL RNG INSTANCE
// ============================================================================

/**
 * Global generation RNG instance
 * Use this for all procedural generation to ensure reproducibility
 */
let GenerationRNG = new SeededRNG();

/**
 * Initialize generation RNG with a seed
 * @param {number|string|null} seed - Seed value (null for random)
 * @returns {number} The actual seed being used
 */
function initGenerationRNG(seed = null) {
    GenerationRNG = new SeededRNG(seed);

    if (typeof DUNGEON_CONFIG !== 'undefined' && DUNGEON_CONFIG.debugLogging) {
        console.log(`[SeededRNG] Initialized with seed: ${GenerationRNG.seed}`);
    }

    return GenerationRNG.seed;
}

/**
 * Get the current generation seed
 * @returns {number} Current seed
 */
function getGenerationSeed() {
    return GenerationRNG.seed;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.SeededRNG = SeededRNG;
    window.GenerationRNG = GenerationRNG;
    window.initGenerationRNG = initGenerationRNG;
    window.getGenerationSeed = getGenerationSeed;
}

console.log('[SeededRNG] Seeded random number generator loaded');
