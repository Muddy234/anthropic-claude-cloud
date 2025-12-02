// ============================================================================
// SPRITE LOADER - The Shifting Chasm
// ============================================================================
// Pre-loads and caches monster sprite images
// ============================================================================

/**
 * Sprite image cache
 * Structure: { 'MonsterName': { 'animationType': Image } }
 */
const SPRITE_CACHE = {};

/**
 * Tracks loading status
 */
const SPRITE_LOADER_STATUS = {
    isLoading: false,
    isReady: false,
    totalSprites: 0,
    loadedSprites: 0,
    failedSprites: []
};

/**
 * Load all monster sprites into cache
 * Should be called during game initialization
 */
function loadMonsterSprites() {
    SPRITE_LOADER_STATUS.isLoading = true;
    SPRITE_LOADER_STATUS.isReady = false;
    SPRITE_LOADER_STATUS.loadedSprites = 0;
    SPRITE_LOADER_STATUS.failedSprites = [];

    const monsters = getAnimatedMonsters();
    const loadPromises = [];

    for (const monsterName of monsters) {
        const config = getMonsterAnimation(monsterName);
        if (!config) continue;

        SPRITE_CACHE[monsterName] = {};

        // Load each animation type
        for (const animType in config.animations) {
            const spritePath = getMonsterSpritePath(monsterName, animType);
            if (!spritePath) continue;

            SPRITE_LOADER_STATUS.totalSprites++;

            const promise = new Promise((resolve, reject) => {
                const img = new Image();

                img.onload = () => {
                    SPRITE_CACHE[monsterName][animType] = img;
                    SPRITE_LOADER_STATUS.loadedSprites++;
                    console.log(`✅ Loaded sprite: ${monsterName} - ${animType}`);
                    resolve();
                };

                img.onerror = () => {
                    const errorMsg = `Failed to load: ${spritePath}`;
                    SPRITE_LOADER_STATUS.failedSprites.push(errorMsg);
                    console.error(`❌ ${errorMsg}`);
                    reject(errorMsg);
                };

                img.src = spritePath;
            });

            loadPromises.push(promise);
        }
    }

    // Wait for all sprites to load (or fail)
    Promise.allSettled(loadPromises).then(() => {
        SPRITE_LOADER_STATUS.isLoading = false;
        SPRITE_LOADER_STATUS.isReady = true;

        console.log('🎨 Sprite Loading Complete:');
        console.log(`   Loaded: ${SPRITE_LOADER_STATUS.loadedSprites}/${SPRITE_LOADER_STATUS.totalSprites}`);

        if (SPRITE_LOADER_STATUS.failedSprites.length > 0) {
            console.warn(`   Failed: ${SPRITE_LOADER_STATUS.failedSprites.length}`);
            SPRITE_LOADER_STATUS.failedSprites.forEach(err => console.warn(`     - ${err}`));
        }
    });
}

/**
 * Get cached sprite image for a monster animation
 * @param {string} monsterName - Name of the monster
 * @param {string} animationType - Animation type ('run', 'attack', 'hurt', 'death')
 * @returns {Image|null} Cached sprite image or null if not loaded
 */
function getMonsterSprite(monsterName, animationType) {
    if (!SPRITE_CACHE[monsterName]) return null;
    return SPRITE_CACHE[monsterName][animationType] || null;
}

/**
 * Check if all sprites are loaded and ready
 * @returns {boolean} True if sprites are ready
 */
function areSpritesReady() {
    return SPRITE_LOADER_STATUS.isReady;
}

/**
 * Get loading progress as percentage
 * @returns {number} Progress from 0 to 100
 */
function getSpriteLoadingProgress() {
    if (SPRITE_LOADER_STATUS.totalSprites === 0) return 0;
    return Math.floor((SPRITE_LOADER_STATUS.loadedSprites / SPRITE_LOADER_STATUS.totalSprites) * 100);
}

/**
 * Check if a specific monster has sprites loaded
 * @param {string} monsterName - Name of the monster
 * @returns {boolean} True if monster sprites are loaded
 */
function hasLoadedSprites(monsterName) {
    return monsterName in SPRITE_CACHE && Object.keys(SPRITE_CACHE[monsterName]).length > 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.SPRITE_CACHE = SPRITE_CACHE;
    window.SPRITE_LOADER_STATUS = SPRITE_LOADER_STATUS;
    window.loadMonsterSprites = loadMonsterSprites;
    window.getMonsterSprite = getMonsterSprite;
    window.areSpritesReady = areSpritesReady;
    window.getSpriteLoadingProgress = getSpriteLoadingProgress;
    window.hasLoadedSprites = hasLoadedSprites;
}

console.log('✅ Sprite loader initialized');
