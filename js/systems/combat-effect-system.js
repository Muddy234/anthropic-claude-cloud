// ============================================================================
// COMBAT EFFECT SYSTEM - The Shifting Chasm
// ============================================================================
// Manages combat visual effects: slash animations, magic effects, explosions
// Loads individual PNG frames and plays them as animations
// ============================================================================

// ============================================================================
// EFFECT SPRITE CACHE
// ============================================================================

/**
 * Cache for loaded effect sprites
 * Structure: { 'effectType_N': [Image, Image, ...] }
 */
const EFFECT_SPRITE_CACHE = {};

/**
 * Tracks effect sprite loading status
 */
const EFFECT_LOADER_STATUS = {
    isLoading: false,
    isReady: false,
    totalEffects: 0,
    loadedEffects: 0,
    failedEffects: []
};

// ============================================================================
// EFFECT CONFIGURATIONS
// ============================================================================

/**
 * Configuration for all combat effect types
 * Each effect type has variants (1-10 for slash/magic, 1-5 for explosion)
 */
const COMBAT_EFFECT_CONFIG = {
    // Melee slash effects (orange/red curved trails)
    // Note: Each variant has different file naming - see SLASH_FILE_PATTERNS
    slash: {
        basePath: 'assets/spritesheet/slash',
        variants: 10,
        fps: 24,
        defaultSize: 96,  // Display size in pixels
        offsetY: -0.3,    // Offset above target (in tiles)
        loop: false
    },

    // Magic spell effects (various colors)
    magic: {
        basePath: 'assets/spritesheet/magic_effect',
        variants: 10,
        framePattern: '{frame}.png',
        frameCount: 8,  // All variants have 8 frames (1.png to 8.png)
        frameStart: 1,
        frameDigits: 0,  // No padding (1.png, 2.png)
        fps: 16,
        defaultSize: 80,
        offsetY: -0.2,
        loop: false
    },

    // Explosion/impact effects
    explosion: {
        basePath: 'assets/spritesheet/explosion_effects',
        variants: 5,
        framePattern: '{frame}.png',
        frameCount: 9,  // All variants have 9 frames (1.png to 9.png)
        frameStart: 1,
        frameDigits: 0,
        fps: 20,
        defaultSize: 96,
        offsetY: -0.1,
        loop: false
    }
};

// Slash effects have inconsistent file naming per variant
// This maps each variant to its specific pattern
const SLASH_FILE_PATTERNS = {
    1:  { prefix: 'skash',           digits: 5, start: 1,  count: 12 },  // skash_00001.png
    2:  { prefix: 'slash2',          digits: 5, start: 1,  count: 12 },  // slash2_00001.png
    3:  { prefix: 'slash3',          digits: 5, start: 1,  count: 12 },  // slash3_00001.png
    4:  { prefix: 'slash4',          digits: 5, start: 1,  count: 12 },  // slash4_00001.png
    5:  { prefix: 'slash5-animation', digits: 2, start: 0, count: 12 },  // slash5-animation_00.png
    6:  { prefix: 'slash6',          digits: 5, start: 1,  count: 11 },  // slash6_00001.png (11 frames)
    7:  { prefix: 'slash7',          digits: 5, start: 1,  count: 6  },  // slash7_00001.png (6 frames)
    8:  { prefix: 'slash8',          digits: 5, start: 1,  count: 8  },  // slash8_00001.png (8 frames)
    9:  { prefix: 'slash9',          digits: 5, start: 1,  count: 9  },  // slash9_00001.png (9 frames)
    10: { prefix: 'slash10.spine',   digits: 2, start: 0,  count: 10 }   // slash10.spine_00.png
};

// Map effect types to visual categories for easy selection
// Each element uses ONE consistent variant for visual consistency
const EFFECT_MAPPINGS = {
    // Melee weapon attacks -> slash effects (by weapon/slashStyle)
    melee: {
        default:   { type: 'slash', variant: 1, scale: 1.0 },
        // Specific weapon types
        knife:     { type: 'slash', variant: 1, scale: 1.0 },   // Slash1 - small quick slashes
        sword:     { type: 'slash', variant: 1, scale: 1.4 },   // Slash1 - larger sword arcs
        mace:      { type: 'slash', variant: 5, scale: 1.2 },   // Slash5 - heavy impact
        polearm:   { type: 'slash', variant: 9, scale: 1.3 },   // Slash9 - long thrust/sweep
        axe:       { type: 'slash', variant: 5, scale: 1.3 },   // Slash5 - chopping motion
        unarmed:   { type: 'slash', variant: 1, scale: 0.8 },   // Slash1 - small punches
        // Fallback by damage type
        blade:     { type: 'slash', variant: 1, scale: 1.2 },   // Generic blade
        blunt:     { type: 'slash', variant: 5, scale: 1.2 },   // Generic blunt
        pierce:    { type: 'slash', variant: 9, scale: 1.2 }    // Generic pierce
    },

    // Magic attacks -> magic effects (one variant per element for consistency)
    magic: {
        default: { type: 'magic', variant: 1 },
        fire: { type: 'magic', variant: 3 },       // Orange/red effect
        ice: { type: 'magic', variant: 1 },        // Blue/white effect
        lightning: { type: 'magic', variant: 2 },  // Yellow effect
        arcane: { type: 'magic', variant: 5 },     // Purple effect
        nature: { type: 'magic', variant: 4 },     // Green effect
        dark: { type: 'magic', variant: 7 },       // Dark effect
        holy: { type: 'magic', variant: 8 },       // Light effect
        necromancy: { type: 'magic', variant: 7 }, // Dark (same as dark)
        water: { type: 'magic', variant: 6 }       // Blue effect
    },

    // Impact/hit effects -> explosion effects
    impact: {
        default: { type: 'explosion', variant: 1 },
        fire: { type: 'explosion', variant: 2 },   // Fire explosion
        death: { type: 'explosion', variant: 1 }   // Green/dark smoke
    }
};

// ============================================================================
// ACTIVE EFFECTS
// ============================================================================

/**
 * Array of currently playing effects
 */
const activeEffects = [];

// ============================================================================
// SPRITE LOADING
// ============================================================================

/**
 * Load all combat effect sprites
 * Should be called during game initialization
 */
function loadCombatEffectSprites() {
    // Prevent duplicate loading
    if (EFFECT_LOADER_STATUS.isLoading || EFFECT_LOADER_STATUS.isReady) {
        console.log('[CombatEffect] Sprites already loading or loaded, skipping');
        return;
    }

    EFFECT_LOADER_STATUS.isLoading = true;
    EFFECT_LOADER_STATUS.isReady = false;
    EFFECT_LOADER_STATUS.loadedEffects = 0;
    EFFECT_LOADER_STATUS.failedEffects = [];
    EFFECT_LOADER_STATUS.totalEffects = 0;

    const loadPromises = [];

    // Load each effect type
    for (const effectType in COMBAT_EFFECT_CONFIG) {
        const config = COMBAT_EFFECT_CONFIG[effectType];

        // Load each variant
        for (let variant = 1; variant <= config.variants; variant++) {
            const cacheKey = `${effectType}_${variant}`;
            EFFECT_SPRITE_CACHE[cacheKey] = [];

            // Determine frame count and start for this variant
            let frameCount, frameStart;
            if (effectType === 'slash') {
                // Use slash-specific patterns
                const pattern = SLASH_FILE_PATTERNS[variant];
                if (!pattern) continue;
                frameCount = pattern.count;
                frameStart = pattern.start;
            } else {
                frameCount = config.frameCount;
                frameStart = config.frameStart;
            }

            EFFECT_LOADER_STATUS.totalEffects += frameCount;

            // Load each frame
            for (let frame = frameStart; frame < frameStart + frameCount; frame++) {
                const promise = loadEffectFrame(effectType, variant, frame, config, cacheKey);
                loadPromises.push(promise);
            }
        }
    }

    // Wait for all sprites to load
    Promise.allSettled(loadPromises).then(() => {
        EFFECT_LOADER_STATUS.isLoading = false;
        EFFECT_LOADER_STATUS.isReady = true;

        console.log('✨ Combat Effect Sprites Loaded:');
        console.log(`   Loaded: ${EFFECT_LOADER_STATUS.loadedEffects}/${EFFECT_LOADER_STATUS.totalEffects}`);

        if (EFFECT_LOADER_STATUS.failedEffects.length > 0) {
            console.warn(`   Failed: ${EFFECT_LOADER_STATUS.failedEffects.length}`);
        }
    });
}

/**
 * Load a single effect frame
 */
function loadEffectFrame(effectType, variant, frame, config, cacheKey) {
    return new Promise((resolve, reject) => {
        // Build the path first
        let path;
        if (effectType === 'slash') {
            // Use variant-specific pattern from SLASH_FILE_PATTERNS
            const pattern = SLASH_FILE_PATTERNS[variant];
            if (!pattern) {
                reject(`No pattern for slash variant ${variant}`);
                return;
            }
            const paddedFrame = String(frame).padStart(pattern.digits, '0');
            path = `${config.basePath}${variant}/png/${pattern.prefix}_${paddedFrame}.png`;
        } else {
            // Format: assets/spritesheet/magic_effect/1/1.png
            path = `${config.basePath}/${variant}/${frame}.png`;
        }

        const img = new Image();

        img.onload = () => {
            // Store frame at correct index (account for variant-specific start)
            let frameStart = config.frameStart || 0;
            if (effectType === 'slash') {
                const pattern = SLASH_FILE_PATTERNS[variant];
                if (pattern) frameStart = pattern.start;
            }
            const frameIndex = frame - frameStart;
            EFFECT_SPRITE_CACHE[cacheKey][frameIndex] = img;
            EFFECT_LOADER_STATUS.loadedEffects++;
            resolve();
        };

        img.onerror = () => {
            const errorMsg = `Failed to load: ${path}`;
            EFFECT_LOADER_STATUS.failedEffects.push(errorMsg);
            console.error(`[CombatEffect] ${errorMsg}`);
            reject(errorMsg);
        };

        img.src = path;
    });
}

/**
 * Check if combat effect sprites are ready
 */
function areCombatEffectsReady() {
    return EFFECT_LOADER_STATUS.isReady;
}

// ============================================================================
// EFFECT SPAWNING
// ============================================================================

/**
 * Spawn a combat effect at a position
 * @param {string} category - Effect category ('melee', 'magic', 'impact')
 * @param {string} subType - Sub-type for variant selection (e.g., 'blade', 'fire')
 * @param {number} x - World X position (grid coords)
 * @param {number} y - World Y position (grid coords)
 * @param {Object} options - Additional options
 */
function spawnCombatEffect(category, subType, x, y, options = {}) {
    if (!EFFECT_LOADER_STATUS.isReady) {
        console.warn(`[CombatEffect] Sprites not ready yet`);
        return null;  // Effects not loaded yet
    }

    // Get effect mapping
    const mapping = EFFECT_MAPPINGS[category]?.[subType] || EFFECT_MAPPINGS[category]?.default;
    if (!mapping) {
        console.warn(`[CombatEffect] Unknown effect category/type: ${category}/${subType}`);
        return null;
    }

    // Use single consistent variant (not random)
    const variant = mapping.variant;

    const config = COMBAT_EFFECT_CONFIG[mapping.type];
    const cacheKey = `${mapping.type}_${variant}`;
    const frames = EFFECT_SPRITE_CACHE[cacheKey];

    if (!frames || frames.length === 0) {
        console.warn(`[CombatEffect] No frames for ${cacheKey}, loaded: ${EFFECT_LOADER_STATUS.loadedEffects}/${EFFECT_LOADER_STATUS.totalEffects}`);
        return null;  // No frames loaded for this effect
    }

    // Create the effect instance
    // Use mapping scale as default, allow options to override
    const effectScale = options.scale || mapping.scale || 1.0;

    const effect = {
        type: mapping.type,
        variant: variant,
        frames: frames,
        x: x,
        y: y + (config.offsetY || 0),
        currentFrame: 0,
        frameTimer: 0,
        fps: options.fps || config.fps,
        size: options.size || config.defaultSize,
        rotation: options.rotation || 0,
        scale: effectScale,
        alpha: 1.0,
        loop: config.loop,
        active: true,
        // Direction for slash effects
        direction: options.direction || 'right',
        // Color tint (optional)
        tint: options.tint || null
    };

    activeEffects.push(effect);
    return effect;
}

/**
 * Spawn a melee attack effect
 */
function spawnMeleeEffect(x, y, damageType, direction) {
    const subType = damageType || 'default';

    // Calculate rotation based on attack direction
    let rotation = 0;
    if (direction === 'up') rotation = -Math.PI / 2;
    else if (direction === 'down') rotation = Math.PI / 2;
    else if (direction === 'left') rotation = Math.PI;

    return spawnCombatEffect('melee', subType, x, y, {
        direction: direction,
        rotation: rotation
    });
}

/**
 * Spawn a magic spell effect
 */
function spawnMagicEffect(x, y, element) {
    const subType = element || 'default';
    return spawnCombatEffect('magic', subType, x, y, {
        scale: 1.2
    });
}

/**
 * Spawn an impact/explosion effect
 */
function spawnImpactEffect(x, y, element) {
    const subType = element || 'default';
    return spawnCombatEffect('impact', subType, x, y, {
        scale: 1.0
    });
}

// ============================================================================
// UPDATE LOOP
// ============================================================================

/**
 * Update all active combat effects
 * @param {number} deltaTime - Time since last frame in milliseconds
 */
function updateCombatEffects(deltaTime) {
    const dt = deltaTime / 1000;

    for (let i = activeEffects.length - 1; i >= 0; i--) {
        const effect = activeEffects[i];

        if (!effect.active) {
            activeEffects.splice(i, 1);
            continue;
        }

        // Update frame timer
        effect.frameTimer += dt;

        // Time per frame
        const frameTime = 1.0 / effect.fps;

        // Advance frame if enough time passed
        if (effect.frameTimer >= frameTime) {
            effect.frameTimer -= frameTime;
            effect.currentFrame++;

            // Check if animation complete
            if (effect.currentFrame >= effect.frames.length) {
                if (effect.loop) {
                    effect.currentFrame = 0;
                } else {
                    effect.active = false;
                    activeEffects.splice(i, 1);
                }
            }
        }

        // Fade out in last 20% of animation
        const progress = effect.currentFrame / effect.frames.length;
        if (progress > 0.8) {
            effect.alpha = (1 - progress) / 0.2;
        }
    }
}

// ============================================================================
// RENDERING
// ============================================================================

/**
 * Render all active combat effects
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} camX - Camera X position
 * @param {number} camY - Camera Y position
 * @param {number} tileSize - Tile size in pixels
 * @param {number} offsetX - Screen offset X (tracker width)
 */
function renderCombatEffects(ctx, camX, camY, tileSize, offsetX) {
    const trackerWidth = offsetX || 0;

    for (const effect of activeEffects) {
        if (!effect.active) continue;

        const frame = effect.frames[effect.currentFrame];
        if (!frame) continue;

        // Calculate screen position (centered on tile)
        const screenX = (effect.x - camX) * tileSize + trackerWidth + tileSize / 2;
        const screenY = (effect.y - camY) * tileSize + tileSize / 2;

        // Calculate display size
        const displaySize = effect.size * effect.scale;
        const halfSize = displaySize / 2;

        ctx.save();

        // Apply alpha
        ctx.globalAlpha = effect.alpha;

        // Translate to position
        ctx.translate(screenX, screenY);

        // Apply rotation
        if (effect.rotation) {
            ctx.rotate(effect.rotation);
        }

        // Flip horizontally for left-facing effects
        if (effect.direction === 'left') {
            ctx.scale(-1, 1);
        }

        // Draw the sprite frame
        ctx.drawImage(
            frame,
            -halfSize, -halfSize,
            displaySize, displaySize
        );

        ctx.restore();
    }
}

// ============================================================================
// SYSTEM MANAGER REGISTRATION
// ============================================================================

const CombatEffectSystemDef = {
    name: 'combat-effect-system',

    init(game) {
        // Start loading effect sprites
        loadCombatEffectSprites();
        console.log('✅ Combat Effect System initialized');
    },

    update(dt) {
        updateCombatEffects(dt);
    },

    cleanup() {
        activeEffects.length = 0;
    }
};

// Register with SystemManager (after combat system at priority 51)
if (typeof SystemManager !== 'undefined') {
    SystemManager.register('combat-effect-system', CombatEffectSystemDef, 51);
} else {
    console.warn('⚠️ SystemManager not found - combat-effect-system running standalone');
    // Start loading immediately if no SystemManager (only if not already loading)
    if (!EFFECT_LOADER_STATUS.isLoading && !EFFECT_LOADER_STATUS.isReady) {
        loadCombatEffectSprites();
    }
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    // Cache and status
    window.EFFECT_SPRITE_CACHE = EFFECT_SPRITE_CACHE;
    window.EFFECT_LOADER_STATUS = EFFECT_LOADER_STATUS;
    window.COMBAT_EFFECT_CONFIG = COMBAT_EFFECT_CONFIG;
    window.EFFECT_MAPPINGS = EFFECT_MAPPINGS;
    window.activeEffects = activeEffects;

    // Loading
    window.loadCombatEffectSprites = loadCombatEffectSprites;
    window.areCombatEffectsReady = areCombatEffectsReady;

    // Spawning
    window.spawnCombatEffect = spawnCombatEffect;
    window.spawnMeleeEffect = spawnMeleeEffect;
    window.spawnMagicEffect = spawnMagicEffect;
    window.spawnImpactEffect = spawnImpactEffect;

    // Update/Render
    window.updateCombatEffects = updateCombatEffects;
    window.renderCombatEffects = renderCombatEffects;
}

console.log('✅ Combat Effect System loaded');
