// ============================================================================
// SPRITE MANIFEST - Auto-generated list of sprite files
// ============================================================================
// Total sprites: 27
// ============================================================================

const SPRITE_MANIFEST = {
    files: [
        "ash_walker-sprite.js",
        "bone_golem-sprite.js",
        "cave_bat-sprite.js",
        "crystal_golem-sprite.js",
        "deep_crawler-sprite.js",
        "fire_bat-sprite.js",
        "frost_elemental-sprite.js",
        "frost_slime-sprite.js",
        "frozen_husk-sprite.js",
        "giant_spider-sprite.js",
        "ice_golem-sprite.js",
        "magma-slime-sprite.js",
        "magma_slime-sprite.js",
        "mushroom_sprite-sprite.js",
        "obsidian_golem-sprite.js",
        "phantom-sprite.js",
        "pyro_cultist-sprite.js",
        "salamander-sprite.js",
        "shadow_imp-sprite.js",
        "shadow_stalker-sprite.js",
        "shadow_wisp-sprite.js",
        "shield_bearer-sprite.js",
        "stone_golem-sprite.js",
        "temple_sentinel-sprite.js",
        "tide_serpent-sprite.js",
        "toxic_slime-sprite.js",
        "void_touched-sprite.js",
    ],
    count: 27
};

// Export for use
if (typeof window !== 'undefined') {
    window.SPRITE_MANIFEST = SPRITE_MANIFEST;
}

/**
 * Load all sprites from manifest
 * Call this after sprite-registry.js is loaded
 */
async function loadAllSprites() {
    if (!window.SpriteRegistry) {
        console.error('[SpriteManifest] SpriteRegistry not found!');
        return;
    }
    await window.SpriteRegistry.loadAllKnown(SPRITE_MANIFEST.files);
}

if (typeof window !== 'undefined') {
    window.loadAllSprites = loadAllSprites;
}

console.log('[SpriteManifest] 27 sprites available');
