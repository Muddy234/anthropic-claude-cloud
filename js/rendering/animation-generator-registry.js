// ============================================================================
// ANIMATION GENERATOR REGISTRY
// ============================================================================
// Central registry for animation generator types (humanoid, slime, beast, etc.)
// Also centralizes monster-to-generator mappings so rendering code never needs
// modification when new generators are added.
//
// Defensive bootstrap: generators that load before this file can push to
// window.AnimationGeneratorRegistry._pending and they'll be flushed on init.
// ============================================================================

(function() {
    // Capture any pending registrations from generators that loaded first
    const pending = (window.AnimationGeneratorRegistry && window.AnimationGeneratorRegistry._pending) || [];
    const pendingMonsters = (window.AnimationGeneratorRegistry && window.AnimationGeneratorRegistry._pendingMonsters) || [];

    const AnimationGeneratorRegistry = {
        _generators: {},
        _monsters: {},

        // --- Generator registration ---
        register(typeName, generatorInstance) {
            this._generators[typeName] = generatorInstance;
        },

        get(typeName) {
            return this._generators[typeName] || null;
        },

        has(typeName) {
            return typeName in this._generators;
        },

        list() {
            return Object.keys(this._generators);
        },

        // --- Monster-to-generator mapping ---
        // Each entry: { generator: 'humanoid', skin: 'skeletal_warrior' }
        registerMonster(monsterName, config) {
            this._monsters[monsterName] = config;
        },

        getMonster(monsterName) {
            return this._monsters[monsterName] || null;
        },

        hasMonster(monsterName) {
            return monsterName in this._monsters;
        },

        listMonsters() {
            return Object.keys(this._monsters);
        }
    };

    // Flush pending generator registrations
    for (const p of pending) {
        AnimationGeneratorRegistry.register(p.name, p.gen);
    }

    // Flush pending monster registrations
    for (const p of pendingMonsters) {
        AnimationGeneratorRegistry.registerMonster(p.name, p.config);
    }

    window.AnimationGeneratorRegistry = AnimationGeneratorRegistry;
})();

console.log('[AnimationGeneratorRegistry] Loaded');
