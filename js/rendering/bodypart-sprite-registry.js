// ============================================================================
// BODYPART SPRITE REGISTRY - Central registry for layered sprite sets
// ============================================================================
// All sprite sets register themselves here on load.
// Renderers look up sprite data by name.
//
// Usage:
//   BodypartSpriteRegistry.register('humanoid_base', BODY_PART_SPRITES);
//   const renderer = new BodypartRenderer('humanoid_base');
// ============================================================================

const BodypartSpriteRegistry = {
    _sets: {},

    register(name, spriteData) {
        this._sets[name] = spriteData;
        console.log(`  Registered bodypart sprite set: '${name}'`);
    },

    get(name) {
        return this._sets[name] || null;
    },

    has(name) {
        return name in this._sets;
    },

    list() {
        return Object.keys(this._sets);
    }
};

// Export for browser and Node.js
if (typeof window !== 'undefined') {
    window.BodypartSpriteRegistry = BodypartSpriteRegistry;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BodypartSpriteRegistry };
}
