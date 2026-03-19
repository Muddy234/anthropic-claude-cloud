# Player Layered Pixel Animation Implementation Plan

## Overview

Replace the existing spritesheet-based player with a **fully pixel-array system** matching the enemy sprite style. The player and all equipment will use the same pixel-array format as monsters, with layered compositing for equipment visibility.

---

## Architecture Decision: Full Pixel-Array System

**Base Player**: New pixel-array sprite (replacing spritesheet)
**Equipment Layers**: Pixel-array format layered on top
**Animation**: Delta-based system (like enemy sprites in `sprite-renderer.js`)

**Rationale**:
- Visual consistency with enemy pixel sprites
- Unified rendering pipeline using `SpriteRenderer`
- Delta-based animation for walk/idle/attack states
- Palette swapping for customization (skin tone, hair color, etc.)
- Equipment layers use same format for seamless compositing

---

## Layer Rendering Order (Bottom to Top)

1. **Base player body** (pixel-array, new)
2. **LEGS** armor (pants/greaves)
3. **FEET** armor (boots)
4. **CHEST** armor (torso)
5. **HEAD** armor (helm)
6. **OFF-hand** (shield/secondary)
7. **MAIN-hand** weapon

---

## File Structure

### New Files to Create

```
js/
├── rendering/
│   ├── player-sprites.js                # Base player pixel-array definitions
│   ├── player-sprite-animations.js      # Walk/idle/attack animation deltas
│   ├── player-equipment-sprites.js      # Equipment pixel-array definitions
│   └── player-sprite-renderer.js        # Layered compositing and rendering
│
├── data/
│   └── equipment-visuals.js             # Maps equipment IDs → sprite keys
│
└── config/
    └── player-sprite-config.js          # Configuration constants
```

### Files to Modify

```
js/
├── ui/player-animation.js              # Replace spritesheet with pixel renderer
├── ui/renderer.js                      # Update player draw call
├── entities/player.js                  # Add visual customization state
└── index.html                          # Include new script files
```

### Files to Remove/Deprecate

```
assets/spritesheet/player_caveman/      # No longer needed (spritesheets)
```

---

## Data Structures

### 1. Base Player Sprite Definition

```javascript
// js/rendering/player-sprites.js

const PLAYER_SPRITES = {
    // Base humanoid body - 16x16 pixels
    'player_base': {
        name: 'player_base',
        width: 16,
        height: 16,
        directions: {
            down: {
                pixels: [
                    "................",
                    ".....HHHH.......",  // H = Hair
                    "....HHHHHH......",
                    "....SSSSSS......",  // S = Skin (face)
                    "....SEESSE......",  // E = Eyes
                    "....SSSSSS......",
                    ".....SSSS.......",  // Neck
                    "....BBBBBB......",  // B = Body/shirt
                    "...BBBBBBBB.....",
                    "...BBBBBBBB.....",
                    "....SSBBSS......",  // Arms (skin) + torso
                    "....SSBBSS......",
                    "....PPPPPP......",  // P = Pants
                    "....PP..PP......",
                    "....FF..FF......",  // F = Feet
                    "................"
                ]
            },
            up: {
                pixels: [
                    "................",
                    ".....HHHH.......",
                    "....HHHHHH......",
                    "....HHHHHH......",  // Back of head
                    "....HHHHHH......",
                    "....HHHHHH......",
                    ".....SSSS.......",
                    "....BBBBBB......",
                    "...BBBBBBBB.....",
                    "...BBBBBBBB.....",
                    "....SSBBSS......",
                    "....SSBBSS......",
                    "....PPPPPP......",
                    "....PP..PP......",
                    "....FF..FF......",
                    "................"
                ]
            },
            left: {
                pixels: [
                    "................",
                    "......HHH.......",
                    ".....HHHHH......",
                    ".....SSSSH......",
                    ".....ESSS.......",
                    ".....SSSS.......",
                    "......SS........",
                    ".....BBBBB......",
                    "....SSBBBB......",  // Arm in front
                    "....SSBBBB......",
                    ".....BBBB.......",
                    ".....PPPP.......",
                    ".....PPPP.......",
                    "......PP........",
                    "......FF........",
                    "................"
                ]
            },
            right: {
                pixels: [
                    "................",
                    ".......HHH......",
                    "......HHHHH.....",
                    "......HSSSS.....",
                    ".......SSSE.....",
                    "......SSSS......",
                    "........SS......",
                    "......BBBBB.....",
                    "......BBBBSS....",
                    "......BBBBSS....",
                    ".......BBBB.....",
                    ".......PPPP.....",
                    ".......PPPP.....",
                    "........PP......",
                    "........FF......",
                    "................"
                ]
            }
        },
        palette: {
            'H': '#8B4513',  // Hair (brown, customizable)
            'S': '#FFCCAA',  // Skin tone (customizable)
            'E': '#4444AA',  // Eyes
            'B': '#666688',  // Body/default shirt
            'P': '#554433',  // Pants
            'F': '#443322'   // Feet/boots
        }
    }
};

// Player customization options
const PLAYER_PALETTE_OPTIONS = {
    hair: {
        brown:  '#8B4513',
        black:  '#222222',
        blonde: '#DAA520',
        red:    '#8B0000',
        white:  '#CCCCCC'
    },
    skin: {
        light:  '#FFCCAA',
        medium: '#DEB887',
        tan:    '#CD853F',
        dark:   '#8B4513'
    }
};
```

### 2. Player Animation Deltas (Walk Cycle)

```javascript
// js/rendering/player-sprite-animations.js

const PLAYER_ANIMATIONS = {
    // Walk animation - 4 frames per direction
    walk: {
        framesPerSecond: 8,
        loop: true,
        phases: {
            // Frame 0: Neutral stance
            0: {
                duration: 125,
                deltas: {},  // No changes from base
                verticalOffset: 0
            },
            // Frame 1: Left foot forward
            1: {
                duration: 125,
                deltas: {
                    // Modify leg pixels for walking pose
                    12: { 4: 'P', 5: '.', 6: '.', 7: 'P', 8: 'P', 9: 'P' },
                    13: { 4: 'P', 5: '.', 6: '.', 7: '.', 8: 'P', 9: 'P' },
                    14: { 4: 'F', 5: '.', 6: '.', 7: '.', 8: 'F', 9: 'F' }
                },
                verticalOffset: -1  // Slight bob
            },
            // Frame 2: Neutral (passing)
            2: {
                duration: 125,
                deltas: {},
                verticalOffset: 0
            },
            // Frame 3: Right foot forward
            3: {
                duration: 125,
                deltas: {
                    12: { 4: 'P', 5: 'P', 6: 'P', 7: '.', 8: '.', 9: 'P' },
                    13: { 4: 'P', 5: 'P', 6: '.', 7: '.', 8: '.', 9: 'P' },
                    14: { 4: 'F', 5: 'F', 6: '.', 7: '.', 8: '.', 9: 'F' }
                },
                verticalOffset: -1
            }
        }
    },

    // Idle animation - subtle breathing
    idle: {
        framesPerSecond: 2,
        loop: true,
        phases: {
            0: { duration: 500, deltas: {}, scaleY: 1.0 },
            1: { duration: 500, deltas: {}, scaleY: 0.98 }  // Slight compress
        }
    },

    // Attack animation
    attack: {
        framesPerSecond: 12,
        loop: false,
        phases: {
            windup: [
                { duration: 80, horizontalOffset: -1, scaleX: 0.95 }
            ],
            strike: [
                { duration: 60, horizontalOffset: 2, scaleX: 1.1 },
                { duration: 40, horizontalOffset: 1, scaleX: 1.05 }
            ],
            recovery: [
                { duration: 80, horizontalOffset: 0, scaleX: 1.0 }
            ]
        }
    }
};
```

### 3. Equipment Sprite Definitions

```javascript
// js/rendering/player-equipment-sprites.js

const EQUIPMENT_SPRITES = {
    // === WEAPONS ===

    'sword_basic': {
        name: 'sword_basic',
        width: 16,
        height: 16,
        slot: 'MAIN',
        directions: {
            down: {
                pixels: [
                    "................",
                    "................",
                    "..........WG....",  // W = blade, G = guard
                    ".........WW.....",
                    "........WW......",
                    ".......WW.......",
                    "......WW........",
                    ".....WG.........",
                    "....GHH.........",  // H = handle
                    "...HH...........",
                    "................",
                    "................",
                    "................",
                    "................",
                    "................",
                    "................"
                ],
                offsetX: 2,
                offsetY: 0
            },
            up: { /* weapon behind body */ },
            left: { /* weapon on left side */ },
            right: { /* weapon on right side */ }
        },
        palette: {
            'W': '#AAAAAA',  // Blade
            'G': '#888866',  // Guard
            'H': '#8B4513'   // Handle
        }
    },

    'shield_wood': {
        name: 'shield_wood',
        width: 16,
        height: 16,
        slot: 'OFF',
        directions: {
            down: {
                pixels: [
                    "................",
                    "................",
                    "................",
                    "................",
                    "................",
                    "................",
                    "..SSSS..........",
                    ".SSSSSS.........",
                    ".SSMMSS.........",  // M = metal rim
                    ".SSSSSS.........",
                    "..SSSS..........",
                    "................",
                    "................",
                    "................",
                    "................",
                    "................"
                ],
                offsetX: -3,
                offsetY: 0
            }
        },
        palette: {
            'S': '#8B4513',  // Wood
            'M': '#666666'   // Metal
        }
    },

    // === ARMOR ===

    'helm_iron': {
        name: 'helm_iron',
        width: 16,
        height: 16,
        slot: 'HEAD',
        directions: {
            down: {
                pixels: [
                    "................",
                    ".....MMMM.......",
                    "....MMMMMM......",
                    "....MMMMMM......",
                    "....MVVVVM......",  // V = visor slit
                    "....MMMMMM......",
                    "................",
                    "................",
                    "................",
                    "................",
                    "................",
                    "................",
                    "................",
                    "................",
                    "................",
                    "................"
                ],
                offsetY: 0
            }
        },
        palette: {
            'M': '#666666',
            'V': '#222222'
        }
    },

    'chest_leather': {
        name: 'chest_leather',
        width: 16,
        height: 16,
        slot: 'CHEST',
        directions: {
            down: {
                pixels: [
                    "................",
                    "................",
                    "................",
                    "................",
                    "................",
                    "................",
                    "................",
                    "....AAAAAA......",
                    "...AAAAAAAA.....",
                    "...AAAAAAAA.....",
                    "....AAAAAA......",
                    "....AAAAAA......",
                    "................",
                    "................",
                    "................",
                    "................"
                ]
            }
        },
        palette: {
            'A': '#8B4513'
        }
    },

    'chest_chain': {
        name: 'chest_chain',
        width: 16,
        height: 16,
        slot: 'CHEST',
        directions: {
            down: {
                pixels: [
                    "................",
                    "................",
                    "................",
                    "................",
                    "................",
                    "................",
                    "................",
                    "....CCCCCC......",
                    "...CLCLCLCL.....",  // Chainmail pattern
                    "...LCLCLCLC.....",
                    "....CLCLCL......",
                    "....LCLCLC......",
                    "................",
                    "................",
                    "................",
                    "................"
                ]
            }
        },
        palette: {
            'C': '#888888',
            'L': '#666666'
        }
    }

    // ... more equipment sprites
};
```

### 4. Equipment Visual Mapping

```javascript
// js/data/equipment-visuals.js

const EQUIPMENT_VISUAL_MAP = {
    // Maps equipment ID (from equipment-loader.js) → sprite key + overrides

    // === SWORDS ===
    'rusty_sword':        { sprite: 'sword_basic', palette: { 'W': '#8B7355' } },
    'iron_longsword':     { sprite: 'sword_basic', palette: { 'W': '#AAAAAA' } },
    'steel_longsword':    { sprite: 'sword_basic', palette: { 'W': '#C0C0C0' } },
    'ember_edge':         { sprite: 'sword_fire',  palette: { 'W': '#FF6B35' }, glow: '#FF4400' },
    'frostbite_blade':    { sprite: 'sword_ice',   palette: { 'W': '#88CCFF' }, glow: '#44AAFF' },

    // === MACES ===
    'wooden_club':        { sprite: 'mace_basic',  palette: { 'W': '#8B4513' } },
    'iron_mace':          { sprite: 'mace_basic',  palette: { 'W': '#666666' } },

    // === HELMS ===
    'leather_cap':        { sprite: 'helm_leather', palette: { 'M': '#8B4513' } },
    'iron_helm':          { sprite: 'helm_iron',    palette: { 'M': '#666666' } },
    'steel_helm':         { sprite: 'helm_iron',    palette: { 'M': '#AAAAAA' } },

    // === CHEST ===
    'leather_vest':       { sprite: 'chest_leather', palette: { 'A': '#8B4513' } },
    'chainmail':          { sprite: 'chest_chain',   palette: { 'C': '#888888' } },

    // === SHIELDS ===
    'wooden_shield':      { sprite: 'shield_wood',   palette: { 'S': '#8B4513' } },
    'iron_shield':        { sprite: 'shield_iron',   palette: { 'S': '#666666' } }
};

// Rarity accent colors (applied to 'G' palette key if present)
const RARITY_PALETTE_MODIFIERS = {
    common:    { accentColor: null },
    uncommon:  { accentColor: '#2ECC71', glowIntensity: 0 },
    rare:      { accentColor: '#3498DB', glowIntensity: 2 },
    epic:      { accentColor: '#E67E22', glowIntensity: 4 },
    legendary: { accentColor: '#E91E63', glowIntensity: 6 }
};
```

### 5. Configuration

```javascript
// js/config/player-sprite-config.js

const PLAYER_SPRITE_CONFIG = {
    // Sprite dimensions
    width: 16,
    height: 16,
    pixelScale: 2,  // Each pixel = 2x2 screen pixels

    // Animation settings
    walkFramesPerSecond: 8,
    idleFramesPerSecond: 2,

    // Layer rendering order
    layerOrder: ['BODY', 'LEGS', 'FEET', 'CHEST', 'HEAD', 'OFF', 'MAIN'],

    // Equipment offsets per direction (fine-tuning)
    directionOffsets: {
        down:  { weapon: { x: 2, y: 0 }, shield: { x: -3, y: 0 } },
        up:    { weapon: { x: -2, y: 0 }, shield: { x: 3, y: 0 } },
        left:  { weapon: { x: 0, y: 0 }, shield: { x: -2, y: 0 } },
        right: { weapon: { x: 0, y: 0 }, shield: { x: 2, y: 0 } }
    },

    // Cache settings
    enableCompositeCache: true,
    maxCacheSize: 200
};
```

---

## Core Renderer Module

### PlayerSpriteRenderer (js/rendering/player-sprite-renderer.js)

```javascript
const PlayerSpriteRenderer = {
    compositeCache: new Map(),
    animationState: {
        type: 'idle',      // 'idle', 'walk', 'attack'
        phase: 0,
        frameIndex: 0,
        elapsed: 0
    },

    /**
     * Main render function - draws player with all equipment layers
     */
    draw(ctx, player, screenX, screenY, tileSize) {
        const direction = player.facing || 'down';
        const frameData = this._getCurrentFrameData(player);

        // Get or build composite sprite
        const composite = this._getCompositeSprite(player, direction, frameData);

        // Calculate draw position with animation offsets
        const scale = PLAYER_SPRITE_CONFIG.pixelScale;
        const spriteSize = PLAYER_SPRITE_CONFIG.width * scale;
        const drawScale = tileSize / spriteSize * 1.3;  // Slightly larger than tile
        const drawSize = spriteSize * drawScale;

        let drawX = screenX + (tileSize - drawSize) / 2;
        let drawY = screenY + (tileSize - drawSize) / 2;

        // Apply animation offsets
        if (frameData.verticalOffset) {
            drawY -= frameData.verticalOffset * drawScale;
        }
        if (frameData.horizontalOffset) {
            drawX += frameData.horizontalOffset * drawScale;
        }

        // Apply scale transforms
        ctx.save();
        ctx.imageSmoothingEnabled = false;

        if (frameData.scaleX !== 1.0 || frameData.scaleY !== 1.0) {
            const centerX = drawX + drawSize / 2;
            const centerY = drawY + drawSize;  // Anchor at feet
            ctx.translate(centerX, centerY);
            ctx.scale(frameData.scaleX || 1.0, frameData.scaleY || 1.0);
            ctx.translate(-centerX, -centerY);
        }

        ctx.drawImage(composite, drawX, drawY, drawSize, drawSize);
        ctx.restore();
    },

    /**
     * Build composite sprite with all layers
     */
    _getCompositeSprite(player, direction, frameData) {
        const cacheKey = this._getCacheKey(player, direction, frameData.frameIndex);

        if (this.compositeCache.has(cacheKey)) {
            return this.compositeCache.get(cacheKey);
        }

        const composite = this._buildComposite(player, direction, frameData);
        this._addToCache(cacheKey, composite);
        return composite;
    },

    /**
     * Render all layers to composite canvas
     */
    _buildComposite(player, direction, frameData) {
        const scale = PLAYER_SPRITE_CONFIG.pixelScale;
        const size = PLAYER_SPRITE_CONFIG.width * scale;

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;

        // Layer 1: Base body
        const bodySprite = this._getAnimatedBodySprite(player, direction, frameData);
        this._renderPixelSprite(ctx, bodySprite, player.palette || {}, 0, 0, scale);

        // Layers 2-7: Equipment
        for (const slot of PLAYER_SPRITE_CONFIG.layerOrder) {
            if (slot === 'BODY') continue;  // Already rendered

            const equipped = player.equipped?.[slot];
            if (!equipped) continue;

            const visual = EQUIPMENT_VISUAL_MAP[equipped.id];
            if (!visual) continue;

            const spriteData = EQUIPMENT_SPRITES[visual.sprite];
            if (!spriteData?.directions?.[direction]) continue;

            const dirData = spriteData.directions[direction];
            const palette = this._buildPalette(spriteData.palette, visual.palette, equipped.rarity);
            const offset = PLAYER_SPRITE_CONFIG.directionOffsets[direction]?.[slot === 'MAIN' ? 'weapon' : 'shield'] || { x: 0, y: 0 };

            // Apply glow effect for magic items
            if (visual.glow) {
                ctx.shadowColor = visual.glow;
                ctx.shadowBlur = 4;
            }

            this._renderPixelSprite(
                ctx,
                dirData,
                palette,
                (dirData.offsetX || 0) + offset.x,
                (dirData.offsetY || 0) + offset.y,
                scale
            );

            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
        }

        return canvas;
    },

    /**
     * Get body sprite with animation deltas applied
     */
    _getAnimatedBodySprite(player, direction, frameData) {
        const baseSprite = PLAYER_SPRITES.player_base.directions[direction];

        if (!frameData.deltas || Object.keys(frameData.deltas).length === 0) {
            return baseSprite;
        }

        // Apply deltas to create animated frame
        const animatedPixels = baseSprite.pixels.map((row, rowIndex) => {
            if (!frameData.deltas[rowIndex]) return row;

            let newRow = row.split('');
            for (const [col, char] of Object.entries(frameData.deltas[rowIndex])) {
                newRow[parseInt(col)] = char;
            }
            return newRow.join('');
        });

        return { ...baseSprite, pixels: animatedPixels };
    },

    /**
     * Render pixel sprite to canvas
     */
    _renderPixelSprite(ctx, spriteData, palette, offsetX, offsetY, scale) {
        const pixels = spriteData.pixels;

        for (let py = 0; py < pixels.length; py++) {
            const row = pixels[py];
            for (let px = 0; px < row.length; px++) {
                const char = row[px];
                if (char === '.' || char === ' ') continue;

                const color = palette[char];
                if (!color) continue;

                ctx.fillStyle = color;
                ctx.fillRect(
                    (px + offsetX) * scale,
                    (py + offsetY) * scale,
                    scale,
                    scale
                );
            }
        }
    },

    /**
     * Update animation state
     */
    update(deltaTime, player) {
        const isMoving = player.isMoving;
        const isAttacking = player.isAttacking;

        // Determine animation type
        let targetType = 'idle';
        if (isAttacking) targetType = 'attack';
        else if (isMoving) targetType = 'walk';

        // Reset if type changed
        if (this.animationState.type !== targetType) {
            this.animationState = {
                type: targetType,
                phase: 0,
                frameIndex: 0,
                elapsed: 0
            };
        }

        // Update frame
        const anim = PLAYER_ANIMATIONS[targetType];
        if (!anim) return;

        this.animationState.elapsed += deltaTime;
        const frameDuration = 1000 / anim.framesPerSecond;

        if (this.animationState.elapsed >= frameDuration) {
            this.animationState.elapsed -= frameDuration;
            this.animationState.frameIndex++;

            const frameCount = Object.keys(anim.phases).length;
            if (this.animationState.frameIndex >= frameCount) {
                if (anim.loop) {
                    this.animationState.frameIndex = 0;
                } else {
                    this.animationState.frameIndex = frameCount - 1;
                }
            }
        }
    },

    /**
     * Get current frame data for animation
     */
    _getCurrentFrameData(player) {
        const anim = PLAYER_ANIMATIONS[this.animationState.type];
        if (!anim) {
            return { frameIndex: 0, deltas: {}, verticalOffset: 0, scaleX: 1.0, scaleY: 1.0 };
        }

        const frame = anim.phases[this.animationState.frameIndex] || anim.phases[0];
        return {
            frameIndex: this.animationState.frameIndex,
            deltas: frame.deltas || {},
            verticalOffset: frame.verticalOffset || 0,
            horizontalOffset: frame.horizontalOffset || 0,
            scaleX: frame.scaleX || 1.0,
            scaleY: frame.scaleY || 1.0
        };
    },

    /**
     * Build final palette with overrides
     */
    _buildPalette(basePalette, overridePalette, rarity) {
        const palette = { ...basePalette };

        if (overridePalette) {
            Object.assign(palette, overridePalette);
        }

        const rarityMod = RARITY_PALETTE_MODIFIERS[rarity];
        if (rarityMod?.accentColor && palette['G']) {
            palette['G'] = rarityMod.accentColor;
        }

        return palette;
    },

    /**
     * Generate cache key
     */
    _getCacheKey(player, direction, frameIndex) {
        const equipped = PLAYER_SPRITE_CONFIG.layerOrder
            .filter(s => s !== 'BODY')
            .map(slot => player.equipped?.[slot]?.id || 'none')
            .join('|');
        const customization = `${player.palette?.H || 'default'}_${player.palette?.S || 'default'}`;
        return `${customization}_${equipped}_${direction}_${frameIndex}`;
    },

    /**
     * Clear cache (call on equipment change)
     */
    clearCache() {
        this.compositeCache.clear();
    },

    _addToCache(key, value) {
        if (this.compositeCache.size >= PLAYER_SPRITE_CONFIG.maxCacheSize) {
            const firstKey = this.compositeCache.keys().next().value;
            this.compositeCache.delete(firstKey);
        }
        this.compositeCache.set(key, value);
    }
};
```

---

## Integration Changes

### Replace drawPlayerSprite() in js/ui/player-animation.js

```javascript
/**
 * Draw the player sprite using pixel-array system
 * REPLACES old spritesheet-based rendering
 */
function drawPlayerSprite(ctx, screenX, screenY, tileSize) {
    if (!game.player) return;

    const player = game.player;

    // Handle dash ghost trails (keep existing logic)
    if (typeof dashState !== 'undefined' && dashState.active && dashState.ghostTrails) {
        for (const ghost of dashState.ghostTrails) {
            ctx.globalAlpha = ghost.alpha * 0.3;
            PlayerSpriteRenderer.draw(ctx, player, ghost.x, ghost.y, tileSize);
        }
        ctx.globalAlpha = 1.0;
    }

    // Dash transparency
    if (typeof dashState !== 'undefined' && (dashState.active || dashState.iFramesRemaining > 0)) {
        ctx.globalAlpha = 0.5;
    }

    // Draw player using new pixel renderer
    PlayerSpriteRenderer.draw(ctx, player, screenX, screenY, tileSize);

    ctx.globalAlpha = 1.0;
}

/**
 * Update player animation state
 */
function updatePlayerAnimation(deltaTime) {
    if (!game.player) return;
    PlayerSpriteRenderer.update(deltaTime, game.player);
}
```

---

## Implementation Steps

### Phase 1: Foundation
1. Create `js/config/player-sprite-config.js`
2. Create `js/rendering/player-sprites.js` with base body sprite (4 directions)
3. Create `js/rendering/player-sprite-animations.js` with walk/idle animations
4. Create `js/rendering/player-sprite-renderer.js` with core rendering
5. Add script includes to `index.html`

### Phase 2: Base Player Working
6. Replace `drawPlayerSprite()` in `player-animation.js`
7. Test base player rendering in all 4 directions
8. Test walk animation
9. Test idle animation
10. Verify camera/position integration

### Phase 3: Equipment System
11. Create `js/rendering/player-equipment-sprites.js`
12. Create `js/data/equipment-visuals.js`
13. Add sword sprite (4 directions)
14. Add helm sprite (4 directions)
15. Test layered rendering with equipment

### Phase 4: Expand Equipment Library
16. Add all weapon type sprites (sword, mace, staff, bow, dagger)
17. Add shield sprites
18. Add chest armor sprites
19. Add helm variants
20. Map all equipment IDs to sprites

### Phase 5: Polish
21. Implement rarity glow effects
22. Add attack animation integration
23. Performance optimization
24. Cache invalidation on equip/unequip
25. Visual testing demo page

---

## Verification & Testing

### Create `player-sprite-demo.html`
- Render base player in all 4 directions
- Cycle through walk animation
- Test equipment combinations
- Test rarity color modifiers
- Performance metrics display

### In-Game Testing
1. Player renders correctly in all directions
2. Walk animation plays smoothly
3. Equipment appears when equipped
4. Equipment layers render in correct order
5. Dash effect works with new system
6. Performance maintains 60fps

### Performance Targets
- < 3ms render time per frame
- > 90% cache hit rate
- < 15MB sprite cache memory

---

## Critical Files Reference

| File | Purpose |
|------|---------|
| `js/ui/player-animation.js` | Replace `drawPlayerSprite()` |
| `js/ui/renderer.js` | Ensure correct draw order |
| `js/rendering/sprite-renderer.js` | Reference pattern for pixel rendering |
| `js/rendering/sprite-animations.js` | Reference for delta animations |
| `js/entities/player.js` | Player state (`equipped`, `facing`, etc.) |

---

## Graceful Fallback

```javascript
function drawPlayerSprite(ctx, screenX, screenY, tileSize) {
    try {
        if (typeof PlayerSpriteRenderer !== 'undefined') {
            PlayerSpriteRenderer.draw(ctx, game.player, screenX, screenY, tileSize);
        } else {
            // Fallback: simple colored rectangle
            ctx.fillStyle = '#4488FF';
            ctx.fillRect(screenX + 4, screenY + 4, tileSize - 8, tileSize - 8);
        }
    } catch (error) {
        console.warn('[PlayerSprite] Render failed:', error);
        ctx.fillStyle = '#4488FF';
        ctx.fillRect(screenX + 4, screenY + 4, tileSize - 8, tileSize - 8);
    }
}
```
