// ============================================================================
// SPRITE INTEGRATION - Bridge between Enemy System and Pixel Sprite Renderer
// ============================================================================
// Maps monster names to sprite keys and provides helper functions for
// rendering enemies with the pixel art sprite system.
// ============================================================================

// Debug flag - set to true to log animation state changes (for troubleshooting)
const SPRITE_ANIMATION_DEBUG = true;

/**
 * Monster name to sprite key mapping
 * Maps display names (like "Magma Slime") to sprite keys (like "magma_slime")
 */
const MONSTER_SPRITE_MAP = {
    // Slimes
    'Magma Slime': 'magma_slime',
    'Ice Slime': 'ice_slime',

    // Spirits / Wisps
    'Cinder Wisp': 'cinder_wisp',
    'Frost Elemental': 'frost_elemental',
    'Blizzard Spirit': 'blizzard_spirit',
    'Flame Sprite': 'flame_sprite',

    // Golems
    'Obsidian Golem': 'obsidian_golem',
    'Stone Guardian': 'stone_guardian',
    'Ice Golem': 'ice_golem',
    'Bone Golem': 'bone_golem',

    // Humanoids
    'Skeletal Warrior': 'skeletal_warrior',
    'Skeleton': 'skeletal_warrior',  // Alias
    'Pyro Cultist': 'pyro_cultist',
    'Shadow Stalker': 'shadow_stalker',
    'Ash Walker': 'ash_walker',
    'Temple Sentinel': 'temple_sentinel',
    'Demon Knight': 'demon_knight',
    'Shield Bearer': 'shield_bearer',

    // Beasts
    'Cave Bat': 'cave_bat',
    'Flame Bat': 'flame_bat',
    'Crystal Spider': 'crystal_spider',
    'Giant Spider': 'giant_spider',
    'Salamander': 'salamander',
    'Stone Lurker': 'stone_lurker',
    'Mushroom Sprite': 'mushroom_sprite',

    // Aquatic
    'Deep Crawler': 'deep_crawler',
    'Tide Serpent': 'tide_serpent',

    // Undead
    'Phantom': 'phantom',
    'Ghost': 'phantom',  // Alias
    'Frozen Husk': 'frozen_husk',

    // Shadow / Dark
    'Shadow Imp': 'shadow_imp',
    'Void Touched': 'void_touched'
};

/**
 * Palette overrides for enemies using borrowed sprites
 * Allows reusing sprite definitions with different colors
 * Note: Most enemies now have dedicated sprites, so this is mainly for variants
 */
const ENEMY_PALETTE_OVERRIDES = {
    // Ice Slime variants with different tints
    'Frost Slime': {
        'O': '#AAEEFF',  // Lighter ice blue
        'S': '#5588AA',  // Lighter shadow
        'H': '#FFFFFF',
        'E': '#FFFFFF'
    }
};

/**
 * Get the pixel sprite definition for an enemy
 * @param {Object} enemy - Enemy object with name and facing properties
 * @returns {Object|null} Sprite definition or null if not found
 */
function getPixelSpriteForEnemy(enemy) {
    if (!enemy || !enemy.name) return null;

    // Check if SpriteRenderer and MONSTER_SPRITES are available
    if (typeof MONSTER_SPRITES === 'undefined') {
        return null;
    }

    // Look up the sprite key
    const spriteKey = MONSTER_SPRITE_MAP[enemy.name];
    if (!spriteKey) {
        return null;
    }

    // Get the sprite definition
    const sprite = MONSTER_SPRITES[spriteKey];
    if (!sprite) {
        return null;
    }

    // Check for palette overrides
    const paletteOverride = ENEMY_PALETTE_OVERRIDES[enemy.name];

    return {
        sprite: sprite,
        paletteOverride: paletteOverride || null
    };
}

/**
 * Determine if enemy sprite should be flipped horizontally
 * @param {Object} enemy - Enemy object with facing property
 * @returns {boolean} True if sprite should be flipped
 */
function shouldFlipSprite(enemy) {
    if (!enemy) return false;

    const facing = enemy.facing;

    // Handle string format facing
    if (typeof facing === 'string') {
        return facing === 'left';
    }

    // Handle object format facing
    if (facing && typeof facing === 'object') {
        return facing.x < 0;
    }

    return false;
}

/**
 * Get animated sprite data for an enemy including animation state
 * Main function to get the current animation frame for rendering
 * @param {Object} enemy - Enemy object with name, combat state, etc.
 * @returns {Object|null} Sprite data with animation info, or null if not found
 */
function getAnimatedSpriteForEnemy(enemy) {
    // Get base sprite data
    const spriteData = getPixelSpriteForEnemy(enemy);
    if (!spriteData) return null;

    // Get animation config for this monster
    const spriteKey = MONSTER_SPRITE_MAP[enemy.name];
    const animConfig = typeof MONSTER_ANIMATION_CONFIG !== 'undefined'
        ? MONSTER_ANIMATION_CONFIG[spriteKey]
        : null;

    if (!animConfig) return spriteData; // No animation config, return static

    // Check combat state - try both systems:
    // 1. combat-master.js uses entity.combat.attackAnimation
    // 2. enemy-ai.js uses entity.isWindingUp and entity.windupProgress directly
    let animState = null;

    // First check for direct enemy-ai.js windup properties (more common)
    if (enemy.isWindingUp && enemy.windupProgress !== undefined) {
        animState = {
            isWindup: true,
            inFlashPhase: enemy.windupProgress >= 0.7, // Flash in final 30%
            progress: enemy.windupProgress
        };
        if (SPRITE_ANIMATION_DEBUG) {
            // console.log(`[SpriteAnim] ${enemy.name} winding up: progress=${enemy.windupProgress.toFixed(2)}`);
        }
    }
    // Fall back to combat-master.js system
    else if (typeof getAttackAnimationState === 'function') {
        animState = getAttackAnimationState(enemy);
        if (SPRITE_ANIMATION_DEBUG && animState) {
            // console.log(`[SpriteAnim] ${enemy.name} combat-master state:`, animState);
        }
    }

    // Determine if we need animated frame or idle
    if (animState && (animState.isWindup || animState.inFlashPhase)) {
        // Attack animation active
        const attackType = animConfig.attack;
        const attackAnim = typeof ATTACK_ANIMATIONS !== 'undefined' ? ATTACK_ANIMATIONS[attackType] : null;

        if (attackAnim && typeof SpriteAnimator !== 'undefined') {
            const entityId = enemy.id || enemy.gridX + '_' + enemy.gridY;

            // Ensure attack animation is started (creates state if not exists)
            const existingState = SpriteAnimator.getAnimationState(entityId);
            if (!existingState || existingState.type !== 'attack') {
                // Start the attack animation
                SpriteAnimator.startAttackAnimation(entityId, attackType, 1000);
                if (SPRITE_ANIMATION_DEBUG) {
                    // console.log(`[SpriteAnim] Started attack animation for ${enemy.name}, type=${attackType}`);
                }
            }

            // Map progress to phase
            const progress = animState.progress || 0;
            const phaseInfo = SpriteAnimator.mapProgressToPhase(progress);

            if (SPRITE_ANIMATION_DEBUG) {
                // console.log(`[SpriteAnim] ${enemy.name} phase=${phaseInfo.phase}, phaseProgress=${phaseInfo.phaseProgress.toFixed(2)}`);
            }

            // Update animator state with current combat progress
            SpriteAnimator.updateFromCombatState(
                entityId,
                phaseInfo.phase,
                phaseInfo.phaseProgress
            );

            // Get animated frame with transforms
            const animResult = SpriteAnimator.getCurrentFrame(
                entityId,
                spriteData.sprite,
                attackAnim
            );

            // Handle both old format (just sprite) and new format ({sprite, transforms})
            const animatedSprite = animResult?.sprite || animResult;
            const transforms = animResult?.transforms || null;

            if (SPRITE_ANIMATION_DEBUG) {
                if (transforms) {
                    // console.log(`[SpriteAnim] ${enemy.name} transforms: vOffset=${transforms.verticalOffset}, scaleY=${transforms.scaleY}`);
                }
            }

            return {
                sprite: animatedSprite,
                paletteOverride: spriteData.paletteOverride,
                animationState: phaseInfo,
                // Pass transform properties for rendering
                verticalOffset: transforms?.verticalOffset || 0,
                horizontalOffset: transforms?.horizontalOffset || 0,
                scaleX: transforms?.scaleX || 1.0,
                scaleY: transforms?.scaleY || 1.0,
                paletteMod: transforms?.paletteMod || null
            };
        }
    }

    // Check for death animation
    if (enemy.dead || enemy.hp <= 0) {
        const entityId = enemy.id || enemy.gridX + '_' + enemy.gridY;

        // Start death animation if not already running
        if (typeof SpriteAnimator !== 'undefined' && !SpriteAnimator.isDeathAnimationComplete(entityId)) {
            const deathAnim = typeof DEATH_ANIMATIONS !== 'undefined' ? DEATH_ANIMATIONS[animConfig.death] : null;

            if (deathAnim) {
                // Check if death animation needs to be started
                const currentState = SpriteAnimator.getAnimationState(entityId);
                if (!currentState || currentState.type !== 'death') {
                    SpriteAnimator.startDeathAnimation(entityId, animConfig.death);
                }

                // Get death animation frame
                const animatedSprite = SpriteAnimator.getCurrentFrame(
                    entityId,
                    spriteData.sprite,
                    { death: deathAnim }
                );

                return {
                    sprite: animatedSprite,
                    paletteOverride: spriteData.paletteOverride,
                    isDeath: true,
                    deathComplete: SpriteAnimator.isDeathAnimationComplete(entityId)
                };
            }
        }
    }

    // Return with idle animation effects (vertical offset, pulsing, etc.)
    const entityId = enemy.id || enemy.gridX + '_' + enemy.gridY;

    // Clean up any completed attack animation before starting idle
    if (typeof SpriteAnimator !== 'undefined') {
        const currentState = SpriteAnimator.getAnimationState(entityId);
        if (currentState && currentState.type === 'attack') {
            // Attack is over, stop the animation
            SpriteAnimator.active.delete(entityId);
        }
    }

    // Ensure idle animation is running
    if (typeof SpriteAnimator !== 'undefined') {
        if (!SpriteAnimator.hasIdleAnimation(entityId) && animConfig.idle) {
            SpriteAnimator.startIdleAnimation(entityId, animConfig.idle);
        }

        return {
            sprite: spriteData.sprite,
            paletteOverride: spriteData.paletteOverride,
            verticalOffset: SpriteAnimator.getVerticalOffset(entityId),
            paletteModifier: SpriteAnimator.getPaletteModifier(entityId),
            scaleModifier: SpriteAnimator.getScaleModifier(entityId)
        };
    }

    return {
        sprite: spriteData.sprite,
        paletteOverride: spriteData.paletteOverride,
        verticalOffset: 0,
        paletteModifier: 1.0,
        scaleModifier: 1.0
    };
}

/**
 * Start death animation for a monster
 * @param {Object} enemy - Enemy object
 */
function startMonsterDeathAnimation(enemy) {
    if (!enemy || !enemy.name) return;

    const spriteKey = MONSTER_SPRITE_MAP[enemy.name];
    const animConfig = typeof MONSTER_ANIMATION_CONFIG !== 'undefined' ? MONSTER_ANIMATION_CONFIG[spriteKey] : null;
    if (!animConfig) return;

    if (typeof SpriteAnimator === 'undefined') return;

    const entityId = enemy.id || enemy.gridX + '_' + enemy.gridY;
    SpriteAnimator.startDeathAnimation(entityId, animConfig.death);
}

/**
 * Draw an enemy using the pixel sprite system
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} enemy - Enemy object
 * @param {number} screenX - Screen X position (top-left of tile)
 * @param {number} screenY - Screen Y position (top-left of tile)
 * @param {number} tileSize - Size of tiles in pixels
 * @param {Object} animatedData - Optional pre-computed animated sprite data from getAnimatedSpriteForEnemy()
 * @returns {boolean} True if sprite was drawn, false to use fallback
 */
function drawPixelSprite(ctx, enemy, screenX, screenY, tileSize, animatedData = null) {
    // Check if SpriteRenderer is available
    if (typeof SpriteRenderer === 'undefined') {
        return false;
    }

    // Get sprite definition for this enemy (use provided animated data or fetch static)
    const spriteData = animatedData || getPixelSpriteForEnemy(enemy);
    if (!spriteData) {
        return false;
    }

    const sprite = spriteData.sprite;
    const flipX = shouldFlipSprite(enemy);

    // Calculate scale to fit sprite to ~1.3x tile size for visibility
    // Sprites are designed at 32x32 and should be slightly larger than tiles for visual impact
    // This matches the player sprite sizing: player uses pixelScale=2 internally then scales
    // to tileSize * 1.3 on render, so monsters should also render at tileSize * 1.3
    const targetSize = tileSize * 1.3;
    const spritePixelSize = Math.max(
        sprite.width || SpriteRenderer.SPRITE_WIDTH || 32,
        sprite.height || SpriteRenderer.SPRITE_HEIGHT || 32
    );

    // Calculate pixel scale - use floating point for proper sizing
    // Previously used Math.floor() which truncated 1.3 to 1, making monsters too small
    let finalScale = targetSize / spritePixelSize;

    // Animation scale modifiers (for squash/stretch effects)
    const animScaleX = spriteData.scaleX || 1.0;
    const animScaleY = spriteData.scaleY || 1.0;

    // Legacy support for scaleModifier
    if (spriteData.scaleModifier && spriteData.scaleModifier !== 1.0) {
        finalScale = finalScale * spriteData.scaleModifier;
    }

    // Calculate base rendered size (before animation scaling)
    const baseRenderedWidth = sprite.width * finalScale;
    const baseRenderedHeight = sprite.height * finalScale;

    // Center sprite on tile (using base size, animation scale applied via transform)
    let drawX = screenX + (tileSize - baseRenderedWidth) / 2;
    let drawY = screenY + (tileSize - baseRenderedHeight) / 2;

    // Apply vertical offset from animation (for floating/slam effects)
    // Scale offset by finalScale for consistent pixel sizing
    if (spriteData.verticalOffset) {
        drawY -= spriteData.verticalOffset * (finalScale / 2);
    }

    // Apply horizontal offset from animation (for lunge/bite effects)
    if (spriteData.horizontalOffset) {
        drawX += spriteData.horizontalOffset * (finalScale / 2);
    }

    // Build options
    const options = {
        flipX: flipX
    };

    // Apply palette override if exists
    if (spriteData.paletteOverride) {
        options.palette = { ...sprite.palette, ...spriteData.paletteOverride };
    }

    // Apply palette modifier for brightness adjustment (pulsing effect)
    // Note: This requires SpriteRenderer brightness support, which may not exist yet
    // For now, we skip this as the spec mentions it can be skipped
    // if (spriteData.paletteModifier && spriteData.paletteModifier !== 1.0) {
    //     options.brightness = spriteData.paletteModifier;
    // }

    // Check if we need to apply animation transforms (scaleX/scaleY != 1.0)
    const needsTransform = animScaleX !== 1.0 || animScaleY !== 1.0;

    if (needsTransform) {
        // Use canvas transforms for squash/stretch effects
        ctx.save();

        // Calculate center point for transform (bottom-center for slam effects)
        const centerX = drawX + baseRenderedWidth / 2;
        const centerY = drawY + baseRenderedHeight;  // Anchor at bottom for squash/stretch

        // Translate to anchor, scale, translate back
        ctx.translate(centerX, centerY);
        ctx.scale(animScaleX, animScaleY);
        ctx.translate(-centerX, -centerY);

        // Draw the sprite (with base scale, canvas handles the animation scale)
        SpriteRenderer.draw(ctx, sprite, drawX, drawY, finalScale, options);

        ctx.restore();
    } else {
        // No transform needed, draw normally
        SpriteRenderer.draw(ctx, sprite, drawX, drawY, finalScale, options);
    }

    return true;
}

/**
 * Check if an enemy has a pixel sprite available
 * @param {Object} enemy - Enemy object
 * @returns {boolean} True if sprite is available
 */
function hasPixelSprite(enemy) {
    if (!enemy || !enemy.name) return false;
    if (typeof MONSTER_SPRITES === 'undefined') return false;

    const spriteKey = MONSTER_SPRITE_MAP[enemy.name];
    return spriteKey && MONSTER_SPRITES[spriteKey] !== undefined;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
    window.MONSTER_SPRITE_MAP = MONSTER_SPRITE_MAP;
    window.ENEMY_PALETTE_OVERRIDES = ENEMY_PALETTE_OVERRIDES;
    window.getPixelSpriteForEnemy = getPixelSpriteForEnemy;
    window.shouldFlipSprite = shouldFlipSprite;
    window.drawPixelSprite = drawPixelSprite;
    window.hasPixelSprite = hasPixelSprite;
    // Animation support functions
    window.getAnimatedSpriteForEnemy = getAnimatedSpriteForEnemy;
    window.startMonsterDeathAnimation = startMonsterDeathAnimation;
}

// console.log('[SpriteIntegration] Loaded with', Object.keys(MONSTER_SPRITE_MAP).length, 'monster mappings');
