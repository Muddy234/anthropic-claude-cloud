// ============================================================================
// SPRITE LOADER - The Shifting Chasm
// ============================================================================
// Pre-loads and caches monster sprite images
// Issue #8: Added fallback sprites and retry logic for failed loads
// ============================================================================

/**
 * Sprite image cache
 * Structure: { 'MonsterName': { 'animationType': Image } }
 */
const SPRITE_CACHE = {};

/**
 * Fallback sprite cache (generated placeholder sprites)
 */
const FALLBACK_SPRITES = {};

/**
 * Tracks loading status
 */
const SPRITE_LOADER_STATUS = {
    isLoading: false,
    isReady: false,
    totalSprites: 0,
    loadedSprites: 0,
    failedSprites: [],
    retriedSprites: []
};

/**
 * Configuration for sprite loading
 */
const SPRITE_LOADER_CONFIG = {
    MAX_RETRIES: 3,              // Number of retry attempts
    RETRY_DELAY_MS: 500,         // Delay between retries
    FALLBACK_SIZE: 32,           // Size of fallback sprite (matches 32x32 sprite design)
    SPRITE_SIZE: 32,             // Expected sprite size (32x32 for new sprites)
    FALLBACK_COLOR1: '#FF00FF',  // Magenta for checkerboard
    FALLBACK_COLOR2: '#000000',  // Black for checkerboard
    DEFAULT_BASE_PATH: 'assets/sprites'  // Default path for sprite images
};

/**
 * Generate a fallback placeholder sprite (magenta checkerboard pattern)
 * This makes missing sprites obvious during development
 * @param {number} width - Sprite width
 * @param {number} height - Sprite height
 * @returns {HTMLCanvasElement} Fallback sprite as canvas
 */
function generateFallbackSprite(width = 32, height = 32) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    const tileSize = 4;

    for (let y = 0; y < height; y += tileSize) {
        for (let x = 0; x < width; x += tileSize) {
            const isEven = ((x / tileSize) + (y / tileSize)) % 2 === 0;
            ctx.fillStyle = isEven ? SPRITE_LOADER_CONFIG.FALLBACK_COLOR1 : SPRITE_LOADER_CONFIG.FALLBACK_COLOR2;
            ctx.fillRect(x, y, tileSize, tileSize);
        }
    }

    // Add "?" in center to indicate missing sprite
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `bold ${Math.floor(Math.min(width, height) * 0.6)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', width / 2, height / 2);

    return canvas;
}

/**
 * Get or create a fallback sprite of specified size
 * @param {number} width - Sprite width
 * @param {number} height - Sprite height
 * @returns {HTMLCanvasElement} Fallback sprite
 */
function getFallbackSprite(width = 32, height = 32) {
    const key = `${width}x${height}`;
    if (!FALLBACK_SPRITES[key]) {
        FALLBACK_SPRITES[key] = generateFallbackSprite(width, height);
        console.log(`[SpriteLoader] Generated fallback sprite: ${key}`);
    }
    return FALLBACK_SPRITES[key];
}

/**
 * Load a single sprite with retry logic
 * @param {string} monsterName - Monster name
 * @param {string} animType - Animation type
 * @param {string} spritePath - Path to sprite
 * @param {number} attempt - Current attempt number
 * @returns {Promise} Resolves when sprite is loaded (or fallback is used)
 */
function loadSpriteWithRetry(monsterName, animType, spritePath, attempt = 1) {
    return new Promise((resolve) => {
        const img = new Image();

        img.onload = () => {
            SPRITE_CACHE[monsterName][animType] = img;
            SPRITE_LOADER_STATUS.loadedSprites++;

            if (attempt > 1) {
                console.log(`[SpriteLoader] Loaded on retry ${attempt}: ${monsterName} - ${animType}`);
                SPRITE_LOADER_STATUS.retriedSprites.push(`${monsterName}/${animType} (attempt ${attempt})`);
            } else {
                console.log(`[SpriteLoader] Loaded: ${monsterName} - ${animType}`);
            }
            resolve({ success: true, monsterName, animType });
        };

        img.onerror = () => {
            if (attempt < SPRITE_LOADER_CONFIG.MAX_RETRIES) {
                // Retry after delay
                console.warn(`[SpriteLoader] Retry ${attempt}/${SPRITE_LOADER_CONFIG.MAX_RETRIES}: ${spritePath}`);
                setTimeout(() => {
                    loadSpriteWithRetry(monsterName, animType, spritePath, attempt + 1)
                        .then(resolve);
                }, SPRITE_LOADER_CONFIG.RETRY_DELAY_MS * attempt); // Exponential backoff
            } else {
                // All retries failed - use fallback sprite
                const errorMsg = `Failed after ${SPRITE_LOADER_CONFIG.MAX_RETRIES} attempts: ${spritePath}`;
                SPRITE_LOADER_STATUS.failedSprites.push({ path: spritePath, monster: monsterName, anim: animType });
                console.error(`[SpriteLoader] ${errorMsg} - Using fallback sprite`);

                // Create fallback sprite and store it
                const fallback = getFallbackSprite(
                    SPRITE_LOADER_CONFIG.FALLBACK_SIZE,
                    SPRITE_LOADER_CONFIG.FALLBACK_SIZE
                );
                SPRITE_CACHE[monsterName][animType] = fallback;
                SPRITE_CACHE[monsterName][`${animType}_isFallback`] = true;

                resolve({ success: false, monsterName, animType, usedFallback: true });
            }
        };

        img.src = spritePath;
    });
}

/**
 * Load all monster sprites into cache
 * Should be called during game initialization
 * Issue #8: Now includes retry logic and fallback sprites
 */
function loadMonsterSprites() {
    SPRITE_LOADER_STATUS.isLoading = true;
    SPRITE_LOADER_STATUS.isReady = false;
    SPRITE_LOADER_STATUS.loadedSprites = 0;
    SPRITE_LOADER_STATUS.failedSprites = [];
    SPRITE_LOADER_STATUS.retriedSprites = [];
    SPRITE_LOADER_STATUS.totalSprites = 0;

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

            const promise = loadSpriteWithRetry(monsterName, animType, spritePath);
            loadPromises.push(promise);
        }
    }

    // Wait for all sprites to load (or fail with fallback)
    Promise.all(loadPromises).then((results) => {
        SPRITE_LOADER_STATUS.isLoading = false;
        SPRITE_LOADER_STATUS.isReady = true;

        const successCount = results.filter(r => r.success).length;
        const fallbackCount = results.filter(r => r.usedFallback).length;

        console.log('[SpriteLoader] Loading Complete:');
        console.log(`   Total: ${SPRITE_LOADER_STATUS.totalSprites}`);
        console.log(`   Loaded: ${successCount}`);

        if (SPRITE_LOADER_STATUS.retriedSprites.length > 0) {
            console.log(`   Retried: ${SPRITE_LOADER_STATUS.retriedSprites.length}`);
        }

        if (fallbackCount > 0) {
            console.warn(`   Using Fallbacks: ${fallbackCount}`);
            SPRITE_LOADER_STATUS.failedSprites.forEach(err => {
                console.warn(`     - ${err.path}`);
            });
        }
    });
}

/**
 * Get cached sprite image for a monster animation
 * Issue #8: Now returns fallback sprite if original failed to load
 * @param {string} monsterName - Name of the monster
 * @param {string} animationType - Animation type ('run', 'attack', 'hurt', 'death')
 * @param {boolean} allowFallback - If true, returns fallback sprite instead of null
 * @returns {Image|HTMLCanvasElement|null} Cached sprite image, fallback, or null
 */
function getMonsterSprite(monsterName, animationType, allowFallback = true) {
    if (!SPRITE_CACHE[monsterName]) {
        if (allowFallback) {
            console.warn(`[SpriteLoader] No sprites for monster: ${monsterName} - returning fallback`);
            return getFallbackSprite();
        }
        return null;
    }

    const sprite = SPRITE_CACHE[monsterName][animationType];
    if (sprite) return sprite;

    if (allowFallback) {
        console.warn(`[SpriteLoader] No animation '${animationType}' for ${monsterName} - returning fallback`);
        return getFallbackSprite();
    }
    return null;
}

/**
 * Check if a sprite is a fallback (missing original)
 * @param {string} monsterName - Name of the monster
 * @param {string} animationType - Animation type
 * @returns {boolean} True if using fallback sprite
 */
function isFallbackSprite(monsterName, animationType) {
    if (!SPRITE_CACHE[monsterName]) return true;
    return SPRITE_CACHE[monsterName][`${animationType}_isFallback`] === true;
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
    window.FALLBACK_SPRITES = FALLBACK_SPRITES;
    window.SPRITE_LOADER_STATUS = SPRITE_LOADER_STATUS;
    window.SPRITE_LOADER_CONFIG = SPRITE_LOADER_CONFIG;
    window.loadMonsterSprites = loadMonsterSprites;
    window.getMonsterSprite = getMonsterSprite;
    window.getFallbackSprite = getFallbackSprite;
    window.isFallbackSprite = isFallbackSprite;
    window.areSpritesReady = areSpritesReady;
    window.getSpriteLoadingProgress = getSpriteLoadingProgress;
    window.hasLoadedSprites = hasLoadedSprites;
}

console.log('[SpriteLoader] Sprite loader initialized (with retry and fallback support)');
