// ============================================================================
// SPRITE REGISTRY - Dynamic Sprite Loading System
// ============================================================================
// This file should be loaded BEFORE individual sprite files.
// Individual sprite files register themselves with this registry.
// Provides backward compatibility with MONSTER_SPRITES global.
// ============================================================================

const SpriteRegistry = {
    // Storage for all registered sprites
    _sprites: {},

    // Track loading status
    _loadedFiles: [],
    _pendingFiles: [],

    /**
     * Register a sprite definition
     * Called by individual sprite files when they load
     * @param {string} name - Sprite name (e.g., 'magma_slime')
     * @param {Object} spriteData - Sprite definition with pixels and palette
     */
    register(name, spriteData) {
        if (!name || !spriteData) {
            console.warn('[SpriteRegistry] Invalid registration attempt:', name);
            return;
        }

        // Normalize name to snake_case
        const normalizedName = name.toLowerCase().replace(/-/g, '_');

        this._sprites[normalizedName] = spriteData;

        // Also register under original name if different
        if (name !== normalizedName) {
            this._sprites[name] = spriteData;
        }

        console.log(`[SpriteRegistry] Registered: ${normalizedName}`);
    },

    /**
     * Get a sprite by name
     * @param {string} name - Sprite name
     * @returns {Object|null} Sprite definition or null
     */
    get(name) {
        const normalizedName = name.toLowerCase().replace(/-/g, '_');
        return this._sprites[normalizedName] || this._sprites[name] || null;
    },

    /**
     * Check if a sprite is registered
     * @param {string} name - Sprite name
     * @returns {boolean}
     */
    has(name) {
        const normalizedName = name.toLowerCase().replace(/-/g, '_');
        return normalizedName in this._sprites || name in this._sprites;
    },

    /**
     * Get all registered sprite names
     * @returns {string[]}
     */
    getNames() {
        // Return unique names (some sprites may be registered under multiple names)
        const names = new Set();
        for (const sprite of Object.values(this._sprites)) {
            if (sprite.name) names.add(sprite.name);
        }
        return Array.from(names);
    },

    /**
     * Get all sprites as an object (for MONSTER_SPRITES compatibility)
     * @returns {Object}
     */
    getAll() {
        // Return a clean object with unique sprites keyed by their name property
        const result = {};
        for (const [key, sprite] of Object.entries(this._sprites)) {
            // Use the sprite's own name property as the key
            const name = sprite.name || key;
            if (!result[name]) {
                result[name] = sprite;
            }
        }
        return result;
    },

    /**
     * Get count of registered sprites
     * @returns {number}
     */
    count() {
        return this.getNames().length;
    },

    /**
     * Clear all registered sprites
     */
    clear() {
        this._sprites = {};
        this._loadedFiles = [];
        console.log('[SpriteRegistry] Cleared all sprites');
    },

    /**
     * Dynamically load a sprite file
     * @param {string} filename - Filename (e.g., 'magma_slime-sprite.js')
     * @returns {Promise}
     */
    loadFile(filename) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = `assets/sprites/${filename}`;
            script.onload = () => {
                this._loadedFiles.push(filename);
                resolve(filename);
            };
            script.onerror = () => {
                console.error(`[SpriteRegistry] Failed to load: ${filename}`);
                reject(new Error(`Failed to load ${filename}`));
            };
            document.head.appendChild(script);
        });
    },

    /**
     * Load multiple sprite files
     * @param {string[]} filenames - Array of filenames
     * @returns {Promise}
     */
    async loadFiles(filenames) {
        const results = await Promise.allSettled(
            filenames.map(f => this.loadFile(f))
        );

        const loaded = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        console.log(`[SpriteRegistry] Loaded ${loaded}/${filenames.length} files (${failed} failed)`);

        return results;
    },

    /**
     * Auto-discover and load all sprite files from the server
     * Note: This requires a file list since browsers can't list directories
     * @param {string[]} knownFiles - List of known sprite filenames
     */
    async loadAllKnown(knownFiles) {
        console.log(`[SpriteRegistry] Loading ${knownFiles.length} sprite files...`);
        await this.loadFiles(knownFiles);
        this._updateGlobalReference();
    },

    /**
     * Update the global MONSTER_SPRITES reference
     * Called after loading sprites for backward compatibility
     */
    _updateGlobalReference() {
        window.MONSTER_SPRITES = this.getAll();
        console.log(`[SpriteRegistry] Updated MONSTER_SPRITES with ${this.count()} sprites`);
    }
};

// ============================================================================
// GLOBAL EXPORTS
// ============================================================================

// Initialize empty MONSTER_SPRITES for compatibility
window.MONSTER_SPRITES = window.MONSTER_SPRITES || {};

// Export the registry
window.SpriteRegistry = SpriteRegistry;

// ============================================================================
// AUTO-REGISTRATION HELPER
// ============================================================================
// Individual sprite files can call this to register themselves

/**
 * Helper function for sprite files to register themselves
 * @param {Object} spriteData - Sprite definition with name, pixels, palette
 */
window.registerSprite = function(spriteData) {
    if (spriteData && spriteData.name) {
        SpriteRegistry.register(spriteData.name, spriteData);
        // Update global reference immediately
        window.MONSTER_SPRITES[spriteData.name] = spriteData;
    }
};

// ============================================================================
// AUTO-DISCOVERY FOR LEGACY SPRITES
// ============================================================================
// Scans window for *_SPRITE variables and registers them automatically
// This provides backward compatibility with old sprite files

/**
 * Scan window for sprite definitions and register them
 * Call this after all sprite files have loaded
 */
window.discoverAndRegisterSprites = function() {
    let discovered = 0;

    for (const key in window) {
        // Look for variables ending in _SPRITE
        if (key.endsWith('_SPRITE') && key !== 'SPRITE_MANIFEST') {
            const sprite = window[key];

            // Validate it's a sprite definition
            if (sprite && typeof sprite === 'object' && sprite.name && sprite.pixels && sprite.palette) {
                if (!SpriteRegistry.has(sprite.name)) {
                    SpriteRegistry.register(sprite.name, sprite);
                    discovered++;
                }
            }
        }
    }

    if (discovered > 0) {
        console.log(`[SpriteRegistry] Auto-discovered ${discovered} legacy sprites`);
        SpriteRegistry._updateGlobalReference();
    }

    return discovered;
};

// Auto-discover on DOMContentLoaded (after all scripts load)
if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', function() {
        // Small delay to ensure all scripts have executed
        setTimeout(function() {
            window.discoverAndRegisterSprites();
        }, 100);
    });
}

console.log('[SpriteRegistry] Initialized - ready for sprite registration');
